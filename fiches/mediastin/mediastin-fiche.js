/* =========================================================
   RadiologicHub — fiche « Imagerie des masses médiastinales »
   ---------------------------------------------------------
   • médiastin en 3D (mediastin-3d.js) : chargé à l'arrivée à l'écran sur ordinateur,
     au clic sur « Voir en 3D » sur téléphone ; Heitzman (7) ou Felson (3), vues,
     transparence, liste des compartiments, panneau « ce qu'il contient » ;
   • liens « 3D » du texte (compartiments, tronc veineux innominé gauche) et cartes Felson ;
   • onglets (protocoles, médiastin antérieur), indices de la démarche étiologique ;
   • outils (regles/mediastin.js) : orientation tissulaire, goitre (types et grades),
     CSR, résécabilité, marqueurs germinaux, entraînement « Dans quel compartiment ? ».
   ========================================================= */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const R = window.RHRegles && window.RHRegles.mediastin;
const doux = () => (window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth');
const virgule = (v, n = 3) => v.toFixed(n).replace('.', ',');
const echapper = t => String(t).replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));

/* ---------- 3D ---------- */
const bloc = $('#mediastin-3d');
const scene = $('#md3d-scene');
const info = $('#md3d-info');
const liste = $('#md3d-liste');
const telephone = window.matchMedia('(max-width: 700px)');
const AIDE = info ? info.innerHTML : '';
let api = null, enCours = null, couleurs = {};
const hex = n => '#' + n.toString(16).padStart(6, '0');
// Textes de la fiche pour les structures montrées par un lien
const TEXTE_STRUCTURE = {
  'tvi-gauche': "Injection au bras gauche pour opacifier le tronc veineux innominé gauche : étudier sa perméabilité et baliser le médiastin de gauche vers la droite, séparant la chaîne médiastinale antérieure du plan artériel en arrière.",
};

