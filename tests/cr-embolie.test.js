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

test('embolie pulmonaire : adénomégalies médiastinales, chaînes en choix multiples [a + b + …]', () => {
  const l = CR.split('\n').find(x => x.includes('Adénomégalies médiastinales] : chaîne(s)'));
  assert.equal(l, '• [Absence d\'adénomégalie médiastinale / Adénomégalie médiastinale / Adénomégalies médiastinales] : chaîne(s) [pré-vasculaire (3a) + rétro-trachéale (3p) + latéro-trachéale haute droite (2R) + latéro-trachéale haute gauche (2L) + latéro-trachéale basse droite (4R) + latéro-trachéale basse gauche (4L) + para-aortique (6) + sous-aortique (5) + sous-carinaire (7) + para-œsophagienne (8) + du ligament triangulaire (9) + hilaire droite (10R) + hilaire gauche (10L)].');
  const cr = fs.readFileSync(path.join(__dirname, '..', 'cr.js'), 'utf8');
  assert.ok(cr.includes('MULTI_SEP = /\\s+\\+\\s+/'), 'champ [a + b] reconnu par l\'éditeur');
  assert.match(cr, /function sansDetails/, '« Absence de … » retire les précisions de la ligne');
});
