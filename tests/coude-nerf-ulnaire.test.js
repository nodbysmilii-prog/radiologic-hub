/* Tests du cours « Échographie du coude » : fiche « Échographie du nerf ulnaire :
   coude et canal de Guyon » (cours/coude-3d.html) et ses 4 comptes rendus types,
   repris dans l'éditeur des comptes rendus (cr-data.js) avec leurs phrases clés.
   Lancer : npm test   (ou : node --test tests/coude-nerf-ulnaire.test.js) */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const RACINE = path.join(__dirname, '..');
const page = fs.readFileSync(path.join(RACINE, 'cours/coude-3d.html'), 'utf8');
const IMAGES = path.join(RACINE, 'cours/coude/images');
const ctx = {};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(RACINE, 'cr-data.js'), 'utf8') + ';this.T = CR_TEMPLATES; this.P = CR_PHRASES;', ctx);

const texte = h => h.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim();
const sansAccents = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const FIELD = /\[[^\[\]\n]*\]/g;
const CR = { cr1: 'echo-ulnaire-coude', cr2: 'echo-ulnaire-coude-patho', cr3: 'echo-ulnaire-guyon', cr4: 'echo-ulnaire-guyon-patho' };
const corpsCR = id => page.match(new RegExp(`<div class="cours-cr-corps" id="${id}">([\\s\\S]*?)</div></article>`))[1];

test('cours du coude : sommaire (3D puis les 3 parties de la fiche), code couleur, 3D conservée', () => {
  const sommaire = page.match(/<aside class="toc"[\s\S]*?<\/aside>/)[0];
  const cibles = [...sommaire.matchAll(/href="#([^"]+)"/g)].map(m => m[1]);
  assert.deepEqual(cibles, ['modele-3d', 'coude', 'guyon', 'cr']);
  for (const id of cibles) assert.match(page, new RegExp(`<section class="fsec[^"]*" id="${id}"`), `section ${id}`);
  assert.ok(page.indexOf('id="modele-3d"') < page.indexOf('id="nerf-ulnaire"') && page.indexOf('id="nerf-ulnaire"') < page.indexOf('id="coude"'), 'la fiche vient après la 3D');
  assert.match(page, /id="v3d-scene"[\s\S]*id="v3d-panneau"/, 'visionneuse 3D toujours là');
  const puces = [...page.matchAll(/<button class="chip (k-[a-z]+)" data-k="([a-z]+)"[^>]*>([^<]+)</g)].map(m => [m[1], m[2], m[3]]);
  assert.deepEqual(puces, [['k-ddx', 'ddx', 'Anatomie / repères'], ['k-sign', 'sign', 'Aspect normal'], ['k-grave', 'grave', 'Pathologique'],
    ['k-key', 'key', 'Chiffres et seuils'], ['k-tech', 'tech', 'Technique / manœuvre']]);
  const marques = [...page.matchAll(/<mark class="(k-[a-z]+)">/g)].map(m => m[1]);
  assert.equal(marques.length, 158, 'mots-clés colorés de la page de référence');
  assert.ok(marques.every(k => ['k-ddx', 'k-sign', 'k-grave', 'k-key', 'k-tech'].includes(k)));
  assert.match(page, /id="fiche-body"/, 'filtre du code couleur (fiche.js)');
  assert.match(page, /data-voir="nerf-ulnaire"/, 'lien vers le nerf ulnaire en 3D');
  assert.doesNotMatch(page, /class="(an|ok|pa|val|tq|box|tbl|part|fig|pair|stages|grades|cr|copy|ph)[ "]/, 'aucune classe de la page de référence');
});

