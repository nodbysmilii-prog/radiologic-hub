// Fichier généré par scripts/preparer-backend.js — ne pas modifier ici (source : remplacements/).
/* =========================================================
   RadiologicHub — Remplacements : mise en forme des messages
   ---------------------------------------------------------
   Transforme (modèle, données) en e-mail : objet (balise <title> du
   modèle), HTML (modèle inséré dans la mise en page _base.html) et
   version texte. L'envoi lui-même est confié à un « transport »
   (Brevo, Resend, boîte d'envoi de démonstration…), ce qui permettra
   d'ajouter WhatsApp ou SMS avec la même interface.
     charger(nom)  → texte du fichier modeles/emails/<nom>.html
     transport(m)  → { ok, id?, erreur? }  avec m = { de, a, objet, html, texte, pieces_jointes }
   ========================================================= */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./gabarits.js'));
  else { const R = root.RHRemplacements = root.RHRemplacements || {}; R.messagerie = factory(R.gabarits); }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (GAB) {
  'use strict';

  const ENTITES = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&nbsp;': ' ' };
  /* Version texte d'un e-mail HTML */
  function texteBrut(html) {
    return html
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, (m, href, lib) => `${lib.replace(/<[^>]+>/g, '').trim()} : ${href}`)
      .replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|tr|h\d|li|div|table)>/gi, '\n').replace(/<li[^>]*>/gi, '• ')
      .replace(/<[^>]+>/g, '').replace(/&(amp|lt|gt|quot|#39|nbsp);/g, e => ENTITES[e])
      .split('\n').map(l => l.replace(/\s+/g, ' ').trim()).filter((l, i, a) => l || (a[i - 1] && a[i - 1].trim())).join('\n').trim();
  }

  function creerMessagerie({ charger, transport, expediteur = { email: 'remplacements@radiologichub.com', nom: 'RadiologicHub Remplacements' } }) {
    const cache = new Map();
    const lire = async nom => { if (!cache.has(nom)) cache.set(nom, await charger(nom)); return cache.get(nom); };
    /* Charge les blocs communs ({{> nom}} → _nom.html), y compris imbriqués */
    async function partiels(modele, acc = {}) {
      for (const [, nom] of modele.matchAll(/\{\{\s*>\s*([\w-]+)\s*\}\}/g)) {
        if (acc[nom] != null) continue;
        acc[nom] = await lire(`_${nom}`);
        await partiels(acc[nom], acc);
      }
      return acc;
    }

    /* Rendu complet : { objet, html, texte } */
    async function composer(modele, donnees) {
      const brut = await lire(modele);
      const base = await lire('_base');
      const p = await partiels(brut, await partiels(base));
      const objet = GAB.titre(brut, donnees);
      const contenu = GAB.rendre(GAB.corps(brut), donnees, { partiels: p });
      const html = GAB.rendre(base, { ...donnees, objet, contenu }, { partiels: p });
      return { objet, html, texte: texteBrut(contenu) };
    }

    /* Interface « notifier » attendue par l'agent (noyau/moteur.js) */
    async function envoyer({ a, modele, donnees, pieces_jointes = [] }) {
      const m = await composer(modele, donnees);
      const r = await transport({ de: expediteur, a, objet: m.objet, html: m.html, texte: m.texte, pieces_jointes, modele });
      return { ...(r || {}), objet: m.objet };
    }
    return { envoyer, composer };
  }

  return { creerMessagerie, texteBrut };
});
