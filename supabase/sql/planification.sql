-- =====================================================================
-- Planification de l'agent rp-taches toutes les 15 minutes
-- À exécuter une fois dans l'éditeur SQL de Supabase, APRÈS :
--   1. la migration supabase/migrations/20261029120000_planification_vault.sql
--      (secret rangé dans le Vault, fonctions de vérification et d'appel) ;
--   2. le déploiement de la fonction rp-taches qui l'utilise ;
--   3. l'activation de pg_cron et pg_net (Database → Extensions).
-- Aucun secret à recopier : la tâche lit le mot de passe dans le Vault à
-- chaque passage, rien n'est affiché ni écrit en clair dans la tâche.
-- Contrôle des droits : supabase/sql/verification-planification.sql.
-- =====================================================================
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'rp-taches',                     -- nom de la tâche
  '*/15 * * * *',                  -- toutes les 15 minutes
  $$ select rp_prive.appeler_taches('https://wdbczcwnaxfnoioyukgr.supabase.co') $$
);

-- Suivi (aucune de ces requêtes n'affiche le secret) :
--   select jobname, schedule, active, command from cron.job;
--   select status, return_message, start_time from cron.job_run_details order by start_time desc limit 5;
--   select status_code, created from net._http_response order by created desc limit 5;  -- attendu : 200
-- Pour arrêter : select cron.unschedule('rp-taches');
-- Pour changer le mot de passe (sans l'afficher) :
--   select vault.update_secret((select id from vault.secrets where name = 'rp_taches_secret'),
--                              encode(extensions.gen_random_bytes(32), 'hex'));

-- Administrateur(s) du module : votre adresse e-mail de connexion
-- insert into public.rp_admins (email) values ('votre.adresse@exemple.com');
