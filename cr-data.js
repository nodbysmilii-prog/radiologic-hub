/* =========================================================
   RadiologicHub — données des comptes rendus types
   ---------------------------------------------------------
   • CR_TEMPLATES : comptes rendus types (bibliothèque de gauche)
   • CR_PHRASES   : phrases automatiques (mot-clé → description)

   Les éléments à compléter s'écrivent entre crochets : [x] mm,
   [droit / gauche]… La touche Tab passe d'un champ au suivant.
   Pas de crochets imbriqués : utiliser « … » à l'intérieur d'un choix.
   ========================================================= */

/* Spécialités (mêmes couleurs que les fiches rapides) */
const CR_SPECIALTIES = {
  neuro:      { label: 'Neuro',             c: 'var(--purple)' },
  thorax:     { label: 'Thorax',            c: 'var(--blue)' },
  digestif:   { label: 'Digestif',          c: 'var(--amber)' },
  uro:        { label: 'Uro-gynéco',        c: 'var(--steel)' },
  trauma:     { label: 'Traumato',          c: 'var(--rose)' },
  osteo:      { label: 'Ostéo-articulaire', c: 'var(--plum)' },
  vasculaire: { label: 'Vasculaire',        c: 'var(--teal)' },
  pediatrie:  { label: 'Pédiatrie',         c: 'var(--green)' },
  perso:      { label: 'Mes modèles',       c: 'var(--orange)' },
};

/* Types de phrases → code couleur k-* */
const CR_TYPES = {
  normal:     { label: 'Normal',                 k: 'k-tech' },
  lesion:     { label: 'Lésion / incidentalome', k: 'k-sign' },
  aigu:       { label: 'Pathologie aiguë',       k: 'k-grave' },
  conclusion: { label: 'Conclusion',             k: 'k-key' },
  perso:      { label: 'Mes phrases',            k: 'k-ddx' },
};

/* ---------------------------------------------------------
   Comptes rendus types
   id : utilisé dans l'adresse (comptes-rendus.html#modele=id)
   --------------------------------------------------------- */
