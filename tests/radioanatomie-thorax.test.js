/* Tests du module « TDM thoracique injectée » de l'espace radioanatomie : radioanatomie/tdm-thorax.html,
   radioanatomie/atlas-coupes.{js,css} (calque des lobes), radioanatomie/donnees/thorax-tdm/ (séries, calques,
   repères manuels, atlas.json, validation.json), scripts/radioanatomie/preparer_tdm_thorax.py et
   construire_atlas_thorax.py.
   Lancer : npm test   (ou : node --test tests/radioanatomie-thorax.test.js) */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const R = path.join(__dirname, '..');
const D = path.join(R, 'radioanatomie', 'donnees', 'thorax-tdm');
const lire = f => fs.readFileSync(f, 'utf8');
const A = JSON.parse(lire(path.join(D, 'atlas.json')));
const V = JSON.parse(lire(path.join(D, 'validation.json')));
const M = JSON.parse(lire(path.join(D, 'reperes-manuels', 'ax.json')));
const HTML = lire(path.join(R, 'radioanatomie', 'tdm-thorax.html'));
const serie = id => A.series.find(s => s.id === id);

function dimJpeg(f) {
  const b = fs.readFileSync(f); assert.equal(b.readUInt16BE(0), 0xffd8, f);
  let o = 2;
  while (o < b.length) { const m = b.readUInt16BE(o); if (m >= 0xffc0 && m <= 0xffc3) return [b.readUInt16BE(o + 7), b.readUInt16BE(o + 5)]; o += 2 + b.readUInt16BE(o + 2); }
}
function dimPng(f) {
  const b = fs.readFileSync(f); assert.equal(b.toString('latin1', 1, 4), 'PNG', f);
  return [b.readUInt32BE(16), b.readUInt32BE(20)];
}
// Positions des repères (étiquettes) d'une structure sur une série : coupe → [x, y]
const positions = (s, id) => new Map(s.reperes.flatMap((r, k) => r.filter(x => x[0] === id).map(x => [k, [x[1], x[2]]])));

test('4 séries (axiale médiastinale et parenchymateuse, coronale, sagittale) : coupes et calques des lobes présents', () => {
  assert.deepEqual(A.series.map(s => [s.id, s.plan]), [['ax-med', 'axial'], ['ax-pulm', 'axial'], ['cor', 'coronal'], ['sag', 'sagittal']]);
  for (const s of A.series) {
    assert.equal(s.chiffres, 3, s.id);
    const noms = Array.from({ length: s.coupes }, (_, i) => String(i).padStart(3, '0'));
    const dossier = path.join(R, 'radioanatomie', s.dossier);
    assert.deepEqual(fs.readdirSync(dossier).filter(f => f.endsWith('.jpg')).sort(), noms.map(n => n + '.jpg'), s.id);
    const calque = path.join(R, 'radioanatomie', s.calque);
    assert.deepEqual(fs.readdirSync(calque).filter(f => f.endsWith('.png')).sort(), noms.map(n => n + '.png'), s.calque);
    for (const n of [noms[0], noms[Math.floor(s.coupes / 2)], noms[noms.length - 1]]) {
      assert.deepEqual(dimJpeg(path.join(dossier, n + '.jpg')), [s.largeur, s.hauteur], `${s.id}/${n}`);
      assert.deepEqual(dimPng(path.join(calque, n + '.png')), [s.largeur, s.hauteur], `${s.calque}${n}`);
    }
    assert.equal(s.reperes.length, s.coupes);
    assert.ok(s.reperes.filter(r => r.length).length >= s.coupes - 1, `${s.id} : toutes les coupes (sauf une au plus) légendées`);
  }
  // les deux séries axiales montrent les mêmes coupes, au même cadrage
  for (const k of ['coupes', 'largeur', 'hauteur', 'calque']) assert.equal(serie('ax-med')[k], serie('ax-pulm')[k], k);
});

