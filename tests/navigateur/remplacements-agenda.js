/* =========================================================
   RadiologicHub — Remplacements : agenda du remplaçant et planning de la
   structure, dans un vrai navigateur (Playwright, Chromium)
   ---------------------------------------------------------
   Mode démonstration forcé (aucun Supabase, aucun e-mail réel), à 1440 et
   390 px : écran d'arrivée, en-tête compact et retour au site, changement de
   mois, mission sur plusieurs jours (une seule mission, jour n sur N),
   couleurs et symboles, filtres par structure, honoraires confirmés et
   potentiels, réponse à une proposition, détail, annulation, vue liste,
   export .ics du mois, planning (volontaires, choix, jour sans demande,
   annulation), navigation du bas sur téléphone, page publique inchangée.
   Lancer : npm run test:agenda   (captures : tests/navigateur/captures/, non versionnées)
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
  console.log('Playwright introuvable : test de l\'agenda ignoré (npm i -g playwright && npx playwright install chromium).');
  process.exit(0);
}
const { chromium } = chargerPlaywright();

const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.md': 'text/markdown; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2' };
const serveur = () => new Promise(resolve => {
  const s = http.createServer((req, res) => {
    const f = path.join(RACINE, decodeURIComponent(req.url.split('?')[0]));
    if (!f.startsWith(RACINE) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' });
    fs.createReadStream(f).pipe(res);
  });
  s.listen(0, '127.0.0.1', () => resolve(s));
});

const resultats = [];
const ok = (nom, cond, detail = '') => { resultats.push({ nom, ok: !!cond }); console.log(`  ${cond ? '✓' : '✗'} ${nom}${detail && !cond ? ' — ' + detail : ''}`); };

/* Données fictives : missions d'Amel dans deux structures, propositions, volontaires, demande en recherche */
async function preparer(p) {
  return p.evaluate(async () => {
    const api = window.RHRp.api, D = api.demo, REF = window.RHRemplacements.referentiel;
    const T = () => JSON.parse(localStorage.getItem('rh-remplacements-demo-v1')).tables;
    const prof = m => T().profils.find(x => x.email.startsWith(m)).id;
    const amel = prof('amel'), resp = prof('responsable'), gerant = prof('gerant');
    const ora = T().structures.find(s => s.nom.includes('Orangers')).id, lac = T().structures.find(s => s.nom.includes('Lac')).id;
    const auj = REF.dateLocale(D.maintenant());
    const parMois = {};
    T().disponibilites.filter(d => d.remplacant_id === amel && d.creneau === 'journee' && d.date > REF.ajouterJours(auj, 2)).map(d => d.date).sort()
      .forEach(d => (parMois[d.slice(0, 7)] = parMois[d.slice(0, 7)] || []).push(d));
    const mois = Object.keys(parMois).sort((a, b) => parMois[b].length - parMois[a].length)[0], L = parMois[mois];
    const base = { heure_debut: '08:00', heure_fin: '16:00', type: 'journee', profil: 'specialiste', annee_min: null, unite: 'jour', logement: false, transport: false, repas: false, commentaire: '' };
    const publier = async (sid, qui, dates, modalites, honoraires) => { await D.connecterComme(qui); return (await api.publier(sid, { ...base, dates, modalites, honoraires })).demande_id; };
    const prop = (did, rid) => T().propositions.find(x => x.demande_id === did && x.remplacant_id === rid);
    const repondre = async (did, rid) => { await D.connecterComme(rid); await api.repondre(prop(did, rid).id, 'disponible'); };
    const a1 = await publier(ora, resp, [L[0], L[1]], ['scanner'], 500);       // deux jours
    const a2 = await publier(lac, gerant, [L[2]], ['echographie'], 450);       // attribution automatique
    const a3 = await publier(ora, resp, [L[3]], ['irm'], 550);
    const a4 = await publier(ora, resp, [L[4]], ['scanner'], 480);             // proposition à répondre
    const a5 = await publier(ora, resp, [L[5]], ['echographie'], 300);         // Amel en attente du choix
    const a6 = await publier(ora, resp, [L[6]], ['echographie'], 320);         // volontaires pour la clinique
    for (const did of [a1, a2, a3, a5]) await repondre(did, amel);
    const autres = T().propositions.filter(x => x.demande_id === a6 && x.remplacant_id !== amel);
    for (const x of autres) await repondre(a6, x.remplacant_id);
    if (!autres.length) await repondre(a6, amel);
    await D.connecterComme(resp);
    for (const did of [a1, a3]) await api.choisir(did, amel);
    await D.connecterComme(null);
    const dem = T().demandes, dans = d => d.slice(0, 7) === mois;
    const somme = l => l.reduce((t, d) => t + d.honoraires * d.dates.filter(dans).length, 0);
    const missions = dem.filter(d => d.remplacant_id === amel && d.etat === 'pourvue');
    const ouvertes = T().propositions.filter(x => x.remplacant_id === amel && ['envoyee', 'interesse'].includes(x.etat)).map(x => dem.find(d => d.id === x.demande_id)).filter(d => d.etat === 'publiee');
    return {
      mois, L, a1, a2, a3, a4, a5, a6, libelleMois: REF.moisFr(mois).replace(/^./, c => c.toUpperCase()),
      confirmes: REF.montant(somme(missions)), potentiels: REF.montant(somme(ouvertes)), joursMission: missions.reduce((t, d) => t + d.dates.filter(dans).length, 0),
      a2auto: dem.find(d => d.id === a2).etat === 'pourvue', libreClinique: REF.ajouterJours(L[6], 1) === L[7] ? REF.ajouterJours(L[7], 1) : REF.ajouterJours(L[6], 1),
    };
  });
}

