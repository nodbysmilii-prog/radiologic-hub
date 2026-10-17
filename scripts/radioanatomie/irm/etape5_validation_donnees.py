"""Radioanatomie IRM cérébrale, étapes 4 et 5 : données de l'interface de validation privée (studyforrest, sujet 01).

L'interface (validation/validation.html, publiée en page privée) affiche les séquences de l'étape 2 et les étiquettes
de l'étape 3. L'auteur y valide, corrige ou supprime chaque structure et y pose les points des structures manuelles
(étape 4) ; ses décisions sont enregistrées par la page, puis relues pour l'étape 6. Ce script prépare ses fichiers :
  - grille de 0,7 mm de l'étape 2 recadrée sur le cerveau (étiquettes comprises) élargi de 14 mm ;
  - séquences en octets (fenêtre écrite dans le manifeste, zéro hors de la tête) ; diffusion et minIP en coupes
    axiales seulement (choix de l'étape 2), diffusion sur une grille deux fois plus grossière (1,4 mm, moyenne de
    2 × 2 × 2 voxels : la diffusion est acquise à 1,7 × 1,7 × 2 mm) ;
  - couches d'étiquettes en octets (étiquettes fines renumérotées par une table) ; faisceaux de TractSeg sur leur
    grille de 1,25 mm, un bit par faisceau (9 plans d'octets) ;
  - chaque volume est écrit en mosaïques PNG en niveaux de gris (coupes axiales rangées en grille ; les pages
    publiées ne servent pas de fichiers binaires bruts, et le PNG compresse mieux que gzip ici), avec une somme de
    contrôle Adler-32 vérifiée par la page ;
  - manifest.json : grilles, séquences, couches et liste des structures (table de etiquettes.py, sans les lignes
    « non publié ») avec leur volume, un point intérieur et leur étendue dans chaque plan.
Clé d'une structure (enregistrements de la page) : « couche-valeurs » (fines-17, sillons-51, faisceaux-AF_left…),
« manuel-<nom sans accents> » pour les structures manuelles.
Sortie : assets-sources/radioanatomie/irm-cerebrale/etape5/donnees/ (non versionnée, publiée avec la page).
Usage : python3 -I -B scripts/radioanatomie/irm/etape5_validation_donnees.py   (depuis la racine du dépôt)
"""
import json, os, re, sys, unicodedata, zlib

import nibabel as nib
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

ICI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, ICI)
sys.path.insert(0, os.path.dirname(ICI))
import etiquettes
import preparer_territoires as territoires

RACINE = os.path.dirname(os.path.dirname(os.path.dirname(ICI)))
BASE = os.path.join(RACINE, 'assets-sources', 'radioanatomie', 'irm-cerebrale')
ETAPE2, ETAPE3 = os.path.join(BASE, 'etape2'), os.path.join(BASE, 'etape3')
FAISCEAUX = os.path.join(ETAPE3, 'tractseg', 'resultat', 'bundle_segmentations')
SORTIE = os.path.join(BASE, 'etape5', 'donnees')
PAS, MARGE_MM = 0.7, 14.0
TOUS = ['axial', 'coronal', 'sagittal']

# (fichier de l'étape 2, clé, nom affiché, plans, facteur de grille, fenêtre) ; fenêtre = (centile bas, centile haut,
# région des centiles) ou valeurs fixes (bas, haut, None)
SEQUENCES = [
    ('t1', 't1', '3D T1', TOUS, 1, (0.5, 99.7, 'cerveau')),
    ('t2', 't2', '3D T2', TOUS, 1, (0.5, 99.5, 'cerveau')),
    ('swi', 'swi', 'SWI', TOUS, 1, (0.5, 99.5, 'cerveau')),
    ('swi-minip-8mm', 'minip', 'SWI minIP (8 mm)', ['axial'], 1, (0.5, 99.5, 'cerveau')),
    ('tof', 'tof', 'ARM TOF 7 T', TOUS, 1, (1.0, 99.95, 'signal')),
    ('diffusion-trace', 'dwi', 'Diffusion (b = 800)', ['axial'], 2, (0.5, 99.7, 'cerveau')),
    ('diffusion-adc', 'adc', 'ADC (× 10⁻³ mm²/s)', ['axial'], 2, (0.0, 3.4, None)),
    ('diffusion-fa-couleur', 'fa', 'FA couleur', ['axial'], 2, (0.0, 99.7, 'cerveau')),
]
COUCHES = ['lobes', 'sillons', 'meninges', 'territoires', 'jonctions', 'arteres-tof']
# couleurs des territoires : celles de la couche « Territoires vasculaires » déjà en ligne (preparer_territoires.py)
COULEURS = {('territoires', i + d): c for i, _, _, _, _, c, _ in territoires.TERRITOIRES for d in (0, 1)}
COULEURS.update({('jonctions', 1): '#e9e9e9', ('jonctions', 2): '#ffcf5c'})


