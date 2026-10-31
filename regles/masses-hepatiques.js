/* © RadiologicHub — tous droits réservés. Reproduction, copie ou réutilisation interdites sans autorisation écrite de l'auteur. */
/* =========================================================
   RadiologicHub — fiche « Masses hépatiques solides » (fiches/masses-hepatiques.html) :
   données et petits calculs repris de la fiche condensée de l'auteur (lexique inchangé)
   ---------------------------------------------------------
   • lirads(...)        : tableau « Critères LR-3 / LR-4 / LR-5 selon taille et HRPA » ;
   • CATEGORIES_LIRADS  : LR-NC à LR-TIV et conduite à retenir (LR-1 à LR-5) ;
   • hnf(...)           : « HNF typique : cinq critères majeurs » ;
   • CONTEXTES          : étape 2 de la CAT devant une lésion focale hyperéchogène ;
   • BISMUTH            : classification de Bismuth et Corlette (texte de la fiche) ;
   • LESIONS, CHOIX, CAS : tableau final de reconnaissance et entraînement « Quelle lésion ? ».
   Module sans dépendance au navigateur (tests/masses-hepatiques.test.js).
   ========================================================= */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.RHRegles = root.RHRegles || {}).massesHepatiques = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const num = v => { const n = parseFloat(String(v ?? '').replace(',', '.')); return Number.isFinite(n) ? n : null; };

  /* ---------- LI-RADS : catégories ---------- */
  const CATEGORIES_LIRADS = {
    'LR-NC': { sens: 'Non classé (imagerie de mauvaise qualité ou incomplète)', niveau: 'ddx' },
    'LR-1': { sens: 'Certainement bénin', retenir: 'Écho de surveillance à 6 mois', niveau: 'sign' },
    'LR-2': { sens: 'Probablement bénin', retenir: 'Écho à 6 mois ± TDM/IRM ≤6 mois', niveau: 'sign' },
    'LR-3': { sens: 'Probabilité intermédiaire de malignité', retenir: 'TDM/IRM à 3–6 mois', niveau: 'key' },
    'LR-4': { sens: 'CHC probable', retenir: 'Discussion multidisciplinaire ± biopsie / imagerie rapprochée', niveau: 'key' },
    'LR-5': { sens: 'CHC certain', retenir: 'Diagnostic de CHC → prise en charge', niveau: 'grave' },
    'LR-M': { sens: 'Probablement ou certainement malin, mais non spécifique de CHC', niveau: 'grave' },
    'LR-TIV': { sens: 'Envahissement tumoral endoveineux', niveau: 'grave' },
  };

  /* Critères majeurs (note du tableau) : capsule se rehaussant, lavage (wash-out) non périphérique,
     croissance supérieure au seuil de progression. */
  const CRITERES_MAJEURS = [
    { id: 'capsule', label: 'Capsule se rehaussant' },
    { id: 'washout', label: 'Lavage (wash-out) non périphérique' },
    { id: 'croissance', label: 'Croissance supérieure au seuil de progression' },
  ];

  /* Colonnes du tableau : pas de HRPA (< 20, ≥ 20) ; HRPA non périphérique (< 10, 10-19, ≥ 20) ;
     lignes : aucun critère majeur, un critère majeur, ≥ deux critères majeurs. */
  const TABLE_LIRADS = {
    sans: { '<20': ['LR-3', 'LR-3', 'LR-4'], '>=20': ['LR-3', 'LR-4', 'LR-4'] },
    hrpa: { '<10': ['LR-3', 'LR-4', 'LR-4'], '10-19': ['LR-3', 'LR-4', 'LR-5'], '>=20': ['LR-4', 'LR-4 à LR-5*', 'LR-5'] },
  };

  function colonne(taille, hrpa) {
    if (hrpa) return taille < 10 ? '<10' : taille < 20 ? '10-19' : '>=20';
    return taille < 20 ? '<20' : '>=20';
  }

  /* lirads(taille en mm, hrpa non périphérique ?, critères majeurs cochés) */
  function lirads(taille, hrpa, criteres) {
    const t = num(taille);
    if (t === null || t <= 0) return null;
    const coches = (criteres || []).filter(c => CRITERES_MAJEURS.some(m => m.id === c));
    const n = new Set(coches).size;
    const col = colonne(t, !!hrpa);
    const ligne = Math.min(n, 2);
    let cat = TABLE_LIRADS[hrpa ? 'hrpa' : 'sans'][col][ligne];
    // * LR-5 si un critère de croissance significative est associé, sinon LR-4
    let note = '';
    if (cat === 'LR-4 à LR-5*') {
      cat = coches.includes('croissance') ? 'LR-5' : 'LR-4';
      note = 'LR-5 si un critère de croissance significative est associé, sinon LR-4.';
    }
    return {
      categorie: cat, colonne: col, criteresMajeurs: n, note,
      sens: CATEGORIES_LIRADS[cat].sens, retenir: CATEGORIES_LIRADS[cat].retenir, niveau: CATEGORIES_LIRADS[cat].niveau,
    };
  }

  /* ---------- HNF typique : cinq critères majeurs ---------- */
  const CRITERES_HNF = [
    { id: 'semblable', label: 'Semblable au foie avant injection' },
    { id: 'homogene', label: 'Homogénéité' },
    { id: 'cicatrice', label: 'Élément central se rehaussant tardivement en scanner ou IRM' },
    { id: 'rehaussement', label: 'Rehaussement intense sans lavage' },
    { id: 'lobules', label: 'Contours lobulés' },
  ];

  /* Ces critères sont valables en l'absence d'hépatopathie sous-jacente. */
  function hnf(coches, hepatopathie) {
    const n = (coches || []).filter(c => CRITERES_HNF.some(x => x.id === c));
    const nb = new Set(n).size;
    if (hepatopathie) {
      return { cle: 'hepatopathie', nb, niveau: 'grave', titre: 'Critères non applicables',
        texte: 'Ces critères sont valables en l\'absence d\'hépatopathie sous-jacente.' };
    }
    if (nb === CRITERES_HNF.length) {
      return { cle: 'typique', nb, niveau: 'sign', titre: 'HNF typique',
        texte: 'Si aspect formel : pas de traitement ; surveillance à un an possible puis très espacée.' };
    }
    return { cle: 'non', nb, niveau: 'key', titre: nb ? 'Aspect formel non réuni' : '',
      texte: nb ? 'Si l\'imagerie ne permet pas d\'affirmer une HNF, considérer la lésion comme suspecte d\'adénome ; discussion en RCP, biopsie ciblée ou traitement selon taille, nombre et risque.' : '' };
  }

  /* ---------- CAT devant une lésion focale hyperéchogène, étape 2 : contexte ---------- */
  const CONTEXTES = {
    sain: { nom: 'Foie sain, aucun cancer', niveau: 'sign', texte: 'Si petite lésion homogène, bien limitée, renforcement postérieur, sans Doppler : hémangiome typique. Si tous les critères sont réunis, l\'échographie peut suffire ; sinon IRM.' },
    steatose: { nom: 'Foie stéatosique', niveau: 'tech', texte: 'Un hémangiome peut devenir hypoéchogène : l\'hyperéchogénicité évoque plutôt graisse focale, adénome stéatosique, angiomyolipome ou lésion calcifiée ; IRM IP/OP et FatSat.' },
    risque: { nom: 'Hépatopathie chronique / foie à risque', niveau: 'grave', texte: 'Toute lésion est suspecte de CHC, même hyperéchogène ; rechercher hypervascularisation artérielle, wash-out, capsule et thrombus ; TDM/IRM multiphasique.' },
    cancer: { nom: 'Cancer connu', niveau: 'key', texte: 'Métastase jusqu\'à preuve du contraire, notamment colorectal si hyperéchogène ; rechercher multiplicité/halo et réaliser bilan multiphasique, idéalement IRM si petites lésions.' },
    contraception: { nom: 'Femme jeune sous contraception', niveau: 'ddx', texte: 'Adénome : hétérogénéité, graisse, sang, vascularisation périphérique, risque hémorragique. HNF si homogène, rayon de roue et cicatrice hyperT2.' },
  };

  /* ---------- Classification de Bismuth et Corlette ---------- */
  const BISMUTH = {
    I: { titre: 'Type I', texte: 'Tumeur limitée au canal hépatique commun, n\'atteignant pas la convergence biliaire.', atteint: ['chc'] },
    II: { titre: 'Type II', texte: 'Atteinte de la convergence biliaire principale, sans extension aux canaux secondaires.', atteint: ['chc', 'convergence'] },
    IIIa: { titre: 'Type IIIa', texte: 'Extension à la convergence et à un canal secondaire : IIIa droit.', atteint: ['chc', 'convergence', 'droit'] },
    IIIb: { titre: 'Type IIIb', texte: 'Extension à la convergence et à un canal secondaire : IIIb gauche.', atteint: ['chc', 'convergence', 'gauche'] },
    IV: { titre: 'Type IV', texte: 'Extension bilatérale aux canaux secondaires droit et gauche, ou tumeur multicentrique.', atteint: ['chc', 'convergence', 'droit', 'gauche'] },
  };

  /* ---------- Tableau final de reconnaissance ---------- */
  const CATEGORIES = { benigne: 'Tumeur bénigne', primitive: 'Tumeur maligne primitive', secondaire: 'Tumeur maligne secondaire', vasculaire: 'Tumeur vasculaire maligne rare' };
  const LESIONS = {
    hemangiome: { nom: 'Hémangiome', categorie: 'benigne', terrain: 'Foie sain ; très hyperT2', signe: 'Mottes périphériques, centripète, parallèle au sang, sans wash-out.' },
    hnf: { nom: 'HNF', categorie: 'benigne', terrain: 'Femme jeune ; cicatrice hyperT2', signe: 'Artériel homogène, iso portal, cicatrice tardive, sans capsule.' },
    adenome: { nom: 'Adénome', categorie: 'benigne', terrain: 'Contraception ; hétérogène', signe: 'Graisse/sang, artériel ± wash-out, capsule, risque hémorragique.' },
    aml: { nom: 'Angiomyolipome', categorie: 'benigne', terrain: 'Femme ; graisse macroscopique', signe: 'Triple composante graisseuse/solide/vasculaire ; vaisseaux centraux.' },
    chc: { nom: 'CHC', categorie: 'primitive', terrain: 'Foie à risque ; T2 variable', signe: 'Artériel + wash-out + capsule ; thrombose tumorale.' },
    fibrolamellaire: { nom: 'CHC fibrolamellaire', categorie: 'primitive', terrain: 'Jeune, foie sain ; cicatrice hypoT2', signe: 'Hétérogène, cicatrice calcifiée tardive, adénopathies possibles.' },
    cholangio: { nom: 'Cholangiocarcinome', categorie: 'primitive', terrain: 'T2/fibrose variables', signe: 'Progressif tardif, rétraction, engainement, dilatation biliaire.' },
    metastases: { nom: 'Métastases', categorie: 'secondaire', terrain: 'Cancer connu ; variables', signe: 'Multiples/bilobaires, restriction ; cinétique selon primitif.' },
    lymphome: { nom: 'Lymphome', categorie: 'secondaire', terrain: 'Contexte systémique ; T2 modéré', signe: 'Hypovasculaire homogène, ADC très bas, vaisseaux traversants.' },
  };
  const CHOIX = Object.fromEntries(Object.entries(LESIONS).map(([k, v]) => [k, v.nom]));

  /* ---------- Entraînement « Quelle lésion ? » ---------- */
  const CAS = [
    { texte: 'Femme sous contraception, foie sain. Lésion hétérogène (graisse, sang), hyperrehaussement artériel hétérogène, capsule possible. Douleur aiguë et hématome sous-capsulaire.', rep: 'adenome', pourquoi: 'Adénome : contraception, hétérogénéité, graisse/sang, capsule possible ; risques : hémorragie, rupture et transformation en CHC.' },
    { texte: 'Femme jeune, foie sain. Lésion homogène, hyperrehaussement artériel intense, précoce et homogène, iso au temps portal ; cicatrice centrale hyperT2 rehaussée tardivement ; ni capsule ni wash-out.', rep: 'hnf', pourquoi: 'HNF : rehaussement artériel intense sans lavage, cicatrice centrale hyperT2 rehaussée tardivement, sans capsule ni adénopathie.' },
    { texte: 'Foie sain. Rehaussement en mottes périphériques, progressif, centripète, parallèle au pool sanguin ; hyperT2 franc ; pas de wash-out.', rep: 'hemangiome', pourquoi: 'Hémangiome : les mottes périphériques, le parallélisme avec le pool sanguin, l\'hyperT2 franc et l\'absence de wash-out sécurisent le diagnostic.' },
    { texte: 'Cirrhose. Hyperrehaussement artériel non périphérique, wash-out portal/tardif, capsule tardive ; thrombose portale tumorale.', rep: 'chc', pourquoi: 'CHC : aspect typique = hyperrehaussement artériel non périphérique + wash-out + capsule tardive ; la thrombose portale tumorale est très évocatrice.' },
    { texte: 'Sujet jeune, foie non cirrhotique. Grosse masse unique, lobulée, bien limitée, AFP normale ; cicatrice centrale fibreuse hypoT2 calcifiée ; adénopathies.', rep: 'fibrolamellaire', pourquoi: 'CHC fibrolamellaire : cicatrice centrale hypoT2, souvent calcifiée ; DD principal : HNF, homogène avec cicatrice hyperT2, sans capsule ni adénopathie.' },
    { texte: 'Sujet autour de 60 ans. Masse périphérique volumineuse, lobulée, non encapsulée ; rétraction capsulaire, dilatation biliaire segmentaire, engainement des branches portes ; rehaussement progressif tardif.', rep: 'cholangio', pourquoi: 'Cholangiocarcinome intrahépatique : rétraction capsulaire, engainement vasculaire (et non extension endoluminale), dilatation biliaire segmentaire, rehaussement fibreux progressif tardif.' },
    { texte: 'Cancer colorectal connu. Nodules multiples, bilobaires, hypovasculaires, rehaussement périphérique persistant à la phase portale ; à l\'échographie, halo hypoéchogène en cocarde.', rep: 'metastases', pourquoi: 'Métastases : multiples/bilobaires ; l\'aspect le plus fréquent est hypovasculaire, avec rehaussement périphérique persistant et centre hypodense.' },
    { texte: 'Patient suivi pour un LMNH. Masses homogènes hypovasculaires, restriction très marquée, vaisseaux traversants et engainés mais perméables, splénomégalie.', rep: 'lymphome', pourquoi: 'Lymphome hépatique : hypovasculaire homogène, ADC très bas, vaisseaux traversants mais perméables, peu de thrombose ; confirmation histologique indispensable.' },
    { texte: 'Femme. Masse hyperéchogène hétérogène avec flux artériel ; graisse macroscopique, hypersignal T1 supprimé en FatSat sans chute spécifique IP/OP, vaisseaux centraux.', rep: 'aml', pourquoi: 'Angiomyolipome : tumeur à triple composante (graisse, vaisseaux, muscle lisse) ; graisse macroscopique, hypervascularisation persistante, vaisseaux centraux.' },
  ];

  return { lirads, CATEGORIES_LIRADS, CRITERES_MAJEURS, TABLE_LIRADS, CRITERES_HNF, hnf, CONTEXTES, BISMUTH, CATEGORIES, LESIONS, CHOIX, CAS };
});
