"""Radioanatomie IRM cérébrale, étape 2 : préparation des séquences (studyforrest, sujet 01).

Entrées : fichiers téléchargés et vérifiés à l'étape 1 (assets-sources/radioanatomie/irm-cerebrale/studyforrest/).
Traitement :
  1. 3D T1 de référence : correction d'inhomogénéité (N4), puis alignement sur le plan bicommissural (CA-CP)
     par un recalage RIGIDE (6 paramètres) sur le cerveau Colin 27 de l'espace MNI, comme dans les chaînes de
     traitement de référence : l'anatomie du sujet est seulement tournée et déplacée, jamais déformée ;
  2. grille de référence : boîte englobant la tête jusqu'à 100 mm sous le plan CA-CP, voxels isotropes de 0,7 mm,
     axes droite-gauche, arrière-avant, bas-haut ; les reconstructions axiales, coronales et sagittales sont les
     coupes de cette grille ;
  3. recalages rigides (information mutuelle, ANTs) sur le 3D T1 : T2, amplitude SWI, ARM TOF 7 T (autre séance et
     autre appareil : départ dans les coordonnées des appareils, métrique calculée dans le bloc du TOF), diffusion
     b = 0 (sur le T2, de contraste proche) ;
  4. SWI : image de susceptibilité calculée à partir de l'amplitude et de la phase (Haacke et al. 2004) : phase
     déroulée (méthode laplacienne) puis filtrée passe-haut (moins sa moyenne locale, gaussienne de 4 mm), masque
     des phases du signe des veines (signe lu sur les voxels veineux, les plus sombres en amplitude), à la
     puissance 4 ; puis minIP glissante de 8 mm dans le plan axial (affichée en axial seulement) ;
  5. diffusion (DTI, 32 directions, b = 800 s/mm²) : correction du mouvement et des courants de Foucault (recalage
     affine de chaque volume sur le b = 0, vecteurs de gradient tournés d'autant), tenseur par moindres carrés
     pondérés : image de diffusion (moyenne géométrique des 32 directions), ADC (diffusivité moyenne), FA et FA
     couleur (rouge droite-gauche, vert avant-arrière, bleu haut-bas) ; séquence 2D (coupes de 2 mm) : affichée
     seulement dans son plan d'acquisition, axial ;
  6. rééchantillonnage sur la grille de référence (Lanczos ; filtre anti-repliement pour les séquences plus fines
     que 0,7 mm ; linéaire pour les cartes de diffusion) ; fond hors de la tête mis à zéro ;
  7. contrôle : contours du 3D T1 (limite substance grise / substance blanche, en jaune ; limite LCS / tissu, en
     bleu) superposés à chaque séquence dans les trois plans ; planche des reconstructions à une même position.
Sortie : assets-sources/radioanatomie/irm-cerebrale/etape2/ (volumes NIfTI, transformations, rapport, images) ;
calculs longs mis en cache dans etape2/cache/ (à effacer pour tout recalculer, environ 25 min sans cache).
Usage : python3 -I -B scripts/radioanatomie/irm/etape2_preparation.py   (depuis la racine du dépôt)
Dépendances : numpy, scipy, nibabel, antspyx, matplotlib.
"""
import hashlib, json, os, shutil, sys, tempfile, urllib.request

os.environ.setdefault('ANTS_RANDOM_SEED', '1')         # échantillonnage aléatoire des recalages reproductible
import ants
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import nibabel as nib
import numpy as np
from scipy import fft as sfft
from scipy import ndimage as ndi

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import etape1_anonymisation as etape1

RACINE = etape1.RACINE
SOURCES = etape1.SOURCES
SORTIE = os.path.join(etape1.BASE, 'etape2')
CACHE = os.path.join(SORTIE, 'cache')
P = etape1.P
PAS = 0.7                                               # voxels de la grille de référence (mm)
Z_BAS = -100.0                                          # bas de la grille, en mm sous le plan CA-CP (MNI)
COLIN = (os.path.join(RACINE, 'assets-sources', 'radioanatomie', 'tpl-MNIColin27_T1w.nii.gz'),
         'https://templateflow.s3.amazonaws.com/tpl-MNIColin27/tpl-MNIColin27_T1w.nii.gz'
         '?versionId=nHRiNs2oMbAJ09gNA27a4VNopI1r4.cZ',
         '811416b120cca98d28762a5ca3fd9ecbed6c02c1bf0bac8b0ff037518089da3b')


