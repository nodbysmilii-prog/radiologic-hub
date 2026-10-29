# Charte du module Communauté

À lire avant toute modification importante de la Communauté (`communaute.html`, `reseau/`, tables `rs_*`). Complète `COMMUNAUTE.md` (suivi). Légende : ✅ présent · 🧪 démonstration seulement · 🕓 à développer.

Constat établi le 29/10/2026 en lisant : `communaute.html`, `reseau/` (`app.js`, `api-supabase.js`, `api-demo.js`, `ui.js`, `noyau/`), migrations `20261009090000_reseau.sql` et `20261027120000_communaute_fil.sql`, `remplacements/config.js`.

## 0. Principes

1. **Une seule source de données par sujet.** Les remplacements vivent dans `rp_*` ; la Communauté les *lit*, ne les copie jamais.
2. **Confidentialité d'abord** : aucune donnée identifiante de patient ; messagerie visible des deux seuls participants ; pas d'e-mail ni de téléphone dans les profils publics.
3. **La sécurité est dans la base** (RLS, fonctions `security definer`), jamais dans le seul JavaScript.
4. **Pas de nouveau framework** : JavaScript natif, un module par responsabilité, mêmes conventions que l'existant (§2).
5. **Mobile d'abord** (barre d'onglets en bas ; ordinateur : menu à gauche, suggestions à droite), charte du site (Montserrat, couleurs `k-*`/variables CSS de `rs.css`).
6. **Mode démonstration toujours fonctionnel** : toute nouvelle fonction existe dans `api-demo.js` *et* `api-supabase.js` avec la même signature.
7. Aucune fonctionnalité annoncée comme existante tant qu'elle n'est pas ✅ ici.

## 1. Architecture existante

### 1.1 Fichiers
| Fichier | Rôle |
|---|---|
| `communaute.html` | Coquille : en-tête du site, barre (`#rs-barre`), nav (`#rs-nav`), contenu (`#rs-app`), colonne droite (`#rs-cote`), bandeau démo (`#rs-demo`) |
| `reseau/noyau/regles.js` | Référentiels (statuts, spécialités, modalités, gouvernorats), nom affiché « Dr … » seulement si compte vérifié. UMD, testé sous Node |
| `reseau/noyau/confidentialite.js` | `identite(texte)` (alerte « Madame X », date de naissance, IPP, CIN, téléphone) ; `nettoyer(octets)` retire EXIF/XMP/IPTC. UMD, testé |
| `reseau/api.js` | Choisit Supabase si `remplacements/config.js` est renseigné, sinon démo |
| `reseau/api-supabase.js` / `api-demo.js` | **Même interface** (`session`, `fil`, `missions`, `publierCas`, `commenter`, `conversations`, `signaler`, `admin.*`…) |
| `reseau/images.js`, `ui.js` | Réencodage d'images ; `avatar`, `toast`, `fenetre`, `visionneuse`, icônes |
| `reseau/app.js` (≈ 890 l.) | Routeur à ancres (`#/`, `#/cas/:id`, `#/profil/:id`, `#/moi`, `#/messages/…`, `#/notifications`, `#/recherche`, `#/admin`), rendus HTML par chaînes, abonnement temps réel |
| `reseau/rs.css` | Styles (préfixe `rs-`) |
| `supabase/migrations/` | Tables `rs_*`, RLS, déclencheurs, stockage |

### 1.2 Données (Supabase, projet Francfort, `config.js` renseigné)
`rs_membres` (profil), `rs_cas` (publication ; `type` = `cas` | `avis`), `rs_commentaires`, `rs_jaime`, `rs_enregistres`, `rs_abonnements`, `rs_conversations`/`rs_participants`/`rs_messages`, `rs_blocages`, `rs_signalements` (cibles : cas, commentaire, message, membre ; motifs : identité, erreur, inapproprié, publicité, usurpation, autre), `rs_notifications` (types : jaime, commentaire, abonnement, nouveau_cas, verification, cas_masque). Buckets : `avatars`, `justificatifs` (privé), images de cas et de messages.
Fonctions de droit : `rs_est_membre_actif`, `rs_peut_publier`, `rs_bloque`, `rs_participe`, `rp_est_admin`, `rs_remplacant_valide`.

