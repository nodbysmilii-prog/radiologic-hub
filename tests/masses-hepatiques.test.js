/* Tests de la fiche « Masses hépatiques solides » (fiches/masses-hepatiques.html)
   et des règles (regles/masses-hepatiques.js).
   Lancer : npm test   (ou : node --test tests/masses-hepatiques.test.js) */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const R = require('../regles/masses-hepatiques.js');
const RACINE = path.join(__dirname, '..');
const HTML = fs.readFileSync(path.join(RACINE, 'fiches', 'masses-hepatiques.html'), 'utf8');

test('LI-RADS : tableau taille / HRPA / critères majeurs, case par case', () => {
  const att = {
    // [taille, HRPA non périphérique ?, nb de critères majeurs] → catégorie
    'sans<20': [[15, false], ['LR-3', 'LR-3', 'LR-4']],
    'sans>=20': [[25, false], ['LR-3', 'LR-4', 'LR-4']],
    'hrpa<10': [[8, true], ['LR-3', 'LR-4', 'LR-4']],
    'hrpa10-19': [[12, true], ['LR-3', 'LR-4', 'LR-5']],
    'hrpa>=20': [[30, true], ['LR-4', 'LR-4', 'LR-5']],
  };
  const critere = ['capsule', 'washout'];
  for (const [nom, [[t, h], attendu]] of Object.entries(att)) {
    [0, 1, 2].forEach(n => {
      assert.equal(R.lirads(t, h, critere.slice(0, n)).categorie, attendu[n], `${nom}, ${n} critère(s)`);
    });
  }
});

test('LI-RADS : bornes de taille et astérisque (croissance)', () => {
  assert.equal(R.lirads(19, false, []).colonne, '<20');
  assert.equal(R.lirads(20, false, []).colonne, '>=20');
  assert.equal(R.lirads(9, true, []).colonne, '<10');
  assert.equal(R.lirads(10, true, []).colonne, '10-19');
  assert.equal(R.lirads(19, true, []).colonne, '10-19');
  assert.equal(R.lirads(20, true, []).colonne, '>=20');
  // HRPA non périphérique ≥ 20 mm + un critère majeur : LR-5 si croissance, sinon LR-4
  assert.equal(R.lirads(25, true, ['croissance']).categorie, 'LR-5');
  assert.equal(R.lirads(25, true, ['capsule']).categorie, 'LR-4');
  assert.equal(R.lirads(25, true, ['capsule']).note, 'LR-5 si un critère de croissance significative est associé, sinon LR-4.');
  assert.equal(R.lirads(25, true, ['capsule', 'washout']).categorie, 'LR-5');
  // critères inconnus et doublons ignorés ; taille absente ou nulle
  assert.equal(R.lirads(25, true, ['capsule', 'capsule', 'bidon']).criteresMajeurs, 1);
  assert.equal(R.lirads('', true, []), null);
  assert.equal(R.lirads(0, false, []), null);
  assert.equal(R.lirads('2,5', false, []).colonne, '<20');
});

test('LI-RADS : catégories et conduite à retenir', () => {
  assert.deepEqual(Object.keys(R.CATEGORIES_LIRADS), ['LR-NC', 'LR-1', 'LR-2', 'LR-3', 'LR-4', 'LR-5', 'LR-M', 'LR-TIV']);
  assert.equal(R.CATEGORIES_LIRADS['LR-5'].sens, 'CHC certain');
  assert.equal(R.CATEGORIES_LIRADS['LR-3'].retenir, 'TDM/IRM à 3–6 mois');
  assert.equal(R.lirads(30, true, ['washout', 'capsule']).retenir, 'Diagnostic de CHC → prise en charge');
});

test('HNF typique : cinq critères, hépatopathie sous-jacente', () => {
  assert.equal(R.CRITERES_HNF.length, 5);
  const tous = R.CRITERES_HNF.map(c => c.id);
  assert.equal(R.hnf(tous, false).cle, 'typique');
  assert.equal(R.hnf(tous.slice(0, 4), false).cle, 'non');
  assert.match(R.hnf(tous.slice(0, 4), false).texte, /suspecte d'adénome/);
  assert.equal(R.hnf([], false).titre, '');
  assert.equal(R.hnf(tous, true).cle, 'hepatopathie');
});

test('CAT hyperéchogène : cinq contextes', () => {
  assert.deepEqual(Object.keys(R.CONTEXTES), ['sain', 'steatose', 'risque', 'cancer', 'contraception']);
  Object.values(R.CONTEXTES).forEach(c => { assert.ok(c.nom && c.texte && c.niveau); });
  for (const k of Object.keys(R.CONTEXTES)) assert.match(HTML, new RegExp(`data-contexte="${k}"`), k);
});

test('Bismuth et Corlette : extension croissante', () => {
  assert.deepEqual(Object.keys(R.BISMUTH), ['I', 'II', 'IIIa', 'IIIb', 'IV']);
  assert.deepEqual(R.BISMUTH.I.atteint, ['chc']);
  assert.ok(!R.BISMUTH.II.atteint.includes('droit') && !R.BISMUTH.II.atteint.includes('gauche'));
  assert.ok(R.BISMUTH.IIIa.atteint.includes('droit') && !R.BISMUTH.IIIa.atteint.includes('gauche'));
  assert.ok(R.BISMUTH.IIIb.atteint.includes('gauche') && !R.BISMUTH.IIIb.atteint.includes('droit'));
  assert.ok(R.BISMUTH.IV.atteint.includes('droit') && R.BISMUTH.IV.atteint.includes('gauche'));
  for (const k of Object.keys(R.BISMUTH)) assert.match(HTML, new RegExp(`data-bismuth="${k}"`), k);
});

test('tableau final et entraînement : cohérents', () => {
  assert.equal(Object.keys(R.LESIONS).length, 9);
  Object.values(R.LESIONS).forEach(l => assert.ok(R.CATEGORIES[l.categorie]));
  assert.equal(R.CAS.length, 9);
  R.CAS.forEach(c => { assert.ok(R.CHOIX[c.rep], c.rep); assert.ok(c.texte && c.pourquoi); });
  // chaque lésion est demandée une fois
  assert.deepEqual(R.CAS.map(c => c.rep).sort(), Object.keys(R.LESIONS).sort());
  // chaque ligne du tableau final de la fiche existe
  for (const k of Object.keys(R.LESIONS)) assert.match(HTML, new RegExp(`data-lesion="${k}"`), k);
});

test('fiche : sections, code couleur, carte de l\'index, scripts', () => {
  for (const id of ['introduction', 'pseudolesions', 'exploration', 'benignes', 'primitives', 'secondaires', 'reconnaissance', 'cat', 'testez-vous']) {
    assert.match(HTML, new RegExp(`<section class="fsec" id="${id}"`), id);
  }
  for (const k of ['tech', 'sign', 'grave', 'ddx', 'key']) assert.match(HTML, new RegExp(`data-k="${k}"`), k);
  assert.match(HTML, /regles\/masses-hepatiques\.js\?v=/);
  assert.match(HTML, /digestif\/foie-fiche\.js\?v=/);
  assert.match(fs.readFileSync(path.join(RACINE, 'fiches-rapides.html'), 'utf8'), /<a class="fiche-card" data-spe="digestif" href="fiches\/masses-hepatiques\.html"/);
});
