/* =========================================================
   RadiologicHub — Cours : MODE DÉMONSTRATION
   ---------------------------------------------------------
   Validations, images et crédits gardés dans CE navigateur
   (localStorage), tant que Supabase n'est pas configuré. L'administration
   y est ouverte à tous pour l'essai ; les visiteurs d'un autre
   navigateur ne voient rien (aucun élément approuvé chez eux).
   Même interface que api-supabase.js.
   ========================================================= */
(function () {
  'use strict';
  const B = window.RHCours = window.RHCours || {};
  const N = window.RHCoursNoyau;
  const CLE = 'rh-cours-demo-v1';
  const copie = o => JSON.parse(JSON.stringify(o));
  const vide = () => ({ validations: {}, images: {}, reglages: {} });

  let memoire = null;
  const etat = () => {
    if (memoire) return memoire;
    try { memoire = JSON.parse(localStorage.getItem(CLE)) || vide(); } catch (e) { memoire = vide(); }
    for (const k of ['validations', 'images', 'reglages']) memoire[k] = memoire[k] || {};
    return memoire;
  };
  const ecrire = () => {
    try { localStorage.setItem(CLE, JSON.stringify(memoire)); } catch (e) {
      throw new Error('Mémoire du navigateur pleine : supprimez une image de démonstration.');
    }
  };
  const du = (table, cours) => (etat()[table][cours] = etat()[table][cours] || {});
  const imageVisible = (cours, schema, img) => {
    const v = du('validations', cours)[`image-${schema}`];
    return v && v.statut === 'approuve' && v.version === `r${img.revision}`;
  };

  B.apiDemo = {
    mode: 'demo',
    pret: Promise.resolve(),
    async session() { return { email: 'démonstration' }; },
    async estAdmin() { return true; },
    async connexionGoogle() {}, async connexionEmail() {}, async deconnexion() {},

    /* Validations : l'auteur voit tout ; les élèves, les éléments approuvés (sans commentaire) */
    async validations(cours, { admin = false } = {}) {
      const lignes = Object.values(du('validations', cours));
      return copie(admin ? lignes : lignes.filter(v => v.statut === 'approuve').map(({ commentaire, ...v }) => v));
    },
    async definirStatut(cours, { element, type, version, statut, commentaire = null }) {
      du('validations', cours)[element] = {
        cours, element, type, version, statut,
        commentaire: statut === 'approuve' ? null : (commentaire || null), maj_le: new Date().toISOString(),
      };
      ecrire();
    },
    async reinitialiserStatut(cours, element) { delete du('validations', cours)[element]; ecrire(); },

    /* Images échographiques de l'auteur (une par schéma) */
    async images(cours, { admin = false } = {}) {
      const toutes = Object.entries(du('images', cours)).map(([schema, i]) => ({ schema, ...i }));
      return copie(admin ? toutes : toutes.filter(i => imageVisible(cours, i.schema, i)));
    },
    async enregistrerImage(cours, schema, { fichier = null, orientation, etiquettes }) {
      const t = du('images', cours), avant = t[schema];
      if (!avant && !fichier) throw new Error('Choisissez d\'abord une image.');
      const img = fichier ? await B.preparerImage(fichier) : null;
      t[schema] = {
        url: img ? img.dataUrl : avant.url,
        largeur: img ? img.largeur : avant.largeur,
        hauteur: img ? img.hauteur : avant.hauteur,
        orientation: orientation || (avant && avant.orientation) || 'medial_gauche',
        etiquettes: N.normaliserEtiquettes(etiquettes != null ? etiquettes : (avant && avant.etiquettes)),
        revision: avant ? avant.revision + 1 : 1,
        maj_le: new Date().toISOString(),
      };
      ecrire();
      return copie({ schema, ...t[schema] });
    },
    async supprimerImage(cours, schema) {
      delete du('images', cours)[schema];
      delete du('validations', cours)[`image-${schema}`];
      ecrire();
    },

    /* Bloc « Source / crédits » */
    async reglages(cours) { return copie(du('reglages', cours)); },
    async enregistrerReglages(cours, { credits }) {
      du('reglages', cours).credits = String(credits || '').slice(0, 3000);
      ecrire();
    },

    async reinitialiser() { memoire = vide(); ecrire(); },
  };
})();