# ---------------------------------------------------------------------------
# Outils
# ---------------------------------------------------------------------------
def telecharger():
    etape1.telecharger()
    chemin, url, empreinte = COLIN
    if not os.path.exists(chemin):
        with urllib.request.urlopen(url) as r, open(chemin + '.tmp', 'wb') as f:
            shutil.copyfileobj(r, f)
        os.replace(chemin + '.tmp', chemin)
    if hashlib.sha256(open(chemin, 'rb').read()).hexdigest() != empreinte:
        sys.exit('empreinte inattendue pour Colin 27')


def lire(fichier, volume=None):
    img = nib.load(os.path.join(SOURCES, fichier))
    v = np.asanyarray(img.dataobj).astype(np.float32)
    return (v[..., volume] if volume is not None else v), img.affine


def vers_ants(v, affine):
    """Tableau + affine NIfTI (RAS) → image ANTs (LPS), par un fichier temporaire en flottants."""
    with tempfile.TemporaryDirectory() as d:
        f = os.path.join(d, 'v.nii')
        nib.save(nib.Nifti1Image(np.asarray(v, np.float32), affine), f)
        return ants.image_read(f)


def vers_nib(img):
    """Image ANTs → (tableau, affine RAS)."""
    with tempfile.TemporaryDirectory() as d:
        f = os.path.join(d, 'v.nii')
        ants.image_write(img, f)
        n = nib.load(f)
        return np.asanyarray(n.dataobj).astype(np.float32), n.affine


def en_cache(nom, calcul):
    """Image ANTs mise en cache (NIfTI) : calculée une seule fois."""
    chemin = os.path.join(CACHE, nom + '.nii.gz')
    if not os.path.exists(chemin):
        ants.image_write(calcul(), chemin)
    return ants.image_read(chemin)


def recalage(nom, fixe, mobile, **options):
    """Recalage rigide mis en cache ; renvoie le fichier de transformation (points du fixe → points du mobile)."""
    chemin = os.path.join(CACHE, nom + '.mat')
    if not os.path.exists(chemin):
        r = ants.registration(fixed=fixe, moving=mobile, type_of_transform='Rigid', aff_metric='mattes', **options)
        shutil.copy(r['fwdtransforms'][0], chemin)
    return chemin


def matrice(transfos, inverses=None):
    """Partie linéaire (LPS) de la composition de transformations, dans l'ordre d'application aux points."""
    inverses = inverses or [False] * len(transfos)
    m = np.eye(3)
    for f, inv in zip(transfos, inverses):
        t = ants.read_transform(f)
        if inv:
            t = t.invert()
        m = np.column_stack([t.apply_to_vector(tuple(c)) for c in m.T])
    return m


def decrire(transfos, inverses=None):
    """Rotation (degrés) et déplacement du centre de la grille (mm) d'une composition de transformations."""
    m = matrice(transfos, inverses)
    angle = np.degrees(np.arccos(np.clip((np.trace(m) - 1) / 2, -1, 1)))
    p = (0.0, 0.0, 0.0)
    q = p
    for f, inv in zip(transfos, inverses or [False] * len(transfos)):
        t = ants.read_transform(f)
        q = (t.invert() if inv else t).apply_to_point(q)
    return round(float(angle), 2), round(float(np.linalg.norm(np.subtract(q, p))), 1)


def masque_tete(v, dilatation_mm=3.0, pas_mm=1.0):
    """Tête : signal > 12 % du 99e centile, plus grande composante, trous comblés, dilatée."""
    m = ndi.gaussian_filter(v, 1.0) > 0.12 * np.percentile(v[v > 0], 99)
    lab, n = ndi.label(m)
    if n:
        m = lab == (np.argmax(np.bincount(lab.ravel())[1:]) + 1)
    m = ndi.binary_closing(m, iterations=3)
    m = ndi.binary_fill_holes(m)
    return ndi.binary_dilation(m, iterations=max(1, int(round(dilatation_mm / pas_mm))))


def anti_repliement(img):
    """Lissage gaussien avant sous-échantillonnage à PAS mm (séquences plus fines que la grille)."""
    s = np.array(img.spacing)
    sigma = np.sqrt(np.maximum(PAS ** 2 - s ** 2, 0)) / 2.355 / s
    if not np.any(sigma > 0.05):
        return img
    return img.new_image_like(ndi.gaussian_filter(img.numpy(), sigma))


