/* Tests de l'assistant documentaire du module de comptes rendus :
   index des fiches (scripts/indexer_fiches.py → assistant/index-fiches.js),
   dictionnaire (assistant/synonymes.js) et moteur (assistant/moteur.js).
   Lancer : npm test   (ou : node --test tests/assistant.test.js) */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const RACINE = path.join(__dirname, '..');
const INDEX = require('../assistant/index-fiches.js');
const SYN = require('../assistant/synonymes.js');
const M = require('../assistant/moteur.js');
const moteur = M.creer(INDEX, SYN);
const sugg = t => moteur.analyser(t).suggestions;
const p = t => sugg(t)[0];

const sansBalises = h => h.replace(/<(script|style|svg)\b[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ')
  .replace(/&shy;/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
  .replace(/\s+/g, ' ');

test('index : à jour, une entrée par fiche rapide publiée, sans menu ni pied de page', () => {
  execFileSync('python3', [path.join(RACINE, 'scripts', 'indexer_fiches.py'), '--verifier'], { stdio: 'pipe' });
  const cartes = [...fs.readFileSync(path.join(RACINE, 'fiches-rapides.html'), 'utf8').matchAll(/class="[^"]*\bfiche-card\b[^"]*"[^>]*href="(fiches\/[\w-]+\.html)"|href="(fiches\/[\w-]+\.html)"[^>]*class="[^"]*\bfiche-card\b/g)]
    .map(m => m[1] || m[2]);
  assert.ok(INDEX.fiches.length >= 20);
  assert.deepEqual(INDEX.fiches.map(f => f.url).sort(), [...new Set(cartes)].sort());
  const tout = JSON.stringify(INDEX);
  for (const interdit of ['Mentions légales', 'Navigation principale', 'Fil d\'Ariane', 'Imprimer / PDF', '© ']) assert.ok(!tout.includes(interdit), interdit);
});

test('index : chaque extrait est recopié de la fiche et chaque ancre existe', () => {
  for (const f of INDEX.fiches) {
    const html = fs.readFileSync(path.join(RACINE, f.url), 'utf8');
    const texte = sansBalises(html);
    assert.ok(f.titre.length > 3, f.id);
    for (const s of f.sections) {
      assert.ok(html.includes(`id="${s.id}"`), `${f.id}#${s.id}`);
      for (const r of s.rubriques) {
        assert.ok(html.includes(`id="${r.ancre}"`), `${f.id}#${r.ancre}`);
        for (const b of r.blocs) {
          const debut = b.replace(/ …$/, '').slice(0, 60);
          // les balises en ligne coupent parfois un mot (« <b>3</b> mm ») : comparaison sans espaces
          assert.ok(texte.replace(/\s/g, '').includes(debut.replace(/\s/g, '')), `${f.id}#${s.id} : « ${debut} »`);
        }
      }
    }
  }
});

test('dictionnaire : uniquement des fiches existantes, termes non vides', () => {
  const ids = new Set(INDEX.fiches.map(f => f.id));
  for (const [id, d] of Object.entries(SYN)) {
    assert.ok(ids.has(id), `fiche absente : ${id}`);
    assert.ok((d.forts || []).length, id);
    for (const t of [...(d.forts || []), ...(d.faibles || [])]) assert.ok(M.norm(t), `${id} : « ${t} »`);
  }
});

test('normalisation : accents, majuscules, tirets, ponctuation, pluriel', () => {
  assert.equal(M.norm('PANCRÉATITE  aiguë.'), M.norm('pancreatite-aigue'));
  assert.equal(M.norm('Kystes  rénaux;'), 'kyste renaux');
  assert.equal(M.norm('LI-RADS'), 'li rad');
  assert.equal(p('PANCREATITE AIGUE').fiche, 'pancreatite-aigue');
  assert.equal(p('pancréatite-aiguë œdémateuse').fiche, 'pancreatite-aigue');
  assert.equal(p('Colites infectieuses').fiche, 'colites');
});

test('Bosniak III → catégorie III de la fiche des masses rénales kystiques', () => {
  const s = p('Formation kystique rénale gauche classée Bosniak III.');
  assert.equal(s.fiche, 'masses-renales-kystiques');
  assert.equal(s.section, 'categories');
  assert.match(s.rubriqueTitre, /^III ·/);
  assert.match(p('Kyste Bosniak IIF').rubriqueTitre, /^IIF ·/);
  assert.equal(s.url, 'fiches/masses-renales-kystiques.html');
});

test('rubrique contextuelle : PI-RADS, CTSI, volvulus, Pouteau-Colles', () => {
  const pi = p('Lésion PI-RADS 4 de la zone périphérique');
  assert.equal(pi.fiche, 'irm-prostate-diagnostic');
  assert.equal(pi.section, 'pirads');
  assert.equal(p('PIRADS 5').fiche, 'irm-prostate-diagnostic');
  const pa = p('Pancréatite aiguë stade E de Balthazar, CTSI à 6');
  assert.equal(pa.section, 'severite');
  assert.match(pa.rubriqueTitre, /CTSI/);
  const v = p('Volvulus du sigmoïde');
  assert.equal(v.section, 'colon');
  assert.match(v.rubriqueTitre, /Volvulus du sigmoïde/);
  assert.match(p('Fracture de Pouteau-Colles avec bascule postérieure').rubriqueTitre, /Pouteau-Colles/);
});

test('sans contexte : section « compte rendu » de la fiche si elle existe', () => {
  const s = p('Myome');
  assert.equal(s.fiche, 'myome-uterin');
  assert.equal(s.section, 'compte-rendu');
});

test('plusieurs suggestions : une principale, jusqu\'à 3 secondaires, autres fiches d\'abord', () => {
  const r = sugg('Kyste rénal Bosniak II. Par ailleurs pancréatite aiguë.\nNodule thyroïdien EU-TIRADS 3.');
  assert.ok(r.length >= 3 && r.length <= 4);
  assert.equal(r.filter(x => x.principale).length, 1);
  assert.ok(r[0].principale);
  const fichesSec = new Set(r.slice(1).map(x => x.fiche));
  assert.ok(fichesSec.size >= 2);
  // le paragraphe du curseur compte double
  const texte = 'Pancréatite aiguë.\nNodule thyroïdien EU-TIRADS 3.';
  assert.equal(moteur.analyser(texte, 5).suggestions[0].fiche, 'pancreatite-aigue');
  assert.equal(moteur.analyser(texte, texte.length).suggestions[0].fiche, 'eu-tirads');
});

test('pas de faux positif : sigles courts, mots généraux, occlusion artérielle', () => {
  assert.equal(sugg('').length, 0);
  assert.equal(sugg('Foie de taille normale, pas d\'épanchement.').length, 0);
  assert.equal(sugg('sep').length, 0);                       // SEP seulement en majuscules
  assert.equal(p('Lésions évocatrices de SEP').fiche, 'sclerose-en-plaques');
  assert.equal(sugg('rch').length, 0);
  assert.equal(sugg('Nodule').length, 0);                    // un seul mot faible
  assert.equal(sugg('occlusion de l\'artère cérébrale moyenne').length, 0);
  assert.equal(p('AVC ischémique, occlusion M1').fiche, 'avc-ischemique');
  assert.equal(sugg('Colitis').length, 0);                   // mot entier
  assert.equal(sugg('Le rein droit est normal.').length, 0);
});

test('CHC / LI-RADS → fiche « Masses hépatiques solides » ; fiche inexistante ignorée', () => {
  assert.equal(p('CHC LI-RADS 5 du segment VII').fiche, 'masses-hepatiques');
  assert.equal(p('Hépatocarcinome').fiche, 'masses-hepatiques');
  assert.equal(sugg('Foie de taille normale.').length, 0);   // « foie » seul est un mot faible
  // un terme dont la fiche n'existe pas est ignoré, sans erreur
  const m = M.creer(INDEX, { 'fiche-inexistante': { forts: ['CHC'] } });
  assert.equal(m.analyser('CHC').suggestions.length, 0);
});

test('moteur déterministe et sans effet sur le texte', () => {
  const t = 'Pancréatite aiguë CTSI 4 ; kyste Bosniak IIF.';
  const a = JSON.stringify(moteur.analyser(t, 3));
  assert.equal(JSON.stringify(moteur.analyser(t, 3)), a);
  assert.equal(t, 'Pancréatite aiguë CTSI 4 ; kyste Bosniak IIF.');
});

test('page des comptes rendus : panneau, scripts versionnés, aucun appel réseau dans l\'assistant', () => {
  const html = fs.readFileSync(path.join(RACINE, 'comptes-rendus.html'), 'utf8');
  for (const f of ['assistant/synonymes.js', 'assistant/moteur.js', 'assistant/panneau.js', 'assistant/panneau.css']) assert.match(html, new RegExp(f.replace('.', '\\.') + '\\?v=\\d+'), f);
  assert.match(html, /id="ad-panneau"/);
  for (const f of ['moteur.js', 'panneau.js', 'synonymes.js']) {
    const js = fs.readFileSync(path.join(RACINE, 'assistant', f), 'utf8');
    assert.ok(!/fetch\(|XMLHttpRequest|sendBeacon|WebSocket|https?:\/\//.test(js.replace(/\/\*[\s\S]*?\*\//g, '')), f);
  }
  const panneau = fs.readFileSync(path.join(RACINE, 'assistant', 'panneau.js'), 'utf8');
  assert.ok(!/editeur\.value\s*=|setRangeText|execCommand/.test(panneau), 'le panneau n\'écrit jamais dans l\'éditeur');
});
