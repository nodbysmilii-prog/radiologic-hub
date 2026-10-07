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
      const lbWrap = $('.lb-wrap', lightbox);
      if (lbWrap) {
        $$('.annot', lbWrap).forEach(s => s.remove());
        const ov = $('.annot', btn);
        if (ov) lbWrap.appendChild(ov.cloneNode(true));
      }
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



  /* Annexe repliable */
  $$('.annex-toggle').forEach(btn => {
    const panel = document.getElementById(btn.getAttribute('aria-controls'));
    btn.addEventListener('click', () => {
      const open = btn.getAttribute('aria-expanded') !== 'true';
      btn.setAttribute('aria-expanded', open);
      panel.hidden = !open;
      if (open) panel.querySelectorAll('img[loading="lazy"]').forEach(i => { i.loading = 'eager'; });
    });
  });
  // Lien direct vers #annexe : ouvrir automatiquement
  const openAnnex = () => { const t = $('.annex-toggle'); if (t && t.getAttribute('aria-expanded') !== 'true') t.click(); };
  if (location.hash.startsWith('#annexe')) { openAnnex(); const el = document.querySelector(location.hash); if (el) setTimeout(() => el.scrollIntoView(), 50); }
  $$('[data-open-annex]').forEach(a => a.addEventListener('click', openAnnex));

  /* Carrousel d'images */
  $$('.carousel').forEach(car => {
    const track = $('.car-track', car);
    const slides = $$('.car-slide', car);
    const prev = $('.car-prev', car), next = $('.car-next', car);
    const count = $('.car-count', car), dotsBox = $('.car-dots', car);
    let idx = 0;
    const dots = slides.map((_, i) => {
      const d = document.createElement('button');
      d.type = 'button';
      d.setAttribute('aria-label', 'Image ' + (i + 1));
      d.addEventListener('click', () => go(i));
      dotsBox.appendChild(d);
      return d;
    });
    const render = () => {
      count.textContent = (idx + 1) + ' / ' + slides.length;
      dots.forEach((d, i) => d.setAttribute('aria-current', i === idx));
      prev.disabled = idx === 0;
      next.disabled = idx === slides.length - 1;
    };
    const go = i => {
      idx = Math.max(0, Math.min(slides.length - 1, i));
      track.scrollTo({ left: slides[idx].offsetLeft - track.offsetLeft - 4, behavior: 'smooth' });
      render();
    };
    prev.addEventListener('click', () => go(idx - 1));
    next.addEventListener('click', () => go(idx + 1));
    track.addEventListener('keydown', e => {
      if (e.key === 'ArrowRight') { e.preventDefault(); go(idx + 1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(idx - 1); }
    });
    let t;
    track.addEventListener('scroll', () => {
      clearTimeout(t);
      t = setTimeout(() => {
        const i = Math.round(track.scrollLeft / (slides[0].offsetWidth + 20));
        if (i !== idx) { idx = i; render(); }
      }, 80);
    }, { passive: true });
    render();
  });

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


  /* Tableau comparatif : mettre une colonne en avant */
  $$('.cmp-switch').forEach(sw => {
    const table = document.getElementById(sw.getAttribute('aria-controls'));
    if (!table) return;
    $$('button', sw).forEach(btn => btn.addEventListener('click', () => {
      $$('button', sw).forEach(b => {
        b.classList.toggle('is-active', b === btn);
        b.setAttribute('aria-pressed', b === btn);
      });
      table.dataset.show = btn.dataset.col;
    }));
  });

  /* Quiz « Quel germe ? » */
  $$('.germ-quiz').forEach(quiz => {
    const items = $$('.gq-item', quiz);
    const score = $('.gq-score', quiz);
    const update = () => {
      const done = items.filter(i => i.dataset.result);
      const good = done.filter(i => i.dataset.result === 'ok').length;
      if (!done.length) { score.textContent = ''; return; }
      score.textContent = `Score : ${good} / ${done.length}` + (done.length === items.length ? (good === items.length ? ' — sans faute, bravo !' : ' — relisez le tableau comparatif !') : '');
    };
    items.forEach(item => {
      const answer = item.dataset.answer;
      const fb = $('.gq-fb', item);
      $$('[data-pick]', item).forEach(btn => btn.addEventListener('click', () => {
        if (item.dataset.result) return;
        const ok = btn.dataset.pick === answer;
        item.dataset.result = ok ? 'ok' : 'ko';
        $$('[data-pick]', item).forEach(b => {
          b.disabled = true;
          b.classList.toggle('is-right', b.dataset.pick === answer);
          if (b === btn && !ok) b.classList.add('is-wrong');
        });
        fb.hidden = false;
        fb.classList.toggle('is-ok', ok);
        $('.gq-verdict', fb).textContent = ok ? 'Bien vu !' : 'Presque…';
        update();
      }));
    });
  });

  /* Schéma sectoriel de la prostate (schemas/prostate.js), légendé par zone */
  if (window.RHProstate) {
    const ZC = { PZ: '#cfe8d6', TZ: '#f6e7c3', AS: '#e9e2d6', CZ: '#e4d9ee' };
    const fond = id => {
      const z = window.RHProstate.parse(id).zone;
      return z.startsWith('PZ') ? ZC.PZ : z.startsWith('TZ') ? ZC.TZ : ZC[z] || '#fbfbfb';
    };
    $$('[data-prostate-schema]').forEach(el => {
      el.innerHTML = window.RHProstate.svg({
        fondZone: fond, titreLegende: 'Zones :',
        legende: [['PZ', ZC.PZ], ['TZ', ZC.TZ], ['AS (SFMA)', ZC.AS], ['CZ', ZC.CZ]],
      });
    });
  }

  /* Impression */
  const printBtn = $('#print-btn');
  if (printBtn) printBtn.addEventListener('click', () => {
    $$('.bar').forEach(b => b.classList.add('is-in'));
    window.print();
  });
}

const year = $('#year');
if (year) year.textContent = new Date().getFullYear();
