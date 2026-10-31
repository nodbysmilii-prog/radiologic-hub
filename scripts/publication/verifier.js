#!/usr/bin/env node
/* =========================================================
   RadiologicHub — publication : vérification du dossier dist/
   ---------------------------------------------------------
   1. Aucun fichier interdit (liste INTERDITS, contenus réservés aux
      abonnés) n'est présent dans dist/.
   2. Aucun secret : chaque jeton JWT trouvé doit être une clé publique
      « anon » ; aucune clé privée, clé Brevo, Resend, Stripe ou jeton
      GitHub / Supabase / Cloudflare.
   3. Dépendances complètes : en partant de chaque page HTML, toutes les
      ressources référencées (scripts, styles, images, modèles 3D, JSON…)
      existent dans dist/. Une référence absente de dist/ mais présente
      dans le dépôt = oubli de la liste blanche (erreur) ; absente des
      deux = lien déjà cassé dans le dépôt (simple avertissement).
   Lancer : node scripts/publication/verifier.js [dist]   (code 1 si erreur)
   ========================================================= */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { references, resoudre, nettoyer } = require('./references.js');
const LB = require('./liste-blanche.js');

const RACINE = path.join(__dirname, '..', '..');

/* « **​/*.md » → expression régulière sur le chemin relatif. */
function motif(glob) {
  let re = '';
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === '*' && glob[i + 1] === '*') { re += glob[i + 2] === '/' ? '(?:.*/)?' : '.*'; i += glob[i + 2] === '/' ? 2 : 1; }
    else if (c === '*') re += '[^/]*';
    else if (c === '?') re += '[^/]';
    else re += c.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp(`^${re}$`);
}
const correspond = (motifs, f) => motifs.some(m => motif(m).test(f));

function lister(dossier, base = '') {
  const out = [];
  for (const e of fs.readdirSync(path.join(dossier, base), { withFileTypes: true })) {
    const rel = base ? `${base}/${e.name}` : e.name;
    if (e.isDirectory()) out.push(...lister(dossier, rel));
    else if (e.isFile()) out.push(rel);
  }
  return out;
}

