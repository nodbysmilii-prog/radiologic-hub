#!/usr/bin/env node
/* =========================================================
   Application de la sécurisation avant lancement, cycle complet sur un
   PostgreSQL local reproduisant la production (droits par défaut de
   Supabase, files pg_net lisibles ; données fictives ; npm run test:sql) :
   diagnostic avant → sauvegarde + fonctions (securisation-a-appliquer-v2.sql)
   → diagnostic après → retour arrière exact → réapplication. Les files
   pg_net sont reproduites comme sur Supabase hébergé (propriétaire
   supabase_admin, droits accordés à PUBLIC) : le script ne doit pas y
   toucher (leurs droits ne sont pas modifiables par le rôle postgres).
   Vérifie aussi que le fichier à appliquer est exactement la sauvegarde
   suivie du correctif revu, et que les listes du diagnostic sont celles
   du correctif.
   ========================================================= */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { demarrer, racine } = require('./pg.js');

const lire = f => fs.readFileSync(path.join(racine, 'supabase', 'sql', f), 'utf8');
const CORRECTIF = lire('securisation-prelancement.sql'), FONCTIONS = lire('securisation-fonctions.sql'), SAUVEGARDE = lire('securisation-sauvegarde.sql');
const A_APPLIQUER = lire('securisation-a-appliquer-v2.sql'), RETOUR = lire('securisation-retour-arriere.sql');
const DIAG = lire('diagnostic.sql').replace(/;\s*$/, '');

const pg = demarrer();
if (!pg) { console.log('PostgreSQL absent : test SQL ignoré.'); process.exit(0); }
const { psql, admin } = pg;
let ok = 0;
const verifier = (nom, f) => { f(); ok++; console.log(`  ✓ ${nom}`); };
const diagnostic = () => { const r = psql(`begin transaction read only;\n${DIAG};\nrollback`); if (r.erreur) throw new Error(r.erreur); return JSON.parse(r.sortie.split('\n').find(l => l.startsWith('{'))).securisation; };
const listes = sql => [...sql.matchAll(/FOREACH signature IN ARRAY ARRAY\[([\s\S]*?)\] LOOP/g)].map(m => [...m[1].matchAll(/'(public\.[^']+)'/g)].map(x => x[1]).sort());
const droit = (role, sig) => admin(`select has_function_privilege('${role}', to_regprocedure('${sig}'), 'EXECUTE')`);

try {
  console.log('Sécurisation avant lancement : sauvegarde, application, retour arrière :');
  verifier('fichier à appliquer = sauvegarde puis partie « fonctions » du correctif revu (#101), à l\'identique, sans pg_net', () => {
    assert.ok(A_APPLIQUER.endsWith(`${SAUVEGARDE}\n${FONCTIONS}`));
    const i = CORRECTIF.indexOf('-- Signatures applicatives connues'), j = CORRECTIF.indexOf('-- Refuser le commit');
    assert.ok(FONCTIONS.includes(CORRECTIF.slice(i, j).trimEnd()));
    assert.doesNotMatch(FONCTIONS.replace(/^--.*$/gm, ''), /\bnet\./);
    assert.equal(A_APPLIQUER.split('\n').slice(0, 2).every(l => l.startsWith('--')), true);
  });
  verifier('listes du diagnostic et de la sauvegarde identiques à celles du correctif', () => {
    const [visees, membres, service] = listes(CORRECTIF);
    const bloc = nom => [...(DIAG.match(new RegExp(`${nom}\\(s\\) as \\(values ([^)]*(?:\\)[^)]*)*?)\\)\\)`)) || [])[1].matchAll(/'(public\.[^']+)'/g)].map(x => x[1]).sort();
    assert.deepEqual(bloc('visees'), visees);
    assert.deepEqual(bloc('membres'), membres);
    assert.deepEqual(bloc('service'), service);
    assert.deepEqual([...SAUVEGARDE.matchAll(/'(public\.[^']+)'/g)].map(x => x[1]).sort(), visees);
  });

  // État de la production (diagnostic réel du 31/10/2026) : droits par défaut de Supabase, file pg_net lisible.
  admin(`do $$ declare f regprocedure; begin
    for f in select p.oid::regprocedure from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' loop
      execute format('grant execute on function %s to anon, authenticated, service_role', f);
    end loop; end $$;
    create role supabase_admin; alter schema net owner to supabase_admin; alter table net.http_request_queue owner to supabase_admin;
    set role supabase_admin; grant all on net.http_request_queue to public; reset role;`);
  const aclNet = () => admin("select relacl::text from pg_class where oid = 'net.http_request_queue'::regclass");
  const aclAvant = aclNet();
  const avant = diagnostic();
  verifier('diagnostic avant : faille pg_net et fonctions exécutables par anon détectées, aucune sauvegarde', () => {
    assert.equal(avant.pg_net_lisible_par_anon, true);
    assert.equal(avant.pg_net_lisible_par_authenticated, true);
    assert.equal(avant.nombre_executables_par_anon, avant.fonctions_visees_presentes);
    assert.deepEqual(avant.membres_sans_droit, []);
    assert.equal(avant.sauvegarde_des_droits_presente, false);
  });

  admin(A_APPLIQUER);
  const apres = diagnostic();
  verifier('après application : sauvegarde présente, plus aucune fonction visée pour anon, membres et service intacts, pg_net intact', () => {
    assert.equal(apres.sauvegarde_des_droits_presente, true);
    assert.equal(aclNet(), aclAvant, 'droits pg_net inchangés (gérés par Supabase)');
    assert.equal(apres.nombre_executables_par_anon, 0);
    assert.deepEqual(apres.membres_sans_droit, []);
    assert.deepEqual(apres.service_sans_droit, []);
  });
  verifier('sauvegarde fermée aux visiteurs et aux membres', () => {
    assert.match(psql('select count(*) from securite_sauvegarde.droits_20261031', { role: 'anon' }).erreur || '', /permission denied/);
    const u = { id: admin("insert into auth.users (email) values ('membre@exemple.tn') returning id"), email: 'membre@exemple.tn' };
    assert.match(psql('select count(*) from securite_sauvegarde.droits_20261031', { utilisateur: u, role: 'authenticated' }).erreur || '', /permission denied/);
    const tables = Number(admin("select count(*) from unnest(array['net.http_request_queue', 'net._http_response']) t where to_regclass(t) is not null"));
    assert.equal(Number(admin('select count(*) from securite_sauvegarde.droits_20261031')), avant.fonctions_visees_presentes + tables);
  });

  admin(RETOUR);
  const retour = diagnostic();
  verifier('retour arrière : droits d\'avant restaurés exactement (fonctions), pg_net inchangé', () => {
    assert.equal(aclNet(), aclAvant);
    assert.equal(retour.nombre_executables_par_anon, avant.nombre_executables_par_anon);
    assert.equal(droit('anon', 'public.rp_est_admin()'), 't');
  });
  verifier('réapplication après retour arrière : même résultat, sauvegarde d\'origine conservée', () => {
    admin(A_APPLIQUER);
    const d = diagnostic();
    assert.equal(d.nombre_executables_par_anon, 0);
  });
  verifier('le diagnostic reste accepté par le contrôle « lecture seule » du workflow', () => {
    require(path.join(racine, 'scripts', 'exploitation-supabase.js')).verifierSqlLectureSeule(lire('diagnostic.sql'));
  });

  console.log(`\n# pass ${ok}\n# fail 0`);
} catch (e) {
  console.error(e);
  console.log(`\n# pass ${ok}\n# fail 1`);
  process.exitCode = 1;
} finally {
  pg.arreter();
}
