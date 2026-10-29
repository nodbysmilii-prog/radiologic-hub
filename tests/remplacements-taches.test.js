/* Remplacements — accès à la fonction planifiée rp-taches (secret dans le Vault) */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const racine = path.join(__dirname, '..');
const lire = f => fs.readFileSync(path.join(racine, f), 'utf8');
const charger = () => import(path.join(racine, 'supabase/functions/_shared/acces-taches.mjs'));
const SECRET = 'a'.repeat(64);
const base = (verifier = async c => ({ data: c === SECRET, error: null })) =>
  ({ methode: 'POST', secretRecu: SECRET, cleService: 'cle-service', verifier });

test('rp-taches : le bon mot de passe, vérifié par la base, ouvre l\'accès', async () => {
  const { appelTachesAutorise } = await charger();
  assert.equal(await appelTachesAutorise(base()), true);
});

test('rp-taches : appels non authentifiés ou douteux refusés sans interroger la base', async () => {
  const { appelTachesAutorise } = await charger();
  let appels = 0;
  const compte = async () => { appels++; return { data: true, error: null }; };
  const cas = [
    { secretRecu: null }, { secretRecu: '' }, { secretRecu: 'court' }, { secretRecu: 'b'.repeat(31) },
    { secretRecu: 'c'.repeat(257) }, { methode: 'GET' }, { methode: 'PUT' },
    { cleService: undefined }, { cleService: '' },
  ];
  for (const c of cas) assert.equal(await appelTachesAutorise({ ...base(compte), ...c }), false, JSON.stringify(c));
  assert.equal(appels, 0);
});

test('rp-taches : refus si la base répond autre chose que « vrai », échoue ou est injoignable', async () => {
  const { appelTachesAutorise } = await charger();
  const reponses = [
    { data: false, error: null }, { data: null, error: null }, { data: 'true', error: null }, { data: 1, error: null },
    { data: true, error: { message: 'permission denied for function rp_taches_secret_valide' } }, // clé anon ou erronée
    { data: null, error: { message: 'Invalid API key' } },
  ];
  for (const r of reponses) assert.equal(await appelTachesAutorise(base(async () => r)), false, JSON.stringify(r));
  assert.equal(await appelTachesAutorise(base(async () => { throw new Error('réseau'); })), false);
  assert.equal(await appelTachesAutorise(base(() => { throw new Error('supabaseKey is required.'); })), false);
  assert.equal(await appelTachesAutorise({ ...base(), secretRecu: 'd'.repeat(64) }), false);
});

test('rp-taches : n\'utilise plus RP_TACHES_SECRET et vérifie le mot de passe auprès de la base', () => {
  const code = lire('supabase/functions/rp-taches/index.ts');
  assert.doesNotMatch(code, /RP_TACHES_SECRET/);
  assert.match(code, /appelTachesAutorise\(/);
  assert.match(code, /rpc\('rp_taches_secret_valide'/);
  assert.match(code, /if \(!autorise\) return erreur\('Accès refusé\.', 403\);\n {2}try \{\n {4}const \{ agent, db \} = creerAgentServeur\(\);/,
    'le contrôle d\'accès doit précéder tout travail de l\'agent');
});

test('planification : aucun secret en clair dans le dépôt, la tâche passe par rp_prive.appeler_taches', () => {
  const planif = lire('supabase/sql/planification.sql');
  const migration = lire('supabase/migrations/20261029120000_planification_vault.sql');
  assert.doesNotMatch(planif, /x-rp-secret|<SECRET>/);
  assert.match(planif, /cron\.schedule\(\s*'rp-taches',[^\n]*\n\s*'\*\/15 \* \* \* \*',[^\n]*\n\s*\$\$ select rp_prive\.appeler_taches\('https:\/\/wdbczcwnaxfnoioyukgr\.supabase\.co'\) \$\$\n\);/);
  for (const t of [planif, migration, lire('supabase/sql/verification-planification.sql')]) {
    assert.doesNotMatch(t, /\b[0-9a-f]{32,}\b/i, 'aucune longue valeur hexadécimale');
    assert.doesNotMatch(t, /service_role_key|eyJhbGciOi/i, 'aucune clé');
  }
  assert.match(migration, /gen_random_bytes\(32\)/);
  assert.match(lire('supabase/config.toml'), /\[functions\.rp-taches\]\nverify_jwt = false/, 'appel par pg_cron sans jeton : protégé par x-rp-secret');
});
