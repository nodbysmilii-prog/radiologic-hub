"""Radioanatomie IRM cérébrale : audit des étiquettes contre les atlas de référence (demande de l'auteur du 19/10/2026).

Sources, par ordre de priorité (choix de l'auteur) :
  1. template MNI-ICBM152 non linéaire 2009c (Fonov et al. 2011), versions symétrique et asymétrique, par
     TemplateFlow (S3, identifiants de version figés + sha256) ; licence MNI : copie et modification permises, avec
     la mention du copyright (fichiers LICENSE gardés à côté) ;
  2. CerebrA (Manera et al., Sci Data 2020, doi:10.1038/s41597-020-0557-9), sur le template 2009c symétrique ;
     dérivé de Mindboggle-101 (Klein et Tourville 2012), sous CC BY-NC-SA 3.0 : CONTRÔLE INTERNE SEULEMENT, rien de
     CerebrA n'est publié ;
  3. Harvard-Oxford (cortical latéralisé et sous-cortical, seuil 25 %), sur le template 2009c asymétrique, noms des
     étiquettes tirés des tables de TemplateFlow (MNI152NLin6Asym, même numérotation) ; licence FSL (non
     commerciale) : CONTRÔLE INTERNE SEULEMENT (choix de l'auteur), rien n'est publié ;
  4. Liu et al. 2023 (territoires artériels, déjà utilisé, CC BY-SA 4.0) et 5. Tatu et al. 1998 (contrôle clinique,
     lecture seulement) : partie « territoires » de l'audit.

Partie « references » : téléchargement et vérification des fichiers (assets-sources/…/references/, non versionné).
Partie « recalage » : chaque template (cerveau seul) est recalé sur le cerveau du sujet (T1 de l'étape 2 masqué par
le cerveau de l'étape 3, copie à 1 mm) : affine (départ sans pré-alignement, les deux images étant déjà proches de
l'espace MNI) puis SyN (corrélation croisée), ANTs ; CerebrA et Harvard-Oxford sont reportés sur la grille de 0,7 mm
du sujet (interpolation « genericLabel »). La même transformation donne les coordonnées MNI des points du sujet.
Sortie : assets-sources/radioanatomie/irm-cerebrale/audit/.
Usage : python3 -I -B scripts/radioanatomie/irm/audit_atlas.py [references|recalage]   (depuis la racine du dépôt)
"""
import hashlib, json, os, shutil, sys, urllib.request

os.environ.setdefault('ANTS_RANDOM_SEED', '1')
import ants
import nibabel as nib
import numpy as np
from scipy import ndimage as ndi

ICI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, ICI)
sys.path.insert(0, os.path.dirname(ICI))
import etape2_preparation as etape2

BASE = etape2.etape1.BASE
REFERENCES = os.path.join(BASE, 'references')
SORTIE = os.path.join(BASE, 'audit')
CACHE = os.path.join(SORTIE, 'cache')
ETAPE3 = os.path.join(BASE, 'etape3')

