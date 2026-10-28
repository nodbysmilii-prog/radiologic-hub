/* =========================================================
   RadiologicHub — fiche « Pancréatite aiguë » : coupes axiales dessinées (SVG)
   ---------------------------------------------------------
   Schémas pédagogiques (pas des images de patients), orientés comme au scanner :
   avant en haut, droite du patient à gauche de l'image.
   • coupe(o) : coupe axiale schématique, niveau « haut » (isthme, corps, queue, veine
     splénique, arrière-cavité) ou « bas » (tête, crochet, VMS / AMS, D3, racine du mésentère) ;
     - segments du pancréas cliquables (data-segment) ;
     - espaces délimités par leurs fascias, cliquables (data-espace) : espace pararénal
       antérieur, arrière-cavité des épiploons, espaces périrénaux, espaces pararénaux
       postérieurs, gouttières pariéto-coliques, mésocôlon transverse, racine du mésentère ;
   • ESPACES, SEGMENTS, COLLECTIONS : noms et textes affichés par la fiche (les collections,
     la nécrose, le pancréas déconnecté, divisum et annulaire sont illustrés par les images
     du cours de l'auteur, fiches/pancreas/images/).
   Module sans dépendance au navigateur (tests/pancreatite-aigue.test.js).
   ========================================================= */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.RHPancreas = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const W = 640, H = 470;
  const C = {
    fond: '#fbfaf7', peau: '#f3e6d4', graisse: '#f7efe2', muscle: '#d9a8a0', os: '#efe8d6', osTrait: '#a89e86',
    foie: '#b8735f', rate: '#9c4a5a', rein: '#c98a7e', estomac: '#e9b9a3', colon: '#e2c9a6', duodenum: '#e8b48c',
    artere: '#c8102e', veine: '#3c67b8', porte: '#5b2a86', bile: '#3f9b4a', fascia: '#111114', peritoine: '#2a6f97',
    texte: '#111114',
  };
  const SEGMENTS = {
    tete: { nom: 'Tête', couleur: '#f2ab2f', texte: 'À droite du bord droit de la VMS, dans le cadre duodénal (D2 en dehors). Contient la partie basse du cholédoque.' },
    crochet: { nom: 'Crochet (processus unciné)', couleur: '#e85d75', texte: 'Partie inférieure de la tête qui passe en arrière de la VMS, en avant de la VCI et de l\'aorte.' },
    isthme: { nom: 'Isthme (col)', couleur: '#2a9d8f', texte: 'En avant de la VMS et du confluent porte : zone de faiblesse (vascularisation) et site de la déconnexion canalaire.' },
    corps: { nom: 'Corps', couleur: '#3c67b8', texte: 'Du bord gauche de la VMS vers la gauche, en avant de l\'AMS et de l\'aorte ; veine splénique à sa face postérieure.' },
    queue: { nom: 'Queue', couleur: '#7b5ea7', texte: 'Jusqu\'au hile splénique, dans le ligament spléno-rénal ; corps et queue séparés à mi-distance (convention).' },
  };
  const ESPACES = {
    epra: { nom: 'Espace pararénal antérieur', couleur: '#f2ab2f', texte: 'Entre le péritoine pariétal postérieur (en avant) et le fascia rénal antérieur (en arrière), fermé en dehors par le fascia latéro-conal. Contient le pancréas, le duodénum et les côlons ascendant et descendant : siège principal des coulées et des collections de la pancréatite (« en avant du fascia para-rénal antérieur »).' },
    bourse: { nom: 'Arrière-cavité des épiploons (bourse omentale)', couleur: '#e85d75', texte: 'Cavité péritonéale entre la face postérieure de l\'estomac et le péritoine qui recouvre le corps et la queue du pancréas : site fréquent des collections et des pseudo-kystes.' },
    mesocolon: { nom: 'Mésocôlon transverse', couleur: '#f18d25', texte: 'Sa racine s\'insère le long du bord antérieur du pancréas : voie d\'extension des collections vers le côlon transverse.' },
    mesentere: { nom: 'Racine du mésentère', couleur: '#b5651d', texte: 'Sous le pancréas, autour de l\'AMS et de la VMS : voie d\'extension des coulées vers le bas, entre les anses grêles.' },
    'perirenal-d': { nom: 'Espace périrénal droit', couleur: '#3c67b8', texte: 'Dans le fascia rénal (Gerota) : rein, graisse périrénale. Rarement atteint (le fascia rénal antérieur fait barrière).' },
    'perirenal-g': { nom: 'Espace périrénal gauche', couleur: '#3c67b8', texte: 'Dans le fascia rénal (Gerota) : rein, graisse périrénale. Rarement atteint (le fascia rénal antérieur fait barrière).' },
    'pararenal-post-d': { nom: 'Espace pararénal postérieur droit', couleur: '#2f8a57', texte: 'Entre le fascia rénal postérieur et le fascia transversalis : seulement de la graisse ; atteint par les coulées volumineuses passant sous le fascia latéro-conal.' },
    'pararenal-post-g': { nom: 'Espace pararénal postérieur gauche', couleur: '#2f8a57', texte: 'Entre le fascia rénal postérieur et le fascia transversalis : seulement de la graisse ; atteint par les coulées volumineuses passant sous le fascia latéro-conal.' },
    'gouttiere-d': { nom: 'Gouttière pariéto-colique droite', couleur: '#7b5ea7', texte: 'Grande cavité péritonéale, en dehors du côlon ascendant : épanchement intra-péritonéal (ascite).' },
    'gouttiere-g': { nom: 'Gouttière pariéto-colique gauche', couleur: '#7b5ea7', texte: 'Grande cavité péritonéale, en dehors du côlon descendant : épanchement intra-péritonéal (ascite).' },
  };
  // Collections d'Atlanta (texte de la fiche de l'auteur)
  const COLLECTIONS = {
    clap: { abr: 'CLAP', nom: 'Collection Liquidienne Aiguë Péri-pancréatique', delai: '< 4 semaines', forme: 'POI', items: ['Homogène', 'Liquide (<15UH)', 'Péri-pancréas', 'Pas de paroi'], siege: 'siège adjacent au pancréas' },
    can: { abr: 'CAN', nom: 'Collection Aiguë Nécrotique', delai: '< 4 semaines', forme: 'PN', items: ['Hétérogène', 'Nécrose et liquide', 'Pas de paroi'], siege: 'siège intra et/ou péri-pancréatique' },
    pk: { abr: 'PK', nom: 'Pseudo-Kyste', delai: '> 4 semaines', forme: 'POI', items: ['Homogène', 'Liquide (<15UH)', 'Paroi propre'], siege: 'siège adjacent/ distant au pancréas' },
    nop: { abr: 'NOP', nom: 'Nécrose Organisée Pancréatique', delai: '> 4 semaines', forme: 'PN', items: ['Hétérogène', 'Nécrose et liquide', 'Paroi propre'], siege: 'siège intra et/ou extra pancréatique' },
  };

  const txt = (x, y, t, o = {}) => `<text x="${x}" y="${y}" font-size="${o.size || 10}" font-weight="${o.weight || 800}" fill="${o.fill || C.texte}" text-anchor="${o.anchor || 'middle'}" paint-order="stroke" stroke="${o.halo || '#fff'}" stroke-width="${o.halo === 'none' ? 0 : 3}" stroke-linejoin="round" pointer-events="none">${t}</text>`;

  /* ---------- Géométrie commune (coordonnées de l'image 640 × 470) ---------- */
  // Espaces (tracés fermés) : délimités par le péritoine pariétal postérieur, les fascias rénaux,
  // latéro-conaux et transversalis
  const PERI = {
    haut: 'M74 280C92 258 126 246 152 236C176 226 206 218 250 214C300 210 340 212 380 206C440 200 500 196 548 206C566 216 566 242 554 264C546 282 550 296 566 302',
    bas: 'M74 280C92 258 116 252 140 254C160 254 168 238 184 234C204 230 222 226 250 226C276 226 296 232 312 232C336 232 356 230 380 238C410 248 440 262 480 266C506 268 520 262 540 266C556 272 560 290 566 302',
  };
  const ESP = {
    haut: {
      epra: 'M' + PERI.haut.slice(1) + 'L540 330C512 318 476 314 440 320C408 324 384 328 360 330C332 333 302 333 278 330C246 322 214 316 182 318C150 320 128 326 110 334C96 320 84 300 74 280Z',
      bourse: 'M296 210C340 212 380 206 440 200C500 196 532 198 552 206C556 192 548 178 530 172C490 160 420 162 360 170C326 176 304 190 296 210Z',
    },
    bas: {
      epra: 'M' + PERI.bas.slice(1) + 'L540 330C512 318 476 314 440 320C408 324 384 328 360 330C332 333 302 333 278 330C246 322 214 316 182 318C150 320 128 326 110 334C96 320 84 300 74 280Z',
      mesocolon: 'M262 224C300 228 340 226 380 234C392 214 400 180 408 152L392 148C372 172 346 192 312 204C292 210 274 214 262 224Z',
      mesentere: 'M296 238C320 234 346 236 368 244C374 258 370 276 360 284C340 288 316 286 300 280C292 268 292 250 296 238Z',
      'gouttiere-d': 'M50 248C50 266 60 278 74 280C86 264 100 256 114 254C104 246 98 236 96 226C80 222 56 230 50 248Z',
      'gouttiere-g': 'M590 248C590 270 582 290 566 302C558 286 548 276 534 270C546 260 548 244 546 230C562 226 586 232 590 248Z',
    },
    commun: {
      'perirenal-d': 'M110 334C140 322 176 316 212 318C240 320 262 326 274 332L268 396C252 420 214 434 176 428C146 420 122 384 110 334Z',
      'perirenal-g': 'M540 330C512 318 476 314 440 320C410 324 382 330 366 334L372 396C388 420 426 434 464 428C494 420 518 384 540 330Z',
      'pararenal-post-d': 'M110 334C122 384 146 420 176 428C214 434 252 420 268 396L262 420C238 444 196 456 156 448C114 436 86 394 80 352C88 344 98 338 110 334Z',
      'pararenal-post-g': 'M540 330C518 384 494 420 464 428C426 434 388 420 372 396L378 420C402 444 444 456 484 448C526 436 554 394 560 352C552 344 542 338 540 330Z',
    },
  };
  // Fascias (traits) : nom affiché au survol
  const FASCIAS = [
    ['Fascia rénal antérieur (droit)', 'M110 334C140 322 176 316 212 318C240 320 262 326 278 330', C.fascia, ''],
    ['Fascia rénal antérieur (gauche)', 'M540 330C512 318 476 314 440 320C408 324 384 328 360 330', C.fascia, ''],
    ['Fascia rénal postérieur (droit)', 'M110 334C122 384 146 420 176 428C214 434 252 420 268 396', C.fascia, '5 3'],
    ['Fascia rénal postérieur (gauche)', 'M540 330C518 384 494 420 464 428C426 434 388 420 372 396', C.fascia, '5 3'],
    ['Fascia latéro-conal (droit)', 'M110 334C96 320 84 300 74 280', C.fascia, '2 3'],
    ['Fascia latéro-conal (gauche)', 'M540 330C552 320 562 312 566 302', C.fascia, '2 3'],
  ];

  function corps() {
    let s = `<rect width="${W}" height="${H}" fill="${C.fond}"/>`;
    s += `<ellipse cx="320" cy="250" rx="306" ry="214" fill="${C.peau}" stroke="#c9b9a6" stroke-width="2"/>`;
    s += `<ellipse cx="320" cy="252" rx="290" ry="198" fill="${C.graisse}"/>`;
    // paroi musculaire (droits en avant, obliques en dehors), muscles du dos
    s += `<ellipse cx="320" cy="254" rx="278" ry="188" fill="none" stroke="${C.muscle}" stroke-width="10"/>`;
    s += `<ellipse cx="282" cy="428" rx="32" ry="20" fill="${C.muscle}"/><ellipse cx="358" cy="428" rx="32" ry="20" fill="${C.muscle}"/>`;
    s += `<ellipse cx="274" cy="392" rx="18" ry="15" fill="${C.muscle}"/><ellipse cx="366" cy="392" rx="18" ry="15" fill="${C.muscle}"/>`;
    // rachis
    s += `<circle cx="320" cy="384" r="32" fill="${C.os}" stroke="${C.osTrait}" stroke-width="2"/><path d="M308 414L320 448L332 414Z" fill="${C.os}" stroke="${C.osTrait}" stroke-width="2"/>`;
    return s;
  }
  function organes(niveau) {
    let s = '';
    // foie et vésicule (droite du patient = gauche de l'image)
    s += niveau === 'haut'
      ? `<path d="M46 236C38 164 82 104 160 90C212 82 242 100 236 132C230 160 204 178 178 196C150 216 124 240 106 262C90 262 54 262 46 236Z" fill="${C.foie}" opacity=".9"/>`
      : `<path d="M58 206C52 156 92 116 152 108C192 104 206 128 190 156C172 184 134 202 104 216C84 224 62 224 58 206Z" fill="${C.foie}" opacity=".9"/>`;
    if (niveau === 'haut') s += `<ellipse cx="186" cy="188" rx="16" ry="11" fill="${C.bile}" opacity=".85"/>`;
    // estomac (haut) et côlon transverse (en avant)
    if (niveau === 'haut') s += `<path d="M276 150C300 116 380 98 460 102C516 106 548 126 548 150C548 164 532 168 516 162C470 150 400 148 340 158C310 164 290 172 278 168C270 164 270 158 276 150Z" fill="${C.estomac}" stroke="#c98f78" stroke-width="1.5"/>`;
    for (let i = 0; i < 7; i++) s += `<ellipse cx="${186 + i * 44}" cy="${niveau === 'haut' ? 82 : 132}" rx="22" ry="16" fill="${C.colon}" stroke="#c9ab84" stroke-width="1.2"/>`;
    // rate (gauche du patient)
    s += niveau === 'haut' ? `<path d="M560 214C590 220 604 260 596 300C588 330 566 344 556 330C566 300 568 262 560 214Z" fill="${C.rate}"/>` : '';
    // côlons ascendant et descendant (dans l'espace pararénal antérieur)
    s += `<circle cx="120" cy="292" r="20" fill="${C.colon}" stroke="#c9ab84" stroke-width="1.2"/><circle cx="520" cy="292" r="18" fill="${C.colon}" stroke="#c9ab84" stroke-width="1.2"/>`;
    // reins
    s += `<ellipse cx="190" cy="372" rx="30" ry="46" transform="rotate(-28 190 372)" fill="${C.rein}"/><ellipse cx="450" cy="372" rx="30" ry="46" transform="rotate(28 450 372)" fill="${C.rein}"/>`;
    // aorte, VCI
    s += `<circle cx="342" cy="330" r="14" fill="${C.artere}"/><ellipse cx="292" cy="326" rx="15" ry="11" fill="${C.veine}"/>`;
    // duodénum D2 (contre la tête) ; D3 au niveau bas, entre AMS et aorte
    s += `<circle cx="186" cy="${niveau === 'haut' ? 246 : 262}" r="20" fill="${C.duodenum}" stroke="#c98f62" stroke-width="1.5"/>`;
    if (niveau === 'bas') s += `<path d="M206 300C250 300 300 308 330 306C360 304 390 300 410 292L414 308C390 316 360 320 330 320C300 322 250 316 206 316Z" fill="${C.duodenum}" stroke="#c98f62" stroke-width="1.5"/>`;
    return s;
  }
  // Pancréas : chaque segment est un tracé fermé ; niveau haut = isthme, corps, queue (+ haut de la tête), bas = tête et crochet
  const PAN = {
    haut: {
      tete: 'M206 246C206 228 232 218 262 220L296 224L296 252C288 260 270 266 252 268C226 270 206 262 206 246Z',
      isthme: 'M296 224L318 222L318 250C312 254 302 254 296 252Z',
      corps: 'M318 222C360 214 410 206 452 204L454 230C410 236 360 246 318 250Z',
      queue: 'M452 204C490 200 530 204 552 220C560 232 554 244 540 244C510 240 482 232 454 230Z',
    },
    bas: {
      tete: 'M206 260C206 238 236 226 266 228L296 232L296 270C290 280 282 286 276 294C262 304 236 302 222 290C210 280 206 270 206 260Z',
      crochet: 'M276 294C282 286 290 280 296 270C300 280 308 284 318 284C330 284 336 290 330 296C314 302 292 302 276 294Z',
    },
  };
  function vaisseaux(niveau) {
    let s = '';
    if (niveau === 'haut') {
      s += `<path d="M306 256C350 256 420 240 470 238C510 238 540 246 560 254" fill="none" stroke="${C.porte}" stroke-width="6" stroke-linecap="round"/>`;
      s += `<circle cx="306" cy="262" r="9" fill="${C.porte}"/><circle cx="332" cy="282" r="6" fill="${C.artere}"/>`;
      s += `<path d="M250 244C280 238 306 236 330 234C380 228 430 218 470 216C500 214 528 222 542 228" fill="none" stroke="#fff" stroke-width="2.2" stroke-dasharray="5 3"/>`;
    } else {
      s += `<circle cx="306" cy="264" r="9" fill="${C.porte}"/><circle cx="334" cy="268" r="6" fill="${C.artere}"/>`;
      s += `<path d="M232 266C248 262 262 258 280 254" fill="none" stroke="#fff" stroke-width="2.2" stroke-dasharray="5 3"/>`;
    }
    s += `<circle cx="226" cy="${niveau === 'haut' ? 252 : 274}" r="5" fill="${C.bile}"/>`;
    return s;
  }

  /*
   * o : { niveau: 'haut' | 'bas', segment: id | null, espace: id | null, espaces: bool (tous les espaces en couleur), etiquettes: bool, interactif: bool }
   */
  function coupe(o = {}) {
    const niveau = o.niveau === 'bas' ? 'bas' : 'haut';
    let s = corps();
    // espaces (sous les organes) : visibles en couleur si demandés, sinon zone cliquable transparente
    const zones = { ...ESP[niveau], ...ESP.commun };
    for (const [id, d] of Object.entries(zones)) {
      const on = o.espaces || o.espace === id;
      s += `<path d="${d}" data-espace="${id}" fill="${ESPACES[id].couleur}" fill-opacity="${o.espace === id ? 0.55 : on ? 0.28 : 0}" stroke="${o.espace === id ? ESPACES[id].couleur : 'none'}" stroke-width="${o.espace === id ? 3 : 0}"${o.interactif ? ' style="cursor:pointer"' : ''}><title>${ESPACES[id].nom}</title></path>`;
    }
    s += organes(niveau);
    // pancréas segmenté
    for (const [id, d] of Object.entries(PAN[niveau])) {
      const seg = SEGMENTS[id], choisi = o.segment === id;
      s += `<path d="${d}" data-segment="${id}" fill="${seg.couleur}" stroke="${choisi ? C.texte : '#fff'}" stroke-width="${choisi ? 3 : 1.5}" opacity="${o.segment && !choisi ? 0.45 : 1}"${o.interactif ? ' style="cursor:pointer"' : ''}><title>${seg.nom}</title></path>`;
    }
    s += vaisseaux(niveau);
    // fascias par-dessus (péritoine pariétal postérieur propre à chaque niveau)
    s += `<path d="${PERI[niveau]}" fill="none" stroke="${C.peritoine}" stroke-width="2.6" pointer-events="none"><title>Péritoine pariétal postérieur</title></path>`;
    for (const [nom, d, c, tirets] of FASCIAS) s += `<path d="${d}" fill="none" stroke="${c}" stroke-width="${c === C.peritoine ? 2.6 : 2}"${tirets ? ` stroke-dasharray="${tirets}"` : ''} pointer-events="none"><title>${nom}</title></path>`;
    if (o.etiquettes !== false) {
      s += txt(20, 24, 'avant', { anchor: 'start', size: 9, fill: '#55545f' }) + txt(20, 462, 'droite du patient', { anchor: 'start', size: 9, fill: '#55545f' }) + txt(620, 462, 'gauche du patient', { anchor: 'end', size: 9, fill: '#55545f' });
      s += txt(niveau === 'haut' ? 120 : 120, niveau === 'haut' ? 140 : 160, 'foie', { size: 10 }) + txt(186, niveau === 'haut' ? 250 : 266, 'D2', { size: 9 }) + txt(342, 334, 'Ao', { size: 8, fill: '#fff', halo: 'none' }) + txt(292, 329, 'VCI', { size: 7, fill: '#fff', halo: 'none' });
      s += txt(190, 376, 'rein D', { size: 9 }) + txt(450, 376, 'rein G', { size: 9 }) + txt(120, 296, 'CA', { size: 8 }) + txt(520, 296, 'CD', { size: 8 });
      if (niveau === 'haut') s += txt(420, 128, 'estomac', { size: 10 }) + txt(586, 270, 'rate', { size: 9, fill: '#fff', halo: 'none' }) + txt(420, 82, 'côlon transverse', { size: 9 }) + txt(500, 252, 'v. splénique', { size: 8, fill: C.porte });
      else s += txt(360, 128, 'côlon transverse', { size: 9 }) + txt(306, 300, 'D3', { size: 8 }) + txt(306, 267, 'VMS', { size: 6, fill: '#fff', halo: 'none' }) + txt(352, 262, 'AMS', { size: 7, fill: C.artere });
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Coupe axiale schématique du pancréas (niveau ${niveau})" font-family="Montserrat, Arial, sans-serif">${s}</svg>`;
  }


  /* ---------- Schémas pédagogiques redessinés d'après les figures du cours ---------- */
  const svgDe = (w, h, titre, corpsSvg, vb) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb || `0 0 ${w} ${h}`}" role="img" aria-label="${titre}" font-family="Montserrat, Arial, sans-serif">${corpsSvg}</svg>`;
  const boite = (x, y, w, h, fond, t, o = {}) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${o.rx ?? 10}" fill="${fond}"${o.trait ? ` stroke="${o.trait}" stroke-width="2"` : ''}/>`
    + [].concat(t).map((l, i, a) => txt(x + w / 2, y + h / 2 + (i - (a.length - 1) / 2) * (o.size || 13) * 1.25 + (o.size || 13) * 0.36, l, { size: o.size || 13, fill: o.fill || '#fff', halo: 'none', weight: o.weight || 700 })).join('');
  const fleche = (id, c) => `<marker id="${id}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10Z" fill="${c}"/></marker>`;

  /* Nécrose de la PA nécrosante : 'intra' (intra-pancréatique isolée), 'extra' (péri-pancréatique isolée), 'mixte' */
  const NECROSE_TYPES = {
    intra: 'nécrose intra-pancréatique isolée',
    extra: 'nécrose péri-pancréatique isolée',
    mixte: 'nécrose mixte intra et extra parenchymateuse',
  };
  function necrose(type) {
    const id = 'pn-' + type;
    const glande = Object.values(PAN.haut).join(' ');
    const motif = `<pattern id="${id}-m" width="16" height="16" patternUnits="userSpaceOnUse"><rect width="16" height="16" fill="#4b4a52"/><circle cx="4" cy="5" r="2.2" fill="#36353c"/><circle cx="12" cy="12" r="2.6" fill="#5d5c66"/><circle cx="12" cy="3" r="1.4" fill="#2d2c33"/></pattern>`;
    let s = `<defs>${motif}<clipPath id="${id}-c"><path d="${glande}"/></clipPath></defs>` + corps() + organes('haut');
    const extra = type === 'extra' || type === 'mixte', intra = type === 'intra' || type === 'mixte';
    // nécrose péri-pancréatique : dans la graisse autour de la glande (sous la glande, qui reste visible)
    if (extra) s += `<path d="M228 214C262 206 300 206 330 204C380 196 430 186 476 188C520 190 552 200 566 218C576 236 570 254 552 260C540 262 530 258 522 258C534 272 548 290 548 306C536 312 522 298 512 282C500 262 486 252 462 248C420 250 380 260 340 266C300 272 262 280 232 276C210 270 200 252 206 236C210 224 218 218 228 214Z" fill="url(#${id}-m)" stroke="#2d2c33" stroke-width="1.5"/>`;
    // glande pancréatique (parenchyme rehaussé) avec lobulations
    s += `<path d="${glande}" fill="#f6d36b" stroke="#c99a2e" stroke-width="1.8"/>`;
    s += `<g clip-path="url(#${id}-c)" fill="none" stroke="#d9a93a" stroke-width="1.2">${[230, 262, 294, 330, 366, 402, 438, 474, 510, 540].map(x => `<path d="M${x} 196C${x - 8} 214 ${x + 8} 236 ${x} 270"/>`).join('')}</g>`;
    // nécrose intra-pancréatique : plages non rehaussées dans le parenchyme (corps)
    if (intra) s += `<g clip-path="url(#${id}-c)"><path d="M322 196C360 194 420 188 470 190L476 248C430 246 370 254 322 262Z" fill="url(#${id}-m)"/></g><path d="${glande}" fill="none" stroke="#c99a2e" stroke-width="1.8"/>`;
    // vaisseaux
    s += `<path d="M306 256C350 256 420 240 470 238C510 238 540 246 560 254" fill="none" stroke="${C.porte}" stroke-width="6" stroke-linecap="round"/><circle cx="306" cy="262" r="9" fill="${C.porte}"/><circle cx="332" cy="282" r="6" fill="${C.artere}"/>`;
    // étiquettes
    s += txt(150, 150, 'foie', { size: 15, fill: '#fff', halo: 'none' }) + txt(420, 134, 'estomac', { size: 15 }) + txt(584, 272, 'rate', { size: 13, fill: '#fff', halo: 'none' })
      + txt(186, 251, 'D2', { size: 12 }) + txt(190, 378, 'rein D', { size: 14 }) + txt(450, 378, 'rein G', { size: 14 }) + txt(342, 335, 'Ao', { size: 10, fill: '#fff', halo: 'none' });
    // légende
    s += `<rect x="126" y="400" width="490" height="30" rx="8" fill="#fff" opacity=".9"/><rect x="134" y="408" width="18" height="14" rx="3" fill="#f6d36b" stroke="#c99a2e"/>` + txt(158, 420, 'parenchyme rehaussé', { anchor: 'start', size: 14, weight: 700 })
      + `<rect x="380" y="408" width="18" height="14" rx="3" fill="url(#${id}-m)"/>` + txt(404, 420, 'nécrose (non rehaussée)', { anchor: 'start', size: 14, weight: 700 });
    // flèches de repère
    const rep = (x1, y1, x2, y2, t, c = '#a8172d') => `<path d="M${x1} ${y1}L${x2} ${y2}" stroke="${c}" stroke-width="2.6" marker-end="url(#${id}-f)"/>` + txt(x1, y1 + (y1 > y2 ? 16 : -7), t, { size: 15, fill: c });
    s += `<defs>${fleche(id + '-f', '#a8172d')}</defs>`;
    if (intra) s += rep(400, 296, 400, 236, 'dans la glande');
    if (extra) s += rep(520, 166, 500, 196, 'autour de la glande');
    return svgDe(W, H, 'Coupe axiale schématique : ' + NECROSE_TYPES[type], s, '120 120 500 312');
  }

  /* Pancréas annulaire : coupe axiale (D2 entouré par la tête, VMS, crochet) */
  function annulaireCoupe() {
    let s = `<rect width="520" height="280" fill="#fff"/>`;
    s += `<path d="M70 120C64 72 110 50 170 56C236 62 300 50 350 56C392 60 410 88 400 112C392 126 376 128 372 140C368 152 384 164 410 166C440 168 470 166 482 174C470 194 430 206 380 214C320 224 250 230 190 236C120 242 76 216 70 170Z" fill="#f9d7b8" stroke="#a65a2a" stroke-width="5" stroke-linejoin="round"/>`;
    s += `<path d="M106 112C114 88 150 80 178 88C206 98 212 132 200 156C186 182 146 186 122 172C102 160 98 134 106 112Z" fill="#e9b4b6" stroke="#9c3a46" stroke-width="5"/>`;
    s += `<circle cx="154" cy="134" r="78" fill="none" stroke="#f18d25" stroke-width="3" stroke-dasharray="8 6"/>`;
    s += `<path d="M378 120C392 100 432 96 452 110C470 124 466 152 446 160C420 168 386 160 376 146C370 136 372 128 378 120Z" fill="#9eb6e0" stroke="#2f5597" stroke-width="5"/>`;
    s += txt(154, 150, 'D2', { size: 40, weight: 600, halo: 'none' }) + txt(282, 112, 'tête', { size: 26, halo: 'none' }) + txt(422, 140, 'VMS', { size: 17, halo: 'none' }) + txt(372, 204, 'Crochet', { size: 26, halo: 'none' });
    return svgDe(520, 280, 'Pancréas annulaire : D2 entouré de parenchyme pancréatique', s);
  }

  /* Origine embryologique du pancréas annulaire (d'après Etienne D et al. Annals of Anatomy 2012) */
  function embryologie(disposition) {
    const id = 'emb';
    const duo = { f: '#f6cdc6', t: '#c26a66' }, vb = '#f6c879', dors = '#f2ab2f', vert = '#9cc77a', vertT = '#4f7f35';
    const lob = (d, c) => `<path d="${d}" fill="${c}" stroke="#b37a16" stroke-width="2" stroke-linejoin="round"/>`;
    const cadre = (cx, cy, k = 1) => { // duodénum en C (vue de face), ouvert vers la droite de l'image
      const p = `M${cx + 46 * k} ${cy - 70 * k}C${cx - 22 * k} ${cy - 80 * k} ${cx - 70 * k} ${cy - 46 * k} ${cx - 68 * k} ${cy}C${cx - 66 * k} ${cy + 50 * k} ${cx - 22 * k} ${cy + 76 * k} ${cx + 58 * k} ${cy + 68 * k}`;
      return `<path d="${p}" fill="none" stroke="${duo.t}" stroke-width="${30 * k}" stroke-linecap="round"/><path d="${p}" fill="none" stroke="${duo.f}" stroke-width="${24 * k}" stroke-linecap="round"/>`;
    };
    const anneau = (cx, cy, r = 30) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#fff" stroke="${duo.t}" stroke-width="15"/><circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${duo.f}" stroke-width="10"/>`;
    const voie = (pts) => `<path d="${pts}" fill="none" stroke="${vertT}" stroke-width="5" stroke-linecap="round"/><path d="${pts}" fill="none" stroke="${vert}" stroke-width="2.6" stroke-linecap="round"/>`;
    const vesicule = (x, y, k = 1) => `<ellipse cx="${x}" cy="${y}" rx="${22 * k}" ry="${15 * k}" transform="rotate(-30 ${x} ${y})" fill="${vert}" stroke="${vertT}" stroke-width="2"/>`;
    let s = `<defs>${fleche(id + '-f', '#111114')}${fleche(id + '-p', '#55545f')}</defs><rect width="900" height="440" fill="#fff"/>`;
    let pa = '', pr1 = '', pr2 = '';
    // A — stade des deux bourgeons (vue de face)
    pa += txt(130, 34, 'Deux bourgeons', { size: 17 });
    pa += cadre(140, 230);
    pa += lob('M152 196C180 176 230 170 262 176C276 182 270 198 252 202C222 208 190 214 166 222C150 222 142 206 152 196Z', dors); // bourgeon dorsal
    pa += voie('M60 96C70 140 78 190 84 236') + vesicule(54, 96);
    pa += lob('M78 250C70 238 76 226 92 226C108 228 112 244 102 254C94 262 82 260 78 250Z', vb); // bourgeon ventral
    pa += txt(214, 160, 'bourgeon dorsal', { size: 14, fill: '#8a5a00' }) + txt(62, 290, 'bourgeon', { size: 14, fill: '#8a5a00' }) + txt(62, 304, 'ventral', { size: 14, fill: '#8a5a00' }) + txt(148, 236, 'D2', { size: 15 });
    pa += txt(46, 72, 'vésicule', { size: 13, fill: vertT }) + txt(108, 118, 'cholédoque', { size: 13, fill: vertT, anchor: 'start' });
    // B1 / C1 — anatomie normale
    pr1 += boite(340, 18, 540, 36, '#2a9d8f', 'Anatomie normale pancréatique', { size: 17 });
    pr1 += anneau(420, 130) + voie('M378 72C392 92 404 108 412 124') + vesicule(370, 70, .8);
    pr1 += lob('M384 134C376 124 382 112 396 114C406 116 408 128 400 136C394 142 388 140 384 134Z', vb);
    pr1 += lob('M448 136C480 128 520 124 552 128C562 134 556 146 540 148C510 152 478 152 452 152C440 150 440 140 448 136Z', dors);
    pr1 += `<path d="M392 150C396 182 440 186 456 160" fill="none" stroke="#55545f" stroke-width="2.6" stroke-dasharray="5 5" marker-end="url(#${id}-p)"/>`;
    pr1 += txt(420, 202, 'rotation du bourgeon ventral', { size: 13, fill: '#55545f' });
    pr1 += `<path d="M570 130L640 130" stroke="#111114" stroke-width="2.5" marker-end="url(#${id}-f)"/>`;
    pr1 += cadre(726, 140, .72) + voie('M688 74C692 96 700 116 708 136') + vesicule(684, 70, .8);
    pr1 += lob('M700 150C716 136 742 132 770 128C810 120 846 112 872 116C882 124 876 136 858 140C820 148 786 156 760 166C742 178 720 182 706 174C698 166 696 158 700 150Z', dors);
    pr1 += lob('M704 156C716 150 730 152 740 160C744 174 730 184 716 182C704 178 700 166 704 156Z', vb);
    // B2 / C2 — pancréas annulaire
    pr2 += boite(340, 236, 540, 36, '#a8172d', 'Développement pancréas annulaire', { size: 17 });
    pr2 += anneau(420, 348) + voie('M378 290C392 310 404 326 412 342') + vesicule(370, 288, .8);
    pr2 += lob('M380 356C372 344 380 332 394 334C404 338 404 350 396 358C390 362 384 362 380 356Z', vb);
    pr2 += lob('M448 354C480 346 520 342 552 346C562 352 556 364 540 366C510 370 478 370 452 370C440 368 440 358 448 354Z', dors);
    pr2 += `<path d="M386 330C392 300 444 298 456 330" fill="none" stroke="#55545f" stroke-width="2.6" stroke-dasharray="5 5" marker-end="url(#${id}-p)"/><path d="M392 372C400 400 444 400 456 372" fill="none" stroke="#55545f" stroke-width="2.6" stroke-dasharray="5 5" marker-end="url(#${id}-p)"/>`;
    pr2 += txt(420, 418, 'le bourgeon ventral entoure D2', { size: 13, fill: '#55545f' });
    pr2 += `<path d="M570 348L640 348" stroke="#111114" stroke-width="2.5" marker-end="url(#${id}-f)"/>`;
    pr2 += `<circle cx="712" cy="350" r="44" fill="${vb}" stroke="#b37a16" stroke-width="2"/>` + anneau(712, 350, 26);
    pr2 += lob('M748 336C780 326 830 322 868 326C880 334 872 348 854 350C820 354 786 358 754 362C744 356 742 344 748 336Z', dors);
    pr2 += voie('M676 280C686 300 694 316 700 326') + vesicule(672, 276, .8);
    pr2 += txt(712, 354, 'D2', { size: 12 }) + txt(712, 414, 'anneau pancréatique autour de D2', { size: 13, fill: '#8a5a00' });
    if (disposition === 'haut') {
      // téléphone : bourgeons en haut, puis les deux évolutions l'une sous l'autre
      s += `<g transform="translate(160 0)">${pa}</g><path d="M290 318L290 344" stroke="#111114" stroke-width="2.5" marker-end="url(#${id}-f)"/>`;
      s += `<g transform="translate(-306 350)">${pr1}</g><g transform="translate(-306 360)">${pr2}</g>`;
      return svgDe(580, 806, 'Origine embryologique du pancréas annulaire', s.replace('<rect width="900" height="440" fill="#fff"/>', '<rect width="580" height="806" fill="#fff"/>'));
    }
    s += pa + `<path d="M262 230L304 230M304 230L330 128M304 230L330 334" fill="none" stroke="#111114" stroke-width="2.5"/>` + pr1 + pr2;
    return svgDe(900, 440, 'Origine embryologique du pancréas annulaire', s);
  }

  /* « duct penetrating sign » (PAI) */
  function ductPenetrating() {
    let s = `<rect width="620" height="400" fill="#fff"/>`;
    s += `<path d="M180 98C150 96 120 104 92 132C64 164 56 214 72 258C92 312 150 348 222 368C270 380 320 370 372 346C400 334 420 318 432 306L432 196C380 176 320 152 268 134C240 120 210 104 180 98Z" fill="#f8d6b8"/>`;
    s += `<path d="M268 134C238 118 210 102 180 98C150 96 120 104 92 132C64 164 56 214 72 258C92 312 150 348 222 368C270 380 320 370 372 346C400 334 420 318 432 306" fill="none" stroke="#111114" stroke-width="6" stroke-linejoin="round" stroke-linecap="round"/>`;
    s += `<path d="M432 212L346 226L432 238" fill="#fff" stroke="#111114" stroke-width="4" stroke-linejoin="round"/>`;
    s += `<path d="M126 0L214 0L244 124C250 152 250 176 238 202C224 230 196 248 158 262C186 240 210 222 222 196C232 172 228 150 218 128Z" fill="#7d9a44" stroke="#5b7330" stroke-width="2"/>`;
    s += `<circle cx="214" cy="200" r="86" fill="none" stroke="#e02424" stroke-width="6"/>`;
    s += `<rect x="432" y="0" width="188" height="400" fill="#fff"/>`;
    s += txt(526, 60, '« duct penetrating', { size: 15 }) + txt(526, 80, 'sign »', { size: 15 });
    s += `<path d="M300 200L446 168" stroke="#e02424" stroke-width="2"/>` + txt(452, 140, 'canal toujours', { size: 12, anchor: 'start', weight: 700 }) + txt(452, 156, 'visualisé au sein', { size: 12, anchor: 'start', weight: 700 }) + txt(452, 172, 'de la sténose', { size: 12, anchor: 'start', weight: 700 });
    s += `<path d="M170 252L446 280" stroke="#5b7330" stroke-width="2"/>` + txt(452, 276, 'aspect effilé +++', { size: 12, anchor: 'start', weight: 700, fill: '#5b7330' });
    s += txt(452, 330, 'plutôt en faveur', { size: 11, anchor: 'start', fill: '#55545f' }) + txt(452, 345, 'de la bénignité', { size: 11, anchor: 'start', fill: '#55545f' });
    return svgDe(620, 400, '« duct penetrating sign » : canal visible au sein de la sténose, aspect effilé', s);
  }

  /* Courbes de rehaussement : pancréas normal, PAI focale, adénocarcinome */
  function courbes() {
    const id = 'cr';
    const x0 = 80, y0 = 330, tx = { iv: 110, art: 250, tard: 420 };
    let s = `<defs>${fleche(id + '-a', '#111114')}</defs><rect width="660" height="430" fill="#fff"/>`;
    s += `<path d="M${x0} ${y0}L630 ${y0}M${x0} ${y0}L${x0} 30" stroke="#111114" stroke-width="2.5" marker-end="url(#${id}-a)"/>` + txt(x0 - 20, 46, 'UH', { size: 17, weight: 800 }) + txt(632, y0 + 22, 'temps', { size: 13, anchor: 'end', fill: '#55545f' });
    for (const [k, x] of Object.entries(tx)) s += `<path d="M${x} ${y0}L${x} 60" stroke="#cfcfd6" stroke-width="1.5" stroke-dasharray="4 5"/><path d="M${x} ${y0 + 34}L${x} ${y0 + 6}" stroke="#111114" stroke-width="2" marker-end="url(#${id}-a)"/>` + boite(x - 34, y0 + 36, 68, 26, '#111114', { iv: 'IV+', art: '40-45\'', tard: '80-90\'' }[k], { rx: 4, size: 14 });
    s += `<path d="M${tx.iv} ${y0}L${tx.art} 92C300 130 360 176 420 198C480 220 520 230 560 236" fill="none" stroke="#8c2f2f" stroke-width="4" stroke-linejoin="round"/>`;
    s += `<path d="M${tx.iv} ${y0}C170 250 250 196 330 172C420 146 490 132 552 122" fill="none" stroke="#9fcf7f" stroke-width="6" stroke-linecap="round"/>`;
    s += `<path d="M${tx.iv} ${y0}C180 280 260 240 340 224C420 212 480 210 560 210" fill="none" stroke="#1f3864" stroke-width="4"/>`;
    s += `<circle cx="${tx.art}" cy="92" r="5" fill="#8c2f2f"/>`;
    s += boite(270, 30, 236, 52, '#8c2f2f', ['Rehaussement', 'normal du pancréas'], { size: 16 });
    s += boite(560, 100, 96, 40, '#6e9a3e', ['PAI', 'focale'], { size: 14 });
    s += boite(430, 244, 216, 52, '#1f3864', ['Adénocarcinome', 'pancréatique'], { size: 16 });
    s += txt(20, 418, 'PAI focale : hypovasculaire au temps artériel, plus rehaussée au temps tardif (fibrose +++)', { size: 12.5, fill: '#55545f', anchor: 'start', weight: 600 });
    return svgDe(660, 430, 'Courbes de rehaussement du pancréas normal, de la PAI focale et de l\'adénocarcinome', s);
  }

  /* PAI : 3 formes radiologiques (diffuse, focale, multifocale), pancréas dessiné de face
     (tête à gauche dans le cadre duodénal, queue en haut à droite) — d'après Vlachou, Radiographics 2011 */
  function glandePoints(diffuse) {
    // ligne médiane tête → queue (Catmull-Rom) et demi-épaisseur ; lobulations sur le contour sauf forme diffuse
    const C = [[66, 162], [86, 140], [122, 122], [168, 102], [214, 80], [258, 60], [280, 52]];
    const R = diffuse ? [44, 40, 28, 28, 26, 22, 16] : [40, 34, 20, 21, 19, 15, 10];
    const pts = [], rad = [];
    for (let i = 0; i < C.length - 1; i++) {
      const p0 = C[Math.max(i - 1, 0)], p1 = C[i], p2 = C[i + 1], p3 = C[Math.min(i + 2, C.length - 1)];
      for (let k = 0; k < 10; k++) {
        const t = k / 10, t2 = t * t, t3 = t2 * t;
        const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
        pts.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]); rad.push(R[i] + (R[i + 1] - R[i]) * t);
      }
    }
    pts.push(C[C.length - 1]); rad.push(R[R.length - 1]);
    const g = [], d = [];
    pts.forEach((p, i) => {
      const a = pts[Math.max(i - 1, 0)], b = pts[Math.min(i + 1, pts.length - 1)];
      const dx = b[0] - a[0], dy = b[1] - a[1], n = Math.hypot(dx, dy) || 1;
      const lob = diffuse ? 1 : 1 + 0.08 * Math.sin(i * 1.25);
      const r = rad[i] * lob;
      g.push([p[0] - dy / n * r, p[1] + dx / n * r]); d.push([p[0] + dy / n * r, p[1] - dx / n * r]);
    });
    return { pts, g, d, rad };
  }
  const chemin = l => l.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('');
  function formePai(type, x0) {
    const diffuse = type === 'diffuse';
    const { pts, g, d } = glandePoints(diffuse);
    const fin = pts[pts.length - 1];
    const contour = chemin(g) + `A12 12 0 0 0 ${d[d.length - 1][0].toFixed(1)} ${d[d.length - 1][1].toFixed(1)}` + chemin(d.slice().reverse()).replace(/^M/, 'L') + `A40 40 0 0 0 ${g[0][0].toFixed(1)} ${g[0][1].toFixed(1)}Z`;
    let s = `<g transform="translate(${x0} 0)">`;
    // cadre duodénal (D2) autour de la tête
    s += `<path d="M96 64C40 60 6 110 12 168C16 214 62 236 120 226" fill="none" stroke="#c26a66" stroke-width="22" stroke-linecap="round"/><path d="M96 64C40 60 6 110 12 168C16 214 62 236 120 226" fill="none" stroke="#f6cdc6" stroke-width="16" stroke-linecap="round"/>`;
    // pseudo-capsule (halo) de la forme diffuse
    if (diffuse) s += `<path d="${contour}" fill="none" stroke="#b9c3cf" stroke-width="14" stroke-linejoin="round"/>`;
    s += `<path d="${contour}" fill="${diffuse ? '#e9b48e' : '#f8d6b8'}" stroke="${diffuse ? '#7c8796' : '#a65a2a'}" stroke-width="${diffuse ? 3 : 2.5}" stroke-linejoin="round"/>`;
    // masses focales (hypodenses, entourées d'un halo)
    const masse = (cx, cy, rx, ry) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx + 5}" ry="${ry + 5}" fill="#b9c3cf"/><ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#d29a74" stroke="#7c8796" stroke-width="2.5"/>`;
    if (type !== 'diffuse') s += masse(76, 152, 40, 38);
    if (type === 'multifocale') s += masse(fin[0] - 22, fin[1] + 6, 24, 18);
    // canal pancréatique principal (CPP) : de l'ampoule à la queue ; rétréci (effilé) dans les zones atteintes, sans dilatation d'amont
    const amp = [58, 188];
    const cpp = [amp, ...pts.filter((p, i) => i % 3 === 0 && i > 0), [fin[0] - 6, fin[1] + 2]];
    const atteint = p => diffuse || Math.hypot(p[0] - 76, p[1] - 152) < 40 || (type === 'multifocale' && Math.hypot(p[0] - (fin[0] - 22), p[1] - (fin[1] + 6)) < 24);
    for (let i = 0; i < cpp.length - 1; i++) {
      const a = cpp[i], b = cpp[i + 1], m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      const etroit = atteint(m);
      s += `<path d="M${a[0].toFixed(1)} ${a[1].toFixed(1)}L${b[0].toFixed(1)} ${b[1].toFixed(1)}" stroke="#2a2a30" stroke-width="${etroit ? 2 : 5}" stroke-linecap="round"${etroit && !diffuse ? '' : ''}/>`;
    }
    if (diffuse) s += `<path d="${chemin(cpp)}" fill="none" stroke="#2a2a30" stroke-width="2.2" stroke-dasharray="7 3"/>`;
    // cholédoque (vert) jusqu'à l'ampoule, effilé dans la tête atteinte
    s += `<path d="M70 0L70 96" stroke="#4f7f35" stroke-width="9" stroke-linecap="round"/><path d="M70 96C68 130 64 160 ${amp[0]} ${amp[1]}" fill="none" stroke="#4f7f35" stroke-width="${type === 'diffuse' ? 5 : 3}" stroke-linecap="round"/>`;
    s += `<circle cx="${amp[0]}" cy="${amp[1]}" r="4" fill="#fff" stroke="#111114" stroke-width="2"/>`;
    s += '</g>';
    return s;
  }
  function formesPai(disposition) {
    const T = [['diffuse', 'Forme diffuse', 'perte des lobulations'], ['focale', 'Forme focale', 'Diagnostic différentiel avec l\'ADK pancréatique +++'], ['multifocale', 'Forme multifocale', 'CPP rétréci sans dilatation d\'amont']];
    const haut = disposition === 'haut';
    let s = `<rect width="${haut ? 330 : 960}" height="${haut ? 1000 : 330}" fill="#fff"/>`;
    T.forEach(([type, titre, note], i) => {
      const x = haut ? 16 : 10 + i * 320, y = haut ? i * 334 : 0;
      s += `<g transform="translate(0 ${y})">` + formePai(type, x);
      if (type === 'focale') s += `<rect x="${x - 12}" y="6" width="314" height="248" rx="10" fill="none" stroke="#e57c2a" stroke-width="4"/>`;
      const c = type === 'focale' ? '#c25e14' : '#111114';
      s += txt(x + 150, 280, titre, { size: 17, fill: c }) + txt(x + 150, 306, note, { size: type === 'focale' ? (haut ? 11 : 13) : 12.5, fill: type === 'focale' ? c : '#55545f' });
      if (type === 'diffuse') s += `<path d="${x + 196} 156L${x + 222} 196" stroke="#55545f" stroke-width="1.5"/>`.replace('d="', 'd="M') + txt(x + 300, 214, 'pseudo-capsule (halo)', { size: 12, anchor: 'end', fill: '#55545f' })
        + txt(x + 86, 16, 'cholédoque', { size: 12, anchor: 'start', fill: '#4f7f35' }) + txt(x + 16, 250, 'D2', { size: 12, fill: '#9c3a46' });
      s += '</g>';
    });
    return svgDe(haut ? 330 : 960, haut ? 1000 : 330, '3 formes radiologiques de pancréatite auto-immune : diffuse, focale, multifocale', s);
  }

  /* Bili-IRM (PAI de type I) : nos annotations sur l'image du cours (coordonnées de l'image 778 × 563) */
  function biliaireAnnot() {
    let s = `<ellipse cx="262" cy="230" rx="122" ry="90" fill="none" stroke="#e85d75" stroke-width="4"/>`;
    s += `<path d="M360 176L420 112" stroke="#e85d75" stroke-width="3"/>` + boite(400, 22, 360, 92, '#a8172d', ['Sténose des voies biliaires', 'intra-hépatiques', 'Longues et effilées'], { size: 18 });
    s += `<path d="M473 440C490 420 510 408 531 398L564 369M531 398L566 470" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round"/>`;
    s += boite(390, 470, 380, 70, '#2a6f97', ['STENOSE SANS DILATATION', 'D\'AMONT +++'], { size: 19, weight: 800 });
    return s;
  }

  return { coupe, SEGMENTS, ESPACES, COLLECTIONS, FASCIAS: ['Péritoine pariétal postérieur', ...FASCIAS.map(f => f[0])], ESP, PAN, NECROSE_TYPES, necrose, annulaireCoupe, embryologie, ductPenetrating, courbes, formesPai, biliaireAnnot, espacesDuNiveau: n => Object.keys({ ...ESP[n === 'bas' ? 'bas' : 'haut'], ...ESP.commun }) };
});
