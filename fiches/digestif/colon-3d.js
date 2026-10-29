/* =========================================================
   RadiologicHub — Colites : deux visionneuses 3D (module ES, three.js 0.170.0)
   ---------------------------------------------------------
   1. creerCadre(conteneur, { base }) : le cadre colique (public/models/colon/, Z-Anatomy
      CC BY-SA 4.0 — scripts/export_colon.py) ; segments colorés, cliquables ;
      surligner([ids], couleur) allume les segments d'une atteinte (Crohn, RCH, ischémie…).
      Repère : +Y haut, +Z avant du patient, +X gauche du patient (droite du patient à gauche
      de l'écran en vue de face).
   2. creerParoi(conteneur) : un segment de paroi colique dessiné pour le site, en couches
      emboîtées et ouvertes (interface, muqueuse, sous-muqueuse, musculeuse, séreuse,
      graisse péri-colique) ; modes « anatomie », « échographie » (5 couches alternativement
      hyper / hypoéchogènes) et atteintes (couches touchées, rehaussement en cible…).
   Rendu à la demande ; événement « colon-choix » (detail : { id, nom }).
   ========================================================= */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

/* ---------- Socle commun : rendu, caméra, contrôles, bulle, boucle à la demande ---------- */
function scene3d(conteneur, { fov = 30, distMax = 9 } = {}) {
  const L = () => conteneur.clientWidth, H = () => conteneur.clientHeight;
  const rendu = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  rendu.setPixelRatio(Math.min(window.devicePixelRatio, 2)); rendu.setSize(L(), H());
  rendu.domElement.className = 'c3d-canvas'; conteneur.appendChild(rendu.domElement);
  const bulle = document.createElement('div'); bulle.className = 'r3d-bulle'; bulle.hidden = true; conteneur.appendChild(bulle);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(fov, L() / H(), 0.02, 60);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8178, 1.6));
  const soleil = new THREE.DirectionalLight(0xffffff, 1.4); soleil.position.set(-2, 3, 4); scene.add(soleil);
  const contre = new THREE.DirectionalLight(0xffffff, 0.7); contre.position.set(3, -2, -4); scene.add(contre);
  const controles = new OrbitControls(camera, rendu.domElement);
  controles.enableDamping = true; controles.dampingFactor = 0.12; controles.minDistance = 0.5; controles.maxDistance = distMax;
  let attente = false;
  const demander = () => { if (!attente) { attente = true; requestAnimationFrame(image); } };
  function image() { attente = false; const bouge = controles.update(); rendu.render(scene, camera); if (bouge) demander(); }
  controles.addEventListener('change', demander);
  new ResizeObserver(() => { camera.aspect = L() / H(); camera.updateProjectionMatrix(); rendu.setSize(L(), H()); demander(); }).observe(conteneur);
  const rayon = new THREE.Raycaster(), souris = new THREE.Vector2();
  function viser(ev, objets) {
    const r = rendu.domElement.getBoundingClientRect();
    souris.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    rayon.setFromCamera(souris, camera);
    const t = rayon.intersectObjects(objets.filter(o => o.visible && o.material.opacity > 0.15), false);
    return t[0] ? t[0].object : null;
  }
  function survol(objets, nom) {
    rendu.domElement.addEventListener('pointermove', ev => {
      const o = viser(ev, objets());
      rendu.domElement.style.cursor = o ? 'pointer' : '';
      if (!o) { bulle.hidden = true; return; }
      const r = conteneur.getBoundingClientRect();
      bulle.textContent = nom(o); bulle.hidden = false;
      bulle.style.transform = `translate(${ev.clientX - r.left + 12}px, ${ev.clientY - r.top - 10}px)`;
    });
    rendu.domElement.addEventListener('pointerleave', () => { bulle.hidden = true; });
  }
  function clic(objets, fn) {
    let appui = null;
    rendu.domElement.addEventListener('pointerdown', ev => { appui = [ev.clientX, ev.clientY]; });
    rendu.domElement.addEventListener('pointerup', ev => {
      if (!appui || Math.hypot(ev.clientX - appui[0], ev.clientY - appui[1]) > 5) return;
      fn(viser(ev, objets()));
    });
  }
  return { rendu, scene, camera, controles, demander, survol, clic };
}

/* =========================================================
   1. Cadre colique (Z-Anatomy)
   ========================================================= */
export const SEGMENTS = {
  caecum: 0xe85d75, ascendant: 0xf18d25, transverse: 0xf2ab2f, descendant: 0x2a9d8f, sigmoide: 0x3c67b8,
};
const AUTRES = { appendice: { color: 0xd98c8c, op: 1 }, tenias: { color: 0xfff1d6, op: 1 }, ileon: { color: 0xd9a27a, op: 0.6 }, grele: { color: 0xe8b48c, op: 0.28 } };

