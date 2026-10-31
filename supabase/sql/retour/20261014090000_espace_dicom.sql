-- Retour arrière de la migration 20261014090000_espace_dicom.sql (autorisation requise).
-- Refusé si un examen, un résident, une expertise, un partage ou une passerelle existe.
BEGIN;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.dc_examens) OR EXISTS (SELECT 1 FROM public.dc_residents)
     OR EXISTS (SELECT 1 FROM public.dc_passerelles) THEN
    RAISE EXCEPTION 'Données de l''Espace DICOM présentes : retour arrière refusé.';
  END IF;
END $$;
DROP TABLE IF EXISTS public.dc_journal, public.dc_partages, public.dc_expertises, public.dc_examens,
  public.dc_residents, public.dc_passerelles, public.dc_reglages CASCADE;
DROP FUNCTION IF EXISTS public.dc_mon_espace(), public.dc_droits_etude(text), public.dc_peut_valider_resident(uuid),
  public.dc_peut_importer(uuid), public.dc_droits(uuid), public.dc_role(), public.dc_peut_importer_de(uuid, uuid),
  public.dc_droits_de(uuid, uuid), public.dc_role_de(uuid), public.dc_role_structure_de(uuid, uuid),
  public.dc_est_admin_de(uuid), public.dc_est_resident(uuid), public.dc_est_radiologue(uuid),
  public.dc_examens_avant_ecriture(), public.dc_residents_avant_ecriture(), public.dc_expertises_avant_ecriture(),
  public.dc_journal_protege(), public.dc_journal_pas_de_vidage(), public.dc_reglages_maj_le();
COMMIT;
