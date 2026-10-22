# Espace DICOM — serveur d'images de RadiologicHub

Recevoir, visualiser et partager des examens d'imagerie, à côté du site actuel (qui reste sur GitHub Pages).

> **État (14 octobre 2026)** :
> - étapes 0 et 1 terminées : socle Docker, droits d'accès, relais sécurisé des images ;
> - **démonstration des étapes 2 et 3 dans le navigateur** : import (fichiers, dossier de CD, `.zip`) et visionneuse OHIF avec le compte rendu à côté, sans serveur (voir [Démonstration dans le navigateur](#démonstration-dans-le-navigateur)) ;
> - **courbe de perfusion tracée sur les images** (IRM dynamiques, dont General Electric) : voir [Courbe de perfusion](#courbe-de-perfusion). Spectroscopie : en attente du format d'export de l'IRM GE.
>
> Rien n'est encore visible sur le site : la rubrique du menu viendra à l'étape 7.
> Plan complet et décisions : [`PLAN.md`](PLAN.md).

**Données de test uniquement.** Les tests utilisent des scanners **synthétiques** générés par `outils/generer-dicom-test.js` : un fantôme calculé, avec le patient « TEST^SYNTHETIQUE » et la mention « identité retirée ». **Jamais de vraies données de patients**, ni dans ce dépôt ni sur un poste de développement.

---

## Sommaire

1. [Architecture](#architecture)
2. [Qui accède à quoi](#qui-accède-à-quoi)
3. [Démonstration dans le navigateur](#démonstration-dans-le-navigateur)
4. [Essayer le serveur en local](#essayer-le-serveur-en-local)
5. [Tests](#tests)
6. [Configuration (`.env`)](#configuration-env)
7. [Changer de domaine ou d'hébergeur](#changer-de-domaine-ou-dhébergeur)
8. [Mise en production sur un VPS](#mise-en-production-sur-un-vps)
9. [Sécurité et données de santé](#sécurité-et-données-de-santé)
10. [Performances mesurées](#performances-mesurées)
11. [Fichiers](#fichiers)
12. [Étapes suivantes](#étapes-suivantes)

---

## Architecture

```
Navigateur (site sur GitHub Pages)              Serveur (VPS, docker compose)
─────────────────────────────────               ───────────────────────────────────────────
pages de l'Espace DICOM (étapes 2 à 7)   HTTPS   Nginx ── auth_request ──▶ dicom-api (Node)
visionneuse OHIF (étape 3)  ──────────────────▶   │   vérifie la session      │
                                                  │   et le droit sur          ├──▶ Supabase (comptes,
                                                  │   l'étude, à CHAQUE        │    droits, journal)
                                                  │   requête                  │
                                                  └── relais + cache ──▶ Orthanc (DICOMweb)
                                                                            └── PostgreSQL (index)
Clinique : modalités / PACS ── C-STORE ──▶ passerelle Orthanc ── HTTPS + clé ──▶ dicom-api   (étape 2)
```

| Service | Rôle | Exposé ? |
|---|---|---|
| **nginx** | Seule porte d'entrée : HTTPS, gzip, cache des images, limitation de débit, en-têtes de sécurité. Chaque requête `/dicomweb/…` est d'abord vérifiée par dicom-api (`auth_request`). | Ports 80 et 443 (ou ceux du `.env`) |
| **dicom-api** | Vérifie les jetons de session Supabase (HS256 ou clés publiques ES256 / RS256), demande à Supabase les droits sur l'étude, note les consultations dans le journal d'audit. API du site (`/api/…`). | Non (réseau interne + sortie vers Supabase) |
| **orthanc** | Stockage DICOM (`orthancteam/orthanc` 26.9.1). Compression **sans perte JPEG-LS** à l'arrivée. DICOMweb. Pas d'interface d'administration, pas de port DICOM. | **Jamais** : aucun port publié, et aucun accès à Internet |
| **orthanc-db** | Index d'Orthanc (PostgreSQL 17), sur le VPS. Ce n'est pas Supabase. | Non |

**Où sont les données :**
- **Sur le VPS**, dans Orthanc : les images, **l'identité du patient**, et plus tard la copie du compte rendu en PDF encapsulé DICOM et les commentaires de télé-expertise.
- **Dans Supabase** : seulement des identifiants techniques (identifiant Orthanc, UID d'étude), les droits, les dates et le journal des accès. Migration `supabase/migrations/20261014090000_espace_dicom.sql`.

## Qui accède à quoi

Calculé par la base (fonctions `dc_role` et `dc_droits`), vérifié par `tests/sql/rls-dicom.js` :

| Rôle | Qui | Voir | Commenter | Importer | Partager / inviter | Supprimer |
|---|---|---|---|---|---|---|
| Administrateur | `rp_admins` | tout | ✓ | ✓ | ✓ | ✓ |
| Radiologue | remplaçant spécialiste validé, ou membre vérifié de la Communauté (spécialiste, Dr / Pr) | sa structure + son espace personnel + invitations | ✓ | ✓ | ✓ | ses dépôts |
| Membre | membre d'une clinique ou d'un cabinet **validé**, non résident | sa structure | ✓ | ✓ | ✓ | ses dépôts (tout s'il est responsable) |
| Résident | **validé pour une structure** par un radiologue senior de cette structure ou un administrateur | sa structure | ✓ | — | — | — |

- Un compte suspendu, une structure suspendue : plus aucun accès (au plus 60 s après, durée du cache des droits).
- Confrères non inscrits et patients : seulement par lien de partage (étape 4).

## Démonstration dans le navigateur

Pour essayer l'import et la visionneuse **sans serveur**, tant que le VPS n'est pas en service.

**Pages du site** :
- `espace-dicom.html` : « Importer des examens » et « Mes examens » ;
- `espace-dicom-visionneuse.html?etude=…` : OHIF, avec la courbe de perfusion ou le compte rendu à côté (onglets sur téléphone).

Elles ne sont pas encore dans le menu, et ne sont pas indexées.

**Mode démonstration** (`dicom/config.js` sans adresse de serveur) :
- les fichiers sont lus et gardés **dans le navigateur** (IndexedDB) ; rien n'est envoyé ;
- « Supprimer » et « Tout supprimer » effacent tout.

| Fonction | Détail |
|---|---|
| **Sources** | Fichiers DICOM, **dossier d'un CD** (tous les fichiers sont lus : le DICOMDIR est reconnu, les fichiers non DICOM sont ignorés), **archives `.zip`** (stockées, compressées, ZIP64), glisser-déposer de fichiers et de dossiers. |
| **Analyse avant import** | En-têtes lus par dcmjs (`vendor/dcmjs-0.52.0`, MIT), 4 fichiers à la fois, barre de progression. Tableau par examen : patient, date, examen, nombre d'images, taille. **Examen non marqué « identité retirée »** : avertissement, et import bloqué tant qu'on n'a pas confirmé utiliser des fichiers de test ou anonymisés. |
| **Import** | Par lots de 20 images. Un import interrompu reprend sans doublon : les images déjà gardées sont reconnues. Même chose pour un CD importé deux fois. |
| **Mes examens** | Liste, recherche (nom, identifiant, examen), suppression, espace utilisé dans le navigateur. |
| **Visionneuse** | **OHIF 3.13.12** en français : défilement, fenêtrage et préréglages, zoom, mesures, **MPR** (bouton « Disposition »). Sur téléphone, le panneau des études est replié et la barre d'outils allégée. **Charte du site** (`visionneuse/theme-radiologichub.css`) : police Montserrat, cadre bleu marine, outil actif et image sélectionnée en ambre ; images sur fond noir. |
| **Courbe de perfusion** | Bouton « Courbe » (onglet sur téléphone) : une ellipse tracée sur une série dynamique donne la courbe signal-temps de la région et ses paramètres. Détails ci-dessous. |
| **Compte rendu** | Texte gardé avec l'examen, enregistré automatiquement. En service, ce sera la copie PDF jointe depuis l'éditeur. |
| **Examens de test** | Synthétiques (`dicom/generateur.js`, le même générateur que les tests du serveur). **Scanner** de 120 coupes : « Charger » ou « Télécharger (.zip) », pour essayer l'import d'une archive. **Perfusion IRM T2\*** (cerveau, 8 coupes × 50 phases, TR 1,5 s, en-têtes comme une IRM GE : MR, EPI, Trigger Time, positions temporelles) avec une lésion à forte chute de signal et fuite (chute 60 %, PSR 70 %), parenchyme (30 %, 95 %), artère et ventricules. |

### Courbe de perfusion

Demandée pour les IRM **General Electric** : courbe tracée directement sur les images, sans logiciel à installer.

- **Utilisation** : ouvrir la série dynamique (perfusion T2\* DSC ou T1 dynamique DCE ; OHIF la reconnaît et affiche le lecteur des phases), choisir l'**ellipse** dans les outils de mesure (cercle, rectangle et contour libre marchent aussi) et la tracer sur une coupe. Le panneau « Courbe » s'ouvre : signal moyen de la région à **chaque phase de cette coupe**. Une région par tissu : la lésion, puis le parenchyme sain controlatéral, chacune dans sa couleur (la même dans l'image et sur la courbe).
- **Paramètres** (`dicom/perfusion.js`, calcul pur testé en Node) :
  - ligne de base (la première phase est écartée : aimantation pas encore à l'équilibre) et arrivée du produit de contraste ;
  - **T2\* (chute de signal)** : chute maximale, temps du minimum, **PSR** (pourcentage de récupération du signal, sur les 15 % dernières phases) ;
  - **T1 (rehaussement)** : rehaussement maximal, temps du pic, **type de courbe I, II ou III** (progressive, plateau, lavage ; ± 10 % entre le pic des 2 premières minutes et la fin, si au moins une minute après le pic).
- **Temps** : Trigger Time, sinon heure d'acquisition (minuit compris), sinon heure de création ; sans heure dans les images (fréquent en EPI GE : la même pour toutes), numéro de phase × TR, signalé sous la courbe.
- **Commandes** : échelle « % de la base » ou « Signal », **export CSV** (tableur, virgule décimale), **clic sur un point → la visionneuse affiche cette phase** ; repère de la phase affichée sur la courbe.
- **Pixels** : ceux déjà décodés par la visionneuse (tous les formats, dont JPEG-LS du serveur), pente et ordonnée appliquées ; la région est calculée en millimètres (pixels rectangulaires, plans obliques).
- **Limites** (rappelées sous la courbe) : **aide visuelle**, signal non calibré ; pas de déconvolution (rCBV, CBF, MTT), de correction de fuite ni de Ktrans. Les cartes de la console de l'IRM (GE READY View) restent la référence ; une carte rCBV exportée en DICOM peut être lue avec l'ellipse (moyenne de la région).
- **Branchement** : `espace-dicom/visionneuse/app-config.js` donne la configuration à OHIF sous forme de fonction (prévu par OHIF) pour garder ses services dans `window.RH_OHIF` ; `dicom/courbe.js` (page de la visionneuse, même site) écoute les mesures. Les mesures sont suivies sans la question « Suivre les mesures ? » (elle masquait le lecteur des phases). Même fonctionnement quand les images viendront du serveur.
- **Spectroscopie** (à venir) : OHIF n'affiche pas les spectres. Sur une IRM GE, la spectroscopie est le plus souvent exportée en fichier **P-file** (`P*.7`, format propre à GE), en captures d'écran, ou en DICOM « MR Spectroscopy » selon la version. Le format exact (et un exemple **anonymisé**) est demandé avant de coder la lecture du spectre.

**Visionneuse OHIF** : application déjà construite, téléchargée à version figée par `npm run visionneuse` (`espace-dicom/visionneuse/installer-ohif.js`).
- **Empreinte** sha512 vérifiée.
- **Modules inutiles retirés** : 48 Mo au lieu de 200.
- **Trois correctifs vérifiés** :
  - OHIF fonctionne dans un sous-dossier ;
  - la police est chargée par une adresse relative ;
  - les images en adresses `blob:` du **même site** sont acceptées ; rien d'autre n'est ouvert.
- **Charte du site** : `theme-radiologichub.css` (police Montserrat et couleurs), copié par l'installation et chargé après les styles d'OHIF.
- **Hors de la branche principale** : le résultat (`dicom/ohif/`) est ignoré par git. Il n'est publié que sur la branche d'aperçu `apercu/espace-dicom`, qui n'est jamais fusionnée et peut être supprimée après validation. Sur le serveur, Nginx le servira.

**Limites de la démonstration** :
- pas de comptes, de partage, de QR code ni de télé-expertise ;
- les examens ne sont visibles que dans le navigateur qui les a importés ;
- l'espace disponible dépend du navigateur ;
- sur l'aperçu (raw.githack.com), le stockage du navigateur est partagé avec les autres pages de ce service : **fichiers de test seulement**.

## Essayer le serveur en local

Le serveur seul : prérequis **Docker** (avec docker compose v2), **Node.js 22** et **openssl** (sinon celui de l'image Orthanc est utilisé).

### Le plus simple : le test complet, en gardant la pile ouverte

```bash
npm run test:dicom -- --garder
```

Il démarre tout, avec une **simulation de Supabase** (PostgreSQL + PostgREST, mêmes migrations), crée des comptes fictifs, charge deux scanners synthétiques, puis affiche **un jeton de radiologue fictif valable 1 h** et une commande `curl` prête à l'emploi. Arrêt : `docker compose -p rh-dicom-test down -v`.

### Lancer la pile soi-même (sans projet Supabase)

```bash
cd espace-dicom
node outils/initialiser.js --simulation     # .env, secrets, dossiers, certificat local
docker compose -f docker-compose.yml -f docker-compose.test.yml up -d --build
curl --cacert certs/fullchain.pem --resolve dicom.localhost:8443:127.0.0.1 https://dicom.localhost:8443/api/sante
# → {"ok":true}
docker compose -f docker-compose.yml -f docker-compose.test.yml down     # arrêt (données gardées dans donnees/)
```

### Avec le vrai projet Supabase (quand il sera en service)

```bash
cd espace-dicom
node outils/initialiser.js        # puis compléter SUPABASE_URL et les deux clés dans .env
docker compose up -d --build
```

Appliquer d'abord la migration `20261014090000_espace_dicom.sql` dans Supabase, comme les précédentes (`remplacements/INSTALLATION.md`).

## Tests

| Commande | Ce qui est vérifié | Résultat (14/10/2026) |
|---|---|---|
| `npm test` | `tests/dicom-api.test.js` : jetons (HS256, ES256, RS256, « alg: none », expiration, audience, confusion d'algorithme), analyse des requêtes DICOMweb (chemins autorisés, recherches sans filtre, filtre d'une autre étude, chemins détournés, écritures), cache des droits (une seule question à Supabase pour 50 requêtes simultanées), journal, configuration, serveur | 12 tests ✓ |
| `npm run test:sql` | `tests/sql/rls-dicom.js` : rôles, validation des résidents par un senior, droits par examen, écritures réservées au serveur, unicité d'un examen, liens sans empreintes lisibles, journal en ajout seul, **aucune colonne d'identité du patient**. `tests/sql/droits.js` : liste exacte des droits accordés | 20 vérifications ✓ |
| `npm run test:dicom` | `tests/integration.js`, la pile Docker complète (voir ci-dessous) | 51 vérifications ✓ |
| `npm test` | `tests/dicom-site.test.js` (démonstration) : scanner de test valide et synthétique, lecture des en-têtes (données binaires retirées, DICOMDIR reconnu), regroupement par examen (doublons, identité non retirée), `.zip` écrits et relus (et créés par `zip`, ZIP64), liste des images pour OHIF, **perfusion de test** (en-têtes de type GE), **courbe de perfusion** (phases et temps : Trigger Time, heure d'acquisition avec passage de minuit, phase × TR ; régions : ellipse droite ou tournée, cercle, rectangle, contour, pixels rectangulaires, plan sagittal ; chute, minimum et PSR attendus sur la perfusion de test ; types de courbe I, II, III), configuration d'OHIF (services exposés, mesures suivies sans question), correctifs d'OHIF (seules les adresses `blob:` du même site sont acceptées), pages | 14 tests ✓ |
| Parcours Chromium | démonstration servie comme sur raw.githack.com, ordinateur (1366 px) et téléphone (390 px) : scanner de test, `.zip` téléchargé puis importé (puis réimporté : « déjà importé »), dossier de CD avec DICOMDIR et fichier texte, avertissement « non anonymisé », recherche, image affichée par OHIF, OHIF en français, **MPR à 3 vues**, compte rendu gardé après rechargement, onglets sur téléphone, police et couleurs du site dans OHIF, **perfusion IRM de test reconnue comme série dynamique (50 phases), ellipse tracée sur la lésion → courbe de 50 phases (chute 61 %, PSR 70 %), couleur identique dans l'image, panneau ouvert d'office, clic sur le minimum → phase affichée, échelle, export CSV, 2e région (parenchyme : 30 %, 95 %), mesure supprimée → courbe retirée, scanner → « série non dynamique », pastille et onglet sur téléphone**, suppression, sans débordement ni erreur | 71 vérifications ✓ |

Le test Docker vérifie notamment :
- **Orthanc injoignable** : seul Nginx publie des ports ; l'API d'Orthanc (`/instances`, `/tools/find`, `/system`, son interface…) répond 404 par Nginx ; Orthanc n'a **aucun accès à Internet** ;
- **compression sans perte** : syntaxe JPEG-LS (1.2.840.10008.1.2.4.80) et **pixels relus identiques** aux pixels générés (65 536 sur 65 536) ; 1 550 Ko → 260 Ko pour le scanner de test ;
- **droits** :
  - sans session : 401 ; jeton forgé ou expiré : 401 ;
  - compte sans rôle ou radiologue d'une autre structure : 403 ;
  - radiologue, membre et résident de la structure : 200 ;
  - recherche sans filtre, ou par nom de patient : 403 ; filtre visant une autre étude : 403 ;
  - images d'une autre étude demandées sous le chemin d'une étude autorisée : rien n'est servi ;
  - écriture et suppression : refusées ;
- **cache** : première image lue dans Orthanc, la suivante servie par le cache, mais **toujours refusée sans droit** ; une structure suspendue perd l'accès même aux images en cache ;
- gzip des métadonnées, en-têtes de sécurité, nom de domaine inconnu refusé, redirection HTTP → HTTPS, limitation de débit (429) ;
- **journal** : une ligne par personne et par examen (malgré des dizaines de requêtes), accès refusés notés, aucune identité de patient.

## Configuration (`.env`)

Tout est dans `espace-dicom/.env` (modèle commenté : [`.env.example`](.env.example)). Ce fichier n'est jamais publié.

| Variable | Rôle |
|---|---|
| `DICOM_DOMAINE` | Nom de domaine du serveur d'images (ex. `dicom.mon-domaine.tn`) |
| `DICOM_URL_PUBLIQUE` | Adresse complète vue des navigateurs (avec le port s'il n'est pas 443) |
| `DICOM_SITE_ORIGINES` | Sites autorisés à appeler l'API et à afficher la visionneuse |
| `PUBLIER_SUR`, `PORT_HTTP`, `PORT_HTTPS` | Interface et ports publiés par Nginx |
| `DONNEES_DIR` | **Le dossier à sauvegarder** : images, index d'Orthanc, défis Let's Encrypt |
| `CERTS_DIR` | Certificat HTTPS (`fullchain.pem`, `privkey.pem`) |
| `DICOM_CACHE_TAILLE` | Taille maximale du cache d'images de Nginx |
| `SUPABASE_URL`, `SUPABASE_CLE_PUBLIQUE`, `SUPABASE_CLE_SERVICE`, `SUPABASE_JWT_SECRET` | Projet Supabase (clé de service : serveur seulement) |
| `DROITS_CACHE_SECONDES` | Délai maximal avant qu'un retrait de droit prenne effet (60 s) |
| `ORTHANC_UTILISATEUR`, `ORTHANC_MOT_DE_PASSE`, `ORTHANC_DB_MOT_DE_PASSE` | Secrets internes, générés par `outils/initialiser.js` |

## Changer de domaine ou d'hébergeur

Aucun domaine ni hébergeur n'est écrit dans le code (le test d'intégration tourne avec un autre domaine et d'autres ports que la configuration locale).

- **Changer de domaine** : modifier `DICOM_DOMAINE` et `DICOM_URL_PUBLIQUE`, obtenir un certificat pour ce domaine, puis `docker compose up -d`. Ajouter la nouvelle adresse du site dans `DICOM_SITE_ORIGINES` si le site change aussi de domaine.
- **Changer d'hébergeur** :
  1. `docker compose down` ;
  2. copier le dossier `espace-dicom` avec son `.env`, `donnees/` et `certs/` (par exemple avec `rsync -a`) ;
  3. sur la nouvelle machine : `docker compose up -d` ;
  4. faire pointer le DNS vers la nouvelle adresse.

  Un script de sauvegarde et de restauration est prévu à l'étape 7.

## Mise en production sur un VPS

Prévu à l'étape 7, avec un guide pas à pas. En résumé :
1. VPS Linux avec Docker, **de préférence hébergé en Tunisie** (données de santé), par exemple 4 vCPU, 8 Go de RAM, 200 Go de disque.
2. Sous-domaine pointant vers le VPS. `.env` : `PUBLIER_SUR=0.0.0.0`, `PORT_HTTP=80`, `PORT_HTTPS=443`, adresse publique sans port.
3. Certificat Let's Encrypt par la méthode « webroot » : Nginx sert déjà `/.well-known/acme-challenge/` depuis `donnees/acme`. Exemple :
   `certbot certonly --webroot -w <DONNEES_DIR>/acme -d <domaine>`, puis copier ou lier les fichiers dans `certs/`, avec un renouvellement automatique.
4. Pare-feu : seulement 22 (SSH), 80 et 443.
5. Supabase en service, migration appliquée, `.env` complété.
6. **Avant d'y mettre de vraies images** : démarches INPDP validées par un juriste (voir ci-dessous).

## Sécurité et données de santé

- **Orthanc jamais exposé** : réseau Docker interne sans accès à Internet, identifiants internes, aucun port publié. Toute requête passe par Nginx, qui la fait vérifier par dicom-api avant de la relayer.
- **Le droit est vérifié avant le cache**, à chaque requête d'image : une image en cache n'est jamais servie sans droit.
- **Recherches limitées à une étude autorisée** : impossible de lister les examens du serveur ou de chercher un patient par son nom.
- **Lecture seule** par DICOMweb : l'envoi d'images passera par dicom-api (étape 2), avec contrôle de l'examen visé.
- **Un UID d'étude n'appartient qu'à un espace** : un fichier forgé avec l'UID d'un examen d'autrui ne pourra pas s'y ajouter (étape 2).
- **Journal d'audit** (`dc_journal`), en ajout seul : ni modification ni vidage, même par la clé de service. Il est conservé 3 ans par défaut (réglable).
- En-têtes : HSTS, `nosniff`, `no-referrer` (les liens de partage ne fuient pas vers d'autres sites), visionneuse affichable seulement dans le site (`frame-ancestors`).
- **Loi organique 2004-63 / INPDP** :
  - minimisation : aucune identité de patient dans Supabase ;
  - hébergement des images en Tunisie si possible ;
  - durée de conservation réglable (`dc_reglages`, 365 jours par défaut) et purge automatique (étape 6) ;
  - droit de suppression (étape 6).

  Les démarches (déclaration, autorisation de traitement de données de santé, transferts hors de Tunisie de Supabase) sont **à valider par un juriste avant toute mise en production**.

## Performances mesurées

Objectif retenu : **première image en moins de 3 s**, chargement progressif. Les mesures en 4G simulée, sur un scanner synthétique de 500 coupes, seront faites à l'étape 3 (visionneuse) et notées ici.

Mesure locale à l'étape 1, sans réseau (indicative, poste de développement) :
- métadonnées d'une série de 12 coupes : environ 30 ms ;
- première image : environ 15 ms ;
- taille stockée : environ 6 fois plus petite que l'original pour le fantôme de test (JPEG-LS sans perte ; sur de vraies images, plutôt 2 à 3 fois).

## Fichiers

```
espace-dicom/
├── PLAN.md                       analyse, plan par étapes, décisions
├── README.md                     ce document
├── .env.example                  configuration commentée (copiée en .env, non publié)
├── docker-compose.yml            nginx, dicom-api, orthanc, orthanc-db
├── docker-compose.test.yml       simulation de Supabase (PostgreSQL + PostgREST) pour les tests et le local
├── orthanc/orthanc.json          configuration d'Orthanc (JPEG-LS, DICOMweb, PostgreSQL, sans interface ni port DICOM)
├── nginx/
│   ├── templates/espace-dicom.conf.template   HTTPS, auth_request, cache, gzip, limitation de débit
│   ├── conf/entetes.conf         en-têtes de sécurité
│   ├── entrypoint/05-espace-dicom.envsh       en-tête interne vers Orthanc, calculé au démarrage
│   └── statique/index.html       page d'accueil sobre du serveur
├── api/                          dicom-api (Node 22, sans dépendance npm)
│   ├── Dockerfile
│   └── src/  serveur.js · jwt.js · dicomweb.js · supabase.js · journal.js · orthanc.js · config.js
├── outils/
│   ├── initialiser.js            .env, secrets, dossiers, certificat local (--simulation : sans Supabase)
│   ├── generer-dicom-test.js     scanners synthétiques (aucune donnée réelle)
│   └── charger-test.js           chargement des scanners de test (tests seulement)
└── tests/
    ├── integration.js            test Docker de bout en bout (npm run test:dicom)
    └── supabase-simule/init.sh   simulation de Supabase + migrations du dépôt
```

Dans `espace-dicom/visionneuse/` : `installer-ohif.js` (OHIF à version figée), `index.html.modele` et `app-config.js` (OHIF de l'Espace DICOM).

Hors du dossier :
- `espace-dicom.html`, `espace-dicom-visionneuse.html` : pages du site ;
- `dicom/` : `config.js` (démonstration ou serveur), `espace.js` (import, Mes examens), `visionneuse.js`, `courbe.js` (panneau « Courbe »), `perfusion.js` (calcul de la courbe), `lecture.js` (en-têtes DICOM), `zip.js`, `generateur.js` (scanner et perfusion de test), `manifeste.js` (liste des images pour OHIF), `stockage-demo.js` (navigateur), `espace.css` ; `dicom/ohif/` produit par `npm run visionneuse` (non versionné) ;
- `vendor/dcmjs-0.52.0/` : lecteur DICOM (MIT) ;
- `supabase/migrations/20261014090000_espace_dicom.sql` : tables `dc_*`, rôles et droits ;
- `tests/sql/rls-dicom.js` : test de la migration ;
- `tests/dicom-api.test.js` : tests unitaires de dicom-api ; `tests/dicom-site.test.js` : démonstration.

## Étapes suivantes

| Étape | Contenu | État |
|---|---|---|
| 0. Socle | Docker, configuration, données synthétiques, migration | ✓ |
| 1. Orthanc en local | réception, JPEG-LS, DICOMweb seulement par Nginx et dicom-api, refus sans droit | ✓ |
| 2. Importer | dossier, `.zip`, DICOMDIR ; envois parallèles avec reprise (tus) ; « Mes examens » ; passerelle de clinique | démonstration dans le navigateur ✓ ; envoi au serveur et passerelle à faire |
| 3. Visualiser | OHIF intégré, compte rendu à côté, MPR sur tablette et ordinateur, **mesures en 4G** ; courbe de perfusion, spectroscopie | démonstration ✓, courbe de perfusion ✓ ; lecture depuis le serveur (DICOMweb, jeton) et mesures en 4G à faire ; spectroscopie : format GE à préciser |
| 4. Partager | lien (24 h, 7 j, 30 j), code d'accès à essais limités, révocation, page publique | à faire |
| 5. E-mail, QR, comptes rendus | Brevo, QR imprimable, bouton « Joindre les images » (PDF encapsulé dans Orthanc) | à faire |
| 6. Télé-expertise et administration | invitations, commentaires (sur le VPS), validation des résidents, espace disque, conservation et purge, suppression | à faire |
| 7. Menu, déploiement | rubrique « Espace DICOM », guide VPS, sauvegardes | à faire |
