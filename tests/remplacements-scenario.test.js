/* Remplacements — scénario complet de l'agent, données fictives, horloge simulée.
   Demande réservée aux spécialistes, demande ouverte aux résidents, trois remplaçants compatibles,
   acceptation, annulation, remise en ligne, attribution automatique, relance, rappel, réalisation,
   récapitulatif mensuel, désinscription, validation par l'administrateur. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { creerDepot } = require('../remplacements/noyau/depot-memoire.js');
const { creerAgent } = require('../remplacements/noyau/moteur.js');
const MSG = require('../remplacements/noyau/messagerie.js');
const REF = require('../remplacements/noyau/referentiel.js');

const MODELES = path.join(__dirname, '../remplacements/modeles');
const modeleContrat = fs.readFileSync(path.join(MODELES, 'contrat.md'), 'utf8');

/* ---------- Monde fictif ---------- */
async function monde() {
  let t = REF.instant('2026-10-08', '09:00');                 // jeudi 08/10/2026, 9 h à Tunis
  const depot = creerDepot();
  const envois = [];
  const messagerie = MSG.creerMessagerie({
    charger: async nom => fs.readFileSync(path.join(MODELES, 'emails', `${nom}.html`), 'utf8'),
    transport: async m => { envois.push(m); return { ok: true, id: `m${envois.length}` }; },
  });
  const agent = creerAgent({ depot, notifier: messagerie, horloge: () => t, config: { urlSite: 'https://exemple.tn', secret: 'secret-de-test', modeleContrat, emailsAdmin: ['admin@exemple.tn'] } });

  const remplacant = async (cle, champs, dispos = {}) => {
    const p = await depot.profils.ajouter({ nom: cle, prenom: 'Test', telephone: '98000000', email: `${cle.toLowerCase()}@exemple.tn` });
    await depot.remplacants.ajouter({ id: p.id, etat: 'valide', statut: 'specialiste', affectation: 'Service fictif', competences: ['scanner', 'irm', 'echographie'], gouvernorats: ['Tunis'], honoraires_souhaites: 400, ...champs });
    for (const [date, cr] of Object.entries(dispos)) await depot.disponibilites.definir(p.id, date, cr);
    return p.id;
  };
  const J = ['journee'];
  const ids = {
    R1: await remplacant('R1', { gouvernorats: ['Tunis', 'Ariana'] }, { '2026-10-15': J, '2026-10-16': J, '2026-10-22': ['matin'], '2026-10-23': J }),
    R2: await remplacant('R2', {}, { '2026-10-15': ['matin', 'apres_midi'], '2026-10-16': J, '2026-10-22': J }),
    R3: await remplacant('R3', { statut: 'resident', annee_residanat: 4, competences: ['scanner', 'echographie'] }, { '2026-10-15': J, '2026-10-16': J, '2026-10-22': ['matin'], '2026-10-29': J }),
    R4: await remplacant('R4', { statut: 'resident', annee_residanat: 3 }, { '2026-10-15': J, '2026-10-16': J, '2026-10-22': J }),
    R5: await remplacant('R5', { gouvernorats: ['Sfax'] }, { '2026-10-15': J, '2026-10-16': J, '2026-10-22': J }),
    R6: await remplacant('R6', { etat: 'en_attente' }, { '2026-10-15': J, '2026-10-16': J, '2026-10-22': J }),
  };
  const membre = await depot.profils.ajouter({ nom: 'Gestion', prenom: 'Test', telephone: '71000000', email: 'gestion@orangers-fictive.tn' });
  const S1 = await depot.structures.ajouter({ nom: 'Clinique Les Orangers (fictive)', type: 'clinique', adresse: '12 avenue Test', ville: 'Tunis', gouvernorat: 'Tunis', contact_nom: 'Mme Test', telephone: '71000001', email: 'contact@orangers-fictive.tn', equipements: ['scanner', 'irm'], etat: 'valide' });
  await depot.membres.ajouter({ structure_id: S1.id, profil_id: membre.id, role: 'responsable' });
  const S2 = await depot.structures.ajouter({ nom: 'Cabinet Radio du Lac (fictif)', type: 'cabinet', adresse: '3 rue Test', ville: 'La Soukra', gouvernorat: 'Ariana', contact_nom: 'M. Test', telephone: '71000002', email: 'contact@radiolac-fictif.tn', etat: 'valide', attribution_auto: true });
  const acteurS1 = { role: 'structure', profil_id: membre.id };
  const nom = cle => `${cle.toLowerCase()}@exemple.tn`;
  return {
    depot, agent, envois, ids, S1, S2, acteurS1, nom,
    regler: (date, heure) => { t = REF.instant(date, heure); },
    avancer: h => { t = new Date(t.getTime() + h * 3600 * 1000); },
    recus: email => envois.filter(m => m.a.email === email),
    dernier: (email, modele, objet) => envois.filter(m => m.a.email === email && (!modele || m.modele === modele) && (!objet || objet.test(m.objet))).slice(-1)[0],
  };
}
/* Liens d'un e-mail : [{ libelle, url, jeton }] */
const liens = m => [...m.html.matchAll(/<a href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)].map(([, url, lib]) => ({ url, libelle: lib.replace(/<[^>]+>/g, '').trim(), jeton: (/[?&]j=([^&"]+)/.exec(url) || [])[1] }));
const jeton = (m, libelle) => { const l = liens(m).find(x => x.libelle.startsWith(libelle)); assert.ok(l, `lien « ${libelle} » absent de « ${m.objet} »`); return decodeURIComponent(l.jeton); };

const DEMANDE_SPECIALISTES = { dates: ['2026-10-15', '2026-10-16'], heure_debut: '08:00', heure_fin: '16:00', type: 'journee', modalites: ['scanner'], profil: 'specialiste', honoraires: 450, unite: 'jour', logement: true, repas: true, commentaire: 'Accès parking.' };
const DEMANDE_RESIDENTS = { dates: ['2026-10-22'], heure_debut: '08:00', heure_fin: '12:00', type: 'demi_journee', modalites: ['echographie'], profil: 'residents', annee_min: 4, honoraires: 200, unite: 'jour' };

test('scénario complet : sélection, réponses, choix, annulation, remise en ligne, relances, rappels, récapitulatif', async () => {
  const w = await monde();
  const { agent, depot, ids } = w;

  /* 1. Demande réservée aux spécialistes : seuls R1 et R2 sont contactés */
  const A = await agent.creerDemande(w.S1.id, DEMANDE_SPECIALISTES, w.acteurS1);
  assert.equal(A.envoyees, 2);
  const propsA = await depot.propositions.parDemande(A.demande.id);
  assert.deepEqual(propsA.map(p => p.remplacant_id).sort(), [ids.R1, ids.R2].sort(), 'R3/R4 résidents, R5 hors gouvernorat, R6 non validé');
  const propR1 = w.dernier(w.nom('R1'), 'proposition');
  assert.match(propR1.objet, /Remplacement le 15\/10\/2026, 16\/10\/2026 — Clinique Les Orangers/);
  assert.match(propR1.html, /450 TND/);
  assert.match(propR1.html, /900 TND/, 'total de la mission');

  /* 2. Demande ouverte aux résidents (R4 minimum) : R1, R2, R3 — pas R4 (R3) */
  const B = await agent.creerDemande(w.S1.id, DEMANDE_RESIDENTS, w.acteurS1);
  assert.equal(B.envoyees, 3);
  assert.ok(!(await depot.propositions.parDemande(B.demande.id)).some(p => p.remplacant_id === ids.R4));

  /* 3. R1 « Je suis disponible » : la page affiche la proposition sans consommer le lien, puis confirme */
  const jOui = jeton(propR1, 'Je suis disponible'), jNon = jeton(propR1, 'Pas disponible');
  const infos = await agent.infosJeton(jOui);
  assert.equal(infos.valide, true);
  assert.equal(infos.demande.structure, 'Clinique Les Orangers (fictive)');
  assert.equal((await agent.utiliserJeton(jOui)).etat, 'interesse');
  assert.equal((await agent.utiliserJeton(jOui)).raison, 'utilise', 'usage unique');
  assert.equal((await agent.utiliserJeton(jNon)).raison, 'utilise', "l'autre bouton est désactivé");
  const interesse1 = w.dernier('contact@orangers-fictive.tn', 'interesse');
  assert.match(interesse1.objet, /R1 est disponible/);
  assert.ok(w.dernier('gestion@orangers-fictive.tn', 'interesse'), "l'auteur de la demande est aussi prévenu");

  /* 4. R2 disponible : la structure reçoit la liste (2) et choisit R2 en un clic */
  await agent.utiliserJeton(jeton(w.dernier(w.nom('R2'), 'proposition', /15\/10/), 'Je suis disponible'));
  const interesse2 = w.dernier('contact@orangers-fictive.tn', 'interesse', /15\/10/);
  assert.match(interesse2.html, /Remplaçants disponibles \(2\)/);
  const choisirR1 = jeton(interesse2, 'Choisir Dr Test R1');
  assert.equal((await agent.infosJeton(jeton(interesse2, 'Choisir Dr Test R2'))).remplacant.nom_complet, 'Dr Test R2');
  assert.equal((await agent.utiliserJeton(jeton(interesse2, 'Choisir Dr Test R2'))).ok, true);
  let dA = await depot.demandes.get(A.demande.id);
  assert.equal(dA.etat, 'pourvue');
  assert.equal(dA.remplacant_id, ids.R2);
  assert.equal(dA.attribution, 'manuelle');
  assert.equal((await agent.utiliserJeton(choisirR1)).raison, 'utilise', 'les autres boutons « Choisir » sont désactivés');

  /* 5. Confirmations aux deux parties (.ics + contrat PDF + lien d'annulation), « poste pourvu » à R1 */
  const confR2 = w.dernier(w.nom('R2'), 'confirmation-remplacant');
  assert.match(confR2.objet, /Remplacement confirmé/);
  assert.match(confR2.html, /71000001/, 'coordonnées de la structure');
  assert.deepEqual(confR2.pieces_jointes.map(p => p.type), ['text/calendar', 'application/pdf']);
  assert.match(Buffer.from(confR2.pieces_jointes[0].contenu, 'base64').toString(), /DTSTART;TZID=Africa\/Tunis:20261015T080000/);
  assert.match(Buffer.from(confR2.pieces_jointes[1].contenu, 'base64').toString('latin1'), /^%PDF/);
  const confS1 = w.dernier('contact@orangers-fictive.tn', 'confirmation-structure');
  assert.match(confS1.html, /r2@exemple\.tn/, 'coordonnées du remplaçant');
  assert.ok(w.dernier(w.nom('R1'), 'poste-pourvu'), 'poste pourvu');

  /* 6. R2 annule : e-mail immédiat à la structure, demande remise en ligne, R1 recontacté (pas R2) */
  assert.equal((await agent.utiliserJeton(jeton(confR2, 'Annuler ce remplacement'))).remise, true);
  const annulation = w.dernier('contact@orangers-fictive.tn', 'annulation');
  assert.match(annulation.html, /annulé par le remplaçant/);
  assert.match(annulation.html, /remise en ligne automatiquement/);
  dA = await depot.demandes.get(A.demande.id);
  assert.equal(dA.etat, 'publiee');
  assert.deepEqual(dA.exclus, [ids.R2]);
  const remise = w.dernier(w.nom('R1'), 'proposition');
  assert.match(remise.objet, /^De nouveau disponible/);
  assert.equal(w.recus(w.nom('R2')).filter(m => m.modele === 'proposition' && /15\/10/.test(m.objet)).length, 1, "R2 n'est pas recontacté");

  /* 7. R1 de nouveau disponible ; la structure le choisit depuis son espace */
  await agent.utiliserJeton(jeton(remise, 'Je suis disponible'));
  assert.equal((await agent.choisir(A.demande.id, ids.R1, w.acteurS1)).ok, true);
  assert.equal((await depot.demandes.get(A.demande.id)).remplacant_id, ids.R1);
  assert.equal((await agent.choisir(A.demande.id, ids.R2, w.acteurS1)).raison, 'pourvu');

  /* 8. Attribution automatique (cabinet de l'Ariana) : le premier disponible est retenu */
  const C = await agent.creerDemande(w.S2.id, { ...DEMANDE_SPECIALISTES, dates: ['2026-10-23'], modalites: ['irm'] }, { role: 'structure' });
  assert.equal(C.envoyees, 1, 'seul R1 accepte l\'Ariana');
  assert.equal((await agent.utiliserJeton(jeton(w.dernier(w.nom('R1'), 'proposition'), 'Je suis disponible'))).etat, 'retenu');
  const dC = await depot.demandes.get(C.demande.id);
  assert.equal(dC.attribution, 'auto');
  assert.match(w.dernier('contact@radiolac-fictif.tn', 'confirmation-structure').html, /attribution automatique/);

  /* 9. Relance après X heures sans réponse : demande B (aucun disponible) → relance + alerte */
  w.avancer(13);
  const t1 = await agent.taches();
  assert.equal(t1.relances, 1);
  assert.match(w.dernier(w.nom('R3'), 'proposition').objet, /^Rappel —/);
  assert.match(w.dernier('contact@orangers-fictive.tn', 'alerte').html, /Aucun des <strong>3 remplaçant/);
  assert.equal((await agent.taches()).relances, 0, 'une seule relance');

  /* 10. Désinscription de R3 : plus de propositions */
  const lienD = liens(w.dernier(w.nom('R3'))).find(l => l.libelle.startsWith('Ne plus recevoir')).url;
  assert.equal((await agent.desinscrire(decodeURIComponent(/[?&]d=([^&]+)/.exec(lienD)[1]))).ok, true);
  assert.equal((await agent.desinscrire('p:faux.0000')).ok, false, 'signature vérifiée');
  const D = await agent.creerDemande(w.S1.id, { ...DEMANDE_RESIDENTS, dates: ['2026-10-29'], type: 'journee', heure_fin: '16:00', annee_min: null }, w.acteurS1);
  assert.equal(D.envoyees, 0, 'R3 désinscrit');

  /* 11. Validation d'une inscription par l'administrateur */
  await agent.inscriptionRecue('remplacant', ids.R6);
  assert.match(w.dernier('admin@exemple.tn', 'admin-inscription').objet, /Nouvelle inscription à valider/);
  await agent.validerInscription('remplacant', ids.R6, { role: 'admin', profil_id: null });
  assert.equal((await depot.remplacants.get(ids.R6)).etat, 'valide');
  assert.ok(w.dernier(w.nom('R6'), 'inscription-validee'));

  /* 12. Rappel la veille (18 h à Tunis) aux deux parties */
  w.regler('2026-10-14', '18:05');
  const t2 = await agent.taches();
  assert.equal(t2.rappels, 1);
  assert.match(w.dernier(w.nom('R1'), 'rappel').html, /71000001/);
  assert.match(w.dernier('contact@orangers-fictive.tn', 'rappel').html, /r1@exemple\.tn/);

  /* 13. Après la mission : « a-t-il eu lieu ? » → oui */
  w.regler('2026-10-16', '19:00');
  assert.equal((await agent.taches()).realisations, 1);
  await agent.utiliserJeton(jeton(w.dernier(w.nom('R1'), 'realisation'), 'Oui'));
  assert.equal((await depot.demandes.get(A.demande.id)).etat, 'realisee');

  /* 14. Demande B expirée à sa date, sans remplaçant */
  w.regler('2026-10-22', '08:30');
  await agent.taches();
  assert.equal((await depot.demandes.get(B.demande.id)).etat, 'expiree');
  assert.ok(w.dernier('contact@orangers-fictive.tn', 'expiree'));

  /* 15. Récapitulatif mensuel (le 1er du mois), une seule fois */
  w.regler('2026-11-01', '09:00');
  const t3 = await agent.taches();
  assert.equal(t3.recaps, 3, 'R1, la clinique et le cabinet');
  const recapR1 = w.dernier(w.nom('R1'), 'recap-mensuel');
  assert.match(recapR1.objet, /octobre 2026/);
  assert.match(recapR1.html, /1 350 TND/, '2 × 450 + 450');
  assert.equal((await agent.taches()).recaps, 0);

  /* 16. Journal : qui a accepté, choisi, annulé, et quand */
  const actions = new Set((await depot.journal.tout()).map(e => e.action));
  ['publication', 'selection', 'reponse_disponible', 'choix', 'annulation', 'remise_en_ligne', 'relance', 'rappel', 'realisation', 'recap_mensuel', 'validation', 'desinscription', 'expiration'].forEach(a => assert.ok(actions.has(a), `journal : ${a}`));
  const choix = (await depot.journal.tout()).filter(e => e.action === 'choix');
  assert.deepEqual(choix.map(e => e.details.attribution), ['manuelle', 'manuelle', 'auto']);
  assert.ok(choix.every(e => e.quand), 'horodaté');
  const journalEmails = await depot.emails.tout();
  assert.ok(journalEmails.length > 30 && journalEmails.every(e => ['envoye', 'ignore_desinscrit'].includes(e.statut)));
});

test("annulation par la structure : définitive ou remise en ligne ; retrait d'une demande", async () => {
  const w = await monde();
  const { agent, depot, ids } = w;
  const A = await agent.creerDemande(w.S1.id, DEMANDE_SPECIALISTES, w.acteurS1);
  await agent.utiliserJeton(jeton(w.dernier(w.nom('R1'), 'proposition'), 'Je suis disponible'));
  await agent.choisir(A.demande.id, ids.R1, w.acteurS1);
  // la structure annule sans remettre en ligne : le remplaçant est prévenu, avec un .ics d'annulation
  const conf = w.dernier('contact@orangers-fictive.tn', 'confirmation-structure');
  const res = await agent.utiliserJeton(jeton(conf, 'Annuler ce remplacement'), { definitif: true, motif: 'Médecin titulaire finalement présent' });
  assert.equal(res.remise, false);
  assert.equal((await depot.demandes.get(A.demande.id)).etat, 'annulee');
  const mail = w.dernier(w.nom('R1'), 'annulation');
  assert.match(mail.html, /annulé par la structure/);
  assert.match(mail.html, /Médecin titulaire finalement présent/);
  assert.match(Buffer.from(mail.pieces_jointes[0].contenu, 'base64').toString(), /METHOD:CANCEL/);
  // retrait d'une demande en recherche : les remplaçants déjà disponibles sont prévenus
  const B = await agent.creerDemande(w.S1.id, DEMANDE_RESIDENTS, w.acteurS1);
  await agent.utiliserJeton(jeton(w.dernier(w.nom('R3'), 'proposition'), 'Je suis disponible'));
  assert.equal((await agent.cloturer(B.demande.id, w.acteurS1)).ok, true);
  assert.ok(w.dernier(w.nom('R3'), 'demande-annulee'));
  assert.equal((await agent.utiliserJeton(jeton(w.dernier(w.nom('R2'), 'proposition'), 'Je suis disponible'))).raison, 'utilise', 'liens désactivés au retrait');
  // demande refusée si la structure n'est pas validée, ou si le formulaire est incomplet
  await depot.structures.maj(w.S2.id, { etat: 'en_attente' });
  await assert.rejects(agent.creerDemande(w.S2.id, DEMANDE_SPECIALISTES, {}), /pas encore validée/);
  await assert.rejects(agent.creerDemande(w.S1.id, { ...DEMANDE_SPECIALISTES, modalites: [] }, {}), /modalité/);
});

test('concurrence : deux réponses simultanées en attribution automatique, un seul retenu', async () => {
  const w = await monde();
  const { agent, depot } = w;
  await depot.structures.maj(w.S1.id, { attribution_auto: true });
  const A = await agent.creerDemande(w.S1.id, DEMANDE_SPECIALISTES, w.acteurS1);
  const [a, b] = await Promise.all([
    agent.utiliserJeton(jeton(w.dernier(w.nom('R1'), 'proposition'), 'Je suis disponible')),
    agent.utiliserJeton(jeton(w.dernier(w.nom('R2'), 'proposition'), 'Je suis disponible')),
  ]);
  const retenus = (await depot.propositions.parDemande(A.demande.id)).filter(p => p.etat === 'retenu');
  assert.equal(retenus.length, 1);
  assert.equal([a, b].filter(x => x.etat === 'retenu').length, 1, 'une seule réponse aboutit à « retenu »');
  assert.equal((await depot.demandes.get(A.demande.id)).etat, 'pourvue');
});
