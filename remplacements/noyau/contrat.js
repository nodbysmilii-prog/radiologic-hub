/* =========================================================
   RadiologicHub — Remplacements : contrat de remplacement (PDF)
   ---------------------------------------------------------
   Le texte du contrat est dans remplacements/modeles/contrat.md (fichier
   séparé, à faire valider). Ce module remplit le modèle avec les données
   de la mission puis produit le PDF (noyau/pdf.js) ou un aperçu HTML.
   ========================================================= */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./referentiel.js'), require('./recap.js'), require('./gabarits.js'), require('./pdf.js'));
  else { const R = root.RHRemplacements = root.RHRemplacements || {}; R.contrat = factory(R.referentiel, R.recap, R.gabarits, R.pdf); }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (REF, RECAP, GAB, PDF) {
  'use strict';

  /* Données du contrat : { demande, structure, remplacant, profil, maintenant } */
  function donneesContrat(o) {
    return {
      date_contrat: REF.dateFr(REF.dateLocale(o.maintenant || new Date())),
      structure: RECAP.structure(o.structure),
      remplacant: RECAP.remplacant(o.remplacant, o.profil),
      mission: RECAP.demande(o.demande, o.structure),
    };
  }

  /* Texte du modèle rempli → blocs { type, texte } */
  function blocs(modele, donnees) {
    const texte = GAB.rendre(modele.split(/\r?\n/).filter(l => !l.startsWith('%%')).join('\n'), donnees, { texte: true });
    const out = [];
    let para = [];
    const fermer = () => { if (para.length) { out.push({ type: 'paragraphe', texte: para.join(' ') }); para = []; } };
    texte.split('\n').forEach(brut => {
      const l = brut.trim();
      if (!l) return fermer();
      let m;
      if ((m = /^#\s+(.*)$/.exec(l))) { fermer(); out.push({ type: 'titre', texte: m[1] }); }
      else if ((m = /^##\s+(.*)$/.exec(l))) { fermer(); out.push({ type: 'article', texte: m[1] }); }
      else if ((m = /^>\s*(.*)$/.exec(l))) { fermer(); out.push({ type: 'centre', texte: m[1] }); }
      else if ((m = /^-\s+(.*)$/.exec(l))) { fermer(); out.push({ type: 'puce', texte: m[1] }); }
      else if (/^-{3,}$/.test(l)) { fermer(); out.push({ type: 'trait' }); }
      else if (l === '[SIGNATURES]') { fermer(); out.push({ type: 'signatures' }); }
      else para.push(l);
    });
    fermer();
    return out;
  }

  /* PDF du contrat → Uint8Array */
  function pdfContrat(modele, donnees) {
    const doc = PDF.creerPdf({ titre: `Contrat de remplacement ${donnees.mission.reference}`, pied: `RadiologicHub — contrat ${donnees.mission.reference} — modèle à faire valider avant usage` });
    blocs(modele, donnees).forEach(b => {
      if (b.type === 'titre') doc.titre(b.texte);
      else if (b.type === 'centre') doc.paragraphe(b.texte, { centre: true, ital: true, couleur: '#55545f', taille: 10 });
      else if (b.type === 'article') doc.sousTitre(b.texte);
      else if (b.type === 'puce') doc.puce(b.texte);
      else if (b.type === 'trait') doc.trait();
      else if (b.type === 'signatures') {
        doc.signatures(['Pour la structure', donnees.structure.nom, donnees.structure.contact], ['Le remplaçant', donnees.remplacant.nom_complet, 'Lu et approuvé']);
      } else doc.paragraphe(b.texte);
    });
    return doc.octets();
  }

  /* Aperçu HTML (même contenu) */
  function htmlContrat(modele, donnees) {
    const enLigne = t => GAB.esc(t).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/_([^_]+)_/g, '<em>$1</em>');
    let h = '', liste = false;
    blocs(modele, donnees).forEach(b => {
      if (b.type !== 'puce' && liste) { h += '</ul>'; liste = false; }
      if (b.type === 'titre') h += `<h1>${enLigne(b.texte)}</h1>`;
      else if (b.type === 'centre') h += `<p class="ct-centre">${enLigne(b.texte)}</p>`;
      else if (b.type === 'article') h += `<h2>${enLigne(b.texte)}</h2>`;
      else if (b.type === 'puce') { if (!liste) { h += '<ul>'; liste = true; } h += `<li>${enLigne(b.texte)}</li>`; }
      else if (b.type === 'trait') h += '<hr>';
      else if (b.type === 'signatures') h += `<div class="ct-signatures"><div><strong>Pour la structure</strong><br>${GAB.esc(donnees.structure.nom)}</div><div><strong>Le remplaçant</strong><br>${GAB.esc(donnees.remplacant.nom_complet)}</div></div>`;
      else h += `<p>${enLigne(b.texte)}</p>`;
    });
    return h + (liste ? '</ul>' : '');
  }

  return { donneesContrat, blocs, pdfContrat, htmlContrat };
});