const CR_TEMPLATES = [
  {
    id: 'tdm-cerebrale', spe: 'neuro', mod: 'TDM',
    title: 'Scanner cérébral sans injection — normal',
    text: `SCANNER CÉRÉBRAL SANS INJECTION

Indication : [indication]

Technique :
Acquisition hélicoïdale de l'encéphale sans injection de produit de contraste. Reconstructions multiplanaires en fenêtres parenchymateuse et osseuse.

Résultats :
Pas d'hémorragie intra- ou extra-axiale.
Pas d'anomalie de densité du parenchyme cérébral et cérébelleux ; différenciation substance blanche / substance grise conservée.
Pas d'hyperdensité spontanée artérielle.
Pas d'effet de masse ; ligne médiane en place.
Système ventriculaire de taille et de morphologie normales, sans signe d'hydrocéphalie.
Citernes de la base libres.
Pas de lésion osseuse de la voûte ni de la base du crâne.
Sinus de la face et cellules mastoïdiennes normalement aérés.

Conclusion :
Scanner cérébral sans injection sans anomalie décelable, en particulier pas de saignement intracrânien ni d'effet de masse.`,
  },
  {
    id: 'alerte-avc', spe: 'neuro', mod: 'TDM',
    title: 'Alerte AVC — scanner + angio-scanner TSA et Willis',
    text: `SCANNER CÉRÉBRAL ET ANGIO-SCANNER DES TRONCS SUPRA-AORTIQUES ET DU POLYGONE DE WILLIS — ALERTE AVC

Indication : déficit neurologique brutal [type de déficit], début des symptômes à [heure], NIHSS [x].

Technique :
Acquisition de l'encéphale sans injection, puis acquisition angiographique de la crosse aortique au vertex après injection intraveineuse de produit de contraste iodé. Perfusion : [non réalisée / réalisée].

Résultats :
Parenchyme :
Pas d'hémorragie intracrânienne.
[Pas d'hypodensité parenchymateuse récente / Hypodensité du territoire …], score ASPECTS [x]/10.
[Pas d'hyperdensité spontanée artérielle / Hyperdensité spontanée de l'artère …].

Angio-scanner :
Circulation intracrânienne : [pas d'occlusion artérielle proximale / occlusion de …].
Collatéralité : [bonne / intermédiaire / pauvre].
Bifurcations carotidiennes : [pas de sténose significative / sténose de … % (NASCET) de la carotide interne …].
Artères vertébrales et tronc basilaire : [perméables / …].
Crosse aortique et origine des troncs supra-aortiques : [sans particularité / …].

Conclusion :
Pas d'hémorragie intracrânienne. ASPECTS [x]/10.
[Pas d'occlusion artérielle proximale / Occlusion de … accessible à une thrombectomie].
Résultats transmis à l'équipe neurovasculaire à [heure].`,
  },
  {
    id: 'radio-thorax', spe: 'thorax', mod: 'Radio',
    title: 'Radiographie du thorax — normale',
    text: `RADIOGRAPHIE DU THORAX DE FACE

Indication : [indication]

Résultats :
Cliché de face [debout / couché], de qualité satisfaisante.
Pas de foyer de condensation parenchymateuse.
Pas d'épanchement pleural liquidien ni gazeux ; culs-de-sac pleuraux libres.
Médiastin de largeur normale. Silhouette cardiaque de taille normale.
Hiles de taille et de densité normales.
Pas de pneumopéritoine visible sous les coupoles.
Cadre osseux sans particularité.

Conclusion :
Radiographie thoracique sans anomalie décelable.`,
  },
  {
    id: 'angio-ep', spe: 'thorax', mod: 'TDM',
    title: 'Angio-scanner thoracique — recherche d\'embolie pulmonaire',
    text: `ANGIO-SCANNER THORACIQUE — RECHERCHE D'EMBOLIE PULMONAIRE

Indication : [suspicion d'embolie pulmonaire, contexte]

Technique :
Acquisition thoracique hélicoïdale au temps artériel pulmonaire après injection intraveineuse de produit de contraste iodé.
Opacification des artères pulmonaires : [bonne / satisfaisante / limitée].

Résultats :
Artères pulmonaires :
Pas de défect endoluminal des artères pulmonaires jusqu'à l'étage [segmentaire / sous-segmentaire].
Tronc de l'artère pulmonaire de calibre normal ([x] mm).
Cavités cardiaques droites non dilatées (rapport VD/VG < 1).

Parenchyme pulmonaire :
Pas de condensation parenchymateuse. Pas de nodule suspect.
Pas d'épanchement pleural ni péricardique.

Médiastin :
Pas d'adénomégalie médiastinale ni hilaire.
Aorte thoracique de calibre normal.

Coupes passant par l'abdomen supérieur : pas d'anomalie notable.
Cadre osseux : pas de lésion suspecte.

Conclusion :
Pas d'embolie pulmonaire jusqu'à l'étage [segmentaire / sous-segmentaire].
Pas d'autre anomalie pouvant expliquer la symptomatologie.`,
  },
  {
    id: 'tdm-abdo', spe: 'digestif', mod: 'TDM',
    title: 'Scanner abdomino-pelvien avec injection — normal',
    text: `SCANNER ABDOMINO-PELVIEN AVEC INJECTION

Indication : [douleur abdominale, contexte]

Technique :
Acquisition abdomino-pelvienne au temps portal après injection intraveineuse de produit de contraste iodé.

Résultats :
Foie de taille normale, de contours réguliers et de densité homogène, sans lésion focale décelable. Veine porte et veines sus-hépatiques perméables.
Vésicule biliaire alithiasique à paroi fine. Pas de dilatation des voies biliaires intra- ou extra-hépatiques.
Pancréas de taille et de densité normales, sans dilatation du canal de Wirsung.
Rate homogène, de taille normale.
Surrénales fines.
Reins de taille normale, sans lésion focale ni dilatation des cavités pyélocalicielles. Néphrographie symétrique.
Vessie en réplétion partielle, sans anomalie pariétale.
[Utérus et régions annexielles / Prostate] sans particularité.
Tube digestif : pas de distension ni d'épaississement pariétal. Appendice [visualisé, de calibre normal / non visualisé, sans infiltration de la fosse iliaque droite].
Pas de pneumopéritoine. Pas d'épanchement intrapéritonéal.
Pas d'adénomégalie abdomino-pelvienne.
Aorte abdominale de calibre normal.
Bases pulmonaires : pas d'anomalie.
Cadre osseux : pas de lésion suspecte.

Conclusion :
Scanner abdomino-pelvien sans anomalie décelable, en particulier pas d'appendicite, pas d'occlusion et pas de pneumopéritoine.`,
  },
  {
    id: 'echo-abdo', spe: 'digestif', mod: 'Écho',
    title: 'Échographie abdominale — normale',
    text: `ÉCHOGRAPHIE ABDOMINALE

Indication : [indication]

Résultats :
Foie de taille normale (flèche hépatique de [x] cm sur la ligne médioclaviculaire), de contours réguliers, d'échostructure homogène, sans lésion focale décelable.
Tronc porte perméable, de calibre normal, à flux hépatopète.
Vésicule biliaire alithiasique, non distendue, à paroi fine. Signe de Murphy échographique négatif.
Voie biliaire principale non dilatée ([x] mm). Pas de dilatation des voies biliaires intra-hépatiques.
Pancréas [d'échostructure homogène / partiellement masqué par les gaz digestifs].
Rate homogène, de taille normale ([x] cm).
Reins de taille normale (droit [x] cm, gauche [x] cm), bien différenciés, sans dilatation des cavités pyélocalicielles ni lithiase visible.
Aorte abdominale de calibre normal.
Pas d'épanchement intrapéritonéal.

Conclusion :
Échographie abdominale sans anomalie décelable.`,
  },
  {
    id: 'tdm-pancreas', spe: 'digestif', mod: 'TDM',
    title: 'Adénocarcinome du pancréas — bilan d\'extension et résécabilité',
    text: `SCANNER THORACO-ABDOMINO-PELVIEN — BILAN D'UN ADÉNOCARCINOME DU PANCRÉAS

Indication : [masse pancréatique / adénocarcinome prouvé], bilan d'extension et de résécabilité.

Technique :
Acquisition abdominale au temps pancréatique (≈ 45 s) et au temps portal, en coupes fines, avec reconstructions multiplanaires et MIP. Acquisition thoracique au temps portal.

Résultats :
Tumeur :
Lésion [hypodense] de la [tête / isthme / corps / queue] du pancréas, mesurant [x] × [x] mm.
Canal de Wirsung : [non dilaté / dilaté en amont, … mm], [avec / sans] atrophie du parenchyme d'amont.
Voie biliaire principale : [non dilatée / dilatée, … mm] [prothèse biliaire : non / oui].

Rapports artériels :
Artère mésentérique supérieure : [pas de contact / contact ≤ 180° / contact > 180°].
Tronc cœliaque : [pas de contact / contact ≤ 180° / contact > 180°].
Artère hépatique commune : [pas de contact / contact sans extension au tronc cœliaque ni à la bifurcation / contact étendu].
Lame rétro-porte : [non infiltrée / infiltrée].

Rapports veineux :
Veine mésentérique supérieure / tronc porte : [pas de contact / contact ≤ 180° sans déformation / contact > 180° ou déformation / thrombose], reconstruction [possible / non possible].

Variantes vasculaires :
[Pas de variante / Artère hépatique droite issue de l'AMS / Sténose ostiale du tronc cœliaque (ligament arqué ou athérome)].

Extension :
Foie : [pas de lésion suspecte / lésion(s) suspecte(s) …].
Péritoine : [pas de nodule de carcinose ni d'ascite / …].
Ganglions : [pas d'adénomégalie / …], en particulier pas d'adénomégalie lombo-aortique.
Thorax : [pas de nodule pulmonaire suspect / …].

Conclusion :
Tumeur de la [tête] du pancréas de [x] mm, [résécable / borderline / localement avancée], [sans / avec] lésion secondaire à distance.
[Variante vasculaire à signaler au chirurgien : …]`,
  },
  {
    id: 'irm-rectum', spe: 'digestif', mod: 'IRM',
    title: 'IRM pelvienne — bilan initial d\'un cancer du rectum',
    text: `IRM PELVIENNE — BILAN D'EXTENSION D'UN ADÉNOCARCINOME DU RECTUM

Indication : adénocarcinome du rectum [prouvé histologiquement], bilan initial.

Technique :
IRM [1,5 / 3] T, antenne en réseau phasé. Séquences T2 haute résolution sagittale, axiale et coronale obliques (perpendiculaire et parallèle à l'axe de la tumeur), diffusion.

Résultats :
Tumeur :
Localisation : [bas / moyen / haut] rectum ; pôle inférieur à [x] cm de la marge anale et à [x] cm de la jonction anorectale.
Hauteur tumorale : [x] cm. Extension circonférentielle : de [x] h à [x] h.
Position par rapport à la réflexion péritonéale : [au-dessous / au niveau / au-dessus].
Composante mucineuse : [non / oui].

Stade T : mrT[x]. Extension extramurale (EMS) : [x] mm.
Marge circonférentielle (CRM) : [x] mm à [x] h, [libre (> 1 mm) / envahie (< 1 mm)].
Invasion veineuse extramurale (EMVI) : [négative / positive].
Sphincters et releveurs (tumeurs du bas rectum) : [respectés / envahis …].

Ganglions :
Mésorectum : [pas de ganglion suspect / … ganglion(s) suspect(s) (contours irréguliers, signal hétérogène)] ; mrN[x].
Dépôts tumoraux : [non / oui].
Ganglions latéraux (iliaques internes, obturateurs) : [non suspects / suspects, petit axe … mm].

Conclusion :
Adénocarcinome du [bas / moyen / haut] rectum classé mrT[x] N[x], CRM [libre / envahie], EMVI [négative / positive].`,
  },
  {
    id: 'colique-nephretique', spe: 'uro', mod: 'TDM',
    title: 'Scanner sans injection — colique néphrétique',
    text: `SCANNER ABDOMINO-PELVIEN SANS INJECTION (FAIBLE DOSE) — COLIQUE NÉPHRÉTIQUE

Indication : douleur lombaire [droite / gauche], suspicion de colique néphrétique.

Technique :
Acquisition abdomino-pelvienne sans injection de produit de contraste, protocole faible dose.

Résultats :
Rein droit : [pas de dilatation des cavités pyélocalicielles / dilatation pyélocalicielle, pyélon de … mm]. [Pas de lithiase / Lithiase(s) de … mm].
Rein gauche : [pas de dilatation des cavités pyélocalicielles / dilatation pyélocalicielle, pyélon de … mm]. [Pas de lithiase / Lithiase(s) de … mm].
Uretères : [pas de lithiase urétérale visible / lithiase de … mm de l'uretère … droit / gauche, de densité … UH, à … cm de la jonction urétéro-vésicale].
Infiltration de la graisse périrénale : [non / oui].
Vessie : [pas de lithiase / …].
Pas d'autre anomalie notable sur cet examen sans injection ; appendice [normal / non visualisé].

Conclusion :
[Lithiase de … mm de l'uretère …, responsable d'une dilatation des cavités pyélocalicielles d'amont / Pas de lithiase urinaire ni de dilatation des cavités excrétrices].`,
  },
  {
    id: 'body-scanner', spe: 'trauma', mod: 'TDM',
    title: 'Body-scanner du polytraumatisé',
    text: `BODY-SCANNER — POLYTRAUMATISÉ

Indication : polytraumatisme [mécanisme], patient [stable / instable].

Technique :
Acquisition de l'encéphale et du rachis cervical sans injection, puis acquisition thoraco-abdomino-pelvienne après injection intraveineuse de produit de contraste iodé (temps artériel et portal). Reconstructions multiplanaires de l'ensemble du rachis et du bassin.

Résultats :
Encéphale : [pas de lésion traumatique intracrânienne / …].
Massif facial : [pas de fracture / …].
Rachis cervical : [pas de fracture ni de trouble de l'alignement / …].

Thorax :
Pas de pneumothorax ni d'hémothorax.
Pas de contusion pulmonaire.
Pas d'hémomédiastin ; aorte thoracique sans lésion traumatique ; pas d'épanchement péricardique.
Paroi : [pas de fracture costale / fractures des arcs … des côtes …]. Sternum et clavicules intacts.

Abdomen et pelvis :
Foie : [pas de lésion traumatique / lacération de … cm du segment …, grade AAST …].
Rate : [pas de lésion traumatique / …].
Reins, pancréas et surrénales : [pas de lésion traumatique / …].
Tube digestif et mésentère : pas de pneumopéritoine, pas d'infiltration mésentérique, pas d'épaississement pariétal.
Pas d'hémopéritoine. Pas d'extravasation de produit de contraste.
Vessie : [sans particularité / …].

Squelette :
Rachis thoracique et lombaire : [pas de fracture / …].
Bassin : [pas de fracture / …].

Conclusion :
[Pas de lésion traumatique décelable / Lésions par ordre de gravité : …].
Résultats transmis à [l'équipe du déchocage] à [heure].`,
  },
  {
    id: 'irm-spondylodiscite', spe: 'osteo', mod: 'IRM',
    title: 'IRM du rachis — suspicion de spondylodiscite',
    text: `IRM DU RACHIS [CERVICAL / DORSAL / LOMBAIRE] — SUSPICION DE SPONDYLODISCITE

Indication : [rachialgies inflammatoires fébriles, contexte]

Technique :
Séquences sagittales T1, T2 Dixon (ou STIR) et T1 avec suppression de graisse après injection de gadolinium ; coupes axiales T2 et T1 injectées centrées sur l'étage pathologique.

Résultats :
Étage atteint : [x].
Disque : [hypersignal T2, pincement, rehaussement après injection].
Plateaux vertébraux adjacents : [érosions / irrégularités], œdème osseux des corps vertébraux (hyposignal T1, hypersignal T2/STIR) avec rehaussement après injection.
Parties molles paravertébrales : [infiltration sans abcès / abcès de … mm (psoas droit / gauche, …)].
Espace épidural : [pas d'épidurite / épidurite / abcès épidural de … mm de hauteur].
Canal rachidien : [pas de compression médullaire ou radiculaire / compression de …].
Alignement : [conservé / cyphose / recul du mur postérieur].
Autres étages : [pas d'autre localisation / atteinte multifocale : …].

Conclusion :
Aspect de spondylodiscite [étage] [sans / avec] abcès paravertébral ou épidural, [sans / avec] compression neurologique.
Orientation : [pyogène / tuberculeuse / brucellienne]. Ponction-biopsie discovertébrale à discuter selon le contexte et les hémocultures.`,
  },
  {
    id: 'angio-aorte', spe: 'vasculaire', mod: 'TDM',
    title: 'Angio-scanner aortique — suspicion de syndrome aortique aigu',
    text: `ANGIO-SCANNER DE L'AORTE THORACO-ABDOMINALE — SUSPICION DE SYNDROME AORTIQUE AIGU

Indication : [douleur thoracique, contexte], suspicion de dissection aortique.

Technique :
Acquisition thoracique sans injection, puis acquisition angiographique de la crosse aortique aux artères fémorales après injection intraveineuse de produit de contraste iodé [avec synchronisation cardiaque].

Résultats :
Sans injection : pas d'hyperdensité spontanée en croissant de la paroi aortique (pas d'hématome de paroi).
Après injection :
Pas de flap intimal. Pas d'ulcère pénétrant.
Calibres aortiques : sinus de Valsalva [x] mm, aorte ascendante [x] mm, crosse [x] mm, aorte descendante [x] mm, aorte abdominale sous-rénale [x] mm.
Troncs supra-aortiques, tronc cœliaque, artère mésentérique supérieure, artères rénales et axes iliaques perméables.
Pas d'hémomédiastin. Pas d'épanchement péricardique ni pleural.

Conclusion :
Pas de syndrome aortique aigu : pas de dissection, pas d'hématome de paroi, pas d'ulcère pénétrant.`,
  },
  {
    id: 'echo-appendicite', spe: 'pediatrie', mod: 'Écho',
    title: 'Échographie — suspicion d\'appendicite (enfant)',
    text: `ÉCHOGRAPHIE ABDOMINALE — SUSPICION D'APPENDICITE

Indication : douleur de la fosse iliaque droite [fébrile], enfant de [x] ans.

Technique :
Exploration abdominale à la sonde convexe, puis de la fosse iliaque droite à la sonde linéaire haute fréquence avec compression dosée.

Résultats :
Appendice [visualisé, en position … / non visualisé].
Diamètre maximal : [x] mm, [compressible / non compressible].
Paroi : [fine / épaissie, avec perte de la différenciation des couches].
Hyperhémie pariétale au Doppler couleur : [non / oui].
Stercolithe : [non / oui].
Graisse périappendiculaire : [normale / hyperéchogène, infiltrée].
Épanchement ou collection : [non / épanchement de faible abondance / collection de … mm].
Adénopathies mésentériques : [non / oui].
Dernière anse iléale : [normale / épaissie].
Pas d'image d'invagination intestinale.
Ovaires (fille) : [normaux / non concerné].

Conclusion :
[Appendice fin et compressible : pas d'argument échographique pour une appendicite / Aspect d'appendicite aiguë (… non compliquée / compliquée : …)].`,
  },
];

