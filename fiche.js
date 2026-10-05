/* =========================================================
   RadiologicHub — fiches rapides (index + pages de fiche)
   ========================================================= */

const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];

/* ---------- Menu mobile ---------- */
const toggle = $('.nav-toggle');
const nav = $('#main-nav');
if (toggle && nav) {
  const setNav = open => {
    nav.classList.toggle('is-open', open);
    document.body.classList.toggle('nav-open', open);
    toggle.setAttribute('aria-expanded', open);
    toggle.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
  };
  toggle.addEventListener('click', () => setNav(!nav.classList.contains('is-open')));
  $$('a', nav).forEach(a => a.addEventListener('click', () => setNav(false)));
}

/* ---------- Index : onglets par spécialité ---------- */
const speTabs = $$('.spe-tab');
if (speTabs.length) {
  const cards = $$('.fiche-card');
  const empty = $('#empty');
  const show = spe => {
    speTabs.forEach(t => {
      const on = t.dataset.spe === spe;
      t.classList.toggle('is-active', on);
      t.setAttribute('aria-selected', on);
    });
    let count = 0;
    cards.forEach(c => {
      const on = c.dataset.spe === spe;
      c.hidden = !on;
      if (on) count++;
    });
    empty.hidden = count > 0;
  };
  speTabs.forEach(t => t.addEventListener('click', () => {
    show(t.dataset.spe);
    history.replaceState(null, '', '#' + t.dataset.spe);
  }));
  const fromHash = location.hash.slice(1);
  show(speTabs.some(t => t.dataset.spe === fromHash) ? fromHash : 'digestif');
}

/* ---------- Fiche : filtre du code couleur ---------- */
const body = $('#fiche-body');
if (body) {
  $$('.legend .chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const k = chip.dataset.k;
      const on = body.dataset.focus !== k;
      $$('.legend .chip').forEach(c => c.setAttribute('aria-pressed', on && c === chip));
      if (on) body.dataset.focus = k; else delete body.dataset.focus;
    });
  });

  /* Tableau vasculaire : isoler une colonne */
  const table = $('.vasc-table');
  $$('.vs').forEach(btn => btn.addEventListener('click', () => {
    $$('.vs').forEach(b => {
      b.classList.toggle('is-active', b === btn);
      b.setAttribute('aria-selected', b === btn);
    });
    table.dataset.show = btn.dataset.col;
  }));

  /* Cartes à retourner */
  $$('.flip').forEach(card => card.addEventListener('click', () => {
    const on = card.classList.toggle('is-flipped');
    card.setAttribute('aria-pressed', on);
  }));

  /* Barres « siège » animées à l'apparition */
  const barObserver = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('is-in'); barObserver.unobserve(e.target); }
    });
  }, { threshold: .4 });
  $$('.bar').forEach(b => barObserver.observe(b));

  /* Sommaire actif */
  const tocLinks = $$('.toc a');
  const secObserver = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      tocLinks.forEach(l => l.classList.toggle('is-active', l.getAttribute('href') === '#' + e.target.id));
    });
  }, { rootMargin: '-35% 0px -60% 0px' });
  $$('.fsec').forEach(s => secObserver.observe(s));

  /* Barre de lecture */
  const bar = $('.read-progress span');
  const onScroll = () => {
    const h = document.documentElement;
    const p = h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight);
    bar.style.width = (p * 100).toFixed(1) + '%';
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();


  /* Exemples en imagerie : masquer les images absentes, zoom au clic */
  const syncGallery = g => { g.hidden = $$('.ex-fig', g).every(f => f.hidden); };
  $$('.ex-gallery').forEach(g => {
    $$('.ex-fig img', g).forEach(img => {
      const fig = img.closest('.ex-fig');
      const fail = () => { fig.hidden = true; syncGallery(g); };
      img.addEventListener('error', fail);
      img.loading = 'eager'; // pour détecter tout de suite les images manquantes
      if (img.complete && !img.naturalWidth) fail();
    });
  });
  const lightbox = $('#lightbox');
  if (lightbox) {
    $$('.ex-img').forEach(btn => btn.addEventListener('click', () => {
      const img = $('img', btn);
      const cap = btn.closest('.ex-fig').querySelector('figcaption');
      $('img', lightbox).src = img.src;
      $('img', lightbox).alt = img.alt;
      $('.lightbox-cap', lightbox).innerHTML = cap.innerHTML;
      lightbox.showModal();
    }));
    lightbox.addEventListener('click', e => {
      if (e.target === lightbox || e.target.closest('.modal-close') || e.target.tagName === 'IMG') lightbox.close();
    });
  }


  /* Staging T : onglets */
  $$('.t-btn').forEach(btn => btn.addEventListener('click', () => {
    $$('.t-btn').forEach(b => {
      b.classList.toggle('is-active', b === btn);
      b.setAttribute('aria-selected', b === btn);
    });
    $$('.t-panel').forEach(p => p.classList.toggle('is-active', p.dataset.t === btn.dataset.t));
  }));

  /* Checklist du compte rendu (mémorisée dans le navigateur) */
  const boxes = $$('.checklist input[type="checkbox"]');
  if (boxes.length) {
    const key = 'rh-checklist-' + location.pathname;
    const count = $('.check-count');
    const save = () => {
      try { localStorage.setItem(key, JSON.stringify(boxes.map(b => b.checked))); } catch (e) {}
    };
    const update = () => {
      const n = boxes.filter(b => b.checked).length;
      count.textContent = n === boxes.length ? 'CR complet, bravo !' : `${n} / ${boxes.length} éléments vérifiés`;
    };
    try {
      const saved = JSON.parse(localStorage.getItem(key) || '[]');
      boxes.forEach((b, i) => { b.checked = !!saved[i]; });
    } catch (e) {}
    boxes.forEach(b => b.addEventListener('change', () => { save(); update(); }));
    const reset = $('.check-reset');
    if (reset) reset.addEventListener('click', () => { boxes.forEach(b => { b.checked = false; }); save(); update(); });
    update();
  }


  /* Annexe : survol de la légende → repère l'annotation sur les images */
  $$('.case-legend li').forEach(li => {
    li.tabIndex = 0;
    const on = state => $$('.annot').forEach(svg => {
      svg.classList.toggle('is-focus', state);
      $$('.mk', svg).forEach(m => m.classList.toggle('is-on', state && m.dataset.mk === li.dataset.mk));
    });
    li.addEventListener('mouseenter', () => on(true));
    li.addEventListener('mouseleave', () => on(false));
    li.addEventListener('focus', () => on(true));
    li.addEventListener('blur', () => on(false));
  });

  /* Impression */
  const printBtn = $('#print-btn');
  if (printBtn) printBtn.addEventListener('click', () => {
    $$('.bar').forEach(b => b.classList.add('is-in'));
    window.print();
  });
}

const year = $('#year');
if (year) year.textContent = new Date().getFullYear();
