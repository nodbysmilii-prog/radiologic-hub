#!/usr/bin/env node
/* =========================================================
   RadiologicHub — section Pelvis : génération des pages HTML
   ---------------------------------------------------------
   Source : les fiches Markdown de l'auteur dans pelvis/ (texte repris
   TEL QUEL : aucune reformulation, aucune correction ; seuls la mise en
   page, les liens et la navigation sont ajoutés).

     pelvis/00-sommaire.md                 → pelvis/index.html                 (/pelvis)
     pelvis/NN-<chapitre>/00-*.md          → pelvis/<chapitre>/index.html      (/pelvis/<chapitre>)
     pelvis/NN-<chapitre>/NN-<fiche>.md    → pelvis/<chapitre>/<fiche>.html    (/pelvis/<chapitre>/<fiche>)
     tableau « Classifications » du sommaire → pelvis/classifications.html     (/pelvis/classifications)
     pelvis/99-sources.md                  → pelvis/sources.html               (/pelvis/sources)
     index de recherche                    → pelvis/recherche.js (chargé à la première recherche)
     01-ovaire/schema-demarche-masse.jsx   → SVG statique à la place de la ligne « *Schéma : …* » de la fiche 08

   Rendu des fiches = composants des fiches rapides (fiche.css, comme la
   fiche pancréas) : carte « En bref », rangée de puces des sections
   (collée sous l'en-tête sur téléphone), sections .fsec à pastille, texte
   en .fcard, **mot clé** → <b>, ==alerte== → badge rouge (mark.k-grave),
   ligne en gras seule → intertitre (comme « Siège »), > encadré → .callout,
   tableaux .ftable, Pièges en carte d'alerte, Signes clés en carte verte,
   « Dans le compte rendu » en check-list.

   Lancer : npm run build   (ou : node scripts/construire-pelvis.js)
   Vérifier sans écrire : node scripts/construire-pelvis.js --verifier
   Les zones de texte repris des fiches sont balisées <!--md--> … <!--/md-->
   (tests/pelvis.test.js vérifie qu'elles reproduisent le Markdown mot pour mot).
   ========================================================= */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const RACINE = path.join(__dirname, '..');
const PELVIS = path.join(RACINE, 'pelvis');

