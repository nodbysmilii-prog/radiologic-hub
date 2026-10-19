"""Radioanatomie IRM cérébrale : audit des structures de l'interface de validation contre les atlas de référence.

Entrées : données de l'interface (etape5/donnees : exactement ce que l'auteur voit), CerebrA et Harvard-Oxford reportés
sur le sujet (audit_atlas.py recalage), points de l'auteur (export de la base de la page, facultatif).
Pour chaque structure publiée :
  - correspondance avec les atlas : table écrite ci-dessous (CORRESPONDANCES_*), à relire par l'auteur ; type
    « égal » (même structure : Dice), « partie » (la structure est une partie de l'étiquette de l'atlas : part de ses
    voxels dans l'étiquette), « groupe » (réunion de régions, comparée sur le cortex seul : Dice) ; pour le cortex,
    Harvard-Oxford ne suit pas le protocole DKT : on mesure la part des voxels corticaux de la structure (dans le
    cortex de Harvard-Oxford) qui tombe dans les régions Harvard-Oxford correspondantes ;
  - mesure globale et mesure dans les trois plans (coupes axiale, coronale et sagittale de référence de la
    structure, celles que l'interface affiche) ; verdicts : concordant ≥ seuil haut, partiel ≥ seuil bas, sinon
    discordant (SEUILS) ;
  - coordonnées MNI-ICBM2009c (symétrique) du centre et des trois coupes, par la transformation du recalage ;
    contrôle de latéralité (gauche : x < 0 ; droit : x > 0) ;
  - niveau de confiance : « élevée » (tous les atlas disponibles concordants, aucun plan discordant), « moyenne »
    (partiel quelque part), « faible » (discordant quelque part), « hors atlas » (aucune étiquette de CerebrA ni de
    Harvard-Oxford ; la structure garde sa source : outil, règle ou points de l'auteur), « à placer » (structure
    manuelle sans point). Seule « élevée » vaut certitude ; les autres sont listées dans le rapport.
Sorties (versionnées, sans aucune donnée d'atlas) : audit/labels/<clé>.json (un fichier « source de vérité » par
structure), audit/tableau-labels.csv et .md, audit/synthese.json ; captures de contrôle (contours CerebrA et
Harvard-Oxford, usage interne) dans assets-sources/…/audit/captures/.
Usage : python3 -I -B scripts/radioanatomie/irm/audit_labels.py [audit] [captures] [--points <dossier statuts>]
"""
import csv, glob, json, os, re, sys, zlib

import nibabel as nib
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy import ndimage as ndi

ICI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, ICI)
import audit_atlas as A
import etiquettes
import noms_anglais

DONNEES = os.path.join(A.BASE, 'etape5', 'donnees')
DEPOT = os.path.join(ICI, 'audit')
CAPTURES = os.path.join(A.SORTIE, 'captures')
PAS = 0.7
CONVENTION = ("vue radiologique : droite du patient à gauche de l'écran en axial et en coronal ; avant à gauche en "
              "sagittal ; lettres D et G sur l'image")
SEUILS = {'égal': (0.6, 0.4), 'groupe': (0.6, 0.4), 'partie': (0.8, 0.6), 'cortex HO': (0.6, 0.4)}
GAUCHE_ASEG = {4, 5, 7, 8, 10, 11, 12, 13, 17, 18, 26, 28, 31}

# --- correspondances avec CerebrA (nom de l'étiquette ; côté pris de la structure, « deux » = les deux côtés) ---
ASEG_CEREBRA = {4: 'Lateral Ventricle', 43: 'Lateral Ventricle', 5: 'Inferior Lateral Ventricle',
                44: 'Inferior Lateral Ventricle', 7: 'Cerebellum White Matter', 46: 'Cerebellum White Matter',
                8: 'Cerebellum Gray Matter', 47: 'Cerebellum Gray Matter', 10: 'Thalamus', 49: 'Thalamus',
                11: 'Caudate', 50: 'Caudate', 12: 'Putamen', 51: 'Putamen', 13: 'Pallidum', 52: 'Pallidum',
                17: 'Hippocampus', 53: 'Hippocampus', 18: 'Amygdala', 54: 'Amygdala', 26: 'Accumbens Area',
                58: 'Accumbens Area', 14: 'Third Ventricle', 15: 'Fourth Ventricle'}
HYPVINN_CEREBRA = {967: ('égal', ['Optic Chiasm']), 968: ('égal', ['Optic Chiasm']),
                   964: ('partie', ['Optic Chiasm']), 965: ('partie', ['Optic Chiasm']),      # « OC and tracts »
                   963: ('partie', ['Ventral Diencephalon']), 966: ('partie', ['Ventral Diencephalon'])}
HYPOTHALAMUS = (977, 978, 979, 980, 981, 982, 983, 984)
VERMIS_CEREBRA = {606: 'Vermal lobules VI-VII', 630: 'Vermal lobules VI-VII', 631: 'Vermal lobules VIII-X',
                  624: 'Vermal lobules VIII-X', 627: 'Vermal lobules VIII-X'}
