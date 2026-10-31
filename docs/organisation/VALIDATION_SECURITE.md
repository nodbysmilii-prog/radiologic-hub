# Validation sécurité et infrastructure — RÉFÉRENCE UNIQUE

> Mis à jour le 31/10/2026 (soir, UTC) : PR #108 fusionnée, diagnostic run 41229729376, lot 1 « Authentification » : procédure unique et corrections de connexion. À lire en premier pour reprendre le chantier technique. Statuts : **VALIDÉ** (preuve réelle), **PRÊT** (préparé et testé, en attente de fusion), **À VALIDER** (autorisation de l'auteur nécessaire), **BLOQUÉ** (obstacle), **À FAIRE**. Un test simulé ne vaut jamais « VALIDÉ ».
> Détails : `PUBLICATION.md` (hébergement, publication), `SECURISATION_PRELANCEMENT.md` (droits), `MIGRATIONS_PRODUCTION.md` (PR #104), `PROTECTION_PREMIUM.md` / `OFFRE_FREEMIUM.md` (PR #100).

## Tableau de bord

| # | Chantier | Statut | Preuve / prochaine étape |
|---|---|---|---|
| 1 | Publication par liste blanche (aucun fichier interne publié) | **VALIDÉ** | `https://radiologic-hub.pages.dev` : test réel 59/59 (30/10 et 31/10), 730 fichiers internes en 404 ; contrôle ponctuel du 31/10 : `CLAUDE.md`, `supabase/sql/*`, `docs/*`, workflows, scripts, moteur Remplacements → 404 ; PR #96, #97 |
| 2 | Fonctions exécutables par les visiteurs (33) | **VALIDÉ** | Diagnostic réel après correctif (run 41221342132) : `exécutables par anon (0)`, membres et serveur sans manque ; appels visiteur `rp_est_admin`, `rs_mes_conversations`, `rp_statistiques` → 401 « permission denied » ; PR #101, #102, #103 |
| 3 | Sauvegarde des droits (`securite_sauvegarde.droits_20261031`) | **VALIDÉ** | Diagnostic réel : « sauvegarde présente : oui » ; retour arrière `supabase/sql/securisation-retour-arriere.sql` testé (8/8) |
| 4 | Files `pg_net` | **VALIDÉ** (contrainte Supabase) | Droits PUBLIC accordés par `supabase_admin`, non modifiables (doc. Supabase) ; protection effective : schéma `net` **non exposé** par l'API (diagnostic réel, run 41216136352 : `public, graphql_public`) |
| 5 | Fonction publique inconnue | **VALIDÉ** (faux positif) | Identifiée par sonde visiteur réelle : `public.rls_auto_enable()`, déclencheur d'événement installé par Supabase ; appel direct impossible (« cannot display a value of type event_trigger ») ; aucune correction nécessaire |
| 6 | Diagnostic étendu (alertes Security Advisor, réglages Auth, noms des fonctions hors liste) | **VALIDÉ** | PR #105 fusionnée (31/10) ; diagnostic réel run 41225294878 |
| 7 | Avertissements de sécurité Supabase | **VALIDÉ** (triés) | Run 41225294878 : `authenticated_security_definer_function_executable` (21 fonctions des membres) → **voulu** (elles ne renvoient qu'un booléen ou les données du membre, nécessaires au site) ; `anon/authenticated … rls_auto_enable` → fonction de Supabase, faux positif ; `rls_enabled_no_policy` sur `rp_admins`, `rp_jetons` → **voulu** (aucun accès direct, lecture par fonctions serveur) ; `auth_leaked_password_protection` → sans objet (aucun mot de passe : lien magique et Google) ; **à corriger** : `function_search_path_mutable` sur `public.rp_proteger_profil` (correctif d'une ligne à préparer, voir S1 bis) |
| 8 | Droits des tables et du stockage (visiteur) | **VALIDÉ** | Sondes visiteur réelles (30/10) : toutes les tables `rp_*`, `rs_*`, `profils` refusées (401) ; `bib_articles` limité aux colonnes publiques ; aucun seau ni fichier listable ; tests SQL locaux de tous les modules (CI verte) |
| 9 | Droits pour un membre connecté (réel) | **BLOQUÉ** | Nécessite un compte de test réel ; à faire avec l'auteur (aucune donnée réelle créée par Claude) |
| 10 | Fonctions Edge : contournement des contrôles | **À FAIRE** (test réel) | Revue du code faite (31/10) : `rp-agent` exige un jeton vérifié (`auth.getUser`), administrateur vérifié côté serveur ; `rp-lien` jetons à usage unique ; `rp-taches` secret ; aucune fonction appelée en visiteur parmi celles fermées. Test réel avec compte → avec #9 |
| 11 | 4 migrations absentes (`communaute_fil`, `planification_vault`, `abonnements`, `espace_dicom`) | **PRÊT** (fusionnée) | PR #104 fusionnée le 31/10 : base reproduisant la production, 12/12 (aucune fonction ouverte aux visiteurs, retours arrière exacts) ; ensuite **À VALIDER** une par une (ordre dans `MIGRATIONS_PRODUCTION.md`) |
| 12 | Adresses de retour Auth | **À VALIDER** (diagnostic du 31/10, run 41229729376 : Site URL ✓, `remplacements.html` ✓, `communaute.html` ✓, aucune adresse avec joker) | Nécessaires et suffisantes : `https://radiologichub.com/remplacements.html`, `/communaute.html` (présentes) + **`/bibliotheque-admin.html`** (à ajouter) : seule l'administration de la Bibliothèque se connecte (la page publique n'a pas de connexion) et l'adresse de retour est toujours demandée en `.html`, valable sur GitHub Pages et sur Cloudflare Pages (redirection 308 vers l'adresse sans `.html`, jeton conservé), vérifié par `tests/navigateur/connexion.js` ; garder les 2 adresses `…github.io/radiologic-hub/…` jusqu'au passage en privé ; **aucun joker**, rien pour `www` (redirigé vers la racine). Pas de mot de passe dans le site (lien magique + Google) |
| 13 | Secret `RP_URL_SITE` | **À VALIDER** | Diagnostic réel : ≠ `https://radiologichub.com` → les liens des e-mails pointent ailleurs ; correction : *Edge Functions → Secrets* |
| 14 | Redéploiement des fonctions Edge | **À VALIDER** | Diagnostic réel : dernier déploiement 26/10, 8 fichiers modifiés depuis (moteur, modèles, `rp-taches` version Vault) ; workflow « Déployer les fonctions Supabase » + `DEPLOYER` ; **coordonné** avec la migration `planification_vault` (sinon `rp-taches` refuse tous les appels) |
| 15 | Planification (Cron) | **À VALIDER** | Aucune tâche Cron ; après migration + redéploiement : `supabase/sql/planification.sql` ; puis suppression de `RP_TACHES_SECRET` après 24-48 h |
| 16 | Secrets dans `pg_net` | **VALIDÉ** (risque accepté) | Le mot de passe de `rp-taches` transitera dans la file le temps de l'envoi ; lisible seulement par une connexion SQL directe (schéma non exposé) ; mot de passe aléatoire du Vault, renouvelable |
| 17 | E-mails réels (Brevo) | **À VALIDER** | `EMAIL_FOURNISSEUR = journal` (aucun envoi) ; `BREVO_API_KEY` présente ; **SMTP personnalisé d'Auth : non** (run 41225294878) → les liens de connexion partent par le serveur d'e-mails par défaut de Supabase, très limité en nombre : **à configurer avant d'ouvrir les inscriptions** (*Authentication → Emails → SMTP Settings*, hôte `smtp-relay.brevo.com`, port 587, identifiant et clé SMTP Brevo) |
| 18 | Données personnelles dans les journaux | **À FAIRE** (mineur) | En mode `journal`, `transport.ts` écrit l'adresse du destinataire dans les journaux des fonctions (privés au projet) ; masquer l'adresse au prochain lot de code |
| 19 | Bascule du domaine vers Cloudflare | **BLOQUÉ** (vérification) / **À VALIDER** | Interdite avant le **01/11/2026 01:05 (Tunis) = 00:05 UTC** ; vérifications DNS en lecture impossibles depuis Claude (résolveurs DoH et tableau de bord Cloudflare inaccessibles) ; `radiologichub.com` est encore servi par GitHub Pages (en-tête `server: GitHub.com`, 31/10) ; procédure Brevo dans `PUBLICATION.md` |
| 20 | Domaine racine et `www` sur Cloudflare Pages | **À VALIDER** | Après la délégation : *Pages → radiologic-hub → Custom domains* + règle `www` → racine |
| 21 | Aperçus Cloudflare | **VALIDÉ** | Désactivés par l'auteur (30/10) ; aucun aperçu créé pour #98 à #106 |
| 22 | Dépôt GitHub privé | **À VALIDER** (après #19-20) | Collaborateurs : propriétaire seul (31/10) ; workflows compatibles (#98, contrôles testés) ; historique : 428 commits, **aucun secret réel** (31/10) ; GitHub Pages s'arrêtera ; procédure : `PUBLICATION.md` étape 6 |
| 23 | Protection premium | **PRÊT** (fondation) | Migration `abonnements` (#104) + lecture contrôlée `ab_lire_contenu` et client isolé (PR #106, 6/6 + 4/4) ; décision des contenus : `PROTECTION_PREMIUM.md` (PR #100, autre session) |
| 24 | Sauvegardes et restauration | **À FAIRE** | Sauvegarde `pg_dump` locale du 29/10 jamais restaurée ; vérifier le forfait (*Database → Backups* : sauvegardes quotidiennes réservées aux forfaits payants selon Supabase) ; procédure ci-dessous |
| 25 | Tests des modules (visiteur) | **VALIDÉ** | 59/59 sur Cloudflare (31/10, après correctif) : comptes rendus, calculateurs, fiches, 3D, atlas, Remplacements/Communauté/Bibliothèque en mode Supabase réel, page de réponse |
| 26 | Tests des parcours connectés réels | **BLOQUÉ** | Compte de test réel nécessaire (voir #9) |

**Compte au 31/10/2026 (après fusions #105, #104)** : 13 VALIDÉ, 2 PRÊT, 7 À VALIDER, 3 BLOQUÉ, 2 À FAIRE (certains chantiers combinent deux statuts).

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

## Ordre de fusion des PR (préparé le 31/10/2026)
#105 (diagnostic) → #104 (migrations ; contient déjà #105) → #107 (cette documentation ; contient déjà #104) : chaque fusion est sans conflit si cet ordre est respecté. #106 (fondation premium) reste séparée et n'est branchée sur aucune page ; conflit README trivial à résoudre au moment voulu. **Aucune de ces PR ne modifie Supabase** : elles ajoutent des fichiers SQL non exécutés, un diagnostic en lecture seule, des tests et de la documentation.

## Procédure regroupée : finaliser Supabase (une autorisation par étape)
| Étape | Action | Qui | Contrôle après |
|---|---|---|---|
| S1 | Diagnostic étendu (après fusion #105) | Claude (lecture seule) | Alertes de sécurité triées ; réglages Auth et SMTP relevés |
| S1 bis | Migration `20261031130000_search_path_profil.sql` : `rp_proteger_profil` avec `search_path = ''` (recommandation Supabase ; alerte `function_search_path_mutable`) — **préparée et testée** (lot 1 ci-dessous) | Auteur (SQL Editor) | Diagnostic : migration appliquée, « fonctions sans search_path fixé : aucune », alerte disparue |
| S1 ter | *Authentication → Emails → SMTP Settings* : SMTP personnalisé Brevo (clé SMTP existante) — détail : lot 1 | Auteur | Diagnostic : SMTP oui, serveur Brevo, port 587, domaine radiologichub.com |
| S2 | *Edge Functions → Secrets* : `RP_URL_SITE` = `https://radiologichub.com` | Auteur | Diagnostic : « RP_URL_SITE = https://radiologichub.com : oui » |
| S3 | *Authentication → URL Configuration* : ajouter **`https://radiologichub.com/bibliotheque-admin.html`** (une seule adresse, rien d'autre) | Auteur | Diagnostic : ligne ✓, « autres adresses : aucune » |
| S4 | Migration `20261027120000_communaute_fil.sql` (SQL Editor, *Run without RLS* si proposé) | Auteur | Diagnostic : appliquée, `exécutables par anon (0)` |
| S5 | Migration `20261029120000_planification_vault.sql` | Auteur | Diagnostic : Vault ✓, droits ✓ |
| S6 | Redéploiement des fonctions (Actions → « Déployer les fonctions Supabase » → `DEPLOYER`) | Claude après accord | Diagnostic : 0 fichier à redéployer |
| S7 | `supabase/sql/planification.sql` (tâche Cron) | Auteur | Diagnostic : tâche via Vault, exécutions « succeeded » |
| S8 | Tests connectés réels : un compte de test fourni par l'auteur (Remplacements, Communauté, Bibliothèque) ; aucune donnée réelle créée par Claude | Auteur + Claude | Parcours réussis |
| S9 | Après 24-48 h sans erreur : supprimer le secret `RP_TACHES_SECRET` | Auteur | Diagnostic |
Plus tard : `abonnements` (+ #106) au lancement du premium ; `espace_dicom` quand le serveur DICOM existera ; `EMAIL_FOURNISSEUR=brevo` quand les e-mails réels seront voulus.

## Lot 1 — Authentification : procédure unique (préparée le 31/10/2026, mise à jour le soir)
État réel avant (diagnostic run 41229729376, après fusion #108) : Site URL ✓ ; retours `remplacements.html` et `communaute.html` ✓ ; retour Bibliothèque ✗ ; `RP_URL_SITE` ✗ ; SMTP personnalisé ✗ ; correctif `search_path` non appliqué ; inscriptions ouvertes, confirmation de l'e-mail exigée, e-mail et Google actifs ; jeton de session 3 600 s, rotation des jetons de rafraîchissement active, lien magique valable 3 600 s → **à garder tels quels**.
Aucune clé ne passe par la conversation, GitHub ou le dépôt : l'auteur saisit la clé SMTP **existante** (gestionnaire de mots de passe) directement dans Supabase. Claude lance le diagnostic (lecture seule) après chaque étape. Projet : `wdbczcwnaxfnoioyukgr`.

| Étape | Lien direct | Valeurs exactes | Contrôle (diagnostic) |
|---|---|---|---|
| 0 | — | Fusion de la PR des corrections de connexion (code du site, aucun effet sur Supabase) | Tests verts |
| 1a | Brevo : https://app.brevo.com/senders/list | L'adresse d'expédition choisie figure dans *Senders* (ex. `remplacements@radiologichub.com`) et le domaine `radiologichub.com` est « Authenticated » (*Domains*) : **lecture seule** | — |
| 1b | Brevo : https://app.brevo.com/settings/keys/smtp | Relever l'**identifiant SMTP** (« Login », forme `…@smtp-brevo.com`). **Ne pas générer de nouvelle clé** : reprendre celle du gestionnaire de mots de passe | — |
| 1c | https://supabase.com/dashboard/project/wdbczcwnaxfnoioyukgr/auth/smtp | *Enable custom SMTP* ; Sender email : adresse de 1a ; Sender name : `RadiologicHub` ; Host : `smtp-relay.brevo.com` ; Port : `587` (STARTTLS) ; Minimum interval : `60` ; Username : identifiant de 1b ; Password : clé SMTP existante → *Save* | SMTP oui, serveur Brevo, port 587, adresse sur `radiologichub.com`, identifiant et clé renseignés |
| 1d | https://supabase.com/dashboard/project/wdbczcwnaxfnoioyukgr/auth/rate-limits | Envoi d'e-mails : `30` par heure (valeur proposée avec SMTP personnalisé ; Brevo gratuit : 300 e-mails par jour) ; ne rien changer d'autre | « limite d'envoi : 30 par heure » |
| 1e | https://supabase.com/dashboard/project/wdbczcwnaxfnoioyukgr/auth/templates | *Magic Link* : objet `Votre lien de connexion à RadiologicHub`, corps = `supabase/modeles-auth/lien-connexion.html` ; *Confirm signup* : objet `Confirmez votre adresse e-mail — RadiologicHub`, corps = `supabase/modeles-auth/confirmation-inscription.html` (français, sans image externe, `{{ .ConfirmationURL }}` inchangé) | Visible dans l'e-mail de test |
| 2 | https://supabase.com/dashboard/project/wdbczcwnaxfnoioyukgr/functions/secrets | `RP_URL_SITE` = `https://radiologichub.com` (sans `/` final) ; noter l'ancienne valeur avant ; aucun autre secret ; pas de redéploiement | « RP_URL_SITE = https://radiologichub.com : oui » |
| 3 | https://supabase.com/dashboard/project/wdbczcwnaxfnoioyukgr/auth/url-configuration | *Redirect URLs → Add URL* : `https://radiologichub.com/bibliotheque-admin.html` (une seule) ; ne rien retirer ; Site URL inchangée ; aucun `*` | ligne ✓, « autres adresses : aucune » |
| 4 | https://supabase.com/dashboard/project/wdbczcwnaxfnoioyukgr/sql/new | Coller `supabase/migrations/20261031130000_search_path_profil.sql` (`alter function public.rp_proteger_profil() set search_path = '';`, identique à la version testée) → *Run* ; retour arrière : `supabase/sql/retour/20261031130000_search_path_profil.sql` | Migration appliquée ; « fonctions sans search_path fixé : aucune » ; alerte disparue ; `exécutables par anon (0)` |
| 5 | Navigateur de l'auteur | Tests ci-dessous (envoi réel d'e-mails : à autoriser) | Diagnostic final |

**Réglages à NE PAS modifier** (déjà corrects) : Site URL `https://radiologichub.com` ; *Confirm email* activé ; inscriptions ouvertes (Communauté) ; durée du jeton 3 600 s ; rotation des jetons de rafraîchissement ; validité du lien 3 600 s ; fournisseurs e-mail et Google ; aucune adresse avec joker.

**Comportement du site, vérifié par `tests/navigateur/connexion.js`** (Supabase simulé, 38 contrôles, contre-épreuve sur le code d'avant : 10 échecs pour Remplacements et l'administration de la Bibliothèque) : adresse de retour exacte (`remplacements.html`, `communaute.html`, `bibliotheque-admin.html`, page ouverte avec ou sans `.html`) pour le lien e-mail et Google ; création du compte par le lien (confirmation par e-mail) ; au retour, session ouverte, jeton retiré de l'adresse et **vue demandée avant la connexion retrouvée** (ex. `#/messages` d'un e-mail ; gardée une heure dans ce navigateur) ; **lien expiré ou déjà utilisé** : message en français (Remplacements restait bloqué sur « Chargement… ») ; **session expirée** : mode visiteur, et message « Votre session a expiré » si elle se perd en cours d'utilisation ; déconnexion : session effacée.

**Étape 5 — tests réels** (comptes fictifs : alias `…+rh-test1@…`, `…+rh-test2@…` de la boîte de l'auteur ; aucune donnée de patient ; l'auteur ne transmet que « reçu / PASS / connecté ») :
1. `https://radiologichub.com/communaute.html#/messages` → *Se connecter* → e-mail `+rh-test1` → reçu en moins de 2 min, expéditeur « RadiologicHub », objet en français, pas en indésirables ; Gmail « Afficher l'original » : **SPF, DKIM, DMARC = PASS** → clic → connecté, page Messages (ou création du profil pour un nouveau compte).
2. Recliquer le même lien → message « Le lien de connexion a expiré ou a déjà été utilisé ».
3. `https://radiologichub.com/remplacements.html` → *Se connecter* → `+rh-test2` → reçu → connecté → *Déconnexion* → mode visiteur.
4. `https://radiologichub.com/bibliotheque-admin.html` → lien e-mail avec le compte administrateur → retour sur la même page, connecté ; un compte de test y voit « n'est pas administrateur ».
5. Google sur une des pages → retour sur la même page, connecté.
6. Session expirée (facultatif) : fermer l'onglet, attendre plus d'une heure sans ouvrir le site, rouvrir → toujours connecté (rafraîchissement automatique) ; *Déconnexion* sur un appareil ferme toutes les sessions du compte (comportement par défaut de Supabase) : l'autre appareil affiche « Votre session a expiré » au plus tard une heure après.
7. Supprimer les comptes de test : https://supabase.com/dashboard/project/wdbczcwnaxfnoioyukgr/auth/users (suppression à autoriser).

Retour arrière : 1c *Disable custom SMTP* ; 1e *Reset* du modèle ; 2 ancienne valeur ; 3 supprimer l'adresse ; 4 fichier de retour.

## Bascule Cloudflare : vérifications préalables (après le 01/11/2026 00:05 UTC)
1. Capture d'écran du DNS chez Spaceship (9 enregistrements, dont DKIM `brevo1`/`brevo2`, TXT `brevo-code`, `_dmarc`).
2. Aucun enregistrement DS au registre (DNSSEC désactivé, ancien DS retiré) : à confirmer par l'auteur dans Spaceship, ou par Claude si `cloudflare-dns.com` est autorisé dans le réseau de la session.
3. Dans Cloudflare, comparer ligne à ligne avec la capture ; DKIM et site en *DNS only* ; supprimer toute ligne absente de la capture.
4. Site Cloudflare sain : déjà validé (59/59, 31/10) ; S2-S3 faits de préférence avant.
5. Bascule : nameservers Cloudflare chez Spaceship → « Active » → *Pages → Custom domains* racine + `www` → règle `www` → racine → Brevo toujours authentifié → test réel sur `radiologichub.com` (Claude).
Retour arrière : nameservers Spaceship par défaut (enregistrements intacts), voir `PUBLICATION.md`.

## Passage du dépôt en privé (au plus tôt une semaine après la bascule)
Préalables : site servi par Cloudflare sans incident ; connexion testée sur `radiologichub.com` ; adresses `…github.io/radiologic-hub/…` retirées de l'Auth ; plus aucune PR d'une autre session en attente de publication sur GitHub Pages.
Action : *Settings → General → Danger Zone → Change visibility → Private* (auteur). Contrôles par Claude juste après : construction Cloudflare réussie au commit suivant, workflow « Vérifier le site » vert, diagnostic Supabase lancé avec succès, sessions Claude Code fonctionnelles. Effets attendus : GitHub Pages s'arrête (déjà remplacé), 2 000 minutes Actions/mois.
