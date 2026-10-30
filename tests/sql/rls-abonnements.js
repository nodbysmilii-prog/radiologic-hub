#!/usr/bin/env node
/* =========================================================
   Test du schéma Supabase des abonnements (supabase/migrations/…_abonnements.sql)
   sur un PostgreSQL local, exposition automatique désactivée
   (npm run test:sql) : les contenus réservés et le stockage privé
   « premium » ne sont lisibles que par un abonnement EN COURS ou
   l'administrateur ; jamais par un visiteur, un compte sans abonnement
   ou un abonnement expiré ; seul l'administrateur écrit. Données fictives.
   ========================================================= */
const assert = require('node:assert/strict');
const { demarrer } = require('./pg.js');

const pg = demarrer();
if (!pg) { console.log('PostgreSQL absent : test SQL ignoré.'); process.exit(0); }
const { psql, admin } = pg;

let ok = 0;
const verifier = (nom, f) => { f(); ok++; console.log(`  ✓ ${nom}`); };
const comme = (u, sql) => psql(sql, { utilisateur: u, role: 'authenticated' });
const valeur = (u, sql) => { const r = comme(u, sql); if (r.erreur) throw new Error(r.erreur); return r.sortie; };
const refuse = (u, sql, motif = /row-level security|permission denied/) => assert.match(comme(u, sql).erreur || 'ACCEPTÉ', motif);
const visiteur = sql => psql(sql, { role: 'anon' });

try {
  console.log('Abonnements : vérification des droits :');
  const nouveau = email => ({ id: admin(`insert into auth.users (email) values ('${email}') returning id`), email });
  const ADM = nouveau('auteur@exemple.tn'), ABO = nouveau('abonne@exemple.tn'), EXP = nouveau('expire@exemple.tn'), U = nouveau('membre@exemple.tn');
  admin("insert into rp_admins (email) values ('auteur@exemple.tn')");

  verifier('seul l\'administrateur crée les abonnements (un membre ne peut pas s\'abonner lui-même)', () => {
    refuse(U, `insert into ab_abonnements (membre_id, fin) values ('${U.id}', now() + interval '1 year')`);
    valeur(ADM, `insert into ab_abonnements (membre_id, fin) values ('${ABO.id}', now() + interval '1 year')`);
    valeur(ADM, `insert into ab_abonnements (membre_id, debut, fin) values ('${EXP.id}', now() - interval '2 year', now() - interval '1 year')`);
    assert.equal(valeur(ABO, `update ab_abonnements set fin = now() + interval '50 year' where membre_id = '${ABO.id}' returning membre_id`), '');
    assert.equal(valeur(ADM, `select count(*) from ab_abonnements where fin > now() + interval '10 year'`), '0');
  });

  verifier('chacun ne voit que son propre abonnement ; ab_est_abonne() suit les dates', () => {
    assert.equal(valeur(ABO, 'select count(*) from ab_abonnements'), '1');
    assert.equal(valeur(U, 'select count(*) from ab_abonnements'), '0');
    assert.equal(valeur(ADM, 'select count(*) from ab_abonnements'), '2');
    assert.equal(valeur(ABO, 'select ab_est_abonne()'), 't');
    assert.equal(valeur(EXP, 'select ab_est_abonne()'), 'f');
    assert.equal(valeur(U, 'select ab_est_abonne()'), 'f');
    assert.match(visiteur('select ab_est_abonne()').erreur || '', /permission denied/);
  });

  verifier('contenus réservés : abonné en cours et administrateur seulement', () => {
    valeur(ADM, `insert into ab_contenus (id, module, titre, contenu) values ('cr-exemple', 'comptes-rendus', 'Modèle réservé', '{"texte": "fictif"}')`);
    assert.equal(valeur(ABO, 'select count(*) from ab_contenus'), '1');
    assert.equal(valeur(ADM, 'select count(*) from ab_contenus'), '1');
    assert.equal(valeur(U, 'select count(*) from ab_contenus'), '0');
    assert.equal(valeur(EXP, 'select count(*) from ab_contenus'), '0');
    assert.match(visiteur('select count(*) from ab_contenus').erreur || '', /permission denied/);
    refuse(ABO, `insert into ab_contenus (id, module, titre) values ('pirate', 'fiches', 'x')`);
    assert.equal(valeur(ABO, `update ab_contenus set titre = 'modifié' returning id`), '');
    assert.equal(valeur(ABO, 'delete from ab_contenus returning id'), '');
  });

  verifier('stockage « premium » privé : lecture abonné/administrateur, écriture administrateur', () => {
    assert.equal(admin("select public from storage.buckets where id = 'premium'"), 'f');
    assert.ok(valeur(ADM, `insert into storage.objects (bucket_id, name) values ('premium', 'atlas/serie-1.jpg') returning id`));
    refuse(ABO, `insert into storage.objects (bucket_id, name) values ('premium', 'atlas/pirate.jpg')`);
    assert.equal(valeur(ABO, "select count(*) from storage.objects where bucket_id = 'premium'"), '1');
    assert.equal(valeur(U, "select count(*) from storage.objects where bucket_id = 'premium'"), '0');
    assert.equal(valeur(EXP, "select count(*) from storage.objects where bucket_id = 'premium'"), '0');
    assert.equal(valeur(U, "delete from storage.objects where bucket_id = 'premium' returning id"), '');
  });

  verifier('fin d\'abonnement : l\'accès cesse immédiatement', () => {
    valeur(ADM, `update ab_abonnements set fin = now() - interval '1 second', debut = now() - interval '1 day' where membre_id = '${ABO.id}'`);
    assert.equal(valeur(ABO, 'select ab_est_abonne()'), 'f');
    assert.equal(valeur(ABO, 'select count(*) from ab_contenus'), '0');
    assert.equal(valeur(ABO, "select count(*) from storage.objects where bucket_id = 'premium'"), '0');
  });

  verifier('suppression du compte : abonnement effacé', () => {
    admin(`delete from auth.users where id = '${EXP.id}'`);
    assert.equal(admin(`select count(*) from ab_abonnements where membre_id = '${EXP.id}'`), '0');
  });

  console.log(`\n# pass ${ok}\n# fail 0`);
} catch (e) {
  console.error(e);
  console.log(`\n# pass ${ok}\n# fail 1`);
  process.exitCode = 1;
} finally {
  pg.arreter();
}
