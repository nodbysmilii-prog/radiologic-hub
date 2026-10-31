/* Abonnements : client d'accès aux contenus réservés (abonnements/acces.js), avec un faux client
   Supabase : erreurs claires (connexion, abonnement, limite, introuvable, réseau), mémoire de page,
   URL signée courte. La vraie vérification (base) est testée par tests/sql/rls-abonnements-acces.js.
   Lancer : npm test */
const test = require('node:test');
const assert = require('node:assert/strict');
const P = require('../abonnements/acces.js');

const faux = ({ connecte = true, rpc = {}, signee } = {}) => {
  const appels = [];
  return {
    appels,
    auth: { getSession: async () => ({ data: { session: connecte ? { user: { id: 'u' } } : null } }) },
    rpc: async (nom, args) => { appels.push(nom); const r = rpc[nom]; if (r instanceof Error) throw r; return r || { data: null, error: null }; },
    storage: { from: b => ({ createSignedUrl: async (c, d) => { appels.push(`${b}:${c}:${d}`); return signee || { data: { signedUrl: 'https://exemple/signee' }, error: null }; } }) },
  };
};

test('non connecté : aucun appel au serveur, erreur « connexion »', async () => {
  const sb = faux({ connecte: false });
  const p = P.creer(sb);
  assert.equal(await p.estAbonne(), false);
  await assert.rejects(p.lire('x'), e => e.code === 'connexion');
  await assert.rejects(p.urlFichier('a.jpg'), e => e.code === 'connexion');
  assert.deepEqual(sb.appels, []);
});

test('refus de la base traduits : abonnement requis, limite, introuvable, réseau', async () => {
  const cas = [
    [{ data: null, error: { code: '42501', message: 'abonnement requis' } }, 'abonnement'],
    [{ data: null, error: { code: '54000', message: 'trop de lectures' } }, 'limite'],
    [{ data: [], error: null }, 'introuvable'],
    [new Error('réseau'), 'indisponible'],
  ];
  for (const [r, code] of cas) await assert.rejects(P.creer(faux({ rpc: { ab_lire_contenu: r } })).lire('x'), e => e.code === code && e.message === P.MESSAGES[code]);
});

test('abonné : contenu servi une fois puis gardé en mémoire de page ; oublier() vide la mémoire', async () => {
  const sb = faux({ rpc: { ab_est_abonne: { data: true, error: null }, ab_lire_contenu: { data: [{ id: 'cr', module: 'comptes-rendus', titre: 'T', contenu_json: { texte: 'fictif' }, version: 2 }], error: null } } });
  const p = P.creer(sb);
  assert.equal(await p.estAbonne(), true);
  assert.deepEqual(await p.lire('cr'), { id: 'cr', module: 'comptes-rendus', titre: 'T', contenu: { texte: 'fictif' }, version: 2 });
  await p.lire('cr');
  assert.equal(sb.appels.filter(a => a === 'ab_lire_contenu').length, 1);
  p.oublier(); await p.lire('cr');
  assert.equal(sb.appels.filter(a => a === 'ab_lire_contenu').length, 2);
});

test('service indisponible : estAbonne() rend null (« inconnu »), jamais « non abonné »', async () => {
  assert.equal(await P.creer(faux({ rpc: { ab_est_abonne: new Error('réseau') } })).estAbonne(), null);
  assert.equal(await P.creer(faux({ rpc: { ab_est_abonne: { data: null, error: { message: 'Service Unavailable' } } } })).estAbonne(), null);
  assert.equal(await P.creer(faux({ rpc: { ab_est_abonne: { data: false, error: null } } })).estAbonne(), false);
  await assert.rejects(P.creer(faux({ rpc: { ab_lire_contenu: { data: null, error: { code: 'P0002', message: 'contenu introuvable' } } } })).lire('../x'), e => e.code === 'introuvable');
});

test('fichiers : URL signée de 5 minutes du stockage « premium » ; refus traduit', async () => {
  const sb = faux();
  assert.equal(await P.creer(sb).urlFichier('atlas/a.jpg'), 'https://exemple/signee');
  assert.ok(sb.appels.includes('premium:atlas/a.jpg:300'));
  await assert.rejects(P.creer(faux({ signee: { data: null, error: { message: 'Object not found' } } })).urlFichier('x'), e => e.code === 'introuvable');
  await assert.rejects(P.creer(faux({ signee: { data: null, error: { message: 'new row violates' } } })).urlFichier('x'), e => e.code === 'abonnement');
});
