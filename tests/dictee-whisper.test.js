/* Dictée Whisper local : audio (16 kHz, WAV, découpage sur les pauses), service local
   (outils/whisper-local/service.py) avec un faux whisper-cli — aucun audio réel, aucun texte médical réel.
   Lancer : npm test   (ou : node --test tests/dictee-whisper.test.js) */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs'), os = require('os'), path = require('path');
const { spawn, execFileSync } = require('child_process');
const A = require('../dictee/audio.js');

const R = path.join(__dirname, '..');
const ton = (s, f = 220, a = 0.3, fe = 16000) => Float32Array.from({ length: Math.round(s * fe) }, (_, i) => a * Math.sin(2 * Math.PI * f * i / fe));
const silence = (s, fe = 16000) => new Float32Array(Math.round(s * fe));
const concat = (...l) => { const n = l.reduce((s, x) => s + x.length, 0), o = new Float32Array(n); let k = 0; l.forEach(x => { o.set(x, k); k += x.length; }); return o; };

test('rééchantillonnage 48 kHz → 16 kHz par morceaux, sans perte ni couture', () => {
  const r = new A.Reechantillonneur(48000);
  const src = ton(1, 440, 0.5, 48000);
  let n = 0;
  for (let i = 0; i < src.length; i += 4096) n += r.pousser(src.subarray(i, i + 4096)).length;
  assert.ok(Math.abs(n - 16000) <= 3, `${n} échantillons pour 1 s`);
});

test('WAV PCM 16 bits mono 16 kHz : en-tête exact', () => {
  const b = Buffer.from(A.wav(ton(0.5)));
  assert.equal(b.toString('ascii', 0, 4), 'RIFF'); assert.equal(b.toString('ascii', 8, 12), 'WAVE');
  assert.equal(b.readUInt16LE(20), 1); assert.equal(b.readUInt16LE(22), 1); assert.equal(b.readUInt32LE(24), 16000); assert.equal(b.readUInt16LE(34), 16);
  assert.equal(b.readUInt32LE(40), 8000 * 2); assert.equal(b.length, 44 + 16000);
});

test('silence et souffle : rien à transcrire ; parole : à transcrire', () => {
  assert.equal(A.aDeLaParole(silence(3)), false);
  const souffle = Float32Array.from({ length: 48000 }, () => (Math.random() - 0.5) * 0.004);
  assert.equal(A.aDeLaParole(souffle), false);
  assert.equal(A.aDeLaParole(concat(silence(1), ton(0.8), silence(1))), true);
});

test('découpage par segments : coupe dans les pauses, jamais en plein mot, aucun chevauchement', () => {
  const segs = [];
  const d = new A.Decoupeur({ surSegment: s => segs.push(s) });
  const audio = concat(silence(0.5), ton(1.2), silence(1), ton(0.9, 330), silence(0.3), ton(0.6, 330), silence(1.2), silence(2));
  for (let i = 0; i < audio.length; i += 1000) d.pousser(audio.subarray(i, i + 1000));
  d.vider();
  assert.equal(segs.length, 2, 'deux phrases séparées par une vraie pause ; une pause courte (0,3 s) ne coupe pas');
  const total = segs.reduce((s, x) => s + x.length, 0);
  assert.ok(total <= audio.length, 'pas de doublon');
  for (const s of segs) assert.ok(A.aDeLaParole(s));
});

test('segment trop long : coupé à l\'instant le plus calme, sans perdre d\'audio', () => {
  const segs = [];
  const d = new A.Decoupeur({ maxS: 6, surSegment: s => segs.push(s) });
  const audio = concat(ton(4.5), ton(0.06, 220, 0.03), ton(4.5), silence(1));
  for (let i = 0; i < audio.length; i += 2048) d.pousser(audio.subarray(i, i + 2048));
  d.vider();
  assert.ok(segs.length >= 2);
  const total = segs.reduce((s, x) => s + x.length, 0);
  assert.ok(total >= 9 * 16000 - 2 * 480, 'toute la parole est transmise');
});

test('raccord des segments et écho du contexte', () => {
  assert.equal(A.raccorder('le foie est de taille normale', 'taille normale et homogène'), 'et homogène');
  assert.equal(A.raccorder('le foie est', 'de taille normale'), 'de taille normale', 'rien à retirer');
  assert.equal(A.raccorder('', 'pas de lésion'), 'pas de lésion');
  assert.ok(A.echoDuContexte('Termes : verre dépoli, condensation', 'Compte rendu radiologique. Termes : verre dépoli, condensation, épanchement pleural.'));
  assert.ok(!A.echoDuContexte('absence de condensation', 'Termes : verre dépoli, condensation.'));
  assert.ok(!A.echoDuContexte('angioscanner thoracique normal', 'Compte rendu radiologique : angioscanner thoracique normal. Termes : hile.'), 'une phrase dictée qui reprend le titre est gardée');
});

