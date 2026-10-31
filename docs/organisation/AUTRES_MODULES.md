# Suivi — radioanatomie, bibliothèque, masterclass, structure du site

## Radioanatomie (`radioanatomie/`, `espace-dicom*`, `dicom/`)
- Réalisé : espace en ligne depuis le 17/10/2026 (IRM cérébrale IBC, genou, TDM thorax, radiographies thoraciques, cavum) ; Espace DICOM en développement (branche `feature/espace-dicom`).
- À vérifier : relecture des structures posées à la main (genou 47, thorax 10, radios 32 points, cavum 13) ; IRM cérébrale complète étape 3 en attente de validation ; DICOM : VPS, sous-domaine, migration `20261014090000_espace_dicom.sql`, spectroscopie GE.
- Réalisé (29/10/2026) : charte de conception `CHARTE_RADIOANATOMIE.md` (moteurs `atlas-coupes`, `planche`, `visionneuse`, formats, validation, limites, feuille de route § 12).
- À vérifier : relecture de la charte par l'auteur (palette commune, 3D, mode « trouver »).
- Prochaine tâche : validation de l'IRM cérébrale étape 3 par l'auteur ; côté code, tâche 1 de la feuille de route (textes en dur d'`atlas-coupes.js`).

## Bibliothèque (`bibliotheque.html`, `bibliotheque/`, `bibliotheque-admin.html`)
- Réalisé : annuaire d'articles libres (liens + résumé français), thèmes, recherche, filtres.
- Réalisé (29/10/2026) : charte `CHARTE_BIBLIOTHEQUE.md` (classement spécialité → thème → article, références, accès/licences, résumés originaux, recherche, composants, validation, présent vs prévu). Aucun article ni code modifié.
- À vérifier : tags, niveaux, Essentiels d'exemple ; objectif 50 à 100 articles dont 10 Essentiels ; relecture de la charte par l'auteur (§ 12 : licences acceptées, preprints, format des résumés, procédure de retrait).
- Prochaine tâche : étapes 3 à 6 (file « À valider », veille hebdomadaire, liens croisés, liens morts).

## Masterclass / cours (`index.html`, `cours/`, `cours-admin.html`)
- Réalisé : page d'accueil, cours d'échoanatomie (ischio-jambiers ; coude et nerf ulnaire publié le 14/10/2026).
- À vérifier : approbation du texte, schémas et modèles ; images échographiques anonymisées ; « Source / crédits ».
- Prochaine tâche : formulaire d'inscription non branché (`TODO` dans `script.js`) ; tarifs, horaires et nombre de cas d'exemple à remplacer.

## Structure du site
- `styles.css`, `finition.css` (aperçu à valider), `navigation.js`, menu et pied de page communs, `mentions-legales.html`, `public/`, `vendor/`, `scripts/`, `tests/`.
- À vérifier : refonte ergonomique (branche `claude/refonte-ergonomie`) ; contrastes proposés (`--muted`, ambre « Essentiel »).
- Prochaine tâche : valider la refonte, puis l'étendre à Fiches rapides et Radioanatomie. Plus tard : domaine `radiologichub.com`, application mobile (PWA).
