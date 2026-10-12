#!/usr/bin/env node
/* =========================================================
   Test du schéma Supabase des cours (supabase/migrations/…_cours.sql)
   sur un PostgreSQL local, exposition automatique désactivée
   (npm run test:sql) : rien n'est visible des élèves avant
   l'approbation de l'auteur, et toute modification d'une image la
   remet « à valider ». Données fictives.
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
const C = "'echo-mi-ischio-jambiers'";

try {
  console.log('Cours : vérification des droits :');
  const nouveau = email => ({ id: admin(`insert into auth.users (email) values ('${email}') returning id`), email });
  const ADM = nouveau('auteur@exemple.tn'), U = nouveau('eleve@exemple.tn');
  admin("insert into rp_admins (email) values ('auteur@exemple.tn')");

  verifier('l\'auteur enregistre des éléments « à valider » : invisibles des visiteurs et des élèves connectés', () => {
    valeur(ADM, `insert into cours_validations (cours, element, type, version, statut, commentaire) values
      (${C}, 'texte', 'texte', 'a1b2c3d4', 'a_valider', null),
      (${C}, 'schema-s1', 'schema', '1561d85d', 'a_corriger', 'Nerf plus latéral'),
      (${C}, 'modele-femur', 'modele', 'a914f9b50b1d', 'a_valider', null)`);
    assert.equal(visiteur('select count(*) from cours_validations').sortie, '0');
    assert.equal(valeur(U, 'select count(*) from cours_validations'), '0');
    assert.equal(valeur(ADM, 'select count(*) from cours_validations'), '3');
  });

  verifier('approbation : visible de tous, sans le commentaire (effacé à l\'approbation)', () => {
    valeur(ADM, `update cours_validations set statut = 'approuve', commentaire = 'note' where element in ('texte', 'schema-s1')`);
    assert.equal(visiteur("select string_agg(element || ':' || version, ',' order by element) from cours_validations").sortie, 'schema-s1:1561d85d,texte:a1b2c3d4');
    assert.match(visiteur('select commentaire from cours_validations').erreur, /permission denied/);
    assert.match(visiteur('select * from cours_validations').erreur, /permission denied/, 'le site demande les colonnes une par une');
    assert.equal(admin("select count(*) from cours_validations where commentaire is not null"), '0');
    assert.equal(valeur(U, 'select count(*) from cours_validations'), '2');
  });

  verifier('visiteurs et élèves connectés n\'écrivent rien', () => {
    assert.match(visiteur(`insert into cours_validations (cours, element, type, version, statut) values (${C}, 'schema-s2', 'schema', 'x1', 'approuve')`).erreur, /permission denied/);
    assert.match(visiteur(`update cours_validations set statut = 'approuve'`).erreur, /permission denied/);
    refuse(U, `insert into cours_validations (cours, element, type, version, statut) values (${C}, 'schema-s2', 'schema', 'x1', 'approuve')`);
    assert.equal(valeur(U, `update cours_validations set version = 'pirate' returning element`), '');
    assert.equal(valeur(U, `delete from cours_validations returning element`), '');
    refuse(U, `insert into cours_reglages (cours, credits) values (${C}, 'piraté')`);
    refuse(U, `insert into cours_images (cours, schema, chemin) values (${C}, 's1', 'ischio-jambiers/s1-x.jpg')`);
    assert.equal(admin('select count(*) from cours_validations'), '3');
  });

  verifier('image : invisible tant que sa révision actuelle n\'est pas approuvée', () => {
    valeur(ADM, `insert into cours_images (cours, schema, chemin, orientation, etiquettes) values
      (${C}, 's1', 'ischio-jambiers/s1-0f3a9c.jpg', 'medial_droite', '[{"texte":"Nerf sciatique","x":61.5,"y":42}]')`);
    assert.equal(admin("select revision from cours_images where schema = 's1'"), '1');
    assert.equal(visiteur('select count(*) from cours_images').sortie, '0');
    valeur(ADM, `insert into cours_validations (cours, element, type, version, statut) values (${C}, 'image-s1', 'image', 'r1', 'approuve')`);
    assert.equal(visiteur("select chemin || '|' || orientation || '|' || (etiquettes -> 0 ->> 'texte') from cours_images").sortie, 'ischio-jambiers/s1-0f3a9c.jpg|medial_droite|Nerf sciatique');
    assert.equal(valeur(U, 'select count(*) from cours_images'), '1');
  });

  verifier('modifier l\'image (étiquettes, orientation) la remet « à valider » : révision 2, plus visible', () => {
    valeur(ADM, `update cours_images set etiquettes = '[{"texte":"Nerf sciatique","x":60,"y":40}]' where schema = 's1'`);
    assert.equal(admin("select revision from cours_images where schema = 's1'"), '2');
    assert.equal(visiteur('select count(*) from cours_images').sortie, '0');
    assert.equal(valeur(ADM, 'select count(*) from cours_images'), '1', 'l\'auteur la voit toujours');
    valeur(ADM, `update cours_validations set version = 'r2' where element = 'image-s1'`);
    assert.equal(visiteur('select count(*) from cours_images').sortie, '1');
  });

  verifier('crédits : lisibles de tous, écrits par l\'auteur seulement', () => {
    valeur(ADM, `insert into cours_reglages (cours, credits) values (${C}, 'Démonstration du Dr Brasseur — à compléter')`);
    assert.equal(visiteur('select credits from cours_reglages').sortie, 'Démonstration du Dr Brasseur — à compléter');
    assert.match(visiteur(`update cours_reglages set credits = 'x'`).erreur, /permission denied/);
    assert.equal(valeur(U, `update cours_reglages set credits = 'x' returning cours`), '');
  });

  verifier('contraintes : identifiants, statut, type cohérent avec l\'élément, étiquettes en liste, chemin d\'image', () => {
    refuse(ADM, `insert into cours_validations (cours, element, type, version, statut) values (${C}, 'schema-s2', 'schema', 'x1', 'publie')`, /check constraint/);
    refuse(ADM, `insert into cours_validations (cours, element, type, version) values (${C}, 'schema-s2', 'modele', 'x1')`, /cours_validations_type/);
    refuse(ADM, `insert into cours_validations (cours, element, type, version) values ('Cours Majuscules', 'texte', 'texte', 'x1')`, /check constraint/);
    refuse(ADM, `insert into cours_validations (cours, element, type, version, commentaire) values (${C}, 'texte-2', 'texte', 'x1', repeat('x', 1001))`, /check constraint/);
    refuse(ADM, `insert into cours_images (cours, schema, chemin) values (${C}, 's2', '../secret.jpg')`, /check constraint/);
    refuse(ADM, `insert into cours_images (cours, schema, chemin, etiquettes) values (${C}, 's2', 'ischio-jambiers/s2-a.jpg', '{"x":1}')`, /check constraint/);
    refuse(ADM, `insert into cours_images (cours, schema, chemin, orientation) values (${C}, 's2', 'ischio-jambiers/s2-a.jpg', 'haut')`, /check constraint/);
  });

  verifier('stockage « cours-images » : écriture réservée à l\'auteur', () => {
    assert.equal(admin("select public from storage.buckets where id = 'cours-images'"), 't');
    assert.ok(valeur(ADM, `insert into storage.objects (bucket_id, name) values ('cours-images', 'ischio-jambiers/s1-0f3a9c.jpg') returning id`));
    refuse(U, `insert into storage.objects (bucket_id, name) values ('cours-images', 'ischio-jambiers/s2-pirate.jpg')`);
    assert.equal(valeur(U, `delete from storage.objects where bucket_id = 'cours-images' returning id`), '');
  });

  console.log(`\n# pass ${ok}\n# fail 0`);
} catch (e) {
  console.error(e);
  console.log(`\n# pass ${ok}\n# fail 1`);
  process.exitCode = 1;
} finally {
  pg.arreter();
}
