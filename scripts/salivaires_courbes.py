#!/usr/bin/env python3
"""RadiologicHub — fiche « Tumeurs des glandes salivaires » : figures SVG « tracées à la main ».

Produit, et écrit dans fiches/tumeurs-glandes-salivaires.html entre les marqueurs
<!-- GEN:nom --> … <!-- /GEN:nom --> :
  • courbes      : les 3 courbes de perfusion A / B / C superposées ;
  • courbe-a/b/c : chaque courbe seule, annotée ;
  • mini-a/b/c   : vignettes des profils ;
  • adc          : réglette de l'ADC de la lésion (seuils publiés, voir fig_adc).

Les courbes sont CALCULÉES (pas dessinées au jugé) puis vérifiées :
  A : monte jusqu'à la fin, sans pic (Tpeak > 120 s) ;
  B : pic précoce (Tpeak ≤ 120 s), wash-out > 30 % ;
  C : pic précoce (Tpeak ≤ 120 s), wash-out < 30 %.
Définitions des courbes (articles de 2020 ou plus récents, à la demande de l'auteur) : Gökçe E, Beyhan M,
World J Radiol 2023;15:20-31 (doi:10.4329/wjr.v15.i1.20) et Pietragalla M et al., Radiol Med 2020;125:851-63
(doi:10.1007/s11547-020-01182-2) : Tpeak 120 s, wash-out 30 % ; acquisition dynamique de 5 min.
wash-out = (signal au pic − signal en fin d'acquisition) / (signal au pic − signal avant injection).
Le tremblé « fait main » est ajouté APRÈS ces vérifications (déplacement < 1 px, sans effet sur
la forme). Relancer après toute modification : python3 scripts/salivaires_courbes.py
"""
import math
import re
from pathlib import Path

RACINE = Path(__file__).resolve().parent.parent
FICHE = RACINE / 'fiches' / 'tumeurs-glandes-salivaires.html'

T0 = 0.06          # injection (temps normalisé 0 → 1 ; de l'injection à t = 1 : 5 min d'acquisition)
DUREE = 300        # secondes entre l'injection et la fin de l'acquisition (5 min)
# fin de la phase précoce : Tpeak ≤ 120 s (Gökçe 2023, doi:10.4329/wjr.v15.i1.20 ; Pietragalla 2020, doi:10.1007/s11547-020-01182-2)
PRECOCE = T0 + 120 / DUREE * (1 - T0)
COULEURS = {'A': 'var(--k-sign)', 'B': 'var(--orange)', 'C': 'var(--k-grave)'}


# ---------------------------------------------------------------- modèles de courbes
def modele(tau1, tau2, w):
    """Prise de contraste : montée exponentielle × (fraction retenue + fraction lavée)."""
    def s(t):
        u = max(0.0, t - T0)
        return (1 - math.exp(-u / tau1)) * (w + (1 - w) * math.exp(-u / tau2))
    return s


def ajuster(t_pic, fin):
    """Recherche des paramètres donnant un pic au temps t_pic et un signal final = fin × pic
    (≈ 1 min ; résultats recopiés dans COURBES ci-dessous, revérifiés à chaque lancement par verifier())."""
    meilleur = None
    for i in range(1, 60):
        tau1 = 0.01 + i * 0.004
        for j in range(1, 80):
            tau2 = 0.02 + j * 0.02
            for k in range(0, 41):
                w = k * 0.025
                s = modele(tau1, tau2, w)
                ts = [n / 400 for n in range(401)]
                vs = [s(t) for t in ts]
                p = max(vs)
                tp = ts[vs.index(p)]
                err = (tp - t_pic) ** 2 * 4 + (vs[-1] / p - fin) ** 2
                if meilleur is None or err < meilleur[0]:
                    meilleur = (err, tau1, tau2, w)
    return meilleur[1:]


