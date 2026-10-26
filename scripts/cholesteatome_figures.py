"""Figures de la fiche « Cholestéatome » (fiches/cholesteatome.html).

Chaque figure = un cliché du cours de l'auteur (annotations d'origine effacées, images dans
fiches/cholesteatome/images/, préparées hors dépôt) + nos tracés en SVG aux couleurs du site,
positionnés dans les coordonnées du cliché d'origine (pixels, avant agrandissement ×2).

Usage : python3 scripts/cholesteatome_figures.py
  réécrit, dans fiches/cholesteatome.html, le contenu entre <!-- FIG:id --> et <!-- /FIG:id -->.
"""
import html, os, re, sys

RACINE = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
PAGE = os.path.join(RACINE, 'fiches', 'cholesteatome.html')
TEAL, ORANGE, BLUE, RED, AMBER, PURPLE, INK, ROSE = '#2a9d8f', '#f18d25', '#3c67b8', '#c8102e', '#f2ab2f', '#7b3fa8', '#111114', '#d63f4c'

# taille des clichés (pixels d'origine)
TAILLES = {
    'mastoide-normale': (326, 331), 'mastoide-intermediaire': (300, 251), 'mastoide-sclerose': (288, 251), 'mastoide-hypopneumatisee': (314, 295),
    'omc-opacites': (196, 206), 'omc-chaine-noyee': (257, 234), 'retrotympanum': (301, 269), 'tympanosclerose': (317, 326),
    'diag-1': (159, 165), 'diag-2': (200, 145), 'diag-3': (193, 133), 'diag-polylobe': (323, 247), 'fossa-incudis-1': (267, 291), 'fossa-incudis-2': (284, 289),
    'evacue-1': (238, 214), 'evacue-2': (240, 236), 'lyse-front-lisse': (286, 241), 'lyse-parois': (285, 269),
    'lyse-ossiculaire': (305, 269), 'lyse-tegmen': (189, 162), 'vii-mastoidien': (244, 238), 'vii-tympanique': (257, 210), 'canal-carotidien': (246, 170), 'sinus-sigmoide': (214, 178),
    'mastoide-eburnee': (256, 235), 'golfe-procident': (201, 200), 'golfe-dehiscent': (234, 194), 'sigmoide-anterieur-1': (215, 192), 'sigmoide-anterieur-2': (224, 213),
    'irm-preop-tdm': (204, 177), 'irm-preop': (224, 170), 'technique-fermee-1': (231, 224), 'technique-fermee-2': (301, 161), 'technique-ouverte-1': (229, 217), 'ossiculoplastie': (227, 123), 'technique-ouverte-2': (173, 176),
    'recidive-perle-1': (222, 205), 'recidive-perle-2': (237, 164), 'greffe-cartilage': (274, 230), 'greffe-horizontale': (217, 178), 'granulome-tdm': (280, 161), 'granulome-irm': (168, 191),
    'recidive-t2': (165, 130), 'recidive-t1': (191, 157), 'recidive-t1-tardif': (190, 162), 'fibro-t2': (212, 180), 'fibro-t1': (219, 203), 'fibro-t1-tardif': (226, 199),
    'tegmen-tdm-1': (228, 197), 'tegmen-tdm-2': (208, 108), 'tegmen-irm-t2': (201, 179), 'tegmen-irm-plastie': (208, 174), 'tegmen-irm-gado': (187, 184), 'tegmen-irm-diffusion': (217, 179),
    'fistule-csc-lateral': (215, 179), 'fistule-csc-posterieur': (216, 179), 'fistule-promontoire-1': (156, 125), 'fistule-promontoire-2': (191, 143),
}

# ---------- primitives (coordonnées du cliché) ----------
def fleche(tip, depuis, c=AMBER, w=2.4):
    (x1, y1), (x0, y0) = tip, depuis
    import math
    a = math.atan2(y1 - y0, x1 - x0); L = 9
    p1 = (x1 - L * math.cos(a - .45), y1 - L * math.sin(a - .45)); p2 = (x1 - L * math.cos(a + .45), y1 - L * math.sin(a + .45))
    bx, by = x1 - L * .8 * math.cos(a), y1 - L * .8 * math.sin(a)
    return (f'<path d="M{x0:.1f} {y0:.1f} L{bx:.1f} {by:.1f}" stroke="#000" stroke-opacity=".55" stroke-width="{w + 2.2}" stroke-linecap="round" fill="none"/>'
            f'<path d="M{x0:.1f} {y0:.1f} L{bx:.1f} {by:.1f}" stroke="{c}" stroke-width="{w}" stroke-linecap="round" fill="none"/>'
            f'<path d="M{x1:.1f} {y1:.1f} L{p1[0]:.1f} {p1[1]:.1f} L{p2[0]:.1f} {p2[1]:.1f}Z" fill="{c}" stroke="#000" stroke-opacity=".55" stroke-width="1"/>')

