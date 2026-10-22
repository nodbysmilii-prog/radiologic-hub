/* Tests des planches de radiographie standard (Radioanatomie › Radiographie standard) :
   radioanatomie/radiographie-standard/cavum-profil.{json,html}, radioanatomie/planche.{js,css},
   scripts/radioanatomie/construire_planche.py.
   Lancer : npm test   (ou : node --test tests/radioanatomie-planche.test.js) */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const R = path.join(__dirname, '..');
const BASE = path.join(R, 'radioanatomie', 'radiographie-standard', 'cavum-profil');
const D = JSON.parse(fs.readFileSync(BASE + '.json', 'utf8'));
const HTML = fs.readFileSync(BASE + '.html', 'utf8');

// Traductions validées par l'auteur le 21/10/2026 (ordre de la planche)
const VALIDEES = ['Sinus frontal', 'Os nasal', 'Cellules ethmoïdales', 'Sinus sphénoïdal', 'Sinus maxillaire',
  'Processus clinoïde antérieur', 'Processus clinoïde postérieur', 'Selle turcique', 'Végétations adénoïdes', 'Palais mou',
  'Tonsille palatine', 'Tonsille linguale', 'Épiglotte', 'Os hyoïde', 'Larynx', 'Trachée'];

test('16 structures : traductions validées, numérotées 1 à 16, étiquette = nom', () => {
  assert.deepEqual(D.structures.map(s => s.nom), VALIDEES);
  assert.deepEqual(D.structures.map(s => s.n), VALIDEES.map((_, i) => i + 1));
  for (const s of D.structures) assert.equal(s.lignes.join(' '), s.nom, s.id);
  assert.equal(D.titre, 'Radiographie du cavum de profil');
  assert.equal(D.sousTitre, 'Étude du rhinopharynx et des végétations adénoïdes');
});

test('positions et tracés dans le cliché ; couleurs vives sur le cliché, foncées dans le texte', () => {
  const { largeur: W, hauteur: H } = D.image;
  const dans = ([x, y]) => x >= 0 && x <= W && y >= 0 && y <= H;
  for (const s of D.structures) {
    assert.ok(dans([s.x, s.y]), s.id);
    for (const c of s.traits) { assert.ok(c.length >= 2, s.id); for (const p of c) assert.ok(dans(p), s.id + ' ' + p); }
    assert.match(s.c, /^#[0-9a-f]{6}$/); assert.match(s.t, /^#[0-9a-f]{6}$/);
    // contraste WCAG : trait sur le fond sombre des étiquettes (#111114), texte de la liste sur blanc
    const lum = h => { const v = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(c => c <= .03928 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4); return .2126 * v[0] + .7152 * v[1] + .0722 * v[2]; };
    const contraste = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + .05) / (y + .05); };
    assert.ok(contraste(s.c, '#111114') >= 4.5, s.id + ' : trait assez clair sur le cliché');
    assert.ok(contraste(s.t, '#ffffff') >= 4.5, s.id + ' : texte assez foncé sur fond clair');
  }
  const sansTrait = D.structures.filter(s => !s.traits.length).map(s => s.id);
  assert.deepEqual(sansTrait, ['cellules-ethmoidales', 'sinus-sphenoidal', 'sinus-maxillaire', 'larynx'], 'pas de contour inventé');
  assert.ok(D.structures.find(s => s.id === 'os-hyoide').ferme, 'contour fermé de l\'os hyoïde');
});

test('page générée à jour : calque SVG et liste identiques au JSON', () => {
  const svg = HTML.match(/<!-- planche:svg -->([\s\S]*?)<!-- \/planche:svg -->/)[1];
  assert.match(svg, new RegExp(`viewBox="0 0 ${D.image.largeur} ${D.image.hauteur}"`));
  const groupes = [...svg.matchAll(/<g class="pl-s" data-s="([a-z-]+)" data-n="(\d+)" style="--c: (#[0-9a-f]{6})">/g)];
  assert.deepEqual(groupes.map(g => [g[1], +g[2], g[3]]), D.structures.map(s => [s.id, s.n, s.c]));
  for (const s of D.structures) {
    const g = svg.slice(svg.indexOf(`data-s="${s.id}"`)).split('</g>\n  </g>')[0];
    assert.deepEqual([...g.matchAll(/<tspan[^>]*>([^<]+)<\/tspan>/g)].map(m => m[1]), s.lignes, s.id);
    assert.equal((g.match(/class="pl-trait"/g) || []).length, s.traits.length, s.id);
    assert.match(g, new RegExp(`<g class="pl-num" tabindex="0" role="button"[^>]*><g class="pl-num-in"><circle r="19"/><text y="7.5">${s.n}</text>`));
  }
  const liste = [...HTML.matchAll(/<li data-s="([a-z-]+)"[^>]*><span class="pl-pastille">(\d+)<\/span><span class="pl-nom">([^<]+)<\/span>/g)];
  assert.deepEqual(liste.map(l => l[3]), VALIDEES);
});

