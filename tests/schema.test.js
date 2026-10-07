/* Tests du schéma anatomique — cas FICTIFS uniquement (aucune donnée patient).
   Lancer : npm test   (ou : node --test tests/*.test.js) */
const test = require('node:test');
const assert = require('node:assert/strict');
const R = require('../suivi/registre.js');
const { localiser, etatLesion, svgSchema } = require('../suivi/schema.js');

const CX = 180;   // axe du corps ; droite du patient = gauche de l'image (x < 180)
const loc = (organe, territoire = '', ganglion = false) => localiser({ organe, territoire, ganglion });

test('placement : organes, côtés et segments', () => {
  const s7 = loc('Foie', 'segment VII');
  assert.equal(s7.zone, 'foie, segment VII');
  assert.ok(s7.x < CX, 'foie droit à gauche de l\'image');
  assert.equal(loc('Foie', 'S7').zone, 'foie, segment VII');
  assert.equal(loc('Foie', 'segment IVa').zone, 'foie, segment IV');
  assert.ok(loc('Poumon gauche', 'LIG').x > CX);
  assert.equal(loc('Poumon gauche', 'LIG').zone, 'poumon gauche, lobe inférieur');
  assert.ok(loc('Poumon', 'LSD').x < CX, 'LSD = poumon droit même sans « droit »');
  assert.ok(loc('Surrénale droite').x < CX && loc('Surrénale gauche').x > CX);
  assert.ok(loc('Rein gauche').x > CX);
  assert.equal(loc('Rate').zone, 'rate');
  assert.equal(loc('Encéphale', 'lobe temporal gauche').zone, 'encéphale', '« lobe » ne doit pas envoyer au poumon');
});

test('placement : stations ganglionnaires (RECIST et Lugano)', () => {
  assert.equal(loc('Ganglion', 'lombo-aortique', true).zone, 'ganglion lombo-aortique');
  assert.equal(loc('Adénopathie', 'cœliaque').zone, 'ganglion cœliaque', 'mot « adénopathie » et ligature œ');
  assert.equal(loc('Ganglion', 'sous-carénaire', true).zone, 'ganglion sous-carénaire');
  const axD = loc('Ganglion', 'axillaire droit', true), axG = loc('Ganglion', 'axillaire gauche', true);
  assert.ok(axD.x < CX && axG.x > CX);
  assert.equal(loc('Ganglion', 'iliaque externe gauche', true).zone, 'ganglion iliaque', 'ganglion iliaque ≠ os iliaque');
  assert.equal(loc('Ganglion', '', true), null, 'station non précisée → non placé');
});

test('placement : os et rachis', () => {
  assert.deepEqual(loc('Os', 'L3'), { x: CX, y: 385, zone: 'rachis, L3' });
  assert.equal(loc('Os', 'T12').zone, 'rachis, D12');
  assert.equal(loc('Os', 'colonne lombaire').zone, 'rachis', '« colonne » n\'est pas le côlon');
  assert.ok(loc('Os', 'fémur gauche').x > CX);
  assert.equal(loc('Os', 'aile iliaque droite').zone, 'bassin');
});

test('placement : organe inconnu ou vide → non placé', () => {
  assert.equal(loc('Tissus mous'), null);
  assert.equal(loc(''), null);
  assert.equal(loc('Organe imaginaire', 'quelque part'), null);
});

/* Suivi fictif : baseline + contrôles ; on ne s'intéresse qu'aux états par lésion */
function suivi() {
  const s = R.creerSuivi({ pseudo: 'TEST-SCHEMA' });
  const e1 = R.ajouterExamen(s, { date: '2026-01-10', modalite: 'TDM' });
  R.ajouterLesion(s, e1.id, { type: 'cible', organe: 'Foie', territoire: 'segment VII' });          // C1
  R.ajouterLesion(s, e1.id, { type: 'cible', organe: 'Ganglion', territoire: 'lombo-aortique', ganglion: true }); // C2
  R.ajouterLesion(s, e1.id, { type: 'non-cible', organe: 'Os', territoire: 'L3' });                 // NC1
  R.majMesure(s, e1.id, 'C1', { valeur: '30' });
  R.majMesure(s, e1.id, 'C2', { valeur: '20' });
  R.majMesure(s, e1.id, 'NC1', { statut: 'presente' });
  return { s, e1 };
}
const etats = (s, exId) => Object.fromEntries(R.comparatif(s, exId).lignes.map(r => [r.lesion.id, etatLesion(r)]));