# --- Harvard-Oxford sous-cortical (nom sans le côté) ---
ASEG_HO = {10: 'Thalamus', 49: 'Thalamus', 11: 'Caudate', 50: 'Caudate', 12: 'Putamen', 51: 'Putamen',
           13: 'Pallidum', 52: 'Pallidum', 17: 'Hippocampus', 53: 'Hippocampus', 18: 'Amygdala', 54: 'Amygdala',
           26: 'Accumbens', 58: 'Accumbens', 4: 'Lateral Ventric', 43: 'Lateral Ventric',
           2: 'Cerebral White Matter', 41: 'Cerebral White Matter'}
# --- régions DKT → régions corticales de Harvard-Oxford (début des noms, sans le côté) : correspondance des
#     nomenclatures écrite pour l'audit, à relire ---
DKT_HO = {
    'superiorfrontal': ['Superior Frontal Gyrus', 'Frontal Medial Cortex', 'Juxtapositional Lobule', 'Paracingulate',
                        'Frontal Pole'],
    'caudalmiddlefrontal': ['Middle Frontal Gyrus'],
    'rostralmiddlefrontal': ['Middle Frontal Gyrus', 'Frontal Pole'],
    'parsopercularis': ['Inferior Frontal Gyrus, pars opercularis', 'Frontal Operculum'],
    'parstriangularis': ['Inferior Frontal Gyrus, pars triangularis', 'Frontal Operculum'],
    'parsorbitalis': ['Frontal Orbital Cortex', 'Inferior Frontal Gyrus, pars triangularis', 'Frontal Pole'],
    'lateralorbitofrontal': ['Frontal Orbital Cortex', 'Frontal Pole'],
    'medialorbitofrontal': ['Frontal Medial Cortex', 'Frontal Orbital Cortex', 'Subcallosal', 'Frontal Pole'],
    'precentral': ['Precentral Gyrus', 'Central Opercular'],
    'paracentral': ['Precentral Gyrus', 'Postcentral Gyrus', 'Juxtapositional Lobule'],
    'postcentral': ['Postcentral Gyrus', 'Central Opercular', 'Parietal Operculum'],
    'supramarginal': ['Supramarginal Gyrus', 'Parietal Operculum', 'Angular Gyrus'],
    'superiorparietal': ['Superior Parietal Lobule', 'Lateral Occipital Cortex, superior', 'Precuneous'],
    'inferiorparietal': ['Angular Gyrus', 'Lateral Occipital Cortex, superior', 'Supramarginal Gyrus, posterior'],
    'precuneus': ['Precuneous'],
    'superiortemporal': ['Superior Temporal Gyrus', 'Planum Polare', 'Planum Temporale', 'Temporal Pole'],
    'middletemporal': ['Middle Temporal Gyrus', 'Temporal Pole'],
    'inferiortemporal': ['Inferior Temporal Gyrus', 'Temporal Pole'],
    'transversetemporal': ["Heschl", 'Planum Temporale'],
    'fusiform': ['Temporal Fusiform', 'Temporal Occipital Fusiform', 'Occipital Fusiform'],
    'entorhinal': ['Parahippocampal Gyrus, anterior', 'Temporal Pole'],
    'parahippocampal': ['Parahippocampal Gyrus'],
    'lateraloccipital': ['Lateral Occipital Cortex', 'Occipital Pole', 'Occipital Fusiform'],
    'lingual': ['Lingual Gyrus', 'Intracalcarine'],
    'cuneus': ['Cuneal', 'Supracalcarine', 'Occipital Pole'],
    'pericalcarine': ['Intracalcarine', 'Supracalcarine', 'Occipital Pole'],
    'rostralanteriorcingulate': ['Cingulate Gyrus, anterior', 'Paracingulate', 'Subcallosal'],
    'caudalanteriorcingulate': ['Cingulate Gyrus, anterior', 'Paracingulate'],
    'posteriorcingulate': ['Cingulate Gyrus, posterior', 'Cingulate Gyrus, anterior'],
    'isthmuscingulate': ['Cingulate Gyrus, posterior', 'Precuneous'],
    'insula': ['Insular Cortex'],
}
# régions Harvard-Oxford rangées par lobe (même table, relue par l'auteur) ; « temporo-occipital » : ni l'un ni l'autre
HO_LOBES = {
    'frontal': ['Frontal Pole', 'Superior Frontal Gyrus', 'Middle Frontal Gyrus', 'Inferior Frontal Gyrus',
                'Precentral Gyrus', 'Frontal Medial Cortex', 'Juxtapositional Lobule', 'Frontal Orbital Cortex',
                'Frontal Operculum'],
    'pariétal': ['Postcentral Gyrus', 'Superior Parietal Lobule', 'Supramarginal Gyrus', 'Angular Gyrus',
                 'Precuneous', 'Parietal Operculum'],
    'temporal': ['Temporal Pole', 'Superior Temporal Gyrus', 'Middle Temporal Gyrus, anterior',
                 'Middle Temporal Gyrus, posterior', 'Inferior Temporal Gyrus, anterior',
                 'Inferior Temporal Gyrus, posterior', 'Temporal Fusiform Cortex', 'Parahippocampal Gyrus',
                 'Planum Polare', 'Heschl', 'Planum Temporale'],
    'occipital': ['Lateral Occipital Cortex', 'Intracalcarine', 'Cuneal', 'Lingual Gyrus', 'Occipital Fusiform',
                  'Supracalcarine', 'Occipital Pole'],
    'insula': ['Insular Cortex'],
    'cingulaire': ['Cingulate Gyrus', 'Paracingulate'],
    'temporo-occipital': ['Middle Temporal Gyrus, temporooccipital', 'Inferior Temporal Gyrus, temporooccipital',
                          'Temporal Occipital Fusiform'],
}
LOBE_HO = {"Lobe frontal {c}": 'frontal', "Lobe pariétal {c}": 'pariétal', "Lobe temporal {c}": 'temporal',
           "Lobe occipital {c}": 'occipital', "Lobe de l'insula {c}": 'insula', "Cortex cingulaire {c}": 'cingulaire',
           "Lobe limbique {c}": 'cingulaire'}


