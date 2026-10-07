/* =========================================================
   RadiologicHub — schéma de l'utérus : cartographie FIGO des myomes
   ---------------------------------------------------------
   • vue CORONALE (droite de la patiente à gauche de l'image) : parois
     latérales et fundus ;
   • vue SAGITTALE d'un utérus antéversé (antérieur à gauche) : paroi
     antérieure en bas, contre la vessie, paroi postérieure en haut,
     fundus à gauche, col à droite.
   Chaque myome se place automatiquement d'après son type FIGO (profondeur
   entre la cavité et la séreuse), sa paroi et son niveau (fundus, corps,
   isthme) ; une paroi non visible dans une vue y est projetée en pointillés.
   planche() dessine la classification FIGO légendée (fiche « Le myome
   utérin »), sur la même vue sagittale.
   Utilisé par l'outil « FIGO » des comptes rendus (cr-tools.js) et par la
   fiche « Le myome utérin ».
   ========================================================= */

(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.RHUterus = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const W = 820, H = 452;
  const FONT = 'Montserrat, Arial, sans-serif', INK = '#111114', MUTED = '#55545f';
  const CHAIR = { haut: '#e7a9c8', bas: '#c97aa7', bord: '#86365f', cavite: '#4a1238', endo: '#f6c3da', trompe: '#dcaac4' };
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const txt = (x, y, s, o = {}) => `<text x="${x}" y="${y}" font-size="${o.size || 11}" font-weight="${o.weight || 700}" text-anchor="${o.anchor || 'middle'}" fill="${o.fill || INK}"${o.ls ? ` letter-spacing="${o.ls}"` : ''} pointer-events="none">${esc(s)}</text>`;
  const f1 = v => +v.toFixed(1);
  const lerp = (a, b, t) => [f1(a[0] + (b[0] - a[0]) * t), f1(a[1] + (b[1] - a[1]) * t)];
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  const clair = c => /^#(f{3}|f{6})$/i.test(c || '');

  /* Chemin lissé (Catmull-Rom → Bézier) passant par des points */
  function lisse(pts, ferme) {
    const n = pts.length, P = i => pts[ferme ? (i + n) % n : Math.max(0, Math.min(n - 1, i))];
    let d = `M${f1(pts[0][0])} ${f1(pts[0][1])}`;
    for (let i = 0; i < (ferme ? n : n - 1); i++) {
      const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
      d += ` C${f1(p1[0] + (p2[0] - p0[0]) / 6)} ${f1(p1[1] + (p2[1] - p0[1]) / 6)} ${f1(p2[0] - (p3[0] - p1[0]) / 6)} ${f1(p2[1] - (p3[1] - p1[1]) / 6)} ${f1(p2[0])} ${f1(p2[1])}`;
    }
    return d + (ferme ? ' Z' : '');
  }

  /* ---------- Vue coronale ---------- */
  const C_COR = 200;
  const NIV_Y = { fundus: 106, corps: 160, isthme: 222 };
  const CORONALE = {
    contour: 'M200 58 C280 58 330 82 332 132 C334 182 300 220 262 246 L242 262 L240 322 C240 332 232 338 224 338 L176 338 C168 338 160 332 160 322 L158 262 L138 246 C100 220 66 182 68 132 C70 82 120 58 200 58 Z',
    cavite: 'M152 104 Q200 118 248 104 Q236 172 204 238 L196 238 Q164 172 152 104 Z',
  };
  /* Pour chaque paroi et niveau : point de la muqueuse (inn), centre de la cavité (cav), séreuse (out) */
  const P = (inn, cav, out) => ({ inn, cav, out });
  const POS = {
    cor: {
      'laterale-droite': { fundus: P([160, 112], [184, 116], [86, 96]), corps: P([172, 160], [197, 160], [70, 160]), isthme: P([192, 220], [199, 222], [124, 228]) },
      'laterale-gauche': { fundus: P([240, 112], [216, 116], [314, 96]), corps: P([228, 160], [203, 160], [330, 160]), isthme: P([208, 220], [201, 222], [276, 228]) },
      fundique: { fundus: P([200, 112], [200, 128], [200, 58]) },
    },
  };

  /* ---------- Vue sagittale (utérus antéversé) ----------
     Axe de la cavité puis du canal cervical, du fundus au col :
     [x, y, demi-épaisseur postérieure (haut), antérieure (bas), demi-cavité haut, bas] */
  const AXE = [
    [100, 100, 86, 88, 20, 20],
    [165, 104, 90, 92, 22, 22],
    [240, 118, 82, 82, 18, 18],
    [305, 142, 52, 50, 5, 5],
    [370, 164, 40, 38, 2.5, 2.5],
    [440, 182, 38, 36, 2.5, 2.5],
  ];
  const U_NIV = { fundus: 0.09, corps: 0.36, isthme: 0.6, col: 0.82 };
  const U_LIM = { corps: 0.22, isthme: 0.5, col: 0.68 };            // début de chaque niveau le long de l'axe

  function geoSag(s, dx, dy) {
    const pts = AXE.map(([x, y, hu, hd, cu, cd]) => [dx + x * s, dy + y * s, hu * s, hd * s, cu * s, cd * s]);
    const cum = [0];
    for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const tot = cum[cum.length - 1];
    const brut = u => {                                   // interpolation de Catmull-Rom de toutes les grandeurs
      const L = Math.max(0, Math.min(1, u)) * tot;
      let i = 0;
      while (i < pts.length - 2 && cum[i + 1] < L) i++;
      const t = (L - cum[i]) / (cum[i + 1] - cum[i]);
      const q = k => pts[Math.max(0, Math.min(pts.length - 1, k))];
      const p0 = q(i - 1), p1 = q(i), p2 = q(i + 1), p3 = q(i + 2);
      return p1.map((_, k) => 0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t * t + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t * t * t));
    };
    const at = u => {
      const [x, y, hu, hd, cu, cd] = brut(u), a = brut(u - 0.01), b = brut(u + 0.01);
      const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const d = [(b[0] - a[0]) / l, (b[1] - a[1]) / l];
      return { p: [x, y], hu, hd, cu, cd, d, n: [d[1], -d[0]] };   // n : vers le haut = paroi postérieure
    };
    const off = (a, v, k) => [a.p[0] + v[0] * k, a.p[1] + v[1] * k];
    const N = 28;
    const cotes = (h, c) => {
      const haut = [], bas = [];
      for (let i = 0; i <= N; i++) { const a = at(i / N); haut.push(off(a, a.n, a[h])); bas.unshift(off(a, a.n, -a[c])); }
      return [haut, bas];
    };
    const calotte = (a, hu, hd, k = 1) => [150, 120, 90, 60, 30].map(deg => {
      const th = deg * Math.PI / 180, r = (hu * (1 + Math.cos(th)) / 2 + hd * (1 - Math.cos(th)) / 2) * k;
      return [a.p[0] + (a.n[0] * Math.cos(th) - a.d[0] * Math.sin(th)) * r, a.p[1] + (a.n[1] * Math.cos(th) - a.d[1] * Math.sin(th)) * r];
    });
    const a0 = at(0), a1 = at(1);
    const [hO, bO] = cotes('hu', 'hd');
    const contour = lisse([...hO, off(a1, a1.d, 5), ...bO, ...calotte(a0, a0.hu, a0.hd)], true);
    const [hC, bC] = cotes('cu', 'cd');
    const cavite = lisse([...hC, off(a1, a1.d, 4), ...bC, ...calotte(a0, a0.cu, a0.cd, 1.1)], true);
    const capO = (a0.hu + a0.hd) / 2, capC = (a0.cu + a0.cd) / 2 * 1.1;

    /* Paroi postérieure (côté +1, en haut) ou antérieure (−1, en bas) à la position u : muqueuse, cavité, séreuse */
    const paroi = (cote, u) => {
      const a = at(u), h = cote > 0 ? a.hu : a.hd, c = cote > 0 ? a.cu : a.cd;
      const v = [a.n[0] * cote, a.n[1] * cote];
      return P(off(a, v, c).map(f1), a.p.map(f1), off(a, v, h).map(f1));
    };
    const fond = () => P(off(a0, a0.d, -capC).map(f1), at(0.05).p.map(f1), off(a0, a0.d, -capO).map(f1));
    /* Point cliqué → { u, long, lat } (position le long de l'axe, écart le long de l'axe et latéral) */
    const projeter = (x, y) => {
      let best = null;
      for (let i = 0; i <= 120; i++) {
        const u = i / 120, a = at(u), dd = Math.hypot(x - a.p[0], y - a.p[1]);
        if (!best || dd < best.dd) best = { u, a, dd };
      }
      const v = [x - best.a.p[0], y - best.a.p[1]];
      return { u: best.u, long: v[0] * best.a.d[0] + v[1] * best.a.d[1], lat: v[0] * best.a.n[0] + v[1] * best.a.n[1], cap: capO };
    };
    return { s, at, contour, cavite, paroi, fond, projeter, capO };
  }

  /* Géométrie sagittale de l'outil (à droite de la vue coronale) */
  const SAG = geoSag(0.88, 409, 98);
  POS.sag = {
    anterieure: { fundus: SAG.paroi(-1, U_NIV.fundus), corps: SAG.paroi(-1, U_NIV.corps), isthme: SAG.paroi(-1, U_NIV.isthme) },
    posterieure: { fundus: SAG.paroi(1, U_NIV.fundus), corps: SAG.paroi(1, U_NIV.corps), isthme: SAG.paroi(1, U_NIV.isthme) },
    fundique: { fundus: SAG.fond() },
  };
  const colSag = SAG.paroi(-1, U_NIV.col);
  const SPECIAL = { col: { cor: [222, 298], sag: lerp(colSag.cav, colSag.out, 0.45) }, 'ligament-droit': { cor: [34, 196] }, 'ligament-gauche': { cor: [366, 196] }, parasite: { cor: [60, 372] } };
  const centre = (vue, niveau) => (vue === 'cor' ? [C_COR, NIV_Y[niveau] || NIV_Y.corps] : SAG.at(U_NIV[niveau] ?? U_NIV.corps).p.map(f1));

  const T = { 2: 0.12, 3: 0.3, 4: 0.5, 5: 0.86, 6: 1.12, 7: 1.6, '2-5': 0.5 };
  const rayon = m => {
    const mm = Math.max(0, ...[m.d1, m.d2, m.d3].map(v => parseFloat(String(v ?? '').replace(',', '.')) || 0));
    return Math.max(7, Math.min(34, 5 + (mm || 18) * 0.33));
  };

  /* Centre d'un myome entre muqueuse et séreuse selon son type FIGO */
  function placer(p, type, r) {
    let c, pedicule = null, rr = r;
    if (type === '0') { c = p.cav; pedicule = p.inn; rr = Math.min(r, 15); }
    else if (type === '1') c = lerp(p.inn, p.cav, 0.4);
    else if (T[type] != null) c = lerp(p.inn, p.out, T[type]);
    else c = lerp(p.inn, p.out, 0.5);                                 // type non précisé : dans la paroi
    if (type === '7') pedicule = lerp(p.inn, p.out, 1);
    if (type === '2-5') rr = Math.max(r, dist(p.inn, p.out) / 2 + 3);
    return { x: c[0], y: c[1], r: f1(rr), pedicule };
  }

  /* Position d'un myome dans une vue : { x, y, r, projete, pedicule: [x, y] | null } ou null */
  function position(m, vue) {
    const r = rayon(m);
    if (m.type === '8') {
      const s = SPECIAL[m.special] || SPECIAL.col;
      return s[vue] ? { x: s[vue][0], y: s[vue][1], r: Math.min(r, 22), projete: false, pedicule: null } : null;
    }
    const niveau = m.paroi === 'fundique' ? 'fundus' : (m.niveau || 'corps');
    const table = POS[vue][m.paroi];
    if (!table) {
      // paroi non visible dans cette vue : projection en pointillés
      if (!m.paroi) return null;
      const [x, y] = centre(vue, niveau);
      return { x, y, r: Math.min(r, 26), projete: true, pedicule: null };
    }
    const p = table[niveau] || table.corps || table.fundus;
    return { ...placer(p, String(m.type ?? ''), r), projete: false };
  }

  /* Zone cliquée → { paroi, niveau } (ou { special: 'col' }) */
  function zone(x, y) {
    if (y < 40 || y > 350) return null;
    if (Math.abs(x - C_COR) <= 150) {
      if (y > 254) return { special: 'col' };
      const niveau = y < 128 ? 'fundus' : y < 198 ? 'corps' : 'isthme';
      const dx = x - C_COR;
      if (niveau === 'fundus' && Math.abs(dx) < 42) return { paroi: 'fundique', niveau };
      return { paroi: dx < 0 ? 'laterale-droite' : 'laterale-gauche', niveau };
    }
    if (x < 400 || x > W) return null;
    const q = SAG.projeter(x, y);
    if (q.u >= U_LIM.col) return { special: 'col' };
    if (q.u === 0 && q.long < -0.45 * q.cap && Math.abs(q.lat) < 0.55 * q.cap) return { paroi: 'fundique', niveau: 'fundus' };
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
    <radialGradient id="rhu-reflet" cx="34%" cy="28%" r="72%"><stop offset="0" stop-color="#fff" stop-opacity=".6"/><stop offset=".42" stop-color="#fff" stop-opacity=".12"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
    <filter id="rhu-ombre" x="-40%" y="-40%" width="180%" height="180%"><feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#2a0a20" flood-opacity=".4"/></filter>
  </defs>`;

  /* Un myome : bulle colorée cerclée de blanc, reflet, numéro ; pédicule éventuel */
  function bulle(p, col, lab, o = {}) {
    const k = o.k || 1;
    let g = '';
    if (p.pedicule) g += `<line x1="${p.pedicule[0]}" y1="${p.pedicule[1]}" x2="${p.x}" y2="${p.y}" stroke="${clair(col) ? INK : col}" stroke-width="${5 * k}" stroke-linecap="round" pointer-events="none"/>`;
    if (p.projete) {
      g += `<circle cx="${p.x}" cy="${p.y}" r="${p.r}" fill="${col}" fill-opacity=".3" stroke="${clair(col) ? INK : col}" stroke-width="2" stroke-dasharray="4 3" pointer-events="none"/>`;
      g += `<text x="${p.x}" y="${p.y + 4}" font-size="11" font-weight="900" text-anchor="middle" fill="${INK}" stroke="#fff" stroke-width="3" paint-order="stroke" pointer-events="none">${esc(lab)}</text>`;
      return g;
    }
    if (o.active) g += `<circle cx="${p.x}" cy="${p.y}" r="${f1(p.r + 4.5)}" fill="none" stroke="${INK}" stroke-width="3" pointer-events="none"/>`;
    g += `<circle cx="${p.x}" cy="${p.y}" r="${p.r}" fill="${col}" stroke="${clair(col) ? INK : '#fff'}" stroke-width="${2.6 * k}" filter="url(#rhu-ombre)" pointer-events="none"/>`;
    g += `<circle cx="${p.x}" cy="${p.y}" r="${p.r}" fill="url(#rhu-reflet)" pointer-events="none"/>`;
    const fs = (o.size || (p.r < 10 ? 9 : p.r > 20 ? 13 : 11)) * (lab.length > 2 ? 0.92 : 1);
    g += `<text x="${p.x}" y="${f1(p.y + fs * 0.36)}" font-size="${f1(fs)}" font-weight="900" text-anchor="middle" fill="${clair(col) ? INK : '#fff'}" pointer-events="none">${esc(lab)}</text>`;
    return g;
  }

  /* Repères de niveau (tirets perpendiculaires à l'axe) et libellés, vue sagittale */
  function reperesSag(G, couleur, libelles, opacite = 0.8) {
    let g = `<g stroke="${couleur}" stroke-opacity="${opacite}" stroke-width="1.3" stroke-dasharray="4 4" pointer-events="none">`;
    Object.values(U_LIM).forEach(u => {
      const a = G.at(u), h = [a.p[0] + a.n[0] * (a.hu - 2), a.p[1] + a.n[1] * (a.hu - 2)], b = [a.p[0] - a.n[0] * (a.hd - 2), a.p[1] - a.n[1] * (a.hd - 2)];
      g += `<line x1="${f1(h[0])}" y1="${f1(h[1])}" x2="${f1(b[0])}" y2="${f1(b[1])}"/>`;
    });
    g += '</g>';
    if (libelles) Object.entries(U_NIV).forEach(([k, u]) => {
      const a = G.at(u), x = a.p[0] + a.n[0] * (a.hu + 12), y = a.p[1] + a.n[1] * (a.hu + 12);
      g += txt(f1(x), f1(y), k, libelles);
    });
    return g;
  }

  /*
   * svg(o) — o.myomes : [{ n, label?, type, paroi, niveau, special, d1, d2, d3, color, active }]
   * o.interactif : zones cliquables ; o.legende : [[libellé, couleur], …] ; o.projections (défaut true)
   */
  function svg(o = {}) {
    const myomes = o.myomes || [];
    let g = `${DEFS}<rect width="${W}" height="${H}" fill="#fff"/>`;
    // --- Vue coronale
    g += `<path d="M70 118 C44 104 26 112 14 132 M330 118 C356 104 374 112 386 132" fill="none" stroke="${CHAIR.trompe}" stroke-width="5" stroke-linecap="round"/>`;
    g += `<path d="${CORONALE.contour}" fill="url(#rhu-chair)" stroke="${CHAIR.bord}" stroke-width="2.4" stroke-linejoin="round"${o.interactif ? ' data-u="cor" style="cursor:crosshair"' : ''}/>`;
    g += `<path d="${CORONALE.cavite}" fill="${CHAIR.cavite}" stroke="${CHAIR.endo}" stroke-width="2" pointer-events="none"/>`;
    g += `<line x1="200" y1="238" x2="200" y2="336" stroke="${CHAIR.cavite}" stroke-width="4" stroke-linecap="round" pointer-events="none"/>`;
    g += `<g stroke="#fff" stroke-opacity=".8" stroke-width="1.3" stroke-dasharray="4 4" pointer-events="none"><line x1="72" y1="128" x2="328" y2="128"/><line x1="96" y1="198" x2="304" y2="198"/><line x1="150" y1="254" x2="250" y2="254"/></g>`;
    g += txt(14, 40, 'D', { size: 13, weight: 900, anchor: 'start' }) + txt(386, 40, 'G', { size: 13, weight: 900, anchor: 'end' });
    [['fundus', 88], ['corps', 168], ['isthme', 232], ['col', 300]].forEach(([s, y]) => { g += txt(34, y, s, { size: 10, weight: 700, fill: MUTED }); });
    g += txt(C_COR, 376, 'VUE CORONALE', { size: 12, weight: 900, ls: 1 });
    g += txt(C_COR, 354, 'droite de la patiente à gauche', { size: 9.5, weight: 600, fill: MUTED });
    // --- Vue sagittale (utérus antéversé)
    g += '<ellipse cx="530" cy="300" rx="92" ry="26" fill="#fbf1cf" stroke="#e3c66f" stroke-width="1.5"/>' + txt(530, 318, 'vessie', { size: 9.5, weight: 700, fill: '#a5862b' });
    g += `<path d="${SAG.contour}" fill="url(#rhu-chair)" stroke="${CHAIR.bord}" stroke-width="2.4" stroke-linejoin="round"${o.interactif ? ' data-u="sag" style="cursor:crosshair"' : ''}/>`;
    g += `<path d="${SAG.cavite}" fill="${CHAIR.cavite}" stroke="${CHAIR.endo}" stroke-width="2" pointer-events="none"/>`;
    g += reperesSag(SAG, '#fff', { size: 10, weight: 700, fill: MUTED });
    g += txt(424, 40, '◂ antérieur', { size: 10.5, weight: 800, fill: MUTED, anchor: 'start' }) + txt(806, 40, 'postérieur ▸', { size: 10.5, weight: 800, fill: MUTED, anchor: 'end' });
    g += txt(610, 376, 'VUE SAGITTALE', { size: 12, weight: 900, ls: 1 });
    g += txt(610, 354, 'paroi antérieure en bas, contre la vessie', { size: 9.5, weight: 600, fill: MUTED });

    // --- Myomes
    const dessiner = vue => {
      const pts = disperser(myomes.map(m => {
        const p = position(m, vue);
        if (!p || (p.projete && o.projections === false)) return null;
        return { ...p, m };
      }));
      pts.forEach(p => { if (p) g += bulle(p, p.m.color || '#ffffff', String(p.m.label ?? p.m.n ?? ''), { active: !!p.m.active }); });
    };
    dessiner('cor');
    dessiner('sag');

    // --- Légende
    if (o.legende && o.legende.length) {
      let x = 20, y = 404;
      o.legende.forEach(([lab, c]) => {
        const w = lab.length * 7.2 + 36;
        if (x + w > W - 10) { x = 20; y += 20; }
        g += `<circle cx="${x + 7}" cy="${y - 4}" r="7.5" fill="${c}" stroke="${INK}" stroke-width="1.2"/>` + txt(x + 19, y, lab, { size: 12, anchor: 'start' });
        x += w;
      });
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="${FONT}">${g}</svg>`;
  }

  /* ---------- Planche de la classification FIGO (fiche) ----------
     Vue sagittale agrandie, un myome par type, légendé. */
  const PW = 900, PH = 600;
  const PG = geoSag(1.5, 150, 118);
  const PLANCHE = [
    // paroi (+1 postérieure / −1 antérieure), position u le long de l'axe, profondeur t (0 muqueuse → 1 séreuse ; < 0 : dans la cavité),
    // rayon, libellé : décalage [dx, dy] depuis le centre et ancrage
    { type: '0', cote: 1, u: 0.15, r: 21, texte: ['Intracavitaire', 'pédiculé'], lab: [-30, -2, 'end'] },
    { type: '1', cote: -1, u: 0.28, t: -0.42, r: 22, texte: ['< 50 % intramural'], lab: [-30, 24, 'end'] },
    { type: '2', cote: 1, u: 0.46, t: 0.2, r: 24, texte: ['> 50 % intramural'], lab: [32, 4, 'start'] },
    { type: '3', cote: 1, u: 0.3, t: 0.3, r: 22, texte: ['Intramural,', 'contact muqueux'], lab: [30, -8, 'start'] },
    { type: '4', cote: 1, u: 0.13, t: 0.55, r: 23, texte: ['Intramural'], lab: [30, -16, 'start'] },
    { type: '5', cote: 1, u: 0.0, t: 0.9, r: 26, texte: ['Sous-séreux,', '> 50 % intramural'], lab: [-34, -22, 'end'] },
    { type: '6', cote: -1, u: 0.02, t: 1.15, r: 30, texte: ['Sous-séreux,', '< 50 % intramural'], lab: [-40, -4, 'end'] },
    { type: '7', cote: -1, u: 0.3, t: 1.95, r: 24, texte: ['Sous-séreux pédiculé'], lab: [34, 6, 'start'] },
    { type: '2-5', cote: -1, u: 0.44, t: 0.5, r: 0, texte: ['Transmural : sous-muqueux', 'et sous-séreux'], lab: [-36, 90, 'start'] },
    { type: '8', cote: 1, u: 0.9, t: 0.45, r: 20, texte: ['Col (cervical),', 'ligament large…'], lab: [0, -46, 'middle'] },
  ];
  function planche(o = {}) {
    const couleur = o.couleur || (() => '#3c67b8');
    let g = `${DEFS}<defs><radialGradient id="rhu-fond" cx="40%" cy="35%" r="80%"><stop offset="0" stop-color="#2b2a74"/><stop offset="1" stop-color="#111114"/></radialGradient></defs>`;
    g += `<rect width="${PW}" height="${PH}" rx="18" fill="url(#rhu-fond)"/>`;
    g += `<path d="${PG.contour}" fill="url(#rhu-chair)" stroke="#f3c4dc" stroke-width="3" stroke-linejoin="round"/>`;
    g += `<path d="${PG.cavite}" fill="${CHAIR.cavite}" stroke="${CHAIR.endo}" stroke-width="2.5"/>`;
    g += reperesSag(PG, '#fff', null, 0.45);
    const items = PLANCHE.map(it => {
      const p = PG.paroi(it.cote, it.u);
      let c;
      if (it.type === '0') c = { ...placer(p, '0', it.r), r: it.r };
      else if (it.type === '2-5') c = placer(p, '2-5', 10);
      else {
        const q = it.t < 0 ? lerp(p.inn, p.cav, -it.t) : lerp(p.inn, p.out, it.t);
        c = { x: q[0], y: q[1], r: it.r, pedicule: it.type === '7' ? p.out : null };
      }
      return { ...it, p: c };
    });
    // les plus gros d'abord (le transmural ne masque pas les autres)
    [...items].sort((a, b) => b.p.r - a.p.r).forEach(it => { g += bulle(it.p, couleur(it.type), it.type, { k: 1.2, size: it.type === '2-5' ? 19 : 17 }); });
    // libellés sur une pastille sombre (lisibles sur le fond comme sur l'utérus)
    items.forEach(it => {
      const [dx, dy, anchor] = it.lab, x = f1(it.p.x + dx), y = f1(it.p.y + dy);
      const w = Math.max(...it.texte.map((l, i) => l.length * (i ? 7.5 : 8.1))) + 16, h = it.texte.length * 17 + 9;
      const x0 = anchor === 'start' ? x - 8 : anchor === 'end' ? x - w + 8 : x - w / 2;
      g += `<rect x="${f1(x0)}" y="${f1(y - 17)}" width="${f1(w)}" height="${h}" rx="9" fill="#111114" fill-opacity=".55"/>`;
      it.texte.forEach((l, i) => { g += txt(x, f1(y + i * 17), l, { size: 14, weight: i ? 600 : 700, fill: '#fff', anchor }); });
    });
    // catégories
    let x = 24;
    (o.categories || []).forEach(([lab, c]) => {
      const w = lab.length * 8.2 + 28;
      g += `<rect x="${x}" y="22" width="${f1(w)}" height="30" rx="9" fill="${c}" stroke="#fff" stroke-width="1.5"/>` + txt(f1(x + w / 2), 42, lab, { size: 13, weight: 800, fill: '#fff' });
      x += w + 10;
    });
    g += txt(PW - 24, PH - 20, 'Vue sagittale, utérus antéversé : antérieur à gauche', { size: 11, weight: 600, fill: '#c9c8e6', anchor: 'end' });
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${PW} ${PH}" font-family="${FONT}">${g}</svg>`;
  }

  return { W, H, position, zone, svg, planche };
});
