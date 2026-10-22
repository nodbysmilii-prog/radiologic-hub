"""Construit la version de partage du cours d'échographie du coude : la page seule,
sans aucun lien vers le reste du site, et uniquement les fichiers dont elle a besoin.
Publiée sur la branche orpheline « partage/echographie-coude » (lien à envoyer :
https://rawcdn.githack.com/nodbysmilii-prog/radiologic-hub/<commit>/cours/coude-3d.html).
Usage : python3 -I scripts/partager_cours_coude.py . <dossier de sortie>
  (par exemple dans un « git worktree » de la branche de partage, puis commit et push)"""
import os, re, shutil, sys

depot, sortie = sys.argv[1:3]
page = open(os.path.join(depot, 'cours/coude-3d.html'), encoding='utf-8').read()

def retirer(motif, n, texte, remplacement='', flags=re.S):
    nouveau, k = re.subn(motif, remplacement, texte, flags=flags)
    assert k == n, (motif, k, n)
    return nouveau

# En-tête : le logo n'est plus un lien, plus de menu
page = retirer(r'<a href="\.\./index\.html" class="brand" aria-label="RadiologicHub — accueil">(.*?)</a>', 1, page,
               r'<span class="brand" aria-label="RadiologicHub">\1</span>')
page = retirer(r'\s*<nav class="main-nav" id="main-nav".*?</nav>', 1, page)
page = retirer(r'\s*<button class="nav-toggle".*?</button>', 1, page)
# Fil d'Ariane (Fiches rapides › Ostéo-articulaire)
page = retirer(r'\s*<nav class="crumbs".*?</nav>', 1, page)
# Liens vers l'éditeur des comptes rendus (absent de la version de partage)
page = retirer(r'\s*<p class="v3d-aide">Ces quatre modèles sont aussi dans l\'<a href="\.\./comptes-rendus\.html">.*?</p>', 1, page)
page = retirer(r'<a class="btn btn-outline btn-sm" href="\.\./comptes-rendus\.html#modele=[a-z-]+">Ouvrir dans l\'éditeur</a>', 4, page)
# Pied de page : logo sans lien, plus de liens vers les autres pages
page = retirer(r'<a href="\.\./index\.html" class="brand">(.*?)</a>', 1, page, r'<span class="brand">\1</span>')
page = retirer(r'\s*<nav aria-label="Liens de pied de page">.*?</nav>', 1, page)

# Plus aucun lien vers une autre page du site
liens = re.findall(r'href="(?!#|https://)([^"]*)"', page)
assert all(l.startswith(('../styles.css', '../fiche.css', 'cours.css', '../assets/emblem', '../public/models/coude/LICENSE')) for l in liens), liens

# Fichiers nécessaires
fichiers = ['styles.css', 'fiche.css', 'fiche.js', 'assets/emblem.svg', 'assets/emblem-light.svg',
            'cours/cours.css', 'cours/coude-3d.js', 'cours/coude-fiche.js', 'cours/visionneuse.js']
fichiers += ['vendor/three-0.170.0/' + f for f in ['LICENSE', 'three.module.min.js', 'addons/libs/meshopt_decoder.module.js',
             'addons/controls/OrbitControls.js', 'addons/loaders/GLTFLoader.js', 'addons/utils/BufferGeometryUtils.js']]
fichiers += ['public/models/coude/' + f for f in sorted(os.listdir(os.path.join(depot, 'public/models/coude')))]
images = sorted(set(re.findall(r'src="(coude/images/[^"]+)"', page)))
fichiers += ['cours/' + i for i in images]
for f in fichiers:
    os.makedirs(os.path.dirname(os.path.join(sortie, f)), exist_ok=True)
    shutil.copy2(os.path.join(depot, f), os.path.join(sortie, f))
open(os.path.join(sortie, 'cours/coude-3d.html'), 'w', encoding='utf-8').write(page)

# Racine : renvoie vers le cours
open(os.path.join(sortie, 'index.html'), 'w', encoding='utf-8').write('''<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex">
  <meta http-equiv="refresh" content="0; url=cours/coude-3d.html">
  <title>Échographie du coude et du nerf ulnaire — RadiologicHub</title>
</head>
<body>
  <p><a href="cours/coude-3d.html">Échographie du coude et du nerf ulnaire</a></p>
</body>
</html>
''')
open(os.path.join(sortie, 'README.md'), 'w', encoding='utf-8').write('''# RadiologicHub — cours partagé : échographie du coude et du nerf ulnaire

Version de partage du seul cours `cours/coude-3d.html` (le coude en 3D et la fiche
« Échographie du nerf ulnaire : coude et canal de Guyon »), sans le reste du site.
Branche générée à partir de la branche de travail ; ne pas y développer.

Licences : modèle 3D `public/models/coude/LICENSE` (Z-Anatomy, CC BY-SA 4.0),
three.js `vendor/three-0.170.0/LICENSE` (MIT).
''')
print(len(fichiers) + 3, 'fichiers ;', len(images), 'images')
