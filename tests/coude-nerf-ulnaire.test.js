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
  assert.equal(marques.length, 158 + 5 + 88, 'mots-clés colorés : page de référence, légende du schéma, mise à jour des tâches 1 à 6');
  assert.ok(marques.every(k => ['k-ddx', 'k-sign', 'k-grave', 'k-key', 'k-tech'].includes(k)));
  assert.match(page, /id="fiche-body"/, 'filtre du code couleur (fiche.js)');
  assert.match(page, /data-voir="nerf-ulnaire"/, 'lien vers le nerf ulnaire en 3D');
  assert.doesNotMatch(page, /class="(an|ok|pa|val|tq|box|tbl|part|fig|pair|stages|grades|cr|copy|ph)[ "]/, 'aucune classe de la page de référence');
});

test('figures : 17 dans l\'ordre, cadre du site, 22 visuels de la fiche + le schéma anatomique, tous utilisés', () => {
  const figs = [...page.matchAll(/<figure class="cfig( is-etroite| is-schema)?" id="fig-(\d+)"><span class="cfig-num" aria-hidden="true">(\d+)<\/span>([\s\S]*?)<\/figure>/g)];
  assert.deepEqual(figs.map(f => Number(f[2])), Array.from({ length: 17 }, (_, i) => i + 1));
  figs.forEach(f => {
    assert.equal(f[2], f[3], 'pastille = numéro');
    assert.match(f[4], new RegExp(`<figcaption><b class="cfig-label">FIG\\. ${f[2]} :</b>`), `légende FIG. ${f[2]}`);
  });
  assert.deepEqual(figs.filter(f => f[1] === ' is-etroite').map(f => Number(f[2])), [8, 9, 10, 17], 'figures étroites');
  assert.deepEqual(figs.filter(f => f[1] === ' is-schema').map(f => Number(f[2])), [11], 'schéma anatomique');
  // Paires A / B (sonde + coupe) : figures 1 à 3
  for (const n of [1, 2, 3]) {
    const f = figs[n - 1][4];
    assert.match(f, /<div class="cfig-paire"><div><svg[\s\S]*<\/svg><span class="cfig-lettre" aria-hidden="true">A<\/span><\/div><div><button[\s\S]*<span class="cfig-lettre" aria-hidden="true">B<\/span>/);
  }
  assert.equal((figs[4][4].match(/<img /g) || []).length, 4, 'figure 5 : 4 stades');
  // Visuels : 19 images référencées (dimensions exactes) + 3 SVG intégrés tels quels
  const fichiers = fs.readdirSync(IMAGES).sort();
  assert.equal(fichiers.length, 23);
  const srcs = [...page.matchAll(/<img src="coude\/images\/([^"]+)" alt="[^"]+" width="(\d+)" height="(\d+)" loading="lazy"/g)];
  assert.equal(srcs.length, 20);
  for (const [, nom, w, h] of srcs) {
    const d = fs.readFileSync(path.join(IMAGES, nom));
    assert.deepEqual([d.readUInt32BE(16), d.readUInt32BE(20)], [Number(w), Number(h)], nom);
  }
  const svgs = fichiers.filter(f => f.endsWith('.svg'));
  for (const f of svgs) assert.ok(page.includes(fs.readFileSync(path.join(IMAGES, f), 'utf8').trim()), `${f} intégré sans modification`);
  assert.deepEqual([...new Set([...srcs.map(s => s[1]), ...svgs])].sort(), fichiers, 'chaque visuel est utilisé une fois');
  // Ordre des fichiers figNN de la fiche = ordre des figures (le schéma, ajouté ensuite, est la figure 11)
  const ordre = srcs.filter(s => /^fig\d\d/.test(s[1])).map(s => Number(s[1].slice(3, 5)));
  assert.deepEqual(ordre, [...ordre].sort((a, b) => a - b));
  assert.match(page, /<dialog class="lightbox" id="lightbox"/, 'agrandissement des images');
  // Schéma anatomique : après le « Point sémiologique fondamental », avant « 2. Protocole… » ; légende colorée
  const schema = figs[10][4];
  assert.ok(page.indexOf('Point sémiologique fondamental') < page.indexOf('id="fig-11"') && page.indexOf('id="fig-11"') < page.indexOf('2. Protocole et 4 coupes de référence'));
  assert.match(schema, /src="coude\/images\/nerf-ulnaire-anatomie-fr\.png"/);
  const fichierSchema = fs.readFileSync(path.join(IMAGES, 'nerf-ulnaire-anatomie-fr.png'));
  assert.equal(fichierSchema[25], 6, 'PNG avec transparence (fond blanc retiré)');
  assert.deepEqual([...schema.matchAll(/<mark class="(k-[a-z]+)">([^<]+)<\/mark>/g)].map(m => [m[1], m[2]]),
    [['k-ddx', 'branches cutanées dorsale et palmaire'], ['k-ddx', 'canal de Guyon'], ['k-sign', 'les épargne'], ['k-ddx', 'branche superficielle'], ['k-ddx', 'branche profonde']]);
  assert.equal(texte(schema.match(/<figcaption>([\s\S]*)<\/figcaption>/)[1]), "FIG. 11 : Trajet du nerf ulnaire de l'avant-bras à la main (vue antérieure). Les branches cutanées dorsale et palmaire naissent à l'avant-bras, en amont du canal de Guyon : une atteinte isolée au canal les épargne. À la sortie du canal, le nerf se divise en branche superficielle (sensitive) et branche profonde (motrice).");
});

