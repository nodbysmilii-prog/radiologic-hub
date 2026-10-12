/* =========================================================
   Section Pelvis — recherche dans les fiches, menu du chapitre,
   section active du sommaire latéral.
   Index : pelvis/recherche.js (généré par scripts/construire-pelvis.js).
   ========================================================= */
(() => {
  const D = window.PelvisRecherche || [];
  const racine = document.body.dataset.pvRacine || '';
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* Texte sans accents ni majuscules, avec la position de chaque caractère dans le texte d'origine
     (pour surligner les mots trouvés dans le texte affiché) */
  function plier(s) {
    let t = '';
    const pos = [];
    for (let i = 0; i < s.length; i++) {
      const c = s[i].normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
      for (const x of c) { t += x; pos.push(i); }
    }
    pos.push(s.length);
    return { t, pos };
  }
  const norm = s => plier(s).t;

  const DOCS = D.map(f => ({
    f,
    titre: norm(`${f.t} ${f.n}`),
    bref: norm(f.b),
    sections: f.s.map(s => ({ s, titre: norm(s.t), texte: norm(s.x) })),
  }));

  const compter = (h, m) => { let n = 0, i = 0; while ((i = h.indexOf(m, i)) >= 0) { n++; i += m.length; } return n; };

  function chercher(q) {
    const mots = norm(q).split(/[^a-z0-9œæ≥≤%-]+/).filter(m => m.length >= 2);
    if (!mots.length) return { mots, res: [] };
    const res = [];
    for (const d of DOCS) {
      const tout = `${d.titre} ${d.bref} ${d.sections.map(s => `${s.titre} ${s.texte}`).join(' ')}`;
      if (!mots.every(m => tout.includes(m))) continue;
      let score = 0;
      mots.forEach(m => { score += (d.titre.includes(m) ? 30 : 0) + (d.bref.includes(m) ? 6 : 0) + Math.min(10, compter(tout, m)); });
      // Section la plus pertinente : celle qui contient le plus de mots (titre de section compté double)
      let best = null, bestN = 0;
      d.sections.forEach(s => {
        const n = mots.reduce((a, m) => a + (s.titre.includes(m) ? 2 : 0) + (s.texte.includes(m) ? 1 : 0), 0);
        if (n > bestN) { best = s; bestN = n; }
      });
      res.push({ d, score, sec: best });
    }
    res.sort((a, b) => b.score - a.score || a.d.f.u.localeCompare(b.d.f.u));
    return { mots, res: res.slice(0, 8) };
  }

  /* Extrait autour du premier mot trouvé, mots surlignés */
  function extrait(texte, mots, largeur = 70) {
    const { t, pos } = plier(texte);
    let i0 = -1;
    for (const m of mots) { const i = t.indexOf(m); if (i >= 0 && (i0 < 0 || i < i0)) i0 = i; }
    if (i0 < 0) return esc(texte.length > 2 * largeur ? texte.slice(0, 2 * largeur) + '…' : texte);
    const a = Math.max(0, pos[i0] - largeur), b = Math.min(texte.length, pos[i0] + largeur * 1.6);
    // Zones à surligner (positions d'origine)
    const zones = [];
    for (const m of mots) {
      let i = 0;
      while ((i = t.indexOf(m, i)) >= 0) { zones.push([pos[i], pos[i + m.length]]); i += m.length; }
    }
    zones.sort((x, y) => x[0] - y[0]);
    let h = a > 0 ? '…' : '', k = a;
    for (const [z0, z1] of zones) {
      if (z1 <= k || z0 >= b) continue;
      const d = Math.max(z0, k), f = Math.min(z1, b);
      h += esc(texte.slice(k, d)) + `<mark>${esc(texte.slice(d, f))}</mark>`;
      k = f;
    }
    return h + esc(texte.slice(k, b)) + (b < texte.length ? '…' : '');
  }

  function afficher(form, q) {
    const out = form.querySelector('.pv-resultats');
    const { mots, res } = chercher(q);
    if (!mots.length) { out.innerHTML = ''; return; }
    if (!res.length) { out.innerHTML = `<li class="pv-aucun">Aucune fiche ne contient « ${esc(q.trim())} ».</li>`; return; }
    out.innerHTML = res.map(({ d, sec }) => {
      const s = sec && sec.s;
      const lien = racine + d.f.u + (s && s.i ? '#' + s.i : '');
      const texte = s ? (s.x || s.t) : d.f.b;
      return `<li><a href="${esc(lien)}"><b>${esc(d.f.t)}</b>${s && s.t ? `<span class="pv-res-sec">${esc(s.t)}</span>` : ''}<small>${extrait(texte, mots)}</small></a></li>`;
    }).join('');
  }

  document.querySelectorAll('[data-pv-recherche]').forEach(form => {
    const input = form.querySelector('input');
    let minuterie;
    input.addEventListener('input', () => { clearTimeout(minuterie); minuterie = setTimeout(() => afficher(form, input.value), 80); });
    input.addEventListener('keydown', e => { if (e.key === 'Escape') { input.value = ''; afficher(form, ''); } });
    form.addEventListener('submit', e => {
      e.preventDefault();
      afficher(form, input.value);
      const a = form.querySelector('.pv-resultats a');
      if (a) location.href = a.href;
    });
    // Recherche passée dans l'adresse : …/pelvis/index.html?q=torsion
    const q = new URLSearchParams(location.search).get('q');
    if (q && form.classList.contains('pv-recherche-grande')) { input.value = q; afficher(form, q); }
  });

  /* Menu du chapitre : ouvert sur ordinateur (sommaire latéral), replié sur téléphone */
  const menu = document.querySelector('.pv-menu');
  if (menu) {
    const large = matchMedia('(min-width: 1001px)');
    const maj = () => { menu.open = large.matches; };
    maj();
    large.addEventListener('change', maj);
    menu.querySelectorAll('.pv-sections a').forEach(a => a.addEventListener('click', () => { if (!large.matches) menu.open = false; }));
  }

  /* Section active dans le sommaire latéral */
  const liens = [...document.querySelectorAll('.pv-sections a')];
  if (liens.length && 'IntersectionObserver' in window) {
    const obs = new IntersectionObserver(entrees => {
      entrees.forEach(e => {
        if (!e.isIntersecting) return;
        liens.forEach(l => l.classList.toggle('is-active', l.getAttribute('href') === '#' + e.target.id));
      });
    }, { rootMargin: '-30% 0px -60% 0px' });
    document.querySelectorAll('.pv-sec').forEach(s => obs.observe(s));
  }
})();
