"""
=========================================================
RadiologicHub — export des modèles 3D d'un cours d'échoanatomie
---------------------------------------------------------
Groupe : ischio-jambiers (membre inférieur DROIT).

Source : pack Z-Anatomy (CC BY-SA 4.0), lui-même dérivé de BodyParts3D
(CC BY-SA 2.1 Japon). Téléchargement : bash scripts/telecharger_z_anatomy.sh

Usage (Blender sans interface, scripts du fichier .blend désactivés) :
    blender -b --disable-autoexec assets-sources/z-anatomy/Z-Anatomy/Startup.blend \
            -P scripts/export_muscles.py

Étapes :
  1. liste FERMÉE d'objets (STRUCTURES) ; refus de tout objet rangé dans une
     collection sous licence NC du pack (oreille interne, rein) ;
  2. géométrie évaluée en coordonnées monde ; nerfs et vaisseaux sont des
     courbes dont le pack règle l'épaisseur point par point : elle est gardée
     pour les vaisseaux ; les nerfs sont calés sur un diamètre d'AFFICHAGE
     réaliste approximatif (sciatique au tiers moyen de la cuisse, tibial et
     fibulaire commun dans la fosse poplitée), mesuré après export ;
  3. coupe horizontale sous le genou (tibia et fibula proximaux, nerf tibial),
     section refermée ;
  4. simplification (décimation) : nombre de triangles visé, ou proportion gardée ;
  5. matériaux simplifiés (muscle / tendon / os / cartilage / nerf / artère / veine) ;
  6. recentrage commun (tous les fichiers restent alignés entre eux) ;
  7. un .glb par structure, puis compression meshopt (gltf-transform) ;
  8. manifest.json (version = empreinte du fichier, sert à la validation).

Sorties :
  assets-sources/build/ischio-jambiers/*.glb   non compressés (aperçus ; ignorés par git)
  public/models/ischio-jambiers/*.glb          compressés, publiés avec LICENSE et manifest.json
=========================================================
"""
import bpy, bmesh, hashlib, json, math, os, re, shutil, subprocess, sys
from mathutils import Matrix, Vector

GROUPE = 'ischio-jambiers'
RACINE = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
DOSSIER_BRUT = os.path.join(RACINE, 'assets-sources', 'build', GROUPE)
DOSSIER_PUBLIC = os.path.join(RACINE, 'public', 'models', GROUPE)
GLTF_TRANSFORM = '@gltf-transform/cli@4.5.1'
Z_ANATOMY_COMMIT = '2b6cf98a8ca012571ecb252e5c077b42a21b3b61'

# Collections du pack sous licence NC (non commerciale) : rien ne doit en venir.
NC = re.compile(r'(ear|cochlea|labyrinth|vestibul|kidney|renal)', re.I)

# Distance gardée sous le sommet du tibia (plateau) pour la jambe : 12 cm (la tête fibulaire reste entière)
JAMBE_GARDEE = 0.12
# Altitudes de mesure des nerfs (repère du pack, m) : milieu du fémur (0,430-0,884) et fosse poplitée
Z_TIERS_MOYEN = 0.657
Z_FOSSE_POPLITEE = 0.47

