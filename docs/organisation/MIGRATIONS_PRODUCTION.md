# Migrations absentes de la production — procédure (préparée le 31/10/2026, NON appliquée)

État réel (diagnostic du 31/10/2026) : appliquées `remplacements`, `reseau`, `droits_explicites`, `bibliotheque`, `cours` + sécurisation v2. **Absentes** : `communaute_fil`, `planification_vault`, `abonnements`, `espace_dicom`.

Vérifié par `tests/sql/migrations-production.js` (dans `npm run test:sql`) sur une base qui reproduit la production (5 migrations, droits par défaut de Supabase y compris pour les futures fonctions, pg_net à `supabase_admin`, sécurisation v2) : chaque migration s'applique, est reconnue par le diagnostic, **n'ouvre aucune fonction à anon**, garde les droits des membres et du serveur, reste compatible avec la sécurisation v2 (relançable), se réapplique sans effet, et son retour arrière rend l'état exact.

| Ordre | Migration (fichier à coller dans *SQL Editor*) | Utilité | Prérequis / coordination | Retour arrière |
|---|---|---|---|---|
| 1 | `supabase/migrations/20261027120000_communaute_fil.sql` | Annonces de remplacement dans le fil, « Demander un avis » (aujourd'hui en erreur pour un membre) | Aucun ; contrainte compatible avec les cas existants (déjà 1 à 10 images) | `supabase/sql/retour/20261027120000_communaute_fil.sql` (refusé si des demandes d'avis existent) |
| 2 | `supabase/migrations/20261029120000_planification_vault.sql` | Mot de passe de `rp-taches` dans le Vault | **Coordonnée** : migration → redéploiement des fonctions (workflow, confirmation `DEPLOYER`) → `supabase/sql/planification.sql` (Cron) → contrôle → suppression de `RP_TACHES_SECRET` après 24-48 h | `supabase/sql/retour/20261029120000_planification_vault.sql` (refusé si la tâche Cron existe) |
| 3 | `supabase/migrations/20261030090000_abonnements.sql` | Abonnements, contenus réservés, stockage privé `premium` | Seulement quand la protection premium sera branchée | `supabase/sql/retour/20261030090000_abonnements.sql` (refusé si un abonnement existe) |
| 4 | `supabase/migrations/20261014090000_espace_dicom.sql` | Espace DICOM | Seulement quand le serveur DICOM existera (aujourd'hui en démonstration) | `supabase/sql/retour/20261014090000_espace_dicom.sql` (refusé si des examens existent) |

Pour chaque migration (une autorisation par migration) : 1) diagnostic en lecture seule (Claude) ; 2) l'auteur colle le fichier, *Run* (choisir *Run without RLS* si Supabase le propose : les tables créées ont déjà leurs règles d'accès) ; 3) diagnostic : migration « appliquée », `exécutables par anon (0)`, aucune fonction des membres ou du serveur sans droit ; 4) test du site (Cloudflare) ; en cas de problème : coller le retour arrière.

Sauvegarde : ces migrations ajoutent des objets sans modifier de données existantes (sauf la colonne `rs_cas.type`, ajoutée avec la valeur « cas ») ; la sauvegarde des droits `securite_sauvegarde.droits_20261031` reste en place. Sauvegarde des données : voir `VALIDATION_SECURITE.md`, chantier « Sauvegardes ».
