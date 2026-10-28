"""
=========================================================
RadiologicHub — modèle 3D « Pancréatite aiguë » : le pancréas segmenté et ses rapports
---------------------------------------------------------
Source : pack Z-Anatomy (CC BY-SA 4.0), dérivé de BodyParts3D (CC BY-SA 2.1 Japon),
téléchargé à version figée par scripts/telecharger_z_anatomy.sh.

Usage (Blender sans interface, scripts du fichier .blend désactivés) :
    blender -b --disable-autoexec --python-exit-code 1 assets-sources/z-anatomy/Z-Anatomy/Startup.blend \\
            -P scripts/export_pancreas.py
Contrôle visuel : dans la visionneuse de la fiche (fiches/pancreatite-aigue.html), sous Chromium.

Étapes :
  1. le pancréas (un seul maillage dans le pack) est découpé par des PLANS en 5 segments, aux
     repères classiques mesurés sur le modèle :
       • tête      : à droite du bord droit de la veine mésentérique supérieure (VMS) ;
       • crochet   : partie inférieure de la tête qui passe en arrière / sous la VMS
                     (sous le plan horizontal du bord inférieur de l'isthme, en dedans de la tête) ;
       • isthme    : en avant de la VMS (entre ses bords droit et gauche) ;
       • corps et queue : séparés au MILIEU de la distance entre le bord gauche de la VMS et
                     l'extrémité de la queue (convention de la Japan Pancreas Society ; dans le
                     modèle, l'aorte est presque derrière la VMS : son bord gauche donnerait un
                     corps de 12 mm) ;
     chaque morceau est refermé (trous bouchés) ; limites = schéma, pas une segmentation ;
  2. liste FERMÉE d'objets voisins : duodénum, rate, reins, estomac, côlon transverse,
     vésicule, rachis (T12 à L2) ; courbes : aorte, tronc cœliaque, AMS, VCI, VMS, veine porte,
     veine et artère spléniques, VMI, artère gastroduodénale, canal de Wirsung, canal de
     Santorini, voie biliaire principale (diamètre codé par le pack, rendu tel quel) ;
  3. repère : centré sur l'isthme, ×10, Y en haut, Z vers l'avant du patient, +X à gauche du patient ;
  4. un seul .glb (un objet par structure), compressé meshopt (gltf-transform) ;
  5. pancreas.json : structures (nom français, catégorie, segment), empreinte du .glb.

Sorties :
  assets-sources/build/pancreas/pancreas.glb (non compressé)
  public/models/pancreas/pancreas.glb, pancreas.json, LICENSE-Z-Anatomy.txt
=========================================================
"""
import bpy, bmesh, hashlib, json, os, shutil, subprocess, sys
from mathutils import Vector, Matrix

RACINE = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
BRUT = os.path.join(RACINE, 'assets-sources', 'build', 'pancreas')
PUBLIC = os.path.join(RACINE, 'public', 'models', 'pancreas')
GLTF_TRANSFORM = '@gltf-transform/cli@4.5.1'
Z_ANATOMY_COMMIT = '2b6cf98a8ca012571ecb252e5c077b42a21b3b61'
ECHELLE = 10

def arreter(msg):
    print('ERREUR export_pancreas :', msg); sys.exit(1)

