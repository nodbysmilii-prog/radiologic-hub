# Consignes pour Claude Code : section Pelvis

Ce dossier contient toute la section « Pelvis » de mon site, Radiologic Hub : 10 chapitres, 83 fiches, un sommaire et une page de sources. Il y a un fichier Markdown par page.

## Contenu du dossier

| Dossier | Chapitre | Fiches |
|---|---|---|
| `01-ovaire/` | Ovaire | 20 (+ `schema-demarche-masse.jsx`) |
| `02-endometriose/` | Endométriose | 11 |
| `03-trompe/` | Trompe | 8 |
| `04-endometre-col/` | Endomètre et col | 10 |
| `05-myometre/` | Myomètre | 9 |
| `06-vasculaire/` | Pathologie vasculaire | 5 |
| `07-malformations/` | Malformations | 7 |
| `08-trophoblaste/` | Maladie trophoblastique | 3 |
| `09-plancher-pelvien/` | Plancher pelvien | 7 |
| `10-carcinose/` | Carcinose péritonéale | 3 |

- `00-sommaire.md` : page d'accueil de la section, avec trois entrées : par organe, par situation clinique et par classification.
- Dans chaque dossier, `00-<chapitre>.md` est la page d'accueil du chapitre, et les fichiers `01`, `02`… sont les fiches, dans l'ordre de lecture.
- `01-ovaire/schema-demarche-masse.jsx` : schéma (arbre de décision IRM) de la fiche `08-demarche-masse-annexielle`. Convertis-le en SVG statique aux couleurs du site, sans changer aucun texte, et place-le à l'endroit de la ligne « *Schéma : …* » de la fiche.
- `99-sources.md` : références, sur une page `/pelvis/sources`.

## Mise en forme visuelle (important)

Les fiches Pelvis doivent avoir **exactement le même rendu que les fiches d'imagerie digestive déjà en ligne** (par exemple la fiche « Adénocarcinome du pancréas ») : mêmes composants, mêmes couleurs, même hiérarchie. Aucun texte n'est à modifier, seulement le rendu.

Le texte contient deux balises de mise en relief :
- `**mot clé**` : mot clé en **gras foncé**, comme dans les fiches digestives (« la plus fréquente », « chirurgie ») ;
- `==alerte==` : **badge surligné rouge**, comme « survie à 5 ans voisine de 5 % » dans la fiche pancréas. Il sert aux messages à ne pas rater (« jusqu'à preuve du contraire », « pathognomonique », « urgence chirurgicale », « ne jamais… »). Ajoute la prise en charge de cette syntaxe au moteur Markdown si elle manque (plugin `mark` ou équivalent), puis style-la en badge rouge.

Composants à appliquer à chaque fiche :
1. **« En bref »** : grande carte encadrée en haut de la fiche, avec la couleur d'accent du chapitre (comme la carte violette de la fiche pancréas).
2. **Titres de section** (`##`) : pastille ronde colorée, titre en majuscules et filet coloré dessous, comme « TERRAIN », « IMAGERIE », « MOYENS D'EXPLORATION ». Donne une couleur fixe par type de section, identique sur toutes les fiches :
   - Terrain, Définition, Clinique : bleu ;
   - Imagerie : bleu soutenu ;
   - Signes clés : vert, et la section s'affiche en carte mise en avant ;
   - Diagnostics différentiels : violet ;
   - Conduite à tenir : orange ;
   - Pièges : rouge, en encadré d'alerte avec une icône ⚠ ;
   - Dans le compte rendu : gris, en check-list (cases cochables visuellement).
3. **Sous-titres en gras seuls sur leur ligne** (par exemple « **Échographie** », « **IRM** », « **Rupture** ») : petits intertitres, comme « SIÈGE » dans la fiche pancréas.
4. **Encadrés `>`** (« Pour le radiologue », « À retenir ») : carte secondaire avec un fond légèrement teinté.
5. **Tableaux** : style des tableaux des fiches digestives. Première colonne en gras, lignes alternées, défilement horizontal sur mobile. Les pourcentages et les seuils restent en gras.
6. **Sommaire de page** : en haut de chaque fiche, une rangée de puces cliquables (Terrain, Imagerie, Signes clés…) qui renvoient aux sections. Sur mobile, elle reste collée sous l'en-tête pendant le défilement.
7. **Lisibilité** : largeur de texte confortable, espacement aéré entre les puces, taille de police identique aux fiches digestives.

Vérifie le rendu sur 3 fiches au moins (Torsion d'annexe, Grossesse extra-utérine, Adénocarcinome de l'endomètre) sur mobile et sur ordinateur, et compare-les côte à côte avec la fiche pancréas avant de me montrer le résultat.

## Travail demandé

Tu as toutes les autorisations pour ce travail. Travaille en autonomie jusqu'au bout, sur une branche git dédiée (`pelvis-fiches`), avec des commits clairs.

1. **Structure des URL** :
   - `/pelvis` pour le sommaire ;
   - `/pelvis/<chapitre>` pour la page du chapitre, avec la liste de ses fiches dans l'ordre ;
   - `/pelvis/<chapitre>/<fiche>` pour chaque fiche, le slug étant le nom du fichier sans le numéro.
2. **Liens internes** : dans le sommaire et dans les pages de chapitre, les noms de chapitres et de fiches sont écrits en texte simple. Transforme-les en liens vers les pages correspondantes. Quand une fiche cite une autre fiche (par exemple « voir la fiche Léiomyome utérin »), ajoute aussi le lien.
3. **Texte** : garde exactement le texte, les tableaux et la terminologie. Ne reformule rien, ne traduis rien, ne supprime rien. Les termes entre guillemets (« tubal ring sign », « flow voids », « scalloping », shading…) sont voulus.
4. **Mise en page** :
   - le paragraphe « En bref » s'affiche en encadré en haut de la fiche ;
   - les citations (`>`, par exemple « Pour le radiologue » ou « À retenir ») s'affichent en encadré secondaire ;
   - sur mobile, les tableaux défilent horizontalement.
5. **Navigation** :
   - fil d'Ariane (Pelvis > Chapitre > Fiche) ;
   - fiche précédente et suivante, dans l'ordre des fichiers ;
   - sur ordinateur, menu latéral avec les chapitres et leurs fiches ; sur mobile, menu repliable.
6. **Classifications** : la page `/pelvis/classifications` liste les classifications du tableau « Classifications » du sommaire, avec un lien vers la fiche correspondante. Elle est aussi accessible depuis la page des classifications existante du site, à côté de Bosniak, RECIST, etc.
7. **Recherche** : la recherche du site porte sur les titres et le contenu des fiches.
8. **Bas de chaque fiche** : un lien « Sources » vers `/pelvis/sources`.
9. **SEO** : titre et meta description pour chaque fiche. La description reprend la phrase « En bref ».
10. **Vérifications** :
    - le site compile ;
    - aucun lien n'est cassé ;
    - les tableaux et le schéma s'affichent correctement sur ordinateur et sur mobile ;
    - les 95 fichiers sont bien publiés.

**Ne déploie pas en production.** Pousse la branche, prépare une prévisualisation si le site le permet, puis donne-moi la liste de ce qui a été fait et le lien de prévisualisation. Je validerai avant la mise en ligne.
