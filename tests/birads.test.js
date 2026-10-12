/* Tests de l'outil BI-RADS (regles/birads.js) : lexique par modalité, intégration des anomalies
   dans les rubriques Mammographie / Échographie du compte rendu type, conclusion.
   Lancer : npm test   (ou : node --test tests/*.test.js) */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const B = require('../regles/birads.js');

const RACINE = path.join(__dirname, '..');
const ctx = {};
vm.runInNewContext(fs.readFileSync(path.join(RACINE, 'cr-data.js'), 'utf8') + ';this.T = CR_TEMPLATES;', ctx);
const modele = id => ctx.T.find(t => t.id === id).text;
const lignes = t => t.split('\n');
// Lignes d'une rubrique : du titre (début de ligne) au titre de rubrique suivant
const rubrique = (texte, titre) => {
  const L = lignes(texte), i = L.findIndex(l => l.startsWith(titre));
  const j = L.findIndex((l, k) => k > i && /^(I+\/|[A-ZÀ-Ý ]+ :$)/.test(l));
  return L.slice(i + 1, j < 0 ? L.length : j);
};
const lesion = (etat, champs) => { const l = Object.assign(B.nouvelleLesion(etat), champs); etat.lesions.push(l); return l; };
const etat = (exam = 'mammo-echo', density = '') => ({ exam, density, lesions: [], active: 0 });

test('lexique : « sans particularité acoustique postérieure », plus jamais « sans effet postérieur »', () => {
  const post = B.LEXIQUE.post[1].map(([v]) => v);
  assert.ok(post.includes('sans particularité acoustique postérieure'));
  for (const f of ['regles/birads.js', 'cr-tools.js']) {
    assert.doesNotMatch(fs.readFileSync(path.join(RACINE, f), 'utf8'), /sans effet postérieur/, f);
  }
  const e = etat('echo');
  const l = lesion(e, { shape: 'ovale', margins: 'circonscrits', echo: 'hypoéchogène', post: 'sans particularité acoustique postérieure' });
  assert.equal(B.description(l), 'masse ovale, à contours circonscrits, hypoéchogène, sans particularité acoustique postérieure');
});

test('choix de la modalité : chaque lésion est décrite avec le lexique de la mammographie ou de l\'échographie', () => {
  const types = m => B.TYPES[m].map(t => t[0]);
  assert.deepEqual(types('mammo'), ['masse', 'calc', 'distorsion', 'asym', 'ganglion']);
  assert.deepEqual(types('echo'), ['masse', 'kyste', 'distorsion', 'ganglion']);
  assert.deepEqual(B.champs({ mod: 'mammo', type: 'masse' }), ['shape', 'margins', 'dens'], 'masse en mammographie : forme, contours, densité');
  assert.deepEqual(B.champs({ mod: 'echo', type: 'masse' }), ['shape', 'orient', 'margins', 'echo', 'post']);
  assert.ok(B.options({ mod: 'mammo' }, 'margins').some(([v]) => v === 'masqués'));
  assert.ok(B.options({ mod: 'echo' }, 'margins').some(([v]) => v === 'anguleux'));
  // Examen mixte : la modalité se choisit ; un examen d'une seule modalité l'impose
  assert.deepEqual(B.modalites(etat()), ['mammo', 'echo']);
  const e = etat();
  const l = lesion(e, { mod: 'echo', type: 'kyste', margins: 'anguleux', orient: 'parallèle à la peau' });
  l.mod = 'mammo';
  B.normaliser(e);
  assert.equal(l.type, 'masse', 'pas de kyste en mammographie');
  assert.equal(l.margins, '', 'contours « anguleux » : terme échographique, effacé');
  assert.equal(B.description(l), 'masse', 'orientation (échographie) non reprise en mammographie');
  e.exam = 'echo';
  B.normaliser(e);
  assert.equal(l.mod, 'echo');
  assert.equal(B.nouvelleLesion(e).mod, 'echo');
});

test('examen déduit du compte rendu type chargé', () => {
  assert.equal(B.examDepuis(modele('mammo-echo')), 'mammo-echo');
  assert.equal(B.examDepuis(modele('echo-mammaire')), 'echo');
  assert.equal(B.examDepuis(''), null);
  assert.equal(B.examDepuis(modele('tdm-cerebrale')), null);
});

