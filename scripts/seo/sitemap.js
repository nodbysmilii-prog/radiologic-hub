#!/usr/bin/env node
/* =========================================================
   Radiologic Hub — sitemap.xml des fiches rapides publiques (SEO)
   ---------------------------------------------------------
   • Source : les cartes « a.fiche-card » de fiches-rapides.html (seules les fiches réellement
     publiées) ; ajoute l'accueil et la page des fiches rapides.
   • <lastmod> : seulement si la fiche déclare <meta property="article:modified_time"> (date
     tenue à jour à la main, jamais une date de commit : une date fausse est pire que pas de date).
   • Adresses avec « .html » : c'est la forme servie aujourd'hui (GitHub Pages) ; si Cloudflare Pages
     devient l'hébergeur, passer SANS_EXTENSION à true ET changer les <link rel="canonical"> des fiches
     (le test tests/seo-fiches.test.js vérifie que les deux restent d'accord).
   Écrire :   node scripts/seo/sitemap.js          (ou : npm run sitemap)
   Vérifier : node scripts/seo/sitemap.js --verifier
   Rapport :  node scripts/seo/sitemap.js --rapport  (fiches qui n'ont pas encore leur SEO)
   Bibliothèque standard uniquement. Voir docs/organisation/SEO_FICHES.md.
   ========================================================= */
'use strict';
const fs = require('fs');
const path = require('path');

const RACINE = path.join(__dirname, '..', '..');
const BASE = 'https://radiologichub.com';
const SANS_EXTENSION = false;

const url = chemin => {
  let c = chemin.replace(/\\/g, '/');
  if (c === 'index.html') return BASE + '/';
  if (SANS_EXTENSION) c = c.replace(/\.html$/, '');
  return BASE + '/' + c;
};

const echapper = t => String(t).replace(/[<>&"']/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[c]));
const lire = f => fs.readFileSync(path.join(RACINE, f), 'utf8');

/* Fiches publiées = cartes de l'index qui pointent vers fiches/*.html */
function fichesPubliees() {
  const html = lire('fiches-rapides.html');
  const liens = [...html.matchAll(/<a class="fiche-card"[^>]*href="(fiches\/[a-z0-9-]+\.html)"/g)].map(m => m[1]);
  return [...new Set(liens)].sort();
}

const meta = (html, re) => { const m = html.match(re); return m ? m[1] : ''; };
const dateModifiee = f => meta(lire(f), /<meta property="article:modified_time" content="(\d{4}-\d{2}-\d{2})"/);

function construire() {
  const pages = ['index.html', 'fiches-rapides.html', ...fichesPubliees()];
  const lignes = pages.map(p => {
    const d = p.startsWith('fiches/') ? dateModifiee(p) : '';
    return `  <url>\n    <loc>${echapper(url(p))}</loc>${d ? `\n    <lastmod>${d}</lastmod>` : ''}\n  </url>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${lignes.join('\n')}\n</urlset>\n`;
}

/* Rapport : où en est le SEO de chaque fiche (titre, description, canonical, JSON-LD, Open Graph) */
function rapport() {
  return fichesPubliees().map(f => {
    const h = lire(f);
    return {
      fiche: f,
      titre: meta(h, /<title>([^<]*)<\/title>/),
      description: meta(h, /<meta name="description" content="([^"]*)"/),
      canonical: meta(h, /<link rel="canonical" href="([^"]*)"/),
      jsonld: /<script type="application\/ld\+json">/.test(h),
      og: /<meta property="og:image"/.test(h),
      date: meta(h, /<meta property="article:modified_time" content="([^"]*)"/),
    };
  });
}

module.exports = { BASE, SANS_EXTENSION, url, fichesPubliees, construire, rapport };

if (require.main === module) {
  const arg = process.argv[2];
  if (arg === '--rapport') {
    const r = rapport();
    const pret = r.filter(x => x.canonical && x.jsonld && x.og && x.date);
    r.forEach(x => console.log(`${x.canonical && x.jsonld && x.og && x.date ? '✔' : '·'} ${x.fiche}${x.canonical ? '' : '  (pas de canonical)'}${x.jsonld ? '' : '  (pas de JSON-LD)'}${x.og ? '' : '  (pas d\'Open Graph)'}${x.date ? '' : '  (pas de date de mise à jour)'}`));
    console.log(`\n${pret.length} fiche(s) prête(s) sur ${r.length}.`);
  } else if (arg === '--verifier') {
    const actuel = fs.existsSync(path.join(RACINE, 'sitemap.xml')) ? lire('sitemap.xml') : '';
    if (actuel !== construire()) { console.error('sitemap.xml n\'est pas à jour : lancer « npm run sitemap ».'); process.exit(1); }
    console.log('sitemap.xml à jour.');
  } else {
    fs.writeFileSync(path.join(RACINE, 'sitemap.xml'), construire());
    console.log(`sitemap.xml écrit (${fichesPubliees().length} fiches).`);
  }
}
