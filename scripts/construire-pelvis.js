#!/usr/bin/env node
/* =========================================================
   RadiologicHub — section Pelvis : génération des pages HTML
   ---------------------------------------------------------
   Source : les fiches Markdown de l'auteur dans pelvis/ (texte repris
   TEL QUEL : aucune reformulation, aucune correction ; seuls la mise en
   page, les liens et la navigation sont ajoutés).

     pelvis/00-sommaire.md          → pelvis/index.html            (/pelvis)
     pelvis/ovaire/00-ovaire.md     → pelvis/ovaire/index.html     (/pelvis/ovaire)
     pelvis/ovaire/NN-<nom>.md      → pelvis/ovaire/<nom>.html     (/pelvis/ovaire/<nom>)
     (fiches 09 et 10 + Bosniak)    → pelvis/classifications.html  (/pelvis/classifications)
     pelvis/sources.md              → pelvis/sources.html          (/pelvis/sources)
     index de recherche             → pelvis/recherche.js
     ovaire/schema-demarche-masse.jsx → SVG statique dans la fiche 08

   Lancer : npm run build   (ou : node scripts/construire-pelvis.js)
   Vérifier sans écrire : node scripts/construire-pelvis.js --verifier
   (sort en erreur si une page n'est pas à jour).
   Les zones de texte repris des fiches sont balisées <!--md--> … <!--/md-->
   (tests/pelvis.test.js vérifie qu'elles reproduisent le Markdown mot pour mot).
   ========================================================= */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const RACINE = path.join(__dirname, '..');
const PELVIS = path.join(RACINE, 'pelvis');
const OVAIRE = path.join(PELVIS, 'ovaire');

/* ---------- Utilitaires ---------- */
const lire = f => fs.readFileSync(f, 'utf8').replace(/\r\n?/g, '\n');
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const sansAccents = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '');
const ancre = s => sansAccents(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const empreinte = s => crypto.createHash('sha1').update(s).digest('hex').slice(0, 10);
const echec = m => { throw new Error(`[pelvis] ${m}`); };

/* Versions des feuilles et scripts communs : reprises de fiches-rapides.html (mêmes ?v= que le reste du site) */
const INDEX_FICHES = lire(path.join(RACINE, 'fiches-rapides.html'));
const version = f => (INDEX_FICHES.match(new RegExp(`${f.replace('.', '\\.')}\\?v=(\\d+)`)) || echec(`version de ${f} introuvable`))[1];
const V = { styles: version('styles.css'), fiche: version('fiche.css'), ficheJs: version('fiche.js') };

/* =======================================================
   Markdown → blocs (titres, paragraphes, listes imbriquées, tableaux)
   ======================================================= */
const RE_ITEM = /^(\s*)(?:([-*])|(\d+)\.)\s+(.*)$/;
const RE_TITRE = /^(#{1,3})\s+(.*)$/;

function blocs(md) {
  const L = md.split('\n');
  const out = [];
  let i = 0;
  while (i < L.length) {
    const l = L[i];
    if (!l.trim()) { i++; continue; }
    let m;
    if ((m = l.match(RE_TITRE))) { out.push({ type: 'titre', niveau: m[1].length, texte: m[2].trim() }); i++; continue; }
    if (/^\s*\|/.test(l)) {
      const lignes = [];
      while (i < L.length && /^\s*\|/.test(L[i])) lignes.push(L[i++]);
      out.push(tableau(lignes));
      continue;
    }
    if (RE_ITEM.test(l)) {
      const lignes = [];
      while (i < L.length && L[i].trim() && (RE_ITEM.test(L[i]) || /^\s{2,}\S/.test(L[i]))) lignes.push(L[i++]);
      out.push({ type: 'liste', items: arbre(lignes) });
      continue;
    }
    const p = [];
    while (i < L.length && L[i].trim() && !RE_TITRE.test(L[i]) && !/^\s*\|/.test(L[i]) && !RE_ITEM.test(L[i])) p.push(L[i++].trim());
    out.push({ type: 'p', texte: p.join(' ') });
  }
  return out;
}

/* Anomalies de la source relevées pendant la construction (signalées, jamais corrigées dans le texte) */
const ANOMALIES = [];
let FICHIER_EN_COURS = '';

function tableau(lignes) {
  const cellules = l => l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());
  const [tete, separation, ...corps] = lignes;
  if (!separation || !/^\s*\|?\s*:?-{3,}/.test(separation)) echec(`tableau sans ligne de séparation : ${tete}`);
  const t = { type: 'tableau', tete: cellules(tete), corps: corps.map(cellules), vides: [] };
  t.corps.forEach((r, i) => {
    if (r.length > t.tete.length) echec(`${FICHIER_EN_COURS} : ligne de tableau de ${r.length} cellules (au lieu de ${t.tete.length}) : ${r.join(' | ')}`);
    if (r.length < t.tete.length) {
      // Cellule(s) manquante(s) dans la source : les cellules présentes vont dans les dernières colonnes,
      // la première reste vide (marquée « à compléter ») ; le texte n'est pas modifié.
      const manque = t.tete.length - r.length;
      ANOMALIES.push({ fichier: FICHIER_EN_COURS, ligne: i + 1, colonnes: t.tete.slice(0, manque), texte: r.join(' | ') });
      for (let k = 0; k < manque; k++) { r.unshift(''); t.vides.push(`${i}:${k}`); }
    }
  });
  return t;
}

/* Liste (éventuellement imbriquée par l'indentation) → arbre d'items { ordonne, numero, texte, enfants } */
function arbre(lignes) {
  const racine = { indent: -1, enfants: [] };
  const pile = [racine];
  let dernier = null;
  for (const l of lignes) {
    const m = l.match(RE_ITEM);
    if (!m) { if (!dernier) echec(`ligne de liste orpheline : ${l}`); dernier.texte += ' ' + l.trim(); continue; }
    const item = { indent: m[1].length, ordonne: !!m[3], numero: m[3] ? +m[3] : null, texte: m[4].trim(), enfants: [] };
    while (pile.length > 1 && item.indent <= pile[pile.length - 1].indent) pile.pop();
    pile[pile.length - 1].enfants.push(item);
    pile.push(item);
    dernier = item;
  }
  return racine.enfants;
}

/* =======================================================
   Rendu en ligne : gras, italique, liens, blocs <?claude block x?>
   ctx.bloc(id) → HTML du lien (sommaire) ; ctx.lien(texte) → URL d'une fiche nommée
   ======================================================= */
function enLigne(t, ctx = {}) {
  const re = /<\?claude block (\w+)\?>|\[([^\]]+)\]\(([^)\s]+)\)|\*\*(.+?)\*\*|\*(?!\s)(.+?)\*/g;
  let h = '', dernier = 0, m;
  while ((m = re.exec(t))) {
    h += esc(t.slice(dernier, m.index));
    if (m[1]) h += ctx.bloc ? ctx.bloc(m[1]) : echec(`bloc ${m[1]} non résolu`);
    else if (m[2]) {
      const externe = /^https?:/.test(m[3]);
      h += `<a href="${esc(m[3])}"${externe ? ' target="_blank" rel="noopener"' : ''}>${enLigne(m[2], ctx)}</a>`;
    } else if (m[4]) h += `<strong>${enLigne(m[4], ctx)}</strong>`;
    else h += `<em>${enLigne(m[5], ctx)}</em>`;
    dernier = re.lastIndex;
  }
  return h + esc(t.slice(dernier));
}

