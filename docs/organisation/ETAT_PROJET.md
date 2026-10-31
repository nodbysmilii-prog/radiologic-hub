# État du projet RadiologicHub (mémoire commune)

> Mis à jour le 29/10/2026. Source de vérité détaillée : `README.md` (sections et « À faire »). Ce dossier sert à reprendre le travail dans une conversation indépendante sans tout relire.

## Comment l'utiliser
1. Lire `CLAUDE.md`, puis **uniquement** le fichier du module concerné.
2. Après chaque tâche terminée : mettre à jour la section « Réalisé / À vérifier / Prochaine tâche » du module (et ce fichier si la priorité change).
3. Les règles du dépôt restent inchangées : README à jour dans le même commit, `?v=` changés, charte `k-*`, réponses en français.

## Modules et fichiers de suivi
| Module | Suivi | Pages / dossiers principaux |
|---|---|---|
| Remplacements | `REMPLACEMENTS.md` | `remplacements.html`, `remplacements/`, `supabase/` |
| Comptes rendus | `COMPTES_RENDUS.md` | `comptes-rendus.html`, `cr*.js`, `regles/vrac.js`, `dictee/`, `assistant/` |
| Calculateurs et classifications | `CALCULATEURS.md` | `regles/`, `outils/`, `suivi/` |
| Communauté | `COMMUNAUTE.md` | `communaute.html`, `reseau/` |
| Fiches rapides | `FICHES.md` | `fiches-rapides.html`, `fiches/`, `cas/` |
| Radioanatomie, bibliothèque, masterclass, structure | `AUTRES_MODULES.md` | `radioanatomie/`, `espace-dicom*`, `bibliotheque*`, `cours/`, `index.html` |
| Publication, hébergement, sécurité, abonnements | `PUBLICATION.md` | `scripts/publication/`, `.github/workflows/`, `404.html`, `supabase/migrations/…_abonnements.sql` |

## Priorités actuelles (d'après le README)
1. **Mise en service Remplacements + Communauté** (Supabase en production ; fonctions déployées une seule fois, le 26/10/2026, sans la planification Vault ni la PR #95) : diagnostic en lecture seule (workflow « Exploitation Supabase »), migration Vault, `RP_URL_SITE`, redéploiement, planification, Brevo (bloqué : vérification SMS, assistance contactée), test de bout en bout.
2. **Protection du dépôt et des contenus** (publication par liste blanche fusionnée le 30/10/2026, Cloudflare Pages `radiologic-hub` créé) : bascule du domaine, puis dépôt privé — étapes dans `PUBLICATION.md`.
3. **Démarches juridiques** : mentions légales, conditions de la Communauté, INPDP, contrat.
4. **Validation par l'auteur** de la refonte ergonomique (branche `claude/refonte-ergonomie`, pas en ligne) et de `finition.css`.
5. **Relectures médicales en attente** (classifications du 24/10, comptes rendus du 08/10, fiches récentes).
6. Dictée vocale : **en pause** depuis le 23/10/2026 (demande de l'auteur).

## Vue d'ensemble de l'existant
- Site statique (HTML/CSS/JS ; en ligne sur GitHub Pages, Cloudflare Pages préparé ; seul `dist/`, construit par liste blanche, est destiné à la publication) + Supabase pour Remplacements et Communauté ; tests Node dans `tests/`.
- ~34 entrées dans `fiches/` (digestif, neuro, thorax, uro, ostéo-articulaire, cardio, ORL…), cas cliniques dans `cas/`.
- Éditeur de comptes rendus (42 modèles types, « Écrire en vrac », dictée, assistant documentaire), calculateurs/classifications, suivi oncologique.
- Espaces radioanatomie, DICOM (en développement), bibliothèque d'articles libres, cours d'échoanatomie.

## Points à vérifier (transversal)
- Branches non encore en ligne : `claude/refonte-ergonomie`, `feature/espace-dicom`, `apercu/espace-dicom`.
- Domaine officiel **https://radiologichub.com** (acheté chez Spaceship, DNS GitHub Pages, HTTPS imposé) ; adresse historique `nodbysmilii-prog.github.io/radiologic-hub/` redirigée. Supabase : Site URL et adresses de retour à jour, connexions testées sur le nouveau domaine dans Remplacements et Communauté.
- Sauvegarde `pg_dump` locale faite (catalogue lisible, tables `rp_*` présentes) : **aucune restauration testée**.
- `www.radiologichub.com` est un sous-domaine de `radiologichub.com` (déjà acheté chez Spaceship) : rien à acheter, il se règle dans le DNS (voir `PUBLICATION.md`, étape 4).