export async function creerCadre(conteneur, { base }) {
  const donnees = await (await fetch(`${base}colon.json`, { cache: 'no-cache' })).json();
  const S = scene3d(conteneur);
  const chargeur = new GLTFLoader(); chargeur.setMeshoptDecoder(MeshoptDecoder);
  const gltf = await chargeur.loadAsync(`${base}colon.glb?v=${donnees.empreinte || ''}`);
  const infos = Object.fromEntries(donnees.structures.map(s => [s.id, s]));
  const objets = {};
  gltf.scene.traverse(o => {
    if (!o.isMesh) return;
    const id = o.name in infos ? o.name : (o.parent && o.parent.name in infos ? o.parent.name : o.name);
    if (!infos[id]) return;
    const f = SEGMENTS[id] ? { color: SEGMENTS[id], op: 1 } : AUTRES[id] || { color: 0xcccccc, op: 1 };
    o.material = new THREE.MeshStandardMaterial({ color: f.color, roughness: 0.55, transparent: f.op < 1, opacity: f.op, depthWrite: f.op >= 1, side: THREE.DoubleSide, emissive: 0x000000 });
    o.userData = { id, base: f };
    objets[id] = o;
  });
  S.scene.add(gltf.scene);

  const etat = { allumes: null, couleur: null, grele: true };
  function appliquer() {
    for (const [id, o] of Object.entries(objets)) {
      const f = o.userData.base, on = etat.allumes && etat.allumes.includes(id);
      if (id === 'grele' || id === 'ileon') o.visible = etat.grele;
      let op = f.op, col = f.color;
      if (etat.allumes) {
        if (on) { col = etat.couleur ?? f.color; op = 1; } else op = id === 'grele' ? 0.08 : 0.22;
      }
      o.material.color.setHex(col); o.material.opacity = op; o.material.transparent = op < 1; o.material.depthWrite = op >= 1;
      o.material.emissive.setHex(on ? 0x2a1500 : 0);
    }
    S.demander();
  }
  const nom = o => infos[o.userData.id].nom;
  S.survol(() => Object.values(objets), nom);
  S.clic(() => Object.values(objets), o => {
    conteneur.dispatchEvent(new CustomEvent('colon-choix', { detail: o ? { id: o.userData.id, nom: nom(o) } : null, bubbles: true }));
  });

  const cible = new THREE.Vector3(0, 0, 0), D = 7.6;
  const VUES = {
    face: [new THREE.Vector3(0, 0.1, D), new THREE.Vector3(0, 1, 0)],
    profil: [new THREE.Vector3(D, 0.1, 0), new THREE.Vector3(0, 1, 0)],
    oblique: [new THREE.Vector3(3.2, 1.6, 4.8), new THREE.Vector3(0, 1, 0)],
  };
  function vue(n) { const [p, up] = VUES[n]; S.camera.position.copy(p); S.camera.up.copy(up); S.controles.target.copy(cible); S.controles.update(); S.demander(); }
  vue('face'); appliquer();
  return {
    donnees, objets, vue,
    surligner(ids, couleur) { etat.allumes = ids && ids.length ? ids : null; etat.couleur = couleur ?? null; appliquer(); },
    grele(v) { etat.grele = !!v; appliquer(); },
    etat: () => ({ ...etat }),
  };
}

/* =========================================================
   2. Paroi colique en couches (dessin 3D du site)
   ========================================================= */
// de la lumière vers la périphérie ; e = épaisseur relative ; l = longueur visible (emboîtement)
export const COUCHES = [
  { id: 'interface', nom: 'Interface avec la lumière digestive', e: 0.03, l: 4.6, couleur: 0xf7d9d6, echo: 'hyper' },
  { id: 'muqueuse', nom: 'Muqueuse', e: 0.16, l: 4.6, couleur: 0xe0607a, echo: 'hypo' },
  { id: 'sous-muqueuse', nom: 'Sous-muqueuse', e: 0.18, l: 3.9, couleur: 0xf6d38a, echo: 'hyper' },
  { id: 'musculeuse', nom: 'Musculeuse', e: 0.2, l: 3.2, couleur: 0xb5414f, echo: 'hypo' },
  { id: 'sereuse', nom: 'Séreuse', e: 0.05, l: 2.5, couleur: 0xf2efe6, echo: 'hyper' },
  { id: 'graisse', nom: 'Graisse péri-colique', e: 0.35, l: 1.8, couleur: 0xf9e7b8, echo: null },
];
const R_LUMIERE = 0.55, OUVERTURE = Math.PI * 1.45;

function couche(r0, r1, L, mat) {
  const g = new THREE.Group();
  const profil = [new THREE.Vector2(r0, 0), new THREE.Vector2(r1, 0), new THREE.Vector2(r1, L), new THREE.Vector2(r0, L), new THREE.Vector2(r0, 0)];
  const tour = new THREE.Mesh(new THREE.LatheGeometry(profil, 64, Math.PI * 0.275, OUVERTURE), mat);
  g.add(tour);
  // faces de coupe (début et fin de l'ouverture)
  for (const phi of [Math.PI * 0.275, Math.PI * 0.275 + OUVERTURE]) {
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(r1 - r0, L), mat);
    pl.position.set(Math.sin(phi) * (r0 + r1) / 2, L / 2, Math.cos(phi) * (r0 + r1) / 2);
    pl.rotation.y = phi + Math.PI / 2;
    g.add(pl);
  }
  return g;
}

