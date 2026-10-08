-- =====================================================================
-- RadiologicHub — module Remplacements : schéma de la base (Supabase)
-- ---------------------------------------------------------------------
-- • profils : le compte RadiologicHub (un par personne), créé à la
--   première connexion ; une même personne peut être remplaçant et
--   membre d'une ou plusieurs structures.
-- • rp_* : tables du module Remplacements.
-- Droits d'accès par ligne (RLS) : chacun ne voit que ses données ; une
-- structure ne voit un remplaçant qu'après qu'il s'est dit disponible
-- pour l'une de ses demandes ; les demandes, propositions, jetons,
-- journaux ne sont écrits que par les fonctions serveur (clé de service).
-- Aucune donnée patient.
-- Testé sur PostgreSQL 16 avec une simulation de Supabase :
-- tests/sql/ (npm run test:sql).
-- =====================================================================

-- ---------- Administrateurs (adresses e-mail) ----------
create table if not exists public.rp_admins (
  email text primary key
);
comment on table public.rp_admins is 'Adresses e-mail des administrateurs du module Remplacements (à remplir à l''installation).';

create or replace function public.rp_est_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from rp_admins where lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));
$$;

-- ---------- Comptes ----------
create table if not exists public.profils (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  nom text not null default '',
  prenom text not null default '',
  telephone text not null default '',
  desinscrit boolean not null default false,          -- ne plus recevoir de propositions ni de récapitulatifs
  consentement_le timestamptz,                         -- loi organique n° 2004-63 : consentement au traitement
  cree_le timestamptz not null default now()
);
comment on table public.profils is 'Compte RadiologicHub (un par personne), partagé par les modules du site.';

-- Création du profil à la première connexion (lien magique)
create or replace function public.rp_nouvel_utilisateur() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profils (id, email, nom, prenom, telephone)
  values (new.id, new.email,
          coalesce(new.raw_user_meta_data ->> 'nom', ''),
          coalesce(new.raw_user_meta_data ->> 'prenom', ''),
          coalesce(new.raw_user_meta_data ->> 'telephone', ''))
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists rp_nouvel_utilisateur on auth.users;
create trigger rp_nouvel_utilisateur after insert on auth.users for each row execute function public.rp_nouvel_utilisateur();

-- ---------- Remplaçants ----------
create table if not exists public.rp_remplacants (
  id uuid primary key references public.profils (id) on delete cascade,
  statut text not null check (statut in ('specialiste', 'resident')),
  annee_residanat smallint check (annee_residanat between 3 and 5),
  affectation text not null default '',
  competences text[] not null default '{}' check (competences <@ array['conventionnelle','echographie','mammographie','scanner','irm','interventionnel']),
  gouvernorats text[] not null default '{}',
  honoraires_souhaites numeric(10, 3) check (honoraires_souhaites >= 0),   -- TND par jour, indicatif
  justificatif text,                                                        -- chemin dans le stockage privé
  etat text not null default 'en_attente' check (etat in ('en_attente', 'valide', 'refuse', 'suspendu')),
  valide_le timestamptz,
  valide_par uuid,
  motif_refus text,
  cree_le timestamptz not null default now(),
  check (statut <> 'resident' or annee_residanat is not null)
);

-- ---------- Structures (cliniques, cabinets) ----------
create table if not exists public.rp_structures (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  type text not null check (type in ('clinique', 'cabinet')),
  adresse text not null,
  ville text not null,
  gouvernorat text not null,
  equipements text[] not null default '{}',
  contact_nom text not null,
  telephone text not null,
  email text not null,
  etat text not null default 'en_attente' check (etat in ('en_attente', 'valide', 'refuse', 'suspendu')),
  valide_le timestamptz,
  valide_par uuid,
  motif_refus text,
  attribution_auto boolean not null default false,   -- attribuer automatiquement au premier qui accepte
  delai_relance_h integer not null default 12 check (delai_relance_h between 1 and 168),
  desinscrit boolean not null default false,
  cree_par uuid references public.profils (id) on delete set null,
  cree_le timestamptz not null default now()
);

create table if not exists public.rp_membres (
  structure_id uuid references public.rp_structures (id) on delete cascade,
  profil_id uuid references public.profils (id) on delete cascade,
  role text not null default 'membre' check (role in ('responsable', 'membre')),
  cree_le timestamptz not null default now(),
  primary key (structure_id, profil_id)
);
-- Invitation d'un collègue par e-mail : rattachement à sa première connexion
create table if not exists public.rp_invitations (
  structure_id uuid references public.rp_structures (id) on delete cascade,
  email text not null,
  invite_par uuid references public.profils (id) on delete set null,
  cree_le timestamptz not null default now(),
  primary key (structure_id, email)
);
create table if not exists public.rp_favoris (
  structure_id uuid references public.rp_structures (id) on delete cascade,
  remplacant_id uuid references public.rp_remplacants (id) on delete cascade,
  primary key (structure_id, remplacant_id)
);

