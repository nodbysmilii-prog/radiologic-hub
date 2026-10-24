/* Compte rendu type « embolie pulmonaire » (cr-data.js) : liste des segments demandée par l'auteur (24/10/2026).
   Lancer : npm test   (ou : node --test tests/cr-embolie.test.js) */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const CR = fs.readFileSync(path.join(__dirname, '..', 'cr-data.js'), 'utf8');

test('embolie pulmonaire : segments apical / dorsal / ventral du lobe supérieur, latéral / médial du lobe moyen', () => {
  assert.ok(CR.includes('[segment apical du lobe supérieur / dorsal / ventral du lobe supérieur / latéral du lobe moyen / médial du lobe moyen / lingulaire supérieur /'));
  assert.ok(!CR.includes('segment apical / postérieur / antérieur du lobe supérieur'));
});
