# RadiologicHub

**RadiologicHub** est le site des masterclass de **radiologie d'urgence** : des formations par spécialité (neuro, digestif, thorax, polytraumatisé, vasculaire, pédiatrie), des **fiches rapides** de révision et des **cas cliniques annotés**.

🌐 **Site en ligne :** https://nodbysmilii-prog.github.io/radiologic-hub/

> Dernière mise à jour du README : 5 octobre 2026

---

## Sommaire

1. [Ce que contient le site](#ce-que-contient-le-site)
2. [Fiches rapides disponibles](#fiches-rapides-disponibles)
3. [Charte graphique](#charte-graphique)
4. [Code couleur des fiches](#code-couleur-des-fiches)
5. [Organisation des fichiers](#organisation-des-fichiers)
6. [Ajouter ou modifier du contenu](#ajouter-ou-modifier-du-contenu)
7. [Mise en ligne](#mise-en-ligne)
8. [À faire / points en attente](#à-faire--points-en-attente)
9. [Historique des modifications](#historique-des-modifications)

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

Index des fiches avec **un onglet par spécialité** (Digestif, Neuro, Thorax, Traumato, Vasculaire, Pédiatrie). Les spécialités sans fiche affichent « Bientôt disponible ».

Chaque fiche (`fiches/…html`) propose :

- une **légende du code couleur cliquable** (un clic n'affiche plus qu'une catégorie) ;
- un **sommaire fixe** et une **barre de progression de lecture** ;
- des **tuiles, frises, tableaux et schémas** dans le style du site ;
- des **images** qui s'agrandissent au clic (les emplacements sans image restent masqués) ;
- des cartes **« Testez-vous »** à retourner ;
- un bouton **Imprimer / PDF**.

---

## Fiches rapides disponibles

| Spécialité | Fiche | Fichier | Particularités |
|---|---|---|---|
| Digestif | **Adénocarcinome canalaire du pancréas** | `fiches/adenocarcinome-pancreas.html` | Tableau vasculaire filtrable, feu tricolore de résécabilité, **annexe « Cas & images »** repliable avec 2 carrousels annotés (cas d'extension vasculaire, signes typiques A–D, variante : sténose athéromateuse du tronc cœliaque A–B) |
| Digestif | **Imagerie de la maladie de Crohn** | `fiches/maladie-de-crohn.html` | Objectifs numérotés, préparation de l'entéro-IRM en frise, activité vs chronicité, phénotypes B1–B3 |
| Digestif | **IRM pelvienne dans le cancer du rectum** | `fiches/irm-cancer-rectum.html` | 13 images du cours, onglets T1–T4, jauge EMS, échelle mrTRG, **checklist du compte rendu** mémorisée dans le navigateur |

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

---

## Organisation des fichiers

```
radiologic-hub/
├── index.html              Page d'accueil
├── styles.css              Styles du site (charte, header, cartes, quiz…)
├── script.js               Données et interactions de l'accueil
├── fiches-rapides.html     Index des fiches rapides
├── fiche.css               Styles communs à toutes les fiches
├── fiche.js                Interactions des fiches (légende, carrousels, checklist…)
├── fiches/                 Une page HTML par fiche
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

**Images médicales :** toujours **anonymisées** (aucun nom, date, n° de dossier, ni texte incrusté). Le site et le dépôt sont publics.

**Cache :** après une modification de `styles.css`, `fiche.css`, `script.js` ou `fiche.js`, changer le numéro `?v=…` dans les liens des pages HTML pour forcer les navigateurs à recharger les fichiers.

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

---

## Historique des modifications

| Date | Modification |
|---|---|
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
