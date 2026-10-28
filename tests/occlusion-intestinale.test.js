/* Tests de la fiche « Imagerie de l'occlusion intestinale aiguë » (fiches/occlusion-intestinale.html)
   et des règles (regles/occlusion-intestinale.js).
   Lancer : npm test   (ou : node --test tests/occlusion-intestinale.test.js) */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const R = require('../regles/occlusion-intestinale.js');
const RACINE = path.join(__dirname, '..');
const HTML = fs.readFileSync(path.join(RACINE, 'fiches', 'occlusion-intestinale.html'), 'utf8');

test('diagnostic positif : grêle > 2,5 cm, côlon > 5 cm', () => {
  assert.equal(R.dilatation('grele', 25).dilate, false);
  assert.equal(R.dilatation('grele', '26').dilate, true);
  assert.equal(R.dilatation('colon', 50).dilate, false);
  assert.equal(R.dilatation('colon', '5,5e1').dilate, true);
  assert.equal(R.dilatation('colon', 60).seuil, 50);
  assert.equal(R.dilatation('x', 30), null);
  assert.equal(R.dilatation('grele', ''), null);
});

test('mécanisme, gravité, contraste', () => {
  assert.equal(R.mecanisme({ disparite: true, zt: true }).cle, 'mecanique');
  assert.equal(R.mecanisme({ diffuse: true, nha: 'peu' }).cle, 'fonctionnelle');
  assert.equal(R.mecanisme({ diffuse: true, nha: 'peu', zt: true }).cle, 'mecanique');
  assert.equal(R.mecanisme({}), null);
  assert.equal(R.gravite(1).chirurgie, false);
  assert.equal(R.gravite(2).chirurgie, true);
  assert.equal(R.gravite(3).texte, '2 ou 3 signes = chirurgie !!!');
  assert.equal(R.GRAVITE.length, 3);
  assert.deepEqual(R.contraste(80), { min: 120, max: 160, debit: '2-4cc/s' });
  assert.equal(R.contraste(0), null);
});

test('questions, entraînement', () => {
  assert.equal(R.QUESTIONS.length, 5);
  for (const q of R.QUESTIONS) assert.ok(HTML.includes(`id="${q.ancre}"`), q.ancre);
  assert.equal(R.CAS.length, 8);
  for (const c of R.CAS) assert.ok(R.CHOIX[c.rep], c.texte);
  for (const k of Object.keys(R.CHOIX)) assert.ok(R.CAS.some(c => c.rep === k), k);
});

test('fiche : sections, lexique de l\'auteur, onglets, scripts, carte', () => {
  for (const id of ['introduction', 'physiopathologie', 'clinique', 'exploration', 'positif', 'mecanisme', 'topographie', 'etiologie-grele', 'gravite', 'colon', 'testez-vous'])
    assert.ok(HTML.includes(`id="${id}"`), id);
  for (const t of ['Urgence médico-chirurgicale pouvant mettre en jeu le pronostic vital', 'Acquisition abdomino-pelvienne au temps portal (70s)', '&gt; 2,5cm pour les anses',
    'OIA à anse fermée (closed-Loop)', '2 ou 3 signes = chirurgie !!!', 'Hyperdensité spontanée : spécificité de 100% de nécrose en association avec closed-loop',
    'ADK colique : 70% des causes d\'OIA colique', 'Risque de perforation caecale', '1 seule zone transitionnelle en « Bec »'])
    assert.ok(HTML.includes(t), t);
  // chaque onglet a son panneau
  for (const [, k] of HTML.matchAll(/data-onglet="([a-z]+)"/g)) assert.ok(HTML.includes(`data-panneau="${k}"`), k);
  for (const s of ['../regles/occlusion-intestinale.js', 'digestif/oia-fiche.js']) assert.ok(HTML.includes(`<script src="${s}?v=`), s);
  assert.equal((HTML.match(/<body/g) || []).length, 1);
  assert.match(fs.readFileSync(path.join(RACINE, 'fiches-rapides.html'), 'utf8'), /<a class="fiche-card" data-spe="digestif" href="fiches\/occlusion-intestinale\.html"/);
});
