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
Partie B : FastSurfer v2.6.0 (segmentation seule, sans surfaces ; code et modèles Apache 2.0), lancé par
  run_fastsurfer.sh --seg_only --vox_size min --t2 (T2 recalé, --reg_mode none) --device cpu --no_biasfield
  (voir la commande dans le README) : noyaux gris, ventricules, cervelet, tronc cérébral, hippocampe, amygdale,
  31 régions corticales DKT par hémisphère ; FastSurfer-CC (Apache 2.0) : corps calleux en cinq parties et fornix ;
  CerebNet (modèles CC BY 4.0) : lobules du cervelet ; HypVINN (modèles CC BY 4.0) : hypothalamus, corps
  mamillaires, colonnes du fornix, commissure antérieure, chiasma, nerfs et tractus optiques, hypophyse, tige
  pituitaire, épiphyse ; puis structures dérivées : lobes, sillons, fissure longitudinale, faux du cerveau, tente.
Partie C : TractSeg (code Apache 2.0, modèles CC BY 4.0) sur la diffusion du sujet (pics de MRtrix3, MPL 2.0) :
  72 faisceaux de substance blanche.

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



# ---------------------------------------------------------------------------
# Partie B : FastSurfer (étiquettes des outils ramenées sur la grille) et structures dérivées
# ---------------------------------------------------------------------------
SUJET_FS = os.path.join(SORTIE, 'fastsurfer', 'sub01', 'mri')
# identifiants de sortie (table de couleurs de FreeSurfer) : CerebNet 601–632, HypVINN 961–984, FastSurfer-CC 250–255
CEREBNET = (601, 632)
HYPVINN = (961, 984)
HYPVINN_DOUBLONS = (970,)                            # troisième ventricule : on garde celui de FastSurfer (aseg)
VENTRICULES = (4, 5, 14, 15, 43, 44, 31, 63)         # ventricules et plexus choroïdes (aseg)
CERVELET_ASEG = (7, 8, 46, 47)


def sur_grille_etiquettes(chemin, affine, forme):
    """Étiquettes d'un fichier (même espace physique) ramenées sur la grille, au plus proche voisin, coupe par coupe."""
    img = nib.load(chemin)
    lab = np.asanyarray(img.dataobj)
    lab = (lab[..., 0] if lab.ndim == 4 else lab).astype(np.int32)
    m = (np.linalg.inv(img.affine) @ affine).astype(np.float32)
    ii, jj = np.meshgrid(np.arange(forme[0], dtype=np.float32), np.arange(forme[1], dtype=np.float32), indexing='ij')
    sortie = np.zeros(forme, np.int32)
    for k in range(forme[2]):
        coord = [m[r, 0] * ii + m[r, 1] * jj + m[r, 2] * k + m[r, 3] for r in range(3)]
        sortie[:, :, k] = ndi.map_coordinates(lab, coord, order=0, mode='constant', cval=0)
    return sortie


def etiquettes_fines(affine, forme):
    """FastSurfer (aseg + DKT, avec le corps calleux de FastSurfer-CC), puis fornix (FastSurfer-CC), lobules du
    cervelet (CerebNet, dans le cervelet de FastSurfer) et HypVINN par-dessus ; identifiants FreeSurfer gardés."""
    fines = sur_grille_etiquettes(os.path.join(SUJET_FS, 'aparc.DKTatlas+aseg.deep.withCC.mgz'), affine, forme)
    cc = sur_grille_etiquettes(os.path.join(SUJET_FS, 'callosum.CC.orig.mgz'), affine, forme)
    fines[cc == 250] = 250
    cb = sur_grille_etiquettes(os.path.join(SUJET_FS, 'cerebellum.CerebNet.nii.gz'), affine, forme)
    zone = (cb >= CEREBNET[0]) & (cb <= CEREBNET[1]) & np.isin(fines, CERVELET_ASEG)
    fines[zone] = cb[zone]
    hy = sur_grille_etiquettes(os.path.join(SUJET_FS, 'hypothalamus.HypVINN.nii.gz'), affine, forme)
    zone = (hy >= HYPVINN[0]) & (hy <= HYPVINN[1]) & ~np.isin(hy, HYPVINN_DOUBLONS)
    fines[zone] = hy[zone]
    return fines


