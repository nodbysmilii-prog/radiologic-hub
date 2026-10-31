/* Tests de la fiche « Masses hépatiques solides » (fiches/masses-hepatiques.html)
   et des règles (regles/masses-hepatiques.js).
   Lancer : npm test   (ou : node --test tests/masses-hepatiques.test.js) */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const R = require('../regles/masses-hepatiques.js');
const RACINE = path.join(__dirname, '..');
const HTML = fs.readFileSync(path.join(RACINE, 'fiches', 'masses-hepatiques.html'), 'utf8');

/* Référence ACR CT/MRI LI-RADS v2018 (logique validée par l'auteur le 31/10/2026), écrite à part
   des règles : [HRPA non périphérique ?, taille représentative] → catégorie pour chaque combinaison
   de critères majeurs. Clés : A = aucun, C = capsule seule, W = wash-out seul, G = croissance seule,
   CW, CG, WG, CWG = deux critères ou plus. */
const REF = {
  'sans <20':  { A: 'LR-3', C: 'LR-3', W: 'LR-3', G: 'LR-3', CW: 'LR-4', CG: 'LR-4', WG: 'LR-4', CWG: 'LR-4' },
  'sans >=20': { A: 'LR-3', C: 'LR-4', W: 'LR-4', G: 'LR-4', CW: 'LR-4', CG: 'LR-4', WG: 'LR-4', CWG: 'LR-4' },
  'hrpa <10':  { A: 'LR-3', C: 'LR-4', W: 'LR-4', G: 'LR-4', CW: 'LR-4', CG: 'LR-4', WG: 'LR-4', CWG: 'LR-4' },
  'hrpa 10-19': { A: 'LR-3', C: 'LR-4', W: 'LR-5', G: 'LR-5', CW: 'LR-5', CG: 'LR-5', WG: 'LR-5', CWG: 'LR-5' },
  'hrpa >=20': { A: 'LR-4', C: 'LR-5', W: 'LR-5', G: 'LR-5', CW: 'LR-5', CG: 'LR-5', WG: 'LR-5', CWG: 'LR-5' },
};
const TAILLES = { 'sans <20': [1, 9, 15, 19.9], 'sans >=20': [20, 25, 80], 'hrpa <10': [1, 5, 9.9], 'hrpa 10-19': [10, 15, 19.9], 'hrpa >=20': [20, 25, 80] };
const ID = { C: 'capsule', W: 'washout', G: 'croissance' };
const critères = k => [...k].map(c => ID[c]);

test('LI-RADS ACR v2018 : les 5 colonnes × 8 combinaisons de critères majeurs × plusieurs tailles', () => {
  let n = 0;
  for (const [col, lignes] of Object.entries(REF)) {
    for (const taille of TAILLES[col]) {
      for (const [cle, attendu] of Object.entries(lignes)) {
        const r = R.lirads(taille, col.startsWith('hrpa'), cle === 'A' ? [] : critères(cle));
        assert.equal(r.categorie, attendu, `${col}, ${taille} mm, critères ${cle}`);
        n++;
      }
    }
  }
  assert.equal(n, 8 * (4 + 3 + 3 + 3 + 3));
});

test('LI-RADS : règles énoncées par l\'auteur (10-19 mm et ≥ 20 mm avec HRPA non périphérique)', () => {
  const L = (t, c) => R.lirads(t, true, c).categorie;
  assert.equal(L(15, ['capsule']), 'LR-4');                       // capsule rehaussée seule
  assert.equal(L(15, ['washout']), 'LR-5');                       // wash-out non périphérique
  assert.equal(L(15, ['croissance']), 'LR-5');                    // croissance seuil
  assert.equal(L(15, ['capsule', 'washout']), 'LR-5');            // deux critères ou plus
  assert.equal(L(15, ['capsule', 'washout', 'croissance']), 'LR-5');
  assert.equal(L(25, []), 'LR-4');                                // HRPA seule
  assert.equal(L(25, ['capsule']), 'LR-5');                       // au moins un critère majeur
  assert.equal(L(25, ['washout']), 'LR-5');
  assert.equal(L(25, ['croissance']), 'LR-5');
});

