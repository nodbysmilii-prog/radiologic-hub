/* Tests de l'espace radioanatomie : module « Territoires artériels du cerveau »
   (radioanatomie/territoires-arteriels.html, visionneuse.js, données préparées par
   scripts/radioanatomie/preparer_territoires.py).
   Lancer : npm test   (ou : node --test tests/radioanatomie.test.js) */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');

const RACINE = path.join(__dirname, '..');
const DOSSIER = path.join(RACINE, 'radioanatomie');
const DONNEES = path.join(DOSSIER, 'donnees', 'territoires-arteriels');
const M = JSON.parse(fs.readFileSync(path.join(DONNEES, 'manifest.json'), 'utf8'));
const lire = f => zlib.gunzipSync(fs.readFileSync(path.join(DONNEES, f)));
const irm = lire(M.fichiers.irm), carte = lire(M.fichiers.territoires);
const [nx, ny, nz] = M.dimensions;

test('données : grille, empreintes, taille des fichiers', () => {
  assert.deepEqual(M.dimensions, [181, 217, 181]);
  assert.deepEqual(M.espacement_mm, [1, 1, 1]);
  assert.deepEqual(M.origine_mm, [-90, -126, -72]);
  assert.equal(irm.length, nx * ny * nz);
  assert.equal(carte.length, nx * ny * nz);
  assert.equal(crypto.createHash('sha256').update(irm).digest('hex'), M.empreintes_sha256_decompresse.irm);
  assert.equal(crypto.createHash('sha256').update(carte).digest('hex'), M.empreintes_sha256_decompresse.territoires);
  assert.ok(fs.statSync(path.join(DONNEES, M.fichiers.irm)).size < 5e6, 'IRM compressée < 5 Mo');
  assert.ok(fs.statSync(path.join(DONNEES, M.fichiers.territoires)).size < 3e5, 'territoires compressés < 300 ko');
  // Fond hors de la tête à zéro (noir franc) ; le cerveau occupe la dynamique utile
  assert.equal(irm[0], 0);
  assert.equal(irm[irm.length - 1], 0);
});

