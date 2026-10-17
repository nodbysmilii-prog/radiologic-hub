"""Radioanatomie IRM cérébrale, étape 3 : segmentations automatiques (studyforrest, sujet 01).

Entrées : volumes de l'étape 2 (grille de référence de 0,7 mm alignée CA-CP, assets-sources/…/etape2/).
Chaque étiquette vient d'un outil ou d'un atlas publié ; rien n'est tracé à la main ici.

Partie A (outils déjà disponibles : ANTs, numpy, scipy) :
  1. cerveau Colin 27 recalé sur le T1 du sujet (affine sur la tête, puis SyN sur les cerveaux seuls, ANTs) : masque
     du cerveau, carte des territoires
     artériels déjà validée sur le site (atlas de Liu et al. 2023, CC BY-SA 4.0, redécoupé selon la vidéo de
     référence) et zones jonctionnelles, transportées sur le sujet (interpolation « genericLabel ») ;
  2. tissus du sujet (LCS, substance grise, substance blanche) : classification Atropos (ANTs, k-moyennes à 3 classes
     sur T1 et T2 corrigés une seconde fois dans le cerveau, régularisation de Markov) dans le cerveau de Colin 27
     dilaté de 2 mm ; cerveau du sujet = plus grande composante de parenchyme, fermée de 3 mm ;
  3. territoires du sujet : chaque voxel de parenchyme (substance grise ou blanche) prend le territoire transporté
     le plus proche ; LCS ventriculaire non coloré (LCS du sujet dans les ventricules de Colin 27 dilatés de 2 mm) ;
  4. artères (ARM TOF 7 T) : masque des vaisseaux dans l'espace natif du TOF (0,3 mm) : candidats au signal
     supérieur à 1,7 fois la médiane locale (6 mm), dans le crâne (cerveau fermé dilaté de 3 mm) ; vaisselité de
     Frangi (structures tubulaires claires, échelles 0,35 à 1,2 mm) avec seuil à hystérésis ; composantes d'au moins
     4 mm³ ; masque NON NOMMÉ (veines claires comprises, comme le sinus sagittal supérieur) : les noms viendront
     des points manuels de l'auteur (étape 4).
Partie B (FastSurfer : segmentation seule, sans surfaces ; code Apache 2.0) : noyaux gris, ventricules, cervelet,
tronc cérébral, hippocampe, amygdale, 31 régions corticales DKT par hémisphère (CerebNet : lobules du cervelet ;
HypVINN : hypothalamus, corps mamillaires, fornix, commissure antérieure, chiasma, nerfs et tractus optiques,
hypophyse, tige pituitaire, épiphyse) ; lancée seulement si les modèles sont téléchargeables (zenodo.org).

Sortie : assets-sources/radioanatomie/irm-cerebrale/etape3/ (étiquettes NIfTI sur la grille de référence, images).
Usage : python3 -I -B scripts/radioanatomie/irm/etape3_segmentation.py   (depuis la racine du dépôt)
"""
import json, os, shutil, sys

os.environ.setdefault('ANTS_RANDOM_SEED', '1')
import ants
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.colors import ListedColormap
import nibabel as nib
import numpy as np
from scipy import ndimage as ndi

ICI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, ICI)
sys.path.insert(0, os.path.dirname(ICI))
import etape2_preparation as etape2
import preparer_territoires as territoires

RACINE = etape2.RACINE
ETAPE2 = etape2.SORTIE
SORTIE = os.path.join(etape2.etape1.BASE, 'etape3')
CACHE = os.path.join(SORTIE, 'cache')
PAS = etape2.PAS


def lire_grille(nom):
    img = nib.load(os.path.join(ETAPE2, nom + '.nii.gz'))
    return np.asanyarray(img.dataobj).astype(np.float32), img.affine


def enregistrer(nom, v, affine, type_=np.uint8):
    nib.save(nib.Nifti1Image(np.asarray(v).astype(type_), affine), os.path.join(SORTIE, nom + '.nii.gz'))


def boule(r_mm):
    r = int(np.ceil(r_mm / PAS))
    z, y, x = np.ogrid[-r:r + 1, -r:r + 1, -r:r + 1]
    return (x * x + y * y + z * z) * PAS * PAS <= r_mm * r_mm