export function creerParoi(conteneur) {
  const S = scene3d(conteneur, { fov: 28, distMax: 12 });
  const racine = new THREE.Group(); racine.rotation.z = -Math.PI / 2; racine.position.x = -2.2; S.scene.add(racine);
  let calques = [];
  const etat = { mode: 'anatomie', choisie: null, atteinte: 'normal' };

  // atteintes : couches touchées, épaississement, aspect
  const ATTEINTES = {
    normal: { touchees: [], epais: 1 },
    muqueuse: { touchees: ['interface', 'muqueuse', 'sous-muqueuse'], epais: 1.6 },
    transmurale: { touchees: ['interface', 'muqueuse', 'sous-muqueuse', 'musculeuse', 'sereuse', 'graisse'], epais: 2.2 },
    cible: { touchees: ['muqueuse', 'sous-muqueuse'], epais: 1.8, rehausse: ['interface', 'muqueuse'], hypo: ['sous-muqueuse'] },
    'double-cible': { touchees: ['muqueuse', 'sous-muqueuse', 'musculeuse'], epais: 1.8, rehausse: ['interface', 'muqueuse', 'musculeuse'], hypo: ['sous-muqueuse'] },
    seche: { touchees: ['interface', 'muqueuse', 'sous-muqueuse', 'musculeuse', 'sereuse'], epais: 1.5, pale: true },
    pneumatose: { touchees: ['muqueuse', 'sous-muqueuse', 'musculeuse'], epais: 1.2, gaz: true },
  };

  function construire() {
    racine.clear(); calques = [];
    const a = ATTEINTES[etat.atteinte] || ATTEINTES.normal;
    let r = R_LUMIERE;
    for (const c of COUCHES) {
      const touchee = a.touchees.includes(c.id);
      const e = c.e * (touchee && c.id !== 'graisse' ? a.epais : 1);
      let col = c.couleur;
      if (etat.mode === 'echo') col = c.echo === 'hyper' ? 0xf4f4f4 : c.echo === 'hypo' ? 0x2b2b30 : 0x6c6c72;
      else if (etat.atteinte !== 'normal') {
        if (a.rehausse && a.rehausse.includes(c.id)) col = 0xff3b5c;
        else if (a.hypo && a.hypo.includes(c.id)) col = 0xb9d3e8;
        else if (a.pale && touchee) col = 0xd9d0c4;
        else if (touchee && c.id === 'graisse') col = 0xd8b07a;
        else if (touchee) col = new THREE.Color(c.couleur).lerp(new THREE.Color(0xc8102e), 0.35).getHex();
      }
      const choisie = etat.choisie === c.id;
      const op = etat.choisie && !choisie ? 0.18 : c.id === 'graisse' ? 0.55 : 1;
      const mat = new THREE.MeshStandardMaterial({ color: col, roughness: etat.mode === 'echo' ? 0.9 : 0.6, transparent: op < 1, opacity: op, depthWrite: op >= 1, side: THREE.DoubleSide, emissive: choisie ? 0x331a00 : 0 });
      const g = couche(r, r + e, c.l, mat);
      g.traverse(m => { if (m.isMesh) { m.userData.couche = c; calques.push(m); } });
      racine.add(g);
      r += e;
    }
    if (a.gaz) {
      const mg = new THREE.MeshStandardMaterial({ color: 0x111114, roughness: 0.3 });
      for (let i = 0; i < 26; i++) {
        const phi = Math.PI * 0.3 + (i * 0.618 % 1) * OUVERTURE * 0.95, h = 0.3 + (i * 0.381 % 1) * 3.4;
        const rr = R_LUMIERE + 0.08 + (i * 0.27 % 1) * 0.45;
        const b = new THREE.Mesh(new THREE.SphereGeometry(0.035 + (i % 3) * 0.012, 12, 8), mg);
        b.position.set(Math.sin(phi) * rr, h, Math.cos(phi) * rr); racine.add(b);
      }
    }
    S.demander();
  }
  const nom = o => o.userData.couche.nom;
  S.survol(() => calques, nom);
  S.clic(() => calques, o => {
    etat.choisie = o && etat.choisie !== o.userData.couche.id ? o.userData.couche.id : null; construire();
    conteneur.dispatchEvent(new CustomEvent('paroi-choix', { detail: etat.choisie ? COUCHES.find(c => c.id === etat.choisie) : null, bubbles: true }));
  });
  S.camera.position.set(2.2, 3.4, 7.8); S.controles.target.set(0, 0, 0); S.controles.update();
  construire();
  return {
    mode(m) { etat.mode = m; construire(); },
    atteinte(k) { etat.atteinte = k; construire(); },
    choisir(id) { etat.choisie = id; construire(); },
    etat: () => ({ ...etat }), ATTEINTES,
  };
}