# ---------------------------------------------------------------------------------------------------------------
# Lecture
# ---------------------------------------------------------------------------------------------------------------
def lire_couche(info):
    nx, ny, nz = info['forme']
    C, R = info['tuiles']
    v = np.zeros((nx, ny, nz), np.uint8)
    for p, f in enumerate(info['fichiers']):
        m = np.asarray(Image.open(os.path.join(DONNEES, f)))
        for t in range(C * R):
            k = p * C * R + t
            if k >= nz:
                break
            tr, tc = divmod(t, C)
            v[:, :, k] = m[tr * ny:(tr + 1) * ny, tc * nx:(tc + 1) * nx].T
    if zlib.adler32(np.asfortranarray(v).tobytes(order='F')) != info['adler32']:
        sys.exit('somme de contrôle inattendue : ' + info['fichiers'][0])
    return v


def donnees():
    m = json.load(open(os.path.join(DONNEES, 'manifest.json'), encoding='utf-8'))
    vols = {c: lire_couche(i) for c, i in m['couches'].items() if c != 'faisceaux'}
    t1 = lire_couche(next(s for s in m['sequences'] if s['id'] == 't1'))
    a = nib.load(os.path.join(A.etape2.SORTIE, 't1.nii.gz')).affine
    lo = np.rint((np.asarray(m['grille']['origine_mm']) - a[:3, 3]) / np.diag(a)[:3]).astype(int)
    forme = m['grille']['forme']
    sl = tuple(slice(l, l + n) for l, n in zip(lo, forme))
    atlas = {c: np.asarray(nib.load(os.path.join(A.SORTIE, c + '.nii.gz')).dataobj)[sl]
             for c in ('cerebra', 'ho-cortical', 'ho-souscortical')}
    return m, vols, t1, atlas, a, lo


def tables():
    cer = []
    with open(os.path.join(A.REFERENCES, A.SYM + '_atlas-CerebA_dseg.tsv'), encoding='utf-8') as f:
        for r in csv.DictReader(f, delimiter='\t'):
            cer.append({'id': int(r['label']), 'nom': r['name'].strip(), 'cote': r['hemi'],
                        'freesurfer': int(r['mindboggle mapping'])})
    def ho(fichier, decalage):
        sortie = {}
        with open(os.path.join(A.REFERENCES, fichier), encoding='utf-8') as f:
            for r in csv.DictReader(f, delimiter='\t'):
                nom = r['name'].strip()
                if nom == 'Background':
                    continue
                cote = 'L' if nom.startswith('Left ') else 'R' if nom.startswith('Right ') else ''
                sortie[int(r['index']) + decalage] = {'nom': re.sub(r'^(Left|Right) ', '', nom), 'cote': cote,
                                                      'nom_complet': nom}
        return sortie
    return cer, ho('tpl-MNI152NLin6Asym_atlas-HOCPAL_dseg.tsv', 1), ho('tpl-MNI152NLin6Asym_atlas-HOSPA_dseg.tsv', 0)


# ---------------------------------------------------------------------------------------------------------------
# Correspondances
# ---------------------------------------------------------------------------------------------------------------
def cote_lettre(s):
    c = s.get('cote', '')
    return 'L' if c.startswith('gauche') else 'R' if c.startswith('droit') else ''


def ids_fines(s, table):
    return [table[v] for v in s['valeurs']] if s.get('couche') == 'fines' else []


