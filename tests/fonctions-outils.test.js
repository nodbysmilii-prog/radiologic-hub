/* Fonctions serveur Supabase (supabase/functions/) : outils communs testés sous Node, et contrôles du code
   (aucune adresse e-mail complète ni secret dans les journaux, corps de requête validé, version exposée). */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const F = path.join(__dirname, '..', 'supabase', 'functions');
const lire = f => fs.readFileSync(path.join(F, f), 'utf8');
const charger = () => import(path.join(F, '_shared', 'outils.mjs'));

test('masquerEmail : adresse jamais écrite en entier dans les journaux', async () => {
  const { masquerEmail } = await charger();
  assert.equal(masquerEmail('jean.dupont@exemple.tn'), 'je***@exemple.tn');
  assert.equal(masquerEmail('a@b.tn'), 'a***@b.tn');
  for (const v of ['', null, undefined, 'sans-arobase', '@exemple.tn']) assert.equal(masquerEmail(v), '[adresse masquée]');
});

test('lireCorps : seul un objet JSON est accepté (sinon null, jamais d\'exception)', async () => {
  const { lireCorps } = await charger();
  const req = corps => ({ json: async () => (corps instanceof Error ? Promise.reject(corps) : JSON.parse(corps)) });
  assert.deepEqual(await lireCorps(req('{"action":"publier"}')), { action: 'publier' });
  for (const c of ['null', '[]', '"texte"', '42', 'true', new Error('JSON invalide')]) assert.equal(await lireCorps(req(c)), null, String(c));
});

test('texteBorne : chaîne non vide et bornée (jetons, codes de désinscription)', async () => {
  const { texteBorne } = await charger();
  assert.equal(texteBorne('abc', 100), 'abc');
  assert.equal(texteBorne(123, 100), '123');
  for (const v of ['', 'x'.repeat(101), null, undefined, {}, ['a']]) assert.equal(texteBorne(v, 100), null);
});

test('code des fonctions : corps validé, aucun secret ni adresse complète écrits dans les journaux', () => {
  const agent = lire('rp-agent/index.ts'), lien = lire('rp-lien/index.ts'), transport = lire('_shared/transport.ts');
  assert.match(agent, /lireCorps\(req\)/);
  assert.match(agent, /return erreur\('Connexion requise\.', 401/);
  assert.match(lien, /texteBorne\(c\.desinscription, 200\)/);
  assert.match(lien, /texteBorne\(c\.jeton, 100\)/);
  assert.match(transport, /masquerEmail\(m\.a\.email\)/);
  for (const f of ['rp-agent/index.ts', 'rp-lien/index.ts', 'rp-taches/index.ts', '_shared/agent.ts', '_shared/transport.ts', '_shared/reseau.ts', '_shared/depot-supabase.ts']) {
    const t = lire(f);
    for (const appel of t.matchAll(/console\.(?:log|error|warn)\(([^;]*)\);/g)) {
      assert.doesNotMatch(appel[1], /SERVICE_ROLE|API_KEY|RP_SECRET|x-rp-secret|secretRecu|jeton\b|\.email\b(?!\))|authorization/i, `${f} : ${appel[0]}`);
    }
  }
});

test('version du code : en-tête x-rp-version exposé, empreinte du dépôt à jour', () => {
  const { versionAttendue } = require('../scripts/preparer-backend.js');
  assert.match(lire('_shared/agent.ts'), /'x-rp-version': VERSION/);
  assert.match(lire('_shared/agent.ts'), /'access-control-expose-headers': 'x-rp-version'/);
  assert.equal(lire('_shared/version.ts').match(/VERSION = '([0-9a-f]{12})'/)[1], versionAttendue(), 'relancer npm run backend:preparer');
});

test('contrôle de santé après déploiement : version, CORS et statut ; réessaie puis échoue proprement', async () => {
  const { controler } = require('../scripts/sante-fonctions.js');
  const { versionAttendue } = require('../scripts/preparer-backend.js');
  const v = versionAttendue();
  const rep = (statut, version, origine = '*') => ({ status: statut, headers: new Map([['x-rp-version', version], ['access-control-allow-origin', origine]]) });
  const lignes = [];
  const sain = await controler({ fetch: async () => rep(200, v), essais: 1, attente: 0, journal: l => lignes.push(l) });
  assert.equal(sain.ok, true);
  assert.equal(lignes.length, 3);
  let n = 0;
  const lent = await controler({ fetch: async () => rep(200, ++n <= 2 ? 'abcdef123456' : v), essais: 3, attente: 0, journal: () => {} });
  assert.equal(lent.ok, true, 'version servie après quelques secondes');
  const ancien = await controler({ fetch: async () => rep(200, null), essais: 2, attente: 0, journal: () => {} });
  assert.equal(ancien.ok, false);
  const cors = await controler({ fetch: async () => rep(200, v, 'https://autre.exemple'), essais: 1, attente: 0, journal: () => {} });
  assert.equal(cors.ok, false);
  const panne = await controler({ fetch: async () => { throw new Error('réseau'); }, essais: 1, attente: 0, journal: () => {} });
  assert.equal(panne.ok, false);
});

test('workflow de déploiement : contrôle de santé final, sans secret', () => {
  const w = fs.readFileSync(path.join(__dirname, '..', '.github', 'workflows', 'deployer-fonctions.yml'), 'utf8');
  const etape = w.slice(w.indexOf('- name: Contrôle de santé après déploiement'));
  assert.match(etape, /run: node scripts\/sante-fonctions\.js/);
  assert.doesNotMatch(etape, /secrets\./);
});