def lire(chemin):
    img = nib.load(chemin)
    return np.asanyarray(img.dataobj), img.affine


def fortran(v):
    return np.asfortranarray(v).tobytes(order='F')


def ecrire_volume(nom, v):
    """Volume d'octets (x, y, z[, canal]) en mosaïques PNG en niveaux de gris : coupe z = tuile de nx × ny pixels
    (ligne = y, colonne = x), C tuiles par ligne et R lignes par image (images de moins de 1 900 × 3 900 pixels,
    sous les limites des navigateurs de téléphone) ; un jeu d'images par canal. Adler-32 du volume en ordre Fortran
    (x le plus rapide, canaux à la suite) : la page vérifie qu'elle relit exactement les mêmes octets."""
    v = v[..., None] if v.ndim == 3 else v
    nx, ny, nz, nc = v.shape
    C, R = max(1, 1900 // nx), max(1, 3900 // ny)
    fichiers, octets, adler = [], 0, 1
    for c in range(nc):
        adler = zlib.adler32(fortran(v[..., c]), adler)
        for p, k0 in enumerate(range(0, nz, C * R)):
            ks = range(k0, min(nz, k0 + C * R))
            m = np.zeros((-(-len(ks) // C) * ny, C * nx), np.uint8)
            for t, k in enumerate(ks):
                tr, tc = divmod(t, C)
                m[tr * ny:(tr + 1) * ny, tc * nx:(tc + 1) * nx] = v[:, :, k, c].T
            f = f'{nom}-{c}-{p}.png'
            Image.fromarray(m, 'L').save(os.path.join(SORTIE, f), 'PNG', optimize=True)
            fichiers.append(f)
            octets += os.path.getsize(os.path.join(SORTIE, f))
    return {'fichiers': fichiers, 'tuiles': [C, R], 'canaux': nc, 'forme': [nx, ny, nz], 'adler32': adler,
            'octets': octets}


def boite(cerveau, fines):
    zone = cerveau | (fines > 0)
    idx = np.argwhere(zone)
    marge = int(round(MARGE_MM / PAS))
    lo = np.maximum(idx.min(0) - marge, 0)
    hi = np.minimum(idx.max(0) + marge + 1, np.array(zone.shape))
    return lo, hi


def masque_tete(t1, cerveau):
    """Tête = voxels du T1 au-dessus de 8 % du signal du cerveau, fermés (3 mm), trous bouchés, plus grande composante,
    dilatée de 2 mm ; sert seulement à mettre l'air à zéro (meilleure compression)."""
    seuil = 0.08 * np.percentile(t1[cerveau], 99)
    m = ndi.binary_closing(t1 > seuil, iterations=4)
    m = ndi.binary_fill_holes(m)
    lab, n = ndi.label(m)
    if n > 1:
        m = lab == (np.argmax(np.bincount(lab.ravel())[1:]) + 1)
    return ndi.binary_dilation(m, iterations=3) | cerveau


def reduire(v, f):
    """Moyenne de blocs f × f × f (bords complétés en répétant le dernier voxel)."""
    if f == 1:
        return v
    pad = [(0, (-n) % f) for n in v.shape[:3]] + [(0, 0)] * (v.ndim - 3)
    v = np.pad(v, pad, mode='edge')
    s = v.shape
    return v.reshape(s[0] // f, f, s[1] // f, f, s[2] // f, f, *s[3:]).mean(axis=(1, 3, 5))


def sequences(sl, tete, cerveau):
    sortie = []
    for fichier, cle, nom, plans, facteur, fen in SEQUENCES:
        v, _ = lire(os.path.join(ETAPE2, fichier + '.nii.gz'))
        v = np.asarray(v[sl], np.float32)
        canaux = v.shape[3] if v.ndim == 4 else 1
        tete_c = tete[..., None] if canaux > 1 else tete
        v = np.where(tete_c, v, 0)
        bas, haut, region = fen
        if region is not None:
            if region == 'signal':
                vals = v[tete & (v > 0)]
            else:
                vals = (v[cerveau] if canaux == 1 else v[cerveau].ravel())
            bas, haut = (float(np.percentile(vals, bas)) if bas > 0 else 0.0), float(np.percentile(vals, haut))
        v = reduire(v, facteur)
        o = np.clip(np.round((v - bas) / (haut - bas) * 255), 0, 255).astype(np.uint8)
        info = ecrire_volume(f'seq-{cle}', o)                       # FA couleur : canaux R, G, B
        info.update(id=cle, nom=nom, plans=plans, facteur=facteur, fenetre=[round(bas, 5), round(haut, 5)])
        print(f"  {nom:24s} {info['forme']} {info['octets'] / 1e6:6.2f} Mo  fenêtre {bas:.4g}–{haut:.4g}")
        sortie.append(info)
    return sortie


def bits_faisceaux(lo_mm, hi_mm):
    """Faisceaux de TractSeg (grille de 1,25 mm) recadrés sur la même boîte ; bit b dans le plan d'octets b // 8."""
    noms = sorted(f[:-7] for f in os.listdir(FAISCEAUX) if f.endswith('.nii.gz'))
    v0, a = lire(os.path.join(FAISCEAUX, noms[0] + '.nii.gz'))
    pas_f, orig = float(a[0, 0]), a[:3, 3]
    lo = np.maximum(np.floor((lo_mm - orig) / pas_f).astype(int), 0)
    hi = np.minimum(np.ceil((hi_mm - orig) / pas_f).astype(int) + 1, np.array(v0.shape))
    sl = tuple(slice(l, h) for l, h in zip(lo, hi))
    forme = tuple(int(h - l) for l, h in zip(lo, hi))
    plans = np.zeros(forme + (int(np.ceil(len(noms) / 8)),), np.uint8)
    masques = {}
    for b, nom in enumerate(noms):
        m = np.asanyarray(nib.load(os.path.join(FAISCEAUX, nom + '.nii.gz')).dataobj)[sl] > 0
        plans[..., b // 8] |= (m.astype(np.uint8) << (b % 8))
        masques[nom] = m
    info = ecrire_volume('faisceaux', plans)                       # un canal par plan de 8 faisceaux
    info.update(noms=noms, voxel_mm=pas_f, origine_mm=[round(float(x), 4) for x in orig + lo * pas_f])
    print(f"  faisceaux {len(noms)} {forme} {info['octets'] / 1e6:.2f} Mo")
    return info, masques


def sans_accents(texte):
    t = unicodedata.normalize('NFKD', texte.replace('æ', 'ae').replace('œ', 'oe'))
    t = ''.join(c for c in t if not unicodedata.combining(c)).lower()
    return re.sub(r'[^a-z0-9]+', '-', t).strip('-')[:150]


def etendue(m, decalage):
    """Point le plus intérieur (maximum de la distance au bord) et, par plan, [première, dernière, meilleure coupe]."""
    d = ndi.distance_transform_edt(np.pad(m, 1))[1:-1, 1:-1, 1:-1]
    centre = [int(c + o) for c, o in zip(np.unravel_index(np.argmax(d), m.shape), decalage)]
    plans = {}
    for nom, axe, autres in (('axial', 2, (0, 1)), ('coronal', 1, (0, 2)), ('sagittal', 0, (1, 2))):
        aire = m.sum(axis=autres)
        k = np.flatnonzero(aire)
        plans[nom] = [int(k[0] + decalage[axe]), int(k[-1] + decalage[axe]), int(np.argmax(aire) + decalage[axe])]
    return centre, plans


def structures(volumes, table_fines, faisceaux, masques_f, lo_mm):
    objets = {nom: ndi.find_objects(v.astype(np.int32)) for nom, v in volumes.items()}
    sortie, cles = [], set()
    vox_f = faisceaux['voxel_mm']
    for source, ident, outil, cat, nom, cote, statut, remarque, couche in etiquettes.lignes():
        if statut == 'non publié':
            continue
        s = {'nom': nom, 'cat': cat, 'cote': cote, 'source': source, 'statut': statut, 'outil': outil,
             'id_outil': ident, 'remarque': remarque}
        if couche is None:
            s['cle'] = 'manuel-' + sans_accents(nom)
        else:
            nom_c, vals = couche
            s['cle'] = f"{nom_c}-{'+'.join(map(str, vals))}"
            s['couche'] = nom_c
            if (nom_c, vals[0]) in COULEURS:
                s['couleur'] = COULEURS[(nom_c, vals[0])]
            if nom_c == 'faisceaux':
                s['valeurs'] = [faisceaux['noms'].index(v) for v in vals]
                m = np.zeros(faisceaux['forme'], bool)
                for v in vals:
                    m |= masques_f[v]
                pas_rel, decal = vox_f, faisceaux['origine_mm']
            else:
                vol = volumes[nom_c]
                idx = [table_fines.index(v) for v in vals] if nom_c == 'fines' else list(vals)
                s['valeurs'] = idx
                boites = [objets[nom_c][i - 1] for i in idx if i - 1 < len(objets[nom_c]) and objets[nom_c][i - 1]]
                if boites:
                    sl = tuple(slice(min(b[d].start for b in boites), max(b[d].stop for b in boites)) for d in range(3))
                    m = np.isin(vol[sl], idx)
                    decalage = [x.start for x in sl]
                else:
                    m = np.zeros((1, 1, 1), bool)
                    decalage = [0, 0, 0]
                pas_rel = None
            n = int(m.sum())
            if n == 0:
                s['absente'] = True
            elif pas_rel is None:
                s['vol'] = round(n * PAS ** 3)
                s['centre'], s['plans'] = etendue(m, decalage)
            else:                       # grille des faisceaux → grille de 0,7 mm recadrée
                s['vol'] = round(n * pas_rel ** 3)
                c, p = etendue(m, [0, 0, 0])
                vers = lambda i, axe: int(round((decal[axe] + i * pas_rel - lo_mm[axe]) / PAS))
                s['centre'] = [vers(c[a], a) for a in range(3)]
                axes = {'axial': 2, 'coronal': 1, 'sagittal': 0}
                s['plans'] = {pl: [vers(x, axes[pl]) for x in v] for pl, v in p.items()}
        assert s['cle'] not in cles, s['cle']
        cles.add(s['cle'])
        sortie.append(s)
    return sortie


def main():
    os.makedirs(SORTIE, exist_ok=True)
    for f in os.listdir(SORTIE):                     # sorties précédentes de ce script
        if f.endswith(('.png', '.gz', '.json')):
            os.remove(os.path.join(SORTIE, f))
    t1, a = lire(os.path.join(ETAPE2, 't1.nii.gz'))
    cerveau = np.asanyarray(nib.load(os.path.join(ETAPE3, 'cerveau.nii.gz')).dataobj) > 0
    fines, _ = lire(os.path.join(ETAPE3, 'etiquettes-fines.nii.gz'))
    lo, hi = boite(cerveau, fines)
    sl = tuple(slice(l, h) for l, h in zip(lo, hi))
    forme = [int(h - l) for l, h in zip(lo, hi)]
    lo_mm = (a @ np.r_[lo, 1])[:3]
    hi_mm = (a @ np.r_[hi - 1, 1])[:3]
    print('boîte', forme, 'origine', lo_mm)
    cerveau_c = cerveau[sl]
    tete = masque_tete(np.asarray(t1[sl], np.float32), cerveau_c)
    print('séquences…')
    seqs = sequences(sl, tete, cerveau_c)
    print('couches…')
    fines_c = np.asarray(fines[sl]).astype(np.int32)
    table = [int(x) for x in np.unique(fines_c)]
    assert table[0] == 0 and len(table) <= 256
    volumes = {'fines': np.searchsorted(table, fines_c).astype(np.uint8)}
    couches = {'fines': dict(ecrire_volume('couche-fines', volumes['fines']), table=table)}
    for nom in COUCHES:
        v, _ = lire(os.path.join(ETAPE3, nom + '.nii.gz'))
        v = np.asarray(v[sl])
        assert v.max() < 256
        cle = 'arteres' if nom == 'arteres-tof' else nom
        volumes[cle] = v.astype(np.uint8)
        couches[cle] = ecrire_volume(f'couche-{cle}', volumes[cle])
    for cle, c in couches.items():
        print(f"  {cle:12s} {c['octets'] / 1e6:6.2f} Mo")
    couches['faisceaux'], masques_f = bits_faisceaux(lo_mm, hi_mm)
    print('structures…')
    liste = structures(volumes, table, couches['faisceaux'], masques_f, lo_mm)
    manifeste = {
        'examen': 'studyforrest, sujet 01 (OpenNeuro ds000113, ODC PDDL)',
        'grille': {'forme': forme, 'voxel_mm': PAS, 'origine_mm': [round(float(x), 4) for x in lo_mm],
                   'repere': 'RAS (x vers la droite du patient), aligné CA-CP, coordonnées MNI'},
        'sequences': seqs, 'couches': couches, 'categories': etiquettes.CATEGORIES, 'structures': liste,
    }
    with open(os.path.join(SORTIE, 'manifest.json'), 'w', encoding='utf-8') as f:
        json.dump(manifeste, f, ensure_ascii=False, separators=(',', ':'))
    total = sum(os.path.getsize(os.path.join(SORTIE, f)) for f in os.listdir(SORTIE))
    absentes = [s['nom'] for s in liste if s.get('absente')]
    print(f"{len(liste)} structures ; absentes : {absentes} ; total {total / 1e6:.1f} Mo")


if __name__ == '__main__':
    main()
