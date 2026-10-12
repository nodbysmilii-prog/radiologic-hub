/* Tests de la classification de Bosniak 2019 (outils/bosniak-rules.js) :
   chaque catégorie, l'ordre des règles, les pièges, le seuil de rehaussement réglable.
   Lancer : npm test   (ou : node --test tests/*.test.js) */
const test = require('node:test');
const assert = require('node:assert/strict');
const B = require('../outils/bosniak-rules.js');

const cat = e => B.classer(e).categorie;
const injecte = e => ({ modalite: 'tdm', injection: 'oui', ...e });

test('I : paroi fine, liquide homogène −9 à 20 UH, ni cloison ni calcification (TDM injectée ou IRM)', () => {
  const r = B.classer(injecte({ uhSans: '8', uhPortal: '10' }));
  assert.equal(r.categorie, 'I');
  assert.equal(r.conduite, 'Bénin : pas de suivi.');
  assert.match(r.criteres.join(' '), /Liquide homogène −9 à 20 UH \(8 UH\)/);
  assert.equal(cat(injecte({ uhPortal: '-5' })), 'I', 'temps portal seul');
  assert.equal(cat({ modalite: 'irm', injection: 'oui', t2Lcr: 'oui' }), 'I', 'IRM injectée : signal du LCR');
  assert.equal(cat(injecte({ uhSans: '8', uhPortal: '10', paroiRehaussee: 'oui' })), 'I', 'la paroi fine peut se rehausser');
});

test('II : cloisons fines, calcifications, formes homogènes (scanner et IRM)', () => {
  assert.equal(cat(injecte({ cloisons: '1-3', cloisonsEpaisseur: '<=2', cloisonsRehaussees: 'oui', uhSans: '5', uhPortal: '6' })), 'II', '1 à 3 cloisons fines');
  assert.equal(cat(injecte({ calcifications: 'fines', uhSans: '5', uhPortal: '6' })), 'II', 'calcifications fines');
  const epaisses = B.classer(injecte({ calcifications: 'epaisses', uhSans: '5', uhPortal: '6' }));
  assert.equal(epaisses.categorie, 'II');
  assert.ok(epaisses.conseils.includes(B.CONSEIL.calcifEpaisses), 'calcification épaisse : IRM conseillée avant de classer');
  assert.equal(cat({ modalite: 'tdm', injection: 'non', uhSans: '12' }), 'II', 'homogène −9 à 20 UH sans injection : II, pas I');
  const hyper = B.classer({ modalite: 'tdm', injection: 'non', uhSans: '75' });
  assert.equal(hyper.categorie, 'II', 'homogène ≥ 70 UH sans injection');
  assert.ok(hyper.conseils.includes(B.CONSEIL.hyperdense), 'kyste hyperdense > 3 cm endophytique → IRM');
  assert.equal(cat(injecte({ uhSans: '45', uhPortal: '48' })), 'II', '> 20 UH sans rehaussement (delta 3 UH)');
  assert.equal(cat(injecte({ uhPortal: '25' })), 'II', '21 à 30 UH au temps portal');
  assert.equal(cat(injecte({ tropPetite: 'oui' })), 'II', 'trop petite pour être caractérisée');
  assert.equal(cat({ modalite: 'irm', injection: 'non', t2Lcr: 'oui' }), 'II', 'IRM sans injection : T2 ≈ LCR');
  assert.equal(cat({ modalite: 'irm', injection: 'oui', t1Hyper: 'oui' }), 'II', 'IRM : T1 ≥ 2,5 × rein');
});

