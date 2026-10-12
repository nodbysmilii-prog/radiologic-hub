-- =====================================================================
-- RadiologicHub — Bibliothèque : annuaire d'articles en accès libre
-- ---------------------------------------------------------------------
-- Le site N'HÉBERGE PAS les articles : uniquement des liens et des
-- métadonnées (titre, premier auteur, revue, année, identifiants,
-- licence) et le résumé personnel de l'administrateur. Aucune colonne
-- n'est prévue pour l'abstract ni pour les figures.
--
-- • Visiteurs (anon) : lecture des seuls articles PUBLIÉS, et seulement
--   des colonnes publiques.
-- • Administrateur (rp_admins, même compte que les autres modules) :
--   import, modification, publication, rejet.
-- • Fonctions serveur (service_role, veille de l'étape 4) : ajout dans
--   la file « à valider » ; rien n'est jamais publié automatiquement
--   (déclencheur bib_avant_ecriture).
-- • Doublons : DOI (en minuscules), PMID et PMCID uniques.
-- • Sous-spécialités, organes, modalités, classifications, niveaux et
--   thèmes sont définis dans bibliotheque/config.js : la base vérifie
--   seulement leur format, pour qu'en ajouter n'exige aucune migration.
-- Exposition automatique désactivée : droits accordés explicitement en
-- fin de fichier (liste vérifiée par tests/sql/droits.js).
-- Prérequis : 20261008120000_remplacements.sql (rp_est_admin).
-- =====================================================================

create table if not exists public.bib_articles (
  id uuid primary key default gen_random_uuid(),
  doi text unique check (doi is null or (doi = lower(doi) and doi ~ '^10\.[0-9]{4,9}/\S+$' and length(doi) <= 300)),
  pmid text unique check (pmid is null or pmid ~ '^[1-9][0-9]{0,8}$'),
  pmcid text unique check (pmcid is null or pmcid ~ '^PMC[1-9][0-9]{0,8}$'),
  titre text not null check (length(btrim(titre)) between 1 and 600),
  premier_auteur text check (length(premier_auteur) <= 200),
  et_al boolean not null default false,
  revue text check (length(revue) <= 200),
  annee smallint check (annee between 1900 and 2100),
  licence text check (length(licence) <= 40),
  acces text not null check (acces in ('ouvert', 'gratuit', 'a_verifier')),
  oa_statut text check (length(oa_statut) <= 20),
  url_texte text not null check (url_texte ~ '^https://' and length(url_texte) <= 1000),
  source_texte text check (length(source_texte) <= 60),
  specialite text check (specialite ~ '^[a-z0-9-]+$'),
  organes text[] not null default '{}' check (array_to_string(organes, ',') ~ '^([a-z0-9-]+(,[a-z0-9-]+)*)?$'),
  modalites text[] not null default '{}' check (array_to_string(modalites, ',') ~ '^([a-z0-9-]+(,[a-z0-9-]+)*)?$'),
  classifications text[] not null default '{}' check (array_to_string(classifications, ',') ~ '^([a-z0-9-]+(,[a-z0-9-]+)*)?$'),
  niveau text check (niveau ~ '^[a-z0-9-]+$'),
  resume text check (length(resume) <= 400),
  statut text not null default 'a_valider' check (statut in ('a_valider', 'publie', 'rejete')),
  motif_rejet text check (length(motif_rejet) <= 300),
  origine text not null default 'import' check (origine in ('import', 'lot', 'veille')),
  requete text check (length(requete) <= 120),
  lien_etat text not null default 'a_verifier' check (lien_etat in ('ok', 'a_verifier', 'mort')),
  lien_verifie_le timestamptz,
  cree_le timestamptz not null default now(),
  maj_le timestamptz not null default now(),
  publie_le timestamptz,
  constraint bib_articles_identifiant check (doi is not null or pmid is not null),
  constraint bib_articles_publiable check (statut <> 'publie' or (specialite is not null and niveau is not null))
);
create index if not exists bib_articles_statut on public.bib_articles (statut, publie_le desc);

-- Rattachement aux thèmes : badge « Essentiel » et ordre de lecture conseillé, propres à chaque thème
create table if not exists public.bib_article_themes (
  article_id uuid not null references public.bib_articles (id) on delete cascade,
  theme text not null check (theme ~ '^[a-z0-9-]+$'),
  essentiel boolean not null default false,
  rang smallint check (rang between 1 and 999),
  primary key (article_id, theme)
);
create index if not exists bib_article_themes_theme on public.bib_article_themes (theme);

-- ---------- Normalisation et garde-fous ----------
-- DOI en minuscules (doublons insensibles à la casse), dates de mise à jour et de publication ;
-- seul l'administrateur peut publier (la veille, qui écrit avec la clé de service, ne le peut pas).
create or replace function public.bib_avant_ecriture() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.doi := nullif(lower(btrim(new.doi)), '');
  new.maj_le := now();
  if new.statut = 'publie' and (tg_op = 'INSERT' or old.statut is distinct from 'publie') then
    if not rp_est_admin() then
      raise exception 'Seul l''administrateur peut publier un article.' using errcode = '42501';
    end if;
    new.publie_le := now();
  elsif new.statut <> 'publie' then
    new.publie_le := null;
  end if;
  if new.statut <> 'rejete' then new.motif_rejet := null; end if;
  return new;
end $$;
drop trigger if exists bib_avant_ecriture on public.bib_articles;
create trigger bib_avant_ecriture before insert or update on public.bib_articles
  for each row execute function public.bib_avant_ecriture();

-- ---------- Droits d'accès par ligne ----------
alter table public.bib_articles enable row level security;
alter table public.bib_article_themes enable row level security;

drop policy if exists bib_articles_visiteurs on public.bib_articles;
create policy bib_articles_visiteurs on public.bib_articles for select to anon using (statut = 'publie');
drop policy if exists bib_articles_lecture on public.bib_articles;
create policy bib_articles_lecture on public.bib_articles for select to authenticated using (statut = 'publie' or rp_est_admin());
drop policy if exists bib_articles_ajout on public.bib_articles;
create policy bib_articles_ajout on public.bib_articles for insert to authenticated with check (rp_est_admin());
drop policy if exists bib_articles_modification on public.bib_articles;
create policy bib_articles_modification on public.bib_articles for update to authenticated using (rp_est_admin()) with check (rp_est_admin());
drop policy if exists bib_articles_suppression on public.bib_articles;
create policy bib_articles_suppression on public.bib_articles for delete to authenticated using (rp_est_admin());

drop policy if exists bib_themes_visiteurs on public.bib_article_themes;
create policy bib_themes_visiteurs on public.bib_article_themes for select to anon
  using (exists (select 1 from public.bib_articles a where a.id = article_id and a.statut = 'publie'));
drop policy if exists bib_themes_lecture on public.bib_article_themes;
create policy bib_themes_lecture on public.bib_article_themes for select to authenticated
  using (rp_est_admin() or exists (select 1 from public.bib_articles a where a.id = article_id and a.statut = 'publie'));
drop policy if exists bib_themes_ecriture on public.bib_article_themes;
create policy bib_themes_ecriture on public.bib_article_themes for all to authenticated using (rp_est_admin()) with check (rp_est_admin());

-- ---------- Droits explicites (exposition automatique désactivée) ----------
revoke all on public.bib_articles, public.bib_article_themes from anon, authenticated;
-- Visiteurs : colonnes publiques seulement (ni l'origine, ni le motif de rejet, ni l'état interne des liens)
grant select (id, doi, pmid, pmcid, titre, premier_auteur, et_al, revue, annee, licence, acces, url_texte, source_texte,
              specialite, organes, modalites, classifications, niveau, resume, statut, publie_le)
  on public.bib_articles to anon;
grant select on public.bib_article_themes to anon;
-- Utilisateurs connectés : lecture des publiés ; écriture réservée à l'administrateur par les règles ci-dessus
grant select, insert, update, delete on public.bib_articles, public.bib_article_themes to authenticated;
-- Fonctions serveur (veille, vérification des liens)
grant all on public.bib_articles, public.bib_article_themes to service_role;
revoke execute on function public.bib_avant_ecriture() from public, anon, authenticated;