# ---------------------------------------------------------------------------
# A1. Colin 27 → sujet
# ---------------------------------------------------------------------------
def colin_vers_sujet(t1_sujet):
    """Recalage affine + SyN de Colin 27 sur le T1 du sujet (copie à 1 mm) ; transport des cartes de Colin 27."""
    territoires.telecharger()
    t1u8, carte, masque, _ = territoires.preparer()
    jonctions = territoires.zones_jonctionnelles(carte, t1u8 / 255.0)
    aff_colin = nib.load(os.path.join(territoires.SOURCES, 'tpl-MNIColin27_T1w.nii.gz')).affine
    colin = etape2.vers_ants(t1u8.astype(np.float32), aff_colin)
    fixe = ants.resample_image(t1_sujet, (1.0, 1.0, 1.0), use_voxels=False, interp_type=0)
    affine = os.path.join(CACHE, 'colin-vers-sujet-affine.mat')
    chemins = [os.path.join(CACHE, 'colin-vers-sujet-cerveau-1Warp.nii.gz'), affine]
    if not os.path.exists(affine):
        # affine sur la tête entière ; départ sans pré-alignement (les deux images sont déjà dans l'espace MNI ;
        # le centrage par centre de masse, par défaut, serait faussé par le cou présent sur l'IRM du sujet)
        r = ants.registration(fixed=fixe, moving=colin, type_of_transform='Affine', aff_metric='mattes',
                              initial_transform='Identity')
        shutil.copy(r['fwdtransforms'][0], affine)
    if not os.path.exists(chemins[0]):
        # SyN sur les cerveaux seuls (crâne et scalp, très différents d'une tête à l'autre, l'égareraient) :
        # cerveau de Colin 27 et cerveau probable du sujet (masque de Colin 27 après l'affine), dilatés de 4 mm
        d4 = ndi.binary_dilation(masque, iterations=4)
        cerveau_colin = etape2.vers_ants((t1u8 * d4).astype(np.float32), aff_colin)
        m_sujet = ants.apply_transforms(fixe, etape2.vers_ants(d4.astype(np.float32), aff_colin), [affine],
                                        interpolator='linear').numpy() > 0.5
        cerveau_sujet = fixe.new_image_like(fixe.numpy() * m_sujet)
        r = ants.registration(fixed=cerveau_sujet, moving=cerveau_colin, type_of_transform='SyNOnly',
                              initial_transform=affine, syn_metric='CC', syn_sampling=4,
                              reg_iterations=(100, 70, 40, 0), outprefix=os.path.join(CACHE, 'colin-vers-sujet-cerveau-'))
        if r['fwdtransforms'][0] != chemins[0]:
            shutil.copy(r['fwdtransforms'][0], chemins[0])
    transport = lambda v, interp: ants.apply_transforms(t1_sujet, etape2.vers_ants(v.astype(np.float32), aff_colin),
                                                        chemins, interpolator=interp).numpy()
    return {'carte': np.rint(transport(carte, 'genericLabel')).astype(np.int16),
            'jonctions': np.rint(transport(jonctions, 'genericLabel')).astype(np.uint8),
            'cerveau': transport(masque, 'linear') > 0.5,
            'colin': transport(t1u8, 'linear')}


# ---------------------------------------------------------------------------
# A2. Tissus (Atropos)
# ---------------------------------------------------------------------------
def tissus(t1, t2, cerveau, affine):
    """Atropos à 3 classes (T1 + T2) dans le cerveau de Colin 27 dilaté de 2 mm, après une seconde correction
    d'inhomogénéité limitée à ce masque. Classes rangées par T1 croissant : 1 LCS, 2 substance grise,
    3 substance blanche (0 hors masque)."""
    chemin = os.path.join(CACHE, 'tissus-3.nii.gz')
    masque = ndi.binary_dilation(cerveau, boule(2.0))
    if not os.path.exists(chemin):
        m = etape2.vers_ants(masque.astype(np.float32), affine)
        a = [ants.n4_bias_field_correction(etape2.vers_ants(x, affine), mask=m, shrink_factor=2, spline_param=60)
             for x in (t1, t2)]
        seg = ants.atropos(a=a, x=m, i='kmeans[3]', m='[0.1,1x1x1]', c='[5,0]')['segmentation']
        ants.image_write(seg, chemin)
    seg = ants.image_read(chemin).numpy().astype(np.uint8)
    ordre = sorted((1, 2, 3), key=lambda k: t1[seg == k].mean())
    sortie = np.zeros_like(seg)
    for nouveau, ancien in enumerate(ordre, start=1):
        sortie[seg == ancien] = nouveau
    return sortie, masque


