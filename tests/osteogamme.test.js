/* Tests d'OsteoGamme (outils/) : cohérence des données (osteogamme-data.js) et de la page.
   La logique de calcul est reprise telle quelle de l'outil d'origine ; elle a été comparée
   à celui-ci dans Chromium sur plus de 3 000 combinaisons de critères (résultats identiques).
   Lancer : npm test   (ou : node --test tests/*.test.js) */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const D = require('../outils/osteogamme-data.js');

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
  assert.ok(html.indexOf('osteogamme-data.js') < html.indexOf('osteogamme.js?'), 'données chargées avant le moteur');
  const js = fs.readFileSync(path.join(RACINE, 'outils/osteogamme.js'), 'utf8');
  assert.match(js, /has\('admin'\)/, 'Pondérations avec ?admin');
  assert.match(js, /localhost/, 'Pondérations en local');
  assert.doesNotMatch(js, /^const (F|DX|BONUS|SITE|EXAMPLES)=/m, 'données seulement dans osteogamme-data.js');
});

test('menu : « Outils › OsteoGamme » sur toutes les pages du site', () => {
  const pages = ['index.html', 'comptes-rendus.html', 'fiches-rapides.html', 'bibliotheque.html', 'communaute.html', 'remplacements.html', 'mentions-legales.html', 'fiches/spondylodiscite.html', 'cours/ischio-jambiers.html', 'cas/schwannome-v3.html'];
  for (const p of pages) {
    const html = fs.readFileSync(path.join(RACINE, p), 'utf8');
    const pre = '../'.repeat(p.split('/').length - 1);
    assert.ok(html.includes(`<a href="${pre}outils/osteogamme" class="nav-groupe-titre">Outils`), `${p} : entrée Outils`);
    assert.ok(html.includes(`<a href="${pre}outils/osteogamme">OsteoGamme<small>`), `${p} : sous-menu OsteoGamme`);
  }
});
