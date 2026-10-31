/* Contrôle du site en ligne après publication (scripts/publication/controle-en-ligne.js) :
   le site publié localement (dist/), servi comme Cloudflare Pages, passe tous les contrôles ;
   un fichier interne exposé, un en-tête manquant ou une version différente sont signalés. Aucun réseau. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { controler, adresseCible } = require('../scripts/publication/controle-en-ligne.js');
const { construire } = require('../scripts/publication/construire.js');

const dist = fs.mkdtempSync(path.join(os.tmpdir(), 'rh-ctl-'));
construire({ silencieux: true, dist });
test.after(() => fs.rmSync(dist, { recursive: true, force: true }));

/* Faux Cloudflare Pages servant dist/ (adresses propres, _headers simplifiés) */
function cloudflare({ exposer = null, sansHsts = false, modifier = null } = {}) {
  const ent = o => new Map(Object.entries(o));
  const securite = { 'x-content-type-options': 'nosniff', 'x-frame-options': 'SAMEORIGIN', 'content-security-policy': "frame-ancestors 'self'; base-uri 'self'", 'permissions-policy': 'camera=()', ...(sansHsts ? {} : { 'strict-transport-security': 'max-age=15552000' }) };
  const rep = (status, corps = '', h = {}) => ({ status, headers: ent({ ...securite, ...h }), text: async () => String(corps), arrayBuffer: async () => Buffer.from(corps) });
  return async url => {
    const u = new URL(url), p = decodeURIComponent(u.pathname);
    if (p === '/cours-admin.html') return rep(301, '', { location: '/' });
    if (/\.html$/.test(p) && !fs.existsSync(path.join(dist, p))) return rep(404, fs.readFileSync(path.join(dist, '404.html')));   // Cloudflare : redirection puis 404
    if (/\.html$/.test(p)) return rep(308, '', { location: p.replace(/(?:index)?\.html$/, '') + u.search });
    if (exposer && p === `/${exposer}`) return rep(200, 'fuite');
    if (/^\/_(?:headers|redirects)$/.test(p)) return rep(404, '');
    let f = path.join(dist, p === '/' ? 'index.html' : p);
    if (fs.existsSync(`${f}.html`)) f += '.html';
    else if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
    if (!fs.existsSync(f) || !fs.statSync(f).isFile()) return rep(404, fs.readFileSync(path.join(dist, '404.html')));
    let corps = fs.readFileSync(f);
    if (modifier && f.endsWith(modifier)) corps = Buffer.concat([corps, Buffer.from('/* autre version */')]);
    const h = /remplacements-reponse/.test(p) ? { 'referrer-policy': 'no-referrer', 'x-robots-tag': 'noindex' } : /bibliotheque-admin/.test(p) ? { 'x-robots-tag': 'noindex' } : {};
    return { status: 200, headers: ent({ ...securite, ...h }), text: async () => corps.toString(), arrayBuffer: async () => corps };
  };
}
const lancer = o => controler('https://radiologic-hub.pages.dev', { fetch: cloudflare(o), dist, journal: () => {} });

test('site publié conforme : tous les contrôles réussissent', async () => {
  const r = await lancer();
  assert.equal(r.ok, true, JSON.stringify(r.resultats.filter(x => !x.ok)));
  assert.ok(r.resultats.length >= 10);
});

test('défauts signalés : fichier interne exposé, HSTS absent, version différente', async () => {
  const echecs = async o => (await lancer(o)).resultats.filter(x => !x.ok).map(x => x.nom).join(' | ');
  assert.match(await echecs({ exposer: 'CLAUDE.md' }), /fichiers internes/);
  assert.match(await echecs({ sansHsts: true }), /en-têtes de sécurité/);
  assert.match(await echecs({ modifier: 'navigation.js' }), /version en ligne/);
});

test('adresse contrôlée : seulement celles du site (workflow : variables d\'environnement)', () => {
  assert.equal(adresseCible(['node', 'x', '--depuis-environnement'], { ADRESSE_DEPLOIEMENT: 'https://a1b2c3.radiologic-hub.pages.dev/' }), 'https://a1b2c3.radiologic-hub.pages.dev');
  assert.equal(adresseCible(['node', 'x', '--depuis-environnement'], { ADRESSE_CHOISIE: 'https://radiologichub.com' }), 'https://radiologichub.com');
  for (const a of ['https://exemple.com', 'http://radiologic-hub.pages.dev', 'https://radiologic-hub.pages.dev.exemple.com', 'https://x.radiologichub.com', '$(id)'])
    assert.throws(() => adresseCible(['node', 'x', '--depuis-environnement'], { ADRESSE_DEPLOIEMENT: a }), /Adresse refusée/, a);
});

test('workflow « Contrôler la publication » : lecture seule, sans secret, adresse jamais insérée dans la commande', () => {
  const w = fs.readFileSync(path.join(__dirname, '..', '.github', 'workflows', 'controle-publication.yml'), 'utf8');
  assert.match(w, /permissions:\n  contents: read/);
  assert.doesNotMatch(w, /secrets\./);
  assert.match(w, /run: node scripts\/publication\/controle-en-ligne\.js --depuis-environnement/);
  assert.doesNotMatch(w.split('\n').filter(l => /run:/.test(l)).join('\n'), /\$\{\{/);
  assert.match(w, /persist-credentials: false/);
});
