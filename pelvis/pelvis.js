/* =========================================================
   Section Pelvis — recherche dans les fiches, menu des chapitres,
   rangée de puces des sections (suit la section lue sur téléphone).
   Index : pelvis/recherche.js (généré par scripts/construire-pelvis.js),
   chargé à la première recherche.
   ========================================================= */
(() => {
  const corps = document.body;
  const racine = corps.dataset.pvRacine || '';
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

  /* Index chargé à la demande */
  let DOCS = null, chargement = null;
  function charger() {
    if (DOCS) return Promise.resolve(DOCS);
    if (!chargement) {
      chargement = new Promise((ok, ko) => {
        if (window.PelvisRecherche) return ok();
        const s = document.createElement('script');
        s.src = corps.dataset.pvIndex;
        s.onload = ok; s.onerror = ko;
        document.head.appendChild(s);
      }).then(() => {
        DOCS = (window.PelvisRecherche || []).map(f => ({
          f, titre: norm(`${f.t} ${f.n}`), bref: norm(f.b), chap: norm(f.c),
          sections: f.s.map(s => ({ s, titre: norm(s.t), texte: norm(s.x) })),
        }));
        return DOCS;
      });
    }
    return chargement;
  }

  const compter = (h, m) => { let n = 0, i = 0; while ((i = h.indexOf(m, i)) >= 0) { n++; i += m.length; } return n; };

  function chercher(q) {
    const mots = norm(q).split(/[^a-z0-9œæ≥≤%-]+/).filter(m => m.length >= 2);
    if (!mots.length || !DOCS) return { mots, res: [] };
    const res = [];
    for (const d of DOCS) {
      const tout = `${d.titre} ${d.bref} ${d.chap} ${d.sections.map(s => `${s.titre} ${s.texte}`).join(' ')}`;
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
      return `<li><a href="${esc(lien)}"><b>${esc(d.f.t)}</b><span class="pv-res-sec">${esc(d.f.c)}${s && s.t ? ` · ${esc(s.t)}` : ''}</span><small>${extrait(texte, mots)}</small></a></li>`;
    }).join('');
  }

  document.querySelectorAll('[data-pv-recherche]').forEach(form => {
    const input = form.querySelector('input');
    let minuterie;
    const lancer = () => charger().then(() => afficher(form, input.value)).catch(() => {
      form.querySelector('.pv-resultats').innerHTML = '<li class="pv-aucun">Recherche indisponible (index non chargé).</li>';
    });
    input.addEventListener('focus', () => { charger().catch(() => {}); }, { once: true });
    input.addEventListener('input', () => { clearTimeout(minuterie); minuterie = setTimeout(lancer, 80); });
    input.addEventListener('keydown', e => { if (e.key === 'Escape') { input.value = ''; afficher(form, ''); } });
    form.addEventListener('submit', e => {
      e.preventDefault();
      charger().then(() => {
        afficher(form, input.value);
        const a = form.querySelector('.pv-resultats a');
        if (a) location.href = a.href;
      });
    });
    // Recherche passée dans l'adresse : …/pelvis/index.html?q=torsion
    const q = new URLSearchParams(location.search).get('q');
    if (q && form.classList.contains('pv-recherche-grande')) { input.value = q; lancer(); }
  });

  /* Menu des chapitres : ouvert sur ordinateur (sommaire latéral), replié sur téléphone */
  const menu = document.querySelector('.pv-menu');
  const large = matchMedia('(min-width: 1001px)');
  if (menu) {
    const maj = () => { menu.open = large.matches; };
    maj();
    large.addEventListener('change', maj);
  }

  /* Rangée de puces (téléphone) : la puce de la section lue reste visible */
  const rangee = document.querySelector('.pv-puces');
  if (rangee && 'MutationObserver' in window) {
    new MutationObserver(() => {
      const a = rangee.querySelector('a.is-active');
      if (!a || large.matches) return;
      const g = a.offsetLeft - (rangee.clientWidth - a.offsetWidth) / 2;
      rangee.scrollTo({ left: Math.max(0, g), behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    }).observe(rangee, { attributes: true, subtree: true, attributeFilter: ['class'] });
  }
})();
