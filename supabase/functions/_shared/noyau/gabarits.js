// Fichier généré par scripts/preparer-backend.js — ne pas modifier ici (source : remplacements/).
/* =========================================================
   RadiologicHub — Remplacements : gabarits (e-mails, contrat)
   ---------------------------------------------------------
   Syntaxe minimale, proche de Mustache :
     {{chemin.de.la.valeur}}   valeur échappée (HTML)
     {{{chemin}}}              valeur brute (HTML déjà prêt)
     {{#cle}} … {{/cle}}       bloc affiché si la valeur est vraie ;
                               répété pour chaque élément d'une liste
                               ({{.}} = l'élément courant)
     {{^cle}} … {{/cle}}       bloc affiché si la valeur est vide ou fausse
     {{> nom}}                 inclusion d'un bloc commun (fichier _nom.html)
   Les modèles d'e-mails sont dans remplacements/modeles/emails/.
   ========================================================= */

(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.RHRemplacements = root.RHRemplacements || {}).gabarits = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const lire = (pile, chemin) => {
    if (chemin === '.') return pile[pile.length - 1];
    const parts = chemin.split('.');
    for (let i = pile.length - 1; i >= 0; i--) {
      const ctx = pile[i];
      if (ctx != null && typeof ctx === 'object' && parts[0] in ctx) return parts.reduce((o, k) => (o == null ? undefined : o[k]), ctx);
    }
    return undefined;
  };
  const vide = v => v == null || v === false || v === '' || v === 0 || (Array.isArray(v) && v.length === 0);

  const BALISE = /\{\{\{\s*([\w.]+)\s*\}\}\}|\{\{\s*([#^/>]?)\s*([\w.-]+)\s*\}\}/g;

  /* Découpe en arbre : texte, variables, blocs */
  function analyser(modele) {
    const racine = { enfants: [] }, pile = [racine];
    let dernier = 0, m;
    BALISE.lastIndex = 0;
    while ((m = BALISE.exec(modele))) {
      const courant = pile[pile.length - 1];
      if (m.index > dernier) courant.enfants.push({ texte: modele.slice(dernier, m.index) });
      dernier = BALISE.lastIndex;
      if (m[1]) { courant.enfants.push({ brut: m[1] }); continue; }
      const [, , signe, nom] = m;
      if (signe === '#' || signe === '^') {
        const bloc = { bloc: nom, inverse: signe === '^', enfants: [] };
        courant.enfants.push(bloc);
        pile.push(bloc);
      } else if (signe === '>') {
        courant.enfants.push({ partiel: nom });
      } else if (signe === '/') {
        if (pile.length < 2 || courant.bloc !== nom) throw new Error(`Gabarit : fermeture {{/${nom}}} inattendue`);
        pile.pop();
      } else courant.enfants.push({ variable: nom });
    }
    if (pile.length > 1) throw new Error(`Gabarit : bloc {{#${pile[pile.length - 1].bloc}}} non fermé`);
    if (dernier < modele.length) racine.enfants.push({ texte: modele.slice(dernier) });
    return racine;
  }

  function produire(noeud, pile, texte, partiels) {
    return noeud.enfants.map(n => {
      if (n.texte != null) return n.texte;
      if (n.partiel) {
        const m = partiels && partiels[n.partiel];
        if (m == null) throw new Error(`Gabarit : bloc commun « ${n.partiel} » introuvable`);
        return produire(arbre(m), pile, texte, partiels);
      }
      if (n.brut) return String(lire(pile, n.brut) ?? '');
      if (n.variable) return texte ? String(lire(pile, n.variable) ?? '') : esc(lire(pile, n.variable));
      const v = lire(pile, n.bloc);
      if (n.inverse) return vide(v) ? produire(n, pile, texte, partiels) : '';
      if (vide(v)) return '';
      if (Array.isArray(v)) return v.map(el => produire(n, [...pile, el], texte, partiels)).join('');
      return produire(n, typeof v === 'object' ? [...pile, v] : pile, texte, partiels);
    }).join('');
  }

  const cache = new Map();
  const arbre = modele => { if (!cache.has(modele)) cache.set(modele, analyser(modele)); return cache.get(modele); };
  /* rendre(modèle, données, { texte: true } sans échappement HTML, partiels: { nom: modèle }) → texte */
  function rendre(modele, donnees, o = {}) {
    return produire(arbre(modele), [donnees || {}], !!o.texte, o.partiels);
  }

  /* Titre du message : première balise <title> du modèle, rendue */
  const titre = (modele, donnees) => {
    const m = /<title>([\s\S]*?)<\/title>/i.exec(modele);
    return m ? rendre(m[1], donnees).replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim() : '';
  };
  /* Corps d'un modèle d'e-mail : contenu de <body> s'il existe */
  const corps = modele => { const m = /<body[^>]*>([\s\S]*)<\/body>/i.exec(modele); return m ? m[1] : modele; };

  return { rendre, titre, corps, esc };
});
