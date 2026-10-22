"""Espace radioanatomie, module « IRM du genou » : assemble l'atlas affiché par radioanatomie/atlas-coupes.js.

Entrées (radioanatomie/donnees/genou-irm/) :
  • series.json (écrit par preparer_genou.py) : séries, dimensions, nombre de coupes ;
  • nomenclature.json : catégories (nom, couleur) et structures (nom français, catégorie) ;
  • reperes-source/<série>.json : repères posés à la main sur des coupes clés (« kf » : coupe → [x, y] en pixels
    de l'image) ; entre deux coupes clés, position interpolée linéairement ; hors de la première et de la
    dernière coupe clé, la structure n'est pas légendée.
Sortie : atlas.json (une liste de repères [id, x, y] par coupe et par série).

Usage : python3 -I scripts/radioanatomie/construire_atlas_genou.py   (depuis la racine du dépôt)
"""
import json, os, sys

RACINE = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
D = os.path.join(RACINE, 'radioanatomie', 'donnees', 'genou-irm')

ORIENTATION = {   # lettres affichées aux bords de l'image (haut, bas, gauche, droite)
    ('sagittal', 'gauche'): ['S', 'I', 'A', 'P'], ('sagittal', 'droit'): ['S', 'I', 'A', 'P'],
    ('coronal', 'droit'): ['S', 'I', 'Lat', 'Méd'], ('coronal', 'gauche'): ['S', 'I', 'Méd', 'Lat'],
    ('axial', 'droit'): ['A', 'P', 'Lat', 'Méd'], ('axial', 'gauche'): ['A', 'P', 'Méd', 'Lat'],
}


def position(kf, k):
    cles = sorted((int(c), p) for c, p in kf.items())
    if k < cles[0][0] or k > cles[-1][0]: return None
    for (c0, p0), (c1, p1) in zip(cles, cles[1:] + [cles[-1]]):
        if c0 <= k <= c1:
            t = 0 if c1 == c0 else (k - c0) / (c1 - c0)
            return [round(p0[0] + t * (p1[0] - p0[0])), round(p0[1] + t * (p1[1] - p0[1]))]


def main():
    series = json.load(open(os.path.join(D, 'series.json'), encoding='utf-8'))
    N = json.load(open(os.path.join(D, 'nomenclature.json'), encoding='utf-8'))
    cats = {c['id'] for c in N['categories']}
    erreurs, utilisees, sortie = [], set(), []
    for S in series:
        R = json.load(open(os.path.join(D, 'reperes-source', S['id'] + '.json'), encoding='utf-8'))
        coupes = [[] for _ in range(S['coupes'])]
        vus = set()
        for st in R['structures']:
            sid = st['id']
            if sid in vus: erreurs.append(f"{S['id']} : {sid} en double")
            vus.add(sid)
            if sid not in N['structures']: erreurs.append(f"{S['id']} : structure inconnue {sid}"); continue
            if N['structures'][sid][1] not in cats: erreurs.append(f'{sid} : catégorie inconnue')
            utilisees.add(sid)
            for c, p in st['kf'].items():
                if not (0 <= int(c) < S['coupes']): erreurs.append(f"{S['id']} : {sid} coupe {c} hors série")
                if not (0 <= p[0] < S['largeur'] and 0 <= p[1] < S['hauteur']): erreurs.append(f"{S['id']} : {sid} {p} hors image")
            for k in range(S['coupes']):
                p = position(st['kf'], k)
                if p: coupes[k].append([sid, *p])
        sortie.append(dict(
            id=S['id'], nom=S['nom'], plan=S['plan'], ponderation=S['ponderation'], description=S['description'],
            cote=S['cote'], largeur=S['largeur'], hauteur=S['hauteur'], pixel_mm=S['pixel_mm'],
            epaisseur_mm=S['epaisseur_mm'], coupes=S['coupes'], dossier=f"donnees/genou-irm/{S['id']}/",
            orientation=ORIENTATION[(S['plan'], S['cote'])], reperes=coupes))
    if erreurs: sys.exit('\n'.join(erreurs))
    atlas = dict(
        titre='IRM du genou',
        source=('TotalSegmentator MRI dataset v3.0.0 (Wasserthal J. et al., Hôpital universitaire de Bâle ; '
                'Zenodo, doi:10.5281/zenodo.22688334), licence CC BY 4.0'),
        categories=N['categories'],
        structures={k: dict(nom=v[0], cat=v[1]) for k, v in N['structures'].items() if k in utilisees},
        series=sortie)
    json.dump(atlas, open(os.path.join(D, 'atlas.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    for S in sortie:
        n = [len(c) for c in S['reperes']]
        print(S['id'], f"{S['coupes']} coupes, {sum(1 for x in n if x)} légendées, jusqu'à {max(n)} repères par coupe")
    print(len(atlas['structures']), 'structures')


if __name__ == '__main__':
    main()
