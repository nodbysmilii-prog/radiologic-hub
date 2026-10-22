"""Espace radioanatomie : prépare les images du module « IRM du genou ».

Source (téléchargée à version figée dans assets-sources/irm-genou-totalsegmentator/, ignoré par git) :
  « TotalSegmentator MRI dataset », version 3.0.0 (Wasserthal J. et al., Département de recherche et d'analyse,
  Hôpital universitaire de Bâle ; Zenodo, doi:10.5281/zenodo.22688334), licence CC BY 4.0 :
  IRM de routine clinique anonymisées. Seuls les fichiers mri.nii.gz des cas retenus sont extraits de
  l'archive par requêtes HTTP Range (l'archive complète fait 15 Go) ; leur empreinte SHA-256 est vérifiée.

Séries retenues (une par pondération et par plan, patients différents ; choix après revue de toutes les coupes
des 67 IRM du genou du jeu de données : examens d'adultes sans anomalie visible) :
  • sagittale DP (densité de protons), cas s0536 ;   • coronale T1, cas s0083 ;
  • coronale DP avec saturation de la graisse, cas s0105 ;   • axiale T2, cas s0392.

Traitement : orientation RAS (nibabel), coupes dans le plan d'acquisition, présentées selon la convention
radiologique (axial et coronal : droite du patient à gauche de l'écran ; sagittal : avant à gauche, haut en
haut), fenêtrage linéaire entre les centiles 0,5 et 99,6 du volume (hors fond), export JPEG (qualité 88),
pixels carrés d'origine (pas de rééchantillonnage). Les repères anatomiques sont posés à part
(radioanatomie/donnees/genou-irm/reperes-source/) et assemblés par construire_atlas_genou.py.

Usage : python3 -I scripts/radioanatomie/preparer_genou.py   (depuis la racine du dépôt)
Dépendances : numpy, nibabel, Pillow.
"""
import hashlib, json, os, struct, sys, urllib.request, zlib

import nibabel as nib
import numpy as np
from PIL import Image

RACINE = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SOURCES = os.path.join(RACINE, 'assets-sources', 'irm-genou-totalsegmentator')
SORTIE = os.path.join(RACINE, 'radioanatomie', 'donnees', 'genou-irm')

ARCHIVE = 'https://zenodo.org/records/22688334/files/TotalsegmentatorMRI_dataset_v300.zip?download=1'
CAS = {   # empreinte SHA-256 du fichier mri.nii.gz extrait
    's0536': '216ff5357008e6dcd9f7da87d272fcef5edd4f2d2c4de2bcf3d0912c4e75c727',
    's0083': '38c0edde909f470da2a37ecfaf538f6ebd80ca2fe8df74102b9c2f10f3f1e1db',
    's0105': '421c015b2aea4bc8a1ac67be836b38bedc00c43a703dbc586e70c9b96656e64a',
    's0392': 'f429adc8d7459ccefd65077d844013a19d530a7a44de02bbab8852746eaf8405',
}
# cote : genou droit ou gauche (vérifié sur la position de la fibula, latérale)
SERIES = [
    dict(id='sag-dp', cas='s0536', nom='Sagittale DP', plan='sagittal', ponderation='DP',
         description='Densité de protons (TSE), coupes de 3,3 mm, 1,5 T', cote='gauche'),
    dict(id='cor-t1', cas='s0083', nom='Coronale T1', plan='coronal', ponderation='T1',
         description='T1 (SE), coupes de 3,5 mm, 3 T', cote='droit'),
    dict(id='cor-dp-fs', cas='s0105', nom='Coronale DP FS', plan='coronal', ponderation='DP FS',
         description='Densité de protons avec saturation de la graisse (TSE), coupes de 3,6 mm, 3 T', cote='droit'),
    dict(id='ax-t2', cas='s0392', nom='Axiale T2', plan='axial', ponderation='T2',
         description='T2 (TSE), coupes de 4,4 mm, 3 T', cote='gauche'),
]
AXE = {'sagittal': 0, 'coronal': 1, 'axial': 2}


