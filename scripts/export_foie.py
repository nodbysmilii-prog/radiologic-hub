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
  2 bis. BRANCHES SCHÉMATIQUES (ne viennent PAS du pack, tracé construit par ce script) : le pack n'a que le
     tronc de la veine porte et la convergence des veines hépatiques. Les trois veines hépatiques sont
     tracées DANS les limites réelles entre segments (droite : entre {V, VIII} et {VI, VII} ; moyenne :
     entre IV et {V, VIII} ; gauche : entre II et III), de la convergence vers la périphérie ; la veine
     porte se divise en branche droite (secteurs antérieur puis postérieur) et gauche (portion
     ombilicale à la jonction III / IV), chaque segment étant relié à son centre. Marqué
     « schematique » dans foie.json ;
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

def points_courbe(o):
    pts = []
    for sp in o.data.splines:
        pts += [o.matrix_world @ p.co.xyz for p in sp.bezier_points] if sp.type == 'BEZIER' else [o.matrix_world @ Vector(p.co[:3]) for p in sp.points]
    return pts

def simplifier(n, tri):
    if tri and len(n.data.polygons) > tri:
        bpy.context.view_layer.objects.active = n
        m = n.modifiers.new('dec', 'DECIMATE'); m.ratio = tri / len(n.data.polygons); bpy.ops.object.modifier_apply(modifier='dec')

# ---------- branches schématiques (voir le docstring, étape 2 bis) ----------
PAS_GRILLE = 0.006   # m

def appartenance(arbres, p):
    """Segment dont le maillage contient le point p (parité d'un rayon), ou None."""
    d = Vector((0.37, 0.52, 0.77)).normalized()
    for k, t in arbres.items():
        n, o = 0, p.copy()
        for _ in range(40):
            loc, nor, idx, dist = t.ray_cast(o, d)
            if loc is None: break
            n += 1; o = loc + d * 1e-6
        if n % 2 == 1: return k
    return None

def etiqueter(arbres, mini, maxi):
    """Grille de points dans le foie : {(i, j, k): segment}."""
    etiq, pts = {}, {}
    nx, ny, nz = [int((maxi[a] - mini[a]) / PAS_GRILLE) + 1 for a in range(3)]
    for i in range(nx):
        for j in range(ny):
            for k in range(nz):
                p = Vector((mini.x + i * PAS_GRILLE, mini.y + j * PAS_GRILLE, mini.z + k * PAS_GRILLE))
                seg = appartenance(arbres, p)
                if seg: etiq[(i, j, k)] = seg; pts.setdefault(seg, []).append(p)
    return etiq, pts

def interfaces(etiq, mini, groupes):
    """Points d'interface entre deux groupes de segments : [(groupe A, groupe B)] → liste de points."""
    sortie = {i: [] for i in range(len(groupes))}
    for (i, j, k), a in etiq.items():
        for d in ((1, 0, 0), (0, 1, 0), (0, 0, 1)):
            b = etiq.get((i + d[0], j + d[1], k + d[2]))
            if b is None or b == a: continue
            milieu = Vector((mini.x + (i + d[0] / 2) * PAS_GRILLE, mini.y + (j + d[1] / 2) * PAS_GRILLE, mini.z + (k + d[2] / 2) * PAS_GRILLE))
            for n, (ga, gb) in enumerate(groupes):
                if (a in ga and b in gb) or (a in gb and b in ga): sortie[n].append(milieu)
    return sortie

def centroide(pts): return sum(pts, Vector()) / len(pts)

def ligne_centrale(pts, depart, pas=0.008):
    """Ligne de l'interface, de `depart` vers la périphérie : centre des points par tranche de distance, recalé sur l'interface."""
    tranches = {}
    for p in pts: tranches.setdefault(int((p - depart).length / pas), []).append(p)
    chemin = [depart]
    for t in sorted(tranches):
        if len(tranches[t]) < 3: continue
        c = centroide(tranches[t]); c = min(tranches[t], key=lambda q: (q - c).length)
        if len(chemin) > 1 and (c - chemin[-1]).length > pas * 4: break   # trou dans l'interface : on s'arrête
        chemin.append(c)
    lisse = [chemin[0]] + [(chemin[i - 1] + chemin[i] + chemin[i + 1]) / 3 for i in range(1, len(chemin) - 1)] + [chemin[-1]]
    return lisse

def catmull(pts, n=6):
    """Rééchantillonne une polyligne en courbe lisse (Catmull-Rom)."""
    if len(pts) < 3: return pts
    P = [pts[0]] + pts + [pts[-1]]; out = []
    for i in range(1, len(P) - 2):
        for t in [x / n for x in range(n)]:
            t2, t3 = t * t, t * t * t
            out.append(0.5 * ((2 * P[i]) + (-P[i - 1] + P[i + 1]) * t + (2 * P[i - 1] - 5 * P[i] + 4 * P[i + 1] - P[i + 2]) * t2 + (-P[i - 1] + 3 * P[i] - 3 * P[i + 1] + P[i + 2]) * t3))
    out.append(pts[-1]); return out

