/* =========================================================
   RadiologicHub — Bibliothèque : administration (bibliotheque-admin.html)
   ---------------------------------------------------------
   Étapes 1-2 : connexion de l'administrateur, import par DOI / PMID /
   PMCID (fiche pré-remplie depuis Europe PMC, PubMed et Unpaywall),
   import en lot avec rapport, liste et modification des articles.
   (Étape 3 : file « À valider », tableau de bord, journal de veille.)
   Les appels aux services externes partent du navigateur, avec limite
   de débit et cache des seules métadonnées.
   ========================================================= */
(function () {
  'use strict';
  const B = window.RHBib, CFG = window.RH_BIB_CONFIG, K = B.catalogue, ID = B.identifiants, R = B.reseau, IMP = B.import;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const zone = $('#bib-admin');
  if (!zone || !B.api || !CFG) return;
  const api = B.api;
  const STATUTS = { a_valider: 'À valider', publie: 'Publié', rejete: 'Rejeté' };

  /* Cache des métadonnées dans ce navigateur (jamais de réponse brute) */
  const CLE_CACHE = 'rh-bib-cache-v1';
  const lireCache = () => { try { return JSON.parse(localStorage.getItem(CLE_CACHE) || '{}'); } catch (e) { return {}; } };
  const cache = R.creerCache({ stockage: {
    lire: k => lireCache()[k] || null,
    ecrire: (k, v) => {
      try {
        const m = lireCache(); m[k] = v;
        const cles = Object.keys(m);
        cles.slice(0, Math.max(0, cles.length - 400)).forEach(x => delete m[x]);
        localStorage.setItem(CLE_CACHE, JSON.stringify(m));
      } catch (e) {}
    },
  } });
  const client = R.creerClient({ limiteur: R.creerLimiteur(CFG.api.debits) });

  let articles = [], onglet = 'importer', filtreStatut = 'tous', rechercheListe = '', enEdition = null;

  const msg = (classe, html) => `<div class="bib-msg ${classe}" role="status">${html}</div>`;
  const specialiteParDefaut = () => (CFG.themes.find(t => t.actif) || {}).specialite || CFG.specialites[0].id;
  const statutBadge = s => `<span class="bib-badge is-statut">${esc(STATUTS[s] || s)}</span>`;

  /* ---------- Connexion ---------- */
  async function demarrer(message) {
    if (api.mode === 'demo') $('#bib-demo').hidden = false;
    try { await api.pret; } catch (e) { zone.innerHTML = msg('is-erreur', esc(e.message)); return; }
    // Lien expiré ou déjà utilisé, connexion annulée (connexion.js) ; session perdue : message au-dessus du formulaire.
    const C = window.RHConnexion;
    message = message || (C && C.erreurRetour());
    if (api.surSessionPerdue && !demarrer.ecoute) {
      demarrer.ecoute = true;
      api.surSessionPerdue(() => { $('#bib-session').innerHTML = ''; demarrer(C ? C.SESSION_EXPIREE : 'Session expirée.'); });
    }
    const session = await api.session();
    if (!session) {
      zone.innerHTML = `<div class="bib-carte"><h2>Connexion de l'administrateur</h2>
        <p class="bib-aide">Même compte que l'administration de la Communauté et des Remplacements.</p>
        <div class="bib-actions"><button class="btn btn-ink" type="button" id="bib-google">Continuer avec Google</button></div>
        <form id="bib-lien" class="bib-actions"><label class="sr-only" for="bib-email">Adresse e-mail</label>
          <input type="email" id="bib-email" required placeholder="votre.adresse@exemple.com" autocomplete="email">
          <button class="btn btn-outline" type="submit">Recevoir un lien de connexion</button></form><div id="bib-co-msg">${message ? msg('is-erreur', esc(message)) : ''}</div></div>`;
      $('#bib-google').addEventListener('click', () => api.connexionGoogle().catch(e => { $('#bib-co-msg').innerHTML = msg('is-erreur', esc(e.message)); }));
      $('#bib-lien').addEventListener('submit', async e => {
        e.preventDefault();
        try { await api.connexionEmail($('#bib-email').value); $('#bib-co-msg').innerHTML = msg('is-ok', 'Lien envoyé : ouvrez-le depuis votre messagerie.'); }
        catch (er) { $('#bib-co-msg').innerHTML = msg('is-erreur', esc(er.message)); }
      });
      return;
    }
    if (!(await api.estAdmin())) {
      zone.innerHTML = `<div class="bib-carte">${msg('is-erreur', `Le compte ${esc(session.email)} n'est pas administrateur de la bibliothèque.`)}
        <div class="bib-actions"><button class="btn btn-outline" type="button" id="bib-sortie">Se déconnecter</button></div></div>`;
      $('#bib-sortie').addEventListener('click', async () => { await api.deconnexion(); location.reload(); });
      return;
    }
    $('#bib-session').innerHTML = api.mode === 'demo' ? '' : `${esc(session.email)} · <button class="btn btn-outline btn-sm" type="button" id="bib-sortie">Se déconnecter</button>`;
    const sortie = $('#bib-sortie');
    if (sortie) sortie.addEventListener('click', async () => { await api.deconnexion(); location.reload(); });
    await recharger();
    rendre();
  }
  const recharger = async () => { articles = await api.tousLesArticles(); };

  /* ---------- Rendu général ---------- */
  function rendre() {
    const n = s => articles.filter(a => a.statut === s).length;
    zone.innerHTML = `
      <div class="bib-onglets" role="tablist">
        <button type="button" role="tab" data-onglet="importer" aria-selected="${onglet === 'importer'}">Importer</button>
        <button type="button" role="tab" data-onglet="articles" aria-selected="${onglet === 'articles'}">Articles (${articles.length})</button>
      </div>
      <p class="bib-aide">${n('publie')} publié(s) · ${n('a_valider')} à valider · ${n('rejete')} rejeté(s) — objectif du test : 50 à 100 articles publiés, dont 10 Essentiels (${articles.filter(a => a.statut === 'publie' && K.essentielDans(a)).length} aujourd'hui).</p>
      <div id="bib-vue"></div>`;
    if (enEdition) vueFiche(enEdition.article, enEdition.contexte);
    else if (onglet === 'importer') vueImporter();
    else vueArticles();
  }

  /* ---------- Import ---------- */
  function vueImporter(message = '') {
    $('#bib-vue').innerHTML = `<div class="bib-carte">
      <h2>Importer par DOI, PMID ou PMCID</h2>
      <p class="bib-aide">Collez un identifiant (ou son adresse doi.org, PubMed, PMC) : la fiche se pré-remplit. Plusieurs identifiants, un par ligne : import en lot, les articles arrivent « à valider ».</p>
      <label class="sr-only" for="bib-ids">Identifiants</label>
      <textarea id="bib-ids" placeholder="10.1186/s13244-019-0805-8&#10;30251931&#10;PMC5890653"></textarea>
      <div class="bib-actions"><button class="btn btn-ink" type="button" id="bib-importer">Importer</button></div>
      <div class="bib-progression" id="bib-prog" hidden><span></span></div>
      <div id="bib-imp-msg">${message}</div>
    </div>`;
    $('#bib-importer').addEventListener('click', importer);
  }

  async function importer() {
    const texte = $('#bib-ids').value;
    const { valides, invalides } = ID.decouperLot(texte);
    const zoneMsg = $('#bib-imp-msg'), bouton = $('#bib-importer');
    if (!valides.length) { zoneMsg.innerHTML = msg('is-erreur', invalides.length ? IMP.MESSAGES.identifiant_invalide : 'Collez au moins un identifiant.'); return; }
    bouton.disabled = true;
    zoneMsg.innerHTML = msg('is-info', 'Recherche en cours sur Europe PMC, PubMed et Unpaywall…');
    try {
      await recharger();
      if (valides.length === 1 && !invalides.length) await importerUn(valides[0]);
      else await importerPlusieurs(texte);
    } catch (e) {
      zoneMsg.innerHTML = msg('is-erreur', esc(e.message));
    } finally {
      const b = $('#bib-importer'); if (b) b.disabled = false;
    }
  }

  async function importerUn(id) {
    const zoneMsg = $('#bib-imp-msg');
    const deja = ID.trouverDoublon({ [id.type]: id.valeur }, articles);
    if (deja) { zoneMsg.innerHTML = doublonHtml(deja); lierOuvrir(); return; }
    const r = await IMP.importer(id.texte, { client, cache, config: CFG });
    if (!r.ok) {
      zoneMsg.innerHTML = msg('is-erreur', `${esc(r.message)}${r.fiche ? `<br>« ${esc(r.fiche.titre)} » — ${esc(K.reference(r.fiche))}` : ''}${r.avertissements && r.avertissements.length ? `<ul>${r.avertissements.map(a => `<li>${esc(a)}</li>`).join('')}</ul>` : ''}`);
      return;
    }
    const double = ID.trouverDoublon(r.fiche, articles);
    if (double) { zoneMsg.innerHTML = doublonHtml(double); lierOuvrir(); return; }
    enEdition = {
      article: { ...r.fiche, statut: 'a_valider', origine: 'import', specialite: specialiteParDefaut(), organes: [], modalites: [], classifications: [], themes: [] },
      contexte: { sources: r.sources, avertissements: r.avertissements, nouveau: true },
    };
    rendre();
  }

  const doublonHtml = a => msg('is-info', `Déjà dans la bibliothèque (${esc(STATUTS[a.statut] || a.statut)}) : « ${esc(a.titre)} ». <button class="btn btn-outline btn-sm" type="button" data-ouvrir="${esc(a.id)}">Ouvrir la fiche</button>`);
  const lierOuvrir = () => $$('[data-ouvrir]').forEach(b => b.addEventListener('click', () => ouvrir(b.dataset.ouvrir)));

  async function importerPlusieurs(texte) {
    const prog = $('#bib-prog');
    prog.hidden = false;
    const rapport = await IMP.importerLot(texte, {
      client, cache, config: CFG, existants: articles,
      enregistrer: fiche => api.enregistrer({ ...fiche, statut: 'a_valider', origine: 'lot', specialite: specialiteParDefaut(), organes: [], modalites: [], classifications: [], themes: [] }),
      progression: (i, n) => { $('span', prog).style.width = `${Math.round((i / Math.max(1, n)) * 100)}%`; },
    });
    await recharger();
    const bloc = (titre, liste, ligne, ouvert = false) => (liste.length ? `<details${ouvert ? ' open' : ''}><summary>${titre} (${liste.length})</summary><ul>${liste.map(ligne).join('')}</ul></details>` : '');
    const html = `<div class="bib-rapport">
      ${msg(rapport.crees.length ? 'is-ok' : 'is-info', `${rapport.crees.length} article(s) ajouté(s) à la file « À valider ».`)}
      ${bloc('Ajoutés', rapport.crees, x => `<li>${esc(x.article.titre)} <small>(${esc(x.texte)})</small>${x.avertissements.length ? ` — ${esc(x.avertissements.join(' '))}` : ''}</li>`, true)}
      ${bloc('Doublons, déjà dans la bibliothèque', rapport.doublons, x => `<li>${esc(x.texte)} → « ${esc(x.article.titre)} » (${esc(STATUTS[x.article.statut] || 'dans ce lot')})</li>`, true)}
      ${bloc('Pas en accès libre', rapport.non_libres, x => `<li>${esc(x.texte)}${x.fiche ? ` — « ${esc(x.fiche.titre)} »` : ''}</li>`, true)}
      ${bloc('Introuvables', rapport.introuvables, x => `<li>${esc(x.texte)}</li>`, true)}
      ${bloc('Services injoignables (à réessayer)', rapport.indisponibles, x => `<li>${esc(x.texte)}</li>`, true)}
      ${bloc('Identifiants non reconnus', rapport.invalides, x => `<li>${esc(x.texte)}</li>`, true)}
    </div>`;
    vueImporter(html);
    rendreCompteurs();
  }
  const rendreCompteurs = () => { const v = zone.querySelector('.bib-onglets [data-onglet="articles"]'); if (v) v.textContent = `Articles (${articles.length})`; };

  /* ---------- Liste des articles ---------- */
  function vueArticles() {
    const q = K.normaliser(rechercheListe);
    const l = articles.filter(a => (filtreStatut === 'tous' || a.statut === filtreStatut) && (!q || K.normaliser(`${a.titre} ${a.premier_auteur} ${a.revue} ${a.doi} ${a.pmid}`).includes(q)));
    $('#bib-vue').innerHTML = `<div class="bib-carte">
      <div class="bib-admin-barre">
        <select id="bib-statut" aria-label="Statut">${[['tous', 'Tous les statuts'], ...Object.entries(STATUTS)].map(([v, t]) => `<option value="${v}"${v === filtreStatut ? ' selected' : ''}>${t}</option>`).join('')}</select>
        <input type="search" id="bib-cherche" placeholder="Titre, auteur, DOI…" value="${esc(rechercheListe)}" aria-label="Rechercher dans les articles">
      </div>
      <div class="bib-table">${l.map(a => `<button type="button" class="bib-ligne" data-ouvrir="${esc(a.id)}">
        <span>${statutBadge(a.statut)} ${K.essentielDans(a) ? '<span class="bib-badge is-essentiel">★</span>' : ''} <span class="bib-badge ${K.badgeAcces(a).classe}">${esc(K.badgeAcces(a).label)}</span></span>
        <strong>${esc(a.titre)}</strong><small>${esc(K.reference(a))}${a.resume ? '' : ' · résumé à rédiger'}</small></button>`).join('') || '<p class="bib-vide">Aucun article.</p>'}</div></div>`;
    $('#bib-statut').addEventListener('change', e => { filtreStatut = e.target.value; vueArticles(); });
    $('#bib-cherche').addEventListener('input', e => { rechercheListe = e.target.value; const pos = e.target.selectionStart; vueArticles(); const c = $('#bib-cherche'); c.focus(); c.setSelectionRange(pos, pos); });
    lierOuvrir();
  }
  function ouvrir(id) {
    const a = articles.find(x => x.id === id);
    if (!a) return;
    enEdition = { article: JSON.parse(JSON.stringify(a)), contexte: { nouveau: false } };
    rendre();
    window.scrollTo({ top: zone.offsetTop - 90, behavior: 'smooth' });
  }

  /* ---------- Fiche (création après import, ou modification) ---------- */
  function vueFiche(a, ctx) {
    const s = a.specialite || specialiteParDefaut();
    const voc = K.vocabulaire(CFG, s);
    const coche = (nom, items, choisis) => `<div class="bib-options">${items.map(i => `<label class="bib-option"><input type="checkbox" name="${nom}" value="${esc(i.id)}"${(choisis || []).includes(i.id) ? ' checked' : ''}><span>${esc(i.label)}</span></label>`).join('')}</div>`;
    const lien = t => (a.themes || []).find(x => x.theme === t.id);
    const champ = (nom, label, val, type = 'text', large = false) => `<label class="${large ? 'is-large' : ''}">${label}<input type="${type}" name="${nom}" value="${esc(val == null ? '' : val)}"></label>`;
    $('#bib-vue').innerHTML = `<div class="bib-carte">
      <h2>${ctx.nouveau ? 'Nouvelle fiche (pré-remplie)' : 'Modifier la fiche'}</h2>
      ${ctx.sources && ctx.sources.length ? msg('is-ok', `Trouvé sur : ${esc(ctx.sources.join(', '))}.`) : ''}
      ${ctx.avertissements && ctx.avertissements.length ? msg('is-info', `<ul>${ctx.avertissements.map(x => `<li>${esc(x)}</li>`).join('')}</ul>`) : ''}
      <form class="bib-form" id="bib-fiche" novalidate>
        <fieldset><legend>Article (métadonnées)</legend><div class="bib-grille">
          ${champ('titre', 'Titre', a.titre, 'text', true)}
          ${champ('premier_auteur', 'Premier auteur', a.premier_auteur)}
          <label class="bib-cocher"><input type="checkbox" name="et_al"${a.et_al ? ' checked' : ''}> « et al. » (plusieurs auteurs)</label>
          ${champ('revue', 'Revue', a.revue)}${champ('annee', 'Année', a.annee, 'number')}
          ${champ('doi', 'DOI', a.doi)}${champ('pmid', 'PMID', a.pmid)}${champ('pmcid', 'PMCID', a.pmcid)}
          ${champ('url_texte', 'Lien vers le texte intégral gratuit', a.url_texte, 'url', true)}
          ${champ('source_texte', 'Source du lien (PMC, Éditeur…)', a.source_texte)}
          <label>Accès<select name="acces">${CFG.acces.map(x => `<option value="${x.id}"${x.id === a.acces ? ' selected' : ''}>${esc(x.label)}</option>`).join('')}</select></label>
          ${champ('licence', 'Licence (CC BY, CC BY-NC…)', a.licence)}
        </div></fieldset>
        <fieldset><legend>Classement</legend>
          <label>Sous-spécialité<select name="specialite" id="bib-specialite">${CFG.specialites.map(x => `<option value="${x.id}"${x.id === s ? ' selected' : ''}>${esc(x.label)}</option>`).join('')}</select></label>
          <p class="bib-aide">Thèmes : cochez le thème, puis « Essentiel » et le rang dans l'ordre de lecture conseillé (1 = à lire en premier).</p>
          ${voc.themes.length ? voc.themes.map(t => { const l = lien(t); return `<div class="bib-theme-ligne">
            <label class="bib-cocher"><input type="checkbox" name="theme" value="${esc(t.id)}"${l ? ' checked' : ''}> ${esc(t.titre)}</label>
            <label class="bib-cocher"><input type="checkbox" name="essentiel-${esc(t.id)}"${l && l.essentiel ? ' checked' : ''}> ★ Essentiel</label>
            <label class="bib-cocher">Rang <input type="number" min="1" max="999" name="rang-${esc(t.id)}" value="${l && l.rang ? esc(l.rang) : ''}"></label></div>`; }).join('') : '<p class="bib-aide">Aucun thème actif pour cette sous-spécialité (à ajouter dans bibliotheque/config.js).</p>'}
          <label>Organes / régions</label>${coche('organes', voc.organes, a.organes)}
          <label>Modalités</label>${coche('modalites', voc.modalites, a.modalites)}
          <label>Classifications</label>${coche('classifications', voc.classifications, a.classifications)}
          <label>Niveau</label><div class="bib-options">${CFG.niveaux.map(n => `<label class="bib-option"><input type="radio" name="niveau" value="${n.id}"${n.id === a.niveau ? ' checked' : ''}><span>${esc(n.label)}</span></label>`).join('')}</div>
        </fieldset>
        <fieldset><legend>Votre résumé (2-3 lignes, en français)</legend>
          <label class="sr-only" for="bib-resume">Résumé</label>
          <textarea id="bib-resume" name="resume" rows="4" placeholder="Ce que l'article apporte, pour qui, en 2-3 lignes. Ne pas recopier l'abstract.">${esc(a.resume || '')}</textarea>
          <span class="bib-compteur" id="bib-compteur"></span>
        </fieldset>
        <fieldset><legend>Statut</legend>
          <div class="bib-options">${Object.entries(STATUTS).map(([v, t]) => `<label class="bib-option"><input type="radio" name="statut" value="${v}"${v === a.statut ? ' checked' : ''}><span>${t}</span></label>`).join('')}</div>
          <label id="bib-motif-l"${a.statut === 'rejete' ? '' : ' hidden'}>Motif du rejet<input type="text" name="motif_rejet" value="${esc(a.motif_rejet || '')}"></label>
        </fieldset>
        <div id="bib-fiche-msg"></div>
        <div class="bib-actions">
          <button class="btn btn-ink" type="submit">Enregistrer</button>
          <button class="btn btn-outline" type="button" id="bib-annuler">Annuler</button>
          ${ctx.nouveau ? '' : '<button class="btn btn-outline" type="button" id="bib-supprimer">Supprimer</button>'}
        </div>
      </form></div>`;
    const form = $('#bib-fiche');
    const compter = () => {
      const n = form.resume.value.length, c = $('#bib-compteur');
      c.textContent = `${n} / ${K.RESUME_MAX} caractères`;
      c.classList.toggle('is-trop', n > K.RESUME_MAX);
    };
    compter();
    form.resume.addEventListener('input', compter);
    $('#bib-specialite').addEventListener('change', () => { enEdition.article = lireFiche(form, a); enEdition.article.specialite = $('#bib-specialite').value; vueFiche(enEdition.article, ctx); });
    $$('input[name="statut"]', form).forEach(r => r.addEventListener('change', () => { $('#bib-motif-l').hidden = form.statut.value !== 'rejete'; }));
    $('#bib-annuler').addEventListener('click', () => { enEdition = null; rendre(); });
    const sup = $('#bib-supprimer');
    if (sup) sup.addEventListener('click', async () => {
      if (!confirm('Supprimer définitivement cet article de la bibliothèque ?')) return;
      try { await api.supprimer(a.id); await recharger(); enEdition = null; onglet = 'articles'; rendre(); }
      catch (e) { $('#bib-fiche-msg').innerHTML = msg('is-erreur', esc(e.message)); }
    });
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const article = lireFiche(form, a);
      const erreurs = K.validerArticle(article, CFG);
      if (erreurs.length) { $('#bib-fiche-msg').innerHTML = msg('is-erreur', `<ul>${erreurs.map(x => `<li>${esc(x)}</li>`).join('')}</ul>`); return; }
      try {
        await api.enregistrer(article);
        await recharger();
        enEdition = null;
        onglet = 'articles';
        filtreStatut = 'tous';
        rendre();
        $('#bib-vue').insertAdjacentHTML('afterbegin', msg('is-ok', `Enregistré : « ${esc(article.titre)} » (${esc(STATUTS[article.statut])}).`));
      } catch (er) { $('#bib-fiche-msg').innerHTML = msg('is-erreur', esc(er.message)); }
    });
  }

  function lireFiche(form, avant) {
    const v = n => (form.elements[n] ? String(form.elements[n].value || '').trim() : '');
    const coches = n => $$(`input[name="${n}"]:checked`, form).map(x => x.value);
    const themes = coches('theme').map(t => {
      const rang = form.elements['rang-' + t] && form.elements['rang-' + t].value;
      return { theme: t, essentiel: !!(form.elements['essentiel-' + t] && form.elements['essentiel-' + t].checked), rang: rang ? Number(rang) : null };
    });
    const doi = v('doi') ? ID.normaliserDoi(v('doi')) || v('doi') : null;
    return {
      ...avant,
      titre: v('titre'), premier_auteur: v('premier_auteur') || null, et_al: form.elements.et_al.checked,
      revue: v('revue') || null, annee: v('annee') ? Number(v('annee')) : null,
      doi, pmid: v('pmid') || null, pmcid: v('pmcid') ? (ID.normaliserPmcid(v('pmcid')) || v('pmcid')) : null,
      url_texte: v('url_texte'), source_texte: v('source_texte') || null, acces: v('acces'), licence: v('licence') || null,
      specialite: v('specialite') || null, themes, organes: coches('organes'), modalites: coches('modalites'), classifications: coches('classifications'),
      niveau: (form.querySelector('input[name="niveau"]:checked') || {}).value || null,
      resume: v('resume') || null,
      statut: (form.querySelector('input[name="statut"]:checked') || {}).value || 'a_valider',
      motif_rejet: v('motif_rejet') || null,
    };
  }

  zone.addEventListener('click', e => {
    const o = e.target.closest('[data-onglet]');
    if (!o) return;
    onglet = o.dataset.onglet;
    enEdition = null;
    rendre();
  });

  demarrer().catch(e => { zone.innerHTML = msg('is-erreur', esc(e.message)); });
})();
