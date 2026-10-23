"""
=========================================================
RadiologicHub — modèle 3D « Cancer du cavum » : base du crâne, foramens,
espaces profonds de la face et voies de propagation
---------------------------------------------------------
Source : pack Z-Anatomy (CC BY-SA 4.0), dérivé de BodyParts3D (CC BY-SA 2.1 Japon),
téléchargé à version figée par scripts/telecharger_z_anatomy.sh.

Usage (Blender sans interface, scripts du fichier .blend désactivés) :
    blender -b --disable-autoexec --python-exit-code 1 assets-sources/z-anatomy/Z-Anatomy/Startup.blend \\
            -P scripts/export_cavum.py
Contrôle visuel : dans la visionneuse de la fiche (fiches/cancer-du-cavum.html), sous Chromium.

Étapes :
  1. liste FERMÉE d'objets du pack (os de la base du crâne, C1-C2, muscles ptérygoïdiens,
     constricteur supérieur, muscles prévertébraux, nasopharynx, voile, trompes auditives,
     sinus caverneux, ganglions rétropharyngés, carotides internes, jugulaires internes, V, V2, V3) ;
  2. région gardée entre C2 et le dessus de la base du crâne (coupes horizontales) ;
  3. espaces profonds : ce ne sont pas des objets du pack ; ils sont construits comme des
     VOLUMES SCHÉMATIQUES (enveloppes convexes) calés sur les structures réelles qui les bordent :
       espace masticateur / fosse infratemporale  ptérygoïdiens, masséter, bas du temporal
       espace parapharyngé                         entre ptérygoïdien médial et constricteur supérieur
       espace carotidien                           autour de la carotide interne et de la jugulaire interne
       espace rétropharyngé                        entre constricteurs et muscles longs de la tête
       fosse ptérygopalatine                       autour du V2 entre foramen rond et fissure orbitaire inf.
     (l'espace prévertébral = les muscles prévertébraux eux-mêmes) ;
  4. foramens : position = endroit où le nerf ou le vaisseau qui les traverse est entouré d'os
     (12 rayons perpendiculaires à la courbe, ≥ 10 touchent l'os à moins de 6 mm) :
       foramen ovale (V3), foramen rond (V2), canal carotidien et apex pétreux / foramen lacerum (carotide
       interne), foramen jugulaire (jugulaire interne), canal de l'hypoglosse (XII) ; fosse ptérygopalatine,
       foramen sphénopalatin, fissure orbitaire inférieure et canal ptérygoïdien : repérés sur le trajet du V2
       et des artères palatines (voir REPERES) ; côté gauche = symétrique du droit ;
  5. voies de propagation (texte de la fiche) : lignes passant par ces repères ;
  6. repère commun : centré, ×10, Y en haut, Z vers l'avant (comme le glTF) ;
  7. un seul .glb (un objet nommé par structure), compressé meshopt (gltf-transform) ;
  8. cavum.json : structures, foramens, voies, empreinte du .glb.

Sorties :
  assets-sources/build/cavum/cavum.glb (non compressé)
  public/models/cavum/cavum.glb, cavum.json, LICENSE
=========================================================
"""
import bpy, bmesh, hashlib, json, math, os, shutil, subprocess, sys
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree

RACINE = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
BRUT = os.path.join(RACINE, 'assets-sources', 'build', 'cavum')
PUBLIC = os.path.join(RACINE, 'public', 'models', 'cavum')
GLTF_TRANSFORM = '@gltf-transform/cli@4.5.1'
Z_ANATOMY_COMMIT = '2b6cf98a8ca012571ecb252e5c077b42a21b3b61'
Z_BAS, Z_HAUT = 1.468, 1.598          # région gardée (repère du pack, m) : C2 → juste au-dessus de la base du crâne
ECHELLE = 10

def arreter(msg):
    print('ERREUR export_cavum :', msg); sys.exit(1)

# ---------- Structures : id · objet(s) du pack · nom français · catégorie · triangles visés ----------
def deux(id_, nom_pack, nom, cat, tri):
    return [(id_ + '-d', nom_pack + '.r', nom + ' droit', cat, tri), (id_ + '-g', nom_pack + '.l', nom + ' gauche', cat, tri)]

