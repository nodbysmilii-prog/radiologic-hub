"""
=========================================================
RadiologicHub — modèle 3D « Main et poignet (os) » pour la fiche
« Fractures de l'extrémité distale du radius »
---------------------------------------------------------
Source : pack Z-Anatomy (CC BY-SA 4.0), dérivé de BodyParts3D (CC BY-SA 2.1 Japon),
téléchargé à version figée par scripts/telecharger_z_anatomy.sh.

Usage (Blender sans interface, scripts du fichier .blend désactivés) :
    blender -b --disable-autoexec --python-exit-code 1 assets-sources/z-anatomy/Z-Anatomy/Startup.blend \\
            -P scripts/export_main.py

Étapes :
  1. liste FERMÉE d'objets du pack : main droite — radius et ulna (tiers distal), 8 os du carpe,
     5 métacarpiens, 14 phalanges ;
  2. radius et ulna coupés à 7 cm au-dessus de l'interligne radio-carpien ;
  3. os lissés (Catmull-Clark, 1 niveau : le maillage du pack est très peu détaillé) ; repères
     mesurés sur le radius entier (repère du pack, m) :
       axe du radius = axe principal (ACP) de tous ses sommets ;
       pointe de la styloïde radiale = point le plus distal du radius ;
       coin ulnaire de la surface articulaire = point le plus distal du bord médial (incisure ulnaire) ;
       rebords palmaire et dorsal = points les plus distaux des tiers antérieur et postérieur
       d'une bande sagittale centrée sur la surface articulaire ;
     d'où l'inclinaison radiale, la hauteur radiale et l'inclinaison palmaire du modèle (contrôle :
     18,8°, 10,5 mm, 13,8° pour des normales d'environ 22°, 11 mm, 11°) ;
  4. repère commun : centré sur le capitatum, ×10, Y en haut, Z vers l'avant (palmaire) ;
  5. un seul .glb (un objet nommé par os), compressé meshopt (gltf-transform) ;
  6. main.json : os, groupes, repères et mesures, empreinte du .glb.

Sorties :
  assets-sources/build/main/main.glb (non compressé)
  public/models/main/main.glb, main.json, LICENSE-Z-Anatomy.txt
=========================================================
"""
import bpy, bmesh, hashlib, json, math, os, shutil, subprocess, sys
from mathutils import Vector, Matrix

RACINE = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
BRUT = os.path.join(RACINE, 'assets-sources', 'build', 'main')
PUBLIC = os.path.join(RACINE, 'public', 'models', 'main')
GLTF_TRANSFORM = '@gltf-transform/cli@4.5.1'
Z_ANATOMY_COMMIT = '2b6cf98a8ca012571ecb252e5c077b42a21b3b61'
ECHELLE = 10
COUPE_AVANT_BRAS = 0.07          # m au-dessus de la pointe de la styloïde radiale

def arreter(msg):
    print('ERREUR export_main :', msg); sys.exit(1)

