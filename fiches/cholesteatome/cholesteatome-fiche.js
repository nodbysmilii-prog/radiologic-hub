/* =========================================================
   RadiologicHub — fiche « Cholestéatome »
   ---------------------------------------------------------
   • rocher en 3D (rocher-3d.js) : chargé à l'arrivée à l'écran sur ordinateur,
     au clic sur « Voir en 3D » sur téléphone ; parcours, vues, opacité de l'os, coupe axiale ;
   • liens « 3D » du texte (compartiments, structures à risque) ;
   • clichés : un clic masque ou affiche nos tracés ;
   • curseur de pneumatisation mastoïdienne ;
   • histoire naturelle animée à l'arrivée à l'écran ;
   • onglets des compartiments ;
   • outils (regles/cholesteatome.js) : OMC ou cholestéatome, tissu en IRM, compte rendu guidé.
   ========================================================= */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const R = window.RHRegles && window.RHRegles.cholesteatome;

/* ---------- 3D ---------- */
const bloc = $('#rocher-3d');
const scene = $('#r3d-scene');
const info = $('#r3d-info');
const telephone = window.matchMedia('(max-width: 700px)');
let api = null, enCours = null;

function charger() {
  if (enCours) return enCours;
  scene.innerHTML = '<p class="c3d-attente" role="status">Chargement du moteur 3D…</p>';
  enCours = import('./rocher-3d.js?v=20261026120000')
    .then(({ creerVisionneuse }) => creerVisionneuse(scene, { base: bloc.dataset.modeles, onProgression: t => { const p = $('.c3d-attente', scene); if (p) p.textContent = t; } }))
    .then(v => {
      api = v; bloc.rhApi = v; $('.c3d-attente', scene)?.remove(); bloc.classList.add('is-pret');
      scene.addEventListener('rocher-structure', e => {
        info.innerHTML = e.detail ? `<b>${e.detail.nom}</b><br>${e.detail.texte || ''}` : 'Choisissez un parcours ou cliquez une structure.';
      });
      api.opaciteOs(1 - $('#r3d-os').value / 100 * 0.92);
      return v;
    })
    .catch(e => {
      enCours = null;
      scene.innerHTML = `<div class="c3d-attente"><p>Vue 3D indisponible sur cet appareil : ${String(e.message || e).replace(/[<>&]/g, '')}</p><button type="button" class="btn btn-outline btn-sm" id="r3d-reessayer">Réessayer</button></div>`;
      $('#r3d-reessayer').addEventListener('click', charger);
    });
  return enCours;
}
function attente() {
  scene.innerHTML = '<div class="c3d-attente"><p><b>Rocher droit en 3D</b> : osselets, labyrinthe, nerf facial, vaisseaux (0,7 Mo).</p><button type="button" class="btn btn-ink" id="r3d-voir">Voir en 3D</button></div>';
  $('#r3d-voir').addEventListener('click', charger);
}
function majParcours() {
  const p = api.etat().parcours;
  $$('[data-parcours]', bloc).forEach(b => { const on = b.dataset.parcours === p; b.classList.toggle('is-on', on); b.setAttribute('aria-pressed', on); });
  info.textContent = p ? api.PARCOURS[p].texte : 'Choisissez un parcours ou cliquez une structure.';
}
async function parcours(nom, forcer) {
  await charger();
  if (!forcer || api.etat().parcours !== nom) api.parcours(nom);
  majParcours();
}
if (bloc) {
  attente();
  if (!telephone.matches && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(e => { if (e.some(x => x.isIntersecting)) { io.disconnect(); charger(); } }, { rootMargin: '300px' });
    io.observe(bloc);
  }
  $$('[data-parcours]', bloc).forEach(b => b.addEventListener('click', () => parcours(b.dataset.parcours)));
  $$('[data-vue]', bloc).forEach(b => b.addEventListener('click', async () => { await charger(); api.vue(b.dataset.vue); }));
  $('#r3d-os').addEventListener('input', async e => { await charger(); api.opaciteOs(1 - e.target.value / 100 * 0.92); });
  const coupeOn = $('#r3d-coupe-on'), coupe = $('#r3d-coupe');
  const majCoupe = async () => {
    await charger(); coupe.disabled = !coupeOn.checked;
    if (!coupeOn.checked) return api.coupe(null);
    const [lo, hi] = api.bornes; api.coupe(lo + (hi - lo) * coupe.value / 100);
  };
  coupeOn.addEventListener('change', majCoupe); coupe.addEventListener('input', majCoupe);
}
$$('.ch-lien-3d').forEach(b => b.addEventListener('click', async () => {
  bloc.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  await parcours(b.dataset.parcours, true);
}));

