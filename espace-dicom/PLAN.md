# Espace DICOM — analyse du site et plan d'intégration

Branche `feature/espace-dicom`, créée depuis la branche de développement `claude/bold-gates-vm47yj`, indépendamment de la section Pelvis non encore validée. **Plan validé le 14 octobre 2026** : vos décisions sont en section 5, et le plan ci-dessous en tient compte.

---

## 1. Ce que j'ai compris du site actuel

### Hébergement et pile technique
- **Site 100 % statique**, servi par **GitHub Pages** (branche `claude/radiologichub-website-ss89g9`) : HTML, CSS et JavaScript, sans framework, sans étape de build. Seule exception : la section Pelvis, générée par un script Node.
- **Aucun serveur applicatif** à nous. Les parties dynamiques (Remplacements, Communauté, Bibliothèque, validation du cours) s'appuient sur **Supabase** :
  - PostgreSQL, avec des droits d'accès par ligne (RLS) ;
  - Supabase Auth ;
  - stockage privé ;
  - fonctions Deno (`supabase/functions/rp-agent`, `rp-lien`, `rp-taches`).
- La bibliothèque `supabase-js` est chargée depuis jsDelivr (version figée 2.45.4).
- **Ces modules ne sont pas encore en production** : `remplacements/config.js` est vide. Sans configuration, ils tournent en **mode démonstration** (données fictives dans le navigateur). La mise en service reste à faire : projet Supabase, migrations, Brevo, Google OAuth (`remplacements/INSTALLATION.md`).

