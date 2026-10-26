/* =========================================================
   RadiologicHub — EU-TIRADS : dessin d'un nodule thyroïdien « échographique » en SVG
   ---------------------------------------------------------
   dessinerNodule(n, { id, taille }) → chaîne SVG.
   n : { composition, echo, forme, contours, micro, halo } (même lexique que regles/eu-tirads.js)
   Le parenchyme thyroïdien est gris moyen ; le muscle sous-hyoïdien (bande du haut) sert de
   référence : l'hypoéchogénicité « marquée » est plus sombre que lui.
   ========================================================= */
(function (root) {
  'use strict';
  const GRIS = { hyper: '#c4c4c4', iso: '#8d8d8d', 'hypo-moderee': '#606060', 'hypo-marquee': '#2b2b2b', anechogene: '#060606' };
  const MUSCLE = '#545454', PARENCHYME = '#8d8d8d';
  let compteur = 0;

  function contour(cx, cy, rx, ry, type, graine) {
    const N = 72, pts = [];
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2;
      let k = 1;
      if (type === 'irreguliers') k = 1 + 0.16 * Math.max(0, Math.sin(a * 9 + graine)) ** 3 + 0.06 * Math.sin(a * 4 + graine * 2);
      pts.push([cx + rx * k * Math.cos(a), cy + ry * k * Math.sin(a)]);
    }
    return 'M' + pts.map(p => p.map(v => v.toFixed(1)).join(' ')).join(' L') + 'Z';
  }

  function dessinerNodule(n = {}, opts = {}) {
    const id = 'nod' + (++compteur);
    const W = 240, H = 170, cx = 120, cy = 98;
    const dim = { ovale: [56, 32], ronde: [40, 38], 'non-ovale': [32, 46] }[n.forme || 'ovale'];
    const [rx, ry] = dim;
    const d = contour(cx, cy, rx, ry, n.contours, 1.3);
    const comp = n.composition || 'solide';
    const solide = GRIS[n.echo] || GRIS.iso;
    const out = [`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${opts.label || 'Nodule thyroïdien schématique'}" class="nod-svg">`,
      `<defs><filter id="${id}-sp" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="4"/><feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .55 -.18"/></filter>`,
      `<filter id="${id}-flou"><feGaussianBlur stdDeviation="2.6"/></filter>`,
      `<clipPath id="${id}-clip"><path d="${d}"/></clipPath></defs>`,
      `<rect width="${W}" height="${H}" fill="${PARENCHYME}"/>`,
      `<path d="M0 0 H${W} V24 Q${W / 2} 34 0 24Z" fill="${MUSCLE}"/>`,
      `<text x="6" y="14" font-size="8" font-weight="700" fill="#e9e9e9" font-family="Montserrat, Arial, sans-serif">muscle</text>`];
    const flou = n.contours === 'flous' ? ` filter="url(#${id}-flou)"` : '';
    if (comp === 'kyste') {
      out.push(`<rect x="${cx - rx}" y="${cy}" width="${rx * 2}" height="${H - cy}" fill="#b5b5b5" opacity=".55"/>`);   // renforcement postérieur
      out.push(`<path d="${d}" fill="${GRIS.anechogene}"${flou}/>`);
    } else {
      if (n.halo) out.push(`<path d="${contour(cx, cy, rx + 3.2, ry + 3.2, n.contours, 1.3)}" fill="#1b1b1b"/>`);
      out.push(`<path d="${d}" fill="${comp === 'mixte-kystique' ? GRIS.anechogene : solide}"${flou ? flou : ' stroke="#5a5a5a" stroke-width="1.2"'}/>`);
      const g = [`<g clip-path="url(#${id}-clip)">`];
      if (comp === 'spongiforme') {
        for (let i = 0; i < 46; i++) { const a = i * 2.39996, r = Math.sqrt(i / 46); g.push(`<ellipse cx="${(cx + Math.cos(a) * r * rx * .92).toFixed(1)}" cy="${(cy + Math.sin(a) * r * ry * .9).toFixed(1)}" rx="3.2" ry="2.4" fill="#0b0b0b"/>`); }
      } else if (comp === 'mixte-solide') {
        g.push(`<ellipse cx="${cx + rx * .35}" cy="${cy + ry * .2}" rx="${rx * .32}" ry="${ry * .38}" fill="${GRIS.anechogene}"/>`);
      } else if (comp === 'mixte-kystique') {
        g.push(`<path d="M${cx - rx * .55} ${cy + ry} Q${cx - rx * .45} ${cy - ry * .25} ${cx} ${cy - ry * .1} Q${cx + rx * .3} ${cy + ry * .3} ${cx + rx * .1} ${cy + ry}Z" fill="${solide}"/>`);
      }
      if (n.micro) {
        const pts = [[-.35, -.25], [-.1, -.45], [.2, -.3], [-.4, .15], [.05, .05], [.3, .25], [-.15, .4], [.42, -.05]];
        const decal = comp === 'mixte-kystique' ? [-.25, .55] : [0, 0];
        for (const [x, y] of pts) g.push(`<circle cx="${(cx + (x * (comp === 'mixte-kystique' ? .45 : 1) + decal[0]) * rx).toFixed(1)}" cy="${(cy + (y * (comp === 'mixte-kystique' ? .45 : 1) + decal[1]) * ry).toFixed(1)}" r="1.5" fill="#fff"/>`);
      }
      g.push('</g>'); out.push(g.join(''));
    }
    out.push(`<rect width="${W}" height="${H}" filter="url(#${id}-sp)" opacity=".5"/>`);
    out.push('</svg>');
    return out.join('');
  }

  /* Petites vignettes des ponctuations hyperéchogènes */
  function ponctuation(type) {
    const id = 'pct' + (++compteur);
    const base = [`<svg viewBox="0 0 160 110" class="nod-svg" role="img" aria-label="${type}">`,
      `<defs><filter id="${id}" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="7"/><feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .55 -.18"/></filter></defs>`,
      `<rect width="160" height="110" fill="${PARENCHYME}"/>`];
    if (type === 'micro') {
      base.push('<ellipse cx="80" cy="55" rx="52" ry="34" fill="#4c4c4c"/>');
      for (const [x, y] of [[62, 45], [74, 60], [88, 42], [96, 64], [70, 72], [104, 52], [84, 55]]) base.push(`<circle cx="${x}" cy="${y}" r="1.4" fill="#fff"/>`);
    } else if (type === 'colloide') {
      base.push('<ellipse cx="80" cy="55" rx="52" ry="34" fill="#070707"/>');
      for (const [x, y] of [[66, 46], [92, 58]]) base.push(`<circle cx="${x}" cy="${y}" r="2.2" fill="#fff"/><path d="M${x - 1.6} ${y + 2} L${x} ${y + 15} L${x + 1.6} ${y + 2}Z" fill="#fff" opacity=".75"/>`);
    } else if (type === 'microkystes') {
      base.push('<ellipse cx="80" cy="55" rx="52" ry="34" fill="#8d8d8d"/>');
      for (const [x, y] of [[62, 50], [80, 46], [98, 54], [72, 64], [90, 66]]) base.push(`<ellipse cx="${x}" cy="${y}" rx="6" ry="4" fill="#0a0a0a"/><path d="M${x - 4} ${y + 2.6} H${x + 4}" stroke="#fff" stroke-width="1.3"/><rect x="${x - 5}" y="${y + 4}" width="10" height="9" fill="#bdbdbd" opacity=".6"/>`);
    } else if (type === 'macro') {
      base.push('<ellipse cx="80" cy="50" rx="52" ry="30" fill="#7a7a7a"/><path d="M68 44 Q80 36 92 44 L92 110 L68 110Z" fill="#141414" opacity=".85"/><path d="M68 44 Q80 36 92 44" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round"/>');
    }
    base.push(`<rect width="160" height="110" filter="url(#${id})" opacity=".5"/></svg>`);
    return base.join('');
  }

  const api = { dessinerNodule, ponctuation, GRIS };
  if (typeof module === 'object' && module.exports) module.exports = api; else root.RHNodule = api;
})(typeof self !== 'undefined' ? self : this);
