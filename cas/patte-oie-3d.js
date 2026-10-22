/* =========================================================
   RadiologicHub — Cas « douleur médiale du genou » : la patte d'oie en 3D
   ---------------------------------------------------------
   Modèles : public/models/patte-oie/ (scripts/export_muscles.py -- patte-oie).
   Visionneuse : cours/visionneuse.js (three.js). Les trois tendons et la
   bourse prennent les couleurs de l'IRM annotée de la page (sartorius :
   sarcelle, gracile : vert, semi-tendineux : bleu, bourse : ambre).
   Panneau et étiquettes en français ou en anglais (événement « rh-langue »
   de cas.js). Chargement à l'arrivée sur ordinateur, au clic sur
   « Voir en 3D » sur téléphone.
   ========================================================= */
(function () {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const bi = (fr, en) => `<span class="t-fr">${fr}</span><span class="t-en" lang="en">${en}</span>`;
  const langue = () => document.documentElement.dataset.langue === 'en' ? 'en' : 'fr';

  const boite = $('#v3d');
  if (!boite) return;
  const BASE = boite.dataset.modeles;
  const telephone = window.matchMedia('(max-width: 700px)');

  // Couleurs des tokens du site (styles.css) : --teal, --green, --blue, --amber
  const COULEURS = { sartorius: 0x2a9d8f, gracile: 0x548c6c, 'semi-tendineux': 0x3c67b8, 'bourse-anserine': 0xf2ab2f };
  const CSS = { sartorius: 'var(--teal)', gracile: 'var(--green)', 'semi-tendineux': 'var(--blue)', 'bourse-anserine': 'var(--amber)' };
  const NOMS = {
    fr: { sartorius: 'Sartorius', gracile: 'Gracile', 'semi-tendineux': 'Semi-tendineux', 'bourse-anserine': 'Bourse de la patte d\'oie',
      'ligament-collateral-tibial': 'Ligament collatéral tibial', 'semi-membraneux': 'Semi-membraneux', 'femur-distal': 'Fémur',
      patella: 'Patella', 'tibia-proximal': 'Tibia', 'fibula-proximale': 'Fibula' },
    en: { sartorius: 'Sartorius', gracile: 'Gracilis', 'semi-tendineux': 'Semitendinosus', 'bourse-anserine': 'Pes anserinus bursa',
      'ligament-collateral-tibial': 'Tibial collateral ligament', 'semi-membraneux': 'Semimembranosus', 'femur-distal': 'Femur',
      patella: 'Patella', 'tibia-proximal': 'Tibia', 'fibula-proximale': 'Fibula' },
  };
  const LIBELLE = { fr: 'Modèle 3D de la patte d\'oie, genou droit', en: '3D model of the pes anserinus, right knee' };
  const CATEGORIES = {
    muscle: ['muscle et tendon', 'muscle and tendon'], contexte: ['repère (translucide)', 'landmark (translucent)'], os: ['os', 'bone'],
    ligament: ['ligament', 'ligament'], bourse: ['bourse séreuse', 'bursa'],
  };
  const GROUPES = [
    ['patte', ['Patte d\'oie', 'Pes anserinus'], ['sartorius', 'gracile', 'semi-tendineux']],
    ['articulaire', ['Sous la patte d\'oie', 'Deep to the pes anserinus'], ['bourse-anserine', 'ligament-collateral-tibial']],
    ['reperes', ['Repères', 'Landmarks'], ['semi-membraneux', 'femur-distal', 'patella', 'tibia-proximal', 'fibula-proximale']],
  ];
  const REGLAGES = {
    etiquettes: ['sartorius', 'gracile', 'semi-tendineux', 'bourse-anserine', 'ligament-collateral-tibial'],
    hauteursAncre: { sartorius: 0.5, gracile: 0.62, 'semi-tendineux': 0.74, 'bourse-anserine': 0.5, 'ligament-collateral-tibial': 0.8 },
    ancre: 'exterieure',
    vueInitiale: 'mediale',
    recul: 1.25,
    couleurs: COULEURS,
  };
  const AIDE = bi('Touchez une structure (ou son étiquette) pour la mettre en surbrillance.', 'Tap a structure (or its label) to highlight it.');

  let manifeste = null, visionneuse = null, enCours = false;

  async function demarrer() {
    const scene = $('#v3d-scene');
    try {
      const r = await fetch(`${BASE}manifest.json`, { cache: 'no-cache' });
      if (!r.ok) throw new Error('manifest.json');
      manifeste = await r.json();
    } catch (e) {
      scene.innerHTML = `<div class="v3d-attente"><p class="cours-erreur">${bi('Modèle 3D indisponible', '3D model unavailable')} : ${esc(e.message)}</p></div>`;
      return;
    }
    const poids = (manifeste.total_octets / 1048576).toFixed(1);
    scene.innerHTML = `<div class="v3d-attente">
        <p>${bi(`<b>Modèle 3D interactif</b> : ${manifeste.modeles.length} structures (${poids.replace('.', ',')} Mo, plus 0,2 Mo pour le moteur 3D).`,
                `<b>Interactive 3D model</b>: ${manifeste.modeles.length} structures (${poids} MB, plus 0.2 MB for the 3D engine).`)}</p>
        <button type="button" class="btn btn-ink" id="v3d-voir">${bi('Voir en 3D', 'View in 3D')}</button>
      </div>`;
    $('#v3d-voir').addEventListener('click', charger);
    if (!telephone.matches) {
      // Sur ordinateur : chargement quand la section approche de l'écran
      new IntersectionObserver((entrees, obs) => {
        if (entrees.some(e => e.isIntersecting)) { obs.disconnect(); charger(); }
      }, { rootMargin: '300px 0px' }).observe(boite);
    }
  }

  async function charger() {
    if (enCours) return;
    enCours = true;
    const scene = $('#v3d-scene');
    scene.innerHTML = `<p class="v3d-progression" role="status">${bi('Chargement du moteur 3D…', 'Loading the 3D engine…')}</p>`;
    try {
      const { creerVisionneuse } = await import('../cours/visionneuse.js');
      scene.innerHTML = '';
      const progression = document.createElement('p');
      progression.className = 'v3d-progression';
      progression.setAttribute('role', 'status');
      scene.appendChild(progression);
      const l = langue();
      visionneuse = await creerVisionneuse(scene, {
        base: BASE, manifeste, ids: manifeste.modeles.map(m => m.id),
        reglages: { ...REGLAGES, noms: NOMS[l], libelle: LIBELLE[l] },
        onProgression: (n, t) => { progression.innerHTML = bi(`Chargement des modèles : ${n} / ${t}`, `Loading models: ${n} / ${t}`); },
        onSelection: afficherSelection,
      });
      progression.remove();
      panneau();
    } catch (e) {
      enCours = false;
      scene.innerHTML = `<div class="v3d-attente"><p class="cours-erreur">${bi('Modèle 3D indisponible sur cet appareil', '3D model unavailable on this device')} : ${esc(e.message)}</p>
        <button type="button" class="btn btn-outline" id="v3d-voir">${bi('Réessayer', 'Try again')}</button></div>`;
      $('#v3d-voir').addEventListener('click', charger);
    }
  }

  function puce(id) {
    const m = manifeste.modeles.find(x => x.id === id);
    if (!m) return '';
    const bord = CSS[id] ? ` data-couleur style="--pc: ${CSS[id]}"` : '';
    return `<button type="button" class="v3d-puce v3d-${m.categorie}" data-structure="${id}"${bord}>${bi(esc(NOMS.fr[id]), esc(NOMS.en[id]))}</button>`;
  }

  function panneau() {
    const v = visionneuse, p = $('#v3d-panneau');
    const bascules = [['muscle', 'Muscles et tendons', 'Muscles and tendons'], ['articulaire', 'Bourse et ligament', 'Bursa and ligament'],
      ['contexte', 'Semi-membraneux', 'Semimembranosus'], ['os', 'Os', 'Bones']]
      .map(([c, fr, en]) => `<label class="v3d-bascule"><input type="checkbox" data-categorie="${c}" checked> ${bi(fr, en)}</label>`).join('');
    const groupes = GROUPES.map(([cle, [fr, en], ids]) => `<div class="v3d-groupe" data-groupe="${cle}"><p class="v3d-groupe-titre">${bi(fr, en)}</p>
      <div class="v3d-structures">${ids.map(puce).join('')}</div></div>`).join('');
    p.hidden = false;
    p.innerHTML = `
      <div class="v3d-bloc"><p class="v3d-titre">${bi('Afficher', 'Show')}</p><div class="v3d-bascules">${bascules}</div></div>
      <div class="v3d-bloc"><p class="v3d-titre">${bi('Muscles', 'Muscles')}</p><div class="v3d-vues">
        <button type="button" data-charnus="1" class="is-active">${bi('Muscles et tendons', 'Muscles and tendons')}</button><button type="button" data-charnus="0">${bi('Tendons seuls', 'Tendons only')}</button></div></div>
      <div class="v3d-bloc"><p class="v3d-titre">${bi('Vue', 'View')}</p><div class="v3d-vues">
        <button type="button" data-vue="mediale">${bi('Médiale', 'Medial')}</button><button type="button" data-vue="anterieure">${bi('Antérieure', 'Anterior')}</button><button type="button" data-vue="posterieure">${bi('Postérieure', 'Posterior')}</button><button type="button" data-vue="laterale">${bi('Latérale', 'Lateral')}</button></div></div>
      <div class="v3d-bloc v3d-selection" id="v3d-selection" aria-live="polite"><p>${AIDE}</p></div>
      <div class="v3d-bloc v3d-structures-groupes">${groupes}</div>`;
    p.addEventListener('change', e => {
      if (e.target.dataset.categorie) v.afficher(e.target.dataset.categorie, e.target.checked);
    });
    p.addEventListener('click', e => {
      const b = e.target.closest('button');
      if (!b) return;
      if (b.dataset.vue) v.vue(b.dataset.vue);
      if (b.dataset.charnus) {
        v.corpsCharnus(b.dataset.charnus === '1');
        $$('[data-charnus]', p).forEach(x => x.classList.toggle('is-active', x === b));
      }
      if (b.dataset.structure) v.selectionner(v.selection === b.dataset.structure ? null : b.dataset.structure);
    });
  }

  function afficherSelection(s) {
    const zone = $('#v3d-selection');
    $$('[data-structure]', $('#v3d-panneau')).forEach(b => b.classList.toggle('is-active', !!s && b.dataset.structure === s.id));
    if (!zone) return;
    if (!s) { zone.innerHTML = `<p>${AIDE}</p>`; return; }
    const m = manifeste.modeles.find(x => x.id === s.id) || {};
    const cat = CATEGORIES[m.categorie] || [m.categorie, m.categorie];
    zone.innerHTML = `<p><b>${bi(esc(NOMS.fr[s.id] || s.nom), esc(NOMS.en[s.id] || s.nom))}</b></p>
      <p class="v3d-aide">${bi(esc(cat[0]), esc(cat[1]))}</p>
      <p class="v3d-aide">${bi('Touchez-la de nouveau, ou ailleurs, pour tout réafficher.', 'Tap it again, or elsewhere, to show everything.')}</p>`;
  }

  // Bascule de langue de la page : étiquettes du modèle
  document.addEventListener('rh-langue', e => {
    if (visionneuse) visionneuse.renommer(NOMS[e.detail], LIBELLE[e.detail]);
  });

  demarrer();
})();
