# Suivi — module Remplacements

Fichiers : `remplacements.html`, `remplacements-reponse.html`, `remplacements/` (`noyau/moteur.js`, `api*.js`, `app.js`, `calendrier.js`, `modeles/`, `INSTALLATION.md`, `config.js`), `supabase/`. README : section « Remplacements ».

## Réalisé
- Parcours remplaçant / structure / administrateur, calendrier de disponibilités, demandes, agent de sélection et e-mails avec réponse en un clic, journal d'actions.
- Mode démonstration (données fictives) et mode production Supabase (lien magique, stockage privé, fonctions `rp-agent`, `rp-lien`, `rp-taches`).
- 17 modèles d'e-mails, contrat type, tests du moteur.
- Supabase créé, `config.js` renseigné, secrets réglés (`EMAIL_FOURNISSEUR=journal`), fonctions déployées le 27/10/2026.

## À vérifier
- Planification toutes les 15 min (`supabase/sql/planification.sql`, `RP_TACHES_SECRET`).
- Domaine + compte Brevo + SMTP personnalisé, puis `EMAIL_FOURNISSEUR=brevo`.
- Administrateur déclaré (`rp_admins`) ; essai de bout en bout à plusieurs comptes.
- Juridique : `mentions-legales.html` (crochets), INPDP + transfert hors Tunisie, validation de `modeles/contrat.md`.

## Prochaine tâche importante
Terminer la mise en service selon `remplacements/INSTALLATION.md` (étapes 3, 4 et 7) : planification, Brevo, passage à `brevo`.

Plus tard : WhatsApp/SMS, export comptable, notation des remplacements.