# ---------------------------------------------------------------------------
# 1–2. Référence : 3D T1 aligné CA-CP et grille de 0,7 mm
# ---------------------------------------------------------------------------
def reference():
    v, a = lire(P + 'T1w.nii.gz')
    t1 = vers_ants(v, a)
    t1n = en_cache('t1-n4', lambda: ants.n4_bias_field_correction(t1, mask=ants.get_mask(t1), shrink_factor=4))
    colin = ants.image_read(COLIN[0])
    t1_mni = recalage('t1-vers-mni', colin, t1n)
    # boîte englobant la tête dans l'espace MNI (canevas de 1 mm, x −125…125, y −150…140, z −130…130)
    canevas = vers_ants(np.zeros((251, 291, 261), np.float32), np.diag([1.0, 1, 1, 1]) @ _translation(-125, -150, -130))
    tete = t1n.new_image_like(masque_tete(t1n.numpy(), pas_mm=min(t1n.spacing)).astype(np.float32))
    tete_mni = ants.apply_transforms(canevas, tete, [t1_mni], interpolator='nearestNeighbor').numpy() > 0.5
    idx = np.argwhere(tete_mni)
    bas = idx.min(axis=0) + np.array([-125, -150, -130]) - 2
    haut = idx.max(axis=0) + np.array([-125, -150, -130]) + 2
    bas[2] = max(bas[2], Z_BAS)
    forme = np.ceil((haut - bas) / PAS).astype(int) + 1
    grille_affine = np.diag([PAS, PAS, PAS, 1.0]) @ np.eye(4)
    grille_affine[:3, 3] = bas
    grille = vers_ants(np.zeros(forme, np.float32), grille_affine)
    return t1, t1n, t1_mni, grille, grille_affine


def _translation(x, y, z):
    t = np.eye(4)
    t[:3, 3] = (x, y, z)
    return t


# ---------------------------------------------------------------------------
# 3. Recalages rigides sur le 3D T1
# ---------------------------------------------------------------------------
def recaler_sequences(t1n):
    """Chaque séquence : image corrigée (N4) et transformations (référence MNI → T1 → séquence)."""
    v, a = lire(P + 'T2w.nii.gz')
    t2 = vers_ants(v, a)
    t2n = en_cache('t2-n4', lambda: ants.n4_bias_field_correction(t2, mask=ants.get_mask(t2), shrink_factor=4))
    t2_t1 = recalage('t1-vers-t2', t1n, t2n)

    v, a = lire(P + 'acq-mag_veno.nii.gz')
    mag = vers_ants(v, a)
    magn = en_cache('swi-amplitude-n4', lambda: ants.n4_bias_field_correction(mag, mask=ants.get_mask(mag),
                                                                                 shrink_factor=6))
    # recalage sur une copie à 0,7 mm (plus rapide ; la transformation, en mm, vaut pour l'image entière)
    swi_t1 = recalage('t1-vers-swi', t1n, ants.resample_image(magn, (PAS, PAS, PAS), use_voxels=False, interp_type=0))

    v, a = lire(P + 'angio.nii.gz')
    tof = vers_ants(v, a)
    tofn = en_cache('tof-n4', lambda: ants.n4_bias_field_correction(tof, mask=ants.get_mask(tof), shrink_factor=6))
    # fixe = bloc du TOF (la métrique n'est calculée que dans le bloc), mobile = T1 ; départ : coordonnées des appareils
    t1_tof = recalage('tof-vers-t1', ants.resample_image(tofn, (0.6, 0.6, 0.6), use_voxels=False, interp_type=0),
                      t1n, initial_transform='Identity')
    return {'t2': (t2n, [t2_t1], [False]), 'swi': (magn, [swi_t1], [False]), 'tof': (tofn, [t1_tof], [True])}


