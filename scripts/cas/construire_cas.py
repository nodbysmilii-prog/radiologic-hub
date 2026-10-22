"""Cas cliniques bilingues (français / anglais) : génère les pages du site à partir de cas/donnees/*.json.

  cas/<id>.html   une page par cas : le cas, les images, « À vous de jouer » (réponse cachée), puis la
                  sémiologie ; chaque texte existe en français et en anglais (classes t-fr / t-en), la
                  bascule FR / EN se fait en un clic (cas/cas.js) ;
  cas/index.html  la liste des cas cliniques (cartes), d'après cas/donnees/index.json.

En-tête, menu, pied de page et fenêtre d'agrandissement sont repris de cas/schwannome-v3.html (page de
référence des cas, tenue à jour avec le reste du site), ainsi que les numéros ?v= de styles.css,
fiche.css et fiche.js. Les feuilles et scripts propres aux cas reçoivent l'empreinte de leur contenu.

Usage : python3 -I scripts/cas/construire_cas.py            (écrit les pages)
        python3 -I scripts/cas/construire_cas.py --verifier (code 1 si une page n'est pas à jour)
"""
import hashlib, html, json, os, re, sys

RACINE = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
CAS = os.path.join(RACINE, 'cas')
DONNEES = os.path.join(CAS, 'donnees')
REFERENCE = os.path.join(CAS, 'schwannome-v3.html')

K = [  # code couleur des fiches : classe, français, anglais
    ('tech', 'Technique / anatomie', 'Technique / anatomy'),
    ('signo', 'Signe clinique ou radiologique', 'Clinical or imaging sign'),
    ('sign', 'Signe discriminant / typique', 'Key / typical finding'),
    ('grave', 'Gravité / drapeau rouge', 'Severity / red flag'),
    ('ddx', 'Piège / diagnostic différentiel', 'Pitfall / differential diagnosis'),
    ('key', 'À retenir', 'Key point'),
]


def lire(chemin):
    with open(chemin, encoding='utf-8') as f:
        return f.read()


def empreinte(chemin):
    return hashlib.sha256(open(chemin, 'rb').read()).hexdigest()[:10]


def attr(s):
    return html.escape(re.sub(r'<[^>]+>', '', s), quote=True)


def insecables(fr):
    """Typographie française : espace insécable avant ? ! : ; (le signe ne passe jamais seul à la ligne)."""
    return re.sub(r' ([?!:;])', '\u00a0\\1', fr)


def t(d, tag='span', cls='', extra=''):
    """Texte bilingue : un élément par langue (le français d'abord). Texte identique : un seul élément."""
    if d is None:
        return ''
    if isinstance(d, str):
        d = {'fr': d, 'en': d}
    fr, en = insecables(d['fr']), d['en']
    if fr == en:
        return f'<{tag} class="{cls}"{extra}>{fr}</{tag}>' if (cls or tag != 'span' or extra) else fr
    c = f'{cls} ' if cls else ''
    return f'<{tag} class="{c}t-fr"{extra}>{fr}</{tag}><{tag} class="{c}t-en" lang="en"{extra}>{en}</{tag}>'


def paragraphes(d, cls=''):
    """Plusieurs paragraphes (séparés par </p><p> dans le JSON) : tous les français, puis tous les anglais."""
    c = f'{cls} ' if cls else ''
    fr = ''.join(f'<p class="{c}t-fr">{p}</p>' for p in insecables(d['fr']).split('</p><p>'))
    en = ''.join(f'<p class="{c}t-en" lang="en">{p}</p>' for p in d['en'].split('</p><p>'))
    return fr + en


def aria(fr, en):
    return f' aria-label="{attr(fr)}" data-en-aria-label="{attr(en)}"'


# ---------- Éléments repris de la page de référence ----------
REF = lire(REFERENCE)


def morceau(motif):
    m = re.search(motif, REF, re.S)
    if not m:
        sys.exit(f'élément introuvable dans {REFERENCE} : {motif}')
    return m.group(0)


ENTETE = morceau(r'  <header class="site-header[\s\S]*?</header>')
PIED = morceau(r'  <footer class="site-footer"[\s\S]*?</footer>')
POLICES = morceau(r'  <link rel="preconnect" href="https://fonts.googleapis.com">[\s\S]*?rel="stylesheet">')
V_STYLES = morceau(r'styles\.css\?v=\d+')
V_FICHE_CSS = morceau(r'fiche\.css\?v=\d+')
V_FICHE_JS = morceau(r'fiche\.js\?v=\d+')


