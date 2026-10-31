# Suivi — fiches rapides et cas cliniques

Fichiers : `fiches-rapides.html`, `fiches/` (~34 entrées), `cas/`, `fiche.css`, `fiche.js`, `assets/fiches/`. Code couleur `k-*`. README : « Fiches rapides disponibles », « Code couleur ». **Ne pas relire toutes les fiches** : ouvrir seulement celle concernée.

## Réalisé
- Fiches publiées dans Digestif, Neuro, Thorax, Uro, Ostéo-articulaire, Cardio-vasculaire, ORL (ex. colites, occlusion, pancréatite, AVC, SEP, cavum, glandes salivaires, radius distal, myocardite, amylose thoracique, otospongiose, cholestéatome).
- Cas cliniques complets avec traduction bilingue (non en ligne).
- **Masses hépatiques solides** (31/10/2026, Digestif) : fiche dynamique d'après le PDF de l'auteur (`fiches/masses-hepatiques.html`, `regles/masses-hepatiques.js`, `fiches/digestif/foie-fiche.js`, `schemas/masses-hepatiques.css`, 8 tests) : carte des 12 lésions, calculateur LI-RADS, critères de l'HNF, schéma de Bismuth et Corlette, tableau final filtrable, CAT en 4 étapes, entraînement. Vérifiée en navigateur (interactions, téléphone, aucune erreur console).

- **SEO des fiches publiques** (31/10/2026) : méthode `SEO_FICHES.md`, `robots.txt`, `sitemap.xml` (26 fiches), `npm run seo:rapport` (état : 1 fiche sur 26 prête — Masses hépatiques, modèle), `tests/seo-fiches.test.js`. Offre gratuit / premium : `OFFRE_FREEMIUM.md` et `PROTECTION_PREMIUM.md` (rien n'est changé ; fiches gratuites).

- **Masses hépatiques — foie en 3D** (31/10/2026) : modèle Z-Anatomy (8 segments de Couinaud, veine porte, veines hépatiques, VCI, vésicule), pseudolésions de la fiche (stéatose et épargne focales : segment IV), `scripts/export_foie.py`, tests d'orientation.

## À vérifier
- Fiche AVC hémorragique (points à trancher), Crohn (préparation entéro-IRM), rectum (légendes), amylose (légendes), otospongiose (clichés), myocardite (relecture), radius distal (nomenclature).
- Images manquantes : pancréas, Crohn.
- Cas bilingues (hernie d'Amyand) et « Le menton qui s'endort ».
- **Masses hépatiques** : tableau LI-RADS à confirmer (version de référence ; HRPA périphérique non prévu) ; **schéma de Bismuth et Corlette** à valider anatomiquement (dessin schématique, pas l'image du PDF) ; cas et cartes reformulés à relire ; PDF source rangé dans le dépôt privé (`sources/masses-hepatiques/`).

- **LI-RADS** : fiche, calculateur et éditeur concordent (ACR v2018, tests exhaustifs) ; croissance seuil = ≥ 50 % en ≤ 6 mois ; le 31/10/2026 : un LR-5 n'est plus déclassé par les critères accessoires (éditeur) et la phrase du diagnostic non invasif de CHC est reformulée (fiche).
- **SEO** : auteur affiché « Radiologic Hub » provisoirement (identification à définir) ; 3 références conservées comme lectures complémentaires (année en évidence) ; Google Search Console à créer.

- **Foie en 3D** : segment IV non subdivisé en IVa / IVb (pack) ; vaisseaux sans branches segmentaires ; descriptions de position des segments à relire ; seules la stéatose et l'épargne focales ont un siège dans la fiche (autres pathologies : à fournir par l'auteur).

## Prochaine tâche importante
Relecture par l'auteur de l'AVC hémorragique puis publication ; **SEO des autres fiches, une PR par fiche** (`SEO_FICHES.md`) ; relecture de la fiche Masses hépatiques solides (points ci-dessus). Spécialités à alimenter : Traumato, Pédiatrie, Imagerie de la femme.
