/* =========================================================
   RadiologicHub — Coroscanner : CAD-RADS 2.0 et score calcique
   ---------------------------------------------------------
   • Catégorie de sténose (sténose maximale) : 0, 1, 2, 3, 4A, 4B, 5,
     ou N (segment non analysable sans autre sténose ≥ 50 %) ;
   • charge en plaque P1 à P4 (score calcique d'Agatston ou score
     d'atteinte segmentaire SIS ; la plus élevée si les deux sont
     connues) ;
   • modificateurs dans l'ordre : N, HRP, I, S, G, E
     (ex. : CAD-RADS 4A/P2/HRP/I+/S) ;
   • conduite proposée (douleur thoracique stable) ;
   • classes du score calcique d'Agatston.
   Segmentation coronaire en 18 segments (modèle SCCT), noms français.
   Module sans dépendance au navigateur (testé sous Node :
   tests/cadrads.test.js). À FAIRE VÉRIFIER MÉDICALEMENT.
   ========================================================= */

(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.RHRegles = root.RHRegles || {}).cadrads = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* Segments (modèle SCCT à 18 segments). vaisseau : territoire pour la
     règle « tritronculaire » ; dominance : segments présents selon la
     dominance (D = droite, G = gauche, C = codominance). */
  const SEGMENTS = {
    1: { court: 'CD prox.', nom: 'coronaire droite proximale', vaisseau: 'CD' },
    2: { court: 'CD moy.', nom: 'coronaire droite moyenne', vaisseau: 'CD' },
    3: { court: 'CD dist.', nom: 'coronaire droite distale', vaisseau: 'CD' },
    4: { court: 'IVP (CD)', nom: 'interventriculaire postérieure (issue de la coronaire droite)', vaisseau: 'CD', dominance: 'DC' },
    5: { court: 'TC', nom: 'tronc commun gauche', vaisseau: 'TC' },
    6: { court: 'IVA prox.', nom: 'interventriculaire antérieure proximale', vaisseau: 'IVA' },
    7: { court: 'IVA moy.', nom: 'interventriculaire antérieure moyenne', vaisseau: 'IVA' },
    8: { court: 'IVA dist.', nom: 'interventriculaire antérieure distale', vaisseau: 'IVA' },
    9: { court: 'D1', nom: 'première diagonale', vaisseau: 'IVA' },
    10: { court: 'D2', nom: 'deuxième diagonale', vaisseau: 'IVA' },
    11: { court: 'Cx prox.', nom: 'circonflexe proximale', vaisseau: 'Cx' },
    12: { court: 'M1', nom: 'première marginale', vaisseau: 'Cx' },
    13: { court: 'Cx dist.', nom: 'circonflexe moyenne et distale', vaisseau: 'Cx' },
    14: { court: 'M2', nom: 'deuxième marginale', vaisseau: 'Cx' },
    15: { court: 'IVP (Cx)', nom: 'interventriculaire postérieure (issue de la circonflexe)', vaisseau: 'Cx', dominance: 'G' },
    16: { court: 'RVG (CD)', nom: 'rétroventriculaire gauche (issue de la coronaire droite)', vaisseau: 'CD', dominance: 'D' },
    17: { court: 'Bissectrice', nom: 'bissectrice (ramus intermedius)', vaisseau: 'Cx', option: true },
    18: { court: 'RVG (Cx)', nom: 'rétroventriculaire gauche (issue de la circonflexe)', vaisseau: 'Cx', dominance: 'GC' },
  };
  const DOMINANCES = {
    droite: { lettre: 'D', label: 'Dominance droite', texte: 'l\'interventriculaire postérieure et la rétroventriculaire gauche naissent de la coronaire droite' },
    gauche: { lettre: 'G', label: 'Dominance gauche', texte: 'l\'interventriculaire postérieure et la rétroventriculaire gauche naissent de la circonflexe' },
    codominance: { lettre: 'C', label: 'Codominance', texte: 'l\'interventriculaire postérieure naît de la coronaire droite, la rétroventriculaire gauche de la circonflexe' },
  };
  /* Segments présents pour une dominance donnée (bissectrice si présente) */
  function segmentsPresents(dominance = 'droite', bissectrice = false) {
    const l = (DOMINANCES[dominance] || DOMINANCES.droite).lettre;
    return Object.keys(SEGMENTS).map(Number).filter(n => {
      const s = SEGMENTS[n];
      if (s.option) return !!bissectrice;
      return !s.dominance || s.dominance.includes(l);
    });
  }

  /* Degrés de sténose (diamètre) */
  const STENOSES = {
    '0': { label: 'Plaque sans sténose', court: '0 %', rang: 1, cat: '1' },
    '1-24': { label: 'Sténose minime (1-24 %)', court: '1-24 %', rang: 1, cat: '1' },
    '25-49': { label: 'Sténose légère (25-49 %)', court: '25-49 %', rang: 2, cat: '2' },
    '50-69': { label: 'Sténose modérée (50-69 %)', court: '50-69 %', rang: 3, cat: '3' },
    '70-99': { label: 'Sténose sévère (70-99 %)', court: '70-99 %', rang: 4, cat: '4A' },
    '100': { label: 'Occlusion (100 %)', court: '100 %', rang: 5, cat: '5' },
    nd: { label: 'Segment non analysable', court: 'non analysable', rang: null, cat: null },
  };
  const ORDRE = ['0', '1', '2', '3', '4A', '4B', '5'];

  const CATEGORIES = {
    0: { titre: 'Absence de maladie coronaire', stenose: '0 % (ni plaque ni sténose)', conduite: 'Rassurer ; envisager une cause non athéromateuse de la douleur thoracique.' },
    1: { titre: 'Maladie coronaire minime non obstructive', stenose: '1-24 %, ou plaque sans sténose', conduite: 'Envisager une cause non athéromateuse de la douleur thoracique ; prévention et contrôle des facteurs de risque selon la charge en plaque.' },
    2: { titre: 'Maladie coronaire légère non obstructive', stenose: '25-49 %', conduite: 'Prévention et contrôle des facteurs de risque.' },
    3: { titre: 'Sténose modérée', stenose: '50-69 %', conduite: 'Envisager une évaluation fonctionnelle (test d\'ischémie ou FFR-CT) ; traitement préventif et anti-angineux.' },
    '4A': { titre: 'Sténose sévère', stenose: '70-99 % sur 1 ou 2 vaisseaux', conduite: 'Envisager une coronarographie ou une évaluation fonctionnelle ; traitement préventif et anti-angineux.' },
    '4B': { titre: 'Sténose sévère du tronc commun ou tritronculaire', stenose: 'tronc commun ≥ 50 % ou atteinte tritronculaire ≥ 70 %', conduite: 'Coronarographie recommandée ; traitement préventif et anti-angineux.' },
    5: { titre: 'Occlusion coronaire totale', stenose: '100 %', conduite: 'Envisager une coronarographie, une évaluation fonctionnelle et/ou de la viabilité.' },
    N: { titre: 'Examen non diagnostique', stenose: 'segment non analysable, sans autre sténose ≥ 50 %', conduite: 'Une sténose obstructive ne peut pas être exclue : envisager un autre test (évaluation fonctionnelle ou coronarographie).' },
  };

  /* Critères de plaque à haut risque (HRP si au moins 2) */
  const HRP = {
    remodelage: 'remodelage positif',
    hypodense: 'plaque hypodense (< 30 UH)',
    ponctuees: 'calcifications ponctuées',
    anneau: 'signe de l\'anneau (« napkin-ring »)',
  };
  const ISCHEMIE = { '': 'non évaluée', 'I+': 'ischémie présente', 'I-': 'pas d\'ischémie', 'I±': 'résultat limite ou indéterminé' };
  const nombre = v => { const n = parseFloat(String(v ?? '').replace(',', '.')); return Number.isFinite(n) ? n : null; };

  /* Charge en plaque : score calcique d'Agatston et/ou SIS (nombre de segments avec plaque) */
  function chargePlaque(cac, sis) {
    const c = nombre(cac), s = nombre(sis);
    const parCac = c == null || c <= 0 ? 0 : c <= 100 ? 1 : c <= 300 ? 2 : c < 1000 ? 3 : 4;
    const parSis = s == null || s <= 0 ? 0 : s <= 2 ? 1 : s <= 4 ? 2 : s <= 7 ? 3 : 4;
    const p = Math.max(parCac, parSis);
    if (!p) return null;
    const methode = parCac && parSis ? (parCac >= parSis ? 'score calcique' : 'score d\'atteinte segmentaire') : parCac ? 'score calcique' : 'score d\'atteinte segmentaire';
    return { p, code: 'P' + p, label: ['', 'légère', 'modérée', 'importante', 'très étendue'][p], methode };
  }

  /* Classes du score calcique d'Agatston */
  const AGATSTON = [
    { min: 0, max: 0, classe: '0', label: 'Absence de calcification coronaire', risque: 'Risque très faible' },
    { min: 1, max: 10, classe: '1-10', label: 'Calcifications minimes', risque: 'Risque faible' },
    { min: 11, max: 100, classe: '11-100', label: 'Calcifications légères', risque: 'Risque modéré' },
    { min: 101, max: 400, classe: '101-400', label: 'Calcifications modérées', risque: 'Risque modérément élevé' },
    { min: 401, max: Infinity, classe: '> 400', label: 'Calcifications sévères (étendues)', risque: 'Risque élevé' },
  ];
  function agatston(cac) {
    const c = nombre(cac);
    if (c == null || c < 0) return null;
    return AGATSTON.find(a => c >= a.min && c <= a.max) || AGATSTON[AGATSTON.length - 1];
  }

  /* Lésions : { seg, grade, plaque, hrp: { remodelage, hypodense, ponctuees, anneau }, stent } */
  const hrpLesion = l => Object.keys(HRP).filter(k => l.hrp && l.hrp[k]);
  function categorie(lesions = [], options = {}) {
    const valides = lesions.filter(l => STENOSES[l.grade] && STENOSES[l.grade].rang != null && SEGMENTS[l.seg]);
    const nonAnalysable = lesions.some(l => l.grade === 'nd');
    let cat = options.cac != null && nombre(options.cac) > 0 ? '1' : '0';
    valides.forEach(l => { const c = STENOSES[l.grade].cat; if (ORDRE.indexOf(c) > ORDRE.indexOf(cat)) cat = c; });
    // 4B : tronc commun ≥ 50 % ou trois territoires (CD, IVA, Cx) ≥ 70 %
    const tc = valides.some(l => SEGMENTS[l.seg].vaisseau === 'TC' && STENOSES[l.grade].rang >= 3);
    const severes = new Set(valides.filter(l => STENOSES[l.grade].rang >= 4).map(l => SEGMENTS[l.seg].vaisseau));
    const tri = ['CD', 'IVA', 'Cx'].every(v => severes.has(v));
    if (cat !== '5' && (tc || tri)) cat = '4B';
    const N = nonAnalysable && (options.nonDiagnostique !== false);
    if (N && ORDRE.indexOf(cat) < ORDRE.indexOf('3')) return { cat: 'N', modN: false, tc, tri };
    return { cat, modN: N, tc, tri };
  }

  /* Résultat complet : code, charge en plaque, modificateurs, conduite */
  function evaluer(st = {}) {
    const lesions = st.lesions || [];
    const r = categorie(lesions, { cac: st.cac });
    const sis = new Set(lesions.filter(l => STENOSES[l.grade] && STENOSES[l.grade].rang != null).map(l => l.seg)).size;
    const P = r.cat === '0' ? null : chargePlaque(st.cac, sis || null);
    const hrp = lesions.some(l => hrpLesion(l).length >= 2);
    const stent = !!st.stent || lesions.some(l => l.stent);
    const mods = [];
    if (r.modN) mods.push('N');
    if (hrp) mods.push('HRP');
    if (st.ischemie && ISCHEMIE[st.ischemie] && st.ischemie !== '') mods.push(st.ischemie);
    if (stent) mods.push('S');
    if (st.pontage) mods.push('G');
    if (st.exception) mods.push('E');
    const code = ['CAD-RADS ' + r.cat, P ? P.code : '', ...mods].filter(Boolean).join('/');
    const C = CATEGORIES[r.cat];
    let conduite = C.conduite;
    if ((r.cat === '1' || r.cat === '2') && P && P.p >= 3) conduite = 'Prévention et contrôle des facteurs de risque renforcés (charge en plaque importante).';
    if (r.cat === '3' && st.ischemie === 'I+') conduite = 'Ischémie présente : coronarographie à envisager si une revascularisation peut être bénéfique.';
    if (r.cat === '3' && st.ischemie === 'I-') conduite = 'Pas d\'ischémie : traitement préventif et anti-angineux.';
    return { ...r, code, P, sis, hrp, stent, mods, titre: C.titre, stenose: C.stenose, conduite };
  }

  return { SEGMENTS, DOMINANCES, STENOSES, CATEGORIES, HRP, ISCHEMIE, AGATSTON, segmentsPresents, chargePlaque, agatston, hrpLesion, categorie, evaluer };
});
