/* Tests du module « IRM du genou » de l'espace radioanatomie : radioanatomie/irm-genou.html,
   radioanatomie/atlas-coupes.{js,css}, radioanatomie/donnees/genou-irm/ (séries, repères, atlas.json),
   scripts/radioanatomie/preparer_genou.py et construire_atlas_genou.py.
   Lancer : npm test   (ou : node --test tests/radioanatomie-genou.test.js) */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const R = path.join(__dirname, '..');
const D = path.join(R, 'radioanatomie', 'donnees', 'genou-irm');
const A = JSON.parse(fs.readFileSync(path.join(D, 'atlas.json'), 'utf8'));
const N = JSON.parse(fs.readFileSync(path.join(D, 'nomenclature.json'), 'utf8'));
const HTML = fs.readFileSync(path.join(R, 'radioanatomie', 'irm-genou.html'), 'utf8');

function dimJpeg(f) {
  const b = fs.readFileSync(f); assert.equal(b.readUInt16BE(0), 0xffd8, f);
  let o = 2;
  while (o < b.length) { const m = b.readUInt16BE(o); if (m >= 0xffc0 && m <= 0xffc3) return [b.readUInt16BE(o + 7), b.readUInt16BE(o + 5)]; o += 2 + b.readUInt16BE(o + 2); }
}

test('4 séries (sagittal, coronal ×2, axial) : toutes les coupes présentes, aux dimensions annoncées', () => {
  assert.deepEqual(A.series.map(s => [s.id, s.plan, s.ponderation]),
    [['sag-dp', 'sagittal', 'DP'], ['cor-t1', 'coronal', 'T1'], ['cor-dp-fs', 'coronal', 'DP FS'], ['ax-t2', 'axial', 'T2']]);
  for (const s of A.series) {
    const fichiers = fs.readdirSync(path.join(D, s.id)).filter(f => f.endsWith('.jpg')).sort();
    assert.equal(fichiers.length, s.coupes, s.id);
    assert.deepEqual(fichiers, Array.from({ length: s.coupes }, (_, i) => String(i).padStart(2, '0') + '.jpg'));
    for (const f of [fichiers[0], fichiers[fichiers.length - 1]]) assert.deepEqual(dimJpeg(path.join(D, s.id, f)), [s.largeur, s.hauteur], s.id + '/' + f);
    assert.equal(s.reperes.length, s.coupes);
    assert.ok(s.reperes.filter(r => r.length).length >= s.coupes * 0.6, s.id + ' : la plupart des coupes sont légendées');
  }
});

test('orientation : convention radiologique, côtés latéral / médial selon le genou (droit ou gauche)', () => {
  for (const s of A.series) {
    if (s.plan === 'sagittal') assert.deepEqual(s.orientation, ['S', 'I', 'A', 'P']);
    else {
      // la droite du patient est à gauche de l'écran : genou droit → latéral à gauche ; genou gauche → médial à gauche
      const [g, d] = s.cote === 'droit' ? ['Lat', 'Méd'] : ['Méd', 'Lat'];
      assert.deepEqual(s.orientation.slice(2), [g, d], s.id);
      assert.deepEqual(s.orientation.slice(0, 2), s.plan === 'axial' ? ['A', 'P'] : ['S', 'I'], s.id);
    }
  }
});

