#!/usr/bin/env node
/* =========================================================
   RadiologicHub — contrôles d'accessibilité automatiques de CHAQUE page
   publiée (dist/), dans Chromium (Playwright), sans réseau externe :
   • langue du document : fr ;
   • toute image a un texte de remplacement (alt, vide si décorative) ;
   • tout bouton ou lien visible a un nom (texte, aria-label, title, image) ;
   • tout champ de saisie a une étiquette (label associé, aria-label…) —
     attention : un <output> placé dans un <label> prend l'étiquette ;
   • aucun identifiant (id) en double dans une page.
   Lancer : npm run test:accessibilite
   ========================================================= */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { execSync } = require('child_process');
const { construire } = require('../../scripts/publication/construire.js');
const { lister } = require('../../scripts/publication/verifier.js');

function chargerPlaywright() {
  try { return require('playwright'); } catch (e) { /* pas d'installation locale */ }
  try { return require(path.join(execSync('npm root -g', { encoding: 'utf8' }).trim(), 'playwright')); } catch (e) { /* ni globale */ }
  console.error('Playwright introuvable.'); process.exit(2);
}
const { chromium } = chargerPlaywright();
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp' };

(async () => {
  const dist = fs.mkdtempSync(path.join(os.tmpdir(), 'rh-a11y-'));
  construire({ silencieux: true, dist });
  const pages = lister(dist).filter(f => f.endsWith('.html') && !f.startsWith('dicom/ohif/'));
  const srv = http.createServer((req, res) => {
    const f = path.join(dist, decodeURIComponent(req.url.split('?')[0]));
    const ok = f.startsWith(dist) && fs.existsSync(f) && fs.statSync(f).isFile();
    res.writeHead(ok ? 200 : 404, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' });
    res.end(ok ? fs.readFileSync(f) : '');
  });
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${srv.address().port}`;
  const b = await chromium.launch();
  const ctx = await b.newContext();
  await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());   // aucune ressource externe
  const p = await ctx.newPage();
  const defauts = [];
  for (const pg of pages) {
    await p.goto(`${base}/${pg}`, { waitUntil: 'load' }).catch(() => {});
    await p.waitForTimeout(250);
    const r = await p.evaluate(() => {
      const nom = e => (e.getAttribute('aria-label') || e.getAttribute('aria-labelledby') || e.getAttribute('title') || e.textContent || '').trim()
        || [...e.querySelectorAll('img[alt], svg title')].map(x => x.alt || x.textContent).join('').trim();
      const ids = {};
      document.querySelectorAll('[id]').forEach(e => { ids[e.id] = (ids[e.id] || 0) + 1; });
      return [
        ...(document.documentElement.lang === 'fr' ? [] : [`langue « ${document.documentElement.lang} » (attendu : fr)`]),
        ...[...document.querySelectorAll('img:not([alt])')].map(i => `image sans alt : ${i.getAttribute('src')}`),
        ...[...document.querySelectorAll('button, a[href]')].filter(e => e.offsetParent !== null && !nom(e)).map(e => `bouton ou lien sans nom : ${e.outerHTML.slice(0, 100)}`),
        ...[...document.querySelectorAll('input:not([type=hidden]):not([type=submit]):not([type=button]), select, textarea')]
          .filter(e => !(e.labels && e.labels.length) && !e.getAttribute('aria-label') && !e.getAttribute('aria-labelledby') && !e.getAttribute('title'))
          .map(e => `champ sans étiquette : ${e.outerHTML.slice(0, 100)}`),
        ...Object.entries(ids).filter(([, n]) => n > 1).map(([k, n]) => `identifiant en double : #${k} (${n} fois)`),
      ];
    });
    r.forEach(d => defauts.push(`${pg} : ${d}`));
  }
  await b.close(); srv.close(); fs.rmSync(dist, { recursive: true, force: true });
  defauts.slice(0, 60).forEach(d => console.log(`  ✗ ${d}`));
  console.log(defauts.length ? `\n${defauts.length} défaut(s) d'accessibilité sur ${pages.length} pages.\n# fail ${defauts.length}` : `  ✓ ${pages.length} pages publiées : langue, images, noms des boutons et liens, étiquettes des champs, identifiants uniques\n# pass 1\n# fail 0`);
  process.exitCode = defauts.length ? 1 : 0;
})();
