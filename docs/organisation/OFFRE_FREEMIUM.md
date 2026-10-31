# Offre gratuite / premium (freemium) — état des lieux et protection réelle

> **Détail du problème des 43 modèles publics et stratégie de protection serveur : `PROTECTION_PREMIUM.md`.**
>
> Suivi créé le 31/10/2026 à la demande de l'auteur. **Rien n'est basculé** : aucun module n'a changé de statut, rien n'a été appliqué à Supabase, aucune configuration DNS touchée. Ce document dit **où en est chaque module aujourd'hui**, ce que l'auteur a décidé, ce qui reste à décider, et **comment protéger réellement** un contenu premium. À lire avec `PUBLICATION.md` (liste blanche, Cloudflare, étapes) et `SEO_FICHES.md`.

## Décisions de l'auteur (31/10/2026)

| | Contenu |
|---|---|
| **GRATUIT** | **Toutes les fiches rapides** (publiques, sans inscription, référencées sur Google) ; les contenus pédagogiques publics ; **une partie** de la radioanatomie ; les calculateurs courants **que l'auteur désignera** comme gratuits |
| **PREMIUM** | Comptes rendus structurés avancés ; bibliothèque de phrases pathologiques avec insertion en un clic ; assistants professionnels de rédaction ; fonctions avancées de personnalisation et de productivité ; autres fonctionnalités à définir |
| **Règle** | Aucun module existant n'est rendu payant ou gratuit **automatiquement** : chaque passage se décide module par module, après vérification de son statut réel (tableau ci-dessous) |

## Statut réel aujourd'hui (vérifié dans le dépôt le 31/10/2026)

Constat général : **tout le site public est accessible sans compte ni abonnement.** `RESERVE_ABONNES` (liste des contenus retirés du site public) est **vide** ; la migration `ab_*` (abonnements) est **écrite et testée en local, non appliquée** à la base réelle ; aucune page ne vérifie un abonnement.

| Module | Statut actuel (vérifié) | Où | Proposition de l'auteur | À décider |
|---|---|---|---|---|
| Fiches rapides (26) | Public, sans compte, rien de masqué | `fiches/`, `fiches-rapides.html` | **Gratuit** | — (SEO fiche par fiche, `SEO_FICHES.md`) |
| Cas cliniques, cours d'échoanatomie | Public, sans compte | `cas/`, `cours/` | Gratuit (contenus pédagogiques publics) | Confirmer cas par cas |
| Radioanatomie (atlas de coupes, planches, territoires) | Public, sans compte ; ≈ 29 Mo de coupes dans `radioanatomie/donnees/` | `radioanatomie/` | **Une partie** gratuite | **Quelle partie** reste gratuite, laquelle devient premium |
| Calculateurs et classifications (Bosniak, ostéogamme, McDonald, scores…) | Public : pages `outils/*.html` et outils dans l'éditeur de comptes rendus (`regles/classifications.js`) | `outils/`, `regles/`, `cr-tools.js` | Gratuits **ceux que l'auteur désigne** | **Liste** des calculateurs gratuits (le reste : à décider) |
| Suivi oncologique (RECIST / Lugano) | Public, sans compte | `suivi-oncologique.html` | Non précisé | À décider |
| Comptes rendus : éditeur, **43 modèles** et leurs phrases | Public, sans compte ; les textes sont dans **`cr-data.js` (lisible par tout visiteur)** | `comptes-rendus.html`, `cr-data.js`, `cr-tools.js` | Premium pour les **comptes rendus structurés avancés** | Quels modèles restent gratuits (vitrine), lesquels deviennent premium |
| Bibliothèque de phrases pathologiques, insertion en un clic, « Écrire en vrac », dictée, assistant documentaire | Public, entièrement dans le navigateur (`regles/vrac.js`, `dictee/`, `assistant/`) | idem | **Premium** | Découpage gratuit / premium de chaque fonction |
| Bibliothèque (articles en accès libre) | Lecture publique ; administration réservée (compte administrateur, Supabase) | `bibliotheque.html` | Non précisé | À décider |
| Communauté, Remplacements | Connexion requise (Supabase) ; **pas encore en production** (démonstration) | `communaute.html`, `remplacements.html` | Non précisé | Hors périmètre tant que non lancés |
| Espace DICOM | Démonstration dans le navigateur ; serveur non en production | `espace-dicom.html` | Non précisé | Hors périmètre |

> Ce tableau est tenu à jour par la session qui change un statut. Un « Statut actuel » ne change **que** quand le code et la base ont réellement changé.

