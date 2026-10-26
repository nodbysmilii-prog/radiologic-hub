/* Tests de la fiche « Nodule thyroïdien : EU-TIRADS 2017 » (fiches/eu-tirads.html),
   des règles (regles/eu-tirads.js) et du dessin du nodule (fiches/thyroide/nodule-svg.js).
   Lancer : npm test   (ou : node --test tests/eu-tirads.test.js) */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const R = require('../regles/eu-tirads.js');
const N = require('../fiches/thyroide/nodule-svg.js');
const RACINE = path.join(__dirname, '..');
const HTML = fs.readFileSync(path.join(RACINE, 'fiches', 'eu-tirads.html'), 'utf8');

test('classement : signes forts d\'abord, puis échogénicité', () => {
  assert.equal(R.classer({ composition: 'kyste' }).categorie, 2);
  assert.equal(R.classer({ composition: 'spongiforme' }).categorie, 2);
  assert.equal(R.classer({ composition: 'solide', echo: 'iso', forme: 'ovale', contours: 'reguliers' }).categorie, 3);
  assert.equal(R.classer({ composition: 'solide', echo: 'hyper' }).categorie, 3);
  assert.equal(R.classer({ composition: 'mixte-kystique', echo: 'hypo-moderee' }).categorie, 4);
  for (const n of [{ forme: 'non-ovale' }, { contours: 'irreguliers' }, { micro: true }, { echo: 'hypo-marquee' }])
    assert.equal(R.classer({ composition: 'solide', echo: 'iso', ...n }).categorie, 5, JSON.stringify(n));
  assert.equal(R.classer({ composition: 'solide', echo: 'iso', contours: 'flous' }).categorie, 3, 'flou ≠ irrégulier');
  assert.deepEqual(R.signesForts({ forme: 'non-ovale', micro: true }), ['forme non ovale', 'microcalcifications']);
});

test('cytoponction et surveillance', () => {
  assert.equal(R.cytoponction(5, 11).indication, true);
  assert.equal(R.cytoponction(5, 10).indication, false, 'seuil strict > 10 mm');
  assert.equal(R.cytoponction(4, 16).indication, true);
  assert.equal(R.cytoponction(4, 15).indication, false);
  assert.equal(R.cytoponction(3, 21).indication, true);
  assert.equal(R.cytoponction(3, 20).indication, false);
  assert.equal(R.cytoponction(2, 40).indication, false);
  assert.match(R.surveillance(3, 9), /Arrêt/);
  assert.match(R.surveillance(4, 5), /Arrêt/);
  assert.match(R.surveillance(4, 8), /1 an/);
});

test('croissance significative : +2 mm dans 2 diamètres ou +50 % de volume', () => {
  assert.equal(R.croissance([12, 10, 8], [14, 12, 8]).significative, true);
  assert.equal(R.croissance([12, 10, 8], [13, 11, 9]).significative, false);
  assert.equal(R.croissance([10, 10, 10], [11, 11, 13]).significative, true, 'volume +57 %');
});

test('dessin du nodule : SVG pour chaque composition', () => {
  for (const c of ['solide', 'mixte-solide', 'mixte-kystique', 'kyste', 'spongiforme']) {
    const s = N.dessinerNodule({ composition: c, echo: 'hypo-moderee', micro: true });
    assert.match(s, /^<svg viewBox="0 0 240 170"/); assert.match(s, /<\/svg>$/);
  }
  for (const p of ['micro', 'colloide', 'microkystes', 'macro']) assert.match(N.ponctuation(p), /<svg/);
});

test('fiche : sections, scripts, carte Tête et cou', () => {
  for (const id of ['reperes', 'atelier', 'categories', 'signes-forts', 'ponctuations', 'compte-rendu', 'cytoponction', 'suivi', 'pieges', 'entrainement', 'testez-vous'])
    assert.ok(HTML.includes(`id="${id}"`), id);
  for (const s of ['../regles/eu-tirads.js', 'thyroide/nodule-svg.js', 'thyroide/eu-tirads-fiche.js']) assert.ok(new RegExp(`<script src="${s.replace(/\./g, '\\.')}\\?v=\\d+"></script>`).test(HTML), s);
  assert.equal((HTML.match(/<body/g) || []).length, 1);
  const index = fs.readFileSync(path.join(RACINE, 'fiches-rapides.html'), 'utf8');
  assert.match(index, /<a class="fiche-card" data-spe="orl" href="fiches\/eu-tirads\.html"/);
});

test('échographies Vassallo et al. : 12 images présentes, chacune créditée, sans commentaire', () => {
  const figs = HTML.match(/<figure class="ex-fig ti-echo"[\s\S]*?<\/figure>/g) || [];
  assert.equal(figs.length, 12);
  for (const f of figs) {
    const src = f.match(/src="(thyroide\/images\/[^"]+)"/)[1];
    assert.ok(fs.existsSync(path.join(RACINE, 'fiches', src)), src);
    assert.match(f, /Vassallo et al\./);
    assert.match(f, /CC BY 4\.0/);
    assert.match(f, /<figcaption><strong>[^<]+<\/strong><span class="ti-credit">/);
  }
  assert.match(HTML, /id="lightbox"/);
});
