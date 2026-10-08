// Fichier généré par scripts/preparer-backend.js — ne pas modifier ici (source : remplacements/).
/* =========================================================
   RadiologicHub — Remplacements : règles de mise en relation
   ---------------------------------------------------------
   Un remplaçant reçoit une proposition si :
   • son inscription est validée et il accepte les e-mails de propositions ;
   • il accepte le gouvernorat de la structure ;
   • ses compétences couvrent toutes les modalités demandées ;
   • son profil est accepté (spécialistes uniquement, ou résidents
     acceptés, avec une année minimale facultative) ;
   • il est disponible à TOUTES les dates de la demande, sur le bon créneau ;
   • il n'a pas déjà une mission confirmée sur l'une de ces dates.
   Les honoraires souhaités sont indicatifs : ils sont affichés, pas filtrés.
   Testé sous Node : tests/remplacements-regles.test.js.
   ========================================================= */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./referentiel.js'));
  else { const R = root.RHRemplacements = root.RHRemplacements || {}; R.regles = factory(R.referentiel); }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (REF) {
  'use strict';

  /* Une demi-journée commençant avant 13 h est un « matin » */
  const demiJournee = d => (String(d.heure_debut || '') < '13:00' ? 'matin' : 'apres_midi');

  /* Les créneaux cochés un jour donné couvrent-ils le besoin de la demande ? */
  function couvre(creneaux, d) {
    const c = new Set(creneaux || []);
    const journee = c.has('journee') || (c.has('matin') && c.has('apres_midi'));
    switch (d.type) {
      case 'journee': return journee;
      case 'demi_journee': return journee || c.has(demiJournee(d));
      case 'garde': return c.has('garde');
      case 'week_end': return journee || c.has('garde');
      default: return false;
    }
  }
  /* Créneau(x) à cocher pour être proposé (affiché à l'utilisateur) */
  const creneauAttendu = d => ({ journee: 'journée', demi_journee: demiJournee(d) === 'matin' ? 'matin' : 'après-midi', garde: 'garde', week_end: 'journée ou garde' }[d.type] || '');

  const profilAccepte = (r, d) => {
    if (r.statut === 'specialiste') return true;
    if (r.statut !== 'resident' || d.profil !== 'residents') return false;
    return !d.annee_min || (Number(r.annee_residanat) || 0) >= Number(d.annee_min);
  };
  const competencesOk = (r, d) => (d.modalites || []).every(m => (r.competences || []).includes(m));
  const gouvernoratOk = (r, s) => (r.gouvernorats || []).includes(s.gouvernorat);

  /* Dates d'une demande non couvertes par les disponibilités du remplaçant ({ 'AAAA-MM-JJ': [créneaux] }) */
  const datesManquantes = (d, dispos) => (d.dates || []).filter(date => !couvre(dispos[date], d));
  /* Missions confirmées du remplaçant qui tombent sur une date de la demande */
  const conflits = (d, missions) => (missions || []).filter(m => m.id !== d.id && (m.dates || []).some(x => (d.dates || []).includes(x)));

  /*
   * compatible(remplaçant, demande, structure, dispos, missions) → { ok, raisons: [...] }
   * dispos : { 'AAAA-MM-JJ': ['journee', …] } ; missions : demandes déjà confirmées pour ce remplaçant
   */
  function compatible(r, d, s, dispos = {}, missions = []) {
    const raisons = [];
    if (r.etat !== 'valide') raisons.push('inscription non validée');
    if (r.desinscrit) raisons.push('ne reçoit plus de propositions');
    if (!gouvernoratOk(r, s)) raisons.push(`gouvernorat ${s.gouvernorat} non accepté`);
    if (!competencesOk(r, d)) raisons.push('compétences insuffisantes');
    if (!profilAccepte(r, d)) raisons.push(d.profil === 'specialiste' ? 'demande réservée aux spécialistes' : `année de résidanat inférieure à R${d.annee_min}`);
    const manque = datesManquantes(d, dispos);
    if (manque.length) raisons.push(`non disponible le ${manque.map(REF.dateFr).join(', ')}`);
    if (conflits(d, missions).length) raisons.push('déjà en mission à ces dates');
    return { ok: raisons.length === 0, raisons };
  }

  /* Honoraires de la mission : forfait × nombre de jours (ou de gardes) */
  const totalHonoraires = d => (Number(d.honoraires) || 0) * (d.dates || []).length;

  /* Début et fin de la mission (instants), la garde pouvant finir le lendemain */
  const datesTriees = d => [...(d.dates || [])].sort();
  const debut = d => REF.instant(datesTriees(d)[0], d.heure_debut || '08:00');
  const fin = d => {
    const der = datesTriees(d).slice(-1)[0];
    const lendemain = (d.heure_fin || '18:00') <= (d.heure_debut || '08:00');
    return REF.instant(lendemain ? REF.ajouterJours(der, 1) : der, d.heure_fin || '18:00');
  };

  /* ---------- Validation des formulaires (messages pour l'utilisateur) ---------- */
  function validerDemande(d, aujourdhui) {
    const e = [];
    const dates = d.dates || [];
    if (!dates.length) e.push('Choisissez au moins une date.');
    if (dates.some(x => !/^\d{4}-\d{2}-\d{2}$/.test(x))) e.push('Date invalide.');
    if (aujourdhui && dates.some(x => x < aujourdhui)) e.push('Une date est déjà passée.');
    if (!/^\d{2}:\d{2}$/.test(d.heure_debut || '') || !/^\d{2}:\d{2}$/.test(d.heure_fin || '')) e.push('Indiquez les horaires de début et de fin.');
    if (d.type !== 'garde' && d.heure_fin && d.heure_debut && d.heure_fin <= d.heure_debut) e.push("L'heure de fin doit suivre l'heure de début (sauf pour une garde).");
    if (!REF.TYPES[d.type]) e.push('Choisissez le type de remplacement.');
    if (d.type === 'week_end' && dates.some(x => ![0, 6].includes(REF.jourSemaine(x)))) e.push('Un week-end ne comprend que des samedis et des dimanches.');
    if (!(d.modalites || []).length) e.push('Choisissez au moins une modalité.');
    if ((d.modalites || []).some(m => !REF.COMPETENCES[m])) e.push('Modalité inconnue.');
    if (!REF.PROFILS[d.profil]) e.push('Choisissez le profil accepté.');
    if (d.annee_min && (d.profil !== 'residents' || !REF.ANNEES.includes(Number(d.annee_min)))) e.push('Année minimale de résidanat invalide.');
    if (!(Number(d.honoraires) > 0)) e.push('Indiquez les honoraires proposés.');
    if (!REF.UNITES[d.unite]) e.push('Précisez si le forfait est par jour ou par garde.');
    return e;
  }
  function validerRemplacant(r) {
    const e = validerIdentite(r);
    if (!REF.STATUTS[r.statut]) e.push('Choisissez votre statut.');
    if (r.statut === 'resident' && !REF.ANNEES.includes(Number(r.annee_residanat))) e.push('Indiquez votre année de résidanat (R3 à R5).');
    if (!String(r.affectation || '').trim()) e.push("Indiquez votre service ou structure d'affectation.");
    if (!(r.competences || []).length) e.push('Cochez au moins une compétence.');
    if (!(r.gouvernorats || []).length) e.push('Cochez au moins un gouvernorat.');
    if (r.honoraires_souhaites !== '' && r.honoraires_souhaites != null && !(Number(r.honoraires_souhaites) >= 0)) e.push('Honoraires souhaités invalides.');
    if (!r.consentement) e.push('Le consentement au traitement des données est nécessaire.');
    return e;
  }
  function validerStructure(s) {
    const e = [];
    if (!String(s.nom || '').trim()) e.push('Indiquez le nom de la structure.');
    if (!REF.TYPES_STRUCTURE[s.type]) e.push('Choisissez clinique ou cabinet.');
    if (!String(s.adresse || '').trim()) e.push("Indiquez l'adresse.");
    if (!String(s.ville || '').trim()) e.push('Indiquez la ville.');
    if (!REF.GOUVERNORATS.includes(s.gouvernorat)) e.push('Choisissez le gouvernorat.');
    if (!String(s.contact_nom || '').trim()) e.push('Indiquez le nom du contact.');
    if (!REF.telephoneValide(s.telephone)) e.push('Téléphone invalide (8 chiffres).');
    if (!REF.emailValide(s.email)) e.push('E-mail de la structure invalide.');
    if (!s.consentement) e.push('Le consentement au traitement des données est nécessaire.');
    return e;
  }
  function validerIdentite(p) {
    const e = [];
    if (!String(p.nom || '').trim()) e.push('Indiquez votre nom.');
    if (!String(p.prenom || '').trim()) e.push('Indiquez votre prénom.');
    if (!REF.telephoneValide(p.telephone)) e.push('Téléphone invalide (8 chiffres).');
    if (!REF.emailValide(p.email)) e.push('E-mail invalide.');
    return e;
  }

  return { couvre, creneauAttendu, demiJournee, profilAccepte, competencesOk, gouvernoratOk, datesManquantes, conflits, compatible, totalHonoraires, debut, fin, validerDemande, validerRemplacant, validerStructure, validerIdentite };
});
