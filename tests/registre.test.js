/* Tests du registre des lésions — cas FICTIFS uniquement (aucune donnée patient).
   Lancer : npm test   (ou : node --test tests/*.test.js) */
const test = require('node:test');
const assert = require('node:assert/strict');
const R = require('../suivi/registre.js');
const S = require('../suivi/seuils.js');

/* Suivi fictif : baseline + 2 contrôles, 2 cibles (foie, ganglion), 1 non-cible */
function suiviExemple() {
  const s = R.creerSuivi({ pseudo: 'TEST-0001' });
  const e1 = R.ajouterExamen(s, { date: '2026-01-10', modalite: 'TDM', phase: 'portale', epaisseur: '1,25' });
  const c1 = R.ajouterLesion(s, e1.id, { type: 'cible', organe: 'Foie', territoire: 'segment VII' });
  const c2 = R.ajouterLesion(s, e1.id, { type: 'cible', organe: 'Ganglion', territoire: 'lombo-aortique', ganglion: true });
  const nc1 = R.ajouterLesion(s, e1.id, { type: 'non-cible', organe: 'Os', territoire: 'L3' });
  R.majMesure(s, e1.id, c1.id, { valeur: '30', serie: '3', image: '87' });
  R.majMesure(s, e1.id, c2.id, { valeur: '20', serie: '3', image: '120' });
  R.majMesure(s, e1.id, nc1.id, { statut: 'presente' });
  return { s, e1, c1, c2, nc1 };
}

test('création : format, version et identifiant pseudonymisé', () => {
  const s = R.creerSuivi({ pseudo: '  TEST-0002 ' });
  assert.equal(s.format, 'radiologichub-suivi');
  assert.equal(s.version, R.VERSION);
  assert.match(s.id, /^S-[A-Z2-9]{6}$/);
  assert.equal(s.pseudo, 'TEST-0002');
  assert.equal(s.criteres, 'recist11');
  assert.throws(() => R.creerSuivi({ criteres: 'inconnu' }));
});

test('identifiants des lésions : C1, C2, NC1, N1 et jamais réutilisés', () => {
  const { s, e1, c1, c2, nc1 } = suiviExemple();
  assert.deepEqual([c1.id, c2.id, nc1.id], ['C1', 'C2', 'NC1']);
  R.supprimerLesion(s, 'C2');
  const c3 = R.ajouterLesion(s, e1.id, { type: 'cible', organe: 'Poumon' });
  assert.equal(c3.id, 'C3', 'C2 supprimée ne doit pas être réattribuée');
  const e2 = R.ajouterExamen(s, { date: '2026-03-10' });
  assert.equal(R.ajouterLesion(s, e2.id, { type: 'nouvelle', organe: 'Foie' }).id, 'N1');
  assert.throws(() => R.ajouterLesion(s, e2.id, { type: 'autre' }));
});

test('nouvel examen : lésions reportées, mesure vide, série/image et technique reprises', () => {
  const { s } = suiviExemple();
  const e2 = R.ajouterExamen(s, { date: '2026-03-10' });
  assert.equal(e2.baseline, false, 'seul le premier examen est baseline par défaut');
  assert.deepEqual(Object.keys(e2.mesures).sort(), ['C1', 'C2', 'NC1']);
  assert.equal(e2.mesures.C1.valeur, '');
  assert.equal(e2.mesures.C1.statut, '');
  assert.equal(e2.mesures.C1.serie, '3');
  assert.equal(e2.mesures.C1.image, '87');
  assert.equal(e2.modalite, 'TDM');
  assert.equal(e2.phase, 'portale');
  assert.equal(e2.epaisseur, '1,25');
});

test('nouvelle lésion : suivie à partir de son examen d\'apparition seulement', () => {
  const { s, e1 } = suiviExemple();
  const e2 = R.ajouterExamen(s, { date: '2026-03-10' });
  const n1 = R.ajouterLesion(s, e2.id, { type: 'nouvelle', organe: 'Poumon' });
  const e3 = R.ajouterExamen(s, { date: '2026-05-10' });
  assert.ok(!e1.mesures[n1.id]);
  assert.ok(e2.mesures[n1.id]);
  assert.ok(e3.mesures[n1.id]);
  // examen inséré avant la baseline : pas de lésion de la baseline
  const e0 = R.ajouterExamen(s, { date: '2025-12-01' });
  assert.deepEqual(Object.keys(e0.mesures), []);
});

