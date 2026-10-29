# Publication, hébergement et sécurité (suivi)

> Mis à jour le 29/10/2026. Module transversal : ce qui est mis en ligne, où, comment revenir en arrière, et ce qui protège le dépôt et les contenus. À lire avant toute modification de `scripts/publication/`, `.github/workflows/`, de l'hébergement, du domaine ou des contenus réservés aux abonnés.

## Principe (à retenir)

- Le **dépôt** contient tout (site, scripts, SQL, fonctions serveur, tests, documentation). **Seul le dossier `dist/`** est mis en ligne.
- `dist/` est produit par **`npm run publication`** (`scripts/publication/construire.js`) à partir d'une **liste blanche** : `scripts/publication/liste-blanche.js`. Ce qui n'y figure pas n'est jamais publié.
- La construction **s'arrête** (et rien n'est publié) si : un fichier interdit est présent, un secret est détecté (seule la clé publique « anon » est acceptée), une page référence un fichier du dépôt absent de `dist/`, un contenu réservé aux abonnés est présent.
- **Nouvelle page à la racine ou nouveau dossier du site** → l'ajouter à `FICHIERS` ou `DOSSIERS` de la liste blanche (le test `tests/publication.test.js` le rappelle).
- Hébergement préparé : **Cloudflare Pages** (gratuit), branche de production `claude/radiologichub-website-ss89g9`, commande `npm run publication`, dossier `dist`. En ligne aujourd'hui : **GitHub Pages** (toujours actif tant que le dépôt est public).
- **Tant que le dépôt GitHub est public, tout le dépôt reste lisible sur github.com** (code, SQL, documentation, historique). La liste blanche ne protège réellement qu'une fois le dépôt **privé** (étape 6 ci-dessous).

| Commande | Rôle |
|---|---|
| `npm run publication` | Construit `dist/` et le vérifie (commande de Cloudflare Pages) |
| `npm run publication:verifier` | Revérifie un `dist/` existant |
| `npm test` | Tests unitaires, dont `tests/publication.test.js` (liste blanche, secrets, construction complète) |
| `npm run test:publication` | Playwright : `dist/` servi par l'émulateur officiel Cloudflare Pages (wrangler, version figée), ordinateur + téléphone, comparaison avec le site actuel, fichiers internes en 404, redirections, en-têtes, Supabase simulé |
| `npm run test:sql` | Droits Supabase sur PostgreSQL local, dont les abonnements (`tests/sql/rls-abonnements.js`) |

## Réalisé (29/10/2026, branche `claude/bold-planck-b0m279`)

