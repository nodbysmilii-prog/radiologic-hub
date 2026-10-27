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
   • air(type)     : aéroportie (coupe axiale du foie : air dans les branches portes
                     périphériques), aéromésentérie (air dans la VMS et les veines
                     du mésentère), pneumopéritoine ;
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
    if (type === 'aeroportie') s = aeroportie();
    else if (type === 'aeromesenterie') s = aeromesenterie();
    else {
      s = `<rect width="${W}" height="${H}" fill="${C.fond}"/><path d="M0 70C60 50 180 50 240 70V240H0Z" fill="${C.graisse}"/><path d="M20 70C80 52 160 52 220 70C160 84 80 84 20 70Z" fill="#000"/>`;
      s += `<path d="M0 66C60 46 180 46 240 66" fill="none" stroke="${C.muscle}" stroke-width="10"/>`;
      s += etiquette(120, 110, 'pneumopéritoine', { fill: C.rouge }) + etiquette(120, 126, 'air extradigestif : perforation', { size: 9 });
    }
    return cadre(s, type);
  }

  /* Coupe axiale abdominale commune (antérieur en haut, droite du patient à gauche de l'image) */
  function tronc() {
    let s = `<rect width="${W}" height="${H}" fill="${C.fond}"/>`;
    s += `<ellipse cx="120" cy="126" rx="114" ry="94" fill="${C.graisse}" stroke="#8d8a85" stroke-width="2"/>`;
    // paroi musculaire antérieure et latérale
    s += `<path d="M22 132C24 70 70 44 120 42C170 44 216 70 218 132" fill="none" stroke="${C.muscle}" stroke-width="7"/>`;
    // rachis, psoas
    s += `<path d="M104 190a16 15 0 1 1 32 0a16 15 0 1 1 -32 0Z" fill="${C.os}"/><path d="M112 204h16l6 14h-28Z" fill="${C.os}"/>`;
    s += `<ellipse cx="88" cy="196" rx="13" ry="11" fill="${C.muscle}"/><ellipse cx="152" cy="196" rx="13" ry="11" fill="${C.muscle}"/>`;
    return s;
  }
  // Vaisseau « aéré » : paroi/contraste en clair, air noir dans la lumière
  const tube = (d, ext = 6, int = 3) => `<path d="${d}" fill="none" stroke="#cfcac0" stroke-width="${ext}" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="#000" stroke-width="${int}" stroke-linecap="round" stroke-linejoin="round"/>`;
  const opacifie = (d, ext = 6) => `<path d="${d}" fill="none" stroke="${C.contraste}" stroke-width="${ext}" stroke-linecap="round" stroke-linejoin="round"/>`;
  const fleche = (x1, y1, x2, y2, c) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="1.8"/><circle cx="${x2}" cy="${y2}" r="2.6" fill="${c}"/>`;

  /* Aéroportie : coupe axiale du foie au temps portal ; tronc porte opacifié au hile,
     air (noir) dans la lumière des branches portes périphériques, jusque sous la capsule */
  function aeroportie() {
    let s = tronc();
    // foie (à gauche de l'image), rate, estomac avec niveau hydro-aérique
    s += `<path d="M18 124C16 76 46 50 96 48C130 48 150 58 150 80C150 104 136 122 124 140C112 160 82 176 54 170C30 164 19 148 18 124Z" fill="#9c988f"/>`;
    s += `<ellipse cx="204" cy="148" rx="18" ry="30" fill="#8c8881" transform="rotate(-20 204 148)"/>`;
    s += `<path d="M156 70C176 62 202 72 206 96C208 116 188 124 170 118C156 112 150 90 156 70Z" fill="${C.liquide}"/><path d="M158 76C176 66 200 74 204 88H156Z" fill="#000"/>`;
    // aorte, veine cave inférieure
    s += `<circle cx="132" cy="168" r="9" fill="#e3dfd6"/><ellipse cx="104" cy="160" rx="10" ry="8" fill="#cfcac0"/>`;
    // tronc porte et grosses branches opacifiées
    s += opacifie('M128 132L110 120L86 110', 9) + opacifie('M110 120L118 98', 6);
    // branches périphériques : air dans la lumière
    s += tube('M86 110L64 96L44 84') + tube('M64 96L58 72') + tube('M86 110L70 126L46 134') + tube('M70 126L64 148');
    s += tube('M118 98L114 76L104 60') + tube('M114 76L132 64') + tube('M44 84L32 92', 4, 2) + tube('M58 72L50 58', 4, 2) + tube('M104 60L92 56', 4, 2);
    s += fleche(150, 32, 106, 58, C.rouge) + etiquette(160, 26, 'air dans les branches portes', { size: 9, fill: C.rouge });
    s += fleche(30, 204, 44, 136, C.rouge) + etiquette(8, 218, 'jusqu’en périphérie du foie', { size: 9, fill: C.rouge, anchor: 'start' });
    s += fleche(200, 196, 126, 132, C.mesure) + etiquette(234, 208, 'tronc porte opacifié', { size: 9, fill: C.mesure, anchor: 'end' });
    s += etiquette(46, 160, 'foie', { size: 9, fill: '#111', halo: '#cfcac0' });
    return s;
  }

  /* Aéromésentérie : coupe axiale sous le pancréas ; VMS avec air dans sa lumière (niveau
     air-liquide, air en avant), à droite de l'AMS ; air dans les veines du mésentère */
  function aeromesenterie() {
    let s = tronc();
    // reins
    s += `<ellipse cx="62" cy="174" rx="15" ry="22" fill="#a7a39a" transform="rotate(25 62 174)"/><ellipse cx="178" cy="174" rx="15" ry="22" fill="#a7a39a" transform="rotate(-25 178 174)"/>`;
    // aorte, veine cave
    s += `<circle cx="128" cy="166" r="9" fill="#ece9e0"/><ellipse cx="104" cy="164" rx="10" ry="8" fill="#cfcac0"/>`;
    // anses grêles dans le mésentère
    for (const [x, y, r] of [[172, 92, 18], [196, 122, 15], [150, 66, 14], [78, 76, 17], [52, 116, 15]]) s += `<circle cx="${x}" cy="${y}" r="${r}" fill="${C.liquide}"/>${anneau(x, y, r, 3, C.muqueuse)}`;
    // veines mésentériques aérées vers la VMS
    s += tube('M108 128L128 112L150 96L162 92') + tube('M128 112L140 82L148 74') + tube('M150 96L182 116') + tube('M108 128L92 104L82 92', 5, 2.5);
    // AMS (opacifiée) et VMS (niveau : air en avant, sang opacifié en arrière)
    s += `<circle cx="124" cy="138" r="5" fill="#ffffff"/>`;
    s += `<circle cx="102" cy="138" r="12" fill="#d8d4ca" stroke="#ece9e0" stroke-width="1.5"/><path d="M90 139a12 12 0 0 1 24 0Z" fill="#000"/>`;
    s += fleche(30, 212, 96, 134, C.rouge) + etiquette(10, 224, 'VMS : air dans la lumière (niveau)', { size: 9, fill: C.rouge, anchor: 'start' });
    s += fleche(206, 34, 144, 86, C.rouge) + etiquette(236, 24, 'air dans les veines du mésentère', { size: 9, fill: C.rouge, anchor: 'end' });
    s += fleche(200, 206, 128, 140, C.mesure) + etiquette(206, 218, 'AMS', { size: 9, fill: C.mesure });
    return s;
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