/* Texte brut d'une ligne Markdown (pour l'index de recherche et les descriptions) */
function texteBrut(t, ctx = {}) {
  return t.replace(/<\?claude block (\w+)\?>/g, (_, id) => (ctx.nomBloc ? ctx.nomBloc(id) : id))
    .replace(/\[([^\]]+)\]\([^)\s]+\)/g, '$1').replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(?!\s)(.+?)\*/g, '$1');
}

function htmlListe(items, ctx) {
  // Items frères consécutifs de même type → une liste
  let h = '', i = 0;
  while (i < items.length) {
    const ordonne = items[i].ordonne, groupe = [];
    while (i < items.length && items[i].ordonne === ordonne) groupe.push(items[i++]);
    const debut = ordonne && groupe[0].numero !== 1 ? ` start="${groupe[0].numero}"` : '';
    h += `<${ordonne ? 'ol' : 'ul'}${debut}>`
      + groupe.map(it => `<li>${ctx.item ? ctx.item(it) : enLigne(it.texte, ctx)}${it.enfants.length ? htmlListe(it.enfants, ctx) : ''}</li>`).join('')
      + `</${ordonne ? 'ol' : 'ul'}>`;
  }
  return h;
}

function htmlTableau(t, ctx) {
  const cellule = (c, j) => (ctx.cellule ? ctx.cellule(c, j) : enLigne(c, ctx));
  const vide = (i, j) => (t.vides || []).includes(`${i}:${j}`);
  return `<p class="pv-glisser" aria-hidden="true">Faites glisser le tableau →</p><div class="ftable-wrap pv-table pv-col-${t.tete.length}"><table class="ftable">`
    + `<thead><tr>${t.tete.map(c => `<th scope="col">${enLigne(c, ctx)}</th>`).join('')}</tr></thead>`
    + `<tbody>${t.corps.map((r, i) => `<tr>${r.map((c, j) => (vide(i, j) ? `<td class="pv-absente" title="Cellule absente dans la fiche source (à compléter par l'auteur)"></td>`
      : j === 0 ? `<th scope="row" class="rh">${cellule(c, j)}</th>` : `<td>${cellule(c, j)}</td>`)).join('')}</tr>`).join('')}</tbody>`
    + `</table></div>`;
}

function htmlBloc(b, ctx) {
  if (b.type === 'p') return ctx.paragraphe ? ctx.paragraphe(b) : `<p>${enLigne(b.texte, ctx)}</p>`;
  if (b.type === 'liste') return htmlListe(b.items, ctx);
  if (b.type === 'tableau') return htmlTableau(b, ctx);
  if (b.type === 'titre') return `<h${b.niveau + 1}>${enLigne(b.texte, ctx)}</h${b.niveau + 1}>`;
  return echec(`bloc inconnu ${b.type}`);
}

/* =======================================================
   Fiches du chapitre Ovaire
   ======================================================= */
const RE_BREF = /^\*\*En bref\*\*\s*:\s*/;
const PLACE_SCHEMA = /^\*Schéma : voir schema-demarche-masse\.jsx \(arbre de décision IRM\)\.\*$/;