# ---------------------------------------------------------------------------
# 4. SWI : image de susceptibilité et minIP
# ---------------------------------------------------------------------------
def calculer_swi(magn):
    """SWI = amplitude × masque de phase⁴ (Haacke 2004). Phase déroulée par la méthode laplacienne (Schofield et
    Zhu 2003), puis filtrée passe-haut dans la tête (phase moins sa moyenne locale, gaussienne de 4 mm) : pas
    d'anneaux de repliement près des sinus, contrairement au simple filtrage homodyne."""
    def calcul():
        phase, a = lire(P + 'acq-pha_veno.nii.gz')
        amp = magn.numpy()
        voxel = np.linalg.norm(a[:3, :3], axis=0)
        k2 = np.zeros(phase.shape, np.float32)
        g = np.ones(phase.shape, np.float32)
        for axe, (n, d) in enumerate(zip(phase.shape, voxel)):
            f = sfft.fftfreq(n, d).astype(np.float32).reshape([-1 if i == axe else 1 for i in range(3)])
            k2 += (2 * np.pi * f) ** 2                                   # −laplacien dans l'espace de Fourier
            g *= np.exp(-2 * (np.pi * 4.0 * f) ** 2)                     # gaussienne σ = 4 mm
        tf = lambda x: sfft.fftn(x, workers=4)
        itf = lambda x: sfft.ifftn(x, workers=4).real.astype(np.float32)
        s, c = np.sin(phase), np.cos(phase)
        del phase
        num = c * itf(-k2 * tf(s)) - s * itf(-k2 * tf(c))
        del s, c
        k2[0, 0, 0] = 1.0
        f_num = tf(num) / -k2
        f_num[0, 0, 0] = 0
        del num, k2
        deroulee = itf(f_num)
        del f_num
        tete = masque_tete(amp, dilatation_mm=0, pas_mm=float(voxel.min())).astype(np.float32)
        moyenne = itf(tf(deroulee * tete) * g) / np.maximum(itf(tf(tete) * g), 1e-3)
        hp = np.where(tete > 0, deroulee - moyenne, 0).astype(np.float32)
        del deroulee, moyenne, g
        # signe des veines : phase moyenne des voxels les plus sombres (1 %) d'un cube de 50 mm au centre du champ
        # (cerveau profond : veines et noyaux riches en fer, de même signe ; ni air ni os)
        r = np.round(25 / voxel).astype(int)
        c = np.array(amp.shape) // 2
        coeur = np.zeros(amp.shape, bool)
        coeur[c[0] - r[0]:c[0] + r[0], c[1] - r[1]:c[1] + r[1], c[2] - r[2]:c[2] + r[2]] = True
        coeur &= amp > 0
        sombres = coeur & (amp < np.percentile(amp[coeur], 1))
        signe = -1.0 if hp[sombres].mean() < 0 else 1.0
        masque = np.where(signe * hp > 0, np.clip(1 - signe * hp / np.pi, 0, 1), 1.0) ** 4
        print(f'SWI : phase veineuse {"négative" if signe < 0 else "positive"} '
              f'(moyenne {hp[sombres].mean():.2f} rad sur {int(sombres.sum())} voxels)')
        with open(os.path.join(CACHE, 'swi-signe.json'), 'w') as f:
            json.dump({'signe_phase_veineuse': signe, 'phase_moyenne': float(hp[sombres].mean()),
                       'voxels': int(sombres.sum())}, f)
        return magn.new_image_like((amp * masque).astype(np.float32))
    return en_cache('swi', calcul)


def minip(v, tete, epaisseur_mm=8.0):
    """minIP glissante dans le plan axial (épaisseur en mm), sans laisser entrer le fond."""
    grand = v.max() + 1
    w = np.where(tete, v, grand)
    m = ndi.minimum_filter1d(w, size=int(round(epaisseur_mm / PAS)) | 1, axis=2)
    return np.where(tete & (m < grand), m, 0).astype(np.float32)


# ---------------------------------------------------------------------------
# 5. Diffusion : correction du mouvement, tenseur, ADC, FA
# ---------------------------------------------------------------------------
def preparer_diffusion():
    chemin = os.path.join(CACHE, 'dti.npz')
    v, a = lire(P + 'dwi.nii.gz')
    if not os.path.exists(chemin):
        bval = np.loadtxt(os.path.join(SOURCES, P + 'dwi.bval'))
        bvec = np.loadtxt(os.path.join(SOURCES, P + 'dwi.bvec'))
        # vecteurs de gradient : axes des voxels (convention FSL ; déterminant négatif, pas d'inversion de x)
        # → monde RAS → LPS (repère des transformations ANTs)
        r = a[:3, :3] / np.linalg.norm(a[:3, :3], axis=0)
        if np.linalg.det(a[:3, :3]) > 0:
            bvec[0] *= -1
        g_lps = np.diag([-1, -1, 1]) @ r @ bvec
        b0 = vers_ants(v[..., 0], a)
        corriges, g_corr = [v[..., 0]], [g_lps[:, 0]]
        for i in range(1, v.shape[3]):
            mob = vers_ants(v[..., i], a)
            r_ = ants.registration(fixed=b0, moving=mob, type_of_transform='Affine', aff_metric='mattes')
            corriges.append(ants.apply_transforms(b0, mob, r_['fwdtransforms'], interpolator='linear').numpy())
            # la transformation envoie les points du b = 0 vers ce volume : gradient ramené dans le repère du b = 0
            m = matrice(r_['fwdtransforms'])
            u, _, vt = np.linalg.svd(m)
            g = np.linalg.inv(u @ vt) @ g_lps[:, i]
            g_corr.append(g / max(np.linalg.norm(g), 1e-9))
        np.savez_compressed(chemin, dwi=np.stack(corriges, axis=3).astype(np.float32), bval=bval,
                            g_lps=np.array(g_corr).T, affine=a)
    d = np.load(chemin)
    return d['dwi'], d['bval'], d['g_lps'], d['affine']


