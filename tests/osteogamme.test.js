/* Tests d'OsteoGamme (outils/) : cohérence des données (osteogamme-data.js) et de la page.
   La logique de calcul est reprise telle quelle de l'outil d'origine ; elle a été comparée
   à celui-ci dans Chromium sur plus de 3 000 combinaisons de critères (résultats identiques).
   Lancer : npm test   (ou : node --test tests/*.test.js) */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const D = require('../outils/osteogamme-data.js');
const OsteoGammeMoteur = require('../outils/osteogamme-moteur.js');

const RACINE = path.join(__dirname, '..');
const OS = Object.keys(D.CAT), CATEGORIES = [...new Set(Object.values(D.CAT))];
const choix = k => D.F.find(f => f.k === k).o.map(o => o[0]);

test('données : critères, groupes et diagnostics bien formés', () => {
  assert.deepEqual([...new Set(D.F.map(f => f.g))], D.GROUPS, 'chaque groupe est utilisé, dans l\'ordre');
  assert.equal(new Set(D.F.map(f => f.k)).size, D.F.length, 'clés de critères uniques');
  assert.equal(new Set(D.DX.map(d => d.id)).size, D.DX.length, 'identifiants de diagnostics uniques');
  for (const d of D.DX) {
    assert.ok(d.n && d.p && d.natl && ['malin', 'agressif', 'benin', 'infect', 'pseudo'].includes(d.nat), d.id);
    for (const [k, poids] of Object.entries(d.w)) {
      assert.ok(D.F.some(f => f.k === k), `${d.id} : critère inconnu « ${k} »`);
      const permis = k === 'os' ? CATEGORIES : choix(k);
      for (const [v, w] of Object.entries(poids)) {
        assert.ok(permis.includes(v), `${d.id} : ${k} = « ${v} » n'existe pas`);
        assert.ok(Number.isInteger(w) && w >= -5 && w <= 5, `${d.id} : ${k} = ${v} → ${w}`);
      }
    }
  }
});

test('données : bonus par os, sites précis et cas exemples valides', () => {
  const ids = D.DX.map(d => d.id);
  const sites = D.LONG.flatMap(b => ['proximale', 'distale'].map(e => `${b}-${e}`));
  for (const [id, b] of Object.entries(D.BONUS)) {
    assert.ok(ids.includes(id), `BONUS : diagnostic inconnu ${id}`);
    for (const os of Object.keys(b)) assert.ok(OS.includes(os), `BONUS ${id} : os inconnu ${os}`);
  }
  for (const [id, s] of Object.entries(D.SITE)) {
    assert.ok(ids.includes(id), `SITE : diagnostic inconnu ${id}`);
    for (const site of Object.keys(s)) assert.ok(sites.includes(site), `SITE ${id} : site inconnu ${site}`);
  }
  assert.deepEqual(choix('os').sort(), [...OS].sort(), 'chaque os du formulaire a une catégorie');
  for (const e of D.EXAMPLES) {
    for (const [k, v] of Object.entries(e.s)) assert.ok(choix(k).includes(v), `exemple « ${e.l} » : ${k} = ${v}`);
  }
});

