"""Espace radioanatomie, module « TDM thoracique injectée » : construit l'atlas affiché par radioanatomie/atlas-coupes.js.

Trois origines d'étiquettes, gardées dans l'atlas (champ « source » de chaque structure) :
  • « référence » : masques de la vérité terrain du jeu TotalSegmentator (segmentations relues et corrigées par des
    radiologues) : l'étiquette est posée au point le plus intérieur du masque sur la coupe (maximum de la
    transformée de distance), lissée d'une coupe à l'autre sans jamais sortir du masque ;
  • « calculée » : structures déduites exactement des masques de référence et du scanner : aorte ascendante, arc
    aortique, aorte descendante thoracique puis abdominale sous le hiatus (géométrie de l'aorte coupe par coupe,
    disque T12-L1), veines pulmonaires droites et gauches (poumon le plus proche), scissures (interface entre
    deux lobes), hiles (contact veines pulmonaires / poumon),
    apex et bases, carène et bronches principales (le masque « trachée » de la référence comprend les bronches
    principales : il est coupé à la bifurcation, coupe la plus haute où il se divise en deux), côtes et
    vertèbres numérotées par la référence ;
  • « repère manuel » : structures absentes de la référence (tronc et artères pulmonaires, cavités cardiaques,
    veine azygos, artères thoraciques internes, muscles de la paroi…), posées à la main sur des coupes clés de la
    série axiale (reperes-manuels/ax.json) et interpolées ; chaque point est contrôlé (densité attendue, et pas dans
    le masque de référence d'une autre structure ; cavités cardiaques : dans le masque du cœur).
Contrôles (validation.json, le script s'arrête en cas d'échec) : chaque étiquette de référence dans son masque,
densités de la phase injectée, invariants anatomiques (côtés, arc aortique à gauche, carène vers T4-T6, articulation
de chaque côte avec sa vertèbre, lobe moyen en avant du lobe inférieur…).

Usage : python3 -I scripts/radioanatomie/construire_atlas_thorax.py   (après preparer_tdm_thorax.py)
"""
import json, os, sys

import nibabel as nib
import numpy as np
from scipy import ndimage

RACINE = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
D = os.path.join(RACINE, 'radioanatomie', 'donnees', 'thorax-tdm')
SOURCES = os.path.join(RACINE, 'assets-sources', 'tdm-thorax-totalsegmentator', 's0310')
ECHELLE = 2
MAX_ETIQ = {'axial': 26, 'coronal': 22, 'sagittal': 22}

CATEGORIES = [
    dict(id='poumons', nom='Poumons et scissures', couleur='#e5e7eb'),
    dict(id='voies', nom='Voies aériennes', couleur='#67e8f9'),
    dict(id='arteres', nom='Artères', couleur='#f87171'),
    dict(id='veines', nom='Veines', couleur='#60a5fa'),
    dict(id='coeur', nom='Cœur', couleur='#f472b6'),
    dict(id='visceres', nom='Viscères et glandes', couleur='#c4b5fd'),
    dict(id='muscles', nom='Muscles', couleur='#fb923c'),
    dict(id='nerveux', nom='Système nerveux', couleur='#fde047'),
    dict(id='os', nom='Os et cartilages', couleur='#f5e6c8'),
]
ORDINAL = lambda n: '1re' if n == 1 else f'{n}e'


def charger(nom):
    v = nib.as_closest_canonical(nib.load(os.path.join(SOURCES, nom + '.nii.gz')))
    return np.asarray(v.dataobj)


def coupe(a, plan, s):
    if plan == 'sagittal': return a[s].T[::-1, ::-1]
    if plan == 'coronal': return a[:, s, :].T[::-1, ::-1]
    return a[:, :, s].T[::-1, ::-1]


def voxel(forme, plan, s, r, c):
    """Inverse de coupe() : (ligne, colonne) de la coupe s → indices (x, y, z) du volume."""
    X, Y, Z = forme
    if plan == 'sagittal': return s, Y - 1 - c, Z - 1 - r
    if plan == 'coronal': return X - 1 - c, s, Z - 1 - r
    return X - 1 - c, Y - 1 - r, s