def tenseur(dwi, bval, g_lps):
    """Tenseur de diffusion (moindres carrés pondérés sur le logarithme du signal) dans le repère LPS du b = 0."""
    s = np.maximum(dwi, 1.0)
    tete = masque_tete(dwi[..., 0], dilatation_mm=0, pas_mm=2.0)
    y = np.log(s[tete])                                                       # (n, 33)
    gx, gy, gz = g_lps
    b = bval
    X = np.column_stack([-b * gx * gx, -b * gy * gy, -b * gz * gz, -2 * b * gx * gy, -2 * b * gx * gz,
                         -2 * b * gy * gz, np.ones_like(b)])                  # (33, 7)
    beta = np.linalg.lstsq(X, y.T, rcond=None)[0].T                          # moindres carrés ordinaires
    w = np.exp(beta @ X.T) ** 2                                               # poids = signal prédit²
    A = np.einsum('ni,ij,ik->njk', w, X, X)
    B = np.einsum('ni,ij,ni->nj', w, X, y)
    beta = np.linalg.solve(A + 1e-9 * np.eye(7), B[..., None])[..., 0]
    D = np.zeros((len(beta), 3, 3))
    for (i, j), k in zip(((0, 0), (1, 1), (2, 2), (0, 1), (0, 2), (1, 2)), range(6)):
        D[:, i, j] = D[:, j, i] = beta[:, k]
    val, vec = np.linalg.eigh(D)
    val = np.clip(val, 0, None)
    md = val.mean(axis=1)
    fa = np.sqrt(1.5 * ((val - md[:, None]) ** 2).sum(axis=1) / np.maximum((val ** 2).sum(axis=1), 1e-12))
    sortie = {k: np.zeros(dwi.shape[:3], np.float32) for k in ('adc', 'fa')}
    sortie['adc'][tete], sortie['fa'][tete] = md * 1e3, np.clip(fa, 0, 1)    # ADC en 10⁻³ mm²/s
    v1 = np.zeros(dwi.shape[:3] + (3,), np.float32)
    v1[tete] = vec[:, :, 2]                                                   # vecteur propre principal (LPS)
    sortie['v1'] = v1
    sortie['trace'] = np.where(tete, np.exp(np.log(s[..., bval > 0]).mean(axis=3)), 0).astype(np.float32)
    sortie['b0'] = np.where(tete, dwi[..., 0], 0).astype(np.float32)
    return sortie


# ---------------------------------------------------------------------------
# 6. Rééchantillonnage sur la grille de référence
# ---------------------------------------------------------------------------
def sur_grille(grille, image, transfos, inverses, interpolation='lanczosWindowedSinc'):
    return ants.apply_transforms(grille, anti_repliement(image), transfos, whichtoinvert=inverses,
                                 interpolator=interpolation).numpy()


def enregistrer(nom, v, affine):
    nib.save(nib.Nifti1Image(np.asarray(v, np.float32), affine), os.path.join(SORTIE, nom + '.nii.gz'))


# ---------------------------------------------------------------------------
# 7. Contrôles visuels
# ---------------------------------------------------------------------------
def niveaux_t1(t1, a):
    """Seuils LCS / tissu et substance grise / blanche du T1 (Otsu à 3 classes au centre du cerveau)."""
    i0, j0, k0 = np.round(np.linalg.solve(a, [0, -10, 15, 1])[:3]).astype(int)
    r = int(round(35 / PAS))
    bloc = t1[i0 - r:i0 + r, j0 - r:j0 + r, k0 - r:k0 + r]
    x = bloc[bloc > 0.05 * bloc.max()]
    h, bords = np.histogram(x, bins=128)
    c = (bords[:-1] + bords[1:]) / 2
    meilleur, seuils = -1, None
    for s1 in range(5, 120):
        for s2 in range(s1 + 3, 125):
            w = [h[:s1].sum(), h[s1:s2].sum(), h[s2:].sum()]
            if min(w) == 0:
                continue
            m = [(h[a_:b_] * c[a_:b_]).sum() / max(h[a_:b_].sum(), 1) for a_, b_ in ((0, s1), (s1, s2), (s2, 128))]
            var = sum(wi * (mi - x.mean()) ** 2 for wi, mi in zip(w, m))
            if var > meilleur:
                meilleur, seuils = var, (c[s1], c[s2])
    return seuils


def coupe(v, plan, k):
    """Coupe affichée en convention radiologique : droite du patient à gauche ; sagittal : avant à gauche."""
    s = {'axial': v[:, :, k], 'coronal': v[:, k, :], 'sagittal': v[k, :, :]}[plan]
    return np.rot90(s)[:, ::-1]


