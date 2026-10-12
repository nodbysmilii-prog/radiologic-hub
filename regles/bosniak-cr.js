/* =========================================================
   RadiologicHub — Bosniak 2019 dans les comptes rendus (scanner, IRM) :
   aide à l'écriture
   ---------------------------------------------------------
   • description de chaque lésion à partir des critères du calculateur
     (côté, siège, taille, développement, paroi, cloisons, protrusion,
     calcifications, contenu) ; la catégorie n'est écrite que dans la
     conclusion ;
   • integrer(compte rendu, état) : les lésions sont décrites sous la
     ligne des reins du compte rendu type (« Les reins sont en place… »),
     dont la phrase contredite « sans masse solide ou kystique
     décelable » est retirée (ou gardée pour l'autre rein) ; sans ligne
     des reins, à la fin des constatations de la rubrique RÉSULTATS
     (sous « Par ailleurs : » si elle a des sous-titres) ; conclusion (AU TOTAL,
     CONCLUSION…, ajoutée s'il n'y en a pas) : une ligne par lésion,
     « … classée Bosniak X (version 2019) : conduite à tenir », et au
     choix les conseils de l'outil (IRM).
   Le classement reste celui du calculateur (outils/bosniak-rules.js),
   passé à creer(). Module sans dépendance au navigateur (testé sous
   Node : tests/bosniak-cr.test.js). À FAIRE VÉRIFIER MÉDICALEMENT.
   ========================================================= */

