#!/usr/bin/env node
'use strict';
/* =========================================================
   Installe la visionneuse OHIF de l'Espace DICOM, à version figée.
   1. télécharge @ohif/app (npm) dans assets-sources/ohif/ (ignoré par
      git) et vérifie son empreinte sha512 ;
   2. copie l'application déjà construite (dist/) SANS les modules
      inutiles : IA de segmentation (ort/, 136 Mo), microscopie (20 Mo),
      cartes de sources (.map), service worker et pages de connexion
      d'OHIF, configuration de démonstration d'OHIF ;
   3. applique trois correctifs vérifiés (chacun doit trouver exactement
      ce qu'il attend, sinon l'installation s'arrête) :
      • chemin-public : OHIF charge ses morceaux depuis son propre dossier
        (il les cherchait à la racine du site) ;
      • police : adresse relative de la police de l'interface ;
      • blob-meme-origine : la source « dicomjson » accepte une liste
        d'images en adresse blob: du MÊME site (mode démonstration :
        examens gardés dans le navigateur) ; rien d'autre n'est ouvert ;
   4. écrit index.html, app-config.js et theme-radiologichub.css (couleurs
      du site) de l'Espace DICOM, et la LICENSE.
   Sortie : dicom/ohif/ (ignoré par git ; publié seulement sur la
   branche d'aperçu, et servi par Nginx sur le serveur).
   Usage : node espace-dicom/visionneuse/installer-ohif.js [--sortie <dossier>]
   ========================================================= */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');

const VERSION = '3.13.12';
const INTEGRITE = 'sha512-dFVGcssmFaxK+FvEUwsV+bt69SNn8mARj1NJbeU++hOrdXgw4qpEGV//nD3LGvtj5vcNbMK+Tr34H5EGdqcmGQ==';
const RACINE = path.join(__dirname, '..', '..');
const ICI = __dirname;
const EXCLUS_DOSSIERS = new Set(['ort', 'dicom-microscopy-viewer']);
const EXCLUS_FICHIERS = new Set(['index.html', 'app-config.js', 'sw.js', 'init-service-worker.js', 'google.js', 'oidc-client.min.js',
  'silent-refresh.html', '_headers', '_redirects', 'serve.json', 'manifest.json']);

/* Correctifs : [nom, fichiers concernés (filtre), avant, après, nombre attendu] */
const CHEMIN_PUBLIC = '__webpack_require__.p = "/";';
const CHEMIN_PUBLIC_CORRIGE = '__webpack_require__.p = (typeof window !== "undefined" && window.PUBLIC_URL) || '
  + '(typeof self !== "undefined" && self.location ? self.location.href.replace(/[^\\/?#]*([?#].*)?$/, "") : "/");';
const PROTOCOLE = "if (!['http:', 'https:'].includes(protocol)) {";
const PROTOCOLE_CORRIGE = "if (!['http:', 'https:'].includes(protocol) && !(protocol === 'blob:' && isSameOrigin)) {";

function appliquer(texte, avant, apres) {
  const n = texte.split(avant).length - 1;
  return { texte: texte.split(avant).join(apres), n };
}

function telecharger() {
  const cache = path.join(RACINE, 'assets-sources', 'ohif');
  const archive = path.join(cache, `ohif-app-${VERSION}.tgz`);
  fs.mkdirSync(cache, { recursive: true });
  if (!fs.existsSync(archive)) {
    console.log(`Téléchargement de @ohif/app@${VERSION} (environ 50 Mo)…`);
    execFileSync('npm', ['pack', `@ohif/app@${VERSION}`, '--pack-destination', cache, '--silent'], { stdio: ['ignore', 'ignore', 'inherit'] });
  }
  const empreinte = 'sha512-' + crypto.createHash('sha512').update(fs.readFileSync(archive)).digest('base64');
  if (empreinte !== INTEGRITE) throw new Error(`empreinte inattendue pour ${archive} : ${empreinte}`);
  const extrait = path.join(cache, `extrait-${VERSION}`);
  if (!fs.existsSync(path.join(extrait, 'package', 'dist', 'app-config.js'))) {
    fs.rmSync(extrait, { recursive: true, force: true });
    fs.mkdirSync(extrait, { recursive: true });
    execFileSync('tar', ['xzf', archive, '-C', extrait]);
  }
  return path.join(extrait, 'package');
}

