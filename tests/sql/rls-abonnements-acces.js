#!/usr/bin/env node
/* =========================================================
   Lecture contrôlée des contenus réservés (…_abonnements_acces.sql) sur
   PostgreSQL local, données fictives (npm run test:sql) : visiteur et
   compte sans abonnement refusés, abonné en cours servi un contenu à la
   fois et journalisé, abonnement expiré refusé, plafond horaire, journal
   réservé à l'administrateur, version incrémentée.
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

try {
  console.log('Abonnements : lecture contrôlée des contenus réservés :');
  const nouveau = email => ({ id: admin(`insert into auth.users (email) values ('${email}') returning id`), email });
  const ADM = nouveau('auteur@exemple.tn'), ABO = nouveau('abonne@exemple.tn'), EXP = nouveau('expire@exemple.tn'), U = nouveau('membre@exemple.tn');
  admin("insert into rp_admins (email) values ('auteur@exemple.tn')");
  admin(`insert into ab_abonnements (membre_id, fin) values ('${ABO.id}', now() + interval '1 year');
    insert into ab_abonnements (membre_id, debut, fin) values ('${EXP.id}', now() - interval '2 year', now() - interval '1 year');
    insert into ab_contenus (id, module, titre, contenu) values ('cr-fictif', 'comptes-rendus', 'Modèle fictif', '{"texte": "fictif"}');`);
  const lire = u => comme(u, "select titre || ':' || version from ab_lire_contenu('cr-fictif')");

  verifier('visiteur : aucun droit d\'appel', () => assert.match(psql("select * from ab_lire_contenu('cr-fictif')", { role: 'anon' }).erreur || '', /permission denied/));
  verifier('compte sans abonnement et abonnement expiré : refusés (« abonnement requis »)', () => {
    assert.match(lire(U).erreur || '', /abonnement requis/);
    assert.match(lire(EXP).erreur || '', /abonnement requis/);
  });
  verifier('abonné en cours : un contenu servi, lecture journalisée', () => {
    assert.equal(lire(ABO).sortie, 'Modèle fictif:1');
    assert.equal(admin(`select count(*) from ab_journal where membre_id = '${ABO.id}'`), '1');
  });
  verifier('journal : lisible par l\'administrateur seulement', () => {
    assert.equal(valeur(ABO, 'select count(*) from ab_journal'), '0');
    assert.equal(valeur(ADM, 'select count(*) from ab_journal'), '1');
    assert.match(comme(ABO, 'insert into ab_journal (membre_id, contenu_id) values (auth.uid(), \'x\')').erreur || '', /permission denied|row-level security/);
  });
  verifier('plafond horaire : au-delà de 120 lectures, refus explicite ; administrateur non limité', () => {
    admin(`insert into ab_journal (membre_id, contenu_id) select '${ABO.id}', 'cr-fictif' from generate_series(1, 119)`);
    assert.match(lire(ABO).erreur || '', /trop de lectures/);
    assert.equal(lire(ADM).sortie, 'Modèle fictif:1');
  });
  verifier('porte unique : un abonné ne lit plus la table directement (pas d\'extraction en bloc hors plafond ni journal)', () => {
    assert.equal(valeur(ABO, 'select count(*) from ab_contenus'), '0');
    assert.equal(valeur(ADM, 'select count(*) from ab_contenus'), '1');
    assert.equal(valeur(U, 'select count(*) from ab_contenus'), '0');
  });
  verifier('identifiant invalide : « introuvable », rien de journalisé', () => {
    const avant = admin('select count(*) from ab_journal');
    for (const id of ["'../../etc'", "repeat('a', 81)", "''"]) assert.match(comme(ABO, `select * from ab_lire_contenu(${id})`).erreur || '', /contenu introuvable/, id);
    assert.equal(admin('select count(*) from ab_journal'), avant);
  });
  verifier('séquence du journal fermée aux visiteurs et aux membres', () => {
    assert.equal(admin("select has_sequence_privilege('anon', 'public.ab_journal_id_seq', 'USAGE') or has_sequence_privilege('authenticated', 'public.ab_journal_id_seq', 'USAGE')"), 'f');
  });
  verifier('version incrémentée à chaque modification du contenu', () => {
    admin(`update ab_contenus set contenu = '{"texte": "fictif v2"}' where id = 'cr-fictif'`);
    assert.equal(admin("select version from ab_contenus where id = 'cr-fictif'"), '2');
  });

  console.log(`\n# pass ${ok}\n# fail 0`);
} catch (e) {
  console.error(e);
  console.log(`\n# pass ${ok}\n# fail 1`);
  process.exitCode = 1;
} finally {
  pg.arreter();
}
