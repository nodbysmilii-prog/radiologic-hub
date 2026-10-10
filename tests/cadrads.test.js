/* Tests CAD-RADS 2.0, score calcique et schéma de l'arbre coronaire — cas fictifs, aucune donnée patient. */
const test = require('node:test');
const assert = require('node:assert/strict');
const CA = require('../regles/cadrads.js');
const CO = require('../schemas/coronaires.js');

const L = (seg, grade, extra = {}) => ({ seg: String(seg), grade, plaque: 'calcifiee', hrp: {}, ...extra });

test('CAD-RADS : catégorie selon la sténose maximale', () => {
  assert.equal(CA.evaluer({}).cat, '0');
  assert.equal(CA.evaluer({ cac: 0 }).code, 'CAD-RADS 0');
  assert.equal(CA.evaluer({ lesions: [L(6, '0')] }).cat, '1', 'plaque sans sténose = 1');
  assert.equal(CA.evaluer({ lesions: [L(6, '1-24')] }).cat, '1');
  assert.equal(CA.evaluer({ lesions: [L(6, '1-24'), L(2, '25-49')] }).cat, '2');
  assert.equal(CA.evaluer({ lesions: [L(11, '50-69')] }).cat, '3');
  assert.equal(CA.evaluer({ lesions: [L(7, '70-99'), L(2, '70-99')] }).cat, '4A', 'deux territoires');
  assert.equal(CA.evaluer({ lesions: [L(1, '100'), L(5, '50-69')] }).cat, '5', 'l\'occlusion prime');
});

test('CAD-RADS 4B : tronc commun ≥ 50 % ou tritronculaire ≥ 70 %', () => {
  const tc = CA.evaluer({ lesions: [L(5, '50-69')] });
  assert.equal(tc.cat, '4B');
  assert.equal(tc.tc, true);
  assert.equal(CA.evaluer({ lesions: [L(5, '25-49')] }).cat, '2', 'tronc commun < 50 %');
  const tri = CA.evaluer({ lesions: [L(6, '70-99'), L(13, '70-99'), L(2, '70-99')] });
  assert.equal(tri.cat, '4B');
  assert.equal(tri.tri, true);
  assert.equal(CA.evaluer({ lesions: [L(6, '70-99'), L(9, '70-99'), L(2, '70-99')] }).cat, '4A', 'IVA et diagonale = un seul territoire');
});

test('CAD-RADS : segment non analysable (N)', () => {
  assert.equal(CA.evaluer({ lesions: [L(13, 'nd'), L(6, '25-49')] }).code, 'CAD-RADS N/P1');
  const n3 = CA.evaluer({ lesions: [L(13, 'nd'), L(6, '50-69')] });
  assert.equal(n3.cat, '3');
  assert.equal(n3.code, 'CAD-RADS 3/P1/N', 'N après la charge en plaque si sténose ≥ 50 %');
});

test('CAD-RADS : charge en plaque, HRP et modificateurs dans l\'ordre', () => {
  assert.equal(CA.chargePlaque(50).code, 'P1');
  assert.equal(CA.chargePlaque(150).code, 'P2');
  assert.equal(CA.chargePlaque(301).code, 'P3');
  assert.equal(CA.chargePlaque(999).code, 'P3');
  assert.equal(CA.chargePlaque(1000).code, 'P4');
  assert.equal(CA.chargePlaque(null, 3).code, 'P2', 'par le nombre de segments atteints');
  assert.equal(CA.chargePlaque(0, 0), null);
  assert.equal(CA.chargePlaque(80, 6).code, 'P3', 'la plus élevée des deux méthodes');
  const hrp = { remodelage: true, hypodense: true };
  const r = CA.evaluer({ cac: 150, ischemie: 'I+', pontage: true, exception: 'dissection', lesions: [L(7, '70-99', { hrp, stent: true })] });
  assert.equal(r.code, 'CAD-RADS 4A/P2/HRP/I+/S/G/E');
  assert.equal(CA.evaluer({ lesions: [L(7, '25-49', { hrp: { remodelage: true } })] }).hrp, false, 'un seul critère ne suffit pas');
  assert.match(CA.evaluer({ cac: 1500, lesions: [L(6, '25-49')] }).conduite, /renforcés/, 'CAD-RADS 2 avec P4');
  assert.match(CA.evaluer({ ischemie: 'I+', lesions: [L(6, '50-69')] }).conduite, /coronarographie/i);
});

test('CAD-RADS : score calcique positif sans lésion décrite → au moins 1', () => {
  assert.equal(CA.evaluer({ cac: 12 }).cat, '1');
  assert.equal(CA.evaluer({ cac: 12 }).P.code, 'P1');
});

test('Score calcique d\'Agatston : classes', () => {
  assert.equal(CA.agatston(0).classe, '0');
  assert.equal(CA.agatston(8).classe, '1-10');
  assert.equal(CA.agatston(100).classe, '11-100');
  assert.equal(CA.agatston(400).classe, '101-400');
  assert.equal(CA.agatston(2500).classe, '> 400');
  assert.equal(CA.agatston(''), null);
  assert.equal(CA.agatston('120,5').classe, '101-400', 'virgule décimale');
});

test('Dominance : segments présents', () => {
  const d = CA.segmentsPresents('droite'), g = CA.segmentsPresents('gauche'), c = CA.segmentsPresents('codominance');
  assert.ok(d.includes(4) && d.includes(16) && !d.includes(15) && !d.includes(18));
  assert.ok(g.includes(15) && g.includes(18) && !g.includes(4) && !g.includes(16));
  assert.ok(c.includes(4) && c.includes(18) && !c.includes(15) && !c.includes(16));
  assert.ok(!d.includes(17) && CA.segmentsPresents('droite', true).includes(17), 'bissectrice si présente');
  for (const dom of ['droite', 'gauche', 'codominance']) assert.deepEqual(CO.segments(dom).slice().sort((a, b) => a - b), CA.segmentsPresents(dom), `schéma et règles cohérents (${dom})`);
});

test('Schéma coronaire : SVG valide pour chaque dominance', () => {
  for (const dom of ['droite', 'gauche', 'codominance']) {
    const svg = CO.svg({ dominance: dom, live: true, lesions: [{ seg: 6, couleur: '#a8172d' }, { seg: 13, couleur: '#f2ab2f' }], actif: 0 });
    assert.match(svg, /^<svg/);
    assert.doesNotMatch(svg, /NaN|undefined/);
    assert.equal((svg.match(/data-seg="/g) || []).length, CA.segmentsPresents(dom).length, 'un segment cliquable par segment présent');
    assert.match(svg, new RegExp(CO.ETIQUETTES[dom].toUpperCase()));
  }
  // La 2e marginale part bien de la circonflexe, quelle que soit la dominance
  for (const dom of ['droite', 'gauche', 'codominance']) {
    const p = CO.position(14, dom, 0, 1), q = CO.position(13, dom, 0, 1);
    assert.ok(p && q && Math.hypot(p[0] - q[0], p[1] - q[1]) < 90);
  }
  assert.equal(CO.position(99, 'droite'), null);
});