def planche_contours(nom, titre, v, t1l, seuils, a, plans, positions, fichier, fenetre=None):
    fig, axes = plt.subplots(len(plans), len(positions), figsize=(4.2 * len(positions), 4.4 * len(plans)), squeeze=False)
    bas, haut = fenetre or np.percentile(v[v > 0], [0.5, 99.5])
    for ligne, plan in zip(axes, plans):
        for ax, pos in zip(ligne, positions):
            axe = {'sagittal': 0, 'coronal': 1, 'axial': 2}[plan]
            k = int(round(np.linalg.solve(a, [pos if axe == 0 else 0, pos if axe == 1 else 0,
                                              pos if axe == 2 else 0, 1])[axe]))
            ax.imshow(coupe(v, plan, k), cmap='gray', vmin=bas, vmax=haut, interpolation='bilinear')
            c = coupe(t1l, plan, k)
            ax.contour(c, levels=[seuils[1]], colors=['#ffd400'], linewidths=0.55)
            ax.contour(c, levels=[seuils[0]], colors=['#3fc6ff'], linewidths=0.45)
            lettre = {'axial': 'z', 'coronal': 'y', 'sagittal': 'x'}[plan]
            ax.set_title(f'{titre} : {plan} {lettre} = {pos:+.0f} mm', fontsize=9)
            ax.axis('off')
    fig.tight_layout()
    chemin = os.path.join(SORTIE, fichier)
    fig.savefig(chemin, dpi=72)
    plt.close(fig)
    return chemin


def planche_reconstructions(volumes, a, point, fichier):
    """Même position anatomique (croix) sur chaque séquence, dans les trois plans."""
    i, j, k = np.round(np.linalg.solve(a, list(point) + [1])[:3]).astype(int)
    fig, axes = plt.subplots(len(volumes), 3, figsize=(12.5, 4.2 * len(volumes)), squeeze=False)
    for ligne, (titre, v, cmap, fen, plans, note) in zip(axes, volumes):
        for ax, plan in zip(ligne, ('axial', 'coronal', 'sagittal')):
            ax.axis('off')
            if plan not in plans:
                ax.text(0.5, 0.5, f'{titre}\n{note}', ha='center', va='center', fontsize=10)
                continue
            n = {'axial': k, 'coronal': j, 'sagittal': i}[plan]
            img = coupe(v, plan, n)
            ax.imshow(img, cmap=cmap, vmin=None if fen is None else fen[0], vmax=None if fen is None else fen[1],
                      interpolation='bilinear')
            # croix au point choisi (mêmes conversions que coupe())
            nx = v.shape[0]
            if plan == 'axial':
                cx, cy = nx - 1 - i, v.shape[1] - 1 - j
            elif plan == 'coronal':
                cx, cy = nx - 1 - i, v.shape[2] - 1 - k
            else:
                cx, cy = v.shape[1] - 1 - j, v.shape[2] - 1 - k
            ax.plot([cx], [cy], marker='+', color='#ffd400', markersize=14, mew=1.2)
            ax.set_title(f'{titre} : {plan}', fontsize=9)
    fig.tight_layout()
    chemin = os.path.join(SORTIE, fichier)
    fig.savefig(chemin, dpi=72)
    plt.close(fig)
    return chemin


