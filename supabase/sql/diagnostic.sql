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
    '20261030090000_abonnements', to_regclass('public.ab_abonnements') is not null and to_regprocedure('public.ab_est_abonne()') is not null
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
  'cron', case when to_regclass('cron.job') is null then null
    else (xpath('/row/j/text()', query_to_xml('select coalesce(jsonb_agg(jsonb_build_object(''nom'', jobname, ''frequence'', schedule, ''active'', active, ''via_vault'', command like ''%rp_prive.appeler_taches%'', ''secret_en_clair'', command ilike ''%x-rp-secret%'') order by jobid), ''[]'')::text as j from cron.job', false, true, '')))[1]::text::jsonb end,
  'cron_dernieres_executions', case when to_regclass('cron.job_run_details') is null or to_regclass('cron.job') is null then null
    else (xpath('/row/j/text()', query_to_xml('select coalesce(jsonb_agg(status order by start_time desc), ''[]'')::text as j from (select d.status, d.start_time from cron.job_run_details d join cron.job c on c.jobid = d.jobid where c.jobname = ''rp-taches'' order by d.start_time desc limit 5) t', false, true, '')))[1]::text::jsonb end,
  'pg_net_derniers_codes', case when to_regclass('net._http_response') is null then null
    else (xpath('/row/j/text()', query_to_xml('select coalesce(jsonb_agg(status_code order by created desc), ''[]'')::text as j from (select status_code, created from net._http_response order by created desc limit 5) t', false, true, '')))[1]::text::jsonb end
) as diagnostic;
