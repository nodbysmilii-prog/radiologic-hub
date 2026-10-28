/* =========================================================
   RadiologicHub — Pancréatite aiguë : le pancréas en 3D (module ES, three.js 0.170.0)
   ---------------------------------------------------------
   Modèle : public/models/pancreas/pancreas.glb + pancreas.json (scripts/export_pancreas.py,
   Z-Anatomy CC BY-SA 4.0). Repère : +Y haut, +Z avant du patient, +X gauche du patient,
   centré sur l'isthme.
   • 5 segments colorés (tête, crochet, isthme, corps, queue) ; clic ou liste → segment mis en
     avant, limites et rapports ;
   • rapports : duodénum, rate, reins, vaisseaux (AMS, VMS, veine porte, veine et artère
     spléniques…), canaux (Wirsung, Santorini, cholédoque) ; estomac et côlon transverse
     masqués par défaut ;
   • vues : de face, du dessus, de profil, « comme au scanner » (vue axiale depuis les pieds) ;
   • écartement des segments (pour voir les limites), rendu à la demande.
   ========================================================= */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

// Couleurs des segments (charte) et des familles de structures
export const SEGMENTS = {
  tete: 0xf2ab2f, crochet: 0xe85d75, isthme: 0x2a9d8f, corps: 0x3c67b8, queue: 0x7b5ea7,
};
export const FAMILLES = {
  tube: { color: 0xe8b48c, op: 0.55 }, rate: { color: 0x9c4a5a, op: 0.9 }, rein: { color: 0xb5655a, op: 0.45 },
  estomac: { color: 0xe7a98a, op: 0.25 }, colon: { color: 0xd6b48c, op: 0.25 }, bile: { color: 0x3f9b4a, op: 1 },
  os: { color: 0xeee6d2, op: 0.5 }, artere: { color: 0xc8102e, op: 1 }, veine: { color: 0x3c67b8, op: 1 },
  porte: { color: 0x5b2a86, op: 1 }, canal: { color: 0xffffff, op: 1 },
};
const MASQUES = ['estomac', 'colon-transverse'];   // visibles seulement sur demande

