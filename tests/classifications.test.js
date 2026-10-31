/* Classifications et scores des comptes rendus (regles/classifications.js) — cas fictifs.
   Lancer : npm test (ou node --test tests/classifications.test.js) */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { DEFS } = require('../regles/classifications.js');
const D = Object.fromEntries(DEFS.map(d => [d.id, d]));
const run = (id, st) => D[id].calcul({ ...D[id].init(), ...st });

test('21 outils, champs valides, vides à l\'ouverture', () => {
  const ids = ['orads-us', 'orads-irm', 'lirads', 'fisher', 'fazekas', 'scheltens', 'ao-rachis', 'kellgren', 'arco', 'hanche-mesures', 'garden', 'pauwels', 'neer', 'schatzker', 'salter', 'pancreatite', 'hinchey', 'parks', 'stjames', 'aast', 'irecist', 'washout'];
  for (const id of ids) {
    assert.ok(D[id], id);
    const st = D[id].init();
    for (const c of D[id].champs(st)) assert.ok(['sel', 'num', 'chk'].includes(c.type) && c.f && c.label, `${id} : ${c.f}`);
    if (id !== 'neer') assert.equal(D[id].calcul(st).texte, '', `${id} vide à l'ouverture`);
  }
});

test('O-RADS US v2022', () => {
  assert.equal(run('orads-us', { type: 'simple', taille: '2' }).badge, 'O-RADS US 1');
  assert.equal(run('orads-us', { type: 'simple', taille: '5' }).badge, 'O-RADS US 2');
  assert.equal(run('orads-us', { type: 'simple', taille: '2', meno: 'post' }).badge, 'O-RADS US 2');
  assert.equal(run('orads-us', { type: 'simple', taille: '11' }).badge, 'O-RADS US 3');
  assert.equal(run('orads-us', { type: 'uni-ns', taille: '2,5' }).badge, 'O-RADS US 2');
  assert.equal(run('orads-us', { type: 'uni-ns', taille: '5' }).badge, 'O-RADS US 3');
  assert.equal(run('orads-us', { type: 'classique', taille: '6' }).badge, 'O-RADS US 2');
  assert.equal(run('orads-us', { type: 'multi', taille: '6', cs: '2' }).badge, 'O-RADS US 3');
  assert.equal(run('orads-us', { type: 'multi', taille: '6', cs: '4' }).badge, 'O-RADS US 4');
  assert.equal(run('orads-us', { type: 'uni-solide', taille: '4', papilles: '1-3' }).badge, 'O-RADS US 4');
  assert.equal(run('orads-us', { type: 'uni-solide', taille: '4', papilles: '4' }).badge, 'O-RADS US 5');
  assert.equal(run('orads-us', { type: 'multi-solide', taille: '8', cs: '3' }).badge, 'O-RADS US 5');
  assert.equal(run('orads-us', { type: 'solide', taille: '4', cs: '1' }).badge, 'O-RADS US 3');
  assert.equal(run('orads-us', { type: 'solide', taille: '4', paroi: 'irreguliere', cs: '1' }).badge, 'O-RADS US 5');
  assert.equal(run('orads-us', { type: 'simple', taille: '3', ascite: true }).badge, 'O-RADS US 5');
});

test('O-RADS IRM', () => {
  assert.equal(run('orads-irm', { type: 'kyste-simple' }).badge, 'O-RADS IRM 2');
  assert.equal(run('orads-irm', { type: 't2noir' }).badge, 'O-RADS IRM 2');
  assert.equal(run('orads-irm', { type: 'multi' }).badge, 'O-RADS IRM 3');
  assert.equal(run('orads-irm', { type: 'solide', courbe: '1' }).badge, 'O-RADS IRM 3');
  assert.equal(run('orads-irm', { type: 'solide', courbe: '2' }).badge, 'O-RADS IRM 4');
  assert.equal(run('orads-irm', { type: 'solide', courbe: '3' }).badge, 'O-RADS IRM 5');
  assert.equal(run('orads-irm', { type: 'kyste-simple', implants: true }).badge, 'O-RADS IRM 5');
});

