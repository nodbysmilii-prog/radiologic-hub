/* =========================================================
   RadiologicHub — schéma de l'arbre coronaire (coroscanner)
   ---------------------------------------------------------
   Arbre coronaire « à plat » en 18 segments (modèle SCCT), dessiné
   selon la dominance :
   • droite : l'interventriculaire postérieure (IVP) et la
     rétroventriculaire gauche (RVG) naissent de la coronaire droite ;
   • gauche : elles naissent de la circonflexe (coronaire droite grêle) ;
   • codominance : IVP issue de la coronaire droite, RVG de la
     circonflexe.
   Couleurs par territoire : coronaire droite (rouge), IVA (bleu),
   circonflexe (vert), tronc commun (gris). Chaque segment est cliquable
   (attribut data-seg) ; les lésions s'affichent en pastilles numérotées.
   Pontages : chaque greffon part de son origine (AMIG à droite de
   l'image, AMID à gauche, gastro-épiploïque par en bas, greffons libres
   depuis l'aorte ascendante ou en Y sur l'AMIG) et rejoint son ou ses
   artères receveuses (montage séquentiel) ; artériel en orange, veineux
   en violet, en pointillés s'il est occlus.
   Utilisé par l'outil « CAD-RADS » des comptes rendus (cr-tools.js).
   Module sans dépendance au navigateur (testé sous Node :
   tests/cadrads.test.js).
   ========================================================= */

