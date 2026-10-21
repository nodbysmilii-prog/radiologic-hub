/* =========================================================
   RadiologicHub — SEP : critères IRM de McDonald 2017
   ---------------------------------------------------------
   D'après la fiche « Sclérose en plaques (SEP) — imagerie » de l'auteur :
   • dissémination dans l'espace (DIS) : au moins une lésion dans 2 des
     4 localisations typiques (juxtacorticale ou corticale,
     périventriculaire, infratentorielle, médullaire) ;
   • dissémination dans le temps (DIT) : lésions avec ET sans
     rehaussement simultanées, OU nouvelle lésion sur une IRM de suivi,
     OU bandes oligoclonales dans le LCR (remplacent la DIT après un
     premier événement clinique, CIS).
   Outil d'enseignement : le diagnostic reste clinique (tableau
   évocateur, autres diagnostics écartés).
   Module sans dépendance au navigateur (testé sous Node :
   tests/mcdonald.test.js). À FAIRE VÉRIFIER MÉDICALEMENT.
   ========================================================= */

(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.RHRegles = root.RHRegles || {}).mcdonald = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const LOCALISATIONS = {
    juxtacorticale: 'juxtacorticale ou corticale',
    periventriculaire: 'périventriculaire',
    infratentorielle: 'infratentorielle',
    medullaire: 'médullaire',
  };

  /* e = { lieux: ['periventriculaire', …], gdSimultane, nouvelleLesion, bandes, premierEvenement } */
  function evaluer(e) {
    const lieux = [...new Set((e.lieux || []).filter(l => l in LOCALISATIONS))];
    const dis = lieux.length >= 2;
    const parGd = !!e.gdSimultane, parSuivi = !!e.nouvelleLesion;
    const parBandes = !!e.bandes && !!e.premierEvenement;
    const dit = parGd || parSuivi || parBandes;
    const raisonsDit = [
      parGd && 'lésions avec et sans rehaussement sur la même IRM',
      parSuivi && 'nouvelle lésion sur l\'IRM de suivi',
      parBandes && 'bandes oligoclonales dans le LCR (premier événement clinique)',
    ].filter(Boolean);
    let conclusion;
    if (dis && dit) conclusion = 'DIS et DIT démontrées : critères de McDonald 2017 remplis, à confronter à la clinique.';
    else if (dis) conclusion = 'DIS démontrée, DIT non démontrée : IRM de suivi (nouvelle lésion) ou recherche de bandes oligoclonales.';
    else if (dit) conclusion = 'DIT démontrée, DIS non démontrée : il faut une lésion dans au moins 2 des 4 localisations.';
    else conclusion = 'Ni DIS ni DIT démontrées.';
    return {
      dis, dit, criteres: dis && dit, nbLieux: lieux.length,
      lieux: lieux.map(l => LOCALISATIONS[l]), raisonsDit,
      bandesSansCis: !!e.bandes && !e.premierEvenement,
      conclusion,
    };
  }

  return { LOCALISATIONS, evaluer };
});
