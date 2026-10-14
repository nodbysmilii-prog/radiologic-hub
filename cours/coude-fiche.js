/* =========================================================
   RadiologicHub — Échographie du coude : fiche « nerf ulnaire »
   ---------------------------------------------------------
   • images agrandies au clic (boîte #lightbox du site, fermée par fiche.js) ;
   • comptes rendus types : bouton « Copier » (texte du modèle, champs
     [entre crochets] compris), sélection du texte si le presse-papiers
     est refusé ;
   • « Voir le nerf ulnaire en 3D » : remonte à la visionneuse et y
     sélectionne la structure (cours/coude-3d.js).
   ========================================================= */
(function () {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* ---------- Images agrandies ---------- */
  const boite = $('#lightbox');
  if (boite) {
    $$('.cfig-zoom').forEach(btn => btn.addEventListener('click', () => {
      const img = $('img', btn), fig = btn.closest('figure');
      $('img', boite).src = img.src;
      $('img', boite).alt = img.alt;
      // Schéma à fond transparent et étiquettes noires : fond clair (la boîte est noire)
      $('img', boite).style.background = fig && fig.classList.contains('is-schema') ? '#f0f1f1' : '';
      const cap = fig && $('figcaption', fig);
      $('.lightbox-cap', boite).innerHTML = cap ? cap.innerHTML : '';
      boite.showModal();
    }));
  }

  /* ---------- Comptes rendus : copier ---------- */
  // Texte du modèle tel qu'affiché (titres de rubrique, puces, options), sans lignes vides en trop
  const texteDe = el => el.innerText.replace(/\n{3,}/g, '\n\n').trim();
  function selectionner(el) {
    const r = document.createRange();
    r.selectNodeContents(el);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(r);
  }
  $$('.cours-cr-copier').forEach(btn => btn.addEventListener('click', async () => {
    const el = document.getElementById(btn.dataset.cible);
    if (!el) return;
    const remettre = (t, d) => { btn.textContent = t; setTimeout(() => { btn.textContent = 'Copier'; }, d); };
    try {
      if (!navigator.clipboard || !navigator.clipboard.writeText) throw new Error('presse-papiers indisponible');
      await navigator.clipboard.writeText(texteDe(el));
      remettre('Copié ✓', 1600);
    } catch (e) {
      selectionner(el);
      remettre('Texte sélectionné', 2000);
    }
  }));

  /* ---------- Voir une structure dans la visionneuse 3D ---------- */
  const main = $('#coude-3d');
  $$('[data-voir]').forEach(btn => btn.addEventListener('click', () => {
    const section = $('#modele-3d');
    if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (main) main.dispatchEvent(new CustomEvent('rh-3d-selectionner', { detail: btn.dataset.voir }));
  }));

  window.RHCoudeFiche = { texteDe };
})();