test('repères : structures connues, dans l\'image, noms français et catégories du modèle', () => {
  assert.deepEqual(A.categories.map(c => c.nom), ['Os', 'Articulation', 'Cavité articulaire', 'Corps adipeux', 'Ménisques', 'Ligaments', 'Muscles', 'Tendons', 'Fascias', 'Artères', 'Veines', 'Nerfs']);
  const cats = new Set(A.categories.map(c => c.id));
  for (const [id, st] of Object.entries(A.structures)) { assert.ok(cats.has(st.cat), id); assert.match(st.nom, /^[A-ZÉ]/, id); }
  for (const s of A.series) s.reperes.forEach((r, k) => {
    const ids = r.map(x => x[0]);
    assert.equal(new Set(ids).size, ids.length, `${s.id} #${k} : doublon`);
    for (const [id, x, y] of r) {
      assert.ok(A.structures[id], `${s.id} #${k} : ${id} inconnue`);
      assert.ok(x >= 0 && x < s.largeur && y >= 0 && y < s.hauteur, `${s.id} #${k} : ${id} hors image`);
    }
  });
  const toutes = new Set(A.series.flatMap(s => s.reperes.flat().map(x => x[0])));
  for (const id of ['lca', 'lcp', 'lcm', 'ml-ant', 'ml-post', 'mm-ant', 'mm-post', 'patella', 'tibia', 'fibula-tete', 'hoffa', 'lig-patellaire', 'tendon-quadricipital', 'artere-poplitee', 'nerf-tibial', 'tractus-iliotibial'])
    assert.ok(toutes.has(id), id);
  assert.equal(A.structures.lca.nom, 'Ligament croisé antérieur');
  assert.equal(A.structures.hoffa.nom, 'Corps adipeux infrapatellaire (Hoffa)');
  assert.equal(A.structures['ml-ant'].cat, 'menisques');
});

test('atlas à jour : identique à ce que produirait construire_atlas_genou.py depuis les repères', () => {
  const series = JSON.parse(fs.readFileSync(path.join(D, 'series.json'), 'utf8'));
  const pos = (kf, k) => {
    const c = Object.entries(kf).map(([a, p]) => [+a, p]).sort((a, b) => a[0] - b[0]);
    if (k < c[0][0] || k > c[c.length - 1][0]) return null;
    for (let i = 0; i < c.length; i++) {
      const [c0, p0] = c[i], [c1, p1] = c[Math.min(i + 1, c.length - 1)];
      if (c0 <= k && k <= c1) { const t = c1 === c0 ? 0 : (k - c0) / (c1 - c0); const r = v => Math.round(v + 1e-9 * Math.sign(v)); return [r(p0[0] + t * (p1[0] - p0[0])), r(p0[1] + t * (p1[1] - p0[1]))]; }
    }
  };
  for (const S of series) {
    const src = JSON.parse(fs.readFileSync(path.join(D, 'reperes-source', S.id + '.json'), 'utf8'));
    const a = A.series.find(s => s.id === S.id);
    for (let k = 0; k < S.coupes; k++) {
      const attendu = src.structures.map(st => [st.id, pos(st.kf, k)]).filter(([, p]) => p).map(([id]) => id);
      assert.deepEqual(a.reperes[k].map(x => x[0]), attendu, `${S.id} #${k}`);
    }
  }
  for (const id of Object.keys(A.structures)) assert.deepEqual([A.structures[id].nom, A.structures[id].cat], N.structures[id]);
});

test('page : visionneuse, catégories, quiz, crédits CC BY 4.0, carte de l\'accueil Radioanatomie', () => {
  assert.match(HTML, /<div class="ac-station" data-atlas="donnees\/genou-irm\/atlas\.json"/);
  for (const m of ['data-ac="categories"', 'data-ac="legendes"', 'data-ac="quiz"', 'data-ac="tout"', 'data-ac="recommencer"', 'class="ac-panneau"'])
    assert.ok(HTML.includes(m), m);
  assert.match(HTML, /<script src="atlas-coupes\.js\?v=\d+"><\/script>/);
  assert.match(HTML, /<link rel="stylesheet" href="atlas-coupes\.css\?v=\d+">/);
  assert.match(HTML, /creativecommons\.org\/licenses\/by\/4\.0/);
  assert.match(HTML, /doi:10\.5281\/zenodo\.22688334/);
  assert.ok(fs.existsSync(path.join(D, 'LICENSE-TotalSegmentator-CC-BY-4.0.txt')));
  const index = fs.readFileSync(path.join(R, 'radioanatomie', 'index.html'), 'utf8');
  assert.match(index, /<a class="fiche-card" href="irm-genou\.html"/);
  assert.match(index, /id="irm"/);
  const js = fs.readFileSync(path.join(R, 'radioanatomie', 'atlas-coupes.js'), 'utf8');
  for (const m of ['is-cache', 'preserveAspectRatio', 'ResizeObserver', 'wheel']) assert.ok(js.includes(m), m);
});
