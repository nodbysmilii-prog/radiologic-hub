# Charte de conception des comptes rendus

> Méthode de conception du module **Comptes rendus** de RadiologicHub. À consulter **avant toute création ou modification importante** d'un compte rendu type, d'une phrase, d'un outil, d'une règle « en vrac » ou de l'export.
> Document établi le 29/10/2026 **à partir du code existant** (il décrit ce qui est, il n'invente pas d'architecture). Suivi d'avancement : `COMPTES_RENDUS.md`. Pour les fiches rapides : `CHARTE_FICHES.md`.

Légende : ✅ présent dans le code · 🕓 prévu / en pause / non fait.

## 0. Principe directeur

Un compte rendu RadiologicHub est **rapide à produire, complet et sûr** : le radiologue part d'un compte rendu type « normal » validé, ne note que ce qui est pathologique, et obtient un texte structuré prêt à copier dans son logiciel de service.

Règles intangibles :

1. **Aucune constatation médicale n'est ajoutée à la place du radiologue.** Ce qui n'a pas été noté devient un champ à choisir `[a / b]` ou `[x]` (jamais une valeur par défaut plausible). Une règle qui « devine » un signe est un défaut.
2. **Les contenus médicaux validés ne changent pas** sans l'accord de l'auteur : formules du service (`cr-data.js`), seuils et scores des outils. Un doute devient une question posée à l'auteur, pas une phrase vraisemblable.
3. **Les 42 comptes rendus types doivent rester inchangés** par toute nouvelle règle (en vrac ou dictée) tant qu'aucune constatation n'est saisie (test existant dans `tests/vrac.test.js`).
4. **Tout fonctionne dans le navigateur** : aucune donnée de compte rendu n'est envoyée à un serveur du site. Exceptions connues et signalées à l'utilisateur : la dictée (service de reconnaissance du navigateur : « ne dictez pas d'identité patient ») et l'ouverture de la messagerie par e-mail.
5. **Chaque retour de l'auteur devient une règle générale** (jamais un cas particulier), avec test et ligne au README (voir §9).

## 1. Architecture réelle (fichiers essentiels)

| Fichier | Rôle |
|---|---|
| `comptes-rendus.html` | Page : bibliothèque (Modèles / Phrases), barre d'outils, dictée, volet « Écrire en vrac », schémas et calculateurs, éditeur, assistant documentaire, e-mail, « Mes phrases ». Ordre des scripts important (voir §1.1). |
| `cr-data.js` | **Données** : `CR_SPECIALTIES`, `CR_MODALITIES`, `CR_TYPES` (code couleur), `CR_TEMPLATES` (modèles types), `CR_PHRASES` (phrases automatiques). |
| `cr.js` | **Éditeur** (texte brut, `#cr-editor`) : mots-clés → bulle de phrases, champs `[ … ]` navigables (Tab), choix `[a / b]` en bulle, puces, historique Retour / Rétablir, brouillon et modèles/phrases perso en `localStorage`, copie, impression, Word, .txt, e-mail. Expose `window.RHEditor`. |
| `cr.css` | Styles de l'éditeur et de la page. |
| `cr-tools.js` / `cr-tools.css` | **Schémas et calculateurs** (classifications, scores) : fenêtre `<dialog>`, texte prêt à insérer, schémas joints. Expose `window.RHTools`. |
| `regles/*.js` | **Règles métier sans dépendance au navigateur**, testées sous Node (une classification ou un score par fichier : `birads.js`, `eu-tirads.js`, `pirads-cr.js`, `bosniak-cr.js`, `fleischner.js`, `cadrads.js`, `qanadli.js`, `osteogamme-cr.js`, `myome.js`…). |
| `regles/vrac.js` + `cr-vrac.js` | « Écrire en vrac » : moteur (Node) + volet d'interface. |
| `regles/mise-en-forme.js` | Mise en forme à la sortie (titre centré gras, rubriques en gras). |
| `dictee/` | Dictée vocale : `dictee.js` (interface), `moteurs.js`, `traitement.js`, `lexique.js`, `corrections.js`. |
| `assistant/` | Assistant documentaire (fiches rapides liées, 100 % local). |
| `tests/*.test.js` | `npm test` = `node --test tests/*.test.js`. Les tests lisent `cr-data.js` avec `vm` (`CR_TEMPLATES`, `CR_PHRASES`). |

### 1.1 Convention des modules

- **Module sans dépendance au navigateur** : enveloppe `(function (root, factory) { … module.exports ou root.RHRegles.<nom> })`, `'use strict'`, en-tête de commentaire qui explique le principe. C'est la forme à reprendre pour toute nouvelle règle (`regles/vrac.js`, `regles/mise-en-forme.js`).
- **Liaison** : l'interface (`cr-*.js`) dépend de `window.RHEditor` (cr.js), `window.RHTools` (cr-tools.js), `window.RHRegles.<règle>`, `window.RHDictee.*`.
- **Ordre des `<script>`** dans `comptes-rendus.html` : `cr-data.js` → schémas et `regles/*` → `cr-tools.js` → `regles/vrac.js`, `regles/mise-en-forme.js` → `cr.js` → `cr-vrac.js` → `dictee/*` → `assistant/*`.
- **Cache** : après toute modification d'un `.js`/`.css`, changer le `?v=…` (AAAAMMJJHHMMSS) dans les pages HTML qui le chargent (consigne de `CLAUDE.md`).
- **Charte graphique** : Montserrat / Permanent Marker, code couleur `k-*`. Types de phrases ↔ couleur (`CR_TYPES`) : Normal `k-tech`, Lésion / incidentalome `k-sign`, Pathologie aiguë `k-grave`, Conclusion `k-key`, Mes phrases `k-ddx`, Schéma / calculateur `k-signo`. Spécialités : `CR_SPECIALTIES` (mêmes couleurs que les fiches rapides).

## 2. Anatomie d'un compte rendu type ✅

Entrée de `CR_TEMPLATES` : `{ id, spe, mod, title, text }` — `id` utilisé dans l'adresse (`comptes-rendus.html#modele=id`), `spe` ∈ `CR_SPECIALTIES`, `mod` ∈ `CR_MODALITIES` (`Écho`, `Radio`, `Mammo`, `IRM`, `TDM`).

Structure du texte (texte brut, modèle littéral) :

```
TITRE DE L'EXAMEN EN MAJUSCULES            ← 1re ligne, sans « : »
                                              (centré en gras à la sortie)
INDICATION : / RENSEIGNEMENTS CLINIQUES :  ← facultatif
TECHNIQUE :                                ← protocole, injection, plans, séquences
RÉSULTAT(S) :                              ← constatations, une par ligne, précédée de « • »
  Sous-titre d'organe ou de région :       ← « Foie : », « À l'étage sus-tentoriel : », « C5-C6 : »
  • Phrase normale ou à compléter.
AU TOTAL : / CONCLUSION :                  ← synthèse
```

Conventions établies :

- **Rubriques** en MAJUSCULES terminées par « : » (reconnues par la mise en forme, la dictée et « en vrac »). Un sous-titre est toute autre ligne terminée par « : ».
- **Une constatation par ligne**, puce `• ` (formules du service). Entrée sur une puce crée la suivante.
- **Pas de crochets imbriqués** : utiliser « … » à l'intérieur d'un choix (`FIELD = /\[[^\[\]\n]*\]/`).
- **Champs** : `[x] mm` (valeur à saisir), `[droit / gauche]` (choix), `[ TDM thoracique sans anomalie significative / … ]` (conclusion à choisir ou compléter). Tab passe au champ suivant ; le compteur de champs restants s'affiche sous l'éditeur et un avertissement apparaît à la copie s'il en reste.
- **Variantes d'un même examen** : plusieurs modèles (`tdm-thorax`, `tdm-thorax-variante`, `tdm-thorax-injectee`, `angio-tdm-thorax`…) plutôt qu'un modèle surchargé ; modèle « courte » / « normale » / « injectée » / « pathologique modulaire » selon l'usage.
- **Modèles pathologiques modulaires** (`echo-ulnaire-coude-patho`, `echo-ulnaire-guyon-patho`) : options numérotées « Option 1… », « Si stable… / Si subluxation… » dont le radiologue garde une branche ; les valeurs mesurées sont des champs `[14]`.

### 2.1 Modèles représentatifs (lus pour cette charte)

- **`tdm-cerebrale`** (formule du service, structure minimale) : TECHNIQUE → RÉSULTAT par étage (fosse postérieure / sus-tentoriel / étude osseuse) → AU TOTAL. Tout est « Absence de… » : modèle **normal**.
- **`irm-prostate-multiparametrique`** (modèle avec score) : INDICATION → TECHNIQUE (+ qualité PI-QUAL) → RÉSULTATS numérotés par analyse (volume, zones ZP / ZT / stroma…), choix `[homogène / hétérogène…]`, puis intégration du **PI-RADS** via l'outil (§4).
- **`echo-ulnaire-coude-patho`** (trame pathologique modulaire) : INDICATION, TECHNIQUE avec champ `[15-18] MHz`, RÉSULTATS à options, mesures en champs.

## 3. Présent / absent ✅ (convention d'écriture) — 🕓 pas de bascule dédiée

Il n'existe **pas** de composant « présent / absent » (interrupteur, case à cocher) dans l'éditeur. La documentation de ce qui est présent ou absent repose sur trois conventions établies :

1. **Phrase normale = absence documentée** : « Absence de… », « …sans… », « …libres », « …en place, non dilaté ». Le compte rendu type « normal » *est* la liste des éléments absents/normaux.
2. **Choix explicite** `[absents / épaississement pariétal, défaut de rehaussement…]`, `[Pas de thrombose veineuse… / …]`, `[non / oui]` : le signe est tranché par le radiologue en un clic dans la bulle de choix (plusieurs options cochables).
3. **Pathologique en vrac** : on note seulement le positif ; la phrase normale de l'organe est remplacée, les autres restent normales (§6). Un signe positif non précisé reste un champ à choisir.

À faire si l'auteur le demande (non commencé) : interrupteur présent/absent par constatation. Ne pas l'ajouter sans demande.

## 4. Phrases types ✅

`CR_PHRASES` : `{ k, alias[], organ, mod, type, label, text }`.

- `k` : mot-clé tapé (sans accent, minuscules, ex. `foienormal`, `vbnormale`) ; `alias` : variantes ; plusieurs entrées peuvent partager un `k` (une par modalité : `foienormal` TDM et Écho).
- `type` ∈ `CR_TYPES` ; `mod` : `TDM`, `Écho`, `IRM`, ou `TDM / Écho` ; `organ` : regroupement de l'onglet « Phrases ».
- Accès rapide : bulle de suggestions dès le mot-clé exact ou dès 4 lettres du début (8 résultats max) ; **Tab** insère, ↑ ↓ choisit la variante, Échap ferme ; insertion automatique en début de ligne (désactivée par défaut) ; onglet « Phrases » avec recherche et filtre par type.
- **Mes phrases** (`localStorage`, `rh-cr-phrases`) proposées **en premier** ; création par formulaire ou « Sélection → phrase » ; export / import `.json`.
- Les outils de `cr-tools.js` sont aussi des mots-clés (`pirads`, `birads`, `tirads`, `bosniak`, `fleischner`, `cadrads`, `qanadli`/`embolie`, `osteogamme`, `figo`/`myome`, `lugano`/`deauville`, `recist`) : taper le mot-clé ouvre l'outil.
- Style : phrases courtes, terminologie française, champs `[x]` pour toute mesure ou tout caractère non connu. Une phrase pathologique ne contient que des champs pour ce qui n'est pas observable d'avance.

## 5. Scores, classifications et calculateurs ✅

Mécanisme (`cr-tools.js` + `regles/*.js`) :

- Un outil = règles pures dans `regles/<nom>.js` (testées sous Node) + formulaire/schéma dans `cr-tools.js` (`TOOLS[k]` avec `keys`, `title`, `suggest` = motif de suggestion).
- **Suggestion automatique** : d'après le texte du compte rendu (sans compter les phrases normales « Absence de… »), l'outil pertinent est mis en évidence (« Suggérés : ») ; 250 ms après la frappe.
- **Retour dans le compte rendu** : `RHEditor.insert(texte)` (au curseur) ou `RHEditor.integrer(texte, message)` quand l'outil réécrit la rubrique concernée (BI-RADS, PI-RADS, Bosniak, Qanadli…) : seule la partie modifiée est remplacée, **en une étape d'historique** (↶ Retour l'annule).
- **Schémas joints** : `RHEditor.attach({title, svg})` ; exportables en PNG, joints à l'impression et à la copie d'image.
- **Seuils et textes de scores = fond médical validé** : ne pas modifier sans validation de l'auteur ; chaque règle garde son test.

Outils présents (✅) : PI-RADS, BI-RADS, EU-TIRADS, RECIST, Lugano/Deauville, Fleischner, FIGO (myomes), CAD-RADS/score calcique/dominance, OsteoGamme (lyse osseuse), Bosniak, Qanadli (embolie pulmonaire). `regles/classifications.js` regroupe en plus 21 classifications et scores déclaratifs (O-RADS, LI-RADS, Fisher…). Autres règles du dossier `regles/` rattachées aux fiches/outils (pancréatite, occlusion, ischémie mésentérique, colites, cholestéatome, otospongiose, McDonald, TNM cavum…) : vérifier dans `cr-tools.js` avant de les dire disponibles dans l'éditeur.

## 6. « Écrire en vrac » ✅ (`regles/vrac.js`)

Principe : le radiologue note le pathologique ; le moteur part du compte rendu type normal.

- Constatations découpées (ligne, « . », « ; ») → organe (`ORGANES` : id, nom, motif sans accent, exclusions) → remplace **à sa place** la phrase normale de l'organe ; sinon « Par ailleurs : » (rien n'est perdu) ; étage cité (« C5-C6 ») → sous le sous-titre de l'étage.
- `PRINCIPALE` : pathologie principale placée en tête de sa région ; `ASSOCIES` : épanchements / ganglions de la région juste dessous.
- `RECETTES` : rédaction dans le style de l'auteur ; **tout ce qui n'est pas noté devient un champ `[a / b]`**.
- `CONCLUSIONS` : conclusion concise (pathologie principale, signes associés, reste dans l'ordre du compte rendu, sans les champs à choisir) ; « conclusion : … » / « indication : … » / « RC : … » écrasent la valeur par défaut.
- Abréviations (`ABREV`), accents oubliés (`ACCENTS`), mesures (« 8mm » → « de 8 mm »).
- Bilan affiché après génération ; génération en **une étape d'historique** ; confirmation avant d'écraser un texte modifié.

## 7. Dictée vocale ✅ (en pause depuis le 23/10/2026)

Conserver intégralement : moteur Web Speech (`dictee/moteurs.js`), micro global / par section / par champ, commandes vocales (« à la ligne », « conclusion », « aller à foie », « insérer modèle… »), post-traitement (`lexique.js` → accords → `corrections.js` → unités/décimales/dimensions), « Mes corrections » (navigateur). Ne pas la modifier hors consigne : une erreur signalée = correction générale + test + ligne README (voir `CLAUDE.md`). 🕓 Reprise : tests au vrai micro, récupération des listes « Mes corrections », éventuel moteur local (Whisper abandonné).

## 8. Export et sortie ✅

Un seul texte brut dans l'éditeur ; la **mise en forme se fait à la sortie** (`regles/mise-en-forme.js` : titre = 1re ligne en majuscules sans « : » → centré, gras ; rubriques MAJUSCULES + « : » → gras ; étages « C5-C6 : » et sous-titres inchangés).

- **Copier** : texte enrichi + texte brut (avertissement s'il reste des champs `[ … ]`).
- **Télécharger Word (.doc)** (HTML avec en-tête Office), **Télécharger .txt** (UTF-8 avec BOM, CRLF), **Imprimer** (compte rendu seul + schémas joints).
- **Envoyer par e-mail** : Gmail (défaut), Outlook 365, Outlook.com, `mailto:`, objet « Compte rendu — titre », texte aussi copié.
- **Copier / télécharger l'image des schémas** (PNG).
- Brouillon enregistré automatiquement (`rh-cr-draft`) ; pas de compte, rien n'est envoyé au serveur.
- 🕓 Non fait : export PDF dédié, signature/en-tête de service, envoi vers un système d'information.

## 9. Méthode de travail pour une nouvelle demande

1. Lire `CLAUDE.md`, `COMPTES_RENDUS.md` et cette charte ; ne lire que les fichiers du module concerné.
2. **Fond médical** : texte fourni ou validé par l'auteur ; sinon **demander**. Rien n'est inventé, rien n'est « complété » de mémoire.
3. Choisir le bon niveau : modèle (`CR_TEMPLATES`) → phrase (`CR_PHRASES`) → outil de score (`regles/` + `cr-tools.js`) → règle « en vrac » → correction de dictée. Réutiliser l'existant (mêmes clés, mêmes types, mêmes champs).
4. **Retour de l'auteur sur un compte rendu généré** → règle générale dans `regles/vrac.js` (`ORGANES`, `PRINCIPALE`, `ASSOCIES`, `RECETTES`, `CONCLUSIONS`) + test dans `tests/vrac.test.js` reprenant l'exemple exact + ligne en haut du tableau « règles apprises » du README. Vérifier que les 42 comptes rendus types restent inchangés.
5. **Erreur de dictée signalée** → `dictee/lexique.js` (ou `corrections.js` / `traitement.js` si contextuelle) + `tests/dictee.test.js` + ligne en haut du tableau « erreurs signalées » + vérifier `cr-data.js`/`cr-tools.js` + `?v=` des `dictee/*.js` et « Version de la dictée » de `comptes-rendus.html`.
6. Nouvel **outil de score** : règles pures testées dans `regles/`, entrée `TOOLS` dans `cr-tools.js` (`keys`, `suggest`), texte inséré via `insert` / `integrer`, test de non-régression sur les modèles types concernés.
7. Après modification : `npm test`, changer les `?v=`, **mettre à jour `README.md`** (historique, date, sections concernées) et `docs/organisation/COMPTES_RENDUS.md` (Réalisé / À vérifier / Prochaine tâche) dans le même commit.

## 10. Interface rapide et usage intensif

- Tout est faisable **au clavier** : Tab (champ suivant / insérer), ↑ ↓ + Entrée (choix), Échap, Ctrl + Z / Y, Ctrl + Entrée (générer en vrac), F9 (dictée).
- Un geste = une étape d'historique (mot tapé, phrase, modèle, génération, outil) ; **↶ Retour** doit toujours pouvoir annuler.
- Bibliothèque en deux niveaux (examen puis spécialité, choix mémorisé) ; actions secondaires dans « Plus d'actions » ; mode d'emploi dépliable. 🕓 La **refonte ergonomique** (branche `claude/refonte-ergonomie`) n'est **pas encore validée ni en ligne** : ne pas la présenter comme acquise.
- Pas de nouvelle dépendance ; pas de requête réseau pour le contenu des comptes rendus.

## 11. Ce qui reste prévu (🕓)

À vérifier / décider avec l'auteur (voir `COMPTES_RENDUS.md`) : validation de la refonte ergonomique ; lot de formules normales du 08/10/2026 (anomalies rendues normales par défaut, doublons) ; IRM médullaire / cérébrale (technique vs compte rendu) ; relecture de `assistant/synonymes.js` (négation non analysée) ; reprise de la dictée ; interrupteur présent/absent (§3) uniquement si demandé.
