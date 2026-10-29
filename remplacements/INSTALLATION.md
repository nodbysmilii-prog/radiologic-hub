# Modules Remplacements et Communauté — mise en service

Les deux modules partagent le même projet Supabase, les mêmes comptes et le même administrateur.

Tant que `remplacements/config.js` est vide :

- la page `remplacements.html` fonctionne en **mode démonstration** : données fictives dans le navigateur, e-mails déposés dans une « boîte d'envoi » consultable, horloge avançable. Rien n'est envoyé ;
- la page `communaute.html` aussi : membres, cas et messages fictifs dans le navigateur, connexion Google simulée, sélecteur « Vous êtes » pour essayer chaque rôle (membre vérifié, interne, administrateur…).

Pour passer en production (vrais comptes, vrais e-mails), suivre les étapes ci-dessous **dans l'ordre**. Compter environ une heure et demie (dont une demi-heure pour la connexion Google).

> **Aucune clé secrète dans le dépôt.** Seules l'adresse du projet Supabase et sa clé publique « anon » vont dans `remplacements/config.js` (elles sont faites pour être publiées ; la sécurité repose sur les droits d'accès par ligne de la base). Les clés `service_role`, Brevo / Resend et les secrets du module se règlent uniquement dans les **secrets des fonctions Supabase** ; le « secret client » Google se colle uniquement dans le tableau de bord Supabase.

---

## 1. Créer le projet Supabase

1. Créer un compte sur [supabase.com](https://supabase.com) puis **New project**.
2. Région : de préférence dans l'Union européenne (Francfort ou Paris) — à indiquer dans les mentions légales et auprès de l'INPDP (transfert de données hors de Tunisie).
3. Noter l'**identifiant du projet** (`abcdefghijkl` dans `https://abcdefghijkl.supabase.co`), la clé **anon** et la clé **service_role** (*Project Settings → API*).

## 2. Créer les tables

Au choix :

- **Éditeur SQL** (*SQL Editor → New query*) : coller tout le fichier `supabase/migrations/20261008120000_remplacements.sql` et l'exécuter, **puis** faire de même avec `supabase/migrations/20261009090000_reseau.sql` (Communauté), **puis** avec `supabase/migrations/20261012090000_droits_explicites.sql`, **puis** avec `supabase/migrations/20261012120000_bibliotheque.sql` (Bibliothèque), **puis** avec `supabase/migrations/20261012180000_cours.sql` (cours d'échoanatomie), **puis** avec `supabase/migrations/20261027120000_communaute_fil.sql` (fil de la Communauté : demandes d'avis et remplacements dans le fil), **puis** avec `supabase/migrations/20261029120000_planification_vault.sql` (mot de passe de la tâche planifiée, rangé dans le coffre-fort Vault : voir l'étape 7) — dans cet ordre (exécuter seulement celles qui ne l'ont pas encore été) ;
- ou **en ligne de commande** (outil `supabase`, depuis la racine du dépôt) :
  ```
  supabase login
  supabase link --project-ref <identifiant-du-projet>
  supabase db push
  ```

La première migration crée les tables `rp_*`, les droits d'accès par ligne et l'espace de stockage privé `justificatifs`. La seconde crée les tables `rs_*` de la Communauté (profils, cas, commentaires, messagerie, notifications, signalements), leurs droits d'accès par ligne, les espaces de stockage `avatars` (photos de profil, public), `cas-images` et `messages-images` (privés), et ajoute les messages et notifications au **temps réel** (Realtime).

La troisième accorde le droit d'exécuter les fonctions utilisées par les règles d'accès. La quatrième crée les tables `bib_articles` et `bib_article_themes` de la Bibliothèque (articles en accès libre : métadonnées et liens seulement) : les visiteurs ne lisent que les articles publiés et leurs colonnes publiques ; seul l'administrateur (table `rp_admins`, le même compte) importe, classe et publie, depuis `bibliotheque-admin.html`. **Exposition automatique désactivée** (*Project Settings → Data API*, ou choix fait à la création du projet) : c'est le réglage recommandé, et le dépôt est prévu pour lui. Les nouvelles tables et fonctions n'y sont accessibles à aucun rôle sans `GRANT` explicite ; chaque migration accorde donc elle-même, table par table, les droits nécessaires aux rôles `anon` (visiteur non connecté) et `authenticated` (utilisateur connecté), en plus des règles d'accès par ligne. La liste complète des droits accordés est dans `tests/sql/droits-attendus.txt`, vérifiée par `npm run test:sql`.

La cinquième crée les tables des cours d'échoanatomie : `cours_validations` (statut de chaque texte, schéma, modèle 3D et image : à valider, approuvé, à corriger), `cours_images` (images échographiques de l'auteur et leurs étiquettes) et `cours_reglages` (bloc « Source / crédits »), ainsi que l'espace de stockage `cours-images`. Les élèves ne lisent que les éléments approuvés dans leur version actuelle ; seul l'administrateur (table `rp_admins`, le même compte) valide, envoie des images et écrit les crédits, depuis `cours-admin.html`.

