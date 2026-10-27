/* =========================================================
   RadiologicHub — fiche « Ischémie mésentérique : sémiologie et diagnostic »
   (fiches/ischemie-mesenterique.html) : données et petits calculs repris de
   la fiche de l'auteur (lexique inchangé)
   ---------------------------------------------------------
   • FORMES                : les 3 formes (et embolie / thrombose) avec leurs fréquences ;
   • orientationOcclusion  : siège de l'occlusion sur l'AMS → orientation étiologique ;
   • contraste(poids)      : 2 mL/kg jusqu'à 150 mL ;
   • PAROI                 : signes pariétaux (texte de la fiche, valeur pronostique) ;
   • GRAVITE               : signes de mauvais pronostic ;
   • CAS                   : entraînement « Quelle forme ? ».
   Module sans dépendance au navigateur (tests/ischemie-mesenterique.test.js).
   ========================================================= */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.RHRegles = root.RHRegles || {}).ischemieMesenterique = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const num = v => { const n = parseFloat(String(v ?? '').replace(',', '.')); return Number.isFinite(n) ? n : null; };

  /* Fréquences de la fiche (bornes en % des IMA) */
  const FORMES = {
    arterielle: { nom: 'Origine artérielle thrombo-embolique', pct: [60, 75] },
    embolie: { nom: 'L\'embolie', pct: [40, 50] },
    thrombose: { nom: 'La thrombose', pct: [20, 30] },
    nonOcclusive: { nom: 'Ischémie d\'origine non occlusive', pct: [20, 30] },
    veineuse: { nom: 'L\'ischémie veineuse', pct: [5, 15] },
  };

  /* Siège de l'occlusion de l'AMS (cm depuis l'ostium) → orientation de la fiche */
  function orientationOcclusion(cm) {
    const d = num(cm);
    if (d == null || d < 0) return null;
    if (d <= 1) return { cle: 'thrombose', titre: 'Occlusion artérielle ostiale = thrombotique', texte: 'Siège préférentiellement au niveau de l\'ostium de l\'AMS ; terrain athéromateux, patient plus âgé.' };
    if (d >= 3 && d <= 10) return { cle: 'embolie', titre: 'Occlusion dans les 3 à 10 premiers cm de l\'AMS = embolique', texte: 'Survient sur artère saine ; la plus fréquente : embolie sur arythmie cardiaque par fibrillation auriculaire.' };
    if (d > 10) return { cle: 'distale', titre: 'L\'occlusion n\'est pas toujours proximale : bien regarder les branches distales', texte: '' };
    return { cle: 'intermediaire', titre: 'Entre l\'ostium et 3 cm', texte: 'Hors des deux repères de la fiche (ostiale = thrombotique ; 3 à 10 premiers cm = embolique).' };
  }

  /* Produit de contraste iodé : 2 mL/kg jusqu'à 150 mL ; débit 3-4 mL/s */
  function contraste(poids) {
    const p = num(poids);
    if (!p || p <= 0) return null;
    const brut = Math.round(p * 2);
    return { volume: Math.min(brut, 150), plafonne: brut > 150, debit: '3-4 mL/s' };
  }

  /* Signes pariétaux (B.1) : texte de la fiche + valeur pronostique */
  const PAROI = {
    normale: { titre: 'Paroi normale', texte: 'Repère : paroi fine, rehaussée comme les anses adjacentes.', prono: '' },
    epaissie: { titre: 'Épaississement > 3 mm', texte: 'Signe le plus fréquemment observé, surtout dans l\'IMA veineuse et non occlusive, lié à l\'œdème sous-muqueux ; parfois accompagné d\'un rehaussement en cible.', prono: 'bon', pronoTexte: 'Facteur de bon pronostic : l\'œdème mural traduit l\'absence de nécrose.' },
    amincie: { titre: 'Amincissement', texte: 'Paroi à la limite de la visibilité, surtout IMA artérielle.', prono: 'mauvais', pronoTexte: 'Amincissement et/ou défaut de rehaussement : signe de mauvais pronostic.' },
    hyperdense: { titre: 'Hyperdensité spontanée', texte: 'Densité > muscles pariétaux ou anses adjacentes, liée à la congestion hémorragique sous-muqueuse.', prono: '' },
    'non-rehaussee': { titre: 'Rehaussement', texte: 'Diminution ou absence, ou rehaussement < anses adjacentes.', prono: 'mauvais', pronoTexte: 'Si absence de rehaussement → taux plus élevé de résection chirurgicale.' },
    'pneumatose-bulles': { titre: 'Pneumatose pariétale (bulleuse)', texte: 'Attention : pneumatose isolée ne veut pas dire nécrose irréversible.', prono: '' },
    'pneumatose-lineaire': { titre: 'Pneumatose : bulles linéaires en bande', texte: 'Suspecte de nécrose transmurale si associée à aéromésentérie/aéroportie (91 % de nécrose) ou bulles linéaires en bande (vs pneumatose bulleuse).', prono: 'mauvais', pronoTexte: 'Pneumatose linéaire : signe de mauvais pronostic.' },
  };

  /* V. Signes de mauvais pronostic */
  const GRAVITE = {
    origine: ['Embolie', 'Infarcissement d\'autres organes', 'Thrombose artérielle proximale', 'Occlusion sur anse fermée avec chirurgie > 36 heures'],
    paroi: ['Amincissement et/ou défaut de rehaussement', 'Pneumatose linéaire', 'Aéroportie et aéromésentérie'],
  };

  /* Entraînement : quelle forme ? */
  const CHOIX = { embolie: 'Embolie', thrombose: 'Thrombose artérielle', nonOcclusive: 'Non occlusive', veineuse: 'Veineuse' };
  const CAS = [
    { texte: 'Occlusion ostiale de l\'AMS ; calcifications pariétales de l\'AMS sur les coupes sans injection.', rep: 'thrombose', pourquoi: 'Occlusion artérielle ostiale = thrombotique ; calcifications → terrain vasculaire.' },
    { texte: 'Défaut d\'opacification de l\'AMS à 6 cm de son origine, patient en fibrillation auriculaire.', rep: 'embolie', pourquoi: 'Occlusion dans les 3 à 10 premiers cm de l\'AMS = embolique ; embolie sur arythmie par fibrillation auriculaire.' },
    { texte: 'Diminution et irrégularité de calibre des vaisseaux mésentériques, arcades non visualisées, sans thrombus ni embole.', rep: 'nonOcclusive', pourquoi: 'Vasospasme diffus mésentérique ; absence d\'image de thrombus ou d\'embole ; confirmation par artériographie.' },
    { texte: 'Thrombus spontanément hyperdense dans les veines mésentériques sur les coupes sans injection.', rep: 'veineuse', pourquoi: 'Thrombose veineuse ; les coupes tardives permettent de s\'affranchir des phénomènes de flux.' },
    { texte: 'Ischémie massive et brutale sur artère saine, sans réseau de suppléance.', rep: 'embolie', pourquoi: 'L\'embolie survient sur artère saine et évolue vers l\'infarctus transpariétal.' },
    { texte: 'Lésions prédominant à l\'angle colique gauche et à la jonction rectosigmoïdienne, sans occlusion vasculaire.', rep: 'nonOcclusive', pourquoi: 'Les lésions d\'ischémie non occlusive prédominent sur les zones de faiblesse.' },
    { texte: 'Patient âgé athéromateux : occlusion progressive complétant une sténose, collatéralité déjà en place.', rep: 'thrombose', pourquoi: 'La thrombose survient sur un terrain athéromateux, le plus souvent progressive.' },
    { texte: 'Cirrhose ; épaississement pariétal œdémateux ; évolution favorable sous anticoagulant.', rep: 'veineuse', pourquoi: 'Ischémie veineuse : le plus souvent réversible sous traitement anticoagulant ; causes : thrombophilie, cancer, cirrhose…' },
  ];

  return { FORMES, orientationOcclusion, contraste, PAROI, GRAVITE, CHOIX, CAS };
});
