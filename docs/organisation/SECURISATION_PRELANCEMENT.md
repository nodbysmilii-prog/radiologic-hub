# Correctif préalable — 31 octobre 2026

Préparé, non appliqué. Base : commit 6039d39402aefe6b856278ff5b295efbc556eefa.

## SQL : périmètre et limites

`supabase/sql/securisation-prelancement.sql` est un script explicite, hors du dossier des migrations automatiques. Il ne doit être exécuté qu'après autorisation distincte, sauvegarde des ACL et relecture du diff par rapport à la base à cet instant.

- Retire SELECT au niveau table et colonnes sur `net.http_request_queue` et `net._http_response` à PUBLIC/anon/authenticated. Ne change ni fonctions net, ni schéma net, ni secrets, ni tâches Cron.
- Retire EXECUTE à PUBLIC/anon sur les signatures applicatives explicitement inventoriées dans le script. Aucune fonction d'extension ou autre fonction publique n'est visée.
- Aucun GRANT ajouté. Contrôles par **signature exacte** des RPC membres et service nécessaires lorsqu'elles existent : si un droit utile manque, le lot est annulé pour examen.
- Les GRANT des tables/colonnes publiques (Bibliothèque et Cours) ne sont pas modifiés. Les points d'entrée HTTP rp-lien/rp-agent/rp-taches ne sont pas supprimés. Les RPC de ces modules sont réservées à authenticated/service_role dans la référence du dépôt ; aucun besoin légitime d'EXECUTE anon n'a été trouvé dans le code examiné.
- Détecte un droit excessif encore effectif par héritage, et annule la transaction entière.
- Ne corrige pas les privilèges par défaut des futures fonctions ; toute future fonction devra recevoir des grants explicites et être revue. Ne constitue pas un audit exhaustif de toute la production.
- Aucun contenu SQL métier, politique RLS, table ou donnée utilisateur modifié par ce script. Il ne déploie pas Vault ni le fil Communauté.

## Tests reproductibles

```sh
npm ci --prefix tests/sql/prelancement --no-audit --no-fund
npm test --prefix tests/sql/prelancement
node --test tests/exploitation-supabase.test.js tests/remplacements-taches.test.js
```

Le test isolé exécute le vrai SQL sur PostgreSQL via PGlite 0.3.14, avec des rôles et objets fictifs : lecture pg_net refusée sous anon, RPC membre encore exécutable sous authenticated, table publique et fonction hors périmètre accessibles, droit service conservé, trigger utilisable, relance idempotente, échec et rollback atomique en cas d'héritage excessif ou de droit membre manquant. Ce n'est pas une exécution sur la production ni une reproduction complète de Supabase.

Les 21 tests ciblés existants ont réussi. La suite de publication complète n'est pas revendiquée : aucune modification du frontend, des workflows ou de la liste blanche. Avant une éventuelle publication de cette branche, utiliser un checkout complet et exécuter `npm run publication` comme l'exige CLAUDE.md. Ne pas fusionner cette branche ni déclencher de déploiement sans accord.

## Supabase Auth : proposition exacte, non appliquée

Garder Site URL `https://radiologichub.com` et les quatre URL existantes pendant la transition :

```text
https://radiologichub.com/communaute.html
https://radiologichub.com/remplacements.html
https://nodbysmilii-prog.github.io/radiologic-hub/communaute.html
https://nodbysmilii-prog.github.io/radiologic-hub/remplacements.html
```

Ajouter six URL exactes :

```text
https://radiologichub.com/communaute
https://radiologichub.com/remplacements
https://radiologichub.com/bibliotheque
https://radiologichub.com/bibliotheque.html
https://radiologichub.com/bibliotheque-admin
https://radiologichub.com/bibliotheque-admin.html
```

Les retours Communauté/Remplacements du code sont explicitement en `.html` et sont déjà autorisés. Bibliothèque utilise le pathname courant ; Pages sert les chemins sans extension. Aucun wildcard ajouté.

WWW : aucun retour supplémentaire nécessaire si WWW redirige vers la racine **avant** l'usage de l'application. Sinon, l'usage direct de WWW nécessite un lot séparé de huit URL exactes (les quatre pages ci-dessus, avec et sans `.html`, sous `https://www.radiologichub.com`). Ne pas l'ajouter préventivement si la redirection canonique est validée.

