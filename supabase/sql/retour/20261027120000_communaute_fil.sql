-- Retour arrière de la migration 20261027120000_communaute_fil.sql (autorisation requise).
-- Refusé si des demandes d'avis existent (elles seraient perdues). Transaction atomique.
BEGIN;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.rs_cas WHERE type = 'avis') THEN
    RAISE EXCEPTION 'Des demandes d''avis existent : retour arrière refusé (elles seraient perdues).';
  END IF;
END $$;
DROP FUNCTION IF EXISTS public.rs_missions_ouvertes();
DROP INDEX IF EXISTS public.rs_cas_type_date;
ALTER TABLE public.rs_cas DROP CONSTRAINT IF EXISTS rs_cas_avis_question;
ALTER TABLE public.rs_cas DROP CONSTRAINT IF EXISTS rs_cas_type_check;
ALTER TABLE public.rs_cas DROP CONSTRAINT IF EXISTS rs_cas_images_check;
ALTER TABLE public.rs_cas ADD CONSTRAINT rs_cas_images_check
  CHECK (jsonb_typeof(images) = 'array' AND jsonb_array_length(images) BETWEEN 1 AND 10);
ALTER TABLE public.rs_cas DROP COLUMN IF EXISTS type;
COMMIT;