test('orientation : convention radiologique (droite du patient à gauche de l\'écran ; sagittal, avant à gauche)', () => {
  const attendu = { axial: ['A', 'P', 'D', 'G'], coronal: ['S', 'I', 'D', 'G'], sagittal: ['S', 'I', 'A', 'P'] };
  for (const s of A.series) assert.deepEqual(s.orientation, attendu[s.plan], s.id);
  // vérification sur les étiquettes elles-mêmes : lobes droits à gauche de l'image, foie à gauche de la rate…
  for (const s of A.series.filter(x => x.plan !== 'sagittal')) {
    for (const id of ['lsd', 'lm', 'lid']) for (const [k, [x]] of positions(s, id)) assert.ok(x < s.largeur / 2, `${s.id} #${k} ${id} x=${x}`);
    for (const id of ['lsg', 'lig']) for (const [k, [x]] of positions(s, id)) assert.ok(x > s.largeur / 2, `${s.id} #${k} ${id} x=${x}`);
    const foie = positions(s, 'foie'), rate = positions(s, 'rate');
    for (const [k, [xr]] of rate) if (foie.has(k)) assert.ok(foie.get(k)[0] < xr, `${s.id} #${k} foie / rate`);
  }
  // axial : veine cave supérieure à droite de l'aorte ascendante, aorte descendante en arrière
  const ax = serie('ax-med'), vcs = positions(ax, 'vcs'), asc = positions(ax, 'aorte-asc'), desc = positions(ax, 'aorte-desc');
  let n = 0;
  for (const [k, [xa, ya]] of asc) {
    if (vcs.has(k)) { assert.ok(vcs.get(k)[0] < xa, `#${k} VCS / aorte ascendante`); n++; }
    if (desc.has(k)) assert.ok(desc.get(k)[1] > ya, `#${k} aorte descendante en arrière`);
  }
  assert.ok(n >= 10, 'VCS et aorte ascendante sur au moins 10 coupes');
  // sagittal : sternum en avant (à gauche) des vertèbres
  const sag = serie('sag'), st = positions(sag, 'sternum');
  for (const [k, r] of sag.reperes.entries()) for (const [id, x] of r) if (/^vert-/.test(id) && st.has(k)) assert.ok(st.get(k)[0] < x, `sag #${k} sternum / ${id}`);
});

