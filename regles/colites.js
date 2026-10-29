/* =========================================================
   RadiologicHub — fiche « Colites » (fiches/colites.html) :
   données et petits calculs repris du cours de l'auteur (lexique inchangé)
   ---------------------------------------------------------
   • paroi(mm, distendu)  : normale 3-4 mm (côlon collabé) / 1-2 mm (distendu) ;
                            diagnostic positif : épaississement pariétal > 4 mm ;
   • calibre(segment, cm) : caecum 6 à 8 cm, sigmoïde 3 à 5 cm ; mégacôlon toxique : transverse > 6 cm ;
   • contraste(poids)     : 1,5 cc/kg à 2-3 ml/s ;
   • ATTEINTES            : segments du cadre colique (3D) et couches de la paroi touchés ;
   • CAS                  : entraînement « Quelle colite ? ».
   Module sans dépendance au navigateur (tests/colites.test.js).
   ========================================================= */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.RHRegles = root.RHRegles || {}).colites = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const num = v => { const n = parseFloat(String(v ?? '').replace(',', '.')); return Number.isFinite(n) ? n : null; };

  /* Épaisseur pariétale */
  function paroi(mm, distendu) {
    const e = num(mm);
    if (e == null || e <= 0) return null;
    const normale = distendu ? [1, 2] : [3, 4];
    if (e > 4) return { cle: 'epaissie', texte: 'Épaississement pariétal > 4mm : signe de colite (diagnostic positif).', normale };
    if (e > normale[1]) return { cle: 'limite', texte: `Au-dessus de la normale d'un côlon ${distendu ? 'distendu (1-2mm)' : 'collabé (3-4mm)'}, sans dépasser 4 mm.`, normale };
    return { cle: 'normale', texte: `Épaisseur normale pour un côlon ${distendu ? 'distendu (1-2mm)' : 'collabé (3-4mm)'}.`, normale };
  }

  /* Calibre */
  const CALIBRE = { caecum: [6, 8], sigmoide: [3, 5] };
  function megacolon(transverseCm) {
    const c = num(transverseCm);
    if (c == null || c <= 0) return null;
    return { toxique: c > 6, texte: c > 6 ? 'Côlon transverse > 6 cm : mégacôlon toxique si contexte (MICI, perte des haustrations, pseudopolypes).' : 'Côlon transverse ≤ 6 cm.' };
  }

  /* Produit de contraste : 1,5 cc/kg à 2-3 ml/s */
  function contraste(poids) {
    const p = num(poids);
    if (!p || p <= 0) return null;
    return { volume: Math.round(p * 1.5), debit: '2-3ml/s' };
  }

  /* Échographie : 5 couches de la lumière à la périphérie */
  const ECHO = [
    { echo: 'hyper', couche: 'interface', texte: 'Ligne hyperéchogène = interface avec la lumière digestive' },
    { echo: 'hypo', couche: 'muqueuse', texte: 'Ligne hypoéchogène = muqueuse' },
    { echo: 'hyper', couche: 'sous-muqueuse', texte: 'Ligne hyperéchogène = sous-muqueuse' },
    { echo: 'hypo', couche: 'musculeuse', texte: 'Ligne hypoéchogène = musculeuse' },
    { echo: 'hyper', couche: 'sereuse', texte: 'Ligne hyperéchogène = séreuse et interface de la paroi colique avec la graisse péri-colique' },
  ];

  /* Atteintes : segments du cadre (ids du modèle 3D) et aspect de la paroi (visionneuse « paroi ») */
  const TOUT = ['caecum', 'ascendant', 'transverse', 'descendant', 'sigmoide'];
  const ATTEINTES = {
    crohn: { nom: 'Crohn', segments: ['ileon', 'caecum', 'ascendant'], paroi: 'transmurale', texte: 'Touche n\'importe quel segment mais prédomine au niveau de : Iléon terminal et colon droit +++ ; discontinu ; atteinte transmurale.' },
    rch: { nom: 'RCH', segments: ['descendant', 'sigmoide'], paroi: 'muqueuse', texte: 'Côlon gauche++ ; continu, siège initial rectal puis progression rétrograde ; pas d\'atteinte de la dernière anse ; atteinte non transmurale (muqueuse et sous muqueuse). Le rectum n\'est pas modélisé dans la 3D.' },
    megacolon: { nom: 'Mégacôlon toxique', segments: ['transverse'], paroi: null, texte: 'distension importante principalement du côlon transverse qui est > 6 cm avec perte des haustrations et présence de pseudopolypes.' },
    ischemique: { nom: 'Ischémique', segments: ['descendant', 'sigmoide'], paroi: 'cible', texte: 'Atteinte segmentaire ; côlon gauche et sigmoïde les plus touchés (atteinte gauche : patients âgés, hypoperfusion ; atteinte droite : patients jeunes, traumatisme) ; atteinte rectale rare.' },
    pancolite: { nom: 'Pancolite (infectieuse)', segments: TOUT, paroi: null, texte: 'Pancolite : CMV, E.coli, Claustridium difficile.' },
    droite: { nom: 'Colite droite (infectieuse)', segments: ['caecum', 'ascendant'], paroi: null, texte: 'Colite droite : Salmonellose, yersiniose, campilobacter, Tuberculose, amibiase.' },
    gauche: { nom: 'Colite gauche (infectieuse)', segments: ['descendant', 'sigmoide'], paroi: null, texte: 'Colite gauche : Schistosomiase, shigellose, herpes, gonoccoccie.' },
    amibiase: { nom: 'Amibiase', segments: ['caecum'], paroi: null, texte: 'Caecum en premier puis pancolique.' },
    tuberculose: { nom: 'Tuberculose', segments: ['ileon', 'caecum'], paroi: 'transmurale', texte: 'Iléocæcale ; atteinte transmurale (diagnostic différentiel : Crohn +++).' },
    pseudomembraneuse: { nom: 'Pseudomembraneuse', segments: TOUT, paroi: null, texte: 'Pancolite+++ ; important épaississement pariétal (> 11mm) ; aspect en « accordéon ».' },
    typhlite: { nom: 'Neutropénique (typhlite)', segments: ['ileon', 'caecum', 'ascendant'], paroi: null, texte: 'Atteinte iléo-caecale, et du côlon droit ; paroi hypodense (oedème sous muqueux).' },
  };

  /* Ischémie artérielle : 3 formes */
  const ISCHEMIE = {
    humide: { nom: 'Forme humide (wet appearence)', paroi: 'cible', evolution: 'Précoce et réversible' },
    seche: { nom: 'La forme sèche (« Dry appearance »)', paroi: 'seche', evolution: 'tardive, irréversible' },
    infarctus: { nom: 'Infarctus transmural', paroi: 'pneumatose', evolution: 'Dernière phase' },
  };

  /* Entraînement : quelle colite ? */
  const CHOIX = { crohn: 'Crohn', rch: 'RCH', ischemique: 'Ischémique', pseudomembraneuse: 'Pseudomembraneuse', typhlite: 'Typhlite', infectieuse: 'Infectieuse' };
  const CAS = [
    { texte: 'Adulte jeune : épaississement important (≈10mm), asymétrique, discontinu, iléon terminal et colon droit, fistule, « comb sign ».', rep: 'crohn', pourquoi: 'Crohn : transmural, discontinu, iléon terminal et colon droit +++, fistules+++, comb sign, sclérolipomatose.' },
    { texte: 'Épaississement continu depuis le rectum, symétrique en halo (8mm en moyenne), sans fistule ni abcès.', rep: 'rch', pourquoi: 'RCH : continu, siège initial rectal puis progression rétrograde ; jamais de fistule ou d\'abcès.' },
    { texte: 'Sujet âgé avec FDR CVx, rectorragies : atteinte segmentaire du côlon gauche, rehaussement en cible.', rep: 'ischemique', pourquoi: 'Ischémique : sujet âgé, côlon gauche et sigmoïde, forme humide précoce et réversible avec rehaussement en cible.' },
    { texte: 'Sous antibiothérapie à large spectre : pancolite, épaississement > 11mm, aspect en « accordéon ».', rep: 'pseudomembraneuse', pourquoi: 'Pseudomembraneuse (clostridium difficile) : pancolite+++, épaississement > 11mm, accordéon.' },
    { texte: 'Patient immunodéprimé : épaississement iléo-caecal et du côlon droit, paroi hypodense, pneumatose pariétale.', rep: 'typhlite', pourquoi: 'Neutropénique = typhlite : terrain immunodéprimé, iléo-caecal et côlon droit ; pneumatose de mauvais pronostic.' },
    { texte: 'Retour de zone tropicale : atteinte du caecum puis pancolique, abcès hépatique associé.', rep: 'infectieuse', pourquoi: 'Amibiase : séjour en zone d\'endémie, caecum en premier puis pancolique, abcès hépatique dans 1/3 des cas.' },
    { texte: 'Paroi hypodense homogène, faiblement voire non rehaussée, épaississement circonférentiel et symétrique, peu d\'infiltration péri-colique.', rep: 'ischemique', pourquoi: 'Ischémie artérielle, forme sèche (« Dry appearance ») : tardive, irréversible.' },
    { texte: 'Iléocæcale, atteinte transmurale, adénopathies à centre hypodense, ascite, granulomes avec nécrose caséeuse.', rep: 'infectieuse', pourquoi: 'Tuberculose (diagnostic différentiel : Crohn +++) : adénopathies à centre hypodense, nécrose caséeuse.' },
  ];

  return { paroi, CALIBRE, megacolon, contraste, ECHO, ATTEINTES, ISCHEMIE, CHOIX, CAS };
});
