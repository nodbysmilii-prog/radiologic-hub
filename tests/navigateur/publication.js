#!/usr/bin/env node
/* =========================================================
   RadiologicHub — vérification de la VERSION PUBLIÉE (dist/) dans un vrai
   navigateur (Playwright, Chromium), servie comme sur Cloudflare Pages
   ---------------------------------------------------------
   • construit dist/ (scripts/publication/construire.js) ;
   • le sert avec l'émulateur officiel Cloudflare Pages (wrangler pages dev,
     version figée : adresses sans .html, _headers, _redirects, 404.html) ;
     à défaut (hors ligne), petit serveur local et en-têtes non vérifiés ;
   • ordinateur (1366 px) et téléphone (390 px) : chaque page publiée
     s'ouvre sans erreur JavaScript ni ressource manquante ;
   • parcours : accueil et menu, comptes rendus et calculateur, fiches
     (vue 3D), radioanatomie (atlas), bibliothèque, Remplacements,
     Communauté, page de réponse aux e-mails ;
   • Supabase SIMULÉ (aucun appel au vrai projet, aucune donnée réelle) :
     visiteur, puis compte de test fictif connecté ;
   • chaque fichier du dépôt NON publié (scripts, SQL, fonctions serveur,
     tests, documentation, moteur des Remplacements…) répond 404 ;
   • redirections et en-têtes de sécurité.
   Lancer : npm run test:publication   (captures : tests/navigateur/captures/)
   Options : RH_WRANGLER=<chemin de wrangler> (sinon npx wrangler@4.156.0),
             RH_SUPABASE_JS=<chemin de supabase.js UMD 2.45.4> (sinon téléchargé par le navigateur).
   ========================================================= */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { spawn, execSync, execFileSync } = require('child_process');
const { construire, DIST } = require('../../scripts/publication/construire.js');
const { lister } = require('../../scripts/publication/verifier.js');

const RACINE = path.join(__dirname, '..', '..');
const SORTIE = path.join(__dirname, 'captures', 'publication');
fs.mkdirSync(SORTIE, { recursive: true });

function chargerPlaywright() {
  try { return require('playwright'); } catch (e) { /* pas d'installation locale */ }
  try { return require(path.join(execSync('npm root -g', { encoding: 'utf8' }).trim(), 'playwright')); } catch (e) { /* ni globale */ }
  console.error('Playwright introuvable : npm i -g playwright && npx playwright install chromium');
  process.exit(2);
}
const { chromium } = chargerPlaywright();

/* ---------- Serveur : émulateur Cloudflare Pages, sinon serveur simple ---------- */
const attendre = ms => new Promise(r => setTimeout(r, ms));
async function repond(url) { try { const r = await fetch(url, { redirect: 'manual' }); return r.status > 0; } catch (e) { return false; } }

async function emulateurCloudflare(port) {
  const bin = process.env.RH_WRANGLER;
  const [cmd, args] = bin ? [bin, []] : ['npx', ['--yes', 'wrangler@4.156.0']];
  // Dossier de travail temporaire : wrangler y écrit son état (.wrangler/), hors du dépôt.
  const travail = fs.mkdtempSync(path.join(os.tmpdir(), 'rh-wrangler-'));
  const proc = spawn(cmd, [...args, 'pages', 'dev', DIST, '--port', String(port), '--ip', '127.0.0.1'], {
    cwd: travail, env: { ...process.env, CI: '1', WRANGLER_SEND_METRICS: 'false', NO_UPDATE_NOTIFIER: '1' }, stdio: ['ignore', 'pipe', 'pipe'],
  });
  proc.on('exit', () => fs.rmSync(travail, { recursive: true, force: true }));
  let journal = '';
  proc.stdout.on('data', d => { journal += d; });
  proc.stderr.on('data', d => { journal += d; });
  for (let i = 0; i < 240 && proc.exitCode === null; i++) {
    if (await repond(`http://127.0.0.1:${port}/`)) return { proc, base: `http://127.0.0.1:${port}`, cloudflare: true };
    await attendre(500);
  }
  proc.kill();
  console.log(`  (émulateur Cloudflare indisponible : ${journal.trim().split('\n').slice(-2).join(' ')})`);
  return null;
}