/* Couleur des sections selon leur titre (code couleur du site) */
function couleurSection(titre) {
  const t = sansAccents(titre).toLowerCase();
  if (/^pieges/.test(t)) return 'var(--k-grave)';
  if (/^diagnostics? differentiels?/.test(t)) return 'var(--k-ddx)';
  if (/^conduite a tenir/.test(t)) return 'var(--k-sign)';
  if (/^dans le compte rendu/.test(t)) return 'var(--plum)';
  if (/^signes cles|^signes d/.test(t)) return 'var(--k-signo)';
  if (/^imagerie|^protocole|^aspect selon|^courbes/.test(t)) return 'var(--k-tech)';
  if (/^a retenir/.test(t)) return 'var(--k-key)';
  if (/^terrain|^definitions?|^situation|^vascularisation/.test(t)) return 'var(--steel)';
  if (/^complications|^gravite|^transformation maligne/.test(t)) return 'var(--k-grave)';
  return 'var(--crimson)';
}

function lireFiches() {
  const fichiers = fs.readdirSync(OVAIRE).filter(f => /^\d\d-.+\.md$/.test(f) && !f.startsWith('00-')).sort();
  if (fichiers.length !== 20) echec(`20 fiches attendues dans pelvis/ovaire, ${fichiers.length} trouvées`);
  return fichiers.map((f, i) => {
    FICHIER_EN_COURS = `pelvis/ovaire/${f}`;
    const md = lire(path.join(OVAIRE, f));
    const B = blocs(md);
    if (B[0].type !== 'titre' || B[0].niveau !== 1) echec(`${f} : le fichier doit commencer par un titre « # »`);
    const ib = B.findIndex(b => b.type === 'p' && RE_BREF.test(b.texte));
    if (ib < 0) echec(`${f} : paragraphe « En bref » introuvable`);
    const numero = +f.slice(0, 2);
    if (numero !== i + 1) echec(`${f} : numérotation interrompue`);
    // Sections : contenu avant le premier « ## » (hors titre et En bref), puis une section par « ## »
    const sections = [];
    let cur = { titre: null, blocs: [] };
    B.forEach((b, j) => {
      if (j === 0 || j === ib) return;
      if (b.type === 'titre' && b.niveau === 2) { sections.push(cur); cur = { titre: b.texte, blocs: [] }; return; }
      cur.blocs.push(b);
    });
    sections.push(cur);
    const ids = new Set();
    sections.forEach(s => {
      if (!s.titre) return;
      let id = ancre(s.titre) || 'section', n = 2;
      while (ids.has(id)) id = `${ancre(s.titre)}-${n++}`;
      ids.add(id);
      s.id = id;
    });
    return {
      fichier: f, numero, slug: f.replace(/^\d\d-/, '').replace(/\.md$/, ''),
      titre: B[0].texte, bref: B[ib].texte, sections: sections.filter(s => s.titre || s.blocs.length),
    };
  });
}

/* =======================================================
   Schéma de la fiche 08 (ovaire/schema-demarche-masse.jsx) en SVG statique
   Positions et textes repris du JSX à l'identique ; couleurs du site.
   ======================================================= */
