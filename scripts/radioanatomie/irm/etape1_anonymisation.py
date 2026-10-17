"""Radioanatomie IRM cérébrale, étape 1 : examen en accès libre et vérification de l'anonymisation.

Examen retenu : studyforrest, sujet 01 (volontaire sain ; Hanke M et al., Scientific Data 2014,
doi:10.1038/sdata.2014.3 ; OpenNeuro ds000113). Données dédiées au domaine public par leurs auteurs
(Open Data Commons PDDL : usage commercial autorisé, aucune condition, pas même la citation).
Séquences du sujet 01 :
  • 3 T (Philips Achieva) : 3D T1 TFE 0,7 mm ; 3D T2 TSE 0,7 mm ; veinographie de susceptibilité (SWI,
    amplitude + phase, 0,43 × 0,43 × 0,35 mm) ; diffusion (DTI, 32 directions, b = 800 s/mm², 1,7 × 1,7 × 2 mm) ;
  • 7 T : ARM 3D en temps de vol (TOF), 0,3 mm isotrope, bloc axial de 49 mm.
Les fichiers sont publiés en NIfTI (il n'y a pas de DICOM) et le visage a déjà été effacé par les auteurs,
qui fournissent le masque d'effacement de chaque séquence (sauf le TOF).

Vérifications :
  1. en-têtes NIfTI (champs texte descrip, aux_file, intent_name, db_name, extensions) et fichiers JSON
     d'accompagnement : chaque champ hors de la liste blanche technique est signalé ;
  2. texte incrusté dans les pixels : OCR (Tesseract, français + anglais) sur chaque coupe des trois plans
     de chaque séquence ; un mot est retenu s'il a au moins 3 caractères alphanumériques dont une lettre
     et une confiance ≥ 85 ; les coupes retenues sont enregistrées en vignettes pour contrôle visuel ;
     contrôle positif préalable : chacune des deux lignes d'un faux nom incrusté en caractères de 9 px
     doit être signalée (au moins un mot lu par ligne) ;
  3. effacement du visage : (a) les voxels hors du masque d'effacement fourni sont bien nuls ;
     (b) rendu 3D de la surface de la tête (face, trois quarts, profil) pour contrôle visuel ;
     + coupes centrales de chaque séquence et projections (MIP) du TOF pour juger de la couverture.

Sortie : assets-sources/radioanatomie/irm-cerebrale/etape1/ (rapport.json, rapport.md, images PNG).
Usage : python3 -I scripts/radioanatomie/irm/etape1_anonymisation.py   (depuis la racine du dépôt)
Dépendances : numpy, scipy, nibabel, matplotlib, Pillow ; programme tesseract (+ langues fra, eng).
"""
import hashlib, io, json, os, re, shutil, subprocess, sys, urllib.request
from multiprocessing import Pool

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import nibabel as nib
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

RACINE = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
BASE = os.path.join(RACINE, 'assets-sources', 'radioanatomie', 'irm-cerebrale')
SOURCES = os.path.join(BASE, 'studyforrest')
SORTIE = os.path.join(BASE, 'etape1')

