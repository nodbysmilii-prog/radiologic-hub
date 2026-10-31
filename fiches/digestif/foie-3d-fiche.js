/* © Radiologic Hub — Tous droits réservés. Contenus originaux ; ressources tierces sous leurs licences. */
/* =========================================================
   RadiologicHub — fiche « Masses hépatiques solides » : câblage du foie en 3D (module ES)
   • chargement paresseux de foie-3d.js (à l'arrivée à l'écran sur ordinateur, au clic sur téléphone) ;
   • boutons des segments (I à VIII) et des pseudolésions, vues, transparence, vaisseaux, vésicule ;
   • texte d'information : segments et pseudolésions de regles/masses-hepatiques.js (texte de la fiche).
   ========================================================= */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const R = window.RHRegles && window.RHRegles.massesHepatiques;
const bloc = $('#foie-3d');
if (bloc && R) {
  const echapper = t => String(t).replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));
  const scene = $('#fo3d-scene'), info = $('#fo3d-info');
  const telephone = window.matchMedia('(max-width: 700px)');
  let api = null, enCours = null;

  const AIDE = '<p class="md-aide">Touchez un segment ou choisissez une pseudolésion : son siège le plus fréquent (d\'après la fiche) s\'affiche ici.</p>';
  function montrer(detail) {
    $$('[data-seg]', bloc).forEach(b => { const on = detail.segment === b.dataset.seg; b.classList.toggle('is-on', on); b.setAttribute('aria-pressed', String(on)); });
    $$('[data-patho]', bloc).forEach(b => { const on = detail.pathologie === b.dataset.patho; b.classList.toggle('is-on', on); b.setAttribute('aria-pressed', String(on)); });
    if (detail.segment) {
      const s = R.SEGMENTS_FOIE[detail.segment];
      const liees = Object.values(R.PATHOLOGIES_FOIE).filter(p => p.segments.includes(detail.segment));
      info.style.setProperty('--c', s.couleur);
      info.innerHTML = `<h4>${echapper(s.nom)} <small>${echapper(s.lobe)}</small></h4><p>${echapper(s.texte)}</p>` +
        (liees.length ? `<p><b>Pseudolésions de la fiche à ce niveau :</b> ${liees.map(p => echapper(p.nom.toLowerCase())).join(', ')}.</p>` : '');
    } else if (detail.pathologie) {
      const p = R.PATHOLOGIES_FOIE[detail.pathologie];
      info.style.setProperty('--c', p.couleur);
      info.innerHTML = `<h4>${echapper(p.nom)}</h4><p><b>Siège :</b> ${echapper(p.siege)}.</p><p>${echapper(p.texte)}</p>` +
        (p.reperes.length ? `<p>Repères marqués sur le foie : ${p.reperes.map(r => echapper(R.REPERES_FOIE[r].toLowerCase())).join(', ')}.</p>` : '');
    } else if (detail.structure) {
      info.style.setProperty('--c', '#888'); info.innerHTML = `<h4>${echapper(detail.structure.nom)}</h4>`;
    } else { info.style.removeProperty('--c'); info.innerHTML = AIDE; }
  }

  function charger() {
    if (enCours) return enCours;
    scene.innerHTML = '<p class="c3d-attente" role="status">Chargement du moteur 3D…</p>';
    enCours = import('./foie-3d.js?v=20261031180000')
      .then(({ creerFoie }) => creerFoie(scene, { base: bloc.dataset.modeles, segments: R.SEGMENTS_FOIE, pathologies: R.PATHOLOGIES_FOIE, onProgression: t => { const p = $('.c3d-attente', scene); if (p) p.textContent = t; } }))
      .then(v => {
        api = v; bloc.rhApi = v; $('.c3d-attente', scene)?.remove(); bloc.classList.add('is-pret');
        scene.addEventListener('foie-choix', e => montrer(e.detail));
        return v;
      })
      .catch(e => {
        enCours = null;
        scene.innerHTML = `<div class="c3d-attente"><p>Vue 3D indisponible sur cet appareil : ${echapper(e.message || e)}</p><button type="button" class="btn btn-outline btn-sm">Réessayer</button></div>`;
        $('button', scene).addEventListener('click', charger);
        return null;
      });
    return enCours;
  }
  scene.innerHTML = '<div class="c3d-attente"><p><b>Foie en 3D</b> : les 8 segments de Couinaud, la veine porte, les veines hépatiques et la VCI.</p><button type="button" class="btn btn-ink">Voir en 3D</button></div>';
  $('button', scene).addEventListener('click', charger);
  if (!telephone.matches && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(e => { if (e.some(x => x.isIntersecting)) { io.disconnect(); charger(); } }, { rootMargin: '300px' });
    io.observe(bloc);
  }

  $$('[data-seg]', bloc).forEach(b => b.addEventListener('click', async () => { const v = await charger(); if (v) v.choisirSegment(v.etat().segment === b.dataset.seg ? null : b.dataset.seg); }));
  $$('[data-patho]', bloc).forEach(b => b.addEventListener('click', async () => { const v = await charger(); if (v) { if (v.etat().pathologie === b.dataset.patho) { v.choisirSegment(null); } else v.choisirPathologie(b.dataset.patho); } }));
  $$('[data-vue]', bloc).forEach(b => b.addEventListener('click', async () => { const v = await charger(); if (v) v.vue(b.dataset.vue); }));
  $('#fo3d-transparence').addEventListener('input', e => { if (api) api.transparence(e.target.value / 100); });
  $('#fo3d-vaisseaux').addEventListener('change', e => { if (api) api.vaisseaux(e.target.checked); });
  $('#fo3d-vesicule').addEventListener('change', e => { if (api) api.vesicule(e.target.checked); });
}
