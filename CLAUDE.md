# Consignes pour Claude — projet RadiologicHub

- **À chaque modification du site, mettre à jour `README.md`** dans le même commit :
  - ajouter une ligne en haut du tableau « Historique des modifications » (date + description courte en français) ;
  - mettre à jour la date « Dernière mise à jour du README » ;
  - mettre à jour les sections concernées (fiches disponibles, fichiers, code couleur, « À faire »…).
- Après une modification de `styles.css`, `fiche.css`, `script.js` ou `fiche.js`, changer le `?v=…` dans les liens de toutes les pages HTML.
- Garder la charte (Montserrat, Permanent Marker, code couleur `k-*`) et répondre à l'utilisateur en français.
- **Modules Remplacements et Communauté pas encore en production** : quand l'utilisateur demande les étapes de mise en service (Supabase, les deux migrations, Brevo, connexion Google OAuth, temps réel, secrets, déploiement, planification, administrateur, `config.js`) ou les démarches juridiques (mentions légales, conditions d'utilisation de la Communauté, INPDP, contrat), les lui rappeler à partir de `remplacements/INSTALLATION.md` et de la liste « À faire » du README, en signalant celles qui semblent déjà faites (par exemple `remplacements/config.js` renseigné).
