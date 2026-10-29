# Charte de conception du module Radioanatomie

> Méthode de RadiologicHub pour les atlas de radioanatomie (coupes légendées, planches de radiographie, visionneuses de volumes, modèles 3D). À consulter **avant toute modification importante** du module (`radioanatomie/`, `scripts/radioanatomie/`, `tests/radioanatomie*.test.js`).
> Établie le 29/10/2026 **à partir du code existant** : elle décrit ce qui est, puis ce qui est envisagé, sans refonte. Suivi d'avancement : `AUTRES_MODULES.md` (section Radioanatomie). L'Espace DICOM (`espace-dicom*`, `dicom/`, OHIF) est un module à part, non couvert ici.
> Exemples lus pour cette charte : **IRM du genou** (`irm-genou.html`, `atlas-coupes.js`, `donnees/genou-irm/`, `construire_atlas_genou.py`), **TDM thoracique** (`construire_atlas_thorax.py`, `validation.json`), **radiographie thoracique de face** (`radiographie-standard/thorax-face.*`, `planche.js`, `construire_planche.py`), **territoires artériels** (`visionneuse.js`, `manifest.json`). Les autres pages suivent ces schémas : vérifier dans leur fichier avant d'affirmer quoi que ce soit.

Légende : ✅ présent dans le code · 🕓 envisagé / à développer.

## 0. Principes

1. **Rigueur anatomique avant tout.** Aucune structure, aucun nom, aucune position, aucun territoire n'est inventé. Un repère vient d'une segmentation de référence relue, d'un calcul exact à partir de celle-ci, ou d'un point posé à la main **puis relu par l'auteur**. Un doute devient une question à l'auteur, jamais une valeur plausible.
2. **Le fond médical appartient à l'auteur.** Noms français, catégories, découpages (territoires, lobes, compartiments), textes de précision : jamais modifiés sans sa validation. Les retouches techniques (mise en page, performance) ne touchent pas les données.
3. **Réutiliser les trois moteurs existants** (§ 2) avant d'en écrire un quatrième. Une nouvelle région = de nouvelles **données** dans un format existant, pas un nouveau script d'affichage.
4. **Données séparées du code.** Ce qui est anatomique vit dans des JSON (ou volumes) générés par un script Python reproductible ; le JavaScript n'affiche que ce qu'il reçoit.
5. **Sources libres, licences visibles.** Chaque jeu d'images a son `LICENSE-*.txt` à côté des données et sa ligne « origine / crédits » sur la page. Sources de cours de l'auteur : dépôt privé `radiologic-hub-sources`, jamais ici.
6. **Tout reste dans le navigateur**, site statique, aucune donnée envoyée.

## 1. Ce qui existe ✅

| Page | Moteur | Données | Contenu |
|---|---|---|---|
| `territoires-arteriels.html` | `visionneuse.js` (volumes, canvas) | `donnees/territoires-arteriels/` (`manifest.json`, volumes `.u8.gz`) | IRM IBC T1 / T2 / FLAIR, 22 territoires + zones jonctionnelles, 3 plans, mode test (lésion simulée) |
| `irm-genou.html` | `atlas-coupes.js` | `donnees/genou-irm/` | 4 séries (sag DP, cor T1, cor DP FS, ax T2), 12 catégories, 47 structures posées à la main |
| `tdm-thorax.html` | `atlas-coupes.js` | `donnees/thorax-tdm/` | séries médiastin / poumon / coronal / sagittal, calque des lobes, étiquettes « référence / calculée / repère manuel » |
| `radiographie-standard/thorax-face.html`, `thorax-profil.html`, `cavum-profil.html` | `planche.js` | `<planche>.json` → SVG intégré par `construire_planche.py` | planches annotées numérotées, quiz |

