#!/usr/bin/env node
/* =========================================================
   Génère cours/ischio-jambiers/A-VERIFIER.md : pour chaque schéma de
   coupe et chaque modèle 3D, ce qui est représenté, sa version et les
   incertitudes anatomiques à vérifier.
   Source unique : schemas/ischio-jambiers.js et
   public/models/ischio-jambiers/manifest.json (ne pas modifier le
   fichier généré à la main : corriger les données, puis relancer).
   Usage : node scripts/a_verifier.js
   ========================================================= */
const fs = require('fs');
const path = require('path');
const S = require('../schemas/ischio-jambiers.js');

const RACINE = path.join(__dirname, '..');
const SORTIE = path.join(RACINE, 'cours', 'ischio-jambiers', 'A-VERIFIER.md');
const MANIFESTE = path.join(RACINE, 'public', 'models', 'ischio-jambiers', 'manifest.json');

const INCERTITUDES_3D = [
  'Diamètres d\'affichage des nerfs, calés sur des valeurs réalistes APPROXIMATIVES : sciatique 11 mm au tiers moyen de la cuisse, tibial 5 mm et fibulaire commun 3,5 mm dans la fosse poplitée (valeurs mesurées après export dans le tableau ci-dessus). Section ronde, alors que le nerf sciatique est plutôt aplati.',
  'Vaisseaux : épaisseurs du pack Z-Anatomy, non modifiées.',
  'Parties tendineuses des muscles : délimitées par le pack (BodyParts3D). Le modèle ne distingue ni le tendon conjoint du tendon du semi-membraneux, ni les cloisons internes : ces repères sont portés par les schémas 2D.',
  'Un seul modèle anatomique (BodyParts3D, homme adulte) : proportions, longueur des tendons et trajet du nerf sciatique à comparer à vos images.',
  'Tibia et fibula coupés 12 cm sous le sommet du tibia (tête fibulaire incluse) ; os coxal droit seul pour le bassin.',
  'Simplification : 20 % des triangles retirés pour la longue portion du biceps et le semi-membraneux ; formes à vérifier de près dans la visionneuse.',
];

function generer() {
  const manifeste = JSON.parse(fs.readFileSync(MANIFESTE, 'utf8'));
  const L = [];
  L.push('# À vérifier — ischio-jambiers (cours « Échoanatomie musculaire du membre inférieur »)', '');
  L.push('> Fichier **généré** par `node scripts/a_verifier.js` à partir de `schemas/ischio-jambiers.js` et de `public/models/ischio-jambiers/manifest.json`. Pour corriger : modifier les données, puis relancer le script.');
  L.push('> Chaque schéma et chaque modèle porte une **version** : la validation dans l\'administration s\'applique à une version ; toute modification la remet « À valider ».', '');
  L.push('## Conventions communes aux 6 schémas', '');
  L.push('- Coupes **transversales**, patient en **décubitus ventral**, sonde sur la face postérieure de la cuisse.');
  L.push('- Par défaut, **médial à gauche** de l\'écran, en attendant d\'aligner les schémas sur l\'orientation de vos images ; bouton « Inverser gauche/droite ». Repères **M / L** (médial / latéral) et **S / P** (superficiel, côté sonde / profond) sur chaque schéma ; point orange = repère de la sonde, côté gauche de l\'écran.');
  L.push('- Code commun : ' + S.LEGENDE.map(l => l.texte.toLowerCase()).join(' ; ') + '.');
  L.push('- Proportions schématiques (environ 68 px par cm) : épaisseurs et profondeurs indicatives, variables selon la morphologie.', '');
  for (const s of S.SCHEMAS) {
    L.push(`## ${s.court} — ${s.titre} (version \`${S.version(s.id)}\`)`, '');
    L.push(`Niveau : ${s.niveau} · tiers ${s.tiers}${s.note ? ` · ${s.note}` : ''}`, '');
    L.push('**Ce qui est représenté**', '');
    s.represente.forEach(r => L.push(`- ${r}`));
    L.push('', '**Étiquettes** (numéros de la version téléphone)', '');
    S.etiquettesNumerotees(s.id).forEach(e => L.push(`${e.n}. ${e.texte}`));
    L.push('', '**Incertitudes à vérifier**', '');
    s.incertitudes.forEach(i => L.push(`- [ ] ${i}`));
    L.push('');
  }
  L.push(`## Modèles 3D (${manifeste.modeles.length} fichiers, ${(manifeste.total_octets / 1048576).toFixed(2)} Mo, ${manifeste.licence})`, '');
  L.push('| Fichier | Structure | Version | Modifications |', '|---|---|---|---|');
  manifeste.modeles.forEach(m => L.push(`| \`${m.fichier}\` | ${m.nom} | \`${m.version}\` | ${m.modifications.join(' ; ') || '—'} |`));
  L.push('', '**Incertitudes à vérifier**', '');
  INCERTITUDES_3D.forEach(i => L.push(`- [ ] ${i}`));
  L.push('');
  return L.join('\n');
}

if (require.main === module) {
  fs.mkdirSync(path.dirname(SORTIE), { recursive: true });
  fs.writeFileSync(SORTIE, generer());
  console.log(`${path.relative(RACINE, SORTIE)} écrit.`);
}

module.exports = { generer, SORTIE };