def normaliser(s):
    ts = [n / 400 for n in range(401)]
    p = max(s(t) for t in ts)
    return lambda t: 100 * s(t) / p


COURBES = {
    'A': normaliser(modele(0.42, 1.0, 1.0)),
    'B': normaliser(modele(0.054, 0.86, 0.1)),    # = ajuster(0.22, 0.50) : pic à t = 0,22, fin à 50 % du pic
    'C': normaliser(modele(0.042, 0.74, 0.7)),    # = ajuster(0.24, 0.85) : pic à t = 0,24, fin à 85 % du pic
}
COURBES['A'] = (lambda f: (lambda t: 0.64 * f(t)))(COURBES['A'])   # A reste nettement sous les autres en fin de courbe


def verifier():
    ts = [n / 400 for n in range(401)]
    res = {}
    for k, f in COURBES.items():
        vs = [f(t) for t in ts]
        p = max(vs)
        tp = ts[vs.index(p)]
        wo = (p - vs[-1]) / (p - vs[0]) * 100
        res[k] = (tp, wo, vs)
    tpA, woA, vsA = res['A']
    assert all(b >= a - 1e-9 for a, b in zip(vsA, vsA[1:])), 'A doit monter sans redescendre'
    assert tpA == 1.0 and woA <= 0.0, 'A : pas de pic avant la fin'
    for k in 'BC':
        tp, wo, vs = res[k]
        assert T0 < tp < PRECOCE, f'{k} : pic précoce attendu ({tp:.2f})'
    assert res['B'][1] > 30, f"B : wash-out > 30 % attendu ({res['B'][1]:.1f})"
    assert res['C'][1] < 30, f"C : wash-out < 30 % attendu ({res['C'][1]:.1f})"
    assert res['C'][1] > 5, 'C : léger wash-out visible'
    return {k: (round(tp, 3), round(wo, 1)) for k, (tp, wo, _) in res.items()}


# ---------------------------------------------------------------- tracé « à la main »
def bruit(seed):
    """Petit tremblé régulier (déterministe) en fonction de l'abscisse curviligne."""
    a = [math.sin(seed * 12.9898 + i * 78.233) * 43758.5453 % 1 for i in range(6)]
    def n(s):
        return (0.55 * math.sin(s * 0.075 + a[0] * 6.28) + 0.3 * math.sin(s * 0.19 + a[1] * 6.28)
                + 0.15 * math.sin(s * 0.43 + a[2] * 6.28))
    return n


def chemin_lisse(pts):
    """Catmull-Rom → Bézier cubiques."""
    d = f'M{pts[0][0]:.1f} {pts[0][1]:.1f}'
    for i in range(len(pts) - 1):
        p0 = pts[i - 1] if i else pts[i]
        p1, p2 = pts[i], pts[i + 1]
        p3 = pts[i + 2] if i + 2 < len(pts) else p2
        c1 = (p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6)
        c2 = (p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6)
        d += f' C{c1[0]:.1f} {c1[1]:.1f} {c2[0]:.1f} {c2[1]:.1f} {p2[0]:.1f} {p2[1]:.1f}'
    return d


def trembler(pts, seed, amp=1.0):
    n = bruit(seed)
    out, s = [], 0.0
    for i, (x, y) in enumerate(pts):
        if i:
            s += math.hypot(x - pts[i - 1][0], y - pts[i - 1][1])
        a = pts[min(i + 1, len(pts) - 1)]
        b = pts[max(i - 1, 0)]
        dx, dy = a[0] - b[0], a[1] - b[1]
        L = math.hypot(dx, dy) or 1
        k = amp * n(s) * (0 if i in (0, len(pts) - 1) else 1)
        out.append((x - dy / L * k, y + dx / L * k))
    return out


