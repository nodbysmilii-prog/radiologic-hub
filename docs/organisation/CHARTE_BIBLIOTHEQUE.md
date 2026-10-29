# Charte de la Bibliothèque scientifique

> Méthode de RadiologicHub pour référencer, classer, présenter et rechercher les articles scientifiques. À consulter **avant toute modification importante** de la Bibliothèque (configuration, import, fiches, filtres, administration, veille). Suivi d'avancement : `AUTRES_MODULES.md` (section Bibliothèque). Description technique complète : `README.md` (section « Bibliothèque (articles en accès libre) »).
> Établie le 29/10/2026 **à partir du code existant** (`bibliotheque.html`, `bibliotheque/`, migration `20261012120000_bibliotheque.sql`, `tests/bibliotheque.test.js`) : elle décrit ce qui est, puis ce qui est prévu, sans refonte. Aucun article n'a été ajouté ni modifié pour l'écrire.

Légende : ✅ présent dans le code · 🕓 prévu / à développer · 📌 règle de méthode (à respecter, pas toujours contrôlée par le code).

## 0. Principes

1. **Annuaire, pas dépôt.** Le site ne contient ni article, ni PDF, ni figure, ni abstract : uniquement des **métadonnées**, des **liens** vers la source officielle et un **résumé original** écrit par RadiologicHub. ✅ Mention permanente sur la page : « Les articles appartiennent à leurs auteurs et éditeurs ; ce site ne fournit que des liens. »
2. **Fiabilité avant volume.** Un article n'est publié que si son identifiant (DOI ou PMID) est valide, si son texte intégral gratuit est joignable et si sa licence est connue. Mieux vaut 30 articles sûrs que 300 douteux.
3. **Le fond scientifique appartient à l'auteur du site.** Choix des Essentiels, ordre de lecture, niveau, résumé : validés par l'administrateur. La veille et l'import **proposent** (« à valider »), ils ne publient jamais. ✅ (déclencheur en base)
4. **Une seule source de vérité.** Tout le vocabulaire (sous-spécialités, organes, modalités, classifications, niveaux, accès, thèmes, requêtes de veille) est dans `bibliotheque/config.js`. Aucun libellé de tag n'est écrit en dur dans les pages. ✅
5. **Charte graphique du site** (Montserrat, Permanent Marker, couleurs par sous-spécialité) ; textes visibles en français.

## 1. Organisation : sous-spécialité → thème → article

| Niveau | Rôle | Où c'est défini |
|---|---|---|
| **Sous-spécialité** ✅ | Grand domaine (10 prévues : digestif, sein, MSK, neuro, ORL, thorax, uro-génital, pédiatrie, cardio-vasculaire, interventionnel). Une couleur chacune. Affichée « bientôt » tant qu'elle n'a ni thème actif ni article | `config.js` → `specialites` |
| **Thème** ✅ | Une page de lecture (`bibliotheque.html#theme=<id>`) : question clinique ou organe (ex. Urgences digestives, Foie, Pancréas). Porte des tags par défaut et des **requêtes de veille**. Visible seulement avec `actif: true` | `config.js` → `themes` |
| **Article** ✅ | Une fiche rattachée à **une** sous-spécialité et à **un ou plusieurs thèmes** | table `bib_articles` + `bib_article_themes` |
| **Tags** ✅ | Organe / région (liste propre à chaque sous-spécialité), modalité (échographie, scanner, IRM, radiographie, mammographie), classification (LI-RADS, BI-RADS, Atlanta…), niveau (étudiant, résident, senior) | `config.js` → `organes`, `modalites`, `classifications`, `niveaux` |

Règles :

