/* Tests du noyau de la Communauté (reseau/noyau) — cas fictifs uniquement */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const R = require('../reseau/noyau/regles.js');
const C = require('../reseau/noyau/confidentialite.js');

const fixture = f => new Uint8Array(fs.readFileSync(path.join(__dirname, 'fixtures', f)));

test('nom affiché : « Dr » seulement pour un compte vérifié', () => {
  const m = { prenom: ' Amel ', nom: 'TEST', titre: 'Dr', verifie: false };
  assert.equal(R.nomAffiche(m), 'Amel TEST');
  assert.equal(R.nomAffiche({ ...m, verifie: true }), 'Dr Amel TEST');
  assert.equal(R.nomAffiche({ ...m, verifie: true, titre: 'Pr' }), 'Pr Amel TEST');
  assert.equal(R.nomAffiche({ ...m, verifie: true, titre: '' }), 'Amel TEST');
  assert.equal(R.nomAffiche({ ...m, verifie: true, titre: 'Professeur' }), 'Amel TEST', 'titre inconnu ignoré');
  assert.equal(R.nomAffiche(null), 'Membre');
  assert.equal(R.initiales(m), 'AT');
  assert.equal(R.statutAffiche({ statut: 'resident', annee: 4 }), 'Résident en radiologie (R4)');
});

test('publier : compte vérifié ou remplaçant validé, jamais un compte suspendu', () => {
  assert.equal(R.peutPublier({ verifie: false }), false);
  assert.equal(R.peutPublier({ verifie: true }), true);
  assert.equal(R.peutPublier({ verifie: false }, true), true, 'remplaçant validé');
  assert.equal(R.peutPublier({ verifie: true, suspendu: true }), false);
  assert.equal(R.peutPublier(null, true), false);
});

test('profil : champs obligatoires, téléphone, résidanat, consentement', () => {
  const ok = { prenom: 'Sami', nom: 'EXEMPLE', telephone: '98 123 456', statut: 'resident', annee: 3, titre: 'Dr', consentement: true };
  assert.deepEqual(R.validerProfil(ok, { creation: true }), []);
  assert.deepEqual(R.validerProfil({ ...ok, telephone: '+33 6 12 34 56 78' }), [], 'numéro étranger accepté');
  const e = R.validerProfil({ statut: 'resident', telephone: '123', titre: 'Roi' }, { creation: true });
  assert.equal(e.length, 6);
  assert.ok(e.some(x => /résidanat/.test(x)) && e.some(x => /conditions/.test(x)) && e.some(x => /Titre/.test(x)));
});

test('cas : titre, histoire, spécialité, modalités, images, attestation', () => {
  const ok = { titre: 'Douleur abdominale fébrile', histoire: 'Patient de 40 ans, fièvre et douleur de la fosse iliaque droite.', specialite: 'digestif', modalites: ['scanner'], images: [{}], attestation: true };
  assert.deepEqual(R.validerCas(ok), []);
  const e = R.validerCas({ titre: 'abc', histoire: 'court', specialite: 'x', modalites: ['scanner', 'faux'], images: [], attestation: false });
  assert.equal(e.length, 6);
  assert.ok(R.validerCas({ ...ok, images: Array(11).fill({}) }).some(x => /10 images/.test(x)));
  assert.deepEqual(R.validerCommentaire('  '), ['Le commentaire est vide.']);
  assert.deepEqual(R.validerMessage('', { chemin: 'x' }), [], 'image seule acceptée');
  assert.equal(R.validerMessage('x'.repeat(4001)).length, 1);
});

test('dates : heure de Tunis, JJ/MM/AAAA, durées relatives', () => {
  const maintenant = new Date('2026-10-09T10:00:00Z');                   // 11 h à Tunis
  assert.equal(R.dateFr('2026-10-08T23:30:00Z'), '09/10/2026', 'minuit passé à Tunis');
  assert.equal(R.depuis(new Date(maintenant - 30e3), maintenant), "à l'instant");
  assert.equal(R.depuis(new Date(maintenant - 5 * 60e3), maintenant), 'il y a 5 min');
  assert.equal(R.depuis(new Date(maintenant - 3 * 3600e3), maintenant), 'il y a 3 h');
  assert.equal(R.depuis('2026-10-08T09:00:00Z', maintenant), 'hier');
  assert.equal(R.depuis('2026-10-01T09:00:00Z', maintenant), '01/10/2026');
  assert.equal(R.heureMessage('2026-10-09T08:05:00Z', maintenant), '09:05');
  assert.equal(R.heureMessage('2026-10-07T08:05:00Z', maintenant), '07/10/2026 09:05');
});

test('alerte identité : nom, naissance, dossier, CIN, téléphone', () => {
  const t = "Madame Dupont, née le 3 mars 1980, IPP 123456, CIN 01234567, tél. 98 123 456. Lésion de 25 mm, ADC 0,8.";
  const types = C.identite(t).map(x => x.type);
  assert.deepEqual(types, ['nom', 'naissance', 'dossier', 'cin', 'telephone']);
  assert.deepEqual(C.identite('Patiente de 45 ans, masse du sein droit de 12 x 8 mm, ACR 4.'), [], 'pas de faux positif sur un texte médical');
  assert.deepEqual(C.identite('Madame la patiente présente une douleur.'), [], '« Madame la » n\'est pas un nom');
  assert.equal(C.identite('IRM. Monsieur Ben Salah').length, 1);
});

test('images JPEG : EXIF et commentaire retirés, image intacte', () => {
  const avant = fixture('metadonnees-fictives.jpg');
  assert.ok(C.metadonnees(avant).includes('EXIF'), 'la photo de test contient bien des EXIF');
  assert.ok(Buffer.from(avant).includes('Patient TEST-0001'));
  const apres = C.nettoyer(avant);
  assert.deepEqual(C.metadonnees(apres), []);
  assert.ok(!Buffer.from(apres).includes('Patient TEST-0001'), 'aucune trace du texte des métadonnées');
  assert.ok(!Buffer.from(apres).includes('Appareil fictif'));
  assert.ok(apres.length < avant.length);
  // début (SOI) et fin (EOI) conservés, données d'image identiques
  assert.deepEqual([apres[0], apres[1], apres[apres.length - 2], apres[apres.length - 1]], [0xff, 0xd8, 0xff, 0xd9]);
  const sos = b => Buffer.from(b).indexOf(Buffer.from([0xff, 0xda]));
  assert.deepEqual(Buffer.from(apres.subarray(sos(apres))), Buffer.from(avant.subarray(sos(avant))));
  assert.deepEqual(C.nettoyer(apres), apres, 'idempotent');
});

test('images PNG : textes retirés, morceaux d\'image conservés', () => {
  const avant = fixture('metadonnees-fictives.png');
  assert.deepEqual(C.metadonnees(avant), ['texte PNG']);
  const apres = C.nettoyer(avant);
  assert.deepEqual(C.metadonnees(apres), []);
  assert.ok(!Buffer.from(apres).includes('TEST-0001'));
  for (const morceau of ['IHDR', 'IDAT', 'IEND']) assert.ok(Buffer.from(apres).includes(morceau), morceau);
  assert.equal(C.nettoyer(new Uint8Array([1, 2, 3])), null, 'format inconnu');
});