# Fichiers à version figée (identifiant de version S3 d'OpenNeuro + empreinte sha256)
OPENNEURO = 'https://s3.amazonaws.com/openneuro.org/ds000113/'
SUJET = 'sub-01/ses-forrestgump/'
P = 'sub-01_ses-forrestgump_'
FICHIERS = {
    P + 'T1w.nii.gz': (SUJET + 'anat/', 'lEUEm7fdQk3PQGM4RbOKx65M0OmPiqjt', '7c702aee386767418cc1a914fb8957c75ff2844e1d72de2c2d4b85cbac88f0cf'),
    P + 'T2w.nii.gz': (SUJET + 'anat/', 'V4ZlqJWAavqvNlTdcud1L3_vL8vUkT1b', '652248cb57ccbca27778660960b005e9206a9281811ea8480cae6fb3eb2652d2'),
    P + 'acq-mag_veno.nii.gz': (SUJET + 'anat/', 'oabcy6xclbDfBHXOsRfll8O4woRq1O.p', '2a7d2b49f49e0a8659a8479e68980c86053dae866a4aa10aeb451d7b767f32c0'),
    P + 'acq-pha_veno.nii.gz': (SUJET + 'anat/', 'UkSNqFSkqAov1EbvamqpR2y9KezRJZoC', 'd3e1f06fe6356a56935669ab8412e86dbccbd67b82d8eb48ec7447f11ccae500'),
    P + 'angio.nii.gz': (SUJET + 'anat/', 'D4jh7mo618BCkSVfT3e4Pb48sW_tqdDJ', '29c7edf897d2ba7b16fcba112325fb5327086e920634bb2386a4aaca5d7c73d5'),
    P + 'dwi.nii.gz': (SUJET + 'dwi/', 'SPoVUdVyjXgUXCyfLjqOAKp.kVZa8ciP', '7c721dfa9888673bbead9f1c79ab6fecc3d776604a2be67c9445962fdee32ec6'),
    P + 'dwi.bval': (SUJET + 'dwi/', 'hZUMjvyXAlcCKVb5OlVhkHjdOd3sdZQC', '3dc5d0d1b012041233f827cd1be58cfed00be0076c8d1abdd540812b5b569e54'),
    P + 'dwi.bvec': (SUJET + 'dwi/', 'CCT7ZklWrzao54.Uzgighmf3HuoLNLNE', '4905ec7a3b596006ae6dc9a71648293848348133462d1e165ab28eae52048858'),
    P + 'mod-T1w_defacemask.nii.gz': (SUJET + 'anat/', 'UzR0tGmQtfiV2H5DHE.7MWejjrZ6tDs7', '0b7c11b2f9973e8e0f932faa2a6bd2de5d171b6267241cc570117f48e34a1fcb'),
    P + 'mod-T2w_defacemask.nii.gz': (SUJET + 'anat/', 'BCLrtJYDriYMRj9nwgIIxQ0lqRRj7xO9', 'dda5e4a4d8068c73fcdb63e962bae366165f6e3ed0988541f4d4fb2cff036217'),
    P + 'acq-mag_mod-veno_defacemask.nii.gz': (SUJET + 'anat/', 'mKDA1F2GBOjI.Mv4pw1CcbTJbgHG8qn0', '71db58b264f16f3cb87f90b68da500f5904e0077b379e2ab473ba6b4f2f06f9a'),
    P + 'acq-pha_mod-veno_defacemask.nii.gz': (SUJET + 'anat/', '6..xf36ewpMQnFvZ9bOxr91czQGd6uEa', '01539ddf96155cf236abf6419496137949fe0473df6f16e87c068af80cf827ef'),
    P + 'mod-dwi_defacemask.nii.gz': (SUJET + 'dwi/', 'MPt.s5.RGW6FVV3X1rlxMX85VBLhLM7A', '36889e73c284b1c25006a17ba84fe106072cac477f5a52940f7ce38348013174'),
    'T1w.json': ('', 'lAg0FU_CduiRQfKqSGogcxIT5HFoxbeN', '9f37ce53df73b761f898812f55e799be1e7f2c5f07923c9593be72353e4442ca'),
    'angio.json': ('', 'Xc1GzzMyZoU52os30FWX65M1N7PJpYot', '7e435fabecdccfa4a05b597cc6695d0df8ed145bb220105e0805b87cc75cac7a'),
    'dwi.json': ('', 'QR349xoWjVvsd0WHVNt1rHJAkjJ9ksuL', '983863892936e2425b1d9857d84f042ad1665df198879845c4ef45d4d070c0f5'),
    'dataset_description.json': ('', 'jf_MXCE1K..wuhWoHbuwnYJyME_qj04Y', '214272603baa2d5c5ff85b560d97ca121cc872e77f40377d9d18445ddfbf2b3e'),
    'participants.tsv': ('', '7BUwfdOBnHTd2Cokv5u9HVYIKZa6IHCS', '0fc9f456568bd8044efc8f2a62f2c471f2a8b766976d0f04b01aac48f8568f16'),
}
# Licence PDDL telle que publiée dans le dépôt DataLad des données structurales (commit figé)
LICENCE = ('https://raw.githubusercontent.com/psychoinformatics-de/studyforrest-data-structural/'
           '4c929c9b132d758d6008c4d402604dba7f64f075/LICENSE',
           '38b79a08150da787781c319264b20fb2149051f1ca7cb6d12c06800e4bef88f1')

