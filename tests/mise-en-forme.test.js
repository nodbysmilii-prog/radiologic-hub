/* Mise en forme des comptes rendus (regles/mise-en-forme.js) : titre centré en gras, rubriques en gras.
   Lancer : npm test (ou node --test tests/mise-en-forme.test.js) */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const MF = require('../regles/mise-en-forme.js');

const CR = fs.readFileSync(path.join(__dirname, '..', 'cr-data.js'), 'utf8');
const MODELES = [...CR.matchAll(/^ {4}id: '([^']+)'[\s\S]*?text: `([\s\S]*?)`/gm)].map(m => ({ id: m[1], texte: m[2] }));

test('titre centré en gras, rubriques en gras, le reste tel quel', () => {
  const t = 'SCANNER ABDOMINO-PELVIEN\n\nRENSEIGNEMENTS CLINIQUES :\n[renseignements cliniques]\n\nRÉSULTATS :\n• Foie normal.\nC5-C6 :\nÀ l\'étage sus-tentoriel :\n\nAU TOTAL :\nAppendicite aiguë non compliquée.';
  const a = MF.analyser(t);
  assert.deepEqual(a.filter(x => x.type === 'titre').map(x => x.texte), ['SCANNER ABDOMINO-PELVIEN']);
  assert.deepEqual(a.filter(x => x.type === 'rubrique').map(x => x.texte), ['RENSEIGNEMENTS CLINIQUES :', 'RÉSULTATS :', 'AU TOTAL :']);
  const h = MF.html(t);
  assert.match(h, /<p class="crf-titre" style="margin:0;text-align:center"><b>SCANNER ABDOMINO-PELVIEN<\/b><\/p>/);
  assert.match(h, /<p class="crf-rubrique" style="margin:0"><b>AU TOTAL :<\/b><\/p>/);
  assert.match(h, /<p style="margin:0">• Foie normal\.<\/p>/);
  assert.match(MF.html('<script>'), /&lt;script&gt;/);
  assert.match(MF.word(t), /^<html[^>]*><head><meta charset="utf-8">/);
});

test('les comptes rendus types : un titre centré (sauf modèle sans titre) et leurs rubriques en gras', () => {
  assert.ok(MODELES.length >= 40);
  for (const m of MODELES) {
    const a = MF.analyser(m.texte);
    const premiere = m.texte.split('\n')[0];
    if (/:\s*$/.test(premiere)) assert.equal(a.filter(x => x.type === 'titre').length, 0, m.id);
    else assert.deepEqual(a.filter(x => x.type === 'titre').map(x => x.texte), [premiere], m.id);
    assert.ok(a.some(x => x.type === 'rubrique' && /^(RÉSULTATS?|COMPTE-RENDU|TECHNIQUE|INDICATION|RENSEIGNEMENTS CLINIQUES) :$/.test(x.texte)), m.id);
    for (const x of a.filter(y => y.type === 'rubrique')) assert.ok(!/^[CDL]\d/.test(x.texte), `${m.id} : étage vertébral pas en rubrique`);
  }
});

test('page Comptes rendus : script chargé avant cr.js, bouton Word', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'comptes-rendus.html'), 'utf8');
  assert.match(html, /regles\/mise-en-forme\.js\?v=\d+/);
  assert.ok(html.indexOf('regles/mise-en-forme.js') < html.indexOf('src="cr.js'));
  assert.match(html, /id="cr-download-doc"/);
});
