"""Espace radioanatomie : prépare les données du module « Territoires artériels du cerveau ».

Sources (téléchargées à version figée dans assets-sources/radioanatomie/, ignoré par git) :
  • IRM T1 « Colin 27 Average Brain » (27 acquisitions d'un même sujet, 1 mm, espace MNI)
    TemplateFlow, tpl-MNIColin27 ; © 1993–2009 Louis Collins, McConnell Brain Imaging Centre,
    Montreal Neurological Institute, McGill University (diffusion libre avec cette mention).
  • « Digital 3D Brain MRI Arterial Territories Atlas » (Liu C-F, Hsu J, Xu X et al.,
    Scientific Data 2023, doi:10.1038/s41597-022-01923-0), © 2021 The Johns Hopkins University,
    CC BY-SA 4.0 (dépôt GitHub Chin-Fu-Liu/Arterial_Atlas, commit figé).

Traitement :
  1. l'atlas (181×217×181, stocké gauche → droite inversé) est remis dans l'orientation de Colin 27
     (RAS, même grille de 1 mm, origine (−90, −126, −72) mm) ;
  2. masque du cerveau de Colin 27 (tissu > LCS, limité à l'atlas dilaté, fermeture pour garder
     le LCS des sillons) ; chaque voxel du masque prend le territoire le plus proche : les
     territoires suivent ainsi exactement le contour de ce cerveau ;
  3. ventricules et citernes profondes (LCS de Colin 27) : non colorés ;
  4. export : IRM en octets (0–255) et carte des territoires (octets), compressées (gzip), x le plus
     rapide puis y puis z, + manifest.json (grille, noms français, couleurs, regroupements) et licences.

Usage : python3 -I scripts/radioanatomie/preparer_territoires.py   (depuis la racine du dépôt)
Dépendances : numpy, scipy, nibabel.
"""
import gzip, hashlib, json, os, shutil, sys, urllib.request

import nibabel as nib
import numpy as np
from scipy import ndimage as ndi

RACINE = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SOURCES = os.path.join(RACINE, 'assets-sources', 'radioanatomie')
SORTIE = os.path.join(RACINE, 'radioanatomie', 'donnees', 'territoires-arteriels')

COMMIT_ATLAS = 'fbeb3fe70b6fb8185244d02f9c6b6e07c13235e0'
GITHUB = f'https://raw.githubusercontent.com/Chin-Fu-Liu/Arterial_Atlas/{COMMIT_ATLAS}/'
S3 = 'https://templateflow.s3.amazonaws.com/tpl-MNIColin27/'
FICHIERS = {
    'tpl-MNIColin27_T1w.nii.gz': (S3 + 'tpl-MNIColin27_T1w.nii.gz?versionId=nHRiNs2oMbAJ09gNA27a4VNopI1r4.cZ',
                                  '811416b120cca98d28762a5ca3fd9ecbed6c02c1bf0bac8b0ff037518089da3b'),
    'colin27-LICENSE': (S3 + 'LICENSE?versionId=EnmRswrBcbNiK0tIpJxJrpWcyvkZSpKA',
                        '3f9cccbb17f9adc793f933160b44e6a14849be4956fa237ea71d0145bdbf86b8'),
    'ArterialAtlas.nii': (GITHUB + 'data/Atlas/ArterialAtlas.nii', '78ecdefd9e25e6831e24d2a0e703c984914308f5a9f1efb529bf3f7f5c4012de'),
    'atlas-LICENSE': (GITHUB + 'LICENSE', '7abe19ec9bb73b36141b999b861d24ad855e808bafe0f81e84cce28556f6c297'),
    'ArterialAtlasLables.txt': (GITHUB + 'data/ArterialAtlasLables.txt', '0665c99177c6dbe83ca4d6658a11a5cd428f7edb6544628c5dbecc3a34fe7233'),
}

