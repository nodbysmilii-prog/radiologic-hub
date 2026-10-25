/* =========================================================
   RadiologicHub — Fractures de l'extrémité distale du radius :
   os de la main et du poignet en 3D (module ES, three.js 0.170.0)
   ---------------------------------------------------------
   Modèle : public/models/main/main.glb + main.json (scripts/export_main.py,
   Z-Anatomy CC BY-SA 4.0), main droite.
   Repère : +Y proximal, +Z palmaire, −X radial (pouce).
   • os colorés par groupe (avant-bras, carpe proximal, carpe distal, métacarpe,
     phalanges) ; survol ou clic → nom de l'os ;
   • vues : face palmaire, face dorsale, profil (côté ulnaire : palmaire à gauche), oblique ;
   • mesures tracées sur le radius du modèle (repères calculés par l'export) :
     inclinaison radiale, hauteur radiale, inclinaison palmaire ; chacune dans son plan,
     vue de face avec l'axe du radius vertical ;
   • repères de lecture : axe radius–lunatum–capitatum, scaphoïde, radio-ulnaire
     distale, rangées du carpe ;
   • rendu à la demande.
   ========================================================= */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

const GROUPES = {
  'avant-bras': { color: 0xeee6d2, nom: 'Radius et ulna' },
  'carpe-proximal': { color: 0x8fd1c7, nom: 'Carpe, rangée proximale' },
  'carpe-distal': { color: 0x9fb6e8, nom: 'Carpe, rangée distale' },
  metacarpe: { color: 0xf3d39a, nom: 'Métacarpiens' },
  phalanges: { color: 0xf2e9dc, nom: 'Phalanges' },
};
export const COULEURS_MESURES = { inclinaison: 0x2a9d8f, hauteur: 0xf18d25, palmaire: 0x3c67b8, axe: 0xc8102e };
const REPERES = {
  axe: { ids: ['radius', 'lunatum', 'capitatum'], vue: 'profil', texte: 'Profil : radius, lunatum et capitatum empilés sur une même ligne' },
  scaphoide: { ids: ['scaphoide'], vue: 'palmaire', texte: 'Scaphoïde : une fracture du col peut accompagner une fracture du radius' },
  rud: { ids: ['radius', 'ulna'], vue: 'palmaire', texte: 'Articulation radio-ulnaire distale : diastasis ou tête ulnaire déplacée ?' },
  rangees: { ids: ['scaphoide', 'lunatum', 'triquetrum', 'capitatum', 'hamatum'], vue: 'palmaire', texte: 'Arcs de Gilula : bords proximal et distal de la 1re rangée, bord proximal du capitatum et de l\'hamatum' },
};

