/* Refonte (première version) : menu et pied de page communs, accueil centré sur la plateforme,
   page Comptes rendus réorganisée, état de chargement de la Communauté.
   Fichiers : scripts/menu_commun.py, navigation.js, styles.css, finition.css, index.html, script.js,
   comptes-rendus.html, cr.css, cr-tools.{js,css}, communaute.html, reseau/app.js.
   Lancer : npm test   (ou : node --test tests/refonte-navigation.test.js) */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const R = path.join(__dirname, '..');
const lire = f => fs.readFileSync(path.join(R, f), 'utf8');
const pages = [];
(function parcourir(d) {
  for (const f of fs.readdirSync(path.join(R, d), { withFileTypes: true })) {
    const rel = path.join(d, f.name);
    if (f.isDirectory()) { if (!['node_modules', 'vendor', '.git', 'assets-sources', 'public', 'dist'].includes(f.name)) parcourir(rel); }
    else if (f.name.endsWith('.html') && lire(rel).includes('id="main-nav"')) pages.push(rel.replace(/\\/g, '/').replace(/^\.\//, ''));
  }
})('.');
const menuDe = html => { const d = html.indexOf('id="main-nav"'); return html.slice(d, html.indexOf('</nav>', d)); };

test('menu et pied de page à jour partout (scripts/menu_commun.py --verifier)', () => {
  execFileSync('python3', ['-I', 'scripts/menu_commun.py', '--verifier'], { cwd: R, stdio: 'pipe' });
  execFileSync('python3', ['-I', 'scripts/cas/construire_cas.py', '--verifier'], { cwd: R, stdio: 'pipe' });
});

test('menu : mêmes rubriques, même ordre, une seule rubrique active, plus de bouton « S\'inscrire » ambigu', () => {
  assert.ok(pages.length >= 40, `${pages.length} pages`);
  const attendu = ['Comptes rendus', 'Fiches rapides', 'Radioanatomie', 'Bibliothèque', 'Communauté', 'Remplacements', 'Masterclass'];
  for (const p of pages) {
    const html = lire(p), menu = menuDe(html);
    assert.deepEqual([...menu.matchAll(/<a [^>]*>([^<]+)<\/a>/g)].map(m => m[1]), attendu, p);
    assert.ok((menu.match(/is-current/g) || []).length <= 1, `${p} : une rubrique active au plus`);
    assert.match(menu, /class="nav-masterclass">Masterclass<\/a>/, p);
    assert.doesNotMatch(menu, /S'inscrire|btn-ink/, `${p} : inscription aux masterclass hors du menu`);
    // navigation.js chargé avant les scripts de la page
    const nav = html.search(/<script src="[^"]*navigation\.js\?v=\d+"><\/script>/);
    assert.ok(nav > 0, `${p} : navigation.js`);
    const autre = html.search(/<script src="[^"]*(fiche|script)\.js\?v=/);
    if (autre > 0) assert.ok(nav < autre, `${p} : navigation.js avant fiche.js / script.js`);
    // pied de page : quatre colonnes, mentions légales, inscription explicite
    const pied = html.slice(html.indexOf('<footer class="site-footer">'), html.indexOf('</footer>'));
    assert.deepEqual([...pied.matchAll(/<p class="footer-titre">([^<]+)<\/p>/g)].map(m => m[1]), ['Au quotidien', 'Apprendre', 'Réseau', 'Masterclass'], p);
    assert.match(pied, /mentions-legales\.html">Mentions légales<\/a>/, p);
    assert.match(pied, />S'inscrire à une masterclass<\/a>/, p);
  }
  // rubrique active selon la section
  const actif = p => (menuDe(lire(p)).match(/<a href="[^"]*" class="is-current">([^<]+)</) || [])[1];
  assert.equal(actif('comptes-rendus.html'), 'Comptes rendus');
  assert.equal(actif('outils/bosniak.html'), 'Comptes rendus');
  assert.equal(actif('fiches/avc-ischemique.html'), 'Fiches rapides');
  assert.equal(actif('radioanatomie/tdm-thorax.html'), 'Radioanatomie');
  assert.equal(actif('communaute.html'), 'Communauté');
  assert.equal(actif('index.html'), undefined);
  // un seul code pour le menu mobile
  for (const f of ['fiche.js', 'script.js']) assert.doesNotMatch(lire(f), /querySelector\('\.nav-toggle'\)|\$\('\.nav-toggle'\)/, f);
  const js = lire('navigation.js');
  for (const m of ['Escape', 'aria-expanded', 'aria-current', 'data-menu', 'data-depliant', 'localStorage']) assert.ok(js.includes(m), m);
});

test('accueil : la plateforme au premier écran, masterclass dans leur partie, anciennes ancres conservées', () => {
  const html = lire('index.html');
  assert.match(html, /<h1>Vos outils de radiologie, <span class="hl-navy">au même endroit\.<\/span><\/h1>/);
  assert.match(html, /<a href="#outils" class="btn btn-ink">Accéder aux outils<\/a>/);
  assert.match(html, /<a href="cas\/index\.html" class="btn btn-outline">Explorer un cas clinique<\/a>/);
  for (const id of ['top', 'outils', 'cas-du-jour', 'fiche-flash', 'fiches', 'masterclass', 'format', 'programme', 'tarifs', 'faq', 'inscription'])
    assert.equal((html.match(new RegExp(`id="${id}"`, 'g')) || []).length, 1, `#${id}`);
  // accès rapides : quatre rubriques de travail, puis le réseau signalé « mise en service en cours » (Supabase branché, e-mails pas encore actifs)
  const acces = [...html.matchAll(/<a class="acces-carte" href="([^"]+)"/g)].map(m => m[1]);
  assert.deepEqual(acces, ['comptes-rendus.html', 'fiches-rapides.html', 'radioanatomie/index.html', 'bibliotheque.html', 'communaute.html', 'remplacements.html']);
  assert.equal((html.match(/class="acces-statut">Mise en service en cours/g) || []).length, 2);
  // l'accès rapide précède les masterclass, qui gardent programme, tarifs et inscription
  const bloc = html.indexOf('id="bloc-masterclass"');
  assert.ok(html.indexOf('id="outils"') < bloc);
  for (const id of ['masterclass', 'format', 'programme', 'tarifs', 'faq', 'inscription']) assert.ok(html.indexOf(`id="${id}"`) > bloc, id);
  assert.match(html, /<a href="#inscription" class="btn btn-ink">S'inscrire à une masterclass<\/a>/);
  // tarifs et chiffres inchangés (valeurs à confirmer par l'auteur, voir README)
  assert.deepEqual([...html.matchAll(/<p class="price">(\d+)<span>€<\/span><\/p>/g)].map(m => m[1]), ['190', '490', '890']);
  for (const c of ['<strong>6</strong><span>spécialités</span>', '<strong>120+</strong><span>cas cliniques</span>', '<strong>24/7</strong><span>replay</span>']) assert.ok(html.includes(c), c);
  assert.doesNotMatch(lire('script.js'), /data-count|Compteurs/, 'plus de compteur animé : chiffres lisibles sans script');
  // bloc d'inscription : texte centré dans le cercle vert ; une colonne sur tablette et téléphone
  const fin = lire('finition.css');
  assert.match(fin, /\.ring-circle \{ width: min\(480px, 100%\); height: auto; aspect-ratio: 1; left: 50%; top: 50%; margin: 0; transform: translate\(-50%, -50%\); \}/);
  assert.match(fin, /@media \(max-width: 980px\) \{[^}]*\}[\s\S]*?\.signup \{ grid-template-columns: minmax\(0, 1fr\); \}/);
  // vérification dans le navigateur : script Playwright du projet
  assert.equal(JSON.parse(lire('package.json')).scripts['test:navigateur'], 'node tests/navigateur/refonte.js');
  assert.ok(fs.existsSync(path.join(R, 'tests/navigateur/refonte.js')));
  assert.match(lire('finition.css'), /\.reveal, \.reveal\.is-visible \{ opacity: 1; transform: none; transition: none; \}/, 'contenu visible sans attendre une animation');
});

test('comptes rendus : chaque élément utilisé par l\'éditeur existe, barre d\'outils hiérarchisée, aide dépliable', () => {
  const html = lire('comptes-rendus.html');
  const ids = new Set();
  for (const f of ['cr.js', 'cr-tools.js', ...fs.readdirSync(path.join(R, 'dictee')).filter(x => x.endsWith('.js')).map(x => 'dictee/' + x)])
    for (const m of lire(f).matchAll(/(?:\$\('#|getElementById\(')([a-z0-9-]+)'\)/g)) ids.add(m[1]);
  for (const id of ids) assert.match(html, new RegExp(`id="${id}"`), `#${id} utilisé par l'éditeur`);
  // actions courantes visibles ; secondaires dans « Plus d'actions » ; Effacer à part
  const barre = html.slice(html.indexOf('class="cr-toolbar"'), html.indexOf('<!-- Dictée vocale'));
  const groupes = barre.split('class="cr-tb-groupe');
  assert.match(groupes[1], /id="cr-undo"[\s\S]*id="cr-redo"/);
  assert.match(groupes[2], /id="cr-copy"[\s\S]*id="cr-next"/);
  assert.match(groupes[3], /data-menu aria-controls="cr-plus"[\s\S]*<div class="cr-plus" id="cr-plus" hidden>[\s\S]*id="cr-save-tpl"[\s\S]*id="cr-sel-phrase"[\s\S]*id="cr-download"[\s\S]*id="cr-print-btn"/);
  assert.match(groupes[4], /^ cr-tb-fin">\s*<button[^>]*cr-danger[^>]*id="cr-clear"/);
  // mode d'emploi : fermé au départ, trois étapes et raccourcis
  assert.match(html, /data-depliant="cr-aide" aria-controls="cr-aide" aria-expanded="false"/);
  assert.match(html, /<div class="container cr-aide" id="cr-aide" hidden>[\s\S]*class="cr-steps"[\s\S]*class="cr-raccourcis"/);
  // calculateurs : volet classé ; outils complets distincts (pages dédiées)
  assert.match(html, /data-depliant="cr-calculateurs" aria-controls="cr-tools-panneau"/);
  const tools = lire('cr-tools.js');
  for (const g of ['Oncologie', 'Neuro', 'Thorax et cœur', 'Abdomen et digestif', 'Sein et thyroïde', 'Gynécologie', 'Pelvis et rein', 'Os et traumatologie']) assert.ok(tools.includes(`'${g}'`), g);
  const pages = html.slice(html.indexOf('cr-tools-pages'), html.indexOf('<div class="cr-editor-wrap">'));
  assert.deepEqual([...pages.matchAll(/href="([^"]+)"/g)].map(m => m[1]), ['suivi-oncologique.html', 'outils/osteogamme', 'outils/bosniak']);
  assert.match(html, /<link rel="stylesheet" href="finition\.css\?v=\d+">\s*<link rel="stylesheet" href="cr\.css\?v=\d+">/);
});

test('communauté : état de chargement écrit dans la page, message d\'aide si le chargement traîne', () => {
  const html = lire('communaute.html');
  assert.match(html, /<div class="rs-main" id="rs-app" aria-busy="true">\s*<!--[^>]*-->\s*<div class="rs-attente" data-attente>\s*<p class="rs-chargement" role="status">Chargement de la communauté…<\/p>/);
  assert.match(html, /class="rs-attente-lent">Le chargement prend plus de temps que prévu/);
  assert.match(html, /setTimeout\(function \(\) \{ var a = document\.querySelector\('#rs-app \[data-attente\]'\); if \(a\) a\.classList\.add\('is-lent'\); \}, 8000\);/);
  assert.match(lire('reseau/app.js'), /if \(!app\.querySelector\('\[data-attente\]'\)\) app\.innerHTML/);
  assert.match(html, /id="rs-demo"[\s\S]*membres et cas fictifs/, 'bandeau de démonstration conservé');
});
