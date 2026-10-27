/* =========================================================
   RadiologicHub — fiche « Ischémie mésentérique » : illustrations SVG
   ---------------------------------------------------------
   Dessins pédagogiques (pas des images de patients) :
   • axe(o)        : aorte et AMS de profil (schéma) ; occlusion à une
                     distance donnée de l'ostium (ostiale = thrombotique,
                     3 à 10 premiers cm = embolique), calcifications ;
   • anse(type)    : coupe d'une anse grêle façon TDM (fenêtre abdominale) —
                     normale, épaissie en cible, amincie, hyperdense sans
                     injection, défaut de rehaussement, pneumatose en
                     bulles ou linéaire, dilatée, feces sign ;
   • air(type)     : aéroportie, aéromésentérie, pneumopéritoine ;
   • mesentere(t)  : signe du peigne, infiltration de la graisse, ascite ;
   • veine()       : thrombus veineux spontanément hyperdense ;
   • colon()       : zones de faiblesse de l'ischémie non occlusive ;
   • vasospasme()  : AMS de calibre diminué et irrégulier.
   Module sans dépendance au navigateur (tests/ischemie-mesenterique.test.js).
   ========================================================= */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.RHIschemie = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const W = 240, H = 240;
  const C = {
    fond: '#050506', graisse: '#3b3a38', tissu: '#8d8a85', muqueuse: '#ecebe6', oedeme: '#5c5a57',
    contraste: '#f4f3ee', air: '#000000', liquide: '#6f6c68', muscle: '#7b7772', os: '#f0ede4',
    trait: '#f2ab2f', mesure: '#2ec4b6', texte: '#ffffff', rouge: '#ff6b6b',
  };
  const f1 = n => Math.round(n * 10) / 10;
  const cadre = (corps, titre, vb = `0 0 ${W} ${H}`) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" role="img" aria-label="${titre}" font-family="Montserrat, Arial, sans-serif">${corps}</svg>`;
  const etiquette = (x, y, t, o = {}) => `<text x="${x}" y="${y}" font-size="${o.size || 10}" font-weight="800" fill="${o.fill || C.texte}" text-anchor="${o.anchor || 'middle'}" paint-order="stroke" stroke="${o.halo || '#000'}" stroke-width="2.6" stroke-linejoin="round">${t}</text>`;
  function alea(graine) {
    let a = graine >>> 0;
    return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }

  /* ---------- Aorte et AMS de profil (antérieur à gauche) ---------- */
  // L'AMS part de l'aorte (x = 150) et descend vers l'avant ; 1 cm = 9 unités le long de l'artère
  const CM = 9;
  const AMS = t => {                              // point de l'AMS à t cm de l'ostium
    const s = Math.min(t, 16) * CM;
    if (s < 20) return [150 - s * 0.9, 96 + s * 0.45];
    return [132 - (s - 20) * 0.25, 105 + (s - 20) * 0.95];
  };
  function axe(o = {}) {
    let s = `<rect width="${W}" height="${H}" fill="#fbfaf7"/>`;
    s += `<rect x="150" y="6" width="34" height="228" rx="10" fill="#f6c9c9" stroke="#c8102e" stroke-width="2.5"/>`;
    s += etiquette(167, 228, 'aorte', { fill: '#a8172d', halo: '#fff', size: 9 });
    if (o.calcif) for (const y of [40, 70, 140, 180]) s += `<rect x="150" y="${y}" width="5" height="10" rx="2" fill="#555"/><rect x="179" y="${y + 12}" width="5" height="10" rx="2" fill="#555"/>`;
    // tronc cœliaque
    s += `<path d="M150 66C130 60 112 54 92 52" fill="none" stroke="#c8102e" stroke-width="9" stroke-linecap="round"/><path d="M150 66C130 60 112 54 92 52" fill="none" stroke="#f6c9c9" stroke-width="5" stroke-linecap="round"/>`;
    s += etiquette(86, 46, 'tronc cœliaque', { fill: '#a8172d', halo: '#fff', size: 9, anchor: 'end' });
    // AMS
    const pts = []; for (let t = 0; t <= 16; t += 0.5) pts.push(AMS(t));
    const d = 'M' + pts.map(p => `${f1(p[0])} ${f1(p[1])}`).join('L');
    // zones d'orientation : ostium (thrombose), 3-10 cm (embolie)
    if (o.zones !== false) {
      const seg = (a, b) => { const p = []; for (let t = a; t <= b; t += 0.5) p.push(AMS(t)); return 'M' + p.map(q => `${f1(q[0])} ${f1(q[1])}`).join('L'); };
      s += `<path d="${seg(0, 1)}" fill="none" stroke="#f2ab2f" stroke-width="22" stroke-linecap="round" opacity=".45"/>`;
      s += `<path d="${seg(3, 10)}" fill="none" stroke="#3c67b8" stroke-width="22" stroke-linecap="round" opacity=".25"/>`;
      s += etiquette(176, 104, 'ostium', { fill: '#8a5a00', halo: '#fff', size: 9, anchor: 'start' });
      const m = AMS(6.5);
      s += etiquette(m[0] - 16, m[1] + 4, '3 à 10 cm', { fill: '#2a4b8f', halo: '#fff', size: 9, anchor: 'end' });
    }
    s += `<path d="${d}" fill="none" stroke="#c8102e" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="#f6c9c9" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`;
    const b = AMS(16); s += etiquette(b[0] + 6, b[1] - 4, 'AMS', { fill: '#a8172d', halo: '#fff', size: 10, anchor: 'start' });
    // occlusion : la lumière en aval n'est plus opacifiée
    if (o.occlusion != null) {
      const t0 = Math.max(0, Math.min(15, +o.occlusion)), p = AMS(t0);
      const aval = []; for (let t = t0; t <= 16; t += 0.5) aval.push(AMS(t));
      s += `<path d="M${aval.map(q => `${f1(q[0])} ${f1(q[1])}`).join('L')}" fill="none" stroke="#9a9a9a" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`;
      s += `<circle cx="${f1(p[0])}" cy="${f1(p[1])}" r="7.5" fill="${o.type === 'embole' ? '#3c67b8' : '#5b2a86'}" stroke="#111" stroke-width="2"/>`;
    }
    return cadre(s, 'aorte et artère mésentérique supérieure de profil');
  }

  /* ---------- Anse grêle en coupe, fenêtre abdominale ---------- */
  function fondAbdo(g = 3) {
    const rnd = alea(g);
    let s = `<rect width="${W}" height="${H}" fill="${C.graisse}"/>`;
    for (let i = 0; i < 14; i++) s += `<circle cx="${f1(rnd() * W)}" cy="${f1(rnd() * H)}" r="${f1(1 + rnd() * 1.8)}" fill="#9b9893" opacity=".7"/>`;
    return s;
  }
  const anneau = (cx, cy, r, ep, couleur) => `<circle cx="${cx}" cy="${cy}" r="${f1(r - ep / 2)}" fill="none" stroke="${couleur}" stroke-width="${f1(ep)}"/>`;
  function anse(type = 'normale', o = {}) {
    let s = fondAbdo(o.graine || 5);
    const cx = 120, cy = 116;
    const legende = o.legende !== false;
    const voisine = (rehausse = true) => `<circle cx="196" cy="198" r="30" fill="${C.liquide}"/>${anneau(196, 198, 30, 4, rehausse ? C.muqueuse : C.tissu)}`;
    switch (type) {
      case 'epaissie':
        // cible : muqueuse rehaussée, sous-muqueuse œdémateuse hypodense, musculeuse/séreuse
        s += `<circle cx="${cx}" cy="${cy}" r="62" fill="${C.tissu}"/><circle cx="${cx}" cy="${cy}" r="54" fill="${C.oedeme}"/><circle cx="${cx}" cy="${cy}" r="30" fill="${C.muqueuse}"/><circle cx="${cx}" cy="${cy}" r="22" fill="${C.liquide}"/>`;
        if (legende) s += `<line x1="${cx + 30}" y1="${cy - 58}" x2="${cx + 62}" y2="${cy - 58}" stroke="${C.trait}" stroke-width="2"/>` + etiquette(cx, 30, 'épaississement > 3 mm, cible', { fill: C.trait }) + etiquette(cx, 226, 'œdème sous-muqueux : absence de nécrose', { size: 9, fill: C.mesure });
        break;
      case 'amincie':
        s += `<circle cx="${cx}" cy="${cy}" r="56" fill="${C.liquide}"/>${anneau(cx, cy, 56, 1.2, '#7d7a75')}` + voisine(true);
        if (legende) s += etiquette(cx, 34, 'paroi à la limite de la visibilité', { fill: C.trait });
        break;
      case 'hyperdense':
        s += `<rect x="6" y="186" width="80" height="40" rx="12" fill="${C.muscle}"/>` + etiquette(46, 210, 'muscle', { size: 9 });
        s += `<circle cx="${cx}" cy="${cy - 10}" r="54" fill="${C.liquide}"/>${anneau(cx, cy - 10, 54, 9, '#c9c6bf')}`;
        if (legende) s += etiquette(cx, 26, 'sans injection : paroi > muscle', { fill: C.trait });
        break;
      case 'non-rehaussee':
        s += `<circle cx="${cx - 10}" cy="${cy - 10}" r="54" fill="${C.liquide}"/>${anneau(cx - 10, cy - 10, 54, 5, '#77746f')}` + voisine(true);
        if (legende) s += etiquette(cx - 10, 26, 'rehaussement < anses adjacentes', { fill: C.trait }) + etiquette(196, 160, 'anse saine', { size: 9, fill: C.mesure });
        break;
      case 'pneumatose-bulles':
      case 'pneumatose-lineaire': {
        s += `<circle cx="${cx}" cy="${cy}" r="56" fill="${C.liquide}"/>${anneau(cx, cy, 56, 7, C.tissu)}`;
        if (type === 'pneumatose-bulles') {
          const rnd = alea(9);
          for (let i = 0; i < 16; i++) { const a = rnd() * 6.28; s += `<circle cx="${f1(cx + Math.cos(a) * 52.5)}" cy="${f1(cy + Math.sin(a) * 52.5)}" r="${f1(2 + rnd() * 2.2)}" fill="${C.air}"/>`; }
          if (legende) s += etiquette(cx, 26, 'pneumatose bulleuse', { fill: C.trait });
        } else {
          s += `<path d="M${cx - 50} ${cy + 22}A55 55 0 0 0 ${cx + 46} ${cy + 30}" fill="none" stroke="${C.air}" stroke-width="3.2"/><path d="M${cx - 34} ${cy - 41}A53 53 0 0 1 ${cx + 30} ${cy - 44}" fill="none" stroke="${C.air}" stroke-width="3.2"/>`;
          if (legende) s += etiquette(cx, 26, 'bulles linéaires en bande', { fill: C.rouge });
        }
        break;
      }
      case 'dilatee': {
        // niveau hydro-aérique : gaz en haut, liquide en bas
        const y0 = cy - 18, dx = f1(Math.sqrt(76 * 76 - 18 * 18));
        s += `<circle cx="${cx}" cy="${cy}" r="76" fill="${C.air}"/><path d="M${cx - dx} ${y0}A76 76 0 1 0 ${cx + dx} ${y0}Z" fill="${C.liquide}"/>${anneau(cx, cy, 78, 3, C.muqueuse)}`;
        if (legende) s += `<line x1="${cx - 78}" y1="${cy + 92}" x2="${cx + 78}" y2="${cy + 92}" stroke="${C.mesure}" stroke-width="2.4"/>` + etiquette(cx, cy + 108, 'grêle > 25 mm', { fill: C.mesure });
        break;
      }
      case 'feces': {
        s += `<circle cx="${cx}" cy="${cy}" r="76" fill="${C.liquide}"/>${anneau(cx, cy, 76, 3, C.muqueuse)}`;
        const rnd = alea(14);
        for (let i = 0; i < 26; i++) { const a = rnd() * 6.28, d = Math.sqrt(rnd()) * 56; s += `<circle cx="${f1(cx + Math.cos(a) * d)}" cy="${f1(cy + 10 + Math.sin(a) * d * 0.8)}" r="${f1(1.5 + rnd() * 4)}" fill="${rnd() > 0.45 ? C.air : '#9f9a90'}"/>`; }
        if (legende) s += etiquette(cx, 26, 'gaz + débris dans une anse dilatée', { fill: C.trait });
        break;
      }
      default:
        s += `<circle cx="${cx}" cy="${cy}" r="54" fill="${C.liquide}"/>${anneau(cx, cy, 54, 4, C.muqueuse)}` + voisine(true);
        if (legende) s += etiquette(cx, 26, 'paroi fine, bien rehaussée', { fill: C.mesure });
    }
    return cadre(s, `anse grêle : ${type}`);
  }

  /* ---------- Air anormal ---------- */
  function air(type = 'aeroportie') {
    let s;
    if (type === 'aeroportie') {
      s = `<rect width="${W}" height="${H}" fill="${C.fond}"/><path d="M10 40C70 10 200 14 230 60C238 120 200 190 120 214C60 220 14 170 10 40Z" fill="#8f8b84"/>`;
      // air dans les branches portes jusqu'à la périphérie du foie
      const br = (x, y, a, L, w, n) => { const x2 = x + Math.cos(a) * L, y2 = y + Math.sin(a) * L; let t = `<line x1="${f1(x)}" y1="${f1(y)}" x2="${f1(x2)}" y2="${f1(y2)}" stroke="#000" stroke-width="${w}" stroke-linecap="round"/>`; if (n) { t += br(x2, y2, a - 0.45, L * 0.7, w * 0.7, n - 1) + br(x2, y2, a + 0.4, L * 0.7, w * 0.7, n - 1); } return t; };
      s += br(160, 150, -2.2, 34, 3, 3) + br(150, 160, -1.2, 32, 3, 3) + br(140, 160, 2.8, 30, 3, 3);
      s += etiquette(120, 232, 'aéroportie : air jusqu’en périphérie du foie', { size: 9, fill: C.rouge });
    } else if (type === 'aeromesenterie') {
      s = fondAbdo(8);
      s += `<circle cx="70" cy="80" r="26" fill="${C.liquide}"/>${anneau(70, 80, 26, 4, C.tissu)}`;
      for (const [x1, y1, x2, y2] of [[90, 96, 150, 150], [110, 120, 170, 120], [150, 150, 200, 200], [130, 136, 120, 200]]) s += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#000" stroke-width="3" stroke-linecap="round"/>`;
      s += etiquette(150, 228, 'aéromésentérie : air dans les veines du mésentère', { size: 9, fill: C.rouge });
    } else {
      s = `<rect width="${W}" height="${H}" fill="${C.fond}"/><path d="M0 70C60 50 180 50 240 70V240H0Z" fill="${C.graisse}"/><path d="M20 70C80 52 160 52 220 70C160 84 80 84 20 70Z" fill="#000"/>`;
      s += `<path d="M0 66C60 46 180 46 240 66" fill="none" stroke="${C.muscle}" stroke-width="10"/>`;
      s += etiquette(120, 110, 'pneumopéritoine', { fill: C.rouge }) + etiquette(120, 126, 'air extradigestif : perforation', { size: 9 });
    }
    return cadre(s, type);
  }

  /* ---------- Mésentère ---------- */
  function mesentere(type = 'peigne') {
    let s = type === 'infiltration' ? `<rect width="${W}" height="${H}" fill="#57554f"/>` : fondAbdo(12);
    if (type === 'ascite') {
      s += `<path d="M0 150C60 130 180 130 240 150V240H0Z" fill="${C.liquide}"/>`;
      for (const [x, y] of [[70, 80], [150, 70], [110, 120]]) s += `<circle cx="${x}" cy="${y}" r="26" fill="${C.liquide}"/>${anneau(x, y, 26, 4, C.muqueuse)}`;
      s += etiquette(120, 200, 'ascite', { fill: C.trait });
    } else {
      // vasa recta : dents du peigne depuis l'axe veineux vers les anses
      const engorge = type === 'peigne';
      s += `<path d="M20 200C80 170 160 170 220 200" fill="none" stroke="${C.contraste}" stroke-width="${engorge ? 9 : 6}"/>`;
      for (let i = 0; i < 9; i++) { const x = 34 + i * 22; s += `<line x1="${x}" y1="${190 - Math.abs(4 - i) * 2}" x2="${x + (i - 4) * 4}" y2="70" stroke="${C.contraste}" stroke-width="${engorge ? 5 : 2.4}" stroke-linecap="round"/>`; }
      s += `<path d="M10 56C70 36 170 36 230 56" fill="none" stroke="${C.muqueuse}" stroke-width="14" opacity=".7"/>`;
      s += etiquette(120, 230, engorge ? 'signe du peigne : engorgement veineux' : 'densité de la graisse augmentée', { size: 9, fill: C.trait });
    }
    return cadre(s, type);
  }

  /* ---------- Veine mésentérique : thrombus spontanément hyperdense ---------- */
  function veine(o = {}) {
    let s = fondAbdo(15);
    s += `<circle cx="80" cy="110" r="22" fill="#a39f98"/>` + etiquette(80, 150, 'AMS', { size: 9 });
    s += `<circle cx="150" cy="110" r="28" fill="${o.injecte ? '#5b5954' : '#d4d0c8'}"/>` + etiquette(150, 156, 'VMS', { size: 9 });
    if (o.injecte) s += `<circle cx="150" cy="110" r="28" fill="none" stroke="${C.contraste}" stroke-width="4"/>`;
    s += etiquette(120, 30, o.injecte ? 'temps portal : défaut endoluminal' : 'sans injection : thrombus hyperdense', { fill: C.trait });
    return cadre(s, 'thrombose veineuse mésentérique');
  }

  /* ---------- Côlon : zones de faiblesse (ischémie non occlusive) ---------- */
  function colon() {
    let s = `<rect width="${W}" height="${H}" fill="#fbfaf7"/>`;
    const d = 'M70 206C52 200 48 186 50 170V70C50 50 64 42 84 42H160C180 42 192 50 192 70V170C192 192 178 200 160 202C150 204 142 214 138 228';
    s += `<path d="${d}" fill="none" stroke="#c9b9a6" stroke-width="22" stroke-linecap="round" stroke-linejoin="round"/>`;
    s += `<path d="M70 206C80 210 96 206 104 196" fill="none" stroke="#e7c9a6" stroke-width="10" stroke-linecap="round"/>`;
    const zone = (x, y, t, a = 'middle', dy = 0) => `<circle cx="${x}" cy="${y}" r="17" fill="#c8102e" opacity=".35"/><circle cx="${x}" cy="${y}" r="17" fill="none" stroke="#c8102e" stroke-width="2.5"/>` + etiquette(x + (a === 'start' ? 22 : a === 'end' ? -22 : 0), y + 4 + dy, t, { fill: '#a8172d', halo: '#fff', size: 9, anchor: a });
    s += zone(58, 196, 'angle iléo-cæcal', 'start', -26);
    s += zone(190, 54, 'angle colique gauche', 'end', 26);
    s += `<circle cx="152" cy="206" r="17" fill="#c8102e" opacity=".35"/><circle cx="152" cy="206" r="17" fill="none" stroke="#c8102e" stroke-width="2.5"/>` + etiquette(140, 236, 'jonction recto-sigmoïdienne', { fill: '#a8172d', halo: '#fff', size: 9 });
    s += etiquette(120, 124, 'zones de faiblesse', { fill: '#111', halo: '#fff', size: 11 });
    return cadre(s, 'zones de faiblesse du côlon');
  }

  /* ---------- Vasospasme : AMS fine et irrégulière, arcades non vues ---------- */
  function vasospasme() {
    let s = `<rect width="${W}" height="${H}" fill="#fbfaf7"/>`;
    const rnd = alea(4);
    let d = 'M120 10';
    for (let y = 20; y <= 220; y += 10) d += `L${f1(120 + (rnd() - 0.5) * 6)} ${y}`;
    s += `<path d="${d}" fill="none" stroke="#c8102e" stroke-width="4"/>`;
    for (let i = 0; i < 6; i++) { const y = 40 + i * 30, sens = i % 2 ? 1 : -1; s += `<path d="M120 ${y}q${sens * 30} 6 ${sens * 60} 22" fill="none" stroke="#c8102e" stroke-width="${f1(1.2 + rnd())}" stroke-dasharray="${i > 2 ? '3 4' : '0'}"/>`; }
    s += etiquette(120, 234, 'calibre diminué et irrégulier', { fill: '#a8172d', halo: '#fff', size: 10 });
    return cadre(s, 'vasospasme mésentérique');
  }

  return { axe, anse, air, mesentere, veine, colon, vasospasme, AMS, COUL: C };
});