function schemaDemarche() {
  const jsx = lire(path.join(OVAIRE, 'schema-demarche-masse.jsx'));
  const textes = {};
  for (const m of jsx.matchAll(/data-claude-text-id='([^']+)'[^>]*>([^<]*)<\/text>/g)) textes[m[1]] = m[2];
  const aria = (jsx.match(/aria-label='([^']*)'/) || echec('aria-label du schéma introuvable'))[1];
  const T = id => (id in textes ? esc(textes[id]) : echec(`texte « ${id} » absent du schéma JSX`));
  // Positions du JSX ; boîtes de gauche un peu moins larges (244 au lieu de 260) pour laisser la place aux mots
  // « oui » / « non » avec la police du site (plus large) ; textes inchangés.
  const mx = 470, mw = 310, lx = 160, lw = 244, xEtiquette = (lx + lw / 2 + mx - mw / 2) / 2;
  const C = { trait: '#55545f', encre: '#111114', doux: '#55545f', fond: '#ffffff', question: '#fff5dc',
    faible: '#e3f3ea', faibleT: '#1f8a5b', t1: '#fdf0cf', t1T: '#b77800', t2: '#fde3c8', t2T: '#c4560f', t3: '#f8d6dc', t3T: '#a8172d' };
  const boite = (cx, y0, w, h, fond = C.fond, trait = C.encre) =>
    `<rect x="${cx - w / 2}" y="${y0}" width="${w}" height="${h}" rx="10" fill="${fond}" stroke="${trait}" stroke-width="2"/>`;
  const txt = (id, x, y, o = {}) =>
    `<text x="${x}" y="${y}"${o.milieu === false ? '' : ' text-anchor="middle"'}${o.taille ? ` font-size="${o.taille}"` : ''}${o.gras ? ` font-weight="${o.gras}"` : ''} fill="${o.couleur || C.encre}">${T(id)}</text>`;
  const fleche = d => `<path d="${d}" marker-end="url(#pv-masse-fleche)"/>`;
  const svg = `<svg class="pv-schema" viewBox="0 0 760 600" role="img" aria-label="${esc(aria)}" font-family="Montserrat, Arial, sans-serif" font-size="13">`
    + `<defs><marker id="pv-masse-fleche" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="${C.trait}"/></marker></defs>`
    + txt('title', 24, 30, { milieu: false, taille: 15, gras: 800 })
    + `<g fill="none" stroke="${C.trait}" stroke-width="1.75">`
    + fleche(`M${mx} 104V156`) + fleche(`M${mx - mw / 2} 180H${lx + lw / 2}`) + fleche(`M${mx} 204V266`) + fleche(`M${mx - mw / 2} 290H${lx + lw / 2}`)
    + fleche(`M${mx} 314V372`) + fleche(`M${mx} 420V446H170V472`) + fleche(`M${mx} 446H400V472`) + fleche(`M${mx} 446H630V472`) + '</g>'
    + boite(mx, 56, mw, 48) + txt('masse', mx, 84, { gras: 700 })
    + boite(mx, 156, mw, 48, C.question) + txt('tissu-q', mx, 184, { gras: 700 })
    + boite(lx, 144, lw, 72, C.faible, C.faibleT) + txt('sans-tissu', lx, 168, { gras: 700 }) + txt('sans-tissu-contenu', lx, 184, { taille: 11.5, couleur: C.doux }) + txt('sans-tissu-score', lx, 200, { taille: 11.5, gras: 700, couleur: C.faibleT })
    + boite(mx, 266, mw, 48, C.question) + txt('dark-q', mx, 294, { gras: 700 })
    + boite(lx, 254, lw, 72, C.faible, C.faibleT) + txt('dark', lx, 278, { gras: 700 }) + txt('dark-exemples', lx, 294, { taille: 11.5, couleur: C.doux }) + txt('dark-score', lx, 310, { taille: 11.5, gras: 700, couleur: C.faibleT })
    + boite(mx, 372, mw, 48) + txt('courbe', mx, 400, { gras: 700 })
    + boite(170, 472, 200, 56, C.t1, C.t1T) + txt('type1', 170, 496, { gras: 700 }) + txt('type1-risque', 170, 512, { taille: 11.5, couleur: C.doux })
    + boite(400, 472, 200, 56, C.t2, C.t2T) + txt('type2', 400, 496, { gras: 700 }) + txt('type2-risque', 400, 512, { taille: 11.5, couleur: C.doux })
    + boite(630, 472, 200, 56, C.t3, C.t3T) + txt('type3', 630, 496, { gras: 700 }) + txt('type3-risque', 630, 512, { taille: 11.5, couleur: C.doux })
    + txt('non-1', xEtiquette, 172, { taille: 11.5, gras: 700, couleur: C.doux }) + txt('oui-1', mx + 10, 240, { milieu: false, taille: 11.5, gras: 700, couleur: C.doux })
    + txt('oui-2', xEtiquette, 282, { taille: 11.5, gras: 700, couleur: C.doux }) + txt('non-2', mx + 10, 348, { milieu: false, taille: 11.5, gras: 700, couleur: C.doux })
    + txt('peritoine', 24, 572, { milieu: false, taille: 11.5, gras: 700, couleur: C.t3T })
    + '</svg>';
  const attendus = ['title', 'masse', 'tissu-q', 'sans-tissu', 'sans-tissu-contenu', 'sans-tissu-score', 'dark-q', 'dark', 'dark-exemples', 'dark-score', 'courbe', 'type1', 'type1-risque', 'type2', 'type2-risque', 'type3', 'type3-risque', 'non-1', 'oui-1', 'oui-2', 'non-2', 'peritoine'];
  const manquants = Object.keys(textes).filter(k => !attendus.includes(k));
  if (manquants.length) echec(`textes du schéma non repris : ${manquants.join(', ')}`);
  return `<!--schema--><figure class="pv-figure"><div class="pv-figure-defile">${svg}</div></figure><!--/schema-->`;
}

/* =======================================================
   Gabarit commun (en-tête, menu, pied de page du site)
   p : préfixe vers la racine du site ("../" ou "../../")
   ======================================================= */
function page({ p, pv, titre, description, corps, scripts = '', corpsClasse = '' }) {
  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(titre)}</title>
  <meta name="description" content="${esc(description)}">
  <meta property="og:title" content="${esc(titre)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:type" content="article">
  <meta property="og:image" content="${p}assets/logo-radiologichub.png">
  <link rel="icon" type="image/svg+xml" href="${p}assets/emblem.svg">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&family=Michroma&family=Permanent+Marker&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="${p}styles.css?v=${V.styles}">
  <link rel="stylesheet" href="${p}fiche.css?v=${V.fiche}">
  <link rel="stylesheet" href="${pv}pelvis.css?v={{V_CSS}}">
</head>
<body class="fiche-page pv-page${corpsClasse ? ' ' + corpsClasse : ''}" data-pv-racine="${pv}">

  <div class="read-progress" aria-hidden="true"><span></span></div>

  <header class="site-header is-scrolled" id="top">
    <div class="container header-inner">
      <a href="${p}index.html" class="brand" aria-label="RadiologicHub — accueil">
        <img src="${p}assets/emblem.svg" alt="" class="brand-mark" width="48" height="43">
        <span class="brand-name">Radiologic<br>Hub</span>
      </a>
      <nav class="main-nav" id="main-nav" aria-label="Navigation principale">
        <a href="${p}index.html#masterclass">Masterclass</a>
        <a href="${p}fiches-rapides.html" class="is-current">Fiches rapides</a>
        <a href="${p}bibliotheque.html">Bibliothèque</a>
        <a href="${p}comptes-rendus.html">Comptes rendus</a>
        <a href="${p}remplacements.html">Remplacements</a>
        <a href="${p}communaute.html">Communauté</a>
        <a href="${p}index.html#tarifs">Tarifs</a>
        <a href="${p}index.html#inscription" class="btn btn-ink btn-sm">S'inscrire</a>
      </nav>
      <button class="nav-toggle" aria-label="Ouvrir le menu" aria-expanded="false" aria-controls="main-nav">
        <span></span><span></span><span></span>
      </button>
    </div>
  </header>

  <main>
