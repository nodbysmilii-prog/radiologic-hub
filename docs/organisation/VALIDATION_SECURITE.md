# Validation sécurité et infrastructure — RÉFÉRENCE UNIQUE

> Mis à jour le 31/10/2026 (fin d'après-midi, UTC). À lire en premier pour reprendre le chantier technique. Statuts : **VALIDÉ** (preuve réelle), **PRÊT** (préparé et testé, en attente de fusion), **À VALIDER** (autorisation de l'auteur nécessaire), **BLOQUÉ** (obstacle), **À FAIRE**. Un test simulé ne vaut jamais « VALIDÉ ».
> Détails : `PUBLICATION.md` (hébergement, publication), `SECURISATION_PRELANCEMENT.md` (droits), `MIGRATIONS_PRODUCTION.md` (PR #104), `PROTECTION_PREMIUM.md` / `OFFRE_FREEMIUM.md` (PR #100).

## Tableau de bord

| # | Chantier | Statut | Preuve / prochaine étape |
|---|---|---|---|
| 1 | Publication par liste blanche (aucun fichier interne publié) | **VALIDÉ** | `https://radiologic-hub.pages.dev` : test réel 59/59 (30/10 et 31/10), 730 fichiers internes en 404 ; contrôle ponctuel du 31/10 : `CLAUDE.md`, `supabase/sql/*`, `docs/*`, workflows, scripts, moteur Remplacements → 404 ; PR #96, #97 |
| 2 | Fonctions exécutables par les visiteurs (33) | **VALIDÉ** | Diagnostic réel après correctif (run 41221342132) : `exécutables par anon (0)`, membres et serveur sans manque ; appels visiteur `rp_est_admin`, `rs_mes_conversations`, `rp_statistiques` → 401 « permission denied » ; PR #101, #102, #103 |
| 3 | Sauvegarde des droits (`securite_sauvegarde.droits_20261031`) | **VALIDÉ** | Diagnostic réel : « sauvegarde présente : oui » ; retour arrière `supabase/sql/securisation-retour-arriere.sql` testé (8/8) |
| 4 | Files `pg_net` | **VALIDÉ** (contrainte Supabase) | Droits PUBLIC accordés par `supabase_admin`, non modifiables (doc. Supabase) ; protection effective : schéma `net` **non exposé** par l'API (diagnostic réel, run 41216136352 : `public, graphql_public`) |
| 5 | Fonction publique inconnue | **VALIDÉ** (faux positif) | Identifiée par sonde visiteur réelle : `public.rls_auto_enable()`, déclencheur d'événement installé par Supabase ; appel direct impossible (« cannot display a value of type event_trigger ») ; aucune correction nécessaire |
| 6 | Diagnostic étendu (alertes Security Advisor, réglages Auth, noms des fonctions hors liste) | **PRÊT** | PR #105 ; après fusion : Claude lance le diagnostic et complète les lignes 7, 9, 12 |
| 7 | Avertissements de sécurité Supabase | **À FAIRE** (dépend de #6) | Lus par le diagnostic après fusion de #105 ; tri risques réels / faux positifs |
| 8 | Droits des tables et du stockage (visiteur) | **VALIDÉ** | Sondes visiteur réelles (30/10) : toutes les tables `rp_*`, `rs_*`, `profils` refusées (401) ; `bib_articles` limité aux colonnes publiques ; aucun seau ni fichier listable ; tests SQL locaux de tous les modules (CI verte) |
| 9 | Droits pour un membre connecté (réel) | **BLOQUÉ** | Nécessite un compte de test réel ; à faire avec l'auteur (aucune donnée réelle créée par Claude) |
| 10 | Fonctions Edge : contournement des contrôles | **À FAIRE** (test réel) | Revue du code faite (31/10) : `rp-agent` exige un jeton vérifié (`auth.getUser`), administrateur vérifié côté serveur ; `rp-lien` jetons à usage unique ; `rp-taches` secret ; aucune fonction appelée en visiteur parmi celles fermées. Test réel avec compte → avec #9 |
| 11 | 4 migrations absentes (`communaute_fil`, `planification_vault`, `abonnements`, `espace_dicom`) | **PRÊT** | PR #104 : base reproduisant la production, 12/12 (aucune fonction ouverte aux visiteurs, retours arrière exacts) ; ensuite **À VALIDER** une par une (ordre dans `MIGRATIONS_PRODUCTION.md`) |
| 12 | Adresses de retour Auth | **À VALIDER** | Nécessaires et suffisantes : `https://radiologichub.com/remplacements.html`, `/communaute.html` (présentes) + `/bibliotheque`, `/bibliotheque.html`, `/bibliotheque-admin`, `/bibliotheque-admin.html` (à ajouter) ; garder les 2 adresses `…github.io/radiologic-hub/…` jusqu'au passage en privé ; **aucun joker**, rien pour `www` (redirigé vers la racine). Pas de mot de passe dans le site (lien magique + Google) : la réinitialisation de mot de passe est sans objet |
| 13 | Secret `RP_URL_SITE` | **À VALIDER** | Diagnostic réel : ≠ `https://radiologichub.com` → les liens des e-mails pointent ailleurs ; correction : *Edge Functions → Secrets* |
| 14 | Redéploiement des fonctions Edge | **À VALIDER** | Diagnostic réel : dernier déploiement 26/10, 8 fichiers modifiés depuis (moteur, modèles, `rp-taches` version Vault) ; workflow « Déployer les fonctions Supabase » + `DEPLOYER` ; **coordonné** avec la migration `planification_vault` (sinon `rp-taches` refuse tous les appels) |
| 15 | Planification (Cron) | **À VALIDER** | Aucune tâche Cron ; après migration + redéploiement : `supabase/sql/planification.sql` ; puis suppression de `RP_TACHES_SECRET` après 24-48 h |
| 16 | Secrets dans `pg_net` | **VALIDÉ** (risque accepté) | Le mot de passe de `rp-taches` transitera dans la file le temps de l'envoi ; lisible seulement par une connexion SQL directe (schéma non exposé) ; mot de passe aléatoire du Vault, renouvelable |
| 17 | E-mails réels (Brevo) | **À VALIDER** | `EMAIL_FOURNISSEUR = journal` (aucun envoi) ; `BREVO_API_KEY` présente ; SMTP personnalisé d'Auth : affiché par #105 |
| 18 | Données personnelles dans les journaux | **À FAIRE** (mineur) | En mode `journal`, `transport.ts` écrit l'adresse du destinataire dans les journaux des fonctions (privés au projet) ; masquer l'adresse au prochain lot de code |
| 19 | Bascule du domaine vers Cloudflare | **BLOQUÉ** (vérification) / **À VALIDER** | Interdite avant le **01/11/2026 01:05 (Tunis) = 00:05 UTC** ; vérifications DNS en lecture impossibles depuis Claude (résolveurs DoH et tableau de bord Cloudflare inaccessibles) ; `radiologichub.com` est encore servi par GitHub Pages (en-tête `server: GitHub.com`, 31/10) ; procédure Brevo dans `PUBLICATION.md` |
| 20 | Domaine racine et `www` sur Cloudflare Pages | **À VALIDER** | Après la délégation : *Pages → radiologic-hub → Custom domains* + règle `www` → racine |
| 21 | Aperçus Cloudflare | **VALIDÉ** | Désactivés par l'auteur (30/10) ; aucun aperçu créé pour #98 à #106 |
| 22 | Dépôt GitHub privé | **À VALIDER** (après #19-20) | Collaborateurs : propriétaire seul (31/10) ; workflows compatibles (#98, contrôles testés) ; historique : 428 commits, **aucun secret réel** (31/10) ; GitHub Pages s'arrêtera ; procédure : `PUBLICATION.md` étape 6 |
| 23 | Protection premium | **PRÊT** (fondation) | Migration `abonnements` (#104) + lecture contrôlée `ab_lire_contenu` et client isolé (PR #106, 6/6 + 4/4) ; décision des contenus : `PROTECTION_PREMIUM.md` (PR #100, autre session) |
| 24 | Sauvegardes et restauration | **À FAIRE** | Sauvegarde `pg_dump` locale du 29/10 jamais restaurée ; vérifier le forfait (*Database → Backups* : sauvegardes quotidiennes réservées aux forfaits payants selon Supabase) ; procédure ci-dessous |
| 25 | Tests des modules (visiteur) | **VALIDÉ** | 59/59 sur Cloudflare (31/10, après correctif) : comptes rendus, calculateurs, fiches, 3D, atlas, Remplacements/Communauté/Bibliothèque en mode Supabase réel, page de réponse |
| 26 | Tests des parcours connectés réels | **BLOQUÉ** | Compte de test réel nécessaire (voir #9) |

**Compte au 31/10/2026** : 11 VALIDÉ, 3 PRÊT, 7 À VALIDER, 3 BLOQUÉ, 3 À FAIRE (certains chantiers combinent deux statuts).

## Actions de production à autoriser (dans l'ordre conseillé)
1. Fusionner #105 (diagnostic) → Claude lance le diagnostic et trie les alertes.
2. Corriger `RP_URL_SITE` et les adresses de retour Auth (#12, #13).
3. Fusionner #104 puis appliquer `communaute_fil` (une autorisation).
4. Planification : migration `planification_vault` → redéploiement (`DEPLOYER`) → Cron → contrôle (#14, #15).
5. Après le 01/11 00:05 UTC : bascule DNS (procédure Brevo), domaines Cloudflare, puis dépôt privé une semaine plus tard.
6. Premium : décision des contenus (PR #100), puis migrations `abonnements` + `abonnements_acces` (#106).

## Sauvegarde et restauration (forfait actuel)
- **Avant chaque action de production** : diagnostic en lecture seule (Claude) ; pour les droits, la sauvegarde `securite_sauvegarde` existe ; chaque migration a son retour arrière (`supabase/sql/retour/`).
- **Données** : si le forfait n'inclut pas de sauvegarde quotidienne, l'auteur fait un `pg_dump` (lien *Database → Connect*) vers un stockage **chiffré** qui lui appartient, avant chaque migration ; **jamais** dans GitHub (dépôt public) ni sur un ordinateur non chiffré. Restauration à tester une fois dans une base locale vide (PostgreSQL 16) : `pg_restore --no-owner` puis `npm run test:sql` adapté.
- **Supervision** : diagnostic à la demande (workflow) ; journaux des fonctions dans *Edge Functions → Logs* ; alertes de sécurité via #105.

## Conditions avant le passage du dépôt en privé
Bascule DNS faite et stable (une semaine), site servi par Cloudflare, connexion testée sur `radiologichub.com`, adresses `github.io` retirées de l'Auth, workflows vérifiés après le passage (diagnostic).

## Conditions avant l'ouverture des abonnements
Décision des contenus premium et rédaction de contenu nouveau (jamais public) ; migrations `abonnements` + `abonnements_acces` appliquées ; interface branchée sur `abonnements/acces.js` ; tests réels avec comptes abonné / non abonné / expiré ; paiement et facturation choisis ; CGV, mentions légales, INPDP ; dépôt privé.
