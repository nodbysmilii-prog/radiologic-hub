#!/usr/bin/env node
/* =========================================================
   RadiologicHub — parcours de CONNEXION dans un vrai navigateur
   (Playwright, Chromium), sur la version publiée (dist/) servie comme
   Cloudflare Pages (adresses sans .html, redirection 308 des .html).
   Supabase SIMULÉ : compte fictif, aucun appel au vrai projet, aucun
   e-mail envoyé, aucune donnée réelle.
   Pour Remplacements, Communauté et administration de la Bibliothèque :
   Ordinateur (1280 px) et téléphone (390 px).
   1. lien de connexion (e-mail) et Google : adresse de retour EXACTE
      demandée à Supabase = page en .html (une seule adresse autorisée
      par page, valable sur GitHub Pages et Cloudflare Pages) ;
   2. retour du lien : session ouverte, adresse nettoyée, vue demandée
      avant la connexion retrouvée (ex. #/messages d'un e-mail) ;
   3. lien expiré ou déjà utilisé : message en français, page utilisable ;
   4. session expirée (jeton de rafraîchissement refusé) : retour au mode
      visiteur avec le message « session expirée », à l'ouverture comme
      en cours d'utilisation ;
   5. déconnexion : session effacée, aucun message d'expiration ;
   6. envoi du lien en échec (perte de connexion, trop de demandes) : message
      en français ; triple envoi rapide du formulaire → un seul lien demandé.
   Lancer : npm run test:connexion
   Option : RH_SUPABASE_JS=<chemin de supabase.js UMD 2.45.4> (sinon node_modules).
   ========================================================= */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { execSync } = require('child_process');
const { construire } = require('../../scripts/publication/construire.js');

const RACINE = path.join(__dirname, '..', '..');
function chargerPlaywright() {
  try { return require('playwright'); } catch (e) { /* pas d'installation locale */ }
  try { return require(path.join(execSync('npm root -g', { encoding: 'utf8' }).trim(), 'playwright')); } catch (e) { /* ni globale */ }
  console.error('Playwright introuvable.');
  process.exit(2);
}
function supabaseJs() {
  if (process.env.RH_SUPABASE_JS && fs.existsSync(process.env.RH_SUPABASE_JS)) return process.env.RH_SUPABASE_JS;
  try { return require.resolve('@supabase/supabase-js/dist/umd/supabase.js'); } catch (e) { return null; }
}
const JS = supabaseJs();
if (!JS) { console.log('supabase-js 2.45.4 introuvable (RH_SUPABASE_JS) : test de connexion ignoré.'); process.exit(0); }
const { chromium } = chargerPlaywright();

const CFG = fs.readFileSync(path.join(RACINE, 'remplacements', 'config.js'), 'utf8');
const PROJET = (CFG.match(/https:\/\/([a-z0-9]+)\.supabase\.co/) || [])[1];
const CLE_SESSION = `sb-${PROJET}-auth-token`;
const U = { id: '00000000-0000-4000-8000-000000000001', email: 'compte.fictif@exemple.invalid' };
const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
const JWT = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: U.id, email: U.email, role: 'authenticated', aud: 'authenticated', exp: 4102444800 })}.signature-de-test`;
const UTILISATEUR = { id: U.id, email: U.email, aud: 'authenticated', role: 'authenticated', user_metadata: {}, app_metadata: { provider: 'email' } };
const session = expiresAt => JSON.stringify({ access_token: JWT, refresh_token: 'rafraichissement-fictif', token_type: 'bearer', expires_in: 3600, expires_at: expiresAt, user: UTILISATEUR });

/* ---------- Serveur : dist/ comme Cloudflare Pages ---------- */
function serveur(dist) {
  const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.md': 'text/markdown' };
  return new Promise(resolve => {
    const s = http.createServer((req, res) => {
      const [chemin, requete = ''] = req.url.split('?');
      const rel = decodeURIComponent(chemin);
      if (/\.html$/.test(rel)) { res.writeHead(308, { Location: rel.replace(/(?:index)?\.html$/, '') + (requete ? `?${requete}` : '') }); return res.end(); }
      let f = path.join(dist, rel);
      if (!f.startsWith(dist)) { res.writeHead(403); return res.end(); }
      if (fs.existsSync(`${f}.html`)) f += '.html';                  // /remplacements → remplacements.html (avant le dossier du même nom)
      else if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
      const existe = fs.existsSync(f) && fs.statSync(f).isFile();
      res.writeHead(existe ? 200 : 404, { 'Content-Type': existe ? TYPES[path.extname(f)] || 'application/octet-stream' : 'text/html; charset=utf-8' });
      res.end(existe ? fs.readFileSync(f) : '');
    });
    s.listen(0, '127.0.0.1', () => resolve({ fermer: () => s.close(), base: `http://127.0.0.1:${s.address().port}` }));
  });
}

