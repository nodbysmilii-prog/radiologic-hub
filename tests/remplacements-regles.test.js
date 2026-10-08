/* Remplacements — référentiels, formats tunisiens et règles de compatibilité (cas fictifs) */
const test = require('node:test');
const assert = require('node:assert/strict');
const REF = require('../remplacements/noyau/referentiel.js');
const REG = require('../remplacements/noyau/regles.js');

test('formats : dates JJ/MM/AAAA, montants en TND, fuseau Africa/Tunis', () => {
  assert.equal(REF.dateFr('2026-10-15'), '15/10/2026');
  assert.equal(REF.lireDateFr('5/3/2027'), '2027-03-05');
  assert.equal(REF.lireDateFr('31/02/2027'), null, 'date impossible');
  assert.equal(REF.jourFr('2026-10-15'), 'jeudi 15/10/2026');
  assert.equal(REF.montant(1250), '1 250 TND');
  assert.equal(REF.montant(450.5), '450,5 TND');
  assert.equal(REF.moisFr('2026-10'), 'octobre 2026');
  // Tunis = UTC+1 : 08:00 à Tunis = 07:00 UTC
  assert.equal(REF.instant('2026-10-15', '08:00').toISOString(), '2026-10-15T07:00:00.000Z');
  assert.equal(REF.dateLocale(new Date('2026-10-15T23:30:00Z')), '2026-10-16', 'minuit passé à Tunis');
  assert.equal(REF.heureLocale(new Date('2026-10-15T07:05:00Z')), '08:05');
  assert.equal(REF.ajouterJours('2026-12-31', 1), '2027-01-01');
  assert.ok(REF.telephoneValide('+216 98 123 456') && REF.telephoneValide('71123456'));
  assert.ok(!REF.telephoneValide('12345'));
  assert.equal(REF.GOUVERNORATS.length, 24);
  assert.deepEqual(REF.ANNEES, [3, 4, 5]);
});

test('créneaux : la disponibilité couvre-t-elle le type de remplacement ?', () => {
  const j = { type: 'journee' }, m = { type: 'demi_journee', heure_debut: '08:00' }, am = { type: 'demi_journee', heure_debut: '14:00' };
  assert.ok(REG.couvre(['journee'], j));
  assert.ok(REG.couvre(['matin', 'apres_midi'], j), 'matin + après-midi = journée');
  assert.ok(!REG.couvre(['matin'], j));
  assert.ok(REG.couvre(['matin'], m) && !REG.couvre(['matin'], am));
  assert.ok(REG.couvre(['journee'], am), 'une journée couvre une demi-journée');
  assert.ok(REG.couvre(['garde'], { type: 'garde' }) && !REG.couvre(['journee'], { type: 'garde' }));
  assert.ok(REG.couvre(['garde'], { type: 'week_end' }) && REG.couvre(['journee'], { type: 'week_end' }));
  assert.ok(!REG.couvre([], j));
});

const S = { id: 's1', gouvernorat: 'Tunis' };
const D = { id: 'd1', type: 'journee', dates: ['2026-10-15', '2026-10-16'], modalites: ['scanner', 'echographie'], profil: 'residents', annee_min: 4, heure_debut: '08:00', heure_fin: '16:00' };
const dispoOk = { '2026-10-15': ['journee'], '2026-10-16': ['matin', 'apres_midi'] };
const R = (champs = {}) => ({ id: 'r', etat: 'valide', statut: 'specialiste', gouvernorats: ['Tunis'], competences: ['scanner', 'echographie', 'irm'], ...champs });