/* ---------------------------------------------------------
   Phrases automatiques
   k     : mot-clé à taper (sans espace ni accent)
   alias : autres mots-clés possibles
   Plusieurs phrases peuvent partager le même mot-clé (variantes TDM / écho / IRM) :
   elles sont toutes proposées, la première est insérée en mode automatique.
   --------------------------------------------------------- */
const CR_PHRASES = [
  /* ----- Normal ----- */
  { k: 'foienormal', alias: [], organ: 'Foie', mod: 'TDM', type: 'normal', label: 'Foie normal',
    text: 'Foie de taille normale, de contours réguliers et de densité homogène, sans lésion focale décelable.' },
  { k: 'foienormal', alias: [], organ: 'Foie', mod: 'Écho', type: 'normal', label: 'Foie normal',
    text: 'Foie de taille normale, de contours réguliers, d\'échostructure homogène, sans lésion focale décelable.' },
  { k: 'vbnormale', alias: ['vbnormal'], organ: 'Voies biliaires', mod: 'TDM / Écho', type: 'normal', label: 'Vésicule et voies biliaires normales',
    text: 'Vésicule biliaire alithiasique à paroi fine. Pas de dilatation des voies biliaires intra- ou extra-hépatiques.' },
  { k: 'pancreasnormal', alias: [], organ: 'Pancréas', mod: 'TDM', type: 'normal', label: 'Pancréas normal',
    text: 'Pancréas de taille et de densité normales, sans lésion focale ni dilatation du canal de Wirsung.' },
  { k: 'ratenormale', alias: [], organ: 'Rate', mod: 'TDM / Écho', type: 'normal', label: 'Rate normale',
    text: 'Rate homogène, de taille normale.' },
  { k: 'reinsnormaux', alias: ['reinsnormal'], organ: 'Reins', mod: 'TDM / Écho', type: 'normal', label: 'Reins normaux',
    text: 'Reins de taille normale, bien différenciés, sans lésion focale ni dilatation des cavités pyélocalicielles.' },
  { k: 'surrenalesnormales', alias: [], organ: 'Surrénales', mod: 'TDM', type: 'normal', label: 'Surrénales normales',
    text: 'Surrénales fines, sans nodule.' },
  { k: 'cerveaunormal', alias: ['encephalenormal'], organ: 'Encéphale', mod: 'TDM', type: 'normal', label: 'Encéphale normal',
    text: 'Pas d\'hémorragie intra- ou extra-axiale. Pas d\'anomalie de densité parenchymateuse. Pas d\'effet de masse ; ligne médiane en place. Système ventriculaire de taille normale.' },
  { k: 'poumonsnormaux', alias: [], organ: 'Thorax', mod: 'TDM', type: 'normal', label: 'Poumons et plèvre normaux',
    text: 'Pas de condensation parenchymateuse, pas de nodule suspect. Pas d\'épanchement pleural ni péricardique.' },
  { k: 'osnormal', alias: [], organ: 'Squelette', mod: 'TDM', type: 'normal', label: 'Cadre osseux normal',
    text: 'Pas de lésion osseuse lytique ou condensante suspecte. Pas de fracture.' },

  /* ----- Foie ----- */
  { k: 'angiome', alias: ['hemangiome'], organ: 'Foie', mod: 'TDM', type: 'lesion', label: 'Angiome hépatique typique',
    text: 'Lésion nodulaire du segment [x] mesurant [x] mm, hypodense avant injection, présentant une prise de contraste périphérique nodulaire et discontinue au temps artériel, avec remplissage centripète progressif aux temps portal et tardif, en faveur d\'un angiome (hémangiome) hépatique typique.' },
  { k: 'angiome', alias: ['hemangiome'], organ: 'Foie', mod: 'Écho', type: 'lesion', label: 'Angiome hépatique typique',
    text: 'Nodule hépatique du segment [x] de [x] mm, hyperéchogène, homogène, bien limité, à contours nets, avec discret renforcement postérieur, sans vascularisation visible au Doppler couleur, d\'aspect typique d\'angiome hépatique.' },
  { k: 'angiome', alias: ['hemangiome'], organ: 'Foie', mod: 'IRM', type: 'lesion', label: 'Angiome hépatique typique',
    text: 'Lésion hépatique du segment [x] de [x] mm, en hyposignal T1 et en hypersignal T2 franc et homogène, présentant une prise de contraste périphérique nodulaire et discontinue avec remplissage centripète progressif, sans restriction vraie de la diffusion (ADC élevé), en faveur d\'un angiome hépatique typique.' },
  { k: 'kyste', alias: ['kystebiliaire'], organ: 'Foie', mod: 'TDM', type: 'lesion', label: 'Kyste biliaire simple',
    text: 'Formation hépatique du segment [x] de [x] mm, bien limitée, à paroi fine non visible, de densité liquidienne homogène (< 20 UH), sans cloison ni rehaussement après injection, en faveur d\'un kyste biliaire simple.' },
  { k: 'kyste', alias: ['kystebiliaire'], organ: 'Foie', mod: 'Écho', type: 'lesion', label: 'Kyste biliaire simple',
    text: 'Formation anéchogène hépatique du segment [x] de [x] mm, à paroi fine et régulière, avec renforcement acoustique postérieur, sans cloison ni végétation, en faveur d\'un kyste biliaire simple.' },
  { k: 'steatose', alias: [], organ: 'Foie', mod: 'Écho', type: 'lesion', label: 'Stéatose hépatique diffuse',
    text: 'Foie de taille [normale / augmentée], d\'échostructure homogène et hyperéchogène par rapport à la corticale rénale, avec atténuation postérieure du faisceau ultrasonore, en faveur d\'une stéatose hépatique [légère / modérée / sévère].' },
  { k: 'steatose', alias: [], organ: 'Foie', mod: 'TDM', type: 'lesion', label: 'Stéatose hépatique diffuse',
    text: 'Hypodensité diffuse et homogène du parenchyme hépatique (densité spontanée de [x] UH, inférieure à celle de la rate), en faveur d\'une stéatose hépatique.' },
  { k: 'epargne', alias: ['steatosefocale'], organ: 'Foie', mod: 'TDM / Écho', type: 'lesion', label: 'Zone d\'épargne stéatosique',
    text: 'Zone géographique [hypoéchogène / hyperdense] par rapport au reste du parenchyme stéatosique, [au contact de la vésicule / en regard du hile / du segment IV], sans effet de masse sur les vaisseaux, en faveur d\'une zone d\'épargne stéatosique.' },
  { k: 'hnf', alias: [], organ: 'Foie', mod: 'IRM', type: 'lesion', label: 'Hyperplasie nodulaire focale',
    text: 'Lésion hépatique du segment [x] de [x] mm, iso- ou discrètement hypo-intense en T1, iso- ou discrètement hyperintense en T2, présentant un rehaussement artériel intense et homogène, devenant iso-intense au parenchyme aux temps portal et tardif, avec cicatrice centrale en hypersignal T2 rehaussée tardivement, en faveur d\'une hyperplasie nodulaire focale.' },
  { k: 'cirrhose', alias: [], organ: 'Foie', mod: 'TDM / Écho', type: 'lesion', label: 'Foie de cirrhose',
    text: 'Foie dysmorphique, à contours bosselés, avec hypertrophie du lobe caudé et du secteur latéral gauche et atrophie du secteur postérieur droit, en faveur d\'une hépatopathie chronique. Signes d\'hypertension portale : [splénomégalie de … cm / circulation collatérale / ascite / absents].' },

  /* ----- Voies biliaires et pancréas ----- */
  { k: 'lithiase', alias: ['lithiasevesiculaire'], organ: 'Voies biliaires', mod: 'Écho', type: 'lesion', label: 'Lithiase vésiculaire simple',
    text: 'Vésicule biliaire contenant [une / plusieurs] image(s) hyperéchogène(s) mobile(s) avec cône d\'ombre postérieur, la plus volumineuse de [x] mm, en faveur d\'une lithiase vésiculaire. Paroi vésiculaire fine. Signe de Murphy échographique négatif. Pas de dilatation des voies biliaires.' },
  { k: 'cholecystite', alias: ['vesiculite'], organ: 'Voies biliaires', mod: 'Écho', type: 'aigu', label: 'Cholécystite aiguë lithiasique',
    text: 'Vésicule biliaire distendue, lithiasique [avec calcul enclavé dans le collet], à paroi épaissie ([x] mm) [et feuilletée], avec signe de Murphy échographique positif [et épanchement périvésiculaire], en faveur d\'une cholécystite aiguë lithiasique. Voie biliaire principale [non dilatée / dilatée à … mm].' },
  { k: 'pancreatite', alias: ['balthazar'], organ: 'Pancréas', mod: 'TDM', type: 'aigu', label: 'Pancréatite aiguë',
    text: 'Pancréas augmenté de volume, [hétérogène], avec infiltration de la graisse péripancréatique [et collection(s) liquidienne(s) aiguë(s) …], en faveur d\'une pancréatite aiguë. Grade de Balthazar [A / B / C / D / E]. Nécrose pancréatique : [absente / < 30 % / 30-50 % / > 50 %]. Score CTSI : [x]/10. [Pas de thrombose veineuse splénique ou portale / …].' },

  /* ----- Tube digestif ----- */
  { k: 'appendicite', alias: [], organ: 'Tube digestif', mod: 'TDM', type: 'aigu', label: 'Appendicite aiguë',
    text: 'Appendice [en position …] augmenté de calibre ([x] mm), à paroi épaissie et rehaussée, avec infiltration de la graisse périappendiculaire [et stercolithe], en faveur d\'une appendicite aiguë. [Pas de signe de complication : pas de pneumopéritoine, d\'abcès ni de défect pariétal / Signes de complication : …].' },
  { k: 'diverticulite', alias: ['sigmoidite'], organ: 'Tube digestif', mod: 'TDM', type: 'aigu', label: 'Diverticulite sigmoïdienne',
    text: 'Épaississement pariétal circonférentiel et régulier du côlon sigmoïde sur [x] cm, en regard de diverticules, avec infiltration de la graisse péricolique, en faveur d\'une diverticulite sigmoïdienne. [Non compliquée : pas de bulle extradigestive, d\'abcès ni de pneumopéritoine / Compliquée : abcès péricolique de … mm, bulles extradigestives …] (Hinchey [x]).' },
  { k: 'occlusion', alias: ['ocg'], organ: 'Tube digestif', mod: 'TDM', type: 'aigu', label: 'Occlusion du grêle',
    text: 'Distension des anses grêles (jusqu\'à [x] mm) avec niveaux hydro-aériques, en amont d\'une zone de transition [localisation], avec anses d\'aval plates, en faveur d\'une occlusion du grêle [sur bride probable / …]. Signes de souffrance : [absents / épaississement pariétal, défaut de rehaussement pariétal, infiltration mésentérique, épanchement intrapéritonéal, pneumatose pariétale]. Signe du tourbillon : [non / oui].' },
  { k: 'pneumoperitoine', alias: [], organ: 'Tube digestif', mod: 'TDM', type: 'aigu', label: 'Pneumopéritoine',
    text: 'Pneumopéritoine [de faible / de grande abondance] [et épanchement intrapéritonéal], témoignant d\'une perforation d\'organe creux. Siège présumé : [ulcère antro-pylorique / côlon …], argumenté par [défect pariétal / concentration des bulles / épaississement pariétal …].' },

  /* ----- Reins, surrénales, pelvis ----- */
  { k: 'kyste', alias: ['bosniak', 'kysterenal'], organ: 'Reins', mod: 'TDM', type: 'lesion', label: 'Kyste rénal simple (Bosniak I)',
    text: 'Formation kystique du rein [droit / gauche] ([pôle supérieur / médio-rénale / pôle inférieur]) de [x] mm, bien limitée, à paroi fine et régulière, de contenu liquidien homogène ([x] UH), sans cloison, calcification ni composante tissulaire rehaussée, correspondant à un kyste simple (Bosniak I).' },
  { k: 'kyste', alias: ['bosniak', 'kysterenal'], organ: 'Reins', mod: 'Écho', type: 'lesion', label: 'Kyste rénal simple',
    text: 'Formation anéchogène du rein [droit / gauche] de [x] mm, à paroi fine, avec renforcement postérieur, sans cloison ni végétation, en faveur d\'un kyste cortical simple.' },
  { k: 'angiomyolipome', alias: ['aml'], organ: 'Reins', mod: 'TDM', type: 'lesion', label: 'Angiomyolipome rénal',
    text: 'Lésion corticale du rein [droit / gauche] de [x] mm, contenant de la graisse macroscopique (densité < -10 UH), sans calcification, en faveur d\'un angiomyolipome.' },
  { k: 'lithiase', alias: ['lithiaseureterale'], organ: 'Reins', mod: 'TDM', type: 'aigu', label: 'Lithiase urétérale obstructive',
    text: 'Lithiase de [x] mm de l\'uretère [lombaire / iliaque / pelvien] [droit / gauche], de densité [x] UH, située à [x] cm de la jonction urétéro-vésicale, responsable d\'une dilatation des cavités pyélocalicielles d\'amont (pyélon de [x] mm), avec infiltration de la graisse périrénale. [Pas de signe de rupture de la voie excrétrice / …].' },
  { k: 'pyelonephrite', alias: ['pna'], organ: 'Reins', mod: 'TDM', type: 'aigu', label: 'Pyélonéphrite aiguë',
    text: 'Plages hypodenses triangulaires à base corticale du rein [droit / gauche] au temps néphrographique, avec infiltration de la graisse périrénale, en faveur d\'une pyélonéphrite aiguë. [Pas d\'abcès / Collection intrarénale de … mm évocatrice d\'abcès]. [Pas d\'obstacle sur la voie excrétrice / …].' },
  { k: 'adenome', alias: ['incidentalome'], organ: 'Surrénales', mod: 'TDM', type: 'lesion', label: 'Adénome surrénalien typique',
    text: 'Nodule de la surrénale [droite / gauche] de [x] mm, bien limité, homogène, de densité spontanée [x] UH (≤ 10 UH), en faveur d\'un adénome surrénalien riche en lipides.' },
  { k: 'kyste', alias: ['kysteovarien'], organ: 'Pelvis', mod: 'Écho', type: 'lesion', label: 'Kyste ovarien d\'aspect fonctionnel',
    text: 'Formation kystique de l\'ovaire [droit / gauche] de [x] mm, uniloculaire, anéchogène, à paroi fine et régulière, sans cloison, végétation ni vascularisation au Doppler, d\'aspect fonctionnel.' },

  /* ----- Encéphale ----- */
  { k: 'hsd', alias: ['sousdural'], organ: 'Encéphale', mod: 'TDM', type: 'aigu', label: 'Hématome sous-dural aigu',
    text: 'Collection extra-axiale [fronto-temporo-pariétale] [droite / gauche] spontanément hyperdense, en croissant, de [x] mm d\'épaisseur maximale, franchissant les sutures, en faveur d\'un hématome sous-dural aigu. Déviation de la ligne médiane de [x] mm. [Pas d\'engagement / Engagement sous-falcoriel / temporal].' },
  { k: 'hed', alias: ['extradural'], organ: 'Encéphale', mod: 'TDM', type: 'aigu', label: 'Hématome extradural',
    text: 'Collection extra-axiale [temporale] [droite / gauche] spontanément hyperdense, biconvexe, de [x] mm d\'épaisseur, limitée par les sutures, [associée à une fracture de la voûte en regard], en faveur d\'un hématome extradural. Déviation de la ligne médiane de [x] mm.' },
  { k: 'hsa', alias: ['sousarachnoidien'], organ: 'Encéphale', mod: 'TDM', type: 'aigu', label: 'Hémorragie sous-arachnoïdienne',
    text: 'Hyperdensité spontanée des [citernes de la base / vallées sylviennes / sillons corticaux …], en faveur d\'une hémorragie sous-arachnoïdienne [diffuse / localisée]. Score de Fisher modifié : [x]. [Pas de dilatation ventriculaire / Hydrocéphalie]. Angio-scanner du polygone de Willis : [pas d\'anévrisme visible / anévrisme de … mm de …].' },
  { k: 'avc', alias: ['aspects'], organ: 'Encéphale', mod: 'TDM', type: 'aigu', label: 'AVC ischémique',
    text: 'Hypodensité cortico-sous-corticale du territoire de l\'artère [cérébrale moyenne …] [droite / gauche], avec effacement des sillons et perte de la différenciation substance blanche / substance grise, en faveur d\'un AVC ischémique. Score ASPECTS : [x]/10. [Pas d\'hyperdensité spontanée artérielle / Hyperdensité spontanée de l\'artère … (thrombus)]. Pas de transformation hémorragique.' },
  { k: 'meningiome', alias: [], organ: 'Encéphale', mod: 'TDM / IRM', type: 'lesion', label: 'Méningiome',
    text: 'Lésion extra-axiale [localisation] de [x] mm, à large base d\'implantation durale, spontanément iso- à hyperdense, présentant un rehaussement intense et homogène après injection [avec épaississement dural en « queue de comète »], [sans / avec] œdème périlésionnel, d\'aspect évocateur de méningiome.' },
  { k: 'kystearachnoidien', alias: ['arachnoidien'], organ: 'Encéphale', mod: 'IRM', type: 'lesion', label: 'Kyste arachnoïdien',
    text: 'Formation extra-axiale [localisation] de [x] mm, de signal liquidien identique au LCS sur toutes les séquences (dont FLAIR), sans restriction de la diffusion ni rehaussement, refoulant les structures adjacentes sans les infiltrer, en faveur d\'un kyste arachnoïdien.' },
  { k: 'fazekas', alias: ['leucopathie', 'leucoaraiose'], organ: 'Encéphale', mod: 'IRM', type: 'lesion', label: 'Leucopathie vasculaire',
    text: 'Hypersignaux FLAIR de la substance blanche périventriculaire et profonde, [ponctiformes / en début de confluence / confluents], en faveur d\'une leucopathie vasculaire, Fazekas [1 / 2 / 3].' },

  /* ----- Thorax ----- */
  { k: 'ep', alias: ['embolie'], organ: 'Thorax', mod: 'TDM', type: 'aigu', label: 'Embolie pulmonaire',
    text: 'Défects endoluminaux [occlusifs / partiellement occlusifs] des artères pulmonaires [lobaires / segmentaires / sous-segmentaires] [droites / gauches / bilatérales], en faveur d\'une embolie pulmonaire. Rapport VD/VG : [x] ([pas de dilatation / dilatation] des cavités droites) [avec reflux de contraste dans la veine cave inférieure et les veines sus-hépatiques]. [Pas d\'infarctus pulmonaire / Condensation périphérique triangulaire du … évocatrice d\'infarctus pulmonaire].' },
  { k: 'pneumothorax', alias: ['pnx'], organ: 'Thorax', mod: 'Radio / TDM', type: 'aigu', label: 'Pneumothorax',
    text: 'Pneumothorax [droit / gauche] de [faible / moyenne / grande] abondance, avec décollement pleural de [x] mm à l\'apex. [Pas de signe de compression / Signes de compression : déviation médiastinale controlatérale, abaissement de la coupole]. [Pas d\'épanchement liquidien associé / Hydropneumothorax].' },
  { k: 'pneumopathie', alias: ['pneumonie'], organ: 'Thorax', mod: 'Radio / TDM', type: 'aigu', label: 'Pneumopathie',
    text: 'Condensation parenchymateuse alvéolaire [systématisée] du [lobe / segment …], avec bronchogramme aérique, en faveur d\'une pneumopathie infectieuse dans ce contexte. [Pas d\'épanchement pleural / Épanchement pleural réactionnel de faible abondance].' },
  { k: 'epanchement', alias: ['pleuresie'], organ: 'Thorax', mod: 'TDM', type: 'aigu', label: 'Épanchement pleural',
    text: 'Épanchement pleural liquidien [droit / gauche / bilatéral] de [faible / moyenne / grande] abondance, [de densité liquidienne homogène / avec épaississement et rehaussement des feuillets pleuraux, évocateur d\'empyème], [avec atélectasie passive du parenchyme adjacent].' },
  { k: 'nodule', alias: ['fleischner'], organ: 'Thorax', mod: 'TDM', type: 'lesion', label: 'Nodule pulmonaire',
    text: 'Nodule pulmonaire [solide / en verre dépoli / partiellement solide] du [lobe], mesurant [x] mm (diamètre moyen), [à contours réguliers / spiculés], [non calcifié]. Conduite à tenir selon les recommandations de la Fleischner Society (2017), en fonction du terrain.' },

  /* ----- Vaisseaux ----- */
  { k: 'dissection', alias: [], organ: 'Vaisseaux', mod: 'TDM', type: 'aigu', label: 'Dissection aortique',
    text: 'Flap intimal séparant un vrai et un faux chenal, étendu de [origine] à [extension distale], en faveur d\'une dissection aortique de type [A / B] de Stanford. Porte d\'entrée : [localisation]. Branches naissant du faux chenal : [aucune / …]. [Pas d\'épanchement péricardique / Épanchement péricardique]. [Pas de signe de malperfusion / Malperfusion de …].' },
  { k: 'aaa', alias: ['anevrisme'], organ: 'Vaisseaux', mod: 'TDM', type: 'aigu', label: 'Anévrisme de l\'aorte abdominale',
    text: 'Anévrisme fusiforme de l\'aorte abdominale sous-rénale de [x] mm de diamètre maximal (mesuré perpendiculairement à l\'axe du vaisseau), [avec thrombus mural], collet de [x] mm sous les artères rénales. [Pas de signe de fissuration ni de rupture / Hématome rétropéritonéal témoignant d\'une rupture].' },

  /* ----- Os et parties molles ----- */
  { k: 'angiome', alias: ['hemangiome', 'angiomevertebral'], organ: 'Squelette', mod: 'TDM / IRM', type: 'lesion', label: 'Hémangiome vertébral typique',
    text: 'Lésion du corps vertébral de [x] présentant des travées verticales épaissies (aspect « en pois » en coupe axiale, « en velours côtelé » en coupe sagittale), en hypersignal T1 et T2, sans extension aux parties molles ni à l\'espace épidural, en faveur d\'un hémangiome vertébral typique.' },
  { k: 'enostose', alias: ['ilot', 'ilotcondensant'], organ: 'Squelette', mod: 'TDM', type: 'lesion', label: 'Îlot condensant bénin (énostose)',
    text: 'Lésion osseuse condensante homogène de [x] mm [localisation], à contours spiculés « en brosse » se fondant avec les travées adjacentes, sans réaction périostée ni composante des parties molles, en faveur d\'un îlot condensant bénin (énostose).' },
  { k: 'lipome', alias: [], organ: 'Parties molles', mod: 'TDM / IRM', type: 'lesion', label: 'Lipome',
    text: 'Formation [sous-cutanée / intramusculaire] [localisation] de [x] mm, bien limitée, de densité et de signal graisseux homogènes identiques à la graisse sous-cutanée, sans cloison épaisse, composante tissulaire ni rehaussement, en faveur d\'un lipome.' },
  { k: 'fracture', alias: [], organ: 'Squelette', mod: 'Radio / TDM', type: 'aigu', label: 'Fracture',
    text: 'Fracture [non déplacée / déplacée de … mm] [simple / comminutive] de [os, segment], [sans / avec] extension articulaire.' },

  /* ----- Conclusions et formules ----- */
  { k: 'conclusionnormale', alias: [], organ: 'Formules', mod: 'Tous', type: 'conclusion', label: 'Conclusion : examen normal',
    text: 'Examen sans anomalie décelable.' },
  { k: 'transmis', alias: [], organ: 'Formules', mod: 'Tous', type: 'conclusion', label: 'Résultat transmis',
    text: 'Résultats transmis par téléphone au Dr [nom] à [heure].' },
  { k: 'comparatif', alias: [], organ: 'Formules', mod: 'Tous', type: 'conclusion', label: 'Comparaison avec un examen antérieur',
    text: 'Comparaison avec l\'examen du [date] : [stabilité / majoration / régression] de [lésion].' },
  { k: 'controle', alias: [], organ: 'Formules', mod: 'Tous', type: 'conclusion', label: 'Contrôle à prévoir',
    text: 'Contrôle par [examen] à [délai], à discuter selon le contexte clinique.' },
];