test('LI-RADS v2018 : tableau des critères majeurs', () => {
  const L = (aphe, taille, x = {}) => run('lirads', { aphe, taille: String(taille), ...x }).badge;
  assert.equal(L('non', 15), 'LR-3'); assert.equal(L('non', 15, { washout: true }), 'LR-3'); assert.equal(L('non', 15, { washout: true, capsule: true }), 'LR-4');
  assert.equal(L('non', 25), 'LR-3'); assert.equal(L('non', 25, { capsule: true }), 'LR-4');
  assert.equal(L('oui', 8), 'LR-3'); assert.equal(L('oui', 8, { washout: true }), 'LR-4'); assert.equal(L('oui', 8, { washout: true, capsule: true }), 'LR-4');
  assert.equal(L('oui', 15), 'LR-3'); assert.equal(L('oui', 15, { capsule: true }), 'LR-4'); assert.equal(L('oui', 15, { washout: true }), 'LR-5'); assert.equal(L('oui', 15, { croissance: true }), 'LR-5');
  assert.equal(L('oui', 25), 'LR-4'); assert.equal(L('oui', 25, { capsule: true }), 'LR-5');
  assert.equal(L('oui', 15, { capsule: true, accessoire: 'plus' }), 'LR-4', 'les critères accessoires ne font pas passer en LR-5');
  assert.equal(L('oui', 25, { washout: true, accessoire: 'moins' }), 'LR-4');
  assert.equal(run('lirads', { directe: 'M' }).badge, 'LR-M');
});

/* LI-RADS CT/MRI v2018 : référence validée par l'auteur le 31/10/2026, écrite à part du code.
   Clés : A = aucun critère majeur, C = capsule, W = wash-out non périphérique, G = croissance seuil. */
const LR_REF = {
  'sans <20':   { A: 3, C: 3, W: 3, G: 3, CW: 4, CG: 4, WG: 4, CWG: 4 },
  'sans >=20':  { A: 3, C: 4, W: 4, G: 4, CW: 4, CG: 4, WG: 4, CWG: 4 },
  'hrpa <10':   { A: 3, C: 4, W: 4, G: 4, CW: 4, CG: 4, WG: 4, CWG: 4 },
  'hrpa 10-19': { A: 3, C: 4, W: 5, G: 5, CW: 5, CG: 5, WG: 5, CWG: 5 },   // capsule seule : LR-4 ; wash-out ou croissance : LR-5
  'hrpa >=20':  { A: 4, C: 5, W: 5, G: 5, CW: 5, CG: 5, WG: 5, CWG: 5 },   // HRPA seule : LR-4 ; + au moins un critère majeur : LR-5
};
const LR_TAILLES = { 'sans <20': [1, 9, 15, 19.9], 'sans >=20': [20, 25, 80], 'hrpa <10': [1, 5, 9.9], 'hrpa 10-19': [10, 15, 19.9], 'hrpa >=20': [20, 25, 80] };

test('LI-RADS v2018 (éditeur) : toutes les combinaisons taille × HRPA × critères majeurs', () => {
  let n = 0;
  for (const [col, lignes] of Object.entries(LR_REF)) {
    for (const t of LR_TAILLES[col]) {
      for (const [cle, attendu] of Object.entries(lignes)) {
        const st = { aphe: col.startsWith('hrpa') ? 'oui' : 'non', taille: String(t), capsule: cle.includes('C'), washout: cle.includes('W'), croissance: cle.includes('G') };
        assert.equal(run('lirads', st).badge, `LR-${attendu}`, `${col}, ${t} mm, ${cle}`);
        n++;
      }
    }
  }
  assert.equal(n, 8 * 16);
});

test('LI-RADS v2018 (éditeur) : règles de l\'auteur, croissance seuil, bornes, entrées incomplètes', () => {
  const L = (aphe, taille, x = {}) => run('lirads', { aphe, taille: String(taille), ...x }).badge;
  // 10-19 mm, HRPA non périphérique
  assert.equal(L('oui', 15, { capsule: true }), 'LR-4');
  assert.equal(L('oui', 15, { washout: true }), 'LR-5');
  assert.equal(L('oui', 15, { croissance: true }), 'LR-5');
  assert.equal(L('oui', 15, { capsule: true, croissance: true }), 'LR-5');
  assert.equal(L('oui', 15, { washout: true, croissance: true, capsule: true }), 'LR-5');
  // ≥ 20 mm, HRPA non périphérique
  assert.equal(L('oui', 25), 'LR-4');
  assert.equal(L('oui', 25, { croissance: true }), 'LR-5');
  // bornes : 10 mm = tranche 10-19 ; 20 mm = tranche ≥ 20 ; 9,9 mm = tranche < 10
  assert.equal(L('oui', 9.9, { washout: true }), 'LR-4');
  assert.equal(L('oui', 10, { washout: true }), 'LR-5');
  assert.equal(L('oui', 19.9, { capsule: true }), 'LR-4');
  assert.equal(L('oui', 20, { capsule: true }), 'LR-5');
  // virgule décimale acceptée
  assert.equal(L('oui', '19,5', { capsule: true }), 'LR-4');
  // sans HRPA ou taille : aucun résultat (pas de catégorie devinée)
  assert.equal(run('lirads', { taille: '15' }).texte, '');
  assert.equal(run('lirads', { aphe: 'oui' }).texte, '');
  // catégories directes
  for (const [d, badge] of [['NC', 'LR-NC'], ['1', 'LR-1'], ['2', 'LR-2'], ['3', 'LR-3'], ['4', 'LR-4'], ['5', 'LR-5'], ['M', 'LR-M'], ['TIV', 'LR-TIV']]) assert.equal(run('lirads', { directe: d }).badge, badge);
  // les critères accessoires : jamais de passage en LR-5 par « en faveur de la malignité »
  assert.equal(L('oui', 15, { capsule: true, accessoire: 'plus' }), 'LR-4');
  assert.equal(L('non', 15, { accessoire: 'plus' }), 'LR-4');
});

