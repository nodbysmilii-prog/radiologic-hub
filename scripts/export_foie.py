"""
=========================================================
RadiologicHub — modèle 3D « Masses hépatiques » : le foie et ses 8 segments de Couinaud
---------------------------------------------------------
Source : pack Z-Anatomy (CC BY-SA 4.0), dérivé de BodyParts3D (CC BY-SA 2.1 Japon),
téléchargé à version figée par scripts/telecharger_z_anatomy.sh.

Usage (Blender sans interface, scripts du fichier .blend désactivés) :
    blender -b --disable-autoexec --python-exit-code 1 assets-sources/z-anatomy/Z-Anatomy/Startup.blend \\
            -P scripts/export_foie.py
ou, avec le module Python bpy (pip install bpy), sans sitecustomize :
    python3 -I -S scripts/export_foie.py        (voir le paragraphe « Module bpy » ci-dessous)
Contrôle visuel : dans la visionneuse de la fiche (fiches/masses-hepatiques.html), sous Chromium.

Étapes :
  1. les 8 segments hépatiques sont déjà des maillages séparés dans le pack (I à VIII, noms de la
     Terminologia Anatomica : « Segment postérieur (I) », « Segment postérolatéral gauche (II) »,
     etc.) : ils sont repris TELS QUELS, sans découpe ni retouche (le segment IV n'est pas subdivisé
     en IVa / IVb dans le pack) ;
  2. liste FERMÉE de structures de repère : vésicule biliaire (maillage), veine porte (tronc),
     veines hépatiques, veine cave inférieure (courbes du pack, rendues telles quelles) ;
  3. points de repère (étiquettes « .j » du pack) : fissure du ligament rond (insertion du
     ligament falciforme), fissure du ligament veineux, fosse de la vésicule biliaire, aire nue :
     le sommet de chaque étiquette le plus proche de la surface du foie est exporté ;
  4. repère : centré sur le centre du foie, ×10 (1 unité = 10 cm), Y en haut, Z vers l'avant du
     patient, +X à gauche du patient ;
  5. un seul .glb (un objet par structure), compressé meshopt (gltf-transform) ;
  6. foie.json : structures (nom français, catégorie, segment, centre), repères, empreinte du .glb.

Module bpy : « import bpy » plante (glog initialisé deux fois) quand un sitecustomize du système
est chargé ; lancer Python avec -I -S et ajouter site-packages au chemin (voir en bas du fichier).

Sorties :
  assets-sources/build/foie/foie.glb (non compressé)
  public/models/foie/foie.glb, foie.json, LICENSE-Z-Anatomy.txt
=========================================================
"""
import bpy, bmesh, hashlib, json, os, shutil, subprocess, sys
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree

RACINE = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
BLEND = os.path.join(RACINE, 'assets-sources', 'z-anatomy', 'Z-Anatomy', 'Startup.blend')
BRUT = os.path.join(RACINE, 'assets-sources', 'build', 'foie')
PUBLIC = os.path.join(RACINE, 'public', 'models', 'foie')
GLTF_TRANSFORM = '@gltf-transform/cli@4.5.1'
Z_ANATOMY_COMMIT = '2b6cf98a8ca012571ecb252e5c077b42a21b3b61'
ECHELLE = 10

def arreter(msg):
    print('ERREUR export_foie :', msg); sys.exit(1)

