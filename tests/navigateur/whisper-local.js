/* Dictée Whisper local, de bout en bout dans Chromium (Playwright) :
   faux micro (fichier WAV injecté par Chromium) → capture et conversion 16 kHz dans la page →
   service local réel (outils/whisper-local/service.py) → whisper-cli (FAUX ici si aucun modèle n'est
   installé, VRAI si RH_WHISPER_DIR pointe une installation) → insertion dans le compte rendu.
   La page est servie en HTTPS (certificat local) pour vérifier l'accès HTTPS → 127.0.0.1.
   Usage : node tests/navigateur/whisper-local.js <parole.wav> <silence.wav> <cert.pem> <cle.pem> */
const { chromium } = require('playwright');
const https = require('https'), fs = require('fs'), path = require('path'), os = require('os');
const { spawn } = require('child_process');

const R = path.join(__dirname, '..', '..');
const [PAROLE, SILENCE, CERT, CLE] = process.argv.slice(2);
const PORT = 8737, SITE = 'https://localhost:8443';
const attendre = ms => new Promise(r => setTimeout(r, ms));
let ok = 0, ko = 0;
const verifier = (c, m) => { console.log((c ? 'ok    ' : 'ÉCHEC ') + m); c ? ok++ : ko++; };

function dossierFaux() {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'rh-whisper-e2e-'));
  fs.mkdirSync(path.join(d, 'whisper.cpp', 'build', 'bin'), { recursive: true });
  fs.mkdirSync(path.join(d, 'modeles'));
  fs.writeFileSync(path.join(d, 'modeles', 'ggml-small.bin'), 'x');
  const f = path.join(d, 'whisper.cpp', 'build', 'bin', 'whisper-cli');
  fs.writeFileSync(f, `#!/usr/bin/env python3
import sys, os, wave
a = sys.argv[1:]
w = wave.open(a[a.index('-f') + 1]); d = w.getnframes() / w.getframerate()
assert w.getframerate() == 16000 and w.getnchannels() == 1 and w.getsampwidth() == 2
open(os.path.join(os.path.dirname(__file__), 'appels'), 'a').write(f'{d:.2f}\\n')
print(' le foie est de taille normale ' if d > 2.5 else ' sans épanchement ')
`);
  fs.chmodSync(f, 0o755);
  return d;
}

