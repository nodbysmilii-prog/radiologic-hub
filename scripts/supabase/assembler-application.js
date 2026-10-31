#!/usr/bin/env node
/* =========================================================
   RadiologicHub — scripts d'APPLICATION des migrations absentes de la
   production (supabase/sql/appliquer/<migration>.sql), à coller tels quels
   dans Supabase → SQL Editor, APRÈS autorisation de l'auteur.
   Chaque script est UNE transaction :
     1. prérequis (migrations et extensions nécessaires) → sinon refus ;
     2. la migration, à l'identique (supabase/migrations/<migration>.sql) ;
     3. contrôles de sécurité → au moindre écart, ANNULATION COMPLÈTE
        (rien n'est appliqué) :
        • migration reconnue (même test que le diagnostic) ;
        • aucune fonction du schéma public exécutable par anon
          (hors rls_auto_enable, installée par Supabase) ;
        • toutes les tables du schéma public avec RLS ;
        • anon n'a jamais de droit d'écriture sur une table ;
        • toute fonction SECURITY DEFINER du schéma public a un search_path fixé ;
     4. message « … appliquée et contrôlée ».
   Générés depuis les migrations : node scripts/supabase/assembler-application.js
   (tests/sql/application-migrations.js vérifie qu'ils sont à jour et les
   exécute sur une base qui reproduit la production). Ne jamais les modifier
   à la main.
   ========================================================= */
'use strict';
const fs = require('node:fs');
const path = require('node:path');

const RACINE = path.join(__dirname, '..', '..');
const SORTIE = path.join(RACINE, 'supabase', 'sql', 'appliquer');

/* Migrations absentes de la production (docs/organisation/MIGRATIONS_PRODUCTION.md), ordre conseillé, prérequis. */
const MIGRATIONS = [
  { nom: '20261031130000_search_path_profil', prerequis: [["to_regprocedure('public.rp_proteger_profil()') is not null", 'migration 20261008120000_remplacements']] },
  { nom: '20261027120000_communaute_fil', prerequis: [["to_regclass('public.rs_cas') is not null", 'migration 20261009090000_reseau'], ["to_regclass('public.rp_demandes') is not null", 'migration 20261008120000_remplacements']] },
  { nom: '20261029120000_planification_vault', prerequis: [["to_regclass('vault.secrets') is not null", 'extension supabase_vault (Database → Extensions)'], ["to_regprocedure('extensions.gen_random_bytes(integer)') is not null", 'extension pgcrypto (schéma extensions)'], ["to_regnamespace('net') is not null", 'extension pg_net (Database → Extensions)']] },
  { nom: '20261030090000_abonnements', prerequis: [["to_regprocedure('public.rp_est_admin()') is not null", 'migration 20261008120000_remplacements'], ["to_regclass('storage.buckets') is not null", 'stockage Supabase']] },
  { nom: '20261014090000_espace_dicom', prerequis: [["to_regprocedure('public.rp_est_admin()') is not null", 'migration 20261008120000_remplacements'], ["to_regclass('public.rs_membres') is not null", 'migration 20261009090000_reseau']] },
];

/* Test « migration appliquée » : repris du diagnostic (supabase/sql/diagnostic.sql), source unique. */
function marqueurs() {
  const diag = fs.readFileSync(path.join(RACINE, 'supabase', 'sql', 'diagnostic.sql'), 'utf8');
  const m = new Map();
  for (const l of diag.split('\n')) {
    const x = l.match(/^ {4}'(\d{14}_[a-z_]+)', (.+?),?$/);
    if (x) m.set(x[1], x[2]);
  }
  return m;
}

const CONTROLES = `  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
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
  END IF;`;

function assembler({ nom, prerequis }, marqueur) {
  if (!marqueur) throw new Error(`Migration inconnue du diagnostic : ${nom}`);
  const migration = fs.readFileSync(path.join(RACINE, 'supabase', 'migrations', `${nom}.sql`), 'utf8').trimEnd();
  if (/^\s*(?:begin|commit|rollback)\s*;/im.test(migration)) throw new Error(`${nom} : transaction interne interdite (le script l'enveloppe déjà)`);
  return `-- =====================================================================
-- APPLICATION CONTRÔLÉE de supabase/migrations/${nom}.sql
-- GÉNÉRÉ par scripts/supabase/assembler-application.js : ne pas modifier.
-- À coller tel quel dans Supabase → SQL Editor, APRÈS autorisation de
-- l'auteur (choisir « Run without RLS » si Supabase le propose).
-- Une seule transaction : prérequis → migration → contrôles de sécurité ;
-- au moindre écart, tout est annulé (rien n'est appliqué).
-- Retour arrière après succès : supabase/sql/retour/${nom}.sql
-- =====================================================================
BEGIN;

-- 1. Prérequis
DO $rh$
BEGIN
${prerequis.map(([test, libelle]) => `  IF NOT (${test}) THEN RAISE EXCEPTION 'Prérequis absent : ${libelle.replace(/'/g, "''")} ; rien n''a été appliqué'; END IF;`).join('\n')}
END $rh$;

-- 2. Migration (copie exacte)
${migration}

-- 3. Contrôles de sécurité (annulation complète en cas d'écart)
DO $rh$
BEGIN
  IF NOT coalesce((${marqueur}), false) THEN
    RAISE EXCEPTION 'Contrôle refusé : migration ${nom} non reconnue après application';
  END IF;
${CONTROLES}
  RAISE NOTICE 'Migration ${nom} appliquée et contrôlée.';
END $rh$;

COMMIT;
`;
}

function tout() {
  const m = marqueurs();
  return Object.fromEntries(MIGRATIONS.map(x => [`${x.nom}.sql`, assembler(x, m.get(x.nom))]));
}

if (require.main === module) {
  fs.mkdirSync(SORTIE, { recursive: true });
  for (const [f, texte] of Object.entries(tout())) fs.writeFileSync(path.join(SORTIE, f), texte);
  console.log(`${MIGRATIONS.length} scripts écrits dans ${path.relative(RACINE, SORTIE)}/`);
}
module.exports = { MIGRATIONS, tout, SORTIE };