-- ---------- Disponibilités ----------
create table if not exists public.rp_disponibilites (
  remplacant_id uuid references public.rp_remplacants (id) on delete cascade,
  date date not null,
  creneau text not null check (creneau in ('journee', 'matin', 'apres_midi', 'garde')),
  primary key (remplacant_id, date, creneau)
);
create index if not exists rp_disponibilites_date on public.rp_disponibilites (date);

-- ---------- Demandes de remplacement ----------
create table if not exists public.rp_demandes (
  id uuid primary key default gen_random_uuid(),
  structure_id uuid not null references public.rp_structures (id) on delete cascade,
  cree_par uuid references public.profils (id) on delete set null,
  dates date[] not null check (cardinality(dates) between 1 and 31),
  heure_debut text not null check (heure_debut ~ '^\d{2}:\d{2}$'),
  heure_fin text not null check (heure_fin ~ '^\d{2}:\d{2}$'),
  type text not null check (type in ('journee', 'demi_journee', 'garde', 'week_end')),
  modalites text[] not null check (cardinality(modalites) > 0),
  profil text not null check (profil in ('specialiste', 'residents')),
  annee_min smallint check (annee_min between 3 and 5),
  honoraires numeric(10, 3) not null check (honoraires > 0),
  unite text not null check (unite in ('jour', 'garde')),
  logement boolean not null default false,
  transport boolean not null default false,
  repas boolean not null default false,
  commentaire text not null default '',
  etat text not null default 'publiee' check (etat in ('publiee', 'pourvue', 'realisee', 'non_realisee', 'annulee', 'expiree')),
  remplacant_id uuid references public.rp_remplacants (id) on delete set null,
  attribution text check (attribution in ('manuelle', 'auto')),
  exclus uuid[] not null default '{}',               -- remplaçants qui se sont désistés : plus recontactés
  publiee_le timestamptz,
  pourvue_le timestamptz,
  remise_le timestamptz,
  relancee_le timestamptz,
  rappel_le timestamptz,
  realisation_demandee_le timestamptz,
  realisation_remplacant boolean,
  realisation_structure boolean,
  annulee_le timestamptz,
  version integer not null default 1,
  cree_le timestamptz not null default now()
);
create index if not exists rp_demandes_etat on public.rp_demandes (etat);
create index if not exists rp_demandes_structure on public.rp_demandes (structure_id);
create index if not exists rp_demandes_remplacant on public.rp_demandes (remplacant_id);

create table if not exists public.rp_propositions (
  id uuid primary key default gen_random_uuid(),
  demande_id uuid not null references public.rp_demandes (id) on delete cascade,
  remplacant_id uuid not null references public.rp_remplacants (id) on delete cascade,
  etat text not null default 'envoyee' check (etat in ('envoyee', 'interesse', 'decline', 'retenu', 'pourvu_autre', 'expiree', 'annulee', 'liberee')),
  reponse text check (reponse in ('disponible', 'indisponible')),
  envoyee_le timestamptz,
  repondu_le timestamptz,
  relancee_le timestamptz,
  choisi_le timestamptz,
  annule_le timestamptz,
  unique (demande_id, remplacant_id)
);
create index if not exists rp_propositions_remplacant on public.rp_propositions (remplacant_id);

-- Liens des e-mails : seule l'empreinte SHA-256 du jeton est stockée
create table if not exists public.rp_jetons (
  hash text primary key,
  action text not null check (action in ('disponible', 'indisponible', 'choisir', 'annuler', 'realise_oui', 'realise_non')),
  demande_id uuid references public.rp_demandes (id) on delete cascade,
  proposition_id uuid references public.rp_propositions (id) on delete cascade,
  profil_id uuid,
  partie text check (partie in ('remplacant', 'structure')),
  expire_le timestamptz,
  utilise_le timestamptz,
  cree_le timestamptz not null default now()
);

