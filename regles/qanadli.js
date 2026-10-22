/* =========================================================
   RadiologicHub — Embolie pulmonaire : index d'obstruction de Qanadli
   ---------------------------------------------------------
   Qanadli SD, El Hajjam M, Vieillard-Baron A, et al. New CT index to
   quantify arterial obstruction in pulmonary embolism: comparison with
   angiographic index and echocardiography. AJR Am J Roentgenol.
   2001;176(6):1415-20. doi:10.2214/ajr.176.6.1761415
   • 10 artères segmentaires par poumon (3 lobe supérieur, 2 lobe moyen /
     lingula, 5 lobe inférieur), soit 20 au total ;
   • chaque artère segmentaire : 0 (perméable), 1 (obstruction partielle),
     2 (obstruction totale) ; un embole sous-segmentaire compte comme une
     obstruction partielle de l'artère segmentaire correspondante ;
   • un embole proximal (tronc, artère pulmonaire, artère lobaire) compte
     pour toutes les artères segmentaires d'aval ;
   • index = somme / 40 × 100 (%) ; un index ≥ 40 % est associé à une
     dilatation du ventricule droit (étude d'origine).
   Segments nommés selon Boyden.
   Module sans dépendance au navigateur (testé sous Node :
   tests/qanadli.test.js). À FAIRE VÉRIFIER MÉDICALEMENT.
   ========================================================= */

(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.RHRegles = root.RHRegles || {}).qanadli = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* Lobes et artères segmentaires (Boyden) */
  const LOBES = [
    { id: 'lsd', cote: 'D', nom: 'lobe supérieur droit', segments: [['d1', 'apical'], ['d2', 'postérieur'], ['d3', 'antérieur']] },
    { id: 'lm', cote: 'D', nom: 'lobe moyen', segments: [['d4', 'latéral'], ['d5', 'médial']] },
    { id: 'lid', cote: 'D', nom: 'lobe inférieur droit', segments: [['d6', 'apical (Nelson)'], ['d7', 'médio-basal'], ['d8', 'antéro-basal'], ['d9', 'latéro-basal'], ['d10', 'postéro-basal']] },
    { id: 'lsg', cote: 'G', nom: 'lobe supérieur gauche', segments: [['g1', 'apical'], ['g2', 'postérieur'], ['g3', 'antérieur']] },
    { id: 'ling', cote: 'G', nom: 'lingula', segments: [['g4', 'lingulaire supérieur'], ['g5', 'lingulaire inférieur']] },
    { id: 'lig', cote: 'G', nom: 'lobe inférieur gauche', segments: [['g6', 'apical (Nelson)'], ['g7', 'médio-basal'], ['g8', 'antéro-basal'], ['g9', 'latéro-basal'], ['g10', 'postéro-basal']] },
  ];
  const SEGMENTS = LOBES.flatMap(l => l.segments.map(([id, nom]) => ({ id, nom, lobe: l.id, cote: l.cote })));
  const PROXIMAUX = {
    tronc: { nom: 'tronc de l\'artère pulmonaire', niveau: 'proximale', lobes: LOBES.map(l => l.id) },
    apd: { nom: 'artère pulmonaire droite', niveau: 'proximale', lobes: ['lsd', 'lm', 'lid'] },
    apg: { nom: 'artère pulmonaire gauche', niveau: 'proximale', lobes: ['lsg', 'ling', 'lig'] },
    ...Object.fromEntries(LOBES.map(l => [l.id, { nom: `artère lobaire du ${l.nom}`.replace('du lingula', 'de la lingula'), niveau: 'lobaire', lobes: [l.id] }])),
  };
  const RANG = { proximale: 3, lobaire: 2, segmentaire: 1, 'sous-segmentaire': 0 };

  /* entree : { proximaux: { tronc: 0|1|2, apd, apg, lsd… }, segments: { d1: 0|1|2|'s' … } }
     's' = embole sous-segmentaire (compte 1) */
  function evaluer(entree = {}) {
    const prox = entree.proximaux || {}, seg = entree.segments || {};
    const points = {}, niveaux = { D: null, G: null };
    const noter = (cote, niveau) => { if (!niveaux[cote] || RANG[niveau] > RANG[niveaux[cote]]) niveaux[cote] = niveau; };
    SEGMENTS.forEach(s => {
      const v = seg[s.id];
      points[s.id] = v === 's' ? 1 : Math.max(0, Math.min(2, +v || 0));
      if (v === 's') noter(s.cote, 'sous-segmentaire');
      else if (points[s.id]) noter(s.cote, 'segmentaire');
    });
    Object.entries(prox).forEach(([k, v]) => {
      const p = PROXIMAUX[k], o = Math.max(0, Math.min(2, +v || 0));
      if (!p || !o) return;
      SEGMENTS.filter(s => p.lobes.includes(s.lobe)).forEach(s => {
        points[s.id] = Math.max(points[s.id], o);
        noter(s.cote, p.niveau);
      });
    });
    const score = SEGMENTS.reduce((t, s) => t + points[s.id], 0);
    const index = Math.round(score / 40 * 1000) / 10;
    const cotes = ['D', 'G'].filter(c => niveaux[c]);
    return { score, max: 40, index, points, niveaux, cotes, embolie: score > 0, severe: index >= 40 };
  }

  const nombre = n => String(n).replace('.', ',');

  /* Phrase de résultat et conclusion */
  function texte(r) {
    return `Index d'obstruction artérielle pulmonaire de Qanadli : ${r.score}/40, soit ${nombre(r.index)} %${r.severe ? ' (≥ 40 %)' : ''}.`;
  }
  function conclusion(r) {
    if (!r.embolie) return 'Absence d\'embolie pulmonaire.';
    const cote = r.cotes.length === 2 ? 'bilatérale' : r.cotes[0] === 'D' ? 'droite' : 'gauche';
    const plus = r.cotes.map(c => r.niveaux[c]).sort((a, b) => RANG[b] - RANG[a])[0];
    return `Embolie pulmonaire ${cote} ${plus}, index d'obstruction de Qanadli à ${nombre(r.index)} % (${r.score}/40).`;
  }

  return { LOBES, SEGMENTS, PROXIMAUX, evaluer, texte, conclusion };
});
