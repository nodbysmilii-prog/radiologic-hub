"""Espace radioanatomie, module « TDM thoracique injectée » : prépare les images et les masques de référence.

Source (téléchargée à version figée dans assets-sources/tdm-thorax-totalsegmentator/, ignoré par git) :
  « Dataset with segmentations of 117 important anatomical structures in 1228 CT images », version 2.0.1
  (Wasserthal J. et al., TotalSegmentator, Hôpital universitaire de Bâle ; Zenodo, doi:10.5281/zenodo.10047292),
  licence CC BY 4.0 : scanners de routine clinique anonymisés, rééchantillonnés à 1,5 mm isotropes, avec des
  segmentations relues et corrigées par des radiologues (vérité terrain). Seuls le scanner retenu et ses masques
  utiles sont extraits de l'archive (23,6 Go) par requêtes HTTP Range ; leur empreinte SHA-256 est vérifiée.

Cas retenu : s0310 (femme de 23 ans, « ct thorax-neck », Siemens Somatom Definition Flash, 100 kV, sans pathologie
selon les métadonnées du jeu). Choisi parmi 9 scanners thoraciques sans pathologie pour : phase injectée mixte
vérifiée par les densités (médianes dans les masques de référence : aorte 165 UH, veines pulmonaires 156 UH,
cœur 168 UH, foie 64 UH), bruit faible, couverture du cou aux coupoles, cavités cardiaques différenciées.

Séries (convention radiologique : axial et coronal, droite du patient à gauche de l'écran ; sagittal, avant à
gauche ; images agrandies × 2 par interpolation Lanczos) :
  • ax-med : axiale, fenêtre médiastinale (largeur 400, centre 40) ;
  • ax-pulm : axiale, fenêtre parenchymateuse (largeur 1500, centre −600) ;
  • cor : coronale, fenêtre médiastinale ;  • sag : sagittale, fenêtre médiastinale.
Ordre de lecture : axial de haut en bas, coronal d'avant en arrière, sagittal de droite à gauche.
Cadrage : chaque série est recadrée sur le corps du patient (sans la table), sur toutes ses coupes.
Calque des lobes (PNG transparent par coupe, un dossier par plan) : les 5 lobes de la vérité terrain, scissures
soulignées (interface entre deux lobes).

Usage : python3 -I scripts/radioanatomie/preparer_tdm_thorax.py   (depuis la racine du dépôt)
Dépendances : numpy, scipy, nibabel, Pillow.
"""
import hashlib, json, os, struct, sys, urllib.request, zlib

import nibabel as nib
import numpy as np
from PIL import Image
from scipy import ndimage

RACINE = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SOURCES = os.path.join(RACINE, 'assets-sources', 'tdm-thorax-totalsegmentator')
SORTIE = os.path.join(RACINE, 'radioanatomie', 'donnees', 'thorax-tdm')
ARCHIVE = 'https://zenodo.org/records/10047292/files/Totalsegmentator_dataset_v201.zip?download=1'
CAS = 's0310'
ECHELLE = 2

# Masques de référence utilisés (noms du jeu de données)
MASQUES = [
    'trachea', 'esophagus', 'thyroid_gland',
    'lung_upper_lobe_right', 'lung_middle_lobe_right', 'lung_lower_lobe_right', 'lung_upper_lobe_left', 'lung_lower_lobe_left',
    'heart', 'atrial_appendage_left', 'aorta', 'brachiocephalic_trunk', 'common_carotid_artery_right', 'common_carotid_artery_left',
    'subclavian_artery_right', 'subclavian_artery_left', 'brachiocephalic_vein_right', 'brachiocephalic_vein_left',
    'superior_vena_cava', 'inferior_vena_cava', 'pulmonary_vein',
    'sternum', 'costal_cartilages', 'spinal_cord', 'scapula_right', 'scapula_left', 'clavicula_right', 'clavicula_left',
    'humerus_right', 'humerus_left', 'autochthon_right', 'autochthon_left', 'liver', 'stomach', 'spleen',
    'vertebrae_C6', 'vertebrae_C7', *[f'vertebrae_T{i}' for i in range(1, 13)], 'vertebrae_L1',
    *[f'rib_{c}_{i}' for c in ('right', 'left') for i in range(1, 13)],
]
EMPREINTES = json.load(open(os.path.join(os.path.dirname(__file__), 'tdm_thorax_empreintes.json'), encoding='utf-8'))

