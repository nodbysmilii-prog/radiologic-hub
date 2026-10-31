-- =====================================================================
-- Sécurisation avant lancement — RETOUR ARRIÈRE (autorisation requise)
-- ---------------------------------------------------------------------
-- Réaccorde EXACTEMENT les droits que securisation-prelancement.sql a pu
-- retirer (EXECUTE de PUBLIC / anon sur les fonctions ; SELECT de PUBLIC /
-- anon / authenticated sur les files pg_net, table et colonnes), tels
-- qu'enregistrés par securisation-sauvegarde.sql. N'accorde rien d'autre.
-- Transaction atomique ; relançable. Échoue si la sauvegarde est absente.
-- =====================================================================
BEGIN;
DO $$
DECLARE r record; a record; colonne text; acl_texte text;
  roles oid[] := ARRAY[0::oid, 'anon'::regrole::oid, 'authenticated'::regrole::oid];
  nom text;
BEGIN
  IF to_regclass('securite_sauvegarde.droits_20261031') IS NULL THEN
    RAISE EXCEPTION 'Sauvegarde des droits absente : retour arrière impossible automatiquement';
  END IF;
  FOR r IN SELECT * FROM securite_sauvegarde.droits_20261031 LOOP
    IF r.type = 'fonction' THEN
      CONTINUE WHEN to_regprocedure(r.objet) IS NULL;
      IF r.acl IS NULL THEN   -- droits par défaut : PUBLIC pouvait exécuter
        EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO PUBLIC', to_regprocedure(r.objet));
      ELSE
        FOR a IN SELECT DISTINCT grantee FROM aclexplode(r.acl) WHERE privilege_type = 'EXECUTE' AND grantee = ANY (roles[1:2]) LOOP
          nom := CASE WHEN a.grantee = 0 THEN 'PUBLIC' ELSE quote_ident(a.grantee::regrole::text) END;
          EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO %s', to_regprocedure(r.objet), nom);
        END LOOP;
      END IF;
    ELSE
      CONTINUE WHEN to_regclass(r.objet) IS NULL;
      FOR a IN SELECT DISTINCT grantee FROM aclexplode(r.acl) WHERE privilege_type = 'SELECT' AND grantee = ANY (roles) LOOP
        nom := CASE WHEN a.grantee = 0 THEN 'PUBLIC' ELSE quote_ident(a.grantee::regrole::text) END;
        EXECUTE format('GRANT SELECT ON TABLE %s TO %s', to_regclass(r.objet), nom);
      END LOOP;
      FOR colonne, acl_texte IN SELECT key, value FROM jsonb_each_text(coalesce(r.colonnes, '{}'::jsonb)) LOOP
        FOR a IN SELECT DISTINCT grantee FROM aclexplode(acl_texte::aclitem[]) WHERE privilege_type = 'SELECT' AND grantee = ANY (roles) LOOP
          nom := CASE WHEN a.grantee = 0 THEN 'PUBLIC' ELSE quote_ident(a.grantee::regrole::text) END;
          EXECUTE format('GRANT SELECT (%I) ON TABLE %s TO %s', colonne, to_regclass(r.objet), nom);
        END LOOP;
      END LOOP;
    END IF;
  END LOOP;
END $$;
COMMIT;