# ---------------------------------------------------------------------------
# Territoires : identifiant de l'atlas (impair = gauche, pair = droit) → nom français
# Les numéros 31–32 (ventricules latéraux) ne sont pas des territoires.
# ---------------------------------------------------------------------------
GROUPES = {
    'ACA': {'nom': 'Artère cérébrale antérieure (ACA)', 'court': 'ACA', 'couleur': '#3fbf52'},
    'ACM': {'nom': 'Artère cérébrale moyenne (ACM)', 'court': 'ACM', 'couleur': '#ea5a3d'},
    'ACP': {'nom': 'Artère cérébrale postérieure (ACP)', 'court': 'ACP', 'couleur': '#3f86e0'},
    'VB': {'nom': 'Système vertébro-basilaire', 'court': 'Vertébro-basilaire', 'couleur': '#e8c13a'},
}
TERRITOIRES = [
    # (id gauche, code, groupe, nom, nom court (étiquettes), couleur, précision) ; l'ordre est celui de la légende
    (1, 'ACA', 'ACA', "Territoire superficiel de l'ACA", "ACA (superficiel)", '#3fbf52', ''),
    (3, 'LSM', 'ACA', "Lenticulo-striées médiales (ACA)", "Lenticulo-striées médiales", '#2ec4c4',
     "Territoire peu exposé aux infarctus : l'atlas le définit sur la topographie du corps calleux et de la région septale."),
    (7, 'ACM', 'ACM', "Territoire superficiel de l'ACM", "ACM (superficiel)", '#ea5a3d', ''),
    (5, 'LSL', 'ACM', "Territoire profond de l'ACM", "ACM (profond)", '#d6336c',
     "Artères lenticulo-striées latérales, branches perforantes de l'ACM : noyaux gris centraux et capsule interne."),
    (17, 'ACP', 'ACP', "Territoire superficiel de l'ACP", "ACP (superficiel)", '#3f86e0', ''),
    (21, 'THP', 'ACP', "Thalamo-perforantes et choroïdiennes postérieures (ACP)", "Thalamo-perforantes postérieures", '#9a5cf0', "Thalamus."),
    (23, 'THA', 'ACP', "Choroïdienne antérieure et thalamo-perforantes antérieures", "Choroïdienne antérieure", '#c84fe0',
     "Territoire peu exposé aux infarctus : l'atlas le définit sur la région temporale mésiale et l'hippocampe, et le rattache à l'ACP."),
    (25, 'BAS', 'VB', "Branches de l'artère basilaire (tronc cérébral)", "Basilaire (tronc cérébral)", '#e9d84a', ''),
    (27, 'ACS', 'VB', "Artère cérébelleuse supérieure", "Cérébelleuse supérieure", '#e0a92f', ''),
    (29, 'ACI', 'VB', "Artères cérébelleuses inférieures (antéro-inférieure et postéro-inférieure)", "Cérébelleuses inférieures", '#e98ac5',
     "L'atlas réunit les territoires des artères cérébelleuses antéro-inférieure (AICA) et postéro-inférieure (PICA)."),
]
VENTRICULE = 31          # identifiant exporté pour le LCS profond (non coloré)
# Segmentation vasculaire seule : les secteurs lobaires de l'atlas (ACM frontal, pariétal, temporal, occipital,
# insulaire ; ACP temporal, occipital) sont réunis en un territoire superficiel par artère (les lobes feront l'objet
# d'une segmentation à part). Identifiant d'origine → identifiant exporté (même parité : impair = gauche).
FUSION = {**{i: 7 + (i + 1) % 2 for i in range(7, 17)}, **{i: 17 + (i + 1) % 2 for i in range(17, 21)}}


def telecharger():
    os.makedirs(SOURCES, exist_ok=True)
    for nom, (url, empreinte) in FICHIERS.items():
        chemin = os.path.join(SOURCES, nom)
        if not os.path.exists(chemin):
            print('téléchargement :', url)
            with urllib.request.urlopen(url) as r, open(chemin + '.tmp', 'wb') as f:
                shutil.copyfileobj(r, f)
            os.replace(chemin + '.tmp', chemin)
        h = hashlib.sha256(open(chemin, 'rb').read()).hexdigest()
        if h != empreinte:
            sys.exit(f'empreinte inattendue pour {nom} : {h}')


def boule(r):
    z, y, x = np.ogrid[-r:r + 1, -r:r + 1, -r:r + 1]
    return x * x + y * y + z * z <= r * r