test('page /outils/osteogamme : référencement, avertissement, menu, onglet Pondérations réservé', () => {
  const html = fs.readFileSync(path.join(RACINE, 'outils/osteogamme.html'), 'utf8');
  assert.match(html, /<title>OsteoGamme[^<]+<\/title>/);
  assert.match(html, /<meta name="description" content="[^"]{80,}">/);
  assert.equal((html.split('<body')[1].match(/Outil d'aide au raisonnement et d'enseignement/g) || []).length, 2, 'avertissement en tête de page et sous la gamme');
  assert.match(html, /id="og-tabs"[^>]*hidden/, 'onglets masqués par défaut');
  for (const [, lien] of html.matchAll(/(?:src|href)="([^"#?:]+\.(?:js|css|svg|png))(?:\?v=\d+)?"/g)) {
    assert.ok(fs.existsSync(path.join(RACINE, 'outils', lien)), `${lien} introuvable`);
  }
  assert.ok(html.indexOf('osteogamme-data.js') < html.indexOf('osteogamme-moteur.js') && html.indexOf('osteogamme-moteur.js') < html.indexOf('osteogamme.js?'), 'données, puis moteur, puis affichage');
  const js = fs.readFileSync(path.join(RACINE, 'outils/osteogamme.js'), 'utf8');
  assert.match(js, /has\('admin'\)/, 'Pondérations avec ?admin');
  assert.match(js, /localhost/, 'Pondérations en local');
  assert.doesNotMatch(js, /^const (F|DX|BONUS|SITE|EXAMPLES)=/m, 'données seulement dans osteogamme-data.js');
});

test('rattachement à la section Comptes rendus : pas de menu « Outils », lien depuis les outils des comptes rendus', () => {
  const page = fs.readFileSync(path.join(RACINE, 'outils/osteogamme.html'), 'utf8');
  const menu = page.slice(page.indexOf('id="main-nav"'), page.indexOf('</nav>', page.indexOf('id="main-nav"')));
  assert.match(menu, /<a href="\.\.\/comptes-rendus\.html" class="is-current">Comptes rendus<\/a>/, 'Comptes rendus : entrée active du menu');
  assert.match(page, /<p class="crumbs"><a href="\.\.\/comptes-rendus\.html">Comptes rendus<\/a> › <span>OsteoGamme<\/span><\/p>/);
  for (const p of ['index.html', 'comptes-rendus.html', 'fiches-rapides.html', 'fiches/spondylodiscite.html', 'cours/ischio-jambiers.html', 'outils/osteogamme.html']) {
    const html = fs.readFileSync(path.join(RACINE, p), 'utf8');
    assert.doesNotMatch(html, /nav-groupe|>Outils</, `${p} : pas de menu « Outils »`);
  }
  assert.doesNotMatch(fs.readFileSync(path.join(RACINE, 'styles.css'), 'utf8'), /nav-groupe|nav-sous/);
  const cr = fs.readFileSync(path.join(RACINE, 'comptes-rendus.html'), 'utf8');
  assert.match(cr, /<a class="cr-tool-chip cr-tool-link" href="outils\/osteogamme">OsteoGamme<small>page complète →<\/small><\/a>/, 'lien vers la page complète, comme le Suivi oncologique');
  assert.match(fs.readFileSync(path.join(RACINE, 'cr-tools.js'), 'utf8'), /init: \(\) => \(\{ c: \{\}, n: '3', cote: '', reco: true \}\)/, 'alertes dans la conclusion cochées par défaut');
});

test('moteur partagé : cas exemples, alertes, état, créé plusieurs fois sans recalculer les os', () => {
  const M = OsteoGammeMoteur(D);
  const tete = s => { M.state = { ...s }; return M.evaluate().res[0].dx.id; };
  assert.deepEqual(D.EXAMPLES.map(e => tete(e.s)), ['tcg', 'os', 'mm', 'df'], 'diagnostic en tête de chaque cas exemple (comme l\'outil d\'origine)');
  M.state = { ...D.EXAMPLES[1].s };
  assert.deepEqual(M.flags().map(f => f[1]), ['Lésion d’allure agressive']);
  M.state = {};
  assert.equal(M.evaluate().filled.length, 0);
  const avant = JSON.stringify(D.DX.map(d => d.w));
  const M2 = OsteoGammeMoteur(D);
  assert.equal(JSON.stringify(D.DX.map(d => d.w)), avant, 'os et sites calculés une seule fois');
  M2.state = { ...D.EXAMPLES[0].s };
  assert.equal(M2.evaluate().res[0].dx.id, 'tcg');
  M2.overrides = { tcg: { age: { '20-40': -3 }, segment: { epiphyse: -3 }, lodwick: { IB: -3 }, axe: { excentree: -3 } } };
  assert.notEqual(M2.evaluate().res[0].dx.id, 'tcg', 'pondérations modifiées prises en compte');
  assert.equal(tete(D.EXAMPLES[0].s), 'tcg', 'chaque moteur garde ses propres modifications');
});

test('page Comptes rendus : outil OsteoGamme branché sur le même moteur', () => {
  const html = fs.readFileSync(path.join(RACINE, 'comptes-rendus.html'), 'utf8');
  const i = s => html.indexOf(s);
  assert.ok(i('outils/osteogamme-data.js') > 0 && i('outils/osteogamme-data.js') < i('outils/osteogamme-moteur.js') && i('outils/osteogamme-moteur.js') < i('cr-tools.js?'), 'données et moteur chargés avant les outils');
  const tools = fs.readFileSync(path.join(RACINE, 'cr-tools.js'), 'utf8');
  assert.match(tools, /osteogamme: OSTEOGAMME/);
  assert.match(tools, /OsteoGammeMoteur\(OGD\)/);
});

/* ---------- Aide à l'écriture des comptes rendus de radiographie (regles/osteogamme-cr.js) ---------- */
const vm = require('vm');
const ctxCR = {};
vm.runInNewContext(fs.readFileSync(path.join(RACINE, 'cr-data.js'), 'utf8') + ';this.T = CR_TEMPLATES;', ctxCR);
const modele = id => ctxCR.T.find(t => t.id === id).text;
const OGCR = require('../regles/osteogamme-cr.js');
const nouveauCR = () => OGCR.creer(D, OsteoGammeMoteur(D));
const rubrique = (texte, titre) => { const L = texte.split('\n'), i = L.indexOf(titre); const j = L.findIndex((l, k) => k > i && /^[A-ZÀ-Ý -]+ :$/.test(l)); return L.slice(i + 1, j < 0 ? L.length : j).filter(Boolean); };

test('radiographie du genou : la lésion remplace « Absence de lésion lytique… », masse des tissus mous, conclusion ajoutée', () => {
  const CR = nouveauCR();
  const st = { c: { ...D.EXAMPLES[1].s }, n: '3', cote: 'droit', reco: false };
  const r = CR.integrer(modele('rx-genou'), st);
  assert.equal(r.rubrique, 'COMPTE-RENDU');
  assert.equal(r.creee, true, 'le modèle n\'a pas de conclusion : rubrique ajoutée');
  assert.deepEqual(rubrique(r.texte, 'COMPTE-RENDU :'), [
    '• Minéralisation osseuse conservée.',
    '• Lésion osseuse unique de l\'extrémité distale du fémur droit, métaphysaire, centrale, de type III de Lodwick (perméative), à matrice ostéoïde, avec réaction périostée agressive (lamellaire, spicules ou triangle de Codman), avec masse des tissus mous.',
    '• Intégrité des interlignes articulaires.',
    '• Absence d\'épanchement intra-articulaire.',
    '• Masse des tissus mous en regard de la lésion.',
  ]);
  assert.deepEqual(rubrique(r.texte, 'CONCLUSION :'), [
    'Lésion osseuse unique de l\'extrémité distale du fémur droit, d\'allure agressive.',
    'Hypothèses diagnostiques : ostéosarcome en premier lieu ; à discuter : sarcome d’Ewing, ostéomyélite.',
  ]);
  assert.equal(CR.integrer(r.texte, st).texte, r.texte, 'réinsertion sans doublon');
  // Alertes au choix ; masse décochée : la phrase normale revient
  st.reco = true; st.c.masse = 'non';
  const r2 = CR.integrer(r.texte, st);
  assert.ok(rubrique(r2.texte, 'COMPTE-RENDU :').includes('• Intégrité des parties molles.'));
  assert.match(rubrique(r2.texte, 'CONCLUSION :').join('\n'), /Lésion d’allure agressive : compléter par l’IRM et le bilan d’extension/);
  assert.equal(CR.integrer(r2.texte, st).texte, r2.texte);
});

test('radiographie : rachis (lésions multiples, au pluriel), fragment tombé, cheville, compte rendu sans rubrique', () => {
  const CR = nouveauCR();
  const rachis = CR.integrer(modele('rx-rachis-lombaire-degeneratif'), { c: { ...D.EXAMPLES[2].s }, n: '3', cote: 'droit', reco: false }).texte;
  const corps = rubrique(rachis, 'COMPTE-RENDU :');
  assert.equal(corps[1], '• Lésions osseuses lytiques multiples du rachis, de type II de Lodwick (mitée), sans matrice minéralisée, sans réaction périostée.', 'pas de côté pour le rachis');
  assert.ok(!corps.some(l => /anomalie vertébrale/.test(l)), '« Pas d\'anomalie vertébrale » retiré');
  assert.match(rachis, /CONCLUSION :\nLésions osseuses lytiques multiples du rachis, d'allure agressive\.\nHypothèses diagnostiques : myélome \/ plasmocytome en premier lieu/);
  const bassin = CR.integrer(modele('rx-bassin'), { c: { age: '10-20', os: 'bassin', axe: 'centrale', lodwick: 'IA', signe: 'fragment' }, n: '1', cote: 'gauche', reco: false }).texte;
  assert.ok(rubrique(bassin, 'COMPTE-RENDU :').includes('• Fracture pathologique (signe du fragment tombé).'), '« Absence de fracture » remplacé');
  assert.match(bassin, /• Lésion osseuse lytique du bassin, à gauche, centrale, de type IA de Lodwick \(liseré scléreux\), avec signe du fragment tombé\./);
  const cheville = CR.integrer(modele('rx-cheville'), { c: { ...D.EXAMPLES[0].s, os: 'tibia' }, n: '1', cote: 'gauche', reco: false }).texte;
  const c = rubrique(cheville, 'COMPTE-RENDU :');
  assert.match(c[1], /^• Lésion osseuse lytique unique de l'extrémité distale du tibia gauche, épiphysaire/, 'sous la minéralisation');
  assert.ok(c.includes('• Absence de lésion osseuse traumatique visible.'), 'phrase non contredite gardée');
  assert.match(cheville, /Hypothèse diagnostique : tumeur à cellules géantes\.$/);
  assert.equal(CR.integrer('Patient de 15 ans.', { c: {}, n: '3', cote: '', reco: false }), null, 'sans rubrique : texte au curseur');
  assert.equal(CR.texte({ c: {}, n: '3', cote: '', reco: false }), '• Lésion osseuse lytique.\n• Hypothèses diagnostiques : [à compléter].');
  // Conclusion existante écrite par le radiologue : gardée
  const avecConclusion = CR.integrer('RADIOGRAPHIE\n\nCOMPTE-RENDU :\n• Absence de lésion lytique.\n\nCONCLUSION :\nComparaison avec 2024 souhaitable.', { c: { ...D.EXAMPLES[0].s }, n: '1', cote: '', reco: false });
  assert.equal(avecConclusion.creee, false);
  assert.match(avecConclusion.texte, /CONCLUSION :\nLésion osseuse lytique unique de l'extrémité distale du fémur\.\nHypothèse diagnostique : tumeur à cellules géantes\.\nComparaison avec 2024 souhaitable\.$/);
});