-- ---------- Journaux ----------
create table if not exists public.rp_journal (
  id uuid primary key default gen_random_uuid(),
  quand timestamptz not null default now(),
  action text not null,
  acteur_id uuid,
  acteur_role text,
  objet_type text,
  objet_id text,
  details jsonb not null default '{}'
);
create index if not exists rp_journal_action on public.rp_journal (action, objet_id);
create table if not exists public.rp_emails (
  id uuid primary key default gen_random_uuid(),
  cree_le timestamptz not null default now(),
  destinataire text not null,
  profil_id uuid,
  structure_id uuid,
  modele text not null,
  objet text,
  canal text not null default 'email',              -- prêt pour 'whatsapp', 'sms'
  statut text not null check (statut in ('a_envoyer', 'envoye', 'echec', 'ignore_desinscrit')),
  envoye_le timestamptz,
  erreur text,
  fournisseur_id text
);

-- ---------- Fonctions d'aide aux droits d'accès ----------
create or replace function public.rp_est_membre(sid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from rp_membres where structure_id = sid and profil_id = auth.uid());
$$;
create or replace function public.rp_est_responsable(sid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from rp_membres where structure_id = sid and profil_id = auth.uid() and role = 'responsable');
$$;
-- Une structure voit un remplaçant qui s'est dit disponible pour l'une de ses demandes
create or replace function public.rp_voit_remplacant(rid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from rp_propositions p
    join rp_demandes d on d.id = p.demande_id
    join rp_membres m on m.structure_id = d.structure_id and m.profil_id = auth.uid()
    where p.remplacant_id = rid and p.etat in ('interesse', 'retenu', 'pourvu_autre', 'annulee', 'liberee')
  );
$$;
-- Un remplaçant voit les demandes (et leur structure) qui lui ont été proposées
create or replace function public.rp_a_recu(did uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from rp_propositions where demande_id = did and remplacant_id = auth.uid());
$$;
create or replace function public.rp_a_recu_de(sid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from rp_propositions p join rp_demandes d on d.id = p.demande_id where d.structure_id = sid and p.remplacant_id = auth.uid());
$$;
create or replace function public.rp_membre_meme_structure(pid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from rp_membres a join rp_membres b on a.structure_id = b.structure_id where a.profil_id = auth.uid() and b.profil_id = pid);
$$;

-- ---------- Protection des champs réservés à l'administrateur ----------
create or replace function public.rp_proteger_validation() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' and not rp_est_admin() then
    if tg_op = 'INSERT' then
      new.etat := 'en_attente'; new.valide_le := null; new.valide_par := null; new.motif_refus := null;
    else
      new.etat := old.etat; new.valide_le := old.valide_le; new.valide_par := old.valide_par; new.motif_refus := old.motif_refus;
    end if;
    if tg_table_name = 'rp_structures' then
      if tg_op = 'INSERT' then new.cree_par := auth.uid(); new.desinscrit := false;
      else new.cree_par := old.cree_par; end if;
    end if;
  end if;
  return new;
end $$;
drop trigger if exists rp_proteger_validation on public.rp_remplacants;
create trigger rp_proteger_validation before insert or update on public.rp_remplacants for each row execute function public.rp_proteger_validation();
drop trigger if exists rp_proteger_validation on public.rp_structures;
create trigger rp_proteger_validation before insert or update on public.rp_structures for each row execute function public.rp_proteger_validation();

create or replace function public.rp_proteger_profil() returns trigger
language plpgsql as $$
begin
  new.id := old.id;
  if coalesce(auth.role(), '') <> 'service_role' then new.email := old.email; new.cree_le := old.cree_le; end if;
  return new;
end $$;
drop trigger if exists rp_proteger_profil on public.profils;
create trigger rp_proteger_profil before update on public.profils for each row execute function public.rp_proteger_profil();

-- Le créateur d'une structure en devient responsable
create or replace function public.rp_structure_creee() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.cree_par is not null then
    insert into rp_membres (structure_id, profil_id, role) values (new.id, new.cree_par, 'responsable') on conflict do nothing;
  end if;
  return new;
end $$;
drop trigger if exists rp_structure_creee on public.rp_structures;
create trigger rp_structure_creee after insert on public.rp_structures for each row execute function public.rp_structure_creee();

-- ---------- Fonctions appelées par le site ----------
-- Rattache l'utilisateur connecté aux structures qui l'ont invité
create or replace function public.rp_accepter_invitations() returns integer
language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  with i as (
    delete from rp_invitations where lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')) returning structure_id
  )
  insert into rp_membres (structure_id, profil_id, role) select structure_id, auth.uid(), 'membre' from i on conflict do nothing;
  get diagnostics n = row_count;
  return n;
end $$;

