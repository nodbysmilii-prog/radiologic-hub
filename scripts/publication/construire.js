#!/usr/bin/env node
/* =========================================================
   RadiologicHub — publication : construction du dossier dist/
   ---------------------------------------------------------
   npm run publication   (commande de construction de Cloudflare Pages)
   • copie dans dist/ les seuls fichiers de la liste blanche
     (scripts/publication/liste-blanche.js), suivis par git ;
   • retire des pages publiées les balises des scripts non publiés
     (démonstration et moteur des Remplacements) ;
   • ajoute _headers et _redirects (scripts/publication/cloudflare/) ;
   • lance la vérification (scripts/publication/verifier.js) : la
     construction échoue si un fichier interdit, un secret ou une
     dépendance manquante est détecté — le site en ligne reste alors
     sur la version précédente.
   Aucune dépendance à installer (Node 18 ou plus).
   ========================================================= */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const LB = require('./liste-blanche.js');
const { verifier, correspond } = require('./verifier.js');

const RACINE = path.join(__dirname, '..', '..');
const DIST = path.join(RACINE, 'dist');
const HEBERGEUR = path.join(__dirname, 'cloudflare');

/* Fichiers suivis par git (jamais un fichier local oublié : .env, captures…). */
function fichiersDuDepot() {
  try {
    return execFileSync('git', ['ls-files', '-z'], { cwd: RACINE, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
      .split('\0').filter(Boolean);
  } catch (e) {
    throw new Error('git ls-files a échoué : la construction doit se faire dans une copie git du dépôt.');
  }
}

function selection(fichiers) {
  const dossiers = LB.DOSSIERS.map(d => `${d}/`);
  return fichiers.filter(f => {
    if (correspond(LB.RESERVE_ABONNES, f)) return false;
    if (LB.EXCEPTIONS.includes(f)) return true;
    if (!LB.FICHIERS.includes(f) && !dossiers.some(d => f.startsWith(d))) return false;
    return !correspond(LB.EXCLUSIONS, f);
  });
}

/* La page publiée des Remplacements fonctionne sans la démonstration seulement si Supabase est configuré. */
function verifierConfigurationSupabase() {
  const cfg = fs.readFileSync(path.join(RACINE, 'remplacements', 'config.js'), 'utf8');
  const url = /supabaseUrl\s*:\s*'https:\/\/[a-z0-9-]+\.supabase\.co'/.test(cfg);
  const cle = /supabaseAnonKey\s*:\s*'eyJ[^']{20,}'/.test(cfg);
  if (!url || !cle) {
    throw new Error('remplacements/config.js n\'est pas renseigné : sans Supabase, les pages Remplacements ont besoin de la démonstration, '
      + 'qui n\'est pas publiée. Renseigner config.js ou retirer les règles « Remplacements » de liste-blanche.js.');
  }
}

function retirerScripts(fichier, html) {
  let sortie = html;
  for (const src of LB.SCRIPTS_RETIRES[fichier] || []) {
    const re = new RegExp(`[ \\t]*<script src="${src.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:\\?v=[^"]*)?"></script>\\r?\\n?`, 'g');
    const n = (sortie.match(re) || []).length;
    if (n !== 1) throw new Error(`${fichier} : balise <script src="${src}"> trouvée ${n} fois (1 attendue) — mettre à jour SCRIPTS_RETIRES.`);
    sortie = sortie.replace(re, '');
  }
  return sortie;
}

function construire({ silencieux = false, dist = DIST } = {}) {
  const journal = silencieux ? () => {} : console.log;
  verifierConfigurationSupabase();
  const choisis = selection(fichiersDuDepot()).filter(f => fs.existsSync(path.join(RACINE, f)));
  const manquants = LB.FICHIERS.filter(f => !choisis.includes(f));
  if (manquants.length) throw new Error(`Fichiers de la liste blanche absents du dépôt : ${manquants.join(', ')}`);

  fs.rmSync(dist, { recursive: true, force: true });
  let octets = 0;
  for (const f of choisis) {
    const cible = path.join(dist, f);
    fs.mkdirSync(path.dirname(cible), { recursive: true });
    if (LB.SCRIPTS_RETIRES[f]) fs.writeFileSync(cible, retirerScripts(f, fs.readFileSync(path.join(RACINE, f), 'utf8')));
    else fs.copyFileSync(path.join(RACINE, f), cible);
    octets += fs.statSync(cible).size;
  }
  for (const f of LB.HEBERGEUR) fs.copyFileSync(path.join(HEBERGEUR, f), path.join(dist, f));

  // Limites de Cloudflare Pages (offre gratuite) : 20 000 fichiers, 25 Mio par fichier.
  const tropGros = choisis.filter(f => fs.statSync(path.join(dist, f)).size > 25 * 1024 * 1024);
  if (tropGros.length) throw new Error(`Fichiers de plus de 25 Mio (refusés par Cloudflare Pages) : ${tropGros.join(', ')}`);
  if (choisis.length > 20000) throw new Error(`${choisis.length} fichiers : plus que les 20 000 acceptés par Cloudflare Pages.`);

  journal(`dist/ construit : ${choisis.length + LB.HEBERGEUR.length} fichiers, ${(octets / 1024 / 1024).toFixed(1)} Mo.`);
  const r = verifier(dist);
  r.avertissements.forEach(a => journal(`  ⚠ ${a}`));
  r.erreurs.forEach(e => console.error(`  ✗ ${e}`));
  if (r.erreurs.length) throw new Error(`Vérification échouée : ${r.erreurs.length} erreur(s). Rien n'est publié.`);
  journal(`Vérification réussie : aucun fichier interdit ni secret, dépendances complètes (${r.avertissements.length} avertissement(s)).`);
  return { fichiers: choisis, verification: r };
}

if (require.main === module) {
  try { construire(); } catch (e) { console.error(`✗ ${e.message}`); process.exit(1); }
}

module.exports = { construire, selection, retirerScripts, DIST };
