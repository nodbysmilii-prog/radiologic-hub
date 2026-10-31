# Suivi — fiches rapides et cas cliniques

Fichiers : `fiches-rapides.html`, `fiches/` (~34 entrées), `cas/`, `fiche.css`, `fiche.js`, `assets/fiches/`. Code couleur `k-*`. README : « Fiches rapides disponibles », « Code couleur ». **Ne pas relire toutes les fiches** : ouvrir seulement celle concernée.

## Réalisé
- Fiches publiées dans Digestif, Neuro, Thorax, Uro, Ostéo-articulaire, Cardio-vasculaire, ORL (ex. colites, occlusion, pancréatite, AVC, SEP, cavum, glandes salivaires, radius distal, myocardite, amylose thoracique, otospongiose, cholestéatome).
- Cas cliniques complets avec traduction bilingue (non en ligne).
- **Masses hépatiques solides** (31/10/2026, Digestif) : fiche dynamique d'après le PDF de l'auteur (`fiches/masses-hepatiques.html`, `regles/masses-hepatiques.js`, `fiches/digestif/foie-fiche.js`, `schemas/masses-hepatiques.css`, 8 tests) : carte des 12 lésions, calculateur LI-RADS, critères de l'HNF, schéma de Bismuth et Corlette, tableau final filtrable, CAT en 4 étapes, entraînement. Vérifiée en navigateur (interactions, téléphone, aucune erreur console).

- **SEO des fiches publiques** (31/10/2026) : méthode `SEO_FICHES.md`, `robots.txt`, `sitemap.xml` (26 fiches), `npm run seo:rapport` (état : 1 fiche sur 26 prête — Masses hépatiques, modèle), `tests/seo-fiches.test.js`. Offre gratuit / premium : `OFFRE_FREEMIUM.md` et `PROTECTION_PREMIUM.md` (rien n'est changé ; fiches gratuites).

## À vérifier
- Fiche AVC hémorragique (points à trancher), Crohn (préparation entéro-IRM), rectum (légendes), amylose (légendes), otospongiose (clichés), myocardite (relecture), radius distal (nomenclature).
- Images manquantes : pancréas, Crohn.
- Cas bilingues (hernie d'Amyand) et « Le menton qui s'endort ».
- **Masses hépatiques** : tableau LI-RADS à confirmer (version de référence ; HRPA périphérique non prévu) ; **schéma de Bismuth et Corlette** à valider anatomiquement (dessin schématique, pas l'image du PDF) ; cas et cartes reformulés à relire ; PDF source rangé dans le dépôt privé (`sources/masses-hepatiques/`).

- **LI-RADS** : tableau corrigé le 31/10/2026 (ACR CT/MRI v2018, validé par l'auteur) ; fiche, calculateur et éditeur concordent (tests exhaustifs). **À confirmer** (non modifié) : définition de la croissance dans le texte de la fiche (plus large que l'éditeur) ; critères accessoires « bénignité » qui font descendre un LR-5 dans l'éditeur ; phrase « diagnostic non invasif de CHC ».
- **SEO** : auteur affiché « Radiologic Hub » provisoirement (identification à définir) ; 3 références conservées comme lectures complémentaires (année en évidence) ; Google Search Console à créer.

## Prochaine tâche importante
Relecture par l'auteur de l'AVC hémorragique puis publication ; **SEO des autres fiches, une PR par fiche** (`SEO_FICHES.md`) ; relecture de la fiche Masses hépatiques solides (points ci-dessus). Spécialités à alimenter : Traumato, Pédiatrie, Imagerie de la femme.
