/* =========================================================
   RadiologicHub — Dictée vocale : INTERFACE (page Comptes rendus)
   ---------------------------------------------------------
   • micro global (éditeur), micro par section / sous-titre (barre au-dessus
     de l'éditeur), micro sur le champ [ … ] sélectionné, micro sur les autres
     zones de texte marquées data-dictee ;
   • texte intermédiaire en bulle, texte final inséré au curseur (une étape
     d'historique par segment : « ↶ Retour » l'annule) ; le texte reste
     modifiable au clavier à tout moment ;
   • commandes vocales, insertion de modèles / phrases avec confirmation
     vocale (« remplacer », « insérer », « annuler »), alerte identité ;
   • raccourcis configurables (F9 / Échap par défaut, pédale USB possible).
   Dépend de : dictee/corrections.js, traitement.js, moteurs.js, window.RHEditor (cr.js).
   ========================================================= */

(() => {
  const RH = window.RHDictee || {};
  const T = RH.traitement, M = RH.moteurs, ED = window.RHEditor;
  const bar = document.getElementById('dt-bar');
  if (!T || !M || !ED || !ED.el || !bar) return;

  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const MIC = '<svg class="dt-svg" viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M6 11a6 6 0 0 0 12 0M12 17v4M9 21h6" fill="none"/></svg>';
  const editor = ED.el;

  /* ---------- Réglages (mémorisés dans le navigateur) ---------- */
  const KEY = 'rh-dictee';
  const DEFAUT = {
    moteur: M.defaut,
    toucheBasculer: { key: 'F9', ctrl: false, alt: false, shift: false, meta: false },
    toucheArreter: { key: 'Escape', ctrl: false, alt: false, shift: false, meta: false },
  };
  const lire = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { return {}; } };
  let reglages = { ...DEFAUT, ...lire() };
  const sauver = () => { try { localStorage.setItem(KEY, JSON.stringify(reglages)); } catch (e) { /* stockage indisponible */ } };
  const NOMS = { Escape: 'Échap', ' ': 'Espace', Enter: 'Entrée', Tab: 'Tab', Backspace: 'Retour arrière', Delete: 'Suppr', ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', Insert: 'Inser', Home: 'Début', End: 'Fin', PageUp: 'Page ↑', PageDown: 'Page ↓' };
  const nomTouche = t => [t.ctrl && 'Ctrl', t.alt && 'Alt', t.shift && 'Maj', t.meta && '⌘', NOMS[t.key] || (t.key.length === 1 ? t.key.toUpperCase() : t.key)].filter(Boolean).join(' + ');
  const toucheDe = e => ({ key: e.key, ctrl: e.ctrlKey, alt: e.altKey, shift: e.shiftKey, meta: e.metaKey });
  const correspond = (e, t) => !!t && (e.key === t.key || (e.key.length === 1 && e.key.toLowerCase() === String(t.key).toLowerCase()))
    && e.ctrlKey === !!t.ctrl && e.altKey === !!t.alt && e.shiftKey === !!t.shift && e.metaKey === !!t.meta;
  const moteur = () => M.get(reglages.moteur);

  /* ---------- Messages ---------- */
  const msgEl = $('#dt-msg');
  let msgTimer;
  const message = (m, warn = false, ms = 6000) => {
    msgEl.textContent = m;
    msgEl.classList.toggle('is-warn', warn);
    clearTimeout(msgTimer);
    if (ms) msgTimer = setTimeout(() => { msgEl.textContent = ''; }, ms);
  };

  /* ---------- État de la dictée ---------- */
  let session = null, actif = false, cible = { type: 'editeur' }, attente = null, debut = 0, chrono = null;
  const micBtn = $('#dt-mic'), recEl = $('#dt-rec'), tempsEl = $('#dt-temps'), liveEl = $('#dt-live');
  const bulle = $('#dt-bulle'), champBtn = $('#dt-champ');

  const majInterface = () => {
    bar.classList.toggle('is-rec', actif);
    micBtn.classList.toggle('is-on', actif);
    micBtn.setAttribute('aria-pressed', actif);
    $('.dt-lab', micBtn).textContent = actif ? 'Arrêter' : 'Dicter';
    recEl.hidden = !actif;
    editor.classList.toggle('is-dictating', actif && cible.type === 'editeur');
    $$('.dt-zone-on').forEach(el => el.classList.remove('dt-zone-on'));
    $$('.dt-mini.is-on').forEach(b => b.classList.remove('is-on'));
    if (actif && cible.type === 'zone') {
      cible.el.classList.add('dt-zone-on');
      const b = cible.el.parentElement && $('.dt-mini', cible.el.parentElement);
      if (b) b.classList.add('is-on');
    }
    document.title = (actif ? '● ' : '') + document.title.replace(/^● /, '');
    if (!actif) { liveEl.textContent = ''; bulle.hidden = true; }
    majChamp();
  };
  const tick = () => {
    const s = Math.floor((Date.now() - debut) / 1000);
    tempsEl.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  };

  function demarrer(nouvelleCible) {
    const mo = moteur();
    if (!mo.disponible()) {
      const ko = $('#dt-unsupported');
      ko.hidden = false;
      ko.textContent = mo.raison();
      ko.classList.remove('is-flash');
      void ko.offsetWidth;                                   // relance l'animation
      ko.classList.add('is-flash');
      return;
    }
    if (nouvelleCible) cible = nouvelleCible;
    if (actif) { majInterface(); return; }                 // déjà en cours : on change seulement de cible
    session = mo.creer({ langue: 'fr-FR', surIntermediaire, surFinal, surEtat, surErreur });
    actif = true;
    debut = Date.now();
    tick();
    clearInterval(chrono);
    chrono = setInterval(tick, 1000);
    majInterface();
    try { session.demarrer(); } catch (err) { surErreur({ fatale: true, message: 'Impossible de démarrer la dictée dans ce navigateur.' }); }
  }
  function arreter() {
    if (session) session.arreter();
    actif = false;
    clearInterval(chrono);
    majInterface();
  }
  const basculer = c => (actif ? arreter() : demarrer(c));

  function surEtat(etat) {
    if (etat === 'arret' && actif) { actif = false; clearInterval(chrono); majInterface(); }
  }
  function surErreur(err) {
    message(err.message, true, 10000);
    if (err.fatale) arreter();
  }

  /* ---------- Texte intermédiaire : bulle près du curseur ---------- */
  function surIntermediaire(t) {
    liveEl.textContent = t ? `« ${t} »` : '';
    if (!t || cible.type !== 'editeur') { bulle.hidden = true; return; }
    const a = ED.ancre(editor.selectionEnd);
    bulle.textContent = t;
    bulle.hidden = false;
    const wrap = editor.parentElement.getBoundingClientRect();
    bulle.style.top = `${Math.min(a.bottom, editor.offsetTop + editor.clientHeight) + 6}px`;
    bulle.style.left = `${Math.max(8, Math.min(a.left - 12, wrap.width - bulle.offsetWidth - 8))}px`;
  }

  /* ---------- Texte final : commandes, corrections, insertion ---------- */
  function surFinal(t) {
    liveEl.textContent = '';
    bulle.hidden = true;
    if (attente) { repondre(t); return; }
    const acts = T.analyser(t);
    let groupe = [];
    const vider = () => { if (groupe.length) inserer(groupe); groupe = []; };
    for (const a of acts) {
      if (T.INSERTION.has(a.type)) { groupe.push(a); continue; }
      vider();
      if (a.type === 'effacerMot') effacerMot();
      else if (a.type === 'aller') allerA(a.cible);
      else if (a.type === 'modele') insererModele(a);
      else if (a.type === 'stop') { arreter(); message('Dictée arrêtée.'); }
    }
    vider();
    verifierIdentite(t);
  }

  const zoneValide = () => cible.type !== 'zone' || (cible.el && cible.el.isConnected);
  function inserer(actions) {
    if (!zoneValide()) { arreter(); message('Le champ dicté a disparu : dictée arrêtée.', true); return; }
    if (cible.type === 'editeur') {
      const s = editor.selectionStart, e = editor.selectionEnd;
      const r = T.assembler(actions, editor.value.slice(0, s));
      if (r.texte || r.retirer) ED.remplacer(s - r.retirer, e, r.texte);
      return;
    }
    const el = cible.el, s = el.selectionStart ?? el.value.length, e = el.selectionEnd ?? s;
    const r = T.assembler(actions, el.value.slice(0, s));
    const texte = el.tagName === 'INPUT' ? r.texte.replace(/\s*\n\s*/g, ' ') : r.texte;
    el.setRangeText(texte, Math.max(0, s - r.retirer), e, 'end');
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function effacerMot() {
    if (!zoneValide()) return;
    const el = cible.type === 'editeur' ? editor : cible.el;
    const s = el.selectionStart ?? el.value.length;
    const i = T.debutDernierMot(el.value.slice(0, s));
    if (i === s) return;
    if (cible.type === 'editeur') ED.remplacer(i, s, '');
    else { el.setRangeText('', i, s, 'end'); el.dispatchEvent(new Event('input', { bubbles: true })); }
  }

  /* ---------- « conclusion », « aller à foie » ---------- */
  const estConclusion = nom => /^(?:(?:la|en) )?conclusions?$|^au total$/.test(T.norm(nom).replace(/[.!?]/g, '').trim());
  function allerA(nom, { muet = false } = {}) {
    cible = { type: 'editeur' };
    const texte = editor.value, liste = T.sections(texte);
    const s = T.trouverSection(liste, nom);
    if (!s) {
      if (estConclusion(nom)) {
        const v = texte.replace(/\s+$/, '');
        ED.remplacer(v.length, texte.length, `${v ? '\n\n' : ''}CONCLUSION :\n`);
        if (!muet) message('Section CONCLUSION créée à la fin du compte rendu.');
        majInterface();
        return true;
      }
      message(`Section ou sous-titre « ${nom} » introuvable dans le compte rendu.`, true);
      return false;
    }
    const c = T.cibleSection(texte, s, liste);
    if (c.inserer) ED.remplacer(c.debut, c.fin, c.inserer);
    else ED.placer(c.debut, c.fin);
    if (!muet) message(`Curseur : ${s.titre}`);
    majInterface();
    return true;
  }

  /* ---------- « insérer modèle … » / « insérer la phrase … » ---------- */
  const libelle = it => `${it.titre}${it.type === 'phrase' && it.mod ? ` (${it.mod})` : ''}`;
  function insererModele(a) {
    if (cible.type !== 'editeur') { message('« Insérer modèle » fonctionne dans le compte rendu.', true); return; }
    const items = [...(a.genre === 'phrase' ? [] : ED.modeles()), ...ED.phrases()];
    const r = T.choisir(a.nom, items);
    if (r.trouve) { appliquer(r.trouve); return; }
    if (r.proches.length) {
      attente = { type: 'choix', items: r.proches.map(x => x.item) };
      afficherAttente();
      return;
    }
    message(`Aucun modèle ni phrase ne correspond à « ${a.nom} ».`, true);
  }
  function appliquer(item) {
    if (item.type === 'phrase') {
      ED.insererBloc(item.texte);
      message(`Phrase insérée : ${libelle(item)}`);
      return;
    }
    if (!editor.value.trim()) { ED.chargerModele(item.id); message(`Modèle chargé : ${item.titre}`); return; }
    attente = { type: 'confirmation', item };
    afficherAttente();
  }
  const confirmEl = $('#dt-confirm');
  function afficherAttente() {
    if (!attente) { confirmEl.hidden = true; confirmEl.innerHTML = ''; return; }
    if (attente.type === 'confirmation') {
      confirmEl.innerHTML = `<p><b>Modèle « ${esc(attente.item.titre)} »</b> — l'éditeur contient déjà du texte.</p>
        <div class="dt-confirm-btns">
          <button class="btn btn-ink btn-sm" type="button" data-rep="remplacer">Remplacer</button>
          <button class="btn btn-outline btn-sm" type="button" data-rep="inserer">Insérer au curseur</button>
          <button class="btn btn-outline btn-sm" type="button" data-rep="annuler">Annuler</button>
        </div>
        <p class="dt-confirm-hint">${actif ? 'Dites « remplacer », « insérer » ou « annuler ».' : 'Ou dictez « remplacer », « insérer » ou « annuler ».'}</p>`;
    } else {
      confirmEl.innerHTML = `<p><b>Plusieurs résultats proches :</b> lequel ?</p>
        <div class="dt-confirm-btns">${attente.items.map((it, i) => `<button class="btn btn-outline btn-sm" type="button" data-rep="${i + 1}">${i + 1} · ${esc(libelle(it))}</button>`).join('')}
          <button class="btn btn-outline btn-sm" type="button" data-rep="annuler">Annuler</button></div>
        <p class="dt-confirm-hint">Dites « un », « deux »… ou « annuler ».</p>`;
    }
    confirmEl.hidden = false;
  }
  function resoudre(rep) {
    const a = attente;
    if (!a || rep == null) return false;
    attente = null;
    afficherAttente();
    if (rep === 'annuler') { message('Insertion annulée.'); return true; }
    if (a.type === 'confirmation') {
      if (rep === 'remplacer') { ED.chargerModele(a.item.id); message(`Modèle chargé : ${a.item.titre}`); }
      else { ED.insererBloc(a.item.texte); message(`Modèle inséré au curseur : ${a.item.titre}`); }
      return true;
    }
    const it = a.items[rep - 1];
    if (it) appliquer(it); else { attente = a; afficherAttente(); }
    return true;
  }
  function repondre(t) {
    const rep = T.reponse(t, attente.type);
    if (!resoudre(rep)) message(attente.type === 'confirmation' ? 'Dites « remplacer », « insérer » ou « annuler ».' : 'Dites « un », « deux »… ou « annuler ».', true);
  }
  confirmEl.addEventListener('click', e => {
    const b = e.target.closest('[data-rep]');
    if (!b) return;
    const v = b.dataset.rep;
    resoudre(/^\d+$/.test(v) ? +v : v);
  });

  /* ---------- Alerte identité ---------- */
  const alerteEl = $('#dt-alerte');
  function verifierIdentite(t) {
    const r = T.identite(t);
    if (!r.length) return;
    const extrait = r[0].texte;
    alerteEl.innerHTML = `<p>⚠ <b>Identité possible dictée</b> : « ${esc(extrait)} ». Ne dictez pas d'identité patient : retirez-la du compte rendu.</p>
      <div class="dt-confirm-btns"><button class="btn btn-outline btn-sm" type="button" data-al="voir">Voir le texte</button><button class="btn btn-outline btn-sm" type="button" data-al="ok">J'ai compris</button></div>`;
    alerteEl.hidden = false;
    alerteEl.dataset.extrait = extrait;
  }
  alerteEl.addEventListener('click', e => {
    const b = e.target.closest('[data-al]');
    if (!b) return;
    if (b.dataset.al === 'voir') {
      const el = cible.type === 'zone' && zoneValide() ? cible.el : editor;
      const i = el.value.toLowerCase().lastIndexOf(alerteEl.dataset.extrait.toLowerCase());
      if (i >= 0) {
        if (el === editor) ED.placer(i, i + alerteEl.dataset.extrait.length);
        else { el.focus(); el.setSelectionRange(i, i + alerteEl.dataset.extrait.length); }
      }
    }
    alerteEl.hidden = true;
  });

  /* ---------- Barre des sections et sous-titres ---------- */
  const secBox = $('#dt-sections');
  let secTimer, secListe = [];
  const majSections = () => {
    clearTimeout(secTimer);
    secTimer = setTimeout(() => {
      secListe = T.sections(editor.value);
      const sig = secListe.map(s => s.niveau + s.titre).join('|');
      if (secBox.dataset.sig === sig) return;
      secBox.dataset.sig = sig;
      secBox.hidden = !secListe.length;
      secBox.innerHTML = secListe.length ? `<span class="dt-sec-label">Dicter dans :</span>${secListe.map((s, i) =>
        `<button class="dt-sec dt-sec-${s.niveau}" type="button" data-sec="${i}" title="Placer le curseur ${s.niveau === 'sous' ? 'après' : 'dans'} « ${esc(s.titre)} » et dicter">${MIC}${esc(s.titre)}</button>`).join('')}` : '';
    }, 150);
  };
  secBox.addEventListener('click', e => {
    const b = e.target.closest('[data-sec]');
    if (!b) return;
    const s = secListe[+b.dataset.sec];
    if (!s) return;
    const liste = T.sections(editor.value);
    const actuel = liste.find(x => x.titre === s.titre && x.niveau === s.niveau) || s;
    const c = T.cibleSection(editor.value, actuel, liste);
    if (c.inserer) ED.remplacer(c.debut, c.fin, c.inserer); else ED.placer(c.debut, c.fin);
    demarrer({ type: 'editeur' });
  });

  /* ---------- Micro du champ [ … ] sélectionné ---------- */
  const champSelectionne = () => {
    const s = editor.selectionStart, e = editor.selectionEnd;
    return e > s && /^\[[^[\]\n]*\]$/.test(editor.value.slice(s, e));
  };
  function majChamp() {
    if (actif || document.activeElement !== editor || !champSelectionne()) { champBtn.hidden = true; return; }
    const a = ED.ancre(editor.selectionEnd);
    if (!a.visible) { champBtn.hidden = true; return; }
    champBtn.hidden = false;
    const wrapW = editor.parentElement.clientWidth;
    champBtn.style.left = `${Math.max(8, Math.min(a.left - 20, wrapW - champBtn.offsetWidth - 8))}px`;
    champBtn.style.top = `${a.top > 36 ? a.top - 34 : a.bottom + 4}px`;
  }
  ['select', 'keyup', 'mouseup', 'focus', 'cr:change', 'scroll'].forEach(ev => editor.addEventListener(ev, () => setTimeout(majChamp, 0)));
  editor.addEventListener('blur', () => setTimeout(() => { if (document.activeElement !== champBtn) champBtn.hidden = true; }, 150));
  champBtn.addEventListener('mousedown', e => e.preventDefault());       // garde la sélection du champ
  champBtn.addEventListener('click', () => demarrer({ type: 'editeur' }));
  editor.addEventListener('input', majSections);
  editor.addEventListener('cr:change', majSections);

  /* ---------- Autres zones de texte : data-dictee ---------- */
  const decorer = el => {
    if (el.dataset.dicteeOk || !el.parentElement) return;
    el.dataset.dicteeOk = '1';
    el.parentElement.classList.add('dt-host');
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'dt-mini';
    b.title = 'Dicter dans ce champ';
    b.setAttribute('aria-label', 'Dicter dans ce champ');
    b.innerHTML = MIC;
    b.classList.toggle('is-ko', !moteur().disponible());
    b.addEventListener('mousedown', e => e.preventDefault());
    b.addEventListener('click', e => {
      e.preventDefault();
      if (actif && cible.type === 'zone' && cible.el === el) { arreter(); return; }
      el.focus();
      demarrer({ type: 'zone', el });
    });
    el.insertAdjacentElement('afterend', b);
  };
  $$('[data-dictee]').forEach(decorer);
  new MutationObserver(muts => muts.forEach(m => m.addedNodes.forEach(n => {
    if (n.nodeType !== 1) return;
    if (n.matches('[data-dictee]')) decorer(n);
    $$('[data-dictee]', n).forEach(decorer);
  }))).observe(document.body, { childList: true, subtree: true });

  /* ---------- Bouton global, raccourcis ---------- */
  micBtn.addEventListener('click', () => basculer({ type: 'editeur' }));
  let capture = null;
  window.addEventListener('keydown', e => {
    if (capture) {
      if (['Shift', 'Control', 'Alt', 'Meta', 'AltGraph'].includes(e.key)) return;
      e.preventDefault();
      e.stopPropagation();
      if (!(e.key === 'Escape' && capture.dataset.touche === 'toucheBasculer')) {
        reglages[capture.dataset.touche] = toucheDe(e);
        sauver();
      }
      capture.classList.remove('is-capture');
      capture = null;
      majReglages();
      return;
    }
    if (correspond(e, reglages.toucheBasculer)) {
      e.preventDefault();
      const a = document.activeElement;
      basculer(a && a.matches && a.matches('[data-dictee]') ? { type: 'zone', el: a } : { type: 'editeur' });
      return;
    }
    if (correspond(e, reglages.toucheArreter)) {
      if (actif) arreter();
      if (attente) resoudre('annuler');
    }
  }, true);

  /* ---------- Panneaux : aide et réglages ---------- */
  const panneau = (btnId, panelId) => {
    const btn = $(btnId), panel = $(panelId);
    btn.addEventListener('click', () => {
      const ouvrir = panel.hidden;
      $$('.dt-panel').forEach(p => { p.hidden = true; });
      $$('.dt-icon-btn').forEach(b => b.setAttribute('aria-expanded', 'false'));
      panel.hidden = !ouvrir;
      btn.setAttribute('aria-expanded', ouvrir);
    });
  };
  panneau('#dt-aide-btn', '#dt-aide');
  panneau('#dt-reglages-btn', '#dt-reglages');
  const moteurSel = $('#dt-moteur');
  moteurSel.innerHTML = M.liste().map(m => `<option value="${m.id}"${m.disponible() ? '' : ' disabled'}>${esc(m.nom)}${m.disponible() ? '' : ' — indisponible'}</option>`).join('');
  moteurSel.addEventListener('change', () => {
    if (actif) arreter();
    reglages.moteur = moteurSel.value;
    sauver();
    majReglages();
  });
  $$('.dt-key').forEach(b => b.addEventListener('click', () => {
    if (capture) capture.classList.remove('is-capture');
    capture = b;
    b.classList.add('is-capture');
    b.textContent = 'Appuyez sur une touche…';
  }));
  $('#dt-reset').addEventListener('click', () => { reglages = { ...DEFAUT }; sauver(); majReglages(); message('Réglages de la dictée par défaut.'); });

  function majReglages() {
    $$('.dt-key').forEach(b => { if (b !== capture) b.textContent = nomTouche(reglages[b.dataset.touche]); });
    $('#dt-kbd').textContent = nomTouche(reglages.toucheBasculer);
    micBtn.title = `Démarrer / arrêter la dictée (${nomTouche(reglages.toucheBasculer)} ; ${nomTouche(reglages.toucheArreter)} pour arrêter)`;
    const mo = moteur();
    moteurSel.value = mo.id;
    const ok = mo.disponible();
    const ko = $('#dt-unsupported');
    ko.hidden = ok;
    ko.textContent = ok ? '' : mo.raison();
    $('#dt-warn').textContent = mo.local
      ? 'Transcription locale : l\'audio ne quitte pas ce poste. Évitez tout de même de dicter l\'identité du patient.'
      : 'La dictée passe par le service du navigateur : ne dictez pas d\'identité patient.';
    [micBtn, champBtn, ...$$('.dt-mini')].forEach(b => b.classList.toggle('is-ko', !ok));
  }

  majReglages();
  majSections();
})();
