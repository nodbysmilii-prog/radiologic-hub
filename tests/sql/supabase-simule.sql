-- =====================================================================
-- Simulation minimale de l'environnement Supabase pour tester la
-- migration en local (PostgreSQL 16) : schéma auth (utilisateurs,
-- auth.uid(), auth.jwt(), auth.role()), rôles anon / authenticated /
-- service_role, schéma storage. Utilisé par tests/sql/rls.js uniquement.
-- =====================================================================
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;

create schema auth;
create table auth.users (
  id uuid primary key default gen_random_uuid(),
  email text,
  raw_user_meta_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb)
$$;
create function auth.uid() returns uuid language sql stable as $$ select nullif(auth.jwt() ->> 'sub', '')::uuid $$;
create function auth.role() returns text language sql stable as $$ select coalesce(auth.jwt() ->> 'role', 'anon') $$;

create schema storage;
create table storage.buckets (id text primary key, name text not null, public boolean default false);
create table storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets (id),
  name text not null,
  owner uuid default auth.uid()
);
create function storage.foldername(name text) returns text[] language sql immutable as $$
  select (string_to_array(name, '/'))[1:greatest(cardinality(string_to_array(name, '/')) - 1, 0)]
$$;
alter table storage.objects enable row level security;

-- Privilèges de Supabase avec l'exposition automatique DÉSACTIVÉE (réglage du projet) :
-- les nouvelles tables et fonctions du schéma public ne reçoivent aucun droit par défaut,
-- pas même l'exécution des fonctions pour PUBLIC (hypothèse la plus stricte). Chaque migration
-- doit donc accorder explicitement (GRANT) tout ce dont le site et les fonctions serveur ont besoin.
grant usage on schema public, auth, storage to anon, authenticated, service_role;
grant execute on all functions in schema auth to anon, authenticated, service_role;
grant select on storage.buckets to anon, authenticated, service_role;
grant all on storage.objects to authenticated, service_role;
alter default privileges for role postgres revoke execute on functions from public;
