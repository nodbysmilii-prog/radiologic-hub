/* =========================================================
   RadiologicHub — assistant documentaire : moteur de détection (100 % local).
   ---------------------------------------------------------
   creer(index, synonymes) → { analyser(texte, curseur), fiche(id) }
   • normalisation : accents, majuscules, tirets, ponctuation, espaces, pluriel en -s ;
   • détection mot entier des termes du dictionnaire (assistant/synonymes.js),
     le plus long d'abord (« nodule thyroïdien » l'emporte sur « nodule ») ;
     sigles en majuscules sensibles à la casse ;
   • fiche retenue si un terme fort, ou deux termes faibles différents ;
     la fiche du paragraphe où se trouve le curseur passe en premier
     (ses occurrences comptent double) ;
   • classement contextuel des rubriques de la fiche : le terme et les mots écrits
     autour (± 12 mots, plus proches = plus lourds ; mots du titre de la fiche
     exclus car communs à toute la fiche) sont cherchés dans le
     titre de section, le titre et le badge de rubrique (« III »), puis dans
     le texte ; les mots rares de la fiche pèsent plus (IDF) ;
   • sans contexte : section « compte rendu » de la fiche, sinon la première.
   Déterministe, sans état, sans accès réseau ni stockage. Testé sous Node
   (tests/assistant.test.js).
   ========================================================= */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.RHAssistant = root.RHAssistant || {}).moteur = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const FENETRE = 12;
  const MOTS_VIDES = new Set(('a au aux avec ce ces cet cette d dans de des du en et est il ils l la le les leur lui '
    + 'mais ne ni ou par pas plus pour qu que qui sa se son sans sous sur un une y non sont ete etre a ont '
    + 'on tres peu bien sans soit selon chez apres avant entre vers mm cm ml type aspect signe signes').split(' '));

  const sansAccent = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[œ]/g, 'oe').replace(/[Œ]/g, 'OE');
  const racine = t => (t.length > 3 && /[a-z]s$/.test(t) ? t.slice(0, -1) : t);

  /* Découpe en mots : [{ c: forme avec casse, m: forme comparée, d: début, f: fin }] */
  function mots(texte) {
    const s = sansAccent(texte);
    const out = [];
    const re = /[A-Za-z0-9]+/g;
    let m;
    while ((m = re.exec(s))) out.push({ c: m[0], m: racine(m[0].toLowerCase()), d: m.index, f: m.index + m[0].length });
    return out;
  }
  const norm = t => mots(t).map(x => x.m).join(' ');

  function creer(index, synonymes) {
    const fiches = new Map((index && index.fiches || []).map(f => [f.id, f]));

    /* Termes du dictionnaire, limités aux fiches présentes dans l'index */
    const termes = [];
    for (const [id, def] of Object.entries(synonymes || {})) {
      if (!fiches.has(id)) continue;
      for (const [genre, liste] of [['fort', def.forts || []], ['faible', def.faibles || []]]) {
        for (const brut of liste) {
          const toks = mots(brut);
          if (!toks.length) continue;
          const casse = toks.length === 1 && /^[A-Z0-9]{2,4}$/.test(toks[0].c);
          termes.push({ id, genre, brut, toks: toks.map(t => (casse ? t.c : t.m)), casse });
        }
      }
    }
    termes.sort((a, b) => b.toks.length - a.toks.length || b.toks.join(' ').length - a.toks.join(' ').length);

    /* Statistiques par fiche, calculées au premier besoin */
    const cache = new Map();
    function stats(id) {
      if (cache.has(id)) return cache.get(id);
      const f = fiches.get(id);
      const rubs = [];
      const df = new Map();
      f.sections.forEach((s, si) => s.rubriques.forEach((r, ri) => {
        const corps = new Set(mots(r.blocs.join(' ')).map(x => x.m));
        const titreS = new Set(mots(s.titre).map(x => x.m));
        const titreR = new Set(mots(r.titre).map(x => x.m));
        const badge = norm(r.badge);
        const toutes = mots([s.titre, r.titre, r.badge, r.blocs.join(' ')].join(' . ')).map(x => x.m);
        const paires = new Set();
        for (let i = 1; i < toutes.length; i++) paires.add(toutes[i - 1] + ' ' + toutes[i]);
        const vus = new Set([...corps, ...titreS, ...titreR]);
        vus.forEach(t => df.set(t, (df.get(t) || 0) + 1));
        rubs.push({ si, ri, corps, titreS, titreR, badge, paires });
      }));
      const st = { rubs, df, n: rubs.length || 1 };
      cache.set(id, st);
      return st;
    }

    function analyser(texte, curseur) {
      const toks = mots(texte);
      if (!toks.length) return { suggestions: [] };
      const pos = Number.isFinite(curseur) ? curseur : texte.length;
      const s = String(texte);
      const debutPar = s.lastIndexOf('\n', Math.max(0, pos - 1)) + 1;
      let finPar = s.indexOf('\n', pos);
      if (finPar < 0) finPar = s.length;

      /* 1. Termes trouvés (le plus long d'abord, sans chevauchement) */
      const pris = new Uint8Array(toks.length);
      const trouves = [];
      for (const t of termes) {
        const n = t.toks.length;
        for (let i = 0; i + n <= toks.length; i++) {
          let ok = true;
          for (let k = 0; k < n; k++) {
            if (pris[i + k] || (t.casse ? toks[i + k].c : toks[i + k].m) !== t.toks[k]) { ok = false; break; }
          }
          if (!ok) continue;
          for (let k = 0; k < n; k++) pris[i + k] = 1;
          trouves.push({ t, i, n, ici: toks[i].d >= debutPar && toks[i].d <= finPar });
        }
      }

      /* 2. Fiches retenues */
      const parFiche = new Map();
      for (const x of trouves) {
        const e = parFiche.get(x.t.id) || { id: x.t.id, forts: new Set(), faibles: new Set(), score: 0, occ: [] };
        (x.t.genre === 'fort' ? e.forts : e.faibles).add(x.t.brut.toLowerCase());
        e.score += (x.t.genre === 'fort' ? 3 : 1) * (x.ici ? 2 : 1);
        if (x.ici) e.ici = true;
        e.occ.push(x);
        parFiche.set(x.t.id, e);
      }
      const retenues = [...parFiche.values()]
        .filter(e => e.forts.size || e.faibles.size >= 2)
        .sort((a, b) => (b.ici ? 1 : 0) - (a.ici ? 1 : 0) || b.score - a.score || a.id.localeCompare(b.id));

      /* 3. Rubriques classées par le contexte */
      const resultat = retenues.map(e => {
        const st = stats(e.id);
        const ctx = new Map();
        const pairesCtx = new Map();
        const sujet = new Set(mots(fiches.get(e.id).titre).map(x => x.m));
        for (const o of e.occ) {
          for (let j = Math.max(0, o.i - FENETRE); j < Math.min(toks.length, o.i + o.n + FENETRE); j++) {
            const d = j < o.i ? o.i - j : Math.max(0, j - (o.i + o.n - 1));
            const w = (d <= 4 ? 1 : 0.5) * (o.ici ? 1.5 : 1);
            const m = toks[j].m;
            if (MOTS_VIDES.has(m) || sujet.has(m)) continue;
            ctx.set(m, Math.max(ctx.get(m) || 0, w));
            if (j + 1 < toks.length) {
              const p = m + ' ' + toks[j + 1].m;
              pairesCtx.set(p, Math.max(pairesCtx.get(p) || 0, w));
            }
          }
        }
        const rubs = st.rubs.map(r => {
          let sc = 0;
          for (const [m, w] of ctx) {
            const court = m.length < 3 || /^\d+$/.test(m);
            const idf = 1 / Math.sqrt(st.df.get(m) || 1);
            if (r.badge && r.badge === m) sc += 6 * w;
            if (r.titreS.has(m)) sc += 3 * w * idf;
            if (r.titreR.has(m)) sc += 3 * w * idf;
            if (!court && r.corps.has(m)) sc += w * idf;
          }
          for (const [p, w] of pairesCtx) if (r.paires.has(p)) sc += 2 * w;
          return { si: r.si, ri: r.ri, score: Math.round(sc * 100) / 100 };
        });
        const f = fiches.get(e.id);
        let defaut = f.sections.findIndex(x => /compte.?rendu/i.test(x.id + ' ' + sansAccent(x.titre)));
        if (defaut < 0) defaut = 0;
        rubs.sort((a, b) => b.score - a.score || (b.si === defaut) - (a.si === defaut) || a.si - b.si || a.ri - b.ri);
        return { id: e.id, score: e.score, termes: [...e.forts, ...e.faibles], rubriques: rubs };
      });

      /* 4. Une principale, jusqu'à 3 secondaires (autres fiches d'abord, puis autres sections) */
      const sugg = [];
      if (resultat.length) {
        const p = resultat[0];
        sugg.push(lien(p, p.rubriques[0], true));
        for (const f of resultat.slice(1)) if (sugg.length < 4) sugg.push(lien(f, f.rubriques[0], false));
        const vues = new Set([p.rubriques[0].si]);
        for (const r of p.rubriques.slice(1)) {
          if (sugg.length >= 4 || r.score < 1) break;
          if (vues.has(r.si)) continue;
          vues.add(r.si);
          sugg.push(lien(p, r, false));
        }
      }
      return { suggestions: sugg, fiches: resultat };
    }

    function lien(e, r, principale) {
      const f = fiches.get(e.id);
      const s = f.sections[r.si];
      const rub = s.rubriques[r.ri];
      return {
        principale, fiche: f.id, ficheTitre: f.titre, url: f.url, termes: e.termes,
        section: s.id, sectionTitre: s.titre, si: r.si, ri: r.ri,
        rubriqueTitre: [rub.badge, rub.titre].filter(Boolean).join(' · '),
        ancre: rub.ancre || s.id, score: r.score,
      };
    }

    return { analyser, fiche: id => fiches.get(id) || null, termes: () => termes.slice() };
  }

  return { creer, mots, norm, sansAccent };
});
