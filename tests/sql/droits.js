#!/usr/bin/env node
/* =========================================================
   Droits accordés aux rôles Supabase (exposition automatique désactivée).
   • Liste tous les GRANT du schéma public pour anon, authenticated et
     service_role (tables, colonnes, fonctions) et la compare à la
     référence tests/sql/droits-attendus.txt.
     Après un changement voulu : node tests/sql/droits.js --ecrire
   • Vérifie que toutes les tables ont leurs règles d'accès par ligne (RLS)
     et que chaque fonction appelée dans une règle est exécutable par les
     rôles de cette règle.
   ========================================================= */
const fs = require('node:fs');
const path = require('node:path');
const { demarrer } = require('./pg.js');

const REFERENCE = path.join(__dirname, 'droits-attendus.txt');
const ROLES = "('anon', 'authenticated', 'service_role')";
const TOUS = ['DELETE', 'INSERT', 'REFERENCES', 'SELECT', 'TRIGGER', 'TRUNCATE', 'UPDATE']; // MAINTAIN (PostgreSQL 17) ignoré

const pg = demarrer();
if (!pg) { console.log('PostgreSQL absent : test des droits ignoré.'); process.exit(0); }

let echecs = 0;
const verifier = (nom, ok, detail = '') => {
  console.log(`  ${ok ? '✓' : '✗'} ${nom}${ok || !detail ? '' : '\n' + detail}`);
  if (!ok) echecs++;
};

try {
  const lignes = sql => pg.admin(sql).split('\n').filter(Boolean).map(l => l.split('|'));

  // Tables : droits accordés à la table entière
  const tables = new Map();
  lignes(`select c.relname, a.grantee::regrole::text, a.privilege_type
          from pg_class c join pg_namespace n on n.oid = c.relnamespace, aclexplode(c.relacl) a
          where n.nspname = 'public' and c.relkind in ('r', 'v', 'p') and a.grantee::regrole::text in ${ROLES}`)
    .forEach(([t, r, p]) => { const k = `${t}|${r}`; tables.set(k, [...(tables.get(k) || []), p]); });
  // Colonnes : droits accordés seulement sur certaines colonnes
  const colonnes = new Map();
  lignes(`select c.relname, a.grantee::regrole::text, a.privilege_type, att.attname
          from pg_attribute att join pg_class c on c.oid = att.attrelid join pg_namespace n on n.oid = c.relnamespace,
          aclexplode(att.attacl) a
          where n.nspname = 'public' and att.attacl is not null and a.grantee::regrole::text in ${ROLES}`)
    .forEach(([t, r, p, col]) => { const k = `${t}|${r}|${p}`; colonnes.set(k, [...(colonnes.get(k) || []), col]); });
  // Fonctions
  const fonctions = lignes(`select p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')', a.grantee::regrole::text
          from pg_proc p join pg_namespace n on n.oid = p.pronamespace, aclexplode(p.proacl) a
          where n.nspname = 'public' and a.privilege_type = 'EXECUTE' and (a.grantee = 0 or a.grantee::regrole::text in ${ROLES})`)
    .map(([f, r]) => [f, r === '-' ? 'PUBLIC' : r]);

  const out = ['# Droits accordés dans le schéma public (généré par tests/sql/droits.js --ecrire)', '# Sans GRANT, un rôle n\'a aucun accès ; les règles RLS filtrent ensuite les lignes.', ''];
  out.push('## Tables');
  [...tables.entries()].sort().forEach(([k, privs]) => {
    const [t, r] = k.split('|');
    const p = [...new Set(privs)].filter(x => x !== 'MAINTAIN').sort();
    out.push(`${t} · ${r} : ${TOUS.every(x => p.includes(x)) ? 'tous les droits' : p.join(', ')}`);
  });
  out.push('', '## Colonnes (droit limité à certaines colonnes)');
  [...colonnes.entries()].sort().forEach(([k, cols]) => {
    const [t, r, p] = k.split('|');
    if ((tables.get(`${t}|${r}`) || []).includes(p)) return; // déjà accordé sur toute la table
    out.push(`${t} · ${r} : ${p} (${cols.sort().join(', ')})`);
  });
  out.push('', '## Fonctions (EXECUTE)');
  const parFonction = new Map();
  fonctions.forEach(([f, r]) => parFonction.set(f, [...(parFonction.get(f) || []), r]));
  [...parFonction.entries()].sort().forEach(([f, rs]) => out.push(`${f} · ${rs.sort().join(', ')}`));
  const texte = out.join('\n') + '\n';

  console.log('Droits des rôles Supabase :');
  if (process.argv.includes('--ecrire')) {
    fs.writeFileSync(REFERENCE, texte);
    console.log(`  référence écrite : ${path.relative(process.cwd(), REFERENCE)}`);
  } else {
    const attendu = fs.existsSync(REFERENCE) ? fs.readFileSync(REFERENCE, 'utf8') : '';
    const diff = texte.split('\n').filter(l => !attendu.split('\n').includes(l)).map(l => '      + ' + l)
      .concat(attendu.split('\n').filter(l => !texte.split('\n').includes(l)).map(l => '      − ' + l));
    verifier('les droits accordés sont exactement ceux de droits-attendus.txt', texte === attendu, diff.join('\n'));
  }

  const sansRls = pg.admin(`select string_agg(c.relname, ', ') from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity`);
  verifier('toutes les tables du schéma public ont des règles d\'accès par ligne (RLS)', !sansRls, '      sans RLS : ' + sansRls);

  const manquants = pg.admin(`
    with f as (select p.oid, p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public')
    select string_agg(distinct pol.schemaname || '.' || pol.tablename || ' → ' || f.proname || ' (' || r.role || ')', E'\\n      ')
    from pg_policies pol cross join unnest(pol.roles) as r(role)
    join f on (coalesce(pol.qual, '') || ' ' || coalesce(pol.with_check, '')) ~ ('\\m' || f.proname || '\\(')
    where r.role <> 'public' and not has_function_privilege(r.role, f.oid, 'EXECUTE')`);
  verifier('chaque fonction appelée dans une règle d\'accès est exécutable par les rôles de la règle', !manquants, '      ' + manquants);

  const anon = pg.admin(`select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace, aclexplode(c.relacl) a
    where n.nspname = 'public' and a.grantee = 'anon'::regrole and a.privilege_type <> 'SELECT'`);
  verifier('le rôle anon (visiteur non connecté) ne peut jamais écrire', anon === '0');
} finally {
  pg.arreter();
}
console.log(`\n# ${echecs ? 'fail ' + echecs : 'pass'}`);
process.exit(echecs ? 1 : 0);
