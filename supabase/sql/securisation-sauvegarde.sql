-- =====================================================================
-- Sécurisation avant lancement — SAUVEGARDE des droits actuels
-- ---------------------------------------------------------------------
-- À exécuter juste AVANT supabase/sql/securisation-fonctions.sql (c'est
-- le début de securisation-a-appliquer-v2.sql). Ne retire ni n'accorde aucun
-- droit : copie les droits actuels des 60 fonctions visées et des deux files
-- pg_net dans securite_sauvegarde.droits_20261031 (schéma fermé aux
-- visiteurs et aux membres). Relançable : la première sauvegarde est gardée.
-- Retour arrière : supabase/sql/securisation-retour-arriere.sql.
-- =====================================================================
BEGIN;
CREATE SCHEMA IF NOT EXISTS securite_sauvegarde;
REVOKE ALL ON SCHEMA securite_sauvegarde FROM PUBLIC, anon, authenticated;
CREATE TABLE IF NOT EXISTS securite_sauvegarde.droits_20261031 (
  objet text PRIMARY KEY,
  type text NOT NULL CHECK (type IN ('fonction', 'table')),
  acl aclitem[],                 -- NULL = droits par défaut de PostgreSQL
  colonnes jsonb,                -- tables : droits de chaque colonne (texte aclitem[])
  enregistre_le timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON TABLE securite_sauvegarde.droits_20261031 FROM PUBLIC, anon, authenticated;

INSERT INTO securite_sauvegarde.droits_20261031 (objet, type, acl)
SELECT s, 'fonction', p.proacl
FROM unnest(ARRAY['public.ab_est_abonne()','public.ab_maj_le()','public.bib_avant_ecriture()','public.dc_droits(uuid)','public.dc_droits_de(uuid,uuid)','public.dc_droits_etude(text)','public.dc_est_admin_de(uuid)','public.dc_est_radiologue(uuid)','public.dc_est_resident(uuid)','public.dc_examens_avant_ecriture()','public.dc_expertises_avant_ecriture()','public.dc_journal_pas_de_vidage()','public.dc_journal_protege()','public.dc_mon_espace()','public.dc_peut_importer(uuid)','public.dc_peut_importer_de(uuid,uuid)','public.dc_peut_valider_resident(uuid)','public.dc_reglages_maj_le()','public.dc_residents_avant_ecriture()','public.dc_role()','public.dc_role_de(uuid)','public.dc_role_structure_de(uuid,uuid)','public.rp_a_recu(uuid)','public.rp_a_recu_de(uuid)','public.rp_accepter_invitations()','public.rp_compteurs(uuid[])','public.rp_est_admin()','public.rp_est_membre(uuid)','public.rp_est_responsable(uuid)','public.rp_membre_meme_structure(uuid)','public.rp_nouvel_utilisateur()','public.rp_proteger_profil()','public.rp_proteger_validation()','public.rp_statistiques()','public.rp_structure_creee()','public.rp_taches_secret_valide(text)','public.rp_voit_remplacant(uuid)','public.rs_autre(uuid)','public.rs_autre_de(uuid,uuid)','public.rs_bloque(uuid,uuid)','public.rs_compter()','public.rs_est_membre_actif()','public.rs_evenement()','public.rs_mes_conversations()','public.rs_message_envoye()','public.rs_message_supprime()','public.rs_missions_ouvertes()','public.rs_notifier(uuid,text,uuid,uuid)','public.rs_ouvrir_conversation(uuid)','public.rs_participe(uuid)','public.rs_participe_dossier(text)','public.rs_peut_publier(uuid)','public.rs_proteger_cas()','public.rs_proteger_commentaire()','public.rs_proteger_membre()','public.rs_proteger_message()','public.rs_rappels_messages(interval)','public.rs_remplacant_valide(uuid)','public.rs_signalement_recu()','public.rs_supprimer_mon_compte()']) AS s
JOIN pg_proc p ON p.oid = to_regprocedure(s)
ON CONFLICT (objet) DO NOTHING;

INSERT INTO securite_sauvegarde.droits_20261031 (objet, type, acl, colonnes)
SELECT t, 'table', c.relacl,
  (SELECT jsonb_object_agg(a.attname, a.attacl::text) FROM pg_attribute a
    WHERE a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped AND a.attacl IS NOT NULL)
FROM unnest(ARRAY['net.http_request_queue', 'net._http_response']) AS t
JOIN pg_class c ON c.oid = to_regclass(t)
ON CONFLICT (objet) DO NOTHING;
COMMIT;
