-- =====================================================================
-- APPLICATION CONTRÔLÉE de supabase/migrations/20261014090000_espace_dicom.sql
-- GÉNÉRÉ par scripts/supabase/assembler-application.js : ne pas modifier.
-- À coller tel quel dans Supabase → SQL Editor, APRÈS autorisation de
-- l'auteur (choisir « Run without RLS » si Supabase le propose).
-- Une seule transaction : prérequis → migration → contrôles de sécurité ;
-- au moindre écart, tout est annulé (rien n'est appliqué).
-- Retour arrière après succès : supabase/sql/retour/20261014090000_espace_dicom.sql
-- =====================================================================
BEGIN;

-- 1. Prérequis
DO $rh$
BEGIN
  IF NOT (to_regprocedure('public.rp_est_admin()') is not null) THEN RAISE EXCEPTION 'Prérequis absent : migration 20261008120000_remplacements ; rien n''a été appliqué'; END IF;
  IF NOT (to_regclass('public.rs_membres') is not null) THEN RAISE EXCEPTION 'Prérequis absent : migration 20261009090000_reseau ; rien n''a été appliqué'; END IF;
END $rh$;

-- 2. Migration (copie exacte)
-- =====================================================================
-- RadiologicHub — Espace DICOM : comptes, droits et journal (Supabase)
-- ---------------------------------------------------------------------
-- Les images et l'IDENTITÉ DU PATIENT restent dans Orthanc, sur le
-- serveur de l'Espace DICOM (VPS). Supabase ne garde que des
-- identifiants techniques (identifiant Orthanc, UID d'étude), des
-- droits, des dates et le journal des accès. Aucune colonne de ce
-- fichier ne doit recevoir de nom, d'identifiant ou de date de naissance
-- de patient, ni de texte médical (vérifié par tests/sql/rls-dicom.js).
--
-- Rôles dans l'Espace DICOM (fonction dc_role) :
-- • admin      : administrateurs (rp_admins) ;
-- • radiologue : remplaçant spécialiste validé, ou membre de la
--                Communauté vérifié (spécialiste, titre Dr / Pr) ;
-- • membre     : membre d'une clinique ou d'un cabinet validé, qui n'est
--                pas résident ;
-- • resident   : résident validé pour une structure par un radiologue
--                senior de cette structure ou un administrateur
--                (dc_residents). Voit les examens de la structure et
--                commente ; ni import, ni partage, ni suppression.
--
-- Écritures : les examens, liens de partage, invitations, passerelles et
-- le journal sont écrits par le serveur de l'Espace DICOM (dicom-api,
-- clé de service), qui vérifie d'abord les droits de l'utilisateur avec
-- son propre jeton (fonctions dc_droits, dc_peut_importer). Les
-- déclencheurs revérifient les règles essentielles.
-- Exposition automatique désactivée : droits accordés explicitement en
-- fin de fichier (liste vérifiée par tests/sql/droits.js).
-- Prérequis : 20261008120000_remplacements.sql, 20261009090000_reseau.sql.
-- =====================================================================

-- ---------- Réglages (une seule ligne) ----------
create table if not exists public.dc_reglages (
  id boolean primary key default true check (id),
  conservation_jours integer not null default 365 check (conservation_jours between 1 and 3650),   -- examens
  journal_jours integer not null default 1095 check (journal_jours between 365 and 3650),          -- journal d'audit
  envoi_max_mo integer not null default 2048 check (envoi_max_mo between 10 and 20480),
  maj_le timestamptz not null default now()
);
insert into public.dc_reglages (id) values (true) on conflict (id) do nothing;

-- ---------- Résidents (accès limité, validé par un senior ou un administrateur) ----------
create table if not exists public.dc_residents (
  profil_id uuid not null references public.profils (id) on delete cascade,
  structure_id uuid not null references public.rp_structures (id) on delete cascade,
  etat text not null default 'en_attente' check (etat in ('en_attente', 'valide', 'refuse', 'suspendu')),
  demande_le timestamptz not null default now(),
  valide_par uuid references public.profils (id) on delete set null,
  valide_le timestamptz,
  primary key (profil_id, structure_id)
);
comment on table public.dc_residents is 'Espace DICOM : accès d''un résident aux examens d''une structure, validé par un radiologue senior de la structure ou un administrateur.';

-- ---------- Examens (identifiants techniques seulement) ----------
create table if not exists public.dc_examens (
  id uuid primary key default gen_random_uuid(),
  orthanc_id text not null unique check (orthanc_id ~ '^[0-9a-f]{8}(-[0-9a-f]{8}){4}$'),
  etude_uid text not null unique check (etude_uid ~ '^[0-9]+(\.[0-9]+)*$' and length(etude_uid) <= 64),
  structure_id uuid references public.rp_structures (id) on delete restrict,   -- null : espace personnel d'un radiologue
  depose_par uuid references public.profils (id) on delete set null,
  depose_le timestamptz not null default now(),
  source text not null default 'televersement' check (source in ('televersement', 'passerelle')),
  nb_instances integer not null default 0 check (nb_instances >= 0),
  taille_octets bigint not null default 0 check (taille_octets >= 0),
  anonymise boolean not null default false,
  purge_le timestamptz not null
);
comment on table public.dc_examens is 'Espace DICOM : examen stocké dans Orthanc. Aucune identité de patient ici (elle reste dans Orthanc).';
create index if not exists dc_examens_structure on public.dc_examens (structure_id);
create index if not exists dc_examens_depose_par on public.dc_examens (depose_par);
create index if not exists dc_examens_purge on public.dc_examens (purge_le);

-- ---------- Liens de partage ----------
-- Le jeton (256 bits) n'est jamais stocké : seulement son empreinte SHA-256.
-- L'adresse e-mail du destinataire n'est pas gardée (souvent celle du patient).
create table if not exists public.dc_partages (
  id uuid primary key default gen_random_uuid(),
  examen_id uuid not null references public.dc_examens (id) on delete cascade,
  cree_par uuid references public.profils (id) on delete set null,
  cree_le timestamptz not null default now(),
  jeton_empreinte text not null unique check (jeton_empreinte ~ '^[0-9a-f]{64}$'),
  duree text not null check (duree in ('24h', '7j', '30j')),
  expire_le timestamptz not null,
  code_empreinte text check (length(code_empreinte) <= 300),             -- scrypt du code d'accès facultatif
  avec_code boolean generated always as (code_empreinte is not null) stored,
  essais_echoues integer not null default 0 check (essais_echoues >= 0),
  bloque_jusqu_au timestamptz,
  anonymise boolean not null default false,
  orthanc_id_copie text check (orthanc_id_copie ~ '^[0-9a-f]{8}(-[0-9a-f]{8}){4}$'),   -- copie anonymisée dans Orthanc
  etude_uid_copie text unique check (etude_uid_copie ~ '^[0-9]+(\.[0-9]+)*$' and length(etude_uid_copie) <= 64),
  revoque_le timestamptz,
  revoque_par uuid references public.profils (id) on delete set null,
  nb_consultations integer not null default 0 check (nb_consultations >= 0),
  derniere_consultation timestamptz,
  check (expire_le > cree_le and expire_le <= cree_le + interval '30 days 1 minute'),
  check (not anonymise or (orthanc_id_copie is not null and etude_uid_copie is not null))
);
create index if not exists dc_partages_examen on public.dc_partages (examen_id);

-- ---------- Télé-expertise : radiologue inscrit invité sur un examen ----------
-- Les commentaires (texte médical) restent sur le serveur de l'Espace DICOM.
create table if not exists public.dc_expertises (
  id uuid primary key default gen_random_uuid(),
  examen_id uuid not null references public.dc_examens (id) on delete cascade,
  expert_id uuid not null references public.profils (id) on delete cascade,
  invite_par uuid references public.profils (id) on delete set null,
  cree_le timestamptz not null default now(),
  close_le timestamptz,
  unique (examen_id, expert_id)
);
create index if not exists dc_expertises_expert on public.dc_expertises (expert_id);

-- ---------- Passerelles de clinique (petit Orthanc sur place) ----------
create table if not exists public.dc_passerelles (
  id uuid primary key default gen_random_uuid(),
  structure_id uuid not null references public.rp_structures (id) on delete cascade,
  nom text not null check (length(trim(nom)) between 1 and 60),
  cle_empreinte text not null unique check (cle_empreinte ~ '^[0-9a-f]{64}$'),
  cree_par uuid references public.profils (id) on delete set null,
  cree_le timestamptz not null default now(),
  revoquee_le timestamptz,
  derniere_reception timestamptz
);

-- ---------- Journal d'audit (ajout seul) ----------
-- Pas de clé étrangère : l'entrée reste après la suppression de l'examen ou du lien.
create table if not exists public.dc_journal (
  id bigint generated always as identity primary key,
  quand timestamptz not null default now(),
  acteur uuid,                 -- compte RadiologicHub (null : accès par lien de partage ou passerelle)
  partage_id uuid,
  passerelle_id uuid,
  examen_id uuid,
  action text not null check (action in (
    'import', 'consultation', 'partage_cree', 'partage_revoque', 'partage_consulte', 'code_refuse', 'code_bloque',
    'expertise_invitation', 'expertise_close', 'commentaire', 'cr_joint', 'anonymisation', 'suppression', 'purge',
    'resident_demande', 'resident_valide', 'passerelle_creee', 'passerelle_revoquee', 'reglages', 'acces_refuse')),
  ip inet,
  navigateur text check (length(navigateur) <= 300),
  details jsonb not null default '{}'::jsonb check (jsonb_typeof(details) = 'object' and pg_column_size(details) <= 2000)
);
create index if not exists dc_journal_examen on public.dc_journal (examen_id, quand desc);
create index if not exists dc_journal_quand on public.dc_journal (quand);

-- ---------- Fonctions internes (non exécutables par les utilisateurs) ----------
create or replace function public.dc_est_radiologue(pid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from rp_remplacants r where r.id = pid and r.statut = 'specialiste' and r.etat = 'valide')
      or exists (select 1 from rs_membres m where m.id = pid and m.statut = 'specialiste' and m.verifie
                 and not m.suspendu and m.titre in ('Dr', 'Pr'));
$$;
-- Déclaré résident quelque part : n'obtient jamais le rôle « membre » par son rattachement à une structure
create or replace function public.dc_est_resident(pid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from rp_remplacants where id = pid and statut = 'resident')
      or exists (select 1 from rs_membres where id = pid and statut = 'resident')
      or exists (select 1 from dc_residents where profil_id = pid);
$$;
create or replace function public.dc_est_admin_de(pid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profils p join rp_admins a on lower(a.email) = lower(p.email) where p.id = pid);
$$;
-- Rôle d'une personne dans une structure : admin, radiologue, membre, resident ou null
create or replace function public.dc_role_structure_de(pid uuid, sid uuid) returns text
language sql stable security definer set search_path = public as $$
  select case
    when pid is null or sid is null then null
    when dc_est_admin_de(pid) then 'admin'
    when not exists (select 1 from rp_structures where id = sid and etat = 'valide') then null
    when exists (select 1 from rp_membres where structure_id = sid and profil_id = pid) and dc_est_radiologue(pid) then 'radiologue'
    when exists (select 1 from dc_residents where structure_id = sid and profil_id = pid and etat = 'valide') then 'resident'
    when exists (select 1 from rp_membres where structure_id = sid and profil_id = pid) and not dc_est_resident(pid) then 'membre'
  end;
$$;
-- Rôle global dans l'Espace DICOM
create or replace function public.dc_role_de(pid uuid) returns text
language sql stable security definer set search_path = public as $$
  select case
    when pid is null then null
    when dc_est_admin_de(pid) then 'admin'
    when dc_est_radiologue(pid) then 'radiologue'
    when exists (select 1 from rp_membres m where m.profil_id = pid and dc_role_structure_de(pid, m.structure_id) = 'membre') then 'membre'
    when exists (select 1 from dc_residents r where r.profil_id = pid and dc_role_structure_de(pid, r.structure_id) = 'resident') then 'resident'
  end;
$$;
-- Droits d'une personne sur un examen : voir, commenter, partager, inviter, supprimer
create or replace function public.dc_droits_de(pid uuid, eid uuid) returns text[]
language plpgsql stable security definer set search_path = public as $$
declare
  e dc_examens;
  r text;
  rs text;
  d text[] := '{}';
begin
  select * into e from dc_examens where id = eid;
  if not found then return d; end if;
  r := dc_role_de(pid);
  if r is null then return d; end if;            -- compte ou structure suspendu : plus aucun accès
  if r = 'admin' then return array['commenter', 'inviter', 'partager', 'supprimer', 'voir']; end if;
  if e.structure_id is null then
    -- espace personnel d'un radiologue
    if e.depose_par = pid and r = 'radiologue' then d := array['commenter', 'inviter', 'partager', 'supprimer', 'voir']; end if;
  else
    rs := dc_role_structure_de(pid, e.structure_id);
    if rs in ('radiologue', 'membre') then
      d := array['commenter', 'inviter', 'partager', 'voir'];
      if e.depose_par = pid or exists (select 1 from rp_membres where structure_id = e.structure_id and profil_id = pid and role = 'responsable') then
        d := d || 'supprimer'::text;
      end if;
    elsif rs = 'resident' then
      d := array['commenter', 'voir'];
    end if;
  end if;
  if r = 'radiologue' and exists (select 1 from dc_expertises where examen_id = eid and expert_id = pid and close_le is null) then
    d := d || array['commenter', 'voir'];
  end if;
  return array(select distinct x from unnest(d) as x order by 1);
end $$;
create or replace function public.dc_peut_importer_de(pid uuid, sid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select case when sid is null then dc_role_de(pid) in ('radiologue', 'admin')
              else dc_role_structure_de(pid, sid) in ('radiologue', 'membre', 'admin') end;
$$;

-- ---------- Fonctions appelées par le site et par dicom-api (jeton de l'utilisateur) ----------
create or replace function public.dc_role() returns text
language sql stable security definer set search_path = public as $$ select dc_role_de(auth.uid()); $$;
create or replace function public.dc_droits(eid uuid) returns text[]
language sql stable security definer set search_path = public as $$ select dc_droits_de(auth.uid(), eid); $$;
create or replace function public.dc_peut_importer(sid uuid) returns boolean
language sql stable security definer set search_path = public as $$ select coalesce(dc_peut_importer_de(auth.uid(), sid), false); $$;
-- Valider un résident : radiologue senior membre de la structure, ou administrateur
create or replace function public.dc_peut_valider_resident(sid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select rp_est_admin() or (dc_est_radiologue(auth.uid()) and exists (
    select 1 from rp_membres m join rp_structures s on s.id = m.structure_id
    where m.structure_id = sid and m.profil_id = auth.uid() and s.etat = 'valide'));
$$;
-- Droits sur une étude, par son UID (relais des images : une requête DICOMweb ne connaît que l'UID).
-- La copie anonymisée d'un lien de partage n'est visible, pour un compte, que de ceux qui gèrent l'examen.
create or replace function public.dc_droits_etude(uid text) returns table (examen_id uuid, orthanc_id text, droits text[])
language sql stable security definer set search_path = public as $$
  select e.id, e.orthanc_id, dc_droits_de(auth.uid(), e.id) from dc_examens e where e.etude_uid = uid
  union all
  select p.examen_id, p.orthanc_id_copie, case when 'partager' = any(dc_droits_de(auth.uid(), p.examen_id)) then array['voir'] else '{}'::text[] end
  from dc_partages p where p.etude_uid_copie = uid;
$$;
-- Ce que le site affiche : rôle, structures et demandes de résidents à valider
create or replace function public.dc_mon_espace() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'role', dc_role_de(auth.uid()),
    'structures', coalesce((
      select jsonb_agg(jsonb_build_object('id', s.id, 'nom', s.nom, 'type', s.type, 'role', x.role,
                                          'responsable', exists (select 1 from rp_membres m where m.structure_id = s.id and m.profil_id = auth.uid() and m.role = 'responsable'))
                       order by s.nom)
      from (select distinct sid, dc_role_structure_de(auth.uid(), sid) as role
            from (select structure_id as sid from rp_membres where profil_id = auth.uid()
                  union select structure_id from dc_residents where profil_id = auth.uid()) t) x
      join rp_structures s on s.id = x.sid
      where x.role is not null), '[]'::jsonb),
    'residents_a_valider', (select count(*) from dc_residents r where r.etat = 'en_attente' and dc_peut_valider_resident(r.structure_id))
  );
$$;

-- ---------- Déclencheurs ----------
-- Examens : date de purge selon la conservation ; le déposant doit pouvoir importer dans cet espace
create or replace function public.dc_examens_avant_ecriture() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if new.purge_le is null then
      new.purge_le := now() + make_interval(days => (select conservation_jours from dc_reglages));
    end if;
    if new.depose_par is not null and not coalesce(dc_peut_importer_de(new.depose_par, new.structure_id), false) then
      raise exception 'dc_examens : ce compte ne peut pas déposer d''examen dans cet espace' using errcode = '42501';
    end if;
    if new.depose_par is null and (new.source <> 'passerelle' or new.structure_id is null) then
      raise exception 'dc_examens : un examen sans déposant vient d''une passerelle de structure' using errcode = '23514';
    end if;
  else
    new.id := old.id; new.orthanc_id := old.orthanc_id; new.etude_uid := old.etude_uid;
    new.depose_le := old.depose_le; new.source := old.source;
  end if;
  return new;
end $$;
drop trigger if exists dc_examens_avant_ecriture on public.dc_examens;
create trigger dc_examens_avant_ecriture before insert or update on public.dc_examens
  for each row execute function public.dc_examens_avant_ecriture();

-- Résidents : la demande part « en attente » ; seul un validateur change l'état (et signe)
create or replace function public.dc_residents_avant_ecriture() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  validateur boolean;
begin
  validateur := coalesce(auth.role(), '') = 'service_role' or dc_peut_valider_resident(new.structure_id);
  if tg_op = 'INSERT' then
    new.demande_le := now();
    if not exists (select 1 from rp_structures where id = new.structure_id and etat = 'valide') then
      raise exception 'dc_residents : structure non validée' using errcode = '23514';
    end if;
    if not validateur or new.profil_id = auth.uid() then
      new.etat := 'en_attente'; new.valide_par := null; new.valide_le := null;
    elsif new.etat <> 'en_attente' then
      new.valide_par := auth.uid(); new.valide_le := now();
    end if;
  else
    new.profil_id := old.profil_id; new.structure_id := old.structure_id; new.demande_le := old.demande_le;
    if not validateur or old.profil_id = auth.uid() then
      new.etat := old.etat; new.valide_par := old.valide_par; new.valide_le := old.valide_le;
    elsif new.etat is distinct from old.etat then
      new.valide_par := auth.uid(); new.valide_le := now();
    else
      new.valide_par := old.valide_par; new.valide_le := old.valide_le;
    end if;
  end if;
  return new;
end $$;
drop trigger if exists dc_residents_avant_ecriture on public.dc_residents;
create trigger dc_residents_avant_ecriture before insert or update on public.dc_residents
  for each row execute function public.dc_residents_avant_ecriture();

-- Télé-expertise : seul un radiologue inscrit et validé peut être invité
create or replace function public.dc_expertises_avant_ecriture() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' and coalesce(dc_role_de(new.expert_id), '') not in ('radiologue', 'admin') then
    raise exception 'dc_expertises : seul un radiologue validé peut être invité' using errcode = '23514';
  end if;
  if tg_op = 'UPDATE' then
    new.examen_id := old.examen_id; new.expert_id := old.expert_id; new.cree_le := old.cree_le;
  end if;
  return new;
end $$;
drop trigger if exists dc_expertises_avant_ecriture on public.dc_expertises;
create trigger dc_expertises_avant_ecriture before insert or update on public.dc_expertises
  for each row execute function public.dc_expertises_avant_ecriture();

-- Journal : ajout seul ; seules les entrées plus anciennes que la durée de conservation du journal s'effacent
create or replace function public.dc_journal_protege() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' then
    raise exception 'dc_journal : le journal d''audit ne se modifie pas' using errcode = '42501';
  end if;
  if old.quand > now() - make_interval(days => (select journal_jours from dc_reglages)) then
    raise exception 'dc_journal : entrée encore dans la durée de conservation' using errcode = '42501';
  end if;
  return old;
end $$;
drop trigger if exists dc_journal_protege on public.dc_journal;
create trigger dc_journal_protege before update or delete on public.dc_journal
  for each row execute function public.dc_journal_protege();
create or replace function public.dc_journal_pas_de_vidage() returns trigger
language plpgsql set search_path = public as $$
begin
  raise exception 'dc_journal : le journal d''audit ne se vide pas' using errcode = '42501';
end $$;
drop trigger if exists dc_journal_pas_de_vidage on public.dc_journal;
create trigger dc_journal_pas_de_vidage before truncate on public.dc_journal
  for each statement execute function public.dc_journal_pas_de_vidage();

create or replace function public.dc_reglages_maj_le() returns trigger
language plpgsql set search_path = public as $$
begin
  new.id := true; new.maj_le := now();
  return new;
end $$;
drop trigger if exists dc_reglages_maj_le on public.dc_reglages;
create trigger dc_reglages_maj_le before update on public.dc_reglages
  for each row execute function public.dc_reglages_maj_le();

-- ---------- Droits d'accès par ligne ----------
alter table public.dc_reglages enable row level security;
alter table public.dc_residents enable row level security;
alter table public.dc_examens enable row level security;
alter table public.dc_partages enable row level security;
alter table public.dc_expertises enable row level security;
alter table public.dc_passerelles enable row level security;
alter table public.dc_journal enable row level security;

drop policy if exists dc_reglages_lecture on public.dc_reglages;
create policy dc_reglages_lecture on public.dc_reglages for select to authenticated using (dc_role() is not null);
drop policy if exists dc_reglages_admin on public.dc_reglages;
create policy dc_reglages_admin on public.dc_reglages for update to authenticated using (rp_est_admin()) with check (rp_est_admin());

drop policy if exists dc_residents_lecture on public.dc_residents;
create policy dc_residents_lecture on public.dc_residents for select to authenticated
  using (profil_id = auth.uid() or dc_peut_valider_resident(structure_id));
drop policy if exists dc_residents_demande on public.dc_residents;
create policy dc_residents_demande on public.dc_residents for insert to authenticated
  with check (profil_id = auth.uid() or dc_peut_valider_resident(structure_id));
drop policy if exists dc_residents_validation on public.dc_residents;
create policy dc_residents_validation on public.dc_residents for update to authenticated
  using (dc_peut_valider_resident(structure_id)) with check (dc_peut_valider_resident(structure_id));
drop policy if exists dc_residents_retrait on public.dc_residents;
create policy dc_residents_retrait on public.dc_residents for delete to authenticated
  using (profil_id = auth.uid() or dc_peut_valider_resident(structure_id));

-- Examens, liens, invitations, passerelles, journal : lecture selon les droits ; écriture par dicom-api (clé de service)
drop policy if exists dc_examens_lecture on public.dc_examens;
create policy dc_examens_lecture on public.dc_examens for select to authenticated using ('voir' = any(dc_droits(id)));
drop policy if exists dc_partages_lecture on public.dc_partages;
create policy dc_partages_lecture on public.dc_partages for select to authenticated using ('partager' = any(dc_droits(examen_id)));
drop policy if exists dc_expertises_lecture on public.dc_expertises;
create policy dc_expertises_lecture on public.dc_expertises for select to authenticated
  using (expert_id = auth.uid() or 'voir' = any(dc_droits(examen_id)));
drop policy if exists dc_passerelles_lecture on public.dc_passerelles;
create policy dc_passerelles_lecture on public.dc_passerelles for select to authenticated
  using (rp_est_admin() or rp_est_responsable(structure_id));
drop policy if exists dc_journal_lecture on public.dc_journal;
create policy dc_journal_lecture on public.dc_journal for select to authenticated
  using (rp_est_admin() or acteur = auth.uid() or (examen_id is not null and 'partager' = any(dc_droits(examen_id))));

-- ---------- Droits explicites (exposition automatique désactivée) ----------
revoke all on public.dc_reglages, public.dc_residents, public.dc_examens, public.dc_partages,
  public.dc_expertises, public.dc_passerelles, public.dc_journal from anon, authenticated;
-- Séquence de l'identifiant du journal (colonne identity : aucun droit nécessaire pour insérer) ; sur
-- Supabase, les droits par défaut l'ouvriraient aux visiteurs (USAGE, UPDATE) : retirés.
revoke all on sequence public.dc_journal_id_seq from public, anon, authenticated;
grant select on public.dc_reglages to authenticated;
grant update (conservation_jours, journal_jours, envoi_max_mo) on public.dc_reglages to authenticated;
grant select, insert, update, delete on public.dc_residents to authenticated;
grant select on public.dc_examens, public.dc_expertises, public.dc_journal to authenticated;
-- Ni l'empreinte du jeton ni celle du code (lien) ou de la clé (passerelle)
grant select (id, examen_id, cree_par, cree_le, duree, expire_le, avec_code, essais_echoues, bloque_jusqu_au, anonymise,
  revoque_le, revoque_par, nb_consultations, derniere_consultation) on public.dc_partages to authenticated;
grant select (id, structure_id, nom, cree_par, cree_le, revoquee_le, derniere_reception) on public.dc_passerelles to authenticated;
grant all on public.dc_reglages, public.dc_residents, public.dc_examens, public.dc_partages,
  public.dc_expertises, public.dc_passerelles to service_role;
-- Journal : ajout et purge des entrées anciennes seulement (ni modification, ni vidage)
grant select, insert, delete on public.dc_journal to service_role;

revoke execute on function
  public.dc_est_radiologue(uuid), public.dc_est_resident(uuid), public.dc_est_admin_de(uuid),
  public.dc_role_structure_de(uuid, uuid), public.dc_role_de(uuid), public.dc_droits_de(uuid, uuid),
  public.dc_peut_importer_de(uuid, uuid), public.dc_role(), public.dc_droits(uuid), public.dc_peut_importer(uuid),
  public.dc_peut_valider_resident(uuid), public.dc_droits_etude(text), public.dc_mon_espace(),
  public.dc_examens_avant_ecriture(), public.dc_residents_avant_ecriture(), public.dc_expertises_avant_ecriture(),
  public.dc_journal_protege(), public.dc_journal_pas_de_vidage(), public.dc_reglages_maj_le()
  from public, anon, authenticated;
grant execute on function
  public.dc_role(), public.dc_droits(uuid), public.dc_peut_importer(uuid), public.dc_peut_valider_resident(uuid),
  public.dc_droits_etude(text), public.dc_mon_espace()
  to authenticated;
-- dicom-api : droits d'une personne désignée (passerelles, tâches planifiées)
grant execute on function public.dc_role_de(uuid), public.dc_droits_de(uuid, uuid), public.dc_peut_importer_de(uuid, uuid)
  to service_role;

-- 3. Contrôles de sécurité (annulation complète en cas d'écart)
DO $rh$
BEGIN
  IF NOT coalesce((to_regclass('public.dc_examens') is not null), false) THEN
    RAISE EXCEPTION 'Contrôle refusé : migration 20261014090000_espace_dicom non reconnue après application';
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
  RAISE NOTICE 'Migration 20261014090000_espace_dicom appliquée et contrôlée.';
END $rh$;

COMMIT;
