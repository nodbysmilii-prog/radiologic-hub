"""
=========================================================
RadiologicHub — modèle 3D « Masses médiastinales » : le médiastin et ses compartiments
---------------------------------------------------------
Source : pack Z-Anatomy (CC BY-SA 4.0), dérivé de BodyParts3D (CC BY-SA 2.1 Japon),
téléchargé à version figée par scripts/telecharger_z_anatomy.sh.

Usage (Blender sans interface, scripts du fichier .blend désactivés) :
    blender -b --disable-autoexec --python-exit-code 1 assets-sources/z-anatomy/Z-Anatomy/Startup.blend \\
            -P scripts/export_mediastin.py
Contrôle visuel : dans la visionneuse de la fiche (fiches/masses-mediastinales.html), sous Chromium.

Étapes :
  1. liste FERMÉE d'objets du pack : sternum, vertèbres T1 à T12, côtes 1 à 8, cœur (4 cavités),
     tronc pulmonaire, trachée, thymus, thyroïde, diaphragme ; courbes : aorte, veines caves,
     troncs supra-aortiques, troncs veineux brachiocéphaliques, artères pulmonaires, azygos,
     bronches souches, œsophage (tubes au diamètre indiqué) ;
  2. maillages lourds simplifiés (nombre de triangles visé) ;
  3. compartiments de HEITZMAN (7) et de FELSON (3) : volumes « pédagogiques » construits
     comme enveloppes convexes lissées autour de points définis à partir des repères osseux
     et viscéraux du modèle (sternum, rachis, carène, crosse aortique, cœur, diaphragme).
     Ce sont des schémas en volume, pas des segmentations : limites approchées ;
  4. repère : centré sur la carène, ×10, Y en haut, Z vers l'avant du patient, +X à gauche du patient ;
  5. un seul .glb (un objet nommé par structure), compressé meshopt (gltf-transform) ;
  6. mediastin.json : structures, compartiments (nom de la fiche de l'auteur), empreinte du .glb.

Sorties :
  assets-sources/build/mediastin/mediastin.glb (non compressé)
  public/models/mediastin/mediastin.glb, mediastin.json, LICENSE-Z-Anatomy.txt
=========================================================
"""
import bpy, bmesh, hashlib, json, os, shutil, subprocess, sys
from mathutils import Vector, Matrix

RACINE = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
BRUT = os.path.join(RACINE, 'assets-sources', 'build', 'mediastin')
PUBLIC = os.path.join(RACINE, 'public', 'models', 'mediastin')
GLTF_TRANSFORM = '@gltf-transform/cli@4.5.1'
Z_ANATOMY_COMMIT = '2b6cf98a8ca012571ecb252e5c077b42a21b3b61'
ECHELLE = 10

def arreter(msg):
    print('ERREUR export_mediastin :', msg); sys.exit(1)