STRUCTURES = [
    ('sphenoide', 'Sphenoid bone', 'Sphénoïde', 'os', 9000),
    ('occipital', 'Occipital bone', 'Occipital', 'os', 7000),
    ('vomer', 'Vomer', 'Vomer', 'os', 1200),
    ('atlas', 'Atlas (C1)', 'Atlas (C1)', 'os', 2500),
    ('axis', 'Axis (C2)', 'Axis (C2)', 'os', 2500),
    ('mandibule', 'Mandible', 'Mandibule', 'os-contexte', 5000),
    *deux('temporal', 'Temporal bone', 'Temporal', 'os', 8000),
    *deux('maxillaire', 'Maxilla', 'Maxillaire', 'os', 5000),
    *deux('palatin', 'Palatine bone', 'Palatin', 'os', 1500),
    *deux('pterygoidien-medial', 'Medial pterygoid muscle', 'Ptérygoïdien médial', 'muscle', 900),
    *deux('pterygoidien-lateral-sup', 'Superior head of lateral pterygoid muscle', 'Ptérygoïdien latéral (chef sup.)', 'muscle', 500),
    *deux('pterygoidien-lateral-inf', 'Inferior head of lateral pterygoid muscle', 'Ptérygoïdien latéral (chef inf.)', 'muscle', 600),
    *deux('constricteur-sup', 'Superior pharyngeal constrictor', 'Constricteur supérieur du pharynx', 'pharynx', 2500),
    *deux('long-tete', 'Longus capitis muscle', 'Long de la tête', 'prevertebral', 1500),
    *deux('long-cou', 'Longus colli muscle', 'Long du cou', 'prevertebral', 2000),
    ('nasopharynx', 'Nasopharynx', 'Nasopharynx (cavum)', 'muqueuse', None),
    ('oropharynx', 'Oropharynx', 'Oropharynx', 'muqueuse', None),
    ('voile', 'Soft palate', 'Voile du palais', 'muqueuse', None),
    *deux('trompe', 'Auditory tube', 'Trompe auditive', 'muqueuse', None),
    *deux('sinus-caverneux', 'Cavernous sinus', 'Sinus caverneux', 'veine', None),
    *deux('ganglions-retropharynges', 'Retropharyngeal nodes', 'Ganglions rétropharyngés', 'ganglion', None),
]
# Courbes (nerfs, vaisseaux) : diamètre d'affichage en mm
COURBES = [
    *[(f'carotide-interne-{c}', f'Internal carotid artery.{s}', f'Carotide interne {n}', 'artere', 4.5) for c, s, n in (('d', 'r', 'droite'), ('g', 'l', 'gauche'))],
    *[(f'jugulaire-interne-{c}', f'Internal jugular vein.{s}', f'Jugulaire interne {n}', 'veine', 7.0) for c, s, n in (('d', 'r', 'droite'), ('g', 'l', 'gauche'))],
    *[(f'trijumeau-{c}', f'Trigeminal nerve (V).{s}', f'Trijumeau (V) {n}', 'nerf', 2.6) for c, s, n in (('d', 'r', 'droit'), ('g', 'l', 'gauche'))],
    *[(f'v2-{c}', f'Maxillary nerve.{s}', f'Nerf maxillaire (V2) {n}', 'nerf', 1.8) for c, s, n in (('d', 'r', 'droit'), ('g', 'l', 'gauche'))],
    *[(f'v3-ant-{c}', f'Anterior division of mandibular nerve.{s}', f'Nerf mandibulaire (V3) {n}', 'nerf', 2.2) for c, s, n in (('d', 'r', 'droit'), ('g', 'l', 'gauche'))],
    *[(f'v3-post-{c}', f'Posterior division of mandibular nerve.{s}', f'Nerf mandibulaire (V3) {n}', 'nerf', 2.2) for c, s, n in (('d', 'r', 'droit'), ('g', 'l', 'gauche'))],
]

dg = bpy.context.evaluated_depsgraph_get()

def objet(nom):
    o = bpy.data.objects.get(nom)
    if o is None:
        arreter(f'objet absent du pack : {nom}')
    return o

def bm_monde(o):
    e = o.evaluated_get(dg); me = e.to_mesh()
    bm = bmesh.new(); bm.from_mesh(me); bm.transform(o.matrix_world); e.to_mesh_clear()
    return bm