/* ---------- Clichés : tracés ---------- */
$$('.ch-fig[data-traces]').forEach(f => {
  f.tabIndex = 0; f.setAttribute('role', 'button'); f.setAttribute('aria-pressed', 'true');
  f.title = 'Cliquez pour masquer ou afficher les tracés';
  const bascule = () => { const sans = f.classList.toggle('is-sans-traces'); f.setAttribute('aria-pressed', String(!sans)); };
  f.addEventListener('click', bascule);
  f.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); bascule(); } });
});

/* ---------- Pneumatisation ---------- */
const PNEU = [
  { img: 'mastoide-normale', w: 652, h: 662, val: 'Normale — air ≈ 90 %, os ≈ 10 %', cap: 'Mastoïde normale : la pneumatisation progresse d\'avant en arrière jusqu\'à la suture temporo-occipitale.' },
  { img: 'mastoide-intermediaire', w: 600, h: 502, val: 'Intermédiaire — air ≈ 50 %, os ≈ 50 %', cap: 'Sclérose débutante : l\'os néoformé épaissit les cloisons.' },
  { img: 'mastoide-sclerose', w: 576, h: 502, val: 'Sclérose — air ≈ 5 %, os ≈ 95 %', cap: 'Mastoïde scléreuse : quasiment plus d\'air, antre parfois difficile d\'accès.' },
];
const pr = $('#ch-pneu-range');
if (pr) {
  const img = $('#ch-pneu-img'), val = $('#ch-pneu-val'), cap = $('#ch-pneu-cap');
  const maj = () => {
    const p = PNEU[+pr.value];
    img.style.opacity = .2;
    setTimeout(() => { img.src = `cholesteatome/images/${p.img}.jpg`; img.width = p.w; img.height = p.h; img.alt = p.val; img.style.opacity = 1; }, 120);
    val.textContent = p.val; cap.textContent = p.cap;
  };
  pr.addEventListener('input', maj); maj();
}

/* ---------- Histoire naturelle : apparition ---------- */
const chaine = $('.ch-chaine');
if (chaine) {
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(e => { if (e.some(x => x.isIntersecting)) { chaine.classList.add('is-vu'); io.disconnect(); } }, { threshold: .4 });
    io.observe(chaine);
  } else chaine.classList.add('is-vu');
}

/* ---------- Onglets ---------- */
const onglets = $$('.ch-onglets [data-onglet]');
onglets.forEach(b => b.addEventListener('click', () => {
  onglets.forEach(x => x.setAttribute('aria-selected', String(x === b)));
  $$('.ch-panneau').forEach(p => { p.hidden = p.dataset.panneau !== b.dataset.onglet; });
}));

/* ---------- Outils ---------- */
const verdict = (el, titre, niveau, texte) => {
  el.className = 'ch-verdict' + (niveau ? ' k-' + niveau : '');
  el.querySelector('b').textContent = titre; el.querySelector('span').textContent = texte;
};
const tri = $('#ch-tri');
if (tri && R) tri.addEventListener('change', () => {
  const s = Object.fromEntries($$('input', tri).map(i => [i.name, i.checked]));
  const r = R.tdm(s); verdict($('#ch-tri-res'), r.verdict, r.niveau, r.explication);
});
const irm = $('#ch-irm');
if (irm && R) irm.addEventListener('change', () => {
  const g = Object.fromEntries($$('select', irm).map(s => [s.name, s.value]));
  const r = R.irm(g); verdict($('#ch-irm-res'), r.tissu, r.niveau, r.explication);
  const cle = { 'Cholestéatome': 'chole', 'Tissu fibro-inflammatoire': 'fibro', 'Granulome à cholestérine': 'granulome' }[r.tissu];
  $$('.ch-signaux tbody tr').forEach(tr => tr.classList.toggle('is-on', !!cle && tr.classList.contains('ch-l-' + cle)));
});
const cr = $('#ch-cr');
if (cr && R) {
  const maj = () => {
    const coches = n => $$(`input[name="${n}"]:checked`, cr).map(i => i.value);
    const o = { cote: coches('cote')[0], extension: coches('extension'), lyses: coches('lyses'), risques: coches('risques'), variantes: coches('variantes') };
    const r = R.compteRendu(o);
    $('#ch-cr-texte').innerHTML = '<p class="p-cr-titre">Résultats</p>' + r.resultats.map(t => `<p>${t}</p>`).join('') + `<p class="p-cr-titre">Conclusion</p><p><b>${r.conclusion}</b></p>`;
  };
  cr.addEventListener('change', maj); maj();
  $('#ch-cr-copier').addEventListener('click', async e => {
    const t = $('#ch-cr-texte').innerText;
    try { await navigator.clipboard.writeText(t); e.target.textContent = 'Copié ✓'; } catch { e.target.textContent = 'Copie impossible'; }
    setTimeout(() => { e.target.textContent = 'Copier le texte'; }, 1600);
  });
}