test('LI-RADS : bornes de taille, ligne du tableau, entrées invalides', () => {
  assert.equal(R.lirads(19, false, []).colonne, '<20');
  assert.equal(R.lirads(20, false, []).colonne, '>=20');
  assert.equal(R.lirads(9, true, []).colonne, '<10');
  assert.equal(R.lirads(10, true, []).colonne, '10-19');
  assert.equal(R.lirads(19, true, []).colonne, '10-19');
  assert.equal(R.lirads(20, true, []).colonne, '>=20');
  // ligne du tableau : 0 aucun, 1 capsule seule, 2 wash-out ou croissance seul, 3 deux critères ou plus
  assert.equal(R.lirads(15, true, []).ligne, 0);
  assert.equal(R.lirads(15, true, ['capsule']).ligne, 1);
  assert.equal(R.lirads(15, true, ['washout']).ligne, 2);
  assert.equal(R.lirads(15, true, ['croissance']).ligne, 2);
  assert.equal(R.lirads(15, true, ['capsule', 'croissance']).ligne, 3);
  // critères inconnus et doublons ignorés ; taille absente, nulle ou négative ; virgule décimale
  assert.equal(R.lirads(25, true, ['capsule', 'capsule', 'bidon']).criteresMajeurs, 1);
  assert.equal(R.lirads('', true, []), null);
  assert.equal(R.lirads(0, false, []), null);
  assert.equal(R.lirads(-3, true, []), null);
  assert.equal(R.lirads('2,5', false, []).colonne, '<20');
  // plus aucune case ambiguë (l'ancienne « LR-4 à LR-5* » n'existe plus)
  for (const g of Object.values(R.TABLE_LIRADS)) for (const col of Object.values(g)) col.forEach(c => assert.match(c, /^LR-[345]$/));
});

test('LI-RADS : le tableau affiché dans la fiche est identique aux règles', () => {
  const cellules = [...HTML.matchAll(/<td class="mh-lr-(\d)" data-h="(sans|hrpa)" data-col="([^"]*)" data-l="(\d)">([^<]*)<\/td>/g)];
  assert.equal(cellules.length, 5 * 4);
  for (const [, classe, h, col, l, texte] of cellules) {
    const colonne = col.replace('&lt;', '<').replace('&gt;', '>');
    const attendu = R.TABLE_LIRADS[h][colonne][+l];
    assert.equal(texte, attendu, `${h} ${colonne} ligne ${l}`);
    assert.equal(classe, attendu.slice(-1), `couleur de ${h} ${colonne} ligne ${l}`);
  }
  assert.doesNotMatch(HTML, /LR-4 à LR-5|sinon LR-4/);
});

test('LI-RADS : diagnostic non invasif de CHC = LR-5, formulation cohérente avec le tableau', () => {
  const L = (t, c) => R.lirads(t, true, c).categorie;
  // 10-19 mm : wash-out ou croissance seuil → LR-5 ; la capsule seule → LR-4
  assert.equal(L(10, ['washout']), 'LR-5'); assert.equal(L(19, ['croissance']), 'LR-5'); assert.equal(L(15, ['capsule']), 'LR-4');
  // ≥ 20 mm : au moins un autre critère majeur → LR-5 ; HRPA seule → LR-4
  for (const c of ['capsule', 'washout', 'croissance']) assert.equal(L(20, [c]), 'LR-5');
  assert.equal(L(20, []), 'LR-4');
  // < 10 mm : jamais LR-5 ; sans HRPA : jamais LR-5
  assert.ok(['LR-3', 'LR-4'].includes(L(9, ['capsule', 'washout', 'croissance'])));
  assert.equal(R.lirads(40, false, ['capsule', 'washout', 'croissance']).categorie, 'LR-4');
  // la phrase de la fiche énonce ces conditions, plus l'ancienne formule imprécise
  assert.match(HTML, /Diagnostic non invasif de CHC = LR-5<\/mark> \(contexte à risque validé, lésion ≥ 10 mm avec HRPA non périphérique\)/);
  assert.match(HTML, /de 10 à 19 mm, <mark class="k-sign">wash-out non périphérique ou croissance seuil<\/mark> \(la capsule seule donne LR-4\)/);
  assert.match(HTML, /à partir de 20 mm, <mark class="k-sign">au moins un autre critère majeur<\/mark>/);
  assert.doesNotMatch(HTML, /lésion &gt; 1 cm \+ hypervascularisation/);
});