# id · objet(s) du pack · nom français · catégorie · triangles visés (None = tel quel)
STRUCTURES = [
    ('duodenum', ['Duodenum'], 'Duodénum', 'tube', 1800),
    ('rate', ['Spleen'], 'Rate', 'rate', 1400),
    ('rein-gauche', ['Kidney.l'], 'Rein gauche', 'rein', 1600),
    ('rein-droit', ['Kidney.r'], 'Rein droit', 'rein', 1600),
    ('estomac', ['Stomach'], 'Estomac', 'estomac', 2500),
    ('colon-transverse', ['Transverse colon'], 'Côlon transverse', 'colon', 2500),
    ('vesicule', ['Gallbladder'], 'Vésicule biliaire', 'bile', None),
    ('rachis', ['Vertebra T12', 'Vertebra L1', 'Vertebra L2'], 'Rachis (T12 à L2)', 'os', 4500),
]
# Courbes : id · objet · nom · catégorie
COURBES = [
    ('aorte', 'Abdominal aorta', 'Aorte abdominale', 'artere'),
    ('tronc-coeliaque', 'Coeliac trunk', 'Tronc cœliaque', 'artere'),
    ('ams', 'Superior mesenteric artery', 'Artère mésentérique supérieure (AMS)', 'artere'),
    ('artere-splenique', 'Splenic artery', 'Artère splénique', 'artere'),
    ('gastroduodenale', 'Gastroduodenal artery', 'Artère gastroduodénale', 'artere'),
    ('vci', 'Inferior vena cava (abdominal part)', 'Veine cave inférieure', 'veine'),
    ('vms', 'Superior mesenteric vein', 'Veine mésentérique supérieure (VMS)', 'porte'),
    ('veine-porte', 'Hepatic portal vein', 'Veine porte', 'porte'),
    ('veine-splenique', 'Splenic vein', 'Veine splénique', 'porte'),
    ('vmi', 'Inferior mesenteric vein', 'Veine mésentérique inférieure', 'porte'),
    ('wirsung', 'Pancreatic duct', 'Canal pancréatique principal (Wirsung)', 'canal'),
    ('santorini', 'Accessory pancreatic duct', 'Canal pancréatique accessoire (Santorini)', 'canal'),
    ('vbp', 'Bile duct', 'Voie biliaire principale (cholédoque)', 'bile'),
]
SEGMENTS = [
    ('tete', 'Tête du pancréas'),
    ('crochet', 'Crochet (processus unciné)'),
    ('isthme', 'Isthme (col)'),
    ('corps', 'Corps du pancréas'),
    ('queue', 'Queue du pancréas'),
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

def points_courbe(o):
    pts = []
    for sp in o.data.splines:
        pts += [o.matrix_world @ p.co.xyz for p in sp.bezier_points] if sp.type == 'BEZIER' else [o.matrix_world @ Vector(p.co[:3]) for p in sp.points]
    return pts

def nouvel_objet(id_, bm):
    me = bpy.data.meshes.new(id_); bm.to_mesh(me); bm.free()
    n = bpy.data.objects.new(id_, me); bpy.context.scene.collection.objects.link(n)
    return n

def simplifier(n, tri):
    if tri and len(n.data.polygons) > tri:
        bpy.context.view_layer.objects.active = n
        m = n.modifiers.new('dec', 'DECIMATE'); m.ratio = tri / len(n.data.polygons); bpy.ops.object.modifier_apply(modifier='dec')

def morceau(source, plans):
    """Copie de `source` (bmesh) gardant le côté NÉGATIF de chaque plan (co, normale), trous refermés."""
    bm = source.copy()
    for co, no in plans:
        geom = bm.verts[:] + bm.edges[:] + bm.faces[:]
        res = bmesh.ops.bisect_plane(bm, geom=geom, plane_co=co, plane_no=no, clear_outer=True)
        bord = [e for e in res['geom_cut'] if isinstance(e, bmesh.types.BMEdge)]
        if bord: bmesh.ops.holes_fill(bm, edges=bord, sides=0)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm

def point_courbe_a_z(o, z):
    """Point de la courbe le plus proche de l'altitude z (mm), dans la moitié haute (près du pancréas)."""
    P = [p * 1000 for p in points_courbe(o)]
    return min(P, key=lambda p: abs(p.z - z))

def main():
    os.makedirs(BRUT, exist_ok=True)
    # ---------- repères mesurés (mm, repère du pack : +X gauche du patient, −Y avant, +Z haut) ----------
    pan = bm_monde(objet('Pancreas'))
    V = [v.co * 1000 for v in pan.verts]
    z_milieu = (min(v.z for v in V) + max(v.z for v in V)) / 2
    vms = point_courbe_a_z(objet('Superior mesenteric vein'), z_milieu)      # VMS derrière l'isthme
    R_VMS = 6                                                                # rayon de la VMS (mm)
    aorte = point_courbe_a_z(objet('Abdominal aorta'), z_milieu)
    R_AORTE = 10
    x_vms_d, x_vms_g = vms.x - R_VMS, vms.x + R_VMS                          # bords droit et gauche de la VMS
    x_aorte_g = aorte.x + R_AORTE                                            # bord gauche de l'aorte (information)
    x_queue_fin = max(v.x for v in V)
    x_corps_queue = (x_vms_g + x_queue_fin) / 2                              # limite corps / queue (JPS)
    # bord inférieur de l'isthme : plus bas sommet de la tranche en avant de la VMS
    z_crochet = 1101.0
    x_crochet = x_vms_d - 7                                                  # le crochet commence en dedans de la tête
    reperes = dict(vms=[round(c) for c in vms], aorte=[round(c) for c in aorte], x_vms_d=round(x_vms_d), x_vms_g=round(x_vms_g),
                   x_aorte_g=round(x_aorte_g), x_corps_queue=round(x_corps_queue), z_crochet=z_crochet, x_crochet=round(x_crochet))
    print('REPERES', reperes)
    m = lambda x: x / 1000
    X = Vector((1, 0, 0)); Z = Vector((0, 0, 1))
    plan = lambda x=None, z=None, garder='-': ((Vector((m(x), 0, 0)) if x is not None else Vector((0, 0, m(z)))), (X if x is not None else Z) * (1 if garder == '-' else -1))
    # garder='-' : on garde x < valeur (ou z < valeur) ; garder='+' : x > valeur
    decoupes = {
        'tete': [[plan(x=x_crochet)], [plan(x=x_vms_d), plan(x=x_crochet, garder='+'), plan(z=z_crochet, garder='+')]],
        'crochet': [[plan(x=x_vms_g), plan(x=x_crochet, garder='+'), plan(z=z_crochet)]],
        'isthme': [[plan(x=x_vms_g), plan(x=x_vms_d, garder='+'), plan(z=z_crochet, garder='+')]],
        'corps': [[plan(x=x_corps_queue), plan(x=x_vms_g, garder='+')]],
        'queue': [[plan(x=x_corps_queue, garder='+')]],
    }
    objets = []
    for id_, nom in SEGMENTS:
        bm = bmesh.new()
        for plans in decoupes[id_]:
            b = morceau(pan, plans); me = bpy.data.meshes.new('tmp'); b.to_mesh(me); b.free(); bm.from_mesh(me); bpy.data.meshes.remove(me)
        n = nouvel_objet('pancreas-' + id_, bm)
        if not n.data.polygons: arreter(f'segment vide : {id_}')
        objets.append((n, nom, 'pancreas', id_))
    pan.free()

    for id_, srcs, nom, cat, tri in STRUCTURES:
        bm = bmesh.new()
        for s in srcs:
            b = bm_monde(objet(s)); me = bpy.data.meshes.new('tmp'); b.to_mesh(me); b.free(); bm.from_mesh(me); bpy.data.meshes.remove(me)
        n = nouvel_objet(id_, bm); simplifier(n, tri); objets.append((n, nom, cat, ''))
    for id_, src, nom, cat in COURBES:
        o = objet(src)
        o.data.use_fill_caps = True
        me = bpy.data.meshes.new_from_object(o.evaluated_get(bpy.context.evaluated_depsgraph_get()))
        me.transform(o.matrix_world)
        n = bpy.data.objects.new(id_, me); bpy.context.scene.collection.objects.link(n)
        simplifier(n, 2500)                                                  # tubes très finement maillés (Wirsung : 30 000 triangles)
        objets.append((n, nom, cat, ''))

    # ---------- repère commun (centre : isthme) et export ----------
    centre = Vector((m(vms.x), m(vms.y + 8), m(z_milieu)))
    T = Matrix.Translation(-centre); S = Matrix.Diagonal((ECHELLE, ECHELLE, ECHELLE, 1))
    bpy.ops.object.select_all(action='DESELECT')
    for n, *_ in objets:
        n.data.transform(S @ T @ n.matrix_world); n.matrix_world = Matrix.Identity(4)
        n.data.materials.clear(); n.data.materials.append(bpy.data.materials.new('rh-' + n.name))
        for p in n.data.polygons: p.use_smooth = True
        n.select_set(True)
    brut = os.path.join(BRUT, 'pancreas.glb')
    bpy.ops.export_scene.gltf(filepath=brut, export_format='GLB', use_selection=True, export_yup=True,
                              export_apply=True, export_materials='PLACEHOLDER', export_normals=True)
    def centre_de(n):
        vs = [v.co for v in n.data.vertices]; c = sum(vs, Vector()) / len(vs)
        return [round(c.x, 3), round(c.z, 3), round(-c.y, 3)]
    donnees = {
        'source': f'Z-Anatomy (CC BY-SA 4.0), commit {Z_ANATOMY_COMMIT}, dérivé de BodyParts3D (CC BY-SA 2.1 JP)',
        'repere': 'centré sur l\'isthme du pancréas, ×10 (1 unité = 10 cm), +Y haut, +Z avant du patient, +X gauche du patient',
        'limites': 'tête : à droite du bord droit de la VMS ; isthme : en avant de la VMS ; corps et queue : séparés au milieu de la distance entre le bord gauche de la VMS et l\'extrémité de la queue (Japan Pancreas Society) ; crochet : partie inférieure de la tête passant sous la VMS (schéma)',
        'reperes_mm': reperes,
        'structures': [{'id': n.name, 'nom': nom, 'cat': cat, **({'segment': seg} if seg else {}), 'centre': centre_de(n)} for n, nom, cat, seg in objets],
    }
    os.makedirs(PUBLIC, exist_ok=True)
    final = os.path.join(PUBLIC, 'pancreas.glb')
    npx = shutil.which('npx') or arreter('npx introuvable')
    res = subprocess.run([npx, '--yes', GLTF_TRANSFORM, 'meshopt', brut, final], capture_output=True, text=True)
    if res.returncode != 0: arreter('gltf-transform : ' + (res.stderr or res.stdout))
    with open(final, 'rb') as f: donnees['empreinte'] = hashlib.sha256(f.read()).hexdigest()[:12]
    donnees['octets'] = os.path.getsize(final)
    json.dump(donnees, open(os.path.join(PUBLIC, 'pancreas.json'), 'w'), ensure_ascii=False, indent=1)
    shutil.copy(os.path.join(RACINE, 'assets-sources', 'z-anatomy', 'License.txt'), os.path.join(PUBLIC, 'LICENSE-Z-Anatomy.txt'))
    print('EXPORT OK', donnees['octets'], 'octets', [(n.name, len(n.data.polygons)) for n, *_ in objets])

main()
