/* =========================================================
   RadiologicHub — Suivi oncologique : SEUILS DE CALCUL
   ---------------------------------------------------------
   ► Fichier à faire vérifier par un radiologue.
   ► Toute modification ici change les calculs : mettre à jour
     les tests (tests/*.test.js) et le README dans le même commit.

   Références :
   • RECIST 1.1 — Eisenhauer EA et al. New response evaluation
     criteria in solid tumours: revised RECIST guideline (version 1.1).
     Eur J Cancer 2009;45:228-247.
   • Lugano 2014 — Cheson BD et al. Recommendations for initial
     evaluation, staging, and response assessment of Hodgkin and
     non-Hodgkin lymphoma: the Lugano classification.
     J Clin Oncol 2014;32:3059-3068.

   Toutes les longueurs sont en millimètres, sauf la rate (cm).
   ========================================================= */

(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.RHSuivi = root.RHSuivi || {}).seuils = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  return Object.freeze({
    /* ---------------- RECIST 1.1 ---------------- */
    recist: Object.freeze({
      maxCibles: 5,               // lésions cibles au total
      maxCiblesParOrgane: 2,      // lésions cibles par organe
      lesionMesurableMinMm: 10,   // lésion non ganglionnaire mesurable : plus grand diamètre ≥ 10 mm (TDM)
      ganglionCibleMinMm: 15,     // ganglion : petit axe ≥ 15 mm → pathologique mesurable (cible possible)
      ganglionPathoMinMm: 10,     // ganglion : 10 mm ≤ petit axe < 15 mm → pathologique non mesurable (non-cible)
                                  //            petit axe < 10 mm → normal (non suivi)
      tropPetiteMm: 5,            // lésion présente mais trop petite pour être mesurée : 5 mm par défaut
      disparueMm: 0,              // lésion disparue : 0 mm
      rpBaisseMinPct: 30,         // réponse partielle : baisse ≥ 30 % de la somme / baseline
      pdHausseMinPct: 20,         // progression : hausse ≥ 20 % de la somme / nadir …
      pdHausseMinMm: 5,           // … ET hausse absolue ≥ 5 mm
      rcGanglionMaxMm: 10,        // réponse complète : chaque ganglion cible < 10 mm (petit axe)
    }),

    /* ---------------- Lugano 2014 (Cheson) ---------------- */
    lugano: Object.freeze({
      maxCibles: 6,               // lésions cibles (ganglions et sites extraganglionnaires)
      ganglionMesurableLdiMm: 15, // ganglion mesurable : grand diamètre (LDi) > 15 mm
      extraMesurableLdiMm: 10,    // lésion extraganglionnaire mesurable : LDi > 10 mm
      tropPetiteMm: 5,            // lésion trop petite pour être mesurée : 5 × 5 mm par défaut
      disparueMm: 0,              // lésion disparue : 0 × 0 mm
      rpBaisseSpdMinPct: 50,      // réponse partielle : baisse ≥ 50 % de la SPD / baseline
      rcGanglionLdiMaxMm: 15,     // réponse complète (TDM) : ganglions cibles LDi ≤ 15 mm, extraganglionnaire disparu
      pdLdiMinMm: 15,             // progression d'une lésion : LDi > 15 mm …
      pdHaussePpdMinPct: 50,      // … ET PPD ≥ +50 % / nadir …
      pdPetiteLesionMaxMm: 20,    // … ET hausse du LDi ou du SDi / nadir ≥ 5 mm si lésion ≤ 2 cm,
      pdHausseDiamPetiteMm: 5,    //     ≥ 10 mm si lésion > 2 cm
      pdHausseDiamGrandeMm: 10,
      rateNormaleMaxCm: 13,       // splénomégalie : longueur crânio-caudale > 13 cm
      ratePdFractionExces: 0.5,   // splénomégalie connue : progression si hausse > 50 % de l'excès au-delà de 13 cm
      ratePdNouvelleMinCm: 2,     // pas de splénomégalie initiale : progression si hausse ≥ 2 cm
      deauvilleRcMax: 3,          // TEP : Deauville 1–3 = réponse métabolique complète
    }),

    /* ---------------- Contrôles anti-erreur ---------------- */
    controles: Object.freeze({
      variationMaxRatio: 2,       // « faute de frappe ? » si la mesure est plus du double de la précédente …
      variationMinRatio: 1 / 3,   // … ou moins du tiers
    }),
  });
});
