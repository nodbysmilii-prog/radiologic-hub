/* =========================================================
   RadiologicHub — Embolie pulmonaire : index d'obstruction de Qanadli
   ---------------------------------------------------------
   Qanadli SD, El Hajjam M, Vieillard-Baron A, et al. New CT index to
   quantify arterial obstruction in pulmonary embolism: comparison with
   angiographic index and echocardiography. AJR Am J Roentgenol.
   2001;176(6):1415-20. doi:10.2214/ajr.176.6.1761415
   • 10 artères segmentaires par poumon (3 lobe supérieur, 2 lobe moyen /
     lingula, 5 lobe inférieur), soit 20 au total ;
   • chaque artère segmentaire : 0 (perméable), 1 (obstruction partielle),
     2 (obstruction totale) ; un embole sous-segmentaire compte comme une
     obstruction partielle de l'artère segmentaire correspondante ;
   • un embole proximal (tronc, artère pulmonaire, artère lobaire) compte
     pour toutes les artères segmentaires d'aval ;
   • index = somme / 40 × 100 (%) ; un index ≥ 40 % est associé à une
     dilatation du ventricule droit (étude d'origine).
   Segments nommés selon Boyden, termes de l'auteur (24/10/2026) : lobe
   supérieur apical / dorsal / ventral ; lobe moyen latéral / médial.
   • description(entrée) : défects rédigés poumon par poumon, lobe par lobe
     (artère lobaire, puis défects totaux, partiels, sous-segmentaires, séparés
     par des virgules ; une ligne par lobe, terminée par « ; ») ;
   • integrer(compte rendu, entrée) : la description remplace la ligne des
     défects endoluminaux, l'index remplace la ligne de Qanadli, la conclusion
     remplace la ligne « embolie pulmonaire » de la CONCLUSION (réinsertion
     sans doublon).
   Module sans dépendance au navigateur (testé sous Node :
   tests/qanadli.test.js). À FAIRE VÉRIFIER MÉDICALEMENT.
   ========================================================= */