def cercle(c, r, col=AMBER, dash=None, w=2.2):
    d = f' stroke-dasharray="{dash}"' if dash else ''
    return (f'<circle cx="{c[0]}" cy="{c[1]}" r="{r}" fill="none" stroke="#000" stroke-opacity=".5" stroke-width="{w + 2}"/>'
            f'<circle cx="{c[0]}" cy="{c[1]}" r="{r}" fill="none" stroke="{col}" stroke-width="{w}"{d}/>')

def trace(pts, col=AMBER, ferme=False, dash=None, w=2.4):
    d = 'M' + ' L'.join(f'{x:.1f} {y:.1f}' for x, y in pts) + (' Z' if ferme else '')
    da = f' stroke-dasharray="{dash}"' if dash else ''
    return (f'<path d="{d}" fill="none" stroke="#000" stroke-opacity=".5" stroke-width="{w + 2}" stroke-linejoin="round" stroke-linecap="round"/>'
            f'<path d="{d}" fill="none" stroke="{col}" stroke-width="{w}" stroke-linejoin="round" stroke-linecap="round"{da}/>')

def etoile(c, col=AMBER, r=7):
    import math
    pts = []
    for i in range(10):
        a = -math.pi / 2 + i * math.pi / 5; rr = r if i % 2 == 0 else r * .45
        pts.append((c[0] + rr * math.cos(a), c[1] + rr * math.sin(a)))
    return f'<path d="M' + ' L'.join(f'{x:.1f} {y:.1f}' for x, y in pts) + f'Z" fill="{col}" stroke="#000" stroke-opacity=".6" stroke-width="1"/>'

def texte(x, y, t, col='#fff', ancre='start', taille=11):
    return (f'<text x="{x}" y="{y}" font-size="{taille}" font-weight="800" fill="{col}" stroke="#000" stroke-width="3" '
            f'paint-order="stroke" text-anchor="{ancre}">{html.escape(t)}</text>')

def pastille(x, y, t, col=AMBER, taille=10):
    w = len(t) * taille * .62 + 12
    return (f'<g><rect x="{x - w / 2:.1f}" y="{y - taille * .8:.1f}" width="{w:.1f}" height="{taille * 1.6:.1f}" rx="{taille * .8:.1f}" fill="{col}" stroke="#fff" stroke-width="1.2"/>'
            f'<text x="{x}" y="{y + taille * .36:.1f}" font-size="{taille}" font-weight="800" fill="#fff" text-anchor="middle">{html.escape(t)}</text></g>')

