/* Tests de la fiche « Sclérose en plaques : l'imagerie » (fiches/sclerose-en-plaques.html) et du schéma
   des localisations (schemas/sep.js) : 9 parties, schéma complet et schéma du vérificateur McDonald,
   zones du schéma = localisations de McDonald 2017, carte dans Fiches rapides › Neuro.
   Lancer : npm test   (ou : node --test tests/sclerose-en-plaques.test.js) */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const RACINE = path.join(__dirname, '..');
const HTML = fs.readFileSync(path.join(RACINE, 'fiches', 'sclerose-en-plaques.html'), 'utf8');
const texte = HTML.replace(/<[^>]+>/g, ' ').replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&').replace(/\s+/g, ' ');
const { LOCALISATIONS } = require('../regles/mcdonald.js');

test('9 parties dans l\'ordre, sommaire, scripts', () => {
  const ids = ['introduction', 'epidemiologie', 'localisation', 'clinique', 'semiologie', 'mcdonald', 'protocole', 'diffusion', 'pronostic'];
  const titres = [...HTML.matchAll(/<section class="fsec" id="([a-z-]+)"/g)].map(m => m[1]);
  assert.deepEqual(titres, [...ids, 'testez-vous']);
  for (const id of ids) assert.match(HTML, new RegExp(`<li><a href="#${id}"`));
  for (const f of ['schemas/sep.js', 'regles/mcdonald.js', 'outils/mcdonald.js', 'schemas/sep.css'])
    assert.match(HTML, new RegExp(f.replace('.', '\\.') + '\\?v=\\d+'), f);
});

test('chiffres et signes clés du cours', () => {
  for (const t of ['3 femmes pour 1 homme', '20 et 40 ans', '50 %', '80 %', '75-90 %', '> 97 %', '0,1 mmol/kg', '5-15 min', '3D FLAIR recommandé pour l\'encéphale', '2 des 4',
    '« crête de coq »', '« cible » ou « cocarde »', '« Coup d\'ongle » (open ring)', 'ophtalmoplégie internucléaire', 'STIR sagittal'])
    assert.ok(texte.includes(t), t);
  for (const t of ['60 %', '0,2 mmol/kg', 'peut compter pour plusieurs localisations'])
    assert.ok(!texte.includes(t), 'corrigé à la demande de l\'auteur : ' + t);
});

test('schéma : un complet (légende), un pour le vérificateur ; ses 4 zones DIS = localisations de McDonald', () => {
  assert.equal((HTML.match(/<div data-sep-schema><\/div>/g) || []).length, 1);
  assert.equal((HTML.match(/<div data-sep-schema="mcdonald"><\/div>/g) || []).length, 1);
  const ctx = { window: {}, document: { querySelectorAll: () => [] } };
  vm.runInNewContext(fs.readFileSync(path.join(RACINE, 'schemas', 'sep.js'), 'utf8'), ctx);
  const zones = JSON.parse(JSON.stringify(ctx.window.RHSchemaSEP.ZONES));
  assert.deepEqual(zones.map(z => z.n), [1, 2, 3, 4, 5, 6]);
  assert.deepEqual(zones.filter(z => z.dis).map(z => z.id).sort(), Object.keys(LOCALISATIONS).sort());
  const cases = [...HTML.matchAll(/name="lieu" value="([a-z]+)"/g)].map(m => m[1]);
  assert.deepEqual(cases.sort(), Object.keys(LOCALISATIONS).sort());
});

test('carte dans Fiches rapides › Neuro', () => {
  const index = fs.readFileSync(path.join(RACINE, 'fiches-rapides.html'), 'utf8');
  assert.match(index, /<a class="fiche-card" data-spe="neuro" href="fiches\/sclerose-en-plaques\.html"/);
});
