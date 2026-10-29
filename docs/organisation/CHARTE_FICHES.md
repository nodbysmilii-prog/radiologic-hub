# Charte de conception des fiches rapides

> Méthode pédagogique et interactive de RadiologicHub. À consulter **avant toute création ou modification importante de fiche**.
> Établie à partir de sept fiches représentatives : **Colites** (3D, quiz, règles), **IRM des myocardites** (calculateur, mnémotechnique), **Myome utérin** (arbre décisionnel, planche FIGO), **Spondylodiscite** (tableau comparatif, quiz), **Occlusion intestinale aiguë** (questions-guides, panneaux, seuils), **Ischémie mésentérique** (signes dessinés, curseur, atelier) et **Fractures de l'extrémité distale du radius** (3D des mesures, réglette, vérification de seuils). Les exemples ci-dessous viennent du code existant ; les fichiers cités sont à ouvrir au besoin, pas à relire en entier.

## 0. Principe directeur

Une fiche n'est pas un cours en HTML. Elle est **synthétique** (consultable en quelques minutes), **visuelle**, **interactive quand cela aide à comprendre**, et **médicalement rigoureuse**.

- **Le fond médical vient de l'auteur** (cours, sources validées). On ne l'invente jamais ; on ne le modifie pas sans validation. Un point douteux ou manquant devient une question posée à l'auteur, pas une phrase plausible.
- L'interactivité sert la compréhension. Si un tableau ou un schéma fixe suffit, ne pas ajouter de widget.
- Pas de surcharge graphique : un seul code visuel par idée, des couleurs qui ont un sens (voir §2).

## 1. Squelette d'une fiche (réutilisable partout)

Fichier `fiches/<nom>.html`, pages en français, modèle commun :

| Bloc | Classes / mécanisme | Exemple |
|---|---|---|
| Barre de lecture | `.read-progress` (largeur liée au scroll, `fiche.js`) | toutes les fiches |
| En-tête | `.fiche-hero`, fil d'Ariane `.crumbs`, `.marker-tag` (« Fiche rapide · Spécialité »), `h1` avec `.hl-*`, `.fiche-sub` | `colites.html` |
| Légende interactive | `.legend` + boutons `.chip.k-*[data-k]` : un clic isole une catégorie, les autres s'estompent (`.fiche-body[data-focus]`) | `irm-myocardite.html` |
| Sommaire | `.toc` ; le lien de la section visible est surligné (`IntersectionObserver`) | `irm-myocardite.html` |
| Encadré d'objectifs | `.callout` avec les `mark.k-*` | `irm-myocardite.html` |
| Sections | `section.fsec#id` avec `style="--c: var(--couleur)"`, titre `h2.fsec-title > span.fnum` (chiffre romain, `?` pour « Testez-vous », `·` pour un ajout), intro courte `.fintro` | toutes |
| Pied de section pédagogique | « Testez-vous », cartes à retourner, « Take home message », « Éléments à préciser au compte rendu » | `irm-myocardite.html` |
| Source | `p.md-source` : « D'après le cours de l'auteur… » + crédits des modèles ou images tiers | `colites.html` |

Ordre type des sections (myocardite) : Introduction → clinique → indications → protocole → signes → classification/critères → aspects en images → pièges → take home → éléments du compte rendu → Testez-vous. Colites et Myome adaptent cet ordre au sujet ; on ne force pas le plan.

## 2. Code couleur `k-*` (invariable)

Défini en tête de `fiche.css`, repris dans le README (« Code couleur ») :

| Classe | Sens |
|---|---|
| `k-tech` (bleu) | Technique / séquence |
| `k-sign` (vert) | Signe discriminant / typique |
| `k-grave` (rouge) | Gravité / pronostic / non-résécabilité |
| `k-ddx` (violet) | Piège / diagnostic différentiel |
| `k-key` (ambre) | À retenir |
| `k-signo` (orange) | Signe radiologique |