def references(s, table, cer, hoc, hos):
    """Liste de références : dict(atlas, type, ids, noms, restreindre)."""
    refs = []
    cote = cote_lettre(s)
    def cerebra(type_, noms, cotes=None, restreindre=None):
        cotes = cotes or ([cote] if cote else ['L', 'R'])
        ids = [r['id'] for r in cer if r['nom'] in noms and r['cote'] in cotes]
        if ids:
            refs.append({'atlas': 'CerebrA', 'type': type_, 'ids': ids, 'restreindre': restreindre,
                         'noms': sorted({f"{r['nom']} ({r['cote']})" for r in cer if r['id'] in ids})})
    def ho_sous(type_, debut):
        ids = [i for i, r in hos.items() if r['nom'].startswith(debut) and (not cote or r['cote'] in (cote, ''))]
        if ids:
            refs.append({'atlas': 'Harvard-Oxford', 'type': type_, 'ids': ids, 'restreindre': None,
                         'noms': [hos[i]['nom_complet'] for i in ids], 'couche': 'ho-souscortical'})
    def ho_cortex(debuts):
        ids = [i for i, r in hoc.items() if any(r['nom'].startswith(d) for d in debuts) and r['cote'] == cote]
        refs.append({'atlas': 'Harvard-Oxford', 'type': 'cortex HO', 'ids': ids, 'restreindre': None,
                     'noms': sorted({hoc[i]['nom_complet'] for i in ids}), 'couche': 'ho-cortical'})
    ids = ids_fines(s, table)
    couche, vals = s.get('couche'), s.get('valeurs', [])
    if couche == 'fines' and len(ids) == 1:
        i = ids[0]
        if 1000 <= i < 3000:
            fs = i if i >= 2000 else i + 1000
            noms = [r['nom'] for r in cer if r['freesurfer'] == fs]
            cerebra('égal', noms, ['R' if i >= 2000 else 'L'])
            region = s['outil'].split('-', 2)[2]
            if region in DKT_HO:
                ho_cortex(DKT_HO[region])
        elif i in ASEG_CEREBRA:
            cerebra('égal', [ASEG_CEREBRA[i]], None if i in (14, 15) else ['L' if i in GAUCHE_ASEG else 'R'])
        if i in ASEG_HO:
            ho_sous('égal', ASEG_HO[i])
        if i == 16:
            ho_sous('égal', 'Brainstem')
        if i in HYPVINN_CEREBRA:
            t, noms = HYPVINN_CEREBRA[i]
            cerebra(t, noms)
        if i in HYPOTHALAMUS:
            cerebra('partie', ['Ventral Diencephalon'])
        if i in VERMIS_CEREBRA:
            cerebra('partie', [VERMIS_CEREBRA[i]], ['L', 'R'])
        if 601 <= i <= 628 and i not in VERMIS_CEREBRA:
            cerebra('partie', ['Cerebellum Gray Matter'])
    elif couche == 'fines' and set(ids) <= set(HYPOTHALAMUS):
        cerebra('partie', ['Ventral Diencephalon'])
    elif couche == 'fines' and all(601 <= i <= 632 for i in ids):
        cerebra('partie', ['Cerebellum Gray Matter', 'Vermal lobules I-V', 'Vermal lobules VI-VII',
                           'Vermal lobules VIII-X'], ['L', 'R'])
    elif couche == 'lobes':
        v = set(vals)
        lobes_g = {n + b: (mod, regs) for n, (mod, _, regs, _) in enumerate(etiquettes.LOBES, start=1) for b in (0, 10)}
        if len(v) == 1 and next(iter(v)) in lobes_g:
            mod, regs = lobes_g[next(iter(v))]
            noms = [r['nom'] for r in cer if r['freesurfer'] in {2000 + n for n, nom, *_ in etiquettes.DKT if nom in regs}]
            cerebra('groupe', noms, restreindre='cortex')
            if mod in LOBE_HO:
                ho_cortex(HO_LOBES[LOBE_HO[mod]])
        elif v in ({1, 2, 3, 4, 5, 6, 9}, {11, 12, 13, 14, 15, 16, 19}):
            noms = [r['nom'] for r in cer if r['freesurfer'] >= 1000 or r['nom'] in
                    ('Caudate', 'Putamen', 'Pallidum', 'Hippocampus', 'Amygdala', 'Accumbens Area', 'Basal Forebrain')]
            cerebra('groupe', noms, restreindre='gris')
        elif v in ({8}, {18}):
            cerebra('égal', ['Cerebellum Gray Matter', 'Cerebellum White Matter'])
        elif v == {8, 18, 24}:
            cerebra('égal', ['Cerebellum Gray Matter', 'Cerebellum White Matter', 'Vermal lobules I-V',
                             'Vermal lobules VI-VII', 'Vermal lobules VIII-X'], ['L', 'R'])
        elif v == {24}:
            cerebra('égal', ['Vermal lobules VI-VII', 'Vermal lobules VIII-X'], ['L', 'R'])
        elif v <= {21, 22, 23}:
            cerebra('partie', ['Brainstem'], ['L', 'R'])
            ho_sous('partie', 'Brainstem')
        elif v == {22, 23, 8, 18, 24}:
            cerebra('partie', ['Brainstem', 'Cerebellum Gray Matter', 'Cerebellum White Matter', 'Vermal lobules I-V',
                               'Vermal lobules VI-VII', 'Vermal lobules VIII-X'], ['L', 'R'])
    return refs


