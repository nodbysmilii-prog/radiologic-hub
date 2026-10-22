/* =========================================================
   RadiologicHub — Espace radioanatomie : atlas de coupes légendées
   ---------------------------------------------------------
   • Données : atlas.json (dossier indiqué par data-atlas) : séries d'images (une image JPEG
     par coupe), catégories (nom, couleur), structures (nom, catégorie) et, pour chaque coupe,
     les repères [id, x, y] en pixels de l'image (construire_atlas_genou.py).
   • Présentation inspirée des atlas sur téléphone : image au centre, étiquettes colorées par
     catégorie dans deux colonnes, reliées par une ligne de rappel au point repéré ; menu des
     catégories à interrupteurs ; les étiquettes se répartissent sans se chevaucher.
   • Défilement : molette, flèches du clavier, glisser verticalement sur l'image, curseur.
   • Quiz : les noms sont masqués (« ? ») ; toucher une étiquette révèle la structure.
   ========================================================= */
(function () {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const station = $('[data-atlas]');
  if (!station) return;

  const scene = $('.ac-scene', station);
  const cadre = $('.ac-cadre', station);
  const img = $('img', cadre);
  const traits = $('.ac-traits', station);
  const curseur = $('.ac-coupe input', station);
  const compteur = $('.ac-compteur', station);
  const info = $('.ac-info', station);
  const panneau = $('.ac-panneau', station);
  const listeCats = $('.ac-panneau-liste', station);
  const barreQuiz = $('.ac-quiz-barre', station);
  const score = $('.ac-score', station);
  const vide = $('.ac-vide', station);
  const or = { haut: $('.ac-or-haut', station), bas: $('.ac-or-bas', station), gauche: $('.ac-or-gauche', station), droite: $('.ac-or-droite', station) };
  const SVG = 'http://www.w3.org/2000/svg';

  let A = null;
  const etat = { serie: 0, coupes: [], cats: new Set(), legendes: true, quiz: false, vus: new Set(), focus: null, epingle: null };
  const pool = [];
  let geo = null;

  const S = () => A.series[etat.serie];
  const k = () => etat.coupes[etat.serie];
  const nomStructure = id => A.structures[id].nom;
  const cat = id => A.categories.find(c => c.id === A.structures[id].cat);
  const cleVu = id => `${S().id}:${k()}:${id}`;
  const fichier = (s, c) => `${station.dataset.base}${s.dossier}${String(c).padStart(2, '0')}.jpg`;

  /* ---------- Chargement ---------- */
  fetch(station.dataset.base + station.dataset.atlas)
    .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(donnees => {
      A = donnees;
      A.categories.forEach(c => etat.cats.add(c.id));
      etat.coupes = A.series.map(s => {
        const legendees = s.reperes.map((r, i) => [r.length, i]).filter(([n]) => n);
        return legendees.length ? legendees.sort((a, b) => b[0] - a[0])[0][1] : Math.floor(s.coupes / 2);
      });
      construireSeries();
      construireCategories();
      $('.ac-chargement', station)?.remove();
      changerSerie(0);
      new ResizeObserver(() => dessiner()).observe(scene);
    })
    .catch(e => { const c = $('.ac-chargement', station); if (c) c.textContent = 'Impossible de charger l\'atlas (' + e.message + ').'; });

  function construireSeries() {
    const boite = $('.ac-series', station);
    A.series.forEach((s, i) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'ac-serie'; b.dataset.i = i; b.setAttribute('aria-pressed', 'false');
      b.innerHTML = `<img src="${fichier(s, etat.coupes[i])}" alt="" loading="lazy"><span>${s.nom}<small>${s.coupes} coupes</small></span>`;
      b.addEventListener('click', () => changerSerie(i));
      boite.appendChild(b);
    });
  }

  function construireCategories() {
    listeCats.innerHTML = '';
    A.categories.forEach(c => {
      const li = document.createElement('li');
      li.innerHTML = `<label class="ac-cat" style="--c: ${c.couleur}"><span class="ac-cat-pastille"></span><span class="ac-cat-nom">${c.nom}</span><span class="ac-cat-nb" data-nb="${c.id}"></span><input type="checkbox" data-cat="${c.id}" checked><span class="ac-interrupteur" aria-hidden="true"></span></label>`;
      li.querySelector('input').addEventListener('change', e => {
        if (e.target.checked) etat.cats.add(c.id); else etat.cats.delete(c.id);
        dessiner();
      });
      listeCats.appendChild(li);
    });
  }

  function changerSerie(i) {
    etat.serie = i; etat.focus = etat.epingle = null;
    station.querySelectorAll('.ac-serie').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.i === i)));
    const s = S();
    curseur.max = s.coupes - 1; curseur.value = k();
    [or.haut.textContent, or.bas.textContent, or.gauche.textContent, or.droite.textContent] = s.orientation;
    dessiner();
  }

  function allerCoupe(c) {
    const s = S(); c = Math.max(0, Math.min(s.coupes - 1, c));
    if (c === k()) return;
    etat.coupes[etat.serie] = c; curseur.value = c; etat.epingle = null; etat.focus = null;
    dessiner();
  }

  /* ---------- Mise en page ---------- */
  function mesures() {
    const s = S(), W = scene.clientWidth;
    const frac = W >= 900 ? .5 : W >= 600 ? .52 : .54;
    const iw = Math.round(Math.min(W * frac, 600));
    const ih = Math.round(iw * s.hauteur / s.largeur);
    const col = (W - iw) / 2;
    return { W, iw, ih, col };
  }

  function etiquette(i) {
    if (!pool[i]) {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'ac-etiq';
      b.addEventListener('mouseenter', () => { etat.focus = b.dataset.id; surligner(); });
      b.addEventListener('mouseleave', () => { etat.focus = null; surligner(); });
      b.addEventListener('focus', () => { etat.focus = b.dataset.id; surligner(); });
      b.addEventListener('blur', () => { etat.focus = null; surligner(); });
      b.addEventListener('click', () => toucher(b.dataset.id));
      scene.appendChild(b); pool[i] = b;
    }
    return pool[i];
  }

  function toucher(id) {
    if (etat.quiz && !etat.vus.has(cleVu(id))) { etat.vus.add(cleVu(id)); etat.epingle = id; dessiner(); return; }
    etat.epingle = etat.epingle === id ? null : id;
    surligner();
  }

  function dessiner() {
    if (!A) return;
    const s = S(), c = k();
    const m = mesures();
    img.src = fichier(s, c);
    img.alt = `${s.nom}, coupe ${c + 1} sur ${s.coupes}`;
    [c - 1, c + 1].forEach(n => { if (n >= 0 && n < s.coupes) new Image().src = fichier(s, n); });
    compteur.textContent = `Coupe ${c + 1} / ${s.coupes}`;

    const tous = s.reperes[c];
    const reps = tous.filter(([id]) => etat.cats.has(A.structures[id].cat));
    // nombres par catégorie (menu)
    A.categories.forEach(ct => {
      const n = tous.filter(([id]) => A.structures[id].cat === ct.id).length;
      const el = listeCats.querySelector(`[data-nb="${ct.id}"]`); if (el) el.textContent = n ? n : '';
    });

    // côtés : selon la position du point, puis équilibrage
    const items = reps.map(([id, x, y]) => ({ id, x, y, g: x < s.largeur / 2 }));
    const eq = () => items.filter(t => t.g).length - items.filter(t => !t.g).length;
    while (Math.abs(eq()) > 2) {
      const versD = eq() > 0;
      const cand = items.filter(t => t.g === versD).sort((a, b) => Math.abs(a.x - s.largeur / 2) - Math.abs(b.x - s.largeur / 2))[0];
      cand.g = !versD;
    }

    // étiquettes : texte, largeur, hauteur mesurée
    const largeurCol = Math.max(60, m.col - 14);
    items.forEach((t, i) => {
      const b = etiquette(i), ct = cat(t.id), vu = !etat.quiz || etat.vus.has(cleVu(t.id));
      b.hidden = false; b.dataset.id = t.id;
      b.className = 'ac-etiq ' + (t.g ? 'cote-g' : 'cote-d') + (vu ? '' : ' is-cache');
      b.style.setProperty('--c', ct.couleur);
      b.textContent = vu ? nomStructure(t.id) : '?';
      b.title = vu ? `${nomStructure(t.id)} (${ct.nom})` : `Structure à trouver (${ct.nom})`;
      b.setAttribute('aria-label', vu ? `${nomStructure(t.id)}, ${ct.nom}` : `Structure à trouver, catégorie ${ct.nom} ; toucher pour révéler`);
      b.style.width = largeurCol + 'px';
      b.style.left = t.g ? '6px' : (m.W - m.col + 8) + 'px';
      t.el = b;
    });
    for (let i = items.length; i < pool.length; i++) pool[i].hidden = true;
    items.forEach(t => { t.h = t.el.offsetHeight; });

    const ecart = 6, marge = 8;
    const hauteurCol = cote => items.filter(t => t.g === cote).reduce((a, t) => a + t.h + ecart, 0);
    const H = Math.max(m.ih + 56, hauteurCol(true) + 2 * marge, hauteurCol(false) + 2 * marge, 300);
    scene.style.height = H + 'px';
    const top = Math.round((H - m.ih) / 2);
    Object.assign(cadre.style, { left: m.col + 'px', top: top + 'px', width: m.iw + 'px', height: m.ih + 'px' });
    geo = { ...m, top, H };

    // positions verticales : au plus près du point, sans chevauchement
    [true, false].forEach(cote => {
      const col = items.filter(t => t.g === cote).map(t => ({ t, ay: top + t.y * m.ih / s.hauteur }))
        .sort((a, b) => a.ay - b.ay);
      let bas = marge - ecart;
      col.forEach(o => { o.y = Math.max(o.ay - o.t.h / 2, bas + ecart); bas = o.y + o.t.h; });
      let haut = H - marge + ecart;
      for (let i = col.length - 1; i >= 0; i--) { const o = col[i]; o.y = Math.min(o.y, haut - ecart - o.t.h); haut = o.y; }
      col.forEach(o => { o.y = Math.max(o.y, marge); o.t.el.style.top = Math.round(o.y) + 'px'; o.t.ly = o.y + o.t.h / 2; });
    });

    // lignes de rappel et points
    traits.setAttribute('viewBox', `0 0 ${m.W} ${H}`);
    traits.innerHTML = '';
    items.forEach(t => {
      const ax = m.col + t.x * m.iw / s.largeur, ay = top + t.y * m.ih / s.hauteur;
      const x0 = t.g ? 6 + largeurCol : m.W - m.col + 8, x1 = t.g ? x0 + 10 : x0 - 10;
      const g = document.createElementNS(SVG, 'g');
      g.dataset.id = t.id; g.style.setProperty('--c', cat(t.id).couleur);
      g.innerHTML = `<path class="ac-trait" d="M${x0.toFixed(1)} ${t.ly.toFixed(1)} H${x1.toFixed(1)} L${ax.toFixed(1)} ${ay.toFixed(1)}"/><circle class="ac-point" cx="${ax.toFixed(1)}" cy="${ay.toFixed(1)}" r="3.6"/>`;
      traits.appendChild(g);
    });

    vide.hidden = items.length > 0 || !etat.legendes;
    vide.textContent = tous.length ? 'Aucune structure des catégories choisies sur cette coupe.' : 'Pas de légende sur cette coupe : faites défiler.';
    majQuiz(items.length);
    surligner();
  }

  function surligner() {
    const id = etat.focus || etat.epingle;
    traits.querySelectorAll('g').forEach(g => { g.classList.toggle('is-on', g.dataset.id === id); g.classList.toggle('is-off', !!id && g.dataset.id !== id); });
    pool.forEach(b => { if (!b.hidden) { b.classList.toggle('is-on', b.dataset.id === id); b.classList.toggle('is-off', !!id && b.dataset.id !== id); } });
    const s = S();
    if (id && (!etat.quiz || etat.vus.has(cleVu(id)))) {
      const ct = cat(id);
      info.style.setProperty('--c', ct.couleur);
      info.innerHTML = `<b>${nomStructure(id)}</b> · ${ct.nom}`;
    } else {
      info.style.removeProperty('--c');
      info.textContent = `${s.description} · genou ${s.cote} · coupe ${k() + 1} / ${s.coupes}`;
    }
  }

  function majQuiz(n) {
    barreQuiz.hidden = !etat.quiz;
    if (!etat.quiz) return;
    const s = S(), ids = s.reperes[k()].filter(([id]) => etat.cats.has(A.structures[id].cat)).map(([id]) => id);
    const vus = ids.filter(id => etat.vus.has(cleVu(id))).length;
    score.textContent = n ? `${vus} / ${ids.length} trouvées sur cette coupe` : 'Rien à trouver ici';
  }

  /* ---------- Commandes ---------- */
  curseur.addEventListener('input', () => allerCoupe(+curseur.value));
  scene.addEventListener('wheel', e => { e.preventDefault(); allerCoupe(k() + (e.deltaY > 0 ? 1 : -1)); }, { passive: false });
  scene.addEventListener('keydown', e => {
    const d = { ArrowDown: 1, ArrowRight: 1, PageDown: 3, ArrowUp: -1, ArrowLeft: -1, PageUp: -3 }[e.key];
    if (d) { e.preventDefault(); allerCoupe(k() + d); }
  });
  let glisse = null;
  cadre.addEventListener('pointerdown', e => { glisse = { y: e.clientY, c: k(), id: e.pointerId }; cadre.setPointerCapture(e.pointerId); });
  cadre.addEventListener('pointermove', e => {
    if (!glisse || e.pointerId !== glisse.id) return;
    const pas = Math.max(8, geo.ih / S().coupes / 1.2);
    allerCoupe(glisse.c + Math.round((e.clientY - glisse.y) / pas));
  });
  const fin = () => { glisse = null; };
  cadre.addEventListener('pointerup', fin); cadre.addEventListener('pointercancel', fin);
  cadre.style.touchAction = 'none';

  station.querySelector('[data-ac="legendes"]').addEventListener('click', e => {
    etat.legendes = !etat.legendes;
    e.currentTarget.setAttribute('aria-pressed', String(etat.legendes));
    e.currentTarget.querySelector('span').textContent = etat.legendes ? 'Légendes' : 'Légendes masquées';
    scene.classList.toggle('is-sans-legende', !etat.legendes);
    dessiner();
  });
  station.querySelector('[data-ac="quiz"]').addEventListener('click', e => {
    etat.quiz = !etat.quiz; etat.vus.clear(); etat.epingle = null;
    e.currentTarget.setAttribute('aria-pressed', String(etat.quiz));
    if (etat.quiz && !etat.legendes) station.querySelector('[data-ac="legendes"]').click(); else dessiner();
  });
  station.querySelector('[data-ac="tout"]').addEventListener('click', () => {
    S().reperes[k()].forEach(([id]) => etat.vus.add(cleVu(id))); dessiner();
  });
  station.querySelector('[data-ac="recommencer"]').addEventListener('click', () => {
    S().reperes[k()].forEach(([id]) => etat.vus.delete(cleVu(id))); etat.epingle = null; dessiner();
  });
  const btnCats = station.querySelector('[data-ac="categories"]');
  const basculerPanneau = ouvert => {
    panneau.classList.toggle('is-ouvert', ouvert); btnCats.setAttribute('aria-expanded', String(ouvert));
    panneau.setAttribute('aria-hidden', String(!ouvert));
    panneau.querySelectorAll('input, button').forEach(el => { el.tabIndex = ouvert ? 0 : -1; });
    if (ouvert) panneau.querySelector('input')?.focus();
  };
  btnCats.addEventListener('click', () => basculerPanneau(!panneau.classList.contains('is-ouvert')));
  station.querySelector('[data-ac="fermer"]').addEventListener('click', () => { basculerPanneau(false); btnCats.focus(); });
  station.querySelectorAll('[data-ac-toutes]').forEach(b => b.addEventListener('click', () => {
    const on = b.dataset.acToutes === '1';
    listeCats.querySelectorAll('input').forEach(i => { i.checked = on; if (on) etat.cats.add(i.dataset.cat); else etat.cats.delete(i.dataset.cat); });
    dessiner();
  }));
  station.addEventListener('keydown', e => { if (e.key === 'Escape' && panneau.classList.contains('is-ouvert')) { basculerPanneau(false); btnCats.focus(); } });
  basculerPanneau(false);
})();
