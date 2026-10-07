/* =========================================================
   RadiologicHub — Suivi oncologique : REGISTRE DES LÉSIONS
   ---------------------------------------------------------
   Modèle : suivi → examens (date, technique, baseline) →
   une mesure par lésion. Les lésions ont un identifiant fixe
   (C1… cibles, NC1… non-cibles, N1… nouvelles), jamais réutilisé.

   On ne stocke que ce qui est saisi : sommes, baseline, nadir
   et variations sont toujours recalculés.

   Sans dépendance au navigateur : utilisé par la page
   (window.RHSuivi.registre) et par les tests (Node).
   ========================================================= */

(function (root, factory) {
  const node = typeof module === 'object' && module.exports;
  const api = factory(node ? require('./seuils.js') : root.RHSuivi.seuils);
  if (node) module.exports = api;
  else root.RHSuivi.registre = api;
})(typeof self !== 'undefined' ? self : this, function (SEUILS) {
  'use strict';

  const FORMAT = 'radiologichub-suivi';
  const VERSION = 1;
  const PREFIXE = { cible: 'C', 'non-cible': 'NC', nouvelle: 'N' };
  const ORDRE_TYPE = { cible: 0, 'non-cible': 1, nouvelle: 2 };
  const CRITERES = { recist11: 'RECIST 1.1', lugano2014: 'Lugano 2014' };

  // Statuts possibles d'une mesure, par type de lésion
  const STATUTS = {
    cible: {
      '': 'À saisir', mesuree: 'Mesurée',
      'trop-petite': `Trop petite (${SEUILS.recist.tropPetiteMm} mm)`, disparue: `Disparue (${SEUILS.recist.disparueMm} mm)`,
      'non-evaluable': 'Non évaluable',
    },
    'non-cible': { '': 'À évaluer', presente: 'Présente', disparue: 'Disparue', progression: 'Progression non équivoque', 'non-evaluable': 'Non évaluable' },
    // Une lésion nouvelle n'est enregistrée que si elle est certaine (choix du service : pas de statut « équivoque »)
    nouvelle: { '': 'À évaluer', presente: 'Présente', disparue: 'Disparue', 'non-evaluable': 'Non évaluable' },
  };

  /* ---------- Outils ---------- */
  const aleatoire = n => {
    const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const c = globalThis.crypto && globalThis.crypto.getRandomValues
      ? globalThis.crypto.getRandomValues(new Uint8Array(n))
      : Array.from({ length: n }, () => Math.floor(Math.random() * 256));
    return Array.from(c, x => abc[x % abc.length]).join('');
  };
  const maintenant = () => new Date().toISOString();
  const toucher = s => { s.modifie = maintenant(); return s; };
  const dateValide = d => /^\d{4}-\d{2}-\d{2}$/.test(d || '') && !Number.isNaN(Date.parse(d + 'T00:00:00Z'));
  const arrondi = n => Math.round(n * 10) / 10;
  const numero = id => parseInt(String(id).replace(/^\D+/, ''), 10);
  const trierLesions = (a, b) => ORDRE_TYPE[a.type] - ORDRE_TYPE[b.type] || numero(a.id) - numero(b.id);

  const fr = (n, d = 1) => Number(n).toLocaleString('fr-FR', { maximumFractionDigits: d });
  const dateFr = d => (dateValide(d) ? `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}` : String(d || ''));
  const signe = n => (n > 0 ? '+' : n < 0 ? '−' : '±');
  const fmtDelta = dl => (!dl ? '—'
    : `${signe(dl.mm)}${fr(Math.abs(dl.mm))} mm${dl.pct == null ? '' : ` (${signe(dl.pct)}${fr(Math.abs(dl.pct))} %)`}`);

  /* Lecture d'une mesure saisie : « 18 », « 18,5 », « 18.5 mm », « 1,8 cm » → mm */
  function lireMm(entree) {
    const t = String(entree ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
    if (!t) return { ok: true, vide: true, mm: null };
    const m = t.match(/^(\d+(?:[.,]\d+)?)\s*(mm|cm)?$/);
    if (!m) return { ok: false, vide: false, mm: null };
    let v = parseFloat(m[1].replace(',', '.'));
    if (m[2] === 'cm') v *= 10;
    return { ok: true, vide: false, mm: arrondi(v) };
  }

  /* Identifiant ne contenant que des lettres : risque que ce soit le nom du patient */
  const ressembleAUnNom = p => !!String(p || '').trim() && /^[\p{L}\s'’.-]+$/u.test(String(p).trim());

  /* ---------- Suivi ---------- */
  function creerSuivi({ pseudo = '', criteres = 'recist11' } = {}) {
    if (!CRITERES[criteres]) throw new Error('Critères inconnus : ' + criteres);
    return {
      format: FORMAT, version: VERSION, id: 'S-' + aleatoire(6), pseudo: String(pseudo).trim(), criteres,
      cree: maintenant(), modifie: maintenant(), compteurs: { E: 0, C: 0, NC: 0, N: 0 }, lesions: [], examens: [],
    };
  }

  /* ---------- Examens ---------- */
  const examensTries = s => [...s.examens].sort((a, b) => a.date.localeCompare(b.date) || a.ordre - b.ordre);
  const examen = (s, id) => s.examens.find(e => e.id === id) || null;
  const lesion = (s, id) => s.lesions.find(l => l.id === id) || null;
  function examenPrecedent(s, id) {
    const t = examensTries(s), i = t.findIndex(e => e.id === id);
    return i > 0 ? t[i - 1] : null;
  }

  const mesureVide = prec => ({ statut: '', valeur: '', ldi: '', sdi: '', serie: prec ? prec.serie : '', image: prec ? prec.image : '', motif: '' });

  /* Chaque lésion a une mesure dans son examen d'origine et dans tous les examens suivants
     (report automatique ; série / image reprises de l'examen précédent). */
  function synchroniser(s) {
    const t = examensTries(s);
    s.lesions.forEach(l => {
      let i0 = t.findIndex(e => e.id === l.origine);
      if (i0 < 0) i0 = 0;
      t.forEach((e, i) => {
        if (i < i0) delete e.mesures[l.id];
        else if (!e.mesures[l.id]) e.mesures[l.id] = mesureVide(i > 0 ? t[i - 1].mesures[l.id] : null);
      });
    });
    return s;
  }

  function ajouterExamen(s, { date, modalite = '', phase = '', epaisseur = '', baseline } = {}) {
    if (!dateValide(date)) throw new Error('Date d\'examen invalide (format AAAA-MM-JJ).');
    const prec = [...examensTries(s)].reverse().find(e => e.date <= date) || null;
    s.compteurs.E += 1;
    const ex = {
      id: 'E' + s.compteurs.E, ordre: s.compteurs.E, date,
      // technique reprise de l'examen précédent si non précisée
      modalite: modalite || (prec ? prec.modalite : ''),
      phase: phase || (prec ? prec.phase : ''),
      epaisseur: String(epaisseur || (prec ? prec.epaisseur : '')),
      baseline: baseline == null ? !s.examens.length : !!baseline,
      valide: false,
      lugano: { deauville: '', fixation: '', rateCm: '', moelle: '' },
      mesures: {},
    };
    s.examens.push(ex);
    synchroniser(s);
    toucher(s);
    return ex;
  }

  function modifierExamen(s, id, patch = {}) {
    const ex = examen(s, id);
    if (!ex) throw new Error('Examen introuvable.');
    if ('date' in patch && !dateValide(patch.date)) throw new Error('Date d\'examen invalide (format AAAA-MM-JJ).');
    ['date', 'modalite', 'phase', 'epaisseur'].forEach(k => { if (k in patch) ex[k] = String(patch[k]); });
    ['baseline', 'valide'].forEach(k => { if (k in patch) ex[k] = !!patch[k]; });
    if (patch.lugano) Object.assign(ex.lugano, patch.lugano);
    if ('date' in patch) synchroniser(s);
    toucher(s);
    return ex;
  }

  function supprimerExamen(s, id) {
    const t = examensTries(s), i = t.findIndex(e => e.id === id);
    if (i < 0) return;
    const suivant = t[i + 1] || null;
    s.examens = s.examens.filter(e => e.id !== id);
    // les lésions enregistrées sur cet examen passent à l'examen suivant (ou disparaissent s'il n'y en a pas)
    s.lesions = s.lesions.filter(l => {
      if (l.origine !== id) return true;
      if (!suivant) return false;
      l.origine = suivant.id;
      return true;
    });
    synchroniser(s);
    toucher(s);
  }

  /* ---------- Lésions ---------- */
  function ajouterLesion(s, examId, d = {}) {
    const ex = examen(s, examId);
    if (!ex) throw new Error('Examen introuvable.');
    const p = PREFIXE[d.type];
    if (!p) throw new Error('Type de lésion inconnu : ' + d.type);
    s.compteurs[p] += 1;
    const l = {
      id: p + s.compteurs[p], type: d.type,
      organe: String(d.organe || '').trim(), territoire: String(d.territoire || '').trim(),
      ganglion: !!d.ganglion, extraGanglionnaire: !!d.extraGanglionnaire,
      commentaire: String(d.commentaire || '').trim(), origine: ex.id,
    };
    s.lesions.push(l);
    synchroniser(s);
    toucher(s);
    return l;
  }

  function modifierLesion(s, id, patch = {}) {
    const l = lesion(s, id);
    if (!l) throw new Error('Lésion introuvable.');
    ['organe', 'territoire', 'commentaire'].forEach(k => { if (k in patch) l[k] = String(patch[k]).trim(); });
    ['ganglion', 'extraGanglionnaire'].forEach(k => { if (k in patch) l[k] = !!patch[k]; });
    toucher(s);
    return l;
  }

  // L'identifiant n'est jamais réutilisé : les compteurs ne redescendent pas
  function supprimerLesion(s, id) {
    s.lesions = s.lesions.filter(l => l.id !== id);
    s.examens.forEach(e => { delete e.mesures[id]; });
    toucher(s);
  }

  function majMesure(s, examId, lesionId, patch = {}) {
    const ex = examen(s, examId);
    const m = ex && ex.mesures[lesionId];
    if (!m) throw new Error('Mesure introuvable.');
    ['statut', 'valeur', 'ldi', 'sdi', 'serie', 'image', 'motif'].forEach(k => { if (k in patch) m[k] = String(patch[k]); });
    toucher(s);
    return m;
  }

  /* ---------- Calculs : valeurs, sommes, baseline, nadir ---------- */
  /* Valeur retenue pour une lésion cible (mm) ; null si non mesurée / non évaluable */
  function valeurMm(m, critere = 'recist') {
    if (!m) return null;
    const S = critere === 'lugano' ? SEUILS.lugano : SEUILS.recist;
    if (m.statut === 'disparue') return S.disparueMm;
    if (m.statut === 'trop-petite') return S.tropPetiteMm;
    if (m.statut === 'non-evaluable') return null;
    const r = lireMm(m.valeur);
    return r.ok && !r.vide ? r.mm : null;
  }

  /* Somme des diamètres des cibles d'un examen (ganglions : petit axe) */
  function sommeCibles(s, ex) {
    const cibles = s.lesions.filter(l => l.type === 'cible' && ex.mesures[l.id]);
    let somme = 0;
    const manquantes = [];
    cibles.forEach(l => {
      const v = valeurMm(ex.mesures[l.id]);
      if (v == null) manquantes.push(l.id); else somme += v;
    });
    return { somme: arrondi(somme), complete: cibles.length > 0 && !manquantes.length, manquantes, nb: cibles.length };
  }

  /* Baseline de référence : dernier examen « baseline » jusqu'à cet examen inclus
     (une nouvelle baseline — nouvelle ligne de traitement — remet le suivi à zéro). */
  function baselineDe(s, ex) {
    const t = examensTries(s);
    for (let j = t.findIndex(e => e.id === ex.id); j >= 0; j--) if (t[j].baseline) return t[j];
    return null;
  }

  /* Nadir : plus petite somme (complète) depuis la baseline incluse, jusqu'à l'examen précédent inclus.
     L'examen évalué n'en fait pas partie. À égalité, le plus ancien est retenu. */
  function nadirAvant(s, ex) {
    const base = baselineDe(s, ex);
    if (!base) return null;
    const t = examensTries(s);
    const i0 = t.findIndex(e => e.id === base.id), i = t.findIndex(e => e.id === ex.id);
    let best = null;
    for (let j = i0; j < i; j++) {
      const sc = sommeCibles(s, t[j]);
      if (sc.complete && (!best || sc.somme < best.somme)) best = { somme: sc.somme, examen: t[j] };
    }
    return best;
  }

  const delta = (a, b) => (a == null || b == null ? null : { mm: arrondi(a - b), pct: b ? (a - b) / b * 100 : null });

  /* Tableau comparatif d'un examen : une ligne par lésion + sommes */
  function comparatif(s, examId) {
    const ex = examen(s, examId);
    if (!ex) return null;
    const base = baselineDe(s, ex), nadir = nadirAvant(s, ex), prec = examenPrecedent(s, ex.id);
    const lignes = s.lesions.filter(l => ex.mesures[l.id]).sort(trierLesions).map(l => {
      const cellule = e => (e && e.mesures[l.id]
        ? { examen: e, mesure: e.mesures[l.id], mm: l.type === 'cible' ? valeurMm(e.mesures[l.id]) : null }
        : null);
      const actuel = cellule(ex);
      const b = base && base.id !== ex.id ? cellule(base) : null;
      const n = nadir ? cellule(nadir.examen) : null;
      return {
        lesion: l, mesure: ex.mesures[l.id],
        baseline: b, nadir: n, precedent: cellule(prec), actuel,
        dBaseline: l.type === 'cible' && b ? delta(actuel.mm, b.mm) : null,
        dNadir: l.type === 'cible' && n ? delta(actuel.mm, n.mm) : null,
      };
    });
    const sA = sommeCibles(s, ex);
    const sB = base && base.id !== ex.id ? sommeCibles(s, base) : null;
    const somme = {
      baseline: sB, nadir, precedent: prec ? sommeCibles(s, prec) : null, actuel: sA,
      dBaseline: sB && sB.complete && sA.complete ? delta(sA.somme, sB.somme) : null,
      dNadir: nadir && sA.complete ? delta(sA.somme, nadir.somme) : null,
    };
    return { examen: ex, baseline: base, nadir, precedent: prec, lignes, somme };
  }

  /* ---------- Export / import JSON ---------- */
  const exporter = s => JSON.stringify(s, null, 2);

  function importer(texte) {
    let d;
    try { d = JSON.parse(texte); } catch (e) { throw new Error('Fichier illisible : ce n\'est pas un fichier JSON.'); }
    if (!d || d.format !== FORMAT) throw new Error('Ce fichier n\'est pas un suivi RadiologicHub.');
    if (!(d.version >= 1 && d.version <= VERSION)) throw new Error(`Version de fichier non prise en charge (${d.version}).`);
    if (!CRITERES[d.criteres] || !Array.isArray(d.lesions) || !Array.isArray(d.examens) || !d.compteurs) throw new Error('Fichier de suivi incomplet.');
    d.examens.forEach(e => {
      if (!e || !/^E\d+$/.test(e.id) || !dateValide(e.date) || !e.mesures || typeof e.mesures !== 'object') throw new Error('Examen invalide dans le fichier.');
      e.lugano = Object.assign({ deauville: '', fixation: '', rateCm: '', moelle: '' }, e.lugano);
    });
    d.lesions.forEach(l => {
      if (!l || !PREFIXE[l.type] || !new RegExp(`^${PREFIXE[l.type]}\\d+$`).test(l.id)) throw new Error('Lésion invalide dans le fichier.');
    });
    // compteurs jamais inférieurs aux identifiants présents (un identifiant n'est jamais réutilisé)
    const max = p => Math.max(0, ...d.lesions.filter(l => PREFIXE[l.type] === p).map(l => numero(l.id)));
    ['C', 'NC', 'N'].forEach(p => { d.compteurs[p] = Math.max(+d.compteurs[p] || 0, max(p)); });
    d.compteurs.E = Math.max(+d.compteurs.E || 0, ...d.examens.map(e => numero(e.id)), 0);
    d.pseudo = String(d.pseudo || '');
    return synchroniser(d);
  }

  return {
    FORMAT, VERSION, PREFIXE, STATUTS, CRITERES,
    creerSuivi, ajouterExamen, modifierExamen, supprimerExamen,
    ajouterLesion, modifierLesion, supprimerLesion, majMesure, synchroniser,
    examensTries, examen, lesion, examenPrecedent, trierLesions,
    lireMm, valeurMm, sommeCibles, baselineDe, nadirAvant, comparatif,
    exporter, importer, ressembleAUnNom, fr, dateFr, fmtDelta,
  };
});