def versions():
    return dict(cas_css=empreinte(os.path.join(CAS, 'cas.css')), cas_js=empreinte(os.path.join(CAS, 'cas.js')),
                cours_css=empreinte(os.path.join(RACINE, 'cours', 'cours.css')),
                patte_js=empreinte(os.path.join(CAS, 'patte-oie-3d.js')))


def tete(titre, titre_en, description, v, avec_3d=False):
    lignes = [
        '<!doctype html>',
        f'<html lang="fr" data-langue="fr" data-titre-en="{attr(titre_en)}">',
        '<head>',
        '  <meta charset="utf-8">',
        '  <meta name="viewport" content="width=device-width, initial-scale=1">',
        f'  <title>{html.escape(titre)}</title>',
        f'  <meta name="description" content="{attr(description)}">',
        '  <link rel="icon" type="image/svg+xml" href="../assets/emblem.svg">',
        POLICES,
        f'  <link rel="stylesheet" href="../{V_STYLES}">',
        f'  <link rel="stylesheet" href="../{V_FICHE_CSS}">',
    ]
    if avec_3d:
        lignes.append(f'  <link rel="stylesheet" href="../cours/cours.css?v={v["cours_css"]}">')
    lignes.append(f'  <link rel="stylesheet" href="cas.css?v={v["cas_css"]}">')
    if avec_3d:
        lignes.append('  <script type="importmap">{ "imports": { "three": "../vendor/three-0.170.0/three.module.min.js", '
                      '"three/addons/": "../vendor/three-0.170.0/addons/" } }</script>')
    lignes += ['</head>', '<body class="fiche-page cas-page">', '',
               '  <div class="read-progress" aria-hidden="true"><span></span></div>', '', ENTETE, '']
    return '\n'.join(lignes)


def bascule(flottante=False):
    cls = 'cas-langue cas-langue-flottante' if flottante else 'cas-langue'
    return (f'<div class="{cls}" role="group"{aria("Langue du cas", "Case language")}>'
            '<button type="button" data-langue="fr" lang="fr" aria-pressed="true" title="Lire en français">FR</button>'
            '<button type="button" data-langue="en" lang="en" aria-pressed="false" title="Read in English">EN</button></div>')


def fin(v, avec_3d=False, agrandissement=True):
    lignes = []
    if agrandissement:
        lignes += [
            '  <dialog class="lightbox" id="lightbox"' + aria('Image agrandie', 'Enlarged image') + '>',
            '    <button class="modal-close"' + aria('Fermer', 'Close') + '>&times;</button>',
            '    <div class="lb-wrap"><img src="" alt=""></div>',
            '    <p class="lightbox-cap"></p>',
            '  </dialog>',
            '']
    lignes += [
        '  ' + bascule(flottante=True),
        '',
        PIED,
        f'  <script src="../{V_FICHE_JS}"></script>',
        f'  <script src="cas.js?v={v["cas_js"]}"></script>',
    ]
    if avec_3d:
        lignes.append(f'  <script src="patte-oie-3d.js?v={v["patte_js"]}"></script>')
    lignes += ['</body>', '</html>', '']
    return '\n'.join(lignes)


# ---------- Blocs du contenu ----------
INTRO_IMAGES = {
    'fr': "<b>Observez avant de lire la suite.</b> Rappel : la <mark class='k-tech'>droite du patient est à gauche de l'image</mark>. Cliquez sur une image pour l'agrandir.",
    'en': "<b>Look before reading on.</b> Reminder: the <mark class='k-tech'>patient's right is on the left of the image</mark>. Click an image to enlarge it.",
}


def annotation(a):
    w, h = a['taille']
    out = [f'<svg class="annot" viewBox="0 0 {w} {h}" aria-hidden="true">']
    for m in a['marques']:
        out.append(f'<g class="mk" data-mk="{m["mk"]}">')
        if m['type'] == 'tirets':
            for (x1, y1), (x2, y2) in m['lignes']:
                out.append(f'<line class="cas-tiret-o" x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}"/>'
                           f'<line class="cas-tiret" style="stroke: var(--{m["c"]})" x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}"/>')
        out.append('</g>')
    out.append('</svg>')
    return ''.join(out)


