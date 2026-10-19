# Rapport de validation — IRM cérébrale, audit contre les atlas de référence (19/10/2026)

Module audité : interface de validation privée de l'IRM cérébrale (studyforrest, sujet 01), exactement les données
que l'auteur voit (`etape5/donnees`). Demande de l'auteur : chaque structure affichée doit correspondre à un label d'au
moins un atlas de référence, être vérifiée dans les trois plans, porter sa convention de latéralité, et toute
discordance entre atlas doit être signalée plutôt qu'affichée comme certaine. Aucun label n'a été créé, déplacé ou
renommé par raisonnement : chaque correction ci-dessous s'appuie sur une table publiée ou sur une demande écrite de
l'auteur.

## 1. Sources et licences

| Ordre | Source | Version et accès | Licence | Usage |
|---|---|---|---|---|
| 1 | Template MNI-ICBM152 non linéaire 2009c, symétrique et asymétrique (Fonov et al. 2011) | TemplateFlow, identifiants de version S3 et sha256 figés (`audit_atlas.py`) | MNI : copie et modification permises avec la mention du copyright | recalage, coordonnées MNI |
| 2 | CerebrA (Manera et al., *Sci Data* 2020, doi:10.1038/s41597-020-0557-9), 102 labels sur le template 2009c symétrique | TemplateFlow (idem) | dérivé de Mindboggle-101, **CC BY-NC-SA 3.0** (Klein et Tourville 2012) : non commercial | **contrôle interne seulement**, rien n'est publié |
| 3 | Harvard-Oxford cortical latéralisé et sous-cortical, seuil 25 %, sur le template 2009c asymétrique | TemplateFlow (idem) ; noms des labels : table de TemplateFlow (MNI152NLin6Asym), complétée dans l'ordre de FSL et vérifiée (52 lignes conformes sur 52, centres des 44 autres contrôlés) | licence FSL, non commerciale | **contrôle interne seulement** (choix de l'auteur) |
| 4 | Liu et al., *Sci Data* 2023 (territoires artériels) | déjà en place (`preparer_territoires.py`) | CC BY-SA 4.0 | calque « Territoires vasculaires » |
| 5 | Tatu et al., *Neurology* 1998 (hémisphères, doi:10.1212/wnl.50.6.1699) et 1996 (tronc cérébral et cervelet, doi:10.1212/wnl.47.5.1125) | pas en accès libre (absents de PubMed Central) | — | **contrôle non fait** (voir § 7) |
| — | Klein et Tourville, *Front Neurosci* 2012 (protocole DKT, doi:10.3389/fnins.2012.00171) | texte intégral (PubMed Central) | CC BY | table des régions par lobe |

Réseau : TemplateFlow (S3) est joignable ; les sites du MNI, d'OSF, de FSL et de G-Node sont bloqués par la
politique réseau de l'environnement (la fiche G-Node de CerebrA n'a donc pas pu être lue).

## 2. Méthode

- **Recalage** (`audit_atlas.py`) : cerveau de chaque template recalé sur le cerveau du sujet (affine puis SyN,
  corrélation croisée, ANTs) ; corrélation des cerveaux après recalage : 0,975 (symétrique et asymétrique).
  Contrôle du sens de la transformation sujet → MNI : centres des thalamus et des putamens du sujet transformés à
  2,5 mm au plus des centres de CerebrA ; Dice thalamus 0,85–0,89, putamen 0,85–0,86.
- **Correspondances** (`audit_labels.py`, tables écrites et relisibles) : régions DKT → étiquette CerebrA de même
  identifiant FreeSurfer ; noyaux gris, ventricules, cervelet → nom CerebrA et Harvard-Oxford ; régions DKT →
  régions corticales de Harvard-Oxford (table de correspondance des nomenclatures, à relire) ; lobes → réunion des
  régions selon la table publiée (Klein et Tourville 2012).
- **Mesures** : Dice (même structure), part des voxels dans l'étiquette de l'atlas (structure partie d'une étiquette
  plus large), part du cortex dans les régions Harvard-Oxford correspondantes ; globalement et sur les coupes
  axiale, coronale et sagittale que l'interface ouvre pour la structure.