# ---------------------------------------------------------------------------------------------------------------
# Mesures
# ---------------------------------------------------------------------------------------------------------------
def mesure(ref, nous, atlas, cortex, gris_nous):
    r = np.isin(atlas[ref.get('couche', 'cerebra')], ref['ids'])
    n = nous
    if ref['restreindre'] == 'cortex':
        n = nous & cortex
    elif ref['restreindre'] == 'gris':
        n = nous & gris_nous
    if ref['type'] == 'cortex HO':
        dans = n & (atlas['ho-cortical'] > 0)
        tot = int(dans.sum())
        return (float((dans & r).sum()) / tot) if tot else None
    if ref['type'] == 'partie':
        tot = int(n.sum())
        return float((n & r).sum()) / tot if tot else None
    tot = int(n.sum() + r.sum())
    return 2.0 * float((n & r).sum()) / tot if tot else None


def verdict(type_, x):
    if x is None:
        return 'non mesurable'
    hi, lo = SEUILS[type_]
    return 'concordant' if x >= hi else 'partiel' if x >= lo else 'discordant'


def tranche(v, plan, p):
    i, j, k = p
    return v[:, :, k] if plan == 'axial' else v[:, j, :] if plan == 'coronal' else v[i, :, :]


def mm(a, lo, ijk):
    return (a[:3, :3] @ (np.asarray(ijk, float) + lo) + a[:3, 3]).round(1)


