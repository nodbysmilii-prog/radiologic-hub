-- =====================================================================
-- RadiologicHub — Communauté (réseau des radiologues) : schéma Supabase
-- ---------------------------------------------------------------------
-- Même compte que le module Remplacements (table profils, connexion
-- Google ou lien magique). Le profil PUBLIC est dans rs_membres ; les
-- coordonnées privées (e-mail, téléphone) restent dans profils.
-- • Lire, commenter, écrire des messages : tout membre (profil complété).
-- • Publier un cas sous « Dr … » : compte vérifié par l'administrateur,
--   ou remplaçant validé ; attestation d'anonymisation obligatoire.
-- • Cas visibles des seuls membres connectés ; signalement ; masquage
--   automatique après 3 signalements, en attendant l'administrateur.
-- • Messagerie à deux, temps réel (Realtime), blocage.
-- Testé sur PostgreSQL 16 avec la simulation de Supabase :
-- tests/sql/rls-reseau.js (npm run test:sql).
-- =====================================================================

-- ---------- Compléments au compte ----------
alter table public.profils add column if not exists telephone_verifie boolean not null default false;

-- Prénom et nom aussi depuis un compte Google (given_name / family_name / full_name)
create or replace function public.rp_nouvel_utilisateur() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  complet text := trim(coalesce(m ->> 'full_name', m ->> 'name', ''));
begin
  insert into profils (id, email, nom, prenom, telephone)
  values (new.id, coalesce(new.email, ''),
          coalesce(nullif(m ->> 'nom', ''), nullif(m ->> 'family_name', ''), nullif(trim(substr(complet, length(split_part(complet, ' ', 1)) + 1)), ''), ''),
          coalesce(nullif(m ->> 'prenom', ''), nullif(m ->> 'given_name', ''), nullif(split_part(complet, ' ', 1), ''), ''),
          coalesce(m ->> 'telephone', m ->> 'phone', ''))
  on conflict (id) do nothing;
  return new;
end $$;

-- ---------- Membres (profil public) ----------
create table if not exists public.rs_membres (
  id uuid primary key references public.profils (id) on delete cascade,
  prenom text not null check (length(trim(prenom)) between 1 and 60),
  nom text not null check (length(trim(nom)) between 1 and 60),
  titre text not null default '' check (titre in ('', 'Dr', 'Pr')),
  statut text not null check (statut in ('specialiste', 'resident', 'medecin', 'interne', 'etudiant', 'manipulateur', 'autre')),
  annee smallint check (annee between 1 and 5),
  etablissement text not null default '' check (length(etablissement) <= 120),
  ville text not null default '' check (length(ville) <= 60),
  gouvernorat text not null default '' check (length(gouvernorat) <= 40),
  bio text not null default '' check (length(bio) <= 500),
  interets text[] not null default '{}',
  photo text check (length(photo) <= 500),               -- chemin dans « avatars », ou adresse https (photo Google)
  verifie boolean not null default false,                -- titre « Dr / Pr » affiché et publication de cas
  verifie_le timestamptz,
  verification_demandee_le timestamptz,
  justificatif text,                                     -- chemin dans le stockage privé « justificatifs »
  suspendu boolean not null default false,
  emails_messages boolean not null default true,         -- rappel par e-mail des messages non lus
  cree_le timestamptz not null default now(),
  check (statut <> 'resident' or annee is not null)
);
comment on table public.rs_membres is 'Profil public d''un membre de la Communauté (sans e-mail ni téléphone).';

-- ---------- Cas cliniques ----------
create table if not exists public.rs_cas (
  id uuid primary key default gen_random_uuid(),
  auteur_id uuid not null references public.rs_membres (id) on delete cascade,
  titre text not null check (length(trim(titre)) between 5 and 120),
  histoire text not null check (length(trim(histoire)) between 20 and 3000),
  question text not null default '' check (length(question) <= 300),
  reponse text not null default '' check (length(reponse) <= 3000),
  specialite text not null check (specialite in ('neuro', 'orl', 'thorax', 'cardio', 'digestif', 'uro', 'femme', 'osteo', 'trauma', 'pediatrie', 'interv', 'autre')),
  modalites text[] not null check (cardinality(modalites) >= 1 and modalites <@ array['radio', 'echo', 'scanner', 'irm', 'mammo', 'interv', 'tep']),
  images jsonb not null check (jsonb_typeof(images) = 'array' and jsonb_array_length(images) between 1 and 10),   -- [{ chemin, legende }]
  attestation boolean not null check (attestation),       -- « j'atteste que les images et le texte sont anonymisés »
  etat text not null default 'publie' check (etat in ('publie', 'masque')),
  masque_motif text,
  nb_jaime integer not null default 0,
  nb_commentaires integer not null default 0,
  cree_le timestamptz not null default now(),
  modifie_le timestamptz
);
create index if not exists rs_cas_date on public.rs_cas (cree_le desc);
create index if not exists rs_cas_auteur on public.rs_cas (auteur_id, cree_le desc);

