-- =====================================================================
-- APPLICATION CONTRÔLÉE de supabase/migrations/20261030090000_abonnements.sql
-- GÉNÉRÉ par scripts/supabase/assembler-application.js : ne pas modifier.
-- À coller tel quel dans Supabase → SQL Editor, APRÈS autorisation de
-- l'auteur (choisir « Run without RLS » si Supabase le propose).
-- Une seule transaction : prérequis → migration → contrôles de sécurité ;
-- au moindre écart, tout est annulé (rien n'est appliqué).
-- Retour arrière après succès : supabase/sql/retour/20261030090000_abonnements.sql
-- =====================================================================
BEGIN;

-- 1. Prérequis
DO $rh$
BEGIN
  IF NOT (to_regprocedure('public.rp_est_admin()') is not null) THEN RAISE EXCEPTION 'Prérequis absent : migration 20261008120000_remplacements ; rien n''a été appliqué'; END IF;
  IF NOT (to_regclass('storage.buckets') is not null) THEN RAISE EXCEPTION 'Prérequis absent : stockage Supabase ; rien n''a été appliqué'; END IF;
END $rh$;

-- 2. Migration (copie exacte)
-- =====================================================================
-- RadiologicHub — Abonnements : contenus réservés aux abonnés (PRÉPARATION)
-- ---------------------------------------------------------------------
-- Architecture prête ; AUCUN contenu n'est encore réservé : l'auteur
-- choisit lesquels (docs/organisation/PUBLICATION.md), ils sont alors
-- retirés du site public (scripts/publication/liste-blanche.js,
-- RESERVE_ABONNES) et servis d'ici. Pas encore appliquée à la base réelle.
--
-- • ab_abonnements : un abonnement par compte (début, fin, formule),
--   saisi par l'administrateur (pas encore de paiement en ligne ; plus
--   tard, une fonction serveur pourra l'écrire avec la clé service_role).
-- • ab_est_abonne() : vrai si le compte connecté a un abonnement en
--   cours ; SECURITY DEFINER, ne renvoie qu'un booléen.
-- • ab_contenus : contenus texte réservés (modèles et phrases de comptes
--   rendus, fiches, légendes d'atlas…) en JSON ; lisibles seulement par
--   les abonnés et l'administrateur, jamais par les visiteurs.
-- • Stockage « premium » PRIVÉ : images, PDF, séries d'atlas réservés ;
--   lecture par URL signée de courte durée, que la base n'accorde qu'aux
--   abonnés ; écriture réservée à l'administrateur.
-- La vérification se fait dans la base (droits d'accès par ligne) : un
-- bouton masqué ou un contrôle en JavaScript ne protège rien.
-- Exposition automatique désactivée : droits accordés explicitement en
-- fin de fichier (liste vérifiée par tests/sql/droits.js).
-- Prérequis : 20261008120000_remplacements.sql (rp_est_admin).
-- =====================================================================

create table if not exists public.ab_abonnements (
  membre_id uuid primary key references auth.users (id) on delete cascade,
  formule text not null default 'standard' check (formule ~ '^[a-z0-9-]{1,40}$'),
  debut timestamptz not null default now(),
  fin timestamptz not null,
  note text check (length(note) <= 500),
  maj_le timestamptz not null default now(),
  constraint ab_abonnements_dates check (fin > debut)
);

create table if not exists public.ab_contenus (
  id text primary key check (id ~ '^[a-z0-9-]{1,80}$'),
  module text not null check (module in ('comptes-rendus', 'fiches', 'radioanatomie', 'cours', 'cas', 'bibliotheque')),
  titre text not null check (length(titre) between 1 and 200),
  contenu jsonb not null default '{}'::jsonb,
  maj_le timestamptz not null default now()
);

-- ---------- Abonnement en cours du compte connecté ----------
create or replace function public.ab_est_abonne() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.ab_abonnements a
    where a.membre_id = auth.uid() and a.debut <= now() and a.fin > now()
  )
$$;

create or replace function public.ab_maj_le() returns trigger
language plpgsql set search_path = public as $$
begin
  new.maj_le := now();
  return new;
end $$;
drop trigger if exists ab_abonnements_maj_le on public.ab_abonnements;
create trigger ab_abonnements_maj_le before insert or update on public.ab_abonnements
  for each row execute function public.ab_maj_le();
drop trigger if exists ab_contenus_maj_le on public.ab_contenus;
create trigger ab_contenus_maj_le before insert or update on public.ab_contenus
  for each row execute function public.ab_maj_le();

-- ---------- Droits d'accès par ligne ----------
alter table public.ab_abonnements enable row level security;
alter table public.ab_contenus enable row level security;

-- Chacun voit son propre abonnement ; l'administrateur les gère tous.
drop policy if exists ab_abonnements_lecture on public.ab_abonnements;
create policy ab_abonnements_lecture on public.ab_abonnements for select to authenticated
  using (membre_id = auth.uid() or rp_est_admin());
drop policy if exists ab_abonnements_admin on public.ab_abonnements;
create policy ab_abonnements_admin on public.ab_abonnements for all to authenticated
  using (rp_est_admin()) with check (rp_est_admin());

-- Contenus réservés : abonnement en cours (ou administrateur), jamais les visiteurs.
drop policy if exists ab_contenus_abonnes on public.ab_contenus;
create policy ab_contenus_abonnes on public.ab_contenus for select to authenticated
  using (ab_est_abonne() or rp_est_admin());
drop policy if exists ab_contenus_admin on public.ab_contenus;
create policy ab_contenus_admin on public.ab_contenus for all to authenticated
  using (rp_est_admin()) with check (rp_est_admin());

-- ---------- Stockage privé « premium » ----------
-- Jamais public, même si le seau existait déjà : les fichiers ne s'obtiennent que par URL signée.
insert into storage.buckets (id, name, public) values ('premium', 'premium', false)
  on conflict (id) do update set public = false;
drop policy if exists premium_lecture on storage.objects;
create policy premium_lecture on storage.objects for select to authenticated
  using (bucket_id = 'premium' and (ab_est_abonne() or rp_est_admin()));
drop policy if exists premium_admin on storage.objects;
create policy premium_admin on storage.objects for all to authenticated
  using (bucket_id = 'premium' and rp_est_admin())
  with check (bucket_id = 'premium' and rp_est_admin());

-- ---------- Droits explicites (exposition automatique désactivée) ----------
revoke all on public.ab_abonnements, public.ab_contenus from anon, authenticated;
-- Aucun droit pour les visiteurs (anon). Comptes connectés : filtrés par les règles ci-dessus.
grant select, insert, update, delete on public.ab_abonnements, public.ab_contenus to authenticated;
grant all on public.ab_abonnements, public.ab_contenus to service_role;
-- Fonction appelée dans les règles (et par le site pour afficher l'état de l'abonnement).
revoke execute on function public.ab_est_abonne() from public, anon;
grant execute on function public.ab_est_abonne() to authenticated, service_role;
revoke execute on function public.ab_maj_le() from public, anon, authenticated;

-- 3. Contrôles de sécurité (annulation complète en cas d'écart)
DO $rh$
BEGIN
  IF NOT coalesce((to_regclass('public.ab_abonnements') is not null and to_regprocedure('public.ab_est_abonne()') is not null), false) THEN
    RAISE EXCEPTION 'Contrôle refusé : migration 20261030090000_abonnements non reconnue après application';
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
  RAISE NOTICE 'Migration 20261030090000_abonnements appliquée et contrôlée.';
END $rh$;

COMMIT;
