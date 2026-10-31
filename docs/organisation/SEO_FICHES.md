# Référencement (SEO) des fiches rapides — méthode réutilisable

> Décision de l'auteur (31/10/2026) : **toutes les fiches rapides sont gratuites, publiques et lisibles sans inscription** ; elles sont le principal canal d'acquisition de visiteurs (Google). Cette méthode s'applique fiche par fiche ; **seule « Masses hépatiques solides » est faite** (modèle de référence). À lire avec `CHARTE_FICHES.md` (pédagogie) et `OFFRE_FREEMIUM.md` (gratuit / premium).

## Principes

- **Accès libre** : aucune connexion, aucun script Supabase, aucun contenu masqué par JavaScript dans une fiche (le test `tests/seo-fiches.test.js` le vérifie).
- **Le contenu médical ne change pas** pour le SEO : titres, descriptions et liens s'ajoutent autour ; on ne réécrit rien sans validation de l'auteur.
- **Pas d'obfuscation du JavaScript** : aucune protection réelle, elle complique les modifications. La protection est juridique (mention de droits) et, pour le premium, côté serveur (`OFFRE_FREEMIUM.md`).
- **Rien d'inventé** : références vérifiées dans PubMed (DOI), dates tenues à jour à la main, aucun nom d'auteur ou de relecteur écrit sans que l'auteur le fournisse.

## Liste de contrôle par fiche (modèle : `fiches/masses-hepatiques.html`)

| Élément | Règle | Où |
|---|---|---|
| **URL** | Claire et descriptive, en minuscules, avec tirets : `fiches/<pathologie>.html`. Ne pas renommer une fiche déjà indexée (sinon redirection 301 dans `scripts/publication/cloudflare/_redirects`). | nom du fichier |
| **Titre SEO** | 20 à 70 caractères, spécifique à la pathologie, finit par « \| Radiologic Hub ». Ex. « Masses hépatiques solides : TDM, IRM et LI-RADS \| Radiologic Hub ». | `<title>` |
| **Meta-description** | 70 à 160 caractères : ce que le lecteur trouve (modalités, entités, outils) + « gratuite ». | `<meta name="description">` |
| **Canonical** | Adresse complète en `https://radiologichub.com/fiches/<fichier>.html` (même forme que le sitemap). | `<link rel="canonical">` |
| **Robots** | `index, follow, max-image-preview:large`. Jamais `noindex` sur une fiche. | `<meta name="robots">` |
| **Titres** | Un seul H1 (nom de la pathologie) ; H2 = grandes parties ; H3/H4 sans niveau sauté. | HTML |
| **Open Graph / Twitter** | `og:title/description/url/image` (1200 × 630), `twitter:card=summary_large_image`. Image : `assets/fiches/<fiche>/og.png`. | `<head>` |
| **Données structurées** | JSON-LD `MedicalWebPage` (auteur et éditeur = Radiologic Hub, `isAccessibleForFree`, dates, `citation`) + `BreadcrumbList` identique au fil d'Ariane. | `<script type="application/ld+json">` |
| **Édition visible** | Ligne `ul.fp-edition` : « Fiche gratuite, sans inscription · Publié par Radiologic Hub · Mise à jour le … » (`<time datetime>`). La date = `article:modified_time` = JSON-LD. **Mettre la date à jour à chaque modification de fond.** | sous le sous-titre |
| **Références** | Section « Références et voir aussi » : 2 à 4 références **générales** vérifiées dans PubMed (DOI + PMID), précisées « proposées en complément » tant que l'auteur ne confirme pas qu'elles sont sa source. | `section#references` |
| **Liens internes** | « Voir aussi » : 2 à 4 fiches **réellement liées** par le contenu (pas de lien décoratif) + l'index de la spécialité ; liens dans le texte quand une notion est traitée ailleurs. | `ul.fp-voir` |
| **Passerelle vers les outils** | Encadré discret `aside.fp-suite` en fin de fiche (voir ci-dessous). | après les références |
| **Mention de droits** | « © Radiologic Hub — Tous droits réservés. Textes, schémas et outils originaux ; les ressources de tiers restent sous leurs licences et crédits » + avertissement « fiche pédagogique destinée aux professionnels de santé ». Mêmes mots en commentaire en tête des fichiers propres. | `p.fp-mention` |
| **Téléphone** | `viewport`, aucune barre de défilement horizontale à 390 px, tableaux dans `.ftable-wrap`. | test Playwright |
| **Sitemap / index** | Carte dans `fiches-rapides.html` → `npm run sitemap` → `python3 scripts/indexer_fiches.py` (assistant) → `npm test`. | racine |

