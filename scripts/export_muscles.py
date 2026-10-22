"""
=========================================================
RadiologicHub — export des modèles 3D des cours d'échoanatomie
---------------------------------------------------------
Groupes (membre DROIT) :
  ischio-jambiers   cuisse et fosse poplitée
  coude             partie distale du bras et proximale de l'avant-bras :
                    tendons des quatre loges, ligaments, bourses, nerfs
                    ulnaire, médian et radial, artères et veines
  patte-oie         genou : sartorius, gracile et semi-tendineux jusqu'à leur
                    insertion tibiale, bourse ansérine, ligament collatéral
                    tibial (cas clinique « tendino-bursite de la patte d'oie »)

Source : pack Z-Anatomy (CC BY-SA 4.0), lui-même dérivé de BodyParts3D
(CC BY-SA 2.1 Japon). Téléchargement : bash scripts/telecharger_z_anatomy.sh

Usage (Blender sans interface, scripts du fichier .blend désactivés) :
    blender -b --disable-autoexec --python-exit-code 1 assets-sources/z-anatomy/Z-Anatomy/Startup.blend \
            -P scripts/export_muscles.py -- <groupe>       (ischio-jambiers par défaut)

Étapes :
  1. liste FERMÉE d'objets (STRUCTURES du groupe) ; refus de tout objet rangé
     dans une collection sous licence NC du pack (oreille interne, rein) ;
     une structure peut réunir plusieurs objets du pack (chefs d'un muscle) ;
  2. géométrie évaluée en coordonnées monde ; nerfs et vaisseaux sont des
     courbes dont le pack règle l'épaisseur point par point : elle est gardée
     pour les vaisseaux ; les nerfs sont calés sur un diamètre d'AFFICHAGE
     réaliste approximatif, mesuré après export à un niveau donné ;
  3. coupes horizontales (ischio-jambiers : sous le genou ; coude et patte d'oie :
     au-dessus et au-dessous de l'interligne), sections refermées ;
  4. simplification (décimation) : nombre de triangles visé, ou proportion gardée ;
  5. matériaux simplifiés (muscle / tendon / os / cartilage / ligament / capsule /
     bourse / nerf / artère / veine) ;
  6. recentrage commun (tous les fichiers d'un groupe restent alignés entre eux) ;
  7. un .glb par structure, puis compression meshopt (gltf-transform) ;
  8. manifest.json (version = empreinte du fichier, sert à la validation).

Sorties :
  assets-sources/build/<groupe>/*.glb   non compressés (aperçus ; ignorés par git)
  public/models/<groupe>/*.glb          compressés, publiés avec LICENSE et manifest.json
=========================================================
"""
import bpy, bmesh, hashlib, json, math, os, re, shutil, subprocess, sys
from mathutils import Matrix, Vector

GROUPE = sys.argv[sys.argv.index('--') + 1] if '--' in sys.argv[:-1] else 'ischio-jambiers'
RACINE = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
DOSSIER_BRUT = os.path.join(RACINE, 'assets-sources', 'build', GROUPE)
DOSSIER_PUBLIC = os.path.join(RACINE, 'public', 'models', GROUPE)
GLTF_TRANSFORM = '@gltf-transform/cli@4.5.1'
Z_ANATOMY_COMMIT = '2b6cf98a8ca012571ecb252e5c077b42a21b3b61'

# Collections du pack sous licence NC (non commerciale) : oreille interne (CC BY-NC-SA 4.0) et rein
# (CC BY-NC 4.0), voir License.txt du pack. Rien ne doit en venir. « ear » en mot entier : « forearm »
# (avant-bras) n'est pas concerné.
NC = re.compile(r'(\bear\b|cochlea|labyrinth|vestibul|kidney|renal)', re.I)

# ---------- Ischio-jambiers ----------
# Distance gardée sous le sommet du tibia (plateau) pour la jambe : 12 cm (la tête fibulaire reste entière)
JAMBE_GARDEE = 0.12
# Altitudes de mesure des nerfs (repère du pack, m) : milieu du fémur (0,430-0,884) et fosse poplitée
Z_TIERS_MOYEN = 0.657
Z_FOSSE_POPLITEE = 0.47

