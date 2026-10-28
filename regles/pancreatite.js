/* =========================================================
   RadiologicHub — fiche « Imagerie de la pancréatite aiguë » (fiches/pancreatite-aigue.html) :
   données et petits calculs repris du cours de l'auteur (lexique inchangé)
   ---------------------------------------------------------
   • atlantaDiagnostic(c)  : au moins 2 des 3 critères (conférence d'Atlanta 2012) ;
   • ctsi(b, n)            : Balthazar (A à E) + étendue de la nécrose → index 0 à 10, morbidité, mortalité ;
   • severite(o)           : peu grave / modérément grave / grave (Atlanta 2012) ;
   • collection(forme, s)  : POI ou PN × délai (< ou > 4 semaines) → CLAP, CAN, PK, NOP ;
   • momentTdm(o)          : d'emblée (doute, gravité) ou à 48-72 h (mieux ≥ 72 h, idéal 5-7 j) ;
   • contraste(poids)      : 1,5 à 2 cc/kg, débit 3-4 cc/s ;
   • CAS                   : entraînement « Quelle collection ? ».
   Module sans dépendance au navigateur (tests/pancreatite-aigue.test.js).
   ========================================================= */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.RHRegles = root.RHRegles || {}).pancreatite = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const num = v => { const n = parseFloat(String(v ?? '').replace(',', '.')); return Number.isFinite(n) ? n : null; };

  /* Atlanta 2012 : diagnostic retenu en présence d'au moins 2 des 3 critères */
  const CRITERES = {
    douleur: 'Douleurs abdominales typiques (épigastralgies, irradiation au dos)',
    enzymes: 'Élévation des enzymes pancréatiques (amylasémie ou lipasémie) ≥ 3xN',
    imagerie: 'Aspect caractéristique en imagerie (scanner principalement, IRM, échographie)',
  };
  function atlantaDiagnostic(c = {}) {
    const n = Object.keys(CRITERES).filter(k => c[k]).length;
    return { n, retenu: n >= 2, sansImagerie: !!(c.douleur && c.enzymes) };
  }

  /* CTSI : classification de Balthazar corrigée (0-4) + nécrose (0, 2, 4, 6) */
  const BALTHAZAR = {
    A: { points: 0, texte: 'Pancréas normal' },
    B: { points: 1, texte: 'Elargissement focal ou diffus de la glande pancréatique' },
    C: { points: 2, texte: 'Densification de la graisse péri-pancréatique' },
    D: { points: 3, texte: 'Collection unique' },
    E: { points: 4, texte: 'Au moins deux collections ou une collection contenant des bulles d\'air' },
  };
  const NECROSE = {
    aucune: { points: 0, texte: 'Pas de nécrose' },
    moins30: { points: 2, texte: 'Nécrose < 30 %' },
    '30a50': { points: 4, texte: 'Nécrose 30–50 %' },
    plus50: { points: 6, texte: 'Nécrose > 50 %' },
  };
  // Tableau de l'auteur : < 3 → 8 % / 3 % ; 4 – 6 → 35 % / 6 % ; 7 – 10 → 92 % / 17 % (index 3 rangé avec les < 3, voir README)
  const PRONOSTIC = [
    { max: 3, libelle: '< 3', morbidite: 8, mortalite: 3 },
    { max: 6, libelle: '4 – 6', morbidite: 35, mortalite: 6 },
    { max: 10, libelle: '7 - 10', morbidite: 92, mortalite: 17 },
  ];
  function ctsi(balthazar, necrose) {
    const b = BALTHAZAR[balthazar], n = NECROSE[necrose];
    if (!b || !n) return null;
    const index = b.points + n.points;
    const ligne = PRONOSTIC.find(p => index <= p.max);
    return { index, balthazar: b.points, necrose: n.points, ...ligne };
  }

  /* Atlanta 2012 : degrés de sévérité
     o : { defaillance: 'aucune' | 'transitoire' | 'persistante', locales: bool, systemiques: bool } */
  function severite(o = {}) {
    if (o.defaillance === 'persistante') return { cle: 'grave', nom: 'Grave', texte: 'caractérisée par une défaillance viscérale persistante (>48h) → taux de mortalité élevé' };
    if (o.defaillance === 'transitoire' || o.locales || o.systemiques) return { cle: 'moderee', nom: 'Modérément grave', texte: 'défaillance viscérale transitoire (< 48h) et/ou de complications locales' };
    if (o.defaillance === 'aucune') return { cle: 'peu', nom: 'Peu grave', texte: '∅ défaillance viscérale, de complication locale ou systémique → mortalité presque nul' };
    return null;
  }

  /* Collections : forme de PA × délai depuis le début */
  const COLLECTIONS = {
    clap: { abr: 'CLAP', nom: 'Collection Liquidienne Aiguë Péri-pancréatique' },
    can: { abr: 'CAN', nom: 'Collection Aiguë Nécrotique' },
    pk: { abr: 'PK', nom: 'Pseudo-Kyste' },
    nop: { abr: 'NOP', nom: 'Nécrose Organisée Pancréatique' },
  };
  function collection(forme, semaines) {
    const s = num(semaines);
    if (!['POI', 'PN'].includes(forme) || s == null) return null;
    const tardive = s > 4;
    const cle = forme === 'POI' ? (tardive ? 'pk' : 'clap') : (tardive ? 'nop' : 'can');
    return { cle, ...COLLECTIONS[cle] };
  }

  /* Moment du scanner */
  function momentTdm({ heures, doute, grave } = {}) {
    if (doute || grave) return { cle: 'emblee', texte: 'D\'emblée : ' + [doute && 'persistance d\'un doute diagnostique', grave && 'tableau clinique et biologique grave d\'emblée'].filter(Boolean).join(' ; ') + '.' };
    const h = num(heures);
    if (h == null) return null;
    if (h < 48) return { cle: 'tot', texte: 'Trop tôt : réalisé 48-72 h après le début de la symptomatologie (meilleure évaluation de la nécrose après ce délai).' };
    if (h < 72) return { cle: 'possible', texte: 'Possible (48-72 h) ; mieux à partir de 72h.' };
    if (h < 120) return { cle: 'bien', texte: 'Bon délai (≥ 72 h) ; l\'idéal = entre 5-7j.' };
    if (h <= 168) return { cle: 'ideal', texte: 'Délai idéal : entre 5-7j.' };
    return { cle: 'tard', texte: 'Au-delà de 7 j : phase tardive, recherche de complications locales.' };
  }

  /* Produit de contraste : 1,5 à 2 cc/kg ; débit 3-4 cc/s */
  function contraste(poids) {
    const p = num(poids);
    if (!p || p <= 0) return null;
    return { min: Math.round(p * 1.5), max: Math.round(p * 2), debit: '3-4cc/s' };
  }

  /* Entraînement : quelle collection ? */
  const CAS = [
    { texte: 'PA œdémateuse, J10 : collection homogène, liquide (<15UH), au contact du pancréas, sans paroi.', rep: 'clap' },
    { texte: 'PA nécrosante, J12 : collection hétérogène, nécrose et liquide, intra et péri-pancréatique, sans paroi.', rep: 'can' },
    { texte: 'PA œdémateuse, 6 semaines : collection homogène liquide (<15UH) à paroi propre dans l\'arrière-cavité.', rep: 'pk' },
    { texte: 'PA nécrosante, 8 semaines : collection hétérogène, nécrose et liquide, à paroi propre.', rep: 'nop' },
    { texte: 'J5 : coulée liquidienne homogène en avant du fascia para-rénal antérieur gauche, pancréas rehaussé normalement.', rep: 'clap' },
    { texte: 'J20 : plages hypodenses non rehaussées du corps se prolongeant dans la graisse péri-pancréatique, pas de paroi.', rep: 'can' },
    { texte: '2 mois après une PA nécrosante : collection encapsulée, contenu hétérogène avec débris.', rep: 'nop' },
    { texte: '3 mois après une PA œdémateuse : collection ronde homogène à paroi fine, à distance du pancréas.', rep: 'pk' },
  ];

  return { CRITERES, atlantaDiagnostic, BALTHAZAR, NECROSE, PRONOSTIC, ctsi, severite, COLLECTIONS, collection, momentTdm, contraste, CAS };
});