# id (nom du fichier) · objet source · nom français · catégorie · simplification · diamètre des courbes
#   simplification : entier = triangles visés ; décimal ≤ 1 = proportion gardée ; None = aucune
#   diamètre : None = épaisseur du pack ; (mm, rayon_pack_min, z_mesure) = diamètre d'affichage imposé
#              aux points dont le rayon dans le pack est ≥ rayon_pack_min (le tronc, pas les racines),
#              mesuré à l'altitude z_mesure (repère du pack, en mètres)
STRUCTURES = [
    ('biceps-long',           'Long head of biceps femoris.r',  'Longue portion du biceps fémoral', 'muscle',   0.8,  None),
    ('biceps-court',          'Short head of biceps femoris.r', 'Courte portion du biceps fémoral', 'muscle',   None, None),
    ('semi-tendineux',        'Semitendinosus muscle.r',        'Semi-tendineux',                   'muscle',   None, None),
    ('semi-membraneux',       'Semimembranosus muscle.r',       'Semi-membraneux',                  'muscle',   0.8,  None),
    ('grand-gluteal',         'Gluteus maximus muscle.r',       'Grand glutéal',                    'contexte', 2500, None),
    ('grand-adducteur',       'Adductor magnus.r',              'Grand adducteur',                  'contexte', 2500, None),
    ('vaste-lateral',         'Vastus lateralis muscle.r',      'Vaste latéral',                    'contexte', 2500, None),
    ('os-coxal',              'Hip bone.r',                     'Os coxal',                         'os',       3000, None),
    ('femur',                 'Femur.r',                        'Fémur',                            'os',       3000, None),
    ('tibia-proximal',        'Tibia.r',                        'Tibia (partie proximale)',         'os',       3000, None),
    ('fibula-proximale',      'Fibula.r',                       'Fibula (partie proximale)',        'os',       3000, None),
    ('nerf-sciatique',        'Sciatic nerve.r',                'Nerf sciatique',                   'nerf',     None, (11, 3, Z_TIERS_MOYEN)),
    ('nerf-tibial',           'Tibial nerve.r',                 'Nerf tibial',                      'nerf',     None, (5, 0, Z_FOSSE_POPLITEE)),
    ('nerf-fibulaire-commun', 'Common fibular nerve.r',         'Nerf fibulaire commun',            'nerf',     None, (3.5, 0, Z_FOSSE_POPLITEE)),
    ('artere-femorale',       'Femoral artery.r',               'Artère fémorale',                  'artere',   None, None),
    ('veine-femorale',        'Femoral vein.r',                 'Veine fémorale',                   'veine',    None, None),
    ('artere-poplitee',       'Popliteal artery.r',             'Artère poplitée',                  'artere',   None, None),
    ('veine-poplitee',        'Popliteal vein.r',               'Veine poplitée',                   'veine',    None, None),
]

# Couleurs des matériaux (la visionneuse du site peut les remplacer)
MATERIAUX = {
    'muscle':    ((0.62, 0.20, 0.15), 1.0),
    'contexte':  ((0.70, 0.45, 0.40), 0.30),
    'tendon':    ((0.93, 0.91, 0.85), 1.0),
    'os':        ((0.90, 0.85, 0.74), 1.0),
    'cartilage': ((0.78, 0.86, 0.90), 1.0),
    'nerf':      ((0.95, 0.76, 0.19), 1.0),
    'artere':    ((0.84, 0.21, 0.18), 1.0),
    'veine':     ((0.24, 0.39, 0.79), 1.0),
}


def arreter(message):
    print('ERREUR :', message)
    sys.exit(1)


def collections_ancetres(obj):
    """Noms de toutes les collections qui contiennent l'objet, directement ou non."""
    parents = {}
    for c in bpy.data.collections:
        for enfant in c.children:
            parents.setdefault(enfant.name, set()).add(c.name)
    vus, pile = set(), [c.name for c in obj.users_collection]
    while pile:
        n = pile.pop()
        if n in vus:
            continue
        vus.add(n)
        pile.extend(parents.get(n, ()))
    return vus


def verifier_licences():
    for _id, nom, *_ in STRUCTURES:
        obj = bpy.data.objects.get(nom)
        if obj is None:
            arreter(f'objet absent du pack : {nom}')
        interdites = sorted(c for c in collections_ancetres(obj) if NC.search(c))
        if interdites or NC.search(nom):
            arreter(f'{nom} appartient à une collection NC : {interdites}')
    print(f'Licences : {len(STRUCTURES)} objets, aucun dans une collection NC.')


def materiau(categorie):
    nom = f'rh-{categorie}'
    m = bpy.data.materials.get(nom)
    if m:
        return m
    (r, g, b), alpha = MATERIAUX[categorie]
    m = bpy.data.materials.new(nom)
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (r, g, b, 1.0)
    bsdf.inputs['Roughness'].default_value = 0.6
    bsdf.inputs['Alpha'].default_value = alpha
    if alpha < 1:
        m.blend_method = 'BLEND'
    m.diffuse_color = (r, g, b, alpha)
    return m


