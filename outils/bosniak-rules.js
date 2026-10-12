/* =========================================================
   Classification de Bosniak, version 2019 — règles du calculateur
   ---------------------------------------------------------
   Silverman SG, Pedrosa I, Ellis JH, et al. Bosniak Classification of
   Cystic Renal Masses, Version 2019: An Update Proposal and Needs
   Assessment. Radiology. 2019;292(2):475-488.
   doi:10.1148/radiol.2019182646

   Règles appliquées DANS CET ORDRE (la première qui s'applique décide) :
     a. tissu rehaussé > 25 % du volume → hors Bosniak (masse solide) ;
        lésion infectieuse, inflammatoire, vasculaire ou syndrome
        héréditaire → hors Bosniak ;
     b. IV  : protrusion rehaussée ≥ 4 mm à angle obtus, ou à angle aigu
              (quelle que soit sa taille) ;
     c. III : paroi ou cloison rehaussée ≥ 4 mm, ou protrusion rehaussée
              ≤ 3 mm à angle obtus ;
     d. IIF : paroi lisse de 3 mm rehaussée, cloison lisse de 3 mm
              rehaussée, ≥ 4 cloisons fines rehaussées, ou (IRM)
              hypersignal T1 avec saturation de la graisse hétérogène ;
     e. II  : 1 à 3 cloisons fines, calcifications de tout type, ou forme
              homogène (TDM sans injection −9 à 20 UH ou ≥ 70 UH ; > 20 UH
              sans rehaussement ; 21 à 30 UH au temps portal ; trop petite
              pour être caractérisée ; IRM sans injection hypersignal T2
              ≈ LCR ; hypersignal T1 ≥ 2,5 × rein) ;
     f. I   : paroi ≤ 2 mm, liquide homogène −9 à 20 UH (ou signal du LCR
              en IRM, avec injection), ni cloison ni calcification.
   Le rehaussement d'une paroi, d'une cloison ou d'une protrusion ne
   s'évalue qu'avec injection. Seuils du rehaussement mesuré (delta) :
   constante REHAUSSEMENT.

   Module sans dépendance au navigateur (testé sous Node :
   tests/bosniak.test.js). Outil d'enseignement, À FAIRE VÉRIFIER
   MÉDICALEMENT.
   ========================================================= */

