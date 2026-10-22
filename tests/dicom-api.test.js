/* Tests de dicom-api (Espace DICOM) : jetons, analyse des requêtes DICOMweb,
   cache des droits, journal, serveur. Sans Docker ni réseau. */
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const http = require('node:http');
const { verifierJwt, creerJwks } = require('../espace-dicom/api/src/jwt.js');
const { analyserDicomweb } = require('../espace-dicom/api/src/dicomweb.js');
const { creerDroits, enTetesService } = require('../espace-dicom/api/src/supabase.js');
const { creerJournal, normaliser } = require('../espace-dicom/api/src/journal.js');
const { creerApp, lireBearer } = require('../espace-dicom/api/src/serveur.js');
const { lireConfig } = require('../espace-dicom/api/src/config.js');

const b64 = o => Buffer.from(typeof o === 'string' ? o : JSON.stringify(o)).toString('base64url');
const SECRET = 'secret-de-test-pour-hs256-au-moins-32-caracteres';
const maintenant = Math.floor(Date.now() / 1000);
const UTIL = '5b0f8f7e-3a1c-4d2e-9f00-1234567890ab';
function signerHs(charge, secret = SECRET, alg = 'HS256') {
  const t = `${b64({ alg, typ: 'JWT' })}.${b64(charge)}`;
  return `${t}.${crypto.createHmac('sha256', secret).update(t).digest('base64url')}`;
}
const charge = (extra = {}) => ({ sub: UTIL, role: 'authenticated', aud: 'authenticated', exp: maintenant + 3600, ...extra });

test('JWT HS256 : accepté s\'il est signé, valable et destiné aux comptes', async () => {
  const c = await verifierJwt(signerHs(charge()), { secret: SECRET });
  assert.equal(c.sub, UTIL);
  await assert.rejects(verifierJwt(signerHs(charge(), 'autre-secret'), { secret: SECRET }), /signature invalide/);
  await assert.rejects(verifierJwt(signerHs(charge({ exp: maintenant - 120 })), { secret: SECRET }), /expiré/);
  await assert.rejects(verifierJwt(signerHs(charge({ exp: undefined })), { secret: SECRET }), /expiré/);
  await assert.rejects(verifierJwt(signerHs(charge({ aud: 'autre' })), { secret: SECRET }), /audience/);
  await assert.rejects(verifierJwt(signerHs(charge({ nbf: maintenant + 600 })), { secret: SECRET }), /pas encore/);
  await assert.rejects(verifierJwt('abc.def', { secret: SECRET }), /mal formé/);
  await assert.rejects(verifierJwt('', { secret: SECRET }), /absent/);
});

test('JWT : « alg: none » et algorithmes inconnus refusés ; HS256 refusé sans secret', async () => {
  const none = `${b64({ alg: 'none' })}.${b64(charge())}.`;
  await assert.rejects(verifierJwt(none, { secret: SECRET }), /algorithme refusé/);
  await assert.rejects(verifierJwt(signerHs(charge(), SECRET, 'HS512'), { secret: SECRET }), /algorithme refusé/);
  await assert.rejects(verifierJwt(signerHs(charge()), { secret: '' }), /non configuré/);
});

