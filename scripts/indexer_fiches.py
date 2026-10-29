#!/usr/bin/env python3
"""RadiologicHub — index des fiches rapides pour l'assistant documentaire des comptes rendus.

Lit les fiches réellement publiées (cartes « a.fiche-card » de fiches-rapides.html qui pointent
vers fiches/*.html) et écrit assistant/index-fiches.js :
  window.RHIndexFiches = { genere, fiches: [ { id, url, titre, spe, sections: [
      { id, titre, rubriques: [ { titre, badge, ancre, blocs: [texte, …] } ] } ] } ] }

• Seul le contenu des « section.fsec[id] » est lu : ni en-tête, ni menu, ni pied de page,
  ni scripts, styles, SVG, boutons, formulaires, visionneuses 3D, outils interactifs, barres d'outils,
  crédits d'images ; la section « Testez-vous » est ignorée.
• Les textes sont recopiés tels quels (espaces normalisés) : aucun extrait n'est inventé ;
  un bloc trop long est coupé et se termine par « … ».
• Les fiches ne sont pas modifiées. Bibliothèque standard uniquement.

Régénérer :  python3 scripts/indexer_fiches.py          (écrit le fichier)
Vérifier   :  python3 scripts/indexer_fiches.py --verifier  (échoue si l'index n'est pas à jour)
"""
import json
import os
import re
import sys
from html.parser import HTMLParser

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SORTIE = os.path.join(RACINE, 'assistant', 'index-fiches.js')

BLOCS = {'div', 'p', 'li', 'dt', 'dd', 'td', 'th', 'figcaption', 'blockquote', 'caption'}
TITRES = {'h3', 'h4', 'summary'}
IGNORES = {'script', 'style', 'svg', 'button', 'nav', 'header', 'footer', 'form', 'select',
           'option', 'textarea', 'input', 'noscript', 'template', 'canvas', 'label'}
GROUPES = {'article', 'details'}
VIDES = {'br', 'img', 'hr', 'input', 'meta', 'link', 'source', 'wbr', 'col', 'area', 'base', 'embed', 'track', 'param'}
WIDGETS = {'toolbar', 'tablist', 'radiogroup', 'menu', 'menubar'}   # commandes des visionneuses et outils
SECTIONS_EXCLUES = re.compile(r'testez|quiz', re.I)
MAX_BLOC = 420
MAX_BLOCS_RUBRIQUE = 12


def propre(t):
    return re.sub(r'\s+', ' ', t.replace('\xad', '')).strip()


def couper(t):
    if len(t) <= MAX_BLOC:
        return t
    c = t[:MAX_BLOC]
    i = max(c.rfind('. '), c.rfind(' ; '))
    c = c[:i + 1] if i > MAX_BLOC * 0.5 else c[:c.rfind(' ')]
    return c.rstrip(' ;,') + ' …'