test('lecture des mesures : virgule, point, mm et cm', () => {
  assert.deepEqual(R.lireMm('18'), { ok: true, vide: false, mm: 18 });
  assert.equal(R.lireMm('18,5').mm, 18.5);
  assert.equal(R.lireMm('18.5 mm').mm, 18.5);
  assert.equal(R.lireMm('1,8 cm').mm, 18);
  assert.equal(R.lireMm('2cm').mm, 20);
  assert.equal(R.lireMm('').vide, true);
  assert.equal(R.lireMm('abc').ok, false);
  assert.equal(R.lireMm('-3').ok, false);
  assert.equal(R.lireMm('12 x 8').ok, false);
});

test('valeur retenue : trop petite = 5 mm, disparue = 0 mm, non évaluable = aucune', () => {
  assert.equal(R.valeurMm({ statut: 'trop-petite', valeur: '' }), S.recist.tropPetiteMm);
  assert.equal(R.valeurMm({ statut: 'trop-petite', valeur: '' }), 5);
  assert.equal(R.valeurMm({ statut: 'disparue', valeur: '12' }), 0);
  assert.equal(R.valeurMm({ statut: 'non-evaluable', valeur: '12' }), null);
  assert.equal(R.valeurMm({ statut: '', valeur: '12,5' }), 12.5);
  assert.equal(R.valeurMm({ statut: 'mesuree', valeur: '' }), null);
});

test('somme des diamètres : cibles seulement (ganglion en petit axe), complétude', () => {
  const { s, e1 } = suiviExemple();
  assert.deepEqual(R.sommeCibles(s, e1), { somme: 50, complete: true, manquantes: [], nb: 2 });
  const e2 = R.ajouterExamen(s, { date: '2026-03-10' });
  R.majMesure(s, e2.id, 'C1', { valeur: '24' });
  const sc = R.sommeCibles(s, e2);
  assert.equal(sc.complete, false);
  assert.deepEqual(sc.manquantes, ['C2']);
});

test('nadir : plus petite somme depuis la baseline incluse, examen évalué exclu', () => {
  const { s, e1 } = suiviExemple();                       // baseline : 30 + 20 = 50
  const e2 = R.ajouterExamen(s, { date: '2026-03-10' });  // 20 + 15 = 35
  R.majMesure(s, e2.id, 'C1', { valeur: '20' }); R.majMesure(s, e2.id, 'C2', { valeur: '15' });
  const e3 = R.ajouterExamen(s, { date: '2026-05-10' });  // 22 + 18 = 40
  R.majMesure(s, e3.id, 'C1', { valeur: '22' }); R.majMesure(s, e3.id, 'C2', { valeur: '18' });
  const e4 = R.ajouterExamen(s, { date: '2026-07-10' });  // 10 + 8 = 18 (n'entre pas dans son propre nadir)
  R.majMesure(s, e4.id, 'C1', { valeur: '10' }); R.majMesure(s, e4.id, 'C2', { valeur: '8' });

  assert.equal(R.nadirAvant(s, e1), null, 'pas de nadir pour la baseline elle-même');
  assert.deepEqual(R.nadirAvant(s, e2), { somme: 50, examen: e1 }, 'le nadir peut être la baseline');
  assert.deepEqual(R.nadirAvant(s, e3), { somme: 35, examen: e2 });
  assert.deepEqual(R.nadirAvant(s, e4), { somme: 35, examen: e2 }, 'e3 (40) ne remplace pas le nadir');
});

test('nadir : une somme incomplète est ignorée ; à égalité, le plus ancien', () => {
  const { s } = suiviExemple();                           // 50
  const e2 = R.ajouterExamen(s, { date: '2026-03-10' });
  R.majMesure(s, e2.id, 'C1', { valeur: '5' });           // C2 manquante → somme incomplète
  const e3 = R.ajouterExamen(s, { date: '2026-05-10' });
  R.majMesure(s, e3.id, 'C1', { valeur: '30' }); R.majMesure(s, e3.id, 'C2', { valeur: '20' }); // 50 aussi
  const e4 = R.ajouterExamen(s, { date: '2026-07-10' });
  assert.equal(R.nadirAvant(s, e4).examen.date, '2026-01-10');
});

