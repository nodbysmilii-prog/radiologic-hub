/* =========================================================
   RadiologicHub — Remplacements : agenda du remplaçant et planning de la structure
   ---------------------------------------------------------
   Calculs sans affichage (testés sous Node : tests/remplacements-agenda.test.js),
   à partir des données déjà lues par l'interface — aucun stockage nouveau :
   • agendaRemplacant : missions confirmées dans TOUTES les structures,
     propositions (à répondre / en attente du choix) et disponibilités cochées ;
   • planningStructure : demandes d'une structure (confirmées, volontaires à
     choisir, en recherche) ; un jour sans demande n'a aucun élément ;
   • une mission sur plusieurs jours reste UN élément (jour n sur N) ;
   • honoraires confirmés (missions) et potentiels (propositions ou demandes
     en recherche), comptés jour par jour sur le mois affiché ;
   • couleur stable par structure ; export .ics mensuel (un seul fichier).
   ========================================================= */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./noyau/referentiel.js'), require('./noyau/ics.js'));
  else { const R = root.RHRp = root.RHRp || {}; R.agenda = factory(root.RHRemplacements.referentiel, root.RHRemplacements.ics); }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (REF, ICS) {
  'use strict';

  /* Couleurs du site, toujours la même pour une structure donnée (empreinte de son identifiant) */
  // ni rouge (alerte), ni vert (statut « confirmé »), ni sarcelle (« disponible ») : réservés aux statuts
  const COULEURS = ['plum', 'steel', 'orange', 'cornflower', 'gold', 'purple', 'slate'];
  function couleurStructure(id) {
    let h = 0;
    for (const c of String(id || '')) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    return COULEURS[h % COULEURS.length];
  }
  /* Couleurs de plusieurs structures : celle de chacune, sauf si elle est déjà prise par une autre
     (on passe alors à la suivante libre) ; même résultat quel que soit l'ordre d'arrivée. */
  function couleursStructures(ids) {
    const prises = new Map(), libres = [...COULEURS];
    [...new Set(ids)].sort().forEach(id => {
      let i = COULEURS.indexOf(couleurStructure(id));
      for (let n = 0; n < COULEURS.length && !libres.includes(COULEURS[i]); n++) i = (i + 1) % COULEURS.length;
      const c = libres.includes(COULEURS[i]) ? COULEURS[i] : couleurStructure(id);
      prises.set(id, c);
      libres.splice(libres.indexOf(c), 1);
    });
    return prises;
  }

  /* Statuts : symbole + libellé (jamais la couleur seule) */
  const STATUTS = {
    mission: { symbole: '✓', libelle: 'Mission confirmée' },
    realisee: { symbole: '✓', libelle: 'Mission réalisée' },
    a_repondre: { symbole: '?', libelle: 'Proposition à répondre' },
    en_attente: { symbole: '…', libelle: 'En attente du choix de la structure' },
    disponible: { symbole: '●', libelle: 'Disponible' },
    confirmee: { symbole: '✓', libelle: 'Remplaçant confirmé' },
    volontaires: { symbole: '★', libelle: 'Volontaires à choisir' },
    recherche: { symbole: '…', libelle: 'En recherche' },
  };

  const dansMois = (date, mois) => String(date).slice(0, 7) === mois;
  const trier = dates => [...(dates || [])].sort();

  /* Place chaque élément sur ses jours : { date: [{ element, rang, total }] } */
  function parJour(elements) {
    const jours = {};
    elements.forEach(e => {
      const dates = trier(e.dates);
      dates.forEach((d, i) => (jours[d] = jours[d] || []).push({ element: e, rang: i + 1, total: dates.length }));
    });
    return jours;
  }
  /* Honoraires comptés sur les seules dates du mois */
  const honorairesDuMois = (elements, mois) => elements.reduce((t, e) => t + (Number(e.demande.honoraires) || 0) * e.dates.filter(d => dansMois(d, mois)).length, 0);
  const joursDuMois = (elements, mois) => elements.reduce((t, e) => t + e.dates.filter(d => dansMois(d, mois)).length, 0);
  const touche = (e, mois) => e.dates.some(d => dansMois(d, mois));

  /*
   * agendaRemplacant({ propositions: [{ proposition, demande, structure }], disponibilites: [{ date, creneau }], mois: 'AAAA-MM', masquees: Set d'id de structures })
   */
  function agendaRemplacant({ propositions = [], disponibilites = [], mois, masquees = new Set() }) {
    const missions = [], props = [];
    const couleurs = couleursStructures(propositions.filter(x => x.structure).map(x => x.structure.id));
    propositions.forEach(({ proposition: p, demande: d, structure: s }) => {
      if (!d || !s) return;
      const base = { id: d.id, demande: d, structure: s, proposition: p, dates: trier(d.dates), couleur: couleurs.get(s.id) };
      if (p.etat === 'retenu' && ['pourvue', 'realisee'].includes(d.etat)) missions.push({ ...base, statut: d.etat === 'realisee' ? 'realisee' : 'mission' });
      else if (d.etat === 'publiee' && p.etat === 'envoyee') props.push({ ...base, statut: 'a_repondre' });
      else if (d.etat === 'publiee' && p.etat === 'interesse') props.push({ ...base, statut: 'en_attente' });
    });
    const structures = new Map();
    [...missions, ...props].forEach(e => structures.set(e.structure.id, { id: e.structure.id, nom: e.structure.nom, couleur: e.couleur }));
    const visible = e => !masquees.has(e.structure.id);
    const mv = missions.filter(visible), pv = props.filter(visible);
    const jours = {};
    const ajouter = (cle, l) => Object.entries(parJour(l)).forEach(([d, x]) => { (jours[d] = jours[d] || { missions: [], propositions: [], creneaux: [] })[cle].push(...x); });
    ajouter('missions', mv);
    ajouter('propositions', pv);
    disponibilites.forEach(x => { (jours[x.date] = jours[x.date] || { missions: [], propositions: [], creneaux: [] }).creneaux.push(x.creneau); });
    const duMoisM = mv.filter(e => touche(e, mois)), duMoisP = pv.filter(e => touche(e, mois));
    return {
      missions: mv.sort((a, b) => a.dates[0].localeCompare(b.dates[0])),
      propositions: pv.sort((a, b) => a.dates[0].localeCompare(b.dates[0])),
      structures: [...structures.values()].sort((a, b) => a.nom.localeCompare(b.nom, 'fr')),
      jours,
      resume: {
        missions: duMoisM.length,
        jours: joursDuMois(duMoisM, mois),
        structures: new Set(duMoisM.map(e => e.structure.id)).size,
        confirmes: honorairesDuMois(duMoisM, mois),
        potentiels: honorairesDuMois(duMoisP, mois),
        propositions: duMoisP.filter(e => e.statut === 'a_repondre').length,
      },
    };
  }

  /*
   * planningStructure({ demandes: [{ demande, compteurs, interesses }], mois })
   * Seules les demandes publiées, pourvues ou réalisées figurent au planning.
   */
  function planningStructure({ demandes = [], mois }) {
    const elements = [];
    demandes.forEach(x => {
      const d = x.demande;
      const volontaires = (x.interesses || []).filter(i => i.proposition.etat === 'interesse');
      let statut = null;
      if (d.etat === 'pourvue') statut = 'confirmee';
      else if (d.etat === 'realisee') statut = 'realisee';
      else if (d.etat === 'publiee') statut = volontaires.length ? 'volontaires' : 'recherche';
      if (!statut) return;
      const retenu = d.remplacant_id ? (x.interesses || []).find(i => i.remplacant.id === d.remplacant_id) : null;
      elements.push({ id: d.id, demande: d, dates: trier(d.dates), statut, volontaires, retenu: retenu ? retenu.remplacant : null, compteurs: x.compteurs || {} });
    });
    const confirmes = elements.filter(e => ['confirmee', 'realisee'].includes(e.statut) && touche(e, mois));
    const ouverts = elements.filter(e => ['volontaires', 'recherche'].includes(e.statut) && touche(e, mois));
    return {
      elements: elements.sort((a, b) => a.dates[0].localeCompare(b.dates[0])),
      jours: parJour(elements),
      resume: {
        joursConfirmes: joursDuMois(confirmes, mois),
        joursAPourvoir: joursDuMois(ouverts, mois),
        volontaires: ouverts.reduce((t, e) => t + e.volontaires.length, 0),
        budgetConfirme: honorairesDuMois(confirmes, mois),
        budgetPotentiel: honorairesDuMois(ouverts, mois),
      },
    };
  }

  /* Un seul fichier .ics pour plusieurs missions (un événement par date, identifiants distincts) */
  function icsMois(evenements, maintenant) {
    if (!evenements.length) return '';
    const textes = evenements.map(e => ICS.calendrier({ ...e, maintenant }));
    const entete = textes[0].slice(0, textes[0].indexOf('BEGIN:VEVENT'));
    const corps = textes.map(t => t.slice(t.indexOf('BEGIN:VEVENT'), t.lastIndexOf('END:VCALENDAR'))).join('');
    return `${entete}${corps}END:VCALENDAR\r\n`;
  }

  /* Semaine (lundi) d'une date, pour la vue liste */
  const lundi = date => REF.ajouterJours(date, -((REF.jourSemaine(date) + 6) % 7));

  return { COULEURS, STATUTS, couleurStructure, couleursStructures, agendaRemplacant, planningStructure, icsMois, lundi, dansMois };
});
