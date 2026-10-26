/* Tests de la fiche « Otospongiose » (fiches/otospongiose.html), des règles
   (regles/otospongiose.js) et des schémas (fiches/oreille/otospongiose-schemas.js).
   Lancer : npm test   (ou : node --test tests/otospongiose.test.js) */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const R = require('../regles/otospongiose.js');
const O = require('../fiches/oreille/otospongiose-schemas.js');
const RACINE = path.join(__dirname, '..');
const HTML = fs.readFileSync(path.join(RACINE, 'fiches', 'otospongiose.html'), 'utf8');

test('classification de Veillon : le type le plus étendu l\'emporte', () => {
  assert.equal(R.veillon({ platine: true }), '1A');
  assert.equal(R.veillon({ prestapedien: 0.8 }), '1B');
  assert.equal(R.veillon({ prestapedien: 2 }), '2');
  assert.equal(R.veillon({ prestapedien: 2, contactCochlee: true }), '3');
  assert.equal(R.veillon({ prestapedien: 2, pericochleaire: true }), '4A');
  assert.equal(R.veillon({ pericochleaire: true, vestibulaire: true }), '4B');
  assert.equal(R.veillon({}), null);
});

test('fenêtre ovale, canal facial, compte rendu', () => {
  assert.equal(R.fenetreOvale(1.2).etat, 'etroite');
  assert.equal(R.fenetreOvale('1,45').etat, 'limite');
  assert.equal(R.fenetreOvale(1.6).etat, 'normale');
  assert.equal(R.facialProcident(-1), true); assert.equal(R.facialProcident(1), false);
  const r = R.compteRendu({ cote: 'gauche', type: '3', fraysse: 3, fenetre: '1,2', procident: true, stapedienne: true, enclume: true, controlateral: true });
  const t = r.resultats.join(' ');
  assert.match(t, /Foyer d'otospongiose à gauche, type 3 de Veillon/);
  assert.match(t, /grade 3 de Fraysse \(obstruction complète\), à signaler/);
  assert.match(t, /étroit/); assert.match(t, /procident/); assert.match(t, /Artère stapédienne/);
  assert.equal(r.conclusion, 'Otospongiose gauche de type 3 de Veillon, fenêtre ronde atteinte (grade 3), bilatérale.');
  assert.match(R.compteRendu({}).resultats[0], /infraradiologique/);
});

test('schémas SVG', () => {
  for (const t of [null, '1A', '1B', '2', '3', '4A', '4B']) assert.match(O.capsule(t, { endoste: true }), /^<svg[\s\S]*<\/svg>$/);
  for (const g of [1, 2, 3, 4]) assert.match(O.fenetreRonde(g), /<svg/);
  assert.match(O.coronal(-1), /procident/); assert.doesNotMatch(O.coronal(1), />procident</);
  assert.match(O.audiogramme(false), /encoche de Carhart/);
});

test('fiche : sections, coupes de 0,5 mm, sans image, scripts, carte', () => {
  for (const id of ['essentiel', 'clinique', 'technique', 'veillon', 'fraysse', 'formes', 'preop', 'differentiels', 'post-op', 'compte-rendu', 'testez-vous'])
    assert.ok(HTML.includes(`id="${id}"`), id);
  assert.match(HTML, /0,5 mm/); assert.doesNotMatch(HTML, /0,2-0,5|0,5-0,6/);
  assert.doesNotMatch(HTML.slice(HTML.indexOf('<main>'), HTML.indexOf('</main>')), /<img /, 'pas de cliché pour l\'instant');
  for (const s of ['../regles/otospongiose.js', 'oreille/otospongiose-schemas.js', 'oreille/otospongiose-fiche.js']) assert.ok(HTML.includes(`<script src="${s}?v=`), s);
  assert.equal((HTML.match(/<body/g) || []).length, 1);
  assert.match(fs.readFileSync(path.join(RACINE, 'fiches-rapides.html'), 'utf8'), /<a class="fiche-card" data-spe="orl" href="fiches\/otospongiose\.html"/);
});
