/* =========================================================
   RadiologicHub — Myocardite : critères IRM de Lake Louise 2018
   ---------------------------------------------------------
   Ferreira VM, Schulz-Menger J, Holmvang G, et al. Cardiovascular
   Magnetic Resonance in Nonischemic Myocardial Inflammation: Expert
   Recommendations. J Am Coll Cardiol. 2018;72(24):3158-76.
   doi:10.1016/j.jacc.2018.09.072
   • au moins un critère T2 (œdème) ET au moins un critère T1 (lésion :
     hyperhémie, nécrose, fibrose) → inflammation myocardique ;
   • un seul type de critère : peut soutenir le diagnostic dans un contexte
     clinique évocateur, avec une spécificité moindre ;
   • critères de soutien : péricarde (épanchement, hypersignal) et
     dysfonction systolique du VG ;
   • IRM de contrôle à 1-2 semaines si un seul critère, ou aucun critère
     avec un tableau clinique très évocateur (fiche du service).
   Mnémotechnique de la fiche : le myocarde doit être « Trempé » (T2) ET
   « Touché » (T1).
   Module sans dépendance au navigateur (testé sous Node :
   tests/myocardite.test.js). À FAIRE VÉRIFIER MÉDICALEMENT.
   ========================================================= */

(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.RHRegles = root.RHRegles || {}).lakeLouise = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const CRITERES = {
    t2: [
      { id: 't2-regional', label: 'Hypersignal T2 régional' },
      { id: 't2-global', label: 'Hypersignal T2 global (ratio myocarde / muscle squelettique ≥ 2,0)' },
      { id: 't2-mapping', label: 'T2 allongé en cartographie T2 (régional ou global)' },
    ],
    t1: [
      { id: 't1-mapping', label: 'T1 natif allongé en cartographie T1 (régional ou global)' },
      { id: 'ecv', label: 'Volume extracellulaire (ECV) augmenté' },
      { id: 'lge', label: 'Rehaussement tardif de distribution non ischémique' },
    ],
    support: [
      { id: 'pericarde', label: 'Épanchement péricardique ou hypersignal du péricarde' },
      { id: 'cinetique', label: 'Trouble de la cinétique / dysfonction systolique du VG' },
    ],
  };
  const FAMILLE = {};
  Object.keys(CRITERES).forEach(f => CRITERES[f].forEach(c => { FAMILLE[c.id] = f; }));

  /* coches : identifiants cochés (tableau ou Set) ; options.tresEvocateur :
     tableau clinique très évocateur ou symptômes très récents */
  function evaluer(coches, options = {}) {
    const ids = [...new Set(coches || [])].filter(id => FAMILLE[id]);
    const n = f => ids.filter(id => FAMILLE[id] === f).length;
    const t2 = n('t2'), t1 = n('t1'), support = n('support');
    let niveau, titre, texte, controle = false;
    if (t2 && t1) {
      niveau = 'positif';
      titre = 'Critères de Lake Louise remplis';
      texte = 'Au moins un critère T2 et au moins un critère T1 : aspect en faveur d\'une inflammation myocardique (myocardite), avec la meilleure spécificité.';
    } else if (t2 || t1) {
      niveau = 'possible';
      controle = true;
      titre = t2 ? 'Œdème sans critère T1' : 'Critère T1 sans œdème';
      texte = (t2
        ? 'Un seul type de critère (T2) : peut soutenir une inflammation myocardique dans un contexte évocateur, avec une spécificité moindre.'
        : 'Un seul type de critère (T1) : lésion sans œdème, inflammation active ou séquelle (fibrose) ; spécificité moindre.')
        + ' IRM de contrôle à 1-2 semaines.';
    } else {
      niveau = 'negatif';
      controle = !!options.tresEvocateur;
      titre = 'Pas de critère de Lake Louise';
      texte = options.tresEvocateur
        ? 'Aucun critère, mais tableau clinique très évocateur : IRM de contrôle à 1-2 semaines.'
        : 'Pas d\'argument IRM pour une inflammation myocardique.';
    }
    if (support && niveau !== 'negatif') texte += ` ${support === 1 ? 'Un critère' : 'Deux critères'} de soutien (péricarde, fonction VG) renforce${support === 1 ? '' : 'nt'} le diagnostic.`;
    else if (support) texte += ' Les critères de soutien seuls (péricarde, fonction VG) ne suffisent pas.';
    return { t2, t1, support, niveau, titre, texte, controle };
  }

  /* Phrase de conclusion pour le compte rendu */
  function conclusion(r) {
    if (r.niveau === 'positif') return 'Aspect IRM en faveur d\'une myocardite (critères de Lake Louise 2018 remplis : au moins un critère T2 et un critère T1).';
    if (r.niveau === 'possible') return `Critères de Lake Louise 2018 incomplets (${r.t2 ? 'critère T2 isolé' : 'critère T1 isolé'}) : myocardite possible dans un contexte clinique évocateur ; IRM de contrôle à 1-2 semaines à discuter.`;
    return r.controle
      ? 'Pas de critère IRM de myocardite (Lake Louise 2018) ; devant un tableau clinique très évocateur, IRM de contrôle à 1-2 semaines à discuter.'
      : 'Pas de critère IRM de myocardite (Lake Louise 2018).';
  }

  return { CRITERES, FAMILLE, evaluer, conclusion };
});
