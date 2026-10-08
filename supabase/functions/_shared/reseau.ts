// =====================================================================
// RadiologicHub — Communauté : rappels par e-mail des messages non lus
// La base choisit les destinataires (rs_rappels_messages : messages non lus
// depuis plus d'une heure, rappels activés, pas de désinscription) et note
// l'envoi pour ne pas répéter le rappel ; l'e-mail passe par l'agent
// (journal des e-mails, lien de désinscription). Le contenu des messages
// n'est jamais recopié dans l'e-mail.
// =====================================================================
// deno-lint-ignore-file no-explicit-any
export async function rappelsMessages(agent: any, db: any, urlSite: string): Promise<number> {
  const { data, error } = await db.rpc('rs_rappels_messages');
  if (error) { console.error('rs_rappels_messages', error.message); return 0; }
  let n = 0;
  for (const r of data || []) {
    const res = await agent.envoyerCourriel({
      email: r.email, nom: r.prenom, profil_id: r.membre_id, modele: 'message-non-lu', categorie: 'information',
      donnees: { prenom: r.prenom, nombre: r.non_lus, pluriel: r.non_lus > 1, de: r.de, lien_messages: `${urlSite}/communaute.html#/messages` },
    });
    if (res && res.ok) n++;
  }
  return n;
}