def points_courbe(o, pas=0.0007):
    out = []
    for sp in o.data.splines:
        pts = [o.matrix_world @ p.co.xyz for p in sp.bezier_points] if sp.type == 'BEZIER' else [o.matrix_world @ Vector(p.co[:3]) for p in sp.points]
        for a, b in zip(pts, pts[1:]):
            n = max(1, int((b - a).length / pas)); out += [a.lerp(b, i / n) for i in range(n)]
        if pts: out.append(pts[-1])
    return out

def couper(bm, z_bas=Z_BAS, z_haut=Z_HAUT):
    for z, garde_dessus in ((z_bas, True), (z_haut, False)):
        geom = bm.verts[:] + bm.edges[:] + bm.faces[:]
        bmesh.ops.bisect_plane(bm, geom=geom, plane_co=(0, 0, z), plane_no=(0, 0, 1),
                               clear_inner=garde_dessus, clear_outer=not garde_dessus)
    return bm

# ---------- Os pour la sonde des foramens ----------
def bvh(nom):
    bm = bm_monde(objet(nom)); bm.normal_update(); t = BVHTree.FromBMesh(bm); bm.free(); return t
OS_SONDE = {n: bvh(n) for n in ['Sphenoid bone', 'Occipital bone', 'Temporal bone.r', 'Palatine bone.r', 'Maxilla.r']}

def entoure(p, t, R=0.006, N=12):
    t = t.normalized(); a = t.orthogonal().normalized(); b = t.cross(a); n = 0
    for i in range(N):
        ang = 2 * math.pi * i / N; d = a * math.cos(ang) + b * math.sin(ang)
        if any(tr.ray_cast(p, d, R)[0] is not None for tr in OS_SONDE.values()): n += 1
    return n

def passages(nom_courbe, seuil=10):
    pts = points_courbe(objet(nom_courbe)); runs = []
    for k, p in enumerate(pts):
        t = pts[min(k + 1, len(pts) - 1)] - pts[max(k - 1, 0)]
        if t.length and entoure(p, t) >= seuil:
            if runs and k - runs[-1][-1] <= 3: runs[-1].append(k)
            else: runs.append([k])
    return pts, [sum((pts[k] for k in r), Vector()) / len(r) for r in runs]

# ---------- Repères (côté droit, repère du pack) ----------
def reperes():
    R = {}
    v2, p_v2 = passages('Maxillary nerve.r')
    R['foramen-rond'] = max((p for p in p_v2 if p.z > 1.585), key=lambda p: -p.y, default=None)   # dernier passage osseux avant la FPP
    _, p_v = passages('Trigeminal nerve (V).r')
    R['foramen-ovale'] = p_v[-1]                                     # le tronc du V3 traverse le sphénoïde
    ica, p_ica = passages('Internal carotid artery.r')
    R['canal-carotidien'] = p_ica[0]                                 # entrée dans le rocher
    R['foramen-lacerum'] = p_ica[1] + Vector((0, 0, -0.004))          # sortie à l'apex pétreux, au-dessus du lacerum
    _, p_ijv = passages('Internal jugular vein.r', seuil=9)
    R['foramen-jugulaire'] = p_ijv[0]
    _, p_xii = passages('Hypoglossal nerve (XII).r', seuil=9)
    R['canal-hypoglosse'] = p_xii[0]
    if None in R.values() or not R['foramen-rond']:
        arreter(f'repères osseux introuvables : {R}')
    # V2 après le foramen rond : fosse ptérygopalatine (FPP), puis fissure orbitaire inférieure (entrée dans le maxillaire)
    k_fr = min(range(len(v2)), key=lambda k: (v2[k] - R['foramen-rond']).length)
    maxi = OS_SONDE['Maxilla.r']
    k_foi = next(k for k in range(k_fr, len(v2)) if maxi.find_nearest(v2[k])[3] < 0.0012)
    R['fissure-orbitaire-inf'] = v2[k_foi]
    R['fpp'] = (v2[k_fr] * 0.45 + v2[k_foi] * 0.55) + Vector((0, 0, -0.006))
    R['_v2_fpp'] = [v2[k] for k in range(k_fr, k_foi + 1, 3)]
    R['foramen-sphenopalatin'] = R['fpp'] + Vector((0.006, -0.001, 0.003))   # paroi médiale de la FPP
    R['canal-pterygoidien'] = R['fpp'] * 0.55 + R['foramen-lacerum'] * 0.45 + Vector((0.002, 0, -0.004))
    # fissure orbitaire supérieure : en avant du sinus caverneux, au-dessus du foramen rond
    sc = [objet('Cavernous sinus.r').matrix_world @ v.co for v in objet('Cavernous sinus.r').data.vertices]
    ant = min(sc, key=lambda p: p.y)
    R['fissure-orbitaire-sup'] = R['foramen-rond'] + Vector((-0.001, -0.004, 0.007))     # au-dessus et en avant du foramen rond
    R['sinus-caverneux'] = sum(sc, Vector()) / len(sc)
    # cavum : fossette de Rosenmüller = en arrière et au-dessus de l'ostium de la trompe
    tr = [objet('Auditory tube.r').matrix_world @ v.co for v in objet('Auditory tube.r').data.vertices]
    ostium = max(tr, key=lambda p: p.x)                               # extrémité médiale (pharyngienne)
    R['ostium-trompe'] = ostium
    R['rosenmuller'] = ostium + Vector((0.0, 0.007, 0.003))         # récessus latéral : en arrière et au-dessus du torus
    nas = [objet('Nasopharynx').matrix_world @ v.co for v in objet('Nasopharynx').data.vertices]
    R['choane'] = Vector((-0.004, min(p.y for p in nas) - 0.004, sum(p.z for p in nas) / len(nas)))
    R['oropharynx'] = sum((objet('Oropharynx').matrix_world @ v.co for v in objet('Oropharynx').data.vertices), Vector()) / len(objet('Oropharynx').data.vertices) + Vector((-0.006, 0, 0))
    lc = [objet('Longus capitis muscle.r').matrix_world @ v.co for v in objet('Longus capitis muscle.r').data.vertices]
    R['prevertebral'] = sum((p for p in lc if 1.53 < p.z < 1.55), Vector()) / max(1, len([p for p in lc if 1.53 < p.z < 1.55]))
    R['clivus'] = Vector((-0.002, 0.004, 1.572))
    R['rang'] = len(v2)
    return R

