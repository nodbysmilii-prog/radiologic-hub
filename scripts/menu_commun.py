"""Menu principal et pied de page communs : les écrit à l'identique dans toutes les pages du site.

Même ordre, mêmes intitulés et mêmes comportements partout (consigne de l'auteur) :
  • menu : les rubriques de la plateforme (Comptes rendus, Fiches rapides, Radioanatomie, Bibliothèque,
    Communauté, Remplacements), puis « Masterclass », séparée et dessinée à part pour ne pas confondre la
    plateforme avec l'inscription à une formation ; la rubrique de la page est marquée « is-current »
    (navigation.js ajoute aria-current="page") ;
  • pied de page : les mêmes rubriques classées en quatre colonnes, puis mentions légales et contact ;
  • navigation.js (menu mobile, rubrique active) chargé sur chaque page.
Sur l'accueil, les liens vers ses propres sections sont de simples ancres (#masterclass, #tarifs…).
Les pages des cas cliniques (cas/*.html) reprennent l'en-tête et le pied de cas/schwannome-v3.html :
scripts/cas/construire_cas.py les régénère à l'identique.

Usage : python3 -I scripts/menu_commun.py             (écrit les pages)
        python3 -I scripts/menu_commun.py --verifier  (contrôle seulement ; code 1 si une page diffère)
"""
import os, re, sys

RACINE = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
V_NAVIGATION = '20261022235000'
IGNORES = {'node_modules', 'vendor', '.git', 'assets-sources', 'public'}

# (clé, adresse depuis la racine, intitulé)
RUBRIQUES = [
    ('comptes-rendus', 'comptes-rendus.html', 'Comptes rendus'),
    ('fiches-rapides', 'fiches-rapides.html', 'Fiches rapides'),
    ('radioanatomie', 'radioanatomie/index.html', 'Radioanatomie'),
    ('bibliotheque', 'bibliotheque.html', 'Bibliothèque'),
    ('communaute', 'communaute.html', 'Communauté'),
    ('remplacements', 'remplacements.html', 'Remplacements'),
]

# Rubrique active selon l'emplacement de la page
COURANTE = [
    (r'^(comptes-rendus|suivi-oncologique)\.html$|^outils/', 'comptes-rendus'),
    (r'^fiches-rapides\.html$|^fiches/|^cours/', 'fiches-rapides'),
    (r'^radioanatomie/', 'radioanatomie'),
    (r'^bibliotheque(-admin)?\.html$', 'bibliotheque'),
    (r'^communaute\.html$', 'communaute'),
    (r'^remplacements(-reponse)?\.html$', 'remplacements'),
]

PIED = [
    ('Au quotidien', [('comptes-rendus.html', 'Comptes rendus'), ('suivi-oncologique.html', 'Suivi oncologique'),
                      ('fiches-rapides.html', 'Fiches rapides')]),
    ('Apprendre', [('radioanatomie/index.html', 'Radioanatomie'), ('cas/index.html', 'Cas cliniques'),
                   ('index.html#cas-du-jour', 'Cas du jour'), ('bibliotheque.html', 'Bibliothèque')]),
    ('Réseau', [('communaute.html', 'Communauté'), ('remplacements.html', 'Remplacements')]),
    ('Masterclass', [('index.html#masterclass', 'Programme'), ('index.html#tarifs', 'Tarifs'),
                     ('index.html#inscription', 'S\'inscrire à une masterclass')]),
]


def pages():
    for d, dossiers, fichiers in os.walk(RACINE):
        dossiers[:] = sorted(x for x in dossiers if x not in IGNORES)
        for f in sorted(fichiers):
            if f.endswith('.html'):
                yield os.path.relpath(os.path.join(d, f), RACINE).replace(os.sep, '/')


def adresse(chemin, cible):
    """Lien depuis la page « chemin » vers « cible » (adresse depuis la racine) ; ancres simples sur l'accueil."""
    if chemin == 'index.html' and cible.startswith('index.html#'):
        return cible[len('index.html'):]
    return '../' * chemin.count('/') + cible