test('mammographie + échographie : anomalies dans leur rubrique, phrase normale gardée pour l\'autre sein, conclusion', () => {
  const e = etat('mammo-echo', 'c');
  lesion(e, { mod: 'echo', breast: 'D', hour: '10', dist: '3', a: '12', b: '9', shape: 'irrégulière', orient: 'non parallèle à la peau', margins: 'spiculés', echo: 'hypoéchogène', post: 'avec atténuation postérieure', cat: '5' });
  lesion(e, { mod: 'mammo', breast: 'D', hour: '10', type: 'calc', calcMorph: 'fines pléomorphes', calcDist: 'groupées (en amas)', cat: '4B' });
  const r = B.integrer(modele('mammo-echo'), e);
  const mammo = rubrique(r.texte, 'I/ Mammographie'), echo = rubrique(r.texte, 'II/ Échographie'), total = rubrique(r.texte, 'AU TOTAL');
  assert.deepEqual(r.rubriques, ['I/ Mammographie bilatérale (face + oblique + profil)', 'II/ Échographie mammaire, à droite comme à gauche']);
  assert.equal(r.conclusion, 'AU TOTAL');
  // Mammographie : densité choisie dans le champ du modèle, microcalcifications à la place de la phrase normale
  assert.equal(mammo[0], '• Seins denses hétérogènes, type C au BI-RADS.');
  const i = mammo.findIndex(l => l.startsWith('• Sein droit, lésion n°2 : microcalcifications fines pléomorphes, groupées (en amas)'));
  assert.ok(i > 0, 'lésion n°2 dans la rubrique Mammographie');
  assert.equal(mammo[i + 1], '• À gauche, absence de microcalcifications de forme ou de groupement suspect.');
  assert.ok(mammo.includes('• Absence de masse décelable.'), 'phrases non contredites gardées');
  assert.ok(!mammo.some(l => /lésion n°1/.test(l)), 'la lésion vue en échographie n\'est pas dans la mammographie');
  // Échographie : masse, et l'atténuation contredit aussi « Absence d'atténuation suspecte »
  assert.match(echo[0], /^• Sein droit, lésion n°1 : masse irrégulière, non parallèle à la peau, à contours spiculés, hypoéchogène, avec atténuation postérieure, mesurant 12 × 9 mm, à 10 h, à 3 cm du mamelon \(quadrant supéro-externe\)\.$/);
  assert.equal(echo[1], '• À gauche, absence de masse solide ou kystique décelable.');
  assert.equal(echo[2], '• À gauche, absence d\'atténuation suspecte des ultrasons.');
  assert.ok(!echo.some(l => /^• Absence de masse/.test(l)));
  // Conclusion selon les constatations, à la place de [conclusion]
  assert.ok(!r.texte.includes('[conclusion]'));
  assert.deepEqual(total.filter(Boolean), [
    '• Seins de densité de type C (ACR).',
    '• Sein droit, lésion n°1 (échographie) : masse irrégulière, à contours spiculés, 12 × 9 mm, quadrant supéro-externe (10 h) — BI-RADS 5 (hautement évocateur de malignité).',
    '• Sein droit, lésion n°2 (mammographie) : microcalcifications fines pléomorphes, groupées (en amas), quadrant supéro-externe (10 h) — BI-RADS 4B (suspicion intermédiaire).',
    '• Sein droit : BI-RADS 5 (hautement évocateur de malignité), catégorie la plus élevée.',
    '• Sein gauche : pas d\'anomalie décelable — BI-RADS 1 (négatif).',
    'Conduite à tenir : prélèvement histologique recommandé.',
  ]);
  // Le reste du compte rendu est intact
  assert.ok(r.texte.startsWith('MAMMOGRAPHIE ET ÉCHOGRAPHIE MAMMAIRE\n\nRENSEIGNEMENTS CLINIQUES :\n[renseignements cliniques]'));
  // Réinsérer après une nouvelle ouverture de l'outil ne duplique rien
  assert.equal(B.integrer(r.texte, e).texte, r.texte);
});