def audit(dossier_points=None):
    m, vols, t1, atlas, a, lo = donnees()
    table = m['couches']['fines']['table']
    cer, hoc, hos = tables()
    fines_ids = np.asarray(table)[vols['fines']]
    cortex = (fines_ids >= 1000) & (fines_ids < 3000)
    gris_nous = ~np.isin(fines_ids, (2, 41, 0))
    points_auteur = {}
    if dossier_points:
        for f in glob.glob(os.path.join(dossier_points, '*.json')):
            d = json.load(open(f, encoding='utf-8'))
            if d.get('points'):
                points_auteur[os.path.basename(f)[:-5]] = d['points']
    os.makedirs(os.path.join(DEPOT, 'labels'), exist_ok=True)
    for f in glob.glob(os.path.join(DEPOT, 'labels', '*.json')):
        os.remove(f)
    lignes, entrees = [], []
    # points à convertir en MNI (un seul appel)
    a_convertir = []
    for s in m['structures']:
        if 'centre' in s:
            a_convertir.append(mm(a, lo, s['centre']))
            for plan in ('axial', 'coronal', 'sagittal'):
                a_convertir.append(mm(a, lo, s['plans'][plan]))
        elif s['cle'] in points_auteur:
            p = points_auteur[s['cle']]
            a_convertir.append(mm(a, lo, np.mean([[q['i'], q['j'], q['k']] for q in p], axis=0)))
    mni = iter(A.vers_mni(np.array(a_convertir)).round(1).tolist()) if a_convertir else iter([])
    for s in m['structures']:
        modele = re.sub(r' \((gauche|droite?)\)| (gauches?|droites?|droits?)(?=[ ,]|$)', '', s['nom']).strip()
        nom_en = s['outil'] if s.get('outil') else noms_anglais.NOMS.get(modele, '')
        if not s.get('outil') and modele not in noms_anglais.NOMS:
            nom_en = ''
        e = {'cle': s['cle'], 'nom_fr': s['nom'], 'nom_en': nom_en,
             'cote': s.get('cote', ''), 'categorie': s['cat'], 'statut_module': s['statut'],
             'source': {'origine': s['source'], 'nom_outil': s.get('outil', ''), 'identifiant': s.get('id_outil', '')},
             'convention_affichage': CONVENTION, 'coordonnees': {}, 'plans': {}, 'atlas': [], 'remarques': []}
        if s['source'].startswith('Atlas des territoires (Liu'):
            e['atlas'].append({'atlas': 'Liu et al. 2023 (territoires artériels, CC BY-SA 4.0)', 'type': 'transporté',
                               'labels': {'ids': s['valeurs'], 'noms': [s['nom']]},
                               'verdict': 'redécoupé par règles géométriques (voir le rapport)'})
            e['remarques'].append("Territoire de l'atlas de Liu 2023 transporté sur le sujet, puis redécoupé par des "
                                  "règles géométriques (vidéo de référence de l'auteur) : à contrôler avec Tatu 1998.")
        if 'centre' in s:
            e['coordonnees'] = {'sujet_mm': mm(a, lo, s['centre']).tolist(), 'mni_icbm2009c_mm': next(mni)}
            for plan in ('axial', 'coronal', 'sagittal'):
                p = s['plans'][plan]
                x = mm(a, lo, p)
                e['plans'][plan] = {'sujet_mm': x.tolist(), 'mni_icbm2009c_mm': next(mni),
                                    'coupe': {'axial': f'z = {x[2]:+.1f} mm', 'coronal': f'y = {x[1]:+.1f} mm',
                                              'sagittal': f'x = {x[0]:+.1f} mm'}[plan]}
        elif s['cle'] in points_auteur:
            p = points_auteur[s['cle']]
            e['coordonnees'] = {'sujet_mm': mm(a, lo, np.mean([[q['i'], q['j'], q['k']] for q in p], axis=0)).tolist(),
                                'mni_icbm2009c_mm': next(mni), 'points_auteur': len(p),
                                'plans_des_points': sorted({q['plan'] for q in p})}
        nous = np.isin(vols[s['couche']], s['valeurs']) if s.get('couche') and s['couche'] != 'faisceaux' else None
        refs = references(s, table, cer, hoc, hos) if nous is not None else []
        verdicts = []
        for ref in refs:
            x = mesure(ref, nous, atlas, cortex, gris_nous)
            v = verdict(ref['type'], x)
            r = {'atlas': ref['atlas'] + ' (contrôle interne)', 'type': ref['type'],
                 'labels': [{'id': i, 'nom': n} for i, n in zip(ref['ids'], ref['noms'])] if len(ref['ids']) == len(ref['noms'])
                 else {'ids': ref['ids'], 'noms': ref['noms']},
                 'mesure': None if x is None else round(x, 3), 'verdict': v, 'plans': {}}
            verdicts.append(v)
            for plan, pl in e['plans'].items():
                p = s['plans'][plan]
                sous = {c: tranche(vv, plan, p) for c, vv in atlas.items()}
                xp = mesure(ref, tranche(nous, plan, p), sous, tranche(cortex, plan, p), tranche(gris_nous, plan, p))
                vp = verdict(ref['type'], xp)
                r['plans'][plan] = {'mesure': None if xp is None else round(xp, 3), 'verdict': vp}
                if vp == 'discordant':
                    verdicts.append('partiel')                          # un plan discordant ôte la certitude
            e['atlas'].append(r)
        # latéralité
        x_mni = e['coordonnees'].get('mni_icbm2009c_mm', [None])[0]
        c = cote_lettre(s)
        if c and x_mni is not None:
            ok = (x_mni < 0) if c == 'L' else (x_mni > 0)
            e['controle_lateralite'] = 'conforme' if ok else f'ÉCART : côté {s["cote"]}, x MNI = {x_mni:+.1f} mm'
        else:
            e['controle_lateralite'] = 'sans objet (structure médiane)' if s.get('cote') in ('médian', '—', '') or not c \
                else 'non mesurable'
        if not refs:
            if s['statut'] == 'manuel' and not e['coordonnees']:
                e['confiance'] = 'à placer'
            else:
                e['confiance'] = 'hors atlas'
            e['remarques'].append("Aucune étiquette de CerebrA ni de Harvard-Oxford : non confirmée par un atlas de "
                                  "référence ; source gardée : " + s['source'] + '.')
        elif 'discordant' in verdicts:
            e['confiance'] = 'faible'
        elif all(v == 'concordant' for v in verdicts):
            e['confiance'] = 'élevée'
        else:
            e['confiance'] = 'moyenne'
        if e['controle_lateralite'].startswith('ÉCART'):
            e['confiance'] = 'faible'
            e['remarques'].append('Côté en désaccord avec la coordonnée MNI.')
        nom_fichier = re.sub(r'[^a-z0-9+_-]+', '-', s['cle'].lower())
        with open(os.path.join(DEPOT, 'labels', nom_fichier + '.json'), 'w', encoding='utf-8') as f:
            json.dump(e, f, ensure_ascii=False, indent=1)
        entrees.append(e)
    ecrire_tableau(entrees)
    synthese(entrees, vols, atlas, cortex, hoc, table)


