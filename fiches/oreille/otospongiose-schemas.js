/* =========================================================
   RadiologicHub — Otospongiose : schémas SVG « façon TDM » (os blanc, foyer gris)
   ---------------------------------------------------------
   capsule(type, { endoste })  coupe axiale schématique de l'oreille droite (antérieur en haut,
                               latéral à gauche) avec le foyer du type de Veillon demandé ;
   fenetreRonde(grade)         niche de la fenêtre ronde, grades 1 à 4 de Fraysse ;
   coronal(decalage)           coupe coronale : canal facial et plan du bord inférieur de la fenêtre ovale ;
   fenetreOvale(mm)            largeur du récessus de la fenêtre ovale ;
   audiogramme(avance)         surdité de transmission avec encoche de Carhart, ou mixte.
   Ce sont des schémas : ni échelle ni anatomie exacte.
   ========================================================= */
(function (root) {
  'use strict';
  const OS = '#ece7da', LUMIERE = '#2f3036', AIR = '#0b0b0d', PARTIES = '#5b5d66', FOYER = '#8f8a7e';
  const T = (x, y, t, o = {}) => `<text x="${x}" y="${y}" font-size="${o.s || 10}" font-weight="${o.w || 800}" fill="${o.c || '#fff'}" text-anchor="${o.a || 'middle'}" ${o.halo === false ? '' : 'stroke="#000" stroke-width="2.6" paint-order="stroke"'}>${t}</text>`;
  let n = 0;

  function spirale(cx, cy, r0, tours, ep, couleur) {
    const pts = [];
    for (let i = 0; i <= tours * 60; i++) { const a = i / 60 * Math.PI * 2, r = r0 * (1 - i / (tours * 60) * .78); pts.push(`${(cx + r * Math.cos(a)).toFixed(1)} ${(cy + r * Math.sin(a)).toFixed(1)}`); }
    return `<path d="M${pts.join(' L')}" fill="none" stroke="${couleur}" stroke-width="${ep}" stroke-linecap="round"/>`;
  }

  function capsule(type, o = {}) {
    const id = 'oto' + (++n);
    const s = [`<svg viewBox="0 0 360 240" class="oto-svg" role="img" aria-label="Coupe axiale schématique : ${type ? 'foyer de type ' + type + ' de Veillon' : 'pas de foyer'}" font-family="Montserrat, Arial, sans-serif">`,
      `<defs><filter id="${id}-f"><feGaussianBlur stdDeviation="${o.inactif ? 0.6 : 2.4}"/></filter></defs>`,
      `<rect width="360" height="240" fill="${PARTIES}"/>`,
      `<path d="M8 40 Q40 22 120 30 L150 40 L150 210 L118 222 Q40 226 8 205Z" fill="${AIR}"/>`,
      `<path d="M128 20 Q220 6 330 26 Q352 60 350 120 Q352 190 320 222 Q220 236 132 222 L132 166 L146 166 L146 128 L132 128Z" fill="${OS}"/>`,
      spirale(212, 78, 36, 2.4, 6.5, LUMIERE),
      `<ellipse cx="214" cy="150" rx="25" ry="19" fill="${LUMIERE}"/>`,
      `<path d="M186 160 Q150 186 160 206 Q176 222 206 208 Q226 196 214 168" fill="none" stroke="${LUMIERE}" stroke-width="7"/>`,
      `<rect x="252" y="110" width="98" height="24" rx="6" fill="${PARTIES}"/>`,
      `<rect x="140" y="130" width="${type === '1A' ? 8 : 3.5}" height="34" fill="${type === '1A' ? FOYER : OS}"${type === '1A' ? ` filter="url(#${id}-f)"` : ''}/>`,
      `<path d="M140 134 L104 142 L100 150 L104 158 L140 160" fill="none" stroke="${OS}" stroke-width="3"/>`,
      `<path d="M104 150 L70 146" stroke="${OS}" stroke-width="4"/>`];
    const foyer = {
      '1B': `<circle cx="150" cy="120" r="7"/>`,
      2: `<ellipse cx="158" cy="110" rx="15" ry="13"/>`,
      3: `<ellipse cx="166" cy="98" rx="22" ry="18"/>`,
      '4A': `<path d="M176 42 Q212 26 248 44 Q264 70 252 104 Q236 124 206 120 L198 108 Q234 108 242 82 Q246 54 214 46 Q190 44 180 60Z"/><ellipse cx="160" cy="112" rx="13" ry="11"/>`,
      '4B': `<path d="M178 152 Q146 182 154 210 Q178 232 214 214 Q236 196 226 166 L214 168 Q222 194 206 202 Q178 210 168 196 Q162 180 190 162Z"/><ellipse cx="158" cy="112" rx="13" ry="11"/>`,
    }[type];
    if (foyer) s.push(`<g fill="${FOYER}" filter="url(#${id}-f)">${foyer}</g>`);
    if (o.endoste && (type === '3' || type === '4A')) s.push(`<g filter="url(#${id}-f)">${spirale(212, 78, 36, .5, 9, FOYER)}</g>`);
    s.push(T(52, 120, 'caisse'), T(84, 138, 'étrier', { s: 9 }), T(212, 30, 'cochlée', { c: '#2a9d8f' }), T(214, 154, 'vestibule', { s: 9, c: '#2a9d8f' }),
      T(186, 230, 'CSC latéral', { s: 9, c: '#2a9d8f' }), T(300, 126, 'MAI', { s: 9 }), T(124, 186, 'fenêtre', { s: 8, a: 'end' }), T(124, 196, 'ovale', { s: 8, a: 'end' }));
    if (type && type !== '1A') s.push(`<path d="M132 74 L148 104" stroke="#f2ab2f" stroke-width="2"/>`, T(116, 70, 'fissula ante fenestram', { s: 8, c: '#f2ab2f' }));
    s.push(T(352, 14, 'antérieur ↑', { s: 8, a: 'end', c: '#ddd' }), '</svg>');
    return s.join('');
  }

  function fenetreRonde(grade) {
    const s = [`<svg viewBox="0 0 200 150" class="oto-svg" role="img" aria-label="Fenêtre ronde, grade ${grade} de Fraysse" font-family="Montserrat, Arial, sans-serif">`,
      `<rect width="200" height="150" fill="${PARTIES}"/>`, `<path d="M0 0 H90 L120 60 L90 150 H0Z" fill="${AIR}"/>`,
      `<path d="M90 0 H200 V150 H90 L120 60Z" fill="${OS}"/>`,
      `<path d="M120 60 Q150 40 180 60 Q190 90 170 112 Q150 124 130 108" fill="none" stroke="${LUMIERE}" stroke-width="18" stroke-linecap="round"/>`,
      `<path d="M104 46 Q118 60 104 76" fill="none" stroke="#fff" stroke-width="2" stroke-dasharray="3 2"/>`];
    if (grade >= 2) s.push(`<g fill="${FOYER}"><circle cx="102" cy="40" r="${grade >= 3 ? 9 : 6}"/><circle cx="102" cy="82" r="${grade >= 3 ? 9 : 6}"/></g>`);
    if (grade >= 3) s.push(`<path d="M92 40 Q118 60 92 84 L104 84 Q128 60 104 38Z" fill="${FOYER}"/>`);
    if (grade >= 4) s.push(`<path d="M120 60 Q150 40 180 60 Q190 90 170 112" fill="none" stroke="${FOYER}" stroke-width="16" stroke-linecap="round"/>`);
    s.push(T(46, 140, 'caisse', { s: 9 }), T(160, 140, 'rampe tympanique', { s: 8, c: '#2a9d8f' }), T(70, 64, 'fenêtre ronde', { s: 8, c: '#f2ab2f', a: 'end' }), '</svg>');
    return s.join('');
  }

  function coronal(decalage) {
    const y0 = 110, ny = y0 - 18 - decalage * 14;
    const proc = decalage < 0;
    return [`<svg viewBox="0 0 240 170" class="oto-svg" role="img" aria-label="Coupe coronale : canal facial ${proc ? 'procident' : 'en place'}" font-family="Montserrat, Arial, sans-serif">`,
      `<rect width="240" height="170" fill="${PARTIES}"/>`, `<path d="M0 0 H110 V170 H0Z" fill="${AIR}"/>`,
      `<path d="M110 0 H240 V170 H110Z" fill="${OS}"/>`, `<rect x="110" y="${y0 - 26}" width="34" height="26" fill="${AIR}"/>`,
      `<ellipse cx="175" cy="${y0 - 13}" rx="30" ry="22" fill="${LUMIERE}"/>`,
      `<path d="M112 ${y0 - 22} L144 ${y0 - 20} M112 ${y0 - 4} L144 ${y0 - 6}" stroke="${OS}" stroke-width="3"/>`,
      `<line x1="40" y1="${y0}" x2="230" y2="${y0}" stroke="#f2ab2f" stroke-width="1.6" stroke-dasharray="5 3"/>`,
      `<circle cx="122" cy="${ny}" r="9" fill="${PARTIES}" stroke="${proc ? '#c8102e' : OS}" stroke-width="2.5"/>`,
      `<circle cx="122" cy="${ny}" r="5" fill="#ffd54f"/>`,
      T(6, y0 + 12, 'bord inférieur de la', { s: 8, c: '#f2ab2f', a: 'start' }), T(6, y0 + 22, 'fenêtre ovale', { s: 8, c: '#f2ab2f', a: 'start' }),
      T(122, ny - 13, 'VII2', { s: 9, c: proc ? '#ff8a8a' : '#ffd54f' }), T(175, y0 - 9, 'vestibule', { s: 8, c: '#2a9d8f' }),
      proc ? T(120, 160, 'procident', { s: 11, c: '#ff8a8a' }) : '', '</svg>'].join('');
  }

  function fenetreOvale(mm) {
    const w = Math.max(6, mm * 26);
    const etroite = mm < 1.4, limite = mm >= 1.4 && mm < 1.5;
    const c = etroite ? '#c8102e' : limite ? '#f18d25' : '#2a9d8f';
    return [`<svg viewBox="0 0 220 120" class="oto-svg" role="img" aria-label="Récessus de la fenêtre ovale de ${mm} mm" font-family="Montserrat, Arial, sans-serif">`,
      `<rect width="220" height="120" fill="${PARTIES}"/>`, `<path d="M0 0 H220 V40 Q110 52 0 40Z" fill="${OS}"/>`, `<path d="M0 120 H220 V80 Q110 70 0 80Z" fill="${OS}"/>`,
      `<rect x="${110 - w / 2}" y="40" width="${w}" height="40" fill="${AIR}"/>`,
      `<path d="M${110 - w / 2} 92 H${110 + w / 2} M${110 - w / 2} 86 V98 M${110 + w / 2} 86 V98" stroke="${c}" stroke-width="2.5"/>`,
      `<path d="M${110 - w / 2} 22 L110 34 L${110 + w / 2} 22" fill="none" stroke="${OS}" stroke-width="3"/>`,
      T(110, 112, `${String(mm).replace('.', ',')} mm`, { s: 11, c }), T(110, 16, 'canal facial au-dessus', { s: 8, c: '#ddd' }), '</svg>'].join('');
  }

  function audiogramme(avance) {
    const f = [250, 500, 1000, 2000, 4000, 8000], X = i => 40 + i * 36, Y = db => 20 + db * 1.4;
    const co = avance ? [45, 50, 55, 65, 70, 75] : [40, 40, 35, 35, 30, 30];
    const cos = avance ? [15, 20, 25, 45, 45, 50] : [5, 10, 10, 25, 10, 10];
    const ligne = (v, c, d) => `<path d="M${v.map((db, i) => `${X(i)} ${Y(db)}`).join(' L')}" fill="none" stroke="${c}" stroke-width="2.4"${d ? ' stroke-dasharray="5 3"' : ''}/>` + v.map((db, i) => `<circle cx="${X(i)}" cy="${Y(db)}" r="3.4" fill="#fff" stroke="${c}" stroke-width="2"/>`).join('');
    return [`<svg viewBox="0 0 260 170" class="oto-svg oto-audio" role="img" aria-label="Audiogramme : ${avance ? 'surdité mixte' : 'surdité de transmission avec encoche de Carhart'}" font-family="Montserrat, Arial, sans-serif">`,
      `<rect width="260" height="170" fill="#fff"/>`,
      ...[0, 20, 40, 60, 80, 100].map(db => `<line x1="34" x2="230" y1="${Y(db)}" y2="${Y(db)}" stroke="#e3e3e8"/><text x="28" y="${Y(db) + 3}" font-size="7" fill="#777" text-anchor="end">${db}</text>`),
      ...f.map((h, i) => `<line x1="${X(i)}" x2="${X(i)}" y1="20" y2="${Y(100)}" stroke="#eeeef2"/><text x="${X(i)}" y="14" font-size="7" fill="#777" text-anchor="middle">${h >= 1000 ? h / 1000 + 'k' : h}</text>`),
      `<rect x="${X(0)}" y="${Y(0)}" width="${X(5) - X(0)}" height="${Y(20) - Y(0)}" fill="#2a9d8f" opacity=".08"/>`,
      `<path d="M${f.map((_, i) => `${X(i)} ${Y(cos[i])}`).join(' L')} L${f.map((_, i) => `${X(5 - i)} ${Y(co[5 - i])}`).join(' L')}Z" fill="#f2ab2f" opacity=".22"/>`,
      ligne(co, '#c8102e'), ligne(cos, '#3c67b8', true),
      avance ? '' : `<path d="M${X(3)} ${Y(25) + 6} l0 30" stroke="#3c67b8" stroke-width="1.5"/><text x="${X(3)}" y="${Y(25) + 46}" font-size="8" font-weight="800" fill="#3c67b8" text-anchor="middle">encoche de Carhart</text>`,
      `<text x="236" y="${Y(co[5]) + 3}" font-size="8" font-weight="800" fill="#c8102e">CA</text><text x="236" y="${Y(cos[5]) + 3}" font-size="8" font-weight="800" fill="#3c67b8">CO</text>`,
      `<text x="132" y="166" font-size="7" fill="#777" text-anchor="middle">fréquence (Hz) — perte (dB)</text>`, '</svg>'].join('');
  }

  const api = { capsule, fenetreRonde, coronal, fenetreOvale, audiogramme };
  if (typeof module === 'object' && module.exports) module.exports = api; else root.RHOto = api;
})(typeof self !== 'undefined' ? self : this);