# ---------- Volumes schématiques des espaces ----------
def enveloppe(points, nom):
    bm = bmesh.new()
    for p in points: bm.verts.new(p)
    bmesh.ops.convex_hull(bm, input=bm.verts[:])
    me = bpy.data.meshes.new(nom); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(nom, me); bpy.context.scene.collection.objects.link(o)
    return o

def sommets(nom, filtre=lambda p: True):
    o = objet(nom); return [p for p in (o.matrix_world @ v.co for v in o.data.vertices) if filtre(p)]

def boule(c, r, n=14):
    return [c + Vector((r * math.cos(a) * math.cos(b), r * math.sin(a) * math.cos(b), r * math.sin(b)))
            for a in [2 * math.pi * i / n for i in range(n)] for b in [math.pi * (j / 6 - 0.5) for j in range(7)]]

def espaces(R):
    E = {}
    for c, s in (('d', 'r'), ('g', 'l')):
        sgn = -1 if s == 'r' else 1
        zc = lambda p, a=1.47, b=1.572: a < p.z < b
        mast = (sommets(f'Medial pterygoid muscle.{s}', zc) + sommets(f'Superior head of lateral pterygoid muscle.{s}', zc)
                + sommets(f'Inferior head of lateral pterygoid muscle.{s}', zc) + sommets(f'Deep part of masseter.{s}', zc)
                + sommets(f'Temporalis muscle.{s}', lambda p: 1.55 < p.z < 1.572))
        E[f'espace-masticateur-{c}'] = mast
        mp = sommets(f'Medial pterygoid muscle.{s}', lambda p: 1.495 < p.z < 1.566)
        xm = sum(p.x for p in mp) / len(mp)
        cs = sommets(f'Superior pharyngeal constrictor.{s}', lambda p: 1.495 < p.z < 1.566)
        xc = sum(p.x for p in cs) / len(cs)
        ica = [p for p in points_courbe(objet(f'Internal carotid artery.{s}')) if 1.495 < p.z < 1.566]
        y_ica = min(p.y for p in ica)
        pps = [p for p in mp if sgn * (p.x - xm) < 0] + [p for p in cs if sgn * (p.x - xc) > 0 and p.y < y_ica - 0.002]
        E[f'espace-parapharynge-{c}'] = [p for p in pps if p.y < y_ica - 0.002]
        ijv = [p for p in points_courbe(objet(f'Internal jugular vein.{s}')) if 1.48 < p.z < 1.566]
        E[f'espace-carotidien-{c}'] = [q for p in ica + ijv for q in boule(p, 0.0045, 8)]
    # rétropharyngé (médian) : entre la face postérieure des constricteurs et la face antérieure des muscles longs de la tête
    zr = lambda p: 1.485 < p.z < 1.558
    arr = []
    for s in 'rl':
        cs = sommets(f'Superior pharyngeal constrictor.{s}', zr); ym = sum(p.y for p in cs) / len(cs)
        arr += [p for p in cs if p.y > ym + 0.004]
        lc = sommets(f'Longus capitis muscle.{s}', zr); yl = sum(p.y for p in lc) / len(lc)
        arr += [p + Vector((0, -0.0015, 0)) for p in lc if p.y < yl]
    E['espace-retropharynge'] = arr
    # fosse ptérygopalatine : autour du V2 entre foramen rond et fissure orbitaire inférieure, prolongée vers le bas
    for c, sgn in (('d', 1), ('g', -1)):
        pts = [Vector((sgn * p.x, p.y, p.z)) for p in R['_v2_fpp']] + [Vector((sgn * R['fpp'].x, R['fpp'].y, R['fpp'].z - 0.008))]
        E[f'fosse-pterygopalatine-{c}'] = [q for p in pts for q in boule(p, 0.0032, 8)]
    return E