def galerie(b, cas):
    figs = []
    for im in b['images']:
        titre_fr, titre_en = re.sub(r'<[^>]+>', '', im['titre']['fr']), re.sub(r'<[^>]+>', '', im['titre']['en'])
        figs.append(
            f'<figure class="ex-fig" style="--c: var(--{b["c"]})">'
            f'<button class="ex-img" type="button"{aria("Agrandir : " + titre_fr, "Enlarge: " + titre_en)}>'
            f'<img src="../assets/cas/{cas}/{im["src"]}" alt="{attr(im["alt"]["fr"])}" data-en-alt="{attr(im["alt"]["en"])}" loading="lazy">'
            f'{t(im["mod"], "span", "ex-mod")}{annotation(im["annot"]) if im.get("annot") else ""}</button>'
            f'<figcaption><strong>{t(im["titre"])}</strong>{t(im.get("texte"))}</figcaption></figure>')
    return '<div class="ex-gallery"><div class="ex-grid">\n' + '\n'.join(figs) + '\n</div></div>'


def question(b, cas):
    ident = f'reponse-{cas}'
    precision = t(b['precision'], 'p', 'cas-reponse-precision') if b.get('precision') else ''
    return (f'<div class="case-vignette cas-question"><p class="teaser-label">Question</p>{t(b["question"], "p")}</div>\n'
            f'<button class="btn btn-ink annex-toggle" type="button" aria-expanded="false" aria-controls="{ident}">'
            f'<span class="annex-open">{t({"fr": "Afficher la réponse ↓", "en": "Show the answer ↓"})}</span>'
            f'<span class="annex-close">{t({"fr": "Masquer la réponse ↑", "en": "Hide the answer ↑"})}</span></button>\n'
            f'<div class="annex-body" id="{ident}" hidden><div class="cas-reponse">'
            f'<p class="cas-reponse-label">{t({"fr": "Réponse", "en": "Answer"})}</p>{t(b["reponse"], "p", "cas-reponse-dx")}{precision}</div></div>')


def fcard(b, _cas):
    out = [f'<div class="fcard" style="--c: var(--{b["c"]})">']
    if b.get('titre'):
        out.append(t(b['titre'], 'h3', 'marker-sub'))
    if b.get('items'):
        out.append('<ul class="fl">' + ''.join(t(i, 'li') for i in b['items']) + '</ul>')
    if b.get('texte'):
        out.append(t(b['texte'], 'p'))
    out.append('</div>')
    return ''.join(out)


def chiffres(b, _cas):
    return ('<div class="cas-chiffres">' + ''.join(
        f'<div class="cas-chiffre" style="--c: var(--{i["c"]})"><b>{t(i["valeur"])}</b>{t(i["texte"], "p")}</div>'
        for i in b['items']) + '</div>')


def tuiles(b, _cas):
    return ('<div class="tiles cas-tuiles">' + ''.join(
        f'<article class="tile" style="--c: var(--{i["c"]})"><span class="tile-badge">{i["badge"]}</span>'
        f'<h3>{t(i["titre"])}</h3>{t(i.get("texte"), "p")}</article>' for i in b['items']) + '</div>')


def sites(b, _cas):
    return (f'<div class="fcard" style="--c: var(--{b["c"]})">{t(b["titre"], "h3", "marker-sub")}<ul class="cas-sites">'
            + ''.join(f'<li style="--c: var(--{i["c"]})">{t(i)}</li>' for i in b['items']) + '</ul></div>')


def legende(b, _cas):
    items = ''.join(
        f'<li data-mk="{i["mk"]}"><span class="lg cas-lg-{i["lg"]}" style="--lc: var(--{i["c"]})" aria-hidden="true"></span>'
        f'<span>{t(i)}</span></li>' for i in b['items'])
    return (f'<ul class="case-legend"{aria("Légende des annotations", "Annotation key")}>{items}</ul>'
            + t({'fr': "Survolez une ligne de la légende pour la repérer sur l'image.",
                 'en': 'Hover over a line of the key to locate it on the image.'}, 'p', 'legend-hint'))


