/* Publication du site (scripts/publication/) : liste blanche, retrait des scripts de démonstration,
   détection des secrets, construction complète de dist/ et vérification des dépendances.
   Lancer : npm test   (ou : node --test tests/publication.test.js)
   Vérification dans un navigateur, servie comme sur Cloudflare Pages : npm run test:publication */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const LB = require('../scripts/publication/liste-blanche.js');
const { selection, retirerScripts, construire } = require('../scripts/publication/construire.js');
const { motif, correspond, secretsDe, lister } = require('../scripts/publication/verifier.js');
const { references } = require('../scripts/publication/references.js');

const R = path.join(__dirname, '..');
const depot = execFileSync('git', ['ls-files'], { cwd: R, encoding: 'utf8' }).split('\n').filter(Boolean);
const publies = new Set(selection(depot));

test('motifs : « * » = un nom, « ** » = des dossiers', () => {
  assert.ok(motif('**/*.md').test('a/b/c.md') && motif('**/*.md').test('c.md'));
  assert.ok(!motif('*.md').test('a/c.md'));
  assert.ok(motif('radioanatomie/donnees/*/reperes-source/**').test('radioanatomie/donnees/genou-irm/reperes-source/ax-t2.json'));
  assert.ok(correspond(['supabase/**'], 'supabase/functions/rp-agent/index.ts'));
});

test('rien d\'interne n\'est publié : scripts, SQL, fonctions serveur, tests, documentation, CLAUDE.md, workflows', () => {
  for (const f of publies) {
    assert.ok(!correspond(LB.INTERDITS, f), `interdit publié : ${f}`);
    assert.doesNotMatch(f, /^(?:scripts|supabase|tests|docs|\.github|espace-dicom)\/|\.(?:sql|py|ts|sh|toml)$|^(?:CLAUDE|README)\.md$/, f);
  }
  for (const f of ['CLAUDE.md', 'README.md', 'package.json', 'CNAME', '.github/workflows/deployer-fonctions.yml', 'supabase/migrations/20261008120000_remplacements.sql',
    'supabase/functions/rp-agent/index.ts', 'scripts/preparer-backend.js', 'tests/remplacements-regles.test.js', 'docs/organisation/ETAT_PROJET.md', 'remplacements/INSTALLATION.md']) {
    if (depot.includes(f)) assert.ok(!publies.has(f), `${f} ne doit pas être publié`);
  }
});

test('Remplacements : moteur de mise en relation et démonstration non publiés, pages de production complètes', () => {
  for (const f of ['remplacements/noyau/moteur.js', 'remplacements/noyau/jetons.js', 'remplacements/noyau/messagerie.js', 'remplacements/noyau/depot-memoire.js',
    'remplacements/api-demo.js', 'remplacements/demo.js', 'remplacements/modeles/emails/proposition.html']) assert.ok(!publies.has(f), f);
  for (const f of ['remplacements/app.js', 'remplacements/api-supabase.js', 'remplacements/config.js', 'remplacements/noyau/regles.js', 'remplacements/noyau/contrat.js',
    'remplacements/modeles/contrat.md', 'remplacements.html', 'remplacements-reponse.html']) assert.ok(publies.has(f), f);
  for (const [page, scripts] of Object.entries(LB.SCRIPTS_RETIRES)) {
    const html = retirerScripts(page, fs.readFileSync(path.join(R, page), 'utf8'));
    scripts.forEach(s => assert.ok(!html.includes(s), `${page} charge encore ${s}`));
    assert.match(html, /remplacements\/api-supabase\.js/);
    assert.ok(publies.has(page));
  }
  assert.throws(() => retirerScripts('remplacements.html', '<html></html>'), /trouvée 0 fois/);
});

test('chaque page et chaque dossier du site est publié (aucune page oubliée)', () => {
  const pagesRacine = depot.filter(f => /^[^/]+\.html$/.test(f));
  pagesRacine.forEach(f => assert.ok(publies.has(f), `page non publiée : ${f} (l'ajouter à FICHIERS de liste-blanche.js)`));
  const dossiersSite = [...new Set(depot.filter(f => f.includes('/')).map(f => f.split('/')[0]))]
    .filter(d => !['scripts', 'supabase', 'tests', 'docs', '.github', 'espace-dicom'].includes(d));
  dossiersSite.forEach(d => assert.ok(LB.DOSSIERS.includes(d), `dossier ni publié ni explicitement privé : ${d}`));
});

test('détection des secrets : clé « anon » acceptée, service_role et clés privées refusées', () => {
  const jwt = role => `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({ role, ref: 'x' })).toString('base64url')}.c2lnbmF0dXJlLWRlLXRlc3Q`;
  assert.deepEqual(secretsDe('a.js', `cle: '${jwt('anon')}'`), []);
  assert.equal(secretsDe('a.js', `cle: '${jwt('service_role')}'`).length, 1);
  assert.equal(secretsDe('a.js', '-----BEGIN PRIVATE KEY-----').length, 1);
  assert.equal(secretsDe('a.js', `"${['xkeysib', 'a'.repeat(64)].join('-')}"`).length, 1);
  assert.equal(secretsDe('a.js', `${['sbp', 'b'.repeat(40)].join('_')}`).length, 1);
});

test('relevé des références : imports, importmap, fetch, attributs', () => {
  const html = '<script type="importmap">{ "imports": { "three": "../vendor/t.js" } }</script><img src="a/b.png"><div data-atlas="donnees/x/atlas.json"></div>';
  const r = references('p.html', html);
  assert.ok(r.some(x => x.cle === 'three' && x.ref === '../vendor/t.js'));
  assert.ok(r.some(x => x.ref === 'a/b.png' && x.force === 'forte'));
  assert.ok(r.some(x => x.ref === 'donnees/x/atlas.json' && x.force === 'faible'));
  const js = references('m.js', "import * as T from 'three'; import { A } from './a.js'; fetch('remplacements/modeles/contrat.md'); $('#so-import')");
  assert.ok(js.some(x => x.ref === 'three' && x.nu));
  assert.ok(js.some(x => x.ref === './a.js' && x.module && !x.nu));
  assert.ok(js.some(x => x.ref === 'remplacements/modeles/contrat.md'));
  assert.ok(!js.some(x => /so-import/.test(x.ref)));
});

test('construction complète (dans un dossier temporaire) : vérification réussie (fichiers interdits, secrets, dépendances)', () => {
  const dist = fs.mkdtempSync(path.join(os.tmpdir(), 'rh-dist-'));
  const r = construire({ silencieux: true, dist });
  assert.deepEqual(r.verification.erreurs, []);
  const fichiers = lister(dist);
  fs.rmSync(dist, { recursive: true, force: true });
  assert.ok(fichiers.includes('_headers') && fichiers.includes('_redirects') && fichiers.includes('404.html'));
  assert.ok(!fichiers.some(f => correspond(LB.INTERDITS, f)));
  assert.ok(fichiers.length < 20000);
});
