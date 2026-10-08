#!/usr/bin/env node
/* =========================================================
   Test d'intégration du module Remplacements (npm run test:integration) :
   PostgreSQL local (migration du dépôt) + PostgREST (l'API de Supabase)
   + dépôt Supabase (supabase/functions/_shared/depot-supabase.ts) + agent,
   exécutés sous Deno comme dans les fonctions serveur.
   Nécessite PostgreSQL, et les variables POSTGREST_BIN et DENO_BIN
   (chemins des programmes) ; ignoré sinon.
   ========================================================= */
const { spawn, execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { demarrer, racine } = require('./pg.js');

const POSTGREST = process.env.POSTGREST_BIN, DENO = process.env.DENO_BIN;
if (!POSTGREST || !DENO || !fs.existsSync(POSTGREST) || !fs.existsSync(DENO)) { console.log("POSTGREST_BIN ou DENO_BIN absent : test d'intégration ignoré."); process.exit(0); }
const pg = demarrer();
if (!pg) { console.log("PostgreSQL absent : test d'intégration ignoré."); process.exit(0); }

let serveur = null;
(async () => {
  try {
    const { admin, psql } = pg;
    admin('create role authenticator noinherit login; grant anon, authenticated, service_role to authenticator;');
    // données fictives, écrites comme le ferait le site ou l'administrateur (clé de service)
    const service = sql => { const r = psql(sql, { role: 'service_role' }); if (r.erreur) throw new Error(r.erreur); return r.sortie; };
    const utilisateur = email => admin(`insert into auth.users (email, raw_user_meta_data) values ('${email}', '{"nom":"${email.split('@')[0].toUpperCase()}","prenom":"Test","telephone":"98000000"}') returning id`);
    const ids = {};
    for (const [cle, statut, annee] of [['R1', 'specialiste', null], ['R2', 'specialiste', null], ['R3', 'resident', 4]]) {
      ids[cle] = utilisateur(`${cle.toLowerCase()}@exemple.tn`);
      service(`insert into rp_remplacants (id, statut, annee_residanat, affectation, competences, gouvernorats, honoraires_souhaites, etat) values ('${ids[cle]}', '${statut}', ${annee || 'null'}, 'Service fictif', '{scanner,irm,echographie}', '{Tunis}', 400, 'valide')`);
      service(`insert into rp_disponibilites (remplacant_id, date, creneau) values ('${ids[cle]}', '2026-10-15', 'journee'), ('${ids[cle]}', '2026-10-16', 'journee')`);
    }
    ids.M1 = utilisateur('m1@orangers-fictive.tn');
    ids.S1 = service(`insert into rp_structures (nom, type, adresse, ville, gouvernorat, contact_nom, telephone, email, etat, cree_par) values ('Clinique Les Orangers (fictive)', 'clinique', '12 avenue Test', 'Tunis', 'Tunis', 'Mme Test', '71000001', 'contact@orangers-fictive.tn', 'valide', '${ids.M1}') returning id`);
    service(`insert into rp_membres (structure_id, profil_id, role) values ('${ids.S1}', '${ids.M1}', 'responsable') on conflict do nothing`);

    // PostgREST
    const secret = 'secret-de-test-postgrest-au-moins-32-caracteres!';
    const httpPort = 31000 + Math.floor(Math.random() * 900);
    const conf = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'rh-pgrst-')), 'postgrest.conf');
    fs.writeFileSync(conf, `db-uri = "postgres://authenticator@/postgres?host=${pg.dossier}&port=${pg.port}"\ndb-schemas = "public"\ndb-anon-role = "anon"\njwt-secret = "${secret}"\nserver-host = "127.0.0.1"\nserver-port = ${httpPort}\n`);
    serveur = spawn(POSTGREST, [conf], { stdio: 'ignore' });
    const url = `http://127.0.0.1:${httpPort}`;
    for (let i = 0; i < 50; i++) {
      try { if ((await fetch(url)).status < 500) break; } catch (e) { /* pas encore prêt */ }
      await new Promise(r => setTimeout(r, 200));
    }
    execFileSync(DENO, ['run', '--allow-net', '--allow-read', '--allow-env', '--node-modules-dir=none', path.join(__dirname, 'integration.ts')], {
      cwd: racine, stdio: 'inherit', env: { ...process.env, RP_PGRST: url, RP_JWT_SECRET: secret, RP_IDS: JSON.stringify(ids) },
    });
  } catch (e) {
    console.error(e.message);
    process.exitCode = 1;
  } finally {
    if (serveur) serveur.kill();
    pg.arreter();
  }
})();
