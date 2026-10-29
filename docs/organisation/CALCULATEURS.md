# Suivi — calculateurs et classifications

Fichiers : `regles/*.js` (birads, bosniak-cr, cadrads, classifications, eu-tirads, fleischner, lakelouise, qanadli, tnm-cavum, mcdonald…), `outils/` (OsteoGamme, Bosniak), `suivi/` + `suivi-oncologique.html` (RECIST 1.1 / Lugano), `tests/*.test.js`. README : « Suivi oncologique », « À faire ».

## Réalisé
- Charte de conception `CHARTE_CALCULATEURS.md` (29/10/2026) : à lire avant toute modification importante d'un calculateur ou d'une classification.
- Calculateurs et textes de conclusion : BI-RADS, PI-RADS, EU-TIRADS, Fleischner, FIGO, Bosniak, CAD-RADS, Lake Louise, Qanadli, TNM cavum, McDonald, OsteoGamme.
- Lot de classifications du 24/10/2026 (O-RADS, AAST, Tönnis, Scheltens, wash-out, TL AOSIS…).
- Suivi oncologique : première étape faite.

## À vérifier
- **Validation par l'auteur** des classifications du 24/10/2026 et des seuils choisis par défaut.
- Règles et textes PI-RADS, BI-RADS (lexique, conclusion), FIGO, RECIST, Lugano ; `suivi/seuils.js` par un radiologue.
- Coroscanner / CAD-RADS (seuils P1-P4, conduites proposées).

## Prochaine tâche importante
Suivi oncologique, étapes 2 à 7 (moteur RECIST 1.1, texte, contrôles, Lugano) après validation des seuils.
