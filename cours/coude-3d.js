/* =========================================================
   RadiologicHub — Coude en 3D (aperçu du modèle de la fiche
   d'échographie du coude)
   ---------------------------------------------------------
   Modèles : public/models/coude/ (scripts/export_muscles.py -- coude).
   Visionneuse : cours/visionneuse.js (three.js), réglages du coude :
   vue antérieure, étiquettes sur la face externe des structures.
   Panneau : catégories affichées, tendons seuls, loge, vues, liste des
   structures par loge. Chargement à l'ouverture sur ordinateur, au clic
   sur « Voir en 3D » sur téléphone. La fiche peut demander une
   structure (« Voir le nerf ulnaire en 3D ») : événement
   « rh-3d-selectionner » sur <main>.
   ========================================================= */
(function () {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const main = $('#coude-3d');
  const BASE = main.dataset.modeles;
  const telephone = window.matchMedia('(max-width: 700px)');

  const LOGES = [['anterieure', 'Antérieure'], ['laterale', 'Latérale'], ['mediale', 'Médiale'], ['posterieure', 'Postérieure']];
  const NOMS_CATEGORIES = { muscle: 'muscle et tendon', contexte: 'muscle profond', os: 'os', ligament: 'ligament', capsule: 'capsule', bourse: 'bourse', nerf: 'nerf', artere: 'artère', veine: 'veine' };
  const ORDRE = ['muscle', 'contexte', 'ligament', 'bourse', 'nerf', 'artere', 'veine', 'os', 'capsule'];
  const REGLAGES = {
    etiquettes: ['biceps-brachial', 'triceps-brachial', 'nerf-ulnaire', 'nerf-median', 'nerf-radial', 'artere-brachiale'],
    hauteursAncre: { 'biceps-brachial': 0.72, 'triceps-brachial': 0.78, 'nerf-ulnaire': 0.62, 'nerf-median': 0.66, 'nerf-radial': 0.56, 'artere-brachiale': 0.5 },
    ancre: 'exterieure',
    vueInitiale: 'anterieure',
    libelle: 'Modèle 3D du coude droit',
    recul: 1.3,
  };

  let manifeste = null, visionneuse = null, enCours = false, aSelectionner = null;

  // Demande d'une autre partie de la page (fiche) : sélectionner une structure, après chargement si besoin
  main.addEventListener('rh-3d-selectionner', e => {
    aSelectionner = e.detail;
    if (visionneuse) visionneuse.selectionner(aSelectionner);
    else if (manifeste) charger();
  });

  async function demarrer() {
    const scene = $('#v3d-scene');
    try {
      const r = await fetch(`${BASE}manifest.json`, { cache: 'no-cache' });
      if (!r.ok) throw new Error('manifeste des modèles introuvable');
      manifeste = await r.json();
    } catch (e) {
      scene.innerHTML = `<div class="v3d-attente"><p class="cours-erreur">Modèle 3D indisponible : ${esc(e.message)}</p></div>`;
      return;
    }
    const poids = (manifeste.total_octets / 1048576).toFixed(1).replace('.', ',');
    scene.innerHTML = `<div class="v3d-attente">
        <p><b>Modèle 3D interactif</b> : ${manifeste.modeles.length} structures (${poids} Mo, plus 0,2 Mo pour le moteur 3D).</p>
        <button type="button" class="btn btn-ink" id="v3d-voir">Voir en 3D</button>
      </div>`;
    $('#v3d-voir').addEventListener('click', charger);
    if (!telephone.matches) charger();
  }

  async function charger() {
    if (enCours) return;
    enCours = true;
    const scene = $('#v3d-scene');
    scene.innerHTML = '<p class="v3d-progression" role="status">Chargement du moteur 3D…</p>';
    try {
      const { creerVisionneuse } = await import('./visionneuse.js');
      scene.innerHTML = '';
      const progression = document.createElement('p');
      progression.className = 'v3d-progression';
      progression.setAttribute('role', 'status');
      scene.appendChild(progression);
      visionneuse = await creerVisionneuse(scene, {
        base: BASE, manifeste, ids: manifeste.modeles.map(m => m.id), reglages: REGLAGES,
        onProgression: (n, t) => { progression.textContent = `Chargement des modèles : ${n} / ${t}`; },
        onSelection: afficherSelection,
      });
      progression.remove();
      panneau();
      main.dispatchEvent(new CustomEvent('v3d-pret'));
    } catch (e) {
      enCours = false;
      scene.innerHTML = `<div class="v3d-attente"><p class="cours-erreur">Modèle 3D indisponible sur cet appareil : ${esc(e.message)}</p>
        <button type="button" class="btn btn-outline" id="v3d-voir">Réessayer</button></div>`;
      $('#v3d-voir').addEventListener('click', charger);
    }
  }

  function panneau() {
    const v = visionneuse, p = $('#v3d-panneau');
    const bascules = [['muscle', 'Muscles et tendons'], ['contexte', 'Fléchisseur profond'], ['os', 'Os'], ['articulaire', 'Ligaments, capsule, bourses'], ['nerf', 'Nerfs'], ['vaisseau', 'Vaisseaux']]
      .map(([c, t]) => `<label class="v3d-bascule"><input type="checkbox" data-categorie="${c}" checked> ${t}</label>`).join('');
    const groupes = [['os', 'Os et articulation', s => !s.loge], ...LOGES.map(([l, t]) => [l, `Loge ${t.toLowerCase()}`, s => s.loge === l])];
    const liste = groupes.map(([cle, titre, garde]) => {
      const membres = v.structures.filter(garde).sort((a, b) => ORDRE.indexOf(a.categorie) - ORDRE.indexOf(b.categorie));
      return membres.length ? `<div class="v3d-groupe" data-groupe="${cle}"><p class="v3d-groupe-titre">${titre}</p><div class="v3d-structures">${membres
        .map(s => `<button type="button" class="v3d-puce v3d-${s.categorie}" data-structure="${s.id}">${esc(s.nom)}</button>`).join('')}</div></div>` : '';
    }).join('');
    p.hidden = false;
    p.innerHTML = `
      <div class="v3d-bloc"><p class="v3d-titre">Afficher</p><div class="v3d-bascules">${bascules}</div></div>
      <div class="v3d-bloc"><p class="v3d-titre">Muscles</p><div class="v3d-vues">
        <button type="button" data-charnus="1" class="is-active">Muscles et tendons</button><button type="button" data-charnus="0">Tendons seuls</button></div></div>
      <div class="v3d-bloc"><p class="v3d-titre">Loge</p><div class="v3d-vues">
        <button type="button" data-loge="" class="is-active">Toutes</button>${LOGES.map(([l, t]) => `<button type="button" data-loge="${l}">${t}</button>`).join('')}</div></div>
      <div class="v3d-bloc"><p class="v3d-titre">Vue</p><div class="v3d-vues">
        <button type="button" data-vue="anterieure">Antérieure</button><button type="button" data-vue="posterieure">Postérieure</button><button type="button" data-vue="laterale">Latérale</button><button type="button" data-vue="mediale">Médiale</button></div></div>
      <div class="v3d-bloc v3d-selection" id="v3d-selection" aria-live="polite"><p>Touchez une structure (ou son étiquette) pour la mettre en surbrillance.</p></div>
      <div class="v3d-bloc v3d-structures-groupes">${liste}</div>`;
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
      if (b.dataset.loge !== undefined) {
        v.loge(b.dataset.loge);
        $$('[data-loge]', p).forEach(x => x.classList.toggle('is-active', x === b));
        $$('.v3d-groupe', p).forEach(g => { g.hidden = !!b.dataset.loge && g.dataset.groupe !== 'os' && g.dataset.groupe !== b.dataset.loge; });
        const vues = { anterieure: 'anterieure', laterale: 'laterale', mediale: 'mediale', posterieure: 'posterieure' };
        if (vues[b.dataset.loge]) v.vue(vues[b.dataset.loge]);
      }
      if (b.dataset.structure) v.selectionner(v.selection === b.dataset.structure ? null : b.dataset.structure);
    });
    const choisie = aSelectionner || new URLSearchParams(location.search).get('structure');
    if (choisie) v.selectionner(choisie);
  }

  function afficherSelection(s) {
    const zone = $('#v3d-selection');
    $$('[data-structure]', $('#v3d-panneau')).forEach(b => b.classList.toggle('is-active', !!s && b.dataset.structure === s.id));
    if (!zone) return;
    if (!s) { zone.innerHTML = '<p>Touchez une structure (ou son étiquette) pour la mettre en surbrillance.</p>'; return; }
    const m = manifeste.modeles.find(x => x.id === s.id) || {};
    const loge = LOGES.find(([l]) => l === m.loge);
    const notes = (m.modifications || []).filter(t => /diamètre d'affichage/.test(t)).map(t => t.replace(/ \(mesuré.*$/, ''));
    zone.innerHTML = `<p><b>${esc(s.nom)}</b></p>
      <p class="v3d-aide">${esc(NOMS_CATEGORIES[m.categorie] || m.categorie)}${loge ? ` · loge ${esc(loge[1].toLowerCase())}` : ''}${notes.length ? ` · ${esc(notes.join(' ; '))}` : ''}</p>
      <p class="v3d-aide">Touchez-la de nouveau, ou ailleurs, pour tout réafficher.</p>`;
  }

  demarrer();
})();
