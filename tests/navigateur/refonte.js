/* =========================================================
   RadiologicHub — vérification dans un vrai navigateur (Playwright, Chromium)
   ---------------------------------------------------------
   Refonte : menu commun, accueil, page Comptes rendus, Communauté.
   • démarre un petit serveur local sur le dossier du site (aucune dépendance) ;
   • captures à 1440, 1024, 768 et 390 px (premier écran et page entière),
     après chargement des polices et des images ;
   • parcours avec des données fictives : menu mobile, filtres, cas du jour,
     choix d'un modèle, phrase par mot-clé, champs, annulation, menu
     « Plus d'actions », calculateurs, Effacer, mode d'emploi, clavier,
     « réduire les animations », état de chargement de la Communauté,
     centrage du bloc d'inscription ;
   • relève les erreurs JavaScript et les ressources qui ne se chargent pas.
   Lancer : npm run test:navigateur      (captures : tests/navigateur/captures/, non versionnées)
   Prérequis : Playwright et Chromium (npm i -g playwright && npx playwright install chromium) ;
   l'installation globale déjà présente est réutilisée.
   ========================================================= */
'use strict';
const fs = require('fs');
const path = require('path');
const http = require('http');
const { execSync } = require('child_process');

const RACINE = path.join(__dirname, '..', '..');
const SORTIE = path.join(__dirname, 'captures');
fs.mkdirSync(SORTIE, { recursive: true });

function chargerPlaywright() {
  try { return require('playwright'); } catch (e) { /* pas d'installation locale */ }
  try { return require(path.join(execSync('npm root -g', { encoding: 'utf8' }).trim(), 'playwright')); } catch (e) { /* ni globale */ }
  console.error('Playwright introuvable : npm i -g playwright && npx playwright install chromium');
  process.exit(2);
}
const { chromium } = chargerPlaywright();

/* ---------- Serveur statique local ---------- */
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.gz': 'application/gzip', '.mp4': 'video/mp4' };
function serveur() {
  return new Promise(resolve => {
    const s = http.createServer((req, res) => {
      let f = path.join(RACINE, decodeURIComponent(req.url.split('?')[0]));
      if (!f.startsWith(RACINE)) { res.writeHead(403); return res.end(); }
      if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
      if (!fs.existsSync(f) && fs.existsSync(f + '.html')) f += '.html';
      fs.readFile(f, (err, data) => {
        if (err) { res.writeHead(404); return res.end(); }
        res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' });
        res.end(data);
      });
    });
    s.listen(0, '127.0.0.1', () => resolve(s));
  });
}

const resultats = [];
const ok = (nom, cond, detail = '') => resultats.push({ nom, ok: !!cond, detail: String(detail) });