- **Rattachement par thème** : l'« Essentiel » (★) et le **rang de lecture** sont propres à chaque couple (article, thème) : un article peut être Essentiel en n°1 dans un thème et ordinaire dans un autre. ✅
- **Ordre d'une page thème** ✅ : Essentiels par rang → autres articles (rang s'il existe, puis plus récents). Objectif éditorial 📌 : environ **10 Essentiels** sur 50 à 100 articles pour la première version.
- **Identifiants de configuration** : minuscules, chiffres et tirets, **jamais modifiés** une fois utilisés (les articles s'y réfèrent). Ajouter une valeur = uniquement `config.js` ; le test `validerConfig` contrôle l'unicité et la cohérence (tags d'un thème connus, requêtes valides).
- **Une classification est proposée d'abord dans sa sous-spécialité** (`specialite` dans `config.js`, `null` = toutes : RECIST, Lugano). Les noms des classifications suivent l'usage international ; ne pas traduire ni renommer sans validation de l'auteur.
- **Ouverture d'une nouvelle sous-spécialité** 📌 : d'abord ses organes et au moins un thème avec requêtes dans `config.js`, puis quelques articles Essentiels relus, enfin `actif: true`. Pas de thème vide en ligne.

## 2. Référencement scientifique d'un article

### Champs d'une fiche ✅

| Champ | Règle |
|---|---|
| **Titre** | Titre original de l'article, tel que publié (anglais en général) ; jamais traduit dans ce champ. 1 à 600 caractères |
| **Auteurs** | `premier_auteur` au format « Nom Initiales » (ex. `Chernyak V`) + `et_al` (affiché « Chernyak V et al. »). Pour un groupe ou une société savante, le nom du groupe, sans « et al. » |
| **Revue** | Abréviation usuelle de la revue (ex. `Radiology`, `Insights Imaging`) |
| **Année** | Année de publication (1900-2100) |
| **DOI** | Normalisé en minuscules, sans préfixe `doi:` ni `https://doi.org/` ; format `10.xxxx/…` |
| **PMID / PMCID** | Numériques / `PMC` + chiffres. **Au moins un DOI ou un PMID est obligatoire** |
| **Lien vers la publication** | `url_texte` : adresse **https** du texte intégral gratuit (PMC en priorité, sinon Europe PMC, dépôt en libre accès ou éditeur) ; `source_texte` en précise l'origine. Boutons affichés : **Texte intégral gratuit**, **PubMed**, **DOI** |
| **Licence / accès** | Voir § 3 |
| **Classement** | Sous-spécialité, organes, modalités, classifications, niveau, thèmes (§ 1) |
| **Résumé** | Résumé RadiologicHub (§ 4) |
| **Statut** | `a_valider` → `publie` ou `rejete` (+ motif) ; `origine` : `import`, `lot`, `veille` |
| **Lien** | `lien_etat` : `ok`, `a_verifier`, `mort` (contrôle automatique 🕓 étape 6) |

### Règles de méthode

- **Les métadonnées viennent des services, pas de la mémoire** ✅ : Europe PMC, puis E-utilities de PubMed (secours), puis Unpaywall (accès libre et licence). 📌 Ne jamais saisir à la main un titre, un auteur, un DOI ou une année « de tête » ; corriger seulement une erreur constatée en regard de la source officielle.
- **Doublons** ✅ : refusés par DOI, PMID ou PMCID (index uniques) et signalés avant tout appel réseau. Un article rejeté n'est pas réimporté.
- **Jamais repris** ✅ : abstract, figures, tableaux, texte intégral. Ils sont écartés dès la lecture des réponses des services, donc jamais mis en cache ni enregistrés ; aucune colonne ne peut les contenir.
- **Sans texte intégral gratuit, pas de fiche** ✅ (import refusé). Les articles payants sont hors périmètre.
- **Plusieurs versions** 📌 : citer la version publiée (DOI de l'éditeur). Une version « preprint » n'est acceptée que si elle est seule disponible, et signalée comme telle dans le résumé.

## 3. Accès et licence : trois notions à ne pas confondre

| Badge (`acces`) | Sens | Ce que le site peut faire |
|---|---|---|
| **Licence ouverte** (`ouvert`, badge vert, ex. CC BY, CC BY-NC) ✅ | Texte **en libre accès sous licence réutilisable** | Lien + résumé. Reproduire un extrait, une figure ou un tableau n'est possible **que** si les conditions de la licence sont remplies (attribution, usage non commercial, pas de modification…) — vérification au cas par cas, § 5 |
| **Gratuit – licence non ouverte** (`gratuit`) ✅ | Lecture gratuite (PMC, éditeur) mais **droits réservés** | **Lien et résumé original seulement.** Aucune reproduction, même partielle |
| **Licence à vérifier** (`a_verifier`) ✅ | Une seule source consultée, licence non confirmée | Traité comme « droits réservés » tant que la licence n'est pas confirmée ; ne pas publier sans vérification 📌 |

Points d'attention :

- **« Accès libre » ≠ « réutilisation autorisée »** : seul le badge « Licence ouverte » ouvre la porte à une réutilisation, et jamais au-delà de ce que dit la licence. `oa_statut` (gold, hybrid, green, bronze, closed — Unpaywall) est un indice, pas une licence : `bronze` (gratuit sans licence) = « gratuit », pas « ouvert ».
- La licence est **calculée à l'import** (`normaliserLicence`) puis modifiable par l'administrateur ; en cas de doute, rétrograder vers `gratuit` ou `a_verifier`, jamais l'inverse sans preuve.
- Les licences de type **NC** (non commerciale) et **ND** (pas de modification) restreignent la réutilisation : tenir compte du caractère éventuellement commercial du site (Masterclass payante) 📌 et ne pas réutiliser sans validation de l'auteur.

## 4. Résumés originaux

- Le champ `resume` s'appelle « **Résumé RadiologicHub** » à l'écran, **400 caractères au plus** (contrôlé par l'interface, le validateur et la base) ✅.
- 📌 **Rédigé par RadiologicHub, en français, avec ses propres mots** : à quoi sert l'article, ce qu'il apporte au radiologue, pourquoi le lire. Ni copie, ni traduction de l'abstract, ni paraphrase proche phrase à phrase.
- 📌 **Rigueur médicale** : aucun chiffre, seuil, sensibilité ou recommandation ne figure dans un résumé sans avoir été relevé dans l'article lui-même et validé par l'auteur. Pas de conclusion plus forte que celle de l'article. Pas de constatation inventée. Pas de conseil de prise en charge propre à RadiologicHub présenté comme venant de l'article.
- Pas d'avis personnel déguisé : la recommandation de lecture passe par l'**Essentiel**, le **niveau** et le **rang**, pas par le résumé.
- Un article sans résumé s'affiche (c'est le cas des 5 articles de démonstration) ; le résumé est une plus-value, pas un prérequis technique. Le publier sans résumé est toutefois déconseillé pour un Essentiel 📌.

## 5. Vérification des licences avant toute reproduction

Avant de reproduire **quoi que ce soit** (image, figure, tableau, schéma, citation de plus de quelques mots, algorithme présenté sous forme de figure) :

1. Ouvrir la page de l'article chez l'éditeur ou sur PMC et lire la **mention de licence** de l'article (pas seulement celle de la revue) ; noter la licence exacte.
2. Contrôler que **chaque figure** relève bien de cette licence (une figure peut être « reproduite avec autorisation » d'un tiers et donc exclue de la licence ouverte).
3. Vérifier la compatibilité avec l'usage (site public, formation payante) : attribution, NC, ND, SA.
4. Si la réutilisation est permise : créditer (auteurs, titre, revue, année, licence, lien), indiquer toute modification, et ranger l'extrait dans le dossier du module concerné avec un fichier de licence/crédit.
5. Sinon, ou dans le doute : **ne pas reproduire**. Refaire un schéma original à partir des idées (pas de décalque), ou renvoyer vers l'article par un lien.

Règles associées 📌 :

- **Aucun PDF d'article n'est stocké** dans le dépôt public. Les sources de cours (PDF, notes) vont dans le dépôt **privé** `radiologic-hub-sources` (cf. `CLAUDE.md`), jamais copiées telles quelles dans le site.
- Les images médicales liées à un article ne sont jamais récupérées automatiquement.
- L'import n'enregistre que des métadonnées ; toute évolution qui ajouterait du texte ou des images venant d'un article **exige l'accord préalable de l'auteur** et la grille ci-dessus.
- Les mentions légales du site (`mentions-legales.html`) doivent rester cohérentes avec la mention permanente de la Bibliothèque.

## 6. Conventions de présentation

- **Fiche article** ✅ (`carte()` dans `app.js`) : badges (★ Essentiel, niveau, accès/licence) ; titre cliquable vers le texte intégral ; ligne de référence « Premier auteur et al. · Revue · Année » ; encadré « Résumé RadiologicHub » ; tags (organes, modalités, classifications) ; boutons de liens. Seuls les liens **https** sont affichés ; les liens externes s'ouvrent dans un nouvel onglet avec `rel="noopener"`.
- **Accueil** ✅ : sous-spécialités (avec nombre d'articles ou « bientôt »), thèmes (nombre d'articles et d'Essentiels), cinq derniers ajouts.
- **Page thème** ✅ : Essentiels numérotés dans l'ordre de lecture conseillé, puis « Pour aller plus loin ».
- **Badge d'accès** ✅ : vert pour licence ouverte, couleur distincte pour « gratuit – licence non ouverte » et « à vérifier » ; le `title` explique le sens.
- **Mode démonstration** ✅ : tant que `remplacements/config.js` est vide, 5 articles d'exemple (`demo.js`) avec un bandeau explicite. Quand Supabase est branché, la page lit la base publique (articles publiés, colonnes publiques seulement).
- **Accessibilité** ✅ : champs libellés, zones `aria-live`, panneau de filtres repliable sur téléphone, pas de débordement à 390 px.
- **Textes** : français ; titres d'articles et noms de classifications en langue d'origine ; pas d'emoji hors ★ Essentiel.

## 7. Conventions de recherche et de filtrage

- **Recherche** ✅ (`catalogue.filtrer`) : sans accents ni majuscules ; **tous les mots** doivent être trouvés (mots d'au moins 2 caractères) ; porte sur titre, premier auteur, revue, année, résumé, DOI, PMID, PMCID, licence et **libellés** des organes, modalités, classifications, sous-spécialité, niveau et thèmes (chercher « foie » ou « LI-RADS » trouve les articles bien étiquetés même si le titre est en anglais). 📌 Conséquence : soigner les tags, c'est soigner la recherche.
- **Filtres** ✅ : sous-spécialité, thème, organe, modalité, classification, niveau, accès, « Essentiels seulement », année minimale (2024, 2022, 2020, 2015). **ET entre filtres, OU entre les valeurs d'un même filtre.** Seules les valeurs présentes sont proposées, avec leur nombre d'articles.
- **Tri des résultats** ✅ : Essentiels d'abord, puis plus récents.
- **Adresse partageable** ✅ : `#q=…&modalites=irm,scanner&theme=foie` (clés : `q`, `specialite`, `theme`, `organes`, `modalites`, `classifications`, `niveau`, `acces`, `essentiel`, `anneeMin`). Toute nouvelle dimension de filtre s'ajoute dans `CLES` (et `MULTIPLES` si multiple) de `catalogue.js`, avec un test.
- **Veille** 🕓 : les requêtes (Europe PMC ou PubMed) sont déclarées par thème dans `config.js` ; le filtre « accès libre » est ajouté automatiquement. Une requête = un `id` unique, une `source`, une chaîne `q` non vide.

## 8. Composants existants à réutiliser

| Besoin | Où | Remarque |
|---|---|---|
| Vocabulaire, thèmes, requêtes, services et débits | `bibliotheque/config.js` | Seul fichier à modifier pour étendre le vocabulaire |
| Lecture/normalisation DOI, PMID, PMCID, lots, doublons | `noyau/identifiants.js` | Partagé site, tests, futures fonctions serveur |
| Lecture Europe PMC / PubMed / Unpaywall, fusion, licence, accès | `noyau/sources.js` | Ne retient que les champs de la liste blanche `CHAMPS` : y ajouter un champ est un choix de conformité (§ 5) |
| Limiteur de débit, cache de métadonnées, client avec nouvelle tentative | `noyau/reseau.js` | Respecter les débits publiés par chaque service |
| Import d'un article ou d'un lot, rapport | `noyau/import.js` | |
| Filtrage, tri, affichage de la référence, liens, badges, adresses, **validation** (`validerArticle`, `validerConfig`) | `noyau/catalogue.js` | Réutiliser plutôt que recopier |
| Accès aux données : démonstration ou Supabase | `api.js`, `api-demo.js`, `api-supabase.js` | `api-supabase.js` sépare colonnes publiques et colonnes d'administration |
| Page publique, administration | `app.js`, `admin.js` | |
| Styles | `bib.css` (+ `styles.css`, `fiche.css`) | Variables de couleur du site ; pas de couleur en dur |
| Base | `supabase/migrations/20261012120000_bibliotheque.sql` | Droits accordés explicitement, listés dans `tests/sql/droits-attendus.txt` |
| Tests | `tests/bibliotheque.test.js`, `npm run test:bib-reel` (réseau) | |

Après modification de `bib.css` ou d'un script du module, changer le `?v=…` dans `bibliotheque.html` et `bibliotheque-admin.html` (règle générale de `CLAUDE.md`).

## 9. Validation des références et des liens

**Avant publication d'un article** (contrôles de `validerArticle`, repris par la base) ✅ :

- titre présent ; DOI ou PMID présent et au bon format ; PMCID au bon format ;
- `url_texte` en `https://` ; accès connu ; année plausible ; résumé ≤ 400 caractères ;
- sous-spécialité, niveau, organes, modalités, classifications et thèmes **connus de la configuration** ;
- pour publier : sous-spécialité, au moins un thème et niveau renseignés.

**Contrôles manuels de l'administrateur** 📌 avant de passer en « publié » :

1. Ouvrir le lien « Texte intégral gratuit » et le DOI : la page correspond bien au titre.
2. Comparer titre, premier auteur, revue et année à la source officielle (PubMed ou page de l'éditeur).
3. Confirmer la licence affichée (§ 3, § 5).
4. Relire le résumé (§ 4) et vérifier qu'il ne contient rien qui ne soit dans l'article.
5. Vérifier tags, niveau, thèmes ; décider Essentiel / rang.

**Contrôles automatiques** :

- ✅ Tests : `tests/bibliotheque.test.js` (identifiants, doublons, licences, lecture des réponses, filtrage, tri, adresses, validation de fiche et de configuration) ; `npm run test:bib-reel` (import réel de 5 DOI, réseau nécessaire, rien de simulé).
- 🕓 **Liens morts** (étape 6) : vérification mensuelle, `lien_etat` (`ok` / `a_verifier` / `mort`) ; un lien mort est signalé à l'administrateur, jamais supprimé en silence. En attendant, vérification manuelle périodique des Essentiels.
- Une correction demandée sur un article (erreur de référence, lien cassé, licence contestée, demande d'un éditeur ou d'un auteur) est traitée **en priorité** : rétrogradation (`a_verifier`), dépublication ou rejet motivé.

## 10. Fonctionnalités : présentes et prévues

**Présentes ✅** (étapes 1 et 2)

- Modèle de données, import par DOI / PMID / PMCID (ou leur adresse), import en lot avec rapport, détection des doublons, fiche pré-remplie depuis trois services, licences et badges d'accès.
- Pages publiques : accueil, thèmes (Essentiels ordonnés), recherche, filtres combinables, adresses partageables, mode démonstration.
- Administration (`bibliotheque-admin.html`, non indexée, réservée à l'administrateur) : import, liste par statut, recherche, modification, statut (à valider, publié, rejeté + motif), suppression.
- Base Supabase sécurisée (lecture publique limitée aux articles publiés et aux colonnes publiques ; veille sans droit de publier).
- Premier périmètre : imagerie digestive, 3 thèmes (urgences digestives, foie, pancréas) avec leurs requêtes de veille.

**Prévues 🕓** (cf. README et `AUTRES_MODULES.md`)

- **Étape 3** : file « À valider » et tableau de bord, journal de veille.
- **Étape 4** : veille hebdomadaire (Europe PMC / PubMed / Unpaywall) par une fonction Supabase planifiée, lançable depuis l'administration ; ne publie jamais.
- **Étape 5** : articles associés aux modèles et outils des Comptes rendus (`comptesRendus` dans `config.js`, aujourd'hui vide).
- **Étape 6** : vérification des liens morts.
- Autres sous-spécialités et thèmes ; objectif de test **50 à 100 articles publiés dont 10 Essentiels**.
- Revue par l'auteur des tags, niveaux et Essentiels d'exemple de la démonstration.

**Non prévues (hors périmètre sauf décision de l'auteur)** : hébergement de PDF, reproduction d'abstracts ou de figures, résumés générés automatiquement et publiés sans relecture, comptes lecteurs/favoris, commentaires.

## 11. Marche à suivre pour une modification

1. Lire cette charte et `AUTRES_MODULES.md` (section Bibliothèque) ; ne pas lire les autres modules.
2. Étendre le vocabulaire dans `config.js` uniquement ; réutiliser les composants du § 8.
3. Ajouter ou adapter un test dans `tests/bibliotheque.test.js` (lancer ce fichier seulement, pas toute la suite).
4. Ne jamais importer ni publier un article sans les contrôles du § 9 ; ne jamais ajouter d'image, de PDF ou de texte d'article.
5. Changer les `?v=…` des fichiers modifiés ; mettre à jour le README (historique, date, section Bibliothèque, « À faire ») et la section Bibliothèque de `AUTRES_MODULES.md` dans le même commit.

## 12. Points à faire valider par l'auteur

- Seuil d'acceptation de la licence « ouverte » pour la réutilisation (CC BY seul, ou CC BY-NC aussi, compte tenu de la Masterclass payante).
- Politique des preprints et des articles en « libre accès » sans licence explicite (bronze).
- Format exact des résumés (structure en une ou deux phrases ?) et besoin d'une relecture systématique des Essentiels.
- Règle d'âge maximale des articles et critères de choix des Essentiels (recommandations de sociétés savantes en priorité ?).
- Procédure de retrait en cas de demande d'un éditeur ou d'un auteur (délai, personne à contacter).
