// =====================================================================
// RadiologicHub — fonction « rp-taches » : tâches planifiées de l'agent
// Appelée toutes les 15 minutes par pg_cron (voir supabase/sql/planification.sql)
// avec l'en-tête x-rp-secret. Sélection des nouveaux remplaçants compatibles,
// relances et alertes, expiration, rappels la veille, confirmation de
// réalisation, récapitulatif mensuel ; Communauté : rappel par e-mail des
// messages non lus depuis plus d'une heure.
// =====================================================================
import { CORS, creerAgentServeur, erreur, reponse } from '../_shared/agent.ts';
import { rappelsMessages } from '../_shared/reseau.ts';

const egal = (a: string, b: string) => {
  if (!a || a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (!egal(req.headers.get('x-rp-secret') || '', Deno.env.get('RP_TACHES_SECRET') || '')) return erreur('Accès refusé.', 403);
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
