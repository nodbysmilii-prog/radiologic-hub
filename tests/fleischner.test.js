/* Tests des recommandations Fleischner 2017 — cas FICTIFS uniquement.
   Lancer : npm test   (ou : node --test tests/*.test.js) */
const test = require('node:test');
const assert = require('node:assert/strict');
const F = require('../regles/fleischner.js');

const nod = (type, grandAxe, petitAxe, o = {}) => ({ type, grandAxe: String(grandAxe), petitAxe: petitAxe == null ? '' : String(petitAxe), ...o });
const un = (n, risque = 'faible', o = {}) => F.evaluer({ contexte: 'fortuit', risque, nodules: [n], ...o });

test('taille : moyenne des deux axes arrondie au mm, virgule acceptée', () => {
  assert.equal(F.taille(nod('solide', 7, 5)).mm, 6);
  assert.equal(F.taille(nod('solide', '6,4', '5,4')).mm, 6);     // 5,9 → 6
  assert.equal(F.taille(nod('solide', 6, 5)).mm, 6);              // 5,5 → 6 (arrondi)
  assert.equal(F.taille(nod('solide', 6, 4)).mm, 5);
  assert.equal(F.taille(nod('solide', 9, 8)).mm, 9);              // 8,5 → 9 : > 8 mm
  const seul = F.taille(nod('solide', 7));
  assert.equal(seul.mm, 7);
  assert.equal(seul.note, 'un seul diamètre renseigné');
  assert.equal(F.classe(nod('solide', 9, 8)).cle, 'grand');
  assert.equal(F.classe(nod('solide', 8, 8)).cle, 'moyen');
  assert.equal(F.classe(nod('solide', 6, 5)).cle, 'moyen');
  assert.equal(F.classe(nod('solide', 5, 5)).cle, 'petit');
});

test('volume prioritaire pour un nodule solide : < 100, 100–250, > 250 mm³', () => {
  assert.equal(F.classe(nod('solide', 7, 7, { volume: '99' })).cle, 'petit');
  assert.equal(F.classe(nod('solide', 4, 4, { volume: '100' })).cle, 'moyen');
  assert.equal(F.classe(nod('solide', 4, 4, { volume: '250' })).cle, 'moyen');
  assert.equal(F.classe(nod('solide', 4, 4, { volume: '251' })).cle, 'grand');
  assert.equal(F.classe(nod('verre-depoli', 7, 7, { volume: '50' })).cle, 'moyen', 'volume ignoré pour un nodule subsolide');
});

test('nodule solide unique : < 6, 6–8, > 8 mm, faible et haut risque', () => {
  assert.equal(un(nod('solide', 5, 4)).rang, 0);
  assert.match(un(nod('solide', 5, 4)).texte, /pas de surveillance systématique/);
  assert.match(un(nod('solide', 5, 4), 'eleve').texte, /optionnelle à 12 mois/);
  assert.match(un(nod('solide', 7, 6)).texte, /6–12 mois, puis à envisager à 18–24 mois/);
  assert.match(un(nod('solide', 7, 6), 'eleve').texte, /6–12 mois, puis TDM à 18–24 mois/);
  const g = un(nod('solide', 12, 10));
  assert.equal(g.rang, 4);
  assert.match(g.texte, /TDM à 3 mois, TEP-TDM ou prélèvement/);
  assert.equal(g.nodules[0].ligne, 'nodule unique solide de plus de 8 mm');
});

test('nodules solides multiples : conduite guidée par le nodule le plus suspect', () => {
  const r = F.evaluer({ contexte: 'fortuit', risque: 'faible', nodules: [nod('solide', 4, 4), nod('solide', 8, 6)] });
  assert.equal(r.multiple, true);
  assert.equal(r.guide, 1);
  assert.match(r.texte, /3–6 mois, puis à envisager à 18–24 mois/);
  assert.equal(r.nodules[1].ligne, 'nodules multiples dont le plus suspect est solide, de 6 à 8 mm');
  const h = F.evaluer({ contexte: 'fortuit', risque: 'eleve', nodules: [nod('solide', 12, 11)], autresNodules: true });
  assert.equal(h.multiple, true, 'autres nodules non détaillés → multiples');
  assert.match(h.texte, /3–6 mois, puis TDM à 18–24 mois/);
  assert.match(F.evaluer({ contexte: 'fortuit', risque: 'faible', nodules: [nod('solide', 4, 4), nod('solide', 3, 3)] }).texte, /pas de surveillance systématique/);
});

