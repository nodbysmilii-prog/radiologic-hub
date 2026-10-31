/* =========================================================
   RadiologicHub — Bibliothèque : accès à Supabase (production)
   ---------------------------------------------------------
   Même projet et même compte administrateur que Remplacements et
   Communauté (remplacements/config.js). Les visiteurs ne lisent que
   les articles publiés et seulement les colonnes publiques, demandées
   une par une (droits explicites : supabase/migrations/…_bibliotheque.sql).
   Même interface que api-demo.js.
   ========================================================= */
(function () {
  'use strict';
  const cfg = window.RH_REMPLACEMENTS_CONFIG || {};
  const B = window.RHBib = window.RHBib || {};
  let sb = null, demarrage = null;

  const PUBLIQUES = 'id, doi, pmid, pmcid, titre, premier_auteur, et_al, revue, annee, licence, acces, url_texte, source_texte, specialite, organes, modalites, classifications, niveau, resume, statut, publie_le';
  const ADMIN = PUBLIQUES + ', oa_statut, motif_rejet, origine, requete, lien_etat, lien_verifie_le, cree_le, maj_le';
  const THEMES = 'themes:bib_article_themes(theme, essentiel, rang)';
  const EDITABLES = ['doi', 'pmid', 'pmcid', 'titre', 'premier_auteur', 'et_al', 'revue', 'annee', 'licence', 'acces', 'oa_statut', 'url_texte', 'source_texte',
    'specialite', 'organes', 'modalites', 'classifications', 'niveau', 'resume', 'statut', 'motif_rejet', 'origine', 'requete'];

  const charger = () => new Promise((resolve, reject) => {
    if (window.supabase) return resolve();
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js';
    s.onload = resolve; s.onerror = () => reject(new Error('Bibliothèque Supabase injoignable.'));
    document.head.appendChild(s);
  });
  const ok = r => {
    if (r.error) {
      if (r.error.code === '23505') throw new Error('Cet article est déjà dans la bibliothèque (même DOI, PMID ou PMCID).');
      throw new Error(r.error.message);
    }
    return r.data;
  };
  // Adresse de retour toujours en .html (acceptée par GitHub Pages et, redirigée vers l'adresse sans .html, par Cloudflare Pages) :
  // une seule adresse autorisée dans Supabase par page, comme pour les Remplacements et la Communauté.
  const retour = () => `${location.origin}${location.pathname.replace(/(?:\.html)?$/, '.html')}`;
  let sortieDemandee = false, sessionPerdue = null;

  B.apiSupabase = {
    mode: 'supabase',
    get pret() {
      return demarrage || (demarrage = charger().then(() => {
        sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, { auth: { persistSession: true, detectSessionInUrl: true } });
        sb.auth.onAuthStateChange(e => { if (e === 'SIGNED_OUT' && !sortieDemandee && sessionPerdue) sessionPerdue(); sortieDemandee = false; });
      }));
    },
    async articlesPublies() {
      await this.pret;
      return ok(await sb.from('bib_articles').select(`${PUBLIQUES}, ${THEMES}`).eq('statut', 'publie').order('publie_le', { ascending: false }));
    },

    /* ---------- Administration ---------- */
    async session() {
      await this.pret;
      const { data } = await sb.auth.getSession();
      return data.session ? { email: data.session.user.email } : null;
    },
    async estAdmin() { await this.pret; return !!ok(await sb.rpc('rp_est_admin')); },
    async connexionGoogle() { await this.pret; ok(await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: retour() } })); },
    async connexionEmail(email) { await this.pret; ok(await sb.auth.signInWithOtp({ email: String(email).trim(), options: { emailRedirectTo: retour(), shouldCreateUser: true } })); },
    async deconnexion() { await this.pret; sortieDemandee = true; await sb.auth.signOut(); },
    surSessionPerdue(f) { sessionPerdue = f; },
    async tousLesArticles() {
      await this.pret;
      return ok(await sb.from('bib_articles').select(`${ADMIN}, ${THEMES}`).order('cree_le', { ascending: false }));
    },
    async enregistrer(article) {
      await this.pret;
      const ligne = {};
      EDITABLES.forEach(k => { if (article[k] !== undefined) ligne[k] = article[k] === '' ? null : article[k]; });
      let id = article.id;
      if (id) ok(await sb.from('bib_articles').update(ligne).eq('id', id));
      else id = ok(await sb.from('bib_articles').insert(ligne).select('id').single()).id;
      ok(await sb.from('bib_article_themes').delete().eq('article_id', id));
      const themes = (article.themes || []).map(t => ({ article_id: id, theme: t.theme, essentiel: !!t.essentiel, rang: t.rang || null }));
      if (themes.length) ok(await sb.from('bib_article_themes').insert(themes));
      return ok(await sb.from('bib_articles').select(`${ADMIN}, ${THEMES}`).eq('id', id).single());
    },
    async supprimer(id) { await this.pret; ok(await sb.from('bib_articles').delete().eq('id', id)); },
  };
})();
