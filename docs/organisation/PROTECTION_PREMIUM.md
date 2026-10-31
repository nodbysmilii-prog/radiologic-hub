# Contenus premium : le problème des 43 modèles publics et la stratégie de protection serveur

> Document rédigé le 31/10/2026 à la demande de l'auteur. **Documentation et préparation uniquement** : l'accès aux 43 modèles de comptes rendus **n'est pas modifié**, rien n'est appliqué à Supabase, aucun module n'est rendu payant. À lire avec `OFFRE_FREEMIUM.md` (statuts) et `PUBLICATION.md` (liste blanche, étapes, retour arrière).

## 1. Le problème (constat vérifié dans le dépôt)

| Fait | Détail |
|---|---|
| Les modèles sont des fichiers publics | **43 modèles de comptes rendus** et leurs phrases dans `cr-data.js` (≈ 118 Ko), outils et phrases complémentaires dans `cr-tools.js` (≈ 123 Ko), règles de rédaction dans `regles/vrac.js` (≈ 36 Ko) et `regles/classifications.js` (≈ 48 Ko), dictée dans `dictee/`. Tous figurent dans la liste blanche (`FICHIERS`, `DOSSIERS`) donc dans `dist/`, et sont servis à **n'importe quel visiteur, sans compte**. |
| Le dépôt est public | Tout le code et **tout l'historique** (depuis le 04/10/2026) est lisible sur github.com tant que le dépôt n'est pas privé. |
| Rien n'est réservé | `RESERVE_ABONNES` est vide ; les tables `ab_*` ne sont pas appliquées ; aucune page ne vérifie un abonnement. |
| Conséquence | **Ce qui a déjà été distribué ne peut pas être repris** : copies locales, caches de navigateurs et de moteurs de recherche, archives web, historique Git. Rendre le dépôt privé ou retirer les fichiers du site protège l'avenir, pas le passé. |
| Masquer ne protège pas | Cacher un bouton, griser une zone, minifier ou obscurcir le JavaScript n'empêche pas de lire un fichier que le navigateur a reçu. L'auteur a décidé de **ne pas obscurcir** le code. |

Conséquences pratiques : (1) la valeur premium ne peut pas reposer sur **le texte déjà public** ; (2) elle doit reposer sur **du nouveau contenu jamais publié**, sur des **fonctions** (assistants, personnalisation, synchronisation) et sur la **commodité** ; (3) les 43 modèles actuels ont aussi une valeur **d'acquisition** (ils sont lisibles, utilisés, et attirent vers l'éditeur).

## 2. Options pour les 43 modèles actuels (décision de l'auteur, rien n'est fait)

| Option | Effet | Avantages | Inconvénients |
|---|---|---|---|
| **A. Les laisser publics** (état actuel) | Aucun changement | Aucun risque de régression ; valeur d'acquisition conservée | Pas de réserve premium sur ces textes |
| **B. Les retirer du site public à l'avenir** (`RESERVE_ABONNES` + `ab_contenus`) | Plus de nouvelle copie ; les anciennes subsistent | Cohérence future du premium | Casse l'éditeur pour les visiteurs ; perd l'effet vitrine ; ne rappelle rien de ce qui est déjà copié |
| **C. Les garder publics comme vitrine et créer des versions premium enrichies** | Les 43 restent ; le premium ajoute du contenu nouveau (variantes, bibliothèque de phrases pathologiques, assistants) | Aucune rupture ; valeur nouvelle réellement protégeable | Demande du contenu nouveau, validé par l'auteur |

**Recommandation** (à valider) : **C**, avec A en attendant. Aucun des trois choix n'est appliqué par ce document.

## 3. Stratégie de protection serveur pour les futurs contenus premium

**Règle d'or** : un contenu premium **n'est jamais présent dans un fichier du dépôt public ni dans `dist/`**. Il vit dans Supabase et n'arrive au navigateur qu'après une vérification **faite par la base**, jamais par le JavaScript de la page.

### 3.1 Briques existantes (écrites et testées en local, non appliquées)

`supabase/migrations/20261030090000_abonnements.sql`, `tests/sql/rls-abonnements.js` :

| Brique | Rôle |
|---|---|
| Supabase Auth (Google, lien e-mail) | Identifie le compte (mêmes comptes que les autres modules) |
| `ab_abonnements` + `ab_est_abonne()` | Un abonnement par compte (formule, début, fin) ; la fonction ne renvoie qu'un booléen |
| `ab_contenus` (`module`, `id`, `contenu jsonb`) | Textes réservés ; lecture par droits d'accès par ligne : abonnés et administrateur seulement, **jamais** les visiteurs (`anon` sans aucun droit) |
| Stockage privé `premium` | Images, PDF, atlas ; **URL signées de courte durée**, accordées seulement aux abonnés |
| `RESERVE_ABONNES` | Un chemin listé n'est jamais publié ; la construction de `dist/` s'arrête s'il y est |

