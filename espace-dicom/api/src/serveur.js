'use strict';
/* =========================================================
   dicom-api — serveur de l'Espace DICOM (réseau Docker interne).
   • GET /auth/dicomweb : appelé par Nginx (auth_request) avant CHAQUE
     requête d'images. Vérifie la session Supabase et le droit « voir »
     sur l'étude demandée, note la consultation au journal.
     204 : Nginx relaie à Orthanc ; 401 / 403 : refusé.
   • /api/… : API du site (CORS limité aux origines du fichier .env).
       GET /api/sante  état du service (sans détail) ;
       GET /api/moi    rôle et structures de l'utilisateur connecté.
   Les étapes suivantes (import, partage, télé-expertise) s'ajoutent ici.
   ========================================================= */
const http = require('node:http');
const { verifierJwt, creerJwks } = require('./jwt.js');
const { analyserDicomweb } = require('./dicomweb.js');

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function lireBearer(entete) {
  const m = /^Bearer\s+([A-Za-z0-9._-]+)$/.exec(String(entete || '').trim());
  return m ? m[1] : null;
}

function repondre(res, statut, corps = null, enTetes = {}) {
  const texte = corps === null ? '' : JSON.stringify(corps);
  res.writeHead(statut, {
    'cache-control': 'no-store',
    ...(corps === null ? {} : { 'content-type': 'application/json; charset=utf-8', 'content-length': Buffer.byteLength(texte) }),
    ...enTetes,
  });
  res.end(texte);
}

/* creerApp({ config, supabase, droits, journal, orthanc, verifier }) → gestionnaire HTTP
   verifier(jeton) → charge utile du JWT (injectable pour les tests). */
function creerApp({ config, supabase, droits, journal, orthanc, verifier, signaler = console.error }) {
  const origines = new Set(config.origines || []);

  async function utilisateur(req) {
    const jeton = lireBearer(req.headers.authorization);
    if (!jeton) return null;
    try {
      const charge = await verifier(jeton);
      if (charge.role !== 'authenticated' || !UUID.test(String(charge.sub || ''))) return null;
      return { id: charge.sub, jeton };
    } catch {
      return null;
    }
  }

  async function authDicomweb(req, res) {
    const a = analyserDicomweb({
      methode: String(req.headers['x-original-method'] || ''),
      chemin: String(req.headers['x-chemin'] || ''),
      requete: String(req.headers['x-requete'] || ''),
    });
    if (!a.ok) return repondre(res, 403);
    const u = await utilisateur(req);
    if (!u) return repondre(res, 401, null, { 'www-authenticate': 'Bearer' });
    const d = await droits.droitsEtude(u.jeton, a.etude);
    const ip = req.headers['x-real-ip'], navigateur = req.headers['user-agent'];
    if (!d || !d.droits.includes('voir')) {
      journal.unePar(`refus|${u.id}|${a.etude}`, { acteur: u.id, action: 'acces_refuse', ip, navigateur, details: { etude: a.etude } });
      return repondre(res, 403);
    }
    journal.unePar(`voir|${u.id}|${d.examenId}`, { acteur: u.id, examen_id: d.examenId, action: 'consultation', ip, navigateur });
    return repondre(res, 204, null, { 'x-examen': d.examenId });
  }

  async function api(req, res, chemin) {
    const origine = req.headers.origin;
    const cors = origine && origines.has(origine) ? {
      'access-control-allow-origin': origine,
      'access-control-allow-credentials': 'false',
      vary: 'Origin',
    } : {};
    if (req.method === 'OPTIONS') {
      if (!cors['access-control-allow-origin']) return repondre(res, 403);
      return repondre(res, 204, null, {
        ...cors,
        'access-control-allow-methods': 'GET, POST, PATCH, HEAD, DELETE, OPTIONS',
        'access-control-allow-headers': 'authorization, content-type, tus-resumable, upload-length, upload-offset, upload-metadata',
        'access-control-max-age': '600',
      });
    }
    if (chemin === '/api/sante' && req.method === 'GET') {
      const ok = await orthanc.sante();
      return repondre(res, ok ? 200 : 503, { ok }, cors);
    }
    if (chemin === '/api/moi' && req.method === 'GET') {
      const u = await utilisateur(req);
      if (!u) return repondre(res, 401, { erreur: 'Connexion nécessaire.' }, cors);
      const espace = await supabase.rpcUtilisateur('dc_mon_espace', u.jeton);
      if (!espace) return repondre(res, 401, { erreur: 'Session refusée.' }, cors);
      return repondre(res, 200, espace, cors);
    }
    return repondre(res, 404, { erreur: 'Introuvable.' }, cors);
  }

  return async function gerer(req, res) {
    const chemin = (req.url || '/').split('?')[0];
    try {
      if (chemin === '/auth/dicomweb' && req.method === 'GET') return await authDicomweb(req, res);
      if (chemin.startsWith('/api/')) return await api(req, res, chemin);
      return repondre(res, 404, { erreur: 'Introuvable.' });
    } catch (e) {
      signaler(`dicom-api : ${req.method} ${chemin} : ${e.message}`);
      if (!res.headersSent) repondre(res, 500, chemin.startsWith('/auth/') ? null : { erreur: 'Erreur du serveur.' });
      else res.destroy();
    }
  };
}

function demarrer() {
  const { lireConfig } = require('./config.js');
  const { creerSupabase, creerDroits } = require('./supabase.js');
  const { creerJournal } = require('./journal.js');
  const { creerOrthanc } = require('./orthanc.js');
  const config = lireConfig();
  const supabase = creerSupabase(config.supabase);
  const droits = creerDroits(supabase, { ttlMs: config.droitsCacheMs, ttlRefusMs: Math.min(10_000, config.droitsCacheMs) });
  const journal = creerJournal(supabase);
  const orthanc = creerOrthanc(config.orthanc);
  const cleDe = config.supabase.jwksUrl ? creerJwks(config.supabase.jwksUrl) : null;
  const verifier = jeton => verifierJwt(jeton, { secret: config.supabase.jwtSecret, cleDe });

  const serveur = http.createServer(creerApp({ config, supabase, droits, journal, orthanc, verifier }));
  serveur.keepAliveTimeout = 65_000;
  serveur.listen(config.port, () => console.log(`dicom-api : à l'écoute sur le port ${config.port}`));
  const arreter = async () => {
    serveur.close();
    await journal.arreter();
    process.exit(0);
  };
  process.on('SIGTERM', arreter);
  process.on('SIGINT', arreter);
}

if (require.main === module) demarrer();

module.exports = { creerApp, lireBearer };