- **Seuils** : même structure 0,6 / 0,4 ; partie 0,8 / 0,6 ; cortex Harvard-Oxford 0,6 / 0,4 ; lobe entier 0,8 / 0,6
  (concordant / partiel ; en dessous : discordant). Un plan discordant ôte la certitude.
- **Confiance** : « élevée » = tous les atlas disponibles concordants et aucun plan discordant (seul niveau certain) ;
  « moyenne » = partiel quelque part ; « faible » = discordant ; « hors atlas » = aucune étiquette de CerebrA ni de
  Harvard-Oxford (la structure garde sa source et est marquée non confirmée) ; « à placer » = structure manuelle sans
  point. Latéralité : côté gauche à x MNI < 0, côté droit à x MNI > 0.
- **Convention d'affichage** : vue radiologique (droite du patient à gauche de l'écran en axial et en coronal, avant à
  gauche en sagittal), désormais écrite en toutes lettres sur chaque coupe de l'interface, en plus des lettres D/G.

## 3. Résultats (478 structures publiées)

| Catégorie | élevée | moyenne | faible | hors atlas | à placer |
|---|---|---|---|---|---|
| Régions | 10 | 5 | 0 | 0 | 6 |
| Gyri | 33 | 17 | 0 | 0 | 6 |
| Système limbique | 12 | 4 | 2 | 3 | 6 |
| Noyaux gris centraux et structures apparentées | 10 | 2 | 8 | 5 | 8 |
| Ventricules et citernes | 3 | 1 | 2 | 3 | 23 |
| Cervelet | 27 | 6 | 3 | 0 | 2 |
| Tronc cérébral | 2 | 0 | 1 | 5 | 40 |
| Voies optiques | 0 | 0 | 4 | 4 | 2 |
| Substance blanche | 2 | 0 | 0 | 68 | 16 |
| Sillons | 0 | 0 | 0 | 35 | 5 |
| Glandes | 0 | 0 | 0 | 4 | 1 |
| Méninges | 0 | 0 | 0 | 2 | 10 |
| Artères | 0 | 0 | 1 | 1 | 27 |
| Sinus veineux | 0 | 0 | 0 | 0 | 17 |
| Territoires vasculaires | 0 | 0 | 0 | 24 | 0 |
| **Total** | **99** | **35** | **21** | **154** | **169** |

Détail par structure : `tableau-labels.md` (et `.csv`), un fichier « source de vérité » par structure dans
`labels/` (nom français, nom anglais, côté, catégorie, source et identifiant, centre et trois coupes en coordonnées du
sujet et MNI, atlas et mesures par plan, latéralité, confiance, remarques). Latéralité : 1 écart (§ 5 J).

## 4. Erreurs corrigées par rapport au module de ce matin

1. **« Lobe limbique » faux** : il réunissait gyrus cingulaire, isthme, gyrus parahippocampique et cortex entorhinal
   (définition classique française, sans atlas de référence). Pour CerebrA, 22 % (gauche) et 26 % (droit) de son
   cortex étaient temporaux ; pour Harvard-Oxford, seulement 65 % et 67 % étaient cingulaires. Remplacé par le
   **« Cortex cingulaire »** du protocole DKT (Klein et Tourville 2012 : cingulaire antérieur rostral et caudal,
   postérieur, isthme). Après correction : 83 % et 89 % cingulaires pour Harvard-Oxford.
2. **« Lobe limbique » pas en place** : la règle de rattachement de la substance blanche lui donnait le cingulum et les
   radiations calleuses (47 et 36 ml). Le cortex cingulaire est désormais du **cortex seul** (14 et 11 ml) ; la
   substance blanche voisine revient au lobe le plus proche.
3. **Lobe temporal** : gyrus parahippocampique et cortex entorhinal rattachés au lobe temporal (face médiale), comme
   dans le protocole DKT, CerebrA et Harvard-Oxford (98 → 105 ml à gauche, 93 → 100 ml à droite).
