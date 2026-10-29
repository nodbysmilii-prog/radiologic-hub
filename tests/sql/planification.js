#!/usr/bin/env node
/* =========================================================
   Planification de rp-taches : secret dans le Vault (simulé), droits SQL.
   • le secret est créé par la migration (64 caractères hexadécimaux) et
     n'est pas changé quand on la relance ;
   • public.rp_taches_secret_valide ne répond que vrai / faux, et seulement
     à service_role ; visiteurs et membres connectés sont refusés ;
   • rp_prive.appeler_taches n'est exécutable par aucun rôle de l'API et
     n'envoie le secret qu'à l'adresse d'un projet Supabase ;
   • aucun rôle de l'API ne lit le Vault ;
   • supabase/sql/verification-planification.sql donne les réponses attendues.
   Le secret n'est jamais affiché par ce test.
   ========================================================= */
const fs = require('node:fs');
const path = require('node:path');
const { demarrer, racine } = require('./pg.js');

const pg = demarrer();
if (!pg) { console.log('PostgreSQL absent : test de la planification ignoré.'); process.exit(0); }

let echecs = 0;
const verifier = (nom, ok, detail = '') => {
  console.log(`  ${ok ? '✓' : '✗'} ${nom}${ok || !detail ? '' : '\n      ' + detail}`);
  if (!ok) echecs++;
};
const MIGRATION = path.join(racine, 'supabase', 'migrations', '20261029120000_planification_vault.sql');
const PROJET = 'https://wdbczcwnaxfnoioyukgr.supabase.co';
const membre = { id: '00000000-0000-4000-8000-000000000001', email: 'membre@exemple.test' };
const refuse = r => !!r.erreur && /permission denied/.test(r.erreur);
const lit = "(select decrypted_secret from vault.decrypted_secrets where name = 'rp_taches_secret')";