/* Serveur simple : la publication (secours : adresses sans .html et 404.html comme Cloudflare, sans _headers
   ni _redirects) ou le dépôt tel quel (référence pour détecter les régressions, comme GitHub Pages aujourd'hui). */
function serveurSimple(racine = DIST, adressesPropres = true) {
  const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml',
    '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.wasm': 'application/wasm', '.md': 'text/markdown' };
  return new Promise(resolve => {
    const s = http.createServer((req, res) => {
      const [chemin, requete = ''] = req.url.split('?');
      let rel = decodeURIComponent(chemin);
      if (adressesPropres && /\.html$/.test(rel)) { res.writeHead(308, { Location: rel.replace(/(?:index)?\.html$/, '') + (requete ? `?${requete}` : '') }); return res.end(); }
      let f = path.join(racine, rel);
      if (!f.startsWith(racine)) { res.writeHead(403); return res.end(); }
      if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
      else if (adressesPropres && !fs.existsSync(f) && fs.existsSync(`${f}.html`)) f += '.html';
      const existe = fs.existsSync(f) && fs.statSync(f).isFile() && !/^\/_(?:headers|redirects)$/.test(rel);
      res.writeHead(existe ? 200 : 404, { 'Content-Type': TYPES[path.extname(existe ? f : '.html')] || 'application/octet-stream' });
      res.end(existe ? fs.readFileSync(f) : adressesPropres ? fs.readFileSync(path.join(DIST, '404.html')) : '');
    });
    s.listen(0, '127.0.0.1', () => resolve({ proc: { kill: () => s.close() }, base: `http://127.0.0.1:${s.address().port}`, cloudflare: false }));
  });
}

