/* Remplacements — agenda du remplaçant et planning de la structure (remplacements/agenda.js) */
const test = require('node:test');
const assert = require('node:assert/strict');
const AG = require('../remplacements/agenda.js');

const S1 = { id: 'struct-orangers', nom: 'Clinique Les Orangers' };
const S2 = { id: 'struct-lac', nom: 'Cabinet Radio du Lac' };
const dem = (id, s, dates, etat, honoraires = 500) => ({ id, structure_id: s.id, dates, etat, honoraires, heure_debut: '08:00', heure_fin: '16:00' });
const ligne = (d, s, etatP) => ({ proposition: { id: `p-${d.id}`, etat: etatP }, demande: d, structure: s });

const PROPS = [
  ligne(dem('m1', S1, ['2026-11-03', '2026-11-02'], 'pourvue', 500), S1, 'retenu'),           // deux jours, dates non triées
  ligne(dem('m2', S2, ['2026-11-09'], 'pourvue', 450), S2, 'retenu'),
  ligne(dem('m3', S1, ['2026-11-30', '2026-12-01'], 'pourvue', 400), S1, 'retenu'),           // à cheval sur deux mois
  ligne(dem('m4', S1, ['2026-10-20'], 'realisee', 300), S1, 'retenu'),
  ligne(dem('p1', S2, ['2026-11-17'], 'publiee', 480), S2, 'envoyee'),
  ligne(dem('p2', S1, ['2026-11-18', '2026-11-19'], 'publiee', 250), S1, 'interesse'),
  ligne(dem('x1', S1, ['2026-11-20'], 'publiee'), S1, 'decline'),
  ligne(dem('x2', S2, ['2026-11-21'], 'pourvue'), S2, 'pourvu_autre'),
  ligne(dem('x3', S2, ['2026-11-22'], 'annulee'), S2, 'annulee'),
  ligne(dem('x4', S1, ['2026-11-23'], 'pourvue'), S1, 'expiree'),
];
const DISPOS = [{ date: '2026-11-05', creneau: 'journee' }, { date: '2026-11-02', creneau: 'journee' }];

test('agenda du remplaçant : missions de toutes les structures, propositions, disponibilités', () => {
  const A = AG.agendaRemplacant({ propositions: PROPS, disponibilites: DISPOS, mois: '2026-11' });
  assert.deepEqual(A.missions.map(e => [e.id, e.statut]), [['m4', 'realisee'], ['m1', 'mission'], ['m2', 'mission'], ['m3', 'mission']]);
  assert.deepEqual(A.propositions.map(e => [e.id, e.statut]), [['p1', 'a_repondre'], ['p2', 'en_attente']]);
  assert.deepEqual(A.structures.map(s => s.nom), ['Cabinet Radio du Lac', 'Clinique Les Orangers']);
  // refus, poste pourvu par un autre, annulation, proposition close : absents
  ['x1', 'x2', 'x3', 'x4'].forEach(id => assert.ok(![...A.missions, ...A.propositions].some(e => e.id === id), id));
  assert.deepEqual(A.jours['2026-11-05'].creneaux, ['journee']);
  assert.equal(A.jours['2026-11-02'].missions.length, 1, 'jour de mission ; la disponibilité reste connue');
});

test('mission sur plusieurs jours : un seul élément, jour n sur N, dates triées', () => {
  const A = AG.agendaRemplacant({ propositions: PROPS, mois: '2026-11' });
  const j1 = A.jours['2026-11-02'].missions[0], j2 = A.jours['2026-11-03'].missions[0];
  assert.equal(j1.element, j2.element, 'même mission');
  assert.deepEqual([j1.rang, j1.total, j2.rang, j2.total], [1, 2, 2, 2]);
  assert.deepEqual(j1.element.dates, ['2026-11-02', '2026-11-03']);
  assert.equal(A.missions.filter(e => e.id === 'm1').length, 1);
});

test('honoraires : confirmés (missions) et potentiels (propositions) comptés sur les jours du mois', () => {
  const nov = AG.agendaRemplacant({ propositions: PROPS, mois: '2026-11' }).resume;
  assert.equal(nov.confirmes, 500 * 2 + 450 + 400, 'm3 : seul le 30/11 compte en novembre');
  assert.equal(nov.potentiels, 480 + 250 * 2);
  assert.equal(nov.jours, 4);
  assert.equal(nov.missions, 3);
  assert.equal(nov.structures, 2);
  assert.equal(nov.propositions, 1, 'une seule proposition à répondre');
  const dec = AG.agendaRemplacant({ propositions: PROPS, mois: '2026-12' }).resume;
  assert.deepEqual([dec.confirmes, dec.jours, dec.potentiels], [400, 1, 0]);
  assert.equal(AG.agendaRemplacant({ propositions: PROPS, mois: '2026-10' }).resume.confirmes, 300, 'mission réalisée comptée');
});