Les interfaces examinées utilisent Google OAuth et lien magique, pas de parcours applicatif de réinitialisation par mot de passe. Ne pas prétendre qu'un parcours absent a été testé. L'espace utilisateur est une route fragment du module Remplacements, pas une nouvelle origine de retour. Les deux URL historiques GitHub ne seront retirées qu'après fermeture explicite de la fenêtre de retour arrière. Aucun retour pages.dev ni d'aperçu proposé dans le lot minimal.

## Checklist courte : bascule seulement après le seuil et une nouvelle autorisation

1. Après le **1er novembre 2026 à 01:05 (Tunis)** : vérifier absence DS au registre et via résolveurs ; le temps écoulé seul n'autorise pas la bascule.
2. Sauvegarder les DNS/ACL et confirmer les quatre Brevo DNS-only, aucun MX oublié. Ne rien supprimer chez Spaceship.
3. Éviter de déléguer une racine CNAME Pages encore non associée : faire approuver le miroir GitHub temporaire dans Cloudflare, ou un autre ordre officiel validé. Les changements ne sont pas appliqués par cette checklist.
4. Après accord explicite à ce moment : déléguer vers `rodney.ns.cloudflare.com` et `venus.ns.cloudflare.com`, attendre Active, puis terminer racine et WWW dans **Pages > radiologic-hub > Custom domains** ; vérifier DNS et certificats des deux noms.
5. Vérifier WWW→racine, HTTP→HTTPS, pages essentielles, Auth avec compte de test autorisé, anciens liens e-mail sans action réelle et DNS/authentification Brevo. Aucun test d'envoi ou déploiement implicite.
6. Garder GitHub public et Spaceship intact pendant le retour arrière. GitHub privé et nouveau déploiement de validation : autorisations distinctes après stabilisation. DNSSEC Cloudflare : nouveau DS seulement, sur accord séparé.

Retour arrière soumis à autorisation : restaurer les quatre A GitHub `185.199.108.153` à `185.199.111.153` et WWW vers `nodbysmilii-prog.github.io` en DNS-only, sans toucher à Brevo ; ou retour aux NS Spaceship après traitement préalable d'un éventuel DS Cloudflare. Un retour DNS n'annule pas une migration SQL. Pour revenir sur les ACL, utiliser leur sauvegarde exacte, ne pas réouvrir globalement les droits à PUBLIC.

## Revue complémentaire ciblée

Compatibilité avec c10dfb5 : aucun changement Supabase, workflows ou code Auth depuis la base du patch. Seul conflit documentaire README résolu en conservant les deux entrées. Les retraits EXECUTE sont désormais bornés à des signatures exactes connues : une nouvelle fonction publique ou une surcharge inconnue reste inchangée. Les tests incluent ces deux cas et les grants de colonnes pg_net. Ce correctif ne revendique pas de fermer toutes les futures fonctions anonymes.

Réexamen Auth : les deux URL sans extension Communauté/Remplacements sont préventives et ne sont pas produites par les fonctions retour actuelles. Le minimum fonctionnel certain est d’ajouter bibliotheque et bibliotheque-admin, avec et sans .html (quatre URL). Les deux autres ajouts peuvent rester optionnels ; conserver leurs variantes .html déjà autorisées. Aucun changement appliqué.

## Reprise par Claude Code (31/10/2026)

Patch v2 appliqué tel quel (`git am`, 2 commits, empreintes SHA-256 du transfert vérifiées, SQL identique à la copie de revue) sur la branche principale `c10dfb5`. Vérifications ajoutées, **sans modifier le script** :
- `tests/sql/prelancement-compat.js` (dans `npm run test:sql`) : PostgreSQL 16 local, simulation Supabase, **toutes les migrations du dépôt**, droits d'exécution accordés par défaut à anon comme sur Supabase avant correctif → script validé et relançable ; 60 fonctions listées sur 60 présentes ; anon n'en exécute plus aucune ; membres connectés et `service_role` conservent celles qu'utilisent le site et les fonctions serveur ; lectures publiques (cours, colonnes publiques de la bibliothèque) intactes.
- Toutes les suites SQL existantes repassent avec le correctif appliqué : `RH_SQL_APRES=supabase/sql/securisation-prelancement.sql npm run test:sql`.
- Appels du site : toutes les RPC visées (`rp_est_admin`, `rp_compteurs`, `rp_statistiques`, `rs_*`…) ne sont appelées qu'après connexion ; aucune règle d'accès destinée à anon n'utilise ces fonctions ; fonctions serveur : seulement `rp_taches_secret_valide` et `rs_rappels_messages` (service_role, conservées).
- Fonctions du dépôt hors liste : `cours_images_avant_ecriture`, `cours_maj_le`, `cours_validations_avant_ecriture` (déclencheurs, déjà fermés à anon par leur migration).

