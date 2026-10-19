"""Radioanatomie IRM cérébrale : corrections de l'auteur appliquées aux étiquettes automatiques de l'étape 3.

Les corrections sont relevées dans l'interface de validation privée (étape 5 : points posés et commentaires de
l'auteur) et recopiées dans corrections-auteur.json (même dossier) ; ce module les applique aux volumes avant toute
exportation (données de l'interface, visionneuse du site). Rien n'est tracé ici : chaque zone part des points de
l'auteur, selon une règle écrite.

Zone sans parenchyme (« pas de parenchyme cérébral ici ») :
  1. sur la coupe axiale des points, composantes connexes (8-connexité) des voxels étiquetés par FastSurfer qui
     contiennent un point (ou qui en sont à moins de 2 mm) ; une composante de plus de 1 500 voxels (7 cm²)
     arrête le script : la règle ne doit retirer que les îlots désignés ;
  2. empreinte de ces composantes, élargie d'un voxel, reportée sur cette coupe et sur toutes les coupes au-dessous
     (ce qui est sous une coupe sans parenchyme, dans la même empreinte, n'en contient pas davantage) ;
  3. dans cette zone sont retirés : le cortex (régions DKT) et la substance blanche cérébrale des étiquettes fines,
     et toutes les valeurs des couches dérivées (lobes, sillons, territoires, zones jonctionnelles) ; les autres
     étiquettes (HypVINN, méninges, artères) ne sont pas touchées.

Tronc cérébral (contours de l'auteur, « contours_tronc_cerebral ») ; FastSurfer (aseg) étiquette « Brain-Stem » avec
des prolongements dans les pédoncules cérébelleux et range les pédoncules cérébraux dans le « diencéphale ventral » :
  1. contour fermé de l'auteur (pont) : sur sa coupe, le tronc devient exactement l'intérieur du contour (tissu
     seulement, ventricules et LCS exclus) ;
  2. coupes où le quatrième ventricule est large (au moins 15 mm²) : le tronc s'arrête au plancher du V4 (voxel le
     plus antérieur du V4, une rangée de voxels en arrière), ce qui retire les prolongements postéro-latéraux
     (pédoncules cérébelleux) comme sur le contour de l'auteur ; la limite latérale avec les pédoncules cérébelleux
     moyens reste celle de FastSurfer tant que l'auteur ne l'a pas tracée sur d'autres coupes ;
  3. bords antérieurs des pédoncules cérébraux tracés par l'auteur (mésencéphale) : le diencéphale ventral situé en
     arrière du bord (empreinte fermée en arrière) passe dans le tronc cérébral, sur la coupe du tracé, sur les
     coupes intermédiaires (empreinte du tracé le plus proche) et au-dessous du tracé le plus bas ; rien n'est
     changé au-dessus du tracé le plus haut ;
  4. ce qui sort du tronc revient à la substance blanche du cervelet du même côté (pédoncules cérébelleux).
"""
import json, os

import numpy as np
from scipy import ndimage as ndi

ICI = os.path.dirname(os.path.abspath(__file__))
FICHIER = os.path.join(ICI, 'corrections-auteur.json')
TAILLE_MAX = 1500
RETIRES_FINES = lambda f: ((f >= 1000) & (f < 3000)) | np.isin(f, (2, 41))


def charger():
    with open(FICHIER, encoding='utf-8') as f:
        return json.load(f)


def zone_sans_parenchyme(fines, affine):
    """Masque booléen (grille de fines) des zones désignées par l'auteur ; renvoie aussi un bilan par zone."""
    inv = np.linalg.inv(affine)
    zone = np.zeros(fines.shape, bool)
    bilan = []
    for z in charger()['zones_sans_parenchyme']:
        k = int(round((inv @ [0, 0, z['z_mm'], 1])[2]))
        etiq = fines[:, :, k] > 0
        comp, _ = ndi.label(etiq, structure=np.ones((3, 3)))
        taille = np.bincount(comp.ravel())
        dist, (ii, jj) = ndi.distance_transform_edt(comp == 0, return_indices=True)
        pas = abs(affine[0, 0])
        retenues = set()
        for x, y in z['points_mm']:
            i, j = (int(round(v)) for v in (inv @ [x, y, z['z_mm'], 1])[:2])
            c = comp[i, j] if comp[i, j] else (comp[ii[i, j], jj[i, j]] if dist[i, j] * pas <= 2.0 else 0)
            if c:
                retenues.add(int(c))
        trop = [c for c in retenues if taille[c] > TAILLE_MAX]
        if trop:
            raise SystemExit(f"zone z = {z['z_mm']} mm : composante de {taille[trop[0]]} voxels, trop grande pour la règle")
        empreinte = ndi.binary_dilation(np.isin(comp, list(retenues)), structure=np.ones((3, 3)))
        zone[:, :, :k + 1] |= empreinte[:, :, None]
        bilan.append({'z_mm': z['z_mm'], 'points': len(z['points_mm']), 'ilots': len(retenues),
                      'voxels_coupe': int(sum(taille[c] for c in retenues))})
    return zone, bilan


