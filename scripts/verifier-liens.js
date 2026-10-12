#!/usr/bin/env node
/* =========================================================
   RadiologicHub — vérification des liens internes des pages HTML
   ---------------------------------------------------------
   Pour chaque attribut href / src relatif : le fichier visé existe
   (adresse sans « .html » ou dossier avec index.html acceptés, comme
   sur GitHub Pages) ; une ancre #id existe dans la page visée
   (id, name ou data-spe des onglets ; les ancres « #clé=valeur »
   lues par les scripts sont acceptées).
   Lancer : npm run liens            (tout le site)
            node scripts/verifier-liens.js pelvis fiches-rapides.html
   ========================================================= */
'use strict';

const fs = require('fs');
const path = require('path');

const RACINE = path.join(__dirname, '..');
const EXCLUS = new Set(['.git', 'node_modules', 'vendor', 'assets-sources', 'supabase', 'tests']);

function pagesHtml(cible = RACINE) {
  const st = fs.statSync(cible);
  if (st.isFile()) return cible.endsWith('.html') ? [cible] : [];
  return fs.readdirSync(cible, { withFileTypes: true }).flatMap(e => {
    if (EXCLUS.has(e.name) || e.name.startsWith('.')) return [];
    const p = path.join(cible, e.name);
    return e.isDirectory() ? pagesHtml(p) : e.name.endsWith('.html') ? [p] : [];
  });
}

const cache = new Map();
const lire = f => { if (!cache.has(f)) cache.set(f, fs.readFileSync(f, 'utf8')); return cache.get(f); };
const sansCommentaires = h => h.replace(/<!--[\s\S]*?-->/g, '').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, m => (/\ssrc=/.test(m.slice(0, m.indexOf('>'))) ? m.slice(0, m.indexOf('>') + 1) : ''));

/* Fichier réellement servi pour un chemin (comme GitHub Pages) */
function resoudre(p) {
  if (fs.existsSync(p) && fs.statSync(p).isFile()) return p;
  if (fs.existsSync(p) && fs.statSync(p).isDirectory() && fs.existsSync(path.join(p, 'index.html'))) return path.join(p, 'index.html');
  if (!path.extname(p) && fs.existsSync(p + '.html')) return p + '.html';
  return null;
}

function ancreExiste(html, a) {
  if (a.includes('=')) return true;                       // paramètres lus par les scripts (#modele=…)
  const e = a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`\\s(id|name|data-spe)="${e}"`).test(html);
}

function verifier(fichiers, attentes = []) {
  const problemes = [];
  for (const f of fichiers) {
    const html = sansCommentaires(lire(f));
    for (const m of html.matchAll(/\s(href|src)="([^"]*)"/g)) {
      const url = m[2].replace(/&amp;/g, '&');
      if (!url || /^(https?:|mailto:|tel:|javascript:|data:|\/\/)/i.test(url) || url.includes('{{')) continue;   // modèles d'e-mails : variables
      const [chemin, ancre] = url.split('#');
      const sansParam = chemin.split('?')[0];
      const rel = path.relative(RACINE, f);
      if (!sansParam) {
        if (ancre && !ancreExiste(html, ancre)) problemes.push(`${rel} : ancre #${ancre} absente de la page`);
        continue;
      }
      const cible = resoudre(path.resolve(path.dirname(f), decodeURIComponent(sansParam)));
      if (!cible) {
        // Emplacement d'image d'exemple pas encore fourni (bouton .ex-img) : masqué par fiche.js, signalé à part
        if (m[1] === 'src' && /class="ex-img"[^<]*<img[^>]*$/.test(html.slice(Math.max(0, m.index - 300), m.index))) { attentes.push(`${rel} : image d'exemple en attente « ${url} »`); continue; }
        problemes.push(`${rel} : lien cassé « ${url} »`);
        continue;
      }
      if (ancre && cible.endsWith('.html') && !ancreExiste(lire(cible), ancre)) problemes.push(`${rel} : ancre #${ancre} absente de ${path.relative(RACINE, cible)}`);
    }
  }
  return problemes;
}

module.exports = { verifier, pagesHtml, resoudre };

if (require.main === module) {
  const args = process.argv.slice(2).filter(a => !a.startsWith('--'));
  const fichiers = (args.length ? args.map(a => path.resolve(RACINE, a)) : [RACINE]).flatMap(p => pagesHtml(p));
  const attentes = [];
  const problemes = verifier(fichiers, attentes);
  if (process.argv.includes('--details') || process.env.DETAILS) attentes.forEach(p => console.log(p));
  problemes.forEach(p => console.log(p));
  console.log(`${fichiers.length} pages vérifiées, ${problemes.length} problème(s)${attentes.length ? ` ; ${attentes.length} image(s) d'exemple en attente (masquées sur le site ; détail : --details)` : ''}.`);
  process.exit(problemes.length ? 1 : 0);
}