class Fiche(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.h1 = []
        self.dans_h1 = 0
        self.title = []
        self.dans_title = False
        self.pile = []          # (tag, classes, id, sortie_section, groupe)
        self.ignore = 0
        self.sections = []
        self.sec = None
        self.dans_h2 = False
        self.h2 = []
        self.fnum = 0
        self.tampon = []
        self.titre_rub = None   # texte en cours de titre (h3/h4/summary)
        self.badge = None       # texte en cours d'un badge
        self.badge_attente = ''
        self.groupes = []       # pile des rubriques sauvegardées à l'entrée d'un groupe

    # --- rubriques ---
    def rub(self):
        return self.sec['rubriques'][-1]

    def nouvelle_rub(self, titre='', badge='', ancre=None):
        r = {'titre': titre, 'badge': badge, 'ancre': ancre or self.ancre(), 'blocs': []}
        self.sec['rubriques'].append(r)

    def ancre(self):
        for tag, cls, i, *_ in reversed(self.pile):
            if i:
                return i
        return self.sec['id'] if self.sec else None

    def vider(self):
        if not self.sec:
            self.tampon = []
            return
        t = propre(''.join(self.tampon))
        self.tampon = []
        if len(t) < 3 or '©' in t:      # crédits d'images
            return
        r = self.rub()
        if len(r['blocs']) < MAX_BLOCS_RUBRIQUE and t not in r['blocs']:
            r['blocs'].append(couper(t))

    # --- analyse ---
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        cls = a.get('class', '') or ''
        if tag == 'title':
            self.dans_title = True
        if tag == 'h1':
            self.dans_h1 += 1
        if tag in VIDES:
            if tag == 'br' and self.sec and not self.ignore:
                self.tampon.append(' ')
            return
        ent_sec = tag == 'section' and 'fsec' in cls.split() and a.get('id')
        if ent_sec and not self.ignore:
            self.vider()
            self.sec = {'id': a['id'], 'titre': '', 'rubriques': []}
            self.sections.append(self.sec)
            self.nouvelle_rub(ancre=a['id'])
        ign = (tag in IGNORES or 'hidden' in a or a.get('aria-hidden') == 'true' or 'visually-hidden' in cls
               or a.get('role') in WIDGETS or re.search(r'(^|\s)[\w-]*(3d|outil)(\s|$)', cls))
        if ign:
            self.ignore += 1
        grp = bool(self.sec) and not self.ignore and (tag in GROUPES or re.search(r'\b(tile|fcard)\b', cls))
        # étiquette en tête de titre (« <summary><span>Rappel</span>… ») = badge
        bdg = bool(self.sec) and not self.ignore and self.badge is None and (
            'badge' in cls or (tag == 'span' and self.titre_rub is not None and not propre(''.join(self.titre_rub))))
        self.pile.append((tag, cls, a.get('id'), ent_sec, ign, grp, bdg))
        if self.ignore or not self.sec:
            return
        if tag == 'h2' and 'fsec-title' in cls:
            self.dans_h2 = True
            self.h2 = []
        elif 'fnum' in cls.split():
            self.fnum += 1
        elif bdg:
            if self.titre_rub is None:
                self.vider()
            self.badge = []
        elif grp:
            self.vider()
            self.groupes.append(True)
            self.nouvelle_rub()
        elif tag in TITRES:
            self.vider()
            self.titre_rub = []
        elif tag in BLOCS:
            self.vider()
        elif tag == 'span' and cls and self.tampon and not self.tampon[-1][-1:].isspace():
            self.tampon.append(' ')   # étiquettes juxtaposées (« <span>A</span><span>B</span> »)

    def handle_endtag(self, tag):
        if tag == 'title':
            self.dans_title = False
        if tag == 'h1':
            self.dans_h1 = max(0, self.dans_h1 - 1)
        if tag in VIDES:
            return
        # dépile jusqu'à la balise correspondante (HTML tolérant)
        idx = None
        for k in range(len(self.pile) - 1, -1, -1):
            if self.pile[k][0] == tag:
                idx = k
                break
        if idx is None:
            return
        while len(self.pile) > idx:
            t, cls, i, ent_sec, ign, grp, bdg = self.pile.pop()
            self.fermer(t, cls, ent_sec, ign, grp, bdg)

    def fermer(self, tag, cls, ent_sec, ign, grp, bdg):
        if ign:
            self.ignore -= 1
            return
        if self.ignore or not self.sec:
            return
        if tag == 'h2' and self.dans_h2:
            self.dans_h2 = False
            self.sec['titre'] = propre(''.join(self.h2))
        elif 'fnum' in cls.split():
            self.fnum -= 1
        elif bdg and self.badge is not None:
            self.badge_attente = propre(''.join(self.badge))
            self.badge = None
        elif self.titre_rub is not None and tag in TITRES:
            t = propre(''.join(self.titre_rub))
            self.titre_rub = None
            r = self.rub()
            if r['blocs'] or (r['titre'] and not grp):
                self.nouvelle_rub()
                r = self.rub()
            r['titre'] = t
            r['badge'] = self.badge_attente
            self.badge_attente = ''
        elif grp:
            self.vider()
            if self.groupes:
                self.groupes.pop()
            self.nouvelle_rub()
        elif tag in BLOCS:
            self.vider()
        if ent_sec:
            self.vider()
            self.sec = None

    def handle_data(self, d):
        if self.dans_title:
            self.title.append(d)
        if self.dans_h1 and not self.ignore:
            self.h1.append(d)
        if self.ignore or not self.sec:
            return
        if self.dans_h2:
            if not self.fnum:
                self.h2.append(d)
        elif self.badge is not None:
            self.badge.append(d)
        elif self.titre_rub is not None:
            self.titre_rub.append(d)
        else:
            self.tampon.append(d)


def cartes():
    """Cartes de fiches-rapides.html : [(url, spécialité)] dans l'ordre de la page."""
    html = open(os.path.join(RACINE, 'fiches-rapides.html'), encoding='utf-8').read()
    out = []
    for m in re.finditer(r'<a\b[^>]*class="[^"]*\bfiche-card\b[^"]*"[^>]*>', html):
        b = m.group(0)
        h = re.search(r'href="([^"]+)"', b)
        s = re.search(r'data-spe="([^"]*)"', b)
        if h and re.match(r'^fiches/[\w-]+\.html$', h.group(1)):
            out.append((h.group(1), s.group(1) if s else ''))
    return out


def indexer():
    fiches = []
    for url, spe in cartes():
        chemin = os.path.join(RACINE, url)
        if not os.path.exists(chemin):
            continue
        p = Fiche()
        p.feed(open(chemin, encoding='utf-8').read())
        p.close()
        titre = propre(''.join(p.h1)) or propre(''.join(p.title)).split(' — ')[0]
        sections = []
        for s in p.sections:
            if SECTIONS_EXCLUES.search(s['id']) or SECTIONS_EXCLUES.search(s['titre']):
                continue
            rubs = [r for r in s['rubriques'] if r['blocs']]
            if rubs:
                sections.append({'id': s['id'], 'titre': s['titre'], 'rubriques': rubs})
        fiches.append({'id': os.path.basename(url)[:-5], 'url': url, 'titre': titre, 'spe': spe, 'sections': sections})
    return fiches


def contenu():
    fiches = indexer()
    corps = json.dumps({'fiches': fiches}, ensure_ascii=False, separators=(',', ':'))
    return ('/* Généré par scripts/indexer_fiches.py — ne pas modifier à la main.\n'
            '   Index des fiches rapides (textes recopiés des fiches) pour l\'assistant documentaire. */\n'
            '(function (r, d) { r.RHIndexFiches = d; if (typeof module === \'object\' && module.exports) module.exports = d; })(typeof self !== \'undefined\' ? self : this, ' + corps + ');\n'), fiches


def main():
    texte, fiches = contenu()
    if '--verifier' in sys.argv:
        actuel = open(SORTIE, encoding='utf-8').read() if os.path.exists(SORTIE) else ''
        if actuel != texte:
            print('assistant/index-fiches.js n\'est pas à jour : python3 scripts/indexer_fiches.py')
            sys.exit(1)
        print(f'Index à jour : {len(fiches)} fiches.')
        return
    os.makedirs(os.path.dirname(SORTIE), exist_ok=True)
    open(SORTIE, 'w', encoding='utf-8').write(texte)
    n = sum(len(f['sections']) for f in fiches)
    print(f'{len(fiches)} fiches, {n} sections → {os.path.relpath(SORTIE, RACINE)} ({len(texte.encode()) // 1024} Ko)')


if __name__ == '__main__':
    main()
