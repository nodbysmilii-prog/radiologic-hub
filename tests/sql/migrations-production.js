#!/usr/bin/env node
/* =========================================================
   Les 4 migrations absentes de la production, appliquées sur une base
   PostgreSQL locale qui REPRODUIT LA PRODUCTION du 31/10/2026 (données
   fictives ; npm run test:sql) :
   • seules les 5 migrations présentes en production, droits par défaut de
     Supabase (EXECUTE accordé à anon, aussi pour les futures fonctions),
     files pg_net à supabase_admin, puis sécurisation v2 appliquée ;
   • ordre recommandé : fil Communauté → planification (Vault) →
     abonnements → Espace DICOM ; après chacune : migration reconnue par le
     diagnostic, AUCUNE fonction exécutable par anon (même avec les droits
     par défaut), fonctions des membres et du serveur présentes, sécurisation
     v2 relançable ;
   • retour arrière de chacune (supabase/sql/retour/), puis réapplication.
   ========================================================= */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const PRODUCTION = ['20261008120000', '20261009090000', '20261012090000', '20261012120000', '20261012180000'];
const MANQUANTES = ['20261027120000_communaute_fil', '20261029120000_planification_vault', '20261030090000_abonnements', '20261014090000_espace_dicom'];
process.env.RH_MIGRATIONS = PRODUCTION.join(',');
const { demarrer, racine } = require('./pg.js');

const lire = (...p) => fs.readFileSync(path.join(racine, ...p), 'utf8');
const DIAG = lire('supabase', 'sql', 'diagnostic.sql').replace(/;\s*$/, '');

const pg = demarrer();
if (!pg) { console.log('PostgreSQL absent : test SQL ignoré.'); process.exit(0); }
const { psql, admin } = pg;
let ok = 0;
const verifier = (nom, f) => { f(); ok++; console.log(`  ✓ ${nom}`); };
const diagnostic = () => { const r = psql(`begin transaction read only;\n${DIAG};\nrollback`); if (r.erreur) throw new Error(r.erreur); return JSON.parse(r.sortie.split('\n').find(l => l.startsWith('{'))); };
const sain = (d, nom) => {
  assert.equal(d.securisation.nombre_executables_par_anon, 0, `${nom} : fonctions exécutables par anon ${JSON.stringify(d.securisation.executables_par_anon)}`);
  assert.equal(d.securisation.autres_fonctions_publiques_executables_par_anon, 0, `${nom} : fonction hors liste exécutable par anon`);
  assert.deepEqual(d.securisation.membres_sans_droit, [], nom);
  assert.deepEqual(d.securisation.service_sans_droit, [], nom);
};

try {
  console.log('Migrations manquantes, sur une base reproduisant la production :');
  // État de la production : droits par défaut de Supabase, y compris pour les FUTURES fonctions (cas le plus défavorable)
  admin(`do $$ declare f regprocedure; begin
      for f in select p.oid::regprocedure from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' loop
        execute format('grant execute on function %s to anon, authenticated, service_role', f);
      end loop; end $$;
    -- comme en production (diagnostic du 31/10) : les déclencheurs des cours restent fermés par leur migration
    revoke execute on function public.cours_images_avant_ecriture(), public.cours_maj_le(), public.cours_validations_avant_ecriture() from public, anon, authenticated;
    alter default privileges for role postgres in schema public grant execute on functions to anon, authenticated, service_role;
    create role supabase_admin; alter schema net owner to supabase_admin; alter table net.http_request_queue owner to supabase_admin;
    set role supabase_admin; grant all on net.http_request_queue to public; reset role;
    create schema cron; create table cron.job (jobid serial primary key, jobname text, schedule text, command text, active boolean default true);`);
  admin(lire('supabase', 'sql', 'securisation-a-appliquer-v2.sql'));
  const depart = diagnostic();
  verifier('état de départ = production (5 migrations, 0 fonction visée pour anon, sauvegarde présente)', () => {
    MANQUANTES.forEach(m => assert.equal(depart.migrations[m], false, m));
    assert.equal(depart.securisation.sauvegarde_des_droits_presente, true);
    sain(depart, 'départ');
  });

  for (const m of MANQUANTES) {
    verifier(`${m} : s'applique, reconnue, aucune fonction pour anon (droits par défaut compris), membres et serveur intacts, sécurisation v2 relançable`, () => {
      admin(lire('supabase', 'migrations', `${m}.sql`));
      const d = diagnostic();
      assert.equal(d.migrations[m], true);
      sain(d, m);
      admin(lire('supabase', 'sql', 'securisation-fonctions.sql'));
      sain(diagnostic(), `${m} + sécurisation`);
    });
  }
  verifier('les 4 migrations réappliquées : sans effet (idempotentes)', () => {
    MANQUANTES.forEach(m => admin(lire('supabase', 'migrations', `${m}.sql`)));
    sain(diagnostic(), 'réapplication');
  });

  for (const m of [...MANQUANTES].reverse()) {
    verifier(`${m} : retour arrière (supabase/sql/retour/) puis réapplication`, () => {
      admin(lire('supabase', 'sql', 'retour', `${m}.sql`));
      const d = diagnostic();
      assert.equal(d.migrations[m], false, m);
      sain(d, `retour ${m}`);
      admin(lire('supabase', 'migrations', `${m}.sql`));
      assert.equal(diagnostic().migrations[m], true);
      admin(lire('supabase', 'sql', 'retour', `${m}.sql`));
    });
  }
  verifier('après tous les retours : état de départ exact', () => {
    const d = diagnostic();
    assert.deepEqual(d.migrations, depart.migrations);
    sain(d, 'fin');
  });
  verifier('retours refusés quand ils perdraient des données (tâche Cron active, abonnements)', () => {
    MANQUANTES.forEach(m => admin(lire('supabase', 'migrations', `${m}.sql`)));
    admin("insert into cron.job (jobname, schedule, command) values ('rp-taches', '*/15 * * * *', 'select rp_prive.appeler_taches(''x'')')");
    assert.match(psql(lire('supabase', 'sql', 'retour', '20261029120000_planification_vault.sql')).erreur || '', /tâche Cron/);
    const u = admin("insert into auth.users (email) values ('abonne@exemple.tn') returning id");
    admin(`insert into ab_abonnements (membre_id, fin) values ('${u}', now() + interval '1 year')`);
    assert.match(psql(lire('supabase', 'sql', 'retour', '20261030090000_abonnements.sql')).erreur || '', /retour arrière refusé/);
  });

  console.log(`\n# pass ${ok}\n# fail 0`);
} catch (e) {
  console.error(e);
  console.log(`\n# pass ${ok}\n# fail 1`);
  process.exitCode = 1;
} finally {
  pg.arreter();
}