# ---------------------------------------------------------------------------
def main():
    os.makedirs(CACHE, exist_ok=True)
    telecharger()
    t1, t1n, t1_mni, grille, ga = reference()
    rapport = {'grille': {'forme': list(grille.shape), 'voxel_mm': PAS, 'origine_mni_mm': ga[:3, 3].tolist()},
               'recalages': {}}
    rapport['recalages']['T1 → MNI (CA-CP)'] = dict(zip(('rotation_deg', 'deplacement_mm'), decrire([t1_mni])))

    print('T1…')
    t1g = sur_grille(grille, t1n, [t1_mni], [False])
    tete = masque_tete(t1g, pas_mm=PAS)
    enregistrer('t1', np.where(tete, t1g, 0), ga)
    t1l = ndi.gaussian_filter(t1g, 0.5)
    seuils = niveaux_t1(t1g, ga)
    rapport['contours_t1'] = {'lcs_tissu': float(seuils[0]), 'gris_blanc': float(seuils[1])}

    seq = recaler_sequences(t1n)
    volumes = {'t1': t1g}
    for code, (img, tr, inv) in seq.items():
        rapport['recalages'][f'{code.upper()} → T1'] = dict(zip(('rotation_deg', 'deplacement_mm'), decrire(tr, inv)))
        print(code, '…')
        volumes[code] = np.where(tete, sur_grille(grille, img, [t1_mni] + tr, [False] + inv), 0)
        enregistrer({'t2': 't2', 'swi': 'swi-amplitude', 'tof': 'tof'}[code], volumes[code], ga)

    print('SWI…')
    swi = calculer_swi(seq['swi'][0])
    with open(os.path.join(CACHE, 'swi-signe.json')) as f:
        rapport['swi'] = json.load(f)
    volumes['swi-calc'] = np.where(tete, sur_grille(grille, swi, [t1_mni] + seq['swi'][1], [False, False]), 0)
    enregistrer('swi', volumes['swi-calc'], ga)
    volumes['minip'] = minip(volumes['swi-calc'], tete)
    enregistrer('swi-minip-8mm', volumes['minip'], ga)

    print('diffusion…')
    dwi, bval, g_lps, da = preparer_diffusion()
    dti = tenseur(dwi, bval, g_lps)
    b0 = vers_ants(dti['b0'], da)
    t2n = seq['t2'][0]
    b0_t2 = recalage('t2-vers-b0', t2n, b0)
    chaine = [t1_mni, seq['t2'][1][0], b0_t2]
    rapport['recalages']['diffusion b0 → T2'] = dict(zip(('rotation_deg', 'deplacement_mm'), decrire([b0_t2])))
    for nom in ('b0', 'trace', 'adc', 'fa'):
        volumes['dwi-' + nom] = np.where(tete, sur_grille(grille, vers_ants(dti[nom], da), chaine, [False] * 3,
                                                          'linear'), 0)
        enregistrer('diffusion-' + nom, volumes['dwi-' + nom], ga)
    # FA couleur : vecteur propre tourné (rotation globale) du repère de la diffusion (LPS) vers celui de la grille
    # (RAS), couleur |v1| × FA calculée dans la grille de la diffusion, puis chaque canal rééchantillonné
    # (interpoler les vecteurs eux-mêmes mélangerait des signes opposés)
    q = matrice(chaine)                                  # directions de la grille → directions de la diffusion
    rot = np.diag([-1, -1, 1]) @ np.linalg.inv(q)
    rvb = np.abs(np.einsum('ij,xyzj->xyzi', rot, dti['v1'])) * dti['fa'][..., None]
    couleur = np.stack([np.where(tete, sur_grille(grille, vers_ants(rvb[..., c], da), chaine, [False] * 3, 'linear'), 0)
                        for c in range(3)], axis=3)
    nib.save(nib.Nifti1Image(couleur.astype(np.float32), ga), os.path.join(SORTIE, 'diffusion-fa-couleur.nii.gz'))

    print('contrôles…')
    images = []
    plans3 = ('axial', 'coronal', 'sagittal')
    pos3 = (-12, 6, 28)
    for code, titre in (('t2', 'T2'), ('swi', 'SWI amplitude'), ('swi-calc', 'SWI')):
        images.append(planche_contours(code, titre, volumes[code], t1l, seuils, ga, plans3, pos3,
                                       f'contours-{code}.png'))
    # TOF : positions dans son bloc
    kz = np.argwhere(volumes['tof'].max(axis=(0, 1)) > 0)[:, 0]
    zmin, zmax = ga[2, 3] + PAS * kz.min(), ga[2, 3] + PAS * kz.max()
    rapport['tof_hauteur_mni_mm'] = [round(float(zmin), 1), round(float(zmax), 1)]
    images.append(planche_contours('tof', 'TOF', volumes['tof'], t1l, seuils, ga, plans3,
                                   (round(zmin + 0.25 * (zmax - zmin)), round(zmin + 0.7 * (zmax - zmin))),
                                   'contours-tof.png'))
    images.append(planche_contours('dwi-b0', 'Diffusion b = 0', volumes['dwi-b0'], t1l, seuils, ga, ('axial',),
                                   (-20, -2, 14, 30), 'contours-diffusion-b0.png'))
    images.append(planche_contours('dwi-adc', 'ADC', volumes['dwi-adc'], t1l, seuils, ga, ('axial',),
                                   (-20, -2, 14, 30), 'contours-diffusion-adc.png', fenetre=(0, 3.2)))
    images.append(planche_reconstructions([
        ('3D T1', t1g, 'gray', np.percentile(t1g[tete], [0.5, 99.5]), plans3, ''),
        ('3D T2', volumes['t2'], 'gray', np.percentile(volumes['t2'][tete], [0.5, 99.5]), plans3, ''),
        ('SWI', volumes['swi-calc'], 'gray', np.percentile(volumes['swi-calc'][tete], [0.5, 99.5]), plans3, ''),
        ('SWI minIP 8 mm', volumes['minip'], 'gray', np.percentile(volumes['minip'][tete], [0.5, 99.5]), ('axial',),
         'minIP calculée\ndans le plan axial'),
        ('ARM TOF 7 T', volumes['tof'], 'gray', np.percentile(volumes['tof'][volumes['tof'] > 0], [0.5, 99.7]), plans3, ''),
        ('Diffusion b = 800', volumes['dwi-trace'], 'gray', np.percentile(volumes['dwi-trace'][tete], [0.5, 99.5]),
         ('axial',), 'séquence 2D :\naxial seulement'),
        ('ADC (10⁻³ mm²/s)', volumes['dwi-adc'], 'gray', (0, 3.2), ('axial',), 'séquence 2D :\naxial seulement'),
    ], ga, (-24, 2, 10), 'reconstructions-meme-position.png'))
    fig, axes = plt.subplots(1, 3, figsize=(13, 4.6))
    for ax, z in zip(axes, (-4, 14, 30)):
        k = int(round((z - ga[2, 3]) / PAS))
        ax.imshow(np.clip(np.rot90(couleur[:, :, k])[:, ::-1] * 1.6, 0, 1), interpolation='bilinear')
        ax.set_title(f'FA couleur : axial z = {z:+d} mm', fontsize=9)
        ax.axis('off')
    fig.tight_layout()
    images.append(os.path.join(SORTIE, 'diffusion-fa-couleur.png'))
    fig.savefig(images[-1], dpi=72)
    plt.close(fig)

    rapport['images'] = [os.path.relpath(i, RACINE) for i in images]
    rapport['sequences'] = SEQUENCES_RAPPORT
    rapport['volumes'] = sorted(f for f in os.listdir(SORTIE) if f.endswith('.nii.gz'))
    with open(os.path.join(SORTIE, 'rapport.json'), 'w', encoding='utf-8') as f:
        json.dump(rapport, f, ensure_ascii=False, indent=1)
    ecrire_rapport(rapport)
    print(open(os.path.join(SORTIE, 'rapport.md'), encoding='utf-8').read())


