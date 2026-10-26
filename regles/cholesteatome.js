/* =========================================================
   RadiologicHub — Cholestéatome : outils de la fiche (fiches/cholesteatome.html)
   ---------------------------------------------------------
   • tdm(signes)      : comblement de l'oreille moyenne en TDM → cholestéatome ou OMC non
                        cholestéatomateuse (OMCNC) ? (bords, ostéolyse, effet de masse, siège)
   • irm(signaux)     : tissu de comblement en IRM (T1, T2, diffusion b1000, gadolinium tardif)
                        → cholestéatome, tissu fibro-inflammatoire, granulome à cholestérine
   • compteRendu(o)   : phrases du compte rendu préopératoire à partir des cases cochées
   Module sans dépendance au navigateur (testé sous Node : tests/cholesteatome.test.js).
   ========================================================= */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.RHRegles = root.RHRegles || {}).cholesteatome = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* signes : { convexe, lyse, effetMasse, attical, diffus, contexte } (booléens)
     convexe : opacité nodulaire à bords convexes dans les 3 plans ; lyse : ostéolyse à front lisse ;
     effetMasse : chaîne refoulée ; attical : siège attical supéro-latéral ; diffus : comblement en plage,
     bords non convexes ; contexte : otoscopie évocatrice (poche non contrôlable, perforation marginale…) */
  function tdm(s = {}) {
    const pour = ['convexe', 'lyse', 'effetMasse', 'attical'].filter(k => s[k]);
    if (!pour.length && !s.diffus) return { verdict: '', niveau: '', explication: 'Cochez ce que vous voyez.' };
    if (s.lyse && (s.convexe || s.effetMasse))
      return { verdict: 'Cholestéatome', niveau: 'grave', explication: 'Masse et ostéolyse à front lisse : caractère agressif. Cartographier l\'extension.' };
    if (s.convexe && (s.effetMasse || s.attical))
      return { verdict: 'Cholestéatome probable', niveau: 'grave', explication: 'Opacité nodulaire à bords convexes, attical ou avec effet de masse : rechercher une ostéolyse (mur de la logette, osselets).' };
    if (s.lyse && !s.convexe && s.contexte)
      return { verdict: 'Évoquer un cholestéatome évacué', niveau: 'key', explication: 'Pas de masse, mais séquelles d\'agressivité (atticotomie, ostéolyse) dans un contexte otoscopique évocateur.' };
    if (s.diffus && !s.lyse && !s.effetMasse && !s.convexe)
      return { verdict: 'OMC non cholestéatomateuse', niveau: 'sign', explication: 'Comblement en plage à bords non convexes, sans ostéolyse ni déplacement ossiculaire. Si doute clinique (enfant, comblement diffus) : IRM de diffusion.' };
    return { verdict: 'Doute', niveau: 'ddx', explication: 'Signes incomplets ou discordants : IRM de diffusion non-EPI.' };
  }

  /* signaux : { t1: 'hypo'|'hyper', t2: 'hypo'|'hyper', diffusion: 'hyper'|'hypo', gado: 'aucune'|'tardive'|'peripherique' } */
  function irm(g = {}) {
    if (g.t1 === 'hyper') return { tissu: 'Granulome à cholestérine', niveau: 'ddx', explication: 'Hypersignal T1 spontané (et T2) : produits de dégradation de l\'hémoglobine.' };
    if (g.diffusion === 'hyper' && g.gado !== 'tardive') return { tissu: 'Cholestéatome', niveau: 'grave', explication: 'Hypersignal en diffusion b1000 (kératine, diffusion restreinte), hyposignal T1, pas de prise de contraste centrale (un liseré périphérique est possible).' };
    if (g.gado === 'tardive' || g.diffusion === 'hypo') return { tissu: 'Tissu fibro-inflammatoire', niveau: 'sign', explication: 'Prise de contraste tardive (≈ 30 min), pas d\'hypersignal en diffusion.' };
    if (!g.t1 && !g.t2 && !g.diffusion && !g.gado) return { tissu: '', niveau: '', explication: 'Choisissez les signaux observés.' };
    return { tissu: 'Indéterminé', niveau: 'ddx', explication: 'Compléter par la diffusion non-EPI (b1000) et un T1 gadolinium tardif.' };
  }

  /* o : { cote, siege, extension: [], lyses: [], risques: [], variantes: [] } */
  const LIBELLES = {
    extension: { attique: 'l\'attique', mesotympan: 'le mésotympan', hypotympan: 'l\'hypotympan', retro: 'le rétrotympanum (sinus tympani)', aditus: 'l\'aditus ad antrum', antre: 'l\'antre', mastoide: 'les cellules mastoïdiennes', cae: 'le conduit auditif externe' },
    lyses: { mur: 'du mur de la logette', marteau: 'de la tête du marteau', enclume: 'de la longue apophyse de l\'enclume', etrier: 'de la superstructure de l\'étrier' },
    risques: { tegmen: 'lyse du tegmen', fistule: 'fistule du canal semi-circulaire latéral', facial: 'dénudation du canal facial (segment tympanique)', vasculaire: 'atteinte d\'un canal vasculaire' },
    variantes: { tegmen: 'tegmen bas situé', golfe: 'golfe jugulaire procident', sigmoide: 'sinus sigmoïde antérieur', facial: 'canal facial procident' },
  };
  const liste = a => a.length <= 1 ? (a[0] || '') : a.slice(0, -1).join(', ') + ' et ' + a[a.length - 1];
  function compteRendu(o = {}) {
    const cote = o.cote === 'gauche' ? 'gauche' : 'droite';
    const ext = (o.extension || []).map(k => LIBELLES.extension[k]).filter(Boolean);
    const lyses = (o.lyses || []).map(k => LIBELLES.lyses[k]).filter(Boolean);
    const risques = (o.risques || []).map(k => LIBELLES.risques[k]).filter(Boolean);
    const variantes = (o.variantes || []).map(k => LIBELLES.variantes[k]).filter(Boolean);
    const r = [];
    r.push(`Comblement tissulaire de l'oreille moyenne ${cote}, d'allure nodulaire, à bords convexes, ${ext.length ? 'étendu à ' + liste(ext) : 'de siège attical'}, refoulant le bloc incudo-malléaire en dedans.`);
    r.push(lyses.length ? `Ostéolyse à front lisse ${liste(lyses)}.` : 'Pas d\'ostéolyse ossiculaire ni du mur de la logette.');
    r.push(risques.length ? `${liste(risques).replace(/^./, c => c.toUpperCase())}.` : 'Tegmen, labyrinthe, canal facial et canaux vasculaires respectés.');
    if (variantes.length) r.push(`Variantes à signaler au chirurgien : ${liste(variantes)}.`);
    const concl = `Cholestéatome de l'oreille moyenne ${cote}${risques.length ? ', compliqué de ' + liste(risques) : ''}.`;
    return { resultats: r, conclusion: concl };
  }

  return { tdm, irm, compteRendu, LIBELLES };
});