test('compatibilité : profil, gouvernorat, compétences, disponibilités, conflits', () => {
  assert.ok(REG.compatible(R(), D, S, dispoOk).ok, 'spécialiste compatible');
  assert.ok(REG.compatible(R({ statut: 'resident', annee_residanat: 4 }), D, S, dispoOk).ok, 'R4 accepté (année minimale 4)');
  assert.deepEqual(REG.compatible(R({ statut: 'resident', annee_residanat: 3 }), D, S, dispoOk).raisons, ['année de résidanat inférieure à R4']);
  assert.ok(!REG.compatible(R({ statut: 'resident', annee_residanat: 5 }), { ...D, profil: 'specialiste' }, S, dispoOk).ok, 'demande réservée aux spécialistes');
  assert.ok(!REG.compatible(R({ gouvernorats: ['Sfax'] }), D, S, dispoOk).ok, 'gouvernorat');
  assert.ok(!REG.compatible(R({ competences: ['scanner'] }), D, S, dispoOk).ok, 'compétences');
  const partiel = REG.compatible(R(), D, S, { '2026-10-15': ['journee'] });
  assert.equal(partiel.ok, false, 'disponible à toutes les dates');
  assert.match(partiel.raisons[0], /16\/10\/2026/);
  assert.ok(!REG.compatible(R({ etat: 'en_attente' }), D, S, dispoOk).ok, 'inscription non validée');
  assert.ok(!REG.compatible(R({ desinscrit: true }), D, S, dispoOk).ok, 'désinscrit');
  assert.ok(!REG.compatible(R(), D, S, dispoOk, [{ id: 'autre', dates: ['2026-10-16'] }]).ok, 'déjà en mission');
  assert.ok(REG.compatible(R({ honoraires_souhaites: 9999 }), D, S, dispoOk).ok, 'honoraires indicatifs : pas de filtre');
});

test('honoraires et horaires de mission', () => {
  assert.equal(REG.totalHonoraires({ honoraires: 450, dates: ['2026-10-15', '2026-10-16'] }), 900);
  const garde = { type: 'garde', dates: ['2026-10-17'], heure_debut: '20:00', heure_fin: '08:00' };
  assert.equal(REG.debut(garde).toISOString(), '2026-10-17T19:00:00.000Z');
  assert.equal(REG.fin(garde).toISOString(), '2026-10-18T07:00:00.000Z', 'la garde finit le lendemain');
});

test('validation du formulaire de demande', () => {
  const ok = { dates: ['2026-10-15'], heure_debut: '08:00', heure_fin: '14:00', type: 'demi_journee', modalites: ['scanner'], profil: 'specialiste', honoraires: 300, unite: 'jour' };
  assert.deepEqual(REG.validerDemande(ok, '2026-10-08'), []);
  assert.ok(REG.validerDemande({ ...ok, dates: ['2026-10-01'] }, '2026-10-08').some(e => /passée/.test(e)));
  assert.ok(REG.validerDemande({ ...ok, heure_fin: '07:00' }, '2026-10-08').some(e => /fin/.test(e)));
  assert.deepEqual(REG.validerDemande({ ...ok, type: 'garde', heure_debut: '20:00', heure_fin: '08:00', unite: 'garde' }, '2026-10-08'), [], 'garde de nuit');
  assert.ok(REG.validerDemande({ ...ok, type: 'week_end', dates: ['2026-10-15'] }, '2026-10-08').some(e => /samedis/.test(e)));
  assert.ok(REG.validerDemande({ ...ok, annee_min: 4 }, '2026-10-08').some(e => /Année minimale/.test(e)), 'année minimale seulement si résidents acceptés');
  assert.ok(REG.validerDemande({ ...ok, honoraires: 0 }, '2026-10-08').some(e => /honoraires/.test(e)));
});

test('validation des inscriptions', () => {
  const r = { nom: 'Test', prenom: 'Amel', telephone: '98123456', email: 'amel.test@exemple.tn', statut: 'resident', annee_residanat: 2, affectation: 'Service fictif', competences: ['scanner'], gouvernorats: ['Tunis'], consentement: true };
  assert.ok(REG.validerRemplacant(r).some(e => /R3 à R5/.test(e)), 'résidanat de R3 à R5');
  assert.deepEqual(REG.validerRemplacant({ ...r, annee_residanat: 3 }), []);
  assert.ok(REG.validerRemplacant({ ...r, annee_residanat: 3, consentement: false }).some(e => /consentement/.test(e)));
  const s = { nom: 'Clinique fictive', type: 'clinique', adresse: '1 rue Test', ville: 'Tunis', gouvernorat: 'Tunis', contact_nom: 'M. Test', telephone: '71000000', email: 'contact@clinique-fictive.tn', consentement: true };
  assert.deepEqual(REG.validerStructure(s), []);
  assert.ok(REG.validerStructure({ ...s, gouvernorat: 'Paris' }).length);
});