## 2. Conventions de conception

- **Nommage** : tables/fonctions `rs_*` (Communauté), `rp_*` (Remplacements, intouchable depuis la Communauté). CSS `rs-*`. Textes en français.
- **Une migration par évolution**, idempotente (`if not exists`, `drop constraint if exists`), nommée `AAAAMMJJHHMMSS_communaute_<sujet>.sql`, avec RLS activée et politiques explicites sur toute nouvelle table.
- **Écriture sensible via déclencheurs/RPC** (`rs_proteger_*`, `rs_ouvrir_conversation`) : le client ne peut pas modifier compteurs, état de modération, auteur.
- **Un composant = une fonction de rendu** (`carteCas`, `carteMission`, `bulles`, `formProfil`) qui renvoie du HTML ; toujours `esc()` sur les données utilisateur. Nouveau rendu → nouveau petit fichier `reseau/<nom>.js` plutôt que grossir `app.js`.
- **Règles pures dans `reseau/noyau/`** (UMD, sans DOM), testées dans `tests/reseau*.test.js`.
- **Accessibilité** : `aria-label`, focus visible, cibles tactiles ≥ 44 px, `aria-busy` pendant les chargements.
- **Après modification** de `rs.css`, `reseau/*.js` : changer les `?v=` dans `communaute.html`, mettre à jour README et `COMMUNAUTE.md` (voir `CLAUDE.md`).

## 3. État réel des fonctionnalités

