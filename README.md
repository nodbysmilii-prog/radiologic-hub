# RadiologicHub

**RadiologicHub** est le site des masterclass de **radiologie d'urgence** : des formations par spécialité (neuro, digestif, thorax, polytraumatisé, vasculaire, pédiatrie), des **fiches rapides** de révision, des **cas cliniques annotés**, un outil de **comptes rendus types** avec phrases automatiques, un **réseau de confrères** (Communauté : profils, cas partagés, messagerie) et la **mise en relation pour les remplacements**.

🌐 **Site en ligne :** https://nodbysmilii-prog.github.io/radiologic-hub/

> Dernière mise à jour du README : 10 octobre 2026

---

## Sommaire

1. [Ce que contient le site](#ce-que-contient-le-site)
2. [Fiches rapides disponibles](#fiches-rapides-disponibles)
3. [Comptes rendus types et phrases automatiques](#comptes-rendus-types-et-phrases-automatiques)
4. [Suivi oncologique (RECIST 1.1 / Lugano)](#suivi-oncologique-recist-11--lugano)
5. [Remplacements (mise en relation)](#remplacements-mise-en-relation)
6. [Communauté (réseau des radiologues)](#communauté-réseau-des-radiologues)
7. [Charte graphique](#charte-graphique)
8. [Code couleur des fiches](#code-couleur-des-fiches)
9. [Organisation des fichiers](#organisation-des-fichiers)
10. [Ajouter ou modifier du contenu](#ajouter-ou-modifier-du-contenu)
11. [Mise en ligne](#mise-en-ligne)
12. [Tests](#tests)
13. [À faire / points en attente](#à-faire--points-en-attente)
14. [Historique des modifications](#historique-des-modifications)

---

## Ce que contient le site

### Page d'accueil (`index.html`)

| Section | Contenu |
|---|---|
| **Accueil** | Accroche « La radiologie d'urgence, cas par cas », compteurs animés, carte « Cas express » |
| **Masterclass** | 6 fiches de masterclass filtrables (Essentiel / Avancé), chacune avec une fenêtre de détail (objectifs, thèmes, format) |
| **Cas du jour** | Mini-quiz interactif sur 3 cas (striatopathie diabétique, hernie d'Amyand, sarcome de l'artère pulmonaire) avec score — accessible depuis l'accueil et le pied de page (l'entrée du menu est devenue « Communauté ») |
| **Fiche flash** | 4 cartes à retourner : hypersignal T1 des noyaux gris centraux |
| **Le format** | 6 points forts présentés en « blobs » colorés |
| **Une journée type** | Programme heure par heure (exemple : Neuro-urgences) |
| **Nos fiches** | Galerie des visuels RadiologicHub |
| **Tarifs** | 3 formules (module unique, pack 3 modules, cursus complet) |
| **FAQ** | Questions fréquentes repliables |
| **Inscription** | Formulaire avec vérification des champs |

### Fiches rapides (`fiches-rapides.html`)

Index des fiches avec **un onglet par spécialité** (Digestif, Neuro, Thorax, Traumato, Uro, Imagerie de la femme, Ostéo-articulaire, Cardio-vasculaire, Pédiatrie). Les spécialités sans fiche affichent « Bientôt disponible ».

Chaque fiche (`fiches/…html`) propose :

- une **légende du code couleur cliquable** (un clic n'affiche plus qu'une catégorie) ;
- un **sommaire fixe** et une **barre de progression de lecture** ;
- des **tuiles, frises, tableaux et schémas** dans le style du site ;
- des **images** qui s'agrandissent au clic (les emplacements sans image restent masqués) ;
- des cartes **« Testez-vous »** à retourner ;
- un bouton **Imprimer / PDF**.

### Comptes rendus types (`comptes-rendus.html`)

Éditeur de compte rendu avec bibliothèque de modèles et **phrases automatiques** — voir la [section dédiée](#comptes-rendus-types-et-phrases-automatiques).

### Remplacements (`remplacements.html`)

Mise en relation des radiologues remplaçants (spécialistes, résidents R3 à R5) avec les cliniques et cabinets de Tunisie : inscriptions validées par l'administrateur, calendrier des disponibilités, demandes, propositions par e-mail avec réponse en un clic — voir la [section dédiée](#remplacements-mise-en-relation). Page de réponse aux boutons des e-mails : `remplacements-reponse.html`.

### Communauté (`communaute.html`)

Réseau social des radiologues : connexion **Google** (ou lien par e-mail), profil avec photo, publication de **cas anonymisés** sous son nom « Dr … » (comptes vérifiés), j'aime, commentaires, abonnements, **messagerie privée** en temps réel « à la Messenger », notifications, signalements et administration — voir la [section dédiée](#communauté-réseau-des-radiologues). Entrée **Communauté** du menu (à la place de « Cas du jour ») et du pied de page.

### Mentions légales (`mentions-legales.html`)

Éditeur, hébergement, **protection des données personnelles** (loi organique n° 2004-63, INPDP ; ancre `#donnees`, liée depuis la case de consentement des inscriptions), données de la Communauté (`#communaute`) et **conditions d'utilisation** de la Communauté (`#conditions`, liées depuis la case de consentement du profil). Les passages entre crochets sont à compléter. Lien dans le pied de page de toutes les pages.

---

## Fiches rapides disponibles

| Spécialité | Fiche | Fichier | Particularités |
|---|---|---|---|
| Digestif | **Adénocarcinome canalaire du pancréas** | `fiches/adenocarcinome-pancreas.html` | Tableau vasculaire filtrable, feu tricolore de résécabilité, **annexe « Cas & images »** repliable avec 2 carrousels annotés (cas d'extension vasculaire, signes typiques A–D, variante : sténose athéromateuse du tronc cœliaque A–B, diagnostics différentiels : métastases pancréatiques, tumeur neuroendocrine, pancréatite auto-immune) |
| Digestif | **Imagerie de la maladie de Crohn** | `fiches/maladie-de-crohn.html` | Objectifs numérotés, préparation de l'entéro-IRM en frise, activité vs chronicité, phénotypes B1–B3 |
| Digestif | **IRM pelvienne dans le cancer du rectum** | `fiches/irm-cancer-rectum.html` | 13 images du cours, onglets T1–T4, jauge EMS, échelle mrTRG, **checklist du compte rendu** mémorisée dans le navigateur |
| Uro | **IRM de la prostate : diagnostic du cancer** | `fiches/irm-prostate-diagnostic.html` | D'après la planche du cours, **sans les images IRM** : les 7 commandements (A–G), PI-QUAL (tableau 1–5 et implications), mesure de la glande et PSAd, signal de fond (Bura 2021, 1–4), onglets **ZP · diffusion** / **ZT · T2** (définitions des scores 1–5 et tableaux de décision PI-RADS v2.1 avec la perfusion / la diffusion accessoires), **cartographie sectorielle** dessinée (coupes axiales base / milieu / apex, vues sagittale et coronale, zones colorées, correspondances LPZ = PZpl…), PRECISE / Likert / PI-RR, checklist du CR, 6 cartes « Testez-vous » |
| Uro | **IRM de la prostate : bilan d'extension** | `fiches/irm-prostate-extension.html` | D'après la planche du cours, **sans les images IRM** : à savoir (pas de vraie capsule…), **TNM 2016**, signes iT3a, **score EPE 0–3** avec schémas dessinés et Se / VPP / VPN, vésicules séminales iT3b (Likert, 3 types d'extension en schéma), iT4, iN (IRM, TEP-choline, TEP-PSMA), iM (scintigraphie, scanner TAP), checklist du CR, 6 cartes « Testez-vous » |
| Imagerie de la femme | **Le myome utérin dans tous ses états** | `fiches/myome-uterin.html` | D'après la fiche du cours, **sans images** : généralités, indications et intérêts de l'IRM, protocole (T2 3 plans, T1 avec et sans saturation de la graisse, diffusion avec ADC, ± injection), **classification FIGO** (tableau des types 0 à 8 et 2-5 + **planche dessinée dans le style des schémas FIGO classiques** : gros corps utérin, cavité sombre, col et vagin en double tube, un myome par type à sa profondeur avec sa légende, étiquettes Interstitiel / Sous-muqueux / Sous-séreux, fond sombre ; sur téléphone, dessin seul centré à la largeur de l'écran et légendes en liste dessous), alertes type 7 (largeur du pédicule, torsion) et type 2-5 (encorbellement vasculaire), myome simple, onglets des 4 dégénérescences, 3 remaniements, myome cellulaire et léiomyosarcome, **arbre décisionnel T2 / rehaussement / ADC dessiné en diagramme** (arborescence avec réglette d'ADC 0,8 / 1,2, diagnostics colorés bénin / prudence / suspect, chemin mis en évidence au survol, clic vers la partie de la fiche ; arbre vertical sur mobile), take home messages, checklist du CR, 6 cartes « Testez-vous » |
| Cardio-vasculaire | **IRM des myocardites** | `fiches/irm-myocardite.html` | D'après la fiche du cours (2 pages, sans images) : introduction, diagnostic clinique, triade des indications, protocole (T2 STIR, cartographies T2 et T1, rehaussement tardif, ECV), trois signes cardinaux avec **schéma « un même foyer, trois séquences »**, **critères de Lake Louise 2018** en visuel mnémotechnique (« **Trempé** » T2 **+** « **Touché** » T1 = myocardite ; les 2 « P » de soutien : Péricarde et Pompe ; verdicts 2/2, 1/2, 0/2 avec IRM de contrôle à 1-2 semaines), **calculateur Lake Louise** (phrase de conclusion pour le compte rendu), **7 aspects IRM à connaître, chacun avec son schéma « façon IRM »** (coupe petit axe + œil-de-bœuf AHA : parvovirus B19 sous-épicardique latéral, HHV6 septal, motif antéro-septal de mauvais pronostic, valeur pronostique du rehaussement tardif, cartographie T1, IRM à distance œdème / fibrose, myocardite post-vaccin ARNm), sans citation d'auteurs ni chiffres d'études, pièges (ischémique vs non ischémique, artefacts), take home, checklist du CR, 6 cartes « Testez-vous » ; section « Cas du service » qui s'affiche quand des images anonymisées sont déposées dans `assets/fiches/myocardite/` |
| Ostéo-articulaire | **Spondylodiscite infectieuse** | `fiches/spondylodiscite.html` | Fusion de deux cours ; tableaux comparatifs pyogènes / tuberculose / brucellose filtrables, onglets par germe, quiz « Quel germe ? », formes rares, diagnostic différentiel, annexe avec 2 cas annotés (tuberculose, *Bacillus cereus*) |

---

## Comptes rendus types et phrases automatiques

Page `comptes-rendus.html` (lien « Comptes rendus » dans le menu de toutes les pages).

**Fonctionnement**

1. **Modèles** (colonne de gauche, onglet « Modèles ») : choisir d'abord l'**examen** (Échographie, Radiographie standard, Mammographie, IRM, TDM, avec le nombre de modèles ; ou « Tous les examens »), puis la **spécialité** (seules celles qui ont des modèles pour cet examen sont proposées) ; un clic charge le compte rendu type dans l'éditeur. L'examen choisi est mémorisé. Les modèles perso sont classés d'après leur titre (« ÉCHOGRAPHIE… », « RADIOGRAPHIE… », « IRM… », « TDM… / SCANNER… ») ; sans examen reconnu, ils apparaissent pour tous les examens.
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

**Schémas & calculateurs** (`cr-tools.js`, `cr-tools.css`) — chaque outil s'ouvre dans une fenêtre : formulaire, calcul automatique, aperçu du texte, puis **Insérer dans le compte rendu** (au curseur). Pour les six schémas (PI-RADS, BI-RADS, EU-TIRADS, Fleischner, FIGO, CAD-RADS) : **Joindre le schéma** (vignette sous l'éditeur, imprimée avec le compte rendu), **Copier l'image** (à coller dans un logiciel ou un e-mail) et **Télécharger le schéma** (PNG).

- **Ouverture** : boutons au-dessus de l'éditeur ; le bouton s'allume « suggéré » quand le texte du compte rendu en parle (prostate → PI-RADS, sein / mammographie → BI-RADS, thyroïde → EU-TIRADS, nodule pulmonaire / micronodule / verre dépoli / nodule d'un lobe pulmonaire → Fleischner, myome / fibrome / FIGO → FIGO, coroscanner / CAD-RADS / score calcique / coronaire / dominance → CAD-RADS, RECIST / lésions cibles → RECIST, lymphome / Hodgkin / Deauville → Lugano) ; ou en tapant le mot-clé dans l'éditeur (`pirads`, `birads`, `tirads`, `fleischner` / `nodulepulm`, `figo` / `myomes`, `cadrads` / `scorecalcique` / `dominance`, `recist`, `lugano` / `cheson` / `deauville`) puis Tab. En tapant `nodule`, la bulle propose à la fois la phrase « Nodule pulmonaire » et l'outil Fleischner.
- **PI-RADS v2.1 (prostate)** : carte des secteurs en coupes axiales (base, tiers moyen, apex ; ZP antérieure / postérolatérale / postéromédiale, zone centrale à la base, ZT antérieure / postérieure, stroma fibromusculaire antérieur, vésicules séminales, sphincter) — un clic ajoute ou retire un secteur pour la lésion active (4 lésions max) ; sous les coupes axiales, **vue sagittale** (antérieur à gauche) et **vue coronale** (droite à gauche) où chaque lésion est projetée automatiquement (niveau base / milieu / apex, antérieur / postérieur, droite / gauche ; zones colorées selon le score). Schéma commun : `schemas/prostate.js`. Scores T2, diffusion, perfusion, extension extraprostatique ; catégorie calculée selon l'algorithme v2.1 (zone périphérique : diffusion dominante, diffusion 3 + perfusion positive → 4 ; zone de transition : T2 dominant, T2 2 + diffusion ≥ 4 → 3, T2 3 + diffusion 5 → 4) ; algorithme choisi automatiquement selon les secteurs (modifiable). Volume prostatique (ellipsoïde × 0,52) et densité de PSA. Lésion index et conclusion avec la définition officielle de la catégorie. Alertes : taille ≥ 15 mm, extension extraprostatique, perfusion ou diffusion manquante.
- **BI-RADS (sein)** : deux seins en cadran horaire (vue de face, sein droit à gauche) ; un clic place la lésion et calcule le rayon horaire (à la demi-heure), la distance au mamelon et le quadrant (QSE, QSI, QIE, QII, unions, rétro-aréolaire). Densité ACR a–d, lexique (masse, kyste, microcalcifications, distorsion, asymétrie, rehaussement non masse, ganglion), catégorie 0–6 (4A/4B/4C) choisie par le radiologue ; catégorie par sein = la plus élevée ; conduite à tenir générique. Alerte si un descripteur suspect est associé à une catégorie ≤ 3.
- **EU-TIRADS 2017 (thyroïde)** : schéma des lobes (tiers supérieur / moyen / inférieur, isthme) ; un clic place le nodule (6 max). Score calculé : kystique pur ou spongiforme → 2 ; forme non ovale, contours irréguliers, microcalcifications ou hypoéchogénicité marquée → 5 ; légèrement hypoéchogène → 4 ; iso- ou hyperéchogène → 3. Indication de cytoponction selon le plus grand diamètre (> 20 / 15 / 10 mm pour EU-TIRADS 3 / 4 / 5 ; 5–10 mm en EU-TIRADS 5 : surveillance active ou cytoponction à discuter). Volume thyroïdien facultatif, adénopathie suspecte.
- **Fleischner 2017 (nodule pulmonaire de découverte fortuite)** : schéma des poumons de face (poumon droit à gauche ; LSD, LM, LID, LSG, lingula, LIG) ; un clic place le nodule actif et fixe son lobe (6 nodules max). Par nodule : type (solide, verre dépoli pur, partiellement solide), grand et petit axe (**diamètre moyen arrondi au mm**), volume facultatif pour un nodule solide (< 100 / 100–250 / > 250 mm³, prioritaire sur le diamètre), composante solide pour un nodule partiellement solide, morphologie suspecte, critères de bénignité. **Ganglion intrapulmonaire** (nodule solide uniquement) selon Fleischner 2017 : pas de surveillance, même au-delà de 6 mm, si les **trois critères** sont cochés — au contact d'une scissure ou de la plèvre, forme ovale / lenticulaire / triangulaire, homogène à contours lisses — sans signe suspect et avec un diamètre moyen < 10 mm (Fleischner ne fixe pas de limite haute ; limite des séries publiées et de la définition du nodule juxtapleural de Lung-RADS v2022). Localisation sous la carène et ligne septale : arguments proposés mais **non exigés** (ils ne le sont pas dans la recommandation) ; alerte si les critères sont incomplets. Contexte : découverte fortuite chez un patient de 35 ans ou plus, sinon **non applicable** (dépistage → Lung-RADS, cancer connu, immunodépression, moins de 35 ans) ; risque faible / élevé, ou **non précisé → les deux conduites** dans le texte quand elles diffèrent (le risque ne module que les nodules solides) ; « autres nodules non détaillés » = nodules multiples. Conduite selon le tableau 2017 (solide unique < 6 / 6–8 / > 8 mm, solides multiples, verre dépoli pur, partiellement solide avec composante solide < ou ≥ 6 mm = hautement suspect s'il persiste, subsolides multiples) ; avec plusieurs nodules, conduite guidée par le **nodule le plus suspect** (conduite la plus intensive, puis le plus gros). Pastille de couleur par nodule (vert : pas de surveillance ou optionnelle ; ambre : 6–12 mois ; orange : 3–6 mois ; rouge : 3 mois / TEP / prélèvement ou hautement suspect). Texte : description de chaque nodule, ligne du tableau utilisée, conduite, et technique du contrôle (TDM faible dose sans injection, coupes fines jointives ≤ 1,5 mm). Alertes : un seul diamètre saisi, nodule > 30 mm (masse), composante solide manquante ou plus grande que le nodule. Règles dans `regles/fleischner.js` (références MacMahon 2017 et Bankier 2017, testées sous Node).
- **FIGO (myomes utérins)** : grande **vue sagittale** dessinée comme la planche FIGO de la fiche (utérus antéversé, antérieur à gauche : fundus à gauche, paroi postérieure en haut, antérieure en bas, col et vagin à droite) et **vue coronale** en médaillon (droite de la patiente à gauche) pour les parois latérales — sur téléphone, médaillon placé sous la vue sagittale pour que tout le schéma tienne en largeur (l'image exportée garde la mise en page horizontale) ; un clic place le myome actif et fixe sa **paroi** (antérieure, postérieure, fundique, latérale droite / gauche) et son **niveau** (fundus, corps, isthme) — un clic sur le col le classe FIGO 8 (8 myomes max). Chaque myome se dessine **à la profondeur de son type FIGO** (0 intracavitaire pédiculé → 7 sous-séreux pédiculé, 2-5 sur toute l'épaisseur de la paroi), dans la couleur de sa catégorie (sous-muqueux orange, interstitiel bleu-vert, sous-séreux bleu, transmural lavande, autre gris ; bulle blanche tant que le type n'est pas choisi) ; une paroi absente d'une vue y est projetée en pointillés. Par myome : type FIGO, paroi et niveau (ou siège pour le type 8 : col, ligament large droit / gauche, parasite), trois diamètres et volume, largeur du pédicule (type 7), encorbellement vasculaire (type 2-5), **caractérisation IRM selon l'arbre décisionnel** de la fiche (signal T2, hypersignal T1, rehaussement, ADC en signal T2 intermédiaire → myome simple, dégénérescence hyaline / kystique / myxoïde, nécrobiose, myome cellulaire, myome indéterminé, suspicion de sarcome), remaniement (hémorragique, graisseux, calcifié), contours, remaniements nécrotico-hémorragiques. Utérus : position, trois diamètres et volume, autres myomes non détaillés, adénomyose, endométriose. Texte : utérus (polymyomateux), description de chaque myome, conclusion avec le nombre par catégorie, le plus volumineux et les arguments en faveur d'un léiomyosarcome. Alertes : pédicule non mesuré, encorbellement à noter, dégénérescence myxoïde ou myome cellulaire (diagnostic différentiel du léiomyosarcome), arguments de sarcome. Règles dans `regles/myome.js`, schéma dans `schemas/uterus.js` (partagé avec la fiche), testés sous Node.
- **CAD-RADS 2.0 (coroscanner)** : **schéma de l'arbre coronaire** à plat (18 segments SCCT, numérotés ; coronaire droite en rouge, IVA en bleu, circonflexe en vert, tronc commun en gris) **redessiné selon la dominance** choisie — **droite** (IVP et rétroventriculaire gauche issues de la coronaire droite), **gauche** (issues de la circonflexe, coronaire droite grêle), **codominance** (IVP de la coronaire droite, rétroventriculaire gauche de la circonflexe) — avec la bissectrice en option ; un clic sur un segment place la lésion active (8 max). Par lésion : segment, sténose (plaque sans sténose, 1-24, 25-49, 50-69, 70-99, 100 %, non analysable), type de plaque (calcifiée, partiellement calcifiée, non calcifiée), stent, 4 critères de **plaque à haut risque** (remodelage positif, plaque hypodense < 30 UH, calcifications ponctuées, signe de l'anneau ; HRP à partir de 2). Examen : **score calcique d'Agatston** (avec **tableau des classes** 0 · 1-10 · 11-100 · 101-400 · > 400, ligne du patient surlignée), ischémie (FFR-CT / perfusion : I+, I−, I±), pontage, exception (anomalie de naissance, dissection, anévrisme, fistule…). Calcul : catégorie 0 à 5 (4B si tronc commun ≥ 50 % ou trois territoires ≥ 70 %), **N** si un segment n'est pas analysable sans autre sténose ≥ 50 %, **charge en plaque P1-P4** (score calcique ou nombre de segments atteints, la plus élevée), modificateurs dans l'ordre N / HRP / I / S / G / E (ex. `CAD-RADS 4A/P2/HRP`) ; **tableau des catégories CAD-RADS 2.0** avec la conduite proposée (douleur thoracique stable), catégorie du patient surlignée. Texte : score calcique, dominance, chaque lésion, segments non analysables, conclusion avec le code CAD-RADS et la conduite. Alertes : segment absent avec la dominance choisie, score calcique positif sans lésion décrite, un seul critère HRP, 4B, N. Règles dans `regles/cadrads.js`, schéma dans `schemas/coronaires.js`, testés sous Node.
- **RECIST 1.1** : jusqu'à 5 lésions cibles (alerte si > 2 par organe), case « ganglion » (petit axe) ; sommes initiale / nadir / actuelle et variations ; réponse des cibles (RC : disparition et ganglions < 10 mm ; RP : ≥ 30 % de baisse / initial ; MP : ≥ 20 % et ≥ 5 mm de hausse / nadir ; sinon MS) ; lésions non cibles, nouvelles lésions et réponse globale selon le tableau RECIST 1.1.
- **Lugano 2014 (Cheson)** : mode **TEP-TDM** (score de Deauville 1–5 avec définitions, évolution de la fixation, nouvelles lésions, moelle → RMC / RMP / ARM / MMP, mention intermédiaire / fin de traitement) ou mode **TDM** (jusqu'à 6 lésions LDi × SDi initial / nadir / actuel, SPD et variation, critères de progression par lésion, rate, lésions non mesurées → RC / RP / MS / MP).
- Avertissement dans chaque fenêtre : aide à la rédaction, ne remplace pas l'appréciation du radiologue.

**Stockage** : le brouillon, les phrases, les modèles perso, les schémas joints et l'adresse e-mail sont enregistrés **dans le navigateur** (localStorage), rien n'est envoyé. Message de confidentialité sur la page : ne pas saisir de données identifiantes.

**Contenu fourni (`cr-data.js`)**

**37 comptes rendus types, uniquement les formules normales du service** : 8 fournies en PDF le 07/10/2026, 28 fournies en Word le 08/10/2026 et le coroscanner fourni en photo le 10/10/2026 (les modèles rédigés au départ par Claude ont été retirés à la demande de l'utilisateur).

*Lot du 07/10/2026 (PDF)* : Reprises mot pour mot avec leurs puces « • » ; seules corrections : accents sur les majuscules, accords et coquilles (« constitutionnelle », « contenant-contenu », « 4e », « polygone de Willis », « selon différentes pondérations », « intra- ou extra-axial »), points finaux, titre de la radio du bassin (le document indiquait « IRM du bassin de face »), intertitres « Au niveau dorsal » et « Au niveau du bassin » ajoutés dans les IRM du rachis, et quelques champs `[ … ]` (côté, compartiment, conclusion, `[Absence d'arthrose / Arthrose]` interapophysaire à chaque étage).

*Lot du 08/10/2026 (Word, 28 formules)* : texte repris tel quel, mis au format du site (titre en capitales, une constatation par ligne précédée de « • », intertitres conservés), avec les corrections suivantes :
- **retirés** : formules de politesse et **signatures des médecins** ; **restes du patient précédent** remplacés par des champs à compléter — renseignements cliniques (`[renseignements cliniques]`, `[indication]`), mesures (thyroïde, reins, résidu vésical, prostate, vitesses vertébrales, grand axe des reins → `[x]`) ;
- **formules qui contenaient des anomalies**, rendues normales par défaut avec le texte du service en choix : radio du rachis lombaire (`[Absence de pincement discal / Discret pincement discal en « L5-S1 »]`, arthrose inter-apophysaire postérieure, ostéophytes), scanner du rachis cervical (à chaque étage : saillie discale ou barre unco-disco-ostéophytique, plicature des ligaments jaunes, rétrécissement foraminal ; conclusion « cervicarthrose étagée… »), scanner du rachis lombaire (conclusion « discopathie dégénérative et protrusive » en choix, les résultats étant normaux), échographie de l'épaule courte (arthropathie acromio-claviculaire), écho-doppler des TSA (minime infiltration athéromateuse) ;
- **choix ajoutés** : densité mammaire BI-RADS `[type A / B / C / D]` (le document indiquait type C), Keros `[I / II / III]` (le document indiquait II), côté de la cheville et de l'épaule ;
- accents sur les majuscules, accords et coquilles (« dure-mériens », « aqueducale », « ostéophytique », « troncs supra-aortiques », « anévrismale », « de morphologie et de taille normales », « tendon du long biceps »…), conclusions vides remplacées par `[conclusion]`.

Deux nouvelles spécialités (**ORL / tête et cou**, **TAP / corps entier**), une spécialité **Sein** et un nouvel examen **Mammographie**.

| Examen | Spécialité | Comptes rendus types |
|---|---|---|
| TDM | Neuro | TDM cérébrale sans injection — normale · sans injection (formule courte) · sans et avec injection |
| TDM | Thorax | TDM thoracique sans injection — normale · sans injection (variante) · avec injection · angioscanner thoracique |
| TDM | TAP / corps entier | TAP sans et avec injection · cérébral + TAP · cervico-TAP |
| TDM | Digestif | Abdomino-pelvien sans injection · sans et avec injection · entéroscanner |
| TDM | Uro-gynéco | Uroscanner sans et avec injection (temps excréteur) · uroscanner sans injection |
| TDM | ORL / tête et cou | Massif facial (sinus) · cone beam des sinus · rochers |
| TDM | Ostéo-articulaire | Rachis cervical (choix pour la cervicarthrose) · rachis lombaire |
| TDM | Cardio-vasculaire | Coroscanner normal (d'après la photo du compte rendu du service, **uniquement TECHNIQUE, RÉSULTAT et CONCLUSION** : en-tête, renseignements cliniques, « examen de qualité sous-optimale » et données du patient retirés, FEVG sans valeur `[x] %`, dominance au choix, « sinus coronaire droit / gauche » à la place de « sinus antérieur », conclusion CAD-RADS 0) |
| IRM | Neuro | IRM cérébrale et médullaire — normale (encéphale avec injection et angiographie + rachis étage par étage + bassin) |
| IRM | Ostéo-articulaire | IRM médullaire (rachis entier) — normale |
| Radiographie standard | Ostéo-articulaire | Rachis lombaire (F + P) — normal · Rachis lombaire (F + P) — normal ou dégénératif · Bassin (F) — normal · Genou (F + P) — normal · Genou (F + P) — gonarthrose |
| Radiographie standard | Traumato | Cheville — normale |
| Mammographie | Sein | Mammographie + échographie mammaire (bilan sénologique) |
| Échographie | Sein · Digestif · Uro-gynéco · ORL · Ostéo-articulaire · Cardio-vasculaire | Échographie mammaire · abdomino-pelvienne · rénale et vésico-prostatique · cervicale (thyroïde, glandes salivaires) · épaule (détaillée et courte) · écho-doppler des troncs supra-aortiques |

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

## Remplacements (mise en relation)

Page `remplacements.html` (entrée **Remplacements** du menu). Mise en relation de **remplaçants** (radiologues spécialistes, résidents R3 à R5) avec des **cliniques et cabinets** en Tunisie ; un agent envoie par e-mail les propositions et les confirmations. Français, pensé d'abord pour le téléphone, heure de Tunis, dates JJ/MM/AAAA, montants en TND. **Aucune donnée patient** dans ce module.

**Mode démonstration** (tant que `remplacements/config.js` est vide) : tout fonctionne dans le navigateur avec des données **fictives** (4 remplaçants, 2 structures, 1 remplaçante et 1 cabinet en attente de validation, 1 administrateur, 1 demande déjà publiée). Une barre « Démo » permet de **se connecter comme** n'importe quel utilisateur fictif, d'**avancer l'horloge** (+12 h, +1 jour : l'agent tourne — relances, rappels, réalisations, récapitulatifs), d'ouvrir la **boîte d'envoi** (aperçu des e-mails, pièces jointes .ics et PDF ; les boutons des e-mails fonctionnent) et de **réinitialiser**.

**Parcours** :

| Qui | Ce qu'il fait |
|---|---|
| **Remplaçant** | S'inscrit (nom, prénom, téléphone, e-mail, statut spécialiste ou résident + année, affectation, 6 compétences, gouvernorats acceptés, honoraires journaliers indicatifs, justificatif facultatif, consentement) ; après validation : coche ses **disponibilités** sur un calendrier mensuel (journée, matin, après-midi, garde ; « pinceau » + remplissage du mois) ; répond aux **propositions** (« Je suis disponible » / « Pas disponible »), dans son espace ou par les boutons de l'e-mail ; voit ses **missions**, le contrat PDF et l'agenda .ics, peut annuler (la structure est prévenue, la demande remise en ligne) ; tableau de **honoraires** (mois, année, à venir) ; profil, désinscription des e-mails, suppression de l'inscription |
| **Structure** (plusieurs comptes) | S'inscrit (nom, clinique ou cabinet, adresse, gouvernorat, équipements, contact, e-mail) ; après validation : publie une **demande** (dates au calendrier, horaires, type journée / demi-journée / garde / week-end, modalités, profil accepté : spécialistes seuls ou résidents acceptés avec année minimale facultative, forfait TND par jour ou par garde, logement / transport / repas, commentaire ; total calculé) ; voit les **remplaçants disponibles** avec leur statut et **choisit en un clic** (ou attribution automatique au premier) ; favoris ; annulation (remise en ligne ou définitive) ; confirmation de réalisation ; onglets En cours / Pourvues / Historique ; réglages de l'agent (attribution automatique, délai de relance en heures) et équipe (invitations) |
| **Administrateur** | Valide ou refuse les inscriptions (motif envoyé par e-mail), consulte le justificatif, suspend / réactive les comptes, statistiques (comptes, demandes, délai moyen de pourvoi, e-mails), journal des e-mails et **journal de toutes les actions** (qui, quoi, quand), lance l'agent |

**Agent** (`remplacements/noyau/moteur.js`, identique dans le navigateur, les fonctions serveur et les tests) : sélection des remplaçants compatibles (disponibles à **toutes** les dates sur le bon créneau, gouvernorat accepté, compétences couvrant les modalités, profil accepté, pas de mission en conflit ; honoraires souhaités affichés mais non filtrants), e-mail avec deux **boutons à usage unique** sans connexion (page de confirmation intermédiaire : les antivirus qui ouvrent les liens ne déclenchent rien), confirmation aux deux parties (récapitulatif, coordonnées, .ics, contrat PDF pré-rempli, lien d'annulation), « poste pourvu » aux autres intéressés, relance après X heures avec alerte à la structure, expiration, rappel la veille à 18 h, annulation → e-mail immédiat à l'autre partie et remise en ligne, confirmation de réalisation, récapitulatif mensuel, désinscription signée (lien dans chaque e-mail).

**Production** : Supabase (base PostgreSQL avec droits d'accès par ligne, connexion par **lien magique** sans mot de passe, stockage privé des justificatifs, fonctions serveur `rp-agent` / `rp-lien` / `rp-taches` planifiées toutes les 15 minutes) et **Brevo** ou **Resend** pour les e-mails. Clés et identifiants dans les **secrets des fonctions**, jamais dans le code publié (seules l'adresse du projet et la clé publique « anon » vont dans `config.js`). Architecture prête pour WhatsApp / SMS (transport interchangeable, colonne `canal`). **Mise en service pas à pas : [`remplacements/INSTALLATION.md`](remplacements/INSTALLATION.md).**

**Modèles à relire / faire valider** (fichiers séparés) : e-mails `remplacements/modeles/emails/*.html` (17 modèles + mise en page commune aux couleurs du site), contrat `remplacements/modeles/contrat.md` (**à faire valider**, passages entre crochets à compléter), e-mail de connexion `remplacements/modeles/supabase/lien-magique.html`.

## Communauté (réseau des radiologues)

Page `communaute.html` (entrée **Communauté** du menu), application d'une seule page pensée d'abord pour le téléphone (barre d'onglets en bas ; sur ordinateur, menu à gauche et suggestions de confrères à droite). Mêmes comptes, même base Supabase et même administrateur que les Remplacements.

**Mode démonstration** (tant que `remplacements/config.js` est vide) : données **fictives** dans le navigateur (6 membres : Dr Amel TEST spécialiste vérifiée, Dr Sami EXEMPLE résident R4 vérifié, Ines DÉMO interne, Karim FICTIF étudiant, Leila ATTENTE en attente de vérification, Admin SITE ; 3 cas illustrés avec les visuels du site ; une conversation). Une barre « Démo » permet de **se connecter comme** n'importe quel membre et de **réinitialiser** ; la connexion Google est simulée ; les membres fictifs répondent automatiquement aux messages.

| Fonction | Détail |
|---|---|
| **Compte** | « Continuer avec Google » (nom, prénom et photo repris du compte Google) ou lien par e-mail ; à la première connexion, profil à compléter : téléphone (**saisi, pas encore vérifié par SMS**, jamais affiché), statut (spécialiste, résident + année, médecin, interne, étudiant, manipulateur…), titre Dr / Pr, établissement, ville, gouvernorat, centres d'intérêt, présentation, photo ; case de **consentement** (conditions d'utilisation + protection des données) |
| **Vérification** | Demande depuis « Mon profil » avec justificatif facultatif (stockage privé) ; l'administrateur valide → badge ✓ et titre « Dr » / « Pr » affichés ; **seuls les comptes vérifiés** (et les remplaçants validés du module Remplacements) peuvent publier des cas |
| **Cas** | Titre, spécialité (code couleur du site), modalités, histoire clinique, question, réponse masquée (« Voir la réponse »), 1 à 10 images avec légendes ; **attestation d'anonymisation** obligatoire ; visibles **uniquement par les membres connectés** ; fil « Pour vous », « Abonnements », « Enregistrés », filtres par spécialité, recherche |
| **Images** | Réencodées dans le navigateur avant l'envoi : **métadonnées retirées** (EXIF, XMP, IPTC, commentaires, date, appareil — signalées sur la vignette), **outil de masquage** des zones contenant un nom ou une date, nom de fichier remplacé |
| **Alerte d'identité** | Pendant la saisie d'un cas, d'un commentaire ou d'un message : civilité + nom, « né(e) le », date de naissance, n° de dossier / IPP, CIN, téléphone → avertissement avant l'envoi |
| **Échanges** | J'aime, commentaires, enregistrement, abonnements, notifications (j'aime, commentaire, abonné, nouveau cas d'un confrère suivi, vérification, cas masqué) |
| **Messagerie** | Conversations privées à deux, en **temps réel** (Supabase Realtime), images jointes (privées, sans métadonnées), « Vu », non lus, suppression d'un message, **blocage** ; e-mail de rappel si un message reste non lu plus d'une heure (sans son contenu, désactivable, lien de désinscription) ; bouton « Message » depuis les Remplacements (carte du remplaçant, responsable d'une demande) |
| **Modération** | Signalement d'un cas, d'un commentaire, d'un message ou d'un profil (identité de patient, erreur, contenu inapproprié, publicité, usurpation…) ; **masquage automatique** d'un cas après 3 signalements « identité de patient » ou 5 au total ; administration : vérifications, signalements (masquer / rétablir), suspension, statistiques |
| **Compte supprimé** | Depuis « Mon profil » (taper SUPPRIMER) : profil, photo, cas, images, commentaires, abonnements et notifications effacés ; texte et images des messages effacés (l'interlocuteur voit « Message supprimé ») |

**Sécurité** : tout est contrôlé par la base (droits d'accès par ligne et déclencheurs) : impossible de se déclarer vérifié soi-même, de publier sans vérification, de modifier les compteurs ou de lire une conversation dont on ne fait pas partie ; adresse e-mail et téléphone jamais exposés aux autres membres ; images des cas et des messages dans des espaces privés (adresses signées temporaires). **Aucune donnée patient** dans le dépôt : tests et démonstration n'utilisent que des cas fictifs.

**Fichiers** : `reseau/noyau/regles.js` (statuts, spécialités, limites, validations, nom affiché, dates de Tunis — testé sous Node), `reseau/noyau/confidentialite.js` (alerte d'identité, nettoyage des métadonnées JPEG / PNG — testé sous Node), `reseau/api-supabase.js` / `reseau/api-demo.js` (même interface), `reseau/images.js` (réencodage, masques), `reseau/ui.js`, `reseau/app.js`, `reseau/rs.css`, `reseau/demo.js` ; base : `supabase/migrations/20261009090000_reseau.sql`. **Mise en service (Google, Realtime) : [`remplacements/INSTALLATION.md`](remplacements/INSTALLATION.md), étape 4 bis.**

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
│   ├── prostate.js         Schéma sectoriel de la prostate (axial, sagittal, coronal) : calculateur PI-RADS et fiche prostate
│   ├── uterus.js           Schéma de l'utérus (coronal, sagittal) : cartographie FIGO des myomes, outil FIGO et fiche myome
│   ├── coronaires.js       Arbre coronaire à plat (18 segments) selon la dominance droite / gauche / codominance : outil CAD-RADS
│   └── coeur.js            Cœur : coupe petit axe « façon IRM » (rehaussement tardif, T2 STIR, cartographie T1, ciné) et œil-de-bœuf 17 segments AHA (fiche myocardite)
├── comptes-rendus.html     Comptes rendus types : éditeur, bibliothèque, mes phrases
├── cr-data.js              Données : modèles de CR (CR_TEMPLATES) et phrases automatiques (CR_PHRASES)
├── cr.js                   Éditeur : suggestions, champs [ … ], insertion auto, mes phrases, export/import
├── cr.css                  Styles de la page Comptes rendus
├── cr-tools.js             Schémas et calculateurs : PI-RADS, BI-RADS, EU-TIRADS, Fleischner 2017, FIGO (myomes), CAD-RADS 2.0 (coroscanner), RECIST 1.1, Lugano 2014
├── regles/
│   ├── fleischner.js       Recommandations Fleischner 2017 (nodules pulmonaires), testées sous Node
│   ├── myome.js            Myomes utérins : classification FIGO, arbre décisionnel IRM, arguments de sarcome, testé sous Node
│   ├── cadrads.js          Coroscanner : CAD-RADS 2.0 (catégories, 4B, N, charge en plaque P1-P4, modificateurs, conduite) et score calcique d'Agatston, testé sous Node
│   └── lakelouise.js       Myocardite : critères IRM de Lake Louise 2018 (T2 + T1, soutien, IRM de contrôle, phrase de conclusion), testé sous Node
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
├── remplacements.html      Module Remplacements (mise en relation remplaçants / structures)
├── remplacements-reponse.html  Page des boutons des e-mails (réponse, choix, annulation, désinscription)
├── mentions-legales.html   Mentions légales, protection des données (#donnees, #communaute) et conditions d'utilisation (#conditions)
├── communaute.html         Communauté : réseau des radiologues (profils, cas, messagerie)
├── reseau/
│   ├── noyau/regles.js     Statuts, spécialités, limites, validations, nom affiché, dates (testé sous Node)
│   ├── noyau/confidentialite.js  Alerte d'identité, retrait des métadonnées JPEG / PNG (testé sous Node)
│   ├── api-supabase.js     Accès à Supabase (Google, base, stockage, temps réel)
│   ├── api-demo.js         Mode démonstration (membres et cas fictifs dans le navigateur)
│   ├── api.js              Choix de la source de données (même config.js que les Remplacements)
│   ├── images.js           Réencodage des images, masquage de zones
│   ├── ui.js               Avatars, icônes, fenêtres, éditeur de masques, visionneuse
│   ├── app.js              Interface (fil, cas, publication, profils, messagerie, notifications, administration)
│   ├── demo.js             Barre de démonstration
│   └── rs.css              Styles de la Communauté
├── remplacements/
│   ├── noyau/              Règles, agent, .ics, gabarits, PDF, contrat, dépôt en mémoire (partagés site / serveur / tests)
│   ├── modeles/            Modèles d'e-mails (emails/*.html), contrat (contrat.md), lien magique (supabase/)
│   ├── config.js           Adresse Supabase + clé publique « anon » (vide = mode démonstration)
│   ├── api-supabase.js     Accès à Supabase (production)
│   ├── api-demo.js         Mode démonstration (données fictives dans le navigateur)
│   ├── api.js              Choix de la source de données
│   ├── app.js              Interface (accueil, inscriptions, espaces remplaçant / structure, administration)
│   ├── calendrier.js       Calendrier mensuel (disponibilités, dates d'une demande)
│   ├── demo.js             Barre de démonstration et boîte d'envoi
│   ├── reponse.js          Page de réponse aux boutons des e-mails
│   ├── rp.css              Styles du module et des mentions légales
│   └── INSTALLATION.md     Mise en service (Supabase, Brevo, secrets, planification, administrateur)
├── supabase/
│   ├── migrations/         Remplacements (rp_*) puis Communauté (rs_* : membres, cas, messagerie, notifications, signalements, stockage, temps réel)
│   ├── functions/          Fonctions serveur rp-agent, rp-lien, rp-taches (+ _shared, généré en partie ; _shared/reseau.ts : rappels des messages non lus)
│   ├── sql/planification.sql  Tâche planifiée (pg_cron) et déclaration de l'administrateur
│   └── config.toml         Réglages des fonctions
├── scripts/preparer-backend.js  Recopie le noyau et les modèles vers supabase/functions/_shared
├── tests/                  Tests unitaires (node --test), cas fictifs uniquement ; tests/sql : base et intégration ; tests/fixtures : images fictives porteuses de métadonnées
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
| Remplacements : texte d'un e-mail | `remplacements/modeles/emails/<nom>.html` (titre = objet ; `{{variable}}`), puis `npm run backend:preparer` et redéploiement des fonctions |
| Remplacements : contrat | `remplacements/modeles/contrat.md` (syntaxe expliquée en tête du fichier) |
| Remplacements : gouvernorats, compétences, équipements, types | `remplacements/noyau/referentiel.js` |
| Fiche myocardite : un schéma du cœur | Attribut `data-coeur='{…}'` dans `fiches/irm-myocardite.html` : séquence (`lge`, `t2`, `t1map`, `cine`), niveau (`basal`, `median`, `apical`), lésions (`segments` AHA 1–17, `couche` : `sous-epi`, `medio`, `sous-endo`, `transmural` ; `motif` : `patchy`, `focal`), `titre` ; plusieurs coupes avec `panneaux` ; `"oeil": false` pour masquer l'œil-de-bœuf (détails en tête de `schemas/coeur.js`) |
| CAD-RADS et score calcique | `regles/cadrads.js` (catégories, seuils, conduite ; tests dans `tests/cadrads.test.js`) ; schéma coronaire : `schemas/coronaires.js` |
| Critères de Lake Louise | `regles/lakelouise.js` (et ses tests dans `tests/myocardite.test.js`) |
| Communauté : statuts, spécialités, modalités, motifs de signalement, limites | `reseau/noyau/regles.js` (et les contraintes correspondantes de `supabase/migrations/20261009090000_reseau.sql`) |
| Communauté : détection d'identité patient | `reseau/noyau/confidentialite.js` (fonction `identite`), avec ses tests dans `tests/reseau.test.js` |
| Communauté : e-mail de rappel des messages | `remplacements/modeles/emails/message-non-lu.html`, puis `npm run backend:preparer` et redéploiement de `rp-taches` |
| Style des formules du service | Titre en capitales, `TECHNIQUE :`, `RÉSULTAT :` (ou `COMPTE-RENDU :`), une constatation par ligne précédée de `• `, `AU TOTAL :` / `CONCLUSION :` |

**Images médicales :** toujours **anonymisées** (aucun nom, date, n° de dossier, ni texte incrusté). Le site et le dépôt sont publics.

**Cache :** après une modification de `styles.css`, `fiche.css`, `script.js`, `fiche.js`, `cr.css`, `cr.js`, `cr-data.js`, `cr-tools.js`, `cr-tools.css` ou d'un fichier de `remplacements/`, `reseau/`, `regles/` ou `schemas/`, changer le numéro `?v=…` dans les liens des pages HTML pour forcer les navigateurs à recharger les fichiers.

---

## Mise en ligne

Site 100 % statique (HTML / CSS / JavaScript, aucune installation).

- **En ligne** : GitHub Pages, branche `claude/radiologichub-website-ss89g9`, dossier racine. Chaque modification poussée est en ligne en 1 à 2 minutes.
- **En local** : ouvrir `index.html` dans un navigateur. Pour le module Remplacements (modèles d'e-mails chargés par le réseau), passer par un petit serveur : `python3 -m http.server` puis `http://localhost:8000/remplacements.html`.
- **Modules Remplacements et Communauté en production** : nécessitent un projet Supabase, un compte Brevo ou Resend et, pour la Communauté, un identifiant Google OAuth — voir [`remplacements/INSTALLATION.md`](remplacements/INSTALLATION.md). Sans configuration, les deux pages fonctionnent en mode démonstration.

---

## Tests

Les règles de calcul du suivi oncologique, les recommandations Fleischner, la classification FIGO et l'arbre décisionnel des myomes, les schémas de la prostate et de l'utérus, et le traitement de la dictée vocale sont couverts par des tests unitaires (lanceur intégré de Node ≥ 18, **aucune dépendance**) :

```
npm test                  # ou : node --test tests/*.test.js
npm run test:sql          # schémas Supabase des Remplacements et de la Communauté sur un PostgreSQL local (droits d'accès)
npm run test:integration  # agent + base réelle (PostgreSQL + PostgREST, sous Deno) — variables POSTGREST_BIN et DENO_BIN
npm run backend:preparer  # recopie le noyau et les modèles dans supabase/functions/_shared (avant déploiement)
```

Coroscanner : `tests/cadrads.test.js` couvre CAD-RADS 2.0 (catégories 0 à 5, 4B par le tronc commun ou trois territoires, N avant ou après la charge en plaque, P1-P4 par score calcique ou nombre de segments, ordre des modificateurs, conduite selon P et ischémie), les classes d'Agatston et le schéma coronaire (segments présents selon la dominance, cohérence schéma / règles, SVG valide, M2 rattachée à la circonflexe). Outil vérifié dans Chromium (1366 px et 390 px, sans débordement) : formule chargée, outil suggéré, clic sur chacun des segments dans les trois dominances, texte inséré.

Fiche myocardite : `tests/myocardite.test.js` couvre les critères de Lake Louise 2018 (T2 + T1, critère isolé, aucun critère avec ou sans clinique très évocatrice, critères de soutien seuls) et le schéma du cœur (segments AHA, orientation, arcs à travers 0°, SVG sans valeur invalide, identifiants uniques). Fiche vérifiée dans Chromium (390 px et 1366 px, sans débordement : 10 schémas dessinés, calculateur).

Module Remplacements : `tests/remplacements-*.test.js` couvrent les règles de compatibilité, les formats tunisiens, les gabarits et tous les modèles d'e-mails, l'agenda .ics, le PDF et le contrat, les liens sécurisés, et un **scénario complet** (demande réservée aux spécialistes, demande ouverte aux résidents, trois remplaçants compatibles, acceptation, choix, annulation, remise en ligne, attribution automatique, relance, rappel, réalisation, récapitulatif mensuel, désinscription, réponses simultanées).

Interface du module vérifiée dans un navigateur (Chromium, téléphone 390 px et ordinateur 1366 px, sans débordement) sur deux scénarios fictifs : demande réservée aux spécialistes (réponse par le bouton de l'e-mail, lien rouvert = « déjà enregistré », choix, contrat PDF, annulation par le remplaçant et remise en ligne, calendrier, validation et refus par l'administrateur, +24 h → relance, inscription avec erreurs puis valide) et demande ouverte aux résidents (3 remplaçants contactés, 2 disponibles, choix depuis l'e-mail, « poste pourvu », annulation par la structure depuis son e-mail et remise en ligne, boîte d'envoi et pièces jointes). Client Supabase vérifié avec la bibliothèque officielle face à un serveur simulé (inscription avant connexion puis lien magique, réponse par la fonction `rp-agent`, disponibilités, espace structure). Comptes rendus vérifiés inchangés.

Communauté : `tests/reseau.test.js` couvre les règles (nom affiché, statuts, validations, dates), l'alerte d'identité et le **retrait des métadonnées** sur deux images fictives (`tests/fixtures/`, EXIF « Patient TEST-0001 ») ; `tests/sql/rls-reseau.js` vérifie sur une vraie base (18 vérifications) : compte Google, impossibilité de se vérifier soi-même, profils sans e-mail ni téléphone, publication réservée aux vérifiés et aux remplaçants validés, champs protégés, compteurs et notifications, messagerie (non lus, suppression d'un message sans trace dans l'aperçu, blocage), signalements et masquage automatique, suspension, droits sur les fichiers, rappels e-mail, suppression du compte (contenu des messages effacé, aperçu de la conversation compris) ; le test d'intégration envoie un rappel de message non lu une seule fois, sans son contenu. Interface vérifiée dans Chromium (390 px et 1366 px, sans débordement) : visiteur → Google simulé → profil, fil, j'aime, commentaire, publication refusée puis demande de vérification, messagerie avec réponse, alerte d'identité, administration ; publication avec image fictive (métadonnées retirées, nom masqué), signalements → masquage → rétablissement par l'administrateur, blocage, recherche. Comptes rendus et Remplacements vérifiés inchangés.

Les tests n'utilisent que des **cas fictifs** (identifiants `TEST-0001`…) : aucune donnée patient dans le dépôt. Toute modification d'une règle ou d'un seuil (`suivi/seuils.js`, `regles/fleischner.js`, `regles/myome.js`, `regles/lakelouise.js`, `regles/cadrads.js`) doit être accompagnée de ses tests.

---

## À faire / points en attente

- [ ] **Formulaire d'inscription** : l'envoi n'est pas branché (voir `TODO` dans `script.js`) → Formspree, Netlify Forms ou back-end.
- [ ] **Tarifs, horaires, nombre de cas** : valeurs d'exemple à remplacer.
- [ ] **Images manquantes** : fiche pancréas (sémiologie, extension) et fiche Crohn — voir les README de `assets/fiches/pancreas/` et `assets/fiches/crohn/`.
- [ ] **Fiche Crohn** : harmoniser la préparation de l'entéro-IRM (« 1 L / 45-60 min » vs « 1,5-2 L / 30 min-1 h »).
- [ ] **Fiche rectum** : préciser les légendes des images « formes tumorales » et « mesure axiale 1,57 cm ».
- [ ] **Fiches des autres spécialités** : Neuro, Thorax, Traumato, Pédiatrie ; Cardio-vasculaire et Imagerie de la femme : d'autres fiches à venir.
- [ ] **Coroscanner** : faire valider la formule (« sinus coronaire droit / gauche » remplace « sinus antérieur » pour les deux ostia ; la ligne « Absence de fuite aortique », reprise du service, est à garder ou non en scanner) et l'outil CAD-RADS (seuils P1-P4, conduites proposées, rattachement de la bissectrice au territoire de la circonflexe pour la règle des trois territoires).
- [ ] **Fiche myocardite** : faire relire médicalement (notamment les aspects IRM types et le calculateur Lake Louise) ; déposer des images **anonymisées** de cas du service dans `assets/fiches/myocardite/` (noms attendus dans le README du dossier) ; images d'articles seulement sous licence libre (CC BY), auteurs cités.
- [ ] **Lecteur de séries** (défilement dans un scanner / IRM) : en attente d'une série anonymisée exportée en JPG.
- [ ] **Comptes rendus types** : continuer à intégrer les formules normales du service (8 reçues le 07/10/2026, 28 le 08/10/2026 dont 7 échographies) ; **faire relire le lot du 08/10/2026** : formules qui contenaient des anomalies rendues normales par défaut (radio et scanner du rachis, épaule courte, doppler des TSA), choix ajoutés (densité BI-RADS, Keros), formules en double (deux TDM cérébrales et thoraciques sans injection, deux échographies de l'épaule) à garder ou fusionner ; relire et valider médicalement les ~55 phrases automatiques rédigées par Claude (`cr-data.js`).
- [ ] **Suivi oncologique** : étapes 2 à 7 (moteur RECIST 1.1, texte, contrôles, Lugano — y compris couleurs du schéma —, import texte libre, QR / courbe / iRECIST) ; faire vérifier `suivi/seuils.js` par un radiologue ; ajouter éventuellement le lien dans le menu principal (actuellement depuis la page Comptes rendus).
- [ ] **Dictée vocale** : tester au vrai micro sur Chrome, Edge et Safari (le navigateur de test n'a pas de micro : vérification avec une reconnaissance simulée) ; enrichir `dictee/corrections.js` avec le vocabulaire du service ; **V2 : moteur Whisper local (WebGPU)** dans `dictee/moteurs.js`.
- [ ] **Schémas & calculateurs** : faire valider les règles et les textes (PI-RADS, BI-RADS, EU-TIRADS, Fleischner, FIGO, RECIST, Lugano) ; FIGO : la conclusion ne propose pas de conduite à tenir (la fiche n'en donne pas) ; PI-RADS : la zone centrale et le stroma antérieur suivent par défaut l'algorithme de la zone périphérique / de transition (modifiable) ; ajouter d'autres outils si besoin (Lung-RADS, LI-RADS, O-RADS, Bosniak…).
- [ ] **IRM médullaire / IRM cérébrale et médullaire** : la technique cite des coupes axiales sur « les 3 derniers étages lombaires » (ou « les derniers étages lombaires ») mais le CR décrit L1-L2 à L5-S1, et les coupes coronales T2 FatSat du bassin ne sont pas citées dans la technique — à vérifier.
- [ ] **Remplacements — mise en service** : créer le projet Supabase et le compte Brevo, régler les secrets, déployer, planifier, déclarer l'administrateur, renseigner `config.js` (guide : `remplacements/INSTALLATION.md`).
- [ ] **Remplacements — juridique** : compléter `mentions-legales.html` (passages entre crochets), déclaration auprès de l'INPDP et autorisation de transfert (hébergement hors de Tunisie) ; faire valider le contrat `remplacements/modeles/contrat.md`.
- [ ] **Remplacements — plus tard** : WhatsApp / SMS (transport à écrire), export comptable du récapitulatif, notation des remplacements.
- [ ] **Communauté — mise en service** : appliquer la seconde migration, créer l'identifiant **Google OAuth** (console Google Cloud) et l'activer dans Supabase, ajouter `communaute.html` aux adresses de redirection, vérifier le temps réel (guide : `remplacements/INSTALLATION.md`, étape 4 bis).
- [ ] **Communauté — juridique** : faire relire les conditions d'utilisation (`mentions-legales.html#conditions`) et la section des données ; déclarer ce traitement à l'INPDP ; fixer les durées entre crochets (signalements, justificatifs).
- [ ] **Communauté — plus tard** : vérification du téléphone par SMS (colonne `telephone_verifie` prête), suppression automatique des justificatifs après décision, purge des anciens signalements, conversations de groupe, notifications push, import des cas de la page Instagram (choix de la méthode en attente).
- [ ] **Nom de domaine** `www.radiologichub.com` : à acheter et configurer (DNS + réglages GitHub Pages), puis mettre à jour le lien « Site en ligne » ci-dessus.

---

## Historique des modifications

| Date | Modification |
|---|---|
| 10/10/2026 | Formule **coroscanner normal** : ne garde que TECHNIQUE, RÉSULTAT et CONCLUSION (titre et renseignements cliniques retirés ; « AU TOTAL » devient « CONCLUSION ») |
| 10/10/2026 | Comptes rendus : formule **coroscanner normal** (d'après la photo du compte rendu du service, sans données du patient ni « examen de qualité sous-optimale », FEVG sans valeur, dominance au choix) ; nouvel outil **CAD-RADS 2.0** : schéma de l'arbre coronaire selon la **dominance droite / gauche / codominance**, lésions par segment, plaque à haut risque, **tableau du score calcique d'Agatston**, tableau des catégories CAD-RADS avec la conduite, code complet (`CAD-RADS 4A/P2/HRP`…) ; spécialité « Vasculaire » renommée « Cardio-vasculaire » ; `regles/cadrads.js`, `schemas/coronaires.js` et leurs tests |
| 10/10/2026 | Fiche **IRM des myocardites** : seuls les critères de Lake Louise **2018** sont présentés (encadré « De 2009 à 2018 » et mentions des critères de 2009 retirés) |
| 10/10/2026 | Fiche **IRM des myocardites** : les exemples ne citent plus d'auteurs (leurs images n'étant pas reprises) — section devenue « Les aspects IRM à connaître », 7 situations types avec leur schéma, sans chiffres d'études ; section Références et liens DOI retirés |
| 10/10/2026 | Nouvelle fiche **IRM des myocardites** (onglet « Vasculaire » renommé **« Cardio-vasculaire »**) d'après le cours fourni : indications, protocole, trois signes cardinaux, **critères de Lake Louise 2018** en visuel mnémotechnique « Trempé (T2) + Touché (T1) » avec les 2 « P » de soutien et un **calculateur**, **7 exemples IRM tirés des grandes études** (auteurs cités, liens DOI, références vérifiées sur PubMed) dessinés en schémas « façon IRM » (`schemas/coeur.js` : coupe petit axe + œil-de-bœuf AHA), pièges, checklist du CR, « Testez-vous » ; `regles/lakelouise.js` et `tests/myocardite.test.js` |
| 08/10/2026 | Communauté, messagerie sur ordinateur : la fenêtre de conversation tient dans l'écran (elle dépassait en mode démonstration et l'en-tête de la conversation passait sous la barre « Communauté ») |
| 08/10/2026 | **Communauté** (réseau des radiologues) : page `communaute.html` — connexion Google ou par e-mail, profil avec photo et statut, vérification par l'administrateur (titre « Dr » / « Pr », publication réservée aux comptes vérifiés), publication de cas anonymisés (retrait des métadonnées des images, masquage de zones, alerte d'identité patient, attestation), fil, j'aime, commentaires, abonnements, notifications, **messagerie privée en temps réel** avec images, blocage, signalements et masquage automatique, administration, suppression du compte ; **mode démonstration** à membres fictifs ; base Supabase (`20261009090000_reseau.sql` : tables, droits d'accès par ligne, stockage, temps réel) ; rappel e-mail des messages non lus ; bouton Google et bouton « Message » dans les Remplacements ; menu : « Cas du jour » remplacé par « Communauté » (le quiz reste sur l'accueil et dans le pied de page) ; mentions légales : données de la Communauté et conditions d'utilisation ; guide d'installation (Google OAuth) ; correction (Remplacements) : la suppression du compte du créateur d'une structure n'échoue plus ; tests unitaires, SQL et d'intégration |
| 08/10/2026 | Comptes rendus : **28 formules normales du service** ajoutées (TDM cérébrale, thoracique, angioscanner, TAP, cérébral + TAP, cervico-TAP, abdomino-pelvien, entéroscanner, uroscanners, massif facial, cone beam, rochers, rachis cervical et lombaire ; radios du rachis lombaire et de la cheville ; mammographie + échographie ; échographies mammaire, abdomino-pelvienne, rénale et vésico-prostatique, cervicale, de l'épaule ; doppler des TSA), sans signatures ni restes du patient précédent (champs `[ … ]`) ; nouvel examen « Mammographie », spécialités « ORL / tête et cou », « TAP / corps entier » et « Sein » |
| 08/10/2026 | Module **Remplacements**, étapes 3 à 8 : page `remplacements.html` (entrée « Remplacements » ajoutée au menu et au pied de page de toutes les pages) — inscriptions remplaçant et structure avec consentement, calendrier des disponibilités, demande de remplacement, réponses et choix en un clic, annulation et remise en ligne, tableaux de bord remplaçant / structure / administrateur, contrat PDF et agenda .ics, honoraires ; page `remplacements-reponse.html` (boutons des e-mails, désinscription) ; **mode démonstration** à données fictives (changer d'utilisateur, avancer l'horloge, boîte d'envoi) ; page `mentions-legales.html` (protection des données, loi organique 2004-63) ; guide `remplacements/INSTALLATION.md` ; menu : passage en menu repliable sous 1140 px et espacement resserré pour loger la nouvelle entrée |
| 08/10/2026 | Module **Remplacements**, étape 2 (backend) : noyau partagé (règles de compatibilité, agent de mise en relation, .ics, gabarits, PDF, contrat), 17 modèles d'e-mails et modèle de contrat dans des fichiers séparés, base Supabase (tables, droits d'accès par ligne, stockage privé), fonctions serveur `rp-agent` / `rp-lien` / `rp-taches`, envoi Brevo ou Resend ; tests unitaires, scénario complet, tests SQL et d'intégration (PostgreSQL + PostgREST) |
| 07/10/2026 | Myomes, affichage sur téléphone : la planche FIGO de la fiche n'est plus coupée (dessin centré à la largeur de l'écran, légendes en liste dessous) ; dans l'outil FIGO, la vue coronale passe sous la vue sagittale et le schéma tient en largeur, sans défilement horizontal |
| 07/10/2026 | Myomes : le dessin FIGO reprend le style des schémas FIGO classiques fournis (gros corps utérin arrondi, cavité sombre, col et vagin en double tube, légendes en texte à côté de chaque myome, étiquettes de catégorie à gauche) — planche de la fiche et vue sagittale de l'outil FIGO, vue coronale gardée en médaillon pour les parois latérales ; transmural en lavande ; tests du clic sur les deux vues |
| 07/10/2026 | Myomes : nouveau dessin FIGO inspiré des planches de référence — dans la fiche, **planche** sagittale légendée (un myome par type, catégories) ; dans l'outil FIGO, vue sagittale d'un **utérus antéversé** (paroi antérieure en bas, vessie) et rendu harmonisé (utérus rosé, cavité sombre, bulles colorées) ; nouvelle palette des catégories (sous-muqueux orange, interstitiel bleu-vert, sous-séreux bleu) ; tests du clic sur la vue sagittale et de la planche |
| 07/10/2026 | Fiche myome utérin : le tableau de l'arbre décisionnel devient un **diagramme** (signal T2 → rehaussement ou signal T1 → diagnostic, réglette d'ADC avec les seuils 0,8 et 1,2, couleurs bénin / prudence / suspect, chemin surligné au survol, clic vers la partie de la fiche et l'onglet de la dégénérescence) ; arbre vertical sur petit écran |
| 07/10/2026 | Nouvel onglet **Imagerie de la femme** dans les fiches rapides : fiche « Le myome utérin dans tous ses états » (protocole IRM, classification FIGO avec schéma de l'utérus, myome simple, dégénérescences, remaniements, myome cellulaire et léiomyosarcome, arbre décisionnel, checklist du CR), d'après la fiche du cours sans images ; comptes rendus : nouvel outil **FIGO** — myomes placés sur un schéma coronal + sagittal selon la paroi, le niveau et la profondeur de leur type FIGO, caractérisation IRM selon l'arbre décisionnel, texte et conclusion prêts à insérer ; `regles/myome.js`, `schemas/uterus.js` et leurs tests |
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
