/* =========================================================
   RadiologicHub — Recommandations de la Société Fleischner 2017
   Nodules pulmonaires de découverte fortuite en TDM.

   Références :
   • MacMahon H, Naidich DP, Goo JM, et al. Guidelines for Management
     of Incidental Pulmonary Nodules Detected on CT Images: From the
     Fleischner Society 2017. Radiology 2017;284:228-243.
     doi:10.1148/radiol.2017161659
   • Bankier AA, MacMahon H, Goo JM, et al. Recommendations for
     Measuring Pulmonary Nodules at CT: A Statement from the
     Fleischner Society. Radiology 2017;285:584-600.
     doi:10.1148/radiol.2017162894

   Module sans dépendance au navigateur (testé sous Node :
   tests/fleischner.test.js). Seuils et textes À FAIRE VÉRIFIER
   MÉDICALEMENT avant usage clinique.
   ========================================================= */

(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.RHRegles = root.RHRegles || {}).fleischner = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const SEUILS = Object.freeze({
    petitMm: 6,              // < 6 mm : petit nodule
    moyenMaxMm: 8,           // 6 à 8 mm ; > 8 mm : grand nodule (nodules solides)
    volPetitMm3: 100,        // < 100 mm³ (équivalent de < 6 mm)
    volMoyenMaxMm3: 250,     // 100 à 250 mm³ (6 à 8 mm) ; > 250 mm³ (> 8 mm)
    composanteSuspecteMm: 6, // partiellement solide : composante solide ≥ 6 mm = hautement suspect s'il persiste
    ganglionMaxMm: 10,       // ganglion intrapulmonaire typique retenu si diamètre moyen < 10 mm (voir ganglionTypique)
    ageMin: 35,              // recommandations applicables à partir de 35 ans
  });

  const TYPES = { solide: 'solide', 'verre-depoli': 'en verre dépoli pur', 'part-solide': 'partiellement solide' };
  const LOBES = {
    LSD: 'du lobe supérieur droit', LM: 'du lobe moyen', LID: 'du lobe inférieur droit',
    LSG: 'du lobe supérieur gauche', lingula: 'de la lingula', LIG: 'du lobe inférieur gauche',
  };
  const CONTEXTES = {
    fortuit: 'Découverte fortuite, patient de 35 ans ou plus',
    depistage: 'Dépistage du cancer du poumon',
    cancer: 'Cancer connu (bilan ou suivi)',
    immunodep: 'Patient immunodéprimé',
    jeune: 'Patient de moins de 35 ans',
  };
  const NON_APPLICABLE = {
    depistage: 'dépistage du cancer du poumon : utiliser la classification Lung-RADS',
    cancer: 'patient avec un cancer connu : surveillance selon le contexte oncologique',
    immunodep: 'patient immunodéprimé : conduite selon le contexte clinique (cause infectieuse possible)',
    jeune: 'patient de moins de 35 ans : conduite selon le contexte clinique',
  };

  /*
   * Nodule périscissural / juxtapleural d'aspect typique de ganglion intrapulmonaire (Fleischner 2017) :
   * nodule SOLIDE, au contact d'une scissure ou de la plèvre, de forme ovale, lenticulaire ou triangulaire,
   * homogène à contours lisses, sans signe suspect → pas de surveillance, même si le diamètre moyen dépasse 6 mm.
   * Les trois critères sont exigés. La localisation sous le niveau de la carène et la ligne septale vers la plèvre
   * sont des arguments fréquents mais NE SONT PAS exigés par la recommandation.
   * Limite de taille : Fleischner 2017 n'en fixe pas ; les séries sur lesquelles elle s'appuie portent sur des
   * nodules jusqu'à ~10 mm et la définition du nodule juxtapleural de Lung-RADS v2022 retient < 10 mm.
   */
  const CRITERES_GANGLION = {
    pfnContact: 'au contact d\'une scissure ou de la plèvre',
    pfnForme: 'de forme ovale, lenticulaire ou triangulaire',
    pfnContours: 'homogène à contours lisses',
  };
  const ARGUMENTS_GANGLION = { pfnSeptale: 'avec une ligne septale vers la plèvre', pfnCarene: 'situé sous le niveau de la carène' };
  function ganglionTypique(n) {
    const manque = Object.keys(CRITERES_GANGLION).filter(k => !n[k]);
    const evoque = Object.keys({ ...CRITERES_GANGLION, ...ARGUMENTS_GANGLION }).some(k => n[k]);
    const t = taille(n);
    const tropGros = t.mm != null && t.mm >= SEUILS.ganglionMaxMm;
    return {
      evoque, manque: manque.map(k => CRITERES_GANGLION[k]), suspect: !!n.suspect, tropGros, solide: n.type === 'solide',
      ok: n.type === 'solide' && !manque.length && !n.suspect && !tropGros,
    };
  }

  /* Niveaux de conduite (du moins au plus intensif) — sert à désigner le nodule le plus suspect */
  const RANGS = ['pas de surveillance', 'TDM optionnelle à 12 mois', 'TDM à 6–12 mois', 'TDM à 3–6 mois', 'TDM à 3 mois, TEP-TDM ou prélèvement'];

  const num = v => { const n = parseFloat(String(v ?? '').replace(',', '.')); return Number.isFinite(n) && n > 0 ? n : null; };

  /* Taille : moyenne du grand et du petit axe (même coupe), arrondie au millimètre */
  function taille(n) {
    const a = num(n.grandAxe), b = num(n.petitAxe), v = num(n.volume);
    const out = { grand: a, petit: b, volume: v, moyenne: null, mm: null, note: '' };
    if (a != null && b != null) out.moyenne = (a + b) / 2;
    else if (a != null || b != null) { out.moyenne = a ?? b; out.note = 'un seul diamètre renseigné'; }
    if (out.moyenne != null) out.mm = Math.round(out.moyenne);
    return out;
  }

  /* Classe de taille : 'petit' (< 6 mm), 'moyen' (6–8 mm), 'grand' (> 8 mm) ; volume prioritaire pour un nodule solide */
  function classe(n) {
    const t = taille(n);
    if (n.type === 'solide' && t.volume != null) {
      return { cle: t.volume < SEUILS.volPetitMm3 ? 'petit' : t.volume <= SEUILS.volMoyenMaxMm3 ? 'moyen' : 'grand', par: 'volume', t };
    }
    if (t.mm == null) return { cle: null, par: null, t };
    return { cle: t.mm < SEUILS.petitMm ? 'petit' : t.mm <= SEUILS.moyenMaxMm ? 'moyen' : 'grand', par: 'diametre', t };
  }

  const LIB_CLASSE = {
    solide: { petit: 'de moins de 6 mm', moyen: 'de 6 à 8 mm', grand: 'de plus de 8 mm' },
    vol: { petit: 'de moins de 100 mm³', moyen: 'de 100 à 250 mm³', grand: 'de plus de 250 mm³' },
    sub: { petit: 'de moins de 6 mm', moyen: 'de 6 mm ou plus', grand: 'de 6 mm ou plus' },
  };

  /* Conduite pour UN nodule. risque : 'faible' | 'eleve' ; multiple : booléen */
  function conduite(n, risque, multiple) {
    const c = classe(n);
    // court : libellé bref (pastilles de l'interface)
    const r = (rang, texte, extra = {}) => ({ rang, texte, court: rang == null ? '' : RANGS[rang], classe: c.cle, par: c.par, taille: c.t, ...extra });
    if (!TYPES[n.type]) return r(null, '', { manque: 'type du nodule' });
    if (n.benin) return r(0, 'pas de surveillance (critères de bénignité : calcification de type bénin ou graisse)', { cas: 'benin', court: 'pas de surveillance (bénin)' });
    if (c.cle == null) return r(null, '', { manque: 'taille du nodule' });

    if (n.type === 'solide') {
      if (ganglionTypique(n).ok) {
        return r(0, 'pas de surveillance (nodule périscissural ou juxtapleural d\'aspect typique de ganglion intrapulmonaire)', { cas: 'ganglion', court: 'pas de surveillance (ganglion intrapulmonaire)' });
      }
      const eleve = risque === 'eleve';
      if (c.cle === 'petit') {
        return eleve
          ? r(1, `TDM optionnelle à 12 mois${n.suspect ? ' (à privilégier ici : morphologie suspecte)' : ''}`)
          : r(0, 'pas de surveillance systématique');
      }
      if (!multiple && c.cle === 'grand') return r(4, 'à envisager : TDM à 3 mois, TEP-TDM ou prélèvement tissulaire');
      if (!multiple) return eleve ? r(2, 'TDM à 6–12 mois, puis TDM à 18–24 mois') : r(2, 'TDM à 6–12 mois, puis à envisager à 18–24 mois');
      return eleve ? r(3, 'TDM à 3–6 mois, puis TDM à 18–24 mois') : r(3, 'TDM à 3–6 mois, puis à envisager à 18–24 mois');
    }

    // Nodules subsolides (verre dépoli pur, partiellement solide) : pas de modulation par le risque
    const sol = num(n.composanteSolide);
    if (multiple) {
      if (c.cle === 'petit') return r(3, 'TDM à 3–6 mois ; si stabilité, TDM à envisager à 2 et 4 ans');
      // ≥ 6 mm : contrôle à 3–6 mois, puis conduite du nodule le plus suspect selon les règles du nodule unique
      const suite = n.type === 'verre-depoli'
        ? 'si persistant, TDM tous les 2 ans jusqu\'à 5 ans'
        : sol == null ? 'selon la taille de sa composante solide'
          : sol >= SEUILS.composanteSuspecteMm ? 'un nodule persistant dont la composante solide mesure 6 mm ou plus est hautement suspect (conduite à discuter en réunion de concertation pluridisciplinaire)'
            : 'si inchangé avec une composante solide toujours inférieure à 6 mm, TDM annuelle pendant 5 ans';
      return r(n.type === 'part-solide' && sol != null && sol >= SEUILS.composanteSuspecteMm ? 4 : 3,
        `TDM à 3–6 mois, puis conduite selon le nodule le plus suspect — ${suite}`,
        n.type === 'part-solide' && sol == null ? { manque: 'composante solide' }
          : n.type === 'part-solide' && sol >= SEUILS.composanteSuspecteMm ? { cas: 'composante-suspecte', court: 'TDM à 3–6 mois — hautement suspect si persistant' } : {});
    }
    if (c.cle === 'petit') {
      return n.suspect
        ? r(1, 'pas de surveillance systématique ; aspect suspect : TDM à envisager à 2 et 4 ans')
        : r(0, 'pas de surveillance systématique');
    }
    if (n.type === 'verre-depoli') return r(2, 'TDM à 6–12 mois pour confirmer la persistance, puis TDM tous les 2 ans jusqu\'à 5 ans');
    if (sol == null) return r(3, 'TDM à 3–6 mois pour confirmer la persistance ; suite selon la taille de la composante solide', { manque: 'composante solide' });
    if (sol >= SEUILS.composanteSuspecteMm) {
      return r(4, 'TDM à 3–6 mois pour confirmer la persistance ; un nodule persistant dont la composante solide mesure 6 mm ou plus est hautement suspect (conduite à discuter en réunion de concertation pluridisciplinaire)', { cas: 'composante-suspecte', court: 'TDM à 3–6 mois — hautement suspect si persistant' });
    }
    return r(3, 'TDM à 3–6 mois pour confirmer la persistance ; si inchangé avec une composante solide toujours inférieure à 6 mm, TDM annuelle pendant 5 ans');
  }

  /* Libellé de la ligne du tableau Fleischner utilisée */
  function ligneTableau(n, cd, multiple) {
    if (cd.classe == null || cd.cas === 'benin' || cd.cas === 'ganglion') return '';
    const classeTxt = (n.type !== 'solide' ? LIB_CLASSE.sub : cd.par === 'volume' ? LIB_CLASSE.vol : LIB_CLASSE.solide)[cd.classe];
    return multiple
      ? `nodules multiples dont le plus suspect est ${TYPES[n.type]}, ${classeTxt}`
      : `nodule unique ${TYPES[n.type]} ${classeTxt}`;
  }

  /*
   * Évaluation complète.
   * st = { contexte, risque: '' | 'faible' | 'eleve', autresNodules: bool, nodules: [{ type, lobe, grandAxe, petitAxe,
   *        volume, composanteSolide, benin, suspect, pfnContact, pfnForme, pfnContours, pfnSeptale, pfnCarene }] }
   * risque '' (non précisé) : les deux conduites sont données quand elles diffèrent.
   */
  function evaluer(st) {
    const nodules = (st.nodules || []);
    const multiple = nodules.length > 1 || !!st.autresNodules;
    const res = { applicable: true, motif: '', multiple, nodules: [], guide: null, rang: null, texte: '', risque: st.risque || '' };
    if (st.contexte && st.contexte !== 'fortuit') {
      res.applicable = false;
      res.motif = NON_APPLICABLE[st.contexte] || '';
    }
    res.nodules = nodules.map((n, i) => {
      const parRisque = {};
      ['faible', 'eleve'].forEach(k => { parRisque[k] = conduite(n, k, multiple); });
      let cd;
      if (st.risque === 'faible' || st.risque === 'eleve') cd = parRisque[st.risque];
      else {
        const f = parRisque.faible, e = parRisque.eleve;
        cd = f.texte === e.texte ? f : {
          ...e, rang: Math.max(f.rang ?? -1, e.rang ?? -1), deuxRisques: true,
          texte: `chez un patient à faible risque, ${f.texte} ; chez un patient à haut risque, ${e.texte}`,
          court: f.court === e.court ? f.court : `${f.court} (faible risque) ou ${e.court} (haut risque)`,
        };
      }
      return { i, n, ...cd, ligne: ligneTableau(n, cd, multiple) };
    });
    if (!res.applicable) return res;
    const evalues = res.nodules.filter(x => x.rang != null);
    if (evalues.length) {
      // nodule le plus suspect : conduite la plus intensive, puis le plus gros
      const g = evalues.slice().sort((a, b) => (b.rang - a.rang) || ((b.taille.mm || 0) - (a.taille.mm || 0)) || (a.i - b.i))[0];
      res.guide = g.i;
      res.rang = g.rang;
      res.texte = g.texte;
    }
    return res;
  }

  /* Une TDM de contrôle est-elle proposée ? (pour la mention de technique) */
  const proposeTdm = texte => /TDM/.test(texte || '');

  return {
    SEUILS, TYPES, LOBES, CONTEXTES, NON_APPLICABLE, RANGS, CRITERES_GANGLION, ARGUMENTS_GANGLION,
    taille, classe, ganglionTypique, conduite, evaluer, proposeTdm,
  };
});
