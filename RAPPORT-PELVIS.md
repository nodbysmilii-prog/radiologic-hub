# Rapport — section Pelvis, version complète

13 octobre 2026. Branche **`pelvis-fiches`**, poussée sur GitHub. **Rien n'est en production** : la branche du site en ligne n'a pas été touchée.

## En bref

- **95 fichiers publiés** : 83 fiches, 10 pages de chapitre, le sommaire et les sources, plus la page Classifications (96 pages).
- **Texte inchangé**. Un test compare chaque page au Markdown mot pour mot. Un autre vérifie que chaque `**mot clé**` et chaque `==alerte==` du texte devient exactement un mot en gras ou un badge rouge.
- **Même rendu que les fiches digestives** (fiche pancréas) : mêmes composants de `fiche.css`, pas de nouveau style de base.
- **Vérifications au vert** :
  - 194 tests sur 194 ;
  - aucun lien interne cassé sur les 140 pages du site ;
  - parcours complet dans Chromium à 1366 px et à 390 px.

## Rendu des fiches

| Élément du Markdown | Rendu (composant des fiches rapides) |
|---|---|
| `**mot clé**` | gras foncé (`<b>`), comme « la plus fréquente » |
| `==alerte==` | badge rouge (`mark.k-grave`), comme « survie à 5 ans voisine de 5 % » ; syntaxe ajoutée au moteur |
| `***…***` | gras italique ; ajouté, car présent dans la fiche Infection génitale haute |
| « **En bref** : … » | grande carte en haut de la fiche, à la couleur du chapitre |
| `## Section` | pastille ronde (chiffre romain, ⚠ pour Pièges), majuscules, filet coloré |
| ligne entièrement en gras (« **Échographie** », « **IRM** »…) | intertitre comme « SIÈGE » (`.siege-title`) |
| `>` (« Pour le radiologue », « À retenir ») | encadré `.callout` à fond teinté |
| tableaux | `.ftable` : 1re colonne en gras, lignes alternées, défilement horizontal sur téléphone |

**Une couleur fixe par type de section, sur toutes les fiches** :

| Section | Couleur et rendu |
|---|---|
| Terrain / Définition / Clinique / Contexte | bleu |
| Imagerie | bleu soutenu |
| Signes clés | vert, en carte mise en avant |
| Diagnostics différentiels | violet |
| Conduite à tenir | orange |
| Pièges | rouge, en carte d'alerte avec ⚠ |
| Dans le compte rendu | gris, en check-list cochable (mémorisée dans le navigateur) |
| Autres sections | couleur du chapitre |

**Rangée de puces vers les sections** en haut de chaque fiche. Sur téléphone, elle reste collée sous l'en-tête pendant le défilement, et la puce de la section lue est surlignée et ramenée à l'écran.

J'ai comparé côte à côte avec la fiche pancréas, sur téléphone et sur ordinateur, les trois fiches demandées : Torsion d'annexe, Grossesse extra-utérine et Adénocarcinome de l'endomètre.

## Structure et navigation

- **Adresses** :
  - `/pelvis` pour le sommaire ;
  - `/pelvis/<chapitre>` pour chaque chapitre : `ovaire`, `endometriose`, `trompe`, `endometre-col`, `myometre`, `vasculaire`, `malformations`, `trophoblaste`, `plancher-pelvien`, `carcinose` ;
  - `/pelvis/<chapitre>/<fiche>` pour chaque fiche, avec le nom de fichier sans numéro ;
  - `/pelvis/classifications` et `/pelvis/sources`.
- **Fil d'Ariane** : Pelvis › Chapitre › Fiche.
- **Fiche précédente / suivante** dans l'ordre des fichiers ; on passe d'un chapitre au suivant.
- **Menus** :
  - sur ordinateur, menu latéral des 10 chapitres, avec les fiches du chapitre en cours dépliées ;
  - sur téléphone, menu repliable « Chapitres et fiches · Rechercher ».
- **En bas de chaque fiche** : lien « Sources ».
- **Référencement** : titre et meta description propres à chaque fiche ; la description est la phrase « En bref ».
- **Liens ajoutés** :
  - dans le sommaire : les 10 chapitres, les noms de fiches des situations cliniques (31 liens) et la colonne « Fiche » des classifications ;
  - dans les pages de chapitre : chaque nom de fiche ;
  - dans les fiches : les deux renvois du texte (« voir la fiche Léiomyome utérin », « (fiche Repères) »).