test('filtre par structure : missions, propositions et résumé de la structure masquée retirés', () => {
  const A = AG.agendaRemplacant({ propositions: PROPS, mois: '2026-11', masquees: new Set([S2.id]) });
  assert.ok(!A.missions.some(e => e.structure.id === S2.id));
  assert.ok(!A.jours['2026-11-17'] || !A.jours['2026-11-17'].propositions.length);
  assert.equal(A.resume.confirmes, 500 * 2 + 400);
  assert.equal(A.structures.length, 2, 'la structure masquée reste proposée dans les filtres');
});

test('couleurs : stables, distinctes entre structures affichées, jamais celles des statuts', () => {
  assert.equal(AG.couleurStructure('abc'), AG.couleurStructure('abc'));
  ['crimson', 'green', 'teal'].forEach(c => assert.ok(!AG.COULEURS.includes(c), c));
  const ids = Array.from({ length: AG.COULEURS.length }, (_, i) => `structure-${i * 7}`);
  const m = AG.couleursStructures(ids);
  assert.equal(new Set(m.values()).size, ids.length);
  assert.deepEqual([...AG.couleursStructures([...ids].reverse()).entries()].sort(), [...m.entries()].sort(), 'indépendant de l\'ordre');
  const A = AG.agendaRemplacant({ propositions: PROPS, mois: '2026-11' });
  assert.notEqual(A.structures[0].couleur, A.structures[1].couleur);
});

test('planning de la structure : statuts, jour sans demande, budget confirmé et potentiel', () => {
  const r = { id: 'r1', profil: { prenom: 'Amel', nom: 'TEST' } };
  const i = (rid, etat) => ({ proposition: { etat }, remplacant: { id: rid, profil: {} }, favori: false });
  const demandes = [
    { demande: { ...dem('d1', S1, ['2026-11-02', '2026-11-03'], 'pourvue', 500), remplacant_id: 'r1' }, compteurs: {}, interesses: [{ proposition: { etat: 'retenu' }, remplacant: r }] },
    { demande: dem('d2', S1, ['2026-11-10'], 'publiee', 450), compteurs: { contactes: 3 }, interesses: [i('a', 'interesse'), i('b', 'interesse'), i('c', 'decline')] },
    { demande: dem('d3', S1, ['2026-11-12'], 'publiee', 300), compteurs: { contactes: 2 }, interesses: [i('a', 'envoyee')] },
    { demande: dem('d4', S1, ['2026-11-14'], 'annulee'), compteurs: {}, interesses: [] },
    { demande: dem('d5', S1, ['2026-11-15'], 'expiree'), compteurs: {}, interesses: [] },
    { demande: dem('d6', S1, ['2026-10-30'], 'realisee', 200), compteurs: {}, interesses: [] },
  ];
  const P = AG.planningStructure({ demandes, mois: '2026-11' });
  assert.deepEqual(P.elements.map(e => [e.id, e.statut]), [['d6', 'realisee'], ['d1', 'confirmee'], ['d2', 'volontaires'], ['d3', 'recherche']]);
  assert.equal(P.jours['2026-11-02'][0].element.retenu, r);
  assert.equal(P.jours['2026-11-03'][0].rang, 2);
  assert.equal(P.jours['2026-11-10'][0].element.volontaires.length, 2);
  assert.equal(P.jours['2026-11-14'], undefined, 'demande annulée : rien au planning');
  assert.equal(P.jours['2026-11-11'], undefined, 'jour sans demande : aucun élément (pas un manque)');
  assert.deepEqual(P.resume, { joursConfirmes: 2, joursAPourvoir: 2, volontaires: 2, budgetConfirme: 1000, budgetPotentiel: 750 });
});

test('export .ics du mois : un seul calendrier, un événement par jour, identifiants distincts', () => {
  const e = (uid, dates, debut = '08:00', fin = '16:00') => ({ uid, titre: `Remplacement — ${uid}`, lieu: 'Tunis', description: 'Scanner', dates, heure_debut: debut, heure_fin: fin });
  const t = AG.icsMois([e('m1', ['2026-11-02', '2026-11-03']), e('m2', ['2026-11-09'], '20:00', '08:00')], new Date('2026-10-29T10:00:00Z'));
  assert.equal((t.match(/BEGIN:VCALENDAR/g) || []).length, 1);
  assert.equal((t.match(/END:VCALENDAR/g) || []).length, 1);
  assert.equal((t.match(/BEGIN:VTIMEZONE/g) || []).length, 1);
  const uids = [...t.matchAll(/^UID:(.+)$/gm)].map(m => m[1].trim());
  assert.deepEqual(uids, ['m1-2026-11-02@radiologichub', 'm1-2026-11-03@radiologichub', 'm2-2026-11-09@radiologichub']);
  assert.match(t, /DTEND;TZID=Africa\/Tunis:20261110T080000/, 'garde : fin le lendemain');
  assert.ok(t.endsWith('END:VCALENDAR\r\n'));
  assert.equal(AG.icsMois([], new Date()), '');
});

test('semaine : lundi de la date', () => {
  assert.equal(AG.lundi('2026-11-05'), '2026-11-02');
  assert.equal(AG.lundi('2026-11-02'), '2026-11-02');
  assert.equal(AG.lundi('2026-11-08'), '2026-11-02');
});
