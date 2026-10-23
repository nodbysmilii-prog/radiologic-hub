/* =========================================================
   RadiologicHub — Cancer du cavum (nasopharynx) : classification TNM 8e édition
   ---------------------------------------------------------
   Définitions T et N : fiche de l'auteur (partie V), reformulées au minimum ; T4 (tissus mous au-delà du
   ptérygoïdien latéral, à la place de « fosse infratemporale »), N1 (rétropharyngés uni- ou bilatéraux) et
   « ≤ 6 cm » alignés sur la 8e édition, à la demande de l'auteur (23/10/2026).
   N0 et M0 / M1 : définitions usuelles (absentes de la fiche).
   Regroupement en stades : AJCC / UICC 8e édition (nasopharynx) :
     I    T1 N0 M0
     II   T1 N1 M0 ; T2 N0-N1 M0
     III  T1-T2 N2 M0 ; T3 N0-N2 M0
     IVA  T4 N0-N2 M0 ; tout T N3 M0
     IVB  tout T, tout N, M1
   Module sans dépendance au navigateur (testé sous Node : tests/cancer-du-cavum.test.js).
   ========================================================= */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.RHRegles = root.RHRegles || {}).tnmCavum = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const T = {
    T1: 'Tumeur du nasopharynx ± oropharynx / fosse nasale, sans extension parapharyngée.',
    T2: 'Extension parapharyngée et/ou aux tissus mous adjacents (ptérygoïdiens médial et latéral, muscles prévertébraux).',
    T3: 'Extension osseuse (base du crâne, vertèbres cervicales, ptérygoïde) et/ou aux cavités sinusiennes.',
    T4: 'Extension intracrânienne et/ou aux nerfs crâniens, hypopharynx, orbite, parotide, canal carotidien, foramen jugulaire, sinus caverneux, et/ou infiltration étendue des tissus mous au-delà de la face latérale du muscle ptérygoïdien latéral.',
  };
  const N = {
    N0: 'Pas d\'adénopathie régionale.',
    N1: 'Adénopathies cervicales unilatérales et/ou ganglions rétropharyngés uni- ou bilatéraux, ≤ 6 cm, au-dessus du bord inférieur du cricoïde.',
    N2: 'Adénopathies cervicales bilatérales ≤ 6 cm, au-dessus du bord inférieur du cricoïde.',
    N3: 'Adénopathies uni- ou bilatérales > 6 cm et/ou sous le bord inférieur du cricoïde.',
  };
  const M = { M0: 'Pas de métastase à distance.', M1: 'Métastase(s) à distance.' };

  function stade(t, n, m) {
    if (!(t in T) || !(n in N) || !(m in M)) return null;
    if (m === 'M1') return 'IVB';
    if (t === 'T4' || n === 'N3') return 'IVA';
    if (t === 'T3' || n === 'N2') return 'III';
    if (t === 'T2' || n === 'N1') return 'II';
    return 'I';
  }

  return { T, N, M, stade };
});
