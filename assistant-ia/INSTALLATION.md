# Assistant IA de rédaction — mise en service

Page : `assistant-ia.html` (non listée dans le menu, non indexée). Tant que le serveur n'est pas configuré, elle fonctionne en **mode démonstration** : le bouton renvoie un compte rendu d'exemple, rien n'est envoyé.

En production :

- seuls les comptes dont l'e-mail figure dans le secret `IA_EMAILS` peuvent l'utiliser (par exemple vous et votre femme) ;
- la clé Anthropic reste dans les **secrets de la fonction Supabase** `cr-ia`, jamais dans le site ni dans le dépôt (qui est public) ;
- les notes et les images ne sont **ni enregistrées ni journalisées** par le site : elles passent par la fonction, puis par l'API d'Anthropic, et la réponse revient dans votre navigateur ;
- aucune table à créer : seuls la connexion Supabase et la fonction `cr-ia` servent.

Compter 20 à 30 minutes. Si le projet Supabase des Remplacements existe déjà, sauter l'étape 1.

---

## 1. Projet Supabase (gratuit)

1. Créer un compte sur [supabase.com](https://supabase.com) puis **New project**, région dans l'Union européenne (Francfort ou Paris).
2. Noter l'**identifiant du projet** (`abcdefghijkl` dans `https://abcdefghijkl.supabase.co`) et la clé **anon** (*Project Settings → API*).

Les étapes complètes des autres modules (tables, Brevo, Google) sont dans `remplacements/INSTALLATION.md` ; elles ne sont **pas** nécessaires pour l'assistant.

## 2. Autoriser la page dans la connexion

*Authentication → URL Configuration* :

- **Redirect URLs** : ajouter `https://nodbysmilii-prog.github.io/radiologic-hub/assistant-ia.html` (et plus tard l'équivalent sur le domaine définitif) ;
- si **Site URL** est encore vide, y mettre la même adresse.

## 3. Clé API Anthropic

1. Créer un compte sur [console.anthropic.com](https://console.anthropic.com).
2. *Billing* : ajouter un petit crédit (5 à 10 $ suffisent pour des centaines de comptes rendus ; environ 4 centimes de dollar par compte rendu avec 5 images).
3. *Limits* : fixer une **limite de dépense mensuelle** (par exemple 10 $), par sécurité.
4. *API keys* → **Create key** : copier la clé (`sk-ant-…`). Elle ne sera plus affichée.

## 4. Secrets de la fonction

Dans Supabase, *Edge Functions → Secrets* (ou *Project Settings → Edge Functions*), ajouter :

| Nom | Valeur |
|---|---|
| `ANTHROPIC_API_KEY` | la clé de l'étape 3 |
| `IA_EMAILS` | les adresses autorisées, séparées par des virgules : `vous@exemple.com,votre.femme@exemple.com` |
| `IA_MODELE` | facultatif ; par défaut `claude-sonnet-5-5` |

Pour ajouter une personne plus tard : modifier `IA_EMAILS`, rien d'autre.

## 5. Déployer la fonction `cr-ia`

**Option A — depuis GitHub, sans rien installer (recommandée sur un Mac ancien)**

1. Supabase : *Account → Access Tokens* → **Generate new token**, le copier.
2. GitHub, dépôt `radiologic-hub` : *Settings → Secrets and variables → Actions → New repository secret* :
   - `SUPABASE_ACCESS_TOKEN` : le jeton ;
   - `SUPABASE_PROJECT_REF` : l'identifiant du projet (`abcdefghijkl`).
3. Onglet **Actions** → « Déployer l'assistant IA (Supabase) » → **Run workflow**. Une coche verte au bout d'une à deux minutes : c'est déployé.

À relancer après chaque modification de `assistant-ia/noyau/consigne.js` (après `npm run backend:preparer`) ou de `supabase/functions/cr-ia/`.

**Option B — en ligne de commande** (outil `supabase`, depuis la racine du dépôt) :

```
supabase login
supabase link --project-ref <identifiant-du-projet>
supabase functions deploy cr-ia
```

## 6. Renseigner l'adresse du projet dans le site

Dans `assistant-ia/config.js`, renseigner `supabaseUrl` et `supabaseAnonKey` (clé publique « anon », faite pour être publiée). Si `remplacements/config.js` est déjà rempli avec le même projet, laisser `assistant-ia/config.js` vide : la page reprend cette configuration.

Publier la modification (fusion dans la branche en ligne).

## 7. Essayer

1. Ouvrir `https://nodbysmilii-prog.github.io/radiologic-hub/assistant-ia.html`.
2. Saisir votre e-mail → **Recevoir le lien de connexion** → ouvrir le lien reçu **sur le même appareil**.
3. Choisir le modèle, saisir des notes de test, cocher la case d'anonymisation, **Rédiger le compte rendu**.

Un compte non autorisé peut se connecter mais reçoit « Ce compte n'a pas accès à l'assistant IA » : aucun appel n'est fait.

## Dépannage

| Message affiché | Cause et solution |
|---|---|
| Mode démonstration… | `assistant-ia/config.js` et `remplacements/config.js` vides : étape 6 |
| Ce compte n'a pas accès à l'assistant IA | e-mail absent de `IA_EMAILS` (vérifier l'orthographe) : étape 4 |
| Assistant non configuré : clé API absente | secret `ANTHROPIC_API_KEY` manquant : étape 4 |
| Clé API refusée | clé révoquée ou mal copiée : en créer une nouvelle (étape 3) |
| Crédit API épuisé | recharger le crédit sur console.anthropic.com |
| Service d'IA saturé | réessayer dans une minute |
| Le lien de connexion renvoie vers la mauvaise page | adresse absente des Redirect URLs : étape 2 |

## Limites à garder en tête

- Le **compte rendu** est construit à partir de vos seules notes et du modèle choisi ; l'IA ne lit pas l'examen.
- Le **second regard** sur les coupes clés vient d'un modèle d'IA généraliste, **non validé pour le diagnostic** : à confronter à votre lecture, jamais à recopier tel quel. Usage personnel seulement : le proposer à d'autres praticiens ou à des cliniques relèverait de la réglementation des dispositifs médicaux.
- **Anonymisation** : ne rien envoyer d'identifiant. Masquer sur chaque image les noms, dates et numéros incrustés (glisser sur l'image). Le texte est contrôlé automatiquement (nom après une civilité, date complète, numéro à 8 chiffres), mais ce contrôle est grossier.
- **INPDP** : les textes et images transitent hors de Tunisie (Supabase, Anthropic) ; à mentionner dans la déclaration du site.
