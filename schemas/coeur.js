/* =========================================================
   RadiologicHub — schéma du cœur : coupe petit axe et œil-de-bœuf
   ---------------------------------------------------------
   Dessins pédagogiques « façon IRM » (pas des images de patients) :
   • coupe PETIT AXE du ventricule gauche, orientation habituelle :
     antérieur en haut, septum et ventricule droit à gauche de l'image,
     inférieur en bas, latéral à droite ;
   • séquences : 'lge' (rehaussement tardif, PSIR : myocarde sain noir,
     lésion blanche), 't2' (T2 STIR sang noir : œdème en hypersignal),
     't1map' (cartographie T1 native en couleurs, en ms), 'cine' (ciné SSFP
     sang blanc, épanchement péricardique possible) ;
   • lésions placées par segments AHA (17 segments) et par couche :
     sous-épicardique, médio-pariétale, sous-endocardique, transmurale ;
   • œil-de-bœuf des 17 segments avec les segments atteints colorés.
   Utilisé par la fiche « IRM des myocardites » (attribut data-coeur).
   Module sans dépendance au navigateur (testé sous Node :
   tests/myocardite.test.js).
   ========================================================= */

(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.RHCoeur = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const FONT = 'Montserrat, Arial, sans-serif', INK = '#111114';
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const f1 = v => +v.toFixed(1);
  const rad = d => d * Math.PI / 180;
  const pt = (cx, cy, r, a) => [f1(cx + r * Math.cos(rad(a))), f1(cy + r * Math.sin(rad(a)))];
  let compteur = 0;

  /* ---------- Segmentation AHA (17 segments) ---------- */
  const PAROIS6 = ['antérieur', 'antéro-septal', 'inféro-septal', 'inférieur', 'inféro-latéral', 'antéro-latéral'];
  const PAROIS4 = ['antérieur', 'septal', 'inférieur', 'latéral'];
  // Angles en degrés, sens horaire à l'écran (y vers le bas), 0° = droite de l'image (paroi latérale)
  const ANG6 = [[240, 300], [180, 240], [120, 180], [60, 120], [0, 60], [300, 360]];
  const ANG4 = [[225, 315], [135, 225], [45, 135], [315, 405]];

  const niveau = s => (s >= 1 && s <= 6 ? 'basal' : s <= 12 ? 'median' : s <= 16 ? 'apical' : s === 17 ? 'apex' : null);
  function nomSegment(s) {
    const n = niveau(s);
    if (!n) return '';
    if (n === 'apex') return 'apex (segment 17)';
    const paroi = n === 'apical' ? PAROIS4[s - 13] : PAROIS6[(s - 1) % 6];
    return `${paroi} ${n === 'basal' ? 'basal' : n === 'median' ? 'médian' : 'apical'} (segment ${s})`;
  }
  function angles(s) {
    const n = niveau(s);
    if (n === 'basal' || n === 'median') return ANG6[(s - 1) % 6].slice();
    if (n === 'apical') return ANG4[s - 13].slice();
    return null;
  }
  /* Segments d'un même niveau → arcs continus fusionnés (bord commun, passage par 0°/360°) */
  function arcs(segments) {
    const r = segments.map(angles).filter(Boolean).sort((a, b) => a[0] - b[0]);
    const out = [];
    r.forEach(a => {
      const d = out[out.length - 1];
      if (d && a[0] <= d[1]) d[1] = Math.max(d[1], a[1]);
      else out.push(a.slice());
    });
    if (out.length > 1) {
      const p = out[0], d = out[out.length - 1];
      if (p[0] % 360 === 0 && d[1] >= 360) { d[1] = Math.max(d[1], p[1] + 360); out.shift(); }
    }
    return out;
  }

  /* ---------- Géométrie de la coupe ---------- */
  const G = { w: 260, h: 260, cx: 140, cy: 132, rEndo: 42, rEpi: 68 };
  const COUCHES = {
    'sous-epi': [0.52, 1], medio: [0.34, 0.66], 'sous-endo': [0, 0.46], transmural: [0, 1],
  };
  const LIBELLES_COUCHE = { 'sous-epi': 'sous-épicardique', medio: 'médio-pariétal', 'sous-endo': 'sous-endocardique', transmural: 'transmural' };

  // Secteur d'anneau (a0 → a1, sens horaire)
  function secteur(cx, cy, r0, r1, a0, a1) {
    const large = a1 - a0 > 180 ? 1 : 0;
    const [x0, y0] = pt(cx, cy, r1, a0), [x1, y1] = pt(cx, cy, r1, a1);
    const [x2, y2] = pt(cx, cy, r0, a1), [x3, y3] = pt(cx, cy, r0, a0);
    if (r0 <= 0) return `M${cx} ${cy} L${x0} ${y0} A${r1} ${r1} 0 ${large} 1 ${x1} ${y1} Z`;
    return `M${x0} ${y0} A${r1} ${r1} 0 ${large} 1 ${x1} ${y1} L${x2} ${y2} A${r0} ${r0} 0 ${large} 0 ${x3} ${y3} Z`;
  }
  const anneau = (cx, cy, r0, r1) => `M${cx - r1} ${cy} a${r1} ${r1} 0 1 0 ${2 * r1} 0 a${r1} ${r1} 0 1 0 ${-2 * r1} 0 Z M${cx - r0} ${cy} a${r0} ${r0} 0 1 1 ${2 * r0} 0 a${r0} ${r0} 0 1 1 ${-2 * r0} 0 Z`;

  // Ventricule droit : croissant appuyé sur le septum, entre les points d'insertion (240° et 120°)
  function ventriculeDroit(cx, cy, rEpi, epaisseur) {
    const [ax, ay] = pt(cx, cy, rEpi, 238), [bx, by] = pt(cx, cy, rEpi, 122);
    const ext = rEpi + 46 + epaisseur;
    return `M${ax} ${ay} C${f1(cx - ext * 0.62)} ${f1(cy - rEpi * 1.05)} ${f1(cx - ext * 1.08)} ${f1(cy - rEpi * 0.4)} ${f1(cx - ext * 1.02)} ${cy} C${f1(cx - ext * 1.08)} ${f1(cy + rEpi * 0.4)} ${f1(cx - ext * 0.62)} ${f1(cy + rEpi * 1.05)} ${bx} ${by} A${rEpi} ${rEpi} 0 0 1 ${ax} ${ay} Z`;
  }

  /* ---------- Palettes ---------- */
  const SEQUENCES = {
    lge: { nom: 'Rehaussement tardif (PSIR)', fond: '#060607', corps: '#26262b', graisse: '#66666d', myo: '#121214', sang: '#8f8f97', sangC: '#a9a9b1', lesion: '#f4f4f6', pilier: '#2b2b30' },
    t2: { nom: 'T2 STIR (sang noir)', fond: '#050506', corps: '#1f1f23', graisse: '#18181b', myo: '#606068', sang: '#0b0b0d', sangC: '#121215', lesion: '#e2e2e7', pilier: '#4d4d55' },
    cine: { nom: 'Ciné SSFP (sang blanc)', fond: '#060607', corps: '#2c2c31', graisse: '#c9c9ce', myo: '#4b4b52', sang: '#dcdce2', sangC: '#efeff3', lesion: '#4b4b52', pilier: '#5a5a61' },
    t1map: { nom: 'Cartographie T1 native', fond: '#000000', corps: '#151517', graisse: '#2a1a5e', myo: null, sang: '#c8321f', sangC: '#d9482b', lesion: null, pilier: '#3a8f3c' },
  };
  // Échelle de couleurs de la cartographie T1 (ms) — valeurs d'exemple, normes propres à chaque machine
  const LUT_T1 = [[850, '#1d3fa8'], [950, '#2fa84f'], [1030, '#f2c12e'], [1100, '#f08a24'], [1200, '#d4174a']];
  function couleurT1(ms) {
    if (ms <= LUT_T1[0][0]) return LUT_T1[0][1];
    for (let i = 1; i < LUT_T1.length; i++) {
      const [v1, c1] = LUT_T1[i], [v0, c0] = LUT_T1[i - 1];
      if (ms <= v1) {
        const t = (ms - v0) / (v1 - v0), h = c => [1, 3, 5].map(k => parseInt(c.slice(k, k + 2), 16));
        const a = h(c0), b = h(c1);
        return '#' + a.map((x, k) => Math.round(x + (b[k] - x) * t).toString(16).padStart(2, '0')).join('');
      }
    }
    return LUT_T1[LUT_T1.length - 1][1];
  }

  /* ---------- Flèche d'annotation (style des fiches) ---------- */
  function fleche(cx, cy, a, rFin, couleur) {
    const long = 30, [x1, y1] = pt(cx, cy, rFin + long, a), [x0, y0] = pt(cx, cy, rFin, a);
    const ux = (x0 - x1) / long, uy = (y0 - y1) / long, nx = -uy, ny = ux, t = 4, tete = 11, l = 9;
    const bx = x0 - ux * tete, by = y0 - uy * tete;
    const p = [[x1 + nx * t / 2, y1 + ny * t / 2], [bx + nx * t / 2, by + ny * t / 2], [bx + nx * l / 2, by + ny * l / 2], [x0, y0], [bx - nx * l / 2, by - ny * l / 2], [bx - nx * t / 2, by - ny * t / 2], [x1 - nx * t / 2, y1 - ny * t / 2]];
    return `<path d="M${p.map(q => q.map(f1).join(' ')).join(' L')} Z" fill="${couleur}" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/>`;
  }

  /* ---------- Une coupe petit axe ---------- */
  function petitAxe(o = {}) {
    const seq = SEQUENCES[o.sequence] ? o.sequence : 'lge';
    const P = SEQUENCES[seq];
    const id = `rhc${++compteur}`;
    const { w, h, cx, cy, rEndo, rEpi } = G;
    const ep = rEpi - rEndo;
    const niv = o.niveau || 'median';
    const lesions = (o.lesions || []).map(l => ({ couche: 'sous-epi', motif: 'continu', ...l }));
    const s = [];
    s.push(`<svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${esc(o.aria || description(o))}" font-family="${FONT}">`);
    s.push(`<defs><filter id="${id}-f" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="${seq === 't2' ? 2.4 : 1.5}"/></filter>`
      + `<filter id="${id}-g"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" seed="${compteur}"/><feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .55 0"/></filter>`
      + `<radialGradient id="${id}-s"><stop offset="0" stop-color="${P.sangC}"/><stop offset="1" stop-color="${P.sang}"/></radialGradient>`
      + `<clipPath id="${id}-c"><rect width="${w}" height="${h}" rx="14"/></clipPath></defs>`);
    s.push(`<g clip-path="url(#${id}-c)"><rect width="${w}" height="${h}" fill="${P.fond}"/>`);
    // Thorax : paroi en périphérie, poumons sombres autour du cœur
    s.push(`<defs><radialGradient id="${id}-t" cx=".47" cy=".52" r=".72"><stop offset=".55" stop-color="${P.corps}" stop-opacity="0"/><stop offset="1" stop-color="${P.corps}"/></radialGradient></defs>`);
    s.push(`<rect width="${w}" height="${h}" fill="url(#${id}-t)"/>`);
    // Graisse épicardique et épanchement
    s.push(`<circle cx="${cx}" cy="${cy}" r="${rEpi + 6}" fill="${P.graisse}"/>`);
    s.push(`<path d="${ventriculeDroit(cx, cy, rEpi + 5, 6)}" fill="${P.graisse}"/>`);
    if (o.epanchement) {
      const c = seq === 'cine' ? '#f4f4f7' : seq === 't2' ? '#d5d5da' : '#2c2c31';
      s.push(`<path d="${secteur(cx, cy, rEpi + 7, rEpi + 16, 20, 160)}" fill="${c}" filter="url(#${id}-f)"/>`);
      s.push(`<path d="${secteur(cx, cy, rEpi + 6, rEpi + 7.2, 20, 160)}" fill="#000"/>`);
    }
    // Ventricule droit (paroi fine + cavité)
    s.push(`<path d="${ventriculeDroit(cx, cy, rEpi, 4)}" fill="${seq === 't1map' ? couleurT1(o.t1Normal || 950) : P.myo}"/>`);
    s.push(`<path d="${ventriculeDroit(cx, cy, rEpi - 1, -2)}" fill="url(#${id}-s)"/>`);
    // Myocarde du VG
    const myo = seq === 't1map' ? couleurT1(o.t1Normal || 950) : P.myo;
    s.push(`<path d="${anneau(cx, cy, rEndo, rEpi)}" fill="${myo}" fill-rule="evenodd"/>`);
    s.push(`<circle cx="${cx}" cy="${cy}" r="${rEndo}" fill="url(#${id}-s)"/>`);
    // Piliers (antéro-latéral et postéro-médian)
    if (niv !== 'apical') {
      [[325, 0.78], [100, 0.78]].forEach(([a, k]) => {
        const [x, y] = pt(cx, cy, rEndo * k, a);
        s.push(`<circle cx="${x}" cy="${y}" r="${niv === 'basal' ? 4 : 6.5}" fill="${seq === 't1map' ? couleurT1(o.t1Normal || 950) : P.pilier}"/>`);
      });
    }
    // Lésions
    const couleurLesion = seq === 't1map' ? couleurT1(o.t1Lesion || 1080) : P.lesion;
    const fleches = [];
    lesions.forEach(l => {
      const [k0, k1] = COUCHES[l.couche] || COUCHES['sous-epi'];
      const r0 = rEndo + ep * k0 + (k0 === 0 ? 0.5 : 0), r1 = rEndo + ep * k1 - (k1 === 1 ? 0.5 : 0);
      arcs(l.segments || []).forEach(([a0, a1]) => {
        const marge = l.marge ?? 7;
        let morceaux = [[a0 + marge, a1 - marge]];
        if (l.motif === 'patchy') {
          const n = Math.max(2, Math.round((a1 - a0) / 45)), pas = (a1 - a0) / n;
          morceaux = Array.from({ length: n }, (_, i) => [a0 + i * pas + 5, a0 + (i + 1) * pas - 9]);
        } else if (l.motif === 'focal') {
          const m = (a0 + a1) / 2, d = Math.min(18, (a1 - a0) / 3);
          morceaux = [[m - d, m + d]];
        }
        morceaux.forEach(([b0, b1]) => s.push(`<path d="${secteur(cx, cy, r0, r1, b0, b1)}" fill="${couleurLesion}" filter="url(#${id}-f)"${l.intensite ? ` opacity="${l.intensite}"` : ''}/>`));
        if (o.fleches !== false) fleches.push((a0 + a1) / 2);
      });
    });
    // Grain « IRM »
    s.push(`<rect width="${w}" height="${h}" filter="url(#${id}-g)" opacity="${seq === 't1map' ? 0.06 : 0.16}"/>`);
    // Repères d'orientation (masqués là où pointe une flèche)
    const libre = a => !fleches.some(f => Math.abs(((f - a) % 360 + 540) % 360 - 180) < 28);
    const rep = (a, x, y, t, anc = 'middle') => (libre(a) ? `<text x="${x}" y="${y}" font-size="10" font-weight="800" fill="#b9b9c2" text-anchor="${anc}" letter-spacing=".08em">${t}</text>` : '');
    s.push(rep(270, cx, cy - rEpi - 16, 'ANT') + rep(90, cx, cy + rEpi + 24, 'INF') + rep(0, cx + rEpi + 12, cy + 4, 'LAT', 'start') + rep(180, cx - rEpi - 24, cy + 4, 'VD'));
    fleches.forEach(a => s.push(fleche(cx, cy, a, rEpi + 3, o.couleurFleche || '#f2ab2f')));
    // Étiquettes
    const nomNiv = { basal: 'Petit axe basal', median: 'Petit axe médian', apical: 'Petit axe apical' }[niv] || '';
    s.push(`<text x="12" y="20" font-size="11" font-weight="800" fill="#fff">${esc(o.nomSequence || P.nom)}</text>`);
    s.push(`<text x="12" y="${h - 12}" font-size="10" font-weight="700" fill="#b9b9c2">${esc(nomNiv)}</text>`);
    if (o.titre) {
      const larg = Math.min(w - 20, 20 + o.titre.length * 7);
      s.push(`<rect x="${w - 10 - larg}" y="${h - 30}" width="${f1(larg)}" height="20" rx="10" fill="${o.couleurTitre || '#f2ab2f'}" stroke="${INK}" stroke-width="1.5"/>`);
      s.push(`<text x="${f1(w - 10 - larg / 2)}" y="${h - 16}" font-size="10.5" font-weight="900" fill="${INK}" text-anchor="middle">${esc(o.titre)}</text>`);
    }
    if (seq === 't1map') {
      // Barre de couleurs horizontale (ms), en haut à droite
      const bx = 162, by = 28, bw = 84;
      s.push(`<defs><linearGradient id="${id}-l">${LUT_T1.map(([v, c]) => `<stop offset="${f1((v - 850) / 350)}" stop-color="${c}"/>`).join('')}</linearGradient></defs>`);
      s.push(`<rect x="${bx}" y="${by}" width="${bw}" height="7" rx="3" fill="url(#${id}-l)" stroke="#fff" stroke-width=".7"/>`);
      [900, 1000, 1100].forEach(v => s.push(`<text x="${f1(bx + (v - 850) / 350 * bw)}" y="${by + 17}" font-size="8" font-weight="700" fill="#fff" text-anchor="middle">${v}</text>`));
      s.push(`<text x="${bx + bw}" y="${by - 4}" font-size="8" font-weight="800" fill="#fff" text-anchor="end">T1 (ms)</text>`);
    }
    s.push('</g>');
    s.push(`<rect x="1" y="1" width="${w - 2}" height="${h - 2}" rx="14" fill="none" stroke="${INK}" stroke-width="2"/>`);
    s.push('</svg>');
    return s.join('');
  }

  /* ---------- Œil-de-bœuf (17 segments AHA) ---------- */
  function oeil(o = {}) {
    const atteints = new Map();
    (o.segments || []).forEach(x => {
      const seg = typeof x === 'object' ? x.segment : x;
      atteints.set(seg, typeof x === 'object' && x.couleur ? x.couleur : (o.couleur || '#d4174a'));
    });
    const W = 150, H = 182, cx = 75, cy = 92, R = [14, 32, 50, 68];
    const s = [`<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${esc(o.aria || `Œil-de-bœuf des 17 segments AHA${atteints.size ? ` : segments ${[...atteints.keys()].sort((a, b) => a - b).join(', ')} atteints` : ''}`)}" font-family="${FONT}">`];
    s.push(`<text x="${cx}" y="13" font-size="10" font-weight="900" fill="${INK}" text-anchor="middle" letter-spacing=".06em">${esc(o.titre || 'SEGMENTS AHA')}</text>`);
    const cell = (seg, d) => {
      const c = atteints.get(seg);
      s.push(`<path d="${d}" fill="${c || '#fff'}" stroke="${INK}" stroke-width="1.3"/>`);
    };
    const lab = (seg, r, a) => { const [x, y] = pt(cx, cy, r, a); s.push(`<text x="${x}" y="${f1(y + 3.2)}" font-size="8.5" font-weight="800" fill="${atteints.has(seg) ? '#fff' : '#55545f'}" text-anchor="middle">${seg}</text>`); };
    for (let i = 0; i < 6; i++) {
      const [a0, a1] = ANG6[i];
      cell(i + 1, secteur(cx, cy, R[2], R[3], a0, a1)); lab(i + 1, (R[2] + R[3]) / 2, (a0 + a1) / 2);
      cell(i + 7, secteur(cx, cy, R[1], R[2], a0, a1)); lab(i + 7, (R[1] + R[2]) / 2, (a0 + a1) / 2);
    }
    for (let i = 0; i < 4; i++) {
      const [a0, a1] = ANG4[i];
      cell(i + 13, secteur(cx, cy, R[0], R[1], a0, a1)); lab(i + 13, (R[0] + R[1]) / 2, (a0 + a1) / 2);
    }
    cell(17, `M${cx - R[0]} ${cy} a${R[0]} ${R[0]} 0 1 0 ${2 * R[0]} 0 a${R[0]} ${R[0]} 0 1 0 ${-2 * R[0]} 0 Z`);
    lab(17, 0, 0);
    s.push(`<text x="${cx}" y="${cy - R[3] - 4}" font-size="7.5" font-weight="800" fill="#55545f" text-anchor="middle">ANT</text>`);
    s.push(`<text x="${cx}" y="${cy + R[3] + 16}" font-size="7.5" font-weight="700" fill="#55545f" text-anchor="middle">base en périphérie · septum à gauche</text>`);
    s.push('</svg>');
    return s.join('');
  }

  /* Segments AHA concernés par une ou plusieurs coupes */
  function segmentsAtteints(panneaux) {
    const set = new Set();
    panneaux.forEach(p => (p.lesions || []).forEach(l => (l.segments || []).forEach(x => set.add(x))));
    return [...set].sort((a, b) => a - b);
  }
  function description(o) {
    const nomNiv = { basal: 'basal', median: 'médian', apical: 'apical' }[o.niveau || 'median'];
    const seq = (SEQUENCES[o.sequence] || SEQUENCES.lge).nom;
    const les = (o.lesions || []).map(l => `${LIBELLES_COUCHE[l.couche] || LIBELLES_COUCHE['sous-epi']} ${l.segments && l.segments.length > 1 ? 'des segments' : 'du segment'} ${(l.segments || []).join(', ')}`);
    return `Schéma petit axe ${nomNiv}, ${seq}${les.length ? ` : anomalie ${les.join(' ; ')}` : ''}`;
  }

  /* Figure complète : une ou plusieurs coupes + œil-de-bœuf (HTML) */
  function figure(o = {}) {
    const panneaux = o.panneaux || [o];
    const segs = o.oeil === false ? null : (Array.isArray(o.oeil) ? o.oeil : segmentsAtteints(panneaux));
    return `<div class="coeur-panneaux">${panneaux.map(p => `<div class="coeur-coupe">${petitAxe(p)}</div>`).join('')}`
      + (segs && segs.length ? `<div class="coeur-oeil">${oeil({ segments: segs, couleur: o.couleurOeil })}</div>` : '') + '</div>';
  }

  return { SEQUENCES, COUCHES, LIBELLES_COUCHE, niveau, nomSegment, angles, arcs, couleurT1, petitAxe, oeil, segmentsAtteints, description, figure };
});
