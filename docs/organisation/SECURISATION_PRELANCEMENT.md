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