/* ---------- Service local (Python), faux whisper-cli ---------- */
const PY = 'python3';
function preparerDossier() {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'rh-whisper-test-'));
  fs.mkdirSync(path.join(d, 'whisper.cpp', 'build', 'bin'), { recursive: true });
  fs.mkdirSync(path.join(d, 'modeles'));
  fs.writeFileSync(path.join(d, 'modeles', 'ggml-small.bin'), 'x');
  // faux whisper-cli : vérifie les options imposées, écrit un texte fixe, note le fichier audio reçu
  const faux = path.join(d, 'whisper.cpp', 'build', 'bin', 'whisper-cli');
  fs.writeFileSync(faux, `#!/usr/bin/env python3
import sys, os
a = sys.argv[1:]
assert a[a.index('-l') + 1] == 'fr' and '-tr' not in a and '--translate' not in a
f = a[a.index('-f') + 1]
open(os.environ['RH_TEST_TRACE'], 'a').write(f + '\\n')
if os.path.getsize(f) < 20000: print('   Sous-titres réalisés par la communauté d\\'Amara.org  ')
else: print(' Le foie est de taille normale. ')
`);
  fs.chmodSync(faux, 0o755);
  return d;
}
async function demarrer(d, port) {
  const p = spawn(PY, [path.join(R, 'outils/whisper-local/service.py'), '--dossier', d, '--port', String(port), '--site', 'non'],
    { env: { ...process.env, RH_TEST_TRACE: path.join(d, 'trace') }, stdio: ['ignore', 'pipe', 'pipe'] });
  let sortie = '';
  p.stdout.on('data', x => { sortie += x; });
  for (let i = 0; i < 50 && !sortie.includes('Ctrl+C'); i++) await new Promise(r => setTimeout(r, 100));
  return { p, sortie: () => sortie, jeton: fs.readFileSync(path.join(d, 'jeton'), 'utf8').trim() };
}

