/* =========================================================
   RadiologicHub — fiche « Nodule pulmonaire » : illustrations SVG façon TDM
   ---------------------------------------------------------
   Dessins pédagogiques (pas des images de patients), en fenêtre
   pulmonaire (parenchyme sombre, vaisseaux gris) ou médiastinale
   (graisse, calcifications) :
   • nodule(o)        : densité (solide, verre dépoli, mixte), contours
                        (réguliers, lobulés, spiculés), contenu (graisse,
                        calcification de type 1 à 6, bronchogramme ou
                        clartés aériques, excavation fine ou épaisse),
                        mesure (grand et petit axes, sans les spiculations) ;
   • ganglion()       : ganglion intrapulmonaire triangulaire près de la scissure ;
   • atelectasie()    : atélectasie ronde et ses 3 critères ;
   • croissance(mode) : évolution entre deux examens (concentrique,
                        asymétrique, apparition d'une composante solide) ;
   • radiographie()   : faux nodules de la radiographie (mamelon, peau, os).
   Tirage pseudo-aléatoire à graine fixe : un même réglage donne
   toujours le même dessin. Module sans dépendance au navigateur
   (tests/nodule-pulmonaire.test.js).
   ========================================================= */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.RHNodulePoumon = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const W = 240, H = 240, CX = 122, CY = 118;
  const COUL = {
    fond: '#141418', poumon: '#24242b', vaisseau: '#8d8d96', paroi: '#7c7a80', cote: '#e9e6dc',
    solide: '#d9d7d2', verre: '#9a9aa3', calcif: '#ffffff', graisse: '#4a4a4f', air: '#0c0c0f',
    trait: '#f2ab2f', texte: '#ffffff', mesure: '#2ec4b6',
  };
  const f1 = n => Math.round(n * 10) / 10;
  let compteur = 0;                                   // identifiants uniques des flèches (plusieurs dessins par page)

  // Générateur pseudo-aléatoire (mulberry32)
  function alea(graine) {
    let a = graine >>> 0;
    return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }

  // Contour fermé lissé (Catmull-Rom → Bézier) d'un nodule de rayon r
  function contour(cx, cy, r, { lobules = false, irregulier = 0.04, graine = 7, sx = 1, sy = 1 } = {}) {
    const rnd = alea(graine), n = 48, pts = [];
    const ph = rnd() * 6.28, ph2 = rnd() * 6.28;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      let k = 1 + (rnd() - 0.5) * irregulier;
      if (lobules) k += 0.13 * Math.sin(5 * a + ph) + 0.06 * Math.sin(3 * a + ph2);
      pts.push([cx + Math.cos(a) * r * k * sx, cy + Math.sin(a) * r * k * sy]);
    }
    return lisse(pts);
  }
  function lisse(pts) {
    const n = pts.length, p = i => pts[(i + n) % n];
    let d = `M${f1(p(0)[0])} ${f1(p(0)[1])}`;
    for (let i = 0; i < n; i++) {
      const [p0, p1, p2, p3] = [p(i - 1), p(i), p(i + 1), p(i + 2)];
      d += `C${f1(p1[0] + (p2[0] - p0[0]) / 6)} ${f1(p1[1] + (p2[1] - p0[1]) / 6)} ${f1(p2[0] - (p3[0] - p1[0]) / 6)} ${f1(p2[1] - (p3[1] - p1[1]) / 6)} ${f1(p2[0])} ${f1(p2[1])}`;
    }
    return d + 'Z';
  }

  // Spiculations : fins prolongements effilés qui rayonnent du nodule
  function spicules(cx, cy, r, graine, couleur) {
    const rnd = alea(graine + 31), n = 11;
    let s = '';
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + (rnd() - 0.5) * 0.5, L = r * (0.35 + rnd() * 0.85), w = 0.9 + rnd() * 1.1;
      const x0 = cx + Math.cos(a) * r * 0.85, y0 = cy + Math.sin(a) * r * 0.85;
      const x1 = cx + Math.cos(a) * (r + L), y1 = cy + Math.sin(a) * (r + L);
      // léger coude : les spiculations ne sont pas rectilignes
      const b = a + (rnd() - 0.5) * 0.5, xm = cx + Math.cos(b) * (r + L * 0.5), ym = cy + Math.sin(b) * (r + L * 0.5);
      const nx = -Math.sin(a) * w, ny = Math.cos(a) * w;
      s += `<path d="M${f1(x0 + nx * 1.6)} ${f1(y0 + ny * 1.6)}Q${f1(xm + nx * 0.5)} ${f1(ym + ny * 0.5)} ${f1(x1)} ${f1(y1)}Q${f1(xm - nx * 0.5)} ${f1(ym - ny * 0.5)} ${f1(x0 - nx * 1.6)} ${f1(y0 - ny * 1.6)}Z" fill="${couleur}"/>`;
    }
    return s;
  }

  // Parenchyme : fond, paroi thoracique (côté droit de l'image), vaisseaux
  function fond(o = {}) {
    const rnd = alea(o.graine || 3);
    let s = `<rect width="${W}" height="${H}" fill="${COUL.fond}"/>`;
    s += `<path d="M0 0H${W - 34}C${W - 12} 60 ${W - 12} 180 ${W - 34} ${H}H0Z" fill="${COUL.poumon}"/>`;
    s += `<path d="M${W - 34} 0C${W - 12} 60 ${W - 12} 180 ${W - 34} ${H}" fill="none" stroke="${COUL.paroi}" stroke-width="3"/>`;
    for (const y of [30, 128, 214]) s += `<ellipse cx="${W - 10}" cy="${y}" rx="11" ry="20" fill="${COUL.cote}" opacity=".9"/>`;
    if (o.vaisseaux !== false) {
      // arborescence vasculaire depuis le hile (bord gauche de l'image)
      const branche = (x, y, a, L, w, prof) => {
        const x2 = x + Math.cos(a) * L, y2 = y + Math.sin(a) * L;
        let t = `<line x1="${f1(x)}" y1="${f1(y)}" x2="${f1(x2)}" y2="${f1(y2)}" stroke="${COUL.vaisseau}" stroke-width="${f1(w)}" stroke-linecap="round"/>`;
        if (prof > 0) { t += branche(x2, y2, a - 0.35 - rnd() * 0.2, L * 0.72, w * 0.68, prof - 1); t += branche(x2, y2, a + 0.3 + rnd() * 0.2, L * 0.7, w * 0.66, prof - 1); }
        return t;
      };
      s += `<g opacity=".75">${branche(-6, 40, 0.15, 62, 5, 3)}${branche(-6, 196, -0.2, 64, 5, 3)}</g>`;
      for (let i = 0; i < 9; i++) s += `<circle cx="${f1(30 + rnd() * 150)}" cy="${f1(14 + rnd() * 210)}" r="${f1(1.4 + rnd() * 1.6)}" fill="${COUL.vaisseau}" opacity=".7"/>`;
    }
    return s;
  }
  const cadre = (corps, titre) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img"${titre ? ` aria-label="${titre}"` : ''} font-family="Montserrat, Arial, sans-serif">${corps}</svg>`;
  const etiquette = (x, y, t, o = {}) => `<text x="${x}" y="${y}" font-size="${o.size || 10}" font-weight="800" fill="${o.fill || COUL.texte}" text-anchor="${o.anchor || 'middle'}" paint-order="stroke" stroke="#000" stroke-width="2.4" stroke-linejoin="round">${t}</text>`;

  /* Calcifications de type 1 à 6 (dans un nodule de centre cx, cy et de rayon r) */
  function calcification(type, cx, cy, r, graine) {
    const rnd = alea(graine + 97), c = COUL.calcif;
    switch (+type) {
      case 1: return `<path d="${contour(cx, cy, r * 0.97, { graine })}" fill="${c}"/>`;
      case 2: return `<circle cx="${cx}" cy="${cy}" r="${f1(r * 0.36)}" fill="${c}"/>`;
      case 3: return [0.82, 0.55, 0.28].map(k => `<circle cx="${cx}" cy="${cy}" r="${f1(r * k)}" fill="none" stroke="${c}" stroke-width="${f1(r * 0.09)}"/>`).join('');
      case 4: {
        let s = '';
        for (let i = 0; i < 9; i++) {
          const a = rnd() * 6.28, d = r * (0.15 + rnd() * 0.55);
          s += `<path d="${contour(cx + Math.cos(a) * d, cy + Math.sin(a) * d, r * (0.1 + rnd() * 0.08), { lobules: true, graine: graine + i })}" fill="${c}"/>`;
        }
        return s;
      }
      case 5: return `<path d="${contour(cx + r * 0.45, cy - r * 0.35, r * 0.26, { lobules: true, graine })}" fill="${c}"/>`;
      case 6: {
        let s = '';
        for (let i = 0; i < 22; i++) { const a = rnd() * 6.28, d = r * Math.sqrt(rnd()) * 0.8; s += `<circle cx="${f1(cx + Math.cos(a) * d)}" cy="${f1(cy + Math.sin(a) * d)}" r="${f1(0.9 + rnd() * 0.8)}" fill="${c}"/>`; }
        return s;
      }
      default: return '';
    }
  }

  /*
   * o : { densite: 'solide' | 'verre' | 'mixte', contours: 'reguliers' | 'lobules' | 'spicules',
   *       taille (mm, 4 à 30 : règle le rayon), calcif: 0 à 6, graisse, bronchogramme,
   *       excavation: '' | 'fine' | 'epaisse', fenetre: 'poumon' | 'mediastin', mesure, cible (aiguille vers
   *       le contingent solide), legende, titre, graine }
   */
  function nodule(o = {}) {
    const g = o.graine || 11, taille = Math.max(4, Math.min(30, +o.taille || 14));
    const r = 16 + taille * 1.45, med = o.fenetre === 'mediastin';
    const lob = o.contours === 'lobules' || o.contours === 'spicules';
    const d = contour(CX, CY, r, { lobules: lob, graine: g, irregulier: o.contours === 'reguliers' ? 0.02 : 0.08 });
    let s = med ? `<rect width="${W}" height="${H}" fill="#050506"/><path d="M${W - 34} 0C${W - 12} 60 ${W - 12} 180 ${W - 34} ${H}" fill="none" stroke="#3a3a40" stroke-width="10"/>` : fond({ graine: g });
    const tissu = med ? '#8c8a86' : COUL.solide;
    if (o.contours === 'spicules') s += spicules(CX, CY, r, g, o.densite === 'verre' ? COUL.verre : tissu);
    if (o.densite === 'verre' || o.densite === 'mixte') {
      // verre dépoli : voile qui laisse voir les vaisseaux
      s += `<path d="${d}" fill="${COUL.verre}" opacity=".55"/>`;
      if (o.densite === 'mixte') s += `<path d="${contour(CX - r * 0.12, CY + r * 0.05, r * 0.45, { lobules: true, graine: g + 5 })}" fill="${tissu}"/>`;
    } else s += `<path d="${d}" fill="${tissu}"/>`;
    if (o.graisse) for (const [dx, dy, k] of [[-0.35, -0.2, 0.22], [0.25, 0.3, 0.18], [0.3, -0.35, 0.14]]) s += `<path d="${contour(CX + r * dx, CY + r * dy, r * k, { graine: g + k * 100 })}" fill="${med ? '#262628' : COUL.graisse}"/>`;
    if (o.calcif) s += calcification(o.calcif, CX, CY, r, g);
    if (o.bronchogramme) {
      s += `<path d="M${f1(CX - r * 1.05)} ${f1(CY + r * 0.25)}Q${f1(CX - r * 0.2)} ${f1(CY + r * 0.1)} ${f1(CX + r * 0.45)} ${f1(CY - r * 0.25)}" fill="none" stroke="${COUL.air}" stroke-width="${f1(r * 0.12)}" stroke-linecap="round"/>`;
      for (const [dx, dy, k] of [[0.2, 0.25, 0.1], [-0.15, -0.35, 0.08], [0.45, 0.15, 0.07]]) s += `<circle cx="${f1(CX + r * dx)}" cy="${f1(CY + r * dy)}" r="${f1(r * k)}" fill="${COUL.air}"/>`;
    }
    if (o.excavation) {
      const k = o.excavation === 'epaisse' ? 0.42 : 0.8;
      s += `<path d="${contour(CX + r * 0.06, CY - r * 0.04, r * k, { graine: g + 9, lobules: o.excavation === 'epaisse' })}" fill="${COUL.air}"/>`;
      if (o.legende) {
        const ep = o.excavation === 'epaisse' ? 'paroi > 15 mm' : 'paroi fine';
        s += `<line x1="${f1(CX - r)}" y1="${CY + r + 10}" x2="${f1(CX - r * k)}" y2="${CY + r + 10}" stroke="${COUL.trait}" stroke-width="2"/>` + etiquette(CX - r * (1 + k) / 2, CY + r + 24, ep, { fill: COUL.trait });
      }
    }
    if (o.mesure) {
      const id = `np-mes-${++compteur}`;
      // grand axe et petit axe perpendiculaire, spiculations exclues
      const a = -0.35, ca = Math.cos(a), sa = Math.sin(a);
      const L = r * (lob ? 1.08 : 1), l = r * (lob ? 0.86 : 0.92);
      s += `<line x1="${f1(CX - ca * L)}" y1="${f1(CY - sa * L)}" x2="${f1(CX + ca * L)}" y2="${f1(CY + sa * L)}" stroke="${COUL.mesure}" stroke-width="2.4" marker-start="url(#${id}a)" marker-end="url(#${id}a)"/>`;
      s += `<line x1="${f1(CX + sa * l)}" y1="${f1(CY - ca * l)}" x2="${f1(CX - sa * l)}" y2="${f1(CY + ca * l)}" stroke="${COUL.trait}" stroke-width="2.4" marker-start="url(#${id}b)" marker-end="url(#${id}b)"/>`;
      s = `<defs><marker id="${id}a" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10Z" fill="${COUL.mesure}"/></marker><marker id="${id}b" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10Z" fill="${COUL.trait}"/></marker></defs>` + s;
      if (o.legende !== false) s += etiquette(14, 228, 'grand axe', { anchor: 'start', fill: COUL.mesure }) + etiquette(100, 228, '+ petit axe', { anchor: 'start', fill: COUL.trait }) + etiquette(180, 228, '÷ 2', { anchor: 'start' });
    }
    if (o.cible) {
      // aiguille de biopsie vers le contingent solide (nodule mixte)
      const tx = CX - r * 0.12, ty = CY + r * 0.05;
      s += `<line x1="${W - 30}" y1="20" x2="${f1(tx)}" y2="${f1(ty)}" stroke="#ffd166" stroke-width="2.6" stroke-linecap="round"/>`;
      s += `<circle cx="${f1(tx)}" cy="${f1(ty)}" r="${f1(r * 0.55)}" fill="none" stroke="${COUL.mesure}" stroke-width="2" stroke-dasharray="4 3"/>`;
      if (o.legende !== false) s += etiquette(W / 2, 222, 'cibler la portion solide', { fill: COUL.mesure });
    }
    if (med && !o.mesure) s += etiquette(8, 230, 'fenêtre médiastinale', { anchor: 'start', size: 9, fill: '#c9c7c2' });
    if (o.titre) s += etiquette(W / 2, 18, o.titre, { size: 12 });
    return cadre(s, o.titre || 'nodule');
  }

  /* Ganglion intrapulmonaire : triangulaire « en béret basque », contre la scissure, à moins de 1 cm de la plèvre */
  function ganglion(o = {}) {
    let s = fond({ graine: 21 });
    s += `<path d="M6 176C80 160 150 132 ${W - 28} 100" fill="none" stroke="#b9b9c2" stroke-width="1.6" opacity=".9"/>`;
    s += etiquette(14, 166, 'scissure', { anchor: 'start', size: 9, fill: '#d6d6dd' });
    // triangle à angles arrondis posé sur la scissure, près de la plèvre
    s += `<g transform="translate(176 118) scale(1.8) translate(-176 -118)"><path d="M158 124Q170 96 182 112Q190 116 194 110Q186 120 172 120Q164 122 158 124Z" fill="${COUL.solide}"/><path d="M168 120L162 132" stroke="${COUL.solide}" stroke-width="1"/></g>`;
    if (o.legende !== false) {
      s += `<path d="M170 90L150 62" stroke="${COUL.trait}" stroke-width="1.6"/>` + etiquette(120, 56, 'triangulaire, lisse, < 1 cm', { fill: COUL.trait });
      s += `<path d="M206 108H${W - 26}" stroke="${COUL.mesure}" stroke-width="2"/>` + etiquette(150, 206, 'à < 1 cm de la plèvre', { fill: COUL.mesure });
    }
    return cadre(s, 'ganglion intrapulmonaire');
  }

  /* Atélectasie ronde : épaississement pleural + perte de volume + enroulement broncho-vasculaire (queue de comète) */
  function atelectasie(o = {}) {
    let s = fond({ graine: 41, vaisseaux: false });
    s += `<path d="M${W - 34} 70C${W - 22} 110 ${W - 22} 160 ${W - 34} 196" fill="none" stroke="#b8b6ae" stroke-width="12" stroke-linecap="round"/>`;
    s += `<path d="${contour(W - 74, 134, 30, { graine: 5, sx: 1.05, sy: 0.9 })}" fill="${COUL.solide}"/>`;
    for (const [y, c] of [[100, -18], [118, -8], [140, 4], [160, 16]]) s += `<path d="M14 ${y + c * 2}C70 ${y + c} 112 ${y} ${W - 104} ${134 + (y - 130) * 0.6}C${W - 92} ${134 + (y - 130) * 0.3} ${W - 92} 134 ${W - 86} 134" fill="none" stroke="${COUL.vaisseau}" stroke-width="2.6" opacity=".9"/>`;
    s += `<path d="M10 30L110 34" stroke="#3a3a42" stroke-width="2" stroke-dasharray="4 4"/>`;
    if (o.legende !== false) {
      s += etiquette(W - 56, 214, '1 · épaississement pleural', { fill: COUL.trait, anchor: 'end', size: 9 });
      s += etiquette(14, 24, '2 · perte de volume lobaire', { anchor: 'start', size: 9, fill: COUL.mesure });
      s += etiquette(14, 196, '3 · enroulement des axes broncho-vasculaires', { anchor: 'start', size: 9, fill: '#ffd166' });
    }
    return cadre(s, 'atélectasie ronde');
  }

  /* Croissance entre deux examens : 'concentrique' (≥ 2 mm), 'asymetrique', 'solide' (apparition d'une composante solide) */
  function croissance(mode = 'concentrique', o = {}) {
    let s = fond({ graine: 51 });
    if (mode === 'solide') {
      s += `<path d="${contour(CX, CY, 46, { graine: 4 })}" fill="${COUL.verre}" opacity=".55"/>`;
      s += `<path d="${contour(CX - 6, CY + 4, 20, { lobules: true, graine: 6 })}" fill="${COUL.solide}"/>`;
      if (o.legende !== false) s += etiquette(CX, 206, 'verre dépoli pur → nodule mixte', { fill: COUL.trait });
      return cadre(s, 'apparition d\'une composante solide');
    }
    const av = contour(CX, CY, 30, { graine: 8 });
    const ap = mode === 'asymetrique' ? contour(CX + 10, CY - 4, 38, { graine: 8, sx: 1.25, sy: 0.92 }) : contour(CX, CY, 40, { graine: 8 });
    s += `<path d="${ap}" fill="${COUL.solide}" opacity=".95"/><path d="${av}" fill="none" stroke="${COUL.mesure}" stroke-width="2.4" stroke-dasharray="5 4"/>`;
    if (o.legende !== false) s += etiquette(CX, 206, mode === 'asymetrique' ? 'croissance asymétrique' : 'diamètre + 2 mm ou plus', { fill: COUL.trait }) + etiquette(CX, 222, 'pointillés : examen le plus ancien', { size: 9, fill: COUL.mesure });
    return cadre(s, 'croissance');
  }

  /* Radiographie : faux nodules (mamelon, opacité cutanée, structure osseuse) */
  function radiographie(o = {}) {
    let s = `<rect width="${W}" height="${H}" fill="#0b0b0d"/>`;
    s += `<path d="M30 10C10 80 14 190 52 230H${W - 52}C${W - 14} 190 ${W - 10} 80 ${W - 30} 10Z" fill="#2c2c33"/>`;
    s += `<path d="M112 10V230M128 10V230" stroke="#d9d7d2" stroke-width="10" opacity=".75"/>`;
    for (let i = 0; i < 6; i++) { s += `<path d="M112 ${30 + i * 32}C70 ${20 + i * 32} 40 ${44 + i * 32} 34 ${70 + i * 32}" fill="none" stroke="#bdbbb3" stroke-width="5" opacity=".55"/>`; s += `<path d="M128 ${30 + i * 32}C170 ${20 + i * 32} 200 ${44 + i * 32} 206 ${70 + i * 32}" fill="none" stroke="#bdbbb3" stroke-width="5" opacity=".55"/>`; }
    s += `<circle cx="72" cy="170" r="9" fill="#cfcdc6" opacity=".85"/><circle cx="170" cy="170" r="9" fill="#cfcdc6" opacity=".85"/>`;
    if (o.legende !== false) s += etiquette(72, 196, 'mamelons', { fill: COUL.trait }) + etiquette(170, 196, 'symétriques', { fill: COUL.trait }) + etiquette(W / 2, 22, '≈ 20 % de faux nodules', { size: 11 });
    return cadre(s, 'faux nodules en radiographie');
  }

  return { nodule, ganglion, atelectasie, croissance, radiographie, calcification, COUL };
});