test('IIF : paroi ou cloison lisse de 3 mm rehaussée, ≥ 4 cloisons fines rehaussées, T1 FS hétérogène en IRM', () => {
  assert.equal(cat(injecte({ paroi: '3', paroiRehaussee: 'oui', uhSans: '5', uhPortal: '7' })), 'IIF');
  assert.equal(cat(injecte({ cloisons: '>=4', cloisonsEpaisseur: '<=2', cloisonsRehaussees: 'oui' })), 'IIF');
  assert.equal(cat({ modalite: 'irm', injection: 'oui', t1FsHetero: 'oui' }), 'IIF');
  const r = B.classer(injecte({ paroi: '3', paroiRehaussee: 'oui' }));
  assert.equal(r.conduite, 'Contrôle à 6 et 12 mois, puis annuel jusqu\'à 5 ans.');
  assert.ok(r.conseils.includes(B.CONSEIL.irmIIF), 'au scanner : IRM possible avant le premier contrôle');
});

test('piège : une cloison LISSE de 3 mm rehaussée est IIF, pas III', () => {
  const r = B.classer(injecte({ cloisons: '1-3', cloisonsEpaisseur: '3', cloisonsRehaussees: 'oui' }));
  assert.equal(r.categorie, 'IIF');
  assert.deepEqual(r.criteres, ['Cloison lisse de 3 mm, rehaussée']);
});

