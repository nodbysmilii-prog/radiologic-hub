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
import { lireCorps, texteBorne } from '../_shared/outils.mjs';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return erreur('Méthode non autorisée.', 405);
  const c: any = await lireCorps(req);
  if (!c) return erreur('Requête invalide.');
  const { agent } = creerAgentServeur();
  try {
    if (c.desinscription !== undefined) {
      const code = texteBorne(c.desinscription, 200);
      return code ? reponse(await agent.desinscrire(code)) : erreur('Lien invalide.');
    }
    const jeton = texteBorne(c.jeton, 100);
    if (!jeton) return erreur('Lien invalide.');
    const motif = c.motif === undefined ? undefined : String(c.motif).slice(0, 500);
    if (c.confirmer) return reponse(await agent.utiliserJeton(jeton, { definitif: !!c.definitif, motif }));
    return reponse(await agent.infosJeton(jeton));
  } catch (e: any) {
    console.error(e);
    return erreur('Erreur interne, réessayez.', 500, 'interne');
  }
});
