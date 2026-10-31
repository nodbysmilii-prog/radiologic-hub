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

/* Référence ACR CT/MRI LI-RADS v2018 (logique validée par l'auteur le 31/10/2026), écrite à part
   des règles : [HRPA non périphérique ?, taille représentative] → catégorie pour chaque combinaison
   de critères majeurs. Clés : A = aucun, C = capsule seule, W = wash-out seul, G = croissance seule,
   CW, CG, WG, CWG = deux critères ou plus. */
const REF = {
  'sans <20':  { A: 'LR-3', C: 'LR-3', W: 'LR-3', G: 'LR-3', CW: 'LR-4', CG: 'LR-4', WG: 'LR-4', CWG: 'LR-4' },
  'sans >=20': { A: 'LR-3', C: 'LR-4', W: 'LR-4', G: 'LR-4', CW: 'LR-4', CG: 'LR-4', WG: 'LR-4', CWG: 'LR-4' },
  'hrpa <10':  { A: 'LR-3', C: 'LR-4', W: 'LR-4', G: 'LR-4', CW: 'LR-4', CG: 'LR-4', WG: 'LR-4', CWG: 'LR-4' },
  'hrpa 10-19': { A: 'LR-3', C: 'LR-4', W: 'LR-5', G: 'LR-5', CW: 'LR-5', CG: 'LR-5', WG: 'LR-5', CWG: 'LR-5' },
  'hrpa >=20': { A: 'LR-4', C: 'LR-5', W: 'LR-5', G: 'LR-5', CW: 'LR-5', CG: 'LR-5', WG: 'LR-5', CWG: 'LR-5' },
};
const TAILLES = { 'sans <20': [1, 9, 15, 19.9], 'sans >=20': [20, 25, 80], 'hrpa <10': [1, 5, 9.9], 'hrpa 10-19': [10, 15, 19.9], 'hrpa >=20': [20, 25, 80] };
const ID = { C: 'capsule', W: 'washout', G: 'croissance' };
const critères = k => [...k].map(c => ID[c]);

test('LI-RADS ACR v2018 : les 5 colonnes × 8 combinaisons de critères majeurs × plusieurs tailles', () => {
  let n = 0;
  for (const [col, lignes] of Object.entries(REF)) {
    for (const taille of TAILLES[col]) {
      for (const [cle, attendu] of Object.entries(lignes)) {
        const r = R.lirads(taille, col.startsWith('hrpa'), cle === 'A' ? [] : critères(cle));
        assert.equal(r.categorie, attendu, `${col}, ${taille} mm, critères ${cle}`);
        n++;
      }
    }
  }
  assert.equal(n, 8 * (4 + 3 + 3 + 3 + 3));
});

test('LI-RADS : règles énoncées par l\'auteur (10-19 mm et ≥ 20 mm avec HRPA non périphérique)', () => {
  const L = (t, c) => R.lirads(t, true, c).categorie;
  assert.equal(L(15, ['capsule']), 'LR-4');                       // capsule rehaussée seule
  assert.equal(L(15, ['washout']), 'LR-5');                       // wash-out non périphérique
  assert.equal(L(15, ['croissance']), 'LR-5');                    // croissance seuil
  assert.equal(L(15, ['capsule', 'washout']), 'LR-5');            // deux critères ou plus
  assert.equal(L(15, ['capsule', 'washout', 'croissance']), 'LR-5');
  assert.equal(L(25, []), 'LR-4');                                // HRPA seule
  assert.equal(L(25, ['capsule']), 'LR-5');                       // au moins un critère majeur
  assert.equal(L(25, ['washout']), 'LR-5');
  assert.equal(L(25, ['croissance']), 'LR-5');
});

