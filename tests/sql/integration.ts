// =====================================================================
// Scénario de l'agent sur la vraie base (PostgREST + PostgreSQL), lancé
// par tests/sql/integration.js. Mêmes fichiers que les fonctions serveur.
// =====================================================================
// deno-lint-ignore-file no-explicit-any
import { PostgrestClient } from 'npm:@supabase/postgrest-js@1.16.1';
import { creerDepotSupabase } from '../../supabase/functions/_shared/depot-supabase.ts';
import '../../supabase/functions/_shared/noyau/referentiel.js';
import '../../supabase/functions/_shared/noyau/regles.js';
import '../../supabase/functions/_shared/noyau/recap.js';
import '../../supabase/functions/_shared/noyau/jetons.js';
import '../../supabase/functions/_shared/noyau/gabarits.js';
import '../../supabase/functions/_shared/noyau/ics.js';
import '../../supabase/functions/_shared/noyau/pdf.js';
import '../../supabase/functions/_shared/noyau/contrat.js';
import '../../supabase/functions/_shared/noyau/messagerie.js';
import '../../supabase/functions/_shared/noyau/moteur.js';
import { MODELES } from '../../supabase/functions/_shared/modeles.js';
import { rappelsMessages } from '../../supabase/functions/_shared/reseau.ts';

