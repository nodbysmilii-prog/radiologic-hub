/* Tests de la fiche « Imagerie des masses médiastinales » (fiches/masses-mediastinales.html),
   des règles (regles/mediastin.js) et du modèle 3D (public/models/mediastin/).
   Lancer : npm test   (ou : node --test tests/masses-mediastinales.test.js) */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const R = require('../regles/mediastin.js');
const RACINE = path.join(__dirname, '..');
const HTML = fs.readFileSync(path.join(RACINE, 'fiches', 'masses-mediastinales.html'), 'utf8');
const MODELE = JSON.parse(fs.readFileSync(path.join(RACINE, 'public', 'models', 'mediastin', 'mediastin.json'), 'utf8'));

test('orientation tissulaire : repères de la fiche', () => {
  assert.equal(R.orientation({ uh: 0, rehausse: 'non' }).cle, 'hydrique');
  assert.equal(R.orientation({ uh: 30, rehausse: 'oui' }).cle, 'tissulaire');
  assert.equal(R.orientation({ uh: -60 }).cle, 'graisseuse');
  assert.equal(R.orientation({ uh: 10, rehausse: 'vasculaire' }).cle, 'vasculaire');
  assert.equal(R.orientation({ uh: 30, mixte: true }).cle, 'composite');
  assert.equal(R.orientation({ uh: 80, rehausse: 'non' }).cle, 'indetermine');
  assert.equal(R.orientation({ uh: '' }), null);
});

test('Chemical Shift Ratio', () => {
  const h = R.csr({ thyOP: 180, muscleOP: 300, thyIP: 320, muscleIP: 310 });
  assert.equal(h.cle, 'hyperplasie'); assert.ok(h.dansPlage); assert.equal(h.valeur, 0.581);
  const t = R.csr({ thyOP: '310', muscleOP: '300', thyIP: '300', muscleIP: '300' });
  assert.equal(t.cle, 'tumeur'); assert.ok(t.dansPlage);
  assert.equal(R.csr({ thyOP: 260, muscleOP: 300, thyIP: 300, muscleIP: 300 }).cle, 'intermediaire');
  assert.equal(R.csr({ thyOP: 1 }), null);
});

test('goitre et marqueurs germinaux', () => {
  assert.equal(R.goitre('B', 2), "Type B : rétrovasculaire. Grade 2 : au niveau de la crosse de l'aorte.");
  assert.equal(R.goitre('D', 1), '');
  assert.deepEqual(R.germinale({}), []);
  assert.ok(R.germinale({ afp: 'normal', bhcg: 'normal' })[0].startsWith('Séminome'));
  const e = R.germinale({ afp: 'eleve', bhcg: 'eleve' }).map(t => t.split(' (')[0]);
  for (const n of ['Tumeur vitelline maligne', 'Tératocarcinome', 'Choriocarcinome', 'Carcinome embryonnaire']) assert.ok(e.includes(n), n);
  assert.ok(!e.includes('Séminome'));
  // chaque tumeur proposée a sa ligne dans le tableau de la fiche
  for (const n of e) assert.ok(HTML.includes(`<td><b>${n}</b></td>`), n);
});

test('entraînement : chaque lésion est dans la liste du compartiment', () => {
  assert.equal(R.CAS.length, 8);
  for (const c of R.CAS) {
    const f = R.FELSON[c.rep];
    assert.ok([...f.tissulaire, ...f.kystique, ...f.graisseuse].includes(c.lesion), c.lesion);
  }
  assert.equal(R.FELSON.anterieur.pct + R.FELSON.moyen.pct + R.FELSON.posterieur.pct, 100);
});

test('modèle 3D : compartiments et structures attendus', () => {
  const ids = MODELE.compartiments.map(c => c.id);
  for (const h of R.HEITZMAN) assert.ok(ids.includes(h.id), h.id);
  for (const f of Object.keys(R.FELSON)) assert.ok(ids.includes('f-' + f), f);
  assert.ok(MODELE.structures.some(s => s.id === 'tvi-gauche'));
  for (const f of ['mediastin.glb', 'LICENSE-Z-Anatomy.txt']) assert.ok(fs.existsSync(path.join(RACINE, 'public', 'models', 'mediastin', f)), f);
  // les liens « 3D » du texte visent des compartiments existants (ou le tronc veineux innominé)
  for (const [, v] of HTML.matchAll(/data-voir="([^"]+)"/g)) assert.ok(v === 'tvi' || ids.includes(v), v);
  for (const [, v] of HTML.matchAll(/data-felson="([^"]+)"/g)) assert.ok(ids.includes(v), v);
});

test('fiche : sections, lexique de l\'auteur, scripts, carte', () => {
  for (const id of ['introduction', 'exploration', 'compartiments', 'orientation', 'anterieur', 'moyen', 'posterieur', 'conclusion', 'testez-vous'])
    assert.ok(HTML.includes(`id="${id}"`), id);
  for (const t of ['Radiographie normale + symptômes cliniques = TDM.', 'CSR = (Thy OP / muscle OP) / (Thy IP / muscle IP)',
    'Hyperplasie : 0,614 +/- 0,13', 'Tumeurs thymiques : 1,026 +/- 0,039.', 'Extension transdiaphragmatique : 30 %.', 'Migration antérieure classique : 80 %.'])
    assert.ok(HTML.includes(t), t);
  for (const s of ['../regles/mediastin.js']) assert.ok(HTML.includes(`<script src="${s}?v=`), s);
  assert.ok(HTML.includes('<script type="module" src="mediastin/mediastin-fiche.js?v='));
  assert.equal((HTML.match(/<body/g) || []).length, 1);
  assert.match(fs.readFileSync(path.join(RACINE, 'fiches-rapides.html'), 'utf8'), /<a class="fiche-card" data-spe="thorax" href="fiches\/masses-mediastinales\.html"/);
});
