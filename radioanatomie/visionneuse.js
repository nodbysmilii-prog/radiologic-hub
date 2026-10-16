/* =========================================================
   RadiologicHub — Espace radioanatomie : visionneuse type console (« DICOM »)
   ---------------------------------------------------------
   • Volume IRM (octets 0–255) et carte des territoires (octets), grille de 1 mm,
     décrits par manifest.json (dossier indiqué par data-donnees sur #ra-station).
   • Trois plans (axial, coronal, sagittal), convention radiologique : droite du
     patient à gauche de l'écran ; en sagittal, l'avant à gauche.
   • Image agrandie par interpolation bicubique (×4), fenêtrage sur l'image
     agrandie ; territoires lissés (vote pondéré des 4 voxels voisins) et contours.
   • Souris : molette = coupe suivante, Ctrl + molette = zoom, clic droit glissé =
     fenêtrage, clic du milieu glissé = déplacement, clic gauche = outil choisi.
     Tactile : un doigt = outil choisi (défilement par défaut), deux doigts = zoom
     et déplacement, toucher bref = identifier. Clavier : ↑ ↓, Page ↑ ↓, + −, 0.
   ========================================================= */
(function () {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const station = $('#ra-station');
  if (!station) return;

  const F = 4;                               // facteur d'agrandissement de l'image
  const PLANS = {
    axial: { nom: 'Axiale', axe: 2, haut: 'A', bas: 'P', gauche: 'D', droite: 'G' },
    coronal: { nom: 'Coronale', axe: 1, haut: 'S', bas: 'I', gauche: 'D', droite: 'G' },
    sagittal: { nom: 'Sagittale', axe: 0, haut: 'S', bas: 'I', gauche: 'A', droite: 'P' },
  };
  const AXES = ['x', 'y', 'z'];

  const ecran = $('.ra-ecran', station);
  const toile = $('#ra-toile', station);
  const ctx = toile.getContext('2d');
  const info = {
    hg: $('.ra-coin-hg', station), hd: $('.ra-coin-hd', station),
    bg: $('.ra-coin-bg', station), bd: $('.ra-coin-bd', station),
    oh: $('.ra-or-haut', station), ob: $('.ra-or-bas', station),
    og: $('.ra-or-gauche', station), od: $('.ra-or-droite', station),
  };
  const bulle = $('.ra-bulle', station);
  const chargement = $('.ra-chargement', station);
  const curseur = $('#ra-coupe', station);
  const compteur = $('.ra-compteur', station);

  /* ---------- Chargement ---------- */
  async function charger(url, progression) {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`${url} : ${r.status}`);
    const total = Number(r.headers.get('content-length')) || 0;
    const morceaux = [];
    let recu = 0;
    if (r.body && r.body.getReader) {
      const lecteur = r.body.getReader();
      for (;;) {
        const { done, value } = await lecteur.read();
        if (done) break;
        morceaux.push(value); recu += value.length;
        if (total) progression(recu / total);
      }
    } else morceaux.push(new Uint8Array(await r.arrayBuffer()));
    let octets = new Uint8Array(recu || morceaux[0].length);
    let p = 0;
    for (const m of morceaux) { octets.set(m, p); p += m.length; }
    // Fichier .gz : décompressé ici, sauf si le serveur l'a déjà fait (Content-Encoding)
    if (octets[0] === 0x1f && octets[1] === 0x8b) {
      if (typeof DecompressionStream === 'undefined') throw new Error('Navigateur trop ancien (DecompressionStream absent)');
      const flux = new Blob([octets]).stream().pipeThrough(new DecompressionStream('gzip'));
      octets = new Uint8Array(await new Response(flux).arrayBuffer());
    }
    return octets;
  }

  /* ---------- Outils numériques ---------- */
  // Poids bicubiques (Catmull-Rom) pour un agrandissement entier F d'une ligne de n échantillons
  function noyau(n) {
    const N = n * F, idx = new Int32Array(N * 4), w = new Float32Array(N * 4);
    for (let i = 0; i < N; i++) {
      const s = (i + 0.5) / F - 0.5, x0 = Math.floor(s), t = s - x0, t2 = t * t, t3 = t2 * t;
      const ws = [-0.5 * t3 + t2 - 0.5 * t, 1.5 * t3 - 2.5 * t2 + 1, -1.5 * t3 + 2 * t2 + 0.5 * t, 0.5 * t3 - 0.5 * t2];
      for (let k = 0; k < 4; k++) { idx[i * 4 + k] = Math.min(n - 1, Math.max(0, x0 - 1 + k)); w[i * 4 + k] = ws[k]; }
    }
    return { idx, w, N };
  }
  const hex = c => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];

  /* ---------- État ---------- */
  const etat = {
    plan: 'axial', coupes: {}, zoom: 1, panX: 0, panY: 0, largeur: 255, niveau: 128,
    territoires: true, detail: 'detail', cote: 'D', opacite: 0.45, contours: true, etiquettes: true,
    choisi: null, outil: 'defiler', point: null,
  };

  let M, irm, carte, dims, groupes, territoires, parId;
  let cache = { cle: null };                 // coupe courante agrandie (IRM)
  let cacheT = { cle: null };                // territoires lissés de la coupe courante

  function initialiser(manifest, volIrm, volCarte) {
    M = manifest; irm = volIrm; carte = volCarte; dims = M.dimensions;
    groupes = Object.entries(M.groupes).map(([code, g], i) => ({ code, ...g, rang: i }));
    territoires = M.territoires;
    parId = new Map(territoires.map(t => [t.id, t]));
    for (const id of (M.non_colores || []).map(x => x.id)) parId.set(id, { id, nonColore: true, nom: M.non_colores.find(x => x.id === id).nom });
    // coupes de départ : axiale à z = +12 mm (noyaux gris), coronale à y = −10 mm, sagittale dans l'hémisphère droit (x = +28 mm)
    const indice = (axe, v) => Math.round((v - M.origine_mm[axe]) / M.espacement_mm[axe]);
    etat.coupes = { axial: indice(2, 12), coronal: indice(1, -10), sagittal: indice(0, 28) };
    const f0 = M.fenetres[0]; etat.largeur = f0.largeur; etat.niveau = f0.niveau;
    // Grand écran : côté droit coloré et étiquettes ; téléphone : étiquettes masquées par défaut
    if (ecran.clientWidth < 640) etat.etiquettes = false;
    const choixFenetre = $('#ra-fenetres', station);
    if (choixFenetre) choixFenetre.innerHTML = M.fenetres.map((f, i) => `<option value="${i}">${f.nom}</option>`).join('');
    construireLegende();
    synchroniserCommandes();
    redimensionner();
  }

  /* ---------- Géométrie des plans ---------- */
  function taillePlan(plan) {
    const [nx, ny, nz] = dims;
    return plan === 'axial' ? [nx, ny] : plan === 'coronal' ? [nx, nz] : [ny, nz];
  }
  function nbCoupes(plan) { return dims[PLANS[plan].axe]; }
  // (u, v) dans la coupe (u vers la droite de l'écran, v vers le bas) → voxel (x, y, z)
  function voxel(plan, k, u, v) {
    const [nx, ny, nz] = dims;
    if (plan === 'axial') return [nx - 1 - u, ny - 1 - v, k];
    if (plan === 'coronal') return [nx - 1 - u, k, nz - 1 - v];
    return [k, ny - 1 - u, nz - 1 - v];
  }
  function versPlan(plan, x, y, z) {
    const [nx, ny, nz] = dims;
    if (plan === 'axial') return { k: z, u: nx - 1 - x, v: ny - 1 - y };
    if (plan === 'coronal') return { k: y, u: nx - 1 - x, v: nz - 1 - z };
    return { k: x, u: ny - 1 - y, v: nz - 1 - z };
  }
  function extraire(vol, plan, k) {
    const [w, h] = taillePlan(plan), [nx, ny] = dims, out = new Uint8Array(w * h);
    for (let v = 0; v < h; v++) for (let u = 0; u < w; u++) {
      const [x, y, z] = voxel(plan, k, u, v);
      out[v * w + u] = vol[x + nx * (y + ny * z)];
    }
    return out;
  }
  const mm = (axe, i) => M.origine_mm[axe] + i * M.espacement_mm[axe];

  /* ---------- Coupe agrandie (mise en cache) ---------- */
  function coupe() {
    const k = etat.coupes[etat.plan], cle = etat.plan + ':' + k;
    if (cache.cle === cle) return cache;
    const [w, h] = taillePlan(etat.plan);
    const gris = extraire(irm, etat.plan, k), lab = extraire(carte, etat.plan, k);
    const kx = noyau(w), ky = noyau(h), W = kx.N, H = ky.N;
    // Bicubique séparable : lignes puis colonnes
    const tmp = new Float32Array(W * h), grand = new Float32Array(W * H);
    for (let v = 0; v < h; v++) {
      const ligne = v * w, o = v * W;
      for (let i = 0; i < W; i++) {
        const b = i * 4;
        tmp[o + i] = kx.w[b] * gris[ligne + kx.idx[b]] + kx.w[b + 1] * gris[ligne + kx.idx[b + 1]]
          + kx.w[b + 2] * gris[ligne + kx.idx[b + 2]] + kx.w[b + 3] * gris[ligne + kx.idx[b + 3]];
      }
    }
    for (let j = 0; j < H; j++) {
      const b = j * 4, l0 = ky.idx[b] * W, l1 = ky.idx[b + 1] * W, l2 = ky.idx[b + 2] * W, l3 = ky.idx[b + 3] * W;
      const w0 = ky.w[b], w1 = ky.w[b + 1], w2 = ky.w[b + 2], w3 = ky.w[b + 3], o = j * W;
      for (let i = 0; i < W; i++) grand[o + i] = w0 * tmp[l0 + i] + w1 * tmp[l1 + i] + w2 * tmp[l2 + i] + w3 * tmp[l3 + i];
    }
    const toileGris = document.createElement('canvas');
    toileGris.width = W; toileGris.height = H;
    cache = { cle, w, h, W, H, gris, lab, grand, toileGris, fenetre: null };
    return cache;
  }

  // Territoires lissés : chaque étiquette devient un champ (indicatrice floutée, σ ≈ 1 mm), interpolé
  // linéairement à l'échelle de l'image ; le pixel prend l'étiquette au champ le plus fort. Les limites
  // sont ainsi des courbes lisses (et non des marches de 1 mm) ; la marge entre les deux champs les plus
  // forts sert à adoucir les bords et à tracer des contours anticrénelés. Pendant un défilement rapide,
  // calcul à ½ mm ; à l'arrêt, à ¼ mm.
  function calqueTerritoires(c) {
    const fc = etat.rapide ? 2 : F, cle = c.cle + ':' + fc;
    if (cacheT.cle === cle) return cacheT;
    const W = c.w * fc, H = c.h * fc;
    const { top1, top2, marge } = territoiresLisses(c.lab, c.w, c.h, W, H, fc);
    const toileCalque = document.createElement('canvas');
    toileCalque.width = W; toileCalque.height = H;
    cacheT = { cle, coupe: c.cle, fc, W, H, labG: top1, lab2: top2, marge, toileCalque, calque: null };
    return cacheT;
  }

  const SIGMA = 1.0, RAYON = 3, NOYAU_G = (() => {
    const g = []; let t = 0;
    for (let i = -RAYON; i <= RAYON; i++) { const v = Math.exp(-(i * i) / (2 * SIGMA * SIGMA)); g.push(v); t += v; }
    return g.map(v => v / t);
  })();
  function territoiresLisses(lab, w, h, W, H, fc) {
    // 1) Pixels proches d'une limite (à moins de RAYON pixels d'une étiquette différente)
    const bord = new Uint8Array(w * h);
    for (let v = 0; v < h; v++) for (let u = 0; u < w; u++) {
      const p = v * w + u, a = lab[p];
      if ((u + 1 < w && lab[p + 1] !== a) || (v + 1 < h && lab[p + w] !== a)) { bord[p] = 1; if (u + 1 < w) bord[p + 1] = 1; if (v + 1 < h) bord[p + w] = 1; }
    }
    const proche = new Uint8Array(w * h), ligne = new Uint8Array(w * h);
    for (let v = 0; v < h; v++) for (let u = 0; u < w; u++) {          // dilatation horizontale puis verticale
      let m = 0; for (let k = -RAYON; k <= RAYON && !m; k++) { const uu = u + k; if (uu >= 0 && uu < w && bord[v * w + uu]) m = 1; }
      ligne[v * w + u] = m;
    }
    for (let v = 0; v < h; v++) for (let u = 0; u < w; u++) {
      let m = 0; for (let k = -RAYON; k <= RAYON && !m; k++) { const vv = v + k; if (vv >= 0 && vv < h && ligne[vv * w + u]) m = 1; }
      proche[v * w + u] = m;
    }
    // 2) Près d'une limite : champ de chaque étiquette du voisinage = somme gaussienne 7 × 7 de son indicatrice
    //    (au plus 4 étiquettes par pixel) ; ailleurs, une seule étiquette de champ 1
    const cid = new Uint8Array(w * h * 4), cval = new Float32Array(w * h * 4), nc = new Uint8Array(w * h);
    for (let v = 0; v < h; v++) for (let u = 0; u < w; u++) {
      const p = v * w + u, b = p * 4;
      if (!proche[p]) { cid[b] = lab[p]; cval[b] = 1; nc[p] = 1; continue; }
      let n = 0;
      for (let dv = -RAYON; dv <= RAYON; dv++) {
        const vv = v + dv < 0 ? 0 : v + dv >= h ? h - 1 : v + dv, gv = NOYAU_G[dv + RAYON];
        for (let du = -RAYON; du <= RAYON; du++) {
          const uu = u + du < 0 ? 0 : u + du >= w ? w - 1 : u + du, id = lab[vv * w + uu], g = gv * NOYAU_G[du + RAYON];
          let r = 0; while (r < n && cid[b + r] !== id) r++;
          if (r === n) { if (n === 4) continue; cid[b + n] = id; cval[b + n] = 0; n++; }
          cval[b + r] += g;
        }
      }
      nc[p] = n;
    }
    // 3) Par cellule (4 voxels voisins) près d'une limite : étiquettes possibles (au plus 6) et leur champ aux 4 coins
    const NMAX = 6, cn = new Uint8Array(w * h), cids = new Uint8Array(w * h * NMAX), cv = new Float32Array(w * h * NMAX * 4);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const c = y * w + x, x1 = Math.min(w - 1, x + 1), y1 = Math.min(h - 1, y + 1);
      const coins = [c, y * w + x1, y1 * w + x, y1 * w + x1];
      if (!proche[coins[0]] && !proche[coins[1]] && !proche[coins[2]] && !proche[coins[3]]) continue;
      let n = 0;
      for (let k = 0; k < 4; k++) {
        const p = coins[k], b = p * 4;
        for (let r = 0; r < nc[p]; r++) {
          const id = cid[b + r]; let t = 0;
          while (t < n && cids[c * NMAX + t] !== id) t++;
          if (t === n) { if (n === NMAX) continue; cids[c * NMAX + n] = id; n++; }
          cv[(c * NMAX + t) * 4 + k] = cval[b + r];
        }
      }
      cn[c] = n;
    }
    // 4) Interpolation à l'échelle de l'image : étiquette au champ le plus fort, et marge avec la deuxième
    const X0 = new Int32Array(W), FX = new Float32Array(W), Y0 = new Int32Array(H), FY = new Float32Array(H);
    for (let i = 0; i < W; i++) { const sx = (i + 0.5) / fc - 0.5; X0[i] = Math.max(0, Math.min(w - 1, Math.floor(sx))); FX[i] = Math.min(1, Math.max(0, sx - X0[i])); }
    for (let j = 0; j < H; j++) { const sy = (j + 0.5) / fc - 0.5; Y0[j] = Math.max(0, Math.min(h - 1, Math.floor(sy))); FY[j] = Math.min(1, Math.max(0, sy - Y0[j])); }
    const top1 = new Uint8Array(W * H), top2 = new Uint8Array(W * H), marge = new Float32Array(W * H).fill(1);
    for (let j = 0; j < H; j++) {
      const y0 = Y0[j], fy = FY[j];
      for (let i = 0; i < W; i++) {
        const c = y0 * w + X0[i], q = j * W + i, n = cn[c];
        if (n < 2) { top1[q] = top2[q] = n ? cids[c * NMAX] : lab[c]; continue; }
        const fx = FX[i], w00 = (1 - fx) * (1 - fy), w10 = fx * (1 - fy), w01 = (1 - fx) * fy, w11 = fx * fy;
        let b1 = -1, b2 = -1, i1 = 0, i2 = 0;
        for (let r = 0; r < n; r++) {
          const o = (c * NMAX + r) * 4, val = w00 * cv[o] + w10 * cv[o + 1] + w01 * cv[o + 2] + w11 * cv[o + 3];
          if (val > b1) { b2 = b1; i2 = i1; b1 = val; i1 = cids[c * NMAX + r]; } else if (val > b2) { b2 = val; i2 = cids[c * NMAX + r]; }
        }
        top1[q] = i1; top2[q] = i2; marge[q] = b1 - b2;
      }
    }
    // Distance approximative à la limite, en pixels agrandis : marge / pente locale de la marge.
    // Contours et fondus gardent ainsi une épaisseur régulière, quelle que soit la forme de la limite.
    const dist = new Float32Array(W * H).fill(99);
    for (let j = 1; j < H - 1; j++) for (let i = 1; i < W - 1; i++) {
      const q = j * W + i, m = marge[q];
      if (m >= 0.5 || top1[q] === top2[q]) continue;
      const g = Math.max(Math.abs(marge[q + 1] - m), Math.abs(m - marge[q - 1]), Math.abs(marge[q + W] - m), Math.abs(m - marge[q - W]), 1e-4);
      dist[q] = m / g;
    }
    return { top1, top2, marge: dist };
  }

  function peindreGris(c) {
    const cle = etat.largeur + '/' + etat.niveau;
    if (c.fenetre === cle) return;
    const img = new ImageData(c.W, c.H), d = img.data, bas = etat.niveau - etat.largeur / 2, k = 255 / Math.max(1, etat.largeur);
    for (let p = 0, q = 0; p < c.grand.length; p++, q += 4) {
      const g = (c.grand[p] - bas) * k;
      d[q] = d[q + 1] = d[q + 2] = g; d[q + 3] = 255;
    }
    c.toileGris.getContext('2d').putImageData(img, 0, 0);
    c.fenetre = cle;
  }

  // Clé d'affichage d'un identifiant (0 = rien) : territoire détaillé, ou grand territoire
  function cleAffichage(id) {
    const t = parId.get(id);
    if (!t || t.nonColore) return 0;
    if (etat.cote !== 'DG' && t.cote !== etat.cote) return 0;
    if (etat.detail === 'detail') return id;
    const g = groupes.find(x => x.code === t.groupe);
    return 100 + g.rang * 2 + (t.cote === 'D' ? 1 : 0);
  }
  function infoAffichage(cle) {
    if (cle >= 100) { const g = groupes[(cle - 100) >> 1]; return { nom: g.nom, court: g.court, couleur: g.couleur, groupe: g.code, cote: cle & 1 ? 'D' : 'G' }; }
    return parId.get(cle);
  }
  function estChoisi(cle) {
    if (!etat.choisi) return true;
    const t = infoAffichage(cle);
    return etat.choisi.type === 'groupe' ? t.groupe === etat.choisi.code : (t.code === etat.choisi.code);
  }

  function peindreCalque(c) {
    const cle = [etat.cote, etat.detail, etat.opacite, etat.contours, etat.choisi && etat.choisi.code].join('|');
    if (c.calque === cle) return;
    // table[id] : clé compacte (≠ 0 si coloré : l'identifiant, ou 200 + grand territoire) ; couleur et opacité par clé
    const table = new Uint8Array(256), couleurs = new Uint8Array(256 * 3), alpha = new Float32Array(256);
    const cles = new Map();
    for (let id = 1; id < 256; id++) {
      const k = cleAffichage(id);
      if (!k) continue;
      const t = infoAffichage(k), rgb = hex(t.couleur);
      const compacte = k >= 100 ? 200 + (k - 100) : k;
      table[id] = compacte; cles.set(compacte, k);
      couleurs.set(rgb, compacte * 3);
      alpha[compacte] = estChoisi(k) ? etat.opacite : etat.opacite * 0.25;
    }
    const img = new ImageData(c.W, c.H), d = img.data, L1 = c.labG, L2 = c.lab2, MG = c.marge;
    const BORD = 1.6 * c.fc / F, FONDU = 1.0 * c.fc / F;   // demi-largeur du contour et du fondu (0,4 et 0,25 mm), en pixels du calque
    for (let p = 0; p < L1.length; p++) {
      const k1 = table[L1[p]], k2 = table[L2[p]];
      if (!k1 && !k2) continue;
      let k = k1, a = k1 ? alpha[k1] : 0;
      if (k1 !== k2) {
        const m = MG[p];
        // fondu du remplissage à la limite d'une zone non colorée
        if (k1 && !k2) a *= 0.5 + 0.5 * Math.min(1, m / FONDU);
        else if (!k1 && k2) { k = k2; a = alpha[k2] * 0.5 * Math.max(0, 1 - m / FONDU); }
        // contour : plus opaque près de la limite, dans la couleur du territoire de ce côté
        if (etat.contours) {
          const t = Math.max(0, 1 - m / BORD);
          if (t > 0) { const kc = k1 || k2; k = kc; a = Math.max(a, Math.min(1, alpha[kc] + 0.5) * t); }
        }
      }
      if (a <= 0.004) continue;
      const q = p * 4;
      d[q] = couleurs[k * 3]; d[q + 1] = couleurs[k * 3 + 1]; d[q + 2] = couleurs[k * 3 + 2]; d[q + 3] = 255 * a;
    }
    c.toileCalque.getContext('2d').putImageData(img, 0, 0);
    c.calque = cle; c.cles = cles; c.table = table;
  }

  /* ---------- Affichage ---------- */
  let largeurEcran = 0, hauteurEcran = 0, dpr = 1;
  function redimensionner() {
    dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    largeurEcran = ecran.clientWidth; hauteurEcran = ecran.clientHeight;
    toile.width = Math.round(largeurEcran * dpr); toile.height = Math.round(hauteurEcran * dpr);
    toile.style.width = largeurEcran + 'px'; toile.style.height = hauteurEcran + 'px';
    demander();
  }
  function cadre() {
    const [w, h] = taillePlan(etat.plan);
    const marge = etat.etiquettes && etat.territoires && largeurEcran > 760 ? 0.62 : 0.94;
    const base = Math.min(largeurEcran * marge / w, hauteurEcran * 0.94 / h);
    const s = base * etat.zoom;
    return { s, ox: (largeurEcran - w * s) / 2 + etat.panX, oy: (hauteurEcran - h * s) / 2 + etat.panY, w, h };
  }

  let attente = false;
  function demander() { if (!attente && M) { attente = true; requestAnimationFrame(() => { attente = false; dessiner(); }); } }

  function dessiner() {
    const c = coupe(), g = cadre();
    peindreGris(c);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, largeurEcran, hauteurEcran);
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(c.toileGris, g.ox, g.oy, g.w * g.s, g.h * g.s);
    if (etat.territoires) {
      const t = calqueTerritoires(c);
      peindreCalque(t);
      ctx.drawImage(t.toileCalque, g.ox, g.oy, g.w * g.s, g.h * g.s);
      if (etat.etiquettes) dessinerEtiquettes(c, t, g);
    }
    dessinerRepere(g);
    majTextes();
  }

  // Étiquettes à lignes de rappel, dans les marges gauche et droite (comme un atlas)
  function dessinerEtiquettes(c, tc, g) {
    const { w, h, lab } = c, table = tc.table;
    const sommes = new Map();
    for (let v = 0; v < h; v++) for (let u = 0; u < w; u++) {
      const k = table[lab[v * w + u]];
      if (!k) continue;
      let s = sommes.get(k);
      if (!s) sommes.set(k, s = { n: 0, su: 0, sv: 0, px: [] });
      s.n++; s.su += u; s.sv += v;
      if ((u + v) % 2 === 0) s.px.push(v * w + u);
    }
    const items = [];
    for (const [k, s] of sommes) {
      if (s.n < 30) continue;
      const cu = s.su / s.n, cv = s.sv / s.n;
      // point d'ancrage : pixel intérieur le plus proche du centre de gravité
      let best = s.px[0], dmin = Infinity;
      for (const p of s.px) {
        const u = p % w, v = (p - u) / w;
        if (u < 1 || v < 1 || u >= w - 1 || v >= h - 1) continue;
        if (table[lab[p - 1]] !== k || table[lab[p + 1]] !== k || table[lab[p - w]] !== k || table[lab[p + w]] !== k) continue;
        const d = (u - cu) ** 2 + (v - cv) ** 2;
        if (d < dmin) { dmin = d; best = p; }
      }
      const u = best % w, v = (best - u) / w;
      const t = infoAffichage(tc.cles.get(k));
      const xe = g.ox + (u + 0.5) * g.s, ye = g.oy + (v + 0.5) * g.s;
      if (xe < 0 || ye < 0 || xe > largeurEcran || ye > hauteurEcran) continue;   // hors de l'écran (zoom)
      items.push({ k, x: xe, y: ye, t, choisi: estChoisi(tc.cles.get(k)) });
    }
    const taille = largeurEcran < 900 ? 11 : 12.5;
    ctx.font = `700 ${taille}px Montserrat, system-ui, sans-serif`;
    ctx.textBaseline = 'middle';
    // colonnes d'étiquettes à 30 px des bords : les lettres d'orientation (D, G, A, P…) restent lisibles
    const largeurMax = Math.max(90, Math.min(210, g.ox - 44, largeurEcran - (g.ox + g.w * g.s) - 44));
    const lignes = texte => {
      const mots = texte.split(' '), out = [];
      let cur = '';
      for (const m of mots) {
        const essai = cur ? cur + ' ' + m : m;
        if (ctx.measureText(essai).width > largeurMax && cur) { out.push(cur); cur = m; } else cur = essai;
      }
      if (cur) out.push(cur);
      return out;
    };
    const milieu = g.ox + g.w * g.s / 2;
    for (const cote of ['gauche', 'droite']) {
      const liste = items.filter(it => (it.x < milieu) === (cote === 'gauche')).sort((a, b) => a.y - b.y);
      const hl = taille * 1.25;
      liste.forEach(it => { it.l = lignes(it.t.court || it.t.nom); it.hauteur = it.l.length * hl + 8; });
      // répartition verticale sans chevauchement, centrée sur les ancrages
      let y = 8;
      for (const it of liste) { it.ty = Math.max(y, it.y - it.hauteur / 2); y = it.ty + it.hauteur; }
      // si la colonne déborde en bas, on remonte les étiquettes depuis le bas
      let bas = hauteurEcran - 8;
      for (let i = liste.length - 1; i >= 0; i--) { const it = liste[i]; it.ty = Math.min(it.ty, bas - it.hauteur); bas = it.ty; }
      for (const it of liste) {
        const xt = cote === 'gauche' ? 30 : largeurEcran - 30;
        const xl = cote === 'gauche' ? Math.min(g.ox - 8, xt + largeurMax + 6) : Math.max(g.ox + g.w * g.s + 8, xt - largeurMax - 6);
        const ym = it.ty + it.hauteur / 2;
        const couleur = it.t.couleur, alpha = it.choisi ? 1 : 0.35;
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = couleur; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(xl, ym); ctx.lineTo(it.x, it.y); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(xl, it.ty + 4); ctx.lineTo(xl, it.ty + it.hauteur - 4); ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(it.x, it.y, 2.6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = couleur; ctx.beginPath(); ctx.arc(it.x, it.y, 1.6, 0, Math.PI * 2); ctx.fill();
        ctx.textAlign = cote === 'gauche' ? 'left' : 'right';
        it.l.forEach((ligne, n) => {
          const yy = it.ty + 4 + hl * (n + 0.5);
          ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.85)'; ctx.strokeText(ligne, cote === 'gauche' ? xt : xt, yy);
          ctx.fillStyle = couleur; ctx.fillText(ligne, xt, yy);
        });
        ctx.globalAlpha = 1;
      }
    }
  }

  function dessinerRepere(g) {
    if (!etat.point) return;
    const p = versPlan(etat.plan, ...etat.point);
    if (Math.abs(p.k - etat.coupes[etat.plan]) > 0) return;
    const x = g.ox + (p.u + 0.5) * g.s, y = g.oy + (p.v + 0.5) * g.s;
    ctx.strokeStyle = '#ffd400'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x - 9, y); ctx.lineTo(x - 3, y); ctx.moveTo(x + 3, y); ctx.lineTo(x + 9, y);
    ctx.moveTo(x, y - 9); ctx.lineTo(x, y - 3); ctx.moveTo(x, y + 3); ctx.lineTo(x, y + 9); ctx.stroke();
  }

  const signe = n => (n > 0 ? '+' : n < 0 ? '−' : '') + Math.abs(n);
  function majTextes() {
    const P = PLANS[etat.plan], k = etat.coupes[etat.plan], n = nbCoupes(etat.plan);
    info.hg.innerHTML = `<span class="ra-coin-long">RadiologicHub · Radioanatomie<br></span>IRM T1 · Colin 27<br>${P.nom}`;
    info.hd.innerHTML = `Coupe ${k + 1} / ${n}<br>${AXES[P.axe]} = ${signe(mm(P.axe, k))} mm (MNI)<br>Épaisseur 1 mm`;
    info.bg.innerHTML = `F ${Math.round(etat.largeur)} · N ${Math.round(etat.niveau)}${pointeur.texte ? '<br>' + pointeur.texte : ''}`;
    info.bd.innerHTML = `Zoom ${etat.zoom.toFixed(1).replace('.', ',')}×`;
    info.oh.textContent = P.haut; info.ob.textContent = P.bas; info.og.textContent = P.gauche; info.od.textContent = P.droite;
    curseur.max = n; curseur.value = k + 1;
    compteur.textContent = `${k + 1} / ${n}`;
    toile.setAttribute('aria-label', `IRM T1, coupe ${P.nom.toLowerCase()} ${k + 1} sur ${n}`);
  }

  /* ---------- Identifier sous le pointeur ---------- */
  const pointeur = { texte: '' };
  function sonder(px, py) {
    const g = cadre(), u = Math.floor((px - g.ox) / g.s), v = Math.floor((py - g.oy) / g.s);
    if (u < 0 || v < 0 || u >= g.w || v >= g.h) return null;
    const k = etat.coupes[etat.plan], [x, y, z] = voxel(etat.plan, k, u, v);
    let id = carte[x + dims[0] * (y + dims[1] * z)];
    const c = cacheT;
    if (c.coupe === etat.plan + ':' + k) {        // étiquette du rendu lissé (sous-millimétrique)
      const i = Math.min(c.W - 1, Math.floor((px - g.ox) / g.s * c.fc)), j = Math.min(c.H - 1, Math.floor((py - g.oy) / g.s * c.fc));
      id = c.labG[j * c.W + i];
    }
    return { x, y, z, id, t: parId.get(id) };
  }
  function decrire(r) {
    if (!r) return '';
    const pos = `x ${signe(mm(0, r.x))} · y ${signe(mm(1, r.y))} · z ${signe(mm(2, r.z))} mm`;
    return pos;
  }
  function nomTerritoire(r) {
    if (!r || !r.t) return '';
    if (r.t.nonColore) return r.t.nom;
    const cote = r.t.cote === 'D' ? 'droit' : 'gauche';
    if (etat.detail !== 'detail') return `${M.groupes[r.t.groupe].nom}, côté ${cote}`;
    return `${r.t.nom}, côté ${cote}`;
  }
  function montrerBulle(px, py, texte, epingle) {
    if (!texte) { bulle.hidden = true; return; }
    bulle.textContent = texte; bulle.hidden = false;
    const bw = bulle.offsetWidth, bh = bulle.offsetHeight;
    bulle.style.left = Math.min(largeurEcran - bw - 6, Math.max(6, px + 14)) + 'px';
    bulle.style.top = Math.min(hauteurEcran - bh - 6, Math.max(6, py + 14)) + 'px';
    bulle.classList.toggle('is-epingle', !!epingle);
  }
  function identifier(px, py, epingle) {
    const r = sonder(px, py);
    pointeur.texte = decrire(r);
    if (epingle) {
      if (r) etat.point = [r.x, r.y, r.z];
      if (r && r.t && !r.t.nonColore) choisir(etat.detail === 'detail' ? { type: 'territoire', code: r.t.code } : { type: 'groupe', code: r.t.groupe }, false);
      else if (etat.choisi) choisir(null, false);
    }
    montrerBulle(px, py, nomTerritoire(r), epingle);
    demander();
  }

  /* ---------- Interactions ---------- */
  const limiter = (v, a, b) => Math.min(b, Math.max(a, v));
  let dernierChangement = 0, minuterie = 0;
  function allerCoupe(k) {
    const n = limiter(Math.round(k), 0, nbCoupes(etat.plan) - 1);
    if (n === etat.coupes[etat.plan]) return;
    const t = performance.now();
    etat.rapide = t - dernierChangement < 250; dernierChangement = t;
    clearTimeout(minuterie);
    minuterie = setTimeout(() => { if (etat.rapide) { etat.rapide = false; demander(); } }, 260);
    etat.coupes[etat.plan] = n; demander();
  }
  function zoomer(f, cx, cy) {
    const avant = etat.zoom;
    etat.zoom = limiter(etat.zoom * f, 0.5, 12);
    const r = etat.zoom / avant;
    // garder le point sous le curseur immobile
    const mx = cx - largeurEcran / 2, my = cy - hauteurEcran / 2;
    etat.panX = mx - (mx - etat.panX) * r; etat.panY = my - (my - etat.panY) * r;
    demander();
  }
  function reinitialiser() { etat.zoom = 1; etat.panX = etat.panY = 0; const f0 = M.fenetres[0]; etat.largeur = f0.largeur; etat.niveau = f0.niveau; demander(); synchroniserCommandes(); }

  let cumul = 0;
  ecran.addEventListener('wheel', e => {
    if (!M) return;
    e.preventDefault();
    const r = ecran.getBoundingClientRect();
    if (e.ctrlKey || e.metaKey) { zoomer(Math.exp(-e.deltaY * 0.01), e.clientX - r.left, e.clientY - r.top); return; }
    cumul += e.deltaMode === 1 ? e.deltaY * 33 : e.deltaY;
    const pas = Math.trunc(cumul / 60);
    if (pas) { cumul -= pas * 60; allerCoupe(etat.coupes[etat.plan] + (pas > 0 ? -1 : 1) * Math.abs(pas) * (e.shiftKey ? 5 : 1)); }
  }, { passive: false });

  const doigts = new Map();
  let geste = null;
  ecran.addEventListener('contextmenu', e => e.preventDefault());
  ecran.addEventListener('pointerdown', e => {
    if (!M) return;
    ecran.setPointerCapture(e.pointerId);
    ecran.focus({ preventScroll: true });
    const r = ecran.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    doigts.set(e.pointerId, { x, y });
    if (doigts.size === 2) {
      const [a, b] = [...doigts.values()];
      geste = { type: 'pincer', d: Math.hypot(a.x - b.x, a.y - b.y), cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 };
      return;
    }
    const outil = e.button === 2 ? 'fenetrage' : e.button === 1 ? 'deplacer' : etat.outil;
    geste = { type: outil, x0: x, y0: y, x, y, t0: performance.now(), k0: etat.coupes[etat.plan], l0: etat.largeur, n0: etat.niveau, z0: etat.zoom, bouge: false, tactile: e.pointerType !== 'mouse' };
    e.preventDefault();
  });
  ecran.addEventListener('pointermove', e => {
    if (!M) return;
    const r = ecran.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    if (doigts.has(e.pointerId)) doigts.set(e.pointerId, { x, y });
    if (!geste) {
      if (e.pointerType === 'mouse') identifier(x, y, false);
      return;
    }
    if (geste.type === 'pincer' && doigts.size === 2) {
      const [a, b] = [...doigts.values()], d = Math.hypot(a.x - b.x, a.y - b.y), cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
      zoomer(d / geste.d, cx, cy);
      etat.panX += cx - geste.cx; etat.panY += cy - geste.cy;
      geste.d = d; geste.cx = cx; geste.cy = cy; demander();
      return;
    }
    const dx = x - geste.x0, dy = y - geste.y0;
    if (Math.abs(dx) + Math.abs(dy) > 5) geste.bouge = true;
    if (!geste.bouge) return;
    if (geste.type === 'defiler') allerCoupe(geste.k0 - dy / 6);
    else if (geste.type === 'fenetrage') {
      etat.largeur = limiter(geste.l0 + dx * 1.2, 2, 600); etat.niveau = limiter(geste.n0 - dy * 1.0, -100, 400);
      synchroniserFenetre(); demander();
    } else if (geste.type === 'zoom') { etat.zoom = limiter(geste.z0 * Math.exp(-dy * 0.01), 0.5, 12); demander(); }
    else if (geste.type === 'deplacer') { etat.panX += x - geste.x; etat.panY += y - geste.y; demander(); }
    else if (geste.type === 'identifier') identifier(x, y, false);
    geste.x = x; geste.y = y;
  });
  const lacher = e => {
    if (!M) return;
    const r = ecran.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    if (geste && geste.type !== 'pincer' && !geste.bouge && performance.now() - geste.t0 < 450) identifier(x, y, true);
    doigts.delete(e.pointerId);
    if (doigts.size < 2 && geste && geste.type === 'pincer') geste = null;
    if (!doigts.size) geste = null;
  };
  ecran.addEventListener('pointerup', lacher);
  ecran.addEventListener('pointercancel', e => { doigts.delete(e.pointerId); geste = null; });
  ecran.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse' && !geste) { pointeur.texte = ''; bulle.hidden = true; demander(); } });
  ecran.addEventListener('dblclick', () => reinitialiser());
  ecran.addEventListener('keydown', e => {
    if (!M) return;
    const k = etat.coupes[etat.plan], touches = {
      ArrowUp: () => allerCoupe(k + 1), ArrowDown: () => allerCoupe(k - 1), ArrowRight: () => allerCoupe(k + 1), ArrowLeft: () => allerCoupe(k - 1),
      PageUp: () => allerCoupe(k + 10), PageDown: () => allerCoupe(k - 10), Home: () => allerCoupe(0), End: () => allerCoupe(nbCoupes(etat.plan) - 1),
      '+': () => zoomer(1.25, largeurEcran / 2, hauteurEcran / 2), '-': () => zoomer(0.8, largeurEcran / 2, hauteurEcran / 2), '0': reinitialiser,
      a: () => changerPlan('axial'), c: () => changerPlan('coronal'), s: () => changerPlan('sagittal'),
      t: () => basculer('territoires'), e: () => basculer('etiquettes'),
    };
    const f = touches[e.key];
    if (f) { e.preventDefault(); f(); }
  });
  curseur.addEventListener('input', () => allerCoupe(Number(curseur.value) - 1));
  new ResizeObserver(redimensionner).observe(ecran);

  /* ---------- Commandes ---------- */
  function changerPlan(plan) {
    if (etat.point) { const p = versPlan(plan, ...etat.point); etat.coupes[plan] = p.k; }
    etat.plan = plan; etat.panX = etat.panY = 0;
    synchroniserCommandes(); demander();
  }
  function basculer(cle) { etat[cle] = !etat[cle]; synchroniserCommandes(); demander(); }
  function choisir(sel, aller) {
    const meme = !!(etat.choisi && sel && etat.choisi.code === sel.code && etat.choisi.type === sel.type);
    etat.choisi = meme && aller !== false ? null : sel;
    if (etat.choisi && aller) allerVersChoix();
    construireLegende(); afficherInfo(); demander();
  }
  // Coupe où le territoire choisi (côté affiché) est le plus étendu, dans le plan courant
  function allerVersChoix() {
    const ids = new Set(territoires.filter(t => (etat.choisi.type === 'groupe' ? t.groupe : t.code) === etat.choisi.code && (etat.cote === 'DG' || t.cote === etat.cote)).map(t => t.id));
    const [nx, ny, nz] = dims, axe = PLANS[etat.plan].axe, compte = new Int32Array(dims[axe]);
    for (let z = 0; z < nz; z++) for (let y = 0; y < ny; y++) {
      const o = nx * (y + ny * z);
      for (let x = 0; x < nx; x++) if (ids.has(carte[o + x])) compte[axe === 0 ? x : axe === 1 ? y : z]++;
    }
    let best = 0;
    for (let i = 1; i < compte.length; i++) if (compte[i] > compte[best]) best = i;
    if (compte[best]) etat.coupes[etat.plan] = best;
  }

  function construireLegende() {
    const liste = $('.ra-legende', station);
    if (!liste || !M) return;
    liste.innerHTML = '';
    for (const g of groupes) {
      const bloc = document.createElement('div');
      bloc.className = 'ra-legende-groupe';
      const tete = document.createElement('button');
      tete.type = 'button'; tete.className = 'ra-legende-item is-groupe';
      tete.style.setProperty('--c', g.couleur);
      tete.innerHTML = `<span class="ra-pastille"></span>${g.nom}`;
      tete.setAttribute('aria-pressed', String(!!(etat.choisi && etat.choisi.type === 'groupe' && etat.choisi.code === g.code)));
      tete.addEventListener('click', () => choisir({ type: 'groupe', code: g.code }, true));
      bloc.append(tete);
      if (etat.detail === 'detail') {
        const vus = new Set();
        for (const t of territoires.filter(t => t.groupe === g.code)) {
          if (vus.has(t.code)) continue; vus.add(t.code);
          const b = document.createElement('button');
          b.type = 'button'; b.className = 'ra-legende-item';
          b.style.setProperty('--c', t.couleur);
          b.innerHTML = `<span class="ra-pastille"></span>${t.nom}`;
          b.setAttribute('aria-pressed', String(!!(etat.choisi && etat.choisi.type === 'territoire' && etat.choisi.code === t.code)));
          b.addEventListener('click', () => choisir({ type: 'territoire', code: t.code }, true));
          bloc.append(b);
        }
      }
      liste.append(bloc);
    }
  }
  function afficherInfo() {
    const boite = $('.ra-info', station);
    if (!boite) return;
    if (!etat.choisi) { boite.innerHTML = '<p class="ra-info-vide">Touchez un territoire sur l\'image ou dans la légende pour le mettre en évidence et aller à la coupe où il est le plus étendu.</p>'; return; }
    if (etat.choisi.type === 'groupe') {
      const g = M.groupes[etat.choisi.code];
      boite.innerHTML = `<p class="ra-info-titre" style="--c:${g.couleur}">${g.nom}</p>`;
      return;
    }
    const t = territoires.find(x => x.code === etat.choisi.code);
    boite.innerHTML = `<p class="ra-info-titre" style="--c:${t.couleur}">${t.nom}</p><p class="ra-info-groupe">${M.groupes[t.groupe].nom}</p>${t.precision ? `<p>${t.precision}</p>` : ''}`;
  }

  function synchroniserFenetre() {
    const l = $('#ra-largeur', station), n = $('#ra-niveau', station);
    if (l) l.value = Math.round(etat.largeur);
    if (n) n.value = Math.round(etat.niveau);
  }
  function synchroniserCommandes() {
    $$('[data-plan]', station).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.plan === etat.plan)));
    $$('[data-outil]', station).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.outil === etat.outil)));
    ecran.dataset.outil = etat.outil;
    $$('[data-detail]', station).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.detail === etat.detail)));
    $$('[data-cote]', station).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.cote === etat.cote)));
    for (const cle of ['territoires', 'etiquettes', 'contours']) { const c = $(`#ra-${cle}`, station); if (c) c.checked = etat[cle]; }
    const o = $('#ra-opacite', station); if (o) o.value = Math.round(etat.opacite * 100);
    synchroniserFenetre();
  }

  $$('[data-plan]', station).forEach(b => b.addEventListener('click', () => changerPlan(b.dataset.plan)));
  $$('[data-outil]', station).forEach(b => b.addEventListener('click', () => { etat.outil = b.dataset.outil; synchroniserCommandes(); }));
  $$('[data-detail]', station).forEach(b => b.addEventListener('click', () => { etat.detail = b.dataset.detail; etat.choisi = null; construireLegende(); afficherInfo(); synchroniserCommandes(); demander(); }));
  $$('[data-cote]', station).forEach(b => b.addEventListener('click', () => { etat.cote = b.dataset.cote; synchroniserCommandes(); demander(); }));
  for (const cle of ['territoires', 'etiquettes', 'contours']) {
    const c = $(`#ra-${cle}`, station);
    if (c) c.addEventListener('change', () => { etat[cle] = c.checked; demander(); });
  }
  const opacite = $('#ra-opacite', station);
  if (opacite) opacite.addEventListener('input', () => { etat.opacite = Number(opacite.value) / 100; demander(); });
  for (const [id, cle, min, max] of [['#ra-largeur', 'largeur', 2, 600], ['#ra-niveau', 'niveau', -100, 400]]) {
    const champ = $(id, station);
    if (champ) champ.addEventListener('change', () => { const v = Number(champ.value); if (Number.isFinite(v)) { etat[cle] = limiter(v, min, max); synchroniserFenetre(); demander(); } });
  }
  const fenetres = $('#ra-fenetres', station);
  if (fenetres) fenetres.addEventListener('change', () => {
    const f = M.fenetres[Number(fenetres.value)];
    if (f) { etat.largeur = f.largeur; etat.niveau = f.niveau; synchroniserFenetre(); demander(); }
  });
  const reinit = $('[data-action="reinitialiser"]', station);
  if (reinit) reinit.addEventListener('click', reinitialiser);
  const plein = $('[data-action="plein-ecran"]', station);
  if (plein) plein.addEventListener('click', () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else if (station.requestFullscreen) station.requestFullscreen().catch(() => {});
  });

  /* ---------- Démarrage ---------- */
  (async () => {
    const base = station.dataset.donnees;
    try {
      const manifest = await (await fetch(base + 'manifest.json')).json();
      let p1 = 0, p2 = 0;
      const montrer = () => { chargement.querySelector('span').textContent = Math.round((p1 * 0.97 + p2 * 0.03) * 100) + ' %'; };
      const [a, b] = await Promise.all([
        charger(base + manifest.fichiers.irm, p => { p1 = p; montrer(); }),
        charger(base + manifest.fichiers.territoires, p => { p2 = p; montrer(); }),
      ]);
      const n = manifest.dimensions[0] * manifest.dimensions[1] * manifest.dimensions[2];
      if (a.length !== n || b.length !== n) throw new Error('taille des volumes inattendue');
      chargement.hidden = true;
      initialiser(manifest, a, b);
      afficherInfo();
      station.classList.add('is-pret');
      station.dispatchEvent(new CustomEvent('ra-pret'));
    } catch (err) {
      chargement.innerHTML = `Impossible de charger l'IRM.<br><small>${String(err.message || err)}</small>`;
      console.error(err);
    }
  })();

  window.RHRadioanatomie = { etat, demander, changerPlan, allerCoupe, sonder: (x, y) => sonder(x, y), cadre: () => cadre() };
})();