def ids_dkt(noms, cote):
    from etiquettes import DKT_NUM
    return [(1000 if cote == 'gauche' else 2000) + DKT_NUM[n] for n in noms]


def lobes(fines):
    """Régions corticales DKT regroupées en lobes ; substance blanche à moins de 5 mm du cortex rattachée à la
    région corticale la plus proche du même hémisphère (comme « wmparc » de FreeSurfer). Identifiants : lobe n
    (1 à 6, ordre de LOBES) à gauche, 10 + n à droite ; 20 = tronc cérébral."""
    from etiquettes import LOBES
    sortie = np.zeros(fines.shape, np.uint8)
    for cote, base, sb in (('gauche', 0, 2), ('droit', 10, 41)):
        table = {}
        for n, (_, _, regions, _) in enumerate(LOBES, start=1):
            for i in ids_dkt(regions, cote):
                table[i] = base + n
        cortex = np.isin(fines, list(table))
        d, idx = ndi.distance_transform_edt(~cortex, sampling=PAS, return_indices=True)
        proche = fines[tuple(idx)]
        del idx
        lobe_de = np.zeros(4096, np.uint8)
        for i, l in table.items():
            lobe_de[i] = l
        cible = cortex | ((fines == sb) & (d <= 5.0))
        sortie[cible] = lobe_de[proche[cible]]
    sortie[fines == 16] = 20
    return sortie


def sillons_et_meninges(fines, cerveau):
    """Sillons : LCS compris entre deux groupes de régions DKT (à moins de 3 mm de chacun), plus le fond du sillon
    (cortex d'un groupe au contact de l'autre) ; identifiant n (ordre de SILLONS) à gauche, 50 + n à droite.
    Fissure longitudinale (100) : LCS à moins de 4 mm des deux hémisphères et à moins de 3 mm du cortex.
    Méninges déduites : faux du cerveau (1) = surface médiane de la fissure, hors des 3 mm autour du corps calleux ;
    tente du cervelet (2) = surface à égale distance du cerveau et du cervelet, à plus de 5 mm du tronc cérébral."""
    from etiquettes import SILLONS, DKT_NUM
    tissu = (fines > 0) & ~np.isin(fines, VENTRICULES + (24,))
    ventricules = ndi.binary_dilation(np.isin(fines, VENTRICULES), boule(1.5))
    espace = ndi.binary_fill_holes(ndi.binary_closing(tissu, boule(4.0))) & ~tissu & ~ventricules
    cortex_tout = (fines >= 1000) & (fines < 3000)                      # régions DKT
    sillons = np.zeros(fines.shape, np.uint8)
    meilleur = np.full(fines.shape, np.inf, np.float32)
    edt = lambda m: ndi.distance_transform_edt(~m, sampling=PAS).astype(np.float32)
    for cote, base in (('gauche', 0), ('droit', 50)):
        for n, (_, a, b, _) in enumerate(SILLONS, start=1):
            ma = np.isin(fines, ids_dkt(a, cote))
            if a == b:                                   # sillon calcarin : LCS bordé par le cortex péricalcarin
                da = edt(ma)
                autres = np.isin(fines, [x for x in ids_dkt(list(DKT_NUM), cote) if x not in ids_dkt(a, cote)])
                cand = espace & (da <= 2.0) & (da < edt(autres))
                score = 2 * da
            else:
                mb = np.isin(fines, ids_dkt(b, cote))
                da, db = edt(ma), edt(mb)
                score = da + db
                cand = espace & (da <= 3.0) & (db <= 3.0)
                fond = (ma & (db <= PAS * 1.01)) | (mb & (da <= PAS * 1.01))
                cand |= fond
            cand &= score < meilleur
            sillons[cand] = base + n
            meilleur[cand] = score[cand]
    gauche = (fines >= 1000) & (fines < 2000) | np.isin(fines, (2, 4, 5, 10, 11, 12, 13, 17, 18, 26, 28))
    droite = (fines >= 2000) & (fines < 3000) | np.isin(fines, (41, 43, 44, 49, 50, 51, 52, 53, 54, 58, 60))
    dg, dd = edt(gauche), edt(droite)
    fissure = espace & (dg <= 4.0) & (dd <= 4.0) & (edt(cortex_tout) <= 3.0)
    sillons[fissure & (sillons == 0)] = 100
    meninges = np.zeros(fines.shape, np.uint8)
    cc = (fines >= 251) & (fines <= 255)
    loin_cc = edt(cc) > 3.0 if cc.any() else np.ones(fines.shape, bool)
    meninges[fissure & (np.abs(dg - dd) <= 0.7) & loin_cc] = 1
    cervelet = (fines >= CEREBNET[0]) & (fines <= CEREBNET[1]) | np.isin(fines, CERVELET_ASEG)
    cerebrum = cortex_tout | np.isin(fines, (2, 41))
    dcb, dce = edt(cervelet), edt(cerebrum)
    tente = (~tissu & ~ventricules & ndi.binary_dilation(cerveau, boule(3.0)) & (dcb <= 4.0) & (dce <= 4.0)
             & (np.abs(dcb - dce) <= 0.7) & (edt(fines == 16) > 5.0))
    meninges[tente] = 2
    return sillons, meninges


