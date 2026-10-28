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

  return { coupe, SEGMENTS, ESPACES, COLLECTIONS, FASCIAS: ['Péritoine pariétal postérieur', ...FASCIAS.map(f => f[0])], ESP, PAN, espacesDuNiveau: n => Object.keys({ ...ESP[n === 'bas' ? 'bas' : 'haut'], ...ESP.commun }) };
});