# id (nom du fichier) · objet(s) source · nom français · catégorie · simplification · diamètre des courbes [· loge]
#   objet(s) source : un nom, ou un tuple de noms réunis en une structure (chefs d'un muscle)
#   simplification : entier = triangles visés ; décimal ≤ 1 = proportion gardée ; None = aucune
#   diamètre : None = épaisseur du pack ; (mm, rayon_pack_min, z_mesure[, lieu]) = diamètre d'affichage
#              imposé aux points dont le rayon dans le pack est ≥ rayon_pack_min (le tronc, pas les
#              racines), mesuré à l'altitude z_mesure (repère du pack, en mètres) ; lieu : texte
#   loge (facultatif) : loge du coude (anterieure, laterale, mediale, posterieure)
STRUCTURES_ISCHIO = [
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

# ---------- Coude ----------
# Distance gardée au-dessus et au-dessous de l'interligne (point le plus bas de l'humérus, z ≈ 1,087 dans le pack)
COUDE_GARDE = 0.12
# Altitudes de mesure des nerfs (repère du pack, m) : épicondyles (≈ 1,11), pli du coude, 4 cm au-dessus,
# col du radius (2,5 cm sous l'interligne : branches du nerf radial)
Z_EPICONDYLES = 1.11
Z_PLI_COUDE = 1.10
Z_SUPRA_COUDE = 1.13
Z_COL_RADIUS = 1.06

STRUCTURES_COUDE = [
    # Os
    ('humerus-distal',            'Humerus.r',                         'Humérus (partie distale)',              'os',       None, None),
    ('radius-proximal',           'Radius.r',                          'Radius (partie proximale)',             'os',       None, None),
    ('ulna-proximale',            'Ulna.r',                            'Ulna (partie proximale)',               'os',       None, None),
    # Loge antérieure
    ('biceps-brachial',           ('Long head of biceps brachii.r', 'Short head of biceps brachii.r'),
                                                                       'Biceps brachial',                       'muscle',   4000, None, 'anterieure'),
    ('brachial',                  'Brachialis muscle.r',               'Brachial',                              'muscle',   3000, None, 'anterieure'),
    # Loge latérale : brachio-radial, épicondyliens latéraux, supinateur
    ('brachio-radial',            'Brachioradialis muscle.r',          'Brachio-radial',                        'muscle',   3000, None, 'laterale'),
    ('long-extenseur-radial-carpe', 'Extensor carpi radialis longus.r', 'Long extenseur radial du carpe',       'muscle',   2500, None, 'laterale'),
    ('court-extenseur-radial-carpe', 'Extensor carpi radialis brevis.r', 'Court extenseur radial du carpe',     'muscle',   2500, None, 'laterale'),
    ('extenseur-doigts',          'Extensor digitorum.r',              'Extenseur des doigts',                  'muscle',   2500, None, 'laterale'),
    ('extenseur-petit-doigt',     'Extensor digiti minimi.r',          'Extenseur du petit doigt',              'muscle',   1500, None, 'laterale'),
    ('extenseur-ulnaire-carpe',   ('Humeral head of extensor carpi ulnaris.r', 'Ulnar head of extensor carpi ulnaris.r'),
                                                                       'Extenseur ulnaire du carpe',            'muscle',   2000, None, 'laterale'),
    ('supinateur',                'Supinator.r',                       'Supinateur',                            'muscle',   2500, None, 'laterale'),
    # Loge médiale : épicondyliens médiaux
    ('rond-pronateur',            ('Superficial head of pronator teres.r', 'Deep head of pronator teres.r'),
                                                                       'Rond pronateur',                        'muscle',   3000, None, 'mediale'),
    ('flechisseur-radial-carpe',  'Flexor carpi radialis.r',           'Fléchisseur radial du carpe',           'muscle',   2000, None, 'mediale'),
    ('long-palmaire',             'Palmaris longus muscle.r',          'Long palmaire',                         'muscle',   2000, None, 'mediale'),
    ('flechisseur-superficiel-doigts', ('Humero-ulnar head of flexor digitorum superficialis.r', 'Radial head of flexor digitorum superficialis.r'),
                                                                       'Fléchisseur superficiel des doigts',    'muscle',   3500, None, 'mediale'),
    ('flechisseur-ulnaire-carpe', ('Humeral head of flexor carpi ulnaris.r', 'Ulnar head of flexor carpi ulnaris.r'),
                                                                       'Fléchisseur ulnaire du carpe',          'muscle',   3000, None, 'mediale'),
    ('flechisseur-profond-doigts', 'Flexor digitorum profundus.r',     'Fléchisseur profond des doigts',        'contexte', 2000, None, 'mediale'),
    # Loge postérieure
    ('triceps-brachial',          ('Long head of triceps brachii.r', 'Lateral head of triceps brachii.r', 'Medial head of triceps brachii.r'),
                                                                       'Triceps brachial',                      'muscle',   4500, None, 'posterieure'),
    ('ancone',                    'Anconeus muscle.r',                 'Anconé',                                'muscle',   None, None, 'posterieure'),
    # Ligaments, capsule, bourses
    ('ligament-collateral-ulnaire', 'Ulnar collateral ligament.r',     'Ligament collatéral ulnaire (médial)',  'ligament', None, None, 'mediale'),
    ('ligament-collateral-radial', 'Radial collateral ligament.r',     'Ligament collatéral radial (latéral)',  'ligament', None, None, 'laterale'),
    ('ligament-annulaire',        'Annular ligament of radius.r',      'Ligament annulaire du radius',          'ligament', None, None, 'laterale'),
    ('capsule-articulaire',       'Articular capsule of elbow joint.r', 'Capsule articulaire du coude',         'capsule',  None, None),
    ('bourse-bicipito-radiale',   'Bicipitoradial bursa.r',            'Bourse bicipito-radiale',               'bourse',   None, None, 'anterieure'),
    ('bourse-tricipitale',        'Subtendinous bursa of triceps brachii muscle.r', 'Bourse sous-tendineuse du triceps', 'bourse', None, None, 'posterieure'),
    # Nerfs (diamètres d'affichage approximatifs, voir LICENSE)
    ('nerf-ulnaire',              'Ulnar nerve.r',                     'Nerf ulnaire',                          'nerf',     None, (3, 0, Z_EPICONDYLES, 'au niveau des épicondyles'), 'mediale'),
    ('nerf-median',               'Median nerve.r',                    'Nerf médian',                           'nerf',     None, (3.5, 0, Z_PLI_COUDE, 'au pli du coude'), 'anterieure'),
    ('nerf-radial',               'Radial nerve.r',                    'Nerf radial',                           'nerf',     None, (3, 0, Z_SUPRA_COUDE, '2 cm au-dessus des épicondyles'), 'laterale'),
    ('nerf-radial-profond',       'Deep branch of radial nerve.r',     'Branche profonde du nerf radial (nerf interosseux postérieur)',
                                                                                                                'nerf',     None, (2, 0, Z_COL_RADIUS, 'au col du radius'), 'laterale'),
    ('nerf-radial-superficiel',   'Superficial branch of radial nerve.r', 'Branche superficielle du nerf radial', 'nerf',   None, (1.5, 0, Z_COL_RADIUS, 'au col du radius'), 'laterale'),
    # Artères et veines (épaisseur du pack)
    ('artere-brachiale',          'Brachial artery.r',                 'Artère brachiale',                      'artere',   None, None, 'anterieure'),
    ('artere-radiale',            'Radial artery.r',                   'Artère radiale',                        'artere',   None, None, 'anterieure'),
    ('artere-ulnaire',            'Ulnar artery.r',                    'Artère ulnaire',                        'artere',   None, None, 'anterieure'),
    ('artere-collaterale-ulnaire-superieure', 'Superior ulnar collateral artery.r', 'Artère collatérale ulnaire supérieure', 'artere', None, None, 'mediale'),
    ('veines-brachiales',         'Brachial veins.r',                  'Veines brachiales',                     'veine',    None, None, 'anterieure'),
    ('veines-radiales',           'Radial veins.r',                    'Veines radiales',                       'veine',    None, None, 'anterieure'),
    ('veines-ulnaires',           'Ulnar veins.r',                     'Veines ulnaires',                       'veine',    None, None, 'anterieure'),
    ('veine-cephalique',          'Cephalic vein.r',                   'Veine céphalique',                      'veine',    None, None, 'laterale'),
    ('veine-basilique',           'Basilic vein.r',                    'Veine basilique',                       'veine',    None, None, 'mediale'),
    ('veine-mediane-coude',       'Median cubital vein.r',             'Veine médiane du coude',                'veine',    None, None, 'anterieure'),
]

# ---------- Patte d'oie (genou) ----------
# Distances gardées autour du sommet du tibia (plateau) : 14 cm de cuisse (les trois muscles convergent),
# 12 cm de jambe (l'insertion de la patte d'oie est à 5-6 cm sous l'interligne)
PATTE_OIE_CUISSE = 0.14
PATTE_OIE_JAMBE = 0.12

STRUCTURES_PATTE_OIE = [
    ('sartorius',                  'Sartorius muscle.r',                'Sartorius',                             'muscle',   3000, None),
    ('gracile',                    'Gracilis muscle.r',                 'Gracile',                               'muscle',   2500, None),
    ('semi-tendineux',             'Semitendinosus muscle.r',           'Semi-tendineux',                        'muscle',   2500, None),
    ('bourse-anserine',            'Anserine bursa.r',                  'Bourse de la patte d\'oie',             'bourse',   None, None),
    ('ligament-collateral-tibial', ('Superficial part of tibial collateral ligament.r', 'Deep part of tibial collateral ligament.r'),
                                                                        'Ligament collatéral tibial',            'ligament', None, None),
    ('semi-membraneux',            'Semimembranosus muscle.r',          'Semi-membraneux',                       'contexte', 2500, None),
    ('femur-distal',               'Femur.r',                           'Fémur (partie distale)',                'os',       3000, None),
    ('patella',                    'Patella.r',                         'Patella',                               'os',       None, None),
    ('tibia-proximal',             'Tibia.r',                           'Tibia (partie proximale)',              'os',       3000, None),
    ('fibula-proximale',           'Fibula.r',                          'Fibula (partie proximale)',             'os',       2000, None),
]

STRUCTURES = {'ischio-jambiers': STRUCTURES_ISCHIO, 'coude': STRUCTURES_COUDE, 'patte-oie': STRUCTURES_PATTE_OIE}.get(GROUPE)
if STRUCTURES is None:
    print(f'ERREUR : groupe inconnu : {GROUPE}')
    sys.exit(1)

# Couleurs des matériaux (la visionneuse du site peut les remplacer)
MATERIAUX = {
    'muscle':    ((0.62, 0.20, 0.15), 1.0),
    'contexte':  ((0.70, 0.45, 0.40), 0.30),
    'tendon':    ((0.93, 0.91, 0.85), 1.0),
    'os':        ((0.90, 0.85, 0.74), 1.0),
    'cartilage': ((0.78, 0.86, 0.90), 1.0),
    'ligament':  ((0.66, 0.74, 0.80), 1.0),
    'capsule':   ((0.70, 0.80, 0.86), 0.30),
    'bourse':    ((0.45, 0.70, 0.90), 0.55),
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


def noms_sources(nom):
    return list(nom) if isinstance(nom, tuple) else [nom]


def verifier_licences():
    noms = [n for _id, nom, *_ in STRUCTURES for n in noms_sources(nom)]
    for nom in noms:
        obj = bpy.data.objects.get(nom)
        if obj is None:
            arreter(f'objet absent du pack : {nom}')
        interdites = sorted(c for c in collections_ancetres(obj) if NC.search(c))
        if interdites or NC.search(nom):
            arreter(f'{nom} appartient à une collection NC : {interdites}')
    print(f'Licences : {len(noms)} objets, aucun dans une collection NC.')


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
            mm, rayon_min = diametre[:2]
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


def couper(me, z, retirer='dessous'):
    """Supprime tout ce qui est sous (ou au-dessus de) l'altitude z et referme la section. Renvoie True si coupé."""
    if retirer == 'dessous' and min(v.co.z for v in me.vertices) >= z:
        return False
    if retirer == 'dessus' and max(v.co.z for v in me.vertices) <= z:
        return False
    bm = bmesh.new()
    bm.from_mesh(me)
    res = bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:],
                                 plane_co=(0, 0, z), plane_no=(0, 0, 1),
                                 clear_inner=retirer == 'dessous', clear_outer=retirer == 'dessus')
    bord = [e for e in res['geom_cut'] if isinstance(e, bmesh.types.BMEdge) and e.is_valid and e.is_boundary]
    if bord:
        rempli = bmesh.ops.holes_fill(bm, edges=bord, sides=0)
        bmesh.ops.triangulate(bm, faces=rempli['faces'])
    bm.to_mesh(me)
    bm.free()
    return True


