/* =========================================================
   RadiologicHub — fiche « Fractures de l'extrémité distale du radius »
   ---------------------------------------------------------
   • vue 3D des os de la main et du poignet (poignet-3d.js), chargée quand elle
     arrive à l'écran sur ordinateur, au clic sur « Voir en 3D » sur téléphone ;
   • boutons des mesures et des repères (barre de la vue 3D et liens de la partie VII) ;
   • réglette de la bascule du fragment distal (schéma de profil, fiches/poignet/schemas.js) ;
   • vérification des seuils de l'AAOS (regles/radius-distal.js).
   ========================================================= */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const bloc = $('#poignet-3d');
const scene = $('#p3d-scene');
const info = $('#p3d-info');
const telephone = window.matchMedia('(max-width: 700px)');
let api = null, enCours = null;

function charger() {
  if (enCours) return enCours;
  scene.innerHTML = '<p class="c3d-attente" role="status">Chargement du moteur 3D…</p>';
  enCours = import('./poignet-3d.js?v=20261025120000')
    .then(({ creerVisionneuse }) => creerVisionneuse(scene, { base: bloc.dataset.modeles, onProgression: t => { const p = $('.c3d-attente', scene); if (p) p.textContent = t; } }))
    .then(v => {
      api = v; bloc.rhApi = v; $('.c3d-attente', scene)?.remove(); bloc.classList.add('is-pret');
      scene.addEventListener('poignet-os', e => { if (e.detail) info.innerHTML = `<b>${e.detail.nom}</b>`; });
      return v;
    })
    .catch(e => {
      enCours = null;
      scene.innerHTML = `<div class="c3d-attente"><p>Vue 3D indisponible sur cet appareil : ${String(e.message || e).replace(/[<>&]/g, '')}</p><button type="button" class="btn btn-outline btn-sm" id="p3d-reessayer">Réessayer</button></div>`;
      $('#p3d-reessayer').addEventListener('click', charger);
    });
  return enCours;
}
function attente() {
  scene.innerHTML = `<div class="c3d-attente"><p><b>Os de la main et du poignet en 3D</b> (0,4 Mo).</p><button type="button" class="btn btn-ink" id="p3d-voir">Voir en 3D</button></div>`;
  $('#p3d-voir').addEventListener('click', charger);
}

const TEXTES_MESURES = {
  inclinaison: 'Inclinaison radiale : angle entre la ligne styloïde radiale → coin ulnaire et la perpendiculaire à l\'axe du radius (face). Normale ≈ 22°.',
  hauteur: 'Hauteur radiale : écart le long de l\'axe entre la pointe de la styloïde et le coin ulnaire (face). Normale ≈ 11 mm ; fixation si raccourcissement > 3 mm.',
  palmaire: 'Inclinaison palmaire : angle entre la ligne rebord dorsal → rebord palmaire et la perpendiculaire à l\'axe (profil). Normale ≈ 11° ; fixation si bascule dorsale > 10°.',
};
function majBoutons(etat) {
  $$('[data-mesure]', bloc).forEach(b => { const on = etat.mesure === b.dataset.mesure; b.classList.toggle('is-on', on); b.setAttribute('aria-pressed', on); });
  $$('[data-repere]', bloc).forEach(b => { const on = etat.repere === b.dataset.repere; b.classList.toggle('is-on', on); b.setAttribute('aria-pressed', on); });
  info.textContent = etat.mesure ? TEXTES_MESURES[etat.mesure] : etat.repere ? api.REPERES[etat.repere].texte : 'Choisissez une mesure ou un repère, ou cliquez un os.';
}
$$('[data-mesure]', bloc).forEach(b => b.addEventListener('click', async () => { await charger(); api.mesure(b.dataset.mesure); majBoutons(api.etat()); }));
$$('[data-repere]', bloc).forEach(b => b.addEventListener('click', async () => { await charger(); api.repere(b.dataset.repere); majBoutons(api.etat()); }));
$$('.p-lien-3d').forEach(b => b.addEventListener('click', async () => {
  bloc.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  await charger();
  if (api.etat().repere !== b.dataset.repere) api.repere(b.dataset.repere);
  majBoutons(api.etat());
}));
$$('[data-vue]', bloc).forEach(b => b.addEventListener('click', async () => { await charger(); api.vue(b.dataset.vue); }));
$$('[data-calque]', bloc).forEach(c => c.addEventListener('change', async () => { await charger(); api.calque(c.dataset.calque, c.checked); }));

if (bloc) {
  attente();
  if (!telephone.matches && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(e => { if (e.some(x => x.isIntersecting)) { io.disconnect(); charger(); } }, { rootMargin: '300px' });
    io.observe(bloc);
  }
}

/* ---------- Réglette : bascule du fragment distal ---------- */
const reglette = $('#p-bascule'), sortie = $('#p-bascule-val'), vivant = $('#p-profil-vivant');
if (reglette && window.RHPoignet) {
  const maj = () => {
    const t = +reglette.value;
    vivant.innerHTML = window.RHPoignet.profil({ tilt: t, dx: t < 0 ? Math.min(10, -t * 0.3) : 0, seuil: true, titre: 'PROFIL' });
    sortie.textContent = t === 0 ? '0°' : t < 0 ? `bascule dorsale ${-t}°` : `inclinaison palmaire ${t}°`;
    sortie.classList.toggle('is-alerte', t < -10);
  };
  reglette.addEventListener('input', maj);
}

/* ---------- Seuils de l'AAOS ---------- */
const calc = $('#p-calc');
if (calc && window.RHRegles && window.RHRegles.radiusDistal) {
  const R = window.RHRegles.radiusDistal;
  const maj = () => {
    const v = Object.fromEntries(['sagittale', 'raccourcissement', 'marche', 'age'].map(n => [n, calc.elements[n].value.replace('−', '-')]));
    const r = R.evaluer(v);
    $('#p-calc-res').innerHTML = r.criteres.map(c => `<li class="${c.depasse ? 'is-depasse' : 'is-ok'}"><b>${c.nom}</b> : ${c.valeur} <small>(seuil ${c.seuil})</small></li>`).join('');
    const concl = $('#p-calc-concl');
    concl.textContent = r.conclusion;
    concl.className = 'p-calc-concl' + (r.depasses && r.depasses.length ? ' is-depasse' : r.criteres.length ? ' is-ok' : '');
  };
  calc.addEventListener('input', maj);
}