# Séquences à vérifier : code, nom, fichier, masque d'effacement fourni, volume 4D retenu
SEQUENCES = [
    ('T1', '3D T1 (0,7 mm)', P + 'T1w.nii.gz', P + 'mod-T1w_defacemask.nii.gz', None),
    ('T2', '3D T2 (0,7 mm)', P + 'T2w.nii.gz', P + 'mod-T2w_defacemask.nii.gz', None),
    ('SWI-amplitude', 'SWI, amplitude', P + 'acq-mag_veno.nii.gz', P + 'acq-mag_mod-veno_defacemask.nii.gz', None),
    ('SWI-phase', 'SWI, phase', P + 'acq-pha_veno.nii.gz', P + 'acq-pha_mod-veno_defacemask.nii.gz', None),
    ('TOF', 'ARM TOF 7 T (0,3 mm)', P + 'angio.nii.gz', None, None),
    ('DWI-b0', 'Diffusion b = 0', P + 'dwi.nii.gz', P + 'mod-dwi_defacemask.nii.gz', 0),
    ('DWI-b800', 'Diffusion b = 800 (moyenne des 32 directions)', P + 'dwi.nii.gz', P + 'mod-dwi_defacemask.nii.gz', 'moyenne'),
]

# Clés autorisées dans les fichiers JSON d'accompagnement (paramètres techniques seulement)
LISTE_BLANCHE_JSON = {'RepetitionTime', 'EchoTime', 'InversionTime', 'FlipAngle', 'PulseSequenceType',
                      'Manufacturer', 'ManufacturersModelName', 'MagneticFieldStrength', 'SliceThickness',
                      'PhaseEncodingDirection', 'EffectiveEchoSpacing', 'TotalReadoutTime'}


def telecharger():
    os.makedirs(SOURCES, exist_ok=True)
    cibles = {nom: (OPENNEURO + dossier + nom + '?versionId=' + version, empreinte)
              for nom, (dossier, version, empreinte) in FICHIERS.items()}
    cibles['LICENSE-PDDL.txt'] = LICENCE
    for nom, (url, empreinte) in cibles.items():
        chemin = os.path.join(SOURCES, nom)
        if not os.path.exists(chemin):
            print('téléchargement :', url)
            with urllib.request.urlopen(url) as r, open(chemin + '.tmp', 'wb') as f:
                shutil.copyfileobj(r, f)
            os.replace(chemin + '.tmp', chemin)
        h = hashlib.sha256(open(chemin, 'rb').read()).hexdigest()
        if h != empreinte:
            sys.exit(f'empreinte inattendue pour {nom} : {h}')


def charger(fichier, volume=None):
    """Volume en flottants (orientation du fichier) ; volume = indice 4D ou « moyenne » des b > 0."""
    img = nib.load(os.path.join(SOURCES, fichier))
    v = np.asanyarray(img.dataobj).astype(np.float32)
    if v.ndim == 4:
        if volume == 'moyenne':
            bval = np.loadtxt(os.path.join(SOURCES, P + 'dwi.bval'))
            v = v[..., bval > 0].mean(axis=3)
        else:
            v = v[..., volume]
    return img, v


# ---------------------------------------------------------------------------
# 1. En-têtes NIfTI et fichiers JSON
# ---------------------------------------------------------------------------
def texte(champ):
    return champ.tobytes().rstrip(b'\0').decode('latin-1').strip()