/* ---------- Utilitaires ---------- */
const lire = f => fs.readFileSync(f, 'utf8').replace(/\r\n?/g, '\n');
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const sansAccents = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '');
const ancre = s => sansAccents(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const empreinte = s => crypto.createHash('sha1').update(s).digest('hex').slice(0, 10);
const echec = m => { throw new Error(`[pelvis] ${m}`); };
const ROMAIN = n => [['M', 1000], ['CM', 900], ['D', 500], ['CD', 400], ['C', 100], ['XC', 90], ['L', 50], ['XL', 40], ['X', 10], ['IX', 9], ['V', 5], ['IV', 4], ['I', 1]]
  .reduce((s, [r, v]) => { while (n >= v) { s += r; n -= v; } return s; }, '');

/* Versions des feuilles et scripts communs : reprises de fiches-rapides.html (mêmes ?v= que le reste du site) */
const INDEX_FICHES = lire(path.join(RACINE, 'fiches-rapides.html'));
const version = f => (INDEX_FICHES.match(new RegExp(`${f.replace('.', '\\.')}\\?v=(\\d+)`)) || echec(`version de ${f} introuvable`))[1];
const V = { styles: version('styles.css'), fiche: version('fiche.css'), ficheJs: version('fiche.js') };

/* Anomalies de la source relevées pendant la construction (signalées, jamais corrigées dans le texte) */
const ANOMALIES = [];
let FICHIER_EN_COURS = '';

/* =======================================================
   Markdown → blocs : titres, paragraphes, listes imbriquées, tableaux, citations (>)
   ======================================================= */
const RE_ITEM = /^(\s*)(?:([-*])|(\d+)\.)\s+(.*)$/;
const RE_TITRE = /^(#{1,3})\s+(.*)$/;
const RE_CITATION = /^\s*>\s?(.*)$/;

function blocs(md) {
  const L = md.split('\n');
  const out = [];
  let i = 0;
  while (i < L.length) {
    const l = L[i];
    if (!l.trim()) { i++; continue; }
    let m;
    if ((m = l.match(RE_TITRE))) { out.push({ type: 'titre', niveau: m[1].length, texte: m[2].trim() }); i++; continue; }
    if (RE_CITATION.test(l)) {
      const lignes = [];
      while (i < L.length && RE_CITATION.test(L[i])) lignes.push(L[i++].match(RE_CITATION)[1]);
      out.push({ type: 'citation', blocs: blocs(lignes.join('\n')) });
      continue;
    }
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
    while (i < L.length && L[i].trim() && !RE_TITRE.test(L[i]) && !/^\s*\|/.test(L[i]) && !RE_ITEM.test(L[i]) && !RE_CITATION.test(L[i])) p.push(L[i++].trim());
    out.push({ type: 'p', texte: p.join(' ') });
  }
  return out;
}

function tableau(lignes) {
  const cellules = l => l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());
  const [tete, separation, ...corps] = lignes;
  if (!separation || !/^\s*\|?\s*:?-{3,}/.test(separation)) echec(`${FICHIER_EN_COURS} : tableau sans ligne de séparation : ${tete}`);
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
   Rendu en ligne : **mot clé** → <b>, ==alerte== → badge rouge, *italique*, liens, `code`
   ctx.lier(texte brut échappé) → texte avec liens vers les fiches (sommaire, renvois « fiche … »)
   ======================================================= */
function enLigne(t, ctx = {}) {
  const re = /\[([^\]]+)\]\(([^)\s]+)\)|\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|==(.+?)==|\*(?!\s)(.+?)\*|`([^`]+)`/g;
  let h = '', dernier = 0, m;
  const brut = s => (ctx.lier ? ctx.lier(s) : esc(s));
  while ((m = re.exec(t))) {
    h += brut(t.slice(dernier, m.index));
    if (m[1]) {
      const externe = /^https?:/.test(m[2]);
      h += `<a href="${esc(m[2])}"${externe ? ' target="_blank" rel="noopener"' : ''}>${enLigne(m[1], { ...ctx, lier: null })}</a>`;
    } else if (m[3]) h += `<b><em>${enLigne(m[3], { ...ctx, lier: null })}</em></b>`;
    else if (m[4]) h += `<b>${enLigne(m[4], { ...ctx, lier: null })}</b>`;
    else if (m[5]) h += `<mark class="k-grave">${enLigne(m[5], { ...ctx, lier: null })}</mark>`;
    else if (m[6]) h += `<em>${enLigne(m[6], ctx)}</em>`;
    else h += `<code>${esc(m[7])}</code>`;
    dernier = re.lastIndex;
  }
  return h + brut(t.slice(dernier));
}

/* Texte brut d'une ligne Markdown (index de recherche et descriptions) */
const texteBrut = t => t.replace(/\[([^\]]+)\]\([^)\s]+\)/g, '$1').replace(/\*\*\*(.+?)\*\*\*/g, '$1').replace(/\*\*(.+?)\*\*/g, '$1').replace(/==(.+?)==/g, '$1').replace(/\*(?!\s)(.+?)\*/g, '$1').replace(/`([^`]+)`/g, '$1');

function htmlListe(items, ctx, classe = 'fl') {
  // Items frères consécutifs de même type → une liste
  let h = '', i = 0;
  while (i < items.length) {
    const ordonne = items[i].ordonne, groupe = [];
    while (i < items.length && items[i].ordonne === ordonne) groupe.push(items[i++]);
    const debut = ordonne && groupe[0].numero !== 1 ? ` start="${groupe[0].numero}"` : '';
    h += `<${ordonne ? 'ol' : 'ul'} class="${classe}"${debut}>`
      + groupe.map(it => `<li>${ctx.item ? ctx.item(it) : enLigne(it.texte, ctx)}${it.enfants.length ? htmlListe(it.enfants, ctx, classe) : ''}</li>`).join('')
      + `</${ordonne ? 'ol' : 'ul'}>`;
  }
  return h;
}

function htmlTableau(t, ctx = {}) {
  const cellule = (c, j) => (ctx.cellule ? ctx.cellule(c, j) : enLigne(c, ctx));
  const vide = (i, j) => (t.vides || []).includes(`${i}:${j}`);
  return `<p class="pv-glisser" aria-hidden="true">Faites glisser le tableau →</p><div class="ftable-wrap pv-table pv-col-${t.tete.length}"><table class="ftable">`
    + `<thead><tr>${t.tete.map(c => `<th scope="col">${enLigne(c)}</th>`).join('')}</tr></thead>`
    + `<tbody>${t.corps.map((r, i) => `<tr>${r.map((c, j) => (vide(i, j) ? '<td class="pv-absente" title="Cellule absente dans la fiche source (à compléter par l\'auteur)"></td>'
      : j === 0 ? `<th scope="row" class="rh">${cellule(c, j)}</th>` : `<td>${cellule(c, j)}</td>`)).join('')}</tr>`).join('')}</tbody>`
    + '</table></div>';
}

/* Ligne entièrement en gras (éventuellement suivie d'une précision entre parenthèses) = intertitre */
const RE_INTERTITRE = /^\*\*([^*]+)\*\*(\s*\(.*\))?$/;
const intertitre = b => b.type === 'p' && RE_INTERTITRE.test(b.texte) && !/^\*\*En bref\*\*/.test(b.texte);
function htmlIntertitre(b, ctx) {
  const m = b.texte.match(RE_INTERTITRE);
  return `<p class="siege-title pv-intertitre"><b>${enLigne(m[1], ctx)}</b>${m[2] ? ` <span class="pv-precision">${enLigne(m[2].trim(), ctx)}</span>` : ''}</p>`;
}

/* =======================================================
   Fiches : sections, types de section et couleurs fixes
   ======================================================= */
const RE_BREF = /^\*\*En bref\*\*\s*:\s*/;
const PLACE_SCHEMA = /^\*Schéma : .*schema-demarche-masse\.jsx.*\*$/;

/* Type de section selon son titre → couleur fixe (identique sur toutes les fiches) et composant */
function typeSection(titre) {
  const t = sansAccents(titre).toLowerCase();
  if (/^pieges?\b/.test(t)) return { type: 'pieges', c: 'var(--k-grave)' };
  if (/^signes? cles?\b/.test(t)) return { type: 'cles', c: 'var(--green)' };
  if (/^dans le compte rendu/.test(t)) return { type: 'cr', c: 'var(--muted)' };
  if (/^diagnostics? differentiels?/.test(t)) return { type: 'ddx', c: 'var(--purple)' };
  if (/^conduite a tenir/.test(t)) return { type: 'cat', c: 'var(--orange)' };
  if (/^imagerie\b/.test(t)) return { type: 'imagerie', c: 'var(--royal)' };
  if (/^(terrain|definitions?|clinique|contexte)\b/.test(t)) return { type: 'terrain', c: 'var(--blue)' };
  if (/^a retenir\b/.test(t)) return { type: 'retenir', c: 'var(--amber)' };
  if (/^complications?\b/.test(t)) return { type: 'complications', c: 'var(--rose)' };
  if (/^(technique|protocole|methodes?)\b/.test(t)) return { type: 'technique', c: 'var(--teal)' };
  return { type: 'autre', c: null };            // couleur d'accent du chapitre
}

/* Couleur d'accent de chaque chapitre (carte « En bref », sections sans type) */
const ACCENTS = ['var(--crimson)', 'var(--plum)', 'var(--teal)', 'var(--rose)', 'var(--purple)', 'var(--red)', 'var(--cornflower)', 'var(--gold)', 'var(--steel)', 'var(--slate)'];

function lireFiche(chemin, fichier) {
  FICHIER_EN_COURS = path.relative(RACINE, chemin);
  const B = blocs(lire(chemin));
  if (B[0].type !== 'titre' || B[0].niveau !== 1) echec(`${FICHIER_EN_COURS} : le fichier doit commencer par un titre « # »`);
  const ib = B.findIndex(b => b.type === 'p' && RE_BREF.test(b.texte));
  if (ib !== 1) echec(`${FICHIER_EN_COURS} : paragraphe « En bref » attendu juste après le titre`);
  const sections = [];
  let cur = { titre: null, blocs: [] };
  B.slice(2).forEach(b => {
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
    Object.assign(s, typeSection(s.titre));
  });
  return {
    fichier, numero: +fichier.slice(0, 2), slug: fichier.replace(/^\d\d-/, '').replace(/\.md$/, ''),
    titre: B[0].texte, bref: B[1].texte, sections: sections.filter(s => s.titre || s.blocs.length),
  };
}

/* Noms écrits dans une page de chapitre (listes numérotées ; lignes « Famille : a, b, c »), dans l'ordre */
function nomsDuChapitre(BC) {
  const noms = [];
  BC.forEach(b => {
    if (b.type !== 'liste') return;
    b.items.forEach(it => {
      if (it.ordonne) noms.push(it.texte);
      else {
        const m = it.texte.match(/^([^:]+) : (.+)$/) || echec(`ligne de page de chapitre inattendue : ${it.texte}`);
        noms.push(...m[2].split(', '));
      }
    });
  });
  return noms;
}

function lireChapitres() {
  const dossiers = fs.readdirSync(PELVIS).filter(d => /^\d\d-/.test(d) && fs.statSync(path.join(PELVIS, d)).isDirectory()).sort();
  return dossiers.map((d, k) => {
    const dir = path.join(PELVIS, d);
    const accueil = fs.readdirSync(dir).find(f => /^00-.+\.md$/.test(f)) || echec(`${d} : page de chapitre 00-*.md absente`);
    FICHIER_EN_COURS = `pelvis/${d}/${accueil}`;
    const BC = blocs(lire(path.join(dir, accueil)));
    const fichiers = fs.readdirSync(dir).filter(f => /^\d\d-.+\.md$/.test(f) && !f.startsWith('00-')).sort();
    const fiches = fichiers.map((f, i) => {
      const fi = lireFiche(path.join(dir, f), f);
      if (fi.numero !== i + 1) echec(`${d}/${f} : numérotation interrompue`);
      return fi;
    });
    const noms = nomsDuChapitre(BC);
    if (noms.length !== fiches.length) echec(`${d} : la page du chapitre nomme ${noms.length} fiches, ${fiches.length} fichiers`);
    const chap = { dossier: d, numero: k + 1, slug: d.replace(/^\d\d-/, ''), accueil, blocs: BC, titre: BC[0].texte, fiches, accent: ACCENTS[k % ACCENTS.length] };
    fiches.forEach((f, i) => { f.nom = noms[i]; f.chapitre = chap; });
    return chap;
  });
}

/* =======================================================
   Schéma de la fiche 08 (01-ovaire/schema-demarche-masse.jsx) en SVG statique
   Positions et textes repris du JSX à l'identique ; couleurs du site.
   ======================================================= */
function schemaDemarche(jsxChemin) {
  const jsx = lire(jsxChemin);
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
   p : préfixe vers la racine du site ; pv : préfixe vers pelvis/
   ======================================================= */
function page({ p, pv, titre, description, corps, corpsClasse = '' }) {
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
<body class="fiche-page pv-page${corpsClasse ? ' ' + corpsClasse : ''}" data-pv-racine="${pv}" data-pv-index="${pv}recherche.js?v={{V_INDEX}}">

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
  <script src="${pv}pelvis.js?v={{V_JS}}"></script>
  <script src="${p}fiche.js?v=${V.ficheJs}"></script>
</body>
</html>
`;
}

/* Champ de recherche (résultats remplis par pelvis.js) */
const recherche = (id, o = {}) => `<form class="pv-recherche${o.grand ? ' pv-recherche-grande' : ''}" role="search" action="#" data-pv-recherche>
          <label for="${id}">${o.libelle || 'Rechercher dans les fiches Pelvis'}</label>
          <div class="pv-recherche-champ"><input id="${id}" type="search" placeholder="${o.ph || 'torsion, O-RADS, FIGO, endométriome…'}" autocomplete="off" spellcheck="false" aria-controls="${id}-res"></div>
          <ol class="pv-resultats" id="${id}-res" aria-live="polite"></ol>
        </form>`;

const fil = items => `<nav class="crumbs" aria-label="Fil d'Ariane">${items.map(([t, u]) => (u ? `<a href="${u}">${esc(t)}</a>` : `<span>${esc(t)}</span>`)).join(' › ')}</nav>`;

/* Titre de section à pastille (composant .fsec-title des fiches) */
const titreSection = (num, titre, ctx = {}) => `<h2 class="fsec-title"><span class="fnum" aria-hidden="true">${num}</span>${enLigne(titre, ctx)}</h2>`;

/* =======================================================
   Construction
   ======================================================= */
function construire() {
  ANOMALIES.length = 0;
  const chapitres = lireChapitres();
  const fiches = chapitres.flatMap(c => c.fiches);
  const sommaireMd = lire(path.join(PELVIS, '00-sommaire.md'));
  const sourcesMd = lire(path.join(PELVIS, '99-sources.md'));
  FICHIER_EN_COURS = 'pelvis/00-sommaire.md';
  const BS = blocs(sommaireMd);

  /* Noms courts des chapitres : colonne « Chapitre » du tableau « Par organe » du sommaire, dans l'ordre des dossiers */
  const iOrg = BS.findIndex(b => b.type === 'titre' && ancre(b.texte) === 'par-organe');
  const tableOrg = BS.slice(iOrg).find(b => b.type === 'tableau') || echec('tableau « Par organe » introuvable');
  if (tableOrg.corps.length !== chapitres.length) echec(`le sommaire nomme ${tableOrg.corps.length} chapitres, ${chapitres.length} dossiers`);
  chapitres.forEach((c, i) => { c.nom = tableOrg.corps[i][0]; });

  /* Noms → fiche : noms des pages de chapitre, titres des fiches, et formulations du sommaire et des renvois */
  const NOMS = new Map();
  const ajouterNom = (n, f) => { if (NOMS.has(n) && NOMS.get(n) !== f) NOMS.set(n, null); else NOMS.set(n, f); };   // null : ambigu
  fiches.forEach(f => { ajouterNom(f.nom, f); ajouterNom(f.titre, f); });
  const parChemin = c => fiches.find(f => `${f.chapitre.slug}/${f.slug}` === c) || echec(`fiche ${c} introuvable`);
  const ALIAS = {
    'Infection génitale haute et salpingite': 'trompe/infection-genitale-haute-salpingite',
    'Saignements après la ménopause': 'endometre-col/saignements-apres-menopause',
    'Hypertrophie endométriale': 'endometre-col/hypertrophie-endometriale',
    'Malformation artério-veineuse': 'vasculaire/malformation-arterio-veineuse',
    'Faux anévrisme': 'vasculaire/faux-anevrisme',
    'Généralités et stratégie (endométriose)': 'endometriose/generalites-strategie',
    'Repères et grades': 'plancher-pelvien/reperes-grades',
  };
  Object.entries(ALIAS).forEach(([n, c]) => ajouterNom(n, parChemin(c)));
  const RENVOIS = { 'Repères': 'plancher-pelvien/reperes-grades' };           // « (fiche Repères) »
  const nomsTries = [...NOMS.keys()].filter(n => NOMS.get(n)).sort((a, b) => b.length - a.length);
  const reNoms = new RegExp(nomsTries.map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'g');
  const url = (f, depuis) => (depuis === 'pelvis' ? `${f.chapitre.slug}/${f.slug}.html` : depuis === f.chapitre.slug ? `${f.slug}.html` : `../${f.chapitre.slug}/${f.slug}.html`);
  const LIENS_FAITS = [];
  /* Lier les noms de fiches d'un texte brut (sommaire : situations cliniques) */
  const lierNoms = depuis => s => {
    let h = '', d = 0;
    for (const m of s.matchAll(reNoms)) {
      const avant = s[m.index - 1], apres = s[m.index + m[0].length];
      if ((avant && /[\p{L}\p{N}]/u.test(avant)) || (apres && /[\p{L}\p{N}]/u.test(apres))) continue;   // mot entier seulement
      const f = NOMS.get(m[0]);
      h += esc(s.slice(d, m.index)) + `<a href="${url(f, depuis)}">${esc(m[0])}</a>`;
      LIENS_FAITS.push([depuis, m[0], `${f.chapitre.slug}/${f.slug}`]);
      d = m.index + m[0].length;
    }
    return h + esc(s.slice(d));
  };
  /* Renvois dans une fiche : « fiche <Nom> » */
  const lierRenvois = depuis => s => {
    let h = '', d = 0;
    for (const m of s.matchAll(/\bfiche ([A-ZÉÈ][^().,;:]*)/g)) {
      const cand = m[1].trim();
      const nom = nomsTries.find(n => cand === n || cand.startsWith(n + ' ')) || Object.keys(RENVOIS).find(n => cand === n);
      if (!nom) continue;
      const f = NOMS.get(nom) || parChemin(RENVOIS[nom]);
      const debut = m.index + 'fiche '.length;
      h += esc(s.slice(d, debut)) + `<a href="${url(f, depuis)}">${esc(nom)}</a>`;
      LIENS_FAITS.push([depuis, nom, `${f.chapitre.slug}/${f.slug}`]);
      d = debut + nom.length;
    }
    return h + esc(s.slice(d));
  };

  const sorties = {};
  const ecrire = (rel, html) => { sorties[rel] = html; };

  /* ---------- Menu des chapitres (sommaire latéral) ---------- */
  const menu = (actuelle, depuis) => {
    const versChap = c => (depuis === c.slug ? 'index.html' : `../${c.slug}/index.html`);
    return `<ol class="pv-chapitres">${chapitres.map(c => {
      const ici = actuelle && actuelle.chapitre === c;
      const liste = ici ? `<ol class="pv-liste-fiches">${c.fiches.map(f => `<li${f === actuelle ? ' class="is-ici"' : ''}><a href="${url(f, depuis)}"${f === actuelle ? ' aria-current="page"' : ''}><b>${String(f.numero).padStart(2, '0')}</b>${esc(f.nom)}</a></li>`).join('')}</ol>` : '';
      return `<li${ici ? ' class="is-ici"' : ''}><a class="pv-chap-lien" href="${versChap(c)}" style="--c:${c.accent}"><b>${c.numero}</b>${esc(c.nom)}</a>${liste}</li>`;
    }).join('')}</ol>`;
  };

  /* ---------- Fiches ---------- */
  const index = [];
  let schema = null;
  fiches.forEach((f, k) => {
    const c = f.chapitre, prec = fiches[k - 1], suiv = fiches[k + 1];
    const ctx = { lier: lierRenvois(c.slug) };
    let n = 0;
    const corpsSections = f.sections.map(s => {
      // Blocs : texte regroupé en cartes ; tableaux, citations et schéma à part (comme dans les fiches rapides)
      const morceaux = [];
      let carte = [];
      const fermer = () => { if (carte.length) { morceaux.push({ carte }); carte = []; } };
      s.blocs.forEach(b => {
        if (b.type === 'p' && PLACE_SCHEMA.test(b.texte)) {
          if (f.slug !== 'demarche-masse-annexielle') echec(`${f.fichier} : schéma inattendu`);
          schema = schema || schemaDemarche(path.join(PELVIS, c.dossier, 'schema-demarche-masse.jsx'));
          fermer(); morceaux.push({ html: '<!--/md-->' + schema + '<!--md-->' });
        } else if (b.type === 'tableau') { fermer(); morceaux.push({ html: htmlTableau(b, ctx) }); }
        else if (b.type === 'citation') { fermer(); morceaux.push({ html: `<div class="callout pv-encadre">${b.blocs.map(x => htmlBloc(x, ctx)).join('')}</div>` }); }
        else carte.push(b);
      });
      fermer();
      const coul = s.c || c.accent;
      const cartes = morceaux.map(m => {
        if (m.html) return m.html;
        if (s.type === 'cr') {
          // Check-list : chaque point de la liste devient une case à cocher (texte inchangé)
          return `<div class="fcard checklist pv-checklist" style="--c:${coul}">${m.carte.map(b => (b.type === 'liste'
            ? b.items.map(it => `<label><input type="checkbox"> <span>${enLigne(it.texte, ctx)}${it.enfants.length ? htmlListe(it.enfants, ctx) : ''}</span></label>`).join('')
            : htmlBloc(b, ctx))).join('')}<p class="check-count" aria-live="polite"></p><button class="btn btn-outline btn-sm check-reset" type="button">Tout décocher</button></div>`;
        }
        const classe = s.type === 'pieges' ? 'fcard alert pv-pieges' : s.type === 'cles' ? 'fcard pv-cles' : 'fcard';
        return `<div class="${classe}" style="--c:${coul}">${m.carte.map(b => htmlBloc(b, ctx)).join('')}</div>`;
      }).join('\n');
      if (!s.titre) return `<div class="pv-intro">${cartes}</div>`;
      const num = s.type === 'pieges' ? '⚠' : ROMAIN(++n);
      s.num = num;
      return `<section class="fsec pv-sec pv-type-${s.type}" id="${s.id}" style="--c:${coul}">${titreSection(num, s.titre)}${cartes}</section>`;
    }).join('\n');
    const puces = f.sections.filter(s => s.titre).map(s => `<li><a href="#${s.id}" style="--c:${s.c || c.accent}"><b>${s.num}</b>${enLigne(s.titre)}</a></li>`).join('');
    const corps = `    <section class="fiche-hero sec-down pv-hero">
      <div class="container">
        ${fil([['Pelvis', '../index.html'], [c.nom, 'index.html'], [texteBrut(f.titre)]])}
        <p class="marker-tag">Fiche rapide · Pelvis · ${esc(c.nom)}</p>
        <h1><!--md-->${enLigne(f.titre)}<!--/md--></h1>
        <div class="fiche-actions">
          <button class="btn btn-outline btn-sm" id="print-btn">Imprimer / PDF</button>
          ${f.sections.some(s => s.type === 'cr') ? `<a href="#${f.sections.find(s => s.type === 'cr').id}" class="btn btn-outline btn-sm">Dans le compte rendu</a>` : ''}
          <a href="../sources.html" class="btn btn-outline btn-sm">Sources</a>
        </div>
      </div>
    </section>

    <div class="container fiche-layout pv-layout">
      <details class="pv-menu" open>
        <summary>Chapitres et fiches · Rechercher</summary>
        <div class="pv-menu-corps">
          ${recherche('pv-q', { ph: 'Rechercher…' })}
          <p class="toc-title"><a href="../index.html">Pelvis</a></p>
          ${menu(f, c.slug)}
          <p class="pv-menu-liens"><a href="../classifications.html">Classifications</a> · <a href="../sources.html">Sources</a></p>
        </div>
      </details>

      <article class="fiche-body pv-fiche" id="fiche-body">
        <div class="fcard pv-bref" style="--c:${c.accent}" role="note"><p><!--md-->${enLigne(f.bref, ctx)}<!--/md--></p></div>
        <nav class="toc pv-puces" aria-label="Sections de la fiche"><ol>${puces}</ol></nav>
        <!--md-->${corpsSections}<!--/md-->

        <nav class="pv-suite" aria-label="Fiche précédente et suivante">
          ${prec ? `<a class="pv-prec" href="${url(prec, c.slug)}" rel="prev"><small>← Fiche précédente${prec.chapitre !== c ? ` · ${esc(prec.chapitre.nom)}` : ''}</small><b>${esc(prec.nom)}</b></a>` : '<a class="pv-prec" href="../index.html"><small>← Sommaire</small><b>Pelvis</b></a>'}
          ${suiv ? `<a class="pv-suiv" href="${url(suiv, c.slug)}" rel="next"><small>Fiche suivante${suiv.chapitre !== c ? ` · ${esc(suiv.chapitre.nom)}` : ''} →</small><b>${esc(suiv.nom)}</b></a>` : '<a class="pv-suiv" href="../index.html"><small>Sommaire →</small><b>Pelvis</b></a>'}
        </nav>
        <p class="pv-sources"><a href="../sources.html">Sources</a></p>
      </article>
    </div>`;
    ecrire(`${c.slug}/${f.slug}.html`, page({
      p: '../../', pv: '../', titre: `${texteBrut(f.titre)} — Pelvis, ${c.nom.toLowerCase()} | RadiologicHub`, description: texteBrut(f.bref.replace(RE_BREF, '')), corps, corpsClasse: 'pv-page-fiche',
    }));
    index.push({
      t: texteBrut(f.titre), n: f.nom, u: `${c.slug}/${f.slug}.html`, c: c.nom, b: texteBrut(f.bref.replace(RE_BREF, '')),
      s: f.sections.map(s => ({ i: s.id || '', t: s.titre ? texteBrut(s.titre) : '', x: texteSection(s) })),
    });
  });

  /* ---------- Pages de chapitre ---------- */
  chapitres.forEach(c => {
    let n = 0;
    const parNom = new Map(c.fiches.map(f => [f.nom, f]));
    const ctxC = {
      item: it => {
        if (it.ordonne) { const f = parNom.get(it.texte) || echec(`${c.dossier} : fiche « ${it.texte} » inconnue`); return `<a href="${f.slug}.html">${enLigne(it.texte)}</a>`; }
        const m = it.texte.match(/^([^:]+) : (.+)$/);
        return `${esc(m[1])} : ${m[2].split(', ').map(x => `<a href="${parNom.get(x).slug}.html">${esc(x)}</a>`).join(', ')}`;
      },
    };
    const sections = [];
    let cur = null;
    c.blocs.slice(1).forEach(b => {
      if (b.type === 'titre') { cur = { titre: b.texte, blocs: [] }; sections.push(cur); }
      else if (!cur) sections.push({ intro: b });
      else cur.blocs.push(b);
    });
    const contenu = sections.map(s => (s.intro ? (s.intro.type === 'p' ? `<div class="fcard pv-bref" style="--c:${c.accent}"><p>${enLigne(s.intro.texte)}</p></div>`
      : `<div class="fcard pv-liste-chapitre" style="--c:${c.accent}">${htmlBloc(s.intro, ctxC)}</div>`)
      : `<section class="fsec pv-sec" id="${ancre(s.titre)}" style="--c:${c.accent}">${titreSection(ROMAIN(++n), s.titre)}<div class="fcard pv-liste-chapitre" style="--c:${c.accent}">${s.blocs.map(b => htmlBloc(b, ctxC)).join('')}</div></section>`)).join('\n');
    const corps = `    <section class="fiche-hero sec-down pv-hero">
      <div class="container">
        ${fil([['Pelvis', '../index.html'], [c.nom]])}
        <p class="marker-tag">Pelvis · chapitre ${c.numero} / ${chapitres.length}</p>
        <h1><!--md-->${enLigne(c.titre)}<!--/md--></h1>
        ${recherche('pv-q', { grand: true })}
      </div>
    </section>
    <div class="container fiche-layout pv-layout">
      <details class="pv-menu" open>
        <summary>Chapitres · Rechercher</summary>
        <div class="pv-menu-corps">
          <p class="toc-title"><a href="../index.html">Pelvis</a></p>
          ${menu(null, c.slug).replace(`href="index.html" style`, `href="index.html" aria-current="page" style`)}
          <p class="pv-menu-liens"><a href="../classifications.html">Classifications</a> · <a href="../sources.html">Sources</a></p>
        </div>
      </details>
      <div class="fiche-body pv-fiche pv-chapitre">
        <!--md-->${contenu}<!--/md-->
        <p class="pv-sources"><a href="../sources.html">Sources</a> · <a href="../index.html">Sommaire Pelvis</a> · <a href="../classifications.html">Classifications</a></p>
      </div>
    </div>`;
    ecrire(`${c.slug}/index.html`, page({ p: '../../', pv: '../', titre: `${texteBrut(c.titre)} — Pelvis | RadiologicHub`, description: texteBrut((c.blocs.find(b => b.type === 'p') || { texte: c.titre }).texte), corps }));
  });

  /* ---------- Sommaire Pelvis ---------- */
  {
    const titre = BS[0].texte;
    let n = 0, section = null;
    const ctxS = {
      lier: lierNoms('pelvis'),
      cellule: (cel, j, table) => {
        if (table === 'organes' && j === 0) { const ch = chapitres.find(x => x.nom === cel); return `<a href="${ch.slug}/index.html">${esc(cel)}</a>`; }
        if (table === 'classifications' && j === 2) { const fi = NOMS.get(cel) || echec(`classification : fiche « ${cel} » introuvable`); LIENS_FAITS.push(['pelvis', cel, `${fi.chapitre.slug}/${fi.slug}`]); return `<a href="${url(fi, 'pelvis')}">${esc(cel)}</a>`; }
        return enLigne(cel);
      },
    };
    const parties = [];
    let cur = null;
    BS.slice(1).forEach(b => {
      if (b.type === 'titre') { section = ancre(b.texte); cur = { id: section, titre: b.texte, blocs: [] }; parties.push(cur); }
      else if (!cur) parties.push({ intro: b });
      else cur.blocs.push(b);
    });
    const rendre = (b, id) => {
      if (b.type === 'tableau') return htmlTableau(b, { ...ctxS, cellule: (x, j) => ctxS.cellule(x, j, id === 'par-organe' ? 'organes' : id === 'classifications' ? 'classifications' : '') });
      if (b.type === 'liste') return htmlListe(b.items, id === 'par-situation-clinique' ? ctxS : {});
      return htmlBloc(b, {});
    };
    const contenu = parties.map(s => {
      if (s.intro) return `<div class="fcard pv-bref" style="--c: var(--crimson)"><p>${enLigne(s.intro.texte)}</p></div>`;
      const tab = s.blocs.filter(b => b.type === 'tableau').map(b => rendre(b, s.id)).join('');
      const reste = s.blocs.filter(b => b.type !== 'tableau').map(b => rendre(b, s.id)).join('');
      return `<section class="fsec pv-sec" id="${s.id}" style="--c: var(--crimson)">${titreSection(ROMAIN(++n), s.titre)}${tab}${reste ? `<div class="fcard" style="--c: var(--crimson)">${reste}</div>` : ''}</section>`;
    }).join('\n');
    ['par-organe', 'par-situation-clinique', 'classifications', 'plan-commun-de-chaque-fiche'].forEach(a => { if (!parties.some(s => s.id === a)) echec(`rubrique #${a} absente du sommaire`); });
    const corps = `    <section class="fiche-hero sec-down pv-hero">
      <div class="container">
        ${fil([['Fiches rapides', '../fiches-rapides.html#femme'], ['Pelvis']])}
        <p class="marker-tag">Imagerie de la femme · ${fiches.length} fiches</p>
        <h1><!--md-->${enLigne(titre)}<!--/md--></h1>
        <nav class="pv-portes" aria-label="Entrées de la section">
          <a href="#par-organe" style="--c: var(--crimson)"><b>1</b>Par organe</a>
          <a href="#par-situation-clinique" style="--c: var(--amber)"><b>2</b>Par situation clinique</a>
          <a href="classifications.html" style="--c: var(--teal)"><b>3</b>Par classification</a>
        </nav>
        ${recherche('pv-q', { grand: true })}
      </div>
    </section>
    <div class="container pv-colonne pv-fiche pv-sommaire">
      <!--md-->${contenu}<!--/md-->
      <p class="pv-sources"><a href="sources.html">Sources</a></p>
    </div>`;
    ecrire('index.html', page({ p: '../', pv: '', titre: `${texteBrut(titre)} | RadiologicHub`, description: texteBrut(BS.find(b => b.type === 'p').texte), corps }));

    /* ---------- Classifications ---------- */
    const iC = parties.findIndex(s => s.id === 'classifications');
    const tableC = parties[iC].blocs.find(b => b.type === 'tableau');
    const corpsC = `    <section class="fiche-hero sec-down pv-hero">
      <div class="container">
        ${fil([['Pelvis', 'index.html'], [parties[iC].titre]])}
        <p class="marker-tag">Pelvis · par classification</p>
        <h1>${enLigne(parties[iC].titre)}</h1>
        ${recherche('pv-q', { grand: true })}
      </div>
    </section>
    <div class="container pv-colonne pv-fiche">
      <section class="fsec pv-sec" id="pelvis" style="--c: var(--crimson)">
        <h2 class="fsec-title"><span class="fnum" aria-hidden="true">I</span>Classifications de la section Pelvis</h2>
        <!--md-->${htmlTableau(tableC, { cellule: (x, j) => ctxS.cellule(x, j, 'classifications') })}<!--/md-->
      </section>
      <section class="fsec pv-sec" id="autres" style="--c: var(--teal)">
        <h2 class="fsec-title"><span class="fnum" aria-hidden="true">II</span>Autres classifications du site</h2>
        <div class="pv-cartes">
          <a class="pv-carte" href="../outils/bosniak.html" style="--c: var(--teal)"><span class="pv-carte-badge">Rein · Uro</span><h3>Classification de Bosniak 2019</h3><p>Masses rénales kystiques : les 5 catégories en schémas, le calculateur et la conduite à tenir.</p><span class="fiche-open">Calculateur Bosniak →</span></a>
          <a class="pv-carte" href="../suivi-oncologique.html" style="--c: var(--blue)"><span class="pv-carte-badge">Oncologie</span><h3>RECIST 1.1 et Lugano</h3><p>Suivi oncologique : registre des lésions cibles et non cibles, sommes, nadir et réponse.</p><span class="fiche-open">Suivi oncologique →</span></a>
          <a class="pv-carte" href="../comptes-rendus.html" style="--c: var(--plum)"><span class="pv-carte-badge">Comptes rendus</span><h3>Scores des comptes rendus</h3><p>PI-RADS, BI-RADS, EU-TIRADS, Fleischner, FIGO des myomes, CAD-RADS, OsteoGamme : schémas et calculateurs de l'éditeur.</p><span class="fiche-open">Comptes rendus →</span></a>
        </div>
      </section>
      <p class="pv-sources"><a href="sources.html">Sources</a> · <a href="index.html">Sommaire Pelvis</a></p>
    </div>`;
    ecrire('classifications.html', page({
      p: '../', pv: '', titre: `${texteBrut(parties[iC].titre)} — Pelvis | RadiologicHub`,
      description: 'Classifications de la section Pelvis (O-RADS, FIGO, PCI, malformations, score FIGO/OMS, grades de prolapsus) avec leur fiche, à côté de Bosniak et RECIST.', corps: corpsC,
    }));
  }

  /* ---------- Sources ---------- */
  {
    FICHIER_EN_COURS = 'pelvis/99-sources.md';
    const BR = blocs(sourcesMd);
    let n = 0;
    const parties = [];
    let cur = null;
    BR.slice(1).forEach(b => {
      if (b.type === 'titre') { cur = { titre: b.texte, blocs: [] }; parties.push(cur); }
      else if (!cur) parties.push({ intro: b });
      else cur.blocs.push(b);
    });
    const contenu = parties.map(s => (s.intro ? `<p class="pv-chapo">${enLigne(s.intro.texte)}</p>`
      : `<section class="fsec pv-sec" id="${ancre(s.titre)}" style="--c: var(--steel)">${titreSection(ROMAIN(++n), s.titre)}<div class="fcard pv-page-sources" style="--c: var(--steel)">${s.blocs.map(b => htmlBloc(b, {})).join('')}</div></section>`)).join('\n');
    const corps = `    <section class="fiche-hero sec-down pv-hero">
      <div class="container">
        ${fil([['Pelvis', 'index.html'], [BR[0].texte]])}
        <p class="marker-tag">Pelvis</p>
        <h1><!--md-->${enLigne(BR[0].texte)}<!--/md--></h1>
      </div>
    </section>
    <div class="container pv-colonne pv-fiche">
      <!--md-->${contenu}<!--/md-->
      <p class="pv-sources"><a href="index.html">Sommaire Pelvis</a> · <a href="classifications.html">Classifications</a></p>
    </div>`;
    ecrire('sources.html', page({ p: '../', pv: '', titre: `${texteBrut(BR[0].texte)} — Pelvis | RadiologicHub`, description: texteBrut(BR.find(b => b.type === 'p').texte), corps }));
  }

  /* ---------- Index de recherche et versions ---------- */
  const js = `/* Généré par scripts/construire-pelvis.js — ne pas modifier à la main.
   Index de recherche de la section Pelvis : une entrée par fiche
   (t : titre, n : nom dans la page du chapitre, u : adresse depuis pelvis/, c : chapitre, b : En bref,
   s : sections { i : ancre, t : titre, x : texte }). */
window.PelvisRecherche = ${JSON.stringify(index)};
`;
  sorties['recherche.js'] = js;
  const vCss = empreinte(lire(path.join(PELVIS, 'pelvis.css')));
  const vJs = empreinte(lire(path.join(PELVIS, 'pelvis.js')));
  const vIndex = empreinte(js);
  for (const k of Object.keys(sorties)) if (k.endsWith('.html')) sorties[k] = sorties[k].replace(/\{\{V_CSS\}\}/g, vCss).replace(/\{\{V_JS\}\}/g, vJs).replace(/\{\{V_INDEX\}\}/g, vIndex);
  return { sorties, chapitres, fiches, liens: LIENS_FAITS };
}

function htmlBloc(b, ctx) {
  if (intertitre(b)) return htmlIntertitre(b, ctx);
  if (b.type === 'p') return `<p>${enLigne(b.texte, ctx)}</p>`;
  if (b.type === 'liste') return htmlListe(b.items, ctx);
  if (b.type === 'tableau') return htmlTableau(b, ctx);
  if (b.type === 'citation') return `<div class="callout pv-encadre">${b.blocs.map(x => htmlBloc(x, ctx)).join('')}</div>`;
  if (b.type === 'titre') return `<h${b.niveau + 1} class="marker-sub">${enLigne(b.texte, ctx)}</h${b.niveau + 1}>`;
  return echec(`bloc inconnu ${b.type}`);
}

/* Texte brut d'une section (index de recherche) */
function texteSection(s) {
  const morceaux = [];
  const items = its => its.forEach(it => { morceaux.push(texteBrut(it.texte)); items(it.enfants); });
  const parcourir = bs => bs.forEach(b => {
    if (b.type === 'p') { if (!PLACE_SCHEMA.test(b.texte)) morceaux.push(texteBrut(b.texte)); }
    else if (b.type === 'liste') items(b.items);
    else if (b.type === 'tableau') { morceaux.push(b.tete.map(texteBrut).join(' · ')); b.corps.forEach(r => morceaux.push(r.map(texteBrut).join(' · '))); }
    else if (b.type === 'citation') parcourir(b.blocs);
    else if (b.type === 'titre') morceaux.push(texteBrut(b.texte));
  });
  parcourir(s.blocs);
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
    else { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, contenu); }
  }
  // Pages générées qui n'ont plus de source (fiche renommée ou supprimée)
  const attendues = new Set(Object.keys(sorties).map(r => path.join(PELVIS, r)));
  const orphelines = [];
  const parcourir = d => fs.readdirSync(d, { withFileTypes: true }).forEach(e => {
    const p = path.join(d, e.name);
    if (e.isDirectory()) parcourir(p);
    else if (e.name.endsWith('.html') && !attendues.has(p)) orphelines.push(p);
  });
  parcourir(PELVIS);
  orphelines.forEach(p => { if (verifier) console.error(`page sans source : ${path.relative(RACINE, p)}`); else { fs.unlinkSync(p); console.log(`supprimé : ${path.relative(RACINE, p)}`); } });
  ANOMALIES.forEach(a => console.warn(`anomalie de la source : ${a.fichier}, tableau, ligne ${a.ligne} : cellule « ${a.colonnes.join(' », « ')} » absente — ${a.texte}`));
  if (verifier && (ecarts || orphelines.length)) { console.error(`${ecarts + orphelines.length} fichier(s) à régénérer : npm run build`); process.exit(1); }
  console.log(`${Object.keys(sorties).length} fichiers ${verifier ? 'vérifiés' : 'à jour'}${ecarts && !verifier ? ` (${ecarts} écrits)` : ''}.`);
}
