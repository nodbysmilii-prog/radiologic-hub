// =====================================================================
// RadiologicHub — Remplacements : envoi réel des messages
// Fournisseur choisi par la variable d'environnement EMAIL_FOURNISSEUR :
//   brevo  (clé BREVO_API_KEY)  — 300 e-mails / jour gratuits
//   resend (clé RESEND_API_KEY) — 3 000 e-mails / mois gratuits
//   journal                     — n'envoie rien, écrit dans les journaux (essais)
// Les clés ne sont jamais dans le code : « supabase secrets set … ».
// Pour ajouter WhatsApp ou SMS : écrire un autre transport avec la même
// signature et l'appeler selon les préférences du destinataire.
// =====================================================================

export type Message = {
  de: { email: string; nom: string };
  a: { email: string; nom?: string };
  objet: string;
  html: string;
  texte: string;
  pieces_jointes?: { nom: string; type: string; contenu: string }[];   // contenu en base64
  modele?: string;
};
export type Resultat = { ok: boolean; id?: string; erreur?: string };

async function brevo(m: Message): Promise<Resultat> {
  const r = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': Deno.env.get('BREVO_API_KEY') ?? '', 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      sender: { email: m.de.email, name: m.de.nom },
      to: [{ email: m.a.email, name: m.a.nom || undefined }],
      subject: m.objet, htmlContent: m.html, textContent: m.texte,
      attachment: m.pieces_jointes?.length ? m.pieces_jointes.map(p => ({ name: p.nom, content: p.contenu })) : undefined,
      tags: m.modele ? ['remplacements', m.modele] : ['remplacements'],
    }),
  });
  const corps = await r.json().catch(() => ({}));
  return r.ok ? { ok: true, id: corps.messageId } : { ok: false, erreur: `Brevo ${r.status} : ${corps.message || ''}` };
}

async function resend(m: Message): Promise<Resultat> {
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${Deno.env.get('RESEND_API_KEY') ?? ''}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      from: `${m.de.nom} <${m.de.email}>`, to: [m.a.email], subject: m.objet, html: m.html, text: m.texte,
      attachments: m.pieces_jointes?.map(p => ({ filename: p.nom, content: p.contenu })),
    }),
  });
  const corps = await r.json().catch(() => ({}));
  return r.ok ? { ok: true, id: corps.id } : { ok: false, erreur: `Resend ${r.status} : ${corps.message || ''}` };
}

export function transportEmail(): (m: Message) => Promise<Resultat> {
  const f = (Deno.env.get('EMAIL_FOURNISSEUR') || 'journal').toLowerCase();
  if (f === 'brevo') return brevo;
  if (f === 'resend') return resend;
  return async (m: Message) => { console.log(`[e-mail non envoyé] ${m.a.email} — ${m.objet}`); return { ok: true, id: 'journal' }; };
}
