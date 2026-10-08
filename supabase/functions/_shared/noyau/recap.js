// Fichier généré par scripts/preparer-backend.js — ne pas modifier ici (source : remplacements/).
/* =========================================================
   RadiologicHub — Remplacements : récapitulatifs mis en forme
   ---------------------------------------------------------
   Une demande, une structure, un remplaçant → textes prêts à afficher
   (e-mails, contrat, interface) : dates JJ/MM/AAAA, montants en TND.
   ========================================================= */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./referentiel.js'), require('./regles.js'));
  else { const R = root.RHRemplacements = root.RHRemplacements || {}; R.recap = factory(R.referentiel, R.regles); }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (REF, REG) {
  'use strict';

  const reference = d => 'RH-' + String(d.id || '').replace(/-/g, '').slice(0, 8).toUpperCase();
  const horaires = d => {
    const t = `${d.heure_debut} – ${d.heure_fin}`;
    return d.heure_fin <= d.heure_debut ? `${t} (fin le lendemain)` : t;
  };
  const conditions = d => REF.libelles(Object.keys(REF.CONDITIONS).filter(k => d[k]), REF.CONDITIONS);
  const nombre = d => {
    const n = (d.dates || []).length, garde = d.unite === 'garde';
    return `${n} ${garde ? 'garde' : 'jour'}${n > 1 ? 's' : ''}`;
  };
  const statutRemplacant = r => (r.statut === 'resident' ? `résident en radiologie (R${r.annee_residanat})` : 'radiologue spécialiste');

  /* Demande (+ structure) → champs affichables */
  function demande(d, s = {}) {
    const cond = conditions(d);
    return {
      id: d.id,
      reference: reference(d),
      structure: s.nom || '',
      type_structure: (REF.TYPES_STRUCTURE[s.type] || '').toLowerCase(),
      ville: s.ville || '',
      gouvernorat: s.gouvernorat || '',
      adresse: [s.adresse, s.ville].filter(Boolean).join(', '),
      dates: [...(d.dates || [])].sort().map(REF.jourFr),
      dates_texte: REF.listeFr([...(d.dates || [])].sort().map(REF.jourFr)),
      date_courte: [...(d.dates || [])].sort().map(REF.dateFr).join(', '),
      horaires: horaires(d),
      type: REF.TYPES[d.type] || '',
      modalites: REF.listeFr(REF.libelles(d.modalites, REF.COMPETENCES)),
      profil: d.profil === 'residents' ? `Spécialistes et résidents${d.annee_min ? ` (à partir de R${d.annee_min})` : ''}` : 'Spécialistes uniquement',
      honoraires: REF.montant(d.honoraires),
      unite: REF.UNITES[d.unite] || '',
      total: REF.montant(REG.totalHonoraires(d)),
      nombre: nombre(d),
      conditions_liste: cond,
      conditions: cond.length ? `Pris en charge par la structure : ${cond.join(', ').toLowerCase()}.` : 'Aucune prise en charge (logement, transport, repas) n\'est prévue.',
      conditions_courtes: cond.length ? cond.join(', ') : 'Aucune',
      commentaire: d.commentaire || '',
      etat: REF.ETATS_DEMANDE[d.etat] || '',
    };
  }

  /* Remplaçant (+ profil) → champs affichables */
  function remplacant(r, p = {}) {
    return {
      nom: p.nom || '', prenom: p.prenom || '', nom_complet: `Dr ${p.prenom || ''} ${p.nom || ''}`.trim(),
      telephone: p.telephone || '', email: p.email || '',
      statut: statutRemplacant(r), statut_court: r.statut === 'resident' ? `Résident R${r.annee_residanat}` : 'Spécialiste',
      resident: r.statut === 'resident', affectation: r.affectation || '',
      competences: REF.listeFr(REF.libelles(r.competences, REF.COMPETENCES)),
      honoraires_souhaites: r.honoraires_souhaites ? `${REF.montant(r.honoraires_souhaites)} par jour` : 'non précisés',
    };
  }

  /* Structure → champs affichables */
  function structure(s) {
    return {
      nom: s.nom, type: (REF.TYPES_STRUCTURE[s.type] || '').toLowerCase(), adresse: s.adresse, ville: s.ville, gouvernorat: s.gouvernorat,
      contact: s.contact_nom, telephone: s.telephone, email: s.email,
      equipements: REF.listeFr(REF.libelles(s.equipements, REF.EQUIPEMENTS)),
    };
  }

  return { demande, remplacant, structure, reference, horaires, nombre };
});
