# RadiologicHub

**RadiologicHub** est le site des masterclass de **radiologie d'urgence** : des formations par spécialité (neuro, digestif, thorax, polytraumatisé, vasculaire, pédiatrie), des **fiches rapides** de révision, des **cas cliniques annotés** et un outil de **comptes rendus types** avec phrases automatiques.

🌐 **Site en ligne :** https://nodbysmilii-prog.github.io/radiologic-hub/

> Dernière mise à jour du README : 7 octobre 2026

---

## Sommaire

1. [Ce que contient le site](#ce-que-contient-le-site)
2. [Fiches rapides disponibles](#fiches-rapides-disponibles)
3. [Comptes rendus types et phrases automatiques](#comptes-rendus-types-et-phrases-automatiques)
4. [Suivi oncologique (RECIST 1.1 / Lugano)](#suivi-oncologique-recist-11--lugano)
5. [Charte graphique](#charte-graphique)
6. [Code couleur des fiches](#code-couleur-des-fiches)
7. [Organisation des fichiers](#organisation-des-fichiers)
8. [Ajouter ou modifier du contenu](#ajouter-ou-modifier-du-contenu)
9. [Mise en ligne](#mise-en-ligne)
10. [Tests](#tests)
11. [À faire / points en attente](#à-faire--points-en-attente)
12. [Historique des modifications](#historique-des-modifications)

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

Index des fiches avec **un onglet par spécialité** (Digestif, Neuro, Thorax, Traumato, Uro, Ostéo-articulaire, Vasculaire, Pédiatrie). Les spécialités sans fiche affichent « Bientôt disponible ».

Chaque fiche (`fiches/…html`) propose :

- une **légende du code couleur cliquable** (un clic n'affiche plus qu'une catégorie) ;
- un **sommaire fixe** et une **barre de progression de lecture** ;
- des **tuiles, frises, tableaux et schémas** dans le style du site ;
- des **images** qui s'agrandissent au clic (les emplacements sans image restent masqués) ;
- des cartes **« Testez-vous »** à retourner ;
- un bouton **Imprimer / PDF**.

### Comptes rendus types (`comptes-rendus.html`)

Éditeur de compte rendu avec bibliothèque de modèles et **phrases automatiques** — voir la [section dédiée](#comptes-rendus-types-et-phrases-automatiques).

---

## Fiches rapides disponibles

| Spécialité | Fiche | Fichier | Particularités |
|---|---|---|---|
| Digestif | **Adénocarcinome canalaire du pancréas** | `fiches/adenocarcinome-pancreas.html` | Tableau vasculaire filtrable, feu tricolore de résécabilité, **annexe « Cas & images »** repliable avec 2 carrousels annotés (cas d'extension vasculaire, signes typiques A–D, variante : sténose athéromateuse du tronc cœliaque A–B, diagnostics différentiels : métastases pancréatiques, tumeur neuroendocrine, pancréatite auto-immune) |
| Digestif | **Imagerie de la maladie de Crohn** | `fiches/maladie-de-crohn.html` | Objectifs numérotés, préparation de l'entéro-IRM en frise, activité vs chronicité, phénotypes B1–B3 |
| Digestif | **IRM pelvienne dans le cancer du rectum** | `fiches/irm-cancer-rectum.html` | 13 images du cours, onglets T1–T4, jauge EMS, échelle mrTRG, **checklist du compte rendu** mémorisée dans le navigateur |
| Uro | **IRM de la prostate : diagnostic du cancer** | `fiches/irm-prostate-diagnostic.html` | D'après la planche du cours, **sans les images IRM** : les 7 commandements (A–G), PI-QUAL (tableau 1–5 et implications), mesure de la glande et PSAd, signal de fond (Bura 2021, 1–4), onglets **ZP · diffusion** / **ZT · T2** (définitions des scores 1–5 et tableaux de décision PI-RADS v2.1 avec la perfusion / la diffusion accessoires), **cartographie sectorielle** dessinée (coupes axiales base / milieu / apex, vues sagittale et coronale, zones colorées, correspondances LPZ = PZpl…), PRECISE / Likert / PI-RR, checklist du CR, 6 cartes « Testez-vous » |
| Uro | **IRM de la prostate : bilan d'extension** | `fiches/irm-prostate-extension.html` | D'après la planche du cours, **sans les images IRM** : à savoir (pas de vraie capsule…), **TNM 2016**, signes iT3a, **score EPE 0–3** avec schémas dessinés et Se / VPP / VPN, vésicules séminales iT3b (Likert, 3 types d'extension en schéma), iT4, iN (IRM, TEP-choline, TEP-PSMA), iM (scintigraphie, scanner TAP), checklist du CR, 6 cartes « Testez-vous » |
| Ostéo-articulaire | **Spondylodiscite infectieuse** | `fiches/spondylodiscite.html` | Fusion de deux cours ; tableaux comparatifs pyogènes / tuberculose / brucellose filtrables, onglets par germe, quiz « Quel germe ? », formes rares, diagnostic différentiel, annexe avec 2 cas annotés (tuberculose, *Bacillus cereus*) |

---

## Comptes rendus types et phrases automatiques

Page `comptes-rendus.html` (lien « Comptes rendus » dans le menu de toutes les pages).

**Fonctionnement**

1. **Modèles** (colonne de gauche, onglet « Modèles ») : choisir d'abord l'**examen** (Échographie, Radiographie standard, IRM, TDM, avec le nombre de modèles ; ou « Tous les examens »), puis la **spécialité** (seules celles qui ont des modèles pour cet examen sont proposées) ; un clic charge le compte rendu type dans l'éditeur. L'examen choisi est mémorisé. Les modèles perso sont classés d'après leur titre (« ÉCHOGRAPHIE… », « RADIOGRAPHIE… », « IRM… », « TDM… / SCANNER… ») ; sans examen reconnu, ils apparaissent pour tous les examens.
2. **Phrases automatiques** : en tapant un mot-clé (ex. `angiome`), une bulle propose aussitôt la ou les descriptions correspondantes (TDM / écho / IRM…). **Tab** (ou clic) insère la description, **↑ ↓** choisit une variante, **Échap** ferme. Les suggestions apparaissent dès le mot-clé exact ou dès 4 lettres du début du mot-clé. **Ctrl + Z** annule une insertion.
3. **Champs à compléter** : les éléments variables sont entre crochets (`[x] mm`, `[droit / gauche]`). Le premier champ est sélectionné après chaque insertion ; **Tab** (ou le bouton « Champ suivant ») passe au suivant. Le nombre de champs restants est affiché sous l'éditeur, et un avertissement s'affiche à la copie s'il en reste.
4. **Insertion automatique** (interrupteur sous l'éditeur, désactivé par défaut) : un mot-clé tapé **en début de ligne** (éventuellement après une puce « • ») suivi d'un espace, d'une ponctuation ou d'Entrée est remplacé directement par la première description.
5. **Puces** (style des formules du service) : **Entrée** sur une ligne « • … » crée la puce suivante ; Entrée sur une puce vide termine la liste. Une phrase à puces insérée sur une ligne qui a déjà sa puce ne la double pas.
6. Onglet **« Phrases »** : toute la bibliothèque, avec recherche et filtre par type ; un clic insère la phrase au curseur.
7. Boutons : **↶ Retour** / **↷ Rétablir** (aussi Ctrl + Z / Ctrl + Y ; une étape par mot tapé, par phrase insérée, par modèle chargé ou par collage), **Copier**, **Champ suivant**, **Télécharger .txt**, **Imprimer** (le compte rendu seul), **Enregistrer comme modèle**, **Sélection → phrase** (crée une phrase perso à partir du texte sélectionné), **Effacer**.
8. **Envoyer par e-mail** (sous l'éditeur) : saisir une ou plusieurs adresses et choisir la messagerie (**Gmail** par défaut, Outlook Microsoft 365, Outlook.com, ou application Mail de l'ordinateur via `mailto:`) — les deux sont mémorisés. Un clic ouvre un nouveau message (Gmail / Outlook dans un nouvel onglet) avec l'objet « Compte rendu — titre » et le texte déjà rédigé ; il ne reste qu'à cliquer sur « Envoyer ». Le texte est aussi copié dans le presse-papiers (si la messagerie tronque un long compte rendu, coller avec Ctrl + V). S'il reste des champs `[ … ]`, un premier clic avertit, un second clic envoie quand même. L'application Mail du Mac ne fonctionne que si un compte y est configuré. **Schémas joints** : un lien Gmail / Outlook / `mailto:` ne peut transporter que du texte ; à l'envoi, l'image de tous les schémas joints (réunis en une seule image PNG, titre au-dessus de chacun) est donc copiée automatiquement et le message se termine par « Schéma : » — il suffit d'y coller l'image (⌘ + V / Ctrl + V). Un rappel s'affiche dans la zone d'envoi. Sur téléphone / tablette, l'option **Partager** ouvre le partage du système (application Gmail…) avec le texte et l'image en pièce jointe. Sous les vignettes : **Copier l'image des schémas** et **Télécharger (PNG)**. Le site n'envoie rien lui-même : pas de serveur, et rappel d'utiliser une messagerie sécurisée de santé (MSSanté) pour un patient identifiable.
9. **Schémas & calculateurs** (boutons au-dessus de l'éditeur, voir ci-dessous).
10. **Dictée vocale** (barre « Dicter » au-dessus de l'éditeur, voir ci-dessous).
11. **Mes phrases** (bas de page) : formulaire pour programmer ses propres mots-clés et descriptions ; modifier / supprimer ; **Exporter / Importer** (fichier `.json`) pour les transférer sur un autre ordinateur. Les phrases perso sont proposées en premier.

**Dictée vocale** (`dictee/`) — prototype V1 sur la **Web Speech API** du navigateur (`fr-FR`, mode continu, résultats intermédiaires) :

- **Où dicter** : bouton **Dicter** (micro global : au curseur de l'éditeur) ; **barre « Dicter dans : »** qui liste les **sections** (lignes en majuscules terminées par « : » : TECHNIQUE, RÉSULTAT, AU TOTAL…) et les **sous-titres** (toute autre ligne terminée par « : » : Foie, Vésicule biliaire, Reins…), chacun avec son micro ; bouton **Dicter** qui apparaît au-dessus du champ `[ … ]` sélectionné (le texte dicté le remplace) ; petit micro sur les autres zones de texte (`data-dictee` : texte et intitulé de « Mes phrases », précisions BI-RADS).
- **Affichage** : bouton rouge « Arrêter », point rouge clignotant, « Dictée en cours » et chronomètre, cadre rouge autour de l'éditeur, texte intermédiaire en bulle près du curseur ; seul le texte final est inséré, au curseur, **une étape d'historique par phrase** (↶ Retour l'annule) ; le texte reste modifiable au clavier pendant la dictée.
- **Commandes vocales** : « point », « virgule », « deux points », « point-virgule », « ouvrir / fermer la parenthèse », « à la ligne » (continue une liste à puces), « nouvelle puce », « nouveau paragraphe », « effacer le dernier mot », « **conclusion** » dit seul (curseur dans AU TOTAL / CONCLUSION, champ `[ … ]` sélectionné ; section créée si absente), « **aller à foie** » (curseur juste après « Foie : » ; sections : premier champ `[ … ]` ou fin du contenu), « **insérer modèle** … » / « insérer la phrase … » (recherche approximative : « scanner thoracique » trouve « TDM thoracique… »), « arrêter la dictée ».
- **Modèles et phrases** : un **examen complet** est chargé directement si l'éditeur est vide, sinon une confirmation propose **Remplacer / Insérer au curseur / Annuler** (au clic ou à la voix : « remplacer », « insérer », « annuler ») ; une **phrase** (du service ou « Mes phrases ») est insérée au curseur sans confirmation ; si plusieurs résultats sont trop proches, la liste est proposée (« un », « deux »…).
- **Post-traitement** (`dictee/traitement.js`, indépendant du moteur) : dictionnaire configurable **`dictee/corrections.js`** (« pi rads » → PI-RADS, « bi rads » → BI-RADS, « eu tirads » → EU-TIRADS, « bosniak » → Bosniak, sigles, « segment 7 » → segment VII…) ; **vocabulaire radiologique souvent mal reconnu** : formes entendues → terme exact (« iso dense » / « hippo dense » → isodense / hypodense, « en hypo signal » → en hyposignal, « cérébri forme » → cérébriforme, « centri pète en mode » → centripète en mottes, « ma gamme ganglionnaire » → magma ganglionnaire, « céliaque » → cœliaque, accents rétablis sur mésentérique…) et **règles par famille** : hypo / hyper / iso + dense, signal, échogène, vasculaire… soudés ; préfixes savants soudés (ostéophyte, micronodules, hépatomégalie, pneumopéritoine, hydronéphrose…) ; intra / extra / inter / rétro / péri / infra / supra / trans soudés (trait d'union devant une voyelle : intra-articulaire) ; adjectifs anatomiques composés avec trait d'union (lombo-sacré, sacro-iliaque, gléno-huméral…) ; liste « expressions » corrigées en contexte ; unités après un nombre (« millimètres » → mm, cm, mL, mm³, UH, %) ; **décimales** « 12 virgule 5 » → 12,5 ; **dimensions** « 12 sur 8 millimètres » / « 12 par 8 millimètres » → 12 x 8 mm, « 12 sur 8 sur 6 » → 12 x 8 x 6 mm (mm par défaut) ; « 4 sur 5 » sans unité (dénominateur 4, 5 ou 10) reste un score → 4/5 ; majuscule en début de phrase ou de puce, espaces avant « : » et « ; », pas de double point ; « point » reste un mot dans « point de départ », « point d'appel »…
- **Confidentialité** : avertissement permanent « La dictée passe par le service du navigateur : ne dictez pas d'identité patient. » ; **alerte identité** si le texte dicté contient « Monsieur / Madame / Mademoiselle + nom », « né(e) le / en … » ou « date de naissance » (bouton « Voir le texte »).
- **Raccourcis** (réglages ⚙, mémorisés) : **F9** démarrer / arrêter, **Échap** arrêter ; chaque touche se change par simple appui (une pédale de dictée USB qui envoie une touche convient) ; Ctrl + Maj déconseillé (changement de langue du clavier sous Windows).
- **Navigateurs** : Chrome, Edge, Safari (micro autorisé, page en https ; Chrome a besoin d'internet). **Firefox** n'a pas la Web Speech API : message clair, boutons grisés.
- **V2 préparée** (`dictee/moteurs.js`) : moteur interchangeable, même interface (`demarrer`, `arreter`, texte intermédiaire / final, erreurs) ; emplacement « **Whisper local (WebGPU)** » visible mais désactivé dans les réglages — transcription dans le navigateur, modèle téléchargé une fois puis en cache, **l'audio ne quitte pas le poste** ; le post-traitement et les commandes resteront identiques.

**Schémas & calculateurs** (`cr-tools.js`, `cr-tools.css`) — chaque outil s'ouvre dans une fenêtre : formulaire, calcul automatique, aperçu du texte, puis **Insérer dans le compte rendu** (au curseur). Pour les quatre schémas (PI-RADS, BI-RADS, EU-TIRADS, Fleischner) : **Joindre le schéma** (vignette sous l'éditeur, imprimée avec le compte rendu), **Copier l'image** (à coller dans un logiciel ou un e-mail) et **Télécharger le schéma** (PNG).

- **Ouverture** : boutons au-dessus de l'éditeur ; le bouton s'allume « suggéré » quand le texte du compte rendu en parle (prostate → PI-RADS, sein / mammographie → BI-RADS, thyroïde → EU-TIRADS, nodule pulmonaire / micronodule / verre dépoli / nodule d'un lobe pulmonaire → Fleischner, RECIST / lésions cibles → RECIST, lymphome / Hodgkin / Deauville → Lugano) ; ou en tapant le mot-clé dans l'éditeur (`pirads`, `birads`, `tirads`, `fleischner` / `nodulepulm`, `recist`, `lugano` / `cheson` / `deauville`) puis Tab. En tapant `nodule`, la bulle propose à la fois la phrase « Nodule pulmonaire » et l'outil Fleischner.
- **PI-RADS v2.1 (prostate)** : carte des secteurs en coupes axiales (base, tiers moyen, apex ; ZP antérieure / postérolatérale / postéromédiale, zone centrale à la base, ZT antérieure / postérieure, stroma fibromusculaire antérieur, vésicules séminales, sphincter) — un clic ajoute ou retire un secteur pour la lésion active (4 lésions max) ; sous les coupes axiales, **vue sagittale** (antérieur à gauche) et **vue coronale** (droite à gauche) où chaque lésion est projetée automatiquement (niveau base / milieu / apex, antérieur / postérieur, droite / gauche ; zones colorées selon le score). Schéma commun : `schemas/prostate.js`. Scores T2, diffusion, perfusion, extension extraprostatique ; catégorie calculée selon l'algorithme v2.1 (zone périphérique : diffusion dominante, diffusion 3 + perfusion positive → 4 ; zone de transition : T2 dominant, T2 2 + diffusion ≥ 4 → 3, T2 3 + diffusion 5 → 4) ; algorithme choisi automatiquement selon les secteurs (modifiable). Volume prostatique (ellipsoïde × 0,52) et densité de PSA. Lésion index et conclusion avec la définition officielle de la catégorie. Alertes : taille ≥ 15 mm, extension extraprostatique, perfusion ou diffusion manquante.
- **BI-RADS (sein)** : deux seins en cadran horaire (vue de face, sein droit à gauche) ; un clic place la lésion et calcule le rayon horaire (à la demi-heure), la distance au mamelon et le quadrant (QSE, QSI, QIE, QII, unions, rétro-aréolaire). Densité ACR a–d, lexique (masse, kyste, microcalcifications, distorsion, asymétrie, rehaussement non masse, ganglion), catégorie 0–6 (4A/4B/4C) choisie par le radiologue ; catégorie par sein = la plus élevée ; conduite à tenir générique. Alerte si un descripteur suspect est associé à une catégorie ≤ 3.
- **EU-TIRADS 2017 (thyroïde)** : schéma des lobes (tiers supérieur / moyen / inférieur, isthme) ; un clic place le nodule (6 max). Score calculé : kystique pur ou spongiforme → 2 ; forme non ovale, contours irréguliers, microcalcifications ou hypoéchogénicité marquée → 5 ; légèrement hypoéchogène → 4 ; iso- ou hyperéchogène → 3. Indication de cytoponction selon le plus grand diamètre (> 20 / 15 / 10 mm pour EU-TIRADS 3 / 4 / 5 ; 5–10 mm en EU-TIRADS 5 : surveillance active ou cytoponction à discuter). Volume thyroïdien facultatif, adénopathie suspecte.
- **Fleischner 2017 (nodule pulmonaire de découverte fortuite)** : schéma des poumons de face (poumon droit à gauche ; LSD, LM, LID, LSG, lingula, LIG) ; un clic place le nodule actif et fixe son lobe (6 nodules max). Par nodule : type (solide, verre dépoli pur, partiellement solide), grand et petit axe (**diamètre moyen arrondi au mm**), volume facultatif pour un nodule solide (< 100 / 100–250 / > 250 mm³, prioritaire sur le diamètre), composante solide pour un nodule partiellement solide, morphologie suspecte, critères de bénignité. **Ganglion intrapulmonaire** (nodule solide uniquement) selon Fleischner 2017 : pas de surveillance, même au-delà de 6 mm, si les **trois critères** sont cochés — au contact d'une scissure ou de la plèvre, forme ovale / lenticulaire / triangulaire, homogène à contours lisses — sans signe suspect et avec un diamètre moyen < 10 mm (Fleischner ne fixe pas de limite haute ; limite des séries publiées et de la définition du nodule juxtapleural de Lung-RADS v2022). Localisation sous la carène et ligne septale : arguments proposés mais **non exigés** (ils ne le sont pas dans la recommandation) ; alerte si les critères sont incomplets. Contexte : découverte fortuite chez un patient de 35 ans ou plus, sinon **non applicable** (dépistage → Lung-RADS, cancer connu, immunodépression, moins de 35 ans) ; risque faible / élevé, ou **non précisé → les deux conduites** dans le texte quand elles diffèrent (le risque ne module que les nodules solides) ; « autres nodules non détaillés » = nodules multiples. Conduite selon le tableau 2017 (solide unique < 6 / 6–8 / > 8 mm, solides multiples, verre dépoli pur, partiellement solide avec composante solide < ou ≥ 6 mm = hautement suspect s'il persiste, subsolides multiples) ; avec plusieurs nodules, conduite guidée par le **nodule le plus suspect** (conduite la plus intensive, puis le plus gros). Pastille de couleur par nodule (vert : pas de surveillance ou optionnelle ; ambre : 6–12 mois ; orange : 3–6 mois ; rouge : 3 mois / TEP / prélèvement ou hautement suspect). Texte : description de chaque nodule, ligne du tableau utilisée, conduite, et technique du contrôle (TDM faible dose sans injection, coupes fines jointives ≤ 1,5 mm). Alertes : un seul diamètre saisi, nodule > 30 mm (masse), composante solide manquante ou plus grande que le nodule. Règles dans `regles/fleischner.js` (références MacMahon 2017 et Bankier 2017, testées sous Node).
- **RECIST 1.1** : jusqu'à 5 lésions cibles (alerte si > 2 par organe), case « ganglion » (petit axe) ; sommes initiale / nadir / actuelle et variations ; réponse des cibles (RC : disparition et ganglions < 10 mm ; RP : ≥ 30 % de baisse / initial ; MP : ≥ 20 % et ≥ 5 mm de hausse / nadir ; sinon MS) ; lésions non cibles, nouvelles lésions et réponse globale selon le tableau RECIST 1.1.
- **Lugano 2014 (Cheson)** : mode **TEP-TDM** (score de Deauville 1–5 avec définitions, évolution de la fixation, nouvelles lésions, moelle → RMC / RMP / ARM / MMP, mention intermédiaire / fin de traitement) ou mode **TDM** (jusqu'à 6 lésions LDi × SDi initial / nadir / actuel, SPD et variation, critères de progression par lésion, rate, lésions non mesurées → RC / RP / MS / MP).
- Avertissement dans chaque fenêtre : aide à la rédaction, ne remplace pas l'appréciation du radiologue.

**Stockage** : le brouillon, les phrases, les modèles perso, les schémas joints et l'adresse e-mail sont enregistrés **dans le navigateur** (localStorage), rien n'est envoyé. Message de confidentialité sur la page : ne pas saisir de données identifiantes.

**Contenu fourni (`cr-data.js`)**

**8 comptes rendus types, uniquement les formules normales du service** (fournies en PDF le 07/10/2026 ; les modèles rédigés au départ par Claude ont été retirés à la demande de l'utilisateur). Reprises mot pour mot avec leurs puces « • » ; seules corrections : accents sur les majuscules, accords et coquilles (« constitutionnelle », « contenant-contenu », « 4e », « polygone de Willis », « selon différentes pondérations », « intra- ou extra-axial »), points finaux, titre de la radio du bassin (le document indiquait « IRM du bassin de face »), intertitres « Au niveau dorsal » et « Au niveau du bassin » ajoutés dans les IRM du rachis, et quelques champs `[ … ]` (côté, compartiment, conclusion, `[Absence d'arthrose / Arthrose]` interapophysaire à chaque étage).

| Examen | Spécialité | Comptes rendus types |
|---|---|---|
| TDM | Neuro | TDM cérébrale sans injection — normale |
| TDM | Thorax | TDM thoracique sans injection — normale |
| IRM | Neuro | IRM cérébrale et médullaire — normale (encéphale avec injection et angiographie + rachis étage par étage + bassin) |
| IRM | Ostéo-articulaire | IRM médullaire (rachis entier) — normale |
| Radiographie standard | Ostéo-articulaire | Rachis lombaire (F + P) — normal · Bassin (F) — normal · Genou (F + P) — normal · Genou (F + P) — gonarthrose |
| Échographie | — | aucun pour l'instant (bouton grisé) |

**73 phrases**, classées par type (couleur du mot-clé). ★ = phrases tirées des formules du service ; les autres ont été rédigées par Claude (à relire) :

| Couleur | Classe | Type | Exemples de mots-clés |
|---|---|---|---|
| 🔵 Bleu | `k-tech` | Normal | ★ `cerveaunormal`, `encephaleirm`, `fossepost`, `sustentoriel`, `poumonsnormaux`, `mediastinnormal`, `osnormal`, `mineralisation`, `rachislombnormal`, `etagecervical`, `etagelombaire`, `dorsalnormal`, `conenormal`, `bassinnormal`, `rxbassinnormal`, `genounormal` · `foienormal`, `pancreasnormal`, `reinsnormaux`… |
| 🟢 Vert | `k-sign` | Lésion / incidentalome | ★ `gonarthrose` (fémoro-tibiale, fémoro-patellaire), `demineralisation` · `angiome` (foie TDM / écho / IRM, vertèbre), `kyste` (foie, rein Bosniak I, ovaire), `steatose`, `hnf`, `adenome`, `meningiome`, `nodule`, `lipome`, `enostose` |
| 🔴 Rouge | `k-grave` | Pathologie aiguë | `appendicite`, `diverticulite`, `occlusion`, `pneumoperitoine`, `cholecystite`, `pancreatite`, `lithiase`, `pyelonephrite`, `hsd`, `hed`, `hsa`, `avc`, `ep`, `pneumothorax`, `dissection`, `aaa` |
| 🟡 Jaune | `k-key` | Conclusion / formule | `conclusionnormale`, `transmis`, `comparatif`, `controle`, `cordialement` (signature : créer une phrase perso `cordialement` avec son nom pour la remplacer) |
| 🟣 Violet | `k-ddx` | Mes phrases (perso) | — |

---

## Suivi oncologique (RECIST 1.1 / Lugano)

Page `suivi-oncologique.html` (lien depuis la page Comptes rendus : bouton « Suivi oncologique » au-dessus de l'éditeur, et pied de page). Module développé par étapes ; **livré** : modèle de données, registre des lésions, tableau comparatif (étape 1) et **schéma anatomique de vue d'ensemble**.

**Principe** : chaque lésion est un objet suivi d'un examen à l'autre, avec un identifiant fixe jamais réutilisé — `C1, C2…` (cibles), `NC1…` (non-cibles), `N1…` (nouvelles). Au nouvel examen, toutes les lésions sont reportées avec leurs mesures antérieures : seule la colonne « Actuel » est à saisir.

- **Mes suivis** : un suivi par patient, sous un **identifiant pseudonymisé** (alerte si l'identifiant ne contient que des lettres, donc ressemble à un nom). Créer, ouvrir, supprimer, **exporter / importer (JSON)**.
- **Stockage** : uniquement dans le navigateur (`localStorage`, clé `rh-suivis`), rien n'est envoyé sur un serveur. **Mode éphémère** : rien n'est gardé sur l'ordinateur (efface les suivis enregistrés ; avertissement à la fermeture de la page).
- **Examens** : date, modalité, phase, épaisseur de coupe, baseline oui/non ; technique et repères série / image repris de l'examen précédent. Une nouvelle baseline (nouvelle ligne de traitement) remet baseline et nadir à zéro.
- **Lésions** : type (fixe, car il détermine l'identifiant), organe, segment / territoire, ganglion (petit axe), commentaire. Cibles et non-cibles se créent sur un examen de baseline ; ensuite, seulement des nouvelles lésions (N), **enregistrées uniquement si elles sont certaines** (pas de statut « équivoque », choix du service).
- **Série / image** : saisies **pour chaque examen** dans le tableau (la numérotation change d'un examen à l'autre), préremplies avec l'examen précédent.
- **Tableau comparatif** : Lésion | Localisation (Se / Im) | Baseline | Nadir | Précédent | Actuel | Δ vs baseline | Δ vs nadir, groupé en cibles / non-cibles / nouvelles, avec la **somme des diamètres** (ligne « incomplète » si une cible n'est pas mesurée). Statuts d'une cible : mesurée, trop petite (5 mm), disparue (0 mm), non évaluable (motif obligatoire). Non-cibles : présente, disparue, progression non équivoque, non évaluable. Nouvelles : présente, disparue, non évaluable.
- **Nadir** : plus petite somme complète depuis la baseline incluse jusqu'à l'examen précédent inclus (l'examen évalué est exclu ; à égalité, le plus ancien).
- **Saisie** : virgule ou point, mm par défaut, « 1,8 cm » converti en 18 mm ; **Entrée** passe à la mesure suivante ; mesure invalide signalée en rouge.
- **Vue d'ensemble (schéma anatomique)** : silhouette de face (droite du patient à gauche de l'image) où chaque lésion de l'examen affiché se place **automatiquement** d'après son organe et son segment / territoire : côté droit / gauche (« droit », « G », LSD, LIG, lingula…), segments hépatiques I à VIII, lobes pulmonaires, **stations ganglionnaires** (cervicale, sus-claviculaire, axillaire, médiastinale, hilaire, sous-carénaire, cœliaque, mésentérique, lombo-aortique, iliaque, inguinale — utiles aussi pour Lugano), niveaux vertébraux (C, D/T, L, S), os longs, organes abdominaux et pelviens. Forme selon le type (● cible, ■ non-cible, ▲ nouvelle) ; **couleur indicative** lésion par lésion : bleu baseline, vert baisse ≥ 30 % vs baseline / disparue / ganglion < 10 mm, ambre stable, rouge hausse ≥ 20 % **et** ≥ 5 mm vs nadir (ou réapparition), non-cible en progression, nouvelle lésion ; gris non évaluable ; blanc à saisir. Mise à jour en direct pendant la saisie ; survol d'une ligne du tableau = repère mis en évidence, clic sur un repère = ligne du tableau ; résumé par type et par état ; lésions non placées signalées (bouton pour préciser l'organe) ; **Télécharger l'image (PNG)** avec légende. Liste de territoires proposée dans la fiche lésion. La réponse RECIST se juge toujours sur la **somme** (les couleurs ne sont qu'un repère visuel).
- **Mention permanente** : « Aide au calcul — résultat à valider par le radiologue ».

**Fichiers** : `suivi/seuils.js` (tous les seuils RECIST 1.1, Lugano 2014 et contrôles, commentés avec les références, **à faire vérifier médicalement**), `suivi/registre.js` (modèle, report, sommes, nadir, comparatif, JSON — sans dépendance au navigateur, testé sous Node), `suivi/schema.js` (placement des lésions, état / couleur, dessin SVG — testé sous Node), `suivi-oncologique.html`, `suivi.js`, `suivi.css`.

**Étapes suivantes** : 2) moteur RECIST 1.1 et verdict justifié ; 3) texte du compte rendu ; 4) contrôles anti-erreur (checklist, valeurs incohérentes, technique différente) ; 5) mode Lugano ; 6) import de comptes rendus en texte libre ; 7) QR code, courbe d'évolution, iRECIST. Les couleurs du schéma passeront aux règles Lugano (PPD / SPD) avec le mode Lugano.

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
├── schemas/
│   └── prostate.js         Schéma sectoriel de la prostate (axial, sagittal, coronal) : calculateur PI-RADS et fiche prostate
├── comptes-rendus.html     Comptes rendus types : éditeur, bibliothèque, mes phrases
├── cr-data.js              Données : modèles de CR (CR_TEMPLATES) et phrases automatiques (CR_PHRASES)
├── cr.js                   Éditeur : suggestions, champs [ … ], insertion auto, mes phrases, export/import
├── cr.css                  Styles de la page Comptes rendus
├── cr-tools.js             Schémas et calculateurs : PI-RADS, BI-RADS, EU-TIRADS, Fleischner 2017, RECIST 1.1, Lugano 2014
├── regles/
│   └── fleischner.js       Recommandations Fleischner 2017 (nodules pulmonaires), testées sous Node
├── cr-tools.css            Styles de la fenêtre des outils
├── dictee/                 Dictée vocale de la page Comptes rendus
│   ├── corrections.js      Dictionnaire de corrections médicales (configurable)
│   ├── traitement.js       Commandes vocales, nombres, dimensions, sections, recherche de modèles, alerte identité (testé sous Node)
│   ├── moteurs.js          Moteurs de transcription : Web Speech API (V1), Whisper local (V2, à venir)
│   ├── dictee.js           Interface : micros, bulle, confirmation vocale, raccourcis, réglages
│   └── dictee.css          Styles de la dictée
├── suivi-oncologique.html  Suivi oncologique : registre des lésions, examens, tableau comparatif, schéma
├── suivi.js / suivi.css    Interface du suivi oncologique
├── suivi/                  Règles de calcul du suivi (sans interface, testées sous Node)
│   ├── seuils.js           Seuils RECIST 1.1 / Lugano 2014 / contrôles, documentés (à vérifier médicalement)
│   ├── registre.js         Modèle de données, report des lésions, sommes, nadir, comparatif, JSON
│   └── schema.js           Schéma anatomique : placement automatique des lésions, couleurs, SVG
├── tests/                  Tests unitaires (node --test), cas fictifs uniquement
├── package.json            « npm test » (aucune dépendance)
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
| Ajouter un compte rendu type | Ajouter un objet `{ id, spe, mod, title, text }` dans `CR_TEMPLATES` (`cr-data.js`) ; `mod` = `'Écho'`, `'Radio'`, `'IRM'` ou `'TDM'` (liste `CR_MODALITIES`) ; lien direct possible : `comptes-rendus.html#modele=<id>` |
| Ajouter une phrase automatique | Ajouter un objet `{ k, alias, organ, mod, type, label, text }` dans `CR_PHRASES` (`cr-data.js`). Mot-clé sans espace ni accent ; éviter les mots courants (« foie », « normal »…) qui ouvriraient la bulle en pleine rédaction |
| Champs à compléter | Les écrire entre crochets `[x]`, `[droit / gauche]` ; **pas de crochets imbriqués** (utiliser « … » à l'intérieur d'un choix) |
| Style des formules du service | Titre en capitales, `TECHNIQUE :`, `RÉSULTAT :` (ou `COMPTE-RENDU :`), une constatation par ligne précédée de `• `, `AU TOTAL :` / `CONCLUSION :` |

**Images médicales :** toujours **anonymisées** (aucun nom, date, n° de dossier, ni texte incrusté). Le site et le dépôt sont publics.

**Cache :** après une modification de `styles.css`, `fiche.css`, `script.js`, `fiche.js`, `cr.css`, `cr.js`, `cr-data.js`, `cr-tools.js` ou `cr-tools.css`, changer le numéro `?v=…` dans les liens des pages HTML pour forcer les navigateurs à recharger les fichiers.

---

## Mise en ligne

Site 100 % statique (HTML / CSS / JavaScript, aucune installation).

- **En ligne** : GitHub Pages, branche `claude/radiologichub-website-ss89g9`, dossier racine. Chaque modification poussée est en ligne en 1 à 2 minutes.
- **En local** : ouvrir `index.html` dans un navigateur.

---

## Tests

Les règles de calcul du suivi oncologique, les recommandations Fleischner, le schéma prostatique et le traitement de la dictée vocale sont couverts par des tests unitaires (lanceur intégré de Node ≥ 18, **aucune dépendance**) :

```
npm test        # ou : node --test tests/*.test.js
```

Les tests n'utilisent que des **cas fictifs** (identifiants `TEST-0001`…) : aucune donnée patient dans le dépôt. Toute modification d'une règle ou d'un seuil (`suivi/seuils.js`, `regles/fleischner.js`) doit être accompagnée de ses tests.

---

## À faire / points en attente

- [ ] **Formulaire d'inscription** : l'envoi n'est pas branché (voir `TODO` dans `script.js`) → Formspree, Netlify Forms ou back-end.
- [ ] **Tarifs, horaires, nombre de cas** : valeurs d'exemple à remplacer.
- [ ] **Images manquantes** : fiche pancréas (sémiologie, extension) et fiche Crohn — voir les README de `assets/fiches/pancreas/` et `assets/fiches/crohn/`.
- [ ] **Fiche Crohn** : harmoniser la préparation de l'entéro-IRM (« 1 L / 45-60 min » vs « 1,5-2 L / 30 min-1 h »).
- [ ] **Fiche rectum** : préciser les légendes des images « formes tumorales » et « mesure axiale 1,57 cm ».
- [ ] **Fiches des autres spécialités** : Neuro, Thorax, Traumato, Vasculaire, Pédiatrie.
- [ ] **Lecteur de séries** (défilement dans un scanner / IRM) : en attente d'une série anonymisée exportée en JPG.
- [ ] **Comptes rendus types** : continuer à intégrer les formules normales du service (7 reçues le 07/10/2026 ; aucune en échographie pour l'instant) ; relire et valider médicalement les ~55 phrases automatiques rédigées par Claude (`cr-data.js`).
- [ ] **Suivi oncologique** : étapes 2 à 7 (moteur RECIST 1.1, texte, contrôles, Lugano — y compris couleurs du schéma —, import texte libre, QR / courbe / iRECIST) ; faire vérifier `suivi/seuils.js` par un radiologue ; ajouter éventuellement le lien dans le menu principal (actuellement depuis la page Comptes rendus).
- [ ] **Dictée vocale** : tester au vrai micro sur Chrome, Edge et Safari (le navigateur de test n'a pas de micro : vérification avec une reconnaissance simulée) ; enrichir `dictee/corrections.js` avec le vocabulaire du service ; **V2 : moteur Whisper local (WebGPU)** dans `dictee/moteurs.js`.
- [ ] **Schémas & calculateurs** : faire valider les règles et les textes (PI-RADS, BI-RADS, EU-TIRADS, Fleischner, RECIST, Lugano) ; PI-RADS : la zone centrale et le stroma antérieur suivent par défaut l'algorithme de la zone périphérique / de transition (modifiable) ; ajouter d'autres outils si besoin (Lung-RADS, LI-RADS, O-RADS, Bosniak…).
- [ ] **IRM médullaire / IRM cérébrale et médullaire** : la technique cite des coupes axiales sur « les 3 derniers étages lombaires » (ou « les derniers étages lombaires ») mais le CR décrit L1-L2 à L5-S1, et les coupes coronales T2 FatSat du bassin ne sont pas citées dans la technique — à vérifier.
- [ ] **Nom de domaine** `www.radiologichub.com` : à acheter et configurer (DNS + réglages GitHub Pages), puis mettre à jour le lien « Site en ligne » ci-dessus.

---

## Historique des modifications

| Date | Modification |
|---|---|
| 07/10/2026 | Dictée vocale : vocabulaire radiologique ajouté au dictionnaire (isodense, hypodense, en isosignal / hyposignal, cérébriforme, rehaussement centripète en mottes, magma ganglionnaire, tronc cœliaque, artères mésentériques et environ 150 termes souvent mal reconnus) ; règles par famille (hypo / hyper / iso, préfixes savants, intra / péri / rétro…, adjectifs anatomiques composés) ; nouvelle liste « expressions » corrigées en contexte ; tests |
| 07/10/2026 | Comptes rendus : **dictée vocale** (V1, Web Speech API fr-FR) — micro global, micros par section et sous-titre (« Foie : »…), sur le champ `[ … ]` sélectionné et sur les zones de texte ; commandes vocales (ponctuation, à la ligne, paragraphe, effacer le dernier mot, conclusion, aller à …, insérer modèle / phrase avec confirmation vocale remplacer / insérer / annuler, arrêter) ; dictionnaire de corrections configurable (`dictee/corrections.js`), décimales, dimensions « 12 sur 8 sur 6 » → 12 x 8 x 6 mm, unités ; alerte identité ; raccourcis configurables F9 / Échap (pédale USB possible) ; message clair sous Firefox ; architecture prête pour un moteur Whisper local (V2) ; tests unitaires |
| 07/10/2026 | Nouvel onglet **Uro** dans les fiches rapides : fiches « IRM de la prostate : diagnostic du cancer » (7 commandements, PI-QUAL, signal de fond, PI-RADS v2.1 ZP / ZT, cartographie sectorielle) et « IRM de la prostate : bilan d'extension » (TNM 2016, iT3a et score EPE, iT3b, iT4, iN, iM), d'après les planches du cours sans les images IRM ; calculateur **PI-RADS** : vues **sagittale et coronale** ajoutées sous les coupes axiales, lésions projetées automatiquement ; schéma commun `schemas/prostate.js` et ses tests |
| 07/10/2026 | Fleischner : la case « périscissural typique » devient une grille de critères conforme à la recommandation (contact scissure / plèvre, forme ovale-lenticulaire-triangulaire, homogène à contours lisses, tous exigés ; sous la carène et ligne septale proposés mais non exigés ; < 10 mm ; signe suspect = règles habituelles), avec alerte si critères incomplets et description dans le texte |
| 07/10/2026 | Comptes rendus : nouvel outil **Fleischner 2017** (nodules pulmonaires de découverte fortuite) — schéma des lobes cliquable, nodules solides / verre dépoli / partiellement solides, diamètre moyen ou volume, risque faible / élevé / non précisé, nodules multiples guidés par le plus suspect, contextes non applicables (dépistage, cancer, immunodépression, < 35 ans), texte prêt à insérer ; règles dans `regles/fleischner.js` avec tests ; mot-clé `fleischner` retiré de la phrase « nodule » (il ouvre l'outil) |
| 07/10/2026 | Suivi oncologique : schéma anatomique « Vue d'ensemble » — lésions placées automatiquement d'après l'organe et le territoire (côtés, segments hépatiques, lobes, stations ganglionnaires, vertèbres), couleur selon l'évolution (baisse / stable / hausse / non évaluable), forme selon le type, lien schéma ↔ tableau, export PNG ; nouveau fichier `suivi/schema.js` et ses tests |
| 07/10/2026 | Suivi oncologique — étape 1 : nouvelle page `suivi-oncologique.html` (registre des lésions à identifiant fixe C/NC/N, examens avec report automatique, tableau comparatif baseline / nadir / précédent / actuel, sommes et nadir automatiques, export / import JSON, mode éphémère), seuils documentés (`suivi/seuils.js`), tests unitaires (`npm test`) |
| 07/10/2026 | Comptes rendus : envoi par e-mail avec les schémas — image des schémas joints copiée automatiquement (à coller sous « Schéma : »), option Partager sur téléphone (pièce jointe), boutons Copier l'image / Télécharger sous les schémas joints |
| 07/10/2026 | Comptes rendus : schémas et calculateurs intégrés — PI-RADS v2.1 (carte des secteurs prostatiques), BI-RADS (cadran horaire des seins), EU-TIRADS (schéma thyroïdien), RECIST 1.1 et Lugano 2014 ; texte inséré au curseur, schémas joints / copiés / téléchargés, outils suggérés selon le contenu du compte rendu |
| 07/10/2026 | Comptes rendus : seuls les modèles du service sont conservés (12 modèles rédigés par Claude retirés, ainsi que les boutons « Compte rendu type » des fiches) ; ajout de la radio du bassin et de l'IRM cérébrale et médullaire (+ phrases `rxbassinnormal`, `encephaleirm`) |
| 07/10/2026 | Comptes rendus : choix des modèles en deux étapes — 1 · examen (Échographie, Radiographie standard, IRM, TDM), 2 · spécialité |
| 07/10/2026 | Comptes rendus : choix de la messagerie pour l'envoi (Gmail par défaut, Outlook 365, Outlook.com, application Mail) — l'application Mail du Mac sans compte configuré bloquait l'envoi |
| 07/10/2026 | Comptes rendus : boutons ↶ Retour / ↷ Rétablir (historique propre à l'éditeur, Ctrl + Z / Ctrl + Y) et envoi par e-mail en un clic (ouvre la messagerie avec le CR pré-rempli, adresse mémorisée) |
| 07/10/2026 | Comptes rendus : les 13 premiers modèles passent au format du service (TECHNIQUE / RÉSULTAT / AU TOTAL, puces « • », « TDM » au lieu de « scanner ») ; arthrose interapophysaire en choix `[Absence d'arthrose / Arthrose]` à chaque étage de l'IRM médullaire |
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
