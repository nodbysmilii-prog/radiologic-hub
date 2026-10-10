/* Tests des critères de Lake Louise 2018 et du schéma du cœur — cas fictifs, aucune donnée patient. */
const test = require('node:test');
const assert = require('node:assert/strict');
const LL = require('../regles/lakelouise.js');
const C = require('../schemas/coeur.js');

test('Lake Louise : au moins un critère T2 ET un critère T1', () => {
  const r = LL.evaluer(['t2-regional', 'lge']);
  assert.equal(r.niveau, 'positif');
  assert.equal(r.t2, 1);
  assert.equal(r.t1, 1);
  assert.equal(r.controle, false);
  assert.match(LL.conclusion(r), /en faveur d'une myocardite/);
  assert.equal(LL.evaluer(['t2-mapping', 't1-mapping', 'ecv', 'lge']).niveau, 'positif');
});

test('Lake Louise : un seul type de critère → possible, IRM de contrôle à 1-2 semaines', () => {
  const t2 = LL.evaluer(['t2-global', 't2-mapping']);
  assert.equal(t2.niveau, 'possible');
  assert.equal(t2.controle, true);
  assert.match(t2.texte, /1-2 semaines/);
  assert.match(LL.conclusion(t2), /critère T2 isolé/);
  const t1 = LL.evaluer(['lge']);
  assert.equal(t1.niveau, 'possible');
  assert.match(t1.titre, /sans œdème/);
  assert.match(LL.conclusion(t1), /critère T1 isolé/);
});

test('Lake Louise : aucun critère ; contrôle seulement si la clinique est très évocatrice', () => {
  assert.equal(LL.evaluer([]).niveau, 'negatif');
  assert.equal(LL.evaluer([]).controle, false);
  const tres = LL.evaluer([], { tresEvocateur: true });
  assert.equal(tres.controle, true);
  assert.match(LL.conclusion(tres), /1-2 semaines/);
  assert.doesNotMatch(LL.conclusion(LL.evaluer([])), /semaines/);
});

test('Lake Louise : critères de soutien et identifiants inconnus', () => {
  const seul = LL.evaluer(['pericarde', 'cinetique']);
  assert.equal(seul.niveau, 'negatif', 'les critères de soutien seuls ne suffisent pas');
  assert.equal(seul.support, 2);
  assert.match(seul.texte, /ne suffisent pas/);
  assert.match(LL.evaluer(['t2-regional', 'lge', 'pericarde']).texte, /Un critère de soutien/);
  assert.equal(LL.evaluer(['inconnu', 't2-regional', 't2-regional']).t2, 1, 'doublons et inconnus ignorés');
  assert.equal(LL.CRITERES.t2.length + LL.CRITERES.t1.length + LL.CRITERES.support.length, 8);
});

test('cœur : segments AHA, noms et angles', () => {
  assert.equal(C.niveau(5), 'basal');
  assert.equal(C.niveau(11), 'median');
  assert.equal(C.niveau(14), 'apical');
  assert.equal(C.niveau(17), 'apex');
  assert.equal(C.niveau(18), null);
  assert.equal(C.nomSegment(5), 'inféro-latéral basal (segment 5)');
  assert.equal(C.nomSegment(8), 'antéro-septal médian (segment 8)');
  assert.equal(C.nomSegment(16), 'latéral apical (segment 16)');
  // antérieur en haut (270°), septum à gauche (180°), inférieur en bas (90°), latéral à droite (0°)
  const milieu = s => (C.angles(s)[0] + C.angles(s)[1]) / 2;
  assert.equal(milieu(1), 270);
  assert.equal(milieu(4), 90);
  assert.equal(milieu(14), 180);
  assert.equal(milieu(16) % 360, 0);
});

test('cœur : arcs fusionnés, y compris à travers 0°', () => {
  assert.deepEqual(C.arcs([11, 12]), [[300, 420]], 'inféro-latéral + antéro-latéral : paroi latérale continue');
  assert.deepEqual(C.arcs([8, 9]), [[120, 240]], 'septum');
  assert.deepEqual(C.arcs([2, 5]), [[0, 60], [180, 240]], 'segments non contigus : deux arcs');
  assert.deepEqual(C.arcs([13, 16]), [[225, 405]]);
});

test('cœur : figure SVG complète, sans valeur invalide', () => {
  const html = C.figure({ sequence: 'lge', niveau: 'median', lesions: [{ segments: [11, 12], couche: 'sous-epi' }], titre: 'Exemple' });
  assert.match(html, /<svg/);
  assert.match(html, /coeur-oeil/, 'œil-de-bœuf ajouté automatiquement');
  assert.match(html, /segments 11, 12 atteints/);
  assert.doesNotMatch(html, /NaN|undefined/);
  assert.match(C.description({ sequence: 'lge', niveau: 'median', lesions: [{ segments: [8, 9], couche: 'medio' }] }), /médio-pariétal des segments 8, 9/);
  const sans = C.figure({ oeil: false, panneaux: [{ sequence: 't2' }, { sequence: 't1map', lesions: [{ segments: [5], couche: 'transmural' }] }] });
  assert.doesNotMatch(sans, /coeur-oeil/);
  assert.equal((sans.match(/<svg/g) || []).length, 2);
  assert.doesNotMatch(sans, /NaN|undefined/);
  // identifiants SVG uniques d'une coupe à l'autre (plusieurs schémas sur la même page)
  const ids = [...sans.matchAll(/id="([^"]+)"/g)].map(m => m[1]);
  assert.equal(new Set(ids).size, ids.length);
});

test('cœur : échelle de couleurs de la cartographie T1', () => {
  assert.equal(C.couleurT1(800), '#1d3fa8');
  assert.equal(C.couleurT1(950), '#2fa84f');
  assert.equal(C.couleurT1(1300), '#d4174a');
  assert.match(C.couleurT1(1050), /^#[0-9a-f]{6}$/);
});