export async function creerVisionneuse(conteneur, { base, onProgression = () => {} }) {
  const donnees = await (await fetch(`${base}main.json`, { cache: 'no-cache' })).json();
  const largeur = () => conteneur.clientWidth, hauteur = () => conteneur.clientHeight;

  const rendu = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  rendu.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  rendu.setSize(largeur(), hauteur());
  rendu.domElement.className = 'c3d-canvas';
  conteneur.appendChild(rendu.domElement);
  const calque = document.createElement('div'); calque.className = 'c3d-etiquettes'; conteneur.appendChild(calque);
  const bulle = document.createElement('div'); bulle.className = 'p3d-bulle'; bulle.hidden = true; conteneur.appendChild(bulle);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, largeur() / hauteur(), 0.01, 60);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8178, 1.7));
  const soleil = new THREE.DirectionalLight(0xffffff, 1.5); soleil.position.set(-2, 3, 4); scene.add(soleil);
  const contre = new THREE.DirectionalLight(0xffffff, 0.7); contre.position.set(2, -1, -4); scene.add(contre);
  const controles = new OrbitControls(camera, rendu.domElement);
  controles.enableDamping = true; controles.dampingFactor = 0.12; controles.minDistance = 0.6; controles.maxDistance = 8;

  onProgression('Chargement du modèle…');
  const chargeur = new GLTFLoader(); chargeur.setMeshoptDecoder(MeshoptDecoder);
  const gltf = await chargeur.loadAsync(`${base}main.glb?v=${donnees.empreinte || ''}`);
  const infos = Object.fromEntries(donnees.os.map(o => [o.id, o]));
  const os = {};
  gltf.scene.traverse(o => {
    if (!o.isMesh) return;
    const id = o.name in infos ? o.name : (o.parent && o.parent.name in infos ? o.parent.name : o.name);
    const info = infos[id]; if (!info) return;
    o.material = new THREE.MeshStandardMaterial({ color: GROUPES[info.groupe].color, roughness: 0.7, side: THREE.DoubleSide });
    o.userData = { id, info, couleur: GROUPES[info.groupe].color };
    os[id] = o;
  });
  scene.add(gltf.scene);

  /* ---------- Mesures (repères calculés sur le radius du modèle) ---------- */
  const V = a => new THREE.Vector3(...a);
  const R = Object.fromEntries(Object.entries(donnees.reperes).map(([k, v]) => [k, V(v)]));
  const axe = V(donnees.axe_radius).normalize();
  const M = donnees.mesures_modele;
  const matLigne = (c, op = 1) => new THREE.MeshBasicMaterial({ color: c, depthTest: false, transparent: true, opacity: op });
  function trait(a, b, c, r = 0.009, op = 1) {
    const d = b.clone().sub(a), l = d.length();
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, l, 10), matLigne(c, op));
    m.position.copy(a).addScaledVector(d, 0.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); m.renderOrder = 10;
    return m;
  }
  function pointe(a, dir, c) {
    const m = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.08, 14), matLigne(c));
    m.position.copy(a); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize()); m.renderOrder = 11; return m;
  }
  function arc(centre, u, v, rayon, c) {     // arc entre deux directions unitaires u → v
    const ang = u.angleTo(v), pts = [];
    const n = u.clone().cross(v).normalize();
    for (let i = 0; i <= 24; i++) pts.push(centre.clone().add(u.clone().applyAxisAngle(n, ang * i / 24).multiplyScalar(rayon)));
    const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 32, 0.007, 8, false), matLigne(c)); m.renderOrder = 11; return m;
  }
  const point = (p, c) => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.022, 16, 12), matLigne(c)); m.position.copy(p); m.renderOrder = 12; return m; };
  const mesures = {};
  const etiquettes = [];
  function etiquette(texte, pos, couleur) {
    const el = document.createElement('span'); el.className = 'c3d-etiquette p3d-mesure'; el.textContent = texte;
    el.style.setProperty('--c', '#' + couleur.toString(16).padStart(6, '0')); calque.appendChild(el);
    const e = { el, pos, visible: false }; etiquettes.push(e); return e;
  }
  // Chaque mesure est tracée dans son plan (frontal ou sagittal), avec la perpendiculaire à l'axe du radius ;
  // la caméra de la mesure regarde ce plan de face, l'axe du radius vertical à l'écran.
  const plan = n0 => { const n = n0.clone().addScaledVector(axe, -n0.dot(axe)).normalize(); return { n, perp: axe.clone().cross(n).normalize() }; };
  const dansPlan = (v, n) => v.clone().addScaledVector(n, -v.dot(n));
  const PLANS = { frontal: plan(new THREE.Vector3(0, 0, 1)), sagittal: plan(new THREE.Vector3(1, 0, 0)) };
  const fmt = x => String(x).replace('.', ',');
  {
    const { n: nF, perp: pF } = PLANS.frontal;
    const S = R.styloide, C = R['coin-ulnaire'];
    const SC = dansPlan(S.clone().sub(C), nF), lSC = SC.length(), uSC = SC.clone().normalize();
    const dirP = pF.dot(SC) > 0 ? pF.clone() : pF.clone().negate();                // perpendiculaire à l'axe, côté radial
    const axeTrait = (centre, c) => trait(centre.clone().addScaledVector(axe, -0.12), centre.clone().addScaledVector(axe, 0.75), c, 0.005, 0.6);
    // inclinaison radiale
    const g1 = new THREE.Group();
    g1.add(trait(C.clone().addScaledVector(uSC, -0.1), C.clone().addScaledVector(uSC, lSC + 0.12), COULEURS_MESURES.inclinaison, 0.011),
      trait(C.clone().addScaledVector(dirP, -0.1), C.clone().addScaledVector(dirP, lSC + 0.12), COULEURS_MESURES.inclinaison, 0.007, 0.75),
      arc(C, dirP, uSC, Math.max(0.24, lSC * 0.9), COULEURS_MESURES.inclinaison), axeTrait(C.clone().lerp(S, 0.5), COULEURS_MESURES.axe),
      point(S, COULEURS_MESURES.inclinaison), point(C, COULEURS_MESURES.inclinaison));
    mesures.inclinaison = { groupe: g1, plan: 'frontal', centre: S.clone().lerp(C, 0.5), etiquettes: [etiquette(`Inclinaison radiale ≈ ${fmt(M.inclinaison_radiale_deg)}°`, C.clone().addScaledVector(dirP, lSC * 0.55).addScaledVector(axe, 0.2), COULEURS_MESURES.inclinaison)] };
    // hauteur radiale : perpendiculaires à l'axe par la styloïde et par le coin ulnaire, flèche le long de l'axe
    const g2 = new THREE.Group();
    const h = C.clone().sub(S).dot(axe);
    const ext = lSC * 0.35;
    g2.add(trait(S.clone().addScaledVector(dirP, ext), S.clone().addScaledVector(dirP, -lSC - 0.05), COULEURS_MESURES.hauteur, 0.007, 0.8),
      trait(C.clone().addScaledVector(dirP, lSC + ext), C.clone().addScaledVector(dirP, -0.05), COULEURS_MESURES.hauteur, 0.007, 0.8));
    const xF = S.clone().addScaledVector(dirP, ext * 0.8), yF = xF.clone().addScaledVector(axe, h);
    g2.add(trait(xF, yF, COULEURS_MESURES.hauteur, 0.011), pointe(xF, axe.clone().negate(), COULEURS_MESURES.hauteur), pointe(yF, axe, COULEURS_MESURES.hauteur),
      axeTrait(C.clone().lerp(S, 0.5), COULEURS_MESURES.axe), point(S, COULEURS_MESURES.hauteur), point(C, COULEURS_MESURES.hauteur));
    mesures.hauteur = { groupe: g2, plan: 'frontal', centre: S.clone().lerp(C, 0.5), etiquettes: [etiquette(`Hauteur radiale ≈ ${fmt(M.hauteur_radiale_mm)} mm`, xF.clone().lerp(yF, 0.5).addScaledVector(dirP, -0.2), COULEURS_MESURES.hauteur)] };
    // inclinaison palmaire (plan sagittal)
    const { n: nS, perp: pS } = PLANS.sagittal;
    const D = R['rebord-dorsal'], P = R['rebord-palmaire'];
    const DP = dansPlan(P.clone().sub(D), nS), lDP = DP.length(), uDP = DP.clone().normalize();
    const dirS = pS.dot(DP) > 0 ? pS.clone() : pS.clone().negate();               // perpendiculaire à l'axe, côté palmaire
    const g3 = new THREE.Group();
    g3.add(trait(D.clone().addScaledVector(uDP, -0.1), D.clone().addScaledVector(uDP, lDP + 0.14), COULEURS_MESURES.palmaire, 0.011),
      trait(D.clone().addScaledVector(dirS, -0.1), D.clone().addScaledVector(dirS, lDP + 0.14), COULEURS_MESURES.palmaire, 0.007, 0.75),
      arc(D, dirS, uDP, Math.max(0.24, lDP * 1.05), COULEURS_MESURES.palmaire), axeTrait(D.clone().lerp(P, 0.5), COULEURS_MESURES.axe),
      point(D, COULEURS_MESURES.palmaire), point(P, COULEURS_MESURES.palmaire));
    mesures.palmaire = { groupe: g3, plan: 'sagittal', centre: D.clone().lerp(P, 0.5), etiquettes: [etiquette(`Inclinaison palmaire ≈ ${fmt(M.inclinaison_palmaire_deg)}°`, D.clone().addScaledVector(dirS, lDP * 0.7).addScaledVector(axe, 0.22), COULEURS_MESURES.palmaire)] };
    for (const k of Object.keys(mesures)) { mesures[k].groupe.visible = false; scene.add(mesures[k].groupe); }
  }

  /* ---------- État ---------- */
  const etat = { calques: { 'avant-bras': true, carpe: true, metacarpe: true, phalanges: true }, mesure: null, repere: null, choisi: null };
  function appliquer() {
    const actifs = etat.repere ? new Set(REPERES[etat.repere].ids) : null;
    for (const [id, o] of Object.entries(os)) {
      const g = o.userData.info.groupe;
      const calqueOn = etat.calques[g.startsWith('carpe') ? 'carpe' : g];
      o.visible = calqueOn;
      const m = o.material;
      const enAvant = (actifs && actifs.has(id)) || etat.choisi === id;
      const attenue = (actifs && !actifs.has(id)) || (etat.mesure && id !== 'radius' && id !== 'ulna');
      m.color.setHex(enAvant ? (actifs ? 0xc8102e : 0xf2ab2f) : o.userData.couleur);
      m.transparent = !!attenue && !enAvant; m.opacity = m.transparent ? 0.22 : 1; m.depthWrite = !m.transparent;
      m.emissive.setHex(enAvant ? 0x2a0000 : 0);
      m.needsUpdate = true;
    }
    for (const [k, m] of Object.entries(mesures)) { m.groupe.visible = etat.mesure === k; m.etiquettes.forEach(e => { e.visible = etat.mesure === k; }); }
    demander();
  }

  /* ---------- Survol et clic : nom de l'os ---------- */
  const rayon = new THREE.Raycaster(), souris = new THREE.Vector2();
  function osSous(ev) {
    const r = rendu.domElement.getBoundingClientRect();
    souris.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    rayon.setFromCamera(souris, camera);
    const t = rayon.intersectObjects(Object.values(os).filter(o => o.visible && !o.material.transparent), false)[0];
    return t ? t.object.userData.id : null;
  }
  rendu.domElement.addEventListener('pointermove', ev => {
    const id = osSous(ev);
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
    const id = osSous(ev);
    etat.choisi = id && etat.choisi !== id ? id : null;
    conteneur.dispatchEvent(new CustomEvent('poignet-os', { detail: etat.choisi ? infos[etat.choisi] : null, bubbles: true }));
    appliquer();
  });

  /* ---------- Vues ---------- */
  const cible = new THREE.Vector3(0, 0.15, 0);
  const VUES = {
    palmaire: [new THREE.Vector3(0, 0.15, 3.4), new THREE.Vector3(0, 1, 0)],
    dorsale: [new THREE.Vector3(0, 0.15, -3.4), new THREE.Vector3(0, 1, 0)],
    profil: [new THREE.Vector3(3.4, 0.15, 0), new THREE.Vector3(0, 1, 0)],
    oblique: [new THREE.Vector3(-1.9, 0.9, 2.6), new THREE.Vector3(0, 1, 0)],
  };
  function vue(nom) {
    const [p, up] = VUES[nom];
    camera.position.copy(p); camera.up.copy(up); controles.target.copy(cible); controles.update(); demander();
  }
  // mesure : plan vu de face, axe du radius vertical (profil vu côté ulnaire : palmaire à gauche, comme le schéma)
  function vueAlignee(nomPlan, centre, distance) {
    const { n } = PLANS[nomPlan];
    camera.position.copy(centre).addScaledVector(n, distance); camera.up.copy(axe); controles.target.copy(centre); controles.update(); demander();
  }
  const vueMesure = m => vueAlignee(m.plan, m.centre.clone().addScaledVector(axe, 0.12), 1.9);
  // repères : poignet entier, axe du radius vertical (profil vu côté ulnaire, face vue côté palmaire)
  const vueRepere = r => vueAlignee(r.vue === 'profil' ? 'sagittal' : 'frontal', R.styloide.clone().lerp(R['coin-ulnaire'], 0.5).addScaledVector(axe, -0.05), 3);

  /* ---------- Boucle (à la demande) ---------- */
  let attente = false;
  function demander() { if (!attente) { attente = true; requestAnimationFrame(image); } }
  const v = new THREE.Vector3();
  function image() {
    attente = false;
    const bouge = controles.update();
    rendu.render(scene, camera);
    const w = largeur(), h = hauteur();
    for (const e of etiquettes) {
      if (!e.visible) { e.el.hidden = true; continue; }
      v.copy(e.pos).project(camera);
      e.el.hidden = v.z > 1;
      e.el.style.transform = `translate(${(v.x * 0.5 + 0.5) * w}px, ${(-v.y * 0.5 + 0.5) * h}px)`;
    }
    if (bouge) demander();
  }
  controles.addEventListener('change', demander);
  new ResizeObserver(() => { camera.aspect = largeur() / hauteur(); camera.updateProjectionMatrix(); rendu.setSize(largeur(), hauteur()); demander(); }).observe(conteneur);

  vue('oblique'); appliquer();
  return {
    donnees, os, mesures, REPERES, vue,
    calque(nom, on) { etat.calques[nom] = on; appliquer(); },
    mesure(nom) { etat.mesure = etat.mesure === nom ? null : nom; etat.repere = null; etat.choisi = null; appliquer(); if (etat.mesure) vueMesure(mesures[etat.mesure]); else vue('oblique'); return etat.mesure; },
    repere(nom) { etat.repere = etat.repere === nom ? null : nom; etat.mesure = null; etat.choisi = null; appliquer(); if (etat.repere) vueRepere(REPERES[nom]); else vue('oblique'); return etat.repere; },
    etat: () => ({ ...etat }), camera, demander,
  };
}