def couleurs_aleatoires(n, graine=3):
    rng = np.random.default_rng(graine)
    c = np.ones((n, 4))
    c[:, :3] = rng.uniform(0.25, 1.0, (n, 3))
    c[0] = 0
    return ListedColormap(c)


def planche_etiquettes(fond, etiq, affine, vues, titre, fichier, alpha=0.5, contour=None):
    """Étiquettes (couleurs arbitraires, contrôle seulement) sur le T1 ; vues = [(plan, position mm), …]."""
    n = len(vues)
    cols = min(n, 3)
    rangs = (n + cols - 1) // cols
    fig, axes = plt.subplots(rangs, cols, figsize=(4.6 * cols, 4.8 * rangs), squeeze=False)
    valeurs = np.unique(etiq)
    rang = np.zeros(int(valeurs.max()) + 1, np.int32)
    rang[valeurs] = np.arange(len(valeurs))
    cmap = couleurs_aleatoires(len(valeurs))
    for ax in axes.flat:
        ax.axis('off')
    for ax, (plan, pos, *zoom) in zip(axes.flat, vues):
        axe = {'sagittal': 0, 'coronal': 1, 'axial': 2}[plan]
        k = int(round((pos - affine[axe, 3]) / PAS))
        f = etape2.coupe(fond, plan, k)
        e = rang[etape2.coupe(etiq, plan, k)]
        ax.imshow(f, cmap='gray', vmin=0, vmax=np.percentile(fond, 99.5), interpolation='bilinear')
        ax.imshow(np.ma.masked_equal(e, 0), cmap=cmap, vmin=0, vmax=len(valeurs) - 1, alpha=alpha,
                  interpolation='nearest')
        if contour is not None:
            ax.contour(etape2.coupe(contour, plan, k), levels=[0.5], colors='white', linewidths=0.5)
        if zoom:
            (y0, y1), (x0, x1) = zoom[0]
            ax.set_xlim(x0, x1)
            ax.set_ylim(y1, y0)
        lettre = {'axial': 'z', 'coronal': 'y', 'sagittal': 'x'}[plan]
        ax.set_title(f'{titre} : {plan} {lettre} = {pos:+.0f} mm', fontsize=9)
    fig.tight_layout()
    chemin = os.path.join(SORTIE, fichier)
    fig.savefig(chemin, dpi=72)
    plt.close(fig)
    return chemin


def zoom_autour(etiq_masque, affine, plan, pos, marge_mm=25):
    """Cadre (lignes, colonnes) autour d'un masque, dans l'image affichée par etape2.coupe."""
    axe = {'sagittal': 0, 'coronal': 1, 'axial': 2}[plan]
    k = int(round((pos - affine[axe, 3]) / PAS))
    m = etape2.coupe(etiq_masque.astype(np.uint8), plan, k)
    if not m.any():
        return None
    r, c = np.nonzero(m)
    g = int(marge_mm / PAS)
    return ((max(r.min() - g, 0), r.max() + g), (max(c.min() - g, 0), c.max() + g))