(function (racine) {
  'use strict';

  /* Rehaussement mesuré (densité au temps portal − densité sans injection), en UH :
     ≥ franc → rehaussement ; equivoque à franc − 1 → équivoque (IRM conseillée) ; < equivoque → absent */
  const REHAUSSEMENT = { franc: 20, equivoque: 10 };

  /* Entrées du formulaire et leurs choix [valeur, libellé] */
  const OUI_NON = [['oui', 'Oui'], ['non', 'Non']];
  const EPAISSEURS = [['<=2', '≤ 2 mm'], ['3', '3 mm'], ['>=4', '≥ 4 mm']];
  const CHOIX = {
    modalite: [['tdm', 'TDM'], ['irm', 'IRM']],
    injection: OUI_NON,
    tissu: OUI_NON,
    exclusion: OUI_NON,
    paroi: EPAISSEURS,
    paroiRehaussee: OUI_NON,
    cloisons: [['0', '0'], ['1-3', '1 à 3'], ['>=4', '≥ 4']],
    cloisonsEpaisseur: EPAISSEURS,
    cloisonsRehaussees: OUI_NON,
    protrusion: [['aucune', 'Aucune'], ['obtus<=3', '≤ 3 mm, angle obtus'], ['obtus>=4', '≥ 4 mm, angle obtus'], ['aigu', 'Angle aigu (toute taille)']],
    protrusionRehaussee: OUI_NON,
    calcifications: [['aucune', 'Aucune'], ['fines', 'Fines'], ['epaisses', 'Épaisses ou nodulaires']],
    t2Lcr: OUI_NON,
    t1Hyper: OUI_NON,
    t1FsHetero: OUI_NON,
    tropPetite: OUI_NON,
  };
  /* Valeurs de départ : kyste à paroi fine, sans cloison, scanner injecté ; densités à saisir */
  const DEFAUT = {
    modalite: 'tdm', injection: 'oui', tissu: 'non', exclusion: 'non',
    paroi: '<=2', paroiRehaussee: 'non', cloisons: '0', cloisonsEpaisseur: '<=2', cloisonsRehaussees: 'non',
    protrusion: 'aucune', protrusionRehaussee: 'non', calcifications: 'aucune',
    uhSans: '', uhPortal: '', delta: '', t2Lcr: 'non', t1Hyper: 'non', t1FsHetero: 'non', tropPetite: 'non',
  };

  const CONDUITE = {
    I: 'Bénin : pas de suivi.',
    II: 'Bénin : pas de suivi.',
    IIF: 'Contrôle à 6 et 12 mois, puis annuel jusqu\'à 5 ans.',
    III: 'Malignité intermédiaire : chirurgie ou surveillance active selon l\'âge et les comorbidités.',
    IV: 'Malignité jusqu\'à 90 % : avis urologique.',
  };
  const CONSEIL = {
    equivoque: 'Rehaussement équivoque : IRM conseillée.',
    calcifEpaisses: 'Calcification épaisse ou nodulaire : IRM conseillée avant de classer.',
    hyperdense: 'Kyste hyperdense de plus de 3 cm à développement endophytique : IRM recommandée.',
    irmIIF: 'Une IRM est possible avant le premier contrôle : elle reclasse une partie des IIF du scanner en III.',
    biopsie: 'Éviter la biopsie d\'une tumeur kystique, sauf composante tissulaire solide significative.',
  };

  const num = v => { if (v === '' || v == null) return null; const n = parseFloat(String(v).replace(',', '.').replace('−', '-')); return Number.isFinite(n) ? n : null; };
  const entre = (x, a, b) => x != null && x >= a && x <= b;

  /* Rehaussement du contenu au scanner : delta saisi, sinon portal − sans injection */
  function rehaussementMesure(e) {
    if (e.modalite !== 'tdm' || e.injection !== 'oui') return { delta: null, niveau: null };
    let delta = num(e.delta);
    if (delta == null && num(e.uhSans) != null && num(e.uhPortal) != null) delta = num(e.uhPortal) - num(e.uhSans);
    if (delta == null) return { delta: null, niveau: null };
    const niveau = delta >= REHAUSSEMENT.franc ? 'franc' : delta >= REHAUSSEMENT.equivoque ? 'equivoque' : 'absent';
    return { delta, niveau };
  }

  function classer(entrees) {
    const e = { ...DEFAUT, ...(entrees || {}) };
    const tdm = e.modalite === 'tdm', irm = e.modalite === 'irm', inj = e.injection === 'oui';
    const rh = v => inj && v === 'oui';                          // rehaussement évaluable seulement avec injection
    const avecCloisons = e.cloisons !== '0';
    const R = rehaussementMesure(e);
    const sans = tdm ? num(e.uhSans) : null, portal = tdm && inj ? num(e.uhPortal) : null;
    const conseils = [];
    if (R.niveau === 'equivoque') conseils.push(`${CONSEIL.equivoque} (${fmt(R.delta)} UH, seuil ${REHAUSSEMENT.equivoque} à ${REHAUSSEMENT.franc - 1} UH)`);
    const resultat = (categorie, criteres, extra = {}) => ({
      categorie, hors: null, titre: `Bosniak ${categorie}`, criteres, conduite: CONDUITE[categorie],
      conseils: [...conseils, ...(extra.conseils || [])], rehaussement: R, ...extra.surcharge,
    });

    // a. Hors Bosniak
    if (e.tissu === 'oui') return { categorie: null, hors: 'solide', titre: 'Hors Bosniak : masse solide', criteres: ['Tissu rehaussé occupant plus de 25 % du volume'], conduite: 'Masse rénale solide : hors classification de Bosniak.', conseils: [], rehaussement: R };
    if (e.exclusion === 'oui') return { categorie: null, hors: 'exclusion', titre: 'Hors Bosniak', criteres: ['Lésion infectieuse, inflammatoire ou vasculaire, ou syndrome héréditaire'], conduite: 'Classification de Bosniak non applicable : prise en charge selon la cause.', conseils: [], rehaussement: R };

    // b. IV
    const pr = rh(e.protrusionRehaussee);
    if (pr && e.protrusion === 'obtus>=4') return resultat('IV', ['Protrusion rehaussée ≥ 4 mm à angle obtus'], { conseils: [CONSEIL.biopsie] });
    if (pr && e.protrusion === 'aigu') return resultat('IV', ['Protrusion rehaussée à angle aigu, quelle que soit sa taille'], { conseils: [CONSEIL.biopsie] });

    // c. III
    const c3 = [];
    if (rh(e.paroiRehaussee) && e.paroi === '>=4') c3.push('Paroi rehaussée épaisse (≥ 4 mm)');
    if (avecCloisons && rh(e.cloisonsRehaussees) && e.cloisonsEpaisseur === '>=4') c3.push('Cloison rehaussée épaisse (≥ 4 mm)');
    if (pr && e.protrusion === 'obtus<=3') c3.push('Protrusion rehaussée ≤ 3 mm à angle obtus (paroi ou cloison irrégulière)');
    if (c3.length) return resultat('III', c3, { conseils: [CONSEIL.biopsie] });

    // d. IIF
    const c2f = [];
    if (rh(e.paroiRehaussee) && e.paroi === '3') c2f.push('Paroi lisse de 3 mm, rehaussée');
    if (avecCloisons && rh(e.cloisonsRehaussees) && e.cloisonsEpaisseur === '3') c2f.push('Cloison lisse de 3 mm, rehaussée');
    if (e.cloisons === '>=4' && e.cloisonsEpaisseur === '<=2' && rh(e.cloisonsRehaussees)) c2f.push('4 cloisons fines rehaussées ou plus');
    if (irm && e.t1FsHetero === 'oui') c2f.push('IRM : hypersignal T1 hétérogène avec saturation de la graisse');
    if (c2f.length) return resultat('IIF', c2f, { conseils: tdm ? [CONSEIL.irmIIF] : [] });

    // e. II
    const c2 = [], extra = [];
    if (e.cloisons === '1-3' && e.cloisonsEpaisseur === '<=2') c2.push('1 à 3 cloisons fines (≤ 2 mm)');
    if (e.calcifications !== 'aucune') {
      c2.push(e.calcifications === 'fines' ? 'Calcifications fines' : 'Calcification épaisse ou nodulaire');
      if (e.calcifications === 'epaisses') extra.push(CONSEIL.calcifEpaisses);
    }
    const homogene = !avecCloisons && e.protrusion === 'aucune' && e.paroi === '<=2';
    let hyperdense = false;
    if (homogene) {
      if (tdm && !inj && entre(sans, -9, 20)) c2.push('Homogène, −9 à 20 UH sans injection');
      if (tdm && sans != null && sans >= 70) { c2.push('Homogène, ≥ 70 UH sans injection'); hyperdense = true; }
      if (tdm && inj && sans != null && sans > 20 && R.niveau === 'absent') { c2.push(`Homogène, > 20 UH, sans rehaussement (${fmt(R.delta)} UH)`); hyperdense = true; }
      if (tdm && inj && entre(portal, 21, 30) && R.niveau !== 'franc') { c2.push('Homogène, 21 à 30 UH au temps portal'); hyperdense = true; }
      if (e.tropPetite === 'oui') c2.push('Homogène, trop petite pour être caractérisée');
      if (irm && !inj && e.t2Lcr === 'oui') c2.push('IRM sans injection : hypersignal T2 homogène proche du LCR');
      if (irm && e.t1Hyper === 'oui') c2.push('IRM : hypersignal T1 homogène ≥ 2,5 fois le rein');
    }
    if (hyperdense) extra.push(CONSEIL.hyperdense);
    if (c2.length) return resultat('II', c2, { conseils: extra });

    // f. I
    const simple = e.paroi === '<=2' && !avecCloisons && e.calcifications === 'aucune' && e.protrusion === 'aucune';
    if (simple && tdm && inj && (entre(sans, -9, 20) || entre(portal, -9, 20)) && R.niveau !== 'franc' && R.niveau !== 'equivoque') {
      return resultat('I', ['Paroi fine (≤ 2 mm)', `Liquide homogène −9 à 20 UH (${fmt(entre(sans, -9, 20) ? sans : portal)} UH)`, 'Ni cloison ni calcification']);
    }
    if (simple && irm && inj && e.t2Lcr === 'oui') return resultat('I', ['Paroi fine (≤ 2 mm)', 'Signal liquidien homogène, proche du LCR', 'Ni cloison ni calcification']);

    // Aucune règle : ce qu'il manque pour classer
    const manque = [];
    const aEvaluer = e.paroi !== '<=2' || e.protrusion !== 'aucune' || e.cloisons === '>=4' || (avecCloisons && e.cloisonsEpaisseur !== '<=2');
    if (!inj && aEvaluer) manque.push('Sans injection, le rehaussement de la paroi, des cloisons ou d\'une protrusion ne peut pas être évalué : compléter par un scanner ou une IRM avec injection.');
    else if (R.niveau === 'equivoque') manque.push(`Rehaussement équivoque (${fmt(R.delta)} UH) : IRM conseillée avant de classer.`);
    else if (R.niveau === 'franc' && homogene) manque.push(`Rehaussement franc (${fmt(R.delta)} UH) d'une lésion homogène : penser à une masse solide (vérifier la part de tissu rehaussé).`);
    else if (tdm && sans == null && portal == null) manque.push('Renseigner la densité du contenu (sans injection et/ou au temps portal).');
    else if (irm && e.t2Lcr !== 'oui' && e.t1Hyper !== 'oui') manque.push('Préciser le signal du contenu (T2 proche du LCR, hypersignal T1…).');
    else if (aEvaluer) manque.push('Paroi, cloisons ou protrusion épaisses mais non rehaussées : vérifier le rehaussement.');
    else manque.push('Contenu hors des valeurs de la classification : vérifier les densités ou compléter par une IRM.');
    return { categorie: null, hors: null, titre: 'Classement impossible', criteres: manque, conduite: '', conseils, rehaussement: R };
  }

  function fmt(n) { return n == null ? '?' : String(Math.round(n * 10) / 10).replace('.', ',').replace('-', '−'); }

  const BosniakRegles = { REHAUSSEMENT, CHOIX, DEFAUT, CONDUITE, CONSEIL, rehaussementMesure, classer };
  racine.BosniakRegles = BosniakRegles;
  if (typeof module === 'object' && module.exports) module.exports = BosniakRegles;
})(typeof self !== 'undefined' ? self : this);
