/* Tests de la fiche « Amylose thoracique : une affection bénigne mais déroutante » (fiches/amylose-thoracique.html) :
   article de l'auteur repris mot pour mot, sans rien ajouter (à sa demande) — seules la mise en page et les couleurs changent ;
   figures du poster avec leurs légendes traduites en français (à sa demande).
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

test('rien d\'ajouté au texte : ni quiz, ni cartes à retourner, ni abréviations, ni références', () => {
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

const figures = [...HTML.matchAll(/<figure class="ex-fig[^"]*"[\s\S]*?<\/figure>/g)].map(m => m[0]);
const section = id => HTML.match(new RegExp(`<section class="fsec[^"]*" id="${id}"[\\s\\S]*?</section>`))[0];

test('12 figures du poster, numérotées dans l\'ordre et rangées dans leur partie', () => {
  assert.equal(figures.length, 12);
  figures.forEach((f, i) => assert.match(f, new RegExp(`<span class="amy-fig-n">Fig\\. ${i + 1}</span>`)));
  const compte = id => (section(id).match(/<figure class="ex-fig/g) || []).length;
  assert.deepEqual(['pulmonaire', 'tracheobronchique', 'mediastinale', 'pleural'].map(compte), [4, 3, 5, 0]);
  const imgs = [...HTML.matchAll(/src="\.\.\/assets\/fiches\/amylose\/([a-z-]+\.jpg)\?v=\d+"/g)].map(m => m[1]);
  assert.equal(imgs.length, 11 + 4);
  for (const f of imgs) assert.ok(fs.existsSync(path.join(__dirname, '..', 'assets', 'fiches', 'amylose', f)), f);
  assert.match(HTML, /<dialog class="lightbox" id="lightbox"/, 'agrandissement au clic');
});

test('légendes en français radiologique (plus d\'anglais), renvois colorés vers les flèches', () => {
  const legendes = figures.map(f => f.match(/<figcaption>([\s\S]*?)<\/figcaption>/)[1].replace(/<[^>]+>/g, ''));
  for (const l of legendes) assert.doesNotMatch(l, /\b(showing|arrows?|chest|with|lymph|nodes?|presenting|CT|window)\b/i, l);
  for (const t of [
    'Amylose nodulaire.', 'Amylose parenchymateuse se présentant sous la forme d\'une masse.',
    'Amylose parenchymateuse se présentant sous la forme d\'une pneumopathie interstitielle diffuse (PID).',
    'Amylose se présentant sous la forme d\'un manchon péri-bronchovasculaire.', 'Amylose trachéale.',
    'Pathologies de la paroi trachéobronchique : aspects TDM et pièges diagnostiques.',
    'Association de deux types d\'atteinte de l\'amylose thoracique.', 'Amylose ganglionnaire.', 'Amylose médiastinale extraganglionnaire.',
    'conglomérat d\'adénopathies paratrachéales droites formant une masse', 'ganglions médiastinaux à calcifications centrales',
    'ganglions sous-carénaires et de la fenêtre aorto-pulmonaire hypodenses avec rehaussement périphérique',
    'opacité médiastinale effaçant la ligne para-aortique', 'manchon péri-aortique bifocal', 'micronodules de distribution aléatoire',
  ]) assert.ok(legendes.some(l => l.includes(t)), t);
  const refs = [...HTML.matchAll(/<span class="amy-ref" data-r="([a-z]+)">([^<]+)<\/span>/g)].map(m => m[1] + ':' + m[2]);
  assert.ok(refs.includes('blanc:flèches blanches') && refs.includes('jaune:flèche jaune') && refs.includes('noir:flèche noire') && refs.includes('cercle:cercles jaunes'));
  const colles = (HTML.match(/<span class="amy-ref"[^>]*>[^<]*<\/span>[.,;]/g) || []).length;
  assert.ok(colles > 0);
  assert.equal((HTML.match(/<span class="amy-nw"><span class="amy-ref"[^>]*>[^<]*<\/span>[.,;]<\/span>/g) || []).length, colles, 'pastille et ponctuation jamais séparées');
});

test('schéma « paroi trachéobronchique » traduit : membrane postérieure, calcifications, 4 cas avec leur coupe', () => {
  const arbre = figures.find(f => f.includes('amy-arbre'));
  const t = arbre.replace(/&shy;/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  for (const m of ['Atteinte diffuse ± sténosante de la paroi trachéobronchique', 'Membrane trachéale postérieure', 'Épaissie', 'Respectée', 'Calcifications', 'Présentes', 'Absentes ou tardives'])
    assert.ok(t.includes(m), m);
  const feuilles = [...arbre.matchAll(/<div class="arb-feuille">[\s\S]*?<p class="arb-q">([^<]+)<\/p><img src="\.\.\/assets\/fiches\/amylose\/(paroi-[a-z-]+)\.jpg[\s\S]*?<\/div><\/div>/g)]
    .map(m => [m[1], m[2], m[0].replace(/&shy;/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()]);
  assert.deepEqual(feuilles.map(f => f.slice(0, 2)), [['Présentes', 'paroi-amylose'], ['Absentes ou tardives', 'paroi-gpa-tuberculose'], ['Présentes', 'paroi-tboc'], ['Absentes ou tardives', 'paroi-polychondrite']]);
  assert.match(feuilles[0][2], /Amylose$/);
  assert.match(feuilles[1][2], /Granulomatose avec polyangéite \(Wegener\) Tuberculose$/);
  assert.match(feuilles[2][2], /Trachéobronchopathie ostéo-chondroplastique$/);
  assert.match(feuilles[3][2], /Polychondrite atrophiante$/);
});