def partie_b():
    os.makedirs(CACHE, exist_ok=True)
    t1, a = lire_grille('t1')
    forme = t1.shape
    cerveau = np.asanyarray(nib.load(os.path.join(SORTIE, 'cerveau.nii.gz')).dataobj) > 0
    print('étiquettes FastSurfer…')
    fines = etiquettes_fines(a, forme)
    enregistrer('etiquettes-fines', fines, a, np.uint16)
    print('lobes…')
    lob = lobes(fines)
    enregistrer('lobes', lob, a)
    print('sillons et méninges…')
    sil, men = sillons_et_meninges(fines, cerveau)
    enregistrer('sillons', sil, a)
    enregistrer('meninges', men, a)
    print('contrôles…')
    est_hyp = (fines >= HYPVINN[0]) & (fines <= HYPVINN[1])
    deep = np.where(np.isin(fines, (10, 11, 12, 13, 17, 18, 26, 28, 49, 50, 51, 52, 53, 54, 58, 60, 16, 250)
                            + VENTRICULES) | est_hyp | ((fines >= 251) & (fines <= 255)), fines, 0)
    dkt = np.where((fines >= 1000) & (fines < 3000), fines, 0)
    cb = np.where((fines >= CEREBNET[0]) & (fines <= CEREBNET[1]) | np.isin(fines, CERVELET_ASEG), fines, 0)
    hyp = np.where(est_hyp, fines, 0)
    hz = zoom_autour(hyp > 0, a, 'coronal', -4) or ((0, forme[2]), (0, forme[0]))
    hs = zoom_autour(hyp > 0, a, 'sagittal', -2) or ((0, forme[2]), (0, forme[1]))
    ha = zoom_autour(hyp > 0, a, 'axial', -10) or ((0, forme[1]), (0, forme[0]))
    images = [
        planche_etiquettes(t1, deep, a, [('axial', 4), ('axial', -12), ('coronal', -2), ('coronal', -20),
                                         ('sagittal', -24), ('sagittal', -4)],
                           'Noyaux, ventricules, hippocampe', 'fastsurfer-noyaux-ventricules.png'),
        planche_etiquettes(t1, dkt, a, [('axial', 40), ('axial', 10), ('axial', -14), ('coronal', -20),
                                        ('sagittal', -44), ('sagittal', -6)], 'Régions DKT', 'fastsurfer-gyri.png'),
        planche_etiquettes(t1, lob, a, [('axial', 40), ('axial', 4), ('coronal', -20), ('sagittal', -40),
                                        ('sagittal', -6), ('axial', -30)], 'Lobes', 'lobes.png', alpha=0.4),
        planche_etiquettes(t1, sil, a, [('axial', 55), ('axial', 35), ('axial', 10), ('coronal', -20),
                                        ('sagittal', -42), ('sagittal', -8)], 'Sillons', 'sillons.png', alpha=0.85),
        planche_etiquettes(t1, cb, a, [('coronal', -60), ('coronal', -72), ('sagittal', -2), ('sagittal', -24),
                                       ('axial', -30), ('axial', -42)], 'Cervelet (CerebNet)', 'cervelet.png'),
        planche_etiquettes(t1, hyp, a, [('coronal', -4, hz), ('sagittal', -2, hs), ('axial', -10, ha)],
                           'HypVINN', 'hypothalamus-voies-optiques.png', alpha=0.6),
        planche_etiquettes(t1, men, a, [('coronal', -20), ('coronal', -60), ('sagittal', -1), ('sagittal', -20),
                                        ('axial', 30), ('axial', -20)], 'Faux et tente', 'meninges.png', alpha=0.9),
    ]
    noms = {}
    for ligne in open(os.path.join(RACINE, 'assets-sources', 'outils', 'FastSurfer', 'FastSurferCNN', 'config',
                                   'FreeSurferColorLUT.txt'), encoding='utf-8'):
        c = ligne.split()
        if len(c) >= 2 and c[0].isdigit():
            noms[int(c[0])] = c[1]
    vol = lambda m: round(float(m.sum() * PAS ** 3 / 1000), 2)
    resume = {'volumes_ml': {noms.get(int(i), str(int(i))): vol(fines == i) for i in np.unique(fines)
                             if i and not (CEREBNET[0] <= i <= CEREBNET[1] or HYPVINN[0] <= i <= HYPVINN[1])},
              'cerebnet_ml': {noms.get(int(i), str(int(i))): vol(fines == i) for i in np.unique(cb) if i},
              'hypvinn_mm3': {noms.get(int(i), str(int(i))): round(float((fines == i).sum() * PAS ** 3), 1)
                              for i in np.unique(hyp) if i},
              'lobes_ml': {int(i): vol(lob == i) for i in np.unique(lob) if i},
              'sillons_ml': {int(i): vol(sil == i) for i in np.unique(sil) if i},
              'meninges_ml': {int(i): vol(men == i) for i in np.unique(men) if i},
              'images': [os.path.relpath(i, RACINE) for i in images]}
    with open(os.path.join(SORTIE, 'partie-b.json'), 'w', encoding='utf-8') as f:
        json.dump(resume, f, ensure_ascii=False, indent=1)
    print(json.dumps({k: v for k, v in resume.items() if k != 'volumes_ml'}, ensure_ascii=False)[:3000])