# ---------- Voies de propagation (texte de la fiche, partie III) ----------
VOIES = [
    ('anterieure', 'Antérieure', [
        ('cavites-nasales', 'Cavités nasales (continuité directe)', ['rosenmuller', 'choane']),
        ('fpp', 'Fosse ptérygopalatine par le foramen sphénopalatin', ['rosenmuller', 'foramen-sphenopalatin', 'fpp']),
        ('v2', 'FPP → foramen rond (V2) → sinus caverneux', ['fpp', 'foramen-rond', 'sinus-caverneux']),
        ('orbite', 'FPP → fissure orbitaire inf. → apex orbitaire → fissure orbitaire sup. → endocrâne', ['fpp', 'fissure-orbitaire-inf', 'fissure-orbitaire-sup', 'sinus-caverneux']),
        ('vidien', 'FPP → canal ptérygoïdien (nerf vidien)', ['fpp', 'canal-pterygoidien', 'foramen-lacerum']),
        ('fit', 'FPP → fosse infratemporale → V3 → foramen ovale → endocrâne', ['fpp', 'fosse-infratemporale', 'foramen-ovale', 'sinus-caverneux']),
    ]),
    ('laterale', 'Latérale', [
        ('pps', 'Espace parapharyngé (franchissement du fascia pharyngo-basilaire)', ['rosenmuller', 'parapharynge']),
        ('eustache', "Voie indirecte par l'orifice d'Eustache → espace masticateur → V3 → foramen ovale → endocrâne", ['rosenmuller', 'ostium-trompe', 'fosse-infratemporale', 'foramen-ovale', 'sinus-caverneux']),
        ('lacerum', 'Foramen lacerum → extension intracrânienne', ['rosenmuller', 'foramen-lacerum', 'sinus-caverneux']),
    ]),
    ('posterieure', 'Postérieure', [
        ('rpp', 'Espace rétropharyngé → muscles prévertébraux', ['rosenmuller', 'retropharynge', 'prevertebral']),
        ('carotidien', 'Espace carotidien', ['rosenmuller', 'retropharynge', 'carotidien']),
        ('jugulaire', 'Foramen jugulaire', ['carotidien', 'foramen-jugulaire']),
        ('hypoglosse', "Canal de l'hypoglosse", ['retropharynge', 'canal-hypoglosse']),
    ]),
    ('inferieure', 'Inférieure', [
        ('oropharynx', 'Muqueuse oropharyngée, loge amygdalienne (parfois sous-muqueuse)', ['rosenmuller', 'oropharynx']),
    ]),
    ('superieure', 'Supérieure (intracrânienne)', [
        ('base', 'Lyse directe de la base du crâne (clivus)', ['rosenmuller', 'clivus', 'sinus-caverneux']),
        ('lacerum-sup', 'Foramen lacerum', ['rosenmuller', 'foramen-lacerum', 'sinus-caverneux']),
        ('ovale-sup', 'Foramen ovale', ['fosse-infratemporale', 'foramen-ovale', 'sinus-caverneux']),
        ('fo-sup', 'Fissures orbitaires inf. puis sup.', ['fpp', 'fissure-orbitaire-inf', 'fissure-orbitaire-sup', 'sinus-caverneux']),
    ]),
]
FORAMENS = [
    ('foramen-rond', 'Foramen rond', 'V2'),
    ('foramen-ovale', 'Foramen ovale', 'V3'),
    ('foramen-lacerum', 'Foramen lacerum', 'fibrocartilage'),
    ('canal-carotidien', 'Canal carotidien', 'carotide interne'),
    ('foramen-jugulaire', 'Foramen jugulaire', 'IX, X, XI, jugulaire interne'),
    ('canal-hypoglosse', "Canal de l'hypoglosse", 'XII'),
    ('canal-pterygoidien', 'Canal ptérygoïdien', 'nerf vidien'),
    ('foramen-sphenopalatin', 'Foramen sphénopalatin', 'cavité nasale ↔ FPP'),
    ('fissure-orbitaire-inf', 'Fissure orbitaire inférieure', 'FPP ↔ orbite'),
    ('fissure-orbitaire-sup', 'Fissure orbitaire supérieure', 'orbite ↔ endocrâne'),
]
NOMS_ESPACES = {
    'espace-masticateur': 'Espace masticateur / fosse infratemporale', 'espace-parapharynge': 'Espace parapharyngé',
    'espace-carotidien': 'Espace carotidien', 'espace-retropharynge': 'Espace rétropharyngé',
    'fosse-pterygopalatine': 'Fosse ptérygopalatine',
}

