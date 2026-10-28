/* =========================================================
   RadiologicHub — fiche « Imagerie de l'occlusion intestinale aiguë » (fiches/occlusion-intestinale.html) :
   données et petits calculs repris du cours de l'auteur (lexique inchangé)
   ---------------------------------------------------------
   • dilatation(segment, mm)  : anses > 2,5 cm, côlon > 5 cm ;
   • mecanisme(o)             : disparité de calibre + zone transitionnelle → mécanique ;
                                distension aérique diffuse, peu ou pas de NHA, pas de ZT → fonctionnelle ;
   • gravite(signes)          : 2 ou 3 signes = chirurgie ;
   • contraste(poids)         : 1,5 à 2 cc/kg, débit 2-4 cc/s ;
   • SIEGE, ANSE_FERMEE, CAS  : clinique selon le siège, signes d'anse fermée, entraînement.
   Module sans dépendance au navigateur (tests/occlusion-intestinale.test.js).
   ========================================================= */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.RHRegles = root.RHRegles || {}).occlusion = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const num = v => { const n = parseFloat(String(v ?? '').replace(',', '.')); return Number.isFinite(n) ? n : null; };

  /* Les 5 questions du radiologue (ancre de la section qui y répond) */
  const QUESTIONS = [
    { q: 'Y-a-t-il une occlusion?', ancre: 'positif' },
    { q: 'L\'occlusion est-elle fonctionnelle (paralytique) ou organique (mécanique) ?', ancre: 'mecanisme' },
    { q: 'Quel est le siège de l\'occlusion ?', ancre: 'topographie' },
    { q: 'Y-a-t-il des signes de gravité ?', ancre: 'gravite' },
    { q: 'Y-a-t-il des éléments orientant vers une étiologie donnée ?', ancre: 'etiologie-grele' },
  ];

  /* Diagnostic positif : distension des anses digestives */
  const SEUILS = { grele: 25, colon: 50 };
  function dilatation(segment, mm) {
    const d = num(mm), seuil = SEUILS[segment];
    if (d == null || !seuil || d <= 0) return null;
    return { dilate: d > seuil, seuil, ecart: Math.round((d - seuil) * 10) / 10 };
  }

  /* Diagnostic du mécanisme
     o : { disparite, zt, diffuse, nha: 'nombreux' | 'peu' } */
  function mecanisme(o = {}) {
    if (o.disparite && o.zt) return { cle: 'mecanique', texte: 'Occlusion mécanique : disparité de calibre entre les anses, avec anses dilatées séparées d\'anses non dilatées par une « zone transitionnelle ».' };
    if (o.diffuse && o.nha === 'peu' && !o.zt) return { cle: 'fonctionnelle', texte: 'Occlusion fonctionnelle : distension aérique diffuse des anses + peu ou pas de NHA / pas de ZT.' };
    if (o.zt) return { cle: 'mecanique', texte: 'Une zone transitionnelle oriente vers une occlusion mécanique : chercher la disparité de calibre de part et d\'autre.' };
    return null;
  }

  /* Clinique selon le siège (texte du cours) */
  const SIEGE = {
    haute: { nom: 'OIA haute', signes: { vomissements: 'précoces', amg: 'plus tardif', distension: 'discrète/absente' } },
    basse: { nom: 'OIA basse', signes: { vomissements: 'tardifs', amg: 'précoce', distension: 'importante' } },
    strangulation: { nom: 'OIA par strangulation', signes: { douleur: 'brutale, intense et permanente', generaux: 'd\'installation précoce', meteorisme: 'absent' } },
  };

  /* Occlusion à anse fermée : signes TDM */
  const ANSE_FERMEE = [
    'Anse en U ou en C, disposition radiaire des anses',
    'Plusieurs ZT',
    'Image de convergence+++',
    'Les ZT sont proches+++',
    'Plusieurs anses incarcérées',
    'Signe du tourbillon en cas de volvulus surajouté',
  ];

  /* Diagnostic de gravité */
  const GRAVITE = [
    'Absence ou asymétrie de rehaussement',
    'Infiltration diffuse du mésentère (# épanchement)',
    'Occlusion à anse fermée (closed-loop)',
  ];
  function gravite(n) {
    const k = Math.max(0, Math.min(3, Math.round(num(n) ?? 0)));
    if (k >= 2) return { n: k, chirurgie: true, texte: '2 ou 3 signes = chirurgie !!!' };
    return { n: k, chirurgie: false, texte: k === 1 ? '1 signe sur 3 coché.' : 'Aucun signe de gravité coché.' };
  }

  /* Produit de contraste : 1,5 à 2 cc/kg ; débit 2-4 cc/s */
  function contraste(poids) {
    const p = num(poids);
    if (!p || p <= 0) return null;
    return { min: Math.round(p * 1.5), max: Math.round(p * 2), debit: '2-4cc/s' };
  }

  /* Entraînement : quelle cause ? */
  const CHOIX = {
    bride: 'Bride simple',
    anseFermee: 'Anse fermée',
    ileusBiliaire: 'Iléus biliaire',
    iia: 'Invagination',
    volvulus: 'Volvulus du sigmoïde',
    ogilvie: 'Syndrome d\'Ogilvie',
    adk: 'ADK colique',
  };
  const CAS = [
    { texte: 'Opéré d\'une laparotomie. Grêle dilaté, 1 seule zone transitionnelle en « bec », encoche graisseuse (fat notch).', rep: 'bride', pourquoi: 'OIA simple par obstruction exoluminale : 1 seule ZT en « bec » ; la bride peut être visible sous forme d\'une encoche graisseuse.' },
    { texte: 'Anses grêles en U, disposition radiaire, image de convergence, deux ZT proches.', rep: 'anseFermee', pourquoi: 'Anse en U ou en C, disposition radiaire, plusieurs ZT proches, image de convergence : occlusion à anse fermée (closed-loop) → risque ischémique plus élevé.' },
    { texte: 'Calcul dans la lumière de l\'intestin grêle et aérobilie.', rep: 'ileusBiliaire', pourquoi: 'Calcul vésiculaire > 2,5 cm migré par une fistule bilio-digestive ; aérobilie ou pneumocholécyste en rapport avec la fistule.' },
    { texte: 'Adulte : aspect en cocarde avec un croissant de densité graisseuse excentré.', rep: 'iia', pourquoi: 'Boudin d\'invagination ; le croissant graisseux est le méso. Chez l\'adulte, chercher la masse causale au bout du boudin.' },
    { texte: 'Sujet âgé alité : volumineuse boucle sigmoïdienne ectopique, sténose en « bec d\'oiseau », signe du tourbillon.', rep: 'volvulus', pourquoi: 'Dg positif TDM du volvulus du sigmoïde : boucle volumineuse, ectopique, bec d\'oiseau, whirl sign.' },
    { texte: 'Patient intubé-ventilé : dilatation diffuse du cadre colique, contenu majoritairement gazeux, aucun obstacle mécanique.', rep: 'ogilvie', pourquoi: 'Syndrome d\'Ogilvie : terrain de débilité, dilatation diffuse sans obstacle ; risque de perforation caecale.' },
    { texte: 'Côlon dilaté en amont d\'un épaississement pariétal court, asymétrique, irrégulier, rehaussé du sigmoïde.', rep: 'adk', pourquoi: 'ADK colique : 70 % des causes d\'OIA colique, sigmoïde ou côlon gauche dans 75 % des cas.' },
    { texte: 'ASP : signe du « grain de café », vacuité de la FIG et du rectum.', rep: 'volvulus', pourquoi: 'Signes ASP du volvulus du sigmoïde (avec le « U inversé » et la perte des haustrations).' },
  ];

  return { QUESTIONS, SEUILS, dilatation, mecanisme, SIEGE, ANSE_FERMEE, GRAVITE, gravite, contraste, CHOIX, CAS };
});