def preparer():
    t1 = nib.load(os.path.join(SOURCES, 'tpl-MNIColin27_T1w.nii.gz'))
    atlas = nib.load(os.path.join(SOURCES, 'ArterialAtlas.nii'))
    assert t1.shape == (181, 217, 181) and atlas.shape[:3] == (181, 217, 181)
    assert np.allclose(t1.affine, [[1, 0, 0, -90], [0, 1, 0, -126], [0, 0, 1, -72], [0, 0, 0, 1]])
    c = t1.get_fdata(dtype=np.float32)
    # L'atlas est stocké avec x inversé (gauche ↔ droite) et sans origine : même grille que Colin 27
    a = np.asarray(atlas.dataobj)[..., 0].astype(np.int16)[::-1].copy()
    # Contrôle d'orientation : territoire 1 (ACA gauche) à gauche (x < 0), 2 (ACA droite) à droite
    xs = {l: np.argwhere(a == l)[:, 0].mean() - 90 for l in (1, 2, 7, 8, 17, 18)}
    assert xs[1] < 0 < xs[2] and xs[7] < 0 < xs[8] and xs[17] < 0 < xs[18], xs

    # Intensités : substance blanche ≈ 180 / 255, graisse du scalp saturée
    territoires_atlas = (a >= 1) & (a <= 30)
    blanche = np.percentile(c[territoires_atlas], 90)
    haut = blanche / 0.71
    t1u8 = np.clip(np.rint(c / haut * 255), 0, 255).astype(np.uint8)
    # Fond hors de la tête : bruit mis à zéro (noir franc à l'écran, fichier plus léger)
    tete = t1u8 > 45                                  # scalp, graisse, cerveau (le fond reste sous ce seuil)
    etiq, n = ndi.label(tete)
    tete = etiq == (np.argmax(np.bincount(etiq.ravel())[1:]) + 1)
    tete = ndi.binary_closing(tete, boule(3))
    for axe in range(3):                              # comble l'os cortical et les sinus, dans les trois plans
        for i in range(tete.shape[axe]):
            sl = [slice(None)] * 3; sl[axe] = i
            tete[tuple(sl)] = ndi.binary_fill_holes(tete[tuple(sl)])
    tete = ndi.binary_dilation(tete, boule(2))
    t1u8[~tete] = 0

    # Masque du cerveau de Colin 27
    tn = c / haut
    lcs, gris = np.percentile(tn[np.isin(a, (31, 32))], 30), np.percentile(tn[territoires_atlas], 40)
    seuil = (lcs + gris) / 2
    region = ndi.binary_dilation(a > 0, boule(3))
    # Tissu cérébral : entre le LCS et la substance blanche (la graisse et la moelle osseuse, plus claires, sont exclues)
    tissu = (tn > seuil) & (tn < np.percentile(tn[territoires_atlas], 99.5) * 1.08) & region
    # Ouverture : détache la muqueuse ethmoïdale et les tissus orbitaires, reliés au cerveau par de fins ponts
    tissu = ndi.binary_opening(tissu, boule(2))
    etiq, n = ndi.label(tissu)
    tissu = etiq == (np.argmax(np.bincount(etiq.ravel())[1:]) + 1)
    tissu = ndi.binary_dilation(tissu, boule(1)) & (tn > seuil) & region
    masque = ndi.binary_closing(tissu, boule(2))
    masque = ndi.binary_fill_holes(masque)
    for k in range(masque.shape[2]):
        coupe = ndi.binary_fill_holes(masque[:, :, k])
        # îlots de moins de 25 mm² dans la coupe axiale (muqueuse, vaisseaux) : retirés
        etiq, n = ndi.label(coupe)
        if n:
            tailles = np.bincount(etiq.ravel())
            coupe &= (tailles >= 25)[etiq] | (etiq == 0)
            coupe &= etiq > 0
        masque[:, :, k] = coupe

    for avant, apres in FUSION.items():
        a[a == avant] = apres
    # Territoire le plus proche pour chaque voxel du masque
    _, (ix, iy, iz) = ndi.distance_transform_edt(~territoires_atlas, return_indices=True)
    carte = np.where(masque, a[ix, iy, iz], 0).astype(np.uint8)
    # LCS profond (ventricules, 3e ventricule, citernes de la base) : non coloré
    profondeur = ndi.distance_transform_edt(masque)
    sombre = (tn < seuil) & masque
    # ventricules latéraux (atlas, élargi de 3 mm) ; 3e et 4e ventricules et citernes : LCS profond près de la ligne médiane
    x_mm = np.abs(np.arange(181) - 90)[:, None, None]
    ventricules = sombre & (ndi.binary_dilation(np.isin(a, (31, 32)), boule(3)) | ((profondeur > 10) & (x_mm < 10)))
    carte[ventricules] = VENTRICULE

    # Territoire basilaire limité au tronc cérébral : l'atlas l'étend aux pédoncules cérébelleux moyens et
    # au cervelet, en arrière du plancher du 4e ventricule. Ces voxels reviennent à la cérébelleuse la plus proche.
    x_mm = np.arange(181) - 90
    y_mm = np.arange(217) - 126
    v4 = (carte == VENTRICULE) & (np.abs(x_mm)[:, None, None] < 12) & (y_mm[None, :, None] < -25) & ((np.arange(181) - 72)[None, None, :] < -10)
    plancher = np.full(181, np.nan)
    for k in range(181):
        ys = np.nonzero(v4[:, :, k].any(axis=0))[0]
        if len(ys):
            plancher[k] = y_mm[ys.max()]
    ks = np.nonzero(~np.isnan(plancher))[0]
    plancher = np.interp(np.arange(181), ks, plancher[ks], left=-np.inf, right=-np.inf)   # hors du 4e ventricule : pas de limite
    plancher = ndi.median_filter(np.where(np.isfinite(plancher), plancher, -999), size=5)
    basilaire = np.isin(carte, (25, 26))
    # limite postérieure : plancher du 4e ventricule sur la ligne médiane, qui s'incurve vers l'avant en dehors
    # (jonction pont / pédoncule cérébelleux moyen) ; largeur au plus 20 mm de chaque côté
    rx = np.minimum(np.abs(x_mm) / 20.0, 1.0)[:, None, None]
    limite = plancher[None, None, :] + 9 * rx ** 2
    hors_tronc = basilaire & ((y_mm[None, :, None] < limite) | (np.abs(x_mm)[:, None, None] > 20))
    cerebelleuses = np.isin(carte, (27, 28, 29, 30))
    _, (jx, jy, jz) = ndi.distance_transform_edt(~cerebelleuses, return_indices=True)
    carte[hors_tronc] = carte[jx, jy, jz][hors_tronc]
    return t1u8, carte, {'seuil_lcs': float(seuil), 'haut': float(haut), 'basilaire_reattribue': int(hors_tronc.sum())}


