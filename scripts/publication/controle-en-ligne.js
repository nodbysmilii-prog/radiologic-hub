#!/usr/bin/env node
/* =========================================================
   RadiologicHub — CONTRÔLE DU SITE EN LIGNE après une publication
   (Cloudflare Pages), en lecture seule, sans secret :
     node scripts/publication/controle-en-ligne.js [https://radiologic-hub.pages.dev]
   (workflow « Contrôler la publication » : à la main, et après chaque
   déploiement réussi signalé par Cloudflare Pages).
   1. chaque page de la racine publiée répond 200 (adresse sans .html) ;
   2. chaque fichier du dépôt NON publié (scripts, SQL, fonctions serveur,
      tests, documentation, CLAUDE.md, workflows, moteur des Remplacements…)
      répond 404 ;
   3. redirections : .html → adresse sans .html (308), pages supprimées (301) ;
   4. en-têtes de sécurité ; page de réponse aux e-mails et administration
      non indexées ; page 404 ;
   5. version en ligne = version du dépôt (contenu de fichiers témoins
      identique à la construction locale de dist/).
   N'affiche que ✓ / ✗, des statuts et des chemins du dépôt ; code 1 si un
   contrôle échoue (retour arrière : docs/organisation/PUBLICATION.md).
   ========================================================= */
'use strict';
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const LB = require('./liste-blanche.js');
const { selection, construire } = require('./construire.js');

const RACINE = path.join(__dirname, '..', '..');
const TEMOINS = ['navigation.js', 'index.html', 'styles.css', 'remplacements/config.js', '_headers', '_redirects'];

async function parLots(liste, n, f) {
  const out = [];
  for (let i = 0; i < liste.length; i += n) out.push(...await Promise.all(liste.slice(i, i + n).map(f)));
  return out;
}

