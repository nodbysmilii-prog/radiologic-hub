/* =========================================================
   RadiologicHub — Communauté : application (communaute.html)
   ---------------------------------------------------------
   Navigation par ancre : #/ (fil), #/connexion, #/bienvenue (profil à
   compléter), #/cas/<id>, #/publier, #/profil/<id>, #/moi,
   #/messages[/<conversation>], #/messages/nouveau/<membre>,
   #/notifications, #/recherche, #/admin.
   Pensée d'abord pour le téléphone : barre d'onglets en bas sur mobile,
   colonne de navigation sur ordinateur. Données : window.RHRs.api
   (Supabase ou démonstration, même interface).
   ========================================================= */
(async function () {
  'use strict';
  const RG = window.RHReseau.regles, C = window.RHReseau.confidentialite;
  const UI = window.RHRs.ui, IMG = window.RHRs.images, api = window.RHRs.api;
  const { esc, icone, avatar, nom, toast } = UI;
  const app = document.getElementById('rs-app'), barre = document.getElementById('rs-barre'), nav = document.getElementById('rs-nav'), cote = document.getElementById('rs-cote');
  if (!app || !api) return;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  let S = null;                                                   // session : { compte, membre, admin, remplacantValide }
  const vue = { onglet: 'tous', specialite: '', q: '', liste: [], fin: false, conv: null, brouillon: null, nonLus: { messages: 0, notifications: 0 }, rechercheOnglet: 'membres' };
  const casCache = new Map(), urlsCache = new Map();
  let arreterEcoute = null;

  const peutPublier = () => !!S && !!S.membre && RG.peutPublier(S.membre, S.remplacantValide);
  const specialite = k => RG.SPECIALITES[k] || RG.SPECIALITES.autre;
  const badgeSpe = k => `<span class="rs-spe" style="--c:${specialite(k).c}">${esc(specialite(k).label)}</span>`;
  const modalites = l => esc((l || []).map(m => RG.MODALITES[m] || m).join(' · '));
  const lignes = t => esc(t).replace(/\n/g, '<br>');
  const vide = (texte, action = '') => `<div class="rs-vide"><p>${texte}</p>${action}</div>`;
  const erreurs = l => (l.length ? `<ul class="rs-erreurs" role="alert">${l.map(e => `<li>${esc(e)}</li>`).join('')}</ul>` : '');
  async function essayer(f, succes) {
    try { const r = await f(); if (succes) toast(typeof succes === 'function' ? succes(r) : succes); return r; }
    catch (e) { console.error(e); toast(e.message || 'Une erreur est survenue.', 'ko'); return undefined; }
  }

  /* =======================================================
     Navigation
     ======================================================= */
  function rendreNav() {
    document.querySelector('.rs-shell').classList.toggle('is-visiteur', !S || !S.membre);
    if (!S || !S.membre) { nav.innerHTML = ''; nav.hidden = true; barre.innerHTML = barreVisiteur(); return; }
    nav.hidden = false;
    const r = location.hash || '#/';
    const actif = p => (p === '#/' ? r === '#/' || r === '' || r.startsWith('#/cas') : r.startsWith(p)) ? ' is-actif' : '';
    const pastille = k => `<span class="rs-pastille" data-badge="${k}"${vue.nonLus[k] ? '' : ' hidden'}>${vue.nonLus[k] > 9 ? '9+' : vue.nonLus[k] || ''}</span>`;
    const lien = (h, ic, libelle, extra = '', cls = '') => `<a href="${h}" class="rs-nav-lien${actif(h)}${cls}"${actif(h) ? ' aria-current="page"' : ''}>${ic}<span class="rs-nav-texte">${libelle}</span>${extra}</a>`;
    nav.innerHTML = `
      ${lien('#/', icone('fil'), 'Fil')}
      ${lien('#/recherche', icone('chercher'), 'Rechercher')}
      ${lien('#/publier', icone('publier'), 'Publier', '', ' is-publier')}
      ${lien('#/messages', icone('messages'), 'Messages', pastille('messages'), ' is-bureau')}
      ${lien('#/notifications', icone('cloche'), 'Notifications', pastille('notifications'), ' is-bureau')}
      <a href="remplacements.html" class="rs-nav-lien">${icone('remplacements')}<span class="rs-nav-texte">Remplacements</span></a>
      ${lien(`#/profil/${S.membre.id}`, avatar(S.membre, 26), 'Mon profil')}
      ${S.admin ? lien('#/admin', icone('admin'), 'Administration', '', ' is-bureau') : ''}
      <button type="button" class="rs-nav-lien is-bureau" data-act="deconnexion">${icone('sortie')}<span class="rs-nav-texte">Déconnexion</span></button>`;
    barre.innerHTML = `<a href="#/" class="rs-barre-titre">Communauté</a>
      <span class="rs-barre-actions">
        ${S.admin ? `<a href="#/admin" class="rs-icone-btn" aria-label="Administration">${icone('admin')}</a>` : ''}
        <a href="#/notifications" class="rs-icone-btn" aria-label="Notifications">${icone('cloche')}${pastille('notifications')}</a>
        <a href="#/messages" class="rs-icone-btn" aria-label="Messages">${icone('messages')}${pastille('messages')}</a>
      </span>`;
  }
  const barreVisiteur = () => `<span class="rs-barre-titre">Communauté</span>${S ? '<span class="rs-barre-actions"><button type="button" class="btn btn-sm rs-lien-btn" data-act="deconnexion">Déconnexion</button></span>' : '<span class="rs-barre-actions"><a href="#/connexion" class="btn btn-ink btn-sm">Se connecter</a></span>'}`;
  async function majBadges() {
    if (!S || !S.membre) return;
    const n = await api.nonLus().catch(() => null);
    if (!n) return;
    vue.nonLus = n;
    $$('[data-badge]').forEach(b => { const v = n[b.dataset.badge] || 0; b.hidden = !v; b.textContent = v > 9 ? '9+' : v; });
  }

  /* Colonne de droite (ordinateur) : membres à suivre */
  async function rendreCote() {
    if (!cote) return;
    if (!S || !S.membre) { cote.innerHTML = ''; return; }
    const l = (await api.chercherMembres('').catch(() => [])).slice(0, 5);
    cote.innerHTML = `<div class="rs-carte rs-suggestions"><h2 class="rs-h">Confrères</h2>${l.map(m => `<a class="rs-ligne-membre" href="#/profil/${esc(m.id)}">${avatar(m, 38)}<span><span class="rs-ligne-nom">${nom(m)}</span><span class="rs-ligne-sous">${esc(RG.statutAffiche(m))}${m.ville ? ` · ${esc(m.ville)}` : ''}</span></span></a>`).join('') || '<p class="rs-muted">Aucun membre pour l\'instant.</p>'}
      <a href="#/recherche" class="rs-lien">Voir tous les membres</a></div>
      <div class="rs-carte rs-rappel"><p><strong>Rappel</strong> : aucune donnée permettant d'identifier un patient (nom, date de naissance, numéro de dossier, visage, texte incrusté) dans les cas ni dans les messages.</p></div>`;
  }

  /* =======================================================
     Visiteur, connexion, profil à compléter
     ======================================================= */
  function accueilVisiteur() {
    const fausse = (t, s) => `<div class="rs-carte-cas is-factice"><div class="rs-auteur"><span class="rs-avatar is-initiales" style="--t:40px;--c:var(--plum)">Dr</span><span><span class="rs-nom">Dr ••••• •••••</span><span class="rs-ligne-sous">Radiologue · il y a 2 h</span></span></div><div class="rs-cas-image is-factice"></div><div class="rs-cas-texte">${badgeSpe(s)}<h3>${t}</h3><p class="rs-extrait">••••• •••• ••••••• ••• •••••• •• ••••••• •••• ••••• ••••</p></div></div>`;
    return `<section class="rs-accueil">
      <div class="rs-accueil-texte">
        <p class="marker-tag">Communauté</p>
        <h1>Le réseau des <span class="hl-navy">radiologues</span></h1>
        <p class="rs-chapeau">Publiez vos cas sous votre nom, échangez avec vos confrères et trouvez vos remplacements : un seul compte.</p>
        <ul class="rs-atouts">
          <li>${icone('image')}<span><strong>Cas cliniques</strong> anonymisés, commentés et enregistrés</span></li>
          <li>${icone('messages')}<span><strong>Messagerie</strong> privée entre confrères, en temps réel</span></li>
          <li>${icone('admin')}<span>Comptes <strong>« Dr » vérifiés</strong> par l'équipe RadiologicHub</span></li>
          <li>${icone('remplacements')}<span><strong>Remplacements</strong> en Tunisie avec le même compte</span></li>
        </ul>
        ${boutonsConnexion()}
      </div>
      <div class="rs-apercu" aria-hidden="true">${fausse('Masse surrénalienne de découverte fortuite', 'uro')}${fausse('Céphalée brutale : que voyez-vous ?', 'neuro')}<div class="rs-apercu-voile"><span>${icone('profil')} Réservé aux membres connectés</span></div></div>
    </section>`;
  }
  const boutonsConnexion = () => `<div class="rs-connexion-btns">
      <button type="button" class="btn rs-btn-google" data-act="google">${UI.GOOGLE}<span>Continuer avec Google</span></button>
      <a href="#/connexion" class="btn btn-outline">Recevoir un lien par e-mail</a>
    </div>
    <p class="rs-mini">En continuant, vous acceptez les <a href="mentions-legales.html#conditions">conditions d'utilisation</a> et la <a href="mentions-legales.html#donnees">politique de protection des données</a>.${api.demo ? ' <strong>Démonstration</strong> : la connexion Google est simulée.' : ''}</p>`;

  function connexion() {
    if (S) { location.hash = '#/'; return ''; }
    return `<form class="rs-carte rs-etroit" data-form="connexion" novalidate>
      <h1 class="rs-titre">Connexion</h1>
      <button type="button" class="btn rs-btn-google btn-block" data-act="google">${UI.GOOGLE}<span>Continuer avec Google</span></button>
      <p class="rs-ou"><span>ou</span></p>
      <div class="field"><label for="f-email">Adresse e-mail</label><input id="f-email" name="email" type="email" autocomplete="email" placeholder="prenom.nom@gmail.com" required></div>
      <button class="btn btn-ink btn-block" type="submit">Recevoir mon lien de connexion</button>
      <p class="rs-mini">Pas de mot de passe : un lien valable une fois vous est envoyé. Même compte que pour les <a href="remplacements.html">Remplacements</a>.</p>
    </form>`;
  }

  function formProfil(m, { creation = false } = {}) {
    const c = S.compte || {};
    const v = k => esc((m && m[k]) ?? (creation ? (k === 'prenom' ? c.prenom : k === 'nom' ? c.nom : '') : '') ?? '');
    const radios = (n, table, val) => `<div class="rs-puces" role="radiogroup">${Object.entries(table).map(([k, l]) => `<label class="rs-puce"><input type="radio" name="${n}" value="${esc(k)}"${String(val ?? '') === k ? ' checked' : ''}><span>${esc(l)}</span></label>`).join('')}</div>`;
    const cases = (n, table, val = []) => `<div class="rs-puces">${Object.entries(table).map(([k, l]) => `<label class="rs-puce"><input type="checkbox" name="${n}" value="${esc(k)}"${val.includes(k) ? ' checked' : ''}><span>${esc(typeof l === 'string' ? l : l.label)}</span></label>`).join('')}</div>`;
    return `<form class="rs-carte rs-formulaire" data-form="${creation ? 'bienvenue' : 'profil'}" novalidate>
      ${creation ? `<h1 class="rs-titre">Bienvenue ${esc(c.prenom || '')}</h1><p class="rs-muted">Complétez votre profil pour rejoindre la Communauté. Votre téléphone et votre e-mail ne sont jamais affichés.</p>` : '<h2 class="rs-h">Informations</h2>'}
      ${creation && c.photoGoogle ? `<label class="rs-consentement"><input type="checkbox" name="photo_google" checked> ${avatar({ id: c.id }, 40, c.photoGoogle)} Utiliser ma photo Google comme photo de profil</label>` : ''}
      <fieldset><legend>Titre</legend>${radios('titre', { '': 'Aucun', Dr: 'Dr', Pr: 'Pr' }, (m && m.titre) || (creation ? 'Dr' : ''))}<small class="rs-aide">Le titre « Dr » ou « Pr » s'affiche une fois votre compte vérifié par l'équipe RadiologicHub.</small></fieldset>
      <div class="rs-ligne-champs"><div class="field"><label for="f-prenom">Prénom</label><input id="f-prenom" name="prenom" value="${v('prenom')}" autocomplete="given-name" maxlength="60"></div>
        <div class="field"><label for="f-nom">Nom</label><input id="f-nom" name="nom" value="${v('nom')}" autocomplete="family-name" maxlength="60"></div></div>
      <div class="field"><label for="f-telephone">Téléphone</label><input id="f-telephone" name="telephone" type="tel" value="${esc(c.telephone || '')}" autocomplete="tel" placeholder="98 123 456"><small class="rs-aide">Obligatoire, jamais affiché publiquement (vérification par SMS prévue plus tard).</small></div>
      <div class="rs-ligne-champs"><div class="field"><label for="f-statut">Statut</label><select id="f-statut" name="statut"><option value="">—</option>${Object.entries(RG.STATUTS).map(([k, l]) => `<option value="${k}"${m && m.statut === k ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select></div>
        <div class="field rs-si-resident"${m && m.statut === 'resident' ? '' : ' hidden'}><label for="f-annee">Année de résidanat</label><select id="f-annee" name="annee"><option value="">—</option>${RG.ANNEES.map(a => `<option value="${a}"${m && Number(m.annee) === a ? ' selected' : ''}>R${a}</option>`).join('')}</select></div></div>
      <div class="field"><label for="f-etablissement">Établissement</label><input id="f-etablissement" name="etablissement" value="${v('etablissement')}" maxlength="120" placeholder="Service, hôpital, clinique ou cabinet"></div>
      <div class="rs-ligne-champs"><div class="field"><label for="f-ville">Ville</label><input id="f-ville" name="ville" value="${v('ville')}" maxlength="60"></div>
        <div class="field"><label for="f-gouvernorat">Gouvernorat</label><select id="f-gouvernorat" name="gouvernorat"><option value="">—</option>${RG.GOUVERNORATS.map(g => `<option${m && m.gouvernorat === g ? ' selected' : ''}>${esc(g)}</option>`).join('')}</select></div></div>
      <fieldset><legend>Centres d'intérêt</legend>${cases('interets', RG.SPECIALITES, (m && m.interets) || [])}</fieldset>
      <div class="field"><label for="f-bio">Présentation</label><textarea id="f-bio" name="bio" rows="3" maxlength="500" placeholder="Quelques mots sur vous, votre pratique…">${v('bio')}</textarea></div>
      ${creation ? `<label class="rs-consentement"><input type="checkbox" name="consentement"> J'accepte les <a href="mentions-legales.html#conditions" target="_blank" rel="noopener">conditions d'utilisation</a> (dont l'interdiction de publier des données permettant d'identifier un patient) et le traitement de mes données selon la <a href="mentions-legales.html#donnees" target="_blank" rel="noopener">politique de protection des données</a> (loi organique n° 2004-63).</label>`
        : `<label class="rs-consentement"><input type="checkbox" name="emails_messages"${m.emails_messages ? ' checked' : ''}> M'envoyer un e-mail quand un message reste non lu</label>`}
      <div class="rs-form-erreurs"></div>
      <button class="btn btn-ink${creation ? ' btn-block' : ''}" type="submit">${creation ? 'Rejoindre la Communauté' : 'Enregistrer'}</button>
    </form>`;
  }
  const bienvenue = () => (!S ? (location.hash = '#/connexion', '') : S.membre ? (location.hash = '#/', '') : `<div class="rs-etroit">${formProfil(null, { creation: true })}</div>`);
  function lireProfil(f) {
    const fd = new FormData(f), d = Object.fromEntries(fd.entries());
    d.interets = fd.getAll('interets');
    d.consentement = !!fd.get('consentement');
    d.emails_messages = !!fd.get('emails_messages');
    d.titre = fd.get('titre') || '';
    return d;
  }

  /* =======================================================
     Fil des cas
     ======================================================= */
  function carteCas(c) {
    casCache.set(c.id, c);
    const n = (c.images || []).length;
    return `<article class="rs-carte-cas" data-cas="${esc(c.id)}">
      <header class="rs-auteur"><a href="#/profil/${esc(c.auteur_id)}" class="rs-auteur-lien">${avatar(c.auteur, 40)}<span><span class="rs-ligne-nom">${nom(c.auteur)}</span><span class="rs-ligne-sous">${esc(RG.statutAffiche(c.auteur))} · ${esc(RG.depuis(c.cree_le))}</span></span></a>
        <button type="button" class="rs-icone-btn" data-act="menu-cas" data-id="${esc(c.id)}" aria-label="Plus d'options">${icone('plus')}</button></header>
      ${c.etat === 'masque' ? `<p class="rs-bandeau is-alerte">Ce cas est masqué : ${esc(c.masque_motif || 'en attente de l\'administrateur')}. Vous seul le voyez.</p>` : ''}
      <a href="#/cas/${esc(c.id)}" class="rs-cas-lien">
        <div class="rs-cas-image"><img data-cas-img="${esc(c.id)}" alt="">${n > 1 ? `<span class="rs-nb-images">${icone('image')} ${n}</span>` : ''}</div>
        <div class="rs-cas-texte">${badgeSpe(c.specialite)} <span class="rs-moda">${modalites(c.modalites)}</span>
          <h3>${esc(c.titre)}</h3><p class="rs-extrait">${esc(c.histoire)}</p>
          ${c.question ? `<p class="rs-question">${esc(c.question)}</p>` : ''}</div>
      </a>
      ${actionsCas(c)}
    </article>`;
  }
  const actionsCas = c => `<footer class="rs-actions">
      <button type="button" class="rs-action${c.jaime ? ' is-actif' : ''}" data-act="jaime" data-id="${esc(c.id)}" aria-pressed="${!!c.jaime}" aria-label="J'aime">${icone('coeur')}<span>${c.nb_jaime || 0}</span></button>
      <a class="rs-action" href="#/cas/${esc(c.id)}#commentaires" aria-label="Commentaires">${icone('commentaire')}<span>${c.nb_commentaires || 0}</span></a>
      <button type="button" class="rs-action" data-act="partager" data-id="${esc(c.id)}" aria-label="Partager le lien">${icone('partager')}</button>
      <button type="button" class="rs-action is-droite${c.enregistre ? ' is-actif' : ''}" data-act="enregistrer" data-id="${esc(c.id)}" aria-pressed="${!!c.enregistre}" aria-label="Enregistrer">${icone('signet')}</button>
    </footer>`;
  async function chargerImages(racine = app) {
    for (const img of $$('img[data-cas-img]:not([src])', racine)) {
      const c = casCache.get(img.dataset.casImg);
      if (!c) continue;
      if (!urlsCache.has(c.id)) urlsCache.set(c.id, api.urlsImages(c).catch(() => []));
      const urls = await urlsCache.get(c.id);
      const i = Number(img.dataset.i || 0);
      if (urls[i]) img.src = urls[i];
    }
  }

  async function fil() {
    if (!S) return accueilVisiteur();
    const onglets = [['tous', 'Tous les cas'], ['abonnements', 'Abonnements'], ['enregistres', 'Enregistrés']];
    vue.liste = await api.fil({ onglet: vue.onglet, specialite: vue.specialite, q: vue.q, limite: 10 });
    vue.fin = vue.liste.length < 10;
    const nonVerifie = !peutPublier() ? `<div class="rs-bandeau">${icone('admin')}<span>Pour publier vos cas sous « ${esc(RG.nomAffiche({ ...S.membre, verifie: true, titre: S.membre.titre || 'Dr' }))} », ${S.membre.verification_demandee_le ? 'votre demande de vérification est en cours d\'examen.' : '<a href="#/moi#verification">faites vérifier votre compte</a>.'}</span></div>` : '';
    return `${nonVerifie}
      <div class="rs-fil-tete">
        <div class="rs-onglets" role="tablist">${onglets.map(([k, l]) => `<button type="button" role="tab" class="rs-onglet${vue.onglet === k ? ' is-actif' : ''}" aria-selected="${vue.onglet === k}" data-act="onglet" data-onglet="${k}">${l}</button>`).join('')}</div>
        <form class="rs-recherche-fil" data-form="recherche-fil" role="search"><input name="q" type="search" value="${esc(vue.q)}" placeholder="Rechercher un cas (mot-clé)" aria-label="Rechercher un cas">${icone('chercher')}</form>
        <div class="rs-specialites" role="group" aria-label="Spécialité"><button type="button" class="rs-chip${!vue.specialite ? ' is-actif' : ''}" data-act="specialite" data-spe="">Toutes</button>${Object.entries(RG.SPECIALITES).map(([k, s]) => `<button type="button" class="rs-chip${vue.specialite === k ? ' is-actif' : ''}" style="--c:${s.c}" data-act="specialite" data-spe="${k}">${esc(s.label)}</button>`).join('')}</div>
      </div>
      <div class="rs-liste" id="rs-liste">${vue.liste.length ? vue.liste.map(carteCas).join('') : vide(vue.onglet === 'abonnements' ? 'Abonnez-vous à des confrères pour voir leurs cas ici.' : vue.onglet === 'enregistres' ? 'Aucun cas enregistré : touchez l\'icône signet sous un cas.' : vue.q || vue.specialite ? 'Aucun cas ne correspond.' : 'Aucun cas publié pour l\'instant.', peutPublier() ? '<a class="btn btn-ink btn-sm" href="#/publier">Publier un cas</a>' : '')}</div>
      ${vue.fin ? '' : '<p class="rs-centre"><button type="button" class="btn btn-outline btn-sm" data-act="plus">Voir plus de cas</button></p>'}`;
  }

  /* =======================================================
     Détail d'un cas
     ======================================================= */
  async function detailCas(id) {
    if (!S) return accueilVisiteur();
    const c = await api.cas(id);
    if (!c) return vide('Ce cas n\'existe pas ou n\'est plus visible.', '<a class="btn btn-outline btn-sm" href="#/">Retour au fil</a>');
    casCache.set(c.id, c); urlsCache.delete(c.id);
    const [urls, coms, info] = await Promise.all([api.urlsImages(c), api.commentaires(id), c.auteur_id !== S.membre.id ? api.membre(c.auteur_id) : null]);
    urlsCache.set(c.id, Promise.resolve(urls));
    const moi = c.auteur_id === S.membre.id;
    return `<p class="rs-retour"><a href="#/" data-act="retour">${icone('retour')} Retour</a></p>
      <article class="rs-carte rs-cas-detail" data-cas="${esc(c.id)}">
        <header class="rs-auteur"><a href="#/profil/${esc(c.auteur_id)}" class="rs-auteur-lien">${avatar(c.auteur, 46)}<span><span class="rs-ligne-nom">${nom(c.auteur)}</span><span class="rs-ligne-sous">${esc(RG.statutAffiche(c.auteur))}${c.auteur.etablissement ? ` · ${esc(c.auteur.etablissement)}` : ''}</span></span></a>
          ${!moi && info ? `<button type="button" class="btn btn-sm ${info.suivi ? 'btn-outline' : 'btn-ink'}" data-act="suivre" data-id="${esc(c.auteur_id)}">${info.suivi ? 'Abonné' : 'Suivre'}</button>` : ''}
          <button type="button" class="rs-icone-btn" data-act="menu-cas" data-id="${esc(c.id)}" aria-label="Plus d'options">${icone('plus')}</button></header>
        ${c.etat === 'masque' ? `<p class="rs-bandeau is-alerte">Ce cas est masqué : ${esc(c.masque_motif || '')}.</p>` : ''}
        <div class="rs-carrousel" tabindex="0" aria-label="Images du cas">${(c.images || []).map((im, i) => `<figure><button type="button" data-act="agrandir" data-i="${i}" aria-label="Agrandir l'image ${i + 1}"><img src="${esc(urls[i] || '')}" alt="${esc(im.legende || `Image ${i + 1}`)}"></button>${im.legende ? `<figcaption>${esc(im.legende)}</figcaption>` : ''}</figure>`).join('')}</div>
        ${(c.images || []).length > 1 ? `<p class="rs-points">${c.images.map((_, i) => `<span class="${i ? '' : 'is-actif'}"></span>`).join('')}</p>` : ''}
        <div class="rs-cas-corps">
          <p>${badgeSpe(c.specialite)} <span class="rs-moda">${modalites(c.modalites)}</span> <span class="rs-ligne-sous">· ${esc(RG.depuis(c.cree_le))}${c.modifie_le ? ' · modifié' : ''}</span></p>
          <h1 class="rs-titre">${esc(c.titre)}</h1>
          <p class="rs-histoire">${lignes(c.histoire)}</p>
          ${c.question ? `<p class="rs-question">${esc(c.question)}</p>` : ''}
          ${c.reponse ? `<div class="rs-reponse" hidden><h2 class="rs-h">Réponse et discussion</h2><p>${lignes(c.reponse)}</p></div><p><button type="button" class="btn btn-ink btn-sm" data-act="reponse">Voir la réponse</button></p>` : ''}
        </div>
        ${actionsCas(c)}
      </article>
      <section class="rs-carte" id="commentaires">
        <h2 class="rs-h">Commentaires (${coms.length})</h2>
        <ul class="rs-commentaires">${coms.map(x => commentaire(x, c)).join('') || '<li class="rs-muted">Soyez le premier à commenter.</li>'}</ul>
        ${c.etat === 'publie' ? `<form class="rs-commenter" data-form="commenter" data-id="${esc(c.id)}">${avatar(S.membre, 34)}<textarea name="texte" rows="1" maxlength="1500" placeholder="Votre commentaire…" aria-label="Votre commentaire"></textarea><button class="rs-icone-btn is-envoyer" type="submit" aria-label="Publier le commentaire">${icone('envoyer')}</button></form>` : ''}
      </section>`;
  }
  const commentaire = (x, c) => `<li class="rs-commentaire" data-com="${esc(x.id)}">${avatar(x.auteur, 34)}<div><p class="rs-bulle-com"><a href="#/profil/${esc(x.auteur_id)}">${nom(x.auteur)}</a> ${lignes(x.texte)}</p>
      <p class="rs-ligne-sous">${esc(RG.depuis(x.cree_le))}${x.etat === 'masque' ? ' · masqué' : ''}
      ${x.auteur_id === S.membre.id || c.auteur_id === S.membre.id || S.admin ? ` · <button type="button" class="rs-lien-btn" data-act="supprimer-com" data-id="${esc(x.id)}">Supprimer</button>` : ''}
      ${x.auteur_id !== S.membre.id ? ` · <button type="button" class="rs-lien-btn" data-act="signaler" data-type="commentaire" data-id="${esc(x.id)}">Signaler</button>` : ''}</p></div></li>`;

  /* =======================================================
     Publier un cas
     ======================================================= */
  async function publier() {
    if (!S) return accueilVisiteur();
    if (!peutPublier()) {
      return `<div class="rs-carte rs-etroit"><h1 class="rs-titre">Publier un cas</h1>
        <p>La publication de cas sous votre nom est réservée aux <strong>comptes vérifiés</strong> (radiologues, résidents et médecins), pour que chaque « Dr » de la Communauté en soit vraiment un.</p>
        ${S.membre.verification_demandee_le ? '<p class="rs-bandeau">Votre demande de vérification est en cours d\'examen : vous serez prévenu dès qu\'elle sera acceptée.</p>' : '<p><a class="btn btn-ink" href="#/moi#verification">Faire vérifier mon compte</a></p>'}
        <p class="rs-muted">En attendant, vous pouvez lire, commenter, enregistrer les cas et écrire à vos confrères.</p></div>`;
    }
    const b = vue.brouillon = vue.brouillon || { images: [], titre: '', specialite: '', modalites: [], histoire: '', question: '', reponse: '', attestation: false };
    return `<form class="rs-carte rs-formulaire rs-publier" data-form="publier" novalidate>
      <h1 class="rs-titre">Publier un cas</h1>
      <div class="rs-bandeau is-alerte">${icone('admin')}<span><strong>Anonymisation obligatoire.</strong> Aucun nom, date de naissance, numéro de dossier, visage ni texte incrusté permettant d'identifier le patient. Les métadonnées des images sont retirées automatiquement ; masquez les zones sensibles avec l'outil ${icone('masque')}.</span></div>
      <fieldset><legend>Images (1 à ${RG.LIMITES.images})</legend>
        <div class="rs-vignettes" id="rs-vignettes">${vignettes()}</div>
        <label class="btn btn-outline btn-sm rs-ajouter-images">${icone('image')} Ajouter des images<input type="file" accept="image/jpeg,image/png,image/webp" multiple hidden data-act-change="images"></label>
        <small class="rs-aide">JPEG ou PNG (exportez les images DICOM en JPEG). 8 Mo au plus par image ; elles sont réduites à 1600 px.</small>
      </fieldset>
      <div class="field"><label for="f-titre">Titre</label><input id="f-titre" name="titre" maxlength="120" value="${esc(b.titre)}" placeholder="Ex. : Céphalée brutale chez une femme de 45 ans"></div>
      <div class="rs-ligne-champs"><div class="field"><label for="f-specialite">Spécialité</label><select id="f-specialite" name="specialite"><option value="">—</option>${Object.entries(RG.SPECIALITES).map(([k, s]) => `<option value="${k}"${b.specialite === k ? ' selected' : ''}>${esc(s.label)}</option>`).join('')}</select></div></div>
      <fieldset><legend>Modalités</legend><div class="rs-puces">${Object.entries(RG.MODALITES).map(([k, l]) => `<label class="rs-puce"><input type="checkbox" name="modalites" value="${k}"${b.modalites.includes(k) ? ' checked' : ''}><span>${esc(l)}</span></label>`).join('')}</div></fieldset>
      <div class="field"><label for="f-histoire">Histoire clinique</label><textarea id="f-histoire" name="histoire" rows="4" maxlength="3000" placeholder="Âge, contexte, symptômes, examen réalisé…">${esc(b.histoire)}</textarea></div>
      <div class="field"><label for="f-question">Question posée aux confrères (facultatif)</label><input id="f-question" name="question" maxlength="300" value="${esc(b.question)}" placeholder="Ex. : Quel est votre diagnostic ?"></div>
      <div class="field"><label for="f-reponse">Réponse et discussion (facultatif)</label><textarea id="f-reponse" name="reponse" rows="4" maxlength="3000" placeholder="Diagnostic, signes clés, pièges…">${esc(b.reponse)}</textarea><small class="rs-aide">Cachée derrière un bouton « Voir la réponse ».</small></div>
      <div class="rs-alerte-identite" id="rs-alerte-identite" aria-live="polite"></div>
      <label class="rs-consentement is-important"><input type="checkbox" name="attestation"${b.attestation ? ' checked' : ''}> J'atteste que les images et le texte sont <strong>anonymisés</strong> (aucune donnée permettant d'identifier le patient) et que je peux les partager à des fins d'enseignement.</label>
      <div class="rs-form-erreurs"></div>
      <button class="btn btn-ink btn-block" type="submit">Publier le cas</button>
      <p class="rs-mini rs-centre">Publié sous le nom « ${esc(RG.nomAffiche(S.membre))} », visible des seuls membres connectés.</p>
    </form>`;
  }
  const vignettes = () => (vue.brouillon.images.length ? vue.brouillon.images.map((im, i) => `<figure class="rs-vignette">
      <img src="${esc(im.url)}" alt="Image ${i + 1}">
      <div class="rs-vignette-actions"><button type="button" class="rs-icone-btn" data-act="masquer-image" data-i="${i}" aria-label="Masquer une zone de l'image ${i + 1}" title="Masquer une zone">${icone('masque')}</button><button type="button" class="rs-icone-btn" data-act="retirer-image" data-i="${i}" aria-label="Retirer l'image ${i + 1}" title="Retirer">${icone('supprimer')}</button></div>
      ${im.masques.length ? `<span class="rs-vignette-info">${im.masques.length} zone${im.masques.length > 1 ? 's' : ''} masquée${im.masques.length > 1 ? 's' : ''}</span>` : ''}
      <input class="rs-legende" value="${esc(im.legende)}" data-legende="${i}" maxlength="120" placeholder="Légende (facultatif)" aria-label="Légende de l'image ${i + 1}">
      ${im.retirees.length ? `<small class="rs-aide">Métadonnées retirées : ${esc(im.retirees.join(', '))}</small>` : ''}
    </figure>`).join('') : '<p class="rs-muted">Aucune image pour l\'instant.</p>');
  function majBrouillon(f) {
    const fd = new FormData(f), b = vue.brouillon;
    Object.assign(b, { titre: fd.get('titre') || '', specialite: fd.get('specialite') || '', modalites: fd.getAll('modalites'), histoire: fd.get('histoire') || '', question: fd.get('question') || '', reponse: fd.get('reponse') || '', attestation: !!fd.get('attestation') });
    $$('[data-legende]', f).forEach(i => { if (b.images[i.dataset.legende]) b.images[i.dataset.legende].legende = i.value; });
    const textes = [b.titre, b.histoire, b.question, b.reponse, ...b.images.map(i => i.legende)].join('\n');
    const alertes = C.identite(textes);
    $('#rs-alerte-identite').innerHTML = alertes.length ? `<p class="rs-bandeau is-alerte">${icone('drapeau')}<span><strong>Identité possible</strong> : ${alertes.map(a => `« ${esc(a.texte)} »`).join(', ')}. Retirez ces éléments avant de publier.</span></p>` : '';
    return alertes;
  }
  async function ajouterImages(fichiers) {
    const b = vue.brouillon;
    for (const f of fichiers) {
      if (b.images.length >= RG.LIMITES.images) { toast(`${RG.LIMITES.images} images au plus.`, 'ko'); break; }
      const r = await essayer(() => IMG.preparer(f));
      if (!r) continue;
      b.images.push({ fichier: f, blob: r.blob, url: URL.createObjectURL(r.blob), retirees: r.retirees, masques: [], legende: '' });
    }
    $('#rs-vignettes').innerHTML = vignettes();
  }

  /* =======================================================
     Profils
     ======================================================= */
  async function profil(id) {
    if (!S) return accueilVisiteur();
    const info = await api.membre(id);
    if (!info) return vide('Ce profil n\'existe pas ou n\'est pas visible.', '<a class="btn btn-outline btn-sm" href="#/">Retour au fil</a>');
    const m = info.membre, moi = m.id === S.membre.id;
    const liste = await api.fil({ auteur: m.id, limite: 30 });
    liste.forEach(c => casCache.set(c.id, c));
    return `<section class="rs-carte rs-profil">
        <div class="rs-profil-bandeau" style="--c:${UI.couleur(m.id)}"></div>
        <div class="rs-profil-tete">${avatar(m, 104)}
          <div class="rs-profil-actions">${moi ? '<a class="btn btn-outline btn-sm" href="#/moi">Modifier le profil</a>'
            : info.bloque ? `<button type="button" class="btn btn-outline btn-sm" data-act="debloquer" data-id="${esc(m.id)}">Débloquer</button>`
            : `<button type="button" class="btn btn-sm ${info.suivi ? 'btn-outline' : 'btn-ink'}" data-act="suivre" data-id="${esc(m.id)}">${info.suivi ? 'Abonné' : 'Suivre'}</button><a class="btn btn-outline btn-sm" href="#/messages/nouveau/${esc(m.id)}">${icone('messages')} Message</a><button type="button" class="rs-icone-btn" data-act="menu-membre" data-id="${esc(m.id)}" aria-label="Plus d'options">${icone('plus')}</button>`}</div>
        </div>
        <h1 class="rs-profil-nom">${nom(m)}</h1>
        <p class="rs-profil-statut">${esc(RG.statutAffiche(m))}${m.etablissement ? ` · ${esc(m.etablissement)}` : ''}${m.ville || m.gouvernorat ? ` · ${esc([m.ville, m.gouvernorat].filter((x, i, a) => x && a.indexOf(x) === i).join(', '))}` : ''}</p>
        ${info.remplacant ? `<p><a class="rs-badge-rempl" href="remplacements.html">${icone('remplacements')} Disponible pour des remplacements</a></p>` : ''}
        ${m.bio ? `<p class="rs-profil-bio">${lignes(m.bio)}</p>` : ''}
        ${(m.interets || []).length ? `<p class="rs-interets">${m.interets.map(badgeSpe).join(' ')}</p>` : ''}
        <ul class="rs-stats"><li><strong>${info.stats.cas}</strong> cas</li><li><strong>${info.stats.abonnes}</strong> abonnés</li><li><strong>${info.stats.abonnements}</strong> abonnements</li></ul>
        ${moi && !m.verifie ? `<p class="rs-bandeau">${icone('admin')}<span>${m.verification_demandee_le ? 'Vérification en cours d\'examen.' : 'Compte non vérifié : <a href="#/moi#verification">demander la vérification</a> pour publier sous « Dr ».'}</span></p>` : ''}
      </section>
      <h2 class="rs-h">Cas publiés</h2>
      ${liste.length ? `<div class="rs-grille">${liste.map(c => `<a class="rs-grille-cas" href="#/cas/${esc(c.id)}"><img data-cas-img="${esc(c.id)}" alt=""><span>${esc(c.titre)}</span></a>`).join('')}</div>` : vide(moi ? 'Vous n\'avez pas encore publié de cas.' : 'Aucun cas publié.', moi && peutPublier() ? '<a class="btn btn-ink btn-sm" href="#/publier">Publier un cas</a>' : '')}`;
  }

  async function moi() {
    if (!S) return accueilVisiteur();
    const m = S.membre;
    return `<p class="rs-retour"><a href="#/profil/${esc(m.id)}">${icone('retour')} Mon profil</a></p>
      <section class="rs-carte rs-photo-edit"><h2 class="rs-h">Photo de profil</h2>
        <div class="rs-photo-ligne">${avatar(m, 88)}<div><label class="btn btn-outline btn-sm">${icone('image')} Changer la photo<input type="file" accept="image/jpeg,image/png,image/webp" hidden data-act-change="photo"></label>
        <p class="rs-aide">Recadrée en carré ; métadonnées retirées.</p></div></div></section>
      ${formProfil(m)}
      <section class="rs-carte" id="verification"><h2 class="rs-h">Vérification du compte</h2>
        ${m.verifie ? `<p class="rs-bandeau is-ok">${icone('admin')}<span>Compte vérifié${m.verifie_le ? ` le ${esc(RG.dateFr(m.verifie_le))}` : ''} : votre titre s'affiche et vous pouvez publier des cas.</span></p>`
          : S.remplacantValide ? '<p class="rs-bandeau is-ok">Remplaçant validé : vous pouvez publier des cas. Le titre « Dr » s\'affichera après vérification de votre compte.</p>' : ''}
        ${!m.verifie ? (m.verification_demandee_le ? `<p class="rs-bandeau">Demande envoyée le ${esc(RG.dateFr(m.verification_demandee_le))} : en cours d'examen par l'équipe RadiologicHub.</p>`
          : `<form data-form="verification" novalidate><p>Envoyez un justificatif (carte professionnelle, attestation d'inscription à l'Ordre, de résidanat ou de fonction). Il n'est visible que de l'administrateur.</p>
            <div class="field"><label for="f-justificatif">Justificatif (PDF ou image, 5 Mo au plus)</label><input id="f-justificatif" name="justificatif" type="file" accept=".pdf,.jpg,.jpeg,.png"></div>
            <button class="btn btn-ink btn-sm" type="submit">Demander la vérification</button></form>`) : ''}
      </section>
      <section class="rs-carte rs-danger-zone"><h2 class="rs-h">Supprimer mon compte</h2>
        <p>Supprime définitivement votre profil, vos cas, vos commentaires, vos messages et, le cas échéant, votre inscription aux Remplacements.</p>
        <button type="button" class="btn btn-outline btn-sm rs-danger" data-act="supprimer-compte">Supprimer mon compte</button></section>`;
  }

  /* =======================================================
     Messagerie
     ======================================================= */
  async function messagerie(convId) {
    if (!S) return accueilVisiteur();
    const conv = await api.conversations();
    vue.conversations = conv;
    const actuelle = convId && conv.find(c => c.conversation_id === convId);
    if (convId && !actuelle) return vide('Conversation introuvable.', '<a class="btn btn-outline btn-sm" href="#/messages">Mes messages</a>');
    const liste = `<aside class="rs-conv-liste">
        <div class="rs-conv-tete"><h1 class="rs-titre">Messages</h1><button type="button" class="rs-icone-btn" data-act="nouveau-message" aria-label="Nouveau message" title="Nouveau message">${icone('modifier')}</button></div>
        <ul id="rs-conv-ul">${elementsConversations(conv, convId)}</ul>
      </aside>`;
    if (!actuelle) return `<div class="rs-messagerie">${liste}<section class="rs-conv-vide"><p>${icone('messages')}</p><p>Choisissez une conversation ou écrivez à un confrère.</p></section></div>`;
    vue.conv = actuelle;
    const msgs = await api.messages(convId);
    const a = actuelle.autre;
    return `<div class="rs-messagerie is-conv">${liste}
      <section class="rs-conversation" data-conv="${esc(convId)}">
        <header class="rs-conv-entete"><a href="#/messages" class="rs-icone-btn rs-mobile" aria-label="Retour aux conversations">${icone('retour')}</a>
          ${a ? `<a href="#/profil/${esc(a.id)}" class="rs-auteur-lien">${avatar(a, 40)}<span><span class="rs-ligne-nom">${nom(a)}</span><span class="rs-ligne-sous">${esc(RG.statutAffiche(a))}</span></span></a>` : '<span>Compte supprimé</span>'}
          ${a ? `<button type="button" class="rs-icone-btn" data-act="menu-membre" data-id="${esc(a.id)}" aria-label="Plus d'options">${icone('plus')}</button>` : ''}</header>
        <div class="rs-fil-messages" id="rs-fil-messages" aria-live="polite">
          <p class="rs-avertissement">Messagerie privée entre confrères. <strong>Ne partagez pas de données permettant d'identifier un patient.</strong></p>
          ${bulles(msgs, actuelle)}</div>
        ${actuelle.bloque ? '<p class="rs-bandeau rs-conv-bloque">Conversation bloquée : vous ne pouvez plus échanger de messages.</p>'
          : a ? `<form class="rs-saisie" data-form="message" data-conv="${esc(convId)}">
            <label class="rs-icone-btn" aria-label="Joindre une image" title="Joindre une image">${icone('image')}<input type="file" accept="image/jpeg,image/png,image/webp" hidden data-act-change="image-message"></label>
            <div class="rs-saisie-zone"><div class="rs-saisie-image" hidden></div><textarea name="texte" rows="1" maxlength="4000" placeholder="Votre message…" aria-label="Votre message"></textarea></div>
            <button class="rs-icone-btn is-envoyer" type="submit" aria-label="Envoyer">${icone('envoyer')}</button></form>` : ''}
      </section></div>`;
  }
  const elementsConversations = (conv, convId) => conv.map(c => `<li><a class="rs-conv${c.conversation_id === convId ? ' is-actif' : ''}${c.non_lus && c.conversation_id !== convId ? ' is-non-lu' : ''}" href="#/messages/${esc(c.conversation_id)}">${avatar(c.autre, 50)}
      <span class="rs-conv-texte"><span class="rs-ligne-nom">${c.autre ? nom(c.autre) : 'Compte supprimé'}</span><span class="rs-conv-apercu">${c.dernier_auteur === S.membre.id ? 'Vous : ' : ''}${esc(c.dernier_message || 'Nouvelle conversation')}</span></span>
      <span class="rs-conv-meta">${c.dernier_message_le ? esc(RG.depuis(c.dernier_message_le)) : ''}${c.non_lus && c.conversation_id !== convId ? `<span class="rs-pastille">${c.non_lus}</span>` : ''}</span></a></li>`).join('')
    || '<li class="rs-vide-conv"><p>Aucune conversation.</p><button type="button" class="btn btn-ink btn-sm" data-act="nouveau-message">Écrire à un confrère</button></li>';
  function bulles(msgs, conv) {
    let jour = '', h = '';
    const dernierMien = [...msgs].reverse().find(m => m.auteur_id === S.membre.id && !m.supprime);
    msgs.forEach((m, i) => {
      const j = RG.dateFr(m.cree_le);
      if (j !== jour) { jour = j; h += `<p class="rs-jour">${j === RG.dateFr(new Date()) ? 'Aujourd\'hui' : j === RG.dateFr(new Date(Date.now() - 864e5)) ? 'Hier' : j}</p>`; }
      const mien = m.auteur_id === S.membre.id;
      const suite = msgs[i + 1] && msgs[i + 1].auteur_id === m.auteur_id && RG.dateFr(msgs[i + 1].cree_le) === j;
      h += `<div class="rs-bulle${mien ? ' is-mien' : ''}${suite ? ' is-suite' : ''}" data-msg="${esc(m.id)}">
        ${m.supprime ? '<p class="rs-bulle-texte is-supprime">Message supprimé</p>' : `${m.image ? `<button type="button" class="rs-bulle-image" data-act="image-msg" data-chemin="${esc(m.image)}"><img data-msg-img="${esc(m.image)}" alt="Image jointe"></button>` : ''}${m.texte ? `<p class="rs-bulle-texte">${lignes(m.texte)}</p>` : ''}`}
        <span class="rs-bulle-heure">${esc(RG.heureFr(m.cree_le))}${mien && !m.supprime ? ` <button type="button" class="rs-lien-btn" data-act="supprimer-msg" data-id="${esc(m.id)}" aria-label="Supprimer ce message">supprimer</button>` : ''}</span>
      </div>`;
    });
    const dernier = msgs.filter(m => !m.supprime).slice(-1)[0];
    if (dernierMien && dernier === dernierMien && conv.autre_lu_le && conv.autre_lu_le >= dernierMien.cree_le) h += '<p class="rs-vu">Vu</p>';
    return h;
  }
  async function chargerImagesMessages() {
    for (const img of $$('img[data-msg-img]:not([src])')) { const u = await api.urlImageMessage(img.dataset.msgImg).catch(() => null); if (u) img.src = u; }
  }
  async function rafraichirConversation() {
    const z = $('#rs-fil-messages');
    if (!z || !vue.conv) return;
    const enBas = z.scrollHeight - z.scrollTop - z.clientHeight < 80;
    const toutes = await api.conversations();
    const conv = toutes.find(c => c.conversation_id === vue.conv.conversation_id) || vue.conv;
    vue.conv = conv;
    const ul = $('#rs-conv-ul');
    if (ul) ul.innerHTML = elementsConversations(toutes, conv.conversation_id);
    const msgs = await api.messages(conv.conversation_id);
    z.innerHTML = `<p class="rs-avertissement">Messagerie privée entre confrères. <strong>Ne partagez pas de données permettant d'identifier un patient.</strong></p>${bulles(msgs, conv)}`;
    chargerImagesMessages();
    if (enBas) z.scrollTop = z.scrollHeight;
    if (document.visibilityState === 'visible') await api.marquerLu(conv.conversation_id);
    majBadges();
  }
  async function choisirDestinataire() {
    let liste = await api.chercherMembres('');
    const rendre = l => l.map(m => `<button type="button" class="rs-ligne-membre" data-choix="${esc(m.id)}">${avatar(m, 40)}<span><span class="rs-ligne-nom">${nom(m)}</span><span class="rs-ligne-sous">${esc(RG.statutAffiche(m))}${m.ville ? ` · ${esc(m.ville)}` : ''}</span></span></button>`).join('') || '<p class="rs-muted">Aucun membre trouvé.</p>';
    return UI.fenetre({
      titre: 'Nouveau message',
      contenu: `<input type="search" class="rs-champ" placeholder="Rechercher un confrère" aria-label="Rechercher un confrère"><div class="rs-choix-membres">${rendre(liste)}</div>`,
      boutons: [],
      onOuvert(d, fermer) {
        const zone = d.querySelector('.rs-choix-membres');
        d.querySelector('input').addEventListener('input', async e => { liste = await api.chercherMembres(e.target.value); zone.innerHTML = rendre(liste); });
        zone.addEventListener('click', e => { const b = e.target.closest('[data-choix]'); if (b) fermer(b.dataset.choix); });
      },
    });
  }

  /* =======================================================
     Notifications, recherche
     ======================================================= */
  const TEXTES_NOTIF = {
    jaime: n => `${nom(n.acteur)} a aimé votre cas`, commentaire: n => `${nom(n.acteur)} a commenté votre cas`, abonnement: n => `${nom(n.acteur)} s'est abonné à vos cas`,
    nouveau_cas: n => `${nom(n.acteur)} a publié un nouveau cas`, verification: () => '<strong>Votre compte est vérifié</strong> : votre titre s\'affiche et vous pouvez publier des cas', cas_masque: () => 'Votre cas a été <strong>masqué</strong> à la suite de signalements, en attendant l\'administrateur',
  };
  async function notifications() {
    if (!S) return accueilVisiteur();
    const l = await api.notifications();
    await api.marquerNotificationsLues();
    setTimeout(majBadges, 300);
    return `<h1 class="rs-titre">Notifications</h1>
      <ul class="rs-carte rs-notifs">${l.map(n => `<li class="${n.lu ? '' : 'is-non-lu'}"><a href="${n.cas ? `#/cas/${esc(n.cas.id)}` : n.acteur ? `#/profil/${esc(n.acteur.id)}` : '#/moi'}">${n.acteur ? avatar(n.acteur, 44) : `<span class="rs-avatar is-initiales" style="--t:44px;--c:var(--green)">${icone('admin')}</span>`}
        <span><span>${(TEXTES_NOTIF[n.type] || (() => esc(n.type)))(n)}${n.cas ? ` : « ${esc(n.cas.titre)} »` : ''}</span><span class="rs-ligne-sous">${esc(RG.depuis(n.cree_le))}</span></span></a></li>`).join('') || '<li class="rs-muted">Aucune notification.</li>'}</ul>`;
  }
  async function recherche() {
    if (!S) return accueilVisiteur();
    return `<h1 class="rs-titre">Rechercher</h1>
      <form class="rs-recherche-fil is-grande" data-form="recherche" role="search"><input name="q" type="search" value="${esc(vue.q)}" placeholder="Un confrère, une ville, un mot-clé…" aria-label="Rechercher" autofocus>${icone('chercher')}</form>
      <div class="rs-onglets" role="tablist">${[['membres', 'Membres'], ['cas', 'Cas']].map(([k, l]) => `<button type="button" role="tab" class="rs-onglet${vue.rechercheOnglet === k ? ' is-actif' : ''}" aria-selected="${vue.rechercheOnglet === k}" data-act="recherche-onglet" data-onglet="${k}">${l}</button>`).join('')}</div>
      <div id="rs-resultats">${await resultats()}</div>`;
  }
  async function resultats() {
    if (vue.rechercheOnglet === 'cas') {
      const l = await api.fil({ q: vue.q, limite: 30 });
      return l.length ? `<div class="rs-liste">${l.map(carteCas).join('')}</div>` : vide('Aucun cas ne correspond.');
    }
    const l = await api.chercherMembres(vue.q);
    return `<div class="rs-carte">${l.map(m => `<a class="rs-ligne-membre" href="#/profil/${esc(m.id)}">${avatar(m, 46)}<span><span class="rs-ligne-nom">${nom(m)}</span><span class="rs-ligne-sous">${esc(RG.statutAffiche(m))}${m.etablissement ? ` · ${esc(m.etablissement)}` : ''}${m.ville ? ` · ${esc(m.ville)}` : ''}</span></span></a>`).join('') || '<p class="rs-muted">Aucun membre ne correspond.</p>'}</div>`;
  }

  /* =======================================================
     Administration
     ======================================================= */
  async function admin() {
    if (!S || !S.admin) return vide('Page réservée à l\'administrateur.');
    const [st, ver, sig] = await Promise.all([api.admin.statistiques(), api.admin.verifications(), api.admin.signalements()]);
    const chiffre = (l, v, c) => `<div class="rs-chiffre" style="--c:${c}"><span>${l}</span><strong>${v ?? '—'}</strong></div>`;
    return `<h1 class="rs-titre">Administration de la Communauté</h1>
      <div class="rs-chiffres">${chiffre('Membres', st.membres, 'var(--cornflower)')}${chiffre('Vérifiés', st.verifies, 'var(--green)')}${chiffre('Cas', st.cas, 'var(--teal)')}${chiffre('Cas masqués', st.masques, 'var(--crimson)')}${chiffre('Signalements', st.signalements, 'var(--amber)')}${chiffre('Vérifications', st.attente, 'var(--plum)')}</div>
      <section class="rs-carte"><h2 class="rs-h">Demandes de vérification (${ver.length})</h2>
        ${ver.map(m => `<div class="rs-admin-ligne">${avatar(m, 44)}<div><span class="rs-ligne-nom">${esc(RG.nomAffiche({ ...m, verifie: true }))}</span><span class="rs-ligne-sous">${esc(RG.statutAffiche(m))}${m.etablissement ? ` · ${esc(m.etablissement)}` : ''}${m.ville ? ` · ${esc(m.ville)}` : ''} · demandé ${esc(RG.depuis(m.verification_demandee_le))}</span>
          ${m.justificatif ? `<button type="button" class="rs-lien-btn" data-act="justificatif" data-chemin="${esc(m.justificatif)}">Voir le justificatif</button>` : '<span class="rs-ligne-sous">Pas de justificatif</span>'}</div>
          <span class="rs-boutons"><button type="button" class="btn btn-sm rs-oui" data-act="verifier" data-id="${esc(m.id)}" data-oui="1">Vérifier</button><button type="button" class="btn btn-outline btn-sm" data-act="verifier" data-id="${esc(m.id)}">Refuser</button></span></div>`).join('') || '<p class="rs-muted">Aucune demande en attente.</p>'}</section>
      <section class="rs-carte"><h2 class="rs-h">Signalements à traiter (${sig.length})</h2>
        ${sig.map(s => `<div class="rs-admin-ligne is-signalement"><div><span class="rs-ligne-nom">${esc({ cas: 'Cas', commentaire: 'Commentaire', message: 'Message', membre: 'Membre' }[s.cible_type])} — ${esc(RG.MOTIFS_SIGNALEMENT[s.motif] || s.motif)}</span>
          <span class="rs-ligne-sous">« ${esc(String(s.apercu || '').slice(0, 140))} »${s.etat_cible === 'masque' ? ' · déjà masqué' : ''} · signalé par ${esc(RG.nomAffiche(s.auteur))} ${esc(RG.depuis(s.cree_le))}${s.details ? ` · ${esc(s.details)}` : ''}</span>
          ${s.cas_id ? `<a class="rs-lien" href="#/cas/${esc(s.cas_id)}">Voir le cas</a>` : ''}</div>
          <span class="rs-boutons"><button type="button" class="btn btn-sm rs-danger" data-act="traiter" data-id="${esc(s.id)}" data-decision="retire">${s.cible_type === 'membre' ? 'Suspendre' : 'Retirer'}</button><button type="button" class="btn btn-outline btn-sm" data-act="traiter" data-id="${esc(s.id)}" data-decision="rejete">Rejeter</button></span></div>`).join('') || '<p class="rs-muted">Aucun signalement en attente.</p>'}</section>
      <section class="rs-carte"><h2 class="rs-h">Membres</h2>
        <form class="rs-recherche-fil" data-form="admin-membres" role="search"><input name="q" type="search" placeholder="Rechercher un membre" aria-label="Rechercher un membre">${icone('chercher')}</form>
        <div id="rs-admin-membres">${await adminMembres('')}</div></section>`;
  }
  async function adminMembres(q) {
    const l = await api.admin.membres(q);
    return l.map(m => `<div class="rs-admin-ligne">${avatar(m, 40)}<div><a class="rs-ligne-nom" href="#/profil/${esc(m.id)}">${nom(m)}</a><span class="rs-ligne-sous">${esc(RG.statutAffiche(m))}${m.email ? ` · ${esc(m.email)}` : ''}${m.suspendu ? ' · <strong>suspendu</strong>' : ''}</span></div>
      <span class="rs-boutons">${m.verifie ? `<button type="button" class="rs-lien-btn" data-act="retirer-verif" data-id="${esc(m.id)}">Retirer la vérification</button>` : ''}<button type="button" class="rs-lien-btn" data-act="suspendre" data-id="${esc(m.id)}"${m.suspendu ? '' : ' data-oui="1"'}>${m.suspendu ? 'Réactiver' : 'Suspendre'}</button></span></div>`).join('') || '<p class="rs-muted">Aucun membre.</p>';
  }

  /* =======================================================
     Routeur
     ======================================================= */
  const ROUTES = [
    [/^#?\/?$/, fil], [/^#\/connexion$/, connexion], [/^#\/bienvenue$/, bienvenue], [/^#\/cas\/([\w-]+)(?:#.*)?$/, detailCas], [/^#\/publier$/, publier],
    [/^#\/profil\/([\w-]+)$/, profil], [/^#\/moi(?:#.*)?$/, moi], [/^#\/messages\/nouveau\/([\w-]+)$/, nouvelleConversation], [/^#\/messages(?:\/([\w-]+))?$/, messagerie],
    [/^#\/notifications$/, notifications], [/^#\/recherche$/, recherche], [/^#\/admin$/, admin],
  ];
  async function nouvelleConversation(membreId) {
    const c = await essayer(() => api.ouvrirConversation(membreId));
    location.replace(c ? `#/messages/${c}` : '#/messages');
    return '';
  }
  let jeton = 0;
  async function afficher() {
    let h = location.hash || '#/';
    if (h !== '#' && !h.startsWith('#/')) return;                // retour de connexion (#access_token=…)
    const sansAncre = h.replace(/(#\/[^#]*)#.*/, '$1');
    if (S && !S.membre && !/^#\/(bienvenue|connexion)$/.test(sansAncre)) { location.replace('#/bienvenue'); return; }
    const route = ROUTES.find(([re]) => re.test(sansAncre)) || ROUTES[0];
    const n = ++jeton;
    rendreNav();
    app.setAttribute('aria-busy', 'true');
    document.body.classList.toggle('rs-en-conversation', /^#\/messages\/[\w-]+$/.test(sansAncre));
    try {
      const html = await route[1](...(sansAncre.match(route[0]) || []).slice(1));
      if (n !== jeton) return;
      if (html !== '') app.innerHTML = html;
      apres(sansAncre, h);
    } catch (e) {
      console.error(e);
      app.innerHTML = vide(`Impossible d'afficher cette page : ${esc(e.message)}`, '<a class="btn btn-outline btn-sm" href="#/">Retour au fil</a>');
    } finally { app.removeAttribute('aria-busy'); }
  }
  function apres(route, complet) {
    chargerImages();
    if (/^#\/messages\/[\w-]+$/.test(route) && vue.conv) {
      const z = $('#rs-fil-messages');
      if (z) z.scrollTop = z.scrollHeight;
      chargerImagesMessages();
      api.marquerLu(vue.conv.conversation_id).then(majBadges);
      const t = $('.rs-saisie textarea'); if (t && matchMedia('(min-width: 900px)').matches) t.focus();
    } else vue.conv = null;
    if (/#commentaires$/.test(complet)) { const c = $('#commentaires'); if (c) c.scrollIntoView({ block: 'start' }); }
    if (/#verification$/.test(complet)) { const c = $('#verification'); if (c) c.scrollIntoView({ block: 'start' }); }
    if (route === '#/publier' && $('[data-form="publier"]')) majBrouillon($('[data-form="publier"]'));
    // carrousel : point actif
    const car = $('.rs-carrousel');
    if (car) car.addEventListener('scroll', () => { const i = Math.round(car.scrollLeft / car.clientWidth); $$('.rs-points span').forEach((p, k) => p.classList.toggle('is-actif', k === i)); }, { passive: true });
  }

  /* =======================================================
     Actions
     ======================================================= */
  const majCas = (id, patch) => { const c = casCache.get(id); if (c) Object.assign(c, patch); $$(`[data-cas="${CSS.escape(id)}"] .rs-actions`).forEach(f => { f.outerHTML = actionsCas(casCache.get(id)); }); };
  async function signaler(type, id) {
    const motif = await UI.fenetre({
      titre: 'Signaler',
      contenu: `<p>Pourquoi signalez-vous ce contenu ? L'administrateur est prévenu ; un cas signalé 3 fois pour « patient identifiable » est masqué aussitôt.</p>
        <div class="rs-puces is-colonne">${Object.entries(RG.MOTIFS_SIGNALEMENT).map(([k, l], i) => `<label class="rs-puce"><input type="radio" name="motif" value="${k}"${i ? '' : ' checked'}><span>${esc(l)}</span></label>`).join('')}</div>
        <div class="field"><label for="f-details">Précisions (facultatif)</label><textarea id="f-details" rows="2" maxlength="500"></textarea></div>`,
      boutons: [{ valeur: null, libelle: 'Annuler' }, { valeur: d => ({ motif: d.querySelector('[name="motif"]:checked').value, details: d.querySelector('#f-details').value }), libelle: 'Signaler', classe: 'btn-ink' }],
    });
    if (motif) await essayer(() => api.signaler(type, id, motif.motif, motif.details), 'Merci : signalement transmis à l\'administrateur.');
  }
  async function menu(options) {
    return UI.fenetre({ titre: 'Options', contenu: `<div class="rs-menu">${options.map((o, i) => `<button type="button" class="rs-menu-item${o.danger ? ' is-danger' : ''}" data-opt="${i}">${icone(o.icone)}<span>${esc(o.libelle)}</span></button>`).join('')}</div>`, boutons: [],
      onOuvert(d, fermer) { d.addEventListener('click', e => { const b = e.target.closest('[data-opt]'); if (b) fermer(Number(b.dataset.opt)); }); } })
      .then(i => (i == null ? null : options[i].action()));
  }
  const lienCas = id => `${location.href.replace(/#.*$/, '')}#/cas/${id}`;

  const ACTIONS = {
    async google() { const r = await essayer(() => api.connexionGoogle()); if (r && r.demo) { await rafraichir(); location.hash = S && S.membre ? '#/' : '#/bienvenue'; } },
    async deconnexion() { await api.deconnexion(); if (arreterEcoute) arreterEcoute(); S = null; location.hash = '#/'; afficher(); rendreCote(); },
    onglet(b) { vue.onglet = b.dataset.onglet; afficher(); },
    specialite(b) { vue.specialite = b.dataset.spe; afficher(); },
    async plus(b) {
      b.disabled = true;
      const suite = await api.fil({ onglet: vue.onglet, specialite: vue.specialite, q: vue.q, avant: vue.liste[vue.liste.length - 1].cree_le, limite: 10 });
      vue.liste.push(...suite);
      $('#rs-liste').insertAdjacentHTML('beforeend', suite.map(carteCas).join(''));
      chargerImages();
      if (suite.length < 10) b.parentElement.remove(); else b.disabled = false;
    },
    async jaime(b) { const r = await essayer(() => api.basculerJaime(b.dataset.id)); if (r === undefined) return; const c = casCache.get(b.dataset.id); majCas(b.dataset.id, { jaime: r, nb_jaime: Math.max(0, (c.nb_jaime || 0) + (r ? 1 : -1)) }); },
    async enregistrer(b) { const r = await essayer(() => api.basculerEnregistre(b.dataset.id)); if (r !== undefined) { majCas(b.dataset.id, { enregistre: r }); toast(r ? 'Cas enregistré.' : 'Retiré des enregistrés.'); } },
    async partager(b) {
      const url = lienCas(b.dataset.id), c = casCache.get(b.dataset.id);
      if (navigator.share && matchMedia('(pointer: coarse)').matches) { try { await navigator.share({ title: c ? c.titre : 'Cas RadiologicHub', text: 'Cas clinique sur RadiologicHub (réservé aux membres)', url }); return; } catch (e) { /* annulé */ } }
      try { await navigator.clipboard.writeText(url); toast('Lien copié (visible des membres connectés).'); } catch (e) { toast(url); }
    },
    reponse(b) { const r = $('.rs-reponse'); r.hidden = false; b.remove(); r.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); },
    async agrandir(b) { const c = casCache.get(b.closest('[data-cas]').dataset.cas); UI.visionneuse(await urlsCache.get(c.id), c.images.map(i => i.legende), Number(b.dataset.i)); },
    async suivre(b) { const r = await essayer(() => api.basculerAbonnement(b.dataset.id)); if (r === undefined) return; b.textContent = r ? 'Abonné' : 'Suivre'; b.classList.toggle('btn-ink', !r); b.classList.toggle('btn-outline', r); toast(r ? 'Abonné : ses nouveaux cas apparaîtront dans votre fil.' : 'Abonnement retiré.'); },
    async debloquer(b) { await essayer(() => api.debloquer(b.dataset.id), 'Membre débloqué.'); afficher(); },
    async 'menu-cas'(b) {
      const c = casCache.get(b.dataset.id) || await api.cas(b.dataset.id);
      if (!c) return;
      const options = [{ icone: 'partager', libelle: 'Copier le lien', action: () => ACTIONS.partager(b) }];
      if (c.auteur_id === S.membre.id || S.admin) {
        options.push({ icone: 'modifier', libelle: 'Modifier le texte', action: () => modifierCas(c) });
        options.push({ icone: 'supprimer', libelle: 'Supprimer le cas', danger: true, action: async () => { if (await UI.confirmer('Supprimer définitivement ce cas, ses images et ses commentaires ?', { danger: true, oui: 'Supprimer' })) { await essayer(() => api.supprimerCas(c.id), 'Cas supprimé.'); location.hash = '#/'; afficher(); } } });
      }
      if (c.auteur_id !== S.membre.id) options.push({ icone: 'drapeau', libelle: 'Signaler ce cas', danger: true, action: () => signaler('cas', c.id) });
      menu(options);
    },
    async 'menu-membre'(b) {
      const id = b.dataset.id;
      menu([
        { icone: 'profil', libelle: 'Voir le profil', action: () => { location.hash = `#/profil/${id}`; } },
        { icone: 'bloquer', libelle: 'Bloquer ce membre', danger: true, action: async () => { if (await UI.confirmer('Bloquer ce membre ? Vous ne verrez plus ses cas ni ses commentaires, et vous ne pourrez plus échanger de messages.', { danger: true, oui: 'Bloquer' })) { await essayer(() => api.bloquer(id), 'Membre bloqué.'); afficher(); } } },
        { icone: 'drapeau', libelle: 'Signaler ce membre', danger: true, action: () => signaler('membre', id) },
      ]);
    },
    signaler(b) { return signaler(b.dataset.type, b.dataset.id); },
    async 'supprimer-com'(b) { if (await UI.confirmer('Supprimer ce commentaire ?', { danger: true, oui: 'Supprimer' })) { await essayer(() => api.supprimerCommentaire(b.dataset.id), 'Commentaire supprimé.'); afficher(); } },
    async 'masquer-image'(b) {
      const im = vue.brouillon.images[Number(b.dataset.i)];
      const masques = await essayer(() => UI.editeurMasques(im.fichier, im.masques));
      if (!masques) return;
      const r = await essayer(() => IMG.preparer(im.fichier, { masques }));
      if (!r) return;
      URL.revokeObjectURL(im.url);
      Object.assign(im, { blob: r.blob, url: URL.createObjectURL(r.blob), masques });
      $('#rs-vignettes').innerHTML = vignettes();
    },
    'retirer-image'(b) { const [im] = vue.brouillon.images.splice(Number(b.dataset.i), 1); URL.revokeObjectURL(im.url); $('#rs-vignettes').innerHTML = vignettes(); },
    async 'nouveau-message'() { const id = await choisirDestinataire(); if (id) location.hash = `#/messages/nouveau/${id}`; },
    async 'image-msg'(b) { const u = await api.urlImageMessage(b.dataset.chemin); if (u) UI.visionneuse([u]); },
    async 'supprimer-msg'(b) { if (await UI.confirmer('Supprimer ce message pour les deux participants ?', { danger: true, oui: 'Supprimer' })) { await essayer(() => api.supprimerMessage(b.dataset.id)); rafraichirConversation(); } },
    'retirer-image-message'() { vue.imageMessage = null; const z = $('.rs-saisie-image'); z.hidden = true; z.innerHTML = ''; },
    async 'supprimer-compte'() {
      const ok = await UI.fenetre({ titre: 'Supprimer mon compte', contenu: '<p>Cette action est <strong>définitive</strong> : profil, cas, commentaires, messages et inscription aux Remplacements seront effacés.</p><div class="field"><label for="f-confirm">Tapez SUPPRIMER pour confirmer</label><input id="f-confirm" autocomplete="off"></div>',
        boutons: [{ valeur: false, libelle: 'Annuler' }, { valeur: d => d.querySelector('#f-confirm').value.trim().toUpperCase() === 'SUPPRIMER', libelle: 'Supprimer définitivement', classe: 'btn-ink rs-danger' }] });
      if (!ok) return;
      await essayer(() => api.supprimerCompte(), 'Compte supprimé.');
      S = null; location.hash = '#/'; afficher(); rendreCote();
    },
    'recherche-onglet'(b) { vue.rechercheOnglet = b.dataset.onglet; afficher(); },
    async verifier(b) { await essayer(() => api.admin.verifier(b.dataset.id, !!b.dataset.oui), b.dataset.oui ? 'Compte vérifié : le membre est prévenu.' : 'Demande refusée.'); afficher(); },
    async justificatif(b) { const u = await essayer(() => api.admin.urlJustificatif(b.dataset.chemin)); if (u) window.open(u, '_blank', 'noopener'); else if (api.demo) toast('Démonstration : pas de fichier réel.', 'ko'); },
    async traiter(b) { await essayer(() => api.admin.traiterSignalement(b.dataset.id, b.dataset.decision), 'Signalement traité.'); afficher(); },
    async suspendre(b) { if (await UI.confirmer(b.dataset.oui ? 'Suspendre ce membre ?' : 'Réactiver ce membre ?')) { await essayer(() => api.admin.suspendre(b.dataset.id, !!b.dataset.oui)); afficher(); } },
    async 'retirer-verif'(b) { if (await UI.confirmer('Retirer la vérification de ce membre ?')) { await essayer(() => api.admin.retirerVerification(b.dataset.id)); afficher(); } },
    retour(b, e) { if (history.length > 1) { e.preventDefault(); history.back(); } },
  };
  async function modifierCas(c) {
    const d = await UI.fenetre({
      titre: 'Modifier le cas', large: true,
      contenu: `<div class="field"><label for="m-titre">Titre</label><input id="m-titre" maxlength="120" value="${esc(c.titre)}"></div>
        <div class="field"><label for="m-histoire">Histoire clinique</label><textarea id="m-histoire" rows="5" maxlength="3000">${esc(c.histoire)}</textarea></div>
        <div class="field"><label for="m-question">Question</label><input id="m-question" maxlength="300" value="${esc(c.question)}"></div>
        <div class="field"><label for="m-reponse">Réponse et discussion</label><textarea id="m-reponse" rows="4" maxlength="3000">${esc(c.reponse)}</textarea></div>`,
      boutons: [{ valeur: null, libelle: 'Annuler' }, { valeur: x => ({ titre: x.querySelector('#m-titre').value.trim(), histoire: x.querySelector('#m-histoire').value.trim(), question: x.querySelector('#m-question').value.trim(), reponse: x.querySelector('#m-reponse').value.trim() }), libelle: 'Enregistrer', classe: 'btn-ink' }],
    });
    if (!d) return;
    const e = RG.validerCas({ ...c, ...d, attestation: true }).filter(x => !/image/.test(x));
    if (e.length) return toast(e[0], 'ko');
    const alertes = C.identite(Object.values(d).join('\n'));
    if (alertes.length && !(await UI.confirmer(`Identité possible : ${alertes.map(a => `« ${esc(a.texte)} »`).join(', ')}. Enregistrer quand même ?`))) return;
    await essayer(() => api.modifierCas(c.id, d), 'Cas modifié.');
    afficher();
  }

  /* ---------- Formulaires ---------- */
  const FORMULAIRES = {
    async connexion(f) {
      const email = f.elements.email.value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return toast('Adresse e-mail invalide.', 'ko');
      const r = await essayer(() => api.connexionEmail(email));
      if (!r) return;
      if (r.demo) { await rafraichir(); location.hash = S && S.membre ? '#/' : '#/bienvenue'; return; }
      app.innerHTML = `<div class="rs-carte rs-etroit rs-centre"><h1 class="rs-titre">Vérifiez votre boîte e-mail</h1><p>Un lien de connexion vient d'être envoyé à <strong>${esc(email)}</strong>. Il est valable une fois ; pensez aux indésirables.</p></div>`;
    },
    async bienvenue(f) {
      const d = lireProfil(f);
      if (f.elements.photo_google && f.elements.photo_google.checked) d.photo = S.compte.photoGoogle;
      const e = RG.validerProfil(d, { creation: true });
      $('.rs-form-erreurs', f).innerHTML = erreurs(e);
      if (e.length) return $('.rs-form-erreurs', f).scrollIntoView({ block: 'center' });
      const r = await essayer(() => api.creerProfil(d), 'Bienvenue dans la Communauté !');
      if (!r) return;
      await rafraichir(); demarrerEcoute(); rendreCote();
      location.hash = '#/';
    },
    async profil(f) {
      const d = lireProfil(f);
      const e = RG.validerProfil(d);
      $('.rs-form-erreurs', f).innerHTML = erreurs(e);
      if (e.length) return;
      if (await essayer(() => api.majProfil(d), 'Profil enregistré.')) { await rafraichir(); afficher(); }
    },
    async verification(f) {
      const fichier = f.elements.justificatif.files[0] || null;
      if (fichier && fichier.size > 5 * 1024 * 1024) return toast('Le justificatif dépasse 5 Mo.', 'ko');
      if (!fichier && !(await UI.confirmer('Envoyer la demande sans justificatif ? L\'administrateur pourra vous en demander un.'))) return;
      if (await essayer(() => api.demanderVerification(fichier), 'Demande envoyée : vous serez prévenu de la décision.')) { await rafraichir(); afficher(); }
    },
    async publier(f) {
      const alertes = majBrouillon(f), b = vue.brouillon;
      const e = RG.validerCas(b);
      $('.rs-form-erreurs', f).innerHTML = erreurs(e);
      if (e.length) return $('.rs-form-erreurs', f).scrollIntoView({ block: 'center' });
      if (alertes.length && !(await UI.confirmer(`Le texte contient peut-être des éléments d'identité (${alertes.map(a => `« ${esc(a.texte)} »`).join(', ')}). Publier quand même ?`, { oui: 'Publier quand même' }))) return;
      const bouton = $('button[type=submit]', f); bouton.disabled = true; bouton.textContent = 'Publication…';
      const id = await essayer(() => api.publierCas(b, b.images.map(i => ({ blob: i.blob, legende: i.legende }))), 'Cas publié.');
      bouton.disabled = false; bouton.textContent = 'Publier le cas';
      if (!id) return;
      b.images.forEach(i => URL.revokeObjectURL(i.url));
      vue.brouillon = null;
      location.hash = `#/cas/${id}`;
    },
    async commenter(f) {
      const t = f.elements.texte.value;
      const e = RG.validerCommentaire(t);
      if (e.length) return toast(e[0], 'ko');
      const alertes = C.identite(t);
      if (alertes.length && !(await UI.confirmer(`Identité possible : ${alertes.map(a => `« ${esc(a.texte)} »`).join(', ')}. Publier quand même ?`))) return;
      const x = await essayer(() => api.commenter(f.dataset.id, t));
      if (!x) return;
      f.elements.texte.value = '';
      const c = casCache.get(f.dataset.id);
      const ul = $('.rs-commentaires');
      if (ul.querySelector('.rs-muted')) ul.innerHTML = '';
      ul.insertAdjacentHTML('beforeend', commentaire(x, c));
      if (c) majCas(c.id, { nb_commentaires: (c.nb_commentaires || 0) + 1 });
    },
    async message(f) {
      const t = f.elements.texte.value, image = vue.imageMessage || null;
      if (RG.validerMessage(t, image).length) return;
      const alertes = C.identite(t);
      if (alertes.length && !(await UI.confirmer(`Ce message contient peut-être des éléments d'identité d'un patient (${alertes.map(a => `« ${esc(a.texte)} »`).join(', ')}). Envoyer quand même ?`, { oui: 'Envoyer quand même' }))) return;
      f.elements.texte.value = ''; f.elements.texte.style.height = '';
      ACTIONS['retirer-image-message']();
      const m = await essayer(() => api.envoyerMessage(f.dataset.conv, t, image && image.blob));
      if (!m) { f.elements.texte.value = t; return; }
      rafraichirConversation();
    },
    'recherche-fil'(f) { vue.q = f.elements.q.value.trim(); afficher(); },
    async recherche(f) { vue.q = f.elements.q.value.trim(); $('#rs-resultats').innerHTML = await resultats(); chargerImages(); },
    async 'admin-membres'(f) { $('#rs-admin-membres').innerHTML = await adminMembres(f.elements.q.value.trim()); },
  };

  /* ---------- Délégation des événements ---------- */
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-act]');
    if (b && ACTIONS[b.dataset.act] && (app.contains(b) || nav.contains(b) || barre.contains(b))) { if (b.tagName !== 'A' || b.dataset.act !== 'retour') e.preventDefault(); ACTIONS[b.dataset.act](b, e); }
  });
  app.addEventListener('submit', e => { const f = e.target.closest('[data-form]'); if (f && FORMULAIRES[f.dataset.form]) { e.preventDefault(); FORMULAIRES[f.dataset.form](f); } });
  app.addEventListener('input', e => {
    const f = e.target.closest('[data-form="publier"]');
    if (f) majBrouillon(f);
    if (e.target.matches('.rs-saisie textarea, .rs-commenter textarea')) { e.target.style.height = 'auto'; e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`; }
    if (e.target.matches('[data-form="recherche"] input')) { clearTimeout(vue.minuterie); vue.minuterie = setTimeout(() => FORMULAIRES.recherche(e.target.form), 300); }
  });
  app.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey && e.target.matches('.rs-saisie textarea') && matchMedia('(pointer: fine)').matches) { e.preventDefault(); e.target.form.requestSubmit(); }
  });
  app.addEventListener('change', async e => {
    const t = e.target;
    if (t.matches('[name="statut"]')) { const z = $('.rs-si-resident', t.form); if (z) z.hidden = t.value !== 'resident'; }
    if (t.matches('[data-act-change="images"]')) { await ajouterImages([...t.files]); t.value = ''; majBrouillon(t.form); }
    if (t.matches('[data-act-change="photo"]') && t.files[0]) {
      const r = await essayer(() => IMG.preparer(t.files[0], { max: 512, carre: true, qualite: 0.9 }));
      if (r && await essayer(() => api.envoyerPhoto(r.blob), 'Photo mise à jour.')) { await rafraichir(); afficher(); rendreCote(); }
    }
    if (t.matches('[data-act-change="image-message"]') && t.files[0]) {
      const r = await essayer(() => IMG.preparer(t.files[0]));
      t.value = '';
      if (!r) return;
      vue.imageMessage = r;
      const z = $('.rs-saisie-image');
      z.hidden = false;
      z.innerHTML = `<img src="${URL.createObjectURL(r.blob)}" alt="Image à envoyer"><button type="button" class="rs-icone-btn" data-act="retirer-image-message" aria-label="Retirer l'image">${icone('fermer')}</button>${r.retirees.length ? `<small>Métadonnées retirées</small>` : ''}`;
    }
  });
  window.addEventListener('hashchange', () => { if (!/^#\/cas\/[\w-]+#/.test(location.hash)) window.scrollTo({ top: 0 }); afficher(); });

  /* ---------- Temps réel ---------- */
  function demarrerEcoute() {
    if (arreterEcoute) arreterEcoute();
    if (!S || !S.membre) return;
    arreterEcoute = api.ecouter({
      message(m) {
        if (vue.conv && m.conversation_id === vue.conv.conversation_id) rafraichirConversation();
        else { majBadges(); if (m.auteur_id !== S.membre.id && !/^#\/messages/.test(location.hash)) toast('Nouveau message reçu.'); if (location.hash === '#/messages') afficher(); else if (vue.conv) rafraichirConversation(); }
      },
      lu(p) { if (vue.conv && p.conversation_id === vue.conv.conversation_id && p.membre_id !== S.membre.id) rafraichirConversation(); },
      notification() { majBadges(); },
      rafraichir() { majBadges(); },
    });
  }

  /* ---------- Démarrage ---------- */
  async function rafraichir() { S = await api.session(); rendreNav(); }
  app.innerHTML = '<p class="rs-chargement">Chargement…</p>';
  try { await api.pret; await rafraichir(); }
  catch (e) { app.innerHTML = vide(`Service indisponible : ${esc(e.message)}`); return; }
  if (S && /access_token|type=magiclink|error_description/.test(location.hash)) location.replace(S.membre ? '#/' : '#/bienvenue');
  window.RHRs.rafraichir = async () => { await rafraichir(); demarrerEcoute(); vue.brouillon = null; afficher(); rendreCote(); majBadges(); };
  demarrerEcoute();
  afficher();
  rendreCote();
  majBadges();
  setInterval(() => { if (document.visibilityState === 'visible') majBadges(); }, 60000);
})();
