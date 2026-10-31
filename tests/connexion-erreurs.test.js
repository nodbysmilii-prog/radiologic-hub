/* connexion.js : messages d'erreur compréhensibles en français et verrou anti-double soumission
   (Remplacements, Communauté, administration de la Bibliothèque). Navigateur simulé (vm). */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function charger({ enLigne = true } = {}) {
  const window = {};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'connexion.js'), 'utf8'), {
    window, navigator: { onLine: enLigne }, localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    location: { search: '', hash: '', pathname: '/' }, history: { replaceState() {} }, URLSearchParams,
  });
  return window.RHConnexion;
}

test('messageErreur : erreurs techniques → français ; messages du site gardés', () => {
  const C = charger();
  const cas = [
    [new TypeError('Failed to fetch'), /Connexion impossible/],
    [{ message: 'JWT expired', code: 'PGRST301' }, /session a expiré/],
    [{ message: 'new row violates row-level security policy for table "rs_cas"', code: '42501' }, /non autorisée/],
    [{ message: 'permission denied for function rp_statistiques' }, /non autorisée/],
    [{ message: 'duplicate key value violates unique constraint "bib_articles_doi_key"', code: '23505' }, /existe déjà/],
    [{ message: 'new row for relation "rs_cas" violates check constraint "rs_cas_type_check"', code: '23514' }, /pas valides/],
    [{ message: 'canceling statement due to statement timeout', code: '57014' }, /ne répond pas/],
    [{ message: 'email rate limit exceeded', status: 429 }, /Trop de demandes/],
    [{ message: 'Internal Server Error', status: 500 }, /momentanément indisponible/],
    [new Error('Unexpected token < in JSON at position 0'), /Une erreur est survenue/],
    [null, /Une erreur est survenue/],
  ];
  for (const [e, attendu] of cas) assert.match(C.messageErreur(e), attendu, JSON.stringify(e && e.message));
  for (const m of ['Cet article est déjà dans la bibliothèque (même DOI, PMID ou PMCID).', 'Indiquez le nom.', 'Le fichier dépasse 5 Mo.', 'Lien invalide.'])
    assert.equal(C.messageErreur(new Error(m)), m);
});

test('messageErreur : hors connexion, toujours le message de connexion impossible', () => {
  assert.match(charger({ enLigne: false }).messageErreur(new Error('quelconque')), /Connexion impossible/);
});

test('verrouiller : un seul envoi à la fois, boutons désactivés puis rétablis, même en cas d\'erreur', async () => {
  const C = charger();
  const bouton = { disabled: false, setAttribute() {}, removeAttribute() {} };
  const deja = { disabled: true, setAttribute() {}, removeAttribute() {} };
  const form = { dataset: {}, matches: s => s === 'form', querySelectorAll: () => [bouton, deja] };
  let appels = 0, liberer;
  const action = () => { appels++; return new Promise(r => { liberer = r; }); };
  const premier = C.verrouiller(form, action);
  assert.equal(bouton.disabled, true);
  assert.equal(await C.verrouiller(form, action), undefined, 'deuxième envoi ignoré');
  assert.equal(appels, 1);
  liberer('fait');
  assert.equal(await premier, 'fait');
  assert.equal(bouton.disabled, false);
  assert.equal(deja.disabled, true, 'un bouton déjà désactivé le reste');
  await assert.rejects(C.verrouiller(form, async () => { throw new Error('échec'); }));
  assert.equal(bouton.disabled, false);
  assert.equal(form.dataset.rhOccupe, undefined, 'verrou levé après une erreur');
});
