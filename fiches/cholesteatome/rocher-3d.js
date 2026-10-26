/* =========================================================
   RadiologicHub — Cholestéatome : rocher droit en 3D (module ES, three.js 0.170.0)
   ---------------------------------------------------------
   Modèle : public/models/rocher/rocher.glb + rocher.json (scripts/export_rocher.py,
   Z-Anatomy CC BY-SA 4.0), oreille droite.
   Repère : +Y haut, +Z avant, +X médial (vers la ligne médiane), centré sur la caisse.
   • os temporal réglable (opaque → transparent) pour voir la caisse ;
   • structures colorées par famille ; survol ou clic → nom + ce qu'il faut regarder
     dans un cholestéatome ;
   • parcours : osselets, oreille interne, nerf facial, vaisseaux à risque ;
   • vues : coronale (de face), axiale (du dessus), latérale (par le conduit), oblique ;
   • coupe axiale mobile : un plan horizontal tranche le modèle, comme une coupe TDM ;
   • rendu à la demande.
   ========================================================= */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

export const FAMILLES = {
  os: { color: 0xeee6d2, nom: 'Os temporal' },
  osselet: { color: 0xf2ab2f, nom: 'Osselets' },
  tympan: { color: 0xf48fb1, nom: 'Tympan' },
  labyrinthe: { color: 0x2a9d8f, nom: 'Oreille interne' },
  trompe: { color: 0xb39ddb, nom: 'Trompe auditive' },
  nerf: { color: 0xffd54f, nom: 'Nerfs (VII, VIII)' },
  artere: { color: 0xc8102e, nom: 'Carotide interne' },
  veine: { color: 0x3c67b8, nom: 'Golfe jugulaire et sinus' },
};
// Ce qu'il faut regarder dans un cholestéatome (texte de la fiche)
export const A_REGARDER = {
  temporal: 'Mur de la logette, tegmen tympani et antri, parois du conduit, mastoïde (pneumatisation ou sclérose).',
  marteau: 'Tête du marteau : refoulée vers le dedans ou érodée (bloc incudo-malléaire).',
  enclume: "Longue apophyse de l'enclume : la plus fragile, première lysée.",
  etrier: "Superstructure de l'étrier : lyse ; rapports avec la fenêtre ovale.",
  tympan: 'Pars flaccida : poche de rétraction attique, point de départ du cholestéatome.',
  cochlee: 'Promontoire (tour basal) : fistule possible.',
  vestibule: 'Canal semi-circulaire latéral : siège n° 1 des fistules labyrinthiques.',
  trompe: "Trompe auditive : dysfonction tubaire à l'origine de la rétraction.",
  facial: 'Nerf facial : plancher du segment tympanique (VII2) souvent dénudé, parfois VII3.',
  'corde-tympan': 'Corde du tympan : traverse la caisse entre marteau et enclume.',
  'cochleo-vestibulaire': 'VIII dans le méat acoustique interne.',
  carotide: 'Coque du canal carotidien : continuité à vérifier.',
  jugulaire: 'Golfe jugulaire : procident (haut dans l\'hypotympan) ou déhiscent.',
  sigmoide: 'Sinus sigmoïde : antérieur ou superficiel = risque pour l\'abord mastoïdien ; thrombophlébite.',
  transverse: 'Sinus latéral : thrombophlébite à rechercher.',
};
export const PARCOURS = {
  osselets: { ids: ['marteau', 'enclume', 'etrier', 'tympan', 'corde-tympan'], vue: 'laterale', os: 0.12, texte: "Marteau, enclume, étrier : la longue apophyse de l'enclume est la plus fragile." },
  'oreille-interne': { ids: ['cochlee', 'vestibule', 'cochleo-vestibulaire', 'etrier'], vue: 'axiale', os: 0.12, texte: 'Fistule labyrinthique : surtout le canal semi-circulaire latéral, au contact du cholestéatome.' },
  facial: { ids: ['facial', 'corde-tympan', 'etrier'], vue: 'laterale', os: 0.15, texte: 'VII1 labyrinthique → ganglion géniculé → VII2 tympanique (sous le CSC latéral, au-dessus de la fenêtre ovale) → VII3 mastoïdien.' },
  vaisseaux: { ids: ['carotide', 'jugulaire', 'sigmoide', 'transverse'], vue: 'oblique', os: 0.25, texte: 'Canal carotidien, golfe jugulaire, sinus sigmoïde : coques osseuses à vérifier, variantes à signaler.' },
};