(async () => {
  const srv = await serveur();
  const BASE = `http://127.0.0.1:${srv.address().port}/`;
  const b = await chromium.launch();
  const ouvrir = async (w, h, opts = {}) => {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: w <= 390, hasTouch: w <= 768, acceptDownloads: true, ...opts });
    await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: BASE.slice(0, -1) });
    const p = await ctx.newPage();
    p.erreurs = [];
    p.on('pageerror', e => p.erreurs.push('erreur JS : ' + e.message));
    p.on('console', m => { if (m.type() === 'error') p.erreurs.push('console : ' + m.text()); });
    p.on('response', r => { if (r.status() >= 400 && r.url().startsWith(BASE)) p.erreurs.push(r.status() + ' ' + r.url().slice(BASE.length)); });
    return { ctx, p };
  };
  const focus = p => p.evaluate(() => {
    const e = document.activeElement, s = getComputedStyle(e);
    return { texte: (e.textContent || '').trim().slice(0, 40), outline: s.outlineStyle + ' ' + s.outlineWidth };
  });

  /* ---------- Captures comparables, débordement, erreurs ---------- */
  for (const page of ['index.html', 'comptes-rendus.html', 'communaute.html']) {
    for (const [w, h] of [[1440, 900], [1024, 768], [768, 1024], [390, 844]]) {
      const { ctx, p } = await ouvrir(w, h);
      await p.goto(BASE + page, { waitUntil: 'networkidle' });
      await p.evaluate(() => document.fonts.ready);
      await p.waitForTimeout(300);
      const nom = page.replace('.html', '') + '-' + w;
      await p.screenshot({ path: path.join(SORTIE, nom + '-ecran.png') });
      await p.screenshot({ path: path.join(SORTIE, nom + '-page.png'), fullPage: true });
      const deborde = await p.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
      ok(`${page} ${w} px : pas de défilement horizontal`, !deborde);
      ok(`${page} ${w} px : aucune erreur JS ni ressource manquante`, p.erreurs.length === 0, p.erreurs.join(' ; '));
      await ctx.close();
    }
  }

  /* ---------- Accueil ---------- */
  {
    const { ctx, p } = await ouvrir(1440, 900);
    await p.goto(BASE + 'index.html', { waitUntil: 'networkidle' });
    const manquantes = await p.evaluate(() => ['top', 'outils', 'masterclass', 'cas-du-jour', 'fiche-flash', 'format', 'programme', 'fiches', 'tarifs', 'faq', 'inscription'].filter(id => !document.getElementById(id)));
    ok('accueil : anciennes ancres présentes', manquantes.length === 0, manquantes);
    const outilsVisibles = await p.evaluate(() => document.querySelector('.acces-carte').getBoundingClientRect().top < innerHeight);
    ok('accueil 1440 : accès rapides visibles au premier écran', outilsVisibles);
    await p.click('text=Accéder aux outils'); await p.waitForTimeout(900);
    ok('accueil : « Accéder aux outils » mène aux accès rapides', await p.evaluate(() => location.hash === '#outils'));
    await p.click('.filter[data-filter="avance"]');
    const filtre = await p.$$eval('#cards .card', c => c.filter(x => !x.classList.contains('is-hidden')).map(x => x.dataset.level));
    ok('accueil : filtre « Avancé » des masterclass', filtre.length > 0 && filtre.every(l => l === 'avance'), filtre);
    await p.evaluate(() => document.getElementById('cas-du-jour').scrollIntoView());
    await p.click('#quiz-card .option >> nth=1');
    ok('accueil : cas du jour, réponse affichée', await p.$eval('#quiz-card .answer', a => a.classList.contains('is-visible')));
    // inscription : texte centré dans le cercle vert, rien n'en dépasse
    await p.evaluate(() => document.getElementById('inscription').scrollIntoView());
    const cercle = await p.evaluate(() => {
      const c = document.querySelector('.ring-circle').getBoundingClientRect(), R = c.width / 2, cx = c.left + R, cy = c.top + R;
      const r = [...document.querySelectorAll('.signup-text .marker-title, .signup-points li')].map(e => e.getBoundingClientRect());
      const dehors = r.flatMap(b => [[b.left, b.top], [b.right, b.top], [b.left, b.bottom], [b.right, b.bottom]]).filter(([x, y]) => Math.hypot(x - cx, y - cy) > R).length;
      const centre = (Math.min(...r.map(b => b.left)) + Math.max(...r.map(b => b.right))) / 2;
      return { dehors, ecart: Math.round(centre - cx) };
    });
    ok('accueil : bloc « Réservez votre place » centré dans le cercle', cercle.dehors === 0 && Math.abs(cercle.ecart) <= 4, JSON.stringify(cercle));
    // clavier : logo, menu, puis actions du premier écran
    await p.reload({ waitUntil: 'networkidle' });
    const arrets = [];
    for (let i = 0; i < 10; i++) { await p.keyboard.press('Tab'); arrets.push(await focus(p)); }
    ok('accueil : ordre de tabulation (logo, menu, actions)', arrets[1].texte === 'Comptes rendus' && arrets[7].texte === 'Masterclass' && arrets[8].texte === 'Accéder aux outils', arrets.map(a => a.texte).join(' | '));
    ok('accueil : focus visible à chaque arrêt', arrets.every(a => a.outline.startsWith('solid 3px')), arrets.map(a => a.outline).join(' ; '));
    await ctx.close();
  }

  /* ---------- Menu mobile ---------- */
  for (const page of ['index.html', 'comptes-rendus.html', 'fiches/avc-ischemique.html']) {
    const { ctx, p } = await ouvrir(390, 844);
    await p.goto(BASE + page, { waitUntil: 'networkidle' });
    await p.click('.nav-toggle'); await p.waitForTimeout(250);
    const ouvert = await p.evaluate(() => ({ ouvert: document.getElementById('main-nav').classList.contains('is-open'), focus: document.activeElement.textContent.trim() }));
    const tabs = [];
    for (let i = 0; i < 6; i++) { await p.keyboard.press('Tab'); tabs.push(await p.evaluate(() => document.activeElement.textContent.trim())); }
    await p.keyboard.press('Escape'); await p.waitForTimeout(250);
    const ferme = await p.evaluate(() => ({ ouvert: document.getElementById('main-nav').classList.contains('is-open'), focus: document.activeElement.className }));
    await p.click('.nav-toggle'); await p.waitForTimeout(250); await p.mouse.click(200, 820); await p.waitForTimeout(250);
    const horsMenu = await p.evaluate(() => document.getElementById('main-nav').classList.contains('is-open'));
    ok(`${page} 390 px : menu ouvert, focus sur la 1re rubrique, parcours au clavier`, ouvert.ouvert && ouvert.focus === 'Comptes rendus' && tabs[5] === 'Masterclass', JSON.stringify({ ouvert, tabs }));
    ok(`${page} 390 px : Échap ferme et rend le focus ; clic hors du menu ferme`, !ferme.ouvert && ferme.focus.includes('nav-toggle') && !horsMenu);
    await ctx.close();
  }

  /* ---------- Comptes rendus ---------- */
  for (const [w, h] of [[1440, 900], [390, 844]]) {
    const { ctx, p } = await ouvrir(w, h);
    p.on('dialog', d => d.accept());
    await p.goto(BASE + 'comptes-rendus.html', { waitUntil: 'networkidle' });
    await p.evaluate(() => localStorage.clear()); await p.reload({ waitUntil: 'networkidle' });
    const ed = '#cr-editor', val = () => p.$eval(ed, e => e.value);
    if (w === 1440) ok('CR 1440 : éditeur visible au premier écran', await p.$eval(ed, e => e.getBoundingClientRect().top < innerHeight - 200));
    await p.click('.cr-mod-btn:has-text("TDM")'); await p.click('.cr-tpl-btn >> nth=0');
    const v1 = await val();
    ok(`CR ${w} : choix d'un modèle`, v1.length > 100);
    await p.click(ed); await p.keyboard.press('Control+End'); await p.keyboard.press('Enter');
    await p.keyboard.type('angiome', { delay: 30 }); await p.waitForTimeout(300);
    const proposee = await p.$eval('#cr-pop', e => !e.hidden);
    await p.keyboard.press('Tab'); await p.waitForTimeout(200);
    const v2 = await val();
    ok(`CR ${w} : mot-clé proposé puis inséré par Tab`, proposee && v2.length > v1.length + 30);
    await p.click(ed); await p.keyboard.press('Control+End');
    await p.click('#cr-next');
    const c1 = await p.$eval(ed, e => [e.selectionStart, e.value.slice(e.selectionStart, e.selectionEnd)]);
    await p.click('#cr-next');
    const c2 = await p.$eval(ed, e => [e.selectionStart, e.value.slice(e.selectionStart, e.selectionEnd)]);
    ok(`CR ${w} : « Champ suivant » passe d'un champ [ … ] à l'autre`, /^\[.*\]$/.test(c1[1]) && /^\[.*\]$/.test(c2[1]) && c1[0] !== c2[0], JSON.stringify([c1, c2]));
    await p.click('#cr-undo'); await p.waitForTimeout(100);
    const v3 = await val();
    await p.click('#cr-redo'); await p.waitForTimeout(100);
    ok(`CR ${w} : Retour puis Rétablir`, v3.length < v2.length && (await val()) === v2);
    await p.click('.cr-plus-btn');
    const menu = await p.evaluate(() => ({ ouvert: !document.getElementById('cr-plus').hidden, n: document.querySelectorAll('#cr-plus button').length }));
    await p.keyboard.press('Escape');
    const fermeMenu = await p.evaluate(() => document.getElementById('cr-plus').hidden && document.activeElement.classList.contains('cr-plus-btn'));
    ok(`CR ${w} : menu « Plus d'actions » (5 actions, Échap rend le focus)`, menu.ouvert && menu.n === 5 && fermeMenu);
    const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 5000 }).catch(() => null), p.click('.cr-plus-btn').then(() => p.click('#cr-download'))]);
    ok(`CR ${w} : Télécharger .txt depuis le menu`, dl && /\.txt$/.test(dl.suggestedFilename()));
    await p.click('#cr-copy'); await p.waitForTimeout(300);
    ok(`CR ${w} : Copier`, (await p.evaluate(() => navigator.clipboard.readText()).catch(() => '')).length > 100);
    const fermeAuDepart = await p.$eval('#cr-tools-panneau', e => e.hidden);
    await p.click('[data-depliant="cr-calculateurs"]');
    const groupes = await p.$$eval('#cr-tools-calculs .cr-tools-groupe', g => g.length);
    const groupesFermes = await p.$$eval('#cr-tools-calculs details.cr-tools-groupe', g => g.every(d => !d.open));
    await p.click('#cr-tools-calculs details[data-groupe="Thorax et cœur"] > summary');
    await p.click('#cr-tools-calculs [data-tool="fleischner"]'); await p.waitForTimeout(200);
    ok(`CR ${w} : volet des calculateurs (fermé au départ, groupes repliés, ouvre un calculateur)`, fermeAuDepart && groupes >= 8 && groupesFermes && await p.$eval('#tool-dialog', d => d.open));
    await p.click('#tool-dialog [data-act="close"]');
    const v5 = await val();
    await p.click('#cr-clear'); await p.waitForTimeout(100);
    const vide = (await val()) === '';
    await p.click('#cr-undo'); await p.waitForTimeout(100);
    ok(`CR ${w} : Effacer (confirmation) puis Retour restaure le texte`, vide && (await val()) === v5);
    await p.click('.cr-aide-btn'); await p.reload({ waitUntil: 'networkidle' });
    ok(`CR ${w} : « Mode d'emploi » mémorisé`, await p.$eval('#cr-aide', e => !e.hidden));
    await p.click('.cr-aide-btn');
    await p.click('#tab-phr'); await p.fill('#phr-search', 'kyste'); await p.waitForTimeout(200);
    const avant = (await val()).length;
    await p.click('#phr-list .cr-ph >> nth=0'); await p.waitForTimeout(150);
    ok(`CR ${w} : insertion d'une phrase depuis l'onglet Phrases`, (await val()).length > avant);
    ok(`CR ${w} : aucune erreur pendant les parcours`, p.erreurs.length === 0, p.erreurs.join(' ; '));
    await ctx.close();
  }

  /* ---------- Réduire les animations ---------- */
  {
    const { ctx, p } = await ouvrir(390, 844, { reducedMotion: 'reduce' });
    await p.goto(BASE + 'index.html', { waitUntil: 'networkidle' });
    const r = await p.evaluate(() => ({ menu: getComputedStyle(document.getElementById('main-nav')).transitionDuration, carte: getComputedStyle(document.querySelector('.acces-carte')).transitionDuration, defilement: getComputedStyle(document.documentElement).scrollBehavior }));
    ok('réduire les animations : transitions coupées, défilement direct', r.menu.split(',').every(x => parseFloat(x) === 0) && r.carte === '0s' && r.defilement === 'auto', JSON.stringify(r));
    await ctx.close();
  }

  /* ---------- Communauté : chargement lent, puis script indisponible ---------- */
  {
    const { ctx, p } = await ouvrir(390, 844);
    await p.route('**/reseau/app.js*', async r => { await new Promise(x => setTimeout(x, 2500)); r.continue(); });
    await p.goto(BASE + 'communaute.html', { waitUntil: 'commit' });
    await p.waitForTimeout(700);
    const pendant = await p.evaluate(() => document.getElementById('rs-app') ? document.getElementById('rs-app').innerText : '');
    await p.waitForTimeout(3500);
    const apres = await p.evaluate(() => ({ demo: !document.getElementById('rs-demo').hidden, texte: document.getElementById('rs-app').innerText.slice(0, 40) }));
    ok('communauté : « Chargement de la communauté… » pendant le chargement', /Chargement de la communauté/.test(pendant), pendant);
    ok('communauté : contenu ensuite, bandeau « Démo » présent', apres.demo && !/Chargement/.test(apres.texte), JSON.stringify(apres));
    await ctx.close();
    const c2 = await ouvrir(390, 844);
    await c2.p.route('**/reseau/app.js*', r => r.abort());
    await c2.p.goto(BASE + 'communaute.html', { waitUntil: 'load' });
    await c2.p.waitForTimeout(8600);
    ok('communauté : script introuvable → message d\'aide après 8 s', /plus de temps que prévu/.test(await c2.p.evaluate(() => document.getElementById('rs-app').innerText)));
    await c2.ctx.close();
  }

  await b.close();
  srv.close();
  for (const r of resultats) console.log((r.ok ? 'ok    ' : 'ÉCHEC ') + r.nom + (r.ok ? '' : '  ← ' + r.detail));
  const echecs = resultats.filter(r => !r.ok).length;
  console.log(`\n${resultats.length - echecs} / ${resultats.length} vérifications réussies — captures : ${path.relative(RACINE, SORTIE)}/`);
  process.exit(echecs ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