def categorie_du_materiau(nom_source, categorie):
    n = (nom_source or '').lower()
    if 'tendon' in n:
        return 'tendon'
    if 'cartilage' in n:
        return 'cartilage'
    return categorie


def maillage_monde(obj, diametre):
    """Maillage évalué de l'objet, en coordonnées monde. Courbes : diamètre d'affichage imposé (ou celui du pack)."""
    if obj.type == 'CURVE':
        cu = obj.data
        if diametre:
            mm, rayon_min, _z = diametre
            for sp in cu.splines:
                for p in list(sp.points) + list(sp.bezier_points):
                    if p.radius >= rayon_min:
                        p.radius = mm / 2000 / cu.bevel_depth
        cu.bevel_mode = 'ROUND'
        cu.bevel_resolution = 2
        cu.resolution_u = 4
        cu.use_fill_caps = True
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(obj.evaluated_get(dg), preserve_all_data_layers=False, depsgraph=dg)
    me.transform(obj.matrix_world)
    if obj.matrix_world.determinant() < 0:      # échelle négative dans le pack : faces retournées
        me.flip_normals()
    return me


def couper_sous(me, z):
    """Supprime tout ce qui est sous l'altitude z et referme la section. Renvoie True si coupé."""
    if min(v.co.z for v in me.vertices) >= z:
        return False
    bm = bmesh.new()
    bm.from_mesh(me)
    res = bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:],
                                 plane_co=(0, 0, z), plane_no=(0, 0, 1), clear_inner=True)
    bord = [e for e in res['geom_cut'] if isinstance(e, bmesh.types.BMEdge) and e.is_valid and e.is_boundary]
    if bord:
        rempli = bmesh.ops.holes_fill(bm, edges=bord, sides=0)
        bmesh.ops.triangulate(bm, faces=rempli['faces'])
    bm.to_mesh(me)
    bm.free()
    return True


def triangles(me):
    return sum(len(p.vertices) - 2 for p in me.polygons)


def decimer(obj, cible):
    """Décimation (collapse) : `cible` = triangles visés (entier) ou proportion gardée (≤ 1). Renvoie le ratio."""
    avant = triangles(obj.data)
    ratio = (cible if cible <= 1 else cible / avant) if cible else 1.0
    if ratio >= 1:
        return 1.0
    mod = obj.modifiers.new('decimation', 'DECIMATE')
    mod.decimate_type = 'COLLAPSE'
    mod.ratio = ratio
    mod.use_collapse_triangulate = True
    dg = bpy.context.evaluated_depsgraph_get()
    nouveau = bpy.data.meshes.new_from_object(obj.evaluated_get(dg), preserve_all_data_layers=False, depsgraph=dg)
    obj.modifiers.remove(mod)
    ancien = obj.data
    obj.data = nouveau
    nom = ancien.name
    bpy.data.meshes.remove(ancien)
    nouveau.name = nom
    return ratio


def largeur_a(me, z):
    """Plus petite largeur (mm) de la section du maillage par le plan horizontal z : diamètre d'un tube oblique."""
    pts = []
    for e in me.edges:
        a, b = me.vertices[e.vertices[0]].co, me.vertices[e.vertices[1]].co
        if (a.z - z) * (b.z - z) <= 0 and a.z != b.z:
            t = (z - a.z) / (b.z - a.z)
            pts.append((a.x + t * (b.x - a.x), a.y + t * (b.y - a.y)))
    if len(pts) < 3:
        arreter(f'mesure impossible à z = {z} (le maillage ne coupe pas ce plan)')
    largeurs = []
    for a in range(0, 180, 3):
        c, s_ = math.cos(math.radians(a)), math.sin(math.radians(a))
        proj = [x * c + y * s_ for x, y in pts]
        largeurs.append(max(proj) - min(proj))
    return min(largeurs) * 1000