# ---------------------------------------------------------------------------
# Partie C : faisceaux de substance blanche du sujet (TractSeg, à partir de sa diffusion)
# ---------------------------------------------------------------------------
TRACTSEG = os.path.join(SORTIE, 'tractseg')
PAS_TS = 1.25                                        # résolution attendue par TractSeg (espace MNI, rigide)


def partie_c(venv=os.path.join(RACINE, 'assets-sources', 'outils', 'venv-fastsurfer')):
    """Diffusion (corrigée à l'étape 2) rééchantillonnée sur une grille de 1,25 mm alignée sur la grille de
    référence (espace MNI, recalage rigide), vecteurs de gradient tournés d'autant (repère du monde, RAS) ;
    MRtrix3 : réponse de la substance blanche (Tournier), déconvolution sphérique (CSD), trois pics par voxel ;
    TractSeg : 72 faisceaux (masques binaires)."""
    import subprocess
    os.makedirs(TRACTSEG, exist_ok=True)
    t1, a = lire_grille('t1')
    forme = np.ceil(np.array(t1.shape) * PAS / PAS_TS).astype(int)
    a_ts = np.diag([PAS_TS] * 3 + [1.0])
    a_ts[:3, 3] = a[:3, 3]
    grille_ts = etape2.vers_ants(np.zeros(forme, np.float32), a_ts)
    c2 = os.path.join(ETAPE2, 'cache')
    chaine = [os.path.join(c2, 't1-vers-mni.mat'), os.path.join(c2, 't1-vers-t2.mat'), os.path.join(c2, 't2-vers-b0.mat')]
    dwi_f = os.path.join(TRACTSEG, 'dwi.nii.gz')
    grad_f = os.path.join(TRACTSEG, 'gradients.b')
    masque_f = os.path.join(TRACTSEG, 'masque.nii.gz')
    if not os.path.exists(dwi_f):
        dwi, bval, g_lps, da = etape2.preparer_diffusion()
        vols = [ants.apply_transforms(grille_ts, etape2.vers_ants(dwi[..., i], da), chaine,
                                      interpolator='linear').numpy() for i in range(dwi.shape[3])]
        nib.save(nib.Nifti1Image(np.clip(np.stack(vols, axis=3), 0, None).astype(np.float32), a_ts), dwi_f)
        rot = np.diag([-1, -1, 1]) @ np.linalg.inv(etape2.matrice(chaine))   # diffusion (LPS) → monde (RAS)
        g = (rot @ g_lps).T
        g[bval == 0] = 0
        with open(grad_f, 'w') as f:                  # format MRtrix : x y z b, repère du monde
            for (x, y, z), b in zip(g, bval):
                f.write(f'{x:.6f} {y:.6f} {z:.6f} {b:.0f}\n')
        m = sur_grille_etiquettes(os.path.join(SORTIE, 'cerveau.nii.gz'), a_ts, tuple(forme)) > 0
        nib.save(nib.Nifti1Image(m.astype(np.uint8), a_ts), masque_f)
    # les scripts Python de MRtrix3 3.0.4 importent « imp » (retiré de Python 3.12) : petit module de remplacement
    env = {**os.environ, 'PYTHONPATH': os.path.join(ICI, 'compat')}
    mr = lambda *args: subprocess.run(list(args) + ['-force', '-quiet', '-nthreads', '4'], check=True, env=env,
                                      cwd=TRACTSEG)
    rep, fod, pics = (os.path.join(TRACTSEG, n) for n in ('reponse-sb.txt', 'fod-sb.mif', 'pics.nii.gz'))
    if not os.path.exists(pics):
        mr('dwi2response', 'tournier', dwi_f, rep, '-grad', grad_f, '-mask', masque_f, '-scratch', CACHE)
        mr('dwi2fod', 'csd', dwi_f, '-grad', grad_f, rep, fod, '-mask', masque_f)
        mr('sh2peaks', fod, pics, '-num', '3', '-mask', masque_f)
    sortie = os.path.join(TRACTSEG, 'resultat')
    if not os.path.isdir(os.path.join(sortie, 'bundle_segmentations')):
        subprocess.run([os.path.join(venv, 'bin', 'TractSeg'), '-i', pics, '-o', sortie,
                        '--output_type', 'tract_segmentation'], check=True)
    faisceaux = sorted(f[:-7] for f in os.listdir(os.path.join(sortie, 'bundle_segmentations')) if f.endswith('.nii.gz'))
    print(len(faisceaux), 'faisceaux')
    planche_faisceaux(t1, a, faisceaux)
    return faisceaux


