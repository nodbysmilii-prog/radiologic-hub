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
