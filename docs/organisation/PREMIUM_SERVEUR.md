# Contenus premium : protection côté serveur et migration progressive (31/10/2026)

Complète la fondation de la PR #106 (`abonnements/acces.js`, `ab_lire_contenu`) et la décision des contenus (`PROTECTION_PREMIUM.md`, PR #100). **Rien n'est branché, rien n'est appliqué, aucun contenu actuel n'est retiré.**

## Principe
Un contenu payant ne doit **jamais** être dans le site public (`dist/`, `RESERVE_ABONNES` de la liste blanche) ni lisible en bloc. Le navigateur ne décide de rien : il demande, la base (ou une fonction serveur) vérifie l'abonnement, puis sert **un** contenu à la fois.

| Chemin d'accès | Contrôle | État |
|---|---|---|
| Texte (modèles, phrases, fiches, légendes) | `ab_lire_contenu(id)` : connexion, abonnement en cours ou administrateur, identifiant valide, plafond 120 lectures/heure, journal | PR #106 + renforcement |
| Lecture directe de `ab_contenus` (`/rest/v1/ab_contenus`) | **Fermée aux abonnés** (porte unique) ; administrateur seul | Renforcement |
| Fichiers (`premium`, privé) | URL signée de 5 min ; aujourd'hui, la règle `premium_lecture` laisse un abonné **lister et signer tous** les fichiers (pas de plafond) | **À FAIRE avant le premier fichier** : fonction serveur `ab-fichier` (vérifie l'abonnement, plafond, journal, signe avec la clé serveur), puis retirer `premium_lecture` |
| Visiteur, compte sans abonnement, abonnement expiré | Refus explicite (`connexion`, `abonnement`) | Testé |
| Supabase injoignable | `estAbonne()` → `null` : la page affiche « service indisponible », jamais « réservé aux abonnés » à un abonné | Renforcement |

## Risques de contournement côté navigateur (et réponse)
- Masquer un bouton ou un bloc en CSS/JS : **ne protège rien** → le contenu n'est jamais dans la page avant la réponse de `ab_lire_contenu`.
- Copier la réponse : inévitable pour un abonné légitime ; freiné par le plafond, tracé par le journal (compte, contenu, date).
- Rejouer la requête avec la clé publique « anon » : refusée (`EXECUTE` retiré à anon).
- Lire la table ou le stockage directement : table fermée (porte unique) ; stockage → fonction `ab-fichier` à écrire.
- Partager son compte : hors périmètre technique (conditions d'utilisation ; le journal permet de repérer un usage anormal).

## Migration progressive d'un contenu (procédure)
1. L'auteur choisit le contenu (PR #100) et rédige si possible une version **nouvelle** (un contenu déjà public a pu être copié).
2. Saisie dans `ab_contenus` (administrateur), identifiant `^[a-z0-9-]{1,80}$`.
3. Page : remplacer le contenu statique par un emplacement qui appelle `RHPremium.creer(sb).lire(id)` ; message clair si `connexion`, `abonnement`, `limite`, `introuvable`, `indisponible`.
4. Retirer le fichier du site public : ajout à `RESERVE_ABONNES` (la publication échoue si le fichier revient dans `dist/`).
5. Tests : abonné / non abonné / expiré / administrateur / visiteur (SQL, simulés), puis test réel avec comptes de test.
6. Un module à la fois ; garder une version gratuite (aperçu) pour ne casser aucun parcours.

## Prérequis de production (à autoriser)
Migrations `20261030090000_abonnements` puis `20261031120000_abonnements_acces` (scripts d'application contrôlée, PR #110), décision des contenus, CGV et mentions légales, paiement (non activé).