def fusionner(maillages):
    """Réunit plusieurs maillages (chefs d'un muscle) en un seul, matériaux compris."""
    if len(maillages) == 1:
        return maillages[0]
    mats = []
    for me in maillages:
        for m in me.materials:
            if m not in mats:
                mats.append(m)
    bm = bmesh.new()
    for me in maillages:
        avant = len(bm.faces)
        bm.from_mesh(me)
        bm.faces.ensure_lookup_table()
        if len(bm.faces) != avant + len(me.polygons):
            arreter('fusion des maillages : faces perdues')
        remap = [mats.index(m) for m in me.materials] or [0]
        for f in bm.faces[avant:]:
            f.material_index = remap[min(f.material_index, len(remap) - 1)]
    fusion = bpy.data.meshes.new('fusion')
    bm.to_mesh(fusion)
    bm.free()
    for m in mats:
        fusion.materials.append(m)
    for me in maillages:
        bpy.data.meshes.remove(me)
    return fusion


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


def coupes_du_groupe():
    """[(altitude, côté retiré, texte de la modification)] selon le groupe."""
    if GROUPE == 'ischio-jambiers':
        tibia = bpy.data.objects['Tibia.r']
        sommet_tibia = max((tibia.matrix_world @ v.co).z for v in tibia.data.vertices)
        return [(sommet_tibia - JAMBE_GARDEE, 'dessous', f'coupé {JAMBE_GARDEE * 100:.0f} cm sous le sommet du tibia, section refermée')]
    if GROUPE == 'patte-oie':
        tibia = bpy.data.objects['Tibia.r']
        sommet_tibia = max((tibia.matrix_world @ v.co).z for v in tibia.data.vertices)
        return [(sommet_tibia + PATTE_OIE_CUISSE, 'dessus', f'coupé {PATTE_OIE_CUISSE * 100:.0f} cm au-dessus du plateau tibial, section refermée'),
                (sommet_tibia - PATTE_OIE_JAMBE, 'dessous', f'coupé {PATTE_OIE_JAMBE * 100:.0f} cm sous le plateau tibial, section refermée')]
    humerus = bpy.data.objects['Humerus.r']
    interligne = min((humerus.matrix_world @ v.co).z for v in humerus.data.vertices)
    cm = f'{COUDE_GARDE * 100:.0f} cm'
    return [(interligne + COUDE_GARDE, 'dessus', f'coupé {cm} au-dessus de l\'interligne du coude, section refermée'),
            (interligne - COUDE_GARDE, 'dessous', f'coupé {cm} au-dessous de l\'interligne du coude, section refermée')]


