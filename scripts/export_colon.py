"""
=========================================================
RadiologicHub — modèle 3D « Colites » : le cadre colique et ses segments
---------------------------------------------------------
Source : pack Z-Anatomy (CC BY-SA 4.0), dérivé de BodyParts3D (CC BY-SA 2.1 Japon),
téléchargé à version figée par scripts/telecharger_z_anatomy.sh.

Usage (Blender sans interface, scripts du fichier .blend désactivés) :
    blender -b --disable-autoexec --python-exit-code 1 assets-sources/z-anatomy/Z-Anatomy/Startup.blend \\
            -P scripts/export_colon.py
Contrôle visuel : visionneuse de la fiche (fiches/colites.html), sous Chromium.

  • segments du côlon tels que découpés dans le pack (caecum et côlon ascendant, transverse,
    descendant, sigmoïde), appendice, bandelettes (ténias), intestin grêle (courbe du pack), dont l'iléon terminal (9 cm autour de l'abouchement) ;
  • le caecum est séparé du côlon ascendant par un plan horizontal à la hauteur de l'abouchement
    de l'iléon (repère mesuré sur la courbe de l'intestin grêle) ;
  • repère : centré sur le cadre colique, ×10, Y en haut, Z vers l'avant, +X à gauche du patient ;
  • un seul .glb compressé meshopt (gltf-transform) + colon.json (noms français, empreinte).

Sorties : public/models/colon/colon.glb, colon.json, LICENSE-Z-Anatomy.txt
=========================================================
"""
import bpy, bmesh, hashlib, json, os, shutil, subprocess, sys
from mathutils import Vector, Matrix

RACINE = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
BRUT = os.path.join(RACINE, 'assets-sources', 'build', 'colon')
PUBLIC = os.path.join(RACINE, 'public', 'models', 'colon')
GLTF_TRANSFORM = '@gltf-transform/cli@4.5.1'
Z_ANATOMY_COMMIT = '2b6cf98a8ca012571ecb252e5c077b42a21b3b61'
ECHELLE = 10

def arreter(msg):
    print('ERREUR export_colon :', msg); sys.exit(1)

# id · objet(s) du pack · nom français · catégorie · triangles visés
STRUCTURES = [
    ('transverse', ['Transverse colon'], 'Côlon transverse', 'colon', 6000),
    ('descendant', ['Descending colon'], 'Côlon descendant', 'colon', 6000),
    ('sigmoide', ['Sigmoid colon'], 'Côlon sigmoïde', 'colon', 6000),
    ('appendice', ['Vermiform appendix'], 'Appendice', 'appendice', 1500),
    ('tenias', ['Free taenia', 'Mesocolic taenia', 'Omental taenia'], 'Bandelettes (ténias) du côlon', 'tenia', 3000),
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

def nouvel_objet(id_, bm):
    me = bpy.data.meshes.new(id_); bm.to_mesh(me); bm.free()
    n = bpy.data.objects.new(id_, me); bpy.context.scene.collection.objects.link(n)
    return n

def simplifier(n, tri):
    if tri and len(n.data.polygons) > tri:
        bpy.context.view_layer.objects.active = n
        m = n.modifiers.new('dec', 'DECIMATE'); m.ratio = tri / len(n.data.polygons); bpy.ops.object.modifier_apply(modifier='dec')

def coupe(source, co, no):
    bm = source.copy()
    res = bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], plane_co=co, plane_no=no, clear_outer=True)
    bord = [e for e in res['geom_cut'] if isinstance(e, bmesh.types.BMEdge)]
    if bord: bmesh.ops.holes_fill(bm, edges=bord, sides=0)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm

