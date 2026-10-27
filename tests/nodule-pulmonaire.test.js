/* Tests de la fiche « Conduite à tenir devant un nodule pulmonaire » (fiches/nodule-pulmonaire.html),
   des règles (regles/nodule-pulmonaire.js) et des illustrations (fiches/poumon/nodule-svg.js).
   Lancer : npm test   (ou : node --test tests/nodule-pulmonaire.test.js) */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const R = require('../regles/nodule-pulmonaire.js');
const N = require('../fiches/poumon/nodule-svg.js');
const RACINE = path.join(__dirname, '..');
const HTML = fs.readFileSync(path.join(RACINE, 'fiches', 'nodule-pulmonaire.html'), 'utf8');

const fl = (type, taille, o = {}) => R.fleischner({ type, taille, multiples: false, risque: 'faible', ...o });

test('Fleischner 2017 : nodules solides (texte de la fiche)', () => {
  assert.equal(fl('solide', 4).conduite, 'pas de suivi');
  assert.equal(fl('solide', 4, { risque: 'haut' }).conduite, 'TDM à 12 mois optionnelle');
  assert.equal(fl('solide', 5.9, { multiples: true }).cle, 's-petit');
  assert.equal(fl('solide', 6).conduite, 'TDM 6-12 mois +/- 18-24 mois');
  assert.equal(fl('solide', 8, { risque: 'haut' }).conduite, 'TDM 6-12 mois + 18-24 mois');
  assert.equal(fl('solide', 7, { multiples: true, risque: 'haut' }).conduite, 'TDM 3-6 mois puis 18-24 mois');
  const g = fl('solide', 9);
  assert.equal(g.conduite, 'TDM à 3 mois, PET-TDM et/ou biopsie selon le contexte'); assert.equal(g.geste, 'PET-TDM et/ou biopsie');
  assert.equal(fl('solide', 12, { multiples: true }).cle, 's-grand-m');
  assert.equal(R.fleischner({ type: 'solide' }), null);
});

test('Fleischner 2017 : nodules non solides', () => {
  assert.equal(fl('verre', 5).conduite, 'pas de suivi');
  assert.equal(fl('mixte', 5, { multiples: true }).conduite, 'TDM 3-6 mois, puis à 2 ans et 4 ans');
  assert.equal(fl('verre', 10).cle, 'vd');
  assert.equal(fl('mixte', 10).manque, 'composante solide');
  assert.equal(fl('mixte', 10, { solide: 4 }).cle, 'mixte-s-petit');
  assert.equal(fl('mixte', 10, { solide: 6 }).conduite, 'histologie');
  assert.equal(fl('verre', 10, { multiples: true }).cle, 'ns-m');
  // chaque ligne renvoyée figure dans un tableau de la fiche (data-cle)
  for (const r of [fl('solide', 4), fl('solide', 7), fl('solide', 7, { multiples: true }), fl('solide', 9), fl('solide', 9, { multiples: true }),
    fl('verre', 4), fl('verre', 4, { multiples: true }), fl('verre', 8), fl('mixte', 8, { solide: 3 }), fl('mixte', 8, { solide: 7 }), fl('mixte', 8, { multiples: true })])
    assert.match(HTML, new RegExp(`data-cle="[^"]*\\b${r.cle}\\b`), r.cle);
});

test('temps de doublement', () => {
  const r = R.tempsDoublement({ d1: 8, d2: 10, jours: 180 });
  assert.equal(r.td, 186); assert.equal(r.zone, 'malin'); assert.ok(r.typique); assert.ok(r.evolutif);
  assert.equal(R.tempsDoublement({ d1: '10', d2: '10,5', jours: 730 }).zone, 'stable');
  assert.equal(R.tempsDoublement({ d1: 10, d2: 10.5, jours: 730 }).evolutif, false);
  assert.equal(R.tempsDoublement({ d1: 10, d2: 9, jours: 100 }).zone, 'pas-de-croissance');
  assert.equal(R.tempsDoublement({ d1: 10 }), null);
});

