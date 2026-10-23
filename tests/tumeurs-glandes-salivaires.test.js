/* Tests de la fiche « Tumeurs des glandes salivaires : l'IRM » (fiches/tumeurs-glandes-salivaires.html) :
   6 parties, figures produites par scripts/salivaires_courbes.py présentes, seuils et conduites du cours,
   arbres décisionnels, carte dans Fiches rapides › Tête et cou.
   La forme des courbes A / B / C (pic, wash-out) est vérifiée par le script lui-même à chaque lancement.
   Lancer : npm test   (ou : node --test tests/tumeurs-glandes-salivaires.test.js) */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const RACINE = path.join(__dirname, '..');
const HTML = fs.readFileSync(path.join(RACINE, 'fiches', 'tumeurs-glandes-salivaires.html'), 'utf8');
const texte = HTML.replace(/<svg[^]*?<\/svg>/g, ' ').replace(/<[^>]+>/g, ' ')
  .replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&').replace(/\s+/g, ' ');

test('6 parties dans l\'ordre, sommaire, feuilles de style', () => {
  const ids = ['principes', 'strategie', 'protocole', 'perfusion', 'algorithme', 'synthese'];
  const titres = [...HTML.matchAll(/<section class="fsec" id="([a-z-]+)"/g)].map(m => m[1]);
  assert.deepEqual(titres, [...ids, 'testez-vous']);
  for (const id of ids) assert.match(HTML, new RegExp(`<li><a href="#${id}"`));
  assert.match(HTML, /schemas\/salivaires\.css\?v=\d+/);
});

test('figures « tracées à la main » produites par le script', () => {
  for (const nom of ['adc', 'courbes', 'courbe-a', 'courbe-b', 'courbe-c', 'mini-a', 'mini-b', 'mini-c']) {
    const m = HTML.match(new RegExp(`<!-- GEN:${nom} -->([^]*?)<!-- /GEN:${nom} -->`));
    assert.ok(m, nom);
    assert.match(m[1], /^<svg viewBox="[^"]+" role="img" aria-label="[^"]+"/, nom);
  }
  const courbes = HTML.match(/<!-- GEN:courbes -->([^]*?)<!-- \/GEN:courbes -->/)[1];
  assert.match(courbes, /B pic précoce puis wash-out supérieur à 30 %, C pic précoce puis wash-out inférieur à 30 %/);
});

test('seuils et conduites du cours', () => {
  for (const t of ['90 %', '≥ 1,4', '0,9 à 1,4', '< 0,9', '< 0,7', '1,27 à 1,6', 'ADC de la lésion', '5 à 10 min', '< 5 %',
    'IRM avant la cytoponction', 'critère le plus péjoratif', 'La perfusion l\'emporte : malignité',
    'La morphologie l\'emporte : malignité', 'refaire l\'IRM à 1 mois', 'T2 avec Fat Sat', 'nerf facial +++',
    'trajet intrapétreux du VII', 'Suivi clinique'])
    assert.ok(texte.includes(t), t);
});

test('choix de l\'auteur (23/10/2026) et repères de la littérature', () => {
  // B et C sans hypersignal T1 : même conclusion, versant malin ; C la plus péjorative
  assert.match(HTML, /dt-leaf is-warn" href="#perfusion">Malin &gt; bénin/);
  assert.match(HTML, /dt-leaf is-bad" href="#perfusion"><small class="dt-kicker">la plus péjorative <\/small>Malin &gt; bénin/);
  for (const t of ['plus malin que bénin', 'courbe C reste la plus péjorative', 'toujours le versant malin',
    'Tpeak', '≤ 120 s', '5 min', '59 %', 'doi:10.4329/wjr.v15.i1.20', 'doi:10.1007/s11547-020-01182-2'])
    assert.ok(texte.includes(t), t);
  const courbes = HTML.match(/<!-- GEN:courbes -->([^]*?)<!-- \/GEN:courbes -->/)[1];
  for (const t of ['120 s', '5 min', 'pic précoce : ≤ 120 s']) assert.ok(courbes.includes(t), t);
});

test('arbres décisionnels : prise en charge IRM + FNAC et algorithme des lésions de plus de 1 cm', () => {
  assert.equal((HTML.match(/<div class="dtree" data-dtree/g) || []).length, 2);
  const algo = HTML.slice(HTML.indexOf('id="algorithme"'), HTML.indexOf('id="synthese"'));
  for (const t of ['Courbe A', 'Courbe B', 'Courbe C', 'Hypersignal T1 présent', 'Tumeur de Warthin', 'Moins de 1 cm', 'Lésion infiltrante'])
    assert.ok(algo.includes(t), t);
});

test('ADC de la lésion, plus de rCDA (choix de l\'auteur, 23/10/2026)', () => {
  assert.ok(!/rCDA|rcda/.test(HTML), 'le rCDA ne doit plus apparaître');
  for (const t of ['doi:10.1007/s11547-020-01182-2', 'doi:10.1016/j.diii.2020.08.002', '94,9 %', '94,6 %', 'chevauchement important']) assert.ok(texte.includes(t), t);
  const adc = HTML.match(/<!-- GEN:adc -->([^]*?)<!-- \/GEN:adc -->/)[1];
  for (const t of ['0,7', '0,9', '1,4', 'Warthin', 'Carcinome', 'adénome pléomorphe', '+ courbe A', '+ courbe B', '+ courbe C', 'lymphome : &lt; 0,7 + courbe C', 'seuil adénome pléomorphe / tumeur maligne : 1,27 à 1,6 selon les études']) assert.ok(adc.includes(t), t);
  // références : seulement des articles de 2020 ou plus récents (demande de l'auteur, 23/10/2026)
  const annees = [...HTML.matchAll(/(?:<i>[^<]+<\/i>|et al\.|Beyhan M\.) (?:[^<]*?)?(19\d\d|20\d\d)/g)].map(m => +m[1]);
  assert.ok(annees.length >= 6, 'références trouvées');
  assert.ok(annees.every(a => a >= 2020), 'référence antérieure à 2020 : ' + annees);
  assert.ok(!/radiol\.2262011486|radiol\.2493072045|Yabuuchi|2003/.test(HTML), 'articles de 2003 et 2008 jamais cités');
  assert.ok(!/AP \/ malin/.test(HTML), 'abréviation « AP / malin » écrite en toutes lettres');
  assert.ok(texte.includes('≤ 120 s') && texte.includes('30 %'), 'pic précoce et wash-out gardés');
});

test('carte dans Fiches rapides › Tête et cou', () => {
  const index = fs.readFileSync(path.join(RACINE, 'fiches-rapides.html'), 'utf8');
  assert.match(index, /<button class="spe-tab" role="tab" data-spe="orl"[^>]*>Tête et cou<\/button>/);
  assert.match(index, /<a class="fiche-card" data-spe="orl" href="fiches\/tumeurs-glandes-salivaires\.html"/);
});
