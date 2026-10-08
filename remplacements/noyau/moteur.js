/* =========================================================
   RadiologicHub — Remplacements : l'agent de mise en relation
   ---------------------------------------------------------
   Toute la logique métier, indépendante du stockage et du canal d'envoi :
     • depot    : accès aux données (mémoire pour les tests et la démo,
                  Supabase en production) — voir depot-memoire.js ;
     • notifier : envoi des messages (e-mail aujourd'hui ; WhatsApp ou
                  SMS demain, avec la même interface) ;
     • horloge  : fonction qui renvoie l'instant présent (testable).
   Parcours : publication → sélection des remplaçants compatibles →
   propositions par e-mail (liens à usage unique) → réponses → choix de la
   structure (ou attribution automatique au premier) → confirmations (.ics,
   contrat PDF, lien d'annulation) → rappel la veille → confirmation de
   réalisation → récapitulatif mensuel. Relances, alertes, annulations et
   remise en ligne. Chaque action est inscrite au journal.
   ========================================================= */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./referentiel.js'), require('./regles.js'), require('./recap.js'), require('./jetons.js'), require('./ics.js'), require('./contrat.js'));
  } else {
    const R = root.RHRemplacements = root.RHRemplacements || {};
    R.moteur = factory(R.referentiel, R.regles, R.recap, R.jetons, R.ics, R.contrat);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (REF, REG, RECAP, JET, ICS, CONTRAT) {
  'use strict';

  class ErreurMetier extends Error {
    constructor(message, code = 'invalide') { super(message); this.code = code; }
  }
  const HEURE = 3600 * 1000;
  const b64 = octets => {
    if (typeof Buffer !== 'undefined') return Buffer.from(octets).toString('base64');
    let s = '';
    octets.forEach(o => { s += String.fromCharCode(o); });
    return btoa(s);
  };
  const b64Texte = t => b64(new TextEncoder().encode(t));
  const moisPrecedent = cle => { const [a, m] = cle.split('-').map(Number); return m === 1 ? `${a - 1}-12` : `${a}-${String(m - 1).padStart(2, '0')}`; };

  function creerAgent({ depot, notifier, horloge = () => new Date(), config = {} }) {
    const cfg = { urlSite: '', secret: 'a-changer', delaiRelanceH: 12, heureRappel: '18:00', delaiRealisationH: 2, modeleContrat: null, emailsAdmin: [], ...config };
    const maintenant = () => new Date(horloge());
    const iso = () => maintenant().toISOString();
    const lien = (page, params) => `${cfg.urlSite}/${page}?${params}`;
    const lienJeton = j => lien('remplacements-reponse.html', `j=${encodeURIComponent(j)}`);
    const lienEspace = (ancre = '') => `${cfg.urlSite}/remplacements.html#/espace${ancre}`;

    /* ---------- Journal ---------- */
    const journal = (action, acteur, objet_type, objet_id, details = {}) => depot.journal.ajouter({
      quand: iso(), action, acteur_id: (acteur && acteur.profil_id) || null, acteur_role: (acteur && acteur.role) || 'agent', objet_type, objet_id, details,
    });
    const AGENT = { role: 'agent' };

    /* ---------- Jetons ---------- */
    async function creerJeton(champs) {
      const jeton = JET.nouveauJeton();
      await depot.jetons.ajouter({ hash: await JET.empreinte(jeton), cree_le: iso(), utilise_le: null, ...champs });
      return jeton;
    }
    const lienDesinscription = async cle => lien('remplacements-reponse.html', `d=${encodeURIComponent(cle)}.${await JET.signer(cle, cfg.secret)}`);

    /* ---------- Envoi d'un message (journal des e-mails, désinscription) ----------
       categorie 'information' (propositions, relances, récapitulatifs) : non envoyé après désinscription ;
       categorie 'essentiel' (mission confirmée, annulation, rappel, inscription) : toujours envoyé. */
    async function envoyer({ email, nom, profil_id = null, structure_id = null, modele, donnees = {}, pieces_jointes = [], categorie = 'essentiel' }) {
      if (!email) return { ok: false, erreur: 'destinataire sans e-mail' };
      let desinscrit = false, cle = null;
      if (profil_id) { const p = await depot.profils.get(profil_id); desinscrit = !!(p && p.desinscrit); cle = `p:${profil_id}`; }
      else if (structure_id) { const s = await depot.structures.get(structure_id); desinscrit = !!(s && s.desinscrit); cle = `s:${structure_id}`; }
      const entree = { cree_le: iso(), destinataire: email, profil_id, structure_id, modele, canal: 'email', statut: 'a_envoyer' };
      if (desinscrit && categorie === 'information') { await depot.emails.ajouter({ ...entree, statut: 'ignore_desinscrit' }); return { ok: false, ignore: true }; }
      const id = await depot.emails.ajouter(entree);
      const tout = {
        site: 'RadiologicHub', url_site: cfg.urlSite, url_espace: lienEspace(), url_mentions: `${cfg.urlSite}/mentions-legales.html`,
        destinataire: { nom: nom || '', email }, lien_desinscription: cle ? await lienDesinscription(cle) : '', ...donnees,
      };
      try {
        const r = await notifier.envoyer({ a: { email, nom }, modele, donnees: tout, pieces_jointes });
        await depot.emails.maj(id, { statut: r && r.ok ? 'envoye' : 'echec', objet: (r && r.objet) || null, envoye_le: iso(), erreur: (r && r.erreur) || null, fournisseur_id: (r && r.id) || null });
        return r || { ok: false };
      } catch (e) {
        await depot.emails.maj(id, { statut: 'echec', erreur: String((e && e.message) || e) });
        return { ok: false, erreur: String((e && e.message) || e) };
      }
    }
    /* Destinataires côté structure : e-mail de la structure + auteur de la demande */
    async function destinatairesStructure(s, d) {
      const liste = [{ email: s.email, nom: s.contact_nom || s.nom, structure_id: s.id }];
      if (d && d.cree_par) {
        const p = await depot.profils.get(d.cree_par);
        if (p && p.email && p.email.toLowerCase() !== String(s.email).toLowerCase()) liste.push({ email: p.email, nom: `${p.prenom} ${p.nom}`, profil_id: p.id });
      }
      return liste;
    }
    const envoyerStructure = async (s, d, modele, donnees, extra = {}) => {
      for (const dest of await destinatairesStructure(s, d)) await envoyer({ ...dest, modele, donnees, ...extra });
    };
    const envoyerRemplacant = (r, modele, donnees, extra = {}) => envoyer({ email: r.profil.email, nom: `Dr ${r.profil.prenom} ${r.profil.nom}`, profil_id: r.id, modele, donnees, ...extra });

    /* ---------- Pièces jointes : agenda (.ics) et contrat (PDF) ---------- */
    function pieceIcs(d, s, r, annule = false) {
      const rc = RECAP.demande(d, s);
      const texte = ICS.calendrier({
        uid: d.id, annule, maintenant: maintenant(),
        titre: `${annule ? 'ANNULÉ — ' : ''}Remplacement en radiologie — ${s.nom}`,
        lieu: rc.adresse, dates: d.dates, heure_debut: d.heure_debut, heure_fin: d.heure_fin,
        description: `${rc.type} — ${rc.modalites}\nRemplaçant : Dr ${r.profil.prenom} ${r.profil.nom}\nHonoraires : ${rc.honoraires} ${rc.unite}\nRéférence : ${rc.reference}`,
      });
      return { nom: `remplacement-${rc.reference}.ics`, type: 'text/calendar', contenu: b64Texte(texte) };
    }
    function pieceContrat(d, s, r) {
      if (!cfg.modeleContrat) return null;
      const donnees = CONTRAT.donneesContrat({ demande: d, structure: s, remplacant: r, profil: r.profil, maintenant: maintenant() });
      return { nom: `contrat-${donnees.mission.reference}.pdf`, type: 'application/pdf', contenu: b64(CONTRAT.pdfContrat(cfg.modeleContrat, donnees)) };
    }

    /* ---------- Sélection et propositions ---------- */
    async function envoyerProposition(d, s, r, p, variante = 'proposition') {
      const expire_le = REG.debut(d).toISOString();
      const base = { demande_id: d.id, proposition_id: p.id, profil_id: r.id, partie: 'remplacant', expire_le };
      const oui = await creerJeton({ ...base, action: 'disponible' });
      const non = await creerJeton({ ...base, action: 'indisponible' });
      return envoyerRemplacant(r, 'proposition', {
        demande: RECAP.demande(d, s), remplacant: RECAP.remplacant(r, r.profil),
        lien_oui: lienJeton(oui), lien_non: lienJeton(non), relance: variante === 'relance', remise: variante === 'remise',
      }, { categorie: 'information' });
    }

    /* Disponibilités groupées : { remplaçant: { date: [créneaux] } } */
    async function disposPour(ids, dates) {
      const parR = {};
      (await depot.disponibilites.pour(ids, dates)).forEach(x => {
        ((parR[x.remplacant_id] = parR[x.remplacant_id] || {})[x.date] = parR[x.remplacant_id][x.date] || []).push(x.creneau);
      });
      return parR;
    }
    async function compatibles(d, s, candidats) {
      if (!candidats.length) return [];
      const ids = candidats.map(r => r.id);
      const dispos = await disposPour(ids, d.dates);
      const missions = await depot.demandes.confirmeesPour(ids);
      return candidats.filter(r => REG.compatible({ ...r, desinscrit: r.profil && r.profil.desinscrit }, d, s, dispos[r.id] || {}, missions.filter(m => m.remplacant_id === r.id)).ok);
    }

    /* Envoie la demande aux remplaçants compatibles pas encore contactés (idempotent) */
    async function selectionner(demandeId) {
      const d = await depot.demandes.get(demandeId);
      if (!d || d.etat !== 'publiee') return 0;
      const s = await depot.structures.get(d.structure_id);
      const contactes = new Set((await depot.propositions.parDemande(d.id)).map(p => p.remplacant_id));
      const exclus = new Set(d.exclus || []);
      const candidats = (await depot.remplacants.valides()).filter(r => !contactes.has(r.id) && !exclus.has(r.id));
      const retenus = await compatibles(d, s, candidats);
      for (const r of retenus) {
        const p = await depot.propositions.ajouter({ demande_id: d.id, remplacant_id: r.id, etat: 'envoyee', envoyee_le: iso(), reponse: null });
        await envoyerProposition(d, s, r, p);
      }
      if (retenus.length) await journal('selection', AGENT, 'demande', d.id, { nombre: retenus.length, remplacants: retenus.map(r => r.id) });
      return retenus.length;
    }

    /* ---------- Demandes ---------- */
    async function creerDemande(structureId, donnees, acteur) {
      const s = await depot.structures.get(structureId);
      if (!s) throw new ErreurMetier('Structure introuvable.', 'introuvable');
      if (s.etat !== 'valide') throw new ErreurMetier("La structure n'est pas encore validée par l'administrateur.", 'non_valide');
      const d0 = {
        structure_id: s.id, cree_par: (acteur && acteur.profil_id) || null, dates: [...new Set(donnees.dates || [])].sort(),
        heure_debut: donnees.heure_debut, heure_fin: donnees.heure_fin, type: donnees.type, modalites: donnees.modalites || [],
        profil: donnees.profil, annee_min: donnees.profil === 'residents' && donnees.annee_min ? Number(donnees.annee_min) : null,
        honoraires: Number(donnees.honoraires), unite: donnees.unite, logement: !!donnees.logement, transport: !!donnees.transport, repas: !!donnees.repas,
        commentaire: String(donnees.commentaire || '').slice(0, 1000), etat: 'publiee', publiee_le: iso(), exclus: [],
      };
      const erreurs = REG.validerDemande(d0, REF.dateLocale(maintenant()));
      if (erreurs.length) throw new ErreurMetier(erreurs.join(' '));
      const d = await depot.demandes.ajouter(d0);
      await journal('publication', acteur, 'demande', d.id);
      const envoyees = await selectionner(d.id);
      return { demande: await depot.demandes.get(d.id), envoyees };
    }

    /* Réponse d'un remplaçant (lien de l'e-mail ou espace personnel) */
    async function repondre(propositionId, reponse, acteur) {
      const p = await depot.propositions.get(propositionId);
      if (!p) return { ok: false, raison: 'introuvable' };
      const d = await depot.demandes.get(p.demande_id);
      if (p.etat !== 'envoyee') return { ok: false, raison: 'deja_repondu', etat: p.etat };
      if (d.etat !== 'publiee') {
        await depot.propositions.maj(p.id, { etat: 'expiree' });
        return { ok: false, raison: d.etat === 'pourvue' ? 'pourvu' : 'close' };
      }
      await depot.jetons.invalider({ proposition_id: p.id, quand: iso() });
      if (reponse !== 'disponible') {
        await depot.propositions.maj(p.id, { reponse: 'indisponible', repondu_le: iso(), etat: 'decline' });
        await journal('reponse_indisponible', acteur, 'proposition', p.id, { demande_id: d.id });
        return { ok: true, etat: 'decline' };
      }
      await depot.propositions.maj(p.id, { reponse: 'disponible', repondu_le: iso(), etat: 'interesse' });
      await journal('reponse_disponible', acteur, 'proposition', p.id, { demande_id: d.id });
      const s = await depot.structures.get(d.structure_id);
      if (s.attribution_auto) {
        const res = await choisir(d.id, p.remplacant_id, AGENT);
        return { ok: true, etat: res.ok ? 'retenu' : 'interesse' };
      }
      await signalerInteresses(d, s, p.remplacant_id);
      return { ok: true, etat: 'interesse' };
    }

    /* E-mail à la structure : liste des remplaçants disponibles, chacun avec son bouton « Choisir » */
    async function signalerInteresses(d, s, nouveauId) {
      const props = (await depot.propositions.parDemande(d.id)).filter(x => x.etat === 'interesse');
      const favoris = new Set(await depot.favoris.parStructure(s.id));
      const interesses = [];
      for (const x of props) {
        const r = await depot.remplacants.get(x.remplacant_id);
        const choix = await creerJeton({ action: 'choisir', demande_id: d.id, proposition_id: x.id, partie: 'structure', profil_id: null, expire_le: REG.debut(d).toISOString() });
        interesses.push({ ...RECAP.remplacant(r, r.profil), favori: favoris.has(r.id), nouveau: r.id === nouveauId, lien_choisir: lienJeton(choix) });
      }
      interesses.sort((a, b) => Number(b.favori) - Number(a.favori));
      const nouveau = interesses.find(i => i.nouveau);
      await envoyerStructure(s, d, 'interesse', { demande: RECAP.demande(d, s), nouveau, interesses, nombre: interesses.length, lien_demande: lienEspace(`/demande/${d.id}`) });
    }

    /* La structure choisit un remplaçant parmi les disponibles (ou attribution automatique) */
    async function choisir(demandeId, remplacantId, acteur) {
      const d = await depot.demandes.get(demandeId);
      if (!d) return { ok: false, raison: 'introuvable' };
      if (d.etat !== 'publiee') return { ok: false, raison: d.etat === 'pourvue' ? 'pourvu' : 'close' };
      const props = await depot.propositions.parDemande(d.id);
      const p = props.find(x => x.remplacant_id === remplacantId);
      if (!p || p.etat !== 'interesse') return { ok: false, raison: 'non_disponible' };
      const auto = acteur && acteur.role === 'agent';
      const d2 = await depot.demandes.maj(d.id, {
        etat: 'pourvue', remplacant_id: remplacantId, pourvue_le: iso(), attribution: auto ? 'auto' : 'manuelle',
        rappel_le: null, realisation_demandee_le: null, realisation_remplacant: null, realisation_structure: null,
      }, { siEtat: 'publiee' });
      if (!d2) return { ok: false, raison: 'pourvu' };                     // quelqu'un a été retenu entre-temps
      await depot.propositions.maj(p.id, { etat: 'retenu', choisi_le: iso() });
      await depot.jetons.invalider({ demande_id: d.id, actions: ['choisir', 'disponible', 'indisponible'], quand: iso() });
      const s = await depot.structures.get(d.structure_id);
      for (const x of props.filter(y => y.id !== p.id)) {
        if (x.etat === 'interesse') {
          await depot.propositions.maj(x.id, { etat: 'pourvu_autre' });
          const rx = await depot.remplacants.get(x.remplacant_id);
          await envoyerRemplacant(rx, 'poste-pourvu', { demande: RECAP.demande(d2, s) }, { categorie: 'information' });
        } else if (x.etat === 'envoyee') await depot.propositions.maj(x.id, { etat: 'expiree' });
      }
      await journal('choix', acteur, 'demande', d.id, { remplacant_id: remplacantId, attribution: auto ? 'auto' : 'manuelle' });
      await confirmer(d2, s, await depot.remplacants.get(remplacantId));
      return { ok: true };
    }

    /* Confirmations aux deux parties : récapitulatif, coordonnées, .ics, contrat, lien d'annulation */
    async function confirmer(d, s, r) {
      const exp = REG.debut(d).toISOString();
      const pieces = [pieceIcs(d, s, r), pieceContrat(d, s, r)].filter(Boolean);
      const rc = RECAP.demande(d, s);
      const annulR = await creerJeton({ action: 'annuler', demande_id: d.id, partie: 'remplacant', profil_id: r.id, expire_le: exp });
      await envoyerRemplacant(r, 'confirmation-remplacant', { demande: rc, structure: RECAP.structure(s), lien_annuler: lienJeton(annulR), lien_mission: lienEspace(`/mission/${d.id}`) }, { pieces_jointes: pieces });
      const annulS = await creerJeton({ action: 'annuler', demande_id: d.id, partie: 'structure', profil_id: null, expire_le: exp });
      await envoyerStructure(s, d, 'confirmation-structure', { demande: rc, remplacant: RECAP.remplacant(r, r.profil), lien_annuler: lienJeton(annulS), lien_demande: lienEspace(`/demande/${d.id}`), auto: d.attribution === 'auto' }, { pieces_jointes: pieces });
    }

    /* Annulation d'une mission confirmée par l'une des parties → e-mail à l'autre, remise en ligne */
    async function annuler(demandeId, partie, acteur, o = {}) {
      const d = await depot.demandes.get(demandeId);
      if (!d) return { ok: false, raison: 'introuvable' };
      if (d.etat !== 'pourvue') return { ok: false, raison: 'deja_annule' };
      if (REG.debut(d) <= maintenant()) return { ok: false, raison: 'commencee' };
      const s = await depot.structures.get(d.structure_id);
      const r = await depot.remplacants.get(d.remplacant_id);
      const p = (await depot.propositions.parDemande(d.id)).find(x => x.remplacant_id === d.remplacant_id);
      if (p) await depot.propositions.maj(p.id, { etat: partie === 'remplacant' ? 'annulee' : 'liberee', annule_le: iso() });
      await depot.jetons.invalider({ demande_id: d.id, actions: ['annuler', 'realise_oui', 'realise_non'], quand: iso() });
      const definitif = partie === 'structure' && !!o.definitif;
      const motif = String(o.motif || '').slice(0, 500);
      await journal('annulation', acteur, 'demande', d.id, { partie, remplacant_id: d.remplacant_id, definitif, motif });
      const rc = RECAP.demande(d, s);
      if (partie === 'remplacant') {
        await envoyerStructure(s, d, 'annulation', { demande: rc, par: 'le remplaçant', remplacant: RECAP.remplacant(r, r.profil), motif, remise: true, pour_structure: true });
      } else {
        await envoyerRemplacant(r, 'annulation', { demande: rc, par: 'la structure', motif, remise: false, pour_structure: false }, { pieces_jointes: [pieceIcs(d, s, r, true)] });
      }
      if (definitif) {
        await depot.demandes.maj(d.id, { etat: 'annulee', annulee_le: iso() });
        return { ok: true, remise: false };
      }
      const exclus = [...new Set([...(d.exclus || []), d.remplacant_id])];
      const d2 = await depot.demandes.maj(d.id, { etat: 'publiee', remplacant_id: null, publiee_le: iso(), relancee_le: null, remise_le: iso(), exclus }, { siEtat: 'pourvue' });
      if (!d2) return { ok: false, raison: 'deja_annule' };
      await journal('remise_en_ligne', AGENT, 'demande', d.id);
      // les remplaçants déjà intéressés, ou restés sans réponse, reçoivent de nouveau la proposition
      const anciens = (await depot.propositions.parDemande(d.id)).filter(x => !exclus.includes(x.remplacant_id) && ['pourvu_autre', 'expiree'].includes(x.etat));
      const rs = [];
      for (const x of anciens) rs.push(await depot.remplacants.get(x.remplacant_id));
      const encore = new Set((await compatibles(d2, s, rs)).map(x => x.id));
      for (const x of anciens) {
        if (!encore.has(x.remplacant_id)) continue;
        await depot.propositions.maj(x.id, { etat: 'envoyee', reponse: null, repondu_le: null, envoyee_le: iso() });
        await envoyerProposition(d2, s, rs.find(y => y.id === x.remplacant_id), x, 'remise');
      }
      await selectionner(d.id);
      return { ok: true, remise: true };
    }

    /* La structure retire une demande (en recherche ou pourvue) */
    async function cloturer(demandeId, acteur, motif = '') {
      const d = await depot.demandes.get(demandeId);
      if (!d) return { ok: false, raison: 'introuvable' };
      if (d.etat === 'pourvue') return annuler(demandeId, 'structure', acteur, { definitif: true, motif });
      if (d.etat !== 'publiee') return { ok: false, raison: 'close' };
      await depot.demandes.maj(d.id, { etat: 'annulee', annulee_le: iso() });
      await depot.jetons.invalider({ demande_id: d.id, quand: iso() });
      const s = await depot.structures.get(d.structure_id);
      for (const x of await depot.propositions.parDemande(d.id)) {
        if (!['envoyee', 'interesse'].includes(x.etat)) continue;
        await depot.propositions.maj(x.id, { etat: 'expiree' });
        if (x.etat === 'interesse') await envoyerRemplacant(await depot.remplacants.get(x.remplacant_id), 'demande-annulee', { demande: RECAP.demande(d, s) }, { categorie: 'information' });
      }
      await journal('retrait', acteur, 'demande', d.id, { motif });
      return { ok: true };
    }

    /* Après la mission : « le remplacement a-t-il eu lieu ? » */
    async function confirmerRealisation(demandeId, partie, oui, acteur) {
      const d = await depot.demandes.get(demandeId);
      if (!d || !['pourvue', 'realisee', 'non_realisee'].includes(d.etat)) return { ok: false, raison: 'close' };
      const champ = partie === 'remplacant' ? 'realisation_remplacant' : 'realisation_structure';
      const autre = partie === 'remplacant' ? d.realisation_structure : d.realisation_remplacant;
      if (d[champ] != null) return { ok: false, raison: 'deja_repondu' };
      const etat = oui === false || autre === false ? 'non_realisee' : 'realisee';
      await depot.demandes.maj(d.id, { [champ]: !!oui, etat });
      await journal('realisation', acteur, 'demande', d.id, { partie, oui: !!oui });
      if (etat === 'non_realisee' && d.etat !== 'non_realisee') {
        const s = await depot.structures.get(d.structure_id);
        for (const email of cfg.emailsAdmin) await envoyer({ email, nom: 'Administrateur', modele: 'admin-litige', donnees: { demande: RECAP.demande(d, s), partie: partie === 'remplacant' ? 'le remplaçant' : 'la structure' } });
      }
      return { ok: true, etat };
    }

    /* ---------- Liens des e-mails (sans connexion) ---------- */
    async function jetonValide(jeton) {
      const j = await depot.jetons.get(await JET.empreinte(String(jeton || '')));
      if (!j) return { valide: false, raison: 'inconnu' };
      if (j.utilise_le) return { valide: false, raison: 'utilise', j };
      if (j.expire_le && new Date(j.expire_le) <= maintenant()) return { valide: false, raison: 'expire', j };
      return { valide: true, j };
    }
    /* Ce que propose le lien, sans le consommer (page de confirmation) */
    async function infosJeton(jeton) {
      const v = await jetonValide(jeton);
      const j = v.j;
      if (!j) return { valide: false, raison: v.raison };
      const d = await depot.demandes.get(j.demande_id);
      const s = d && await depot.structures.get(d.structure_id);
      const info = { valide: v.valide, raison: v.raison || null, action: j.action, partie: j.partie, demande: d ? RECAP.demande(d, s) : null, etat_demande: d && d.etat };
      if (!v.valide || !d) return info;
      const p = j.proposition_id && await depot.propositions.get(j.proposition_id);
      if (['disponible', 'indisponible'].includes(j.action)) {
        if (p.etat !== 'envoyee') return { ...info, valide: false, raison: 'deja_repondu' };
        if (d.etat !== 'publiee') return { ...info, valide: false, raison: d.etat === 'pourvue' ? 'pourvu' : 'close' };
      }
      if (j.action === 'choisir') {
        if (d.etat !== 'publiee') return { ...info, valide: false, raison: d.etat === 'pourvue' ? 'pourvu' : 'close' };
        if (p.etat !== 'interesse') return { ...info, valide: false, raison: 'non_disponible' };
        const r = await depot.remplacants.get(p.remplacant_id);
        info.remplacant = RECAP.remplacant(r, r.profil);
      }
      if (j.action === 'annuler' && d.etat !== 'pourvue') return { ...info, valide: false, raison: 'deja_annule' };
      if (['realise_oui', 'realise_non'].includes(j.action)) {
        const champ = j.partie === 'remplacant' ? 'realisation_remplacant' : 'realisation_structure';
        if (d[champ] != null) return { ...info, valide: false, raison: 'deja_repondu' };
      }
      return info;
    }
    /* Consomme le lien (après confirmation sur la page) */
    async function utiliserJeton(jeton, o = {}) {
      const info = await infosJeton(jeton);
      if (!info.valide) return { ok: false, ...info };
      const hash = await JET.empreinte(String(jeton));
      if (!(await depot.jetons.consommer(hash, iso()))) return { ok: false, raison: 'utilise' };
      const j = await depot.jetons.get(hash);
      const acteur = { role: j.partie === 'structure' ? 'structure' : 'remplacant', profil_id: j.profil_id || null, via: 'lien' };
      let res;
      switch (j.action) {
        case 'disponible': case 'indisponible': res = await repondre(j.proposition_id, j.action, acteur); break;
        case 'choisir': { const p = await depot.propositions.get(j.proposition_id); res = await choisir(j.demande_id, p.remplacant_id, acteur); break; }
        case 'annuler': res = await annuler(j.demande_id, j.partie, acteur, { definitif: !!o.definitif, motif: o.motif }); break;
        case 'realise_oui': case 'realise_non': res = await confirmerRealisation(j.demande_id, j.partie, j.action === 'realise_oui', acteur); break;
        default: res = { ok: false, raison: 'inconnu' };
      }
      return { ...info, ...res, action: j.action };
    }
    /* Lien de désinscription (signé) */
    async function desinscrire(code) {
      const i = String(code || '').lastIndexOf('.');
      const cle = String(code).slice(0, i), sig = String(code).slice(i + 1);
      if (i < 0 || !(await JET.verifier(cle, sig, cfg.secret))) return { ok: false, raison: 'inconnu' };
      const [type, id] = cle.split(':');
      if (type === 'p') await depot.profils.maj(id, { desinscrit: true });
      else if (type === 's') await depot.structures.maj(id, { desinscrit: true });
      else return { ok: false, raison: 'inconnu' };
      await journal('desinscription', { role: type === 'p' ? 'profil' : 'structure', profil_id: type === 'p' ? id : null }, type === 'p' ? 'profil' : 'structure', id);
      return { ok: true, type: type === 'p' ? 'profil' : 'structure' };
    }

    /* ---------- Inscriptions et validation par l'administrateur ---------- */
    async function cible(type, id) {
      if (type === 'remplacant') {
        const r = await depot.remplacants.get(id);
        return r && { r, nom: `Dr ${r.profil.prenom} ${r.profil.nom}`, destinataires: [{ email: r.profil.email, nom: `Dr ${r.profil.prenom} ${r.profil.nom}`, profil_id: r.id }] };
      }
      const s = await depot.structures.get(id);
      if (!s) return null;
      const dest = [{ email: s.email, nom: s.contact_nom || s.nom, structure_id: s.id }];
      for (const m of await depot.membres.parStructure(s.id)) {
        const p = await depot.profils.get(m.profil_id);
        if (p && p.email && !dest.some(x => x.email.toLowerCase() === p.email.toLowerCase())) dest.push({ email: p.email, nom: `${p.prenom} ${p.nom}`, profil_id: p.id });
      }
      return { s, nom: s.nom, destinataires: dest };
    }
    const TYPE_LIB = { remplacant: 'remplaçant', structure: 'structure' };
    async function inscriptionRecue(type, id) {
      const c = await cible(type, id);
      if (!c) throw new ErreurMetier('Inscription introuvable.', 'introuvable');
      await journal('inscription', { role: type, profil_id: c.r ? c.r.id : null }, type, id);
      for (const dest of c.destinataires.slice(0, 1)) await envoyer({ ...dest, modele: 'inscription-recue', donnees: { type: TYPE_LIB[type], nom: c.nom } });
      for (const email of cfg.emailsAdmin) await envoyer({ email, nom: 'Administrateur', modele: 'admin-inscription', donnees: { type: TYPE_LIB[type], nom: c.nom, lien_admin: `${cfg.urlSite}/remplacements.html#/admin` } });
      return { ok: true };
    }
    async function validerInscription(type, id, acteur) {
      const c = await cible(type, id);
      if (!c) throw new ErreurMetier('Inscription introuvable.', 'introuvable');
      const patch = { etat: 'valide', valide_le: iso(), valide_par: (acteur && acteur.profil_id) || null, motif_refus: null };
      if (type === 'remplacant') await depot.remplacants.maj(id, patch); else await depot.structures.maj(id, patch);
      await journal('validation', acteur, type, id);
      for (const dest of c.destinataires) await envoyer({ ...dest, modele: 'inscription-validee', donnees: { type: TYPE_LIB[type], nom: c.nom, remplacant: type === 'remplacant' } });
      return { ok: true };
    }
    async function refuserInscription(type, id, motif, acteur) {
      const c = await cible(type, id);
      if (!c) throw new ErreurMetier('Inscription introuvable.', 'introuvable');
      const patch = { etat: 'refuse', motif_refus: String(motif || '').slice(0, 500) };
      if (type === 'remplacant') await depot.remplacants.maj(id, patch); else await depot.structures.maj(id, patch);
      await journal('refus', acteur, type, id, { motif: patch.motif_refus });
      for (const dest of c.destinataires) await envoyer({ ...dest, modele: 'inscription-refusee', donnees: { type: TYPE_LIB[type], nom: c.nom, motif: patch.motif_refus } });
      return { ok: true };
    }

    /* ---------- Tâches planifiées (toutes les 15 minutes) ---------- */
    async function expirer(d, s) {
      await depot.demandes.maj(d.id, { etat: 'expiree' });
      for (const x of await depot.propositions.parDemande(d.id)) if (['envoyee', 'interesse'].includes(x.etat)) await depot.propositions.maj(x.id, { etat: 'expiree' });
      await journal('expiration', AGENT, 'demande', d.id);
      await envoyerStructure(s, d, 'expiree', { demande: RECAP.demande(d, s) });
    }
    async function relancer(d, s) {
      const props = await depot.propositions.parDemande(d.id);
      if (props.some(p => p.etat === 'interesse')) return false;
      const attente = props.filter(p => p.etat === 'envoyee');
      for (const p of attente) {
        await envoyerProposition(d, s, await depot.remplacants.get(p.remplacant_id), p, 'relance');
        await depot.propositions.maj(p.id, { relancee_le: iso() });
      }
      await depot.demandes.maj(d.id, { relancee_le: iso() });
      await envoyerStructure(s, d, 'alerte', { demande: RECAP.demande(d, s), contactes: props.length, delai: s.delai_relance_h || cfg.delaiRelanceH, lien_demande: lienEspace(`/demande/${d.id}`) });
      await journal('relance', AGENT, 'demande', d.id, { relances: attente.length });
      return true;
    }
    async function rappeler(d, s) {
      const r = await depot.remplacants.get(d.remplacant_id);
      const rc = RECAP.demande(d, s);
      await envoyerRemplacant(r, 'rappel', { demande: rc, pour_structure: false, autre: { nom: s.nom, telephone: s.telephone, email: s.email, adresse: rc.adresse, contact: s.contact_nom } });
      const rr = RECAP.remplacant(r, r.profil);
      await envoyerStructure(s, d, 'rappel', { demande: rc, pour_structure: true, autre: { nom: rr.nom_complet, telephone: rr.telephone, email: rr.email, statut: rr.statut } });
      await depot.demandes.maj(d.id, { rappel_le: iso() });
      await journal('rappel', AGENT, 'demande', d.id);
    }
    async function demanderRealisation(d, s) {
      const r = await depot.remplacants.get(d.remplacant_id);
      const rc = RECAP.demande(d, s);
      const exp = new Date(maintenant().getTime() + 30 * 24 * HEURE).toISOString();
      const pour = async (partie, profil_id) => ({
        oui: lienJeton(await creerJeton({ action: 'realise_oui', demande_id: d.id, partie, profil_id, expire_le: exp })),
        non: lienJeton(await creerJeton({ action: 'realise_non', demande_id: d.id, partie, profil_id, expire_le: exp })),
      });
      const lr = await pour('remplacant', r.id);
      await envoyerRemplacant(r, 'realisation', { demande: rc, lien_oui: lr.oui, lien_non: lr.non, pour_structure: false });
      const ls = await pour('structure', null);
      await envoyerStructure(s, d, 'realisation', { demande: rc, lien_oui: ls.oui, lien_non: ls.non, pour_structure: true, remplacant: RECAP.remplacant(r, r.profil) });
      await depot.demandes.maj(d.id, { realisation_demandee_le: iso() });
      await journal('demande_realisation', AGENT, 'demande', d.id);
    }
    /* Récapitulatif du mois écoulé : remplacements effectués et honoraires */
    async function recapitulatif(cleMois) {
      const missions = (await depot.demandes.parEtat(['pourvue', 'realisee'])).filter(d => d.remplacant_id && d.dates.some(x => x.startsWith(cleMois)));
      const parR = new Map(), parS = new Map();
      for (const d of missions) {
        const jours = d.dates.filter(x => x.startsWith(cleMois)).sort();
        const montant = (Number(d.honoraires) || 0) * jours.length;
        const s = await depot.structures.get(d.structure_id);
        const r = await depot.remplacants.get(d.remplacant_id);
        const ligne = { dates: jours.map(REF.dateFr).join(', '), type: REF.TYPES[d.type], honoraires: REF.montant(montant), confirme: d.etat === 'realisee', montant };
        (parR.get(r.id) || parR.set(r.id, { r, lignes: [] }).get(r.id)).lignes.push({ ...ligne, avec: s.nom });
        (parS.get(s.id) || parS.set(s.id, { s, d, lignes: [] }).get(s.id)).lignes.push({ ...ligne, avec: `Dr ${r.profil.prenom} ${r.profil.nom}` });
      }
      const total = l => REF.montant(l.reduce((t, x) => t + x.montant, 0));
      const mois = REF.moisFr(cleMois);
      for (const { r, lignes } of parR.values()) await envoyerRemplacant(r, 'recap-mensuel', { mois, lignes, total: total(lignes), nombre: lignes.length, pour_structure: false }, { categorie: 'information' });
      for (const { s, d, lignes } of parS.values()) await envoyerStructure(s, d, 'recap-mensuel', { mois, lignes, total: total(lignes), nombre: lignes.length, pour_structure: true }, { categorie: 'information' });
      await journal('recap_mensuel', AGENT, 'mois', cleMois, { remplacants: parR.size, structures: parS.size });
      return parR.size + parS.size;
    }

    async function taches() {
      const t = maintenant(), bilan = { selection: 0, relances: 0, expirees: 0, rappels: 0, realisations: 0, recaps: 0 };
      for (const d of await depot.demandes.parEtat(['publiee'])) {
        const s = await depot.structures.get(d.structure_id);
        if (REG.debut(d) <= t) { await expirer(d, s); bilan.expirees++; continue; }
        bilan.selection += await selectionner(d.id);
        const delai = (Number(s.delai_relance_h) || cfg.delaiRelanceH) * HEURE;
        if (!d.relancee_le && t - new Date(d.publiee_le) >= delai && await relancer(await depot.demandes.get(d.id), s)) bilan.relances++;
      }
      for (const d of await depot.demandes.parEtat(['pourvue'])) {
        const s = await depot.structures.get(d.structure_id);
        const premiere = [...d.dates].sort()[0];
        const veille = REF.instant(REF.ajouterJours(premiere, -1), cfg.heureRappel);
        if (!d.rappel_le && t >= veille && t < REG.debut(d)) { await rappeler(d, s); bilan.rappels++; }
        if (!d.realisation_demandee_le && t - REG.fin(d) >= cfg.delaiRealisationH * HEURE) { await demanderRealisation(d, s); bilan.realisations++; }
      }
      const precedent = moisPrecedent(REF.dateLocale(t).slice(0, 7));
      if (!(await depot.journal.existe('recap_mensuel', precedent))) bilan.recaps = await recapitulatif(precedent);
      return bilan;
    }

    return {
      creerDemande, selectionner, repondre, choisir, annuler, cloturer, confirmerRealisation,
      infosJeton, utiliserJeton, desinscrire, lienDesinscription,
      inscriptionRecue, validerInscription, refuserInscription, taches, recapitulatif, ErreurMetier,
      envoyerCourriel: envoyer,                                // utilisé aussi par la Communauté (rappels de messages)
    };
  }

  return { creerAgent, ErreurMetier };
});
