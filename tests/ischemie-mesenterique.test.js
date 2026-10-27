/* Tests de la fiche « Ischémie mésentérique : sémiologie et diagnostic » (fiches/ischemie-mesenterique.html),
   des règles (regles/ischemie-mesenterique.js) et des illustrations (fiches/digestif/ima-svg.js).
   Lancer : npm test   (ou : node --test tests/ischemie-mesenterique.test.js) */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const R = require('../regles/ischemie-mesenterique.js');
const I = require('../fiches/digestif/ima-svg.js');
const RACINE = path.join(__dirname, '..');
const HTML = fs.readFileSync(path.join(RACINE, 'fiches', 'ischemie-mesenterique.html'), 'utf8');

test('siège de l\'occlusion de l\'AMS → orientation', () => {
  assert.equal(R.orientationOcclusion(0).cle, 'thrombose');
  assert.equal(R.orientationOcclusion('0,5').cle, 'thrombose');
  assert.equal(R.orientationOcclusion(3).cle, 'embolie');
  assert.equal(R.orientationOcclusion(10).cle, 'embolie');
  assert.equal(R.orientationOcclusion(2).cle, 'intermediaire');
  assert.equal(R.orientationOcclusion(12).cle, 'distale');
  assert.equal(R.orientationOcclusion(''), null);
});

test('produit de contraste : 2 mL/kg jusqu\'à 150 mL', () => {
  assert.deepEqual(R.contraste(60), { volume: 120, plafonne: false, debit: '3-4 mL/s' });
  assert.equal(R.contraste(90).volume, 150); assert.ok(R.contraste(90).plafonne);
  assert.equal(R.contraste(0), null);
});

test('formes, paroi, gravité, entraînement', () => {
  assert.deepEqual(R.FORMES.arterielle.pct, [60, 75]);
  assert.equal(R.PAROI.epaissie.prono, 'bon');
  assert.equal(R.PAROI.amincie.prono, 'mauvais');
  assert.equal(R.GRAVITE.origine.length + R.GRAVITE.paroi.length, 7);
  assert.equal(R.CAS.length, 8);
  for (const c of R.CAS) assert.ok(R.CHOIX[c.rep], c.texte);
  for (const k of Object.keys(R.CHOIX)) assert.equal(R.CAS.filter(c => c.rep === k).length, 2, k);
  // chaque onglet de l'atelier a son texte
  for (const [, k] of HTML.matchAll(/data-paroi="([^"]+)"/g)) assert.ok(R.PAROI[k], k);
});

test('illustrations SVG', () => {
  for (const t of Object.keys(R.PAROI).concat(['dilatee', 'feces'])) assert.match(I.anse(t), /^<svg[\s\S]*<\/svg>$/, t);
  for (const t of ['aeroportie', 'aeromesenterie', 'pneumoperitoine']) assert.match(I.air(t), /<svg/);
  for (const t of ['peigne', 'infiltration', 'ascite']) assert.match(I.mesentere(t), /<svg/);
  for (const f of ['colon', 'vasospasme', 'veine']) assert.match(I[f](), /<svg/);
  // l'AMS reste dans le dessin sur 16 cm ; occlusion dessinée
  const fin = I.AMS(16); assert.ok(fin[1] < 240 && fin[0] > 0);
  assert.match(I.axe({ occlusion: 6, type: 'embole' }), /#3c67b8/);
  // les figures de la page appellent des dessins qui existent
  for (const [, k, t] of HTML.matchAll(/data-ima="([^"]+)"(?: data-type="([^"]+)")?/g)) assert.equal(typeof I[k], 'function', k + (t ? ' ' + t : ''));
});

test('fiche : sections, lexique de l\'auteur, scripts, carte', () => {
  for (const id of ['introduction', 'exploration', 'etiologie', 'semiologie', 'ams', 'paroi', 'gravite', 'conclusion', 'testez-vous'])
    assert.ok(HTML.includes(`id="${id}"`), id);
  for (const t of ['Retard diagnostique = principal facteur pronostique modifiable.', 'au temps artériel (~25-30 s)', '60-75 % des cas d\'IMA — 1ère cause — mortalité entre 60 et 90 %',
    'Occlusion dans les 3 à 10 premiers cm de l\'AMS = embolique', 'Dilatation : grêle &gt; 25 mm, côlon &gt; 80 mm', '50 % des patients avec thrombose de l\'AMS développent des emboles extra-mésentériques',
    'Seule l\'imagerie peut poser le diagnostic +++'])
    assert.ok(HTML.includes(t), t);
  for (const s of ['../regles/ischemie-mesenterique.js', 'digestif/ima-svg.js', 'digestif/ima-fiche.js']) assert.ok(HTML.includes(`<script src="${s}?v=`), s);
  assert.equal((HTML.match(/<body/g) || []).length, 1);
  assert.match(fs.readFileSync(path.join(RACINE, 'fiches-rapides.html'), 'utf8'), /<a class="fiche-card" data-spe="digestif" href="fiches\/ischemie-mesenterique\.html"/);
});
