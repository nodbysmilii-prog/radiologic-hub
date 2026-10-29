/* =========================================================
   RadiologicHub — assistant documentaire du module de comptes rendus.
   ---------------------------------------------------------
   Panneau à droite de l'éditeur (#cr-editor) : fiche rapide liée à ce qui
   est écrit, carrousel des sections (extraits recopiés de la fiche), lien
   direct vers la section, une suggestion principale et jusqu'à 3 secondaires.
   • lecture seule : n'écrit jamais dans l'éditeur, ne déplace pas le curseur
     (les boutons du panneau ne prennent pas le focus à la souris) ;
   • 100 % local : l'index (assistant/index-fiches.js, même site) est chargé
     au premier usage ; aucun texte n'est envoyé ni conservé ; seuls les
     réglages du panneau (désactivé, épinglé) sont gardés dans le navigateur ;
   • analyse 300 ms après la dernière frappe ; panneau reconstruit seulement
     si les suggestions changent ; les textes insérés par un modèle ou la
     dictée sont vus par une vérification légère toutes les 1,5 s.
   Moteur : assistant/moteur.js ; dictionnaire : assistant/synonymes.js.
   ========================================================= */
(function () {
  'use strict';
  const editeur = document.getElementById('cr-editor');
  const panneau = document.getElementById('ad-panneau');
  const A = window.RHAssistant || {};
  if (!editeur || !panneau || !A.moteur || !A.synonymes) return;

  const $ = s => panneau.querySelector(s);
  const contenu = $('.ad-contenu');
  const badgeRail = $('.ad-rail-nb');
  const boutonMobile = document.getElementById('ad-mobile');
  const VERSION_INDEX = panneau.dataset.index || '';
  const CLE = 'rh-assistant';
  const DELAI = 300;

  let prefs = { off: false, epingle: false };
  try { prefs = Object.assign(prefs, JSON.parse(localStorage.getItem(CLE) || '{}')); } catch (e) { /* stockage indisponible */ }
  const garder = () => { try { localStorage.setItem(CLE, JSON.stringify({ off: prefs.off, epingle: prefs.epingle })); } catch (e) { /* idem */ } };

  let moteur = null;
  let chargement = null;
  let minuteur = 0;
  let dernierTexte = null;
  let signature = '';
  let res = null;          // dernier résultat
  let choix = 0;           // suggestion affichée (indice dans res.suggestions)
  let diapo = 0;           // section affichée dans le carrousel
  let replieManuel = '';   // fiche pour laquelle l'utilisateur a replié le panneau

  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const mobile = () => window.matchMedia('(max-width: 640px)').matches;

  /* ---------- Index : chargé une fois, depuis le site lui-même ---------- */
  function charger() {
    if (moteur) return Promise.resolve(moteur);
    if (!chargement) {
      chargement = new Promise((ok, ko) => {
        if (window.RHIndexFiches) return ok();
        const s = document.createElement('script');
        s.src = 'assistant/index-fiches.js' + (VERSION_INDEX ? '?v=' + VERSION_INDEX : '');
        s.onload = ok;
        s.onerror = ko;
        document.head.appendChild(s);
      }).then(() => (moteur = A.moteur.creer(window.RHIndexFiches, A.synonymes)))
        .catch(() => { chargement = null; afficherErreur(); });
    }
    return chargement;
  }

  /* ---------- États du panneau ---------- */
  function etat(e) {
    panneau.dataset.etat = e;
    $('.ad-rail-btn').setAttribute('aria-expanded', String(e === 'ouvert'));
    if (boutonMobile) boutonMobile.setAttribute('aria-expanded', String(e === 'ouvert'));
  }
  function majReglages() {
    panneau.dataset.off = String(prefs.off);
    $('#ad-actif').checked = !prefs.off;
    const ep = $('#ad-epingle');
    ep.setAttribute('aria-pressed', String(prefs.epingle));
    ep.title = prefs.epingle ? 'Désépingler : le panneau se replie quand aucune fiche n\'est liée' : 'Épingler : garder le panneau ouvert';
  }

  /* ---------- Analyse (différée) ---------- */
  function planifier() {
    if (prefs.off) return;
    clearTimeout(minuteur);
    minuteur = setTimeout(analyser, DELAI);
  }
  function analyser() {
    if (prefs.off) return;
    const texte = editeur.value;
    if (texte === dernierTexte && moteur) return;
    charger().then(m => {
      if (!m || prefs.off) return;
      dernierTexte = texte;
      const r = m.analyser(texte, editeur.selectionStart);
      const sig = JSON.stringify(r.suggestions.map(s => [s.fiche, s.si, s.ri, s.termes]));
      if (sig === signature) return;           // rien de nouveau : on ne touche pas au panneau
      const anciennePrincipale = res && res.suggestions[0] && res.suggestions[0].fiche;
      signature = sig;
      res = r;
      choix = 0;
      diapo = r.suggestions.length ? r.suggestions[0].si : 0;
      rendre();
      const p = r.suggestions[0];
      if (p && p.fiche !== anciennePrincipale) replieManuel = '';
      if (!mobile()) {
        if (p && replieManuel !== p.fiche) etat('ouvert');
        else if (!p && !prefs.epingle) etat('replie');
      }
    });
  }

  /* ---------- Rendu ---------- */
  function afficherErreur() {
    contenu.innerHTML = '<p class="ad-vide">L\'index des fiches n\'a pas pu être chargé. Rechargez la page pour réessayer.</p>';
  }

  function rendre() {
    const n = res ? res.suggestions.length : 0;
    badgeRail.textContent = n ? String(n) : '';
    badgeRail.hidden = !n;
    if (boutonMobile) {
      boutonMobile.hidden = !n || prefs.off;
      boutonMobile.querySelector('.ad-mobile-nb').textContent = n ? String(n) : '';
    }
    if (!n) {
      contenu.innerHTML = '<p class="ad-vide">Aucune fiche rapide ne correspond à ce qui est écrit pour l\'instant.'
        + ' Écrivez par exemple « Bosniak », « pancréatite », « PI-RADS »…</p>';
      return;
    }
    const s = res.suggestions[choix];
    const fiche = moteur.fiche(s.fiche);
    const nbSec = fiche.sections.length;
    const sec = fiche.sections[diapo];
    const rub = diapo === s.si ? sec.rubriques[s.ri] : sec.rubriques[0];
    const ancre = diapo === s.si ? s.ancre : (rub.ancre || sec.id);
    const blocs = rub.blocs.slice(0, diapo === s.si ? 3 : 2);
    const titreRub = [rub.badge, rub.titre].filter(Boolean).join(' · ');
    const autres = res.suggestions.map((x, i) => ({ x, i })).filter(o => o.i !== choix);

    contenu.innerHTML = `
      <p class="ad-detecte"><span>Détecté</span>${s.termes.map(t => `<mark class="k-key">${esc(t)}</mark>`).join(' ')}</p>
      <h3 class="ad-fiche">${esc(fiche.titre)}</h3>
      <div class="ad-carrousel" role="group" aria-roledescription="carrousel" aria-label="Sections de la fiche">
        <div class="ad-nav">
          <button type="button" class="ad-prec" aria-label="Section précédente" ${diapo === 0 ? 'disabled' : ''}>‹</button>
          <span class="ad-pos">Section ${diapo + 1} / ${nbSec}</span>
          <button type="button" class="ad-suiv" aria-label="Section suivante" ${diapo >= nbSec - 1 ? 'disabled' : ''}>›</button>
        </div>
        <article class="ad-diapo${diapo === s.si ? ' is-pertinente' : ''}" aria-live="polite">
          <h4>${esc(sec.titre)}</h4>
          ${titreRub ? `<p class="ad-rub">${esc(titreRub)}</p>` : ''}
          ${blocs.map(b => `<p class="ad-extrait">${esc(b)}</p>`).join('')}
          <a class="ad-lien" href="${esc(fiche.url)}#${esc(ancre)}" target="_blank" rel="noopener">Lire cette section dans la fiche ↗</a>
        </article>
        <div class="ad-points">${fiche.sections.map((x, i) => `<button type="button" data-diapo="${i}" aria-label="${esc(x.titre)}"${i === diapo ? ' aria-current="true"' : ''}${i === s.si ? ' class="is-pertinente"' : ''}></button>`).join('')}</div>
      </div>
      <a class="btn btn-ink btn-sm ad-complete" href="${esc(fiche.url)}" target="_blank" rel="noopener">Consulter la fiche complète ↗</a>
      ${autres.length ? `<p class="ad-autres-t">${choix === 0 ? 'Voir aussi' : 'Autres suggestions'}</p>
      <ul class="ad-autres">${autres.map(({ x, i }) => `<li><button type="button" data-choix="${i}">
        <b>${esc(x.fiche === s.fiche ? x.sectionTitre : x.ficheTitre)}</b>
        <small>${esc(x.fiche === s.fiche ? (x.rubriqueTitre || 'Section de cette fiche') : x.sectionTitre)}</small></button></li>`).join('')}</ul>` : ''}`;
  }

  /* ---------- Interactions du panneau ---------- */
  // à la souris, les boutons du panneau ne prennent pas le focus : curseur et sélection de l'éditeur restent en place
  panneau.addEventListener('mousedown', e => {
    if (document.activeElement === editeur && e.target.closest('button, a')) e.preventDefault();
  });
  panneau.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b || !panneau.contains(b)) return;
    if (b.classList.contains('ad-prec')) { diapo = Math.max(0, diapo - 1); rendre(); }
    else if (b.classList.contains('ad-suiv')) { diapo += 1; rendre(); }
    else if (b.dataset.diapo) { diapo = +b.dataset.diapo; rendre(); }
    else if (b.dataset.choix) { choix = +b.dataset.choix; diapo = res.suggestions[choix].si; rendre(); }
    else if (b.classList.contains('ad-rail-btn')) {
      if (panneau.dataset.etat === 'ouvert') return;
      etat('ouvert');
      replieManuel = '';
      if (!prefs.off) { dernierTexte = null; analyser(); }
    } else if (b.id === 'ad-replier') {
      etat('replie');
      replieManuel = res && res.suggestions[0] ? res.suggestions[0].fiche : '';
      if (mobile() && boutonMobile && !boutonMobile.hidden) boutonMobile.focus();
    } else if (b.id === 'ad-epingle') {
      prefs.epingle = !prefs.epingle;
      garder();
      majReglages();
    }
  });
  panneau.addEventListener('keydown', e => {
    if (!e.target.closest('.ad-carrousel') || !res || !res.suggestions.length) return;
    const nb = moteur.fiche(res.suggestions[choix].fiche).sections.length;
    if (e.key === 'ArrowLeft' && diapo > 0) { diapo -= 1; rendre(); panneau.querySelector('.ad-prec').focus(); }
    if (e.key === 'ArrowRight' && diapo < nb - 1) { diapo += 1; rendre(); panneau.querySelector('.ad-suiv').focus(); }
    if (e.key === 'Escape') { etat('replie'); editeur.focus(); }
  });
  $('#ad-actif').addEventListener('change', e => {
    prefs.off = !e.target.checked;
    garder();
    majReglages();
    if (prefs.off) {
      clearTimeout(minuteur);
      res = null; signature = ''; dernierTexte = null;
      contenu.innerHTML = '<p class="ad-vide">Assistant désactivé : rien n\'est analysé. Cochez la case pour le réactiver.</p>';
      badgeRail.hidden = true;
      if (boutonMobile) boutonMobile.hidden = true;
    } else analyser();
  });
  if (boutonMobile) boutonMobile.addEventListener('click', () => {
    if (panneau.dataset.etat === 'ouvert') { etat('replie'); return; }
    etat('ouvert');
    const t = panneau.querySelector('.ad-tete');
    if (t) t.scrollIntoView({ block: 'nearest' });
  });

  /* ---------- Écoute de l'éditeur (lecture seule) ---------- */
  editeur.addEventListener('input', planifier);
  editeur.addEventListener('focus', () => { if (!prefs.off) charger(); }, { once: true });
  setInterval(() => {
    if (!prefs.off && !document.hidden && editeur.value !== dernierTexte && (moteur || editeur.value.trim())) planifier();
  }, 1500);

  majReglages();
  etat(prefs.off || mobile() || !prefs.epingle ? 'replie' : 'ouvert');
  if (prefs.off) contenu.innerHTML = '<p class="ad-vide">Assistant désactivé : rien n\'est analysé. Cochez la case pour le réactiver.</p>';
  else if (editeur.value.trim()) planifier();
})();
