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

test('mammographie + échographie : constatations en tête de leur rubrique, phrase normale gardée pour l\'autre sein, conclusion courte', () => {
  const e = etat('mammo-echo', 'c');
  lesion(e, { mod: 'echo', breast: 'D', hour: '10', dist: '3', a: '12', b: '9', shape: 'irrégulière', orient: 'non parallèle à la peau', margins: 'spiculés', echo: 'hypoéchogène', post: 'avec atténuation postérieure', cat: '5' });
  lesion(e, { mod: 'mammo', breast: 'D', hour: '10', type: 'calc', calcMorph: 'fines pléomorphes', calcDist: 'groupées (en amas)', cat: '4B' });
  const r = B.integrer(modele('mammo-echo'), e);
  const mammo = rubrique(r.texte, 'I/ Mammographie'), echo = rubrique(r.texte, 'II/ Échographie'), total = rubrique(r.texte, 'AU TOTAL');
  assert.deepEqual(r.rubriques, ['I/ Mammographie bilatérale (face + oblique + profil)', 'II/ Échographie mammaire, à droite comme à gauche']);
  assert.equal(r.conclusion, 'AU TOTAL');
  // Mammographie : densité choisie dans le champ du modèle, puis la lésion, puis les phrases normales
  assert.deepEqual(mammo.slice(0, 2), [
    '• Seins denses hétérogènes, type C au BI-RADS.',
    '• Sein droit, lésion n°2 : microcalcifications fines pléomorphes, groupées (en amas), à 10 h (quadrant supéro-externe).',
  ]);
  assert.ok(mammo.includes('• À gauche, absence de microcalcifications de forme ou de groupement suspect.'));
  assert.ok(!mammo.includes('• Absence de microcalcifications de forme ou de groupement suspect.'));
  assert.ok(mammo.includes('• Absence de masse décelable.'), 'phrases non contredites gardées');
  assert.ok(!mammo.some(l => /lésion n°1/.test(l)), 'la lésion vue en échographie n\'est pas dans la mammographie');
  // Échographie : masse, et l'atténuation contredit aussi « Absence d'atténuation suspecte »
  assert.match(echo[0], /^• Sein droit, lésion n°1 : masse irrégulière, non parallèle à la peau, à contours spiculés, hypoéchogène, avec atténuation postérieure, mesurant 12 × 9 mm, à 10 h, à 3 cm du mamelon \(quadrant supéro-externe\)\.$/);
  assert.equal(echo[1], '• À gauche, absence de masse solide ou kystique décelable.');
  assert.equal(echo[2], '• À gauche, absence d\'atténuation suspecte des ultrasons.');
  assert.ok(!echo.some(l => /^• Absence de masse/.test(l)));
  // Conclusion : « Bilan sénologique classé … » et conduite à tenir, rien de plus
  assert.ok(!r.texte.includes('[conclusion]'));
  assert.deepEqual(total.filter(Boolean), [
    'Bilan sénologique classé BI-RADS 5 à droite et BI-RADS 1 à gauche.',
    'Nous restons à votre disposition pour une microbiopsie/macrobiopsie mammaire.',
  ]);
  assert.ok(![...mammo, ...echo].some(l => /BI-RADS [0-6]/.test(l)), 'catégories seulement dans la conclusion');
  // Le reste du compte rendu est intact
  assert.ok(r.texte.startsWith('MAMMOGRAPHIE ET ÉCHOGRAPHIE MAMMAIRE\n\nRENSEIGNEMENTS CLINIQUES :\n[renseignements cliniques]'));
  // Réinsérer après une nouvelle ouverture de l'outil ne duplique rien
  assert.equal(B.integrer(r.texte, e).texte, r.texte);
});