test('territoires : 10 × 2 côtés (segmentation vasculaire, sans secteurs lobaires), noms français, couleurs, présents dans la carte', () => {
  assert.deepEqual(Object.keys(M.groupes), ['ACA', 'ACM', 'ACP', 'VB']);
  assert.equal(M.territoires.length, 20);
  assert.deepEqual(M.territoires.map(t => t.id), [1, 2, 3, 4, 7, 8, 5, 6, 17, 18, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30]);
  const presents = new Set(carte);
  for (const t of M.territoires) {
    assert.equal(t.cote, t.id % 2 ? 'G' : 'D', `${t.id} : impair = gauche, pair = droit`);
    assert.ok(M.groupes[t.groupe], t.code);
    assert.match(t.couleur, /^#[0-9a-f]{6}$/);
    assert.ok(t.nom && t.court && t.court.length <= 32, t.code);
    assert.ok(presents.has(t.id), `${t.code} ${t.cote} présent dans la carte`);
  }
  const autorises = new Set([0, ...M.territoires.map(t => t.id), ...M.non_colores.map(x => x.id)]);
  for (const v of presents) assert.ok(autorises.has(v), `valeur inconnue dans la carte : ${v}`);
  const codes = [...new Set(M.territoires.map(t => t.code))];
  assert.deepEqual(codes, ['ACA', 'LSM', 'ACM', 'LSL', 'ACP', 'THP', 'THA', 'BAS', 'ACS', 'ACI']);
  assert.ok(!M.territoires.some(t => /secteur|frontal|pariétal|temporal|occipital|insulaire/.test(t.nom)), 'pas de secteurs lobaires');
  assert.match(M.territoires.find(t => t.code === 'ACI').nom, /antéro-inférieure et postéro-inférieure/);
  // Vocabulaire de l'auteur : territoires superficiel et profond (pas « cortical »)
  assert.ok(!M.territoires.some(t => /cortica/i.test(t.nom + t.court)), 'superficiel plutôt que cortical');
  for (const g of ['ACA', 'ACM', 'ACP']) assert.equal(M.territoires.find(t => t.code === g).nom, `Territoire superficiel de l'${g}`);
  const profond = M.territoires.find(t => t.code === 'LSL');
  assert.equal(profond.nom, "Territoire profond de l'ACM");
  assert.match(profond.precision, /lenticulo-striées latérales/);
});

test('orientation : gauche et droite, territoires au bon endroit (espace MNI)', () => {
  // Centre de gravité (mm) de chaque identifiant
  const n = new Float64Array(64), sx = new Float64Array(64), sy = new Float64Array(64), sz = new Float64Array(64);
  for (let z = 0, p = 0; z < nz; z++) for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++, p++) {
    const v = carte[p]; if (!v) continue;
    n[v]++; sx[v] += x; sy[v] += y; sz[v] += z;
  }
  const c = id => [sx[id] / n[id] + M.origine_mm[0], sy[id] / n[id] + M.origine_mm[1], sz[id] / n[id] + M.origine_mm[2]];
  const par = code => M.territoires.filter(t => t.code === code).map(t => t.id);
  for (const t of M.territoires) assert.ok(t.cote === 'G' ? c(t.id)[0] < 0 : c(t.id)[0] > 0, `${t.code} ${t.cote} : x = ${c(t.id)[0].toFixed(0)}`);
  const [acaG] = par('ACA'), [lslG] = par('LSL'), [acmG] = par('ACM'), [acpG] = par('ACP'), [basG] = par('BAS'), [acsG] = par('ACS'), [aciG] = par('ACI'), [thpG] = par('THP');
  assert.ok(c(acpG)[1] < -50 && c(acmG)[1] > c(acpG)[1] && Math.abs(c(acmG)[0]) > 35, 'ACP postérieure, ACM latérale');
  assert.ok(c(acaG)[2] > 20 && Math.abs(c(acaG)[0]) < 20, 'ACA : haute et paramédiane');
  assert.ok(Math.abs(c(lslG)[0]) < 30 && Math.abs(c(lslG)[2] - 5) < 15, 'territoire profond de l\'ACM : noyaux gris centraux');
  assert.ok(Math.abs(c(thpG)[0]) < 20 && c(thpG)[1] < -10, 'thalamo-perforantes postérieures : thalamus');
  assert.ok(c(basG)[2] < -20 && Math.abs(c(basG)[0]) < 12, 'basilaire : tronc cérébral');
  assert.ok(c(acsG)[2] > c(aciG)[2], 'cérébelleuse supérieure au-dessus des cérébelleuses inférieures');
  // Basilaire limité au tronc cérébral : rien en arrière du plancher du 4e ventricule ni à plus de 20 mm de la ligne médiane
  for (let z = 0, p = 0; z < nz; z++) for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++, p++) {
    if (carte[p] !== 25 && carte[p] !== 26) continue;
    assert.ok(Math.abs(x + M.origine_mm[0]) <= 20, `basilaire à x = ${x + M.origine_mm[0]} mm`);
  }
  const zPont = -32 - M.origine_mm[2];
  let basArriere = 0, v4Avant = -Infinity;
  for (let y = 0; y < ny; y++) for (let x = 78; x < 103; x++) { if (carte[x + nx * (y + ny * zPont)] === 31 && y + M.origine_mm[1] < -25) v4Avant = Math.max(v4Avant, y); }
  for (let y = 0; y < v4Avant; y++) for (let x = 0; x < nx; x++) { const v = carte[x + nx * (y + ny * zPont)]; if (v === 25 || v === 26) basArriere++; }
  assert.equal(basArriere, 0, 'pont (z = −32 mm) : pas de basilaire en arrière du plancher du 4e ventricule');
  // Le LCS des ventricules latéraux n'est pas coloré
  const lcs = M.non_colores[0].id;
  assert.ok(n[lcs] > 5000, 'LCS profond identifié');
});