4. **Diencéphale** : régions « Diencéphale droit / gauche » et étiquette « Diencéphale ventral » de FastSurfer
   retirées de l'affichage (demande de l'auteur) ; thalamus, V3, épiphyse, hypothalamus et corps mamillaires restent
   des structures à part.
5. **Tronc cérébral** : structure « Tronc cérébral » retirée (demande de l'auteur) ; mésencéphale, pont et bulbe en
   coupes axiales entières (première coupe du pont donnée par l'auteur, z = −19,5 mm ; sillon bulbo-pontique,
   z = −42,6 mm) ; retouches au pinceau de l'auteur intégrées aux données.
6. **Contour du tronc cérébral arrondi** (demande de l'auteur : « des traits qui ne contournent pas le tronc
   cérébral ») : traits de pinceau sagittaux du haut du mésencéphale (z −8 à 0 mm) et fines lignes de gomme retirés,
   bords lissés coupe par coupe (ouverture puis fermeture par un disque de 1,4 mm ; la fermeture n'ajoute que du
   tissu voisin, jamais de LCS ni de cervelet) : 2 792 voxels retirés, 285 ajoutés.
7. **Convention de latéralité** écrite sur chaque coupe (« Vue radiologique : droite du patient à gauche » ;
   « Sagittal : avant à gauche »).

## 5. Discordances signalées (non corrigées : structure non certaine)

- **A. Jonction temporo-occipitale (votre remarque « le lobe temporal déborde sur le lobe occipital »)** : pour
  Harvard-Oxford, 11 % (gauche) et 9 % (droit) du cortex du lobe temporal est occipital (gyrus fusiforme occipital,
  cortex occipital latéral inférieur), et 16 % et 20 % est « temporo-occipital » ; pour CerebrA (même protocole DKT
  que FastSurfer), 3 % seulement. Les deux atlas s'accordent sur 1,6 ml à gauche et 1,3 ml à droite, presque tout
  dans la partie postérieure du gyrus fusiforme (planches `discordance-temporo-occipitale-*.png`). Non corrigé :
  déplacer la limite demanderait d'utiliser Harvard-Oxford (licence non commerciale) ou votre tracé. Lobes temporaux :
  confiance moyenne.
- **B. Jonction pariéto-occipitale** : 26 % du cortex du lobe pariétal tombe dans le cortex occipital latéral supérieur
  de Harvard-Oxford ; CerebrA concorde avec le module. Lobes pariétaux : confiance moyenne.
- **C. Cortex cingulaire gauche** : presque deux fois plus grand que celui de CerebrA (29 % de son cortex frontal pour
  CerebrA), mais 83 % cingulaire ou paracingulaire pour Harvard-Oxford. Explication probable : sillon cingulaire
  dédoublé (paracingulaire) à gauche, que le protocole DKT inclut au cingulaire (Klein et Tourville 2012, figure 3).
  À vérifier sur l'image (planche `discordance-cingulaire-gauche.png`).
- **D. Chiasma optique (HypVINN)** : sans recouvrement avec l'étiquette « Optic Chiasm » de CerebrA, mais cette
  étiquette n'est pas fiable (ses auteurs donnent un kappa de 0,0 : « label presque inexistant et mal placé », refait
  avec les tractus ; ici centrée à ±6 mm de la ligne médiane, cinq fois plus grande). Non confirmé par un atlas ; à
  vérifier sur l'image.
- **E. Hypothalamus et corps mamillaires (HypVINN)** : CerebrA n'a pas d'hypothalamus ; leur part dans son
  « diencéphale ventral » ne va que de 6 à 53 %. Non confirmés par un atlas.
