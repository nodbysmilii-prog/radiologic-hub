/* Remplacements — volontaires conservés après annulation, choix vérifié (conflits, dates, concurrence),
   destinataires uniques côté structure. Données fictives, horloge simulée, aucun e-mail réel. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { creerDepot } = require('../remplacements/noyau/depot-memoire.js');
const { creerAgent } = require('../remplacements/noyau/moteur.js');
const MSG = require('../remplacements/noyau/messagerie.js');
const REF = require('../remplacements/noyau/referentiel.js');

const MODELES = path.join(__dirname, '../remplacements/modeles');
const J = ['journee'];

async function monde({ emailStructure = 'contact@clinique-fictive.tn', emailResponsable = 'responsable@clinique-fictive.tn', auto = false } = {}) {
  const t = REF.instant('2026-10-08', '09:00');
  const depot = creerDepot();
  const envois = [];
  const messagerie = MSG.creerMessagerie({
    charger: async nom => fs.readFileSync(path.join(MODELES, 'emails', `${nom}.html`), 'utf8'),
    transport: async m => { envois.push(m); return { ok: true, id: `m${envois.length}` }; },
  });
  const agent = creerAgent({ depot, notifier: messagerie, horloge: () => t, config: { urlSite: 'https://exemple.tn', secret: 'secret-de-test' } });
  const remplacant = async (cle, dispos) => {
    const p = await depot.profils.ajouter({ nom: cle, prenom: 'Test', telephone: '98000000', email: `${cle.toLowerCase()}@exemple.tn` });
    await depot.remplacants.ajouter({ id: p.id, etat: 'valide', statut: 'specialiste', affectation: 'Service fictif', competences: ['scanner'], gouvernorats: ['Tunis'] });
    for (const [date, cr] of Object.entries(dispos)) await depot.disponibilites.definir(p.id, date, cr);
    return p.id;
  };
  const tous = { '2026-10-15': J, '2026-10-16': J, '2026-10-17': J, '2026-10-19': J };
  const ids = { R1: await remplacant('R1', tous), R2: await remplacant('R2', tous), R3: await remplacant('R3', tous) };
  const structure = async (nom, email, profilEmail) => {
    const resp = await depot.profils.ajouter({ nom: 'Responsable', prenom: nom, telephone: '71000000', email: profilEmail });
    const s = await depot.structures.ajouter({ nom, type: 'clinique', adresse: '1 rue Test', ville: 'Tunis', gouvernorat: 'Tunis', contact_nom: 'Contact', telephone: '71000001', email, etat: 'valide', attribution_auto: auto });
    await depot.membres.ajouter({ structure_id: s.id, profil_id: resp.id, role: 'responsable' });
    return { s, acteur: { role: 'structure', profil_id: resp.id } };
  };
  const A = await structure('Clinique A (fictive)', emailStructure, emailResponsable);
  const B = await structure('Clinique B (fictive)', 'contact@clinique-b.tn', 'responsable@clinique-b.tn');
  const publier = (st, dates) => agent.creerDemande(st.s.id, { dates, heure_debut: '08:00', heure_fin: '16:00', type: 'journee', modalites: ['scanner'], profil: 'specialiste', honoraires: 400, unite: 'jour' }, st.acteur);
  const prop = async (did, rid) => (await depot.propositions.parDemande(did)).find(p => p.remplacant_id === rid);
  const oui = async (did, rid) => agent.repondre((await prop(did, rid)).id, 'disponible', { role: 'remplacant', profil_id: rid });
  return { depot, agent, envois, ids, A, B, publier, prop, oui, recus: (email, modele) => envois.filter(m => m.a.email === email && (!modele || m.modele === modele)) };
}

test('annulation par le remplaçant : les autres volontaires gardent leur réponse, la structure peut choisir aussitôt', async () => {
  const w = await monde();
  const { demande: d } = await w.publier(w.A, ['2026-10-15', '2026-10-16']);
  for (const r of ['R1', 'R2', 'R3']) await w.oui(d.id, w.ids[r]);
  assert.equal((await w.agent.choisir(d.id, w.ids.R1, w.A.acteur)).ok, true);
  assert.equal((await w.prop(d.id, w.ids.R2)).etat, 'pourvu_autre');
  const avant = w.recus('r2@exemple.tn', 'proposition').length;

  const res = await w.agent.annuler(d.id, 'remplacant', { role: 'remplacant', profil_id: w.ids.R1 }, { motif: 'empêchement' });
  assert.deepEqual(res, { ok: true, remise: true, volontaires: 2 });
  const d2 = await w.depot.demandes.get(d.id);
  assert.equal(d2.etat, 'publiee');
  assert.equal(d2.remplacant_id, null, 'aucune attribution automatique');
  assert.equal((await w.prop(d.id, w.ids.R1)).etat, 'annulee');
  for (const r of ['R2', 'R3']) {
    const p = await w.prop(d.id, w.ids[r]);
    assert.equal(p.etat, 'interesse', `${r} reste disponible`);
    assert.equal(p.reponse, 'disponible');
  }
  assert.equal(w.recus('r2@exemple.tn', 'proposition').length, avant, 'aucune nouvelle question au volontaire');
  // l'e-mail d'annulation liste les volontaires avec un bouton « Choisir » ; un seul choix aboutit
  const mail = w.recus('contact@clinique-fictive.tn', 'annulation').slice(-1)[0];
  assert.match(mail.html, /2 remplaçant\(s\) déjà déclaré\(s\) disponible\(s\)/);
  assert.match(mail.html, /Choisir Dr Test R2/);
  assert.match(mail.html, /Choisir Dr Test R3/);
  assert.equal((await w.agent.choisir(d.id, w.ids.R3, w.A.acteur)).ok, true);
  assert.equal((await w.depot.demandes.get(d.id)).remplacant_id, w.ids.R3);
  assert.equal((await w.prop(d.id, w.ids.R2)).etat, 'pourvu_autre');
  assert.equal((await w.agent.choisir(d.id, w.ids.R2, w.A.acteur)).raison, 'pourvu');
});

test('annulation : un volontaire qui n\'est plus disponible ou a pris une autre mission n\'est pas conservé', async () => {
  const w = await monde();
  const { demande: d } = await w.publier(w.A, ['2026-10-15', '2026-10-16']);
  for (const r of ['R1', 'R2', 'R3']) await w.oui(d.id, w.ids[r]);
  assert.equal((await w.agent.choisir(d.id, w.ids.R1, w.A.acteur)).ok, true);
  // R2 retire sa disponibilité du 16 ; R3 est retenu ailleurs le 16 et le 17 (dates partiellement chevauchantes)
  await w.depot.disponibilites.definir(w.ids.R2, '2026-10-16', []);
  const { demande: e } = await w.publier(w.B, ['2026-10-16', '2026-10-17']);
  assert.equal(await w.prop(e.id, w.ids.R1), undefined, 'R1 déjà en mission le 16 : pas contacté');
  await w.oui(e.id, w.ids.R3);
  assert.equal((await w.agent.choisir(e.id, w.ids.R3, w.B.acteur)).ok, true);

  const res = await w.agent.annuler(d.id, 'remplacant', { role: 'remplacant', profil_id: w.ids.R1 });
  assert.equal(res.volontaires, 0);
  assert.equal((await w.prop(d.id, w.ids.R2)).etat, 'pourvu_autre');
  assert.equal((await w.prop(d.id, w.ids.R3)).etat, 'pourvu_autre');
  assert.doesNotMatch(w.recus('contact@clinique-fictive.tn', 'annulation').slice(-1)[0].html, /déjà déclaré/);
  assert.equal((await w.agent.choisir(d.id, w.ids.R3, w.A.acteur)).raison, 'non_disponible');
});

test('annulation : pas d\'attribution automatique des volontaires conservés, même si la structure l\'a activée', async () => {
  const w = await monde();
  const { demande: d } = await w.publier(w.A, ['2026-10-15']);
  for (const r of ['R1', 'R2']) await w.oui(d.id, w.ids[r]);
  await w.agent.choisir(d.id, w.ids.R1, w.A.acteur);
  await w.depot.structures.maj(w.A.s.id, { attribution_auto: true });
  await w.agent.annuler(d.id, 'remplacant', { role: 'remplacant', profil_id: w.ids.R1 });
  const d2 = await w.depot.demandes.get(d.id);
  assert.equal(d2.etat, 'publiee');
  assert.equal(d2.remplacant_id, null);
  assert.equal((await w.prop(d.id, w.ids.R2)).etat, 'interesse');
});

test('annulation par la structure (remise en ligne) : volontaires conservés ; définitive : aucun', async () => {
  const w = await monde();
  const { demande: d } = await w.publier(w.A, ['2026-10-15']);
  for (const r of ['R1', 'R2']) await w.oui(d.id, w.ids[r]);
  await w.agent.choisir(d.id, w.ids.R1, w.A.acteur);
  assert.equal((await w.agent.annuler(d.id, 'structure', w.A.acteur)).volontaires, 1);
  assert.equal((await w.prop(d.id, w.ids.R1)).etat, 'liberee');
  assert.equal((await w.prop(d.id, w.ids.R2)).etat, 'interesse');
  await w.agent.choisir(d.id, w.ids.R2, w.A.acteur);
  assert.deepEqual(await w.agent.annuler(d.id, 'structure', w.A.acteur, { definitif: true }), { ok: true, remise: false });
  assert.equal((await w.depot.demandes.get(d.id)).etat, 'annulee');
});

test('choix : refusé si le volontaire a retiré ses disponibilités entre-temps', async () => {
  const w = await monde();
  const { demande: d } = await w.publier(w.A, ['2026-10-15', '2026-10-16']);
  await w.oui(d.id, w.ids.R1);
  await w.depot.disponibilites.definir(w.ids.R1, '2026-10-16', ['matin']);
  assert.deepEqual(await w.agent.choisir(d.id, w.ids.R1, w.A.acteur), { ok: false, raison: 'non_disponible' });
  assert.equal((await w.depot.demandes.get(d.id)).etat, 'publiee');
  assert.equal((await w.prop(d.id, w.ids.R1)).etat, 'expiree');
  assert.equal(w.recus('r1@exemple.tn', 'confirmation-remplacant').length, 0, 'aucune confirmation envoyée');
});

test('chevauchement : retenu ailleurs, le remplaçant n\'apparaît plus disponible pour une demande aux mêmes dates', async () => {
  const w = await monde();
  const { demande: a } = await w.publier(w.A, ['2026-10-15', '2026-10-16']);
  const { demande: b } = await w.publier(w.B, ['2026-10-16', '2026-10-17']);   // chevauche le 16
  const { demande: c } = await w.publier(w.B, ['2026-10-19']);                 // sans chevauchement
  for (const x of [a, b, c]) await w.oui(x.id, w.ids.R1);
  assert.equal((await w.agent.choisir(a.id, w.ids.R1, w.A.acteur)).ok, true);
  assert.equal((await w.prop(b.id, w.ids.R1)).etat, 'expiree', 'proposition chevauchante close');
  assert.equal((await w.prop(c.id, w.ids.R1)).etat, 'interesse', 'autre date : inchangée');
  assert.equal((await w.agent.choisir(b.id, w.ids.R1, w.B.acteur)).raison, 'non_disponible');
  assert.equal((await w.agent.choisir(c.id, w.ids.R1, w.B.acteur)).ok, true);
});

test('concurrence : deux structures retiennent le même remplaçant au même instant, une seule mission est gardée', async () => {
  const w = await monde();
  const { demande: a } = await w.publier(w.A, ['2026-10-15', '2026-10-16']);
  const { demande: b } = await w.publier(w.B, ['2026-10-16']);
  // les deux propositions sont ouvertes avant tout choix (aucune fermeture préalable possible)
  for (const x of [a, b]) await w.oui(x.id, w.ids.R1);
  const r = await Promise.all([w.agent.choisir(a.id, w.ids.R1, w.A.acteur), w.agent.choisir(b.id, w.ids.R1, w.B.acteur)]);
  assert.equal(r.filter(x => x.ok).length, 1, JSON.stringify(r));
  const missions = await w.depot.demandes.confirmeesPour([w.ids.R1]);
  assert.equal(missions.length, 1, 'pas de double réservation');
  const perdante = [a, b].find(x => x.id !== missions[0].id);
  assert.equal((await w.depot.demandes.get(perdante.id)).etat, 'publiee', 'la demande perdante reste en ligne');
  assert.equal(w.recus('r1@exemple.tn', 'confirmation-remplacant').length, 1, 'une seule confirmation');
});

test('destinataires côté structure : une adresse identique (casse, espaces) ne reçoit qu\'un e-mail', async () => {
  const w = await monde({ emailStructure: 'Contact@Clinique-Fictive.tn ', emailResponsable: 'contact@clinique-fictive.tn' });
  const { demande: d } = await w.publier(w.A, ['2026-10-15']);
  await w.oui(d.id, w.ids.R1);
  await w.agent.choisir(d.id, w.ids.R1, w.A.acteur);
  const conf = w.envois.filter(m => m.modele === 'confirmation-structure');
  assert.equal(conf.length, 1);
  assert.equal(conf[0].a.email, 'Contact@Clinique-Fictive.tn', 'adresse nettoyée des espaces');
  assert.equal(w.envois.filter(m => m.modele === 'interesse').length, 1);
});

test('destinataires côté structure : deux personnes différentes reçoivent chacune l\'e-mail', async () => {
  const w = await monde();
  const { demande: d } = await w.publier(w.A, ['2026-10-15']);
  await w.oui(d.id, w.ids.R1);
  await w.agent.choisir(d.id, w.ids.R1, w.A.acteur);
  assert.deepEqual(w.envois.filter(m => m.modele === 'confirmation-structure').map(m => m.a.email).sort(), ['contact@clinique-fictive.tn', 'responsable@clinique-fictive.tn']);
});

test('destinataires : validation d\'une structure dont le responsable a la même adresse que la structure', async () => {
  const w = await monde({ emailStructure: 'meme@cabinet.tn', emailResponsable: 'MEME@cabinet.tn' });
  await w.depot.structures.maj(w.A.s.id, { etat: 'en_attente' });
  await w.agent.validerInscription('structure', w.A.s.id, { role: 'admin' });
  assert.equal(w.envois.filter(m => m.modele === 'inscription-validee').length, 1);
});
