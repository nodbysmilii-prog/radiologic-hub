/* Tests de la section Pelvis (pelvis/, scripts/construire-pelvis.js) :
   - le texte des 95 fichiers Markdown est reproduit MOT POUR MOT dans les pages (aucune reformulation) ;
   - **mot clé** et ==alerte== deviennent exactement autant de mots clés en gras et de badges rouges ;
   - les pages générées sont à jour (npm run build) et toutes publiées (95 + Classifications) ;
   - structure, titres et descriptions, fil d'Ariane, fiche précédente / suivante, menu des chapitres,
     rangée de puces des sections, composants des fiches rapides (Pièges, Signes clés, check-list) ;
   - liens : noms de fiches du sommaire, des pages de chapitre et des renvois ; liens internes et ancres ;
   - index de recherche, schéma de la fiche 08 (textes du JSX identiques).
   Lancer : npm test   (ou : node --test tests/*.test.js) */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const RACINE = path.join(__dirname, '..');
const P = f => path.join(RACINE, 'pelvis', f);
const lire = f => fs.readFileSync(f, 'utf8');
const G = require('../scripts/construire-pelvis.js');
const { verifier, pagesHtml } = require('../scripts/verifier-liens.js');
const { sorties, chapitres, fiches } = G.construire();
const pageFiche = f => lire(P(`${f.chapitre.slug}/${f.slug}.html`));
const mdFiche = f => lire(P(`${f.chapitre.dossier}/${f.fichier}`));
const PLACE_SCHEMA = /^\*Schéma : .*schema-demarche-masse\.jsx.*\*$/;