- **Publication par liste blanche** : 1 760 fichiers publiés sur 2 472 suivis ; **non publiés** : `scripts/` (520), `tests/` (71), `supabase/` (migrations SQL, fonctions serveur), `docs/`, `espace-dicom/` (serveur), `.github/`, `CLAUDE.md`, `README.md`, `package.json`, `CNAME`, `.nojekyll`, `deno.lock`, `remplacements/INSTALLATION.md`, les README des images de fiches, les repères manuels de préparation des atlas (`radioanatomie/donnees/*/reperes-source|reperes-manuels`).
- **Moteur de mise en relation des Remplacements non publié** : la page de production fonctionne avec Supabase (`remplacements/config.js` renseigné) ; le moteur (`remplacements/noyau/moteur.js`), les jetons signés (`jetons.js`), la messagerie, le dépôt en mémoire, la démonstration (`api-demo.js`, `demo.js`) et les modèles d'e-mails ne sont plus envoyés au navigateur (balises `<script>` retirées des pages publiées, pages sources inchangées). Le moteur ne tourne que dans les fonctions serveur Supabase (`supabase/functions/_shared/noyau/`). Si `config.js` était vidé, la construction s'arrêterait au lieu de publier une page cassée.
- **Page 404** (`404.html`, liens absolus) : indispensable sur Cloudflare (sinon toute adresse inconnue renverrait l'accueil avec un code 200).
- **En-têtes** (`scripts/publication/cloudflare/_headers`) : `nosniff`, interdiction d'afficher le site dans le cadre d'un autre site, HSTS, permissions (micro autorisé pour la dictée), page de réponse aux e-mails sans `Referer` (jeton jamais transmis) et non indexée, administration de la bibliothèque non indexée, adresse `*.pages.dev` non indexée.
- **Redirections** (`_redirects`) : anciennes pages supprimées le 12/10/2026 (`cours-admin.html`, `cours/ischio-jambiers.html`).
- **Abonnements préparés (non appliqués à la base réelle)** : migration `supabase/migrations/20261030090000_abonnements.sql` — `ab_abonnements` (saisis par l'administrateur), `ab_est_abonne()`, `ab_contenus` (textes réservés), stockage **privé** `premium` (URL signées). Vérifié par `tests/sql/rls-abonnements.js` : visiteur, membre sans abonnement, abonnement expiré → rien ; abonné en cours et administrateur → lecture ; écriture → administrateur seul. `RESERVE_ABONNES` (liste blanche) exclut définitivement du site public tout chemin réservé.
- **Contrôle automatique sur GitHub** : `.github/workflows/verifier-site.yml` (chaque Pull Request et la branche principale ; lecture seule, aucun secret) — tests, construction de `dist/`, droits SQL.
- **Tests** : 429 tests unitaires, `npm run test:sql`, Playwright 59/59 sur la version publiée servie par l'émulateur Cloudflare (56 pages × 2 appareils sans régression par rapport au site actuel ; 717 fichiers internes testés : tous en 404).

## Ce qui reste accessible publiquement

| Élément | Pourquoi | Que faire |
|---|---|---|
| **Tout le dépôt sur github.com** (code, SQL, fonctions serveur, documentation, historique depuis le 04/10/2026) | Dépôt public | Le rendre privé (étape 6). Ce qui a déjà été lu ou copié ne peut pas être repris (aucune copie « fork » sur GitHub au 29/10/2026). |
| Pages et code des outils exécutés dans le navigateur : éditeur et **42 comptes rendus types et leurs phrases** (`cr-data.js`, `cr-tools.js`, `regles/vrac.js`, `dictee/`, `assistant/`), **calculateurs** (`regles/`, `outils/`, `suivi/`), **fiches** (`fiches/`, `assets/fiches/`), **cas** (`cas/`, `assets/cas/`), **radioanatomie** (atlas, coupes, données), **cours du coude**, **modèles 3D** (`public/models/`), Espace DICOM (OHIF) | Un site statique doit envoyer au navigateur ce qu'il affiche | Choisir les contenus réservés (liste ci-dessous) puis les déplacer dans Supabase |
| Code client de la Communauté, de la Bibliothèque et des Remplacements (interface, règles de validation des formulaires, modèle de contrat `contrat.md`) | Nécessaire au fonctionnement | Rien : les **données** restent protégées par les droits d'accès par ligne de Supabase |
| Adresse du projet Supabase et clé publique « anon » (`remplacements/config.js`) | Faites pour être publiques | Rien (la sécurité repose sur les droits d'accès par ligne, testés) |

## Contenus candidats à l'abonnement (choix de l'auteur, rien n'est encore réservé)

| Contenu | Fichiers | Migration possible |
|---|---|---|
| Comptes rendus types et phrases automatiques | `cr-data.js` (118 Ko), parties de `cr-tools.js`, `regles/vrac.js` | Textes réservés → table `ab_contenus` (JSON) chargée après connexion ; les modèles gratuits restent dans le fichier public. Le code de l'éditeur reste public. |
| Fiches rapides complètes | `fiches/*.html`, `fiches/<thème>/`, `assets/fiches/` | Version publique résumée + contenu complet dans `ab_contenus` / images dans `premium` |
| Atlas de radioanatomie (coupes et étiquettes) | `radioanatomie/donnees/genou-irm/`, `thorax-tdm/` (≈ 29 Mo) | Coupes et `atlas.json` → stockage `premium`, URL signées ; le moteur `atlas-coupes.js` reste public |
| Cas cliniques, cours, modèles 3D | `cas/`, `assets/cas/`, `cours/`, `public/models/` | Images et données → `premium` ; licences des modèles 3D à respecter (CC BY-SA : redistribution permise, réserver l'accès reste possible) |

Procédure le jour venu (une rubrique à la fois) : 1) l'auteur choisit ; 2) migration `…_abonnements.sql` appliquée (autorisation) ; 3) les fichiers sont envoyés dans `premium` / `ab_contenus` (script dédié avec la clé `service_role`, lancé hors GitHub ou dans une fonction serveur) ; 4) les chemins sont ajoutés à `RESERVE_ABONNES` ; 5) la page charge le contenu via Supabase après connexion (`sb.rpc('ab_est_abonne')`, `sb.from('ab_contenus')`, `sb.storage.from('premium').createSignedUrl(…, 300)`) et affiche sinon un aperçu. **Un bouton masqué ou un contrôle JavaScript ne protège rien** : seule la base décide.

## Mise en production (opérations à autoriser, regroupées)

Ordre impératif : rien n'est basculé tant que l'étape précédente n'est pas validée. Aucune opération ne demande de mot de passe ni de jeton dans la conversation.

1. **Fusionner la Pull Request** de cette branche (sans effet sur le site en ligne : GitHub Pages continue de servir la branche principale ; `404.html` et `.node-version` y sont simplement ajoutés).
2. **Créer le projet Cloudflare Pages** (≈ 10 min, compte Cloudflare gratuit) : *Workers & Pages → Create → Pages → Connect to Git* → GitHub : autoriser l'application Cloudflare **sur ce seul dépôt** (*Only select repositories → radiologic-hub*) → réglages :
   - Project name : `radiologichub` (adresse technique `https://radiologichub.pages.dev`) ;
   - Production branch : `claude/radiologichub-website-ss89g9` ;
   - Framework preset : *None* ; Build command : `npm run publication` ; Build output directory : `dist` ; Root directory : vide ; aucune variable (Node 22 lu dans `.node-version`) ;
   - après la création : *Settings → Builds → Branch control* → **Preview branches : None** (évite de publier les branches de travail sur des adresses `*.pages.dev` et d'épuiser les 500 constructions mensuelles gratuites).
3. **Vérifier l'adresse `*.pages.dev`** : pour que Claude la teste automatiquement (Playwright, mêmes contrôles que `npm run test:publication`), autoriser le domaine `radiologichub.pages.dev` dans les réglages réseau de l'environnement Claude Code. Connexion de test : ajouter **temporairement** `https://radiologichub.pages.dev/**` aux *Redirect URLs* de Supabase (*Authentication → URL Configuration*). Si la variable `RP_ORIGINE` des fonctions limite les origines, les boutons qui appellent les fonctions ne marcheront qu'une fois le vrai domaine basculé (normal).
4. **Bascule du domaine** (modification DNS, autorisation explicite) :
   1. Cloudflare → *Add a domain* → `radiologichub.com` → offre *Free* → **contrôler les enregistrements importés** avec ceux affichés chez Spaceship (garder tout : A/AAAA de GitHub Pages, CNAME `www`, MX, TXT ; les futurs enregistrements **Brevo** — SPF, DKIM, DMARC — s'ajouteront ici en mode *DNS only*, nuage gris). Laisser les enregistrements du site en *DNS only* pour l'instant : le site reste servi par GitHub Pages.
   2. Spaceship → domaine → *Nameservers* → remplacer par les **deux serveurs indiqués par Cloudflare** ; attendre « Active » (quelques minutes à 24 h, sans coupure : les mêmes enregistrements sont servis).
   3. Cloudflare → *Security/Scrape Shield* : **désactiver Email Address Obfuscation** (réécrit les adresses e-mail des pages) ; *Speed* : laisser **Rocket Loader désactivé** ; *SSL/TLS → Edge Certificates* : *Always Use HTTPS* activé.
   4. Projet Pages → *Custom domains* → ajouter `radiologichub.com` puis `www.radiologichub.com` (Cloudflare remplace lui-même les enregistrements). **C'est la bascule.** Puis *Rules → Redirect Rules* → modèle « Redirect from WWW to root » (`www` → `https://radiologichub.com`, 301, chemin et paramètres conservés).
5. **Supabase** (*Authentication → URL Configuration*) : *Site URL* `https://radiologichub.com` ; *Redirect URLs* : `https://radiologichub.com/**` (indispensable : Cloudflare sert les pages sans `.html`, par ex. `/bibliotheque`) ; retirer l'adresse `*.pages.dev` temporaire. Vérifier que le secret `RP_URL_SITE` des fonctions vaut `https://radiologichub.com` (liens des e-mails ; les anciens liens en `.html` restent valables, redirigés avec leurs paramètres). Les sessions déjà ouvertes sont conservées (même domaine).
6. **Rendre le dépôt privé** (au plus tôt une semaine après la bascule, une fois tout vérifié) : *Settings → General → Danger Zone → Change visibility → Private*. Conséquences : GitHub Pages s'arrête (le site reste servi par Cloudflare, qui garde l'accès au dépôt) ; Claude Code continue de fonctionner ; GitHub Actions : 2 000 minutes gratuites par mois ; **les environnements protégés de GitHub ne sont plus disponibles en offre gratuite** (voir « Sécurité GitHub »).

## Retour arrière

| Situation | Retour arrière (immédiat) |
|---|---|
| Étapes 1 à 3 | Aucun effet sur le site en ligne. Supprimer le projet Cloudflare si besoin ; retirer l'adresse `*.pages.dev` des *Redirect URLs*. |
| Une mise à jour Cloudflare pose problème | Projet Pages → *Deployments* → version précédente → **Rollback to this deployment** (instantané). Une construction en échec ne remplace jamais la version en ligne. |
| Après la bascule (4.4), revenir à GitHub Pages (dépôt encore public) | Projet Pages → *Custom domains* → retirer `radiologichub.com` et `www` ; DNS Cloudflare → recréer en *DNS only* : A `@` → `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153` ; AAAA `@` → `2606:50c0:8000::153`, `2606:50c0:8001::153`, `2606:50c0:8002::153`, `2606:50c0:8003::153` ; CNAME `www` → `nodbysmilii-prog.github.io`. Le fichier `CNAME` est conservé dans le dépôt pour cela. |
| Revenir aux serveurs DNS de Spaceship | Spaceship → *Nameservers* → serveurs par défaut de Spaceship (leurs enregistrements n'ont pas été modifiés). |
| Après le passage en privé | Le retour à GitHub Pages exige de repasser le dépôt en public (ou un abonnement GitHub Pro) ; le retour arrière Cloudflare reste instantané. |
| Abonnements (le jour où la migration est appliquée) | Les tables `ab_*` et le seau `premium` sont indépendants des autres modules : `drop table ab_contenus, ab_abonnements; drop function ab_est_abonne();` (après sauvegarde) ; retirer les chemins de `RESERVE_ABONNES` pour republier les fichiers. |

## Sécurité GitHub (constats du 29/10/2026)

- **Historique analysé** (395 commits, toutes les branches) : **aucun secret réel**. Trouvés : valeurs de test (`secret-de-test`, `jeton-github-fictif`…), modèles (`RP_SECRET=<longue-chaîne-aléatoire>`), la clé publique « anon » (publique par nature). **Aucune rotation obligatoire.** Par précaution seulement : régénérer le jeton `SUPABASE_ACCESS_TOKEN` s'il a été copié ailleurs que dans les secrets GitHub.
- **Adresse e-mail personnelle** visible dans les métadonnées de 95 commits (auteur) : sans risque technique ; pour les prochains, *GitHub → Settings → Emails → Keep my email addresses private*.
- **Workflows de la branche principale** : `deployer-fonctions.yml` (manuel, secret `SUPABASE_ACCESS_TOKEN`) fonctionnera en dépôt privé (les secrets du dépôt restent disponibles). `verifier-site.yml` (ajouté) : aucun secret, lecture seule.
- **Branche `claude/exploitation-supabase` (examinée, non fusionnée)** : ses deux workflows exigent un environnement GitHub `supabase-production` avec **relecteur obligatoire** et branche autorisée, vérifiés avant tout accès au secret. **En offre GitHub gratuite, les environnements n'existent pas pour un dépôt privé** (et les relecteurs obligatoires en dépôt privé demandent GitHub Enterprise) : après le passage en privé, ces deux workflows refuseraient **toujours** de s'exécuter. Avant de fusionner cette branche **et** de rendre le dépôt privé : remplacer le contrôle d'environnement par un **secret de dépôt** + lancement manuel + contrôles déjà présents (propriétaire, branche principale), en acceptant que la protection repose sur « seuls l'auteur et Claude ont le droit d'écrire ». À faire dans la session qui porte cette branche.
- **Jetons au strict nécessaire** : Cloudflare Pages relié par l'application GitHub officielle → **aucun jeton Cloudflare dans GitHub**. `SUPABASE_ACCESS_TOKEN` : s'il s'agit d'un ancien jeton « Legacy », il donne accès à **tout le compte** Supabase ; le remplacer par un jeton **limité au projet** `wdbczcwnaxfnoioyukgr` et aux seuls droits nécessaires (Edge Functions en lecture-écriture pour le déploiement), **avec expiration courte** (procédure détaillée dans `remplacements/INSTALLATION.md` de la branche `claude/exploitation-supabase`), le garder **uniquement** pour le déploiement des fonctions, et ne jamais mettre dans GitHub la clé `service_role`, la clé Brevo/Resend ni `RP_SECRET` (elles restent dans les secrets des fonctions Supabase). Toute session Claude Code ayant le droit d'écrire dans le dépôt peut écrire un workflow qui lit les secrets du dépôt : moins il y en a, mieux c'est.
- **Branches anciennes** : une vingtaine sur GitHub (dont `apercu/`, `partage/`, `feature/`) ; leur suppression demande l'autorisation de l'auteur (non faite).

## À vérifier
- Après l'étape 2 : la première construction Cloudflare réussit (journal : « Vérification réussie »).
- Après l'étape 4 : connexion Google et lien magique (Remplacements, Communauté, Bibliothèque), liens « réponse en un clic » d'un e-mail réel, `www` redirigé, `http` → `https`.
- Défaut **préexistant** relevé par le test (non lié à la publication) : `radioanatomie/territoires-arteriels.html` déborde horizontalement à 390 px.
- Les 19 images de fiches attendues (README dans `assets/fiches/<fiche>/`) restent absentes : masquées par les pages, signalées en avertissement.

## Prochaine tâche importante
- Étapes 1 à 3 (autorisation de l'auteur), puis vérification automatique de l'adresse `*.pages.dev`.
- Adapter les workflows de `claude/exploitation-supabase` au dépôt privé (voir ci-dessus) avant l'étape 6.
- Choix des premiers contenus réservés aux abonnés.
