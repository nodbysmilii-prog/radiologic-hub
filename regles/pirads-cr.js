/* =========================================================
   RadiologicHub — PI-RADS v2.1 dans le compte rendu type
   « IRM prostatique multiparamétrique » (cr-data.js, irm-prostate-multiparametrique)
   ---------------------------------------------------------
   integrer(compte rendu, résumé de l'outil) écrit chaque donnée de
   l'outil PI-RADS à sa place, sans toucher au reste du texte :
   • INDICATION : PSA ;
   • 1. Volume : mensurations, volume (ellipsoïde), densité du PSA ;
   • 2. Analyse zonale : la phrase « [Absence de foyer… / de lésion…] »
     de la zone concernée renvoie à la lésion cible (et revient si la
     zone n'a plus de lésion) ;
   • 3. Lésion cible n° i : localisation, grand axe, diffusion (score 3 :
     restriction modérée ; 4-5 : marquée), perfusion, PI-RADS ; une lésion
     sans bloc reçoit une copie du bloc du modèle ;
   • CONCLUSION : volume et densité, une ligne par lésion (ou « Absence de
     lésion prostatique suspecte »), extension extraprostatique (non →
     absence ; certaine → le choix du modèle, à compléter).
   Ce que l'outil ne connaît pas (morphologie, signal T2, contours, score
   EPE…) reste entre crochets. Réinsérer remplace les mêmes lignes.
   Module sans dépendance au navigateur (tests/pirads-cr.test.js).
   ========================================================= */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.RHRegles = root.RHRegles || {}).piradsCR = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const A = '[’\']';                                   // apostrophe du modèle (typographique) ou droite
  const fr = (n, d) => Number(n).toLocaleString('fr-FR', { maximumFractionDigits: d, useGrouping: false });

  // Bloc « Lésion cible n° 1 » du modèle, recopié pour les lésions suivantes
  const BLOC = [
    'Lésion cible n° {n} :',
    '',
    '• Localisation : zone [périphérique / transitionnelle], secteur [X], [droit / gauche], à l’étage [basal / moyen / apical].',
    '• Dimensions : [X × X] mm, grand axe de [X] mm.',
    '• Morphologie : lésion [nodulaire / lenticulaire / irrégulière], aux contours [nets / flous / infiltrants].',
    '• Signal T2 : [hyposignal homogène / signal intermédiaire / signal hétérogène].',
    '• Diffusion : [restriction modérée / marquée], avec hypersignal sur les séquences à b élevé et diminution correspondante du coefficient ADC.',
    '• Perfusion : [absence de rehaussement focal précoce / rehaussement focal précoce concordant avec l’anomalie].',
    '• Rapports capsulaires : [sans contact / contact sur X mm / bombement / irrégularité / brèche avec extension extraprostatique mesurable à X mm].',
    '• Classification : PI-RADS v2.1 [X/5].',
  ].join('\n');

  const estModele = t => /3\. Lésion cible prostatique/.test(t) && /Lésion cible n° 1 :/.test(t);

  // Remplace une ligne entière (motif ancré en début de ligne) si elle existe
  const ligne = (t, motif, nouvelle) => t.replace(new RegExp(`^${motif}[^\\n]*$`, 'm'), () => nouvelle);

  // Limites [début, fin[ d'une rubrique : de son titre jusqu'au titre suivant
  function rubrique(t, titre, suivants) {
    const d = t.search(new RegExp(`^${titre}`, 'm'));
    if (d < 0) return null;
    const reste = t.slice(d + 1);
    const f = suivants.map(s => reste.search(new RegExp(`^${s}`, 'm'))).filter(i => i >= 0);
    return [d, f.length ? d + 1 + Math.min(...f) : t.length];
  }
  const dansRubrique = (t, borne, fn) => (borne ? t.slice(0, borne[0]) + fn(t.slice(borne[0], borne[1])) + t.slice(borne[1]) : t);

  const renvoi = ns => `• ${ns.length > 1 ? 'Lésions cibles' : 'Lésion cible'} n° ${ns.join(', ')} (voir ci-dessous).`;

  function localisation(l) {
    const etage = l.etages.length ? `${l.etages.length > 1 ? 'aux étages' : 'à l’étage'} ${l.etages.join(' et ')}` : 'à l’étage [basal / moyen / apical]';
    const c = l.codes || [];
    const secteur = c.length ? `${c.length > 1 ? 'secteurs' : 'secteur'} ${c.length < 2 ? c[0] : `${c.slice(0, -1).join(', ')} et ${c[c.length - 1]}`}` : 'secteur [X]';
    return `• Localisation : zone ${l.zone}, ${secteur}, ${l.cote || '[droit / gauche]'}, ${etage}.`;
  }

  function remplirBloc(b, l) {
    b = ligne(b, '• Localisation :', localisation(l));
    if (l.taille) b = b.replace(/^(• Dimensions :[^\n]*?grand axe de )[^\n]*?( mm\.?)$/m, `$1${l.taille}$2`);
    if (l.dwi >= 3) b = b.replace(/^• Diffusion : [^\n]*?, avec/m, `• Diffusion : restriction ${l.dwi === 3 ? 'modérée' : 'marquée'}, avec`);
    if (l.dce === 'pos') b = ligne(b, '• Perfusion :', '• Perfusion : rehaussement focal précoce concordant avec l’anomalie.');
    if (l.dce === 'neg') b = ligne(b, '• Perfusion :', '• Perfusion : absence de rehaussement focal précoce.');
    b = ligne(b, '• Classification :', `• Classification : PI-RADS v2.1 ${l.categorie ? `${l.categorie}/5` : '[X/5]'}.`);
    return b;
  }

  function conclusionLesion(l, plusieurs) {
    const ou = l.secteurs ? `située au niveau de la ${l.secteurs}` : 'située au niveau de [X]';
    return `• Lésion cible prostatique${plusieurs ? ` n° ${l.n}` : ''} de ${l.taille || '[X]'} mm, ${ou}, classée PI-RADS v2.1 ${l.categorie ? `${l.categorie}/5` : '[X/5]'}.`;
  }

  /* r : { psa, dim: [L, W, H], volume, densite, lesions: [{ n, categorie, zone, secteurs (en clair), codes (PZpl, TZa…), cote, etages, taille, dwi, dce, epe }] }
     (nombres déjà arrondis ; zone 'périphérique' | 'transitionnelle') */
  function integrer(texteCR, r) {
    if (!estModele(texteCR)) return null;
    let t = texteCR;
    const L = r.lesions || [];

    /* INDICATION et volume */
    if (r.psa != null) t = t.replace(/(Élévation du PSA à )\[X\]( ng\/mL)/, `$1${fr(r.psa, 2)}$2`);
    if (r.dim) t = t.replace(/^(• Prostate mesurant )[^\n]*?( mm, soit un volume estimé à )[^\n]*?( cm³\.)$/m, `$1${r.dim.map(v => fr(v, 0)).join(' × ')}$2${fr(r.volume, 0)}$3`);
    if (r.densite != null) t = t.replace(/^(• Densité du PSA estimée à )[^\n]*?( ng\/mL\/cm³\.)$/m, `$1${fr(r.densite, 2)}$2`);

    /* Analyse zonale : renvoi vers les lésions cibles de chaque zone */
    const ZONES = [
      ['périphérique', 'Zone périphérique \\(ZP\\) :', ['Zone transitionnelle', 'Stroma fibromusculaire', 'Lobe médian', '\\d\\. '],
        '• [Absence de foyer individualisable présentant une restriction focale suspecte de la diffusion ou un rehaussement focal précoce].', '\\[Absence de foyer individualisable'],
      ['transitionnelle', 'Zone transitionnelle \\(ZT\\) :', ['Stroma fibromusculaire', 'Lobe médian', '\\d\\. '],
        '• [Absence de lésion lenticulaire, mal limitée, en hyposignal T2 homogène ou présentant une restriction focale suspecte de la diffusion].', '\\[Absence de lésion lenticulaire'],
    ];
    for (const [zone, titre, suivants, absence, motif] of ZONES) {
      const ns = L.filter(l => l.zone === zone).map(l => l.n);
      t = dansRubrique(t, rubrique(t, titre, suivants), s => s.replace(new RegExp(`^• (${motif}[^\\n]*|Lésions? cibles? n° [^\\n]*\\(voir ci-dessous\\)\\.)$`, 'm'), () => (ns.length ? renvoi(ns) : absence)));
    }

    /* 3. Lésions cibles */
    const sec = rubrique(t, '3\\. Lésion cible prostatique', ['4\\. Bilan']);
    if (sec) {
      let s = t.slice(sec[0], sec[1]);
      for (const l of L) {
        const debut = s.search(new RegExp(`^Lésion cible n° ${l.n} :`, 'm'));
        if (debut >= 0) {
          const apres = s.slice(debut + 1).search(/^(Lésion cible n° \d+ :|\[Reprendre)/m);
          const fin = apres >= 0 ? debut + 1 + apres : s.replace(/\s+$/, '').length;
          s = s.slice(0, debut) + remplirBloc(s.slice(debut, fin), l) + s.slice(fin);
        } else {
          const bloc = remplirBloc(BLOC.replace('{n}', l.n), l) + '\n\n';
          const ici = s.search(/^\[Reprendre/m);
          s = ici >= 0 ? s.slice(0, ici) + bloc + s.slice(ici) : s.replace(/\s*$/, '\n\n') + bloc;
        }
      }
      t = t.slice(0, sec[0]) + s + t.slice(sec[1]);
    }

    /* CONCLUSION */
    const conc = rubrique(t, 'CONCLUSION :', []);
    t = dansRubrique(t, conc, c => {
      if (r.volume != null) c = c.replace(/^(• Prostate de volume estimé à )[^\n]*?( cm³)/m, `$1${fr(r.volume, 0)}$2`);
      if (r.densite != null) c = c.replace(/(une densité du PSA à )[^\n]*?( ng\/mL\/cm³\.)$/m, `$1${fr(r.densite, 2)}$2`);
      // lignes « lésion » : le choix du modèle, ou les lignes écrites par un insert précédent
      const lignesLesion = new RegExp(`^• (\\[Absence de lésion prostatique suspecte[^\\n]*|Absence de lésion prostatique suspecte\\.|Lésion cible prostatique[^\\n]*)$`, 'gm');
      const nouvelles = L.length ? L.map(l => conclusionLesion(l, L.length > 1)).join('\n') : '• Absence de lésion prostatique suspecte.';
      let fait = false;
      c = c.replace(lignesLesion, () => (fait ? '\u0000' : (fait = true, nouvelles))).replace(/\n\u0000(?=\n|$)/g, '');
      // extension extraprostatique
      const epe = L.some(l => l.epe === 'oui') ? 'oui' : L.length && L.every(l => l.epe === 'non') ? 'non' : '';
      const reEpe = new RegExp(`^• (\\[Absence de signe d${A}extension extraprostatique[^\\n]*|Absence de signe d${A}extension extraprostatique\\.|Signes d${A}extension extraprostatique[^\\n]*)$`, 'm');
      if (epe === 'non' || !L.length) c = c.replace(reEpe, '• Absence de signe d’extension extraprostatique.');
      if (epe === 'oui') c = c.replace(reEpe, '• Signes d’extension extraprostatique au niveau [X], score EPE [X].');
      return c;
    });
    return { texte: t };
  }

  return { integrer, estModele, BLOC };
});
