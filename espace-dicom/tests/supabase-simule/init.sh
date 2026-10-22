#!/bin/sh
# Simulation locale de Supabase pour les tests de l'Espace DICOM :
# même simulation et mêmes migrations que npm run test:sql, plus le rôle
# « authenticator » de PostgREST (l'API REST de Supabase).
set -eu
psql -v ON_ERROR_STOP=1 -q -U postgres -d postgres -f /simulation/supabase-simule.sql
for f in $(ls /simulation/migrations/*.sql | sort); do
  psql -v ON_ERROR_STOP=1 -q -U postgres -d postgres -f "$f"
done
psql -v ON_ERROR_STOP=1 -q -U postgres -d postgres <<SQL
create role authenticator noinherit login password '${SIMULATION_MOT_DE_PASSE}';
grant anon, authenticated, service_role to authenticator;
SQL
echo "Simulation Supabase prête."
