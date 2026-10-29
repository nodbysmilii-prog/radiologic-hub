-- =====================================================================
-- Contrôle de la planification de rp-taches (éditeur SQL de Supabase).
-- N'affiche que des oui / non, jamais le secret. Chaque colonne doit
-- valoir la valeur indiquée dans son nom (« _oui » → true, « _non » → false).
-- Le même script est exécuté par tests/sql/planification.js.
-- =====================================================================
select
  exists (select 1 from vault.secrets where name = 'rp_taches_secret')                                  as secret_dans_le_vault_oui,
  (select length(decrypted_secret) = 64 from vault.decrypted_secrets where name = 'rp_taches_secret')   as secret_de_64_caracteres_oui,
  has_function_privilege('service_role', 'public.rp_taches_secret_valide(text)', 'execute')             as verification_par_service_role_oui,
  has_function_privilege('anon', 'public.rp_taches_secret_valide(text)', 'execute')                     as verification_par_visiteur_non,
  has_function_privilege('authenticated', 'public.rp_taches_secret_valide(text)', 'execute')            as verification_par_membre_non,
  has_function_privilege('anon', 'rp_prive.appeler_taches(text)', 'execute')                            as appel_par_visiteur_non,
  has_function_privilege('authenticated', 'rp_prive.appeler_taches(text)', 'execute')                   as appel_par_membre_non,
  has_function_privilege('service_role', 'rp_prive.appeler_taches(text)', 'execute')                    as appel_par_service_role_non,
  has_schema_privilege('anon', 'rp_prive', 'usage') or has_schema_privilege('authenticated', 'rp_prive', 'usage') as schema_prive_ouvert_non,
  has_schema_privilege('anon', 'vault', 'usage') or has_schema_privilege('authenticated', 'vault', 'usage')       as vault_ouvert_aux_utilisateurs_non,
  has_table_privilege('anon', 'vault.decrypted_secrets', 'select')
    or has_table_privilege('authenticated', 'vault.decrypted_secrets', 'select')                        as secrets_lisibles_par_utilisateurs_non;
