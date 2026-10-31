-- PRÉPARÉ UNIQUEMENT : ne pas exécuter sans autorisation de production.
-- Corrige les écarts de grants constatés le 31/10/2026.
-- Ne crée pas de secret, fonction métier, tâche Cron ou nouvelle table.
-- Transaction atomique ; relançable. Sauvegarder les ACL avant application.
BEGIN;

-- Ces tables peuvent contenir les en-têtes de requêtes HTTP, donc un secret.
-- Garder les droits postgres / service_role et les fonctions net inchangés.
DO $$
DECLARE t text; colonnes text;
BEGIN
  FOREACH t IN ARRAY ARRAY['net.http_request_queue', 'net._http_response'] LOOP
    IF to_regclass(t) IS NOT NULL THEN
      EXECUTE format('REVOKE SELECT ON TABLE %s FROM PUBLIC, anon, authenticated', t);
      SELECT string_agg(quote_ident(attname), ', ' ORDER BY attnum) INTO colonnes
        FROM pg_attribute WHERE attrelid=to_regclass(t) AND attnum>0 AND NOT attisdropped;
      IF colonnes IS NOT NULL THEN
        EXECUTE format('REVOKE SELECT (%s) ON TABLE %s FROM PUBLIC, anon, authenticated', colonnes, t);
      END IF;
    END IF;
  END LOOP;
END $$;

-- Signatures applicatives connues du dépôt revu : ne pas toucher aux
-- surcharges inconnues, nouvelles fonctions publiques ni fonctions d'extension.
DO $$
DECLARE signature text;
BEGIN
  FOREACH signature IN ARRAY ARRAY[
    'public.ab_est_abonne()',
    'public.ab_maj_le()',
    'public.bib_avant_ecriture()',
    'public.dc_droits(uuid)',
    'public.dc_droits_de(uuid,uuid)',
    'public.dc_droits_etude(text)',
    'public.dc_est_admin_de(uuid)',
    'public.dc_est_radiologue(uuid)',
    'public.dc_est_resident(uuid)',
    'public.dc_examens_avant_ecriture()',
    'public.dc_expertises_avant_ecriture()',
    'public.dc_journal_pas_de_vidage()',
    'public.dc_journal_protege()',
    'public.dc_mon_espace()',
    'public.dc_peut_importer(uuid)',
    'public.dc_peut_importer_de(uuid,uuid)',
    'public.dc_peut_valider_resident(uuid)',
    'public.dc_reglages_maj_le()',
    'public.dc_residents_avant_ecriture()',
    'public.dc_role()',
    'public.dc_role_de(uuid)',
    'public.dc_role_structure_de(uuid,uuid)',
    'public.rp_a_recu(uuid)',
    'public.rp_a_recu_de(uuid)',
    'public.rp_accepter_invitations()',
    'public.rp_compteurs(uuid[])',
    'public.rp_est_admin()',
    'public.rp_est_membre(uuid)',
    'public.rp_est_responsable(uuid)',
    'public.rp_membre_meme_structure(uuid)',
    'public.rp_nouvel_utilisateur()',
    'public.rp_proteger_profil()',
    'public.rp_proteger_validation()',
    'public.rp_statistiques()',
    'public.rp_structure_creee()',
    'public.rp_taches_secret_valide(text)',
    'public.rp_voit_remplacant(uuid)',
    'public.rs_autre(uuid)',
    'public.rs_autre_de(uuid,uuid)',
    'public.rs_bloque(uuid,uuid)',
    'public.rs_compter()',
    'public.rs_est_membre_actif()',
    'public.rs_evenement()',
    'public.rs_mes_conversations()',
    'public.rs_message_envoye()',
    'public.rs_message_supprime()',
    'public.rs_missions_ouvertes()',
    'public.rs_notifier(uuid,text,uuid,uuid)',
    'public.rs_ouvrir_conversation(uuid)',
    'public.rs_participe(uuid)',
    'public.rs_participe_dossier(text)',
    'public.rs_peut_publier(uuid)',
    'public.rs_proteger_cas()',
    'public.rs_proteger_commentaire()',
    'public.rs_proteger_membre()',
    'public.rs_proteger_message()',
    'public.rs_rappels_messages(interval)',
    'public.rs_remplacant_valide(uuid)',
    'public.rs_signalement_recu()',
    'public.rs_supprimer_mon_compte()'
  ] LOOP
    IF to_regprocedure(signature) IS NOT NULL THEN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon', to_regprocedure(signature));
      IF has_function_privilege('anon',to_regprocedure(signature),'EXECUTE') THEN
        RAISE EXCEPTION 'Droit anon persistant sur % ; lot annulé', signature;
      END IF;
    END IF;
  END LOOP;
END $$;

-- Aucun GRANT ajouté : conserver les droits explicites légitimes, sans élargir
-- l'accès par nom à d'éventuelles surcharges. Si un droit nécessaire dépendait
-- encore de PUBLIC, annuler le lot pour revue plutôt que le recréer aveuglément.
DO $$
DECLARE signature text;
BEGIN
  FOREACH signature IN ARRAY ARRAY[
    'public.rp_a_recu(uuid)','public.rp_a_recu_de(uuid)',
    'public.rp_accepter_invitations()','public.rp_compteurs(uuid[])',
    'public.rp_est_admin()','public.rp_est_membre(uuid)',
    'public.rp_est_responsable(uuid)','public.rp_membre_meme_structure(uuid)',
    'public.rp_statistiques()','public.rp_voit_remplacant(uuid)',
    'public.rs_autre(uuid)','public.rs_bloque(uuid,uuid)',
    'public.rs_est_membre_actif()','public.rs_mes_conversations()',
    'public.rs_missions_ouvertes()','public.rs_ouvrir_conversation(uuid)',
    'public.rs_participe(uuid)','public.rs_participe_dossier(text)',
    'public.rs_peut_publier(uuid)','public.rs_remplacant_valide(uuid)',
    'public.rs_supprimer_mon_compte()','public.ab_est_abonne()',
    'public.dc_role()','public.dc_droits(uuid)','public.dc_peut_importer(uuid)',
    'public.dc_peut_valider_resident(uuid)','public.dc_droits_etude(text)',
    'public.dc_mon_espace()'
  ] LOOP
    IF to_regprocedure(signature) IS NOT NULL AND NOT
      has_function_privilege('authenticated', to_regprocedure(signature), 'EXECUTE') THEN
      RAISE EXCEPTION 'Droit membre nécessaire absent : % ; lot annulé', signature;
    END IF;
  END LOOP;
  FOREACH signature IN ARRAY ARRAY[
    'public.rs_rappels_messages(interval)', 'public.rp_taches_secret_valide(text)'
  ] LOOP
    IF to_regprocedure(signature) IS NOT NULL AND NOT
      has_function_privilege('service_role', to_regprocedure(signature), 'EXECUTE') THEN
      RAISE EXCEPTION 'Droit service nécessaire absent : % ; lot annulé', signature;
    END IF;
  END LOOP;
END $$;

-- Refuser le commit si un droit retiré persiste par héritage.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['net.http_request_queue', 'net._http_response'] LOOP
    IF to_regclass(t) IS NOT NULL AND (
      has_any_column_privilege('anon', to_regclass(t), 'SELECT') OR
      has_any_column_privilege('authenticated', to_regclass(t), 'SELECT')) THEN
      RAISE EXCEPTION 'Droit de lecture pg_net persistant : % (héritage à examiner)', t;
    END IF;
  END LOOP;
END $$;
COMMIT;
