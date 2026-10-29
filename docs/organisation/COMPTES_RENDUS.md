# Suivi — module Comptes rendus

Fichiers : `comptes-rendus.html`, `cr.js`, `cr.css`, `cr-data.js` (42 modèles types), `cr-tools.js/.css`, `cr-vrac.js`, `regles/vrac.js`, `dictee/` (`lexique.js`, `corrections.js`, `traitement.js`), `assistant/` (`synonymes.js`), `tests/vrac.test.js`, `tests/dictee.test.js`. README : « Comptes rendus types… », tableaux « règles apprises » et « erreurs de dictée ».

## Réalisé
- Éditeur avec bibliothèque de modèles, phrases automatiques, choix `[a / b]` pour tout signe non noté.
- « Écrire en vrac » : règles générales apprises des retours de l'auteur (liste permanente au README).
- Assistant documentaire (fiches liées, 100 % local), indexation par `scripts/indexer_fiches.py`.
- Refonte ergonomique de la page (mode d'emploi dépliable) — **pas encore en ligne**.
- Dictée vocale (Web Speech Chrome) : **en pause depuis le 23/10/2026**.

## À vérifier
- Lot de formules normales du 08/10/2026 (anomalies rendues normales par défaut, doublons) ; IRM médullaire/cérébrale (technique vs compte rendu).
- Dictionnaire `assistant/synonymes.js` à relire (négation non analysée).
- Dictée : récupérer les listes « Mes corrections », tester au vrai micro (Chrome, Edge, Safari).
- Validation de la refonte (branche `claude/refonte-ergonomie`).

## Prochaine tâche importante
Faire valider la refonte de la page, puis continuer à intégrer les formules normales du service. Chaque retour de l'auteur = règle générale + test + ligne README (voir `CLAUDE.md`).