try {
  console.log('Planification de rp-taches (Vault) :');
  pg.admin(`insert into auth.users (id, email) values ('${membre.id}', '${membre.email}')`);

  verifier('la migration range un secret aléatoire de 64 caractères hexadécimaux dans le Vault',
    pg.admin(`select ${lit} ~ '^[0-9a-f]{64}$'`) === 't');
  const empreinte = pg.admin(`select md5(${lit})`);
  pg.admin(fs.readFileSync(MIGRATION, 'utf8'));
  verifier('relancer la migration ne change pas le secret et n\'en crée pas un second',
    pg.admin(`select md5(${lit})`) === empreinte && pg.admin("select count(*) from vault.secrets where name = 'rp_taches_secret'") === '1');

  // Valeur lue seulement pour la passer à la fonction, jamais affichée.
  const secret = pg.admin(`select ${lit}`);
  const valide = (candidat, role = 'service_role') => pg.psql(`select public.rp_taches_secret_valide(${candidat})`, { role, utilisateur: membre });
  verifier('service_role : le bon mot de passe est accepté', valide(`'${secret}'`).sortie === 't');
  const faux = [
    ['un autre mot de passe de même longueur', `'${'0'.repeat(64)}'`],
    ['le mot de passe suivi d\'un caractère', `'${secret}x'`],
    ['le début du mot de passe', `'${secret.slice(0, 40)}'`],
    ['une valeur vide', "''"],
    ['une valeur absente', 'null'],
    ['une valeur très longue', `'${secret.repeat(5)}'`],
  ];
  faux.forEach(([nom, v]) => verifier(`service_role : ${nom} est refusé(e)`, valide(v).sortie === 'f'));
  verifier('la vérification ne renvoie qu\'un booléen (jamais le secret)',
    pg.admin("select pg_get_function_result('public.rp_taches_secret_valide(text)'::regprocedure)") === 'boolean');

  for (const role of ['anon', 'authenticated']) {
    verifier(`${role} : ne peut pas appeler la vérification`, refuse(valide(`'${secret}'`, role)));
    verifier(`${role} : ne peut pas lire le Vault`, refuse(pg.psql('select count(*) from vault.decrypted_secrets', { role, utilisateur: membre })));
    verifier(`${role} : ne peut pas lancer l'appel de rp-taches`, refuse(pg.psql(`select rp_prive.appeler_taches('${PROJET}')`, { role, utilisateur: membre })));
  }
  verifier('service_role : ne peut pas lancer l\'appel de rp-taches (réservé à la tâche pg_cron)',
    refuse(pg.psql(`select rp_prive.appeler_taches('${PROJET}')`, { role: 'service_role' })));
  verifier('service_role : ne peut pas lire le Vault directement',
    refuse(pg.psql('select count(*) from vault.decrypted_secrets', { role: 'service_role' })));

  const id = pg.admin(`select rp_prive.appeler_taches('${PROJET}')`);
  verifier('tâche pg_cron : un seul appel POST vers rp-taches, avec le secret du Vault dans l\'en-tête x-rp-secret',
    pg.admin(`select count(*) = 1 and bool_and(method = 'POST' and url = '${PROJET}/functions/v1/rp-taches'
                and headers ->> 'x-rp-secret' = ${lit} and timeout_milliseconds = 60000)
              from net.http_request_queue where id = ${Number(id)}`) === 't');
  const adresses = ['https://exemple.com', 'http://wdbczcwnaxfnoioyukgr.supabase.co', `${PROJET}.exemple.com`, `${PROJET}/autre`, 'https://court.supabase.co'];
  adresses.forEach(a => verifier(`tâche pg_cron : refuse d'envoyer le secret à ${a}`, !!pg.psql(`select rp_prive.appeler_taches('${a}')`).erreur));
  verifier('tâche pg_cron : refuse une adresse absente', !!pg.psql('select rp_prive.appeler_taches(null)').erreur);
  verifier('aucun appel envoyé ailleurs que vers le projet',
    pg.admin(`select count(*) from net.http_request_queue where url <> '${PROJET}/functions/v1/rp-taches'`) === '0');

  const sansSecret = pg.psql(`begin; delete from vault.secrets where name = 'rp_taches_secret';
    select public.rp_taches_secret_valide('${secret}'); rollback;`);
  verifier('secret supprimé du Vault : plus aucun mot de passe accepté', sansSecret.sortie === 'f');
  verifier('secret supprimé du Vault : la tâche pg_cron s\'arrête avec une erreur',
    !!pg.psql("begin; delete from vault.secrets where name = 'rp_taches_secret'; select rp_prive.appeler_taches('https://wdbczcwnaxfnoioyukgr.supabase.co'); rollback;").erreur);

  const props = pg.admin(`select p.proname, p.prosecdef, coalesce(array_to_string(p.proconfig, ','), '') from pg_proc p
    where p.oid in ('public.rp_taches_secret_valide(text)'::regprocedure, 'rp_prive.appeler_taches(text)'::regprocedure) order by 1`);
  verifier('fonctions à search_path fixé ; seule la vérification a les droits de son propriétaire',
    props === 'appeler_taches|f|search_path=""\nrp_taches_secret_valide|t|search_path=""', props);

  const script = fs.readFileSync(path.join(racine, 'supabase', 'sql', 'verification-planification.sql'), 'utf8');
  const colonnes = [...script.matchAll(/\bas (\w+_(?:oui|non))\b/g)].map(m => m[1]);
  const valeurs = pg.admin(script).split('|');
  const ecarts = colonnes.filter((c, i) => valeurs[i] !== (c.endsWith('_oui') ? 't' : 'f'));
  verifier(`verification-planification.sql : les ${colonnes.length} contrôles ont la valeur attendue`,
    colonnes.length === 11 && valeurs.length === colonnes.length && !ecarts.length, 'écarts : ' + ecarts.join(', '));
} finally {
  pg.arreter();
}
console.log(`\n# ${echecs ? 'fail ' + echecs : 'pass'}`);
process.exit(echecs ? 1 : 0);
