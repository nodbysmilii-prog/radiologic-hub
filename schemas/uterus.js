/* =========================================================
   RadiologicHub — schéma de l'utérus : cartographie FIGO des myomes
   ---------------------------------------------------------
   Dessin dans le style des planches classiques de la classification FIGO :
   gros corps utérin arrondi (fundus à gauche), cavité sombre, col et vagin
   en double tube vers la droite.
   • VUE PRINCIPALE (coupe sagittale, utérus antéversé, antérieur à gauche) :
     paroi postérieure en haut, paroi antérieure en bas, fundus à gauche ;
   • VUE CORONALE en médaillon (droite de la patiente à gauche) : parois
     latérales.
   Chaque myome se place automatiquement d'après son type FIGO (profondeur
   entre la cavité et la séreuse), sa paroi et son niveau (fundus, corps,
   isthme) ; une paroi non visible dans une vue y est projetée en pointillés.
   planche() dessine la classification FIGO légendée (fiche « Le myome
   utérin »).
   Utilisé par l'outil « FIGO » des comptes rendus (cr-tools.js) et par la
   fiche « Le myome utérin ».
   ========================================================= */

(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.RHUterus = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const W = 820, H = 496;
  const FONT = 'Montserrat, Arial, sans-serif', INK = '#111114', MUTED = '#55545f';
  const CHAIR = { haut: '#c06c8f', bas: '#a24f73', bord: '#7d2d52', lisere: '#e3a3bf', cavite: '#3d0f27', endo: '#e7a3bf' };
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const txt = (x, y, s, o = {}) => `<text x="${x}" y="${y}" font-size="${o.size || 11}" font-weight="${o.weight || 700}" text-anchor="${o.anchor || 'middle'}" fill="${o.fill || INK}"${o.ls ? ` letter-spacing="${o.ls}"` : ''}${o.ombre ? ' stroke="#000" stroke-opacity=".45" stroke-width="3" paint-order="stroke" stroke-linejoin="round"' : ''} pointer-events="none">${esc(s)}</text>`;
  const f1 = v => +v.toFixed(1);
  const lerp = (a, b, t) => [f1(a[0] + (b[0] - a[0]) * t), f1(a[1] + (b[1] - a[1]) * t)];
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  const clair = c => /^#(f{3}|f{6})$/i.test(c || '');
  /* Couleur éclaircie (liseré des bulles) */
  const pale = (c, k = 0.4) => {
    const m = /^#([0-9a-f]{6})$/i.exec(c || '');
    if (!m) return '#fff';
    const n = parseInt(m[1], 16), ch = s => Math.round(((n >> s) & 255) + (255 - ((n >> s) & 255)) * k);
    return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
  };

  /* ---------- Courbes lissées (Catmull-Rom) ---------- */
  function lisse(pts, ferme) {
    const n = pts.length, P = i => pts[ferme ? (i + n) % n : Math.max(0, Math.min(n - 1, i))];
    let d = `M${f1(pts[0][0])} ${f1(pts[0][1])}`;
    for (let i = 0; i < (ferme ? n : n - 1); i++) {
      const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
      d += ` C${f1(p1[0] + (p2[0] - p0[0]) / 6)} ${f1(p1[1] + (p2[1] - p0[1]) / 6)} ${f1(p2[0] - (p3[0] - p1[0]) / 6)} ${f1(p2[1] - (p3[1] - p1[1]) / 6)} ${f1(p2[0])} ${f1(p2[1])}`;
    }
    return d + (ferme ? ' Z' : '');
  }
  /* Points de la même courbe, échantillonnés (calculs d'intersection) */
  function echantillon(pts, ferme, k = 10) {
    const n = pts.length, P = i => pts[ferme ? (i + n) % n : Math.max(0, Math.min(n - 1, i))], out = [];
    for (let i = 0; i < (ferme ? n : n - 1); i++) {
      const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
      for (let j = 0; j < k; j++) {
        const t = j / k;
        out.push([0, 1].map(c => 0.5 * (2 * p1[c] + (-p0[c] + p2[c]) * t + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * t * t + (-p0[c] + 3 * p1[c] - 3 * p2[c] + p3[c]) * t * t * t)));
      }
    }
    if (!ferme) out.push(pts[n - 1]);
    return out;
  }
  /* Première intersection (t > 0) du rayon o + t·v avec un polygone fermé */
  function touche(poly, o, v) {
    let best = Infinity;
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length];
      const ex = b[0] - a[0], ey = b[1] - a[1], den = v[0] * ey - v[1] * ex;
      if (Math.abs(den) < 1e-9) continue;
      const t = ((a[0] - o[0]) * ey - (a[1] - o[1]) * ex) / den;
      const s = ((a[0] - o[0]) * v[1] - (a[1] - o[1]) * v[0]) / den;
      if (t > 1e-6 && s >= 0 && s <= 1 && t < best) best = t;
    }
    return Number.isFinite(best) ? [o[0] + v[0] * best, o[1] + v[1] * best] : o;
  }

  /* ---------- Vue principale : silhouette dans le repère de dessin (≈ 480 × 330) ---------- */
  const FORME = {
    contour: [[470, 228], [456, 194], [416, 160], [360, 128], [300, 100], [240, 74], [170, 58], [100, 64], [44, 98], [16, 160], [18, 228], [50, 282], [110, 318], [190, 330], [262, 318], [330, 314], [400, 318], [458, 328], [476, 306], [452, 278], [400, 262], [348, 250], [324, 244], [346, 236], [402, 238], [452, 248]],
    cavite: [[78, 198], [100, 166], [150, 144], [210, 142], [262, 158], [296, 184], [304, 210], [284, 220], [240, 222], [190, 230], [130, 232], [92, 222]],
    canal: [[302, 212], [313, 229], [324, 244]],
    axe: [[84, 196], [130, 192], [190, 188], [245, 190], [290, 204], [318, 234]],   // ligne médiane de la cavité puis canal cervical
    col: [376, 196],                                                                  // myome du col (type 8)
  };
  const U_NIV = { fundus: 0.1, corps: 0.42, isthme: 0.74 };
  const U_LIM = { corps: 0.26, isthme: 0.62, col: 0.86 };           // début de chaque niveau le long de l'axe
  const U_CAVITE = 0.84;                                             // extrémité de la cavité (orifice interne)

  function vue(s, dx, dy) {
    const T = ([x, y]) => [dx + x * s, dy + y * s];
    const ext = FORME.contour.map(T), cav = FORME.cavite.map(T), axe = FORME.axe.map(T);
    const extP = echantillon(ext, true), cavP = echantillon(cav, true), axeP = echantillon(axe, false, 16);
    const cum = [0];
    for (let i = 1; i < axeP.length; i++) cum.push(cum[i - 1] + dist(axeP[i], axeP[i - 1]));
    const tot = cum[cum.length - 1];
    const at = u => {
      const L = Math.max(0, Math.min(1, u)) * tot;
      let i = 0;
      while (i < axeP.length - 2 && cum[i + 1] < L) i++;
      const k = (L - cum[i]) / (cum[i + 1] - cum[i] || 1), a = axeP[i], b = axeP[i + 1];
      const l = dist(a, b) || 1, d = [(b[0] - a[0]) / l, (b[1] - a[1]) / l];
      return { p: [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k], d, n: [d[1], -d[0]] };   // n : vers le haut = paroi postérieure
    };
    /* Paroi postérieure (côté +1, en haut) ou antérieure (−1, en bas) à la position u : muqueuse, cavité, séreuse */
    const paroi = (cote, u) => {
      const a = at(u), v = [a.n[0] * cote, a.n[1] * cote];
      return { inn: touche(cavP, a.p, v).map(f1), cav: a.p.map(f1), out: touche(extP, a.p, v).map(f1) };
    };
    const fond = () => {
      const a = at(0), v = [-a.d[0], -a.d[1]];
      return { inn: touche(cavP, a.p, v).map(f1), cav: at(0.06).p.map(f1), out: touche(extP, a.p, v).map(f1) };
    };
    /* Point cliqué → position le long de l'axe (u ≤ umax), écart le long de l'axe (long) et latéral (lat) */
    const projeter = (x, y, umax = 1) => {
      let best = null;
      for (let i = 0; i <= 160; i++) {
        const u = i / 160 * umax, a = at(u), dd = Math.hypot(x - a.p[0], y - a.p[1]);
        if (!best || dd < best.dd) best = { u, a, dd };
      }
      const v = [x - best.a.p[0], y - best.a.p[1]];
      return { u: best.u, long: v[0] * best.a.d[0] + v[1] * best.a.d[1], lat: v[0] * best.a.n[0] + v[1] * best.a.n[1] };
    };
    /* Repères de niveau : segments perpendiculaires à l'axe, de séreuse à séreuse */
    const repere = u => { const a = at(u); return [touche(extP, a.p, a.n).map(f1), touche(extP, a.p, [-a.n[0], -a.n[1]]).map(f1)]; };
    return { s, at, paroi, fond, projeter, repere, contour: lisse(ext, true), cavite: lisse(cav, true), canal: lisse(FORME.canal.map(T), false), col: T(FORME.col).map(f1) };
  }

  /* ---------- Vue coronale (médaillon) : géométrie d'origine, réduite ---------- */
  const COR = { k: 0.58, dx: 574, dy: 30 };
  const cor = ([x, y]) => [f1(COR.dx + x * COR.k), f1(COR.dy + y * COR.k)];
  const corInv = (x, y) => [(x - COR.dx) / COR.k, (y - COR.dy) / COR.k];
  const C_COR = 200, NIV_Y = { fundus: 106, corps: 160, isthme: 222 };
  const CORONALE = {
    contour: 'M200 58 C280 58 330 82 332 132 C334 182 300 220 262 246 L242 262 L240 322 C240 332 232 338 224 338 L176 338 C168 338 160 332 160 322 L158 262 L138 246 C100 220 66 182 68 132 C70 82 120 58 200 58 Z',
    cavite: 'M152 104 Q200 118 248 104 Q236 172 204 238 L196 238 Q164 172 152 104 Z',
  };
  const P = (inn, cav, out) => ({ inn: cor(inn), cav: cor(cav), out: cor(out) });

  /* Vue principale de l'outil */
  const SAG = vue(1, 42, 12);
  const POS = {
    cor: {
      'laterale-droite': { fundus: P([160, 112], [184, 116], [86, 96]), corps: P([172, 160], [197, 160], [70, 160]), isthme: P([192, 220], [199, 222], [124, 228]) },
      'laterale-gauche': { fundus: P([240, 112], [216, 116], [314, 96]), corps: P([228, 160], [203, 160], [330, 160]), isthme: P([208, 220], [201, 222], [276, 228]) },
      fundique: { fundus: P([200, 112], [200, 128], [200, 58]) },
    },
    sag: {
      anterieure: { fundus: SAG.paroi(-1, U_NIV.fundus), corps: SAG.paroi(-1, U_NIV.corps), isthme: SAG.paroi(-1, U_NIV.isthme) },
      posterieure: { fundus: SAG.paroi(1, U_NIV.fundus), corps: SAG.paroi(1, U_NIV.corps), isthme: SAG.paroi(1, U_NIV.isthme) },
      fundique: { fundus: SAG.fond() },
    },
  };
  const SPECIAL = { col: { cor: cor([222, 298]), sag: SAG.col }, 'ligament-droit': { cor: cor([34, 196]) }, 'ligament-gauche': { cor: cor([366, 196]) }, parasite: { cor: cor([60, 372]) } };
  const ECHELLE = { cor: COR.k, sag: 1 };
  const centre = (v, niveau) => (v === 'cor' ? cor([C_COR, NIV_Y[niveau] || NIV_Y.corps]) : SAG.at(U_NIV[niveau] ?? U_NIV.corps).p.map(f1));

  const TF = { 2: 0.12, 3: 0.3, 4: 0.5, 5: 0.86, 6: 1.12, 7: 1.6, '2-5': 0.5 };
  const rayon = m => {
    const mm = Math.max(0, ...[m.d1, m.d2, m.d3].map(v => parseFloat(String(v ?? '').replace(',', '.')) || 0));
    return Math.max(7, Math.min(34, 5 + (mm || 18) * 0.33));
  };

  /* Centre d'un myome entre muqueuse et séreuse selon son type FIGO */
  function placer(p, type, r) {
    let c, pedicule = null, rr = r;
    if (type === '0') { c = p.cav; pedicule = p.inn; rr = Math.min(r, dist(p.inn, p.cav) * 0.9); }
    else if (type === '1') c = lerp(p.inn, p.cav, 0.4);
    else if (TF[type] != null) c = lerp(p.inn, p.out, TF[type]);
    else c = lerp(p.inn, p.out, 0.5);                                 // type non précisé : dans la paroi
    if (type === '7') pedicule = p.out;
    if (type === '2-5') rr = Math.max(r, dist(p.inn, p.out) / 2 + 3);
    return { x: c[0], y: c[1], r: f1(rr), pedicule };
  }

  /* Position d'un myome dans une vue : { x, y, r, projete, pedicule: [x, y] | null } ou null */
  function position(m, v) {
    const k = ECHELLE[v], r = Math.max(6, rayon(m) * k);
    if (m.type === '8') {
      const s = SPECIAL[m.special] || SPECIAL.col;
      return s[v] ? { x: s[v][0], y: s[v][1], r: f1(Math.min(r, 22 * k)), projete: false, pedicule: null } : null;
    }
    const niveau = m.paroi === 'fundique' ? 'fundus' : (m.niveau || 'corps');
    const table = POS[v][m.paroi];
    if (!table) {
      // paroi non visible dans cette vue : projection en pointillés
      if (!m.paroi) return null;
      const [x, y] = centre(v, niveau);
      return { x, y, r: f1(Math.min(r, 26 * k)), projete: true, pedicule: null };
    }
    const p = table[niveau] || table.corps || table.fundus;
    return { ...placer(p, String(m.type ?? ''), r), projete: false };
  }

  /* Zone cliquée → { paroi, niveau } (ou { special: 'col' }) */
  function zone(x, y) {
    if (x > 560) {
      const [cx, cy] = corInv(x, y);
      if (Math.abs(cx - C_COR) > 150 || cy < 40 || cy > 350) return null;
      if (cy > 254) return { special: 'col' };
      const niveau = cy < 128 ? 'fundus' : cy < 198 ? 'corps' : 'isthme';
      const ddx = cx - C_COR;
      if (niveau === 'fundus' && Math.abs(ddx) < 42) return { paroi: 'fundique', niveau };
      return { paroi: ddx < 0 ? 'laterale-droite' : 'laterale-gauche', niveau };
    }
    if (y < 20 || y > 420) return null;
    // projection sur la partie « cavité » de l'axe : au-delà de l'orifice interne, c'est le col
    const q = SAG.projeter(x, y, U_CAVITE);
    if (q.u >= U_CAVITE - 1e-9 && q.long > 4) return { special: 'col' };
    if (q.u === 0 && q.long < 0 && Math.abs(q.lat) < -q.long * 0.9) return { paroi: 'fundique', niveau: 'fundus' };
    const niveau = q.u < U_LIM.corps ? 'fundus' : q.u < U_LIM.isthme ? 'corps' : 'isthme';
    return { paroi: q.lat > 0 ? 'posterieure' : 'anterieure', niveau };
  }

  /* Décale les myomes qui se chevauchent */
  function disperser(liste) {
    const placed = [];
    return liste.map(p => {
      if (!p) return p;
      let q = { ...p }, k = 0;
      while (placed.some(o => dist([o.x, o.y], [q.x, q.y]) < (o.r + q.r) * 0.75) && k < 6) {
        k += 1;
        const s = k % 2 ? 1 : -1, d = Math.ceil(k / 2) * (p.r + 6);
        q = { ...p, x: f1(p.x + (p.projete ? s * d : 0)), y: f1(p.y + (p.projete ? 0 : s * d * 0.8)) };
      }
      placed.push(q);
      return q;
    });
  }

  /* ---------- Dessin ---------- */
  const DEFS = `<defs>
    <linearGradient id="rhu-chair" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${CHAIR.haut}"/><stop offset="1" stop-color="${CHAIR.bas}"/></linearGradient>
    <radialGradient id="rhu-reflet" cx="35%" cy="30%" r="70%"><stop offset="0" stop-color="#fff" stop-opacity=".38"/><stop offset=".5" stop-color="#fff" stop-opacity=".06"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
    <filter id="rhu-ombre" x="-40%" y="-40%" width="180%" height="180%"><feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#1a0510" flood-opacity=".35"/></filter>
  </defs>`;

  /* Un myome : bulle colorée à liseré clair, numéro blanc ; pédicule éventuel */
  function bulle(p, col, lab, o = {}) {
    const k = o.k || 1;
    let g = '';
    if (p.pedicule) g += `<line x1="${p.pedicule[0]}" y1="${p.pedicule[1]}" x2="${p.x}" y2="${p.y}" stroke="${clair(col) ? INK : col}" stroke-width="${f1(Math.max(3, p.r * 0.32) * k)}" stroke-linecap="round" pointer-events="none"/>`;
    if (p.projete) {
      g += `<circle cx="${p.x}" cy="${p.y}" r="${p.r}" fill="${col}" fill-opacity=".3" stroke="${clair(col) ? INK : col}" stroke-width="2" stroke-dasharray="4 3" pointer-events="none"/>`;
      g += `<text x="${p.x}" y="${f1(p.y + 4)}" font-size="${p.r < 9 ? 9 : 11}" font-weight="900" text-anchor="middle" fill="${INK}" stroke="#fff" stroke-width="3" paint-order="stroke" pointer-events="none">${esc(lab)}</text>`;
      return g;
    }
    if (o.active) g += `<circle cx="${p.x}" cy="${p.y}" r="${f1(p.r + 4.5)}" fill="none" stroke="${INK}" stroke-width="3" pointer-events="none"/>`;
    g += `<circle cx="${p.x}" cy="${p.y}" r="${p.r}" fill="${col}" stroke="${clair(col) ? INK : pale(col)}" stroke-width="${f1(2.2 * k)}" filter="url(#rhu-ombre)" pointer-events="none"/>`;
    if (!clair(col)) g += `<circle cx="${p.x}" cy="${p.y}" r="${p.r}" fill="url(#rhu-reflet)" pointer-events="none"/>`;
    const fs = (o.size || (p.r < 9 ? 8.5 : p.r < 12 ? 10 : p.r > 20 ? 13 : 11.5)) * (lab.length > 2 ? 0.9 : 1);
    g += `<text x="${p.x}" y="${f1(p.y + fs * 0.36)}" font-size="${f1(fs)}" font-weight="800" text-anchor="middle" fill="${clair(col) ? INK : '#fff'}" pointer-events="none">${esc(lab)}</text>`;
    return g;
  }

  /* Utérus de la vue principale (silhouette, cavité, canal, repères de niveau) */
  function corps(G, o = {}) {
    let g = `<path d="${G.contour}" fill="url(#rhu-chair)" stroke="${o.bord || CHAIR.bord}" stroke-width="${o.trait || 2.4}" stroke-linejoin="round"${o.interactif ? ' data-u="sag" style="cursor:crosshair"' : ''}/>`;
    g += `<path d="${G.cavite}" fill="${CHAIR.cavite}" stroke="${CHAIR.endo}" stroke-width="${o.trait ? o.trait - 0.5 : 2}" pointer-events="none"/>`;
    g += `<path d="${G.canal}" fill="none" stroke="${CHAIR.cavite}" stroke-width="${f1(5 * G.s)}" stroke-linecap="round" pointer-events="none"/>`;
    if (o.reperes !== false) {
      g += `<g stroke="#fff" stroke-opacity="${o.reperes || 0.75}" stroke-width="1.3" stroke-dasharray="4 4" pointer-events="none">`;
      [U_LIM.corps, U_LIM.isthme].forEach(u => { const [a, b] = G.repere(u); g += `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}"/>`; });
      g += '</g>';
    }
    return g;
  }

  /*
   * svg(o) — o.myomes : [{ n, label?, type, paroi, niveau, special, d1, d2, d3, color, active }]
   * o.interactif : zones cliquables ; o.legende : [[libellé, couleur], …] ; o.projections (défaut true)
   */
  function svg(o = {}) {
    const myomes = o.myomes || [];
    let g = `${DEFS}<rect width="${W}" height="${H}" fill="#fff"/>`;
    // --- Vue principale (sagittale)
    g += corps(SAG, { interactif: o.interactif });
    Object.entries(U_NIV).forEach(([k, u]) => { const [a] = SAG.repere(u); g += txt(a[0], f1(a[1] - 8), k, { size: 10, weight: 700, fill: MUTED }); });
    g += txt(f1(SAG.col[0] + 14), f1(SAG.col[1] - 66), 'col', { size: 10, weight: 700, fill: MUTED });
    g += txt(14, 24, '◂ antérieur', { size: 10.5, weight: 800, fill: MUTED, anchor: 'start' });
    g += txt(282, 432, 'VUE SAGITTALE', { size: 12, weight: 900, ls: 1 });
    g += txt(282, 447, 'utérus antéversé : paroi postérieure en haut, antérieure en bas', { size: 9.5, weight: 600, fill: MUTED });
    // --- Vue coronale (médaillon)
    g += '<rect x="566" y="14" width="244" height="290" rx="14" fill="#faf7f9" stroke="#e6dbe2" stroke-width="1.5"/>';
    g += `<g transform="translate(${COR.dx} ${COR.dy}) scale(${COR.k})">`;
    g += `<path d="M70 118 C44 104 26 112 14 132 M330 118 C356 104 374 112 386 132" fill="none" stroke="${CHAIR.endo}" stroke-width="6" stroke-linecap="round"/>`;
    g += `<path d="${CORONALE.contour}" fill="url(#rhu-chair)" stroke="${CHAIR.bord}" stroke-width="3.6" stroke-linejoin="round"${o.interactif ? ' data-u="cor" style="cursor:crosshair"' : ''}/>`;
    g += `<path d="${CORONALE.cavite}" fill="${CHAIR.cavite}" stroke="${CHAIR.endo}" stroke-width="3" pointer-events="none"/>`;
    g += `<line x1="200" y1="238" x2="200" y2="336" stroke="${CHAIR.cavite}" stroke-width="6" stroke-linecap="round" pointer-events="none"/>`;
    g += '<g stroke="#fff" stroke-opacity=".75" stroke-width="2" stroke-dasharray="6 6" pointer-events="none"><line x1="72" y1="128" x2="328" y2="128"/><line x1="96" y1="198" x2="304" y2="198"/><line x1="150" y1="254" x2="250" y2="254"/></g>';
    g += '</g>';
    g += txt(580, 34, 'D', { size: 12, weight: 900, anchor: 'start' }) + txt(796, 34, 'G', { size: 12, weight: 900, anchor: 'end' });
    g += txt(688, 278, 'VUE CORONALE', { size: 11, weight: 900, ls: 1 });
    g += txt(688, 293, 'droite de la patiente à gauche', { size: 8.5, weight: 600, fill: MUTED });

    // --- Myomes
    const dessiner = v => {
      const pts = disperser(myomes.map(m => {
        const p = position(m, v);
        if (!p || (p.projete && o.projections === false)) return null;
        return { ...p, m };
      }));
      pts.forEach(p => { if (p) g += bulle(p, p.m.color || '#ffffff', String(p.m.label ?? p.m.n ?? ''), { active: !!p.m.active }); });
    };
    dessiner('sag');
    dessiner('cor');

    // --- Légende
    if (o.legende && o.legende.length) {
      let x = 20, y = 468;
      o.legende.forEach(([lab, c]) => {
        const w = lab.length * 6.6 + 32;
        if (x + w > W - 10) { x = 20; y += 18; }
        g += `<circle cx="${x + 7}" cy="${y - 4}" r="7" fill="${c}" stroke="${clair(c) ? INK : pale(c)}" stroke-width="1.6"/>` + txt(x + 18, y, lab, { size: 11, anchor: 'start' });
        x += w;
      });
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="${FONT}">${g}</svg>`;
  }

  /* ---------- Planche de la classification FIGO (fiche) ----------
     Même silhouette agrandie, sur fond sombre : un myome par type, légendé,
     étiquettes des catégories à gauche. */
  const PW = 900, PH = 600;
  const PG = vue(1.3, 168, 14);
  const PLANCHE = [
    // côté (+1 paroi postérieure, en haut ; −1 antérieure, en bas), position u le long de l'axe,
    // profondeur t (0 muqueuse → 1 séreuse ; < 0 : dans la cavité), rayon, libellé [dx, dy, ancrage]
    { type: '5', cote: 1, u: 0.04, t: 0.92, r: 27, texte: ['Sous-séreux,', '> 50 % intramural'], lab: [34, -30, 'start'] },
    { type: '4', cote: 1, u: 0.4, t: 0.5, r: 25, texte: ['100 % intramural'], lab: [33, 6, 'start'] },
    { type: '3', cote: 1, u: 0.72, t: 0.3, r: 24, texte: ['100 % intramural,', 'contact muqueux'], lab: [32, -4, 'start'] },
    { type: '0', cote: 1, u: 0.16, r: 21, texte: ['Intracavitaire', 'pédiculé'], lab: [-30, -6, 'end'] },
    { type: '1', cote: -1, u: 0.34, t: -0.5, r: 22, texte: ['< 50 % intramural'], lab: [-30, 22, 'end'] },
    { type: '2', cote: -1, u: 0.84, t: 0.08, r: 22, texte: ['> 50 % intramural'], lab: [32, 6, 'start'] },
    { type: '2-5', cote: -1, u: 0.6, r: 0, texte: ['Sous-muqueux et sous-séreux,', '> 50 % intramural (transmural)'], lab: [74, 44, 'start'] },
    { type: '6', cote: -1, u: 0.03, t: 1.14, r: 30, texte: ['Sous-séreux,', '< 50 % intramural'], lab: [-6, 54, 'middle'] },
    { type: '7', cote: -1, u: 0.3, t: 1.55, r: 25, texte: ['Sous-séreux pédiculé'], lab: [33, 6, 'start'] },
    { type: '8', col: true, r: 21, texte: ['Col, ligament large…'], lab: [30, 6, 'start'] },
  ];
  function planche(o = {}) {
    const couleur = o.couleur || (() => '#2f5fb3');
    let g = `${DEFS}<defs><radialGradient id="rhu-fond" cx="45%" cy="40%" r="75%"><stop offset="0" stop-color="#2a2933"/><stop offset="1" stop-color="#0d0d10"/></radialGradient></defs>`;
    g += `<rect width="${PW}" height="${PH}" rx="18" fill="url(#rhu-fond)"/>`;
    g += corps(PG, { bord: CHAIR.lisere, trait: 3, reperes: false });
    const items = PLANCHE.map(it => {
      let c;
      if (it.col) c = { x: PG.col[0], y: PG.col[1], r: it.r, pedicule: null };
      else {
        const p = PG.paroi(it.cote, it.u);
        if (it.type === '0') c = { ...placer(p, '0', it.r), r: it.r };
        else if (it.type === '2-5') c = placer(p, '2-5', 10);
        else {
          const q = it.t < 0 ? lerp(p.inn, p.cav, -it.t) : lerp(p.inn, p.out, it.t);
          c = { x: q[0], y: q[1], r: it.r, pedicule: it.type === '7' ? p.out : null };
        }
      }
      return { ...it, p: c };
    });
    // les plus gros d'abord (le transmural ne masque pas les autres)
    [...items].sort((a, b) => b.p.r - a.p.r).forEach(it => { g += bulle(it.p, couleur(it.type), it.type, { k: 1.3, size: it.type === '2-5' ? 22 : 18 }); });
    items.forEach(it => {
      const [dx, dy, anchor] = it.lab, x = f1(it.p.x + dx), y = f1(it.p.y + dy);
      it.texte.forEach((l, i) => { g += txt(x, f1(y + i * 18), l, { size: 15, weight: i ? 600 : 700, fill: '#fff', anchor, ombre: true }); });
    });
    // étiquettes des catégories, à gauche, près de leur groupe
    const etiquette = (lab, c, x, y) => {
      const w = lab.length * 9.4 + 30;
      return `<rect x="${x}" y="${y}" width="${f1(w)}" height="34" rx="9" fill="${c}"/>` + txt(f1(x + w / 2), y + 23, lab, { size: 16, weight: 800, fill: '#fff' });
    };
    const cat = o.categories || {};
    const pos = type => items.find(i => i.type === type).p;
    if (cat.interstitiel) g += etiquette(cat.interstitiel, couleur('4'), 40, f1(pos('5').y - 74));
    if (cat['sous-muqueux']) g += etiquette(cat['sous-muqueux'], couleur('0'), 26, f1(pos('0').y - 64));
    if (cat['sous-séreux']) g += etiquette(cat['sous-séreux'], couleur('6'), 26, f1(pos('6').y - 92));
    g += txt(PW - 24, PH - 20, 'Coupe sagittale, utérus antéversé : fundus à gauche, col et vagin à droite', { size: 11, weight: 600, fill: '#b9b8c6', anchor: 'end' });
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${PW} ${PH}" font-family="${FONT}">${g}</svg>`;
  }

  return { W, H, position, zone, svg, planche };
});