- **F. Mésencéphale** : 42 % dans le tronc cérébral de CerebrA, 48 % dans celui de Harvard-Oxford : vos contours et
  votre peinture (pédoncules cérébraux, haut du mésencéphale jusqu'à z = +0,1 mm) vont plus haut que ces deux atlas.
  Votre tracé est gardé, la structure est marquée non certaine.
- **G. Corne temporale du ventricule latéral** : Dice 0,15 avec CerebrA, dont l'étiquette est peu fiable (kappa 0,12).
- **H. Cervelet** : cortex laissé par CerebNet (morceaux hors lobules) à 42–47 % dans le cortex de CerebrA ; vermis VII
  à 52 % ; tonsilles, flocculus et vermis VIII partiels (70–79 %).
- **I. Noyaux accumbens** (Dice 0,47–0,60 avec les deux atlas) et **V3** (0,55) : partiels.
- **J. Latéralité** : votre point de l'artère cérébrale antérieure **gauche** (A1) est à x = +0,9 mm (MNI +0,7 mm),
  sur la ligne médiane, légèrement à droite : à replacer.

## 6. Structures hors atlas (154) et à placer (169)

Gardées et marquées « non confirmées » (votre choix), avec leur source : sillons (règle des limites DKT), faisceaux
(TractSeg), corps calleux et fornix (FastSurfer-CC), voies optiques autres que le chiasma, glandes, plexus choroïdes,
LCS des citernes, méninges, artères (TOF), territoires vasculaires (Liu 2023, calque à part). Les 169 structures
manuelles sans point restent « à placer ».

## 7. Territoires vasculaires

Calque indépendant de l'anatomie (vérifié par test : aucune structure anatomique dans ce calque, aucun territoire
ailleurs). Aucun territoire n'est déduit d'un lobe. Mais la couche en ligne n'est pas l'atlas de Liu 2023 brut : elle a
été redécoupée par des règles géométriques d'après la vidéo de référence de l'auteur (`preparer_territoires.py`) :
territoire profond de l'ACM limité au noyau lenticulaire et à une bande de 6 mm le long du ventricule ; ACP absente
au-dessus des ventricules latéraux (rayon croissant vers le bas) ; ACP étendue de 9 mm au plus sur la face inférieure
du lobe temporal ; choroïdienne antérieure étendue au bras postérieur de la capsule interne ; mésencéphale à l'ACP,
pont à la basilaire ; bulbe coupé en moitié antérieure (vertébrale et spinale antérieure) et postérieure (PICA) ; AICA
= bande de 8 mm de la face antérieure de l'hémisphère cérébelleux. Ces règles déduisent des limites de positions
anatomiques : à confronter à Tatu et al. 1998 et 1996, que je n'ai pas pu lire (pas en accès libre ; articles à
déposer dans le dépôt privé si vous voulez ce contrôle). La couche n'a pas été modifiée (elle est en ligne et validée) : décision à prendre.

## 8. Captures de contrôle

Une planche axiale / coronale / sagittale par groupe anatomique (14 groupes ayant des contours ; les sinus veineux
n'ont encore aucun point) et quatre planches de discordance, dans
`assets-sources/radioanatomie/irm-cerebrale/audit/captures/` (non versionné : elles montrent les contours de CerebrA et
de Harvard-Oxford, usage interne).

## 9. Build et tests

`npm test` (tous les tests du site, dont `tests/radioanatomie-irm-audit.test.js` : un fichier source de vérité par
structure publiée, champs obligatoires, latéralité en MNI, pas de diencéphale affiché, territoires dans leur calque,
aucune donnée d'atlas non commercial dans le dépôt).

## 10. Décisions attendues

1. Jonction temporo-occipitale (A) : garder la limite DKT signalée, ou tracer vous-même la limite (points sur la
   coupe), que j'appliquerai comme correction de l'auteur.
2. Cortex cingulaire gauche (C) et chiasma (D) : vérification visuelle.
3. Territoires (§ 7) : garder les règles géométriques de la vidéo, ou revenir aux étiquettes brutes de Liu 2023 ;
   fournir Tatu et al. 1998 et 1996 pour le contrôle clinique.
4. Point A1 gauche (J) à replacer.
5. Catégorie de navigation « Diencéphale » (thalamus, V3, épiphyse, hypothalamus, corps mamillaires) : à créer ou non.