# ---------- figures : (image, texte alternatif, tracés) ----------
FIG = {
    'mastoide-hypopneumatisee': ('Mastoïde scléreuse et hypopneumatisée', [
        fleche((242, 152), (300, 152), ORANGE), pastille(272, 140, 'sclérose', ORANGE),
        fleche((268, 231), (310, 231), BLUE), pastille(282, 248, 'hypopneumatisation', BLUE)]),
    'retrotympanum': ('Rétrotympanum en coupe axiale : récessus du facial, éminence pyramidale, sinus tympani', [
        trace([(160, 166), (156, 185), (165, 205), (178, 210)], BLUE), pastille(118, 196, 'récessus du facial', BLUE),
        trace([(178, 176), (190, 192), (188, 212), (182, 240)], AMBER, dash='4 3'), pastille(138, 236, 'éminence pyramidale', AMBER),
        trace([(196, 214), (206, 232), (228, 238), (246, 228)], ORANGE), pastille(232, 254, 'sinus tympani', ORANGE),
        fleche((152, 160), (120, 132), RED), pastille(78, 126, 'muscle stapédien', RED)]),
    'tympanosclerose': ('Tympanosclérose : plaques calcifiées sur la chaîne et les parois de la caisse', [
        cercle((106, 114), 30, RED), cercle((118, 157), 21, AMBER), cercle((178, 169), 21, BLUE), texte(150, 312, 'plaques calcifiées', '#fff', 'middle', 13)]),
    'diag-polylobe': ('Cholestéatome : opacité polylobée de l\'oreille moyenne, lyse du mur de la logette', [
        trace([(141, 96), (150, 80), (160, 84), (168, 98), (184, 110), (192, 122), (186, 133), (170, 128), (160, 136), (148, 138), (140, 124), (146, 110)], AMBER, ferme=True),
        pastille(165, 66, 'opacité nodulaire', AMBER),
        trace([(108, 113), (124, 114), (124, 96)], TEAL, w=3), pastille(72, 100, 'mur de la logette lysé', TEAL),
        cercle((130, 140), 14, ORANGE, dash='4 3'), pastille(78, 168, 'polype sentinelle ?', ORANGE)]),
    'fossa-incudis-1': ('Fossa incudis : enclume sur la bissectrice (normal)', [
        trace([(66, 0), (113, 180), (268, 34)], '#fff', w=1.8), trace([(113, 180), (168, -12)], TEAL, dash='6 4'), pastille(200, 22, 'bissectrice', TEAL)]),
    'fossa-incudis-2': ('Fossa incudis : enclume refoulée hors de la bissectrice', [
        trace([(135, 0), (134, 181), (285, 37)], '#fff', w=1.8), trace([(134, 181), (213, -3)], TEAL, dash='6 4'),
        trace([(134, 175), (234, 0)], RED, dash='5 3'), pastille(238, 18, 'enclume refoulée', RED)]),
    'evacue-1': ('Cholestéatome évacué : atticotomie spontanée', [fleche((131, 116), (158, 150), AMBER)]),
    'evacue-2': ('Cholestéatome évacué : cavité anormale de l\'attique', [fleche((147, 92), (178, 34), AMBER), fleche((157, 121), (182, 144), ORANGE)]),
    'lyse-front-lisse': ('Ostéolyse à front lisse', [
        trace([(70, 110), (69, 135), (66, 160), (62, 185), (65, 203), (76, 213), (90, 211), (100, 203), (108, 185), (115, 163), (121, 140), (127, 113)], BLUE, w=3),
        pastille(96, 230, 'front lisse', BLUE)]),
    'lyse-ossiculaire': ('Lyse ossiculaire', [fleche((158, 108), (106, 78), AMBER)]),
    'vii-mastoidien': ('Segment mastoïdien du nerf facial (VII3) au contact', [fleche((166, 109), (204, 84), AMBER), pastille(218, 72, 'VII3', AMBER)]),
    'vii-tympanique': ('Segment tympanique du nerf facial (VII2) : plancher du canal dénudé', [fleche((126, 85), (104, 140), AMBER), pastille(100, 154, 'VII2', AMBER)]),
    'canal-carotidien': ('Coque du canal carotidien', [fleche((149, 77), (111, 95), RED), pastille(98, 108, 'canal carotidien', RED)]),
    'sinus-sigmoide': ('Paroi du sinus sigmoïde', [fleche((66, 132), (44, 98), BLUE), pastille(44, 86, 'sinus sigmoïde', BLUE)]),
    'mastoide-eburnee': ('Mastoïde entièrement scléreuse (éburnée)', [fleche((34, 80), (4, 52), AMBER)]),
    'golfe-procident': ('Golfe jugulaire procident', [etoile((123, 91), BLUE, 9), pastille(123, 70, 'procident', BLUE)]),
    'golfe-dehiscent': ('Golfe jugulaire déhiscent', [pastille(172, 20, 'déhiscent', BLUE)]),
    'sigmoide-anterieur-1': ('Sinus sigmoïde antérieur', [etoile((89, 116), BLUE, 9)]),
    'sigmoide-anterieur-2': ('Sinus sigmoïde antérieur et superficiel', [etoile((178, 129), BLUE, 9)]),
    'irm-preop': ('IRM : effacement du signal liquidien au contact (fistule)', [
        trace([(150, 92), (162, 100), (166, 114), (160, 126)], AMBER, dash='4 3', w=3), fleche((157, 110), (176, 126), '#fff'), pastille(112, 162, 'extinction du signal', AMBER)]),
    'technique-fermee-1': ('Tympanoplastie en technique fermée', [etoile((170, 171), AMBER, 6), pastille(150, 210, 'caisse ré-aérée', AMBER)]),
    'ossiculoplastie': ('Ossiculoplastie : prothèse entre tympan et étrier', [trace([(108, 47), (122, 50), (116, 66), (108, 82), (100, 79), (104, 62)], ORANGE, ferme=True, w=2.6), pastille(102, 104, 'prothèse', ORANGE)]),
    'recidive-perle-1': ('Récidive : opacité ronde à bords convexes (perle)', [fleche((152, 73), (192, 32), AMBER)]),
    'recidive-perle-2': ('Récidive : perle de cholestéatome', [fleche((139, 51), (178, 12), AMBER)]),
    'greffe-cartilage': ('Greffe tympanique cartilagineuse', [fleche((86, 88), (96, 52), AMBER)]),
    'greffe-horizontale': ('Greffe tympanique horizontalisée', [trace([(0, 96.5), (216, 96.5)], AMBER, dash='6 4', w=2)]),
    'granulome-irm': ('Granulome à cholestérine : hypersignal T1 spontané', [fleche((52, 62), (44, 30), AMBER)]),
    'recidive-t1-tardif': ('Récidive : pas de prise de contraste, même tardive', [fleche((45, 61), (45, 20), AMBER)]),
    'fibro-t2': ('Tissu fibro-inflammatoire : hypersignal T2', [fleche((163, 66), (196, 34), AMBER), texte(6, 16, 'T2')]),
    'fibro-t1': ('Tissu fibro-inflammatoire : hyposignal T1', [fleche((157, 58), (160, 30), AMBER), fleche((173, 89), (208, 118), AMBER), texte(6, 16, 'T1 sans injection')]),
    'fibro-t1-tardif': ('Tissu fibro-inflammatoire : prise de contraste tardive', [fleche((156, 92), (204, 118), AMBER), texte(6, 16, 'T1 gadolinium tardif')]),
    'tegmen-tdm-1': ('Extension labyrinthique (canal semi-circulaire latéral)', [trace([(64, 90), (72, 84), (80, 79), (87, 73)], ORANGE, w=3), pastille(116, 128, 'extension au CSC latéral', ORANGE)]),
    'tegmen-tdm-2': ('Lyse du tegmen', [trace([(55, 22), (66, 23), (78, 24)], BLUE, w=3), pastille(70, 8, 'tegmen lysé', BLUE)]),
    'tegmen-irm-plastie': ('Après chirurgie : plastie du tegmen et lambeau graisseux', [
        trace([(56, 34), (66, 36), (72, 38)], RED, w=3), pastille(70, 20, 'plastie du tegmen', RED),
        trace([(32, 102), (38, 80), (46, 60), (62, 52), (76, 52), (80, 58), (70, 58), (56, 64), (50, 82), (40, 102)], TEAL, w=2.4), pastille(64, 116, 'lambeau graisseux', TEAL)]),
    'tegmen-irm-gado': ('T1 gadolinium semi-tardif : opacité non rehaussée', [cercle((74, 50), 14, PURPLE), pastille(74, 24, 'non rehaussée', PURPLE)]),
    'tegmen-irm-diffusion': ('Diffusion b1000 : hypersignal (cholestéatome)', [fleche((90, 88), (126, 118), AMBER)]),
    'fistule-csc-lateral': ('Fistule du canal semi-circulaire latéral', [fleche((111, 56), (134, 30), RED), pastille(160, 18, 'CSC latéral', RED)]),
    'fistule-csc-posterieur': ('Fistule du canal semi-circulaire postérieur', [fleche((118, 111), (130, 152), RED), pastille(140, 166, 'CSC postérieur', RED)]),
    'fistule-promontoire-1': ('Fistule du promontoire (tour basal de la cochlée)', [fleche((61, 49), (89, 84), RED), pastille(100, 100, 'promontoire', RED)]),
    'fistule-promontoire-2': ('Fistule du promontoire, autre coupe', [fleche((87, 69), (112, 102), RED), pastille(130, 116, 'tour basal', RED)]),
}

