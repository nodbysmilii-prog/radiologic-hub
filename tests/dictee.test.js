/* Tests du traitement de la dictée vocale — textes fictifs uniquement.
   Lancer : npm test   (ou : node --test tests/*.test.js) */
const test = require('node:test');
const assert = require('node:assert/strict');
const T = require('../dictee/traitement.js');

const actions = s => T.analyser(s).map(a => (a.type === 'texte' || a.type === 'ponct' ? `${a.type}:${a.texte}` : a.type === 'aller' ? `aller:${a.cible}` : a.type === 'modele' ? `modele:${a.genre}:${a.nom}` : a.type));
const dicte = (s, avant = '') => T.assembler(T.analyser(s).filter(a => T.INSERTION.has(a.type)), avant).texte;

test('dictionnaire médical : scores et classifications', () => {
  assert.equal(T.corriger('lésion classée pi rads 4'), 'lésion classée PI-RADS 4');
  assert.equal(T.corriger('pi-rads 3 et pirads 5'), 'PI-RADS 3 et PI-RADS 5');
  assert.equal(T.corriger('bi rads 3'), 'BI-RADS 3');
  assert.equal(T.corriger('eu tirads 4'), 'EU-TIRADS 4');
  assert.equal(T.corriger('kyste bosniak 2F'), 'kyste Bosniak 2F');
  assert.equal(T.corriger('selon recist et lugano'), 'selon RECIST et Lugano');
  assert.equal(T.corriger('hypersignal t2 en irm'), 'hypersignal T2 en IRM');
  assert.equal(T.corriger('segment 7'), 'segment VII');
  assert.equal(T.corriger('epirads'), 'epirads', 'mots entiers seulement');
});

test('unités : seulement après un nombre', () => {
  assert.equal(T.corriger('nodule de 12 millimètres'), 'nodule de 12 mm');
  assert.equal(T.corriger('3 centimètres'), '3 cm');
  assert.equal(T.corriger('15 pour cent'), '15 %');
  assert.equal(T.corriger('volume de 40 millilitres'), 'volume de 40 mL');
  assert.equal(T.corriger('250 millimètres cubes'), '250 mm³');
  assert.equal(T.corriger('quelques millimètres'), 'quelques millimètres');
});

test('nombres décimaux : « 12 virgule 5 » → 12,5', () => {
  assert.equal(T.corriger('12 virgule 5 millimètres'), '12,5 mm');
  assert.deepEqual(actions('rein droit virgule 12 virgule 5 millimètres'), ['texte:rein droit', 'ponct:,', 'texte:12,5 mm']);
});

test('dimensions : « sur » / « par » → « x », unité mm par défaut', () => {
  assert.equal(T.corriger('12 sur 8 millimètres'), '12 x 8 mm');
  assert.equal(T.corriger('12 par 8 millimètres'), '12 x 8 mm');
  assert.equal(T.corriger('12 sur 8 sur 6'), '12 x 8 x 6 mm');
  assert.equal(T.corriger('12 par 8 par 6 centimètres'), '12 x 8 x 6 cm');
  assert.equal(T.corriger('12 sur 8 sur 6 millimètres'), '12 x 8 x 6 mm');
  assert.equal(T.corriger('12 virgule 5 sur 8'), '12,5 x 8 mm');
  assert.equal(T.corriger('12 sur 8'), '12 x 8 mm');
  assert.equal(T.corriger('nodule de 12 mm sur 8 mm'), 'nodule de 12 x 8 mm');
  assert.equal(T.corriger('mesurant 12 par 8'), 'mesurant 12 x 8 mm');
});

test('dimensions : « 4 sur 5 » sans unité reste un score (4/5)', () => {
  assert.equal(T.corriger('diffusion 4 sur 5'), 'diffusion 4/5');
  assert.equal(T.corriger('T2 : 3 sur 5'), 'T2 : 3/5');
  assert.equal(T.corriger('3 sur 5 millimètres'), '3 x 5 mm', 'avec unité : dimension');
});

