/* =========================================================
   RadiologicHub — schéma sectoriel de la prostate (PI-RADS v2.1)
   ---------------------------------------------------------
   • 3 coupes axiales (base, tiers moyen, apex) : secteurs PZa,
     PZpl, PZpm, CZ (base), TZa, TZp, AS, à droite et à gauche,
     + vésicules séminales et sphincter urétral ;
   • vue SAGITTALE (antérieur à gauche) et vue CORONALE (droite du
     patient à gauche de l'image) : les lésions y sont projetées
     automatiquement d'après leurs secteurs (niveau, antérieur /
     postérieur, droite / gauche).
   Utilisé par le calculateur PI-RADS (cr-tools.js) et par la fiche
   « IRM de la prostate : diagnostic » (schéma légendé).
   Identifiants de secteur : « B-R-PZpl » (niveau-côté-zone),
   « SV-R », « SV-L », « US ».
   ========================================================= */

(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.RHProstate = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const W = 710, H = 624;
  const FONT = 'Montserrat, Arial, sans-serif', INK = '#111114', MUTED = '#55545f', RED_DASH = '#d63f4c';
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const txt = (x, y, s, o = {}) => `<text x="${x}" y="${y}" font-size="${o.size || 11}" font-weight="${o.weight || 700}" text-anchor="${o.anchor || 'middle'}" fill="${o.fill || INK}"${o.ls ? ` letter-spacing="${o.ls}"` : ''} pointer-events="none">${esc(s)}</text>`;
  const pin = (x, y, n, color, active) =>
    `<g pointer-events="none"><circle cx="${x}" cy="${y}" r="${active ? 12 : 10}" fill="${color}" stroke="${active ? INK : '#fff'}" stroke-width="${active ? 3 : 2}"/>${txt(x, y + 4, n, { size: 11, weight: 900, fill: '#fff' })}</g>`;

  const ZONES = {
    PZa: 'zone périphérique antérieure', PZpl: 'zone périphérique postérolatérale', PZpm: 'zone périphérique postéromédiale',
    CZ: 'zone centrale', TZa: 'zone de transition antérieure', TZp: 'zone de transition postérieure',
    AS: 'stroma fibromusculaire antérieur', SV: 'vésicule séminale', US: 'sphincter urétral (urètre membraneux)',
  };
  const NIVEAUX = { B: 'base', M: 'tiers moyen', A: 'apex' };
  const BASE_FILL = id => {
    const z = parse(id).zone;
    return z.startsWith('TZ') ? '#e3e7f1' : z === 'AS' ? '#efe9df' : z === 'CZ' ? '#ece4f1' : '#fbfbfb';
  };

  /* ---------- Coupes axiales : antérieur en haut, droite du patient à gauche ---------- */
  const PG = { rx: 92, ry: 68, cy: 190, cx: { B: 120, M: 355, A: 590 } };
  const ANG = {
    R: { PZpm: [90, 125], PZpl: [125, 175], PZa: [175, 215], AS: [215, 270], TZp: [90, 180], TZa: [180, 270] },
    L: { AS: [270, 325], PZa: [325, 365], PZpl: [365, 415], PZpm: [415, 450], TZa: [270, 360], TZp: [360, 450] },
  };
  const ept = (cx, cy, k, a) => {
    const r = a * Math.PI / 180;
    return [+(cx + PG.rx * k * Math.cos(r)).toFixed(1), +(cy + PG.ry * k * Math.sin(r)).toFixed(1)];
  };
  const ringPath = (cx, cy, k1, k2, a1, a2) => {
    const large = a2 - a1 > 180 ? 1 : 0;
    const [x1, y1] = ept(cx, cy, k2, a1), [x2, y2] = ept(cx, cy, k2, a2);
    const arc2 = `A${+(PG.rx * k2).toFixed(1)},${+(PG.ry * k2).toFixed(1)} 0 ${large} 1 ${x2},${y2}`;
    if (!k1) return `M${cx},${cy}L${x1},${y1}${arc2}Z`;
    const [x3, y3] = ept(cx, cy, k1, a2), [x4, y4] = ept(cx, cy, k1, a1);
    return `M${x1},${y1}${arc2}L${x3},${y3}A${+(PG.rx * k1).toFixed(1)},${+(PG.ry * k1).toFixed(1)} 0 ${large} 0 ${x4},${y4}Z`;
  };
  const SECTEURS = (() => {
    const out = [];
    const add = (lv, side, zone, k1, k2, a1, a2) => {
      const cx = PG.cx[lv];
      const [lx, ly] = ept(cx, PG.cy, k1 ? (k1 + k2) / 2 : 0.3, (a1 + a2) / 2);
      out.push({ id: `${lv}-${side}-${zone}`, lv, side, zone, d: ringPath(cx, PG.cy, k1, k2, a1, a2), lx, ly });
    };
    for (const lv of ['B', 'M', 'A']) {
      for (const side of ['R', 'L']) {
        for (const [zone, [a1, a2]] of Object.entries(ANG[side])) {
          if (zone.startsWith('TZ')) add(lv, side, zone, 0, 0.5, a1, a2);
          else if (lv === 'B' && zone === 'PZpm') { add(lv, side, 'CZ', 0.5, 0.75, a1, a2); add(lv, side, 'PZpm', 0.75, 1, a1, a2); }
          else add(lv, side, zone, 0.5, 1, a1, a2);
        }
      }
    }
    return out;
  })();
  const ORDRE = [...SECTEURS.map(s => s.id), 'SV-R', 'SV-L', 'US'];
  function parse(id) {
    if (id === 'US') return { zone: 'US', side: '', lv: '' };
    if (id.startsWith('SV-')) return { zone: 'SV', side: id.slice(3), lv: '' };
    const [lv, side, zone] = id.split('-');
    return { lv, side, zone };
  }
  const SV_AX = { 'SV-R': [PG.cx.B - 36, 80, -16], 'SV-L': [PG.cx.B + 36, 80, 16] };
  const US_AX = [PG.cx.A, 276];
  const axialPos = id => {
    const s = SECTEURS.find(x => x.id === id);
    if (s) return [s.lx, s.ly];
    return id === 'US' ? US_AX : SV_AX[id].slice(0, 2);
  };

  /* ---------- Vues sagittale et coronale (projection) ---------- */
  const NIV_Y = { B: 414, M: 471, A: 522 };          // centre de chaque niveau
  const COUPES_Y = [444, 498];                        // limites base / milieu / apex
  const SAG = {
    path: 'M132 392 C150 372 236 370 258 394 C272 444 242 512 198 550 C192 555 184 555 178 550 C140 516 114 452 132 392 Z',
    x: 196,                                           // limite antérieur / postérieur
    plage: { B: [140, 252], M: [130, 246], A: [164, 210] },
    frac: { AS: 0.1, PZa: 0.2, TZa: 0.36, TZp: 0.62, CZ: 0.8, PZpl: 0.8, PZpm: 0.9 },
    sv: [276, 356], us: [187, 565],
  };
  const COR = {
    path: 'M442 392 C456 372 584 372 598 392 C614 444 584 512 528 550 C523 554 517 554 512 550 C456 512 426 444 442 392 Z',
    x: 520,
    off: { AS: 8, TZa: 26, TZp: 30, CZ: 30, PZpm: 44, PZa: 62, PZpl: 66 },
    k: { B: 1, M: 0.92, A: 0.55 },
    sv: { R: [480, 352], L: [560, 352] }, us: [520, 565],
  };
  const ANTERIEUR = new Set(['AS', 'PZa', 'TZa']);
  const sagPos = id => {
    const p = parse(id);
    if (p.zone === 'SV') return SAG.sv;
    if (p.zone === 'US') return SAG.us;
    const [a, b] = SAG.plage[p.lv];
    return [+(a + (b - a) * SAG.frac[p.zone]).toFixed(1), NIV_Y[p.lv]];
  };
  const corPos = id => {
    const p = parse(id);
    if (p.zone === 'SV') return COR.sv[p.side];
    if (p.zone === 'US') return COR.us;
    const dx = COR.off[p.zone] * COR.k[p.lv] * (p.side === 'R' ? -1 : 1);
    return [+(COR.x + dx).toFixed(1), NIV_Y[p.lv]];
  };
  // Cellules colorées : niveau × antérieur / postérieur (sagittal), niveau × côté (coronal)
  const sagCell = id => { const p = parse(id); return p.lv ? `${p.lv}-${ANTERIEUR.has(p.zone) ? 'ant' : 'post'}` : id === 'US' ? 'US' : 'SV'; };
  const corCell = id => { const p = parse(id); return p.lv ? `${p.lv}-${p.side}` : id === 'US' ? 'US' : id; };
  const bande = lv => ({ B: [356, COUPES_Y[0]], M: COUPES_Y, A: [COUPES_Y[1], 580] }[lv]);
  const moyenne = pts => [+(pts.reduce((a, p) => a + p[0], 0) / pts.length).toFixed(1), +(pts.reduce((a, p) => a + p[1], 0) / pts.length).toFixed(1)];

  /*
   * svg(o) — o.lesions : [{ n, color, active, sectors: [ids] }] (la 1re lésion qui occupe un secteur le colore) ;
   * o.interactif : attributs data-s sur les secteurs axiaux, SV et US (clic) ;
   * o.legende : [[libellé, couleur], …] (bas du schéma) ; o.titreLegende ;
   * o.fondZone : (id) => couleur de fond d'un secteur libre (sinon couleurs neutres).
   */
  function svg(o = {}) {
    const lesions = o.lesions || [];
    const owner = {};
    lesions.forEach((l, i) => l.sectors.forEach(s => { if (!(s in owner)) owner[s] = i; }));
    const actif = lesions.findIndex(l => l.active);
    const fond = o.fondZone || BASE_FILL;
    const fill = id => owner[id] != null ? lesions[owner[id]].color : fond(id);
    const sw = id => owner[id] != null && owner[id] === actif ? 2.8 : 1.2;
    const data = id => o.interactif ? ` data-s="${id}"` : '';
    const label = id => ZONES[parse(id).zone] + (parse(id).side ? (parse(id).zone === 'AS' ? (parse(id).side === 'R' ? ' droit' : ' gauche') : (parse(id).side === 'R' ? ' droite' : ' gauche')) : '') + (parse(id).lv ? ` (${NIVEAUX[parse(id).lv]})` : '');

    let g = `<rect width="${W}" height="${H}" fill="#fff"/>`;
    // --- Coupes axiales
    for (const [lv, name] of [['B', 'BASE'], ['M', 'TIERS MOYEN'], ['A', 'APEX']]) {
      const cx = PG.cx[lv];
      g += txt(cx, 305, name, { size: 12, weight: 900, ls: 1 });
      g += txt(cx - PG.rx - 14, PG.cy + 4, 'D', { size: 12, weight: 900 }) + txt(cx + PG.rx + 14, PG.cy + 4, 'G', { size: 12, weight: 900 });
      g += txt(cx, PG.cy - PG.ry - 8, 'antérieur', { size: 8, weight: 600, fill: MUTED });
    }
    SECTEURS.forEach(s => {
      g += `<path d="${s.d}" fill="${fill(s.id)}" stroke="${INK}" stroke-width="${sw(s.id)}" stroke-linejoin="round"${data(s.id)}><title>${esc(label(s.id))}</title></path>`;
    });
    SECTEURS.forEach(s => { if (owner[s.id] == null) g += txt(s.lx, s.ly + 3, s.zone, { size: 7, weight: 600, fill: '#6a6975' }); });
    g += txt(PG.cx.B, 52, 'vésicules séminales', { size: 8, weight: 600, fill: MUTED });
    for (const [id, [x, y, rot]] of Object.entries(SV_AX)) {
      g += `<ellipse cx="${x}" cy="${y}" rx="31" ry="13" transform="rotate(${rot} ${x} ${y})" fill="${fill(id)}" stroke="${INK}" stroke-width="${sw(id)}"${data(id)}><title>${esc(label(id))}</title></ellipse>`;
    }
    g += `<circle cx="${US_AX[0]}" cy="${US_AX[1]}" r="10" fill="${fill('US')}" stroke="${INK}" stroke-width="${sw('US')}"${data('US')}><title>${esc(ZONES.US)}</title></circle>`;
    g += txt(PG.cx.A + 46, 279, 'sphincter', { size: 8, weight: 600, fill: MUTED });
    lesions.forEach((l, i) => {
      const first = [...l.sectors].sort((a, b) => ORDRE.indexOf(a) - ORDRE.indexOf(b))[0];
      if (first) g += pin(...axialPos(first), l.n ?? i + 1, l.color, !!l.active);
    });

    // --- Séparation et vues sagittale / coronale
    g += `<line x1="20" y1="322" x2="${W - 20}" y2="322" stroke="#d8d6de" stroke-width="1.5"/>`;
    g += `<defs><clipPath id="rhp-sag"><path d="${SAG.path}"/></clipPath><clipPath id="rhp-cor"><path d="${COR.path}"/></clipPath></defs>`;
    const cellFill = (cellOf, key) => {
      const i = lesions.findIndex(l => l.sectors.some(s => cellOf(s) === key));
      return i < 0 ? null : lesions[i].color;
    };
    // Sagittal
    g += `<ellipse cx="${SAG.sv[0]}" cy="${SAG.sv[1]}" rx="30" ry="10" transform="rotate(-32 ${SAG.sv[0]} ${SAG.sv[1]})" fill="${cellFill(sagCell, 'SV') || '#fbfbfb'}" stroke="${INK}" stroke-width="1.4"><title>Vésicules séminales</title></ellipse>`;
    g += `<path d="${SAG.path}" fill="${fond('M-R-PZpl')}"/>`;
    for (const lv of ['B', 'M', 'A']) {
      for (const [k, x0, x1] of [['ant', 90, SAG.x], ['post', SAG.x, 300]]) {
        const c = cellFill(sagCell, `${lv}-${k}`), [y0, y1] = bande(lv);
        if (c) g += `<rect x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}" fill="${c}" fill-opacity=".55" clip-path="url(#rhp-sag)"/>`;
      }
    }
    g += `<path d="M196 366 C188 420 178 470 187 556" fill="none" stroke="#c9c9d1" stroke-width="4" stroke-linecap="round"/>`;
    g += `<path d="M254 376 C238 410 214 450 192 470" fill="none" stroke="#b4b4bd" stroke-width="1.4"/>`;
    g += `<g stroke="${RED_DASH}" stroke-width="1.4" stroke-dasharray="5 4" clip-path="url(#rhp-sag)">${COUPES_Y.map(y => `<line x1="90" y1="${y}" x2="300" y2="${y}"/>`).join('')}<line x1="${SAG.x}" y1="356" x2="${SAG.x}" y2="580"/></g>`;
    g += `<path d="${SAG.path}" fill="none" stroke="${INK}" stroke-width="2"/>`;
    g += `<rect x="178" y="558" width="18" height="14" rx="4" fill="${cellFill(sagCell, 'US') || '#fbfbfb'}" stroke="${INK}" stroke-width="1.2"><title>${esc(ZONES.US)}</title></rect>`;
    [['Base', 420], ['Milieu', 474], ['Apex', 526]].forEach(([s, y]) => { g += txt(98, y, s, { size: 9, weight: 700, fill: MUTED, anchor: 'end' }); });
    g += txt(150, 404, 'AS', { size: 7, weight: 600, fill: '#6a6975' }) + txt(232, 404, 'CZ', { size: 7, weight: 600, fill: '#6a6975' }) + txt(226, 486, 'PZ', { size: 7, weight: 600, fill: '#6a6975' }) + txt(170, 486, 'TZ', { size: 7, weight: 600, fill: '#6a6975' });
    g += txt(138, 584, '← antérieur', { size: 8, weight: 600, fill: MUTED }) + txt(256, 584, 'postérieur →', { size: 8, weight: 600, fill: MUTED });
    g += txt(196, 600, 'VUE SAGITTALE', { size: 11, weight: 900, ls: 1 });
    // Coronal
    for (const s of ['R', 'L']) {
      const [x, y] = COR.sv[s];
      g += `<ellipse cx="${x}" cy="${y}" rx="30" ry="10" transform="rotate(${s === 'R' ? 22 : -22} ${x} ${y})" fill="${cellFill(corCell, 'SV-' + s) || '#fbfbfb'}" stroke="${INK}" stroke-width="1.4"><title>${esc(ZONES.SV + (s === 'R' ? ' droite' : ' gauche'))}</title></ellipse>`;
    }
    g += `<path d="${COR.path}" fill="${fond('M-R-PZpl')}"/>`;
    g += `<g clip-path="url(#rhp-cor)">${[[494], [546]].map(([x]) => `<ellipse cx="${x}" cy="448" rx="22" ry="40" fill="${fond('M-R-TZa')}" stroke="#b9bfd2"/>`).join('')}</g>`;
    for (const lv of ['B', 'M', 'A']) {
      for (const [k, x0, x1] of [['R', 410, COR.x], ['L', COR.x, 630]]) {
        const c = cellFill(corCell, `${lv}-${k}`), [y0, y1] = bande(lv);
        if (c) g += `<rect x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}" fill="${c}" fill-opacity=".55" clip-path="url(#rhp-cor)"/>`;
      }
    }
    g += `<line x1="${COR.x}" y1="366" x2="${COR.x}" y2="560" stroke="#c9c9d1" stroke-width="4" stroke-linecap="round"/>`;
    g += `<g stroke="${RED_DASH}" stroke-width="1.4" stroke-dasharray="5 4" clip-path="url(#rhp-cor)">${COUPES_Y.map(y => `<line x1="410" y1="${y}" x2="630" y2="${y}"/>`).join('')}</g>`;
    g += `<path d="${COR.path}" fill="none" stroke="${INK}" stroke-width="2"/>`;
    g += `<rect x="511" y="558" width="18" height="14" rx="4" fill="${cellFill(corCell, 'US') || '#fbfbfb'}" stroke="${INK}" stroke-width="1.2"><title>${esc(ZONES.US)}</title></rect>`;
    g += txt(424, 412, 'D', { size: 12, weight: 900 }) + txt(616, 412, 'G', { size: 12, weight: 900 });
    g += txt(494, 452, 'TZ', { size: 7, weight: 600, fill: '#6a6975' }) + txt(546, 452, 'TZ', { size: 7, weight: 600, fill: '#6a6975' }) + txt(452, 452, 'PZ', { size: 7, weight: 600, fill: '#6a6975' }) + txt(588, 452, 'PZ', { size: 7, weight: 600, fill: '#6a6975' });
    g += txt(COR.x, 600, 'VUE CORONALE', { size: 11, weight: 900, ls: 1 });
    // Repères des lésions projetés (moyenne des secteurs)
    lesions.forEach((l, i) => {
      if (!l.sectors.length) return;
      g += pin(...moyenne(l.sectors.map(sagPos)), l.n ?? i + 1, l.color, !!l.active);
      g += pin(...moyenne(l.sectors.map(corPos)), l.n ?? i + 1, l.color, !!l.active);
    });

    // --- Légende
    if (o.legende && o.legende.length) {
      let lx = 200;
      g += txt(150, 619, o.titreLegende || '', { size: 10, weight: 900, anchor: 'end' });
      for (const [lab, c] of o.legende) {
        g += `<rect x="${lx - 40}" y="609" width="14" height="12" rx="3" fill="${c}" stroke="${c === '#fbfbfb' || c === '#ffffff' ? '#9a99a6' : c}"/>` + txt(lx - 22, 619, lab, { size: 10, anchor: 'start' });
        lx += Math.max(60, lab.length * 7 + 34);
      }
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="${FONT}">${g}</svg>`;
  }

  return { W, H, ZONES, NIVEAUX, SECTEURS, ORDRE, parse, axialPos, sagPos, corPos, sagCell, corCell, svg };
});
