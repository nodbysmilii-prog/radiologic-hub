/* =========================================================
   RadiologicHub — Cas cliniques : bascule français / anglais
   ---------------------------------------------------------
   Chaque texte existe dans les deux langues (classes t-fr / t-en, voir
   cas.css) ; un clic sur FR ou EN change la langue affichée, le titre de
   l'onglet et les textes d'accessibilité (attributs data-en-alt,
   data-en-aria-label, data-en-title). Le choix est gardé pour les autres
   cas (stockage local du navigateur) ; ?lang=en dans l'adresse l'impose.
   Événement « rh-langue » (detail : 'fr' ou 'en') pour les autres scripts.
   ========================================================= */
(function () {
  'use strict';

  const html = document.documentElement;
  const CLE = 'rh-cas-langue';
  const ATTRIBUTS = ['alt', 'aria-label', 'title'];
  const titres = { fr: document.title, en: html.dataset.titreEn || document.title };

  const memoire = {
    lire() { try { return localStorage.getItem(CLE); } catch (e) { return null; } },
    ecrire(v) { try { localStorage.setItem(CLE, v); } catch (e) { /* stockage indisponible : choix non gardé */ } },
  };

  function appliquer(langue) {
    html.dataset.langue = langue;
    html.lang = langue;
    document.title = titres[langue];
    document.querySelectorAll('[data-en-alt], [data-en-aria-label], [data-en-title]').forEach(el => {
      ATTRIBUTS.forEach(a => {
        const en = el.getAttribute('data-en-' + a);
        if (en === null) return;
        if (!el.hasAttribute('data-fr-' + a)) el.setAttribute('data-fr-' + a, el.getAttribute(a) || '');
        el.setAttribute(a, langue === 'en' ? en : el.getAttribute('data-fr-' + a));
      });
    });
    document.querySelectorAll('.cas-langue button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.langue === langue)));
    document.dispatchEvent(new CustomEvent('rh-langue', { detail: langue }));
  }

  document.addEventListener('click', e => {
    const b = e.target.closest('.cas-langue button');
    if (!b || b.dataset.langue === html.dataset.langue) return;
    appliquer(b.dataset.langue);
    memoire.ecrire(b.dataset.langue);
  });

  const demandee = new URLSearchParams(location.search).get('lang');
  const depart = demandee === 'fr' || demandee === 'en' ? demandee : memoire.lire();
  if (depart === 'en') appliquer('en');

  // Copie flottante de la bascule : affichée quand celle de l'en-tête sort de l'écran
  const tete = document.querySelector('.cas-outils .cas-langue');
  const flottante = document.querySelector('.cas-langue-flottante');
  if (tete && flottante && 'IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => {
      const visible = !e.isIntersecting && e.boundingClientRect.top < 0;
      flottante.classList.toggle('is-visible', visible);
      flottante.inert = !visible;
    }).observe(tete);
  } else if (flottante) {
    flottante.classList.add('is-visible');
  }
})();