test('commandes : ponctuation, lignes, paragraphes', () => {
  assert.deepEqual(actions('foie homogène point'), ['texte:foie homogène', 'ponct:.']);
  assert.deepEqual(actions('foie virgule rate point virgule reins deux points'), ['texte:foie', 'ponct:,', 'texte:rate', 'ponct:;', 'texte:reins', 'ponct::']);
  assert.deepEqual(actions('pas de lésion à la ligne rate normale'), ['texte:pas de lésion', 'ligne', 'texte:rate normale']);
  assert.deepEqual(actions('nouveau paragraphe'), ['paragraphe']);
  assert.deepEqual(actions('retour à la ligne'), ['ligne']);
  assert.deepEqual(actions('effacer le dernier mot'), ['effacerMot']);
  assert.deepEqual(actions('ouvrir la parenthèse segment 7 fermer la parenthèse'), ['ponct:(', 'texte:segment VII', 'ponct:)']);
});

test('« point » reste un mot dans les expressions médicales', () => {
  assert.deepEqual(actions('lésion à point de départ osseux'), ['texte:lésion à point de départ osseux']);
  assert.deepEqual(actions("pas de point d'appel infectieux point"), ["texte:pas de point d'appel infectieux", 'ponct:.']);
  assert.deepEqual(actions('quatre points'), ['texte:quatre points'], '« points » au pluriel');
});

test('commandes : conclusion, aller à, insérer modèle, arrêter', () => {
  assert.deepEqual(actions('conclusion'), ['aller:conclusion']);
  assert.deepEqual(actions('Conclusion.'), ['aller:conclusion']);
  assert.deepEqual(actions('en conclusion pas d\'anomalie'), ["texte:en conclusion pas d'anomalie"], 'dans une phrase : du texte');
  assert.deepEqual(actions('aller à foie'), ['aller:foie']);
  assert.deepEqual(actions('aller à la vésicule biliaire'), ['aller:la vésicule biliaire']);
  assert.deepEqual(actions('rate normale point aller au foie'), ['texte:rate normale', 'ponct:.', 'aller:foie']);
  assert.deepEqual(actions('insérer modèle scanner thoracique'), ['modele:tout:scanner thoracique']);
  assert.deepEqual(actions('insérer la phrase foie normal'), ['modele:phrase:foie normal']);
  assert.deepEqual(actions('arrêter la dictée'), ['stop']);
});

test('assemblage : majuscules, espaces et ponctuation selon le texte qui précède', () => {
  assert.equal(dicte('foie homogène point'), 'Foie homogène.');
  assert.equal(dicte('homogène', 'Foie : '), 'homogène', 'après « Foie : » : pas d\'espace en plus, pas de majuscule');
  assert.equal(dicte('homogène', 'Foie :'), ' homogène');
  assert.equal(dicte('Homogène', 'Le foie est'), ' homogène', 'majuscule de début de segment retirée en milieu de phrase');
  assert.equal(dicte('Bosniak 2', 'Kyste classé'), ' Bosniak 2', 'nom propre conservé');
  assert.equal(dicte('rate normale', 'Foie normal.'), ' Rate normale');
  assert.equal(dicte('rate', '• '), 'Rate', 'début de puce');
  assert.equal(dicte('diffusion deux points 4 sur 5'), 'Diffusion : 4/5');
  assert.equal(dicte('à la ligne', '• Foie normal'), '\n• ', 'une ligne à puce continue la liste');
  assert.equal(dicte('à la ligne', 'Foie normal'), '\n');
  assert.equal(dicte('nouveau paragraphe', 'Fin.'), '\n\n');
  const r = T.assembler([{ type: 'ponct', texte: '.' }], 'foie normal ');
  assert.deepEqual(r, { retirer: 1, texte: '.' }, 'espace avant le point supprimée');
  assert.equal(dicte('point', 'Foie normal.'), '', 'pas de double point');
});

test('effacer le dernier mot', () => {
  assert.equal(T.debutDernierMot('Foie homogène'), 4);
  assert.equal(T.debutDernierMot('Foie homogène.  '), 4);
  assert.equal(T.debutDernierMot('Foie\n'), 4, 'début de ligne : on rejoint la ligne précédente');
  assert.equal(T.debutDernierMot(''), 0);
});

