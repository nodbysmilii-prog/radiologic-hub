#!/usr/bin/env node
/* =========================================================
   Compatibilité de supabase/sql/securisation-prelancement.sql avec TOUTES
   les migrations du dépôt, sur PostgreSQL local (simulation Supabase,
   données fictives ; npm run test:sql) :
   • le script s'applique (transaction validée) et peut être relancé ;
   • anon ne peut plus exécuter les fonctions applicatives visées ;
   • authenticated et service_role gardent les fonctions dont le site et
     les fonctions serveur ont besoin ;
   • les lectures publiques des visiteurs restent possibles et les tables
     privées restent fermées.
   Les autres suites SQL peuvent être relancées avec le correctif appliqué :
   RH_SQL_APRES=supabase/sql/securisation-prelancement.sql npm run test:sql
   ========================================================= */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { demarrer, racine } = require('./pg.js');

const pg = demarrer();
if (!pg) { console.log('PostgreSQL absent : test SQL ignoré.'); process.exit(0); }
const { psql, admin } = pg;
const SCRIPT = fs.readFileSync(path.join(racine, 'supabase', 'sql', 'securisation-prelancement.sql'), 'utf8');

let ok = 0;
const verifier = (nom, f) => { f(); ok++; console.log(`  ✓ ${nom}`); };
const droit = (role, sig) => admin(`select has_function_privilege('${role}', to_regprocedure('${sig}'), 'EXECUTE')`);

try {
  console.log('Sécurisation avant lancement : compatibilité avec les migrations :');
  // Comme sur Supabase : droits d'exécution accordés par défaut à anon sur les fonctions du schéma public.
  admin(`do $$ declare f regprocedure; begin
    for f in select p.oid::regprocedure from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' loop
      execute format('grant execute on function %s to anon, authenticated, service_role', f);
    end loop; end $$`);
  const signatures = [...SCRIPT.matchAll(/'(public\.\w+\([^)]*\))'/g)].map(m => m[1]);
  const presentes = [...new Set(signatures)].filter(s => admin(`select to_regprocedure('${s}') is not null`) === 't');
  assert.ok(droit('anon', 'public.rp_est_admin()') === 't', 'situation de départ : anon exécute rp_est_admin');

  verifier(`le script s'applique sur toutes les migrations (${presentes.length} fonctions présentes sur ${new Set(signatures).size} listées)`, () => {
    admin(SCRIPT);
  });
  verifier('relance sans erreur (idempotent)', () => { admin(SCRIPT); });
  verifier('anon ne peut plus exécuter aucune fonction applicative visée', () => {
    const restantes = presentes.filter(s => droit('anon', s) === 't');
    assert.deepEqual(restantes, []);
  });
  verifier('authenticated garde les fonctions du site (session, Communauté, Remplacements, Bibliothèque, abonnements)', () => {
    for (const s of ['public.rp_est_admin()', 'public.rp_accepter_invitations()', 'public.rp_compteurs(uuid[])', 'public.rp_statistiques()',
      'public.rs_mes_conversations()', 'public.rs_missions_ouvertes()', 'public.rs_ouvrir_conversation(uuid)', 'public.rs_remplacant_valide(uuid)',
      'public.rs_supprimer_mon_compte()', 'public.ab_est_abonne()']) if (presentes.includes(s)) assert.equal(droit('authenticated', s), 't', s);
  });
  verifier('service_role garde les fonctions des fonctions serveur (rp-taches, rappels)', () => {
    for (const s of ['public.rs_rappels_messages(interval)', 'public.rp_taches_secret_valide(text)']) if (presentes.includes(s)) assert.equal(droit('service_role', s), 't', s);
  });
  verifier('visiteur : lectures publiques intactes, tables privées fermées, appel direct d\'une fonction refusé', () => {
    assert.equal(psql('select count(*) from cours_reglages', { role: 'anon' }).erreur, null);
    assert.equal(psql('select count(id) from bib_articles', { role: 'anon' }).erreur, null);
    assert.match(psql('select count(*) from rp_demandes', { role: 'anon' }).erreur || '', /permission denied/);
    assert.match(psql('select rp_est_admin()', { role: 'anon' }).erreur || '', /permission denied/);
  });
  verifier('membre connecté : les règles d\'accès qui appellent ces fonctions fonctionnent toujours', () => {
    const u = { id: admin("insert into auth.users (email) values ('membre@exemple.tn') returning id"), email: 'membre@exemple.tn' };
    for (const sql of ['select rp_est_admin()', 'select count(*) from rp_demandes', 'select count(*) from rs_cas', 'select count(*) from rs_messages', 'select count(*) from profils'])
      assert.equal(psql(sql, { utilisateur: u, role: 'authenticated' }).erreur, null, sql);
  });

  console.log(`\n# pass ${ok}\n# fail 0`);
} catch (e) {
  console.error(e);
  console.log(`\n# pass ${ok}\n# fail 1`);
  process.exitCode = 1;
} finally {
  pg.arreter();
}
