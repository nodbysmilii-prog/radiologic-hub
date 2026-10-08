/* =========================================================
   RadiologicHub — Remplacements : interface (remplacements.html)
   ---------------------------------------------------------
   Navigation par ancre : #/ (accueil), #/connexion, #/inscription/…,
   #/espace/<onglet>, #/demande/<id>, #/mission/<id>, #/admin.
   Pensée d'abord pour le téléphone. Données : window.RHRp.api
   (Supabase ou démonstration, même interface).
   ========================================================= */
(async function () {
  'use strict';
  const RH = window.RHRemplacements, REF = RH.referentiel, REG = RH.regles, RECAP = RH.recap;
  const CAL = window.RHRp.calendrier, api = window.RHRp.api;
  const app = document.getElementById('rp-app');
  if (!app || !api) return;

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const cap = s => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');
  const maintenant = () => (api.demo ? api.demo.maintenant() : new Date());        // horloge de démonstration ou réelle
  const auj = () => REF.dateLocale(maintenant());
  const mem = { lire: (k, d) => { try { return JSON.parse(localStorage.getItem(`rh-rp-${k}`)) ?? d; } catch (e) { return d; } }, ecrire: (k, v) => { try { localStorage.setItem(`rh-rp-${k}`, JSON.stringify(v)); } catch (e) { /* rien */ } } };

  let S = null;                                               // session : { profil, remplacant, structures, admin }
  const vue = { role: mem.lire('role', null), mois: null, pinceau: 'journee', brouillon: null, moisDemande: null };

  /* ---------- Petits composants ---------- */
  const CLASSES_ETAT = {
    publiee: 'is-encours', pourvue: 'is-ok', realisee: 'is-ok', non_realisee: 'is-ko', annulee: 'is-ko', expiree: 'is-gris',
    envoyee: 'is-attente', interesse: 'is-encours', decline: 'is-gris', retenu: 'is-ok', pourvu_autre: 'is-gris', liberee: 'is-ko',
    en_attente: 'is-attente', valide: 'is-ok', refuse: 'is-ko', suspendu: 'is-ko',
  };
  const badge = (etat, libelle) => `<span class="rp-badge ${CLASSES_ETAT[etat] || ''}">${esc(libelle)}</span>`;
  const etatDemande = d => badge(d.etat, REF.ETATS_DEMANDE[d.etat] || d.etat);
  const etatProposition = p => badge(p.etat, REF.ETATS_PROPOSITION[p.etat] || p.etat);
  const champ = (label, html, o = {}) => `<div class="field${o.classe ? ' ' + o.classe : ''}"><label${o.pour ? ` for="${o.pour}"` : ''}>${label}</label>${html}${o.aide ? `<small class="rp-aide">${o.aide}</small>` : ''}</div>`;
  const entree = (nom, val, o = {}) => `<input id="f-${nom}" name="${nom}" type="${o.type || 'text'}" value="${esc(val ?? '')}"${o.ph ? ` placeholder="${esc(o.ph)}"` : ''}${o.attrs || ''}>`;
  const choixMultiples = (nom, table, choisis = [], o = {}) => `<div class="rp-puces${o.classe ? ' ' + o.classe : ''}" role="group">${Object.entries(table).map(([k, v]) =>
    `<label class="rp-puce"><input type="checkbox" name="${nom}" value="${esc(k)}"${choisis.includes(k) ? ' checked' : ''}><span>${esc(v)}</span></label>`).join('')}</div>`;
  const liste = (nom, paires, val, o = {}) => `<select id="f-${nom}" name="${nom}"${o.attrs || ''}>${paires.map(([k, v]) => `<option value="${esc(k)}"${String(k) === String(val ?? '') ? ' selected' : ''}>${esc(v)}</option>`).join('')}</select>`;
  const gouvernorats = Object.fromEntries(REF.GOUVERNORATS.map(g => [g, g]));
  const erreurs = l => (l.length ? `<ul class="rp-erreurs" role="alert">${l.map(e => `<li>${esc(e)}</li>`).join('')}</ul>` : '');
  const vide = (texte, action = '') => `<div class="rp-vide"><p>${texte}</p>${action}</div>`;
  const lireFormulaire = f => {
    const d = {};
    new FormData(f).forEach((v, k) => {
      const el = f.elements[k];
      const multiple = el && (el.length > 1 || (el.type === 'checkbox' && f.querySelectorAll(`[name="${k}"]`).length > 1) || (el[0] && el[0].type === 'checkbox'));
      if (el && el.type === 'checkbox' && f.querySelectorAll(`[name="${k}"]`).length === 1) d[k] = true;
      else if (multiple && (el.type === 'checkbox' || (el[0] && el[0].type === 'checkbox'))) (d[k] = d[k] || []).push(v);
      else d[k] = v;
    });
    $$('input[type=checkbox]', f).forEach(c => { if (!(c.name in d)) d[c.name] = f.querySelectorAll(`[name="${c.name}"]`).length > 1 ? [] : false; });
    return d;
  };

  /* Messages flottants */
  function toast(message, type = 'ok') {
    let zone = $('#rp-toasts');
    if (!zone) { zone = document.createElement('div'); zone.id = 'rp-toasts'; zone.setAttribute('aria-live', 'polite'); document.body.appendChild(zone); }
    const t = document.createElement('div');
    t.className = `rp-toast is-${type}`;
    t.textContent = message;
    zone.appendChild(t);
    setTimeout(() => t.classList.add('is-sortie'), 3800);
    setTimeout(() => t.remove(), 4300);
  }
  async function essayer(f, succes) {
    try { const r = await f(); if (succes) toast(typeof succes === 'function' ? succes(r) : succes); return r; }
    catch (e) { toast(e.message || 'Une erreur est survenue.', 'ko'); return null; }
  }

  /* Messagerie de la Communauté (même compte) : disponible en production seulement */
  const GOOGLE = '<svg class="rp-google" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.9 6.1C12.5 13.6 17.8 9.5 24 9.5z"/><path fill="#4285F4" d="M46.1 24.6c0-1.6-.1-3.1-.4-4.6H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.4 5.7c4.3-4 6.9-9.9 6.9-17z"/><path fill="#FBBC05" d="M10.6 28.6A14.6 14.6 0 0 1 9.5 24c0-1.6.3-3.2.8-4.6l-7.9-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.7 10.7z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.7c-2.1 1.4-4.8 2.3-8.5 2.3-6.2 0-11.5-4.1-13.4-9.9l-7.9 6.1C6.6 42.6 14.6 48 24 48z"/></svg>';
  const lienMessage = (profilId, libelle = 'Message') => (api.mode === 'supabase' && profilId ? `<a class="rp-lien-btn" href="communaute.html#/messages/nouveau/${esc(profilId)}">${libelle}</a>` : '');

  /* ---------- Téléchargements : contrat PDF et agenda ---------- */
  const telecharger = (contenu, nom, type) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([contenu], { type }));
    a.download = nom;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };
  async function contratPdf(d, s, r) {
    const donnees = RH.contrat.donneesContrat({ demande: d, structure: s, remplacant: r, profil: r.profil, maintenant: maintenant() });
    telecharger(RH.contrat.pdfContrat(await api.modeleContrat(), donnees), `contrat-${donnees.mission.reference}.pdf`, 'application/pdf');
  }
  function agendaIcs(d, s, r) {
    const rc = RECAP.demande(d, s);
    telecharger(RH.ics.calendrier({ uid: d.id, titre: `Remplacement en radiologie — ${s.nom}`, lieu: rc.adresse, dates: d.dates, heure_debut: d.heure_debut, heure_fin: d.heure_fin, description: `${rc.type} — ${rc.modalites}\nRemplaçant : Dr ${r.profil.prenom} ${r.profil.nom}\nHonoraires : ${rc.honoraires} ${rc.unite}` }), `remplacement-${rc.reference}.ics`, 'text/calendar');
  }

  /* Récapitulatif d'une demande (carte) */
  function recapitulatif(d, s, o = {}) {
    const rc = RECAP.demande(d, s);
    return `<dl class="rp-recap">
      ${o.structure !== false ? `<div><dt>Structure</dt><dd><strong>${esc(rc.structure)}</strong><br><span class="rp-muted">${esc(rc.adresse)} (${esc(rc.gouvernorat)})</span></dd></div>` : ''}
      <div><dt>Date(s)</dt><dd><strong>${rc.dates.map(esc).join('<br>')}</strong></dd></div>
      <div><dt>Horaires</dt><dd>${esc(rc.horaires)}</dd></div>
      <div><dt>Type</dt><dd>${esc(rc.type)}</dd></div>
      <div><dt>Modalités</dt><dd>${esc(rc.modalites)}</dd></div>
      <div><dt>Profil</dt><dd>${esc(rc.profil)}</dd></div>
      <div><dt>Honoraires</dt><dd><strong>${esc(rc.honoraires)} ${esc(rc.unite)}</strong> <span class="rp-muted">— soit ${esc(rc.total)} (${esc(rc.nombre)})</span></dd></div>
      <div><dt>Conditions</dt><dd>${esc(rc.conditions_courtes)}</dd></div>
      ${rc.commentaire ? `<div><dt>Commentaire</dt><dd>${esc(rc.commentaire)}</dd></div>` : ''}
      <div><dt>Référence</dt><dd class="rp-muted">${esc(rc.reference)}</dd></div>
    </dl>`;
  }
  const ligneDemande = (d, s, droite = '') => `<span class="rp-ligne-titre">${esc(REF.listeFr([...d.dates].sort().map(REF.dateFr)))}</span>
    <span class="rp-ligne-sous">${esc(REF.TYPES[d.type])} · ${esc(d.heure_debut)}–${esc(d.heure_fin)} · ${esc(REF.listeFr(REF.libelles(d.modalites, REF.COMPETENCES)))}${s ? ` · ${esc(s.nom)}, ${esc(s.ville)}` : ''}</span>${droite}`;

  /* ---------- En-tête du module (connexion, rôle) ---------- */
  function barre() {
    const z = $('#rp-barre');
    if (!z) return;
    if (!S) { z.innerHTML = `<a href="#/connexion" class="btn btn-ink btn-sm">Se connecter</a>`; return; }
    const nom = [S.profil.prenom, S.profil.nom].filter(Boolean).join(' ') || S.profil.email;
    z.innerHTML = `<span class="rp-moi">${esc(nom)}</span><a href="#/espace" class="btn btn-outline btn-sm">Mon espace</a>${S.admin ? '<a href="#/admin" class="btn btn-outline btn-sm">Administration</a>' : ''}<button type="button" class="btn btn-sm rp-lien-btn" data-act="deconnexion">Déconnexion</button>`;
  }
  async function rafraichir() { S = await api.session(); barre(); }

  /* =======================================================
     Accueil, connexion, inscriptions
     ======================================================= */
  function accueil() {
    return `<div class="rp-accueil">
      <div class="rp-cartes-choix">
        <article class="rp-choix" style="--c: var(--cornflower)">
          <h2>Je suis remplaçant</h2>
          <p>Radiologue spécialiste ou résident (R3 à R5) : cochez vos disponibilités, recevez par e-mail les propositions qui vous correspondent et répondez en un clic.</p>
          <a class="btn btn-ink" href="${S && S.remplacant ? '#/espace/propositions' : '#/inscription/remplacant'}">${S && S.remplacant ? 'Mes propositions' : "M'inscrire comme remplaçant"}</a>
        </article>
        <article class="rp-choix" style="--c: var(--plum)">
          <h2>Je suis une clinique ou un cabinet</h2>
          <p>Publiez une demande en une minute : l'agent contacte aussitôt les remplaçants compatibles et vous les présente ; vous choisissez en un clic.</p>
          <a class="btn btn-ink" href="${S && S.structures.length ? '#/espace/demandes' : '#/inscription/structure'}">${S && S.structures.length ? 'Mes demandes' : 'Inscrire ma structure'}</a>
        </article>
      </div>
      <ol class="rp-etapes">
        <li style="--c: var(--steel)"><b>1</b><span><strong>Inscription</strong> validée par l'administrateur (justificatif de statut facultatif).</span></li>
        <li style="--c: var(--teal)"><b>2</b><span><strong>Disponibilités</strong> cochées sur un calendrier ; <strong>demande</strong> publiée par la structure.</span></li>
        <li style="--c: var(--amber)"><b>3</b><span>L'agent envoie la <strong>proposition</strong> aux remplaçants compatibles : « Je suis disponible » / « Pas disponible ».</span></li>
        <li style="--c: var(--green)"><b>4</b><span><strong>Confirmation</strong> aux deux parties : coordonnées, agenda (.ics), contrat PDF ; rappel la veille.</span></li>
      </ol>
      ${S ? '' : `<p class="rp-deja">Déjà inscrit ? <a href="#/connexion">Recevoir mon lien de connexion</a></p>`}
      <p class="rp-muted rp-centre rp-donnees">Données personnelles minimales, <strong>aucune donnée patient</strong> dans ce module. <a href="mentions-legales.html#donnees">Protection des données</a></p>
    </div>`;
  }

  function connexion() {
    if (S) { location.hash = '#/espace'; return ''; }
    const demo = api.demo ? `<div class="rp-note">Mode démonstration : choisissez un utilisateur fictif dans la barre « Démonstration » ci-dessus, ou saisissez une adresse : la connexion est simulée.</div>` : '';
    return `<form class="rp-carte rp-etroit" data-form="connexion" novalidate>
      <h2>Connexion</h2>
      <p>Pas de mot de passe : saisissez votre adresse e-mail, vous recevez un <strong>lien de connexion</strong> valable une fois.</p>
      ${demo}
      ${api.connexionGoogle ? `<button type="button" class="btn btn-outline btn-block rp-btn-google" data-act="google">${GOOGLE} Continuer avec Google</button><p class="rp-ou"><span>ou</span></p>` : ''}
      ${champ('E-mail', entree('email', '', { type: 'email', ph: 'prenom.nom@exemple.tn', attrs: ' autocomplete="email" required' }), { pour: 'f-email' })}
      <button class="btn btn-ink btn-block" type="submit">Recevoir mon lien de connexion</button>
      <p class="rp-muted rp-centre">Même compte que pour la <a href="communaute.html">Communauté</a>.</p>
      <p class="rp-muted rp-centre">Pas encore inscrit ? <a href="#/inscription/remplacant">Remplaçant</a> · <a href="#/inscription/structure">Structure</a></p>
    </form>`;
  }

  const consentement = () => `<label class="rp-consentement"><input type="checkbox" name="consentement"> J'accepte que mes données soient traitées pour la mise en relation, conformément à la <a href="mentions-legales.html#donnees" target="_blank" rel="noopener">politique de protection des données</a> (loi organique n° 2004-63). Je peux y accéder, les rectifier ou les supprimer à tout moment.</label>`;

  function inscriptionRemplacant() {
    if (S && S.remplacant) { location.hash = '#/espace/propositions'; return ''; }
    const p = S ? S.profil : {};
    return `<form class="rp-carte rp-formulaire" data-form="inscription-remplacant" novalidate>
      <h2>Inscription remplaçant</h2>
      <p class="rp-muted">Votre compte sera actif dans le module après validation par l'administrateur.</p>
      <fieldset><legend>Identité</legend>
        <div class="field-row">${champ('Nom', entree('nom', p.nom, { attrs: ' autocomplete="family-name"' }), { pour: 'f-nom' })}${champ('Prénom', entree('prenom', p.prenom, { attrs: ' autocomplete="given-name"' }), { pour: 'f-prenom' })}</div>
        <div class="field-row">${champ('Téléphone', entree('telephone', p.telephone, { type: 'tel', ph: '98 123 456', attrs: ' autocomplete="tel"' }), { pour: 'f-telephone' })}${champ('E-mail', entree('email', p.email, { type: 'email', attrs: ` autocomplete="email"${S ? ' readonly' : ''}` }), { pour: 'f-email', aide: S ? 'Adresse de votre compte.' : 'Vous recevrez un lien pour confirmer cette adresse.' })}</div>
      </fieldset>
      <fieldset><legend>Statut</legend>
        <div class="rp-radios">
          <label class="rp-puce"><input type="radio" name="statut" value="specialiste" checked><span>Radiologue spécialiste</span></label>
          <label class="rp-puce"><input type="radio" name="statut" value="resident"><span>Résident en radiologie</span></label>
        </div>
        <div class="rp-si-resident" hidden>${champ('Année de résidanat', liste('annee_residanat', [['', '—'], ...REF.ANNEES.map(a => [a, `R${a}`])], ''), { pour: 'f-annee_residanat' })}</div>
        ${champ("Service ou structure d'affectation", entree('affectation', '', { ph: 'ex. Service de radiologie, CHU …' }), { pour: 'f-affectation' })}
      </fieldset>
      <fieldset><legend>Compétences</legend>${choixMultiples('competences', REF.COMPETENCES)}</fieldset>
      <fieldset><legend>Gouvernorats acceptés</legend>
        <p class="rp-raccourcis"><button type="button" class="rp-lien-btn" data-act="grand-tunis">Grand Tunis</button> <button type="button" class="rp-lien-btn" data-act="tous-gouv">Tous</button> <button type="button" class="rp-lien-btn" data-act="aucun-gouv">Aucun</button></p>
        ${choixMultiples('gouvernorats', gouvernorats, [], { classe: 'rp-puces-petites' })}
      </fieldset>
      <fieldset><legend>Honoraires et justificatif</legend>
        <div class="field-row">${champ('Honoraires journaliers souhaités (TND)', entree('honoraires_souhaites', '', { type: 'number', attrs: ' min="0" step="10" inputmode="numeric"' }), { pour: 'f-honoraires_souhaites', aide: 'Indicatif : affiché aux structures, pas utilisé comme filtre.' })}
        ${champ('Justificatif de statut (facultatif)', '<input id="f-justificatif" name="justificatif" type="file" accept=".pdf,.jpg,.jpeg,.png">', { pour: 'f-justificatif', aide: 'Attestation, carte professionnelle… (PDF ou image, 5 Mo au plus). Visible par l\'administrateur seulement.' })}</div>
      </fieldset>
      ${consentement()}
      <div class="rp-form-erreurs"></div>
      <button class="btn btn-ink btn-block" type="submit">Envoyer mon inscription</button>
    </form>`;
  }

  function inscriptionStructure() {
    const p = S ? S.profil : {};
    return `<form class="rp-carte rp-formulaire" data-form="inscription-structure" novalidate>
      <h2>Inscription d'une clinique ou d'un cabinet</h2>
      <p class="rp-muted">Activée après validation par l'administrateur. Vous pourrez ensuite inviter vos collègues (plusieurs comptes par structure).</p>
      <fieldset><legend>Structure</legend>
        ${champ('Nom', entree('nom', ''), { pour: 'f-nom' })}
        <div class="rp-radios">
          <label class="rp-puce"><input type="radio" name="type" value="clinique" checked><span>Clinique</span></label>
          <label class="rp-puce"><input type="radio" name="type" value="cabinet"><span>Cabinet</span></label>
        </div>
        ${champ('Adresse', entree('adresse', ''), { pour: 'f-adresse' })}
        <div class="field-row">${champ('Ville', entree('ville', ''), { pour: 'f-ville' })}${champ('Gouvernorat', liste('gouvernorat', [['', '—'], ...REF.GOUVERNORATS.map(g => [g, g])], ''), { pour: 'f-gouvernorat' })}</div>
        ${champ('Équipements', choixMultiples('equipements', REF.EQUIPEMENTS))}
      </fieldset>
      <fieldset><legend>Contact de la structure</legend>
        ${champ('Nom du contact', entree('contact_nom', ''), { pour: 'f-contact_nom' })}
        <div class="field-row">${champ('Téléphone', entree('telephone', '', { type: 'tel' }), { pour: 'f-telephone' })}${champ('E-mail de la structure', entree('email', '', { type: 'email' }), { pour: 'f-email', aide: 'Reçoit les remplaçants disponibles et les confirmations.' })}</div>
      </fieldset>
      <fieldset><legend>Votre compte</legend>
        <div class="field-row">${champ('Prénom', entree('compte_prenom', p.prenom), { pour: 'f-compte_prenom' })}${champ('Nom', entree('compte_nom', p.nom), { pour: 'f-compte_nom' })}</div>
        <div class="field-row">${champ('Téléphone', entree('compte_telephone', p.telephone, { type: 'tel' }), { pour: 'f-compte_telephone' })}${champ('E-mail de connexion', entree('compte_email', p.email, { type: 'email', attrs: S ? ' readonly' : '' }), { pour: 'f-compte_email' })}</div>
      </fieldset>
      ${consentement()}
      <div class="rp-form-erreurs"></div>
      <button class="btn btn-ink btn-block" type="submit">Envoyer l'inscription</button>
    </form>`;
  }

  /* =======================================================
     Espace personnel
     ======================================================= */
  const roles = () => {
    if (!S) return [];
    const r = [];
    if (S.remplacant) r.push({ cle: 'remplacant', libelle: 'Remplaçant' });
    S.structures.forEach(s => r.push({ cle: `structure:${s.id}`, libelle: s.nom }));
    return r;
  };
  const ONGLETS = {
    remplacant: [['propositions', 'Propositions'], ['missions', 'Missions'], ['disponibilites', 'Disponibilités'], ['honoraires', 'Honoraires'], ['profil', 'Profil']],
    structure: [['demandes', 'En cours'], ['nouvelle', '+ Demande'], ['pourvues', 'Pourvues'], ['historique', 'Historique'], ['favoris', 'Favoris'], ['equipe', 'Équipe & réglages']],
  };

  async function espace(onglet) {
    if (!S) { location.hash = '#/connexion'; return ''; }
    const rs = roles();
    if (!rs.length) {
      return `<div class="rp-carte rp-etroit"><h2>Bienvenue</h2><p>Votre compte est créé. Que souhaitez-vous faire ?</p>
        <p class="rp-actions"><a class="btn btn-ink" href="#/inscription/remplacant">M'inscrire comme remplaçant</a><a class="btn btn-outline" href="#/inscription/structure">Inscrire une structure</a></p>
        ${S.admin ? '<p><a href="#/admin">Accéder à l\'administration</a></p>' : ''}</div>`;
    }
    const rolePourOnglet = Object.entries(ONGLETS).find(([, l]) => l.some(([k]) => k === onglet));
    if (rolePourOnglet && !(vue.role || '').startsWith(rolePourOnglet[0])) vue.role = rs.find(r => r.cle.startsWith(rolePourOnglet[0]))?.cle || vue.role;
    if (!rs.some(r => r.cle === vue.role)) vue.role = rs[0].cle;
    mem.ecrire('role', vue.role);
    const [type, sid] = vue.role.split(':');
    const onglets = ONGLETS[type];
    if (!onglets.some(([k]) => k === onglet)) onglet = onglets[0][0];
    let h = '';
    if (rs.length > 1) h += `<div class="rp-roles" role="tablist" aria-label="Rôle">${rs.map(r => `<button type="button" class="rp-role${r.cle === vue.role ? ' is-actif' : ''}" data-act="role" data-role="${esc(r.cle)}">${esc(r.libelle)}</button>`).join('')}</div>`;
    h += `<nav class="rp-onglets" aria-label="Sections">${onglets.map(([k, l]) => `<a href="#/espace/${k}" class="rp-onglet${k === onglet ? ' is-actif' : ''}"${k === onglet ? ' aria-current="page"' : ''}>${esc(l)}</a>`).join('')}</nav>`;
    h += type === 'remplacant' ? await espaceRemplacant(onglet) : await espaceStructure(S.structures.find(s => s.id === sid), onglet);
    return h;
  }

  /* ---------- Remplaçant ---------- */
  function bandeauEtat(etat, motif, qui) {
    if (etat === 'valide') return '';
    const t = { en_attente: `Votre inscription ${qui} est <strong>en attente de validation</strong> par l'administrateur. Vous recevrez un e-mail dès qu'elle sera active.`, refuse: `Votre inscription ${qui} n'a pas été validée${motif ? ` (motif : ${esc(motif)})` : ''}.`, suspendu: `Votre compte ${qui} est suspendu.` }[etat];
    return `<div class="rp-bandeau is-${etat}">${t}</div>`;
  }

  async function espaceRemplacant(onglet) {
    const r = S.remplacant;
    let h = bandeauEtat(r.etat, r.motif_refus, 'de remplaçant');
    if (S.profil.desinscrit) h += '<div class="rp-bandeau is-en_attente">Vous ne recevez plus de propositions par e-mail. <button type="button" class="rp-lien-btn" data-act="reabonner">Les recevoir de nouveau</button></div>';
    const props = await api.mesPropositions();
    if (onglet === 'propositions') {
      const att = props.filter(x => x.proposition.etat === 'envoyee' && x.demande.etat === 'publiee');
      const dispo = props.filter(x => x.proposition.etat === 'interesse' && x.demande.etat === 'publiee');
      const autres = props.filter(x => !att.includes(x) && !dispo.includes(x) && x.proposition.etat !== 'retenu');
      const carte = (x, actions) => `<article class="rp-item">
        <a class="rp-item-lien" href="#/mission/${x.demande.id}">${ligneDemande(x.demande, x.structure, `<span class="rp-ligne-prix">${esc(REF.montant(x.demande.honoraires))} ${esc(REF.UNITES[x.demande.unite])}</span>`)}</a>
        <div class="rp-item-pied">${etatProposition(x.proposition)}${actions || ''}</div></article>`;
      h += `<h3 class="rp-h">À répondre (${att.length})</h3>`;
      h += att.length ? att.map(x => carte(x, `<span class="rp-boutons"><button type="button" class="btn btn-sm rp-oui" data-act="repondre" data-id="${x.proposition.id}" data-reponse="disponible">Je suis disponible</button><button type="button" class="btn btn-outline btn-sm" data-act="repondre" data-id="${x.proposition.id}" data-reponse="indisponible">Pas disponible</button></span>`)).join('')
        : vide('Aucune proposition en attente. Les propositions arrivent aussi par e-mail.', '<a href="#/espace/disponibilites" class="btn btn-outline btn-sm">Mettre à jour mes disponibilités</a>');
      if (dispo.length) h += `<h3 class="rp-h">En attente du choix de la structure (${dispo.length})</h3>${dispo.map(x => carte(x)).join('')}`;
      if (autres.length) h += `<details class="rp-plus"><summary>Propositions closes (${autres.length})</summary>${autres.map(x => carte(x)).join('')}</details>`;
      return h;
    }
    if (onglet === 'missions') {
      const missions = props.filter(x => x.proposition.etat === 'retenu').sort((a, b) => a.demande.dates[0].localeCompare(b.demande.dates[0]));
      const avenir = missions.filter(x => x.demande.dates.some(d => d >= auj()) && x.demande.etat === 'pourvue');
      const passees = missions.filter(x => !avenir.includes(x));
      const carte = x => `<article class="rp-item"><a class="rp-item-lien" href="#/mission/${x.demande.id}">${ligneDemande(x.demande, x.structure, `<span class="rp-ligne-prix">${esc(REF.montant(REG.totalHonoraires(x.demande)))}</span>`)}</a><div class="rp-item-pied">${etatDemande(x.demande)}</div></article>`;
      h += `<h3 class="rp-h">À venir (${avenir.length})</h3>${avenir.length ? avenir.map(carte).join('') : vide('Aucune mission confirmée à venir.')}`;
      if (passees.length) h += `<h3 class="rp-h">Passées</h3>${passees.reverse().map(carte).join('')}`;
      return h;
    }
    if (onglet === 'disponibilites') return h + await vueDisponibilites(props);
    if (onglet === 'honoraires') return h + vueHonoraires(props);
    return h + vueProfil();
  }

  /* Calendrier des disponibilités (« pinceau » : un créneau, puis toucher les jours) */
  const PINCEAUX = [['journee', 'Journée'], ['matin', 'Matin'], ['apres_midi', 'Après-midi'], ['garde', 'Garde'], ['effacer', 'Effacer']];
  const ABREV = { journee: 'J', matin: 'M', apres_midi: 'AM', garde: 'G' };
  let dispos = {}, missionsDates = {};
  async function vueDisponibilites(props) {
    dispos = {};
    (await api.disponibilites()).forEach(x => { (dispos[x.date] = dispos[x.date] || []).push(x.creneau); });
    missionsDates = {};
    (props || []).filter(x => x.proposition.etat === 'retenu' && x.demande.etat === 'pourvue').forEach(x => x.demande.dates.forEach(d => { missionsDates[d] = x.structure ? x.structure.nom : 'Mission'; }));
    vue.mois = vue.mois || auj().slice(0, 7);
    return `<div class="rp-carte">
      <p class="rp-muted">Choisissez un créneau, puis touchez les jours. Chaque modification est enregistrée aussitôt ; l'agent vous propose les remplacements correspondants.</p>
      <div class="rp-pinceaux" role="radiogroup" aria-label="Créneau">${PINCEAUX.map(([k, l]) => `<button type="button" class="rp-pinceau is-${k}${vue.pinceau === k ? ' is-actif' : ''}" data-act="pinceau" data-pinceau="${k}" role="radio" aria-checked="${vue.pinceau === k}">${l}</button>`).join('')}</div>
      <div id="rp-cal-dispo">${calendrierDispos()}</div>
      <p class="rp-raccourcis"><button type="button" class="rp-lien-btn" data-act="remplir-mois">Appliquer le créneau aux jours ouvrés du mois</button> · <button type="button" class="rp-lien-btn" data-act="vider-mois">Vider le mois</button></p>
      <p class="rp-legende"><span class="rp-pastille is-journee">J</span> journée <span class="rp-pastille is-matin">M</span> matin <span class="rp-pastille is-apres_midi">AM</span> après-midi <span class="rp-pastille is-garde">G</span> garde <span class="rp-pastille is-mission">★</span> mission confirmée</p>
    </div>`;
  }
  function calendrierDispos() {
    const jours = {};
    Object.entries(dispos).forEach(([d, cr]) => { if (cr.length) jours[d] = { classes: ['is-dispo'], contenu: `<span class="rp-pastilles">${cr.map(c => `<span class="rp-pastille is-${c}">${ABREV[c]}</span>`).join('')}</span>`, titre: REF.listeFr(REF.libelles(cr, REF.CRENEAUX)) }; });
    Object.entries(missionsDates).forEach(([d, nom]) => { jours[d] = { classes: [...((jours[d] || {}).classes || []), 'is-mission'], contenu: `${(jours[d] || {}).contenu || ''}<span class="rp-pastille is-mission" title="${esc(nom)}">★</span>`, titre: `mission : ${nom}` }; });
    return CAL.grille({ mois: vue.mois, min: auj(), jours });
  }
  function appliquerPinceau(date) {
    const cr = new Set(dispos[date] || []), p = vue.pinceau;
    if (p === 'effacer') cr.clear();
    else if (p === 'journee') { if (cr.has('journee')) cr.delete('journee'); else { cr.add('journee'); cr.delete('matin'); cr.delete('apres_midi'); } }
    else if (p === 'garde') { if (cr.has('garde')) cr.delete('garde'); else cr.add('garde'); }
    else if (cr.has(p)) cr.delete(p);
    else { cr.add(p); cr.delete('journee'); }
    return [...cr];
  }
  async function definirDispo(date, creneaux) {
    dispos[date] = creneaux;
    $('#rp-cal-dispo').innerHTML = calendrierDispos();
    await essayer(() => api.definirDisponibilites(date, creneaux));
  }

  function vueHonoraires(props) {
    const missions = props.filter(x => x.proposition.etat === 'retenu' && ['pourvue', 'realisee'].includes(x.demande.etat));
    const parMois = {};
    missions.forEach(x => x.demande.dates.forEach(d => {
      const m = d.slice(0, 7), o = parMois[m] = parMois[m] || { total: 0, jours: 0, missions: new Set(), avenir: 0 };
      o.total += Number(x.demande.honoraires) || 0; o.jours++; o.missions.add(x.demande.id);
      if (d >= auj()) o.avenir += Number(x.demande.honoraires) || 0;
    }));
    const moisCourant = auj().slice(0, 7), annee = auj().slice(0, 4);
    const somme = f => Object.entries(parMois).filter(([m]) => f(m)).reduce((t, [, o]) => t + o.total, 0);
    const avenir = Object.values(parMois).reduce((t, o) => t + o.avenir, 0);
    let h = `<div class="rp-chiffres">
      <div class="rp-chiffre" style="--c: var(--teal)"><span>Ce mois-ci</span><strong>${esc(REF.montant(somme(m => m === moisCourant)))}</strong></div>
      <div class="rp-chiffre" style="--c: var(--cornflower)"><span>Année ${annee}</span><strong>${esc(REF.montant(somme(m => m.startsWith(annee))))}</strong></div>
      <div class="rp-chiffre" style="--c: var(--amber)"><span>À venir (confirmé)</span><strong>${esc(REF.montant(avenir))}</strong></div>
    </div>`;
    const lignes = Object.entries(parMois).sort((a, b) => b[0].localeCompare(a[0]));
    h += lignes.length ? `<table class="rp-table"><thead><tr><th>Mois</th><th>Missions</th><th>Jours</th><th class="rp-droite">Honoraires</th></tr></thead><tbody>${lignes.map(([m, o]) => `<tr><td>${esc(cap(REF.moisFr(m)))}</td><td>${o.missions.size}</td><td>${o.jours}</td><td class="rp-droite"><strong>${esc(REF.montant(o.total))}</strong></td></tr>`).join('')}</tbody></table>
      <p class="rp-muted">Montants indicatifs, calculés à partir des forfaits convenus (missions confirmées ou réalisées). Un récapitulatif vous est envoyé par e-mail chaque début de mois.</p>` : vide('Pas encore de mission confirmée.');
    return h;
  }

  function vueProfil() {
    const p = S.profil, r = S.remplacant;
    return `<form class="rp-carte rp-formulaire" data-form="profil-remplacant" novalidate>
      <h3 class="rp-h">Mon profil</h3>
      <div class="field-row">${champ('Nom', entree('nom', p.nom), { pour: 'f-nom' })}${champ('Prénom', entree('prenom', p.prenom), { pour: 'f-prenom' })}</div>
      <div class="field-row">${champ('Téléphone', entree('telephone', p.telephone, { type: 'tel' }), { pour: 'f-telephone' })}${champ('E-mail', entree('email', p.email, { type: 'email', attrs: ' readonly' }), { pour: 'f-email' })}</div>
      <p><strong>Statut :</strong> ${esc(RECAP.remplacant(r, p).statut)} ${badge(r.etat, REF.ETATS_INSCRIPTION[r.etat])}</p>
      ${champ("Service ou structure d'affectation", entree('affectation', r.affectation), { pour: 'f-affectation' })}
      <fieldset><legend>Compétences</legend>${choixMultiples('competences', REF.COMPETENCES, r.competences)}</fieldset>
      <fieldset><legend>Gouvernorats acceptés</legend>
        <p class="rp-raccourcis"><button type="button" class="rp-lien-btn" data-act="grand-tunis">Grand Tunis</button> <button type="button" class="rp-lien-btn" data-act="tous-gouv">Tous</button> <button type="button" class="rp-lien-btn" data-act="aucun-gouv">Aucun</button></p>
        ${choixMultiples('gouvernorats', gouvernorats, r.gouvernorats, { classe: 'rp-puces-petites' })}
      </fieldset>
      <div class="field-row">${champ('Honoraires journaliers souhaités (TND)', entree('honoraires_souhaites', r.honoraires_souhaites ?? '', { type: 'number', attrs: ' min="0" step="10"' }), { pour: 'f-honoraires_souhaites', aide: 'Indicatif.' })}
      ${champ('Justificatif de statut', `<input id="f-justificatif" type="file" data-act-change="justificatif" accept=".pdf,.jpg,.jpeg,.png">`, { pour: 'f-justificatif', aide: r.justificatif ? 'Un justificatif est déjà enregistré ; un nouvel envoi le remplace.' : 'Facultatif.' })}</div>
      <label class="rp-consentement"><input type="checkbox" name="recevoir"${p.desinscrit ? '' : ' checked'}> Recevoir les propositions et le récapitulatif mensuel par e-mail</label>
      <div class="rp-form-erreurs"></div>
      <button class="btn btn-ink" type="submit">Enregistrer</button>
      <details class="rp-plus rp-danger-zone"><summary>Quitter le module</summary>
        <p>Supprime votre inscription de remplaçant, vos disponibilités et vos propositions. Votre compte RadiologicHub reste actif.</p>
        <button type="button" class="btn btn-outline btn-sm rp-danger" data-act="quitter">Supprimer mon inscription de remplaçant</button>
      </details>
    </form>`;
  }

  /* ---------- Structure ---------- */
  let cacheDemandes = { sid: null, liste: [] };
  async function demandesDe(sid) { cacheDemandes = { sid, liste: await api.demandesStructure(sid) }; return cacheDemandes.liste; }

  async function espaceStructure(s, onglet) {
    if (!s) return '';
    let h = bandeauEtat(s.etat, s.motif_refus, `de ${esc(s.nom)}`);
    if (onglet === 'nouvelle') return h + (s.etat === 'valide' ? formulaireDemande(s) : vide('Vous pourrez publier une demande dès que la structure sera validée.'));
    if (onglet === 'equipe') return h + await vueEquipe(s);
    const liste = await demandesDe(s.id);
    const carte = x => {
      const d = x.demande, c = x.compteurs;
      const info = d.etat === 'publiee' ? `<span class="rp-compteurs"><strong>${c.disponibles}</strong> disponible${c.disponibles > 1 ? 's' : ''} · ${c.contactes} contacté${c.contactes > 1 ? 's' : ''}</span>`
        : d.remplacant_id ? `<span class="rp-compteurs">${esc((x.interesses.find(i => i.remplacant.id === d.remplacant_id) || {}).remplacant?.profil ? RECAP.remplacant(x.interesses.find(i => i.remplacant.id === d.remplacant_id).remplacant, x.interesses.find(i => i.remplacant.id === d.remplacant_id).remplacant.profil).nom_complet : '')}</span>` : '';
      return `<article class="rp-item${d.etat === 'publiee' && c.disponibles ? ' is-alerte' : ''}"><a class="rp-item-lien" href="#/demande/${d.id}">${ligneDemande(d, null, `<span class="rp-ligne-prix">${esc(REF.montant(d.honoraires))} ${esc(REF.UNITES[d.unite])}</span>`)}</a><div class="rp-item-pied">${etatDemande(d)}${info}</div></article>`;
    };
    if (onglet === 'demandes') {
      const enCours = liste.filter(x => x.demande.etat === 'publiee');
      h += `<div class="rp-entete-liste"><h3 class="rp-h">En recherche (${enCours.length})</h3>${s.etat === 'valide' ? '<a href="#/espace/nouvelle" class="btn btn-ink btn-sm">+ Nouvelle demande</a>' : ''}</div>`;
      h += enCours.length ? enCours.map(carte).join('') : vide('Aucune demande en cours.', s.etat === 'valide' ? '<a href="#/espace/nouvelle" class="btn btn-ink btn-sm">Publier une demande</a>' : '');
      return h;
    }
    if (onglet === 'pourvues') {
      const l = liste.filter(x => x.demande.etat === 'pourvue').sort((a, b) => a.demande.dates[0].localeCompare(b.demande.dates[0]));
      return h + `<h3 class="rp-h">Remplacements confirmés (${l.length})</h3>${l.length ? l.map(carte).join('') : vide('Aucun remplacement confirmé à venir.')}`;
    }
    if (onglet === 'historique') {
      const l = liste.filter(x => !['publiee', 'pourvue'].includes(x.demande.etat));
      return h + `<h3 class="rp-h">Historique (${l.length})</h3>${l.length ? l.map(carte).join('') : vide('Rien pour le moment.')}`;
    }
    // favoris
    const fav = new Map();
    liste.forEach(x => x.interesses.filter(i => i.favori).forEach(i => fav.set(i.remplacant.id, i.remplacant)));
    h += `<h3 class="rp-h">Remplaçants favoris (${fav.size})</h3><p class="rp-muted">Marquez d'une étoile les remplaçants avec qui vous aimez travailler : ils apparaissent en tête des listes et des e-mails.</p>`;
    h += fav.size ? [...fav.values()].map(r => { const rr = RECAP.remplacant(r, r.profil); return `<article class="rp-item"><div class="rp-item-lien"><span class="rp-ligne-titre">★ ${esc(rr.nom_complet)}</span><span class="rp-ligne-sous">${esc(rr.statut)} · ${esc(rr.competences)}</span><span class="rp-ligne-sous">${esc(rr.telephone)} · ${esc(rr.email)}</span></div><div class="rp-item-pied"><button type="button" class="rp-lien-btn" data-act="favori" data-sid="${s.id}" data-rid="${r.id}">Retirer des favoris</button></div></article>`; }).join('')
      : vide('Pas encore de favori : l\'étoile se trouve sur la fiche de chaque remplaçant disponible.');
    return h;
  }

  /* Formulaire de demande (brouillon conservé pendant la saisie) */
  const HORAIRES = { journee: ['08:00', '16:00', 'jour'], demi_journee: ['08:00', '13:00', 'jour'], garde: ['20:00', '08:00', 'garde'], week_end: ['08:00', '18:00', 'jour'] };
  function brouillon() {
    if (!vue.brouillon) vue.brouillon = { dates: [], type: 'journee', heure_debut: '08:00', heure_fin: '16:00', modalites: [], profil: 'specialiste', annee_min: '', honoraires: '', unite: 'jour', logement: false, transport: false, repas: false, commentaire: '' };
    return vue.brouillon;
  }
  function formulaireDemande(s) {
    const b = brouillon();
    vue.moisDemande = vue.moisDemande || auj().slice(0, 7);
    return `<form class="rp-carte rp-formulaire" data-form="demande" data-sid="${s.id}" novalidate>
      <h3 class="rp-h">Nouvelle demande de remplacement</h3>
      <fieldset><legend>Type</legend><div class="rp-radios">${Object.entries(REF.TYPES).map(([k, l]) => `<label class="rp-puce"><input type="radio" name="type" value="${k}"${b.type === k ? ' checked' : ''}><span>${l}</span></label>`).join('')}</div></fieldset>
      <fieldset><legend>Date(s) — touchez les jours</legend>
        <div id="rp-cal-demande">${calendrierDemande()}</div>
        <p class="rp-dates-choisies" id="rp-dates-choisies">${datesChoisies()}</p>
      </fieldset>
      <div class="field-row">${champ('Début', entree('heure_debut', b.heure_debut, { type: 'time' }), { pour: 'f-heure_debut' })}${champ('Fin', entree('heure_fin', b.heure_fin, { type: 'time' }), { pour: 'f-heure_fin', aide: 'Garde : une fin plus tôt que le début = le lendemain.' })}</div>
      <fieldset><legend>Modalités à couvrir</legend>${choixMultiples('modalites', REF.COMPETENCES, b.modalites)}</fieldset>
      <fieldset><legend>Profil accepté</legend>
        <div class="rp-radios">${Object.entries(REF.PROFILS).map(([k, l]) => `<label class="rp-puce"><input type="radio" name="profil" value="${k}"${b.profil === k ? ' checked' : ''}><span>${l}</span></label>`).join('')}</div>
        <div class="rp-si-residents"${b.profil === 'residents' ? '' : ' hidden'}>${champ('Année minimale de résidanat (facultatif)', liste('annee_min', [['', 'Aucune'], ...REF.ANNEES.map(a => [a, `R${a} et plus`])], b.annee_min), { pour: 'f-annee_min' })}</div>
      </fieldset>
      <div class="field-row">${champ('Honoraires proposés (TND)', entree('honoraires', b.honoraires, { type: 'number', attrs: ' min="0" step="10" inputmode="numeric"' }), { pour: 'f-honoraires' })}${champ('Forfait', liste('unite', Object.entries(REF.UNITES).map(([k, v]) => [k, v]), b.unite), { pour: 'f-unite' })}</div>
      <fieldset><legend>Conditions</legend><div class="rp-puces">${Object.entries(REF.CONDITIONS).map(([k, l]) => `<label class="rp-puce"><input type="checkbox" name="${k}"${b[k] ? ' checked' : ''}><span>${l}</span></label>`).join('')}</div></fieldset>
      ${champ('Commentaire', `<textarea id="f-commentaire" name="commentaire" rows="3" maxlength="1000" placeholder="Accès, organisation, contact sur place…">${esc(b.commentaire)}</textarea>`, { pour: 'f-commentaire' })}
      <p class="rp-total" id="rp-total">${totalBrouillon()}</p>
      <div class="rp-form-erreurs"></div>
      <button class="btn btn-ink btn-block" type="submit">Publier la demande</button>
      <p class="rp-muted rp-centre">Les remplaçants compatibles reçoivent aussitôt un e-mail. Vous êtes prévenu dès que l'un d'eux est disponible.</p>
    </form>`;
  }
  const calendrierDemande = () => CAL.grille({ mois: vue.moisDemande, min: auj(), jours: Object.fromEntries(brouillon().dates.map(d => [d, { classes: ['is-choisi'], contenu: '<span class="rp-coche">✓</span>' }])) });
  const datesChoisies = () => { const d = [...brouillon().dates].sort(); return d.length ? d.map(x => `<span class="rp-date-puce">${esc(REF.jourFr(x))}<button type="button" data-act="retirer-date" data-date="${x}" aria-label="Retirer">×</button></span>`).join('') : '<span class="rp-muted">Aucune date choisie.</span>'; };
  const totalBrouillon = () => { const b = brouillon(); const n = b.dates.length, t = (Number(b.honoraires) || 0) * n; return n && t ? `Total : <strong>${esc(REF.montant(t))}</strong> pour ${n} ${b.unite === 'garde' ? 'garde' : 'jour'}${n > 1 ? 's' : ''}` : ''; };
  function majBrouillon(f) {
    const d = lireFormulaire(f), b = brouillon();
    const typeAvant = b.type;
    Object.assign(b, { type: d.type, heure_debut: d.heure_debut, heure_fin: d.heure_fin, modalites: d.modalites || [], profil: d.profil, annee_min: d.annee_min || '', honoraires: d.honoraires, unite: d.unite, logement: !!d.logement, transport: !!d.transport, repas: !!d.repas, commentaire: d.commentaire || '' });
    if (b.type !== typeAvant && HORAIRES[b.type]) {
      [b.heure_debut, b.heure_fin, b.unite] = HORAIRES[b.type];
      f.elements.heure_debut.value = b.heure_debut; f.elements.heure_fin.value = b.heure_fin; f.elements.unite.value = b.unite;
    }
    $('.rp-si-residents', f).hidden = b.profil !== 'residents';
    $('#rp-total').innerHTML = totalBrouillon();
  }

  async function vueEquipe(s) {
    const responsable = s.role === 'responsable';
    const membres = await api.membres(s.id);
    const dis = responsable ? '' : ' disabled';
    return `<form class="rp-carte rp-formulaire" data-form="structure" data-sid="${s.id}" novalidate>
      <h3 class="rp-h">Réglages de l'agent</h3>
      <label class="rp-consentement"><input type="checkbox" name="attribution_auto"${s.attribution_auto ? ' checked' : ''}${dis}> <strong>Attribution automatique</strong> : le premier remplaçant qui se déclare disponible est retenu, sans attendre votre choix.</label>
      ${champ('Relancer les remplaçants et me prévenir après (heures sans réponse)', entree('delai_relance_h', s.delai_relance_h, { type: 'number', attrs: ` min="1" max="168"${dis}` }), { pour: 'f-delai_relance_h' })}
      <label class="rp-consentement"><input type="checkbox" name="recevoir"${s.desinscrit ? '' : ' checked'}${dis}> Recevoir le récapitulatif mensuel par e-mail</label>
      <h3 class="rp-h">Fiche de la structure</h3>
      ${champ('Nom', entree('nom', s.nom, { attrs: dis }), { pour: 'f-nom' })}
      ${champ('Adresse', entree('adresse', s.adresse, { attrs: dis }), { pour: 'f-adresse' })}
      <div class="field-row">${champ('Ville', entree('ville', s.ville, { attrs: dis }), { pour: 'f-ville' })}${champ('Gouvernorat', liste('gouvernorat', REF.GOUVERNORATS.map(g => [g, g]), s.gouvernorat, { attrs: dis }), { pour: 'f-gouvernorat' })}</div>
      ${champ('Équipements', choixMultiples('equipements', REF.EQUIPEMENTS, s.equipements || []))}
      <div class="field-row">${champ('Contact', entree('contact_nom', s.contact_nom, { attrs: dis }), { pour: 'f-contact_nom' })}${champ('Téléphone', entree('telephone', s.telephone, { type: 'tel', attrs: dis }), { pour: 'f-telephone' })}</div>
      ${champ('E-mail de la structure', entree('email', s.email, { type: 'email', attrs: dis }), { pour: 'f-email' })}
      <div class="rp-form-erreurs"></div>
      ${responsable ? '<button class="btn btn-ink" type="submit">Enregistrer</button>' : '<p class="rp-muted">Seul un responsable de la structure peut modifier ces réglages.</p>'}
    </form>
    <div class="rp-carte">
      <h3 class="rp-h">Équipe (${membres.length})</h3>
      <ul class="rp-membres">${membres.map(m => `<li><span><strong>${esc([m.profil.prenom, m.profil.nom].filter(Boolean).join(' ') || m.profil.email)}</strong><br><span class="rp-muted">${esc(m.profil.email)} · ${esc(m.role)}</span></span>${responsable && m.profil.id && m.profil.id !== S.profil.id ? `<button type="button" class="rp-lien-btn" data-act="retirer-membre" data-sid="${s.id}" data-pid="${m.profil.id}">Retirer</button>` : ''}</li>`).join('')}</ul>
      ${responsable ? `<form class="rp-inviter" data-form="inviter" data-sid="${s.id}" novalidate>${champ('Inviter un collègue (e-mail)', entree('email', '', { type: 'email', ph: 'collegue@exemple.tn' }), { pour: 'f-invite' })}<button class="btn btn-outline btn-sm" type="submit">Inviter</button></form><p class="rp-muted">Le collègue est rattaché à la structure dès sa première connexion avec cette adresse.</p>` : ''}
    </div>`;
  }

  /* ---------- Détail d'une demande (structure) ---------- */
  async function detailDemande(id) {
    if (!S) { location.hash = '#/connexion'; return ''; }
    let x = null, s = null;
    for (const st of S.structures) {
      const l = await demandesDe(st.id);
      x = l.find(y => y.demande.id === id);
      if (x) { s = st; break; }
    }
    if (!x) {
      // remplaçant arrivé ici depuis un e-mail : afficher sa vue « mission »
      if (S.remplacant) return detailMission(id);
      return vide('Demande introuvable.', '<a href="#/espace" class="btn btn-outline btn-sm">Retour</a>');
    }
    vue.role = `structure:${s.id}`; mem.ecrire('role', vue.role);
    const d = x.demande, c = x.compteurs;
    const fini = REG.fin(d) <= maintenant();
    let h = `<p class="rp-retour"><a href="#/espace/${d.etat === 'publiee' ? 'demandes' : d.etat === 'pourvue' ? 'pourvues' : 'historique'}">‹ Mes demandes</a></p>
      <div class="rp-carte"><div class="rp-entete-liste"><h2>Demande ${esc(RECAP.reference(d))}</h2>${etatDemande(d)}</div>${recapitulatif(d, s, { structure: false })}</div>`;
    if (d.etat === 'publiee') {
      h += `<div class="rp-chiffres"><div class="rp-chiffre" style="--c: var(--green)"><span>Disponibles</span><strong>${c.disponibles}</strong></div><div class="rp-chiffre" style="--c: var(--cornflower)"><span>Contactés</span><strong>${c.contactes}</strong></div><div class="rp-chiffre" style="--c: var(--slate)"><span>Sans réponse</span><strong>${c.en_attente}</strong></div></div>`;
      const dispo = x.interesses.filter(i => i.proposition.etat === 'interesse').sort((a, b) => Number(b.favori) - Number(a.favori));
      h += `<h3 class="rp-h">Remplaçants disponibles (${dispo.length})</h3>`;
      h += dispo.length ? dispo.map(i => carteRemplacant(i, s, `<button type="button" class="btn btn-ink btn-sm" data-act="choisir" data-did="${d.id}" data-rid="${i.remplacant.id}">Choisir</button>`)).join('')
        : vide(c.contactes ? 'Aucun remplaçant ne s\'est encore déclaré disponible. Vous recevrez un e-mail dès que ce sera le cas.' : 'Aucun remplaçant compatible pour l\'instant : la demande reste en ligne et sera envoyée dès qu\'un remplaçant correspondra.');
      h += `<p class="rp-actions"><button type="button" class="btn btn-outline btn-sm rp-danger" data-act="retirer" data-did="${d.id}">Retirer la demande</button></p>`;
    }
    if (['pourvue', 'realisee', 'non_realisee'].includes(d.etat) && d.remplacant_id) {
      const i = x.interesses.find(y => y.remplacant.id === d.remplacant_id);
      if (i) {
        h += `<h3 class="rp-h">Remplaçant retenu${d.attribution === 'auto' ? ' (attribution automatique)' : ''}</h3>${carteRemplacant(i, s, '', true)}`;
        h += `<p class="rp-actions"><button type="button" class="btn btn-outline btn-sm" data-act="contrat" data-did="${d.id}">Contrat PDF</button><button type="button" class="btn btn-outline btn-sm" data-act="ics" data-did="${d.id}">Ajouter à l'agenda</button></p>`;
      }
      if (d.etat === 'pourvue' && !fini && REG.debut(d) > maintenant()) h += `<details class="rp-plus rp-danger-zone"><summary>Annuler ce remplacement</summary>
        <p>Le remplaçant est prévenu immédiatement par e-mail.</p>${champ('Motif (facultatif)', '<input id="f-motif" maxlength="300">', { pour: 'f-motif' })}
        <p class="rp-actions"><button type="button" class="btn btn-outline btn-sm" data-act="annuler" data-did="${d.id}">Annuler et remettre la demande en ligne</button><button type="button" class="btn btn-outline btn-sm rp-danger" data-act="annuler" data-did="${d.id}" data-definitif="1">Annuler définitivement</button></p></details>`;
      if (fini && d.realisation_structure == null && d.etat !== 'non_realisee') h += `<div class="rp-carte"><p><strong>Le remplacement a-t-il eu lieu ?</strong></p><p class="rp-actions"><button type="button" class="btn btn-sm rp-oui" data-act="realisation" data-did="${d.id}" data-oui="1">Oui</button><button type="button" class="btn btn-outline btn-sm" data-act="realisation" data-did="${d.id}">Non</button></p></div>`;
    }
    return h;
  }
  function carteRemplacant(i, s, action, coordonnees) {
    const rr = RECAP.remplacant(i.remplacant, i.remplacant.profil);
    return `<article class="rp-item rp-remplacant${i.favori ? ' is-favori' : ''}">
      <div class="rp-item-lien"><span class="rp-ligne-titre">${esc(rr.nom_complet)} <span class="rp-statut">${esc(rr.statut_court)}</span></span>
        <span class="rp-ligne-sous">${esc(rr.affectation)}</span><span class="rp-ligne-sous">${esc(rr.competences)}</span>
        <span class="rp-ligne-sous">Honoraires souhaités : ${esc(rr.honoraires_souhaites)}</span>
        ${coordonnees ? `<span class="rp-ligne-sous"><a href="tel:${esc(rr.telephone)}">${esc(rr.telephone)}</a> · <a href="mailto:${esc(rr.email)}">${esc(rr.email)}</a>${lienMessage(i.remplacant.id) ? ` · ${lienMessage(i.remplacant.id)}` : ''}</span>` : ''}</div>
      <div class="rp-item-pied"><button type="button" class="rp-etoile${i.favori ? ' is-actif' : ''}" data-act="favori" data-sid="${s.id}" data-rid="${i.remplacant.id}" aria-pressed="${i.favori}" title="Favori">★</button>${action}</div></article>`;
  }

  /* ---------- Détail d'une mission (remplaçant) ---------- */
  async function detailMission(id) {
    if (!S) { location.hash = '#/connexion'; return ''; }
    if (!S.remplacant) return detailDemande(id);
    const x = (await api.mesPropositions()).find(y => y.demande.id === id);
    if (!x) return vide('Proposition introuvable.', '<a href="#/espace" class="btn btn-outline btn-sm">Retour</a>');
    vue.role = 'remplacant'; mem.ecrire('role', vue.role);
    const d = x.demande, p = x.proposition, s = x.structure;
    const retenu = p.etat === 'retenu';
    const fini = REG.fin(d) <= maintenant();
    let h = `<p class="rp-retour"><a href="#/espace/${retenu ? 'missions' : 'propositions'}">‹ ${retenu ? 'Mes missions' : 'Mes propositions'}</a></p>
      <div class="rp-carte"><div class="rp-entete-liste"><h2>${retenu ? 'Mission' : 'Proposition'} ${esc(RECAP.reference(d))}</h2>${retenu ? etatDemande(d) : etatProposition(p)}</div>${recapitulatif(d, s)}</div>`;
    if (p.etat === 'envoyee' && d.etat === 'publiee') h += `<p class="rp-actions rp-actions-larges"><button type="button" class="btn rp-oui" data-act="repondre" data-id="${p.id}" data-reponse="disponible">Je suis disponible</button><button type="button" class="btn btn-outline" data-act="repondre" data-id="${p.id}" data-reponse="indisponible">Pas disponible</button></p>`;
    if (p.etat === 'interesse') h += '<div class="rp-bandeau is-en_attente">Vous vous êtes déclaré disponible : la structure choisit son remplaçant. Vous recevrez un e-mail de confirmation si elle vous retient.</div>';
    if (retenu) {
      const rs = RECAP.structure(s);
      h += `<div class="rp-carte"><h3 class="rp-h">Coordonnées de la structure</h3><p>${esc(rs.nom)} (${esc(rs.type)})<br>${esc(rs.adresse)}, ${esc(rs.ville)} — ${esc(rs.gouvernorat)}<br>Contact : ${esc(rs.contact)}<br><a href="tel:${esc(rs.telephone)}">${esc(rs.telephone)}</a> · <a href="mailto:${esc(rs.email)}">${esc(rs.email)}</a>${lienMessage(s.cree_par) ? ` · ${lienMessage(s.cree_par, 'Écrire au responsable')}` : ''}</p>
        <p class="rp-actions"><button type="button" class="btn btn-outline btn-sm" data-act="contrat" data-did="${d.id}">Contrat PDF</button><button type="button" class="btn btn-outline btn-sm" data-act="ics" data-did="${d.id}">Ajouter à l'agenda</button></p></div>`;
      if (d.etat === 'pourvue' && REG.debut(d) > maintenant()) h += `<details class="rp-plus rp-danger-zone"><summary>Je ne peux plus assurer ce remplacement</summary><p>La structure est prévenue immédiatement et la demande est remise en ligne.</p>${champ('Motif (facultatif)', '<input id="f-motif" maxlength="300">', { pour: 'f-motif' })}<button type="button" class="btn btn-outline btn-sm rp-danger" data-act="annuler" data-did="${d.id}">Annuler ce remplacement</button></details>`;
      if (fini && d.realisation_remplacant == null && d.etat !== 'non_realisee') h += `<div class="rp-carte"><p><strong>Le remplacement a-t-il eu lieu ?</strong></p><p class="rp-actions"><button type="button" class="btn btn-sm rp-oui" data-act="realisation" data-did="${d.id}" data-oui="1">Oui</button><button type="button" class="btn btn-outline btn-sm" data-act="realisation" data-did="${d.id}">Non</button></p></div>`;
    }
    return h;
  }

  /* =======================================================
     Administration
     ======================================================= */
  async function admin() {
    if (!S) { location.hash = '#/connexion'; return ''; }
    if (!S.admin) return vide("Cette page est réservée à l'administrateur.");
    const [att, st, emails, journal, comptes] = await Promise.all([api.admin.enAttente(), api.admin.statistiques(), api.admin.emails(), api.admin.journal(), api.admin.comptes()]);
    const n = o => Object.values(o || {}).reduce((t, x) => t + x, 0);
    let h = `<div class="rp-entete-liste"><h2>Administration</h2><button type="button" class="btn btn-outline btn-sm" data-act="taches">Lancer l'agent maintenant</button></div>`;
    h += `<h3 class="rp-h">Inscriptions à valider (${att.remplacants.length + att.structures.length})</h3>`;
    const actions = (type, id) => `<span class="rp-boutons"><button type="button" class="btn btn-sm rp-oui" data-act="valider" data-type="${type}" data-id="${id}">Valider</button><button type="button" class="btn btn-outline btn-sm" data-act="refuser" data-type="${type}" data-id="${id}">Refuser</button></span>`;
    h += att.remplacants.map(r => { const rr = RECAP.remplacant(r, r.profil); return `<article class="rp-item"><div class="rp-item-lien"><span class="rp-ligne-titre">${esc(rr.nom_complet)} <span class="rp-statut">${esc(rr.statut_court)}</span></span><span class="rp-ligne-sous">${esc(rr.affectation)} · ${esc(rr.competences)}</span><span class="rp-ligne-sous">Gouvernorats : ${esc(REF.listeFr(r.gouvernorats || []))}</span><span class="rp-ligne-sous">${esc(rr.telephone)} · ${esc(rr.email)} · inscrit le ${esc(REF.horodatageFr(r.cree_le))}</span>${r.justificatif ? `<span class="rp-ligne-sous"><button type="button" class="rp-lien-btn" data-act="justificatif" data-chemin="${esc(r.justificatif)}">Voir le justificatif</button></span>` : '<span class="rp-ligne-sous rp-muted">Pas de justificatif</span>'}</div><div class="rp-item-pied">${badge('en_attente', 'Remplaçant')}${actions('remplacant', r.id)}</div></article>`; }).join('');
    h += att.structures.map(s => `<article class="rp-item"><div class="rp-item-lien"><span class="rp-ligne-titre">${esc(s.nom)} <span class="rp-statut">${esc(REF.TYPES_STRUCTURE[s.type])}</span></span><span class="rp-ligne-sous">${esc(s.adresse)}, ${esc(s.ville)} (${esc(s.gouvernorat)})</span><span class="rp-ligne-sous">${esc(s.contact_nom)} · ${esc(s.telephone)} · ${esc(s.email)}</span></div><div class="rp-item-pied">${badge('en_attente', 'Structure')}${actions('structure', s.id)}</div></article>`).join('');
    if (!att.remplacants.length && !att.structures.length) h += vide('Aucune inscription en attente.');
    h += `<h3 class="rp-h">Statistiques</h3><div class="rp-chiffres">
      <div class="rp-chiffre" style="--c: var(--cornflower)"><span>Remplaçants validés</span><strong>${(st.remplacants || {}).valide || 0}</strong></div>
      <div class="rp-chiffre" style="--c: var(--plum)"><span>Structures validées</span><strong>${(st.structures || {}).valide || 0}</strong></div>
      <div class="rp-chiffre" style="--c: var(--teal)"><span>Demandes</span><strong>${n(st.demandes)}</strong></div>
      <div class="rp-chiffre" style="--c: var(--green)"><span>Pourvues ou réalisées</span><strong>${((st.demandes || {}).pourvue || 0) + ((st.demandes || {}).realisee || 0)}</strong></div>
      <div class="rp-chiffre" style="--c: var(--amber)"><span>Délai moyen de pourvoi</span><strong>${st.delai_moyen_h == null ? '—' : `${String(st.delai_moyen_h).replace('.', ',')} h`}</strong></div>
      <div class="rp-chiffre" style="--c: var(--slate)"><span>E-mails envoyés</span><strong>${(st.emails || {}).envoye || 0}${(st.emails || {}).echec ? ` <small class="rp-ko">(${st.emails.echec} échec)</small>` : ''}</strong></div>
    </div>`;
    h += `<details class="rp-plus"><summary>Comptes (${comptes.remplacants.length} remplaçants, ${comptes.structures.length} structures)</summary><table class="rp-table"><thead><tr><th>Nom</th><th>Type</th><th>État</th><th></th></tr></thead><tbody>
      ${comptes.remplacants.map(r => `<tr><td>${esc(RECAP.remplacant(r, r.profil).nom_complet)}</td><td>${esc(RECAP.remplacant(r, r.profil).statut_court)}</td><td>${badge(r.etat, REF.ETATS_INSCRIPTION[r.etat])}</td><td>${r.etat === 'valide' ? `<button type="button" class="rp-lien-btn" data-act="suspendre" data-type="remplacant" data-id="${r.id}">Suspendre</button>` : r.etat !== 'en_attente' ? `<button type="button" class="rp-lien-btn" data-act="valider" data-type="remplacant" data-id="${r.id}">Réactiver</button>` : ''}</td></tr>`).join('')}
      ${comptes.structures.map(s => `<tr><td>${esc(s.nom)}</td><td>${esc(REF.TYPES_STRUCTURE[s.type])}</td><td>${badge(s.etat, REF.ETATS_INSCRIPTION[s.etat])}</td><td>${s.etat === 'valide' ? `<button type="button" class="rp-lien-btn" data-act="suspendre" data-type="structure" data-id="${s.id}">Suspendre</button>` : s.etat !== 'en_attente' ? `<button type="button" class="rp-lien-btn" data-act="valider" data-type="structure" data-id="${s.id}">Réactiver</button>` : ''}</td></tr>`).join('')}
    </tbody></table></details>`;
    const STATUT = { envoye: ['is-ok', 'Envoyé'], echec: ['is-ko', 'Échec'], a_envoyer: ['is-attente', 'En cours'], ignore_desinscrit: ['is-gris', 'Désinscrit'] };
    h += `<details class="rp-plus" open><summary>Journal des e-mails (${emails.length})</summary><div class="rp-defile"><table class="rp-table"><thead><tr><th>Date</th><th>Destinataire</th><th>Objet</th><th>Statut</th></tr></thead><tbody>${emails.slice(0, 100).map(e => `<tr><td>${esc(REF.horodatageFr(e.cree_le))}</td><td>${esc(e.destinataire)}</td><td>${esc(e.objet || e.modele)}${e.erreur ? `<br><small class="rp-ko">${esc(e.erreur)}</small>` : ''}</td><td><span class="rp-badge ${(STATUT[e.statut] || [])[0] || ''}">${esc((STATUT[e.statut] || [, e.statut])[1])}</span></td></tr>`).join('')}</tbody></table></div></details>`;
    h += `<details class="rp-plus"><summary>Journal des actions (${journal.length})</summary><div class="rp-defile"><table class="rp-table"><thead><tr><th>Date</th><th>Action</th><th>Par</th><th>Objet</th></tr></thead><tbody>${journal.slice(0, 150).map(e => `<tr><td>${esc(REF.horodatageFr(e.quand))}</td><td>${esc(e.action.replace(/_/g, ' '))}</td><td>${esc(e.acteur_role || '')}</td><td class="rp-muted">${esc(e.objet_type || '')} ${esc(String(e.objet_id || '').slice(0, 8))}${e.details && Object.keys(e.details).length ? `<br><small>${esc(JSON.stringify(e.details).slice(0, 120))}</small>` : ''}</td></tr>`).join('')}</tbody></table></div></details>`;
    return h;
  }

  /* =======================================================
     Routeur
     ======================================================= */
  const ROUTES = [
    [/^#?\/?$/, accueil], [/^#\/connexion$/, connexion],
    [/^#\/inscription\/remplacant$/, inscriptionRemplacant], [/^#\/inscription\/structure$/, inscriptionStructure],
    [/^#\/espace(?:\/([\w-]+))?$/, espace], [/^#\/(?:espace\/)?demande\/([\w-]+)$/, detailDemande], [/^#\/(?:espace\/)?mission\/([\w-]+)$/, detailMission], [/^#\/admin$/, admin],
  ];
  let jeton = 0;
  async function afficher() {
    const h = location.hash || '#/';
    if (h && !h.startsWith('#/') && h !== '#') return;                 // ex. retour du lien magique (#access_token=…)
    const route = ROUTES.find(([re]) => re.test(h)) || ROUTES[0];
    const n = ++jeton;
    app.setAttribute('aria-busy', 'true');
    try {
      const html = await route[1](...(h.match(route[0]) || []).slice(1));
      if (n !== jeton) return;
      if (html !== '') app.innerHTML = html;
      $$('[data-form="inscription-remplacant"] input[name="statut"]').forEach(i => i.addEventListener('change', basculerResident));
    } catch (e) {
      console.error(e);
      app.innerHTML = vide(`Impossible d'afficher cette page : ${esc(e.message)}`, '<a href="#/" class="btn btn-outline btn-sm">Accueil</a>');
    } finally { app.removeAttribute('aria-busy'); }
  }
  const basculerResident = () => { const f = $('[data-form="inscription-remplacant"]'); if (f) $('.rp-si-resident', f).hidden = f.elements.statut.value !== 'resident'; };

  /* ---------- Formulaires ---------- */
  const GRAND_TUNIS = ['Tunis', 'Ariana', 'Ben Arous', 'La Manouba'];
  const FORMULAIRES = {
    async connexion(f) {
      const email = f.elements.email.value.trim();
      if (!REF.emailValide(email)) { toast('Adresse e-mail invalide.', 'ko'); return; }
      const r = await essayer(() => api.connexion(email));
      if (!r) return;
      if (r.demo) { await rafraichir(); location.hash = '#/espace'; return; }
      app.innerHTML = `<div class="rp-carte rp-etroit rp-centre"><h2>Vérifiez votre boîte e-mail</h2><p>Un lien de connexion vient d'être envoyé à <strong>${esc(email)}</strong>. Il est valable une fois ; pensez à regarder les indésirables.</p></div>`;
    },
    async 'inscription-remplacant'(f) {
      const d = lireFormulaire(f);
      d.justificatif = f.elements.justificatif.files[0] || null;
      d.consentement = !!d.consentement;
      const e = REG.validerRemplacant(d);
      if (d.justificatif && d.justificatif.size > 5 * 1024 * 1024) e.push('Le justificatif dépasse 5 Mo.');
      $('.rp-form-erreurs', f).innerHTML = erreurs(e);
      if (e.length) { $('.rp-form-erreurs', f).scrollIntoView({ block: 'center' }); return; }
      const r = await essayer(() => api.inscrireRemplacant(d));
      if (!r) return;
      await apresInscription(r, d.email);
    },
    async 'inscription-structure'(f) {
      const d = lireFormulaire(f);
      d.consentement = !!d.consentement;
      const e = [...REG.validerStructure(d), ...REG.validerIdentite({ nom: d.compte_nom, prenom: d.compte_prenom, telephone: d.compte_telephone, email: d.compte_email }).map(x => `Votre compte : ${x.charAt(0).toLowerCase()}${x.slice(1)}`)];
      $('.rp-form-erreurs', f).innerHTML = erreurs(e);
      if (e.length) { $('.rp-form-erreurs', f).scrollIntoView({ block: 'center' }); return; }
      const r = await essayer(() => api.inscrireStructure(d));
      if (!r) return;
      await apresInscription(r, d.compte_email);
    },
    async 'profil-remplacant'(f) {
      const d = lireFormulaire(f);
      const e = REG.validerIdentite({ ...d, email: S.profil.email });
      if (!(d.competences || []).length) e.push('Cochez au moins une compétence.');
      if (!(d.gouvernorats || []).length) e.push('Cochez au moins un gouvernorat.');
      $('.rp-form-erreurs', f).innerHTML = erreurs(e);
      if (e.length) return;
      await essayer(async () => {
        await api.majProfil({ nom: d.nom, prenom: d.prenom, telephone: d.telephone, desinscrit: !d.recevoir });
        await api.majRemplacant({ affectation: d.affectation, competences: d.competences, gouvernorats: d.gouvernorats, honoraires_souhaites: d.honoraires_souhaites === '' ? null : Number(d.honoraires_souhaites) });
      }, 'Profil enregistré.');
      await rafraichir(); afficher();
    },
    async demande(f) {
      majBrouillon(f);
      const b = brouillon();
      const e = REG.validerDemande({ ...b, annee_min: b.annee_min ? Number(b.annee_min) : null }, auj());
      $('.rp-form-erreurs', f).innerHTML = erreurs(e);
      if (e.length) { $('.rp-form-erreurs', f).scrollIntoView({ block: 'center' }); return; }
      const bouton = $('button[type=submit]', f); bouton.disabled = true;
      const r = await essayer(() => api.publier(f.dataset.sid, { ...b, annee_min: b.annee_min ? Number(b.annee_min) : null, honoraires: Number(b.honoraires) }),
        x => `Demande publiée : envoyée à ${x.envoyees} remplaçant${x.envoyees > 1 ? 's' : ''} compatible${x.envoyees > 1 ? 's' : ''}.`);
      bouton.disabled = false;
      if (!r) return;
      vue.brouillon = null;
      location.hash = `#/demande/${r.demande_id}`;
    },
    async structure(f) {
      const d = lireFormulaire(f);
      const e = [];
      if (!String(d.nom || '').trim()) e.push('Indiquez le nom.');
      if (!REF.telephoneValide(d.telephone)) e.push('Téléphone invalide.');
      if (!REF.emailValide(d.email)) e.push('E-mail invalide.');
      const delai = Number(d.delai_relance_h);
      if (!(delai >= 1 && delai <= 168)) e.push('Le délai de relance doit être compris entre 1 et 168 heures.');
      $('.rp-form-erreurs', f).innerHTML = erreurs(e);
      if (e.length) return;
      await essayer(() => api.majStructure(f.dataset.sid, { nom: d.nom, adresse: d.adresse, ville: d.ville, gouvernorat: d.gouvernorat, equipements: d.equipements || [], contact_nom: d.contact_nom, telephone: d.telephone, email: d.email, attribution_auto: !!d.attribution_auto, delai_relance_h: delai, desinscrit: !d.recevoir }), 'Réglages enregistrés.');
      await rafraichir(); afficher();
    },
    async inviter(f) {
      const email = f.elements.email.value.trim();
      if (!REF.emailValide(email)) { toast('Adresse e-mail invalide.', 'ko'); return; }
      await essayer(() => api.inviter(f.dataset.sid, email), `${email} est invité(e).`);
      afficher();
    },
  };
  async function apresInscription(r, email) {
    if (r.lienEnvoye) {
      app.innerHTML = `<div class="rp-carte rp-etroit rp-centre"><h2>Plus qu'un clic</h2><p>Un lien de confirmation a été envoyé à <strong>${esc(email)}</strong>. Ouvrez-le pour terminer votre inscription ; elle sera ensuite examinée par l'administrateur.</p>${r.justificatifPlusTard ? '<p class="rp-muted">Votre justificatif pourra être ajouté depuis votre profil après la connexion.</p>' : ''}</div>`;
      return;
    }
    toast("Inscription envoyée : elle sera examinée par l'administrateur.");
    await rafraichir();
    location.hash = '#/espace';
    afficher();
  }

  /* ---------- Actions (boutons) ---------- */
  const motif = () => ($('#f-motif') || {}).value || '';
  const ACTIONS = {
    async deconnexion() { await api.deconnexion(); S = null; barre(); location.hash = '#/'; },
    async google() { await essayer(() => api.connexionGoogle()); },
    role(b) { vue.role = b.dataset.role; mem.ecrire('role', vue.role); location.hash = '#/espace'; afficher(); },
    async repondre(b) {
      b.disabled = true;
      const r = await essayer(() => api.repondre(b.dataset.id, b.dataset.reponse));
      if (r) toast(r.ok ? (b.dataset.reponse === 'disponible' ? (r.etat === 'retenu' ? 'Vous êtes retenu : confirmation envoyée par e-mail.' : 'Réponse envoyée : la structure va choisir.') : 'Réponse enregistrée.') : 'Cette proposition n\'est plus ouverte.', r.ok ? 'ok' : 'ko');
      afficher();
    },
    pinceau(b) { vue.pinceau = b.dataset.pinceau; $$('.rp-pinceau').forEach(x => { const on = x === b; x.classList.toggle('is-actif', on); x.setAttribute('aria-checked', on); }); },
    async 'remplir-mois'() {
      if (vue.pinceau === 'effacer') return ACTIONS['vider-mois']();
      const [a, m] = vue.mois.split('-').map(Number), nb = new Date(Date.UTC(a, m, 0)).getUTCDate();
      for (let j = 1; j <= nb; j++) {
        const date = `${vue.mois}-${String(j).padStart(2, '0')}`;
        if (date < auj() || [0, 6].includes(REF.jourSemaine(date))) continue;
        const cr = new Set(dispos[date] || []);
        if (vue.pinceau === 'journee') { cr.add('journee'); cr.delete('matin'); cr.delete('apres_midi'); } else { cr.add(vue.pinceau); if (vue.pinceau !== 'garde') cr.delete('journee'); }
        dispos[date] = [...cr];
        await api.definirDisponibilites(date, dispos[date]);
      }
      $('#rp-cal-dispo').innerHTML = calendrierDispos();
      toast('Disponibilités enregistrées.');
    },
    async 'vider-mois'() {
      for (const date of Object.keys(dispos).filter(d => d.startsWith(vue.mois) && d >= auj())) { dispos[date] = []; await api.definirDisponibilites(date, []); }
      $('#rp-cal-dispo').innerHTML = calendrierDispos();
    },
    'retirer-date'(b) { const x = brouillon(); x.dates = x.dates.filter(d => d !== b.dataset.date); majCalendrierDemande(); },
    'grand-tunis'(b) { $$('input[name="gouvernorats"]', b.closest('form')).forEach(c => { c.checked = c.checked || GRAND_TUNIS.includes(c.value); }); },
    'tous-gouv'(b) { $$('input[name="gouvernorats"]', b.closest('form')).forEach(c => { c.checked = true; }); },
    'aucun-gouv'(b) { $$('input[name="gouvernorats"]', b.closest('form')).forEach(c => { c.checked = false; }); },
    async choisir(b) {
      if (!confirm('Retenir ce remplaçant ? Il reçoit aussitôt la confirmation, les autres sont prévenus.')) return;
      const r = await essayer(() => api.choisir(b.dataset.did, b.dataset.rid));
      if (r) toast(r.ok ? 'Remplaçant retenu : confirmations envoyées.' : 'Ce remplacement vient d\'être pourvu.', r.ok ? 'ok' : 'ko');
      cacheDemandes.sid = null; afficher();
    },
    async annuler(b) {
      if (!confirm('Confirmer l\'annulation ? L\'autre partie est prévenue immédiatement.')) return;
      const r = await essayer(() => api.annuler(b.dataset.did, { definitif: !!b.dataset.definitif, motif: motif() }));
      if (r) toast(r.ok ? (r.remise ? 'Remplacement annulé : la demande est remise en ligne.' : 'Remplacement annulé.') : 'Annulation impossible.', r.ok ? 'ok' : 'ko');
      cacheDemandes.sid = null; await rafraichir(); afficher();
    },
    async retirer(b) {
      if (!confirm('Retirer cette demande ? Les remplaçants disponibles sont prévenus.')) return;
      const r = await essayer(() => api.retirer(b.dataset.did, ''));
      if (r && r.ok) toast('Demande retirée.');
      cacheDemandes.sid = null; location.hash = '#/espace/historique';
    },
    async realisation(b) {
      const r = await essayer(() => api.realisation(b.dataset.did, !!b.dataset.oui));
      if (r) toast(r.ok ? 'Merci, réponse enregistrée.' : 'Réponse déjà enregistrée.', r.ok ? 'ok' : 'ko');
      cacheDemandes.sid = null; afficher();
    },
    async favori(b) {
      await essayer(() => api.basculerFavori(b.dataset.sid, b.dataset.rid));
      cacheDemandes.sid = null; afficher();
    },
    async contrat(b) {
      const { d, s, r } = await mission(b.dataset.did);
      if (d) await essayer(() => contratPdf(d, s, r));
    },
    async ics(b) {
      const { d, s, r } = await mission(b.dataset.did);
      if (d) agendaIcs(d, s, r);
    },
    async quitter() {
      if (!confirm('Supprimer définitivement votre inscription de remplaçant ?')) return;
      await essayer(() => api.quitterRemplacant(), 'Inscription de remplaçant supprimée.');
      await rafraichir(); location.hash = '#/espace'; afficher();
    },
    async reabonner() { await essayer(() => api.majProfil({ desinscrit: false }), 'Vous recevez de nouveau les propositions.'); await rafraichir(); afficher(); },
    async 'retirer-membre'(b) {
      if (!confirm('Retirer ce membre de la structure ?')) return;
      await essayer(() => api.retirerMembre(b.dataset.sid, b.dataset.pid)); afficher();
    },
    async valider(b) { await essayer(() => api.admin.valider(b.dataset.type, b.dataset.id), 'Inscription validée : e-mail envoyé.'); afficher(); },
    async refuser(b) {
      const m = prompt('Motif du refus (envoyé par e-mail) :', '');
      if (m === null) return;
      await essayer(() => api.admin.refuser(b.dataset.type, b.dataset.id, m), 'Inscription refusée : e-mail envoyé.'); afficher();
    },
    async suspendre(b) { if (!confirm('Suspendre ce compte ?')) return; await essayer(() => api.admin.suspendre(b.dataset.type, b.dataset.id), 'Compte suspendu.'); afficher(); },
    async taches() {
      const r = await essayer(() => api.admin.lancerTaches());
      if (r) toast(`Agent : ${r.selection} proposition(s), ${r.relances} relance(s), ${r.rappels} rappel(s), ${r.realisations} demande(s) de réalisation, ${r.recaps} récapitulatif(s).`);
      afficher();
    },
    async justificatif(b) {
      const url = await essayer(() => api.lienJustificatif(b.dataset.chemin));
      if (url) window.open(url, '_blank', 'noopener'); else if (api.demo) toast('Mode démonstration : les fichiers ne sont pas conservés.', 'ko');
    },
  };
  /* Données complètes d'une mission (pour le contrat et l'agenda) */
  async function mission(did) {
    for (const st of (S ? S.structures : [])) {
      const x = (await api.demandesStructure(st.id)).find(y => y.demande.id === did);
      if (x) { const i = x.interesses.find(y => y.remplacant.id === x.demande.remplacant_id); return { d: x.demande, s: st, r: i && i.remplacant }; }
    }
    if (S && S.remplacant) {
      const x = (await api.mesPropositions()).find(y => y.demande.id === did);
      if (x) return { d: x.demande, s: x.structure, r: S.remplacant };
    }
    toast('Mission introuvable.', 'ko');
    return {};
  }
  function majCalendrierDemande() {
    const z = $('#rp-cal-demande');
    if (!z) return;
    z.innerHTML = calendrierDemande();
    $('#rp-dates-choisies').innerHTML = datesChoisies();
    $('#rp-total').innerHTML = totalBrouillon();
  }

  app.addEventListener('click', e => {
    const nav = e.target.closest('[data-cal]');
    if (nav) {
      if (nav.closest('#rp-cal-dispo')) { vue.mois = nav.dataset.cal; $('#rp-cal-dispo').innerHTML = calendrierDispos(); }
      else { vue.moisDemande = nav.dataset.cal; majCalendrierDemande(); }
      return;
    }
    const jour = e.target.closest('.rp-cal-jour');
    if (jour && !jour.disabled) {
      const date = jour.dataset.date;
      if (jour.closest('#rp-cal-dispo')) definirDispo(date, appliquerPinceau(date));
      else if (jour.closest('#rp-cal-demande')) {
        const b = brouillon(), i = b.dates.indexOf(date);
        if (i >= 0) b.dates.splice(i, 1); else if (b.dates.length < 31) b.dates.push(date);
        majCalendrierDemande();
      }
      return;
    }
    const b = e.target.closest('[data-act]');
    if (b && ACTIONS[b.dataset.act]) { e.preventDefault(); ACTIONS[b.dataset.act](b, e); }
  });
  document.addEventListener('click', e => { const b = e.target.closest('#rp-barre [data-act]'); if (b && ACTIONS[b.dataset.act]) ACTIONS[b.dataset.act](b, e); });
  app.addEventListener('submit', e => {
    const f = e.target.closest('[data-form]');
    if (f && FORMULAIRES[f.dataset.form]) { e.preventDefault(); FORMULAIRES[f.dataset.form](f); }
  });
  app.addEventListener('input', e => { const f = e.target.closest('[data-form="demande"]'); if (f) majBrouillon(f); });
  app.addEventListener('change', async e => {
    const f = e.target.closest('[data-form="demande"]');
    if (f) majBrouillon(f);
    if (e.target.matches('[data-act-change="justificatif"]') && e.target.files[0]) {
      const fichier = e.target.files[0];
      if (fichier.size > 5 * 1024 * 1024) { toast('Le fichier dépasse 5 Mo.', 'ko'); return; }
      await essayer(() => api.envoyerJustificatif(fichier), 'Justificatif envoyé.');
      await rafraichir();
    }
  });

  /* ---------- Démarrage ---------- */
  app.innerHTML = '<p class="rp-chargement">Chargement…</p>';
  try { await api.pret; } catch (e) { app.innerHTML = vide(`Service indisponible : ${esc(e.message)}`); return; }
  const finalisee = await api.finaliserInscription().catch(e => { toast(e.message, 'ko'); return null; });
  try { await rafraichir(); } catch (e) { app.innerHTML = vide(`Service indisponible : ${esc(e.message)}`); return; }
  if (finalisee) { toast("Inscription envoyée : elle sera examinée par l'administrateur."); location.hash = '#/espace'; }
  else if (S && /access_token|type=magiclink/.test(location.hash)) location.hash = '#/espace';
  window.RHRp.rafraichir = async () => { cacheDemandes.sid = null; await rafraichir(); afficher(); };
  window.addEventListener('hashchange', () => { window.scrollTo({ top: 0 }); afficher(); });   // seulement une fois le service prêt
  afficher();
})();