### Comptes et rôles existants (tables Supabase)
- `auth.users` → **`profils`** : un compte par personne, créé à la première connexion. Connexion par **lien magique** ou **Google**. Contient le consentement « loi 2004-63 ».
- **Radiologues** :
  - `rp_remplacants` (statut `specialiste` ou `resident`, `etat` validé par l'administrateur sur justificatif) ;
  - `rs_membres` (profil Communauté, `verifie` = titre Dr / Pr vérifié).
- **Cliniques et cabinets** : `rp_structures` (`type` clinique ou cabinet, `etat` validé) et `rp_membres` (rôle `responsable` ou `membre`, invitations par e-mail).
- **Administrateurs** : `rp_admins` (adresses e-mail) et la fonction `rp_est_admin()`.
- Migrations dans `supabase/migrations/`, testées sur un PostgreSQL 16 qui simule Supabase (`npm run test:sql`). Tests unitaires : `npm test` (Node, sans dépendance).

### Interface
- **Charte** : Montserrat ; Permanent Marker pour les étiquettes ; cartes à cadre épais et ombre décalée ; code couleur `k-*` (`styles.css`, `fiche.css`).
- **Menu principal** : 8 entrées, présentes dans 24 pages HTML : Masterclass, Fiches rapides, Bibliothèque, Comptes rendus, Remplacements, Communauté, Tarifs, S'inscrire. Il est déjà presque plein en largeur : une 9e entrée avait débordé de 8 px.
- **Comptes rendus** (`comptes-rendus.html`, `cr.js`, `cr-tools.js`) : éditeur **entièrement local**. Le texte, les modèles et les phrases restent dans le navigateur (`localStorage`). Rien n'est enregistré sur un serveur.
- Les **e-mails** passent par Brevo ou Resend, depuis les fonctions Supabase (`supabase/functions/_shared`).

---

## 2. Exigences irréalistes, risquées ou incompatibles — à trancher avant de coder

| # | Exigence | Problème | Ce que je propose |
|---|---|---|---|
| 1 | « docker-compose à côté du déploiement actuel », « backend du site » | GitHub Pages ne fait tourner **aucun serveur** : ni Orthanc, ni Nginx, ni un backend. Les fonctions Supabase ne conviennent pas pour relayer des centaines de Mo d'images (durée et taille des requêtes limitées), et elles n'ont pas accès à un Orthanc privé. | **Un serveur (VPS) avec Docker**, sous un sous-domaine (ex. `dicom.<votre-domaine>`) : Nginx (HTTPS), **un petit backend Node** (« dicom-api »), Orthanc et sa base. Le site reste sur GitHub Pages. Les logiciels sont gratuits, **l'hébergement ne l'est pas** : environ 10 à 30 € par mois pour 4 vCPU, 8 Go de RAM et 200 Go de disque, plus un nom de domaine. |
| 2 | « Réutilise le système de comptes existant » | Le système existe dans le code, mais **Supabase n'est pas encore en service**. | **Prérequis** : mettre Supabase en service (`INSTALLATION.md`). Je développe et je teste d'abord sur la base simulée et un Supabase local. |
| 3 | « Scanner de 500 coupes affiché en moins de 5 s en 4G » | Physiquement impossible pour **la série entière** : 500 coupes 512×512 font environ 260 Mo, soit 90 à 120 Mo en compression sans perte. En 4G réelle (10 à 20 Mbit/s), il faut 40 à 90 s. La MPR a besoin du volume complet. | **Objectif reformulé** : première image en moins de 3 s ; défilement immédiat des coupes déjà reçues ; chargement progressif, avec une coupe sur N d'abord pour avoir vite une vue d'ensemble. Je **mesure** à l'étape 3 avec un scanner synthétique de 500 coupes, en 4G simulée, et je vous donne les chiffres. |
| 4 | « Réception C-STORE depuis le PACS » et « Orthanc jamais exposé sur Internet » | Le C-STORE (port 4242) n'est pas chiffré par défaut. Recevoir directement depuis la clinique obligerait à ouvrir ce port sur Internet. | **Passerelle locale** : un petit Orthanc dans le réseau de la clinique reçoit le C-STORE des modalités et du PACS, puis transfère en **HTTPS authentifié** (clé par clinique) vers notre backend. Aucun port entrant. Autre possibilité : un VPN WireGuard. |
| 5 | « MPR sur smartphone » | Un volume de scanner occupe 250 à 500 Mo de mémoire. Safari sur iPhone ferme souvent l'onglet. | Sur téléphone : visualisation coupe par coupe, fenêtrage, zoom et mesures. MPR proposée sur tablette et ordinateur, ou sur téléphone pour les petites séries. |
| 6 | Données de santé (loi 2004-63, INPDP) | Le traitement de données de santé demande en principe une **autorisation de l'INPDP**. Les **transferts hors de Tunisie** (VPS ou Supabase à l'étranger) sont encadrés. Je ne suis pas juriste. | **Minimiser** : aucune identité de patient dans Supabase (nom, identifiant, date de naissance restent dans Orthanc, sur le VPS). Supabase ne garde que des identifiants techniques, les droits et les journaux. **Héberger le VPS en Tunisie** si possible. Durée de conservation, droit de suppression et journal d'audit sont prévus. Démarches INPDP à valider par un juriste avant la mise en production. |
| 7 | « Compte rendu affiché à côté des images » | Les comptes rendus ne sont **jamais enregistrés** sur un serveur aujourd'hui. | Le bouton « Joindre les images » enregistre **une copie** du compte rendu avec l'examen, seulement sur action explicite. L'éditeur actuel ne change pas. |
| 8 | Visualiseur intégré « sans installation, rapide » | OHIF v3 est une application de 10 à 20 Mo à son premier chargement. | Version d'OHIF réduite aux extensions utiles, compressée (brotli), mise en cache de longue durée, et chargée seulement à l'ouverture d'un examen. |
| 9 | Rubrique au menu principal | Une 9e entrée déborde. Il faut **modifier la ligne du menu des 24 pages** et `styles.css` (avec changement des `?v=`). | Entrée « Espace DICOM » et espacement du menu légèrement réduit. Seul cet ajout touche les pages existantes. |

---

## 3. Architecture proposée