def figure(nom, legende, credit=True, classe=''):
    w, h = TAILLES[nom]
    alt, traces = FIG.get(nom, (legende, []))
    g = f'<g class="ch-traces">{"".join(traces)}</g>' if traces else ''
    return (f'<figure class="ch-fig{" " + classe if classe else ""}"{" data-traces" if traces else ""}>'
            f'<svg viewBox="0 0 {w} {h}" role="img" aria-label="{html.escape(alt)}" font-family="Montserrat, Arial, sans-serif">'
            f'<image href="cholesteatome/images/{nom}.jpg" width="{w}" height="{h}"/>{g}</svg>'
            f'<figcaption>{legende}</figcaption></figure>')

def main():
    page = open(PAGE, encoding='utf-8').read()
    # marqueurs : <!-- FIG:nom|légende --> … <!-- /FIG -->
    motif = re.compile(r'<!-- FIG:([a-z0-9-]+)\|(.*?) -->.*?<!-- /FIG -->', re.S)
    page2, k = motif.subn(lambda m: f'<!-- FIG:{m.group(1)}|{m.group(2)} -->{figure(m.group(1), m.group(2))}<!-- /FIG -->', page)
    manquants = [x for x in re.findall(r'<!-- FIG:([a-z0-9-]+)\|', page2) if x not in TAILLES]
    if manquants: sys.exit(f'images inconnues : {manquants}')
    open(PAGE, 'w', encoding='utf-8').write(page2)
    print(f'{k} figures écrites dans {os.path.relpath(PAGE, RACINE)}')

if __name__ == '__main__':
    main()