(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.RHRegles = root.RHRegles || {}).bosniakCR = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const norm = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const num = v => { if (v === '' || v == null) return null; const n = parseFloat(String(v).replace(',', '.').replace('−', '-')); return Number.isFinite(n) ? n : null; };
  const fr = n => String(Math.round(n * 10) / 10).replace('.', ',').replace('-', '−');
  const ni = a => (a.length < 2 ? a.join('') : `${a.slice(0, -1).join(', ')} ni ${a[a.length - 1]}`);

  /* Champs propres au compte rendu (le reste vient du calculateur) */
  const COTES = [['', '—'], ['droit', 'Droit'], ['gauche', 'Gauche']];
  const SIEGES = [['', '—'], ['sup', 'Pôle supérieur'], ['moy', 'Médio-rénal'], ['inf', 'Pôle inférieur']];
  const DEVELOPPEMENTS = [['', '—'], ['exophytique', 'Exophytique'], ['endophytique', 'Endophytique'], ['mixte', 'Mixte']];
  const SIEGE_TXT = { sup: ['polaire supérieur', 'polaire supérieure'], moy: ['médio-rénal', 'médio-rénale'], inf: ['polaire inférieur', 'polaire inférieure'] };
  const EXAMEN = ['modalite', 'injection'];            // communs à toutes les lésions du compte rendu

  /* Textes des critères */
  const EP_CLOISONS = { '<=2': 'fines (≤ 2 mm)', '3': 'lisses de 3 mm', '>=4': 'épaisses (≥ 4 mm)' };
  const PROTRUSION = { 'obtus<=3': 'protrusion de 3 mm ou moins à angle obtus', 'obtus>=4': 'protrusion de 4 mm ou plus à angle obtus', aigu: 'protrusion à angle aigu' };
  const CALCIF = { fines: 'calcifications fines', epaisses: 'calcifications épaisses ou nodulaires' };
  const ORIGINE = '[infectieuse / inflammatoire / vasculaire / héréditaire]';

  /* Conclusion : nom de la lésion (féminin ?) et conduite à tenir, par catégorie */
  const NOM = { I: ['Kyste simple', false], II: ['Kyste', false], IIF: ['Lésion kystique', true], III: ['Masse kystique', true], IV: ['Masse kystique', true] };
  const CONDUITE = {
    I: 'bénin, sans surveillance nécessaire.',
    II: 'bénin, sans surveillance nécessaire.',
    IIF: 'contrôle par imagerie à 6 et 12 mois, puis annuel jusqu\'à 5 ans.',
    III: 'malignité intermédiaire ; chirurgie ou surveillance active selon l\'âge et les comorbidités, avis urologique.',
    IV: 'malignité probable (jusqu\'à 90 %) ; avis urologique.',
  };

  /* Lignes écrites par l'outil (réinsertion : remplacées, pas ajoutées) */
  const LIGNE_OUTIL = /^\s*•\s*(Lésion kystique|Masse)\b[^:\n]*\brein (droit|gauche|\[droit \/ gauche\])[^:\n]*:/;
  const CONCLUSION_OUTIL = /^\s*•?\s*(Kyste|Lésion kystique|Masse)\b.*\bBosniak\b/;
  const CONSEIL_OUTIL = /^\s*•?\s*(IRM (conseillée|recommandée)\b|À compléter par une imagerie avec injection\b)/;
  /* Ligne des reins des comptes rendus types, phrase normale contredite, conclusion normale */
  const REINS = /^\s*•?\s*(les )?reins?\b/;
  const SANS_MASSE = /,?\s*sans masse solide ou kystique décelable(?:\s+à (?:droite|gauche))?/;
  const SANS_LESION_NI = /sans lésion focale ni /;
  const SANS_LESION = /,?\s*sans lésion focale(?: décelable)?(?:\s+à (?:droite|gauche))?(?=\s*[.,;]|\s*$)/;
  const SANS_ANOMALIE = /\bsans anomalie\b/;

  /* Titres du compte rendu (mêmes règles que pour BI-RADS et OsteoGamme) */
  const nomTitre = t => norm(t).replace(/\s*:\s*$/, '').replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ').trim();
  const estTitre = l => { const t = l.trim(); return /:$/.test(t) && t.length <= 90 && !/^[•*–-]/.test(t) && !/[[\]]/.test(t); };
  const enMajuscules = t => { const l = t.replace(/[^\p{L}]/gu, ''); return l.length >= 2 && l === l.toUpperCase(); };
  const estBorne = l => estTitre(l) && (enMajuscules(l.trim()) || /^[IVX]+\s*[/.)–-]/.test(l.trim()));
  const estConclusion = l => estTitre(l) && ['conclusion', 'au total', 'en conclusion', 'synthese'].includes(nomTitre(l));
  const estResultats = l => estBorne(l) && /^(compte rendu|resultats?|description|constatations?)$/.test(nomTitre(l));
  const estSousTitre = l => { const t = l.trim(); return /:$/.test(t) && t.length <= 90 && !/^•/.test(t); };   // « *Étude médiastinale : », « 2- Étage thoracique : »…
  const finRubrique = (L, i) => { for (let j = i + 1; j < L.length; j++) if (estBorne(L[j])) return j; return L.length; };

  /* R : règles du calculateur (outils/bosniak-rules.js) */
  function creer(R) {
    const sansExamen = e => { const o = { ...e }; EXAMEN.forEach(k => delete o[k]); return o; };
    const nouvelleLesion = () => ({ cote: '', siege: '', dev: '', taille: '', e: sansExamen(R.DEFAUT) });
    const init = () => ({ modalite: R.DEFAUT.modalite, injection: R.DEFAUT.injection, lesions: [nouvelleLesion()], active: 0, reco: true });

    /* Entrées du calculateur pour une lésion (examen commun + critères de la lésion) */
    const entrees = (st, L) => ({ ...R.DEFAUT, ...L.e, modalite: st.modalite, injection: st.injection });
    const classer = (st, L) => R.classer(entrees(st, L));
    /* Choix d'un critère : mêmes valeurs par défaut que la page (protrusion qui apparaît → rehaussée…) */
    const choisir = (st, L, champ, valeur) => sansExamen(R.choisir(entrees(st, L), champ, valeur));

    const tailleTxt = L => { const t = String(L.taille ?? '').trim(); return !t ? '[x] mm' : /\b(mm|cm)\b/i.test(t) ? t : `${t} mm`; };
    const tailleMm = L => { const m = String(L.taille ?? '').match(/-?\d+(?:[.,]\d+)?/); if (!m) return null; const n = num(m[0]); return /cm/i.test(L.taille) ? n * 10 : n; };
    const lieu = (L, fem) => `${L.siege ? ` ${SIEGE_TXT[L.siege][fem ? 1 : 0]}` : ''} du rein ${L.cote || '[droit / gauche]'}`;
    const avecTaille = L => (String(L.taille ?? '').trim() ? ` de ${tailleTxt(L)}` : '');

    const rh = (inj, v, pl) => (!inj ? '' : v === 'oui' ? (pl ? ', rehaussées' : ', rehaussée') : (pl ? ', non rehaussées' : ', non rehaussée'));
    const homogene = e => e.cloisons === '0' && e.protrusion === 'aucune' && e.paroi === '<=2';

    function contenu(e) {
      if (e.modalite === 'irm') {
        const s = [];
        if (e.t2Lcr === 'oui') s.push('en hypersignal T2 homogène proche du liquide cérébro-spinal');
        if (e.t1Hyper === 'oui') s.push('en hypersignal T1 homogène (≥ 2,5 fois le parenchyme rénal)');
        if (e.t1FsHetero === 'oui') s.push('en hypersignal T1 hétérogène avec saturation de la graisse');
        return s.length ? `contenu ${s.join(', ')}` : 'contenu de signal [à préciser]';
      }
      const inj = e.injection === 'oui', sans = num(e.uhSans), portal = inj ? num(e.uhPortal) : null, Rh = R.rehaussementMesure(e);
      const ref = sans != null ? sans : portal;
      const nature = sans != null && sans >= 70 ? ' spontanément hyperdense' : sans != null && sans > 20 ? ' hyperdense'
        : ref != null && ref >= -9 && ref <= 20 ? ' liquidien' : '';
      const d = [];
      if (sans != null) d.push(`${fr(sans)} UH sans injection`);
      if (portal != null) d.push(`${fr(portal)} UH au temps portal`);
      if (!d.length && Rh.delta == null) { d.push('[x] UH sans injection'); if (inj) d.push('[x] UH au temps portal'); }
      let t = `contenu${nature}${homogene(e) ? ' homogène' : ''}`;
      if (d.length) t += ` mesuré à ${d.join(' et à ')}`;
      if (Rh.delta != null) {
        const q = Rh.niveau === 'franc' ? `rehaussement de ${fr(Rh.delta)} UH` : Rh.niveau === 'equivoque' ? `rehaussement équivoque de ${fr(Rh.delta)} UH` : `rehaussement de ${fr(Rh.delta)} UH, non significatif`;
        t += d.length ? ` (${q})` : `, ${q}`;
      }
      return t;
    }

    /* « Lésion kystique polaire supérieure du rein droit de 32 mm, exophytique : paroi fine (≤ 2 mm), sans cloison… » */
    function description(st, L) {
      const e = entrees(st, L), inj = e.injection === 'oui';
      const dev = L.dev ? (L.dev === 'mixte' ? ', à développement mixte' : `, ${L.dev}`) : '';
      const tete = `${e.tissu === 'oui' ? 'Masse' : 'Lésion kystique'}${lieu(L, true)} de ${tailleTxt(L)}${dev}`;
      if (e.tissu === 'oui') return `${tete} : composante tissulaire rehaussée occupant plus de 25 % du volume de la lésion.`;
      const pos = [e.paroi === '3' ? `paroi lisse de 3 mm${rh(inj, e.paroiRehaussee)}` : e.paroi === '>=4' ? `paroi épaisse (≥ 4 mm)${rh(inj, e.paroiRehaussee)}` : 'paroi fine (≤ 2 mm)'];
      const neg = [];
      if (e.cloisons === '0') neg.push('cloison');
      else pos.push(`${e.cloisons === '>=4' ? '4 cloisons ou plus' : '1 à 3 cloisons'} ${EP_CLOISONS[e.cloisonsEpaisseur]}${rh(inj, e.cloisonsRehaussees, true)}`);
      if (e.protrusion === 'aucune') neg.push('protrusion');
      else pos.push(`${PROTRUSION[e.protrusion]}${rh(inj, e.protrusionRehaussee)}`);
      if (e.calcifications === 'aucune') neg.push('calcification');
      else pos.push(CALCIF[e.calcifications]);
      if (neg.length) pos.push(`sans ${ni(neg)}`);
      let t = `${tete} : ${pos.join(', ')} ; ${contenu(e)}`;
      if (e.tropPetite === 'oui') t += ', trop petite pour être caractérisée';
      if (e.exclusion === 'oui') t += ` ; aspect évoquant une origine ${ORIGINE}`;
      return `${t}.`;
    }

    /* Conclusion d'une lésion : [ligne principale, …lignes de conseil] ; quelle : précision si plusieurs lésions */
    function conclusionLesion(st, L, quelle = '') {
      const r = classer(st, L), e = entrees(st, L), c = r.categorie;
      const conseils = [];
      if (st.reco) {
        for (const x of r.conseils) {
          if (x.startsWith(R.CONSEIL.equivoque)) conseils.push(`IRM conseillée${quelle} : rehaussement équivoque (${fr(r.rehaussement.delta)} UH).`);
          else if (x === R.CONSEIL.calcifEpaisses) conseils.push(`IRM conseillée${quelle} : calcification épaisse ou nodulaire.`);
          else if (x === R.CONSEIL.hyperdense && tailleMm(L) > 30 && L.dev === 'endophytique') conseils.push(`IRM recommandée${quelle} : kyste hyperdense de plus de 3 cm à développement endophytique.`);
        }
      }
      if (r.hors === 'solide') return [`Masse${lieu(L, true)}${avecTaille(L)} à composante tissulaire rehaussée prédominante (plus de 25 % du volume) : hors classification de Bosniak, à prendre en charge comme une masse rénale solide.`];
      if (r.hors === 'exclusion') return [`Lésion kystique${lieu(L, true)}${avecTaille(L)} d'origine ${ORIGINE} probable : classification de Bosniak non applicable.`];
      if (!c) {
        const Rh = r.rehaussement;
        const franc = Rh.niveau === 'franc' && homogene(e) ? ` : rehaussement franc (${fr(Rh.delta)} UH) d'une lésion d'aspect homogène, faisant évoquer une masse solide` : '';
        const lignes = [`Lésion kystique${lieu(L, true)}${avecTaille(L)}, non classable selon Bosniak en l'état${franc}.`];
        const aEvaluer = e.paroi !== '<=2' || e.protrusion !== 'aucune' || e.cloisons === '>=4' || (e.cloisons !== '0' && e.cloisonsEpaisseur !== '<=2');
        if (e.injection !== 'oui' && aEvaluer) lignes.push(`À compléter par une imagerie avec injection (scanner ou IRM)${quelle}.`);
        return [...lignes, ...conseils];
      }
      const [nom, fem] = NOM[c];
      return [`${nom}${lieu(L, fem)}${avecTaille(L)}, classé${fem ? 'e' : ''} Bosniak ${c} (version 2019) : ${CONDUITE[c]}`, ...conseils];
    }

    /* Lésions dans l'ordre du compte rendu : rein droit, rein gauche, côté non précisé */
    const RANG = { droit: 0, gauche: 1, '': 2 };
    const ordre = st => st.lesions.map((L, i) => [L, i]).sort((a, b) => (RANG[a[0].cote] - RANG[b[0].cote]) || a[1] - b[1]).map(x => x[0]);

    const descriptions = st => ordre(st).map(L => `• ${description(st, L)}`);
    function conclusion(st) {
      const plusieurs = st.lesions.length > 1;
      return ordre(st).flatMap(L => conclusionLesion(st, L, plusieurs ? ` pour la lésion${lieu(L, true)}` : ''));
    }

    /* Messages pour le formulaire (lésion active) : ce qui manque, structures non rehaussées, kyste hyperdense */
    function alertes(st, L) {
      const r = classer(st, L), a = [];
      if (!r.categorie && !r.hors) a.push(...r.criteres);
      a.push(...r.conseils.filter(x => /non prises? en compte/.test(x)));
      if (r.conseils.includes(R.CONSEIL.hyperdense) && (tailleMm(L) == null || !L.dev)) a.push('Kyste hyperdense : précisez la taille et le développement (IRM recommandée au-delà de 3 cm s\'il est endophytique).');
      return a;
    }

    /* Texte au curseur (compte rendu sans ligne des reins ni rubrique RÉSULTATS) */
    const texte = st => [...descriptions(st), ...conclusion(st).map(l => `• ${l}`)].join('\n');

    function integrer(texteCR, st) {
      const L = String(texteCR ?? '').split('\n');
      let c = -1;
      L.forEach((l, j) => { if (estConclusion(l)) c = j; });
      const corps = L.slice(0, c < 0 ? L.length : c), suite = c < 0 ? [] : L.slice(c);

      // Anciennes lignes de l'outil retirées ; les nouvelles prennent leur place, sinon sous la ligne des reins,
      // sinon à la fin des constatations
      const ancienne = corps.findIndex(l => LIGNE_OUTIL.test(l));
      const garde = corps.filter(l => !LIGNE_OUTIL.test(l));
      const r = garde.findIndex(estResultats);
      const reins = garde.findIndex((l, j) => j > r && REINS.test(norm(l)));
      let ou, rubrique;
      if (ancienne >= 0) { ou = ancienne; rubrique = reins >= 0 ? 'reins' : r >= 0 ? garde[r] : 'RÉSULTATS'; }
      else if (reins >= 0) { ou = reins + 1; rubrique = 'reins'; }
      else if (r >= 0) {
        // Fin des constatations (avant la conclusion), sous « Par ailleurs : » si la rubrique a des sous-titres
        let fin = garde.length;
        while (fin > r + 1 && !garde[fin - 1].trim()) fin--;
        if (garde.slice(r + 1, fin).some(estSousTitre)) { garde.splice(fin, 0, '', 'Par ailleurs :'); fin += 2; }
        ou = fin; rubrique = garde[r];
      } else return null;

      // Phrase normale contredite sur la ligne des reins (gardée pour l'autre rein si toutes les lésions sont du même côté)
      if (reins >= 0) {
        const cotes = new Set(st.lesions.map(x => x.cote));
        const autre = cotes.size === 1 && cotes.has('droit') ? 'à gauche' : cotes.size === 1 && cotes.has('gauche') ? 'à droite' : '';
        garde[reins] = garde[reins]
          .replace(SANS_MASSE, autre ? `, sans masse solide ou kystique décelable ${autre}` : '')
          .replace(SANS_LESION_NI, 'sans ')
          .replace(SANS_LESION, autre ? `, sans lésion focale ${autre}` : '');
      }
      garde.splice(ou, 0, ...descriptions(st));

      // Conclusion : lignes de l'outil en tête ; champ [conclusion], ancienne conclusion de l'outil et « … sans anomalie » retirés
      const lignes = conclusion(st);
      let creee = false;
      if (c < 0) {
        while (garde.length && !garde[garde.length - 1].trim()) garde.pop();
        garde.push('', 'CONCLUSION :', ...lignes);
        creee = true;
      } else {
        const f = finRubrique(suite, 0);
        const reste = suite.slice(1, f).filter(l => l.trim() && !/^\s*\[[^\]]*\]\s*\.?\s*$/.test(l)
          && !CONCLUSION_OUTIL.test(l) && !CONSEIL_OUTIL.test(l) && !SANS_ANOMALIE.test(norm(l)));
        suite.splice(1, f - 1, ...lignes, ...reste, ...(f < suite.length ? [''] : []));
      }
      const texteFinal = [...garde, ...suite].join('\n');
      return { texte: texteFinal, rubrique: rubrique === 'reins' ? 'reins' : rubrique.trim().replace(/\s*:$/, ''), conclusion: creee ? 'CONCLUSION' : suite[0].trim().replace(/\s*:$/, ''), creee };
    }

    return { init, nouvelleLesion, entrees, classer, choisir, description, conclusion, conclusionLesion, alertes, texte, integrer };
  }

  /* Examen d'après le compte rendu type : titre (scanner / IRM) et rubrique TECHNIQUE (injection) */
  function examDepuis(texteCR) {
    const L = String(texteCR ?? '').split('\n');
    const titre = norm(L.find(l => l.trim()) || '');
    const t = L.findIndex(l => estTitre(l) && /^technique/.test(nomTitre(l)));
    const technique = t < 0 ? '' : norm(L.slice(t + 1, finRubrique(L, t)).join(' '));
    const o = {};
    if (/\birm\b|resonance magnetique/.test(titre)) o.modalite = 'irm';
    else if (/scanner|\btdm\b|tomodensitom/.test(titre)) o.modalite = 'tdm';
    if (/(apres|avec) injection|injection intra-?veineuse multiphasique|injectee/.test(technique)) o.injection = 'oui';
    else if (/sans injection/.test(technique)) o.injection = 'non';
    return o;
  }

  return { creer, examDepuis, COTES, SIEGES, DEVELOPPEMENTS, CONDUITE };
});