test('III : paroi ou cloison rehaussée ≥ 4 mm, protrusion rehaussée ≤ 3 mm à angle obtus', () => {
  assert.equal(cat(injecte({ paroi: '>=4', paroiRehaussee: 'oui' })), 'III');
  assert.equal(cat(injecte({ cloisons: '1-3', cloisonsEpaisseur: '>=4', cloisonsRehaussees: 'oui' })), 'III');
  assert.equal(cat(injecte({ protrusion: 'obtus<=3', protrusionRehaussee: 'oui' })), 'III');
  const r = B.classer(injecte({ paroi: '>=4', paroiRehaussee: 'oui', cloisons: '1-3', cloisonsEpaisseur: '3', cloisonsRehaussees: 'oui' }));
  assert.equal(r.categorie, 'III', 'III passe avant IIF');
  assert.match(r.conduite, /^Malignité intermédiaire : chirurgie ou surveillance active selon l'âge et les comorbidités\.$/);
  assert.ok(r.conseils.includes(B.CONSEIL.biopsie));
});

test('IV : protrusion rehaussée ≥ 4 mm à angle obtus ; piège : protrusion de 2 mm à angle AIGU = IV', () => {
  assert.equal(cat(injecte({ protrusion: 'obtus>=4', protrusionRehaussee: 'oui' })), 'IV');
  const aigu = B.classer(injecte({ protrusion: 'aigu', protrusionRehaussee: 'oui' }));   // 2 mm à angle aigu : « toute taille »
  assert.equal(aigu.categorie, 'IV');
  assert.deepEqual(aigu.criteres, ['Protrusion rehaussée à angle aigu, quelle que soit sa taille']);
  assert.equal(aigu.conduite, 'Malignité jusqu\'à 90 % : avis urologique.');
  assert.equal(cat(injecte({ protrusion: 'aigu', protrusionRehaussee: 'oui', paroi: '>=4', paroiRehaussee: 'oui' })), 'IV', 'IV passe avant III');
});

test('a : hors Bosniak (masse solide, exclusions) avant toute autre règle', () => {
  const solide = B.classer(injecte({ tissu: 'oui', protrusion: 'aigu', protrusionRehaussee: 'oui' }));
  assert.deepEqual([solide.categorie, solide.hors, solide.titre], [null, 'solide', 'Hors Bosniak : masse solide']);
  const exclu = B.classer(injecte({ exclusion: 'oui', paroi: '3', paroiRehaussee: 'oui' }));
  assert.deepEqual([exclu.categorie, exclu.hors, exclu.titre], [null, 'exclusion', 'Hors Bosniak']);
});

test('rehaussement : seuil réglable (≥ 20 UH franc, 10 à 19 UH équivoque → IRM conseillée), évalué seulement avec injection', () => {
  assert.deepEqual(B.REHAUSSEMENT, { franc: 20, equivoque: 10 });
  assert.deepEqual(B.rehaussementMesure(injecte({ uhSans: '30', uhPortal: '45' })), { delta: 15, niveau: 'equivoque' });
  assert.deepEqual(B.rehaussementMesure(injecte({ uhSans: '30', uhPortal: '33', delta: '22' })), { delta: 22, niveau: 'franc' }, 'delta saisi prioritaire');
  const eq = B.classer(injecte({ uhSans: '30', uhPortal: '45' }));
  assert.equal(eq.categorie, null, 'équivoque : pas de classement « sans rehaussement »');
  assert.match(eq.conseils.join(' '), /Rehaussement équivoque : IRM conseillée/);
  const franc = B.classer(injecte({ uhSans: '10', uhPortal: '35' }));
  assert.equal(franc.categorie, null);
  assert.match(franc.criteres[0], /penser à une masse solide/);
  // Constante modifiable : un seuil franc à 15 UH change le niveau
  B.REHAUSSEMENT.franc = 15;
  try { assert.equal(B.rehaussementMesure(injecte({ uhSans: '30', uhPortal: '45' })).niveau, 'franc'); } finally { B.REHAUSSEMENT.franc = 20; }
  // Sans injection : « rehaussée » ne compte pas, et une paroi épaisse ne peut pas être classée
  const sansInj = B.classer({ modalite: 'tdm', injection: 'non', paroi: '3', paroiRehaussee: 'oui', uhSans: '12' });
  assert.equal(sansInj.categorie, null);
  assert.match(sansInj.criteres[0], /Sans injection.*compléter par un scanner ou une IRM avec injection/);
});

test('classement impossible : ce qu\'il manque est indiqué ; conduites des 5 catégories', () => {
  assert.match(B.classer(injecte({})).criteres[0], /Renseigner la densité/);
  assert.match(B.classer({ modalite: 'irm', injection: 'oui' }).criteres[0], /Préciser le signal/);
  assert.deepEqual(Object.keys(B.CONDUITE), ['I', 'II', 'IIF', 'III', 'IV']);
  assert.equal(B.CONDUITE.II, 'Bénin : pas de suivi.');
});

test('page /outils/bosniak : référencement, avertissement et source, schémas, fichiers, lien depuis les comptes rendus', () => {
  const fs = require('fs'), path = require('path');
  const RACINE = path.join(__dirname, '..');
  const html = fs.readFileSync(path.join(RACINE, 'outils/bosniak.html'), 'utf8');
  assert.match(html, /<title>Classification de Bosniak[^<]+<\/title>/);
  assert.match(html, /<meta name="description" content="[^"]{80,}">/);
  assert.match(html, /class="bk-avert"[\s\S]*Outil d'enseignement[\s\S]*ne remplace pas l'analyse radiologique[\s\S]*Silverman SG et al\.[\s\S]*doi\.org\/10\.1148\/radiol\.2019182646/);
  assert.match(html, /<a href="\.\.\/comptes-rendus\.html" class="is-current">Comptes rendus<\/a>/, 'rattachée à la section Comptes rendus, comme OsteoGamme');
  for (const [, lien] of html.matchAll(/(?:src|href)="([^"#?:]+\.(?:js|css|svg|png))(?:\?v=\d+)?"/g)) {
    assert.ok(fs.existsSync(path.join(RACINE, 'outils', lien)), `${lien} introuvable`);
  }
  assert.ok(html.indexOf('bosniak-rules.js') < html.indexOf('bosniak.js?'), 'règles chargées avant la page');
  const S = require('../outils/bosniak-schemas.js');
  assert.deepEqual(Object.keys(S.SVG), ['I', 'II', 'IIF', 'III', 'IV']);
  for (const [c, svg] of Object.entries(S.SVG)) {
    assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="[\d. ]+" role="img">[\s\S]*<\/svg>$/, c);
    assert.ok(svg.includes(S.COULEURS[c]), `${c} : tracé de la couleur de la catégorie`);
    assert.doesNotMatch(svg, /<image|data:image/, `${c} : pas d'image de scanner`);
  }
  assert.match(fs.readFileSync(path.join(RACINE, 'comptes-rendus.html'), 'utf8'), /<a class="cr-tool-chip cr-tool-link" href="outils\/bosniak">Bosniak<small>/);
});