test('verre dépoli pur et partiellement solide (nodule unique)', () => {
  assert.equal(un(nod('verre-depoli', 5, 4)).rang, 0);
  assert.match(un(nod('verre-depoli', 5, 4, { suspect: true })).texte, /2 et 4 ans/);
  assert.match(un(nod('verre-depoli', 8, 6)).texte, /6–12 mois pour confirmer la persistance, puis TDM tous les 2 ans jusqu'à 5 ans/);
  assert.equal(un(nod('part-solide', 5, 5, { composanteSolide: '2' })).rang, 0);
  const ps = un(nod('part-solide', 10, 8, { composanteSolide: '4' }));
  assert.equal(ps.rang, 3);
  assert.match(ps.texte, /TDM annuelle pendant 5 ans/);
  const sus = un(nod('part-solide', 14, 12, { composanteSolide: '6' }));
  assert.equal(sus.rang, 4);
  assert.match(sus.texte, /hautement suspect/);
  const manque = un(nod('part-solide', 10, 8));
  assert.equal(manque.nodules[0].manque, 'composante solide');
});

test('subsolides : le niveau de risque ne change pas la conduite', () => {
  const n = nod('verre-depoli', 8, 6);
  assert.equal(un(n, 'faible').texte, un(n, 'eleve').texte);
  assert.equal(un(n, '').nodules[0].deuxRisques, undefined);
});

test('nodules subsolides multiples : < 6 mm et ≥ 6 mm', () => {
  const p = F.evaluer({ contexte: 'fortuit', nodules: [nod('verre-depoli', 4, 4), nod('verre-depoli', 5, 4)] });
  assert.match(p.texte, /3–6 mois ; si stabilité, TDM à envisager à 2 et 4 ans/);
  const g = F.evaluer({ contexte: 'fortuit', nodules: [nod('verre-depoli', 4, 4), nod('part-solide', 9, 7, { composanteSolide: '3' })] });
  assert.equal(g.guide, 1);
  assert.match(g.texte, /^TDM à 3–6 mois, puis conduite selon le nodule le plus suspect — si inchangé .* TDM annuelle pendant 5 ans$/);
  const vd = F.evaluer({ contexte: 'fortuit', nodules: [nod('verre-depoli', 8, 7), nod('verre-depoli', 4, 4)] });
  assert.match(vd.texte, /TDM tous les 2 ans jusqu'à 5 ans/);
  // composante solide ≥ 6 mm : reste hautement suspect même avec d'autres nodules
  const s = F.evaluer({ contexte: 'fortuit', risque: 'faible', nodules: [nod('solide', 7, 5), nod('part-solide', 12, 10, { composanteSolide: '7' })] });
  assert.equal(s.guide, 1);
  assert.equal(s.rang, 4);
  assert.match(s.texte, /hautement suspect/);
  assert.equal(s.nodules[1].court, 'TDM à 3–6 mois — hautement suspect si persistant');
  assert.equal(s.nodules[1].ligne, 'nodules multiples dont le plus suspect est partiellement solide, de 6 mm ou plus');
});

test('risque non précisé : les deux conduites quand elles diffèrent', () => {
  const r = un(nod('solide', 7, 6), '');
  assert.equal(r.nodules[0].deuxRisques, true);
  assert.match(r.texte, /^chez un patient à faible risque, TDM à 6–12 mois, puis à envisager à 18–24 mois ; chez un patient à haut risque, TDM à 6–12 mois, puis TDM à 18–24 mois$/);
  assert.equal(r.nodules[0].court, 'TDM à 6–12 mois');
  assert.equal(un(nod('solide', 5, 4), '').nodules[0].court, 'pas de surveillance (faible risque) ou TDM optionnelle à 12 mois (haut risque)');
  assert.equal(un(nod('solide', 12, 10), '').nodules[0].deuxRisques, undefined, 'même conduite : un seul texte');
});

test('cas particuliers : bénin, périscissural typique, type ou taille manquants', () => {
  assert.match(un(nod('solide', 9, 8, { benin: true })).texte, /critères de bénignité/);
  const p = un(nod('solide', 8, 7, { perisScissural: true }), 'eleve');
  assert.equal(p.rang, 0);
  assert.match(p.texte, /périscissural/);
  assert.equal(un(nod('solide', 14, 12, { perisScissural: true })).rang, 4, 'au-delà de 10 mm : règles habituelles');
  assert.equal(un(nod('', 7, 6)).rang, null);
  assert.equal(un(nod('solide', '', '')).nodules[0].manque, 'taille du nodule');
});

test('contextes où Fleischner ne s\'applique pas', () => {
  ['depistage', 'cancer', 'immunodep', 'jeune'].forEach(c => {
    const r = F.evaluer({ contexte: c, risque: 'faible', nodules: [nod('solide', 7, 6)] });
    assert.equal(r.applicable, false, c);
    assert.equal(r.texte, '');
    assert.ok(r.motif.length > 10);
  });
  assert.match(F.NON_APPLICABLE.depistage, /Lung-RADS/);
});