# id · objet(s) du pack · nom français · catégorie · triangles visés (None = tel quel)
COTES = ['First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh', 'Eighth']
STRUCTURES = [
    ('sternum', ['Manubrium of sternum', 'Body of sternum'], 'Sternum (manubrium et corps)', 'os', 3000),
    ('rachis', [f'Vertebra T{i}' for i in range(1, 13)], 'Rachis thoracique (T1 à T12)', 'os', 9000),
    ('cotes', [f'{c} rib.{s}' for c in COTES for s in 'lr'], 'Côtes (1 à 8)', 'cote', 14000),
    ('oreillette-droite', ['Right atrium'], 'Oreillette droite', 'coeur', 1500),
    ('ventricule-droit', ['Right ventricle'], 'Ventricule droit', 'coeur', 1500),
    ('oreillette-gauche', ['Left atrium'], 'Oreillette gauche', 'coeur', 1500),
    ('ventricule-gauche', ['Left ventricle'], 'Ventricule gauche', 'coeur', 1500),
    ('tronc-pulmonaire', ['Pulmonary trunk'], 'Tronc pulmonaire', 'artere-pulm', None),
    ('trachee', ['Trachea'], 'Trachée', 'air', 2500),
    ('thymus', ['Right lobe of thymus', 'Left lobe of thymus'], 'Thymus', 'thymus', 2500),
    ('thyroide', ['Thyroid gland'], 'Thyroïde', 'thyroide', None),
    ('diaphragme', ['Diaphragm'], 'Diaphragme', 'diaphragme', 2500),
]
# Courbes : id · objet · nom · catégorie · diamètre attendu (mm, contrôle seulement : le pack code déjà le diamètre)
COURBES = [
    ('aorte-ascendante', 'Ascending aorta', 'Aorte ascendante', 'artere', 28),
    ('crosse', 'Aortic arch', "Crosse de l'aorte", 'artere', 26),
    ('aorte-descendante', 'Thoracic aorta', 'Aorte thoracique descendante', 'artere', 22),
    ('tronc-brachiocephalique', 'Brachiocephalic trunk', 'Tronc artériel brachiocéphalique', 'artere', 12),
    ('carotide-gauche', 'Left common carotid artery', 'Carotide commune gauche', 'artere', 8),
    ('sous-claviere-gauche', 'Left subclavian artery', 'Artère subclavière gauche', 'artere', 9),
    ('vcs', 'Superior vena cava', 'Veine cave supérieure', 'veine', 20),
    ('vci', 'Inferior vena cava (thoracic part)', 'Veine cave inférieure', 'veine', 22),
    ('tvi-gauche', 'Left brachiocephalic vein', 'Tronc veineux innominé gauche', 'veine', 12),
    ('tvi-droit', 'Right brachiocephalic vein', 'Tronc veineux brachiocéphalique droit', 'veine', 12),
    ('azygos', 'Azygos vein', 'Veine azygos', 'veine', 8),
    ('hemi-azygos', 'Hemi-azygos vein', 'Veine hémi-azygos', 'veine', 5),
    ('artere-pulm-droite', 'Right pulmonary artery', 'Artère pulmonaire droite', 'artere-pulm', 18),
    ('artere-pulm-gauche', 'Left pulmonary artery', 'Artère pulmonaire gauche', 'artere-pulm', 18),
    ('bronche-droite', 'Right main bronchus', 'Bronche souche droite', 'air', 14),
    ('bronche-gauche', 'Left main bronchus', 'Bronche souche gauche', 'air', 12),
    ('oesophage', 'Oesophagus', 'Œsophage', 'oesophage', 16),
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

def boite(noms):
    P = []
    for n in noms:
        o = objet(n)
        if o.type == 'MESH':
            bm = bm_monde(o); P += [v.co.copy() for v in bm.verts]; bm.free()
        else: P += points_courbe(o)
    lo = Vector([min(p[i] for p in P) for i in range(3)]); hi = Vector([max(p[i] for p in P) for i in range(3)])
    return lo, hi

def nouvel_objet(id_, bm):
    me = bpy.data.meshes.new(id_); bm.to_mesh(me); bm.free()
    n = bpy.data.objects.new(id_, me); bpy.context.scene.collection.objects.link(n)
    return n

def simplifier(n, tri):
    if tri and len(n.data.polygons) > tri:
        bpy.context.view_layer.objects.active = n
        m = n.modifiers.new('dec', 'DECIMATE'); m.ratio = tri / len(n.data.polygons); bpy.ops.object.modifier_apply(modifier='dec')

def volume(id_, points, lisse=2):
    """Enveloppe convexe des points (mm), lissée : volume schématique d'un compartiment."""
    bm = bmesh.new()
    for p in points: bm.verts.new(Vector(p) / 1000)
    bmesh.ops.convex_hull(bm, input=bm.verts)
    n = nouvel_objet(id_, bm)
    if lisse:
        bpy.context.view_layer.objects.active = n
        m = n.modifiers.new('lisse', 'SUBSURF'); m.levels = lisse; bpy.ops.object.modifier_apply(modifier='lisse')
    return n

def pave(x0, x1, y0, y1, z0, z1):
    return [(x, y, z) for x in (x0, x1) for y in (y0, y1) for z in (z0, z1)]

def main():
    os.makedirs(BRUT, exist_ok=True)
    mm = lambda v: v * 1000
    # ---------- repères (mm, repère du pack : +X gauche du patient, −Y avant, +Z haut) ----------
    lo, hi = boite(['Manubrium of sternum']); manu_haut = mm(hi.z); manu_arr = mm(hi.y)
    lo, hi = boite(['Body of sternum']); sternum_bas = mm(lo.z); corps_arr = mm(hi.y)
    lo, hi = boite(['Trachea']); carene = mm(lo.z)
    lo, hi = boite(['Aortic arch']); crosse = mm(hi.z) + 13
    lo, hi = boite(['Right atrium', 'Left atrium', 'Right ventricle', 'Left ventricle'])
    coeur_haut, coeur_bas, coeur_avant, coeur_arr = mm(hi.z), mm(lo.z), mm(lo.y), mm(hi.y)
    coeur_g, coeur_d = mm(hi.x), mm(lo.x)
    lo, hi = boite(['Vertebra T1']); t1_haut = mm(hi.z); t1_avant = mm(lo.y)
    lo, hi = boite(['Vertebra T5']); rachis_avant = mm(lo.y)
    lo, hi = boite(['Vertebra T12']); t12_bas = mm(lo.z)
    lo, hi = boite(['Trachea']); trachee_avant = mm(lo.y)
    reperes = dict(manu_haut=manu_haut, manu_arr=manu_arr, sternum_bas=sternum_bas, corps_arr=corps_arr, carene=carene, crosse=crosse,
                   coeur_haut=coeur_haut, coeur_bas=coeur_bas, coeur_avant=coeur_avant, coeur_arr=coeur_arr, coeur_g=coeur_g, coeur_d=coeur_d,
                   t1_haut=t1_haut, t1_avant=t1_avant, rachis_avant=rachis_avant, t12_bas=t12_bas, trachee_avant=trachee_avant)
    print('REPERES', {k: round(v) for k, v in reperes.items()})

    objets = []
    for id_, srcs, nom, cat, tri in STRUCTURES:
        bm = bmesh.new()
        for s in srcs:
            b = bm_monde(objet(s)); me = bpy.data.meshes.new('tmp'); b.to_mesh(me); b.free(); bm.from_mesh(me); bpy.data.meshes.remove(me)
        n = nouvel_objet(id_, bm); simplifier(n, tri); objets.append((n, nom, cat, 'structure'))
    for id_, src, nom, cat, diam in COURBES:
        o = objet(src)
        # diamètre déjà codé par le pack (rayon de chaque point de la courbe × profil) : rendu tel quel, extrémités fermées
        o.data.use_fill_caps = True
        me = bpy.data.meshes.new_from_object(o.evaluated_get(bpy.context.evaluated_depsgraph_get()))
        me.transform(o.matrix_world)
        dims = [max(v.co[k] for v in me.vertices) - min(v.co[k] for v in me.vertices) for k in range(3)]
        print('COURBE', id_, 'boîte (mm)', [round(d * 1000) for d in dims], 'diamètre attendu', diam)
        n = bpy.data.objects.new(id_, me); bpy.context.scene.collection.objects.link(n)
        objets.append((n, nom, cat, 'structure'))

    # ---------- compartiments de Heitzman (noms de la fiche de l'auteur) ----------
    r = reperes
    haut_ocm = t1_haut + 12
    H = [
        ('h-ocm', 'Orifice cervico-médiastinal', 'OCM', volume('h-ocm',
            pave(-34, 34, r['manu_arr'] - 4, r['t1_avant'] + 2, r['manu_haut'] - 2, haut_ocm))),
        ('h-retrosternal', 'Espace rétro-sternal pré-aortico-cave', '', volume('h-retrosternal',
            [(x, y, z) for x in (-26, 36) for (y, z) in ((r['manu_arr'] - 2, r['manu_haut'] - 4), (r['manu_arr'] + 12, r['manu_haut'] - 4), (r['corps_arr'] - 2, r['coeur_haut'] - 6), (r['corps_arr'] + 26, r['coeur_haut'] - 6))])),
        ('h-acp', 'Angles cardio-phréniques', 'ACPA, ACPP', None),
        ('h-epto', 'Espace paratrachéo-œsophagien', 'EPTO', volume('h-epto',
            pave(-26, 28, r['trachee_avant'] - 6, r['rachis_avant'] - 2, r['carene'] + 4, r['manu_haut'] - 2))),
        ('h-carinaire', 'Espace rétro- et sous-carinaire', '', volume('h-carinaire',
            pave(-20, 30, -6, r['rachis_avant'] - 2, r['carene'] - 48, r['carene'] + 4))),
        ('h-gcv', 'Gouttières costo-vertébrales', 'GCV', None),
        ('h-eimp', 'Espace inframédiastinal postérieur', 'EIMP', volume('h-eimp',
            [(x, y, z) for x in (-22, 28) for (y, z) in ((r['coeur_arr'] - 14, r['carene'] - 50), (r['rachis_avant'] - 2, r['carene'] - 50), (r['coeur_arr'] - 22, r['coeur_bas'] - 30), (r['rachis_avant'] - 8, r['coeur_bas'] - 30))])),
    ]
    # angles cardio-phréniques : quatre coins (antérieurs et postérieurs, droit et gauche), un seul objet
    bm = bmesh.new()
    zb, zh = r['coeur_bas'] - 6, r['coeur_bas'] + 40
    coins = [(r['coeur_d'] - 4, r['coeur_d'] + 34, r['coeur_avant'] + 6, r['coeur_avant'] + 46),
             (r['coeur_g'] - 40, r['coeur_g'] + 2, r['coeur_avant'] + 14, r['coeur_avant'] + 54),
             (r['coeur_d'] + 2, r['coeur_d'] + 34, r['coeur_arr'] - 34, r['coeur_arr'] - 2),
             (r['coeur_g'] - 46, r['coeur_g'] - 12, r['coeur_arr'] - 40, r['coeur_arr'] - 8)]
    for x0, x1, y0, y1 in coins:
        t = volume('tmp-acp', [(x0, y0, zb), (x1, y0, zb), (x0, y1, zb), (x1, y1, zb), (x0 if x0 < 0 else x1, y0, zh), (x0 if x0 < 0 else x1, y1, zh), ((x0 + x1) / 2, (y0 + y1) / 2, zh - 8)])
        me = t.data; bm.from_mesh(me); bpy.data.objects.remove(t); bpy.data.meshes.remove(me)
    H[2] = ('h-acp', 'Angles cardio-phréniques', 'ACPA, ACPP', nouvel_objet('h-acp', bm))
    # gouttières costo-vertébrales : deux bandes paravertébrales
    bm = bmesh.new()
    for s in (-1, 1):
        t = volume('tmp-gcv', [(s * x, y, z) for x in (30, 62) for y in (r['rachis_avant'] - 4, r['rachis_avant'] + 52) for z in (r['t12_bas'] + 10, haut_ocm - 6)], lisse=1)
        me = t.data; bm.from_mesh(me); bpy.data.objects.remove(t); bpy.data.meshes.remove(me)
    H[5] = ('h-gcv', 'Gouttières costo-vertébrales', 'GCV', nouvel_objet('h-gcv', bm))
    for id_, nom, abr, n in H: objets.append((n, nom, abr, 'heitzman'))

    # ---------- compartiments de Felson (antérieur, moyen, postérieur) ----------
    bas = r['coeur_bas'] - 8
    ligne_ant = lambda z: r['trachee_avant'] if z > r['carene'] else r['coeur_arr'] - 4     # trachée en haut, bord postérieur du cœur en bas
    ligne_post = r['rachis_avant'] + 10                                                   # 1 cm en arrière du bord antérieur des vertèbres
    F = [
        ('f-anterieur', 'Antérieur', volume('f-anterieur',
            [(x, y, z) for x in (-30, 30) for (y, z) in ((r['manu_arr'] - 2, haut_ocm - 8), (r['trachee_avant'] - 2, haut_ocm - 8))]
            + [(x, y, z) for x in (r['coeur_d'] - 4, r['coeur_g'] + 4) for (y, z) in ((r['coeur_avant'] - 4, bas), (r['coeur_arr'] - 6, bas), (r['coeur_avant'] - 2, r['coeur_haut']), (r['coeur_arr'] - 6, r['coeur_haut']))], lisse=1)),
        ('f-moyen', 'Moyen', volume('f-moyen',
            [(x, y, z) for x in (-28, 30) for (y, z) in ((r['trachee_avant'], haut_ocm - 8), (ligne_post - 2, haut_ocm - 8), (r['trachee_avant'], r['carene']), (ligne_post - 2, r['carene']),
                                                        (r['coeur_arr'] - 2, bas), (ligne_post - 2, bas))], lisse=1)),
        ('f-posterieur', 'Postérieur', volume('f-posterieur',
            [(x, y, z) for x in (-64, 64) for (y, z) in ((ligne_post, haut_ocm - 8), (ligne_post + 58, haut_ocm - 8), (ligne_post, r['t12_bas'] + 10), (ligne_post + 58, r['t12_bas'] + 10))], lisse=1)),
    ]
    for id_, nom, n in F: objets.append((n, nom, '', 'felson'))

    # ---------- repère commun et export ----------
    centre = Vector((0, 0.008, carene / 1000))
    T = Matrix.Translation(-centre); S = Matrix.Diagonal((ECHELLE, ECHELLE, ECHELLE, 1))
    bpy.ops.object.select_all(action='DESELECT')
    for n, *_ in objets:
        n.data.transform(S @ T @ n.matrix_world); n.matrix_world = Matrix.Identity(4)
        n.data.materials.clear(); n.data.materials.append(bpy.data.materials.new('rh-' + n.name))
        for p in n.data.polygons: p.use_smooth = True
        n.select_set(True)
    brut = os.path.join(BRUT, 'mediastin.glb')
    bpy.ops.export_scene.gltf(filepath=brut, export_format='GLB', use_selection=True, export_yup=True,
                              export_apply=True, export_materials='PLACEHOLDER', export_normals=True)
    def centre_de(n):
        vs = [v.co for v in n.data.vertices]; c = sum(vs, Vector()) / len(vs)
        return [round(c.x, 3), round(c.z, 3), round(-c.y, 3)]
    vers = lambda z: round((z / 1000 - centre.z) * ECHELLE, 3)
    donnees = {
        'source': f'Z-Anatomy (CC BY-SA 4.0), commit {Z_ANATOMY_COMMIT}, dérivé de BodyParts3D (CC BY-SA 2.1 JP)',
        'repere': 'centré sur la carène, ×10 (1 unité = 10 cm), +Y haut, +Z avant du patient, +X gauche du patient',
        'niveaux': {'carene': vers(carene), 'crosse': vers(crosse), 'manubrium': vers(manu_haut), 'coeur_bas': vers(coeur_bas), 'coeur_haut': vers(coeur_haut)},
        'structures': [{'id': n.name, 'nom': nom, 'cat': cat, 'centre': centre_de(n)} for n, nom, cat, g in objets if g == 'structure'],
        'compartiments': [{'id': n.name, 'nom': nom, 'abr': abr, 'systeme': g, 'centre': centre_de(n)} for n, nom, abr, g in objets if g != 'structure'],
    }
    os.makedirs(PUBLIC, exist_ok=True)
    final = os.path.join(PUBLIC, 'mediastin.glb')
    npx = shutil.which('npx') or arreter('npx introuvable')
    res = subprocess.run([npx, '--yes', GLTF_TRANSFORM, 'meshopt', brut, final], capture_output=True, text=True)
    if res.returncode != 0: arreter('gltf-transform : ' + (res.stderr or res.stdout))
    with open(final, 'rb') as f: donnees['empreinte'] = hashlib.sha256(f.read()).hexdigest()[:12]
    donnees['octets'] = os.path.getsize(final)
    json.dump(donnees, open(os.path.join(PUBLIC, 'mediastin.json'), 'w'), ensure_ascii=False, indent=1)
    shutil.copy(os.path.join(RACINE, 'assets-sources', 'z-anatomy', 'License.txt'), os.path.join(PUBLIC, 'LICENSE-Z-Anatomy.txt'))
    print('EXPORT OK', donnees['octets'], 'octets', [(n.name, len(n.data.polygons)) for n, *_ in objets])

main()