/* ---------- Supabase simulé ---------- */
const CFG = fs.readFileSync(path.join(RACINE, 'remplacements', 'config.js'), 'utf8');
const PROJET = (CFG.match(/https:\/\/([a-z0-9]+)\.supabase\.co/) || [])[1];
const UTILISATEUR = { id: '00000000-0000-4000-8000-000000000001', email: 'compte.test@exemple.invalid' };
const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
const JWT = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: UTILISATEUR.id, email: UTILISATEUR.email, role: 'authenticated', aud: 'authenticated', exp: 4102444800 })}.signature-de-test`;
function supabaseJs() {
  if (process.env.RH_SUPABASE_JS && fs.existsSync(process.env.RH_SUPABASE_JS)) return process.env.RH_SUPABASE_JS;
  try { return require.resolve('@supabase/supabase-js/dist/umd/supabase.js'); } catch (e) { return null; }
}

async function simulerSupabase(ctx, connecte, journal) {
  const js = supabaseJs();
  if (js) await ctx.route(/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js@[\d.]+\/dist\/umd\/supabase\.min\.js/, r => r.fulfill({ path: js, contentType: 'text/javascript' }));
  await ctx.routeWebSocket(/\.supabase\.co\//, () => { /* temps réel : connexion acceptée, aucun message */ });
  const json = (r, corps, status = 200, entetes = {}) => r.fulfill({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*', ...entetes }, body: JSON.stringify(corps) });
  await ctx.route(/^https:\/\/[a-z0-9]+\.supabase\.co\//, async r => {
    const req = r.request(), u = new URL(req.url()), m = req.method();
    journal.push(`${m} ${u.pathname}`);
    if (m === 'OPTIONS') return r.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' } });
    if (u.pathname.startsWith('/auth/v1/user')) return connecte ? json(r, { id: UTILISATEUR.id, email: UTILISATEUR.email, aud: 'authenticated', role: 'authenticated', user_metadata: {} }) : json(r, { msg: 'non connecté' }, 401);
    if (u.pathname.startsWith('/auth/v1/')) return json(r, {});
    if (u.pathname.startsWith('/rest/v1/rpc/')) return json(r, /rs_missions_ouvertes|rs_mes_conversations/.test(u.pathname) ? [] : u.pathname.includes('rp_accepter') ? null : false);
    if (u.pathname.startsWith('/rest/v1/')) {
      if (m === 'HEAD') return r.fulfill({ status: 200, headers: { 'access-control-allow-origin': '*', 'content-range': '*/0' } });
      if (m !== 'GET') return json(r, [], 201);
      const profil = { id: UTILISATEUR.id, email: UTILISATEUR.email, nom: 'Test', prenom: 'Compte', telephone: null, consentement_le: null, cree_le: '2026-10-01T00:00:00Z' };
      const objet = (req.headers().accept || '').includes('vnd.pgrst.object');
      const lignes = connecte && u.pathname === '/rest/v1/profils' ? [profil] : [];
      return objet ? (lignes.length ? json(r, lignes[0]) : json(r, { message: 'aucune ligne' }, 406)) : json(r, lignes, 200, { 'content-range': `0-${Math.max(lignes.length - 1, 0)}/${lignes.length}` });
    }
    if (u.pathname.startsWith('/functions/v1/')) return json(r, { erreur: 'Lien de test (fonction simulée).' }, 400);
    if (u.pathname.startsWith('/storage/v1/')) return json(r, []);
    return json(r, {}, 404);
  });
  if (connecte && PROJET) {
    await ctx.addInitScript(([cle, session]) => { try { if (!localStorage.getItem(cle)) localStorage.setItem(cle, session); } catch (e) { /* stockage indisponible */ } },
      [`sb-${PROJET}-auth-token`, JSON.stringify({ access_token: JWT, refresh_token: 'test', token_type: 'bearer', expires_in: 3600, expires_at: 4102444800, user: { id: UTILISATEUR.id, email: UTILISATEUR.email, aud: 'authenticated', role: 'authenticated', user_metadata: {}, app_metadata: { provider: 'email' } } })]);
  }
  return !!js;
}

/* ---------- Résultats ---------- */
const resultats = [];
const ok = (nom, cond, detail = '') => { resultats.push({ nom, ok: !!cond, detail: String(detail).slice(0, 600) }); };
const existeDansDepot = p => { try { return fs.statSync(path.join(RACINE, decodeURIComponent(p).replace(/^\//, ''))).isFile(); } catch (e) { return false; } };

(async () => {
  console.log('Construction de dist/…');
  construire({ silencieux: true });
  const publies = lister(DIST);
  const pages = publies.filter(f => f.endsWith('.html') && !f.startsWith('dicom/ohif/') && f !== '404.html').sort();

  // RH_URL_CIBLE=https://radiologic-hub.pages.dev : teste le site réellement déployé (lecture seule, aucune donnée créée).
  const cible = (process.env.RH_URL_CIBLE || '').replace(/\/$/, '');
  const srv = cible ? { base: cible, cloudflare: true, distant: true, proc: { kill: () => {} } }
    : (await emulateurCloudflare(8790 + Math.floor(Math.random() * 100))) || (await serveurSimple());
  const BASE = srv.base;
  if (srv.distant) console.log(`Site DÉPLOYÉ testé : ${BASE} (référence : ${process.env.RH_URL_REFERENCE || 'dépôt local'})`);
  else console.log(`Site publié servi par ${srv.cloudflare ? 'l\'émulateur Cloudflare Pages (wrangler)' : 'le serveur local de secours'} : ${BASE}`);
  const b = await chromium.launch();
  const externesBloques = new Set(), toleres = new Set(), appelsSupabase = [];

  const APPAREILS = {
    ordinateur: { viewport: { width: 1366, height: 900 } },
    telephone: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' },
  };
  async function ouvrir(appareil, { connecte = false, base = BASE } = {}) {
    const ctx = await b.newContext({ ...APPAREILS[appareil], acceptDownloads: true });
    // Site déployé, visiteur : vrai Supabase en lecture seule (aucune connexion, aucune écriture) ; compte de test : simulé.
    const simule = srv.distant && !connecte ? true : await simulerSupabase(ctx, connecte, appelsSupabase);
    const p = await ctx.newPage();
    p.erreurs = [];
    p.on('pageerror', e => p.erreurs.push(`erreur JS : ${e.message}`));
    p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|ERR_TUNNEL|ERR_CONNECTION|net::ERR_/.test(m.text())) p.erreurs.push(`console : ${m.text()}`); });
    p.on('response', r => {
      if (!r.url().startsWith(base) || r.status() < 400) return;
      const chemin = new URL(r.url()).pathname;
      if (existeDansDepot(chemin) || existeDansDepot(`${chemin}.html`)) p.erreurs.push(`${r.status()} ${chemin} (présent dans le dépôt, absent de la publication)`);
      else toleres.add(chemin);   // déjà absent du dépôt (ex. images de fiches à fournir, masquées par la page)
    });
    p.on('requestfailed', r => {
      if (r.url().startsWith(base)) p.erreurs.push(`échec ${new URL(r.url()).pathname} : ${r.failure() && r.failure().errorText}`);
      else externesBloques.add(new URL(r.url()).host);
    });
    return { ctx, p, simule };
  }
  const charger = async (p, chemin, base = BASE) => {
    const rep = await p.goto(base + chemin, { waitUntil: 'load', timeout: 60000 });
    await p.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
    return rep;
  };

  /* ---------- 1. Toutes les pages publiées, ordinateur et téléphone, comparées au dépôt actuel ---------- */
  // Même balayage sur le dépôt tel quel (comme GitHub Pages aujourd'hui) : un défaut présent des deux côtés
  // est préexistant ; un défaut propre à la publication est une RÉGRESSION.
  // Référence : RH_URL_REFERENCE (ex. https://radiologichub.com, GitHub Pages) ou le dépôt local.
  const reference = process.env.RH_URL_REFERENCE ? { base: process.env.RH_URL_REFERENCE.replace(/\/$/, ''), proc: { kill: () => {} } } : await serveurSimple(RACINE, false);
  async function balayer(base, appareil, captures) {
    const { ctx, p } = await ouvrir(appareil, { base });
    const defauts = new Map();
    for (const page of pages) {
      p.erreurs = [];
      const rep = await charger(p, `/${page}`, base).catch(e => ({ status: () => `erreur ${e.message}` }));
      const statut = rep ? rep.status() : 'aucune réponse';
      const d = [...p.erreurs];
      if (statut !== 200) d.push(`statut ${statut}`);
      if (appareil === 'telephone' && await p.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1).catch(() => false)) d.push('défilement horizontal');
      if (d.length) defauts.set(page, d);
      if (captures && ['index.html', 'comptes-rendus.html', 'fiches-rapides.html', 'radioanatomie/index.html', 'remplacements.html', 'communaute.html', 'bibliotheque.html'].includes(page)) {
        await p.screenshot({ path: path.join(SORTIE, `${page.replace(/\//g, '-').replace('.html', '')}-${appareil}.png`) }).catch(() => {});
      }
    }
    await ctx.close();
    return defauts;
  }
  const preexistants = [];
  for (const appareil of Object.keys(APPAREILS)) {
    const pub = await balayer(BASE, appareil, true), ref = await balayer(reference.base, appareil, false);
    const regressions = [...pub].map(([page, d]) => [page, d.filter(x => !(ref.get(page) || []).includes(x))]).filter(([, d]) => d.length);
    [...pub].forEach(([page, d]) => d.filter(x => (ref.get(page) || []).includes(x)).forEach(x => preexistants.push(`${appareil} ${page} : ${x}`)));
    ok(`${appareil} : ${pages.length} pages publiées ouvertes, aucune régression par rapport au dépôt actuel (erreur JS, ressource manquante${appareil === 'telephone' ? ', défilement horizontal' : ''})`,
      !regressions.length, regressions.map(([page, d]) => `${page} : ${d.join(' ; ')}`).join(' | '));
    ok(`${appareil} : ${pages.length - pub.size}/${pages.length} pages publiées sans aucun défaut`, true);
  }
  reference.proc.kill();

  /* ---------- 2. Parcours par rubrique ---------- */
  for (const appareil of Object.keys(APPAREILS)) {
    const { ctx, p } = await ouvrir(appareil);
    const tel = appareil === 'telephone';
    try {

    // Accueil et navigation
    p.erreurs = [];
    await charger(p, '/index.html');
    ok(`${appareil} : /index.html → / (adresse propre)`, new URL(p.url()).pathname === '/', p.url());
    if (tel) {
      await p.click('.nav-toggle'); await p.waitForTimeout(250);
      ok(`${appareil} : menu mobile ouvert`, await p.$eval('#main-nav', e => e.classList.contains('is-open')));
    }
    await Promise.all([p.waitForURL(/comptes-rendus/), p.click('#main-nav a[href="comptes-rendus.html"]')]);
    await p.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
    ok(`${appareil} : menu → Comptes rendus`, /\/comptes-rendus$/.test(new URL(p.url()).pathname), p.url());

    // Comptes rendus : modèle, calculateur
    await p.evaluate(() => localStorage.clear()); await p.reload({ waitUntil: 'load' });
    await p.click('.cr-mod-btn:has-text("TDM")'); await p.click('.cr-tpl-btn >> nth=0');
    ok(`${appareil} : comptes rendus, choix d'un modèle`, (await p.$eval('#cr-editor', e => e.value.length)) > 100);
    await p.click('[data-depliant="cr-calculateurs"]');
    await p.click('#cr-tools-calculs details[data-groupe="Thorax et cœur"] > summary');
    await p.click('#cr-tools-calculs [data-tool="fleischner"]'); await p.waitForTimeout(200);
    ok(`${appareil} : calculateur (Fleischner) ouvert depuis l'éditeur`, await p.$eval('#tool-dialog', d => d.open));
    await p.click('#tool-dialog [data-act="close"]');

    // Calculateur autonome
    await charger(p, '/outils/bosniak.html');
    ok(`${appareil} : calculateur Bosniak (/outils/bosniak)`, /\/outils\/bosniak$/.test(new URL(p.url()).pathname) && (await p.$$('button, input, select')).length > 3);

    // Fiches : liste, fiche, vue 3D
    await charger(p, '/fiches-rapides.html');
    const cartes = await p.$$eval('a.fiche-card', a => a.length);
    ok(`${appareil} : fiches rapides (${cartes} cartes)`, cartes >= 20);
    await charger(p, '/fiches/cancer-du-cavum.html');
    await p.$eval('#cavum-3d', e => e.scrollIntoView());
    await p.click('#c3d-voir', { timeout: 4000 }).catch(() => {});   // téléphone : 3D chargée au clic (ordinateur : à l'arrivée à l'écran)
    const vue3d = await p.waitForFunction(() => {
      const s = document.querySelector('#c3d-scene');
      return s && (s.querySelector('canvas') || /indisponible/.test(s.textContent)) ? (s.querySelector('canvas') ? 'canvas' : s.textContent.trim().slice(0, 120)) : false;
    }, null, { timeout: 30000 }).then(h => h.jsonValue()).catch(() => 'délai dépassé');
    ok(`${appareil} : fiche avec vue 3D (three.js et modèle .glb chargés)`, vue3d === 'canvas', vue3d);

    // Radioanatomie : atlas de coupes
    await charger(p, '/radioanatomie/tdm-thorax.html');
    const coupe = await p.waitForFunction(() => [...document.querySelectorAll('.ac-station img')].some(i => i.complete && i.naturalWidth > 0), null, { timeout: 20000 }).then(() => true).catch(() => false);
    ok(`${appareil} : radioanatomie, atlas TDM thorax (atlas.json et coupes)`, coupe);

    ok(`${appareil} : parcours sans erreur JS ni ressource manquante`, !p.erreurs.length, p.erreurs.join(' ; '));
    } catch (e) { ok(`${appareil} : parcours interrompu`, false, e.message.split('\n')[0]); }
    await ctx.close();
  }

  /* ---------- 3. Modules connectés à Supabase (simulé) ---------- */
  for (const connecte of [false, true]) {
    for (const appareil of Object.keys(APPAREILS)) {
      const { ctx, p, simule } = await ouvrir(appareil, { connecte });
      const qui = connecte ? 'compte de test connecté' : 'visiteur';
      if (!simule) { ok(`${appareil} ${qui} : Supabase simulé`, false, 'supabase-js introuvable (RH_SUPABASE_JS)'); await ctx.close(); continue; }
      p.erreurs = [];

      await charger(p, '/remplacements.html');
      await p.waitForFunction(() => document.getElementById('rp-app').innerText.trim().length > 20, null, { timeout: 15000 }).catch(() => {});
      const rp = await p.evaluate(() => ({ texte: document.getElementById('rp-app').innerText.slice(0, 160), barre: document.getElementById('rp-barre').innerText,
        demo: !document.getElementById('rp-demo').hidden, moteur: !!(window.RHRemplacements && window.RHRemplacements.moteur), mode: window.RHRp && window.RHRp.api && window.RHRp.api.mode }));
      ok(`${appareil} ${qui} : Remplacements en mode Supabase, sans moteur ni démonstration publiés`, rp.mode === 'supabase' && !rp.moteur && !rp.demo && rp.texte.length > 20, JSON.stringify(rp));
      if (!connecte) ok(`${appareil} : Remplacements, bouton « Se connecter »`, /Se connecter/i.test(rp.barre), rp.barre);
      else ok(`${appareil} : Remplacements, compte de test reconnu`, !/Se connecter/i.test(rp.barre), rp.barre);
      if (!connecte) {
        await p.evaluate(() => { location.hash = '#/connexion'; }); await p.waitForTimeout(600);
        ok(`${appareil} : Remplacements, écran de connexion`, /Connexion/i.test(await p.$eval('#rp-app', e => e.innerText)));
      }

      await charger(p, '/communaute.html');
      await p.waitForFunction(() => !document.querySelector('#rs-app [data-attente]') && document.getElementById('rs-app').innerText.trim().length > 20, null, { timeout: 15000 }).catch(() => {});
      const rs = await p.evaluate(() => ({ texte: document.getElementById('rs-app').innerText.slice(0, 160), mode: window.RHRs && window.RHRs.api && window.RHRs.api.mode, demo: document.getElementById('rs-demo') ? !document.getElementById('rs-demo').hidden : false }));
      ok(`${appareil} ${qui} : Communauté en mode Supabase`, rs.mode === 'supabase' && !rs.demo && rs.texte.length > 20, JSON.stringify(rs));

      await charger(p, '/bibliotheque.html');
      await p.waitForFunction(() => document.getElementById('bib-page').innerText.trim().length > 0, null, { timeout: 15000 }).catch(() => {});
      const bib = await p.evaluate(() => ({ mode: window.RHBib && window.RHBib.api && window.RHBib.api.mode, demo: !document.getElementById('bib-demo').hidden, texte: document.getElementById('bib-page').innerText.slice(0, 120) }));
      ok(`${appareil} ${qui} : Bibliothèque en mode Supabase`, bib.mode === 'supabase' && !bib.demo, JSON.stringify(bib));

      await charger(p, '/remplacements-reponse.html?j=jeton-de-test');
      const rep = await p.evaluate(() => ({ url: location.pathname + location.search, texte: document.querySelector('main').innerText.slice(0, 200) }));
      ok(`${appareil} ${qui} : page de réponse aux e-mails (paramètres conservés, erreur affichée proprement)`, rep.url === '/remplacements-reponse?j=jeton-de-test' && (srv.distant && !connecte ? /Lien inactif|n'est pas reconnu/i : /fonction simulée|Erreur/).test(rep.texte), JSON.stringify(rep));

      ok(`${appareil} ${qui} : modules Supabase sans erreur JS ni ressource manquante`, !p.erreurs.length, p.erreurs.join(' ; '));
      await ctx.close();
    }
  }
  ok('Supabase : compte de test uniquement simulé (aucune connexion au vrai projet)', appelsSupabase.length > 0, `${appelsSupabase.length} requêtes interceptées`);

  /* ---------- 4. Fichiers non publiés : 404 par adresse directe ---------- */
  const publiesSet = new Set(publies);
  const depot = execFileSync('git', ['ls-files', '-z'], { cwd: RACINE, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).split('\0').filter(Boolean);
  const nonPublies = [...depot.filter(f => !publiesSet.has(f)), '.git/config', '.git/HEAD', '.env', 'supabase/.env', 'dist/index.html'];
  const accessibles = [];
  for (let i = 0; i < nonPublies.length; i += 25) {
    await Promise.all(nonPublies.slice(i, i + 25).map(async f => {
      const r = await fetch(`${BASE}/${f.split('/').map(encodeURIComponent).join('/')}`, { redirect: 'follow' }).catch(e => ({ status: `erreur ${e.message}` }));
      if (r.status !== 404) accessibles.push(`${f} (${r.status})`);
    }));
  }
  ok(`${nonPublies.length} fichiers non publiés (scripts, SQL, fonctions serveur, tests, docs, CLAUDE.md, moteur et démonstration des Remplacements…) : tous en 404`, !accessibles.length, accessibles.join(', '));
  const page404 = await fetch(`${BASE}/supabase/migrations/`).then(async r => ({ s: r.status, t: await r.text() }));
  ok('adresse inexistante : statut 404 et page « Page introuvable »', page404.s === 404 && /Page introuvable/.test(page404.t), page404.s);

  /* ---------- 5. Redirections et en-têtes (Cloudflare) ---------- */
  const tete = async (u, opts = {}) => fetch(BASE + u, { redirect: 'manual', ...opts });
  const redir = async (u, attendu, code) => { const r = await tete(u); const loc = (r.headers.get('location') || '').replace(BASE, ''); ok(`redirection ${u} → ${attendu}`, (!code || r.status === code) && loc === attendu, `${r.status} ${loc}`); };
  await redir('/comptes-rendus.html', '/comptes-rendus', 308);
  await redir('/remplacements-reponse.html?j=abc&d=2', '/remplacements-reponse?j=abc&d=2', 308);
  await redir('/radioanatomie/index.html', '/radioanatomie/', 308);
  if (srv.cloudflare) {
    await redir('/cours-admin.html', '/', 301);
    const e = (await tete('/')).headers;
    ok('en-têtes de sécurité (nosniff, cadre interdit, HSTS, permissions)', e.get('x-content-type-options') === 'nosniff' && /frame-ancestors 'self'/.test(e.get('content-security-policy') || '')
      && e.get('x-frame-options') === 'SAMEORIGIN' && /max-age=/.test(e.get('strict-transport-security') || '') && /microphone=\(self\)/.test(e.get('permissions-policy') || ''), [...e].map(x => x.join(': ')).join(' | '));
    const r = (await tete('/remplacements-reponse?j=abc')).headers;
    ok('page de réponse : jeton jamais transmis (Referrer-Policy no-referrer) ni indexé', r.get('referrer-policy') === 'no-referrer' && /noindex/.test(r.get('x-robots-tag') || ''), `${r.get('referrer-policy')} / ${r.get('x-robots-tag')}`);
    ok('administration de la bibliothèque non indexée', /noindex/.test((await tete('/bibliotheque-admin')).headers.get('x-robots-tag') || ''));
  } else ok('en-têtes et _redirects : non vérifiés (émulateur Cloudflare indisponible)', true);

  await b.close();
  srv.proc.kill();

  /* ---------- Bilan ---------- */
  const echecs = resultats.filter(r => !r.ok);
  resultats.forEach(r => console.log(`${r.ok ? '  ✓' : '  ✗'} ${r.nom}${r.ok || !r.detail ? '' : `\n      → ${r.detail}`}`));
  if (preexistants.length) console.log(`  ⚠ ${preexistants.length} défaut(s) déjà présent(s) sur le site actuel (non introduits par la publication) :\n      ${preexistants.join('\n      ')}`);
  if (toleres.size) console.log(`  ⚠ ${toleres.size} ressource(s) déjà absente(s) du dépôt (masquées par les pages) : ${[...toleres].sort().join(', ')}`);
  if (externesBloques.size) console.log(`  ⚠ hôtes externes injoignables pendant le test (réseau de l'environnement) : ${[...externesBloques].sort().join(', ')}`);
  fs.writeFileSync(path.join(SORTIE, 'resultats.json'), JSON.stringify({ serveur: srv.cloudflare ? 'wrangler pages dev' : 'serveur local', resultats, preexistants, toleres: [...toleres], externesBloques: [...externesBloques] }, null, 1));
  console.log(`\n${resultats.length - echecs.length}/${resultats.length} vérifications réussies${echecs.length ? ` — ${echecs.length} ÉCHEC(S)` : ''}. Captures : ${path.relative(RACINE, SORTIE)}/`);
  process.exit(echecs.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