test('figures : 16 dans l\'ordre, cadre du site, 22 visuels copiés tels quels et tous utilisés', () => {
  const figs = [...page.matchAll(/<figure class="cfig( is-etroite)?" id="fig-(\d+)"><span class="cfig-num" aria-hidden="true">(\d+)<\/span>([\s\S]*?)<\/figure>/g)];
  assert.deepEqual(figs.map(f => Number(f[2])), Array.from({ length: 16 }, (_, i) => i + 1));
  figs.forEach(f => {
    assert.equal(f[2], f[3], 'pastille = numéro');
    assert.match(f[4], new RegExp(`<figcaption><b class="cfig-label">FIG\\. ${f[2]} :</b>`), `légende FIG. ${f[2]}`);
  });
  assert.deepEqual(figs.filter(f => f[1]).map(f => Number(f[2])), [8, 9, 10, 16], 'figures étroites');
  // Paires A / B (sonde + coupe) : figures 1 à 3
  for (const n of [1, 2, 3]) {
    const f = figs[n - 1][4];
    assert.match(f, /<div class="cfig-paire"><div><svg[\s\S]*<\/svg><span class="cfig-lettre" aria-hidden="true">A<\/span><\/div><div><button[\s\S]*<span class="cfig-lettre" aria-hidden="true">B<\/span>/);
  }
  assert.equal((figs[4][4].match(/<img /g) || []).length, 4, 'figure 5 : 4 stades');
  // Visuels : 19 images référencées (dimensions exactes) + 3 SVG intégrés tels quels
  const fichiers = fs.readdirSync(IMAGES).sort();
  assert.equal(fichiers.length, 22);
  const srcs = [...page.matchAll(/<img src="coude\/images\/([^"]+)" alt="[^"]+" width="(\d+)" height="(\d+)" loading="lazy"/g)];
  assert.equal(srcs.length, 19);
  for (const [, nom, w, h] of srcs) {
    const d = fs.readFileSync(path.join(IMAGES, nom));
    assert.deepEqual([d.readUInt32BE(16), d.readUInt32BE(20)], [Number(w), Number(h)], nom);
  }
  const svgs = fichiers.filter(f => f.endsWith('.svg'));
  for (const f of svgs) assert.ok(page.includes(fs.readFileSync(path.join(IMAGES, f), 'utf8').trim()), `${f} intégré sans modification`);
  assert.deepEqual([...new Set([...srcs.map(s => s[1]), ...svgs])].sort(), fichiers, 'chaque visuel est utilisé une fois');
  // Ordre des fichiers = numéro de figure
  const ordre = srcs.map(s => Number(s[1].slice(3, 5)));
  assert.deepEqual(ordre, [...ordre].sort((a, b) => a - b));
  assert.match(page, /<dialog class="lightbox" id="lightbox"/, 'agrandissement des images');
});

test('fiche : tableaux, encadrés, classifications, corrections terminologiques', () => {
  assert.equal((page.match(/<table class="ftable cours-tableau">/g) || []).length, 4);
  const encadres = [...page.matchAll(/<div class="(callout(?: callout-warn)?)"><p><b>([^<]+) :<\/b>/g)].map(m => [m[1], m[2]]);
  assert.deepEqual(encadres, [['callout callout-warn', 'Piège'], ['callout callout-warn', 'Piège diagnostique'], ['callout', 'Point sémiologique fondamental']]);
  const grades = [...page.matchAll(/<span class="cours-g is-([nsdx])">([^<]+)<\/span>/g)].map(m => m[2]);
  assert.deepEqual(grades, ['Type N', 'Type S', 'Type D', 'Triceps', 'Zone I', 'Zone II', 'Zone III']);
  // Corrections demandées par l'auteur (14/10/2026)
  for (const [nom, contenu] of [['page', page], ['cr-data.js', fs.readFileSync(path.join(RACINE, 'cr-data.js'), 'utf8')]]) {
    const n = sansAccents(contenu);
    assert.ok(!n.includes('tenosynovite'), `${nom} : « ténosynovite » remplacé`);
    assert.ok(!n.includes('bouvier'), `${nom} : pas d'éponyme « Bouvier »`);
  }
  assert.equal((page.match(/tendinopathie calcifiante du FCU \(calcification péri-pisiformienne\)/g) || []).length, 1);
  assert.match(page, /<mark class="k-ddx">arcade des hypothénariens<\/mark> \(arcade piso-hamatum\)/);
});

