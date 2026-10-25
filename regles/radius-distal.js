/* =========================================================
   RadiologicHub — Fractures de l'extrémité distale du radius :
   l'alignement est-il acceptable ? (seuils de l'AAOS)
   ---------------------------------------------------------
   Seuils qui orientent vers une fixation chez le patient de moins de 65 ans :
   • raccourcissement radial > 3 mm ;
   • bascule dorsale > 10° (inclinaison sagittale < −10°) ;
   • marche d'escalier ou diastasis articulaire > 2 mm.
   Après 65 ans, la fixation n'améliore pas les résultats à long terme : les
   seuils sont donnés à titre indicatif.
   Valeurs normales : inclinaison radiale ≈ 22°, hauteur radiale ≈ 11 mm,
   inclinaison palmaire ≈ 11°.
   Module sans dépendance au navigateur (testé sous Node : tests/fractures-radius-distal.test.js).
   ========================================================= */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.RHRegles = root.RHRegles || {}).radiusDistal = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const num = v => { const n = parseFloat(String(v ?? '').replace(',', '.')); return Number.isFinite(n) ? n : null; };
  const fr = n => String(Math.round(n * 10) / 10).replace('.', ',');
  const NORMALES = { inclinaisonRadiale: 22, hauteurRadiale: 11, inclinaisonPalmaire: 11 };
  const SEUILS = { raccourcissement: 3, basculeDorsale: 10, marche: 2, age: 65 };

  /* entree : { sagittale (° : + palmaire, − dorsale), raccourcissement (mm), marche (mm), age (ans) } */
  function evaluer(entree = {}) {
    const s = num(entree.sagittale), r = num(entree.raccourcissement), m = num(entree.marche), age = num(entree.age);
    const criteres = [];
    if (s != null) criteres.push({ id: 'sagittale', nom: 'Inclinaison sagittale', valeur: s < 0 ? `bascule dorsale ${fr(-s)}°` : `inclinaison palmaire ${fr(s)}°`, seuil: 'bascule dorsale > 10°', depasse: s < -SEUILS.basculeDorsale });
    if (r != null) criteres.push({ id: 'raccourcissement', nom: 'Raccourcissement radial', valeur: `${fr(r)} mm`, seuil: '> 3 mm', depasse: r > SEUILS.raccourcissement });
    if (m != null) criteres.push({ id: 'marche', nom: 'Surface articulaire', valeur: m === 0 ? 'congruente' : `marche ou diastasis de ${fr(m)} mm`, seuil: '> 2 mm', depasse: m > SEUILS.marche });
    if (!criteres.length) return { criteres, complet: false, depasses: [], conclusion: '' };
    const depasses = criteres.filter(c => c.depasse);
    const ageNote = age != null && age >= SEUILS.age ? ' Après 65 ans, la fixation n\'améliore pas les résultats à long terme : seuils indicatifs.' : '';
    const conclusion = depasses.length
      ? `Seuil${depasses.length > 1 ? 's' : ''} de fixation atteint${depasses.length > 1 ? 's' : ''} (AAOS, moins de 65 ans) : ${depasses.map(c => c.nom.toLowerCase()).join(', ')}.${ageNote}`
      : `Alignement dans les limites acceptables (seuils de l'AAOS).${ageNote}`;
    return { criteres, complet: criteres.length === 3, depasses, conclusion };
  }

  return { evaluer, NORMALES, SEUILS };
});
