/* =========================================================
   RadiologicHub — assistant documentaire des comptes rendus, dans un vrai
   navigateur (Playwright, Chromium) : détection pendant la frappe, panneau,
   carrousel, lien vers l'ancre, curseur et texte préservés, réglages
   (désactiver, épingler), tablette et téléphone, aucune requête contenant le
   texte, fonctions existantes de l'éditeur intactes.
   Lancer : npm run test:assistant     (captures : tests/navigateur/captures/)
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
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp' };
const serveur = () => new Promise(resolve => {
  const s = http.createServer((req, res) => {
    let f = path.join(RACINE, decodeURIComponent(req.url.split('?')[0]));
    if (!f.startsWith(RACINE)) { res.writeHead(403); return res.end(); }
    if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
    fs.readFile(f, (err, data) => {
      if (err) { res.writeHead(404); return res.end(); }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' });
      res.end(data);
    });
  });
  s.listen(0, '127.0.0.1', () => resolve(s));
});

const resultats = [];
const ok = (nom, cond, detail = '') => resultats.push({ nom, ok: !!cond, detail: String(detail) });
const attendre = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const srv = await serveur();
  const base = `http://127.0.0.1:${srv.address().port}/`;
  const navigateur = await chromium.launch();
  const SECRET = 'Kyste rénal gauche Bosniak III';

  async function ouvrir(largeur, hauteur, opts = {}) {
    const ctx = await navigateur.newContext({ viewport: { width: largeur, height: hauteur }, ...opts });
    const page = await ctx.newPage();
    const requetes = [];
    const erreurs = [];
    page.on('request', r => requetes.push({ url: r.url(), corps: r.postData() || '' }));
    page.on('pageerror', e => erreurs.push(e.message));
    await page.goto(base + 'comptes-rendus.html', { waitUntil: 'load' });
    return { ctx, page, requetes, erreurs };
  }
  const etat = page => page.$eval('#ad-panneau', p => p.dataset.etat);

  /* ---------- Ordinateur ---------- */
  {
    const { ctx, page, requetes, erreurs } = await ouvrir(1440, 900);
    ok('chargement : panneau replié, index pas encore chargé', await etat(page) === 'replie' && !requetes.some(r => r.url.includes('index-fiches.js')));
    await page.click('#cr-editor');
    await page.fill('#cr-editor', SECRET);
    await page.waitForSelector('.ad-fiche', { timeout: 3000 });
    ok('détection pendant la frappe : panneau ouvert', await etat(page) === 'ouvert');
    ok('titre exact de la fiche', (await page.textContent('.ad-fiche')) === 'Masses rénales kystiques : Bosniak 2019', await page.textContent('.ad-fiche'));
    ok('rubrique contextuelle : catégorie III', /^III ·/.test(await page.textContent('.ad-rub')), await page.textContent('.ad-rub'));
    ok('extraits affichés', (await page.$$('.ad-extrait')).length >= 2);
    const lien = await page.$eval('.ad-lien', a => ({ href: a.getAttribute('href'), cible: a.target }));
    ok('lien vers l\'ancre, nouvel onglet', lien.href === 'fiches/masses-renales-kystiques.html#categories' && lien.cible === '_blank', JSON.stringify(lien));
    ok('bouton « Consulter la fiche complète »', (await page.getAttribute('.ad-complete', 'href')) === 'fiches/masses-renales-kystiques.html');

    // curseur et texte préservés pendant l'usage du panneau
    await page.$eval('#cr-editor', t => { t.focus(); t.setSelectionRange(6, 11); });
    const pos1 = await page.textContent('.ad-pos');
    await page.click('.ad-suiv');
    const pos2 = await page.textContent('.ad-pos');
    ok('carrousel : section suivante', pos1 !== pos2, `${pos1} → ${pos2}`);
    await page.click('.ad-points button:first-child');
    ok('carrousel : points', /^Section 1 \//.test(await page.textContent('.ad-pos')));
    const ed = await page.$eval('#cr-editor', t => ({ v: t.value, a: t.selectionStart, b: t.selectionEnd, focus: document.activeElement === t }));
    ok('texte, sélection et focus de l\'éditeur inchangés', ed.v === SECRET && ed.a === 6 && ed.b === 11 && ed.focus, JSON.stringify(ed));

    // pas de reconstruction si les suggestions ne changent pas
    await page.click('.ad-points button:nth-child(2)');
    await page.$eval('.ad-fiche', h => { h.dataset.marque = '1'; });
    await page.$eval('#cr-editor', t => t.setSelectionRange(t.value.length, t.value.length));
    await page.keyboard.type('.');
    await attendre(700);
    ok('panneau non reconstruit si rien ne change', await page.$('.ad-fiche[data-marque="1"]') !== null);

    // plusieurs suggestions
    await page.fill('#cr-editor', SECRET + '.\nPancréatite aiguë, CTSI à 4.');
    await page.waitForFunction(() => document.querySelector('.ad-fiche') && /pancréatite/i.test(document.querySelector('.ad-fiche').textContent), null, { timeout: 3000 });
    const nbAutres = (await page.$$('.ad-autres button')).length;
    ok('plusieurs suggestions (principale = paragraphe du curseur)', nbAutres >= 1 && nbAutres <= 3, nbAutres);
    await page.click('.ad-autres button');
    ok('choix d\'une suggestion secondaire', (await page.textContent('.ad-fiche')) !== 'Imagerie de la pancréatite aiguë');
    await page.screenshot({ path: path.join(SORTIE, 'assistant-1440.png') });

    // aucune fiche → replié (non épinglé) ; épinglé → reste ouvert
    await page.fill('#cr-editor', 'Foie de taille normale, sans lésion focale.');
    await page.waitForFunction(() => document.querySelector('#ad-panneau').dataset.etat === 'replie', null, { timeout: 3000 });
    ok('aucune fiche : panneau replié', true);
    await page.click('.ad-rail-btn');
    ok('rail : réouverture, message « aucune fiche »', await etat(page) === 'ouvert' && !!(await page.$('.ad-vide')));
    await page.click('#ad-epingle');
    await page.fill('#cr-editor', 'Rate normale.');
    await attendre(700);
    ok('épinglé : reste ouvert', await etat(page) === 'ouvert' && (await page.getAttribute('#ad-epingle', 'aria-pressed')) === 'true');

    // désactivation, mémorisée au rechargement
    await page.uncheck('#ad-actif');
    await page.fill('#cr-editor', 'Bosniak IIF');
    await attendre(700);
    ok('désactivé : rien n\'est analysé', !(await page.$('.ad-fiche')));
    await page.reload({ waitUntil: 'load' });
    ok('désactivation mémorisée', !(await page.isChecked('#ad-actif')) && await etat(page) === 'replie');
    await page.click('.ad-rail-btn');
    await page.check('#ad-actif');
    await page.fill('#cr-editor', 'Bosniak IIF');
    await page.waitForSelector('.ad-fiche', { timeout: 3000 });
    ok('réactivation', /^IIF ·/.test(await page.textContent('.ad-rub')));

    // l'ancre existe dans la fiche
    const href = await page.getAttribute('.ad-lien', 'href');
    const fiche = await ctx.newPage();
    await fiche.goto(base + href);
    ok('ancre présente dans la fiche', await fiche.$eval('#' + href.split('#')[1], el => !!el).catch(() => false), href);
    await fiche.close();

    // fonctions existantes : suggestions de phrases, annulation
    await page.fill('#cr-editor', '');
    await page.click('#cr-editor');
    await page.keyboard.type('angiome');
    await page.waitForSelector('#cr-pop:not([hidden])', { timeout: 3000 }).catch(() => {});
    ok('suggestions de phrases de l\'éditeur toujours actives', await page.$eval('#cr-pop', p => !p.hidden));
    await page.keyboard.press('Escape');

    // confidentialité : aucune requête externe ni contenant le texte
    const mots = ['Bosniak', 'Pancr', 'Foie', 'Rate', 'rénal', 'angiome'];
    const fuite = requetes.filter(r => mots.some(m => decodeURIComponent(r.url + r.corps).includes(m)));
    ok('aucune requête ne contient le texte du compte rendu', !fuite.length, fuite.map(r => r.url).join(' '));
    const assistant = requetes.filter(r => /assistant\//.test(r.url));
    ok('assistant : fichiers du site uniquement', assistant.every(r => r.url.startsWith(base)) && assistant.filter(r => r.url.includes('index-fiches.js')).length >= 1);
    ok('aucune erreur JavaScript (ordinateur)', !erreurs.length, erreurs.join(' | '));
    await ctx.close();
  }

  /* ---------- Tablette ---------- */
  {
    const { ctx, page, erreurs } = await ouvrir(820, 1180, { hasTouch: true });
    await page.fill('#cr-editor', 'Lésion PI-RADS 4 de la zone périphérique');
    await page.waitForSelector('.ad-fiche', { timeout: 3000 });
    const g = await page.evaluate(() => {
      const p = document.querySelector('.ad-corps').getBoundingClientRect();
      const e = document.querySelector('.cr-editor').getBoundingClientRect();
      return { pr: p.right, er: e.right, l: p.left, vw: innerWidth, sw: document.documentElement.scrollWidth };
    });
    ok('tablette : panneau latéral à droite, sans défilement horizontal', g.pr <= g.vw && g.l > g.vw / 3 && g.sw <= g.vw, JSON.stringify(g));
    ok('tablette : section PI-RADS', /PI-RADS/.test(await page.textContent('.ad-diapo h4')));
    await page.screenshot({ path: path.join(SORTIE, 'assistant-820.png') });
    ok('aucune erreur JavaScript (tablette)', !erreurs.length, erreurs.join(' | '));
    await ctx.close();
  }

  /* ---------- Téléphone ---------- */
  {
    const { ctx, page, erreurs } = await ouvrir(390, 844, { hasTouch: true, isMobile: true });
    ok('téléphone : panneau masqué au départ', !(await page.isVisible('#ad-panneau')) && !(await page.isVisible('#ad-mobile')));
    await page.fill('#cr-editor', 'Pancréatite aiguë');
    await page.waitForSelector('#ad-mobile:not([hidden])', { timeout: 3000 });
    ok('téléphone : bouton « Fiche liée » sans ouvrir le panneau', await etat(page) === 'replie' && (await page.textContent('#ad-mobile')).includes('1'));
    await page.tap('#ad-mobile');
    await attendre(400);
    const g = await page.evaluate(() => {
      const r = document.querySelector('.ad-corps').getBoundingClientRect();
      return { l: r.left, r: r.right, b: r.bottom, vw: innerWidth, vh: innerHeight, sw: document.documentElement.scrollWidth };
    });
    ok('téléphone : panneau compact à la demande, dans l\'écran', await etat(page) === 'ouvert' && g.l >= 0 && g.r <= g.vw && g.b <= g.vh && g.sw <= g.vw, JSON.stringify(g));
    await page.screenshot({ path: path.join(SORTIE, 'assistant-390.png') });
    await page.tap('#ad-replier');
    ok('téléphone : fermeture', await etat(page) === 'replie');
    ok('aucune erreur JavaScript (téléphone)', !erreurs.length, erreurs.join(' | '));
    await ctx.close();
  }

  await navigateur.close();
  srv.close();
  let ko = 0;
  for (const r of resultats) {
    if (!r.ok) ko++;
    console.log(`${r.ok ? 'ok  ' : 'ÉCHEC'} ${r.nom}${r.ok || !r.detail ? '' : ' — ' + r.detail}`);
  }
  console.log(`\n${resultats.length - ko}/${resultats.length} vérifications réussies`);
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