test('service local : boucle locale, origines, appairage, format, limites, journal sans texte, fichiers supprimés', async () => {
  const d = preparerDossier(), port = 18737;
  const s = await demarrer(d, port);
  const url = `http://127.0.0.1:${port}`, site = 'https://nodbysmilii-prog.github.io';
  try {
    assert.equal((fs.statSync(path.join(d, 'jeton')).mode & 0o777), 0o600, 'jeton lisible par l\'utilisateur seul');
    // état sans jeton : joignable mais non appairé, sans détail
    let r = await fetch(url + '/etat', { headers: { Origin: site } });
    assert.equal(r.status, 200);
    assert.equal(r.headers.get('access-control-allow-origin'), site);
    assert.deepEqual(await r.json(), { service: 'radiologichub-whisper', version: 1, appaire: false });
    // origine inconnue : refusée, aucun en-tête CORS
    r = await fetch(url + '/etat', { headers: { Origin: 'https://exemple.com' } });
    assert.equal(r.status, 403); assert.equal(r.headers.get('access-control-allow-origin'), null);
    // pré-vérification Chrome (accès réseau local)
    r = await fetch(url + '/transcrire', { method: 'OPTIONS', headers: { Origin: site, 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Private-Network': 'true' } });
    assert.equal(r.status, 204); assert.equal(r.headers.get('access-control-allow-private-network'), 'true');
    assert.notEqual(r.headers.get('access-control-allow-origin'), '*');
    // sans jeton / mauvais jeton
    const wav = Buffer.from(A.wav(concat(ton(1), silence(0.2))));
    r = await fetch(url + '/transcrire', { method: 'POST', body: wav, headers: { Origin: site } });
    assert.equal(r.status, 401);
    r = await fetch(url + '/transcrire', { method: 'POST', body: wav, headers: { Origin: site, Authorization: 'Bearer faux' } });
    assert.equal(r.status, 401);
    const auth = { Origin: site, Authorization: `Bearer ${s.jeton}`, 'Content-Type': 'audio/wav' };
    // état appairé
    r = await fetch(url + '/etat', { headers: auth });
    const e = await r.json();
    assert.equal(e.appaire, true); assert.equal(e.pret, true); assert.equal(e.modele, 'small');
    // transcription
    r = await fetch(url + '/transcrire', { method: 'POST', body: wav, headers: { ...auth, 'X-RH-Contexte': encodeURIComponent('Termes : foie') } });
    const t = await r.json();
    assert.equal(r.status, 200); assert.equal(t.texte, 'Le foie est de taille normale.');
    // texte de sous-titrage sur un enregistrement court : écarté
    r = await fetch(url + '/transcrire', { method: 'POST', body: Buffer.from(A.wav(ton(0.3))), headers: auth });
    assert.equal((await r.json()).texte, '');
    // format : un WebM renommé ou un WAV 44,1 kHz sont refusés
    r = await fetch(url + '/transcrire', { method: 'POST', body: Buffer.concat([Buffer.from([0x1a, 0x45, 0xdf, 0xa3]), Buffer.alloc(2000)]), headers: auth });
    assert.equal(r.status, 415);
    const w44 = Buffer.from(A.wav(ton(0.5))); w44.writeUInt32LE(44100, 24);
    r = await fetch(url + '/transcrire', { method: 'POST', body: w44, headers: auth });
    assert.equal(r.status, 415);
    // taille : plus de 2 minutes refusées avant lecture
    r = await fetch(url + '/transcrire', { method: 'POST', body: Buffer.alloc(44 + 121 * 32000), headers: auth });
    assert.equal(r.status, 413);
    // Host forgé (rebinding DNS)
    const brut = execFileSync('curl', ['-s', '-o', '/dev/null', '-w', '%{http_code}', '-H', 'Host: attaque.example', url + '/etat']).toString();
    assert.equal(brut, '403');
    // fichiers temporaires supprimés, journal sans texte
    const recus = fs.readFileSync(path.join(d, 'trace'), 'utf8').trim().split('\n');
    assert.equal(recus.length, 2);
    for (const f of recus) assert.ok(!fs.existsSync(f), 'fichier audio temporaire supprimé');
    assert.doesNotMatch(s.sortie(), /foie|Amara/i, 'aucun texte transcrit dans le journal');
    assert.match(s.sortie(), /audio 1\.2 s/);
  } finally { s.p.kill('SIGINT'); await new Promise(r => s.p.on('exit', r)); }
  // service arrêté : le site reçoit une erreur réseau (message « service arrêté » côté page)
  await assert.rejects(fetch(url + '/etat'));
});

test('service local : écoute sur 127.0.0.1 uniquement ; modèles anglais refusés ; rien dans Git', () => {
  const src = fs.readFileSync(path.join(R, 'outils/whisper-local/service.py'), 'utf8');
  assert.match(src, /ThreadingHTTPServer\(\('127\.0\.0\.1', a\.port\)/);
  assert.doesNotMatch(src, /0\.0\.0\.0|Allow-Origin', '\*'/);
  assert.doesNotMatch(src, /urlopen|requests\.|http\.client/, 'aucun appel sortant');
  const r = require('child_process').spawnSync(PY, [path.join(R, 'outils/whisper-local/service.py'), '--modele', 'small.en', '--dossier', fs.mkdtempSync(path.join(os.tmpdir(), 'rh-w-'))]);
  assert.notEqual(r.status, 0);
  const inst = fs.readFileSync(path.join(R, 'outils/whisper-local/installer.sh'), 'utf8');
  assert.match(inst, /VERSION_WHISPER="v\d+\.\d+\.\d+"/);
  assert.doesNotMatch(inst.split('\n').filter(l => !l.trim().startsWith('#')).join('\n'), /\bsudo\b/, 'aucune commande sudo');
  assert.match(fs.readFileSync(path.join(R, '.gitignore'), 'utf8'), /\*\.bin/);
});

test('page : moteur Whisper local proposé, ancien moteur conservé, aucun service externe', () => {
  const html = fs.readFileSync(path.join(R, 'comptes-rendus.html'), 'utf8');
  assert.ok(html.indexOf('dictee/audio.js') < html.indexOf('dictee/moteurs.js'));
  for (const id of ['dt-whisper', 'dt-w-adresse', 'dt-w-jeton', 'dt-w-mode', 'dt-w-tester', 'dt-w-badge', 'dt-brut']) assert.match(html, new RegExp(`id="${id}"`));
  global.self = { navigator: {} }; global.self.RHDictee = { audio: A };
  delete require.cache[require.resolve('../dictee/moteurs.js')];
  require('../dictee/moteurs.js');
  const M = global.self.RHDictee.moteurs;
  assert.deepEqual(M.liste().map(m => m.id), ['webspeech', 'whisper-local']);
  assert.equal(M.defaut, 'webspeech');
  const src = fs.readFileSync(path.join(R, 'dictee/moteurs.js'), 'utf8');
  assert.doesNotMatch(src.slice(src.indexOf('V2 : Whisper local')), /openai|api\.|https:\/\//i, 'Whisper local : aucune adresse externe');
  delete global.self;
});