- **Classifications** : la page reprend le tableau du sommaire, chaque ligne liée à sa fiche, puis les autres classifications du site (Bosniak, RECIST / Lugano, scores des comptes rendus). On y accède aussi depuis la rangée d'outils des comptes rendus, à côté de Bosniak et du suivi oncologique (RECIST).
- **Recherche** dans les titres et le contenu des 83 fiches :
  - elle ignore les accents ;
  - chaque résultat indique le chapitre et la section, avec un extrait où les mots sont surlignés ;
  - l'index (environ 0,3 Mo) ne se charge qu'à la première recherche.
- **Schéma de la fiche 08** : converti en SVG statique, placé à l'endroit de la ligne « *Schéma : …* », avec les textes identiques au JSX.

## Décisions prises

1. **Correspondance des noms du sommaire** : certains noms du sommaire diffèrent du titre de la fiche. Je les ai reliés ainsi — **à vérifier** :

   | Nom dans le sommaire | Fiche liée |
   |---|---|
   | « Infection génitale haute et salpingite » | Infection génitale haute et salpingite aiguë |
   | « Saignements après la ménopause » | Saignements après la ménopause : démarche |
   | « Hypertrophie endométriale » | Hypertrophie endométriale d'allure bénigne |
   | « Malformation artério-veineuse » | Malformation artério-veineuse utérine |
   | « Faux anévrisme » | Faux anévrisme de l'artère utérine |
   | « Généralités et stratégie (endométriose) » | Endométriose : généralités et stratégie diagnostique |
   | « Repères et grades » et « (fiche Repères) » | Repères et grades de sévérité |

2. **« Page des classifications existante du site »** : le site n'a pas de page dédiée. La rangée d'outils des comptes rendus est le seul endroit qui réunit Bosniak et RECIST : j'y ai ajouté l'accès Pelvis.
3. **« Recherche du site »** : le site n'a pas de recherche générale. La recherche porte donc sur les 83 fiches Pelvis. Elle est disponible dans le sommaire, les pages de chapitre, la page Classifications et le menu de chaque fiche.
4. **Ajouts d'interface, sans texte médical** :
   - le filet sous les titres, la carte verte de « Signes clés », la rangée de puces collée sur téléphone et les lignes alternées des tableaux, demandés par vos consignes ;
   - les boutons du haut de fiche (Imprimer / PDF, Dans le compte rendu, Sources) ;
   - les textes d'interface : « Faites glisser le tableau », « Tout décocher », « Classifications de la section Pelvis », « Autres classifications du site ».
5. **Menu principal** : toujours pas d'entrée « Pelvis », car le menu déborderait. La section reste rattachée à Fiches rapides, avec une carte « Pelvis : 10 chapitres, 83 fiches » dans l'onglet Imagerie de la femme.
6. **Chapitres 06 à 10** : leurs pages n'ont pas de sous-titres, la liste des fiches suit directement l'introduction. Elle est affichée dans une carte, sans titre ajouté.

## Problèmes restants

- Aucune anomalie dans les fichiers : la cellule manquante de la fiche 11, signalée dans la version précédente, est corrigée dans ce zip.
- Les correspondances de noms ci-dessus sont à confirmer.
- La redirection `/pelvis` → `/pelvis/` est faite par GitHub Pages. Elle n'est pas reproductible dans le navigateur de test ; les adresses avec la barre finale ont été vérifiées.

## Voir le résultat

- **Prévisualisation**, servie directement depuis la branche sur GitHub :
  https://raw.githack.com/nodbysmilii-prog/radiologic-hub/pelvis-fiches/pelvis/index.html
  - Les liens fonctionnent. Les adresses sans `.html` ne marchent qu'une fois le site en ligne.
- **En local** :

  ```
  git fetch origin pelvis-fiches && git checkout pelvis-fiches
  npm run build      # régénère les pages (déjà à jour)
  npm test           # 194 tests
  npm run liens      # liens internes du site
  python3 -m http.server 8000
  ```

  Ouvrir ensuite http://localhost:8000/pelvis/index.html.

## Mise en ligne, après validation

Fusionner `pelvis-fiches` dans la branche en ligne, toujours sans le cours d'échoanatomie : son retrait est déjà dans la branche en ligne. Vérifier ensuite `npm test` et `npm run liens`, pousser, puis contrôler la publication GitHub Pages.
