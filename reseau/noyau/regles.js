/* =========================================================
   RadiologicHub — Communauté : référentiels et règles
   ---------------------------------------------------------
   • Nom affiché : « Dr Prénom Nom » seulement pour un compte VÉRIFIÉ
     par l'administrateur qui a choisi le titre « Dr » (ou « Pr ») ;
     sinon « Prénom Nom ».
   • Publier un cas : compte vérifié (ou remplaçant validé), attestation
     d'anonymisation, 1 à 10 images.
   • Lire, commenter, écrire des messages : tout membre connecté.
   Partagé par le site, les fonctions serveur et les tests
   (tests/reseau-regles.test.js).
   ========================================================= */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else (root.RHReseau = root.RHReseau || {}).regles = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const STATUTS = {
    specialiste: 'Radiologue',
    resident: 'Résident en radiologie',
    medecin: 'Médecin (autre spécialité)',
    interne: 'Interne',
    etudiant: 'Étudiant en médecine',
    manipulateur: 'Manipulateur / technicien',
    autre: 'Autre',
  };
  const TITRES = { '': 'Aucun', Dr: 'Dr', Pr: 'Pr' };
  const GOUVERNORATS = [
    'Ariana', 'Béja', 'Ben Arous', 'Bizerte', 'Gabès', 'Gafsa', 'Jendouba', 'Kairouan',
    'Kasserine', 'Kébili', 'Le Kef', 'Mahdia', 'La Manouba', 'Médenine', 'Monastir', 'Nabeul',
    'Sfax', 'Sidi Bouzid', 'Siliana', 'Sousse', 'Tataouine', 'Tozeur', 'Tunis', 'Zaghouan',
  ];
  const ANNEES = [1, 2, 3, 4, 5];
  /* Spécialités des cas (mêmes couleurs que le reste du site) */
  const SPECIALITES = {
    neuro: { label: 'Neuro', c: 'var(--purple)' },
    orl: { label: 'ORL / tête et cou', c: 'var(--gold)' },
    thorax: { label: 'Thorax', c: 'var(--blue)' },
    cardio: { label: 'Cardio-vasculaire', c: 'var(--teal)' },
    digestif: { label: 'Digestif', c: 'var(--amber)' },
    uro: { label: 'Uro-génital', c: 'var(--steel)' },
    femme: { label: 'Sein / femme', c: 'var(--crimson)' },
    osteo: { label: 'Ostéo-articulaire', c: 'var(--plum)' },
    trauma: { label: 'Urgences / traumato', c: 'var(--rose)' },
    pediatrie: { label: 'Pédiatrie', c: 'var(--green)' },
    interv: { label: 'Interventionnel', c: 'var(--cornflower)' },
    autre: { label: 'Autre', c: 'var(--slate)' },
  };
  const MODALITES = { radio: 'Radiographie', echo: 'Échographie', scanner: 'Scanner', irm: 'IRM', mammo: 'Mammographie', interv: 'Interventionnel', tep: 'TEP / médecine nucléaire' };
  const MOTIFS_SIGNALEMENT = {
    identite: 'Le patient est identifiable (nom, date, visage, texte incrusté…)',
    erreur: 'Erreur médicale ou contenu trompeur',
    inapproprie: 'Contenu inapproprié ou irrespectueux',
    publicite: 'Publicité ou contenu sans rapport',
    usurpation: 'Usurpation d\'identité',
    autre: 'Autre',
  };
  const LIMITES = { images: 10, titre: 120, histoire: 3000, question: 300, reponse: 3000, commentaire: 1500, message: 4000, bio: 500, octetsImage: 8 * 1024 * 1024 };

  const propre = s => String(s ?? '').replace(/\s+/g, ' ').trim();
  const telephoneValide = t => /^(\+|00)?[\d\s.-]{8,20}$/.test(String(t || '').trim()) && String(t).replace(/\D/g, '').length >= 8;

  /* Nom affiché : le titre n'apparaît qu'une fois le compte vérifié */
  function nomAffiche(m) {
    if (!m) return 'Membre';
    const nom = [propre(m.prenom), propre(m.nom)].filter(Boolean).join(' ') || 'Membre';
    return m.verifie && (m.titre === 'Dr' || m.titre === 'Pr') ? `${m.titre} ${nom}` : nom;
  }
  const initiales = m => ((propre(m && m.prenom)[0] || '') + (propre(m && m.nom)[0] || '')).toUpperCase() || '?';
  function statutAffiche(m) {
    if (!m || !STATUTS[m.statut]) return '';
    return m.statut === 'resident' && m.annee ? `${STATUTS.resident} (R${m.annee})` : STATUTS[m.statut];
  }
  /* Peut publier : compte vérifié, ou remplaçant validé dans le module Remplacements */
  const peutPublier = (m, remplacantValide = false) => !!m && !m.suspendu && (!!m.verifie || !!remplacantValide);

  function validerProfil(p, { creation = false } = {}) {
    const e = [];
    if (!propre(p.prenom)) e.push('Indiquez votre prénom.');
    if (!propre(p.nom)) e.push('Indiquez votre nom.');
    if (!telephoneValide(p.telephone)) e.push('Numéro de téléphone invalide.');
    if (!STATUTS[p.statut]) e.push('Choisissez votre statut.');
    if (p.statut === 'resident' && !ANNEES.includes(Number(p.annee))) e.push('Indiquez votre année de résidanat.');
    if (p.titre && !TITRES[p.titre]) e.push('Titre invalide.');
    if (String(p.bio || '').length > LIMITES.bio) e.push(`La présentation dépasse ${LIMITES.bio} caractères.`);
    if (creation && !p.consentement) e.push("Acceptez les conditions d'utilisation et le traitement de vos données.");
    return e;
  }

  function validerCas(c) {
    const e = [];
    const titre = propre(c.titre);
    if (titre.length < 5) e.push('Donnez un titre au cas (5 caractères au moins).');
    if (titre.length > LIMITES.titre) e.push(`Le titre dépasse ${LIMITES.titre} caractères.`);
    if (propre(c.histoire).length < 20) e.push("Décrivez l'histoire clinique (20 caractères au moins).");
    if (String(c.histoire || '').length > LIMITES.histoire) e.push(`L'histoire clinique dépasse ${LIMITES.histoire} caractères.`);
    if (String(c.question || '').length > LIMITES.question) e.push(`La question dépasse ${LIMITES.question} caractères.`);
    if (String(c.reponse || '').length > LIMITES.reponse) e.push(`La réponse dépasse ${LIMITES.reponse} caractères.`);
    if (!SPECIALITES[c.specialite]) e.push('Choisissez une spécialité.');
    if (!(c.modalites || []).length || (c.modalites || []).some(m => !MODALITES[m])) e.push('Choisissez au moins une modalité.');
    const n = (c.images || []).length;
    if (n < 1) e.push('Ajoutez au moins une image.');
    if (n > LIMITES.images) e.push(`${LIMITES.images} images au plus.`);
    if (!c.attestation) e.push('Attestez que les images et le texte sont anonymisés.');
    return e;
  }
  const validerCommentaire = t => (!propre(t) ? ['Le commentaire est vide.'] : String(t).length > LIMITES.commentaire ? [`${LIMITES.commentaire} caractères au plus.`] : []);
  const validerMessage = (t, image) => (!propre(t) && !image ? ['Le message est vide.'] : String(t || '').length > LIMITES.message ? [`${LIMITES.message} caractères au plus.`] : []);

  /* ---------- Dates (heure de Tunis, JJ/MM/AAAA) ---------- */
  const FUSEAU = 'Africa/Tunis';
  const parties = d => Object.fromEntries(new Intl.DateTimeFormat('fr-FR', { timeZone: FUSEAU, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    .formatToParts(new Date(d)).filter(p => p.type !== 'literal').map(p => [p.type, p.value]));
  const dateFr = d => { const p = parties(d); return `${p.day}/${p.month}/${p.year}`; };
  const heureFr = d => { const p = parties(d); return `${p.hour}:${p.minute}`; };
  /* « à l'instant », « il y a 5 min », « il y a 3 h », « hier », « 12/10/2026 » */
  function depuis(d, maintenant = new Date()) {
    const s = (new Date(maintenant) - new Date(d)) / 1000;
    if (s < 60) return "à l'instant";
    if (s < 3600) return `il y a ${Math.floor(s / 60)} min`;
    if (dateFr(d) === dateFr(maintenant)) return `il y a ${Math.floor(s / 3600)} h`;
    if (dateFr(d) === dateFr(new Date(new Date(maintenant) - 864e5))) return 'hier';
    return dateFr(d);
  }
  /* Heure courte d'un message : « 14:05 » aujourd'hui, sinon « 12/10/2026 14:05 » */
  const heureMessage = (d, maintenant = new Date()) => (dateFr(d) === dateFr(maintenant) ? heureFr(d) : `${dateFr(d)} ${heureFr(d)}`);

  return {
    STATUTS, TITRES, ANNEES, GOUVERNORATS, SPECIALITES, MODALITES, MOTIFS_SIGNALEMENT, LIMITES, FUSEAU,
    nomAffiche, initiales, statutAffiche, peutPublier, telephoneValide,
    validerProfil, validerCas, validerCommentaire, validerMessage,
    dateFr, heureFr, depuis, heureMessage,
  };
});
