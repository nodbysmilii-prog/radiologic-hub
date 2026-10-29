// =====================================================================
// RadiologicHub — fonction « rp-taches » : tâches planifiées de l'agent
// Appelée toutes les 15 minutes par pg_cron (voir supabase/sql/planification.sql)
// avec l'en-tête x-rp-secret, vérifié par la base (secret rangé dans le Vault,
// voir _shared/acces-taches.mjs). Sélection des nouveaux remplaçants compatibles,
// relances et alertes, expiration, rappels la veille, confirmation de
// réalisation, récapitulatif mensuel ; Communauté : rappel par e-mail des
// messages non lus depuis plus d'une heure.
// =====================================================================
import { CORS, clientService, creerAgentServeur, erreur, reponse } from '../_shared/agent.ts';
import { rappelsMessages } from '../_shared/reseau.ts';
import { appelTachesAutorise } from '../_shared/acces-taches.mjs';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  const cleService = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const autorise = await appelTachesAutorise({
    methode: req.method,
    secretRecu: req.headers.get('x-rp-secret'),
    cleService,
    verifier: async (candidat: string) => await clientService().rpc('rp_taches_secret_valide', { candidat }),
  });
  if (!autorise) return erreur('Accès refusé.', 403);
  try {
    const { agent, db } = creerAgentServeur();
    const bilan = await agent.taches();
    bilan.rappels_messages = await rappelsMessages(agent, db, (Deno.env.get('RP_URL_SITE') || '').replace(/\/$/, ''));
    return reponse({ ok: true, bilan });
  } catch (e) {
    console.error(e);
    return erreur('Erreur interne.', 500, 'interne');
  }
});
