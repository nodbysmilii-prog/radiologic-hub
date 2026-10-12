/* =========================================================
   RadiologicHub — Cours : accès à Supabase (production)
   ---------------------------------------------------------
   Même projet et même compte administrateur que Remplacements,
   Communauté et Bibliothèque (remplacements/config.js). Les élèves ne
   lisent que les éléments approuvés et les images approuvées dans leur
   révision actuelle (règles de supabase/migrations/…_cours.sql).
   Images : stockage « cours-images », chemin aléatoire, JPEG réenregistré
   sans métadonnées. Même interface que api-demo.js.
   ========================================================= */
(function () {
  'use strict';
  const cfg = window.RH_REMPLACEMENTS_CONFIG || {};
  const B = window.RHCours = window.RHCours || {};
  const N = window.RHCoursNoyau;
  let sb = null, demarrage = null;
  const SEAU = 'cours-images';

  const charger = () => new Promise((resolve, reject) => {
    if (window.supabase) return resolve();
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js';
    s.onload = resolve; s.onerror = () => reject(new Error('Bibliothèque Supabase injoignable.'));
    document.head.appendChild(s);
  });
  const ok = r => { if (r.error) throw new Error(r.error.message); return r.data; };
  const retour = () => `${location.origin}${location.pathname}`;
  const url = chemin => sb.storage.from(SEAU).getPublicUrl(chemin).data.publicUrl;
  const aleatoire = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2)).replace(/[^a-z0-9]/g, '').slice(0, 20);

  B.apiSupabase = {
    mode: 'supabase',
    get pret() {
      return demarrage || (demarrage = charger().then(() => {
        sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, { auth: { persistSession: true, detectSessionInUrl: true } });
      }));
    },
    async session() {
      await this.pret;
      const { data } = await sb.auth.getSession();
      return data.session ? { email: data.session.user.email } : null;
    },
    async estAdmin() {
      await this.pret;
      const { data } = await sb.auth.getSession();
      return !!data.session && !!ok(await sb.rpc('rp_est_admin'));
    },
    async connexionGoogle() { await this.pret; ok(await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: retour() } })); },
    async connexionEmail(email) { await this.pret; ok(await sb.auth.signInWithOtp({ email: String(email).trim(), options: { emailRedirectTo: retour(), shouldCreateUser: true } })); },
    async deconnexion() { await this.pret; await sb.auth.signOut(); },

    async validations(cours, { admin = false } = {}) {
      await this.pret;
      const colonnes = admin ? 'cours, element, type, version, statut, commentaire, maj_le' : 'cours, element, type, version, statut';
      return ok(await sb.from('cours_validations').select(colonnes).eq('cours', cours));
    },
    async definirStatut(cours, { element, type, version, statut, commentaire = null }) {
      await this.pret;
      ok(await sb.from('cours_validations').upsert({ cours, element, type, version, statut, commentaire: commentaire || null }, { onConflict: 'cours,element' }));
    },
    async reinitialiserStatut(cours, element) {
      await this.pret;
      ok(await sb.from('cours_validations').delete().eq('cours', cours).eq('element', element));
    },

    async images(cours) {
      await this.pret;
      const lignes = ok(await sb.from('cours_images').select('schema, chemin, largeur, hauteur, orientation, etiquettes, revision, maj_le').eq('cours', cours));
      return lignes.map(l => ({ ...l, url: url(l.chemin) }));
    },
    async enregistrerImage(cours, schema, { fichier = null, orientation, etiquettes }) {
      await this.pret;
      const avant = (ok(await sb.from('cours_images').select('chemin').eq('cours', cours).eq('schema', schema)) || [])[0];
      if (!avant && !fichier) throw new Error('Choisissez d\'abord une image.');
      const ligne = { cours, schema, etiquettes: N.normaliserEtiquettes(etiquettes || []) };
      if (orientation) ligne.orientation = orientation;
      if (fichier) {
        const img = await B.preparerImage(fichier);
        const chemin = `${cours.replace(/^echo-mi-/, '')}/${schema}-${aleatoire()}.jpg`;
        ok(await sb.storage.from(SEAU).upload(chemin, img.blob, { contentType: 'image/jpeg', upsert: false }));
        Object.assign(ligne, { chemin, largeur: img.largeur, hauteur: img.hauteur });
      } else ligne.chemin = avant.chemin;
      const r = ok(await sb.from('cours_images').upsert(ligne, { onConflict: 'cours,schema' }).select('schema, chemin, largeur, hauteur, orientation, etiquettes, revision, maj_le'));
      if (fichier && avant) await sb.storage.from(SEAU).remove([avant.chemin]);
      return { ...r[0], url: url(r[0].chemin) };
    },
    async supprimerImage(cours, schema) {
      await this.pret;
      const avant = (ok(await sb.from('cours_images').select('chemin').eq('cours', cours).eq('schema', schema)) || [])[0];
      ok(await sb.from('cours_images').delete().eq('cours', cours).eq('schema', schema));
      ok(await sb.from('cours_validations').delete().eq('cours', cours).eq('element', `image-${schema}`));
      if (avant) await sb.storage.from(SEAU).remove([avant.chemin]);
    },

    async reglages(cours) {
      await this.pret;
      return (ok(await sb.from('cours_reglages').select('credits').eq('cours', cours)) || [])[0] || {};
    },
    async enregistrerReglages(cours, { credits }) {
      await this.pret;
      ok(await sb.from('cours_reglages').upsert({ cours, credits: String(credits || '').slice(0, 3000) }, { onConflict: 'cours' }));
    },
  };
})();