(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.RHRegles = root.RHRegles || {}).qanadli = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* Lobes et artères segmentaires (Boyden) : [id, nom du segment, adjectif accordé à « artère »] */
  const LOBES = [
    { id: 'lsd', cote: 'D', nom: 'lobe supérieur droit', artere: 'l\'artère lobaire supérieure', segments: [['d1', 'apical', 'apicale'], ['d2', 'dorsal', 'dorsale'], ['d3', 'ventral', 'ventrale']] },
    { id: 'lm', cote: 'D', nom: 'lobe moyen', artere: 'l\'artère lobaire moyenne', segments: [['d4', 'latéral', 'latérale'], ['d5', 'médial', 'médiale']] },
    { id: 'lid', cote: 'D', nom: 'lobe inférieur droit', artere: 'l\'artère lobaire inférieure', segments: [['d6', 'apical (Nelson)', 'apicale (Nelson)'], ['d7', 'médio-basal', 'médio-basale'], ['d8', 'antéro-basal', 'antéro-basale'], ['d9', 'latéro-basal', 'latéro-basale'], ['d10', 'postéro-basal', 'postéro-basale']] },
    { id: 'lsg', cote: 'G', nom: 'lobe supérieur gauche', artere: 'l\'artère lobaire supérieure', segments: [['g1', 'apical', 'apicale'], ['g2', 'dorsal', 'dorsale'], ['g3', 'ventral', 'ventrale']] },
    { id: 'ling', cote: 'G', nom: 'lingula', artere: 'l\'artère lingulaire', segments: [['g4', 'lingulaire supérieur', 'lingulaire supérieure'], ['g5', 'lingulaire inférieur', 'lingulaire inférieure']] },
    { id: 'lig', cote: 'G', nom: 'lobe inférieur gauche', artere: 'l\'artère lobaire inférieure', segments: [['g6', 'apical (Nelson)', 'apicale (Nelson)'], ['g7', 'médio-basal', 'médio-basale'], ['g8', 'antéro-basal', 'antéro-basale'], ['g9', 'latéro-basal', 'latéro-basale'], ['g10', 'postéro-basal', 'postéro-basale']] },
  ];
  const SEGMENTS = LOBES.flatMap(l => l.segments.map(([id, nom, adj]) => ({ id, nom, adj, lobe: l.id, cote: l.cote })));
  const PROXIMAUX = {
    tronc: { nom: 'tronc de l\'artère pulmonaire', niveau: 'proximale', lobes: LOBES.map(l => l.id) },
    apd: { nom: 'artère pulmonaire droite', niveau: 'proximale', lobes: ['lsd', 'lm', 'lid'] },
    apg: { nom: 'artère pulmonaire gauche', niveau: 'proximale', lobes: ['lsg', 'ling', 'lig'] },
    ...Object.fromEntries(LOBES.map(l => [l.id, { nom: `artère lobaire du ${l.nom}`.replace('du lingula', 'de la lingula'), niveau: 'lobaire', lobes: [l.id] }])),
  };
  const RANG = { proximale: 3, lobaire: 2, segmentaire: 1, 'sous-segmentaire': 0 };

  /* entree : { proximaux: { tronc: 0|1|2, apd, apg, lsd… }, segments: { d1: 0|1|2|'s' … } }
     's' = embole sous-segmentaire (compte 1) */
  function evaluer(entree = {}) {
    const prox = entree.proximaux || {}, seg = entree.segments || {};
    const points = {}, niveaux = { D: null, G: null };
    const noter = (cote, niveau) => { if (!niveaux[cote] || RANG[niveau] > RANG[niveaux[cote]]) niveaux[cote] = niveau; };
    SEGMENTS.forEach(s => {
      const v = seg[s.id];
      points[s.id] = v === 's' ? 1 : Math.max(0, Math.min(2, +v || 0));
      if (v === 's') noter(s.cote, 'sous-segmentaire');
      else if (points[s.id]) noter(s.cote, 'segmentaire');
    });
    Object.entries(prox).forEach(([k, v]) => {
      const p = PROXIMAUX[k], o = Math.max(0, Math.min(2, +v || 0));
      if (!p || !o) return;
      SEGMENTS.filter(s => p.lobes.includes(s.lobe)).forEach(s => {
        points[s.id] = Math.max(points[s.id], o);
        noter(s.cote, p.niveau);
      });
    });
    const score = SEGMENTS.reduce((t, s) => t + points[s.id], 0);
    const index = Math.round(score / 40 * 1000) / 10;
    const cotes = ['D', 'G'].filter(c => niveaux[c]);
    return { score, max: 40, index, points, niveaux, cotes, embolie: score > 0, severe: index >= 40 };
  }

  const nombre = n => String(n).replace('.', ',');

  const COTE = { D: 'droite', G: 'gauche' };
  const liste = a => a.length < 2 ? a.join('') : `${a.slice(0, -1).join(', ')} et ${a[a.length - 1]}`;

  /* Phrase de résultat et conclusion */
  function texte(r) {
    return `Index d'obstruction artérielle pulmonaire de Qanadli : ${r.score}/40, soit ${nombre(r.index)} %${r.severe ? ' (≥ 40 %)' : ''}.`;
  }
  function conclusion(r) {
    if (!r.embolie) return 'Absence d\'embolie pulmonaire.';
    const qa = `index d'obstruction de Qanadli à ${nombre(r.index)} % (${r.score}/40)`;
    if (r.cotes.length === 1) return `Embolie pulmonaire ${COTE[r.cotes[0]]} ${r.niveaux[r.cotes[0]]}, ${qa}.`;
    if (r.niveaux.D === r.niveaux.G) return `Embolie pulmonaire bilatérale ${r.niveaux.D}, ${qa}.`;
    return `Embolie pulmonaire bilatérale, ${r.niveaux.D} à droite et ${r.niveaux.G} à gauche, ${qa}.`;
  }

  /* Description des défects : une ligne par artère proximale, puis par lobe atteint ; le poumon sans
     défect est cité quand l'autre est atteint (sauf embole du tronc, qui concerne les deux) */
  function description(entree = {}) {
    const prox = entree.proximaux || {}, seg = entree.segments || {};
    const qual = v => +v === 2 ? 'total' : 'partiel';
    const lignes = [];
    if (+prox.tronc) lignes.push(`tronc de l'artère pulmonaire : défect ${qual(prox.tronc)}`);
    for (const cote of ['D', 'G']) {
      const ap = cote === 'D' ? 'apd' : 'apg', avant = lignes.length;
      if (+prox[ap]) lignes.push(`${PROXIMAUX[ap].nom} : défect ${qual(prox[ap])}`);
      for (const l of LOBES.filter(x => x.cote === cote)) {
        const parts = [];
        if (+prox[l.id]) parts.push(`défect ${qual(prox[l.id])} de ${l.artere}`);
        const de = v => l.segments.filter(([id]) => String(seg[id] ?? '') === v);
        const tot = de('2'), par = de('1'), sous = de('s');
        for (const [g, sg, pl] of [[tot, 'total', 'totaux'], [par, 'partiel', 'partiels']])
          if (g.length) parts.push(g.length === 1 ? `défect ${sg} de l'artère segmentaire ${g[0][2]}` : `défects ${pl} des artères segmentaires ${liste(g.map(x => x[2]))}`);
        if (sous.length) parts.push(sous.length === 1 ? `défect sous-segmentaire du segment ${sous[0][1]}` : `défects sous-segmentaires des segments ${liste(sous.map(x => x[1]))}`);
        if (parts.length) lignes.push(`${l.nom} : ${parts.join(', ')}`);
      }
      if (lignes.length === avant && !+prox.tronc) lignes.push(`poumon ${cote === 'D' ? 'droit' : 'gauche'} : pas de défect endoluminal`);
    }
    if (lignes.every(l => l.startsWith('poumon'))) return ['• Absence de défect endoluminal des artères pulmonaires.'];
    return ['• Défects endoluminaux des artères pulmonaires (segmentation de Boyden) :',
      ...lignes.map((l, i) => `  – ${l}${i === lignes.length - 1 ? '.' : ' ;'}`)];
  }

  /* Intégration au compte rendu (modèle « Angioscanner thoracique — embolie pulmonaire » ou texte libre) */
  const norm = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const LIGNE_DEFECT = l => /^\s*•\s*\[?\s*(absence de defect endolumin|defects? endolumin)/.test(norm(l));
  const SOUS_LIGNE = l => /^\s+[–-]\s/.test(l);
  const LIGNE_INDEX = l => /^\s*•?\s*index d'obstruction/.test(norm(l));
  const TITRE_CONCLUSION = l => /^\s*(conclusion|au total|synthese)\s*:?\s*$/.test(norm(l));
  const VASCULAIRE = l => /^\s*etude vasculaire\s*:?\s*$/.test(norm(l));
  const RESULTATS = l => /^\s*(resultats|constatations)\s*:?\s*$/.test(norm(l));

  function integrer(texteCR, entree = {}) {
    const r = evaluer(entree);
    const L = String(texteCR ?? '').split('\n');
    const desc = description(entree);
    // 1. description à la place de la ligne des défects (et de ses sous-lignes) ou sous « Étude vasculaire : »
    let i = L.findIndex(LIGNE_DEFECT), ou;
    if (i >= 0) { let j = i + 1; while (j < L.length && SOUS_LIGNE(L[j])) j++; L.splice(i, j - i, ...desc); ou = i + desc.length; }
    else {
      const v = L.findIndex(VASCULAIRE), res = L.findIndex(RESULTATS);
      const a = v >= 0 ? v : res;
      if (a < 0) return null;
      L.splice(a + 1, 0, ...desc); ou = a + 1 + desc.length;
    }
    // 2. index de Qanadli
    const k = L.findIndex(LIGNE_INDEX);
    if (k >= 0) L[k] = `• ${texte(r)}`; else L.splice(ou, 0, `• ${texte(r)}`);
    // 3. conclusion
    const c = L.findIndex(TITRE_CONCLUSION);
    let creee = false;
    if (c < 0) {
      while (L.length && !L[L.length - 1].trim()) L.pop();
      L.push('', 'CONCLUSION :', conclusion(r)); creee = true;
    } else {
      let f = c + 1; while (f < L.length && L[f].trim() && !/^[A-ZÉÈÀ][A-ZÉÈÀ '’-]+:\s*$/.test(L[f].trim())) f++;
      const e = L.slice(c + 1, f).findIndex(l => /embolie pulmonaire/.test(norm(l)));
      if (e >= 0) L[c + 1 + e] = conclusion(r); else L.splice(c + 1, 0, conclusion(r));
    }
    return { texte: L.join('\n'), creee };
  }

  return { LOBES, SEGMENTS, PROXIMAUX, evaluer, texte, conclusion, description, integrer };
});
