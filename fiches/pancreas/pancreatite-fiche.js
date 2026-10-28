/* =========================================================
   RadiologicHub — fiche « Imagerie de la pancréatite aiguë »
   ---------------------------------------------------------
   • pancréas en 3D (pancreas-3d.js) : chargé à l'arrivée à l'écran sur ordinateur,
     au clic sur « Voir en 3D » sur téléphone ; segments, vues, écartement, voisins ;
   • coupes axiales (pancreas-svg.js, RHPancreas) : segment choisi synchronisé avec la 3D,
     espaces cliquables, deux niveaux ; collections d'Atlanta dans leur siège typique ;
   • outils (regles/pancreatite.js) : moment du scanner, dose de contraste, Atlanta
     (diagnostic, sévérité), CTSI ; schémas (nécrose, déconnexion, divisum, annulaire) ;
   • onglets des étiologies, entraînement « Quelle collection ? ».
   ========================================================= */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const P = window.RHPancreas, R = window.RHRegles && window.RHRegles.pancreatite;
const echapper = t => String(t).replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));
const doux = () => (matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth');
const verdict = (el, titre, niveau, texte) => {
  el.className = 'ch-verdict' + (niveau ? ' k-' + niveau : '');
  $('b', el).textContent = titre; $('span', el).textContent = texte;
};
const valeurs = form => {
  const o = {};
  $$('input', form).forEach(i => { if (i.type === 'radio') { if (i.checked) o[i.name] = i.value; } else if (i.type === 'checkbox') o[i.name] = i.checked; else o[i.name] = i.value; });
  return o;
};

/* ---------- Coupe « anatomie » : état partagé avec la 3D ---------- */
const coupeA = { niveau: 'haut', espace: null, segment: null, tous: false };
const NIVEAU_DU_SEGMENT = { crochet: 'bas', isthme: 'haut', corps: 'haut', queue: 'haut' };
function dessinerCoupeA() {
  const fig = $('#pa-coupe-svg'); if (!fig || !P) return;
  fig.innerHTML = P.coupe({ niveau: coupeA.niveau, espace: coupeA.espace, segment: coupeA.segment, espaces: coupeA.tous, interactif: true });
  const ids = P.espacesDuNiveau(coupeA.niveau);
  $('#pa-espaces').innerHTML = ids.map(id => `<button type="button" data-espace-b="${id}" style="--c: ${P.ESPACES[id].couleur}"${coupeA.espace === id ? ' class="is-on"' : ''}>${P.ESPACES[id].nom}</button>`).join('');
  const t = $('#pa-espace-texte');
  if (coupeA.espace && P.ESPACES[coupeA.espace]) { const e = P.ESPACES[coupeA.espace]; t.style.setProperty('--c', e.couleur); t.innerHTML = `<h4>${e.nom}</h4><p>${echapper(e.texte)}</p>`; }
  else if (coupeA.segment) { const g = P.SEGMENTS[coupeA.segment]; t.style.setProperty('--c', g.couleur); t.innerHTML = `<h4>${g.nom}</h4><p>${echapper(g.texte)}</p>`; }
  else t.innerHTML = '<p class="md-aide">Choisissez un espace : il se colore et ses limites s\'affichent.</p>';
  $$('input[name="niveau"]', $('#pa-coupe-anat')).forEach(i => { i.checked = i.value === coupeA.niveau; });
}
function choisirSegment(seg, depuis3d = false) {
  coupeA.segment = seg; coupeA.espace = null;
  if (seg && NIVEAU_DU_SEGMENT[seg]) coupeA.niveau = NIVEAU_DU_SEGMENT[seg];
  dessinerCoupeA();
  $$('[data-seg]').forEach(b => { const on = b.dataset.seg === seg; b.classList.toggle('is-on', on); b.setAttribute('aria-pressed', String(on)); });
  if (!depuis3d && api) api.choisir(seg ? 'pancreas-' + seg : null);
  if (!depuis3d && !api && seg) charger().then(() => api && api.choisir('pancreas-' + seg));
}
const anat = $('#pa-coupe-anat');
if (anat && P) {
  anat.addEventListener('change', e => {
    if (e.target.name === 'niveau') { coupeA.niveau = e.target.value; if (coupeA.segment === 'crochet' && coupeA.niveau === 'haut') coupeA.segment = null; dessinerCoupeA(); }
    if (e.target.name === 'tous') { coupeA.tous = e.target.checked; dessinerCoupeA(); }
  });
  anat.addEventListener('click', e => {
    const b = e.target.closest('[data-espace-b]');
    if (b) { coupeA.espace = coupeA.espace === b.dataset.espaceB ? null : b.dataset.espaceB; coupeA.segment = null; dessinerCoupeA(); return; }
    const seg = e.target.closest('[data-segment]');
    if (seg) { choisirSegment(coupeA.segment === seg.dataset.segment ? null : seg.dataset.segment); return; }
    const esp = e.target.closest('[data-espace]');
    if (esp) { coupeA.espace = coupeA.espace === esp.dataset.espace ? null : esp.dataset.espace; coupeA.segment = null; dessinerCoupeA(); }
  });
  dessinerCoupeA();
}

/* ---------- 3D ---------- */
const bloc = $('#pancreas-3d');
const scene = $('#pa3d-scene');
const info = $('#pa3d-info');
const AIDE = info ? info.innerHTML : '';
const telephone = matchMedia('(max-width: 700px)');
let api = null, enCours = null, couleursSeg = {};
function rendreInfo(d) {
  if (!d) { info.innerHTML = AIDE; return; }
  if (d.segment && P) {
    const g = P.SEGMENTS[d.segment];
    info.style.setProperty('--c', g.couleur);
    info.innerHTML = `<h4>${echapper(g.nom)}</h4><p>${echapper(g.texte)}</p>`;
  } else { info.style.setProperty('--c', '#888'); info.innerHTML = `<h4>${echapper(d.nom)}</h4>`; }
}
function charger() {
  if (enCours) return enCours;
  scene.innerHTML = '<p class="c3d-attente" role="status">Chargement du moteur 3D…</p>';
  enCours = import('./pancreas-3d.js?v=20261028100000')
    .then(m => { couleursSeg = m.SEGMENTS; return m.creerVisionneuse(scene, { base: bloc.dataset.modeles, onProgression: t => { const p = $('.c3d-attente', scene); if (p) p.textContent = t; } }); })
    .then(v => {
      api = v; bloc.rhApi = v; $('.c3d-attente', scene)?.remove(); bloc.classList.add('is-pret');
      scene.addEventListener('pancreas-segment', e => {
        rendreInfo(e.detail);
        const seg = e.detail && e.detail.segment;
        if (seg !== undefined || !e.detail) choisirSegment(seg || null, true);
      });
      if (coupeA.segment) api.choisir('pancreas-' + coupeA.segment);
      return v;
    })
    .catch(e => {
      enCours = null;
      scene.innerHTML = `<div class="c3d-attente"><p>Vue 3D indisponible sur cet appareil : ${echapper(e.message || e)}</p><button type="button" class="btn btn-outline btn-sm" id="pa3d-reessayer">Réessayer</button></div>`;
      $('#pa3d-reessayer').addEventListener('click', charger);
    });
  return enCours;
}
if (bloc) {
  scene.innerHTML = '<div class="c3d-attente"><p><b>Pancréas en 3D</b> : tête, crochet, isthme, corps, queue, duodénum, rate, reins, vaisseaux et canaux (0,5 Mo).</p><button type="button" class="btn btn-ink" id="pa3d-voir">Voir en 3D</button></div>';
  $('#pa3d-voir').addEventListener('click', charger);
  if (!telephone.matches && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(e => { if (e.some(x => x.isIntersecting)) { io.disconnect(); charger(); } }, { rootMargin: '300px' });
    io.observe(bloc);
  }
  $$('[data-seg]', bloc).forEach(b => b.addEventListener('click', () => choisirSegment(coupeA.segment === b.dataset.seg ? null : b.dataset.seg)));
  $$('[data-vue]', bloc).forEach(b => b.addEventListener('click', async () => { await charger(); api && api.vue(b.dataset.vue); }));
  $('#pa3d-ecart').addEventListener('input', async e => { await charger(); api && api.ecart(e.target.value / 100 * 0.8); });
  $('#pa3d-voisins').addEventListener('change', async e => { await charger(); api && api.voisins(e.target.checked); });
  $('#pa3d-canaux').addEventListener('change', async e => { await charger(); api && api.canaux(e.target.checked); });
  $('#pa3d-digestif').addEventListener('change', async e => { await charger(); api && api.digestif(e.target.checked); });
}
$$('[data-voir-seg]').forEach(b => b.addEventListener('click', () => {
  bloc.scrollIntoView({ behavior: doux(), block: 'start' });
  choisirSegment(b.dataset.voirSeg);
}));

/* ---------- Schémas ---------- */
if (P) $$('figure[data-pa]').forEach(f => f.insertAdjacentHTML('afterbegin', P[f.dataset.pa](f.dataset.type)));
const gaz = $('#pa-gaz');
if (gaz && P) gaz.innerHTML = P.coupe({ niveau: 'haut', collection: 'can', gaz: true }) + '<figcaption class="md-aide">Bulles de gaz dans une collection nécrotique : surinfection (schéma).</figcaption>';

/* ---------- Collections d'Atlanta ---------- */
const grille = $('.pa-grille');
if (grille && P) {
  const montrer = cle => {
    $$('[data-col]', grille).forEach(b => b.classList.toggle('is-on', b.dataset.col === cle));
    const c = P.COLLECTIONS[cle];
    $('#pa-col-svg').innerHTML = P.coupe({ niveau: 'haut', collection: cle });
    $('#pa-col-texte').innerHTML = `<p class="ti-outil-titre">${c.abr} · ${echapper(c.nom)}</p><p><b>${c.delai}</b> · ${c.forme === 'POI' ? 'Pancréatite Oedémato-Interstitielle (POI)' : 'Pancréatite Nécrosante (PN)'}</p><ul class="pa-col-items">${c.items.map(i => `<li>${echapper(i)}</li>`).join('')}</ul><p>${echapper(c.siege)}</p>`;
  };
  $$('[data-col]', grille).forEach(b => b.addEventListener('click', () => montrer(b.dataset.col)));
  montrer('can');
}

/* ---------- Moment du scanner ---------- */
const moment = $('#pa-moment');
if (moment && R) {
  const maj = () => {
    const o = valeurs(moment);
    $('#pa-h').textContent = o.heures;
    $('#pa-h-curseur').style.left = Math.min(100, o.heures / 240 * 100) + '%';
    const r = R.momentTdm({ heures: o.heures, doute: o.doute, grave: o.grave });
    const niveau = { emblee: 'grave', tot: 'grave', possible: 'key', bien: 'sign', ideal: 'sign', tard: 'key' }[r.cle];
    verdict($('#pa-moment-res'), { emblee: 'Scanner d\'emblée', tot: 'Attendre', possible: '48-72 h', bien: '≥ 72 h', ideal: '5-7 j', tard: 'Phase tardive' }[r.cle], niveau, r.texte);
  };
  moment.addEventListener('input', maj); moment.addEventListener('change', maj); maj();
}

/* ---------- Dose de contraste ---------- */
const dose = $('#pa-dose');
if (dose && R) {
  const maj = () => {
    const p = $('input[name="poids"]', dose).value; $('#pa-poids').textContent = p;
    const r = R.contraste(p);
    verdict($('#pa-dose-res'), `${r.min} à ${r.max} cc`, 'key', `1.5-2cc/kg × ${p} kg ; débit ${r.debit}.`);
  };
  dose.addEventListener('input', maj); maj();
}

/* ---------- Atlanta : diagnostic ---------- */
const atl = $('#pa-atlanta');
if (atl && R) {
  const maj = () => {
    const r = R.atlantaDiagnostic(valeurs(atl));
    if (!r.n) { verdict($('#pa-atlanta-res'), '', '', ''); return; }
    verdict($('#pa-atlanta-res'), r.retenu ? `Diagnostic retenu (${r.n} / 3)` : `${r.n} / 3 : insuffisant`, r.retenu ? 'sign' : 'key',
      r.retenu && r.sansImagerie ? 'Le dg peut être posé sans recours à l\'imagerie si les critères cliniques et biologiques sont présents.' : r.retenu ? 'Au moins 2 des 3 critères.' : 'Dans le cas contraire, l\'imagerie et principalement la TDM participe au dg positif.');
  };
  atl.addEventListener('change', maj);
}

/* ---------- Atlanta : sévérité ---------- */
const sev = $('#pa-sev');
if (sev && R) {
  const maj = () => {
    const r = R.severite(valeurs(sev));
    $$('[data-sev]', sev).forEach(s => s.classList.toggle('is-on', !!r && s.dataset.sev === r.cle));
    if (r) verdict($('#pa-sev-res'), r.nom, { peu: 'sign', moderee: 'key', grave: 'grave' }[r.cle], r.texte);
  };
  sev.addEventListener('change', maj); maj();
}

/* ---------- CTSI ---------- */
const ctsi = $('#pa-ctsi');
if (ctsi && R) {
  $('[data-groupe="balthazar"]', ctsi).innerHTML = Object.entries(R.BALTHAZAR).map(([k, v], i) => `<label><input type="radio" name="balthazar" value="${k}"${i === 0 ? ' checked' : ''}><b>${k} · ${v.points} pt${v.points > 1 ? 's' : ''}</b>${echapper(v.texte)}</label>`).join('');
  $('[data-groupe="necrose"]', ctsi).innerHTML = Object.entries(R.NECROSE).map(([k, v], i) => `<label><input type="radio" name="necrose" value="${k}"${i === 0 ? ' checked' : ''}><b>${v.points} pts</b>${echapper(v.texte)}</label>`).join('');
  $('.pa-prono tbody', ctsi).innerHTML = R.PRONOSTIC.map(p => `<tr data-max="${p.max}"><td>${p.libelle}</td><td>${p.morbidite}</td><td>${p.mortalite}</td></tr>`).join('');
  const maj = () => {
    const o = valeurs(ctsi), r = R.ctsi(o.balthazar, o.necrose);
    $('#pa-index b').textContent = r.index;
    $$('.pa-prono tbody tr', ctsi).forEach(tr => tr.classList.toggle('is-on', +tr.dataset.max === r.max));
  };
  ctsi.addEventListener('change', maj); maj();
}

/* ---------- Onglets des étiologies ---------- */
$$('.ch-onglets').forEach(groupe => {
  const boutons = $$('[data-onglet]', groupe), panneaux = $$('.ch-panneau', groupe.closest('.fsec'));
  boutons.forEach(b => b.addEventListener('click', () => {
    boutons.forEach(x => x.setAttribute('aria-selected', String(x === b)));
    panneaux.forEach(p => { p.hidden = p.dataset.panneau !== b.dataset.onglet; });
  }));
});

/* ---------- Testez-vous ---------- */
const zone = $('#pa-cas');
if (zone && R) {
  const COUL = { clap: '#f5b27a', can: '#d98c8c', pk: '#e57c2a', nop: '#a33b3b' };
  let score = 0;
  const majScore = () => { $('#pa-score').textContent = `${score} / ${R.CAS.length}`; };
  const rendre = () => {
    score = 0; majScore(); zone.innerHTML = '';
    R.CAS.forEach((c, i) => {
      const el = document.createElement('div'); el.className = 'ti-cas-c';
      el.innerHTML = `<p><span class="ti-cas-n">${i + 1}</span>${echapper(c.texte)}</p><div class="ti-cas-choix">${Object.entries(R.COLLECTIONS).map(([k, v]) => `<button type="button" data-k="${k}" style="--c: ${COUL[k]}">${v.abr}</button>`).join('')}</div><p class="ti-cas-rep" aria-live="polite"></p>`;
      $$('button', el).forEach(b => b.addEventListener('click', () => {
        if (el.classList.contains('is-fait')) return;
        el.classList.add('is-fait');
        const ok = b.dataset.k === c.rep;
        if (ok) score++; majScore();
        $$('button', el).forEach(x => x.classList.toggle('is-ok', x.dataset.k === c.rep));
        if (!ok) b.classList.add('is-faux');
        const col = P ? P.COLLECTIONS[c.rep] : null;
        $('.ti-cas-rep', el).innerHTML = `${ok ? '✓' : '✗'} <b>${R.COLLECTIONS[c.rep].abr}</b> — ${echapper(R.COLLECTIONS[c.rep].nom)}${col ? ` (${col.delai}, ${col.items.join(', ')})` : ''}`;
      }));
      zone.appendChild(el);
    });
  };
  rendre();
  $('#pa-cas-reset').addEventListener('click', rendre);
}