# segment · objet du pack · nom (Terminologia Anatomica, en français)
SEGMENTS = [
    ('I', 'Posterior segment of liver (I)', 'Segment postérieur (I), lobe caudé'),
    ('II', 'Left posterior lateral segment of liver (II)', 'Segment postérolatéral gauche (II)'),
    ('III', 'Left anterior lateral segment of liver (III)', 'Segment antérolatéral gauche (III)'),
    ('IV', 'Left medial segment of liver (IV)', 'Segment médial gauche (IV)'),
    ('V', 'Anterior medial segment of liver (V)', 'Segment antéromédial droit (V)'),
    ('VI', 'Anterior lateral segment of liver (VI)', 'Segment antérolatéral droit (VI)'),
    ('VII', 'Posterior lateral segment of liver (VII)', 'Segment postérolatéral droit (VII)'),
    ('VIII', 'Posterior medial segment of liver (VIII)', 'Segment postéromédial droit (VIII)'),
]
# id · objet du pack · nom français · catégorie · triangles visés (None = tel quel)
STRUCTURES = [
    ('vesicule', 'Gallbladder', 'Vésicule biliaire', 'bile', None),
]
# Courbes : id · objet · nom · catégorie
COURBES = [
    ('veine-porte', 'Hepatic portal vein', 'Veine porte (tronc)', 'porte'),
    ('veines-hepatiques', 'Hepatic veins', 'Veines hépatiques', 'veine'),
    ('vci', 'Inferior vena cava (abdominal part)', 'Veine cave inférieure', 'veine'),
]
# Repères : id · étiquette du pack · nom français
REPERES = [
    ('ligament-rond', 'Fissure for ligamentum teres.j', 'Fissure du ligament rond (ligament falciforme)'),
    ('ligament-veineux', 'Fissure for ligamentum venosum.j', 'Fissure du ligament veineux'),
    ('fosse-vesicule', 'Fossa for gallbladder.j', 'Fosse de la vésicule biliaire (lit vésiculaire)'),
    ('aire-nue', 'Bare area of liver.j', 'Aire nue du foie'),
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

def main():
    if bpy.data.objects.get('Liver') is None:
        if not os.path.exists(BLEND): arreter('pack Z-Anatomy absent : lancer scripts/telecharger_z_anatomy.sh')
        bpy.ops.wm.open_mainfile(filepath=BLEND)
    os.makedirs(BRUT, exist_ok=True)
    objets = []
    for id_, src, nom in SEGMENTS:
        bm = bm_monde(objet(src))
        n = nouvel_objet('segment-' + id_, bm)
        if not n.data.polygons: arreter(f'segment vide : {id_}')
        objets.append((n, nom, 'segment', id_))
    for id_, src, nom, cat, tri in STRUCTURES:
        n = nouvel_objet(id_, bm_monde(objet(src))); simplifier(n, tri); objets.append((n, nom, cat, ''))
    for id_, src, nom, cat in COURBES:
        o = objet(src)
        o.data.use_fill_caps = True
        me = bpy.data.meshes.new_from_object(o.evaluated_get(bpy.context.evaluated_depsgraph_get()))
        me.transform(o.matrix_world)
        n = bpy.data.objects.new(id_, me); bpy.context.scene.collection.objects.link(n)
        simplifier(n, 2500)
        objets.append((n, nom, cat, ''))

    # ---------- repère commun : centre du foie (boîte englobante des 8 segments), ×10 ----------
    pts = [n.matrix_world @ v.co for n, _, _, s in objets if s for v in n.data.vertices]
    mini = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    maxi = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    centre = (mini + maxi) / 2
    # points de repère : sommet de l'étiquette le plus proche de la surface du foie
    foie = bm_monde(objet('Liver')); foie.faces.ensure_lookup_table()
    arbre = BVHTree.FromBMesh(foie)
    reperes = []
    for id_, src, nom in REPERES:
        o = objet(src); sommets = [o.matrix_world @ v.co for v in o.data.vertices]
        def dist(p):
            r = arbre.find_nearest(p); return r[3] if r[0] is not None else 1e9
        p = min(sommets, key=dist)
        reperes.append({'id': id_, 'nom': nom, 'monde': p.copy(), 'ecart_mm': round(dist(p) * 1000, 1)})
    foie.free()

    T = Matrix.Translation(-centre); S = Matrix.Diagonal((ECHELLE, ECHELLE, ECHELLE, 1))
    bpy.ops.object.select_all(action='DESELECT')
    for n, *_ in objets:
        n.data.transform(S @ T @ n.matrix_world); n.matrix_world = Matrix.Identity(4)
        n.data.materials.clear(); n.data.materials.append(bpy.data.materials.new('rh-' + n.name))
        for p in n.data.polygons: p.use_smooth = True
        n.select_set(True)
    brut = os.path.join(BRUT, 'foie.glb')
    bpy.ops.export_scene.gltf(filepath=brut, export_format='GLB', use_selection=True, export_yup=True,
                              export_apply=True, export_materials='PLACEHOLDER', export_normals=True)
    # repère glTF (Y haut, Z avant) depuis le repère Blender (Z haut, −Y avant) : (x, y, z) → (x, z, −y)
    def gltf(v): return [round(v.x, 3), round(v.z, 3), round(-v.y, 3)]
    def centre_de(n):
        vs = [v.co for v in n.data.vertices]; c = sum(vs, Vector()) / len(vs)
        return gltf(c)
    for r in reperes:
        r['position'] = gltf((S @ T) @ r.pop('monde'))
    donnees = {
        'source': f'Z-Anatomy (CC BY-SA 4.0), commit {Z_ANATOMY_COMMIT}, dérivé de BodyParts3D (CC BY-SA 2.1 JP)',
        'repere': 'centré sur le foie, ×10 (1 unité = 10 cm), +Y haut, +Z avant du patient, +X gauche du patient',
        'limites': 'segments de Couinaud du pack Z-Anatomy repris tels quels ; le segment IV n\'est pas subdivisé en IVa / IVb ; vaisseaux : courbes du pack (tronc de la veine porte, convergence des veines hépatiques), sans branches segmentaires',
        'structures': [{'id': n.name, 'nom': nom, 'cat': cat, **({'segment': seg} if seg else {}), 'centre': centre_de(n)} for n, nom, cat, seg in objets],
        'reperes': reperes,
    }
    os.makedirs(PUBLIC, exist_ok=True)
    final = os.path.join(PUBLIC, 'foie.glb')
    npx = shutil.which('npx') or arreter('npx introuvable')
    res = subprocess.run([npx, '--yes', GLTF_TRANSFORM, 'meshopt', brut, final], capture_output=True, text=True)
    if res.returncode != 0: arreter('gltf-transform : ' + (res.stderr or res.stdout))
    with open(final, 'rb') as f: donnees['empreinte'] = hashlib.sha256(f.read()).hexdigest()[:12]
    donnees['octets'] = os.path.getsize(final)
    json.dump(donnees, open(os.path.join(PUBLIC, 'foie.json'), 'w'), ensure_ascii=False, indent=1)
    shutil.copy(os.path.join(RACINE, 'assets-sources', 'z-anatomy', 'License.txt'), os.path.join(PUBLIC, 'LICENSE-Z-Anatomy.txt'))
    print('EXPORT OK', donnees['octets'], 'octets', [(n.name, len(n.data.polygons)) for n, *_ in objets])
    print('REPERES', [(r['id'], r['position'], r['ecart_mm']) for r in reperes])

main()