DOIGTS = [('first', 'pouce', 1), ('second', 'index', 2), ('third', 'majeur', 3), ('fourth', 'annulaire', 4), ('fifth', 'auriculaire', 5)]
ROMAIN = {1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V'}
ORD = {1: '1er', 2: '2e', 3: '3e', 4: '4e', 5: '5e'}

STRUCTURES = [
    ('radius', 'Radius.r', 'Radius (extrémité distale)', 'avant-bras'),
    ('ulna', 'Ulna.r', 'Ulna (extrémité distale)', 'avant-bras'),
    ('scaphoide', 'Scaphoid bone.r', 'Scaphoïde', 'carpe-proximal'),
    ('lunatum', 'Lunate bone.r', 'Lunatum (semi-lunaire)', 'carpe-proximal'),
    ('triquetrum', 'Triquetrum bone.r', 'Triquetrum (pyramidal)', 'carpe-proximal'),
    ('pisiforme', 'Pisiform bone.r', 'Pisiforme', 'carpe-proximal'),
    ('trapeze', 'Trapezium bone.r', 'Trapèze', 'carpe-distal'),
    ('trapezoide', 'Trapezoid bone.r', 'Trapézoïde', 'carpe-distal'),
    ('capitatum', 'Capitate bone.r', 'Capitatum (grand os)', 'carpe-distal'),
    ('hamatum', 'Hamate bone.r', 'Hamatum (os crochu)', 'carpe-distal'),
    *[(f'm{n}', f'{en.capitalize()} metacarpal bone.r', f'{ORD[n]} métacarpien', 'metacarpe') for en, _, n in DOIGTS],
    *[(f'p{n}-{k}', f'{K} phalanx of {en} finger of hand.r', f'Phalange {kfr} du {dfr}' if n == 1 else f'Phalange {kfr} du {dfr} ({ROMAIN[n]})', 'phalanges')
      for en, dfr, n in DOIGTS
      for k, K, kfr in (('p', 'Proximal', 'proximale'), ('m', 'Middle', 'moyenne'), ('d', 'Distal', 'distale')) if not (n == 1 and k == 'm')],
]

dg = bpy.context.evaluated_depsgraph_get()

def objet(nom):
    o = bpy.data.objects.get(nom)
    if o is None: arreter(f'objet absent du pack : {nom}')
    return o

def bm_monde(o):
    e = o.evaluated_get(dg); me = e.to_mesh()
    bm = bmesh.new(); bm.from_mesh(me); bm.transform(o.matrix_world); e.to_mesh_clear()
    return bm

def couper_au_dessus(bm, z):
    geom = bm.verts[:] + bm.edges[:] + bm.faces[:]
    bmesh.ops.bisect_plane(bm, geom=geom, plane_co=(0, 0, z), plane_no=(0, 0, 1), clear_outer=True)
    return bm

def centre_coupe(pts, z, e=0.002):
    s = [p for p in pts if abs(p.z - z) < e]
    return sum(s, Vector()) / len(s)

def axe_principal(pts):
    """Axe principal (ACP) d'un nuage de points : vecteur propre de plus grande valeur propre, orienté vers le haut."""
    c = sum(pts, Vector()) / len(pts)
    m = [[0.0] * 3 for _ in range(3)]
    for p in pts:
        d = p - c
        for i in range(3):
            for j in range(3): m[i][j] += d[i] * d[j]
    v = Vector((0.3, 0.3, 1.0))
    for _ in range(60):
        v = Vector([sum(m[i][j] * v[j] for j in range(3)) for i in range(3)]).normalized()
    return v if v.z > 0 else -v

def mesures(rad):
    """rad : points (repère du pack) du radius ENTIER lissé."""
    zmin = min(p.z for p in rad)
    axe = axe_principal(rad)
    distaux = [p for p in rad if p.z < zmin + 0.012]
    styloide = min(distaux, key=lambda p: p.z)
    xmax = max(p.x for p in distaux)
    coin = min([p for p in distaux if p.x > xmax - 0.003], key=lambda p: p.z)      # bord médial (incisure ulnaire), point le plus distal
    def proj(v, i, j): return Vector((v[i], v[j]))
    # plan frontal (x, z)
    ax = proj(axe, 0, 2).normalized(); perp = Vector((ax.y, -ax.x))
    d = proj(coin - styloide, 0, 2).normalized()
    inclinaison = math.degrees(math.acos(min(1, abs(d.dot(perp)))))
    hauteur = (coin - styloide).dot(axe)
    # plan sagittal (y, z) : bande centrée sur la fossette lunarienne
    xc = styloide.x + 0.65 * (coin.x - styloide.x)
    bande = [p for p in distaux if abs(p.x - xc) < 0.003]
    ymin, ymax = min(p.y for p in bande), max(p.y for p in bande)
    tiers = (ymax - ymin) / 3
    # rebords : point le plus distal (le long de l'axe) du tiers palmaire (−Y) et du tiers dorsal (+Y)
    palmaire = max([p for p in bande if p.y < ymin + tiers], key=lambda p: (-p).dot(axe))
    dorsal = max([p for p in bande if p.y > ymax - tiers], key=lambda p: (-p).dot(axe))
    axs = proj(axe, 1, 2).normalized()
    v = proj(palmaire - dorsal, 1, 2)
    # inclinaison palmaire : angle entre la ligne des rebords et la perpendiculaire à l'axe ; positive si le rebord dorsal est plus distal
    tilt = math.degrees(math.asin(min(1, abs(v.normalized().dot(axs)))))
    if (dorsal - palmaire).dot(axe) > 0: tilt = -tilt
    return {'styloide': styloide, 'coin-ulnaire': coin, 'rebord-palmaire': palmaire, 'rebord-dorsal': dorsal, 'axe': axe,
            'zmin': zmin, 'inclinaison_radiale': inclinaison, 'hauteur_radiale_mm': hauteur * 1000, 'inclinaison_palmaire': tilt}

def lisse(o_src, nom):
    """Copie lissée (Catmull-Clark, 1 niveau) dans le repère monde : le maillage du pack est très peu détaillé."""
    bm = bm_monde(o_src); me = bpy.data.meshes.new(nom); bm.to_mesh(me); bm.free()
    n = bpy.data.objects.new(nom, me); bpy.context.scene.collection.objects.link(n)
    m = n.modifiers.new('lisse', 'SUBSURF'); m.levels = 1
    bpy.context.view_layer.objects.active = n; bpy.ops.object.modifier_apply(modifier='lisse')
    return n

def main():
    os.makedirs(BRUT, exist_ok=True)
    objets = []
    for id_, src, nom, cat in STRUCTURES:
        objets.append((lisse(objet(src), id_), nom, cat))
    rad = next(n for n, _, c in objets if n.name == 'radius')
    M = mesures([v.co.copy() for v in rad.data.vertices])
    print('MESURES', {k: round(v, 1) for k, v in M.items() if isinstance(v, float)})
    capi = next(n for n, _, c in objets if n.name == 'capitatum')
    centre = sum((v.co for v in capi.data.vertices), Vector()) / len(capi.data.vertices)
    def vers_gltf(p):
        q = (p - centre) * ECHELLE
        return [round(q.x, 4), round(q.z, 4), round(-q.y, 4)]
    # radius et ulna : tiers distal seulement
    for n, _, cat in objets:
        if cat != 'avant-bras': continue
        bm = bmesh.new(); bm.from_mesh(n.data); couper_au_dessus(bm, M['zmin'] + COUPE_AVANT_BRAS); bm.to_mesh(n.data); bm.free()
    T = Matrix.Translation(-centre); S = Matrix.Diagonal((ECHELLE, ECHELLE, ECHELLE, 1))
    bpy.ops.object.select_all(action='DESELECT')
    for n, _, _ in objets:
        n.data.transform(S @ T @ n.matrix_world); n.matrix_world = Matrix.Identity(4)
        n.data.materials.clear(); n.data.materials.append(bpy.data.materials.new('rh-' + n.name))
        for p in n.data.polygons: p.use_smooth = True
        n.select_set(True)
    brut = os.path.join(BRUT, 'main.glb')
    bpy.ops.export_scene.gltf(filepath=brut, export_format='GLB', use_selection=True, export_yup=True,
                              export_apply=True, export_materials='PLACEHOLDER', export_normals=True)
    donnees = {
        'source': f'Z-Anatomy (CC BY-SA 4.0), commit {Z_ANATOMY_COMMIT}, dérivé de BodyParts3D (CC BY-SA 2.1 JP)',
        'repere': 'main droite, centré sur le capitatum, ×10, +Y haut (proximal), +Z avant (palmaire), −X côté radial (pouce)',
        'os': [{'id': n.name, 'nom': nom, 'groupe': cat} for n, nom, cat in objets],
        'reperes': {k: vers_gltf(v) for k, v in M.items() if isinstance(v, Vector) and k != 'axe'},
        'axe_radius': [round(M['axe'].x, 4), round(M['axe'].z, 4), round(-M['axe'].y, 4)],
        'mesures_modele': {'inclinaison_radiale_deg': round(M['inclinaison_radiale'], 1), 'hauteur_radiale_mm': round(M['hauteur_radiale_mm'], 1),
                           'inclinaison_palmaire_deg': round(M['inclinaison_palmaire'], 1)},
    }
    os.makedirs(PUBLIC, exist_ok=True)
    final = os.path.join(PUBLIC, 'main.glb')
    npx = shutil.which('npx') or arreter('npx introuvable')
    r = subprocess.run([npx, '--yes', GLTF_TRANSFORM, 'meshopt', brut, final], capture_output=True, text=True)
    if r.returncode != 0: arreter('gltf-transform : ' + (r.stderr or r.stdout))
    with open(final, 'rb') as f: donnees['empreinte'] = hashlib.sha256(f.read()).hexdigest()[:12]
    donnees['octets'] = os.path.getsize(final)
    json.dump(donnees, open(os.path.join(PUBLIC, 'main.json'), 'w'), ensure_ascii=False, indent=1)
    shutil.copy(os.path.join(RACINE, 'assets-sources', 'z-anatomy', 'License.txt'), os.path.join(PUBLIC, 'LICENSE-Z-Anatomy.txt'))
    print('EXPORT OK', donnees['octets'], 'octets', len(objets), 'os')

main()