${corps}
  </main>

  <footer class="site-footer">
    <div class="container footer-inner">
      <a href="${p}index.html" class="brand">
        <img src="${p}assets/emblem-light.svg" alt="" class="brand-mark" width="44" height="40">
        <span class="brand-name">Radiologic<br>Hub</span>
      </a>
      <nav aria-label="Liens de pied de page">
        <a href="${p}index.html#masterclass">Masterclass</a>
        <a href="${p}fiches-rapides.html">Fiches rapides</a>
        <a href="${pv}index.html">Pelvis</a>
        <a href="${p}bibliotheque.html">Bibliothèque</a>
        <a href="${p}comptes-rendus.html">Comptes rendus</a>
        <a href="${p}communaute.html">Communauté</a>
        <a href="${p}remplacements.html">Remplacements</a>
        <a href="${p}mentions-legales.html">Mentions légales</a>
        <a href="${p}index.html#inscription">Contact</a>
      </nav>
      <p class="copyright">© <span id="year"></span> RadiologicHub · Formation en radiologie d'urgence</p>
    </div>
  </footer>
  <script src="${pv}recherche.js?v={{V_INDEX}}"></script>
  <script src="${pv}pelvis.js?v={{V_JS}}"></script>
${scripts}  <script src="${p}fiche.js?v=${V.ficheJs}"></script>
</body>
</html>
`;
}

/* Champ de recherche (résultats remplis par pelvis.js) */
const recherche = (id, o = {}) => `<form class="pv-recherche${o.grand ? ' pv-recherche-grande' : ''}" role="search" action="#" data-pv-recherche>
          <label for="${id}">${o.libelle || 'Rechercher dans les fiches'}</label>
          <div class="pv-recherche-champ"><input id="${id}" type="search" placeholder="${o.ph || 'torsion, O-RADS, Krukenberg…'}" autocomplete="off" spellcheck="false" aria-controls="${id}-res"></div>
          <ol class="pv-resultats" id="${id}-res" aria-live="polite"></ol>
        </form>`;

const fil = items => `<nav class="crumbs" aria-label="Fil d'Ariane">${items.map(([t, u]) => (u ? `<a href="${u}">${esc(t)}</a>` : `<span>${esc(t)}</span>`)).join(' › ')}</nav>`;

/* =======================================================
   Construction
   ======================================================= */
function construire() {
  const fiches = lireFiches();
  const parNom = {};
  const sommaireMd = lire(path.join(PELVIS, '00-sommaire.md'));
  const ovaireMd = lire(path.join(OVAIRE, '00-ovaire.md'));
  const sourcesMd = lire(path.join(PELVIS, 'sources.md'));

  /* Noms des fiches tels qu'écrits dans la page Ovaire (00-ovaire.md), dans l'ordre des fichiers 01 à 20 */
  const BO = blocs(ovaireMd);
  const nomsOvaire = [];
  BO.forEach(b => {
    if (b.type !== 'liste') return;
    b.items.forEach(it => {
      if (it.ordonne) nomsOvaire.push(it.texte);
      else {
        const m = it.texte.match(/^([^:]+) : (.+)$/) || echec(`ligne de la page Ovaire inattendue : ${it.texte}`);
        nomsOvaire.push(...m[2].split(', '));
      }
    });
  });
  if (nomsOvaire.length !== fiches.length) echec(`la page Ovaire nomme ${nomsOvaire.length} fiches, ${fiches.length} fichiers`);
  fiches.forEach((f, i) => { f.nom = nomsOvaire[i]; parNom[f.nom] = f; });

  /* Blocs <?claude block x?> du sommaire → liens (chapitre Ovaire et fiches citées) */
  const BLOCS = { ov: ['Ovaire', 'ovaire/index.html'] };
  const parSlug = s => fiches.find(f => f.slug === s) || echec(`fiche ${s} introuvable`);
  for (const [id, slug] of Object.entries({ tor: 'torsion-annexe', rup: 'rupture-hemorragie-kyste', dem: 'demarche-masse-annexielle', ous: 'o-rads-echographie', oir: 'o-rads-irm' })) {
    const f = parSlug(slug);
    BLOCS[id] = [f.nom, `ovaire/${f.slug}.html`];
  }
  for (const m of sommaireMd.matchAll(/<\?claude block (\w+)\?>/g)) if (!BLOCS[m[1]]) echec(`bloc ${m[1]} du sommaire sans correspondance`);
  const blocLien = (id, pre = '') => `<a href="${pre}${BLOCS[id][1]}">${esc(BLOCS[id][0])}</a>`;
  /* Classifications rédigées → fiche */
  const CLASSIF = { 'O-RADS échographie v2022': parSlug('o-rads-echographie'), 'O-RADS IRM': parSlug('o-rads-irm') };
  const etat = (c, ctx) => (c === 'À venir' ? `<span class="pv-etat pv-avenir">${esc(c)}</span>` : c === 'Rédigé' ? `<span class="pv-etat pv-redige">${esc(c)}</span>` : enLigne(c, ctx));

  const sorties = {};
  const ecrire = (rel, html) => { sorties[rel] = html; };

  /* ---------- Fiches ---------- */
  const GROUPES = [['Ovaire normal et fonctionnel', 1, 7], ['Masse annexielle', 8, 10], ['Tumeurs', 11, 20]];
  const menuFiches = actuelle => GROUPES.map(([g, a, b]) => `<p class="pv-groupe">${esc(g)}</p><ol class="pv-liste-fiches">${fiches.filter(f => f.numero >= a && f.numero <= b).map(f => {
    const ici = actuelle && f === actuelle;
    const secs = ici ? `<ol class="pv-sections">${f.sections.filter(s => s.titre).map(s => `<li><a href="#${s.id}" style="--c:${couleurSection(s.titre)}">${enLigne(s.titre)}</a></li>`).join('')}</ol>` : '';
    return `<li${ici ? ' class="is-ici"' : ''}><a href="${f.slug}.html"${ici ? ' aria-current="page"' : ''}><b>${String(f.numero).padStart(2, '0')}</b>${esc(f.nom)}</a>${secs}</li>`;
  }).join('')}</ol>`).join('');

  const index = [];
  for (const f of fiches) {
    const prec = fiches[f.numero - 2], suiv = fiches[f.numero];
    const corpsSections = f.sections.map(s => {
      const contenu = s.blocs.map(b => {
        if (b.type === 'p' && PLACE_SCHEMA.test(b.texte)) {
          if (f.slug !== 'demarche-masse-annexielle') echec(`${f.fichier} : schéma inattendu`);
          return '<!--/md-->' + schemaDemarche() + '<!--md-->';
        }
        return htmlBloc(b, {});
      }).join('\n');
      if (!s.titre) return `<div class="pv-intro">${contenu}</div>`;
      return `<section class="pv-sec" id="${s.id}" style="--c:${couleurSection(s.titre)}"><h2 class="pv-sec-titre">${enLigne(s.titre)}</h2>${contenu}</section>`;
    }).join('\n');
    const bref = f.bref.replace(RE_BREF, '');
    const corps = `    <section class="fiche-hero sec-down pv-hero">
      <div class="container">
        ${fil([['Pelvis', '../index.html'], ['Ovaire', 'index.html'], [f.titre]])}
        <p class="marker-tag">Pelvis · Ovaire · fiche ${f.numero} / ${fiches.length}</p>
        <h1><!--md-->${enLigne(f.titre)}<!--/md--></h1>
        <div class="pv-bref" role="note"><p><!--md-->${enLigne(f.bref)}<!--/md--></p></div>
      </div>
    </section>

    <div class="container fiche-layout pv-layout">
      <details class="pv-menu" open>
        <summary>Sommaire · Rechercher</summary>
        <div class="pv-menu-corps">
          ${recherche('pv-q', { libelle: 'Rechercher dans les fiches', ph: 'Rechercher…' })}
          <p class="toc-title"><a href="index.html">Ovaire</a></p>
          ${menuFiches(f)}
          <p class="pv-menu-liens"><a href="../index.html">Sommaire Pelvis</a> · <a href="../classifications.html">Classifications</a></p>
        </div>
      </details>

      <article class="fiche-body pv-prose" id="fiche-body">
        <!--md-->${corpsSections}<!--/md-->

        <nav class="pv-suite" aria-label="Fiche précédente et suivante">
          ${prec ? `<a class="pv-prec" href="${prec.slug}.html" rel="prev"><small>← Fiche précédente</small><b>${esc(prec.nom)}</b></a>` : '<a class="pv-prec" href="index.html"><small>← Chapitre</small><b>Ovaire</b></a>'}
          ${suiv ? `<a class="pv-suiv" href="${suiv.slug}.html" rel="next"><small>Fiche suivante →</small><b>${esc(suiv.nom)}</b></a>` : '<a class="pv-suiv" href="index.html"><small>Chapitre →</small><b>Ovaire</b></a>'}
        </nav>
        <p class="pv-sources"><a href="../sources.html">Sources</a></p>
      </article>
    </div>`;
    ecrire(`ovaire/${f.slug}.html`, page({
      p: '../../', pv: '../', titre: `${texteBrut(f.titre)} — Pelvis, ovaire | RadiologicHub`, description: texteBrut(bref), corps,
    }));
    index.push({
      t: texteBrut(f.titre), n: f.nom, u: `ovaire/${f.slug}.html`, c: 'Ovaire', b: texteBrut(bref),
      s: f.sections.map(s => ({ i: s.id || '', t: s.titre ? texteBrut(s.titre) : '', x: texteSection(s) })),
    });
  }

  /* ---------- Page Ovaire ---------- */
  {
    const titre = BO[0].texte;
    const ctxOv = {
      item: it => {
        if (it.ordonne) { const f = parNom[it.texte] || echec(`fiche « ${it.texte} » inconnue`); return `<a href="${f.slug}.html">${enLigne(it.texte)}</a>`; }
        const m = it.texte.match(/^([^:]+) : (.+)$/);
        return `${esc(m[1])} : ${m[2].split(', ').map(n => `<a href="${parNom[n].slug}.html">${esc(n)}</a>`).join(', ')}`;
      },
    };
    const contenu = BO.slice(1).map(b => (b.type === 'titre' ? `<h2 class="pv-sec-titre" id="${ancre(b.texte)}">${enLigne(b.texte)}</h2>` : b.type === 'p' ? `<p class="pv-chapo">${enLigne(b.texte)}</p>` : htmlBloc(b, ctxOv))).join('\n');
    const corps = `    <section class="fiche-hero sec-down pv-hero">
      <div class="container">
        ${fil([['Pelvis', '../index.html'], ['Ovaire']])}
        <p class="marker-tag">Pelvis · chapitre</p>
        <h1><!--md-->${enLigne(titre)}<!--/md--></h1>
        ${recherche('pv-q', { grand: true })}
      </div>
    </section>
    <div class="container pv-colonne pv-prose pv-chapitre">
      <!--md-->${contenu}<!--/md-->
      <p class="pv-sources"><a href="../sources.html">Sources</a> · <a href="../index.html">Sommaire Pelvis</a> · <a href="../classifications.html">Classifications</a></p>
    </div>`;
    ecrire('ovaire/index.html', page({ p: '../../', pv: '../', titre: `${titre} — Pelvis | RadiologicHub`, description: texteBrut(BO.find(b => b.type === 'p').texte), corps }));
  }

  /* ---------- Sommaire Pelvis ---------- */
  {
    const BS = blocs(sommaireMd);
    const titre = BS[0].texte;
    const ctxS = {
      bloc: id => blocLien(id),
      cellule: (c, j) => {
        if (j === 0 && CLASSIF[c]) return `<a href="ovaire/${CLASSIF[c].slug}.html">${esc(c)}</a>`;
        return etat(c, ctxS);
      },
    };
    let section = null;
    const contenu = BS.slice(1).map(b => {
      if (b.type === 'titre') { section = ancre(b.texte); return `<h2 class="pv-sec-titre" id="${section}">${enLigne(b.texte)}</h2>`; }
      if (b.type === 'p') return `<p class="pv-chapo">${enLigne(b.texte, ctxS)}</p>`;
      if (b.type === 'tableau') return htmlTableau(b, ctxS);
      return htmlBloc(b, ctxS);
    }).join('\n');
    const ids = [...sommaireMd.matchAll(/^## (.+)$/gm)].map(m => ancre(m[1]));
    ['par-organe', 'par-situation-clinique', 'classifications', 'plan-commun-de-chaque-fiche'].forEach(a => { if (!ids.includes(a)) echec(`rubrique #${a} absente du sommaire`); });
    const corps = `    <section class="fiche-hero sec-down pv-hero">
      <div class="container">
        ${fil([['Fiches rapides', '../fiches-rapides.html#femme'], ['Pelvis']])}
        <p class="marker-tag">Imagerie de la femme</p>
        <h1><!--md-->${enLigne(titre)}<!--/md--></h1>
        <nav class="pv-portes" aria-label="Entrées de la section">
          <a href="#par-organe" style="--c: var(--crimson)"><b>1</b>Par organe</a>
          <a href="#par-situation-clinique" style="--c: var(--amber)"><b>2</b>Par situation clinique</a>
          <a href="classifications.html" style="--c: var(--teal)"><b>3</b>Par classification</a>
        </nav>
        ${recherche('pv-q', { grand: true })}
      </div>
    </section>
    <div class="container pv-colonne pv-prose pv-sommaire">
      <!--md-->${contenu}<!--/md-->
      <p class="pv-sources"><a href="sources.html">Sources</a></p>
    </div>`;
    ecrire('index.html', page({ p: '../', pv: '', titre: `${texteBrut(titre)} | RadiologicHub`, description: texteBrut(BS.find(b => b.type === 'p').texte), corps }));

    /* ---------- Classifications (fiches 09 et 10, à côté du Bosniak) ---------- */
    const iC = BS.findIndex(b => b.type === 'titre' && ancre(b.texte) === 'classifications');
    const tableC = BS.slice(iC).find(b => b.type === 'tableau');
    const carte = (f, couleur) => `<a class="pv-carte" href="ovaire/${f.slug}.html" style="--c:${couleur}">
          <span class="pv-carte-badge">Fiche ${String(f.numero).padStart(2, '0')}</span>
          <h2>${enLigne(f.titre)}</h2>
          <p>${enLigne(f.bref)}</p>
          <span class="fiche-open">Ouvrir la fiche →</span>
        </a>`;
    const corpsC = `    <section class="fiche-hero sec-down pv-hero">
      <div class="container">
        ${fil([['Pelvis', 'index.html'], [BS[iC].texte]])}
        <p class="marker-tag">Pelvis · par classification</p>
        <h1>${enLigne(BS[iC].texte)}</h1>
        ${recherche('pv-q', { grand: true })}
      </div>
    </section>
    <div class="container pv-colonne pv-prose">
      <div class="pv-cartes">
        ${carte(CLASSIF['O-RADS échographie v2022'], 'var(--crimson)')}
        ${carte(CLASSIF['O-RADS IRM'], 'var(--plum)')}
        <div class="pv-carte pv-carte-bosniak" style="--c: var(--teal)">
          <span class="pv-carte-badge">Rein · Uro</span>
          <h2>Classification de Bosniak 2019</h2>
          <p>Masses rénales kystiques : les 5 catégories en schémas, le calculateur au scanner et en IRM, et la conduite à tenir.</p>
          <p class="pv-carte-liens"><a href="../outils/bosniak.html">Calculateur Bosniak →</a> <a href="../fiches/masses-renales-kystiques.html">Fiche rapide →</a></p>
        </div>
      </div>
      <h2 class="pv-sec-titre" id="toutes">${enLigne(BS[iC].texte)} de la section Pelvis</h2>
      <!--md-->${htmlTableau(tableC, ctxS)}<!--/md-->
      <p class="pv-sources"><a href="sources.html">Sources</a> · <a href="index.html">Sommaire Pelvis</a></p>
    </div>`;
    ecrire('classifications.html', page({
      p: '../', pv: '', titre: `${texteBrut(BS[iC].texte)} — Pelvis | RadiologicHub`,
      description: 'Classifications de la section Pelvis : O-RADS échographie et O-RADS IRM, à côté de la classification de Bosniak des masses rénales kystiques.', corps: corpsC,
    }));
  }

  /* ---------- Sources ---------- */
  {
    const BR = blocs(sourcesMd);
    const contenu = BR.slice(1).map(b => (b.type === 'titre' ? `<h2 class="pv-sec-titre" id="${ancre(b.texte)}">${enLigne(b.texte)}</h2>` : b.type === 'p' ? `<p class="pv-chapo">${enLigne(b.texte)}</p>` : htmlBloc(b, {}))).join('\n');
    const corps = `    <section class="fiche-hero sec-down pv-hero">
      <div class="container">
        ${fil([['Pelvis', 'index.html'], [BR[0].texte]])}
        <p class="marker-tag">Pelvis</p>
        <h1><!--md-->${enLigne(BR[0].texte)}<!--/md--></h1>
      </div>
    </section>
    <div class="container pv-colonne pv-prose pv-page-sources">
      <!--md-->${contenu}<!--/md-->
      <p class="pv-sources"><a href="index.html">Sommaire Pelvis</a> · <a href="ovaire/index.html">Ovaire</a></p>
    </div>`;
    ecrire('sources.html', page({ p: '../', pv: '', titre: `${texteBrut(BR[0].texte)} — Pelvis | RadiologicHub`, description: texteBrut(BR.find(b => b.type === 'p').texte), corps }));
  }

  /* ---------- Index de recherche et versions ---------- */
  const js = `/* Généré par scripts/construire-pelvis.js — ne pas modifier à la main.
   Index de recherche de la section Pelvis : une entrée par fiche
   (t : titre, n : nom dans le sommaire, u : adresse depuis pelvis/, c : chapitre, b : En bref,
   s : sections { i : ancre, t : titre, x : texte }). */
window.PelvisRecherche = ${JSON.stringify(index)};
`;
  sorties['recherche.js'] = js;
  const vCss = empreinte(lire(path.join(PELVIS, 'pelvis.css')));
  const vJs = empreinte(lire(path.join(PELVIS, 'pelvis.js')));
  const vIndex = empreinte(js);
  for (const k of Object.keys(sorties)) if (k.endsWith('.html')) sorties[k] = sorties[k].replace(/\{\{V_CSS\}\}/g, vCss).replace(/\{\{V_JS\}\}/g, vJs).replace(/\{\{V_INDEX\}\}/g, vIndex);
  return { sorties, fiches };
}

