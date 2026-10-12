/* Tests de la section Pelvis (pelvis/, scripts/construire-pelvis.js) :
   - le texte des fiches Markdown est reproduit MOT POUR MOT dans les pages (aucune reformulation) ;
   - les pages générées sont à jour (npm run build) ;
   - structure, titres et descriptions, fil d'Ariane, fiche précédente / suivante, menu du chapitre ;
   - liens internes et ancres, index de recherche, schéma de la fiche 08 (textes du JSX identiques) ;
   - anomalies de la source signalées (jamais corrigées dans le texte).
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
const { sorties, fiches } = G.construire();

/* ---------- Texte d'un Markdown, extrait indépendamment du générateur ---------- */
function motsMd(md, { blocs = {}, sauter = [] } = {}) {
  return md.split('\n')
    .filter(l => l.trim() && !sauter.some(r => r.test(l)) && !/^\s*\|?\s*:?-{3,}/.test(l))
    .map(l => l.replace(/^\s*#{1,6}\s+/, '').replace(/^\s*(?:[-*]|\d+\.)\s+/, '').replace(/\|/g, ' ')
      .replace(/<\?claude block (\w+)\?>/g, (_, id) => { assert.ok(blocs[id], `bloc ${id}`); return blocs[id]; })
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/\*/g, ''))
    .join(' ').split(/\s+/).filter(Boolean);
}
/* Texte des zones <!--md--> … <!--/md--> d'une page (texte d'interface aria-hidden exclu) */
function motsHtml(html) {
  const zones = [...html.matchAll(/<!--md-->([\s\S]*?)<!--\/md-->/g)].map(m => m[1]).join(' ');
  return zones.replace(/<p class="pv-glisser" aria-hidden="true">[^<]*<\/p>/g, ' ')
    .replace(/<\/?(a|strong|em|span|mark|b|i|small)\b[^>]*>/g, '').replace(/<[^>]+>/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&')
    .split(/\s+/).filter(Boolean);
}
function memesMots(attendu, obtenu, nom) {
  const i = attendu.findIndex((m, k) => m !== obtenu[k]);
  assert.ok(i < 0 && attendu.length === obtenu.length,
    `${nom} : texte différent à partir du mot ${i < 0 ? Math.min(attendu.length, obtenu.length) : i} — attendu « ${attendu.slice(Math.max(0, i - 4), i + 8).join(' ')} », page « ${obtenu.slice(Math.max(0, i - 4), i + 8).join(' ')} »`);
}

const NOMS_BLOCS = { ov: 'Ovaire', tor: "Torsion d'annexe", rup: 'Rupture et hémorragie de kyste', dem: 'Démarche devant une masse', ous: 'O-RADS échographie', oir: 'O-RADS IRM' };

test('texte des 20 fiches reproduit mot pour mot (titre, En bref, sections, tableaux)', () => {
  assert.equal(fiches.length, 20);
  for (const f of fiches) {
    const md = lire(P(`ovaire/${f.fichier}`));
    const lignes = md.split('\n').filter(l => l.trim());
    assert.match(lignes[0], /^# /, f.fichier);
    assert.match(lignes[1], /^\*\*En bref\*\* : /, `${f.fichier} : « En bref » juste après le titre`);
    const sauter = f.slug === 'demarche-masse-annexielle' ? [/^\*Schéma : voir schema-demarche-masse\.jsx/] : [];
    memesMots(motsMd(md, { sauter }), motsHtml(lire(P(`ovaire/${f.slug}.html`))), f.fichier);
  }
});

test('texte du sommaire, de la page Ovaire, des Sources et du tableau des classifications reproduit mot pour mot', () => {
  memesMots(motsMd(lire(P('00-sommaire.md')), { blocs: NOMS_BLOCS }), motsHtml(lire(P('index.html'))), '00-sommaire.md');
  memesMots(motsMd(lire(P('ovaire/00-ovaire.md'))), motsHtml(lire(P('ovaire/index.html'))), '00-ovaire.md');
  memesMots(motsMd(lire(P('sources.md'))), motsHtml(lire(P('sources.html'))), 'sources.md');
  const som = lire(P('00-sommaire.md'));
  const tableau = som.slice(som.indexOf('## Classifications')).split('\n').filter(l => l.startsWith('|')).join('\n');
  memesMots(motsMd(tableau), motsHtml(lire(P('classifications.html'))), 'tableau des classifications');
  // Les liens ajoutés au sommaire portent les noms de la page Ovaire
  const ov = lire(P('ovaire/00-ovaire.md'));
  Object.values(NOMS_BLOCS).filter(n => n !== 'Ovaire').forEach(n => assert.ok(ov.includes(n), n));
});

test('pages à jour : npm run build ne changerait rien', () => {
  for (const [rel, contenu] of Object.entries(sorties)) {
    assert.ok(fs.existsSync(P(rel)), `pelvis/${rel} absent : npm run build`);
    assert.equal(lire(P(rel)), contenu, `pelvis/${rel} pas à jour : npm run build`);
  }
});

test('structure : /pelvis, /pelvis/ovaire, une page par fiche, /pelvis/classifications, /pelvis/sources', () => {
  for (const f of ['index.html', 'ovaire/index.html', 'classifications.html', 'sources.html', 'pelvis.css', 'pelvis.js', 'recherche.js']) assert.ok(fs.existsSync(P(f)), f);
  const md = fs.readdirSync(P('ovaire')).filter(f => /^\d\d-.+\.md$/.test(f) && !f.startsWith('00-'));
  assert.equal(md.length, 20);
  md.forEach(f => assert.ok(fs.existsSync(P(`ovaire/${f.replace(/^\d\d-/, '').replace('.md', '.html')}`)), f));
  // Sommaire : trois entrées ; chapitres « À venir » affichés sans lien ; Ovaire et O-RADS liés
  const s = lire(P('index.html'));
  ['href="#par-organe"', 'href="#par-situation-clinique"', 'href="classifications.html"'].forEach(x => assert.ok(s.includes(x), x));
  const lignes = [...s.matchAll(/<tr>([\s\S]*?)<\/tr>/g)].map(m => m[1]);
  const avenir = lignes.filter(l => l.includes('pv-avenir'));
  const avenirMd = lire(P('00-sommaire.md')).split('\n').filter(l => l.startsWith('|') && /\| À venir \|\s*$/.test(l)).length;
  assert.equal(avenirMd, 13, '9 chapitres et 4 classifications « À venir » dans le sommaire');
  assert.equal(avenir.length, avenirMd);
  avenir.forEach(l => assert.ok(!/<th[^>]*>\s*<a /.test(l), `chapitre à venir sans lien : ${l.slice(0, 80)}`));
  assert.match(s, /<th scope="row" class="rh"><a href="ovaire\/index.html">Ovaire<\/a><\/th>/);
  assert.match(s, /<a href="ovaire\/o-rads-echographie.html">O-RADS échographie v2022<\/a>/);
  assert.match(s, /<a href="ovaire\/o-rads-irm.html">O-RADS IRM<\/a>/);
  assert.match(s, /Douleur pelvienne aiguë de la femme jeune : <a href="ovaire\/torsion-annexe.html">Torsion d&#39;annexe<\/a>|Douleur pelvienne aiguë de la femme jeune : <a href="ovaire\/torsion-annexe.html">Torsion d'annexe<\/a>/);
  // Page Ovaire : chaque nom de fiche est un lien, dans l'ordre 01 → 20
  const o = lire(P('ovaire/index.html'));
  const liens = [...o.matchAll(/<li>(?:[^<]*)<a href="([a-z0-9-]+)\.html">/g)].map(m => m[1]);
  const zones = [...o.matchAll(/<!--md-->([\s\S]*?)<!--\/md-->/g)].map(m => m[1]).join('');
  const tous = [...zones.matchAll(/<a href="([a-z0-9-]+)\.html">/g)].map(m => m[1]);
  assert.deepEqual(tous, fiches.map(f => f.slug));
  assert.ok(liens.length >= 10);
  // Fiches rapides : carte de la section dans l'onglet Imagerie de la femme
  assert.match(lire(path.join(RACINE, 'fiches-rapides.html')), /<a class="fiche-card" data-spe="femme" href="pelvis\/index.html"/);
});

test('chaque fiche : titre, meta description (En bref), fil d\'Ariane, encadré, navigation, Sources', () => {
  for (const f of fiches) {
    const h = lire(P(`ovaire/${f.slug}.html`));
    const bref = G.texteBrut(f.bref).replace(/^En bref\s*:\s*/, '');
    assert.match(h, new RegExp(`<title>${G.texteBrut(f.titre).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} — Pelvis, ovaire \\| RadiologicHub</title>`), f.slug);
    assert.ok(h.includes(`<meta name="description" content="${bref.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')}">`), `${f.slug} : description = En bref`);
    assert.match(h, /<nav class="crumbs" aria-label="Fil d'Ariane"><a href="..\/index.html">Pelvis<\/a> › <a href="index.html">Ovaire<\/a> › <span>/);
    assert.match(h, /<div class="pv-bref" role="note"><p><!--md--><strong>En bref<\/strong> : /);
    const prec = fiches[f.numero - 2], suiv = fiches[f.numero];
    assert.ok(h.includes(`<a class="pv-prec" href="${prec ? prec.slug : 'index'}.html"`), `${f.slug} : précédente`);
    assert.ok(h.includes(`<a class="pv-suiv" href="${suiv ? suiv.slug : 'index'}.html"`), `${f.slug} : suivante`);
    assert.ok(h.includes('<p class="pv-sources"><a href="../sources.html">Sources</a></p>'), `${f.slug} : lien Sources`);
    assert.equal((h.match(/<li(?: class="is-ici")?><a href="[a-z0-9-]+\.html"/g) || []).length, 20, `${f.slug} : 20 fiches dans le menu`);
    assert.ok(h.includes(`<li class="is-ici"><a href="${f.slug}.html" aria-current="page">`), `${f.slug} : fiche en cours`);
    assert.match(h, /<details class="pv-menu" open>/);
    // Tableaux : cadre à défilement horizontal
    const tables = (h.match(/<table/g) || []).length;
    assert.equal((h.match(/<div class="ftable-wrap pv-table/g) || []).length, tables);
  }
});

test('liens internes et ancres : section Pelvis et Fiches rapides sans lien cassé', () => {
  const pages = [...pagesHtml(path.join(RACINE, 'pelvis')), path.join(RACINE, 'fiches-rapides.html')];
  assert.ok(pages.length >= 25);
  assert.deepEqual(verifier(pages), []);
});

test('index de recherche : 20 fiches, adresses et ancres valides', () => {
  const ctx = { window: {} };
  require('vm').runInNewContext(lire(P('recherche.js')), ctx);
  const D = ctx.window.PelvisRecherche;
  assert.equal(D.length, 20);
  for (const d of D) {
    assert.ok(fs.existsSync(P(d.u)), d.u);
    const h = lire(P(d.u));
    assert.ok(d.t && d.b && d.s.length, d.u);
    d.s.filter(s => s.i).forEach(s => assert.ok(h.includes(`id="${s.i}"`), `${d.u}#${s.i}`));
  }
  const tout = JSON.stringify(D);
  ['Krukenberg', 'Rokitansky', 'O-RADS', 'βhCG', 'Meigs'].forEach(m => assert.ok(tout.includes(m), `« ${m} » indexé`));
});

test('schéma de la fiche 08 : SVG statique, textes et description du JSX à l\'identique', () => {
  const jsx = lire(P('ovaire/schema-demarche-masse.jsx'));
  const textesJsx = [...jsx.matchAll(/data-claude-text-id='[^']+'[^>]*>([^<]*)<\/text>/g)].map(m => m[1]);
  const h = lire(P('ovaire/demarche-masse-annexielle.html'));
  const svg = h.slice(h.indexOf('<!--schema-->'), h.indexOf('<!--/schema-->'));
  const textesSvg = [...svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map(m => m[1].replace(/&#39;/g, "'").replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>'));
  assert.equal(textesJsx.length, 22);
  assert.deepEqual([...textesSvg].sort(), [...textesJsx].sort());
  assert.ok(svg.includes(`aria-label="${jsx.match(/aria-label='([^']*)'/)[1]}"`));
  assert.ok(!/var\(--cds-/.test(svg), 'couleurs du site, pas celles de l\'outil d\'origine');
  assert.ok(!h.includes('schema-demarche-masse.jsx'), 'renvoi au fichier JSX remplacé par le schéma');
});

test('anomalies de la source : signalées, texte non corrigé', () => {
  assert.deepEqual(G.ANOMALIES.map(a => [a.fichier, a.ligne, a.colonnes.join()]), [['pelvis/ovaire/11-tumeurs-epitheliales-sereuses.md', 1, 'Forme']]);
  const h = lire(P('ovaire/tumeurs-epitheliales-sereuses.html'));
  assert.match(h, /<td class="pv-absente" title="Cellule absente dans la fiche source \(à compléter par l'auteur\)"><\/td><td>xKyste uniloculaire, rond/);
});
