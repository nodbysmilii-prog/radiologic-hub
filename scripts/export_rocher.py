"""
=========================================================
RadiologicHub — modèle 3D « Cholestéatome » : rocher droit, osselets,
oreille interne, nerf facial et vaisseaux au contact
---------------------------------------------------------
Source : pack Z-Anatomy (CC BY-SA 4.0), dérivé de BodyParts3D (CC BY-SA 2.1 Japon),
téléchargé à version figée par scripts/telecharger_z_anatomy.sh.

Usage (Blender sans interface, scripts du fichier .blend désactivés) :
    blender -b --disable-autoexec --python-exit-code 1 assets-sources/z-anatomy/Z-Anatomy/Startup.blend \\
            -P scripts/export_rocher.py
Contrôle visuel : dans la visionneuse de la fiche (fiches/cholesteatome.html), sous Chromium.

Étapes :
  1. liste FERMÉE d'objets du pack, côté droit : os temporal, marteau, enclume, étrier,
     membrane tympanique, cochlée, vestibule (avec les canaux semi-circulaires), trompe auditive ;
     courbes : nerf facial (VII), corde du tympan, nerf vestibulo-cochléaire (VIII),
     carotide interne, jugulaire interne, sinus sigmoïde et transverse (tubes au diamètre indiqué) ;
  2. région gardée : boîte de l'os temporal droit (+ 4 mm) ;
  3. osselets et oreille interne lissés (subdivision 1) ;
  4. repère commun : centré sur la caisse (centre des osselets), ×25, Y en haut, Z vers l'avant ;
  5. un seul .glb (un objet nommé par structure), compressé meshopt (gltf-transform) ;
  6. rocher.json : structures (nom français, catégorie), points de repère, empreinte du .glb.

Sorties :
  assets-sources/build/rocher/rocher.glb (non compressé)
  public/models/rocher/rocher.glb, rocher.json, LICENSE-Z-Anatomy.txt
=========================================================
"""
import bpy, bmesh, hashlib, json, os, shutil, subprocess, sys
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree

RACINE = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
BRUT = os.path.join(RACINE, 'assets-sources', 'build', 'rocher')
PUBLIC = os.path.join(RACINE, 'public', 'models', 'rocher')
GLTF_TRANSFORM = '@gltf-transform/cli@4.5.1'
Z_ANATOMY_COMMIT = '2b6cf98a8ca012571ecb252e5c077b42a21b3b61'
ECHELLE = 25
MARGE = 0.004

def arreter(msg):
    print('ERREUR export_rocher :', msg); sys.exit(1)

# id · objet du pack · nom français · catégorie · triangles visés (None = tel quel) · lissage
STRUCTURES = [
    ('temporal', 'Temporal bone.r', 'Os temporal (rocher, mastoïde, écaille)', 'os', 14000, False),
    ('marteau', 'Malleus.r', 'Marteau (malléus)', 'osselet', None, True),
    ('enclume', 'Incus.r', 'Enclume (incus)', 'osselet', None, True),
    ('etrier', 'Stapes.r', 'Étrier (stapes)', 'osselet', None, True),
    ('tympan', 'Tympanic membrane.r', 'Membrane tympanique', 'tympan', None, True),
    ('cochlee', 'Cochlea.r', 'Cochlée', 'labyrinthe', None, True),
    ('vestibule', 'Vestibule.r', 'Vestibule et canaux semi-circulaires', 'labyrinthe', None, True),
    ('trompe', 'Auditory tube.r', "Trompe auditive (d'Eustache)", 'trompe', None, False),
]
# Courbes : diamètre d'affichage en mm · distance maximale à l'os temporal gardée (mm) :
# seules les portions au contact du rocher sont gardées (pas les branches du VII dans la face,
# ni la partie cervicale de la jugulaire ou de la carotide)
COURBES = [
    ('facial', 'Facial nerve (VII).r', 'Nerf facial (VII)', 'nerf', 1.5, 2.5),
    ('corde-tympan', 'Chorda tympani.r', 'Corde du tympan', 'nerf', 0.6, 3.0),
    ('cochleo-vestibulaire', 'Vestibulocochlear nerve (VIII).r', 'Nerf vestibulo-cochléaire (VIII)', 'nerf', 2.2, 3.0),
    ('carotide', 'Internal carotid artery.r', 'Carotide interne (canal carotidien)', 'artere', 4.5, 3.5),
    ('jugulaire', 'Internal jugular vein.r', 'Golfe et veine jugulaire interne', 'veine', 7.5, 5.0),
    ('sigmoide', 'Sigmoid sinus.r', 'Sinus sigmoïde', 'veine', 7.0, 6.0),
    ('transverse', 'Transverse sinus.r', 'Sinus transverse (latéral)', 'veine', 7.0, 6.0),
]

