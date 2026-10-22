#!/usr/bin/env node
'use strict';
/* =========================================================
   Test d'intégration de l'Espace DICOM dans Docker (npm run test:dicom).
   Démarre la pile complète (Nginx, dicom-api, Orthanc, PostgreSQL) avec
   une simulation de Supabase (PostgreSQL + PostgREST, migrations du
   dépôt), charge des scanners SYNTHÉTIQUES et vérifie :
   • Orthanc injoignable de l'extérieur, et sans accès à Internet ;
   • compression sans perte JPEG-LS (pixels identiques à l'original) ;
   • chaque requête d'images refusée sans session ou sans droit, y compris
     servie depuis le cache ; recherches sans filtre refusées ;
   • rôles : radiologue, membre, résident validé, autre structure ;
   • gzip, cache, en-têtes de sécurité, limitation de débit, journal.
   Options : --garder (laisse la pile tourner pour l'explorer).
   Nécessite Docker ; ignoré sinon.
   ========================================================= */
const { execFileSync, spawnSync } = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const https = require('node:https');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const zlib = require('node:zlib');
const { genererEtude, pixelsCoupe } = require('../outils/generer-dicom-test.js');

const RACINE = path.join(__dirname, '..');
const GARDER = process.argv.includes('--garder');
const PROJET = 'rh-dicom-test';
const DOMAINE = 'dicom.test.localhost';

function dockerDisponible() {
  return spawnSync('docker', ['info'], { stdio: 'ignore' }).status === 0;
}
if (!dockerDisponible()) { console.log('Docker absent ou arrêté : test d\'intégration de l\'Espace DICOM ignoré.'); process.exit(0); }

let echecs = 0, reussis = 0;
const ok = (nom, cond, detail = '') => {
  console.log(`  ${cond ? '✓' : '✗'} ${nom}${cond || !detail ? '' : ' — ' + detail}`);
  if (cond) reussis++; else echecs++;
};

