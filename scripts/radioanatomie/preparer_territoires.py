"""Espace radioanatomie : prépare les données du module « Territoires artériels du cerveau ».

Sources (téléchargées à version figée dans assets-sources/radioanatomie/, ignoré par git) :
  • IRM T1, T2 et FLAIR 3D d'un volontaire sain : « Individual Brain Charting » (IBC), sujet 01, séance 00
    (Pinho AL et al., Scientific Data 2018 ; OpenNeuro ds002685, CC0) ; les images affichées sur le site ;
  • IRM T1 « Colin 27 Average Brain » (27 acquisitions d'un même sujet, 1 mm, espace MNI)
    TemplateFlow, tpl-MNIColin27 ; © 1993–2009 Louis Collins, McConnell Brain Imaging Centre,
    Montreal Neurological Institute, McGill University (diffusion libre avec cette mention) ; sert de
    support à l'atlas, puis de relais pour transporter la carte sur le sujet IBC ;
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
  3 bis. recalages d'après les coupes de référence de l'auteur : basilaire limité au tronc cérébral,
     territoires profonds sur l'anatomie de Colin 27 (noyau lenticulaire, tête du caudé, corps calleux),
     ACP superficielle absente au-dessus des ventricules latéraux ; petits îlots rattachés au voisin ;
  4. sujet IBC : T2 et FLAIR recalés sur le T1 (rigide), T1 recalé sur Colin 27 (affine), les trois
     rééchantillonnés sur la grille MNI de 1 mm ; Colin 27 recalé sur le T1 du sujet (SyN, non linéaire)
     pour y transporter la carte ; masque du cerveau et LCS du sujet (T1 + T2), territoire le plus proche ;
  5. zones jonctionnelles (calque à part) : corticale = bande de 7 mm à cheval sur la limite de deux
     territoires superficiels ; profonde = substance blanche de 5 à 12 mm en dehors du corps du
     ventricule latéral, entre territoires profond et superficiel de l'ACM ;
  6. export : T1, T2, FLAIR en octets (0–255), carte des territoires et calque jonctionnel (octets),
     compressés (gzip), x le plus rapide puis y puis z, + manifest.json et licences.

Usage : python3 -I scripts/radioanatomie/preparer_territoires.py   (depuis la racine du dépôt)
Dépendances : numpy, scipy, nibabel, antspyx (recalages ; mis en cache dans assets-sources/radioanatomie/cache,
à effacer pour tout recalculer).
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
OPENNEURO = 'https://s3.amazonaws.com/openneuro.org/ds002685/sub-01/ses-00/anat/'
FICHIERS = {
    'tpl-MNIColin27_T1w.nii.gz': (S3 + 'tpl-MNIColin27_T1w.nii.gz?versionId=nHRiNs2oMbAJ09gNA27a4VNopI1r4.cZ',
                                  '811416b120cca98d28762a5ca3fd9ecbed6c02c1bf0bac8b0ff037518089da3b'),
    'colin27-LICENSE': (S3 + 'LICENSE?versionId=EnmRswrBcbNiK0tIpJxJrpWcyvkZSpKA',
                        '3f9cccbb17f9adc793f933160b44e6a14849be4956fa237ea71d0145bdbf86b8'),
    'ArterialAtlas.nii': (GITHUB + 'data/Atlas/ArterialAtlas.nii', '78ecdefd9e25e6831e24d2a0e703c984914308f5a9f1efb529bf3f7f5c4012de'),
    'atlas-LICENSE': (GITHUB + 'LICENSE', '7abe19ec9bb73b36141b999b861d24ad855e808bafe0f81e84cce28556f6c297'),
    'ArterialAtlasLables.txt': (GITHUB + 'data/ArterialAtlasLables.txt', '0665c99177c6dbe83ca4d6658a11a5cd428f7edb6544628c5dbecc3a34fe7233'),
    'ibc/sub-01_ses-00_T1w.nii.gz': (OPENNEURO + 'sub-01_ses-00_T1w.nii.gz?versionId=_4I20aD_6CMiEyrkb7BuHD47NRw09u8B',
                                     '05128c4e993b8c1e16acda7b40fd3518d4752665d3d05a5bc4cf198d715a8c4a'),
    'ibc/sub-01_ses-00_acq-spc_T2w.nii.gz': (OPENNEURO + 'sub-01_ses-00_acq-spc_T2w.nii.gz?versionId=Weju_adscc3DB2_S2oYgSsm7ug7aAcum',
                                             '5b33b2328066bf0531448f9b5870e34080c84513e8f0da971a855f536756a320'),
    'ibc/sub-01_ses-00_FLAIR.nii.gz': (OPENNEURO + 'sub-01_ses-00_FLAIR.nii.gz?versionId=CTSv1OmRhxarHSKYNpa1bc6.iie0qGJB',
                                       '062ee0a7a1364d4ff32a5677b77e05909e232c1bd81154b57e2919c2819be1af'),
}
SUJET = 'ibc/sub-01_ses-00_'
CACHE = os.path.join(SOURCES, 'cache')

# ---------------------------------------------------------------------------
# Territoires : identifiant de l'atlas (impair = gauche, pair = droit) → nom français
# Les numéros 31–32 (ventricules latéraux) ne sont pas des territoires.
# ---------------------------------------------------------------------------
GROUPES = {
    'ACA': {'nom': 'Artère cérébrale antérieure (ACA)', 'court': 'ACA', 'couleur': '#3fbf52'},
    'ACM': {'nom': 'Artère cérébrale moyenne (ACM)', 'court': 'ACM', 'couleur': '#ea5a3d'},
    'ChA': {'nom': 'Artère choroïdienne antérieure (carotide interne)', 'court': 'Choroïdienne antérieure', 'couleur': '#9a5cf0'},
    'ACP': {'nom': 'Artère cérébrale postérieure (ACP)', 'court': 'ACP', 'couleur': '#3f86e0'},
    'VB': {'nom': 'Système vertébro-basilaire', 'court': 'Vertébro-basilaire', 'couleur': '#e8c13a'},
}
TERRITOIRES = [
    # (id gauche, code, groupe, nom, nom court (étiquettes), couleur, précision) ; l'ordre est celui de la légende
    (1, 'ACA', 'ACA', "Territoire superficiel de l'ACA", "ACA (superficiel)", '#3fbf52',
     "Branches corticales : face médiale des lobes frontal et pariétal, bord supérieur de la convexité, corps calleux."),
    (3, 'LSM', 'ACA', "Lenticulo-striées médiales et artère de Heubner (ACA)", "Lenticulo-striées médiales", '#2ec4c4',
     "Artère récurrente de Heubner et lenticulo-striées médiales : tête du noyau caudé et partie antérieure de la capsule interne."),
    (7, 'ACM', 'ACM', "Territoire superficiel de l'ACM", "ACM (superficiel)", '#ea5a3d',
     "Branches corticales : convexité des lobes frontal, pariétal et temporal, insula."),
    (5, 'LSL', 'ACM', "Territoire profond de l'ACM", "ACM (profond)", '#d6336c',
     "Artères lenticulo-striées latérales, branches perforantes de l'ACM : noyau lenticulaire (putamen et pallidum) et, "
     "au-dessus, couronne rayonnante le long du ventricule latéral."),
    (23, 'ChA', 'ChA', "Territoire de l'artère choroïdienne antérieure", "Choroïdienne antérieure", '#9a5cf0',
     "Branche de la carotide interne : bras postérieur de la capsule interne, uncus, amygdale et tête de l'hippocampe."),
    (17, 'ACP', 'ACP', "Territoire de l'ACP", "ACP", '#3f86e0',
     "Branches corticales (lobe occipital, faces inférieure et médiale du lobe temporal) et perforantes (thalamus, "
     "mésencéphale). Absent au-dessus des ventricules latéraux : il apparaît au pôle occipital au niveau du corps des "
     "ventricules et s'étend vers l'avant en descendant."),
    (25, 'BAS', 'VB', "Territoire des branches de l'artère basilaire", "Basilaire (pont)", '#e9d84a', "Pont (protubérance)."),
    (27, 'ACS', 'VB', "Territoire de l'artère cérébelleuse supérieure", "Cérébelleuse supérieure", '#e0a92f',
     "Face supérieure du cervelet et vermis supérieur."),
    (33, 'AICA', 'VB', "Territoire de l'artère cérébelleuse antéro-inférieure (AICA)", "AICA", '#c3d65f',
     "Face antérieure (pétreuse) de l'hémisphère cérébelleux, flocculus, pédoncule cérébelleux moyen."),
    (29, 'PICA', 'VB', "Territoire de l'artère cérébelleuse postéro-inférieure (PICA)", "PICA", '#e98ac5',
     "Face inférieure (sous-occipitale) de l'hémisphère cérébelleux, vermis inférieur, partie postérieure du bulbe."),
    (35, 'VERT', 'VB', "Territoire des branches de l'artère vertébrale et de l'artère spinale antérieure",
     "Vertébrale et spinale antérieure", '#d63fb4', "Bulbe (moelle allongée) : partie antérieure et médiane."),
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
        os.makedirs(os.path.dirname(chemin), exist_ok=True)
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
    info = {'seuil_lcs': float(seuil), 'haut': float(haut), 'basilaire_reattribue': int(hors_tronc.sum())}
    info.update(recaler_territoires_profonds(carte, c, a, haut))
    info['acp_retiree'] = limiter_acp(carte)
    info.update(reprendre_reference(carte, c, haut))
    info['ilots_rattaches'] = rattacher_ilots(carte)
    return t1u8, carte, masque, info


def grilles():
    """Coordonnées en mm (x, y, z) diffusables sur la grille 181 × 217 × 181."""
    return ((np.arange(181) - 90)[:, None, None], (np.arange(217) - 126)[None, :, None],
            (np.arange(181) - 72)[None, None, :])


def recaler_territoires_profonds(carte, c, a, haut):
    """Territoires profonds recalés sur l'anatomie de Colin 27 (coupes de référence de l'auteur).

    L'atlas donne aux lenticulo-striées latérales tout le bloc noyaux gris + capsule interne + couronne
    rayonnante, et aux lenticulo-striées médiales le corps calleux et la région septale. Ici :
      • territoire profond de l'ACM = noyau lenticulaire (putamen, pallidum) et, au-dessus du putamen, une
        bande de 6 mm le long du ventricule latéral ; ce qui est en dehors du putamen (capsule externe,
        claustrum) et le reste de la couronne rayonnante reviennent au territoire superficiel de l'ACM ;
      • tête du noyau caudé et partie médiale du bras antérieur de la capsule interne (en dedans de la crête
        de substance blanche qui sépare caudé et putamen, en avant du genou) : lenticulo-striées médiales
        et artère de Heubner ;
      • corps calleux et région septale (lenticulo-striées médiales de l'atlas) : territoire superficiel de l'ACA.
    """
    X, Y, Z = grilles()
    AX = np.abs(X)
    tl = ndi.gaussian_filter(c / haut, 0.7)
    # ventricules latéraux : LCS de Colin 27 autour de l'étiquette de l'atlas (composante principale)
    etiq, _ = ndi.label((c / haut < 0.36) & ndi.binary_dilation(np.isin(a, (31, 32)), iterations=3))
    tailles = np.bincount(etiq.ravel()); tailles[0] = 0
    vl = etiq == np.argmax(tailles)
    dvl = ndi.distance_transform_edt(~vl)
    lsm_atlas = np.where(np.isin(carte, (3, 4)), carte, 0)        # avant recalage (ligne médiane comprise)
    info = {}
    for lsa_id, lsm_id, acm_id, aca_id, cote in ((5, 3, 7, 1, X < 0), (6, 4, 8, 2, X > 0)):
        lsa = carte == lsa_id
        # crête du bras antérieur de la capsule interne : |x| du voxel le plus clair de chaque ligne (y, z)
        ix = np.argmax(np.where(lsa, tl, -np.inf), axis=0)
        ok = (lsa.sum(axis=0) >= 4) & (Y[0] > -6)
        crete = np.where(ok, np.abs(ix - 90), 0).astype(float)
        crete = ndi.gaussian_filter(crete, 2) / np.maximum(ndi.gaussian_filter(ok.astype(float), 2), 1e-6)
        # en dedans de la crête ; limite postérieure oblique (genou de la capsule interne en dehors, trou de
        # Monro en dedans), puis contour adouci
        caude = lsa & ok[None] & (AX < crete[None]) & (Y > 4 - 0.8 * (crete[None] - AX)) & (Z <= 22)
        caude = lsa & (ndi.gaussian_filter(caude.astype(np.float32), 1.2) > 0.5) & (AX < crete[None] + 1) & ok[None]
        # putamen : substance grise profonde en dehors de la crête, loin du ventricule (composante principale)
        gris = (tl > 0.40) & (tl < 0.645) & ndi.binary_dilation(lsa, iterations=2) & ~caude & (dvl > 4) & cote
        etiq, _ = ndi.label(gris)
        recouvre = np.bincount(etiq.ravel(), weights=lsa.ravel().astype(float)); recouvre[0] = 0
        putamen = ndi.binary_closing(etiq == np.argmax(recouvre), iterations=2)
        bord = np.where(putamen.any(axis=0), np.max(np.where(putamen, AX, 0), axis=0), 999)
        z_haut = int(np.nonzero(putamen.any(axis=(0, 1)))[0].max()) - 72
        dehors = lsa & (AX > bord[None] + 1)
        couronne = lsa & (Z > z_haut) & (dvl > 6)
        carte[caude] = lsm_id
        carte[(dehors | couronne) & ~caude] = acm_id
        # lenticulo-striées médiales de l'atlas : seule la partie en dehors de la corne frontale (tête du caudé) reste
        x_vl = np.max(np.where(vl & cote, AX, 0), axis=0)
        lsm_ici = lsm_atlas == lsm_id
        reste = lsm_ici & cote & (AX > x_vl[None]) & (x_vl[None] > 0) & (dvl <= 8) & (Z <= 20) & (Y > -5)
        carte[lsm_ici & ~reste] = aca_id
        cle = 'G' if lsa_id == 5 else 'D'
        info[f'profond_ACM_{cle}'] = {'avant': int(lsa.sum()), 'apres': int((carte == lsa_id).sum()),
                                      'caude': int(caude.sum()), 'putamen': int(putamen.sum()), 'z_haut_putamen': z_haut}
    return info


def limiter_acp(carte):
    """ACP superficielle : rien au-dessus des ventricules latéraux ; elle apparaît au pôle occipital au niveau
    du toit des ventricules (z ≈ +28 mm) et s'étend vers l'avant en descendant (coupes de référence de l'auteur).
    Limite arrondie : distance au pôle occipital médial (x = ±6, y = −110 mm, écart latéral compté 1,5 fois, d'où
    un lobe plus étroit que haut : l'ACM garde la convexité occipitale) inférieure à un rayon qui croît vers le bas.
    Les voxels retirés reviennent au territoire superficiel le plus proche (ACA en dedans, ACM en dehors)."""
    X, Y, Z = grilles()
    rayon = np.interp(Z, [-100, -6, 0, 4, 8, 12, 16, 20, 24, 28, 30], [400, 400, 110, 70, 56, 46, 37, 30, 22, 13, 0])
    retire = np.isin(carte, (17, 18)) & (np.hypot(1.5 * (np.abs(X) - 6), Y + 110) > rayon)
    superficiels = np.isin(carte, (1, 2, 7, 8))
    # distance latérale comptée triple : chaque voxel prolonge le territoire situé à la même distance de la
    # ligne médiane (ACA sur la face médiale, ACM sur la convexité)
    _, (ix, iy, iz) = ndi.distance_transform_edt(~superficiels, sampling=(3, 1, 1), return_indices=True)
    carte[retire] = carte[ix, iy, iz][retire]
    return int(retire.sum())


Z_PONT_HAUT, Z_PONT_BAS = -18, -44          # jonctions ponto-mésencéphalique et bulbo-pontique (Colin 27, mm)


def reprendre_reference(carte, c, haut):
    """Découpage des coupes de référence de l'auteur (vidéo) :
      • choroïdienne antérieure : bras postérieur de la capsule interne (substance blanche claire entre noyau
        lenticulaire et thalamus), en plus de l'uncus et de la tête de l'hippocampe donnés par l'atlas ;
      • ACP : un seul territoire, thalamus (thalamo-perforantes de l'atlas) et mésencéphale compris, et plus
        étendu sur la face inférieure du lobe temporal (jusqu'à 9 mm aux dépens de l'ACM) et sur le corps de
        l'hippocampe (la choroïdienne antérieure garde l'uncus, l'amygdale et la tête de l'hippocampe) ;
      • tronc cérébral : mésencéphale à l'ACP, pont à la basilaire, bulbe à la vertébrale et spinale antérieure
        (moitié antérieure) et à la PICA (moitié postérieure) ;
      • cérébelleuses inférieures de l'atlas séparées : AICA sur la face antérieure (pétreuse) de l'hémisphère
        (8 mm depuis le bord antérieur du cervelet, en dehors du tronc), PICA pour le reste.
    """
    X, Y, Z = grilles()
    AX = np.abs(X)
    tl = ndi.gaussian_filter(c / haut, 0.7)
    info = {}
    for g, d in ((0, 1), (1, 0)):
        lsa, thp, cha, acm, acp, bas, aci, aica, vert = (5 + g, 21 + g, 23 + g, 7 + g, 17 + g, 25 + g, 29 + g, 33 + g, 35 + g)
        # 1) bras postérieur de la capsule interne : voxels clairs à moins de 5 mm de la limite noyau lenticulaire / thalamus
        d_lsa = ndi.distance_transform_edt(carte != lsa)
        d_thp = ndi.distance_transform_edt(carte != thp)
        pres = (((carte == lsa) & (d_thp <= 5)) | ((carte == thp) & (d_lsa <= 5))) & (Y < 0) & (Z >= -6) & (Z <= 18)
        capsule = pres & (tl > 0.645)
        capsule = ndi.binary_opening(capsule, iterations=1)
        capsule = ndi.binary_closing(capsule, iterations=2) & pres
        carte[capsule] = cha
        # 2) ACP sur la face inférieure du lobe temporal : croissance aux dépens de l'ACM, nulle à z = −2 mm et en avant
        #    de y = −5 mm, 9 mm sous z = −11 mm et en arrière de y = −25 mm (limite oblique, pas de coupure nette)
        portee = (np.clip(-Z - 2, 0, 9) * np.clip((-Y - 5) / 20, 0, 1)).astype(np.float32)
        d_acp = ndi.distance_transform_edt(carte != acp)
        pousse = (carte == acm) & (d_acp <= portee)
        carte[pousse] = acp
        # choroïdienne antérieure de l'atlas sur le lobe temporal : seulement l'uncus, l'amygdale et la tête de
        # l'hippocampe ; le corps et la queue de l'hippocampe reviennent à l'ACP
        carte[(carte == cha) & (Z < -6) & (Y < -26)] = acp
        # 3) thalamus (thalamo-perforantes) et mésencéphale à l'ACP
        carte[carte == thp] = acp
        carte[(carte == bas) & (Z > Z_PONT_HAUT)] = acp
        # 4) bulbe : moitié antérieure à la vertébrale et spinale antérieure, moitié postérieure à la PICA
        bulbe = (carte == bas) & (Z < Z_PONT_BAS)
        info[f'capsule_{"GD"[g]}'], info[f'acp_temporal_{"GD"[g]}'] = int(capsule.sum()), int(pousse.sum())
        for k in np.nonzero(bulbe.any(axis=(0, 1)))[0]:
            tranche = bulbe[:, :, k]
            ym = np.nonzero(tranche)[1].mean()
            avant = tranche & (np.arange(217)[None, :] >= ym)
            carte[:, :, k][avant] = vert
            carte[:, :, k][tranche & ~avant] = aci
    # 5) AICA : face antérieure des hémisphères cérébelleux (8 mm depuis le bord antérieur), en dehors du tronc
    cervelet = np.isin(carte, (27, 28, 29, 30))
    y_avant = np.where(cervelet.any(axis=1), np.max(np.where(cervelet, np.arange(217)[None, :, None], -1), axis=1), -1)
    proche = (y_avant[:, None, :] - np.arange(217)[None, :, None]) <= 8
    for aci, aica in ((29, 33), (30, 34)):
        m = (carte == aci) & proche & (AX >= 14) & (Z >= -52) & (Z <= -24)
        m = ndi.binary_opening(m, iterations=1)
        carte[m] = aica
        info[f'aica_{aica}'] = int(m.sum())
    return info


def rattacher_ilots(carte, seuil=60):
    """Îlots de moins de `seuil` voxels laissés par les recalages : rattachés au territoire voisin le plus proche."""
    ilots = np.zeros(carte.shape, bool)
    for ident in [t[0] for t in TERRITOIRES] + [t[0] + 1 for t in TERRITOIRES]:
        etiq, n = ndi.label(carte == ident)
        if n > 1:
            tailles = np.bincount(etiq.ravel()); tailles[0] = 0
            petits = tailles < seuil
            petits[np.argmax(tailles)] = False
            ilots |= petits[etiq] & (etiq > 0)
    sources = (carte > 0) & (carte != VENTRICULE) & ~ilots
    _, (ix, iy, iz) = ndi.distance_transform_edt(~sources, return_indices=True)
    carte[ilots] = carte[ix, iy, iz][ilots]
    return int(ilots.sum())


def lire_ants(chemin):
    """Image NIfTI → image ANTs en flottants (ANTsPy ne lit pas les entiers 64 bits de ces fichiers)."""
    import ants
    tmp = os.path.join(CACHE, 'f32-' + os.path.basename(chemin))
    if not os.path.exists(tmp):
        im = nib.load(chemin)
        nib.save(nib.Nifti1Image(np.asarray(im.dataobj, dtype=np.float32), im.affine), tmp)
    return ants.image_read(tmp)


def recaler_sujet(carte_colin, masque_colin):
    """Sujet IBC : T2 et FLAIR recalés sur le T1 (rigide), T1 recalé sur Colin 27 (affine), rééchantillonnage des trois
    sur la grille MNI de 1 mm (Lanczos) ; puis Colin 27 recalé sur le T1 du sujet (SyN) pour y transporter la carte.
    Recalages mis en cache (CACHE). Renvoie les trois volumes corrigés de l'inhomogénéité de champ (N4), la carte
    transportée et le masque du cerveau de Colin 27 transporté."""
    import ants
    ants.config._random_seed = 1
    os.makedirs(CACHE, exist_ok=True)
    colin = ants.image_read(os.path.join(SOURCES, 'tpl-MNIColin27_T1w.nii.gz'))
    sorties = {k: os.path.join(CACHE, f'{k}-mni.nii.gz') for k in ('t1', 't2', 'flair')}
    if not all(map(os.path.exists, sorties.values())):
        t1 = lire_ants(os.path.join(SOURCES, SUJET + 'T1w.nii.gz'))
        t2 = lire_ants(os.path.join(SOURCES, SUJET + 'acq-spc_T2w.nii.gz'))
        fl = lire_ants(os.path.join(SOURCES, SUJET + 'FLAIR.nii.gz'))
        r2 = ants.registration(fixed=t1, moving=t2, type_of_transform='Rigid')
        rf = ants.registration(fixed=t1, moving=fl, type_of_transform='Rigid')
        ra = ants.registration(fixed=colin, moving=t1, type_of_transform='Affine')
        for k, img, tr in (('t1', t1, ra['fwdtransforms']), ('t2', t2, ra['fwdtransforms'] + r2['fwdtransforms']),
                           ('flair', fl, ra['fwdtransforms'] + rf['fwdtransforms'])):
            out = ants.apply_transforms(fixed=colin, moving=img, transformlist=tr, interpolator='lanczosWindowedSinc')
            ants.image_write(out, sorties[k])
    vols = {k: ants.image_read(p) for k, p in sorties.items()}
    prefixe = os.path.join(CACHE, 'colin-vers-sujet-')
    champs = [prefixe + '1Warp.nii.gz', prefixe + '0GenericAffine.mat']
    if not all(map(os.path.exists, champs)):
        ants.registration(fixed=vols['t1'], moving=colin, type_of_transform='SyN', reg_iterations=(80, 50, 20), outprefix=prefixe)

    def image(vol):
        return ants.from_numpy(np.ascontiguousarray(vol, dtype=np.float32), origin=colin.origin, spacing=colin.spacing,
                               direction=colin.direction)

    def transporter(vol, interp):
        return ants.apply_transforms(fixed=vols['t1'], moving=image(vol), transformlist=champs, interpolator=interp).numpy()
    etiquettes = np.rint(transporter(carte_colin, 'genericLabel')).astype(np.uint8)
    masque = transporter(masque_colin, 'linear') > 0.5
    region = image(ndi.binary_dilation(masque, boule(4)))
    images = {k: ants.n4_bias_field_correction(v, mask=region).numpy().astype(np.float32) for k, v in vols.items()}
    return images, etiquettes, masque


def construire_sujet(images, etiquettes, masque_colin):
    """Cerveau du sujet (T1 + T2), territoire le plus proche, LCS non coloré ; images en octets ; zones jonctionnelles."""
    t1, t2, fl = images['t1'], images['t2'], images['flair']
    region = ndi.binary_dilation(masque_colin, boule(3))
    lcs_atlas = etiquettes == VENTRICULE
    tissu_atlas = masque_colin & ~ndi.binary_dilation(lcs_atlas, boule(2))
    # T1 : substance blanche (p90 du cerveau) ≈ 180 / 255, comme pour Colin 27
    h1 = np.percentile(t1[tissu_atlas], 90) / 0.71
    t1n = t1 / h1
    seuil1 = (np.percentile(t1n[lcs_atlas], 30) + np.percentile(t1n[tissu_atlas], 40)) / 2
    # T2 : LCS très clair ; seuil entre le tissu (p75) et le LCS (médiane)
    seuil2 = (np.percentile(t2[tissu_atlas], 75) + np.median(t2[lcs_atlas])) / 2
    lcs = (t2 > seuil2) | (t1n < seuil1)
    # cerveau : tissu (T1 au-dessus du LCS), fermeture pour garder le LCS des sillons, comme pour Colin 27
    tissu = region & (t1n > seuil1) & (t1n < np.percentile(t1n[tissu_atlas], 99.5) * 1.08)
    tissu = ndi.binary_opening(tissu, boule(2))
    etiq, n = ndi.label(tissu)
    tissu = etiq == (np.argmax(np.bincount(etiq.ravel())[1:]) + 1)
    tissu = ndi.binary_dilation(tissu, boule(1)) & (t1n > seuil1) & region
    cerveau = ndi.binary_fill_holes(ndi.binary_closing(tissu, boule(2)))
    for k in range(cerveau.shape[2]):
        coupe = ndi.binary_fill_holes(cerveau[:, :, k])
        etiq, n = ndi.label(coupe)
        if n:
            tailles = np.bincount(etiq.ravel())
            coupe &= ((tailles >= 25)[etiq]) & (etiq > 0)
        cerveau[:, :, k] = coupe
    # territoire le plus proche de la carte transportée ; LCS profond du sujet (ventricules, citernes) non coloré
    sources = (etiquettes > 0) & (etiquettes != VENTRICULE)
    _, (ix, iy, iz) = ndi.distance_transform_edt(~sources, return_indices=True)
    carte = np.where(cerveau, etiquettes[ix, iy, iz], 0).astype(np.uint8)
    AX = np.abs(grilles()[0])
    profondeur = ndi.distance_transform_edt(cerveau)
    profond = ndi.binary_dilation(lcs_atlas, boule(3)) | ((profondeur > 10) & (AX < 10))
    carte[cerveau & lcs & profond] = VENTRICULE
    ilots = rattacher_ilots(carte)
    # tête : au-dessus du bruit de fond en T1 ou en T2, plus grande composante, trous comblés dans les trois plans
    h2 = np.percentile(t2[cerveau], 99.7)
    hf = np.percentile(fl[cerveau & ~lcs], 99.7)
    t1u8 = np.clip(np.rint(t1n * 255), 0, 255).astype(np.uint8)
    t2u8 = np.clip(np.rint(t2 / h2 * 235), 0, 255).astype(np.uint8)
    flu8 = np.clip(np.rint(fl / hf * 235), 0, 255).astype(np.uint8)
    tete = (t1u8 > 30) | (t2u8 > 30)
    etiq, n = ndi.label(tete)
    tete = etiq == (np.argmax(np.bincount(etiq.ravel())[1:]) + 1)
    tete = ndi.binary_closing(tete, boule(3))
    for axe in range(3):
        for i in range(tete.shape[axe]):
            sl = [slice(None)] * 3; sl[axe] = i
            tete[tuple(sl)] = ndi.binary_fill_holes(tete[tuple(sl)])
    tete = ndi.binary_dilation(tete, boule(2))
    for v in (t1u8, t2u8, flu8):
        v[~tete] = 0
    jonctions = zones_jonctionnelles(carte, t1n)
    info = {'seuil_t1': float(seuil1), 'seuil_t2': float(seuil2), 'ilots_sujet': ilots,
            'jonction_corticale': int((jonctions == 1).sum()), 'jonction_profonde': int((jonctions == 2).sum())}
    return {'T1': t1u8, 'T2': t2u8, 'FLAIR': flu8}, carte, jonctions, info


def zones_jonctionnelles(carte, t1n):
    """Calque des zones jonctionnelles (1 = corticale, 2 = profonde), d'après la description classique :
      • corticale (externe) : bande de 7 mm à cheval sur la limite de deux territoires superficiels d'un même côté
        (ACA / ACM, ACM / ACP, ACA / ACP), à plus de 12 mm des ventricules latéraux ;
      • profonde (interne) : substance blanche de la couronne rayonnante et du centre semi-ovale, de 5 à 12 mm en
        dehors du corps du ventricule latéral (z de +14 à +34 mm), dans le territoire superficiel de l'ACM, juste en
        dehors de son territoire profond."""
    X, Y, Z = grilles()
    AX = np.abs(X)
    j = np.zeros(carte.shape, np.uint8)
    # ventricules latéraux du sujet : LCS profond, composante principale autour du centre
    vl = (carte == VENTRICULE) & (AX < 32) & (Y > -60) & (Y < 40) & (Z > -8) & (Z < 36)
    etiq, n = ndi.label(vl)
    tailles = np.bincount(etiq.ravel()); tailles[0] = 0
    vl = etiq == np.argmax(tailles)
    dvl = ndi.distance_transform_edt(~vl)
    for g in (0, 1):
        ids = (1 + g, 7 + g, 17 + g)
        d = {i: ndi.distance_transform_edt(carte != i) for i in ids}
        for i in ids:
            autre = np.minimum.reduce([d[k] for k in ids if k != i])
            j[(carte == i) & (autre <= 3.5) & (dvl > 12)] = 1
    x_vl = np.max(np.where(vl, AX, 0), axis=0)
    blanche = t1n > 0.62
    profonde = ((dvl >= 5) & (dvl <= 12) & np.isin(carte, (7, 8)) & (Z >= 14) & (Z <= 34)
                & (AX > x_vl[None]) & (x_vl[None] > 0) & blanche)
    profonde = ndi.binary_closing(profonde, boule(1)) & np.isin(carte, (7, 8))
    j[profonde] = 2
    return j


# ---------------------------------------------------------------------------
# Mode test : structures cibles (coordonnées MNI du côté droit, le gauche en miroir), territoire attendu, rayon de la
# lésion simulée (mm), catégorie (pour les mauvaises réponses proposées) et explication montrée à la correction.
# Chaque cible est vérifiée sur la carte du sujet ; si elle tombe à côté du territoire attendu, le voxel le plus proche
# de ce territoire (à moins de 8 mm, à 1,5 mm au moins de ses limites) la remplace.
# ---------------------------------------------------------------------------
QUESTIONS = [
    ("Tête du noyau caudé", 'LSM', (12, 14, 8), 6, 'profond',
     "Artère récurrente de Heubner et lenticulo-striées médiales, branches de l'ACA."),
    ("Putamen (noyau lenticulaire)", 'LSL', (25, 2, 2), 7, 'profond',
     "Lenticulo-striées latérales : infarctus du territoire profond de l'ACM (striato-capsulaire)."),
    ("Bras postérieur de la capsule interne", 'ChA', (22, -12, 8), 5, 'profond',
     "Artère choroïdienne antérieure (carotide interne) : hémiplégie proportionnelle controlatérale."),
    ("Thalamus", 'ACP', (10, -18, 6), 7, 'profond',
     "Perforantes thalamiques (thalamo-perforantes et thalamo-genouillées), branches de l'ACP."),
    ("Uncus et tête de l'hippocampe", 'ChA', (25, -8, -20), 5, 'profond',
     "Artère choroïdienne antérieure : uncus, amygdale et tête de l'hippocampe."),
    ("Corps de l'hippocampe", 'ACP', (30, -28, -8), 6, 'profond',
     "Branches temporales de l'ACP."),
    ("Insula", 'ACM', (38, -2, 6), 11, 'cortical',
     "Branches insulaires de l'ACM (segment M2)."),
    ("Gyrus précentral (cortex moteur)", 'ACM', (42, -15, 48), 13, 'cortical',
     "Branches corticales de l'ACM : déficit moteur controlatéral à prédominance brachio-faciale."),
    ("Lobule paracentral", 'ACA', (6, -25, 62), 11, 'cortical',
     "Branches corticales de l'ACA : déficit moteur controlatéral à prédominance crurale."),
    ("Gyrus cingulaire (face médiale du lobe frontal)", 'ACA', (6, 30, 28), 11, 'cortical',
     "Branches corticales de l'ACA (péricalleuse et calloso-marginale)."),
    ("Cortex calcarin (lobe occipital)", 'ACP', (8, -85, 6), 12, 'cortical',
     "Artère calcarine (ACP) : hémianopsie latérale homonyme controlatérale."),
    ("Gyrus fusiforme (face inférieure du lobe temporal)", 'ACP', (35, -55, -14), 11, 'cortical',
     "Branches temporales inférieures de l'ACP."),
    ("Gyrus temporal supérieur", 'ACM', (55, -30, 8), 13, 'cortical',
     "Division inférieure de l'ACM : aphasie de Wernicke si l'hémisphère est dominant."),
    ("Gyrus frontal inférieur", 'ACM', (48, 20, 10), 12, 'cortical',
     "Division supérieure de l'ACM : aphasie de Broca si l'hémisphère est dominant."),
    ("Centre semi-ovale (substance blanche frontale)", 'ACM', (28, 10, 32), 9, 'cortical',
     "Branches médullaires (perforantes corticales) de l'ACM."),
    ("Précunéus (face médiale du lobe pariétal)", 'ACA', (6, -60, 45), 11, 'cortical',
     "Branches pariétales de l'ACA (au-dessus du sillon pariéto-occipital)."),
    ("Mésencéphale (pédoncule cérébral)", 'ACP', (12, -18, -10), 5, 'fosse',
     "Perforantes mésencéphaliques de l'ACP (P1) : syndrome de Weber."),
    ("Pont (protubérance)", 'BAS', (4, -24, -32), 6, 'fosse',
     "Branches paramédianes de l'artère basilaire."),
    ("Bulbe (moelle allongée)", 'VERT', (3, -38, -50), 4, 'fosse',
     "Artère vertébrale et spinale antérieure : syndrome bulbaire médian (Dejerine)."),
    ("Face supérieure du cervelet (vermis supérieur)", 'ACS', (10, -62, -20), 10, 'fosse',
     "Artère cérébelleuse supérieure : syndrome cérébelleux."),
    ("Face antérieure de l'hémisphère cérébelleux", 'AICA', (30, -48, -38), 6, 'fosse',
     "Artère cérébelleuse antéro-inférieure (AICA) : vertige, surdité et paralysie faciale homolatérales."),
    ("Face inférieure de l'hémisphère cérébelleux", 'PICA', (25, -72, -45), 11, 'fosse',
     "Artère cérébelleuse postéro-inférieure (PICA) ; atteinte du bulbe latéral : syndrome de Wallenberg."),
]


def preparer_questions(carte):
    """Banque du mode test : cibles vérifiées sur la carte du sujet, des deux côtés."""
    ids = {(t[1], c): t[0] + (c == 'D') for t in TERRITOIRES for c in ('G', 'D')}
    sortie = []
    for structure, code, (x, y, z), rayon, categorie, note in QUESTIONS:
        cibles = {}
        for cote, s in (('D', 1), ('G', -1)):
            ident = ids[(code, cote)]
            v = (s * x + 90, y + 126, z + 72)
            if carte[v] != ident:
                interieur = ndi.binary_erosion(carte == ident, iterations=1)
                zone = np.zeros(carte.shape, bool)
                zone[v[0] - 8:v[0] + 9, v[1] - 8:v[1] + 9, v[2] - 8:v[2] + 9] = True
                candidats = np.argwhere(interieur & zone)
                assert len(candidats), (structure, cote)
                v = tuple(candidats[np.argmin(((candidats - np.array(v)) ** 2).sum(axis=1))])
            cibles[cote] = [int(v[0]) - 90, int(v[1]) - 126, int(v[2]) - 72]
        sortie.append({'structure': structure, 'territoire': code, 'categorie': categorie, 'rayon_mm': rayon,
                       'cibles_mm': cibles, 'note': note})
    return sortie


SERIES = [
    ('T1', 'T1', "T1 3D (MPRAGE), 1 × 1 × 1,1 mm", 'irm-t1.u8.gz'),
    ('T2', 'T2', "T2 3D (SPACE), 0,9 mm isotrope", 'irm-t2.u8.gz'),
    ('FLAIR', 'FLAIR', "FLAIR 3D, 0,45 × 0,45 × 0,9 mm", 'irm-flair.u8.gz'),
]
JONCTIONS = [
    {'id': 1, 'code': 'JC', 'nom': 'Zone jonctionnelle corticale', 'court': 'Jonctionnel cortical',
     'precision': "Bande de 7 mm à cheval sur la limite de deux territoires superficiels (ACA / ACM, ACM / ACP, ACA / ACP) : "
                  "siège des infarctus jonctionnels corticaux (externes), en cas de bas débit."},
    {'id': 2, 'code': 'JP', 'nom': 'Zone jonctionnelle profonde', 'court': 'Jonctionnel profond',
     'precision': "Substance blanche de la couronne rayonnante et du centre semi-ovale, en dehors du ventricule latéral, entre "
                  "les perforantes et les branches superficielles de l'ACM : siège des infarctus jonctionnels internes (en chapelet)."},
]


def fenetres(vol, cerveau):
    """Préréglages de fenêtre : standard, cerveau (contraste substance grise / blanche) et large."""
    p5, p95 = np.percentile(vol[cerveau], [5, 95])
    return [
        {'nom': 'Standard', 'largeur': 255, 'niveau': 128},
        {'nom': 'Cerveau (substance grise / blanche)', 'largeur': int(round((p95 - p5) * 1.15)), 'niveau': int(round((p5 + p95) / 2))},
        {'nom': 'Large', 'largeur': 400, 'niveau': 160},
    ]


def exporter(series, carte, jonctions):
    os.makedirs(SORTIE, exist_ok=True)
    for f in os.listdir(SORTIE):
        if f.endswith('.u8.gz'):
            os.remove(os.path.join(SORTIE, f))

    def ecrire(nom, vol):
        brut = np.ascontiguousarray(vol.transpose(2, 1, 0)).tobytes()   # x le plus rapide, puis y, puis z
        with open(os.path.join(SORTIE, nom), 'wb') as f:
            f.write(gzip.compress(brut, compresslevel=9, mtime=0))
        return hashlib.sha256(brut).hexdigest()
    cerveau = (carte > 0) & (carte != VENTRICULE)
    liste, empreintes = [], {}
    for code, nom, description, fichier in SERIES:
        empreintes[code] = ecrire(fichier, series[code])
        liste.append({'code': code, 'nom': nom, 'description': description, 'fichier': fichier,
                      'fenetres': fenetres(series[code], cerveau)})
    empreintes['territoires'] = ecrire('territoires.u8.gz', carte)
    empreintes['jonctions'] = ecrire('jonctions.u8.gz', jonctions)
    presents = set(np.unique(carte).tolist())
    territoires = []
    for gauche, code, groupe, nom, court, couleur, precision in TERRITOIRES:
        for ident, cote in ((gauche, 'G'), (gauche + 1, 'D')):
            assert ident in presents, ident
            territoires.append({'id': ident, 'code': code, 'cote': cote, 'groupe': groupe, 'nom': nom, 'court': court,
                                'couleur': couleur, 'precision': precision})
    manifest = {
        'titre': 'Territoires artériels du cerveau',
        'sujet': "Volontaire sain, projet Individual Brain Charting (IBC), sujet 01 ; IRM 3 T (Siemens Prisma)",
        'dimensions': [181, 217, 181],
        'espacement_mm': [1, 1, 1],
        'origine_mm': [-90, -126, -72],
        'orientation': 'RAS (x vers la droite du patient, y vers l\'avant, z vers le haut) ; x varie le plus vite, puis y, puis z ; '
                       'sujet recalé sur l\'espace MNI (transformation affine)',
        'series': liste,
        'fichiers': {'territoires': 'territoires.u8.gz', 'jonctions': 'jonctions.u8.gz'},
        'empreintes_sha256_decompresse': empreintes,
        'groupes': GROUPES,
        'territoires': territoires,
        'jonctions': JONCTIONS,
        'non_colores': [{'id': VENTRICULE, 'nom': 'Ventricules et citernes (LCS)'}],
        'questions': preparer_questions(carte),
        'credits': {
            'irm': "Individual Brain Charting (IBC), sujet 01, séance 00 : T1 (MPRAGE), T2 (SPACE) et FLAIR 3D, Siemens Prisma 3 T "
                   "(Pinho AL, Amadon A, Ruest T et al., Scientific Data 2018 ; doi:10.1038/sdata.2018.105). OpenNeuro ds002685, "
                   "licence CC0. Recalé sur l'espace MNI, rééchantillonné à 1 mm, intensités corrigées (N4) et ramenées à 0–255.",
            'atlas': "Digital 3D Brain MRI Arterial Territories Atlas (Liu C-F, Hsu J, Xu X et al., Scientific Data 2023, "
                     "doi:10.1038/s41597-022-01923-0), © 2021 The Johns Hopkins University, licence CC BY-SA 4.0. "
                     "Adapté par RadiologicHub : territoires recalés sur l'anatomie (Colin 27) d'après des coupes de référence, "
                     "puis transportés sur le sujet IBC (recalage non linéaire) et étendus au contour de son cerveau ; "
                     "zones jonctionnelles ajoutées ; noms traduits. La carte dérivée est diffusée sous la même licence.",
            'colin27': "Colin 27 Average Brain (Holmes CJ et al., J Comput Assist Tomogr 1998), relais du recalage. Copyright (C) "
                       "1993–2009 Louis Collins, McConnell Brain Imaging Centre, Montreal Neurological Institute, McGill University.",
        },
    }
    with open(os.path.join(SORTIE, 'manifest.json'), 'w', encoding='utf-8') as f:
        json.dump(manifest, f, ensure_ascii=False, indent=1)
        f.write('\n')
    shutil.copyfile(os.path.join(SOURCES, 'atlas-LICENSE'), os.path.join(SORTIE, 'LICENSE-atlas-CC-BY-SA-4.0.txt'))
    shutil.copyfile(os.path.join(SOURCES, 'colin27-LICENSE'), os.path.join(SORTIE, 'LICENSE-colin27.txt'))
    with open(os.path.join(SORTIE, 'LICENSE-irm-IBC-CC0.txt'), 'w', encoding='utf-8') as f:
        f.write(LICENCE_IBC)
    return manifest


LICENCE_IBC = """Images IRM : Individual Brain Charting (IBC), sujet 01, séance 00 (T1w, acq-spc T2w, FLAIR)
OpenNeuro ds002685 (doi:10.18112/openneuro.ds002685.v1.3.1), licence CC0 1.0 Universal (domaine public).
https://creativecommons.org/publicdomain/zero/1.0/

Référence : Pinho AL, Amadon A, Ruest T, Fabre M, Dohmatob E, Denghien I, Ginisty C, Becuwe-Desmidt S, Roger S,
Laurier L, Joly-Testault V, Mediouni-Cloarec G, Double C, Martins B, Pinel P, Eger E, Varoquaux G, Pallier C,
Dehaene S, Hertz-Pannier L, Thirion B. Individual Brain Charting, a high-resolution fMRI dataset for cognitive
mapping. Sci Data. 2018;5:180105.

Transformations par RadiologicHub : recalage (T2 et FLAIR sur T1, puis espace MNI), rééchantillonnage à 1 mm,
correction d'inhomogénéité (N4), intensités ramenées à 0–255, voxels hors de la tête mis à zéro.
"""


if __name__ == '__main__':
    telecharger()
    _, carte_colin, masque_colin, info = preparer()
    images, etiquettes, masque = recaler_sujet(carte_colin, masque_colin)
    series, carte, jonctions, info_sujet = construire_sujet(images, etiquettes, masque)
    info.update(info_sujet)
    m = exporter(series, carte, jonctions)
    tailles = {f: os.path.getsize(os.path.join(SORTIE, f)) for f in sorted(os.listdir(SORTIE))}
    print('écrit :', SORTIE, tailles, info)