export async function creerVisionneuse(conteneur, { base, onProgression = () => {} }) {
  const donnees = await (await fetch(`${base}pancreas.json`, { cache: 'no-cache' })).json();
  const largeur = () => conteneur.clientWidth, hauteur = () => conteneur.clientHeight;

  const rendu = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  rendu.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  rendu.setSize(largeur(), hauteur());
  rendu.domElement.className = 'c3d-canvas';
  conteneur.appendChild(rendu.domElement);
  const bulle = document.createElement('div'); bulle.className = 'r3d-bulle'; bulle.hidden = true; conteneur.appendChild(bulle);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, largeur() / hauteur(), 0.02, 40);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8178, 1.6));
  const soleil = new THREE.DirectionalLight(0xffffff, 1.4); soleil.position.set(-2, 3, 4); scene.add(soleil);
  const contre = new THREE.DirectionalLight(0xffffff, 0.8); contre.position.set(3, -2, -4); scene.add(contre);
  const controles = new OrbitControls(camera, rendu.domElement);
  controles.enableDamping = true; controles.dampingFactor = 0.12; controles.minDistance = 0.6; controles.maxDistance = 8;

  onProgression('Chargement du modèle…');
  const chargeur = new GLTFLoader(); chargeur.setMeshoptDecoder(MeshoptDecoder);
  const gltf = await chargeur.loadAsync(`${base}pancreas.glb?v=${donnees.empreinte || ''}`);
  const infos = Object.fromEntries(donnees.structures.map(s => [s.id, s]));
  const objets = {};
  gltf.scene.traverse(o => {
    if (!o.isMesh) return;
    const id = o.name in infos ? o.name : (o.parent && o.parent.name in infos ? o.parent.name : o.name);
    const info = infos[id]; if (!info) return;
    const seg = info.segment;
    const f = seg ? { color: SEGMENTS[seg], op: 1 } : (FAMILLES[info.cat] || FAMILLES.os);
    o.material = new THREE.MeshStandardMaterial({ color: f.color, roughness: seg ? 0.5 : 0.6, transparent: f.op < 1, opacity: f.op, depthWrite: f.op >= 1, side: THREE.DoubleSide });
    if (f.op < 1) o.renderOrder = 5;
    o.userData = { id, info, base: f, depart: o.position.clone() };
    objets[id] = o;
  });
  scene.add(gltf.scene);

  const etat = { choisi: null, voisins: true, digestif: false, ecart: 0, canaux: true };
  function appliquer() {
    for (const [id, o] of Object.entries(objets)) {
      const { info, base: f } = o.userData, seg = info.segment;
      if (MASQUES.includes(id)) o.visible = etat.digestif;
      else if (!seg && info.cat !== 'canal' && info.cat !== 'bile') o.visible = etat.voisins || ['artere', 'veine', 'porte'].includes(info.cat);
      if (info.cat === 'canal' || id === 'vbp') o.visible = etat.canaux;
      let op = f.op;
      if (etat.choisi && !seg) op = Math.min(op, 0.18);
      if (etat.choisi && seg && seg !== infos[etat.choisi].segment) op = 0.3;
      o.material.opacity = op; o.material.transparent = op < 1; o.material.depthWrite = op >= 1;
      o.material.emissive.setHex(seg && etat.choisi === id ? 0x332200 : 0);
      // écartement : chaque segment s'éloigne du centre du pancréas selon sa position
      if (seg) { const c = info.centre; o.position.set(o.userData.depart.x + c[0] * etat.ecart, o.userData.depart.y + c[1] * etat.ecart * 0.4, o.userData.depart.z + c[2] * etat.ecart * 0.4); }
    }
    demander();
  }

  /* ---------- Survol et clic ---------- */
  const rayon = new THREE.Raycaster(), souris = new THREE.Vector2();
  function sous(ev) {
    const r = rendu.domElement.getBoundingClientRect();
    souris.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    rayon.setFromCamera(souris, camera);
    const visibles = Object.values(objets).filter(o => o.visible && o.material.opacity > 0.2);
    const t = rayon.intersectObjects(visibles, false);
    const s = t.find(h => h.object.userData.info.segment);
    const h = s || t[0];
    return h ? h.object.userData.id : null;
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
    choisir(id && infos[id].segment && etat.choisi !== id ? id : null, id && !infos[id].segment ? id : null);
  });
  function choisir(id, structure = null) {
    etat.choisi = id;
    conteneur.dispatchEvent(new CustomEvent('pancreas-segment', { detail: id ? infos[id] : structure ? infos[structure] : null, bubbles: true }));
    appliquer();
  }

  /* ---------- Vues (+X gauche du patient, +Z avant) ---------- */
  const cible = new THREE.Vector3(0.12, 0, 0);
  const D = 3.2;
  const VUES = {
    face: [new THREE.Vector3(0.12, 0.1, D), new THREE.Vector3(0, 1, 0)],
    dessus: [new THREE.Vector3(0.12, D, 0.05), new THREE.Vector3(0, 0, -1)],
    profil: [new THREE.Vector3(D, 0.1, 0), new THREE.Vector3(0, 1, 0)],
    // vue axiale depuis les pieds : droite du patient à gauche de l'image, avant en haut
    scanner: [new THREE.Vector3(0.12, -D, 0.02), new THREE.Vector3(0, 0, 1)],
    oblique: [new THREE.Vector3(1.9, 1.2, 2.4), new THREE.Vector3(0, 1, 0)],
  };
  function vue(nom) {
    const [p, up] = VUES[nom];
    camera.position.copy(p); camera.up.copy(up); controles.target.copy(cible); controles.update(); demander();
  }

  /* ---------- Boucle (à la demande) ---------- */
  let attente = false;
  function demander() { if (!attente) { attente = true; requestAnimationFrame(image); } }
  function image() { attente = false; const bouge = controles.update(); rendu.render(scene, camera); if (bouge) demander(); }
  controles.addEventListener('change', demander);
  new ResizeObserver(() => { camera.aspect = largeur() / hauteur(); camera.updateProjectionMatrix(); rendu.setSize(largeur(), hauteur()); demander(); }).observe(conteneur);

  vue('face'); appliquer();
  return {
    donnees, objets, infos, vue, choisir,
    voisins(v) { etat.voisins = !!v; appliquer(); },
    digestif(v) { etat.digestif = !!v; appliquer(); },
    canaux(v) { etat.canaux = !!v; appliquer(); },
    ecart(v) { etat.ecart = +v; appliquer(); },
    etat: () => ({ ...etat }), camera, demander,
  };
}
