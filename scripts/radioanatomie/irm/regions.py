"""Radioanatomie IRM cérébrale : grandes régions (couche « lobes » de l'interface), sur le modèle du découpage des
vidéos de référence de l'auteur du 19/10/2026 (dépôt privé ; rien n'en est repris, seul le découpage est suivi).

Valeurs ajoutées à la couche des lobes (étiquettes fines déjà corrigées par corrections_auteur.py) :
  1–6 / 11–16  lobes (étape 3, etiquettes.LOBES), inchangés ;
  7 / 17      diencéphale : thalamus et diencéphale ventral (FastSurfer), hypothalamus et corps mamillaires (HypVINN) ;
  8 / 18      hémisphère cérébelleux : lobules hémisphériques (CerebNet), corps médullaire et cortex restant (aseg) ;
  9 / 19      reste du télencéphale (noyaux gris centraux, capsules, hippocampe, amygdale) : ne sert qu'aux unions
              (« Hémisphère cérébral ») ;
  21, 22, 23  mésencéphale, pont, moelle allongée : tronc cérébral coupé en coupes axiales entières ;
  24          vermis (lobules VI à X de CerebNet, qui ne sépare pas le vermis des lobules I à V).

Coupe du tronc cérébral, en coupes axiales entières (demande de l'auteur du 19/10/2026, corrections-auteur.json,
« niveaux_tronc_cerebral ») :
  - mésencéphale au-dessus de la première coupe du pont donnée par l'auteur (z = −19,5 mm) ;
  - moelle allongée à partir du sillon bulbo-pontique et au-dessous : sur la ligne médiane (bande de ±2,8 mm),
    profil antérieur du tronc coupe par coupe ; le pont est la saillie antérieure la plus marquée entre z = −45 et
    −15 mm, le sillon bulbo-pontique la chute la plus forte du profil au-dessous (dernière coupe du bulbe) ;
  - pont entre les deux.
"""
import numpy as np
from scipy import ndimage as ndi

# identifiants FreeSurfer (aseg, HypVINN, CerebNet)
DIENCEPHALE = {'gauche': (10, 28, 979, 977, 978, 980, 966), 'droit': (49, 60, 983, 981, 982, 984, 963)}
CERVELET_HEMI = {'gauche': (7, 8, 601, 603, 605, 608, 611, 614, 617, 620, 623, 626),
                 'droit': (46, 47, 602, 604, 607, 610, 613, 616, 619, 622, 625, 628)}
VERMIS = (606, 630, 631, 624, 627)
TELENCEPHALE_RESTE = {'gauche': (2, 11, 12, 13, 26, 17, 18), 'droit': (41, 50, 51, 52, 58, 53, 54)}


def coupe_tronc(tronc, affine, z_pont_haut, bande_mm=2.8):
    """Renvoie (mesencephale, pont, bulbe) et un bilan (z des limites en mm)."""
    pas = abs(affine[0, 0])
    i0 = int(round((0 - affine[0, 3]) / affine[0, 0]))
    b = int(round(bande_mm / pas))
    milieu = tronc[i0 - b:i0 + b + 1].any(axis=0)                     # (j, k)
    ks = np.flatnonzero(milieu.any(axis=0))
    avant = np.full(tronc.shape[2], np.nan)
    for k in ks:
        avant[k] = np.flatnonzero(milieu[:, k]).max()
    lisse = avant.copy()
    lisse[ks] = ndi.uniform_filter1d(avant[ks], 3)
    z = affine[2, 3] + np.arange(tronc.shape[2]) * affine[2, 2]
    zone = ks[(z[ks] >= -45) & (z[ks] <= -15)]
    k_pont = zone[np.nanargmax(lisse[zone])]
    pente = np.gradient(lisse)                                        # en voxels de y par coupe
    bas = [k for k in ks if k_pont - int(25 / pas) <= k < k_pont]
    k_inf = bas[int(np.nanargmax(pente[bas]))]                        # le profil recule le plus vite en descendant
    k_sup = int(round((z_pont_haut - affine[2, 3]) / affine[2, 2]))   # première coupe du pont (auteur)
    kk = np.arange(tronc.shape[2])[None, None, :]
    mes = tronc & (kk > k_sup)
    bul = tronc & (kk <= k_inf)
    pon = tronc & ~mes & ~bul
    return (mes, pon, bul), {'z_premiere_coupe_pont': round(float(z[k_sup]), 1),
                             'z_derniere_coupe_bulbe': round(float(z[k_inf]), 1)}


def completer(fines, lobes, affine, z_pont_haut):
    """Ajoute à la couche des lobes (modifiée sur place) les valeurs décrites dans la docstring du module."""
    for cote, base in (('gauche', 0), ('droit', 10)):
        reste = (lobes == 0) & np.isin(fines, TELENCEPHALE_RESTE[cote])
        lobes[reste] = 9 + base
        lobes[np.isin(fines, DIENCEPHALE[cote])] = 7 + base
        lobes[np.isin(fines, CERVELET_HEMI[cote])] = 8 + base
    lobes[np.isin(fines, VERMIS)] = 24
    lobes[lobes == 20] = 0
    (mes, pon, bul), bilan = coupe_tronc(fines == 16, affine, z_pont_haut)
    lobes[mes], lobes[pon], lobes[bul] = 21, 22, 23
    bilan.update({nom: round(float(m.sum() * abs(np.linalg.det(affine[:3, :3])) / 1000), 1)
                  for nom, m in (('mesencephale_ml', mes), ('pont_ml', pon), ('bulbe_ml', bul))})
    return bilan
