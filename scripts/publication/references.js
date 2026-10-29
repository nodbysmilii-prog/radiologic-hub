/* =========================================================
   RadiologicHub — publication : relevé des références d'un fichier
   ---------------------------------------------------------
   Lit une page HTML, une feuille CSS ou un script et rend la liste des
   fichiers du site qu'il charge (chemins relatifs résolus) :
   • HTML : src, href, poster, srcset, data-*src, url() des styles en ligne,
     import et fetch des scripts en ligne ;
   • CSS : url() et @import ;
   • JS : import / export … from, import(), fetch(), new URL(), et chaînes
     qui ressemblent à un chemin de fichier du site (« faibles » : résolues
     seulement si le fichier existe dans le dépôt).
   Les liens externes (https:, data:, mailto:…) et les gabarits ${…} sont
   ignorés. Utilisé par scripts/publication/verifier.js.
   ========================================================= */
'use strict';
const path = require('node:path');

const EXTENSIONS = 'html|css|js|mjs|json|png|jpe?g|webp|gif|svg|ico|glb|gltf|bin|wasm|woff2?|ttf|otf|gz|u8|md|txt|pdf|mp4|webm|xml|webmanifest|dcm';
const RE_CHEMIN = new RegExp(`^[A-Za-z0-9_./-]+\\.(${EXTENSIONS})([?#].*)?$`, 'i');
const RE_CHAINE = /(['"`])((?:(?!\1)[^\\\n]|\\.){1,300})\1/g;

function nettoyer(ref) {
  if (!ref) return null;
  let r = ref.trim().replace(/&amp;/g, '&');
  if (!r || /^(?:[a-z][a-z0-9+.-]*:|\/\/|#|\$\{|\{\{)/i.test(r)) return null;   // externe, ancre, gabarit
  if (r.includes('${') || r.includes('{{')) return null;
  r = r.split(/[?#]/)[0];
  if (!r) return null;
  try { r = decodeURI(r); } catch (e) { /* laissé tel quel */ }
  return r;
}

/* Résout une référence par rapport à un dossier du site (chemins en « / »). */
function resoudre(ref, dossier) {
  const r = nettoyer(ref);
  if (!r) return null;
  const complet = r.startsWith('/') ? path.posix.normalize(r.slice(1)) : path.posix.normalize(path.posix.join(dossier, r));
  if (complet.startsWith('..')) return null;
  if (complet === '.' || complet === '') return 'index.html';
  return r.endsWith('/') ? `${complet.replace(/\/$/, '')}/index.html` : complet;
}

function depuisCss(texte) {
  const refs = [];
  for (const m of texte.matchAll(/url\(\s*(['"]?)([^'")]+)\1\s*\)/g)) refs.push({ ref: m[2], force: 'forte' });
  for (const m of texte.matchAll(/@import\s+(['"])([^'"]+)\1/g)) refs.push({ ref: m[2], force: 'forte' });
  return refs;
}

function depuisJs(texte) {
  const refs = [];
  const fortes = new Set();
  const modules = [
    /(?<![\w$.#'"-])(?:import|export)\s[^'"`;]*?\bfrom\s*(['"])([^'"\n]+)\1/g,
    /(?<![\w$.#'"-])import\s*(['"])([^'"\n]+)\1/g,
    /(?<![\w$.#'"-])import\s*\(\s*(['"`])([^'"`\n]+)\1/g,
  ];
  const appels = [
    /\bfetch\s*\(\s*(['"`])([^'"`\n]+)\1/g,
    /\bnew\s+URL\s*\(\s*(['"`])([^'"`\n]+)\1/g,
  ];
  // Un import « nu » (ex. « three ») passe par l'importmap de la page, relevée dans le HTML.
  for (const re of modules) for (const m of texte.matchAll(re)) {
    fortes.add(m[2]);
    refs.push({ ref: m[2], force: 'forte', js: true, module: true, nu: !/^(?:\.{1,2}\/|\/)/.test(m[2]) });
  }
  for (const re of appels) for (const m of texte.matchAll(re)) { fortes.add(m[2]); refs.push({ ref: m[2], force: 'forte', js: true }); }
  for (const m of texte.matchAll(RE_CHAINE)) {
    const s = m[2];
    if (fortes.has(s) || !RE_CHEMIN.test(s) || !s.includes('/')) continue;
    refs.push({ ref: s, force: 'faible', js: true });
  }
  return refs;
}

function depuisHtml(texte) {
  const refs = [];
  for (const m of texte.matchAll(/\s(?:src|href|poster)\s*=\s*(["'])([^"']*)\1/gi)) refs.push({ ref: m[2], force: 'forte' });
  // data-atlas, data-modele… : chemin probable, vérifié s'il existe dans le dépôt
  for (const m of texte.matchAll(/\sdata-[a-z0-9-]+\s*=\s*(["'])([^"']*)\1/gi)) if (RE_CHEMIN.test(m[2]) && m[2].includes('/')) refs.push({ ref: m[2], force: 'faible' });
  for (const m of texte.matchAll(/\ssrcset\s*=\s*(["'])([^"']*)\1/gi)) {
    m[2].split(',').forEach(x => { const u = x.trim().split(/\s+/)[0]; if (u) refs.push({ ref: u, force: 'forte' }); });
  }
  for (const m of texte.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)) refs.push(...depuisCss(m[1]));
  for (const m of texte.matchAll(/\sstyle\s*=\s*(["'])([^"']*)\1/gi)) refs.push(...depuisCss(m[2]));
  for (const m of texte.matchAll(/<script(?![^>]*\ssrc=)([^>]*)>([\s\S]*?)<\/script>/gi)) {
    if (/type\s*=\s*["']?importmap/i.test(m[1])) {
      try { Object.entries(JSON.parse(m[2]).imports || {}).forEach(([cle, u]) => refs.push({ ref: u, cle, force: 'forte', dossier: u.endsWith('/') })); } catch (e) { /* importmap illisible */ }
    } else refs.push(...depuisJs(m[2]));
  }
  return refs;
}

/* references('dossier/page.html', texte) → [{ ref, force: 'forte' | 'faible', js, module, nu, cle, dossier }]
   (non résolues ; nu = import par nom, résolu par l'importmap ; cle = entrée de l'importmap) */
function references(fichier, texte) {
  const ext = path.extname(fichier).toLowerCase();
  if (ext === '.html' || ext === '.htm') return depuisHtml(texte);
  if (ext === '.css') return depuisCss(texte);
  if (ext === '.js' || ext === '.mjs') return depuisJs(texte);
  return [];
}

module.exports = { references, resoudre, nettoyer };