def main():
    os.makedirs(BRUT, exist_ok=True)
    objets = []
    # intestin grêle (courbe) : l'iléon terminal aboutit au caecum
    g = objet('Jejunum'); g.data.use_fill_caps = True
    me = bpy.data.meshes.new_from_object(g.evaluated_get(bpy.context.evaluated_depsgraph_get())); me.transform(g.matrix_world)
    grele = bpy.data.objects.new('grele-source', me); bpy.context.scene.collection.objects.link(grele)
    asc = bm_monde(objet('Ascending colon'))
    zs = [v.co.z for v in asc.verts]
    from mathutils.kdtree import KDTree
    kd = KDTree(len(asc.verts))
    for i, v in enumerate(asc.verts): kd.insert(v.co, i)
    kd.balance()
    # abouchement de l'iléon : extrémité de la courbe du grêle la plus proche de la paroi du côlon ascendant
    bouts = []
    for sp in g.data.splines:
        P = [g.matrix_world @ p.co.xyz for p in sp.bezier_points] if sp.type == 'BEZIER' else [g.matrix_world @ Vector(p.co[:3]) for p in sp.points]
        bouts += [P[0], P[-1]]
    ileon = min(bouts, key=lambda p: kd.find(p)[2])
    z_caecum = ileon.z
    print('REPERES', dict(z_ascendant=[round(min(zs) * 1000), round(max(zs) * 1000)], z_ileon=round(z_caecum * 1000)))
    Z = Vector((0, 0, 1))
    for id_, nom, garder in (('caecum', 'Caecum', '-'), ('ascendant', 'Côlon ascendant', '+')):
        bm = coupe(asc, Vector((0, 0, z_caecum)), Z if garder == '-' else -Z)
        n = nouvel_objet(id_, bm); simplifier(n, 4000)
        if not n.data.polygons: arreter('segment vide ' + id_)
        objets.append((n, nom, 'colon'))
    asc.free()
    for id_, srcs, nom, cat, tri in STRUCTURES:
        bm = bmesh.new()
        for s in srcs:
            b = bm_monde(objet(s)); m2 = bpy.data.meshes.new('tmp'); b.to_mesh(m2); b.free(); bm.from_mesh(m2); bpy.data.meshes.remove(m2)
        n = nouvel_objet(id_, bm); simplifier(n, tri); objets.append((n, nom, cat))
    # iléon terminal : portion du grêle à moins de R_ILEON de l'abouchement (repère pédagogique)
    R_ILEON = 0.09
    def portion(garder_pres):
        bm = bmesh.new(); bm.from_mesh(grele.data)
        sup = [f for f in bm.faces if ((f.calc_center_median() - ileon).length < R_ILEON) != garder_pres]
        bmesh.ops.delete(bm, geom=sup, context='FACES'); return bm
    ileon_t = nouvel_objet('ileon', portion(True)); reste = nouvel_objet('grele', portion(False))
    bpy.data.objects.remove(grele)
    simplifier(ileon_t, 3000); simplifier(reste, 6000)
    objets.append((ileon_t, 'Iléon terminal', 'grele')); objets.append((reste, 'Intestin grêle', 'grele'))

    # repère : centre du cadre colique
    V = [n.matrix_world @ v.co for n, _, c in objets if c == 'colon' for v in n.data.vertices]
    lo = Vector((min(v.x for v in V), min(v.y for v in V), min(v.z for v in V))); hi = Vector((max(v.x for v in V), max(v.y for v in V), max(v.z for v in V)))
    centre = (lo + hi) / 2
    T = Matrix.Translation(-centre); S = Matrix.Diagonal((ECHELLE, ECHELLE, ECHELLE, 1))
    bpy.ops.object.select_all(action='DESELECT')
    for n, *_ in objets:
        n.data.transform(S @ T @ n.matrix_world); n.matrix_world = Matrix.Identity(4)
        n.data.materials.clear(); n.data.materials.append(bpy.data.materials.new('rh-' + n.name))
        for p in n.data.polygons: p.use_smooth = True
        n.select_set(True)
    brut = os.path.join(BRUT, 'colon.glb')
    bpy.ops.export_scene.gltf(filepath=brut, export_format='GLB', use_selection=True, export_yup=True,
                              export_apply=True, export_materials='PLACEHOLDER', export_normals=True)
    def centre_de(n):
        vs = [v.co for v in n.data.vertices]; c = sum(vs, Vector()) / len(vs)
        return [round(c.x, 3), round(c.z, 3), round(-c.y, 3)]
    donnees = {
        'source': f'Z-Anatomy (CC BY-SA 4.0), commit {Z_ANATOMY_COMMIT}, dérivé de BodyParts3D (CC BY-SA 2.1 JP)',
        'repere': 'centré sur le cadre colique, ×10 (1 unité = 10 cm), +Y haut, +Z avant du patient, +X gauche du patient',
        'limites': 'segments du pack ; caecum séparé du côlon ascendant à la hauteur de l\'abouchement de l\'iléon ; le rectum n\'est pas modélisé dans le pack',
        'taille_mm': [round((hi - lo).x * 1000), round((hi - lo).z * 1000), round((hi - lo).y * 1000)],
        'structures': [{'id': n.name, 'nom': nom, 'cat': cat, 'centre': centre_de(n)} for n, nom, cat in objets],
    }
    os.makedirs(PUBLIC, exist_ok=True)
    final = os.path.join(PUBLIC, 'colon.glb')
    npx = shutil.which('npx') or arreter('npx introuvable')
    res = subprocess.run([npx, '--yes', GLTF_TRANSFORM, 'meshopt', brut, final], capture_output=True, text=True)
    if res.returncode != 0: arreter('gltf-transform : ' + (res.stderr or res.stdout))
    with open(final, 'rb') as f: donnees['empreinte'] = hashlib.sha256(f.read()).hexdigest()[:12]
    donnees['octets'] = os.path.getsize(final)
    json.dump(donnees, open(os.path.join(PUBLIC, 'colon.json'), 'w'), ensure_ascii=False, indent=1)
    shutil.copy(os.path.join(RACINE, 'assets-sources', 'z-anatomy', 'License.txt'), os.path.join(PUBLIC, 'LICENSE-Z-Anatomy.txt'))
    print('EXPORT OK', donnees['octets'], 'octets', donnees['taille_mm'], [(n.name, len(n.data.polygons)) for n, *_ in objets])

main()
