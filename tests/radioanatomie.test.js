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
const series = Object.fromEntries(M.series.map(s => [s.code, lire(s.fichier)]));
const carte = lire(M.fichiers.territoires), jon = lire(M.fichiers.jonctions);
const [nx, ny, nz] = M.dimensions;
const [ox, oy, oz] = M.origine_mm;
const id = (code, cote) => M.territoires.find(t => t.code === code && t.cote === cote).id;
// Parcours de la grille en millimètres (espace MNI)
function parcourir(f) {
  for (let z = 0, p = 0; z < nz; z++) for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++, p++) f(p, x + ox, y + oy, z + oz);
}
// Centre de gravité (mm) de chaque identifiant de la carte
const n = new Float64Array(64), sx = new Float64Array(64), sy = new Float64Array(64), sz = new Float64Array(64);
parcourir((p, x, y, z) => { const v = carte[p]; if (v) { n[v]++; sx[v] += x; sy[v] += y; sz[v] += z; } });
const centre = i => [sx[i] / n[i], sy[i] / n[i], sz[i] / n[i]];

test('données : grille, trois pondérations d\'un même sujet, empreintes, taille des fichiers', () => {
  assert.deepEqual(M.dimensions, [181, 217, 181]);
  assert.deepEqual(M.espacement_mm, [1, 1, 1]);
  assert.deepEqual(M.origine_mm, [-90, -126, -72]);
  assert.deepEqual(M.series.map(s => s.code), ['T1', 'T2', 'FLAIR']);
  for (const s of M.series) {
    const v = series[s.code];
    assert.equal(v.length, nx * ny * nz, s.code);
    assert.equal(crypto.createHash('sha256').update(v).digest('hex'), M.empreintes_sha256_decompresse[s.code], s.code);
    assert.ok(fs.statSync(path.join(DONNEES, s.fichier)).size < 5e6, `${s.code} compressé < 5 Mo`);
    assert.equal(v[0], 0, `${s.code} : fond hors de la tête à zéro`);
    assert.equal(v[v.length - 1], 0);
    assert.ok(s.fenetres.length >= 2 && s.fenetres.every(f => f.largeur > 0 && f.niveau > 0), s.code);
  }
  for (const [cle, v] of [['territoires', carte], ['jonctions', jon]]) {
    assert.equal(v.length, nx * ny * nz);
    assert.equal(crypto.createHash('sha256').update(v).digest('hex'), M.empreintes_sha256_decompresse[cle]);
  }
  assert.ok(fs.statSync(path.join(DONNEES, M.fichiers.territoires)).size < 4e5, 'territoires compressés < 400 ko');
  // Contrastes attendus : LCS sombre en T1 et en FLAIR, très clair en T2 ; substance blanche plus claire que le cortex en T1
  const moy = { lcs: { T1: 0, T2: 0, FLAIR: 0, n: 0 }, tissu: { T1: 0, T2: 0, FLAIR: 0, n: 0 } };
  parcourir(p => {
    const v = carte[p]; if (!v) return;
    const m = v === 31 ? moy.lcs : moy.tissu;
    m.n++; for (const s of ['T1', 'T2', 'FLAIR']) m[s] += series[s][p];
  });
  const r = (m, s) => m[s] / m.n;
  assert.ok(r(moy.lcs, 'T1') < r(moy.tissu, 'T1') - 40, 'T1 : LCS sombre');
  assert.ok(r(moy.lcs, 'T2') > r(moy.tissu, 'T2') + 40, 'T2 : LCS clair');
  assert.ok(r(moy.lcs, 'FLAIR') < r(moy.tissu, 'FLAIR') - 40, 'FLAIR : LCS éteint');
});

