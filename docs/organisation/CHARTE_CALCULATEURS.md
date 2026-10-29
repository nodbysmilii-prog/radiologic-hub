# Charte de conception des calculateurs et classifications

> Méthode de RadiologicHub pour les calculateurs, scores et classifications radiologiques. À consulter **avant toute modification importante** d'un calculateur ou d'une classification.
> Établie le 29/10/2026 **à partir du code existant** : elle décrit ce qui est, sans inventer d'architecture. Elle complète `CHARTE_COMPTES_RENDUS.md` (éditeur, modèles, « en vrac », export) et `CHARTE_FICHES.md` (fiches). Suivi d'avancement : `CALCULATEURS.md`.
> Outils lus pour cette charte : **EU-TIRADS** (`regles/eu-tirads.js`), **Fleischner 2017** (`regles/fleischner.js`), **Qanadli** (`regles/qanadli.js`), **classifications déclaratives** (`regles/classifications.js`, dont le wash-out surrénalien), et le montage dans `cr-tools.js`. Les autres outils suivent le même schéma ; vérifier dans leur fichier avant d'affirmer quoi que ce soit.

Légende : ✅ présent dans le code · 🕓 prévu / à développer.

## 0. Principes

1. **Fidélité à la référence.** Un seuil, un grade, une conduite viennent de la publication citée, pas de la mémoire. Tout changement du fond médical (seuil, catégorie, texte de conduite) exige la **validation de l'auteur** ; un doute devient une question, pas une valeur plausible.
2. **Aucun score ni diagnostic inventé.** Données insuffisantes → pas de résultat chiffré : message d'attente (« À compléter », « Précisez l'échogénicité… ») et texte inséré vide.
3. **Calcul pur et vérifiable** : les formules vivent dans un module sans navigateur, testé sous Node ; l'interface ne calcule rien d'autre.
4. **Le radiologue décide.** L'outil propose un texte et une conclusion ; l'utilisateur les relit dans l'éditeur. Les conduites à tenir sont des recommandations citées, jamais des ordres.
5. **Tout reste dans le navigateur** (aucun envoi de données).

## 1. Ce qui existe ✅

**Registre des outils du compte rendu** (`TOOLS` dans `cr-tools.js`) :
- Outils « sur mesure » avec schéma SVG : PI-RADS v2.1, BI-RADS, EU-TIRADS, Fleischner 2017, FIGO (myomes), CAD-RADS 2.0 (+ score calcique, dominance, pontages), Qanadli, RECIST 1.1, Lugano 2014, OsteoGamme, Bosniak.
- **21 classifications déclaratives** (`regles/classifications.js`, `DEFS`) : O-RADS US v2022 et IRM, LI-RADS v2018, Fisher modifié, Fazekas, Scheltens, AO Spine (+ TL AOSIS), Kellgren-Lawrence, ARCO 2019, hanche (angle alpha, couverture), Garden, Pauwels, Neer, Schatzker, Salter-Harris, Balthazar / CTSI, Hinchey modifié, Parks, St James's, AAST 2018, iRECIST, wash-out surrénalien.
- Autres règles dans `regles/` (pancréatite, occlusion, ischémie mésentérique, colites, cholestéatome, otospongiose, McDonald, TNM cavum, Lake Louise, nodule pulmonaire, radius distal, médiastin…) rattachées aux **fiches rapides** : ne pas les dire disponibles dans l'éditeur sans vérifier `cr-tools.js`.
- Pages autonomes : `outils/` (OsteoGamme, Bosniak), `suivi/` + `suivi-oncologique.html` (RECIST / Lugano).

## 2. Anatomie d'un module de règles (`regles/<nom>.js`) ✅

1. **En-tête de commentaire** : outil, version de la classification, **référence complète** (auteurs, revue, année, volume:pages, DOI), principe de calcul, fonctions exposées, entrée attendue. Mention **« À FAIRE VÉRIFIER MÉDICALEMENT »** tant que l'auteur n'a pas validé.
2. **Enveloppe universelle** : `(function (root, factory) { … module.exports = api | root.RHRegles.<nom> = api })(…)`, `'use strict'`. Aucune dépendance au navigateur.
3. **Constantes nommées et gelées** en tête : `SEUILS` (`Object.freeze` dans Fleischner), `CATEGORIES` (nom, risque, couleur), tables de libellés. Pas de nombre magique dans les fonctions.
4. **Fonctions pures** sur un objet d'entrée simple : `classer(n)`, `signesForts(n)`, `cytoponction(c, taille)`, `surveillance(...)` (EU-TIRADS) ; `evaluer(entree)` → score, index, niveau (Qanadli) ; `description`, `conclusion`, `texte` pour la rédaction.
5. **`integrer(texteCR, entrée)`** quand l'outil réécrit une rubrique du compte rendu type (Qanadli, BI-RADS, PI-RADS, Bosniak) — voir §5.
6. **Valeurs de retour explicites** : `{ categorie, raison }`, `{ indication: true|false|null, texte }`. `null` = information manquante.

