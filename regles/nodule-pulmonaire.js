/* =========================================================
   RadiologicHub — fiche « Conduite à tenir devant un nodule pulmonaire »
   (fiches/nodule-pulmonaire.html) : données et petits calculs repris de la
   fiche de l'auteur (lexique inchangé)
   ---------------------------------------------------------
   • fleischner(o)       : ligne du tableau Fleischner 2017 de la fiche
                           (texte de l'auteur) + jalons pour la frise ;
   • tempsDoublement(m)  : TD à partir de deux diamètres et de l'intervalle ;
   • arguments(o)        : arguments de bénignité / signes de malignité
                           de la fiche selon les caractères du nodule ;
   • CAS                 : entraînement « Bénin ou suspect ? ».
   Module sans dépendance au navigateur (tests/nodule-pulmonaire.test.js).
   ========================================================= */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.RHRegles = root.RHRegles || {}).nodulePulmonaire = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const num = v => { const n = parseFloat(String(v ?? '').replace(',', '.')); return Number.isFinite(n) ? n : null; };

  /* Jalons d'une conduite : [de, à] en mois ; opt = « +/- » ; fin = examen terminal (biopsie, histologie…) */
  const J = (de, a, opt = false) => ({ de, a, opt });

  /*
   * o : { type: 'solide' | 'verre' | 'mixte', taille (mm), solide (mm, composante solide d'un mixte),
   *       multiples: bool, risque: 'faible' | 'haut' }
   * Renvoie { ligne (texte de la fiche), conduite, jalons, geste, cle } ou null si incomplet.
   */
  function fleischner(o = {}) {
    const t = num(o.taille), multiples = !!o.multiples, haut = o.risque === 'haut';
    if (t == null || !o.type) return null;
    const r = (cle, ligne, conduite, jalons = [], geste = '') => ({ cle, ligne, conduite, jalons, geste });
    if (o.type === 'solide') {
      if (t < 6) return r('s-petit', '< 6 mm (unique ou multiples) : pas de suivi si faible risque ; TDM à 12 mois optionnelle si haut risque.',
        haut ? 'TDM à 12 mois optionnelle' : 'pas de suivi', haut ? [J(12, 12, true)] : []);
      if (t <= 8) {
        if (!multiples) return r('s-moyen-u', '6-8 mm unique : TDM 6-12 mois +/- 18-24 mois (faible risque) ; TDM 6-12 mois + 18-24 mois (haut risque).',
          haut ? 'TDM 6-12 mois + 18-24 mois' : 'TDM 6-12 mois +/- 18-24 mois', [J(6, 12), J(18, 24, !haut)]);
        return r('s-moyen-m', '6-8 mm multiples : TDM 3-6 mois +/- 18-24 mois (faible risque) ; TDM 3-6 mois puis 18-24 mois (haut risque).',
          haut ? 'TDM 3-6 mois puis 18-24 mois' : 'TDM 3-6 mois +/- 18-24 mois', [J(3, 6), J(18, 24, !haut)]);
      }
      if (!multiples) return r('s-grand-u', '> 8 mm unique : TDM à 3 mois, PET-TDM et/ou biopsie selon le contexte (même stratégie, faible ou haut risque).',
        'TDM à 3 mois, PET-TDM et/ou biopsie selon le contexte', [J(3, 3)], 'PET-TDM et/ou biopsie');
      return r('s-grand-m', '> 8 mm multiples : TDM 3-6 mois +/- 18-24 mois (faible risque) ; TDM 3-6 mois +/- 18-24 mois (haut risque).',
        'TDM 3-6 mois +/- 18-24 mois', [J(3, 6), J(18, 24, true)]);
    }
    // Nodules non solides (verre dépoli pur, mixte)
    if (t < 6) {
      return multiples
        ? r('ns-petit-m', '< 6 mm, multiples : TDM 3-6 mois, puis à 2 ans et 4 ans.', 'TDM 3-6 mois, puis à 2 ans et 4 ans', [J(3, 6), J(24, 24), J(48, 48)])
        : r('ns-petit-u', '< 6 mm, unique : pas de suivi.', 'pas de suivi');
    }
    if (multiples) return r('ns-m', 'Multiples : TDM 3-6 mois, puis conduite basée sur le nodule le plus suspect.', 'TDM 3-6 mois, puis conduite basée sur le nodule le plus suspect', [J(3, 6)]);
    if (o.type === 'verre') return r('vd', 'Verre dépoli pur ≥ 6 mm : TDM 6-12 mois, puis tous les 2 ans jusqu\'à 5 ans.', 'TDM 6-12 mois, puis tous les 2 ans jusqu\'à 5 ans', [J(6, 12), J(36, 36), J(60, 60)]);
    const s = num(o.solide);
    if (s == null) return { cle: 'mixte-incomplet', ligne: '', conduite: '', jalons: [], geste: '', manque: 'composante solide' };
    if (s < 6) return r('mixte-s-petit', 'Mixte ≥ 6 mm ; solide < 6 mm : TDM 3-6 mois pour confirmer, puis annuelle pendant 5 ans.', 'TDM 3-6 mois pour confirmer, puis annuelle pendant 5 ans', [J(3, 6), J(12, 12), J(24, 24), J(36, 36), J(48, 48), J(60, 60)]);
    return r('mixte-s-grand', 'Mixte ≥ 6 mm ; solide ≥ 6 mm : histologie.', 'histologie', [], 'histologie');
  }

  /* Temps de doublement (volume ∝ diamètre³) : TD = Δt × ln 2 / (3 × ln(D2 / D1)) */
  function tempsDoublement({ d1, d2, jours } = {}) {
    const a = num(d1), b = num(d2), j = num(jours);
    if (!a || !b || !j || a <= 0 || b <= 0 || j <= 0) return null;
    const croissance = Math.round((b - a) * 10) / 10;
    if (b <= a) return { td: null, croissance, evolutif: false, zone: 'pas-de-croissance' };
    const td = Math.round(j * Math.LN2 / (3 * Math.log(b / a)));
    const zone = td < 30 ? 'tres-rapide' : td <= 500 ? 'malin' : td <= 730 ? 'intermediaire' : 'stable';
    return { td, croissance, evolutif: b - a >= 2, zone, typique: td >= 100 && td <= 400 };
  }

  /* Arguments de la fiche selon les caractères choisis
     o : { densite, contours, graisse, calcif (0-6), bronchogramme, excavation: '' | 'fine' | 'epaisse', taille } */
  const CALCIF = {
    1: { sens: 'benin', texte: 'Type 1 : calcification en masse.' },
    2: { sens: 'benin', texte: 'Type 2 : nidus central.' },
    3: { sens: 'benin', texte: 'Type 3 : strates concentriques.' },
    4: { sens: 'benin', texte: 'Type 4 : pop-corn (hamartochondrome).' },
    5: { sens: 'malin', texte: 'Calcifications suspectes : excentrées (type 5).' },
    6: { sens: 'malin', texte: 'Calcifications suspectes : microcalcifications (type 6).' },
  };
  function argumentsNodule(o = {}) {
    const l = [];
    const add = (sens, texte) => l.push({ sens, texte });
    if (o.densite === 'solide') add('neutre', 'Solide : croissance plus rapide ; stabilité 2 ans rassurante. Point décisif : taille, contours, TD, TEP si > 8 mm.');
    if (o.densite === 'verre') add('neutre', 'Verre dépoli pur : croissance lente ; spectre pré-invasif possible. Point décisif : persistance et apparition d\'un contingent solide.');
    if (o.densite === 'mixte') add('malin', 'Mixte : le plus suspect des trois. Point décisif : taille/croissance de la composante solide.');
    if (o.contours === 'lobules') add('malin', 'Lobulations : croissance anarchique, présentes dans 40 % des nodules malins.');
    if (o.contours === 'spicules') add('malin', 'Spiculations : VPP d\'environ 90 %, mais possibles dans la granulomatose avec polyangéite (Wegener) et la pneumonie organisée.');
    if (o.graisse && +o.calcif === 4) add('benin', 'Hamartochondrome : amas graisseux internes de densité < -40 UH et calcifications en pop-corn.');
    else if (o.graisse) add('benin', 'Amas graisseux internes de densité < -40 UH : hamartochondrome (analyser en filtre standard).');
    if (CALCIF[o.calcif] && !(o.graisse && +o.calcif === 4)) add(CALCIF[o.calcif].sens, CALCIF[o.calcif].texte);
    if (o.bronchogramme) add('malin', 'Bronchogramme aérique dans 30 % des nodules malins contre 5 % des bénins. Différentiel : pneumonie organisée.');
    if (o.excavation === 'epaisse') add('malin', 'Excavation : paroi > 15 mm associée à une malignité dans 95 % des cas.');
    if (o.excavation === 'fine') add('neutre', 'Excavation : mesurer l\'épaisseur de la paroi (paroi > 15 mm associée à une malignité dans 95 % des cas).');
    const t = num(o.taille);
    if (t != null && t > 8 && o.densite === 'solide') add('neutre', 'TEP-scan recommandé pour un nodule solide > 8 mm.');
    const benin = l.some(x => x.sens === 'benin'), malin = l.some(x => x.sens === 'malin');
    const classement = benin && !malin ? 'benin' : malin ? 'suspect' : 'indetermine';
    return { liste: l, classement };
  }

  /* Entraînement : réglages du dessin (fiches/poumon/nodule-svg.js) et réponse */
  const CAS = [
    { dessin: { densite: 'solide', contours: 'reguliers', graisse: true, calcif: 4, fenetre: 'mediastin', graine: 5 }, rep: 'benin', texte: 'Amas graisseux < -40 UH et calcifications en pop-corn : hamartochondrome.' },
    { dessin: { densite: 'solide', contours: 'spicules', graine: 8 }, rep: 'suspect', texte: 'Spiculations : VPP d\'environ 90 %.' },
    { dessin: { densite: 'solide', contours: 'reguliers', calcif: 3, fenetre: 'mediastin', graine: 9 }, rep: 'benin', texte: 'Type 3 : strates concentriques.' },
    { dessin: { densite: 'solide', contours: 'lobules', excavation: 'epaisse', graine: 12 }, rep: 'suspect', texte: 'Excavation : paroi > 15 mm associée à une malignité dans 95 % des cas.' },
    { dessin: { densite: 'solide', contours: 'reguliers', calcif: 5, fenetre: 'mediastin', graine: 14 }, rep: 'suspect', texte: 'Calcifications suspectes : excentrées (type 5).' },
    { dessin: { densite: 'mixte', contours: 'reguliers', graine: 16 }, rep: 'suspect', texte: 'Mixte : le plus suspect des trois ; 80-90 % des nodules mixtes < 20 mm sont des adénocarcinomes.' },
    { dessin: { densite: 'solide', contours: 'reguliers', calcif: 2, fenetre: 'mediastin', graine: 18 }, rep: 'benin', texte: 'Type 2 : nidus central.' },
    { dessin: { densite: 'solide', contours: 'lobules', bronchogramme: true, graine: 20 }, rep: 'suspect', texte: 'Bronchogramme aérique dans 30 % des nodules malins contre 5 % des bénins.' },
  ];

  return { fleischner, tempsDoublement, arguments: argumentsNodule, CALCIF, CAS };
});
