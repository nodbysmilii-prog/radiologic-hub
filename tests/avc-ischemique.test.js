/* Tests de la fiche « AVC ischémique » (fiches/avc-ischemique.html) : texte de l'auteur repris mot pour mot
   (à sa demande), les 9 parties du cours dans l'ordre, sommaire, abréviations, carte dans Fiches rapides › Neuro.
   Lancer : npm test   (ou : node --test tests/avc-ischemique.test.js) */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const HTML = fs.readFileSync(path.join(__dirname, '..', 'fiches', 'avc-ischemique.html'), 'utf8');
const texte = HTML.replace(/<[^>]+>/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/\s+/g, ' ');

test('les 9 parties du cours, dans l\'ordre, avec le sommaire', () => {
  const ids = ['introduction', 'etiologies', 'exploration', 'demarche', 'semiologie', 'topographiques', 'evolutives', 'particulieres', 'conclusion'];
  const titres = [...HTML.matchAll(/<section class="fsec" id="([a-z-]+)"[^>]*>\s*<h2 class="fsec-title"><span class="fnum">([IVX?]+)<\/span>/g)];
  assert.deepEqual(titres.map(t => t[1]), [...ids, 'testez-vous']);
  assert.deepEqual(titres.map(t => t[2]).slice(0, 9), ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX']);
  for (const id of ids) assert.match(HTML, new RegExp(`<li><a href="#${id}"`), 'sommaire : ' + id);
});

test('termes de l\'auteur gardés tels quels (échantillon)', () => {
  for (const t of [
    'déficit neurologique soudain, d\'étiologie vasculaire présumée',
    'time is brain',
    'plus fréquente au niveau de la carotide interne qu\'au niveau de l\'artère vertébrale',
    'Dc différentiel devant une restriction de la diffusion (abcès, tumeur hypercellulaire…)',
    'FLAIR se positive à partir de 4h30, encore négatif avant',
    'aspect de la trop belle artère',
    'persistance de l\'hypersignal par effet T2 shine-through',
    'Disparition transitoire de l\'hypodensité parenchymateuse',
    'Hypersignal Flair et T2 de la substance blanche du tractus corticospinal',
    'Fréquence des remaniements hémorragiques en T2EG',
  ]) assert.ok(texte.includes(t), t);
  for (const t of ['J2', 'S2', 'M2', 'J2-J5', 'J7', '3 semaines', 'DSC 15-20 ml/min', '40-50 cc PDC, 5 cc/s', 'ACM (50-70 %)', '3 % des ischémies', '20 % des cas'])
    assert.ok(texte.includes(t), t);
});

test('stades A à D de la sémiologie et 4 questions avant thrombolyse/thrombectomie', () => {
  for (const s of ['A. Stade suraigu (< 6 h)', 'B. Stade aigu (6-48 h)', 'C. Stade subaigu (48 h à 3 semaines)', 'D. Stade chronique (> 3 semaines)'])
    assert.ok(texte.includes(s), s);
  const conclusion = HTML.match(/<section class="fsec" id="conclusion"[\s\S]*?<\/section>/)[0];
  assert.equal((conclusion.match(/class="tile-badge"/g) || []).length, 4);
});

test('abréviations du cours et carte dans Fiches rapides › Neuro', () => {
  for (const a of ['ACA artère cérébrale antérieure', 'CADASIL cerebral autosomal dominant arteriopathy', 'VSC volume sanguin cérébral'])
    assert.ok(texte.includes(a), a);
  const index = fs.readFileSync(path.join(__dirname, '..', 'fiches-rapides.html'), 'utf8');
  assert.match(index, /<a class="fiche-card" data-spe="neuro" href="fiches\/avc-ischemique\.html"/);
});

test('figure « Évolution en diffusion » : image, lettres A à D en calque, légende de l\'auteur', () => {
  assert.ok(fs.existsSync(path.join(__dirname, '..', 'assets', 'fiches', 'avc', 'avci-evolution-diffusion.jpg')));
  const fig = HTML.match(/avci-evolution-diffusion\.jpg[\s\S]*?<\/figure>/)[0];
  for (const l of 'ABCD') assert.match(fig, new RegExp(`<g class="mk-lettre">[^]*?>${l}</text></g>`));
  assert.ok(texte.includes('la tomodensitométrie sans injection de produit de contraste révèle une hypodensité du lobe temporo-pariétal droit'));
  assert.ok(texte.includes('l\'imagerie de diffusion (DWI) devient isointense'));
  assert.match(HTML, /<div class="lb-wrap"><img src="" alt=""><\/div>/, 'agrandissement avec calque');
});