test('LI-RADS : bornes de taille, ligne du tableau, entrées invalides', () => {
  assert.equal(R.lirads(19, false, []).colonne, '<20');
  assert.equal(R.lirads(20, false, []).colonne, '>=20');
  assert.equal(R.lirads(9, true, []).colonne, '<10');
  assert.equal(R.lirads(10, true, []).colonne, '10-19');
  assert.equal(R.lirads(19, true, []).colonne, '10-19');
  assert.equal(R.lirads(20, true, []).colonne, '>=20');
  // ligne du tableau : 0 aucun, 1 capsule seule, 2 wash-out ou croissance seul, 3 deux critères ou plus
  assert.equal(R.lirads(15, true, []).ligne, 0);
  assert.equal(R.lirads(15, true, ['capsule']).ligne, 1);
  assert.equal(R.lirads(15, true, ['washout']).ligne, 2);
  assert.equal(R.lirads(15, true, ['croissance']).ligne, 2);
  assert.equal(R.lirads(15, true, ['capsule', 'croissance']).ligne, 3);
  // critères inconnus et doublons ignorés ; taille absente, nulle ou négative ; virgule décimale
  assert.equal(R.lirads(25, true, ['capsule', 'capsule', 'bidon']).criteresMajeurs, 1);
  assert.equal(R.lirads('', true, []), null);
  assert.equal(R.lirads(0, false, []), null);
  assert.equal(R.lirads(-3, true, []), null);
  assert.equal(R.lirads('2,5', false, []).colonne, '<20');
  // plus aucune case ambiguë (l'ancienne « LR-4 à LR-5* » n'existe plus)
  for (const g of Object.values(R.TABLE_LIRADS)) for (const col of Object.values(g)) col.forEach(c => assert.match(c, /^LR-[345]$/));
});

test('LI-RADS : le tableau affiché dans la fiche est identique aux règles', () => {
  const cellules = [...HTML.matchAll(/<td class="mh-lr-(\d)" data-h="(sans|hrpa)" data-col="([^"]*)" data-l="(\d)">([^<]*)<\/td>/g)];
  assert.equal(cellules.length, 5 * 4);
  for (const [, classe, h, col, l, texte] of cellules) {
    const colonne = col.replace('&lt;', '<').replace('&gt;', '>');
    const attendu = R.TABLE_LIRADS[h][colonne][+l];
    assert.equal(texte, attendu, `${h} ${colonne} ligne ${l}`);
    assert.equal(classe, attendu.slice(-1), `couleur de ${h} ${colonne} ligne ${l}`);
  }
  assert.doesNotMatch(HTML, /LR-4 à LR-5|sinon LR-4/);
});

test('LI-RADS : conditions d\'application et critères de croissance seuil', () => {
  assert.equal(R.CONDITIONS, 'S\'applique aux patients cirrhotiques ou à risque de CHC, en TDM/IRM injectée ; ne s\'applique pas au foie sain.');
  assert.ok(HTML.includes(R.CONDITIONS.replace(' ; ne s\'applique pas au foie sain.', '')), 'la fiche rappelle la population concernée');
  assert.match(HTML, /ne s'applique pas au foie sain/);
  assert.match(HTML, /TDM\/IRM injectée/);
  // la croissance seuil est un critère majeur à part entière, comme le wash-out et la capsule
  assert.deepEqual(R.CRITERES_MAJEURS.map(c => c.id), ['capsule', 'washout', 'croissance']);
  assert.match(R.CRITERES_MAJEURS[2].label, /Croissance supérieure au seuil/);
  assert.match(HTML, /<input type="checkbox" data-crit="croissance"> Croissance supérieure au seuil de progression/);
  // seuil de croissance de la fiche : ≥ 50 % en ≤ 6 mois (même seuil que l'éditeur)
  assert.match(HTML, /≥ 50 % en ≤ 6 mois/);
});

test('LI-RADS : la fiche et l\'éditeur de comptes rendus donnent la même catégorie dans tous les cas', () => {
  const { DEFS } = require('../regles/classifications.js');
  const editeur = DEFS.find(d => d.id === 'lirads');
  const tailles = [0.5, 1, 5, 9, 9.9, 10, 12, 15, 19, 19.9, 20, 25, 40, 100];
  let n = 0;
  for (const hrpa of [false, true]) {
    for (const t of tailles) {
      for (let masque = 0; masque < 8; masque++) {
        const crit = ['capsule', 'washout', 'croissance'].filter((_, i) => masque & (1 << i));
        const st = { ...editeur.init(), aphe: hrpa ? 'oui' : 'non', taille: String(t), capsule: crit.includes('capsule'), washout: crit.includes('washout'), croissance: crit.includes('croissance') };
        assert.equal(R.lirads(t, hrpa, crit).categorie, editeur.calcul(st).badge, `HRPA ${hrpa}, ${t} mm, ${crit.join('+') || 'aucun critère'}`);
        n++;
      }
    }
  }
  assert.equal(n, 2 * tailles.length * 8);
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
