/* =========================================================
   RadiologicHub — Abonnements : accès aux contenus réservés (FONDATION)
   ---------------------------------------------------------
   Pas encore branché sur une page. Toute la vérification est faite par la
   base (ab_lire_contenu, droits par ligne, stockage privé « premium ») :
   ce fichier ne fait que demander et afficher une erreur claire.
   • estAbonne()      → true / false (false si non connecté) ;
   • lire(id)         → { id, module, titre, contenu, version }, gardé en
                        mémoire de la page seulement (rien dans le navigateur
                        après fermeture) ;
   • urlFichier(c)    → URL signée valable 5 minutes (stockage « premium »).
   Erreurs : e.code = 'connexion' | 'abonnement' | 'limite' | 'introuvable'
   | 'indisponible' (réseau ou service).
   Usage : const p = RHPremium.creer(clientSupabase);
   ========================================================= */
(function (racine, fabrique) {
  if (typeof module === 'object' && module.exports) module.exports = fabrique();
  else racine.RHPremium = fabrique();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const CODES = { '28000': 'connexion', '42501': 'abonnement', '54000': 'limite' };
  const MESSAGES = {
    connexion: 'Connectez-vous pour accéder à ce contenu.',
    abonnement: 'Ce contenu est réservé aux abonnés.',
    limite: 'Trop de lectures en peu de temps : réessayez dans quelques minutes.',
    introuvable: 'Contenu introuvable.',
    indisponible: 'Service momentanément indisponible : réessayez plus tard.',
  };
  const erreur = code => Object.assign(new Error(MESSAGES[code]), { code });
  const traduire = e => erreur(CODES[e && e.code] || (/abonnement requis/.test(e && e.message) ? 'abonnement' : 'indisponible'));

  function creer(sb, { dureeUrl = 300 } = {}) {
    const memoire = new Map();
    const session = async () => { try { const { data } = await sb.auth.getSession(); return data && data.session; } catch (e) { return null; } };
    return {
      async estAbonne() {
        if (!(await session())) return false;
        try { const { data, error } = await sb.rpc('ab_est_abonne'); return !error && data === true; } catch (e) { return false; }
      },
      async lire(id) {
        if (memoire.has(id)) return memoire.get(id);
        if (!(await session())) throw erreur('connexion');
        let r;
        try { r = await sb.rpc('ab_lire_contenu', { identifiant: id }); } catch (e) { throw erreur('indisponible'); }
        if (r.error) throw traduire(r.error);
        const l = Array.isArray(r.data) ? r.data[0] : null;
        if (!l) throw erreur('introuvable');
        const c = { id: l.id, module: l.module, titre: l.titre, contenu: l.contenu_json, version: l.version };
        memoire.set(id, c);
        return c;
      },
      async urlFichier(chemin) {
        if (!(await session())) throw erreur('connexion');
        let r;
        try { r = await sb.storage.from('premium').createSignedUrl(chemin, dureeUrl); } catch (e) { throw erreur('indisponible'); }
        if (r.error || !r.data) throw erreur(/not found|object/i.test((r.error && r.error.message) || '') ? 'introuvable' : 'abonnement');
        return r.data.signedUrl;
      },
      oublier() { memoire.clear(); },
    };
  }
  return { creer, MESSAGES };
}));
