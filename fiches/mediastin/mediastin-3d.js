/* =========================================================
   RadiologicHub — Masses médiastinales : le médiastin en 3D (module ES, three.js 0.170.0)
   ---------------------------------------------------------
   Modèle : public/models/mediastin/mediastin.glb + mediastin.json (scripts/export_mediastin.py,
   Z-Anatomy CC BY-SA 4.0). Repère : +Y haut, +Z avant du patient, +X gauche du patient,
   centré sur la carène.
   • deux découpages : compartiments de Heitzman (7) ou de Felson (3), volumes translucides ;
   • clic sur un compartiment → ce qu'il contient (fiche de l'auteur) ; survol → nom ;
   • surligner(id) : une structure seule (ex. tronc veineux innominé gauche), compartiments masqués ;
   • vues : de face, de profil (comme le cliché de profil), du dessus, oblique ;
   • transparence des compartiments réglable ; rendu à la demande.
   ========================================================= */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

export const FAMILLES = {
  os: { color: 0xeee6d2, op: 1 },
  cote: { color: 0xeee6d2, op: 0.22 },
  coeur: { color: 0xd9776f, op: 1 },
  artere: { color: 0xc8102e, op: 1 },
  'artere-pulm': { color: 0x7b5ea7, op: 1 },
  veine: { color: 0x3c67b8, op: 1 },
  air: { color: 0x9ad7d0, op: 1 },
  oesophage: { color: 0xf0a37a, op: 1 },
  thymus: { color: 0xf2ab2f, op: 1 },
  thyroide: { color: 0xa0522d, op: 1 },
  diaphragme: { color: 0xc9a27c, op: 0.16 },
};
// Couleurs des compartiments (charte du site)
export const COULEURS = {
  'h-ocm': 0x2a9d8f, 'h-retrosternal': 0xf2ab2f, 'h-acp': 0xe85d75, 'h-epto': 0x3c67b8,
  'h-carinaire': 0x7b5ea7, 'h-gcv': 0x2f8a57, 'h-eimp': 0xf18d25,
  'f-anterieur': 0xf2ab2f, 'f-moyen': 0x3c67b8, 'f-posterieur': 0x2f8a57,
};