/* ---------- Supabase simulé ---------- */
const APPAREILS = {
  ordinateur: { viewport: { width: 1280, height: 900 } },
  telephone: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
};
let appareil = 'ordinateur';
async function contexte(b, { connecte = false, expiresAt = 4102444800, rafraichissementRefuse = false, otp = null } = {}) {
  const ctx = await b.newContext(APPAREILS[appareil]);
  const journal = [];
  await ctx.route(/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js@[\d.]+\/dist\/umd\/supabase\.min\.js/, r => r.fulfill({ path: JS, contentType: 'text/javascript' }));
  await ctx.route(/^https:\/\/(fonts\.googleapis|fonts\.gstatic|cdn\.jsdelivr|cdnjs\.cloudflare|unpkg)\./, r => (/supabase-js/.test(r.request().url()) ? r.fallback() : r.fulfill({ status: 200, body: '' })));
  await ctx.routeWebSocket(/\.supabase\.co\//, () => { /* temps réel : accepté, aucun message */ });
  const json = (r, corps, status = 200) => r.fulfill({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(corps) });
  let enLigne = connecte;
  await ctx.route(/^https:\/\/[a-z0-9]+\.supabase\.co\//, async r => {
    const req = r.request(), u = new URL(req.url()), m = req.method();
    if (m === 'OPTIONS') return r.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' } });
    journal.push({ m, chemin: u.pathname, requete: u.search, corps: req.postData() || '' });
    if (u.pathname === '/auth/v1/authorize') return r.fulfill({ status: 200, contentType: 'text/html', body: '<p>Google (simulé)</p>' });
    if (u.pathname === '/auth/v1/otp') {
      if (otp === 'reseau') return r.abort('internetdisconnected');
      if (otp === 429) return json(r, { code: 429, error_code: 'over_email_send_rate_limit', msg: 'email rate limit exceeded' }, 429);
      if (otp === 'lent') await attendre(1500);
      return json(r, {});
    }
    if (u.pathname === '/auth/v1/logout') { enLigne = false; return r.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*' } }); }
    if (u.pathname === '/auth/v1/token') {
      if (rafraichissementRefuse) return json(r, { error: 'invalid_grant', error_description: 'Invalid Refresh Token: Refresh Token Not Found' }, 400);
      return json(r, JSON.parse(session(Math.round(Date.now() / 1000) + 3600)));
    }
    if (u.pathname === '/auth/v1/user') return enLigne || /Bearer eyJ/.test(req.headers().authorization || '') ? json(r, UTILISATEUR) : json(r, { msg: 'non connecté' }, 401);
    if (u.pathname.startsWith('/rest/v1/rpc/')) return json(r, /rs_missions_ouvertes|rs_mes_conversations/.test(u.pathname) ? [] : /rp_est_admin/.test(u.pathname) ? true : u.pathname.includes('rp_accepter') ? null : false);
    if (u.pathname.startsWith('/rest/v1/')) {
      if (m === 'HEAD') return r.fulfill({ status: 200, headers: { 'access-control-allow-origin': '*', 'content-range': '*/0' } });
      if (m !== 'GET') return json(r, [], 201);
      const lignes = u.pathname === '/rest/v1/profils' ? [{ id: U.id, email: U.email, nom: 'Fictif', prenom: 'Compte', telephone: '', cree_le: '2026-10-01T00:00:00Z' }]
        : u.pathname === '/rest/v1/rs_membres' ? [{ id: U.id, prenom: 'Compte', nom: 'Fictif', titre: '', statut: 'radiologue', annee: null, etablissement: '', ville: '', gouvernorat: '', bio: '', interets: [], photo: null, verifie: false, suspendu: false, emails_messages: true, cree_le: '2026-10-01T00:00:00Z' }] : [];
      const objet = (req.headers().accept || '').includes('vnd.pgrst.object');
      return objet ? (lignes.length ? json(r, lignes[0]) : json(r, { message: 'aucune ligne' }, 406)) : json(r, lignes);
    }
    if (u.pathname.startsWith('/functions/v1/')) return json(r, { erreur: 'fonction simulée' }, 400);
    if (u.pathname.startsWith('/storage/v1/')) return json(r, []);
    return json(r, {}, 404);
  });
  if (connecte) await ctx.addInitScript(([cle, s]) => { try { if (!sessionStorage.getItem('rh-test-init')) { localStorage.setItem(cle, s); sessionStorage.setItem('rh-test-init', '1'); } } catch (e) { /* indisponible */ } }, [CLE_SESSION, session(expiresAt)]);
  const p = await ctx.newPage();
  p.erreurs = [];
  p.on('pageerror', e => p.erreurs.push(e.message));
  return { ctx, p, journal };
}

const resultats = [];
const ok = (nom, cond, detail = '') => { resultats.push({ nom, ok: !!cond, detail: String(detail).slice(0, 400) }); };
const SEULEMENT = process.env.RH_MODULE || '';
const MODULES = [
  { nom: 'Remplacements', page: 'remplacements', app: '#rp-app', vue: '#/admin', formulaire: '[data-form="connexion"]', bouton: '[data-act="google"]',
    visiteur: async p => /se connecter/i.test(await p.$eval('#rp-barre', e => e.innerText)), connecte: async p => /déconnexion/i.test(await p.$eval('#rp-barre', e => e.innerText)), versConnexion: '#/connexion' },
  { nom: 'Communauté', page: 'communaute', app: '#rs-app', vue: '#/messages', formulaire: '[data-form="connexion"]', bouton: '[data-act="google"]',
    visiteur: async p => !!(await p.$('a[href="#/connexion"]')), connecte: async p => !!(await p.$('details.rs-compte')), versConnexion: '#/connexion' },
  { nom: 'Administration de la Bibliothèque', page: 'bibliotheque-admin', app: '#bib-admin', vue: null, formulaire: '#bib-lien', bouton: '#bib-google',
    visiteur: async p => !!(await p.$('#bib-lien')), connecte: async p => /se déconnecter/i.test(await p.$eval('#bib-session', e => e.innerText).catch(() => '')), versConnexion: '' },
];
const attendre = ms => new Promise(r => setTimeout(r, ms));
const pret = async p => { await p.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {}); await attendre(400); };
const texte = p => p.evaluate(() => document.body.innerText);

