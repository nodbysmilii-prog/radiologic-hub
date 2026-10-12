-- =====================================================================
-- RadiologicHub — Cours (échoanatomie) : validation par l'auteur
-- ---------------------------------------------------------------------
-- Chaque élément d'un cours (texte, schéma de coupe, modèle 3D, image
-- échographique) porte une VERSION calculée par le site (empreinte du
-- contenu). Il n'est montré aux élèves que s'il est APPROUVÉ dans cette
-- version exacte : toute modification le remet « à valider ».
--
-- • cours_validations : statut de chaque élément (a_valider, approuve,
--   a_corriger) et commentaire de l'auteur (effacé à l'approbation).
-- • cours_images : images échographiques de l'auteur, une par schéma,
--   avec leurs étiquettes superposées (positions en %) et leur
--   orientation ; « revision » augmente à chaque modification.
-- • cours_reglages : bloc « Source / crédits » rempli par l'auteur.
-- • Stockage « cours-images » : fichiers des images (chemins aléatoires,
--   jamais publiés tant que la ligne de cours_images n'est pas approuvée).
--
-- • Visiteurs (anon) : lecture des seuls éléments approuvés (sans le
--   commentaire), des seules images approuvées dans leur révision
--   actuelle, et des crédits.
-- • Administrateur (rp_admins, même compte que les autres modules) :
--   lecture et écriture de tout.
-- Exposition automatique désactivée : droits accordés explicitement en
-- fin de fichier (liste vérifiée par tests/sql/droits.js).
-- Prérequis : 20261008120000_remplacements.sql (rp_est_admin).
-- =====================================================================

create table if not exists public.cours_validations (
  cours text not null check (cours ~ '^[a-z0-9-]{1,60}$'),
  element text not null check (element ~ '^(texte|schema|modele|image)-?[a-z0-9-]{0,60}$'),
  type text not null check (type in ('texte', 'schema', 'modele', 'image')),
  version text not null check (version ~ '^[a-z0-9]{1,40}$'),
  statut text not null default 'a_valider' check (statut in ('a_valider', 'approuve', 'a_corriger')),
  commentaire text check (length(commentaire) <= 1000),
  maj_le timestamptz not null default now(),
  primary key (cours, element),
  constraint cours_validations_type check (element = type or element like type || '-%')
);

create table if not exists public.cours_images (
  cours text not null check (cours ~ '^[a-z0-9-]{1,60}$'),
  schema text not null check (schema ~ '^s[0-9]{1,2}$'),
  chemin text not null check (chemin ~ '^[a-z0-9-]+/[a-z0-9-]+\.(jpg|png|webp)$'),
  largeur integer check (largeur between 1 and 10000),
  hauteur integer check (hauteur between 1 and 10000),
  orientation text not null default 'medial_gauche' check (orientation in ('medial_gauche', 'medial_droite')),
  etiquettes jsonb not null default '[]' check (jsonb_typeof(etiquettes) = 'array' and jsonb_array_length(etiquettes) <= 30),
  revision integer not null default 1,
  maj_le timestamptz not null default now(),
  primary key (cours, schema)
);

create table if not exists public.cours_reglages (
  cours text primary key check (cours ~ '^[a-z0-9-]{1,60}$'),
  credits text check (length(credits) <= 3000),
  maj_le timestamptz not null default now()
);

-- ---------- Révision des images et dates ----------
-- Toute modification d'une image (fichier, étiquettes, orientation) change sa révision,
-- donc sa version « r<révision> » : elle redevient invisible jusqu'à une nouvelle approbation.
create or replace function public.cours_images_avant_ecriture() returns trigger
language plpgsql set search_path = public as $$
begin
  new.maj_le := now();
  if tg_op = 'UPDATE' then
    new.revision := old.revision + 1;
  else
    new.revision := 1;
  end if;
  return new;
end $$;
drop trigger if exists cours_images_avant_ecriture on public.cours_images;
create trigger cours_images_avant_ecriture before insert or update on public.cours_images
  for each row execute function public.cours_images_avant_ecriture();

create or replace function public.cours_maj_le() returns trigger
language plpgsql set search_path = public as $$
begin
  new.maj_le := now();
  return new;
end $$;
-- Le commentaire sert aux corrections : effacé à l'approbation (les éléments approuvés sont lisibles de tous)
create or replace function public.cours_validations_avant_ecriture() returns trigger
language plpgsql set search_path = public as $$
begin
  new.maj_le := now();
  if new.statut = 'approuve' then new.commentaire := null; end if;
  return new;
end $$;
drop trigger if exists cours_validations_avant_ecriture on public.cours_validations;
create trigger cours_validations_avant_ecriture before insert or update on public.cours_validations
  for each row execute function public.cours_validations_avant_ecriture();
drop trigger if exists cours_reglages_maj_le on public.cours_reglages;
create trigger cours_reglages_maj_le before insert or update on public.cours_reglages
  for each row execute function public.cours_maj_le();

-- ---------- Droits d'accès par ligne ----------
alter table public.cours_validations enable row level security;
alter table public.cours_images enable row level security;
alter table public.cours_reglages enable row level security;

drop policy if exists cours_validations_visiteurs on public.cours_validations;
create policy cours_validations_visiteurs on public.cours_validations for select to anon using (statut = 'approuve');
drop policy if exists cours_validations_lecture on public.cours_validations;
create policy cours_validations_lecture on public.cours_validations for select to authenticated
  using (statut = 'approuve' or rp_est_admin());
drop policy if exists cours_validations_admin on public.cours_validations;
create policy cours_validations_admin on public.cours_validations for all to authenticated
  using (rp_est_admin()) with check (rp_est_admin());

-- Une image n'est lisible que si elle est approuvée dans sa révision actuelle
drop policy if exists cours_images_visiteurs on public.cours_images;
create policy cours_images_visiteurs on public.cours_images for select to anon
  using (exists (
    select 1 from public.cours_validations v
    where v.cours = cours_images.cours and v.element = 'image-' || cours_images.schema
      and v.statut = 'approuve' and v.version = 'r' || cours_images.revision));
drop policy if exists cours_images_lecture on public.cours_images;
create policy cours_images_lecture on public.cours_images for select to authenticated
  using (rp_est_admin() or exists (
    select 1 from public.cours_validations v
    where v.cours = cours_images.cours and v.element = 'image-' || cours_images.schema
      and v.statut = 'approuve' and v.version = 'r' || cours_images.revision));
drop policy if exists cours_images_admin on public.cours_images;
create policy cours_images_admin on public.cours_images for all to authenticated
  using (rp_est_admin()) with check (rp_est_admin());

drop policy if exists cours_reglages_lecture on public.cours_reglages;
create policy cours_reglages_lecture on public.cours_reglages for select to anon, authenticated using (true);
drop policy if exists cours_reglages_admin on public.cours_reglages;
create policy cours_reglages_admin on public.cours_reglages for all to authenticated
  using (rp_est_admin()) with check (rp_est_admin());

-- ---------- Stockage des images (administrateur seulement en écriture) ----------
insert into storage.buckets (id, name, public) values ('cours-images', 'cours-images', true) on conflict (id) do nothing;
drop policy if exists cours_images_fichiers_admin on storage.objects;
create policy cours_images_fichiers_admin on storage.objects for all to authenticated
  using (bucket_id = 'cours-images' and rp_est_admin())
  with check (bucket_id = 'cours-images' and rp_est_admin());

-- ---------- Droits explicites (exposition automatique désactivée) ----------
revoke all on public.cours_validations, public.cours_images, public.cours_reglages from anon, authenticated;
-- Visiteurs : éléments approuvés sans le commentaire de l'auteur ; images approuvées ; crédits
grant select (cours, element, type, version, statut) on public.cours_validations to anon;
grant select on public.cours_images, public.cours_reglages to anon;
-- Utilisateurs connectés : mêmes lectures ; écriture réservée à l'administrateur par les règles ci-dessus
grant select, insert, update, delete on public.cours_validations, public.cours_images, public.cours_reglages to authenticated;
grant all on public.cours_validations, public.cours_images, public.cours_reglages to service_role;
revoke execute on function public.cours_images_avant_ecriture(), public.cours_maj_le(), public.cours_validations_avant_ecriture()
  from public, anon, authenticated;