def appliquer(fines, couches, zone):
    """Retire les étiquettes de la zone : cortex et substance blanche dans fines, tout dans les couches dérivées
    (dictionnaire nom → volume, modifiés sur place). Renvoie le nombre de voxels retirés de fines."""
    retirer = zone & RETIRES_FINES(fines)
    fines[retirer] = 0
    for v in couches.values():
        v[zone] = 0
    return int(retirer.sum())


def _polygone(points_ij, forme):
    from matplotlib.path import Path
    ii, jj = np.meshgrid(np.arange(forme[0]), np.arange(forme[1]), indexing='ij')
    dedans = Path(np.asarray(points_ij, float)).contains_points(np.c_[ii.ravel(), jj.ravel()], radius=0.5)
    return dedans.reshape(forme)


def tronc_cerebral(fines, affine):
    """Applique les règles du tronc cérébral (docstring du module) à fines (modifié sur place). Renvoie les masques
    des voxels entrés dans le tronc et sortis du tronc (pour la couche des lobes) et un bilan."""
    contours = charger().get('contours_tronc_cerebral', [])
    inv = np.linalg.inv(affine)
    vers_ij = lambda x, y, z: (inv @ [x, y, z, 1])[:3]
    tronc0 = fines == 16
    pas_tissu = np.isin(fines, (0, 4, 5, 14, 15, 24, 31, 43, 44, 63))
    nouveau = tronc0.copy()
    bilan = {}
    # 2. plancher du V4 sur les coupes où il est large
    v4 = fines == 15
    aire = v4.sum(axis=(0, 1)) * abs(affine[0, 0] * affine[1, 1])
    jj = np.arange(fines.shape[1])[None, :]
    coupes = [k for k in np.flatnonzero(aire >= 15.0) if tronc0[:, :, k].any()]
    for k in coupes:
        plancher = np.argwhere(v4[:, :, k])[:, 1].max()           # j croissant = vers l'avant
        garde = tronc0[:, :, k] & (jj >= plancher - 1)
        comp, n = ndi.label(garde)
        if n > 1:                                                    # plus grande partie seulement
            garde = comp == np.argmax(np.bincount(comp.ravel())[1:]) + 1
        nouveau[:, :, k] = garde
    bilan['coupes_plancher_v4'] = len(coupes)
    empreintes = {}
    for c in contours:
        k = int(round(vers_ij(0, 0, c['z_mm'])[2]))
        ij = [vers_ij(x, y, c['z_mm'])[:2] for x, y in c['points_mm']]
        if c['forme'] == 'fermé':                                    # 1. contour fermé : fait foi sur sa coupe
            nouveau[:, :, k] = _polygone(ij, fines.shape[:2]) & ~pas_tissu[:, :, k]
        else:                                                        # 3. bord antérieur des pédoncules
            ij = np.asarray(ij)
            arriere = min(np.argwhere(tronc0[:, :, k] | np.isin(fines[:, :, k], (28, 60)))[:, 1].min() - 2, ij[:, 1].min())
            poly = np.r_[ij, [[ij[-1, 0], arriere], [ij[0, 0], arriere]]]
            empreintes[k] = _polygone(poly, fines.shape[:2])
    if empreintes:
        haut = max(empreintes)
        dv = np.isin(fines, (28, 60))
        coupes_dv = [kk for kk in range(haut + 1) if dv[:, :, kk].any()]
        for kk in coupes_dv:
            proche = min(empreintes, key=lambda k: (abs(k - kk), k))    # tracé le plus proche
            nouveau[:, :, kk] |= empreintes[proche] & dv[:, :, kk]
        bilan['coupes_pedoncules'] = len(coupes_dv)
    entres, sortis = nouveau & ~tronc0, tronc0 & ~nouveau
    gauche = (affine[0, 0] * np.arange(fines.shape[0]) + affine[0, 3]) < 0
    fines[nouveau] = 16
    fines[sortis] = np.where(gauche[:, None, None], 7, 46)[np.nonzero(sortis)[0], 0, 0]
    bilan.update(entres=int(entres.sum()), sortis=int(sortis.sum()))
    return entres, sortis, bilan