def planche(b, cas):
    w, h = b['taille']
    x0, y0, vw, vh = b['vue']
    out = [f'<figure class="cas-planche" style="--c: var(--teal)">',
           f'<svg class="annot" viewBox="{x0} {y0} {vw} {vh}" role="img"{aria(b["alt"]["fr"], b["alt"]["en"])}>',
           f'<rect x="{x0}" y="{y0}" width="{vw}" height="{vh}" fill="#000"/>',
           f'<image href="../assets/cas/{cas}/{b["src"]}" x="0" y="0" width="{w}" height="{h}"/>']
    for r in b['reperes']:
        (x, y), xa = r['de'], r['a']
        out.append(f'<g class="mk" data-mk="{r["mk"]}">'
                   f'<line class="cas-rappel-o" x1="{x}" y1="{y}" x2="{xa}" y2="{y}"/>'
                   f'<line class="cas-rappel" style="stroke: var(--{r["c"]})" x1="{x}" y1="{y}" x2="{xa}" y2="{y}"/>'
                   f'<circle class="cas-point" style="fill: var(--{r["c"]})" cx="{x}" cy="{y}" r="8"/>'
                   f'{t(r, "text", "cas-etiquette", f' x="{xa + 16}" y="{y + 11}"')}</g>')
    c = b['chevron']
    pts = ' '.join(f'{x},{y}' for x, y in c['points'])
    out.append(f'<g class="mk" data-mk="{c["mk"]}"><polygon class="cas-chevron" style="fill: var(--{c["c"]})" points="{pts}"/></g>')
    out.append('</svg>')
    out.append(f'<figcaption><strong>{t(b["titre"])}</strong></figcaption></figure>')
    return ''.join(out)


def v3d(b, _cas):
    return (f'<div class="v3d" id="v3d" data-modeles="{b["modeles"]}">'
            '<div class="v3d-scene" id="v3d-scene"></div><div class="v3d-panneau" id="v3d-panneau" hidden></div></div>\n'
            + t({'fr': "Genou droit en extension : 14 cm de cuisse et 12 cm de jambe autour de l'interligne. Faites glisser pour tourner, "
                       "pincez ou utilisez la molette pour zoomer, touchez une structure pour la mettre en surbrillance. "
                       "« Tendons seuls » retire les corps charnus pour suivre chaque tendon jusqu'à son insertion sur le tibia.",
                 'en': 'Right knee in extension: 14 cm of thigh and 12 cm of leg around the joint line. Drag to rotate, pinch or use '
                       'the mouse wheel to zoom, tap a structure to highlight it. "Tendons only" removes the muscle bellies so that '
                       'each tendon can be followed to its insertion on the tibia.'}, 'p', 'v3d-aide')
            + '\n<p class="v3d-attribution">'
            + t({'fr': "<b>Modèle 3D</b> : <a href='https://github.com/Z-Anatomy/Models-of-human-anatomy' rel='noopener' target='_blank'>Z-Anatomy</a> "
                       "(G. Kervyn, M. Zielinski), licence <a href='https://creativecommons.org/licenses/by-sa/4.0/deed.fr' rel='noopener license' target='_blank'>CC BY-SA 4.0</a>, "
                       "d'après <a href='https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html' rel='noopener' target='_blank'>BodyParts3D</a> "
                       "© The Database Center for Life Science (CC BY-SA 2.1 Japon). Extrait, coupé, simplifié et mis en couleurs par RadiologicHub : "
                       "<a href='../public/models/patte-oie/LICENSE'>licence et liste des modifications</a>. Représentation pédagogique approximative.",
                 'en': "<b>3D model</b>: <a href='https://github.com/Z-Anatomy/Models-of-human-anatomy' rel='noopener' target='_blank'>Z-Anatomy</a> "
                       "(G. Kervyn, M. Zielinski), <a href='https://creativecommons.org/licenses/by-sa/4.0/' rel='noopener license' target='_blank'>CC BY-SA 4.0</a> licence, "
                       "based on <a href='https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html' rel='noopener' target='_blank'>BodyParts3D</a> "
                       "© The Database Center for Life Science (CC BY-SA 2.1 Japan). Extracted, cut, simplified and coloured by RadiologicHub: "
                       "<a href='../public/models/patte-oie/LICENSE'>licence and list of changes</a>. Approximate teaching model."})
            + '</p>')


def bloc(b, cas):
    ty = b['type']
    if ty == 'recit':
        return '<article class="cas-recit">' + paragraphes(b) + '</article>'
    if ty == 'p':
        return paragraphes(b, b.get('classe', ''))
    if ty == 'intro-images':
        return paragraphes(INTRO_IMAGES, 'fintro')
    if ty == 'colonnes':
        return '<div class="two-col cas-colonnes">' + ''.join(bloc(x, cas) for x in b['blocs']) + '</div>'
    return {'galerie': galerie, 'question': question, 'fcard': fcard, 'chiffres': chiffres, 'tuiles': tuiles,
            'sites': sites, 'legende': legende, 'planche': planche, 'v3d': v3d}[ty](b, cas)


