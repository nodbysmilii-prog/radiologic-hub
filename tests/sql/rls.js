#!/usr/bin/env node
/* =========================================================
   Test du schéma Supabase du module Remplacements sur un PostgreSQL local
   (npm run test:sql). Démarre une base temporaire, applique la
   simulation de Supabase puis la migration, et vérifie les droits
   d'accès par ligne avec des utilisateurs fictifs.
   Nécessite les programmes PostgreSQL (initdb, pg_ctl, psql) ; le test
   est ignoré s'ils sont absents.
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
  console.log('Migration appliquée. Vérification des droits :');

  // Utilisateurs fictifs (connexion par lien magique → profil créé automatiquement)
  const nouveau = (email, meta = {}) => ({ id: admin(`insert into auth.users (email, raw_user_meta_data) values ('${email}', '${JSON.stringify(meta)}') returning id`), email });
  const R1 = nouveau('r1@exemple.tn', { nom: 'Test', prenom: 'Un' }), R2 = nouveau('r2@exemple.tn');
  const M1 = nouveau('m1@clinique-fictive.tn'), M2 = nouveau('m2@cabinet-fictif.tn'), A = nouveau('admin@exemple.tn');
  admin("insert into rp_admins (email) values ('admin@exemple.tn')");

  verifier('le profil est créé à la première connexion', () => {
    assert.equal(admin(`select nom || ' ' || prenom || ' ' || email from profils where id = '${R1.id}'`), 'Test Un r1@exemple.tn');
  });
  verifier("un visiteur non connecté ne lit rien", () => {
    assert.match(psql('select count(*) from profils', { role: 'anon' }).erreur, /permission denied/);
    assert.match(psql('select count(*) from rp_structures', { role: 'anon' }).erreur, /permission denied/);
  });

  // Inscriptions
  verifier("l'inscription d'un remplaçant reste « en attente » même s'il tente de se valider", () => {
    valeur(R1, `insert into rp_remplacants (id, statut, affectation, competences, gouvernorats, etat) values ('${R1.id}', 'specialiste', 'Service fictif', '{scanner,irm}', '{Tunis}', 'valide')`);
    assert.equal(admin(`select etat from rp_remplacants where id = '${R1.id}'`), 'en_attente');
    valeur(R1, `update rp_remplacants set etat = 'valide', affectation = 'Autre service' where id = '${R1.id}'`);
    assert.equal(admin(`select etat || ' ' || affectation from rp_remplacants where id = '${R1.id}'`), 'en_attente Autre service');
  });
  verifier("on ne peut pas s'inscrire à la place d'un autre", () => {
    assert.match(comme(R1, `insert into rp_remplacants (id, statut, affectation) values ('${R2.id}', 'specialiste', 'x')`).erreur, /row-level security/);
  });
  verifier('résidanat : année R3 à R5 obligatoire pour un résident', () => {
    assert.match(comme(R2, `insert into rp_remplacants (id, statut, affectation) values ('${R2.id}', 'resident', 'x')`).erreur, /check/);
    assert.match(comme(R2, `insert into rp_remplacants (id, statut, annee_residanat, affectation) values ('${R2.id}', 'resident', 2, 'x')`).erreur, /check/);
    valeur(R2, `insert into rp_remplacants (id, statut, annee_residanat, affectation, competences, gouvernorats) values ('${R2.id}', 'resident', 4, 'x', '{scanner}', '{Tunis}')`);
  });
  verifier("seul l'administrateur valide une inscription", () => {
    valeur(A, `update rp_remplacants set etat = 'valide' where id in ('${R1.id}', '${R2.id}')`);
    assert.equal(admin(`select string_agg(etat, ',') from rp_remplacants`), 'valide,valide');
  });
  let S1, S2;
  verifier('une structure créée a son créateur pour responsable, et reste en attente', () => {
    S1 = valeur(M1, "insert into rp_structures (nom, type, adresse, ville, gouvernorat, contact_nom, telephone, email, etat) values ('Clinique fictive', 'clinique', '1 rue Test', 'Tunis', 'Tunis', 'Mme Test', '71000000', 'contact@clinique-fictive.tn', 'valide') returning id").split('\n')[0];
    assert.equal(admin(`select etat from rp_structures where id = '${S1}'`), 'en_attente');
    assert.equal(admin(`select role from rp_membres where structure_id = '${S1}' and profil_id = '${M1.id}'`), 'responsable');
    S2 = valeur(M2, "insert into rp_structures (nom, type, adresse, ville, gouvernorat, contact_nom, telephone, email) values ('Cabinet fictif', 'cabinet', '2 rue Test', 'Sfax', 'Sfax', 'M. Test', '74000000', 'contact@cabinet-fictif.tn') returning id").split('\n')[0];
    admin(`update rp_structures set etat = 'valide'`);
  });
  verifier("une structure ne voit pas les autres structures ni les remplaçants", () => {
    assert.equal(valeur(M2, `select count(*) from rp_structures where id = '${S1}'`), '0');
    assert.equal(valeur(M1, `select count(*) from rp_remplacants`), '0');
    assert.equal(valeur(M1, `select count(*) from profils where id = '${R1.id}'`), '0');
    assert.equal(valeur(R1, `select count(*) from rp_structures`), '0');
  });

  // Disponibilités
  verifier('chacun gère ses seules disponibilités, invisibles des structures', () => {
    valeur(R1, `insert into rp_disponibilites (remplacant_id, date, creneau) values ('${R1.id}', '2026-10-15', 'journee')`);
    assert.match(comme(R1, `insert into rp_disponibilites (remplacant_id, date, creneau) values ('${R2.id}', '2026-10-15', 'journee')`).erreur, /row-level security/);
    assert.match(comme(R1, `insert into rp_disponibilites (remplacant_id, date, creneau) values ('${R1.id}', '2026-10-16', 'nuit')`).erreur, /check/);
    assert.equal(valeur(M1, 'select count(*) from rp_disponibilites'), '0');
  });

  // Demandes et propositions (écrites par l'agent avec la clé de service)
  let D, P1, P2;
  verifier("les demandes ne s'écrivent pas depuis le site (seulement par l'agent)", () => {
    assert.match(comme(M1, `insert into rp_demandes (structure_id, dates, heure_debut, heure_fin, type, modalites, profil, honoraires, unite) values ('${S1}', '{2026-10-15}', '08:00', '16:00', 'journee', '{scanner}', 'specialiste', 450, 'jour')`).erreur, /permission denied/);
    D = psql(`insert into rp_demandes (structure_id, cree_par, dates, heure_debut, heure_fin, type, modalites, profil, honoraires, unite) values ('${S1}', '${M1.id}', '{2026-10-15}', '08:00', '16:00', 'journee', '{scanner}', 'residents', 450, 'jour') returning id`, { role: 'service_role' }).sortie.split('\n')[0];
    P1 = psql(`insert into rp_propositions (demande_id, remplacant_id) values ('${D}', '${R1.id}') returning id`, { role: 'service_role' }).sortie.split('\n')[0];
    P2 = psql(`insert into rp_propositions (demande_id, remplacant_id) values ('${D}', '${R2.id}') returning id`, { role: 'service_role' }).sortie.split('\n')[0];
    assert.ok(D && P1 && P2);
  });
  verifier('le remplaçant contacté voit la demande, la structure et sa proposition', () => {
    assert.equal(valeur(R1, 'select count(*) from rp_demandes'), '1');
    assert.equal(valeur(R1, "select nom from rp_structures"), 'Clinique fictive');
    assert.equal(valeur(R1, 'select count(*) from rp_propositions'), '1', 'pas celle de R2');
    assert.equal(valeur(M2, 'select count(*) from rp_demandes'), '0');
  });
  verifier("la structure ne voit le remplaçant qu'après qu'il s'est dit disponible", () => {
    assert.equal(valeur(M1, 'select count(*) from rp_propositions'), '0');
    assert.equal(valeur(M1, `select count(*) from profils where id = '${R1.id}'`), '0');
    psql(`update rp_propositions set etat = 'interesse', reponse = 'disponible' where id = '${P1}'`, { role: 'service_role' });
    assert.equal(valeur(M1, 'select count(*) from rp_propositions'), '1');
    assert.equal(valeur(M1, `select email from profils where id = '${R1.id}'`), 'r1@exemple.tn');
    assert.equal(valeur(M1, `select statut from rp_remplacants where id = '${R1.id}'`), 'specialiste');
    assert.equal(valeur(M1, `select count(*) from profils where id = '${R2.id}'`), '0', 'R2 (sans réponse) reste invisible');
  });
  verifier('compteurs de la demande pour la structure (sans dévoiler qui a décliné)', () => {
    psql(`update rp_propositions set etat = 'decline' where id = '${P2}'`, { role: 'service_role' });
    assert.equal(valeur(M1, `select contactes || '/' || disponibles || '/' || declines from rp_compteurs(array['${D}']::uuid[])`), '2/1/1');
    assert.equal(valeur(M2, `select count(*) from rp_compteurs(array['${D}']::uuid[])`), '0');
  });
  verifier('jetons, journal et e-mails : inaccessibles depuis le site (journaux : administrateur)', () => {
    psql(`insert into rp_jetons (hash, action, demande_id) values ('abc', 'disponible', '${D}')`, { role: 'service_role' });
    psql("insert into rp_journal (action) values ('publication')", { role: 'service_role' });
    assert.match(comme(R1, 'select count(*) from rp_jetons').erreur, /permission denied/);
    assert.equal(valeur(M1, 'select count(*) from rp_journal'), '0');
    assert.equal(valeur(A, 'select count(*) from rp_journal'), '1');
  });

  // Membres et invitations
  verifier("invitation d'un collègue par e-mail, rattaché à sa première connexion", () => {
    valeur(M1, `insert into rp_invitations (structure_id, email) values ('${S1}', 'm3@clinique-fictive.tn')`);
    assert.match(comme(M2, `insert into rp_invitations (structure_id, email) values ('${S1}', 'pirate@exemple.tn')`).erreur, /row-level security/);
    const M3 = nouveau('m3@clinique-fictive.tn');
    assert.equal(valeur(M3, 'select rp_accepter_invitations()'), '1');
    assert.equal(valeur(M3, `select nom from rp_structures where id = '${S1}'`), 'Clinique fictive');
    assert.equal(valeur(M3, 'select count(*) from rp_membres'), '2', 'voit les membres de sa structure');
    valeur(M3, `update rp_structures set nom = 'Piratage' where id = '${S1}'`);
    assert.equal(admin(`select nom from rp_structures where id = '${S1}'`), 'Clinique fictive', 'un membre simple ne modifie pas la fiche');
    valeur(M1, `update rp_structures set attribution_auto = true, delai_relance_h = 6 where id = '${S1}'`);
    assert.equal(admin(`select attribution_auto || ' ' || delai_relance_h from rp_structures where id = '${S1}'`), 'true 6');
  });
  verifier('favoris : réservés aux membres de la structure', () => {
    valeur(M1, `insert into rp_favoris (structure_id, remplacant_id) values ('${S1}', '${R1.id}')`);
    assert.match(comme(M2, `insert into rp_favoris (structure_id, remplacant_id) values ('${S1}', '${R2.id}')`).erreur, /row-level security/);
  });
  verifier("profil : modifiable par son titulaire, sauf l'e-mail", () => {
    valeur(R1, `update profils set nom = 'Nouveau', email = 'autre@exemple.tn' where id = '${R1.id}'`);
    assert.equal(admin(`select nom || ' ' || email from profils where id = '${R1.id}'`), 'Nouveau r1@exemple.tn');
    valeur(R1, `update profils set nom = 'Pirate' where id = '${R2.id}'`);
    assert.notEqual(admin(`select nom from profils where id = '${R2.id}'`), 'Pirate');
  });
  verifier("statistiques réservées à l'administrateur", () => {
    assert.match(valeur(A, 'select rp_statistiques()'), /"remplacants": \{"valide": 2\}/);
    assert.match(comme(R1, 'select rp_statistiques()').erreur, /administrateur/);
  });
  verifier("justificatifs : dossier personnel privé, lisible par l'administrateur", () => {
    valeur(R1, `insert into storage.objects (bucket_id, name) values ('justificatifs', '${R1.id}/attestation.pdf')`);
    assert.match(comme(R1, `insert into storage.objects (bucket_id, name) values ('justificatifs', '${R2.id}/faux.pdf')`).erreur, /row-level security/);
    assert.equal(valeur(A, "select count(*) from storage.objects where bucket_id = 'justificatifs'"), '1');
    assert.equal(valeur(M1, "select count(*) from storage.objects"), '0');
  });
  verifier('suppression du compte : toutes les données du remplaçant sont effacées', () => {
    admin(`delete from auth.users where id = '${R2.id}'`);
    assert.equal(admin(`select count(*) from rp_remplacants where id = '${R2.id}'`), '0');
    assert.equal(admin(`select count(*) from rp_propositions where remplacant_id = '${R2.id}'`), '0');
  });
  verifier('suppression du compte du créateur d\'une structure : la structure reste, sans créateur', () => {
    admin(`delete from auth.users where id = '${M2.id}'`);
    assert.equal(admin(`select coalesce(cree_par::text, 'aucun') from rp_structures where id = '${S2}'`), 'aucun');
  });
  console.log(`\n# pass ${ok}\n# fail 0`);
} catch (e) {
  console.error(e.message);
  console.log(`\n# pass ${ok}\n# fail 1`);
  process.exitCode = 1;
} finally {
  pg.arreter();
}