function rendreInfo(d) {
  if (!d) { info.innerHTML = AIDE; info.style.removeProperty('--c'); return; }
  if (d.type === 'structure') {
    info.style.setProperty('--c', '#3c67b8');
    info.innerHTML = `<h4>${echapper(d.nom)}</h4>${TEXTE_STRUCTURE[d.id] ? `<p>${TEXTE_STRUCTURE[d.id]}</p>` : ''}`;
    return;
  }
  info.style.setProperty('--c', couleurs[d.id] || '#2a9d8f');
  if (d.systeme === 'felson') {
    const f = R && R.FELSON[d.id.slice(2)];
    if (!f) { info.innerHTML = `<h4>${echapper(d.nom)}</h4>`; return; }
    const l = (titre, t) => `<p><b>${titre}</b> : ${t.join(' ; ')}.</p>`;
    info.innerHTML = `<h4>Médiastin ${f.nom.toLowerCase()} — ${f.pct} %</h4><p>${f.examen} · ${f.type}</p>`
      + l('Tissulaire', f.tissulaire) + l('Kystique/kystisée', f.kystique) + l('Graisseuse', f.graisseuse);
    return;
  }
  const h = R && R.HEITZMAN.find(x => x.id === d.id);
  let t = `<h4>${echapper(d.nom)}${d.abr ? ` (${echapper(d.abr)})` : ''}</h4>`;
  if (h && h.vers) t += `<p>Médiastin para-orificiel : communique avec <span class="md-vers">${echapper(h.vers)}</span></p>`;
  t += h && h.cites.length ? `<p><b>Dans la fiche :</b></p><ul>${h.cites.map(c => `<li>${echapper(c)}</li>`).join('')}</ul>` : '<p class="md-aide">Pas de lésion rattachée à cet espace dans la fiche.</p>';
  info.innerHTML = t;
}
function majListe() {
  if (!api) return;
  const { systeme, choisi } = api.etat();
  liste.innerHTML = api.donnees.compartiments.filter(c => c.systeme === systeme).map(c =>
    `<button type="button" data-id="${c.id}" style="--c: ${couleurs[c.id]}" aria-pressed="${c.id === choisi}"${c.id === choisi ? ' class="is-on"' : ''}>${echapper(c.nom)}${c.abr ? ` <small>${echapper(c.abr)}</small>` : ''}</button>`).join('');
}
function majSysteme(s) {
  $$('[data-systeme]', bloc).forEach(b => { const on = b.dataset.systeme === s; b.classList.toggle('is-on', on); b.setAttribute('aria-pressed', String(on)); });
}
function charger() {
  if (enCours) return enCours;
  scene.innerHTML = '<p class="c3d-attente" role="status">Chargement du moteur 3D…</p>';
  enCours = import('./mediastin-3d.js?v=20261027100000')
    .then(m => { couleurs = Object.fromEntries(Object.entries(m.COULEURS).map(([k, v]) => [k, hex(v)])); return m.creerVisionneuse(scene, { base: bloc.dataset.modeles, onProgression: t => { const p = $('.c3d-attente', scene); if (p) p.textContent = t; } }); })
    .then(v => {
      api = v; bloc.rhApi = v; $('.c3d-attente', scene)?.remove(); bloc.classList.add('is-pret');
      scene.addEventListener('mediastin-compartiment', e => {
        rendreInfo(e.detail); majListe();
        const id = e.detail && e.detail.type === 'compartiment' ? e.detail.id : null;
        $$('.md-felson-c').forEach(b => b.classList.toggle('is-on', b.dataset.felson === id));
      });
      api.opacite($('#md3d-opacite').value / 100);
      api.estomper($('#md3d-estomper').checked);
      api.cotes($('#md3d-cotes').checked);
      majListe();
      return v;
    })
    .catch(e => {
      enCours = null;
      scene.innerHTML = `<div class="c3d-attente"><p>Vue 3D indisponible sur cet appareil : ${echapper(e.message || e)}</p><button type="button" class="btn btn-outline btn-sm" id="md3d-reessayer">Réessayer</button></div>`;
      $('#md3d-reessayer').addEventListener('click', charger);
    });
  return enCours;
}
function attente() {
  scene.innerHTML = '<div class="c3d-attente"><p><b>Médiastin en 3D</b> : os, cœur, vaisseaux, trachée, œsophage, thymus et les compartiments de Heitzman et de Felson (0,5 Mo).</p><button type="button" class="btn btn-ink" id="md3d-voir">Voir en 3D</button></div>';
  $('#md3d-voir').addEventListener('click', charger);
}
// Montrer un compartiment (h-…, f-…) ou une structure (tvi) dans la 3D
async function voir(id, defiler = true) {
  if (!bloc) return;
  if (defiler) bloc.scrollIntoView({ behavior: doux(), block: 'start' });
  await charger(); if (!api) return;
  if (id === 'tvi') { api.vue('face'); api.surligner('tvi-gauche'); return; }
  const s = id.startsWith('f-') ? 'felson' : 'heitzman';
  if (api.etat().systeme !== s) { api.systeme(s); majSysteme(s); }
  api.choisir(id);
}
if (bloc) {
  attente();
  if (!telephone.matches && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(e => { if (e.some(x => x.isIntersecting)) { io.disconnect(); charger(); } }, { rootMargin: '300px' });
    io.observe(bloc);
  }
  $$('[data-systeme]', bloc).forEach(b => b.addEventListener('click', async () => { await charger(); if (!api) return; api.systeme(b.dataset.systeme); majSysteme(b.dataset.systeme); }));
  $$('[data-vue]', bloc).forEach(b => b.addEventListener('click', async () => { await charger(); api && api.vue(b.dataset.vue); }));
  $('#md3d-opacite').addEventListener('input', async e => { await charger(); api && api.opacite(e.target.value / 100); });
  $('#md3d-estomper').addEventListener('change', async e => { await charger(); api && api.estomper(e.target.checked); });
  $('#md3d-cotes').addEventListener('change', async e => { await charger(); api && api.cotes(e.target.checked); });
  liste.addEventListener('click', e => {
    const b = e.target.closest('button[data-id]'); if (!b || !api) return;
    api.choisir(api.etat().choisi === b.dataset.id ? null : b.dataset.id);
  });
}
document.addEventListener('click', e => {
  const b = e.target.closest('.md-lien-3d[data-voir]'); if (b) voir(b.dataset.voir);
});

/* ---------- Felson : barres et lien vers la 3D ---------- */
const felson = $('.md-felson');
if (felson) {
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(e => { if (e.some(x => x.isIntersecting)) { felson.classList.add('is-vu'); io.disconnect(); } }, { threshold: .4 });
    io.observe(felson);
  } else felson.classList.add('is-vu');
  $$('[data-felson]', felson).forEach(b => b.addEventListener('click', () => voir(b.dataset.felson)));
}

/* ---------- Onglets (chaque groupe ne commande que ses panneaux) ---------- */
$$('.ch-onglets').forEach(groupe => {
  const boutons = $$('[data-onglet]', groupe);
  const panneaux = $$('.ch-panneau', groupe.closest('.fsec'));
  boutons.forEach(b => b.addEventListener('click', () => {
    boutons.forEach(x => x.setAttribute('aria-selected', String(x === b)));
    panneaux.forEach(p => { p.hidden = p.dataset.panneau !== b.dataset.onglet; });
  }));
});

