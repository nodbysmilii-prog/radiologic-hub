/* =========================================================
   RadiologicHub — Remplacements : configuration
   ---------------------------------------------------------
   Laisser vide → MODE DÉMONSTRATION (données fictives dans le navigateur).
   Pour la production, renseigner l'adresse du projet Supabase et sa clé
   publique « anon » (Project Settings → API). Cette clé est faite pour être
   publiée : la sécurité repose sur les droits d'accès par ligne de la base.
   Ne JAMAIS mettre ici la clé « service_role » ni la clé Brevo / Resend :
   elles restent dans les secrets des fonctions Supabase.
   ========================================================= */
window.RH_REMPLACEMENTS_CONFIG = {
  supabaseUrl: '',        // ex. 'https://abcdefghijkl.supabase.co'
  supabaseAnonKey: '',    // clé publique « anon »
};
