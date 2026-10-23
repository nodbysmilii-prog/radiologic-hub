# Consignes pour Claude — projet RadiologicHub

- **À chaque modification du site, mettre à jour `README.md`** dans le même commit :
  - ajouter une ligne en haut du tableau « Historique des modifications » (date + description courte en français) ;
  - mettre à jour la date « Dernière mise à jour du README » ;
  - mettre à jour les sections concernées (fiches disponibles, fichiers, code couleur, « À faire »…).
- Après une modification de `styles.css`, `fiche.css`, `script.js` ou `fiche.js`, changer le `?v=…` dans les liens de toutes les pages HTML.
- Garder la charte (Montserrat, Permanent Marker, code couleur `k-*`) et répondre à l'utilisateur en français.
- **Modules Remplacements et Communauté pas encore en production** : quand l'utilisateur demande les étapes de mise en service (Supabase, les deux migrations, Brevo, connexion Google OAuth, temps réel, secrets, déploiement, planification, administrateur, `config.js`) ou les démarches juridiques (mentions légales, conditions d'utilisation de la Communauté, INPDP, contrat), les lui rappeler à partir de `remplacements/INSTALLATION.md` et de la liste « À faire » du README, en signalant celles qui semblent déjà faites (par exemple `remplacements/config.js` renseigné).
- **Sources de cours** (PDF, notes, synthèses) : les ranger dans le dépôt **privé** `nodbysmilii-prog/radiologic-hub-sources` (dossier `sources/<module>/`, une ligne dans son README), jamais dans ce dépôt public. Rien de ce dépôt privé n'est copié dans le site : seulement du texte **reformulé**.
- **Gros fichiers tiers** (pack Z-Anatomy…) : dans `assets-sources/` (ignoré par git), retéléchargés par un script à version figée ; seuls les exports dérivés vont dans le site, dans un dossier à part avec leur `LICENSE`.
- **Dictée vocale : erreurs signalées par l'utilisateur** — chaque erreur de dictée signalée devient une correction **générale** (dans `dictee/lexique.js`, ou `dictee/corrections.js` / `dictee/traitement.js` si elle dépend du contexte), avec un test dans `tests/dictee.test.js`, et une ligne en haut du tableau « Dictée vocale : erreurs signalées par l'auteur (liste permanente) » du README. Vérifier que les phrases des comptes rendus types (`cr-data.js`, `cr-tools.js`) ne sont pas modifiées par la nouvelle règle. Changer les `?v=` des fichiers `dictee/*.js` et la ligne « Version de la dictée » de `comptes-rendus.html`.