def exporter(t1u8, carte):
    os.makedirs(SORTIE, exist_ok=True)
    def ecrire(nom, vol):
        brut = np.ascontiguousarray(vol.transpose(2, 1, 0)).tobytes()   # x le plus rapide, puis y, puis z
        with open(os.path.join(SORTIE, nom), 'wb') as f:
            f.write(gzip.compress(brut, compresslevel=9, mtime=0))
        return hashlib.sha256(brut).hexdigest()
    empreintes = {'irm': ecrire('irm-t1.u8.gz', t1u8), 'territoires': ecrire('territoires.u8.gz', carte)}
    presents = set(np.unique(carte).tolist())
    territoires = []
    for gauche, code, groupe, nom, court, couleur, precision in TERRITOIRES:
        for ident, cote in ((gauche, 'G'), (gauche + 1, 'D')):
            assert ident in presents, ident
            territoires.append({'id': ident, 'code': code, 'cote': cote, 'groupe': groupe, 'nom': nom, 'court': court,
                                'couleur': couleur, 'precision': precision})
    manifest = {
        'titre': 'Territoires artériels du cerveau',
        'sequence': 'IRM T1 (Colin 27, 27 acquisitions moyennées d\'un même sujet)',
        'dimensions': [181, 217, 181],
        'espacement_mm': [1, 1, 1],
        'origine_mm': [-90, -126, -72],
        'orientation': 'RAS (x vers la droite du patient, y vers l\'avant, z vers le haut) ; x varie le plus vite, puis y, puis z',
        'fichiers': {'irm': 'irm-t1.u8.gz', 'territoires': 'territoires.u8.gz'},
        'empreintes_sha256_decompresse': empreintes,
        'fenetres': [
            {'nom': 'Standard', 'largeur': 255, 'niveau': 128},
            {'nom': 'Cerveau (substance grise / blanche)', 'largeur': 150, 'niveau': 140},
            {'nom': 'Large', 'largeur': 400, 'niveau': 160},
        ],
        'groupes': GROUPES,
        'territoires': territoires,
        'non_colores': [{'id': VENTRICULE, 'nom': 'Ventricules et citernes (LCS)'}],
        'credits': {
            'irm': "Colin 27 Average Brain (Holmes CJ et al., J Comput Assist Tomogr 1998). Copyright (C) 1993–2009 Louis Collins, "
                   "McConnell Brain Imaging Centre, Montreal Neurological Institute, McGill University. Distribué via TemplateFlow.",
            'atlas': "Digital 3D Brain MRI Arterial Territories Atlas (Liu C-F, Hsu J, Xu X et al., Scientific Data 2023, "
                     "doi:10.1038/s41597-022-01923-0), © 2021 The Johns Hopkins University, licence CC BY-SA 4.0. "
                     "Adapté par RadiologicHub : remis sur la grille de Colin 27, territoires étendus au contour de ce cerveau, "
                     "LCS profond retiré, noms traduits ; la carte dérivée est diffusée sous la même licence.",
        },
    }
    with open(os.path.join(SORTIE, 'manifest.json'), 'w', encoding='utf-8') as f:
        json.dump(manifest, f, ensure_ascii=False, indent=1)
        f.write('\n')
    shutil.copyfile(os.path.join(SOURCES, 'atlas-LICENSE'), os.path.join(SORTIE, 'LICENSE-atlas-CC-BY-SA-4.0.txt'))
    shutil.copyfile(os.path.join(SOURCES, 'colin27-LICENSE'), os.path.join(SORTIE, 'LICENSE-colin27.txt'))
    return manifest


if __name__ == '__main__':
    telecharger()
    t1u8, carte, info = preparer()
    m = exporter(t1u8, carte)
    tailles = {f: os.path.getsize(os.path.join(SORTIE, f)) for f in sorted(os.listdir(SORTIE))}
    print('écrit :', SORTIE, tailles, info)