# Fichiers à version figée (identifiant de version S3 de TemplateFlow + empreinte sha256)
TEMPLATEFLOW = 'https://templateflow.s3.amazonaws.com/'
FICHIERS = {
    'tpl-MNI152NLin2009cSym/LICENSE': ('WDoHOd8Nxko6s2nbK7BGx0FIjljF7pFT', '5915d16f84d99c3cedc8290b09da72f6f92e5dde1ba1c9859ee186aa952b66a4'),
    'tpl-MNI152NLin2009cSym/tpl-MNI152NLin2009cSym_res-1_T1w.nii.gz': ('UoYMq8MqROIRFhMTSZyuMQK7c6QNJP0h', '317e112c49d086b971e4a26cba853b041ee210faf750a6fe02e04f15909b6b6b'),
    'tpl-MNI152NLin2009cSym/tpl-MNI152NLin2009cSym_res-1_desc-brain_mask.nii.gz': ('kS7exP9h42mykqN8ZxB9sxm76hmQHjiD', '6fdb662663d5c0a32ae88c51ef126a99de82200f29030a84333c5fcf944d7459'),
    'tpl-MNI152NLin2009cSym/tpl-MNI152NLin2009cSym_res-1_atlas-CerebrA_dseg.nii.gz': ('OGmrKS_OSW814m7fZ.vJ0UVeau4B9Kkd', 'c05df93e85b8f1c1446e56f45f0b6a28fdf6e5c8263ea8f365617254bf79ecbf'),
    'tpl-MNI152NLin2009cSym/tpl-MNI152NLin2009cSym_atlas-CerebA_dseg.tsv': ('dDt78_iA572xOXqZR1zZ8qUH6EBbJgd6', 'cf0332a1c2601b5dd97b2f70423b064c762630d02052629f7112789f2fb6d2f7'),
    'tpl-MNI152NLin2009cAsym/LICENSE': ('8slzmzCAqqrxG_31bGyODrxItKQNNsvE', '46e280fe1a24c6f37feef2445ed288435e0ad063504a06030b206b12fdd2629d'),
    'tpl-MNI152NLin2009cAsym/tpl-MNI152NLin2009cAsym_res-01_desc-brain_T1w.nii.gz': ('s5KgUHF7AhdIeQtgdGgff6nFNhPxR_Ip', '97cee2cf7f51388d76d7b3632c8375d688d0fa171e1bede81fcef23726bb3d73'),
    'tpl-MNI152NLin2009cAsym/tpl-MNI152NLin2009cAsym_res-01_desc-brain_mask.nii.gz': ('XQ.H8wamCA.Jsnx6J4qdA.gMJbEXWP7i', 'e40bb1816736504d4c25abc243c1c8503df1d308f64c048318aa4b829e09a7ae'),
    'tpl-MNI152NLin2009cAsym/tpl-MNI152NLin2009cAsym_res-01_atlas-HOCPAL_desc-th25_dseg.nii.gz': ('UbsjWRCttLJ6YM.O6kK1TM9zT9D4NR4Z', 'fdb9f0785e31f8258367cc9586d3698fbb69550dee6fdffc6451efddefe1f250'),
    'tpl-MNI152NLin2009cAsym/tpl-MNI152NLin2009cAsym_res-01_atlas-HOSPA_desc-th25_dseg.nii.gz': ('BLbNjem.DPC91Y51BCnNorphUIjJVFJ9', '294160208c98f93a8e1cf282282df4e9bae7979cb846a49d91335a7ee09fe7ee'),
    'tpl-MNI152NLin6Asym/tpl-MNI152NLin6Asym_atlas-HOCPAL_dseg.tsv': ('vDk5LOfL7RF9I3oldX5MAc0CzHOWaJ7L', '91ed5531f39472fa3e39f4f70766b6cf8ad0e22259796a95a92924616c974583'),
    'tpl-MNI152NLin6Asym/tpl-MNI152NLin6Asym_atlas-HOSPA_dseg.tsv': ('bH4L2f178B0BO7CwRiwyCVoHfIUbGTZK', '0503599182be67d206deb8b6c6d3288fa9eecba3e1a158008c649d1836573d25'),
}
# templates recalés : nom → (T1 du cerveau ou T1 entier, masque du cerveau, atlas portés)
SYM, ASYM = 'tpl-MNI152NLin2009cSym', 'tpl-MNI152NLin2009cAsym'
TEMPLATES = {
    'sym': (SYM + '_res-1_T1w.nii.gz', SYM + '_res-1_desc-brain_mask.nii.gz',
            {'cerebra': SYM + '_res-1_atlas-CerebrA_dseg.nii.gz'}),
    'asym': (ASYM + '_res-01_desc-brain_T1w.nii.gz', ASYM + '_res-01_desc-brain_mask.nii.gz',
             {'ho-cortical': ASYM + '_res-01_atlas-HOCPAL_desc-th25_dseg.nii.gz',
              'ho-souscortical': ASYM + '_res-01_atlas-HOSPA_desc-th25_dseg.nii.gz'}),
}


def nom_local(cle):
    return cle.replace('/', '__') if cle.endswith('LICENSE') else os.path.basename(cle)


def references():
    os.makedirs(REFERENCES, exist_ok=True)
    for cle, (version, empreinte) in FICHIERS.items():
        chemin = os.path.join(REFERENCES, nom_local(cle))
        if not os.path.exists(chemin):
            url = TEMPLATEFLOW + cle + '?versionId=' + version
            print('téléchargement :', url)
            with urllib.request.urlopen(url) as r, open(chemin + '.tmp', 'wb') as f:
                shutil.copyfileobj(r, f)
            os.replace(chemin + '.tmp', chemin)
        h = hashlib.sha256(open(chemin, 'rb').read()).hexdigest()
        if h != empreinte:
            sys.exit(f'empreinte inattendue pour {cle} : {h}')
    print(len(FICHIERS), 'fichiers de référence vérifiés')