function copier(source, cible) {
  fs.mkdirSync(cible, { recursive: true });
  for (const e of fs.readdirSync(source, { withFileTypes: true })) {
    if (e.isDirectory()) {
      if (!EXCLUS_DOSSIERS.has(e.name)) copier(path.join(source, e.name), path.join(cible, e.name));
    } else if (!EXCLUS_FICHIERS.has(e.name) && !e.name.endsWith('.map')) {
      fs.copyFileSync(path.join(source, e.name), path.join(cible, e.name));
    }
  }
}

function installer(sortie) {
  const paquet = telecharger();
  const dist = path.join(paquet, 'dist');
  const indexOrigine = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
  const bundle = (/src="\/(app\.bundle\.[0-9a-f]+\.js)"/.exec(indexOrigine) || [])[1];
  if (!bundle) throw new Error('app.bundle introuvable dans index.html');

  fs.rmSync(sortie, { recursive: true, force: true });
  copier(dist, sortie);

  const rapport = [];
  // chemin-public : app.bundle et chaque script de travail (workers)
  let total = 0;
  for (const f of fs.readdirSync(sortie).filter(x => x.endsWith('.js'))) {
    const p = path.join(sortie, f);
    const r = appliquer(fs.readFileSync(p, 'utf8'), CHEMIN_PUBLIC, CHEMIN_PUBLIC_CORRIGE);
    if (r.n) { fs.writeFileSync(p, r.texte); total += r.n; }
  }
  if (total < 2 || !fs.readFileSync(path.join(sortie, bundle), 'utf8').includes(CHEMIN_PUBLIC_CORRIGE)) throw new Error(`correctif chemin-public : ${total} occurrence(s)`);
  rapport.push(`chemin-public : ${total} fichiers`);
  // police de l'interface
  const css = path.join(sortie, 'app.bundle.css');
  const rc = appliquer(fs.readFileSync(css, 'utf8'), 'url(/', 'url(');
  if (rc.n < 1 || /url\(\/[^/]/.test(rc.texte)) throw new Error('correctif police : adresse absolue restante');
  fs.writeFileSync(css, rc.texte);
  rapport.push(`police : ${rc.n} adresse(s)`);
  // blob: du même site pour la source dicomjson
  let blob = 0;
  for (const f of fs.readdirSync(sortie).filter(x => x.endsWith('.js'))) {
    const p = path.join(sortie, f);
    const texte = fs.readFileSync(p, 'utf8');
    if (!texte.includes(PROTOCOLE)) continue;
    const r = appliquer(texte, PROTOCOLE, PROTOCOLE_CORRIGE);
    fs.writeFileSync(p, r.texte);
    blob += r.n;
  }
  if (blob !== 1) throw new Error(`correctif blob-meme-origine : ${blob} occurrence(s) au lieu de 1`);
  rapport.push('blob-meme-origine : 1');

  fs.writeFileSync(path.join(sortie, 'index.html'),
    fs.readFileSync(path.join(ICI, 'index.html.modele'), 'utf8').replace('{{BUNDLE}}', bundle).replace('{{VERSION}}', VERSION));
  fs.copyFileSync(path.join(ICI, 'app-config.js'), path.join(sortie, 'app-config.js'));
  fs.copyFileSync(path.join(ICI, 'theme-radiologichub.css'), path.join(sortie, 'theme-radiologichub.css'));
  fs.copyFileSync(path.join(paquet, 'LICENSE'), path.join(sortie, 'LICENSE'));
  fs.writeFileSync(path.join(sortie, 'VERSION.txt'),
    `OHIF Viewer @ohif/app ${VERSION} (licence MIT, voir LICENSE)\n${INTEGRITE}\nCorrectifs : ${rapport.join(' ; ')}\n`
    + 'Préparé par espace-dicom/visionneuse/installer-ohif.js : ne pas modifier à la main.\n');
  return { bundle, rapport };
}

if (require.main === module) {
  const i = process.argv.indexOf('--sortie');
  const sortie = path.resolve(i > 0 ? process.argv[i + 1] : path.join(RACINE, 'dicom', 'ohif'));
  const r = installer(sortie);
  const taille = execFileSync('du', ['-sh', sortie]).toString().split('\t')[0];
  console.log(`OHIF ${VERSION} installé dans ${path.relative(process.cwd(), sortie) || sortie} (${taille}) — ${r.rapport.join(' ; ')}`);
}

module.exports = { installer, appliquer, CHEMIN_PUBLIC, CHEMIN_PUBLIC_CORRIGE, PROTOCOLE, PROTOCOLE_CORRIGE, VERSION };