def trait(pts, couleur, seed, larg=3.4, amp=1.0, extra=''):
    """Trait principal + passage de crayon plus fin, légèrement décalé."""
    p1 = chemin_lisse(trembler(pts, seed, amp))
    p2 = chemin_lisse([(x + 0.7, y - 0.5) for x, y in trembler(pts, seed + 7, amp * 0.8)])
    return (f'<path d="{p1}" fill="none" style="stroke: {couleur}" stroke-width="{larg}" stroke-linecap="round" stroke-linejoin="round"{extra}/>'
            f'<path d="{p2}" fill="none" style="stroke: {couleur}" stroke-width="{larg * 0.35:.2f}" stroke-linecap="round" opacity=".55"{extra}/>')


def segment(x1, y1, x2, y2, couleur, seed, larg=2.6, n=14, courbure=1.6, extra=''):
    pts = []
    for i in range(n + 1):
        f = i / n
        bow = math.sin(math.pi * f) * courbure
        dx, dy = x2 - x1, y2 - y1
        L = math.hypot(dx, dy) or 1
        pts.append((x1 + dx * f - dy / L * bow, y1 + dy * f + dx / L * bow))
    return trait(pts, couleur, seed, larg, 0.8, extra)


def fleche(x1, y1, x2, y2, couleur, seed, larg=2.6, tete=11):
    a = math.atan2(y2 - y1, x2 - x1)
    h1 = (x2 - tete * math.cos(a - 0.45), y2 - tete * math.sin(a - 0.45))
    h2 = (x2 - tete * math.cos(a + 0.45), y2 - tete * math.sin(a + 0.45))
    return (segment(x1, y1, x2, y2, couleur, seed, larg) +
            segment(h1[0], h1[1], x2, y2, couleur, seed + 1, larg, 4, 0.3) +
            segment(h2[0], h2[1], x2, y2, couleur, seed + 2, larg, 4, 0.3))


def tirets(x1, y1, x2, y2, couleur, seed, larg=1.8):
    return segment(x1, y1, x2, y2, couleur, seed, larg, 10, 0.6, ' stroke-dasharray="7 6"')


def texte(x, y, t, taille=16, couleur='var(--ink)', ancre='start', extra=''):
    return (f'<text x="{x:.1f}" y="{y:.1f}" class="main" font-size="{taille}" text-anchor="{ancre}" '
            f'style="fill: {couleur}"{extra}>{t}</text>')


def lettre(x, y, k, r=15):
    c = COURBES and COULEURS[k]
    return (f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{r}" style="fill: {c}" stroke="var(--ink)" stroke-width="2.5"/>'
            + texte(x, y + r * 0.38, k, r * 1.15, '#fff', 'middle'))


# ---------------------------------------------------------------- repère
class Repere:
    def __init__(self, x0, x1, ybas, yhaut):
        self.x0, self.x1, self.ybas, self.yhaut = x0, x1, ybas, yhaut

    def X(self, t):
        return self.x0 + t * (self.x1 - self.x0)

    def Y(self, s):
        return self.ybas - s / 100 * (self.ybas - self.yhaut)

    def points(self, f, n=90):
        return [(self.X(i / n), self.Y(f(i / n))) for i in range(n + 1)]

    def axes(self, seed, legendes=True, taille=15):
        o = (self.x0 - 12, self.ybas + 12)
        s = fleche(o[0], o[1], self.x1 + 26, o[1], 'var(--ink)', seed, 2.8)
        s += fleche(o[0], o[1], o[0], self.yhaut - 26, 'var(--ink)', seed + 5, 2.8)
        if legendes:
            s += texte(self.x1 + 22, o[1] - 12, 'Temps', taille, 'var(--ink)', 'end')
            s += texte(o[0] - 14, self.yhaut - 8, 'Signal', taille, 'var(--ink)', 'end',
                       f' transform="rotate(-90 {o[0] - 14:.1f} {self.yhaut - 8:.1f})"')
        return s

    def precoce(self, taille=13):
        xa, xb = self.X(T0), self.X(PRECOCE)
        return (f'<rect x="{xa:.1f}" y="{self.yhaut - 18:.1f}" width="{xb - xa:.1f}" height="{self.ybas - self.yhaut + 18:.1f}" '
                f'rx="8" style="fill: color-mix(in srgb, var(--amber) 16%, transparent)"/>'
                + texte((xa + xb) / 2, self.yhaut - 24, 'pic précoce : ≤ 120 s', taille, 'var(--gold)', 'middle'))

    def injection(self, seed, taille=12):
        """Repères de temps sous l'axe : injection, 120 s (fin de la phase précoce), 5 min (fin de l'acquisition)."""
        s = ''
        for i, (t, nom) in enumerate(((T0, 'injection'), (PRECOCE, '120 s'), (1, '5 min'))):
            x = self.X(t)
            s += (segment(x, self.ybas + 4, x, self.ybas + 20, 'var(--ink)', seed + i, 2, 3, 0.2)
                  + texte(x, self.ybas + 36, nom, taille, 'var(--muted)', 'middle'))
        return s