test('JWT ES256 et RS256 avec les clés publiques du projet (JWKS)', async () => {
  const ec = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' });
  const rsa = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const jwks = { keys: [
    { ...ec.publicKey.export({ format: 'jwk' }), kid: 'cle-ec', alg: 'ES256', use: 'sig' },
    { ...rsa.publicKey.export({ format: 'jwk' }), kid: 'cle-rsa', alg: 'RS256', use: 'sig' },
  ] };
  let appels = 0;
  const cleDe = creerJwks('https://exemple.supabase.co/auth/v1/.well-known/jwks.json', {
    fetch: async () => { appels++; return { ok: true, json: async () => jwks }; },
  });
  const signer = (alg, kid, cle) => {
    const t = `${b64({ alg, kid, typ: 'JWT' })}.${b64(charge())}`;
    const sig = crypto.sign('sha256', Buffer.from(t), alg === 'ES256' ? { key: cle, dsaEncoding: 'ieee-p1363' } : cle);
    return `${t}.${sig.toString('base64url')}`;
  };
  assert.equal((await verifierJwt(signer('ES256', 'cle-ec', ec.privateKey), { cleDe })).sub, UTIL);
  assert.equal((await verifierJwt(signer('RS256', 'cle-rsa', rsa.privateKey), { cleDe })).sub, UTIL);
  assert.equal(appels, 1, 'clés gardées en cache');
  // clé d'un autre type que l'algorithme annoncé, clé inconnue, signature d'une autre clé
  await assert.rejects(verifierJwt(signer('ES256', 'cle-rsa', ec.privateKey), { cleDe }), /clé inconnue/);
  await assert.rejects(verifierJwt(signer('ES256', 'inconnue', ec.privateKey), { cleDe }), /clé inconnue/);
  const autre = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' });
  await assert.rejects(verifierJwt(signer('ES256', 'cle-ec', autre.privateKey), { cleDe }), /signature invalide/);
  // un jeton HS256 forgé avec la clé publique comme secret (confusion d'algorithme) est refusé sans secret
  await assert.rejects(verifierJwt(signerHs(charge(), JSON.stringify(jwks.keys[0])), { cleDe }), /non configuré/);
});

test('DICOMweb : chemins sous une étude acceptés, avec son UID', () => {
  const E = '1.2.826.0.1.3680043.8.498.1', S = '1.2.3.4', I = '1.2.3.4.5';
  for (const chemin of [
    `/dicomweb/studies/${E}`, `/dicomweb/studies/${E}/`, `/dicomweb/studies/${E}/metadata`, `/dicomweb/studies/${E}/series`,
    `/dicomweb/studies/${E}/instances`, `/dicomweb/studies/${E}/rendered`, `/dicomweb/studies/${E}/thumbnail`,
    `/dicomweb/studies/${E}/series/${S}`, `/dicomweb/studies/${E}/series/${S}/metadata`, `/dicomweb/studies/${E}/series/${S}/instances`,
    `/dicomweb/studies/${E}/series/${S}/instances/${I}`, `/dicomweb/studies/${E}/series/${S}/instances/${I}/metadata`,
    `/dicomweb/studies/${E}/series/${S}/instances/${I}/frames/1`, `/dicomweb/studies/${E}/series/${S}/instances/${I}/frames/1,2,3`,
    `/dicomweb/studies/${E}/series/${S}/instances/${I}/frames/1/rendered`, `/dicomweb/studies/${E}/series/${S}/instances/${I}/thumbnail`,
    `/dicomweb/studies/${E}/series/${S}/instances/${I}/bulk/7fe00010`, `/dicomweb/studies/${E}/series/${S}/instances/${I}/bulk/00081140/1/00081155`,
  ]) {
    assert.deepEqual(analyserDicomweb({ methode: 'GET', chemin }), { ok: true, etude: E }, chemin);
  }
  assert.equal(analyserDicomweb({ methode: 'HEAD', chemin: `/dicomweb/studies/${E}/metadata` }).ok, true);
});

test('DICOMweb : recherche acceptée seulement limitée à une étude', () => {
  const E = '1.2.3';
  for (const [chemin, requete] of [['/dicomweb/studies', `StudyInstanceUID=${E}`], ['/dicomweb/studies', `0020000D=${E}&includefield=all`],
    ['/dicomweb/series', `StudyInstanceUID=${E}&Modality=CT`], ['/dicomweb/instances', `studyinstanceuid=${E}`]]) {
    assert.deepEqual(analyserDicomweb({ methode: 'GET', chemin, requete }), { ok: true, etude: E }, `${chemin}?${requete}`);
  }
  for (const requete of ['', 'PatientName=DUPONT*', `StudyInstanceUID=${E}&StudyInstanceUID=9.9`, `StudyInstanceUID=${E},9.9`, `StudyInstanceUID=${E}%5C9.9`,
    'StudyInstanceUID=*', `StudyInstanceUID=${E}&0020000D=9.9`, 'StudyInstanceUID=']) {
    assert.equal(analyserDicomweb({ methode: 'GET', chemin: '/dicomweb/studies', requete }).ok, false, requete);
  }
});