test('atelier : arguments et classement', () => {
  assert.equal(R.arguments({ densite: 'solide', contours: 'lobules', graisse: true, calcif: 4 }).classement, 'suspect', 'lobulations : signe de malignité');
  assert.equal(R.arguments({ densite: 'solide', contours: 'reguliers', graisse: true, calcif: 4 }).classement, 'benin');
  assert.match(R.arguments({ densite: 'solide', graisse: true, calcif: 4 }).liste.map(x => x.texte).join(' '), /Hamartochondrome/);
  assert.equal(R.arguments({ densite: 'solide', calcif: 5 }).classement, 'suspect');
  assert.equal(R.arguments({ densite: 'verre', contours: 'reguliers' }).classement, 'indetermine');
  assert.equal(R.arguments({ densite: 'mixte' }).classement, 'suspect');
  assert.ok(R.arguments({ densite: 'solide', taille: 12 }).liste.some(x => /TEP-scan/.test(x.texte)));
});

test('illustrations SVG', () => {
  for (const densite of ['solide', 'verre', 'mixte']) for (const contours of ['reguliers', 'lobules', 'spicules'])
    assert.match(N.nodule({ densite, contours }), /^<svg[\s\S]*<\/svg>$/);
  for (let t = 1; t <= 6; t++) assert.ok(N.nodule({ calcif: t, fenetre: 'mediastin' }).includes('#ffffff'), `type ${t}`);
  assert.equal(N.nodule({ densite: 'solide', contours: 'spicules', graine: 3 }), N.nodule({ densite: 'solide', contours: 'spicules', graine: 3 }), 'dessin reproductible');
  // flèches de mesure : identifiants uniques (pas de conflit avec les id de la page)
  const a = N.nodule({ mesure: true }), b = N.nodule({ mesure: true });
  assert.notEqual(a.match(/marker id="([^"]+)"/)[1], b.match(/marker id="([^"]+)"/)[1]);
  for (const f of ['ganglion', 'atelectasie', 'radiographie']) assert.match(N[f](), /<svg/);
  for (const m of ['concentrique', 'asymetrique', 'solide']) assert.match(N.croissance(m), /<svg/);
  for (const c of R.CAS) assert.match(N.nodule(c.dessin), /<svg/);
  assert.equal(R.CAS.length, 8);
});

test('fiche : sections, lexique de l\'auteur, scripts, carte', () => {
  for (const id of ['introduction', 'exploration', 'caracterisation', 'atelier', 'benignite', 'malignite', 'croissance', 'tep', 'fleischner', 'compte-rendu', 'testez-vous'])
    assert.ok(HTML.includes(`id="${id}"`), id);
  for (const t of ['Environ 20 % des images nodulaires sont des faux nodules :', 'CTDIvol &lt; 3 mGy,', 'paroi &gt; 15 mm associée à une malignité dans 95 % des cas.',
    '80-90 % des nodules mixtes &lt; 20 mm sont des adénocarcinomes.', 'Nodule solide malin : TD 30-500 jours, typiquement 100-400 jours.', 'cibler impérativement la portion solide.',
    'une biopsie négative n’exclut pas la malignité.', 'Solide stable 2 ans = bénignité.'])
    assert.ok(HTML.includes(t), t);
  // les id des formulaires ne doivent pas être repris par les dessins
  for (const id of ['np-fl', 'np-td', 'np-atelier']) assert.equal((HTML.match(new RegExp(`id="${id}"`, 'g')) || []).length, 1, id);
  for (const s of ['../regles/nodule-pulmonaire.js', 'poumon/nodule-svg.js', 'poumon/nodule-fiche.js']) assert.ok(HTML.includes(`<script src="${s}?v=`), s);
  assert.equal((HTML.match(/<body/g) || []).length, 1);
  assert.match(fs.readFileSync(path.join(RACINE, 'fiches-rapides.html'), 'utf8'), /<a class="fiche-card" data-spe="thorax" href="fiches\/nodule-pulmonaire\.html"/);
});
