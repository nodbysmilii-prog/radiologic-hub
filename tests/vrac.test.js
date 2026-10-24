/* « Écrire en vrac » (regles/vrac.js) : constatations en vrac → compte rendu rédigé à partir d'un compte rendu type.
   Cas fictifs, aucune donnée patient. Lancer : npm test (ou node --test tests/vrac.test.js) */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const V = require('../regles/vrac.js');

const CR = fs.readFileSync(path.join(__dirname, '..', 'cr-data.js'), 'utf8');
const modele = id => CR.slice(CR.indexOf(`id: '${id}'`)).match(/text: `([\s\S]*?)`/)[1];
const IDS = [...CR.matchAll(/^ {4}id: '([^']+)'/gm)].map(m => m[1]);

test('mise en forme : abréviations, unités, « du lobe », « de 8 mm », traits d\'union', () => {
  assert.equal(V.phrase('nodule LID 8mm'), 'Nodule du lobe inférieur droit de 8 mm.');
  assert.equal(V.phrase('ADP sous carinaire 12mm'), 'Adénopathie sous-carinaire de 12 mm.');
  assert.equal(V.phrase('ADP médiastinales multiples'), 'Adénopathies médiastinales multiples.');
  assert.equal(V.phrase('masse 3x4cm du LSG'), 'Masse de 3 x 4 cm du lobe supérieur gauche.');
  assert.equal(V.phrase('nodule de 2.5 cm'), 'Nodule de 2,5 cm.');
  assert.equal(V.phrase('nodule mesurant 6 mm'), 'Nodule mesurant 6 mm.');
  assert.equal(V.phrase('passé de 8 à 12 mm'), 'Passé de 8 à 12 mm.');
  assert.equal(V.phrase('  stéatose hépatique ;  '), 'Stéatose hépatique.');
});

test('organe reconnu, avec les pièges', () => {
  const o = t => V.organes(V.phrase(t))[0];
  assert.equal(o('nodule hépatique segment VI'), 'foie');
  assert.equal(o('nodule LID'), 'poumon');
  assert.equal(o('lithiase vésiculaire'), 'vesicule');
  assert.equal(o('lithiase rénale gauche'), 'calculs-urinaires');
  assert.equal(o('hydronéphrose droite'), 'cavites-urinaires');
  assert.equal(o('nodule surrénalien gauche'), 'surrenales');
  assert.equal(o('anévrisme de l\'aorte abdominale sous rénale'), 'vaisseaux-abdo');
  assert.equal(o('sinusite frontale'), 'sinus-face');
  assert.equal(o('hypersignaux périventriculaires'), 'cerveau');
  assert.equal(o('dilatation des voies biliaires intra-hépatiques'), 'voies-biliaires');
  assert.equal(o('thrombose porte'), 'vaisseaux-foie');
  assert.equal(o('kyste ovarien droit'), 'pelvis');
  assert.equal(o('hernie hiatale'), 'tube-digestif');
  assert.equal(o('ADP sous carinaire (7)'), 'ganglions-mediastin');
  assert.equal(V.niveau('hernie discale l5 s1'), 'L5-S1');
});

test('sans constatation : le modèle est inchangé (les 42 comptes rendus types)', () => {
  assert.ok(IDS.length >= 40);
  for (const id of IDS) {
    const t = modele(id);
    assert.equal(V.generer(t, '').texte, t, id);
    assert.ok(V.generer(t, 'nodule de 8 mm').texte.includes('Nodule de 8 mm.'), `${id} : rien n'est perdu`);
  }
});