def svg(w, h, contenu, label):
    return (f'<svg viewBox="0 0 {w} {h}" role="img" aria-label="{label}" xmlns="http://www.w3.org/2000/svg">'
            f'{contenu}</svg>')


def pic(k):
    f = COURBES[k]
    ts = [n / 400 for n in range(401)]
    vs = [f(t) for t in ts]
    p = max(vs)
    return ts[vs.index(p)], p, vs[-1]


# ---------------------------------------------------------------- figures
def fig_courbes():
    R = Repere(96, 560, 300, 74)
    s = R.precoce(15) + R.axes(1, True, 17) + R.injection(3, 13)
    # seuil de 30 % sous le pic (B et C culminent à 100)
    s += tirets(R.X(0.24), R.Y(100), R.X(1), R.Y(100), 'var(--slate)', 4)
    s += texte(R.X(0.7), R.Y(100) - 16, 'niveau du pic', 13, 'var(--slate)', 'middle')
    s += tirets(R.X(0.24), R.Y(70), R.X(1), R.Y(70), 'var(--slate)', 6)
    s += texte(R.X(0.27), R.Y(70) + 20, '30 % sous le pic', 13, 'var(--slate)', 'start')
    for i, k in enumerate('ABC'):
        s += trait(R.points(COURBES[k]), COULEURS[k], 10 + i * 9, 4)
    # étiquettes en bout de courbe
    for k in 'ABC':
        s += lettre(R.X(1) + 26, R.Y(COURBES[k](1)), k, 14)
    # marques des pics précoces
    for k in 'BC':
        tp, p, _ = pic(k)
        s += f'<circle cx="{R.X(tp):.1f}" cy="{R.Y(p):.1f}" r="4.5" style="fill: {COULEURS[k]}" stroke="var(--ink)" stroke-width="1.5"/>'
    return svg(640, 352, s, 'Courbes de perfusion des tumeurs des glandes salivaires : A ascendante sans pic précoce, '
               'B pic précoce puis wash-out supérieur à 30 %, C pic précoce puis wash-out inférieur à 30 %')