def ecrire_tableau(entrees):
    champs = ['cle', 'nom_fr', 'nom_en', 'cote', 'categorie', 'statut_module', 'origine', 'identifiant',
              'centre_mni', 'axial', 'coronal', 'sagittal', 'cerebra', 'harvard_oxford', 'lateralite', 'confiance']
    def resume(e, atlas):
        r = [x for x in e['atlas'] if x['atlas'].startswith(atlas)]
        if not r:
            return ''
        x = r[0]
        noms = x['labels']['noms'] if isinstance(x['labels'], dict) else [l['nom'] for l in x['labels']]
        noms = ', '.join(noms[:3]) + (f' (+{len(noms) - 3})' if len(noms) > 3 else '')
        mes = '' if x.get('mesure') is None else f" {x['type']} {x['mesure']:.2f}"
        return f"{noms} —{mes} {x['verdict']}"
    rangs = []
    for e in entrees:
        pl = {p: (e['plans'][p]['coupe'] if p in e['plans'] else '') for p in ('axial', 'coronal', 'sagittal')}
        rangs.append({'cle': e['cle'], 'nom_fr': e['nom_fr'], 'nom_en': e['nom_en'], 'cote': e['cote'],
                      'categorie': e['categorie'], 'statut_module': e['statut_module'], 'origine': e['source']['origine'],
                      'identifiant': e['source']['identifiant'],
                      'centre_mni': ', '.join(f'{v:+.1f}' for v in e['coordonnees'].get('mni_icbm2009c_mm', [])),
                      **pl, 'cerebra': resume(e, 'CerebrA'), 'harvard_oxford': resume(e, 'Harvard-Oxford'),
                      'lateralite': e['controle_lateralite'], 'confiance': e['confiance']})
    with open(os.path.join(DEPOT, 'tableau-labels.csv'), 'w', encoding='utf-8', newline='') as f:
        w = csv.DictWriter(f, champs, delimiter=';')
        w.writeheader()
        w.writerows(rangs)
    with open(os.path.join(DEPOT, 'tableau-labels.md'), 'w', encoding='utf-8') as f:
        f.write('# Tableau des labels et de leurs sources (audit du 19/10/2026)\n\n'
                f'Convention d\'affichage : {CONVENTION}.  \n'
                'Coordonnées : centre de la structure dans l\'espace MNI-ICBM152 2009c symétrique (recalage SyN du '
                'template sur le sujet). CerebrA et Harvard-Oxford : contrôle interne seulement (licences non '
                'commerciales), rien de ces atlas n\'est publié. Détail par label : `labels/<clé>.json`.\n\n')
        f.write('| Clé | Nom français | Nom anglais (outil ou traduction) | Catégorie | Source | Centre MNI (mm) | '
                'CerebrA | Harvard-Oxford | Latéralité | Confiance |\n|---|---|---|---|---|---|---|---|---|---|\n')
        for r in rangs:
            f.write('| ' + ' | '.join(str(r[c]).replace('|', '/') for c in
                                     ('cle', 'nom_fr', 'nom_en', 'categorie', 'origine', 'centre_mni', 'cerebra',
                                      'harvard_oxford', 'lateralite', 'confiance')) + ' |\n')


def synthese(entrees, vols, atlas, cortex, hoc, table):
    from collections import Counter
    s = {'structures': len(entrees), 'confiance': dict(Counter(e['confiance'] for e in entrees)),
         'par_categorie': {}, 'lateralite_ecarts': [e['cle'] for e in entrees if e['controle_lateralite'].startswith('ÉCART')],
         'non_certaines': [{'cle': e['cle'], 'nom': e['nom_fr'], 'confiance': e['confiance'],
                            'mesures': [(x['atlas'].split(' (')[0], x['type'], x.get('mesure'), x['verdict'],
                                         {p: v['verdict'] for p, v in x.get('plans', {}).items()})
                                        for x in e['atlas'] if 'mesure' in x]}
                           for e in entrees if e['confiance'] in ('moyenne', 'faible')],
         'sans_nom_anglais': [e['cle'] for e in entrees if not e['nom_en']]}
    for e in entrees:
        s['par_categorie'].setdefault(e['categorie'], Counter())[e['confiance']] += 1
    # lobes : où tombe le cortex de chaque lobe dans les lobes de Harvard-Oxford
    lob = vols['lobes']
    noms = {n + b: mod.replace('{c}', 'gauche' if b == 0 else 'droit') for n, (mod, *_) in
            enumerate(etiquettes.LOBES, start=1) for b in (0, 10)}
    ho = atlas['ho-cortical']
    groupe_ho = np.zeros(256, np.uint8)
    cles = list(HO_LOBES)
    for i, r in hoc.items():
        for g, debuts in HO_LOBES.items():
            if any(r['nom'].startswith(d) for d in debuts):
                groupe_ho[i] = cles.index(g) + 1
    gh = groupe_ho[ho]
    s['lobes_dans_harvard_oxford'] = {}
    for v, nom in noms.items():
        n = (lob == v) & cortex & (ho > 0)
        tot = int(n.sum())
        if tot:
            c = np.bincount(gh[n], minlength=len(cles) + 1)
            s['lobes_dans_harvard_oxford'][nom] = {cles[i - 1]: round(c[i] / tot, 3) for i in range(1, len(cles) + 1)
                                                  if c[i]}
    for k in s['par_categorie']:
        s['par_categorie'][k] = dict(s['par_categorie'][k])
    with open(os.path.join(DEPOT, 'synthese.json'), 'w', encoding='utf-8') as f:
        json.dump(s, f, ensure_ascii=False, indent=1)
    print(json.dumps({k: s[k] for k in ('structures', 'confiance', 'lateralite_ecarts')}, ensure_ascii=False))
    print(json.dumps(s['lobes_dans_harvard_oxford'], ensure_ascii=False, indent=1))


