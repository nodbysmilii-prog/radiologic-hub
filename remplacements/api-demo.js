/* =========================================================
   RadiologicHub — Remplacements : mode démonstration
   ---------------------------------------------------------
   Tant que Supabase n'est pas configuré (remplacements/config.js), le
   module fonctionne entièrement dans le navigateur avec des données
   FICTIVES : même agent (noyau/moteur.js), dépôt en mémoire sauvegardé
   localement, e-mails déposés dans une « boîte d'envoi » consultable
   (les boutons des e-mails fonctionnent). On peut changer d'utilisateur
   et avancer l'horloge pour voir relances, rappels et récapitulatifs.
   Même interface que api-supabase.js.
   ========================================================= */

(function () {
  'use strict';
  const RH = window.RHRemplacements;
  const REF = RH.referentiel;
  const CLE = 'rh-remplacements-demo-v1';
  const ADMIN_EMAIL = 'admin@demo.radiologichub.tn';
  const base = location.href.replace(/[#?].*$/, '').replace(/\/[^/]*$/, '');

  let etat = null, depot = null, agent = null, demarrage = null;

  const lireLocal = () => { try { return JSON.parse(localStorage.getItem(CLE) || 'null'); } catch (e) { return null; } };
  const sauver = () => {
    etat.tables = depot.exporter();
    try { localStorage.setItem(CLE, JSON.stringify(etat)); } catch (e) { /* stockage plein ou bloqué : la démo continue en mémoire */ }
    window.dispatchEvent(new CustomEvent('rp:demo'));
  };
  const maintenant = () => new Date(Date.now() + (etat ? etat.decalage_h : 0) * 3600 * 1000);
  const modeles = new Map();
  const charger = async nom => {
    if (!modeles.has(nom)) {
      const r = await fetch(`${base}/remplacements/modeles/emails/${nom}.html`);
      if (!r.ok) throw new Error(`Modèle ${nom} introuvable`);
      modeles.set(nom, await r.text());
    }
    return modeles.get(nom);
  };
  let contrat = null;
  const modeleContrat = async () => (contrat = contrat || await (await fetch(`${base}/remplacements/modeles/contrat.md`)).text());

  async function construire(tables) {
    depot = RH.depotMemoire.creerDepot(tables);
    const messagerie = RH.messagerie.creerMessagerie({
      charger,
      transport: async m => {
        etat.boite.unshift({ id: depot.id(), quand: maintenant().toISOString(), a: m.a, objet: m.objet, html: m.html, modele: m.modele, pieces: (m.pieces_jointes || []).map(p => ({ nom: p.nom, type: p.type, contenu: p.contenu })) });
        etat.boite = etat.boite.slice(0, 150);
        return { ok: true, id: 'demo' };
      },
      expediteur: { email: 'remplacements@radiologichub.com', nom: 'RadiologicHub Remplacements' },
    });
    agent = RH.moteur.creerAgent({
      depot, notifier: messagerie, horloge: maintenant,
      config: { urlSite: base, secret: 'demo-secret', modeleContrat: await modeleContrat(), emailsAdmin: [ADMIN_EMAIL] },
    });
  }

  /* ---------- Données fictives de départ ---------- */
  async function semer() {
    etat = { version: 1, decalage_h: 0, boite: [], utilisateur: null, tables: null };
    await construire(null);
    const auj = REF.dateLocale(maintenant());
    const jours = n => Array.from({ length: n }, (_, i) => REF.ajouterJours(auj, i + 1));
    const ouvres = jours(40).filter(d => ![0, 6].includes(REF.jourSemaine(d)));
    const weekEnds = jours(40).filter(d => [0, 6].includes(REF.jourSemaine(d)));
    const profil = async (nom, prenom, email) => depot.profils.ajouter({ nom, prenom, email, telephone: '98' + String(Math.floor(Math.random() * 1e6)).padStart(6, '0'), consentement_le: maintenant().toISOString() });
    const rempl = async (p, champs, dispos) => {
      await depot.remplacants.ajouter({ id: p.id, etat: 'valide', affectation: 'Service de radiologie (démo)', honoraires_souhaites: 400, valide_le: maintenant().toISOString(), cree_le: maintenant().toISOString(), ...champs });
      for (const [date, cr] of dispos) await depot.disponibilites.definir(p.id, date, cr);
    };
    const amel = await profil('TEST', 'Amel', 'amel.test@demo.radiologichub.tn');
    await rempl(amel, { statut: 'specialiste', competences: ['conventionnelle', 'echographie', 'mammographie', 'scanner', 'irm'], gouvernorats: ['Tunis', 'Ariana', 'Ben Arous'], honoraires_souhaites: 450 },
      ouvres.filter((d, i) => i % 3 !== 2).map(d => [d, ['journee']]));
    const sami = await profil('EXEMPLE', 'Sami', 'sami.exemple@demo.radiologichub.tn');
    await rempl(sami, { statut: 'resident', annee_residanat: 4, competences: ['conventionnelle', 'echographie', 'scanner'], gouvernorats: ['Tunis', 'La Manouba', 'Ariana'], honoraires_souhaites: 250 },
      [...ouvres.map(d => [d, ['journee']]), ...weekEnds.map(d => [d, ['garde']])]);
    const ines = await profil('DÉMO', 'Ines', 'ines.demo@demo.radiologichub.tn');
    await rempl(ines, { statut: 'specialiste', competences: ['echographie', 'mammographie', 'scanner', 'irm', 'interventionnel'], gouvernorats: ['Sousse', 'Monastir', 'Mahdia', 'Tunis'], honoraires_souhaites: 500 },
      ouvres.filter((d, i) => i % 2 === 0).map(d => [d, ['matin', 'apres_midi']]));
    const karim = await profil('FICTIF', 'Karim', 'karim.fictif@demo.radiologichub.tn');
    await rempl(karim, { statut: 'resident', annee_residanat: 3, competences: ['conventionnelle', 'echographie'], gouvernorats: ['Tunis'], honoraires_souhaites: 200 },
      ouvres.map(d => [d, ['journee']]));
    // inscriptions en attente de validation
    const leila = await profil('ATTENTE', 'Leila', 'leila.attente@demo.radiologichub.tn');
    await depot.remplacants.ajouter({ id: leila.id, etat: 'en_attente', statut: 'specialiste', affectation: 'Cabinet libéral (démo)', competences: ['echographie', 'mammographie'], gouvernorats: ['Sfax'], honoraires_souhaites: 380, cree_le: maintenant().toISOString() });
    // structures
    const resp = await profil('RESPONSABLE', 'Mme', 'responsable@orangers-demo.tn');
    const orangers = await depot.structures.ajouter({ nom: 'Clinique Les Orangers (démo)', type: 'clinique', adresse: '12 avenue de la Démo', ville: 'Tunis', gouvernorat: 'Tunis', equipements: ['conventionnelle', 'echographie', 'scanner', 'irm'], contact_nom: 'Mme Responsable', telephone: '71000001', email: 'contact@orangers-demo.tn', etat: 'valide', attribution_auto: false, delai_relance_h: 12, cree_par: resp.id, cree_le: maintenant().toISOString() });
    await depot.membres.ajouter({ structure_id: orangers.id, profil_id: resp.id, role: 'responsable' });
    const gerant = await profil('GÉRANT', 'M.', 'gerant@radiolac-demo.tn');
    const lac = await depot.structures.ajouter({ nom: 'Cabinet Radio du Lac (démo)', type: 'cabinet', adresse: '3 rue du Lac', ville: 'La Soukra', gouvernorat: 'Ariana', equipements: ['conventionnelle', 'echographie', 'mammographie'], contact_nom: 'M. Gérant', telephone: '71000002', email: 'contact@radiolac-demo.tn', etat: 'valide', attribution_auto: true, delai_relance_h: 6, cree_par: gerant.id, cree_le: maintenant().toISOString() });
    await depot.membres.ajouter({ structure_id: lac.id, profil_id: gerant.id, role: 'responsable' });
    const sfax = await depot.structures.ajouter({ nom: 'Cabinet Démo Sfax', type: 'cabinet', adresse: '5 avenue Test', ville: 'Sfax', gouvernorat: 'Sfax', equipements: ['echographie'], contact_nom: 'Dr Attente', telephone: '74000003', email: 'contact@sfax-demo.tn', etat: 'en_attente', cree_le: maintenant().toISOString() });
    await depot.membres.ajouter({ structure_id: sfax.id, profil_id: leila.id, role: 'responsable' });
    await depot.profils.ajouter({ nom: 'ADMINISTRATEUR', prenom: '', email: ADMIN_EMAIL, telephone: '' });
    // une demande déjà publiée, avec une réponse « disponible »
    const date = ouvres[3];
    const r = await agent.creerDemande(orangers.id, { dates: [date], heure_debut: '08:00', heure_fin: '16:00', type: 'journee', modalites: ['echographie', 'scanner'], profil: 'residents', annee_min: 4, honoraires: 420, unite: 'jour', repas: true, commentaire: 'Démonstration : demande de départ.' }, { role: 'structure', profil_id: resp.id });
    const pSami = (await depot.propositions.parDemande(r.demande.id)).find(p => p.remplacant_id === sami.id);
    if (pSami) await agent.repondre(pSami.id, 'disponible', { role: 'remplacant', profil_id: sami.id });
    etat.utilisateur = null;
    sauver();
  }

  async function initialiser() {
    const sauve = lireLocal();
    if (sauve && sauve.version === 1 && sauve.tables) { etat = sauve; await construire(sauve.tables); }
    else await semer();
  }

  /* ---------- Requêtes ---------- */
  const T = () => depot.tables;
  const moi = () => etat.utilisateur && T().profils.find(p => p.id === etat.utilisateur);
  const estAdmin = () => { const p = moi(); return !!p && p.email === ADMIN_EMAIL; };
  const exiger = cond => { if (!cond) throw new Error('Accès refusé.'); };
  const membre = sid => !!T().membres.find(m => m.structure_id === sid && m.profil_id === etat.utilisateur);
  const copie = o => JSON.parse(JSON.stringify(o));
  const avecProfil = r => ({ ...copie(r), profil: copie(T().profils.find(p => p.id === r.id) || {}) });
  const action = f => async (...a) => { const r = await f(...a); sauver(); return r; };

  const api = {
    mode: 'demo',
    /* initialisée seulement si la démonstration est la source choisie (api.js) */
    get pret() { return demarrage || (demarrage = initialiser()); },

    async session() {
      const p = moi();
      if (!p) return null;
      const r = T().remplacants.find(x => x.id === p.id);
      const structures = T().membres.filter(m => m.profil_id === p.id).map(m => ({ ...copie(T().structures.find(s => s.id === m.structure_id)), role: m.role })).filter(s => s.id);
      return { profil: copie(p), remplacant: r ? avecProfil(r) : null, structures, admin: estAdmin() };
    },
    async connexion(email) {
      email = String(email || '').trim().toLowerCase();
      let p = T().profils.find(x => x.email.toLowerCase() === email);
      if (!p) p = await depot.profils.ajouter({ email, nom: '', prenom: '', telephone: '' });
      etat.utilisateur = p.id;
      sauver();
      return { ok: true, demo: true };
    },
    async deconnexion() { etat.utilisateur = null; sauver(); },
    finaliserInscription: async () => null,

    inscrireRemplacant: action(async d => {
      if (!moi() || moi().email !== d.email.toLowerCase()) await api.connexion(d.email);
      const id = etat.utilisateur;
      await depot.profils.maj(id, { nom: d.nom, prenom: d.prenom, telephone: d.telephone, consentement_le: maintenant().toISOString() });
      if (T().remplacants.find(x => x.id === id)) throw new Error('Vous êtes déjà inscrit comme remplaçant.');
      await depot.remplacants.ajouter({ id, etat: 'en_attente', statut: d.statut, annee_residanat: d.statut === 'resident' ? Number(d.annee_residanat) : null, affectation: d.affectation, competences: d.competences, gouvernorats: d.gouvernorats, honoraires_souhaites: d.honoraires_souhaites === '' ? null : Number(d.honoraires_souhaites), justificatif: d.justificatif ? `${id}/${d.justificatif.name}` : null, cree_le: maintenant().toISOString() });
      await agent.inscriptionRecue('remplacant', id);
      return { ok: true, connecte: true };
    }),
    inscrireStructure: action(async d => {
      if (!moi() || moi().email !== d.compte_email.toLowerCase()) await api.connexion(d.compte_email);
      await depot.profils.maj(etat.utilisateur, { nom: d.compte_nom || moi().nom, prenom: d.compte_prenom || moi().prenom, telephone: d.compte_telephone || moi().telephone, consentement_le: maintenant().toISOString() });
      const s = await depot.structures.ajouter({ nom: d.nom, type: d.type, adresse: d.adresse, ville: d.ville, gouvernorat: d.gouvernorat, equipements: d.equipements, contact_nom: d.contact_nom, telephone: d.telephone, email: d.email, etat: 'en_attente', cree_par: etat.utilisateur, cree_le: maintenant().toISOString() });
      await depot.membres.ajouter({ structure_id: s.id, profil_id: etat.utilisateur, role: 'responsable' });
      await agent.inscriptionRecue('structure', s.id);
      return { ok: true, connecte: true };
    }),
    majProfil: action(async patch => depot.profils.maj(etat.utilisateur, patch)),
    majRemplacant: action(async patch => { const { etat: _e, ...p } = patch; return depot.remplacants.maj(etat.utilisateur, p); }),
    quitterRemplacant: action(async () => {
      const id = etat.utilisateur;
      T().remplacants = T().remplacants.filter(x => x.id !== id);
      T().disponibilites = T().disponibilites.filter(x => x.remplacant_id !== id);
      T().propositions = T().propositions.filter(x => x.remplacant_id !== id);
      await depot.journal.ajouter({ quand: maintenant().toISOString(), action: 'suppression_inscription', acteur_id: id, acteur_role: 'remplacant', objet_type: 'remplacant', objet_id: id, details: {} });
    }),
    majStructure: action(async (sid, patch) => {
      exiger(T().membres.find(m => m.structure_id === sid && m.profil_id === etat.utilisateur && m.role === 'responsable') || estAdmin());
      const { etat: _e, ...p } = patch;
      return depot.structures.maj(sid, p);
    }),
    envoyerJustificatif: action(async fichier => {
      const chemin = `${etat.utilisateur}/${fichier.name}`;
      await depot.remplacants.maj(etat.utilisateur, { justificatif: chemin });
      return chemin;
    }),
    lienJustificatif: async () => null,

    async disponibilites() { return copie(T().disponibilites.filter(x => x.remplacant_id === etat.utilisateur)); },
    definirDisponibilites: action(async (date, creneaux) => depot.disponibilites.definir(etat.utilisateur, date, creneaux)),

    /* Propositions et missions du remplaçant : [{ proposition, demande, structure }] */
    async mesPropositions() {
      return T().propositions.filter(p => p.remplacant_id === etat.utilisateur).map(p => {
        const d = T().demandes.find(x => x.id === p.demande_id);
        return { proposition: copie(p), demande: copie(d), structure: copie(T().structures.find(s => s.id === d.structure_id)) };
      });
    },
    repondre: action(async (pid, reponse) => {
      const p = T().propositions.find(x => x.id === pid);
      exiger(p && p.remplacant_id === etat.utilisateur);
      return agent.repondre(pid, reponse, { role: 'remplacant', profil_id: etat.utilisateur });
    }),

    /* Demandes d'une structure, avec compteurs et remplaçants disponibles */
    async demandesStructure(sid) {
      exiger(membre(sid) || estAdmin());
      const favoris = new Set(T().favoris.filter(f => f.structure_id === sid).map(f => f.remplacant_id));
      return T().demandes.filter(d => d.structure_id === sid).map(d => {
        const props = T().propositions.filter(p => p.demande_id === d.id);
        const visibles = props.filter(p => ['interesse', 'retenu', 'pourvu_autre', 'annulee', 'liberee'].includes(p.etat));
        return {
          demande: copie(d),
          compteurs: { contactes: props.length, disponibles: props.filter(p => ['interesse', 'retenu'].includes(p.etat)).length, declines: props.filter(p => p.etat === 'decline').length, en_attente: props.filter(p => p.etat === 'envoyee').length },
          interesses: visibles.map(p => ({ proposition: copie(p), remplacant: avecProfil(T().remplacants.find(r => r.id === p.remplacant_id)), favori: favoris.has(p.remplacant_id) })),
        };
      }).sort((a, b) => String(b.demande.publiee_le).localeCompare(String(a.demande.publiee_le)));
    },
    publier: action(async (sid, donnees) => {
      exiger(membre(sid));
      const r = await agent.creerDemande(sid, donnees, { role: 'structure', profil_id: etat.utilisateur });
      return { ok: true, demande_id: r.demande.id, envoyees: r.envoyees };
    }),
    choisir: action(async (did, rid) => { exiger(membre(T().demandes.find(d => d.id === did).structure_id)); return agent.choisir(did, rid, { role: 'structure', profil_id: etat.utilisateur }); }),
    annuler: action(async (did, o = {}) => {
      const d = T().demandes.find(x => x.id === did);
      if (d.remplacant_id === etat.utilisateur) return agent.annuler(did, 'remplacant', { role: 'remplacant', profil_id: etat.utilisateur }, o);
      exiger(membre(d.structure_id));
      return agent.annuler(did, 'structure', { role: 'structure', profil_id: etat.utilisateur }, o);
    }),
    retirer: action(async (did, motif) => { exiger(membre(T().demandes.find(d => d.id === did).structure_id)); return agent.cloturer(did, { role: 'structure', profil_id: etat.utilisateur }, motif); }),
    realisation: action(async (did, oui) => {
      const d = T().demandes.find(x => x.id === did);
      const partie = d.remplacant_id === etat.utilisateur ? 'remplacant' : membre(d.structure_id) ? 'structure' : null;
      exiger(partie);
      return agent.confirmerRealisation(did, partie, oui, { role: partie, profil_id: etat.utilisateur });
    }),
    basculerFavori: action(async (sid, rid) => { exiger(membre(sid)); return depot.favoris.basculer(sid, rid); }),
    async membres(sid) {
      exiger(membre(sid) || estAdmin());
      return T().membres.filter(m => m.structure_id === sid).map(m => ({ role: m.role, profil: copie(T().profils.find(p => p.id === m.profil_id)) }));
    },
    inviter: action(async (sid, email) => {
      exiger(T().membres.find(m => m.structure_id === sid && m.profil_id === etat.utilisateur && m.role === 'responsable'));
      let p = T().profils.find(x => x.email.toLowerCase() === email.toLowerCase());
      if (!p) p = await depot.profils.ajouter({ email: email.toLowerCase(), nom: '', prenom: '', telephone: '' });
      if (!T().membres.find(m => m.structure_id === sid && m.profil_id === p.id)) await depot.membres.ajouter({ structure_id: sid, profil_id: p.id, role: 'membre' });
      return { ok: true };
    }),
    retirerMembre: action(async (sid, pid) => {
      exiger(T().membres.find(m => m.structure_id === sid && m.profil_id === etat.utilisateur && m.role === 'responsable') || pid === etat.utilisateur);
      T().membres = T().membres.filter(m => !(m.structure_id === sid && m.profil_id === pid));
    }),

    /* Administration */
    admin: {
      async enAttente() {
        exiger(estAdmin());
        return {
          remplacants: T().remplacants.filter(r => r.etat === 'en_attente').map(avecProfil),
          structures: copie(T().structures.filter(s => s.etat === 'en_attente')),
        };
      },
      async comptes() {
        exiger(estAdmin());
        return { remplacants: T().remplacants.map(avecProfil), structures: copie(T().structures) };
      },
      valider: action(async (type, id) => { exiger(estAdmin()); return agent.validerInscription(type, id, { role: 'admin', profil_id: etat.utilisateur }); }),
      refuser: action(async (type, id, motif) => { exiger(estAdmin()); return agent.refuserInscription(type, id, motif, { role: 'admin', profil_id: etat.utilisateur }); }),
      suspendre: action(async (type, id) => { exiger(estAdmin()); return (type === 'remplacant' ? depot.remplacants : depot.structures).maj(id, { etat: 'suspendu' }); }),
      async statistiques() {
        exiger(estAdmin());
        const compte = (l, k) => l.reduce((o, x) => { o[x[k]] = (o[x[k]] || 0) + 1; return o; }, {});
        const pourvues = T().demandes.filter(d => d.pourvue_le);
        return {
          remplacants: compte(T().remplacants, 'etat'), structures: compte(T().structures, 'etat'), demandes: compte(T().demandes, 'etat'), emails: compte(T().emails, 'statut'),
          delai_moyen_h: pourvues.length ? Math.round(pourvues.reduce((t, d) => t + (new Date(d.pourvue_le) - new Date(d.publiee_le)), 0) / pourvues.length / 360000) / 10 : null,
          honoraires: T().demandes.filter(d => d.etat === 'realisee').reduce((t, d) => t + d.honoraires * d.dates.length, 0),
        };
      },
      async emails() { exiger(estAdmin()); return copie(T().emails).sort((a, b) => b.cree_le.localeCompare(a.cree_le)).slice(0, 200); },
      async journal() { exiger(estAdmin()); return copie(T().journal).sort((a, b) => b.quand.localeCompare(a.quand)).slice(0, 200); },
      lancerTaches: action(async () => { exiger(estAdmin()); return agent.taches(); }),
    },

    /* Liens des e-mails (page remplacements-reponse.html) */
    lien: {
      infos: async j => agent.infosJeton(j),
      utiliser: action(async (j, o) => agent.utiliserJeton(j, o)),
      desinscrire: action(async code => agent.desinscrire(code)),
    },

    modeleContrat,

    /* Spécifique à la démonstration */
    demo: {
      maintenant,
      boite: () => etat.boite,
      utilisateurs: () => {
        const COURT = { en_attente: 'en attente', refuse: 'refusé', suspendu: 'suspendu' };
        const T2 = T();
        return T2.profils.map(p => {
          const r = T2.remplacants.find(x => x.id === p.id);
          const ms = T2.membres.filter(m => m.profil_id === p.id).map(m => T2.structures.find(s => s.id === m.structure_id)).filter(Boolean);
          const roles = [...(r ? [`${r.statut === 'resident' ? `Résident R${r.annee_residanat}` : 'Spécialiste'}${r.etat !== 'valide' ? ` (${COURT[r.etat]})` : ''}`] : []), ...ms.map(s => `${s.nom}${s.etat !== 'valide' ? ` (${COURT[s.etat]})` : ''}`)];
          const role = p.email === ADMIN_EMAIL ? 'Administrateur' : roles.length ? roles.join(' + ') : 'Sans rôle';
          return { id: p.id, libelle: `${[p.prenom, p.nom].filter(Boolean).join(' ') || p.email} — ${role}` };
        });
      },
      connecterComme: async id => { etat.utilisateur = id || null; sauver(); },
      avancer: action(async h => { etat.decalage_h += h; return agent.taches(); }),
      reinitialiser: async () => { try { localStorage.removeItem(CLE); } catch (e) { /* rien */ } await semer(); },
      modeleContrat,
    },
  };

  window.RHRp = window.RHRp || {};
  window.RHRp.apiDemo = api;
})();