(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.RHCoronaires = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const W = 600, H = 470;
  const FONT = 'Montserrat, Arial, sans-serif', INK = '#111114', MUTED = '#55545f';
  const COUL = { CD: '#d4174a', IVA: '#3c67b8', Cx: '#2a9d8f', TC: '#3f3d56' };
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const txt = (x, y, s, o = {}) => `<text x="${x}" y="${y}" font-size="${o.size || 11}" font-weight="${o.weight || 800}" text-anchor="${o.anchor || 'middle'}" fill="${o.fill || INK}"${o.halo ? ' stroke="#fff" stroke-width="3.5" paint-order="stroke" stroke-linejoin="round"' : ''} pointer-events="none">${esc(s)}</text>`;
  const CRUX = [300, 392];

  /* Courbes de Bézier cubiques [P0, P1, P2, P3] ; v = territoire ; ep = épaisseur */
  const B = (a, b, c, d) => [a, b, c, d];
  const GEO = {
    1: { v: 'CD', ep: 7, d: B([276, 60], [230, 70], [182, 80], [150, 106]) },
    2: { v: 'CD', ep: 7, d: B([150, 106], [116, 142], [100, 190], [106, 240]) },
    3: { v: 'CD', ep: 7, d: B([106, 240], [122, 310], [200, 375], CRUX), gauche: B([106, 240], [114, 282], [134, 312], [168, 336]) },
    4: { v: 'CD', ep: 5, d: B(CRUX, [302, 412], [304, 430], [306, 452]) },
    16: { v: 'CD', ep: 5, d: B(CRUX, [345, 401], [390, 398], [432, 382]) },
    5: { v: 'TC', ep: 8, d: B([324, 60], [336, 70], [346, 82], [356, 94]) },
    6: { v: 'IVA', ep: 7, d: B([356, 94], [357, 120], [353, 145], [349, 170]) },
    7: { v: 'IVA', ep: 6, d: B([349, 170], [344, 210], [337, 245], [331, 280]) },
    8: { v: 'IVA', ep: 5, d: B([331, 280], [326, 310], [319, 335], [313, 360]) },
    9: { v: 'IVA', ep: 4, d: B([353, 140], [376, 156], [398, 178], [414, 206]) },
    10: { v: 'IVA', ep: 4, d: B([340, 232], [362, 250], [380, 270], [392, 298]) },
    17: { v: 'Cx', ep: 4, d: B([356, 94], [384, 112], [404, 134], [420, 166]) },
    11: { v: 'Cx', ep: 7, d: B([356, 94], [400, 90], [452, 98], [486, 124]) },
    12: { v: 'Cx', ep: 4, d: B([466, 112], [472, 150], [474, 182], [474, 218]) },
    13: { v: 'Cx', ep: 6, d: B([486, 124], [520, 164], [528, 236], [512, 300]), codominance: B([486, 124], [526, 176], [528, 286], [470, 346]), gauche: B([486, 124], [542, 200], [472, 392], CRUX) },
    14: { v: 'Cx', ep: 4, d: B([522, 206], [506, 232], [494, 254], [484, 282]) },
    15: { v: 'Cx', ep: 5, d: B(CRUX, [302, 412], [304, 430], [306, 452]) },
    18: { v: 'Cx', ep: 5, d: B([470, 346], [440, 374], [402, 392], [366, 398]), gauche: B([412, 384], [420, 402], [426, 420], [430, 440]) },
  };
  const ORDRE = [1, 2, 3, 4, 16, 5, 6, 7, 8, 9, 10, 17, 11, 12, 13, 14, 15, 18];
  const TRONCS = [1, 2, 3, 5, 6, 7, 8, 11, 13];

  const chemin = p => `M${p[0].join(' ')} C${p[1].join(' ')} ${p[2].join(' ')} ${p[3].join(' ')}`;
  const point = (p, t) => {
    const u = 1 - t;
    return [0, 1].map(k => +(u * u * u * p[0][k] + 3 * u * u * t * p[1][k] + 3 * u * t * t * p[2][k] + t * t * t * p[3][k]).toFixed(1));
  };
  // Branche rattachée à un point de la circonflexe (t) : départ exact quelle que soit la dominance
  const branche = (depart, dx, dy) => B(depart, [depart[0] + dx * 0.3, depart[1] + dy * 0.3], [depart[0] + dx * 0.65, depart[1] + dy * 0.68], [depart[0] + dx, depart[1] + dy]);
  const forme = (n, dominance) => {
    const g = GEO[n];
    if (n === 14) return dominance === 'gauche' ? branche(point(forme(13, 'gauche'), 0.3), -68, 30) : branche(point(forme(13, dominance), dominance === 'droite' ? 0.42 : 0.36), -36, 74);
    if (n === 18 && dominance === 'gauche') return branche(point(forme(13, 'gauche'), 0.72), 16, 56);
    return (dominance && g[dominance]) || g.d;
  };

  /* Segments dessinés selon la dominance (mêmes règles que regles/cadrads.js) */
  function segments(dominance = 'droite', bissectrice = false) {
    return ORDRE.filter(n => {
      if (n === 17) return !!bissectrice;
      if (n === 4) return dominance !== 'gauche';
      if (n === 16) return dominance === 'droite';
      if (n === 15) return dominance === 'gauche';
      if (n === 18) return dominance !== 'droite';
      return true;
    });
  }

  /* Position d'une pastille de lésion sur un segment (i-ème lésion du segment sur k) */
  function position(seg, dominance = 'droite', i = 0, k = 1) {
    if (!GEO[seg]) return null;
    return point(forme(seg, dominance), k > 1 ? 0.3 + 0.4 * i / (k - 1) : 0.5);
  }

  /* ---------- Pontages ---------- */
  const PONT = {
    amig: { court: 'AMIG', type: 'arteriel', origine: [592, 92] },
    amid: { court: 'AMID', type: 'arteriel', origine: [8, 118] },
    gep: { court: 'GEP', type: 'arteriel', origine: [214, 468] },
    radiale: { court: 'Radiale', type: 'arteriel', origine: null },
    saphene: { court: 'Saphène', type: 'veineux', origine: null },
  };
  const COUL_PONT = { arteriel: '#f18d25', veineux: '#6b0d8c' };
  // Courbe douce d'un point à un autre (d'abord dans le sens horizontal, puis vers la cible)
  const arc = (a, b) => B(a, [+(a[0] + (b[0] - a[0]) * 0.6).toFixed(1), a[1]], [b[0], +(b[1] - (b[1] - a[1]) * 0.4).toFixed(1)], b);
  /* Tracés d'un pontage : [{ d: courbe, cible: [x, y] }] ; amig : tracé de l'AMIG pour un montage en Y */
  function tracePontage(p, dominance, amig) {
    const def = PONT[p.greffon];
    if (!def) return [];
    const cibles = (p.cibles || []).map(Number).filter(n => GEO[n]).map(n => point(forme(n, dominance), 0.6));
    if (!cibles.length) return [];
    let o = def.origine;
    const inferieure = cibles[0][1] > 330;                               // face inférieure : IVP, RVG, CD distale
    if (p.montage === 'y' && amig) o = point(amig, 0.45);
    else if (!o) o = cibles[0][0] < 300 || inferieure ? [266, 40] : [334, 40];   // anastomose proximale sur l'aorte ascendante
    const traces = [];
    cibles.forEach((c, i) => {
      const a = i ? cibles[i - 1] : o;
      // Greffon libre vers la face inférieure : il contourne le bord droit du cœur (à gauche de l'image)
      const d = !i && !def.origine && p.montage !== 'y' && inferieure ? B(a, [104, 112], [22, c[1] + 40], c) : arc(a, c);
      traces.push({ d, cible: c });
    });
    return traces;
  }

  const ETIQ = { droite: 'Dominance droite', gauche: 'Dominance gauche', codominance: 'Codominance' };
  const EXPL = {
    droite: 'IVP et RVG naissent de la coronaire droite',
    gauche: 'IVP et RVG naissent de la circonflexe',
    codominance: 'IVP issue de la CD, RVG issue de la Cx',
  };

  /* o : { dominance, bissectrice, live, lesions: [{ seg, couleur }], actif, numeros } */
  function svg(o = {}) {
    const dom = ETIQ[o.dominance] ? o.dominance : 'droite';
    const live = !!o.live;
    const segs = segments(dom, o.bissectrice);
    let g = `<rect width="${W}" height="${H}" fill="#fff"/>`;
    // Silhouette du cœur et sillons
    g += `<path d="M300 72 C420 60 552 146 524 278 C500 372 392 438 304 456 C214 438 106 372 82 280 C54 150 178 62 300 72 Z" fill="#fdf1f2" stroke="#efd2d6" stroke-width="2" pointer-events="none"/>`;
    g += `<path d="M300 392 C300 300 330 180 356 94" fill="none" stroke="#e7c7cc" stroke-width="2" stroke-dasharray="6 6" pointer-events="none"/>`;
    // Aorte
    g += `<rect x="266" y="16" width="68" height="48" rx="14" fill="#fff" stroke="${INK}" stroke-width="2.5"/>` + txt(300, 45, 'AORTE', { size: 11, weight: 900 });
    // Segments : contour sombre, couleur du territoire, zone de clic élargie
    segs.forEach(n => {
      const p = forme(n, dom), d = chemin(p), c = COUL[GEO[n].v], ep = GEO[n].ep;
      g += `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${ep + 3}" stroke-linecap="round" pointer-events="none"/>`;
      g += `<path d="${d}" fill="none" stroke="${c}" stroke-width="${ep}" stroke-linecap="round" pointer-events="none"/>`;
    });
    // Zones de clic : branches d'abord, troncs ensuite (au-dessus), pour qu'un clic sur un tronc ne tombe pas sur la branche qui en naît
    if (live) [...segs].sort((a, b) => (TRONCS.includes(a) ? 1 : 0) - (TRONCS.includes(b) ? 1 : 0)).forEach(n => {
      g += `<path d="${chemin(forme(n, dom))}" fill="none" stroke="transparent" stroke-width="20" stroke-linecap="round" data-seg="${n}" style="cursor:pointer"><title>Segment ${n}</title></path>`;
    });
    // Numéros des segments
    const T_NUM = { 13: 0.72, 14: 0.74 };   // décalés pour ne pas se chevaucher au départ de M2
    if (o.numeros !== false) segs.forEach(n => {
      const [x, y] = point(forme(n, dom), T_NUM[n] || 0.5);
      g += `<g pointer-events="none"><circle cx="${x}" cy="${y}" r="9" fill="#fff" stroke="${COUL[GEO[n].v]}" stroke-width="2"/>${txt(x, y + 3.6, n, { size: 9, weight: 900 })}</g>`;
    });
    // Noms des artères
    g += txt(122, 150, 'CD', { size: 14, weight: 900, fill: COUL.CD, anchor: 'end', halo: 1 });
    g += txt(372, 62, 'TC', { size: 12, weight: 900, fill: COUL.TC, anchor: 'start', halo: 1 });
    g += txt(330, 222, 'IVA', { size: 14, weight: 900, fill: COUL.IVA, anchor: 'end', halo: 1 });
    g += txt(446, 86, 'Cx', { size: 14, weight: 900, fill: COUL.Cx, halo: 1 });
    g += txt(420, 222, 'D1', { size: 10, fill: COUL.IVA, halo: 1 }) + txt(396, 314, 'D2', { size: 10, fill: COUL.IVA, halo: 1 });
    const m2 = forme(14, dom)[3];
    g += txt(462, 186, 'M1', { size: 10, fill: COUL.Cx, anchor: 'end', halo: 1 }) + txt(m2[0] - 4, m2[1] + 16, 'M2', { size: 10, fill: COUL.Cx, halo: 1 });
    if (o.bissectrice) g += txt(428, 178, 'Bissectrice', { size: 9.5, fill: COUL.Cx, anchor: 'start', halo: 1 });
    g += txt(316, 462, 'IVP', { size: 11, weight: 900, fill: dom === 'gauche' ? COUL.Cx : COUL.CD, anchor: 'start', halo: 1 });
    const fin18 = dom === 'droite' ? null : forme(18, dom)[3];
    const rvg = dom === 'droite' ? [440, 376] : dom === 'gauche' ? [fin18[0] + 8, fin18[1] + 12] : [356, 418];
    g += txt(rvg[0], rvg[1], 'RVG', { size: 11, weight: 900, fill: dom === 'droite' ? COUL.CD : COUL.Cx, anchor: dom === 'codominance' ? 'end' : 'start', halo: 1 });
    // Croix des sillons (crux)
    g += `<circle cx="${CRUX[0]}" cy="${CRUX[1]}" r="4" fill="${INK}" pointer-events="none"/>` + txt(292, 414, 'crux', { size: 9, weight: 700, fill: MUTED, anchor: 'end', halo: 1 });
    // Cartouche : dominance
    g += `<rect x="12" y="12" width="232" height="54" rx="12" fill="#fff" stroke="${INK}" stroke-width="2"/>`;
    g += txt(24, 34, ETIQ[dom].toUpperCase(), { size: 12, weight: 900, anchor: 'start' });
    g += txt(24, 52, EXPL[dom], { size: 9.5, weight: 700, fill: MUTED, anchor: 'start' });
    // Légende des territoires
    [['Coronaire droite', COUL.CD], ['IVA', COUL.IVA], ['Circonflexe', COUL.Cx], ['Tronc commun', COUL.TC]].forEach(([l, c], i) => {
      const y = 400 + i * 17;
      g += `<rect x="16" y="${y - 9}" width="20" height="8" rx="4" fill="${c}" stroke="${INK}" stroke-width="1"/>` + txt(42, y, l, { size: 10, weight: 700, anchor: 'start' });
    });
    // Pontages (sous les pastilles des lésions)
    const ponts = (o.pontages || []).filter(p => PONT[p.greffon]);
    if (ponts.length) {
      const amigP = ponts.find(p => p.greffon === 'amig' && p.montage !== 'y');
      const amigTrace = amigP ? (tracePontage(amigP, dom)[0] || {}).d : null;
      ponts.forEach((p, i) => {
        const def = PONT[p.greffon], col = COUL_PONT[def.type];
        const traces = tracePontage(p, dom, amigTrace);
        traces.forEach(t => {
          const d = chemin(t.d);
          g += `<path d="${d}" fill="none" stroke="${INK}" stroke-width="8" stroke-linecap="round" pointer-events="none"${p.occlus ? ' stroke-dasharray="1 0" opacity=".55"' : ''}/>`;
          g += `<path d="${d}" fill="none" stroke="${col}" stroke-width="5" stroke-linecap="round" pointer-events="none"${p.occlus ? ' stroke-dasharray="7 6"' : ''}/>`;
          g += `<circle cx="${t.cible[0]}" cy="${t.cible[1]}" r="6.5" fill="${p.couleur || col}" stroke="${INK}" stroke-width="2" pointer-events="none"/>`;
        });
        if (traces.length) {
          const [x, y] = point(traces[0].d, def.origine && p.montage !== 'y' ? 0.3 : 0.55);
          const lab = `P${i + 1} ${def.court}`;
          g += `<g pointer-events="none"><rect x="${(x - lab.length * 3.4 - 6).toFixed(1)}" y="${y - 10}" width="${(lab.length * 6.8 + 12).toFixed(1)}" height="18" rx="9" fill="#fff" stroke="${col}" stroke-width="2"/>${txt(x, y + 3.5, lab, { size: 9.5, weight: 900, fill: col })}</g>`;
        }
      });
      // Légende des pontages (en haut à droite)
      [['Pontage artériel', COUL_PONT.arteriel], ['Pontage veineux', COUL_PONT.veineux]].forEach(([l, c], k) => {
        const y = 22 + k * 17;
        g += `<line x1="448" y1="${y - 4}" x2="472" y2="${y - 4}" stroke="${c}" stroke-width="5" stroke-linecap="round"/>` + txt(478, y, l, { size: 10, weight: 700, anchor: 'start' });
      });
    }
    // Lésions
    const parSeg = {};
    (o.lesions || []).forEach((l, i) => { if (GEO[l.seg] && segs.includes(+l.seg)) (parSeg[l.seg] = parSeg[l.seg] || []).push(i); });
    Object.entries(parSeg).forEach(([seg, idx]) => idx.forEach((i, j) => {
      const [x, y] = position(+seg, dom, j, idx.length);
      const l = o.lesions[i], actif = i === o.actif;
      g += `<g pointer-events="none"><circle cx="${x}" cy="${y}" r="${actif ? 13 : 11}" fill="${l.couleur || INK}" stroke="${actif ? INK : '#fff'}" stroke-width="${actif ? 3 : 2}"/>${txt(x, y + 4, i + 1, { size: 11, weight: 900, fill: '#fff' })}</g>`;
    }));
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="${FONT}" role="img" aria-label="${esc(`Arbre coronaire, ${ETIQ[dom].toLowerCase()} : ${EXPL[dom]}`)}">${g}</svg>`;
  }

  return { W, H, COULEURS: COUL, GEO, PONTAGES: PONT, segments, position, tracePontage, svg, ETIQUETTES: ETIQ, EXPLICATIONS: EXPL };
});