def point_interieur(m):
    """Point le plus intérieur de la plus grande composante (maximum de la transformée de distance)."""
    lab, n = ndimage.label(m)
    if n > 1:
        tailles = ndimage.sum(m, lab, range(1, n + 1))
        m = lab == (int(np.argmax(tailles)) + 1)
    dist = ndimage.distance_transform_edt(m)
    r, c = np.unravel_index(int(np.argmax(dist)), dist.shape)
    return int(r), int(c), float(dist[r, c])


def point_courbe(m):
    """Point d'une courbe fine (scissure, contact) le plus proche de son barycentre : il est sur la courbe."""
    rr, cc = np.nonzero(m)
    i = int(np.argmin((rr - rr.mean()) ** 2 + (cc - cc.mean()) ** 2))
    return int(rr[i]), int(cc[i]), 1.0


def position(kf, k):
    """Coupes clés {numéro de coupe: [x, y]} : position interpolée linéairement ; hors des coupes clés : rien."""
    cles = sorted((int(c), p) for c, p in kf.items())
    if k < cles[0][0] or k > cles[-1][0]: return None
    for (c0, p0), (c1, p1) in zip(cles, cles[1:] + [cles[-1]]):
        if c0 <= k <= c1:
            t = 0 if c1 == c0 else (k - c0) / (c1 - c0)
            arrondi = lambda v: int(np.floor(v + 0.5))     # demi vers le haut (comme Math.round), pas l'arrondi au pair
            return [arrondi(p0[0] + t * (p1[0] - p0[0])), arrondi(p0[1] + t * (p1[1] - p0[1]))]