test('un seul bouton « Afficher / Masquer les légendes », mode quiz, scripts et styles', () => {
  assert.equal((HTML.match(/data-pl="bascule"/g) || []).length, 1);
  assert.match(HTML, />Masquer les légendes<\/button>/);
  assert.match(HTML, /data-pl="quiz"/); assert.match(HTML, /data-pl="tout"/); assert.match(HTML, /data-pl="recommencer"/);
  assert.match(HTML, /<script src="\.\.\/planche\.js\?v=\d+"><\/script>/);
  assert.match(HTML, /<link rel="stylesheet" href="\.\.\/planche\.css\?v=\d+">/);
  const js = fs.readFileSync(path.join(R, 'radioanatomie', 'planche.js'), 'utf8');
  for (const m of ['Masquer les légendes', 'Afficher les légendes', 'révélées', 'is-compact', 'is-vu']) assert.ok(js.includes(m), m);
  assert.match(HTML, /<h1>Radiographie du <span class="hl-navy">cavum de profil<\/span><\/h1>/);
  assert.match(HTML, /Radioanatomie<\/a> › <a href="\.\.\/index\.html#radiographie-standard">Radiographie standard<\/a> › <span>Cavum<\/span> › <span>Profil<\/span>/);
});

test('accueil Radioanatomie : section « Radiographie standard » et carte de la planche', () => {
  const index = fs.readFileSync(path.join(R, 'radioanatomie', 'index.html'), 'utf8');
  assert.match(index, /<h2 class="marker-sub" id="radiographie-standard"[^>]*>Radiographie standard<\/h2>/);
  assert.match(index, /<a class="fiche-card" href="radiographie-standard\/cavum-profil\.html"/);
});

test('cliché de Radiology Buzz : jamais publié sans leur accord', () => {
  const img = path.join(R, 'radioanatomie', 'radiographie-standard', D.image.fichier);
  const credit = HTML.match(/<p class="pl-credit">([^<]+)<\/p>/)[1];
  if (fs.existsSync(img)) assert.match(credit, /avec (leur )?autorisation/i, 'cliché présent : le crédit doit mentionner l\'autorisation');
  else assert.match(credit, /en attente/);
});

test('planches thoraciques (face, profil) : disposition en colonnes, points dans le cliché, licence citée', () => {
  for (const [f, n] of [['thorax-face', 22], ['thorax-profil', 10]]) {
    const B = path.join(R, 'radioanatomie', 'radiographie-standard', f);
    const D = JSON.parse(fs.readFileSync(B + '.json', 'utf8')), H = fs.readFileSync(B + '.html', 'utf8');
    assert.equal(D.disposition, 'colonnes');
    assert.equal(D.structures.length, n, f);
    assert.deepEqual(D.structures.map(s => s.n), D.structures.map((_, i) => i + 1));
    for (const s of D.structures) {
      assert.ok(['g', 'd'].includes(s.cote), s.id);
      assert.ok(s.point[0] >= 0 && s.point[0] <= D.image.largeur && s.point[1] >= 0 && s.point[1] <= D.image.hauteur, s.id);
      assert.ok(H.includes(`data-s="${s.id}"`), s.id);
    }
    assert.ok(fs.existsSync(path.join(R, 'radioanatomie', 'radiographie-standard', D.image.fichier)), D.image.fichier);
    assert.match(H, /CC BY 4\.0/);
    assert.match(H, /10\.5281\/zenodo\.18241127/);
  }
  assert.ok(fs.existsSync(path.join(R, 'radioanatomie', 'radiographie-standard', 'images', 'LICENSE.txt')));
});
