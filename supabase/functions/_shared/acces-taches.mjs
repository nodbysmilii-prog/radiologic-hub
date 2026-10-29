// =====================================================================
// RadiologicHub — contrôle d'accès de la fonction rp-taches
// Seule la tâche pg_cron (rp_prive.appeler_taches) connaît le mot de
// passe, rangé dans le coffre-fort Supabase (Vault). rp-taches ne le
// connaît pas : elle demande à la base s'il est juste
// (public.rp_taches_secret_valide, réservée à la clé service_role).
// Tout cas douteux est refusé : méthode autre que POST, en-tête absent ou
// de longueur anormale, clé service_role absente, erreur ou réponse autre
// que « vrai ». Testé par tests/remplacements-taches.test.js.
// =====================================================================

export const LONGUEUR_MIN = 32;
export const LONGUEUR_MAX = 256;

/**
 * @param {{ methode: string, secretRecu: string | null, cleService: string | undefined,
 *           verifier: (candidat: string) => Promise<{ data: unknown, error: unknown }> }} p
 * @returns {Promise<boolean>}
 */
export async function appelTachesAutorise({ methode, secretRecu, cleService, verifier }) {
  if (methode !== 'POST') return false;
  if (typeof secretRecu !== 'string' || secretRecu.length < LONGUEUR_MIN || secretRecu.length > LONGUEUR_MAX) return false;
  if (!cleService) return false;
  try {
    const { data, error } = await verifier(secretRecu);
    return !error && data === true;
  } catch {
    return false;
  }
}
