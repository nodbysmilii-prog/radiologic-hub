-- =====================================================================
-- Planification de l'agent (à exécuter une fois dans l'éditeur SQL de
-- Supabase, APRÈS avoir déployé la fonction rp-taches).
-- Remplacer <PROJET> par l'identifiant du projet et <SECRET> par la valeur
-- de RP_TACHES_SECRET. Extensions requises : pg_cron et pg_net
-- (Database → Extensions).
-- =====================================================================
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'rp-taches',                     -- nom de la tâche
  '*/15 * * * *',                  -- toutes les 15 minutes
  $$ select net.http_post(
       url := 'https://<PROJET>.supabase.co/functions/v1/rp-taches',
       headers := jsonb_build_object('content-type', 'application/json', 'x-rp-secret', '<SECRET>'),
       body := '{}'::jsonb
     ); $$
);

-- Pour arrêter : select cron.unschedule('rp-taches');

-- Administrateur(s) du module : votre adresse e-mail de connexion
-- insert into public.rp_admins (email) values ('votre.adresse@exemple.com');