/* ---------- Secrets ---------- */
const SECRETS = [
  [/-----BEGIN (?:RSA |EC |OPENSSH |)PRIVATE KEY-----/, 'clé privée'],
  [/\bsb_secret_[A-Za-z0-9_-]{10,}/, 'clé secrète Supabase'],
  [/\bsbp_[a-f0-9]{30,}/, 'jeton d\'accès Supabase'],
  [/\bxkeysib-[a-f0-9]{20,}/, 'clé API Brevo'],
  [/\bxsmtpsib-[a-f0-9]{20,}/, 'clé SMTP Brevo'],
  [/\bre_[A-Za-z0-9]{8,}_[A-Za-z0-9]{16,}/, 'clé API Resend'],
  [/\b(?:sk|rk)_live_[A-Za-z0-9]{16,}/, 'clé secrète Stripe'],
  [/\bgh[pousr]_[A-Za-z0-9]{36,}/, 'jeton GitHub'],
  [/\bgithub_pat_[A-Za-z0-9_]{40,}/, 'jeton GitHub'],
  [/\bAKIA[0-9A-Z]{16}\b/, 'clé AWS'],
  [/\bAIza[0-9A-Za-z_-]{35}\b/, 'clé API Google'],
  [/\bGOCSPX-[A-Za-z0-9_-]{20,}/, 'secret OAuth Google'],
  [/service_role["']?\s*[:=]\s*["']eyJ/, 'clé service_role'],
];
const TEXTE = /\.(?:html|css|js|mjs|json|txt|md|xml|svg|webmanifest|jsonc|map)$/i;

function secretsDe(fichier, texte) {
  const trouves = [];
  for (const [re, nom] of SECRETS) if (re.test(texte)) trouves.push(nom);
  for (const m of texte.matchAll(/\beyJ[A-Za-z0-9_-]{10,}\.(eyJ[A-Za-z0-9_-]{10,})\.[A-Za-z0-9_-]{10,}/g)) {
    let role = null;
    try { role = JSON.parse(Buffer.from(m[1], 'base64url').toString('utf8')).role; } catch (e) { /* illisible */ }
    if (role !== 'anon') trouves.push(`jeton JWT (rôle « ${role || 'inconnu'} »)`);
  }
  return trouves.map(t => `${fichier} : ${t}`);
}

/* ---------- Dépendances ---------- */
function verifierDependances(dist, presents) {
  const existeDist = f => presents.has(f);
  const existeSource = f => { try { return fs.statSync(path.join(RACINE, f)).isFile(); } catch (e) { return false; } };
  const erreurs = [], avertissements = [];
  const vus = new Set();
  const file = [];
  for (const f of presents) if (/\.html?$/i.test(f) && !f.startsWith('dicom/ohif/')) file.push({ f, page: f, carte: null });

  // Cherche la cible parmi les dossiers candidats ; « page » sans extension → page.html (adresses propres).
  const chercher = (ref, dossiers, existe) => {
    for (const d of dossiers) {
      const x = resoudre(ref, d);
      if (!x) continue;
      for (const c of [x, `${x}.html`, `${x.replace(/\/?$/, '/')}index.html`]) if (existe(c.replace(/^\//, ''))) return c.replace(/^\//, '');
    }
    return null;
  };

  while (file.length) {
    const { f, page, carte } = file.pop();
    const cle = `${f}|${page}`;
    if (vus.has(cle)) continue;
    vus.add(cle);
    if (!/\.(?:html?|css|m?js)$/i.test(f) || f.startsWith('dicom/ohif/')) continue;   // OHIF : paquet tiers construit, publié en entier
    const texte = fs.readFileSync(path.join(dist, f), 'utf8');
    const dossier = path.posix.dirname(f), dossierPage = path.posix.dirname(page);
    const refs = references(f, texte);
    const importmap = /\.html?$/i.test(f)
      ? refs.filter(r => r.cle).map(r => [r.cle, r.dossier ? (resoudre(r.ref, dossier) || '').replace(/index\.html$/, '') : resoudre(r.ref, dossier)])
      : carte;

    for (const r of refs) {
      if (!r.nu && !nettoyer(r.ref)) continue;   // lien externe, ancre, gabarit ${…}
      let ref = r.ref;
      if (r.nu) {   // import « three/addons/… » : résolu par l'importmap de la page
        const e = (importmap || []).find(([k]) => (k.endsWith('/') ? ref.startsWith(k) : ref === k));
        if (!e || !e[1]) continue;
        ref = '/' + (e[0].endsWith('/') ? e[1] + ref.slice(e[0].length) : e[1]);
      }
      if (r.dossier) continue;   // préfixe d'importmap (dossier) : vérifié via les imports qui l'utilisent
      // Script : import → relatif au script ; fetch / chaîne → relatif à la page qui l'exécute.
      const dossiers = r.js ? (r.module ? [dossier] : [dossierPage, dossier, '.']) : [dossier];
      const cible = chercher(ref, dossiers, existeDist);
      if (cible) {
        file.push({ f: cible, page: /\.html?$/i.test(cible) ? cible : page, carte: /\.html?$/i.test(cible) ? null : importmap });
        continue;
      }
      const source = chercher(ref, dossiers, existeSource);
      const ou = `${f}${f !== page ? ` (page ${page})` : ''} → ${r.ref}`;
      if (source && correspond(LB.RESERVE_ABONNES, source)) avertissements.push(`réservé aux abonnés, non publié : ${ou}`);
      else if (source && r.force === 'forte') erreurs.push(`absent de dist/ (ajouter à la liste blanche ?) : ${ou}`);
      else if (source && !correspond(LB.EXCLUSIONS, source)) erreurs.push(`absent de dist/ : ${ou}`);
      else if (!source && r.force === 'forte') avertissements.push(`déjà absent du dépôt : ${ou}`);
    }
  }
  return { erreurs, avertissements };
}

function verifier(dist) {
  const fichiers = lister(dist);
  const presents = new Set(fichiers);
  const erreurs = [];
  for (const f of fichiers) {
    if (correspond(LB.INTERDITS, f)) erreurs.push(`fichier interdit publié : ${f}`);
    if (correspond(LB.RESERVE_ABONNES, f)) erreurs.push(`contenu réservé aux abonnés publié : ${f}`);
    if (TEXTE.test(f) && fs.statSync(path.join(dist, f)).size < 30 * 1024 * 1024) erreurs.push(...secretsDe(f, fs.readFileSync(path.join(dist, f), 'utf8')).map(s => `secret possible : ${s}`));
  }
  const dep = verifierDependances(dist, presents);
  return { fichiers: fichiers.length, erreurs: [...erreurs, ...dep.erreurs], avertissements: dep.avertissements };
}

if (require.main === module) {
  const dist = path.resolve(process.argv[2] || path.join(RACINE, 'dist'));
  if (!fs.existsSync(dist)) { console.error(`Dossier introuvable : ${dist} (lancer d'abord npm run publication)`); process.exit(2); }
  const r = verifier(dist);
  r.avertissements.forEach(a => console.log(`  ⚠ ${a}`));
  r.erreurs.forEach(e => console.log(`  ✗ ${e}`));
  console.log(r.erreurs.length ? `Vérification ÉCHOUÉE : ${r.erreurs.length} erreur(s), ${r.fichiers} fichiers.` : `Vérification réussie : ${r.fichiers} fichiers, aucun fichier interdit ni secret, dépendances complètes (${r.avertissements.length} avertissement(s)).`);
  process.exit(r.erreurs.length ? 1 : 0);
}

module.exports = { verifier, motif, correspond, lister, secretsDe };
