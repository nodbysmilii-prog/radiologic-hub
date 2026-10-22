/* Tests de l'index d'obstruction de Qanadli — cas fictifs, aucune donnée patient. */
const test = require('node:test');
const assert = require('node:assert/strict');
const Q = require('../regles/qanadli.js');

test('Qanadli : 20 artères segmentaires, 10 par poumon', () => {
  assert.equal(Q.SEGMENTS.length, 20);
  assert.equal(Q.SEGMENTS.filter(s => s.cote === 'D').length, 10);
});

test('Qanadli : score et index', () => {
  const r0 = Q.evaluer({});
  assert.equal(r0.score, 0);
  assert.equal(Q.conclusion(r0), 'Absence d\'embolie pulmonaire.');
  const r1 = Q.evaluer({ segments: { d8: 2, d9: 1 } });
  assert.equal(r1.score, 3);
  assert.equal(r1.index, 7.5);
  assert.equal(Q.conclusion(r1), 'Embolie pulmonaire droite segmentaire, index d\'obstruction de Qanadli à 7,5 % (3/40).');
  const r2 = Q.evaluer({ segments: { g4: 's' } });
  assert.equal(r2.score, 1, 'sous-segmentaire = obstruction partielle');
  assert.match(Q.conclusion(r2), /gauche sous-segmentaire/);
});

test('Qanadli : un embole proximal compte pour toutes les artères d\'aval', () => {
  const r = Q.evaluer({ proximaux: { apd: 2 } });
  assert.equal(r.score, 20);
  assert.equal(r.index, 50);
  assert.ok(r.severe);
  assert.equal(Q.texte(r), 'Index d\'obstruction artérielle pulmonaire de Qanadli : 20/40, soit 50 % (≥ 40 %).');
  assert.equal(Q.evaluer({ proximaux: { tronc: 2 } }).score, 40);
  const r2 = Q.evaluer({ proximaux: { lid: 1 }, segments: { d8: 2, g7: 1 } });
  assert.equal(r2.score, 7, 'lobaire partielle (5 × 1) + segment total (+1) + gauche (1)');
  assert.equal(Q.conclusion(r2), 'Embolie pulmonaire bilatérale lobaire, index d\'obstruction de Qanadli à 17,5 % (7/40).');
});