def tube(branches):
    """Branches [(points, rayon départ, rayon fin)] → un seul maillage (monde), via des courbes à section."""
    bm_tot = bmesh.new()
    for pts, r0, r1 in branches:
        pts = catmull(pts)
        c = bpy.data.curves.new('tmp', 'CURVE'); c.dimensions = '3D'; c.bevel_depth = 1.0; c.bevel_resolution = 3; c.use_fill_caps = True
        sp = c.splines.new('POLY'); sp.points.add(len(pts) - 1)
        for n, (pt, p) in enumerate(zip(sp.points, pts)):
            pt.co = (p.x, p.y, p.z, 1); pt.radius = r0 + (r1 - r0) * n / max(1, len(pts) - 1)
        o = bpy.data.objects.new('tmp', c); bpy.context.scene.collection.objects.link(o)
        me = bpy.data.meshes.new_from_object(o.evaluated_get(bpy.context.evaluated_depsgraph_get()))
        bm_tot.from_mesh(me); bpy.data.meshes.remove(me); bpy.data.objects.remove(o); bpy.data.curves.remove(c)
    return bm_tot

def branches_schematiques(arbres, mini, maxi, confluence, bifurcation):
    etiq, pts = etiqueter(arbres, mini, maxi)
    C = {k: centroide(v) for k, v in pts.items()}
    poids = {k: len(v) for k, v in pts.items()}
    def moy(ks): return sum((C[k] * poids[k] for k in ks), Vector()) / sum(poids[k] for k in ks)
    inter = interfaces(etiq, mini, [({'V', 'VIII'}, {'VI', 'VII'}), ({'IV'}, {'V', 'VIII'}), ({'II'}, {'III'}), ({'III'}, {'IV'})])
    for n, nom in enumerate(['veine hépatique droite', 'veine hépatique moyenne', 'veine hépatique gauche', 'jonction III / IV']):
        if len(inter[n]) < 20: arreter(f'interface introuvable : {nom} ({len(inter[n])} points)')
    veines = {
        'veine-hepatique-droite': [(ligne_centrale(inter[0], confluence), 0.0065, 0.0030)],
        'veine-hepatique-moyenne': [(ligne_centrale(inter[1], confluence), 0.0060, 0.0028)],
        'veine-hepatique-gauche': [(ligne_centrale(inter[2], confluence), 0.0055, 0.0026)],
    }
    B = bifurcation
    R0 = B + (moy(['V', 'VI', 'VII', 'VIII']) - B) * 0.40
    A0, P0 = moy(['V', 'VIII']), moy(['VI', 'VII'])
    L0 = centroide(inter[3])
    portale_droite = [([B, R0], 0.0050, 0.0042), ([R0, A0], 0.0042, 0.0032), ([R0, P0], 0.0042, 0.0032),
                      ([A0, C['VIII']], 0.0032, 0.0020), ([A0, C['V']], 0.0032, 0.0020),
                      ([P0, C['VII']], 0.0032, 0.0020), ([P0, C['VI']], 0.0032, 0.0020)]
    portale_gauche = [([B, L0], 0.0046, 0.0036), ([L0, C['III']], 0.0036, 0.0022), ([L0, C['IV']], 0.0036, 0.0022),
                      ([B, (B + C['II']) / 2 + (L0 - B) * 0.15, C['II']], 0.0036, 0.0022), ([B, C['I']], 0.0030, 0.0018)]
    veines['branche-portale-droite'] = portale_droite
    veines['branche-portale-gauche'] = portale_gauche
    rapport = {k: [round(v * 1000) for v in c] for k, c in C.items()}
    longueurs = {k: [round(sum((b[i + 1] - b[i]).length for i in range(len(b) - 1)) * 1000) for b, _, _ in v] for k, v in veines.items()}
    return veines, (rapport, longueurs), {n: len(v) for n, v in enumerate(inter.values())}

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


    # ---------- branches schématiques (tracées d'après les limites des segments) ----------
    arbres = {}
    for n, nom, cat, seg in objets:
        if seg:
            b = bm_monde(objet(next(src for sid, src, _ in SEGMENTS if sid == seg)))
            arbres[seg] = BVHTree.FromBMesh(b)
    hv = points_courbe(objet('Hepatic veins')); confluence = centroide(hv)
    pv = points_courbe(objet('Hepatic portal vein'))
    dans_foie = [p for p in pv if mini.z <= p.z <= maxi.z] or pv
    bifurcation = max(dans_foie, key=lambda p: p.z)
    schema, centres_mm, nb_interfaces = branches_schematiques(arbres, mini, maxi, confluence, bifurcation)
    print('SCHEMA longueurs des branches (mm)', centres_mm[1], '| points d\'interface', nb_interfaces)
    NOMS_SCHEMA = {
        'veine-hepatique-droite': ('Veine hépatique droite (schématique)', 'veine-schema'),
        'veine-hepatique-moyenne': ('Veine hépatique moyenne (schématique)', 'veine-schema'),
        'veine-hepatique-gauche': ('Veine hépatique gauche (schématique)', 'veine-schema'),
        'branche-portale-droite': ('Branche portale droite et ses divisions (schématique)', 'porte-schema'),
        'branche-portale-gauche': ('Branche portale gauche et ses divisions (schématique)', 'porte-schema'),
    }
    for id_, branches in schema.items():
        n = nouvel_objet(id_, tube(branches))
        objets.append((n, NOMS_SCHEMA[id_][0], NOMS_SCHEMA[id_][1], ''))

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
        'limites': 'segments de Couinaud du pack Z-Anatomy repris tels quels ; le segment IV n\'est pas subdivisé en IVa / IVb ; vaisseaux du pack : tronc de la veine porte, convergence des veines hépatiques, VCI ; branches portales et trois veines hépatiques : TRACÉ SCHÉMATIQUE construit par scripts/export_foie.py d\'après les limites des segments (pas du pack)',
        'structures': [{'id': n.name, 'nom': nom, 'cat': cat, **({'segment': seg} if seg else {}), **({'schematique': True} if cat.endswith('-schema') else {}), 'centre': centre_de(n)} for n, nom, cat, seg in objets],
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
