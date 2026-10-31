-- =====================================================================
-- Diagnostic de production — STRICTEMENT EN LECTURE SEULE
-- Utilisé par le workflow « Exploitation Supabase » (action diagnostic,
-- scripts/exploitation-supabase.js), envoyé en mode lecture seule ; peut
-- aussi être collé tel quel dans l'éditeur SQL de Supabase.
-- UNE seule requête SELECT. Ne renvoie que des oui / non, des versions et des
-- noms techniques : aucune donnée sur les utilisateurs (ni comptes, ni données), aucune valeur
-- de secret, aucune commande de tâche Cron (une ancienne commande pourrait
-- contenir un mot de passe en clair). Les objets absents donnent null au lieu
-- d'une erreur (requêtes dynamiques par query_to_xml, sans écriture).
-- Vérifié par tests/sql/diagnostic.js (exécuté dans une transaction READ ONLY).
-- =====================================================================
select jsonb_build_object(
  'migrations', jsonb_build_object(
    '20261008120000_remplacements', to_regclass('public.rp_demandes') is not null and to_regprocedure('public.rp_est_admin()') is not null,
    '20261009090000_reseau', to_regclass('public.rs_membres') is not null,
    '20261012090000_droits_explicites', coalesce(has_function_privilege('authenticated', to_regprocedure('public.rp_a_recu(uuid)'), 'execute'), false),
    '20261012120000_bibliotheque', to_regclass('public.bib_articles') is not null,
    '20261012180000_cours', to_regclass('public.cours_validations') is not null,
    '20261014090000_espace_dicom', to_regclass('public.dc_examens') is not null,
    '20261027120000_communaute_fil', to_regproc('public.rs_missions_ouvertes') is not null,
    '20261029120000_planification_vault', to_regprocedure('public.rp_taches_secret_valide(text)') is not null and to_regprocedure('rp_prive.appeler_taches(text)') is not null,
    '20261030090000_abonnements', to_regclass('public.ab_abonnements') is not null and to_regprocedure('public.ab_est_abonne()') is not null,
    '20261031130000_search_path_profil', coalesce((select 'search_path=""' = any(proconfig) from pg_proc where oid = to_regprocedure('public.rp_proteger_profil()')), false)
  ),
  'historique_migrations', case when to_regclass('supabase_migrations.schema_migrations') is null then null
    else (xpath('/row/j/text()', query_to_xml('select coalesce(jsonb_agg(version order by version), ''[]'')::text as j from supabase_migrations.schema_migrations', false, true, '')))[1]::text::jsonb end,
  'extensions', (select coalesce(jsonb_object_agg(extname, extversion), '{}'::jsonb) from pg_extension where extname in ('pg_cron', 'pg_net', 'supabase_vault', 'pgcrypto')),
  'vault', jsonb_build_object(
    'schema_vault', to_regnamespace('vault') is not null,
    'secret_rp_taches_secret', case when to_regclass('vault.secrets') is null then null
      else (xpath('/row/n/text()', query_to_xml('select count(*) as n from vault.secrets where name = ''rp_taches_secret''', false, true, '')))[1]::text::int = 1 end,
    'schema_rp_prive', to_regnamespace('rp_prive') is not null,
    'fonction_verification', to_regprocedure('public.rp_taches_secret_valide(text)') is not null,
    'fonction_appel', to_regprocedure('rp_prive.appeler_taches(text)') is not null
  ),
  'droits', jsonb_build_object(
    'verification_par_service_role', has_function_privilege('service_role', to_regprocedure('public.rp_taches_secret_valide(text)'), 'execute'),
    'verification_par_anon', has_function_privilege('anon', to_regprocedure('public.rp_taches_secret_valide(text)'), 'execute'),
    'verification_par_authenticated', has_function_privilege('authenticated', to_regprocedure('public.rp_taches_secret_valide(text)'), 'execute'),
    'appel_par_anon', has_function_privilege('anon', to_regprocedure('rp_prive.appeler_taches(text)'), 'execute'),
    'appel_par_authenticated', has_function_privilege('authenticated', to_regprocedure('rp_prive.appeler_taches(text)'), 'execute'),
    'appel_par_service_role', has_function_privilege('service_role', to_regprocedure('rp_prive.appeler_taches(text)'), 'execute'),
    'vault_lisible_par_utilisateurs', coalesce(has_table_privilege('anon', to_regclass('vault.decrypted_secrets'), 'select'), false)
      or coalesce(has_table_privilege('authenticated', to_regclass('vault.decrypted_secrets'), 'select'), false),
    'file_pg_net_lisible_par_utilisateurs', coalesce(has_table_privilege('anon', to_regclass('net.http_request_queue'), 'select'), false)
      or coalesce(has_table_privilege('authenticated', to_regclass('net.http_request_queue'), 'select'), false)
  ),
  'securisation', (
    with visees(s) as (values ('public.ab_est_abonne()'), ('public.ab_maj_le()'), ('public.bib_avant_ecriture()'), ('public.dc_droits(uuid)'), ('public.dc_droits_de(uuid,uuid)'), ('public.dc_droits_etude(text)'), ('public.dc_est_admin_de(uuid)'), ('public.dc_est_radiologue(uuid)'), ('public.dc_est_resident(uuid)'), ('public.dc_examens_avant_ecriture()'), ('public.dc_expertises_avant_ecriture()'), ('public.dc_journal_pas_de_vidage()'), ('public.dc_journal_protege()'), ('public.dc_mon_espace()'), ('public.dc_peut_importer(uuid)'), ('public.dc_peut_importer_de(uuid,uuid)'), ('public.dc_peut_valider_resident(uuid)'), ('public.dc_reglages_maj_le()'), ('public.dc_residents_avant_ecriture()'), ('public.dc_role()'), ('public.dc_role_de(uuid)'), ('public.dc_role_structure_de(uuid,uuid)'), ('public.rp_a_recu(uuid)'), ('public.rp_a_recu_de(uuid)'), ('public.rp_accepter_invitations()'), ('public.rp_compteurs(uuid[])'), ('public.rp_est_admin()'), ('public.rp_est_membre(uuid)'), ('public.rp_est_responsable(uuid)'), ('public.rp_membre_meme_structure(uuid)'), ('public.rp_nouvel_utilisateur()'), ('public.rp_proteger_profil()'), ('public.rp_proteger_validation()'), ('public.rp_statistiques()'), ('public.rp_structure_creee()'), ('public.rp_taches_secret_valide(text)'), ('public.rp_voit_remplacant(uuid)'), ('public.rs_autre(uuid)'), ('public.rs_autre_de(uuid,uuid)'), ('public.rs_bloque(uuid,uuid)'), ('public.rs_compter()'), ('public.rs_est_membre_actif()'), ('public.rs_evenement()'), ('public.rs_mes_conversations()'), ('public.rs_message_envoye()'), ('public.rs_message_supprime()'), ('public.rs_missions_ouvertes()'), ('public.rs_notifier(uuid,text,uuid,uuid)'), ('public.rs_ouvrir_conversation(uuid)'), ('public.rs_participe(uuid)'), ('public.rs_participe_dossier(text)'), ('public.rs_peut_publier(uuid)'), ('public.rs_proteger_cas()'), ('public.rs_proteger_commentaire()'), ('public.rs_proteger_membre()'), ('public.rs_proteger_message()'), ('public.rs_rappels_messages(interval)'), ('public.rs_remplacant_valide(uuid)'), ('public.rs_signalement_recu()'), ('public.rs_supprimer_mon_compte()')),
      membres(s) as (values ('public.rp_a_recu(uuid)'), ('public.rp_a_recu_de(uuid)'), ('public.rp_accepter_invitations()'), ('public.rp_compteurs(uuid[])'), ('public.rp_est_admin()'), ('public.rp_est_membre(uuid)'), ('public.rp_est_responsable(uuid)'), ('public.rp_membre_meme_structure(uuid)'), ('public.rp_statistiques()'), ('public.rp_voit_remplacant(uuid)'), ('public.rs_autre(uuid)'), ('public.rs_bloque(uuid,uuid)'), ('public.rs_est_membre_actif()'), ('public.rs_mes_conversations()'), ('public.rs_missions_ouvertes()'), ('public.rs_ouvrir_conversation(uuid)'), ('public.rs_participe(uuid)'), ('public.rs_participe_dossier(text)'), ('public.rs_peut_publier(uuid)'), ('public.rs_remplacant_valide(uuid)'), ('public.rs_supprimer_mon_compte()'), ('public.ab_est_abonne()'), ('public.dc_role()'), ('public.dc_droits(uuid)'), ('public.dc_peut_importer(uuid)'), ('public.dc_peut_valider_resident(uuid)'), ('public.dc_droits_etude(text)'), ('public.dc_mon_espace()')),
      service(s) as (values ('public.rs_rappels_messages(interval)'), ('public.rp_taches_secret_valide(text)'))
    select jsonb_build_object(
      'fonctions_visees_presentes', (select count(*) from visees where to_regprocedure(s) is not null),
      'nombre_executables_par_anon', (select count(*) from visees where to_regprocedure(s) is not null and has_function_privilege('anon', to_regprocedure(s), 'execute')),
      'executables_par_anon', (select coalesce(jsonb_agg(split_part(replace(s, 'public.', ''), '(', 1) order by s), '[]'::jsonb) from visees where to_regprocedure(s) is not null and has_function_privilege('anon', to_regprocedure(s), 'execute')),
      'membres_sans_droit', (select coalesce(jsonb_agg(split_part(replace(s, 'public.', ''), '(', 1) order by s), '[]'::jsonb) from membres where to_regprocedure(s) is not null and not has_function_privilege('authenticated', to_regprocedure(s), 'execute')),
      'service_sans_droit', (select coalesce(jsonb_agg(split_part(replace(s, 'public.', ''), '(', 1) order by s), '[]'::jsonb) from service where to_regprocedure(s) is not null and not has_function_privilege('service_role', to_regprocedure(s), 'execute')),
      'pg_net_lisible_par_anon', coalesce(has_any_column_privilege('anon', to_regclass('net.http_request_queue'), 'select'), false) or coalesce(has_any_column_privilege('anon', to_regclass('net._http_response'), 'select'), false),
      'pg_net_lisible_par_authenticated', coalesce(has_any_column_privilege('authenticated', to_regclass('net.http_request_queue'), 'select'), false) or coalesce(has_any_column_privilege('authenticated', to_regclass('net._http_response'), 'select'), false),
      'autres_fonctions_publiques_executables_par_anon', (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and has_function_privilege('anon', p.oid, 'execute')
          and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
          and not exists (select 1 from visees where to_regprocedure(visees.s) = p.oid)),
      'autres_fonctions_executables_par_anon', (select coalesce(jsonb_agg(p.proname order by p.proname), '[]'::jsonb) from (select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and has_function_privilege('anon', p.oid, 'execute')
          and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
          and not exists (select 1 from visees where to_regprocedure(visees.s) = p.oid) order by p.proname limit 20) p),
      -- alerte Supabase function_search_path_mutable : fonctions du schéma public sans search_path fixé (noms seulement)
      'fonctions_sans_search_path', (select coalesce(jsonb_agg(p.proname order by p.proname), '[]'::jsonb) from (select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.prokind = 'f'
          and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
          and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) c where c like 'search_path=%') order by p.proname limit 20) p),
      'sauvegarde_des_droits_presente', to_regclass('securite_sauvegarde.droits_20261031') is not null
    )
  ),
  'cron', case when to_regclass('cron.job') is null then null
    else (xpath('/row/j/text()', query_to_xml('select coalesce(jsonb_agg(jsonb_build_object(''nom'', jobname, ''frequence'', schedule, ''active'', active, ''via_vault'', command like ''%rp_prive.appeler_taches%'', ''secret_en_clair'', command ilike ''%x-rp-secret%'') order by jobid), ''[]'')::text as j from cron.job', false, true, '')))[1]::text::jsonb end,
  'cron_dernieres_executions', case when to_regclass('cron.job_run_details') is null or to_regclass('cron.job') is null then null
    else (xpath('/row/j/text()', query_to_xml('select coalesce(jsonb_agg(status order by start_time desc), ''[]'')::text as j from (select d.status, d.start_time from cron.job_run_details d join cron.job c on c.jobid = d.jobid where c.jobname = ''rp-taches'' order by d.start_time desc limit 5) t', false, true, '')))[1]::text::jsonb end,
  'pg_net_derniers_codes', case when to_regclass('net._http_response') is null then null
    else (xpath('/row/j/text()', query_to_xml('select coalesce(jsonb_agg(status_code order by created desc), ''[]'')::text as j from (select status_code, created from net._http_response order by created desc limit 5) t', false, true, '')))[1]::text::jsonb end,
  -- Droits accordés dans le schéma public, au format de tests/sql/droits-attendus.txt (noms techniques seulement),
  -- comparés par scripts/exploitation-supabase.js à la référence testée : tout droit en trop est signalé.
  'droits_lignes', (
    with roles as (select oid, rolname from pg_roles where rolname in ('anon', 'authenticated', 'service_role')),
    t as (
      select c.relname as t, r.rolname as r, array_agg(distinct a.privilege_type order by a.privilege_type) filter (where a.privilege_type <> 'MAINTAIN') as p
      from pg_class c join pg_namespace n on n.oid = c.relnamespace, aclexplode(c.relacl) a join roles r on r.oid = a.grantee
      where n.nspname = 'public' and c.relkind in ('r', 'v', 'p') group by 1, 2),
    col as (
      select c.relname as t, r.rolname as r, a.privilege_type as p, string_agg(att.attname, ', ' order by att.attname) as cols
      from pg_attribute att join pg_class c on c.oid = att.attrelid join pg_namespace n on n.oid = c.relnamespace, aclexplode(att.attacl) a join roles r on r.oid = a.grantee
      where n.nspname = 'public' and att.attacl is not null group by 1, 2, 3),
    f as (
      select p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' as f, string_agg(case when a.grantee = 0 then 'PUBLIC' else r.rolname end, ', ' order by case when a.grantee = 0 then 'PUBLIC' else r.rolname end) as rs
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace, aclexplode(p.proacl) a left join roles r on r.oid = a.grantee
      where n.nspname = 'public' and a.privilege_type = 'EXECUTE' and (a.grantee = 0 or r.oid is not null)
        and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e') group by 1)
    select coalesce(jsonb_agg(l), '[]'::jsonb) from (
      select t || ' · ' || r || ' : ' || case when cardinality(p) = 7 then 'tous les droits' else array_to_string(p, ', ') end as l from t
      union all select col.t || ' · ' || col.r || ' : ' || col.p || ' (' || col.cols || ')' from col where not exists (select 1 from t where t.t = col.t and t.r = col.r and col.p = any(t.p))
      union all select f || ' · ' || rs from f) x
  )
) as diagnostic;