```
Navigateur (GitHub Pages)                      VPS (docker-compose)
──────────────────────────                     ─────────────────────────────────────────────
dicom.html (Mes examens, Importer,      HTTPS  Nginx ── auth_request ──▶ dicom-api (Node)
 Partages, Télé-expertise, Admin)  ─────────▶   │   (vérifie session Supabase      │
dicom-partage.html (page publique)              │    ou jeton de partage, examen    ├──▶ Supabase (comptes, droits,
dicom-viewer (iframe OHIF v3)                   │    autorisé, journal, débit)      │    partages, journaux)
comptes-rendus.html (+ « Joindre               │                                   └──▶ Brevo (e-mails)
 les images » / QR code)                        └── proxy + cache ──▶ Orthanc (DICOMweb, privé)
                                                                       └── PostgreSQL (index Orthanc)
Clinique : modalités / PACS ── C-STORE ──▶ Orthanc passerelle ── HTTPS + clé ──▶ dicom-api
```

### Composants

- **Orthanc** (`orthancteam/orthanc`) :
  - plugins DICOMweb et PostgreSQL ;
  - **compression sans perte JPEG-LS** à l'entrée (`IngestTranscoding` = 1.2.840.10008.1.2.4.80). Je la préfère au JPEG 2000 : taux voisin, décodage 3 à 5 fois plus rapide dans le navigateur, ce qui compte sur téléphone ;
  - **aucun port publié**, réseau Docker interne seulement, identifiants internes en plus.