(async () => {
  const dossier = process.env.RH_WHISPER_DIR || dossierFaux();
  const service = () => spawn('python3', [path.join(R, 'outils/whisper-local/service.py'), '--dossier', dossier, '--port', String(PORT), '--origine', SITE],
    { stdio: ['ignore', 'pipe', 'inherit'] });
  let svc = service(); await attendre(1200);
  const jeton = fs.readFileSync(path.join(dossier, 'jeton'), 'utf8').trim();
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg' };
  const web = https.createServer({ cert: fs.readFileSync(CERT), key: fs.readFileSync(CLE) }, (q, r) => {
    const f = path.join(R, decodeURIComponent(q.url.split('?')[0]));
    fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); r.end(d); });
  }).listen(8443);

  async function page(fichier, mode) {
    const nav = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-audio-capture=${fichier}`] });
    const ctx = await nav.newContext({ ignoreHTTPSErrors: true, permissions: ['microphone'] });
    const p = await ctx.newPage();
    p.on('pageerror', e => verifier(false, 'erreur JS : ' + e.message));
    await p.goto(SITE + '/comptes-rendus.html');
    await p.evaluate(([j, m]) => localStorage.setItem('rh-dictee', JSON.stringify({ moteur: 'whisper-local', whisperJeton: j, whisperMode: m })), [jeton, mode]);
    await p.reload(); await attendre(800);
    return { nav, p };
  }
  const editeur = p => p.evaluate(() => window.RHEditor.el.value);
  const ecrire = (p, t) => p.evaluate(t => { const e = window.RHEditor.el; e.value = t; e.focus(); e.setSelectionRange(t.length, t.length); e.dispatchEvent(new Event('input', { bubbles: true })); }, t);

  try {
    // 1. Après l'arrêt : état, insertion sans écraser, texte brut, annulation
    let { nav, p } = await page(PAROLE, 'arret');
    const badge = await p.textContent('#dt-w-badge');
    verifier(/prêt \(small/.test(badge), `état affiché depuis une page HTTPS : « ${badge} »`);
    await ecrire(p, 'Texte saisi à la main.');
    await p.click('#dt-mic'); await attendre(5200); await p.click('#dt-mic');
    for (let i = 0; i < 40 && !/foie/.test(await editeur(p)); i++) await attendre(250);
    let v = await editeur(p);
    verifier(v.startsWith('Texte saisi à la main.') && /foie est de taille normale/i.test(v), `insertion après l'arrêt, texte existant conservé : « ${v.replace(/\n/g, ' ')} »`);
    verifier(/le foie est de taille normale/.test(await p.textContent('#dt-brut-texte')), 'texte brut de Whisper consultable');
    await p.click('#cr-undo'); await attendre(300);
    verifier((await editeur(p)) === 'Texte saisi à la main.', '« ↶ Retour » annule la dernière insertion');
    // enregistrements successifs
    for (let k = 0; k < 2; k++) { await p.click('#dt-mic'); await attendre(5200); await p.click('#dt-mic'); await attendre(2500); }
    v = await editeur(p);
    verifier((v.match(/(foie|épanchement)/gi) || []).length === 2 && v.startsWith('Texte saisi à la main.'), `deux enregistrements successifs, deux insertions : « ${v.replace(/\n/g, ' ')} »`);
    await nav.close();

    // 2. Par segments : une insertion par phrase, dans l'ordre
    fs.rmSync(path.join(dossier, 'whisper.cpp', 'build', 'bin', 'appels'), { force: true });
    ({ nav, p } = await page(PAROLE, 'segments'));
    await ecrire(p, '');
    await p.click('#dt-mic'); await attendre(4600); await p.click('#dt-mic'); await attendre(2500);
    v = await editeur(p);
    const appels = fs.existsSync(path.join(dossier, 'whisper.cpp', 'build', 'bin', 'appels')) ? fs.readFileSync(path.join(dossier, 'whisper.cpp', 'build', 'bin', 'appels'), 'utf8').trim().split('\n') : [];
    verifier(appels.length >= 2, `segments envoyés à chaque pause : ${appels.length} (durées ${appels.join(', ')} s)`);
    verifier(v.trim().length > 0, `texte inséré segment par segment : « ${v.replace(/\n/g, ' ')} »`);
    await nav.close();

    // 3. Silence : rien n'est envoyé ni inséré
    fs.rmSync(path.join(dossier, 'whisper.cpp', 'build', 'bin', 'appels'), { force: true });
    ({ nav, p } = await page(SILENCE, 'arret'));
    await ecrire(p, 'Avant.');
    await p.click('#dt-mic'); await attendre(3000); await p.click('#dt-mic'); await attendre(1500);
    verifier((await editeur(p)) === 'Avant.' && !fs.existsSync(path.join(dossier, 'whisper.cpp', 'build', 'bin', 'appels')), 'silence : aucun envoi, aucun texte inventé');

    // 4. Service arrêté : message clair, pas d'autre moteur
    svc.kill('SIGINT'); await attendre(800);
    await p.click('#dt-mic'); await attendre(1500);
    const msg = await p.textContent('#dt-msg');
    verifier(/injoignable/.test(msg) && (await editeur(p)) === 'Avant.', `service arrêté : « ${msg.slice(0, 80)}… »`);
    await p.evaluate(() => document.getElementById('dt-w-tester').click()); await attendre(500);
    verifier(/service arrêté/.test(await p.textContent('#dt-w-badge')), 'état « service arrêté » affiché');
    await nav.close();

    // 5. Mauvais code d'appairage
    svc = service(); await attendre(1200);
    ({ nav, p } = await page(PAROLE, 'arret'));
    await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('rh-dictee')); s.whisperJeton = 'faux'; localStorage.setItem('rh-dictee', JSON.stringify(s)); });
    await p.reload(); await attendre(800);
    verifier(/appairage requis/.test(await p.textContent('#dt-w-badge')), 'mauvais code : « appairage requis »');
    await p.screenshot({ path: path.join(R, 'tests/navigateur/captures/whisper-local.png') }).catch(() => {});
    await nav.close();
  } finally {
    svc.kill('SIGINT'); web.close();
  }
  console.log(`\n${ok} / ${ok + ko} vérifications réussies`);
  process.exit(ko ? 1 : 0);
})();