def ecrire_rapport(r):
    g = r['grille']
    l = ['# Étape 2 : préparation des séquences (studyforrest, sujet 01)', '',
         f"Grille de référence : {' × '.join(map(str, g['forme']))} voxels de {g['voxel_mm']} mm, alignée sur le plan "
         f"CA-CP (espace MNI), origine {g['origine_mni_mm']} mm.", '', '## Séquences', '',
         '| Séquence | Voxels d\'origine (mm) | Acquisition | Plans affichés |', '|---|---|---|---|']
    for s in r['sequences']:
        l.append(f"| {s['sequence']} | {' × '.join(map(str, s['voxel_natif_mm']))} | {s['acquisition']} | "
                 f"{', '.join(s['plans'])} |")
    l += ['', '## Recalages (rigides)', '']
    for nom, d in r['recalages'].items():
        l.append(f"- {nom} : rotation {d['rotation_deg']}°, déplacement {d['deplacement_mm']} mm")
    l += ['', f"SWI : phase des veines {'positive' if r['swi']['signe_phase_veineuse'] > 0 else 'négative'} "
          f"(moyenne {r['swi']['phase_moyenne']:.2f} rad sur {r['swi']['voxels']} voxels sombres).",
          f"TOF : bloc compris entre z = {r['tof_hauteur_mni_mm'][0]} et {r['tof_hauteur_mni_mm'][1]} mm (MNI).", '',
          '## Volumes', ''] + [f'- `{v}`' for v in r['volumes']] + ['', '## Images de contrôle', ''] + \
         [f'- `{i}`' for i in r['images']]
    with open(os.path.join(SORTIE, 'rapport.md'), 'w', encoding='utf-8') as f:
        f.write('\n'.join(l) + '\n')


SEQUENCES_RAPPORT = [
    {'sequence': '3D T1', 'voxel_natif_mm': [0.7, 0.667, 0.667], 'acquisition': '3D', 'plans': ['axial', 'coronal', 'sagittal']},
    {'sequence': '3D T2', 'voxel_natif_mm': [0.7, 0.667, 0.667], 'acquisition': '3D', 'plans': ['axial', 'coronal', 'sagittal']},
    {'sequence': 'SWI (amplitude, SWI calculée)', 'voxel_natif_mm': [0.43, 0.43, 0.35], 'acquisition': '3D',
     'plans': ['axial', 'coronal', 'sagittal']},
    {'sequence': 'SWI minIP (8 mm)', 'voxel_natif_mm': [0.43, 0.43, 0.35], 'acquisition': 'reconstruction axiale',
     'plans': ['axial']},
    {'sequence': 'ARM TOF 7 T', 'voxel_natif_mm': [0.3, 0.3, 0.3], 'acquisition': '3D (bloc axial de 49 mm)',
     'plans': ['axial', 'coronal', 'sagittal']},
    {'sequence': 'Diffusion (b = 800, ADC, FA)', 'voxel_natif_mm': [1.7, 1.7, 2.0], 'acquisition': '2D (coupes axiales)',
     'plans': ['axial']},
]


if __name__ == '__main__':
    main()
