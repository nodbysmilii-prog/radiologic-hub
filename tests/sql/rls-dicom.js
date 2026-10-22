#!/usr/bin/env node
/* =========================================================
   Test du schéma Supabase de l'Espace DICOM
   (supabase/migrations/…_espace_dicom.sql) sur un PostgreSQL local,
   exposition automatique désactivée (npm run test:sql) :
   rôles (radiologue, membre, résident, administrateur), validation des
   résidents par un senior, droits par examen, écritures réservées à
   dicom-api, journal en ajout seul, aucune identité de patient.
   Données fictives.
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
const service = sql => psql(sql, { role: 'service_role' });
const serviceOk = sql => { const r = service(sql); if (r.erreur) throw new Error(r.erreur); return r.sortie; };
const role = u => valeur(u, 'select coalesce(dc_role(), \'aucun\')');
const droits = (u, e) => valeur(u, `select array_to_string(dc_droits('${e}'), ',')`);
let n = 0;
const orthancId = () => { n++; const h = n.toString(16).padStart(8, '0'); return [h, 'aaaaaaaa', 'bbbbbbbb', 'cccccccc', 'dddddddd'].join('-'); };
const etudeUid = () => `2.25.${1000 + n}`;

try {
  console.log('Espace DICOM : vérification des droits :');
  const nouveau = email => ({ id: admin(`insert into auth.users (email) values ('${email}') returning id`), email });
  const ADM = nouveau('admin@exemple.tn');
  const RAD = nouveau('radiologue@exemple.tn');         // remplaçant spécialiste validé, membre de la clinique A
  const RAD2 = nouveau('radiologue2@exemple.tn');       // Communauté : spécialiste vérifié Dr, sans structure
  const RADB = nouveau('radiologue-b@exemple.tn');      // remplaçant spécialiste validé, membre de la clinique B
  const SPE = nouveau('specialiste@exemple.tn');        // spécialiste pas encore validé
  const RESP = nouveau('responsable@exemple.tn');       // responsable de la clinique A (non radiologue)
  const SEC = nouveau('secretariat@exemple.tn');        // membre de la clinique A
  const RES = nouveau('resident@exemple.tn');           // résident (Remplacements), membre de la clinique A
  const RES2 = nouveau('resident2@exemple.tn');         // résident (Communauté), sans structure
  const X = nouveau('inconnu@exemple.tn');
  admin("insert into rp_admins (email) values ('admin@exemple.tn')");
  // Validations faites par l'administrateur (clé de service, comme les modules Remplacements et Communauté)
  serviceOk(`insert into rp_remplacants (id, statut, affectation, etat) values ('${RAD.id}', 'specialiste', 'x', 'valide'), ('${RADB.id}', 'specialiste', 'x', 'valide'), ('${SPE.id}', 'specialiste', 'x', 'en_attente')`);
  serviceOk(`insert into rp_remplacants (id, statut, annee_residanat, affectation, etat) values ('${RES.id}', 'resident', 4, 'x', 'valide')`);
  serviceOk(`insert into rs_membres (id, prenom, nom, titre, statut, verifie) values ('${RAD2.id}', 'Ali', 'Test', 'Dr', 'specialiste', true)`);
  serviceOk(`insert into rs_membres (id, prenom, nom, statut, annee) values ('${RES2.id}', 'Sami', 'Test', 'resident', 3)`);
  const structure = (nom, etat, resp) => serviceOk(`insert into rp_structures (nom, type, adresse, ville, gouvernorat, contact_nom, telephone, email, etat, cree_par)
      values ('${nom}', 'clinique', '1 rue Test', 'Tunis', 'Tunis', 'Mme Test', '71000000', 'contact@fictive.tn', '${etat}', '${resp.id}') returning id`).split('\n')[0];
  const A = structure('Clinique A', 'valide', RESP);
  const B = structure('Clinique B', 'valide', RADB);
  const C = structure('Clinique C', 'en_attente', X);
  admin(`insert into rp_membres (structure_id, profil_id, role) values ('${A}', '${RAD.id}', 'membre'), ('${A}', '${SEC.id}', 'membre'), ('${A}', '${RES.id}', 'membre')`);

  verifier('rôles : admin, radiologues validés, membre de structure validée ; rien pour les autres', () => {
    assert.equal(role(ADM), 'admin');
    assert.equal(role(RAD), 'radiologue');
    assert.equal(role(RAD2), 'radiologue', 'membre de la Communauté vérifié Dr, spécialiste');
    assert.equal(role(RESP), 'membre');
    assert.equal(role(SEC), 'membre');
    assert.equal(role(SPE), 'aucun', 'spécialiste pas encore validé');
    assert.equal(role(X), 'aucun', 'membre d\'une structure non validée');
    assert.equal(role(RES), 'aucun', 'un résident rattaché à une clinique n\'a pas le rôle membre');
    assert.equal(role(RES2), 'aucun');
    assert.equal(psql('select dc_role()', { role: 'anon' }).erreur ? 'refusé' : 'accepté', 'refusé');
  });

  verifier('résident : demande « en attente », impossible de se valider soi-même', () => {
    valeur(RES, `insert into dc_residents (profil_id, structure_id, etat, valide_par) values ('${RES.id}', '${A}', 'valide', '${RES.id}')`);
    assert.equal(admin(`select etat || ' ' || coalesce(valide_par::text, '-') from dc_residents where profil_id = '${RES.id}'`), 'en_attente -');
    assert.equal(valeur(RES, `update dc_residents set etat = 'valide' returning etat`), '', 'pas de droit de mise à jour');
    refuse(RES, `insert into dc_residents (profil_id, structure_id) values ('${RES2.id}', '${A}')`);
    assert.match(comme(RES2, `insert into dc_residents (profil_id, structure_id) values ('${RES2.id}', '${C}')`).erreur, /structure non validée/);
    assert.equal(role(RES), 'aucun');
  });

  verifier('résident : ni le responsable non radiologue, ni un radiologue d\'une autre structure ne valident', () => {
    assert.equal(valeur(RESP, `update dc_residents set etat = 'valide' returning etat`), '');
    assert.equal(valeur(RADB, `update dc_residents set etat = 'valide' returning etat`), '');
    assert.equal(valeur(RADB, 'select count(*) from dc_residents'), '0', 'il ne voit pas la demande');
    assert.equal(admin(`select etat from dc_residents where profil_id = '${RES.id}'`), 'en_attente');
  });

  verifier('résident : validé par un radiologue senior de la structure (signé et daté)', () => {
    assert.equal(valeur(RAD, `select dc_mon_espace() ->> 'residents_a_valider'`), '1');
    assert.equal(valeur(RAD, `update dc_residents set etat = 'valide', valide_par = '${ADM.id}' returning etat`), 'valide');
    assert.equal(admin(`select (valide_par = '${RAD.id}')::text || ' ' || (valide_le is not null)::text from dc_residents where profil_id = '${RES.id}'`), 'true true');
    assert.equal(role(RES), 'resident');
    assert.equal(valeur(RES, `select dc_mon_espace() -> 'structures' -> 0 ->> 'role'`), 'resident');
  });

  verifier('résident : un administrateur peut aussi valider ; un résident ne peut pas valider un autre', () => {
    valeur(RES2, `insert into dc_residents (profil_id, structure_id) values ('${RES2.id}', '${B}')`);
    assert.equal(valeur(RES, `update dc_residents set etat = 'valide' where profil_id = '${RES2.id}' returning etat`), '');
    assert.equal(valeur(ADM, `update dc_residents set etat = 'valide' where profil_id = '${RES2.id}' returning etat`), 'valide');
    assert.equal(role(RES2), 'resident');
  });

  let EA, EA2, EP, EB;
  verifier('examens : enregistrés par dicom-api (clé de service) ; date de purge selon la conservation', () => {
    EA = serviceOk(`insert into dc_examens (orthanc_id, etude_uid, structure_id, depose_par, nb_instances, taille_octets) values ('${orthancId()}', '${etudeUid()}', '${A}', '${SEC.id}', 120, 6300000) returning id`).split('\n')[0];
    EA2 = serviceOk(`insert into dc_examens (orthanc_id, etude_uid, structure_id, depose_par) values ('${orthancId()}', '${etudeUid()}', '${A}', '${RAD.id}') returning id`).split('\n')[0];
    EP = serviceOk(`insert into dc_examens (orthanc_id, etude_uid, depose_par) values ('${orthancId()}', '${etudeUid()}', '${RAD2.id}') returning id`).split('\n')[0];
    EB = serviceOk(`insert into dc_examens (orthanc_id, etude_uid, structure_id, source) values ('${orthancId()}', '${etudeUid()}', '${B}', 'passerelle') returning id`).split('\n')[0];
    assert.equal(admin(`select (purge_le::date - depose_le::date) from dc_examens where id = '${EA}'`), '365');
  });

  verifier('examens : dépôt refusé pour un résident, un inconnu, un membre hors de sa structure, un espace personnel non radiologue', () => {
    for (const [u, s] of [[RES, A], [X, A], [SEC, B], [SEC, null], [SPE, null]]) {
      assert.match(service(`insert into dc_examens (orthanc_id, etude_uid, structure_id, depose_par) values ('${orthancId()}', '${etudeUid()}', ${s ? `'${s}'` : 'null'}, '${u.id}')`).erreur || 'ACCEPTÉ', /ne peut pas déposer/, u.email);
    }
    assert.match(service(`insert into dc_examens (orthanc_id, etude_uid) values ('${orthancId()}', '${etudeUid()}')`).erreur || 'ACCEPTÉ', /passerelle/);
    assert.equal(valeur(SEC, `select dc_peut_importer('${A}')::text || dc_peut_importer('${B}')::text`), 'truefalse');
    assert.equal(valeur(RES, `select dc_peut_importer('${A}')::text`), 'false');
    assert.equal(valeur(RAD2, 'select dc_peut_importer(null)::text'), 'true');
  });

  verifier('examens : un même UID d\'étude n\'appartient qu\'à un seul espace', () => {
    const uid = admin(`select etude_uid from dc_examens where id = '${EA}'`);
    assert.match(service(`insert into dc_examens (orthanc_id, etude_uid, depose_par) values ('${orthancId()}', '${uid}', '${RAD2.id}')`).erreur || 'ACCEPTÉ', /duplicate key|unique/);
  });

  verifier('examens : chacun ne voit que ceux de sa structure ou de son espace personnel', () => {
    const vus = u => valeur(u, 'select count(*) from dc_examens');
    assert.equal(vus(SEC), '2'); assert.equal(vus(RESP), '2'); assert.equal(vus(RAD), '2');
    assert.equal(vus(RES), '2', 'résident validé : examens de sa structure');
    assert.equal(vus(RAD2), '1', 'espace personnel');
    assert.equal(vus(RADB), '1'); assert.equal(vus(RES2), '1');
    assert.equal(vus(X), '0'); assert.equal(vus(SPE), '0');
    assert.equal(vus(ADM), '4');
    assert.match(psql('select count(*) from dc_examens', { role: 'anon' }).erreur, /permission denied/);
  });

  verifier('droits : supprimer = déposant, responsable ou administrateur ; résident = voir et commenter', () => {
    assert.equal(droits(SEC, EA), 'commenter,inviter,partager,supprimer,voir', 'déposant');
    assert.equal(droits(RAD, EA), 'commenter,inviter,partager,voir', 'radiologue de la structure, non déposant');
    assert.equal(droits(RESP, EA2), 'commenter,inviter,partager,supprimer,voir', 'responsable');
    assert.equal(droits(SEC, EA2), 'commenter,inviter,partager,voir');
    assert.equal(droits(RES, EA), 'commenter,voir');
    assert.equal(droits(RAD2, EP), 'commenter,inviter,partager,supprimer,voir', 'espace personnel');
    assert.equal(droits(RAD, EP), '');
    assert.equal(droits(ADM, EB), 'commenter,inviter,partager,supprimer,voir');
    assert.equal(droits(X, EA), '');
  });

  verifier('relais des images : droits par UID d\'étude', () => {
    const uid = admin(`select etude_uid from dc_examens where id = '${EA}'`);
    assert.equal(valeur(RES, `select array_to_string(droits, ',') from dc_droits_etude('${uid}')`), 'commenter,voir');
    assert.equal(valeur(RADB, `select array_to_string(droits, ',') from dc_droits_etude('${uid}')`), '');
    assert.equal(valeur(RADB, `select count(*) from dc_droits_etude('2.25.999999')`), '0');
  });

  verifier('télé-expertise : seul un radiologue validé est invité ; l\'invitation ouvre puis referme l\'accès', () => {
    for (const u of [RES2, X, SEC]) assert.match(service(`insert into dc_expertises (examen_id, expert_id) values ('${EA}', '${u.id}')`).erreur || 'ACCEPTÉ', /radiologue validé/, u.email);
    const inv = serviceOk(`insert into dc_expertises (examen_id, expert_id, invite_par) values ('${EA}', '${RADB.id}', '${SEC.id}') returning id`).split('\n')[0];
    assert.equal(droits(RADB, EA), 'commenter,voir');
    assert.equal(valeur(RADB, 'select count(*) from dc_examens'), '2');
    assert.equal(valeur(RES, 'select count(*) from dc_expertises'), '1', 'le résident suit la télé-expertise');
    serviceOk(`update dc_expertises set close_le = now() where id = '${inv}'`);
    assert.equal(droits(RADB, EA), '');
  });

  verifier('liens de partage : écrits par dicom-api ; lisibles de ceux qui partagent, sans les empreintes', () => {
    const jeton = 'a'.repeat(64);
    serviceOk(`insert into dc_partages (examen_id, cree_par, jeton_empreinte, duree, expire_le, code_empreinte) values ('${EA}', '${SEC.id}', '${jeton}', '7j', now() + interval '7 days', 'scrypt$x')`);
    assert.match(service(`insert into dc_partages (examen_id, jeton_empreinte, duree, expire_le) values ('${EA}', '${'b'.repeat(64)}', '30j', now() + interval '60 days')`).erreur || 'ACCEPTÉ', /check/, '30 jours au plus');
    refuse(SEC, `insert into dc_partages (examen_id, jeton_empreinte, duree, expire_le) values ('${EA}', '${'c'.repeat(64)}', '24h', now() + interval '1 day')`);
    assert.equal(valeur(SEC, 'select duree || \' \' || avec_code::text from dc_partages'), '7j true');
    assert.match(comme(SEC, 'select jeton_empreinte from dc_partages').erreur, /permission denied/);
    assert.match(comme(SEC, 'select code_empreinte from dc_partages').erreur, /permission denied/);
    assert.equal(valeur(RES, 'select count(*) from dc_partages'), '0', 'le résident ne gère pas les liens');
    refuse(SEC, 'update dc_partages set revoque_le = now()');
  });

  verifier('écritures des examens réservées à dicom-api', () => {
    refuse(SEC, `insert into dc_examens (orthanc_id, etude_uid, structure_id, depose_par) values ('${orthancId()}', '${etudeUid()}', '${A}', '${SEC.id}')`);
    refuse(SEC, `update dc_examens set structure_id = '${B}'`);
    refuse(SEC, 'delete from dc_examens');
    refuse(ADM, 'delete from dc_examens');
    assert.equal(admin('select count(*) from dc_examens'), '4');
    serviceOk(`update dc_examens set orthanc_id = '${orthancId()}', nb_instances = 121 where id = '${EA}'`);
    assert.equal(admin(`select nb_instances || ' ' || (orthanc_id like '00000001-%')::text from dc_examens where id = '${EA}'`), '121 true', 'identifiants figés');
  });

  verifier('structure suspendue : ses membres et résidents perdent l\'accès ; elle ne se supprime pas avec des examens', () => {
    serviceOk(`update rp_structures set etat = 'suspendu' where id = '${A}'`);
    assert.equal(role(SEC), 'aucun'); assert.equal(role(RES), 'aucun');
    assert.equal(valeur(SEC, 'select count(*) from dc_examens'), '0');
    assert.equal(role(RAD), 'radiologue', 'reste radiologue (espace personnel)');
    assert.equal(droits(RAD, EA), '');
    serviceOk(`update rp_structures set etat = 'valide' where id = '${A}'`);
    assert.equal(valeur(SEC, 'select count(*) from dc_examens'), '2');
    assert.match(comme(RESP, `delete from rp_structures where id = '${A}'`).erreur || 'ACCEPTÉ', /foreign key|violates/);
  });

  verifier('journal : ajout par dicom-api, ni modification ni vidage ; lecture par ceux qui gèrent l\'examen', () => {
    serviceOk(`insert into dc_journal (acteur, examen_id, action, ip, navigateur) values ('${SEC.id}', '${EA}', 'consultation', '196.203.1.2', 'Test')`);
    serviceOk(`insert into dc_journal (examen_id, action, ip) values ('${EA}', 'partage_consulte', '41.226.3.4')`);
    refuse(SEC, `insert into dc_journal (acteur, action) values ('${SEC.id}', 'consultation')`);
    assert.match(service('update dc_journal set ip = null').erreur || 'ACCEPTÉ', /ne se modifie pas|permission denied/);
    assert.match(service('delete from dc_journal').erreur || 'ACCEPTÉ', /durée de conservation/);
    assert.match(service('truncate dc_journal').erreur || 'ACCEPTÉ', /permission denied|ne se vide pas/);
    assert.match(psql('truncate dc_journal').erreur || 'ACCEPTÉ', /ne se vide pas/, 'même pour le propriétaire de la base');
    assert.equal(valeur(SEC, 'select count(*) from dc_journal'), '2');
    assert.equal(valeur(RES, 'select count(*) from dc_journal'), '0');
    assert.equal(valeur(ADM, 'select count(*) from dc_journal'), '2');
    admin("alter table dc_journal disable trigger dc_journal_protege; update dc_journal set quand = now() - interval '4 years' where action = 'partage_consulte'; alter table dc_journal enable trigger dc_journal_protege");
    assert.equal(serviceOk("delete from dc_journal where quand < now() - interval '3 years' returning action"), 'partage_consulte', 'purge des entrées anciennes');
  });

  verifier('réglages : lus par les comptes de l\'Espace DICOM, modifiés par l\'administrateur seulement', () => {
    assert.equal(valeur(SEC, 'select conservation_jours from dc_reglages'), '365');
    assert.equal(valeur(X, 'select count(*) from dc_reglages'), '0');
    assert.equal(valeur(SEC, 'update dc_reglages set conservation_jours = 10 returning id'), '');
    assert.equal(valeur(ADM, 'update dc_reglages set conservation_jours = 180 returning conservation_jours'), '180');
    refuse(ADM, 'insert into dc_reglages (id) values (false)');
  });

  verifier('passerelles : visibles du responsable et de l\'administrateur, sans l\'empreinte de la clé', () => {
    serviceOk(`insert into dc_passerelles (structure_id, nom, cle_empreinte) values ('${A}', 'Scanner salle 1', '${'d'.repeat(64)}')`);
    assert.equal(valeur(RESP, 'select nom from dc_passerelles'), 'Scanner salle 1');
    assert.equal(valeur(SEC, 'select count(*) from dc_passerelles'), '0');
    assert.match(comme(RESP, 'select cle_empreinte from dc_passerelles').erreur, /permission denied/);
  });

  verifier('aucune colonne d\'identité du patient ni de texte libre médical dans les tables dc_*', () => {
    const cols = admin("select table_name || '.' || column_name from information_schema.columns where table_schema = 'public' and table_name like 'dc\\_%'").split('\n');
    const interdits = cols.filter(c => /patient|naissance|sexe|description|commentaire|texte|compte_rendu|email|telephone|\.nom_|prenom|libelle/.test(c));
    assert.deepEqual(interdits, []);
    assert.ok(cols.includes('dc_passerelles.nom'), 'seul « nom » : celui de la passerelle (ex. « Scanner salle 1 »)');
  });

  verifier('suppression d\'un compte : ses invitations disparaissent, ses examens restent à sa structure', () => {
    admin(`delete from auth.users where id = '${SEC.id}'`);
    assert.equal(admin(`select count(*) || ' ' || count(depose_par) from dc_examens where structure_id = '${A}'`), '2 1');
    assert.equal(droits(RESP, EA), 'commenter,inviter,partager,supprimer,voir');
  });
} finally {
  pg.arreter();
}
console.log(`\n# pass ${ok}`);