Vérifier dans *Database → Publications* que `supabase_realtime` contient bien `rs_messages`, `rs_participants` et `rs_notifications` (sinon les y ajouter ou réexécuter la fin de la seconde migration) : c'est ce qui fait apparaître les messages sans recharger la page.

## 3. Envoi des e-mails (Brevo ou Resend)

**Brevo** (recommandé, société française, offre gratuite de 300 e-mails/jour) :

1. Créer un compte sur [brevo.com](https://www.brevo.com).
2. *Senders, Domains & Dedicated IPs* : ajouter et **authentifier le domaine** d'envoi (enregistrements DNS SPF, DKIM et DMARC), par exemple `radiologichub.com`, puis l'adresse d'expédition (`remplacements@radiologichub.com`).
3. *SMTP & API → API keys* : créer une **clé API** (pour les fonctions) et noter les **identifiants SMTP** (pour les liens de connexion, étape 4).

**Resend** (alternative) : créer un compte sur [resend.com](https://resend.com), vérifier le domaine, créer une clé API.

## 4. Connexion par lien magique (Supabase Auth)

Dans *Authentication* :

1. *Sign In / Providers → Email* : activé ; *Confirm email* activé.
2. *URL Configuration* :
   - **Site URL** : `https://radiologichub.com` (domaine officiel) ;
   - **Redirect URLs** : `https://radiologichub.com/remplacements.html` et `https://radiologichub.com/communaute.html`, plus, pendant la transition, les adresses historiques `https://nodbysmilii-prog.github.io/radiologic-hub/remplacements.html` et `…/communaute.html`. Le site demande toujours le retour vers la page ouverte : il n'y a rien à changer dans le code.
   - *État au 29/10/2026 : fait, connexions testées sur le nouveau domaine.*
3. *Emails → Templates → Magic Link* : objet « Votre lien de connexion — RadiologicHub Remplacements », corps = contenu de `remplacements/modeles/supabase/lien-magique.html`. Faire de même pour le modèle *Confirm signup*.
4. *Emails → SMTP Settings* : **Enable custom SMTP** avec les identifiants SMTP de Brevo (hôte `smtp-relay.brevo.com`, port 587) et l'adresse d'expédition authentifiée. Sans SMTP personnalisé, Supabase limite fortement le nombre de liens envoyés.

## 4 bis. Connexion « Continuer avec Google »

Le bouton Google est proposé sur `communaute.html` et `remplacements.html`. Il demande seulement le nom, l'adresse e-mail et la photo du compte Google (portées `openid`, `email`, `profile`, qui ne nécessitent pas d'audit de Google).

Dans la [console Google Cloud](https://console.cloud.google.com) :

1. Créer un projet (par exemple « RadiologicHub »).
2. *APIs & Services → OAuth consent screen* (ou *Google Auth Platform → Branding*) :
   - type d'audience **External** ;
   - nom de l'application « RadiologicHub », adresse e-mail d'assistance, logo (facultatif) ;
   - liens : page d'accueil `https://radiologichub.com/`, règles de confidentialité et conditions `https://radiologichub.com/mentions-legales.html#donnees` et `…/mentions-legales.html#conditions` ;
   - **domaines autorisés** : `<identifiant-du-projet>.supabase.co` et `radiologichub.com` (garder `nodbysmilii-prog.github.io` pendant la transition) ;
   - portées : `openid`, `…/auth/userinfo.email`, `…/auth/userinfo.profile` ;
   - **publier l'application** (*Publishing status → In production*), sinon seuls les comptes « testeurs » peuvent se connecter.
3. *Credentials → Create credentials → OAuth client ID* (ou *Clients → Create client*) :
   - type **Web application** ;
   - origines JavaScript autorisées : `https://radiologichub.com` (et `https://nodbysmilii-prog.github.io` pendant la transition) ;
   - **URI de redirection autorisé** : `https://<identifiant-du-projet>.supabase.co/auth/v1/callback` ;
   - noter l'**ID client** et le **secret client**.

Dans Supabase, *Authentication → Sign In / Providers → Google* : activer, coller l'ID client et le secret client, enregistrer. Un même compte est retrouvé qu'on se connecte par Google ou par lien e-mail, tant que l'adresse est la même.

À la première connexion, le membre complète son profil (statut, établissement, téléphone…) et coche la case de consentement. Le téléphone est saisi mais **pas encore vérifié par SMS** (voir la dernière section).

## 5. Secrets des fonctions

*Edge Functions → Secrets* (ou en ligne de commande, une seule fois) :

```
supabase secrets set \
  RP_URL_SITE=https://radiologichub.com \
  RP_SECRET=<longue-chaîne-aléatoire> \
  RP_ADMIN_EMAILS=adresse.admin@exemple.com \
  EMAIL_FOURNISSEUR=brevo \
  BREVO_API_KEY=<clé-API-Brevo> \
  EMAIL_EXPEDITEUR=remplacements@radiologichub.com \
  EMAIL_EXPEDITEUR_NOM="RadiologicHub Remplacements"
```

| Secret | Rôle |
|---|---|
| `RP_URL_SITE` | Adresse officielle du site, **sans** `/` final (`https://radiologichub.com`) : seule source des liens des e-mails (réponse en un clic, espace, désinscription, mentions, rappels de la Communauté) |
| `RP_ORIGINE` | Facultatif, **à laisser absent** : sinon seul ce site peut appeler les fonctions |
| `RP_SECRET` | Signe les liens de désinscription (ex. `openssl rand -hex 32`) ; ne plus le changer ensuite |
| `RP_ADMIN_EMAILS` | Adresses qui reçoivent les nouvelles inscriptions à valider (séparées par des virgules) |
| `EMAIL_FOURNISSEUR` | `brevo`, `resend`, ou `journal` (n'envoie rien, écrit dans les journaux — pour les essais) |
| `BREVO_API_KEY` / `RESEND_API_KEY` | Clé du fournisseur choisi |
| `EMAIL_EXPEDITEUR`, `EMAIL_EXPEDITEUR_NOM` | Expéditeur des e-mails (adresse du domaine authentifié) |

`SUPABASE_URL`, `SUPABASE_ANON_KEY` et `SUPABASE_SERVICE_ROLE_KEY` sont fournies automatiquement aux fonctions.

Le mot de passe de la tâche planifiée `rp-taches` n'est **pas** un secret de fonction : il est rangé dans le coffre-fort Vault de la base (étape 7). L'ancien secret `RP_TACHES_SECRET` n'est plus utilisé et peut être supprimé une fois l'étape 7 vérifiée.

## 6. Déployer les fonctions serveur

Depuis la racine du dépôt :

```
npm run backend:preparer          # recopie le noyau et les modèles dans supabase/functions/_shared
supabase functions deploy rp-agent
supabase functions deploy rp-lien
supabase functions deploy rp-taches
```

`supabase/config.toml` règle déjà la vérification de connexion (`rp-lien` et `rp-taches` sont accessibles sans connexion : liens à usage unique et en-tête secret).

**Sans Terminal, depuis GitHub** : créer un jeton sur supabase.com (*Account → Access Tokens → Generate new token*), l'ajouter au dépôt GitHub comme secret `SUPABASE_ACCESS_TOKEN` (*Settings → Secrets and variables → Actions → New repository secret*), puis *Actions → « Déployer les fonctions Supabase » → Run workflow* (`.github/workflows/deployer-fonctions.yml`, lancement manuel uniquement).

À refaire après toute modification de `remplacements/noyau/`, de `supabase/functions/_shared/reseau.ts` ou des modèles d'e-mails / de contrat.

La Communauté n'a pas de fonction serveur propre : tout passe par la base (droits d'accès par ligne, déclencheurs) ; seule la tâche planifiée `rp-taches` lui envoie les rappels de messages non lus.

## 6 bis. Exploitation depuis GitHub (diagnostic en lecture seule)

*Actions → « Exploitation Supabase » → Run workflow* (branche principale) → `diagnostic` (`.github/workflows/exploitation-supabase.yml`, script `scripts/exploitation-supabase.js`). Le rapport s'affiche dans le **résumé de l'exécution**. **Le dépôt étant public, ce résumé et les journaux sont publics** : le rapport ne contient que des oui / non, des versions et des dates, **aucune information sur les utilisateurs** (ni comptes, ni données), aucun secret, aucune réponse brute.

- projet actif ; **fonctions déployées** (état, version, date, vérification de connexion) et fichiers modifiés depuis le dernier déploiement réussi de « Déployer les fonctions Supabase » (donc à redéployer) ;
- **secrets** : présence de `RP_URL_SITE`, `RP_SECRET`, `RP_ADMIN_EMAILS`, `EMAIL_FOURNISSEUR`, `RP_TACHES_SECRET`, `RP_ORIGINE`, `BREVO_API_KEY`… sans aucune valeur ; `RP_URL_SITE = https://radiologichub.com` et `EMAIL_FOURNISSEUR = journal` vérifiés par comparaison d'empreintes ;
- **authentification** : Site URL et adresses de retour du domaine officiel et de l'adresse historique ;
- **base** (requête fixe `supabase/sql/diagnostic.sql`, envoyée en lecture seule) : migrations appliquées, extensions `pg_cron`, `pg_net`, `supabase_vault`, objets et droits de la planification Vault, tâches Cron (nom, fréquence, passage par Vault ; secret en clair signalé sans être montré), statuts des dernières exécutions ;
- **extérieur** : `radiologichub.com` en ligne, redirection de l'ancienne adresse en conservant les liens de réponse, CORS des trois fonctions.

**Préalable obligatoire — environnement protégé** (*Settings → Environments → New environment* `supabase-production`) :
1. *Required reviewers* : vous (validation humaine avant chaque exécution) ;
2. **décocher** *Allow administrators to bypass configured protection rules* ;
3. *Deployment branches and tags* → *Selected branches and tags* → uniquement `claude/radiologichub-website-ss89g9` ;
4. *Environment secrets* : y créer `SUPABASE_ACCESS_TOKEN`, puis **supprimer le secret du même nom au niveau du dépôt** (*Settings → Secrets and variables → Actions*). Tant qu'il reste au niveau du dépôt, tout workflow lancé par une personne ayant le droit d'écriture, depuis n'importe quelle branche, peut l'utiliser.

Les deux workflows (« Exploitation Supabase » et « Déployer les fonctions Supabase ») vérifient les points 1 à 3 **avant** tout accès au secret (tâche de contrôle sans secret ni code du dépôt) et refusent sinon ; ils ne s'exécutent que lancés à la main par le propriétaire, sur la branche principale ; une seule opération Supabase à la fois ; actions épinglées ; secret donné à une seule étape ; jeton GitHub limité à la lecture.

**Jeton Supabase à droits limités (recommandé)** : les jetons personnels de Supabase peuvent être limités à une organisation, à un projet et à des droits précis (lecture ou lecture-écriture par ressource), avec une date d'expiration (un an au plus). Les anciens jetons à accès complet portent la mention « Legacy » : si `SUPABASE_ACCESS_TOKEN` en est un, il donne tous les droits sur **tout le compte** (tous les projets, secrets, bases, suppression de projet) — c'est le risque principal en cas de fuite. À faire : créer un jeton depuis le préréglage **No access**, limité au projet `wdbczcwnaxfnoioyukgr`, avec seulement : projet (lecture), Edge Functions (lecture-écriture, pour le déploiement), secrets des Edge Functions (lecture : noms et empreintes), configuration d'authentification (lecture), base de données (lecture) ; expiration courte (90 jours par exemple) ; puis révoquer l'ancien. Ne pas partir du préréglage *Read-only*, qui inclut les secrets comme les clés d'API. Les noms exacts des droits sont à vérifier dans le tableau de bord ; si l'exécution d'une requête SQL exige plus que la lecture, le diagnostic l'indiquera (« droits insuffisants ») sans rien modifier. À terme : un jeton par usage (diagnostic en lecture seule, déploiement des fonctions).

L'opération `diagnostic` est la **seule** proposée. Les opérations prévues (`migration-vault`, `verification`, `url-site`, `planifier`, `deplanifier`) ne figurent pas dans le formulaire, le contrôle et le script les refusent, et aucun code ne les exécute : chacune ne sera ajoutée qu'avec une autorisation explicite, par une modification revue du dépôt, avec une vérification après exécution.

## 7. Planifier l'agent (toutes les 15 minutes)

La fonction `rp-taches` n'accepte que les appels portant un mot de passe (en-tête `x-rp-secret`). Ce mot de passe est **tiré au hasard par la base** et rangé dans le **coffre-fort Vault** (secret `rp_taches_secret`) : personne ne le voit, il n'est écrit dans aucun fichier ni dans la tâche planifiée. La tâche le lit dans le Vault à chaque passage ; `rp-taches` demande à la base s'il est juste (fonction `rp_taches_secret_valide`, réservée à la clé `service_role`, qui répond seulement oui / non).

1. **Migration** `supabase/migrations/20261029120000_planification_vault.sql` (éditeur SQL ou `supabase db push`, voir l'étape 2) : crée le mot de passe dans le Vault et les deux fonctions. La relancer ne change pas le mot de passe.
2. **Contrôle** : exécuter `supabase/sql/verification-planification.sql` ; chaque colonne finissant par `_oui` doit valoir `true`, chaque colonne finissant par `_non` doit valoir `false`. Rien n'affiche le mot de passe.
3. **Déployer** les fonctions (étape 6) : la nouvelle version de `rp-taches` vérifie le mot de passe auprès de la base.
4. *Database → Extensions* : activer **pg_cron** et **pg_net**, puis exécuter `supabase/sql/planification.sql` (rien à remplacer).
5. **Vérifier** 15 à 20 minutes plus tard : *Edge Functions → rp-taches → Logs* (un appel toutes les 15 minutes, sans « Accès refusé ») ; les requêtes de suivi sont en commentaire dans `planification.sql`.
6. *Edge Functions → Secrets* : supprimer `RP_TACHES_SECRET`, devenu inutile.

Pour changer le mot de passe sans l'afficher, ou arrêter la tâche : voir les commentaires de `planification.sql`.

L'agent envoie alors les propositions en attente, les relances (délai réglable par chaque structure), les rappels de la veille (18 h, heure de Tunis), les demandes de confirmation de réalisation et le récapitulatif mensuel. Pour la Communauté, il envoie aussi un e-mail aux membres qui ont un message non lu depuis plus d'une heure (une seule fois par message, sans en recopier le contenu, avec lien de désinscription ; désactivable depuis le profil).

## 8. Déclarer l'administrateur

Dans l'éditeur SQL :

```sql
insert into public.rp_admins (email) values ('adresse.admin@exemple.com');
```

L'administrateur se connecte avec cette adresse sur `remplacements.html` : le bouton **Administration** apparaît (inscriptions à valider, comptes, statistiques, journaux).

Le même administrateur gère la Communauté : sur `communaute.html`, menu **Administration** — demandes de vérification (justificatif consultable 10 minutes par lien signé ; c'est la vérification qui affiche le titre « Dr » / « Pr » et autorise la publication de cas), signalements (les cas signalés 3 fois pour identité de patient, ou 5 fois au total, sont masqués automatiquement en attendant sa décision), suspension de comptes, statistiques.

## 9. Brancher le site

Dans `remplacements/config.js` :

```js
window.RH_REMPLACEMENTS_CONFIG = {
  supabaseUrl: 'https://<identifiant-du-projet>.supabase.co',
  supabaseAnonKey: '<clé anon>',
};
```

Changer le `?v=…` des liens de `remplacements.html`, `remplacements-reponse.html` et `communaute.html`, puis pousser sur la branche publiée. Les barres « Démo » disparaissent : les deux modules sont en production.

## 10. Avant l'ouverture au public

- [ ] Compléter les passages entre crochets de `mentions-legales.html` (éditeur, hébergeurs, durées de conservation) ; **déclaration auprès de l'INPDP** et, l'hébergement étant hors de Tunisie, autorisation de transfert à vérifier avec l'Instance.
- [ ] Faire **valider le modèle de contrat** `remplacements/modeles/contrat.md` (juriste, Conseil de l'Ordre) — les passages entre crochets sont à compléter.
- [ ] Relire les modèles d'e-mails `remplacements/modeles/emails/*.html` (puis `npm run backend:preparer` et redéployer).
- [ ] Faire relire les **conditions d'utilisation de la Communauté** (`mentions-legales.html#conditions`) et la section « Communauté » des données personnelles ; déclarer aussi ce traitement à l'INPDP.
- [ ] Essai de la Communauté avec deux vrais comptes Google : profil → demande de vérification → validation par l'administrateur → publication d'un cas avec une image **fictive** (vérifier que le nom masqué n'apparaît plus) → commentaire → message (affichage en direct chez l'autre) → signalement → suppression du compte.
- [ ] Essai complet avec `EMAIL_FOURNISSEUR=journal`, puis avec le vrai fournisseur sur deux adresses de test : inscription → validation → disponibilités → demande → « Je suis disponible » → choix → confirmation (.ics + PDF) → annulation → remise en ligne.

## WhatsApp / SMS (plus tard)

**Vérification du téléphone de la Communauté** : la colonne `profils.telephone_verifie` existe déjà. Pour l'activer, configurer un fournisseur SMS dans *Authentication → Sign In / Providers → Phone* (Twilio, MessageBird, Vonage… ou un fournisseur tunisien via une fonction d'envoi), envoyer un code avec `supabase.auth.updateUser({ phone })` puis `verifyOtp({ type: 'phone_change' })`, et passer `telephone_verifie` à vrai côté serveur.


Chaque envoi passe par `messagerie.envoyer()` puis par un **transport** (`supabase/functions/_shared/transport.ts`) ; le journal `rp_emails` a une colonne `canal`. Pour ajouter WhatsApp ou SMS : écrire un transport (par exemple WhatsApp Business Cloud API ou un fournisseur SMS tunisien) et, dans `moteur.js`, choisir le canal selon les préférences du destinataire. Les textes courts peuvent réutiliser la version texte des modèles (`texteBrut`).
