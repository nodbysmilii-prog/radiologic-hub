/* =========================================================
   RadiologicHub — BI-RADS (sein) : lexique ACR par modalité,
   catégories et texte du compte rendu
   ---------------------------------------------------------
   • Chaque lésion est décrite selon la modalité qui la montre :
     mammographie (masse : forme, contours, densité ; micro-
     calcifications ; distorsion ; asymétrie ; ganglion) ou
     échographie (masse : forme, orientation, contours,
     échostructure, caractéristiques acoustiques postérieures ;
     kyste ; distorsion ; ganglion) — IRM pour l'IRM mammaire ;
   • catégorie par sein = la plus élevée (0 si seule une catégorie 0
     est associée à des catégories inférieures à 4) ;
   • integrer(compte rendu, état) : place les anomalies dans la
     rubrique Mammographie / Échographie / IRM du compte rendu type
     (en remplaçant la phrase normale qu'elles contredisent, gardée
     pour l'autre sein) et rédige la conclusion (AU TOTAL…) : catégories
     BI-RADS (seulement dans la conclusion) et conduite à tenir du service.
   Module sans dépendance au navigateur (testé sous Node :
   tests/birads.test.js). À FAIRE VÉRIFIER MÉDICALEMENT.
   ========================================================= */

(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.RHRegles = root.RHRegles || {}).birads = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const CAT = {
    0: 'évaluation incomplète', 1: 'négatif', 2: 'bénin', 3: 'probablement bénin',
    4: 'suspect', '4A': 'suspicion faible', '4B': 'suspicion intermédiaire', '4C': 'suspicion modérée',
    5: 'hautement évocateur de malignité', 6: 'malignité prouvée histologiquement',
  };
  /* Conduite à tenir : phrases du service pour les catégories 1 à 5 (4A, 4B, 4C comme 4) */
  const CONDUITE = {
    0: 'Examen(s) complémentaire(s) et/ou comparaison avec les examens antérieurs nécessaires.',
    1: 'Prochain contrôle par un bilan sénologique complet dans deux ans.',
    2: 'Prochain contrôle par un bilan sénologique complet dans deux ans.',
    3: 'À contrôler dans 6 mois par une échographie mammaire.',
    4: 'Nous restons à votre disposition pour une microbiopsie/macrobiopsie mammaire.',
    5: 'Nous restons à votre disposition pour une microbiopsie/macrobiopsie mammaire.',
    6: 'Prise en charge thérapeutique adaptée.',
  };
  const RANG = { 1: 1, 2: 2, 3: 3, 4: 4, '4A': 4.1, '4B': 4.2, '4C': 4.3, 5: 5, 6: 6, 0: 0.5 };
  const CATEGORIES = [['', '—'], ['0', '0 — incomplet'], ['2', '2 — bénin'], ['3', '3 — probablement bénin'], ['4', '4 — suspect'], ['4A', '4A — suspicion faible'], ['4B', '4B — intermédiaire'], ['4C', '4C — modérée'], ['5', '5 — hautement évocateur'], ['6', '6 — malignité prouvée']];

  const DENSITES = {
    a: 'seins presque entièrement graisseux',
    b: 'zones de densité fibroglandulaire éparses',
    c: 'seins de densité hétérogène, pouvant masquer de petites masses',
    d: 'seins extrêmement denses, ce qui diminue la sensibilité de la mammographie',
  };
  const CHOIX_DENSITE = [['', '—'], ['a', 'a — graisseux'], ['b', 'b — fibroglandulaire épars'], ['c', 'c — dense hétérogène'], ['d', 'd — extrêmement dense']];

  /* Modalités : nom affiché, mot reconnu dans les titres du compte rendu (sans accents) */
  const MODALITES = {
    mammo: { nom: 'Mammographie', mot: /\bmammographi/ },
    echo: { nom: 'Échographie', mot: /\bechographi/ },
    irm: { nom: 'IRM', mot: /\birm\b/ },
  };
  const EXAMENS = { 'mammo-echo': ['mammo', 'echo'], mammo: ['mammo'], echo: ['echo'], irm: ['irm'] };
  const CHOIX_EXAMEN = [['mammo-echo', 'Mammographie + échographie'], ['mammo', 'Mammographie'], ['echo', 'Échographie'], ['irm', 'IRM mammaire']];

  /* Lexique : libellé du champ et choix [valeur écrite dans le compte rendu, libellé] */
  const LEXIQUE = {
    shape: ['Forme', [['', '—'], ['ovale', 'Ovale'], ['ronde', 'Ronde'], ['irrégulière', 'Irrégulière']]],
    orient: ['Orientation', [['', '—'], ['parallèle à la peau', 'Parallèle à la peau'], ['non parallèle à la peau', 'Non parallèle']]],
    margins: ['Contours', {
      mammo: [['', '—'], ['circonscrits', 'Circonscrits'], ['masqués', 'Masqués'], ['microlobulés', 'Microlobulés'], ['indistincts', 'Indistincts'], ['spiculés', 'Spiculés']],
      echo: [['', '—'], ['circonscrits', 'Circonscrits'], ['indistincts', 'Indistincts'], ['anguleux', 'Anguleux'], ['microlobulés', 'Microlobulés'], ['spiculés', 'Spiculés']],
      irm: [['', '—'], ['circonscrits', 'Circonscrits'], ['irréguliers', 'Irréguliers'], ['spiculés', 'Spiculés']],
    }],
    dens: ['Densité', [['', '—'], ['de haute densité', 'Haute densité'], ['isodense', 'Isodense'], ['de basse densité', 'Basse densité'], ['contenant de la graisse', 'Contenant de la graisse']]],
    echo: ['Échostructure', [['', '—'], ['anéchogène', 'Anéchogène'], ['hyperéchogène', 'Hyperéchogène'], ['hypoéchogène', 'Hypoéchogène'], ['isoéchogène', 'Isoéchogène'], ['hétérogène', 'Hétérogène'], ['complexe, kystique et solide', 'Complexe kystique et solide']]],
    post: ['Acoustique postérieure', [['', '—'], ['sans particularité acoustique postérieure', 'Sans particularité'], ['avec renforcement postérieur', 'Renforcement'], ['avec atténuation postérieure', 'Atténuation (ombre)'], ['avec renforcement et atténuation postérieurs associés', 'Mixte (renforcement + atténuation)']]],
    calcMorph: ['Morphologie', [['', '—'], ['typiquement bénignes', 'Typiquement bénignes'], ['amorphes', 'Amorphes'], ['grossières hétérogènes', 'Grossières hétérogènes'], ['fines pléomorphes', 'Fines pléomorphes'], ['fines linéaires ou linéaires branchées', 'Fines linéaires (branchées)']]],
    calcDist: ['Distribution', [['', '—'], ['de distribution diffuse', 'Diffuse'], ['de distribution régionale', 'Régionale'], ['groupées (en amas)', 'Groupées (amas)'], ['de distribution linéaire', 'Linéaire'], ['de distribution segmentaire', 'Segmentaire']]],
    cyst: ['Kyste', [['simple', 'Simple'], ['compliqué (contenu échogène)', 'Compliqué'], ['complexe (composante solide)', 'Complexe']]],
    asym: ['Asymétrie', [['focale', 'Focale'], ['globale', 'Globale'], ['évolutive', 'Évolutive']]],
    rnmDist: ['Distribution', [['', '—'], ['focal', 'Focale'], ['linéaire', 'Linéaire'], ['segmentaire', 'Segmentaire'], ['régional', 'Régionale'], ['multirégional', 'Multirégionale'], ['diffus', 'Diffuse']]],
    rnmPat: ['Aspect', [['', '—'], ['homogène', 'Homogène'], ['hétérogène', 'Hétérogène'], ['en mottes', 'En mottes'], ['en anneaux groupés', 'En anneaux groupés']]],
  };

  /* Types de lésion par modalité, avec leurs champs (dans l'ordre du compte rendu) */
  const TYPES = {
    mammo: [['masse', 'Masse', ['shape', 'margins', 'dens']], ['calc', 'Microcalcifications', ['calcMorph', 'calcDist']], ['distorsion', 'Distorsion architecturale', []], ['asym', 'Asymétrie', ['asym']], ['ganglion', 'Ganglion intramammaire', []]],
    echo: [['masse', 'Masse', ['shape', 'orient', 'margins', 'echo', 'post']], ['kyste', 'Kyste', ['cyst']], ['distorsion', 'Distorsion architecturale', []], ['ganglion', 'Ganglion intramammaire', []]],
    irm: [['masse', 'Masse', ['shape', 'margins']], ['rnm', 'Rehaussement non masse', ['rnmDist', 'rnmPat']], ['ganglion', 'Ganglion intramammaire', []]],
  };

  /* Phrase normale du compte rendu type que la lésion contredit (texte sans accents) */
  const PHRASE_NORMALE = {
    mammo: { masse: /absence de (masse|opacite)/, calc: /absence de (micro)?calcification/, distorsion: /absence de distorsion/, asym: /absence d.?asymetrie/ },
    echo: { masse: /absence de (masse|lesion)/, kyste: /absence de (masse|lesion)/, distorsion: /absence de distorsion/ },
    irm: { rnm: /absence de (rehaussement|prise de contraste) non masse/, masse: /absence de (masse|lesion)/ },
  };
  /* Autres phrases normales contredites, sans y placer la lésion */
  const CONTREDIT = [
    { mod: 'echo', si: l => l.type === 'masse' && /attenuation/.test(norm(l.post)), re: /absence d.?attenuation/ },
  ];

  const SUSPECT = /irrégulière|irréguliers|non parallèle|indistincts|anguleux|microlobulés|spiculés|fines pléomorphes|fines linéaires|linéaire|segmentaire|en mottes|anneaux|complexe \(composante|évolutive/;

  const norm = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const num = v => { const n = parseFloat(String(v ?? '').replace(',', '.')); return Number.isFinite(n) ? n : null; };
  const fr = (n, d = 1) => String(Math.round(n * 10 ** d) / 10 ** d).replace('.', ',');
  const joindre = a => a.filter(Boolean).join(', ');
  const SEINS = { D: 'Sein droit', G: 'Sein gauche' };

  const heure = h => { const H = Math.floor(h) || 12; return h % 1 ? `${H} h 30` : `${H} h`; };
  const HEURES = [['', '—'], ['c', 'Rétro-aréolaire'], ...Array.from({ length: 24 }, (_, i) => [String(i / 2), heure(i / 2)])];
  function quadrant(sein, h) {
    if (h === 'c') return 'région rétro-aréolaire';
    const x = +h % 12, droit = sein === 'D';
    if (x === 0) return 'union des quadrants supérieurs';
    if (x === 6) return 'union des quadrants inférieurs';
    if (x === 3) return droit ? 'union des quadrants internes' : 'union des quadrants externes';
    if (x === 9) return droit ? 'union des quadrants externes' : 'union des quadrants internes';
    const haut = x < 3 || x > 9, bas = x > 3 && x < 9;
    const externe = droit ? x > 6 : x < 6;
    return `quadrant ${haut ? 'supéro' : bas ? 'inféro' : ''}-${externe ? 'externe' : 'interne'}`;
  }

  /* ---------- État ---------- */
  const modalites = etat => EXAMENS[etat.exam] || EXAMENS['mammo-echo'];
  const typeDe = l => (TYPES[l.mod] || TYPES.echo).find(t => t[0] === l.type);
  const champs = l => (typeDe(l) || [, , []])[2];
  const options = (l, k) => { const o = LEXIQUE[k][1]; return Array.isArray(o) ? o : o[l.mod] || o.echo; };

  function nouvelleLesion(etat) {
    const mods = etat ? modalites(etat) : EXAMENS['mammo-echo'];
    const active = etat && etat.lesions && etat.lesions[etat.active];
    return {
      breast: 'D', hour: '', dist: '', a: '', b: '', mod: active && mods.includes(active.mod) ? active.mod : mods[0], type: 'masse',
      shape: '', orient: '', margins: '', dens: '', echo: '', post: '', calcMorph: '', calcDist: '', cyst: 'simple', asym: 'focale', rnmDist: '', rnmPat: '', cat: '', more: '',
    };
  }

  /* Modalité permise par l'examen, type permis par la modalité, choix permis par le lexique */
  function normaliser(etat) {
    const mods = modalites(etat);
    for (const l of etat.lesions) {
      if (!mods.includes(l.mod)) l.mod = mods[0];
      if (!typeDe(l)) l.type = TYPES[l.mod][0][0];
      for (const k of champs(l)) if (!options(l, k).some(([v]) => v === l[k])) l[k] = options(l, k)[0][0];
    }
    return etat;
  }

  function categorieSein(etat, b) {
    const cats = etat.lesions.filter(l => l.breast === b && l.cat !== '').map(l => l.cat);
    if (!cats.length) return etat.lesions.some(l => l.breast === b) ? '' : '1';
    if (cats.includes('0') && cats.every(c => RANG[c] < 4)) return '0';
    return cats.filter(c => c !== '0').sort((x, y) => RANG[y] - RANG[x])[0] || '0';
  }

  /* ---------- Textes ---------- */
  function description(l) {
    const v = k => (champs(l).includes(k) ? l[k] : '');
    switch (l.type) {
      case 'masse': return joindre([`masse${v('shape') ? ' ' + v('shape') : ''}`, v('orient'), v('margins') && `à contours ${v('margins')}`, v('dens'), v('echo'), v('post')]);
      case 'kyste': return `kyste ${l.cyst}`;
      case 'calc': return joindre([`microcalcifications${v('calcMorph') ? ' ' + v('calcMorph') : ''}`, v('calcDist')]);
      case 'distorsion': return 'distorsion architecturale';
      case 'asym': return `asymétrie ${l.asym}`;
      case 'rnm': return joindre([`rehaussement non masse${v('rnmDist') ? ' ' + v('rnmDist') : ''}`, v('rnmPat') && `d'aspect ${v('rnmPat')}`]);
      default: return 'ganglion intramammaire';
    }
  }
  const mesure = l => (num(l.a) ? `${fr(num(l.a), 0)}${num(l.b) ? ' × ' + fr(num(l.b), 0) : ''} mm` : '');
  const localisation = (l, b) => (!l.hour ? '' : l.hour === 'c' ? 'en région rétro-aréolaire'
    : `à ${heure(+l.hour)}${num(l.dist) != null ? `, à ${fr(num(l.dist))} cm du mamelon` : ''} (${quadrant(b, l.hour)})`);
  const categorie = c => (c !== '' && c != null ? `BI-RADS ${c} (${CAT[c]})` : '[catégorie BI-RADS]');

  /* Ligne de la rubrique de la modalité (sans catégorie : elle est dans la conclusion) */
  const ligneLesion = (l, i) =>
    `• ${SEINS[l.breast]}, lésion n°${i + 1} : ${joindre([description(l), mesure(l) && 'mesurant ' + mesure(l), localisation(l, l.breast), l.more.trim()])}.`;
  const LIGNE_OUTIL = /^\s*•\s*Sein (droit|gauche), lésion n°\d+\s*:/;

  const ligneDensite = d => `• Seins de densité de type ${d.toUpperCase()} (ACR) : ${DENSITES[d]}.`;

  /* Résumé court pour la conclusion : nature, taille, quadrant (et heure) */
  function resume(l) {
    const v = k => (champs(l).includes(k) ? l[k] : '');
    const nature = l.type === 'masse' ? joindre([`masse${v('shape') ? ' ' + v('shape') : ''}`, v('margins') && `à contours ${v('margins')}`]) : description(l);
    const lieu = !l.hour ? '' : l.hour === 'c' ? 'rétro-aréolaire' : `${quadrant(l.breast, l.hour)} (${heure(+l.hour)})`;
    return joindre([nature, mesure(l), lieu]);
  }

  function conclusion(etat) {
    normaliser(etat);
    const mods = modalites(etat), L = [];
    if (mods.includes('mammo') && etat.density) L.push(`• Seins de densité de type ${etat.density.toUpperCase()} (ACR).`);
    for (const b of ['D', 'G']) {
      const ls = etat.lesions.map((l, i) => ({ l, i })).filter(x => x.l.breast === b);
      if (!ls.length) { L.push(`• ${SEINS[b]} : pas d'anomalie décelable — ${categorie('1')}.`); continue; }
      ls.forEach(({ l, i }) => L.push(`• ${SEINS[b]}, lésion n°${i + 1}${mods.length > 1 ? ` (${MODALITES[l.mod].nom.toLowerCase()})` : ''} : ${resume(l)} — ${categorie(l.cat)}.`));
      if (ls.length > 1) L.push(`• ${SEINS[b]} : ${categorie(categorieSein(etat, b))}, catégorie la plus élevée.`);
    }
    const vues3 = [...new Set(etat.lesions.filter(l => l.cat === '3').map(l => l.mod))];
    return L.concat(conduite(['D', 'G'].map(b => categorieSein(etat, b)), vues3));
  }

  /* BI-RADS 3 : contrôle à 6 mois par la modalité qui montre la ou les lésions classées 3
     (échographie par défaut ; mammographie seule → mammographie ; les deux → les deux) */
  const EXAMEN_CONTROLE = { mammo: 'une mammographie', echo: 'une échographie mammaire', irm: 'une IRM mammaire' };
  function controle3(vues) {
    const v = ['mammo', 'echo', 'irm'].filter(m => (vues || []).includes(m));
    return v.length ? `À contrôler dans 6 mois par ${v.map(m => EXAMEN_CONTROLE[m]).join(' et ')}.` : CONDUITE[3];
  }

  /* Conduite selon la catégorie la plus élevée des deux seins ; une catégorie 0 (bilan incomplet)
     ajoute sa phrase ; catégorie manquante : champ à compléter.
     vues3 : modalités des lésions classées BI-RADS 3 */
  function conduite(cats, vues3) {
    if (cats.some(c => !c)) return ['[conduite à tenir]'];
    const haut = cats.filter(c => c !== '0').sort((x, y) => RANG[y] - RANG[x])[0];
    const L = [];
    if (haut === '3') L.push(controle3(vues3));
    else if (haut && RANG[haut] > 3) L.push(CONDUITE[haut.charAt(0)]);
    if (cats.includes('0')) L.push(CONDUITE[0]);
    return L.length ? L : [CONDUITE[1]];
  }
  const PHRASES_CONDUITE = new Set([...Object.values(CONDUITE), '[conduite à tenir]']);

  /* Lignes de la rubrique d'une modalité : densité (mammographie) puis lésions */
  function lignesModalite(etat, m) {
    const L = [];
    if (m === 'mammo' && etat.density) L.push(ligneDensite(etat.density));
    etat.lesions.forEach((l, i) => { if (l.mod === m) L.push(ligneLesion(l, i)); });
    return L;
  }

  /* Texte complet (aperçu, ou insertion au curseur quand le compte rendu n'a pas de rubriques) */
  function texte(etat) {
    normaliser(etat);
    const out = [];
    for (const m of modalites(etat)) {
      const L = lignesModalite(etat, m);
      out.push(`${MODALITES[m].nom} :`, ...(L.length ? L : ['• Pas d\'anomalie décelable.']), '');
    }
    out.push('Conclusion :', ...conclusion(etat));
    return out.join('\n');
  }

  /* ---------- Intégration dans le compte rendu type ---------- */
  const TITRES_CONCLUSION = ['conclusion', 'au total', 'en conclusion', 'synthese'];
  const nomTitre = t => norm(t).replace(/\s*:\s*$/, '').replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ').trim();
  const estTitre = ligne => { const t = ligne.trim(); return /:$/.test(t) && t.length <= 90 && !/^[•*–-]/.test(t) && !/[[\]]/.test(t); };
  const enMajuscules = t => { const l = t.replace(/[^\p{L}]/gu, ''); return l.length >= 2 && l === l.toUpperCase(); };
  /* Titre qui ouvre une rubrique : en majuscules, numéroté (I/, II/…) ou nommant une modalité.
     Les autres lignes terminées par « : » (« À droite comme à gauche : ») restent dans la rubrique. */
  const estBorne = ligne => estTitre(ligne) && (enMajuscules(ligne.trim()) || /^[IVX]+\s*[/.)–-]/.test(ligne.trim())
    || Object.values(MODALITES).some(m => m.mot.test(norm(ligne))));
  const estConclusion = ligne => estTitre(ligne) && TITRES_CONCLUSION.includes(nomTitre(ligne));
  const finRubrique = (L, i) => { for (let j = i + 1; j < L.length; j++) if (estBorne(L[j])) return j; return L.length; };
  const titreDoc = L => L.find(l => l.trim()) || '';

  function rubrique(L, m) {
    const i = L.findIndex(l => estBorne(l) && !estConclusion(l) && MODALITES[m].mot.test(norm(l)));
    if (i >= 0) return i;
    // Compte rendu d'une seule modalité : « ÉCHOGRAPHIE MAMMAIRE … RÉSULTATS : »
    const t = norm(titreDoc(L));
    if (MODALITES[m].mot.test(t) && !Object.entries(MODALITES).some(([k, x]) => k !== m && x.mot.test(t))) {
      return L.findIndex(l => estBorne(l) && /^(resultats?|compte rendu|description|constatations)\b/.test(nomTitre(l)));
    }
    return -1;
  }
  const conclusionDe = L => { let c = -1; L.forEach((l, i) => { if (estConclusion(l)) c = i; }); return c; };
  const coteDe = ligne => { const c = norm(ligne).match(/^\s*[•*–-]?\s*a (droite|gauche),/); return c ? (c[1] === 'droite' ? 'D' : 'G') : null; };
  const minusculeInitiale = s => s.charAt(0).toLowerCase() + s.slice(1);

  /* Examen déduit du compte rendu ouvert (titre et rubriques) */
  function examDepuis(texteCR) {
    const L = String(texteCR ?? '').split('\n');
    const vus = Object.keys(MODALITES).filter(m => MODALITES[m].mot.test(norm(titreDoc(L))) || L.some(l => estTitre(l) && MODALITES[m].mot.test(norm(l))));
    if (vus.includes('mammo') && vus.includes('echo')) return 'mammo-echo';
    return vus.length === 1 ? vus[0] : null;
  }

  /* Remplit la rubrique d'une modalité ; renvoie le titre de la rubrique (ou null) */
  function remplirRubrique(L, i, m, etat) {
    const fin = finRubrique(L, i);
    const corps = L.slice(i + 1, fin);
    const lesions = etat.lesions.map((l, n) => ({ l, n })).filter(x => x.l.mod === m);
    // Densité : champ [type A / … / type D] du compte rendu type, sinon ligne ajoutée en tête
    let enTete = [];
    if (m === 'mammo' && etat.density) {
      const k = corps.findIndex(l => /\[[^\]]*type a\b[^\]]*\]/i.test(norm(l)));
      if (k >= 0) {
        corps[k] = corps[k].replace(/\[([^\]]*)\]/, (champ, interieur) => {
          const choix = interieur.split(' / ').find(c => new RegExp(`type ${etat.density}\\b`).test(norm(c)));
          return choix ? choix.trim() : champ;
        });
      } else if (!corps.some(l => /densit|\btype [abcd]\b/.test(norm(l)))) enTete = [ligneDensite(etat.density)];
    }
    // Chaque lésion prend la place de la phrase normale qu'elle contredit (« Absence de masse… ») ;
    // une phrase normale propre à un côté (« À gauche, absence de… ») n'est contredite que de ce côté
    const placees = new Map(), contredites = new Map(), restantes = [];
    const candidates = re => corps.map((l, k) => k).filter(k => !LIGNE_OUTIL.test(corps[k]) && re.test(norm(corps[k])));
    const contredire = (k, sein) => { if (!contredites.has(k)) contredites.set(k, new Set()); contredites.get(k).add(sein); };
    for (const x of lesions) {
      const re = (PHRASE_NORMALE[m] || {})[x.l.type];
      const ks = re ? candidates(re) : [];
      if (ks.length) { if (!placees.has(ks[0])) placees.set(ks[0], []); placees.get(ks[0]).push(x); } else restantes.push(x);
      const autres = CONTREDIT.filter(r => r.mod === m && r.si(x.l)).flatMap(r => candidates(r.re));
      for (const k of [...ks, ...autres]) if (!coteDe(corps[k]) || coteDe(corps[k]) === x.l.breast) contredire(k, x.l.breast);
    }
    const nouveau = [...enTete];
    let place = restantes.length === 0;
    corps.forEach((ligne, k) => {
      if (LIGNE_OUTIL.test(ligne)) {                       // lignes d'une insertion précédente : remplacées
        if (!place) { restantes.forEach(x => nouveau.push(ligneLesion(x.l, x.n))); place = true; }
        return;
      }
      (placees.get(k) || []).forEach(x => nouveau.push(ligneLesion(x.l, x.n)));
      const seins = contredites.get(k);
      if (!seins) { nouveau.push(ligne); return; }
      if (coteDe(ligne) || seins.size > 1) return;         // phrase contredite : retirée
      const autre = seins.has('D') ? 'À gauche' : 'À droite';   // l'autre sein garde la phrase normale
      nouveau.push(`• ${autre}, ${minusculeInitiale(ligne.trim().replace(/^[•*–-]\s*/, ''))}`);
    });
    if (!place) {
      let k = nouveau.length;
      while (k > 0 && !nouveau[k - 1].trim()) k--;
      nouveau.splice(k, 0, ...restantes.map(x => ligneLesion(x.l, x.n)));
    }
    L.splice(i + 1, fin - i - 1, ...nouveau);
    return L[i].trim().replace(/\s*:$/, '');
  }

  /* Conclusion de l'outil dans « AU TOTAL : » / « CONCLUSION : » : remplace le champ [conclusion]
     et une conclusion BI-RADS précédente ; garde le reste de ce qu'a écrit le radiologue */
  function remplirConclusion(L, etat) {
    const lignes = conclusion(etat);
    let c = conclusionDe(L);
    if (c < 0) {
      while (L.length && !L[L.length - 1].trim()) L.pop();
      L.push('', 'CONCLUSION :', ...lignes);
      return { titre: 'CONCLUSION', creee: true };
    }
    const fin = finRubrique(L, c);
    const garde = L.slice(c + 1, fin).filter(l => l.trim() && !/^\s*\[[^\]]*\]\s*\.?\s*$/.test(l) && !/BI-RADS/.test(l) && !/^\s*Conduite à tenir/.test(l) && !PHRASES_CONDUITE.has(l.trim()) && !/^\s*À contrôler dans 6 mois par /.test(l) && !/^\s*•\s*Seins de densité de type/.test(l));
    const suite = fin < L.length ? [''] : [];
    L.splice(c + 1, fin - c - 1, ...lignes, ...garde, ...suite);
    return { titre: L[c].trim().replace(/\s*:$/, ''), creee: false };
  }

  /* Renvoie { texte, rubriques, creees, conclusion } ou null si le compte rendu n'a ni rubrique
     de modalité ni conclusion (l'outil insère alors son texte au curseur) */
  function integrer(texteCR, etat) {
    normaliser(etat);
    const L = String(texteCR ?? '').split('\n');
    const mods = modalites(etat);
    if (conclusionDe(L) < 0 && mods.every(m => rubrique(L, m) < 0)) return null;
    const rubriques = [], creees = [];
    for (const m of mods) {
      const aEcrire = lignesModalite(etat, m).length > 0;
      let i = rubrique(L, m);
      if (i < 0) {
        if (!aEcrire) continue;
        const c = conclusionDe(L);
        const bloc = [`${MODALITES[m].nom} :`, ...lignesModalite(etat, m), ''];
        if (c >= 0) L.splice(c, 0, ...bloc);
        else { while (L.length && !L[L.length - 1].trim()) L.pop(); L.push('', ...bloc.slice(0, -1)); }
        creees.push(MODALITES[m].nom);
        continue;
      }
      if (aEcrire) rubriques.push(remplirRubrique(L, i, m, etat));
    }
    const concl = remplirConclusion(L, etat);
    return { texte: L.join('\n'), rubriques, creees, conclusion: concl.titre };
  }

  return {
    CAT, CONDUITE, RANG, CATEGORIES, CHOIX_DENSITE, CHOIX_EXAMEN, MODALITES, EXAMENS, LEXIQUE, TYPES, HEURES, SUSPECT,
    heure, quadrant, conduite, modalites, champs, options, nouvelleLesion, normaliser, categorieSein,
    description, resume, ligneLesion, conclusion, texte, integrer, examDepuis,
  };
});
