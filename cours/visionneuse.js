/* =========================================================
   RadiologicHub — Cours : visionneuse 3D (module ES, Three.js 0.170.0)
   ---------------------------------------------------------
   Chargée seulement à la demande (bouton « Voir en 3D » sur téléphone,
   arrivée de la section à l'écran sur ordinateur).
   • rotation, zoom et déplacement (OrbitControls), rendu à la demande ;
   • surbrillance de la structure choisie (clic sur le modèle, sur son
     étiquette ou dans la liste), les autres s'estompent ;
   • os, nerfs, vaisseaux et muscles de contexte affichables ou non ;
   • plan de coupe « sonde » : plan transversal mobile ; le modèle est coupé
     sous la sonde (on garde la partie proximale), section remplie de la
     couleur de la structure ; la « vue de la coupe » regarde cette section
     d'en bas et de l'arrière : superficiel (côté sonde) en haut, latéral à
     droite, comme les schémas par défaut (médial à gauche).
   Repère des modèles (manifest.json) : +Y haut, +Z avant du patient,
   -X côté latéral du membre droit, unités en mètres.
   ========================================================= */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

/* Couleurs par matériau (noms donnés par scripts/export_muscles.py) */
const STYLES = {
  'rh-muscle': { color: 0xb5503d, roughness: 0.7 },
  'rh-tendon': { color: 0xf1ede2, roughness: 0.45 },
  'rh-contexte': { color: 0xc58b7c, roughness: 0.8, transparent: true, opacity: 0.22 },
  'rh-os': { color: 0xeee6d2, roughness: 0.6 },
  'rh-cartilage': { color: 0xbcd7e4, roughness: 0.5 },
  'rh-nerf': { color: 0xf3c21b, roughness: 0.5 },
  'rh-artere': { color: 0xd8342e, roughness: 0.45 },
  'rh-veine': { color: 0x3a66d8, roughness: 0.45 },
};
const COULEUR_COUPE = 0xf5a524;
/* Structures étiquetées en permanence (les autres : quand elles sont choisies) */
const TOUJOURS_ETIQUETEES = new Set(['biceps-long', 'biceps-court', 'semi-tendineux', 'semi-membraneux', 'nerf-sciatique']);
/* Hauteur de l'ancre des étiquettes dans la structure (0 = bas, 1 = haut), pour qu'elles ne se superposent pas */
const HAUTEUR_ANCRE = { 'biceps-long': 0.66, 'biceps-court': 0.28, 'semi-tendineux': 0.8, 'semi-membraneux': 0.46, 'nerf-sciatique': 0.9 };