const portLibre = () => new Promise(r => { const s = net.createServer().listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)); }); });
const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
const jwt = (charge, secret) => { const t = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64(charge)}`; return `${t}.${crypto.createHmac('sha256', secret).update(t).digest('base64url')}`; };
const attendre = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rh-dicom-'));
  const secretJwt = crypto.randomBytes(32).toString('hex');
  const [portHttp, portHttps] = [await portLibre(), await portLibre()];
  const env = {
    DICOM_DOMAINE: DOMAINE,
    DICOM_URL_PUBLIQUE: `https://${DOMAINE}:${portHttps}`,
    DICOM_SITE_ORIGINES: 'https://site.test.localhost',
    PUBLIER_SUR: '127.0.0.1', PORT_HTTP: portHttp, PORT_HTTPS: portHttps,
    DONNEES_DIR: path.join(tmp, 'donnees'), CERTS_DIR: path.join(tmp, 'certs'), DONNEES_TEST_DIR: path.join(tmp, 'donnees-test'),
    DICOM_CACHE_TAILLE: '1g',
    SUPABASE_URL: '', SUPABASE_JWT_SECRET: secretJwt,
    SUPABASE_CLE_PUBLIQUE: jwt({ role: 'anon', exp: 4102444800 }, secretJwt),
    SUPABASE_CLE_SERVICE: jwt({ role: 'service_role', exp: 4102444800 }, secretJwt),
    DROITS_CACHE_SECONDES: 1,
    ORTHANC_UTILISATEUR: 'dicomapi', ORTHANC_MOT_DE_PASSE: crypto.randomBytes(16).toString('hex'),
    ORTHANC_DB_MOT_DE_PASSE: crypto.randomBytes(16).toString('hex'),
    SIMULATION_MOT_DE_PASSE: crypto.randomBytes(16).toString('hex'),
  };
  fs.writeFileSync(path.join(tmp, '.env'), Object.entries(env).map(([k, v]) => `${k}=${v}`).join('\n') + '\n');
  fs.mkdirSync(env.CERTS_DIR);
  execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '2', '-subj', `/CN=${DOMAINE}`, '-addext', `subjectAltName=DNS:${DOMAINE}`,
    '-keyout', path.join(env.CERTS_DIR, 'privkey.pem'), '-out', path.join(env.CERTS_DIR, 'fullchain.pem')], { stdio: 'pipe' });
  const ca = fs.readFileSync(path.join(env.CERTS_DIR, 'fullchain.pem'));

  // Scanners synthétiques : A (12 coupes) pour la clinique A, B (4 coupes) pour la clinique B
  const etudeA = genererEtude({ dossier: path.join(env.DONNEES_TEST_DIR, 'a'), coupes: 12, taille: 256, patientId: 'RH-TEST-A', graine: 7 });
  const etudeB = genererEtude({ dossier: path.join(env.DONNEES_TEST_DIR, 'b'), coupes: 4, taille: 128, patientId: 'RH-TEST-B', graine: 8 });

  const compose = (args, options = {}) => execFileSync('docker', ['compose', '-p', PROJET, '--project-directory', RACINE,
    '-f', path.join(RACINE, 'docker-compose.yml'), '-f', path.join(RACINE, 'docker-compose.test.yml'), '--env-file', path.join(tmp, '.env'), ...args],
  { stdio: 'pipe', maxBuffer: 64 * 1024 * 1024, ...options }).toString();
  const sql = (requete, role = null) => {
    const script = role ? `begin; set local role ${role}; set local "request.jwt.claims" = '{"role":"${role}"}'; ${requete}; commit;` : requete;
    return compose(['exec', '-T', 'supabase-db', 'psql', '-U', 'postgres', '-qtA', '-v', 'ON_ERROR_STOP=1', '-c', script]).trim();
  };

  /* Requête HTTPS vers Nginx, avec le nom de domaine du certificat */
  const requete = (chemin, { jeton, methode = 'GET', enTetes = {}, hote = DOMAINE, port = portHttps } = {}) => new Promise((resoudre, rejeter) => {
    const req = https.request({ host: '127.0.0.1', port, servername: hote, path: chemin, method: methode, ca,
      headers: { host: `${hote}:${port}`, ...(jeton ? { authorization: `Bearer ${jeton}` } : {}), ...enTetes } }, res => {
      const morceaux = []; res.on('data', d => morceaux.push(d));
      res.on('end', () => resoudre({ statut: res.statusCode, enTetes: res.headers, corps: Buffer.concat(morceaux) }));
    });
    req.on('error', rejeter); req.setTimeout(30000, () => req.destroy(new Error('délai dépassé'))); req.end();
  });

  let pileDemarree = false, aExplorer = null;
  try {
    console.log('Espace DICOM : démarrage de la pile Docker (simulation de Supabase)…');
    const t0 = Date.now();
    pileDemarree = true;
    compose(['up', '-d', '--build', '--wait', '--wait-timeout', '300']);
    console.log(`  pile prête en ${Math.round((Date.now() - t0) / 1000)} s`);

    // ---------- Comptes fictifs (simulation de Supabase) ----------
    const util = email => sql(`insert into auth.users (email) values ('${email}') returning id`);
    const RAD = util('radiologue@test.tn'), SEC = util('secretariat@test.tn'), RES = util('resident@test.tn'), RADB = util('radiologue-b@test.tn'), X = util('inconnu@test.tn');
    sql(`insert into rp_remplacants (id, statut, affectation, etat) values ('${RAD}', 'specialiste', 'x', 'valide'), ('${RADB}', 'specialiste', 'x', 'valide');
         insert into rp_remplacants (id, statut, annee_residanat, affectation, etat) values ('${RES}', 'resident', 4, 'x', 'valide')`, 'service_role');
    const structure = (nom, resp) => sql(`insert into rp_structures (nom, type, adresse, ville, gouvernorat, contact_nom, telephone, email, etat, cree_par)
         values ('${nom}', 'clinique', '1 rue Test', 'Tunis', 'Tunis', 'Mme Test', '71000000', 'contact@test.tn', 'valide', '${resp}') returning id`, 'service_role').split('\n')[0];
    const A = structure('Clinique A', SEC), B = structure('Clinique B', RADB);
    sql(`insert into rp_membres (structure_id, profil_id) values ('${A}', '${RAD}'), ('${A}', '${RES}');
         insert into dc_residents (profil_id, structure_id, etat) values ('${RES}', '${A}', 'valide')`, 'service_role');
    const jeton = (id, email, extra = {}) => jwt({ sub: id, email, role: 'authenticated', aud: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600, ...extra }, secretJwt);
    const J = { RAD: jeton(RAD, 'radiologue@test.tn'), SEC: jeton(SEC, 'secretariat@test.tn'), RES: jeton(RES, 'resident@test.tn'), RADB: jeton(RADB, 'radiologue-b@test.tn'), X: jeton(X, 'inconnu@test.tn') };

    // ---------- Chargement des scanners synthétiques ----------
    const charger = (dossier, s, depose) => JSON.parse(compose(['exec', '-T', 'dicom-api', 'node', 'outils/charger-test.js', dossier, '--structure', s, '--depose-par', depose]).trim());
    const exA = charger('/donnees-test/a', A, RAD), exB = charger('/donnees-test/b', B, RADB);
    console.log('Orthanc et Supabase :');
    ok('scanners synthétiques chargés et enregistrés (12 + 4 coupes)', exA.instances === 12 && exB.instances === 4 && exA.etudeUid === etudeA.etudeUid);
    ok('Supabase ne contient que des identifiants techniques (aucun nom de patient)', !/SYNTHETIQUE|RH-TEST/.test(sql(`select row_to_json(e)::text from dc_examens e`)));

    // Requêtes à Orthanc depuis l'intérieur du conteneur dicom-api
    const orthanc = chemin => compose(['exec', '-T', 'dicom-api', 'node', '-e',
      `fetch('http://orthanc:8042${chemin}',{headers:{authorization:'Basic '+Buffer.from(process.env.ORTHANC_UTILISATEUR+':'+process.env.ORTHANC_MOT_DE_PASSE).toString('base64')}}).then(async r=>{process.stdout.write(Buffer.from(await r.arrayBuffer()).toString('base64'))})`]);
    const instancesA = JSON.parse(Buffer.from(orthanc(`/studies/${exA.orthancId}/instances`), 'base64').toString());
    const syntaxes = new Set(instancesA.map(i => Buffer.from(orthanc(`/instances/${i.ID}/metadata/TransferSyntax`), 'base64').toString()));
    ok('compression à l\'arrivée : JPEG-LS sans perte (1.2.840.10008.1.2.4.80)', syntaxes.size === 1 && syntaxes.has('1.2.840.10008.1.2.4.80'), [...syntaxes].join(', '));
    const tailleOriginale = fs.readdirSync(path.join(env.DONNEES_TEST_DIR, 'a')).reduce((s, f) => s + fs.statSync(path.join(env.DONNEES_TEST_DIR, 'a', f)).size, 0);
    ok(`taille stockée : ${Math.round(exA.octets / 1024)} Ko au lieu de ${Math.round(tailleOriginale / 1024)} Ko`, exA.octets < tailleOriginale / 2);
    // Pixels décodés par Orthanc identiques à ceux générés (sans perte)
    const premiere = instancesA.find(i => i.MainDicomTags.InstanceNumber === '5');
    const npy = Buffer.from(orthanc(`/instances/${premiere.ID}/frames/0/numpy`), 'base64');
    const longEntete = npy.readUInt16LE(8), entete = npy.subarray(10, 10 + longEntete).toString(), donnees = npy.subarray(10 + longEntete);
    const valeurs = /'<f4'/.test(entete) ? new Float32Array(donnees.buffer.slice(donnees.byteOffset, donnees.byteOffset + donnees.length))
      : new Uint16Array(donnees.buffer.slice(donnees.byteOffset, donnees.byteOffset + donnees.length));
    const attendu = pixelsCoupe(4, 12, 256, 7);
    const decalage = valeurs[0] - attendu[0];
    let differents = 0; for (let i = 0; i < attendu.length; i++) if (valeurs[i] - attendu[i] !== decalage) differents++;
    ok('sans perte : les 65 536 pixels relus sont identiques aux pixels générés', valeurs.length === attendu.length && differents === 0 && [0, -1024].includes(decalage), `${differents} différents, décalage ${decalage}`);

    // ---------- Orthanc jamais exposé ----------
    console.log('Isolement d\'Orthanc :');
    const ports = compose(['ps', '--format', 'json']).trim().split('\n').map(l => JSON.parse(l)).flat();
    const publies = ports.filter(p => (p.Publishers || []).some(x => x.PublishedPort));
    ok('seul Nginx publie des ports', publies.length === 1 && publies[0].Service === 'nginx', publies.map(p => p.Service).join(', '));
    const internet = spawnSync('docker', ['compose', '-p', PROJET, '--project-directory', RACINE, '-f', path.join(RACINE, 'docker-compose.yml'), '-f', path.join(RACINE, 'docker-compose.test.yml'),
      '--env-file', path.join(tmp, '.env'), 'exec', '-T', 'orthanc', 'python3', '-c', "import urllib.request; urllib.request.urlopen('https://registry.npmjs.org', timeout=5)"], { stdio: 'pipe' });
    ok('Orthanc n\'a aucun accès à Internet (réseau interne)', internet.status !== 0);
    for (const chemin of ['/instances', '/system', '/tools/find', '/studies', '/dicom-web/studies', '/app/explorer.html', '/ui/app/']) {
      const r = await requete(chemin, { jeton: J.RAD });
      ok(`API d'Orthanc non joignable par Nginx : ${chemin} → ${r.statut}`, r.statut === 404);
    }
    const inconnu = await requete('/api/sante', { hote: 'autre.exemple' }).then(() => 'accepté', e => e.code || e.message);
    ok('nom de domaine inconnu : connexion TLS refusée', inconnu !== 'accepté', inconnu);

    // ---------- Droits sur les images ----------
    console.log('Droits sur les images (DICOMweb par Nginx) :');
    const qido = `/dicomweb/studies?StudyInstanceUID=${exA.etudeUid}`;
    ok('sans session : 401', (await requete(qido)).statut === 401);
    ok('jeton forgé (autre secret) : 401', (await requete(qido, { jeton: jwt({ sub: RAD, role: 'authenticated', aud: 'authenticated', exp: 4102444800 }, 'faux') })).statut === 401);
    ok('jeton expiré : 401', (await requete(qido, { jeton: jeton(RAD, 'radiologue@test.tn', { exp: Math.floor(Date.now() / 1000) - 3600 }) })).statut === 401);
    ok('compte sans rôle : 403', (await requete(qido, { jeton: J.X })).statut === 403);
    ok('radiologue d\'une autre structure : 403', (await requete(qido, { jeton: J.RADB })).statut === 403);
    let r = await requete(qido, { jeton: J.RAD });
    const etudes = r.statut === 200 ? JSON.parse(r.corps) : [];
    ok('radiologue de la structure : l\'étude est trouvée', r.statut === 200 && etudes.length === 1 && etudes[0]['0020000D'].Value[0] === exA.etudeUid, `${r.statut}`);
    ok('membre de la structure (secrétariat) : 200', (await requete(qido, { jeton: J.SEC })).statut === 200);
    ok('résident validé de la structure : 200', (await requete(qido, { jeton: J.RES })).statut === 200);
    ok('recherche sans filtre d\'étude : 403', (await requete('/dicomweb/studies', { jeton: J.RAD })).statut === 403);
    ok('recherche par nom de patient : 403', (await requete('/dicomweb/studies?PatientName=TEST*', { jeton: J.RAD })).statut === 403);
    ok('écriture (STOW-RS) : refusée', [403, 405].includes((await requete(`/dicomweb/studies/${exA.etudeUid}`, { jeton: J.RAD, methode: 'POST', enTetes: { 'content-type': 'multipart/related; type="application/dicom"' } })).statut));
    ok('suppression : refusée', [403, 405].includes((await requete(`/dicomweb/studies/${exA.etudeUid}`, { jeton: J.RAD, methode: 'DELETE' })).statut));
    ok('chemin détourné (../) : refusé', [400, 403, 404].includes((await requete(`/dicomweb/studies/${exA.etudeUid}/../../studies/${exB.etudeUid}/metadata`, { jeton: J.RAD })).statut));

    // Contournements : filtre d'une autre étude sous un chemin autorisé, série ou image de l'étude B sous le chemin de l'étude A
    r = await requete(`/dicomweb/studies/${exA.etudeUid}/series?StudyInstanceUID=${exB.etudeUid}`, { jeton: J.RAD });
    ok('filtre visant une autre étude sous un chemin autorisé : 403', r.statut === 403, `${r.statut}`);
    const metaB = JSON.parse((await requete(`/dicomweb/studies/${exB.etudeUid}/metadata`, { jeton: J.RADB })).corps);
    const serieB = metaB[0]['0020000E'].Value[0], sopB = metaB[0]['00080018'].Value[0];
    const croises = await Promise.all([
      `/dicomweb/studies/${exA.etudeUid}/series/${serieB}/metadata`,
      `/dicomweb/studies/${exA.etudeUid}/series/${serieB}/instances/${sopB}/metadata`,
      `/dicomweb/studies/${exA.etudeUid}/series/${serieB}/instances/${sopB}/frames/1`,
      `/dicomweb/studies/${exA.etudeUid}/series/${serieB}/instances/${sopB}/rendered`,
    ].map(c => requete(c, { jeton: J.RAD, enTetes: { accept: '*/*' } }).then(x => [c.split('/').slice(-1)[0], x.statut, x.corps.length])));
    ok('série ou image de l\'étude B demandée sous le chemin de l\'étude A : rien n\'est servi', croises.every(([, st, n]) => st === 404 || st === 400 || (st === 200 && n <= 2)), JSON.stringify(croises));

    r = await requete(`/dicomweb/studies/${exA.etudeUid}/metadata`, { jeton: J.RAD, enTetes: { 'accept-encoding': 'gzip' } });
    const meta = r.statut === 200 ? JSON.parse(r.enTetes['content-encoding'] === 'gzip' ? zlib.gunzipSync(r.corps) : r.corps) : [];
    ok('métadonnées de l\'étude (12 instances), compressées en gzip', r.statut === 200 && meta.length === 12 && r.enTetes['content-encoding'] === 'gzip', `${r.statut} ${r.enTetes['content-encoding']}`);
    const nomPatient = meta[0] && meta[0]['00100010'] && meta[0]['00100010'].Value[0].Alphabetic;
    ok('l\'identité du patient est servie par Orthanc (et seulement par lui)', nomPatient === 'TEST^SYNTHETIQUE');
    const serie = meta[0]['0020000E'].Value[0], sop = meta[0]['00080018'].Value[0];
    const bulk = JSON.stringify(meta).match(/"BulkDataURI":"([^"]+)"/);
    ok('adresses des données binaires : celles de Nginx en HTTPS (/dicomweb/)', !!bulk && bulk[1].startsWith(`https://${DOMAINE}:${portHttps}/dicomweb/`), bulk ? bulk[1] : 'aucune');

    const image = `/dicomweb/studies/${exA.etudeUid}/series/${serie}/instances/${sop}/frames/1`;
    const accept = { accept: 'multipart/related; type="application/octet-stream"; transfer-syntax=*' };
    r = await requete(image, { jeton: J.RAD, enTetes: accept });
    ok('image : servie dans sa syntaxe stockée (JPEG-LS)', r.statut === 200 && /transfer-syntax=1\.2\.840\.10008\.1\.2\.4\.80/.test(r.enTetes['content-type']), `${r.statut} ${r.enTetes['content-type']}`);
    ok('image : première requête lue dans Orthanc (MISS)', r.enTetes['x-cache'] === 'MISS', r.enTetes['x-cache']);
    r = await requete(image, { jeton: J.RAD, enTetes: accept });
    ok('image : requête suivante servie par le cache de Nginx (HIT)', r.enTetes['x-cache'] === 'HIT', r.enTetes['x-cache']);
    ok('image en cache : refusée sans session (401) et sans droit (403)', (await requete(image, { enTetes: accept })).statut === 401 && (await requete(image, { jeton: J.RADB, enTetes: accept })).statut === 403);
    ok('en-têtes de sécurité (HSTS, nosniff, no-referrer, frame-ancestors)', !!r.enTetes['strict-transport-security'] && r.enTetes['x-content-type-options'] === 'nosniff'
      && r.enTetes['referrer-policy'] === 'no-referrer' && /frame-ancestors 'self' https:\/\/site\.test\.localhost/.test(r.enTetes['content-security-policy'] || ''),
      JSON.stringify(r.enTetes));
    r = await requete(`/dicomweb/studies/${exA.etudeUid}/series/${serie}/instances/${sop}/rendered`, { jeton: J.RES, enTetes: { accept: 'image/png' } });
    ok('aperçu PNG pour le résident', r.statut === 200 && r.corps.subarray(1, 4).toString() === 'PNG');

    // Retrait du droit : effet après DROITS_CACHE_SECONDES (1 s ici), même pour une image en cache
    sql(`update rp_structures set etat = 'suspendu' where id = '${A}'`, 'service_role');
    await attendre(1500);
    ok('structure suspendue : ses membres n\'ont plus accès, même aux images en cache', (await requete(image, { jeton: J.SEC, enTetes: accept })).statut === 403
      && (await requete(qido, { jeton: J.RES })).statut === 403);
    sql(`update rp_structures set etat = 'valide' where id = '${A}'`, 'service_role');
    await attendre(1500);
    ok('structure revalidée : accès rétabli', (await requete(image, { jeton: J.SEC, enTetes: accept })).statut === 200);

    // ---------- API du site ----------
    console.log('API du site :');
    r = await requete('/api/moi', { jeton: J.RES, enTetes: { origin: 'https://site.test.localhost' } });
    const moi = r.statut === 200 ? JSON.parse(r.corps) : {};
    ok('/api/moi : rôle « resident » et sa structure', moi.role === 'resident' && moi.structures && moi.structures[0].nom === 'Clinique A', r.corps.toString().slice(0, 200));
    ok('/api/moi : CORS limité au site', r.enTetes['access-control-allow-origin'] === 'https://site.test.localhost');
    ok('/api/moi sans session : 401', (await requete('/api/moi')).statut === 401);
    r = await requete(`/`, {});
    ok('page d\'accueil sobre du serveur', r.statut === 200 && /Espace DICOM/.test(r.corps.toString()));
    // port HTTP : redirection vers l'adresse publique HTTPS
    const http = require('node:http');
    const redir = await new Promise(res => http.get({ host: '127.0.0.1', port: portHttp, path: '/x', headers: { host: DOMAINE } }, x => { x.resume(); res(x); }));
    ok('HTTP redirigé vers HTTPS (adresse du .env)', redir.statusCode === 301 && redir.headers.location === `${env.DICOM_URL_PUBLIQUE}/x`, redir.headers.location);
    const rafale = await Promise.all(Array.from({ length: 80 }, () => requete('/api/sante').then(x => x.statut)));
    ok(`limitation de débit : ${rafale.filter(s => s === 429).length} requêtes sur 80 refusées (429)`, rafale.includes(429) && rafale.includes(200));

    // ---------- Journal d'audit ----------
    await attendre(3000);
    const journal = sql(`select action || ':' || coalesce(acteur::text, '-') || ':' || coalesce(examen_id::text, '-') || ':' || coalesce(host(ip), '-') from dc_journal order by id`).split('\n');
    ok('journal : consultation notée (qui, quel examen, IP)', journal.some(l => l.startsWith(`consultation:${RAD}:${exA.examenId}:`) && !l.endsWith(':-')), journal.slice(0, 4).join(' | '));
    ok('journal : une seule ligne par personne et par examen malgré les nombreuses requêtes', journal.filter(l => l.startsWith(`consultation:${RAD}:`)).length === 1);
    ok('journal : accès refusé noté', journal.some(l => l.startsWith(`acces_refuse:${RADB}:`)));
    ok('journal : aucune identité de patient', !/SYNTHETIQUE|RH-TEST/.test(sql('select row_to_json(j)::text from dc_journal j')));

    // ---------- Mesures (indicatives, sur ce poste) ----------
    const t1 = Date.now(); await requete(`/dicomweb/studies/${exA.etudeUid}/series/${serie}/metadata`, { jeton: J.RAD, enTetes: { 'accept-encoding': 'gzip' } });
    const t2 = Date.now(); await requete(`/dicomweb/studies/${exA.etudeUid}/series/${serie}/instances/${meta[5]['00080018'].Value[0]}/frames/1`, { jeton: J.RAD, enTetes: accept });
    const t3 = Date.now();
    console.log(`  (mesure locale : métadonnées de la série ${t2 - t1} ms, première image ${t3 - t2} ms)`);
    aExplorer = { jeton: J.RAD, etude: exA.etudeUid };
  } catch (e) {
    echecs++;
    console.error(`✗ erreur : ${e.message}`);
    if (e.stderr) console.error(e.stderr.toString().slice(-3000));
    try { console.error(compose(['logs', '--tail', '40']).slice(-6000)); } catch { /* rien */ }
  } finally {
    if (GARDER) {
      console.log(`\nPile conservée (--garder) : https://${DOMAINE}:${portHttps}/  — dossier ${tmp}`);
      if (aExplorer) {
        console.log('Jeton du radiologue fictif (valable 1 h) et requête d\'exemple :');
        console.log(`  JETON=${aExplorer.jeton}`);
        console.log(`  curl --cacert ${path.join(env.CERTS_DIR, 'fullchain.pem')} --resolve ${DOMAINE}:${portHttps}:127.0.0.1 \\\n    -H "Authorization: Bearer $JETON" "https://${DOMAINE}:${portHttps}/dicomweb/studies?StudyInstanceUID=${aExplorer.etude}"`);
      }
      console.log(`Arrêt : docker compose -p ${PROJET} down -v`);
    } else {
      if (pileDemarree) { try { compose(['down', '-v', '--remove-orphans']); } catch { /* déjà arrêtée */ } }
      // fichiers créés par les conteneurs (autre propriétaire) : effacés par un conteneur
      spawnSync('docker', ['run', '--rm', '-v', `${tmp}:/d`, 'postgres:17.11-alpine3.24', 'sh', '-c', 'rm -rf /d/donnees /d/donnees-test'], { stdio: 'ignore' });
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  }
  console.log(`\n# pass ${reussis}${echecs ? `\n# fail ${echecs}` : ''}`);
  process.exit(echecs ? 1 : 0);
})();