test('comptes rendus de la fiche : champs surlignés, bouton « Copier », lien vers l\'éditeur', () => {
  const articles = [...page.matchAll(/<article class="cours-cr" id="cr-([a-z-]+)"[\s\S]*?<\/article>/g)];
  assert.deepEqual(articles.map(a => a[1]), Object.values(CR));
  let champs = 0;
  for (const [id, modele] of Object.entries(CR)) {
    const a = articles.find(x => x[1] === modele)[0];
    assert.match(a, new RegExp(`<button class="btn btn-ink btn-sm cours-cr-copier" type="button" data-cible="${id}">Copier</button>`));
    assert.match(a, new RegExp(`href="\\.\\./comptes-rendus\\.html#modele=${modele}"`));
    const c = corpsCR(id);
    const surlignes = [...c.matchAll(/<span class="cr-champ">(\[[^\]]*\])<\/span>/g)].map(m => m[1]);
    assert.deepEqual(surlignes, texte(c).match(FIELD), `${id} : chaque champ [ ] est surligné`);
    champs += surlignes.length;
  }
  assert.equal(champs, 60);
  const script = fs.readFileSync(path.join(RACINE, 'cours/coude-fiche.js'), 'utf8');
  assert.match(script, /navigator\.clipboard\.writeText/);
  assert.match(script, /selectNodeContents/, 'texte sélectionné si le presse-papiers est refusé');
});

test('éditeur des comptes rendus : 4 modèles (Ostéo-articulaire, Échographie) identiques à la fiche', () => {
  for (const [id, modele] of Object.entries(CR)) {
    const t = ctx.T.find(x => x.id === modele);
    assert.ok(t, modele);
    assert.equal(t.spe, 'osteo');
    assert.equal(t.mod, 'Écho');
    assert.doesNotMatch(t.text, /\[[^\]\n]*\[/, `${modele} : pas de crochets imbriqués`);
    const c = corpsCR(id);
    assert.deepEqual(t.text.match(FIELD), texte(c).match(FIELD), `${modele} : mêmes champs, dans le même ordre`);
    // Mot pour mot : le texte du modèle, sans puces ni titres de rubrique, est celui de la fiche
    const aplatir = s => s.replace(/^(INDICATION|TECHNIQUE|RÉSULTATS|CONCLUSION) :$/gm, (m, r) => r.charAt(0) + r.slice(1).toLowerCase())
      .replace(/^\s*[•–]\s*/gm, '').replace(/\s+/g, ' ').trim();
    assert.equal(aplatir(t.text), texte(c).replace(/\s+/g, ' '), `${modele} : texte identique à la fiche`);
    assert.match(t.text, /\n\nINDICATION :\n[\s\S]*\n\nTECHNIQUE :\n[\s\S]*\n\nRÉSULTATS :\n• [\s\S]*\n\nCONCLUSION :\n/);
  }
});

test('phrases clés : tirées des descriptions des comptes rendus', () => {
  const p = ctx.P.filter(x => /^Nerf ulnaire/.test(x.organ));
  assert.equal(p.length, 32);
  const cles = p.flatMap(x => [x.k, ...x.alias]);
  assert.equal(new Set(cles).size, cles.length, 'mots-clés uniques');
  for (const k of cles) assert.match(k, /^[a-z0-9]+$/, `mot-clé tapable : ${k}`);
  for (const k of ['luxationulnaire', 'subluxationulnaire', 'kysteguyon', 'marteauhypothenar', 'fracturehamulus', 'csaulnaire', 'sablier', 'osborne', 'conclusionsyndromeguyon'])
    assert.ok(cles.includes(k), k);
  const modeles = Object.values(CR).map(id => ctx.T.find(x => x.id === id).text).join('\n');
  for (const x of p) {
    assert.equal(x.mod, 'Écho');
    assert.ok(['normal', 'lesion', 'conclusion'].includes(x.type));
    // Chaque ligne de la phrase vient d'un compte rendu (pour une option : « rubrique : description de l'option »)
    for (const ligne of x.text.split('\n')) {
      const description = ligne.replace(/^• /, '').split(' : ').slice(-1)[0];
      assert.ok(modeles.includes(description), `${x.k} : « ${description.slice(0, 60)}… »`);
    }
  }
  assert.equal(p.filter(x => x.type === 'conclusion').length, 4);
});
