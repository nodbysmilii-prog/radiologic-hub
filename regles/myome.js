/* =========================================================
   RadiologicHub — Myomes utérins : classification FIGO et
   caractérisation IRM (arbre décisionnel signal T2 / rehaussement / ADC)
   ---------------------------------------------------------
   D'après la fiche du service « Le myome utérin dans tous ses états ».
   Classification FIGO des myomes (Munro et al., 2011), initialement
   échographique, utilisable en IRM.
   Module sans dépendance au navigateur (testé sous Node :
   tests/myome.test.js). À FAIRE VÉRIFIER MÉDICALEMENT.
   ========================================================= */

(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.RHRegles = root.RHRegles || {}).myome = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const FIGO = {
    0: { cat: 'sous-muqueux', desc: 'intracavitaire pédiculé' },
    1: { cat: 'sous-muqueux', desc: '< 50 % intramural' },
    2: { cat: 'sous-muqueux', desc: '> 50 % intramural' },
    3: { cat: 'interstitiel', desc: 'intramural au contact de la muqueuse' },
    4: { cat: 'interstitiel', desc: 'intramural' },
    5: { cat: 'sous-séreux', desc: '> 50 % intramural' },
    6: { cat: 'sous-séreux', desc: '< 50 % intramural' },
    7: { cat: 'sous-séreux', desc: 'pédiculé' },
    8: { cat: 'autre', desc: 'autre localisation (col, ligament large…)' },
    '2-5': { cat: 'transmural', desc: 'sous-muqueux type 2 et sous-séreux type 5' },
  };
  const TYPES = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '2-5'];
  const CATEGORIES = {
    'sous-muqueux': { label: 'Sous-muqueux (0–2)', c: '#e0822a' },
    interstitiel: { label: 'Interstitiel (3–4)', c: '#2a9d8f' },
    'sous-séreux': { label: 'Sous-séreux (5–7)', c: '#2f5fb3' },
    transmural: { label: 'Transmural (2-5)', c: '#8c6bb1' },
    autre: { label: 'Autre (8)', c: '#8b8a96' },
  };
  const categorie = type => (FIGO[type] ? FIGO[type].cat : null);
  const couleur = type => (FIGO[type] ? CATEGORIES[FIGO[type].cat].c : '#ffffff');
  const libelleType = type => (FIGO[type] ? `FIGO ${type} (${FIGO[type].cat}, ${FIGO[type].desc})` : '');

  const PAROIS = {
    anterieure: 'paroi antérieure', posterieure: 'paroi postérieure', fundique: 'fundique',
    'laterale-droite': 'paroi latérale droite', 'laterale-gauche': 'paroi latérale gauche',
  };
  const NIVEAUX = { fundus: 'du fundus', corps: 'du corps utérin', isthme: 'de l\'isthme' };
  const SPECIAUX = { col: 'du col utérin', 'ligament-droit': 'du ligament large droit', 'ligament-gauche': 'du ligament large gauche', parasite: 'parasite, à distance de l\'utérus' };

  /* Localisation en toutes lettres */
  function localisation(m) {
    if (m.type === '8' && SPECIAUX[m.special]) return SPECIAUX[m.special];
    if (m.paroi === 'fundique') return 'fundique';
    if (!PAROIS[m.paroi]) return '';
    return `${PAROIS[m.paroi]}${NIVEAUX[m.niveau] ? ' ' + NIVEAUX[m.niveau] : ''}`;
  }

  const num = v => { const n = parseFloat(String(v ?? '').replace(',', '.')); return Number.isFinite(n) && n > 0 ? n : null; };
  const dims = m => [m.d1, m.d2, m.d3].map(num).filter(Boolean);
  const tailleMax = m => Math.max(0, ...dims(m));
  const volume = (a, b, c) => { const v = [a, b, c].map(num); return v.every(Boolean) ? v[0] * v[1] * v[2] * 0.52 / 1000 : null; };

  /*
   * Arbre décisionnel (IRM) — t2 : 'hypo' | 'hyper' | 'intermediaire' ;
   * rehaussement : 'homogene' | 'heterogene' | 'absent' ; t1 : 'non' | 'peripherique' | 'diffus' ;
   * adc : × 10⁻³ mm²/s.  → { diagnostic, niveau: 'benin' | 'attention' | 'suspect' | null, note }
   */
  const ADC_CELLULAIRE = 1.2, ADC_SARCOME = 0.8;
  function caracteriser({ t2, rehaussement, t1, adc } = {}) {
    const r = (diagnostic, niveau, note = '') => ({ diagnostic, niveau, note });
    if (t2 === 'hypo') {
      if (rehaussement === 'homogene') return r('myome simple', 'benin');
      if (rehaussement === 'absent') return r('dégénérescence hyaline', 'benin', 'aspect identique après embolisation (dévascularisation du myome)');
      return r(null, null, 'renseignez le rehaussement (homogène ou absent)');
    }
    if (t2 === 'hyper') {
      if (rehaussement === 'heterogene') return r('dégénérescence myxoïde', 'attention', 'une dégénérescence myxoïde peut s\'observer dans un léiomyosarcome : vérifier l\'absence de signe de malignité');
      if (rehaussement === 'absent') return r('dégénérescence kystique', 'benin');
      return r(null, null, 'renseignez le rehaussement (hétérogène ou absent)');
    }
    if (t2 === 'intermediaire') {
      if (t1 === 'peripherique' || t1 === 'diffus') return r('nécrobiose aseptique', 'benin', 'contexte de douleurs pelviennes ; pas de rehaussement');
      const a = num(adc);
      if (a == null) return r(null, null, 'mesurez l\'ADC (× 10⁻³ mm²/s)');
      if (a > ADC_CELLULAIRE) return r('myome cellulaire', 'attention', 'diagnostic différentiel : léiomyosarcome');
      if (a >= ADC_SARCOME) return r('myome indéterminé', 'attention', 'ADC entre 0,8 et 1,2 × 10⁻³ mm²/s');
      return r('suspicion de sarcome utérin', 'suspect', 'ADC < 0,8 × 10⁻³ mm²/s');
    }
    return r(null, null, '');
  }

  const REMANIEMENTS = {
    hemorragique: 'remaniement hémorragique (hypersignal T1 persistant après saturation de la graisse)',
    graisseux: 'remaniement graisseux (lipoléiomyome : hypersignal T1 et T2, hyposignal T1 avec saturation de la graisse)',
    calcique: 'myome calcifié (absence de signal périphérique sur l\'ensemble des séquences)',
  };

  /* Arguments en faveur d'un léiomyosarcome présents pour un myome */
  function argumentsSarcome(m) {
    const a = [];
    if (m.contours === 'irreguliers') a.push('contours irréguliers');
    if (m.necrose) a.push('remaniements nécrotico-hémorragiques');
    const c = caracteriser(m);
    if (c.niveau === 'suspect') a.push('ADC < 0,8 × 10⁻³ mm²/s');
    return a;
  }

  return { FIGO, TYPES, CATEGORIES, PAROIS, NIVEAUX, SPECIAUX, categorie, couleur, libelleType, localisation, dims, tailleMax, volume, caracteriser, REMANIEMENTS, argumentsSarcome, ADC_CELLULAIRE, ADC_SARCOME };
});