-- Compteurs d'une demande (sans dévoiler qui a été contacté ou a décliné)
create or replace function public.rp_compteurs(ids uuid[])
returns table (demande_id uuid, contactes integer, disponibles integer, declines integer, en_attente integer)
language sql stable security definer set search_path = public as $$
  select d.id,
         count(p.*)::int,
         count(*) filter (where p.etat in ('interesse', 'retenu'))::int,
         count(*) filter (where p.etat = 'decline')::int,
         count(*) filter (where p.etat = 'envoyee')::int
  from rp_demandes d left join rp_propositions p on p.demande_id = d.id
  where d.id = any(ids) and (rp_est_membre(d.structure_id) or rp_est_admin())
  group by d.id;
$$;

-- Statistiques de l'administrateur
create or replace function public.rp_statistiques() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not rp_est_admin() then raise exception 'réservé à l''administrateur'; end if;
  return jsonb_build_object(
    'remplacants', (select jsonb_object_agg(etat, n) from (select etat, count(*) n from rp_remplacants group by etat) x),
    'structures', (select jsonb_object_agg(etat, n) from (select etat, count(*) n from rp_structures group by etat) x),
    'demandes', (select jsonb_object_agg(etat, n) from (select etat, count(*) n from rp_demandes group by etat) x),
    'emails', (select jsonb_object_agg(statut, n) from (select statut, count(*) n from rp_emails group by statut) x),
    'delai_moyen_h', (select round(avg(extract(epoch from pourvue_le - publiee_le)) / 3600, 1) from rp_demandes where pourvue_le is not null),
    'honoraires', (select coalesce(sum(honoraires * cardinality(dates)), 0) from rp_demandes where etat = 'realisee')
  );
end $$;

-- ---------- Droits d'accès par ligne ----------
alter table public.rp_admins enable row level security;
alter table public.profils enable row level security;
alter table public.rp_remplacants enable row level security;
alter table public.rp_structures enable row level security;
alter table public.rp_membres enable row level security;
alter table public.rp_invitations enable row level security;
alter table public.rp_favoris enable row level security;
alter table public.rp_disponibilites enable row level security;
alter table public.rp_demandes enable row level security;
alter table public.rp_propositions enable row level security;
alter table public.rp_jetons enable row level security;
alter table public.rp_journal enable row level security;
alter table public.rp_emails enable row level security;

-- profils
drop policy if exists profils_lecture on public.profils;
create policy profils_lecture on public.profils for select to authenticated
  using (id = auth.uid() or rp_est_admin() or rp_voit_remplacant(id) or rp_membre_meme_structure(id));
drop policy if exists profils_modification on public.profils;
create policy profils_modification on public.profils for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
drop policy if exists profils_suppression on public.profils;
create policy profils_suppression on public.profils for delete to authenticated using (id = auth.uid() or rp_est_admin());

-- remplaçants
drop policy if exists rp_remplacants_lecture on public.rp_remplacants;
create policy rp_remplacants_lecture on public.rp_remplacants for select to authenticated
  using (id = auth.uid() or rp_est_admin() or rp_voit_remplacant(id));
drop policy if exists rp_remplacants_creation on public.rp_remplacants;
create policy rp_remplacants_creation on public.rp_remplacants for insert to authenticated with check (id = auth.uid());
drop policy if exists rp_remplacants_modification on public.rp_remplacants;
create policy rp_remplacants_modification on public.rp_remplacants for update to authenticated
  using (id = auth.uid() or rp_est_admin()) with check (id = auth.uid() or rp_est_admin());
drop policy if exists rp_remplacants_suppression on public.rp_remplacants;
create policy rp_remplacants_suppression on public.rp_remplacants for delete to authenticated using (id = auth.uid() or rp_est_admin());

-- structures
drop policy if exists rp_structures_lecture on public.rp_structures;
create policy rp_structures_lecture on public.rp_structures for select to authenticated
  using (rp_est_membre(id) or rp_est_admin() or rp_a_recu_de(id) or cree_par = auth.uid());
drop policy if exists rp_structures_creation on public.rp_structures;
create policy rp_structures_creation on public.rp_structures for insert to authenticated with check (auth.uid() is not null);
drop policy if exists rp_structures_modification on public.rp_structures;
create policy rp_structures_modification on public.rp_structures for update to authenticated
  using (rp_est_responsable(id) or rp_est_admin()) with check (rp_est_responsable(id) or rp_est_admin());
drop policy if exists rp_structures_suppression on public.rp_structures;
create policy rp_structures_suppression on public.rp_structures for delete to authenticated using (rp_est_responsable(id) or rp_est_admin());