test('LI-RADS v2018 (éditeur) : conditions d\'application affichées', () => {
  const d = D.lirads;
  assert.match(d.aide, /Patient à risque de CHC uniquement/);
  assert.match(d.aide, /\(wash-out non périphérique, capsule rehaussée, croissance seuil\)/);
  assert.match(d.titre, /v2018/);
  // l'éditeur ne propose cet outil que pour un contexte de foie à risque (cirrhose, CHC)
  assert.ok(d.suggere.test('cirrhose') && d.suggere.test('chc') && d.suggere.test('lirads'));
  assert.ok(!d.suggere.test('hemangiome typique sur foie sain'));
});

test('Neuro : Fisher modifié, Fazekas, Scheltens', () => {
  assert.equal(run('fisher', { g: '4' }).conclusion, 'Hémorragie sous-arachnoïdienne, Fisher modifié 4.');
  const f = run('fazekas', { pv: '2', sbp: '1' });
  assert.equal(f.conclusion, 'Leucopathie vasculaire Fazekas 1 (périventriculaire 2).');
  assert.equal(run('scheltens', { d: '2', g: '1', age: '70' }).niveau, 'haut');
  assert.equal(run('scheltens', { d: '2', g: '2', age: '80' }).niveau, 'ok', '≥ 75 ans : seuil 3');
});

test('AO Spine et score TL AOSIS', () => {
  const r = run('ao-rachis', { type: 'A3', neuro: 'N0' });
  assert.equal(r.badge, 'AO A3 N0 · TL AOSIS 3');
  assert.equal(run('ao-rachis', { type: 'B2', neuro: 'N3', m1: true }).badge, 'AO B2 N3 M1 · TL AOSIS 11');
  assert.equal(run('ao-rachis', { region: 'cerv', type: 'C', facette: 'F4', neuro: 'N4' }).badge, 'AO C F4 N4');
});

test('Articulations : Kellgren-Lawrence, ARCO, hanche', () => {
  assert.equal(run('kellgren', { g: '3' }).badge, 'KL 3');
  assert.equal(run('arco', { g: 'IIIA' }).conclusion, 'Ostéonécrose de la tête fémorale stade ARCO IIIA.');
  const h = run('hanche-mesures', { alpha: '62', lce: '18', tonnis: '14', cote: 'droite' });
  assert.equal(h.conclusion, 'Hanche droite : morphologie de type came et dysplasie acétabulaire.');
  assert.equal(run('hanche-mesures', { alpha: '48', lce: '30' }).niveau, 'ok');
  assert.match(run('hanche-mesures', { lce: '42' }).conclusion, /surcouverture/);
});

test('Traumatologie : Garden, Pauwels, Neer, Schatzker, Salter-Harris', () => {
  assert.equal(run('garden', { g: 'III' }).conclusion, 'Fracture du col fémoral Garden III (déplacée).');
  assert.equal(run('pauwels', { angle: '25' }).badge, 'Pauwels I');
  assert.equal(run('pauwels', { angle: '40' }).badge, 'Pauwels II');
  assert.equal(run('pauwels', { angle: '60' }).badge, 'Pauwels III');
  assert.equal(run('neer', {}).badge, 'Neer 1 part');
  assert.equal(run('neer', { diaphyse: true }).badge, 'Neer 2 parts');
  assert.equal(run('neer', { diaphyse: true, gt: true }).badge, 'Neer 3 parts');
  assert.equal(run('neer', { diaphyse: true, gt: true, pt: true, luxation: true }).badge, 'Neer 4 parts + fracture-luxation');
  assert.equal(run('schatzker', { g: 'II' }).badge, 'Schatzker II');
  assert.equal(run('salter', { g: 'IV' }).badge, 'Salter-Harris IV');
});