# ---------------------------------------------------------------------------
# A3. Territoires du sujet
# ---------------------------------------------------------------------------
def territoires_sujet(carte, jonctions, tis, cerveau):
    parenchyme = cerveau & ((tis == 2) | (tis == 3))
    lab, n = ndi.label(parenchyme)
    if n:
        parenchyme = lab == (np.argmax(np.bincount(lab.ravel())[1:]) + 1)
    ventricules = ndi.binary_dilation(carte == territoires.VENTRICULE, boule(2.0)) & (tis == 1) & cerveau
    source = (carte > 0) & (carte != territoires.VENTRICULE)
    _, idx = ndi.distance_transform_edt(~source, return_indices=True)
    plus_proche = carte[tuple(idx)]
    sortie = np.where(parenchyme, plus_proche, 0).astype(np.uint8)
    sortie[ventricules] = territoires.VENTRICULE
    j = np.where(parenchyme, jonctions, 0).astype(np.uint8)
    return sortie, j


# ---------------------------------------------------------------------------
# A4. Artères (TOF)
# ---------------------------------------------------------------------------
def vaisselite(v, voxel, candidats, echelles_mm=(0.35, 0.7, 1.2)):
    """Vaisselité de Frangi (structures claires et tubulaires), maximum sur plusieurs échelles, calculée seulement
    aux voxels candidats ; hessienne normalisée par σ²."""
    sortie = np.zeros(int(candidats.sum()), np.float32)
    for e in echelles_mm:
        s = e / voxel
        h = {}
        for (i, j) in ((0, 0), (1, 1), (2, 2), (0, 1), (0, 2), (1, 2)):
            ordre = [0, 0, 0]
            ordre[i] += 1
            ordre[j] += 1
            h[i, j] = ndi.gaussian_filter(v, s, order=ordre)[candidats] * (e * e)
        H = np.empty((len(sortie), 3, 3), np.float32)
        for (i, j), x in h.items():
            H[:, i, j] = H[:, j, i] = x
        del h
        lam = np.linalg.eigvalsh(H)
        lam = np.take_along_axis(lam, np.argsort(np.abs(lam), axis=1), axis=1)   # |λ1| ≤ |λ2| ≤ |λ3|
        l1, l2, l3 = lam.T
        ra = np.abs(l2) / np.maximum(np.abs(l3), 1e-9)
        rb = np.abs(l1) / np.sqrt(np.maximum(np.abs(l2 * l3), 1e-18))
        sn = np.sqrt((lam ** 2).sum(axis=1))
        c = 0.5 * sn.max()
        vs = (1 - np.exp(-ra ** 2 / 0.5)) * np.exp(-rb ** 2 / 0.5) * (1 - np.exp(-sn ** 2 / (2 * c * c)))
        vs[(l2 > 0) | (l3 > 0)] = 0
        sortie = np.maximum(sortie, vs.astype(np.float32))
    return sortie


