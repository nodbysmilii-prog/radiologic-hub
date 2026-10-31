-- =====================================================================
-- APPLICATION CONTRÔLÉE de supabase/migrations/20261027120000_communaute_fil.sql
-- GÉNÉRÉ par scripts/supabase/assembler-application.js : ne pas modifier.
-- À coller tel quel dans Supabase → SQL Editor, APRÈS autorisation de
-- l'auteur (choisir « Run without RLS » si Supabase le propose).
-- Une seule transaction : prérequis → migration → contrôles de sécurité ;
-- au moindre écart, tout est annulé (rien n'est appliqué).
-- Retour arrière après succès : supabase/sql/retour/20261027120000_communaute_fil.sql
-- =====================================================================
BEGIN;

-- 1. Prérequis
DO $rh$
BEGIN
  IF NOT (to_regclass('public.rs_cas') is not null) THEN RAISE EXCEPTION 'Prérequis absent : migration 20261009090000_reseau ; rien n''a été appliqué'; END IF;
  IF NOT (to_regclass('public.rp_demandes') is not null) THEN RAISE EXCEPTION 'Prérequis absent : migration 20261008120000_remplacements ; rien n''a été appliqué'; END IF;
END $rh$;

-- 2. Migration (copie exacte)
-- =========================================================
-- RadiologicHub — Communauté : fil d'actualité (27/10/2026)
-- • rs_cas.type : « cas » (cas clinique, 1 image au moins) ou « avis »
--   (demande d'avis : images facultatives, question obligatoire).
-- • rs_missions_ouvertes() : missions de remplacement encore ouvertes,
--   en lecture pour les membres actifs de la Communauté, sans nom de
--   structure, adresse, contact ni honoraires (détails et réponse dans
--   l'espace Remplacements).
-- À exécuter après les migrations précédentes ; sans effet si déjà appliquée.
-- =========================================================

alter table public.rs_cas add column if not exists type text not null default 'cas';
alter table public.rs_cas drop constraint if exists rs_cas_type_check;
alter table public.rs_cas add constraint rs_cas_type_check check (type in ('cas', 'avis'));

-- images : 1 à 10 pour un cas clinique, 0 à 10 pour une demande d'avis
alter table public.rs_cas drop constraint if exists rs_cas_images_check;
alter table public.rs_cas add constraint rs_cas_images_check check (
  jsonb_typeof(images) = 'array'
  and jsonb_array_length(images) <= 10
  and (type = 'avis' or jsonb_array_length(images) >= 1)
);
-- demande d'avis : une question est obligatoire
alter table public.rs_cas drop constraint if exists rs_cas_avis_question;
alter table public.rs_cas add constraint rs_cas_avis_question check (type <> 'avis' or length(trim(question)) >= 5);
create index if not exists rs_cas_type_date on public.rs_cas (type, cree_le desc);

create or replace function public.rs_missions_ouvertes()
returns table (
  id uuid, dates date[], type text, heure_debut text, heure_fin text, profil text, annee_min smallint,
  modalites text[], logement boolean, transport boolean, repas boolean,
  ville text, gouvernorat text, structure_type text, publiee_le timestamptz
)
language sql stable security definer set search_path = public as $$
  select d.id, d.dates, d.type, d.heure_debut, d.heure_fin, d.profil, d.annee_min,
         d.modalites, d.logement, d.transport, d.repas,
         s.ville, s.gouvernorat, s.type, coalesce(d.publiee_le, d.cree_le)
  from rp_demandes d join rp_structures s on s.id = d.structure_id
  where rs_est_membre_actif()
    and d.etat = 'publiee'
    and s.etat = 'valide'
    and (select max(x) from unnest(d.dates) x) >= current_date
  order by coalesce(d.publiee_le, d.cree_le) desc
  limit 20;
$$;
revoke all on function public.rs_missions_ouvertes() from public, anon;
grant execute on function public.rs_missions_ouvertes() to authenticated;

-- 3. Contrôles de sécurité (annulation complète en cas d'écart)
DO $rh$
BEGIN
  IF NOT coalesce((to_regproc('public.rs_missions_ouvertes') is not null), false) THEN
    RAISE EXCEPTION 'Contrôle refusé : migration 20261027120000_communaute_fil non reconnue après application';
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
  RAISE NOTICE 'Migration 20261027120000_communaute_fil appliquée et contrôlée.';
END $rh$;

COMMIT;