test('repères : structures connues, dans l\'image, sans doublon, nombre plafonné par coupe', () => {
  assert.deepEqual(A.categories.map(c => c.id), ['poumons', 'voies', 'arteres', 'veines', 'coeur', 'visceres', 'muscles', 'nerveux', 'os']);
  const cats = new Set(A.categories.map(c => c.id));
  for (const [id, st] of Object.entries(A.structures)) {
    assert.ok(cats.has(st.cat), id);
    assert.match(st.nom, /^[A-ZÉŒ0-9]/, id);
    assert.ok(['référence', 'calculée', 'repère manuel'].includes(st.source), id);
  }
  const nb = {};
  for (const st of Object.values(A.structures)) nb[st.source] = (nb[st.source] || 0) + 1;
  assert.deepEqual(nb, { 'référence': 71, 'calculée': 18, 'repère manuel': 10 });
  for (const s of A.series) s.reperes.forEach((r, k) => {
    const ids = r.map(x => x[0]);
    assert.equal(new Set(ids).size, ids.length, `${s.id} #${k} : doublon`);
    assert.ok(r.length <= (s.plan === 'axial' ? 26 : 22), `${s.id} #${k} : ${r.length} étiquettes`);
    for (const [id, x, y] of r) {
      assert.ok(A.structures[id], `${s.id} #${k} : ${id} inconnue`);
      assert.ok(x >= 0 && x < s.largeur && y >= 0 && y < s.hauteur, `${s.id} #${k} : ${id} hors image`);
    }
  });
  const toutes = new Set(A.series.flatMap(s => s.reperes.flat().map(x => x[0])));
  for (const id of ['trachee', 'carene', 'bronche-d', 'bronche-g', 'oesophage', 'aorte-asc', 'arc-aortique', 'aorte-desc', 'tronc-pulm', 'ap-d', 'ap-g',
    'vcs', 'vci', 'azygos', 'vp-d', 'vp-g', 'atrium-d', 'atrium-g', 'ventricule-d', 'ventricule-g', 'lsd', 'lm', 'lid', 'lsg', 'lig', 'sc-obl-d', 'sc-hor', 'sc-obl-g',
    'thyroide', 'moelle', 'sternum', 'vert-T5'])
    assert.ok(toutes.has(id), id);
  assert.equal(A.structures.carene.nom, 'Carène (bifurcation trachéale)');
  assert.equal(A.structures['sc-hor'].nom, 'Scissure horizontale');
  // trachée et carène jamais sur la même coupe ; carène à 1 ou 2 coupes de la bifurcation, en regard de T5
  for (const s of A.series) s.reperes.forEach((r, k) => {
    const ids = r.map(x => x[0]);
    assert.ok(!(ids.includes('trachee') && ids.includes('carene')), `${s.id} #${k}`);
  });
  const ax = serie('ax-med'), car = [...positions(ax, 'carene').keys()];
  assert.ok(car.length >= 1 && car.length <= 2, `carène sur ${car.length} coupes`);
  assert.ok(car.some(k => ax.reperes[k].some(x => /^vert-T[456]$/.test(x[0]))), 'carène en regard de T4 à T6');
  // aorte abdominale uniquement sous l'aorte thoracique descendante (hiatus)
  const abdo = [...positions(ax, 'aorte-abdo').keys()], desc = [...positions(ax, 'aorte-desc').keys()];
  assert.ok(abdo.length > 0 && Math.min(...abdo) > Math.max(...desc), 'aorte abdominale plus bas que l\'aorte thoracique');
});

test('validation : tous les contrôles automatiques réussis (masques, densités, invariants anatomiques)', () => {
  assert.equal(V.cas, 's0310');
  assert.equal(V.echecs, 0);
  assert.ok(V.controles.length >= 25);
  for (const c of V.controles) assert.equal(c.ok, true, c.controle);
  const noms = V.controles.map(c => c.controle).join('\n');
  for (const m of [/côtés : foie à droite de la rate/, /arc aortique à gauche de la trachée/, /veine cave supérieure à droite de l'aorte ascendante/,
    /carène en regard de T4 à T6/, /bronche principale gauche plus longue/, /10e côte (droite|gauche) articulée/, /densité aorte/,
    /étiquettes de référence ou calculées, toutes dans leur masque/, /positions de repères manuels contrôlées/])
    assert.match(noms, m);
});

test('repères manuels : atlas à jour, identique à l\'interpolation des coupes clés de reperes-manuels/ax.json', () => {
  const pos = (kf, k) => {
    const c = Object.entries(kf).map(([a, p]) => [+a, p]).sort((a, b) => a[0] - b[0]);
    if (k < c[0][0] || k > c[c.length - 1][0]) return null;
    for (let i = 0; i < c.length; i++) {
      const [c0, p0] = c[i], [c1, p1] = c[Math.min(i + 1, c.length - 1)];
      if (c0 <= k && k <= c1) { const t = c1 === c0 ? 0 : (k - c0) / (c1 - c0); const r = Math.round; return [r(p0[0] + t * (p1[0] - p0[0])), r(p0[1] + t * (p1[1] - p0[1]))]; }
    }
  };
  assert.equal(M.serie, 'ax-med');
  assert.equal(M.structures.length, 10);
  for (const s of A.series.filter(x => x.plan === 'axial')) {
    for (const st of M.structures) {
      assert.equal(A.structures[st.id].source, 'repère manuel', st.id);
      const p = positions(s, st.id);
      for (let k = 0; k < s.coupes; k++) {
        const attendu = pos(st.kf, k);
        if (!attendu) { assert.ok(!p.has(k), `${s.id} #${k} ${st.id} hors coupes clés`); continue; }
        if (p.has(k)) assert.deepEqual(p.get(k), attendu, `${s.id} #${k} ${st.id}`);
        else assert.equal(s.reperes[k].length, 26, `${s.id} #${k} ${st.id} absent sans plafond atteint`);
      }
    }
  }
  // pas de repère manuel sur les reconstructions (coupes clés posées sur l'axial)
  for (const s of A.series.filter(x => x.plan !== 'axial')) for (const st of M.structures) assert.equal(positions(s, st.id).size, 0, `${s.id} ${st.id}`);
});

