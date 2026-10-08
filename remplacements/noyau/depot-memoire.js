/* =========================================================
   RadiologicHub — Remplacements : dépôt de données en mémoire
   ---------------------------------------------------------
   Même interface que le dépôt Supabase (supabase/functions/_shared/
   depot-supabase.ts) : utilisé par les tests (Node) et par le mode
   démonstration du site (état sauvegardé dans le navigateur).
   Les objets renvoyés sont des copies : modifier un objet lu ne modifie
   pas la base, il faut passer par maj().
   ========================================================= */

(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.RHRemplacements = root.RHRemplacements || {}).depotMemoire = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const TABLES = ['profils', 'remplacants', 'structures', 'membres', 'favoris', 'disponibilites', 'demandes', 'propositions', 'jetons', 'journal', 'emails'];
  const copie = o => (o == null ? o : JSON.parse(JSON.stringify(o)));
  const uuid = () => (globalThis.crypto && globalThis.crypto.randomUUID ? globalThis.crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); }));

  function creerDepot(initial) {
    const t = {};
    TABLES.forEach(n => { t[n] = copie((initial && initial[n]) || []); });
    const trouver = (n, f) => t[n].find(f);
    const maj = (n, cle = 'id') => async (id, patch, o = {}) => {
      const x = trouver(n, y => y[cle] === id);
      if (!x) return null;
      if (o.siEtat && x.etat !== o.siEtat) return null;              // mise à jour conditionnelle (concurrence)
      Object.assign(x, copie(patch));
      return copie(x);
    };
    const avecProfil = r => (r ? { ...copie(r), profil: copie(trouver('profils', p => p.id === r.id)) || {} } : null);

    const depot = {
      tables: t,
      exporter: () => copie(t),
      id: uuid,

      profils: {
        get: async id => copie(trouver('profils', p => p.id === id)),
        parEmail: async email => copie(trouver('profils', p => String(p.email).toLowerCase() === String(email).toLowerCase())),
        ajouter: async p => { const x = { id: uuid(), desinscrit: false, ...copie(p) }; t.profils.push(x); return copie(x); },
        maj: maj('profils'),
      },
      remplacants: {
        get: async id => avecProfil(trouver('remplacants', r => r.id === id)),
        valides: async () => t.remplacants.filter(r => r.etat === 'valide').map(avecProfil),
        tous: async () => t.remplacants.map(avecProfil),
        ajouter: async r => { t.remplacants.push(copie(r)); return avecProfil(r); },
        maj: maj('remplacants'),
      },
      structures: {
        get: async id => copie(trouver('structures', s => s.id === id)),
        toutes: async () => copie(t.structures),
        ajouter: async s => { const x = { id: uuid(), attribution_auto: false, delai_relance_h: 12, desinscrit: false, ...copie(s) }; t.structures.push(x); return copie(x); },
        maj: maj('structures'),
      },
      membres: {
        parStructure: async id => copie(t.membres.filter(m => m.structure_id === id)),
        parProfil: async id => copie(t.membres.filter(m => m.profil_id === id)),
        ajouter: async m => { t.membres.push(copie(m)); return copie(m); },
      },
      favoris: {
        parStructure: async id => t.favoris.filter(f => f.structure_id === id).map(f => f.remplacant_id),
        basculer: async (structure_id, remplacant_id) => {
          const i = t.favoris.findIndex(f => f.structure_id === structure_id && f.remplacant_id === remplacant_id);
          if (i >= 0) { t.favoris.splice(i, 1); return false; }
          t.favoris.push({ structure_id, remplacant_id }); return true;
        },
      },
      disponibilites: {
        pour: async (ids, dates) => copie(t.disponibilites.filter(x => ids.includes(x.remplacant_id) && (!dates || dates.includes(x.date)))),
        parRemplacant: async id => copie(t.disponibilites.filter(x => x.remplacant_id === id)),
        /* Remplace les créneaux d'une date */
        definir: async (remplacant_id, date, creneaux) => {
          t.disponibilites = t.disponibilites.filter(x => !(x.remplacant_id === remplacant_id && x.date === date));
          creneaux.forEach(creneau => t.disponibilites.push({ remplacant_id, date, creneau }));
        },
      },
      demandes: {
        get: async id => copie(trouver('demandes', d => d.id === id)),
        ajouter: async d => { const x = { id: uuid(), version: 1, ...copie(d) }; t.demandes.push(x); return copie(x); },
        maj: maj('demandes'),
        parEtat: async etats => copie(t.demandes.filter(d => etats.includes(d.etat))),
        parStructure: async id => copie(t.demandes.filter(d => d.structure_id === id)),
        confirmeesPour: async ids => copie(t.demandes.filter(d => d.etat === 'pourvue' && ids.includes(d.remplacant_id))),
        toutes: async () => copie(t.demandes),
      },
      propositions: {
        get: async id => copie(trouver('propositions', p => p.id === id)),
        parDemande: async id => copie(t.propositions.filter(p => p.demande_id === id)),
        parRemplacant: async id => copie(t.propositions.filter(p => p.remplacant_id === id)),
        ajouter: async p => { const x = { id: uuid(), ...copie(p) }; t.propositions.push(x); return copie(x); },
        maj: maj('propositions'),
      },
      jetons: {
        ajouter: async j => { t.jetons.push(copie(j)); return copie(j); },
        get: async hash => copie(trouver('jetons', j => j.hash === hash)),
        /* Utilisation unique : vrai seulement si le jeton n'avait pas encore servi */
        consommer: async (hash, quand) => {
          const j = trouver('jetons', x => x.hash === hash);
          if (!j || j.utilise_le) return false;
          j.utilise_le = quand;
          return true;
        },
        invalider: async ({ proposition_id, demande_id, actions, quand }) => {
          t.jetons.forEach(j => {
            if (j.utilise_le) return;
            if (proposition_id && j.proposition_id !== proposition_id) return;
            if (demande_id && j.demande_id !== demande_id) return;
            if (actions && !actions.includes(j.action)) return;
            j.utilise_le = quand || new Date().toISOString();
          });
        },
      },
      journal: {
        ajouter: async e => { t.journal.push({ id: uuid(), ...copie(e) }); },
        existe: async (action, objet_id) => t.journal.some(e => e.action === action && e.objet_id === objet_id),
        tout: async () => copie(t.journal),
      },
      emails: {
        ajouter: async e => { const id = uuid(); t.emails.push({ id, ...copie(e) }); return id; },
        maj: maj('emails'),
        tout: async () => copie(t.emails),
      },
    };
    return depot;
  }

  return { creerDepot, TABLES };
});
