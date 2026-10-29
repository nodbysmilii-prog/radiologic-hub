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

-- Coffre-fort (Vault), requêtes HTTP (pg_net) et pgcrypto, simulés pour la
-- planification de rp-taches (tests/sql/planification.js). Comme sur Supabase :
-- ni anon ni authenticated n'ont accès aux schémas vault et net. Le « chiffrement »
-- n'est pas simulé : seul le contrôle des droits est testé ici.
create schema extensions;
create extension pgcrypto schema extensions;
create schema vault;
create table vault.secrets (
  id uuid primary key default gen_random_uuid(),
  name text unique,
  description text not null default '',
  secret text not null,
  created_at timestamptz not null default now()
);
create view vault.decrypted_secrets as select id, name, description, secret, secret as decrypted_secret, created_at from vault.secrets;
create function vault.create_secret(new_secret text, new_name text default null, new_description text default '', new_key_id uuid default null)
returns uuid language sql as $$ insert into vault.secrets (name, description, secret) values (new_name, new_description, new_secret) returning id $$;
create function vault.update_secret(secret_id uuid, new_secret text default null, new_name text default null, new_description text default null, new_key_id uuid default null)
returns void language sql as $$ update vault.secrets set secret = coalesce(new_secret, secret) where id = secret_id $$;
create schema net;
create table net.http_request_queue (id bigserial primary key, method text, url text, headers jsonb, body jsonb, timeout_milliseconds int);
create function net.http_post(url text, body jsonb default '{}'::jsonb, params jsonb default '{}'::jsonb,
  headers jsonb default '{"Content-Type": "application/json"}'::jsonb, timeout_milliseconds int default 5000)
returns bigint language sql as $$
  insert into net.http_request_queue (method, url, headers, body, timeout_milliseconds) values ('POST', url, headers, body, timeout_milliseconds) returning id
$$;
revoke all on schema vault, net from public;
revoke all on all tables in schema vault from public;
revoke all on all tables in schema net from public;
revoke all on all functions in schema vault from public;
revoke all on all functions in schema net from public;
