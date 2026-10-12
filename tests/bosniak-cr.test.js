/* Tests de l'aide à l'écriture Bosniak dans les comptes rendus (regles/bosniak-cr.js) :
   description, conclusion (catégorie + conduite à tenir), intégration dans les comptes rendus
   types de cr-data.js (ligne des reins, rubrique RÉSULTATS, AU TOTAL), réinsertion.
   Lancer : npm test   (ou : node --test tests/*.test.js) */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const R = require('../outils/bosniak-rules.js');
const BCR = require('../regles/bosniak-cr.js');

const RACINE = path.join(__dirname, '..');
const ctx = {};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(RACINE, 'cr-data.js'), 'utf8') + ';this.T = CR_TEMPLATES;', ctx);
const modele = id => ctx.T.find(t => t.id === id).text;
const CR = BCR.creer(R);

/* État d'outil : examen + lésions [{ cote, siege, dev, taille, e: { critères } }] ; les critères passent
   par choisir(), comme les listes du formulaire */
function etat(lesions, examen = {}) {
  const st = { ...CR.init(), ...examen };
  st.lesions = lesions.map(({ e = {}, ...l }) => {
    const L = { ...CR.nouvelleLesion(), ...l };
    for (const [k, v] of Object.entries(e)) L.e = CR.choisir(st, L, k, v);
    return L;
  });
  return st;
}
const kysteSimple = (cote = 'gauche', taille = '15') => ({ cote, taille, e: { uhSans: '5', uhPortal: '7' } });
const cloison3mm = { cote: 'droit', siege: 'sup', taille: '32', dev: 'exophytique', e: { cloisons: '1-3', cloisonsEpaisseur: '3', uhSans: '8', uhPortal: '10' } };

test('description : critères décrits, catégorie seulement dans la conclusion', () => {
  const st = etat([cloison3mm]);
  const d = CR.description(st, st.lesions[0]);
  assert.equal(d, 'Lésion kystique polaire supérieure du rein droit de 32 mm, exophytique : paroi fine (≤ 2 mm), 1 à 3 cloisons lisses de 3 mm, rehaussées, sans protrusion ni calcification ; contenu liquidien mesuré à 8 UH sans injection et à 10 UH au temps portal (rehaussement de 2 UH, non significatif).');
  assert.ok(!/Bosniak/.test(d));
  assert.deepEqual(CR.conclusion(st), ['Lésion kystique polaire supérieure du rein droit de 32 mm, classée Bosniak IIF (version 2019) : contrôle par imagerie à 6 et 12 mois, puis annuel jusqu\'à 5 ans.']);
  // Champs à compléter quand ils manquent
  const vide = etat([{}]);
  assert.match(CR.description(vide, vide.lesions[0]), /^Lésion kystique du rein \[droit \/ gauche\] de \[x\] mm : .*mesuré à \[x\] UH sans injection et à \[x\] UH au temps portal\.$/);
});

