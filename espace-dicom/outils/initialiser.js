#!/usr/bin/env node
'use strict';
/* =========================================================
   Prépare l'Espace DICOM sur une machine (poste local ou VPS) :
   1. crée .env à partir de .env.example, avec des secrets aléatoires
      (mots de passe internes d'Orthanc et de sa base) ;
   2. crée les dossiers de données ;
   3. crée un certificat auto-signé pour le domaine du .env s'il n'y a
      pas encore de certificat (développement local ; en production :
      Let's Encrypt, voir README.md).
   Ne remplace jamais un .env ou un certificat existant.
   Usage : node outils/initialiser.js                 (avec un projet Supabase)
           node outils/initialiser.js --simulation    (sans Supabase : simulation
             locale, à lancer avec docker-compose.test.yml — voir README.md)
   ========================================================= */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');

const racine = path.join(__dirname, '..');
const fichierEnv = path.join(racine, '.env');

function lireEnv(texte) {
  const v = {};
  for (const ligne of texte.split('\n')) {
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(ligne.trim());
    if (m) v[m[1]] = m[2].trim();
  }
  return v;
}

const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
function jwtHs256(charge, secret) {
  const t = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64(charge)}`;
  return `${t}.${crypto.createHmac('sha256', secret).update(t).digest('base64url')}`;
}

function creerEnv(simulation) {
  if (fs.existsSync(fichierEnv)) { console.log('.env existe déjà : conservé.'); return; }
  const secret = () => crypto.randomBytes(24).toString('hex');
  let texte = fs.readFileSync(path.join(racine, '.env.example'), 'utf8')
    .replace(/^ORTHANC_MOT_DE_PASSE=.*$/m, `ORTHANC_MOT_DE_PASSE=${secret()}`)
    .replace(/^ORTHANC_DB_MOT_DE_PASSE=.*$/m, `ORTHANC_DB_MOT_DE_PASSE=${secret()}`);
  if (simulation) {
    // Simulation locale de Supabase (PostgreSQL + PostgREST) : clés signées avec un secret local
    const jwtSecret = crypto.randomBytes(32).toString('hex');
    texte = texte
      .replace(/^SUPABASE_JWT_SECRET=.*$/m, `SUPABASE_JWT_SECRET=${jwtSecret}`)
      .replace(/^SUPABASE_CLE_PUBLIQUE=.*$/m, `SUPABASE_CLE_PUBLIQUE=${jwtHs256({ role: 'anon', exp: 4102444800 }, jwtSecret)}`)
      .replace(/^SUPABASE_CLE_SERVICE=.*$/m, `SUPABASE_CLE_SERVICE=${jwtHs256({ role: 'service_role', exp: 4102444800 }, jwtSecret)}`)
      + `\n# ---------- Simulation locale de Supabase (docker-compose.test.yml) ----------\nSIMULATION_MOT_DE_PASSE=${secret()}\n`;
  }
  fs.writeFileSync(fichierEnv, texte, { mode: 0o600 });
  console.log(simulation ? '.env créé pour la simulation locale (sans projet Supabase).'
    : '.env créé avec des secrets aléatoires : complétez la partie Supabase.');
}

function openssl(args, dossierMonte) {
  try {
    execFileSync('openssl', args, { stdio: 'pipe' });
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
    // Pas d'openssl sur la machine : celui de l'image Orthanc
    execFileSync('docker', ['run', '--rm', '-v', `${dossierMonte}:/certs`, '--entrypoint', 'openssl', 'orthancteam/orthanc:26.9.1',
      ...args.map(a => a.replace(dossierMonte, '/certs'))], { stdio: 'pipe' });
  }
}

function creerCertificat(env) {
  const dossier = path.resolve(racine, env.CERTS_DIR || './certs');
  fs.mkdirSync(dossier, { recursive: true });
  const cert = path.join(dossier, 'fullchain.pem'), cle = path.join(dossier, 'privkey.pem');
  if (fs.existsSync(cert)) { console.log(`Certificat présent : ${path.relative(racine, cert)}`); return; }
  const domaine = env.DICOM_DOMAINE || 'dicom.localhost';
  openssl(['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '825', '-subj', `/CN=${domaine}`,
    '-addext', `subjectAltName=DNS:${domaine}`, '-keyout', cle, '-out', cert], dossier);
  console.log(`Certificat auto-signé créé pour ${domaine} (développement local ; en production, Let's Encrypt).`);
}

function creerDossiers(env) {
  const donnees = path.resolve(racine, env.DONNEES_DIR || './donnees');
  for (const d of ['orthanc-fichiers', 'orthanc-index', 'acme']) fs.mkdirSync(path.join(donnees, d), { recursive: true });
  console.log(`Dossier de données : ${donnees}`);
}

if (require.main === module) {
  creerEnv(process.argv.includes('--simulation'));
  const env = lireEnv(fs.readFileSync(fichierEnv, 'utf8'));
  creerDossiers(env);
  creerCertificat(env);
  console.log(process.argv.includes('--simulation')
    ? 'Ensuite : docker compose -f docker-compose.yml -f docker-compose.test.yml up -d --build   (voir README.md)'
    : 'Ensuite : docker compose up -d --build   (voir README.md)');
}

module.exports = { lireEnv, jwtHs256 };