def menu(chemin):
    courante = next((cle for motif, cle in COURANTE if re.search(motif, chemin)), None)
    lignes = ['<nav class="main-nav" id="main-nav" aria-label="Navigation principale">']
    for cle, cible, nom in RUBRIQUES:
        actif = ' class="is-current"' if cle == courante else ''
        lignes.append(f'        <a href="{adresse(chemin, cible)}"{actif}>{nom}</a>')
    lignes.append(f'        <a href="{adresse(chemin, "index.html#masterclass")}" class="nav-masterclass">Masterclass</a>')
    lignes.append('      </nav>')
    return '\n'.join(lignes)


def pied(chemin):
    p = '../' * chemin.count('/')
    accueil = '#top' if chemin == 'index.html' else p + 'index.html'
    l = ['<footer class="site-footer">',
         '    <div class="container footer-inner">',
         '      <div class="footer-brand">',
         f'        <a href="{accueil}" class="brand">',
         f'          <img src="{p}assets/emblem-light.svg" alt="" class="brand-mark" width="44" height="40">',
         '          <span class="brand-name">Radiologic<br>Hub</span>',
         '        </a>',
         '        <p class="footer-tagline">Outils, ressources et formation pour les radiologues et les résidents.</p>',
         '      </div>',
         '      <nav aria-label="Liens de pied de page">']
    for titre, liens in PIED:
        l.append('        <div class="footer-col">')
        l.append(f'          <p class="footer-titre">{titre}</p>')
        for cible, nom in liens:
            l.append(f'          <a href="{adresse(chemin, cible)}">{nom}</a>')
        l.append('        </div>')
    l += ['      </nav>',
          f'      <p class="copyright"><span>© <span id="year"></span> RadiologicHub · Outils, ressources et formation en radiologie</span>'
          f'<span class="copyright-liens"><a href="{p}mentions-legales.html">Mentions légales</a>'
          f'<a href="{adresse(chemin, "index.html#inscription")}">Contact</a></span></p>',
          '    </div>',
          '  </footer>']
    return '\n'.join(l)


def script(chemin, html):
    """Ajoute (ou met à jour) navigation.js juste avant le premier script de la page."""
    balise = f'<script src="{"../" * chemin.count("/")}navigation.js?v={V_NAVIGATION}"></script>'
    if re.search(r'<script src="[^"]*navigation\.js\?v=\d+"></script>', html):
        return re.sub(r'<script src="[^"]*navigation\.js\?v=\d+"></script>', balise, html)
    m = re.search(r'\n(\s*)<script src="[^"]*(?:fiche|script)\.js\?v=', html) or re.search(r'\n(\s*)</body>', html)
    return html[:m.start()] + f'\n{m.group(1)}{balise}' + html[m.start():]


def transformer(chemin, html):
    html, n = re.subn(r'<nav class="main-nav[^"]*" id="main-nav"[^>]*>.*?</nav>', lambda m: menu(chemin), html, count=1, flags=re.S)
    if not n:
        return None
    html = re.sub(r'<footer class="site-footer">.*?</footer>', lambda m: pied(chemin), html, count=1, flags=re.S)
    return script(chemin, html)


def main():
    verifier = '--verifier' in sys.argv
    differences, total = [], 0
    for chemin in pages():
        f = os.path.join(RACINE, chemin)
        with open(f, encoding='utf-8') as fh:
            avant = fh.read()
        apres = transformer(chemin, avant)
        if apres is None:
            continue
        total += 1
        if apres != avant:
            differences.append(chemin)
            if not verifier:
                with open(f, 'w', encoding='utf-8') as fh:
                    fh.write(apres)
    if verifier:
        if differences:
            sys.exit('menu ou pied de page à régénérer : ' + ', '.join(differences))
        print(f'{total} pages : menu et pied de page à jour')
    else:
        print(f'{total} pages, {len(differences)} modifiée(s)')


if __name__ == '__main__':
    main()
