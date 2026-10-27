/* =========================================================
   RadiologicHub — Masses médiastinales : règles de la fiche fiches/masses-mediastinales.html
   ---------------------------------------------------------
   Données et petits calculs repris de la fiche de l'auteur (lexique inchangé) :
   • FELSON, HEITZMAN : compartiments, fréquences, contenu, communications, lésions citées ;
   • CAS : entraînement « Dans quel compartiment ? » ;
   • orientation(o)      : orientation tissulaire TDM / IRM (hydrique, tissulaire, graisseuse…) ;
   • csr(m)              : Chemical Shift Ratio (hyperplasie / tumeur thymique) ;
   • goitre(type, grade) : types A, B, C et grades 1, 2, 3 ;
   • germinale(m)        : marqueurs αFP / βHCG → tumeurs germinales compatibles.
   Module sans dépendance au navigateur (tests/mediastin.test.js).
   ========================================================= */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.RHRegles = root.RHRegles || {}).mediastin = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* Compartiments de Felson (fréquence, examen clé, lésions types) */
  const FELSON = {
    anterieur: { nom: 'Antérieur', pct: 54, examen: 'TDM', type: '« 4 T »',
      tissulaire: ['goitres thyroïdiens', 'lymphomes', 'thymomes', 'tératomes', 'adénome parathyroïdien'],
      kystique: ['kyste pleuropéricardique', 'thymome kystique', 'kyste thymique', 'lymphangiome kystique', 'kyste hydatique', 'tératome kystique'],
      graisseuse: ['hernie de Larrey/Morgagni', 'tératome', 'thymolipome', 'lipome/liposarcome'] },
    moyen: { nom: 'Moyen', pct: 26, examen: 'TDM/TOGD', type: 'ADP, kyste bronchogénique',
      tissulaire: ['ADP', 'tumeurs œsophagiennes', 'tumeurs trachéales', 'tumeurs neurogènes'],
      kystique: ['kyste bronchogénique', 'kyste entérogène/duplication digestive', 'ADP nécrosées', 'lymphangiome', 'goitre kystisé', 'tératome kystique', 'kyste hydatique'],
      graisseuse: ['hernie', 'lipome', 'liposarcome'] },
    posterieur: { nom: 'Postérieur', pct: 20, examen: 'IRM', type: 'tumeur neurogène, os',
      tissulaire: ['tumeurs neurogènes', 'hématopoïèse extramédullaire', 'lymphome', 'tumeurs osseuses'],
      kystique: ['spondylodiscite', 'méningocèle', 'kyste hydatique'],
      graisseuse: ['lipome/liposarcome', 'hernie de Bochdalek'] },
  };

  /* Compartiments de Heitzman : id du modèle 3D → nom, abréviation, communication (médiastin para-orificiel) */
  const HEITZMAN = [
    { id: 'h-ocm', nom: 'Orifice cervico-médiastinal', abr: 'OCM', vers: 'cou', cites: [] },
    { id: 'h-retrosternal', nom: 'Espace rétro-sternal pré-aortico-cave', abr: '', vers: '',
      cites: ["Kyste thymique : masse kystique de l'espace rétrosternal pré-aortico-cave", "Thymome de petite taille : sur le profil, opacité de l'espace clair rétrosternal"] },
    { id: 'h-acp', nom: 'Angles cardio-phréniques', abr: 'ACPA, ACPP', vers: "étage supérieur de l'abdomen",
      cites: ['Kyste pleuro-péricardique : surtout ACPA droit ++, ACPP'] },
    { id: 'h-epto', nom: 'Espace paratrachéo-œsophagien', abr: 'EPTO', vers: 'hiles',
      cites: ['Kyste bronchogénique : EPTO'] },
    { id: 'h-carinaire', nom: 'Espace rétro- et sous-carinaire', abr: '', vers: '',
      cites: ['Kyste bronchogénique : espace sous- et rétro-carinaire'] },
    { id: 'h-gcv', nom: 'Gouttières costo-vertébrales', abr: 'GCV', vers: 'canal rachidien',
      cites: ['Tumeurs neurogènes : masse bien limitée de la gouttière costo-vertébrale, ronde, ovalaire ou en sablier', 'Hématopoïèse extramédullaire : masses tissulaires des GCV', 'Chondrosarcome : masse tissulaire de la GCV'] },
    { id: 'h-eimp', nom: 'Espace inframédiastinal postérieur', abr: 'EIMP', vers: "étage supérieur de l'abdomen", cites: [] },
  ];

  /* Entraînement « Dans quel compartiment ? » (Felson) — chaque lésion figure dans la liste du compartiment */
  const CAS = [
    { texte: 'Goitre endothoracique : migration antérieure classique (80 %).', lesion: 'goitres thyroïdiens', rep: 'anterieur' },
    { texte: 'Thymome : masse tissulaire bien limitée, de contours réguliers.', lesion: 'thymomes', rep: 'anterieur' },
    { texte: "Kyste pleuro-péricardique : lésion purement liquidienne de l'ACPA droit.", lesion: 'kyste pleuropéricardique', rep: 'anterieur' },
    { texte: 'Thymolipome : masse encapsulée de densité graisseuse avec îlots tissulaires.', lesion: 'thymolipome', rep: 'anterieur' },
    { texte: "Kyste bronchogénique : dérivé kystique de l'intestin primitif antérieur, EPTO.", lesion: 'kyste bronchogénique', rep: 'moyen' },
    { texte: 'Kyste entérogène / duplication digestive.', lesion: 'kyste entérogène/duplication digestive', rep: 'moyen' },
    { texte: 'Tumeur neurogène : masse en sablier avec élargissement foraminal.', lesion: 'tumeurs neurogènes', rep: 'posterieur' },
    { texte: 'Hernie de Bochdalek.', lesion: 'hernie de Bochdalek', rep: 'posterieur' },
  ];

  /* Orientation tissulaire TDM / IRM
     o : { uh: nombre (densité spontanée), rehausse: 'non' | 'oui' | 'vasculaire', mixte: bool } */
  function orientation(o = {}) {
    if (o.mixte) return { cle: 'composite', nom: 'Composite', texte: 'densités mixtes' };
    if (o.rehausse === 'vasculaire') return { cle: 'vasculaire', nom: 'Vasculaire', texte: 'rehaussement de type vasculaire' };
    const uh = Number(String(o.uh ?? '').replace(',', '.'));
    if (o.uh === '' || o.uh == null || Number.isNaN(uh)) return null;
    if (uh < -40) return { cle: 'graisseuse', nom: 'Graisseuse', texte: '< -40 UH ; hyper T1 et T2' };
    if (uh >= 15 && uh <= 50 && o.rehausse !== 'non') return { cle: 'tissulaire', nom: 'Tissulaire', texte: '15 à 50 UH ; iso T1 ; rehaussée' };
    if (uh > -15 && uh < 15 && o.rehausse !== 'oui') return { cle: 'hydrique', nom: 'Hydrique', texte: 'autour de 0 UH ; non rehaussée ; hypo T1, hyper T2' };
    return { cle: 'indetermine', nom: 'À préciser', texte: 'valeurs hors des repères de la fiche : confronter au rehaussement, à l\'IRM et au contexte' };
  }

  /* Chemical Shift Ratio : (Thy OP / muscle OP) / (Thy IP / muscle IP) */
  const CSR = { hyperplasie: [0.614, 0.13], tumeur: [1.026, 0.039] };
  function csr({ thyOP, muscleOP, thyIP, muscleIP } = {}) {
    const n = v => Number(String(v ?? '').replace(',', '.'));
    const [a, b, c, d] = [thyOP, muscleOP, thyIP, muscleIP].map(n);
    if ([a, b, c, d].some(x => !x || Number.isNaN(x))) return null;
    const v = (a / b) / (c / d);
    const dans = ([m, e]) => v >= m - e && v <= m + e;
    const cle = dans(CSR.hyperplasie) ? 'hyperplasie' : dans(CSR.tumeur) ? 'tumeur' : v < CSR.hyperplasie[0] ? 'hyperplasie' : v > CSR.tumeur[0] ? 'tumeur' : 'intermediaire';
    const plage = dans(CSR.hyperplasie) || dans(CSR.tumeur);
    return { valeur: Math.round(v * 1000) / 1000, cle, dansPlage: plage };
  }

  /* Goitre endothoracique : types et grades */
  const TYPES_GOITRE = { A: 'prévasculaire', B: 'rétrovasculaire', C: 'rétrotrachéal' };
  const GRADES_GOITRE = { 1: "au-dessus de la crosse de l'aorte", 2: "au niveau de la crosse de l'aorte", 3: "en dessous de la crosse de l'aorte" };
  const goitre = (type, grade) => (TYPES_GOITRE[type] && GRADES_GOITRE[grade] ? `Type ${type} : ${TYPES_GOITRE[type]}. Grade ${grade} : ${GRADES_GOITRE[grade]}.` : '');

  /* Tumeurs germinales : marqueurs (αFP, βHCG) — 'normal' | 'eleve' | '' (non dosé) */
  function germinale({ afp = '', bhcg = '' } = {}) {
    if (!afp && !bhcg) return [];
    const l = [];
    if (afp === 'normal' && bhcg !== '') l.push('Séminome (αFP toujours normale ; βHCG normale ou élevée)');
    if (afp === 'eleve') l.push('Tumeur vitelline maligne (αFP constante)');
    if (afp === 'eleve' && bhcg === 'eleve') l.push('Tératocarcinome (αFP et βHCG élevées)');
    if (bhcg === 'eleve') l.push('Choriocarcinome (βHCG ++)');
    if (afp === 'eleve' || bhcg === 'eleve') l.push('Carcinome embryonnaire (αFP +/- ; βHCG +/-)');
    return l;
  }

  return { FELSON, HEITZMAN, CAS, orientation, CSR, csr, TYPES_GOITRE, GRADES_GOITRE, goitre, germinale };
});
