/* =========================================================
   RadiologicHub — Communauté : accès à Supabase (production)
   ---------------------------------------------------------
   Connexion « Continuer avec Google » ou lien magique par e-mail (même
   compte que le module Remplacements). Lectures et écritures soumises
   aux droits d'accès par ligne (supabase/migrations/…_reseau.sql) ;
   messages et notifications en temps réel (Supabase Realtime) ;
   images des cas et des messages dans des stockages privés (adresses
   signées), photos de profil dans un stockage public.
   Configuration : remplacements/config.js. Même interface que api-demo.js.
   ========================================================= */
(function () {
  'use strict';
  const cfg = window.RH_REMPLACEMENTS_CONFIG || {};
  let sb = null, demarrage = null, moi = null;
  const urlsSignees = new Map();                               // chemin → { url, expire }

  const charger = () => new Promise((resolve, reject) => {
    if (window.supabase) return resolve();
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js';
    s.onload = resolve; s.onerror = () => reject(new Error('Bibliothèque Supabase injoignable.'));
    document.head.appendChild(s);
  });
  const ok = r => { if (r.error) throw new Error(r.error.message); return r.data; };
  const retour = () => `${location.origin}${location.pathname.replace(/[^/]*$/, '')}communaute.html`;
  const uid = async () => { if (moi) return moi; const { data } = await sb.auth.getSession(); moi = data.session ? data.session.user.id : null; return moi; };
  const nouvelId = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(36).slice(2));
  const MEMBRE = 'id, prenom, nom, titre, statut, annee, etablissement, ville, gouvernorat, bio, interets, photo, verifie, verifie_le, verification_demandee_le, suspendu, emails_messages, cree_le';
  const nettoyerRecherche = q => String(q || '').replace(/[%,().*\\]/g, ' ').trim();

  async function signer(bucket, chemins) {
    const maintenant = Date.now(), manquants = [...new Set(chemins.filter(c => c && !/^(https?:|data:)/.test(c) && !((urlsSignees.get(bucket + c) || {}).expire > maintenant + 60e3)))];
    if (manquants.length) {
      const r = ok(await sb.storage.from(bucket).createSignedUrls(manquants, 3600));
      r.forEach(x => { if (x.signedUrl) urlsSignees.set(bucket + x.path, { url: x.signedUrl, expire: maintenant + 3600e3 }); });
    }
    return chemins.map(c => (!c ? null : /^(https?:|data:)/.test(c) ? c : (urlsSignees.get(bucket + c) || {}).url || null));
  }
  async function televerser(bucket, chemin, blob) {
    ok(await sb.storage.from(bucket).upload(chemin, blob, { contentType: blob.type || 'image/jpeg', upsert: false }));
    return chemin;
  }
  async function enrichir(liste) {
    const me = await uid();
    if (!liste.length) return [];
    const ids = liste.map(c => c.id);
    const [j, e] = await Promise.all([
      sb.from('rs_jaime').select('cas_id').eq('membre_id', me).in('cas_id', ids),
      sb.from('rs_enregistres').select('cas_id').eq('membre_id', me).in('cas_id', ids),
    ]);
    const J = new Set(ok(j).map(x => x.cas_id)), E = new Set(ok(e).map(x => x.cas_id));
    return liste.map(c => ({ ...c, jaime: J.has(c.id), enregistre: E.has(c.id) }));
  }

  const api = {
    mode: 'supabase',
    get pret() {
      return demarrage || (demarrage = charger().then(() => {
        sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, { auth: { persistSession: true, detectSessionInUrl: true } });
        sb.auth.onAuthStateChange((_e, s) => { moi = s ? s.user.id : null; });
      }));
    },

    /* ---------- Session ---------- */
    async session() {
      const { data } = await sb.auth.getSession();
      if (!data.session) return null;
      const u = data.session.user; moi = u.id;
      const [c, m, adm, rv] = await Promise.all([
        sb.from('profils').select('*').eq('id', u.id).maybeSingle(),
        sb.from('rs_membres').select(MEMBRE).eq('id', u.id).maybeSingle(),
        sb.rpc('rp_est_admin'),
        sb.rpc('rs_remplacant_valide', { uid: u.id }),
      ]);
      const meta = u.user_metadata || {};
      return { compte: { ...(ok(c) || { id: u.id, email: u.email }), photoGoogle: meta.avatar_url || meta.picture || null }, membre: ok(m), admin: !!adm.data, remplacantValide: !!rv.data };
    },
    async connexionGoogle() {
      ok(await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: retour() } }));
      return { ok: true, redirection: true };
    },
    async connexionEmail(email) {
      ok(await sb.auth.signInWithOtp({ email: String(email).trim(), options: { emailRedirectTo: retour(), shouldCreateUser: true } }));
      return { ok: true, lienEnvoye: true };
    },
    async deconnexion() { await sb.auth.signOut(); moi = null; },

    /* ---------- Profil ---------- */
    async creerProfil(d) {
      const id = await uid();
      ok(await sb.from('profils').update({ prenom: d.prenom.trim(), nom: d.nom.trim(), telephone: d.telephone.trim(), consentement_le: new Date().toISOString() }).eq('id', id));
      ok(await sb.from('rs_membres').insert({ id, prenom: d.prenom.trim(), nom: d.nom.trim(), titre: d.titre || '', statut: d.statut, annee: d.statut === 'resident' ? Number(d.annee) : null, etablissement: d.etablissement || '', ville: d.ville || '', gouvernorat: d.gouvernorat || '', bio: d.bio || '', interets: d.interets || [], photo: d.photo || null }));
      return { ok: true };
    },
    async majProfil(d) {
      const id = await uid();
      const champs = {};
      ['prenom', 'nom', 'titre', 'statut', 'etablissement', 'ville', 'gouvernorat', 'bio', 'interets', 'emails_messages'].forEach(k => { if (k in d) champs[k] = d[k]; });
      if ('statut' in d) champs.annee = d.statut === 'resident' ? Number(d.annee) : null;
      if ('telephone' in d) ok(await sb.from('profils').update({ telephone: d.telephone }).eq('id', id));
      return ok(await sb.from('rs_membres').update(champs).eq('id', id).select(MEMBRE).single());
    },
    async envoyerPhoto(blob) {
      const id = await uid();
      const chemin = await televerser('avatars', `${id}/${nouvelId()}.jpg`, blob);
      const ancien = ok(await sb.from('rs_membres').select('photo').eq('id', id).single()).photo;
      ok(await sb.from('rs_membres').update({ photo: chemin }).eq('id', id));
      if (ancien && !/^https?:/.test(ancien)) await sb.storage.from('avatars').remove([ancien]);
      return api.urlPhoto({ photo: chemin });
    },
    urlPhoto: m => (!m || !m.photo ? null : /^https?:/.test(m.photo) ? m.photo : sb.storage.from('avatars').getPublicUrl(m.photo).data.publicUrl),
    async demanderVerification(fichier) {
      const id = await uid();
      let justificatif = null;
      if (fichier) justificatif = await televerser('justificatifs', `${id}/verification-${Date.now()}${(/\.[a-z0-9]{1,5}$/i.exec(fichier.name) || [''])[0].toLowerCase()}`, fichier);
      ok(await sb.from('rs_membres').update({ verification_demandee_le: new Date().toISOString(), ...(justificatif ? { justificatif } : {}) }).eq('id', id));
      return { ok: true };
    },
    async supprimerCompte() {
      const id = await uid();
      for (const bucket of ['avatars', 'cas-images', 'justificatifs']) {
        const l = (await sb.storage.from(bucket).list(id, { limit: 1000 })).data || [];
        if (l.length) await sb.storage.from(bucket).remove(l.map(f => `${id}/${f.name}`));
      }
      // images jointes à mes messages : <conversation>/<moi>/<fichier>
      for (const p of ok(await sb.from('rs_participants').select('conversation_id').eq('membre_id', id)) || []) {
        const l = (await sb.storage.from('messages-images').list(`${p.conversation_id}/${id}`, { limit: 1000 })).data || [];
        if (l.length) await sb.storage.from('messages-images').remove(l.map(f => `${p.conversation_id}/${id}/${f.name}`));
      }
      ok(await sb.rpc('rs_supprimer_mon_compte'));
      await sb.auth.signOut(); moi = null;
    },
    async membre(mid) {
      const me = await uid();
      const m = ok(await sb.from('rs_membres').select(MEMBRE).eq('id', mid).maybeSingle());
      if (!m) return null;
      const compte = async (table, col) => (await sb.from(table).select('*', { count: 'exact', head: true }).eq(col, mid)).count || 0;
      const [nc, abonnes, abonnements, suivi, bloque, rv] = await Promise.all([
        compte('rs_cas', 'auteur_id'), compte('rs_abonnements', 'suivi_id'), compte('rs_abonnements', 'suiveur_id'),
        sb.from('rs_abonnements').select('suivi_id').eq('suiveur_id', me).eq('suivi_id', mid).maybeSingle(),
        sb.from('rs_blocages').select('bloque_id').eq('bloqueur_id', me).eq('bloque_id', mid).maybeSingle(),
        sb.rpc('rs_remplacant_valide', { uid: mid }),
      ]);
      return { membre: m, remplacant: !!rv.data, stats: { cas: nc, abonnes, abonnements }, suivi: !!ok(suivi), bloque: !!ok(bloque) };
    },
    async chercherMembres(q = '') {
      const me = await uid();
      let r = sb.from('rs_membres').select(MEMBRE).neq('id', me).order('verifie', { ascending: false }).order('nom').limit(30);
      const t = nettoyerRecherche(q);
      if (t) r = r.or(`prenom.ilike.%${t}%,nom.ilike.%${t}%,etablissement.ilike.%${t}%,ville.ilike.%${t}%`);
      return ok(await r);
    },

    /* ---------- Cas ---------- */
    async fil({ onglet = 'tous', specialite = '', q = '', avant = null, limite = 10, auteur = null } = {}) {
      const me = await uid();
      let ids = null;
      if (onglet === 'abonnements') { ids = ok(await sb.from('rs_abonnements').select('suivi_id').eq('suiveur_id', me)).map(x => x.suivi_id); if (!ids.length) return []; }
      let r;
      if (onglet === 'enregistres') {
        const e = ok(await sb.from('rs_enregistres').select('cas_id').eq('membre_id', me));
        if (!e.length) return [];
        r = sb.from('rs_cas').select(`*, auteur:rs_membres(${MEMBRE})`).in('id', e.map(x => x.cas_id));
      } else r = sb.from('rs_cas').select(`*, auteur:rs_membres(${MEMBRE})`);
      if (ids) r = r.in('auteur_id', ids);
      if (auteur) r = r.eq('auteur_id', auteur);
      if (specialite) r = r.eq('specialite', specialite);
      const t = nettoyerRecherche(q);
      if (t) r = r.or(`titre.ilike.%${t}%,histoire.ilike.%${t}%`);
      if (avant) r = r.lt('cree_le', avant);
      return enrichir(ok(await r.order('cree_le', { ascending: false }).limit(limite)));
    },
    async cas(cid) {
      const c = ok(await sb.from('rs_cas').select(`*, auteur:rs_membres(${MEMBRE})`).eq('id', cid).maybeSingle());
      return c ? (await enrichir([c]))[0] : null;
    },
    urlsImages: c => signer('cas-images', (c.images || []).map(i => i.chemin)),
    async publierCas(d, images) {
      const id = await uid();
      const chemins = [];
      try {
        for (const i of images) chemins.push({ chemin: await televerser('cas-images', `${id}/${nouvelId()}.jpg`, i.blob), legende: i.legende || '' });
        const c = ok(await sb.from('rs_cas').insert({ titre: d.titre.trim(), histoire: d.histoire.trim(), question: d.question || '', reponse: d.reponse || '', specialite: d.specialite, modalites: d.modalites, images: chemins, attestation: !!d.attestation }).select('id').single());
        return c.id;
      } catch (e) {
        if (chemins.length) await sb.storage.from('cas-images').remove(chemins.map(c => c.chemin));
        throw e;
      }
    },
    async modifierCas(cid, d) {
      const champs = {};
      ['titre', 'histoire', 'question', 'reponse', 'specialite', 'modalites'].forEach(k => { if (k in d) champs[k] = d[k]; });
      ok(await sb.from('rs_cas').update(champs).eq('id', cid));
    },
    async supprimerCas(cid) {
      const c = ok(await sb.from('rs_cas').select('images').eq('id', cid).single());
      ok(await sb.from('rs_cas').delete().eq('id', cid));
      const chemins = (c.images || []).map(i => i.chemin).filter(Boolean);
      if (chemins.length) await sb.storage.from('cas-images').remove(chemins);
    },
    async basculerJaime(cid) {
      const me = await uid();
      const deja = ok(await sb.from('rs_jaime').select('cas_id').eq('cas_id', cid).eq('membre_id', me).maybeSingle());
      if (deja) { ok(await sb.from('rs_jaime').delete().eq('cas_id', cid).eq('membre_id', me)); return false; }
      ok(await sb.from('rs_jaime').insert({ cas_id: cid, membre_id: me }));
      return true;
    },
    async basculerEnregistre(cid) {
      const me = await uid();
      const deja = ok(await sb.from('rs_enregistres').select('cas_id').eq('cas_id', cid).eq('membre_id', me).maybeSingle());
      if (deja) { ok(await sb.from('rs_enregistres').delete().eq('cas_id', cid).eq('membre_id', me)); return false; }
      ok(await sb.from('rs_enregistres').insert({ cas_id: cid, membre_id: me }));
      return true;
    },
    async commentaires(cid) { return ok(await sb.from('rs_commentaires').select(`*, auteur:rs_membres(${MEMBRE})`).eq('cas_id', cid).order('cree_le')); },
    async commenter(cid, texte) { return ok(await sb.from('rs_commentaires').insert({ cas_id: cid, texte: texte.trim() }).select(`*, auteur:rs_membres(${MEMBRE})`).single()); },
    async supprimerCommentaire(xid) { ok(await sb.from('rs_commentaires').delete().eq('id', xid)); },
    async basculerAbonnement(mid) {
      const me = await uid();
      const deja = ok(await sb.from('rs_abonnements').select('suivi_id').eq('suiveur_id', me).eq('suivi_id', mid).maybeSingle());
      if (deja) { ok(await sb.from('rs_abonnements').delete().eq('suiveur_id', me).eq('suivi_id', mid)); return false; }
      ok(await sb.from('rs_abonnements').insert({ suiveur_id: me, suivi_id: mid }));
      return true;
    },

    /* ---------- Messagerie ---------- */
    async conversations() {
      const l = ok(await sb.rpc('rs_mes_conversations'));
      const ids = [...new Set(l.map(c => c.autre_id).filter(Boolean))];
      const membres = ids.length ? ok(await sb.from('rs_membres').select(MEMBRE).in('id', ids)) : [];
      const parts = l.length ? ok(await sb.from('rs_participants').select('conversation_id, membre_id, lu_le').in('conversation_id', l.map(c => c.conversation_id)).neq('membre_id', await uid())) : [];
      return l.map(c => ({ ...c, autre: membres.find(m => m.id === c.autre_id) || null, autre_lu_le: (parts.find(p => p.conversation_id === c.conversation_id) || {}).lu_le || null }));
    },
    async ouvrirConversation(autre) { return ok(await sb.rpc('rs_ouvrir_conversation', { autre })); },
    async messages(convId) { return ok(await sb.from('rs_messages').select('*').eq('conversation_id', convId).order('cree_le').limit(500)); },
    async envoyerMessage(convId, texte, blob) {
      const me = await uid();
      const image = blob ? await televerser('messages-images', `${convId}/${me}/${nouvelId()}.jpg`, blob) : null;
      return ok(await sb.from('rs_messages').insert({ conversation_id: convId, texte: String(texte || '').trim(), image }).select('*').single());
    },
    async marquerLu(convId) { ok(await sb.from('rs_participants').update({ lu_le: new Date().toISOString() }).eq('conversation_id', convId).eq('membre_id', await uid())); },
    async supprimerMessage(mid) {
      const m = ok(await sb.from('rs_messages').select('image').eq('id', mid).single());
      ok(await sb.from('rs_messages').update({ supprime: true }).eq('id', mid));
      if (m.image) await sb.storage.from('messages-images').remove([m.image]);
    },
    urlImageMessage: async chemin => (await signer('messages-images', [chemin]))[0],
    ecouter(cb) {
      let canal = null, fini = false;
      uid().then(me => {
        if (fini || !me) return;
        canal = sb.channel(`communaute-${me}`)
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'rs_messages' }, p => cb.message && cb.message(p.new))
          .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rs_participants' }, p => cb.lu && cb.lu(p.new))
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'rs_notifications', filter: `membre_id=eq.${me}` }, p => cb.notification && cb.notification(p.new))
          .subscribe();
      });
      return () => { fini = true; if (canal) sb.removeChannel(canal); };
    },
    async nonLus() {
      const me = await uid();
      const [c, n] = await Promise.all([sb.rpc('rs_mes_conversations'), sb.from('rs_notifications').select('id', { count: 'exact', head: true }).eq('membre_id', me).eq('lu', false)]);
      return { messages: (ok(c) || []).filter(x => x.non_lus > 0).length, notifications: n.count || 0 };
    },

    /* ---------- Blocage, signalement ---------- */
    async bloquer(mid) {
      const me = await uid();
      ok(await sb.from('rs_blocages').upsert({ bloqueur_id: me, bloque_id: mid }, { onConflict: 'bloqueur_id,bloque_id', ignoreDuplicates: true }));
      await sb.from('rs_abonnements').delete().or(`and(suiveur_id.eq.${me},suivi_id.eq.${mid}),and(suiveur_id.eq.${mid},suivi_id.eq.${me})`);
    },
    async debloquer(mid) { ok(await sb.from('rs_blocages').delete().eq('bloqueur_id', await uid()).eq('bloque_id', mid)); },
    async signaler(type, cible, motif, details = '') {
      const r = await sb.from('rs_signalements').insert({ cible_type: type, cible_id: cible, motif, details: String(details).slice(0, 500) });
      if (r.error && /duplicate|unique/.test(r.error.message)) throw new Error('Vous avez déjà signalé ce contenu.');
      ok(r);
      return { ok: true };
    },

    /* ---------- Notifications ---------- */
    async notifications() {
      const l = ok(await sb.from('rs_notifications').select(`*, acteur:rs_membres!rs_notifications_acteur_id_fkey(${MEMBRE}), cas:rs_cas(id, titre)`).eq('membre_id', await uid()).order('cree_le', { ascending: false }).limit(60));
      return l;
    },
    async marquerNotificationsLues() { ok(await sb.from('rs_notifications').update({ lu: true }).eq('membre_id', await uid()).eq('lu', false)); },

    /* ---------- Administration (droits vérifiés par la base) ---------- */
    admin: {
      async verifications() { return ok(await sb.from('rs_membres').select(`${MEMBRE}, justificatif`).not('verification_demandee_le', 'is', null).eq('verifie', false).order('verification_demandee_le')); },
      async verifier(mid, oui) { ok(await sb.from('rs_membres').update(oui ? { verifie: true } : { verifie: false, verification_demandee_le: null }).eq('id', mid)); },
      async urlJustificatif(chemin) { return chemin ? ok(await sb.storage.from('justificatifs').createSignedUrl(chemin, 600)).signedUrl : null; },
      async signalements() {
        const l = ok(await sb.from('rs_signalements').select(`*, auteur:rs_membres!rs_signalements_auteur_id_fkey(${MEMBRE})`).is('traite_le', null).order('cree_le', { ascending: false }));
        const par = t => l.filter(s => s.cible_type === t).map(s => s.cible_id);
        const [cas, com, msg, mem] = await Promise.all([
          par('cas').length ? sb.from('rs_cas').select('id, titre, etat').in('id', par('cas')) : { data: [] },
          par('commentaire').length ? sb.from('rs_commentaires').select('id, texte, cas_id, etat').in('id', par('commentaire')) : { data: [] },
          par('message').length ? sb.from('rs_messages').select('id, texte').in('id', par('message')) : { data: [] },
          par('membre').length ? sb.from('rs_membres').select(MEMBRE).in('id', par('membre')) : { data: [] },
        ]);
        const trouver = (t, id) => ({ cas: cas.data, commentaire: com.data, message: msg.data, membre: mem.data }[t] || []).find(x => x.id === id);
        return l.map(s => {
          const c = trouver(s.cible_type, s.cible_id);
          return { ...s, apercu: !c ? '(supprimé ou non visible)' : c.titre || c.texte || `${c.prenom} ${c.nom}`, cas_id: s.cible_type === 'cas' ? s.cible_id : c && c.cas_id, etat_cible: c && c.etat };
        });
      },
      async traiterSignalement(sid, decision) {
        const s = ok(await sb.from('rs_signalements').select('*').eq('id', sid).single());
        if (decision === 'retire') {
          if (s.cible_type === 'cas') ok(await sb.from('rs_cas').update({ etat: 'masque', masque_motif: 'Retiré par l\'administrateur' }).eq('id', s.cible_id));
          if (s.cible_type === 'commentaire') ok(await sb.from('rs_commentaires').update({ etat: 'masque' }).eq('id', s.cible_id));
          if (s.cible_type === 'membre') ok(await sb.from('rs_membres').update({ suspendu: true }).eq('id', s.cible_id));
        } else if (s.cible_type === 'cas') ok(await sb.from('rs_cas').update({ etat: 'publie', masque_motif: null }).eq('id', s.cible_id).eq('etat', 'masque'));
        ok(await sb.from('rs_signalements').update({ traite_le: new Date().toISOString(), traite_par: await uid(), decision }).eq('cible_type', s.cible_type).eq('cible_id', s.cible_id).is('traite_le', null));
      },
      async membres(q = '') {
        let r = sb.from('rs_membres').select(MEMBRE).order('cree_le', { ascending: false }).limit(100);
        const t = nettoyerRecherche(q);
        if (t) r = r.or(`prenom.ilike.%${t}%,nom.ilike.%${t}%`);
        return ok(await r);
      },
      async suspendre(mid, oui) { ok(await sb.from('rs_membres').update({ suspendu: !!oui }).eq('id', mid)); },
      async retirerVerification(mid) { ok(await sb.from('rs_membres').update({ verifie: false }).eq('id', mid)); },
      async statistiques() {
        const n = async (t, f) => { let r = sb.from(t).select('*', { count: 'exact', head: true }); if (f) r = f(r); return (await r).count || 0; };
        const [membres, verifies, cas, masques, signalements, attente] = await Promise.all([
          n('rs_membres'), n('rs_membres', r => r.eq('verifie', true)), n('rs_cas'), n('rs_cas', r => r.eq('etat', 'masque')),
          n('rs_signalements', r => r.is('traite_le', null)), n('rs_membres', r => r.eq('verifie', false).not('verification_demandee_le', 'is', null)),
        ]);
        return { membres, verifies, cas, masques, signalements, attente, messages: null };
      },
    },
    demo: null,
  };

  window.RHRs = window.RHRs || {};
  window.RHRs.apiSupabase = api;
})();
