/* =========================================================
   RadiologicHub — Assistant IA : configuration
   ---------------------------------------------------------
   Même projet Supabase que les autres modules. Laisser vide pour
   reprendre l'adresse et la clé de remplacements/config.js ; si les
   deux sont vides → MODE DÉMONSTRATION (réponse d'exemple, aucun appel).
   Seules l'adresse du projet et la clé publique « anon » vont ici :
   la clé Anthropic (ANTHROPIC_API_KEY) et la liste des e-mails autorisés
   (IA_EMAILS) restent dans les secrets des fonctions Supabase.
   Voir assistant-ia/INSTALLATION.md.
   ========================================================= */
window.RH_IA_CONFIG = {
  supabaseUrl: '',        // ex. 'https://abcdefghijkl.supabase.co'
  supabaseAnonKey: '',    // clé publique « anon »
};