Hors module mais réutilisable : **visionneuse 3D three.js 0.170.0** (`vendor/`, `cours/visionneuse.js`, modèles `public/models/*` dérivés de Z-Anatomy CC BY-SA 4.0) utilisée par les fiches et les cours ; **aucun modèle 3D dans le module Radioanatomie** à ce jour.

En préparation hors ligne : **IRM cérébrale complète** (`scripts/radioanatomie/irm/`, étapes 1 à 7 ; étape 6 = visionneuse du site, **charte à présenter à l'auteur avant d'écrire le code**). Rien n'est publié.

## 2. Les trois moteurs ✅

### 2.1 Atlas de coupes légendées — `atlas-coupes.js` / `atlas-coupes.css` (préfixe `ac-`)

- **Pour** : séries d'images 2D pré-calculées (JPEG, une image par coupe), étiquettes ponctuelles. Choix par défaut pour toute nouvelle région en coupes.
- **Montage HTML** : un `.ac-station` portant `data-atlas="<chemin>/atlas.json"` et `data-base`, avec les éléments `ac-barre`, `ac-series`, `ac-outils` (`data-ac="categories|legendes|quiz"`), `ac-scene` (focusable), `ac-cadre` + `img`, `ac-or-*` (orientation), `svg.ac-traits`, `ac-coupe` (curseur + compteur), `ac-quiz-barre` (`data-ac="tout|recommencer"`), `ac-info`, `ac-panneau` (catégories). Copier le bloc de `irm-genou.html`.
- **Format `atlas.json`** (généré, ne pas éditer à la main) :
  - `titre`, `source` ;
  - `categories[]` : `{ id, nom, couleur }` ;
  - `structures{}` : `id → { nom, cat }` (+ `source` au thorax : `référence` / `calculée` / `repère manuel`) ;
  - `series[]` : `id, nom, plan, ponderation, description, cote, largeur, hauteur, pixel_mm, epaisseur_mm, coupes, positions_mm, dossier, orientation [haut, bas, gauche, droite], chiffres?, calque?, reperes` où `reperes[k]` = liste de `[id, x, y]` en pixels de l'image de la coupe `k`.
- **Images** : `<dossier><NN>.jpg` (numéro sur `chiffres` caractères, 2 par défaut) ; calque facultatif `<calque><NN>.png` transparent.
- **Interaction** : molette, flèches / Page ↑↓, glisser vertical sur l'image, curseur ; survol ou focus = surbrillance ; clic = épingler ; étiquettes en deux colonnes sans chevauchement, ligne de rappel vers le point ; menu des catégories à interrupteurs ; préchargement des coupes voisines.
- **Quiz** : noms remplacés par « ? », clic = révéler, score par coupe, « Tout révéler », « Recommencer la coupe ».
- **Chaîne de production** : `preparer_<region>.py` (images, `series.json`) → repères (`reperes-source/<série>.json` : coupes clés `kf`, interpolation linéaire entre deux coupes clés, rien hors de la première et de la dernière ; ou masques de référence au thorax) + `nomenclature.json` → `construire_atlas_<region>.py` → `atlas.json`.

### 2.2 Planche de radiographie — `planche.js` / `planche.css` (préfixe `pl-`)

- **Pour** : une image unique (radiographie standard), étiquettes numérotées, traits ou contours lissés.
- **Format `<planche>.json`** : `titre, sousTitre, disposition, marge, taille, image { fichier, largeur, hauteur }, origine, structures[] { id, nom, lignes[], c, t, cote, point, n, … }`.
- **Production** : `python3 scripts/radioanatomie/construire_planche.py radioanatomie/radiographie-standard/<nom>` écrit le SVG et la liste **dans le HTML**, entre `<!-- planche:svg -->` et `<!-- planche:liste -->`. Ne jamais éditer ces zones à la main.
- **Interaction** : bouton unique « Afficher / Masquer les légendes », quiz (pastille → nom), version compacte sous 520 px (pastilles + bulle), plusieurs planches par page possibles (`[data-planche]`).