FENETRES = {'med': (40, 400), 'pulm': (-600, 1500)}
SERIES = [
    dict(id='ax-med', plan='axial', fenetre='med', pas=1, nom='Axiale médiastinale',
         description='TDM injectée, fenêtre médiastinale (L 400 / C 40), coupes de 1,5 mm'),
    dict(id='ax-pulm', plan='axial', fenetre='pulm', pas=1, nom='Axiale parenchymateuse',
         description='TDM injectée, fenêtre parenchymateuse (L 1500 / C −600), coupes de 1,5 mm'),
    dict(id='cor', plan='coronal', fenetre='med', pas=2, nom='Coronale',
         description='Reconstruction coronale, fenêtre médiastinale, une coupe tous les 3 mm'),
    dict(id='sag', plan='sagittal', fenetre='med', pas=2, nom='Sagittale',
         description='Reconstruction sagittale, fenêtre médiastinale, une coupe tous les 3 mm'),
]
LOBES = [  # masque, couleur du calque (RVB), opacité
    ('lung_upper_lobe_right', (242, 171, 47)), ('lung_middle_lobe_right', (84, 140, 108)), ('lung_lower_lobe_right', (60, 103, 184)),
    ('lung_upper_lobe_left', (241, 141, 37)), ('lung_lower_lobe_left', (42, 157, 143)),
]


# ---------- Téléchargement ----------
def plage(a, b):
    r = urllib.request.Request(ARCHIVE, headers={'Range': f'bytes={a}-{b}'})
    return urllib.request.urlopen(r, timeout=900).read()


def repertoire():
    """Répertoire central (ZIP64) de l'archive : nom → (méthode, taille compressée, taille, décalage)."""
    n = int(urllib.request.urlopen(urllib.request.Request(ARCHIVE, method='HEAD'), timeout=60).headers['Content-Length'])
    fin = plage(n - 70000, n - 1)
    j = fin.rfind(b'PK\x06\x06')
    taille, debut = struct.unpack('<QQ', fin[j + 40:j + 56])
    cd, p, ent = plage(debut, debut + taille - 1), 0, {}
    while cd[p:p + 4] == b'PK\x01\x02':
        meth = struct.unpack('<H', cd[p + 10:p + 12])[0]
        cs, us = struct.unpack('<II', cd[p + 20:p + 28])
        ln, le, lc = struct.unpack('<HHH', cd[p + 28:p + 34])
        off = struct.unpack('<I', cd[p + 42:p + 46])[0]
        nom, ex, q = cd[p + 46:p + 46 + ln].decode(), cd[p + 46 + ln:p + 46 + ln + le], 0
        while q < len(ex):
            hid, hs = struct.unpack('<HH', ex[q:q + 4]); d, k = ex[q + 4:q + 4 + hs], 0
            if hid == 1:
                if us == 0xFFFFFFFF: us = struct.unpack('<Q', d[k:k + 8])[0]; k += 8
                if cs == 0xFFFFFFFF: cs = struct.unpack('<Q', d[k:k + 8])[0]; k += 8
                if off == 0xFFFFFFFF: off = struct.unpack('<Q', d[k:k + 8])[0]; k += 8
            q += 4 + hs
        ent[nom] = (meth, cs, us, off); p += 46 + ln + le + lc
    return ent


def chemin(nom):
    return os.path.join(SOURCES, CAS, nom + '.nii.gz')


def telecharger():
    fichiers = ['ct'] + MASQUES
    manquants = [f for f in fichiers if not os.path.exists(chemin(f))]
    ent = repertoire() if manquants else {}
    for f in manquants:
        cle = f'{CAS}/ct.nii.gz' if f == 'ct' else f'{CAS}/segmentations/{f}.nii.gz'
        meth, cs, us, off = ent[cle]
        lh = plage(off, off + 29); lnl, lel = struct.unpack('<HH', lh[26:30])
        d = plage(off + 30 + lnl + lel, off + 30 + lnl + lel + cs - 1)
        if meth == 8: d = zlib.decompress(d, -15)
        os.makedirs(os.path.dirname(chemin(f)), exist_ok=True)
        open(chemin(f), 'wb').write(d)
    for f in fichiers:
        h = hashlib.sha256(open(chemin(f), 'rb').read()).hexdigest()
        if EMPREINTES.get(f) != h: sys.exit(f'{f} : empreinte inattendue {h}')


def charger(nom):
    v = nib.as_closest_canonical(nib.load(chemin(nom)))
    return v, np.asarray(v.dataobj)


# ---------- Affichage ----------
def coupe(a, plan, s):
    """Coupe s d'un volume RAS, orientée pour l'écran (convention radiologique)."""
    if plan == 'sagittal': return a[s].T[::-1, ::-1]          # haut = supérieur, gauche = antérieur
    if plan == 'coronal': return a[:, s, :].T[::-1, ::-1]     # haut = supérieur, gauche = droite du patient
    return a[:, :, s].T[::-1, ::-1]                          # haut = antérieur, gauche = droite du patient


AXE = {'sagittal': 0, 'coronal': 1, 'axial': 2}