def verifier_entetes():
    resultats = []
    for nom in sorted(n for n in FICHIERS if n.endswith('.nii.gz')):
        h = nib.load(os.path.join(SOURCES, nom)).header
        champs = {c: texte(h[c]) for c in ('descrip', 'aux_file', 'intent_name', 'db_name') if c in h}
        champs = {c: t for c, t in champs.items() if t}
        resultats.append({
            'fichier': nom,
            'matrice': [int(d) for d in h.get_data_shape()],
            'voxel_mm': [round(float(z), 3) for z in h.get_zooms()[:3]],
            'champs_texte': champs,
            'extensions': [int(e.get_code()) for e in h.extensions],
            # « FSL5.0 » est la marque du logiciel qui a écrit le fichier, pas une donnée personnelle
            'a_verifier': {c: t for c, t in champs.items() if t != 'FSL5.0'},
        })
    json_ = []
    for nom in ('T1w.json', 'angio.json', 'dwi.json'):
        d = json.load(open(os.path.join(SOURCES, nom)))
        json_.append({'fichier': nom, 'cles': sorted(d),
                      'hors_liste_blanche': sorted(set(d) - LISTE_BLANCHE_JSON)})
    with open(os.path.join(SOURCES, 'participants.tsv'), encoding='utf-8') as f:
        lignes = [l.rstrip('\n').split('\t') for l in f]
    entete, sujet = lignes[0], next(l for l in lignes[1:] if l[0] == '01')
    participants = {'colonnes': len(entete), 'sujet_01': {c: sujet[i] for i, c in enumerate(entete[:3])}}
    return resultats, json_, participants


# ---------------------------------------------------------------------------
# 2. Texte incrusté : OCR de chaque coupe dans les trois plans
# ---------------------------------------------------------------------------
MOT = re.compile(r'[A-Za-zÀ-ÿ0-9]')


def octets(v, bas, haut):
    return (np.clip((v - bas) / max(haut - bas, 1e-6), 0, 1) * 255).astype(np.uint8)


def ocr_coupe(argument):
    code, axe, k, image = argument
    if max(image.shape) < 700:                       # Tesseract lit mieux les petits caractères agrandis
        f = 2 if max(image.shape) >= 350 else 4
        image = np.kron(image, np.ones((f, f), np.uint8))
    tampon = io.BytesIO()
    Image.fromarray(image).save(tampon, format='PNG')
    sortie = subprocess.run(['tesseract', 'stdin', 'stdout', '-l', 'eng+fra', '--psm', '11', 'tsv'],
                            input=tampon.getvalue(), capture_output=True,
                            env={**os.environ, 'OMP_THREAD_LIMIT': '1'}).stdout.decode('utf-8', 'replace')
    mots = []
    for ligne in sortie.splitlines()[1:]:
        c = ligne.split('\t')
        if len(c) < 12 or c[0] != '5':
            continue
        mot, confiance = c[11].strip(), float(c[10])
        if confiance >= 85 and len(MOT.findall(mot)) >= 3 and re.search(r'[A-Za-zÀ-ÿ]', mot):
            mots.append({'mot': mot, 'confiance': round(confiance)})
    return code, axe, k, mots


def coupes(code, v):
    bas, haut = np.percentile(v[v != 0] if np.any(v) else v, [0.5, 99.8])
    for axe in range(3):
        vue = np.moveaxis(v, axe, 0)                 # vue sans copie (np.take recopierait tout le volume)
        for k in range(v.shape[axe]):
            yield code, axe, k, octets(vue[k].T[::-1], bas, haut)


def temoin_ocr():
    """Contrôle positif : un faux nom incrusté en petits caractères (9 px) doit être retrouvé."""
    from PIL import ImageDraw, ImageFont
    _, v = charger(P + 'T1w.nii.gz')
    coupe = next(c for i, c in enumerate(coupes('T1', v)) if i == 137)[3]
    image = Image.fromarray(coupe.copy())
    dessin = ImageDraw.Draw(image)
    police = ImageFont.truetype(matplotlib.get_data_path() + '/fonts/ttf/DejaVuSans.ttf', 9)
    dessin.text((5, 5), 'PATIENT EXEMPLE 01/01/1970', fill=255, font=police)
    dessin.text((5, coupe.shape[0] - 14), 'HOPITAL FICTIF', fill=255, font=police)
    lus = {m['mot'] for m in ocr_coupe(('temoin', 0, 0, np.array(image)))[3]}
    # la coupe serait signalée dès qu'un mot est lu : il suffit qu'au moins un mot de chaque ligne le soit
    lignes = ({'PATIENT', 'EXEMPLE'}, {'HOPITAL', 'FICTIF'})
    return {'attendus': [sorted(l) for l in lignes], 'lus': sorted(lus), 'reussi': all(l & lus for l in lignes)}


