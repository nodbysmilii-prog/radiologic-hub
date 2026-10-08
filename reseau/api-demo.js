/* =========================================================
   RadiologicHub — Communauté : mode démonstration
   ---------------------------------------------------------
   Tant que Supabase n'est pas configuré (remplacements/config.js), la
   Communauté fonctionne dans le navigateur avec des membres et des cas
   FICTIFS (visuels pédagogiques du site, sans image de patient). Mêmes
   règles que la base (supabase/migrations/…_reseau.sql) : publication
   réservée aux comptes vérifiés, cas visibles des seuls membres,
   blocage, signalements (masquage automatique), notifications.
   Les membres fictifs répondent automatiquement aux messages.
   Même interface que api-supabase.js.
   ========================================================= */
(function () {
  'use strict';
  const RG = window.RHReseau.regles;
  const CLE = 'rh-communaute-demo-v1';
  const ADMIN_EMAIL = 'admin@demo.radiologichub.tn';
  let etat = null, demarrage = null;
  const ecouteurs = new Set();

  const id = () => (crypto.randomUUID ? crypto.randomUUID() : 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36));
  const iso = (d = new Date()) => new Date(d).toISOString();
  const il_y_a = h => iso(Date.now() - h * 3600e3);
  const copie = o => JSON.parse(JSON.stringify(o));
  const sauver = () => {
    try { localStorage.setItem(CLE, JSON.stringify(etat)); }
    catch (e) {                                                   // stockage plein (images) : on garde en mémoire
      console.warn('Démonstration : stockage local plein, les dernières images ne seront pas conservées.');
    }
    window.dispatchEvent(new CustomEvent('rs:demo'));
  };
  const lire = () => { try { return JSON.parse(localStorage.getItem(CLE) || 'null'); } catch (e) { return null; } };

  /* ---------- Données fictives ---------- */
  function semer() {
    const e = { version: 1, moi: null, comptes: [], membres: [], cas: [], commentaires: [], jaime: [], enregistres: [], abonnements: [], conversations: [], participants: [], messages: [], blocages: [], signalements: [], notifications: [], fichiers: {} };
    const compte = (prenom, nom, email) => { const c = { id: id(), email, prenom, nom, telephone: '98' + String(100000 + e.comptes.length * 1111).padStart(6, '0'), consentement_le: il_y_a(500), cree_le: il_y_a(500) }; e.comptes.push(c); return c; };
    const membre = (c, champs) => { const m = { id: c.id, prenom: c.prenom, nom: c.nom, titre: '', statut: 'autre', annee: null, etablissement: '', ville: '', gouvernorat: '', bio: '', interets: [], photo: null, verifie: false, verifie_le: null, verification_demandee_le: null, justificatif: null, suspendu: false, emails_messages: true, remplacant: false, cree_le: il_y_a(400), ...champs }; e.membres.push(m); return m; };
    const amel = membre(compte('Amel', 'TEST', 'amel.test@demo.radiologichub.tn'), { titre: 'Dr', statut: 'specialiste', etablissement: 'CHU fictif de Tunis', ville: 'Tunis', gouvernorat: 'Tunis', bio: 'Radiologue, neuroradiologie et imagerie de la femme. Compte fictif de démonstration.', interets: ['neuro', 'femme'], verifie: true, verifie_le: il_y_a(300), remplacant: true });
    const sami = membre(compte('Sami', 'EXEMPLE', 'sami.exemple@demo.radiologichub.tn'), { titre: 'Dr', statut: 'resident', annee: 4, etablissement: 'Hôpital fictif de Sousse', ville: 'Sousse', gouvernorat: 'Sousse', bio: 'Résident en radiologie, passionné d\'imagerie digestive et d\'urgence. Compte fictif.', interets: ['digestif', 'trauma'], verifie: true, verifie_le: il_y_a(200), remplacant: true });
    const ines = membre(compte('Ines', 'DÉMO', 'ines.demo@demo.radiologichub.tn'), { statut: 'interne', etablissement: 'Faculté de médecine (fictive)', ville: 'Monastir', gouvernorat: 'Monastir', bio: 'Interne, je découvre la radiologie. Compte fictif.', interets: ['thorax'] });
    const karim = membre(compte('Karim', 'FICTIF', 'karim.fictif@demo.radiologichub.tn'), { statut: 'etudiant', ville: 'Sfax', gouvernorat: 'Sfax', bio: 'Étudiant en médecine. Compte fictif.', interets: ['neuro'] });
    const leila = membre(compte('Leila', 'ATTENTE', 'leila.attente@demo.radiologichub.tn'), { titre: 'Dr', statut: 'specialiste', etablissement: 'Cabinet fictif de Sfax', ville: 'Sfax', gouvernorat: 'Sfax', bio: 'Radiologue libérale. Vérification en cours (compte fictif).', interets: ['femme', 'osteo'], verification_demandee_le: il_y_a(5), justificatif: 'attestation-fictive.pdf' });
    membre(compte('Admin', 'SITE', ADMIN_EMAIL), { statut: 'autre', bio: 'Administrateur de la démonstration.' });

    const cas = (auteur, h, champs) => { const c = { id: id(), auteur_id: auteur.id, question: '', reponse: '', etat: 'publie', masque_motif: null, nb_jaime: 0, nb_commentaires: 0, attestation: true, cree_le: il_y_a(h), modifie_le: null, ...champs }; e.cas.push(c); return c; };
    const c1 = cas(amel, 30, {
      titre: 'Mouvements anormaux brutaux chez un diabétique', specialite: 'neuro', modalites: ['scanner', 'irm'],
      histoire: 'Homme de 56 ans, diabète de type 2 mal équilibré, consulte pour des mouvements involontaires et brusques, d\'apparition soudaine, du bras et de la jambe droits. L\'IRM montre un hypersignal T1 du putamen gauche.',
      question: 'Quel est votre diagnostic ?',
      reponse: 'Striatopathie diabétique (hyperglycémie non cétosique) : hémichorée ou hémiballisme ; putamen (± noyau caudé) controlatéral aux symptômes ; hyperdensité au scanner sans effet de masse ; hypersignal T1 caractéristique en IRM ; régression après équilibration glycémique.',
      images: [{ chemin: 'assets/posts/cas-striatopathie.png', legende: 'Présentation du cas (visuel pédagogique)' }],
    });
    const c2 = cas(sami, 9, {
      titre: 'Tuméfaction inguinale droite douloureuse et irréductible', specialite: 'digestif', modalites: ['scanner'],
      histoire: 'Patient consultant pour une tuméfaction inguinale droite douloureuse et irréductible. Au scanner, une structure tubulaire borgne et épaissie se trouve dans le sac herniaire, au contact du cæcum.',
      question: 'Comment s\'appelle cette hernie ?',
      reponse: 'Hernie d\'Amyand : appendice dans le sac d\'une hernie inguinale. Signes d\'inflammation : paroi appendiculaire épaissie (> 6 mm), infiltration de la graisse, liquide ou abcès dans les formes évoluées. Astuce : appendice dans une hernie crurale = hernie de De Garengeot.',
      images: [{ chemin: 'assets/posts/hernie-appendice.png', legende: 'Visuel pédagogique' }],
    });
    const c3 = cas(amel, 3, {
      titre: 'Hypersignal T1 des noyaux gris centraux : le diagnostic différentiel', specialite: 'neuro', modalites: ['irm'],
      histoire: 'Devant un hypersignal T1 spontané des noyaux gris centraux, quatre grandes familles de causes sont à connaître. Petit rappel en images pour vos gardes.',
      question: 'Quelles sont les quatre familles de causes ?',
      reponse: 'Sang (méthémoglobine d\'un hématome subaigu), calcifications (Fahr, troubles phosphocalciques), métaux (manganèse : nutrition parentérale, insuffisance hépatique) et striatopathie diabétique.',
      images: [{ chemin: 'assets/posts/hypersignal-t1.png', legende: 'Les quatre familles' }, { chemin: 'assets/posts/striatopathie.png', legende: 'Striatopathie diabétique' }],
    });
    const jaime = (c, m, h) => { e.jaime.push({ cas_id: c.id, membre_id: m.id, cree_le: il_y_a(h) }); c.nb_jaime++; };
    jaime(c1, sami, 28); jaime(c1, ines, 20); jaime(c1, karim, 12); jaime(c2, amel, 8); jaime(c2, ines, 6); jaime(c3, sami, 2);
    const com = (c, m, h, texte) => { e.commentaires.push({ id: id(), cas_id: c.id, auteur_id: m.id, texte, etat: 'visible', cree_le: il_y_a(h), modifie_le: null }); c.nb_commentaires++; };
    com(c1, sami, 27, 'Superbe cas ! J\'ai vu le même aux urgences le mois dernier, régression complète après équilibration.');
    com(c1, ines, 19, 'Merci pour la réponse détaillée, je ne connaissais pas.');
    com(c2, amel, 7, 'Bien vu ! Penser à décrire l\'état de l\'appendice pour le chirurgien.');
    e.abonnements.push({ suiveur_id: sami.id, suivi_id: amel.id, cree_le: il_y_a(100) }, { suiveur_id: ines.id, suivi_id: amel.id, cree_le: il_y_a(90) }, { suiveur_id: amel.id, suivi_id: sami.id, cree_le: il_y_a(80) });
    // une conversation entre Amel et Sami
    const conv = { id: id(), cree_le: il_y_a(26), dernier_message: null, dernier_message_le: null, dernier_auteur: null };
    e.conversations.push(conv);
    e.participants.push({ conversation_id: conv.id, membre_id: amel.id, lu_le: il_y_a(1), archive: false }, { conversation_id: conv.id, membre_id: sami.id, lu_le: il_y_a(20), archive: false });
    [[sami, 26, 'Bonjour Dr TEST, merci pour le cas de striatopathie, je peux le présenter au staff ?'], [amel, 25, 'Bonjour Sami, avec plaisir ! Cite simplement RadiologicHub 🙂'], [amel, 2, 'Au fait, tu es disponible pour un remplacement fin octobre ?']]
      .forEach(([m, h, texte]) => { const msg = { id: id(), conversation_id: conv.id, auteur_id: m.id, texte, image: null, supprime: false, cree_le: il_y_a(h) }; e.messages.push(msg); Object.assign(conv, { dernier_message: texte, dernier_message_le: msg.cree_le, dernier_auteur: m.id }); });
    e.notifications.push({ id: id(), membre_id: amel.id, type: 'commentaire', acteur_id: sami.id, cas_id: c1.id, lu: true, cree_le: il_y_a(27) });
    return e;
  }

  async function initialiser() {
    const s = lire();
    etat = s && s.version === 1 ? s : semer();
    if (!s) sauver();
    window.addEventListener('storage', ev => { if (ev.key === CLE && ev.newValue) { etat = JSON.parse(ev.newValue); emettre('rafraichir'); } });
  }

  /* ---------- Règles (identiques à la base) ---------- */
  const T = () => etat;
  const moiId = () => etat.moi;
  const compteDe = i => T().comptes.find(c => c.id === i);
  const membreDe = i => T().membres.find(m => m.id === i);
  const estAdmin = () => { const c = compteDe(moiId()); return !!c && c.email === ADMIN_EMAIL; };
  const actif = () => { const m = membreDe(moiId()); return !!m && !m.suspendu; };
  const bloque = (a, b) => T().blocages.some(x => (x.bloqueur_id === a && x.bloque_id === b) || (x.bloqueur_id === b && x.bloque_id === a));
  const exiger = (cond, msg = 'Action non autorisée.') => { if (!cond) throw new Error(msg); };
  const casVisible = c => !!c && (c.auteur_id === moiId() || estAdmin() || (c.etat === 'publie' && actif() && !bloque(c.auteur_id, moiId())));
  const membreVisible = m => !!m && (m.id === moiId() || estAdmin() || (actif() && !m.suspendu));
  const publicMembre = m => (m ? (({ remplacant, ...x }) => copie(x))(m) : null);
  const notifier = (dest, type, acteur, cas) => {
    if (!dest || dest === acteur || bloque(dest, acteur || dest)) return;
    const n = { id: id(), membre_id: dest, type, acteur_id: acteur || null, cas_id: cas || null, lu: false, cree_le: iso() };
    T().notifications.push(n);
    if (dest === moiId()) emettre('notification', n);
  };
  const enrichirCas = c => ({ ...copie(c), auteur: publicMembre(membreDe(c.auteur_id)), jaime: T().jaime.some(x => x.cas_id === c.id && x.membre_id === moiId()), enregistre: T().enregistres.some(x => x.cas_id === c.id && x.membre_id === moiId()) });
  const action = f => async (...a) => { const r = await f(...a); sauver(); return r; };
  function emettre(type, donnee) { ecouteurs.forEach(cb => { try { (cb[type] || (() => {}))(donnee); } catch (e) { console.error(e); } }); }

  /* Fichiers de la démonstration : images converties en adresses data: */
  const lireDataUrl = blob => new Promise((ok, ko) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = ko; r.readAsDataURL(blob); });
  async function stocker(dossier, blob) {
    const chemin = `${dossier}/${id()}.jpg`;
    T().fichiers[chemin] = await lireDataUrl(blob);
    return chemin;
  }
  const url = chemin => (!chemin ? null : /^(data:|https?:|assets\/)/.test(chemin) ? chemin : T().fichiers[chemin] || null);

  /* Réponses automatiques des membres fictifs */
  const REPONSES = ['Merci pour votre message ! Je regarde ça et je reviens vers vous. (réponse automatique de démonstration)', 'Bonne idée 👍 On en parle au staff demain ? (réponse automatique de démonstration)', 'Je suis disponible cette semaine, envoyez-moi les détails. (réponse automatique de démonstration)'];
  function repondreAutomatiquement(convId, depuisId) {
    const autre = T().participants.find(p => p.conversation_id === convId && p.membre_id !== depuisId);
    if (!autre || compteDe(autre.membre_id)?.email === ADMIN_EMAIL || !membreDe(autre.membre_id) || bloque(autre.membre_id, depuisId)) return;
    setTimeout(() => {
      if (!T().conversations.find(c => c.id === convId)) return;
      const texte = REPONSES[Math.floor(Math.random() * REPONSES.length)];
      const m = ecrire(convId, autre.membre_id, texte, null);
      sauver();
      emettre('message', copie(m));
    }, 2200);
  }
  function ecrire(convId, auteur, texte, image) {
    const m = { id: id(), conversation_id: convId, auteur_id: auteur, texte: texte || '', image: image || null, supprime: false, cree_le: iso() };
    T().messages.push(m);
    const c = T().conversations.find(x => x.id === convId);
    Object.assign(c, { dernier_message: image && !String(texte || '').trim() ? '📷 Photo' : String(texte).slice(0, 140), dernier_message_le: m.cree_le, dernier_auteur: auteur });
    T().participants.filter(p => p.conversation_id === convId).forEach(p => { p.archive = false; if (p.membre_id === auteur) p.lu_le = m.cree_le; });
    return m;
  }
  // comme la base : contenu effacé, et l'aperçu de la conversation ne garde pas le texte du dernier message
  function effacerMessage(m) {
    if (m.image && !/^(data:|https?:|assets\/)/.test(m.image)) delete T().fichiers[m.image];
    Object.assign(m, { supprime: true, texte: '', image: null });
    const derniers = T().messages.filter(x => x.conversation_id === m.conversation_id && !x.supprime && x.cree_le >= m.cree_le);
    if (!derniers.length) T().conversations.find(c => c.id === m.conversation_id).dernier_message = 'Message supprimé';
  }

  const api = {
    mode: 'demo',
    get pret() { return demarrage || (demarrage = initialiser()); },

    /* ---------- Session ---------- */
    async session() {
      const c = compteDe(moiId());
      if (!c) return null;
      const m = membreDe(c.id);
      return { compte: copie(c), membre: m ? publicMembre(m) : null, admin: estAdmin(), remplacantValide: !!(m && m.remplacant) };
    },
    async connexionGoogle() {
      let c = T().comptes.find(x => x.email === 'vous.demo@gmail.com');
      if (!c) { c = { id: id(), email: 'vous.demo@gmail.com', prenom: 'Vous', nom: 'DÉMO', telephone: '', photoGoogle: null, consentement_le: null, cree_le: iso() }; T().comptes.push(c); }
      etat.moi = c.id; sauver();
      return { ok: true, demo: true };
    },
    async connexionEmail(email) {
      email = String(email || '').trim().toLowerCase();
      let c = T().comptes.find(x => x.email.toLowerCase() === email);
      if (!c) { c = { id: id(), email, prenom: '', nom: '', telephone: '', consentement_le: null, cree_le: iso() }; T().comptes.push(c); }
      etat.moi = c.id; sauver();
      return { ok: true, demo: true };
    },
    async deconnexion() { etat.moi = null; sauver(); },

    /* ---------- Profil ---------- */
    creerProfil: action(async d => {
      const c = compteDe(moiId());
      exiger(c, 'Connectez-vous d\'abord.');
      exiger(!membreDe(c.id), 'Votre profil existe déjà.');
      const e = RG.validerProfil(d, { creation: true });
      if (e.length) throw new Error(e.join(' '));
      Object.assign(c, { prenom: d.prenom.trim(), nom: d.nom.trim(), telephone: d.telephone.trim(), consentement_le: iso() });
      T().membres.push({ id: c.id, prenom: d.prenom.trim(), nom: d.nom.trim(), titre: d.titre || '', statut: d.statut, annee: d.statut === 'resident' ? Number(d.annee) : null, etablissement: d.etablissement || '', ville: d.ville || '', gouvernorat: d.gouvernorat || '', bio: d.bio || '', interets: d.interets || [], photo: d.photo || null, verifie: false, verifie_le: null, verification_demandee_le: null, justificatif: null, suspendu: false, emails_messages: true, remplacant: false, cree_le: iso() });
      return { ok: true };
    }),
    majProfil: action(async d => {
      const m = membreDe(moiId());
      exiger(m, 'Profil introuvable.');
      const champs = ['prenom', 'nom', 'titre', 'statut', 'annee', 'etablissement', 'ville', 'gouvernorat', 'bio', 'interets', 'emails_messages'];
      champs.forEach(k => { if (k in d) m[k] = k === 'annee' ? (d.statut === 'resident' ? Number(d.annee) : null) : d[k]; });
      if ('telephone' in d) compteDe(m.id).telephone = d.telephone;
      return publicMembre(m);
    }),
    envoyerPhoto: action(async blob => { const m = membreDe(moiId()); exiger(m); m.photo = await stocker(`avatars/${m.id}`, blob); return url(m.photo); }),
    urlPhoto: m => url(m && m.photo),
    demanderVerification: action(async fichier => {
      const m = membreDe(moiId()); exiger(m);
      Object.assign(m, { verification_demandee_le: iso(), justificatif: fichier ? fichier.name : null });
      return { ok: true };
    }),
    supprimerCompte: action(async () => {
      const i = moiId();
      const casIds = new Set(T().cas.filter(c => c.auteur_id === i).map(c => c.id));
      Object.assign(etat, {
        comptes: T().comptes.filter(c => c.id !== i), membres: T().membres.filter(m => m.id !== i),
        cas: T().cas.filter(c => !casIds.has(c.id)), commentaires: T().commentaires.filter(c => c.auteur_id !== i && !casIds.has(c.cas_id)),
        jaime: T().jaime.filter(x => x.membre_id !== i && !casIds.has(x.cas_id)), enregistres: T().enregistres.filter(x => x.membre_id !== i && !casIds.has(x.cas_id)),
        abonnements: T().abonnements.filter(x => x.suiveur_id !== i && x.suivi_id !== i), participants: T().participants.filter(p => p.membre_id !== i),
        blocages: T().blocages.filter(b => b.bloqueur_id !== i && b.bloque_id !== i), notifications: T().notifications.filter(n => n.membre_id !== i && n.acteur_id !== i),
        signalements: T().signalements.filter(s => s.auteur_id !== i), moi: null,
      });
      T().messages.forEach(m => { if (m.auteur_id === i) { effacerMessage(m); m.auteur_id = null; } });
    }),

    async membre(mid) {
      const m = membreDe(mid);
      if (!membreVisible(m)) return null;
      return {
        membre: publicMembre(m), remplacant: !!m.remplacant,
        stats: { cas: T().cas.filter(c => c.auteur_id === mid && casVisible(c)).length, abonnes: T().abonnements.filter(a => a.suivi_id === mid).length, abonnements: T().abonnements.filter(a => a.suiveur_id === mid).length },
        suivi: T().abonnements.some(a => a.suiveur_id === moiId() && a.suivi_id === mid),
        bloque: T().blocages.some(b => b.bloqueur_id === moiId() && b.bloque_id === mid),
      };
    },
    async chercherMembres(q = '') {
      const n = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
      return T().membres.filter(m => membreVisible(m) && m.id !== moiId() && (!q || n(`${m.prenom} ${m.nom} ${m.etablissement} ${m.ville}`).includes(n(q))))
        .sort((a, b) => Number(b.verifie) - Number(a.verifie) || a.nom.localeCompare(b.nom)).slice(0, 30).map(publicMembre);
    },

    /* ---------- Cas ---------- */
    async fil({ onglet = 'tous', specialite = '', q = '', avant = null, limite = 10, auteur = null } = {}) {
      const n = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
      let l = T().cas.filter(casVisible);
      if (auteur) l = l.filter(c => c.auteur_id === auteur);
      if (onglet === 'abonnements') { const suivis = new Set(T().abonnements.filter(a => a.suiveur_id === moiId()).map(a => a.suivi_id)); l = l.filter(c => suivis.has(c.auteur_id)); }
      if (onglet === 'enregistres') { const s = new Set(T().enregistres.filter(x => x.membre_id === moiId()).map(x => x.cas_id)); l = l.filter(c => s.has(c.id)); }
      if (specialite) l = l.filter(c => c.specialite === specialite);
      if (q) l = l.filter(c => n(`${c.titre} ${c.histoire}`).includes(n(q)));
      if (avant) l = l.filter(c => c.cree_le < avant);
      return l.sort((a, b) => b.cree_le.localeCompare(a.cree_le)).slice(0, limite).map(enrichirCas);
    },
    async cas(cid) { const c = T().cas.find(x => x.id === cid); return casVisible(c) ? enrichirCas(c) : null; },
    urlsImages: async c => (c.images || []).map(i => url(i.chemin)),
    publierCas: action(async (d, images) => {
      const m = membreDe(moiId());
      exiger(RG.peutPublier(m, m && m.remplacant), 'Seuls les comptes vérifiés peuvent publier un cas.');
      const chemins = [];
      for (const i of images) chemins.push({ chemin: await stocker(`cas-images/${m.id}`, i.blob), legende: i.legende || '' });
      const e = RG.validerCas({ ...d, images: chemins });
      if (e.length) throw new Error(e.join(' '));
      const c = { id: id(), auteur_id: m.id, titre: d.titre.trim(), histoire: d.histoire.trim(), question: d.question || '', reponse: d.reponse || '', specialite: d.specialite, modalites: d.modalites, images: chemins, attestation: true, etat: 'publie', masque_motif: null, nb_jaime: 0, nb_commentaires: 0, cree_le: iso(), modifie_le: null };
      T().cas.push(c);
      T().abonnements.filter(a => a.suivi_id === m.id).forEach(a => notifier(a.suiveur_id, 'nouveau_cas', m.id, c.id));
      return c.id;
    }),
    modifierCas: action(async (cid, d) => {
      const c = T().cas.find(x => x.id === cid);
      exiger(c && (c.auteur_id === moiId() || estAdmin()));
      ['titre', 'histoire', 'question', 'reponse', 'specialite', 'modalites'].forEach(k => { if (k in d) c[k] = d[k]; });
      c.modifie_le = iso();
    }),
    supprimerCas: action(async cid => {
      const c = T().cas.find(x => x.id === cid);
      exiger(c && (c.auteur_id === moiId() || estAdmin()));
      etat.cas = T().cas.filter(x => x.id !== cid);
      etat.commentaires = T().commentaires.filter(x => x.cas_id !== cid);
      etat.jaime = T().jaime.filter(x => x.cas_id !== cid);
      etat.enregistres = T().enregistres.filter(x => x.cas_id !== cid);
      etat.notifications = T().notifications.filter(x => x.cas_id !== cid);
    }),
    basculerJaime: action(async cid => {
      const c = T().cas.find(x => x.id === cid);
      exiger(casVisible(c) && actif() && c.etat === 'publie');
      const i = T().jaime.findIndex(x => x.cas_id === cid && x.membre_id === moiId());
      if (i >= 0) { T().jaime.splice(i, 1); c.nb_jaime = Math.max(0, c.nb_jaime - 1); return false; }
      T().jaime.push({ cas_id: cid, membre_id: moiId(), cree_le: iso() }); c.nb_jaime++;
      notifier(c.auteur_id, 'jaime', moiId(), cid);
      return true;
    }),
    basculerEnregistre: action(async cid => {
      exiger(casVisible(T().cas.find(x => x.id === cid)));
      const i = T().enregistres.findIndex(x => x.cas_id === cid && x.membre_id === moiId());
      if (i >= 0) { T().enregistres.splice(i, 1); return false; }
      T().enregistres.push({ cas_id: cid, membre_id: moiId(), cree_le: iso() });
      return true;
    }),
    async commentaires(cid) {
      if (!casVisible(T().cas.find(x => x.id === cid))) return [];
      return T().commentaires.filter(x => x.cas_id === cid && (x.etat === 'visible' || x.auteur_id === moiId() || estAdmin()) && !bloque(x.auteur_id, moiId()))
        .sort((a, b) => a.cree_le.localeCompare(b.cree_le)).map(x => ({ ...copie(x), auteur: publicMembre(membreDe(x.auteur_id)) }));
    },
    commenter: action(async (cid, texte) => {
      const c = T().cas.find(x => x.id === cid);
      exiger(casVisible(c) && c.etat === 'publie' && actif(), 'Commentaire impossible.');
      const e = RG.validerCommentaire(texte);
      if (e.length) throw new Error(e[0]);
      const x = { id: id(), cas_id: cid, auteur_id: moiId(), texte: texte.trim(), etat: 'visible', cree_le: iso(), modifie_le: null };
      T().commentaires.push(x); c.nb_commentaires++;
      notifier(c.auteur_id, 'commentaire', moiId(), cid);
      return { ...copie(x), auteur: publicMembre(membreDe(moiId())) };
    }),
    supprimerCommentaire: action(async xid => {
      const x = T().commentaires.find(y => y.id === xid);
      const c = x && T().cas.find(y => y.id === x.cas_id);
      exiger(x && (x.auteur_id === moiId() || estAdmin() || (c && c.auteur_id === moiId())));
      etat.commentaires = T().commentaires.filter(y => y.id !== xid);
      if (c) c.nb_commentaires = Math.max(0, c.nb_commentaires - 1);
    }),
    basculerAbonnement: action(async mid => {
      exiger(actif() && mid !== moiId() && !bloque(mid, moiId()));
      const i = T().abonnements.findIndex(a => a.suiveur_id === moiId() && a.suivi_id === mid);
      if (i >= 0) { T().abonnements.splice(i, 1); return false; }
      T().abonnements.push({ suiveur_id: moiId(), suivi_id: mid, cree_le: iso() });
      notifier(mid, 'abonnement', moiId(), null);
      return true;
    }),

    /* ---------- Messagerie ---------- */
    async conversations() {
      return T().participants.filter(p => p.membre_id === moiId()).map(p => {
        const c = T().conversations.find(x => x.id === p.conversation_id);
        const o = T().participants.find(x => x.conversation_id === c.id && x.membre_id !== moiId());
        return {
          conversation_id: c.id, autre: o ? publicMembre(membreDe(o.membre_id)) : null, dernier_message: c.dernier_message, dernier_message_le: c.dernier_message_le, dernier_auteur: c.dernier_auteur,
          non_lus: T().messages.filter(m => m.conversation_id === c.id && m.auteur_id !== moiId() && m.cree_le > p.lu_le && !m.supprime).length,
          archive: p.archive, bloque: o ? bloque(moiId(), o.membre_id) : false, autre_lu_le: o ? o.lu_le : null,
        };
      }).sort((a, b) => String(b.dernier_message_le || '').localeCompare(String(a.dernier_message_le || '')));
    },
    ouvrirConversation: action(async autre => {
      exiger(actif(), 'Complétez votre profil pour écrire à un membre.');
      exiger(autre && autre !== moiId() && membreDe(autre) && !membreDe(autre).suspendu, 'Ce confrère n\'a pas encore rejoint la Communauté.');
      exiger(!bloque(moiId(), autre), 'Conversation impossible : l\'un de vous a bloqué l\'autre.');
      const mes = new Set(T().participants.filter(p => p.membre_id === moiId()).map(p => p.conversation_id));
      const p = T().participants.find(x => x.membre_id === autre && mes.has(x.conversation_id) && T().participants.filter(y => y.conversation_id === x.conversation_id).length === 2);
      if (p) return p.conversation_id;
      const c = { id: id(), cree_le: iso(), dernier_message: null, dernier_message_le: null, dernier_auteur: null };
      T().conversations.push(c);
      T().participants.push({ conversation_id: c.id, membre_id: moiId(), lu_le: iso(), archive: false }, { conversation_id: c.id, membre_id: autre, lu_le: iso(), archive: false });
      return c.id;
    }),
    async messages(convId) {
      exiger(T().participants.some(p => p.conversation_id === convId && p.membre_id === moiId()), 'Conversation introuvable.');
      return copie(T().messages.filter(m => m.conversation_id === convId).sort((a, b) => a.cree_le.localeCompare(b.cree_le)));
    },
    envoyerMessage: action(async (convId, texte, blob) => {
      exiger(actif() && T().participants.some(p => p.conversation_id === convId && p.membre_id === moiId()), 'Envoi impossible.');
      const o = T().participants.find(p => p.conversation_id === convId && p.membre_id !== moiId());
      exiger(!o || !bloque(moiId(), o.membre_id), 'Envoi impossible : l\'un de vous a bloqué l\'autre.');
      const e = RG.validerMessage(texte, blob);
      if (e.length) throw new Error(e[0]);
      const image = blob ? await stocker(`messages-images/${convId}/${moiId()}`, blob) : null;
      const m = ecrire(convId, moiId(), String(texte || '').trim(), image);
      repondreAutomatiquement(convId, moiId());
      return copie(m);
    }),
    marquerLu: action(async convId => { const p = T().participants.find(x => x.conversation_id === convId && x.membre_id === moiId()); if (p) p.lu_le = iso(); }),
    supprimerMessage: action(async mid => {
      const m = T().messages.find(x => x.id === mid);
      exiger(m && m.auteur_id === moiId());
      effacerMessage(m);
    }),
    urlImageMessage: async chemin => url(chemin),
    ecouter(cb) { ecouteurs.add(cb); return () => ecouteurs.delete(cb); },
    async nonLus() {
      const conv = await api.conversations();
      return { messages: conv.reduce((t, c) => t + (c.non_lus ? 1 : 0), 0), notifications: T().notifications.filter(n => n.membre_id === moiId() && !n.lu).length };
    },

    /* ---------- Blocage, signalement ---------- */
    bloquer: action(async mid => { exiger(mid !== moiId()); if (!T().blocages.some(b => b.bloqueur_id === moiId() && b.bloque_id === mid)) T().blocages.push({ bloqueur_id: moiId(), bloque_id: mid, cree_le: iso() }); etat.abonnements = T().abonnements.filter(a => !((a.suiveur_id === moiId() && a.suivi_id === mid) || (a.suiveur_id === mid && a.suivi_id === moiId()))); }),
    debloquer: action(async mid => { etat.blocages = T().blocages.filter(b => !(b.bloqueur_id === moiId() && b.bloque_id === mid)); }),
    signaler: action(async (type, cible, motif, details = '') => {
      exiger(actif(), 'Complétez votre profil pour signaler un contenu.');
      exiger(RG.MOTIFS_SIGNALEMENT[motif], 'Motif invalide.');
      if (T().signalements.some(s => s.auteur_id === moiId() && s.cible_type === type && s.cible_id === cible)) throw new Error('Vous avez déjà signalé ce contenu.');
      T().signalements.push({ id: id(), auteur_id: moiId(), cible_type: type, cible_id: cible, motif, details: String(details).slice(0, 500), cree_le: iso(), traite_le: null, decision: null });
      if (type === 'cas') {
        const ouverts = T().signalements.filter(s => s.cible_type === 'cas' && s.cible_id === cible && !s.traite_le);
        const c = T().cas.find(x => x.id === cible);
        if (c && c.etat === 'publie' && (ouverts.filter(s => s.motif === 'identite').length >= 3 || ouverts.length >= 5)) {
          Object.assign(c, { etat: 'masque', masque_motif: 'Masqué automatiquement après plusieurs signalements' });
          notifier(c.auteur_id, 'cas_masque', null, c.id);
        }
      }
      return { ok: true };
    }),

    /* ---------- Notifications ---------- */
    async notifications() {
      return T().notifications.filter(n => n.membre_id === moiId()).sort((a, b) => b.cree_le.localeCompare(a.cree_le)).slice(0, 60)
        .map(n => ({ ...copie(n), acteur: publicMembre(membreDe(n.acteur_id)), cas: (c => (c ? { id: c.id, titre: c.titre } : null))(T().cas.find(c => c.id === n.cas_id)) }));
    },
    marquerNotificationsLues: action(async () => { T().notifications.forEach(n => { if (n.membre_id === moiId()) n.lu = true; }); }),

    /* ---------- Administration ---------- */
    admin: {
      async verifications() { exiger(estAdmin()); return T().membres.filter(m => m.verification_demandee_le && !m.verifie).map(publicMembre); },
      verifier: action(async (mid, oui) => {
        exiger(estAdmin());
        const m = membreDe(mid);
        if (oui) { Object.assign(m, { verifie: true, verifie_le: iso() }); notifier(m.id, 'verification', null, null); }
        else Object.assign(m, { verifie: false, verifie_le: null, verification_demandee_le: null });
      }),
      urlJustificatif: async () => null,
      async signalements() {
        exiger(estAdmin());
        return T().signalements.filter(s => !s.traite_le).sort((a, b) => b.cree_le.localeCompare(a.cree_le)).map(s => {
          const cible = s.cible_type === 'cas' ? T().cas.find(c => c.id === s.cible_id) : s.cible_type === 'commentaire' ? T().commentaires.find(c => c.id === s.cible_id) : s.cible_type === 'message' ? T().messages.find(c => c.id === s.cible_id) : membreDe(s.cible_id);
          const apercu = !cible ? '(supprimé)' : s.cible_type === 'cas' ? cible.titre : s.cible_type === 'membre' ? RG.nomAffiche(cible) : cible.texte;
          return { ...copie(s), auteur: publicMembre(membreDe(s.auteur_id)), apercu, cas_id: s.cible_type === 'cas' ? s.cible_id : s.cible_type === 'commentaire' && cible ? cible.cas_id : null, etat_cible: cible && cible.etat };
        });
      },
      traiterSignalement: action(async (sid, decision) => {
        exiger(estAdmin());
        const s = T().signalements.find(x => x.id === sid);
        const lies = T().signalements.filter(x => x.cible_type === s.cible_type && x.cible_id === s.cible_id && !x.traite_le);
        if (decision === 'retire') {
          if (s.cible_type === 'cas') { const c = T().cas.find(x => x.id === s.cible_id); if (c && c.etat !== 'masque') { Object.assign(c, { etat: 'masque', masque_motif: 'Retiré par l\'administrateur' }); notifier(c.auteur_id, 'cas_masque', null, c.id); } }
          if (s.cible_type === 'commentaire') { const c = T().commentaires.find(x => x.id === s.cible_id); if (c) c.etat = 'masque'; }
          if (s.cible_type === 'membre') { const m = membreDe(s.cible_id); if (m) m.suspendu = true; }
        } else if (s.cible_type === 'cas') { const c = T().cas.find(x => x.id === s.cible_id); if (c && c.etat === 'masque') Object.assign(c, { etat: 'publie', masque_motif: null }); }
        lies.forEach(x => Object.assign(x, { traite_le: iso(), decision }));
      }),
      async membres(q = '') { exiger(estAdmin()); const n = s => String(s || '').toLowerCase(); return T().membres.filter(m => !q || n(`${m.prenom} ${m.nom}`).includes(n(q))).map(m => ({ ...publicMembre(m), email: compteDe(m.id)?.email, telephone: compteDe(m.id)?.telephone })); },
      suspendre: action(async (mid, oui) => { exiger(estAdmin()); membreDe(mid).suspendu = !!oui; }),
      retirerVerification: action(async mid => { exiger(estAdmin()); Object.assign(membreDe(mid), { verifie: false, verifie_le: null }); }),
      async statistiques() {
        exiger(estAdmin());
        return { membres: T().membres.length, verifies: T().membres.filter(m => m.verifie).length, cas: T().cas.length, masques: T().cas.filter(c => c.etat === 'masque').length, messages: T().messages.length, signalements: T().signalements.filter(s => !s.traite_le).length, attente: T().membres.filter(m => m.verification_demandee_le && !m.verifie).length };
      },
    },

    /* ---------- Spécifique à la démonstration ---------- */
    demo: {
      utilisateurs: () => T().comptes.map(c => {
        const m = membreDe(c.id);
        const role = c.email === ADMIN_EMAIL ? 'Administrateur' : !m ? 'profil à compléter' : m.verifie ? `${RG.statutAffiche(m)}, vérifié` : `${RG.statutAffiche(m)}${m.verification_demandee_le ? ', vérification demandée' : ', non vérifié'}`;
        return { id: c.id, libelle: `${m ? RG.nomAffiche(m) : c.email} — ${role}` };
      }),
      moi: () => moiId(),
      connecterComme: async i => { etat.moi = i || null; sauver(); },
      reinitialiser: async () => { try { localStorage.removeItem(CLE); } catch (e) { /* rien */ } etat = semer(); sauver(); },
    },
  };

  window.RHRs = window.RHRs || {};
  window.RHRs.apiDemo = api;
})();
