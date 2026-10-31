-- Retour arrière de la migration 20261029120000_planification_vault.sql (autorisation requise).
-- Refusé si une tâche Cron appelle encore rp_prive.appeler_taches (la retirer d'abord).
-- Attention : la fonction rp-taches redéployée (version Vault) refusera alors les appels
-- tant que la migration n'est pas réappliquée. Transaction atomique.
BEGIN;
DO $$ BEGIN
  IF to_regclass('cron.job') IS NOT NULL THEN
    IF (SELECT count(*) FROM (SELECT 1 FROM cron.job WHERE command LIKE '%rp_prive.appeler_taches%') t) > 0 THEN
      RAISE EXCEPTION 'Une tâche Cron appelle encore rp_prive.appeler_taches : la retirer d''abord.';
    END IF;
  END IF;
END $$;
DROP SCHEMA IF EXISTS rp_prive CASCADE;
DROP FUNCTION IF EXISTS public.rp_taches_secret_valide(text);
DELETE FROM vault.secrets WHERE name = 'rp_taches_secret';
COMMIT;
