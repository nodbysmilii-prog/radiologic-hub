# Suivi — module Communauté

Fichiers : `communaute.html`, `reseau/` (`noyau/regles.js`, `noyau/confidentialite.js`, `api-supabase.js`, `api-demo.js`, `images.js`, `ui.js`, `app.js`), `supabase/migrations/`. Même base et même administrateur que Remplacements. README : section « Communauté ».

## Réalisé
- Connexion Google/lien e-mail, profils, vérification, cas anonymisés (métadonnées retirées, masquage, alerte d'identité), j'aime, commentaires, abonnements, messagerie temps réel, modération, suppression de compte.
- Mode démonstration (données fictives).
- Projet Supabase (Francfort), migrations 1 à 5, `config.js` renseigné (27/10/2026).

## À vérifier
- Migration `20261027120000_communaute_fil.sql` à exécuter (demandes d'avis, remplacements dans le fil).
- Administrateur (`rp_admins`), temps réel (`rs_messages`, `rs_participants`, `rs_notifications`), URL de redirection, identifiant Google OAuth activé, essai à deux comptes.
- Juridique : conditions d'utilisation (`mentions-legales.html#conditions`), INPDP, durées entre crochets.

## Prochaine tâche importante
Exécuter la migration du fil puis configurer Google OAuth et le temps réel (`remplacements/INSTALLATION.md`, étapes 4, 4 bis, 10).

Plus tard : SMS de vérification, purge automatique, groupes, notifications push, import Instagram.
