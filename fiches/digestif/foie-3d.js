/* © Radiologic Hub — Tous droits réservés. Contenus originaux ; ressources tierces sous leurs licences. */
/* =========================================================
   RadiologicHub — fiche « Masses hépatiques solides » : le foie en 3D (module ES, three.js 0.170.0)
   ---------------------------------------------------------
   Modèle : public/models/foie/foie.glb + foie.json (scripts/export_foie.py, Z-Anatomy CC BY-SA 4.0,
   dérivé de BodyParts3D). Repère : +Y haut, +Z avant du patient, +X gauche du patient, centré sur le foie.
   • les 8 segments de Couinaud du pack, colorés, sélectionnables (clic sur le modèle ou boutons) ;
   • pseudolésions de la fiche (stéatose focale, épargne focale) : le segment concerné est mis en
     avant et les repères de la fiche (lit vésiculaire, péri-falciforme) sont marqués ;
   • transparence du foie réglable pour voir la veine porte, les veines hépatiques et la VCI ;
   • vues : de face, de dessus, de dessous, de dos, côté droit, oblique ; rendu à la demande.
   ========================================================= */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

const FAMILLES = {
  bile: { color: 0x3f9b4a, op: 0.95 }, porte: { color: 0x5b2a86, op: 1 }, veine: { color: 0x3c67b8, op: 1 },
};

