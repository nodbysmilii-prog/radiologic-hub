/* Tests de l'assistant IA de rédaction (assistant-ia/noyau/consigne.js) :
   consigne construite à partir d'un vrai modèle du service, second regard
   seulement avec des images, lecture de la réponse, chiffres absents des
   notes, repères de données identifiantes, vérification de la demande.
   Lancer : npm test   (ou : node --test tests/*.test.js) */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const IA = require('../assistant-ia/noyau/consigne.js');

const RACINE = path.join(__dirname, '..');
const ctx = {};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(RACINE, 'cr-data.js'), 'utf8') + ';this.T = CR_TEMPLATES;', ctx);
const MODELE = ctx.T.find(t => t.id === 'tdm-abdo-pelvienne-injectee');

const demande = (champs = {}) => ({
  modele: MODELE.text, titreModele: MODELE.title,
  notes: 'kyste cortical rein G pôle sup 22 mm, 8 UH\nappendice 9 mm, stercolithe',
  indication: 'Douleur FID fébrile, CRP 85', sexe: 'F', ...champs,
});

test('le modèle par défaut de l\'assistant existe dans cr-data.js', () => {
  assert.ok(MODELE, 'modèle tdm-abdo-pelvienne-injectee introuvable');
  assert.match(MODELE.text, /AU TOTAL/);
});

test('la consigne contient le modèle normal, les notes et les règles de style', () => {
  const c = IA.construireConsigne(demande());
  assert.ok(c.includes(MODELE.text.trim()), 'modèle absent');
  assert.ok(c.includes('kyste cortical rein G pôle sup 22 mm'), 'notes absentes');
  assert.match(c, /Patient\(e\) : femme/);
  assert.match(c, /Ne répète jamais le nom d'un organe/);
  assert.match(c, /mot pour mot/);
  assert.ok(c.includes(IA.MARQUE_VERIFIER));
  assert.ok(!c.includes(IA.MARQUE_REGARD), 'pas de second regard sans image');
});

test('le second regard n\'est demandé qu\'avec des images, sans modifier le compte rendu', () => {
  const c = IA.construireConsigne(demande({ nbImages: 3 }));
  assert.ok(c.includes(IA.MARQUE_REGARD));
  assert.match(c, /3 image\(s\)/);
  assert.match(c, /ne doivent JAMAIS modifier le compte rendu/);
  assert.match(IA.construireConsigne(demande({ nbImages: 40 })), /5 image\(s\)/, 'plafonné à 5');
});

test('« seulement les anomalies » décoché : pas d\'organe supposé normal', () => {
  const c = IA.construireConsigne(demande({ toutNormal: false }));
  assert.match(c, /ne sert que de modèle de style/);
});

test('le PDL n\'apparaît que s\'il est donné', () => {
  assert.ok(!IA.construireConsigne(demande()).includes('PDL ='));
  assert.match(IA.construireConsigne(demande({ pdl: '512' })), /PDL = 512 mGy·cm/);
});

test('lecture de la réponse : compte rendu, à vérifier, second regard', () => {
  const r = IA.lireReponse('**SCANNER**\n\nRÉSULTATS :\n• Kyste.\n\n===À VÉRIFIER===\n- Collection non précisée.\n• Position de l\'appendice.\n\n===SECOND REGARD===\n- Stercolithe visible.');
  assert.equal(r.cr, 'SCANNER\n\nRÉSULTATS :\n• Kyste.');
  assert.deepEqual(r.verifier, ['Collection non précisée.', 'Position de l\'appendice.']);
  assert.equal(r.secondRegard, '- Stercolithe visible.');
});

test('lecture de la réponse : « Rien à signaler » et absence de marques', () => {
  assert.deepEqual(IA.lireReponse('CR\n===À VÉRIFIER===\nRien à signaler.').verifier, []);
  const r = IA.lireReponse('Compte rendu seul');
  assert.equal(r.cr, 'Compte rendu seul');
  assert.deepEqual(r.verifier, []);
  assert.equal(r.secondRegard, '');
});

test('chiffres absents des notes et du modèle', () => {
  const d = demande();
  const cr = 'Kyste de 22 mm (8 UH). Appendice de 9 mm, paroi de 4 mm. Bosniak I (version 2019).';
  assert.deepEqual(IA.chiffresInventes(cr, [d.notes, d.modele]), ['4']);
  assert.deepEqual(IA.chiffresInventes('Lésion de 12,5 mm', ['12.5 mm']), []);
});

test('repères de données identifiantes', () => {
  assert.deepEqual(IA.donneesIdentifiantes('kyste rein G 22 mm, CRP 85'), []);
  assert.ok(IA.donneesIdentifiantes('Mme Trabelsi, née le 03/04/1980').length >= 2);
  assert.ok(IA.donneesIdentifiantes('CIN 09123456').length);
});

test('vérification de la demande', () => {
  assert.equal(IA.verifierDemande(demande()), null);
  assert.match(IA.verifierDemande(demande({ notes: '  ' })), /constatations/);
  assert.match(IA.verifierDemande(demande({ modele: '' })), /modèle/);
  assert.match(IA.verifierDemande(demande({ notes: 'x'.repeat(7000) })), /trop longues/);
  assert.match(IA.verifierDemande(demande({ pdl: 'abc' })), /PDL/);
  assert.match(IA.verifierDemande(demande({ notes: 'M. Gharbi, kyste' })), /identifiante/);
  assert.match(IA.verifierDemande(null), /vide/);
});

test('la copie serveur de la consigne est à jour', () => {
  const copie = fs.readFileSync(path.join(RACINE, 'supabase/functions/_shared/noyau-ia/consigne.js'), 'utf8');
  assert.ok(copie.endsWith(fs.readFileSync(path.join(RACINE, 'assistant-ia/noyau/consigne.js'), 'utf8')), 'lancez npm run backend:preparer');
});
