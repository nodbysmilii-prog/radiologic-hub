"""Construit le calque SVG et la liste des structures d'une planche de radiographie standard
(Radioanatomie › Radiographie standard) à partir de son fichier JSON.

Usage : python3 scripts/radioanatomie/construire_planche.py radioanatomie/radiographie-standard/cavum-profil
  lit  <base>.json  (image, structures : nom, lignes de l'étiquette, couleurs, position, traits)
  écrit dans <base>.html, entre les marqueurs <!-- planche:svg --> … <!-- /planche:svg -->
  et <!-- planche:liste --> … <!-- /planche:liste -->."""
import html, json, re, sys

TAILLE, INTERLIGNE, MARGE_X, MARGE_Y = 24, 1.18, 13, 8


def lisse(pts, ferme=False):
    """Courbe passant par les points (Catmull-Rom → Bézier) ; ligne brisée pour les contours fermés."""
    f = lambda v: f'{v:.1f}'.rstrip('0').rstrip('.')
    if ferme or len(pts) < 3:
        return 'M' + ' L'.join(f'{f(x)} {f(y)}' for x, y in pts) + (' Z' if ferme else '')
    d = [f'M{f(pts[0][0])} {f(pts[0][1])}']
    for i in range(len(pts) - 1):
        p0, p1, p2 = pts[max(i - 1, 0)], pts[i], pts[i + 1]
        p3 = pts[min(i + 2, len(pts) - 1)]
        c1 = (p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6)
        c2 = (p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6)
        d.append(f'C{f(c1[0])} {f(c1[1])} {f(c2[0])} {f(c2[1])} {f(p2[0])} {f(p2[1])}')
    return ' '.join(d)


def etiquette(s):
    t = s.get('taille', TAILLE); L = t * INTERLIGNE; n = len(s['lignes'])
    w = round(max(len(l) for l in s['lignes']) * t * .64 + 2 * MARGE_X)  # largeur provisoire (recalculée par planche.js)
    h = round(n * L + 2 * MARGE_Y)
    y0 = -(n - 1) * L / 2 + t * .36
    tsp = ''.join(f'<tspan x="0" y="{y0 + i * L:.1f}">{html.escape(l)}</tspan>' for i, l in enumerate(s['lignes']))
    rot = f' rotate({s["angle"]})' if s.get('angle') else ''
    return (f'<g class="pl-etiq" transform="translate({s["x"]} {s["y"]}){rot}">'
            f'<rect x="{-w / 2:.0f}" y="{-h / 2:.0f}" width="{w}" height="{h}" rx="{min(h / 2, 16):.0f}"/>'
            f'<text font-size="{t}">{tsp}</text></g>')


def svg(D):
    im = D['image']; out = [f'<svg class="pl-calque" viewBox="0 0 {im["largeur"]} {im["hauteur"]}" role="group" aria-label="Légendes du cliché">']
    for s in D['structures']:
        out.append(f'  <g class="pl-s" data-s="{s["id"]}" data-n="{s["n"]}" style="--c: {s["c"]}">')
        if s['traits']:
            ds = [lisse(c, s.get('ferme', False)) for c in s['traits']]
            out.append('    <g class="pl-traits">' + ''.join(f'<path class="pl-halo" d="{d}"/>' for d in ds)
                       + ''.join(f'<path class="pl-trait" d="{d}"/>' for d in ds) + '</g>')
        out.append('    ' + etiquette(s))
        out.append(f'    <g class="pl-num" tabindex="0" role="button" aria-label="Structure {s["n"]}" transform="translate({s["x"]} {s["y"]})">'
                   f'<g class="pl-num-in"><circle r="19"/><text y="7.5">{s["n"]}</text></g></g>')
        out.append('  </g>')
    out.append('</svg>')
    return '\n'.join(out)


def liste(D):
    li = [f'<li data-s="{s["id"]}" style="--c: {s["c"]}; --t: {s["t"]}"><span class="pl-pastille">{s["n"]}</span>'
          f'<span class="pl-nom">{html.escape(s["nom"])}</span><span class="pl-cache" aria-hidden="true">?</span></li>'
          for s in D['structures']]
    return '<ol class="pl-liste">\n' + '\n'.join(li) + '\n</ol>'


def remplacer(page, marque, contenu):
    motif = re.compile(rf'(<!-- planche:{marque} -->)[\s\S]*?(<!-- /planche:{marque} -->)')
    assert motif.search(page), marque
    return motif.sub(lambda m: m.group(1) + '\n' + contenu + '\n' + m.group(2), page)


if __name__ == '__main__':
    base = sys.argv[1]
    D = json.load(open(base + '.json', encoding='utf-8'))
    page = open(base + '.html', encoding='utf-8').read()
    page = remplacer(page, 'svg', svg(D))
    page = remplacer(page, 'liste', liste(D))
    open(base + '.html', 'w', encoding='utf-8').write(page)
    print(base + '.html :', len(D['structures']), 'structures')
