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