def lisser(me):
    me.polygons.foreach_set('use_smooth', [True] * len(me.polygons))
    if hasattr(me, 'use_auto_smooth'):          # Blender < 4.1 : arêtes vives au-delà de 50°
        me.use_auto_smooth = True
        me.auto_smooth_angle = math.radians(50)


def remplacer_materiaux(me, categorie):
    sources = [m.name if m else '' for m in me.materials]
    cibles, index = [], []
    for s in sources or ['']:
        m = materiau(categorie_du_materiau(s, categorie))
        if m not in cibles:
            cibles.append(m)
        index.append(cibles.index(m))
    anciens = [0] * len(me.polygons)
    me.polygons.foreach_get('material_index', anciens)
    me.materials.clear()                        # remet aussi les index des faces à 0 : on les réapplique après
    for m in cibles:
        me.materials.append(m)
    me.polygons.foreach_set('material_index', [index[min(i, len(index) - 1)] for i in anciens])
    utilises = sorted(set(index[min(i, len(index) - 1)] for i in anciens))
    return [cibles[i].name[3:] for i in utilises]


def empreinte(chemin):
    with open(chemin, 'rb') as f:
        return hashlib.sha256(f.read()).hexdigest()[:12]


def gltf_transform(*args):
    npx = shutil.which('npx')
    if not npx:
        arreter('npx introuvable (Node.js nécessaire pour la compression meshopt)')
    r = subprocess.run([npx, '--yes', GLTF_TRANSFORM, *args], capture_output=True, text=True)
    if r.returncode != 0:
        arreter(f'gltf-transform {args[0]} : {r.stderr.strip() or r.stdout.strip()}')
    return r.stdout