test('lésions des deux seins : la phrase normale disparaît ; conclusion écrite par le radiologue gardée', () => {
  const e = etat('mammo-echo');
  lesion(e, { mod: 'echo', breast: 'D', type: 'kyste', cat: '2' });
  lesion(e, { mod: 'echo', breast: 'G', hour: 'c', a: '15', shape: 'ovale', orient: 'parallèle à la peau', margins: 'circonscrits', echo: 'hypoéchogène', post: 'sans particularité acoustique postérieure', cat: '3' });
  const cr = modele('mammo-echo').replace('[conclusion]', 'Comparaison avec l\'examen de 2024.');
  const r = B.integrer(cr, e);
  const echo = rubrique(r.texte, 'II/ Échographie');
  assert.deepEqual(echo.slice(0, 2), [
    '• Sein droit, lésion n°1 : kyste simple.',
    '• Sein gauche, lésion n°2 : masse ovale, parallèle à la peau, à contours circonscrits, hypoéchogène, sans particularité acoustique postérieure, mesurant 15 mm, en région rétro-aréolaire.',
  ]);
  assert.ok(!echo.some(l => /absence de masse/i.test(l)));
  assert.equal(rubrique(r.texte, 'I/ Mammographie').join('\n'), rubrique(cr, 'I/ Mammographie').join('\n'), 'mammographie inchangée');
  const total = rubrique(r.texte, 'AU TOTAL');
  assert.ok(total.includes('Comparaison avec l\'examen de 2024.'));
  assert.ok(total.includes('Conduite à tenir : surveillance à court terme recommandée.'));
});

test('échographie seule : anomalies dans RÉSULTATS ; mammographie seule : rubrique ajoutée si absente', () => {
  const e = etat(B.examDepuis(modele('echo-mammaire')));
  lesion(e, { breast: 'G', hour: '2', dist: '4', a: '8', type: 'kyste', cyst: 'compliqué (contenu échogène)', cat: '3' });
  const r = B.integrer(modele('echo-mammaire'), e);
  assert.deepEqual(r.rubriques, ['RÉSULTATS']);
  const res = rubrique(r.texte, 'RÉSULTATS');
  assert.equal(res[0], 'À droite comme à gauche :');
  assert.equal(res[1], '• Sein gauche, lésion n°1 : kyste compliqué (contenu échogène), mesurant 8 mm, à 2 h, à 4 cm du mamelon (quadrant supéro-externe).');
  assert.equal(res[2], '• À droite, absence de masse solide ou kystique décelable.');
  assert.ok(!/\(échographie\)/.test(r.texte), 'une seule modalité : pas de précision dans la conclusion');
  // Rubrique absente : créée juste avant la conclusion
  const m = etat('mammo');
  lesion(m, { breast: 'D', type: 'asym', asym: 'évolutive', cat: '0' });
  const r2 = B.integrer('MAMMOGRAPHIE\n\nINDICATION :\nDépistage.\n\nCONCLUSION :\n[conclusion]', m);
  assert.deepEqual(r2.creees, ['Mammographie']);
  assert.match(r2.texte, /Dépistage\.\n\nMammographie :\n• Sein droit, lésion n°1 : asymétrie évolutive\.\n\nCONCLUSION :\n/);
  assert.match(r2.texte, /BI-RADS 0 \(évaluation incomplète\)/);
});

test('sans rubrique ni conclusion : texte complet inséré au curseur', () => {
  const e = etat();
  assert.equal(B.integrer('', e), null);
  assert.equal(B.integrer('Patiente de 52 ans.', e), null);
  assert.equal(B.texte(e), [
    'Mammographie :', '• Pas d\'anomalie décelable.', '',
    'Échographie :', '• Pas d\'anomalie décelable.', '',
    'Conclusion :',
    '• Sein droit : pas d\'anomalie décelable — BI-RADS 1 (négatif).',
    '• Sein gauche : pas d\'anomalie décelable — BI-RADS 1 (négatif).',
    'Conduite à tenir : surveillance habituelle.',
  ].join('\n'));
});

test('catégorie par sein : la plus élevée ; 0 si seulement associé à des catégories < 4', () => {
  const e = etat();
  lesion(e, { breast: 'D', cat: '3' });
  lesion(e, { breast: 'D', cat: '0' });
  assert.equal(B.categorieSein(e, 'D'), '0');
  lesion(e, { breast: 'D', cat: '4A' });
  assert.equal(B.categorieSein(e, 'D'), '4A');
  assert.equal(B.categorieSein(e, 'G'), '1');
  lesion(e, { breast: 'G' });
  assert.equal(B.categorieSein(e, 'G'), '', 'lésion sans catégorie : à compléter');
  assert.match(B.conclusion(e).join('\n'), /\[catégorie BI-RADS\]/);
});