def verifier_texte():
    detections, total = [], 0
    with Pool(os.cpu_count() or 2) as pool:
        for code, _, fichier, _, volume in SEQUENCES:
            _, v = charger(fichier, volume)
            n = 0
            for code_, axe, k, mots in pool.imap_unordered(ocr_coupe, coupes(code, v), chunksize=8):
                n += 1
                if mots:
                    detections.append({'sequence': code_, 'axe': axe, 'coupe': k, 'mots': mots})
            total += n
            print(f'OCR {code} : {n} coupes, {sum(d["sequence"] == code for d in detections)} avec texte probable')
    return total, sorted(detections, key=lambda d: (d['sequence'], d['axe'], d['coupe']))


def vignettes_detections(detections):
    """Planche des coupes où l'OCR a cru lire un mot (au plus 24), pour contrôle visuel."""
    if not detections:
        return None
    choix = detections[:24]
    cache = {}
    n = len(choix)
    cols = min(6, n)
    fig, axes = plt.subplots((n + cols - 1) // cols, cols, figsize=(3 * cols, 3.3 * ((n + cols - 1) // cols)),
                             squeeze=False)
    for a in axes.flat:
        a.axis('off')
    for a, d in zip(axes.flat, choix):
        seq = next(s for s in SEQUENCES if s[0] == d['sequence'])
        if seq[0] not in cache:
            cache[seq[0]] = charger(seq[2], seq[4])[1]
        v = cache[seq[0]]
        a.imshow(np.moveaxis(v, d['axe'], 0)[d['coupe']].T[::-1], cmap='gray')
        a.set_title(f"{d['sequence']} axe {d['axe']} n°{d['coupe']}\n« {' '.join(m['mot'] for m in d['mots'])[:30]} »",
                    fontsize=8)
    chemin = os.path.join(SORTIE, 'ocr-detections.png')
    fig.tight_layout()
    fig.savefig(chemin, dpi=90)
    plt.close(fig)
    return chemin


# ---------------------------------------------------------------------------
# 3. Effacement du visage
# ---------------------------------------------------------------------------
def verifier_masques():
    resultats = []
    for code, nom, fichier, masque, volume in SEQUENCES:
        if masque is None:
            resultats.append({'sequence': code, 'masque_fourni': False})
            continue
        _, v = charger(fichier, volume)
        m = np.asanyarray(nib.load(os.path.join(SOURCES, masque)).dataobj) > 0
        efface = ~m
        resultats.append({'sequence': code, 'masque_fourni': True,
                          'part_effacee': round(float(efface.mean()), 3),
                          'voxels_non_nuls_dans_zone_effacee': int(np.count_nonzero(v[efface]))})
    return resultats


def tete_ras(fichier, volume, pas_mm=1.0):
    """Masque de la tête en orientation RAS, rééchantillonné à environ pas_mm."""
    img, v = charger(fichier, volume)
    img = nib.Nifti1Image(v, img.affine)
    img = nib.as_closest_canonical(img)
    v = np.asanyarray(img.dataobj)
    zoom = [z / pas_mm for z in img.header.get_zooms()[:3]]
    v = ndi.zoom(ndi.gaussian_filter(v, [0.5 / z for z in zoom]), zoom, order=1)
    # seuil de la peau : 12 % du 99e centile (le bloc TOF, coupé par son champ de vue à droite, à gauche,
    # en haut et en bas, apparaît comme une bande de front aux faces planes)
    m = v > 0.12 * np.percentile(v[v > 0], 99)
    m = ndi.binary_opening(m, iterations=1)
    lab, n = ndi.label(m)
    if n:
        m = lab == (np.argmax(np.bincount(lab.ravel())[1:]) + 1)
    return m


