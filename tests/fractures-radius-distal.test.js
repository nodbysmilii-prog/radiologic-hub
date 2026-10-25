/* Fiche « Fractures de l'extrémité distale du radius » (fiches/fractures-radius-distal.html) :
   texte, schémas (fiches/poignet/schemas.js), seuils de l'AAOS (regles/radius-distal.js),
   modèle 3D des os de la main (public/models/main/, scripts/export_main.py).
   Lancer : npm test (ou node --test tests/fractures-radius-distal.test.js) */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const RACINE = path.join(__dirname, '..');
const HTML = fs.readFileSync(path.join(RACINE, 'fiches', 'fractures-radius-distal.html'), 'utf8');
const texte = HTML.replace(/<svg[\s\S]*?<\/svg>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&').replace(/\s+/g, ' ');
const R = require('../regles/radius-distal.js');
const S = require('../fiches/poignet/schemas.js');
const MODELE = JSON.parse(fs.readFileSync(path.join(RACINE, 'public', 'models', 'main', 'main.json'), 'utf8'));

test('parties dans l\'ordre, sommaire, scripts et styles versionnés, une seule balise body', () => {
  const ids = ['pratique', 'anatomie-3d', 'fractures', 'mesures', 'seuils', 'differentiels', 'pieges', 'compte-rendu'];
  assert.deepEqual([...HTML.matchAll(/<section class="fsec" id="([a-z0-9-]+)"/g)].map(m => m[1]), [...ids, 'testez-vous']);
  for (const id of ids) assert.match(HTML, new RegExp(`<li><a href="#${id}"`));
  for (const f of ['schemas/poignet.css', 'regles/radius-distal.js', 'poignet/schemas.js', 'poignet/poignet-fiche.js']) assert.match(HTML, new RegExp(f.replace(/\./g, '\\.') + '\\?v=\\d+'), f);
  assert.equal((HTML.match(/<body/g) || []).length, 1);
  for (const f of ['cancer-du-cavum.html', 'tumeurs-glandes-salivaires.html']) assert.equal((fs.readFileSync(path.join(RACINE, 'fiches', f), 'utf8').match(/<body/g) || []).length, 1, f);
});

test('français radiologique : termes et chiffres du cours', () => {
  for (const t of ['Pouteau-Colles', 'Goyrand-Smith', 'Barton', 'dos de fourchette', 'ventre de fourchette', 'styloïde ulnaire', 'plaque palmaire',
    'rebord articulaire', 'inclinaison radiale', 'hauteur radiale', 'inclinaison palmaire', '≈ 22°', '≈ 11 mm', '≈ 11°',
    'raccourcissement > 3 mm', 'bascule dorsale > 10°', 'marche ou diastasis > 2 mm', 'moins de 65 ans', 'Hutchinson', 'die-punch',
    'fossette lunarienne', 'Galeazzi', 'motte de beurre', 'bois vert', 'Salter-Harris II', 'arcs de Gilula', 'scapho-lunaire',
    'radius, lunatum et capitatum', 'Type Pouteau-Colles'.toLowerCase().replace('type', 'type')])
    assert.ok(texte.toLowerCase().includes(t.toLowerCase()), t);
  assert.ok(!/\b(Colles fracture|volar tilt|radial inclination|dinner fork)\b/i.test(texte), 'pas d\'anglais restant');
});

test('schémas générés : face, profil normal, trois fractures', () => {
  for (const n of ['face', 'profil-normal', 'profil-colles', 'profil-smith', 'profil-barton'])
    assert.match(HTML, new RegExp(`<!-- GEN:${n} --><svg[\\s\\S]*?</svg><!-- /GEN:${n} -->`), n);
  assert.match(S.face(), /inclinaison radiale ≈ 21°|inclinaison radiale ≈ 22°/);
  assert.match(S.profil({}), /inclinaison palmaire 11°/);
  assert.match(S.profil({ tilt: -25, seuil: true }), /bascule dorsale 25°[\s\S]*seuil de fixation/);
  assert.match(S.profil({ tilt: -8, seuil: true }), /bascule dorsale 8°[\s\S]*≤ 10°/);
  assert.doesNotMatch(S.profil({ barton: 'palmaire' }), /inclinaison palmaire|bascule dorsale/, 'Barton : pas de mesure de bascule');
});

test('seuils de l\'AAOS', () => {
  const r = R.evaluer({ sagittale: '-25', raccourcissement: '4', marche: '0' });
  assert.deepEqual(r.criteres.map(c => c.depasse), [true, true, false]);
  assert.match(r.conclusion, /^Seuils de fixation atteints/);
  assert.equal(R.evaluer({ sagittale: '-10', raccourcissement: '3', marche: '2' }).depasses.length, 0, 'seuils stricts (>)');
  assert.match(R.evaluer({ sagittale: '5', raccourcissement: '1', marche: '0' }).conclusion, /^Alignement dans les limites acceptables/);
  assert.match(R.evaluer({ marche: '3', age: '72' }).conclusion, /Après 65 ans/);
  assert.equal(R.evaluer({}).conclusion, '');
});

test('modèle 3D : 29 os de la main droite, repères et mesures plausibles', () => {
  const ids = MODELE.os.map(o => o.id);
  assert.equal(ids.length, 29);
  for (const id of ['radius', 'ulna', 'scaphoide', 'lunatum', 'triquetrum', 'pisiforme', 'trapeze', 'trapezoide', 'capitatum', 'hamatum', 'm1', 'm5', 'p1-p', 'p1-d', 'p3-m', 'p5-d'])
    assert.ok(ids.includes(id), id);
  assert.ok(!ids.includes('p1-m'), 'le pouce n\'a pas de phalange moyenne');
  const M = MODELE.mesures_modele;
  assert.ok(M.inclinaison_radiale_deg > 13 && M.inclinaison_radiale_deg < 30, 'inclinaison radiale');
  assert.ok(M.hauteur_radiale_mm > 7 && M.hauteur_radiale_mm < 15, 'hauteur radiale');
  assert.ok(M.inclinaison_palmaire_deg > 0 && M.inclinaison_palmaire_deg < 22, 'inclinaison palmaire');
  const P = MODELE.reperes;
  assert.ok(P.styloide[0] < P['coin-ulnaire'][0], 'styloïde radiale côté radial (−X)');
  assert.ok(P.styloide[1] < P['coin-ulnaire'][1], 'styloïde plus distale que le coin ulnaire');
  assert.ok(P['rebord-palmaire'][2] > P['rebord-dorsal'][2], 'rebord palmaire en avant (+Z)');
  assert.equal(fs.statSync(path.join(RACINE, 'public', 'models', 'main', 'main.glb')).size, MODELE.octets);
  assert.ok(fs.existsSync(path.join(RACINE, 'public', 'models', 'main', 'LICENSE-Z-Anatomy.txt')));
});

test('carte dans Fiches rapides › Traumato', () => {
  const index = fs.readFileSync(path.join(RACINE, 'fiches-rapides.html'), 'utf8');
  assert.match(index, /<a class="fiche-card" data-spe="trauma" href="fiches\/fractures-radius-distal\.html"/);
});

test('clichés (Kirchberg et al., CC BY 4.0) : présents, crédités, tracés en surimpression', () => {
  const html = fs.readFileSync(path.join(RACINE, 'fiches', 'fractures-radius-distal.html'), 'utf8');
  const dossier = path.join(RACINE, 'fiches', 'poignet', 'images');
  const noms = ['colles', 'smith', 'barton'].flatMap(f => [`${f}-profil`, `${f}-face`]).concat(['mesures-face', 'mesures-profil']);
  for (const n of noms) {
    assert.ok(fs.existsSync(path.join(dossier, `${n}.jpg`)), n);
    assert.ok(html.includes(`poignet/images/${n}.jpg`), `${n} dans la fiche`);
  }
  assert.match(fs.readFileSync(path.join(dossier, 'LICENSE.txt'), 'utf8'), /Kirchberg et al\., West J Emerg Med 2026[\s\S]*CC BY 4\.0/);
  assert.equal((html.match(/Kirchberg et al\., <i>West J Emerg Med<\/i> 2026/g) || []).length, 4, 'crédit sous chaque fracture et sous les mesures');
  assert.match(html, /annotations d'origine retirées et remplacées par nos tracés/);
  assert.equal((html.match(/<g class="p-traces">/g) || []).length, 2);
  assert.match(html, /id="p-traces"[^>]*aria-pressed="true"/);
});