## Protection réelle du premium : côté serveur, pas en JavaScript

**Ce qui ne protège pas** : masquer un bouton, cacher une section avec JavaScript, minifier ou obscurcir le code, rendre le dépôt GitHub privé. Tout fichier envoyé au navigateur peut être copié. Rendre GitHub privé protège le **dépôt source** (code, SQL, historique), pas les fichiers **déjà distribués** : `cr-data.js` (43 modèles et phrases), les atlas de radioanatomie et les fiches sont aujourd'hui servis publiquement, des copies ou des caches peuvent exister, et **ce qui a été public ne redevient pas secret**.

**Ce qui protège** (architecture **déjà écrite et testée en local**, `supabase/migrations/20261030090000_abonnements.sql`, `tests/sql/rls-abonnements.js`) :

| Brique | Rôle |
|---|---|
| Supabase **Auth** | Identifie le compte (Google ou lien par e-mail), mêmes comptes que les autres modules |
| `ab_abonnements` | Un abonnement par compte (formule, début, fin), saisi par l'administrateur ; plus tard écrit par une fonction serveur après paiement |
| `ab_est_abonne()` | Vrai si l'abonnement du compte connecté est en cours ; `SECURITY DEFINER`, ne renvoie qu'un booléen |
| `ab_contenus` | Contenus texte réservés (modèles, phrases, légendes…) en JSON, **lisibles seulement par les abonnés et l'administrateur** (droits d'accès par ligne) |
| Stockage privé `premium` | Images, PDF, séries d'atlas ; lecture par **URL signée** de courte durée, accordée par la base aux seuls abonnés |
| `RESERVE_ABONNES` (liste blanche) | Un chemin listé n'est **jamais** publié dans `dist/` : le fichier n'existe plus sur le site public |

**Procédure, une rubrique à la fois** (rien n'est fait tant que l'auteur n'autorise pas chaque étape) :

1. L'auteur choisit la rubrique et ce qui reste gratuit (tableau ci-dessus).
2. **Séparer** le contenu : exemple comptes rendus — un fichier public (modèles gratuits + code de l'éditeur) et un jeu de données premium (autres modèles, bibliothèque de phrases) qui **ne doit plus figurer dans les fichiers publics ni dans `dist/`**.
3. **Appliquer la migration** `ab_*` à Supabase (autorisation explicite, avec sauvegarde et retour arrière décrits dans `PUBLICATION.md`).
4. **Envoyer** les contenus premium dans `ab_contenus` / `premium` par un script lancé avec la clé `service_role` **hors GitHub public** (jamais dans le navigateur ni dans le dépôt).
5. **Adapter l'interface** : après connexion, le site demande les contenus avec le **jeton de l'utilisateur** ; pour un visiteur ou un compte sans abonnement, la base répond « aucune ligne » (pas un message masqué : il n'y a rien à lire). Les fonctions « insertion en un clic » et assistants restent côté navigateur, mais **leurs données arrivent du serveur**.
6. Lister les chemins retirés dans `RESERVE_ABONNES`, relancer `npm run publication` (échec si un fichier réservé est présent), tester avec `npm run test:sql` et `npm run test:publication`.
7. Prévoir l'**expérience gratuite** : le visiteur voit un aperçu utile (quelques modèles complets, la liste des modèles premium), jamais une page vide ; invitation sobre à s'abonner, sans bloquer la lecture des fiches.

**Limites à garder en tête** : un abonné peut toujours copier ce qu'il voit (protection contre l'accès non autorisé, pas contre la recopie par un client) ; pour les nouveaux contenus premium, préférer des textes **jamais publiés** auparavant (les anciens restent dans l'historique public et les caches) ; le paiement en ligne n'existe pas encore (abonnements saisis par l'administrateur) ; vente en ligne = conditions générales, mentions légales et déclaration INPDP à revoir (voir `CLAUDE.md`, démarches juridiques).

## Décisions attendues de l'auteur

1. Quels **calculateurs** sont gratuits (liste) ; les autres restent à décider.
2. Quelle **partie de la radioanatomie** reste gratuite.
3. Quels **modèles de comptes rendus** restent gratuits (vitrine) et lesquels passent premium ; même question pour les phrases, la dictée et l'assistant.
4. **Formules et prix**, mode de paiement (saisie manuelle au départ ou paiement en ligne), durée d'essai éventuelle.
5. Ordre de mise en service (proposé : une rubrique à la fois, en commençant par celle qui a le moins de contenu déjà public).
