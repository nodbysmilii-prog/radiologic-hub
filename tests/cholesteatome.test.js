/* Tests de la fiche « Cholestéatome » (fiches/cholesteatome.html), des outils
   (regles/cholesteatome.js) et du modèle 3D du rocher (public/models/rocher/).
   Lancer : npm test   (ou : node --test tests/cholesteatome.test.js) */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const R = require('../regles/cholesteatome.js');

const RACINE = path.join(__dirname, '..');
const HTML = fs.readFileSync(path.join(RACINE, 'fiches', 'cholesteatome.html'), 'utf8');

test('outil TDM : OMC ou cholestéatome', () => {
  assert.equal(R.tdm({ convexe: true, lyse: true }).verdict, 'Cholestéatome');
  assert.equal(R.tdm({ convexe: true, attical: true }).verdict, 'Cholestéatome probable');
  assert.equal(R.tdm({ diffus: true }).verdict, 'OMC non cholestéatomateuse');
  assert.equal(R.tdm({ lyse: true, contexte: true }).verdict, 'Évoquer un cholestéatome évacué');
  assert.equal(R.tdm({}).verdict, '');
});

test('outil IRM : nature du tissu', () => {
  assert.equal(R.irm({ t1: 'hypo', diffusion: 'hyper', gado: 'aucune' }).tissu, 'Cholestéatome');
  assert.equal(R.irm({ diffusion: 'hyper', gado: 'peripherique' }).tissu, 'Cholestéatome', 'liseré périphérique possible');
  assert.equal(R.irm({ t1: 'hypo', diffusion: 'hypo', gado: 'tardive' }).tissu, 'Tissu fibro-inflammatoire');
  assert.equal(R.irm({ t1: 'hyper', t2: 'hyper' }).tissu, 'Granulome à cholestérine');
});

test('compte rendu guidé', () => {
  const r = R.compteRendu({ cote: 'gauche', extension: ['attique', 'antre'], lyses: ['mur', 'enclume'], risques: ['fistule'], variantes: ['golfe'] });
  assert.match(r.resultats[0], /oreille moyenne gauche.*étendu à l'attique et l'antre/);
  assert.match(r.resultats[1], /du mur de la logette et de la longue apophyse de l'enclume/);
  assert.match(r.resultats.join(' '), /Fistule du canal semi-circulaire latéral\./);
  assert.match(r.resultats.join(' '), /golfe jugulaire procident/);
  assert.equal(r.conclusion, "Cholestéatome de l'oreille moyenne gauche, compliqué de fistule du canal semi-circulaire latéral.");
  assert.match(R.compteRendu({}).resultats.join(' '), /respectés/);
});

test('fiche : sections, coupes de 0,5 mm, figures et scripts', () => {
  for (const id of ['essentiel', 'rocher-3d-section', 'technique', 'omc', 'tdm-diagnostic', 'extension', 'risques', 'variantes', 'irm', 'post-op', 'compte-rendu', 'testez-vous'])
    assert.ok(HTML.includes(`id="${id}"`), id);
  assert.match(HTML, /Coupes de <mark class="k-key">0,5 mm<\/mark>/);
  assert.doesNotMatch(HTML, /0,2-0,5|0,5-0,6/);
  const figs = [...HTML.matchAll(/href="cholesteatome\/images\/([a-z0-9-]+)\.jpg"/g)].map(m => m[1]);
  assert.ok(figs.length >= 40);
  for (const f of figs) assert.ok(fs.existsSync(path.join(RACINE, 'fiches', 'cholesteatome', 'images', f + '.jpg')), f);
  assert.ok((HTML.match(/class="ch-traces"/g) || []).length >= 30, 'nos tracés en SVG');
  assert.match(HTML, /<script src="\.\.\/regles\/cholesteatome\.js\?v=\d+"><\/script>/);
  assert.match(HTML, /<script type="importmap">/);
  assert.equal((HTML.match(/<body/g) || []).length, 1);
});

test('modèle 3D du rocher : structures et empreinte', () => {
  const D = JSON.parse(fs.readFileSync(path.join(RACINE, 'public', 'models', 'rocher', 'rocher.json'), 'utf8'));
  const ids = D.structures.map(s => s.id);
  for (const id of ['temporal', 'marteau', 'enclume', 'etrier', 'tympan', 'cochlee', 'vestibule', 'facial', 'carotide', 'jugulaire', 'sigmoide'])
    assert.ok(ids.includes(id), id);
  assert.equal(fs.statSync(path.join(RACINE, 'public', 'models', 'rocher', 'rocher.glb')).size, D.octets);
  assert.ok(fs.existsSync(path.join(RACINE, 'public', 'models', 'rocher', 'LICENSE-Z-Anatomy.txt')));
  const js = fs.readFileSync(path.join(RACINE, 'fiches', 'cholesteatome', 'rocher-3d.js'), 'utf8');
  for (const p of ['osselets', 'oreille-interne', 'facial', 'vaisseaux']) assert.ok(HTML.includes(`data-parcours="${p}"`) && js.includes(`'${p}'`) || js.includes(`${p}:`), p);
});

test('carte dans Fiches rapides › Tête et cou', () => {
  const index = fs.readFileSync(path.join(RACINE, 'fiches-rapides.html'), 'utf8');
  assert.match(index, /<a class="fiche-card" data-spe="orl" href="fiches\/cholesteatome\.html"/);
});