test('lésion vue en mammographie : sa description échographique dans la rubrique Échographie, même numéro', () => {
  const e = etat('mammo-echo');
  const l = lesion(e, { mod: 'mammo', breast: 'D', hour: '10', dist: '3', a: '15', shape: 'irrégulière', margins: 'spiculés', dens: 'de haute densité', cat: '5',
    eco: 'oui', eShape: 'irrégulière', eOrient: 'non parallèle à la peau', eMargins: 'anguleux', eEcho: 'hypoéchogène', ePost: 'avec atténuation postérieure', ea: '12', eb: '9' });
  lesion(e, { mod: 'mammo', breast: 'G', hour: '2', type: 'calc', calcMorph: 'amorphes', calcDist: 'groupées (en amas)', cat: '4A', eco: 'non' });
  lesion(e, { mod: 'echo', breast: 'G', hour: '4', dist: '2', a: '6', type: 'kyste', cat: '2' });
  const r = B.integrer(modele('mammo-echo'), e);
  const mammo = rubrique(r.texte, 'I/ Mammographie'), echo = rubrique(r.texte, 'II/ Échographie');
  assert.deepEqual(mammo.slice(0, 3), [
    '• Seins [graisseux, type A / avec densités fibroglandulaires éparses, type B / denses hétérogènes, type C / extrêmement denses, type D] au BI-RADS.',
    '• Sein droit, lésion n°1 : masse irrégulière, à contours spiculés, de haute densité, mesurant 15 mm, à 10 h, à 3 cm du mamelon (quadrant supéro-externe).',
    '• Sein gauche, lésion n°2 : microcalcifications amorphes, groupées (en amas), à 2 h (quadrant supéro-externe).',
  ]);
  assert.ok(mammo.includes('• À gauche, absence de masse décelable.') && mammo.includes('• À droite, absence de microcalcifications de forme ou de groupement suspect.'));
  // Échographie : sein droit puis gauche, par numéro ; la masse et le kyste contredisent « Absence de masse » des deux côtés
  assert.deepEqual(echo.slice(0, 4), [
    '• Sein droit, lésion n°1, correspondant à l\'anomalie mammographique : masse irrégulière, non parallèle à la peau, à contours anguleux, hypoéchogène, avec atténuation postérieure, mesurant 12 × 9 mm, à 10 h, à 3 cm du mamelon (quadrant supéro-externe).',
    '• Sein gauche, lésion n°2 : pas de traduction échographique de l\'anomalie mammographique.',
    '• Sein gauche, lésion n°3 : kyste simple, mesurant 6 mm, à 4 h, à 2 cm du mamelon (quadrant inféro-externe).',
    '• À gauche, absence d\'atténuation suspecte des ultrasons.',
  ]);
  assert.ok(!echo.some(l => /absence de masse/i.test(l)));
  assert.deepEqual(rubrique(r.texte, 'AU TOTAL').filter(Boolean), [
    'Bilan sénologique classé BI-RADS 5 à droite et BI-RADS 4A à gauche.',
    'Nous restons à votre disposition pour une microbiopsie/macrobiopsie mammaire.',
  ]);
  assert.equal(B.integrer(r.texte, e).texte, r.texte, 'réinsertion sans doublon');
  // Taille échographique non saisie : celle de la mammographie ; échographie non précisée : rien en échographie
  l.ea = '';
  assert.match(B.integrer(modele('mammo-echo'), e).texte, /lésion n°1, correspondant à l'anomalie mammographique : [^\n]*mesurant 15 mm/);
  l.eco = '';
  assert.ok(!/lésion n°1, correspondant/.test(B.integrer(modele('mammo-echo'), e).texte));
  // Descripteurs échographiques hors lexique effacés ; examen sans échographie : pas de traduction
  l.eco = 'oui'; l.eMargins = 'masqués';
  B.normaliser(e);
  assert.equal(l.eMargins, '', '« masqués » : terme de mammographie');
  e.exam = 'mammo';
  assert.ok(!/correspondant/.test(B.texte(e)));
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
  assert.ok(total.includes('À contrôler dans 6 mois par une échographie mammaire.'));
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
  assert.deepEqual(rubrique(r.texte, 'AU TOTAL').filter(Boolean), ['Bilan sénologique classé BI-RADS 1 à droite et BI-RADS 3 à gauche.', 'À contrôler dans 6 mois par une échographie mammaire.']);
  // Rubrique absente : créée juste avant la conclusion
  const m = etat('mammo');
  lesion(m, { breast: 'D', type: 'asym', asym: 'évolutive', cat: '0' });
  const r2 = B.integrer('MAMMOGRAPHIE\n\nINDICATION :\nDépistage.\n\nCONCLUSION :\n[conclusion]', m);
  assert.deepEqual(r2.creees, ['Mammographie']);
  assert.match(r2.texte, /Dépistage\.\n\nMammographie :\n• Sein droit, lésion n°1 : asymétrie évolutive\.\n\nCONCLUSION :\n/);
  assert.match(r2.texte, /CONCLUSION :\nBilan sénologique classé BI-RADS 0 à droite et BI-RADS 1 à gauche\.\nExamen\(s\) complémentaire\(s\)/);
});

test('sans rubrique ni conclusion : texte complet inséré au curseur', () => {
  const e = etat();
  assert.equal(B.integrer('', e), null);
  assert.equal(B.integrer('Patiente de 52 ans.', e), null);
  assert.equal(B.texte(e), [
    'Mammographie :', '• Pas d\'anomalie décelable.', '',
    'Échographie :', '• Pas d\'anomalie décelable.', '',
    'Conclusion :',
    'Bilan sénologique classé BI-RADS 1 bilatéral.',
    'Prochain contrôle par un bilan sénologique complet dans deux ans.',
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

test('conduite à tenir du service selon la catégorie la plus élevée', () => {
  const BIOPSIE = 'Nous restons à votre disposition pour une microbiopsie/macrobiopsie mammaire.';
  const DEUX_ANS = 'Prochain contrôle par un bilan sénologique complet dans deux ans.';
  const SIX_MOIS = 'À contrôler dans 6 mois par une échographie mammaire.';
  for (const c of ['4', '4A', '4B', '4C', '5']) assert.deepEqual(B.conduite([c, '1']), [BIOPSIE], `BI-RADS ${c}`);
  assert.deepEqual(B.conduite(['1', '1']), [DEUX_ANS]);
  assert.deepEqual(B.conduite(['2', '1']), [DEUX_ANS]);
  assert.deepEqual(B.conduite(['3', '2']), [SIX_MOIS]);
  assert.deepEqual(B.conduite(['3', '1'], ['echo']), [SIX_MOIS]);
  assert.deepEqual(B.conduite(['3', '1'], ['mammo']), ['À contrôler dans 6 mois par une mammographie.'], 'BI-RADS 3 vu seulement en mammographie');
  assert.deepEqual(B.conduite(['3', '3'], ['echo', 'mammo']), ['À contrôler dans 6 mois par une mammographie et une échographie mammaire.']);
  assert.deepEqual(B.conduite(['3', '4B']), [BIOPSIE], 'la catégorie la plus élevée l\'emporte');
  assert.deepEqual(B.conduite(['0', '2']), [B.CONDUITE[0]], 'bilan incomplet : pas de contrôle à deux ans');
  assert.deepEqual(B.conduite(['', '1']), ['[conduite à tenir]'], 'catégorie manquante : champ à compléter');
  // Réinsertion : l'ancienne conduite est remplacée, pas ajoutée
  const e = etat('echo');
  const l = lesion(e, { breast: 'D', type: 'kyste', cyst: 'compliqué (contenu échogène)', cat: '3' });
  const r1 = B.integrer(modele('echo-mammaire'), e).texte;
  l.cat = '4A';
  const r2 = B.integrer(r1, e).texte;
  assert.ok(r2.includes(BIOPSIE) && !r2.includes(SIX_MOIS), r2);
});

test('BI-RADS 3 en mammographie seule : contrôle par mammographie dans 6 mois', () => {
  const e = etat('mammo-echo');
  const l = lesion(e, { mod: 'mammo', breast: 'G', type: 'calc', calcMorph: 'typiquement bénignes', calcDist: 'groupées (en amas)', cat: '3' });
  const r = B.integrer(modele('mammo-echo'), e).texte;
  assert.ok(r.endsWith('À contrôler dans 6 mois par une mammographie.'), r);
  // Une lésion classée 3 en échographie s'ajoute : contrôle par les deux examens, sans garder l'ancienne phrase
  lesion(e, { mod: 'echo', breast: 'D', type: 'kyste', cyst: 'compliqué (contenu échogène)', cat: '3' });
  const r2 = B.integrer(r, e).texte;
  assert.ok(r2.endsWith('\nÀ contrôler dans 6 mois par une mammographie et une échographie mammaire.'), r2);
  assert.equal((r2.match(/À contrôler dans 6 mois/g) || []).length, 1);
  l.cat = '2';
  assert.ok(B.integrer(r2, e).texte.endsWith('\nÀ contrôler dans 6 mois par une échographie mammaire.'));
});
