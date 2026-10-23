/* Tests de la fiche « Cancer du cavum : l'imagerie » (fiches/cancer-du-cavum.html), des règles TNM
   (regles/tnm-cavum.js) et des données du modèle 3D (public/models/cavum/cavum.json, scripts/export_cavum.py).
   Lancer : npm test   (ou : node --test tests/cancer-du-cavum.test.js) */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const RACINE = path.join(__dirname, '..');
const HTML = fs.readFileSync(path.join(RACINE, 'fiches', 'cancer-du-cavum.html'), 'utf8');
const texte = HTML.replace(/<[^>]+>/g, ' ').replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&').replace(/\s+/g, ' ');
const R = require('../regles/tnm-cavum.js');
const MODELE = JSON.parse(fs.readFileSync(path.join(RACINE, 'public', 'models', 'cavum', 'cavum.json'), 'utf8'));

test('6 parties dans l\'ordre, sommaire, scripts et styles versionnés', () => {
  const ids = ['generalites', 'imagerie', 'extension', 'ganglions', 'tnm', 'differentiels'];
  const titres = [...HTML.matchAll(/<section class="fsec" id="([a-z-]+)"/g)].map(m => m[1]);
  assert.deepEqual(titres, [...ids, 'testez-vous']);
  for (const id of ids) assert.match(HTML, new RegExp(`<li><a href="#${id}"`));
  for (const f of ['schemas/cavum.css', 'regles/tnm-cavum.js', 'cavum/cavum-fiche.js']) assert.match(HTML, new RegExp(f.replace('.', '\\.') + '\\?v=\\d+'), f);
  assert.match(HTML, /"three": "\.\.\/vendor\/three-0\.170\.0\/three\.module\.min\.js"/);
});

test('chiffres et messages clés du cours', () => {
  for (const t of ['90 %', '8 à 10 mois', 'otite séreuse unilatérale de l\'adulte', '352 × 256', 'perte de l\'hypersignal T1',
    'foramen sphénopalatin', 'fascia pharyngo-basilaire', '30 %', '≈ 90 %', '65 %', '> 8 mm', '> 1 cm', '5 à 41 %', '20 %', '13 %', '9 %',
    'Strictement médian', 'tumeur maligne pseudokystique', '2 à 3 mois', 'Tous les 4 mois', 'Tous les 6 mois', 'TEP-scanner'])
    assert.ok(texte.includes(t), t);
});

test('TNM : définitions de la fiche et regroupement en stades AJCC / UICC 8e édition', () => {
  assert.match(R.T.T2, /parapharyngée/); assert.match(R.T.T4, /au-delà de la face latérale du muscle ptérygoïdien latéral/);
  assert.doesNotMatch(R.T.T4, /fosse infratemporale/, 'T4 : formulation de la 8e édition (demande de l\'auteur)');
  assert.match(R.N.N1, /rétropharyngés uni- ou bilatéraux, ≤ 6 cm/); assert.match(R.N.N2, /≤ 6 cm/); assert.match(R.N.N3, /> 6 cm/);
  assert.ok(texte.includes('> 8 mm'), 'seuil rétropharyngé de 8 mm gardé (choix de l\'auteur)');
  const cas = [['T1', 'N0', 'M0', 'I'], ['T1', 'N1', 'M0', 'II'], ['T2', 'N0', 'M0', 'II'], ['T2', 'N1', 'M0', 'II'],
    ['T1', 'N2', 'M0', 'III'], ['T2', 'N2', 'M0', 'III'], ['T3', 'N0', 'M0', 'III'], ['T3', 'N2', 'M0', 'III'],
    ['T4', 'N0', 'M0', 'IVA'], ['T1', 'N3', 'M0', 'IVA'], ['T4', 'N3', 'M0', 'IVA'], ['T1', 'N0', 'M1', 'IVB']];
  for (const [t, n, m, s] of cas) assert.equal(R.stade(t, n, m), s, `${t}${n}${m}`);
  assert.equal(R.stade('T5', 'N0', 'M0'), null);
  for (const t of ['T1', 'T2', 'T3', 'T4']) assert.match(HTML, new RegExp(`class="tnm-carte" data-t="${t}"`));
});

test('modèle 3D : structures, espaces, foramens et 5 directions de propagation', () => {
  const ids = MODELE.structures.map(s => s.id);
  for (const id of ['sphenoide', 'occipital', 'temporal-d', 'nasopharynx', 'sinus-caverneux-d', 'carotide-interne-d', 'v2-d', 'v3-ant-d',
    'espace-masticateur-d', 'espace-parapharynge-d', 'espace-carotidien-d', 'espace-retropharynge', 'fosse-pterygopalatine-d', 'long-tete-d'])
    assert.ok(ids.includes(id), id);
  const f = Object.fromEntries(MODELE.foramens.map(x => [x.id, x.pos]));
  for (const b of ['foramen-rond', 'foramen-ovale', 'foramen-lacerum', 'canal-carotidien', 'foramen-jugulaire', 'canal-hypoglosse',
    'canal-pterygoidien', 'foramen-sphenopalatin', 'fissure-orbitaire-inf', 'fissure-orbitaire-sup']) {
    assert.ok(f[b + '-d'] && f[b + '-g'], b);
    assert.ok(f[b + '-d'][0] < 0, b + ' : côté droit du patient = −X');
    assert.equal(f[b + '-g'][0], -f[b + '-d'][0], b + ' : côté gauche symétrique');
  }
  // contrôles anatomiques (repère : +Y haut, +Z avant)
  const [fr, fo, fj, hyp] = ['foramen-rond-d', 'foramen-ovale-d', 'foramen-jugulaire-d', 'canal-hypoglosse-d'].map(k => f[k]);
  assert.ok(fr[2] > fo[2] && fr[1] > fo[1], 'foramen rond en avant et au-dessus du foramen ovale');
  assert.ok(Math.abs(fo[0]) > Math.abs(fr[0]), 'foramen ovale plus latéral que le foramen rond');
  assert.ok(fj[2] < fo[2] && Math.abs(fj[0]) > Math.abs(hyp[0]), 'foramen jugulaire en arrière, latéral au canal de l\'hypoglosse');
  assert.ok(f['foramen-sphenopalatin-d'][0] > f['fissure-orbitaire-inf-d'][0], 'foramen sphénopalatin médial');
  assert.deepEqual(MODELE.voies.map(v => v.id), ['anterieure', 'laterale', 'posterieure', 'inferieure', 'superieure']);
  for (const v of MODELE.voies) for (const t of v.trajets) assert.ok(t.pts.length >= 2 && t.texte, t.id);
  assert.ok(fs.statSync(path.join(RACINE, 'public', 'models', 'cavum', 'cavum.glb')).size === MODELE.octets);
  assert.ok(fs.existsSync(path.join(RACINE, 'public', 'models', 'cavum', 'LICENSE-Z-Anatomy.txt')));
});

test('carte dans Fiches rapides › Tête et cou', () => {
  const index = fs.readFileSync(path.join(RACINE, 'fiches-rapides.html'), 'utf8');
  assert.match(index, /<a class="fiche-card" data-spe="orl" href="fiches\/cancer-du-cavum\.html"/);
});
