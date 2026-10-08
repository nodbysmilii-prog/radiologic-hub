/* =========================================================
   RadiologicHub — Remplacements : choix de la source de données
   Supabase si remplacements/config.js est renseigné, sinon démonstration.
   ========================================================= */
(function () {
  'use strict';
  const cfg = window.RH_REMPLACEMENTS_CONFIG || {};
  const R = window.RHRp = window.RHRp || {};
  R.api = cfg.supabaseUrl && cfg.supabaseAnonKey && R.apiSupabase ? R.apiSupabase : R.apiDemo;
})();