/* Texte brut d'une section (index de recherche) */
function texteSection(s) {
  const morceaux = [];
  const items = its => its.forEach(it => { morceaux.push(texteBrut(it.texte)); items(it.enfants); });
  s.blocs.forEach(b => {
    if (b.type === 'p') { if (!PLACE_SCHEMA.test(b.texte)) morceaux.push(texteBrut(b.texte)); }
    else if (b.type === 'liste') items(b.items);
    else if (b.type === 'tableau') { morceaux.push(b.tete.map(c => texteBrut(c)).join(' · ')); b.corps.forEach(r => morceaux.push(r.map(c => texteBrut(c)).join(' · '))); }
    else if (b.type === 'titre') morceaux.push(texteBrut(b.texte));
  });
  return morceaux.join(' ');
}

module.exports = { construire, blocs, texteBrut, enLigne, schemaDemarche, PELVIS, ANOMALIES };

if (require.main === module) {
  const verifier = process.argv.includes('--verifier');
  const { sorties } = construire();
  let ecarts = 0;
  for (const [rel, contenu] of Object.entries(sorties)) {
    const f = path.join(PELVIS, rel);
    const avant = fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : null;
    if (avant === contenu) continue;
    ecarts++;
    if (verifier) console.error(`pas à jour : pelvis/${rel}`);
    else { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, contenu); console.log(`écrit : pelvis/${rel}`); }
  }
  ANOMALIES.forEach(a => console.warn(`anomalie de la source : ${a.fichier}, tableau, ligne ${a.ligne} : cellule « ${a.colonnes.join(' », « ')} » absente — ${a.texte}`));
  if (verifier && ecarts) { console.error(`${ecarts} fichier(s) à régénérer : npm run build`); process.exit(1); }
  console.log(`${Object.keys(sorties).length} fichiers ${verifier ? 'vérifiés' : 'à jour'}${ecarts && !verifier ? ` (${ecarts} écrits)` : ''}.`);
}