def objet(nom):
    o = bpy.data.objects.get(nom)
    if o is None: arreter(f'objet absent du pack : {nom}')
    return o

def bm_monde(o):
    dg = bpy.context.evaluated_depsgraph_get()
    e = o.evaluated_get(dg); me = e.to_mesh()
    bm = bmesh.new(); bm.from_mesh(me); bm.transform(o.matrix_world); e.to_mesh_clear()
    return bm

def troncons(o, garder, pas=0.0005):
    """Points de chaque spline, découpés en tronçons continus où garder(p) est vrai."""
    out = []
    for sp in o.data.splines:
        pts = [o.matrix_world @ p.co.xyz for p in sp.bezier_points] if sp.type == 'BEZIER' else [o.matrix_world @ Vector(p.co[:3]) for p in sp.points]
        fin = []
        for a, b in zip(pts, pts[1:]):
            n = max(1, int((b - a).length / pas)); fin += [a.lerp(b, i / n) for i in range(n)]
        if pts: fin.append(pts[-1])
        ok = [garder(p) for p in fin]
        # petits trous (< 4 mm) entre deux portions gardées : comblés (canal mal fermé dans le maillage)
        i = 0
        while i < len(ok):
            if not ok[i]:
                j = i
                while j < len(ok) and not ok[j]: j += 1
                if i > 0 and j < len(ok) and (j - i) * pas < 0.004: ok[i:j] = [True] * (j - i)
                i = j
            else: i += 1
        cur = []
        for p, k in zip(fin, ok):
            if k: cur.append(p)
            elif cur: out.append(cur); cur = []
        if cur: out.append(cur)
    return [t for t in out if len(t) >= 4]

def boite(nom):
    bm = bm_monde(objet(nom)); xs = [v.co for v in bm.verts]; bm.free()
    lo = Vector((min(p.x for p in xs), min(p.y for p in xs), min(p.z for p in xs))) - Vector((MARGE,) * 3)
    hi = Vector((max(p.x for p in xs), max(p.y for p in xs), max(p.z for p in xs))) + Vector((MARGE,) * 3)
    return lo, hi

def couper(bm, lo, hi):
    for axe in range(3):
        for val, garde_dessus in ((lo[axe], True), (hi[axe], False)):
            no = [0, 0, 0]; no[axe] = 1; co = [0, 0, 0]; co[axe] = val
            geom = bm.verts[:] + bm.edges[:] + bm.faces[:]
            bmesh.ops.bisect_plane(bm, geom=geom, plane_co=co, plane_no=no, clear_inner=garde_dessus, clear_outer=not garde_dessus)
    return bm

def centre_de(noms):
    pts = []
    for n in noms:
        bm = bm_monde(objet(n)); pts += [v.co.copy() for v in bm.verts]; bm.free()
    return sum(pts, Vector()) / len(pts)

