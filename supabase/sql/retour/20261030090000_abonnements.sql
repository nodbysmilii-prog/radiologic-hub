-- Retour arrière de la migration 20261030090000_abonnements.sql (autorisation requise).
-- Refusé si un abonnement ou un contenu réservé est enregistré. Le seau privé « premium »
-- est laissé en place (vide et privé ; à supprimer depuis le tableau de bord si besoin).
BEGIN;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.ab_abonnements) OR EXISTS (SELECT 1 FROM public.ab_contenus) THEN
    RAISE EXCEPTION 'Abonnements ou contenus réservés enregistrés : retour arrière refusé.';
  END IF;
END $$;
DROP POLICY IF EXISTS premium_lecture ON storage.objects;
DROP POLICY IF EXISTS premium_admin ON storage.objects;
DROP TABLE IF EXISTS public.ab_contenus, public.ab_abonnements;
DROP FUNCTION IF EXISTS public.ab_est_abonne();
DROP FUNCTION IF EXISTS public.ab_maj_le();
COMMIT;
