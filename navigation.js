/* =========================================================
   RadiologicHub — navigation commune (toutes les pages)
   • menu principal : ouverture / fermeture sur tablette et téléphone
     (bouton, touche Échap, clic hors du menu, choix d'un lien),
     focus placé sur le premier lien puis rendu au bouton ;
   • rubrique active : aria-current="page" sur le lien marqué is-current ;
   • en-tête transparent de l'accueil : fond dès que la page défile ;
   • menus déroulants [data-menu] (se ferment seuls) et volets
     dépliables [data-depliant] (restent ouverts, état mémorisé).
   Le menu et le pied de page sont écrits dans chaque page par
   scripts/menu_commun.py (même ordre, mêmes intitulés partout).
   ========================================================= */
(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* ---------- Rubrique active ---------- */
  $$('.main-nav a.is-current').forEach(a => a.setAttribute('aria-current', 'page'));

  /* ---------- En-tête de l'accueil : transparent en haut de page ---------- */
  const entete = $('.site-header');
  if (entete && !entete.classList.contains('is-scrolled')) {
    const defile = () => entete.classList.toggle('is-scrolled', window.scrollY > 30);
    window.addEventListener('scroll', defile, { passive: true });
    defile();
  }

  /* ---------- Menu principal (tablette, téléphone) ---------- */
  const bouton = $('.nav-toggle'), menu = $('#main-nav');
  if (bouton && menu) {
    const ouvert = () => menu.classList.contains('is-open');
    const regler = (etat, rendreFocus) => {
      menu.classList.toggle('is-open', etat);
      document.body.classList.toggle('nav-open', etat);
      bouton.setAttribute('aria-expanded', String(etat));
      bouton.setAttribute('aria-label', etat ? 'Fermer le menu' : 'Ouvrir le menu');
      if (etat) { const premier = $('a', menu); if (premier) premier.focus({ preventScroll: true }); }
      else if (rendreFocus) bouton.focus();
    };
    bouton.addEventListener('click', () => regler(!ouvert(), false));
    $$('a', menu).forEach(a => a.addEventListener('click', () => { if (ouvert()) regler(false, false); }));
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && ouvert()) regler(false, true); });
    document.addEventListener('click', e => {
      if (ouvert() && !menu.contains(e.target) && !bouton.contains(e.target)) regler(false, false);
    });
    // Retour à la largeur d'ordinateur : menu refermé
    const large = window.matchMedia('(min-width: 1141px)');
    const auChangement = () => { if (large.matches && ouvert()) regler(false, false); };
    if (large.addEventListener) large.addEventListener('change', auChangement);
  }

  /* ---------- Menus déroulants : <button data-menu aria-controls="id" aria-expanded="false"> ---------- */
  $$('[data-menu]').forEach(b => {
    const panneau = document.getElementById(b.getAttribute('aria-controls'));
    if (!panneau) return;
    const regler = (etat, rendreFocus) => {
      panneau.hidden = !etat;
      b.setAttribute('aria-expanded', String(etat));
      if (!etat && rendreFocus) b.focus();
    };
    regler(false, false);
    b.addEventListener('click', () => {
      const etat = panneau.hidden;
      regler(etat, false);
      if (etat) { const premier = $('button:not([disabled]), a, [tabindex="0"]', panneau); if (premier) premier.focus(); }
    });
    panneau.addEventListener('click', e => { if (e.target.closest('button, a')) regler(false, false); });
    panneau.addEventListener('keydown', e => {
      if (e.key === 'Escape') { e.stopPropagation(); regler(false, true); return; }
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      const items = $$('button:not([disabled]), a', panneau), i = items.indexOf(document.activeElement);
      if (i < 0) return;
      e.preventDefault();
      items[(i + (e.key === 'ArrowDown' ? 1 : items.length - 1)) % items.length].focus();
    });
    b.addEventListener('keydown', e => { if (e.key === 'Escape' && !panneau.hidden) regler(false, true); });
    document.addEventListener('click', e => { if (!panneau.hidden && !panneau.contains(e.target) && !b.contains(e.target)) regler(false, false); });
    document.addEventListener('focusin', e => { if (!panneau.hidden && !panneau.contains(e.target) && e.target !== b) regler(false, false); });
  });

  /* ---------- Volets dépliables : <button data-depliant="clé" aria-controls="id" aria-expanded> ---------- */
  $$('[data-depliant]').forEach(b => {
    const panneau = document.getElementById(b.getAttribute('aria-controls'));
    if (!panneau) return;
    const cle = 'rh-depliant-' + b.dataset.depliant;
    let memoire = null;
    try { memoire = localStorage.getItem(cle); } catch (e) { /* stockage indisponible */ }
    const regler = etat => {
      panneau.hidden = !etat;
      b.setAttribute('aria-expanded', String(etat));
      const cible = b.closest('[data-depliant-boite]');
      if (cible) cible.classList.toggle('is-ouvert', etat);
    };
    regler(memoire === null ? b.getAttribute('aria-expanded') === 'true' : memoire === '1');
    b.addEventListener('click', () => {
      const etat = panneau.hidden;
      regler(etat);
      try { localStorage.setItem(cle, etat ? '1' : '0'); } catch (e) { /* stockage indisponible */ }
    });
  });
})();
