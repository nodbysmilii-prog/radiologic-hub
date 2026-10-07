# RadiologicHub

**RadiologicHub** est le site des masterclass de **radiologie d'urgence** : des formations par spécialité (neuro, digestif, thorax, polytraumatisé, vasculaire, pédiatrie), des **fiches rapides** de révision, des **cas cliniques annotés** et un outil de **comptes rendus types** avec phrases automatiques.

🌐 **Site en ligne :** https://nodbysmilii-prog.github.io/radiologic-hub/

> Dernière mise à jour du README : 7 octobre 2026

---

## Sommaire

1. [Ce que contient le site](#ce-que-contient-le-site)
2. [Fiches rapides disponibles](#fiches-rapides-disponibles)
3. [Comptes rendus types et phrases automatiques](#comptes-rendus-types-et-phrases-automatiques)
4. [Charte graphique](#charte-graphique)
5. [Code couleur des fiches](#code-couleur-des-fiches)
6. [Organisation des fichiers](#organisation-des-fichiers)
7. [Ajouter ou modifier du contenu](#ajouter-ou-modifier-du-contenu)
8. [Mise en ligne](#mise-en-ligne)
9. [À faire / points en attente](#à-faire--points-en-attente)
10. [Historique des modifications](#historique-des-modifications)

---

## Ce que contient le site

### Page d'accueil (`index.html`)

| Section | Contenu |
|---|---|
| **Accueil** | Accroche « La radiologie d'urgence, cas par cas », compteurs animés, carte « Cas express » |
| **Masterclass** | 6 fiches de masterclass filtrables (Essentiel / Avancé), chacune avec une fenêtre de détail (objectifs, thèmes, format) |
| **Cas du jour** | Mini-quiz interactif sur 3 cas (striatopathie diabétique, hernie d'Amyand, sarcome de l'artère pulmonaire) avec score |
| **Fiche flash** | 4 cartes à retourner : hypersignal T1 des noyaux gris centraux |
| **Le format** | 6 points forts présentés en « blobs » colorés |
| **Une journée type** | Programme heure par heure (exemple : Neuro-urgences) |
| **Nos fiches** | Galerie des visuels RadiologicHub |
| **Tarifs** | 3 formules (module unique, pack 3 modules, cursus complet) |
| **FAQ** | Questions fréquentes repliables |
| **Inscription** | Formulaire avec vérification des champs |

### Fiches rapides (`fiches-rapides.html`)

Index des fiches avec **un onglet par spécialité** (Digestif, Neuro, Thorax, Traumato, Ostéo-articulaire, Vasculaire, Pédiatrie). Les spécialités sans fiche affichent « Bientôt disponible ».

Chaque fiche (`fiches/…html`) propose :

- une **légende du code couleur cliquable** (un clic n'affiche plus qu'une catégorie) ;
- un **sommaire fixe** et une **barre de progression de lecture** ;
- des **tuiles, frises, tableaux et schémas** dans le style du site ;
- des **images** qui s'agrandissent au clic (les emplacements sans image restent masqués) ;
- des cartes **« Testez-vous »** à retourner ;
- un bouton **Imprimer / PDF**.

Les fiches pancréas, rectum et spondylodiscite ont en bas un bouton **« Compte rendu type → »** qui ouvre le modèle correspondant dans l'éditeur.

### Comptes rendus types (`comptes-rendus.html`)

Éditeur de compte rendu avec bibliothèque de modèles et **phrases automatiques** — voir la [section dédiée](#comptes-rendus-types-et-phrases-automatiques).

---

## Fiches rapides disponibles

| Spécialité | Fiche | Fichier | Particularités |
|---|---|---|---|
| Digestif | **Adénocarcinome canalaire du pancréas** | `fiches/adenocarcinome-pancreas.html` | Tableau vasculaire filtrable, feu tricolore de résécabilité, **annexe « Cas & images »** repliable avec 2 carrousels annotés (cas d'extension vasculaire, signes typiques A–D, variante : sténose athéromateuse du tronc cœliaque A–B, diagnostics différentiels : métastases pancréatiques, tumeur neuroendocrine, pancréatite auto-immune) |
| Digestif | **Imagerie de la maladie de Crohn** | `fiches/maladie-de-crohn.html` | Objectifs numérotés, préparation de l'entéro-IRM en frise, activité vs chronicité, phénotypes B1–B3 |
| Digestif | **IRM pelvienne dans le cancer du rectum** | `fiches/irm-cancer-rectum.html` | 13 images du cours, onglets T1–T4, jauge EMS, échelle mrTRG, **checklist du compte rendu** mémorisée dans le navigateur |
| Ostéo-articulaire | **Spondylodiscite infectieuse** | `fiches/spondylodiscite.html` | Fusion de deux cours ; tableaux comparatifs pyogènes / tuberculose / brucellose filtrables, onglets par germe, quiz « Quel germe ? », formes rares, diagnostic différentiel, annexe avec 2 cas annotés (tuberculose, *Bacillus cereus*) |

---

## Comptes rendus types et phrases automatiques

Page `comptes-rendus.html` (lien « Comptes rendus » dans le menu de toutes les pages).

**Fonctionnement**

1. **Modèles** (colonne de gauche, onglet « Modèles ») : un clic charge le compte rendu type dans l'éditeur. Filtre par spécialité.
2. **Phrases automatiques** : en tapant un mot-clé (ex. `angiome`), une bulle propose aussitôt la ou les descriptions correspondantes (TDM / écho / IRM…). **Tab** (ou clic) insère la description, **↑ ↓** choisit une variante, **Échap** ferme. Les suggestions apparaissent dès le mot-clé exact ou dès 4 lettres du début du mot-clé. **Ctrl + Z** annule une insertion.
3. **Champs à compléter** : les éléments variables sont entre crochets (`[x] mm`, `[droit / gauche]`). Le premier champ est sélectionné après chaque insertion ; **Tab** (ou le bouton « Champ suivant ») passe au suivant. Le nombre de champs restants est affiché sous l'éditeur, et un avertissement s'affiche à la copie s'il en reste.
4. **Insertion automatique** (interrupteur sous l'éditeur, désactivé par défaut) : un mot-clé tapé **en début de ligne** (éventuellement après une puce « • ») suivi d'un espace, d'une ponctuation ou d'Entrée est remplacé directement par la première description.
5. **Puces** (style des formules du service) : **Entrée** sur une ligne « • … » crée la puce suivante ; Entrée sur une puce vide termine la liste. Une phrase à puces insérée sur une ligne qui a déjà sa puce ne la double pas.
6. Onglet **« Phrases »** : toute la bibliothèque, avec recherche et filtre par type ; un clic insère la phrase au curseur.
7. Boutons : **Copier**, **Télécharger .txt**, **Imprimer** (le compte rendu seul), **Enregistrer comme modèle**, **Sélection → phrase** (crée une phrase perso à partir du texte sélectionné), **Effacer**.
8. **Mes phrases** (bas de page) : formulaire pour programmer ses propres mots-clés et descriptions ; modifier / supprimer ; **Exporter / Importer** (fichier `.json`) pour les transférer sur un autre ordinateur. Les phrases perso sont proposées en premier.

**Stockage** : le brouillon, les phrases et les modèles perso sont enregistrés **dans le navigateur** (localStorage), rien n'est envoyé. Message de confidentialité sur la page : ne pas saisir de données identifiantes.

**Contenu fourni (`cr-data.js`)**

18 comptes rendus types. Ceux marqués ★ sont les **formules normales du service** (fournies en PDF le 07/10/2026), reprises mot pour mot avec leurs puces ; seules corrections : accents sur les majuscules, accords (« constitutionnelle », « contenant-contenu », « 4e »), points finaux, intertitres « Au niveau dorsal » et « Au niveau du bassin » ajoutés dans l'IRM médullaire, et quelques champs `[ … ]` (côté, compartiment, conclusion).

| Spécialité | Comptes rendus types |
|---|---|
| Neuro | ★ TDM cérébrale sans injection normale · Alerte AVC (scanner + angio-scanner TSA et Willis, ASPECTS) |
| Thorax | Radiographie du thorax normale · ★ TDM thoracique sans injection normale · Angio-scanner thoracique (recherche d'EP) |
| Digestif | Scanner abdomino-pelvien normal · Échographie abdominale normale · Adénocarcinome du pancréas (résécabilité, repris de la fiche) · IRM rectum bilan initial (mrT, EMS, CRM, EMVI, repris de la fiche) |
| Uro-gynéco | Scanner sans injection — colique néphrétique |
| Traumato | Body-scanner du polytraumatisé |
| Ostéo-articulaire | IRM du rachis — spondylodiscite (repris de la fiche) · ★ IRM médullaire (rachis entier, étage par étage, bassin) · ★ Radiographie du rachis lombaire (F + P) normale · ★ Radiographie du genou (F + P) normale · ★ Radiographie du genou — gonarthrose |
| Vasculaire | Angio-scanner aortique — syndrome aortique aigu |
| Pédiatrie | Échographie — suspicion d'appendicite |

**71 phrases**, classées par type (couleur du mot-clé). Les phrases « normales » reprennent les formules du service (★) :

| Couleur | Classe | Type | Exemples de mots-clés |
|---|---|---|---|
| 🔵 Bleu | `k-tech` | Normal | ★ `cerveaunormal`, `fossepost`, `sustentoriel`, `poumonsnormaux`, `mediastinnormal`, `osnormal`, `mineralisation`, `rachislombnormal`, `etagecervical`, `etagelombaire`, `dorsalnormal`, `conenormal`, `bassinnormal`, `genounormal` · `foienormal`, `pancreasnormal`, `reinsnormaux`… |
| 🟢 Vert | `k-sign` | Lésion / incidentalome | ★ `gonarthrose` (fémoro-tibiale, fémoro-patellaire), `demineralisation` · `angiome` (foie TDM / écho / IRM, vertèbre), `kyste` (foie, rein Bosniak I, ovaire), `steatose`, `hnf`, `adenome`, `meningiome`, `nodule`, `lipome`, `enostose` |
| 🔴 Rouge | `k-grave` | Pathologie aiguë | `appendicite`, `diverticulite`, `occlusion`, `pneumoperitoine`, `cholecystite`, `pancreatite`, `lithiase`, `pyelonephrite`, `hsd`, `hed`, `hsa`, `avc`, `ep`, `pneumothorax`, `dissection`, `aaa` |
| 🟡 Jaune | `k-key` | Conclusion / formule | `conclusionnormale`, `transmis`, `comparatif`, `controle`, `cordialement` (signature : créer une phrase perso `cordialement` avec son nom pour la remplacer) |
| 🟣 Violet | `k-ddx` | Mes phrases (perso) | — |

---

## Charte graphique

Reprise des visuels RadiologicHub.

- **Polices** : *Montserrat* (texte, titres en capitales), *Permanent Marker* (titres « feutre » soulignés), *Michroma* (logo).
- **Mots-clés** : marine `#2b2a74` et rouge `#a8172d`.
- **Couleurs des cartes** : ambre `#f2ab2f`, bleu `#3c67b8`, violet `#6b0d8c`, sarcelle `#2a9d8f`, vert `#548c6c`, rose `#d63f4c`, orange `#f18d25`…
- **Formes** : fonds gris dégradés, cartes à cadre décalé avec pastille ronde, bulles avec pointe, blobs dégradés.
- **Annotations d'images** (flèches, astérisques, contours, pastilles A/B/C…) : dessinées en SVG par-dessus les images, contour noir et couleurs du code.

Toutes les couleurs sont des variables dans `:root` de `styles.css` (site) et `fiche.css` (fiches).

---

## Code couleur des fiches

| Couleur | Classe CSS | Signification |
|---|---|---|
| 🔵 Bleu | `k-tech` | Technique / séquence |
| 🟠 Orange | `k-signo` | Signe radiologique |
| 🔴 Rouge | `k-grave` | Gravité / urgence / complication / non-résécabilité |
| 🟢 Vert | `k-sign` | Signe discriminant / avantage / conduite |
| 🟣 Violet | `k-ddx` | Piège / diagnostic différentiel / étiologie |
| 🟡 Jaune | `k-key` | À retenir |

Dans le HTML : `<mark class="k-grave">contact &gt; 180°</mark>`. Les libellés de la légende peuvent être adaptés dans chaque fiche.

La page **Comptes rendus** réutilise ces couleurs pour les types de phrases (voir [tableau ci-dessus](#comptes-rendus-types-et-phrases-automatiques)).

---

## Organisation des fichiers

```
radiologic-hub/
├── index.html              Page d'accueil
├── styles.css              Styles du site (charte, header, cartes, quiz…)
├── script.js               Données et interactions de l'accueil
├── fiches-rapides.html     Index des fiches rapides
├── fiche.css               Styles communs à toutes les fiches
├── fiche.js                Interactions des fiches (légende, carrousels, checklist…) + menu mobile
├── fiches/                 Une page HTML par fiche
├── comptes-rendus.html     Comptes rendus types : éditeur, bibliothèque, mes phrases
├── cr-data.js              Données : modèles de CR (CR_TEMPLATES) et phrases automatiques (CR_PHRASES)
├── cr.js                   Éditeur : suggestions, champs [ … ], insertion auto, mes phrases, export/import
├── cr.css                  Styles de la page Comptes rendus
└── assets/
    ├── logo-radiologichub.png, emblem.svg, emblem-light.svg
    ├── posts/              Visuels RadiologicHub (galerie de l'accueil)
    └── fiches/<fiche>/     Images de chaque fiche + README listant les fichiers attendus
```

---

## Ajouter ou modifier du contenu

| Je veux… | Où ? |
|---|---|
| Modifier une masterclass | Tableau `COURSES` dans `script.js` |
| Modifier le quiz « Cas du jour » | Tableau `CASES` dans `script.js` |
| Modifier la fiche flash de l'accueil | Tableau `FLASH` dans `script.js` |
| Changer tarifs, programme, FAQ | Directement dans `index.html` |
| Ajouter une fiche rapide | Créer `fiches/ma-fiche.html` (copier une fiche existante) + ajouter une carte `<a class="fiche-card" data-spe="…">` dans `fiches-rapides.html` |
| Ajouter une image à une fiche | La déposer dans `assets/fiches/<fiche>/` avec le nom indiqué dans le README du dossier |
| Ajouter un compte rendu type | Ajouter un objet `{ id, spe, mod, title, text }` dans `CR_TEMPLATES` (`cr-data.js`) ; lien direct possible : `comptes-rendus.html#modele=<id>` |
| Ajouter une phrase automatique | Ajouter un objet `{ k, alias, organ, mod, type, label, text }` dans `CR_PHRASES` (`cr-data.js`). Mot-clé sans espace ni accent ; éviter les mots courants (« foie », « normal »…) qui ouvriraient la bulle en pleine rédaction |
| Champs à compléter | Les écrire entre crochets `[x]`, `[droit / gauche]` ; **pas de crochets imbriqués** (utiliser « … » à l'intérieur d'un choix) |
| Style des formules du service | Titre en capitales, `TECHNIQUE :`, `RÉSULTAT :` (ou `COMPTE-RENDU :`), une constatation par ligne précédée de `• `, `AU TOTAL :` / `CONCLUSION :` |

**Images médicales :** toujours **anonymisées** (aucun nom, date, n° de dossier, ni texte incrusté). Le site et le dépôt sont publics.

**Cache :** après une modification de `styles.css`, `fiche.css`, `script.js`, `fiche.js`, `cr.css`, `cr.js` ou `cr-data.js`, changer le numéro `?v=…` dans les liens des pages HTML pour forcer les navigateurs à recharger les fichiers.

---

## Mise en ligne

Site 100 % statique (HTML / CSS / JavaScript, aucune installation).

- **En ligne** : GitHub Pages, branche `claude/radiologichub-website-ss89g9`, dossier racine. Chaque modification poussée est en ligne en 1 à 2 minutes.
- **En local** : ouvrir `index.html` dans un navigateur.

---

## À faire / points en attente

- [ ] **Formulaire d'inscription** : l'envoi n'est pas branché (voir `TODO` dans `script.js`) → Formspree, Netlify Forms ou back-end.
- [ ] **Tarifs, horaires, nombre de cas** : valeurs d'exemple à remplacer.
- [ ] **Images manquantes** : fiche pancréas (sémiologie, extension) et fiche Crohn — voir les README de `assets/fiches/pancreas/` et `assets/fiches/crohn/`.
- [ ] **Fiche Crohn** : harmoniser la préparation de l'entéro-IRM (« 1 L / 45-60 min » vs « 1,5-2 L / 30 min-1 h »).
- [ ] **Fiche rectum** : préciser les légendes des images « formes tumorales » et « mesure axiale 1,57 cm ».
- [ ] **Fiches des autres spécialités** : Neuro, Thorax, Traumato, Vasculaire, Pédiatrie.
- [ ] **Lecteur de séries** (défilement dans un scanner / IRM) : en attente d'une série anonymisée exportée en JPG.
- [ ] **Comptes rendus types** : relire et valider médicalement les modèles et phrases rédigés au départ (13 modèles, ~55 phrases de `cr-data.js`) ; continuer à intégrer les formules normales du service (5 reçues le 07/10/2026) ; décider s'il faut aligner les premiers modèles sur le style du service (titres, puces).
- [ ] **IRM médullaire** : la technique cite des coupes transversales sur « les 3 derniers étages lombaires » mais le CR décrit L1-L2 à L5-S1, et les coupes coronales T2 FatSat du bassin ne sont pas citées dans la technique — à vérifier.
- [ ] **Nom de domaine** `www.radiologichub.com` : à acheter et configurer (DNS + réglages GitHub Pages), puis mettre à jour le lien « Site en ligne » ci-dessus.

---

## Historique des modifications

| Date | Modification |
|---|---|
| 07/10/2026 | Comptes rendus : intégration des 5 formules normales du service (TDM cérébrale, TDM thoracique, IRM médullaire, radio rachis lombaire, radio genou normale + gonarthrose) en modèles et en 17 phrases ; puces « • » automatiques à l'Entrée |
| 07/10/2026 | Nouvelle page « Comptes rendus » : 13 CR types, 56 phrases automatiques (mot-clé → description, Tab pour insérer, champs [ … ]), mes phrases / modèles perso avec export-import ; lien dans le menu et depuis les fiches pancréas, rectum, spondylodiscite ; menu de l'en-tête resserré (hamburger sous 960 px) |
| 05/10/2026 | Nouvel onglet « Ostéo-articulaire » + fiche spondylodiscite infectieuse (fusion de deux cours, 30 images dont 13 annotées, quiz « Quel germe ? ») |
| 05/10/2026 | Fiche pancréas : DDx 3 — pancréatite auto-immune pseudo-tumorale (formes diffuse/focale, arguments en faveur, atteintes IgG4, coupes A–C annotées) |
| 05/10/2026 | Fiche pancréas : DDx 2 — tumeur neuroendocrine pancréatique (coupes A, B, C annotées + comparatif avec l'ADK) |
| 05/10/2026 | Fiche pancréas : annexe « Diagnostics différentiels » — DDx 1 : métastases pancréatiques d'un carcinome papillaire de la thyroïde (comparatif avec l'ADK typique) |
| 05/10/2026 | Fiche pancréas : annexe « Variante vasculaire » (plaque d'athérome à l'origine du tronc cœliaque, coupes A et B annotées) + lien depuis la partie VII |
| 05/10/2026 | README complet du projet (description, charte, code couleur, fichiers, historique) |
| 05/10/2026 | Fiche pancréas : carrousel « Signes typiques de l'ADKP » (A–D) annoté dans l'annexe |
| 05/10/2026 | Fiche pancréas : annexe repliable, images en carrousel |
| 05/10/2026 | Correctif cache : versions `?v=` sur CSS/JS, annotations robustes |
| 05/10/2026 | Fiche pancréas : annexe « Cas clinique » avec coupes TDM annotées |
| 05/10/2026 | Nouvelle fiche : IRM pelvienne dans le cancer du rectum (avec images du cours) |
| 05/10/2026 | Nouvelle fiche : imagerie de la maladie de Crohn |
| 05/10/2026 | Fiche pancréas : emplacements d'images TDM / IRM avec légendes |
| 04/10/2026 | Section « Fiches rapides » + fiche adénocarcinome du pancréas |
| 04/10/2026 | Refonte au style RadiologicHub (Montserrat, cartes colorées, blobs, quiz, fiche flash) |
| 04/10/2026 | Création du site |