### 2.1 Classifications déclaratives (`DEFS`) ✅

Chaque classification est un objet `{ id, groupe, titre, chip, sub, cles, suggere, aide, init(), champs(st), calcul(st) }` :
- `champs(st)` → liste `{ f, label, type: 'sel'|'num'|'chk', options, large }` ; le formulaire est généré automatiquement ;
- `calcul(st)` → `{ badge, niveau: 'ok'|'bas'|'moyen'|'haut'|'neutre', texte, conclusion }` ;
- assistant `grades(def)` pour les classifications « choisir un grade » `[valeur, libellé, description, niveau]` ;
- état vide → `vide()` : badge « À compléter », `texte` et `conclusion` **vides**.

Ajouter une classification = ajouter une entrée dans `DEFS` ; `cr-tools.js` la monte seule (formulaire, badge, aperçu, mot-clé `cles`, suggestion `suggere`).

## 3. Critères présents, absents, non évaluables

État réel du code :
- ✅ **Champ vide = non renseigné** : option `—` des listes, champ numérique vide, case décochée. Le calcul distingue le vide du zéro (`num()` renvoie `null`) et renvoie « à compléter » plutôt qu'un score.
- ✅ **Absent** : case décochée ou valeur « absent » explicite selon l'outil (ex. EU-TIRADS : microcalcifications `micro: bool`).
- ✅ **Non évaluable** : modalité dédiée quand la référence la prévoit — CAD-RADS segment non analysable `N`, ischémie « non évaluée » (`''`), risque Fleischner « non précisé » (les deux conduites si elles diffèrent), temps portal/tardif manquants du wash-out (« Temps portal et tardif ? »).
- 🕓 **Pas de convention uniforme à trois états** (présent / absent / non évaluable) pour toutes les cases : une case décochée vaut « absent » ou « non renseigné » selon l'outil. Ne pas en généraliser une sans demande de l'auteur ; lors de l'ajout d'un outil, ajouter une option « non évaluable » seulement si la classification de référence la prévoit.

## 4. Interface ✅

- **Fenêtre unique** `#tool-dialog` : titre, aide (`hint`/`aide`), schéma SVG (si l'outil en a un), formulaire, **badge de résultat**, **aperçu du texte** mis à jour à chaque saisie (`live()`), avertissements `warn(st)`.
- **Composants de formulaire réutilisables** (`cr-tools.js`) : `sel`, `inp`, `chk`, `badge`, `tabs` (lésions multiples avec « + Ajouter » / « Supprimer »), `svgWrap`, `txt`, `pin` ; données dans `data-f="chemin.du.champ"` (`setPath`). Couleurs de niveau : `NIVEAU` (`ok` vert, `bas` ambre, `moyen` orange, `haut` rouge, `neutre` gris).
- **Rapidité** : mots-clés qui ouvrent l'outil depuis l'éditeur (`cles`), **suggestion automatique** (`suggere`, motif testé sur le compte rendu hors phrases normales « Absence de… »), groupes dépliables (état mémorisé en `localStorage`), mesures en `num` avec virgule décimale acceptée.
- **Conservation des saisies** : ✅ l'état de chaque outil est gardé en mémoire (`states[outil]`) tant que la page reste ouverte ; rouvrir l'outil le retrouve rempli, fermer la fenêtre ne l'efface pas. 🕓 Il n'est **pas** enregistré d'une visite à l'autre (rechargement = état vide).
- Le focus et la position du curseur sont conservés quand le formulaire est redessiné.

## 5. Intégration au compte rendu ✅

Deux modes, choisis par l'outil (`integrate` présent ou non) :
1. **`RHEditor.insert(texte)`** : résultat + « Conclusion proposée » insérés au curseur (classifications déclaratives, la plupart des outils).
2. **`RHEditor.integrer(texte, message)`** : l'outil réécrit les lignes concernées du compte rendu type et la conclusion (Qanadli : défects, index, ligne « embolie pulmonaire » de la CONCLUSION ; BI-RADS, PI-RADS, Bosniak : rubriques du modèle). Seule la partie modifiée est remplacée, **en une étape d'historique** (↶ Retour). **Réinsertion sans doublon** obligatoire (testée).
- Le **schéma SVG** peut être joint (`attach`), copié ou téléchargé en PNG.
- Conventions de rédaction : description des **critères** d'abord, **catégorie/score dans la conclusion** (Bosniak), virgule décimale, champs `[a / b]` pour ce qui manque (jamais de valeur supposée), conduite à tenir désactivable (« Alertes/Conseils de l'outil dans la conclusion »).

