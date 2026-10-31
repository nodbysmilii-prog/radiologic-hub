#!/usr/bin/env node
/* =========================================================
   Scripts d'APPLICATION CONTRÔLÉE des migrations absentes de la production
   (supabase/sql/appliquer/, générés par scripts/supabase/assembler-application.js),
   exécutés sur une base PostgreSQL locale qui reproduit la production
   (5 migrations, droits par défaut de Supabase, sécurisation v2 ; données fictives) :
   • les scripts du dépôt sont à jour (identiques à ceux générés) ;
   • prérequis absent → refus, rien n'est créé ;
   • contrôle de sécurité en échec (fonction ouverte aux visiteurs, table sans
     RLS) → annulation COMPLÈTE de la migration ;
   • application réussie dans l'ordre conseillé ET dans l'ordre inverse
     (aucune dépendance cachée entre les migrations), puis relance sans effet ;
   • après application : diagnostic sain et droits conformes pour anon / PUBLIC.
   ========================================================= */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const PRODUCTION = ['20261008120000', '20261009090000', '20261012090000', '20261012120000', '20261012180000'];
process.env.RH_MIGRATIONS = PRODUCTION.join(',');
const { demarrer, racine } = require('./pg.js');
const { MIGRATIONS, tout, SORTIE } = require('../../scripts/supabase/assembler-application.js');
const { comparerDroits } = require('../../scripts/exploitation-supabase.js');

const lire = (...p) => fs.readFileSync(path.join(racine, ...p), 'utf8');
const DIAG = lire('supabase', 'sql', 'diagnostic.sql').replace(/;\s*$/, '');
let ok = 0;
const verifier = (nom, f) => { f(); ok++; console.log(`  ✓ ${nom}`); };

verifier('scripts d\'application du dépôt à jour (identiques à ceux générés depuis les migrations)', () => {
  for (const [f, texte] of Object.entries(tout())) assert.equal(fs.readFileSync(path.join(SORTIE, f), 'utf8'), texte, `${f} : relancer node scripts/supabase/assembler-application.js`);
  assert.deepEqual(fs.readdirSync(SORTIE).sort(), Object.keys(tout()).sort());
});

const pg = demarrer();
if (!pg) { console.log('PostgreSQL absent : test SQL ignoré.'); process.exit(0); }
const { psql, admin } = pg;
const diagnostic = () => { const r = psql(`begin transaction read only;\n${DIAG};\nrollback`); if (r.erreur) throw new Error(r.erreur); return JSON.parse(r.sortie.split('\n').find(l => l.startsWith('{'))); };
const script = nom => fs.readFileSync(path.join(SORTIE, `${nom}.sql`), 'utf8');
const appliquer = nom => psql(script(nom));
const [PROFIL, FIL, VAULT, ABO, DICOM] = MIGRATIONS.map(m => m.nom);

