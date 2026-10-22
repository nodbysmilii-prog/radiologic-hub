/* =========================================================
   RadiologicHub — Radioanatomie › Radiographie standard
   Planche annotée : bouton unique « Afficher / Masquer les légendes »,
   mode quiz (clic sur une pastille numérotée → nom révélé),
   version compacte (téléphone) : pastilles sur le cliché + bulle.
   ========================================================= */

(() => {
  document.querySelectorAll('[data-planche]').forEach(pl => {
    const vue = pl.querySelector('.pl-vue');
    const img = pl.querySelector('.pl-img');
    const svg = pl.querySelector('.pl-calque');
    const bascule = pl.querySelector('[data-pl="bascule"]');
    const quiz = pl.querySelector('[data-pl="quiz"]');
    const barreQuiz = pl.querySelector('.pl-quiz-barre');
    const score = pl.querySelector('.pl-score');
    const bulle = pl.querySelector('.pl-bulle');
    const structures = [...svg.querySelectorAll('.pl-s')];
    const items = new Map([...pl.querySelectorAll('.pl-liste li')].map(li => [li.dataset.s, li]));
    const nom = s => items.get(s.dataset.s)?.querySelector('.pl-nom').textContent || '';

    /* Étiquettes : cadre ajusté au texte réellement affiché (police chargée). */
    const ajuster = () => svg.querySelectorAll('.pl-etiq').forEach(g => {
      const t = g.querySelector('text'), r = g.querySelector('rect');
      const b = t.getBBox(); if (!b.width) return;
      const mx = 13, my = 7;
      r.setAttribute('x', (b.x - mx).toFixed(1)); r.setAttribute('y', (b.y - my).toFixed(1));
      r.setAttribute('width', (b.width + 2 * mx).toFixed(1)); r.setAttribute('height', (b.height + 2 * my).toFixed(1));
      r.setAttribute('rx', Math.min((b.height + 2 * my) / 2, 16).toFixed(1));
    });
    ajuster();
    document.fonts?.ready.then(ajuster);

    /* Cliché absent : le calque reste lisible sur fond noir. */
    const sansImage = () => vue.classList.add('is-sans-image');
    img.addEventListener('error', sansImage);
    if (img.complete && !img.naturalWidth) sansImage();

    /* Version compacte quand le cliché est affiché trop petit pour les étiquettes. */
    new ResizeObserver(([e]) => vue.classList.toggle('is-compact', e.contentRect.width < 520)).observe(vue);

    const montrer = (s, texte) => {
      bulle.style.setProperty('--c', s.style.getPropertyValue('--c'));
      bulle.innerHTML = `<b>${s.dataset.n}</b>${texte}`;
    };
    const majScore = () => {
      const n = structures.filter(s => s.classList.contains('is-vu')).length;
      score.textContent = `${n} / ${structures.length} révélées`;
    };
    const mode = m => {
      vue.dataset.mode = m;
      pl.classList.toggle('is-quiz', m === 'quiz');
      const visibles = m === 'legendes';
      bascule.textContent = visibles ? 'Masquer les légendes' : 'Afficher les légendes';
      bascule.setAttribute('aria-pressed', visibles);
      quiz.setAttribute('aria-pressed', m === 'quiz');
      quiz.classList.toggle('btn-ink', m === 'quiz'); quiz.classList.toggle('btn-outline', m !== 'quiz');
      barreQuiz.hidden = m !== 'quiz';
      bulle.innerHTML = `<span>${m === 'quiz' ? 'Cliquez sur une pastille pour révéler la structure.' : 'Touchez une pastille pour voir le nom de la structure.'}</span>`;
      bulle.style.removeProperty('--c');
      majScore();
    };
    const reveler = (s, oui = true) => {
      s.classList.toggle('is-vu', oui);
      items.get(s.dataset.s)?.classList.toggle('is-vu', oui);
    };

    bascule.addEventListener('click', () => mode(vue.dataset.mode === 'legendes' ? 'masque' : 'legendes'));
    quiz.addEventListener('click', () => {
      if (vue.dataset.mode === 'quiz') return mode('legendes');
      structures.forEach(s => reveler(s, false));
      mode('quiz');
    });
    pl.querySelector('[data-pl="tout"]').addEventListener('click', () => { structures.forEach(s => reveler(s)); majScore(); });
    pl.querySelector('[data-pl="recommencer"]').addEventListener('click', () => { structures.forEach(s => reveler(s, false)); mode('quiz'); });

    /* Pastille : révèle (quiz) ou nomme (version compacte). */
    structures.forEach(s => {
      const num = s.querySelector('.pl-num');
      const agir = () => {
        if (vue.dataset.mode === 'quiz') { reveler(s); majScore(); }
        montrer(s, nom(s));
      };
      num.addEventListener('click', agir);
      num.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); agir(); } });
      num.setAttribute('aria-label', `Structure ${s.dataset.n}`);
    });

    /* Survol d'un nom de la liste : la structure ressort sur le cliché. */
    items.forEach((li, id) => {
      const s = structures.find(x => x.dataset.s === id);
      const on = v => {
        if (vue.dataset.mode === 'quiz' && !s.classList.contains('is-vu')) return;
        vue.classList.toggle('is-focus', v); s.classList.toggle('is-on', v); li.classList.toggle('is-on', v);
      };
      li.addEventListener('mouseenter', () => on(true));
      li.addEventListener('mouseleave', () => on(false));
      li.addEventListener('click', () => { on(true); setTimeout(() => on(false), 1200); });
    });

    mode('legendes');
  });
})();
