/* Tests du référencement (SEO) des fiches rapides publiques : robots.txt, sitemap.xml et, pour chaque
   fiche qui déclare son <link rel="canonical">, titre, description, canonical, titres H1 à H4, JSON-LD,
   Open Graph, date de mise à jour, liens internes, accès libre. Voir docs/organisation/SEO_FICHES.md.
   Lancer : npm test   (ou : node --test tests/seo-fiches.test.js) */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const S = require('../scripts/seo/sitemap.js');
const RACINE = path.join(__dirname, '..');
const lire = f => fs.readFileSync(path.join(RACINE, f), 'utf8');
const pretes = S.fichesPubliees().filter(f => /<link rel="canonical"/.test(lire(f)));

test('robots.txt et sitemap.xml : présents, à jour, publiés', () => {
  const robots = lire('robots.txt');
  assert.match(robots, /^Sitemap: https:\/\/radiologichub\.com\/sitemap\.xml$/m);
  assert.doesNotMatch(robots, /^Disallow: *\/ *$/m);
  assert.equal(lire('sitemap.xml'), S.construire(), 'sitemap.xml périmé : lancer npm run sitemap');
  const liste = require('../scripts/publication/liste-blanche.js');
  assert.ok(liste.FICHIERS.includes('robots.txt') && liste.FICHIERS.includes('sitemap.xml'));
  const locs = [...lire('sitemap.xml').matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
  assert.equal(new Set(locs).size, locs.length, 'adresses en double');
  locs.forEach(l => assert.match(l, /^https:\/\/radiologichub\.com\//));
});

test('la fiche « Masses hépatiques solides » est prête pour Google', () => {
  assert.ok(pretes.includes('fiches/masses-hepatiques.html'));
  assert.match(lire('sitemap.xml'), /fiches\/masses-hepatiques\.html<\/loc>\s*<lastmod>2026-10-31<\/lastmod>/);
});

for (const f of pretes) {
  test(`SEO ${f}`, () => {
    const h = lire(f);
    const titre = h.match(/<title>([^<]*)<\/title>/)[1];
    const desc = h.match(/<meta name="description" content="([^"]*)"/)[1];
    const canon = h.match(/<link rel="canonical" href="([^"]*)"/)[1];
    assert.ok(titre.length >= 20 && titre.length <= 70, `titre de ${titre.length} caractères`);
    assert.match(titre, /Radiologic Hub$/);
    assert.ok(desc.length >= 70 && desc.length <= 160, `description de ${desc.length} caractères`);
    assert.equal(canon, S.url(f), 'canonical ≠ adresse du sitemap');
    assert.doesNotMatch(h, /<meta name="robots" content="[^"]*noindex/);
    assert.match(h, /<html lang="fr">/);
    assert.match(h, /<meta name="viewport" content="width=device-width, initial-scale=1">/);
    // Open Graph / Twitter
    for (const p of ['og:title', 'og:description', 'og:url', 'og:image', 'og:type']) assert.match(h, new RegExp(`<meta property="${p}"`), p);
    assert.match(h, /<meta property="og:url" content="[^"]*"/);
    assert.equal(h.match(/<meta property="og:url" content="([^"]*)"/)[1], canon);
    const img = h.match(/<meta property="og:image" content="([^"]*)"/)[1];
    assert.ok(fs.existsSync(path.join(RACINE, img.replace(S.BASE + '/', ''))), 'image de partage absente');
    // date de mise à jour = meta = JSON-LD
    const date = h.match(/<meta property="article:modified_time" content="(\d{4}-\d{2}-\d{2})"/)[1];
    assert.match(h, new RegExp(`<time datetime="${date}">`));
    // JSON-LD : valide, adresse et date cohérentes, éditeur identifié, accès libre déclaré
    const blocs = [...h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m => JSON.parse(m[1]));
    const page = blocs.flat().find(b => b['@type'] === 'MedicalWebPage');
    assert.ok(page, 'MedicalWebPage manquant');
    assert.equal(page.url, canon);
    assert.equal(page.dateModified, date);
    assert.equal(page.isAccessibleForFree, true);
    assert.equal(page.publisher.name, 'Radiologic Hub');
    assert.equal(page.inLanguage, 'fr');
    const fil = blocs.flat().find(b => b['@type'] === 'BreadcrumbList');
    assert.equal(fil.itemListElement.at(-1).item, canon);
    // hiérarchie des titres : un seul H1, aucun niveau sauté
    const sansScripts = h.replace(/<script[\s\S]*?<\/script>/g, '');
    const niveaux = [...sansScripts.matchAll(/<h([1-4])[\s>]/g)].map(m => +m[1]);
    assert.equal(niveaux.filter(n => n === 1).length, 1, 'un seul H1');
    niveaux.forEach((n, i) => { if (i) assert.ok(n <= niveaux[i - 1] + 1, `niveau sauté avant le titre n° ${i + 1} (h${niveaux[i - 1]} → h${n})`); });
    // liens internes : le fichier visé existe
    const dir = path.dirname(path.join(RACINE, f));
    for (const m of h.matchAll(/<a [^>]*href="([^"#:]+)(#[^"]*)?"/g)) {
      const cible = path.join(dir, m[1]);
      assert.ok(fs.existsSync(cible), `lien interne cassé : ${m[1]}`);
    }
    // accès libre : aucune connexion, aucun appel à Supabase ou au réseau social
    assert.doesNotMatch(h, /supabase|reseau\/|auth\.js|signInWith|localStorage\.setItem\('rh-token/i);
    // mention de droits et date visibles
    assert.match(h, /© Radiologic Hub — Tous droits réservés/);
    assert.match(h, /Fiche gratuite, sans inscription/);
  });
}

test('fiche « Masses hépatiques solides » : références vérifiées, passerelle, liens internes', () => {
  const h = lire('fiches/masses-hepatiques.html');
  for (const doi of ['10.1148/radiol.2018181494', '10.1016/j.jhep.2016.04.001', '10.1016/j.jhep.2018.03.019']) {
    assert.match(h, new RegExp(`href="https://doi\\.org/${doi.replace(/[./]/g, '\\$&')}"`), doi);
  }
  // année visible, lectures complémentaires et non sources du cours
  assert.match(h, /<li><b>2018<\/b> — Chernyak/);
  assert.match(h, /<li><b>2016<\/b> — European/);
  assert.match(h, /<li><b>2018<\/b> — European/);
  assert.match(h, /Lectures complémentaires publiées en 2016 et 2018/);
  assert.match(h, /Ce ne sont pas les sources originales du cours/);
  assert.match(h, /<aside class="fp-suite"/);
  assert.match(h, /comptes-rendus\.html#modele=tdm-abdo-pelvienne-injectee/);
  // le modèle visé existe vraiment dans l'éditeur
  assert.match(lire('cr-data.js'), /id: 'tdm-abdo-pelvienne-injectee'/);
  assert.match(h, /href="adenocarcinome-pancreas\.html"/);
  assert.match(h, /href="irm-cancer-rectum\.html"/);
  // la passerelle n'annonce ni prix ni abonnement tant que l'offre n'est pas décidée
  const suite = h.match(/<aside class="fp-suite"[\s\S]*?<\/aside>/)[0];
  assert.doesNotMatch(suite, /abonn|premium|payant|€|prix|tarif/i);
});