| Fonction | État | Remarques |
|---|---|---|
| Connexion Google / lien e-mail, profil (prénom, nom, titre, statut, établissement, ville, gouvernorat, bio ≤ 500, intérêts, photo) | ✅ | Code complet ; essai réel à deux comptes **non fait** (voir `COMMUNAUTE.md`) |
| Photo de couverture | 🕓 | Absente de `rs_membres` |
| Vérification (Dr/Pr, justificatif privé) | ✅ | Validation par l'administrateur |
| Cas cliniques anonymisés + demandes d'avis (`type`) | ✅ | La migration du fil (`20261027120000`) est **à exécuter** |
| Fil : onglets Tout / Cas / Avis / Remplacements / Abonnements / Enregistrés, filtres spécialité, recherche | ✅ code | Dépend de la migration du fil |
| Publication texte seul, lien vers article scientifique, partage/republication | 🕓 | Un cas exige titre, histoire ≥ 20 car., image (sauf avis) ; pas de lien ni de partage |
| J'aime (un seul type), commentaires, enregistrer, abonnements | ✅ | Pas d'autres réactions, pas de réponses imbriquées |
| Messagerie privée temps réel, images, suppression, blocage, rappel e-mail | ✅ code | Temps réel (publication Realtime) à vérifier |
| Notifications internes | ✅ | Aucune pour les messages (compteur de non-lus à part), aucune pour les remplacements, aucune push |
| Signalements + file de modération + masquage + suspension | ✅ | Pas de journal d'audit des décisions détaillé |
| Suppression de compte | ✅ | `rs_supprimer_mon_compte` |
| Remplacements dans le fil | ✅ partiel | RPC `rs_missions_ouvertes()` (20 max, sans structure/adresse/contact/honoraires), carte `carteMission`, lien vers `remplacements.html` — **hors du tri du fil** (cartes placées en tête, pas d'horodatage commun) |
| Mode démonstration | 🧪 | Données fictives locales, aucune persistance serveur |
| SMS de vérification, purge automatique, groupes, push, import Instagram | 🕓 | Annoncés dans `COMMUNAUTE.md` |

## 4. Liens avec Supabase et Remplacements

- **Même projet, mêmes comptes** : `profils` + `rp_admins` (administrateur commun) ; config lue dans `remplacements/config.js` (clé publique « anon » uniquement).
- **Remplacements → fil** : uniquement par la fonction `rs_missions_ouvertes()` (lecture, `security definer`, membres actifs, missions `publiee` de structures `valide` et non échues).
- **Remplacements → profil** : badge « Disponible pour des remplacements » via `rs_remplacant_valide`, et droit de publier un cas pour un remplaçant validé.
- Le bouton « Je suis disponible » renvoie vers `remplacements.html` ; la réponse, les détails et les coordonnées restent dans Remplacements.

## 5. Architecture cible : annonces de remplacement dans le fil (source unique)

Règle : **`rp_demandes` reste l'unique source**. Pas de table `rs_*` dupliquant une annonce, pas de second moteur.

1. **Lecture seule** par une fonction `rs_fil_remplacements(avant timestamptz, limite int)` (évolution de `rs_missions_ouvertes`, pagination par date `publiee_le`) : mêmes champs non identifiants, mêmes filtres (`publiee`, structure `valide`, date non échue, membre actif).
2. **Fusion côté client** dans `api.fil()` : on fusionne cas et missions **par date décroissante**, avec un champ commun `{ genre: 'cas' | 'mission', date, … }`. La carte reste `carteMission` ; aucune écriture dans le fil.
3. **Cycle de vie hérité** : annonce pourvue, annulée, expirée → disparaît automatiquement (pas de copie à synchroniser).
4. **Seul canal d'action** : lien vers `remplacements.html` (réponse, contact, honoraires après les règles du module). La Communauté ne reçoit pas de candidatures.
5. **Option ultérieure** : notification « nouvelle mission dans votre gouvernorat » alimentée par un déclencheur *lisant* `rp_demandes`, sans l'écrire ; l'abonnement/filtrage est une préférence du membre (`rs_membres`).
6. **Interdits** : modifier `rp_*`, exposer nom/adresse/contact/honoraires de la structure dans le fil, laisser un anonyme lire les missions.

## 6. Contrôles d'accès (cible et existant)

| Rôle | Droits |
|---|---|
| Visiteur non connecté | Page de présentation uniquement, aucune lecture de publication |
| Membre actif (non suspendu) | Lire le fil, commenter, aimer, s'abonner, écrire, signaler |
| Membre vérifié ou remplaçant validé | + publier cas/avis (`rs_peut_publier`) |
| Structure de remplacement | Publie *dans Remplacements* ; la carte du fil est générée, pas publiée par elle |
| Administrateur (`rp_admins`) | Modération, vérification, suspension ; seul accès aux justificatifs |
| Suspendu | Plus aucun droit (`rs_est_membre_actif` faux) |

Règle de test : toute nouvelle table ou fonction doit avoir un test « un membre A ne voit pas / ne modifie pas ce qui est à B » et « un anonyme ne voit rien ».

## 7. Messagerie : confidentialité

- Lecture/écriture limitées aux participants (`rs_participe`) ; blocage mutuel respecté à l'ouverture (`rs_ouvrir_conversation`) et à l'envoi.
- Les administrateurs **ne lisent pas** les conversations. Un message signalé : seul le message cité est transmis à la modération (à documenter et vérifier avant mise en production).
- Pas d'e-mail ni téléphone dans les profils ; les rappels e-mail ne contiennent pas le texte du message (à vérifier dans `rs_rappels_messages`).
- 🕓 Durée de conservation et chiffrement au repos : à préciser dans les conditions d'utilisation.
- Alerte `identite()` aussi dans les messages ; les images de messages passent par `nettoyer`.

## 8. Modération

- Existant : signalement (6 motifs), file admin, retrait ou rejet, masquage avec motif, notification `cas_masque`, suspension, retrait de vérification.
- À ajouter (MVP) : signalement de **profil** depuis la page profil, délai de traitement affiché, journal des décisions (qui, quand, motif), mots d'alerte automatiques (`identite`) qui masquent provisoirement.
- Secondaire : bannière « contenu masqué », appel d'une décision, sanctions graduées.

## 9. Données de patients : interdiction

Cadre actuel : attestation d'anonymisation obligatoire, nettoyage des métadonnées, alerte `identite()`, signalement motif « identité », masquage immédiat par la modération.
Règles à garder :
- Aucune donnée identifiante (nom, initiales complètes, date de naissance, IPP, CIN, téléphone, visage reconnaissable, plaque, date d'examen précise) dans texte, légende, image ou message.
- Tout nouveau type de contenu (publication texte, lien, partage) passe par la **même** vérification `identite()` + attestation.
- Un lien vers un article ne copie ni PDF ni image ni résumé (voir `CHARTE_BIBLIOTHEQUE.md`) : titre, référence, lien.
- Toute évolution touchant l'attestation ou les conditions → validation de l'auteur et revue juridique (INPDP, `mentions-legales.html#conditions`, durées entre crochets à compléter).

## 10. Composants à réutiliser

`api.js` (bascule démo/prod), `ui.js` (`avatar`, `toast`, `fenetre`, `visionneuse`), `images.js` (réencodage), `confidentialite.js`, `regles.js`, `carteCas`/`carteMission`/`bulles`/`formProfil`, routeur de `app.js`, `rs.css`, `bibliotheque` pour les références scientifiques (liens, jamais le contenu). Ne rien reconstruire de ce qui figure ici.

## 11. MVP et secondaire

**Indispensable (MVP)** : mise en service réelle (migration du fil, Google OAuth, temps réel, administrateur, essai à deux comptes), publication texte avec contrôle d'identité, fusion cas/missions triée, notifications de messages, signalement de profil, journal de modération, conditions d'utilisation publiées.
**Secondaire** : photo de couverture, liens d'articles enrichis, partage, réactions multiples, réponses imbriquées, notifications push, groupes, SMS, purge automatique, import Instagram.

## 12. Feuille de route (petites tâches, chacune réalisable avec Sonnet)

Chaque tâche : lire cette charte et `COMMUNAUTE.md`, modifier peu de fichiers, ajouter un test, mettre à jour README + `COMMUNAUTE.md` + `?v=`.

**Phase A — Mise en service (sans code)**
1. Exécuter la migration du fil ; vérifier `rs_missions_ouvertes()` avec un compte test.
2. Configurer Google OAuth, URL de redirection, temps réel (`INSTALLATION.md` étapes 4, 4 bis, 10).
3. Essai à deux comptes (profil, publication, message, blocage, signalement) ; noter les écarts.
4. Compléter les passages entre crochets des conditions d'utilisation.

**Phase B — Fil unifié**
5. `rs_fil_remplacements(avant, limite)` + test de non-fuite (aucun champ de structure).
6. `api.fil()` : fusion par date des cas et des missions (démo puis Supabase), test de tri.
7. Carte mission : mention « publiée le… », état vide, lien explicite vers Remplacements.
8. Filtre « Mon gouvernorat » sur les missions.

**Phase C — Publications**
9. Publication texte courte (nouveau `type = 'texte'`) avec `identite()` obligatoire et attestation.
10. Champ « lien d'article » (titre + URL https validée), sans aperçu automatique.
11. Partage d'une publication (référence vers l'original, pas de copie).
12. Commentaires : réponses à un commentaire (un niveau).

**Phase D — Profil**
13. Colonne `couverture` + bucket, formulaire et affichage (même traitement d'image que la photo).
14. Page profil : onglet « Publications » avec pagination.

**Phase E — Messagerie et notifications**
15. Notification de nouveau message regroupée par conversation (sans texte).
16. Page « Membres bloqués » avec déblocage.
17. Notification « nouvelle mission » selon préférence du membre.

**Phase F — Modération**
18. Signalement d'un profil depuis la page profil.
19. Table `rs_moderation_journal` (décision, auteur, date, motif) alimentée par `traiterSignalement`.
20. Masquage provisoire automatique après N signalements « identité » (N validé par l'auteur).

**Phase G — Plus tard** : réactions multiples, groupes, push, SMS, purge automatique, import Instagram.

## 13. Points à faire valider par l'auteur
Texte de l'attestation, seuil N de masquage, durée de conservation des messages, accès de la modération aux messages signalés, passages juridiques entre crochets.