# ---------------------------------------------------------------------------------------------------------------
# Captures de contrôle (usage interne : contours CerebrA en blanc, Harvard-Oxford en jaune)
# ---------------------------------------------------------------------------------------------------------------
def bords(v):
    return (v != ndi.grey_erosion(v, size=3)) & (v > 0)


def captures():
    m, vols, t1, atlas, a, lo = donnees()
    table = m['couches']['fines']['table']
    cer, hoc, hos = tables()
    os.makedirs(CAPTURES, exist_ok=True)
    try:
        police = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 13)
    except OSError:
        police = None
    rng = np.random.default_rng(7)
    par_cat = {}
    for s in m['structures']:
        if s.get('couche') and s['couche'] != 'faisceaux' and 'centre' in s:
            par_cat.setdefault(s['cat'], []).append(s)
    sortie = {}
    for cat, liste in par_cat.items():
        nous = np.zeros(t1.shape, np.int16)
        ref_c = np.zeros(t1.shape, np.int16)
        ref_h = np.zeros(t1.shape, np.int16)
        for n, s in enumerate(liste, start=1):
            masque = np.isin(vols[s['couche']], s['valeurs'])
            nous[masque & (nous == 0)] = n
            for ref in references(s, table, cer, hoc, hos):
                if ref['type'] == 'cortex HO':
                    continue
                r = np.isin(atlas[ref.get('couche', 'cerebra')], ref['ids'])
                cible = ref_c if ref['atlas'] == 'CerebrA' else ref_h
                cible[r & (cible == 0)] = n
        couleurs = (rng.uniform(60, 255, (len(liste) + 1, 3))).astype(np.uint8)
        centre = np.argwhere(nous > 0).mean(axis=0).round().astype(int)
        panneaux = []
        for plan in ('axial', 'coronal', 'sagittal'):
            f = lambda v: tranche(v, plan, centre)
            g = f(t1).astype(np.float32)
            rgb = np.repeat(g[..., None], 3, axis=2)
            n2 = f(nous)
            rgb[n2 > 0] = rgb[n2 > 0] * 0.5 + couleurs[n2[n2 > 0]] * 0.5
            rgb[bords(f(ref_c))] = (255, 255, 255)
            rgb[bords(f(ref_h))] = (255, 220, 0)
            if plan == 'sagittal':
                img = np.transpose(rgb, (1, 0, 2))[::-1, ::-1]        # haut en haut, avant à gauche
            else:
                img = np.transpose(rgb, (1, 0, 2))[::-1, ::-1]        # convention radiologique
            im = Image.fromarray(img.astype(np.uint8)).resize((img.shape[1] * 2, img.shape[0] * 2), Image.NEAREST)
            d = ImageDraw.Draw(im)
            x = mm(a, lo, centre)
            titre = {'axial': f'axial z = {x[2]:+.1f} mm', 'coronal': f'coronal y = {x[1]:+.1f} mm',
                     'sagittal': f'sagittal x = {x[0]:+.1f} mm'}[plan]
            d.text((6, 4), titre, fill=(255, 255, 0), font=police)
            if plan != 'sagittal':
                d.text((6, im.height // 2), 'D', fill=(255, 255, 255), font=police)
                d.text((im.width - 16, im.height // 2), 'G', fill=(255, 255, 255), font=police)
            else:
                d.text((6, im.height // 2), 'A', fill=(255, 255, 255), font=police)
                d.text((im.width - 16, im.height // 2), 'P', fill=(255, 255, 255), font=police)
            panneaux.append(im)
        h = max(p.height for p in panneaux)
        W = Image.new('RGB', (sum(p.width for p in panneaux), h + 30), (16, 16, 16))
        x0 = 0
        for p in panneaux:
            W.paste(p, (x0, 30))
            x0 += p.width
        ImageDraw.Draw(W).text((6, 6), f'{cat} — {len(liste)} structures (couleurs) ; contours blancs : CerebrA ; '
                               'jaunes : Harvard-Oxford (contrôle interne) ; vue radiologique', fill=(255, 255, 255),
                               font=police)
        nom = re.sub(r'[^a-z0-9]+', '-', cat.lower().encode('ascii', 'ignore').decode()).strip('-') or 'categorie'
        W.save(os.path.join(CAPTURES, nom + '.png'))
        sortie[cat] = nom + '.png'
    print(len(sortie), 'planches dans', CAPTURES)


if __name__ == '__main__':
    args = sys.argv[1:]
    pts = None
    if '--points' in args:
        pts = args[args.index('--points') + 1]
        args = [x for x in args if x not in ('--points', pts)]
    for p in args or ['audit', 'captures']:
        audit(pts) if p == 'audit' else captures()
