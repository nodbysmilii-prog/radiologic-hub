/* =========================================================
   RadiologicHub — Bibliothèque : MODE DÉMONSTRATION
   ---------------------------------------------------------
   Articles gardés dans CE navigateur (localStorage), partant des
   5 articles de bibliotheque/demo.js. L'administration y est ouverte à
   tous pour l'essai. Même interface que api-supabase.js.
   ========================================================= */
(function () {
  'use strict';
  const B = window.RHBib = window.RHBib || {};
  const CLE = 'rh-bib-demo-v1';
  const copie = o => JSON.parse(JSON.stringify(o));

  const lire = () => {
    try { const v = JSON.parse(localStorage.getItem(CLE)); if (Array.isArray(v)) return v; } catch (e) {}
    return copie(B.demo || []);
  };
  let memoire = null;
  const tous = () => (memoire || (memoire = lire()));
  const ecrire = () => { try { localStorage.setItem(CLE, JSON.stringify(memoire)); } catch (e) {} };
  const nouvelId = () => 'demo-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  B.apiDemo = {
    mode: 'demo',
    pret: Promise.resolve(),
    async articlesPublies() { return copie(tous().filter(a => a.statut === 'publie')); },

    /* ---------- Administration (ouverte en démonstration) ---------- */
    async session() { return { email: 'démonstration' }; },
    async estAdmin() { return true; },
    async connexionGoogle() {}, async connexionEmail() {}, async deconnexion() {},
    async tousLesArticles() { return copie(tous()); },
    async enregistrer(article) {
      const liste = tous();
      const a = copie(article);
      const doublon = window.RHBib.identifiants.trouverDoublon(a, liste.filter(x => x.id !== a.id));
      if (doublon) throw new Error(`Déjà dans la bibliothèque (${doublon.statut === 'rejete' ? 'rejeté' : doublon.statut === 'publie' ? 'publié' : 'à valider'}) : « ${doublon.titre} ».`);
      a.doi = a.doi ? String(a.doi).toLowerCase() : null;
      const avant = a.id ? liste.find(x => x.id === a.id) : null;
      if (a.statut === 'publie' && (!avant || avant.statut !== 'publie')) a.publie_le = new Date().toISOString();
      if (a.statut !== 'publie') a.publie_le = null;
      if (a.statut !== 'rejete') a.motif_rejet = null;
      a.maj_le = new Date().toISOString();
      if (avant) liste[liste.indexOf(avant)] = a;
      else { a.id = nouvelId(); a.cree_le = a.maj_le; liste.push(a); }
      ecrire();
      return copie(a);
    },
    async supprimer(id) { memoire = tous().filter(a => a.id !== id); ecrire(); },
    async reinitialiser() { memoire = copie(B.demo || []); ecrire(); },
  };
})();