Styles communs : `schemas/fiche-publique.css` (préfixe `fp-`, à lier dans chaque fiche). Suivi : `npm run seo:rapport` liste les fiches qui n'ont pas encore leur SEO (état au 31/10/2026 : 1 sur 26).

## Passerelles vers les outils (utiles, discrètes, sans prix)

Règles : un encadré en **fin** de fiche, 1 à 3 liens, titre sobre (« Du diagnostic au compte rendu »), une phrase d'explication, **aucun prix, aucun mot « premium / abonnement »** tant que l'offre n'est pas décidée par l'auteur (le test l'impose). Les liens visent des outils **qui existent** : modèle de compte rendu (`comptes-rendus.html#modele=<id>`), outil de classification de l'éditeur, calculateur.

| Fiche | Passerelle proposée | Vérifié dans le code |
|---|---|---|
| Masses hépatiques solides | `#modele=tdm-abdo-pelvienne-injectee` ; outil **LI-RADS v2018** de l'éditeur | oui (`cr-data.js`, `regles/classifications.js`) — **fait** |
| Pancréatite aiguë, adénocarcinome du pancréas | `#modele=tdm-abdo-pelvienne-injectee` ; outil « Pancréatite aiguë : Balthazar, CTSI » | oui |
| Occlusion, ischémie mésentérique, colites | `#modele=tdm-abdo-pelvienne-injectee` | oui |
| Maladie de Crohn | `#modele=entero-tdm` | oui |
| Masses rénales kystiques | `outils/bosniak.html` ; `#modele=uroscanner` | oui |
| IRM de la prostate (2 fiches) | `#modele=irm-prostate-multiparametrique` | oui |
| EU-TIRADS | `#modele=echo-cervicale` | oui |
| Nodule pulmonaire, amylose, médiastin | `#modele=tdm-thorax-injectee` | oui (outil Fleischner : à vérifier) |
| Autres fiches | à définir fiche par fiche, après vérification du modèle ou de l'outil visé | — |

## Sitemap, robots.txt, canonical

- `robots.txt` : tout est explorable, déclare le sitemap. **Ne pas** y mettre `Disallow` pour une page à ne pas indexer : le robot ne verrait plus l'en-tête `noindex` (cas de `remplacements-reponse.html`, géré par `_headers`).
- `sitemap.xml` : généré (`npm run sitemap`) depuis les cartes de `fiches-rapides.html` ; `<lastmod>` = date `article:modified_time` de la fiche (aucune date inventée). Publié via la liste blanche (`robots.txt`, `sitemap.xml` ajoutés à `FICHIERS`).
- **Forme des adresses** : `.html` aujourd'hui (GitHub Pages). Si **Cloudflare Pages** devient l'hébergeur, il redirige `/page.html` vers `/page` : passer `SANS_EXTENSION` à `true` dans `scripts/seo/sitemap.js` **et** aligner les `canonical`, `og:url` et JSON-LD des fiches (le test signale tout désaccord). Après la bascule : déclarer le sitemap dans Google Search Console.
- À faire par l'auteur (hors dépôt) : créer la propriété `radiologichub.com` dans **Google Search Console**, y soumettre `https://radiologichub.com/sitemap.xml`, puis demander l'indexation de la fiche.

## Ordre de déploiement sur les autres fiches (proposition)

1. Fiches déjà relues par l'auteur et sans point en suspens (voir `FICHES.md`), de la spécialité qui a le plus de requêtes (Digestif, Thorax).
2. Une fiche = une petite PR : en-tête SEO, `fp-edition`, références vérifiées, voir aussi, passerelle, carte du sitemap, test vert. Pas de refonte du contenu.
3. Suivre `npm run seo:rapport` jusqu'à 26 / 26.

## À valider par l'auteur (fiche « Masses hépatiques »)

- **Nom et titres de l'auteur / relecteur** à afficher (identification éditoriale) : aujourd'hui « Radiologic Hub » seulement, rien d'inventé.
- Les 3 **références** (LI-RADS v2018, EASL tumeurs bénignes 2016, EASL CHC 2018) : confirmer qu'elles conviennent comme lectures complémentaires, ou fournir les sources réelles du cours.
- Le titre SEO et la description (reformulables).