Règles : `<mark class="k-…">` sur quelques mots, jamais sur une phrase entière ; ne pas détourner le sens d'une couleur ; les couleurs d'une section (`--c`) ne remplacent pas ce code. Polices de la charte : Montserrat, Permanent Marker (étiquettes manuscrites), Michroma. Après toute modif de `fiche.css` / `fiche.js` : changer les `?v=` dans les pages HTML (consigne `CLAUDE.md`).

## 3. Composants pédagogiques (bonnes pratiques réutilisables)

Tous sont câblés par `fiche.js` **par classe ou attribut `data-*`** : on réutilise le balisage, on n'écrit pas de JS nouveau pour un besoin déjà couvert.

1. **Cartes à retourner** `.flip` (question au recto, réponse au verso, `aria-pressed`) : révision active, regroupées en `.flash` (`colites.html`, « Take home » de la myocardite).
2. **Onglets** `.t-btn[data-t]` / `.t-panel[data-t]` : plusieurs cas parallèles (stades, types) sans allonger la page ; le myome en compte beaucoup (retour à la ligne sur petit écran).
3. **Tableau comparatif** `.ftable-wrap > table.ftable`, avec sélecteur `.cmp-switch[aria-controls]` qui met une colonne en avant (`table.dataset.show`) : `spondylodiscite.html` (germes). À préférer à un long paragraphe dès qu'il y a ≥ 3 entités à comparer.
4. **Quiz à choix** `.germ-quiz` / `.gq-item[data-answer]` avec boutons `[data-pick]`, retour immédiat `.gq-fb`, score cumulé : `spondylodiscite.html`. Variante « entraînement » générée en JS (`ti-cas`, `ti-score`, bouton « Recommencer ») : `colites.html`.
5. **Arbre décisionnel dessiné** `[data-dtree]` : nœuds `.dt-n`, conditions `.dt-cond`, feuilles `.dt-leaf` ; au survol le chemin depuis la racine reste net, un diagnostic renvoie vers la section (et ouvre l'onglet voulu via `a[data-tab]`) ; vertical indenté sur petit écran : `myome-uterin.html`. Pour tout algorithme du type « signal T2 → rehaussement → ADC ».
6. **Calculateur / outil** quand une classification a des critères cumulatifs : Lake Louise `[data-lake-louise]` (cases groupées Trempé/Touché/Soutien, résultat + conclusion prête pour le compte rendu) ; jauge d'épaisseur pariétale, dose de contraste dans `colites`. L'outil reprend la règle de l'auteur et produit un texte réutilisable au CR.
7. **Schéma ou visionneuse interactive** uniquement s'il montre quelque chose qu'une image fixe ne montre pas (la localisation d'une atteinte, les couches d'une paroi, une classification spatiale) :
   - 3D (Three.js, `vendor/`) : côlon et paroi colique (`fiches/digestif/colon-3d.js`), rocher, médiastin, cavum. Boutons `.c3d-voie` d'« atteinte » qui allument les segments concernés, boutons « voir en 3D » dans le texte qui pilotent la visionneuse. Chargement **paresseux** (à l'arrivée à l'écran sur ordinateur, au clic sur téléphone).
   - SVG générés (`schemas/*.js` : cœur, prostate, utérus/FIGO) légendés, avec disposition compacte + liste sous 600 px.
8. **Images d'exemple** : `.ex-gallery > figure.ex-fig` avec bouton `.ex-img`, agrandissement en lightbox (`<dialog id="lightbox">`), légende `figcaption`, `alt` descriptif, `loading="lazy"`. **Une image absente disparaît seule** (`error` → `fig.hidden`) au lieu d'afficher un cadre cassé. Les annotations se superposent en `.annot` (SVG), jamais gravées dans l'image. Crédits `.ti-credit` / `.md-source`.
9. **Annexe repliable** `.annex-toggle[aria-controls]` + panneau `hidden` (images chargées à l'ouverture, ouverture automatique via `#annexe`) ; **carrousel** pour les cas annotés.
10. **Checklist de compte rendu** `.checklist` mémorisée en `localStorage` (clé par page, `try/catch`) : éléments à préciser au CR.
11. **Animations utiles seulement** : barres « siège » qui se remplissent à l'apparition (`.bar` + `IntersectionObserver`), retournement des cartes, mise en avant d'une colonne. Aucune animation décorative. Respecter `prefers-reduced-motion` (JS des visionneuses : `doux()` dans `colites-fiche.js`) et prévoir l'impression (`@media print` dans `fiche.css`).
12. **Mnémotechniques maison** assumés quand ils aident (myocardite : « Trempé / Touché », « les 2 P » ; « festin de pâtes » pour Wanibuchi). Le trait d'humour ne doit jamais remplacer le terme médical exact, qui figure à côté.

13. **Questions-guides qui ouvrent les parties** (occlusion : « les 5 questions du radiologue ») : une liste `ol#oi-questions` générée depuis `R.QUESTIONS` (`regles/occlusion-intestinale.js`), chaque question est un lien coloré vers sa section (défilement doux, flash `.oi-flash` sur la cible, URL mise à jour). Modèle pour toute fiche qui suit un raisonnement du radiologue (positif → mécanisme → topographie → gravité → étiologie) ; le plan de la fiche reprend alors ces questions.
14. **Panneaux groupés** `.oi-panneau[data-panneau][data-groupe]` + boutons de groupe : un seul panneau visible par groupe (conséquences, obstructions intraluminales, formes du volvulus). Réutilisable à la place d'un long texte quand plusieurs entités se comparent au même niveau.
15. **Curseur qui fait varier le schéma et la conclusion** : `input[type=range]` + `output` (ischémie : distance à l'ostium de l'AMS → `R.orientationOcclusion(cm)` ; occlusion : poids → dose de contraste ; poignet : réglette de bascule du fragment distal). Le dessin SVG est régénéré, un verdict coloré `.ch-verdict` (fonction `verdict(el, titre, niveau, texte)`, niveau = classe `k-*`) donne l'interprétation. Le calcul vient toujours de `regles/`, jamais écrit dans le JS d'affichage.
16. **Atelier « un signe → dessin + texte + valeur pronostique »** (ischémie, `[data-paroi]`) : boutons-onglets (`aria-selected`) qui affichent le schéma du signe de paroi, le texte de la fiche et un badge de pronostic `.im-prono.is-*`. Pour toute sémiologie où chaque signe doit être **vu**, pas seulement lu. Les signes sont des `figure.np-fig[data-ima]` dessinés par `ima-svg.js` (SVG propres au site), et les comparaisons « sans / avec injection » s'affichent en paire `.im-paire`.
17. **Vérifier un cas** (`form.p-calc`, poignet ; grilles à cocher de l'occlusion pour l'anse fermée et la gravité) : l'utilisateur saisit des mesures, la fiche répond critère par critère (`is-ok` / `is-depasse`, seuil entre parenthèses, `aria-live="polite"`) puis donne une conclusion. Les champs peuvent rester vides (« facultatif ») sans erreur.
18. **Mesures et repères sur 3D + clichés** (poignet) : barre de boutons `data-mesure` (`aria-pressed`) qui allume mesure ou repère sur la vue 3D, mêmes boutons repris sous forme de liens dans le texte ; sur les clichés, bouton **« Masquer / Afficher les tracés »** pour comparer l'image brute et l'image annotée (le tracé reste une surcouche). Bon modèle pour toute fiche de mesures.
19. **Tableau de seuils + note de contexte** (`table.ftable`, colonnes Mesure / Normale / Seuil, seuil en `mark.k-key`) suivi d'une note `.p-note` qui donne la source et le contexte d'application (ex. seuils AAOS, patient < 65 ans). Toute valeur seuil porte sa source.
20. **Numérotation des sections** : sections numérotées en chiffres romains pour les parties du raisonnement, `·` pour les rappels ajoutés (introduction, physiopathologie, 3D de rappel), `?` pour « Testez-vous » (occlusion, ischémie, poignet).

## 4. Architecture du code d'une fiche

Séparer **règles**, **présentation** et **câblage** :

- `regles/<fiche>.js` : données et calculs médicaux (seuils, classifications, atteintes, cas du quiz). Module UMD **sans dépendance au navigateur**, exposé en `window.RHRegles.<fiche>`. C'est là que vit le fond médical, relisible d'un coup (ex. `regles/colites.js` commente ses seuils : paroi > 4 mm, caecum 6-8 cm…).
- `tests/<fiche>.test.js` (`node:test`) : une règle = un test (`colites`, `myocardite`, `myome`…). Toute modification de seuil ou de classification s'accompagne de son test.
- `schemas/<fiche>.css` (+ `schemas/*.js` pour des dessins SVG) : styles propres à la fiche, **préfixés** (`cl-`, `ti-`, `md-`, `myo-`) pour ne pas entrer en conflit.
- `fiches/<spécialité>/<fiche>-fiche.js` : interactions propres à la fiche (3D, quiz généré). Module ES si la fiche charge de la 3D (`colites-fiche.js`, `poignet-fiche.js`), IIFE sinon (`oia-fiche.js`, `ima-fiche.js`), qui s'arrête proprement si `window.RHRegles.<fiche>` est absent. L'en-tête du fichier liste ce qu'il fait, bloc par bloc (`/* ---------- Titre ---------- */`).
- Dessins SVG spécifiques : `fiches/<spécialité>/*-svg.js` ou `schemas.js` (`ima-svg.js` → `RHIschemie`, `poignet/schemas.js` → `RHPoignet`), appelés depuis le JS de la fiche avec les paramètres issus de `regles/`.
- `fiche.css` / `fiche.js` : seulement ce qui sert à **plusieurs** fiches. Une particularité d'une seule fiche ne va pas dans le commun.
- Images : `assets/fiches/<fiche>/` ou `fiches/<fiche>/images/`.

## 5. Bonnes pratiques vs particularités

**Réutilisable (à appliquer par défaut)** : squelette §1, code `k-*`, `.flip`, onglets, tableau comparatif, quiz « Testez-vous », « Take home message », checklist du compte rendu, galerie avec lightbox, séparation règles/tests, `?v=`, mobile (`@media` 1000/760/520 px) et impression.

**Particulier à une fiche (ne pas généraliser)** : valvule de Bauhin continente / non continente (occlusion), axe de l'AMS et atelier de la paroi (ischémie), bascule du fragment distal et seuils AAOS (radius), feu tricolore de résécabilité (cavum/pancréas), arbre dessiné du myome, planche FIGO, calculateur Lake Louise, vues 3D (nécessitent un modèle sous licence compatible, voir README / `assets-sources/`), « festin de pâtes » (Wanibuchi). On les imite en esprit quand le sujet s'y prête (un algorithme → arbre ; des critères cumulatifs → calculateur), on ne les plaque pas.

## 6. Rigueur médicale (non négociable)

1. Le contenu provient du cours ou des sources de l'auteur ; **rien n'est ajouté « de mémoire »**. Les sources de cours vont dans le dépôt privé `radiologic-hub-sources`, jamais dans ce dépôt ; on y reformule.
2. Une valeur chiffrée (seuil, dose, taille) n'apparaît qu'avec sa source et son test dans `regles/`.
3. Image, légende ou nomenclature douteuse → on le signale dans « À vérifier » de `docs/organisation/FICHES.md`, on ne tranche pas seul.
4. Simplifier = raccourcir, pas changer le sens. Pas de reformulation qui modifie une nuance (« fréquent » ≠ « typique »).
5. Un schéma est annoncé comme schématique quand il l'est (« proportions schématiques »).
6. Mentionner les crédits des modèles 3D et images tiers (licence, lien).

## 7. Avant de livrer une fiche (liste de contrôle courte)

- [ ] Plan clair, sommaire, sections numérotées, `k-*` utilisé avec parcimonie.
- [ ] Chaque interaction apporte quelque chose ; sinon la retirer.
- [ ] Lisible sur téléphone et à l'impression ; accessible (`aria-*`, `alt`, clavier sur les boutons).
- [ ] Règles dans `regles/`, tests passants (`node --test tests/<fiche>.test.js`).
- [ ] `?v=` mis à jour, `README.md` (historique, date, « Fiches disponibles »), `fiches-rapides.html` (carte de l'index) et `docs/organisation/FICHES.md` mis à jour dans le même commit.
- [ ] Points médicaux douteux listés pour l'auteur.
