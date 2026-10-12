/* =========================================================
   RadiologicHub — Bibliothèque : appels aux services externes
   ---------------------------------------------------------
   • Limiteur : au plus N requêtes par seconde et par service
     (config.api.debits), les appels attendent leur tour.
   • Cache : réponses DÉJÀ RÉDUITES aux métadonnées (jamais la réponse
     brute, qui peut contenir l'abstract), avec une durée de vie.
   • Client : JSON, 404 → null, 429 / 503 → une nouvelle tentative.
   Horloge, attente, stockage et fetch sont injectables (tests).
   ========================================================= */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else (root.RHBib = root.RHBib || {}).reseau = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const hote = url => { try { return new URL(url).hostname; } catch (e) { return ''; } };
  const dormir = ms => new Promise(r => setTimeout(r, ms));

  function creerLimiteur(debits, { maintenant = () => Date.now(), attendre = dormir } = {}) {
    const prochain = new Map();
    return {
      /* Attend que le service de cette adresse accepte une nouvelle requête */
      async avant(url) {
        const h = hote(url), parSeconde = (debits && debits[h]) || 1;
        const t = maintenant(), creneau = Math.max(t, prochain.get(h) || 0);
        prochain.set(h, creneau + 1000 / parSeconde);
        if (creneau > t) await attendre(creneau - t);
      },
    };
  }

  /* stockage : { lire(cle) → { valeur, expire } | null, ecrire(cle, { valeur, expire }) } (mémoire par défaut) */
  function creerCache({ maintenant = () => Date.now(), stockage = null } = {}) {
    const memoire = new Map();
    const S = stockage || { lire: k => memoire.get(k) || null, ecrire: (k, v) => { memoire.set(k, v); } };
    return {
      async lire(cle) {
        const e = await S.lire(cle);
        return e && e.expire > maintenant() ? e.valeur : undefined;
      },
      async ecrire(cle, valeur, jours) {
        await S.ecrire(cle, { valeur, expire: maintenant() + jours * 864e5 });
      },
    };
  }

  /* Erreur d'un service : code « reseau », « http » (status) */
  class ErreurService extends Error {
    constructor(code, message, status) { super(message); this.code = code; this.status = status || null; }
  }

  function creerClient({ fetch: f = (typeof fetch !== 'undefined' ? fetch.bind(globalThis) : null), limiteur, attendre = dormir } = {}) {
    if (!f) throw new Error('fetch indisponible');
    return {
      /* GET JSON → objet, null si 404 ; une seconde tentative après 429 / 503 */
      async json(url) {
        for (let essai = 0; ; essai++) {
          if (limiteur) await limiteur.avant(url);
          let r;
          try {
            r = await f(url, { headers: { Accept: 'application/json' } });
          } catch (e) {
            throw new ErreurService('reseau', `${hote(url)} injoignable`);
          }
          if (r.status === 404) return null;
          if ((r.status === 429 || r.status === 503) && essai === 0) { await attendre(1500); continue; }
          if (!r.ok) throw new ErreurService('http', `${hote(url)} : erreur ${r.status}`, r.status);
          return r.json();
        }
      },
    };
  }

  return { hote, creerLimiteur, creerCache, creerClient, ErreurService };
});
