/* =========================================================
   RadiologicHub — Suivi oncologique (interface)
   Mes suivis, examens, registre des lésions, tableau comparatif.
   Règles et calculs : suivi/registre.js ; seuils : suivi/seuils.js ;
   schéma anatomique : suivi/schema.js
   ========================================================= */

(() => {
  const R = window.RHSuivi && window.RHSuivi.registre;
  const SCH = window.RHSuivi && window.RHSuivi.schema;
  const app = document.getElementById('so-app');
  if (!R || !app) return;

  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const opts = (pairs, val) => pairs.map(([v, t]) => `<option value="${esc(v)}"${String(v) === String(val ?? '') ? ' selected' : ''}>${esc(t)}</option>`).join('');
  const MODALITES = [['', '—'], ['TDM', 'TDM'], ['IRM', 'IRM'], ['TEP-TDM', 'TEP-TDM'], ['Échographie', 'Échographie'], ['Radiographie', 'Radiographie']];
  const PHASES = [['', '—'], ['sans injection', 'Sans injection'], ['artérielle', 'Artérielle'], ['portale', 'Portale'], ['tardive', 'Tardive'], ['autre', 'Autre']];
  const aujourdhui = () => new Date().toISOString().slice(0, 10);

  /* ---------- Stockage dans le navigateur (aucun serveur) ---------- */
  const KEY = { suivis: 'rh-suivis', eph: 'rh-suivi-ephemere', courant: 'rh-suivi-courant' };
  const lire = (k, def) => { try { const v = localStorage.getItem(k); return v == null ? def : JSON.parse(v); } catch (e) { return def; } };
  const ecrire = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  const effacer = k => { try { localStorage.removeItem(k); } catch (e) {} };

  let ephemere = lire(KEY.eph, false) === true;
  const suivis = {};
  if (!ephemere) {
    const brut = lire(KEY.suivis, {});
    Object.values(brut && typeof brut === 'object' ? brut : {}).forEach(d => {
      try { const s = R.importer(JSON.stringify(d)); suivis[s.id] = s; } catch (e) { /* entrée illisible ignorée */ }
    });
  }
  let cur = null, ex = null;
  const sel = lire(KEY.courant, {});
  if (!ephemere && sel && suivis[sel.cur]) { cur = sel.cur; ex = R.examen(suivis[cur], sel.ex) ? sel.ex : null; }

  const suivi = () => suivis[cur] || null;
  const examen = () => (suivi() ? R.examen(suivi(), ex) : null);

  let saveTimer;
  const persister = () => { if (!ephemere) { ecrire(KEY.suivis, suivis); ecrire(KEY.courant, { cur, ex }); } };
  const sauver = () => { clearTimeout(saveTimer); saveTimer = setTimeout(persister, 250); };
  window.addEventListener('pagehide', persister);
  window.addEventListener('beforeunload', e => {
    if (ephemere && Object.keys(suivis).length) { e.preventDefault(); e.returnValue = ''; }
  });

  const msgEl = $('#so-msg');
  let msgTimer;
  const dire = (m, warn = false) => {
    msgEl.textContent = m;
    msgEl.classList.toggle('is-warn', warn);
    clearTimeout(msgTimer);
    msgTimer = setTimeout(() => { msgEl.textContent = ''; }, 6000);
  };

  /* ---------- Liste des suivis ---------- */
  const renderList = () => {
    const items = Object.values(suivis).sort((a, b) => b.modifie.localeCompare(a.modifie));
    $('#so-list').innerHTML = items.map(s => {
      const t = R.examensTries(s), last = t[t.length - 1];
      return `<li><button type="button" class="so-item${s.id === cur ? ' is-active' : ''}" data-suivi="${esc(s.id)}">
        <span class="so-item-name">${esc(s.pseudo || s.id)}</span>
        <span class="so-item-meta">${esc(R.CRITERES[s.criteres])} · ${t.length} examen${t.length > 1 ? 's' : ''}${last ? ' · ' + R.dateFr(last.date) : ''}</span>
      </button></li>`;
    }).join('');
    $('#so-empty').hidden = items.length > 0;
  };

  /* ---------- En-tête du suivi ---------- */
  const renderHead = s => {
    $('#so-head').innerHTML = `
      <div class="so-head-main">
        <label class="tf"><span>Identifiant pseudonymisé</span><input id="so-pseudo" value="${esc(s.pseudo)}" autocomplete="off" placeholder="ex. TN-ONCO-0142"></label>
        <p class="so-meta"><span class="so-chip">${esc(R.CRITERES[s.criteres])}</span> Référence interne : ${esc(s.id)}</p>
        <p class="so-warn" id="so-pseudo-warn"${R.ressembleAUnNom(s.pseudo) ? '' : ' hidden'}>Cet identifiant ne contient que des lettres : vérifiez qu'il ne s'agit pas du nom du patient.</p>
      </div>
      <div class="so-row">
        <button type="button" class="btn btn-outline btn-sm" data-act="export">Exporter (JSON)</button>
        <button type="button" class="btn btn-outline btn-sm so-danger" data-act="delete-suivi">Supprimer le suivi</button>
      </div>`;
  };

  /* ---------- Examens ---------- */
  const renderExams = s => {
    $('#so-exams').innerHTML = R.examensTries(s).map(e => `
      <button type="button" class="so-exam${e.id === ex ? ' is-active' : ''}" data-exam="${e.id}">
        <b>${R.dateFr(e.date)}</b><span>${esc(e.modalite || '—')}${e.phase ? ' · ' + esc(e.phase) : ''}</span>${e.baseline ? '<i class="so-badge">Baseline</i>' : ''}
      </button>`).join('') + '<button type="button" class="so-exam so-exam-add" data-act="show-new-exam">+ Nouvel examen</button>';
  };

  const renderTech = e => {
    $('#so-tech').innerHTML = !e ? '<p class="so-hint">Ajoutez l\'examen de baseline pour commencer.</p>' : `
      <p class="so-sub">Technique de l'examen du ${R.dateFr(e.date)}</p>
      <div class="tf-row">
        <label class="tf tf-small"><span>Date</span><input type="date" data-t="date" value="${esc(e.date)}"></label>
        <label class="tf"><span>Modalité</span><select data-t="modalite">${opts(MODALITES, e.modalite)}</select></label>
        <label class="tf"><span>Phase</span><select data-t="phase">${opts(PHASES, e.phase)}</select></label>
        <label class="tf tf-small"><span>Épaisseur (mm)</span><input data-t="epaisseur" value="${esc(e.epaisseur)}" inputmode="decimal" autocomplete="off"></label>
        <label class="tf-check"><input type="checkbox" data-t="baseline"${e.baseline ? ' checked' : ''}> Examen de baseline</label>
        <button type="button" class="so-link so-link-danger" data-act="delete-exam">Supprimer cet examen</button>
      </div>`;
  };

  /* ---------- Tableau comparatif ---------- */
  const cellule = (l, c, estActuel) => {
    if (!c || !c.mesure) return '<span class="so-na">—</span>';
    const m = c.mesure;
    if (l.type === 'cible') {
      if (m.statut === 'non-evaluable') return `<span class="so-ne" title="${esc(m.motif || 'Non évaluable')}">NE</span>`;
      if (c.mm == null) return '<span class="so-na">—</span>';
      const tag = m.statut === 'disparue' ? '<small>disparue</small>' : m.statut === 'trop-petite' ? '<small>trop petite</small>' : '';
      return `${R.fr(c.mm)} mm${tag}`;
    }
    if (!m.statut) return '<span class="so-na">—</span>';
    const v = R.lireMm(m.valeur);
    return `<span class="so-q so-q-${esc(m.statut)}">${esc(R.STATUTS[l.type][m.statut])}</span>${!estActuel && v.ok && !v.vide ? `<small>${R.fr(v.mm)} mm</small>` : ''}`;
  };
  const deltaHtml = (dl, seuilUp) => {
    if (!dl) return '<span class="so-na">—</span>';
    const cls = dl.mm < 0 ? 'so-down' : dl.mm > 0 ? (seuilUp ? 'so-up' : 'so-up-soft') : '';
    const sg = n => (n > 0 ? '+' : n < 0 ? '−' : '±');
    return `<span class="${cls}">${sg(dl.mm)}${R.fr(Math.abs(dl.mm))} mm${dl.pct == null ? '' : `<small>${sg(dl.pct)}${R.fr(Math.abs(dl.pct))} %</small>`}</span>`;
  };
  const sommeHtml = sc => (!sc ? '<span class="so-na">—</span>'
    : sc.complete ? `<b>${R.fr(sc.somme)} mm</b>`
      : sc.nb ? `<span class="so-incomplet" title="Mesure manquante : ${esc(sc.manquantes.join(', '))}">incomplète</span>` : '<span class="so-na">—</span>');

  const ligneHtml = (row, t) => {
    const l = row.lesion, m = row.mesure;
    const loc = [l.organe, l.territoire].filter(Boolean).join(', ');
    const bloque = ['disparue', 'trop-petite', 'non-evaluable'].includes(m.statut);
    let actuel;
    if (l.type === 'cible') {
      actuel = `<input class="so-val" data-k="valeur" value="${esc(m.valeur)}" inputmode="decimal" placeholder="mm" autocomplete="off" aria-label="Mesure actuelle de ${l.id} en mm"${bloque ? ' disabled' : ''}>
        <select data-k="statut" aria-label="Statut de ${l.id}">${opts(Object.entries(R.STATUTS.cible), m.statut)}</select>`;
    } else if (l.type === 'non-cible') {
      actuel = `<select data-k="statut" aria-label="Statut de ${l.id}">${opts(Object.entries(R.STATUTS['non-cible']), m.statut)}</select>`;
    } else {
      actuel = `<select data-k="statut" aria-label="Statut de ${l.id}">${opts(Object.entries(R.STATUTS.nouvelle), m.statut)}</select>
        <input class="so-val" data-k="valeur" value="${esc(m.valeur)}" inputmode="decimal" placeholder="mm" autocomplete="off" aria-label="Taille de ${l.id} en mm (facultatif)">`;
    }
    if (m.statut === 'non-evaluable') actuel += `<input class="so-motif" data-k="motif" value="${esc(m.motif)}" placeholder="Motif (obligatoire)" autocomplete="off" aria-label="Motif : ${l.id} non évaluable">`;
    const cible = l.type === 'cible';
    return `<tr data-l="${l.id}" class="so-tr-${l.type}">
      <th scope="row"><button type="button" class="so-lesion" data-act="edit-lesion" title="Modifier la lésion ${l.id}">
        <b class="so-id so-id-${l.type}">${l.id}</b><span>${esc(loc || 'à localiser')}${l.ganglion ? '<i class="so-tag">ganglion · petit axe</i>' : ''}${l.commentaire ? `<small>${esc(l.commentaire)}</small>` : ''}</span>
      </button></th>
      <td class="so-loc"><label>Se <input data-k="serie" value="${esc(m.serie)}" inputmode="numeric" autocomplete="off" aria-label="Série ${l.id}"></label><label>Im <input data-k="image" value="${esc(m.image)}" inputmode="numeric" autocomplete="off" aria-label="Image ${l.id}"></label></td>
      <td class="so-num">${t.baseline && t.baseline.id === t.examen.id ? '<span class="so-na">cet examen</span>' : cellule(l, row.baseline)}</td>
      <td class="so-num">${cible ? cellule(l, row.nadir) : '<span class="so-na">—</span>'}</td>
      <td class="so-num">${cellule(l, row.precedent)}</td>
      <td class="so-act">${actuel}</td>
      <td class="so-d" data-calc="dB">${cible ? deltaHtml(row.dBaseline) : ''}</td>
      <td class="so-d" data-calc="dN">${cible ? deltaHtml(row.dNadir, true) : ''}</td>
    </tr>`;
  };

  const renderTable = () => {
    const s = suivi(), e = examen(), box = $('#so-table');
    if (!s || !e) { box.innerHTML = ''; return; }
    // garder le champ actif après avoir redessiné
    const a = document.activeElement, focusL = a && a.closest && a.closest('[data-l]'), focusK = a && a.dataset && a.dataset.k;
    const focusId = focusL && box.contains(a) ? focusL.dataset.l : null;

    const t = R.comparatif(s, e.id);
    const d = x => (x ? R.dateFr(x.date) : '—');
    const groupes = [['cible', 'Lésions cibles', 'somme des diamètres — ganglions : petit axe'], ['non-cible', 'Lésions non cibles', 'évaluation qualitative'], ['nouvelle', 'Nouvelles lésions', '']];
    let body = '';
    groupes.forEach(([type, titre, sous]) => {
      const rows = t.lignes.filter(r => r.lesion.type === type);
      if (!rows.length && type === 'nouvelle') return;
      body += `<tr class="so-sec"><th colspan="8">${titre}${sous ? ` <small>(${sous})</small>` : ''}</th></tr>`;
      body += rows.length ? rows.map(r => ligneHtml(r, t)).join('') : `<tr class="so-none"><td colspan="8">Aucune ${type === 'cible' ? 'lésion cible' : 'lésion non cible'}${e.baseline ? ' : ajoutez-les ci-dessous.' : ' (elles se définissent sur l\'examen de baseline).'}</td></tr>`;
      if (type === 'cible' && rows.length) {
        body += `<tr class="so-sum"><th scope="row">Somme des diamètres</th><td></td>
          <td class="so-num" data-calc="sB">${t.baseline && t.baseline.id === e.id ? '<span class="so-na">cet examen</span>' : sommeHtml(t.somme.baseline)}</td>
          <td class="so-num">${t.nadir ? `<b>${R.fr(t.nadir.somme)} mm</b><small>${R.dateFr(t.nadir.examen.date)}</small>` : '<span class="so-na">—</span>'}</td>
          <td class="so-num">${sommeHtml(t.somme.precedent)}</td>
          <td class="so-num" data-calc="sA">${sommeHtml(t.somme.actuel)}</td>
          <td class="so-d" data-calc="sdB">${deltaHtml(t.somme.dBaseline)}</td>
          <td class="so-d" data-calc="sdN">${deltaHtml(t.somme.dNadir, true)}</td></tr>`;
      }
    });
    box.innerHTML = `<table class="so-table">
      <thead><tr>
        <th scope="col">Lésion</th><th scope="col">Localisation<small>Se / Im</small></th>
        <th scope="col">Baseline<small>${d(t.baseline)}</small></th>
        <th scope="col">Nadir<small>${t.nadir ? d(t.nadir.examen) : '—'}</small></th>
        <th scope="col">Précédent<small>${d(t.precedent)}</small></th>
        <th scope="col">Actuel<small>${d(e)}</small></th>
        <th scope="col">Δ vs baseline</th><th scope="col">Δ vs nadir</th>
      </tr></thead>
      <tbody>${body}</tbody></table>`;
    if (focusId) {
      const f = box.querySelector(`[data-l="${focusId}"] [data-k="${focusK}"]`);
      if (f && !f.disabled) f.focus();
    }
  };

  /* Recalcul des cellules calculées sans redessiner le tableau (on garde le curseur) */
  const recalculer = () => {
    const s = suivi(), e = examen();
    if (!s || !e) return;
    const t = R.comparatif(s, e.id), box = $('#so-table');
    t.lignes.forEach(r => {
      if (r.lesion.type !== 'cible') return;
      const tr = box.querySelector(`[data-l="${r.lesion.id}"]`);
      if (!tr) return;
      tr.querySelector('[data-calc="dB"]').innerHTML = deltaHtml(r.dBaseline);
      tr.querySelector('[data-calc="dN"]').innerHTML = deltaHtml(r.dNadir, true);
    });
    const set = (k, h) => { const c = box.querySelector(`[data-calc="${k}"]`); if (c) c.innerHTML = h; };
    set('sA', sommeHtml(t.somme.actuel));
    set('sdB', deltaHtml(t.somme.dBaseline));
    set('sdN', deltaHtml(t.somme.dNadir, true));
    renderVerdict();
    renderVue();
  };

  const renderAdd = e => {
    $('#so-add').innerHTML = !e ? '' : e.baseline
      ? `<button type="button" class="btn btn-outline btn-sm" data-act="add-lesion" data-type="cible">+ Lésion cible</button>
         <button type="button" class="btn btn-outline btn-sm" data-act="add-lesion" data-type="non-cible">+ Lésion non cible</button>
         <p class="so-hint">Baseline : définissez les lésions cibles (5 au maximum, 2 par organe) et non cibles. Elles seront reportées à chaque contrôle.</p>`
      : `<button type="button" class="btn btn-outline btn-sm" data-act="add-lesion" data-type="nouvelle">+ Nouvelle lésion</button>
         <p class="so-hint">Les lésions cibles et non cibles se définissent sur l'examen de baseline. N'enregistrez une nouvelle lésion (N) que si elle est certaine.</p>`;
  };

  const renderVerdict = () => {
    const s = suivi(), e = examen(), box = $('#so-verdict');
    if (!s || !e) { box.innerHTML = ''; return; }
    const t = R.comparatif(s, e.id), sc = t.somme;
    const bits = [];
    if (sc.actuel.complete) bits.push(`Somme actuelle : <b>${R.fr(sc.actuel.somme)} mm</b>`);
    if (sc.baseline && sc.baseline.complete) bits.push(`baseline : ${R.fr(sc.baseline.somme)} mm (${R.dateFr(t.baseline.date)})`);
    if (t.nadir) bits.push(`nadir : ${R.fr(t.nadir.somme)} mm (${R.dateFr(t.nadir.examen.date)})`);
    box.innerHTML = `<h2 class="so-h">Réponse RECIST 1.1</h2>
      <p>${bits.length ? bits.join(' · ') : 'Saisissez les mesures des lésions cibles.'}</p>
      <p class="so-hint">Prochaine étape du module : verdict RECIST 1.1 (cibles, non-cibles, nouvelles lésions, réponse globale) avec sa justification chiffrée, puis le texte du compte rendu.</p>`;
  };

  /* ---------- Vue d'ensemble : schéma anatomique ---------- */
  const titreSchema = (s, e) => `${(s.pseudo || s.id).slice(0, 28)} — ${e.baseline ? 'baseline' : 'contrôle'} du ${R.dateFr(e.date)}`;
  const renderVue = () => {
    const s = suivi(), e = examen(), box = $('#so-vue-svg'), side = $('#so-vue-side');
    if (!SCH || !box) return;
    if (!s || !e) { box.innerHTML = ''; side.innerHTML = ''; return; }
    const t = R.comparatif(s, e.id);
    if (!t.lignes.length) {
      box.innerHTML = '';
      side.innerHTML = '<p class="so-hint">Les lésions apparaîtront ici dès qu\'elles seront ajoutées au tableau, placées d\'après leur organe et leur territoire.</p>';
      return;
    }
    const { svg, horsSchema } = SCH.svgSchema(t, { titre: titreSchema(s, e), interactif: true });
    box.innerHTML = svg;
    // Lecture rapide : nombre de lésions par état
    const groupes = [['cible', 'Cibles'], ['non-cible', 'Non cibles'], ['nouvelle', 'Nouvelles']];
    const ordre = ['baseline', 'baisse', 'stable', 'hausse', 'ne', 'na'];
    const lignes = groupes.map(([type, nom]) => {
      const rows = t.lignes.filter(r => r.lesion.type === type);
      if (!rows.length) return '';
      const ids = {};
      rows.forEach(r => { const k = SCH.etatLesion(r); (ids[k] = ids[k] || []).push(r.lesion.id); });
      const libelle = (k, n) => (type === 'nouvelle' && k === 'hausse' ? `présente${n > 1 ? 's' : ''}` : SCH.ETATS[k].label.toLowerCase());
      return `<li><b>${nom}</b>${ordre.filter(k => ids[k]).map(k => `<span class="so-vue-n"><i style="background:${SCH.ETATS[k].c}"></i>${ids[k].length} ${esc(libelle(k, ids[k].length))} <small>(${esc(ids[k].join(', '))})</small></span>`).join('')}</li>`;
    }).join('');
    side.innerHTML = `
      <ul class="so-vue-list">${lignes}</ul>
      ${horsSchema.length ? `<p class="so-warn">Non placée${horsSchema.length > 1 ? 's' : ''} sur le schéma (organe ou territoire à préciser) : ${horsSchema.map(id => `<button type="button" class="so-link" data-act="edit-lesion" data-l="${esc(id)}">${esc(id)}</button>`).join(' ')}</p>` : ''}
      <button type="button" class="btn btn-outline btn-sm" data-act="schema-png">Télécharger l'image (PNG)</button>
      <p class="so-hint">Placement automatique d'après l'organe et le segment / territoire de chaque lésion (droite du patient à gauche de l'image). Cliquez un repère pour retrouver la ligne du tableau ; survolez une ligne pour repérer la lésion.</p>
      <p class="so-hint">Couleurs <strong>indicatives</strong>, lésion par lésion (cible : variation vs baseline et vs nadir ; non-cible : statut qualitatif). La réponse RECIST se juge sur la somme des diamètres.</p>`;
  };

  const surligner = id => $$('#so-vue-svg g[data-l]').forEach(g => g.classList.toggle('is-hl', g.dataset.l === id));

  const telechargerPng = () => {
    const s = suivi(), e = examen();
    if (!s || !e || !SCH) return;
    const { svg, largeur, hauteur } = SCH.svgSchema(R.comparatif(s, e.id), { titre: titreSchema(s, e) });
    const img = new Image();
    img.onload = () => {
      const k = 2, c = document.createElement('canvas');
      c.width = largeur * k; c.height = hauteur * k;
      const ctx = c.getContext('2d');
      ctx.scale(k, k);
      ctx.drawImage(img, 0, 0, largeur, hauteur);
      c.toBlob(b => {
        if (!b) { dire('Image impossible à générer dans ce navigateur.', true); return; }
        telecharger(b, `schema-${(s.pseudo || s.id).replace(/[^\w-]+/g, '_')}-${e.date}.png`);
        dire('Schéma téléchargé (PNG).');
      }, 'image/png');
    };
    img.onerror = () => dire('Image impossible à générer dans ce navigateur.', true);
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  };

  const telecharger = (blob, nom) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = nom;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  /* ---------- Rendu général ---------- */
  const render = () => {
    renderList();
    const s = suivi();
    $('#so-placeholder').hidden = !!s;
    $('#so-detail').hidden = !s;
    if (!s) return;
    if (!examen()) { const t = R.examensTries(s); ex = t.length ? t[t.length - 1].id : null; }
    const e = examen();
    renderHead(s);
    renderExams(s);
    renderTech(e);
    renderTable();
    renderAdd(e);
    renderVerdict();
    renderVue();
  };

  const ouvrirSuivi = id => { cur = id; ex = null; $('#so-new-exam').hidden = true; render(); sauver(); };

  /* ---------- Formulaire : nouveau suivi ---------- */
  $('#so-new-suivi').addEventListener('submit', e => {
    e.preventDefault();
    const pseudo = $('#ns-pseudo').value.trim();
    if (R.ressembleAUnNom(pseudo) && !confirm('Cet identifiant ne contient que des lettres : est-ce bien un code pseudonymisé et non le nom du patient ?')) return;
    const s = R.creerSuivi({ pseudo, criteres: $('#ns-criteres').value });
    suivis[s.id] = s;
    e.target.reset();
    e.target.hidden = true;
    ouvrirSuivi(s.id);
    afficherNouvelExamen();
    dire('Suivi créé : ajoutez l\'examen de baseline.');
  });

  /* ---------- Formulaire : nouvel examen ---------- */
  const afficherNouvelExamen = () => {
    const s = suivi(), f = $('#so-new-exam');
    const t = R.examensTries(s), last = t[t.length - 1];
    $('#ne-modalite').innerHTML = opts(MODALITES, last ? last.modalite : 'TDM');
    $('#ne-phase').innerHTML = opts(PHASES, last ? last.phase : 'portale');
    $('#ne-epaisseur').value = last ? last.epaisseur : '';
    $('#ne-date').value = aujourdhui();
    $('#ne-baseline').checked = !t.length;
    f.hidden = false;
    $('#ne-date').focus();
  };
  $('#so-new-exam').addEventListener('submit', e => {
    e.preventDefault();
    const s = suivi();
    try {
      const nouv = R.ajouterExamen(s, {
        date: $('#ne-date').value, modalite: $('#ne-modalite').value, phase: $('#ne-phase').value,
        epaisseur: $('#ne-epaisseur').value.trim(), baseline: $('#ne-baseline').checked,
      });
      ex = nouv.id;
      e.target.hidden = true;
      render();
      sauver();
      const n = Object.keys(nouv.mesures).length;
      dire(n ? `Examen ajouté : ${n} lésion${n > 1 ? 's' : ''} reportée${n > 1 ? 's' : ''}, il reste à saisir les mesures actuelles.` : 'Examen ajouté.');
      const first = $('#so-table .so-val:not([disabled])');
      if (first) first.focus();
    } catch (err) { dire(err.message, true); }
  });

  /* ---------- Fiche lésion ---------- */
  const dlg = $('#so-lesion');
  let lesionEditee = null;
  const ouvrirLesion = (type, id) => {
    const s = suivi(), l = id ? R.lesion(s, id) : null;
    lesionEditee = l ? l.id : null;
    $('#sl-title').textContent = l ? `Lésion ${l.id}` : { cible: 'Nouvelle lésion cible', 'non-cible': 'Nouvelle lésion non cible', nouvelle: 'Nouvelle lésion (N)' }[type];
    $('#sl-type').value = l ? l.type : type;
    $('#sl-type').disabled = true; // le type fixe l'identifiant : il ne change pas
    $('#sl-organe').value = l ? l.organe : '';
    $('#sl-territoire').value = l ? l.territoire : '';
    $('#sl-ganglion').checked = l ? l.ganglion : false;
    $('#sl-commentaire').value = l ? l.commentaire : '';
    $('#sl-delete').hidden = !l;
    dlg.showModal();
    $('#sl-organe').focus();
  };
  $('#sl-form').addEventListener('submit', e => {
    e.preventDefault();
    const s = suivi();
    const d = { organe: $('#sl-organe').value, territoire: $('#sl-territoire').value, ganglion: $('#sl-ganglion').checked, commentaire: $('#sl-commentaire').value };
    if (lesionEditee) R.modifierLesion(s, lesionEditee, d);
    else {
      const l = R.ajouterLesion(s, ex, { ...d, type: $('#sl-type').value });
      dire(`Lésion ${l.id} ajoutée.`);
    }
    dlg.close();
    render();
    sauver();
  });
  dlg.addEventListener('click', e => {
    if (e.target === dlg || e.target.closest('[data-act="close-lesion"]')) dlg.close();
    if (e.target.closest('[data-act="delete-lesion"]') && lesionEditee) {
      if (!confirm(`Supprimer la lésion ${lesionEditee} et toutes ses mesures ? Son identifiant ne sera pas réattribué.`)) return;
      R.supprimerLesion(suivi(), lesionEditee);
      dlg.close();
      render();
      sauver();
    }
  });

  /* ---------- Actions (délégation) ---------- */
  app.addEventListener('click', e => {
    const b = e.target.closest('[data-act], [data-suivi], [data-exam]');
    if (!b) return;
    if (b.dataset.suivi) { ouvrirSuivi(b.dataset.suivi); return; }
    if (b.dataset.exam) { ex = b.dataset.exam; $('#so-new-exam').hidden = true; render(); sauver(); return; }
    const s = suivi();
    switch (b.dataset.act) {
      case 'show-new-suivi': $('#so-new-suivi').hidden = false; $('#ns-pseudo').focus(); break;
      case 'hide-new-suivi': $('#so-new-suivi').hidden = true; break;
      case 'show-new-exam': afficherNouvelExamen(); break;
      case 'hide-new-exam': $('#so-new-exam').hidden = true; break;
      case 'add-lesion': ouvrirLesion(b.dataset.type); break;
      case 'edit-lesion': ouvrirLesion(null, b.closest('[data-l]').dataset.l); break;
      case 'delete-exam': {
        const e2 = examen();
        if (!e2 || !confirm(`Supprimer l'examen du ${R.dateFr(e2.date)} et ses mesures ?`)) return;
        R.supprimerExamen(s, e2.id);
        ex = null;
        render();
        sauver();
        break;
      }
      case 'schema-png': telechargerPng(); break;
      case 'export': {
        const nom = (s.pseudo || s.id).replace(/[^\w-]+/g, '_');
        telecharger(new Blob([R.exporter(s)], { type: 'application/json' }), `suivi-${nom}.json`);
        dire('Suivi exporté (fichier JSON) : il ne contient que l\'identifiant pseudonymisé, les examens et les mesures.');
        break;
      }
      case 'delete-suivi':
        if (!confirm(`Supprimer définitivement le suivi « ${s.pseudo || s.id} » de ce navigateur ?`)) return;
        delete suivis[s.id];
        cur = null; ex = null;
        render();
        persister();
        break;
      default:
    }
  });

  // Identifiant pseudonymisé
  app.addEventListener('input', e => {
    if (e.target.id !== 'so-pseudo') return;
    const s = suivi();
    s.pseudo = e.target.value.trim();
    s.modifie = new Date().toISOString();
    $('#so-pseudo-warn').hidden = !R.ressembleAUnNom(s.pseudo);
    renderList();
    sauver();
  });

  // Technique de l'examen
  $('#so-tech').addEventListener('change', e => {
    const f = e.target.closest('[data-t]');
    if (!f) return;
    try {
      R.modifierExamen(suivi(), ex, { [f.dataset.t]: f.type === 'checkbox' ? f.checked : f.value.trim() });
      // champ texte : pas de redessin complet (le clic qui a provoqué la sortie du champ serait perdu)
      if (f.dataset.t === 'epaisseur') renderExams(suivi()); else render();
      sauver();
    } catch (err) { dire(err.message, true); render(); }
  });

  /* ---------- Saisie dans le tableau ---------- */
  const table = $('#so-table');
  const cibleDe = f => {
    const tr = f.closest('[data-l]');
    return tr ? { id: tr.dataset.l, l: R.lesion(suivi(), tr.dataset.l), m: examen().mesures[tr.dataset.l], tr } : null;
  };
  table.addEventListener('input', e => {
    const f = e.target.closest('[data-k]');
    if (!f || f.tagName === 'SELECT') return;
    const c = cibleDe(f);
    if (!c) return;
    const patch = { [f.dataset.k]: f.value };
    if (f.dataset.k === 'valeur') {
      const r = R.lireMm(f.value);
      f.classList.toggle('is-bad', !r.ok);
      // une valeur tapée = lésion mesurée
      if (c.l.type === 'cible' && !r.vide && c.m.statut !== 'mesuree') {
        patch.statut = 'mesuree';
        const s2 = c.tr.querySelector('select[data-k="statut"]');
        if (s2) s2.value = 'mesuree';
      }
    }
    R.majMesure(suivi(), ex, c.id, patch);
    recalculer();
    sauver();
  });
  table.addEventListener('change', e => {
    const f = e.target.closest('[data-k]');
    if (!f) return;
    const c = cibleDe(f);
    if (!c) return;
    if (f.tagName === 'SELECT') {
      const patch = { statut: f.value };
      if (c.l.type === 'cible' && ['disparue', 'trop-petite', 'non-evaluable'].includes(f.value)) patch.valeur = '';
      if (f.value !== 'non-evaluable') patch.motif = '';
      R.majMesure(suivi(), ex, c.id, patch);
      renderTable();
      renderVerdict();
      renderVue();
      if (f.value === 'non-evaluable') { const mo = table.querySelector(`[data-l="${c.id}"] [data-k="motif"]`); if (mo) mo.focus(); }
    } else if (f.dataset.k === 'valeur') {
      const r = R.lireMm(f.value);
      if (!r.ok) dire(`${c.id} : « ${f.value} » n'est pas une mesure valide (ex. 18, 18,5 ou 1,8 cm).`, true);
      else if (!r.vide) { f.value = R.fr(r.mm); R.majMesure(suivi(), ex, c.id, { valeur: f.value }); recalculer(); }
    }
    renderList();
    sauver();
  });
  // Saisie rapide : Entrée passe à la mesure suivante
  table.addEventListener('keydown', e => {
    if (e.key !== 'Enter' || !e.target.matches('.so-val')) return;
    e.preventDefault();
    const all = $$('.so-val:not([disabled])', table);
    const next = all[all.indexOf(e.target) + 1];
    if (next) next.focus(); else e.target.blur();
  });

  // Tableau ↔ schéma : survol d'une ligne = repère mis en évidence ; clic sur un repère = ligne du tableau
  table.addEventListener('mouseover', e => { const tr = e.target.closest('tr[data-l]'); surligner(tr ? tr.dataset.l : null); });
  table.addEventListener('mouseleave', () => surligner(null));
  table.addEventListener('focusin', e => { const tr = e.target.closest('tr[data-l]'); surligner(tr ? tr.dataset.l : null); });
  $('#so-vue-svg').addEventListener('click', e => {
    const g = e.target.closest('g[data-l]');
    if (!g) return;
    const tr = table.querySelector(`tr[data-l="${g.dataset.l}"]`);
    if (!tr) return;
    surligner(g.dataset.l);
    tr.scrollIntoView({ behavior: 'smooth', block: 'center' });
    tr.classList.remove('is-flash');
    void tr.offsetWidth;   // relance l'animation
    tr.classList.add('is-flash');
    const f = tr.querySelector('.so-val:not([disabled]), select');
    if (f) f.focus({ preventScroll: true });
  });

  /* ---------- Import JSON ---------- */
  $('#so-import').addEventListener('change', async e => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try {
      const s = R.importer(await file.text());
      if (suivis[s.id] && !confirm(`Le suivi « ${s.pseudo || s.id} » existe déjà dans ce navigateur : le remplacer par le fichier importé ?`)) return;
      suivis[s.id] = s;
      ouvrirSuivi(s.id);
      dire(`Suivi « ${s.pseudo || s.id} » importé : ${s.examens.length} examen(s), ${s.lesions.length} lésion(s).`);
    } catch (err) { dire(err.message, true); }
  });

  /* ---------- Mode éphémère ---------- */
  const ephBox = $('#so-ephemere');
  ephBox.checked = ephemere;
  ephBox.addEventListener('change', () => {
    if (ephBox.checked) {
      if (!confirm('Mode éphémère : les suivis enregistrés dans ce navigateur vont être effacés, et plus rien ne sera gardé (exportez-les avant si besoin). Continuer ?')) { ephBox.checked = false; return; }
      ephemere = true;
      effacer(KEY.suivis);
      effacer(KEY.courant);
      ecrire(KEY.eph, true);
      dire('Mode éphémère : les suivis ouverts seront perdus à la fermeture de la page (pensez à exporter).');
    } else {
      ephemere = false;
      ecrire(KEY.eph, false);
      persister();
      dire('Mode éphémère désactivé : les suivis sont de nouveau enregistrés dans ce navigateur.');
    }
  });

  render();
})();
