"""
=========================================================
RadiologicHub — aperçus PNG des modèles 3D exportés
---------------------------------------------------------
Réimporte chaque .glb NON compressé (assets-sources/build/<groupe>/, produit
par scripts/export_muscles.py ; Blender ne lit pas la compression meshopt) et
en fait un rendu Cycles (processeur, sans écran). Vérifie du même coup que
l'export se relit. Vues d'ensemble en plus : ischio-jambiers — postérieure,
latérale, postérieure sans les muscles de contexte ; coude — antérieure,
postérieure, latérale, médiale, et antérieure sans les muscles.

Usage :
    blender -b --factory-startup -P scripts/rendu_apercus.py -- <groupe>
Sortie : assets-sources/apercus/<groupe>/*.png (ignoré par git)
=========================================================
"""
import bpy, json, math, os, sys
from mathutils import Vector

GROUPE = sys.argv[sys.argv.index('--') + 1] if '--' in sys.argv else 'ischio-jambiers'
RACINE = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
BRUT = os.path.join(RACINE, 'assets-sources', 'build', GROUPE)
SORTIE = os.path.join(RACINE, 'assets-sources', 'apercus', GROUPE)
MANIFESTE = os.path.join(RACINE, 'public', 'models', GROUPE, 'manifest.json')
HAUTEUR = 900          # pixels
ECHANTILLONS = 32

# Vues : direction du regard (repère Blender après import : +Z haut, -Y avant du patient, -X latéral)
VUES = {
    'posterieure': dict(rotation=(math.pi / 2, 0, math.pi), horizontal=0),       # regarde vers -Y (de derrière)
    'laterale':    dict(rotation=(math.pi / 2, 0, -math.pi / 2), horizontal=1),  # regarde vers +X (du côté latéral)
    'anterieure':  dict(rotation=(math.pi / 2, 0, 0), horizontal=0),            # regarde vers +Y (de face)
    'mediale':     dict(rotation=(math.pi / 2, 0, math.pi / 2), horizontal=1),   # regarde vers -X (du côté médial)
}
# Vue de chaque structure, vues d'ensemble : (nom, vue, catégories exclues)
VUE_STRUCTURE = 'anterieure' if GROUPE == 'coude' else 'posterieure'
ENSEMBLES = {
    'coude': [
        ('ensemble-anterieur', 'anterieure', ()),
        ('ensemble-posterieur', 'posterieure', ()),
        ('ensemble-lateral', 'laterale', ()),
        ('ensemble-medial', 'mediale', ()),
        ('ensemble-anterieur-sans-muscles', 'anterieure', ('muscle', 'contexte', 'capsule')),
    ],
}.get(GROUPE, [
    ('ensemble-posterieur', 'posterieure', ()),
    ('ensemble-lateral', 'laterale', ()),
    ('ensemble-posterieur-sans-contexte', 'posterieure', ('contexte',)),
])


def scene_vide():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.device = 'CPU'
    sc.cycles.samples = ECHANTILLONS
    sc.cycles.use_denoising = False
    for vl in sc.view_layers:
        vl.cycles.use_denoising = False
    sc.render.film_transparent = False
    sc.view_settings.view_transform = 'Standard'
    monde = bpy.data.worlds.new('fond')
    monde.use_nodes = True
    fond = monde.node_tree.nodes['Background']
    fond.inputs['Color'].default_value = (1, 1, 1, 1)
    fond.inputs['Strength'].default_value = 0.85
    sc.world = monde
    return sc


def importer(fichier, opaque):
    avant = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=fichier)
    objets = [o for o in bpy.data.objects if o not in avant and o.type == 'MESH']
    if opaque:
        for o in objets:
            for m in o.data.materials:
                bsdf = m.node_tree.nodes.get('Principled BSDF') if m and m.node_tree else None
                if bsdf:
                    for lien in list(bsdf.inputs['Alpha'].links):
                        m.node_tree.links.remove(lien)
                    bsdf.inputs['Alpha'].default_value = 1.0
    return objets


def cadrer_et_rendre(sc, objets, vue, chemin, hauteur=HAUTEUR):
    v = VUES[vue]
    pts = [o.matrix_world @ Vector(c) for o in objets for c in o.bound_box]
    mn = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    mx = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    centre, taille = (mn + mx) / 2, mx - mn
    largeur, haut = taille[v['horizontal']], taille.z
    marge = 1.12
    cam_data = bpy.data.cameras.new('cam')
    cam_data.type = 'ORTHO'
    cam = bpy.data.objects.new('cam', cam_data)
    sc.collection.objects.link(cam)
    cam.rotation_euler = v['rotation']
    direction = cam.rotation_euler.to_matrix() @ Vector((0, 0, -1))
    cam.location = centre - direction * 3
    cam_data.clip_end = 10
    ratio = max(largeur, 0.02) / max(haut, 0.02)
    sc.render.resolution_y = hauteur
    sc.render.resolution_x = max(240, int(round(hauteur * ratio * 1.0)))
    cam_data.ortho_scale = max(largeur, haut) * marge
    sc.camera = cam
    soleil_data = bpy.data.lights.new('soleil', 'SUN')
    soleil_data.energy = 3.0
    soleil = bpy.data.objects.new('soleil', soleil_data)
    sc.collection.objects.link(soleil)
    soleil.rotation_euler = (v['rotation'][0] - 0.5, 0.25, v['rotation'][2] + 0.35)
    sc.render.filepath = chemin
    bpy.ops.render.render(write_still=True)
    for o in (cam, soleil):
        bpy.data.objects.remove(o)


def main():
    os.makedirs(SORTIE, exist_ok=True)
    with open(MANIFESTE, encoding='utf-8') as f:
        modeles = json.load(f)['modeles']
    for m in modeles:
        sc = scene_vide()
        objets = importer(os.path.join(BRUT, m['fichier']), opaque=True)
        if not objets:
            raise SystemExit(f"Aucun maillage relu dans {m['fichier']}")
        tris = sum(len(p.vertices) - 2 for o in objets for p in o.data.polygons)
        cadrer_et_rendre(sc, objets, VUE_STRUCTURE, os.path.join(SORTIE, m['id'] + '.png'))
        print(f"APERCU {m['id']:24} relu : {tris} triangles (manifeste : {m['triangles']})")
    for nom, vue, exclues in ENSEMBLES:
        sc = scene_vide()
        objets = []
        for m in modeles:
            if m['categorie'] not in exclues:
                objets += importer(os.path.join(BRUT, m['fichier']), opaque=False)
        cadrer_et_rendre(sc, objets, vue, os.path.join(SORTIE, nom + '.png'), hauteur=1400)
        print(f'APERCU {nom}')


main()
