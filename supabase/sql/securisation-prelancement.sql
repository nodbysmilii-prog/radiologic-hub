-- PRÉPARÉ UNIQUEMENT : ne pas exécuter sans autorisation de production.
-- Corrige les écarts de grants constatés le 31/10/2026.
-- Ne crée pas de secret, fonction métier, tâche Cron ou nouvelle table.
-- Transaction atomique ; relançable. Sauvegarder les ACL avant application.
BEGIN;

-- Ces tables peuvent contenir les en-têtes de requêtes HTTP, donc un secret.
-- Garder les droits postgres / service_role et les fonctions net inchangés.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['net.http_request_queue', 'net._http_response'] LOOP
    IF to_regclass(t) IS NOT NULL THEN
      EXECUTE format('REVOKE SELECT ON TABLE %s FROM PUBLIC, anon, authenticated', t);
    END IF;
  END LOOP;
END $$;

-- Réduire les droits des seules fonctions applicatives déjà présentes.
-- Les fonctions d'extensions (ex. rls_auto_enable) ne sont pas concernées.
DO $$
DECLARE f record;
BEGIN
  FOR f IN SELECT p.oid::regprocedure AS signature
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prokind = 'f'
      AND p.proname ~ '^(rp_|rs_|bib_|ab_|dc_)'
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon', f.signature);
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
      has_table_privilege('anon', to_regclass(t), 'SELECT') OR
      has_table_privilege('authenticated', to_regclass(t), 'SELECT')) THEN
      RAISE EXCEPTION 'Droit de lecture pg_net persistant : % (héritage à examiner)', t;
    END IF;
  END LOOP;
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
      WHERE n.nspname='public' AND p.prokind='f'
        AND p.proname ~ '^(rp_|rs_|bib_|ab_|dc_)'
        AND has_function_privilege('anon',p.oid,'EXECUTE')) THEN
    RAISE EXCEPTION 'Droit anon persistant sur une fonction applicative';
  END IF;
END $$;
COMMIT;