def arteres_tof(cerveau_grille, affine_grille, grille, rapport=1.7, fort_min=0.12, faible_min=0.03):
    """Vaisseaux du TOF dans son espace natif (0,3 mm) : candidats = signal > 1,7 fois la médiane locale (6 mm),
    dans le crâne (cerveau fermé, dilaté de 3 mm) ; vaisseau = vaisselité de Frangi > 0,12, puis croissance vers les
    candidats voisins de vaisselité > 0,03 (hystérésis), composantes connexes ≥ 4 mm³."""
    tof = ants.image_read(os.path.join(ETAPE2, 'cache', 'tof-n4.nii.gz'))
    t1_mni = os.path.join(ETAPE2, 'cache', 't1-vers-mni.mat')
    t1_tof = os.path.join(ETAPE2, 'cache', 'tof-vers-t1.mat')
    intracranien = ndi.binary_dilation(cerveau_grille, boule(3.0)).astype(np.float32)
    ic = ants.apply_transforms(tof, etape2.vers_ants(intracranien, affine_grille), [t1_tof, t1_mni],
                               whichtoinvert=[False, True], interpolator='linear').numpy() > 0.5
    v = tof.numpy()
    voxel = np.array(tof.spacing)
    reduit = v[::3, ::3, ::3]
    med = ndi.median_filter(reduit, size=tuple(np.maximum(np.round(6.0 / voxel / 3).astype(int) | 1, 3)))
    med = ndi.zoom(med, np.array(v.shape) / np.array(reduit.shape), order=1)[:v.shape[0], :v.shape[1], :v.shape[2]]
    candidats = (v > rapport * np.maximum(med, 1)) & ic
    del med
    vs = vaisselite(v, voxel, candidats)
    fort = np.zeros(v.shape, bool)
    faible = np.zeros(v.shape, bool)
    fort[candidats] = vs > fort_min
    faible[candidats] = vs > faible_min
    lab, n = ndi.label(faible, structure=np.ones((3, 3, 3)))
    garde = np.zeros(n + 1, bool)
    garde[np.unique(lab[fort])] = True
    garde[0] = False
    vaisseaux = garde[lab]
    lab, n = ndi.label(vaisseaux, structure=np.ones((3, 3, 3)))
    tailles = np.bincount(lab.ravel())
    tailles[0] = 0
    vaisseaux = tailles[lab] * np.prod(voxel) >= 4.0
    natif = tof.new_image_like(vaisseaux.astype(np.float32))
    ants.image_write(natif, os.path.join(SORTIE, 'arteres-tof-natif-0,3mm.nii.gz'))
    sur_grille = ants.apply_transforms(grille, natif, [t1_mni, t1_tof], whichtoinvert=[False, True],
                                       interpolator='linear').numpy() > 0.35
    return v, vaisseaux, sur_grille


# ---------------------------------------------------------------------------
# Contrôles visuels
# ---------------------------------------------------------------------------
def couleurs_territoires():
    c = np.zeros((256, 4))
    for ident, *_, couleur, _ in territoires.TERRITOIRES:
        for i in (ident, ident + 1):
            h = couleur.lstrip('#')
            c[i] = [int(h[k:k + 2], 16) / 255 for k in (0, 2, 4)] + [1]
    return ListedColormap(c)


def planche_territoires(t1, carte, jonctions, affine, fichier):
    niveaux = (-30, -12, 4, 18, 32, 50)
    fig, axes = plt.subplots(2, 3, figsize=(13, 9.5))
    cmap = couleurs_territoires()
    for ax, z in zip(axes.flat, niveaux):
        k = int(round((z - affine[2, 3]) / PAS))
        ax.imshow(etape2.coupe(t1, 'axial', k), cmap='gray', vmin=0, vmax=np.percentile(t1, 99.5))
        c = etape2.coupe(carte, 'axial', k).astype(int)
        c = np.where(c == territoires.VENTRICULE, 0, c)
        ax.imshow(np.ma.masked_equal(c, 0), cmap=cmap, vmin=0, vmax=255, alpha=0.45, interpolation='nearest')
        j = etape2.coupe(jonctions, 'axial', k)
        if j.any():
            ax.contour(j > 0, levels=[0.5], colors='white', linewidths=0.6)
        ax.set_title(f'Territoires sur le sujet : axial z = {z:+d} mm', fontsize=9)
        ax.axis('off')
    fig.tight_layout()
    chemin = os.path.join(SORTIE, fichier)
    fig.savefig(chemin, dpi=72)
    plt.close(fig)
    return chemin


def planche_tissus(t1, tis, cerveau, affine, fichier):
    fig, axes = plt.subplots(1, 3, figsize=(13, 4.8))
    cmap = ListedColormap([[0, 0, 0, 0], [0.25, 0.6, 1, 1], [0.95, 0.75, 0.2, 1], [0.95, 0.95, 0.95, 1]])
    for ax, (plan, pos) in zip(axes, (('axial', 10), ('coronal', -8), ('sagittal', -28))):
        axe = {'sagittal': 0, 'coronal': 1, 'axial': 2}[plan]
        k = int(round((pos - affine[axe, 3]) / PAS))
        ax.imshow(etape2.coupe(t1, plan, k), cmap='gray', vmin=0, vmax=np.percentile(t1, 99.5))
        ax.imshow(np.ma.masked_equal(etape2.coupe(np.where(cerveau & (tis > 0), tis, 0), plan, k), 0), cmap=cmap, vmin=0, vmax=3,
                  alpha=0.35, interpolation='nearest')
        ax.contour(etape2.coupe(cerveau, plan, k), levels=[0.5], colors='#ff4fd8', linewidths=0.6)
        ax.set_title(f'Tissus : {plan} (bleu LCS, jaune SG, blanc SB ; rose : cerveau)', fontsize=8.5)
        ax.axis('off')
    fig.tight_layout()
    chemin = os.path.join(SORTIE, fichier)
    fig.savefig(chemin, dpi=72)
    plt.close(fig)
    return chemin