test('nouvelle baseline (nouvelle ligne de traitement) : baseline et nadir repartent de là', () => {
  const { s } = suiviExemple();                           // 50
  const e2 = R.ajouterExamen(s, { date: '2026-03-10' });
  R.majMesure(s, e2.id, 'C1', { valeur: '10' }); R.majMesure(s, e2.id, 'C2', { valeur: '10' });   // 20
  const e3 = R.ajouterExamen(s, { date: '2026-05-10', baseline: true });
  R.majMesure(s, e3.id, 'C1', { valeur: '25' }); R.majMesure(s, e3.id, 'C2', { valeur: '15' });   // 40
  const e4 = R.ajouterExamen(s, { date: '2026-07-10' });
  assert.equal(R.baselineDe(s, e4).id, e3.id);
  assert.deepEqual(R.nadirAvant(s, e4), { somme: 40, examen: e3 }, 'le 20 de l\'ancienne ligne est oublié');
});

test('tableau comparatif : baseline, nadir, précédent, actuel et variations', () => {
  const { s } = suiviExemple();                           // baseline 30 + 20 = 50
  const e2 = R.ajouterExamen(s, { date: '2026-03-10' });
  R.majMesure(s, e2.id, 'C1', { valeur: '24' }); R.majMesure(s, e2.id, 'C2', { valeur: '16' });   // 40
  const e3 = R.ajouterExamen(s, { date: '2026-05-10' });
  R.majMesure(s, e3.id, 'C1', { valeur: '21' }); R.majMesure(s, e3.id, 'C2', { statut: 'disparue' }); // 21

  const t = R.comparatif(s, e3.id);
  assert.equal(t.baseline.date, '2026-01-10');
  assert.equal(t.precedent.date, '2026-03-10');
  assert.equal(t.nadir.somme, 40);
  const c1 = t.lignes.find(l => l.lesion.id === 'C1');
  assert.equal(c1.baseline.mm, 30);
  assert.equal(c1.nadir.mm, 24);
  assert.equal(c1.precedent.mm, 24);
  assert.equal(c1.actuel.mm, 21);
  assert.deepEqual(c1.dBaseline, { mm: -9, pct: -30 });
  assert.equal(t.somme.actuel.somme, 21);
  assert.equal(t.somme.dBaseline.mm, -29);
  assert.equal(Math.round(t.somme.dBaseline.pct), -58);
  assert.equal(Math.round(t.somme.dNadir.pct * 10) / 10, -47.5);
  // ordre : cibles, non-cibles, nouvelles
  assert.deepEqual(t.lignes.map(l => l.lesion.id), ['C1', 'C2', 'NC1']);
  // à la baseline : pas de variation
  const t1 = R.comparatif(s, 'E1');
  assert.equal(t1.somme.dBaseline, null);
  assert.equal(t1.nadir, null);
});

test('suppression d\'un examen : les lésions qui y étaient enregistrées passent à l\'examen suivant', () => {
  const { s, e1 } = suiviExemple();
  const e2 = R.ajouterExamen(s, { date: '2026-03-10' });
  R.supprimerExamen(s, e1.id);
  assert.equal(R.lesion(s, 'C1').origine, e2.id);
  assert.ok(e2.mesures.C1);
});

test('export / import JSON : aller-retour identique, erreurs explicites', () => {
  const { s } = suiviExemple();
  R.ajouterExamen(s, { date: '2026-03-10' });
  const copie = R.importer(R.exporter(s));
  assert.deepEqual(copie, s);
  assert.throws(() => R.importer('pas du json'), /JSON/);
  assert.throws(() => R.importer('{"format":"autre"}'), /suivi RadiologicHub/);
  assert.throws(() => R.importer(JSON.stringify({ ...s, version: 99 })), /Version/);
  // compteur corrompu : remonté au plus grand identifiant présent
  const d = JSON.parse(R.exporter(s));
  d.compteurs.C = 0;
  assert.equal(R.importer(JSON.stringify(d)).compteurs.C, 2);
});

test('identifiant pseudonymisé : alerte s\'il ressemble à un nom', () => {
  assert.equal(R.ressembleAUnNom('Ahmed Ben Salah'), true);
  assert.equal(R.ressembleAUnNom('Benali'), true);
  assert.equal(R.ressembleAUnNom('TN-ONCO-0142'), false);
  assert.equal(R.ressembleAUnNom(''), false);
});

test('formats français : dates et variations', () => {
  assert.equal(R.dateFr('2026-06-12'), '12/06/2026');
  assert.equal(R.fmtDelta({ mm: -18, pct: -30 }), '−18 mm (−30 %)');
  assert.equal(R.fmtDelta({ mm: 8, pct: 24.24 }), '+8 mm (+24,2 %)');
  assert.equal(R.fmtDelta(null), '—');
});
