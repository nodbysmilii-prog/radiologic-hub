/* =========================================================
   RadiologicHub — Remplacements : accès à Supabase (production)
   ---------------------------------------------------------
   Connexion par lien magique (e-mail, sans mot de passe), lectures et
   écritures soumises aux droits d'accès par ligne de la base ; les
   actions qui déclenchent l'agent (publier, choisir, annuler, valider…)
   passent par la fonction serveur « rp-agent ».
   Même interface que api-demo.js. Configuration : remplacements/config.js
   (adresse du projet et clé publique « anon », faite pour être publiée).
   ========================================================= */

(function () {
  'use strict';
  const cfg = window.RH_REMPLACEMENTS_CONFIG || {};
  const ATTENTE = 'rh-remplacements-inscription';
  let sb = null, demarrage = null;

  const charger = () => new Promise((resolve, reject) => {
    if (window.supabase) return resolve();
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js';
    s.onload = resolve; s.onerror = () => reject(new Error('Bibliothèque Supabase injoignable.'));
    document.head.appendChild(s);
  });
  const ok = r => { if (r.error) throw new Error(r.error.message); return r.data; };
  const uid = async () => { const { data } = await sb.auth.getSession(); return data.session && data.session.user.id; };
  const retour = () => `${location.origin}${location.pathname.replace(/[^/]*$/, '')}remplacements.html`;
  async function invoquer(nom, body) {
    const { data, error } = await sb.functions.invoke(nom, { body });
    if (error) {
      let message = error.message;
      try { const j = await error.context.json(); message = j.erreur || message; } catch (e) { /* réponse non JSON */ }
      throw new Error(message);
    }
    return data;
  }
  const agent = (action, champs = {}) => invoquer('rp-agent', { action, ...champs });
  const lireAttente = () => { try { return JSON.parse(localStorage.getItem(ATTENTE) || 'null'); } catch (e) { return null; } };

  async function creerRemplacant(id, d) {
    ok(await sb.from('profils').update({ nom: d.nom, prenom: d.prenom, telephone: d.telephone, consentement_le: new Date().toISOString() }).eq('id', id));
    ok(await sb.from('rp_remplacants').insert({
      id, statut: d.statut, annee_residanat: d.statut === 'resident' ? Number(d.annee_residanat) : null, affectation: d.affectation,
      competences: d.competences, gouvernorats: d.gouvernorats, honoraires_souhaites: d.honoraires_souhaites === '' || d.honoraires_souhaites == null ? null : Number(d.honoraires_souhaites),
    }));
    if (d.justificatif instanceof File) await api.envoyerJustificatif(d.justificatif);
    await agent('inscription', { type: 'remplacant', id });
  }
  async function creerStructure(id, d) {
    ok(await sb.from('profils').update({ nom: d.compte_nom, prenom: d.compte_prenom, telephone: d.compte_telephone, consentement_le: new Date().toISOString() }).eq('id', id));
    const s = ok(await sb.from('rp_structures').insert({ nom: d.nom, type: d.type, adresse: d.adresse, ville: d.ville, gouvernorat: d.gouvernorat, equipements: d.equipements, contact_nom: d.contact_nom, telephone: d.telephone, email: d.email }).select().single());
    await agent('inscription', { type: 'structure', id: s.id });
  }
  /* Inscription commencée avant la connexion : la terminer au retour du lien magique */
  async function inscriptionEnAttente(type, d) {
    const champs = { ...d };
    delete champs.justificatif;                              // un fichier ne se conserve pas : à ajouter ensuite depuis le profil
    localStorage.setItem(ATTENTE, JSON.stringify({ type, d: champs }));
    const email = type === 'remplacant' ? d.email : d.compte_email;
    ok(await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: retour(), data: { nom: d.nom || d.compte_nom || '', prenom: d.prenom || d.compte_prenom || '', telephone: d.telephone || d.compte_telephone || '', inscription: { type, d: champs } } } }));
    return { ok: true, lienEnvoye: true, justificatifPlusTard: !!d.justificatif };
  }

  const api = {
    mode: 'supabase',
    /* bibliothèque chargée seulement si Supabase est la source choisie (api.js) */
    get pret() { return demarrage || (demarrage = charger().then(() => { sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, { auth: { persistSession: true, detectSessionInUrl: true } }); })); },

    async session() {
      const id = await uid();
      if (!id) return null;
      await sb.rpc('rp_accepter_invitations');
      const [p, r, ms, adm] = await Promise.all([
        sb.from('profils').select('*').eq('id', id).maybeSingle(),
        sb.from('rp_remplacants').select('*, profil:profils(*)').eq('id', id).maybeSingle(),
        sb.from('rp_membres').select('role, structure:rp_structures(*)').eq('profil_id', id),
        sb.rpc('rp_est_admin'),
      ]);
      return { profil: ok(p), remplacant: ok(r), structures: (ok(ms) || []).filter(m => m.structure).map(m => ({ ...m.structure, role: m.role })), admin: !!adm.data };
    },
    async connexion(email) {
      ok(await sb.auth.signInWithOtp({ email: String(email).trim(), options: { emailRedirectTo: retour(), shouldCreateUser: true } }));
      return { ok: true, lienEnvoye: true };
    },
    async connexionGoogle() {
      ok(await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: retour() } }));
      return { ok: true, redirection: true };
    },
    async deconnexion() { await sb.auth.signOut(); },
    /* Au retour du lien magique : crée l'inscription préparée avant la connexion */
    async finaliserInscription() {
      const { data } = await sb.auth.getSession();
      if (!data.session) return null;
      const u = data.session.user, attente = lireAttente() || (u.user_metadata && u.user_metadata.inscription);
      if (!attente) return null;
      try {
        if (attente.type === 'remplacant') {
          const existe = ok(await sb.from('rp_remplacants').select('id').eq('id', u.id).maybeSingle());
          if (!existe) await creerRemplacant(u.id, attente.d);
        } else {
          const ms = ok(await sb.from('rp_membres').select('structure:rp_structures(nom)').eq('profil_id', u.id));
          if (!ms.some(m => m.structure && m.structure.nom === attente.d.nom)) await creerStructure(u.id, attente.d);
        }
      } finally {
        localStorage.removeItem(ATTENTE);
        await sb.auth.updateUser({ data: { inscription: null } });
      }
      return attente.type;
    },

    async inscrireRemplacant(d) {
      const id = await uid();
      if (!id) return inscriptionEnAttente('remplacant', d);
      await creerRemplacant(id, d);
      return { ok: true, connecte: true };
    },
    async inscrireStructure(d) {
      const id = await uid();
      if (!id) return inscriptionEnAttente('structure', d);
      await creerStructure(id, d);
      return { ok: true, connecte: true };
    },
    async majProfil(patch) { return ok(await sb.from('profils').update(patch).eq('id', await uid()).select().single()); },
    async majRemplacant(patch) { return ok(await sb.from('rp_remplacants').update(patch).eq('id', await uid()).select().single()); },
    async quitterRemplacant() { ok(await sb.from('rp_remplacants').delete().eq('id', await uid())); },
    async majStructure(sid, patch) { return ok(await sb.from('rp_structures').update(patch).eq('id', sid).select().single()); },
    async envoyerJustificatif(fichier) {
      const id = await uid();
      const chemin = `${id}/${Date.now()}-${fichier.name.replace(/[^\w.-]+/g, '_')}`;
      ok(await sb.storage.from('justificatifs').upload(chemin, fichier, { upsert: false }));
      ok(await sb.from('rp_remplacants').update({ justificatif: chemin }).eq('id', id));
      return chemin;
    },
    async lienJustificatif(chemin) { return ok(await sb.storage.from('justificatifs').createSignedUrl(chemin, 600)).signedUrl; },

    async disponibilites() { return ok(await sb.from('rp_disponibilites').select('*').eq('remplacant_id', await uid())); },
    async definirDisponibilites(date, creneaux) {
      const id = await uid();
      ok(await sb.from('rp_disponibilites').delete().eq('remplacant_id', id).eq('date', date));
      if (creneaux.length) ok(await sb.from('rp_disponibilites').insert(creneaux.map(creneau => ({ remplacant_id: id, date, creneau }))));
    },

    async mesPropositions() {
      const l = ok(await sb.from('rp_propositions').select('*, demande:rp_demandes(*, structure:rp_structures(*))').eq('remplacant_id', await uid()));
      return l.filter(p => p.demande).map(({ demande, ...proposition }) => { const { structure, ...d } = demande; return { proposition, demande: d, structure }; });
    },
    repondre: (pid, reponse) => agent('repondre', { proposition_id: pid, reponse }),

    async demandesStructure(sid) {
      const demandes = ok(await sb.from('rp_demandes').select('*').eq('structure_id', sid).order('publiee_le', { ascending: false }));
      if (!demandes.length) return [];
      const ids = demandes.map(d => d.id);
      const [props, compteurs, favoris] = await Promise.all([
        sb.from('rp_propositions').select('*, remplacant:rp_remplacants(*, profil:profils(*))').in('demande_id', ids),
        sb.rpc('rp_compteurs', { ids }),
        sb.from('rp_favoris').select('remplacant_id').eq('structure_id', sid),
      ]);
      const fav = new Set((ok(favoris) || []).map(f => f.remplacant_id));
      const parD = new Map((ok(compteurs) || []).map(c => [c.demande_id, c]));
      return demandes.map(d => ({
        demande: d,
        compteurs: parD.get(d.id) || { contactes: 0, disponibles: 0, declines: 0, en_attente: 0 },
        interesses: (ok(props) || []).filter(p => p.demande_id === d.id && p.remplacant).map(({ remplacant, ...proposition }) => ({ proposition, remplacant, favori: fav.has(remplacant.id) })),
      }));
    },
    publier: (sid, demande) => agent('publier', { structure_id: sid, demande }),
    choisir: (did, rid) => agent('choisir', { demande_id: did, remplacant_id: rid }),
    annuler: (did, o = {}) => agent('annuler', { demande_id: did, ...o }),
    retirer: (did, motif) => agent('retirer', { demande_id: did, motif }),
    realisation: (did, oui) => agent('realisation', { demande_id: did, oui }),
    async basculerFavori(sid, rid) {
      const existe = ok(await sb.from('rp_favoris').select('remplacant_id').eq('structure_id', sid).eq('remplacant_id', rid).maybeSingle());
      if (existe) { ok(await sb.from('rp_favoris').delete().eq('structure_id', sid).eq('remplacant_id', rid)); return false; }
      ok(await sb.from('rp_favoris').insert({ structure_id: sid, remplacant_id: rid }));
      return true;
    },
    async membres(sid) {
      const m = ok(await sb.from('rp_membres').select('role, profil:profils(*)').eq('structure_id', sid));
      const inv = ok(await sb.from('rp_invitations').select('email').eq('structure_id', sid)) || [];
      return [...m, ...inv.map(i => ({ role: 'invité', profil: { email: i.email, nom: '', prenom: '' } }))];
    },
    async inviter(sid, email) { ok(await sb.from('rp_invitations').insert({ structure_id: sid, email: email.trim().toLowerCase() })); return { ok: true }; },
    async retirerMembre(sid, pid) { ok(await sb.from('rp_membres').delete().eq('structure_id', sid).eq('profil_id', pid)); },

    admin: {
      async enAttente() {
        const [r, s] = await Promise.all([
          sb.from('rp_remplacants').select('*, profil:profils(*)').eq('etat', 'en_attente').order('cree_le'),
          sb.from('rp_structures').select('*').eq('etat', 'en_attente').order('cree_le'),
        ]);
        return { remplacants: ok(r), structures: ok(s) };
      },
      async comptes() {
        const [r, s] = await Promise.all([sb.from('rp_remplacants').select('*, profil:profils(*)'), sb.from('rp_structures').select('*')]);
        return { remplacants: ok(r), structures: ok(s) };
      },
      valider: (type, id) => agent('valider', { type, id }),
      refuser: (type, id, motif) => agent('refuser', { type, id, motif }),
      suspendre: (type, id) => agent('suspendre', { type, id }),
      async statistiques() { return ok(await sb.rpc('rp_statistiques')); },
      async emails() { return ok(await sb.from('rp_emails').select('*').order('cree_le', { ascending: false }).limit(200)); },
      async journal() { return ok(await sb.from('rp_journal').select('*').order('quand', { ascending: false }).limit(200)); },
      async lancerTaches() { return (await agent('taches')).bilan; },
    },

    lien: {
      infos: jeton => invoquer('rp-lien', { jeton }),
      utiliser: (jeton, o = {}) => invoquer('rp-lien', { jeton, confirmer: true, ...o }),
      desinscrire: code => invoquer('rp-lien', { desinscription: code }),
    },
    demo: null,
    modeleContrat: async () => (await fetch('remplacements/modeles/contrat.md')).text(),
  };

  window.RHRp = window.RHRp || {};
  window.RHRp.apiSupabase = api;
})();
