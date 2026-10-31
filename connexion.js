/* =========================================================
   RadiologicHub — retour de connexion (Remplacements, Communauté,
   administration de la Bibliothèque ; lien e-mail ou Google)
   ---------------------------------------------------------
   • Vue à retrouver après le lien de connexion (#/messages, #/admin…) :
     gardée une heure au plus (durée de validité du lien) dans CE
     navigateur, puis effacée ; seule une ancre de forme #/… est acceptée.
   • Erreur renvoyée par Supabase dans l'adresse (lien expiré ou déjà
     utilisé, connexion annulée) : message en français, adresse nettoyée.
   • Message commun de session expirée.
   Testé par tests/navigateur/connexion.js.
   ========================================================= */
(function () {
  'use strict';
  const DUREE = 3600e3;
  const VUE = /^#\/[\w/-]{0,200}$/;
  const lire = cle => { try { return JSON.parse(localStorage.getItem(cle) || 'null'); } catch (e) { return null; } };
  const effacer = cle => { try { localStorage.removeItem(cle); } catch (e) { /* stockage indisponible */ } };

  window.RHConnexion = {
    SESSION_EXPIREE: 'Votre session a expiré : reconnectez-vous pour continuer.',
    memoriserVue(cle, vue) {
      if (!vue || !VUE.test(vue)) return effacer(cle);
      try { localStorage.setItem(cle, JSON.stringify({ vue, le: Date.now() })); } catch (e) { /* stockage indisponible : retour à l'accueil du module */ }
    },
    reprendreVue(cle) {
      const v = lire(cle);
      effacer(cle);
      const age = v && Date.now() - Number(v.le);
      return v && typeof v.vue === 'string' && VUE.test(v.vue) && age >= 0 && age < DUREE ? v.vue : null;
    },
    /* Message lisible si l'adresse porte une erreur de connexion (puis adresse nettoyée), sinon null. */
    erreurRetour() {
      const p = new URLSearchParams(`${location.search.slice(1)}&${location.hash.replace(/^#\/?/, '')}`);
      const code = p.get('error_code') || '', erreur = p.get('error') || '', detail = p.get('error_description') || '';
      if (!code && !erreur && !detail) return null;
      try { history.replaceState(null, '', location.pathname); } catch (e) { /* adresse laissée telle quelle */ }
      if (code === 'otp_expired' || /expired|invalid/i.test(detail)) return 'Le lien de connexion a expiré ou a déjà été utilisé. Demandez-en un nouveau : il est valable une heure, une seule fois.';
      if (erreur === 'access_denied') return 'La connexion a été refusée ou annulée. Réessayez.';
      return `La connexion n'a pas abouti (${String(detail || erreur || code).slice(0, 160)}). Réessayez, ou demandez un nouveau lien.`;
    },
  };
})();
