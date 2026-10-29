/* Tests de la fiche « Colites » (fiches/colites.html), des règles (regles/colites.js)
   et du modèle 3D du côlon (public/models/colon/).
   Lancer : npm test   (ou : node --test tests/colites.test.js) */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const R = require('../regles/colites.js');
const RACINE = path.join(__dirname, '..');
const HTML = fs.readFileSync(path.join(RACINE, 'fiches', 'colites.html'), 'utf8');
const MODELE = JSON.parse(fs.readFileSync(path.join(RACINE, 'public', 'models', 'colon', 'colon.json'), 'utf8'));

test('épaisseur pariétale, calibre, contraste', () => {
  assert.equal(R.paroi(3).cle, 'normale');
  assert.equal(R.paroi(4).cle, 'normale');
  assert.equal(R.paroi('4,5').cle, 'epaissie');
  assert.equal(R.paroi(3, true).cle, 'limite');
  assert.equal(R.paroi(2, true).cle, 'normale');
  assert.equal(R.paroi(0), null);
  assert.equal(R.megacolon(7).toxique, true);
  assert.equal(R.megacolon(6).toxique, false);
  assert.deepEqual(R.CALIBRE.caecum, [6, 8]);
  assert.deepEqual(R.contraste(80), { volume: 120, debit: '2-3ml/s' });
});

test('échographie : 5 couches alternées', () => {
  assert.equal(R.ECHO.length, 5);
  assert.deepEqual(R.ECHO.map(e => e.echo), ['hyper', 'hypo', 'hyper', 'hypo', 'hyper']);
});

test('atteintes : segments du modèle 3D, boutons de la fiche', () => {
  const ids = new Set(MODELE.structures.map(s => s.id));
  for (const [k, a] of Object.entries(R.ATTEINTES)) for (const s of a.segments) assert.ok(ids.has(s), `${k} → ${s}`);
  for (const [, k] of HTML.matchAll(/data-(?:voir-)?atteinte="([a-z]+)"/g)) assert.ok(R.ATTEINTES[k], k);
  for (const s of ['caecum', 'ascendant', 'transverse', 'descendant', 'sigmoide', 'appendice', 'grele', 'ileon']) assert.ok(ids.has(s), s);
  assert.ok(MODELE.octets < 700000);
  for (const f of ['colon.glb', 'LICENSE-Z-Anatomy.txt']) assert.ok(fs.existsSync(path.join(RACINE, 'public', 'models', 'colon', f)), f);
  assert.ok(R.ATTEINTES.crohn.segments.includes('ileon') && R.ATTEINTES.rch.segments.includes('sigmoide'));
});

test('paroi 3D : atteintes de la fiche connues du module', () => {
  const src = fs.readFileSync(path.join(RACINE, 'fiches', 'digestif', 'colon-3d.js'), 'utf8');
  for (const [, k] of HTML.matchAll(/data-(?:voir-)?paroi="([a-z-]+)"/g)) assert.ok(src.includes(`'${k}'`) || src.includes(`${k}: {`), k);
  for (const c of ['interface', 'muqueuse', 'sous-muqueuse', 'musculeuse', 'sereuse', 'graisse']) assert.ok(src.includes(`id: '${c}'`), c);
});

test('fiche : sections, lexique de l\'auteur, onglets, scripts, carte', () => {
  for (const id of ['introduction', 'cadre', 'clinique', 'imagerie', 'paroi', 'normal', 'positif', 'etiologie', 'testez-vous']) assert.ok(HTML.includes(`id="${id}"`), id);
  for (const t of ['Le diagnostic de certitude repose le plus souvent sur l\'endoscopie associée à la biopsie.', 'Épaississement pariétal &gt; 4mm', '3-4mm si côlon collabé',
    'passage capital, meilleur temps pour explorer le rehaussement pariétal digestif', 'Iléon terminal et colon droit +++', 'Jamais de fistule ou d\'abcès',
    'Important épaississement pariétal (&gt; 11mm)', 'Pneumatose pariétale possible (mauvais pronostic)'])
    assert.ok(HTML.includes(t), t);
  for (const [, k] of HTML.matchAll(/data-onglet="([a-z]+)"/g)) assert.ok(HTML.includes(`data-panneau="${k}"`), k);
  assert.ok(HTML.includes('<script src="../regles/colites.js?v=') && HTML.includes('<script type="module" src="digestif/colites-fiche.js?v='));
  assert.ok(HTML.includes('"three": "../vendor/three-0.170.0/three.module.min.js"'));
  assert.equal(R.CAS.length, 8);
  for (const c of R.CAS) assert.ok(R.CHOIX[c.rep], c.texte);
  assert.match(fs.readFileSync(path.join(RACINE, 'fiches-rapides.html'), 'utf8'), /<a class="fiche-card" data-spe="digestif" href="fiches\/colites\.html"/);
});
