/* =========================================================
   RadiologicHub — Remplacements : référentiels et formats
   ---------------------------------------------------------
   Listes fermées (gouvernorats, compétences, statuts…) et mise en forme
   tunisienne : fuseau Africa/Tunis, dates JJ/MM/AAAA, montants en TND.
   Module sans dépendance, partagé par le site, les fonctions serveur
   (Supabase) et les tests (Node).
   ========================================================= */

(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.RHRemplacements = root.RHRemplacements || {}).referentiel = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const FUSEAU = 'Africa/Tunis';

  const GOUVERNORATS = [
    'Ariana', 'Béja', 'Ben Arous', 'Bizerte', 'Gabès', 'Gafsa', 'Jendouba', 'Kairouan',
    'Kasserine', 'Kébili', 'Le Kef', 'Mahdia', 'La Manouba', 'Médenine', 'Monastir', 'Nabeul',
    'Sfax', 'Sidi Bouzid', 'Siliana', 'Sousse', 'Tataouine', 'Tozeur', 'Tunis', 'Zaghouan',
  ];
  const COMPETENCES = {
    conventionnelle: 'Radiologie conventionnelle',
    echographie: 'Échographie',
    mammographie: 'Mammographie',
    scanner: 'Scanner',
    irm: 'IRM',
    interventionnel: 'Radiologie interventionnelle',
  };
  const EQUIPEMENTS = { ...COMPETENCES, osteodensitometrie: 'Ostéodensitométrie', panoramique: 'Panoramique dentaire' };
  const STATUTS = { specialiste: 'Radiologue spécialiste', resident: 'Résident en radiologie' };
  const ANNEES = [3, 4, 5];                                   // années de résidanat acceptées (R3 à R5)
  const CRENEAUX = { journee: 'Journée', matin: 'Matin', apres_midi: 'Après-midi', garde: 'Garde' };
  const TYPES = { journee: 'Journée', demi_journee: 'Demi-journée', garde: 'Garde', week_end: 'Week-end' };
  const PROFILS = { specialiste: 'Spécialistes uniquement', residents: 'Spécialistes et résidents' };
  const UNITES = { jour: 'par jour', garde: 'par garde' };
  const CONDITIONS = { logement: 'Logement', transport: 'Transport', repas: 'Repas' };
  const TYPES_STRUCTURE = { clinique: 'Clinique', cabinet: 'Cabinet' };
  const ETATS_INSCRIPTION = { en_attente: 'En attente de validation', valide: 'Validé', refuse: 'Refusé', suspendu: 'Suspendu' };
  const ETATS_DEMANDE = {
    publiee: 'En recherche', pourvue: 'Pourvue', realisee: 'Réalisée', non_realisee: 'Non réalisée',
    annulee: 'Annulée', expiree: 'Expirée sans remplaçant',
  };
  const ETATS_PROPOSITION = {
    envoyee: 'En attente de réponse', interesse: 'Disponible', decline: 'Pas disponible', retenu: 'Retenu',
    pourvu_autre: 'Poste pourvu', expiree: 'Close', annulee: 'Annulée par le remplaçant', liberee: 'Annulée par la structure',
  };

  /* ---------- Dates et heures (fuseau Africa/Tunis) ---------- */
  const pad = n => String(n).padStart(2, '0');
  const parties = (instant, opts) => {
    const f = new Intl.DateTimeFormat('fr-FR', { timeZone: FUSEAU, hourCycle: 'h23', ...opts });
    return Object.fromEntries(f.formatToParts(instant).filter(p => p.type !== 'literal').map(p => [p.type, p.value]));
  };
  /* Instant → 'AAAA-MM-JJ' (date locale tunisienne) */
  const dateLocale = (instant = new Date()) => {
    const p = parties(new Date(instant), { year: 'numeric', month: '2-digit', day: '2-digit' });
    return `${p.year}-${p.month}-${p.day}`;
  };
  /* Instant → 'HH:MM' (heure locale tunisienne) */
  const heureLocale = (instant = new Date()) => {
    const p = parties(new Date(instant), { hour: '2-digit', minute: '2-digit' });
    return `${p.hour}:${p.minute}`;
  };
  /* Décalage (minutes) de Tunis par rapport à UTC à un instant donné */
  const decalage = instant => {
    const p = parties(new Date(instant), { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const local = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
    return Math.round((local - Math.floor(new Date(instant).getTime() / 1000) * 1000) / 60000);
  };
  /* 'AAAA-MM-JJ' + 'HH:MM' (heure de Tunis) → Date (instant) */
  const instant = (date, heure = '00:00') => {
    const [a, m, j] = date.split('-').map(Number), [h, mi] = heure.split(':').map(Number);
    const brut = Date.UTC(a, m - 1, j, h, mi);
    return new Date(brut - decalage(brut) * 60000);
  };
  const ajouterJours = (date, n) => {
    const [a, m, j] = date.split('-').map(Number);
    const d = new Date(Date.UTC(a, m - 1, j + n));
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
  };
  const jourSemaine = date => { const [a, m, j] = date.split('-').map(Number); return new Date(Date.UTC(a, m - 1, j)).getUTCDay(); };   // 0 = dimanche
  const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

  /* 'AAAA-MM-JJ' → 'JJ/MM/AAAA' */
  const dateFr = date => { if (!date) return ''; const [a, m, j] = String(date).slice(0, 10).split('-'); return `${j}/${m}/${a}`; };
  /* 'AAAA-MM-JJ' → 'jeudi 15/10/2026' */
  const jourFr = date => `${JOURS[jourSemaine(date)]} ${dateFr(date)}`;
  /* 'JJ/MM/AAAA' → 'AAAA-MM-JJ' (null si invalide) */
  const lireDateFr = s => {
    const m = /^\s*(\d{1,2})\/(\d{1,2})\/(\d{4})\s*$/.exec(s || '');
    if (!m) return null;
    const iso = `${m[3]}-${pad(m[2])}-${pad(m[1])}`;
    return ajouterJours(iso, 0) === iso ? iso : null;
  };
  /* Instant → 'JJ/MM/AAAA à HH:MM' (Tunis) */
  const horodatageFr = t => (t ? `${dateFr(dateLocale(t))} à ${heureLocale(t)}` : '');
  const moisFr = cle => { const [a, m] = cle.split('-').map(Number); return `${MOIS[m - 1]} ${a}`; };   // '2026-10' → 'octobre 2026'
  const heureFr = h => (h ? h.replace(':', ' h ') : '');                                                // '08:30' → '08 h 30'

  /* Montant en TND : 1250 → '1 250 TND' */
  const montant = n => {
    const v = Number(n);
    if (!Number.isFinite(v)) return '';
    const [ent, dec] = (Math.round(v * 1000) / 1000).toString().split('.');
    return `${ent.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}${dec ? ',' + dec : ''} TND`;
  };
  /* Téléphone tunisien : 8 chiffres, avec ou sans +216 */
  const telephoneValide = t => /^(\+216|00216)?\s?[2-9]\d(\s?\d){6}$/.test(String(t || '').trim());
  const emailValide = e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(e || '').trim());

  const libelles = (liste, table) => (liste || []).map(k => table[k] || k);
  const listeFr = a => (a.length < 2 ? (a[0] || '') : a.slice(0, -1).join(', ') + ' et ' + a[a.length - 1]);

  return {
    FUSEAU, GOUVERNORATS, COMPETENCES, EQUIPEMENTS, STATUTS, ANNEES, CRENEAUX, TYPES, PROFILS, UNITES, CONDITIONS,
    TYPES_STRUCTURE, ETATS_INSCRIPTION, ETATS_DEMANDE, ETATS_PROPOSITION, JOURS, MOIS,
    dateLocale, heureLocale, instant, ajouterJours, jourSemaine, dateFr, jourFr, lireDateFr, horodatageFr, moisFr, heureFr,
    montant, telephoneValide, emailValide, libelles, listeFr,
  };
});
