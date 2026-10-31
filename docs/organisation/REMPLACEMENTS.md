# Suivi — module Remplacements

Fichiers : `remplacements.html`, `remplacements-reponse.html`, `remplacements/` (`noyau/moteur.js`, `api*.js`, `app.js`, `calendrier.js`, `modeles/`, `INSTALLATION.md`, `config.js`), `supabase/`. README : section « Remplacements ».

## Réalisé
- Parcours remplaçant / structure / administrateur, calendrier de disponibilités, demandes, agent de sélection et e-mails avec réponse en un clic, journal d'actions.
- Mode démonstration (données fictives) et mode production Supabase (lien magique, stockage privé, fonctions `rp-agent`, `rp-lien`, `rp-taches`).
- 17 modèles d'e-mails, contrat type, tests du moteur.
- Supabase créé, `config.js` renseigné, secrets réglés (`EMAIL_FOURNISSEUR=journal`), fonctions déployées le 27/10/2026.
- pg_cron et pg_net activés, aucune tâche Cron encore créée (constaté le 29/10/2026).
- Planification sécurisée par le Vault **préparée** (29/10/2026, non déployée) : migration `20261029120000_planification_vault.sql` (secret aléatoire dans le Vault, `rp_taches_secret_valide` réservée à `service_role`, `rp_prive.appeler_taches`), `rp-taches` vérifie via la base (`_shared/acces-taches.mjs`), `planification.sql` sans secret, `verification-planification.sql` ; tests `tests/sql/planification.js` et `tests/remplacements-taches.test.js`.

- Test complet en démonstration (phase A, 29/10/2026, 390 px) : publication → proposition → acceptation → choix → espaces → documents → annulation : tout fonctionne. Trois défauts corrigés le même jour (branche `claude/awesome-hopper-507hp8`, non fusionnée) : volontaires conservés après annulation (avec revérification des dates et conflits, choix concurrents protégés, propositions chevauchantes closes), e-mails en double vers une même adresse supprimés, jours de mission affichés « occupés » dans le calendrier. Tests : `tests/remplacements-annulation.test.js`.
- Connexion (31/10/2026, PR en attente) : retour sur la vue demandée avant le lien, message en français si le lien a expiré ou a déjà servi, mode visiteur et message si la session se perd ; `connexion.js` commun, test `npm run test:connexion`. Procédure Auth : `VALIDATION_SECURITE.md`, lot 1.

## À vérifier
- Après fusion : redéployer les fonctions (moteur, modèle d'e-mail `annulation`, `depot-supabase.ts` : nouvelle lecture `propositions.parRemplacant`).
- Planification : appliquer la migration Vault, lancer `verification-planification.sql` (colonnes `_oui` = true, `_non` = false), redéployer les fonctions, exécuter `planification.sql`, contrôler les journaux de `rp-taches` (pas de 403), puis supprimer le secret `RP_TACHES_SECRET`.
- Sur le vrai projet : confirmer que `anon` / `authenticated` n'ont aucun accès aux schémas `vault`, `net` et `rp_prive` (le script de vérification le montre).
- Domaine + compte Brevo + SMTP personnalisé, puis `EMAIL_FOURNISSEUR=brevo`.
- Administrateur déclaré (`rp_admins`) ; essai de bout en bout à plusieurs comptes.
- Juridique : `mentions-legales.html` (crochets), INPDP + transfert hors Tunisie, validation de `modeles/contrat.md`.

## Prochaine tâche importante
Relire et fusionner les trois corrections, puis redéployer les fonctions. Ensuite : mettre en service la planification (étape 7 réécrite de `remplacements/INSTALLATION.md`), puis Brevo et passage à `brevo` (étapes 3 et 4).

Améliorations ergonomiques relevées par la phase A (non faites) : vue « Mon agenda » pour le remplaçant et « Planning » pour la clinique, en-tête allégé et onglets visibles sur mobile, calendrier de demande ouvert sur le premier mois utile, liens plus grands.

Plus tard : WhatsApp/SMS, export comptable, notation des remplacements.

## Mise en service réelle — état au 29/10/2026
- **Domaine officiel** https://radiologichub.com (adresse historique `nodbysmilii-prog.github.io/radiologic-hub/`, redirigée). Supabase Auth : Site URL et adresses de retour à jour (nouveau domaine + historique), connexions testées. Code compatible sans modification (liens relatifs, retour vers la page ouverte, `RP_URL_SITE` pour les e-mails).
- **Fonctions Supabase** : un seul déploiement, le 26/10/2026 (commit `c6a4cbf`, historique GitHub Actions). **Pas encore en ligne** : planification Vault (`063be10`) et PR #95 (`7d9964b`).
- **Base** : mot de passe PostgreSQL renouvelé ; sauvegarde `pg_dump` locale (catalogue lisible, tables `rp_*` présentes), **jamais restaurée** ; administrateur opérationnel ; une inscription validée en réel ; persistance d'une nouvelle disponibilité **à confirmer**.
- **Planification** : pg_cron et pg_net activés ; migration Vault **non confirmée** ; aucune tâche Cron connue ; `RP_TACHES_SECRET` conservé jusqu'à vérification.
- **Brevo** : compte gratuit créé, vérification SMS bloquée (assistance contactée) ; rester en `EMAIL_FOURNISSEUR=journal`.
- **Workflow « Exploitation Supabase »** (branche `claude/exploitation-supabase`, à fusionner) : `diagnostic` en lecture seule ; autres actions désactivées.

### Étapes restantes (chacune avec autorisation explicite)
1. Fusionner les workflows (PR « workflows compatibles dépôt privé », 30/10/2026 : plus besoin d'environnement protégé ; lancement manuel par le propriétaire, branche principale, confirmation `DEPLOYER` pour déployer) ; `SUPABASE_ACCESS_TOKEN` reste un secret du dépôt, idéalement remplacé par un jeton à droits limités et expiration courte.
2. Lancer `diagnostic` et relire le rapport.
3. Sauvegarde `pg_dump` récente (idéalement : essai de restauration en local).
4. Migration Vault puis `verification-planification.sql` (colonnes `_oui` à vrai, `_non` à faux).
5. `RP_URL_SITE = https://radiologichub.com` ; vérifier que `RP_ORIGINE` est absent.
6. Redéployer les trois fonctions (workflow existant) ; contrôler par un nouveau diagnostic.
7. Créer la tâche Cron (`planification.sql`) ; contrôler exécutions et codes HTTP.
8. Test de bout en bout réel (deux comptes, e-mails en `journal`).
9. Après 24 à 48 h sans erreur : supprimer `RP_TACHES_SECRET`.
10. Brevo débloqué : domaine authentifié chez Spaceship (SPF, DKIM, DMARC), puis `EMAIL_FOURNISSEUR=brevo`.