def main():
    verifier_licences()
    os.makedirs(DOSSIER_BRUT, exist_ok=True)
    os.makedirs(DOSSIER_PUBLIC, exist_ok=True)

    sortie = bpy.data.collections.new('RH-export')
    bpy.context.scene.collection.children.link(sortie)

    tibia = bpy.data.objects['Tibia.r']
    sommet_tibia = max((tibia.matrix_world @ v.co).z for v in tibia.data.vertices)
    z_coupe = sommet_tibia - JAMBE_GARDEE

    objets = []
    for ident, nom, libelle, categorie, cible, diametre in STRUCTURES:
        src = bpy.data.objects[nom]
        if src.type == 'CURVE':
            rayons = [p.radius for sp in src.data.splines for p in list(sp.points) + list(sp.bezier_points)]
            pack = [2000 * src.data.bevel_depth * r for r in (min(rayons), max(rayons))]
        me = maillage_monde(src, diametre)
        modifs = []
        if diametre:
            mm, _rmin, z = diametre
            mesure = largeur_a(me, z)
            ou = 'au tiers moyen de la cuisse' if z == Z_TIERS_MOYEN else 'dans la fosse poplitée'
            modifs.append(f'diamètre d\'affichage {mm:g} mm {ou} (mesuré : {mesure:.1f} mm ; pack : {pack[0]:.0f} à {pack[1]:.0f} mm ; section ronde ; approximatif)')
            print(f'  mesure {ident} : {mesure:.1f} mm {ou} (visé {mm:g} mm)')
        elif src.type == 'CURVE':
            modifs.append(f'épaisseur du pack ({pack[0]:.0f} à {pack[1]:.0f} mm de diamètre)')
        if couper_sous(me, z_coupe):
            modifs.append(f'coupé {JAMBE_GARDEE * 100:.0f} cm sous le sommet du tibia, section refermée')
        me.name = ident
        obj = bpy.data.objects.new(ident, me)
        sortie.objects.link(obj)
        tris_source = triangles(me)
        ratio = decimer(obj, cible)
        if ratio < 1:
            modifs.append(f'simplifié de {tris_source} à {triangles(obj.data)} triangles ({(1 - triangles(obj.data) / tris_source) * 100:.0f} %)')
        mats = remplacer_materiaux(obj.data, categorie)
        lisser(obj.data)
        objets.append(dict(id=ident, obj=obj, nom=libelle, categorie=categorie, source=nom,
                           materiaux=mats, modifications=modifs))

    # Recentrage commun : centre de la boîte englobante de l'ensemble
    pts = [v.co for o in objets for v in o['obj'].data.vertices]
    mn = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    mx = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    centre = (mn + mx) / 2
    # Repères de hauteur pour le plan de coupe de la visionneuse (repère glTF : y = z du pack - centre)
    coxal = next(o['obj'] for o in objets if o['id'] == 'os-coxal')
    tibia_obj = next(o['obj'] for o in objets if o['id'] == 'tibia-proximal')
    reperes = dict(
        ischion_y=round(min(v.co.z for v in coxal.data.vertices) - centre.z, 5),
        plateau_tibial_y=round(max(v.co.z for v in tibia_obj.data.vertices) - centre.z, 5),
    )
    for o in objets:
        o['obj'].data.transform(Matrix.Translation(-centre))
        o['obj'].data.update()

    for o in bpy.context.view_layer.objects:
        o.select_set(False)

    modeles = []
    for o in objets:
        obj = o['obj']
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj
        brut = os.path.join(DOSSIER_BRUT, o['id'] + '.glb')
        bpy.ops.export_scene.gltf(filepath=brut, export_format='GLB', use_selection=True,
                                  export_apply=False, export_yup=True, export_texcoords=False,
                                  export_normals=True, export_tangents=False, export_materials='EXPORT',
                                  export_cameras=False, export_lights=False, export_animations=False,
                                  export_skins=False, export_morph=False, export_extras=False)
        obj.select_set(False)
        final = os.path.join(DOSSIER_PUBLIC, o['id'] + '.glb')
        gltf_transform('meshopt', brut, final, '--level', 'medium')
        rapport = gltf_transform('validate', final, '--format', 'csv')
        erreurs = [l for l in rapport.splitlines() if ',1,' in l or 'error' in l.lower()]
        if erreurs:
            arreter(f'validation glTF de {o["id"]} : {erreurs[:3]}')
        modeles.append(dict(
            id=o['id'], fichier=o['id'] + '.glb', nom=o['nom'], categorie=o['categorie'],
            source=o['source'], materiaux=o['materiaux'], triangles=triangles(obj.data),
            octets=os.path.getsize(final), version=empreinte(final), modifications=o['modifications']))
        print(f"  {o['id']:24} {modeles[-1]['triangles']:6} triangles  {modeles[-1]['octets'] / 1024:7.1f} Ko")

    total = sum(m['octets'] for m in modeles)
    if total > 5 * 1024 * 1024:
        arreter(f'total {total / 1048576:.2f} Mo > 5 Mo')
    manifeste = dict(
        groupe=GROUPE, cote='droit', unite='mètre',
        axes='glTF : +Y vers le haut, +Z vers l\'avant du patient, -X vers le côté latéral (membre droit)',
        centre_source=[round(c, 5) for c in centre],
        coupe_jambe='%.0f cm sous le sommet du tibia' % (JAMBE_GARDEE * 100),
        reperes=reperes,
        source=dict(nom='Z-Anatomy', depot='https://github.com/Z-Anatomy/Models-of-human-anatomy',
                    commit=Z_ANATOMY_COMMIT, licence='CC BY-SA 4.0',
                    origine='BodyParts3D, The Database Center for Life Science (CC BY-SA 2.1 Japon)'),
        licence='CC BY-SA 4.0', compression='EXT_meshopt_compression (gltf-transform meshopt)',
        total_octets=total, modeles=modeles)
    with open(os.path.join(DOSSIER_PUBLIC, 'manifest.json'), 'w', encoding='utf-8') as f:
        json.dump(manifeste, f, ensure_ascii=False, indent=1)
    print(f'Total : {len(modeles)} modèles, {total / 1048576:.2f} Mo → {DOSSIER_PUBLIC}')


main()