# ---------- Pages ----------
def page_cas(d, v):
    cas = d['id']
    texte = json.dumps(d, ensure_ascii=False)
    couleurs = [k for k in K if f"k-{k[0]}'" in texte]
    titre_fr = f'{d["titre_texte"]["fr"]} — Cas clinique RadiologicHub'
    titre_en = f'{d["titre_texte"]["en"]} — RadiologicHub clinical case'
    description = (f'Cas clinique RadiologicHub ({d["badge"]["fr"].lower()}) : {re.sub(r"<[^>]+>", "", d["accroche"]["fr"])} '
                   'Texte en français, original en anglais en un clic.')
    o = [tete(titre_fr, titre_en, description, v, d.get('v3d', False))]
    o.append('  <main>')
    o.append('    <section class="fiche-hero sec-down">\n      <div class="container">')
    o.append(f'        <nav class="crumbs"{aria("Fil d’Ariane", "Breadcrumb")}><a href="../index.html">{t({"fr": "Accueil", "en": "Home"})}</a> › '
             f'<a href="index.html">{t({"fr": "Cas cliniques", "en": "Clinical cases"})}</a> › <span>{t(d["titre_texte"])}</span></nav>')
    o.append(f'        {t(d["tag"], "p", "marker-tag")}')
    o.append(f'        <h1>{t(d["titre"])}</h1>')
    o.append(f'        {t(d["accroche"], "p", "fiche-sub")}')
    o.append('        <div class="cas-outils">' + bascule()
             + t({'fr': 'Texte original en anglais : un clic sur <b>EN</b>.', 'en': 'French translation: one click on <b>FR</b>.'}, 'p', 'cas-langue-aide')
             + '</div>')
    if couleurs:
        o.append(f'        <div class="legend" role="group"{aria("Code couleur — cliquez pour isoler une catégorie", "Colour code — click to isolate a category")}>')
        o.append(f'          <span class="legend-label">{t({"fr": "Code couleur :", "en": "Colour code:"})}</span>')
        for k, fr, en in couleurs:
            o.append(f'          <button class="chip k-{k}" data-k="{k}" aria-pressed="false">{t({"fr": fr, "en": en})}</button>')
        o.append('        </div>')
        o.append('        ' + t({'fr': 'Astuce : cliquez sur une couleur pour n\'afficher qu\'elle.', 'en': 'Tip: click a colour to show only that category.'}, 'p', 'legend-hint'))
    o.append('        <div class="fiche-actions">')
    o.append(f'          <button class="btn btn-outline btn-sm" id="print-btn">{t({"fr": "Imprimer / PDF", "en": "Print / PDF"})}</button>')
    o.append(f'          <a href="#{d["sections"][0]["id"]}" class="btn btn-outline btn-sm">{t({"fr": "Commencer", "en": "Start"})}</a>')
    o.append(f'          <a href="#diagnostic" class="btn btn-ink btn-sm">{t({"fr": "À vous de jouer →", "en": "Your turn →"})}</a>')
    o.append('        </div>\n      </div>\n    </section>\n')
    o.append('    <div class="container fiche-layout">')
    o.append(f'      <aside class="toc"{aria("Sommaire", "Contents")}>')
    o.append(f'        <p class="toc-title">{t({"fr": "Sommaire", "en": "Contents"})}</p>\n        <ol>')
    for s in d['sections']:
        o.append(f'          <li><a href="#{s["id"]}" style="--c: var(--{s["c"]})"><b>{s["num"]}</b>{t(s["titre"])}</a></li>')
    o.append('        </ol>\n      </aside>\n')
    o.append('      <div class="fiche-body" id="fiche-body">')
    for s in d['sections']:
        o.append(f'\n        <!-- {s["num"]} -->')
        o.append(f'        <section class="fsec" id="{s["id"]}" style="--c: var(--{s["c"]})">')
        o.append(f'          <h2 class="fsec-title"><span class="fnum">{s["num"]}</span>{t(s["titre"])}</h2>')
        for b in s['blocs']:
            o.append('          ' + bloc(b, cas))
        o.append('        </section>')
    o.append('\n        <div class="fiche-end">')
    o.append('          <img src="../assets/emblem.svg" alt="" width="60" height="54">')
    o.append(f'          {t({"fr": "Cas clinique — RadiologicHub", "en": "Clinical case — RadiologicHub"}, "p")}')
    o.append(f'          <a href="index.html" class="btn btn-outline btn-sm">{t({"fr": "← Tous les cas cliniques", "en": "← All clinical cases"})}</a>')
    o.append('        </div>\n      </div>\n    </div>\n  </main>\n')
    o.append(fin(v, d.get('v3d', False)))
    return '\n'.join(o)