/* ---------- Démarche étiologique : indices ---------- */
$$('.md-indice').forEach(b => {
  b.setAttribute('aria-pressed', 'false');
  b.addEventListener('click', () => b.setAttribute('aria-pressed', String(b.classList.toggle('is-vu'))));
});

/* ---------- Outils ---------- */
const verdict = (el, titre, niveau, texte) => {
  el.className = 'ch-verdict' + (niveau ? ' k-' + niveau : '');
  el.querySelector('b').textContent = titre; el.querySelector('span').textContent = texte;
};

// Orientation tissulaire
const orient = $('#md-orient');
if (orient && R) {
  const zone = $('.md-orient');
  const maj = () => {
    const uh = $('#md-uh').value; $('#md-uh-val').textContent = uh;
    const r = R.orientation({ uh, rehausse: $('input[name="rehausse"]:checked', orient).value, mixte: $('input[name="mixte"]', orient).checked });
    zone.classList.toggle('is-actif', !!r);
    $$('.md-oc').forEach(c => c.classList.toggle('is-on', !!r && c.dataset.cle === r.cle));
    if (r) verdict($('#md-orient-res'), r.nom, r.cle === 'indetermine' ? 'key' : '', r.texte);
  };
  orient.addEventListener('input', maj); orient.addEventListener('change', maj); maj();
}

// Goitre : types (sagittal : prévasculaire, rétrovasculaire, rétrotrachéal) et grades (crosse)
const goitreSvg = $('#md-goitre-svg');
function dessinGoitre(type, grade) {
  const x = { A: 56, B: 110, C: 172 }[type], bas = { 1: 104, 2: 146, 3: 196 }[grade];
  const haut = 30, m = (haut + bas) / 2, ry = (bas - haut) / 2;
  return `<svg viewBox="0 0 240 240" role="img" aria-label="Schéma de profil">
    <text x="6" y="232" font-size="9" font-weight="700" fill="#55545f">avant</text><text x="234" y="232" font-size="9" font-weight="700" fill="#55545f" text-anchor="end">arrière</text>
    <rect x="16" y="20" width="12" height="190" rx="5" fill="#eee6d2" stroke="#111" stroke-width="1.5"/>
    <rect x="76" y="10" width="20" height="200" rx="8" fill="#3c67b8" opacity=".35"/><text x="86" y="220" font-size="8" text-anchor="middle" fill="#3c67b8" font-weight="800">vaisseaux</text>
    <rect x="126" y="6" width="16" height="150" rx="7" fill="#9ad7d0" stroke="#2a9d8f" stroke-width="1.5"/><text x="134" y="168" font-size="8" text-anchor="middle" fill="#2a9d8f" font-weight="800">trachée</text>
    <rect x="148" y="6" width="10" height="204" rx="5" fill="#f0a37a" opacity=".8"/>
    ${[0, 1, 2, 3, 4, 5, 6].map(i => `<rect x="196" y="${12 + i * 29}" width="30" height="24" rx="4" fill="#eee6d2" stroke="#111" stroke-width="1.2"/>`).join('')}
    <path d="M86 170 C 90 112, 172 112, 178 170" fill="none" stroke="#c8102e" stroke-width="9" stroke-linecap="round" opacity=".85"/>
    <text x="132" y="108" font-size="9" text-anchor="middle" fill="#c8102e" font-weight="800">crosse de l'aorte</text>
    <ellipse cx="${x}" cy="${m}" rx="17" ry="${ry}" fill="#a0522d" opacity=".75" stroke="#5c2a12" stroke-width="2"/>
    <text x="${x}" y="${haut - 6}" font-size="10" text-anchor="middle" font-weight="900" fill="#5c2a12">${type}${grade}</text>
  </svg>`;
}
const goitreZone = $('.md-goitre');
if (goitreZone && R) {
  const maj = () => {
    const t = $('input[name="gtype"]:checked', goitreZone).value, g = $('input[name="ggrade"]:checked', goitreZone).value;
    verdict($('#md-goitre-res'), `Type ${t} · Grade ${g}`, 'key', `${R.TYPES_GOITRE[t]} ; ${R.GRADES_GOITRE[g]}.`);
    goitreSvg.innerHTML = dessinGoitre(t, g);
  };
  goitreZone.addEventListener('change', maj); maj();
}

