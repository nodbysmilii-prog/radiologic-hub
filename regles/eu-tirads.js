/* =========================================================
   RadiologicHub — EU-TIRADS 2017 (nodule thyroïdien) : règles de la fiche
   fiches/eu-tirads.html
   ---------------------------------------------------------
   • classer(n)       : catégorie EU-TIRADS d'un nodule décrit avec le lexique
                        (algorithme : d'abord les 4 signes de forte suspicion, puis échogénicité) ;
   • signesForts(n)   : liste des signes de forte suspicion présents ;
   • cytoponction(c, taille) : indication selon les seuils de taille ;
   • surveillance(c, taille) : rythme proposé.
   Nodule n : { composition: 'kyste'|'spongiforme'|'solide'|'mixte-solide'|'mixte-kystique',
                echo: 'hyper'|'iso'|'hypo-moderee'|'hypo-marquee'|'anechogene',
                forme: 'ovale'|'ronde'|'non-ovale', contours: 'reguliers'|'flous'|'irreguliers',
                micro: bool, taille: mm (plus grand diamètre) }
   Module sans dépendance au navigateur (tests/eu-tirads.test.js).
   ========================================================= */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.RHRegles = root.RHRegles || {}).euTirads = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const CATEGORIES = {
    1: { nom: 'Examen normal', risque: '—', couleur: 'sign' },
    2: { nom: 'Bénin', risque: '≈ 0 %', couleur: 'sign' },
    3: { nom: 'Faible risque', risque: '2 à 4 %', couleur: 'key' },
    4: { nom: 'Risque intermédiaire', risque: '6 à 17 %', couleur: 'orange' },
    5: { nom: 'Haut risque', risque: '26 à 87 %', couleur: 'grave' },
  };
  const SEUILS = { 3: 20, 4: 15, 5: 10 };       // cytoponction si > seuil (mm)

  function signesForts(n = {}) {
    const s = [];
    if (n.forme === 'non-ovale') s.push('forme non ovale');
    if (n.contours === 'irreguliers') s.push('contours irréguliers');
    if (n.micro) s.push('microcalcifications');
    if (n.echo === 'hypo-marquee') s.push('hypoéchogénicité marquée');
    return s;
  }

  function classer(n = {}) {
    if (!n.composition) return { categorie: null, raison: 'Décrivez la composition.' };
    if (n.composition === 'kyste') return { categorie: 2, raison: 'Kyste simple (anéchogène) : bénin.' };
    if (n.composition === 'spongiforme') return { categorie: 2, raison: 'Nodule entièrement spongiforme : bénin.' };
    const forts = signesForts(n);
    if (forts.length) return { categorie: 5, raison: `Au moins un signe de forte suspicion : ${forts.join(', ')}.`, forts };
    if (!n.echo || n.echo === 'anechogene') return { categorie: null, raison: 'Précisez l\'échogénicité de la portion solide.' };
    if (n.echo === 'hypo-moderee') return { categorie: 4, raison: 'Ovale, contours réguliers, modérément hypoéchogène (une composante hypoéchogène partielle suffit).' };
    return { categorie: 3, raison: 'Ovale, contours réguliers, entièrement iso- ou hyperéchogène.' };
  }

  function cytoponction(c, taille) {
    if (c == null) return { indication: null, texte: '' };
    if (c <= 2) return { indication: false, texte: 'Pas de cytoponction (kyste simple : seulement s\'il est compressif).' };
    const t = Number(taille), s = SEUILS[c];
    if (!t) return { indication: null, texte: `Cytoponction si > ${s} mm.` };
    if (t > s) return { indication: true, texte: `Cytoponction indiquée (> ${s} mm).` };
    return { indication: false, texte: `Pas de cytoponction (seuil : > ${s} mm) : surveillance.` };
  }

  function surveillance(c, taille) {
    const t = Number(taille) || 0;
    if (c == null) return '';
    if (c <= 2) return 'Pas de surveillance spécifique.';
    if ((c === 3 && t && t <= 10) || (c === 4 && t && t <= 5)) return 'Arrêt de la surveillance possible.';
    return 'Contrôle à 1 an, puis 2, 3 et 5 ans si stable (ne pas trop espacer un nodule complexe : 2 à 3 ans).';
  }

  /* évolution : variation significative = +2 mm dans au moins 2 diamètres et/ou +50 % de volume */
  function croissance(avant = [], apres = []) {
    const d = avant.map((a, i) => (Number(apres[i]) || 0) - (Number(a) || 0));
    const deux = d.filter(x => x >= 2).length >= 2;
    const v = x => x.reduce((p, a) => p * (Number(a) || 0), 1) * 0.524;
    const va = v(avant), vb = v(apres);
    const vol = va > 0 ? (vb - va) / va : 0;
    return { significative: deux || vol >= 0.5, volume: Math.round(vol * 100) };
  }

  return { CATEGORIES, SEUILS, signesForts, classer, cytoponction, surveillance, croissance };
});