test('territoires : découpage des coupes de référence (11 × 2 côtés), noms français, couleurs, présents dans la carte', () => {
  assert.deepEqual(Object.keys(M.groupes), ['ACA', 'ACM', 'ChA', 'ACP', 'VB']);
  assert.equal(M.territoires.length, 22);
  assert.deepEqual([...new Set(M.territoires.map(t => t.code))], ['ACA', 'LSM', 'ACM', 'LSL', 'ChA', 'ACP', 'BAS', 'ACS', 'AICA', 'PICA', 'VERT']);
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
  assert.ok(!M.territoires.some(t => /secteur|frontal |pariétal |insulaire/.test(t.nom)), 'pas de secteurs lobaires');
  // Vocabulaire de l'auteur et de la vidéo de référence
  assert.ok(!M.territoires.some(t => /cortica/i.test(t.nom + t.court)), 'superficiel plutôt que cortical');
  for (const g of ['ACA', 'ACM']) assert.equal(M.territoires.find(t => t.code === g).nom, `Territoire superficiel de l'${g}`);
  assert.equal(M.territoires.find(t => t.code === 'LSL').nom, "Territoire profond de l'ACM");
  assert.equal(M.territoires.find(t => t.code === 'ACP').nom, "Territoire de l'ACP");
  assert.equal(M.territoires.find(t => t.code === 'ChA').nom, "Territoire de l'artère choroïdienne antérieure");
  assert.match(M.territoires.find(t => t.code === 'LSM').nom, /Heubner/);
  assert.match(M.territoires.find(t => t.code === 'AICA').nom, /antéro-inférieure \(AICA\)/);
  assert.match(M.territoires.find(t => t.code === 'PICA').nom, /postéro-inférieure \(PICA\)/);
  assert.match(M.territoires.find(t => t.code === 'VERT').nom, /vertébrale et de l'artère spinale antérieure/);
});

test('orientation et anatomie : chaque territoire à sa place (espace MNI)', () => {
  for (const t of M.territoires) assert.ok(t.cote === 'G' ? centre(t.id)[0] < 0 : centre(t.id)[0] > 0, `${t.code} ${t.cote} : x = ${centre(t.id)[0].toFixed(0)}`);
  for (const cote of ['G', 'D']) {
    const c = code => centre(id(code, cote)), ax = code => Math.abs(c(code)[0]);
    assert.ok(c('ACP')[1] < -40 && c('ACM')[1] > c('ACP')[1] && ax('ACM') > 35, `${cote} : ACP postérieure, ACM latérale`);
    assert.ok(c('ACA')[2] > 15 && ax('ACA') < 20, `${cote} : ACA haute et paramédiane`);
    assert.ok(ax('LSL') > 12 && ax('LSL') < 30 && Math.abs(c('LSL')[2] - 5) < 12, `${cote} : territoire profond de l'ACM sur le noyau lenticulaire`);
    assert.ok(c('LSM')[1] > c('LSL')[1] && ax('LSM') < ax('LSL'), `${cote} : tête du caudé en avant et en dedans du noyau lenticulaire`);
    assert.ok(c('BAS')[2] < -18 && c('BAS')[2] > -48 && ax('BAS') < 12, `${cote} : basilaire sur le pont`);
    assert.ok(c('VERT')[2] < -40 && ax('VERT') < 10, `${cote} : vertébrale et spinale antérieure sur le bulbe`);
    assert.ok(c('ACS')[2] > c('PICA')[2], `${cote} : cérébelleuse supérieure au-dessus de la PICA`);
    assert.ok(c('AICA')[1] > c('PICA')[1] && ax('AICA') > 14, `${cote} : AICA en avant et en dehors (face pétreuse)`);
  }
  // Le LCS profond n'est pas coloré
  assert.ok(n[M.non_colores[0].id] > 5000, 'LCS profond identifié');
});

test('coupes de référence : ACP (thalamus, mésencéphale, limite haute), choroïdienne antérieure, territoires profonds', () => {
  const acp = new Set([17, 18]), cha = new Set([23, 24]);
  let thalamus = 0, mesencephale = 0, acpHaut = -Infinity, capsule = 0, uncus = 0, chaHippocampe = 0;
  let lsl = 0, lslHaut = -Infinity, lslLat = 0, lsmHaut = -Infinity;
  parcourir((p, x, y, z) => {
    const t = carte[p], ax = Math.abs(x);
    if (acp.has(t)) {
      acpHaut = Math.max(acpHaut, z);
      if (ax < 18 && y > -32 && y < -6 && z > 0 && z < 14) thalamus++;
      if (ax < 8 && y > -32 && y < -12 && z > -16 && z < -8) mesencephale++;
    }
    if (cha.has(t)) {
      if (z >= -4 && z <= 16 && y < 0) capsule++;
      if (z < -6 && y > -26) uncus++;
      if (z < -6 && y < -30) chaHippocampe++;
    }
    if (t === 5 || t === 6) { lsl++; lslHaut = Math.max(lslHaut, z); lslLat = Math.max(lslLat, ax); }
    if (t === 3 || t === 4) lsmHaut = Math.max(lsmHaut, z);
  });
  assert.ok(thalamus > 2000, `thalamus dans l'ACP (${thalamus} voxels)`);
  assert.ok(mesencephale > 300, `mésencéphale dans l'ACP (${mesencephale} voxels)`);
  assert.ok(acpHaut <= 34, `ACP absente au-dessus des ventricules latéraux (z max ${acpHaut} mm)`);
  assert.ok(capsule > 2000, `choroïdienne antérieure : bras postérieur de la capsule interne (${capsule} voxels)`);
  assert.ok(uncus > 1000, `choroïdienne antérieure : uncus et tête de l'hippocampe (${uncus} voxels)`);
  assert.ok(chaHippocampe < 300, `corps de l'hippocampe à l'ACP (${chaHippocampe} voxels de choroïdienne antérieure)`);
  assert.ok(lsl < 40000, `territoire profond de l'ACM : ${lsl} voxels (atlas : 56 000)`);
  assert.ok(lslHaut <= 34 && lslLat <= 38, `territoire profond de l'ACM : z ≤ +34, |x| ≤ 38 mm (${lslHaut}, ${lslLat})`);
  assert.ok(lsmHaut <= 26, `lenticulo-striées médiales sous z = +26 mm (${lsmHaut})`);
});

test('zones jonctionnelles : calque à part, corticale entre territoires superficiels, profonde le long du ventricule', () => {
  assert.deepEqual(M.jonctions.map(j => [j.id, j.code]), [[1, 'JC'], [2, 'JP']]);
  const superficiels = new Set([1, 2, 7, 8, 17, 18]);
  let c = 0, d = 0, horsC = 0, horsD = 0;
  parcourir((p, x, y, z) => {
    const j = jon[p];
    if (!j) return;
    assert.ok(j === 1 || j === 2, `valeur inconnue dans le calque : ${j}`);
    if (j === 1) { c++; if (!superficiels.has(carte[p])) horsC++; }
    if (j === 2) { d++; if (!(carte[p] === 7 || carte[p] === 8) || z < 14 || z > 34) horsD++; }
  });
  assert.ok(c > 20000 && d > 3000, `zones présentes (corticale ${c}, profonde ${d})`);
  assert.equal(horsC, 0, 'zone corticale dans les territoires superficiels');
  assert.equal(horsD, 0, 'zone profonde dans le territoire superficiel de l\'ACM, de z = +14 à +34 mm');
});

test('mode test : banque de questions vérifiée sur la carte du sujet (structure, territoire, deux côtés)', () => {
  const Q = M.questions;
  assert.ok(Q.length >= 20, `${Q.length} questions`);
  assert.equal(new Set(Q.map(q => q.structure)).size, Q.length, 'structures toutes différentes');
  const categories = {};
  for (const q of Q) {
    assert.ok(['profond', 'cortical', 'fosse'].includes(q.categorie), q.structure);
    categories[q.categorie] = (categories[q.categorie] || 0) + 1;
    assert.ok(q.rayon_mm >= 3 && q.rayon_mm <= 15, q.structure);
    assert.ok(q.note && q.note.length > 10, q.structure);
    for (const cote of ['D', 'G']) {
      const [x, y, z] = q.cibles_mm[cote];
      assert.ok(cote === 'D' ? x > 0 : x < 0, `${q.structure} ${cote} : x = ${x}`);
      const v = carte[(x - ox) + nx * ((y - oy) + ny * (z - oz))];
      assert.equal(v, id(q.territoire, cote), `${q.structure} ${cote} : la cible est dans le territoire ${q.territoire}`);
    }
  }
  // assez de structures par catégorie pour proposer trois mauvaises réponses
  for (const [c, nb] of Object.entries(categories)) assert.ok(nb >= 4, `${c} : ${nb} structures`);
  const page = fs.readFileSync(path.join(DOSSIER, 'territoires-arteriels.html'), 'utf8');
  assert.match(page, /data-action="test"/);
  assert.match(page, /<div class="ra-bloc ra-test" id="ra-test" aria-live="polite" hidden><\/div>/);
  assert.equal((page.match(/class="ra-bloc ra-hors-test"/g) || []).length, 3, 'territoires, légende et territoire choisi masqués pendant le test');
  const js = fs.readFileSync(path.join(DOSSIER, 'visionneuse.js'), 'utf8');
  for (const motif of [/function demarrerTest/, /function creerLesion/, /function appliquerLesion/, /function validerTest/, /NB_QUESTIONS = 10/])
    assert.match(js, motif);
});

test('licences et crédits : IRM IBC (CC0), atlas CC BY-SA 4.0 (Liu et al. 2023), Colin 27', () => {
  const atlas = fs.readFileSync(path.join(DONNEES, 'LICENSE-atlas-CC-BY-SA-4.0.txt'), 'utf8');
  const colin = fs.readFileSync(path.join(DONNEES, 'LICENSE-colin27.txt'), 'utf8');
  const ibc = fs.readFileSync(path.join(DONNEES, 'LICENSE-irm-IBC-CC0.txt'), 'utf8');
  assert.match(atlas, /^Attribution-ShareAlike 4\.0 International/);
  assert.match(colin, /Copyright \(C\) 1993–2009 Louis Collins[\s\S]*provided that the above copyright notice appear in all copies/);
  assert.match(ibc, /Individual Brain Charting[\s\S]*ds002685[\s\S]*CC0[\s\S]*Pinho AL/);
  assert.match(M.credits.atlas, /CC BY-SA 4\.0[\s\S]*même licence/);
  assert.match(M.credits.irm, /Individual Brain Charting[\s\S]*CC0/);
  const page = fs.readFileSync(path.join(DOSSIER, 'territoires-arteriels.html'), 'utf8');
  for (const motif of [/Individual Brain Charting/, /ds002685/, /CC0/, /doi:10\.1038\/sdata\.2018\.105/,
    /Copyright \(C\) 1993–2009 Louis Collins, McConnell Brain Imaging Centre, Montreal Neurological Institute, McGill University/,
    /Liu C-F, Hsu J, Xu X/, /doi:10\.1038\/s41597-022-01923-0/, /CC BY-SA 4\.0/, /diffusée sous la même licence/])
    assert.match(page, motif);
  // Script de préparation : sources figées et vérifiées
  const script = fs.readFileSync(path.join(RACINE, 'scripts/radioanatomie/preparer_territoires.py'), 'utf8');
  assert.match(script, /COMMIT_ATLAS = 'fbeb3fe70b6fb8185244d02f9c6b6e07c13235e0'/);
  assert.equal((script.match(/versionId=/g) || []).length, 5, '5 fichiers à version figée (TemplateFlow, OpenNeuro)');
  assert.equal((script.match(/'[0-9a-f]{64}'\)/g) || []).length, 8, '8 empreintes sha256');
});