def main():
    S = json.load(open(os.path.join(D, 'series.json'), encoding='utf-8'))
    ct = charger('ct').astype(np.float32)
    forme = ct.shape
    M = {}
    def m(nom):
        if nom not in M: M[nom] = charger(nom) > 0
        return M[nom]

    controles = []
    def controle(nom, ok, detail=''):
        controles.append(dict(controle=nom, ok=bool(ok), detail=detail))

    # ---------- Repère : +x = droite du patient (RAS) ----------
    cx = lambda v: float(np.nonzero(v)[0].mean())
    cy = lambda v: float(np.nonzero(v)[1].mean())
    cz = lambda v: float(np.nonzero(v)[2].mean())
    controle('côtés : foie à droite de la rate (+x = droite du patient)', cx(m('liver')) > cx(m('spleen')), f'x foie {cx(m("liver")):.0f}, rate {cx(m("spleen")):.0f}')

    # ---------- Structures calculées ----------
    poumon_d = m('lung_upper_lobe_right') | m('lung_middle_lobe_right') | m('lung_lower_lobe_right')
    poumon_g = m('lung_upper_lobe_left') | m('lung_lower_lobe_left')
    poumons = poumon_d | poumon_g
    # Aorte : ascendante (1), arc (2), descendante (3), coupe axiale par coupe axiale
    ao = m('aorta'); parties = np.zeros(forme, np.uint8)
    deux = []
    for z in range(forme[2]):
        lab, n = ndimage.label(ao[:, :, z])
        comps = [(int((lab == i).sum()), i) for i in range(1, n + 1)]
        comps = [c for c in comps if c[0] >= 6]
        if len(comps) >= 2: deux.append(z)
    z_haut_deux, z_bas_deux = max(deux), min(deux)
    for z in range(forme[2]):
        sl = ao[:, :, z]
        if not sl.any(): continue
        lab, n = ndimage.label(sl)
        comps = sorted([(int((lab == i).sum()), i) for i in range(1, n + 1)], reverse=True)
        if z > z_haut_deux:
            parties[:, :, z][sl] = 2
        elif z >= z_bas_deux and len([c for c in comps if c[0] >= 6]) >= 2:
            a1, a2 = comps[0][1], comps[1][1]
            y1, y2 = np.nonzero(lab == a1)[1].mean(), np.nonzero(lab == a2)[1].mean()
            ant, post = (a1, a2) if y1 > y2 else (a2, a1)
            parties[:, :, z][lab == ant] = 1; parties[:, :, z][lab == post] = 3
            for _, i in comps[2:]: parties[:, :, z][lab == i] = 3
        else:
            parties[:, :, z][sl] = 3
    arc = parties == 2
    # Hiatus aortique en regard de T12 : sous le disque T12-L1 (haut de L1), l'aorte est abdominale
    z_hiatus = int(np.nonzero(m('vertebrae_L1').any((0, 1)))[0].max()) if m('vertebrae_L1').any() else -1
    zz_ao = np.arange(forme[2])[None, None, :]
    aorte_abdo = (parties == 3) & (zz_ao <= z_hiatus)
    parties[aorte_abdo] = 4
    controle('arc aortique à gauche de la trachée', cx(arc) < cx(m('trachea')), f'x arc {cx(arc):.0f}, trachée {cx(m("trachea")):.0f}')
    controle('veine cave supérieure à droite de l\'aorte ascendante', cx(m('superior_vena_cava')) > cx(parties == 1))
    controle('aorte descendante en arrière de l\'aorte ascendante', cy(parties == 3) < cy(parties == 1))
    # Veines pulmonaires droites / gauches : poumon le plus proche
    vp = m('pulmonary_vein')
    dd, dg = ndimage.distance_transform_edt(~poumon_d), ndimage.distance_transform_edt(~poumon_g)
    vp_d, vp_g = vp & (dd <= dg), vp & (dg < dd)
    # Scissures : interface (1 voxel) entre lobes
    def interface(a, b):
        return (ndimage.binary_dilation(a) & b) | (ndimage.binary_dilation(b) & a)
    sc_obl_d = interface(m('lung_lower_lobe_right'), m('lung_upper_lobe_right') | m('lung_middle_lobe_right'))
    sc_hor = interface(m('lung_upper_lobe_right'), m('lung_middle_lobe_right'))
    sc_obl_g = interface(m('lung_lower_lobe_left'), m('lung_upper_lobe_left'))
    controle('lobe moyen en avant du lobe inférieur droit', cy(m('lung_middle_lobe_right')) > cy(m('lung_lower_lobe_right')))
    controle('scissure horizontale au-dessus de la base du lobe moyen', cz(sc_hor) > cz(m('lung_middle_lobe_right')) - 5)
    # Carène et bronches principales : le masque « trachée » de la référence comprend aussi les bronches principales
    # jusqu'aux origines lobaires ; la bifurcation est la coupe la plus haute où il se divise en deux composantes.
    tr_ref = m('trachea')
    def composantes(z):
        lab, n = ndimage.label(tr_ref[:, :, z])
        return [i for i in range(1, n + 1) if (lab == i).sum() >= 5]
    zs_tr = np.nonzero(tr_ref.any((0, 1)))[0]
    z_car = max(z for z in zs_tr if len(composantes(z)) >= 2)
    xs, ys = np.nonzero(tr_ref[:, :, z_car + 1]); x_car = float(xs.mean())
    zz3 = np.arange(forme[2])[None, None, :]; xx = np.arange(forme[0])[:, None, None]
    tr = tr_ref & (zz3 > z_car + 2)        # au-dessus des deux coupes légendées « carène »
    bronches = tr_ref & (zz3 <= z_car)
    br_d, br_g = bronches & (xx > x_car), bronches & (xx <= x_car)
    controle('bronches principales séparées des deux côtés sous la bifurcation', br_d.sum() > 20 and br_g.sum() > 20, f'droite {int(br_d.sum())} voxels, gauche {int(br_g.sum())}')
    controle('bronche principale gauche plus longue que la droite', np.ptp(np.nonzero(br_g)[2]) >= np.ptp(np.nonzero(br_d)[2]),
             f'hauteur gauche {np.ptp(np.nonzero(br_g)[2]) * 1.5:.0f} mm, droite {np.ptp(np.nonzero(br_d)[2]) * 1.5:.0f} mm')
    vert_car = [k for k in range(1, 13) if m(f'vertebrae_T{k}')[:, :, z_car].any()]
    controle('carène en regard de T4 à T6', any(k in (4, 5, 6) for k in vert_car), f'vertèbres au niveau de la carène : T{vert_car}')
    # Côtes : la tête de la côte n s'articule avec la vertèbre Tn (et T(n-1) de la 2e à la 10e)
    spin = m('spinal_cord'); xsp = cx(spin)
    for k in range(2, 11):
        for cote in ('right', 'left'):
            r = m(f'rib_{cote}_{k}')
            if not r.any(): continue
            rx, ry, rz = np.nonzero(r)
            proche = np.abs(rx - xsp) < 22    # 33 mm de la ligne médiane : tête et col
            if proche.sum() < 5: continue
            zt = float(np.median(rz[proche]))
            tz = [np.nonzero(m(f'vertebrae_T{j}').any((0, 1)))[0] for j in (k - 1, k) if m(f'vertebrae_T{j}').any()]
            lo, hi = min(t.min() for t in tz) - 3, max(t.max() for t in tz) + 3
            controle(f'{ORDINAL(k)} côte {"droite" if cote == "right" else "gauche"} articulée avec T{k - 1}-T{k}', lo <= zt <= hi, f'tête z {zt:.0f}, T{k - 1}-T{k} z {lo + 3}-{hi - 3}')
    # Densités : phase injectée
    def med(v): return float(np.median(ct[v]))
    for nom, v, lo, hi in [('aorte', ao, 120, 500), ('veine cave supérieure', m('superior_vena_cava'), 120, 900), ('veines pulmonaires', vp, 110, 500),
                           ('cœur', m('heart'), 100, 500), ('trachée', tr, -1100, -800), ('foie', m('liver'), 30, 120), ('moelle spinale', spin, 0, 90)]:
        controle(f'densité {nom} {lo} à {hi} UH', lo <= med(v) <= hi, f'médiane {med(v):.0f} UH')

    # Apex, bases (axial), hiles (axial)
    def zr(v): z = np.nonzero(v.any((0, 1)))[0]; return int(z.min()), int(z.max())
    zd, zg = zr(poumon_d), zr(poumon_g)

    # ---------- Catalogue : id → (nom, catégorie, source, priorité, fonction(plan, s) → masque 2D) ----------
    CAT = {}
    def ajoute(ident, nom, cat, source, prio, vol, plans=('axial', 'coronal', 'sagittal'), mini=4, courbe=False):
        CAT[ident] = dict(nom=nom, cat=cat, source=source, prio=prio, vol=vol, plans=plans, mini=mini, courbe=courbe)
    R, C, K = 'référence', 'calculée', 'repère manuel'
    ajoute('trachee', 'Trachée', 'voies', R, 1, tr)
    ajoute('bronche-d', 'Bronche principale droite', 'voies', C, 1, br_d, mini=3)
    ajoute('bronche-g', 'Bronche principale gauche', 'voies', C, 1, br_g, mini=3)
    ajoute('oesophage', 'Œsophage', 'visceres', R, 1, m('esophagus'))
    ajoute('aorte-asc', 'Aorte ascendante', 'arteres', C, 1, parties == 1)
    ajoute('arc-aortique', 'Arc aortique (crosse de l\'aorte)', 'arteres', C, 1, arc)
    ajoute('aorte-desc', 'Aorte thoracique descendante', 'arteres', C, 1, parties == 3)
    ajoute('aorte-abdo', 'Aorte abdominale', 'arteres', C, 2, parties == 4)
    ajoute('vcs', 'Veine cave supérieure', 'veines', R, 1, m('superior_vena_cava'))
    ajoute('vci', 'Veine cave inférieure', 'veines', R, 2, m('inferior_vena_cava'))
    ajoute('vp-d', 'Veines pulmonaires droites', 'veines', C, 2, vp_d)
    ajoute('vp-g', 'Veines pulmonaires gauches', 'veines', C, 2, vp_g)
    ajoute('tabc', 'Tronc artériel brachiocéphalique', 'arteres', R, 2, m('brachiocephalic_trunk'))
    ajoute('carotide-d', 'Artère carotide commune droite', 'arteres', R, 2, m('common_carotid_artery_right'))
    ajoute('carotide-g', 'Artère carotide commune gauche', 'arteres', R, 2, m('common_carotid_artery_left'))
    ajoute('subclaviere-d', 'Artère subclavière droite', 'arteres', R, 2, m('subclavian_artery_right'))
    ajoute('subclaviere-g', 'Artère subclavière gauche', 'arteres', R, 2, m('subclavian_artery_left'))
    ajoute('vbc-d', 'Veine brachiocéphalique droite', 'veines', R, 2, m('brachiocephalic_vein_right'))
    ajoute('vbc-g', 'Veine brachiocéphalique gauche', 'veines', R, 2, m('brachiocephalic_vein_left'))
    ajoute('coeur', 'Cœur', 'coeur', R, 3, m('heart'), plans=('coronal', 'sagittal'))
    ajoute('auricule-g', 'Auricule gauche', 'coeur', R, 2, m('atrial_appendage_left'))
    ajoute('thyroide', 'Glande thyroïde', 'visceres', R, 2, m('thyroid_gland'))
    for ident, nom, gt in [('lsd', 'Lobe supérieur droit', 'lung_upper_lobe_right'), ('lm', 'Lobe moyen', 'lung_middle_lobe_right'),
                           ('lid', 'Lobe inférieur droit', 'lung_lower_lobe_right'), ('lsg', 'Lobe supérieur gauche', 'lung_upper_lobe_left'),
                           ('lig', 'Lobe inférieur gauche', 'lung_lower_lobe_left')]:
        ajoute(ident, nom, 'poumons', R, 2, m(gt), mini=20)
    ajoute('sc-obl-d', 'Scissure oblique droite', 'poumons', C, 3, sc_obl_d, mini=6, courbe=True)
    ajoute('sc-hor', 'Scissure horizontale', 'poumons', C, 3, sc_hor, mini=6, courbe=True)
    ajoute('sc-obl-g', 'Scissure oblique gauche', 'poumons', C, 3, sc_obl_g, mini=6, courbe=True)
    zz = np.arange(forme[2])[None, None, :]
    ajoute('apex-d', 'Apex du poumon droit', 'poumons', C, 3, poumon_d & (zz >= zd[1] - 7), plans=('axial',))
    ajoute('apex-g', 'Apex du poumon gauche', 'poumons', C, 3, poumon_g & (zz >= zg[1] - 7), plans=('axial',))
    ajoute('base-d', 'Base du poumon droit', 'poumons', C, 3, poumon_d & (zz <= zd[0] + 7), plans=('axial',))
    ajoute('base-g', 'Base du poumon gauche', 'poumons', C, 3, poumon_g & (zz <= zg[0] + 7), plans=('axial',))
    ajoute('hile-d', 'Hile pulmonaire droit', 'poumons', C, 3, ndimage.binary_dilation(vp_d, iterations=2) & poumon_d, plans=('axial',), mini=3, courbe=True)
    ajoute('hile-g', 'Hile pulmonaire gauche', 'poumons', C, 3, ndimage.binary_dilation(vp_g, iterations=2) & poumon_g, plans=('axial',), mini=3, courbe=True)
    carene = np.zeros(forme, bool); carene[:, :, z_car + 1:z_car + 3] = tr_ref[:, :, z_car + 1:z_car + 3]
    ajoute('carene', 'Carène (bifurcation trachéale)', 'voies', C, 1, carene, plans=('axial',), mini=2)
    ajoute('moelle', 'Moelle spinale', 'nerveux', R, 3, spin)
    ajoute('sternum', 'Sternum', 'os', R, 3, m('sternum'))
    ajoute('cartilage', 'Cartilage costal', 'os', R, 5, m('costal_cartilages'))
    for cote, c in (('right', 'd'), ('left', 'g')):
        nomc = 'droite' if c == 'd' else 'gauche'; nomm = 'droit' if c == 'd' else 'gauche'
        ajoute(f'clavicule-{c}', f'Clavicule {nomc}', 'os', R, 4, m(f'clavicula_{cote}'))
        ajoute(f'scapula-{c}', f'Scapula {nomc}', 'os', R, 4, m(f'scapula_{cote}'))
        ajoute(f'humerus-{c}', f'Humérus {nomm}', 'os', R, 5, m(f'humerus_{cote}'))
        ajoute(f'erecteurs-{c}', f'Muscles érecteurs du rachis {"droits" if c == "d" else "gauches"}', 'muscles', R, 4, m(f'autochthon_{cote}'))
    ajoute('foie', 'Foie', 'visceres', R, 3, m('liver'))
    ajoute('estomac', 'Estomac', 'visceres', R, 3, m('stomach'))
    ajoute('rate', 'Rate', 'visceres', R, 3, m('spleen'))

    # Groupes « un seul par coupe » : vertèbres (la plus grande), côtes (la plus grande de chaque côté)
    VERT = [('C6', 'vertebrae_C6'), ('C7', 'vertebrae_C7')] + [(f'T{i}', f'vertebrae_T{i}') for i in range(1, 13)] + [('L1', 'vertebrae_L1')]
    COTES = {c: [(k, f'rib_{cote}_{k}') for k in range(1, 13)] for cote, c in (('right', 'd'), ('left', 'g'))}

    # Repères manuels (série axiale)
    manuels = json.load(open(os.path.join(D, 'reperes-manuels', 'ax.json'), encoding='utf-8'))
    for st in manuels['structures']:
        CAT[st['id']] = dict(nom=st['nom'], cat=st['cat'], source=K, prio=st.get('prio', 2), vol=None, plans=('axial',), mini=0, courbe=False)

    # ---------- Étiquettes, série par série ----------
    utilisees, sortie, n_ref = set(), [], 0
    for Sr in S['series']:
        plan, idx = Sr['plan'], Sr['indices']
        r0, r1, c0, c1 = Sr['cadre']
        brut = {}   # id → {n: (r, c)}
        masques2d = {}
        for n, s in enumerate(idx):
            def poser(ident, m2):
                r, c, _ = (point_courbe if CAT[ident]['courbe'] else point_interieur)(m2)
                brut.setdefault(ident, {})[n] = (r, c); masques2d[(ident, n)] = m2
            for ident, d in CAT.items():
                if d['vol'] is None or plan not in d['plans']: continue
                m2 = coupe(d['vol'], plan, s)[r0:r1, c0:c1]
                if m2.sum() >= d['mini']: poser(ident, m2)
            # vertèbre la plus grande
            surf = [(int(coupe(m(v), plan, s)[r0:r1, c0:c1].sum()), lab, v) for lab, v in VERT]
            surf = [x for x in surf if x[0] >= 12]
            if surf:
                _, lab, v = max(surf)
                ident = f'vert-{lab}'
                CAT.setdefault(ident, dict(nom=f'Vertèbre {lab}', cat='os', source=R, prio=3, vol=None, plans=(), mini=0, courbe=False))
                poser(ident, coupe(m(v), plan, s)[r0:r1, c0:c1])
            for c, liste in COTES.items():
                surf = [(int(coupe(m(v), plan, s)[r0:r1, c0:c1].sum()), k, v) for k, v in liste]
                surf = [x for x in surf if x[0] >= 5]
                if surf:
                    _, k, v = max(surf)
                    ident = f'cote-{c}-{k}'
                    CAT.setdefault(ident, dict(nom=f'{ORDINAL(k)} côte {"droite" if c == "d" else "gauche"}', cat='os', source=R, prio=5, vol=None, plans=(), mini=0, courbe=False))
                    poser(ident, coupe(m(v), plan, s)[r0:r1, c0:c1])
        # Lissage (médiane glissante sur 5 coupes), sans sortir du masque
        lisse = {}
        for ident, pts in brut.items():
            lisse[ident] = {}
            for n, (r, c) in pts.items():
                voisins = [pts[j] for j in range(n - 2, n + 3) if j in pts]
                rm, cm = int(np.median([p[0] for p in voisins])), int(np.median([p[1] for p in voisins]))
                m2 = masques2d[(ident, n)]
                lisse[ident][n] = (rm, cm) if m2[rm, cm] else (r, c)
        coupes = [[] for _ in idx]
        for ident, pts in lisse.items():
            for n, (r, c) in pts.items():
                coupes[n].append([ident, c * ECHELLE + 1, r * ECHELLE + 1])
        # Repères manuels : coupes clés (numéro de coupe de la série axiale) interpolées
        if plan == 'axial':
            for st in manuels['structures']:
                for n in range(len(idx)):
                    p = position(st['kf'], n)
                    if p: coupes[n].append([st['id'], *p])
        # Plafond par coupe : priorité, puis taille
        for n, liste in enumerate(coupes):
            vus, uniques = set(), []
            for e in liste:
                if e[0] not in vus: vus.add(e[0]); uniques.append(e)
            uniques.sort(key=lambda e: CAT[e[0]]['prio'])
            coupes[n] = uniques[:MAX_ETIQ[plan]]
        # Contrôles : étiquettes de référence / calculées dans leur masque ; repères manuels : densité et voisinage
        for n, liste in enumerate(coupes):
            s = idx[n]
            for ident, x, y in liste:
                utilisees.add(ident)
                r, c = (y - 1) // ECHELLE, (x - 1) // ECHELLE
                if CAT[ident]['source'] != K:
                    n_ref += 1
                    if not masques2d[(ident, n)][r, c]:
                        controle(f'{Sr["id"]} coupe {n} : {ident} dans son masque', False)
        sortie.append(dict(id=Sr['id'], nom=Sr['nom'], plan=plan, ponderation=Sr['fenetre'], description=Sr['description'],
                           largeur=Sr['largeur'], hauteur=Sr['hauteur'], pixel_mm=Sr['pixel_mm'], epaisseur_mm=Sr['epaisseur_mm'],
                           coupes=len(idx), chiffres=3, dossier=f'donnees/thorax-tdm/{Sr["id"]}/', calque=f'donnees/thorax-tdm/{Sr["calque"]}/',
                           orientation={'axial': ['A', 'P', 'D', 'G'], 'coronal': ['S', 'I', 'D', 'G'], 'sagittal': ['S', 'I', 'A', 'P']}[plan],
                           reperes=coupes))
    controle(f'{n_ref} étiquettes de référence ou calculées, toutes dans leur masque', all(c['ok'] for c in controles if 'dans son masque' in c['controle']))

    # Repères manuels : chaque point (coupes clés et interpolés) contrôlé sur le scanner et les masques de référence
    ax = next(s for s in S['series'] if s['id'] == 'ax-med')
    ATTENDU = {st['id']: st for st in manuels['structures']}
    INTERDITS = ['aorta', 'superior_vena_cava', 'trachea', 'esophagus', 'spinal_cord', 'sternum', 'liver', 'stomach', 'spleen'] + \
                [f'vertebrae_T{i}' for i in range(1, 13)]
    hors_poumon = poumons
    sax = next(s for s in sortie if s['id'] == 'ax-med')
    for n, liste in enumerate(sax['reperes']):
        for ident, x, y in liste:
            if ident not in ATTENDU: continue
            st = ATTENDU[ident]
            r, c = (y - 1) // ECHELLE, (x - 1) // ECHELLE
            vx = voxel(forme, 'axial', ax['indices'][n], r + ax['cadre'][0], c + ax['cadre'][2])
            hu = float(np.median(ct[vx[0] - 1:vx[0] + 2, vx[1] - 1:vx[1] + 2, vx[2]]))
            lo, hi = st['densite']
            ok = lo <= hu <= hi
            dans = [g for g in INTERDITS if g not in st.get('autorises', []) and m(g)[vx]]
            if hors_poumon[vx] and not st.get('dans_poumon'): dans.append('poumon')
            if st.get('dans'): ok = ok and m(st['dans'])[vx]
            if not ok or dans:
                controle(f'repère manuel {ident} coupe {n}', False, f'{hu:.0f} UH (attendu {lo} à {hi}), dans {dans or "-"}, dans {st.get("dans", "")} : {m(st["dans"])[vx] if st.get("dans") else "-"}')
    nb_man = sum(1 for l in sax['reperes'] for e in l if e[0] in ATTENDU)
    controle(f'{nb_man} positions de repères manuels contrôlées (densité, voisinage)', all(c['ok'] for c in controles if c['controle'].startswith('repère manuel')))

    echecs = [c for c in controles if not c['ok']]
    json.dump(dict(cas='s0310', controles=controles, echecs=len(echecs)), open(os.path.join(D, 'validation.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    for c in controles:
        if not c['ok'] or 'positions' in c['controle'] or 'étiquettes' in c['controle']:
            print(('OK   ' if c['ok'] else 'ÉCHEC'), c['controle'], c['detail'])
    print(f'{len(controles)} contrôles, {len(echecs)} échec(s)')
    if echecs: sys.exit(1)

    atlas = dict(
        titre='TDM thoracique injectée',
        source=('TotalSegmentator CT dataset v2.0.1, cas s0310 (Wasserthal J. et al., Hôpital universitaire de Bâle ; '
                'Zenodo, doi:10.5281/zenodo.10047292), licence CC BY 4.0'),
        categories=CATEGORIES,
        structures={k: dict(nom=v['nom'], cat=v['cat'], source=v['source']) for k, v in CAT.items() if k in utilisees},
        series=sortie)
    json.dump(atlas, open(os.path.join(D, 'atlas.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    for s in sortie:
        nb = [len(c) for c in s['reperes']]
        print(s['id'], f"{s['coupes']} coupes, {sum(1 for x in nb if x)} légendées, jusqu'à {max(nb)} repères par coupe")
    par_source = {}
    for k, v in atlas['structures'].items(): par_source[v['source']] = par_source.get(v['source'], 0) + 1
    print(len(atlas['structures']), 'structures', par_source)


if __name__ == '__main__':
    main()