create table if not exists public.rs_commentaires (
  id uuid primary key default gen_random_uuid(),
  cas_id uuid not null references public.rs_cas (id) on delete cascade,
  auteur_id uuid not null references public.rs_membres (id) on delete cascade,
  texte text not null check (length(trim(texte)) between 1 and 1500),
  etat text not null default 'visible' check (etat in ('visible', 'masque')),
  cree_le timestamptz not null default now(),
  modifie_le timestamptz
);
create index if not exists rs_commentaires_cas on public.rs_commentaires (cas_id, cree_le);

create table if not exists public.rs_jaime (
  cas_id uuid references public.rs_cas (id) on delete cascade,
  membre_id uuid references public.rs_membres (id) on delete cascade,
  cree_le timestamptz not null default now(),
  primary key (cas_id, membre_id)
);
create table if not exists public.rs_enregistres (
  cas_id uuid references public.rs_cas (id) on delete cascade,
  membre_id uuid references public.rs_membres (id) on delete cascade,
  cree_le timestamptz not null default now(),
  primary key (cas_id, membre_id)
);
create table if not exists public.rs_abonnements (
  suiveur_id uuid references public.rs_membres (id) on delete cascade,
  suivi_id uuid references public.rs_membres (id) on delete cascade,
  cree_le timestamptz not null default now(),
  primary key (suiveur_id, suivi_id),
  check (suiveur_id <> suivi_id)
);

-- ---------- Messagerie ----------
create table if not exists public.rs_conversations (
  id uuid primary key default gen_random_uuid(),
  cree_le timestamptz not null default now(),
  dernier_message text,
  dernier_message_le timestamptz,
  dernier_auteur uuid
);
create table if not exists public.rs_participants (
  conversation_id uuid references public.rs_conversations (id) on delete cascade,
  membre_id uuid references public.rs_membres (id) on delete cascade,
  lu_le timestamptz not null default now(),
  archive boolean not null default false,
  rappel_envoye_le timestamptz,
  primary key (conversation_id, membre_id)
);
create index if not exists rs_participants_membre on public.rs_participants (membre_id);
create table if not exists public.rs_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.rs_conversations (id) on delete cascade,
  auteur_id uuid references public.rs_membres (id) on delete set null,
  texte text not null default '' check (length(texte) <= 4000),
  image text,                                            -- chemin dans « messages-images »
  supprime boolean not null default false,
  cree_le timestamptz not null default now(),
  constraint rs_messages_non_vide check (supprime or length(trim(texte)) > 0 or image is not null)
);
create index if not exists rs_messages_conversation on public.rs_messages (conversation_id, cree_le);
create table if not exists public.rs_blocages (
  bloqueur_id uuid references public.rs_membres (id) on delete cascade,
  bloque_id uuid references public.rs_membres (id) on delete cascade,
  cree_le timestamptz not null default now(),
  primary key (bloqueur_id, bloque_id),
  check (bloqueur_id <> bloque_id)
);

-- ---------- Signalements et notifications ----------
create table if not exists public.rs_signalements (
  id uuid primary key default gen_random_uuid(),
  auteur_id uuid not null default auth.uid() references public.rs_membres (id) on delete cascade,
  cible_type text not null check (cible_type in ('cas', 'commentaire', 'message', 'membre')),
  cible_id uuid not null,
  motif text not null check (motif in ('identite', 'erreur', 'inapproprie', 'publicite', 'usurpation', 'autre')),
  details text not null default '' check (length(details) <= 500),
  cree_le timestamptz not null default now(),
  traite_le timestamptz,
  traite_par uuid,
  decision text check (decision in ('retire', 'rejete')),
  unique (auteur_id, cible_type, cible_id)
);
create table if not exists public.rs_notifications (
  id uuid primary key default gen_random_uuid(),
  membre_id uuid not null references public.rs_membres (id) on delete cascade,
  type text not null check (type in ('jaime', 'commentaire', 'abonnement', 'nouveau_cas', 'verification', 'cas_masque')),
  acteur_id uuid references public.rs_membres (id) on delete cascade,
  cas_id uuid references public.rs_cas (id) on delete cascade,
  lu boolean not null default false,
  cree_le timestamptz not null default now()
);
create index if not exists rs_notifications_membre on public.rs_notifications (membre_id, cree_le desc);

