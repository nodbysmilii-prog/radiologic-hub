/* =========================================================
   RadiologicHub — Communauté : choix de la source de données
   Supabase si remplacements/config.js est renseigné (même projet et même
   compte que le module Remplacements), sinon démonstration.
   ========================================================= */
(function () {
  'use strict';
  const cfg = window.RH_REMPLACEMENTS_CONFIG || {};
  const R = window.RHRs = window.RHRs || {};
  R.api = cfg.supabaseUrl && cfg.supabaseAnonKey && R.apiSupabase ? R.apiSupabase : R.apiDemo;
})();
