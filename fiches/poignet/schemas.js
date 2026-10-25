/* =========================================================
   RadiologicHub — Fractures de l'extrémité distale du radius : schémas SVG
   ---------------------------------------------------------
   Dessins originaux (aucune image radiographique reprise), aux couleurs du site :
   • face(o)   : radius et ulna de face, inclinaison radiale et hauteur radiale ;
   • profil(o) : radius, lunatum et capitatum de profil (palmaire à gauche,
                 dorsal à droite, distal en haut), inclinaison palmaire mesurée ;
                 o.tilt (°, + palmaire / − dorsal), o.dx (déplacement du fragment,
                 + dorsal), o.barton ('palmaire' | 'dorsal'), o.mesure, o.seuil ;
   Utilisé par scripts/poignet_schemas.js (schémas fixes écrits dans la fiche)
   et par fiches/poignet/poignet-fiche.js (réglette de la bascule).
   ========================================================= */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.RHPoignet = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const C = { os: '#f3ede0', bord: '#2b2a33', carpe: '#cfe9e4', capi: '#d9e2f6', teal: '#2a9d8f', orange: '#f18d25', blue: '#3c67b8', red: '#c8102e', green: '#2f8a57', muted: '#6b6a75' };
  const f = n => Math.round(n * 10) / 10;
  const rad = d => d * Math.PI / 180;
  const rot = ([x, y], [cx, cy], a) => { const c = Math.cos(rad(a)), s = Math.sin(rad(a)); return [cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c]; };
  const txt = (x, y, t, o = {}) => `<text x="${f(x)}" y="${f(y)}" font-size="${o.size || 12}" font-weight="${o.weight || 800}" fill="${o.fill || C.bord}" text-anchor="${o.anchor || 'middle'}"${o.italic ? ' font-style="italic"' : ''}>${t}</text>`;
  const pastille = (x, y, t, c, o = {}) => {
    const w = o.w || (t.length * 6.6 + 16);
    return `<g><rect x="${f(x - w / 2)}" y="${f(y - 12)}" width="${f(w)}" height="22" rx="11" fill="${c}"/>${txt(x, y + 4, t, { fill: '#fff', size: o.size || 11.5 })}</g>`;
  };
  const arcPath = ([cx, cy], r, a1, a2) => {   // angles en degrés (repère écran), du premier au second
    const p1 = [cx + r * Math.cos(rad(a1)), cy + r * Math.sin(rad(a1))], p2 = [cx + r * Math.cos(rad(a2)), cy + r * Math.sin(rad(a2))];
    let d = a2 - a1; while (d > 180) d -= 360; while (d < -180) d += 360;
    return `M${f(p1[0])} ${f(p1[1])} A${r} ${r} 0 0 ${d > 0 ? 1 : 0} ${f(p2[0])} ${f(p2[1])}`;
  };

  /* ---------------- Face : inclinaison et hauteur radiales ---------------- */
  function face(o = {}) {
    const S = [54, 108], K = [206, 168];                       // pointe de la styloïde radiale, coin ulnaire de la surface articulaire
    const incl = Math.round(Math.atan2(K[1] - S[1], K[0] - S[0]) * 180 / Math.PI);
    let g = `<rect width="400" height="420" fill="#fff"/>`;
    // 1re rangée du carpe (scaphoïde, lunatum, triquetrum) et tête du capitatum, estompés
    g += `<path d="M118 52 C126 30 168 24 182 46 C188 58 184 70 176 76 C160 70 138 70 124 76 C116 70 114 60 118 52Z" fill="${C.capi}" stroke="${C.bord}" stroke-width="1.5" opacity=".85"/>`;
    g += `<path d="M58 102 C52 82 62 62 84 56 C102 52 118 62 124 78 C128 92 122 108 110 114 C92 120 68 118 58 102Z" fill="${C.carpe}" stroke="${C.bord}" stroke-width="1.6"/>`;
    g += `<path d="M132 118 C128 100 138 82 158 80 C178 78 194 90 196 108 C198 122 190 136 176 142 C160 146 138 138 132 118Z" fill="${C.carpe}" stroke="${C.bord}" stroke-width="1.6"/>`;
    g += `<path d="M204 124 C202 108 212 96 228 96 C242 98 250 110 248 124 C244 138 230 146 216 144 C208 142 204 134 204 124Z" fill="${C.carpe}" stroke="${C.bord}" stroke-width="1.6"/>`;
    g += txt(90, 92, 'S', { size: 11, fill: C.muted }) + txt(164, 116, 'L', { size: 11, fill: C.muted }) + txt(226, 124, 'T', { size: 11, fill: C.muted }) + txt(150, 58, 'C', { size: 11, fill: C.muted });
    // radius : styloïde radiale, surface articulaire (fossettes scaphoïdienne et lunarienne), incisure ulnaire
    g += `<path d="M94 412 C94 340 86 290 70 246 C56 208 46 170 48 136 Q50 112 ${S.join(' ')} Q94 124 126 138 Q134 134 140 142 Q174 156 ${K.join(' ')} C216 180 218 200 208 214 C196 240 182 292 180 412Z" fill="${C.os}" stroke="${C.bord}" stroke-width="2.2"/>`;
    // ulna : tête et processus styloïde
    g += `<path d="M226 412 C226 334 222 276 220 234 C216 208 220 190 234 182 C246 176 258 176 264 166 L268 150 Q274 146 277 156 C279 174 275 194 271 218 C267 262 265 334 265 412Z" fill="${C.os}" stroke="${C.bord}" stroke-width="2.2"/>`;
    g += txt(136, 346, 'RADIUS', { size: 13, fill: C.muted }) + txt(246, 346, 'ULNA', { size: 12, fill: C.muted });
    // axe du radius
    g += `<line x1="137" y1="412" x2="137" y2="150" stroke="${C.red}" stroke-width="1.6" stroke-dasharray="6 5"/>` + txt(141, 404, 'axe', { size: 10, fill: C.red, anchor: 'start' });
    if (o.mesure !== 'hauteur') {
      // inclinaison radiale : styloïde → coin ulnaire, comparée à la perpendiculaire à l'axe passant par le coin
      const u = [S[0] - K[0], S[1] - K[1]], n = Math.hypot(...u);
      g += `<line x1="${f(K[0] - u[0] / n * 20)}" y1="${f(K[1] - u[1] / n * 20)}" x2="${f(K[0] + u[0] / n * (n + 26))}" y2="${f(K[1] + u[1] / n * (n + 26))}" stroke="${C.teal}" stroke-width="3"/>`;
      g += `<line x1="18" y1="${K[1]}" x2="${K[0] + 24}" y2="${K[1]}" stroke="${C.teal}" stroke-width="2.2" stroke-dasharray="7 5"/>`;
      g += `<path d="${arcPath(K, 92, 180, 180 + incl)}" fill="none" stroke="${C.teal}" stroke-width="3.2"/>`;
      g += pastille(96, 196, `inclinaison radiale ≈ ${incl}°`, C.teal, { w: 168 });
    }
    if (o.mesure !== 'inclinaison') {
      // hauteur radiale : écart, le long de l'axe, entre la pointe de la styloïde et le coin ulnaire
      g += `<line x1="${S[0]}" y1="${S[1]}" x2="374" y2="${S[1]}" stroke="${C.orange}" stroke-width="2.2" stroke-dasharray="7 5"/>`;
      g += `<line x1="${K[0]}" y1="${K[1]}" x2="374" y2="${K[1]}" stroke="${C.orange}" stroke-width="2.2" stroke-dasharray="7 5"/>`;
      g += `<line x1="356" y1="${S[1] + 6}" x2="356" y2="${K[1] - 6}" stroke="${C.orange}" stroke-width="3"/>`;
      g += `<path d="M349 ${S[1] + 11} L356 ${S[1] + 1} L363 ${S[1] + 11}Z M349 ${K[1] - 11} L356 ${K[1] - 1} L363 ${K[1] - 11}Z" fill="${C.orange}"/>`;
      g += pastille(330, (S[1] + K[1]) / 2 + 2, 'hauteur ≈ 11 mm', C.orange, { w: 120 });
    }
    g += `<circle cx="${S[0]}" cy="${S[1]}" r="5" fill="${C.bord}" stroke="#fff" stroke-width="2"/><circle cx="${K[0]}" cy="${K[1]}" r="5" fill="${C.bord}" stroke="#fff" stroke-width="2"/>`;
    g += txt(10, 124, 'pointe de la', { size: 9.5, anchor: 'start', fill: C.bord }) + txt(10, 136, 'styloïde', { size: 9.5, anchor: 'start', fill: C.bord });
    g += txt(214, 196, 'coin ulnaire', { size: 9.5, anchor: 'start', fill: C.bord });
    g += txt(200, 20, 'FACE', { size: 13 }) + txt(12, 412, 'radial', { size: 10, fill: C.muted, anchor: 'start' }) + txt(392, 412, 'ulnaire', { size: 10, fill: C.muted, anchor: 'end' });
    return `<svg viewBox="0 0 400 420" role="img" aria-label="Poignet de face, schéma : inclinaison radiale et hauteur radiale" font-family="Montserrat, Arial, sans-serif">${g}</svg>`;
  }

  /* ---------------- Profil : inclinaison palmaire (ou bascule dorsale) ---------------- */
  const P = [182, 188];                       // pivot du fragment (trait de fracture)
  const NORMAL = 11;                          // inclinaison palmaire du dessin au repos
  function profil(o = {}) {
    const tilt = o.tilt ?? NORMAL, dx = o.dx || 0, a = NORMAL - tilt;
    const T = p => { const q = rot(p, P, a); return [q[0] + dx, q[1]]; };
    const pt = p => T(p).map(f).join(' ');
    let g = `<rect width="400" height="420" fill="#fff"/>`;
    const V = [130, 150], D = [234, 129.8];                 // rebords palmaire et dorsal (≈ 11°)
    // diaphyse et métaphyse (fixes)
    g += `<path d="M154 412 L154 280 C154 240 140 214 130 ${P[1]} L236 ${P[1]} C230 206 214 236 212 280 L212 412Z" fill="${C.os}" stroke="${C.bord}" stroke-width="2.2"/>`;
    g += `<line x1="${P[0]}" y1="412" x2="${P[0]}" y2="34" stroke="${C.red}" stroke-width="1.6" stroke-dasharray="6 5"/>` + txt(P[0] + 5, 404, 'axe du radius', { size: 10, fill: C.red, anchor: 'start' });
    let carpe = T;
    if (o.barton) {
      // fracture marginale : un coin de la surface articulaire part avec le carpe (fracture-subluxation)
      const palm = o.barton === 'palmaire';
      const coin = palm ? [[130, P[1]], [124, 168], V, [160, 156], [150, 176]] : [[236, P[1]], [240, 160], D, [206, 140], [214, 168]];
      const off = palm ? [-15, 14] : [15, 12];
      const reste = palm
        ? `M150 176 L160 156 Q186 162 ${D.join(' ')} C240 140 242 166 236 ${P[1]} L130 ${P[1]} C129 184 132 180 150 176Z`
        : `M130 ${P[1]} C124 172 124 160 ${V.join(' ')} Q160 162 206 140 L214 168 L236 ${P[1]}Z`;
      g += `<path d="${reste}" fill="${C.os}" stroke="${C.bord}" stroke-width="2.2"/>`;
      g += `<path d="M${coin.map(p => [p[0] + off[0], p[1] + off[1]].map(f).join(' ')).join(' L')}Z" fill="#fde2e6" stroke="${C.red}" stroke-width="2.4"/>`;
      carpe = p => [p[0] + off[0] * 1.1, p[1] + off[1] * 0.9];
    } else {
      g += `<path d="M${pt([130, P[1]])} C${pt([126, 176])} ${pt([124, 162])} ${pt(V)} Q${pt([182, 166])} ${pt(D)} C${pt([238, 140])} ${pt([240, 166])} ${pt([236, P[1]])}Z" fill="${C.os}" stroke="${C.bord}" stroke-width="2.2"/>`;
      if (tilt !== NORMAL || dx) g += `<path d="M${[[130, P[1]], [152, P[1] - 4], [168, P[1] + 3], [190, P[1] - 3], [214, P[1] + 4], [236, P[1]]].map(pt).join(' L')}" fill="none" stroke="${C.red}" stroke-width="2.6"/>`;
    }
    // lunatum (croissant ouvert vers le haut) et capitatum (tête dans la concavité du lunatum)
    const pc = p => carpe(p).map(f).join(' ');
    g += `<path d="M${pc([138, 146])} Q${pc([182, 162])} ${pc([226, 126])} C${pc([226, 116])} ${pc([222, 108])} ${pc([216, 104])} Q${pc([182, 122])} ${pc([148, 112])} C${pc([140, 118])} ${pc([136, 132])} ${pc([138, 146])}Z" fill="${C.carpe}" stroke="${C.bord}" stroke-width="2"/>`;
    g += `<path d="M${pc([152, 104])} Q${pc([182, 118])} ${pc([212, 98])} C${pc([218, 84])} ${pc([216, 60])} ${pc([210, 30])} L${pc([156, 30])} C${pc([148, 60])} ${pc([146, 86])} ${pc([152, 104])}Z" fill="${C.capi}" stroke="${C.bord}" stroke-width="2"/>`;
    const lt = carpe([182, 134]), ct = carpe([182, 66]);
    g += txt(lt[0], lt[1] + 4, 'L', { size: 11, fill: C.muted }) + txt(ct[0], ct[1] + 4, 'C', { size: 11, fill: C.muted });
    // mesure de l'inclinaison
    if (o.mesure !== false && !o.barton) {
      const v = T(V), d = T(D);
      const ang = Math.round(Math.atan2(v[1] - d[1], d[0] - v[0]) * 180 / Math.PI);     // + : rebord palmaire plus proximal (inclinaison palmaire)
      const dorsale = ang < 0;
      const alerte = o.seuil && ang < -10;
      const c = alerte ? C.red : dorsale ? C.orange : C.blue;
      const u = [v[0] - d[0], v[1] - d[1]], n = Math.hypot(...u);
      g += `<line x1="${f(d[0] - u[0] / n * 34)}" y1="${f(d[1] - u[1] / n * 34)}" x2="${f(d[0] + u[0] / n * 160)}" y2="${f(d[1] + u[1] / n * 160)}" stroke="${c}" stroke-width="3"/>`;
      g += `<line x1="${f(d[0] + 34)}" y1="${f(d[1])}" x2="${f(d[0] - 170)}" y2="${f(d[1])}" stroke="${c}" stroke-width="2.2" stroke-dasharray="7 5"/>`;
      if (Math.abs(ang) >= 1) g += `<path d="${arcPath(d, 96, 180, 180 - ang)}" fill="none" stroke="${c}" stroke-width="3.2"/>`;
      g += `<circle cx="${f(v[0])}" cy="${f(v[1])}" r="5" fill="${C.bord}" stroke="#fff" stroke-width="2"/><circle cx="${f(d[0])}" cy="${f(d[1])}" r="5" fill="${C.bord}" stroke="#fff" stroke-width="2"/>`;
      const lib = ang === 0 ? 'surface perpendiculaire à l\'axe (0°)' : dorsale ? `bascule dorsale ${-ang}°` : `inclinaison palmaire ${ang}°`;
      g += pastille(200, 250, lib, c, { w: lib.length * 6.5 + 24 });
      if (o.seuil) g += txt(200, 278, alerte ? 'bascule dorsale > 10° : seuil de fixation' : ang < 0 ? 'bascule dorsale ≤ 10°' : 'orientation normale', { size: 10.5, fill: alerte ? C.red : C.green });
    }
    g += txt(14, 412, 'palmaire', { size: 10, fill: C.muted, anchor: 'start' }) + txt(392, 412, 'dorsal', { size: 10, fill: C.muted, anchor: 'end' });
    if (o.titre !== false) g += txt(200, 20, o.titre || 'PROFIL', { size: 13 });
    return `<svg viewBox="0 0 400 420" role="img" aria-label="${o.aria || 'Poignet de profil, schéma'}" font-family="Montserrat, Arial, sans-serif">${g}</svg>`;
  }

  return { face, profil, NORMAL };
});
