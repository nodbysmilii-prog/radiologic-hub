/* =========================================================
   RadiologicHub — Bibliothèque : page publique (bibliotheque.html)
   ---------------------------------------------------------
   Vues (adresse partageable après #) :
   • accueil   (#)                        sous-spécialités, thèmes, derniers ajouts
   • thème     (#theme=foie&…)            Essentiels dans l'ordre de lecture, puis les autres
   • recherche (#q=…&modalites=irm,…)     résultats + filtres combinables
   Tout est construit à partir de bibliotheque/config.js.
   ========================================================= */
(function () {
  'use strict';
  const B = window.RHBib, CFG = window.RH_BIB_CONFIG, K = B.catalogue;
  const $ = (s, r = document) => r.querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const page = $('#bib-page');
  if (!page || !B.api || !CFG) return;
  const api = B.api;
  let articles = [], filtresOuverts = false;

  const spe = id => CFG.specialites.find(s => s.id === id) || { id, label: id, couleur: 'var(--ink)' };
  const theme = id => CFG.themes.find(t => t.id === id && t.actif);
  const pluriel = (n, mot, motPluriel) => `${n} ${n > 1 ? (motPluriel || mot + 's') : mot}`;
  const criteres = () => K.criteresDepuisAdresse(location.hash);
  const naviguer = c => {
    const h = K.adresseDepuisCriteres(c);
    if (('#' + h) === location.hash || (!h && !location.hash)) rendre();
    else location.hash = h;
  };

  /* ---------- Fiche article ---------- */
  function carte(a, { themeId = null } = {}) {
    const b = K.badgeAcces(a);
    const essentiel = K.essentielDans(a, themeId);
    const tags = [
      ...(a.organes || []).map(o => K.labelDe(K.tousOrganes(CFG), o)),
      ...(a.modalites || []).map(m => K.labelDe(CFG.modalites, m)),
      ...(a.classifications || []).map(c => K.labelDe(CFG.classifications, c)),
    ];
    const liens = K.liens(a).filter(l => /^https:\/\//.test(l.url));
    const principal = liens.find(l => l.type === 'texte');
    return `<article class="bib-article">
      <div class="bib-badges">
        ${essentiel ? '<span class="bib-badge is-essentiel">★ Essentiel</span>' : ''}
        ${a.niveau ? `<span class="bib-badge is-niveau">${esc(K.labelDe(CFG.niveaux, a.niveau))}</span>` : ''}
        <span class="bib-badge ${b.classe}" title="${esc(b.titre)}">${esc(b.label)}</span>
      </div>
      <h3>${principal ? `<a href="${esc(principal.url)}" target="_blank" rel="noopener">${esc(a.titre)}</a>` : esc(a.titre)}</h3>
      <p class="bib-ref">${esc(K.reference(a))}</p>
      ${a.resume ? `<p class="bib-resume"><b>Résumé RadiologicHub</b>${esc(a.resume)}</p>` : ''}
      ${tags.length ? `<ul class="bib-tags" aria-label="Mots-clés">${tags.map(t => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}
      <p class="bib-liens">${liens.map(l => `<a class="btn ${l.type === 'texte' ? 'btn-ink' : 'btn-outline'} btn-sm" href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)}${l.type === 'texte' ? ' ↗' : ''}</a>`).join('')}</p>
    </article>`;
  }
  const liste = (l, opts, lecture = false) => `<${lecture ? 'ol' : 'ul'} class="bib-liste${lecture ? ' is-lecture' : ''}">${l.map(a => `<li>${carte(a, opts)}</li>`).join('')}</${lecture ? 'ol' : 'ul'}>`;

  /* ---------- Filtres (valeurs présentes seulement, avec leur nombre d'articles) ---------- */
  function panneauFiltres(c, base, { avecTheme }) {
    const voc = K.vocabulaire(CFG, c.specialite || null);
    const compte = (dim, val) => K.filtrer(base, { ...c, [dim]: dim === 'specialite' || dim === 'theme' ? val : [val] }, CFG).length;
    const groupe = (dim, titre, items, multiple = true) => {
      const coches = new Set([].concat(c[dim] || []));
      const opts = items.map(i => ({ ...i, n: compte(dim, i.id) })).filter(i => i.n || coches.has(i.id));
      if (!opts.length) return '';
      return `<fieldset><legend>${titre}</legend><div class="bib-options">${opts.map(i => `
        <label class="bib-option"><input type="${multiple ? 'checkbox' : 'radio'}" name="f-${dim}" data-dim="${dim}" value="${esc(i.id)}"${coches.has(i.id) ? ' checked' : ''}><span>${esc(i.label)} <small>${i.n}</small></span></label>`).join('')}</div></fieldset>`;
    };
    const annees = [2024, 2022, 2020, 2015];
    return `<aside class="bib-filtres${filtresOuverts ? ' is-open' : ''}" id="bib-filtres" aria-label="Filtres">
      ${avecTheme ? groupe('specialite', 'Sous-spécialité', CFG.specialites, false) : ''}
      ${avecTheme ? groupe('theme', 'Thème', voc.themes.map(t => ({ id: t.id, label: t.titre })), false) : ''}
      ${groupe('organes', 'Organe / région', voc.organes)}
      ${groupe('modalites', 'Modalité', voc.modalites)}
      ${groupe('classifications', 'Classification', voc.classifications)}
      ${groupe('niveau', 'Niveau', voc.niveaux)}
      ${groupe('acces', 'Accès', voc.acces)}
      <fieldset><legend>Sélection</legend><div class="bib-options">
        <label class="bib-option"><input type="checkbox" data-dim="essentiel" value="1"${c.essentiel ? ' checked' : ''}><span>★ Essentiels seulement</span></label>
      </div></fieldset>
      <fieldset><legend>Année de publication</legend>
        <select data-dim="anneeMin" aria-label="Année de publication minimale"><option value="">Toutes</option>${annees.map(y => `<option value="${y}"${String(c.anneeMin) === String(y) ? ' selected' : ''}>${y} et après</option>`).join('')}</select>
      </fieldset>
    </aside>`;
  }

  function filtresActifs(c, { garderTheme }) {
    const out = [];
    const nom = (dim, v) => ({
      specialite: () => spe(v).label, theme: () => (theme(v) || {}).titre || v,
      organes: () => K.labelDe(K.tousOrganes(CFG), v), modalites: () => K.labelDe(CFG.modalites, v),
      classifications: () => K.labelDe(CFG.classifications, v), niveau: () => K.labelDe(CFG.niveaux, v), acces: () => K.labelDe(CFG.acces, v),
    }[dim] || (() => v))();
    if (c.q) out.push({ dim: 'q', v: c.q, label: `« ${c.q} »` });
    ['specialite', 'theme'].forEach(d => { if (c[d] && !(d === 'theme' && garderTheme)) out.push({ dim: d, v: c[d], label: nom(d, c[d]) }); });
    ['organes', 'modalites', 'classifications', 'niveau', 'acces'].forEach(d => [].concat(c[d] || []).forEach(v => out.push({ dim: d, v, label: nom(d, v) })));
    if (c.essentiel) out.push({ dim: 'essentiel', v: true, label: '★ Essentiels' });
    if (c.anneeMin) out.push({ dim: 'anneeMin', v: c.anneeMin, label: `${c.anneeMin} et après` });
    if (!out.length) return '';
    return `<ul class="bib-actifs" aria-label="Filtres actifs">${out.map(f => `<li><button type="button" data-retirer="${esc(f.dim)}" data-valeur="${esc(f.v)}" title="Retirer ce filtre">${esc(f.label)}</button></li>`).join('')}
      ${out.length > 1 ? '<li><button type="button" data-retirer="tout">Tout effacer</button></li>' : ''}</ul>`;
  }

  const nbFiltres = c => ['organes', 'modalites', 'classifications', 'niveau', 'acces'].reduce((n, d) => n + [].concat(c[d] || []).length, 0) + (c.essentiel ? 1 : 0) + (c.anneeMin ? 1 : 0) + (c.specialite ? 1 : 0);
  const entete = (n, c) => `<div class="bib-entete-res"><p aria-live="polite">${pluriel(n, 'article')}</p>
    <button type="button" class="btn btn-outline btn-sm bib-ouvrir-filtres" data-filtres aria-expanded="${filtresOuverts}" aria-controls="bib-filtres">Filtres${nbFiltres(c) ? ` (${nbFiltres(c)})` : ''}</button></div>`;

  /* ---------- Vues ---------- */
  function vueAccueil() {
    const actifs = CFG.themes.filter(t => t.actif);
    const recents = articles.slice().sort((x, y) => String(y.publie_le || '').localeCompare(String(x.publie_le || ''))).slice(0, 5);
    page.innerHTML = `
      <h2 class="bib-titre-bloc">Sous-spécialités</h2>
      <ul class="bib-specs">${CFG.specialites.map(s => {
        const n = articles.filter(a => a.specialite === s.id).length;
        return n || actifs.some(t => t.specialite === s.id)
          ? `<li><a class="bib-spec" style="--c: ${s.couleur}" href="#specialite=${esc(s.id)}">${esc(s.label)} <b>${n}</b></a></li>`
          : `<li><span class="bib-spec is-bientot" style="--c: ${s.couleur}">${esc(s.label)} <small>bientôt</small></span></li>`;
      }).join('')}</ul>
      <h2 class="bib-titre-bloc">Thèmes</h2>
      <p>Dans chaque thème, les articles essentiels sont en tête, dans l'ordre de lecture conseillé.</p>
      <ul class="bib-themes">${actifs.map(t => {
        const l = articles.filter(a => (a.themes || []).some(x => x.theme === t.id));
        const e = l.filter(a => K.essentielDans(a, t.id)).length;
        return `<li><a class="bib-theme" style="--c: ${spe(t.specialite).couleur}" href="#theme=${esc(t.id)}">
          <p>${esc(spe(t.specialite).label)}</p><h3>${esc(t.titre)}</h3><p>${esc(t.description || '')}</p>
          <span class="bib-compte">${pluriel(l.length, 'article')} · ${pluriel(e, 'essentiel')}</span></a></li>`;
      }).join('')}</ul>
      <h2 class="bib-titre-bloc">Derniers ajouts</h2>
      ${recents.length ? liste(recents, {}) : '<p class="bib-vide">Aucun article publié pour le moment.</p>'}`;
  }

  function vueTheme(c) {
    const t = theme(c.theme), s = spe(t.specialite);
    const base = K.filtrer(articles, { theme: t.id }, CFG);
    const tries = K.trierPourTheme(K.filtrer(articles, c, CFG), t.id);
    const ess = tries.filter(a => K.essentielDans(a, t.id)), autres = tries.filter(a => !K.essentielDans(a, t.id));
    page.innerHTML = `
      <a class="bib-retour" href="#">← Tous les thèmes</a>
      <header class="bib-theme-tete" style="--c: ${s.couleur}"><p class="marker-tag">${esc(s.label)}</p><h2>${esc(t.titre)}</h2><p>${esc(t.description || '')}</p></header>
      <div class="bib-layout">
        ${panneauFiltres(c, base, { avecTheme: false })}
        <div>
          ${entete(tries.length, c)}${filtresActifs(c, { garderTheme: true })}
          ${ess.length ? `<h3 class="bib-sous-titre">★ Les essentiels <small>dans l'ordre de lecture conseillé</small></h3>${liste(ess, { themeId: t.id }, true)}` : ''}
          ${autres.length ? `<h3 class="bib-sous-titre">Pour aller plus loin</h3>${liste(autres, { themeId: t.id })}` : ''}
          ${tries.length ? '' : '<p class="bib-vide">Aucun article ne correspond à ces filtres.</p>'}
        </div>
      </div>`;
  }

  function vueResultats(c) {
    const res = K.trierResultats(K.filtrer(articles, c, CFG));
    page.innerHTML = `
      <a class="bib-retour" href="#">← Accueil de la bibliothèque</a>
      <div class="bib-layout">
        ${panneauFiltres(c, articles, { avecTheme: true })}
        <div>
          ${entete(res.length, c)}${filtresActifs(c, { garderTheme: false })}
          ${res.length ? liste(res, { themeId: c.theme || null }) : '<p class="bib-vide">Aucun article ne correspond à cette recherche. Essayez un autre mot-clé ou retirez un filtre.</p>'}
        </div>
      </div>`;
  }

  function rendre() {
    const c = criteres();
    $('#bib-q').value = c.q || '';
    if (c.theme && theme(c.theme)) vueTheme(c);
    else if (Object.keys(c).length) vueResultats(c);
    else vueAccueil();
  }

  /* ---------- Interactions ---------- */
  page.addEventListener('change', e => {
    const el = e.target.closest('[data-dim]');
    if (!el) return;
    const c = criteres(), dim = el.dataset.dim;
    if (dim === 'essentiel') c.essentiel = el.checked;
    else if (dim === 'anneeMin') c.anneeMin = el.value;
    else if (dim === 'specialite' || dim === 'theme') { c[dim] = el.value; if (dim === 'specialite') delete c.theme; }
    else {
      const v = new Set([].concat(c[dim] || []));
      if (el.checked) v.add(el.value); else v.delete(el.value);
      c[dim] = [...v];
    }
    naviguer(c);
  });
  page.addEventListener('click', e => {
    const f = e.target.closest('[data-filtres]');
    if (f) {
      filtresOuverts = !filtresOuverts;
      $('#bib-filtres').classList.toggle('is-open', filtresOuverts);
      f.setAttribute('aria-expanded', filtresOuverts);
      return;
    }
    const r = e.target.closest('[data-retirer]');
    if (!r) return;
    const c = criteres(), dim = r.dataset.retirer;
    if (dim === 'tout') { naviguer(c.theme && theme(c.theme) ? { theme: c.theme } : {}); return; }
    if (Array.isArray(c[dim])) c[dim] = c[dim].filter(v => v !== r.dataset.valeur);
    else delete c[dim];
    naviguer(c);
  });
  $('#bib-recherche').addEventListener('submit', e => {
    e.preventDefault();
    const q = $('#bib-q').value.trim();
    naviguer(q ? { q } : {});                          // la barre du haut cherche dans toute la bibliothèque
  });
  window.addEventListener('hashchange', rendre);

  (async () => {
    if (api.mode === 'demo') $('#bib-demo').hidden = false;
    try {
      await api.pret;
      articles = await api.articlesPublies();
    } catch (e) {
      page.innerHTML = `<p class="bib-vide">La bibliothèque est momentanément indisponible (${esc(e.message)}).</p>`;
      return;
    }
    rendre();
  })();
})();
