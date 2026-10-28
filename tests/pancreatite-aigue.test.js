/* Tests de la fiche « Imagerie de la pancréatite aiguë » (fiches/pancreatite-aigue.html),
   des règles (regles/pancreatite.js), des coupes dessinées (fiches/pancreas/pancreas-svg.js)
   et du modèle 3D (public/models/pancreas/).
   Lancer : npm test   (ou : node --test tests/pancreatite-aigue.test.js) */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const R = require('../regles/pancreatite.js');
const P = require('../fiches/pancreas/pancreas-svg.js');
const RACINE = path.join(__dirname, '..');
const HTML = fs.readFileSync(path.join(RACINE, 'fiches', 'pancreatite-aigue.html'), 'utf8');
const MODELE = JSON.parse(fs.readFileSync(path.join(RACINE, 'public', 'models', 'pancreas', 'pancreas.json'), 'utf8'));

test('Atlanta 2012 : diagnostic (2 des 3 critères) et sévérité', () => {
  assert.equal(R.atlantaDiagnostic({ douleur: true }).retenu, false);
  const d = R.atlantaDiagnostic({ douleur: true, enzymes: true });
  assert.ok(d.retenu); assert.ok(d.sansImagerie);
  assert.ok(R.atlantaDiagnostic({ douleur: true, imagerie: true }).retenu);
  assert.equal(R.severite({ defaillance: 'aucune' }).cle, 'peu');
  assert.equal(R.severite({ defaillance: 'aucune', locales: true }).cle, 'moderee');
  assert.equal(R.severite({ defaillance: 'transitoire' }).cle, 'moderee');
  assert.equal(R.severite({ defaillance: 'persistante', locales: true }).cle, 'grave');
});

test('CTSI : Balthazar + nécrose, pronostic', () => {
  assert.equal(R.ctsi('A', 'aucune').index, 0);
  assert.equal(R.ctsi('C', 'moins30').index, 4);
  const max = R.ctsi('E', 'plus50');
  assert.equal(max.index, 10); assert.equal(max.mortalite, 17); assert.equal(max.morbidite, 92);
  assert.equal(R.ctsi('D', 'aucune').morbidite, 8, 'index 3 rangé avec les < 3');
  assert.equal(R.ctsi('B', '30a50').mortalite, 6);
  assert.equal(R.ctsi('Z', 'aucune'), null);
});

test('collections, moment du scanner, contraste', () => {
  assert.equal(R.collection('POI', 2).cle, 'clap');
  assert.equal(R.collection('POI', 6).cle, 'pk');
  assert.equal(R.collection('PN', 3).cle, 'can');
  assert.equal(R.collection('PN', 8).cle, 'nop');
  assert.equal(R.collection('X', 2), null);
  assert.equal(R.momentTdm({ heures: 12, grave: true }).cle, 'emblee');
  assert.equal(R.momentTdm({ heures: 24 }).cle, 'tot');
  assert.equal(R.momentTdm({ heures: 60 }).cle, 'possible');
  assert.equal(R.momentTdm({ heures: 80 }).cle, 'bien');
  assert.equal(R.momentTdm({ heures: 140 }).cle, 'ideal');
  assert.deepEqual(R.contraste(70), { min: 105, max: 140, debit: '3-4cc/s' });
  assert.equal(R.CAS.length, 8);
  for (const k of Object.keys(R.COLLECTIONS)) assert.equal(R.CAS.filter(c => c.rep === k).length, 2, k);
});

test('coupes dessinées : segments, espaces, collections, schémas', () => {
  for (const niveau of ['haut', 'bas']) {
    const s = P.coupe({ niveau, espaces: true, interactif: true });
    assert.match(s, /^<svg[\s\S]*<\/svg>$/);
    for (const id of Object.keys(P.PAN[niveau])) assert.ok(s.includes(`data-segment="${id}"`), `${niveau} ${id}`);
    for (const id of P.espacesDuNiveau(niveau)) { assert.ok(s.includes(`data-espace="${id}"`), `${niveau} ${id}`); assert.ok(P.ESPACES[id], id); }
  }
  assert.ok(P.espacesDuNiveau('haut').includes('bourse') && P.espacesDuNiveau('haut').includes('epra'));
  assert.ok(P.espacesDuNiveau('bas').includes('mesentere') && P.espacesDuNiveau('bas').includes('gouttiere-d'));
  // les 5 segments existent sur au moins un niveau et dans le modèle 3D
  const segs = new Set([...Object.keys(P.PAN.haut), ...Object.keys(P.PAN.bas)]);
  assert.deepEqual([...segs].sort(), Object.keys(P.SEGMENTS).sort());
  for (const k of Object.keys(P.SEGMENTS)) assert.ok(MODELE.structures.some(s => s.id === 'pancreas-' + k && s.segment === k), k);
  for (const k of Object.keys(P.COLLECTIONS)) assert.ok(P.coupe({ collection: k }).includes(P.COLLECTIONS[k].abr), k);
  assert.ok(P.coupe({ collection: 'can', gaz: true }).split('fill="#000"').length > 10, 'bulles de gaz');
  for (const t of ['intra', 'mixte', 'extra']) assert.match(P.necrose(t), /<svg/);
  for (const t of ['modale', 'I', 'II', 'III']) assert.match(P.divisum(t), /<svg/);
  assert.match(P.deconnexion(), /canal déconnecté/); assert.match(P.annulaire(), /D2/);
});

test('modèle 3D : fichiers, licence, structures', () => {
  for (const f of ['pancreas.glb', 'pancreas.json', 'LICENSE-Z-Anatomy.txt']) assert.ok(fs.existsSync(path.join(RACINE, 'public', 'models', 'pancreas', f)), f);
  for (const id of ['duodenum', 'rate', 'vms', 'ams', 'veine-splenique', 'wirsung', 'vbp', 'aorte']) assert.ok(MODELE.structures.some(s => s.id === id), id);
  assert.ok(MODELE.octets < 700000, 'modèle léger');
});

test('fiche : sections, lexique de l\'auteur, scripts, carte', () => {
  for (const id of ['introduction', 'anatomie', 'anapath', 'exploration', 'diagnostic', 'espaces', 'severite', 'evolution', 'complications', 'etiologie', 'testez-vous'])
    assert.ok(HTML.includes(`id="${id}"`), id);
  for (const t of ['Inflammation aigue de la glande pancréatique en rapport avec son autodigestion par ses propres enzymes.', 'Temps pancréatique (45s\')', 'Injection PDC (1.5-2cc/kg) Débit (3-4cc/s)',
    '→ Une échographie normale n\'écarte pas le diagnostic.', 'bulles de gaz dans les collections +++', 'A. splénique +++ &gt; A. pancréatico-duodénale &gt; A. gastroduodénal',
    'Nécrose pancréatique &gt; 2 cm lors de l\'épisode de PA', '*Cytolyse (ALAT &gt; 3NL) → évocateur de l\'origine biliaire (&gt;95%)'])
    assert.ok(HTML.includes(t), t);
  for (const s of ['../regles/pancreatite.js', 'pancreas/pancreas-svg.js']) assert.ok(HTML.includes(`<script src="${s}?v=`), s);
  assert.ok(HTML.includes('<script type="module" src="pancreas/pancreatite-fiche.js?v='));
  assert.equal((HTML.match(/<body/g) || []).length, 1);
  assert.match(fs.readFileSync(path.join(RACINE, 'fiches-rapides.html'), 'utf8'), /<a class="fiche-card" data-spe="digestif" href="fiches\/pancreatite-aigue\.html"/);
});
