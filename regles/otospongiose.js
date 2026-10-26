/* =========================================================
   RadiologicHub — Otospongiose : règles de la fiche fiches/otospongiose.html
   ---------------------------------------------------------
   • veillon(f)        : type TDM de Veillon à partir de la description du foyer ;
   • fraysse(g)        : libellé du grade de la fenêtre ronde ;
   • fenetreOvale(mm)  : récessus de la fenêtre ovale étroit (< 1,4 mm), limite, normal (≥ 1,5 mm) ;
   • facialProcident(d): nerf facial sous le plan du bord inférieur de la fenêtre ovale (coronal) ;
   • compteRendu(o)    : phrases du bilan préopératoire.
   Module sans dépendance au navigateur (tests/otospongiose.test.js).
   ========================================================= */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.RHRegles = root.RHRegles || {}).otospongiose = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const VEILLON = {
    '1A': 'Atteinte isolée de la platine, épaissie (> 0,6 mm) et hypodense',
    '1B': 'Hypodensité pré-stapédienne ≤ 1 mm, sans extension à la couche labyrinthique',
    2: 'Hypodensité pré-stapédienne > 1 mm, sans contact avec la lumière cochléaire',
    3: 'Hypodensité > 1 mm au contact de la lumière cochléaire',
    '4A': 'Hypodensités en avant, en dedans ou en dessous de la cochlée (couche moyenne de la capsule)',
    '4B': 'Atteinte des canaux semi-circulaires et/ou du vestibule',
  };
  const FRAYSSE = { 1: 'normale', 2: 'foyers sur les berges externe ou interne', 3: 'obstruction complète', 4: 'ossification de la rampe tympanique' };

  /* f : { platine: bool (épaissie > 0,6 mm, hypodense), prestapedien: mm (0 = aucun), contactCochlee: bool,
          pericochleaire: bool, vestibulaire: bool } — le type le plus étendu l'emporte */
  function veillon(f = {}) {
    if (f.vestibulaire) return '4B';
    if (f.pericochleaire) return '4A';
    const t = Number(f.prestapedien) || 0;
    if (t > 1 && f.contactCochlee) return '3';
    if (t > 1) return '2';
    if (t > 0) return '1B';
    if (f.platine) return '1A';
    return null;
  }

  function fenetreOvale(mm) {
    const v = Number(String(mm).replace(',', '.'));
    if (!v) return { etat: '', texte: '' };
    if (v < 1.4) return { etat: 'etroite', texte: 'Récessus de la fenêtre ovale étroit (< 1,4 mm) : difficulté opératoire.' };
    if (v < 1.5) return { etat: 'limite', texte: 'Récessus de la fenêtre ovale à la limite (1,4 à 1,5 mm).' };
    return { etat: 'normale', texte: 'Récessus de la fenêtre ovale de taille normale (≥ 1,5 mm).' };
  }

  /* d : position du bord inférieur du canal facial par rapport au plan horizontal passant par le bord
     inférieur de la fenêtre ovale (mm, négatif = en dessous) */
  function facialProcident(d) { return Number(d) < 0; }

  const liste = a => a.length <= 1 ? (a[0] || '') : a.slice(0, -1).join(', ') + ' et ' + a[a.length - 1];
  /* o : { cote, type, fraysse, procident, dehiscence, fenetre (mm), stapedienne, enclume (intègre ?), marteau, controlateral } */
  function compteRendu(o = {}) {
    const cote = o.cote === 'gauche' ? 'gauche' : 'droite';
    const r = [];
    r.push(o.type ? `Foyer d'otospongiose à ${cote}, type ${o.type} de Veillon : ${VEILLON[o.type].charAt(0).toLowerCase() + VEILLON[o.type].slice(1)}.` : `Pas de foyer d'otospongiose visible à ${cote} (n'exclut pas une forme infraradiologique).`);
    if (o.fraysse) r.push(`Fenêtre ronde : grade ${o.fraysse} de Fraysse (${FRAYSSE[o.fraysse]})${o.fraysse > 1 ? ', à signaler : moins bon pronostic opératoire' : ''}.`);
    const fo = fenetreOvale(o.fenetre); if (fo.texte) r.push(fo.texte);
    const vii = [];
    if (o.procident) vii.push('procident (sous le plan du bord inférieur de la fenêtre ovale)');
    if (o.dehiscence) vii.push('déhiscent');
    r.push(vii.length ? `Canal facial ${liste(vii)}.` : 'Canal facial en position normale, sans déhiscence visible.');
    if (o.stapedienne) r.push('Artère stapédienne persistante (opacité entre les branches de l\'étrier, foramen épineux absent) : risque hémorragique.');
    r.push(o.enclume === false ? 'Lyse de la longue apophyse de l\'enclume.' : 'Longue apophyse de l\'enclume intègre.');
    if (o.marteau) r.push('Fixation de la tête du marteau (pont osseux avec la paroi latérale de l\'attique).');
    if (o.controlateral) r.push('Foyer controlatéral (forme bilatérale).');
    const c = o.type ? `Otospongiose ${cote} de type ${o.type} de Veillon${o.fraysse > 1 ? `, fenêtre ronde atteinte (grade ${o.fraysse})` : ''}${o.controlateral ? ', bilatérale' : ''}.` : `Pas de foyer d'otospongiose visible.`;
    return { resultats: r, conclusion: c };
  }

  return { VEILLON, FRAYSSE, veillon, fenetreOvale, facialProcident, compteRendu };
});