const RH = (globalThis as any).RHRemplacements;
const ids = JSON.parse(Deno.env.get('RP_IDS') || '{}');
let ok = 0;
const verifier = async (nom: string, f: () => Promise<void>) => { await f(); ok++; console.log(`  ✓ ${nom}`); };
const egal = (a: unknown, b: unknown, m = '') => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${m} : ${JSON.stringify(a)} ≠ ${JSON.stringify(b)}`); };

/* Jeton de la clé de service (comme SUPABASE_SERVICE_ROLE_KEY) */
const b64 = (s: string | Uint8Array) => btoa(typeof s === 'string' ? s : String.fromCharCode(...s)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
async function jwtService(secret: string) {
  const corps = `${b64(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))}.${b64(JSON.stringify({ role: 'service_role', exp: Math.floor(Date.now() / 1000) + 3600 }))}`;
  const cle = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return `${corps}.${b64(new Uint8Array(await crypto.subtle.sign('HMAC', cle, new TextEncoder().encode(corps))))}`;
}

// connexions HTTP non réutilisées : PostgREST ferme les connexions inactives entre deux appels
const client = (Deno as any).createHttpClient({ poolMaxIdlePerHost: 0 });
const db: any = new PostgrestClient(Deno.env.get('RP_PGRST')!, {
  headers: { Authorization: `Bearer ${await jwtService(Deno.env.get('RP_JWT_SECRET')!)}` },
  fetch: (u: any, init: any) => fetch(u, { ...init, client }),
});
const depot = creerDepotSupabase(db);
let t = new Date('2026-10-08T08:00:00Z');
const envois: any[] = [];
const messagerie = RH.messagerie.creerMessagerie({ charger: async (n: string) => (MODELES.emails as any)[n], transport: async (m: any) => { envois.push(m); return { ok: true, id: `m${envois.length}` }; } });
const agent = RH.moteur.creerAgent({ depot, notifier: messagerie, horloge: () => t, config: { urlSite: 'https://exemple.tn', secret: 'secret', modeleContrat: MODELES.contrat, emailsAdmin: ['admin@exemple.tn'] } });
const dernier = (email: string, modele: string) => envois.filter(m => m.a.email === email && m.modele === modele).slice(-1)[0];
const jeton = (m: any, libelle: string) => {
  const l = [...m.html.matchAll(/<a href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)].find(x => x[2].replace(/<[^>]+>/g, '').trim().startsWith(libelle));
  if (!l) throw new Error(`lien « ${libelle} » absent`);
  return decodeURIComponent(/[?&]j=([^&"]+)/.exec(l[1])![1]);
};
const lire = async (table: string, id: string) => (await db.from(table).select('*').eq('id', id).single()).data;

console.log("Agent sur PostgreSQL + PostgREST (dépôt Supabase) :");
try {
  let A: any;
  await verifier('publication : seuls les spécialistes compatibles sont contactés (base réelle)', async () => {
    A = await agent.creerDemande(ids.S1, { dates: ['2026-10-15', '2026-10-16'], heure_debut: '08:00', heure_fin: '16:00', type: 'journee', modalites: ['scanner'], profil: 'specialiste', honoraires: 450, unite: 'jour', logement: true }, { role: 'structure', profil_id: ids.M1 });
    egal(A.envoyees, 2, 'propositions');
    egal(A.demande.dates, ['2026-10-15', '2026-10-16'], 'tableau de dates');
    const props = (await db.from('rp_propositions').select('remplacant_id').eq('demande_id', A.demande.id)).data.map((p: any) => p.remplacant_id).sort();
    egal(props, [ids.R1, ids.R2].sort(), 'R3 (résident) exclu');
    egal((await db.from('rp_jetons').select('hash', { count: 'exact', head: true })).count, 4, 'deux liens par proposition, empreintes seulement');
  });
  await verifier('réponse par lien : usage unique, garanti par la base', async () => {
    const j = jeton(dernier('r1@exemple.tn', 'proposition'), 'Je suis disponible');
    egal((await agent.infosJeton(j)).valide, true);
    const [a, b] = await Promise.all([agent.utiliserJeton(j), agent.utiliserJeton(j)]);
    egal([a.ok, b.ok].filter(Boolean).length, 1, 'un seul usage même en double clic simultané');
    egal((await db.from('rp_propositions').select('etat').eq('demande_id', A.demande.id).eq('remplacant_id', ids.R1).single()).data.etat, 'interesse');
  });
  await verifier('choix en un clic, confirmations (.ics + contrat PDF), journal des e-mails', async () => {
    const r = await agent.utiliserJeton(jeton(dernier('contact@orangers-fictive.tn', 'interesse'), 'Choisir'));
    egal(r.ok, true, 'choix');
    const d = await lire('rp_demandes', A.demande.id);
    egal([d.etat, d.remplacant_id, d.attribution], ['pourvue', ids.R1, 'manuelle']);
    const conf = dernier('r1@exemple.tn', 'confirmation-remplacant');
    egal(conf.pieces_jointes.map((p: any) => p.type), ['text/calendar', 'application/pdf']);
    const journal = (await db.from('rp_emails').select('statut, modele')).data;
    egal(journal.every((e: any) => e.statut === 'envoye'), true, 'e-mails journalisés');
  });
  await verifier('annulation par le remplaçant : remise en ligne, R2 recontacté, R1 exclu', async () => {
    const r = await agent.utiliserJeton(jeton(dernier('r1@exemple.tn', 'confirmation-remplacant'), 'Annuler'));
    egal(r.remise, true);
    const d = await lire('rp_demandes', A.demande.id);
    egal([d.etat, d.remplacant_id, d.exclus], ['publiee', null, [ids.R1]]);
    const m = dernier('r2@exemple.tn', 'proposition');
    egal(/^De nouveau disponible/.test(m.objet), true, 'proposition de remise en ligne');
  });
  await verifier('attribution concurrente : un seul remplaçant retenu (mise à jour conditionnelle)', async () => {
    await agent.utiliserJeton(jeton(dernier('r2@exemple.tn', 'proposition'), 'Je suis disponible'));
    // R3 n'est pas compatible ; on simule une seconde réponse concurrente avec R2 lui-même
    const [a, b] = await Promise.all([agent.choisir(A.demande.id, ids.R2, { role: 'structure' }), agent.choisir(A.demande.id, ids.R2, { role: 'structure' })]);
    egal([a.ok, b.ok].filter(Boolean).length, 1);
    egal((await lire('rp_demandes', A.demande.id)).remplacant_id, ids.R2);
  });
  await verifier('tâches planifiées : rappel la veille, réalisation, récapitulatif mensuel (une seule fois)', async () => {
    t = new Date('2026-10-14T17:05:00Z');                     // 14/10 18 h 05 à Tunis
    egal((await agent.taches()).rappels, 1, 'rappel');
    t = new Date('2026-10-16T18:30:00Z');
    egal((await agent.taches()).realisations, 1, 'demande de réalisation');
    await agent.utiliserJeton(jeton(dernier('r2@exemple.tn', 'realisation'), 'Oui'));
    egal((await lire('rp_demandes', A.demande.id)).etat, 'realisee');
    t = new Date('2026-11-01T08:00:00Z');
    egal((await agent.taches()).recaps, 2, 'R2 et la clinique');
    egal((await agent.taches()).recaps, 0, 'pas de doublon');
    egal(/900 TND/.test(dernier('r2@exemple.tn', 'recap-mensuel').html), true, 'honoraires du mois');
  });
  await verifier('journal des actions horodaté en base', async () => {
    const actions = new Set((await db.from('rp_journal').select('action')).data.map((e: any) => e.action));
    for (const a of ['publication', 'selection', 'reponse_disponible', 'choix', 'annulation', 'remise_en_ligne', 'rappel', 'realisation', 'recap_mensuel']) egal(actions.has(a), true, a);
  });
  await verifier('Communauté : rappel e-mail d\'un message non lu, une seule fois, sans son contenu', async () => {
    for (const [id, prenom] of [[ids.R1, 'Un'], [ids.R2, 'Deux']]) await db.from('rs_membres').upsert({ id, prenom, nom: 'TEST', statut: 'specialiste' });
    const c = (await db.from('rs_conversations').insert({}).select('id').single()).data.id;
    const p = await db.from('rs_participants').insert([{ conversation_id: c, membre_id: ids.R1, lu_le: new Date(Date.now() - 3 * 3600e3).toISOString() }, { conversation_id: c, membre_id: ids.R2, lu_le: new Date().toISOString() }]);
    egal(p.error, null, 'participants');
    await db.from('rs_messages').insert({ conversation_id: c, auteur_id: ids.R2, texte: 'Contenu fictif confidentiel', cree_le: new Date(Date.now() - 2 * 3600e3).toISOString() });
    egal(await rappelsMessages(agent, db, 'https://exemple.tn'), 1, 'un rappel');
    const m = dernier('r1@exemple.tn', 'message-non-lu');
    egal(m.objet, 'Deux TEST vous a écrit — Communauté RadiologicHub', 'objet');
    egal(/communaute\.html#\/messages/.test(m.html) && !/Contenu fictif/.test(m.html), true, 'lien vers la messagerie, sans le contenu');
    egal(/Ne plus recevoir/.test(m.html), true, 'lien de désinscription');
    egal(await rappelsMessages(agent, db, 'https://exemple.tn'), 0, 'pas de second rappel');
  });
  await verifier('désinscription signée, enregistrée en base', async () => {
    const lien = [...dernier('r3@exemple.tn', 'recap-mensuel')?.html.matchAll(/href="([^"]+)"/g) ?? []].map(x => x[1]).find(u => u.includes('d=')) ||
      [...envois.filter(m => m.a.email === 'r2@exemple.tn').slice(-1)[0].html.matchAll(/href="([^"]+)"/g)].map(x => x[1]).find(u => u.includes('d='));
    egal((await agent.desinscrire(decodeURIComponent(/[?&]d=([^&]+)/.exec(lien!)![1]))).ok, true);
    egal((await lire('profils', ids.R2)).desinscrit, true);
  });
  console.log(`\n# pass ${ok}\n# fail 0`);
} catch (e) {
  console.error(`✗ ${(e as Error).message}`);
  console.log(`\n# pass ${ok}\n# fail 1`);
  Deno.exit(1);
}
