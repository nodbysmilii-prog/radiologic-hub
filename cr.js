/* =========================================================
   RadiologicHub — comptes rendus types
   Éditeur, phrases automatiques (mot-clé → description),
   champs [ … ] navigables avec Tab, modèles et phrases personnels.
   Données : cr-data.js (CR_TEMPLATES, CR_PHRASES…)
   ========================================================= */

(() => {
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const editor = $('#cr-editor');
  if (!editor || typeof CR_TEMPLATES === 'undefined') return;

  /* ---------- Outils ---------- */
  const norm = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const cleanKey = s => norm(s).replace(/[^a-z0-9_-]/g, '');
  const FIELD = /\[[^\[\]\n]*\]/g;          // champ à compléter : [x], [droit / gauche]…
  const WORD_END = /[\p{L}\p{N}_-]+$/u;      // mot en cours de frappe
  const WORD_CHAR = /[\p{L}\p{N}_-]/u;

  /* Stockage dans le navigateur (peut être indisponible : navigation privée…) */
  const store = {
    get(key, fallback) {
      try { const v = localStorage.getItem(key); return v === null ? fallback : JSON.parse(v); } catch (e) { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
    },
  };
  const KEY = { draft: 'rh-cr-draft', auto: 'rh-cr-auto', phrases: 'rh-cr-phrases', templates: 'rh-cr-templates', email: 'rh-cr-email', mailer: 'rh-cr-mailer', modality: 'rh-cr-modality', attach: 'rh-cr-attach' };

  const isPhrase = p => p && typeof p.k === 'string' && typeof p.label === 'string' && typeof p.text === 'string';
  const isTemplate = t => t && typeof t.title === 'string' && typeof t.text === 'string';
  let myPhrases = store.get(KEY.phrases, []);
  let myTemplates = store.get(KEY.templates, []);
  myPhrases = Array.isArray(myPhrases) ? myPhrases.filter(isPhrase) : [];
  myTemplates = Array.isArray(myTemplates) ? myTemplates.filter(isTemplate) : [];

  const download = (blob, name) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  /* ---------- Phrases (mes phrases d'abord : elles sont proposées en premier) ---------- */
  let phrases = [];
  const buildPhrases = () => {
    phrases = [
      ...myPhrases.map((p, i) => ({ ...p, id: 'm' + i, type: 'perso', organ: p.organ || 'Mes phrases', mod: '' })),
      ...CR_PHRASES.map((p, i) => ({ ...p, id: 'b' + i })),
      // Mots-clés qui ouvrent les schémas et calculateurs (cr-tools.js)
      ...((window.RHTools && window.RHTools.entries) || []).map((t, i) => ({
        ...t, id: 't' + i, type: 'outil', organ: 'Schémas et calculateurs', mod: '',
        text: 'Ouvre l\'outil : schéma, score et texte prêt à insérer dans le compte rendu.',
      })),
    ].map(p => ({ ...p, keys: [p.k, ...(p.alias || [])].map(norm).filter(Boolean) }));
  };
  const phraseById = id => phrases.find(p => p.id === id);
  const findExact = word => { const t = norm(word); return phrases.find(p => p.keys.includes(t)); };
  const findMatches = word => {
    const t = norm(word);
    const exact = phrases.filter(p => p.keys.includes(t));
    const starts = t.length >= 4 ? phrases.filter(p => !exact.includes(p) && p.keys.some(k => k.startsWith(t))) : [];
    return [...exact, ...starts].slice(0, 8);
  };
  const typeK = p => (CR_TYPES[p.type] || CR_TYPES.perso).k;
  const keyChip = p => `<mark class="${typeK(p)}">${esc(p.k)}</mark>`;

  /* ---------- État, brouillon ---------- */
  const statusEl = $('#cr-status-text');
  let lastStatus = '';
  const fieldsIn = (from = 0, to = editor.value.length) =>
    [...editor.value.slice(from, to).matchAll(FIELD)].map(m => [from + m.index, from + m.index + m[0].length]);

  const updateStatus = () => {
    const n = fieldsIn().length;
    let html, cls = '';
    if (!editor.value.trim()) html = 'Choisissez un modèle ou commencez à écrire.';
    else if (n) { html = `${n} champ${n > 1 ? 's' : ''} <code>[ … ]</code> à compléter — <kbd>Tab</kbd> pour passer au suivant.`; cls = 'is-todo'; }
    else { html = 'Aucun champ à compléter ✓'; cls = 'is-ok'; }
    if (html === lastStatus) return;
    lastStatus = html;
    statusEl.innerHTML = html;
    statusEl.className = cls;
  };

  let saveTimer;
  const changed = () => {
    updateStatus();
    editor.dispatchEvent(new Event('cr:change'));
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => store.set(KEY.draft, editor.value), 300);
  };
  window.addEventListener('pagehide', () => store.set(KEY.draft, editor.value));

  const flashEl = $('#cr-flash');
  let flashTimer;
  const flash = (msg, warn = false) => {
    flashEl.textContent = msg;
    flashEl.classList.toggle('is-warn', warn);
    clearTimeout(flashTimer);
    flashTimer = setTimeout(() => { flashEl.textContent = ''; }, 5000);
  };

  /* ---------- Position du curseur (pour placer la bulle) ---------- */
  const mirror = document.createElement('div');
  mirror.className = 'cr-mirror';
  mirror.setAttribute('aria-hidden', 'true');
  document.body.appendChild(mirror);
  const MIRROR_PROPS = ['boxSizing', 'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth', 'borderStyle',
    'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'fontFamily', 'fontSize', 'fontWeight', 'fontStyle',
    'lineHeight', 'letterSpacing', 'wordSpacing', 'textTransform', 'textIndent', 'tabSize'];

  const caretCoords = pos => {
    const cs = getComputedStyle(editor);
    MIRROR_PROPS.forEach(p => { mirror.style[p] = cs[p]; });
    mirror.style.width = (editor.clientWidth + parseFloat(cs.borderLeftWidth) + parseFloat(cs.borderRightWidth)) + 'px';
    mirror.textContent = editor.value.slice(0, pos);
    const mark = document.createElement('span');
    mark.textContent = '​';
    mirror.appendChild(mark);
    const lh = parseFloat(cs.lineHeight) || mark.offsetHeight;
    const top = mark.offsetTop + parseFloat(cs.borderTopWidth) - editor.scrollTop - (lh - mark.offsetHeight) / 2;
    return { top, bottom: top + lh, left: mark.offsetLeft + parseFloat(cs.borderLeftWidth) - editor.scrollLeft };
  };

  /* Garde le curseur visible (dans l'éditeur et dans la page) */
  const revealCaret = () => {
    const c = caretCoords(editor.selectionStart);
    if (c.top < 0 || c.bottom > editor.clientHeight) editor.scrollTop += c.top - editor.clientHeight / 3;
    const y = editor.getBoundingClientRect().top + caretCoords(editor.selectionStart).top;
    const header = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || 76;
    if (y < header + 20 || y > window.innerHeight - 80) window.scrollBy({ top: y - window.innerHeight / 3, behavior: 'smooth' });
  };

  /* ---------- Historique : Retour / Rétablir (boutons, Ctrl + Z, Ctrl + Y) ----------
     Une étape par mot tapé (espace, Entrée ou pause d'une seconde),
     par phrase insérée, par modèle chargé, par collage. */
  let busy = false;
  const undoBtn = $('#cr-undo'), redoBtn = $('#cr-redo');
  const hist = { undo: [], redo: [], last: 0, kind: '' };
  const snapshot = () => ({ v: editor.value, s: editor.selectionStart, e: editor.selectionEnd });
  const syncHistory = () => {
    undoBtn.disabled = !hist.undo.length;
    redoBtn.disabled = !hist.redo.length;
  };
  const record = (kind = 'edit', newStep = true) => {
    const now = Date.now();
    const sameStep = !newStep && kind === hist.kind && now - hist.last < 1000;
    hist.last = now;
    hist.kind = kind;
    if (sameStep) return;
    hist.undo.push(snapshot());
    if (hist.undo.length > 300) hist.undo.shift();
    hist.redo = [];
    syncHistory();
  };
  const restore = snap => {
    busy = true;
    editor.value = snap.v;
    editor.focus({ preventScroll: true });
    editor.setSelectionRange(snap.s, snap.e);
    busy = false;
    hist.kind = '';
    closePop();
    changed();
    syncHistory();
    revealCaret();
  };
  const undo = () => {
    if (!hist.undo.length) return flash('Rien à annuler.');
    hist.redo.push(snapshot());
    restore(hist.undo.pop());
  };
  const redo = () => {
    if (!hist.redo.length) return flash('Rien à rétablir.');
    hist.undo.push(snapshot());
    restore(hist.redo.pop());
  };
  undoBtn.addEventListener('click', undo);
  redoBtn.addEventListener('click', redo);

  editor.addEventListener('beforeinput', e => {
    if (e.inputType === 'historyUndo' || e.inputType === 'historyRedo') {
      e.preventDefault();
      (e.inputType === 'historyUndo' ? undo : redo)();
      return;
    }
    if (busy) return;
    const kind = e.inputType.startsWith('delete') ? 'delete' : 'insert';
    const wordEnd = e.inputType === 'insertLineBreak' || e.inputType === 'insertParagraph' || /^\s$/.test(e.data || '');
    const block = /Paste|Drop|Cut|Replacement/.test(e.inputType);
    record(kind, wordEnd || block);
  });

  /* ---------- Insertion ---------- */
  const replaceRange = (start, end, text) => {
    record();
    busy = true;
    editor.focus({ preventScroll: true });
    editor.setRangeText(text, start, end, 'end');
    busy = false;
    changed();
  };

  const selectField = (from, to) => {
    const f = fieldsIn(from, to)[0];
    if (!f) return false;
    editor.setSelectionRange(f[0], f[1]);
    return true;
  };

  const nextField = () => {
    const all = fieldsIn();
    if (!all.length) return false;
    const pos = editor.selectionEnd;
    const f = all.find(([s]) => s >= pos) || all[0];
    editor.focus({ preventScroll: true });
    editor.setSelectionRange(f[0], f[1]);
    revealCaret();
    return true;
  };

  const insertPhrase = (p, start, end, prefix = '') => {
    if (p.tool) { // mot-clé d'un outil : on l'efface et on ouvre l'outil
      replaceRange(start, end, '');
      if (window.RHTools) window.RHTools.open(p.tool);
      return;
    }
    // Ligne déjà commencée par « • » : ne pas doubler la puce de la phrase
    const lineStart = editor.value.lastIndexOf('\n', start - 1) + 1;
    const onBullet = /^[ \t]*•[ \t]*$/.test(editor.value.slice(lineStart, start));
    const text = prefix + (onBullet && p.text.startsWith('• ') ? p.text.slice(2) : p.text);
    replaceRange(start, end, text);
    if (!selectField(start, start + text.length)) editor.setSelectionRange(start + text.length, start + text.length);
    revealCaret();
  };

  /* ---------- Bulle de suggestions ---------- */
  const pop = $('#cr-pop');
  const list = $('#cr-sug-list');
  const sug = { items: [], active: 0, token: null, engaged: false, dismissed: -1 };

  const closePop = () => {
    sug.items = [];
    sug.token = null;
    sug.engaged = false;
    if (pop.hidden) return;
    pop.hidden = true;
    editor.setAttribute('aria-expanded', 'false');
    editor.removeAttribute('aria-activedescendant');
  };

  const renderPop = () => {
    list.innerHTML = sug.items.map((p, i) => `
      <li class="cr-sug${i === sug.active ? ' is-active' : ''}" role="option" id="cr-sug-${i}" aria-selected="${i === sug.active}" data-i="${i}">
        <span class="cr-sug-head">${keyChip(p)} ${esc(p.label)}${p.mod ? ` <span class="cr-mod">${esc(p.mod)}</span>` : ''}</span>
        <span class="cr-sug-prev">${esc(p.text)}</span>
      </li>`).join('');
    editor.setAttribute('aria-activedescendant', 'cr-sug-' + sug.active);
    const act = list.children[sug.active];
    if (act) {
      if (act.offsetTop < list.scrollTop) list.scrollTop = act.offsetTop;
      else if (act.offsetTop + act.offsetHeight > list.scrollTop + list.clientHeight) list.scrollTop = act.offsetTop + act.offsetHeight - list.clientHeight;
    }
  };

  const placePop = pos => {
    const c = caretCoords(pos);
    const y = Math.min(Math.max(c.bottom, 0), editor.clientHeight);
    pop.style.top = (editor.offsetTop + y + 6) + 'px';
    const maxLeft = editor.offsetLeft + editor.offsetWidth - pop.offsetWidth;
    pop.style.left = Math.max(editor.offsetLeft, Math.min(editor.offsetLeft + c.left - 18, maxLeft)) + 'px';
  };

  const updateSuggestions = () => {
    const pos = editor.selectionStart;
    if (pos !== editor.selectionEnd || WORD_CHAR.test(editor.value.charAt(pos))) return closePop();
    const m = editor.value.slice(0, pos).match(WORD_END);
    if (!m) { sug.dismissed = -1; return closePop(); }
    const start = pos - m[0].length;
    if (start === sug.dismissed) return closePop();
    sug.dismissed = -1;
    const items = findMatches(m[0]);
    if (!items.length) return closePop();
    const sameWord = sug.token && sug.token.start === start;
    const prevId = sameWord && sug.items[sug.active] ? sug.items[sug.active].id : null;
    const keep = prevId ? items.findIndex(p => p.id === prevId) : -1;
    sug.items = items;
    sug.token = { start, end: pos };
    sug.active = keep >= 0 ? keep : 0;
    if (!sameWord) sug.engaged = false;
    pop.hidden = false;
    editor.setAttribute('aria-expanded', 'true');
    renderPop();
    placePop(start);
  };

  const accept = i => {
    const p = sug.items[i];
    const tok = sug.token;
    closePop();
    if (p && tok) insertPhrase(p, tok.start, tok.end);
  };

  /* Insertion automatique : mot-clé seul en début de ligne + espace / ponctuation / Entrée */
  const autoBox = $('#cr-auto');
  const autoExpand = () => {
    const pos = editor.selectionStart - 1; // juste avant le caractère tapé
    const m = editor.value.slice(0, pos).match(/(?:^|\n)[ \t]*(?:•[ \t]*)?([\p{L}\p{N}_-]+)$/u);
    if (!m) return false;
    const p = findExact(m[1]);
    if (!p) return false;
    closePop();
    insertPhrase(p, pos - m[1].length, pos);
    return true;
  };

  /* Entrée sur une ligne « • … » : nouvelle puce ; sur une puce vide : fin de la liste */
  const bulletEnter = () => {
    const pos = editor.selectionStart;
    if (pos !== editor.selectionEnd) return false;
    const v = editor.value;
    const lineStart = v.lastIndexOf('\n', pos - 1) + 1;
    const m = v.slice(lineStart, pos).match(/^([ \t]*•[ \t]+)(.*)$/);
    if (!m) return false;
    // en mode automatique, un mot-clé seul sur la ligne est d'abord remplacé (géré à la saisie)
    if (autoBox.checked && /^[\p{L}\p{N}_-]+$/u.test(m[2]) && findExact(m[2])) return false;
    closePop();
    const lineEnd = v.indexOf('\n', pos);
    const rest = v.slice(pos, lineEnd < 0 ? v.length : lineEnd);
    if (!m[2].trim() && !rest.trim()) replaceRange(lineStart, pos, '');
    else replaceRange(pos, pos, '\n' + m[1]);
    return true;
  };

  editor.addEventListener('input', e => {
    if (busy) return;
    changed();
    if (autoBox.checked && !e.isComposing && (e.inputType === 'insertText' || e.inputType === 'insertLineBreak')) {
      const ch = e.inputType === 'insertLineBreak' ? '\n' : e.data;
      if (ch && ch.length === 1 && /[\s.,;:]/.test(ch) && autoExpand()) return;
    }
    updateSuggestions();
  });

  editor.addEventListener('keydown', e => {
    if (e.isComposing) return;
    if ((e.ctrlKey || e.metaKey) && !e.altKey) {
      const k = e.key.toLowerCase();
      if (k === 'z' || k === 'y') {
        e.preventDefault();
        (k === 'y' || e.shiftKey ? redo : undo)();
        return;
      }
    }
    if (!pop.hidden && sug.items.length) {
      const n = sug.items.length;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        sug.engaged = true;
        sug.active = (sug.active + (e.key === 'ArrowDown' ? 1 : n - 1)) % n;
        renderPop();
        return;
      }
      if ((e.key === 'Tab' && !e.shiftKey) || (e.key === 'Enter' && sug.engaged)) {
        e.preventDefault();
        accept(sug.active);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        sug.dismissed = sug.token.start;
        closePop();
        return;
      }
      if (['ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown'].includes(e.key)) closePop();
    }
    if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey && bulletEnter()) {
      e.preventDefault();
      return;
    }
    // Tab : champ [ … ] suivant (s'il n'y en a plus, Tab quitte l'éditeur normalement)
    if (e.key === 'Tab' && !e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey && nextField()) e.preventDefault();
  });

  editor.addEventListener('mousedown', closePop);
  editor.addEventListener('blur', () => setTimeout(() => { if (document.activeElement !== editor) closePop(); }, 200));
  editor.addEventListener('scroll', () => { if (!pop.hidden && sug.token) placePop(sug.token.start); });
  window.addEventListener('resize', closePop);
  pop.addEventListener('mousedown', e => e.preventDefault()); // garde le focus dans l'éditeur
  list.addEventListener('click', e => {
    const li = e.target.closest('.cr-sug');
    if (li) accept(+li.dataset.i);
  });

  autoBox.checked = store.get(KEY.auto, false) === true;
  autoBox.addEventListener('change', () => {
    store.set(KEY.auto, autoBox.checked);
    flash(autoBox.checked
      ? 'Insertion automatique activée : un mot-clé tapé en début de ligne est remplacé dès l\'espace.'
      : 'Insertion automatique désactivée : Tab pour insérer une proposition.');
  });

  /* ---------- Bibliothèque : onglets ---------- */
  const showPanel = name => {
    $$('.cr-side-tab').forEach(t => {
      const on = t.id === 'tab-' + name;
      t.classList.toggle('is-active', on);
      t.setAttribute('aria-selected', on);
    });
    $('#panel-tpl').hidden = name !== 'tpl';
    $('#panel-phr').hidden = name !== 'phr';
  };
  $('#tab-tpl').addEventListener('click', () => showPanel('tpl'));
  $('#tab-phr').addEventListener('click', () => showPanel('phr'));

  /* ---------- Modèles : 1 · examen, 2 · spécialité ---------- */
  const tplMods = $('#tpl-mods');
  const tplFilters = $('#tpl-filters');
  const tplList = $('#tpl-list');
  const MODS = typeof CR_MODALITIES !== 'undefined' ? CR_MODALITIES : {};
  let modFilter = store.get(KEY.modality, 'all');
  if (modFilter !== 'all' && !MODS[modFilter]) modFilter = 'all';
  let tplFilter = 'all';
  let currentTpl = null;

  // Examen d'un modèle perso deviné d'après son titre (1re ligne)
  const guessMod = text => {
    const t = norm(String(text).trim().split('\n')[0]);
    if (/echo/.test(t)) return 'Écho';
    if (/\birm\b/.test(t)) return 'IRM';
    if (/tdm|scanner|tomodensit/.test(t)) return 'TDM';
    if (/radio/.test(t)) return 'Radio';
    return '';
  };
  const allTemplates = () => [...CR_TEMPLATES, ...myTemplates.map(t => ({ ...t, spe: 'perso', mine: true, mod: t.mod || guessMod(t.text) }))];
  // Un modèle perso sans examen reconnu reste visible quel que soit l'examen choisi
  const matchMod = t => modFilter === 'all' || t.mod === modFilter || (t.mine && !MODS[t.mod]);

  const renderTplMods = () => {
    const all = allTemplates();
    tplMods.innerHTML = Object.entries(MODS).map(([k, m]) => {
      const n = all.filter(t => t.mod === k || (t.mine && !MODS[t.mod])).length;
      return `<button type="button" class="cr-mod-btn" data-mod="${esc(k)}" aria-pressed="${k === modFilter}"${n ? '' : ' disabled'}>${esc(m.label)}<span class="cr-mod-count">${n}</span></button>`;
    }).join('') + `<button type="button" class="cr-mod-btn is-all" data-mod="all" aria-pressed="${modFilter === 'all'}">Tous les examens · ${all.length}</button>`;
  };

  const renderTplFilters = () => {
    renderTplMods();
    const pool = allTemplates().filter(matchMod);
    const spes = ['all', ...Object.keys(CR_SPECIALTIES).filter(s => pool.some(t => t.spe === s) || (s === 'perso' && modFilter === 'all'))];
    if (!spes.includes(tplFilter)) tplFilter = 'all';
    tplFilters.innerHTML = spes.map(s => {
      const sp = CR_SPECIALTIES[s];
      return `<button type="button" class="cr-chip" data-spe="${s}" aria-pressed="${s === tplFilter}"${sp ? ` style="--c: ${sp.c}"` : ''}>${s === 'all' ? 'Tous' : esc(sp.label)}</button>`;
    }).join('');
  };

  const renderTplList = () => {
    const items = allTemplates().filter(t => matchMod(t) && (tplFilter === 'all' || t.spe === tplFilter));
    tplList.innerHTML = items.map(t => {
      const sp = CR_SPECIALTIES[t.spe] || CR_SPECIALTIES.perso;
      return `<li class="cr-tpl${t.mine ? ' is-mine' : ''}">
        <button type="button" class="cr-tpl-btn" data-id="${esc(t.id)}" style="--c: ${sp.c}" aria-current="${t.id === currentTpl}">
          <span class="cr-tpl-meta">${esc(sp.label)}${MODS[t.mod] ? ` <span class="cr-mod">${esc(t.mod)}</span>` : ''}</span>
          <span class="cr-tpl-title">${esc(t.title)}</span>
        </button>
        ${t.mine ? `<button type="button" class="cr-del" data-del="${esc(t.id)}" title="Supprimer ce modèle" aria-label="Supprimer le modèle ${esc(t.title)}">✕</button>` : ''}
      </li>`;
    }).join('');
    $('#tpl-empty').hidden = !(tplFilter === 'perso' && !items.length);
  };

  const loadTemplate = (id, ask = true) => {
    const t = allTemplates().find(x => x.id === id);
    if (!t) return false;
    const cur = editor.value.trim();
    if (ask && cur && cur !== t.text.trim() && !confirm(`Remplacer le texte de l'éditeur par le modèle « ${t.title} » ?`)) return false;
    closePop();
    replaceRange(0, editor.value.length, t.text);
    editor.scrollTop = 0;
    if (!selectField(0, t.text.length)) editor.setSelectionRange(0, 0);
    currentTpl = id;
    renderTplList();
    if (window.matchMedia('(max-width: 1000px)').matches) editor.scrollIntoView({ behavior: 'smooth', block: 'start' });
    flash(`Modèle chargé : ${t.title}`);
    return true;
  };

  tplMods.addEventListener('click', e => {
    const b = e.target.closest('[data-mod]');
    if (!b || b.disabled) return;
    modFilter = b.dataset.mod;
    store.set(KEY.modality, modFilter);
    renderTplFilters();
    renderTplList();
  });
  tplFilters.addEventListener('click', e => {
    const b = e.target.closest('[data-spe]');
    if (!b) return;
    tplFilter = b.dataset.spe;
    renderTplFilters();
    renderTplList();
  });
  tplList.addEventListener('click', e => {
    const del = e.target.closest('[data-del]');
    if (del) {
      const t = myTemplates.find(x => x.id === del.dataset.del);
      if (t && confirm(`Supprimer le modèle « ${t.title} » ?`)) {
        myTemplates = myTemplates.filter(x => x !== t);
        store.set(KEY.templates, myTemplates);
        renderTplFilters();
        renderTplList();
      }
      return;
    }
    const b = e.target.closest('.cr-tpl-btn');
    if (b) loadTemplate(b.dataset.id);
  });

  /* ---------- Phrases (bibliothèque) ---------- */
  const phrSearch = $('#phr-search');
  const phrFilters = $('#phr-filters');
  const phrList = $('#phr-list');
  let phrType = 'all';

  const renderPhrFilters = () => {
    const types = ['all', ...Object.keys(CR_TYPES).filter(t => t !== 'outil' && phrases.some(p => p.type === t))];
    if (!types.includes(phrType)) phrType = 'all';
    phrFilters.innerHTML = types.map(t =>
      `<button type="button" class="cr-chip" data-type="${t}" aria-pressed="${t === phrType}"${t !== 'all' ? ` style="--c: var(--${CR_TYPES[t].k})"` : ''}>${t === 'all' ? 'Tous' : esc(CR_TYPES[t].label)}</button>`
    ).join('');
  };

  const renderPhrList = () => {
    const q = norm(phrSearch.value.trim());
    const items = phrases.filter(p => p.type !== 'outil' && (phrType === 'all' || p.type === phrType)
      && (!q || norm([p.k, ...(p.alias || []), p.label, p.organ, p.mod, p.text].join(' ')).includes(q)));
    const groups = new Map();
    items.forEach(p => {
      const g = p.organ || 'Autres';
      if (!groups.has(g)) groups.set(g, []);
      groups.get(g).push(p);
    });
    phrList.innerHTML = [...groups].map(([g, ps]) => `
      <div class="cr-group">
        <h3 class="cr-group-title">${esc(g)}</h3>
        <ul class="cr-ph-list">${ps.map(p => `
          <li><button type="button" class="cr-ph" data-id="${p.id}" title="Insérer : ${esc(p.label)}">
            <span class="cr-ph-head">${keyChip(p)}${p.mod ? `<span class="cr-mod">${esc(p.mod)}</span>` : ''}</span>
            <span class="cr-ph-label">${esc(p.label)}</span>
            <span class="cr-ph-prev">${esc(p.text)}</span>
          </button></li>`).join('')}
        </ul>
      </div>`).join('');
    $('#phr-empty').hidden = items.length > 0;
  };

  phrSearch.addEventListener('input', renderPhrList);
  phrFilters.addEventListener('click', e => {
    const b = e.target.closest('[data-type]');
    if (!b) return;
    phrType = b.dataset.type;
    renderPhrFilters();
    renderPhrList();
  });
  phrList.addEventListener('click', e => {
    const b = e.target.closest('.cr-ph');
    const p = b && phraseById(b.dataset.id);
    if (!p) return;
    const s = editor.selectionStart, end = editor.selectionEnd;
    const prev = editor.value.charAt(s - 1);
    insertPhrase(p, s, end, s > 0 && prev && !/\s/.test(prev) ? ' ' : '');
  });

  /* ---------- Barre d'outils ---------- */
  const isEmpty = () => {
    if (editor.value.trim()) return false;
    flash('Le compte rendu est vide.', true);
    return true;
  };

  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(editor.value);
      return true;
    } catch (e) {
      const s = editor.selectionStart, end = editor.selectionEnd;
      editor.focus();
      editor.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch (err) { ok = false; }
      editor.setSelectionRange(s, end);
      return ok;
    }
  };

  $('#cr-copy').addEventListener('click', async () => {
    if (isEmpty()) return;
    const ok = await copyText();
    const n = fieldsIn().length;
    if (!ok) flash('Copie impossible : sélectionnez le texte puis Ctrl + C.', true);
    else if (n) flash(`Copié — attention : ${n} champ${n > 1 ? 's' : ''} [ … ] ${n > 1 ? 'restent' : 'reste'} à compléter.`, true);
    else flash('Compte rendu copié ✓ — collez-le dans votre logiciel (Ctrl + V).');
  });

  $('#cr-next').addEventListener('click', () => {
    if (!nextField()) flash('Aucun champ [ … ] à compléter.');
  });

  $('#cr-download').addEventListener('click', () => {
    if (isEmpty()) return;
    download(new Blob(['﻿' + editor.value.replace(/\n/g, '\r\n')], { type: 'text/plain;charset=utf-8' }), 'compte-rendu.txt');
  });

  /* ---------- Schémas joints (outils PI-RADS, BI-RADS, EU-TIRADS) ---------- */
  const attachBox = $('#cr-attach'), attachList = $('#cr-attach-list');
  let attachments = store.get(KEY.attach, []);
  attachments = Array.isArray(attachments)
    ? attachments.filter(a => a && typeof a.title === 'string' && typeof a.svg === 'string' && a.svg.startsWith('<svg'))
    : [];
  const renderAttach = () => {
    attachBox.hidden = !attachments.length;
    attachList.innerHTML = attachments.map((a, i) => `
      <figure class="cr-attach-item">
        <div class="cr-attach-img">${a.svg}</div>
        <figcaption>${esc(a.title)}</figcaption>
        <button type="button" class="cr-attach-del" data-i="${i}" title="Retirer ce schéma" aria-label="Retirer le schéma ${esc(a.title)}">✕</button>
      </figure>`).join('');
  };
  const saveAttach = () => { store.set(KEY.attach, attachments); renderAttach(); };
  attachList.addEventListener('click', e => {
    const b = e.target.closest('[data-i]');
    if (!b) return;
    attachments.splice(+b.dataset.i, 1);
    saveAttach();
  });
  renderAttach();

  // Liaison avec les outils (cr-tools.js)
  window.RHEditor = {
    insert(text) {
      const s = editor.selectionStart, end = editor.selectionEnd;
      const before = editor.value.slice(0, s);
      insertPhrase({ text }, s, end, !before || before.endsWith('\n') ? '' : '\n');
      flash('Texte de l\'outil inséré dans le compte rendu.');
    },
    attach(item) {
      attachments.push(item);
      saveAttach();
      flash(`Schéma joint : ${item.title}`);
    },
  };

  $('#cr-print-btn').addEventListener('click', () => {
    if (isEmpty()) return;
    const pr = $('#cr-print');
    pr.textContent = '';
    const t = document.createElement('div');
    t.className = 'cr-print-text';
    t.textContent = editor.value;
    pr.appendChild(t);
    attachments.forEach(a => {
      const f = document.createElement('figure');
      f.className = 'cr-print-fig';
      f.innerHTML = `${a.svg}<figcaption>${esc(a.title)}</figcaption>`;
      pr.appendChild(f);
    });
    window.print();
  });

  $('#cr-clear').addEventListener('click', () => {
    if (!editor.value && !attachments.length) return;
    if (!confirm(attachments.length ? 'Effacer tout le texte de l\'éditeur et les schémas joints ?' : 'Effacer tout le texte de l\'éditeur ?')) return;
    closePop();
    replaceRange(0, editor.value.length, '');
    attachments = [];
    saveAttach();
    currentTpl = null;
    renderTplList();
    flash('Éditeur effacé (↶ Retour pour annuler).');
  });

  $('#cr-save-tpl').addEventListener('click', () => {
    if (isEmpty()) return;
    const firstLine = editor.value.trim().split('\n')[0].trim().slice(0, 80);
    const title = prompt('Nom du modèle :', firstLine);
    if (title === null) return;
    const t = { id: 'perso-' + Date.now().toString(36), title: title.trim() || firstLine, text: editor.value, mod: guessMod(editor.value) };
    myTemplates.push(t);
    store.set(KEY.templates, myTemplates);
    currentTpl = t.id;
    modFilter = MODS[t.mod] ? t.mod : 'all';
    store.set(KEY.modality, modFilter);
    tplFilter = 'perso';
    showPanel('tpl');
    renderTplFilters();
    renderTplList();
    flash(`Modèle « ${t.title} » enregistré dans « Mes modèles ».`);
  });

  /* ---------- Envoi par e-mail : ouvre un nouveau message dans la messagerie choisie, le site n'envoie rien ---------- */
  const mailInput = $('#cr-email');
  const mailer = $('#cr-mailer');
  const EMAIL = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/;
  const MAILERS = {
    gmail:      { name: 'Gmail',   url: (to, su, body) => `https://mail.google.com/mail/?view=cm&fs=1&to=${to}&su=${su}&body=${body}` },
    outlook365: { name: 'Outlook', url: (to, su, body) => `https://outlook.office.com/mail/deeplink/compose?to=${to}&subject=${su}&body=${body}` },
    outlookcom: { name: 'Outlook', url: (to, su, body) => `https://outlook.live.com/mail/0/deeplink/compose?to=${to}&subject=${su}&body=${body}` },
    mailto:     { name: 'Votre messagerie', url: (to, su, body) => `mailto:${to}?subject=${su}&body=${body}` },
  };
  mailInput.value = store.get(KEY.email, '') || '';
  const savedMailer = store.get(KEY.mailer, 'gmail');
  if (MAILERS[savedMailer]) mailer.value = savedMailer;
  mailer.addEventListener('change', () => store.set(KEY.mailer, mailer.value));
  let sendArmed = 0; // 2e clic pour envoyer malgré des champs [ … ] restants

  $('#cr-send').addEventListener('submit', async e => {
    e.preventDefault();
    if (isEmpty()) return;
    const to = mailInput.value.split(/[\s,;]+/).filter(Boolean);
    if (!to.length || !to.every(a => EMAIL.test(a))) {
      mailInput.focus();
      flash('Indiquez une adresse e-mail valide (plusieurs : séparées par une virgule).', true);
      return;
    }
    store.set(KEY.email, to.join(', '));
    const n = fieldsIn().length;
    if (n && Date.now() - sendArmed > 15000) {
      sendArmed = Date.now();
      flash(`Il reste ${n} champ${n > 1 ? 's' : ''} [ … ] à compléter. Cliquez de nouveau sur « Envoyer par e-mail » pour envoyer quand même.`, true);
      return;
    }
    sendArmed = 0;
    const m = MAILERS[mailer.value] || MAILERS.gmail;
    const text = editor.value.trim();
    const su = encodeURIComponent('Compte rendu — ' + text.split('\n')[0].trim().slice(0, 100));
    const toParam = mailer.value === 'mailto' ? to.join(',') : encodeURIComponent(to.join(','));
    const nl = mailer.value === 'mailto' ? '\r\n' : '\n';
    let url = m.url(toParam, su, encodeURIComponent(text.replace(/\n/g, nl)));
    // Liens trop longs refusés par certaines messageries : le texte (copié) sera collé à la main
    const tooLong = url.length > 8000;
    if (tooLong) url = m.url(toParam, su, encodeURIComponent('Collez ici le compte rendu (Ctrl + V).'));
    // Copie lancée avant d'ouvrir l'onglet (le presse-papiers exige que la page ait encore le focus)
    const copying = copyText();
    if (mailer.value === 'mailto') {
      const a = document.createElement('a');
      a.href = url;
      a.click();
    } else {
      const win = window.open(url, '_blank');
      if (win) win.opener = null;
      else location.href = url; // bloqueur de fenêtres : ouvrir dans l'onglet courant
    }
    const copied = await copying;
    flash(tooLong
      ? `${m.name} s'ouvre. Compte rendu trop long pour être pré-rempli : ${copied ? 'il est copié, collez-le dans le message (Ctrl + V).' : 'copiez-le avec le bouton « Copier ».'}`
      : `${m.name} s'ouvre avec le compte rendu prêt à envoyer${copied ? ' (il est aussi copié, au cas où)' : ''}.`);
  });

  /* ---------- Mes phrases ---------- */
  const form = $('#ph-form');
  const fKey = $('#ph-key'), fLabel = $('#ph-label'), fOrgan = $('#ph-organ'), fText = $('#ph-text');
  const fStatus = $('#ph-status'), fCancel = $('#ph-cancel'), fTitle = $('#ph-form-title'), fSubmit = $('#ph-submit');
  const ioStatus = $('#io-status');
  let editing = -1;

  const setStatus = (el, msg, error = false) => {
    el.textContent = msg;
    el.className = 'form-status ' + (msg ? (error ? 'is-error' : 'is-success') : '');
  };

  const renderMine = () => {
    $('#ph-count').textContent = myPhrases.length;
    $('#ph-empty').hidden = myPhrases.length > 0;
    $('#ph-list').innerHTML = myPhrases.map((p, i) => `
      <li>
        <div class="cr-ph-head"><mark class="k-ddx">${esc(p.k)}</mark>${p.organ ? `<span class="cr-mod">${esc(p.organ)}</span>` : ''}</div>
        <span class="cr-ph-label">${esc(p.label)}</span>
        <span class="cr-ph-prev">${esc(p.text)}</span>
        <div class="cr-mine-actions">
          <button type="button" class="cr-link" data-edit="${i}">Modifier</button>
          <button type="button" class="cr-link" data-remove="${i}">Supprimer</button>
        </div>
      </li>`).join('');
  };

  const refreshPhrases = () => {
    store.set(KEY.phrases, myPhrases);
    buildPhrases();
    renderMine();
    renderPhrFilters();
    renderPhrList();
  };

  const resetForm = () => {
    form.reset();
    editing = -1;
    fCancel.hidden = true;
    fTitle.textContent = 'Nouvelle phrase';
    fSubmit.textContent = 'Enregistrer la phrase';
    $$('.field', form).forEach(f => f.classList.remove('has-error'));
    setStatus(fStatus, '');
  };

  form.addEventListener('submit', e => {
    e.preventDefault();
    const k = cleanKey(fKey.value), label = fLabel.value.trim(), text = fText.value.trim();
    const checks = [[fKey, !k], [fLabel, !label], [fText, !text]];
    checks.forEach(([el, bad]) => el.closest('.field').classList.toggle('has-error', bad));
    if (checks.some(([, bad]) => bad)) {
      setStatus(fStatus, 'Complétez le mot-clé, l\'intitulé et le texte.', true);
      return;
    }
    const p = { k, label, organ: fOrgan.value.trim(), text };
    const wasEditing = editing >= 0;
    if (wasEditing) myPhrases[editing] = p;
    else myPhrases.unshift(p);
    refreshPhrases();
    resetForm();
    setStatus(fStatus, wasEditing ? 'Phrase modifiée ✓' : `Phrase enregistrée ✓ — tapez « ${k} » dans l'éditeur.`);
  });
  fCancel.addEventListener('click', resetForm);

  $('#ph-list').addEventListener('click', e => {
    const ed = e.target.closest('[data-edit]');
    const rm = e.target.closest('[data-remove]');
    if (ed) {
      const i = +ed.dataset.edit, p = myPhrases[i];
      resetForm();
      editing = i;
      fKey.value = p.k;
      fLabel.value = p.label;
      fOrgan.value = p.organ || '';
      fText.value = p.text;
      fCancel.hidden = false;
      fTitle.textContent = 'Modifier la phrase';
      fSubmit.textContent = 'Enregistrer les modifications';
      form.scrollIntoView({ behavior: 'smooth', block: 'start' });
      fText.focus({ preventScroll: true });
    }
    if (rm) {
      const i = +rm.dataset.remove;
      if (!confirm(`Supprimer la phrase « ${myPhrases[i].label} » ?`)) return;
      myPhrases.splice(i, 1);
      if (editing === i) resetForm();
      else if (editing > i) editing--;
      refreshPhrases();
    }
  });

  $('#cr-sel-phrase').addEventListener('click', () => {
    const sel = editor.value.slice(editor.selectionStart, editor.selectionEnd).trim();
    if (!sel) {
      flash('Sélectionnez d\'abord, dans l\'éditeur, le texte à transformer en phrase.', true);
      return;
    }
    resetForm();
    fText.value = sel;
    $('#mes-phrases').scrollIntoView({ behavior: 'smooth', block: 'start' });
    fKey.focus({ preventScroll: true });
  });

  /* Export / import (fichier .json) */
  $('#io-export').addEventListener('click', () => {
    const data = { app: 'RadiologicHub', version: 1, exported: new Date().toISOString(), phrases: myPhrases, templates: myTemplates };
    download(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), 'radiologichub-mes-phrases.json');
    setStatus(ioStatus, `${myPhrases.length} phrase(s) et ${myTemplates.length} modèle(s) exportés.`);
  });

  $('#io-import').addEventListener('change', async e => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      const ph = (Array.isArray(data.phrases) ? data.phrases : []).filter(isPhrase)
        .map(p => ({ k: cleanKey(p.k), label: p.label, organ: typeof p.organ === 'string' ? p.organ : '', text: p.text }))
        .filter(p => p.k);
      const tp = (Array.isArray(data.templates) ? data.templates : []).filter(isTemplate);
      ph.forEach(p => {
        const i = myPhrases.findIndex(q => q.k === p.k && q.label === p.label);
        if (i >= 0) myPhrases[i] = p; else myPhrases.push(p);
      });
      tp.forEach(t => {
        if (!myTemplates.some(q => q.title === t.title && q.text === t.text)) {
          myTemplates.push({ id: 'perso-' + Math.random().toString(36).slice(2, 10), title: t.title, text: t.text, mod: typeof t.mod === 'string' ? t.mod : '' });
        }
      });
      refreshPhrases();
      store.set(KEY.templates, myTemplates);
      renderTplFilters();
      renderTplList();
      setStatus(ioStatus, `Import terminé : ${ph.length} phrase(s) et ${tp.length} modèle(s).`);
    } catch (err) {
      setStatus(ioStatus, 'Fichier illisible : choisissez un export RadiologicHub (.json).', true);
    }
  });

  /* ---------- Démarrage ---------- */
  buildPhrases();
  renderTplFilters();
  renderTplList();
  renderPhrFilters();
  renderPhrList();
  renderMine();

  const draft = store.get(KEY.draft, '');
  if (typeof draft === 'string') editor.value = draft;
  updateStatus();
  syncHistory();

  // Lien direct vers un modèle : comptes-rendus.html#modele=irm-rectum
  const openFromHash = () => {
    const id = location.hash.startsWith('#modele=') ? decodeURIComponent(location.hash.slice(8)) : '';
    const linked = id && allTemplates().find(t => t.id === id);
    if (!linked) return;
    history.replaceState(null, '', location.pathname);
    modFilter = MODS[linked.mod] ? linked.mod : 'all';
    tplFilter = linked.spe;
    renderTplFilters();
    renderTplList();
    loadTemplate(linked.id);
  };
  openFromHash();
  window.addEventListener('hashchange', openFromHash);
})();