def main():
    os.makedirs(BRUT, exist_ok=True)
    lo, hi = boite('Temporal bone.r')
    dans = lambda p: all(lo[i] <= p[i] <= hi[i] for i in range(3))
    centre = centre_de(['Malleus.r', 'Incus.r'])
    def vers_gltf(p):
        q = (p - centre) * ECHELLE
        return [round(q.x, 4), round(q.z, 4), round(-q.y, 4)]
    objets = []
    for id_, src, nom, cat, tri, lisse in STRUCTURES:
        bm = couper(bm_monde(objet(src)), lo, hi)
        if not bm.verts: bm.free(); continue
        me = bpy.data.meshes.new(id_); bm.to_mesh(me); bm.free()
        n = bpy.data.objects.new(id_, me); bpy.context.scene.collection.objects.link(n)
        bpy.context.view_layer.objects.active = n
        if lisse:
            m = n.modifiers.new('lisse', 'SUBSURF'); m.levels = 1; bpy.ops.object.modifier_apply(modifier='lisse')
        if tri and len(me.polygons) > tri:
            m = n.modifiers.new('dec', 'DECIMATE'); m.ratio = tri / len(me.polygons); bpy.ops.object.modifier_apply(modifier='dec')
        objets.append((n, nom, cat))
    bm = bm_monde(objet('Temporal bone.r')); arbre = BVHTree.FromBMesh(bm); bm.free()
    def proche(p, mm):
        r = arbre.find_nearest(p); return r[0] is not None and r[3] <= mm / 1000
    import math
    DIRS = [Vector((math.cos(a) * math.sin(b), math.sin(a) * math.sin(b), math.cos(b))) for a in [i * math.pi / 4 for i in range(8)] for b in (math.pi / 4, math.pi / 2, 3 * math.pi / 4)] + [Vector((0, 0, 1)), Vector((0, 0, -1))]
    def entoure(p, R=0.015):        # dans un canal osseux : presque toutes les directions touchent l'os
        return sum(arbre.ray_cast(p, d, R)[0] is not None for d in DIRS) >= len(DIRS) - 3
    points = {}
    for id_, src, nom, cat, mm, dmax in COURBES:
        ts = troncons(objet(src), lambda p: dans(p) and (proche(p, dmax) or entoure(p)))
        if not ts: print('courbe hors région :', src); continue
        cu = bpy.data.curves.new(id_, 'CURVE'); cu.dimensions = '3D'; cu.bevel_depth = mm / 2000; cu.bevel_resolution = 3
        cu.use_fill_caps = True
        for pts in ts:
            sp = cu.splines.new('POLY'); sp.points.add(len(pts) - 1)
            for p, q in zip(sp.points, pts): p.co = (q.x, q.y, q.z, 1)
        pts = [p for t in ts for p in t]
        co = bpy.data.objects.new(id_ + '-c', cu); bpy.context.scene.collection.objects.link(co)
        me = bpy.data.meshes.new_from_object(co.evaluated_get(bpy.context.evaluated_depsgraph_get()))
        bpy.data.objects.remove(co)
        n = bpy.data.objects.new(id_, me); bpy.context.scene.collection.objects.link(n)
        objets.append((n, nom, cat))
        points[id_] = [vers_gltf(p) for p in pts[::max(1, len(pts) // 60)]]
    T = Matrix.Translation(-centre); S = Matrix.Diagonal((ECHELLE, ECHELLE, ECHELLE, 1))
    bpy.ops.object.select_all(action='DESELECT')
    for n, _, _ in objets:
        n.data.transform(S @ T @ n.matrix_world); n.matrix_world = Matrix.Identity(4)
        n.data.materials.clear(); n.data.materials.append(bpy.data.materials.new('rh-' + n.name))
        for p in n.data.polygons: p.use_smooth = True
        n.select_set(True)
    brut = os.path.join(BRUT, 'rocher.glb')
    bpy.ops.export_scene.gltf(filepath=brut, export_format='GLB', use_selection=True, export_yup=True,
                              export_apply=True, export_materials='PLACEHOLDER', export_normals=True)
    centres = {}
    for n, _, _ in objets:
        vs = [v.co for v in n.data.vertices]; c = sum(vs, Vector()) / len(vs)
        centres[n.name] = [round(c.x, 4), round(c.z, 4), round(-c.y, 4)]
    donnees = {
        'source': f'Z-Anatomy (CC BY-SA 4.0), commit {Z_ANATOMY_COMMIT}, dérivé de BodyParts3D (CC BY-SA 2.1 JP)',
        'repere': 'rocher droit, centré sur la caisse du tympan (osselets), ×25, +Y haut, +Z avant du patient, −X latéral (côté droit du patient)',
        'echelle_mm': 1000 / ECHELLE / 1000 * 1000,
        'structures': [{'id': n.name, 'nom': nom, 'cat': cat, 'centre': centres[n.name]} for n, nom, cat in objets],
        'trajets': points,
    }
    os.makedirs(PUBLIC, exist_ok=True)
    final = os.path.join(PUBLIC, 'rocher.glb')
    npx = shutil.which('npx') or arreter('npx introuvable')
    r = subprocess.run([npx, '--yes', GLTF_TRANSFORM, 'meshopt', brut, final], capture_output=True, text=True)
    if r.returncode != 0: arreter('gltf-transform : ' + (r.stderr or r.stdout))
    with open(final, 'rb') as f: donnees['empreinte'] = hashlib.sha256(f.read()).hexdigest()[:12]
    donnees['octets'] = os.path.getsize(final)
    json.dump(donnees, open(os.path.join(PUBLIC, 'rocher.json'), 'w'), ensure_ascii=False, indent=1)
    shutil.copy(os.path.join(RACINE, 'assets-sources', 'z-anatomy', 'License.txt'), os.path.join(PUBLIC, 'LICENSE-Z-Anatomy.txt'))
    print('EXPORT OK', donnees['octets'], 'octets', [(n.name, len(n.data.polygons)) for n, _, _ in objets])

main()
