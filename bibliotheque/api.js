/* =========================================================
   RadiologicHub — Bibliothèque : choix de la source de données
   Supabase si remplacements/config.js est renseigné (même projet que
   Remplacements et Communauté), sinon démonstration.
   ========================================================= */
(function () {
  'use strict';
  const cfg = window.RH_REMPLACEMENTS_CONFIG || {};
  const B = window.RHBib = window.RHBib || {};
  B.api = cfg.supabaseUrl && cfg.supabaseAnonKey && B.apiSupabase ? B.apiSupabase : B.apiDemo;
})();