test('licences et crédits : Colin 27 (MNI) et atlas CC BY-SA 4.0 (Liu et al. 2023)', () => {
  const atlas = fs.readFileSync(path.join(DONNEES, 'LICENSE-atlas-CC-BY-SA-4.0.txt'), 'utf8');
  const colin = fs.readFileSync(path.join(DONNEES, 'LICENSE-colin27.txt'), 'utf8');
  assert.match(atlas, /^Attribution-ShareAlike 4\.0 International/);
  assert.match(colin, /Copyright \(C\) 1993–2009 Louis Collins[\s\S]*provided that the above copyright notice appear in all copies/);
  assert.match(M.credits.atlas, /CC BY-SA 4\.0[\s\S]*même licence/);
  const page = fs.readFileSync(path.join(DOSSIER, 'territoires-arteriels.html'), 'utf8');
  for (const motif of [/Copyright \(C\) 1993–2009 Louis Collins, McConnell Brain Imaging Centre, Montreal Neurological Institute, McGill University/,
    /Liu C-F, Hsu J, Xu X/, /doi:10\.1038\/s41597-022-01923-0/, /CC BY-SA 4\.0/, /diffusée sous la même licence/])
    assert.match(page, motif);
  // Script de préparation : sources figées et vérifiées
  const script = fs.readFileSync(path.join(RACINE, 'scripts/radioanatomie/preparer_territoires.py'), 'utf8');
  assert.match(script, /COMMIT_ATLAS = 'fbeb3fe70b6fb8185244d02f9c6b6e07c13235e0'/);
  assert.match(script, /versionId=/);
  assert.equal((script.match(/'[0-9a-f]{64}'\)/g) || []).length, 5, '5 empreintes sha256');
});

test('pages : visionneuse, accueil de l\'espace, carte des Fiches rapides, liens locaux', () => {
  const page = fs.readFileSync(path.join(DOSSIER, 'territoires-arteriels.html'), 'utf8');
  const accueil = fs.readFileSync(path.join(DOSSIER, 'index.html'), 'utf8');
  for (const [nom, html] of [['territoires-arteriels.html', page], ['index.html', accueil]]) {
    for (const [, lien] of html.matchAll(/(?:src|href)="([^"#:?]+)(?:\?v=\d+)?"/g)) {
      if (lien.startsWith('mailto')) continue;
      assert.ok(fs.existsSync(path.join(DOSSIER, lien)), `${nom} : ${lien} introuvable`);
    }
  }
  assert.match(page, /<div class="ra-station" id="ra-station" data-donnees="donnees\/territoires-arteriels\/">/);
  for (const plan of ['axial', 'coronal', 'sagittal']) assert.match(page, new RegExp(`data-plan="${plan}"`));
  for (const outil of ['defiler', 'fenetrage', 'zoom', 'deplacer', 'identifier']) assert.match(page, new RegExp(`data-outil="${outil}"`));
  for (const id of ['ra-toile', 'ra-coupe', 'ra-territoires', 'ra-etiquettes', 'ra-contours', 'ra-opacite', 'ra-fenetres', 'ra-largeur', 'ra-niveau'])
    assert.match(page, new RegExp(`id="${id}"`));
  assert.match(accueil, /<a class="fiche-card" href="territoires-arteriels\.html"/);
  const fiches = fs.readFileSync(path.join(RACINE, 'fiches-rapides.html'), 'utf8');
  assert.match(fiches, /<a class="fiche-card" data-spe="neuro" href="radioanatomie\/territoires-arteriels\.html"/);
  const js = fs.readFileSync(path.join(DOSSIER, 'visionneuse.js'), 'utf8');
  for (const motif of [/DecompressionStream\('gzip'\)/, /addEventListener\('wheel'/, /pointerdown/, /ArrowUp/, /requestFullscreen/])
    assert.match(js, motif);
  // Textes visibles sans tiret cadratin dans les phrases
  const visible = page.replace(/<title>[\s\S]*?<\/title>|<meta[^>]*>|<script[\s\S]*?<\/script>|<svg[\s\S]*?<\/svg>/g, '').replace(/<[^>]+>/g, ' ');
  assert.ok(!/\S — \S/.test(visible.replace('RadiologicHub — accueil', '')), 'pas de tiret cadratin');
});