- **Index Orthanc** : un **PostgreSQL dédié** dans le docker-compose, et non Supabase. Orthanc ouvre beaucoup de connexions et doit rester proche de ses fichiers ; les données patient restent ainsi sur le VPS.
- **Nginx** :
  - HTTPS (Let's Encrypt) ;
  - gzip et brotli pour le JSON DICOMweb (métadonnées) ;
  - **chaque requête d'images vérifiée par `auth_request`** auprès de dicom-api : session ou jeton, droit sur l'examen ;
  - ensuite, flux direct depuis Orthanc avec **cache** sur les instances (immuables), sans faire passer les images par Node. C'est la condition des performances ;
  - limitation de débit (`limit_req`).
- **dicom-api** (Node, petit service) :
  - vérification des jetons Supabase ;
  - droits par examen ;
  - téléversement avec reprise (protocole **tus**) ;
  - envoi à Orthanc ;
  - liens de partage, codes d'accès (empreinte scrypt, essais limités), journal d'audit, e-mails, QR codes ;
  - anonymisation (API Orthanc) et purge selon la durée de conservation.
- **OHIF v3** : construit avec seulement les extensions utiles ; source DICOMweb `/dicomweb` ; jeton passé dans l'en-tête de chaque requête ; affiché dans un **iframe** au sein de la page du site, avec le compte rendu à côté (en onglet sur téléphone).

### Nouvelles tables Supabase (migration `20261014090000_espace_dicom.sql`, préfixe `dc_`, RLS et tests SQL)

Supabase ne garde **que des identifiants techniques, des droits, des dates et des journaux**. Aucune identité de patient (nom, identifiant, date de naissance), aucune description d'examen, aucun texte médical : tout cela reste dans Orthanc, sur le VPS.

| Table | Contenu |
|---|---|
| `dc_examens` | identifiant Orthanc, UID d'étude, structure (ou espace personnel), déposant, date de dépôt, nombre d'images, taille, date de purge, copie anonymisée oui / non |
| `dc_residents` | demande d'accès d'un résident à une structure, validée par un radiologue senior de la structure ou un administrateur |
| `dc_partages` | lien : **empreinte** du jeton (le jeton de 256 bits n'est jamais stocké), expiration (24 h, 7 j, 30 j), empreinte du code, essais échoués, révocation, copie anonymisée. **Pas l'adresse du destinataire** (souvent celle du patient) : le lien lui est envoyé, l'adresse n'est pas gardée |
| `dc_expertises` | invitation d'un radiologue inscrit à donner son avis sur un examen |
| `dc_passerelles` | passerelle de clinique : structure, **empreinte** de la clé, dernière réception |
| `dc_journal` | audit en ajout seul : qui, quoi, quand, IP, navigateur |
| `dc_reglages` | durée de conservation, taille maximale d'un envoi |

Restent **sur le VPS** :
- dans Orthanc : les images, l'identité du patient, et la **copie du compte rendu en PDF encapsulé DICOM** rattachée à l'étude ;
- dans une petite base du VPS gérée par dicom-api : les **commentaires de télé-expertise** (texte médical) et les sessions de téléversement (reprise).

### Qui accède à quoi (décidé le 14 octobre 2026)

**Rôle de chacun dans l'Espace DICOM** (calculé par la base, fonction `dc_role()`) :

| Rôle | Qui | Ce qu'il peut faire |
|---|---|---|
| `admin` | administrateurs (`rp_admins`) | tout, y compris l'administration |
| `radiologue` | remplaçant **spécialiste validé**, ou membre de la Communauté **vérifié** (spécialiste, titre Dr / Pr, non suspendu) | importer (espace personnel ou structure), voir, partager, inviter, commenter |
| `membre` | membre d'une **clinique ou d'un cabinet validé** (`rp_membres`), qui n'est pas résident | importer pour la structure, voir, partager, inviter, commenter |
| `resident` | résident **validé pour une structure** par un radiologue senior de cette structure ou un administrateur (`dc_residents`) | voir les examens de cette structure, commenter en télé-expertise. **Ni import, ni lien de partage, ni invitation, ni suppression** |

- Une personne déclarée résidente (Remplacements ou Communauté) n'obtient jamais le rôle `membre` par son rattachement à une structure : elle doit être validée comme résidente.
- **Supprimer un examen** : son déposant, le responsable de sa structure ou un administrateur.
- **Un examen** est visible de son déposant, des membres, radiologues et résidents validés de sa structure, des radiologues invités en télé-expertise et des administrateurs.
- **Confrères non inscrits et patients** : uniquement par lien de partage (code d'accès en option), sans compte.

---

## 4. Plan par étapes (tests, instructions et commit à chaque étape)

0. **Squelette** : `docker-compose.yml` (Orthanc, PostgreSQL, Nginx, dicom-api), configuration par `.env` (domaine et hébergeur interchangeables), script d'initialisation, données de test **synthétiques** générées par script (aucun patient réel ; pas de téléchargement de jeux de données dont la licence serait à vérifier), migration `dc_*` et tests SQL.
1. **Orthanc en local** : réception, compression JPEG-LS vérifiée, DICOMweb (QIDO, WADO-RS) accessible **seulement** par Nginx et dicom-api. Tests d'intégration en Docker : une requête sans droit est refusée.
2. **Importer** :
   - sources : dossier, `.zip`, CD avec DICOMDIR (lecture des en-têtes dans le navigateur pour regrouper par examen) ;
   - téléversements **en parallèle** (4 à 6), barre de progression, **reprise après coupure** (tus) ;
   - « **Mes examens** » : liste, recherche, filtres ;
   - passerelle de clinique : un petit Orthanc sur place reçoit le C-STORE et transfère en HTTPS avec la clé de la clinique ; configuration fournie et testée avec un second Orthanc.
3. **Visualiser** :
   - OHIF intégré, compte rendu à côté ;
   - fenêtrage, zoom, mesures ; MPR sur tablette et ordinateur ;
   - **mesures de performance** en 4G simulée sur un scanner synthétique de 500 coupes.
4. **Partager** : lien sécurisé, expiration, code d'accès avec débit limité, révocation, page publique sobre aux couleurs du site, journal d'audit.
5. **E-mail, QR code et comptes rendus** :
   - envoi du lien (Brevo) ;
   - QR code imprimable ;
   - bouton **« Joindre les images / QR code »** dans l'éditeur des comptes rendus, seule modification d'une fonctionnalité existante ; la copie du compte rendu est enregistrée dans Orthanc en **PDF encapsulé DICOM** rattaché à l'étude.
6. **Télé-expertise et administration** : invitation d'un radiologue inscrit, commentaires horodatés (gardés sur le VPS), validation des résidents, anonymisation avant partage, espace disque, liens actifs, durée de conservation et purge automatique, suppression sur demande (droit de suppression).
7. **Menu, README et déploiement** : rubrique « Espace DICOM » dans le menu des 24 pages, `espace-dicom/README.md` (installation locale, déploiement sur VPS, sauvegardes, mises à jour), puis contrôle de l'ensemble.

**Démonstration dans le navigateur (14 octobre 2026)** : pour essayer l'import et la visionneuse avant la mise en service du VPS, les étapes 2 et 3 existent aussi en mode démonstration (fichiers gardés dans le navigateur, OHIF lisant ces fichiers). Le parcours et l'interface sont les mêmes qu'en service ; seul le stockage change.

À chaque étape :
- tests Node (`npm test`) et tests d'intégration Docker ;
- parcours Chromium sur ordinateur et téléphone ;
- instructions pour vérifier vous-même ;
- un commit sur `feature/espace-dicom`.

Pas de déploiement en production sans votre accord.

---

## 5. Décisions (14 octobre 2026)

1. **Hébergement** : un VPS, de préférence **hébergé en Tunisie**. Développement et tests en local d'abord. Nom de domaine : à préciser. Tout ce qui dépend du domaine ou de l'hébergeur est dans un seul fichier `.env` (domaine, ports, origine du site, Supabase, Brevo, dossiers de données) : changer de domaine ou d'hébergeur ne demande aucune modification du code.
2. **Performance** : objectif reformulé accepté (première image en moins de 3 s, chargement progressif, chiffres mesurés et notés dans le README).
3. **Images de la clinique** : **passerelle locale** (petit Orthanc sur place qui transfère vers le serveur en HTTPS avec une clé par clinique). Pas de VPN. Le serveur central n'a **aucun port DICOM ouvert**.
4. **Accès** : radiologues validés, membres de structure validés, administrateurs ; **résidents avec un rôle limité**, validés par un radiologue senior ou un administrateur (tableau en section 3).
5. **Identité du patient** : uniquement dans Orthanc, jamais dans Supabase.
6. **Comptes rendus** : copie enregistrée au clic sur « Joindre les images », **dans Orthanc, en PDF encapsulé DICOM rattaché à l'étude**. Rien dans Supabase.
7. **Supabase** : mis en service en parallèle. En attendant, les tests utilisent une simulation locale (PostgreSQL + PostgREST, mêmes migrations).

### Points apparus en préparant le socle

| Point | Ce que je fais |
|---|---|
| **Même examen déposé deux fois** : Orthanc regroupe les images par UID d'étude. Un fichier forgé avec l'UID d'un examen d'autrui pourrait s'ajouter à cet examen. | Un UID d'étude n'appartient qu'à un espace (contrainte d'unicité). Un envoi vers un examen existant est **refusé** si l'expéditeur n'a pas le droit de le gérer (contrôle avant l'enregistrement, étape 2). |
| **Recherche DICOMweb** (`/studies?…`) : sans filtre, elle listerait tous les examens du serveur. | Le relais n'accepte une recherche que **limitée à un UID d'étude autorisé**. « Mes examens » passe par dicom-api, qui filtre selon les droits. |
| **Cache des images** sur le VPS | Le droit est vérifié **avant** le cache, à chaque requête : une image en cache n'est jamais servie sans droit. À la suppression d'un examen, ses images en cache sont effacées (étape 6). |
| **Brotli** | Absent de l'image officielle de Nginx : gzip pour les métadonnées, images déjà compressées sans perte (JPEG-LS). |
| **Commentaires de télé-expertise** | Texte médical : gardés sur le VPS (point 5), pas dans Supabase. |
| **Adresse e-mail du destinataire d'un lien** | Envoyée à Brevo pour l'envoi, jamais enregistrée. |