test('fiche : tableaux, encadrés, classifications, corrections terminologiques', () => {
  assert.equal((page.match(/<table class="ftable cours-tableau">/g) || []).length, 4);
  const encadres = [...page.matchAll(/<div class="(callout(?: callout-warn)?)"><p><b>([^<]+) :<\/b>/g)].map(m => [m[1], m[2]]);
  assert.deepEqual(encadres, [['callout callout-warn', 'Piège'], ['callout', '5 sites de compression au coude'], ['callout callout-warn', 'Piège'],
    ['callout callout-warn', 'Piège diagnostique'], ['callout', 'Imagerie complémentaire'], ['callout', 'Point sémiologique fondamental'], ['callout', 'Imagerie complémentaire']]);
  const grades = [...page.matchAll(/<span class="cours-g is-([nsdx])">([^<]+)<\/span>/g)].map(m => m[2]);
  assert.deepEqual(grades, ['Type N', 'Type S', 'Type D', 'Triceps', 'Zone I', 'Zone II', 'Zone III']);
  // Corrections demandées par l'auteur (14/10/2026)
  for (const [nom, contenu] of [['page', page], ['cr-data.js', fs.readFileSync(path.join(RACINE, 'cr-data.js'), 'utf8')]]) {
    const n = sansAccents(contenu);
    assert.ok(!n.includes('tenosynovite'), `${nom} : « ténosynovite » remplacé`);
    assert.ok(!n.includes('bouvier'), `${nom} : pas d'éponyme « Bouvier »`);
    assert.ok(!/abductor|digiti|minimi/.test(n), `${nom} : terme anglais « abductor digiti minimi » remplacé`);
    assert.ok(n.includes('absence de muscle abducteur du petit doigt accessoire dans le toit du canal'), `${nom} : compte rendu corrigé`);
  }
  assert.match(page, /<li><b><mark class="k-ddx">Muscle abducteur du petit doigt accessoire<\/mark><\/b> \(<mark class="k-key">20 à 25 %<\/mark> des sujets\)/);
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
  assert.equal(champs, 61);
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

test('mise à jour des tâches 1 à 6 : coupes du coude, sites de compression, Osborne, corrections, examens complémentaires', () => {
  const partie = id => page.match(new RegExp(`<section class="fsec cours-partie" id="${id}"[\\s\\S]*?</section>`))[0];
  const coude = partie('coude'), guyon = partie('guyon');
  // Tâche 1 : 6 coupes, même format que le tableau du canal de Guyon ; figures sous les coupes 1, 3 et 5
  assert.match(coude, /<h3 class="marker-sub cours-h3">3\. Les coupes de référence<\/h3>/);
  const tab = coude.match(/<thead><tr><th>Coupe<\/th><th>Repères<\/th><th>Analyse normale<\/th><\/tr><\/thead>([\s\S]*?)<\/tbody>/)[1];
  const lignes = [...tab.matchAll(/<tr id="coupe-coude-(\d)"><td>([^<]+)<br><small>/g)].map(m => [Number(m[1]), texte(m[2])]);
  assert.deepEqual(lignes, [[1, '1. Axiale brachiale distale'], [2, '2. Axiale sus-épicondylienne'], [3, '3. Axiale rétro-épicondylienne, gouttière'],
    [4, "4. Entrée du tunnel cubital, arcade d'Osborne"], [5, '5. Axiale antébrachiale proximale, sortie du tunnel'], [6, '6. Longitudinale']]);
  assert.deepEqual([...coude.matchAll(/<h4 class="cours-h4">(Coupe \d) : [^<]+<\/h4>\s*<figure class="cfig" id="fig-(\d+)"/g)].map(m => [m[1], Number(m[2])]),
    [['Coupe 1', 1], ['Coupe 3', 2], ['Coupe 5', 3]]);
  assert.match(texte(coude), /Départ du balayage, au-dessus de la coupe 1\./);
  assert.match(texte(coude), /Coupe un peu plus distale que la coupe 5, là où l'artère ulnaire a rejoint le nerf\./);
  assert.match(coude, /physiologiquement plus hypoéchogène, avec moins de fascicules visibles<\/mark> ; piège principal/);
  // Tâche 2 : 5 sites, de proximal en distal, chacun renvoie à une coupe du tableau
  const sites = coude.match(/<b>5 sites de compression au coude :<\/b>[\s\S]*?<\/ol><\/div>/)[0];
  const renvois = [...sites.matchAll(/<a href="#(coupe-coude-\d)">coupe (\d)<\/a>/g)];
  assert.deepEqual(renvois.map(m => Number(m[2])), [1, 1, 3, 4, 5]);
  for (const m of renvois) assert.match(tab, new RegExp(`id="${m[1]}"`));
  assert.ok(coude.indexOf('5. Étiologies au coude') < coude.indexOf('5 sites de compression') && coude.indexOf('5 sites de compression') < coude.indexOf('A. Compressions idiopathiques'));
  assert.match(texte(coude), /Ne pas confondre l'arcade de Struthers \(nerf ulnaire\) avec le ligament de Struthers, tendu entre un processus sus-épicondylien et l'épicondyle médial, qui comprime le nerf médian\./);
  assert.match(texte(coude), /L'instabilité du nerf ulnaire n'est pas une compression, mais elle peut entraîner une neuropathie par friction \(névrite de friction\)\./);
  // Tâches 3 à 5 : terminologie et corrections
  assert.match(texte(coude), /rétinaculum du tunnel cubital \(O'Driscoll\)/);
  assert.match(texte(coude), /Arcade d'Osborne \(aponévrose huméro-ulnaire\)/);
  assert.match(texte(coude), /Forme idiopathique : compression sous le rétinaculum du tunnel cubital \(gouttière\) ou sous l'arcade d'Osborne \(entrée du tunnel\)\./);
  assert.match(texte(coude), /Mesure à 3 niveaux : 2 cm au-dessus de l'EM, à l'EM, 2 cm sous l'EM, pour localiser la souffrance \(gouttière ou arcade d'Osborne\)\./);
  assert.match(texte(coude), /CSA ≥ 10 mm² à l'EM, seuil le plus utilisé \(seuils publiés d'environ 8 à 10 mm² selon les études\)\./);
  assert.match(texte(coude), /31 à 56 % des sujets asymptomatiques selon les séries échographiques \(47 % dans la série d'Okamoto\), souvent bilatérale/);
  assert.match(texte(coude), /pseudo-névrome \(renflement fusiforme d'amont\), mesuré par la CSA/);
  assert.match(texte(coude), /environ 15 % \(3 à 28 %\)[\s\S]*plutôt en flexion et lors de sa contraction/);
  assert.match(texte(coude), /pseudarthrose du condyle latéral → cubitus valgus → neuropathie ulnaire tardive par étirement/);
  assert.match(texte(guyon), /Toit \(en avant\)/);
  assert.match(texte(guyon), /Plancher \(en arrière\)/);
  assert.match(guyon, /3\. Sémiologie et zones de Gross et Gelberman/);
  assert.match(texte(guyon), /Shea et McClain ont décrit des types cliniques I à III superposables\./);
  assert.match(texte(guyon), /kystes arthro-synoviaux, cause la plus fréquente\./);
  assert.match(texte(guyon), /Seuils indicatifs, peu validés ; l'asymétrie avec le côté sain est plus utile que la valeur absolue\./);
  assert.match(texte(guyon), /FDP en profondeur, carré pronateur plus profond et plus radial/);
  assert.match(texte(guyon), /La branche cutanée palmaire naît aussi à l'avant-bras : la sensibilité de la base de l'éminence hypothénar est conservée dans un syndrome de Guyon isolé, comme le territoire dorsal ulnaire\./);
  assert.match(texte(guyon), /Habituellement atteinte \(parfois épargnée par atteinte fasciculaire sélective\)/);
  // Tâche 6 : examens complémentaires à la fin de chaque partie
  for (const p of [coude, guyon]) assert.match(p, /<h3 class="marker-sub cours-h3">6\. Examens complémentaires<\/h3>\s*<div class="callout"><p><b>Imagerie complémentaire :<\/b><\/p>[\s\S]*<\/ul><\/div>\s*<\/section>$/);
  // Anciens termes : absents (« épitrochlée » une seule fois, entre parenthèses ; « Shea et McClain » plus associé aux zones)
  const fiche = sansAccents(texte(page.slice(page.indexOf('id="nerf-ulnaire"'), page.indexOf('<!-- PARTIE 3'))));
  const tout = sansAccents(texte(page.slice(page.indexOf('id="nerf-ulnaire"')))) + sansAccents(Object.values(CR).map(id => ctx.T.find(x => x.id === id).text).join('\n'))
    + sansAccents(ctx.P.filter(x => /^Nerf ulnaire/.test(x.organ)).map(x => x.label + ' ' + x.text).join('\n'));
  assert.equal((fiche.match(/epitrochlee(?![a-z])/g) || []).length, 1, "« épitrochlée » une seule fois (« anconé épitrochléen » et « épitrochléo-olécrânienne » mis à part)");
  assert.ok(fiche.includes("l'epicondyle medial (epitrochlee), note em"));
  for (const ancien of ['nerf cubital', 'cubital anterieur', 'cloison', 'bouvier', 'tenosynovite calcifiante', 'ligament d\'osborne', 'fascia d\'osborne',
    'arcade du fcu', 'retinaculum d\'osborne', 'epitrochleo-ancone', '15 a 20 %', '> 50 %', 'oligofasciculaire', 'mcclain, secondaire'])
    assert.ok(!tout.includes(ancien), `ancien terme : ${ancien}`);
  assert.doesNotMatch(tout, /(zones?|types?) [^.]{0,30}shea|shea et mcclain[^.]{0,20}zone/);
  assert.match(tout, /nevrome/);
  assert.ok(!/(^|[^-])nevrome/.test(tout), 'seulement « pseudo-névrome »');
  assert.ok(!texte(page.slice(page.indexOf('id="nerf-ulnaire"'), page.indexOf('</main>'))).includes('—'), 'pas de tiret cadratin dans la fiche');
  // Comptes rendus : terminologie à jour, dans la fiche et dans l'éditeur
  assert.match(texte(corpsCR('cr1')), /finesse normale du rétinaculum du tunnel cubital et de l'arcade d'Osborne\. Absence de muscle anconé épitrochléen accessoire\./);
  assert.match(texte(corpsCR('cr2')), /Option 1, forme idiopathique : compression \[sous le rétinaculum du tunnel cubital \(gouttière\) \/ sous l'arcade d'Osborne \(entrée du tunnel\)\]/);
  assert.match(texte(corpsCR('cr2')), /pour le nerf en flexion et lors de sa contraction\./);
  assert.match(texte(corpsCR('cr4')), /en zone \[I \/ II \/ III\] de Gross et Gelberman, secondaire à :/);
  const ancone = ctx.P.find(x => x.k === 'anconeepitrochleen');
  assert.ok(ancone && ancone.alias.includes('epitrochleoancone') && ancone.label === 'Muscle anconé épitrochléen accessoire');
});