def planche_faisceaux(t1, a, faisceaux):
    """Quelques grands faisceaux (un par couleur) sur le T1 : contrôle de position."""
    choix = ['CST_left', 'CST_right', 'AF_left', 'AF_right', 'IFO_left', 'IFO_right', 'ILF_left', 'ILF_right', 'UF_left',
             'UF_right', 'CG_left', 'CG_right', 'OR_left', 'OR_right', 'SLF_II_left', 'SLF_II_right', 'MCP', 'SCP_left',
             'SCP_right', 'CC_2', 'CC_7']
    choix = [f for f in choix if f in faisceaux]
    d = os.path.join(TRACTSEG, 'resultat', 'bundle_segmentations')
    etiq = np.zeros(t1.shape, np.int32)
    for n, f in enumerate(reversed(choix), start=1):       # le premier de la liste est peint en dernier
        m = sur_grille_etiquettes(os.path.join(d, f + '.nii.gz'), a, t1.shape) > 0
        etiq[m] = len(choix) + 1 - n
    vues = [('axial', 30), ('axial', 4), ('axial', -16), ('coronal', -20), ('coronal', 8), ('sagittal', -36),
            ('sagittal', -8), ('coronal', -60), ('axial', -36)]
    return planche_etiquettes(t1, etiq, a, vues, 'Faisceaux (TractSeg)', 'faisceaux.png', alpha=0.55)



