// =====================================================================
// RadiologicHub — Remplacements : construction de l'agent côté serveur
// Assemble le noyau partagé (copié par scripts/preparer-backend.js), le
// dépôt Supabase et le transport d'e-mails ; outils HTTP communs.
// Variables d'environnement (« supabase secrets set ») :
//   RP_URL_SITE            adresse du site (ex. https://nodbysmilii-prog.github.io/radiologic-hub)
//   RP_SECRET              secret des liens de désinscription (long, aléatoire)
//   RP_ADMIN_EMAILS        e-mails des administrateurs, séparés par des virgules
//   RP_TACHES_SECRET       secret de la tâche planifiée (rp-taches)
//   EMAIL_FOURNISSEUR      brevo | resend | journal
//   BREVO_API_KEY / RESEND_API_KEY
//   EMAIL_EXPEDITEUR, EMAIL_EXPEDITEUR_NOM
// SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY sont fournies
// automatiquement par Supabase.
// =====================================================================
// deno-lint-ignore-file no-explicit-any
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';
import './noyau/referentiel.js';
import './noyau/regles.js';
import './noyau/recap.js';
import './noyau/jetons.js';
import './noyau/gabarits.js';
import './noyau/ics.js';
import './noyau/pdf.js';
import './noyau/contrat.js';
import './noyau/messagerie.js';
import './noyau/moteur.js';
import { MODELES } from './modeles.js';
import { creerDepotSupabase } from './depot-supabase.ts';
import { transportEmail } from './transport.ts';

export const RH = (globalThis as any).RHRemplacements;
const env = (k: string, d = '') => Deno.env.get(k) ?? d;

export const clientService = () => createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } });

export function creerAgentServeur(db = clientService()) {
  const depot = creerDepotSupabase(db);
  const messagerie = RH.messagerie.creerMessagerie({
    charger: async (nom: string) => {
      const m = (MODELES.emails as Record<string, string>)[nom];
      if (m == null) throw new Error(`Modèle d'e-mail introuvable : ${nom}`);
      return m;
    },
    transport: transportEmail(),
    expediteur: { email: env('EMAIL_EXPEDITEUR', 'remplacements@radiologichub.com'), nom: env('EMAIL_EXPEDITEUR_NOM', 'RadiologicHub Remplacements') },
  });
  const agent = RH.moteur.creerAgent({
    depot, notifier: messagerie,
    config: {
      urlSite: env('RP_URL_SITE').replace(/\/$/, ''),
      secret: env('RP_SECRET'),
      modeleContrat: MODELES.contrat,
      emailsAdmin: env('RP_ADMIN_EMAILS').split(',').map(s => s.trim()).filter(Boolean),
    },
  });
  return { agent, depot, db };
}

/* ---------- HTTP ---------- */
export const CORS = {
  'access-control-allow-origin': env('RP_ORIGINE', '*'),
  'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type, x-rp-secret',
  'access-control-allow-methods': 'POST, OPTIONS',
};
export const reponse = (corps: unknown, statut = 200) => new Response(JSON.stringify(corps), { status: statut, headers: { ...CORS, 'content-type': 'application/json; charset=utf-8' } });
export const erreur = (message: string, statut = 400, code = 'invalide') => reponse({ ok: false, erreur: message, code }, statut);

/* Utilisateur connecté (jeton de session envoyé par le site) */
export async function utilisateur(req: Request) {
  const jeton = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!jeton) return null;
  const c = createClient(env('SUPABASE_URL'), env('SUPABASE_ANON_KEY'), { global: { headers: { Authorization: `Bearer ${jeton}` } }, auth: { persistSession: false } });
  const { data, error } = await c.auth.getUser(jeton);
  return error || !data.user ? null : { id: data.user.id, email: (data.user.email || '').toLowerCase() };
}
