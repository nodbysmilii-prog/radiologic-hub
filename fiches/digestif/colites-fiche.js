/* =========================================================
   RadiologicHub — fiche « Colites » (module ES)
   ---------------------------------------------------------
   • côlon en 3D (colon-3d.js, creerCadre) : chaque atteinte allume ses segments ;
   • paroi en 3D (creerParoi) : couches cliquables, mode échographie, atteintes
     (muqueuse et sous-muqueuse, transmurale, cible, double cible, forme sèche, pneumatose) ;
   • boutons « voir en 3D » dans le texte → la visionneuse concernée se met à jour ;
   • onglets, dose de contraste, jauge d'épaisseur pariétale, gravité, entraînement.
   Les deux vues 3D se chargent à l'arrivée à l'écran sur ordinateur, au clic sur téléphone.
   Règles : regles/colites.js (RHRegles.colites).
   ========================================================= */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const R = window.RHRegles && window.RHRegles.colites;
const echapper = t => String(t).replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));
const doux = () => (matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth');
const telephone = matchMedia('(max-width: 700px)');
const MODULE = './colon-3d.js?v=20261028230000';
const verdict = (el, titre, niveau, texte) => {
  el.className = 'ch-verdict' + (niveau ? ' k-' + niveau : '');
  $('b', el).textContent = titre; $('span', el).textContent = texte;
};
const COUL = { crohn: '#7b5ea7', rch: '#3c67b8', ischemique: '#c8102e', pancolite: '#2f8a57', droite: '#f18d25', gauche: '#2a9d8f', typhlite: '#f2ab2f', megacolon: '#111114', amibiase: '#f18d25', tuberculose: '#c8102e', pseudomembraneuse: '#2f8a57' };
const NOMS_SEG = { caecum: 'Caecum', ascendant: 'Côlon ascendant', transverse: 'Côlon transverse', descendant: 'Côlon descendant', sigmoide: 'Côlon sigmoïde', ileon: 'Iléon terminal' };

/* ---------- Chargement paresseux d'une visionneuse ---------- */
function paresseux(bloc, scene, titre, creer) {
  let enCours = null;
  const charger = () => {
    if (enCours) return enCours;
    scene.innerHTML = '<p class="c3d-attente" role="status">Chargement du moteur 3D…</p>';
    enCours = import(MODULE).then(m => creer(m)).then(v => { $('.c3d-attente', scene)?.remove(); bloc.classList.add('is-pret'); return v; })
      .catch(e => {
        enCours = null;
        scene.innerHTML = `<div class="c3d-attente"><p>Vue 3D indisponible sur cet appareil : ${echapper(e.message || e)}</p><button type="button" class="btn btn-outline btn-sm">Réessayer</button></div>`;
        $('button', scene).addEventListener('click', charger);
        return null;
      });
    return enCours;
  };
  scene.innerHTML = `<div class="c3d-attente"><p>${titre}</p><button type="button" class="btn btn-ink">Voir en 3D</button></div>`;
  $('button', scene).addEventListener('click', charger);
  if (!telephone.matches && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(e => { if (e.some(x => x.isIntersecting)) { io.disconnect(); charger(); } }, { rootMargin: '300px' });
    io.observe(bloc);
  }
  return charger;
}

/* ---------- 1. Côlon en 3D ---------- */
const cadre = $('#colon-3d'), infoC = $('#cl3d-info');
let atteinteC = null;
const chargerCadre = cadre ? paresseux(cadre, $('#cl3d-scene'), '<b>Côlon en 3D</b> : caecum, côlon ascendant, transverse, descendant et sigmoïde, appendice, bandelettes, intestin grêle (0,5 Mo).',
  m => m.creerCadre($('#cl3d-scene'), { base: cadre.dataset.modeles }).then(v => {
    $('#cl3d-scene').addEventListener('colon-choix', e => {
      if (!e.detail) return;
      infoC.style.setProperty('--c', '#888'); infoC.innerHTML = `<h4>${echapper(e.detail.nom)}</h4>`;
    });
    if (atteinteC) v.surligner(R.ATTEINTES[atteinteC].segments, parseInt(COUL[atteinteC].slice(1), 16));
    return v;
  })) : null;
async function montrerAtteinte(k) {
  atteinteC = k;
  $$('[data-atteinte]', cadre).forEach(b => { const on = b.dataset.atteinte === k; b.classList.toggle('is-on', on); b.setAttribute('aria-pressed', String(on)); });
  $$('.cl-orient [data-voir-atteinte]').forEach(b => b.classList.toggle('is-on', b.dataset.voirAtteinte === k));
  if (!k) { infoC.innerHTML = '<p class="md-aide">Choisissez une atteinte, ou touchez un segment.</p>'; }
  else {
    const a = R.ATTEINTES[k];
    infoC.style.setProperty('--c', COUL[k]);
    infoC.innerHTML = `<h4>${echapper(a.nom)}</h4><p>${echapper(a.texte)}</p><ul class="cl-segs">${a.segments.map(s => `<li>${NOMS_SEG[s]}</li>`).join('')}</ul>`;
  }
  const v = await chargerCadre();
  if (v) v.surligner(k ? R.ATTEINTES[k].segments : null, k ? parseInt(COUL[k].slice(1), 16) : null);
}
if (cadre && R) {
  $$('[data-atteinte]', cadre).forEach(b => b.addEventListener('click', () => montrerAtteinte(atteinteC === b.dataset.atteinte ? null : b.dataset.atteinte)));
  $$('[data-vue]', cadre).forEach(b => b.addEventListener('click', async () => { const v = await chargerCadre(); v && v.vue(b.dataset.vue); }));
  $('#cl3d-grele').addEventListener('change', async e => { const v = await chargerCadre(); v && v.grele(e.target.checked); });
  $('#cl3d-tout').addEventListener('click', () => montrerAtteinte(null));
}

/* ---------- 2. Paroi en 3D ---------- */
const paroi = $('#paroi-3d'), infoP = $('#paroi-info');
const ECHO_COUCHE = R ? Object.fromEntries(R.ECHO.map(e => [e.couche, e])) : {};
const TEXTE_ATTEINTE = {
  normal: ['Paroi normale', 'Paroi rehaussée de manière homogène après injection ; 3-4mm si côlon collabé, 1-2mm si côlon distendu.'],
  muqueuse: ['Muqueuse et sous-muqueuse', 'Atteinte non transmurale (muqueuse et sous muqueuse) : RCH ; forme réversible de l\'ischémie.'],
  transmurale: ['Transmurale', 'Crohn (atteinte transmurale), tuberculose ; ischémie : forme grave avec gangrène (ischémie transmurale).'],
  cible: ['Rehaussement en cible', 'PDC muqueuse + sous muqueuse hypodense (forme humide de l\'ischémie, précoce et réversible).'],
  'double-cible': ['Rehaussement en double cible', 'rehaussement muqueuse + musculeuse.'],
  seche: ['Forme sèche (« Dry appearance »)', 'Epaississement circonférentiel et symétrique ; la paroi apparait hypodense homogène faiblement voire non rehaussée ; tardive, irréversible.'],
  pneumatose: ['Pneumatose pariétale', 'Infarctus transmural (dernière phase) : pneumatose pariétale, défaut de rehaussement pariétal. Pneumatose : pas tjrs synonyme d\'ischémie.'],
};
let apiP = null, choixP = { mode: 'anatomie', atteinte: 'normal', couche: null };
function rendreCouches(m) {
  const liste = $('#cl-couches');
  liste.innerHTML = m.COUCHES.map(c => {
    const e = ECHO_COUCHE[c.id];
    const coul = choixP.mode === 'echo' ? (c.echo === 'hyper' ? '#f4f4f4' : c.echo === 'hypo' ? '#2b2b30' : '#6c6c72') : '#' + c.couleur.toString(16).padStart(6, '0');
    return `<li><button type="button" data-couche="${c.id}" aria-pressed="${choixP.couche === c.id}" style="--c: ${coul}">${echapper(c.nom)}${e ? `<small>${e.echo}</small>` : ''}</button></li>`;
  }).join('');
}
function infoParoi() {
  if (choixP.couche) {
    const e = ECHO_COUCHE[choixP.couche], nom = $(`[data-couche="${choixP.couche}"]`)?.textContent.replace(/(hyper|hypo)$/, '') || '';
    infoP.style.setProperty('--c', '#7b5ea7');
    infoP.innerHTML = `<h4>${echapper(nom)}</h4>${e ? `<p>Échographie : ${echapper(e.texte)}</p>` : '<p>Environnement de la paroi : la colite peut s\'y étendre (infiltration de la graisse péricolique).</p>'}`;
    return;
  }
  const [t, x] = TEXTE_ATTEINTE[choixP.atteinte];
  infoP.style.setProperty('--c', choixP.atteinte === 'normal' ? '#2a9d8f' : '#c8102e');
  infoP.innerHTML = `<h4>${echapper(choixP.mode === 'echo' ? 'Échographie : 5 couches alternativement hyper et hypoéchogènes' : t)}</h4><p>${echapper(choixP.mode === 'echo' ? 'De la lumière à la périphérie : interface (hyper), muqueuse (hypo), sous-muqueuse (hyper), musculeuse (hypo), séreuse (hyper).' : x)}</p>`;
}
let modP = null;
const chargerParoi = paroi ? paresseux(paroi, $('#paroi-scene'), '<b>Paroi colique en 3D</b> : interface, muqueuse, sous-muqueuse, musculeuse, séreuse, graisse péri-colique.',
  m => { modP = m; const v = m.creerParoi($('#paroi-scene')); apiP = v;
    $('#paroi-scene').addEventListener('paroi-choix', e => { choixP.couche = e.detail ? e.detail.id : null; rendreCouches(m); infoParoi(); });
    v.mode(choixP.mode); v.atteinte(choixP.atteinte); if (choixP.couche) v.choisir(choixP.couche);
    rendreCouches(m); return v; }) : null;
async function regler(o) {
  Object.assign(choixP, o);
  $$('[data-mode]', paroi).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mode === choixP.mode)));
  $$('[data-paroi]', $('#cl-atteintes')).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.paroi === choixP.atteinte)));
  $$('.cl-forme').forEach(b => b.classList.toggle('is-on', b.dataset.voirParoi === choixP.atteinte));
  infoParoi();
  const v = await chargerParoi();
  if (!v) return;
  v.mode(choixP.mode); v.atteinte(choixP.atteinte); v.choisir(choixP.couche);
  if (modP) rendreCouches(modP);
}
if (paroi && R) {
  $$('[data-mode]', paroi).forEach(b => b.addEventListener('click', () => regler({ mode: b.dataset.mode })));
  $('#cl-atteintes').addEventListener('click', e => { const b = e.target.closest('[data-paroi]'); if (b) regler({ atteinte: b.dataset.paroi, couche: null, mode: 'anatomie' }); });
  $('#cl-couches').addEventListener('click', e => { const b = e.target.closest('[data-couche]'); if (b) regler({ couche: choixP.couche === b.dataset.couche ? null : b.dataset.couche }); });
  infoParoi();
}