-- ---------- Fonctions d'aide (droits) ----------
create or replace function public.rs_est_membre_actif() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from rs_membres where id = auth.uid() and not suspendu);
$$;
create or replace function public.rs_peut_publier(uid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from rs_membres m where m.id = uid and not m.suspendu
      and (m.verifie or exists (select 1 from rp_remplacants r where r.id = uid and r.etat = 'valide'))
  );
$$;
-- Badge « Disponible pour des remplacements » : remplaçant validé qui reçoit les propositions
create or replace function public.rs_remplacant_valide(uid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from rp_remplacants r join profils p on p.id = r.id where r.id = uid and r.etat = 'valide' and not p.desinscrit);
$$;
create or replace function public.rs_bloque(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from rs_blocages where (bloqueur_id = a and bloque_id = b) or (bloqueur_id = b and bloque_id = a));
$$;
create or replace function public.rs_participe(conv uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from rs_participants where conversation_id = conv and membre_id = auth.uid());
$$;
-- Interlocuteur dans une conversation à deux
create or replace function public.rs_participe_dossier(dossier text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from rs_participants where conversation_id::text = dossier and membre_id = auth.uid());
$$;
create or replace function public.rs_autre(conv uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select membre_id from rs_participants where conversation_id = conv and membre_id <> auth.uid() limit 1;
$$;

-- ---------- Protection des champs réservés ----------
create or replace function public.rs_proteger_membre() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' and not rp_est_admin() then
    if tg_op = 'INSERT' then
      new.verifie := false; new.verifie_le := null; new.suspendu := false;
    else
      new.id := old.id; new.verifie := old.verifie; new.verifie_le := old.verifie_le; new.suspendu := old.suspendu; new.cree_le := old.cree_le;
    end if;
  elsif tg_op = 'UPDATE' and new.verifie and not old.verifie then
    new.verifie_le := now();
  end if;
  return new;
end $$;
drop trigger if exists rs_proteger_membre on public.rs_membres;
create trigger rs_proteger_membre before insert or update on public.rs_membres for each row execute function public.rs_proteger_membre();

create or replace function public.rs_proteger_cas() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if pg_trigger_depth() > 1 then return new; end if;              -- compteurs mis à jour par un autre déclencheur
  if coalesce(auth.role(), '') = 'service_role' or rp_est_admin() then
    if tg_op = 'UPDATE' then new.modifie_le := coalesce(new.modifie_le, old.modifie_le); end if;
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.auteur_id := auth.uid(); new.etat := 'publie'; new.masque_motif := null; new.nb_jaime := 0; new.nb_commentaires := 0; new.cree_le := now(); new.modifie_le := null;
  else
    new.id := old.id; new.auteur_id := old.auteur_id; new.etat := old.etat; new.masque_motif := old.masque_motif;
    new.nb_jaime := old.nb_jaime; new.nb_commentaires := old.nb_commentaires; new.cree_le := old.cree_le; new.modifie_le := now();
  end if;
  return new;
end $$;
drop trigger if exists rs_proteger_cas on public.rs_cas;
create trigger rs_proteger_cas before insert or update on public.rs_cas for each row execute function public.rs_proteger_cas();

create or replace function public.rs_proteger_commentaire() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if coalesce(auth.role(), '') = 'service_role' or rp_est_admin() then return new; end if;
  if tg_op = 'INSERT' then new.auteur_id := auth.uid(); new.etat := 'visible'; new.cree_le := now(); new.modifie_le := null;
  else new.id := old.id; new.cas_id := old.cas_id; new.auteur_id := old.auteur_id; new.etat := old.etat; new.cree_le := old.cree_le; new.modifie_le := now();
  end if;
  return new;
end $$;
drop trigger if exists rs_proteger_commentaire on public.rs_commentaires;
create trigger rs_proteger_commentaire before insert or update on public.rs_commentaires for each row execute function public.rs_proteger_commentaire();

create or replace function public.rs_proteger_message() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if coalesce(auth.role(), '') = 'service_role' then return new; end if;
  if tg_op = 'INSERT' then new.auteur_id := auth.uid(); new.supprime := false; new.cree_le := now();
  else
    new.id := old.id; new.conversation_id := old.conversation_id; new.cree_le := old.cree_le;
    -- auteur figé, sauf « on delete set null » quand son compte est supprimé (action de clé étrangère)
    new.auteur_id := case when new.auteur_id is null and pg_trigger_depth() > 1 then null else old.auteur_id end; new.image := case when new.supprime then null else old.image end;
    new.texte := case when new.supprime then '' else old.texte end; new.supprime := old.supprime or new.supprime;
  end if;
  return new;
end $$;
drop trigger if exists rs_proteger_message on public.rs_messages;
create trigger rs_proteger_message before insert or update on public.rs_messages for each row execute function public.rs_proteger_message();

-- ---------- Compteurs, conversations, notifications (déclencheurs) ----------
create or replace function public.rs_compter() returns trigger
language plpgsql security definer set search_path = public as $$
declare d integer := case when tg_op = 'INSERT' then 1 else -1 end;
        c uuid := case when tg_op = 'INSERT' then new.cas_id else old.cas_id end;
begin
  if tg_table_name = 'rs_jaime' then update rs_cas set nb_jaime = greatest(nb_jaime + d, 0) where id = c;
  else update rs_cas set nb_commentaires = greatest(nb_commentaires + d, 0) where id = c; end if;
  return null;
end $$;
drop trigger if exists rs_compter on public.rs_jaime;
create trigger rs_compter after insert or delete on public.rs_jaime for each row execute function public.rs_compter();
drop trigger if exists rs_compter on public.rs_commentaires;
create trigger rs_compter after insert or delete on public.rs_commentaires for each row execute function public.rs_compter();

create or replace function public.rs_notifier(dest uuid, t text, acteur uuid, cas uuid) returns void
language sql security definer set search_path = public as $$
  insert into rs_notifications (membre_id, type, acteur_id, cas_id)
  select dest, t, acteur, cas where dest is not null and dest is distinct from acteur and not rs_bloque(dest, coalesce(acteur, dest));
$$;
create or replace function public.rs_evenement() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_table_name = 'rs_jaime' then
    perform rs_notifier((select auteur_id from rs_cas where id = new.cas_id), 'jaime', new.membre_id, new.cas_id);
  elsif tg_table_name = 'rs_commentaires' then
    perform rs_notifier((select auteur_id from rs_cas where id = new.cas_id), 'commentaire', new.auteur_id, new.cas_id);
  elsif tg_table_name = 'rs_abonnements' then
    perform rs_notifier(new.suivi_id, 'abonnement', new.suiveur_id, null);
  elsif tg_table_name = 'rs_cas' then
    if tg_op = 'INSERT' then
      insert into rs_notifications (membre_id, type, acteur_id, cas_id)
      select a.suiveur_id, 'nouveau_cas', new.auteur_id, new.id from rs_abonnements a where a.suivi_id = new.auteur_id and not rs_bloque(a.suiveur_id, new.auteur_id);
    elsif new.etat = 'masque' and old.etat <> 'masque' then
      perform rs_notifier(new.auteur_id, 'cas_masque', null, new.id);
    end if;
  elsif tg_table_name = 'rs_membres' then
    if new.verifie and not old.verifie then perform rs_notifier(new.id, 'verification', null, null); end if;
  end if;
  return null;
end $$;
drop trigger if exists rs_evenement on public.rs_jaime;
create trigger rs_evenement after insert on public.rs_jaime for each row execute function public.rs_evenement();
drop trigger if exists rs_evenement on public.rs_commentaires;
create trigger rs_evenement after insert on public.rs_commentaires for each row execute function public.rs_evenement();
drop trigger if exists rs_evenement on public.rs_abonnements;
create trigger rs_evenement after insert on public.rs_abonnements for each row execute function public.rs_evenement();
drop trigger if exists rs_evenement on public.rs_cas;
create trigger rs_evenement after insert or update of etat on public.rs_cas for each row execute function public.rs_evenement();
drop trigger if exists rs_evenement on public.rs_membres;
create trigger rs_evenement after update of verifie on public.rs_membres for each row execute function public.rs_evenement();

-- Nouveau message : aperçu de la conversation, lu par son auteur, rappel e-mail réarmé
create or replace function public.rs_message_envoye() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update rs_conversations set dernier_message = case when new.image is not null and length(trim(new.texte)) = 0 then '📷 Photo' else left(new.texte, 140) end,
         dernier_message_le = new.cree_le, dernier_auteur = new.auteur_id where id = new.conversation_id;
  update rs_participants set lu_le = new.cree_le, archive = false where conversation_id = new.conversation_id and membre_id = new.auteur_id;
  update rs_participants set archive = false where conversation_id = new.conversation_id and membre_id <> new.auteur_id;
  return null;
end $$;
drop trigger if exists rs_message_envoye on public.rs_messages;
create trigger rs_message_envoye after insert on public.rs_messages for each row execute function public.rs_message_envoye();

-- Message supprimé : s'il était le dernier, l'aperçu de la conversation ne garde pas son texte
create or replace function public.rs_message_supprime() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.supprime and not old.supprime then
    update rs_conversations set dernier_message = 'Message supprimé'
    where id = new.conversation_id
      and not exists (select 1 from rs_messages m where m.conversation_id = new.conversation_id and not m.supprime and m.cree_le >= new.cree_le);
  end if;
  return null;
end $$;
drop trigger if exists rs_message_supprime on public.rs_messages;
create trigger rs_message_supprime after update of supprime on public.rs_messages for each row execute function public.rs_message_supprime();

-- 3 signalements « patient identifiable » (ou 5 au total) : cas masqué en attendant l'administrateur
create or replace function public.rs_signalement_recu() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.cible_type = 'cas' and (
       (select count(*) from rs_signalements where cible_type = 'cas' and cible_id = new.cible_id and motif = 'identite' and traite_le is null) >= 3
    or (select count(*) from rs_signalements where cible_type = 'cas' and cible_id = new.cible_id and traite_le is null) >= 5) then
    update rs_cas set etat = 'masque', masque_motif = 'Masqué automatiquement après plusieurs signalements' where id = new.cible_id and etat = 'publie';
  end if;
  return null;
end $$;
drop trigger if exists rs_signalement_recu on public.rs_signalements;
create trigger rs_signalement_recu after insert on public.rs_signalements for each row execute function public.rs_signalement_recu();

-- ---------- Fonctions appelées par le site ----------
-- Ouvre (ou retrouve) la conversation avec un autre membre
create or replace function public.rs_ouvrir_conversation(autre uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare c uuid;
begin
  if not rs_est_membre_actif() then raise exception 'Complétez votre profil pour écrire à un membre.'; end if;
  if autre is null or autre = auth.uid() then raise exception 'Destinataire invalide.'; end if;
  if not exists (select 1 from rs_membres where id = autre and not suspendu) then raise exception 'Ce confrère n''a pas encore rejoint la Communauté.'; end if;
  if rs_bloque(auth.uid(), autre) then raise exception 'Conversation impossible : l''un de vous a bloqué l''autre.'; end if;
  select p1.conversation_id into c from rs_participants p1 join rs_participants p2 on p2.conversation_id = p1.conversation_id
   where p1.membre_id = auth.uid() and p2.membre_id = autre
     and (select count(*) from rs_participants p3 where p3.conversation_id = p1.conversation_id) = 2
   limit 1;
  if c is null then
    insert into rs_conversations default values returning id into c;
    insert into rs_participants (conversation_id, membre_id) values (c, auth.uid()), (c, autre);
  end if;
  return c;
end $$;

-- Mes conversations, avec le nombre de messages non lus
create or replace function public.rs_mes_conversations()
returns table (conversation_id uuid, autre_id uuid, dernier_message text, dernier_message_le timestamptz, dernier_auteur uuid, non_lus integer, archive boolean, bloque boolean)
language sql stable security definer set search_path = public as $$
  select c.id, o.membre_id, c.dernier_message, c.dernier_message_le, c.dernier_auteur,
         (select count(*) from rs_messages m where m.conversation_id = c.id and m.auteur_id is distinct from auth.uid() and m.cree_le > p.lu_le and not m.supprime)::int,
         p.archive, rs_bloque(auth.uid(), o.membre_id)
  from rs_participants p
  join rs_conversations c on c.id = p.conversation_id
  left join rs_participants o on o.conversation_id = c.id and o.membre_id <> p.membre_id
  where p.membre_id = auth.uid()
  order by c.dernier_message_le desc nulls last, c.cree_le desc;
$$;

-- Supprimer son compte (et tout ce qui en dépend) — irréversible
create or replace function public.rs_supprimer_mon_compte() returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  if auth.uid() is null then raise exception 'Non connecté.'; end if;
  -- Les messages envoyés sont vidés (« Message supprimé » chez le destinataire) avant la suppression du compte
  update rs_messages set supprime = true where auteur_id = auth.uid() and not supprime;
  delete from auth.users where id = auth.uid();
end $$;

create or replace function public.rs_autre_de(conv uuid, moi uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select membre_id from rs_participants where conversation_id = conv and membre_id <> moi limit 1;
$$;
-- Rappels e-mail des messages non lus (appelé par la tâche planifiée, clé de service)
create or replace function public.rs_rappels_messages(delai interval default interval '1 hour')
returns table (membre_id uuid, email text, prenom text, non_lus integer, de text)
language sql security definer set search_path = public as $$
  with cibles as (
    select p.conversation_id, p.membre_id,
           (select count(*) from rs_messages m where m.conversation_id = p.conversation_id and m.auteur_id is distinct from p.membre_id and m.cree_le > p.lu_le and not m.supprime) as n,
           (select max(m.cree_le) from rs_messages m where m.conversation_id = p.conversation_id and m.auteur_id is distinct from p.membre_id and not m.supprime) as dernier
    from rs_participants p
    join rs_membres me on me.id = p.membre_id and me.emails_messages and not me.suspendu
    join profils pr on pr.id = p.membre_id and not pr.desinscrit
  ), dus as (
    select c.* from cibles c join rs_participants p on p.conversation_id = c.conversation_id and p.membre_id = c.membre_id
    where c.n > 0 and c.dernier < now() - delai and (p.rappel_envoye_le is null or p.rappel_envoye_le < c.dernier)
  ), marques as (
    update rs_participants p set rappel_envoye_le = now() from dus where p.conversation_id = dus.conversation_id and p.membre_id = dus.membre_id
    returning p.membre_id, p.conversation_id
  )
  select pr.id, pr.email, me.prenom, sum(d.n)::int, string_agg(distinct trim(a.prenom || ' ' || a.nom), ', ')
  from dus d join marques mq on mq.membre_id = d.membre_id and mq.conversation_id = d.conversation_id
  join profils pr on pr.id = d.membre_id join rs_membres me on me.id = d.membre_id
  left join rs_membres a on a.id = rs_autre_de(d.conversation_id, d.membre_id)
  group by pr.id, pr.email, me.prenom;
$$;

-- ---------- Droits d'accès par ligne ----------
alter table public.rs_membres enable row level security;
alter table public.rs_cas enable row level security;
alter table public.rs_commentaires enable row level security;
alter table public.rs_jaime enable row level security;
alter table public.rs_enregistres enable row level security;
alter table public.rs_abonnements enable row level security;
alter table public.rs_conversations enable row level security;
alter table public.rs_participants enable row level security;
alter table public.rs_messages enable row level security;
alter table public.rs_blocages enable row level security;
alter table public.rs_signalements enable row level security;
alter table public.rs_notifications enable row level security;

-- membres : profils publics visibles des membres ; chacun modifie le sien ; l'administrateur valide
drop policy if exists rs_membres_lecture on public.rs_membres;
create policy rs_membres_lecture on public.rs_membres for select to authenticated
  using (id = auth.uid() or rp_est_admin() or (rs_est_membre_actif() and not suspendu));
drop policy if exists rs_membres_creation on public.rs_membres;
create policy rs_membres_creation on public.rs_membres for insert to authenticated with check (id = auth.uid());
drop policy if exists rs_membres_modification on public.rs_membres;
create policy rs_membres_modification on public.rs_membres for update to authenticated
  using (id = auth.uid() or rp_est_admin()) with check (id = auth.uid() or rp_est_admin());
drop policy if exists rs_membres_suppression on public.rs_membres;
create policy rs_membres_suppression on public.rs_membres for delete to authenticated using (id = auth.uid() or rp_est_admin());

-- cas : membres connectés ; publication réservée aux comptes vérifiés
drop policy if exists rs_cas_lecture on public.rs_cas;
create policy rs_cas_lecture on public.rs_cas for select to authenticated
  using (auteur_id = auth.uid() or rp_est_admin() or (etat = 'publie' and rs_est_membre_actif() and not rs_bloque(auteur_id, auth.uid())));
drop policy if exists rs_cas_creation on public.rs_cas;
create policy rs_cas_creation on public.rs_cas for insert to authenticated with check (auteur_id = auth.uid() and rs_peut_publier(auth.uid()));
drop policy if exists rs_cas_modification on public.rs_cas;
create policy rs_cas_modification on public.rs_cas for update to authenticated
  using (auteur_id = auth.uid() or rp_est_admin()) with check (auteur_id = auth.uid() or rp_est_admin());
drop policy if exists rs_cas_suppression on public.rs_cas;
create policy rs_cas_suppression on public.rs_cas for delete to authenticated using (auteur_id = auth.uid() or rp_est_admin());

-- commentaires (sous un cas visible)
drop policy if exists rs_commentaires_lecture on public.rs_commentaires;
create policy rs_commentaires_lecture on public.rs_commentaires for select to authenticated
  using (exists (select 1 from rs_cas c where c.id = cas_id) and (etat = 'visible' or auteur_id = auth.uid() or rp_est_admin()) and not rs_bloque(auteur_id, auth.uid()));
drop policy if exists rs_commentaires_creation on public.rs_commentaires;
create policy rs_commentaires_creation on public.rs_commentaires for insert to authenticated
  with check (auteur_id = auth.uid() and rs_est_membre_actif() and exists (select 1 from rs_cas c where c.id = cas_id and c.etat = 'publie'));
drop policy if exists rs_commentaires_modification on public.rs_commentaires;
create policy rs_commentaires_modification on public.rs_commentaires for update to authenticated
  using (auteur_id = auth.uid() or rp_est_admin()) with check (auteur_id = auth.uid() or rp_est_admin());
drop policy if exists rs_commentaires_suppression on public.rs_commentaires;
create policy rs_commentaires_suppression on public.rs_commentaires for delete to authenticated
  using (auteur_id = auth.uid() or rp_est_admin() or exists (select 1 from rs_cas c where c.id = cas_id and c.auteur_id = auth.uid()));

-- j'aime, enregistrés, abonnements
drop policy if exists rs_jaime_lecture on public.rs_jaime;
create policy rs_jaime_lecture on public.rs_jaime for select to authenticated using (exists (select 1 from rs_cas c where c.id = cas_id));
drop policy if exists rs_jaime_ecriture on public.rs_jaime;
create policy rs_jaime_ecriture on public.rs_jaime for insert to authenticated
  with check (membre_id = auth.uid() and rs_est_membre_actif() and exists (select 1 from rs_cas c where c.id = cas_id and c.etat = 'publie'));
drop policy if exists rs_jaime_suppression on public.rs_jaime;
create policy rs_jaime_suppression on public.rs_jaime for delete to authenticated using (membre_id = auth.uid());
drop policy if exists rs_enregistres_tout on public.rs_enregistres;
create policy rs_enregistres_tout on public.rs_enregistres for all to authenticated
  using (membre_id = auth.uid()) with check (membre_id = auth.uid() and exists (select 1 from rs_cas c where c.id = cas_id));
drop policy if exists rs_abonnements_lecture on public.rs_abonnements;
create policy rs_abonnements_lecture on public.rs_abonnements for select to authenticated using (rs_est_membre_actif() or rp_est_admin());
drop policy if exists rs_abonnements_ecriture on public.rs_abonnements;
create policy rs_abonnements_ecriture on public.rs_abonnements for insert to authenticated
  with check (suiveur_id = auth.uid() and rs_est_membre_actif() and not rs_bloque(suiveur_id, suivi_id));
drop policy if exists rs_abonnements_suppression on public.rs_abonnements;
create policy rs_abonnements_suppression on public.rs_abonnements for delete to authenticated using (suiveur_id = auth.uid() or suivi_id = auth.uid());

-- messagerie : les participants seulement (création par rs_ouvrir_conversation)
drop policy if exists rs_conversations_lecture on public.rs_conversations;
create policy rs_conversations_lecture on public.rs_conversations for select to authenticated using (rs_participe(id));
drop policy if exists rs_participants_lecture on public.rs_participants;
create policy rs_participants_lecture on public.rs_participants for select to authenticated using (rs_participe(conversation_id));
drop policy if exists rs_participants_modification on public.rs_participants;
create policy rs_participants_modification on public.rs_participants for update to authenticated using (membre_id = auth.uid()) with check (membre_id = auth.uid());
drop policy if exists rs_messages_lecture on public.rs_messages;
create policy rs_messages_lecture on public.rs_messages for select to authenticated using (rs_participe(conversation_id));
drop policy if exists rs_messages_envoi on public.rs_messages;
create policy rs_messages_envoi on public.rs_messages for insert to authenticated
  with check (auteur_id = auth.uid() and rs_est_membre_actif() and rs_participe(conversation_id) and not rs_bloque(auth.uid(), rs_autre(conversation_id)));
drop policy if exists rs_messages_suppression on public.rs_messages;
create policy rs_messages_suppression on public.rs_messages for update to authenticated using (auteur_id = auth.uid()) with check (auteur_id = auth.uid());
drop policy if exists rs_blocages_tout on public.rs_blocages;
create policy rs_blocages_tout on public.rs_blocages for all to authenticated using (bloqueur_id = auth.uid()) with check (bloqueur_id = auth.uid());

-- signalements et notifications
drop policy if exists rs_signalements_creation on public.rs_signalements;
create policy rs_signalements_creation on public.rs_signalements for insert to authenticated with check (auteur_id = auth.uid() and rs_est_membre_actif());
drop policy if exists rs_signalements_lecture on public.rs_signalements;
create policy rs_signalements_lecture on public.rs_signalements for select to authenticated using (auteur_id = auth.uid() or rp_est_admin());
drop policy if exists rs_signalements_traitement on public.rs_signalements;
create policy rs_signalements_traitement on public.rs_signalements for update to authenticated using (rp_est_admin()) with check (rp_est_admin());
drop policy if exists rs_notifications_tout on public.rs_notifications;
create policy rs_notifications_tout on public.rs_notifications for select to authenticated using (membre_id = auth.uid());
drop policy if exists rs_notifications_lues on public.rs_notifications;
create policy rs_notifications_lues on public.rs_notifications for update to authenticated using (membre_id = auth.uid()) with check (membre_id = auth.uid());
drop policy if exists rs_notifications_suppression on public.rs_notifications;
create policy rs_notifications_suppression on public.rs_notifications for delete to authenticated using (membre_id = auth.uid());

-- ---------- Privilèges des rôles Supabase ----------
revoke all on public.rs_membres, public.rs_cas, public.rs_commentaires, public.rs_jaime, public.rs_enregistres, public.rs_abonnements,
  public.rs_conversations, public.rs_participants, public.rs_messages, public.rs_blocages, public.rs_signalements, public.rs_notifications from anon;
revoke all on public.rs_membres, public.rs_cas, public.rs_commentaires, public.rs_jaime, public.rs_enregistres, public.rs_abonnements,
  public.rs_conversations, public.rs_participants, public.rs_messages, public.rs_blocages, public.rs_signalements, public.rs_notifications from authenticated;
grant select, insert, update, delete on public.rs_membres, public.rs_cas, public.rs_commentaires to authenticated;
grant select, insert, delete on public.rs_jaime, public.rs_enregistres, public.rs_abonnements, public.rs_blocages to authenticated;
grant select on public.rs_conversations, public.rs_participants, public.rs_messages, public.rs_notifications, public.rs_signalements to authenticated;
grant update (lu_le, archive) on public.rs_participants to authenticated;
grant insert (conversation_id, texte, image) on public.rs_messages to authenticated;
grant update (supprime) on public.rs_messages to authenticated;
grant update (lu) on public.rs_notifications to authenticated;
grant delete on public.rs_notifications to authenticated;
grant insert (cible_type, cible_id, motif, details) on public.rs_signalements to authenticated;
grant update (traite_le, traite_par, decision) on public.rs_signalements to authenticated;
revoke execute on function public.rs_rappels_messages(interval), public.rs_notifier(uuid, text, uuid, uuid), public.rs_autre_de(uuid, uuid) from public, anon, authenticated;
grant execute on function public.rs_ouvrir_conversation(uuid), public.rs_mes_conversations(), public.rs_supprimer_mon_compte(),
  public.rs_est_membre_actif(), public.rs_peut_publier(uuid), public.rs_remplacant_valide(uuid) to authenticated;
grant all on all tables in schema public to service_role;
grant execute on function public.rs_rappels_messages(interval) to service_role;

-- ---------- Temps réel (messages et notifications) ----------
do $$
declare t text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach t in array array['rs_messages', 'rs_notifications', 'rs_participants'] loop
      if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
        execute format('alter publication supabase_realtime add table public.%I', t);
      end if;
    end loop;
  end if;
end $$;

-- ---------- Stockage : photos de profil (publiques), images des cas et des messages (privées) ----------
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('cas-images', 'cas-images', false) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('messages-images', 'messages-images', false) on conflict (id) do nothing;

drop policy if exists rs_avatars_proprietaire on storage.objects;
create policy rs_avatars_proprietaire on storage.objects for all to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists rs_cas_images_lecture on storage.objects;
create policy rs_cas_images_lecture on storage.objects for select to authenticated
  using (bucket_id = 'cas-images' and (rs_est_membre_actif() or rp_est_admin()));
drop policy if exists rs_cas_images_envoi on storage.objects;
create policy rs_cas_images_envoi on storage.objects for insert to authenticated
  with check (bucket_id = 'cas-images' and (storage.foldername(name))[1] = auth.uid()::text and rs_peut_publier(auth.uid()));
drop policy if exists rs_cas_images_suppression on storage.objects;
create policy rs_cas_images_suppression on storage.objects for delete to authenticated
  using (bucket_id = 'cas-images' and ((storage.foldername(name))[1] = auth.uid()::text or rp_est_admin()));
drop policy if exists rs_messages_images_lecture on storage.objects;
create policy rs_messages_images_lecture on storage.objects for select to authenticated
  using (bucket_id = 'messages-images' and rs_participe_dossier((storage.foldername(name))[1]));
drop policy if exists rs_messages_images_envoi on storage.objects;
create policy rs_messages_images_envoi on storage.objects for insert to authenticated
  with check (bucket_id = 'messages-images' and rs_participe_dossier((storage.foldername(name))[1]) and (storage.foldername(name))[2] = auth.uid()::text);
drop policy if exists rs_messages_images_suppression on storage.objects;
create policy rs_messages_images_suppression on storage.objects for delete to authenticated
  using (bucket_id = 'messages-images' and (storage.foldername(name))[2] = auth.uid()::text);