test('états : baseline, baisse ≥ 30 %, ganglion < 10 mm, stable, à saisir', () => {
  const { s, e1 } = suivi();
  assert.deepEqual(etats(s, e1.id), { C1: 'baseline', C2: 'baseline', NC1: 'baseline' });
  const e2 = R.ajouterExamen(s, { date: '2026-03-10' });
  assert.equal(etats(s, e2.id).C1, 'na', 'mesure non saisie → à saisir');
  R.majMesure(s, e2.id, 'C1', { valeur: '21' });   // −30 % vs baseline
  R.majMesure(s, e2.id, 'C2', { valeur: '8' });    // ganglion < 10 mm (petit axe)
  R.majMesure(s, e2.id, 'NC1', { statut: 'disparue' });
  assert.deepEqual(etats(s, e2.id), { C1: 'baisse', C2: 'baisse', NC1: 'baisse' });
  R.majMesure(s, e2.id, 'C1', { valeur: '22' });   // −26,7 % : pas assez
  R.majMesure(s, e2.id, 'C2', { valeur: '12' });   // ganglion encore ≥ 10 mm, −40 % : baisse
  assert.equal(etats(s, e2.id).C1, 'stable');
  assert.equal(etats(s, e2.id).C2, 'baisse');
  R.majMesure(s, e2.id, 'C1', { statut: 'disparue' });
  assert.equal(etats(s, e2.id).C1, 'baisse', 'disparue (0 mm)');
  R.majMesure(s, e2.id, 'C1', { statut: 'trop-petite' });
  assert.equal(etats(s, e2.id).C1, 'baisse', 'trop petite = 5 mm, −83 %');
  R.majMesure(s, e2.id, 'C1', { statut: 'non-evaluable', motif: 'artéfact' });
  assert.equal(etats(s, e2.id).C1, 'ne');
});

test('états : hausse vs nadir (≥ 20 % ET ≥ 5 mm), réapparition, nouvelle lésion, non-cible en progression', () => {
  const { s } = suivi();
  const e2 = R.ajouterExamen(s, { date: '2026-03-10' });
  R.majMesure(s, e2.id, 'C1', { valeur: '20' });   // nadir de C1 : 20 mm
  R.majMesure(s, e2.id, 'C2', { valeur: '15' });
  const e3 = R.ajouterExamen(s, { date: '2026-05-10' });
  R.majMesure(s, e3.id, 'C1', { valeur: '24' });   // +20 % mais +4 mm seulement
  R.majMesure(s, e3.id, 'C2', { valeur: '15' });
  assert.equal(etats(s, e3.id).C1, 'stable', '+4 mm : sous le seuil absolu de 5 mm');
  R.majMesure(s, e3.id, 'C1', { valeur: '25' });   // +25 % et +5 mm vs nadir (mais −17 % vs baseline)
  assert.equal(etats(s, e3.id).C1, 'hausse');
  R.majMesure(s, e3.id, 'NC1', { statut: 'progression' });
  assert.equal(etats(s, e3.id).NC1, 'hausse');
  R.ajouterLesion(s, e3.id, { type: 'nouvelle', organe: 'Poumon droit' });
  assert.equal(etats(s, e3.id).N1, 'hausse', 'nouvelle lésion');
  R.majMesure(s, e3.id, 'N1', { statut: 'non-evaluable', motif: 'mouvement' });
  assert.equal(etats(s, e3.id).N1, 'ne');
});

test('états : lésion disparue au nadir puis réapparue → hausse', () => {
  const { s } = suivi();
  const e2 = R.ajouterExamen(s, { date: '2026-03-10' });
  R.majMesure(s, e2.id, 'C1', { statut: 'disparue' });
  R.majMesure(s, e2.id, 'C2', { valeur: '8' });
  const e3 = R.ajouterExamen(s, { date: '2026-05-10' });
  R.majMesure(s, e3.id, 'C1', { valeur: '4' });
  R.majMesure(s, e3.id, 'C2', { valeur: '8' });
  assert.equal(etats(s, e3.id).C1, 'hausse');
  assert.equal(etats(s, e3.id).C2, 'baisse');
});

test('SVG : autonome, identifiants présents, lésions non placées listées', () => {
  const { s, e1 } = suivi();
  R.ajouterLesion(s, e1.id, { type: 'non-cible', organe: 'Tissus mous' });   // NC2 : non placée
  const { svg, horsSchema } = svgSchema(R.comparatif(s, e1.id), { interactif: true, actif: 'C1' });
  assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
  ['C1', 'C2', 'NC1'].forEach(id => assert.ok(svg.includes(`data-l="${id}"`), id));
  assert.deepEqual(horsSchema, ['NC2']);
  assert.match(svg, /Non placées \(organe à préciser\) : NC2/);
  assert.ok(!svgSchema(R.comparatif(s, e1.id)).svg.includes('data-l='), 'export : pas d\'attribut interactif');
  assert.ok(!/<script|on\w+=/i.test(svg), 'aucun script dans le SVG');
});

test('SVG : texte saisi échappé', () => {
  const s = R.creerSuivi({ pseudo: 'TEST-ESC' });
  const e1 = R.ajouterExamen(s, { date: '2026-01-10' });
  R.ajouterLesion(s, e1.id, { type: 'cible', organe: 'Foie', territoire: 'segment V <b>"x"</b>' });
  const { svg } = svgSchema(R.comparatif(s, e1.id));
  assert.ok(!svg.includes('<b>'));
});
