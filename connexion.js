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
   • messageErreur(e) : erreur technique (réseau, Supabase, PostgREST) →
     message compréhensible en français ; un message déjà rédigé par le
     site est gardé tel quel.
   • verrouiller(element, action) : empêche la double soumission d'un
     formulaire ou le double clic sur un bouton pendant l'opération.
   Testé par tests/navigateur/connexion.js, tests/navigateur/fiabilite.js
   et tests/connexion-erreurs.test.js.
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
    /* Message compréhensible pour une erreur technique ; message du site (en français) conservé. */
    messageErreur(e) {
      const m = String((e && (e.message || e.error_description || e.msg)) || e || '');
      const code = String((e && (e.code || e.status)) || '');
      const hors = typeof navigator !== 'undefined' && navigator.onLine === false;
      if (hors || /failed to fetch|networkerror|load failed|network request failed|fetch failed|connexion impossible/i.test(m)) return 'Connexion impossible : vérifiez votre accès à Internet, puis réessayez.';
      if (/jwt expired|invalid jwt|refresh token|session (?:missing|expired)|not authenticated|auth session missing/i.test(m) || code === 'PGRST301' || code === 'PGRST303') return this.SESSION_EXPIREE;
      if (/row-level security|permission denied|insufficient_privilege/i.test(m) || code === '42501' || code === '403') return 'Action non autorisée pour votre compte.';
      if (/duplicate key|already exists/i.test(m) || code === '23505') return 'Cet élément existe déjà.';
      if (/violates (?:check|not-null|foreign key) constraint|invalid input syntax|value too long|out of range/i.test(m) || /^2(?:2|3)\d{3}$/.test(code)) return 'Certaines informations ne sont pas valides : vérifiez le formulaire.';
      if (/timeout|timed out|statement timeout|ne répond pas/i.test(m) || code === '57014') return 'Le service ne répond pas : réessayez dans un instant.';
      if (/rate limit|too many requests/i.test(m) || code === '429') return 'Trop de demandes en peu de temps : patientez une minute, puis réessayez.';
      if (/^(?:internal server error|bad gateway|service unavailable)$/i.test(m) || /^5\d\d$/.test(code)) return 'Le service est momentanément indisponible : réessayez dans un instant.';
      if (!m || /^[\x20-\x7e]+$/.test(m) && /\b(?:the|is|not|error|failed|invalid|unexpected|cannot|could)\b/i.test(m)) return 'Une erreur est survenue : réessayez. Si elle persiste, rechargez la page.';
      return m;
    },
    /* Un seul envoi à la fois : l'élément (formulaire ou bouton) est désactivé pendant l'action. */
    async verrouiller(el, action) {
      if (!el || el.dataset.rhOccupe === '1') return undefined;
      el.dataset.rhOccupe = '1';
      const boutons = el.matches && el.matches('form') ? [...el.querySelectorAll('button[type="submit"], button:not([type])')] : [el];
      const avant = boutons.map(b => b.disabled);
      boutons.forEach(b => { b.disabled = true; b.setAttribute('aria-busy', 'true'); });
      try { return await action(); } finally {
        delete el.dataset.rhOccupe;
        boutons.forEach((b, i) => { b.disabled = avant[i]; b.removeAttribute('aria-busy'); });
      }
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
