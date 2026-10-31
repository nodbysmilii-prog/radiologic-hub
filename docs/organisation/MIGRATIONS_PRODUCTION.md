# Migrations absentes de la production — procédure (préparée le 31/10/2026, NON appliquée)

État réel (diagnostic du 31/10/2026) : appliquées `remplacements`, `reseau`, `droits_explicites`, `bibliotheque`, `cours` + sécurisation v2. **Absentes** : `search_path_profil` (correctif ajouté le 31/10, lot Authentification), `communaute_fil`, `planification_vault`, `abonnements`, `espace_dicom`.

Vérifié par `tests/sql/migrations-production.js` (dans `npm run test:sql`) sur une base qui reproduit la production (5 migrations, droits par défaut de Supabase y compris pour les futures fonctions, pg_net à `supabase_admin`, sécurisation v2) : chaque migration s'applique, est reconnue par le diagnostic, **n'ouvre aucune fonction à anon**, garde les droits des membres et du serveur, reste compatible avec la sécurisation v2 (relançable), se réapplique sans effet, et son retour arrière rend l'état exact.

| Ordre | Migration (fichier à coller dans *SQL Editor*) | Utilité | Prérequis / coordination | Retour arrière |
|---|---|---|---|---|
| 0 | `supabase/migrations/20261031130000_search_path_profil.sql` | Correctif de l'alerte `function_search_path_mutable` : `rp_proteger_profil` avec `search_path = ''` (recommandation Supabase), sans changement de comportement | Aucun (une ligne) ; lot 1 « Authentification » | `supabase/sql/retour/20261031130000_search_path_profil.sql` |
| 1 | `supabase/migrations/20261027120000_communaute_fil.sql` | Annonces de remplacement dans le fil, « Demander un avis » (aujourd'hui en erreur pour un membre) | Aucun ; contrainte compatible avec les cas existants (déjà 1 à 10 images) | `supabase/sql/retour/20261027120000_communaute_fil.sql` (refusé si des demandes d'avis existent) |
| 2 | `supabase/migrations/20261029120000_planification_vault.sql` | Mot de passe de `rp-taches` dans le Vault | **Coordonnée** : migration → redéploiement des fonctions (workflow, confirmation `DEPLOYER`) → `supabase/sql/planification.sql` (Cron) → contrôle → suppression de `RP_TACHES_SECRET` après 24-48 h | `supabase/sql/retour/20261029120000_planification_vault.sql` (refusé si la tâche Cron existe) |
| 3 | `supabase/migrations/20261030090000_abonnements.sql` | Abonnements, contenus réservés, stockage privé `premium` | Seulement quand la protection premium sera branchée | `supabase/sql/retour/20261030090000_abonnements.sql` (refusé si un abonnement existe) |
| 4 | `supabase/migrations/20261014090000_espace_dicom.sql` | Espace DICOM | Seulement quand le serveur DICOM existera (aujourd'hui en démonstration) | `supabase/sql/retour/20261014090000_espace_dicom.sql` (refusé si des examens existent) |

## Scripts d'application contrôlée (31/10/2026, à utiliser à la place des fichiers bruts)
`supabase/sql/appliquer/<migration>.sql`, générés par `node scripts/supabase/assembler-application.js` (ne jamais les modifier à la main). **Une seule transaction** : prérequis (migrations et extensions nécessaires) → migration à l'identique → contrôles de sécurité ; au moindre écart, **tout est annulé** et le message dit pourquoi :
- migration reconnue (même test que le diagnostic) ;
- aucune fonction du schéma public exécutable par les visiteurs (hors `rls_auto_enable`, de Supabase) ;
- toutes les tables avec RLS ; aucun droit d'écriture des visiteurs sur une table ou une séquence ;
- toute fonction `SECURITY DEFINER` avec un `search_path` fixé.

Vérifié par `tests/sql/application-migrations.js` (dans `npm run test:sql`) sur une base qui reproduit la production **avec les droits par défaut de Supabase** (fonctions, tables et séquences futures ouvertes à anon, authenticated, service_role) : prérequis absent → refus sans rien créer ; fonction ouverte aux visiteurs, table sans RLS ou écriture des visiteurs → migration **entièrement annulée** ; application réussie dans l'ordre conseillé et dans l'ordre inverse (aucune dépendance cachée entre les 5) ; relance sans effet (secret du Vault inchangé) ; retour arrière puis réapplication.

**Défaut corrigé** par ce travail : avec les droits par défaut de Supabase, la migration `espace_dicom` laissait la séquence `dc_journal_id_seq` ouverte aux visiteurs (`USAGE`, `UPDATE` : faire avancer le compteur). Ajout de `revoke all on sequence public.dc_journal_id_seq from public, anon, authenticated` (colonne identity : aucun droit nécessaire pour insérer). Les autres migrations n'ont ni séquence ni droit par défaut restant.

**Nouveau contrôle du diagnostic** : les droits réels de la production (tables, colonnes, fonctions du schéma public) sont comparés à la référence testée `tests/sql/droits-attendus.txt` : « droits accordés en trop aux visiteurs, aux membres ou à PUBLIC » doit valoir **0** (les droits en plus pour `service_role`, la clé serveur, sont seulement comptés). Sur une base reproduisant le pire cas (droits par défaut réaccordés à toutes les fonctions existantes), aucun objet des 5 migrations n'apparaît en trop. **À lancer avant la première application** : si des écarts apparaissent sur les migrations déjà en production, les traiter d'abord.

## Procédure (une autorisation par migration)
Pour chaque migration (une autorisation par migration) : 1) diagnostic en lecture seule (Claude) ; 2) l'auteur colle le **script d'application** `supabase/sql/appliquer/<migration>.sql` (sinon le fichier brut), *Run* (choisir *Run without RLS* si Supabase le propose : les tables créées ont déjà leurs règles d'accès) ; 3) diagnostic : migration « appliquée », `exécutables par anon (0)`, aucune fonction des membres ou du serveur sans droit, « droits accordés en trop : 0 » ; 4) test du site (Cloudflare) ; en cas de problème : coller le retour arrière.

Sauvegarde : ces migrations ajoutent des objets sans modifier de données existantes (sauf la colonne `rs_cas.type`, ajoutée avec la valeur « cas ») ; la sauvegarde des droits `securite_sauvegarde.droits_20261031` reste en place. Sauvegarde des données : voir `VALIDATION_SECURITE.md`, chantier « Sauvegardes ».
