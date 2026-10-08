# Module Remplacements — mise en service

Tant que `remplacements/config.js` est vide, la page `remplacements.html` fonctionne en **mode démonstration** : données fictives dans le navigateur, e-mails déposés dans une « boîte d'envoi » consultable, horloge avançable. Rien n'est envoyé.

Pour passer en production (vrais comptes, vrais e-mails), suivre les étapes ci-dessous **dans l'ordre**. Compter environ une heure.

> **Aucune clé secrète dans le dépôt.** Seules l'adresse du projet Supabase et sa clé publique « anon » vont dans `remplacements/config.js` (elles sont faites pour être publiées ; la sécurité repose sur les droits d'accès par ligne de la base). Les clés `service_role`, Brevo / Resend et les secrets du module se règlent uniquement dans les **secrets des fonctions Supabase**.

---

## 1. Créer le projet Supabase

1. Créer un compte sur [supabase.com](https://supabase.com) puis **New project**.
2. Région : de préférence dans l'Union européenne (Francfort ou Paris) — à indiquer dans les mentions légales et auprès de l'INPDP (transfert de données hors de Tunisie).
3. Noter l'**identifiant du projet** (`abcdefghijkl` dans `https://abcdefghijkl.supabase.co`), la clé **anon** et la clé **service_role** (*Project Settings → API*).

## 2. Créer les tables

Au choix :

- **Éditeur SQL** (*SQL Editor → New query*) : coller tout le fichier `supabase/migrations/20261008120000_remplacements.sql` et l'exécuter ;
- ou **en ligne de commande** (outil `supabase`, depuis la racine du dépôt) :
  ```
  supabase login
  supabase link --project-ref <identifiant-du-projet>
  supabase db push
  ```

La migration crée les tables `rp_*`, les droits d'accès par ligne et l'espace de stockage privé `justificatifs`.

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
   - **Site URL** : `https://nodbysmilii-prog.github.io/radiologic-hub/remplacements.html` (ou l'adresse définitive du site) ;
   - **Redirect URLs** : ajouter la même adresse (et `https://www.radiologichub.com/remplacements.html` quand le domaine sera en place).
3. *Emails → Templates → Magic Link* : objet « Votre lien de connexion — RadiologicHub Remplacements », corps = contenu de `remplacements/modeles/supabase/lien-magique.html`. Faire de même pour le modèle *Confirm signup*.
4. *Emails → SMTP Settings* : **Enable custom SMTP** avec les identifiants SMTP de Brevo (hôte `smtp-relay.brevo.com`, port 587) et l'adresse d'expédition authentifiée. Sans SMTP personnalisé, Supabase limite fortement le nombre de liens envoyés.

## 5. Secrets des fonctions

*Edge Functions → Secrets* (ou en ligne de commande, une seule fois) :

```
supabase secrets set \
  RP_URL_SITE=https://nodbysmilii-prog.github.io/radiologic-hub \
  RP_SECRET=<longue-chaîne-aléatoire> \
  RP_TACHES_SECRET=<autre-longue-chaîne-aléatoire> \
  RP_ADMIN_EMAILS=adresse.admin@exemple.com \
  EMAIL_FOURNISSEUR=brevo \
  BREVO_API_KEY=<clé-API-Brevo> \
  EMAIL_EXPEDITEUR=remplacements@radiologichub.com \
  EMAIL_EXPEDITEUR_NOM="RadiologicHub Remplacements"
```

| Secret | Rôle |
|---|---|
| `RP_URL_SITE` | Adresse du site, **sans** `/` final : sert à construire les liens des e-mails |
| `RP_SECRET` | Signe les liens de désinscription (ex. `openssl rand -hex 32`) ; ne plus le changer ensuite |
| `RP_TACHES_SECRET` | Protège la tâche planifiée `rp-taches` |
| `RP_ADMIN_EMAILS` | Adresses qui reçoivent les nouvelles inscriptions à valider (séparées par des virgules) |
| `EMAIL_FOURNISSEUR` | `brevo`, `resend`, ou `journal` (n'envoie rien, écrit dans les journaux — pour les essais) |
| `BREVO_API_KEY` / `RESEND_API_KEY` | Clé du fournisseur choisi |
| `EMAIL_EXPEDITEUR`, `EMAIL_EXPEDITEUR_NOM` | Expéditeur des e-mails (adresse du domaine authentifié) |

`SUPABASE_URL`, `SUPABASE_ANON_KEY` et `SUPABASE_SERVICE_ROLE_KEY` sont fournies automatiquement aux fonctions.

## 6. Déployer les fonctions serveur

Depuis la racine du dépôt :

```
npm run backend:preparer          # recopie le noyau et les modèles dans supabase/functions/_shared
supabase functions deploy rp-agent
supabase functions deploy rp-lien
supabase functions deploy rp-taches
```

`supabase/config.toml` règle déjà la vérification de connexion (`rp-lien` et `rp-taches` sont accessibles sans connexion : liens à usage unique et en-tête secret).

À refaire après toute modification de `remplacements/noyau/` ou des modèles d'e-mails / de contrat.

## 7. Planifier l'agent (toutes les 15 minutes)

*Database → Extensions* : activer **pg_cron** et **pg_net**. Puis, dans l'éditeur SQL, exécuter `supabase/sql/planification.sql` après y avoir remplacé `<PROJET>` (identifiant du projet) et `<SECRET>` (valeur de `RP_TACHES_SECRET`).

L'agent envoie alors les propositions en attente, les relances (délai réglable par chaque structure), les rappels de la veille (18 h, heure de Tunis), les demandes de confirmation de réalisation et le récapitulatif mensuel.

## 8. Déclarer l'administrateur

Dans l'éditeur SQL :

```sql
insert into public.rp_admins (email) values ('adresse.admin@exemple.com');
```

L'administrateur se connecte avec cette adresse sur `remplacements.html` : le bouton **Administration** apparaît (inscriptions à valider, comptes, statistiques, journaux).

## 9. Brancher le site

Dans `remplacements/config.js` :

```js
window.RH_REMPLACEMENTS_CONFIG = {
  supabaseUrl: 'https://<identifiant-du-projet>.supabase.co',
  supabaseAnonKey: '<clé anon>',
};
```

Changer le `?v=…` des liens de `remplacements.html` et `remplacements-reponse.html`, puis pousser sur la branche publiée. La barre « Démo » disparaît : le module est en production.

## 10. Avant l'ouverture au public

- [ ] Compléter les passages entre crochets de `mentions-legales.html` (éditeur, hébergeurs, durées de conservation) ; **déclaration auprès de l'INPDP** et, l'hébergement étant hors de Tunisie, autorisation de transfert à vérifier avec l'Instance.
- [ ] Faire **valider le modèle de contrat** `remplacements/modeles/contrat.md` (juriste, Conseil de l'Ordre) — les passages entre crochets sont à compléter.
- [ ] Relire les modèles d'e-mails `remplacements/modeles/emails/*.html` (puis `npm run backend:preparer` et redéployer).
- [ ] Essai complet avec `EMAIL_FOURNISSEUR=journal`, puis avec le vrai fournisseur sur deux adresses de test : inscription → validation → disponibilités → demande → « Je suis disponible » → choix → confirmation (.ics + PDF) → annulation → remise en ligne.

## WhatsApp / SMS (plus tard)

Chaque envoi passe par `messagerie.envoyer()` puis par un **transport** (`supabase/functions/_shared/transport.ts`) ; le journal `rp_emails` a une colonne `canal`. Pour ajouter WhatsApp ou SMS : écrire un transport (par exemple WhatsApp Business Cloud API ou un fournisseur SMS tunisien) et, dans `moteur.js`, choisir le canal selon les préférences du destinataire. Les textes courts peuvent réutiliser la version texte des modèles (`texteBrut`).