test('DICOMweb : sous une étude, un filtre ne peut pas viser une autre étude', () => {
  const E = '1.2.3';
  assert.equal(analyserDicomweb({ methode: 'GET', chemin: `/dicomweb/studies/${E}/series`, requete: 'StudyInstanceUID=9.9' }).ok, false);
  assert.equal(analyserDicomweb({ methode: 'GET', chemin: `/dicomweb/studies/${E}/instances`, requete: '0020000D=9.9' }).ok, false);
  assert.equal(analyserDicomweb({ methode: 'GET', chemin: `/dicomweb/studies/${E}/series`, requete: `StudyInstanceUID=${E}&Modality=CT` }).ok, true);
  assert.equal(analyserDicomweb({ methode: 'GET', chemin: `/dicomweb/studies/${E}/series`, requete: 'includefield=0008103E' }).ok, true);
});

test('DICOMweb : écriture, chemins détournés et autres routes refusés', () => {
  const E = '1.2.3';
  assert.equal(analyserDicomweb({ methode: 'POST', chemin: `/dicomweb/studies/${E}` }).ok, false, 'STOW-RS');
  assert.equal(analyserDicomweb({ methode: 'DELETE', chemin: `/dicomweb/studies/${E}` }).ok, false);
  for (const chemin of [
    '/dicomweb/', '/dicomweb/servers', '/dicomweb/info', `/dicomweb/studies/${E}/../../9.9`, `/dicomweb/studies/${E}//series`,
    '/dicomweb/studies/abc', '/dicomweb/studies/1..2', `/dicomweb/studies/${'1.'.repeat(40)}1`, `/dicomweb/studies/${E}/series/x`,
    `/dicomweb/studies/${E}/series/1.2/instances/1.3/frames/abc`, `/dicomweb/studies/${E}/series/1.2/instances/1.3/frames/`,
    `/dicomweb/studies/${E}/series/1.2/instances/1.3/bulk/../x`, `/dicomweb/studies/${E}/autre`, `/dicomweb/studies/${E}%2F..`,
    `/dicomweb/studies/${E};x=1`, '/instances', '/tools/find', `/dicomweb/studies/${E}/series/1.2/instances/1.3/frames/1/autre`,
    `/dicomweb/studies/${E}/series/1.2/instances/1.3/file`, undefined, '',
  ]) {
    assert.equal(analyserDicomweb({ methode: 'GET', chemin }).ok, false, chemin);
  }
});

test('droits : une seule question à Supabase par session et par étude pendant la durée du cache', async () => {
  let t = 0, appels = 0;
  const reponses = { '1.2.3': [{ examen_id: 'e1', orthanc_id: 'o1', droits: ['commenter', 'voir'] }], '9.9': [] };
  const supabase = { rpcUtilisateur: async (f, jeton, { uid }) => { appels++; assert.equal(f, 'dc_droits_etude'); await new Promise(r => setTimeout(r, 5)); return jeton === 'refuse' ? null : reponses[uid]; } };
  const d = creerDroits(supabase, { ttlMs: 60_000, ttlRefusMs: 10_000, horloge: () => t });
  const r = await Promise.all(Array.from({ length: 50 }, () => d.droitsEtude('jeton-a', '1.2.3')));
  assert.equal(appels, 1, '50 requêtes simultanées : une seule question');
  assert.deepEqual(r[0], { examenId: 'e1', orthancId: 'o1', droits: ['commenter', 'voir'] });
  await d.droitsEtude('jeton-b', '1.2.3');
  assert.equal(appels, 2, 'autre session : autre question');
  assert.equal(await d.droitsEtude('jeton-a', '9.9'), null);
  assert.equal(await d.droitsEtude('refuse', '1.2.3'), null);
  t = 11_000; await d.droitsEtude('jeton-a', '9.9');
  assert.equal(appels, 5, 'refus gardé 10 s seulement');
  t = 59_000; await d.droitsEtude('jeton-a', '1.2.3');
  assert.equal(appels, 5);
  t = 61_000; await d.droitsEtude('jeton-a', '1.2.3');
  assert.equal(appels, 6, 'droit revérifié après 60 s');
  const panne = creerDroits({ rpcUtilisateur: async () => { throw new Error('Supabase indisponible'); } });
  await assert.rejects(panne.droitsEtude('x', '1.2.3'), /indisponible/);
});