def fig_une(k):
    R = Repere(52, 262, 196, 58)
    s = R.precoce(11) + R.axes(20 + ord(k), False) + R.injection(30 + ord(k), 10)
    s += trait(R.points(COURBES[k]), COULEURS[k], 40 + ord(k), 4)
    if k == 'A':
        s += fleche(R.X(0.55), R.Y(30), R.X(0.83), R.Y(56), 'var(--k-sign)', 50, 2.2, 9)
        s += texte(R.X(0.5), R.Y(14), 'monte jusqu\'à la fin', 13, 'var(--k-sign)', 'middle')
        s += texte(R.X(0.2), R.Y(104), 'pas de pic précoce', 13, 'var(--k-grave)', 'start')
        label = 'Courbe A : ascendante, sans pic précoce'
    else:
        tp, p, fin = pic(k)
        wo = round((p - fin) / p * 100)
        s += tirets(R.X(tp), R.Y(p), R.X(1), R.Y(p), 'var(--slate)', 60)
        s += tirets(R.X(tp), R.Y(70), R.X(1), R.Y(70), 'var(--slate)', 62)
        s += texte(R.X(1) + 4, R.Y(70) + 4, '−30 %', 11, 'var(--slate)')
        xb = R.X(0.95)
        s += fleche(xb, R.Y(p) + 3, xb, R.Y(fin) - 3, 'var(--ink)', 64, 2, 8)
        s += f'<circle cx="{R.X(tp):.1f}" cy="{R.Y(p):.1f}" r="4" style="fill: {COULEURS[k]}" stroke="var(--ink)" stroke-width="1.5"/>'
        s += texte(R.X(tp) + 6, R.Y(p) - 9, 'pic précoce', 12, 'var(--ink)', 'start')
        signe = '&gt;' if k == 'B' else '&lt;'
        s += texte(R.X(0.6), (R.Y(fin) + 22) if k == 'B' else (R.Y(70) + 22), f'wash-out {signe} 30 %', 13,
                   COULEURS[k], 'middle')
        label = f'Courbe {k} : pic précoce puis wash-out {"supérieur" if k == "B" else "inférieur"} à 30 % (environ {wo} % sur ce schéma)'
    return svg(300, 238, s, label)


def fig_mini(k):
    R = Repere(14, 136, 72, 14)
    s = segment(8, 78, 146, 78, 'var(--ink)', 70 + ord(k), 2, 6, 0.4)
    s += segment(8, 78, 8, 6, 'var(--ink)', 75 + ord(k), 2, 6, 0.4)
    s += trait(R.points(COURBES[k], 50), COULEURS[k], 80 + ord(k), 3.2, 0.7)
    return svg(150, 84, s, f'Courbe de perfusion de type {k}')


