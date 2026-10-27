/* Tests de l'intégration PI-RADS v2.1 dans le compte rendu type « IRM prostatique
   multiparamétrique » (regles/pirads-cr.js, cr-data.js : irm-prostate-multiparametrique).
   Lancer : npm test   (ou : node --test tests/pirads-cr.test.js) */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const P = require('../regles/pirads-cr.js');

const RACINE = path.join(__dirname, '..');
const ctx = {};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(RACINE, 'cr-data.js'), 'utf8') + ';this.T = CR_TEMPLATES;', ctx);
const MODELE = ctx.T.find(t => t.id === 'irm-prostate-multiparametrique').text;

const L1 = { n: 1, categorie: 4, zone: 'périphérique', secteurs: 'zone périphérique postérolatérale droite (base, tiers moyen)', codes: ['PZpl'], cote: 'droit', etages: ['basal', 'moyen'], taille: '12', dwi: 4, dce: 'pos', epe: 'non' };
const L2 = { n: 2, categorie: 3, zone: 'transitionnelle', secteurs: 'zone de transition antérieure gauche (apex)', codes: ['TZa'], cote: 'gauche', etages: ['apical'], taille: '8', dwi: 3, dce: 'neg', epe: 'non' };
const R1 = { psa: 8.4, dim: [45, 35, 40], volume: 33, densite: 0.26, lesions: [L1] };

test('une lésion : chaque donnée à sa ligne, puis la conclusion', () => {
  const t = P.integrer(MODELE, R1).texte;
  assert.match(t, /Élévation du PSA à 8,4 ng\/mL\./);
  assert.match(t, /• Prostate mesurant 45 × 35 × 40 mm, soit un volume estimé à 33 cm³\./);
  assert.match(t, /• Densité du PSA estimée à 0,26 ng\/mL\/cm³\./);
  // zone périphérique : renvoi à la lésion ; zone transitionnelle inchangée
  assert.match(t, /Zone périphérique \(ZP\) :\n\n• Signal de fond[^\n]*\n• Lésion cible n° 1 \(voir ci-dessous\)\./);
  assert.ok(t.includes('• [Absence de lésion lenticulaire, mal limitée'));
  assert.match(t, /• Localisation : zone périphérique, secteur PZpl, droit, aux étages basal et moyen\./);
  assert.match(t, /• Dimensions : \[X × X\] mm, grand axe de 12 mm\./);
  assert.match(t, /• Diffusion : restriction marquée, avec hypersignal/);
  assert.match(t, /• Perfusion : rehaussement focal précoce concordant avec l’anomalie\./);
  assert.match(t, /• Classification : PI-RADS v2\.1 4\/5\./);
  assert.ok(t.includes('• Morphologie : lésion [nodulaire / lenticulaire / irrégulière]'), 'ce que l\'outil ne connaît pas reste à choisir');
  const c = t.slice(t.indexOf('CONCLUSION :'));
  assert.match(c, /• Prostate de volume estimé à 33 cm³, avec une densité du PSA à 0,26 ng\/mL\/cm³\./);
  assert.match(c, /• Lésion cible prostatique de 12 mm, située au niveau de la zone périphérique postérolatérale droite \(base, tiers moyen\), classée PI-RADS v2\.1 4\/5\./);
  assert.match(c, /• Absence de signe d’extension extraprostatique\./);
  assert.ok(!c.includes('[Absence de lésion prostatique suspecte'));
});

test('deux lésions : bloc ajouté pour la lésion 2, une ligne de conclusion par lésion', () => {
  const t = P.integrer(MODELE, { ...R1, lesions: [L1, { ...L2, epe: 'oui' }] }).texte;
  const sec = t.slice(t.indexOf('3. Lésion cible prostatique'), t.indexOf('4. Bilan'));
  assert.match(sec, /Lésion cible n° 2 :\n\n• Localisation : zone transitionnelle, secteur TZa, gauche, à l’étage apical\./);
  assert.match(sec, /• Diffusion : restriction modérée/);
  assert.match(sec, /• Perfusion : absence de rehaussement focal précoce\./);
  assert.ok(sec.indexOf('Lésion cible n° 2') < sec.indexOf('[Reprendre'), 'avant la consigne du modèle');
  assert.match(t, /Zone transitionnelle \(ZT\) :\n\n• [^\n]*\n• Lésion cible n° 2 \(voir ci-dessous\)\./);
  const c = t.slice(t.indexOf('CONCLUSION :'));
  assert.match(c, /• Lésion cible prostatique n° 1 de 12 mm[^\n]*4\/5\.\n• Lésion cible prostatique n° 2 de 8 mm[^\n]*3\/5\./);
  assert.match(c, /• Signes d’extension extraprostatique au niveau \[X\], score EPE \[X\]\./);
});

test('réinsertion : mêmes lignes remplacées, sans doublon ; retour à l\'absence', () => {
  const une = P.integrer(MODELE, R1).texte;
  assert.equal(P.integrer(une, R1).texte, une, 'idempotent');
  const deux = P.integrer(une, { ...R1, lesions: [{ ...L1, categorie: 5, taille: '16' }] }).texte;
  assert.equal((deux.match(/Lésion cible prostatique/g) || []).length, 2, 'rubrique 3 + une ligne de conclusion');
  assert.match(deux, /classée PI-RADS v2\.1 5\/5\./);
  assert.match(deux, /grand axe de 16 mm/);
  const aucune = P.integrer(deux, { ...R1, lesions: [] }).texte;
  assert.match(aucune, /• \[Absence de foyer individualisable/);
  assert.match(aucune.slice(aucune.indexOf('CONCLUSION :')), /• Absence de lésion prostatique suspecte\./);
});

test('valeurs manquantes : champs gardés ; autre compte rendu : pas d\'intégration', () => {
  const t = P.integrer(MODELE, { psa: null, dim: null, volume: null, densite: null, lesions: [{ ...L1, categorie: null, taille: '', codes: [], cote: '', etages: [], secteurs: '', dwi: 0, dce: '' }] }).texte;
  assert.match(t, /Élévation du PSA à \[X\] ng\/mL\./);
  assert.match(t, /• Localisation : zone périphérique, secteur \[X\], \[droit \/ gauche\], à l’étage \[basal \/ moyen \/ apical\]\./);
  assert.match(t, /PI-RADS v2\.1 \[X\/5\]\./);
  assert.equal(P.integrer('IRM PELVIENNE\n\nRÉSULTATS :\n• RAS', R1), null);
  // le modèle seul reste identique à cr-data.js
  assert.ok(P.estModele(MODELE));
});

test('pages : script chargé avant cr-tools.js', () => {
  const html = fs.readFileSync(path.join(RACINE, 'comptes-rendus.html'), 'utf8');
  const a = html.indexOf('regles/pirads-cr.js?v='), b = html.indexOf('cr-tools.js?v=');
  assert.ok(a > 0 && a < b);
});