def lire(chemin):
    img = nib.load(chemin)
    return np.asanyarray(img.dataobj), img.affine


def transformations(nom):
    return [os.path.join(CACHE, f'{nom}-vers-sujet-1Warp.nii.gz'), os.path.join(CACHE, f'{nom}-vers-sujet-affine.mat')]


def recalage():
    """Recale chaque template sur le sujet et reporte ses atlas sur la grille de 0,7 mm du sujet."""
    references()
    os.makedirs(CACHE, exist_ok=True)
    t1, a = lire(os.path.join(etape2.SORTIE, 't1.nii.gz'))
    cerveau = lire(os.path.join(ETAPE3, 'cerveau.nii.gz'))[0] > 0
    grille = etape2.vers_ants(np.asarray(t1, np.float32), a)
    fixe = ants.resample_image(etape2.vers_ants(np.asarray(t1, np.float32) * cerveau, a), (1.0, 1.0, 1.0),
                               use_voxels=False, interp_type=0)
    bilan = {}
    for nom, (f_t1, f_masque, atlas) in TEMPLATES.items():
        t, at = lire(os.path.join(REFERENCES, f_t1))
        m = lire(os.path.join(REFERENCES, f_masque))[0] > 0
        mobile = etape2.vers_ants(np.asarray(t, np.float32) * m, at)
        warp, affine = transformations(nom)
        if not os.path.exists(affine):
            r = ants.registration(fixed=fixe, moving=mobile, type_of_transform='Affine', aff_metric='mattes',
                                  initial_transform='Identity')
            shutil.copy(r['fwdtransforms'][0], affine)
        if not os.path.exists(warp):
            r = ants.registration(fixed=fixe, moving=mobile, type_of_transform='SyNOnly', initial_transform=affine,
                                  syn_metric='CC', syn_sampling=4, reg_iterations=(100, 70, 40, 0),
                                  outprefix=os.path.join(CACHE, f'{nom}-vers-sujet-'))
            if r['fwdtransforms'][0] != warp:
                shutil.copy(r['fwdtransforms'][0], warp)
        recale = ants.apply_transforms(fixe, mobile, [warp, affine], interpolator='linear').numpy()
        bilan[nom] = {'correlation_cerveau': round(float(np.corrcoef(recale.ravel(), fixe.numpy().ravel())[0, 1]), 3)}
        for cle, f in atlas.items():
            v, av = lire(os.path.join(REFERENCES, f))
            sur = ants.apply_transforms(grille, etape2.vers_ants(np.asarray(v, np.float32), av), [warp, affine],
                                        interpolator='genericLabel').numpy()
            nib.save(nib.Nifti1Image(np.rint(sur).astype(np.uint8), a), os.path.join(SORTIE, cle + '.nii.gz'))
            bilan[nom][cle] = int(len(np.unique(np.rint(sur))) - 1)
        print(nom, bilan[nom])
    with open(os.path.join(SORTIE, 'recalage.json'), 'w', encoding='utf-8') as f:
        json.dump(bilan, f, ensure_ascii=False, indent=1)


def vers_mni(points_ras, nom='sym'):
    """Coordonnées MNI (RAS, mm) de points du sujet (RAS, mm) par la transformation du recalage : les listes de
    transformations d'ANTs déplacent les points dans le sens inverse des images (sujet → template)."""
    import pandas as pd
    p = np.asarray(points_ras, float).reshape(-1, 3)
    df = pd.DataFrame({'x': -p[:, 0], 'y': -p[:, 1], 'z': p[:, 2]})            # RAS → LPS (ITK)
    q = ants.apply_transforms_to_points(3, df, transformations(nom))
    return np.c_[-q['x'].to_numpy(), -q['y'].to_numpy(), q['z'].to_numpy()]


if __name__ == '__main__':
    os.makedirs(SORTIE, exist_ok=True)
    parties = sys.argv[1:] or ['references', 'recalage']
    for p in parties:
        {'references': references, 'recalage': recalage}[p]()
