/* =========================================================
   RadiologicHub — fiche « Cancer du cavum » : liens entre la page et la vue 3D
   ---------------------------------------------------------
   • vue 3D (fiches/cavum/cavum-3d.js) chargée quand elle arrive à l'écran sur
     ordinateur, au clic sur « Voir en 3D » sur téléphone ;
   • directions de propagation, vues, calques, liste des trajets ;
   • cartes T1 à T4 : affichent le stade dans la vue 3D ;
   • calculateur du stade (regles/tnm-cavum.js).
   ========================================================= */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const bloc = $('#cavum-3d');
const scene = $('#c3d-scene');
const telephone = window.matchMedia('(max-width: 700px)');
let api = null, enCours = null;

function charger() {
  if (enCours) return enCours;
  scene.innerHTML = '<p class="c3d-attente" role="status">Chargement du moteur 3D…</p>';
  enCours = import('./cavum-3d.js')
    .then(({ creerVisionneuse }) => creerVisionneuse(scene, {
      base: bloc.dataset.modeles,
      onProgression: t => { const p = $('.c3d-attente', scene); if (p) p.textContent = t; },
    }))
    .then(v => {
      api = v; bloc.rhApi = v; $('.c3d-attente', scene)?.remove();
      listeTrajets(); bloc.classList.add('is-pret');
      return v;
    })
    .catch(e => {
      enCours = null;
      scene.innerHTML = `<div class="c3d-attente"><p>Vue 3D indisponible sur cet appareil : ${String(e.message || e).replace(/[<>&]/g, '')}</p>
        <button type="button" class="btn btn-outline btn-sm" id="c3d-reessayer">Réessayer</button></div>`;
      $('#c3d-reessayer').addEventListener('click', charger);
    });
  return enCours;
}

function attente() {
  scene.innerHTML = `<div class="c3d-attente"><p><b>Base du crâne, foramens et espaces profonds en 3D</b> (0,6 Mo).</p>
    <button type="button" class="btn btn-ink" id="c3d-voir">Voir en 3D</button></div>`;
  $('#c3d-voir').addEventListener('click', charger);
}

function listeTrajets() {
  const ol = $('#c3d-trajets'); const voie = $('.c3d-voie.is-on')?.dataset.voie || 'toutes';
  ol.innerHTML = '';
  for (const t of api.trajets) {
    if (voie !== 'toutes' && t.voie !== voie) continue;
    const li = document.createElement('li');
    const b = document.createElement('button'); b.type = 'button'; b.textContent = t.texte; b.dataset.trajet = t.id;
    b.addEventListener('click', () => {
      api.trajet(t.id);
      const on = api.etat().trajet === t.id;
      $$('button', ol).forEach(x => x.classList.toggle('is-on', on && x === b));
    });
    li.appendChild(b); ol.appendChild(li);
  }
}

$$('.c3d-voie').forEach(b => b.addEventListener('click', async () => {
  $$('.c3d-voie').forEach(x => { x.classList.toggle('is-on', x === b); x.setAttribute('aria-pressed', x === b); });
  $$('.tnm-carte').forEach(x => x.classList.remove('is-on'));
  await charger(); api.voie(b.dataset.voie); listeTrajets();
}));
$$('[data-vue]').forEach(b => b.addEventListener('click', async () => { await charger(); api.vue(b.dataset.vue); }));
$$('[data-calque]').forEach(c => c.addEventListener('change', async () => { await charger(); api.calque(c.dataset.calque, c.checked); }));

$$('.tnm-carte').forEach(c => c.addEventListener('click', async () => {
  bloc.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  await charger();
  const s = api.stade(c.dataset.t);
  $$('.tnm-carte').forEach(x => x.classList.toggle('is-on', x === c && s === c.dataset.t));
  $$('.c3d-voie').forEach(x => { x.classList.toggle('is-on', false); x.setAttribute('aria-pressed', false); });
  bloc.dataset.stade = s || '';
}));

/* ---------- Calculateur du stade ---------- */
const calc = $('#tnm-calc');
if (calc && window.RHRegles && window.RHRegles.tnmCavum) {
  const R = window.RHRegles.tnmCavum;
  const majStade = () => {
    const v = n => $(`input[name="${n}"]:checked`, calc).value;
    const t = v('t'), n = v('n'), m = v('m'), s = R.stade(t, n, m);
    $('#tnm-resultat').innerHTML = `<span class="tnm-stade" data-stade="${s}">Stade ${s}</span><span class="tnm-detail"><b>${t}</b> ${R.T[t]}<br><b>${n}</b> ${R.N[n]}<br><b>${m}</b> ${R.M[m]}</span>`;
  };
  calc.addEventListener('change', majStade); majStade();
}

/* ---------- Démarrage de la vue 3D ---------- */
if (bloc) {
  attente();
  if (!telephone.matches && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(e => { if (e.some(x => x.isIntersecting)) { io.disconnect(); charger(); } }, { rootMargin: '300px' });
    io.observe(bloc);
  }
}