test('conclusion : nom, accord et conduite à tenir de chaque catégorie', () => {
  const conclu = l => CR.conclusion(etat([l]))[0];
  assert.equal(conclu(kysteSimple()), 'Kyste simple du rein gauche de 15 mm, classé Bosniak I (version 2019) : bénin, sans surveillance nécessaire.');
  assert.match(conclu({ cote: 'droit', e: { injection: 'non', uhSans: '75' } }), /^Kyste du rein droit, classé Bosniak II \(version 2019\) : bénin/);
  assert.match(conclu({ cote: 'droit', e: { paroi: '>=4', uhSans: '12', uhPortal: '14' } }), /^Masse kystique du rein droit, classée Bosniak III .*chirurgie ou surveillance active/);
  // Pièges de la version 2019 : protrusion de 2 mm à angle aigu = IV ; cloison lisse de 3 mm = IIF
  assert.match(conclu({ cote: 'gauche', e: { protrusion: 'aigu', uhSans: '10', uhPortal: '12' } }), /classée Bosniak IV \(version 2019\) : malignité probable \(jusqu'à 90 %\) ; avis urologique\.$/);
  assert.match(conclu(cloison3mm), /Bosniak IIF/);
  // Hors Bosniak
  assert.match(conclu({ cote: 'droit', taille: '40', e: { tissu: 'oui' } }), /^Masse du rein droit de 40 mm à composante tissulaire .*hors classification de Bosniak/);
  assert.match(conclu({ cote: 'droit', e: { exclusion: 'oui' } }), /classification de Bosniak non applicable\.$/);
});

test('intégration : sous la ligne des reins, phrase normale gardée pour l\'autre rein, AU TOTAL rempli', () => {
  const r = CR.integrer(modele('uroscanner'), etat([cloison3mm]));
  const L = r.texte.split('\n');
  const reins = L.findIndex(l => /^• Les reins sont en place/.test(l));
  assert.match(L[reins], /sans masse solide ou kystique décelable à gauche\.$/);
  assert.match(L[reins + 1], /^• Lésion kystique polaire supérieure du rein droit de 32 mm/);
  assert.equal(r.rubrique, 'reins');
  assert.equal(r.conclusion, 'AU TOTAL');
  assert.ok(!r.texte.includes('[conclusion]'));
  assert.match(r.texte, /AU TOTAL :\nLésion kystique polaire supérieure du rein droit de 32 mm, classée Bosniak IIF/);
});

test('intégration : deux reins (droit puis gauche), phrase retirée, conclusion « sans anomalie » retirée', () => {
  const st = etat([kysteSimple('gauche'), cloison3mm]);
  const r = CR.integrer(modele('tdm-cerebrale-tap'), st);
  assert.ok(!/sans masse solide ou kystique/.test(r.texte));
  const L = r.texte.split('\n');
  const d = L.findIndex(l => /^• Lésion kystique .*rein droit/.test(l));
  assert.match(L[d - 1], /^• Les reins sont en place/);
  assert.match(L[d + 1], /^• Lésion kystique du rein gauche/);
  const tap = CR.integrer(modele('tdm-tap'), st).texte;
  assert.ok(!/sans anomalie décelable/.test(tap.split('AU TOTAL')[1]));
  assert.match(tap, /AU TOTAL :\n.*rein droit.*Bosniak IIF.*\nKyste simple du rein gauche.*Bosniak I \(/);
});

test('réinsertion : remplace la description et la conclusion, garde le texte de l\'utilisateur', () => {
  const st = etat([cloison3mm]);
  const cr = modele('uroscanner').replace('[conclusion]', 'Comparaison avec l\'examen de 2024.');
  const r1 = CR.integrer(cr, st);
  assert.equal(CR.integrer(r1.texte, st).texte, r1.texte, 'idempotent');
  st.lesions[0].e = CR.choisir(st, st.lesions[0], 'cloisonsEpaisseur', '>=4');
  const r2 = CR.integrer(r1.texte, st).texte;
  assert.equal((r2.match(/^• Lésion kystique/gm) || []).length, 1);
  assert.match(r2, /AU TOTAL :\nMasse kystique polaire supérieure du rein droit de 32 mm, classée Bosniak III[^\n]*\nComparaison avec l'examen de 2024\.$/);
  assert.ok(!/Bosniak IIF/.test(r2));
});

test('intégration : sans ligne des reins, en fin de constatations ; sans rubrique, au curseur', () => {
  const st = etat([cloison3mm]);
  const r = CR.integrer(modele('tdm-thorax'), st);
  assert.equal(r.rubrique, 'RÉSULTAT');
  assert.match(r.texte, /• Absence d'épanchement péricardique\.\n\nPar ailleurs :\n• Lésion kystique polaire supérieure du rein droit[^\n]*\n\nCONCLUSION :\nLésion kystique/);
  assert.equal(CR.integrer(r.texte, st).texte, r.texte, 'idempotent');
  // Rubrique sans sous-titre : à la suite des constatations
  const simple = CR.integrer('RÉSULTATS :\n• Foie normal.\n• Rate normale.\n\nCONCLUSION :\n[conclusion]', st).texte;
  assert.match(simple, /• Rate normale\.\n• Lésion kystique[^\n]*\n\nCONCLUSION :/);
  assert.equal(CR.integrer('Texte libre sans rubrique.', etat([cloison3mm])), null);
  const t = CR.texte(etat([cloison3mm])).split('\n');
  assert.equal(t.length, 2);
  assert.ok(t.every(l => l.startsWith('• ')));
  // Pas de rubrique de conclusion : CONCLUSION ajoutée
  const c = CR.integrer('RÉSULTATS :\n• Les reins sont en place.', etat([cloison3mm]));
  assert.ok(c.creee);
  assert.match(c.texte, /\n\nCONCLUSION :\nLésion kystique/);
});

test('examen repris du compte rendu type ; sans injection, rehaussement à compléter', () => {
  assert.deepEqual(BCR.examDepuis(modele('uroscanner-sans-injection')), { modalite: 'tdm', injection: 'non' });
  assert.deepEqual(BCR.examDepuis(modele('tdm-abdo-pelvienne-injectee')), { modalite: 'tdm', injection: 'oui' });
  assert.deepEqual(BCR.examDepuis(modele('echo-reno-vesico-prostatique')), {});
  const st = etat([{ cote: 'droit', e: { protrusion: 'aigu', uhSans: '12' } }], { injection: 'non' });
  assert.deepEqual(CR.conclusion(st), ['Lésion kystique du rein droit, non classable selon Bosniak en l\'état.', 'À compléter par une imagerie avec injection (scanner ou IRM).']);
  assert.ok(!/rehaussée/.test(CR.description(st, st.lesions[0])), 'pas de rehaussement décrit sans injection');
});

test('conseils (IRM) dans la conclusion, au choix ; kyste hyperdense selon taille et développement', () => {
  const equivoque = { cote: 'gauche', e: { uhSans: '10', uhPortal: '24' } };
  assert.ok(CR.conclusion(etat([equivoque])).includes('IRM conseillée : rehaussement équivoque (14 UH).'));
  const sansReco = etat([equivoque]); sansReco.reco = false;
  assert.ok(!CR.conclusion(sansReco).some(l => /^IRM/.test(l)));
  const hyper = (taille, dev) => etat([{ cote: 'droit', taille, dev, e: { injection: 'non', uhSans: '75' } }], { injection: 'non' });
  assert.ok(CR.conclusion(hyper('35', 'endophytique')).includes('IRM recommandée : kyste hyperdense de plus de 3 cm à développement endophytique.'));
  assert.equal(CR.conclusion(hyper('25', 'endophytique')).length, 1);
  assert.equal(CR.conclusion(hyper('35', 'exophytique')).length, 1);
  const st = hyper('', '');
  assert.ok(CR.alertes(st, st.lesions[0]).some(a => /précisez la taille et le développement/.test(a)));
  // Plusieurs lésions : le conseil dit laquelle
  const deux = etat([equivoque, kysteSimple('droit')]);
  assert.ok(CR.conclusion(deux).includes('IRM conseillée pour la lésion du rein gauche : rehaussement équivoque (14 UH).'));
  // Réinsertion : conseils remplacés, pas ajoutés
  const r1 = CR.integrer(modele('uroscanner'), deux).texte;
  assert.equal((CR.integrer(r1, deux).texte.match(/IRM conseillée/g) || []).length, 1);
});

test('IRM : signal décrit, classement par le calculateur', () => {
  const st = etat([{ cote: 'droit', e: { t1FsHetero: 'oui' } }], { modalite: 'irm' });
  assert.match(CR.description(st, st.lesions[0]), /contenu en hypersignal T1 hétérogène avec saturation de la graisse\.$/);
  assert.match(CR.conclusion(st)[0], /Bosniak IIF/);
  const i = etat([{ cote: 'droit', e: { t2Lcr: 'oui' } }], { modalite: 'irm' });
  assert.match(CR.conclusion(i)[0], /^Kyste simple du rein droit, classé Bosniak I /);
});

test('fiche rapide Bosniak : schémas de la page, carte dans l\'onglet Uro, liens', () => {
  const S = require('../outils/bosniak-schemas.js');
  const fiche = fs.readFileSync(path.join(RACINE, 'fiches/masses-renales-kystiques.html'), 'utf8');
  for (const [c, svg] of Object.entries(S.SVG)) {
    const corps = svg.slice(svg.indexOf('>') + 1);
    assert.ok(fiche.includes(corps), `schéma ${c} identique à outils/bosniak-schemas.js`);
    assert.ok(fiche.includes(`aria-label="Schéma Bosniak ${c}"`));
  }
  assert.ok(!/\{\{/.test(fiche), 'plus de marque du modèle');
  assert.match(fiche, /href="\.\.\/outils\/bosniak"/);
  const index = fs.readFileSync(path.join(RACINE, 'fiches-rapides.html'), 'utf8');
  assert.match(index, /<a class="fiche-card" data-spe="uro" href="fiches\/masses-renales-kystiques\.html"/);
  assert.match(fs.readFileSync(path.join(RACINE, 'outils/bosniak.html'), 'utf8'), /href="\.\.\/fiches\/masses-renales-kystiques\.html"/);
});
