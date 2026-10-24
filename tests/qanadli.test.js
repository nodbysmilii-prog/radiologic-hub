/* Tests de l'index d'obstruction de Qanadli — cas fictifs, aucune donnée patient. */
const test = require('node:test');
const assert = require('node:assert/strict');
const Q = require('../regles/qanadli.js');

test('Qanadli : 20 artères segmentaires, 10 par poumon', () => {
  assert.equal(Q.SEGMENTS.length, 20);
  assert.equal(Q.SEGMENTS.filter(s => s.cote === 'D').length, 10);
});

test('Qanadli : score et index', () => {
  const r0 = Q.evaluer({});
  assert.equal(r0.score, 0);
  assert.equal(Q.conclusion(r0), 'Absence d\'embolie pulmonaire.');
  const r1 = Q.evaluer({ segments: { d8: 2, d9: 1 } });
  assert.equal(r1.score, 3);
  assert.equal(r1.index, 7.5);
  assert.equal(Q.conclusion(r1), 'Embolie pulmonaire droite segmentaire, index d\'obstruction de Qanadli à 7,5 % (3/40).');
  const r2 = Q.evaluer({ segments: { g4: 's' } });
  assert.equal(r2.score, 1, 'sous-segmentaire = obstruction partielle');
  assert.match(Q.conclusion(r2), /gauche sous-segmentaire/);
});

test('Qanadli : un embole proximal compte pour toutes les artères d\'aval', () => {
  const r = Q.evaluer({ proximaux: { apd: 2 } });
  assert.equal(r.score, 20);
  assert.equal(r.index, 50);
  assert.ok(r.severe);
  assert.equal(Q.texte(r), 'Index d\'obstruction artérielle pulmonaire de Qanadli : 20/40, soit 50 % (≥ 40 %).');
  assert.equal(Q.evaluer({ proximaux: { tronc: 2 } }).score, 40);
  const r2 = Q.evaluer({ proximaux: { lid: 1 }, segments: { d8: 2, g7: 1 } });
  assert.equal(r2.score, 7, 'lobaire partielle (5 × 1) + segment total (+1) + gauche (1)');
  assert.equal(Q.conclusion(r2), 'Embolie pulmonaire bilatérale, lobaire à droite et segmentaire à gauche, index d\'obstruction de Qanadli à 17,5 % (7/40).');
  assert.equal(Q.conclusion(Q.evaluer({ proximaux: { lid: 1, lig: 2 } })), 'Embolie pulmonaire bilatérale lobaire, index d\'obstruction de Qanadli à 37,5 % (15/40).');
});

test('Segments : termes de l\'auteur (apical, dorsal, ventral ; latéral, médial du lobe moyen)', () => {
  const noms = id => Q.SEGMENTS.find(s => s.id === id).nom;
  assert.deepEqual(['d1', 'd2', 'd3', 'd4', 'd5'].map(noms), ['apical', 'dorsal', 'ventral', 'latéral', 'médial']);
  assert.deepEqual(['g1', 'g2', 'g3'].map(noms), ['apical', 'dorsal', 'ventral']);
});