def relief(m, axe, sens):
    """Image ombrée de la première surface rencontrée le long d'un axe (rendu de surface simple)."""
    m = np.moveaxis(m, axe, 0)
    if sens < 0:
        m = m[::-1]
    touche = m.any(axis=0)
    prof = np.where(touche, m.argmax(axis=0), m.shape[0]).astype(np.float32)
    prof = ndi.gaussian_filter(prof, 1.0)
    gy, gx = np.gradient(prof)
    n = np.dstack([-gx, -gy, np.ones_like(prof)])
    n /= np.linalg.norm(n, axis=2, keepdims=True)
    lumiere = np.array([0.35, -0.45, 0.82])
    ombre = np.clip(n @ (lumiere / np.linalg.norm(lumiere)), 0, 1) * (1 - 0.5 * prof / m.shape[0])
    return np.where(touche, ombre, np.nan)


def rendus_visage():
    """Vues de face, de trois quarts et de profil gauche de la surface de la tête, par séquence."""
    vues = [s for s in SEQUENCES if s[0] in ('T1', 'T2', 'SWI-amplitude', 'TOF', 'DWI-b0')]
    fig, axes = plt.subplots(len(vues), 3, figsize=(10.5, 3.6 * len(vues)))
    for ligne, (code, nom, fichier, _, volume) in zip(axes, vues):
        m = tete_ras(fichier, volume)
        # RAS : axe 0 = gauche→droite, 1 = arrière→avant, 2 = bas→haut
        face = relief(m, 1, -1)                                           # regard depuis l'avant
        trois_quarts = relief(ndi.rotate(m.astype(np.uint8), 40, axes=(0, 1), reshape=True, order=0) > 0, 1, -1)
        profil = relief(m, 0, 1)                                          # regard depuis la gauche
        for a, im, titre in zip(ligne, (face, trois_quarts, profil), ('face', 'trois quarts', 'profil gauche')):
            a.imshow(np.rot90(im) if titre != 'profil gauche' else np.rot90(im)[:, ::-1], cmap='gray', vmin=0, vmax=1)
            a.set_title(f'{nom} : {titre}', fontsize=9)
            a.axis('off')
    fig.tight_layout()
    chemin = os.path.join(SORTIE, 'rendus-surface-visage.png')
    fig.savefig(chemin, dpi=80)
    plt.close(fig)
    return chemin