/* ---------- Liens « voir en 3D » dans le texte ---------- */
document.addEventListener('click', e => {
  const b = e.target.closest('[data-voir-atteinte], [data-voir-paroi], [data-voir-echo]');
  if (!b || !R) return;
  const a = b.dataset.voirAtteinte, p = b.dataset.voirParoi, ec = b.dataset.voirEcho;
  const cible = a ? cadre : paroi;
  if (!b.closest('.cl-orient')) cible.scrollIntoView({ behavior: doux(), block: 'start' });
  if (a) montrerAtteinte(a);
  if (p) regler({ atteinte: p, couche: null, mode: 'anatomie' });
  if (ec) regler({ mode: 'echo', atteinte: 'normal', couche: null });
});

/* ---------- Onglets ---------- */
$$('.cl-onglets').forEach(barre => {
  const g = barre.dataset.groupe;
  $$('[data-onglet]', barre).forEach(b => b.addEventListener('click', () => {
    $$('[data-onglet]', barre).forEach(x => x.setAttribute('aria-selected', String(x === b)));
    $$(`.cl-panneau[data-groupe="${g}"]`).forEach(p => { p.hidden = p.dataset.panneau !== b.dataset.onglet; });
  }));
});

if (R) {
  /* Échographie : 5 couches */
  const echo = $('#cl-echo');
  if (echo) echo.innerHTML = R.ECHO.map((e, i) => `<li class="is-${e.echo}"><b>${i + 1}</b><span data-sens="${e.echo === 'hyper' ? 'hyperéchogène' : 'hypoéchogène'}">${echapper(e.texte)}</span></li>`).join('');

  /* Dose */
  const dose = $('#cl-dose');
  if (dose) {
    const maj = () => { const p = $('input[name="poids"]', dose).value, r = R.contraste(p); $('#cl-poids-val').textContent = p; verdict($('#cl-dose-res'), `${r.volume} cc`, 'key', `1.5cc/kg × ${p} kg, à ${r.debit}.`); };
    dose.addEventListener('input', maj); maj();
  }

  /* Jauge d'épaisseur */
  const mes = $('#cl-mesure');
  if (mes) {
    const maj = () => {
      const mm = +$('input[name="mm"]', mes).value, dist = $('input[name="distendu"]', mes).checked, r = R.paroi(mm, dist);
      $('#cl-mm').textContent = String(mm).replace('.', ',');
      const j = $('.cl-jauge', mes); j.style.setProperty('--n', (r.normale[1] / 20 * 100) + '%'); j.style.setProperty('--v', (mm / 20 * 100) + '%');
      verdict($('#cl-mesure-res'), { epaissie: 'Épaissie', limite: 'Au-dessus de la normale', normale: 'Normale' }[r.cle], { epaissie: 'grave', limite: 'key', normale: 'sign' }[r.cle], r.texte);
    };
    mes.addEventListener('input', maj); mes.addEventListener('change', maj); maj();
  }

  /* Gravité */
  const grav = $('#cl-gravite');
  if (grav) {
    const maj = () => { const n = $$('input:checked', grav).length; verdict($('#cl-grav-res'), n ? `${n} signe${n > 1 ? 's' : ''} de gravité` : '', n ? 'grave' : '', n ? 'Colite compliquée.' : 'Cochez les signes présents.'); };
    grav.addEventListener('change', maj); maj();
  }

  /* Testez-vous */
  const zone = $('#cl-cas');
  if (zone) {
    const C = { crohn: 'var(--purple)', rch: 'var(--blue)', ischemique: 'var(--k-grave)', pseudomembraneuse: 'var(--green)', typhlite: 'var(--amber)', infectieuse: 'var(--orange)' };
    let score = 0;
    const majScore = () => { $('#cl-score').textContent = `${score} / ${R.CAS.length}`; };
    const rendre = () => {
      score = 0; majScore(); zone.innerHTML = '';
      R.CAS.forEach((c, i) => {
        const el = document.createElement('div'); el.className = 'ti-cas-c';
        el.innerHTML = `<p><span class="ti-cas-n">${i + 1}</span>${echapper(c.texte)}</p><div class="ti-cas-choix">${Object.entries(R.CHOIX).map(([k, n]) => `<button type="button" data-k="${k}" style="--c: ${C[k]}">${n}</button>`).join('')}</div><p class="ti-cas-rep" aria-live="polite"></p>`;
        $$('button', el).forEach(b => b.addEventListener('click', () => {
          if (el.classList.contains('is-fait')) return;
          el.classList.add('is-fait');
          const ok = b.dataset.k === c.rep;
          if (ok) score++; majScore();
          $$('button', el).forEach(x => x.classList.toggle('is-ok', x.dataset.k === c.rep));
          if (!ok) b.classList.add('is-faux');
          $('.ti-cas-rep', el).innerHTML = `${ok ? '✓' : '✗'} <b>${R.CHOIX[c.rep]}</b> — ${echapper(c.pourquoi)}`;
        }));
        zone.appendChild(el);
      });
    };
    rendre();
    $('#cl-cas-reset').addEventListener('click', rendre);
  }
}
