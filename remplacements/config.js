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
  supabaseUrl: 'https://wdbczcwnaxfnoioyukgr.supabase.co',
  supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndkYmN6Y3duYXhmbm9pb3l1a2dyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE4MDA1NzQsImV4cCI6MjEwNzM3NjU3NH0.u2WgvpcPReDSHDQWggIxsTQvuGoZPUP91eWnUbQUNrY', // clé publique « anon »
};
