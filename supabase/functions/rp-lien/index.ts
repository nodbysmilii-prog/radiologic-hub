// =====================================================================
// RadiologicHub — fonction « rp-lien » : boutons des e-mails, sans connexion
// POST { jeton }                         → ce que propose le lien (sans le consommer)
// POST { jeton, confirmer: true, … }     → applique la réponse (usage unique)
// POST { desinscription: code }          → ne plus recevoir de propositions
// La page remplacements-reponse.html affiche d'abord un bouton de
// confirmation : les antivirus qui ouvrent les liens ne déclenchent rien.
// =====================================================================
// deno-lint-ignore-file no-explicit-any
import { CORS, creerAgentServeur, erreur, reponse } from '../_shared/agent.ts';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return erreur('Méthode non autorisée.', 405);
  const c: any = await req.json().catch(() => ({}));
  const { agent } = creerAgentServeur();
  try {
    if (c.desinscription) return reponse(await agent.desinscrire(String(c.desinscription)));
    if (!c.jeton || String(c.jeton).length > 100) return erreur('Lien invalide.');
    if (c.confirmer) return reponse(await agent.utiliserJeton(String(c.jeton), { definitif: !!c.definitif, motif: c.motif }));
    return reponse(await agent.infosJeton(String(c.jeton)));
  } catch (e: any) {
    console.error(e);
    return erreur('Erreur interne, réessayez.', 500, 'interne');
  }
});