# ---------------------------------------------------------------------------
# Rapport de l'étape 3 : structures obtenues par catégorie (d'après la table de correspondance)
# ---------------------------------------------------------------------------
OUTILS = [
    ('FastSurfer v2.6.0 (segmentation seule)', 'Apache 2.0 (code et modèles)'),
    ('FastSurfer-CC (corps calleux, fornix)', 'Apache 2.0 (code et modèles)'),
    ('CerebNet (lobules du cervelet)', 'code Apache 2.0, modèles CC BY 4.0'),
    ('HypVINN (hypothalamus, voies optiques, glandes)', 'code Apache 2.0, modèles CC BY 4.0'),
    ('TractSeg 2.10 (72 faisceaux)', 'code Apache 2.0, modèles CC BY 4.0'),
    ('MRtrix3 3.0.4 (réponse, CSD, pics)', 'MPL 2.0'),
    ('PyTorch 2.14.1', 'BSD'),
    ('ANTs / ANTsPy 0.6.3 (recalages, Atropos)', 'Apache 2.0'),
    ('Atlas des territoires artériels (Liu et al. 2023, redécoupé)', 'CC BY-SA 4.0'),
    ('Colin 27 (relais du recalage)', 'libre avec mention du copyright McGill'),
]


def partie_rapport():
    import csv
    from collections import defaultdict
    lire = lambda n: set(np.unique(np.asanyarray(nib.load(os.path.join(SORTIE, n)).dataobj)).tolist())
    fines, terr = lire('etiquettes-fines.nii.gz'), lire('territoires.nii.gz')
    ts = {f[:-7] for f in os.listdir(os.path.join(TRACTSEG, 'resultat', 'bundle_segmentations'))}
    with open(os.path.join(ICI, 'correspondance-etiquettes.csv'), encoding='utf-8-sig') as f:
        lignes = list(csv.reader(f, delimiter=';'))[1:]
    compte, absents = defaultdict(lambda: defaultdict(int)), []
    for src, ident, _, cat, fr, _, statut, _ in lignes:
        if statut == 'non publié':
            continue
        present = True
        if src.startswith('FastSurfer') or src in ('CerebNet', 'HypVINN'):
            present = int(ident) in fines
        elif src == 'TractSeg':
            present = ident in ts
        elif src.startswith('Atlas des territoires (Liu'):
            present = int(ident) in terr
        if not present:
            absents.append(fr)
        compte[cat][statut] += int(present)
    from etiquettes import CATEGORIES
    l = ['# Étape 3 : segmentations automatiques (studyforrest, sujet 01)', '', '## Outils', '',
         '| Outil | Licence |', '|---|---|'] + [f'| {o} | {lic} |' for o, lic in OUTILS] + [
         '', '## Structures par catégorie', '',
         '| Catégorie | Automatiques | Dérivées (règle) | Reportées (atlas) | À placer (points manuels) |',
         '|---|---|---|---|---|']
    for cat in CATEGORIES:
        c = compte[cat]
        l.append(f"| {cat} | {c['automatique']} | {c['dérivé']} | {c['transporté']} | {c['manuel']} |")
    tot = lambda k: sum(compte[c][k] for c in compte)
    l.append(f"| **Total** | **{tot('automatique')}** | **{tot('dérivé')}** | **{tot('transporté')}** | **{tot('manuel')}** |")
    l += ['', f"Structures attendues mais absentes des segmentations : {', '.join(absents) or 'aucune'}.", '',
          '## Points à vérifier', '',
          "- Nerf optique gauche presque absent de HypVINN (6 mm³, contre 130 mm³ à droite) : point manuel conseillé.",
          '- Sillons, lobes, fissure longitudinale, faux du cerveau et tente du cervelet : déduits par règle (voir la table).',
          '- Faisceaux (TractSeg) : masques à 1,25 mm, issus de la diffusion du sujet (32 directions, b = 800) ; le fornix '
          'de TractSeg, trop fin, est remplacé par celui de FastSurfer.',
          "- Artères : masque du TOF sans nom ; sinus veineux, citernes, nerfs crâniens, méninges (sauf faux et tente), "
          "anatomie de surface du tronc cérébral : points manuels de l'auteur (étape 4).", '']
    with open(os.path.join(SORTIE, 'rapport.md'), 'w', encoding='utf-8') as f:
        f.write('\n'.join(l))
    print('\n'.join(l))


if __name__ == '__main__':
    parties = sys.argv[1:] or ['a', 'b', 'c', 'r']
    if 'a' in parties:
        partie_a()
    if 'b' in parties:
        partie_b()
    if 'c' in parties:
        partie_c()
    if 'r' in parties or len(parties) > 1:
        partie_rapport()