### 2.3 Visionneuse de volumes — `visionneuse.js` / `radioanatomie.css` (préfixe `ra-`)

- **Pour** : volumes 3D isotropes (octets 0–255, `.u8.gz`) avec cartes d'étiquettes ; reconstruction des 3 plans dans le navigateur, fenêtrage, zoom, déplacement.
- **Format `manifest.json`** : `dimensions, espacement_mm, origine_mm, orientation` (RAS), `series[]` (code, fichier, fenêtres), `fichiers`, `empreintes_sha256_decompresse`, `groupes`, `territoires`, `jonctions`, `non_colores`, `questions`, `credits`.
- **Aujourd'hui spécifique aux territoires artériels** (mode test à lésion simulée, groupes vasculaires). Le généraliser est une tâche à part (§ 9), à ne pas faire en passant.

## 3. Conventions techniques ✅

- **Site statique**, JavaScript sans dépendance ni compilation, IIFE `'use strict'`, noms en français ; CSS préfixé par moteur (`ac-`, `pl-`, `ra-`) ; charte du site (Montserrat, Permanent Marker, cartes du site).
- **Scripts de données** en Python lancé par `python3 -I` depuis la racine ; gros fichiers sources dans `assets-sources/` (ignoré par git), téléchargés à **version figée** (identifiant de version + sha256) ; seuls les dérivés vont dans `radioanatomie/donnees/<region>-<modalite>/` avec leur `LICENSE-*`.
- **Nommage des dossiers** : `donnees/<region>-<modalite>/` (`genou-irm`, `thorax-tdm`) ; séries `<plan>-<ponderation>` (`sag-dp`, `ax-t2`) ; identifiants de structures en minuscules avec tirets (`condyle-lat`).
- **Versions** : après modification d'un `.js` / `.css` du module, changer son `?v=AAAAMMJJhhmmss` dans **toutes** les pages qui le chargent ; idem pour `styles.css`, `fiche.css`, `script.js`, `fiche.js` (règle de `CLAUDE.md`).
- **README** et `AUTRES_MODULES.md` mis à jour dans le même commit.

## 4. Conventions pédagogiques

- ✅ **Catégories colorées** (os, muscles, artères, veines, nerfs…) filtrables ; la couleur d'une catégorie est stable dans un atlas. 🕓 Palette commune entre atlas (même couleur pour « Artères » partout) : à proposer à l'auteur.
- ✅ **Révéler plutôt que montrer** : quiz « ? → nom » sur les atlas de coupes et les planches ; mode test avec correction sur la visionneuse.
- ✅ **Nomenclature française actuelle** (terminologie anatomique internationale en français), éponymes entre parenthèses ou évités selon l'auteur ; accords droit / droite.
- ✅ Textes explicatifs (`ac-aide`, précisions des territoires) courts ; crédits visibles.
- 🕓 Mode « trouver » (nom donné → désigner la structure), progression par coupe ou par catégorie, parcours guidés par l'auteur (suite de coupes commentées).

## 5. Annotations : types et règles de précision

| Type | Où | Statut |
|---|---|---|
| **Point + étiquette** (`[id, x, y]`) | atlas de coupes, planches | ✅ |
| **Trait / contour lissé** (SVG) | planches | ✅ |
| **Calque de couleur par coupe** (PNG transparent) | thorax (lobes) | ✅ |
| **Carte d'étiquettes volumique** (un octet par voxel) | visionneuse (territoires, jonctions) | ✅ |
| **Contour cliquable par coupe** (polygone ou masque) dans l'atlas de coupes | — | 🕓 |