def fig_adc():
    """Réglette de l'ADC de la lésion (× 10⁻³ mm²/s), lue avec la courbe de perfusion.
    Seuils : Pietragalla M et al., Radiol Med 2020;125:851-63 (doi:10.1007/s11547-020-01182-2) :
    ADC ≥ 1,4 + courbe A → bénin ; 0,9 à 1,4 + courbe C → carcinome ; < 0,9 + courbe B → Warthin ;
    lymphome < 0,7 + courbe C. Plage des seuils AP / malin publiés : 1,267 à 1,60 (Coudert H et al.,
    Diagn Interv Imaging 2021;102:121-30, doi:10.1016/j.diii.2020.08.002). Articles de 2020 ou plus récents seulement."""
    x0, x1, vmax = 40, 620, 2.4
    X = lambda v: x0 + v / vmax * (x1 - x0)
    yb, h = 132, 34
    zones = [(0, 0.9, 'var(--purple)', 'Warthin', '#fff'),
             (0.9, 1.4, 'var(--k-grave)', 'Carcinome', '#fff'),
             (1.4, vmax, 'var(--k-sign)', 'Bénin (adénome pléomorphe)', '#fff')]
    s = ''
    for a, b, c, t, fg in zones:
        s += f'<rect x="{X(a):.1f}" y="{yb:.1f}" width="{X(b) - X(a):.1f}" height="{h}" style="fill: {c}"/>'
        s += texte((X(a) + X(b)) / 2, yb + 23, t, 15, fg, 'middle')
    s += segment(X(0), yb, X(vmax), yb, 'var(--ink)', 90, 2.6, 16, 0.5)
    s += segment(X(0), yb + h, X(vmax), yb + h, 'var(--ink)', 91, 2.6, 16, 0.5)
    s += segment(X(0), yb, X(0), yb + h, 'var(--ink)', 92, 2.6, 3, 0.2)
    s += segment(X(vmax), yb, X(vmax), yb + h, 'var(--ink)', 93, 2.6, 3, 0.2)
    # graduations
    for v, t in ((0, '0'), (0.7, '0,7'), (0.9, '0,9'), (1.4, '1,4'), (2, '2,0')):
        s += segment(X(v), yb - 2, X(v), yb - 12, 'var(--ink)', 100 + int(v * 10), 2, 3, 0.2)
        s += texte(X(v), yb - 17, t, 15, 'var(--ink)', 'middle')
    # plage des seuils AP / malin selon les études (au-dessus)
    yw = yb - 50
    s += segment(X(1.267), yw, X(1.6), yw, 'var(--slate)', 110, 3, 6, 0.4)
    s += segment(X(1.267), yw - 7, X(1.267), yw + 7, 'var(--slate)', 111, 3, 3, 0.2)
    s += segment(X(1.6), yw - 7, X(1.6), yw + 7, 'var(--slate)', 112, 3, 3, 0.2)
    s += texte(X(1.43), yw - 14, 'seuil adénome pléomorphe / tumeur maligne : 1,27 à 1,6 selon les études', 13, 'var(--slate)', 'middle')
    # courbe associée sous chaque zone
    yc = yb + h + 26
    for v, t, c in ((0.45, '+ courbe B', 'var(--purple)'), (1.15, '+ courbe C', 'var(--k-grave)'), (1.9, '+ courbe A', 'var(--k-sign)')):
        s += texte(X(v), yc, t, 15, c, 'middle')
    # lymphome : < 0,7 + courbe C (crochet sous la zone)
    yl = yc + 34
    s += segment(X(0), yl, X(0.7), yl, 'var(--k-grave)', 120, 3, 6, 0.4)
    s += segment(X(0), yl - 7, X(0), yl + 7, 'var(--k-grave)', 121, 3, 3, 0.2)
    s += segment(X(0.7), yl - 7, X(0.7), yl + 7, 'var(--k-grave)', 122, 3, 3, 0.2)
    s += texte(X(0.02), yl + 26, 'lymphome : &lt; 0,7 + courbe C', 14, 'var(--k-grave)', 'start')
    s += texte(X(1.2), 22, 'ADC de la lésion (× 10⁻³ mm²/s), lu avec la courbe', 16, 'var(--ink)', 'middle')
    return svg(660, 290, s, "Réglette de l'ADC de la lésion en 10 puissance moins 3 millimètres carrés par seconde, "
               "lu avec la courbe de perfusion : moins de 0,9 avec une courbe B, Warthin ; de 0,9 à 1,4 avec une courbe C, carcinome ; "
               "1,4 ou plus avec une courbe A, tumeur bénigne (adénome pléomorphe) ; lymphome : moins de 0,7 avec une courbe C ; "
               "seuil entre adénome pléomorphe et tumeur maligne de 1,27 à 1,6 selon les études")


def main():
    mesures = verifier()
    figures = {'courbes': fig_courbes(), 'adc': fig_adc()}
    for k in 'ABC':
        figures['courbe-' + k.lower()] = fig_une(k)
        figures['mini-' + k.lower()] = fig_mini(k)
    html = FICHE.read_text(encoding='utf-8')
    for nom, contenu in figures.items():
        motif = re.compile(rf'(<!-- GEN:{nom} -->).*?(<!-- /GEN:{nom} -->)', re.S)
        assert motif.search(html), f'marqueur GEN:{nom} absent'
        html = motif.sub(lambda m: m.group(1) + contenu + m.group(2), html)
    FICHE.write_text(html, encoding='utf-8')
    for k, (tp, wo) in mesures.items():
        print(f'courbe {k} : pic à {round((tp - T0) / (1 - T0) * DUREE)} s après l\'injection, wash-out = {wo} %')


if __name__ == '__main__':
    main()