test('clé de service : nouvelle clé « secret » seule, ancienne clé JWT aussi en Authorization', () => {
  assert.deepEqual(enTetesService('sb_secret_abc'), { apikey: 'sb_secret_abc' });
  assert.deepEqual(enTetesService('eyJabc'), { apikey: 'eyJabc', authorization: 'Bearer eyJabc' });
});

test('journal : lignes complètes et une consultation par personne et par examen toutes les 10 min', async () => {
  assert.deepEqual(normaliser({ action: 'consultation', ip: 'pas-une-ip', navigateur: 'x'.repeat(400) }),
    { acteur: null, partage_id: null, passerelle_id: null, examen_id: null, action: 'consultation', ip: null, navigateur: 'x'.repeat(300), details: {} });
  let t = 0; const lots = [];
  const j = creerJournal({ inserer: async (table, lignes) => { assert.equal(table, 'dc_journal'); lots.push(lignes); } }, { intervalleMs: 60_000, horloge: () => t });
  for (let i = 0; i < 500; i++) j.unePar('voir|u1|e1', { acteur: 'u1', examen_id: 'e1', action: 'consultation', ip: '196.203.1.2' });
  j.unePar('voir|u2|e1', { acteur: 'u2', examen_id: 'e1', action: 'consultation', ip: '2001:db8::1' });
  t = 601_000; j.unePar('voir|u1|e1', { acteur: 'u1', examen_id: 'e1', action: 'consultation' });
  await j.arreter();
  assert.equal(lots.flat().length, 3);
  assert.equal(lots.flat()[1].ip, '2001:db8::1');
  // Supabase indisponible : les lignes restent en file pour un nouvel essai
  const j2 = creerJournal({ inserer: async () => { throw new Error('panne'); } }, { intervalleMs: 60_000, signaler: () => {} });
  j2.ajouter({ action: 'import' }); await j2.vider();
  assert.equal(j2.enAttente(), 1);
  await j2.arreter().catch(() => {});
});

test('configuration : tout vient du fichier .env ; erreurs claires', () => {
  const base = { ORTHANC_UTILISATEUR: 'u', ORTHANC_MOT_DE_PASSE: 'p', SUPABASE_URL: 'https://abc.supabase.co/', SUPABASE_CLE_PUBLIQUE: 'pub', SUPABASE_CLE_SERVICE: 'srv',
    DICOM_SITE_ORIGINES: 'https://nodbysmilii-prog.github.io http://localhost:8000/', DROITS_CACHE_SECONDES: '5' };
  const c = lireConfig(base);
  assert.equal(c.supabase.restUrl, 'https://abc.supabase.co/rest/v1');
  assert.equal(c.supabase.jwksUrl, 'https://abc.supabase.co/auth/v1/.well-known/jwks.json');
  assert.deepEqual(c.origines, ['https://nodbysmilii-prog.github.io', 'http://localhost:8000']);
  assert.equal(c.droitsCacheMs, 5000);
  assert.equal(lireConfig({ ...base, SUPABASE_REST_URL: 'http://postgrest:3000' }).supabase.restUrl, 'http://postgrest:3000');
  assert.throws(() => lireConfig({ ...base, SUPABASE_CLE_SERVICE: '' }), /SUPABASE_CLE_SERVICE manquante/);
  assert.throws(() => lireConfig({ ...base, SUPABASE_URL: '' }), /SUPABASE_URL manquante/);
  assert.equal(lireBearer('Bearer abc.def-ghi_j'), 'abc.def-ghi_j');
  assert.equal(lireBearer('Basic abc'), null);
});

