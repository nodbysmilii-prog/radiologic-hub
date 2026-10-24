/* =========================================================
   RadiologicHub — Cancer du cavum : base du crâne, foramens et espaces
   profonds en 3D, avec les voies de propagation (module ES, three.js 0.170.0)
   ---------------------------------------------------------
   Modèle : public/models/cavum/cavum.glb + cavum.json (scripts/export_cavum.py,
   Z-Anatomy CC BY-SA 4.0). Les espaces profonds sont des volumes schématiques
   (enveloppes) calés sur les structures qui les bordent.
   Repère : +Y haut, +Z avant du patient, −X côté droit du patient.
   • calques : os, muscles, espaces, vaisseaux et nerfs, foramens ;
   • voies : antérieure, latérale, postérieure, inférieure, supérieure ;
     chaque trajet est une ligne animée partant de la fossette de Rosenmüller
     (tumeur schématique, côté droit) ;
   • stades T : la fiche envoie l'événement « cavum-3d-stade » (detail : 'T1' … 'T4')
     sur #cavum-3d : les structures du stade sont mises en avant ;
   • rendu à la demande ; animation coupée si l'utilisateur préfère moins de mouvement.
   ========================================================= */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

const COULEURS = {
  os: { color: 0xeee6d2, roughness: 0.75 },
  'os-contexte': { color: 0xe6e0d4, roughness: 0.8, transparent: true, opacity: 0.16 },
  muscle: { color: 0xb5503d, roughness: 0.7 },
  pharynx: { color: 0xd98b80, roughness: 0.7, transparent: true, opacity: 0.55 },
  prevertebral: { color: 0x8a5a9c, roughness: 0.7 },
  muqueuse: { color: 0xe98fa0, roughness: 0.6, transparent: true, opacity: 0.75 },
  veine: { color: 0x3a5bd1, roughness: 0.5 },
  artere: { color: 0xc8102e, roughness: 0.45 },
  nerf: { color: 0xf3c21b, roughness: 0.5 },
  ganglion: { color: 0x4f9a5a, roughness: 0.6 },
};
const ESPACES = {
  'espace-masticateur': { couleur: 0xf18d25, nom: 'Espace masticateur / fosse infratemporale' },
  'espace-parapharynge': { couleur: 0xe8b923, nom: 'Espace parapharyngé' },
  'espace-carotidien': { couleur: 0xd63f4c, nom: 'Espace carotidien' },
  'espace-retropharynge': { couleur: 0x8e44ad, nom: 'Espace rétropharyngé' },
  'fosse-pterygopalatine': { couleur: 0x2a9d8f, nom: 'Fosse ptérygopalatine' },
};
const VOIES_COULEURS = { anterieure: 0x2a9d8f, laterale: 0xe8b923, posterieure: 0x8e44ad, inferieure: 0x3c67b8, superieure: 0xc8102e };
const CALQUES = { os: ['os', 'os-contexte'], muscles: ['muscle', 'pharynx', 'prevertebral', 'muqueuse', 'ganglion'], espaces: ['espace'], vaisseaux: ['artere', 'veine', 'nerf'] };
/* Point de passage d'un trajet → structures 3D allumées quand on choisit la voie */
const POINT_STRUCTURES = {
  fpp: ['fosse-pterygopalatine-d'], 'fosse-infratemporale': ['espace-masticateur-d'], parapharynge: ['espace-parapharynge-d'],
  carotidien: ['espace-carotidien-d'], retropharynge: ['espace-retropharynge', 'ganglions-retropharynges-d'],
  prevertebral: ['long-tete-d', 'long-cou-d'], 'sinus-caverneux': ['sinus-caverneux-d'], choane: ['nasopharynx'],
  oropharynx: ['oropharynx', 'voile'], clivus: ['sphenoide', 'occipital'], 'ostium-trompe': ['trompe-d'],
  'foramen-rond': ['v2-d'], 'foramen-ovale': ['v3-ant-d', 'v3-post-d', 'trijumeau-d'], 'canal-carotidien': ['carotide-interne-d'],
  'foramen-jugulaire': ['jugulaire-interne-d'],
};
/* Structures mises en avant pour chaque stade T (texte de la fiche, partie V) */
const STADES = {
  T1: { ids: ['nasopharynx', 'oropharynx', 'voile'], foramens: [], points: ['choane'] },
  T2: { ids: ['espace-parapharynge-d', 'pterygoidien-medial-d', 'pterygoidien-lateral-sup-d', 'pterygoidien-lateral-inf-d', 'long-tete-d', 'long-cou-d'], foramens: [] },
  T3: { ids: ['sphenoide', 'occipital', 'atlas', 'axis', 'palatin-d', 'maxillaire-d'], foramens: ['foramen-lacerum-d', 'canal-pterygoidien-d'] },
  T4: { ids: ['sinus-caverneux-d', 'v2-d', 'v3-ant-d', 'v3-post-d', 'trijumeau-d', 'espace-masticateur-d', 'carotide-interne-d'],
        foramens: ['foramen-ovale-d', 'foramen-rond-d', 'foramen-jugulaire-d', 'canal-carotidien-d', 'fissure-orbitaire-inf-d', 'fissure-orbitaire-sup-d'] },
};