export async function creerVisionneuse(conteneur, { base, onProgression = () => {} }) {
  const donnees = await (await fetch(`${base}rocher.json`, { cache: 'no-cache' })).json();
  const largeur = () => conteneur.clientWidth, hauteur = () => conteneur.clientHeight;

  const rendu = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  rendu.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  rendu.setSize(largeur(), hauteur());
  rendu.localClippingEnabled = true;
  rendu.domElement.className = 'c3d-canvas';
  conteneur.appendChild(rendu.domElement);
  const bulle = document.createElement('div'); bulle.className = 'r3d-bulle'; bulle.hidden = true; conteneur.appendChild(bulle);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, largeur() / hauteur(), 0.01, 80);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8178, 1.6));
  const soleil = new THREE.DirectionalLight(0xffffff, 1.5); soleil.position.set(-2, 3, 4); scene.add(soleil);
  const contre = new THREE.DirectionalLight(0xffffff, 0.8); contre.position.set(3, -1, -4); scene.add(contre);
  const controles = new OrbitControls(camera, rendu.domElement);
  controles.enableDamping = true; controles.dampingFactor = 0.12; controles.minDistance = 0.4; controles.maxDistance = 9;

  onProgression('Chargement du modèle…');
  const chargeur = new GLTFLoader(); chargeur.setMeshoptDecoder(MeshoptDecoder);
  const gltf = await chargeur.loadAsync(`${base}rocher.glb?v=${donnees.empreinte || ''}`);
  const infos = Object.fromEntries(donnees.structures.map(s => [s.id, s]));
  const coupe = new THREE.Plane(new THREE.Vector3(0, -1, 0), 10);       // garde ce qui est sous le plan
  const objets = {};
  gltf.scene.traverse(o => {
    if (!o.isMesh) return;
    const id = o.name in infos ? o.name : (o.parent && o.parent.name in infos ? o.parent.name : o.name);
    const info = infos[id]; if (!info) return;
    const couleur = FAMILLES[info.cat].color;
    o.material = new THREE.MeshStandardMaterial({ color: couleur, roughness: info.cat === 'os' ? 0.85 : 0.5, metalness: info.cat === 'osselet' ? 0.15 : 0, side: THREE.DoubleSide, clippingPlanes: [coupe] });
    o.userData = { id, info, couleur };
    if (info.cat === 'os') o.renderOrder = 5;
    objets[id] = o;
  });
  scene.add(gltf.scene);

  const etat = { opaciteOs: 0.35, parcours: null, choisi: null, coupe: null };
  function appliquer() {
    const actifs = etat.parcours ? new Set(PARCOURS[etat.parcours].ids) : null;
    for (const [id, o] of Object.entries(objets)) {
      const m = o.material, os = o.userData.info.cat === 'os';
      const enAvant = etat.choisi === id || (actifs && actifs.has(id));
      let op = os ? (etat.parcours ? PARCOURS[etat.parcours].os : etat.opaciteOs) : (actifs && !actifs.has(id) ? 0.18 : 1);
      if (etat.choisi === id) op = 1;
      m.transparent = op < 1; m.opacity = op; m.depthWrite = op >= 1;
      m.color.setHex(etat.choisi === id ? 0xc8102e : o.userData.couleur);
      m.emissive.setHex(enAvant && !os ? 0x221100 : 0);
      m.needsUpdate = true;
    }
    coupe.constant = etat.coupe == null ? 10 : etat.coupe;
    demander();
  }

  /* ---------- Survol et clic ---------- */
  const rayon = new THREE.Raycaster(), souris = new THREE.Vector2();
  function sous(ev) {
    const r = rendu.domElement.getBoundingClientRect();
    souris.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    rayon.setFromCamera(souris, camera);
    const cand = Object.values(objets).filter(o => o.visible && o.material.opacity > 0.3);
    const t = rayon.intersectObjects(cand, false).find(h => etat.coupe == null || h.point.y <= etat.coupe);
    return t ? t.object.userData.id : null;
  }
  rendu.domElement.addEventListener('pointermove', ev => {
    const id = sous(ev);
    rendu.domElement.style.cursor = id ? 'pointer' : '';
    if (!id) { bulle.hidden = true; return; }
    const r = conteneur.getBoundingClientRect();
    bulle.textContent = infos[id].nom; bulle.hidden = false;
    bulle.style.transform = `translate(${ev.clientX - r.left + 12}px, ${ev.clientY - r.top - 10}px)`;
  });
  rendu.domElement.addEventListener('pointerleave', () => { bulle.hidden = true; });
  let appui = null;
  rendu.domElement.addEventListener('pointerdown', ev => { appui = [ev.clientX, ev.clientY]; });
  rendu.domElement.addEventListener('pointerup', ev => {
    if (!appui || Math.hypot(ev.clientX - appui[0], ev.clientY - appui[1]) > 5) return;
    const id = sous(ev);
    etat.choisi = id && etat.choisi !== id ? id : null;
    conteneur.dispatchEvent(new CustomEvent('rocher-structure', { detail: etat.choisi ? { ...infos[etat.choisi], texte: A_REGARDER[etat.choisi] } : null, bubbles: true }));
    appliquer();
  });

  /* ---------- Vues (oreille droite : latéral = −X, médial = +X) ---------- */
  const cible = new THREE.Vector3(0.12, -0.05, 0);
  const VUES = {
    coronale: [new THREE.Vector3(0.12, -0.05, 4.2), new THREE.Vector3(0, 1, 0)],
    axiale: [new THREE.Vector3(0.12, 4.2, 0.01), new THREE.Vector3(0, 0, -1)],
    laterale: [new THREE.Vector3(-4.2, 0, 0), new THREE.Vector3(0, 1, 0)],
    oblique: [new THREE.Vector3(-2.6, 1.6, 2.8), new THREE.Vector3(0, 1, 0)],
  };
  function vue(nom, rapproche = false) {
    const [p, up] = VUES[nom];
    camera.position.copy(cible).addScaledVector(p.clone().sub(cible), rapproche ? 0.45 : 1);
    camera.up.copy(up); controles.target.copy(cible); controles.update(); demander();
  }

  /* ---------- Boucle (à la demande) ---------- */
  let attente = false;
  function demander() { if (!attente) { attente = true; requestAnimationFrame(image); } }
  function image() { attente = false; const bouge = controles.update(); rendu.render(scene, camera); if (bouge) demander(); }
  controles.addEventListener('change', demander);
  new ResizeObserver(() => { camera.aspect = largeur() / hauteur(); camera.updateProjectionMatrix(); rendu.setSize(largeur(), hauteur()); demander(); }).observe(conteneur);

  // bornes de la coupe : hauteur des structures
  const boite = new THREE.Box3().setFromObject(gltf.scene);
  vue('oblique'); appliquer();
  return {
    donnees, objets, PARCOURS, A_REGARDER, vue, bornes: [boite.min.y, boite.max.y],
    opaciteOs(v) { etat.opaciteOs = v; appliquer(); },
    parcours(nom) { etat.parcours = etat.parcours === nom ? null : nom; etat.choisi = null; appliquer(); vue(etat.parcours ? PARCOURS[nom].vue : 'oblique', !!etat.parcours); return etat.parcours; },
    coupe(y) { etat.coupe = y; appliquer(); },
    etat: () => ({ ...etat }), camera, demander,
  };
}