try {
  console.log('Application contrôlée des migrations, sur une base reproduisant la production :');
  admin(`do $$ declare f regprocedure; begin
      for f in select p.oid::regprocedure from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' loop
        execute format('grant execute on function %s to anon, authenticated, service_role', f);
      end loop; end $$;
    revoke execute on function public.cours_images_avant_ecriture(), public.cours_maj_le(), public.cours_validations_avant_ecriture() from public, anon, authenticated;
    alter default privileges for role postgres in schema public grant execute on functions to anon, authenticated, service_role;
    -- comme Supabase : tous les droits sur les futures tables et séquences pour anon, authenticated, service_role
    alter default privileges for role postgres in schema public grant all on tables to anon, authenticated, service_role;
    alter default privileges for role postgres in schema public grant all on sequences to anon, authenticated, service_role;
    create schema cron; create table cron.job (jobid serial primary key, jobname text, schedule text, command text, active boolean default true);`);
  admin(lire('supabase', 'sql', 'securisation-a-appliquer-v2.sql'));
  const depart = diagnostic();
  MIGRATIONS.forEach(m => assert.equal(depart.migrations[m.nom], false, m.nom));

  verifier('prérequis absent (rp_est_admin) → refus explicite, rien n\'est créé', () => {
    admin('alter function public.rp_est_admin() rename to rp_est_admin_cache');
    const r = appliquer(ABO);
    admin('alter function public.rp_est_admin_cache() rename to rp_est_admin');
    assert.match(r.erreur || '', /Prérequis absent : migration 20261008120000_remplacements/);
    assert.equal(admin("select to_regclass('public.ab_abonnements') is null"), 't');
  });

  verifier('contrôle en échec : une fonction ouverte aux visiteurs → migration ENTIÈREMENT annulée', () => {
    admin('create function public.piege() returns int language sql as $$ select 1 $$; grant execute on function public.piege() to anon');
    const r = appliquer(FIL);
    admin('drop function public.piege()');
    assert.match(r.erreur || '', /exécutable par les visiteurs \(anon\) : piege/);
    assert.equal(diagnostic().migrations[FIL], false, 'rien ne doit rester de la migration');
    assert.equal(admin("select count(*) from information_schema.columns where table_name = 'rs_cas' and column_name = 'type'"), '0');
  });

  verifier('contrôle en échec : une table sans RLS → migration annulée', () => {
    admin('create table public.sans_regles (id int)');
    const r = appliquer(PROFIL);
    admin('drop table public.sans_regles');
    assert.match(r.erreur || '', /sans règles d'accès par ligne \(RLS\) : sans_regles/);
    assert.equal(diagnostic().migrations[PROFIL], false);
  });

  verifier('contrôle en échec : écriture accordée aux visiteurs sur une table → migration annulée', () => {
    admin('grant insert on public.profils to anon');
    const r = appliquer(DICOM);
    admin('revoke insert on public.profils from anon');
    assert.match(r.erreur || '', /droit d'écriture/);
    assert.equal(admin("select to_regclass('public.dc_examens') is null"), 't');
  });

  verifier('application dans l\'ordre INVERSE (aucune dépendance cachée) : chaque script réussit et sa migration est reconnue', () => {
    for (const nom of [DICOM, ABO, VAULT, FIL, PROFIL]) {
      const r = appliquer(nom);
      assert.equal(r.erreur, null, `${nom} : ${r.erreur}`);
      assert.equal(diagnostic().migrations[nom], true, nom);
    }
  });

  verifier('relance des 5 scripts : sans effet, sans erreur (secret du Vault inchangé)', () => {
    const secret = admin("select id from vault.secrets where name = 'rp_taches_secret'");
    for (const m of MIGRATIONS) assert.equal(appliquer(m.nom).erreur, null, m.nom);
    assert.equal(admin("select id from vault.secrets where name = 'rp_taches_secret'"), secret);
  });

  verifier('après application : diagnostic sain, aucune fonction ni droit en trop pour anon / PUBLIC, search_path partout', () => {
    const d = diagnostic();
    assert.equal(d.securisation.nombre_executables_par_anon, 0);
    assert.equal(d.securisation.autres_fonctions_publiques_executables_par_anon, 0);
    assert.deepEqual(d.securisation.membres_sans_droit, []);
    assert.deepEqual(d.securisation.service_sans_droit, []);
    assert.deepEqual(d.securisation.fonctions_sans_search_path, []);
    const c = comparerDroits(d.droits_lignes, lire('tests', 'sql', 'droits-attendus.txt'));
    assert.deepEqual(c.enTrop.filter(l => / · (?:anon|PUBLIC)(?: :|$)/.test(l)), []);
  });

  verifier('retour arrière de chaque migration après une application contrôlée, puis réapplication', () => {
    for (const m of [...MIGRATIONS].reverse()) {
      admin(lire('supabase', 'sql', 'retour', `${m.nom}.sql`));
      assert.equal(diagnostic().migrations[m.nom], false, m.nom);
    }
    for (const m of MIGRATIONS) assert.equal(appliquer(m.nom).erreur, null, m.nom);
    assert.ok(MIGRATIONS.every(m => diagnostic().migrations[m.nom]));
  });

  console.log(`\n# pass ${ok}\n# fail 0`);
} catch (e) {
  console.error(e);
  console.log(`\n# pass ${ok}\n# fail 1`);
  process.exitCode = 1;
} finally {
  pg.arreter();
}
