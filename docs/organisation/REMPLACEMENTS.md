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