def etendue(poumons, plan, pas):
    """Coupes affichées : les poumons et 12 mm autour (thorax de l'apex aux coupoles), dans la limite du volume."""
    k = AXE[plan]
    autres = tuple(i for i in range(3) if i != k)
    idx = np.nonzero(poumons.any(axis=autres))[0]
    marge = 8
    lo, hi = max(0, idx.min() - marge), min(poumons.shape[k] - 1, idx.max() + marge)
    if plan == 'axial':   # vers le haut : jusqu'au cou (orifice supérieur du thorax, thyroïde)
        hi = min(poumons.shape[k] - 1, idx.max() + 26)
    # ordre de lecture : de haut en bas (axial), d'avant en arrière (coronal), de droite à gauche (sagittal)
    return list(range(hi, lo - 1, -pas))


def cadrage(corps, plan, indices):
    """Rectangle (lignes, colonnes) de l'affichage qui contient le corps sur toutes les coupes de la série, + 6 voxels."""
    proj = np.zeros(coupe(corps, plan, indices[0]).shape, bool)
    for s in indices: proj |= coupe(corps, plan, s)
    rr, cc = np.nonzero(proj)
    h, w = proj.shape
    return [max(0, int(rr.min()) - 6), min(h, int(rr.max()) + 7), max(0, int(cc.min()) - 6), min(w, int(cc.max()) + 7)]


def main():
    telecharger()
    ct, a = charger('ct')
    a = a.astype(np.float32)
    # Corps du patient (sans la table d'examen) : plus grande composante > −300 UH, trous bouchés coupe par coupe
    lab, n = ndimage.label(a > -300)
    corps = lab == (int(np.argmax(ndimage.sum(np.ones_like(a), lab, range(1, n + 1)))) + 1)
    z = [float(x) for x in ct.header.get_zooms()[:3]]
    assert all(abs(x - 1.5) < 1e-3 for x in z), z
    lobes = {m: charger(m)[1] > 0 for m, _ in LOBES}
    poumons = np.zeros(a.shape, bool)
    for m in lobes.values(): poumons |= m
    # Calque des lobes (couleurs) et des scissures (interfaces entre lobes, 1 voxel)
    etiq = np.zeros(a.shape, np.uint8)
    for i, (m, _) in enumerate(LOBES, 1): etiq[lobes[m]] = i
    bord = np.zeros(a.shape, bool)
    for i in range(1, 6):
        dil = ndimage.binary_dilation(etiq == i, iterations=1)
        bord |= dil & (etiq > 0) & (etiq != i)
    palette = np.zeros((7, 4), np.uint8)
    for i, (_, c) in enumerate(LOBES, 1): palette[i] = (*c, 92)
    palette[6] = (255, 255, 255, 235)   # scissure

    os.makedirs(SORTIE, exist_ok=True)
    meta = []
    for S in SERIES:
        dossier = os.path.join(SORTIE, S['id']); os.makedirs(dossier, exist_ok=True)
        calque = os.path.join(SORTIE, S['plan'] + '-lobes'); os.makedirs(calque, exist_ok=True)
        c, w = FENETRES[S['fenetre']]
        indices = etendue(poumons, S['plan'], S['pas'])
        r0, r1, c0, c1 = cadre = cadrage(corps, S['plan'], indices)
        for n, s in enumerate(indices):
            im = coupe(a, S['plan'], s)[r0:r1, c0:c1]
            g = np.clip((im - (c - w / 2)) / w * 255, 0, 255).astype(np.uint8)
            I = Image.fromarray(g)
            I = I.resize((I.width * ECHELLE, I.height * ECHELLE), Image.LANCZOS)
            I.save(os.path.join(dossier, f'{n:03d}.jpg'), quality=86, optimize=True)
            e = coupe(etiq, S['plan'], s)[r0:r1, c0:c1].copy()
            e[coupe(bord, S['plan'], s)[r0:r1, c0:c1]] = 6
            rgba = palette[e]
            L = Image.fromarray(rgba, 'RGBA').resize((I.width, I.height), Image.NEAREST)
            L.save(os.path.join(calque, f'{n:03d}.png'), optimize=True)
        h, l = r1 - r0, c1 - c0
        meta.append(dict(S, calque=S['plan'] + '-lobes', cadre=cadre, largeur=l * ECHELLE, hauteur=h * ECHELLE, pixel_mm=round(1.5 / ECHELLE, 4), epaisseur_mm=1.5 * S['pas'],
                         coupes=len(indices), indices=indices))
        print(S['id'], len(indices), 'coupes', f'{l * ECHELLE}×{h * ECHELLE}')
    json.dump(dict(cas=CAS, forme=list(a.shape), voxel_mm=z, series=meta), open(os.path.join(SORTIE, 'series.json'), 'w', encoding='utf-8'),
              ensure_ascii=False, indent=1)


if __name__ == '__main__':
    main()
