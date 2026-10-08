// =====================================================================
// RadiologicHub — Remplacements : dépôt de données Supabase
// Même interface que remplacements/noyau/depot-memoire.js (utilisé par
// les tests) : l'agent (noyau/moteur.js) ne voit pas la différence.
// S'utilise avec la clé de service (les droits par ligne ne s'appliquent
// pas ici : chaque fonction serveur vérifie elle-même qui agit).
// =====================================================================
// deno-lint-ignore-file no-explicit-any
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.45.4';

const ok = <T>(r: { data: T; error: any }): T => {
  if (r.error) throw new Error(`Base de données : ${r.error.message}`);
  return r.data;
};
const AVEC_PROFIL = '*, profil:profils(*)';

export function creerDepotSupabase(db: SupabaseClient) {
  const t = (nom: string) => db.from(nom);
  const get = async (table: string, id: string, champs = '*') => ok(await t(table).select(champs).eq('id', id).maybeSingle());
  const maj = (table: string) => async (id: string, patch: Record<string, unknown>, o: { siEtat?: string } = {}) => {
    let q: any = t(table).update(patch).eq('id', id);
    if (o.siEtat) q = q.eq('etat', o.siEtat);                       // mise à jour conditionnelle (concurrence)
    return ok(await q.select().maybeSingle());
  };

  return {
    profils: {
      get: (id: string) => get('profils', id),
      maj: maj('profils'),
    },
    remplacants: {
      get: (id: string) => get('rp_remplacants', id, AVEC_PROFIL),
      valides: async () => ok(await t('rp_remplacants').select(AVEC_PROFIL).eq('etat', 'valide')),
      maj: maj('rp_remplacants'),
    },
    structures: {
      get: (id: string) => get('rp_structures', id),
      maj: maj('rp_structures'),
    },
    membres: {
      parStructure: async (id: string) => ok(await t('rp_membres').select('*').eq('structure_id', id)),
    },
    favoris: {
      parStructure: async (id: string) => (ok(await t('rp_favoris').select('remplacant_id').eq('structure_id', id)) as any[]).map(f => f.remplacant_id),
    },
    disponibilites: {
      // filtre par dates en base, puis par remplaçant ici (évite des URL trop longues)
      pour: async (ids: string[], dates: string[]) => {
        const set = new Set(ids);
        return (ok(await t('rp_disponibilites').select('*').in('date', dates)) as any[]).filter(x => set.has(x.remplacant_id));
      },
    },
    demandes: {
      get: (id: string) => get('rp_demandes', id),
      ajouter: async (d: Record<string, unknown>) => ok(await t('rp_demandes').insert(d).select().single()),
      maj: maj('rp_demandes'),
      parEtat: async (etats: string[]) => ok(await t('rp_demandes').select('*').in('etat', etats)),
      confirmeesPour: async (ids: string[]) => {
        const set = new Set(ids);
        return (ok(await t('rp_demandes').select('*').eq('etat', 'pourvue')) as any[]).filter(d => set.has(d.remplacant_id));
      },
    },
    propositions: {
      get: (id: string) => get('rp_propositions', id),
      parDemande: async (id: string) => ok(await t('rp_propositions').select('*').eq('demande_id', id)),
      ajouter: async (p: Record<string, unknown>) => ok(await t('rp_propositions').insert(p).select().single()),
      maj: maj('rp_propositions'),
    },
    jetons: {
      ajouter: async (j: Record<string, unknown>) => ok(await t('rp_jetons').insert(j).select().single()),
      get: async (hash: string) => ok(await t('rp_jetons').select('*').eq('hash', hash).maybeSingle()),
      // usage unique : la mise à jour ne réussit que si le jeton n'a pas encore servi
      consommer: async (hash: string, quand: string) => {
        const r = ok(await t('rp_jetons').update({ utilise_le: quand }).eq('hash', hash).is('utilise_le', null).select('hash')) as any[];
        return r.length === 1;
      },
      invalider: async ({ proposition_id, demande_id, actions, quand }: { proposition_id?: string; demande_id?: string; actions?: string[]; quand?: string }) => {
        let q: any = t('rp_jetons').update({ utilise_le: quand || new Date().toISOString() }).is('utilise_le', null);
        if (proposition_id) q = q.eq('proposition_id', proposition_id);
        if (demande_id) q = q.eq('demande_id', demande_id);
        if (actions) q = q.in('action', actions);
        ok(await q);
      },
    },
    journal: {
      ajouter: async (e: Record<string, unknown>) => { ok(await t('rp_journal').insert(e)); },
      existe: async (action: string, objet_id: string) => {
        const r = await t('rp_journal').select('id', { count: 'exact', head: true }).eq('action', action).eq('objet_id', objet_id);
        if (r.error) throw new Error(r.error.message);
        return (r.count || 0) > 0;
      },
    },
    emails: {
      ajouter: async (e: Record<string, unknown>) => (ok(await t('rp_emails').insert(e).select('id').single()) as any).id,
      maj: maj('rp_emails'),
    },
  };
}
