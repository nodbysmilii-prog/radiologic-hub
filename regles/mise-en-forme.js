/* =========================================================
   RadiologicHub — Comptes rendus : mise en forme du texte
   ---------------------------------------------------------
   L'éditeur est en texte brut ; à la copie, à l'impression et au
   téléchargement Word, le compte rendu est mis en forme (demande de
   l'auteur, 24/10/2026) :
   • titre de l'examen (1re ligne en majuscules, sans « : ») centré, en gras ;
   • rubriques (« RENSEIGNEMENTS CLINIQUES : », « TECHNIQUE : »,
     « RÉSULTATS : », « AU TOTAL : », « CONCLUSION : »…) en gras, à gauche ;
   • le reste tel quel.
   Module sans dépendance au navigateur (testé sous Node :
   tests/mise-en-forme.test.js).
   ========================================================= */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.RHRegles = root.RHRegles || {}).miseEnForme = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const MAJ = s => /[A-ZÀ-Ý]/.test(s) && s === s.toUpperCase();
  const ETAGE = /^[CDLTS]\d{1,2}\s*-\s*[CDLTS]\d{1,2}\s*:$/;   // « C5-C6 : » : sous-titre, pas une rubrique

  /* Lignes typées : titre, rubrique, texte, vide */
  function analyser(texte) {
    const L = String(texte ?? '').replace(/\r\n?/g, '\n').split('\n');
    const premiere = L.findIndex(l => l.trim());
    return L.map((l, i) => {
      const t = l.trim();
      if (!t) return { type: 'vide', texte: '' };
      if (i === premiere && MAJ(t) && !/:\s*$/.test(t)) return { type: 'titre', texte: t };
      if (/:\s*$/.test(t) && MAJ(t.replace(/\[[^\]]*\]/g, '')) && !ETAGE.test(t) && !/^[•*\-–]/.test(t)) return { type: 'rubrique', texte: t };
      return { type: 'texte', texte: l };
    });
  }

  /* HTML (copie enrichie, impression, Word) : styles en ligne pour être gardés au collage */
  function html(texte, o = {}) {
    const police = o.police || 'Arial, Helvetica, sans-serif';
    const corps = analyser(texte).map(x => {
      if (x.type === 'vide') return '<p style="margin:0">&nbsp;</p>';
      if (x.type === 'titre') return `<p class="crf-titre" style="margin:0;text-align:center"><b>${esc(x.texte)}</b></p>`;
      if (x.type === 'rubrique') return `<p class="crf-rubrique" style="margin:0"><b>${esc(x.texte)}</b></p>`;
      return `<p style="margin:0">${esc(x.texte)}</p>`;
    }).join('');
    return `<div style="font-family:${police};font-size:11pt;line-height:1.45">${corps}</div>`;
  }

  /* Document Word (.doc ouvert par Word / LibreOffice : HTML avec en-tête Office) */
  function word(texte, titre = 'Compte rendu') {
    return `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><title>${esc(titre)}</title></head><body>${html(texte)}</body></html>`;
  }

  return { analyser, html, word };
});
