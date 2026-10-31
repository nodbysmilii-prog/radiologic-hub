-- =====================================================================
-- APPLICATION CONTRÔLÉE de supabase/migrations/20261031130000_search_path_profil.sql
-- GÉNÉRÉ par scripts/supabase/assembler-application.js : ne pas modifier.
-- À coller tel quel dans Supabase → SQL Editor, APRÈS autorisation de
-- l'auteur (choisir « Run without RLS » si Supabase le propose).
-- Une seule transaction : prérequis → migration → contrôles de sécurité ;
-- au moindre écart, tout est annulé (rien n'est appliqué).
-- Retour arrière après succès : supabase/sql/retour/20261031130000_search_path_profil.sql
-- =====================================================================
BEGIN;

-- 1. Prérequis
DO $rh$
BEGIN
  IF NOT (to_regprocedure('public.rp_proteger_profil()') is not null) THEN RAISE EXCEPTION 'Prérequis absent : migration 20261008120000_remplacements ; rien n''a été appliqué'; END IF;
END $rh$;

-- 2. Migration (copie exacte)
-- =====================================================================
-- RadiologicHub — correctif de sécurité : search_path de rp_proteger_profil
-- ---------------------------------------------------------------------
-- Alerte Supabase « function_search_path_mutable » (Security Advisor) sur
-- public.rp_proteger_profil() : sans search_path fixé, la fonction
-- résoudrait les noms selon le chemin de la session appelante.
-- Recommandation Supabase : search_path VIDE (''), tous les objets étant
-- nommés avec leur schéma. C'est le cas ici : auth.role() est qualifié,
-- coalesce() appartient à pg_catalog (toujours consulté en premier).
-- Aucun changement de comportement : la fonction (déclencheur sur
-- public.profils) garde l'identifiant, et pour tout autre rôle que
-- service_role l'e-mail et la date de création.
-- Idempotent. Retour arrière : supabase/sql/retour/20261031130000_search_path_profil.sql
-- =====================================================================
alter function public.rp_proteger_profil() set search_path = '';

-- 3. Contrôles de sécurité (annulation complète en cas d'écart)
DO $rh$
BEGIN
  IF NOT coalesce((coalesce((select 'search_path=""' = any(proconfig) from pg_proc where oid = to_regprocedure('public.rp_proteger_profil()')), false)), false) THEN
    RAISE EXCEPTION 'Contrôle refusé : migration 20261031130000_search_path_profil non reconnue après application';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
             WHERE n.nspname = 'public' AND p.proname <> 'rls_auto_enable' AND has_function_privilege('anon', p.oid, 'EXECUTE')
               AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.objid = p.oid AND d.deptype = 'e')) THEN
    RAISE EXCEPTION 'Contrôle refusé : une fonction du schéma public est exécutable par les visiteurs (anon) : %',
      (SELECT string_agg(p.proname, ', ') FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
       WHERE n.nspname = 'public' AND p.proname <> 'rls_auto_enable' AND has_function_privilege('anon', p.oid, 'EXECUTE')
         AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.objid = p.oid AND d.deptype = 'e'));
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relkind = 'r' AND NOT c.relrowsecurity) THEN
    RAISE EXCEPTION 'Contrôle refusé : table du schéma public sans règles d''accès par ligne (RLS) : %',
      (SELECT string_agg(c.relname, ', ') FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relkind = 'r' AND NOT c.relrowsecurity);
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace, aclexplode(c.relacl) a
             WHERE n.nspname = 'public' AND a.grantee = 'anon'::regrole AND a.privilege_type NOT IN ('SELECT', 'MAINTAIN')) THEN
    RAISE EXCEPTION 'Contrôle refusé : les visiteurs (anon) ont un droit d''écriture sur une table';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
             WHERE n.nspname = 'public' AND p.prosecdef AND p.proname <> 'rls_auto_enable'
               AND NOT EXISTS (SELECT 1 FROM unnest(coalesce(p.proconfig, '{}')) x WHERE x LIKE 'search_path=%')) THEN
    RAISE EXCEPTION 'Contrôle refusé : fonction SECURITY DEFINER sans search_path fixé : %',
      (SELECT string_agg(p.proname, ', ') FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
       WHERE n.nspname = 'public' AND p.prosecdef AND p.proname <> 'rls_auto_enable'
         AND NOT EXISTS (SELECT 1 FROM unnest(coalesce(p.proconfig, '{}')) x WHERE x LIKE 'search_path=%'));
  END IF;
  RAISE NOTICE 'Migration 20261031130000_search_path_profil appliquée et contrôlée.';
END $rh$;

COMMIT;