test('pages : visionneuse, pondérations, accueil de l\'espace, carte des Fiches rapides, liens locaux', () => {
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
  for (const s of ['T1', 'T2', 'FLAIR']) assert.match(page, new RegExp(`data-serie="${s}"`));
  for (const outil of ['defiler', 'fenetrage', 'zoom', 'deplacer', 'identifier']) assert.match(page, new RegExp(`data-outil="${outil}"`));
  for (const i of ['ra-toile', 'ra-coupe', 'ra-territoires', 'ra-etiquettes', 'ra-contours', 'ra-jonctions', 'ra-opacite', 'ra-fenetres', 'ra-largeur', 'ra-niveau'])
    assert.match(page, new RegExp(`id="${i}"`));
  assert.match(accueil, /<a class="fiche-card" href="territoires-arteriels\.html"/);
  const fiches = fs.readFileSync(path.join(RACINE, 'fiches-rapides.html'), 'utf8');
  assert.match(fiches, /<a class="fiche-card" data-spe="neuro" href="radioanatomie\/territoires-arteriels\.html"/);
  const js = fs.readFileSync(path.join(DOSSIER, 'visionneuse.js'), 'utf8');
  for (const motif of [/DecompressionStream\('gzip'\)/, /addEventListener\('wheel'/, /pointerdown/, /ArrowUp/, /requestFullscreen/,
    /function changerSerie/, /function peindreJonctions/, /manifest\.series\[0\]\.fichier/])
    assert.match(js, motif);
  // Textes visibles sans tiret cadratin dans les phrases
  const visible = page.replace(/<title>[\s\S]*?<\/title>|<meta[^>]*>|<script[\s\S]*?<\/script>|<svg[\s\S]*?<\/svg>/g, '').replace(/<[^>]+>/g, ' ');
  assert.ok(!/\S — \S/.test(visible.replace('RadiologicHub — accueil', '')), 'pas de tiret cadratin');
});