(async () => {
  const srv = await serveur();
  const BASE = `http://127.0.0.1:${srv.address().port}`;
  const b = await chromium.launch();
  for (const [nomVue, largeur] of [['ordinateur', 1440], ['mobile', 390]]) {
    console.log(`\nAgenda et planning — ${nomVue} (${largeur} px) :`);
    const mobile = largeur < 600;
    const ctx = await b.newContext({ viewport: { width: largeur, height: mobile ? 844 : 900 }, isMobile: mobile, hasTouch: mobile, acceptDownloads: true, locale: 'fr-FR' });
    await ctx.route('**/*', r => (r.request().url().startsWith(BASE) || /fonts\.(googleapis|gstatic)\.com/.test(r.request().url()) ? r.continue() : r.abort()));
    await ctx.route('**/remplacements/config.js*', r => r.fulfill({ contentType: 'application/javascript', body: "window.RH_REMPLACEMENTS_CONFIG = { supabaseUrl: '', supabaseAnonKey: '' };" }));
    const p = await ctx.newPage();
    const erreurs = [];
    p.on('pageerror', e => erreurs.push(e.message));
    p.on('response', r => { if (r.status() >= 400 && r.url().startsWith(BASE)) erreurs.push(`${r.status()} ${r.url()}`); });
    p.on('dialog', d => d.accept());
    const attendre = ms => p.waitForTimeout(ms);
    const capture = nom => p.screenshot({ path: path.join(SORTIE, `remplacements-${nomVue}-${nom}.png`), fullPage: true });
    const commeQui = async motif => { const v = await p.$$eval('#rp-demo-qui option', (os, m) => (os.find(o => o.textContent.includes(m)) || {}).value, motif); await p.selectOption('#rp-demo-qui', v); await attendre(900); };
    const panneau = () => p.locator('#rp-ag-panneau').innerText();
    const cellule = d => p.locator(`#rp-cal-agenda [data-date="${d}"]`);
    const moisAffiche = async () => (await p.locator('.rp-ag-mois h2').textContent()).trim();
    const allerMois = async libelle => { for (let i = 0; i < 4 && (await moisAffiche()) !== libelle; i++) { await p.click('[data-agmois="1"]'); await attendre(150); } };
    const debordement = () => p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);

    await p.goto(`${BASE}/remplacements.html`); await attendre(1300);
    ok('page publique : grand bandeau affiché avant connexion', await p.locator('.rp-hero').isVisible() && !(await p.evaluate(() => document.body.classList.contains('rp-connecte'))));
    const X = await preparer(p);

    /* ---------- Remplaçant ---------- */
    await commeQui('Amel TEST');
    ok('écran d\'arrivée du remplaçant : Agenda', (await p.locator('#rp-agenda').count()) === 1);
    ok('en-tête compact : grand bandeau masqué, fil d\'Ariane vers RadiologicHub', !(await p.locator('.rp-hero').isVisible()) && (await p.locator('.rp-fil a[href="index.html"]').count()) === 1);
    ok('barre compacte visible sous l\'en-tête fixe du site (rien ne la recouvre)', await p.evaluate(() => { window.scrollTo(0, 0); const a = document.querySelector('.rp-fil a'), r = a.getBoundingClientRect(); return document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) === a; }));
    ok('navigation du site conservée (menu principal ou bouton du menu)', mobile ? await p.locator('.nav-toggle').isVisible() : await p.locator('#main-nav a[href="communaute.html"]').isVisible());
    ok(mobile ? 'téléphone : navigation du bas (4 onglets), onglets du haut masqués' : 'ordinateur : onglets du haut, pas de navigation du bas',
      mobile ? (await p.locator('.rp-nav-bas a').count()) === 4 && await p.locator('.rp-nav-bas').isVisible() && !(await p.locator('.rp-onglets').isVisible()) : await p.locator('.rp-onglets').isVisible() && !(await p.locator('.rp-nav-bas').isVisible()));
    await allerMois(X.libelleMois);
    ok('changement de mois (›) jusqu\'au mois des missions', (await moisAffiche()) === X.libelleMois);
    await p.click('[data-agmois="1"]'); await attendre(150);
    const suivant = await moisAffiche();
    await p.click('[data-agmois="-1"]'); await attendre(150);
    ok('mois suivant puis retour (‹)', suivant !== X.libelleMois && (await moisAffiche()) === X.libelleMois);
    if (mobile) {
      const y = await p.locator('#rp-cal-agenda').evaluate(e => e.getBoundingClientRect().top + scrollY);
      const yDemo = await p.locator('#rp-demo').evaluate(e => e.getBoundingClientRect().height);
      ok('téléphone : le calendrier commence dans le premier écran (hors barre de démonstration)', y - yDemo < 844, `${Math.round(y)} px dont ${Math.round(yDemo)} px de barre de démonstration`);
    }
    const resume = await p.locator('.rp-ag-resume').innerText();
    ok('résumé : honoraires confirmés et potentiels distingués', resume.includes(`Confirmés ${X.confirmes}`) && resume.includes(`Potentiels ${X.potentiels}`), resume);
    ok('mission sur deux jours : « 1/2 » puis « 2/2 » dans la grille', /1\/2/.test(await cellule(X.L[0]).textContent()) && /2\/2/.test(await cellule(X.L[1]).textContent()));
    const c1 = await cellule(X.L[0]).locator('.rp-ev.is-mission').getAttribute('class'), c2 = await cellule(X.L[2]).locator('.rp-ev.is-mission').getAttribute('class').catch(() => '');
    ok('deux structures, deux couleurs distinctes et stables', X.a2auto ? c1.match(/rp-c-\w+/)[0] !== (c2.match(/rp-c-\w+/) || [''])[0] : true, `${c1} / ${c2}`);
    ok('symboles : ✓ mission, ? à répondre, … en attente, ● disponible', (await cellule(X.L[0]).locator('.rp-ev.is-mission b').innerText()) === '✓' && (await cellule(X.L[4]).locator('.rp-ev.is-a_repondre b').innerText()) === '?'
      && (await cellule(X.L[5]).locator('.rp-ev.is-en_attente b').innerText()) === '…' && (await p.locator('#rp-cal-agenda .rp-ev.is-disponible').count()) > 0);
    ok('libellés accessibles des jours (statut et structure)', /Mission confirmée — Clinique Les Orangers/.test(await cellule(X.L[0]).getAttribute('aria-label')));
    await capture('1-agenda');

    // une mission, plusieurs jours : sélection d'une date puis de l'autre depuis le détail
    await cellule(X.L[0]).click(); await attendre(250);
    let pan = await panneau();
    ok('détail : mission confirmée, jour 1 sur 2, les deux dates listées', /jour 1 sur 2/i.test(pan) && (await p.locator('#rp-ag-panneau .rp-ag-date').count()) === 2, pan.slice(0, 200));
    ok('l\'autre jour de la même mission est mis en évidence', (await cellule(X.L[1]).getAttribute('class')).includes('is-ag-lie'));
    if (mobile) ok('téléphone : le détail vient à l\'écran au toucher', await p.locator('#rp-ag-panneau').evaluate(e => { const r = e.getBoundingClientRect(); return r.top < innerHeight && r.bottom > 0; }));
    await p.locator(`#rp-ag-panneau .rp-ag-date[data-agjour="${X.L[1]}"]`).click(); await attendre(250);
    ok('depuis le détail, la seconde date ouvre la même mission (jour 2 sur 2)', /jour 2 sur 2/i.test(await panneau()));
    await capture('2-detail-mission');

    // filtre par structure
    if (X.a2auto) {
      const lac = p.locator('.rp-ag-filtre', { hasText: 'Lac' });
      await lac.click(); await attendre(200);
      const masque = (await cellule(X.L[2]).locator('.rp-ev.is-mission').count()) === 0;
      await p.locator('.rp-ag-filtre', { hasText: 'Lac' }).click(); await attendre(200);
      ok('filtre par structure : masquer puis réafficher le Cabinet Radio du Lac', masque && (await cellule(X.L[2]).locator('.rp-ev.is-mission').count()) === 1);
    }

    // export .ics du mois (toutes structures)
    const [dl] = await Promise.all([p.waitForEvent('download'), p.click('[data-act="ics-mois"]')]);
    const ics = fs.readFileSync(await dl.path(), 'utf8');
    ok('export .ics du mois : un seul calendrier, un événement par jour de mission', (ics.match(/BEGIN:VCALENDAR/g) || []).length === 1 && (ics.match(/BEGIN:VEVENT/g) || []).length === X.joursMission, `${(ics.match(/BEGIN:VEVENT/g) || []).length} / ${X.joursMission}`);

    // réponse à une proposition depuis le détail du jour
    await cellule(X.L[4]).click(); await attendre(250);
    ok('détail d\'une proposition : honoraires potentiels et boutons de réponse', /potentiels/i.test(await panneau()) && (await p.locator('#rp-ag-panneau [data-reponse="disponible"]').count()) === 1);
    await p.click('#rp-ag-panneau [data-reponse="disponible"]'); await attendre(900);
    ok('« Je suis disponible » : le jour passe « en attente du choix »', (await cellule(X.L[4]).locator('.rp-ev.is-en_attente').count()) === 1);

    // fiche détaillée de la mission
    await cellule(X.L[3]).click(); await attendre(250);
    await p.click('#rp-ag-panneau a[href^="#/mission/"]'); await attendre(700);
    ok('« Détails » ouvre la fiche existante de la mission', p.url().includes(`#/mission/${X.a3}`) && /Coordonnées de la structure/i.test(await p.locator('#rp-app').textContent()));
    if (mobile) ok('fiche mission : navigation du bas toujours présente', await p.locator('.rp-nav-bas').isVisible());
    await p.goBack(); await attendre(700);

    // annulation depuis l'agenda (moteur existant)
    await allerMois(X.libelleMois);
    await cellule(X.L[3]).click(); await attendre(250);
    await p.click('#rp-ag-panneau .rp-ag-annuler summary');
    await p.fill(`#f-motif-${X.a3}`, 'Test agenda : empêchement');
    await p.click(`#rp-ag-panneau [data-act="annuler"][data-did="${X.a3}"]`); await attendre(1000);
    const mailAnnul = await p.evaluate(() => window.RHRp.api.demo.boite().find(m => m.modele === 'annulation'));
    ok('annulation : la mission quitte l\'agenda, la structure est prévenue avec le motif', (await cellule(X.L[3]).locator('.rp-ev.is-mission').count()) === 0 && !!mailAnnul && /empêchement/.test(mailAnnul.html));

    // vue liste : une ligne par mission
    await p.click('[data-agvue="liste"]'); await attendre(250);
    const lignes = await p.locator(`.rp-ag-ligne[data-agjour="${X.L[0]}"]`).count();
    ok('vue liste : la mission de deux jours n\'apparaît qu\'une fois (« 2 jours »)', lignes === 1 && /2 jours/i.test(await p.locator(`.rp-ag-ligne[data-agjour="${X.L[0]}"]`).textContent()));
    await capture('3-liste');
    await p.click(`.rp-ag-ligne[data-agjour="${X.L[0]}"]`); await attendre(250);
    ok('une ligne de la liste ouvre le mois sur ce jour', (await p.locator('#rp-cal-agenda').count()) === 1 && (await cellule(X.L[0]).getAttribute('class')).includes('is-ag-sel'));
    ok('aucun défilement horizontal (agenda)', !(await debordement()));

    /* ---------- Structure ---------- */
    await commeQui('Clinique Les Orangers');
    ok('écran d\'arrivée de la clinique : Planning', (await p.locator('#rp-agenda').count()) === 1 && /Budget confirmé/.test(await p.locator('.rp-ag-resume').innerText()));
    await allerMois(X.libelleMois);
    ok('planning : jour avec volontaires (★) et jour confirmé (✓)', (await cellule(X.L[6]).locator('.rp-ev.is-volontaires').count()) === 1 && (await cellule(X.L[0]).locator('.rp-ev.is-confirmee').count()) === 1);
    await capture('4-planning');
    await cellule(X.libreClinique).click(); await attendre(250);
    pan = await panneau();
    ok('jour sans demande : « aucune demande publiée », jamais présenté comme un manque', /Aucune demande publiée/.test(pan) && !/manqu|pénurie|à pourvoir/i.test(pan));
    await cellule(X.L[6]).click(); await attendre(250);
    const nb = await p.locator('#rp-ag-panneau [data-act="choisir"]').count();
    await p.locator('#rp-ag-panneau [data-act="choisir"]').first().click(); await attendre(1000);
    ok('choisir un volontaire depuis le planning : le jour devient confirmé', nb > 0 && (await cellule(X.L[6]).locator('.rp-ev.is-confirmee').count()) === 1);
    await cellule(X.L[0]).click(); await attendre(250);
    await p.click('#rp-ag-panneau .rp-ag-annuler summary');
    await p.click(`#rp-ag-panneau [data-act="annuler"][data-did="${X.a1}"]:not([data-definitif])`); await attendre(1000);
    ok('annuler un remplacement depuis le planning : demande remise en ligne', (await cellule(X.L[0]).locator('.rp-ev.is-confirmee').count()) === 0 && (await cellule(X.L[0]).locator('.rp-ev.is-volontaires, .rp-ev.is-recherche').count()) === 1);
    await cellule(X.libreClinique).click(); await attendre(250);
    await p.click('[data-act="demande-jour"]'); await attendre(700);
    ok('« Publier une demande pour ce jour » ouvre le formulaire avec la date', p.url().endsWith('#/espace/nouvelle') && (await p.locator(`#rp-cal-demande [data-date="${X.libreClinique}"].is-choisi`).count()) === 1);
    ok('aucun défilement horizontal (planning)', !(await debordement()));
    if (mobile) { await p.goBack(); await attendre(700); await capture('5-planning-detail'); }
    ok('aucune erreur JavaScript ni fichier manquant', erreurs.length === 0, erreurs.join(' | '));
    await ctx.close();
  }
  await b.close(); srv.close();
  const echecs = resultats.filter(r => !r.ok).length;
  console.log(`\n# ${echecs ? `fail ${echecs}` : 'pass'} (${resultats.length} vérifications)`);
  process.exit(echecs ? 1 : 0);
})();