def plage(a, b):
    r = urllib.request.Request(ARCHIVE, headers={'Range': f'bytes={a}-{b}'})
    return urllib.request.urlopen(r, timeout=600).read()


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


def telecharger():
    os.makedirs(SOURCES, exist_ok=True)
    manquants = [c for c in CAS if not os.path.exists(os.path.join(SOURCES, c + '.nii.gz'))]
    ent = repertoire() if manquants else {}
    for c in manquants:
        meth, cs, us, off = ent[f'Totalsegmentator_dataset_v300/{c}/mri.nii.gz']
        lh = plage(off, off + 29); lnl, lel = struct.unpack('<HH', lh[26:30])
        d = plage(off + 30 + lnl + lel, off + 30 + lnl + lel + cs - 1)
        if meth == 8: d = zlib.decompress(d, -15)
        open(os.path.join(SOURCES, c + '.nii.gz'), 'wb').write(d)
    for c, h in CAS.items():
        got = hashlib.sha256(open(os.path.join(SOURCES, c + '.nii.gz'), 'rb').read()).hexdigest()
        if got != h: sys.exit(f'{c} : empreinte inattendue {got}')


def coupe_affichee(a, plan, s):
    """Coupe s du volume RAS a, orientée pour l'écran (lignes de haut en bas, colonnes de gauche à droite)."""
    if plan == 'sagittal': return a[s].T[::-1, ::-1]          # haut = supérieur, gauche = antérieur
    if plan == 'coronal': return a[:, s, :].T[::-1, ::-1]     # haut = supérieur, gauche = droite du patient
    return a[:, :, s].T[::-1, ::-1]                          # haut = antérieur, gauche = droite du patient


def exporter():
    os.makedirs(SORTIE, exist_ok=True)
    meta = []
    for S in SERIES:
        v = nib.as_closest_canonical(nib.load(os.path.join(SOURCES, S['cas'] + '.nii.gz')))
        a = np.asarray(v.dataobj, dtype=np.float32); z = [float(x) for x in v.header.get_zooms()[:3]]
        k = AXE[S['plan']]
        assert int(np.argmax(z)) == k, (S['id'], z)
        fond = a > np.percentile(a, 20)
        bas, haut = np.percentile(a[fond], [0.5, 99.6])
        dossier = os.path.join(SORTIE, S['id']); os.makedirs(dossier, exist_ok=True)
        n = a.shape[k]
        for s in range(n):
            im = coupe_affichee(a, S['plan'], s)
            g = np.clip((im - bas) / (haut - bas) * 255, 0, 255).astype(np.uint8)
            Image.fromarray(g).save(os.path.join(dossier, f'{s:02d}.jpg'), quality=88, optimize=True)
        h, w = coupe_affichee(a, S['plan'], 0).shape
        px = {'sagittal': (z[1], z[2]), 'coronal': (z[0], z[2]), 'axial': (z[0], z[1])}[S['plan']]
        assert abs(px[0] - px[1]) < 1e-3, (S['id'], px)
        # position de chaque coupe le long de l'axe (mm, repère RAS du patient)
        pos = [float((v.affine @ np.array([*(s if i == k else 0 for i in range(3)), 1]))[k]) for s in range(n)]
        meta.append(dict(S, largeur=w, hauteur=h, pixel_mm=round(px[0], 4), epaisseur_mm=round(z[k], 2), coupes=n,
                         positions_mm=[round(p, 1) for p in pos]))
        print(S['id'], S['cas'], f'{n} coupes', f'{w}×{h}', f'{px[0]:.3f} mm/pixel')
    json.dump(meta, open(os.path.join(SORTIE, 'series.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)


if __name__ == '__main__':
    telecharger()
    exporter()