def planche_arteres(v, masque, fichier):
    fig, axes = plt.subplots(2, 2, figsize=(13, 11), gridspec_kw={'height_ratios': [1.35, 0.6]})
    haut = np.percentile(v, 99.9)
    for col, (titre, x) in enumerate((('TOF (MIP)', v), ('Masque des artères (MIP)', masque.astype(np.float32)))):
        axes[0, col].imshow(np.rot90(x.max(axis=2))[:, ::-1], cmap='gray', vmax=haut if col == 0 else 1)
        axes[1, col].imshow(np.rot90(x.max(axis=1))[:, ::-1], cmap='gray', vmax=haut if col == 0 else 1)
        axes[0, col].set_title(f'{titre} : axiale', fontsize=10)
        axes[1, col].set_title(f'{titre} : coronale', fontsize=10)
    for ax in axes.flat:
        ax.axis('off')
    fig.tight_layout()
    chemin = os.path.join(SORTIE, fichier)
    fig.savefig(chemin, dpi=70)
    plt.close(fig)
    return chemin


# ---------------------------------------------------------------------------
def partie_a():
    os.makedirs(CACHE, exist_ok=True)
    t1, a = lire_grille('t1')
    t2, _ = lire_grille('t2')
    grille = etape2.vers_ants(t1, a)
    print('Colin 27 → sujet…')
    c = colin_vers_sujet(grille)
    print('tissus…')
    tis, large = tissus(t1, t2, c['cerveau'], a)
    # cerveau du sujet : plus grande composante de parenchyme (SG ou SB) dans le cerveau de Colin 27 dilaté de 2 mm,
    # fermée de 3 mm (le LCS des sillons et les ventricules sont inclus)
    paren = large & ((tis == 2) | (tis == 3))
    lab, n = ndi.label(ndi.binary_opening(paren, boule(0.7)))
    paren = lab == (np.argmax(np.bincount(lab.ravel())[1:]) + 1)
    cerveau = ndi.binary_fill_holes(ndi.binary_closing(paren, boule(3.0)) | c['cerveau'])
    print('territoires…')
    carte, jonctions = territoires_sujet(c['carte'], c['jonctions'], tis, cerveau)
    enregistrer('cerveau', cerveau, a)
    enregistrer('tissus', np.where(cerveau & (tis > 0), tis, 0), a)
    enregistrer('territoires', carte, a)
    enregistrer('jonctions', jonctions, a)
    print('artères…')
    v_tof, art_natif, art = arteres_tof(cerveau, a, grille)
    enregistrer('arteres-tof', art, a)
    images = [planche_tissus(t1, tis, cerveau, a, 'tissus.png'),
              planche_territoires(t1, carte, jonctions, a, 'territoires-sujet.png'),
              planche_arteres(v_tof, art_natif, 'arteres-tof.png')]
    resume = {'cerveau_ml': round(float(cerveau.sum() * PAS ** 3 / 1000), 1),
              'tissus_ml': {n: round(float(((tis == k) & cerveau).sum() * PAS ** 3 / 1000), 1)
                            for k, n in ((1, 'LCS'), (2, 'substance grise'), (3, 'substance blanche'))},
              'territoires': sorted(int(x) for x in np.unique(carte) if x),
              'arteres_tof_ml': round(float(art_natif.sum() * np.prod(nib.load(
                  os.path.join(SORTIE, 'arteres-tof-natif-0,3mm.nii.gz')).header.get_zooms()[:3]) / 1000), 2),
              'images': [os.path.relpath(i, RACINE) for i in images]}
    with open(os.path.join(SORTIE, 'partie-a.json'), 'w', encoding='utf-8') as f:
        json.dump(resume, f, ensure_ascii=False, indent=1)
    print(json.dumps(resume, ensure_ascii=False, indent=1))


if __name__ == '__main__':
    partie_a()
