// =====================================================================
// RadiologicHub — fonction « cr-ia » : assistant IA de rédaction
// POST { modele, notes, indication, technique, anterieur, pdl, sexe,
//        toutNormal, titreModele, images: [{ type, donnees (base64) }] }
// avec le jeton de session (Authorization: Bearer …).
// Réservée aux e-mails de IA_EMAILS. La clé Anthropic ne quitte jamais
// le serveur. Les notes et les images ne sont ni enregistrées ni
// journalisées.
// Secrets (« supabase secrets set ») :
//   ANTHROPIC_API_KEY   clé API (console.anthropic.com)
//   IA_EMAILS           e-mails autorisés, séparés par des virgules
//   IA_MODELE           facultatif (défaut : claude-sonnet-5-5)
// =====================================================================
// deno-lint-ignore-file no-explicit-any
import { CORS, erreur, reponse, utilisateur } from '../_shared/agent.ts';
import '../_shared/noyau-ia/consigne.js';

const IA = (globalThis as any).RHAssistantIA;
const env = (k: string, d = '') => Deno.env.get(k) ?? d;
const TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const TAILLE_MAX = 2_500_000; // caractères base64 par image (≈ 1,8 Mo)

const autorises = () => env('IA_EMAILS').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return erreur('Méthode non autorisée.', 405);
  const u = await utilisateur(req);
  if (!u) return erreur('Connexion requise.', 401, 'connexion');
  if (!autorises().includes(u.email)) return erreur('Ce compte n\'a pas accès à l\'assistant IA.', 403, 'acces');
  const cle = env('ANTHROPIC_API_KEY');
  if (!cle) return erreur('Assistant non configuré : clé API absente.', 500, 'config');

  const d: any = await req.json().catch(() => null);
  const probleme = IA.verifierDemande(d);
  if (probleme) return erreur(probleme);
  const images = Array.isArray(d.images) ? d.images : [];
  if (images.length > IA.LIMITES.images) return erreur(`${IA.LIMITES.images} images au plus.`);
  for (const im of images) {
    if (!im || !TYPES.includes(im.type) || typeof im.donnees !== 'string' || !im.donnees || im.donnees.length > TAILLE_MAX || !/^[A-Za-z0-9+/=]+$/.test(im.donnees)) {
      return erreur('Image invalide ou trop lourde.');
    }
  }

  const consigne = IA.construireConsigne({ ...d, nbImages: images.length });
  const contenu = [
    ...images.map((im: any) => ({ type: 'image', source: { type: 'base64', media_type: im.type, data: im.donnees } })),
    { type: 'text', text: consigne },
  ];

  let r: Response;
  try {
    r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': cle, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: env('IA_MODELE', 'claude-sonnet-5-5'), max_tokens: 4000, messages: [{ role: 'user', content: contenu }] }),
    });
  } catch (_e) {
    return erreur('Service d\'IA injoignable, réessayez.', 502, 'ia');
  }
  if (!r.ok) {
    const detail = await r.text().catch(() => '');
    console.error('Anthropic', r.status, detail.slice(0, 300));   // message d'erreur seulement, jamais les notes
    if (r.status === 429 || r.status === 529) return erreur('Service d\'IA saturé : réessayez dans une minute.', 429, 'limite');
    if (r.status === 401 || r.status === 403) return erreur('Clé API refusée : vérifiez le secret ANTHROPIC_API_KEY.', 500, 'config');
    if (r.status === 400 && /credit|billing/i.test(detail)) return erreur('Crédit API épuisé : rechargez le compte sur console.anthropic.com.', 402, 'credit');
    return erreur('Le service d\'IA n\'a pas pu répondre, réessayez.', 502, 'ia');
  }
  const j: any = await r.json();
  const texte = (j.content || []).filter((b: any) => b.type === 'text').map((b: any) => b.text).join('');
  if (!texte.trim()) return erreur('Réponse vide, simplifiez les notes et réessayez.', 502, 'ia');
  return reponse({ ok: true, ...IA.lireReponse(texte), tronque: j.stop_reason === 'max_tokens', modele: j.model });
});