test('LI-RADS : conditions d\'application et critères de croissance seuil', () => {
  assert.equal(R.CONDITIONS, 'S\'applique aux patients cirrhotiques ou à risque de CHC, en TDM/IRM injectée ; ne s\'applique pas au foie sain.');
  assert.ok(HTML.includes(R.CONDITIONS.replace(' ; ne s\'applique pas au foie sain.', '')), 'la fiche rappelle la population concernée');
  assert.match(HTML, /ne s'applique pas au foie sain/);
  assert.match(HTML, /TDM\/IRM injectée/);
  // la croissance seuil est un critère majeur à part entière, comme le wash-out et la capsule
  assert.deepEqual(R.CRITERES_MAJEURS.map(c => c.id), ['capsule', 'washout', 'croissance']);
  // croissance seuil LI-RADS v2018 : augmentation de taille ≥ 50 % en ≤ 6 mois, et rien d'autre
  assert.match(HTML, /<li><b>Croissance seuil \(LI-RADS v2018\) :<\/b> <mark class="k-key">augmentation de taille ≥ 50 % en ≤ 6 mois<\/mark>\.<\/li>/);
  assert.match(HTML, /data-crit="croissance"> Croissance seuil \(≥ 50 % en ≤ 6 mois\)<\/label>/);
  // les anciens critères v2017 ne sont plus présentés comme croissance seuil
  assert.doesNotMatch(HTML, /≥ 100 %|nouvelle lésion ≥ 10 mm|intervalle &gt; 6 mois|intervalle > 6 mois|Croissance significative|seuil de progression/);
  const { DEFS } = require('../regles/classifications.js');
  const editeur = DEFS.find(d => d.id === 'lirads');
  const champ = editeur.champs(editeur.init()).find(c => c.f === 'croissance');
  assert.equal(R.CRITERES_MAJEURS[2].label, champ.label, 'même libellé dans la fiche et dans l\'éditeur');
});

test('LI-RADS : la fiche et l\'éditeur de comptes rendus donnent la même catégorie dans tous les cas', () => {
  const { DEFS } = require('../regles/classifications.js');
  const editeur = DEFS.find(d => d.id === 'lirads');
  const tailles = [0.5, 1, 5, 9, 9.9, 10, 12, 15, 19, 19.9, 20, 25, 40, 100];
  let n = 0;
  for (const hrpa of [false, true]) {
    for (const t of tailles) {
      for (let masque = 0; masque < 8; masque++) {
        const crit = ['capsule', 'washout', 'croissance'].filter((_, i) => masque & (1 << i));
        const st = { ...editeur.init(), aphe: hrpa ? 'oui' : 'non', taille: String(t), capsule: crit.includes('capsule'), washout: crit.includes('washout'), croissance: crit.includes('croissance') };
        assert.equal(R.lirads(t, hrpa, crit).categorie, editeur.calcul(st).badge, `HRPA ${hrpa}, ${t} mm, ${crit.join('+') || 'aucun critère'}`);
        n++;
      }
    }
  }
  assert.equal(n, 2 * tailles.length * 8);
});

test('LI-RADS : catégories et conduite à retenir', () => {
  assert.deepEqual(Object.keys(R.CATEGORIES_LIRADS), ['LR-NC', 'LR-1', 'LR-2', 'LR-3', 'LR-4', 'LR-5', 'LR-M', 'LR-TIV']);
  assert.equal(R.CATEGORIES_LIRADS['LR-5'].sens, 'CHC certain');
  assert.equal(R.CATEGORIES_LIRADS['LR-3'].retenir, 'TDM/IRM à 3–6 mois');
  assert.equal(R.lirads(30, true, ['washout', 'capsule']).retenir, 'Diagnostic de CHC → prise en charge');
});

test('HNF typique : cinq critères, hépatopathie sous-jacente', () => {
  assert.equal(R.CRITERES_HNF.length, 5);
  const tous = R.CRITERES_HNF.map(c => c.id);
  assert.equal(R.hnf(tous, false).cle, 'typique');
  assert.equal(R.hnf(tous.slice(0, 4), false).cle, 'non');
  assert.match(R.hnf(tous.slice(0, 4), false).texte, /suspecte d'adénome/);
  assert.equal(R.hnf([], false).titre, '');
  assert.equal(R.hnf(tous, true).cle, 'hepatopathie');
});

test('CAT hyperéchogène : cinq contextes', () => {
  assert.deepEqual(Object.keys(R.CONTEXTES), ['sain', 'steatose', 'risque', 'cancer', 'contraception']);
  Object.values(R.CONTEXTES).forEach(c => { assert.ok(c.nom && c.texte && c.niveau); });
  for (const k of Object.keys(R.CONTEXTES)) assert.match(HTML, new RegExp(`data-contexte="${k}"`), k);
});

test('Bismuth et Corlette : extension croissante', () => {
  assert.deepEqual(Object.keys(R.BISMUTH), ['I', 'II', 'IIIa', 'IIIb', 'IV']);
  assert.deepEqual(R.BISMUTH.I.atteint, ['chc']);
  assert.ok(!R.BISMUTH.II.atteint.includes('droit') && !R.BISMUTH.II.atteint.includes('gauche'));
  assert.ok(R.BISMUTH.IIIa.atteint.includes('droit') && !R.BISMUTH.IIIa.atteint.includes('gauche'));
  assert.ok(R.BISMUTH.IIIb.atteint.includes('gauche') && !R.BISMUTH.IIIb.atteint.includes('droit'));
  assert.ok(R.BISMUTH.IV.atteint.includes('droit') && R.BISMUTH.IV.atteint.includes('gauche'));
  for (const k of Object.keys(R.BISMUTH)) assert.match(HTML, new RegExp(`data-bismuth="${k}"`), k);
});

test('tableau final et entraînement : cohérents', () => {
  assert.equal(Object.keys(R.LESIONS).length, 9);
  Object.values(R.LESIONS).forEach(l => assert.ok(R.CATEGORIES[l.categorie]));
  assert.equal(R.CAS.length, 9);
  R.CAS.forEach(c => { assert.ok(R.CHOIX[c.rep], c.rep); assert.ok(c.texte && c.pourquoi); });
  // chaque lésion est demandée une fois
  assert.deepEqual(R.CAS.map(c => c.rep).sort(), Object.keys(R.LESIONS).sort());
  // chaque ligne du tableau final de la fiche existe
  for (const k of Object.keys(R.LESIONS)) assert.match(HTML, new RegExp(`data-lesion="${k}"`), k);
});

test('fiche : sections, code couleur, carte de l\'index, scripts', () => {
  for (const id of ['introduction', 'pseudolesions', 'exploration', 'benignes', 'primitives', 'secondaires', 'reconnaissance', 'cat', 'testez-vous']) {
    assert.match(HTML, new RegExp(`<section class="fsec" id="${id}"`), id);
  }
  for (const k of ['tech', 'sign', 'grave', 'ddx', 'key']) assert.match(HTML, new RegExp(`data-k="${k}"`), k);
  assert.match(HTML, /regles\/masses-hepatiques\.js\?v=/);
  assert.match(HTML, /digestif\/foie-fiche\.js\?v=/);
  assert.match(fs.readFileSync(path.join(RACINE, 'fiches-rapides.html'), 'utf8'), /<a class="fiche-card" data-spe="digestif" href="fiches\/masses-hepatiques\.html"/);
});

test('foie en 3D : modèle Z-Anatomy, 8 segments, orientation cohérente avec les descriptions', () => {
  const dossier = path.join(RACINE, 'public', 'models', 'foie');
  const M = JSON.parse(fs.readFileSync(path.join(dossier, 'foie.json'), 'utf8'));
  assert.ok(fs.statSync(path.join(dossier, 'foie.glb')).size > 50000);
  assert.ok(fs.existsSync(path.join(dossier, 'LICENSE-Z-Anatomy.txt')));
  assert.match(M.source, /Z-Anatomy \(CC BY-SA 4\.0\)/);
  const c = Object.fromEntries(M.structures.filter(s => s.segment).map(s => [s.segment, s.centre]));   // [x gauche+, y haut, z avant]
  assert.deepEqual(Object.keys(c).sort(), ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII']);
  assert.deepEqual(Object.keys(R.SEGMENTS_FOIE).sort(), Object.keys(c).sort());
  // foie droit à droite du patient (x < 0), foie gauche à gauche (x > 0)
  for (const s of ['V', 'VI', 'VII', 'VIII']) assert.ok(c[s][0] < 0, `${s} à droite`);
  for (const s of ['II', 'III']) assert.ok(c[s][0] > 0, `${s} à gauche`);
  // supérieur / inférieur et antérieur / postérieur, comme les textes de regles/masses-hepatiques.js
  assert.ok(c.VIII[1] > c.V[1] && c.VII[1] > c.VI[1], 'VII et VIII au-dessus de VI et V');
  assert.ok(c.V[2] > c.VI[2] && c.VIII[2] > c.VII[2], 'V et VIII en avant de VI et VII');
  assert.ok(c.II[1] > c.III[1] && c.III[2] > c.II[2], 'II au-dessus et en arrière de III');
  assert.ok(c.IV[0] > c.V[0] && c.IV[0] < c.III[0], 'IV entre le foie droit et III');
  assert.ok(c.I[2] < c.IV[2], 'I en arrière de IV');
  // repères de la fiche (étiquettes du pack) : lit vésiculaire à droite, fissure du ligament rond en avant
  const rep = Object.fromEntries(M.reperes.map(r => [r.id, r.position]));
  assert.ok(rep['fosse-vesicule'][0] < 0 && rep['ligament-rond'][2] > 0.2);
  for (const id of Object.keys(R.REPERES_FOIE)) assert.ok(rep[id], id);
  for (const id of ['veine-porte', 'veines-hepatiques', 'vci', 'vesicule']) assert.ok(M.structures.some(s => s.id === id), id);
});

test('foie en 3D : pseudolésions = texte de la fiche, boutons et scripts présents', () => {
  const sans = R.PATHOLOGIES_FOIE;
  assert.deepEqual(Object.keys(sans), ['steatose', 'epargne']);
  for (const [k, p] of Object.entries(sans)) {
    p.segments.forEach(s => assert.ok(R.SEGMENTS_FOIE[s], s));
    p.reperes.forEach(r => assert.ok(R.REPERES_FOIE[r], r));
    assert.match(HTML, new RegExp(`data-patho="${k}"`), k);
    assert.ok(HTML.replace(/&gt;/g, '>').includes(p.texte.replace(/\\'/g, '\'')), `texte de ${k} identique à la fiche`);
  }
  assert.equal(sans.steatose.segments.join(), 'IV'); assert.equal(sans.epargne.segments.join(), 'IV');
  for (const s of Object.keys(R.SEGMENTS_FOIE)) assert.match(HTML, new RegExp(`data-seg="${s}"`), s);
  assert.match(HTML, /<script type="importmap">/);
  assert.match(HTML, /digestif\/foie-3d-fiche\.js\?v=/);
  for (const f of ['foie-3d.js', 'foie-3d-fiche.js']) assert.ok(fs.existsSync(path.join(RACINE, 'fiches', 'digestif', f)), f);
  assert.ok(fs.existsSync(path.join(RACINE, 'scripts', 'export_foie.py')));
});

test('foie en 3D : branches portales et veines hépatiques schématiques, bien situées et signalées', () => {
  const M = JSON.parse(fs.readFileSync(path.join(RACINE, 'public', 'models', 'foie', 'foie.json'), 'utf8'));
  const par = id => M.structures.find(s => s.id === id);
  const schema = ['veine-hepatique-droite', 'veine-hepatique-moyenne', 'veine-hepatique-gauche', 'branche-portale-droite', 'branche-portale-gauche'];
  for (const id of schema) {
    const v = par(id);
    assert.ok(v, id);
    assert.equal(v.schematique, true, `${id} marqué schématique`);
    assert.match(v.nom, /\(schématique\)/, `${id} nommé « schématique »`);
  }
  // les vaisseaux du pack ne sont pas marqués schématiques
  for (const id of ['veine-porte', 'veines-hepatiques', 'vci', 'vesicule']) assert.ok(!par(id).schematique, id);
  // position : veine hépatique droite dans le foie droit, moyenne près de la fissure principale, gauche à gauche
  const x = id => par(id).centre[0];
  assert.ok(x('veine-hepatique-droite') < x('veine-hepatique-moyenne') && x('veine-hepatique-moyenne') < x('veine-hepatique-gauche'), 'ordre droite, moyenne, gauche');
  assert.ok(x('veine-hepatique-droite') < -0.3 && x('veine-hepatique-gauche') > 0.1);
  assert.ok(x('branche-portale-droite') < 0 && x('branche-portale-gauche') > 0, 'branches portales droite et gauche');
  assert.match(M.limites, /TRACÉ SCHÉMATIQUE/);
  // la page le dit, et propose de les masquer
  assert.match(HTML, /branches portales et veines hépatiques \(schématiques\)/);
  assert.match(HTML, /id="fo3d-schema"/);
  assert.match(HTML, /tracé schématique \(teintes claires\)/);
});