(async () => {
  const dist = fs.mkdtempSync(path.join(os.tmpdir(), 'rh-connexion-'));
  construire({ silencieux: true, dist });
  const srv = await serveur(dist);
  const b = await chromium.launch();
  try {
    for (appareil of (process.env.RH_APPAREIL ? [process.env.RH_APPAREIL] : Object.keys(APPAREILS))) for (const M of MODULES.filter(m => !SEULEMENT || m.page === SEULEMENT)) {
      const nom = `${appareil} · ${M.nom}`;
      const attendu = `${srv.base}/${M.page}.html`;
      /* 1. Adresse de retour exacte, page ouverte sans .html (Cloudflare) et avec .html (redirigée) */
      for (const adresse of [`/${M.page}`, `/${M.page}.html`]) {
        const { ctx, p, journal } = await contexte(b);
        await p.goto(srv.base + adresse + (M.vue && adresse.endsWith('.html') ? M.vue : ''));
        await pret(p);
        if (M.versConnexion) { await p.evaluate(h => { location.hash = h; }, M.versConnexion); await attendre(500); }
        await p.waitForSelector(`${M.formulaire} input`, { timeout: 15000 }).catch(() => {});
        await p.fill(`${M.formulaire} input[type="email"], ${M.formulaire} input[name="email"]`, 'compte.fictif@exemple.invalid');
        await p.click(`${M.formulaire} button[type="submit"]`);
        await attendre(800);
        const otp = journal.find(j => j.chemin === '/auth/v1/otp');
        const retour = otp && new URLSearchParams(otp.requete).get('redirect_to');
        ok(`${nom} (${adresse}) : lien e-mail demandé avec l'adresse de retour exacte ${M.page}.html`, retour === attendu, retour);
        ok(`${nom} (${adresse}) : création de compte autorisée par le lien (confirmation par e-mail)`, otp && JSON.parse(otp.corps).create_user === true, otp && otp.corps);
        await ctx.close();
      }
      {
        const { ctx, p, journal } = await contexte(b);
        await p.goto(`${srv.base}/${M.page}`); await pret(p);
        if (M.versConnexion) { await p.evaluate(h => { location.hash = h; }, M.versConnexion); await attendre(500); }
        await Promise.all([p.waitForURL(/\/auth\/v1\/authorize/, { timeout: 8000 }).catch(() => {}), p.click(M.bouton)]);
        const g = journal.find(j => j.chemin === '/auth/v1/authorize');
        ok(`${nom} : Google avec la même adresse de retour`, g && new URLSearchParams(g.requete).get('redirect_to') === attendu, g && g.requete);
        await ctx.close();
      }

      /* 2. Retour du lien : session ouverte, adresse nettoyée, vue demandée retrouvée */
      {
        const { ctx, p } = await contexte(b);
        if (M.vue) {
          await p.goto(`${srv.base}/${M.page}${M.vue}`); await pret(p);
          await p.evaluate(h => { location.hash = h; }, M.versConnexion); await attendre(500);
          await p.fill(`${M.formulaire} input[name="email"], ${M.formulaire} input[type="email"]`, 'compte.fictif@exemple.invalid');
          await p.click(`${M.formulaire} button[type="submit"]`); await attendre(600);
        }
        const exp = Math.round(Date.now() / 1000) + 3600;
        await p.goto(`${srv.base}/${M.page}.html#access_token=${JWT}&expires_at=${exp}&expires_in=3600&refresh_token=r&token_type=bearer&type=magiclink`);
        await pret(p); await attendre(600);
        const etat = await p.evaluate(cle => ({ hash: location.hash, chemin: location.pathname, session: !!localStorage.getItem(cle) }), CLE_SESSION);
        ok(`${nom} : retour du lien, session ouverte et adresse nettoyée (jeton absent de l'adresse)`, etat.session && !/access_token/.test(etat.hash) && await M.connecte(p), JSON.stringify(etat));
        if (M.vue) ok(`${nom} : vue demandée avant la connexion retrouvée (${M.vue})`, etat.hash === M.vue, etat.hash);
        ok(`${nom} : retour du lien sans erreur JavaScript`, !p.erreurs.length, p.erreurs.join(' ; '));
        await ctx.close();
      }

      /* 3. Lien expiré ou déjà utilisé */
      {
        const { ctx, p } = await contexte(b);
        await p.goto(`${srv.base}/${M.page}.html#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired`);
        await pret(p); await attendre(600);
        const t = await texte(p), hash = await p.evaluate(() => location.hash);
        ok(`${nom} : lien expiré, message en français`, /lien de connexion a expiré ou a déjà été utilisé/.test(t), t.slice(0, 300));
        ok(`${nom} : lien expiré, page utilisable (formulaire affiché, plus de « Chargement… », adresse nettoyée)`, !/Chargement…/.test(await p.$eval(M.app, e => e.innerText).catch(() => 'Chargement…')) && !/error/.test(hash) && await M.visiteur(p), hash);
        await ctx.close();
      }

      /* 4a. Session expirée à l'ouverture (jeton de rafraîchissement refusé) : mode visiteur */
      {
        const { ctx, p } = await contexte(b, { connecte: true, expiresAt: Math.round(Date.now() / 1000) - 60, rafraichissementRefuse: true });
        await p.goto(`${srv.base}/${M.page}`); await pret(p); await attendre(600);
        const etat = await p.evaluate(cle => !!localStorage.getItem(cle), CLE_SESSION);
        ok(`${nom} : session expirée à l'ouverture, mode visiteur et session effacée`, !etat && await M.visiteur(p), `session conservée : ${etat}`);
        await ctx.close();
      }
      /* 4b. Session qui expire pendant l'utilisation : message et mode visiteur */
      {
        const { ctx, p } = await contexte(b, { connecte: true, expiresAt: Math.round(Date.now() / 1000) + 50, rafraichissementRefuse: true });
        await p.goto(`${srv.base}/${M.page}`); await pret(p);
        const connecteAvant = await M.connecte(p);
        await p.waitForFunction(() => /session a expiré/.test(document.body.innerText), null, { timeout: 45000 }).catch(() => {});
        const t = await texte(p);
        ok(`${nom} : session perdue en cours d'utilisation, message « session expirée » et mode visiteur`, connecteAvant && /session a expiré/.test(t) && await M.visiteur(p), `connecté avant : ${connecteAvant} ; ${t.slice(0, 200)}`);
        await ctx.close();
      }

      /* 6. Erreurs d'envoi du lien et double soumission */
      for (const [cas, attendu] of [['reseau', /Connexion impossible/], [429, /Trop de demandes|patientez/]]) {
        const { ctx, p } = await contexte(b, { otp: cas });
        await p.goto(`${srv.base}/${M.page}`); await pret(p);
        if (M.versConnexion) { await p.evaluate(h => { location.hash = h; }, M.versConnexion); await attendre(500); }
        await p.waitForSelector(`${M.formulaire} input`, { timeout: 15000 }).catch(() => {});
        await p.fill(`${M.formulaire} input[type="email"], ${M.formulaire} input[name="email"]`, 'compte.fictif@exemple.invalid');
        await p.click(`${M.formulaire} button[type="submit"]`); await attendre(1200);
        const t = await texte(p);
        ok(`${nom} : envoi du lien en échec (${cas === 'reseau' ? 'perte de connexion' : 'trop de demandes'}), message compréhensible en français`, attendu.test(t) && !/Failed to fetch|rate limit/i.test(t), t.slice(0, 200));
        await ctx.close();
      }
      {
        const { ctx, p, journal } = await contexte(b, { otp: 'lent' });
        await p.goto(`${srv.base}/${M.page}`); await pret(p);
        if (M.versConnexion) { await p.evaluate(h => { location.hash = h; }, M.versConnexion); await attendre(500); }
        await p.waitForSelector(`${M.formulaire} input`, { timeout: 15000 }).catch(() => {});
        await p.fill(`${M.formulaire} input[type="email"], ${M.formulaire} input[name="email"]`, 'compte.fictif@exemple.invalid');
        await p.evaluate(sel => { const f = document.querySelector(sel); f.requestSubmit(); f.requestSubmit(); f.requestSubmit(); }, M.formulaire);
        await attendre(2500);
        const n = journal.filter(j => j.chemin === '/auth/v1/otp').length;
        ok(`${nom} : triple envoi rapide du formulaire → un seul lien demandé`, n === 1, `${n} demandes`);
        await ctx.close();
      }

      /* 5. Déconnexion */
      {
        const { ctx, p, journal } = await contexte(b, { connecte: true });
        await p.goto(`${srv.base}/${M.page}`); await pret(p);
        const avant = await M.connecte(p);
        const bouton = await p.$('[data-act="deconnexion"]:visible, #bib-sortie');
        if (bouton) await bouton.click(); else { await p.click('details.rs-compte > summary'); await p.click('.rs-compte-menu [data-act="deconnexion"]'); }
        await pret(p); await attendre(600);
        const etat = await p.evaluate(cle => !!localStorage.getItem(cle), CLE_SESSION);
        const t = await texte(p);
        ok(`${nom} : déconnexion (appel à Supabase, session effacée, mode visiteur, aucun message d'expiration)`, avant && journal.some(j => j.chemin === '/auth/v1/logout') && !etat && await M.visiteur(p) && !/session a expiré/.test(t), `connecté avant : ${avant} ; session : ${etat}`);
        await ctx.close();
      }
    }
  } catch (e) {
    ok('parcours interrompu', false, e.stack);
  } finally {
    await b.close(); srv.fermer(); fs.rmSync(dist, { recursive: true, force: true });
  }
  resultats.forEach(r => console.log(`  ${r.ok ? '✓' : '✗'} ${r.nom}${r.ok || !r.detail ? '' : `\n      ${r.detail}`}`));
  const echecs = resultats.filter(r => !r.ok).length;
  console.log(`\n# pass ${resultats.length - echecs}\n# fail ${echecs}`);
  process.exitCode = echecs ? 1 : 0;
})();