test('TDM TAP : chaque constatation à la place de la phrase normale, indication, conclusion', () => {
  const r = V.generer(modele('tdm-tap'), 'indication : bilan d\'extension\nnodule LID 8mm\nstéatose hépatique\nkyste rénal gauche simple 2cm ; lithiase vésiculaire\nhernie hiatale');
  const t = r.texte;
  assert.match(t, /RENSEIGNEMENTS CLINIQUES :\nBilan d'extension\./);
  assert.match(t, /• Les bronches souches[^\n]*\n• Nodule du lobe inférieur droit de 8 mm\.\n• Absence d'épanchement pleural\./);
  assert.ok(!t.includes('Absence de nodule parenchymateux suspect'));
  assert.match(t, /II\/ Étage abdomino-pelvien :\n• Stéatose hépatique\.\n• Tronc porte/);
  assert.match(t, /• Lithiase vésiculaire\.\n• Le pancréas/);
  assert.match(t, /• Kyste rénal gauche simple de 2 cm\.\n• Absence de dilatation des cavités pyélo-calicielles/);
  assert.match(t, /Par ailleurs :\n• Hernie hiatale\.\n\nAU TOTAL :/);
  assert.ok(!t.includes('sans anomalie décelable'));
  assert.match(t, /AU TOTAL :\n• Nodule du lobe inférieur droit de 8 mm\.\n• Stéatose hépatique\.\n• Lithiase vésiculaire\.\n• Kyste rénal gauche simple de 2 cm\.\n• Hernie hiatale\.$/, 'conclusion dans l\'ordre du compte rendu');
  assert.equal(r.bilan.filter(b => !b.remplace).length, 1);
});

test('conclusion écrite par le radiologue, plusieurs constatations d\'un même organe, étage vertébral', () => {
  const r = V.generer(modele('tdm-thorax'), 'emphysème centrolobulaire\nnodule LSG de 6 mm\nconclusion : emphysème ; nodule pulmonaire de 6 mm à surveiller');
  assert.match(r.texte, /• Emphysème centrolobulaire\.\n• Nodule du lobe supérieur gauche de 6 mm\.\n• Absence d'épanchement pleural\./);
  assert.match(r.texte, /CONCLUSION :\n• Emphysème\.\n• Nodule pulmonaire de 6 mm à surveiller\.$/);
  const irm = V.generer(modele('irm-cerebro-medullaire'), 'hernie discale C5-C6 postéro-latérale droite').texte;
  assert.match(irm, /C5-C6 :\n• Hernie discale C5-C6 postéro-latérale droite\.\n/);
  assert.match(irm, /C2-C3 :\n• Absence de saillie discale\./, 'les autres étages restent normaux');
});

test('échographie abdominale et TDM cérébrale', () => {
  const e = V.generer(modele('echo-abdo-pelvienne'), 'hydronéphrose droite modérée\nlithiase rénale gauche de 6 mm\nkyste ovarien droit de 3 cm').texte;
  assert.match(e, /• Lithiase rénale gauche de 6 mm\.\n• Hydronéphrose droite modérée\./);
  assert.match(e, /• Kyste ovarien droit de 3 cm\.\n• Absence d'épanchement intra-abdominal\./);
  const c = V.generer(modele('tdm-cerebrale'), 'déviation de la ligne médiane de 5 mm\nfracture de l\'os temporal gauche').texte;
  assert.match(c, /• Déviation de la ligne médiane de 5 mm\.\n• Absence d'hydrocéphalie\./);
  assert.match(c, /Étude osseuse :\n• Fracture de l'os temporal gauche\./);
});

test('page Comptes rendus : volet « Écrire en vrac » et scripts versionnés', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'comptes-rendus.html'), 'utf8');
  assert.match(html, /id="cr-vrac-panneau"/);
  assert.match(html, /id="vrac-modele"/);
  assert.match(html, /id="vrac-texte"/);
  assert.match(html, /regles\/vrac\.js\?v=\d+/);
  assert.match(html, /cr-vrac\.js\?v=\d+/);
  assert.ok(html.indexOf('regles/vrac.js') < html.indexOf('cr-vrac.js') && html.indexOf('cr.js?v') < html.indexOf('cr-vrac.js'));
});
