#!/usr/bin/env node
/* =========================================================
   Prépare les fonctions serveur Supabase (npm run backend:preparer) :
   • copie le noyau partagé (remplacements/noyau/*.js) dans
     supabase/functions/_shared/noyau/ ;
   • regroupe les modèles d'e-mails et le modèle de contrat dans
     supabase/functions/_shared/modeles.js ;
   • écrit l'empreinte du code (supabase/functions/_shared/version.ts),
     renvoyée par chaque fonction dans l'en-tête x-rp-version : le
     diagnostic compare la version déployée à celle du dépôt.
   À relancer après toute modification du noyau ou des modèles, avant
   « supabase functions deploy ». Un test vérifie que les copies sont à jour.
   ========================================================= */
const fs = require('node:fs');
const path = require('node:path');

const racine = path.join(__dirname, '..');
const NOYAU = path.join(racine, 'remplacements', 'noyau');
const MODELES = path.join(racine, 'remplacements', 'modeles');
const CIBLE = path.join(racine, 'supabase', 'functions', '_shared');
const FICHIERS_NOYAU = ['referentiel.js', 'regles.js', 'recap.js', 'jetons.js', 'gabarits.js', 'ics.js', 'pdf.js', 'contrat.js', 'messagerie.js', 'moteur.js'];
const ENTETE = '// Fichier généré par scripts/preparer-backend.js — ne pas modifier ici (source : remplacements/).\n';

function contenus() {
  const out = {};
  FICHIERS_NOYAU.forEach(f => { out[path.join('noyau', f)] = ENTETE + fs.readFileSync(path.join(NOYAU, f), 'utf8'); });
  const emails = {};
  fs.readdirSync(path.join(MODELES, 'emails')).filter(f => f.endsWith('.html')).sort()
    .forEach(f => { emails[f.replace(/\.html$/, '')] = fs.readFileSync(path.join(MODELES, 'emails', f), 'utf8'); });
  const contrat = fs.readFileSync(path.join(MODELES, 'contrat.md'), 'utf8');
  out['modeles.js'] = `${ENTETE}export const MODELES = ${JSON.stringify({ emails, contrat }, null, 1)};\n`;
  out['version.ts'] = `${ENTETE}// Empreinte du code des fonctions (envoyée dans l'en-tête x-rp-version, lue par le diagnostic).\nexport const VERSION = '${version(out)}';\n`;
  return out;
}

/* Empreinte (12 caractères) de tout le code déployé : fichiers écrits à la main + fichiers générés ci-dessus. */
const ECRITS = ['agent.ts', 'depot-supabase.ts', 'reseau.ts', 'transport.ts', 'acces-taches.mjs', 'outils.mjs'];
const FONCTIONS = ['rp-agent', 'rp-lien', 'rp-taches'];
function version(generes) {
  const h = require('node:crypto').createHash('sha256');
  const fichiers = [
    ...Object.entries(generes).map(([f, c]) => [`_shared/${f.split(path.sep).join('/')}`, c]),
    ...ECRITS.map(f => [`_shared/${f}`, fs.readFileSync(path.join(CIBLE, f), 'utf8')]),
    ...FONCTIONS.map(f => [`${f}/index.ts`, fs.readFileSync(path.join(CIBLE, '..', f, 'index.ts'), 'utf8')]),
  ].sort(([a], [b]) => (a < b ? -1 : 1));
  for (const [f, c] of fichiers) h.update(`${f}\0${c}\0`);
  return h.digest('hex').slice(0, 12);
}
const versionAttendue = () => contenus()['version.ts'].match(/VERSION = '([0-9a-f]{12})'/)[1];

if (require.main === module) {
  const tout = contenus();
  fs.mkdirSync(path.join(CIBLE, 'noyau'), { recursive: true });
  Object.entries(tout).forEach(([f, c]) => fs.writeFileSync(path.join(CIBLE, f), c));
  console.log(`Fonctions serveur préparées : ${Object.keys(tout).length} fichiers dans supabase/functions/_shared/.`);
}
module.exports = { contenus, CIBLE, versionAttendue, FONCTIONS };