export async function creerFoie(conteneur, { base, segments, pathologies, onProgression = () => {} }) {
  const donnees = await (await fetch(`${base}foie.json`, { cache: 'no-cache' })).json();
  const largeur = () => conteneur.clientWidth, hauteur = () => conteneur.clientHeight;

  const rendu = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  rendu.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  rendu.setSize(largeur(), hauteur());
  rendu.domElement.className = 'c3d-canvas';
  conteneur.appendChild(rendu.domElement);
  const bulle = document.createElement('div'); bulle.className = 'r3d-bulle'; bulle.hidden = true; conteneur.appendChild(bulle);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, largeur() / hauteur(), 0.05, 40);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8178, 1.6));
  const soleil = new THREE.DirectionalLight(0xffffff, 1.4); soleil.position.set(-2, 3, 4); scene.add(soleil);
  const contre = new THREE.DirectionalLight(0xffffff, 0.8); contre.position.set(3, -2, -4); scene.add(contre);
  const controles = new OrbitControls(camera, rendu.domElement);
  controles.enableDamping = true; controles.dampingFactor = 0.12; controles.minDistance = 1.2; controles.maxDistance = 9;

  onProgression('Chargement du modèle…');
  const chargeur = new GLTFLoader(); chargeur.setMeshoptDecoder(MeshoptDecoder);
  const gltf = await chargeur.loadAsync(`${base}foie.glb?v=${donnees.empreinte || ''}`);
  const infos = Object.fromEntries(donnees.structures.map(s => [s.id, s]));
  const objets = {};
  gltf.scene.traverse(o => {
    if (!o.isMesh) return;
    const id = o.name in infos ? o.name : (o.parent && o.parent.name in infos ? o.parent.name : o.name);
    const info = infos[id]; if (!info) return;
    const seg = info.segment;
    const f = seg ? { color: parseInt(segments[seg].couleur.slice(1), 16), op: 1 } : FAMILLES[info.cat];
    o.material = new THREE.MeshStandardMaterial({ color: f.color, roughness: seg ? 0.55 : 0.5, side: THREE.DoubleSide, transparent: f.op < 1, opacity: f.op });
    o.userData = { id, info, base: f };
    objets[id] = o;
  });
  scene.add(gltf.scene);

  /* Repères de la fiche : petites sphères visibles à travers le foie */
  const reperes = new THREE.Group(); scene.add(reperes);
  const reperesInfos = Object.fromEntries((donnees.reperes || []).map(r => [r.id, r]));

  const etat = { segment: null, pathologie: null, transparence: 0, vaisseaux: true, vesicule: true };
  function appliquer() {
    const patho = etat.pathologie ? pathologies[etat.pathologie] : null;
    const actifs = new Set(patho ? patho.segments : etat.segment ? [etat.segment] : []);
    const couleurPatho = patho ? parseInt(patho.couleur.slice(1), 16) : 0;
    const op = 1 - etat.transparence;
    for (const o of Object.values(objets)) {
      const { info, base: f } = o.userData, seg = info.segment, m = o.material;
      if (seg) {
        const choisi = actifs.has(seg);
        m.color.setHex(patho && choisi ? couleurPatho : f.color);
        m.emissive.setHex(choisi ? (patho ? 0x331100 : 0x222222) : 0);
        m.opacity = Math.max(0.04, actifs.size && !choisi ? Math.min(op, 0.22) : op);
        m.transparent = m.opacity < 1; m.depthWrite = m.opacity >= 1;
        o.renderOrder = choisi ? 2 : 0;
      } else if (info.cat === 'bile') o.visible = etat.vesicule;
      else o.visible = etat.vaisseaux;
    }
    reperes.clear();
    if (patho) {
      for (const id of patho.reperes) {
        const r = reperesInfos[id]; if (!r) continue;
        const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.035, 20, 14), new THREE.MeshBasicMaterial({ color: couleurPatho, depthTest: false, transparent: true, opacity: 0.95 }));
        sphere.position.set(...r.position); sphere.renderOrder = 10; sphere.userData = { repere: id };
        reperes.add(sphere);
      }
    }
    demander();
  }

  /* ---------- Survol et clic ---------- */
  const rayon = new THREE.Raycaster(), souris = new THREE.Vector2();
  function sous(ev) {
    const r = rendu.domElement.getBoundingClientRect();
    souris.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    rayon.setFromCamera(souris, camera);
    const cibles = Object.values(objets).filter(o => o.visible && o.material.opacity > 0.15);
    const t = rayon.intersectObjects(cibles, false);
    return t.length ? t[0].object.userData.id : null;
  }
  const nom = id => infos[id].segment ? segments[infos[id].segment].nom : infos[id].nom;
  rendu.domElement.addEventListener('pointermove', ev => {
    const id = sous(ev);
    rendu.domElement.style.cursor = id ? 'pointer' : '';
    if (!id) { bulle.hidden = true; return; }
    const r = conteneur.getBoundingClientRect();
    bulle.textContent = nom(id); bulle.hidden = false;
    bulle.style.transform = `translate(${ev.clientX - r.left + 12}px, ${ev.clientY - r.top - 10}px)`;
  });
  rendu.domElement.addEventListener('pointerleave', () => { bulle.hidden = true; });
  let appui = null;
  rendu.domElement.addEventListener('pointerdown', ev => { appui = [ev.clientX, ev.clientY]; });
  rendu.domElement.addEventListener('pointerup', ev => {
    if (!appui || Math.hypot(ev.clientX - appui[0], ev.clientY - appui[1]) > 5) return;
    const id = sous(ev);
    const seg = id && infos[id].segment;
    if (seg) choisirSegment(etat.segment === seg && !etat.pathologie ? null : seg);
    else if (id) { conteneur.dispatchEvent(new CustomEvent('foie-choix', { detail: { structure: infos[id] }, bubbles: true })); }
    else choisirSegment(null);
  });

  function choisirSegment(seg) {
    etat.segment = seg; etat.pathologie = null;
    conteneur.dispatchEvent(new CustomEvent('foie-choix', { detail: { segment: seg }, bubbles: true }));
    appliquer();
  }
  function choisirPathologie(id) {
    etat.pathologie = id; etat.segment = null;
    conteneur.dispatchEvent(new CustomEvent('foie-choix', { detail: { pathologie: id }, bubbles: true }));
    appliquer();
  }

  /* ---------- Vues (+X gauche du patient, +Z avant) ---------- */
  const cible = new THREE.Vector3(0, 0, 0);
  const D = 5.3;
  const VUES = {
    face: [new THREE.Vector3(0, 0.05, D), new THREE.Vector3(0, 1, 0)],
    dessus: [new THREE.Vector3(0, D, 0.05), new THREE.Vector3(0, 0, -1)],
    dessous: [new THREE.Vector3(0, -D, 0.05), new THREE.Vector3(0, 0, 1)],
    dos: [new THREE.Vector3(0, 0.05, -D), new THREE.Vector3(0, 1, 0)],
    droit: [new THREE.Vector3(-D, 0.05, 0), new THREE.Vector3(0, 1, 0)],
    oblique: [new THREE.Vector3(-1.6, 1.2, 2.9), new THREE.Vector3(0, 1, 0)],
  };
  function vue(n) {
    const [p, up] = VUES[n];
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
    donnees, objets, infos, vue, choisirSegment, choisirPathologie,
    transparence(v) { etat.transparence = +v; appliquer(); },
    vaisseaux(v) { etat.vaisseaux = !!v; appliquer(); },
    vesicule(v) { etat.vesicule = !!v; appliquer(); },
    etat: () => ({ ...etat }), camera, scene, demander,
  };
}
