/* Tests des critères IRM de McDonald 2017 (regles/mcdonald.js), d'après la fiche SEP de l'auteur.
   Lancer : npm test   (ou : node --test tests/mcdonald.test.js) */
const test = require('node:test');
const assert = require('node:assert/strict');
const { evaluer, LOCALISATIONS } = require('../regles/mcdonald.js');

test('4 localisations typiques', () => {
  assert.deepEqual(Object.keys(LOCALISATIONS), ['juxtacorticale', 'periventriculaire', 'infratentorielle', 'medullaire']);
});

test('DIS : au moins une lésion dans 2 des 4 localisations', () => {
  assert.equal(evaluer({ lieux: [] }).dis, false);
  assert.equal(evaluer({ lieux: ['periventriculaire'] }).dis, false);
  assert.equal(evaluer({ lieux: ['periventriculaire', 'periventriculaire'] }).dis, false, 'une localisation comptée une fois');
  assert.equal(evaluer({ lieux: ['periventriculaire', 'medullaire'] }).dis, true);
  assert.equal(evaluer({ lieux: ['juxtacorticale', 'infratentorielle', 'medullaire'] }).nbLieux, 3);
  assert.equal(evaluer({ lieux: ['inconnue', 'medullaire'] }).dis, false);
});

test('DIT : rehaussement simultané, nouvelle lésion, ou bandes oligoclonales après un premier événement', () => {
  assert.equal(evaluer({}).dit, false);
  assert.equal(evaluer({ gdSimultane: true }).dit, true);
  assert.equal(evaluer({ nouvelleLesion: true }).dit, true);
  assert.equal(evaluer({ bandes: true }).dit, false, 'bandes sans premier événement clinique');
  assert.equal(evaluer({ bandes: true }).bandesSansCis, true);
  assert.equal(evaluer({ bandes: true, premierEvenement: true }).dit, true);
  assert.deepEqual(evaluer({ gdSimultane: true, nouvelleLesion: true }).raisonsDit.length, 2);
});

test('conclusion', () => {
  const ok = evaluer({ lieux: ['periventriculaire', 'infratentorielle'], gdSimultane: true });
  assert.equal(ok.criteres, true);
  assert.match(ok.conclusion, /critères de McDonald 2017 remplis/);
  assert.match(evaluer({ lieux: ['periventriculaire', 'medullaire'] }).conclusion, /DIT non démontrée/);
  assert.match(evaluer({ nouvelleLesion: true }).conclusion, /DIS non démontrée/);
  assert.equal(evaluer({}).conclusion, 'Ni DIS ni DIT démontrées.');
});