## Application en production (préparée le 31/10/2026, NON exécutée)

**Diagnostic réel du 31/10/2026** (workflow « Exploitation Supabase », lecture seule) : file `pg_net` **lisible** par les visiteurs et les membres (faille confirmée) ; migrations non appliquées : `abonnements`, `espace_dicom`, `communaute_fil`, `planification_vault` (leurs fonctions sont absentes : le correctif les ignore) ; `RP_URL_SITE` ≠ `https://radiologichub.com` (lot séparé).

Fichiers (`supabase/sql/`) :
- `securisation-sauvegarde.sql` : copie les droits actuels des 60 fonctions et des 2 files `pg_net` dans `securite_sauvegarde.droits_20261031` (schéma fermé à anon et authenticated) ; ne change aucun droit.
- `securisation-a-appliquer.sql` (v1, retiré, voir plus bas) : sauvegarde puis correctif revu (PR #101) ; remplacé par `securisation-a-appliquer-v2.sql`.
- `securisation-retour-arriere.sql` : réaccorde exactement les droits retirés, d'après la sauvegarde, et rien d'autre.
- `diagnostic.sql`, section `securisation` (lecture seule) : nombre de fonctions visées présentes, celles exécutables par anon, fonctions des membres ou du serveur sans droit, files `pg_net` lisibles, autres fonctions publiques exécutables par anon (nombre), sauvegarde présente.

Cycle vérifié sur PostgreSQL 16 reproduisant la production (`tests/sql/securisation-application.js`) : diagnostic avant → application → diagnostic après → retour arrière exact → réapplication.

Procédure (une autorisation, une action) : 1) Claude lance le diagnostic (lecture seule) et compare avec les attentes ; 2) l'auteur colle `securisation-a-appliquer.sql` dans *Supabase → SQL Editor → New query → Run* ; 3) Claude relance le diagnostic : attendu `pg_net` non lisible, 0 fonction visée pour anon, aucune fonction des membres ou du serveur sans droit, sauvegarde présente ; 4) tests du site (Cloudflare, visiteur réel ; compte de test si disponible). Retour arrière : coller `securisation-retour-arriere.sql`, puis diagnostic.

## Échec de la v1 en production et correction (31/10/2026)

Exécution de `securisation-a-appliquer.sql` (v1) par l'auteur : `ERROR P0001 : Droit de lecture pg_net persistant : net.http_request_queue (héritage à examiner)`. Diagnostic en lecture seule juste après : **transaction annulée** (les 33 fonctions restent exécutables par anon, aucun droit changé) ; **sauvegarde présente** (transaction séparée, validée).

Cause (documentation Supabase « Revoking access to pg_net objects has no effect ») : ni héritage ni droit direct de `postgres` ; les files pg_net appartiennent à `supabase_admin`, qui accorde leurs droits à **PUBLIC**. Un rôle ne peut retirer que les droits qu'il a lui-même accordés : le `REVOKE` lancé par `postgres` (SQL Editor) n'a rien retiré (« no privileges could be revoked »), et la vérification finale a annulé le lot comme prévu. Retirer ces droits casserait pg_net et Supabase ne permet pas de les modifier projet par projet.

Correction (v2) : `securisation-a-appliquer-v2.sql` = même sauvegarde (relançable, la sauvegarde d'origine est conservée) + `securisation-fonctions.sql`, partie « fonctions » du correctif #101 **à l'identique**, sans pg_net. Lors de l'essai v1, cette partie s'est exécutée en production sans erreur avant l'annulation finale : `postgres` peut bien retirer ces droits. Protection de pg_net : le schéma `net` ne doit jamais être exposé par l'API (contrôlé par le diagnostic, nouvelle section « API de données ») et aucun secret durable ne doit passer dans les en-têtes d'une requête pg_net (point à garder pour la planification Vault : son mot de passe transite par la file le temps de l'envoi). `securisation-a-appliquer.sql` (v1) est retiré du dépôt ; `securisation-prelancement.sql` reste comme référence de la revue.