test('source figée : empreintes SHA-256 du scanner et des masques utilisés', () => {
  const e = JSON.parse(lire(path.join(R, 'scripts', 'radioanatomie', 'tdm_thorax_empreintes.json')));
  assert.equal(Object.keys(e).length, 75);
  for (const [nom, h] of Object.entries(e)) assert.match(h, /^[0-9a-f]{64}$/, nom);
  for (const nom of ['ct', 'trachea', 'aorta', 'heart', 'pulmonary_vein', 'lung_middle_lobe_right', 'vertebrae_L1']) assert.ok(e[nom], nom);
  const prep = lire(path.join(R, 'scripts', 'radioanatomie', 'preparer_tdm_thorax.py'));
  assert.match(prep, /records\/10047292\/files\/Totalsegmentator_dataset_v201\.zip/);
  assert.match(prep, /CAS = 's0310'/);
});

test('page : visionneuse, bouton des lobes, crédits CC BY 4.0, carte de l\'accueil Radioanatomie', () => {
  assert.match(HTML, /<div class="ac-station" data-atlas="donnees\/thorax-tdm\/atlas\.json"/);
  for (const m of ['data-ac="categories"', 'data-ac="legendes"', 'data-ac="quiz"', 'data-ac="tout"', 'data-ac="recommencer"', 'class="ac-panneau"'])
    assert.ok(HTML.includes(m), m);
  assert.match(HTML, /<script src="atlas-coupes\.js\?v=\d+"><\/script>/);
  assert.match(HTML, /<link rel="stylesheet" href="atlas-coupes\.css\?v=\d+">/);
  assert.match(HTML, /creativecommons\.org\/licenses\/by\/4\.0/);
  assert.match(HTML, /doi:10\.5281\/zenodo\.10047292/);
  assert.match(HTML, /href="donnees\/thorax-tdm\/validation\.json"/);
  const lic = path.join(D, 'LICENSE-TotalSegmentator-CC-BY-4.0.txt');
  assert.ok(fs.existsSync(lic));
  assert.match(lire(lic), /10047292[\s\S]*s0310[\s\S]*CC BY 4\.0/);
  for (const [id, src] of Object.entries(A.structures).map(([k, v]) => [k, v.source]))
    if (src === 'repère manuel') assert.ok(fs.existsSync(path.join(D, 'reperes-manuels', 'ax.json')), id);
  const index = lire(path.join(R, 'radioanatomie', 'index.html'));
  assert.match(index, /<a class="fiche-card[^"]*" href="tdm-thorax\.html"/);
  assert.match(index, /id="tdm"/);
  // la même version des fichiers de la visionneuse sur les deux atlas en coupes
  const genou = lire(path.join(R, 'radioanatomie', 'irm-genou.html'));
  for (const f of ['atlas-coupes.js', 'atlas-coupes.css']) {
    const v = h => (h.match(new RegExp(f.replace('.', '\\.') + '\\?v=(\\d+)')) || [])[1];
    assert.equal(v(HTML), v(genou), f);
  }
  const js = lire(path.join(R, 'radioanatomie', 'atlas-coupes.js'));
  for (const m of ['ac-calque', 'Lobes', 'padStart', 'chiffres']) assert.ok(js.includes(m), m);
});