test('Description : poumon par poumon, lobe par lobe, accords', () => {
  const d = Q.description({ proximaux: { lid: 1 }, segments: { d1: 2, d2: 2, d3: 1, d9: 's', d10: 's', g4: 1, g7: 2 } });
  assert.deepEqual(d, [
    '• Défects endoluminaux des artères pulmonaires (segmentation de Boyden) :',
    '  – lobe supérieur droit : défects totaux des artères segmentaires apicale et dorsale, défect partiel de l\'artère segmentaire ventrale ;',
    '  – lobe inférieur droit : défect partiel de l\'artère lobaire inférieure, défects sous-segmentaires des segments latéro-basal et postéro-basal ;',
    '  – lingula : défect partiel de l\'artère segmentaire lingulaire supérieure ;',
    '  – lobe inférieur gauche : défect total de l\'artère segmentaire médio-basale.',
  ]);
  assert.deepEqual(Q.description({ proximaux: { apd: 2 } }), [
    '• Défects endoluminaux des artères pulmonaires (segmentation de Boyden) :',
    '  – artère pulmonaire droite : défect total ;',
    '  – poumon gauche : pas de défect endoluminal.',
  ]);
  assert.deepEqual(Q.description({ proximaux: { tronc: 1 } }), [
    '• Défects endoluminaux des artères pulmonaires (segmentation de Boyden) :',
    '  – tronc de l\'artère pulmonaire : défect partiel.',
  ], 'embole du tronc : pas de « poumon sans défect »');
  assert.deepEqual(Q.description({}), ['• Absence de défect endoluminal des artères pulmonaires.']);
  assert.match(Q.description({ segments: { d4: 1, d5: 1, d6: 2 } }).join('\n'), /lobe moyen : défects partiels des artères segmentaires latérale et médiale ;\n  – lobe inférieur droit : défect total de l'artère segmentaire apicale \(Nelson\) ;/);
});

test('Intégration au modèle « embolie pulmonaire » : lignes remplacées, réinsertion sans doublon', () => {
  const fs = require('fs'), path = require('path');
  const CR = fs.readFileSync(path.join(__dirname, '..', 'cr-data.js'), 'utf8');
  const modele = CR.match(/text: `(ANGIOSCANNER THORACIQUE — RECHERCHE D'EMBOLIE[\s\S]*?)`/)[1];
  const r = Q.integrer(modele, { segments: { d1: 2, g7: 1 } });
  assert.ok(!r.creee);
  assert.ok(!r.texte.includes('[Absence de défect endoluminal'));
  assert.ok(!r.texte.includes('[x]/40'));
  assert.ok(!r.texte.includes('[Absence d\'embolie pulmonaire'));
  assert.match(r.texte, /Étude vasculaire :\n• Défects endoluminaux[^\n]*\n  – lobe supérieur droit : défect total de l'artère segmentaire apicale ;\n  – lobe inférieur gauche : défect partiel de l'artère segmentaire médio-basale\.\n• Index d'obstruction artérielle pulmonaire de Qanadli : 3\/40, soit 7,5 %\.\n• \[Absence de dilatation des cavités droites/);
  assert.match(r.texte, /CONCLUSION :\nEmbolie pulmonaire bilatérale segmentaire, index d'obstruction de Qanadli à 7,5 % \(3\/40\)\.$/);
  const r2 = Q.integrer(r.texte, { proximaux: { apg: 2 } });
  assert.equal((r2.texte.match(/Défects endoluminaux/g) || []).length, 1);
  assert.equal((r2.texte.match(/Index d'obstruction/g) || []).length, 1);
  assert.match(r2.texte, /– artère pulmonaire gauche : défect total ;\n  – poumon droit : pas de défect endoluminal\.|– poumon droit : pas de défect endoluminal ;\n  – artère pulmonaire gauche : défect total\./);
  assert.match(r2.texte, /CONCLUSION :\nEmbolie pulmonaire gauche proximale, index d'obstruction de Qanadli à 50 % \(20\/40\)\.$/);
  const r3 = Q.integrer(r2.texte, {});
  assert.match(r3.texte, /Étude vasculaire :\n• Absence de défect endoluminal des artères pulmonaires\.\n• Index d'obstruction artérielle pulmonaire de Qanadli : 0\/40, soit 0 %\./);
  assert.match(r3.texte, /CONCLUSION :\nAbsence d'embolie pulmonaire\.$/);
  assert.equal(Q.integrer('Texte libre sans rubrique', {}), null, 'sans rubrique : insertion au curseur');
  const libre = Q.integrer('RÉSULTATS :\nParenchyme normal.', { segments: { d8: 2 } });
  assert.match(libre.texte, /^RÉSULTATS :\n• Défects[\s\S]*\n• Index[^\n]*\nParenchyme normal\.\n\nCONCLUSION :\nEmbolie pulmonaire droite segmentaire/);
  assert.ok(libre.creee);
});
