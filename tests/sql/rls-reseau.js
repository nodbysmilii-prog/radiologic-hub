#!/usr/bin/env node
/* =========================================================
   Test du schéma Supabase de la Communauté (supabase/migrations/…_reseau.sql)
   sur un PostgreSQL local (npm run test:sql) : profils publics, publication
   réservée aux comptes vérifiés, cas réservés aux membres, compteurs,
   notifications, messagerie privée, blocage, signalements, stockage,
   suppression du compte. Utilisateurs et cas fictifs.
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
const service = sql => { const r = psql(sql, { role: 'service_role' }); if (r.erreur) throw new Error(r.erreur); return r.sortie; };

try {
  console.log('Communauté : vérification des droits :');
  const nouveau = (email, meta = {}) => ({ id: admin(`insert into auth.users (email, raw_user_meta_data) values ('${email}', '${JSON.stringify(meta)}') returning id`), email });
  const A = nouveau('amel@exemple.tn', { full_name: 'Amel TEST', avatar_url: 'https://exemple.tn/a.jpg' });   // compte Google
  const B = nouveau('sami@exemple.tn', { given_name: 'Sami', family_name: 'EXEMPLE' });
  const C = nouveau('curieux@exemple.tn'), D = nouveau('d@exemple.tn'), E = nouveau('e@exemple.tn'), ADM = nouveau('admin@exemple.tn');
  admin("insert into rp_admins (email) values ('admin@exemple.tn')");
  const membre = (u, prenom, nom, extra = '') => valeur(u, `insert into rs_membres (id, prenom, nom, titre, statut, annee${extra ? ', verifie' : ''}) values ('${u.id}', '${prenom}', '${nom}', 'Dr', 'resident', 4${extra ? ', true' : ''})`);
  const CAS = (titre = 'Douleur fébrile de la FID') => `insert into rs_cas (titre, histoire, specialite, modalites, images, attestation) values ('${titre}', 'Patient fictif de 40 ans, fièvre et douleur.', 'digestif', '{scanner}', '[{"chemin":"x/1.jpg"}]', true) returning id`;

  verifier('compte Google : prénom et nom repris de Google', () => {
    assert.equal(admin(`select prenom || '|' || nom from profils where id = '${A.id}'`), 'Amel|TEST');
    assert.equal(admin(`select prenom || '|' || nom from profils where id = '${B.id}'`), 'Sami|EXEMPLE');
  });
  verifier('sans profil complété, on ne voit ni membres ni cas', () => {
    membre(A, 'Amel', 'TEST');
    assert.equal(valeur(C, 'select count(*) from rs_membres'), '0');
    assert.match(psql('select count(*) from rs_membres', { role: 'anon' }).erreur, /permission denied/);
  });
  verifier('on ne se déclare pas « vérifié » soi-même, ni à la place d\'un autre', () => {
    membre(B, 'Sami', 'EXEMPLE', 'verifie');
    assert.equal(admin(`select verifie from rs_membres where id = '${B.id}'`), 'f');
    valeur(B, `update rs_membres set verifie = true, suspendu = false, bio = 'Résident fictif' where id = '${B.id}'`);
    assert.equal(admin(`select verifie || ' ' || bio from rs_membres where id = '${B.id}'`), 'false Résident fictif');
    refuse(C, `insert into rs_membres (id, prenom, nom, statut) values ('${D.id}', 'X', 'Y', 'autre')`);
  });
  verifier('les membres voient les profils publics, jamais l\'e-mail ni le téléphone des autres', () => {
    membre(C, 'Curieux', 'FICTIF'); membre(D, 'Dora', 'FICTIVE'); membre(E, 'Eli', 'FICTIF'); membre(ADM, 'Admin', 'SITE');
    assert.equal(valeur(C, 'select count(*) from rs_membres'), '6');
    assert.equal(valeur(C, `select count(*) from profils where id = '${A.id}'`), '0');
  });
  let cas;
  verifier('publier : refusé à un compte non vérifié, accepté après vérification par l\'administrateur', () => {
    refuse(A, CAS());
    valeur(ADM, `update rs_membres set verifie = true where id = '${A.id}'`);
    assert.equal(admin(`select (verifie_le is not null)::text from rs_membres where id = '${A.id}'`), 'true');
    cas = valeur(A, CAS()).split('\n')[0];
    assert.equal(admin(`select auteur_id = '${A.id}' and etat = 'publie' and nb_jaime = 0 from rs_cas where id = '${cas}'`), 't');
  });
  verifier('un remplaçant validé peut publier sans vérification séparée', () => {
    service(`insert into rp_remplacants (id, statut, annee_residanat, affectation, etat) values ('${D.id}', 'resident', 4, 'Service fictif', 'valide')`);
    assert.ok(valeur(D, CAS('Cas fictif du remplaçant')));
  });
  verifier('attestation d\'anonymisation obligatoire ; champs réservés protégés', () => {
    refuse(A, `insert into rs_cas (titre, histoire, specialite, modalites, images, attestation) values ('Cas sans attestation', 'Histoire fictive assez longue.', 'neuro', '{irm}', '[{}]', false)`, /check/);
    const id = valeur(A, `insert into rs_cas (titre, histoire, specialite, modalites, images, attestation, auteur_id, etat, nb_jaime) values ('Tentative de triche', 'Histoire fictive assez longue.', 'neuro', '{irm}', '[{}]', true, '${B.id}', 'masque', 99) returning id`).split('\n')[0];
    assert.equal(admin(`select auteur_id = '${A.id}' and etat = 'publie' and nb_jaime = 0 from rs_cas where id = '${id}'`), 't');
    valeur(A, `update rs_cas set etat = 'masque', nb_jaime = 50, titre = 'Titre corrigé du cas' where id = '${id}'`);
    assert.equal(admin(`select etat || ' ' || nb_jaime || ' ' || titre || ' ' || (modifie_le is not null) from rs_cas where id = '${id}'`), 'publie 0 Titre corrigé du cas true');
    assert.equal(valeur(B, `update rs_cas set titre = 'Vandalisme' where id = '${id}' returning id`), '', 'aucune ligne modifiable');
    assert.equal(admin(`select titre from rs_cas where id = '${id}'`), 'Titre corrigé du cas');
  });
  verifier('cas réservés aux membres connectés', () => {
    assert.match(psql('select count(*) from rs_cas', { role: 'anon' }).erreur, /permission denied/);
    assert.ok(Number(valeur(C, 'select count(*) from rs_cas')) >= 2);
  });
  verifier('j\'aime et commentaires : compteurs et notifications à l\'auteur', () => {
    valeur(B, `insert into rs_jaime (cas_id, membre_id) values ('${cas}', '${B.id}')`);
    valeur(C, `insert into rs_jaime (cas_id, membre_id) values ('${cas}', '${C.id}')`);
    refuse(C, `insert into rs_jaime (cas_id, membre_id) values ('${cas}', '${B.id}')`);
    valeur(B, `insert into rs_commentaires (cas_id, auteur_id, texte) values ('${cas}', '${B.id}', 'Appendicite ? (commentaire fictif)')`);
    assert.equal(admin(`select nb_jaime || '/' || nb_commentaires from rs_cas where id = '${cas}'`), '2/1');
    valeur(C, `delete from rs_jaime where cas_id = '${cas}' and membre_id = '${C.id}'`);
    assert.equal(admin(`select nb_jaime from rs_cas where id = '${cas}'`), '1');
    assert.equal(valeur(A, `select string_agg(type, ',' order by cree_le) from rs_notifications`), 'verification,jaime,jaime,commentaire');
    assert.equal(valeur(B, 'select count(*) from rs_notifications'), '0', 'chacun ne voit que ses notifications');
  });
  verifier('abonnement : notification, puis « nouveau cas » de la personne suivie', () => {
    valeur(C, `insert into rs_abonnements (suiveur_id, suivi_id) values ('${C.id}', '${A.id}')`);
    valeur(A, CAS('Nouveau cas fictif pour les abonnés'));
    assert.equal(valeur(C, `select string_agg(type, ',') from rs_notifications`), 'nouveau_cas');
    assert.equal(valeur(A, `select count(*) from rs_notifications where type = 'abonnement'`), '1');
    valeur(C, 'update rs_notifications set lu = true');
    refuse(C, `update rs_notifications set type = 'jaime'`, /permission denied/);
  });
  let conv;
  verifier('messagerie : conversation à deux, unique, invisible des autres', () => {
    conv = valeur(A, `select rs_ouvrir_conversation('${B.id}')`);
    assert.equal(valeur(B, `select rs_ouvrir_conversation('${A.id}')`), conv, 'même conversation dans les deux sens');
    valeur(A, `insert into rs_messages (conversation_id, texte) values ('${conv}', 'Bonjour Sami, message fictif.')`);
    assert.equal(valeur(B, `select count(*) from rs_messages where conversation_id = '${conv}'`), '1');
    assert.equal(valeur(C, `select count(*) from rs_messages where conversation_id = '${conv}'`), '0');
    refuse(C, `insert into rs_messages (conversation_id, texte) values ('${conv}', 'intrusion')`);
    refuse(A, `insert into rs_messages (conversation_id, texte, auteur_id) values ('${conv}', 'usurpation', '${B.id}')`, /permission denied/);
  });
  verifier('messagerie : aperçu, non lus, lecture, suppression d\'un message', () => {
    assert.equal(valeur(B, `select non_lus || ' ' || dernier_message from rs_mes_conversations()`), '1 Bonjour Sami, message fictif.');
    valeur(B, `update rs_participants set lu_le = now() where conversation_id = '${conv}' and membre_id = '${B.id}'`);
    assert.equal(valeur(B, `select non_lus from rs_mes_conversations()`), '0');
    const m = valeur(B, `insert into rs_messages (conversation_id, texte) values ('${conv}', 'Réponse fictive') returning id`).split('\n')[0];
    refuse(B, `update rs_messages set texte = 'modifié' where id = '${m}'`, /permission denied/);
    assert.equal(valeur(A, `select dernier_message from rs_mes_conversations()`), 'Réponse fictive');
    valeur(B, `update rs_messages set supprime = true where id = '${m}'`);
    assert.equal(admin(`select supprime || '|' || texte || '|' from rs_messages where id = '${m}'`), 'true||');
    assert.equal(valeur(A, `select dernier_message from rs_mes_conversations()`), 'Message supprimé', 'l\'aperçu ne garde pas le texte supprimé');
    assert.equal(valeur(A, `update rs_messages set supprime = true where id = '${m}' returning id`), '', 'pas le message d\'un autre');
  });
  verifier('blocage : plus de message, plus de cas visibles, pas de nouvelle conversation', () => {
    valeur(B, `insert into rs_blocages (bloqueur_id, bloque_id) values ('${B.id}', '${A.id}')`);
    refuse(A, `insert into rs_messages (conversation_id, texte) values ('${conv}', 'encore moi')`);
    assert.match(comme(A, `select rs_ouvrir_conversation('${B.id}')`).erreur, /bloqué/);
    assert.equal(valeur(B, `select count(*) from rs_cas where auteur_id = '${A.id}'`), '0');
    valeur(B, `delete from rs_blocages where bloque_id = '${A.id}'`);
    assert.ok(Number(valeur(B, `select count(*) from rs_cas where auteur_id = '${A.id}'`)) > 0);
  });
  verifier('signalements : 3 « patient identifiable » masquent le cas en attendant l\'administrateur', () => {
    for (const u of [B, C]) valeur(u, `insert into rs_signalements (cible_type, cible_id, motif) values ('cas', '${cas}', 'identite')`);
    refuse(C, `insert into rs_signalements (cible_type, cible_id, motif) values ('cas', '${cas}', 'identite')`, /duplicate|unique/);
    assert.equal(admin(`select etat from rs_cas where id = '${cas}'`), 'publie');
    valeur(E, `insert into rs_signalements (cible_type, cible_id, motif) values ('cas', '${cas}', 'identite')`);
    assert.equal(admin(`select etat from rs_cas where id = '${cas}'`), 'masque');
    assert.equal(valeur(C, `select count(*) from rs_cas where id = '${cas}'`), '0', 'invisible des membres');
    assert.equal(valeur(A, `select count(*) from rs_cas where id = '${cas}'`), '1', 'visible de son auteur');
    assert.equal(valeur(A, `select count(*) from rs_notifications where type = 'cas_masque'`), '1');
    assert.equal(valeur(B, 'select count(*) from rs_signalements'), '1', 'chacun ne voit que ses signalements');
    assert.equal(valeur(ADM, 'select count(*) from rs_signalements'), '3');
    valeur(ADM, `update rs_signalements set traite_le = now(), decision = 'rejete' where cible_id = '${cas}'`);
    valeur(ADM, `update rs_cas set etat = 'publie', masque_motif = null where id = '${cas}'`);
    assert.equal(valeur(C, `select count(*) from rs_cas where id = '${cas}'`), '1');
  });
  verifier('compte suspendu : ne commente plus, profil masqué', () => {
    valeur(ADM, `update rs_membres set suspendu = true where id = '${E.id}'`);
    refuse(E, `insert into rs_commentaires (cas_id, auteur_id, texte) values ('${cas}', '${E.id}', 'spam')`);
    assert.equal(valeur(C, `select count(*) from rs_membres where id = '${E.id}'`), '0');
  });
  verifier('stockage : photos dans son dossier, images de cas réservées aux comptes vérifiés, images de messages aux participants', () => {
    valeur(C, `insert into storage.objects (bucket_id, name) values ('avatars', '${C.id}/photo.jpg')`);
    refuse(C, `insert into storage.objects (bucket_id, name) values ('avatars', '${A.id}/photo.jpg')`);
    refuse(C, `insert into storage.objects (bucket_id, name) values ('cas-images', '${C.id}/1.jpg')`);
    valeur(A, `insert into storage.objects (bucket_id, name) values ('cas-images', '${A.id}/1.jpg')`);
    assert.equal(valeur(B, `select count(*) from storage.objects where bucket_id = 'cas-images'`), '1');
    valeur(B, `insert into storage.objects (bucket_id, name) values ('messages-images', '${conv}/${B.id}/radio.jpg')`);
    refuse(C, `insert into storage.objects (bucket_id, name) values ('messages-images', '${conv}/${C.id}/x.jpg')`);
    assert.equal(valeur(C, `select count(*) from storage.objects where bucket_id = 'messages-images'`), '0');
    assert.equal(valeur(A, `select count(*) from storage.objects where bucket_id = 'messages-images'`), '1');
  });
  verifier('rappels e-mail des messages non lus : clé de service seulement, une fois par message', () => {
    assert.match(comme(A, `select * from rs_rappels_messages()`).erreur, /permission denied/);
    service(`update rs_messages set cree_le = now() - interval '2 hours' where conversation_id = '${conv}'`);
    admin(`update rs_participants set lu_le = now() - interval '3 hours' where conversation_id = '${conv}'`);
    const r = service(`select email || '|' || non_lus || '|' || de from rs_rappels_messages() order by email`);
    assert.equal(r, 'sami@exemple.tn|1|Amel TEST', 'Amel n\'a rien à lire : la réponse de Sami a été supprimée');
    assert.equal(service('select count(*) from rs_rappels_messages()'), '0', 'pas de second rappel pour les mêmes messages');
  });
  verifier('supprimer son compte efface son profil, ses cas et le contenu de ses messages', () => {
    const avant = admin(`select count(*) from rs_cas where auteur_id = '${D.id}'`);
    assert.equal(avant, '1');
    const convD = valeur(D, `select rs_ouvrir_conversation('${A.id}')`);
    const msgD = valeur(D, `insert into rs_messages (conversation_id, texte) values ('${convD}', 'Message fictif de Dora') returning id`).split('\n')[0];
    valeur(D, 'select rs_supprimer_mon_compte()');
    assert.equal(admin(`select coalesce(auteur_id::text, 'aucun') || '|' || supprime || '|' || texte || '|' from rs_messages where id = '${msgD}'`), 'aucun|true||');
    assert.equal(valeur(A, `select dernier_message from rs_mes_conversations() where conversation_id = '${convD}'`), 'Message supprimé');
    assert.equal(admin(`select count(*) from auth.users where id = '${D.id}'`), '0');
    assert.equal(admin(`select (select count(*) from rs_membres where id = '${D.id}') + (select count(*) from rs_cas where auteur_id = '${D.id}') + (select count(*) from rp_remplacants where id = '${D.id}')`), '0');
  });
  console.log(`\n# pass ${ok}\n# fail 0`);
} catch (e) {
  console.error(`✗ ${e.message}`);
  console.log(`\n# pass ${ok}\n# fail 1`);
  process.exitCode = 1;
} finally {
  pg.arreter();
}
