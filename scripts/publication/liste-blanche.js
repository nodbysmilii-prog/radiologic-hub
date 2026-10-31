/* =========================================================
   RadiologicHub — publication : LISTE BLANCHE du site public
   ---------------------------------------------------------
   Seuls les fichiers désignés ici sont copiés dans dist/ (le dossier mis
   en ligne). Tout le reste du dépôt (scripts, tests, migrations SQL,
   fonctions serveur, documentation, CLAUDE.md, workflows…) n'est jamais
   publié.
   ► Nouvelle page à la racine ou nouveau dossier du site : l'ajouter ici,
     puis lancer « npm run publication » (la vérification signale tout
     fichier référencé par une page mais absent de dist/).
   Motifs : « * » = un nom de fichier, « ** » = n'importe quels dossiers.
   ========================================================= */
'use strict';

/* Fichiers de la racine publiés (pages, styles et scripts communs). */
const FICHIERS = [
  'index.html', '404.html', 'mentions-legales.html', 'robots.txt', 'sitemap.xml',
  'comptes-rendus.html', 'suivi-oncologique.html', 'fiches-rapides.html',
  'bibliotheque.html', 'bibliotheque-admin.html',
  'communaute.html', 'remplacements.html', 'remplacements-reponse.html',
  'espace-dicom.html', 'espace-dicom-visionneuse.html',
  'styles.css', 'finition.css', 'fiche.css', 'cr.css', 'cr-tools.css', 'suivi.css', 'quiz-tableau.css',
  'navigation.js', 'script.js', 'fiche.js', 'cr.js', 'cr-data.js', 'cr-tools.js', 'cr-vrac.js', 'suivi.js', 'quiz-tableau.js',
];

/* Dossiers publiés en entier (sauf EXCLUSIONS ci-dessous). */
const DOSSIERS = [
  'assets', 'fiches', 'cas', 'cours', 'radioanatomie', 'outils', 'regles', 'schemas', 'suivi',
  'dictee', 'assistant', 'vendor', 'public', 'dicom', 'bibliotheque', 'reseau', 'remplacements',
];

/* Exceptions explicites : fichiers publiés bien qu'un motif d'exclusion les vise. */
const EXCEPTIONS = [
  'remplacements/modeles/contrat.md',   // lu par la page pour produire le contrat PDF
];

/* Jamais publiés, même dans un dossier de la liste blanche. */
const EXCLUSIONS = [
  // Documentation, notes et code de préparation
  '**/*.md', '**/README*', '**/*.py', '**/*.ipynb', '**/*.sh', '**/*.sql', '**/*.ts', '**/*.toml', '**/*.lock',
  '**/*.test.js', '**/tests/**', '**/__pycache__/**', '**/.gitignore', '**/.DS_Store',
  // Secrets et configurations privées (ne doivent pas exister, filet de sécurité)
  '**/.env', '**/.env.*', '**/*.pem', '**/*.key', '**/*.p12', '**/secrets*',
  // Remplacements : le moteur de mise en relation et la démonstration restent côté serveur
  // (fonctions Supabase). La page publiée utilise Supabase (remplacements/config.js renseigné).
  'remplacements/INSTALLATION.md',
  'remplacements/noyau/moteur.js', 'remplacements/noyau/depot-memoire.js',
  'remplacements/noyau/messagerie.js', 'remplacements/noyau/jetons.js',
  'remplacements/api-demo.js', 'remplacements/demo.js',
  'remplacements/modeles/emails/**', 'remplacements/modeles/supabase/**',
  // Radioanatomie : repères posés à la main pour construire les atlas (données de préparation)
  'radioanatomie/donnees/*/reperes-source/**', 'radioanatomie/donnees/*/reperes-manuels/**',
];

/* Scripts retirés des pages publiées (fichiers exclus ci-dessus). Chaque balise doit
   être trouvée une fois exactement, sinon la construction s'arrête. */
const SCRIPTS_RETIRES = {
  'remplacements.html': [
    'remplacements/noyau/jetons.js', 'remplacements/noyau/messagerie.js', 'remplacements/noyau/moteur.js',
    'remplacements/noyau/depot-memoire.js', 'remplacements/api-demo.js', 'remplacements/demo.js',
  ],
  'remplacements-reponse.html': [
    'remplacements/noyau/jetons.js', 'remplacements/noyau/messagerie.js', 'remplacements/noyau/moteur.js',
    'remplacements/noyau/depot-memoire.js', 'remplacements/api-demo.js',
  ],
};

/* Fichiers propres à l'hébergeur (Cloudflare Pages), copiés à la racine de dist/. */
const HEBERGEUR = ['_headers', '_redirects'];

/* Contrôle final : aucun de ces chemins ne doit exister dans dist/ (indépendant des règles
   ci-dessus : protège contre une erreur dans la liste blanche). */
const INTERDITS = [
  'CLAUDE.md', 'README.md', 'package.json', 'deno.lock', 'CNAME', '.nojekyll',
  '.git/**', '.github/**', 'supabase/**', 'scripts/**', 'tests/**', 'docs/**', 'espace-dicom/**', 'assets-sources/**',
  '**/*.sql', '**/*.py', '**/*.ts', '**/*.sh', '**/*.toml', '**/.env', '**/.env.*', '**/*.pem', '**/*.key',
  '**/INSTALLATION.md', 'remplacements/noyau/moteur.js', 'remplacements/noyau/jetons.js',
  'remplacements/api-demo.js', 'remplacements/modeles/emails/**',
];

/* Contenus réservés aux abonnés (voir docs/organisation/PUBLICATION.md) : vide tant que l'auteur
   n'a pas choisi. Un chemin listé ici n'est JAMAIS publié ; il doit être servi par Supabase
   (stockage privé « premium », droits vérifiés côté serveur). */
const RESERVE_ABONNES = [];

module.exports = { FICHIERS, DOSSIERS, EXCEPTIONS, EXCLUSIONS, SCRIPTS_RETIRES, HEBERGEUR, INTERDITS, RESERVE_ABONNES };