const CR = `ÉCHOGRAPHIE ABDOMINALE

TECHNIQUE :
Sonde convexe.

RÉSULTAT :
Foie :
• [Normal / …]
Vésicule biliaire :
• Alithiasique.
Reins :

AU TOTAL :
[Examen normal / …]`;

test('sections et sous-titres : lignes terminées par « : »', () => {
  const s = T.sections(CR);
  assert.deepEqual(s.map(x => `${x.niveau}:${x.titre}`), ['section:TECHNIQUE', 'section:RÉSULTAT', 'sous:Foie', 'sous:Vésicule biliaire', 'sous:Reins', 'section:AU TOTAL']);
  const foie = T.trouverSection(s, 'foie');
  assert.equal(foie.titre, 'Foie');
  const c = T.cibleSection(CR, foie, s);
  assert.equal(CR.slice(0, c.debut).endsWith('Foie :'), true, 'curseur juste après « Foie : »');
  assert.equal(c.debut, c.fin);
  assert.equal(T.trouverSection(s, 'la vésicule').titre, 'Vésicule biliaire');
  assert.equal(T.trouverSection(s, 'reins').titre, 'Reins');
  assert.equal(T.trouverSection(s, 'rate'), null);
});

test('conclusion : « AU TOTAL » trouvé, champ [ … ] sélectionné', () => {
  const s = T.sections(CR);
  const concl = T.trouverSection(s, 'conclusion');
  assert.equal(concl.titre, 'AU TOTAL');
  const c = T.cibleSection(CR, concl, s);
  assert.equal(CR.slice(c.debut, c.fin), '[Examen normal / …]');
  const tech = T.cibleSection(CR, T.trouverSection(s, 'technique'), s);
  assert.equal(CR.slice(0, tech.debut).endsWith('Sonde convexe.'), true, 'section sans champ : fin du contenu');
  const vide = 'RÉSULTAT :\nRAS.\n\nCONCLUSION :';
  const sv = T.sections(vide);
  assert.deepEqual(T.cibleSection(vide, T.trouverSection(sv, 'conclusion'), sv), { debut: vide.length, fin: vide.length, inserer: '\n' });
});

const MODELES = [
  { titre: 'TDM cérébrale sans injection — normale' }, { titre: 'TDM thoracique sans injection — normale' },
  { titre: 'IRM cérébrale et médullaire — normale' }, { titre: 'Radiographie du bassin (F) — normale' },
  { titre: 'Radiographie du genou (F + P) — normale' }, { titre: 'Radiographie du genou (F + P) — gonarthrose' },
];

test('recherche approximative des modèles', () => {
  assert.equal(T.choisir('scanner thoracique', MODELES).trouve.titre, 'TDM thoracique sans injection — normale');
  assert.equal(T.choisir('scanner cérébral', MODELES).trouve.titre, 'TDM cérébrale sans injection — normale');
  assert.equal(T.choisir('radio du bassin', MODELES).trouve.titre, 'Radiographie du bassin (F) — normale');
  assert.equal(T.choisir('radio genou gonarthrose', MODELES).trouve.titre, 'Radiographie du genou (F + P) — gonarthrose');
  assert.equal(T.choisir('irm cerebrale', MODELES).trouve.titre, 'IRM cérébrale et médullaire — normale', 'sans accent');
  const amb = T.choisir('radio du genou', MODELES);
  assert.equal(amb.trouve, null);
  assert.equal(amb.proches.length, 2, 'deux modèles trop proches : on propose le choix');
  assert.equal(T.choisir('échographie hépatique', MODELES).trouve, null);
});

test('réponses vocales : confirmation et choix', () => {
  assert.equal(T.reponse('Remplacer.', 'confirmation'), 'remplacer');
  assert.equal(T.reponse('insérer au curseur', 'confirmation'), 'inserer');
  assert.equal(T.reponse('insérer', 'confirmation'), 'inserer');
  assert.equal(T.reponse('annuler', 'confirmation'), 'annuler');
  assert.equal(T.reponse('foie normal', 'confirmation'), null);
  assert.equal(T.reponse('deuxième', 'choix'), 2);
  assert.equal(T.reponse('le premier', 'choix'), 1);
  assert.equal(T.reponse('3', 'choix'), 3);
});