// Chemical Shift Ratio
const csrForm = $('#md-csr');
if (csrForm && R) {
  const MIN = 0.3, MAX = 1.3, pos = v => Math.max(0, Math.min(100, (v - MIN) / (MAX - MIN) * 100));
  const bande = (el, [m, e]) => { el.style.left = pos(m - e) + '%'; el.style.width = (pos(m + e) - pos(m - e)) + '%'; };
  bande($('.md-csr-piste .is-h', csrForm), R.CSR.hyperplasie);
  bande($('.md-csr-piste .is-t', csrForm), R.CSR.tumeur);
  const curseur = $('#md-csr-curseur'), res = $('#md-csr-res');
  csrForm.addEventListener('input', () => {
    const v = Object.fromEntries($$('input', csrForm).map(i => [i.name, i.value]));
    const r = R.csr(v);
    if (!r) { curseur.hidden = true; verdict(res, '', '', ''); return; }
    curseur.hidden = false; curseur.style.left = pos(r.valeur) + '%'; curseur.dataset.v = virgule(r.valeur);
    const nom = { hyperplasie: 'Hyperplasie', tumeur: 'Tumeurs thymiques', intermediaire: 'Entre les deux plages' }[r.cle];
    const texte = r.cle === 'intermediaire' ? 'Hyperplasie : 0,614 +/- 0,13 ; tumeurs thymiques : 1,026 +/- 0,039.'
      : r.dansPlage ? `Dans la plage ${r.cle === 'hyperplasie' ? 'hyperplasie : 0,614 +/- 0,13' : 'tumeurs thymiques : 1,026 +/- 0,039'}.` : 'Hors des plages de la fiche, du côté indiqué.';
    verdict(res, `CSR = ${virgule(r.valeur)} → ${nom}`, { hyperplasie: 'sign', tumeur: 'grave', intermediaire: 'key' }[r.cle], texte);
  });
}

// Résécabilité
const resec = $('#md-resec');
if (resec) resec.addEventListener('change', () => {
  const c = $$('input', resec), n = c.filter(i => i.checked).length;
  $('#md-resec-n').textContent = `${n} / ${c.length} points vérifiés`;
});

// Tumeurs germinales : marqueurs
const germ = $('#md-germ');
if (germ && R) {
  const lignes = $$('.md-germ-table tbody tr');
  const maj = () => {
    const l = R.germinale({ afp: $('input[name="afp"]:checked', germ).value, bhcg: $('input[name="bhcg"]:checked', germ).value });
    $('#md-germ-res').innerHTML = l.map(t => `<li>${echapper(t)}</li>`).join('');
    const noms = l.map(t => t.split(' (')[0]);
    lignes.forEach(tr => tr.classList.toggle('is-on', noms.includes($('td b', tr).textContent)));
  };
  germ.addEventListener('change', maj); maj();
}

/* ---------- Testez-vous : dans quel compartiment ? ---------- */
const zoneCas = $('#md-cas');
if (zoneCas && R) {
  const CHOIX = [['anterieur', 'Antérieur', 'var(--amber)'], ['moyen', 'Moyen', 'var(--blue)'], ['posterieur', 'Postérieur', 'var(--green)']];
  let score = 0;
  const majScore = () => { $('#md-score').textContent = `${score} / ${R.CAS.length}`; };
  const rendre = () => {
    score = 0; majScore(); zoneCas.innerHTML = '';
    R.CAS.forEach((c, i) => {
      const el = document.createElement('div'); el.className = 'ti-cas-c';
      el.innerHTML = `<p><span class="ti-cas-n">${i + 1}</span>${echapper(c.texte)}</p><div class="ti-cas-choix">${CHOIX.map(([k, n, col]) => `<button type="button" data-k="${k}" style="--c: ${col}">${n}</button>`).join('')}</div><p class="ti-cas-rep" aria-live="polite"></p>`;
      $$('button', el).forEach(b => b.addEventListener('click', () => {
        if (el.classList.contains('is-fait')) return;
        el.classList.add('is-fait');
        const ok = b.dataset.k === c.rep;
        if (ok) score++; majScore();
        $$('button', el).forEach(x => x.classList.toggle('is-ok', x.dataset.k === c.rep));
        if (!ok) b.classList.add('is-faux');
        $('.ti-cas-rep', el).innerHTML = `${ok ? '✓' : '✗'} <b>Médiastin ${R.FELSON[c.rep].nom.toLowerCase()}</b> (${R.FELSON[c.rep].pct} %) <button type="button" class="md-lien-3d" data-voir="f-${c.rep}">voir en 3D</button>`;
      }));
      zoneCas.appendChild(el);
    });
  };
  rendre();
  $('#md-cas-reset').addEventListener('click', rendre);
}