export async function creerVisionneuse(conteneur, { base, manifeste, ids, onProgression = () => {}, onSelection = () => {} }) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf4f3ef);
  const camera = new THREE.PerspectiveCamera(32, 1, 0.01, 20);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.localClippingEnabled = true;
  renderer.domElement.className = 'v3d-canvas';
  renderer.domElement.setAttribute('aria-label', 'Modèle 3D des ischio-jambiers : faites glisser pour tourner, pincez ou utilisez la molette pour zoomer');
  renderer.domElement.setAttribute('role', 'img');
  conteneur.appendChild(renderer.domElement);
  const calque = document.createElement('div');
  calque.className = 'v3d-etiquettes';
  conteneur.appendChild(calque);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8577, 1.6));
  const soleil = new THREE.DirectionalLight(0xffffff, 1.6);
  soleil.position.set(-0.6, 1.2, -1.4);
  scene.add(soleil);
  const contre = new THREE.DirectionalLight(0xffffff, 0.7);
  contre.position.set(0.8, 0.4, 1.2);
  scene.add(contre);

  const controles = new OrbitControls(camera, renderer.domElement);
  controles.enableDamping = false;
  controles.minDistance = 0.12;
  controles.maxDistance = 3;

  /* ---------- Chargement des modèles approuvés ---------- */
  const chargeur = new GLTFLoader();
  chargeur.setMeshoptDecoder(MeshoptDecoder);
  const structures = new Map();      // id → { id, nom, categorie, objet, maillages, ancre, etiquette }
  const plan = new THREE.Plane(new THREE.Vector3(0, 1, 0), 10);   // garde y ≥ altitude de la sonde
  let coupeActive = false;
  let fait = 0;
  const aCharger = manifeste.modeles.filter(m => ids.includes(m.id));
  onProgression(0, aCharger.length);

  await Promise.all(aCharger.map(m => new Promise((resolve, reject) => {
    chargeur.load(`${base}${m.fichier}?v=${m.version}`, gltf => {
      const objet = gltf.scene;
      const maillages = [];
      objet.traverse(o => { if (o.isMesh) maillages.push(o); });
      maillages.forEach(o => {
        const style = STYLES[o.material && o.material.name] || STYLES['rh-muscle'];
        o.material = new THREE.MeshStandardMaterial({ ...style, metalness: 0, side: THREE.FrontSide, depthWrite: !style.transparent });
        o.material.userData.base = { opacity: style.opacity ?? 1, transparent: !!style.transparent, color: style.color };
        o.userData.structure = m.id;
        if (!style.transparent) {
          // Section : faces arrière de la même géométrie, couleur pleine, visibles seulement là où le modèle est coupé
          const section = new THREE.Mesh(o.geometry, new THREE.MeshBasicMaterial({ color: new THREE.Color(style.color).multiplyScalar(0.8), side: THREE.BackSide, clippingPlanes: [plan] }));
          section.userData.section = true;
          section.visible = false;
          o.add(section);
        }
      });
      scene.add(objet);
      structures.set(m.id, { id: m.id, nom: m.nom, categorie: m.categorie, objet, maillages });
      onProgression(++fait, aCharger.length);
      resolve();
    }, undefined, err => reject(new Error(`Modèle illisible : ${m.fichier} (${(err && err.message) || err})`)));
  })));

  /* ---------- Repères : boîte englobante, ancres des étiquettes, sonde ---------- */
  scene.updateMatrixWorld(true);
  const boite = new THREE.Box3();
  structures.forEach(s => boite.expandByObject(s.objet));
  const centre = boite.getCenter(new THREE.Vector3()), taille = boite.getSize(new THREE.Vector3());
  const v = new THREE.Vector3();
  structures.forEach(s => {
    // Ancre : point le plus postérieur (z minimal) à la hauteur choisie (muscles), sinon le point le plus proche de cette hauteur
    const b = new THREE.Box3().setFromObject(s.objet), c = b.getCenter(new THREE.Vector3());
    c.y = b.min.y + (HAUTEUR_ANCRE[s.id] ?? 0.5) * (b.max.y - b.min.y);
    let meilleur = null, score = Infinity;
    s.maillages.forEach(mesh => {
      const pos = mesh.geometry.attributes.position;
      const pas = Math.max(1, Math.floor(pos.count / 1500));
      for (let i = 0; i < pos.count; i += pas) {
        v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld);
        const sc = s.categorie === 'muscle' || s.categorie === 'contexte'
          ? Math.abs(v.y - c.y) * 4 + v.z
          : v.distanceToSquared(c);
        if (sc < score) { score = sc; meilleur = v.clone(); }
      }
    });
    s.ancre = meilleur || c;
    // Échantillon de points (repère monde) pour situer la section de la structure au niveau de la sonde
    const pts = [];
    s.maillages.forEach(mesh => {
      const pos = mesh.geometry.attributes.position;
      const pas = Math.max(1, Math.floor(pos.count / 4000));
      for (let i = 0; i < pos.count; i += pas) { v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld); pts.push(v.x, v.y, v.z); }
    });
    s.points = new Float32Array(pts);
    s.ancreCoupe = null;
    const e = document.createElement('button');
    e.type = 'button';
    e.className = `v3d-etiquette v3d-${s.categorie}`;
    e.textContent = s.nom;
    e.dataset.structure = s.id;
    e.addEventListener('click', ev => { ev.stopPropagation(); api.selectionner(api.selection === s.id ? null : s.id); });
    calque.appendChild(e);
    s.etiquette = e;
  });

  // Ischio-jambiers : limites pour placer la sonde sur la face postérieure
  const boiteIJ = new THREE.Box3();
  structures.forEach(s => { if (s.categorie === 'muscle') boiteIJ.expandByObject(s.objet); });
  if (boiteIJ.isEmpty()) boiteIJ.copy(boite);
  const largeurPlan = Math.max(0.16, (boiteIJ.max.x - boiteIJ.min.x) * 1.9), profondeurPlan = Math.max(0.16, taille.z * 0.95);
  const groupeSonde = new THREE.Group();
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(largeurPlan, profondeurPlan),
    new THREE.MeshBasicMaterial({ color: COULEUR_COUPE, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false }));
  quad.rotation.x = -Math.PI / 2;
  const contour = new THREE.LineSegments(new THREE.EdgesGeometry(quad.geometry), new THREE.LineBasicMaterial({ color: COULEUR_COUPE }));
  contour.rotation.x = -Math.PI / 2;
  const sonde = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.014, 0.022), new THREE.MeshStandardMaterial({ color: 0x3a3d44, roughness: 0.5 }));
  const repereSonde = new THREE.Mesh(new THREE.SphereGeometry(0.0045, 16, 12), new THREE.MeshBasicMaterial({ color: COULEUR_COUPE }));
  const zPost = boiteIJ.min.z - 0.012;
  sonde.position.set(0, 0, zPost - centre.z);
  repereSonde.position.set(0.03, 0, zPost - centre.z);
  groupeSonde.add(quad, contour, sonde, repereSonde);
  groupeSonde.position.set((boiteIJ.min.x + boiteIJ.max.x) / 2, 0, centre.z);
  groupeSonde.visible = false;
  quad.raycast = () => {};
  scene.add(groupeSonde);

  /* ---------- Rendu à la demande ---------- */
  let attente = false;
  const projete = new THREE.Vector3();
  function placerEtiquettes() {
    const w = renderer.domElement.clientWidth, h = renderer.domElement.clientHeight;
    const places = [];
    structures.forEach(s => {
      // Coupe active : étiquette au centre de la section (structure absente à ce niveau : pas d'étiquette)
      const ancre = coupeActive ? s.ancreCoupe : s.ancre;
      const visible = !!ancre && s.objet.visible && (TOUJOURS_ETIQUETEES.has(s.id) || api.selection === s.id);
      projete.copy(ancre || s.ancre).project(camera);
      const devant = projete.z < 1 && Math.abs(projete.x) <= 1.02 && Math.abs(projete.y) <= 1.02;
      s.etiquette.hidden = !(visible && devant);
      s.etiquette.classList.toggle('is-active', api.selection === s.id);
      if (!s.etiquette.hidden) places.push({ e: s.etiquette, x: (projete.x + 1) / 2 * w, y: (1 - projete.y) / 2 * h, l: s.etiquette.offsetWidth, h: s.etiquette.offsetHeight });
    });
    // Étiquettes qui se chevauchent : décalées vers le bas, de haut en bas de l'écran
    places.sort((a, b) => a.y - b.y);
    places.forEach((p, i) => {
      for (let j = 0; j < i; j++) {
        const q = places[j];
        if (Math.abs(p.x - q.x) < (p.l + q.l) / 2 + 4 && Math.abs(p.y - q.y) < p.h + 3) p.y = q.y + p.h + 3;
      }
      p.e.style.transform = `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px) translate(-50%, -100%)`;
    });
  }
  function rendre() {
    attente = false;
    renderer.render(scene, camera);
    placerEtiquettes();
  }
  const demander = () => { if (!attente) { attente = true; requestAnimationFrame(rendre); } };
  controles.addEventListener('change', demander);

  const redimensionner = () => {
    const w = conteneur.clientWidth || 600, h = conteneur.clientHeight || 450;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    demander();
  };
  const observateur = new ResizeObserver(redimensionner);
  observateur.observe(conteneur);

  /* ---------- Clic sur le modèle : choisir une structure ---------- */
  const rayon = new THREE.Raycaster(), souris = new THREE.Vector2();
  let depart = null;
  renderer.domElement.addEventListener('pointerdown', e => { depart = [e.clientX, e.clientY]; });
  renderer.domElement.addEventListener('pointerup', e => {
    if (!depart || Math.hypot(e.clientX - depart[0], e.clientY - depart[1]) > 5) return;
    const r = renderer.domElement.getBoundingClientRect();
    souris.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    rayon.setFromCamera(souris, camera);
    const cibles = [];
    structures.forEach(s => { if (s.objet.visible) cibles.push(...s.maillages); });
    const touche = rayon.intersectObjects(cibles, false)
      .find(t => !(coupeActive && t.point.y < -plan.constant) && !t.object.userData.section
        && !(t.object.material.transparent && api.selection !== t.object.userData.structure && t.object.material.opacity < 0.3));
    api.selectionner(touche ? touche.object.userData.structure : null);
  });

  /* ---------- Vues ---------- */
  const rayonVue = Math.max(taille.x, taille.y, taille.z) * 0.5;
  const distance = rayonVue / Math.sin(THREE.MathUtils.degToRad(camera.fov / 2)) * 0.9;
  function vue(nom) {
    const cible = centre.clone();
    let pos;
    // Vue de la coupe : le plan coloré et le boîtier de la sonde masqueraient la section (contour et repère gardés)
    quad.visible = sonde.visible = nom !== 'coupe';
    if (nom === 'laterale') pos = new THREE.Vector3(centre.x - distance, centre.y, centre.z);
    else if (nom === 'coupe') {
      // D'en bas et de l'arrière : superficiel en haut de l'écran, latéral à droite
      const y = groupeSonde.visible ? -plan.constant : centre.y;
      cible.set(groupeSonde.position.x, y, centre.z);
      pos = cible.clone().add(new THREE.Vector3(0, -0.95, -0.3).multiplyScalar(distance * 0.36));
    } else pos = new THREE.Vector3(centre.x, centre.y, centre.z - distance);
    camera.position.copy(pos);
    controles.target.copy(cible);
    controles.update();
    demander();
  }

  /* ---------- Interface publique ---------- */
  const api = {
    selection: null,
    structures: [...structures.values()].map(({ id, nom, categorie }) => ({ id, nom, categorie })),
    reperes: manifeste.reperes,
    selectionner(id) {
      api.selection = id && structures.has(id) ? id : null;
      structures.forEach(s => s.maillages.forEach(mesh => {
        const m = mesh.material, b = m.userData.base;
        const choisie = s.id === api.selection;
        m.emissive.setHex(choisie ? 0x553311 : 0x000000);
        if (api.selection && !choisie) { m.transparent = true; m.opacity = Math.min(b.opacity, 0.28); m.depthWrite = false; }
        else if (choisie && b.transparent) { m.transparent = true; m.opacity = 0.75; m.depthWrite = true; }
        else { m.transparent = b.transparent; m.opacity = b.opacity; m.depthWrite = !b.transparent; }
        m.needsUpdate = true;
      }));
      onSelection(api.selection ? structures.get(api.selection) : null);
      demander();
    },
    /* Afficher / masquer une catégorie : 'os', 'nerf', 'vaisseau' (artère + veine), 'contexte' */
    afficher(categorie, visible) {
      structures.forEach(s => {
        const cat = s.categorie === 'artere' || s.categorie === 'veine' ? 'vaisseau' : s.categorie;
        if (cat === categorie) s.objet.visible = visible;
      });
      if (api.selection && !structures.get(api.selection).objet.visible) api.selectionner(null);
      demander();
    },
    /* Plan de la sonde à l'altitude y (null : masqué) ; couper : retirer ce qui est sous la sonde */
    sonde(y, { couper = true } = {}) {
      groupeSonde.visible = y != null;
      coupeActive = y != null && couper;
      if (y != null) { plan.constant = -y; groupeSonde.position.y = y; }
      structures.forEach(s => {
        let n = 0, sx = 0, sz = 0;
        for (let i = 0; y != null && i < s.points.length; i += 3) {
          if (Math.abs(s.points[i + 1] - y) < 0.008) { sx += s.points[i]; sz += s.points[i + 2]; n++; }
        }
        s.ancreCoupe = n ? new THREE.Vector3(sx / n, y, sz / n) : null;
      });
      structures.forEach(s => s.maillages.forEach(mesh => {
        mesh.material.clippingPlanes = coupeActive ? [plan] : [];
        mesh.material.needsUpdate = true;
        mesh.children.forEach(c => { if (c.userData.section) c.visible = coupeActive; });
      }));
      demander();
    },
    vue,
    rendre: demander,
    detruire() {
      observateur.disconnect();
      controles.dispose();
      renderer.dispose();
      conteneur.replaceChildren();
    },
  };
  redimensionner();
  vue('posterieure');
  return api;
}
