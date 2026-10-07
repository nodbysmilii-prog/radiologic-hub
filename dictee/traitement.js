/* =========================================================
   RadiologicHub — Dictée vocale : TRAITEMENT DU TEXTE
   ---------------------------------------------------------
   Indépendant du moteur de transcription (Web Speech API en V1,
   Whisper local en V2) et du navigateur : testé sous Node
   (tests/dictee.test.js).

   • analyser(segment)        → actions : texte, ponctuation, à la ligne,
                                 nouveau paragraphe, effacer le dernier mot,
                                 aller à une section, insérer un modèle, arrêter
   • corriger(texte)          → nombres décimaux, dimensions, unités,
                                 dictionnaire médical (dictee/corrections.js)
   • assembler(actions, avant)→ texte à insérer (espaces, majuscules,
                                 ponctuation) d'après le texte qui précède
   • sections(texte), trouverSection(), cibleSection()
                               → sections (« AU TOTAL : ») et sous-titres
                                 (« Foie : ») de l'éditeur
   • chercher(nom, items)     → recherche approximative (modèles, phrases)
   • reponse(segment, type)   → « remplacer » / « insérer » / « annuler »,
                                 « un », « deux »… (choix)
   • identite(texte)          → alerte « Monsieur … », « née le … »
   ========================================================= */