### 3.2 Compléments à prévoir (non écrits, à décider)

| Besoin | Proposition | Pourquoi |
|---|---|---|
| **Pas de téléchargement en bloc** | Servir par **petites unités** (un modèle, une catégorie de phrases) à la demande, pas une bibliothèque entière ; fonction serveur ou vue limitée | Limite la recopie automatique |
| **Version et traçabilité** | Colonne de version sur `ab_contenus` ; journal d'accès minimal (compte, contenu, date) conservé sans donnée de patient | Détecter un usage anormal, retirer un contenu |
| **Limitation de débit** | Plafond de lectures par compte et par heure, côté fonction serveur ou base | Freine l'extraction |
| **Phrases-pièges (« canaris »)** | Insérer dans chaque nouveau contenu premium une formulation unique et inoffensive, puis vérifier périodiquement sur le web si elle apparaît ailleurs | **Détecte** une fuite ; ne l'empêche pas |
| **Filigrane par compte** (optionnel) | Variantes typographiques discrètes liées au compte pour remonter à l'origine d'une fuite | Dissuasion ; à peser selon la complexité |
| **Fin d'abonnement** | La lecture s'arrête immédiatement (la base compare `fin` à `now()`) ; aucune donnée premium conservée durablement dans le navigateur (mémoire de session uniquement) | Le droit d'accès s'éteint vraiment |
| **Contrôle avant publication** | Test de publication qui cherche dans `dist/` les phrases-pièges et les identifiants des contenus premium : échec s'ils s'y trouvent | Empêche de republier par erreur un contenu réservé |

### 3.3 Parcours côté site (futur)

1. Visiteur ou compte sans abonnement : l'éditeur fonctionne avec les **43 modèles publics** et affiche un **aperçu utile** du premium (liste et description des modèles et fonctions premium), invitation sobre à s'abonner.
2. Après connexion, le site demande les contenus premium **avec le jeton de l'utilisateur**. Pas d'abonnement : la base répond « aucune ligne » (il n'y a rien à lire, pas un message masqué).
3. Abonné : les données arrivent, restent en mémoire, l'« insertion en un clic » et les assistants s'exécutent dans le navigateur **sur des données qui viennent du serveur**.
4. Les fiches rapides ne sont **jamais** concernées : elles restent gratuites, publiques, sans connexion.

### 3.4 Plan de test (avant toute mise en service)

- Base : `npm run test:sql` (droits des tables `ab_*`, absence de lecture pour `anon`, lecture pour abonné, refus pour non-abonné, abonnement expiré refusé).
- Publication : `npm run publication` échoue si un chemin de `RESERVE_ABONNES` ou une phrase-piège est dans `dist/` ; `npm run test:publication` (fichiers internes en 404).
- Navigateur : visiteur anonyme → aucune donnée premium dans le trafic réseau ni dans les fichiers ; compte sans abonnement → aperçu seulement ; abonné → contenu complet ; fin d'abonnement → accès coupé.

### 3.5 Ordre proposé (une étape = une autorisation de l'auteur)

1. L'auteur choisit l'option pour les 43 modèles (§2) et la liste du premium (`OFFRE_FREEMIUM.md`).
2. Rédaction et validation du **nouveau** contenu premium, hors dépôt public (dépôt privé de sources).
3. Compléments de §3.2 retenus, écrits et testés en local.
4. Application de la migration `ab_*` à Supabase (autorisation explicite, sauvegarde, retour arrière de `PUBLICATION.md`).
5. Envoi des contenus (script avec la clé `service_role` lancé hors GitHub public), adaptation de l'interface, tests de §3.4.
6. Mise en ligne, puis (au plus tôt une semaine après) dépôt GitHub privé (`PUBLICATION.md`, étape 6).

## 4. Démarches à ne pas oublier avant de vendre en ligne

Conditions générales de vente et d'utilisation, mentions légales, protection des données (loi organique n° 2004-63, INPDP), mode de paiement et facturation, politique de remboursement : voir `CLAUDE.md` (démarches juridiques) et `mentions-legales.html`. Aucune n'est faite par ce document.

## 5. Ce qui n'a PAS été fait (31/10/2026)

Aucun fichier public retiré ou modifié, aucune migration appliquée, aucun secret ni clé utilisés, aucune configuration DNS ou Supabase touchée, aucun module payant modifié, aucune page protégée.
