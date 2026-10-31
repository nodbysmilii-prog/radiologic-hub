-- =====================================================================
-- APPLICATION CONTRÔLÉE de supabase/migrations/20261029120000_planification_vault.sql
-- GÉNÉRÉ par scripts/supabase/assembler-application.js : ne pas modifier.
-- À coller tel quel dans Supabase → SQL Editor, APRÈS autorisation de
-- l'auteur (choisir « Run without RLS » si Supabase le propose).
-- Une seule transaction : prérequis → migration → contrôles de sécurité ;
-- au moindre écart, tout est annulé (rien n'est appliqué).
-- Retour arrière après succès : supabase/sql/retour/20261029120000_planification_vault.sql
-- =====================================================================
BEGIN;

-- 1. Prérequis
DO $rh$
BEGIN
  IF NOT (to_regclass('vault.secrets') is not null) THEN RAISE EXCEPTION 'Prérequis absent : extension supabase_vault (Database → Extensions) ; rien n''a été appliqué'; END IF;
  IF NOT (to_regprocedure('extensions.gen_random_bytes(integer)') is not null) THEN RAISE EXCEPTION 'Prérequis absent : extension pgcrypto (schéma extensions) ; rien n''a été appliqué'; END IF;
  IF NOT (to_regnamespace('net') is not null) THEN RAISE EXCEPTION 'Prérequis absent : extension pg_net (Database → Extensions) ; rien n''a été appliqué'; END IF;
END $rh$;

-- 2. Migration (copie exacte)
-- =====================================================================
-- RadiologicHub — Remplacements : secret de la tâche planifiée dans le
-- coffre-fort Supabase (Vault)
-- ---------------------------------------------------------------------
-- La fonction rp-taches n'accepte que les appels portant l'en-tête
-- x-rp-secret. Ce mot de passe n'existe qu'à un seul endroit : le Vault
-- (secret « rp_taches_secret »). Il est tiré au hasard ici, par la base :
-- il n'est écrit dans aucun fichier, aucun résultat de requête, aucun
-- secret de fonction (RP_TACHES_SECRET n'est plus utilisé).
--
-- • public.rp_taches_secret_valide(candidat) : appelée par rp-taches
--   (clé service_role) ; répond seulement vrai / faux, sans jamais
--   renvoyer le secret. Exécutable par service_role uniquement.
-- • rp_prive.appeler_taches(url_projet) : appelée par la tâche pg_cron
--   (supabase/sql/planification.sql) ; lit ce seul secret et envoie
--   l'appel à rp-taches. Schéma rp_prive non exposé par l'API, fonction
--   exécutable par son propriétaire (postgres) uniquement.
--
-- Vérifié par tests/sql/planification.js et tests/sql/droits.js.
-- =====================================================================

create schema if not exists rp_prive;
revoke all on schema rp_prive from public, anon, authenticated, service_role;

-- Secret créé une seule fois (relancer la migration ne le change pas).
-- 32 octets aléatoires → 64 caractères hexadécimaux.
do $$
begin
  if to_regnamespace('vault') is null then
    raise exception 'Coffre-fort Supabase (Vault) introuvable : activer l''extension supabase_vault (Database → Extensions).';
  end if;
  if not exists (select 1 from vault.secrets where name = 'rp_taches_secret') then
    perform vault.create_secret(
      encode(extensions.gen_random_bytes(32), 'hex'),
      'rp_taches_secret',
      'En-tête x-rp-secret de la fonction rp-taches (tâche planifiée)'
    );
  end if;
end $$;

-- Vérification du mot de passe reçu par rp-taches : vrai / faux seulement.
-- Comparaison des empreintes SHA-256 (durée indépendante du contenu).
create or replace function public.rp_taches_secret_valide(candidat text)
returns boolean language plpgsql stable security definer set search_path = '' as $$
declare
  attendu text;
begin
  if candidat is null or length(candidat) < 32 or length(candidat) > 256 then
    return false;
  end if;
  select decrypted_secret into attendu from vault.decrypted_secrets where name = 'rp_taches_secret';
  if attendu is null or length(attendu) < 32 then
    return false;
  end if;
  return sha256(convert_to(candidat, 'UTF8')) = sha256(convert_to(attendu, 'UTF8'));
end $$;

revoke all on function public.rp_taches_secret_valide(text) from public, anon, authenticated;
grant execute on function public.rp_taches_secret_valide(text) to service_role;

-- Appel de rp-taches par la tâche pg_cron. L'adresse doit être celle d'un
-- projet Supabase (le secret ne peut pas partir vers un autre site).
create or replace function rp_prive.appeler_taches(url_projet text)
returns bigint language plpgsql security invoker set search_path = '' as $$
declare
  secret text;
begin
  if url_projet is null or url_projet !~ '^https://[a-z0-9]{20}\.supabase\.co$' then
    raise exception 'Adresse de projet Supabase invalide (attendu : https://<identifiant>.supabase.co).';
  end if;
  select decrypted_secret into secret from vault.decrypted_secrets where name = 'rp_taches_secret';
  if secret is null then
    raise exception 'Secret rp_taches_secret absent du Vault : appliquer la migration 20261029120000_planification_vault.sql.';
  end if;
  return net.http_post(
    url := url_projet || '/functions/v1/rp-taches',
    headers := jsonb_build_object('content-type', 'application/json', 'x-rp-secret', secret),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
end $$;

revoke all on function rp_prive.appeler_taches(text) from public, anon, authenticated, service_role;

-- 3. Contrôles de sécurité (annulation complète en cas d'écart)
DO $rh$
BEGIN
  IF NOT coalesce((to_regprocedure('public.rp_taches_secret_valide(text)') is not null and to_regprocedure('rp_prive.appeler_taches(text)') is not null), false) THEN
    RAISE EXCEPTION 'Contrôle refusé : migration 20261029120000_planification_vault non reconnue après application';
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
  RAISE NOTICE 'Migration 20261029120000_planification_vault appliquée et contrôlée.';
END $rh$;

COMMIT;