test('Pancréatite : CTSI et CTSI modifié', () => {
  const r = run('pancreatite', { grade: 'E', necrose: '50', extra: true });
  assert.equal(r.badge, 'Balthazar E · CTSI 8/10 · CTSI mod. 10/10');
  assert.equal(run('pancreatite', { grade: 'C', necrose: '0' }).badge, 'Balthazar C · CTSI 2/10 · CTSI mod. 2/10');
  assert.equal(run('pancreatite', { grade: 'D', necrose: '30' }).conclusion, 'Pancréatite aiguë Balthazar D, CTSI modifié 6/10 (forme modérée).');
});

test('Hinchey, Parks, St James\'s', () => {
  assert.equal(run('hinchey', { g: 'Ib' }).conclusion, 'Diverticulite sigmoïdienne Hinchey Ib (abcès péricolique ou mésocolique).');
  assert.equal(run('parks', { g: 'trans' }).conclusion, 'Fistule anale transsphinctérienne (Parks).');
  assert.equal(run('stjames', { g: '4' }).badge, 'St James\'s grade 4');
});

test('AAST 2018 : grade de la lésion la plus grave, lésions multiples', () => {
  const R = require('../regles/classifications.js').AAST;
  const i = (org, txt) => R[org].criteres.findIndex(c => c[1].startsWith(txt));
  assert.equal(run('aast', { organe: 'rate', c: { [i('rate', 'Lacération 1–3 cm')]: true } }).badge, 'AAST rate grade II');
  assert.equal(run('aast', { organe: 'rate', c: { [i('rate', 'Lacération 1–3 cm')]: true }, multiples: true }).badge, 'AAST rate grade III');
  assert.equal(run('aast', { organe: 'rate', c: { [i('rate', 'Lacération > 3 cm')]: true }, multiples: true }).badge, 'AAST rate grade III', 'pas au-delà de III');
  assert.equal(run('aast', { organe: 'foie', c: { [i('foie', 'Saignement actif s\'étendant')]: true } }).badge, 'AAST foie grade IV');
  assert.equal(run('aast', { organe: 'rein', c: { [i('rein', 'Lacération atteignant les cavités')]: true } }).conclusion, 'Traumatisme rénal grade IV de l\'AAST.');
  assert.equal(run('aast', { organe: 'pancreas', c: { [i('pancreas', 'Section distale')]: true } }).badge, 'AAST pancréas grade III');
});

test('iRECIST', () => {
  assert.equal(run('irecist', { recist: 'PD' }).badge, 'iUPD');
  assert.equal(run('irecist', { recist: 'PR' }).badge, 'iPR');
  assert.equal(run('irecist', { precedent: 'oui', cible5: true }).badge, 'iCPD');
  assert.equal(run('irecist', { precedent: 'oui', nouvelles: true }).badge, 'iCPD');
  assert.equal(run('irecist', { precedent: 'oui' }).badge, 'iUPD');
  assert.equal(run('irecist', { precedent: 'oui', persiste: 'non', recist: 'SD' }).badge, 'iSD');
});

test('Wash-out surrénalien', () => {
  assert.equal(run('washout', { sp: '8' }).badge, '8 UH : adénome');
  const r = run('washout', { sp: '30', portal: '90', tardif: '45', taille: '18' });
  assert.match(r.texte, /wash-out absolu 75 %, wash-out relatif 50 %/);
  assert.equal(r.badge, 'Wash-out : adénome');
  assert.equal(run('washout', { sp: '35', portal: '80', tardif: '70' }).badge, 'Wash-out insuffisant');
  assert.equal(run('washout', { portal: '100', tardif: '55' }).badge, 'Wash-out : adénome', 'relatif seul ≥ 40 %');
});

test('page Comptes rendus : script chargé avant cr-tools.js, outils classés', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'comptes-rendus.html'), 'utf8');
  assert.match(html, /regles\/classifications\.js\?v=\d+/);
  assert.ok(html.indexOf('regles/classifications.js') < html.indexOf('cr-tools.js?v'));
  const js = fs.readFileSync(path.join(__dirname, '..', 'cr-tools.js'), 'utf8');
  for (const id of DEFS.map(d => d.id)) assert.ok(js.includes(`'${id}'`), `${id} classé dans un groupe`);
});