export async function creerVisionneuse(conteneur, { base, onProgression = () => {} }) {
  const reduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const donnees = await (await fetch(`${base}cavum.json`, { cache: 'no-cache' })).json();
  const largeur = () => conteneur.clientWidth, hauteur = () => conteneur.clientHeight;

  const rendu = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  rendu.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  rendu.setSize(largeur(), hauteur());
  rendu.domElement.className = 'c3d-canvas';
  conteneur.appendChild(rendu.domElement);
  const calqueEtiquettes = document.createElement('div');
  calqueEtiquettes.className = 'c3d-etiquettes';
  conteneur.appendChild(calqueEtiquettes);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, largeur() / hauteur(), 0.01, 50);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8178, 1.6));
  const soleil = new THREE.DirectionalLight(0xffffff, 1.5); soleil.position.set(-2, 3, 4); scene.add(soleil);
  const contre = new THREE.DirectionalLight(0xffffff, 0.6); contre.position.set(2, -1, -3); scene.add(contre);
  const controles = new OrbitControls(camera, rendu.domElement);
  controles.enableDamping = true; controles.dampingFactor = 0.12; controles.minDistance = 0.8; controles.maxDistance = 9;

  /* ---------- Modèle ---------- */
  onProgression('Chargement du modèle…');
  const chargeur = new GLTFLoader(); chargeur.setMeshoptDecoder(MeshoptDecoder);
  const gltf = await chargeur.loadAsync(`${base}cavum.glb?v=${donnees.empreinte || ''}`);
  const infos = Object.fromEntries(donnees.structures.map(s => [s.id, s]));
  const objets = {};
  gltf.scene.traverse(o => {
    if (!o.isMesh) return;
    const id = o.name in infos ? o.name : (o.parent && o.parent.name in infos ? o.parent.name : o.name);
    const info = infos[id]; if (!info) return;
    let mat;
    if (info.cat === 'espace') {
      const e = ESPACES[info.espace];
      mat = new THREE.MeshStandardMaterial({ color: e.couleur, transparent: true, opacity: 0.3, roughness: 0.4, depthWrite: false, side: THREE.DoubleSide });
    } else {
      mat = new THREE.MeshStandardMaterial({ ...COULEURS[info.cat], side: THREE.DoubleSide });
      if (mat.transparent) mat.depthWrite = false;
    }
    o.material = mat; o.userData = { id, info, base: { opacity: mat.opacity, transparent: mat.transparent, color: mat.color.getHex() } };
    o.renderOrder = info.cat === 'espace' ? 2 : (mat.transparent ? 1 : 0);
    objets[id] = o;
  });
  scene.add(gltf.scene);

  /* ---------- Foramens ---------- */
  const groupeForamens = new THREE.Group(); scene.add(groupeForamens);
  const foramens = {};
  const geoF = new THREE.SphereGeometry(0.022, 20, 14);
  const geoAnneau = new THREE.TorusGeometry(0.034, 0.007, 10, 28);
  for (const f of donnees.foramens) {
    const g = new THREE.Group(); g.position.fromArray(f.pos);
    const coeur = new THREE.Mesh(geoF, new THREE.MeshStandardMaterial({ color: 0x111114, roughness: 0.3, depthTest: false, transparent: true }));
    const anneau = new THREE.Mesh(geoAnneau, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3, depthTest: false, transparent: true }));
    coeur.renderOrder = anneau.renderOrder = 10;
    g.add(coeur, anneau); g.userData = { foramen: f };
    groupeForamens.add(g); foramens[f.id] = g;
  }

  /* ---------- Tumeur (fossette de Rosenmüller droite) ---------- */
  const tumeur = new THREE.Mesh(new THREE.SphereGeometry(0.06, 28, 20),
    new THREE.MeshStandardMaterial({ color: 0xc8102e, emissive: 0x5a0010, roughness: 0.35 }));
  tumeur.position.fromArray(donnees.tumeur); scene.add(tumeur);

  /* ---------- Voies de propagation ---------- */
  const groupeVoies = new THREE.Group(); scene.add(groupeVoies);
  const trajets = [];
  for (const v of donnees.voies) {
    const couleur = VOIES_COULEURS[v.id];
    for (const t of v.trajets) {
      const courbe = new THREE.CatmullRomCurve3(t.pts.map(p => new THREE.Vector3(...p)), false, 'centripetal');
      const tube = new THREE.Mesh(new THREE.TubeGeometry(courbe, 64, 0.011, 8, false),
        new THREE.MeshStandardMaterial({ color: couleur, emissive: couleur, emissiveIntensity: 0.35, roughness: 0.4, depthTest: false, transparent: true, opacity: 0.95 }));
      tube.renderOrder = 8;
      const fin = courbe.getPointAt(1), avant = courbe.getPointAt(0.97);
      const pointe = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.09, 16),
        new THREE.MeshStandardMaterial({ color: couleur, emissive: couleur, emissiveIntensity: 0.35, depthTest: false, transparent: true }));
      pointe.position.copy(fin); pointe.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), fin.clone().sub(avant).normalize());
      pointe.renderOrder = 9;
      const billes = [];
      for (let i = 0; i < 3; i++) {
        const b = new THREE.Mesh(new THREE.SphereGeometry(0.02, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffffff, depthTest: false, transparent: true }));
        b.renderOrder = 11; billes.push(b);
      }
      const g = new THREE.Group(); g.add(tube, pointe, ...billes); groupeVoies.add(g);
      trajets.push({ voie: v.id, id: t.id, texte: t.texte, par: t.par, courbe, groupe: g, billes, longueur: courbe.getLength() });
    }
  }

  /* ---------- Étiquettes (HTML) ---------- */
  const etiquettes = [];
  // priorité : en cas de chevauchement, l'étiquette d'un foramen passe devant celle de la tumeur, puis des espaces
  const PRIORITE = { 'is-foramen': 3, 'is-tumeur': 2, 'is-espace': 1 };
  const ajouterEtiquette = (texte, pos, classe) => {
    const el = document.createElement('span'); el.className = 'c3d-etiquette ' + (classe || ''); el.textContent = texte;
    calqueEtiquettes.appendChild(el);
    const e = { el, pos: new THREE.Vector3(...pos), visible: true, priorite: PRIORITE[classe] || 0, l: 0, h: 0 };
    etiquettes.push(e); etiquettes.sort((a, b) => b.priorite - a.priorite); return e;
  };
  const etiqForamens = {};
  for (const f of donnees.foramens) if (f.id.endsWith('-d')) etiqForamens[f.id] = ajouterEtiquette(f.nom.replace(' (droit)', ''), f.pos, 'is-foramen');
  const etiqEspaces = {};
  for (const [id, o] of Object.entries(objets)) {
    if (o.userData.info.cat !== 'espace' || id.endsWith('-g')) continue;
    o.geometry.computeBoundingBox(); const c = new THREE.Vector3(); o.geometry.boundingBox.getCenter(c); o.localToWorld(c);
    etiqEspaces[id] = ajouterEtiquette(ESPACES[o.userData.info.espace].nom, c.toArray(), 'is-espace');
    etiqEspaces[id].el.style.setProperty('--c', '#' + ESPACES[o.userData.info.espace].couleur.toString(16).padStart(6, '0'));
  }
  ajouterEtiquette('Fossette de Rosenmüller (tumeur)', donnees.tumeur, 'is-tumeur');

  /* ---------- État ---------- */
  const etat = { calques: { os: true, muscles: true, espaces: true, vaisseaux: true, foramens: true, trajets: true }, voie: 'toutes', trajet: null, stade: null };

  function appliquer() {
    const actifs = new Set(); const foramensActifs = new Set();
    if (etat.stade) { STADES[etat.stade].ids.forEach(i => actifs.add(i)); STADES[etat.stade].foramens.forEach(i => foramensActifs.add(i)); }
    const trajetsVisibles = trajets.filter(t => !etat.stade && (etat.voie === 'toutes' || t.voie === etat.voie) && (!etat.trajet || t.id === etat.trajet));
    if (!etat.stade && (etat.voie !== 'toutes' || etat.trajet)) trajetsVisibles.forEach(t => t.par.forEach(p => { foramensActifs.add(p + '-d'); (POINT_STRUCTURES[p] || []).forEach(i => actifs.add(i)); }));
    const focus = actifs.size > 0;
    for (const o of Object.values(objets)) {
      const { info, base } = o.userData;
      const calque = Object.keys(CALQUES).find(k => CALQUES[k].includes(info.cat));
      const montre = etat.calques[calque];
      const enAvant = actifs.has(o.userData.id);
      o.visible = montre || (focus && enAvant);
      const m = o.material;
      if (focus && !enAvant) { m.transparent = true; m.opacity = Math.min(base.opacity, info.cat === 'os' ? 0.25 : 0.12); m.depthWrite = false; m.color.setHex(base.color); m.emissive.setHex(0); }
      else if (focus && enAvant) { m.transparent = base.transparent; m.opacity = info.cat === 'espace' ? 0.4 : base.opacity; m.depthWrite = !m.transparent; m.emissive.setHex(info.cat === 'os' ? 0x2a1a00 : 0x220000); }
      else { m.transparent = base.transparent; m.opacity = base.opacity; m.depthWrite = !base.transparent; m.emissive.setHex(0); }
      m.needsUpdate = true;
    }
    groupeForamens.visible = etat.calques.foramens || foramensActifs.size > 0;
    for (const [id, g] of Object.entries(foramens)) {
      const on = foramensActifs.has(id);
      g.scale.setScalar(on ? 1.6 : 1);
      g.children[1].material.color.setHex(on ? 0xf2ab2f : 0xffffff);
      g.visible = etat.calques.foramens || on;
    }
    for (const t of trajets) t.groupe.visible = etat.calques.trajets && trajetsVisibles.includes(t);
    for (const [id, e] of Object.entries(etiqForamens)) e.visible = foramensActifs.has(id) || id === survol || etat.toutesEtiquettes;
    for (const [id, e] of Object.entries(etiqEspaces)) e.visible = (etat.calques.espaces && !focus) || actifs.has(id);
    tumeur.visible = !etat.stade || etat.stade === 'T1';
    demander();
  }

  /* ---------- Survol d'un foramen : son nom s'affiche ---------- */
  let survol = null;
  const rayon = new THREE.Raycaster(), souris = new THREE.Vector2();
  rendu.domElement.addEventListener('pointermove', ev => {
    if (!groupeForamens.visible) return;
    const r = rendu.domElement.getBoundingClientRect();
    souris.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    rayon.setFromCamera(souris, camera);
    const touche = rayon.intersectObjects(groupeForamens.children.filter(g => g.visible), true)[0];
    let id = touche ? touche.object.parent.userData.foramen.id : null;
    if (id && id.endsWith('-g')) id = id.replace(/-g$/, '-d');
    if (id !== survol) { survol = id; rendu.domElement.style.cursor = id ? 'help' : ''; appliquer(); }
  });

  /* ---------- Vues ---------- */
  const VUES = {
    oblique: [new THREE.Vector3(-1.9, 1.15, 1.85), new THREE.Vector3(-0.12, 0.22, 0)],
    dessus: [new THREE.Vector3(0, 3.0, 0.05), new THREE.Vector3(0, 0.25, 0.05)],
    dessous: [new THREE.Vector3(0, -2.9, 0.05), new THREE.Vector3(0, 0.25, 0.05)],
    face: [new THREE.Vector3(0, 0.35, 3.0), new THREE.Vector3(0, 0.2, 0)],
    profil: [new THREE.Vector3(-3.0, 0.3, 0.05), new THREE.Vector3(0, 0.2, 0)],
  };
  function vue(nom) {
    const [p, c] = VUES[nom]; camera.position.copy(p); controles.target.copy(c);
    // dessus et dessous : face en haut ; dessous = convention radiologique (droite du patient à gauche de l'écran)
    if (nom === 'dessus' || nom === 'dessous') camera.up.set(0, 0, 1); else camera.up.set(0, 1, 0);
    controles.update(); demander();
  }

  /* ---------- Boucle ---------- */
  let attente = false, dernier = performance.now();
  const animer = () => !reduit && trajets.some(t => t.groupe.visible);
  function demander() { if (!attente) { attente = true; requestAnimationFrame(image); } }
  function image(maintenant) {
    attente = false;
    const dt = Math.min(0.05, (maintenant - dernier) / 1000); dernier = maintenant;
    const bouge = controles.update();
    const temps = maintenant / 1000;
    for (const t of trajets) {
      if (!t.groupe.visible) continue;
      t.billes.forEach((b, i) => {
        const u = reduit ? (i + 1) / 4 : ((temps * 0.22 * (1.2 / Math.max(0.6, t.longueur))) + i / 3) % 1;
        b.position.copy(t.courbe.getPointAt(u));
      });
    }
    for (const g of groupeForamens.children) g.children[1].quaternion.copy(camera.quaternion);   // anneaux face à l'écran
    rendu.render(scene, camera);
    placerEtiquettes();
    if (bouge || animer()) demander();
    void dt;
  }
  const v = new THREE.Vector3();
  // Étiquettes sans chevauchement : placées par priorité ; une étiquette qui en recouvre une autre déjà placée
  // est décalée d'une ligne vers le bas ou le haut, et masquée si aucune place n'est libre.
  const DECALAGES = [0, 1, -1, 2, -2];
  function placerEtiquettes() {
    const w = largeur(), h = hauteur(), places = [];
    for (const e of etiquettes) {
      if (!e.visible) { e.el.hidden = true; continue; }
      v.copy(e.pos).project(camera);
      if (v.z > 1) { e.el.hidden = true; continue; }
      e.el.hidden = false;
      if (!e.l) { e.l = e.el.offsetWidth; e.h = e.el.offsetHeight; }
      const x = (v.x * 0.5 + 0.5) * w, y = (-v.y * 0.5 + 0.5) * h;
      let pose = null;
      for (const d of DECALAGES) {
        const r = { g: x + 8, d: x + 8 + e.l, haut: y - e.h / 2 + d * (e.h + 2), bas: y + e.h / 2 + d * (e.h + 2) };
        if (!places.some(p => r.g < p.d + 2 && r.d > p.g - 2 && r.haut < p.bas && r.bas > p.haut)) { pose = { r, d }; break; }
      }
      if (!pose) { e.el.hidden = true; continue; }
      places.push(pose.r);
      e.el.style.transform = `translate(${x}px, ${y + pose.d * (e.h + 2)}px)`;
    }
  }
  controles.addEventListener('change', demander);
  new ResizeObserver(() => { camera.aspect = largeur() / hauteur(); camera.updateProjectionMatrix(); rendu.setSize(largeur(), hauteur()); demander(); }).observe(conteneur);

  vue('oblique'); appliquer();

  return {
    donnees, trajets,
    vue,
    calque(nom, on) { etat.calques[nom] = on; appliquer(); },
    voie(id) { etat.voie = id; etat.trajet = null; etat.stade = null; appliquer(); },
    trajet(id) { etat.trajet = etat.trajet === id ? null : id; etat.stade = null; appliquer(); },
    stade(s) { etat.stade = etat.stade === s ? null : s; appliquer(); return etat.stade; },
    etiquettesForamens(on) { etat.toutesEtiquettes = on; appliquer(); },
    camera, controles, demander,
    etat: () => ({ ...etat }),
  };
}
