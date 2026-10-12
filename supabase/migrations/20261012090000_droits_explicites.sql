-- =====================================================================
-- RadiologicHub — droits explicites (exposition automatique désactivée)
-- ---------------------------------------------------------------------
-- Le projet Supabase n'expose plus automatiquement les nouvelles tables
-- et fonctions : rien n'est accessible aux rôles anon / authenticated
-- sans GRANT explicite, en plus des règles d'accès par ligne (RLS).
--
-- Les tables des modules Remplacements et Communauté reçoivent déjà
-- leurs droits dans leurs migrations. Il manquait le droit d'exécuter
-- les fonctions appelées DANS les règles d'accès : une règle s'évalue
-- avec les droits de l'utilisateur connecté, qui doit donc pouvoir
-- exécuter ces fonctions (sinon : « permission denied for function »).
-- Ces fonctions sont en SECURITY DEFINER et ne renvoient qu'un booléen
-- ou l'identifiant de l'interlocuteur d'une conversation à laquelle on
-- participe : elles ne dévoilent aucune donnée.
--
-- La liste complète des droits est vérifiée par tests/sql/droits.js
-- (référence : tests/sql/droits-attendus.txt).
-- =====================================================================

grant execute on function
  public.rp_a_recu(uuid),
  public.rp_a_recu_de(uuid),
  public.rp_est_membre(uuid),
  public.rp_est_responsable(uuid),
  public.rp_membre_meme_structure(uuid),
  public.rp_voit_remplacant(uuid),
  public.rs_autre(uuid),
  public.rs_bloque(uuid, uuid),
  public.rs_participe(uuid),
  public.rs_participe_dossier(text)
to authenticated;
