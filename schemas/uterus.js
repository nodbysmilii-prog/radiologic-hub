/* =========================================================
   RadiologicHub — schéma de l'utérus : cartographie FIGO des myomes
   ---------------------------------------------------------
   • vue CORONALE (droite de la patiente à gauche de l'image) : parois
     latérales et fundus ;
   • vue SAGITTALE médiane (antérieur à gauche) : parois antérieure,
     postérieure et fundus.
   Chaque myome se place automatiquement d'après son type FIGO (profondeur
   entre la cavité et la séreuse), sa paroi et son niveau (fundus, corps,
   isthme) ; une paroi non visible dans une vue y est projetée en pointillés.
   Utilisé par l'outil « FIGO » des comptes rendus (cr-tools.js) et par la
   fiche « Le myome utérin ».
   ========================================================= */

(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.RHUterus = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const W = 760, H = 452;
  const FONT = 'Montserrat, Arial, sans-serif', INK = '#111114', MUTED = '#55545f';
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const txt = (x, y, s, o = {}) => `<text x="${x}" y="${y}" font-size="${o.size || 11}" font-weight="${o.weight || 700}" text-anchor="${o.anchor || 'middle'}" fill="${o.fill || INK}"${o.ls ? ` letter-spacing="${o.ls}"` : ''} pointer-events="none">${esc(s)}</text>`;

  /* ---------- Géométrie ---------- */
  const C = { cor: 200, sag: 560 };                       // axes des deux vues
  const NIV_Y = { fundus: 106, corps: 160, isthme: 222 };
  const CORONALE = {
    contour: 'M200 58 C280 58 330 82 332 132 C334 182 300 220 262 246 L242 262 L240 322 C240 332 232 338 224 338 L176 338 C168 338 160 332 160 322 L158 262 L138 246 C100 220 66 182 68 132 C70 82 120 58 200 58 Z',
    cavite: 'M152 104 Q200 118 248 104 Q236 172 204 238 L196 238 Q164 172 152 104 Z',
  };
  const SAGITTALE = {
    contour: 'M560 62 C630 62 668 92 668 140 C668 190 640 225 612 246 L602 262 L600 322 C600 332 594 338 586 338 L534 338 C526 338 520 332 520 322 L518 262 L508 246 C480 225 452 190 452 140 C452 92 490 62 560 62 Z',
  };
  /* Pour chaque vue, paroi et niveau : point de la muqueuse (inn), centre de la cavité (cav), séreuse (out) */
  const P = (inn, cav, out) => ({ inn, cav, out });
  const POS = {
    cor: {
      'laterale-droite': { fundus: P([160, 112], [184, 116], [86, 96]), corps: P([172, 160], [197, 160], [70, 160]), isthme: P([192, 220], [199, 222], [124, 228]) },
      'laterale-gauche': { fundus: P([240, 112], [216, 116], [314, 96]), corps: P([228, 160], [203, 160], [330, 160]), isthme: P([208, 220], [201, 222], [276, 228]) },
      fundique: { fundus: P([200, 112], [200, 128], [200, 58]) },
    },
    sag: {
      anterieure: { fundus: P([554, 116], [560, 118], [488, 94]), corps: P([553, 170], [560, 170], [453, 165]), isthme: P([555, 226], [560, 226], [500, 238]) },
      posterieure: { fundus: P([566, 116], [560, 118], [632, 94]), corps: P([567, 170], [560, 170], [667, 165]), isthme: P([565, 226], [560, 226], [620, 238]) },
      fundique: { fundus: P([560, 108], [560, 116], [560, 62]) },
    },
  };
  const SPECIAL = { col: { cor: [222, 298], sag: [578, 298] }, 'ligament-droit': { cor: [34, 196] }, 'ligament-gauche': { cor: [366, 196] }, parasite: { cor: [60, 372] } };
  const T = { 2: 0.12, 3: 0.3, 4: 0.5, 5: 0.86, 6: 1.12, 7: 1.6, '2-5': 0.5 };

  const lerp = (a, b, t) => [+(a[0] + (b[0] - a[0]) * t).toFixed(1), +(a[1] + (b[1] - a[1]) * t).toFixed(1)];
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  const rayon = m => {
    const mm = Math.max(0, ...[m.d1, m.d2, m.d3].map(v => parseFloat(String(v ?? '').replace(',', '.')) || 0));
    return Math.max(7, Math.min(34, 5 + (mm || 18) * 0.33));
  };

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
      return { x: C[vue] + (vue === 'cor' ? 0 : 0), y: NIV_Y[niveau] || NIV_Y.corps, r: Math.min(r, 26), projete: true, pedicule: null };
    }
    const p = table[niveau] || table.corps || table.fundus;
    const type = String(m.type ?? '');
    let c, pedicule = null, rr = r;
    if (type === '0') { c = p.cav; pedicule = p.inn; rr = Math.min(r, 15); }
    else if (type === '1') c = lerp(p.inn, p.cav, 0.4);
    else if (T[type] != null) c = lerp(p.inn, p.out, T[type]);
    else c = lerp(p.inn, p.out, 0.5);                                 // type non précisé : dans la paroi
    if (type === '7') pedicule = lerp(p.inn, p.out, 1);
    if (type === '2-5') rr = Math.max(r, dist(p.inn, p.out) / 2 + 3);
    return { x: c[0], y: c[1], r: +rr.toFixed(1), projete: false, pedicule };
  }

  /* Zone cliquée → { paroi, niveau } (ou { special: 'col' }) */
  function zone(x, y) {
    if (y < 40 || y > 350) return null;
    const vue = Math.abs(x - C.cor) <= 150 ? 'cor' : Math.abs(x - C.sag) <= 130 ? 'sag' : null;
    if (!vue) return null;
    if (y > 254) return { special: 'col' };
    const niveau = y < 128 ? 'fundus' : y < 198 ? 'corps' : 'isthme';
    const dx = x - C[vue];
    if (niveau === 'fundus' && Math.abs(dx) < 42) return { paroi: 'fundique', niveau };
    if (vue === 'cor') return { paroi: dx < 0 ? 'laterale-droite' : 'laterale-gauche', niveau };
    return { paroi: dx < 0 ? 'anterieure' : 'posterieure', niveau };
  }

  /* Décale les myomes qui se chevauchent (perpendiculairement à la paroi) */
  function disperser(liste) {
    const placed = [];
    return liste.map(p => {
      if (!p) return p;
      let q = { ...p }, k = 0;
      while (placed.some(o => dist([o.x, o.y], [q.x, q.y]) < (o.r + q.r) * 0.75) && k < 6) {
        k += 1;
        const s = k % 2 ? 1 : -1, d = Math.ceil(k / 2) * (p.r + 6);
        q = { ...p, x: +(p.x + (p.projete ? s * d : 0)).toFixed(1), y: +(p.y + (p.projete ? 0 : s * d * 0.8)).toFixed(1) };
      }
      placed.push(q);
      return q;
    });
  }

  /*
   * svg(o) — o.myomes : [{ n, label?, type, paroi, niveau, special, d1, d2, d3, color, active }]
   * o.interactif : zones cliquables ; o.legende : [[libellé, couleur], …] ; o.projections (défaut true)
   */
  function svg(o = {}) {
    const myomes = o.myomes || [];
    let g = `<rect width="${W}" height="${H}" fill="#fff"/>`;
    // --- Vue coronale
    g += '<path d="M70 118 C44 104 26 112 14 132 M330 118 C356 104 374 112 386 132" fill="none" stroke="#b4b4bd" stroke-width="3" stroke-linecap="round"/>';
    g += `<path d="${CORONALE.contour}" fill="#f6e4e6" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"${o.interactif ? ' data-u="cor" style="cursor:crosshair"' : ''}/>`;
    g += `<path d="${CORONALE.cavite}" fill="#f3b6c0" stroke="#d98a97" stroke-width="1.5" pointer-events="none"/>`;
    g += '<line x1="200" y1="238" x2="200" y2="336" stroke="#d98a97" stroke-width="4" stroke-linecap="round" pointer-events="none"/>';
    g += `<g stroke="#9a99a6" stroke-width="1.2" stroke-dasharray="4 4" pointer-events="none"><line x1="72" y1="128" x2="328" y2="128"/><line x1="96" y1="198" x2="304" y2="198"/><line x1="150" y1="254" x2="250" y2="254"/></g>`;
    g += txt(14, 40, 'D', { size: 13, weight: 900, anchor: 'start' }) + txt(386, 40, 'G', { size: 13, weight: 900, anchor: 'end' });
    [['fundus', 120], ['corps', 168], ['isthme', 232], ['col', 300]].forEach(([s, y]) => { g += txt(421, y, s, { size: 10, weight: 700, fill: MUTED }); });
    g += txt(C.cor, 376, 'VUE CORONALE', { size: 12, weight: 900, ls: 1 });
    // --- Vue sagittale
    g += `<path d="${SAGITTALE.contour}" fill="#f6e4e6" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"${o.interactif ? ' data-u="sag" style="cursor:crosshair"' : ''}/>`;
    g += '<ellipse cx="560" cy="172" rx="7" ry="66" fill="#f3b6c0" stroke="#d98a97" stroke-width="1.5" pointer-events="none"/>';
    g += '<line x1="560" y1="238" x2="560" y2="336" stroke="#d98a97" stroke-width="4" stroke-linecap="round" pointer-events="none"/>';
    g += `<g stroke="#9a99a6" stroke-width="1.2" stroke-dasharray="4 4" pointer-events="none"><line x1="456" y1="128" x2="664" y2="128"/><line x1="470" y1="198" x2="650" y2="198"/><line x1="512" y1="254" x2="608" y2="254"/></g>`;
    g += txt(474, 40, 'antérieur', { size: 10.5, weight: 800, fill: MUTED }) + txt(648, 40, 'postérieur', { size: 10.5, weight: 800, fill: MUTED });
    g += txt(C.sag, 376, 'VUE SAGITTALE', { size: 12, weight: 900, ls: 1 });
    g += txt(C.cor, 354, 'droite de la patiente à gauche', { size: 9.5, weight: 600, fill: MUTED }) + txt(C.sag, 354, 'coupe médiane', { size: 9.5, weight: 600, fill: MUTED });

    // --- Myomes
    const dessiner = vue => {
      const pts = disperser(myomes.map(m => {
        const p = position(m, vue);
        if (!p || (p.projete && o.projections === false)) return null;
        return { ...p, m };
      }));
      pts.forEach(p => {
        if (!p) return;
        const m = p.m, col = m.color || '#ffffff', act = !!m.active;
        if (p.pedicule) g += `<line x1="${p.pedicule[0]}" y1="${p.pedicule[1]}" x2="${p.x}" y2="${p.y}" stroke="${col === '#ffffff' ? INK : col}" stroke-width="4" stroke-linecap="round" pointer-events="none"/>`;
        g += `<circle cx="${p.x}" cy="${p.y}" r="${p.r}" fill="${col}" fill-opacity="${p.projete ? 0.25 : 0.88}" stroke="${act ? INK : p.projete ? col : '#111114'}" stroke-width="${act ? 3.2 : 1.6}"${p.projete ? ' stroke-dasharray="4 3"' : ''} pointer-events="none"/>`;
        const lab = m.label ?? m.n;
        g += `<text x="${p.x}" y="${p.y + 4}" font-size="${p.r < 10 ? 9 : 11}" font-weight="900" text-anchor="middle" fill="${p.projete ? INK : '#fff'}" stroke="${p.projete ? '#fff' : 'none'}" stroke-width="${p.projete ? 3 : 0}" paint-order="stroke" pointer-events="none">${esc(lab)}</text>`;
      });
    };
    dessiner('cor');
    dessiner('sag');

    // --- Légende
    if (o.legende && o.legende.length) {
      let x = 20, y = 404;
      o.legende.forEach(([lab, c]) => {
        const w = lab.length * 7.2 + 36;
        if (x + w > W - 10) { x = 20; y += 20; }
        g += `<circle cx="${x + 7}" cy="${y - 4}" r="7" fill="${c}" stroke="${INK}" stroke-width="1.2"${c === 'none' ? ' fill-opacity="0" stroke-dasharray="3 2"' : ''}/>` + txt(x + 19, y, lab, { size: 12, anchor: 'start' });
        x += w;
      });
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="${FONT}">${g}</svg>`;
  }

  /* Démonstration (fiche) : un myome par type FIGO, numéroté par son type */
  const DEMO = [
    { label: '0', type: '0', paroi: 'laterale-droite', niveau: 'fundus', d1: 14 },
    { label: '1', type: '1', paroi: 'laterale-gauche', niveau: 'corps', d1: 18 },
    { label: '3', type: '3', paroi: 'laterale-droite', niveau: 'isthme', d1: 14 },
    { label: '4', type: '4', paroi: 'laterale-gauche', niveau: 'isthme', d1: 16 },
    { label: '5', type: '5', paroi: 'laterale-droite', niveau: 'fundus', d1: 22 },
    { label: '6', type: '6', paroi: 'laterale-gauche', niveau: 'fundus', d1: 22 },
    { label: '7', type: '7', paroi: 'fundique', niveau: 'fundus', d1: 22 },
    { label: '8', type: '8', special: 'col', d1: 14 },
    { label: '2', type: '2', paroi: 'anterieure', niveau: 'corps', d1: 22 },
    { label: '2-5', type: '2-5', paroi: 'posterieure', niveau: 'corps', d1: 30 },
  ];

  return { W, H, position, zone, svg, DEMO };
});
