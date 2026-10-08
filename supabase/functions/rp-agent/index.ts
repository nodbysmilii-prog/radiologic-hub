// =====================================================================
// RadiologicHub — fonction « rp-agent » : actions des utilisateurs connectés
// POST { action, … } avec le jeton de session (Authorization: Bearer …).
// Chaque action vérifie qui agit avant d'appeler l'agent.
// =====================================================================
// deno-lint-ignore-file no-explicit-any
import { CORS, creerAgentServeur, erreur, reponse, utilisateur } from '../_shared/agent.ts';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return erreur('Méthode non autorisée.', 405);
  const u = await utilisateur(req);
  if (!u) return erreur('Connexion requise.', 401, 'connexion');
  const { agent, db } = creerAgentServeur();
  const c: any = await req.json().catch(() => ({}));

  const estAdmin = async () => ((await db.from('rp_admins').select('email')).data || []).some((a: any) => a.email.toLowerCase() === u.email);
  const estMembre = async (sid: string) => !!(await db.from('rp_membres').select('profil_id').eq('structure_id', sid).eq('profil_id', u.id).maybeSingle()).data;
  const demande = async (id: string) => (await db.from('rp_demandes').select('*').eq('id', id).maybeSingle()).data as any;
  const acteur = (role: string) => ({ role, profil_id: u.id });
  const refus = () => erreur('Accès refusé.', 403, 'acces');

  try {
    switch (c.action) {
      case 'publier': {
        if (!(await estMembre(c.structure_id))) return refus();
        const r = await agent.creerDemande(c.structure_id, c.demande || {}, acteur('structure'));
        return reponse({ ok: true, demande_id: r.demande.id, envoyees: r.envoyees });
      }
      case 'choisir': {
        const d = await demande(c.demande_id);
        if (!d || !(await estMembre(d.structure_id))) return refus();
        return reponse(await agent.choisir(d.id, c.remplacant_id, acteur('structure')));
      }
      case 'annuler': {
        const d = await demande(c.demande_id);
        if (!d) return refus();
        if (d.remplacant_id === u.id) return reponse(await agent.annuler(d.id, 'remplacant', acteur('remplacant'), { motif: c.motif }));
        if (await estMembre(d.structure_id)) return reponse(await agent.annuler(d.id, 'structure', acteur('structure'), { definitif: !!c.definitif, motif: c.motif }));
        return refus();
      }
      case 'retirer': {
        const d = await demande(c.demande_id);
        if (!d || !(await estMembre(d.structure_id))) return refus();
        return reponse(await agent.cloturer(d.id, acteur('structure'), c.motif));
      }
      case 'repondre': {
        const p = (await db.from('rp_propositions').select('*').eq('id', c.proposition_id).maybeSingle()).data as any;
        if (!p || p.remplacant_id !== u.id) return refus();
        return reponse(await agent.repondre(p.id, c.reponse === 'disponible' ? 'disponible' : 'indisponible', acteur('remplacant')));
      }
      case 'realisation': {
        const d = await demande(c.demande_id);
        if (!d) return refus();
        const partie = d.remplacant_id === u.id ? 'remplacant' : (await estMembre(d.structure_id)) ? 'structure' : null;
        if (!partie) return refus();
        return reponse(await agent.confirmerRealisation(d.id, partie, !!c.oui, acteur(partie)));
      }
      case 'inscription': {
        const permis = c.type === 'remplacant' ? c.id === u.id : c.type === 'structure' && (await estMembre(c.id));
        if (!permis) return refus();
        return reponse(await agent.inscriptionRecue(c.type, c.id));
      }
      case 'valider': case 'refuser': case 'suspendre': case 'taches': {
        if (!(await estAdmin())) return refus();
        if (c.action === 'valider') return reponse(await agent.validerInscription(c.type, c.id, acteur('admin')));
        if (c.action === 'refuser') return reponse(await agent.refuserInscription(c.type, c.id, c.motif, acteur('admin')));
        if (c.action === 'taches') return reponse({ ok: true, bilan: await agent.taches() });
        const table = c.type === 'remplacant' ? 'rp_remplacants' : 'rp_structures';
        await db.from(table).update({ etat: 'suspendu' }).eq('id', c.id);
        await db.from('rp_journal').insert({ action: 'suspension', acteur_id: u.id, acteur_role: 'admin', objet_type: c.type, objet_id: c.id, details: { motif: c.motif || '' } });
        return reponse({ ok: true });
      }
      default:
        return erreur('Action inconnue.');
    }
  } catch (e: any) {
    if (e && e.code) return erreur(e.message, 400, e.code);
    console.error(e);
    return erreur('Erreur interne, réessayez.', 500, 'interne');
  }
});