def page_index(liste, cas, v):
    o = [tete('Cas cliniques — RadiologicHub', 'Clinical cases — RadiologicHub',
              'Cas cliniques RadiologicHub : un cas, des images, votre diagnostic. Chaque cas se lit en français ou en anglais.', v)]
    o.append('  <main>')
    o.append('    <section class="fiche-hero sec-down">\n      <div class="container">')
    o.append(f'        {t({"fr": "Un cas, des images, votre diagnostic", "en": "A case, the images, your diagnosis"}, "p", "marker-tag")}')
    o.append(f'        <h1>{t({"fr": "Cas <span class=\'hl-navy\'>cliniques</span>", "en": "Clinical <span class=\'hl-navy\'>cases</span>"})}</h1>')
    o.append('        ' + t({'fr': 'Lisez l\'histoire, observez les images, <span class="hl-red">posez votre diagnostic</span>, puis révisez la sémiologie. '
                                 'Les cas se lisent en français ; le texte original anglais est à un clic.',
                           'en': 'Read the story, look at the images, <span class="hl-red">make your diagnosis</span>, then review the key findings. '
                                 'Cases are translated into French; the original English text is one click away.'}, 'p', 'fiche-sub'))
    o.append('        <div class="cas-outils">' + bascule() + '</div>')
    o.append('      </div>\n    </section>\n')
    o.append('    <section class="section sec-up fiches-index">\n      <div class="container">')
    o.append('        <!-- Généré par scripts/cas/construire_cas.py depuis cas/donnees/index.json -->')
    o.append('        <div class="fiche-grid cas-grille">')
    for e in liste['cas']:
        if 'id' in e:
            d = cas[e['id']]
            lien, badge, titre, resume, mots, c = f'{d["id"]}.html', d['badge'], d['titre_texte'], d['accroche'], d['mots'], d['c']
            note = ''
        else:
            lien, badge, titre, resume, mots, c = e['lien'], e['badge'], e['titre'], e['resume'], e['mots'], e['c']
            note = t(e['note'], 'p', 'cas-carte-note') if e.get('note') else ''
        o.append(f'          <a class="fiche-card" href="{lien}" style="--c: var(--{c})">')
        o.append(f'            {t(badge, "span", "fiche-card-badge")}')
        o.append(f'            {t(titre, "h2")}')
        o.append(f'            {t(resume, "p")}')
        o.append('            <ul class="fiche-tags">' + ''.join(f'<li>{t(m)}</li>' for m in mots) + '</ul>')
        if note:
            o.append(f'            {note}')
        o.append(f'            {t({"fr": "Ouvrir le cas →", "en": "Open the case →"}, "span", "fiche-open")}')
        o.append('          </a>')
    o.append('        </div>\n      </div>\n    </section>\n  </main>\n')
    o.append(fin(v, agrandissement=False))
    return '\n'.join(o)


def construire():
    v = versions()
    liste = json.loads(lire(os.path.join(DONNEES, 'index.json')))
    cas = {}
    pages = {}
    for e in liste['cas']:
        if 'id' not in e:
            continue
        d = json.loads(lire(os.path.join(DONNEES, e['id'] + '.json')))
        assert d['id'] == e['id'], e['id']
        cas[d['id']] = d
        pages[os.path.join(CAS, d['id'] + '.html')] = page_cas(d, v)
    pages[os.path.join(CAS, 'index.html')] = page_index(liste, cas, v)
    return pages


def main():
    verifier = '--verifier' in sys.argv
    pages = construire()
    perimees = []
    for chemin, contenu in pages.items():
        actuel = lire(chemin) if os.path.exists(chemin) else None
        if actuel != contenu:
            perimees.append(os.path.relpath(chemin, RACINE))
            if not verifier:
                with open(chemin, 'w', encoding='utf-8') as f:
                    f.write(contenu)
    if verifier:
        if perimees:
            print('Pages à régénérer :', ', '.join(perimees))
            sys.exit(1)
        print(f'{len(pages)} pages à jour.')
    else:
        print(f'{len(pages)} pages ; écrites : {", ".join(perimees) or "aucune (déjà à jour)"}')


if __name__ == '__main__':
    main()