Règles :
1. **Origine tracée** : chaque structure d'un atlas indique d'où vient son repère (`référence`, `calculée`, `repère manuel`, comme au thorax ✅) ; à étendre aux nouveaux atlas.
2. **Le point est dans la structure** : au thorax, contrôle automatique (dans le masque de référence, densité attendue, hors masque d'une autre structure) ✅ ; pour les repères manuels sans masque, relecture par l'auteur obligatoire.
3. **Interpolation entre coupes clés** : seulement pour des structures continues ; une coupe clé à chaque changement de forme ; jamais d'extrapolation hors des coupes clés ✅.
4. **Latéralité et orientation** : convention radiologique (droite du patient à gauche de l'écran ; sagittal : avant à gauche) ✅ ; lettres d'orientation sur les quatre bords de chaque série ✅ ; côté examiné indiqué (`cote`).
5. **Invariants anatomiques** contrôlés par le script de construction, qui **s'arrête en cas d'échec** (`validation.json` au thorax : côtés, arc aortique à gauche, carène T4-T6…) ✅. 🕓 À généraliser à chaque nouvel atlas.
6. **Une structure absente** d'une coupe n'y est pas légendée ; pas de « remplissage » pour équilibrer les colonnes.

## 6. Images, annotations, modèles 3D : trois couches distinctes

| Couche | Nature | Règle |
|---|---|---|
| **Image médicale** | examen réel anonymisé (JPEG par coupe, cliché, volume) | source libre, licence et version figées, anonymisation vérifiée (en-têtes, texte incrusté, visage) ; jamais retouchée sauf fenêtrage / recadrage / réduction documentés |
| **Annotation** | ce que RadiologicHub ajoute (points, noms, contours, calques) | fichiers séparés de l'image, générés par script, relus par l'auteur ; on peut toujours les masquer |
| **Modèle 3D** | représentation schématique (Z-Anatomy / BodyParts3D, CC BY-SA 4.0) | **ce n'est pas l'anatomie du patient de l'image** : ne jamais le présenter comme recalé sur l'examen ; volumes « schématiques » signalés comme tels (fiches médiastin, cavum) ; mention de licence visible |

Une page peut combiner les couches, mais l'interface doit toujours laisser voir l'image seule.

## 7. Interaction et navigation

- ✅ Souris : molette = coupe ; visionneuse : Ctrl + molette = zoom, clic droit glissé = fenêtrage, clic du milieu = déplacement.
- ✅ Tactile : glisser vertical = coupes (atlas, `touch-action: none` sur le cadre) ; visionneuse : un doigt = outil, deux doigts = zoom / déplacement, toucher bref = identifier.
- ✅ Clavier : ↑ ↓ ← →, Page ↑ ↓ ; Échap ferme le panneau ; boutons avec `aria-pressed` / `aria-expanded`, compteur et infos en `aria-live`.
- 🕓 **Recherche d'une structure** (champ commun, saut à la coupe où elle est la plus centrale, surbrillance) — les données le permettent déjà (`reperes` par coupe).
- 🕓 **Synchronisation entre plans** d'un même examen (clic sur un point → coupe correspondante dans les autres séries via `positions_mm`, `pixel_mm` et l'orientation) : seulement si les séries viennent du **même examen** (au genou, les séries viennent de cas différents : pas de synchronisation possible).
- 🕓 Lien profond (`#serie=…&coupe=…&structure=…`) pour citer une coupe depuis une fiche ou un cours.

## 8. Performance et compatibilité (ordinateur, tablette, téléphone)

- ✅ JPEG légers par coupe, préchargement des seules coupes voisines, `loading="lazy"` sur les vignettes ; volumes compressés `.u8.gz`, T1 d'abord, autres pondérations à la demande ; `ResizeObserver` pour la mise en page.
- ✅ three.js chargé **au clic** sur téléphone (cours) ; modèles ≈ 0,5 Mo.
- Règles : image d'une coupe ≤ 512 px de côté sauf besoin démontré ; poids total d'un atlas à indiquer dans le README ; pas de bibliothèque externe sans version figée dans `vendor/` ; zones tactiles ≥ 40 px ; tester à 360 px, 768 px (tablette portrait) et 1280 px.
- 🕓 Test navigateur (Playwright, déjà installé) des trois moteurs à ces trois largeurs.

## 9. Limites identifiées (constatées dans le code)

- `atlas-coupes.js` : **une seule station par page** (`querySelector('[data-atlas]')`) ; texte « genou » écrit en dur dans `ac-info` (`s.cote ? ' · genou …'`) et bouton « Lobes » écrit en dur pour le calque : à rendre paramétrables par les données avant une troisième région.
- Annotations **ponctuelles seulement** dans l'atlas de coupes : pas de contour cliquable ni de surbrillance de surface.
- **Ni recherche, ni zoom / déplacement, ni fenêtrage** dans l'atlas de coupes (JPEG déjà fenêtrés).
- Quiz sans mémoire (rien n'est gardé d'une visite à l'autre) et seulement dans le sens « point → nom ».
- `visionneuse.js` (≈ 1 000 lignes) mêle moteur de volume et logique des territoires.
- Noms insérés par `innerHTML` depuis les JSON : acceptable tant que les données sont générées par nos scripts ; ne jamais y brancher une saisie utilisateur.
- Validation automatique des invariants seulement au thorax ; genou, radiographies et cavum : relecture manuelle en attente (voir `AUTRES_MODULES.md`).
- Pas de 3D dans le module ; pas de modèle partagé entre fiches et radioanatomie.

## 10. Validation anatomique (méthode)

1. **Source** : jeu libre identifié (DOI, version, licence), cas noté (`cas`), anonymisation contrôlée.
2. **Nomenclature** : `nomenclature.json` (ou table `correspondance-etiquettes.*` pour le cerveau) relue par l'auteur **avant** de poser les repères.
3. **Repères** : générés (référence / calcul) ou posés à la main sur coupes clés ; contrôles automatiques dans le script de construction (dans le masque, côté, densité, invariants) ; échec = arrêt.
4. **Relecture par l'auteur** structure par structure (modèle : interface de validation privée de l'IRM cérébrale, Valider / Corriger / Supprimer) ; corrections recopiées dans un fichier versionné et rejouées par le script.
5. **Tests Node** (`tests/radioanatomie-<region>.test.js`) : dimensions des images, nombre de coupes, chaque `id` de repère existe dans `structures`, chaque structure a une catégorie connue, coordonnées dans l'image, licences présentes, `?v=` cohérents.
6. **Publication** : seules les structures validées ; statut noté dans `AUTRES_MODULES.md` (« À vérifier » tant que la relecture n'est pas faite).

## 11. Méthode pour une nouvelle région ou une modification

1. Lire cette charte et la section Radioanatomie de `AUTRES_MODULES.md`.
2. Choisir le moteur (§ 2) : coupes → `atlas-coupes` ; cliché unique → `planche` ; volume isotrope à fenêtrer → `visionneuse`.
3. Écrire `preparer_<region>.py` et `construire_atlas_<region>.py` sur le modèle du genou ou du thorax ; données dans `donnees/<region>-<modalite>/` avec licence.
4. Faire valider la nomenclature, puis les repères, par l'auteur.
5. Page HTML copiée d'une page existante ; carte dans `radioanatomie/index.html` ; tests ; README + `AUTRES_MODULES.md` ; `?v=`.

## 12. Feuille de route (petites tâches indépendantes, par priorité) 🕓

Chaque tâche tient en une session : lire **cette charte**, puis seulement les fichiers cités. Aucune ne modifie un contenu anatomique ; toute donnée nouvelle reste « à valider par l'auteur ». Mettre à jour README et `AUTRES_MODULES.md` à la fin.

**Priorité 1 — rendre le moteur de coupes réutilisable (sans changer l'affichage actuel)**
1. **Paramétrer les textes en dur d'`atlas-coupes.js`** : le libellé du calque (`calque_nom` dans la série, « Lobes » par défaut) et la région affichée dans `ac-info` (champ `region` de l'atlas, « genou » par défaut pour le genou). Fichiers : `atlas-coupes.js`, `construire_atlas_genou.py`, `construire_atlas_thorax.py`, tests genou / thorax. Critère : pages genou et thorax identiques à l'œil.
2. **Plusieurs stations par page** : boucler sur `document.querySelectorAll('[data-atlas]')` (comme `planche.js`). Fichiers : `atlas-coupes.js`, test. Critère : une page de test locale avec deux atlas fonctionne ; pages existantes inchangées.
3. **Test de format commun des atlas** (`tests/radioanatomie-atlas-format.test.js`) : pour chaque `donnees/*/atlas.json`, champs obligatoires, `id` de repères existants, coordonnées dans l'image, nombre de listes `reperes` = `coupes`, fichiers d'images présents. Aucun fichier du site modifié.
4. **Test navigateur des trois moteurs** (Playwright, `tests/navigateur/radioanatomie.js`) à 360, 768 et 1280 px : chargement sans erreur console, changement de coupe, quiz, panneau des catégories.

**Priorité 2 — fonctions pédagogiques sur les données existantes**
5. **Recherche d'une structure** dans l'atlas de coupes : champ avec suggestions (noms de `structures`), saut à la coupe où la structure est la plus centrale dans la série choisie, épinglage. Fichiers : `atlas-coupes.js`, `atlas-coupes.css`, deux pages HTML (bloc `ac-barre`).
6. **Mode « trouver »** dans le quiz : un nom est proposé, l'élève touche le bon point ; score. Même fichiers.
7. **Lien profond** `#serie=&coupe=&structure=` lu au chargement et mis à jour (`history.replaceState`). Même fichiers.
8. **Mémoire du quiz** (structures trouvées, par atlas) en `localStorage` protégé par `try/catch`, bouton « Effacer ma progression ».
9. **Zoom et déplacement** dans l'atlas de coupes (pincer / Ctrl + molette), étiquettes recalculées ; le glisser vertical reste le défilement à zoom 1.

**Priorité 3 — précision des annotations**
10. **Origine des repères affichée** (`source` : référence / calculée / repère manuel) dans `ac-info` et en filtre facultatif ; ajouter le champ au genou (`repère manuel` partout). Aucune position modifiée.
11. **Contrôles d'invariants pour le genou** dans `construire_atlas_genou.py` (côtés cohérents avec `cote` et l'orientation, structures latérales / médiales du bon côté) écrits dans `validation.json` ; liste des contrôles proposée à l'auteur avant d'être rendue bloquante.
12. **Contours cliquables (étude)** : format proposé (polygone simplifié par coupe, ou PNG d'étiquettes indexées) et coût en poids, sur le thorax où les masques de référence existent ; document seulement, puis prototype après accord.

**Priorité 4 — volumes et 3D (après validation de l'IRM cérébrale)**
13. **Séparer le moteur de volume de `visionneuse.js`** (chargement, reconstruction des plans, fenêtrage, interactions) de la logique des territoires, sans changement visible ; prépare l'étape 6 de l'IRM cérébrale (charte de la visionneuse à présenter à l'auteur d'abord).
14. **3D en complément d'un atlas** : bouton « Voir en 3D » ouvrant la visionneuse three.js existante (`cours/visionneuse.js`) avec un modèle Z-Anatomy de la région, chargé au clic, mention « modèle schématique, non recalé sur l'examen » ; d'abord pour le genou si l'auteur juge que la 3D apporte (ligaments croisés, ménisques).
15. **Palette commune des catégories** entre atlas : tableau de propositions à soumettre à l'auteur (aucune couleur changée avant accord).

**Contenus (toujours avec l'auteur, jamais d'initiative)** : relecture des repères existants (genou 47, thorax 10, radios 32, cavum 13) ; IRM cérébrale étapes 4 à 7 ; nouvelles régions choisies par l'auteur.
