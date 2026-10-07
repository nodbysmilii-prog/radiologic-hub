/* Tests du schéma sectoriel de la prostate (projection sagittale / coronale) — sans donnée patient.
   Lancer : npm test   (ou : node --test tests/*.test.js) */
const test = require('node:test');
const assert = require('node:assert/strict');
const P = require('../schemas/prostate.js');

test('secteurs axiaux : 3 niveaux × 2 côtés, zone centrale à la base seulement', () => {
  assert.equal(P.SECTEURS.length, 38);
  assert.equal(P.ORDRE.length, 41, '+ 2 vésicules séminales + sphincter');
  assert.ok(P.SECTEURS.some(s => s.id === 'B-R-CZ'));
  assert.ok(!P.SECTEURS.some(s => s.id === 'M-R-CZ'));
  assert.deepEqual(P.parse('A-L-TZp'), { lv: 'A', side: 'L', zone: 'TZp' });
  assert.deepEqual(P.parse('SV-R'), { zone: 'SV', side: 'R', lv: '' });
});

test('projection sagittale : antérieur à gauche, base en haut', () => {
  const [xAs] = P.sagPos('M-R-AS'), [xPm] = P.sagPos('M-R-PZpm');
  assert.ok(xAs < xPm, 'AS en avant de la PZ postéromédiale');
  assert.ok(P.sagPos('B-L-PZpl')[1] < P.sagPos('M-L-PZpl')[1] && P.sagPos('M-L-PZpl')[1] < P.sagPos('A-L-PZpl')[1]);
  assert.equal(P.sagCell('M-R-TZa'), 'M-ant');
  assert.equal(P.sagCell('A-L-PZpl'), 'A-post');
  assert.equal(P.sagCell('B-R-CZ'), 'B-post');
});

test('projection coronale : droite du patient à gauche de l\'image, PZ en dehors de la TZ', () => {
  const [xR] = P.corPos('M-R-PZpl'), [xL] = P.corPos('M-L-PZpl'), [xTz] = P.corPos('M-L-TZa');
  assert.ok(xR < 520 && xL > 520);
  assert.ok(xTz < xL, 'TZ plus médiale que la PZ');
  assert.equal(P.corCell('A-R-PZa'), 'A-R');
  assert.equal(P.corCell('SV-L'), 'SV-L');
});

test('SVG : trois coupes, vues sagittale et coronale, repères des lésions', () => {
  const svg = P.svg({ interactif: true, lesions: [{ n: 1, color: '#f18d25', active: true, sectors: ['M-R-PZpl', 'A-R-PZpl'] }] });
  assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 710 624"/);
  assert.match(svg, /VUE SAGITTALE/);
  assert.match(svg, /VUE CORONALE/);
  assert.match(svg, /data-s="M-R-PZpl"/);
  assert.equal((svg.match(/<circle[^>]*r="12"/g) || []).length, 3, 'lésion active repérée sur l\'axial, le sagittal et le coronal');
  assert.ok(!P.svg({}).includes('data-s='), 'schéma non interactif : pas de data-s');
});
