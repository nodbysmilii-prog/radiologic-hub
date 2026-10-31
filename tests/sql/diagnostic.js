#!/usr/bin/env node
/* =========================================================
   Diagnostic de production (supabase/sql/diagnostic.sql) sur une base locale :
   • s'exécute dans une transaction READ ONLY (preuve qu'il n'écrit rien) ;
   • tolère les objets absents (pg_cron, Vault, historique des migrations) ;
   • ne renvoie aucune information sur les utilisateurs (ni comptes, ni données),
     ni valeur de secret, ni commande Cron.
   ========================================================= */
const fs = require('node:fs');
const path = require('node:path');
const { demarrer, racine } = require('./pg.js');

const pg = demarrer();
if (!pg) { console.log('PostgreSQL absent : test du diagnostic ignoré.'); process.exit(0); }
let echecs = 0;
const verifier = (nom, ok, detail = '') => { console.log(`  ${ok ? '✓' : '✗'} ${nom}${ok || !detail ? '' : '\n      ' + detail}`); if (!ok) echecs++; };
const SQL = fs.readFileSync(path.join(racine, 'supabase', 'sql', 'diagnostic.sql'), 'utf8').replace(/;\s*$/, '');
const lancer = () => { const r = pg.psql(`begin transaction read only;\n${SQL};\nrollback`); if (r.erreur) throw new Error(r.erreur); return JSON.parse(r.sortie.split('\n').find(l => l.startsWith('{'))); };

try {
  console.log('Diagnostic de production (lecture seule) :');
  // données fictives, dont une adresse et un mot de passe dans une commande Cron : rien ne doit ressortir
  pg.admin(`insert into auth.users (id, email) values ('00000000-0000-4000-8000-0000000000aa', 'personne.fictive@exemple.tn');
    insert into public.rp_admins (email) values ('personne.fictive@exemple.tn');
    create schema cron;
    create table cron.job (jobid serial primary key, jobname text, schedule text, command text, active boolean default true);
    create table cron.job_run_details (jobid int, status text, start_time timestamptz);
    insert into cron.job (jobname, schedule, command) values ('rp-taches', '*/15 * * * *', 'select rp_prive.appeler_taches(''https://wdbczcwnaxfnoioyukgr.supabase.co'')'),
      ('ancienne', '0 * * * *', 'select net.http_post(headers := jsonb_build_object(''x-rp-secret'', ''MOT-DE-PASSE-FICTIF''))');
    insert into cron.job_run_details values (1, 'succeeded', now()), (1, 'failed', now() - interval '15 minutes');`);

  const d = lancer();
  verifier('s\'exécute dans une transaction en lecture seule', !!d);
  verifier('toutes les migrations du dépôt sont reconnues comme appliquées', Object.values(d.migrations).every(Boolean), JSON.stringify(d.migrations));
  verifier('migrations contrôlées : une par fichier du dépôt', Object.keys(d.migrations).length === fs.readdirSync(path.join(racine, 'supabase', 'migrations')).length);
  verifier('Vault : secret rp_taches_secret et fonctions présents', d.vault.secret_rp_taches_secret === true && d.vault.fonction_verification && d.vault.fonction_appel);
  verifier('droits attendus (vérification réservée à service_role, appel fermé à tous)', d.droits.verification_par_service_role === true && !d.droits.verification_par_anon && !d.droits.verification_par_authenticated && !d.droits.appel_par_anon && !d.droits.appel_par_service_role && !d.droits.vault_lisible_par_utilisateurs && !d.droits.file_pg_net_lisible_par_utilisateurs, JSON.stringify(d.droits));
  verifier('tâches Cron : noms, fréquences, passage par Vault ; secret en clair signalé sans le montrer', d.cron.length === 2 && d.cron[0].via_vault === true && d.cron[1].secret_en_clair === true && d.cron[1].via_vault === false);
  verifier('dernières exécutions de rp-taches (statuts seulement)', JSON.stringify(d.cron_dernieres_executions) === '["succeeded","failed"]');
  verifier('historique des migrations absent : null, sans erreur', d.historique_migrations === null);
  verifier('aucune information sur les utilisateurs (ni comptes, ni données)', JSON.stringify(Object.keys(d).sort()) === JSON.stringify(['cron', 'cron_dernieres_executions', 'droits', 'droits_lignes', 'extensions', 'historique_migrations', 'migrations', 'pg_net_derniers_codes', 'securisation', 'vault']), Object.keys(d).join(', '));
  const { comparerDroits } = require('../../scripts/exploitation-supabase.js');
  const cmp = comparerDroits(d.droits_lignes, fs.readFileSync(path.join(racine, 'tests', 'sql', 'droits-attendus.txt'), 'utf8'));
  verifier('droits du schéma public : lignes techniques seulement, identiques à droits-attendus.txt (même résultat que tests/sql/droits.js)', cmp.illisibles === 0 && !cmp.enTrop.length && !cmp.serveur.length && cmp.absentes === 0, JSON.stringify(cmp).slice(0, 300));
  const texte = JSON.stringify({ ...d, droits_lignes: undefined });
  verifier('aucune donnée personnelle ni secret dans le résultat', !/personne\.fictive|MOT-DE-PASSE|@|select |x-rp-secret/i.test(texte), texte.slice(0, 300));

  // base partiellement installée : objets absents → faux ou null, jamais d'erreur
  pg.admin(`drop function public.rp_taches_secret_valide(text); drop schema rp_prive cascade; drop schema vault cascade; drop schema cron cascade;
    create schema supabase_migrations; create table supabase_migrations.schema_migrations (version text primary key); insert into supabase_migrations.schema_migrations values ('20261008120000'), ('20261009090000');`);
  const p = lancer();
  verifier('migration Vault absente : signalée « non appliquée »', p.migrations['20261029120000_planification_vault'] === false);
  verifier('Vault et pg_cron absents : null, sans erreur', p.vault.schema_vault === false && p.vault.secret_rp_taches_secret === null && p.cron === null && p.cron_dernieres_executions === null);
  verifier('droits sur des fonctions absentes : null', p.droits.verification_par_service_role === null && p.droits.appel_par_anon === null);
  verifier('historique des migrations listé quand il existe', JSON.stringify(p.historique_migrations) === '["20261008120000","20261009090000"]');
  const ecriture = pg.psql(`begin transaction read only; insert into public.rp_admins (email) values ('x@y.tn'); rollback`);
  verifier('contre-épreuve : une écriture est bien refusée dans ce mode', /read-only transaction/.test(ecriture.erreur || ''));
} catch (e) {
  verifier('le diagnostic s\'exécute sans erreur', false, e.message.split('\n').slice(0, 3).join(' '));
} finally {
  pg.arreter();
}
console.log(`\n# ${echecs ? 'fail ' + echecs : 'pass'}`);
process.exit(echecs ? 1 : 0);
