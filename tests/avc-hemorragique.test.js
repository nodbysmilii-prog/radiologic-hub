/* Tests de la fiche « AVC hémorragique » (fiches/avc-hemorragique.html) et du quiz « remplir le tableau »
   (quiz-tableau.js) : chaque case du tableau de datation porte une réponse cohérente avec ses pastilles,
   la palette couvre toutes les réponses, les étiologies sont numérotées de 1 à 8.
   Lancer : npm test   (ou : node --test tests/avc-hemorragique.test.js) */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const HTML = fs.readFileSync(path.join(__dirname, '..', 'fiches', 'avc-hemorragique.html'), 'utf8');
const SIGNAL = ['hyper', 'iso', 'hypo'];
const tableau = HTML.match(/<table class="ftable datation" id="tableau-datation">([\s\S]*?)<\/table>/)[1];
const lignes = [...tableau.matchAll(/<tr>\s*<td class="rh stade">([\s\S]*?)<\/tr>/g)].map(m => m[1]);
const cases = l => [...l.matchAll(/<td( [^>]*)?>([\s\S]*?)<\/td>/g)].map(m => ({ attr: m[1] || '', html: m[2] }));
const attr = (s, nom) => (s.match(new RegExp(nom + '="([^"]*)"')) || [])[1];
const pastilles = html => [...html.matchAll(/class="sg sg-(hyper|iso|hypo)"/g)].map(m => m[1]);

test('tableau de datation : 5 stades, 7 colonnes à remplir, 41 cases de quiz', () => {
  assert.equal(lignes.length, 5);
  let n = 0;
  for (const l of lignes) {
    const cs = cases(l);
    assert.equal(cs.length, 7, 'colonnes après « Stade »');
    for (const c of cs) n += (c.html.match(/class="sg-part"/g) || []).length || 1;
  }
  assert.equal(n, 41);
});

test('chaque réponse de signal correspond exactement aux pastilles de la case', () => {
  for (const l of lignes) {
    for (const c of cases(l).slice(1)) {
      const parts = [...c.html.matchAll(/<div class="sg-part" data-part="([^"]+)" data-ok="([^"]+)">([\s\S]*?)<\/div>/g)];
      const blocs = parts.length ? parts.map(p => ({ ok: p[2], html: p[3], nom: p[1] })) : [{ ok: attr(c.attr, 'data-ok'), html: c.html }];
      for (const b of blocs) {
        assert.ok(b.ok, 'data-ok manquant : ' + c.html);
        const attendus = b.ok.split(' ');
        attendus.forEach(v => assert.ok(SIGNAL.includes(v), v));
        assert.deepEqual([...new Set(pastilles(b.html))].sort(), [...attendus].sort(), b.html);
      }
    }
  }
});

test('biochimie : une clé par stade, toutes présentes dans la palette du quiz', () => {
  const palette = [...HTML.matchAll(/class="qz-brush" data-kind="bio" data-v="([^"]+)"/g)].map(m => m[1]);
  const cles = lignes.map(l => {
    const c = cases(l)[0];
    assert.equal(attr(c.attr, 'data-kind'), 'bio');
    return attr(c.attr, 'data-ok');
  });
  assert.deepEqual(cles, ['oxy', 'desoxy', 'methb-in', 'methb-libre', 'hemosiderine']);
  assert.deepEqual([...palette].sort(), [...cles].sort());
  const signal = [...HTML.matchAll(/class="qz-brush" data-kind="signal" data-v="([^"]+)"/g)].map(m => m[1]);
  assert.deepEqual(signal, SIGNAL);
});

test('quiz relié au tableau de référence, scripts chargés', () => {
  assert.match(HTML, /data-quiz-tableau data-source="#tableau-datation"/);
  assert.match(HTML, /<script src="\.\.\/quiz-tableau\.js\?v=\d+"><\/script>/);
  assert.match(HTML, /<link rel="stylesheet" href="\.\.\/quiz-tableau\.css\?v=\d+">/);
});

test('étiologies numérotées de 1 à 8, dans l\'ordre, et liées depuis le tableau de synthèse', () => {
  const sec = HTML.match(/<section class="fsec" id="etiologies"[\s\S]*?<\/section>/)[0];
  const titres = [...sec.matchAll(/<div class="fcard" id="(eti-[a-z]+)"[^>]*>\s*<h3 class="marker-sub">(\d)\. /g)];
  assert.deepEqual(titres.map(t => +t[2]), [1, 2, 3, 4, 5, 6, 7, 8]);
  const resume = [...sec.matchAll(/<td class="sc"[^>]*>(\d)<\/td><td class="rh"><a href="#(eti-[a-z]+)">/g)];
  assert.deepEqual(resume.map(r => +r[1]), [1, 2, 3, 4, 5, 6, 7, 8]);
  assert.deepEqual(resume.map(r => r[2]), titres.map(t => t[1]));
});

test('fiche listée dans Fiches rapides › Neuro', () => {
  const index = fs.readFileSync(path.join(__dirname, '..', 'fiches-rapides.html'), 'utf8');
  assert.match(index, /<a class="fiche-card" data-spe="neuro" href="fiches\/avc-hemorragique\.html"/);
});

test('schéma de l\'évolution du signal : image présente, textes en calque SVG (Montserrat)', () => {
  assert.ok(fs.existsSync(path.join(__dirname, '..', 'assets', 'fiches', 'avc', 'evolution-signal-irm.jpg')));
  const fig = HTML.match(/evolution-signal-irm\.jpg[\s\S]*?<\/svg>/)[0];
  for (const t of ['T1', 'T2', 'b1000', 'ADC', 'SWI']) assert.match(fig, new RegExp(`>${t}</text>`));
  for (const l of 'abcde') assert.match(fig, new RegExp(`>${l}</text></g>`));
  assert.match(fig, /viewBox="0 0 1038 1198"/);
});