/* ---------- Texte d'un Markdown, extrait indépendamment du générateur ---------- */
function motsMd(md, { sauter = [] } = {}) {
  return md.split('\n')
    .filter(l => l.trim() && !sauter.some(r => r.test(l)) && !/^\s*\|?\s*:?-{3,}/.test(l))
    .map(l => l.replace(/^\s*>\s?/, '').replace(/^\s*#{1,6}\s+/, '').replace(/^\s*(?:[-*]|\d+\.)\s+/, '').replace(/\|/g, ' ')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/\*/g, '').replace(/==/g, '').replace(/`/g, ''))
    .join(' ').split(/\s+/).filter(Boolean);
}
/* Zones <!--md--> … <!--/md--> d'une page, sans les éléments d'interface (pastilles, cases, boutons, indications) */
function zones(html) {
  return [...html.matchAll(/<!--md-->([\s\S]*?)<!--\/md-->/g)].map(m => m[1]).join(' ')
    .replace(/<span class="fnum" aria-hidden="true">[^<]*<\/span>/g, ' ')
    .replace(/<p class="pv-glisser" aria-hidden="true">[^<]*<\/p>/g, ' ')
    .replace(/<p class="check-count"[^>]*><\/p><button class="btn btn-outline btn-sm check-reset" type="button">[^<]*<\/button>/g, ' ');
}
function motsHtml(html) {
  return zones(html).replace(/<\/?(a|b|em|mark|span|code|small)\b[^>]*>/g, '').replace(/<[^>]+>/g, ' ')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&')
    .split(/\s+/).filter(Boolean);
}
function memesMots(attendu, obtenu, nom) {
  const i = attendu.findIndex((m, k) => m !== obtenu[k]);
  assert.ok(i < 0 && attendu.length === obtenu.length,
    `${nom} : texte différent à partir du mot ${i < 0 ? Math.min(attendu.length, obtenu.length) : i} — attendu « ${attendu.slice(Math.max(0, i - 4), i + 8).join(' ')} », page « ${obtenu.slice(Math.max(0, i - 4), i + 8).join(' ')} »`);
}

test('95 fichiers Markdown publiés : 83 fiches, 10 chapitres, sommaire, sources (+ Classifications)', () => {
  const md = [];
  const parcourir = d => fs.readdirSync(d, { withFileTypes: true }).forEach(e => { const p = path.join(d, e.name); if (e.isDirectory()) parcourir(p); else if (e.name.endsWith('.md') && e.name !== 'LISEZ-MOI-claude-code.md') md.push(p); });
  parcourir(P(''));
  assert.equal(md.length, 95);
  assert.equal(chapitres.length, 10);
  assert.equal(fiches.length, 83);
  assert.deepEqual(chapitres.map(c => c.fiches.length), [20, 11, 8, 10, 9, 5, 7, 3, 7, 3]);
  const html = pagesHtml(P(''));
  assert.equal(html.length, 96);
  fiches.forEach(f => assert.ok(fs.existsSync(P(`${f.chapitre.slug}/${f.slug}.html`)), `${f.chapitre.slug}/${f.slug}`));
  chapitres.forEach(c => assert.ok(fs.existsSync(P(`${c.slug}/index.html`)), c.slug));
  ['index.html', 'sources.html', 'classifications.html', 'recherche.js', 'pelvis.css', 'pelvis.js'].forEach(f => assert.ok(fs.existsSync(P(f)), f));
  // Adresses : /pelvis/<chapitre>/<fiche> = dossier et fichier sans leur numéro
  assert.deepEqual(chapitres.map(c => c.slug), ['ovaire', 'endometriose', 'trompe', 'endometre-col', 'myometre', 'vasculaire', 'malformations', 'trophoblaste', 'plancher-pelvien', 'carcinose']);
  assert.ok(fs.existsSync(P('trompe/grossesse-extra-uterine.html')) && fs.existsSync(P('endometre-col/adenocarcinome-endometre.html')));
});

test('texte des 83 fiches reproduit mot pour mot (titre, En bref, sections, tableaux, encadrés)', () => {
  for (const f of fiches) {
    const md = mdFiche(f);
    const sauter = f.slug === 'demarche-masse-annexielle' ? [PLACE_SCHEMA] : [];
    memesMots(motsMd(md, { sauter }), motsHtml(pageFiche(f)), `${f.chapitre.dossier}/${f.fichier}`);
  }
});

test('texte du sommaire, des 10 pages de chapitre, des sources et du tableau des classifications reproduit mot pour mot', () => {
  memesMots(motsMd(lire(P('00-sommaire.md'))), motsHtml(lire(P('index.html'))), '00-sommaire.md');
  memesMots(motsMd(lire(P('99-sources.md'))), motsHtml(lire(P('sources.html'))), '99-sources.md');
  for (const c of chapitres) memesMots(motsMd(lire(P(`${c.dossier}/${c.accueil}`))), motsHtml(lire(P(`${c.slug}/index.html`))), `${c.dossier}/${c.accueil}`);
  const som = lire(P('00-sommaire.md'));
  const tableau = som.slice(som.indexOf('## Classifications')).split('\n').filter(l => l.startsWith('|')).join('\n');
  memesMots(motsMd(tableau), motsHtml(lire(P('classifications.html'))), 'tableau des classifications');
});

test('mise en relief : chaque **mot clé** est en gras et chaque ==alerte== est un badge rouge, rien d\'oublié', () => {
  let marques = 0;
  for (const f of fiches) {
    const md = mdFiche(f).split('\n').filter(l => !PLACE_SCHEMA.test(l)).join('\n');
    const z = zones(pageFiche(f));
    const gras = (md.match(/\*\*(.+?)\*\*/g) || []).length, alertes = (md.match(/==(.+?)==/g) || []).length;
    assert.equal((z.match(/<b>/g) || []).length, gras, `${f.fichier} : mots clés en gras`);
    assert.equal((z.match(/<mark class="k-grave">/g) || []).length, alertes, `${f.fichier} : badges rouges`);
    assert.ok(!/\*\*|==/.test(z.replace(/<[^>]+>/g, '')), `${f.fichier} : balise Markdown restée dans le texte`);
    marques += alertes;
  }
  assert.ok(marques >= 20, `${marques} badges rouges`);
  // Exemple : Torsion d'annexe
  const t = pageFiche(fiches.find(f => f.slug === 'torsion-annexe'));
  assert.match(t, /<mark class="k-grave">urgence chirurgicale<\/mark>/);
  assert.match(t, /<b>torsion puis détorsion<\/b>/);
});

test('pages à jour : npm run build ne changerait rien', () => {
  for (const [rel, contenu] of Object.entries(sorties)) {
    assert.ok(fs.existsSync(P(rel)), `pelvis/${rel} absent : npm run build`);
    assert.equal(lire(P(rel)), contenu, `pelvis/${rel} pas à jour : npm run build`);
  }
  assert.equal(pagesHtml(P('')).length, Object.keys(sorties).filter(k => k.endsWith('.html')).length, 'aucune page sans source');
});

test('chaque fiche : titre, description (En bref), fil d\'Ariane, carte En bref, puces, sections, navigation, Sources', () => {
  fiches.forEach((f, k) => {
    const h = pageFiche(f), c = f.chapitre;
    const bref = G.texteBrut(f.bref).replace(/^En bref\s*:\s*/, '');
    assert.ok(h.includes(`<title>${G.texteBrut(f.titre).replace(/&/g, '&amp;')} — Pelvis, ${c.nom.toLowerCase()} | RadiologicHub</title>`), `${f.slug} : titre`);
    assert.ok(h.includes(`<meta name="description" content="${bref.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')}">`), `${f.slug} : description = En bref`);
    assert.ok(h.includes(`<nav class="crumbs" aria-label="Fil d'Ariane"><a href="../index.html">Pelvis</a> › <a href="index.html">${c.nom.replace(/'/g, "'")}</a> › <span>`), `${f.slug} : fil d'Ariane`);
    assert.match(h, /<div class="fcard pv-bref" style="--c:[^"]+" role="note"><p><!--md--><b>En bref<\/b> : /, `${f.slug} : carte En bref`);
    // Rangée de puces : une par section, vers une ancre existante, même pastille que le titre
    const secs = [...h.matchAll(/<section class="fsec pv-sec pv-type-([a-z]+)" id="([^"]+)" style="--c:[^"]+"><h2 class="fsec-title"><span class="fnum" aria-hidden="true">([^<]+)<\/span>/g)];
    const puces = [...h.slice(h.indexOf('<nav class="toc pv-puces"'), h.indexOf('</nav>', h.indexOf('<nav class="toc pv-puces"'))).matchAll(/<a href="#([^"]+)" style="--c:[^"]+"><b>([^<]+)<\/b>/g)];
    assert.ok(secs.length >= 2, `${f.slug} : sections`);
    assert.deepEqual(puces.map(m => [m[1], m[2]]), secs.map(m => [m[2], m[3]]), `${f.slug} : puces = sections`);
    for (const s of secs) {
      if (s[1] === 'pieges') { assert.equal(s[3], '⚠'); assert.match(h.slice(s.index, s.index + 600), /<div class="fcard alert pv-pieges"/, `${f.slug} : Pièges en alerte`); }
      if (s[1] === 'cles') assert.match(h.slice(s.index, s.index + 600), /<div class="fcard pv-cles"/, `${f.slug} : Signes clés en carte verte`);
      if (s[1] === 'cr') assert.match(h.slice(s.index, s.index + 600), /<div class="fcard checklist pv-checklist"[^>]*>(<p class="siege-title pv-intertitre">.*?<\/p>)?<label><input type="checkbox">/, `${f.slug} : check-list`);
    }
    // Couleur fixe par type de section, identique sur toutes les fiches
    const couleur = { pieges: 'var(--k-grave)', cles: 'var(--green)', cr: 'var(--muted)', ddx: 'var(--purple)', cat: 'var(--orange)', imagerie: 'var(--royal)', terrain: 'var(--blue)' };
    for (const m of h.matchAll(/<section class="fsec pv-sec pv-type-([a-z]+)" id="[^"]+" style="--c:([^"]+)">/g)) if (couleur[m[1]]) assert.equal(m[2], couleur[m[1]], `${f.slug} : couleur ${m[1]}`);
    // Navigation : précédente / suivante dans l'ordre des fichiers, Sources, menu des chapitres
    const prec = fiches[k - 1], suiv = fiches[k + 1];
    const href = g => (g.chapitre === c ? `${g.slug}.html` : `../${g.chapitre.slug}/${g.slug}.html`);
    assert.ok(h.includes(`<a class="pv-prec" href="${prec ? href(prec) : '../index.html'}"`), `${f.slug} : précédente`);
    assert.ok(h.includes(`<a class="pv-suiv" href="${suiv ? href(suiv) : '../index.html'}"`), `${f.slug} : suivante`);
    assert.ok(h.includes('<p class="pv-sources"><a href="../sources.html">Sources</a></p>'), `${f.slug} : Sources`);
    assert.equal((h.match(/<a class="pv-chap-lien"/g) || []).length, 10, `${f.slug} : 10 chapitres dans le menu`);
    assert.equal((h.match(/<ol class="pv-liste-fiches">/g) || []).length, 1, `${f.slug} : fiches du chapitre en cours`);
    assert.ok(h.includes(`<li class="is-ici"><a href="${f.slug}.html" aria-current="page">`), `${f.slug} : fiche en cours`);
    // Tableaux : cadre à défilement horizontal ; intertitres façon « Siège »
    assert.equal((h.match(/<div class="ftable-wrap pv-table/g) || []).length, (h.match(/<table/g) || []).length);
  });
  const t = pageFiche(fiches.find(f => f.slug === 'torsion-annexe'));
  assert.match(t, /<p class="siege-title pv-intertitre"><b>Échographie \(examen de première intention\)<\/b><\/p>/);
  const endo = pageFiche(fiches.find(f => f.slug === 'adenocarcinome-endometre'));
  assert.match(endo, /<div class="callout pv-encadre"><p><b>Pour le radiologue<\/b> : /);
});

test('liens ajoutés : sommaire, pages de chapitre, renvois entre fiches, classifications', () => {
  const s = lire(P('index.html'));
  // Chapitres du tableau « Par organe »
  chapitres.forEach(c => assert.ok(s.includes(`<th scope="row" class="rh"><a href="${c.slug}/index.html">${c.nom}</a></th>`), `chapitre ${c.nom}`));
  // Situations cliniques : tous les noms de fiches sont des liens (il ne reste que des mots de liaison)
  const md = lire(P('00-sommaire.md'));
  const situations = md.slice(md.indexOf('## Par situation clinique'), md.indexOf('## Classifications')).split('\n').filter(l => l.startsWith('- '));
  const zoneSit = s.slice(s.indexOf('id="par-situation-clinique"'), s.indexOf('id="classifications"'));
  const items = [...zoneSit.matchAll(/<li>([\s\S]*?)<\/li>/g)].map(m => m[1]);
  assert.equal(items.length, situations.length);
  items.forEach(li => {
    const reste = li.replace(/<b>[^<]*<\/b>/, '').replace(/<a [^>]+>[^<]*<\/a>/g, '').replace(/<[^>]+>/g, '');
    assert.ok(!/\p{Lu}/u.test(reste.replace(/&#39;/g, "'")), `nom de fiche non lié : « ${reste.trim()} »`);
  });
  assert.ok((zoneSit.match(/<a href=/g) || []).length >= 30);
  // Pages de chapitre : chaque nom de fiche est un lien, dans l'ordre des fichiers
  chapitres.forEach(c => {
    const h = lire(P(`${c.slug}/index.html`));
    const z = zones(h);
    assert.deepEqual([...z.matchAll(/<a href="([a-z0-9-]+)\.html">/g)].map(m => m[1]), c.fiches.map(f => f.slug), c.slug);
  });
  // Renvois « voir la fiche … »
  assert.match(pageFiche(fiches.find(f => f.slug === 'classification-figo-myomes')), /voir la fiche <a href="leiomyome-uterin.html">Léiomyome utérin<\/a>/);
  assert.match(pageFiche(fiches.find(f => f.slug === 'compartiment-urinaire')), /\(fiche <a href="reperes-grades.html">Repères<\/a>\)/);
  // Classifications : 10 lignes, chacune liée à sa fiche
  const cl = lire(P('classifications.html'));
  const liens = [...zones(cl).matchAll(/<td><a href="([a-z0-9-]+\/[a-z0-9-]+)\.html">/g)].map(m => m[1]);
  assert.equal(liens.length, 10);
  liens.forEach(l => assert.ok(fs.existsSync(P(`${l}.html`)), l));
  assert.ok(cl.includes('href="../outils/bosniak.html"') && cl.includes('href="../suivi-oncologique.html"'), 'à côté de Bosniak et RECIST');
});

test('liens internes et ancres : section Pelvis, Fiches rapides et Comptes rendus sans lien cassé', () => {
  const pages = [...pagesHtml(P('')), path.join(RACINE, 'fiches-rapides.html'), path.join(RACINE, 'comptes-rendus.html')];
  assert.deepEqual(verifier(pages), []);
  assert.match(lire(path.join(RACINE, 'fiches-rapides.html')), /<a class="fiche-card" data-spe="femme" href="pelvis\/index.html"/);
  assert.match(lire(path.join(RACINE, 'comptes-rendus.html')), /<a class="cr-tool-chip cr-tool-link" href="pelvis\/classifications.html">/);
});

test('index de recherche : 83 fiches, adresses et ancres valides, chargé à la demande', () => {
  const ctx = { window: {} };
  require('vm').runInNewContext(lire(P('recherche.js')), ctx);
  const D = ctx.window.PelvisRecherche;
  assert.equal(D.length, 83);
  for (const d of D) {
    assert.ok(fs.existsSync(P(d.u)), d.u);
    const h = lire(P(d.u));
    assert.ok(d.t && d.b && d.c && d.s.length, d.u);
    d.s.filter(s => s.i).forEach(s => assert.ok(h.includes(`id="${s.i}"`), `${d.u}#${s.i}`));
  }
  const tout = JSON.stringify(D);
  ['Krukenberg', 'Rokitansky', 'O-RADS', 'hCG', 'FIGO 2023', 'PCI', 'adénomyose'].forEach(m => assert.ok(tout.includes(m), `« ${m} » indexé`));
  const h = pageFiche(fiches[0]);
  assert.ok(!/<script src="[^"]*recherche\.js/.test(h) && /data-pv-index="\.\.\/recherche\.js\?v=/.test(h), 'index chargé à la première recherche');
});

test('schéma de la fiche 08 : SVG statique à la place de la ligne « Schéma », textes du JSX à l\'identique', () => {
  const jsx = lire(P('01-ovaire/schema-demarche-masse.jsx'));
  const textesJsx = [...jsx.matchAll(/data-claude-text-id='[^']+'[^>]*>([^<]*)<\/text>/g)].map(m => m[1]);
  const h = pageFiche(fiches.find(f => f.slug === 'demarche-masse-annexielle'));
  const svg = h.slice(h.indexOf('<!--schema-->'), h.indexOf('<!--/schema-->'));
  const textesSvg = [...svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map(m => m[1].replace(/&#39;/g, "'").replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>'));
  assert.equal(textesJsx.length, 22);
  assert.deepEqual([...textesSvg].sort(), [...textesJsx].sort());
  assert.ok(svg.includes(`aria-label="${jsx.match(/aria-label='([^']*)'/)[1]}"`));
  assert.ok(!/var\(--cds-/.test(svg), 'couleurs du site');
  assert.ok(!h.includes('schema-demarche-masse.jsx'), 'ligne « Schéma : … » remplacée par le schéma');
  assert.ok(h.indexOf('<!--schema-->') < h.indexOf('id="etape-1'), 'schéma avant la première étape, à la place de la ligne');
});

test('source sans anomalie de tableau', () => {
  assert.deepEqual(G.ANOMALIES, []);
});
