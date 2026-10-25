/* Tests des planches de radiographie standard (Radioanatomie › Radiographie standard) :
   radioanatomie/radiographie-standard/{cavum-profil,thorax-face,thorax-profil}.{json,html}, radioanatomie/planche.{js,css},
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

// Traductions validées par l'auteur le 21/10/2026 (ordre de la planche) ; sur le cliché de Wu et al. (enfant),
// le sinus frontal et le sinus sphénoïdal ne sont pas visibles et la trachée est hors champ : non retenus.
const VALIDEES = ['Os nasal', 'Cellules ethmoïdales', 'Sinus maxillaire',
  'Processus clinoïde antérieur', 'Processus clinoïde postérieur', 'Selle turcique', 'Végétations adénoïdes', 'Palais mou',
  'Tonsille palatine', 'Tonsille linguale', 'Épiglotte', 'Os hyoïde', 'Larynx'];

test('13 structures : traductions validées, numérotées, disposition en colonnes, points dans le cliché', () => {
  assert.deepEqual(D.structures.map(s => s.nom), VALIDEES);
  assert.deepEqual(D.structures.map(s => s.n), VALIDEES.map((_, i) => i + 1));
  for (const s of D.structures) assert.equal(s.lignes.join(' '), s.nom, s.id);
  assert.equal(D.titre, 'Radiographie du cavum de profil');
  assert.equal(D.sousTitre, 'Étude du rhinopharynx et des végétations adénoïdes');
  assert.equal(D.disposition, 'colonnes');
  const { largeur: W, hauteur: H } = D.image;
  for (const s of D.structures) {
    assert.ok(['g', 'd'].includes(s.cote), s.id);
    assert.ok(s.point[0] >= 0 && s.point[0] <= W && s.point[1] >= 0 && s.point[1] <= H, s.id);
    assert.match(s.c, /^#[0-9a-f]{6}$/); assert.match(s.t, /^#[0-9a-f]{6}$/);
    const lum = h => { const v = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(c => c <= .03928 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4); return .2126 * v[0] + .7152 * v[1] + .0722 * v[2]; };
    const contraste = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + .05) / (y + .05); };
    assert.ok(contraste(s.c, '#111114') >= 4.5, s.id + ' : trait assez clair sur le cliché');
    assert.ok(contraste(s.t, '#ffffff') >= 4.5, s.id + ' : texte assez foncé sur fond clair');
  }
});

test('page générée à jour : calque SVG et liste identiques au JSON', () => {
  const svg = HTML.match(/<!-- planche:svg -->([\s\S]*?)<!-- \/planche:svg -->/)[1];
  assert.match(svg, new RegExp(`viewBox="0 0 ${D.image.largeur + 2 * D.marge} ${D.image.hauteur}"`));
  const groupes = [...svg.matchAll(/<g class="pl-s" data-s="([a-z-]+)" data-n="(\d+)" style="--c: (#[0-9a-f]{6})">/g)];
  assert.deepEqual(groupes.map(g => g[1]).sort(), D.structures.map(s => s.id).sort());
  for (const s of D.structures) assert.match(svg, new RegExp(`<circle class="pl-point" cx="${(s.point[0] + D.marge).toFixed(1)}" cy="${s.point[1].toFixed(1)}"`), s.id);
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

test('cliché de Wu et al. (CC BY 4.0) : présent, crédité ; rapport A/N avec nos tracés', () => {
  assert.ok(fs.existsSync(path.join(R, 'radioanatomie', 'radiographie-standard', D.image.fichier)));
  const credit = HTML.match(/<p class="pl-credit">([\s\S]*?)<\/p>/)[1];
  assert.match(credit, /Wu et al\., <i>Frontiers in Oncology<\/i>, 2025/); assert.match(credit, /CC BY 4\.0/);
  assert.doesNotMatch(HTML, /Radiology Buzz/);
  assert.match(fs.readFileSync(path.join(R, 'radioanatomie', 'radiographie-standard', 'images', 'LICENSE.txt'), 'utf8'), /cavum-profil\.jpg[\s\S]*Wu et al\.[\s\S]*Frontiers in Oncology/);
  const an = HTML.match(/<!-- cavum:an -->([\s\S]*?)<!-- \/cavum:an -->/)[1];
  assert.match(an, /Rapport A\/N \(Fujioka\)/);
  assert.match(an, /<g class="pl-an-traces">/);
  assert.match(an, /A\/N ≈ 0,81/);
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