# ---------- Construction ----------
def main():
    os.makedirs(BRUT, exist_ok=True)
    R = reperes()
    E = espaces(R)
    centre = Vector((0.0, (R['choane'].y + R['foramen-jugulaire'].y) / 2, 1.545))
    def vers_gltf(p):            # repère du pack → repère glTF exporté (centré, ×10, Y haut, Z avant)
        q = (p - centre) * ECHELLE
        return [round(q.x, 4), round(q.z, 4), round(-q.y, 4)]
    # points nommés supplémentaires : centres des espaces
    def ctr(pts): return sum(pts, Vector()) / len(pts)
    R['parapharynge'] = ctr(E['espace-parapharynge-d'])
    R['carotidien'] = ctr([p for p in E['espace-carotidien-d'] if 1.53 < p.z < 1.55])
    R['retropharynge'] = Vector((R['rosenmuller'].x * 0.4, ctr(E['espace-retropharynge']).y, 1.548))
    R['fosse-infratemporale'] = ctr([p for p in E['espace-masticateur-d'] if p.z > 1.548]) + Vector((0.004, 0, 0))

    objets = []
    for id_, src, nom, cat, tri in STRUCTURES:
        o = objet(src); bm = couper(bm_monde(o))
        if not bm.verts: bm.free(); continue
        me = bpy.data.meshes.new(id_); bm.to_mesh(me); bm.free()
        n = bpy.data.objects.new(id_, me); bpy.context.scene.collection.objects.link(n)
        if tri and len(me.polygons) > tri:
            m = n.modifiers.new('dec', 'DECIMATE'); m.ratio = tri / len(me.polygons)
            bpy.context.view_layer.objects.active = n; bpy.ops.object.modifier_apply(modifier='dec')
        n['rh'] = json.dumps({'nom': nom, 'cat': cat}); objets.append((n, nom, cat))
    for id_, src, nom, cat, mm in COURBES:
        o = objet(src); pts = [p for p in points_courbe(o, 0.0015) if Z_BAS < p.z < Z_HAUT + 0.03]
        cu = bpy.data.curves.new(id_, 'CURVE'); cu.dimensions = '3D'; cu.bevel_depth = mm / 2000; cu.bevel_resolution = 2
        sp = cu.splines.new('POLY'); sp.points.add(len(pts) - 1)
        for p, q in zip(sp.points, pts): p.co = (q.x, q.y, q.z, 1)
        co = bpy.data.objects.new(id_ + '-c', cu); bpy.context.scene.collection.objects.link(co)
        me = bpy.data.meshes.new_from_object(co.evaluated_get(bpy.context.evaluated_depsgraph_get()))
        bpy.data.objects.remove(co)
        n = bpy.data.objects.new(id_, me); bpy.context.scene.collection.objects.link(n)
        n['rh'] = json.dumps({'nom': nom, 'cat': cat}); objets.append((n, nom, cat))
    for id_, pts in E.items():
        n = enveloppe(pts, id_)
        base = id_.rsplit('-', 1)[0] if id_[-2:] in ('-d', '-g') else id_
        cote = {'-d': ' droit', '-g': ' gauche'}.get(id_[-2:], '')
        nom = NOMS_ESPACES[base] + (cote if base != 'fosse-pterygopalatine' else cote.replace('droit', 'droite'))
        sm = n.modifiers.new('lisse', 'SUBSURF'); sm.levels = 1
        bpy.context.view_layer.objects.active = n; bpy.ops.object.modifier_apply(modifier='lisse')
        n['rh'] = json.dumps({'nom': nom, 'cat': 'espace', 'espace': base}); objets.append((n, nom, 'espace'))

    # recentrage commun et export
    T = Matrix.Translation(-centre)
    S = Matrix.Diagonal((ECHELLE, ECHELLE, ECHELLE, 1))
    bpy.ops.object.select_all(action='DESELECT')
    for n, _, _ in objets:
        n.data.transform(S @ T @ n.matrix_world); n.matrix_world = Matrix.Identity(4)
        n.data.materials.clear(); n.data.materials.append(bpy.data.materials.get('rh-' + n.name) or bpy.data.materials.new('rh-' + n.name))
        for p in n.data.polygons: p.use_smooth = True
        n.select_set(True)
    brut = os.path.join(BRUT, 'cavum.glb')
    bpy.ops.export_scene.gltf(filepath=brut, export_format='GLB', use_selection=True, export_yup=True,
                              export_apply=True, export_materials='PLACEHOLDER', export_normals=True)
    donnees = {
        'source': f'Z-Anatomy (CC BY-SA 4.0), commit {Z_ANATOMY_COMMIT}, dérivé de BodyParts3D (CC BY-SA 2.1 JP)',
        'repere': 'centré sur le cavum, ×10, +Y haut, +Z avant du patient, −X côté droit du patient',
        'structures': [{'id': n.name, 'nom': nom, 'cat': cat, **({'espace': json.loads(n['rh']).get('espace')} if cat == 'espace' else {})} for n, nom, cat in objets],
        'foramens': [{'id': f'{i}-{c}', 'base': i, 'nom': f'{nom}{" (droit)" if c == "d" else " (gauche)"}', 'contenu': cont,
                      'pos': vers_gltf(Vector((sg * R[i].x, R[i].y, R[i].z)))}
                     for i, nom, cont in FORAMENS for c, sg in (('d', 1), ('g', -1))],
        'points': {k: vers_gltf(v) for k, v in R.items() if isinstance(v, Vector)},
        'tumeur': vers_gltf(R['rosenmuller']),
        'voies': [{'id': d, 'nom': nd, 'trajets': [{'id': t, 'texte': tx, 'par': par, 'pts': [vers_gltf(R[k]) for k in par]} for t, tx, par in tr]}
                  for d, nd, tr in VOIES],
    }
    os.makedirs(PUBLIC, exist_ok=True)
    final = os.path.join(PUBLIC, 'cavum.glb')
    npx = shutil.which('npx') or arreter('npx introuvable')
    r = subprocess.run([npx, '--yes', GLTF_TRANSFORM, 'meshopt', brut, final], capture_output=True, text=True)
    if r.returncode != 0: arreter('gltf-transform : ' + (r.stderr or r.stdout))
    with open(final, 'rb') as f: donnees['empreinte'] = hashlib.sha256(f.read()).hexdigest()[:12]
    donnees['octets'] = os.path.getsize(final)
    json.dump(donnees, open(os.path.join(PUBLIC, 'cavum.json'), 'w'), ensure_ascii=False, indent=1)
    shutil.copy(os.path.join(RACINE, 'assets-sources', 'z-anatomy', 'License.txt'), os.path.join(PUBLIC, 'LICENSE-Z-Anatomy.txt'))
    print('EXPORT OK', donnees['octets'], 'octets')

main()
