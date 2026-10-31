-- =====================================================================
-- RadiologicHub — Abonnements : lecture contrôlée des contenus réservés
-- (PRÉPARATION, non appliquée ; prérequis : 20261030090000_abonnements.sql)
-- ---------------------------------------------------------------------
-- Complète ab_contenus (lisible par les abonnés via les droits par ligne)
-- par une porte d'entrée unique, recommandée pour le site :
-- • ab_lire_contenu(id) : un contenu à la fois, si l'abonnement est en
--   cours (ou administrateur) ; refus explicite sinon ;
-- • plafond de lectures par compte et par heure (freine l'extraction en
--   bloc) ; journal minimal (compte, contenu, date ; aucune donnée de
--   patient), lisible par l'administrateur seulement ;
-- • version de chaque contenu (incrémentée à chaque modification).
-- Le contrôle est fait par la base : un bouton masqué ne protège rien.
-- • PORTE UNIQUE : la lecture directe de ab_contenus par les abonnés est
--   retirée (sinon « select * from ab_contenus » contournerait le plafond
--   et le journal en extrayant tout d'un coup) ; seul l'administrateur lit
--   la table, les abonnés passent par ab_lire_contenu.
-- =====================================================================

alter table public.ab_contenus add column if not exists version integer not null default 1;

create or replace function public.ab_contenus_version() returns trigger
language plpgsql set search_path = public as $$
begin
  if tg_op = 'UPDATE' and new.contenu is distinct from old.contenu then new.version := old.version + 1; end if;
  return new;
end $$;
drop trigger if exists ab_contenus_version on public.ab_contenus;
create trigger ab_contenus_version before update on public.ab_contenus
  for each row execute function public.ab_contenus_version();

create table if not exists public.ab_journal (
  id bigint generated always as identity primary key,
  membre_id uuid not null references auth.users (id) on delete cascade,
  contenu_id text not null,
  lu_le timestamptz not null default now()
);
create index if not exists ab_journal_membre_date on public.ab_journal (membre_id, lu_le desc);

-- Porte unique : plus de lecture directe de la table par les abonnés (règle ab_contenus_admin conservée).
drop policy if exists ab_contenus_abonnes on public.ab_contenus;
alter table public.ab_journal enable row level security;
drop policy if exists ab_journal_admin on public.ab_journal;
create policy ab_journal_admin on public.ab_journal for select to authenticated using (rp_est_admin());

-- Plafond : 120 lectures par compte et par heure (administrateur non limité).
create or replace function public.ab_lire_contenu(identifiant text)
returns table (id text, module text, titre text, contenu_json jsonb, version integer)
language plpgsql security definer set search_path = public as $$
declare moi uuid := auth.uid(); admin boolean := rp_est_admin();
begin
  if moi is null then raise exception 'connexion requise' using errcode = '28000'; end if;
  -- identifiant de la forme des contenus (ab_contenus.id) : rien d'autre n'est journalisé
  if identifiant is null or identifiant !~ '^[a-z0-9-]{1,80}$' then raise exception 'contenu introuvable' using errcode = 'P0002'; end if;
  if not admin and not ab_est_abonne() then raise exception 'abonnement requis' using errcode = '42501'; end if;
  if not admin and (select count(*) from ab_journal j where j.membre_id = moi and j.lu_le > now() - interval '1 hour') >= 120 then
    raise exception 'trop de lectures, réessayez plus tard' using errcode = '54000';
  end if;
  insert into ab_journal (membre_id, contenu_id) values (moi, identifiant);
  return query select c.id, c.module, c.titre, c.contenu, c.version from ab_contenus c where c.id = identifiant;
end $$;

-- ---------- Droits explicites (exposition automatique désactivée) ----------
revoke all on public.ab_journal from anon, authenticated;
-- Séquence de l'identifiant (colonne identity) : les droits par défaut de Supabase l'ouvriraient aux visiteurs.
revoke all on sequence public.ab_journal_id_seq from public, anon, authenticated;
grant select on public.ab_journal to authenticated;          -- filtré : administrateur seulement
grant all on public.ab_journal to service_role;
revoke execute on function public.ab_lire_contenu(text) from public, anon;
grant execute on function public.ab_lire_contenu(text) to authenticated, service_role;
revoke execute on function public.ab_contenus_version() from public, anon, authenticated;