## 6. Sources et versions ✅ / 🕓

- ✅ Chaque module cite sa référence et la **version** dans l'en-tête (EU-TIRADS 2017, Fleischner 2017 + Bankier, Qanadli AJR 2001 avec DOI, O-RADS v2022, LI-RADS v2018, CAD-RADS 2.0, AAST 2018…) et le titre de l'outil la rappelle.
- ✅ `classifications.js` regroupe les références dans l'en-tête, une ligne par classification.
- 🕓 Pas de champ de données `source` / `version` structuré affiché dans l'interface ; pas de date de dernière vérification par l'auteur. À ajouter seulement sur demande.

## 7. Tests ✅

- Convention : `tests/<outil>.test.js`, `node:test` + `assert/strict`, lancés par `npm test`. Les tests chargent le module (`require`) ou `cr-data.js` (`vm`).
- **À couvrir pour chaque outil** (déjà fait dans les exemples lus) :
  - formules et **seuils aux bornes**, strict vs inclusif (EU-TIRADS : « > 10 mm » → 10 = non, 11 = oui ; Fleischner : < 6, 6–8, > 8 mm et 100 / 250 mm³) ;
  - **catégories** de la référence une à une ; priorités (signes forts avant échogénicité) ;
  - **données manquantes** : état vide sans texte (« vide à l'ouverture » pour les 21 classifications), type ou taille manquants (Fleischner), segment non analysable (CAD-RADS) ;
  - **cas limites** : lésions multiples (AAST : lésion la plus grave), contextes d'exclusion, risque non précisé ;
  - **intégration** au modèle : lignes remplacées, conclusion, **réinsertion sans doublon** (Qanadli, Bosniak) ;
  - **non-régression** des comptes rendus types ; cohérence avec la fiche liée (`tests/eu-tirads.test.js` lit aussi `fiches/eu-tirads.html`).
- ⚠ Un test vérifie le code, **pas** la validité médicale : il fixe ce que l'auteur a validé.

## 8. Méthode pour un nouveau calculateur ou une modification

1. Lire `CLAUDE.md`, `CALCULATEURS.md` et cette charte ; ouvrir seulement l'outil concerné et son test.
2. **Obtenir de l'auteur** la référence, la version, les seuils et les textes. Rien ne s'invente ; l'écart avec la publication se signale.
3. Classification « liste de grades / cases » → entrée de `DEFS` (§2.1). Logique propre (arbre, lésions multiples, schéma) → `regles/<nom>.js` + entrée `TOOLS` dans `cr-tools.js` (`keys`, `suggest`, `form`, `result`, `text`, `integrate` éventuel).
4. Écrire le test **avec les valeurs de la référence** (bornes comprises) avant ou avec le code.
5. Si l'outil écrit dans un modèle : `integrer`, réinsertion sans doublon, comptes rendus types inchangés sans saisie.
6. Changer les `?v=` des scripts modifiés dans `comptes-rendus.html` (et les pages qui les chargent), mettre à jour `README.md` (historique, date, section outils) et `docs/organisation/CALCULATEURS.md` (Réalisé / À vérifier / Prochaine tâche) dans le même commit, lancer `npm test`.

## 9. Points à vérifier / à développer 🕓

- **Validation médicale par l'auteur** (voir `CALCULATEURS.md`) : classifications du 24/10/2026 et seuils par défaut ; PI-RADS, BI-RADS, FIGO, RECIST, Lugano, `suivi/seuils.js` ; CAD-RADS (seuils P1-P4, conduites).
- Modules `regles/` portant encore « À FAIRE VÉRIFIER MÉDICALEMENT » : à lever **uniquement** sur confirmation de l'auteur.
- Convention présent / absent / non évaluable uniforme (§3), conservation des saisies entre visites (§4), source/version affichées (§6) : non faites.
- Suivi oncologique, étapes 2 à 7 (moteur RECIST 1.1, texte, contrôles, Lugano) après validation des seuils.
