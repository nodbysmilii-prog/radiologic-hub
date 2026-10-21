/* Tests de la fiche « Amylose thoracique : une affection bénigne mais déroutante » (fiches/amylose-thoracique.html) :
   article de l'auteur repris mot pour mot, sans rien ajouter (à sa demande) — seules la mise en page et les couleurs changent.
   Lancer : npm test   (ou : node --test tests/amylose-thoracique.test.js) */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const HTML = fs.readFileSync(path.join(__dirname, '..', 'fiches', 'amylose-thoracique.html'), 'utf8');
const texte = HTML.replace(/<style[\s\S]*?<\/style>/g, ' ')
  .replace(/<\/?(mark|b|span|em|strong|i|sup)\b[^>]*>/g, '')
  .replace(/<[^>]+>/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/\s+/g, ' ');

test('les parties de l\'article dans l\'ordre (1 à 4, I à IV dans les résultats), avec le sommaire', () => {
  const ids = ['objectifs', 'contexte', 'resultats', 'pulmonaire', 'tracheobronchique', 'mediastinale', 'pleural', 'conclusion'];
  const titres = [...HTML.matchAll(/<section class="fsec[^"]*" id="([a-z-]+)"[^>]*>\s*<h2 class="fsec-title"><span class="fnum">([0-9IV]+)<\/span>([^<]+)<\/h2>/g)];
  assert.deepEqual(titres.map(t => t[1]), ids);
  assert.deepEqual(titres.map(t => t[2]), ['1', '2', '3', 'I', 'II', 'III', 'IV', '4']);
  assert.deepEqual(titres.map(t => t[3]), ['Objectifs pédagogiques', 'Contexte', 'Résultats (Observations)', 'Amylose pulmonaire',
    'Amylose trachéobronchique', 'Amylose médiastinale', 'Épanchement pleural au cours de l’amylose', 'Conclusion']);
  for (const id of ids) assert.match(HTML, new RegExp(`<a href="#${id}"`), 'sommaire : ' + id);
  for (const s of ['a. Atteinte nodulaire', 'b. Amylose pulmonaire alvéolo-septale', 'A Prévalence et types', 'B Considérations en imagerie', 'C Implications diagnostiques et pronostiques'])
    assert.ok(texte.includes(s), s);
});

test('texte de l\'auteur mot pour mot (échantillon, apostrophes comprises)', () => {
  assert.match(HTML, /<h1>Amylose thoracique : <span class="hl-navy">une affection bénigne mais déroutante<\/span><\/h1>/);
  for (const t of [
    'Décrire les caractéristiques en imagerie de l’amylose thoracique et les corréler aux données anatomopathologiques.',
    'Le diagnostic de certitude repose sur l\'anatomopathologie, mettant en évidence une biréfringence vert-jaune après coloration par le rouge Congo.',
    'L’amylose pulmonaire est plus souvent un processus localisé qu\'une atteinte systémique.',
    'Des dépôts pseudotumoraux solitaires, appelés amyloïdomes en l’absence de maladie systémique, sont identifiés dans environ 60 % des cas.',
    'Des contours lisses, lobulés ou spiculés pouvant faire suspecter une malignité.',
    'Avec le temps, ces nodules peuvent croître et évoluer vers des masses plus volumineuses, atteignant jusqu’à 15 cm.',
    'Les pneumopathies interstitielles diffuses (PID), en particulier lorsque la réticulation constitue le principal signe scanographique.',
    'L’ATB prédomine chez l’homme (ratio de 1,6:1) au cours des cinquième et sixième décennies',
    'Un épaississement nodulaire de la paroi trachéale (60 %)', 'Des calcifications (53 %)', 'Une obstruction des voies aériennes (47 %)',
    'associé à un sténose (rétrécissement) sur un long segment de la lumière doit fortement faire suspecter une amylose.',
    'Proximale (atteinte trachéale haute), se manifestant souvent par des symptômes des voies aériennes supérieures.',
    'Le diagnostic d’amylose doit être vigoureusement évoqué.',
    'calcifications punctiformes, diffuses ou en « coquille d’œuf ».',
    'Un tiers de ces épanchements sont abondants et réfractaires aux diurétiques.',
    'évitant ainsi des interventions chirurgicales inutiles et une aggravation des lésions d’organes.',
  ]) assert.ok(texte.includes(t), t);
});

test('rien d\'ajouté : ni quiz, ni cartes à retourner, ni abréviations, ni références', () => {
  assert.doesNotMatch(HTML, /testez-vous|class="flip|Abréviations|Références|Sources?\s*:|doi\.org|pubmed/i);
  const barres = [...HTML.matchAll(/<div class="bar" style="--w: (\d+)%"><span>[^<]+<\/span> <mark class="k-key">\((\d+) %\)<\/mark><\/div>/g)];
  assert.deepEqual(barres.map(b => [b[1], b[2]]), [['60', '60'], ['53', '53'], ['47', '47']], 'longueur des barres = pourcentages de l\'auteur');
});

test('carte dans Fiches rapides › Thorax', () => {
  const index = fs.readFileSync(path.join(__dirname, '..', 'fiches-rapides.html'), 'utf8');
  assert.match(index, /<a class="fiche-card" data-spe="thorax" href="fiches\/amylose-thoracique\.html"/);
  assert.match(index, /<h2>Amylose thoracique : une affection bénigne mais déroutante<\/h2>/);
  assert.match(HTML, /<a href="\.\.\/fiches-rapides\.html#thorax">Thorax<\/a>/);
});