async function controler(base, { fetch: f = globalThis.fetch, depot, dist, journal = console.log } = {}) {
  base = base.replace(/\/$/, '');
  const resultats = [];
  const ok = (nom, cond, detail = '') => { resultats.push({ nom, ok: !!cond }); journal(`${cond ? '✓' : '✗'} ${nom}${cond || !detail ? '' : ` — ${detail}`}`); };
  const get = (chemin, o = {}) => f(base + chemin, { redirect: 'manual', signal: AbortSignal.timeout(20000), ...o }).catch(() => ({ status: 'injoignable', headers: new Map(), text: async () => '' }));
  const entete = (r, k) => (r.headers && r.headers.get ? r.headers.get(k) || '' : '');

  // 1. Pages de la racine
  const pages = LB.FICHIERS.filter(x => x.endsWith('.html') && x !== '404.html');
  const ko = (await parLots(pages, 10, async p => ({ p, r: await get(`/${p.replace(/(?:index)?\.html$/, '')}`) }))).filter(x => x.r.status !== 200);
  ok(`${pages.length} pages de la racine en ligne (200)`, !ko.length, ko.map(x => `${x.p} (${x.r.status})`).join(', '));

  // 2. Fichiers non publiés : 404
  const tous = depot || execFileSync('git', ['ls-files'], { cwd: RACINE, encoding: 'utf8' }).split('\n').filter(Boolean);
  const publies = new Set(selection(tous));
  const internes = [...tous.filter(x => !publies.has(x)), '.git/config', '.env'];
  const ouverts = (await parLots(internes, 25, async x => ({ x, r: await get(`/${x.split('/').map(encodeURIComponent).join('/')}`, { redirect: 'follow' }) }))).filter(y => y.r.status !== 404);
  ok(`${internes.length} fichiers internes non publiés : tous en 404`, !ouverts.length, ouverts.slice(0, 10).map(y => `${y.x} (${y.r.status})`).join(', '));

  // 3. Redirections
  const red = await get('/comptes-rendus.html');
  ok('redirection /comptes-rendus.html → /comptes-rendus (308)', red.status === 308 && /\/comptes-rendus$/.test(entete(red, 'location')), `${red.status} ${entete(red, 'location')}`);
  const sup = await get('/cours-admin.html');
  ok('page supprimée /cours-admin.html → / (301)', sup.status === 301 && /^(?:\/|https?:\/\/[^/]+\/)$/.test(entete(sup, 'location')), `${sup.status}`);
  const rep = await get('/remplacements-reponse.html?j=controle');
  ok('lien de réponse aux e-mails : paramètres conservés par la redirection', rep.status === 308 && /\/remplacements-reponse\?j=controle$/.test(entete(rep, 'location')), `${rep.status} ${entete(rep, 'location')}`);

  // 4. En-têtes et pages particulières
  const accueil = await get('/');
  const h = k => entete(accueil, k);
  ok('en-têtes de sécurité (nosniff, cadre interdit, CSP, permissions, HSTS)', h('x-content-type-options') === 'nosniff' && /SAMEORIGIN/i.test(h('x-frame-options')) && /frame-ancestors 'self'/.test(h('content-security-policy')) && /camera=\(\)/.test(h('permissions-policy')) && /max-age=\d+/.test(h('strict-transport-security')));
  const reponse = await get('/remplacements-reponse');
  ok('page de réponse : jeton jamais transmis (no-referrer) ni indexé', entete(reponse, 'referrer-policy') === 'no-referrer' && /noindex/.test(entete(reponse, 'x-robots-tag')));
  const adm = await get('/bibliotheque-admin');
  ok('administration de la bibliothèque non indexée', /noindex/.test(entete(adm, 'x-robots-tag')));
  const absent = await get('/adresse-inexistante-controle');
  const t404 = absent.text ? await absent.text() : '';
  ok('adresse inexistante : 404 et page « Page introuvable »', absent.status === 404 && /Page introuvable/.test(t404), absent.status);

  // 5. Version en ligne = construction locale
  let d = dist, temporaire = null;
  if (!d) { temporaire = fs.mkdtempSync(path.join(os.tmpdir(), 'rh-controle-')); construire({ silencieux: true, dist: temporaire }); d = temporaire; }
  const empreinte = b => crypto.createHash('sha256').update(b).digest('hex');
  const ecarts = [];
  for (const x of TEMOINS) {
    const r = await get(`/${x === 'index.html' ? '' : x}`, { redirect: 'follow' });
    const enLigne = r.status === 200 && r.arrayBuffer ? Buffer.from(await r.arrayBuffer()) : null;
    if (x.startsWith('_')) { if (r.status !== 404) ecarts.push(`${x} servi (${r.status})`); continue; }   // fichiers de configuration : jamais servis
    if (!enLigne || empreinte(enLigne) !== empreinte(fs.readFileSync(path.join(d, x)))) ecarts.push(x);
  }
  if (temporaire) fs.rmSync(temporaire, { recursive: true, force: true });
  ok('version en ligne identique à la construction du dépôt (fichiers témoins)', !ecarts.length, ecarts.join(', '));

  return { ok: resultats.every(r => r.ok), resultats };
}

/* Seules les adresses du site sont acceptées (projet Cloudflare, aperçus du projet, domaine officiel). */
const ADRESSE_SITE = /^https:\/\/(?:[a-z0-9-]{1,63}\.)?radiologic-hub\.pages\.dev$|^https:\/\/radiologichub\.com$/;
function adresseCible(argv = process.argv, env = process.env) {
  const brute = argv.includes('--depuis-environnement') ? (env.ADRESSE_CHOISIE || env.ADRESSE_DEPLOIEMENT || '') : (argv[2] || env.RH_URL_CIBLE || 'https://radiologic-hub.pages.dev');
  const a = String(brute).trim().replace(/\/$/, '');
  if (!ADRESSE_SITE.test(a)) throw new Error('Adresse refusée : seules les adresses du site RadiologicHub sont contrôlées.');
  return a;
}

if (require.main === module) {
  let base;
  try { base = adresseCible(); } catch (e) { console.log(`✗ ${e.message}`); process.exit(1); }
  console.log(`Contrôle du site en ligne : ${base}`);
  controler(base).then(r => {
    console.log(r.ok ? `Publication saine : ${r.resultats.length} contrôles réussis.` : 'Contrôle ÉCHOUÉ : voir les lignes ✗ (retour arrière : docs/organisation/PUBLICATION.md).');
    process.exit(r.ok ? 0 : 1);
  });
}
module.exports = { controler, adresseCible };