export async function creerVisionneuse(conteneur, { base, onProgression = () => {} }) {
  const donnees = await (await fetch(`${base}mediastin.json`, { cache: 'no-cache' })).json();
  const largeur = () => conteneur.clientWidth, hauteur = () => conteneur.clientHeight;

  const rendu = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  rendu.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  rendu.setSize(largeur(), hauteur());
  rendu.domElement.className = 'c3d-canvas';
  conteneur.appendChild(rendu.domElement);
  const bulle = document.createElement('div'); bulle.className = 'r3d-bulle'; bulle.hidden = true; conteneur.appendChild(bulle);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, largeur() / hauteur(), 0.05, 80);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8178, 1.6));
  const soleil = new THREE.DirectionalLight(0xffffff, 1.4); soleil.position.set(-2, 3, 4); scene.add(soleil);
  const contre = new THREE.DirectionalLight(0xffffff, 0.8); contre.position.set(3, -1, -4); scene.add(contre);
  const controles = new OrbitControls(camera, rendu.domElement);
  controles.enableDamping = true; controles.dampingFactor = 0.12; controles.minDistance = 1.2; controles.maxDistance = 14;

  onProgression('Chargement du modèle…');
  const chargeur = new GLTFLoader(); chargeur.setMeshoptDecoder(MeshoptDecoder);
  const gltf = await chargeur.loadAsync(`${base}mediastin.glb?v=${donnees.empreinte || ''}`);
  const infos = Object.fromEntries([...donnees.structures.map(s => [s.id, { ...s, type: 'structure' }]), ...donnees.compartiments.map(c => [c.id, { ...c, type: 'compartiment' }])]);
  const objets = {};
  gltf.scene.traverse(o => {
    if (!o.isMesh) return;
    const id = o.name in infos ? o.name : (o.parent && o.parent.name in infos ? o.parent.name : o.name);
    const info = infos[id]; if (!info) return;
    if (info.type === 'compartiment') {
      o.material = new THREE.MeshStandardMaterial({ color: COULEURS[id] || 0x888888, roughness: 0.6, transparent: true, opacity: 0.45, depthWrite: false, side: THREE.DoubleSide });
      o.renderOrder = 10;
    } else {
      const f = FAMILLES[info.cat] || FAMILLES.os;
      o.material = new THREE.MeshStandardMaterial({ color: f.color, roughness: info.cat === 'os' || info.cat === 'cote' ? 0.85 : 0.5, transparent: f.op < 1, opacity: f.op, depthWrite: f.op >= 1, side: THREE.DoubleSide });
      if (f.op < 1) o.renderOrder = 5;
    }
    o.userData = { id, info };
    objets[id] = o;
  });
  scene.add(gltf.scene);

  const etat = { systeme: 'heitzman', opacite: 0.45, choisi: null, surligne: null, estompe: false, cotes: true };
  function appliquer() {
    const fantome = etat.estompe || !!etat.choisi || !!etat.surligne;   // organes estompés : les compartiments ressortent
    for (const [id, o] of Object.entries(objets)) {
      const info = o.userData.info;
      if (info.type !== 'compartiment') {
        const f = FAMILLES[info.cat] || FAMILLES.os;
        if (info.cat === 'cote') o.visible = etat.cotes;
        const vedette = etat.surligne === id;              // structure montrée par un lien du texte
        const op = vedette ? 1 : fantome ? Math.min(f.op, info.cat === 'os' ? 0.45 : 0.28) : f.op;
        o.material.opacity = op; o.material.transparent = op < 1; o.material.depthWrite = op >= 1;
        o.material.emissive.setHex(vedette ? 0x2a3f7a : 0);
        continue;
      }
      o.visible = etat.systeme === info.systeme && !etat.surligne;
      const choisi = etat.choisi === id, autreChoisi = etat.choisi && !choisi;
      o.material.opacity = choisi ? Math.min(0.8, etat.opacite + 0.25) : autreChoisi ? etat.opacite * 0.25 : etat.opacite;
      o.material.emissive.setHex(choisi ? 0x332200 : 0);
    }
    demander();
  }

  /* ---------- Survol et clic ---------- */
  const rayon = new THREE.Raycaster(), souris = new THREE.Vector2();
  function sous(ev) {
    const r = rendu.domElement.getBoundingClientRect();
    souris.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    rayon.setFromCamera(souris, camera);
    const visibles = Object.values(objets).filter(o => o.visible && (o.userData.info.type === 'compartiment' || o.material.opacity > 0.5));
    const t = rayon.intersectObjects(visibles, false);
    // un compartiment touché passe avant les organes qu'il contient
    const c = t.find(h => h.object.userData.info.type === 'compartiment');
    return (c || t[0] || {}).object ? (c || t[0]).object.userData.id : null;
  }
  rendu.domElement.addEventListener('pointermove', ev => {
    const id = sous(ev);
    rendu.domElement.style.cursor = id ? 'pointer' : '';
    if (!id) { bulle.hidden = true; return; }
    const r = conteneur.getBoundingClientRect(), i = infos[id];
    bulle.textContent = i.abr ? `${i.nom} (${i.abr})` : i.nom; bulle.hidden = false;
    bulle.style.transform = `translate(${ev.clientX - r.left + 12}px, ${ev.clientY - r.top - 10}px)`;
  });
  rendu.domElement.addEventListener('pointerleave', () => { bulle.hidden = true; });
  let appui = null;
  rendu.domElement.addEventListener('pointerdown', ev => { appui = [ev.clientX, ev.clientY]; });
  rendu.domElement.addEventListener('pointerup', ev => {
    if (!appui || Math.hypot(ev.clientX - appui[0], ev.clientY - appui[1]) > 5) return;
    const id = sous(ev);
    choisir(id && infos[id].type === 'compartiment' && etat.choisi !== id ? id : null);
  });
  function choisir(id) {
    etat.choisi = id; etat.surligne = null;
    conteneur.dispatchEvent(new CustomEvent('mediastin-compartiment', { detail: id ? infos[id] : null, bubbles: true }));
    appliquer();
  }

  /* ---------- Vues (+X gauche du patient, +Z avant) ---------- */
  const cible = new THREE.Vector3(0.15, -0.4, -0.05);
  const VUES = {
    face: [new THREE.Vector3(0.15, -0.4, 6.4), new THREE.Vector3(0, 1, 0)],
    profil: [new THREE.Vector3(6.4, -0.4, -0.05), new THREE.Vector3(0, 1, 0)],          // vu du côté gauche, comme le cliché de profil
    dessus: [new THREE.Vector3(0.15, 6.4, 0), new THREE.Vector3(0, 0, -1)],
    oblique: [new THREE.Vector3(5.2, 2.2, 5.6), new THREE.Vector3(0, 1, 0)],
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

  vue('oblique'); appliquer();
  return {
    donnees, objets, infos, vue, choisir,
    systeme(s) { etat.systeme = s; etat.choisi = null; etat.surligne = null; appliquer(); conteneur.dispatchEvent(new CustomEvent('mediastin-compartiment', { detail: null, bubbles: true })); },
    opacite(v) { etat.opacite = v; appliquer(); },
    estomper(v) { etat.estompe = !!v; appliquer(); },
    surligner(id) {
      etat.surligne = id in objets ? id : null; etat.choisi = null; appliquer();
      conteneur.dispatchEvent(new CustomEvent('mediastin-compartiment', { detail: etat.surligne ? infos[id] : null, bubbles: true }));
    },
    cotes(v) { etat.cotes = !!v; appliquer(); },
    etat: () => ({ ...etat }), camera, demander,
  };
}