test('serveur : relais des images (auth_request) et API du site', async () => {
  const E = '1.2.3', ENTREE = 'e0f8a3c2-0000-4000-8000-000000000001';
  const journal = [];
  const app = creerApp({
    config: { origines: ['https://site.exemple'] },
    verifier: jeton => verifierJwt(jeton, { secret: SECRET }),
    droits: { droitsEtude: async (jeton, uid) => (uid === E ? { examenId: ENTREE, orthancId: 'o', droits: ['commenter', 'voir'] } : null) },
    journal: { unePar: (cle, e) => journal.push(e) },
    orthanc: { sante: async () => true },
    supabase: { rpcUtilisateur: async (f) => (f === 'dc_mon_espace' ? { role: 'radiologue', structures: [] } : null) },
    signaler: () => {},
  });
  const serveur = http.createServer(app);
  await new Promise(r => serveur.listen(0, '127.0.0.1', r));
  const port = serveur.address().port;
  const appel = (chemin, enTetes = {}, methode = 'GET') => new Promise((ok, ko) => {
    const req = http.request({ host: '127.0.0.1', port, path: chemin, method: methode, headers: enTetes }, res => {
      let corps = ''; res.on('data', d => { corps += d; }); res.on('end', () => ok({ statut: res.statusCode, enTetes: res.headers, corps }));
    });
    req.on('error', ko); req.end();
  });
  const jeton = signerHs(charge());
  const auth = (chemin, extra = {}) => appel('/auth/dicomweb', { 'x-original-method': 'GET', 'x-chemin': chemin, 'x-requete': '', 'x-real-ip': '196.203.1.2', ...extra });
  try {
    assert.equal((await auth(`/dicomweb/studies/${E}/metadata`)).statut, 401, 'sans session');
    assert.equal((await auth(`/dicomweb/studies/${E}/metadata`, { authorization: `Bearer ${signerHs(charge(), 'faux')}` })).statut, 401, 'jeton forgé');
    assert.equal((await auth(`/dicomweb/studies/${E}/metadata`, { authorization: `Bearer ${signerHs(charge({ role: 'anon' }))}` })).statut, 401, 'jeton anonyme');
    const r = await auth(`/dicomweb/studies/${E}/metadata`, { authorization: `Bearer ${jeton}` });
    assert.equal(r.statut, 204);
    assert.equal(r.enTetes['x-examen'], ENTREE);
    assert.equal((await auth('/dicomweb/studies/9.9/metadata', { authorization: `Bearer ${jeton}` })).statut, 403, 'étude sans droit');
    assert.equal((await auth('/dicomweb/studies', { authorization: `Bearer ${jeton}` })).statut, 403, 'recherche sans filtre');
    assert.equal((await auth(`/dicomweb/studies/${E}`, { authorization: `Bearer ${jeton}`, 'x-original-method': 'POST' })).statut, 403, 'écriture');
    assert.deepEqual(journal.map(e => e.action), ['consultation', 'acces_refuse']);
    assert.equal(journal[0].ip, '196.203.1.2');

    const sante = await appel('/api/sante');
    assert.equal(sante.statut, 200); assert.deepEqual(JSON.parse(sante.corps), { ok: true });
    assert.equal((await appel('/api/moi')).statut, 401);
    const moi = await appel('/api/moi', { authorization: `Bearer ${jeton}`, origin: 'https://site.exemple' });
    assert.equal(JSON.parse(moi.corps).role, 'radiologue');
    assert.equal(moi.enTetes['access-control-allow-origin'], 'https://site.exemple');
    assert.equal(moi.enTetes['cache-control'], 'no-store');
    const pre = await appel('/api/moi', { origin: 'https://site.exemple', 'access-control-request-method': 'GET' }, 'OPTIONS');
    assert.equal(pre.statut, 204); assert.match(pre.enTetes['access-control-allow-headers'], /authorization/);
    assert.equal((await appel('/api/moi', { origin: 'https://pirate.exemple' }, 'OPTIONS')).statut, 403, 'origine inconnue');
    assert.equal((await appel('/api/moi', { origin: 'https://pirate.exemple', authorization: `Bearer ${jeton}` })).enTetes['access-control-allow-origin'], undefined);
    assert.equal((await appel('/autre')).statut, 404);
  } finally {
    serveur.close();
  }
});