(function (root, factory) {
  const node = typeof module === 'object' && module.exports;
  const api = factory(node ? require('./corrections.js') : (root.RHDictee || {}).corrections);
  if (node) module.exports = api;
  else (root.RHDictee = root.RHDictee || {}).traitement = api;
})(typeof self !== 'undefined' ? self : this, function (DICO) {
  'use strict';

  const AV = '(?<![\\p{L}\\p{N}])', AP = '(?![\\p{L}\\p{N}])';   // limites de mot (accents compris)
  const norm = s => String(s ?? '').toLowerCase().replace(/œ/g, 'oe').replace(/æ/g, 'ae')
    .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/’/g, "'");
  const escRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const ACC = { a: '[aàâä]', e: '[eéèêë]', i: '[iîï]', o: '[oôö]', u: '[uùûü]', c: '[cç]', y: '[yÿ]', "'": "['’]" };
  /* Forme dite → motif : insensible aux accents ; un espace accepte aussi un tiret ou rien */
  const motif = dit => norm(dit).trim().split(/\s+/)
    .map(mot => [...mot].map(ch => ACC[ch] || escRe(ch)).join('')).join('[\\s-]*');

  /* ---------- Dictionnaire compilé ---------- */
  const parLongueur = (a, b) => norm(b[0]).length - norm(a[0]).length;
  // Une seule passe par liste (un texte déjà corrigé n'est pas re-corrigé : « EU-TIRADS » ne devient pas « EU-TI-RADS »)
  const passe = liste => {
    const l = [...(liste || [])].sort(parLongueur);
    const re = l.length ? new RegExp(l.map(([dit]) => `(${AV}${motif(dit)}${AP})`).join('|'), 'giu') : null;
    return t => (re ? t.replace(re, (...m) => l[m.slice(1, l.length + 1).findIndex(Boolean)][1]) : t);
  };
  const remplacer = passe(DICO.remplacements), expressions = passe(DICO.expressions);
  const UNITES = [...(DICO.unites || [])].sort(parLongueur)
    .map(([dit, ecrit]) => ({ re: new RegExp(`(\\d)\\s*${motif(dit)}${AP}`, 'giu'), ecrit }));
  const REGLES = (DICO.regles || []).map(([m, f, r]) => ({ re: new RegExp(m, f), r }));
  const EXCEPTIONS = [...(DICO.exceptionsPoint || [])].sort((a, b) => b.length - a.length)
    .map(e => new RegExp(AV + motif(e) + AP, 'giu'));
  // Mots à majuscule fixe (noms propres) : jamais remis en minuscule
  const NOMS_PROPRES = new Set((DICO.remplacements || []).map(([, e]) => e).filter(e => /^\p{Lu}\p{Ll}/u.test(e)).map(norm));
  const TITRES_CONCLUSION = (DICO.titresConclusion || ['conclusion', 'au total']).map(norm);

  /* ---------- Nombres, dimensions, unités, dictionnaire ---------- */
  const NUM = '(\\d+(?:[.,]\\d+)?)';
  const UNIT = '(millim[eè]tres?|mm|centim[eè]tres?|cm)';
  const SEP = '\\s*(sur|par|x|fois|×)\\s*';
  const RE_DIM = new RegExp(`${AV}${NUM}(?:\\s*${UNIT}${AP})?${SEP}${NUM}(?:\\s*${UNIT}${AP})?(?:${SEP}${NUM}(?:\\s*${UNIT}${AP})?)?${AP}`, 'giu');
  const nombre = x => parseFloat(String(x).replace(',', '.'));

  /* « 12 sur 8 millimètres » → « 12 x 8 mm » ; « 12 sur 8 sur 6 » → « 12 x 8 x 6 mm » ;
     « 4 sur 5 » (sans unité, dénominateur 4, 5 ou 10) → « 4/5 » (score) */
  function dimensions(t) {
    return t.replace(RE_DIM, (m, a, u1, s1, b, u2, s2, c, u3) => {
      const unite = [u3, u2, u1].find(Boolean);
      const nums = [a, b, c].filter(Boolean).map(x => x.replace('.', ','));
      if (!c && !unite && /^sur$/i.test(s1) && [4, 5, 10].includes(nombre(b)) && nombre(a) <= nombre(b)) return `${nums[0]}/${nums[1]}`;
      return `${nums.join(' x ')} ${unite && /^c/i.test(unite) ? 'cm' : 'mm'}`;
    });
  }

  function corriger(texte) {
    let t = String(texte ?? '');
    t = t.replace(/(\d)\s*virgule\s*(\d)/giu, '$1,$2');           // 12 virgule 5 → 12,5
    t = dimensions(t);
    UNITES.forEach(({ re, ecrit }) => { t = t.replace(re, `$1 ${ecrit}`); });
    t = expressions(remplacer(t));
    REGLES.forEach(({ re, r }) => { t = t.replace(re, r); });
    return t.replace(/[ \t]{2,}/g, ' ').replace(/ +([.,])/g, '$1').trim();
  }

  /* ---------- Commandes vocales ---------- */
  const CMDS = [
    [motif('nouveau paragraphe'), { type: 'paragraphe' }],
    [motif('retour à la ligne'), { type: 'ligne' }],
    [motif('à la ligne'), { type: 'ligne' }],
    [motif('nouvelle puce'), { type: 'puce' }],
    ['(?:effacer|efface|effacez|supprimer|supprime|supprimez)\\s+le\\s+dernier\\s+mot', { type: 'effacerMot' }],
    [motif('point virgule'), { type: 'ponct', texte: ';' }],
    [motif("point d'interrogation"), { type: 'ponct', texte: '?' }],
    [motif("point d'exclamation"), { type: 'ponct', texte: '!' }],
    [motif('deux points'), { type: 'ponct', texte: ':' }],
    ['(?:ouvrir|ouvrez|ouvre)\\s+(?:la\\s+)?parenth[eè]se', { type: 'ponct', texte: '(' }],
    ['(?:fermer|fermez|ferme)\\s+(?:la\\s+)?parenth[eè]se', { type: 'ponct', texte: ')' }],
    [motif('point final'), { type: 'ponct', texte: '.' }],
    [motif('virgule'), { type: 'ponct', texte: ',' }],
    [motif('point'), { type: 'ponct', texte: '.' }],
  ];
  const RE_CMD = new RegExp(CMDS.map(([m]) => `(${AV}${m}${AP})`).join('|'), 'giu');
  const RE_ALLER = /(?:^|\s)(?:aller|allez|aller directement)\s+(?:à|a|au|aux|en|dans)\s+(.+)$/iu;
  const RE_INSERER = /(?:^|\s)(?:ins[ée]rer|ins[èe]re|ins[ée]rez)\s+(?:(?:le|la|un|une)\s+)?(mod[èe]le|phrase)\s+(.+)$/iu;
  const RE_STOP = /^(?:arr[êe]te[rz]?|stoppe[rz]?|stop|fin de)\s+(?:la\s+)?dict[ée]e$/iu;

  /* Texte libre et ponctuation dictée → actions */
  function decouper(s) {
    const prot = [];
    EXCEPTIONS.forEach(re => { s = s.replace(re, m => { prot.push(m); return `\u0001${prot.length - 1}\u0002`; }); });
    s = s.replace(/(\d)\s*virgule\s*(\d)/giu, '$1,$2');           // décimale, pas une virgule
    const rendre = t => t.replace(/\u0001(\d+)\u0002/g, (m, i) => prot[+i]);
    const out = [];
    const texte = t => { const c = rendre(corriger(t)).trim(); if (c) out.push({ type: 'texte', texte: c }); };
    let last = 0, m;
    RE_CMD.lastIndex = 0;
    while ((m = RE_CMD.exec(s))) {
      texte(s.slice(last, m.index));
      const k = m.slice(1).findIndex(Boolean);
      out.push({ ...CMDS[k][1] });
      last = m.index + m[0].length;
    }
    texte(s.slice(last));
    return out;
  }

  function analyser(segment) {
    const s = String(segment ?? '').replace(/\s+/g, ' ').trim();
    if (!s) return [];
    const n = norm(s).replace(/[.!?,;:]+$/, '').trim();
    // Commandes qui occupent tout le segment (dites seules, entre deux pauses)
    if (TITRES_CONCLUSION.includes(n) || /^(?:aller )?(?:a|à) la conclusion$/.test(n)) return [{ type: 'aller', cible: 'conclusion' }];
    if (RE_STOP.test(n)) return [{ type: 'stop' }];
    // « aller à … », « insérer modèle … » : la fin du segment est le nom recherché
    const ma = s.match(RE_ALLER), mi = s.match(RE_INSERER);
    const cmd = [ma && { m: ma, a: { type: 'aller', cible: ma[1].replace(/[.!?]+$/, '').trim() } },
      mi && { m: mi, a: { type: 'modele', genre: /phrase/i.test(mi[1]) ? 'phrase' : 'tout', nom: mi[2].replace(/[.!?]+$/, '').trim() } }]
      .filter(Boolean).sort((x, y) => x.m.index - y.m.index)[0];
    if (cmd) return [...decouper(s.slice(0, cmd.m.index)), cmd.a];
    return decouper(s);
  }

  /* ---------- Assemblage : espaces, majuscules, ponctuation ---------- */
  const majuscule = t => t.replace(/\p{L}/u, c => c.toUpperCase());
  function minusculeSiBanal(t) {
    const m = t.match(/^(\p{Lu})(\p{Ll}+)/u);
    if (!m || NOMS_PROPRES.has(norm(m[0]))) return t;
    return m[1].toLowerCase() + t.slice(1);
  }
  const debutDePhrase = v => !v.trim() || /(^|\n)[ \t]*(?:[•*-][ \t]*)?$/.test(v) || /[.!?…][ \t]*$/.test(v);

  /* actions consécutives de type texte / ponctuation / ligne → { retirer, texte }
     retirer : nombre de caractères à supprimer avant le curseur (espaces avant « . ») */
  function assembler(actions, avant = '') {
    let buf = '', retirer = 0;
    const ctx = () => avant.slice(0, avant.length - retirer) + buf;
    const ote = n => { const k = Math.min(n, buf.length); buf = buf.slice(0, buf.length - k); retirer += n - k; };
    const espacesFin = () => (ctx().match(/[ \t]+$/) || [''])[0].length;
    for (const a of actions) {
      if (a.type === 'texte') {
        const v = ctx();
        let t = debutDePhrase(v) ? majuscule(a.texte) : minusculeSiBanal(a.texte);
        if (v && !/[\s(\['’"«/]$/.test(v) && !/^[.,;:!?)\]…]/.test(t)) t = ' ' + t;
        buf += t;
      } else if (a.type === 'ponct') {
        const c = a.texte;
        if (c === '(') { const v = ctx(); buf += (v && !/[\s(]$/.test(v) ? ' ' : '') + '('; continue; }
        ote(espacesFin());
        if ((c === '.' && /[.!?…]$/.test(ctx())) || (c === ',' && /,$/.test(ctx()))) continue;   // pas de « .. »
        buf += (/[;:?!]/.test(c) && ctx().trim() ? ' ' : '') + c;   // « : » et « ; » précédés d'une espace
      } else if (a.type === 'ligne' || a.type === 'puce' || a.type === 'paragraphe') {
        ote(espacesFin());
        const v = ctx(), ligne = v.slice(v.lastIndexOf('\n') + 1);
        if (a.type === 'paragraphe') buf += '\n\n';
        else if (a.type === 'puce') buf += ligne.trim() ? '\n• ' : '• ';
        else buf += /^[ \t]*•[ \t]+\S/.test(ligne) ? '\n• ' : '\n';      // une ligne à puce continue la liste
      }
    }
    return { retirer, texte: buf };
  }
  const INSERTION = new Set(['texte', 'ponct', 'ligne', 'puce', 'paragraphe']);

  /* « effacer le dernier mot » : position à partir de laquelle supprimer */
  function debutDernierMot(avant) {
    const nl = avant.match(/\n[ \t]*$/);
    if (nl) return avant.length - nl[0].length;
    const m = avant.match(/[ \t]*\S+[ \t]*$/);
    return m ? avant.length - m[0].length : avant.length;
  }

  /* ---------- Sections et sous-titres (lignes terminées par « : ») ---------- */
  const ARTICLES = /^(?:le|la|les|l'|du|de la|de l'|des|au|aux|a la|a l')\s*/;
  const normTitre = s => norm(s).replace(/[•*–-]/g, ' ').replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ').trim();
  const sansArticle = q => q.replace(ARTICLES, '').trim();

  function sections(texte) {
    const out = [];
    let pos = 0;
    for (const ligne of String(texte ?? '').split('\n')) {
      const brut = ligne.replace(/\s+$/, '');
      if (/:$/.test(brut) && brut.length <= 70) {
        const titre = brut.replace(/\s*:$/, '').replace(/^[\s•*–-]+/, '').trim();
        const lettres = titre.replace(/[^\p{L}]/gu, '');
        if (lettres.length >= 2 && !/[[\]]/.test(titre)) {
          out.push({ titre, nom: normTitre(titre), niveau: lettres === lettres.toUpperCase() ? 'section' : 'sous', debut: pos, fin: pos + brut.length });
        }
      }
      pos += ligne.length + 1;
    }
    return out;
  }

  /* Où placer le curseur : juste après « Foie : » (sous-titre) ; dans une section,
     sur son premier champ [ … ], sinon à la fin de son contenu */
  function cibleSection(texte, s, liste) {
    if (s.niveau === 'sous') return { debut: s.fin, fin: s.fin };
    const i = liste.indexOf(s);
    const suivante = liste.slice(i + 1).find(x => x.niveau === 'section');
    const zone = texte.slice(s.fin, suivante ? suivante.debut : texte.length);
    const champ = zone.match(/\[[^[\]\n]*\]/);
    if (champ) return { debut: s.fin + champ.index, fin: s.fin + champ.index + champ[0].length };
    const contenu = zone.replace(/\s+$/, '');
    if (contenu.trim()) return { debut: s.fin + contenu.length, fin: s.fin + contenu.length };
    if (zone.length >= 2) return { debut: s.fin + 1, fin: s.fin + 1 };           // ligne vide sous le titre
    return { debut: s.fin, fin: s.fin, inserer: '\n' };                         // titre seul : on ouvre une ligne
  }

  function trouverSection(liste, nom) {
    const brut = normTitre(nom), q = sansArticle(brut);
    if (!q) return null;
    if (TITRES_CONCLUSION.includes(brut) || TITRES_CONCLUSION.includes(q)) {
      const c = liste.filter(s => TITRES_CONCLUSION.includes(s.nom));
      if (c.length) return c[c.length - 1];
    }
    const exact = liste.find(s => s.nom === q || s.nom === brut || sansArticle(s.nom) === q);
    if (exact) return exact;
    const r = chercher(q, liste.map(s => ({ titre: s.titre, s })));
    return r.length && r[0].score >= SEUIL ? r[0].item.s : null;
  }

  /* ---------- Recherche approximative ---------- */
  const SEUIL = 0.6;
  const VIDES = new Set(['le', 'la', 'les', 'l', 'de', 'du', 'des', 'd', 'un', 'une', 'et', 'a', 'au', 'aux', 'en', 'pour', 'avec', 'sans', 'f', 'p', 'modele', 'phrase']);
  const racine = w => { let x = w; if (x.length > 4) x = x.replace(/s$/, ''); if (x.length > 4) x = x.replace(/e$/, ''); return x; };
  const SYN = DICO.synonymesRecherche || {};
  const jetons = s => norm(s).replace(/'/g, ' ').split(/[^a-z0-9]+/).filter(w => w && !VIDES.has(w)).map(w => racine(SYN[w] || w));
  function lev(a, b) {
    const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
    for (let j = 1; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    return d[a.length][b.length];
  }
  const simJeton = (q, t) => (q === t ? 1
    : (q.length >= 3 && t.startsWith(q)) || (t.length >= 3 && q.startsWith(t)) ? 0.9
      : q.length >= 5 && lev(q, t) <= 1 ? 0.8 : 0);

  /* items : [{ titre, cles?: [] , … }] → [{ item, score }] du plus proche au moins proche */
  function chercher(nom, items) {
    const q = jetons(nom);
    if (!q.length) return [];
    return items.map(item => {
      const t = [...new Set([...jetons(item.titre), ...(item.cles || []).flatMap(jetons)])];
      if (!t.length) return { item, score: 0 };
      let somme = 0;
      const pris = new Set();
      q.forEach(w => {
        let best = 0, bi = -1;
        t.forEach((x, i) => { const v = simJeton(w, x); if (v > best) { best = v; bi = i; } });
        somme += best;
        if (bi >= 0) pris.add(bi);
      });
      const score = 0.85 * (somme / q.length) + 0.15 * (pris.size / t.length);
      return { item, score: +score.toFixed(3) };
    }).filter(r => r.score > 0).sort((a, b) => b.score - a.score);
  }
  /* Meilleur résultat, ou plusieurs s'ils sont trop proches pour choisir */
  function choisir(nom, items) {
    const r = chercher(nom, items).filter(x => x.score >= SEUIL);
    if (!r.length) return { trouve: null, proches: [] };
    const proches = r.filter(x => r[0].score - x.score <= 0.03).slice(0, 4);
    return proches.length > 1 ? { trouve: null, proches } : { trouve: r[0].item, proches: [] };
  }

  /* ---------- Réponses vocales (confirmation, choix) ---------- */
  const RANGS = { 1: ['1', 'un', 'une', 'premier', 'premiere'], 2: ['2', 'deux', 'deuxieme', 'second', 'seconde'], 3: ['3', 'trois', 'troisieme'], 4: ['4', 'quatre', 'quatrieme'] };
  function reponse(segment, type) {
    const n = norm(segment).replace(/[.!?,;:]+/g, ' ').replace(/\s+/g, ' ').trim().replace(/^(?:le|la|choix|numero)\s+/, '');
    if (/^(?:annule[rz]?|non|stop|laisse[rz]? tomber)$/.test(n)) return 'annuler';
    if (type === 'confirmation') {
      if (/^remplace[rz]?(?: tout| le texte)?$/.test(n)) return 'remplacer';
      if (/^(?:insere[rz]?|ajoute[rz]?)(?: au curseur| ici)?$/.test(n) || n === 'au curseur') return 'inserer';
      return null;
    }
    if (type === 'choix') {
      const k = Object.keys(RANGS).find(i => RANGS[i].includes(n));
      return k ? +k : null;
    }
    return null;
  }

  /* ---------- Alerte identité ---------- */
  const PAS_UN_NOM = new Set(['le', 'la', 'les', 'l', 'un', 'une', 'du', 'de', 'des', 'est', 'a', 'presente', 'se', 'qui', 'et']);
  function identite(texte) {
    const t = String(texte ?? ''), out = [];
    const re1 = /(?<![\p{L}])(monsieur|madame|mademoiselle|mme|mlle|mr)\.?\s+([\p{L}][\p{L}'’-]+)/giu;
    let m;
    while ((m = re1.exec(t))) if (!PAS_UN_NOM.has(norm(m[2]))) out.push({ texte: m[0], index: m.index });
    const re2 = /(?<![\p{L}])née?\s+(?:le|en)(?![\p{L}])[^.\n]{0,20}/giu;     // « né le … », « née en … » (avec accent)
    while ((m = re2.exec(t))) out.push({ texte: m[0].trim(), index: m.index });
    const re3 = /date\s+de\s+naissance/giu;
    while ((m = re3.exec(t))) out.push({ texte: m[0], index: m.index });
    return out.sort((a, b) => a.index - b.index);
  }

  return {
    norm, corriger, dimensions, analyser, assembler, INSERTION, debutDernierMot,
    sections, cibleSection, trouverSection, chercher, choisir, reponse, identite, SEUIL,
  };
});