def lieu_de_mesure(diametre):
    if len(diametre) > 3:
        return diametre[3]
    return 'au tiers moyen de la cuisse' if diametre[2] == Z_TIERS_MOYEN else 'dans la fosse poplitée'


def main():
    verifier_licences()
    os.makedirs(DOSSIER_BRUT, exist_ok=True)
    os.makedirs(DOSSIER_PUBLIC, exist_ok=True)

    sortie = bpy.data.collections.new('RH-export')
    bpy.context.scene.collection.children.link(sortie)

    coupes = coupes_du_groupe()

    objets = []
    for ident, nom, libelle, categorie, cible, diametre, *reste in STRUCTURES:
        loge = reste[0] if reste else None
        maillages, modifs, pack = [], [], None
        for n in noms_sources(nom):
            src = bpy.data.objects[n]
            if src.type == 'CURVE':
                rayons = [p.radius for sp in src.data.splines for p in list(sp.points) + list(sp.bezier_points)]
                pack = [2000 * src.data.bevel_depth * r for r in (min(rayons), max(rayons))]
            maillages.append(maillage_monde(src, diametre))
        me = fusionner(maillages)
        if len(maillages) > 1:
            modifs.append(f'{len(maillages)} objets du pack réunis')
        if diametre:
            mm, _rmin, z = diametre[:3]
            mesure = largeur_a(me, z)
            ou = lieu_de_mesure(diametre)
            modifs.append(f'diamètre d\'affichage {mm:g} mm {ou} (mesuré : {mesure:.1f} mm ; pack : {pack[0]:.0f} à {pack[1]:.0f} mm ; section ronde ; approximatif)')
            print(f'  mesure {ident} : {mesure:.1f} mm {ou} (visé {mm:g} mm)')
        elif pack:
            modifs.append(f'épaisseur du pack ({pack[0]:.0f} à {pack[1]:.0f} mm de diamètre)')
        for z, retirer, texte in coupes:
            if couper(me, z, retirer):
                modifs.append(texte)
        if not me.polygons:
            arreter(f'{ident} : rien ne reste après les coupes')
        me.name = ident
        obj = bpy.data.objects.new(ident, me)
        sortie.objects.link(obj)
        tris_source = triangles(me)
        ratio = decimer(obj, cible)
        if ratio < 1:
            modifs.append(f'simplifié de {tris_source} à {triangles(obj.data)} triangles ({(1 - triangles(obj.data) / tris_source) * 100:.0f} %)')
        mats = remplacer_materiaux(obj.data, categorie)
        lisser(obj.data)
        objets.append(dict(id=ident, obj=obj, nom=libelle, categorie=categorie, loge=loge,
                           source=' + '.join(noms_sources(nom)), materiaux=mats, modifications=modifs))

    # Recentrage commun : centre de la boîte englobante de l'ensemble
    pts = [v.co for o in objets for v in o['obj'].data.vertices]
    mn = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    mx = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    centre = (mn + mx) / 2
    # Repères pour la visionneuse (repère glTF : x, z du pack, -y du pack, après recentrage)
    gltf = lambda p: [round(p.x - centre.x, 5), round(p.z - centre.z, 5), round(-(p.y - centre.y), 5)]
    if GROUPE == 'ischio-jambiers':
        coxal = next(o['obj'] for o in objets if o['id'] == 'os-coxal')
        tibia_obj = next(o['obj'] for o in objets if o['id'] == 'tibia-proximal')
        reperes = dict(
            ischion_y=round(min(v.co.z for v in coxal.data.vertices) - centre.z, 5),
            plateau_tibial_y=round(max(v.co.z for v in tibia_obj.data.vertices) - centre.z, 5),
        )
    elif GROUPE == 'patte-oie':
        tibia_obj = next(o['obj'] for o in objets if o['id'] == 'tibia-proximal')
        bourse = [v.co for v in next(o['obj'] for o in objets if o['id'] == 'bourse-anserine').data.vertices]
        centre_bourse = sum(bourse, Vector()) / len(bourse)
        reperes = dict(
            plateau_tibial_y=round(max(v.co.z for v in tibia_obj.data.vertices) - centre.z, 5),
            bourse_anserine=gltf(centre_bourse),
            coupe_proximale_y=round(coupes[0][0] - centre.z, 5),
            coupe_distale_y=round(coupes[1][0] - centre.z, 5),
        )
    else:
        hum = [v.co for v in next(o['obj'] for o in objets if o['id'] == 'humerus-distal').data.vertices]
        interligne = min(p.z for p in hum)
        bas = [p for p in hum if p.z < interligne + 0.06]
        lateral, medial = min(bas, key=lambda p: p.x), max(bas, key=lambda p: p.x)   # membre droit : latéral = x minimal
        olecrane = max((v.co for v in next(o['obj'] for o in objets if o['id'] == 'ulna-proximale').data.vertices), key=lambda p: p.z)
        reperes = dict(
            interligne_y=round(interligne - centre.z, 5) + 0.0,     # + 0.0 : jamais « -0.0 »
            epicondyle_lateral=gltf(lateral),
            epicondyle_medial=gltf(medial),
            olecrane=gltf(olecrane),
            coupe_proximale_y=round(coupes[0][0] - centre.z, 5),
            coupe_distale_y=round(coupes[1][0] - centre.z, 5),
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
        modele = dict(id=o['id'], fichier=o['id'] + '.glb', nom=o['nom'], categorie=o['categorie'])
        if o['loge']:
            modele['loge'] = o['loge']
        modele.update(source=o['source'], materiaux=o['materiaux'], triangles=triangles(obj.data),
                      octets=os.path.getsize(final), version=empreinte(final), modifications=o['modifications'])
        modeles.append(modele)
        print(f"  {o['id']:24} {modeles[-1]['triangles']:6} triangles  {modeles[-1]['octets'] / 1024:7.1f} Ko")

    total = sum(m['octets'] for m in modeles)
    if total > 5 * 1024 * 1024:
        arreter(f'total {total / 1048576:.2f} Mo > 5 Mo')
    manifeste = dict(
        groupe=GROUPE, cote='droit', unite='mètre',
        axes='glTF : +Y vers le haut, +Z vers l\'avant du patient, -X vers le côté latéral (membre droit)',
        centre_source=[round(c, 5) for c in centre])
    if GROUPE == 'ischio-jambiers':
        manifeste['coupe_jambe'] = '%.0f cm sous le sommet du tibia' % (JAMBE_GARDEE * 100)
    elif GROUPE == 'patte-oie':
        manifeste['position'] = 'anatomique : genou en extension'
        manifeste['coupes'] = '%.0f cm au-dessus et %.0f cm au-dessous du plateau tibial' % (PATTE_OIE_CUISSE * 100, PATTE_OIE_JAMBE * 100)
    else:
        manifeste['position'] = 'anatomique : coude en extension, avant-bras en supination'
        manifeste['coupes'] = '%.0f cm au-dessus et au-dessous de l\'interligne du coude' % (COUDE_GARDE * 100)
    manifeste.update(
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