def planche_sequences():
    """Coupes centrales de chaque séquence dans les trois plans (orientation RAS, sans recalage)."""
    fig, axes = plt.subplots(len(SEQUENCES), 3, figsize=(10.5, 3.5 * len(SEQUENCES)))
    for ligne, (code, nom, fichier, _, volume) in zip(axes, SEQUENCES):
        img, v = charger(fichier, volume)
        img = nib.as_closest_canonical(nib.Nifti1Image(v, img.affine))
        v, z = np.asanyarray(img.dataobj), img.header.get_zooms()[:3]
        bas, haut = np.percentile(v, [1, 99.5])
        c = [s // 2 for s in v.shape]
        plans = (('axial', v[:, :, c[2]], z[1] / z[0]), ('coronal', v[:, c[1], :], z[2] / z[0]),
                 ('sagittal', v[c[0], :, :], z[2] / z[1]))
        for a, (plan, coupe, rapport) in zip(ligne, plans):
            a.imshow(np.rot90(coupe), cmap='gray', vmin=bas, vmax=haut, aspect=rapport)
            a.set_title(f'{nom} : {plan}', fontsize=9)
            a.axis('off')
    fig.tight_layout()
    chemin = os.path.join(SORTIE, 'sequences-coupes-centrales.png')
    fig.savefig(chemin, dpi=80)
    plt.close(fig)
    return chemin


def mip_tof():
    """Projections d'intensité maximale du TOF : montre la hauteur couverte par le bloc."""
    img, v = charger(P + 'angio.nii.gz')
    v = np.asanyarray(nib.as_closest_canonical(nib.Nifti1Image(v, img.affine)).dataobj)
    fig, axes = plt.subplots(1, 3, figsize=(15, 6), gridspec_kw={'width_ratios': [1, 1.4, 1.9]})
    for a, axe, titre in zip(axes, (2, 1, 0), ('MIP axiale', 'MIP coronale', 'MIP sagittale')):
        a.imshow(np.rot90(v.max(axis=axe)), cmap='gray', vmax=np.percentile(v, 99.9))
        a.set_title(f'ARM TOF 7 T : {titre}', fontsize=10)
        a.axis('off')
    fig.tight_layout()
    chemin = os.path.join(SORTIE, 'tof-mip.png')
    fig.savefig(chemin, dpi=70)
    plt.close(fig)
    return chemin


def ecrire_rapport(r):
    with open(os.path.join(SORTIE, 'rapport.json'), 'w', encoding='utf-8') as f:
        json.dump(r, f, ensure_ascii=False, indent=1)
    l = ['# Étape 1 : anonymisation de l\'examen studyforrest, sujet 01', '',
         'Licence : Open Data Commons PDDL (domaine public, usage commercial autorisé).', '',
         '## En-têtes NIfTI', '']
    for e in r['entetes']:
        l.append(f"- `{e['fichier']}` : {'×'.join(map(str, e['matrice']))}, voxels {' × '.join(map(str, e['voxel_mm']))} mm ; "
                 f"texte : {e['champs_texte'] or 'aucun'} ; extensions : {e['extensions'] or 'aucune'}"
                 + (f" ; **à vérifier : {e['a_verifier']}**" if e['a_verifier'] else ''))
    l += ['', '## Fichiers JSON', '']
    for j in r['json']:
        l.append(f"- `{j['fichier']}` : {', '.join(j['cles'])}"
                 + (f" ; **hors liste blanche : {j['hors_liste_blanche']}**" if j['hors_liste_blanche'] else ''))
    l += ['', f"participants.tsv : {r['participants']['colonnes']} colonnes ; sujet 01 : {r['participants']['sujet_01']} "
          '(non repris sur le site).', '', '## Texte incrusté (OCR)', '',
          f"Contrôle positif (faux nom incrusté en 9 px) : {'retrouvé' if r['ocr']['temoin']['reussi'] else 'MANQUÉ'} "
          f"({', '.join(r['ocr']['temoin']['lus'])}).",
          f"{r['ocr']['coupes_lues']} coupes lues ; {len(r['ocr']['detections'])} coupes avec un mot probable."]
    for d in r['ocr']['detections'][:40]:
        l.append(f"- {d['sequence']}, axe {d['axe']}, coupe {d['coupe']} : {', '.join(m['mot'] for m in d['mots'])}")
    l += ['', '## Effacement du visage', '']
    for m in r['masques']:
        if m['masque_fourni']:
            l.append(f"- {m['sequence']} : {m['part_effacee'] * 100:.1f} % du volume effacé ; "
                     f"voxels non nuls dans la zone effacée : {m['voxels_non_nuls_dans_zone_effacee']}")
        else:
            l.append(f"- {m['sequence']} : pas de masque fourni ; contrôle sur le rendu de surface")
    with open(os.path.join(SORTIE, 'rapport.md'), 'w', encoding='utf-8') as f:
        f.write('\n'.join(l) + '\n')


def main():
    telecharger()
    os.makedirs(SORTIE, exist_ok=True)
    entetes, json_, participants = verifier_entetes()
    masques = verifier_masques()
    print('rendus de surface…')
    images = [rendus_visage(), planche_sequences(), mip_tof()]
    print('OCR (quelques minutes)…')
    temoin = temoin_ocr()
    if not temoin['reussi']:
        sys.exit(f'contrôle OCR en échec : {temoin}')
    total, detections = verifier_texte()
    vignettes = vignettes_detections(detections)
    if vignettes:
        images.append(vignettes)
    rapport = {'examen': 'studyforrest (OpenNeuro ds000113), sujet 01', 'licence': 'ODC PDDL 1.0',
               'entetes': entetes, 'json': json_, 'participants': participants,
               'ocr': {'temoin': temoin, 'coupes_lues': total, 'detections': detections}, 'masques': masques,
               'images': [os.path.relpath(i, RACINE) for i in images]}
    ecrire_rapport(rapport)
    print(open(os.path.join(SORTIE, 'rapport.md'), encoding='utf-8').read())


if __name__ == '__main__':
    main()