-- membres, invitations, favoris
drop policy if exists rp_membres_lecture on public.rp_membres;
create policy rp_membres_lecture on public.rp_membres for select to authenticated using (profil_id = auth.uid() or rp_est_membre(structure_id) or rp_est_admin());
drop policy if exists rp_membres_suppression on public.rp_membres;
create policy rp_membres_suppression on public.rp_membres for delete to authenticated using (profil_id = auth.uid() or rp_est_responsable(structure_id) or rp_est_admin());
drop policy if exists rp_invitations_tout on public.rp_invitations;
create policy rp_invitations_tout on public.rp_invitations for all to authenticated
  using (rp_est_responsable(structure_id) or rp_est_admin()) with check (rp_est_responsable(structure_id) or rp_est_admin());
drop policy if exists rp_favoris_tout on public.rp_favoris;
create policy rp_favoris_tout on public.rp_favoris for all to authenticated using (rp_est_membre(structure_id)) with check (rp_est_membre(structure_id));

-- disponibilités : le remplaçant seul (la correspondance est faite par l'agent)
drop policy if exists rp_disponibilites_tout on public.rp_disponibilites;
create policy rp_disponibilites_tout on public.rp_disponibilites for all to authenticated using (remplacant_id = auth.uid()) with check (remplacant_id = auth.uid());
drop policy if exists rp_disponibilites_admin on public.rp_disponibilites;
create policy rp_disponibilites_admin on public.rp_disponibilites for select to authenticated using (rp_est_admin());

-- demandes et propositions : lecture seule (écriture par l'agent)
drop policy if exists rp_demandes_lecture on public.rp_demandes;
create policy rp_demandes_lecture on public.rp_demandes for select to authenticated
  using (rp_est_membre(structure_id) or rp_a_recu(id) or rp_est_admin());
drop policy if exists rp_propositions_lecture on public.rp_propositions;
create policy rp_propositions_lecture on public.rp_propositions for select to authenticated
  using (remplacant_id = auth.uid() or rp_est_admin()
         or (etat in ('interesse', 'retenu', 'pourvu_autre', 'annulee', 'liberee')
             and exists (select 1 from rp_demandes d where d.id = demande_id and rp_est_membre(d.structure_id))));

-- journaux : administrateur
drop policy if exists rp_journal_admin on public.rp_journal;
create policy rp_journal_admin on public.rp_journal for select to authenticated using (rp_est_admin());
drop policy if exists rp_emails_admin on public.rp_emails;
create policy rp_emails_admin on public.rp_emails for select to authenticated using (rp_est_admin());
-- rp_admins, rp_jetons : aucun accès depuis le site

-- ---------- Privilèges des rôles Supabase ----------
revoke all on public.rp_admins, public.profils, public.rp_remplacants, public.rp_structures, public.rp_membres, public.rp_invitations,
  public.rp_favoris, public.rp_disponibilites, public.rp_demandes, public.rp_propositions, public.rp_jetons, public.rp_journal, public.rp_emails from anon;
grant select, update, delete on public.profils to authenticated;
grant select, insert, update, delete on public.rp_remplacants, public.rp_structures, public.rp_invitations, public.rp_favoris, public.rp_disponibilites to authenticated;
grant select, delete on public.rp_membres to authenticated;
grant select on public.rp_demandes, public.rp_propositions, public.rp_journal, public.rp_emails to authenticated;
revoke all on public.rp_admins, public.rp_jetons from authenticated;
revoke insert, update, delete, truncate on public.rp_demandes, public.rp_propositions, public.rp_journal, public.rp_emails from authenticated;
revoke insert, update, truncate on public.rp_membres from authenticated;
revoke insert, truncate on public.profils from authenticated;
grant execute on function public.rp_accepter_invitations(), public.rp_compteurs(uuid[]), public.rp_statistiques(), public.rp_est_admin() to authenticated;
grant all on all tables in schema public to service_role;

-- ---------- Stockage privé des justificatifs ----------
insert into storage.buckets (id, name, public) values ('justificatifs', 'justificatifs', false) on conflict (id) do nothing;
drop policy if exists rp_justificatifs_proprietaire on storage.objects;
create policy rp_justificatifs_proprietaire on storage.objects for all to authenticated
  using (bucket_id = 'justificatifs' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'justificatifs' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists rp_justificatifs_admin on storage.objects;
create policy rp_justificatifs_admin on storage.objects for select to authenticated using (bucket_id = 'justificatifs' and rp_est_admin());