test('alerte identité', () => {
  assert.equal(T.identite('Madame Dupont présente une douleur').length, 1);
  assert.equal(T.identite('patient né le 12 mars 1950').length, 1);
  assert.equal(T.identite('née en 1962').length, 1);
  assert.equal(T.identite('date de naissance inconnue').length, 1);
  assert.equal(T.identite('on ne le voit pas').length, 0, '« ne le » sans accent : pas une date de naissance');
  assert.equal(T.identite('monsieur le docteur').length, 0);
  assert.equal(T.identite('foie normal').length, 0);
});

test('vocabulaire du service : termes mal reconnus par la dictée', () => {
  assert.equal(T.corriger('spontanément iso dense'), 'spontanément isodense');
  assert.equal(T.corriger('lésion hypo dense'), 'lésion hypodense');
  assert.equal(T.corriger('lésion hippo dense'), 'lésion hypodense');
  assert.equal(T.corriger('Hypo-dense'), 'Hypodense');
  assert.equal(T.corriger('en iso signal T1'), 'en isosignal T1');
  assert.equal(T.corriger('en hypo signal T1 et en hyper signal T2'), 'en hyposignal T1 et en hypersignal T2');
  assert.equal(T.corriger('en hippo signal'), 'en hyposignal');
  assert.equal(T.corriger('aspect cérébri forme'), 'aspect cérébriforme');
  assert.equal(T.corriger('aspect cérébral forme'), 'aspect cérébriforme');
  assert.equal(T.corriger('rehaussement centri pète en mode'), 'rehaussement centripète en mottes');
  assert.equal(T.corriger('rehaussement centripète en motte'), 'rehaussement centripète en mottes');
  assert.equal(T.corriger('ma gamme ganglionnaire'), 'magma ganglionnaire');
  assert.equal(T.corriger('perméabilité conservée du tronc céliaque et des artères mesenteriques'),
    'perméabilité conservée du tronc cœliaque et des artères mésentériques');
});

test('familles de mots : hypo / hyper / iso, préfixes savants, intra / péri…', () => {
  assert.equal(T.corriger('hyper échogène'), 'hyperéchogène');
  assert.equal(T.corriger('hypo échogène'), 'hypoéchogène');
  assert.equal(T.corriger('an échogène'), 'anéchogène');
  assert.equal(T.corriger('hyper vascularisée'), 'hypervascularisée');
  assert.equal(T.corriger('ostéo phytes'), 'ostéophytes');
  assert.equal(T.corriger('micro nodules'), 'micronodules');
  assert.equal(T.corriger('hépato mégalie'), 'hépatomégalie');
  assert.equal(T.corriger('pneumo péritoine'), 'pneumopéritoine');
  assert.equal(T.corriger('hydro néphrose'), 'hydronéphrose');
  assert.equal(T.corriger('intra hépatique'), 'intrahépatique');
  assert.equal(T.corriger('extra prostatique'), 'extraprostatique');
  assert.equal(T.corriger('rétro péritonéal'), 'rétropéritonéal');
  assert.equal(T.corriger('péri vésiculaire'), 'périvésiculaire');
  assert.equal(T.corriger('intra articulaire'), 'intra-articulaire', 'trait d\'union devant une voyelle');
  assert.equal(T.corriger('lombo sacré'), 'lombo-sacré');
  assert.equal(T.corriger('sacro iliaques'), 'sacro-iliaques');
  assert.equal(T.corriger('cortico sous cortical'), 'cortico-sous-cortical');
  assert.equal(T.corriger('hémorragie sous arachnoïdienne'), 'hémorragie sous-arachnoïdienne');
});

test('vocabulaire : pas de fausse correction', () => {
  assert.equal(T.corriger('hippocampe gauche'), 'hippocampe gauche');
  assert.equal(T.corriger('radio du genou'), 'radio du genou');
  assert.equal(T.corriger('échographie en mode B'), 'échographie en mode B');
  assert.equal(T.corriger('intra et extra hépatique'), 'intra et extrahépatique');
  assert.equal(T.corriger('eu tirads 4'), 'EU-TIRADS 4');
  assert.equal(T.corriger('danse'), 'danse');
});
