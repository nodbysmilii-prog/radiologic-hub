/* Remplacements — les fichiers des fonctions serveur sont à jour (npm run backend:preparer) */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { contenus, CIBLE } = require('../scripts/preparer-backend.js');

test('fonctions serveur : noyau et modèles copiés à jour dans supabase/functions/_shared', () => {
  for (const [f, c] of Object.entries(contenus())) {
    const p = path.join(CIBLE, f);
    assert.ok(fs.existsSync(p), `${f} absent : lancez npm run backend:preparer`);
    assert.equal(fs.readFileSync(p, 'utf8'), c, `${f} périmé : lancez npm run backend:preparer`);
  }
});

test('migration : tables et droits par ligne pour chaque table du module', () => {
  const sql = fs.readFileSync(path.join(__dirname, '../supabase/migrations/20261008120000_remplacements.sql'), 'utf8');
  const tables = [...sql.matchAll(/create table if not exists public\.(\w+)/g)].map(m => m[1]);
  assert.ok(tables.length >= 13);
  tables.forEach(t => assert.match(sql, new RegExp(`alter table public\\.${t} enable row level security`), `RLS absente sur ${t}`));
  assert.doesNotMatch(sql, /service_role_key|eyJhbGciOi/i, 'aucune clé dans le code');
});
