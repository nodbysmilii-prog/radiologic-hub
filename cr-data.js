/* =========================================================
   RadiologicHub — données des comptes rendus types
   ---------------------------------------------------------
   • CR_TEMPLATES : comptes rendus types (bibliothèque de gauche)
   • CR_PHRASES   : phrases automatiques (mot-clé → description)

   Les éléments à compléter s'écrivent entre crochets : [x] mm,
   [droit / gauche]… La touche Tab passe d'un champ au suivant.
   Pas de crochets imbriqués : utiliser « … » à l'intérieur d'un choix.
   Formules du service : une constatation par ligne, précédée de « • ».
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
    title: 'TDM cérébrale sans injection — normale',
    text: `TDM CÉRÉBRALE

TECHNIQUE :
Acquisition hélicoïdale centrée sur l'encéphale sans injection de produit de contraste.

RÉSULTAT :
Au niveau de la fosse postérieure :
• Absence d'anomalie de la densité spontanée du parenchyme cérébelleux et du tronc cérébral.
• Le 4e ventricule est en place, non dilaté.
• Les citernes de la base sont libres.

À l'étage sus-tentoriel :
• Absence d'anomalie de la densité spontanée du parenchyme cérébral.
• Les structures médianes sont en place.
• Absence d'hydrocéphalie.

Étude osseuse :
• Absence de lésion osseuse suspecte.

AU TOTAL :
TDM cérébrale sans anomalie significative en contraste spontané.`,
  },
  {
    id: 'alerte-avc', spe: 'neuro', mod: 'TDM',
    title: 'Alerte AVC — TDM + angio-TDM TSA et Willis',
    text: `TDM CÉRÉBRALE ET ANGIO-TDM DES TRONCS SUPRA-AORTIQUES ET DU POLYGONE DE WILLIS — ALERTE AVC

INDICATION :
Déficit neurologique brutal [type de déficit], début des symptômes à [heure], NIHSS [x].

TECHNIQUE :
Acquisition hélicoïdale centrée sur l'encéphale sans injection, puis acquisition angiographique de la crosse aortique au vertex après injection intraveineuse de produit de contraste iodé. Perfusion : [non réalisée / réalisée].

RÉSULTAT :
Parenchyme :
• Absence d'hémorragie intracrânienne.
• [Absence d'hypodensité parenchymateuse récente / Hypodensité du territoire …], score ASPECTS [x]/10.
• [Absence d'hyperdensité spontanée artérielle / Hyperdensité spontanée de l'artère …].

Angio-TDM :
• Circulation intracrânienne : [absence d'occlusion artérielle proximale / occlusion de …].
• Collatéralité : [bonne / intermédiaire / pauvre].
• Bifurcations carotidiennes : [absence de sténose significative / sténose de … % (NASCET) de la carotide interne …].
• Artères vertébrales et tronc basilaire : [perméables / …].
• Crosse aortique et origine des troncs supra-aortiques : [sans particularité / …].

AU TOTAL :
Absence d'hémorragie intracrânienne. ASPECTS [x]/10.
[Absence d'occlusion artérielle proximale / Occlusion de … accessible à une thrombectomie].
Résultats transmis à l'équipe neurovasculaire à [heure].`,
  },
  {
    id: 'radio-thorax', spe: 'thorax', mod: 'Radio',
    title: 'Radiographie du thorax — normale',
    text: `RADIOGRAPHIE DU THORAX DE FACE

COMPTE-RENDU :
• Cliché de face [debout / couché], de qualité satisfaisante.
• Absence de foyer de condensation parenchymateuse.
• Absence d'épanchement pleural liquidien ou gazeux ; culs-de-sac pleuraux libres.
• Médiastin de largeur normale. Silhouette cardiaque de taille normale.
• Hiles de taille et de densité normales.
• Absence de pneumopéritoine visible sous les coupoles.
• Absence de lésion osseuse suspecte.`,
  },
  {
    id: 'tdm-thorax', spe: 'thorax', mod: 'TDM',
    title: 'TDM thoracique sans injection — normale',
    text: `TDM THORACIQUE

TECHNIQUE :
Acquisition hélicoïdale depuis les apex pulmonaires jusqu'aux bases sans injection de produit de contraste.

RÉSULTAT :
*Étude parenchymateuse et pleuro-pariétale :
• La trachée et les bronches sont libres.
• Absence de lésion parenchymateuse d'allure évolutive.
• Absence d'épanchement pleural.
• Absence de lésion osseuse suspecte.

*Étude médiastinale :
• Absence d'adénomégalie médiastinale.
• Absence d'épanchement péricardique.

CONCLUSION :
[TDM thoracique sans anomalie significative / …]`,
  },
  {
    id: 'angio-ep', spe: 'thorax', mod: 'TDM',
    title: 'Angio-TDM thoracique — recherche d\'embolie pulmonaire',
    text: `ANGIO-TDM THORACIQUE — RECHERCHE D'EMBOLIE PULMONAIRE

TECHNIQUE :
Acquisition hélicoïdale depuis les apex pulmonaires jusqu'aux bases au temps artériel pulmonaire après injection intraveineuse de produit de contraste iodé. Opacification des artères pulmonaires : [bonne / satisfaisante / limitée].

RÉSULTAT :
*Étude vasculaire :
• Absence de défect endoluminal des artères pulmonaires jusqu'à l'étage [segmentaire / sous-segmentaire].
• Tronc de l'artère pulmonaire de calibre normal ([x] mm).
• Cavités cardiaques droites non dilatées (rapport VD/VG < 1).
• Aorte thoracique de calibre normal.

*Étude parenchymateuse et pleuro-pariétale :
• La trachée et les bronches sont libres.
• Absence de condensation parenchymateuse.
• Absence de lésion parenchymateuse d'allure évolutive.
• Absence d'épanchement pleural.
• Absence de lésion osseuse suspecte.

*Étude médiastinale :
• Absence d'adénomégalie médiastinale.
• Absence d'épanchement péricardique.
• Coupes passant par l'abdomen supérieur sans anomalie notable.

AU TOTAL :
Absence d'embolie pulmonaire jusqu'à l'étage [segmentaire / sous-segmentaire].
Absence d'autre anomalie pouvant expliquer la symptomatologie.`,
  },
  {
    id: 'tdm-abdo', spe: 'digestif', mod: 'TDM',
    title: 'TDM abdomino-pelvienne avec injection — normale',
    text: `TDM ABDOMINO-PELVIENNE

TECHNIQUE :
Acquisition hélicoïdale abdomino-pelvienne au temps portal après injection intraveineuse de produit de contraste iodé.

RÉSULTAT :
*Étude des organes pleins :
• Foie de taille normale, de contours réguliers et de densité homogène, sans lésion focale décelable. Veine porte et veines sus-hépatiques perméables.
• Vésicule biliaire alithiasique à paroi fine. Absence de dilatation des voies biliaires intra- ou extra-hépatiques.
• Pancréas de taille et de densité normales, sans dilatation du canal de Wirsung.
• Rate homogène, de taille normale.
• Surrénales fines.
• Reins de taille normale, sans lésion focale ni dilatation des cavités pyélocalicielles. Néphrographie symétrique.

*Étude du pelvis :
• Vessie en réplétion partielle, sans anomalie pariétale.
• [Utérus et régions annexielles / Prostate] sans particularité.

*Étude digestive et péritonéale :
• Absence de distension ni d'épaississement pariétal digestif.
• Appendice [visualisé, de calibre normal / non visualisé, sans infiltration de la fosse iliaque droite].
• Absence de pneumopéritoine. Absence d'épanchement intrapéritonéal.
• Absence d'adénomégalie abdomino-pelvienne.
• Aorte abdominale de calibre normal.

*Étude des bases pulmonaires et osseuse :
• Bases pulmonaires sans anomalie.
• Absence de lésion osseuse suspecte.

AU TOTAL :
TDM abdomino-pelvienne sans anomalie significative, en particulier absence d'appendicite, d'occlusion et de pneumopéritoine.`,
  },
  {
    id: 'echo-abdo', spe: 'digestif', mod: 'Écho',
    title: 'Échographie abdominale — normale',
    text: `ÉCHOGRAPHIE ABDOMINALE

RÉSULTAT :
• Foie de taille normale (flèche hépatique de [x] cm sur la ligne médioclaviculaire), de contours réguliers, d'échostructure homogène, sans lésion focale décelable.
• Tronc porte perméable, de calibre normal, à flux hépatopète.
• Vésicule biliaire alithiasique, non distendue, à paroi fine. Signe de Murphy échographique négatif.
• Voie biliaire principale non dilatée ([x] mm). Absence de dilatation des voies biliaires intra-hépatiques.
• Pancréas [d'échostructure homogène / partiellement masqué par les gaz digestifs].
• Rate homogène, de taille normale ([x] cm).
• Reins de taille normale (droit [x] cm, gauche [x] cm), bien différenciés, sans dilatation des cavités pyélocalicielles ni lithiase visible.
• Aorte abdominale de calibre normal.
• Absence d'épanchement intrapéritonéal.

AU TOTAL :
Échographie abdominale sans anomalie significative.`,
  },
  {
    id: 'tdm-pancreas', spe: 'digestif', mod: 'TDM',
    title: 'Adénocarcinome du pancréas — bilan d\'extension et résécabilité',
    text: `TDM THORACO-ABDOMINO-PELVIENNE — BILAN D'UN ADÉNOCARCINOME DU PANCRÉAS

INDICATION :
[Masse pancréatique / Adénocarcinome prouvé], bilan d'extension et de résécabilité.

TECHNIQUE :
Acquisition abdominale au temps pancréatique (≈ 45 s) et au temps portal, en coupes fines, avec reconstructions multiplanaires et MIP. Acquisition thoracique au temps portal.

RÉSULTAT :
Tumeur :
• Lésion [hypodense] de la [tête / isthme / corps / queue] du pancréas, mesurant [x] × [x] mm.
• Canal de Wirsung : [non dilaté / dilaté en amont, … mm], [avec / sans] atrophie du parenchyme d'amont.
• Voie biliaire principale : [non dilatée / dilatée, … mm] [prothèse biliaire : non / oui].

Rapports artériels :
• Artère mésentérique supérieure : [absence de contact / contact ≤ 180° / contact > 180°].
• Tronc cœliaque : [absence de contact / contact ≤ 180° / contact > 180°].
• Artère hépatique commune : [absence de contact / contact sans extension au tronc cœliaque ni à la bifurcation / contact étendu].
• Lame rétro-porte : [non infiltrée / infiltrée].

Rapports veineux :
• Veine mésentérique supérieure / tronc porte : [absence de contact / contact ≤ 180° sans déformation / contact > 180° ou déformation / thrombose], reconstruction [possible / non possible].

Variantes vasculaires :
• [Absence de variante / Artère hépatique droite issue de l'AMS / Sténose ostiale du tronc cœliaque (ligament arqué ou athérome)].

Extension :
• Foie : [absence de lésion suspecte / lésion(s) suspecte(s) …].
• Péritoine : [absence de nodule de carcinose ni d'ascite / …].
• Ganglions : [absence d'adénomégalie / …], en particulier absence d'adénomégalie lombo-aortique.
• Thorax : [absence de nodule pulmonaire suspect / …].

AU TOTAL :
Tumeur de la [tête] du pancréas de [x] mm, [résécable / borderline / localement avancée], [sans / avec] lésion secondaire à distance.
[Variante vasculaire à signaler au chirurgien : …]`,
  },
  {
    id: 'irm-rectum', spe: 'digestif', mod: 'IRM',
    title: 'IRM pelvienne — bilan initial d\'un cancer du rectum',
    text: `IRM PELVIENNE — BILAN D'EXTENSION D'UN ADÉNOCARCINOME DU RECTUM

INDICATION :
Adénocarcinome du rectum [prouvé histologiquement], bilan initial.

TECHNIQUE :
IRM [1,5 / 3] T, antenne en réseau phasé. Séquences T2 haute résolution sagittale, axiale et coronale obliques (perpendiculaire et parallèle à l'axe de la tumeur), diffusion.

RÉSULTAT :
Tumeur :
• Localisation : [bas / moyen / haut] rectum ; pôle inférieur à [x] cm de la marge anale et à [x] cm de la jonction anorectale.
• Hauteur tumorale : [x] cm. Extension circonférentielle : de [x] h à [x] h.
• Position par rapport à la réflexion péritonéale : [au-dessous / au niveau / au-dessus].
• Composante mucineuse : [non / oui].

Extension locale :
• Stade T : mrT[x]. Extension extramurale (EMS) : [x] mm.
• Marge circonférentielle (CRM) : [x] mm à [x] h, [libre (> 1 mm) / envahie (< 1 mm)].
• Invasion veineuse extramurale (EMVI) : [négative / positive].
• Sphincters et releveurs (tumeurs du bas rectum) : [respectés / envahis …].

Ganglions :
• Mésorectum : [absence de ganglion suspect / … ganglion(s) suspect(s) (contours irréguliers, signal hétérogène)] ; mrN[x].
• Dépôts tumoraux : [non / oui].
• Ganglions latéraux (iliaques internes, obturateurs) : [non suspects / suspects, petit axe … mm].

AU TOTAL :
Adénocarcinome du [bas / moyen / haut] rectum classé mrT[x] N[x], CRM [libre / envahie], EMVI [négative / positive].`,
  },
  {
    id: 'colique-nephretique', spe: 'uro', mod: 'TDM',
    title: 'TDM sans injection — colique néphrétique',
    text: `TDM ABDOMINO-PELVIENNE SANS INJECTION (FAIBLE DOSE) — COLIQUE NÉPHRÉTIQUE

INDICATION :
Douleur lombaire [droite / gauche], suspicion de colique néphrétique.

TECHNIQUE :
Acquisition hélicoïdale abdomino-pelvienne sans injection de produit de contraste, protocole faible dose.

RÉSULTAT :
• Rein droit : [absence de dilatation des cavités pyélocalicielles / dilatation pyélocalicielle, pyélon de … mm]. [Absence de lithiase / Lithiase(s) de … mm].
• Rein gauche : [absence de dilatation des cavités pyélocalicielles / dilatation pyélocalicielle, pyélon de … mm]. [Absence de lithiase / Lithiase(s) de … mm].
• Uretères : [absence de lithiase urétérale visible / lithiase de … mm de l'uretère … droit / gauche, de densité … UH, à … cm de la jonction urétéro-vésicale].
• Infiltration de la graisse périrénale : [non / oui].
• Vessie : [absence de lithiase / …].
• Absence d'autre anomalie notable sur cet examen sans injection ; appendice [normal / non visualisé].

AU TOTAL :
[Lithiase de … mm de l'uretère …, responsable d'une dilatation des cavités pyélocalicielles d'amont / Absence de lithiase urinaire ni de dilatation des cavités excrétrices].`,
  },
  {
    id: 'body-scanner', spe: 'trauma', mod: 'TDM',
    title: 'Body-scanner du polytraumatisé',
    text: `BODY-SCANNER — POLYTRAUMATISÉ

INDICATION :
Polytraumatisme [mécanisme], patient [stable / instable].

TECHNIQUE :
Acquisition hélicoïdale de l'encéphale et du rachis cervical sans injection, puis acquisition thoraco-abdomino-pelvienne après injection intraveineuse de produit de contraste iodé (temps artériel et portal). Reconstructions multiplanaires de l'ensemble du rachis et du bassin.

RÉSULTAT :
Encéphale, face et rachis cervical :
• Encéphale : [absence de lésion traumatique intracrânienne / …].
• Massif facial : [absence de fracture / …].
• Rachis cervical : [absence de fracture ni de trouble de l'alignement / …].

Thorax :
• Absence de pneumothorax ni d'hémothorax.
• Absence de contusion pulmonaire.
• Absence d'hémomédiastin ; aorte thoracique sans lésion traumatique ; absence d'épanchement péricardique.
• Paroi : [absence de fracture costale / fractures des arcs … des côtes …]. Sternum et clavicules intacts.

Abdomen et pelvis :
• Foie : [absence de lésion traumatique / lacération de … cm du segment …, grade AAST …].
• Rate : [absence de lésion traumatique / …].
• Reins, pancréas et surrénales : [absence de lésion traumatique / …].
• Tube digestif et mésentère : absence de pneumopéritoine, d'infiltration mésentérique ou d'épaississement pariétal.
• Absence d'hémopéritoine. Absence d'extravasation de produit de contraste.
• Vessie : [sans particularité / …].

Squelette :
• Rachis thoracique et lombaire : [absence de fracture / …].
• Bassin : [absence de fracture / …].

AU TOTAL :
[Absence de lésion traumatique décelable / Lésions par ordre de gravité : …].
Résultats transmis à [l'équipe du déchocage] à [heure].`,
  },
  {
    id: 'irm-spondylodiscite', spe: 'osteo', mod: 'IRM',
    title: 'IRM du rachis — suspicion de spondylodiscite',
    text: `IRM DU RACHIS [CERVICAL / DORSAL / LOMBAIRE] — SUSPICION DE SPONDYLODISCITE

TECHNIQUE :
Séquences sagittales T1, T2 Dixon (ou STIR) et T1 avec suppression de graisse après injection de gadolinium ; coupes axiales T2 et T1 injectées centrées sur l'étage pathologique.

RÉSULTAT :
• Étage atteint : [x].
• Disque : [hypersignal T2, pincement, rehaussement après injection].
• Plateaux vertébraux adjacents : [érosions / irrégularités], œdème osseux des corps vertébraux (hyposignal T1, hypersignal T2/STIR) avec rehaussement après injection.
• Parties molles paravertébrales : [infiltration sans abcès / abcès de … mm (psoas droit / gauche, …)].
• Espace épidural : [absence d'épidurite / épidurite / abcès épidural de … mm de hauteur].
• Canal rachidien : [absence de compression médullaire ou radiculaire / compression de …].
• Alignement : [conservé / cyphose / recul du mur postérieur].
• Autres étages : [absence d'autre localisation / atteinte multifocale : …].

AU TOTAL :
Aspect de spondylodiscite [étage] [sans / avec] abcès paravertébral ou épidural, [sans / avec] compression neurologique.
Orientation : [pyogène / tuberculeuse / brucellienne]. Ponction-biopsie discovertébrale à discuter selon le contexte et les hémocultures.`,
  },
  {
    id: 'irm-medullaire', spe: 'osteo', mod: 'IRM',
    title: 'IRM médullaire (rachis entier) — normale',
    text: `IRM MÉDULLAIRE

TECHNIQUE :
Exploration du rachis par des coupes sagittales T1, T2 STIR et par des coupes transversales de C3 à C7 et sur les 3 derniers étages lombaires.

RÉSULTAT :
Au niveau cervico-dorsal :
• Absence d'anomalie osseuse ou nerveuse de la charnière cervico-occipitale.
• Absence de sténose canalaire constitutionnelle.
• Absence de spondylolisthésis.
• Absence d'anomalie de hauteur ni de morphologie des corps vertébraux.
• Absence de lésion osseuse focale lytique ou condensante d'allure rapidement évolutive.
• Absence d'anomalie de signal T1 ou STIR en regard des enthèses.
• Absence d'épaississement ni de masse épidurale.
• Absence d'anomalie de signal du cordon médullaire.
• Absence d'anomalie des parties molles péri-vertébrales.

C2-C3 :
• Absence de saillie discale.
• [Absence d'arthrose / Arthrose] interapophysaire postérieure.
• Absence de plicature des ligaments jaunes.
• Absence de rétrécissement foraminal.

C3-C4 :
• Absence de saillie discale.
• [Absence d'arthrose / Arthrose] interapophysaire postérieure.
• Absence de plicature des ligaments jaunes.
• Absence de rétrécissement foraminal.

C4-C5 :
• Absence de saillie discale.
• [Absence d'arthrose / Arthrose] interapophysaire postérieure.
• Absence de plicature des ligaments jaunes.
• Absence de rétrécissement foraminal.

C5-C6 :
• Absence de saillie discale.
• [Absence d'arthrose / Arthrose] interapophysaire postérieure.
• Absence de plicature des ligaments jaunes.
• Absence de rétrécissement foraminal.

C6-C7 :
• Absence de saillie discale.
• [Absence d'arthrose / Arthrose] interapophysaire postérieure.
• Absence de plicature des ligaments jaunes.
• Absence de rétrécissement foraminal.

Au niveau dorsal :
• Pas de conflit contenant-contenu à l'étage dorsal.
• La moelle dorsale est de morphologie et de signal normaux.
• Pas d'anomalie suspecte du signal osseux à l'étage dorsal.
• Pas de signe d'épidurite ni de masse épidurale.
• Absence d'anomalie des parties molles péri-vertébrales.

Au niveau lombaire :
• Absence de sténose canalaire constitutionnelle.
• Cône terminal à la hauteur de L1, de signal et de morphologie normaux.
• Absence de spondylolisthésis.
• Absence d'anomalie transitionnelle.
• Absence d'anomalie de hauteur ou de morphologie des corps vertébraux.
• Absence d'anomalie suspecte du signal osseux.
• Absence de signe d'épidurite ni de masse épidurale.
• Absence d'anomalie des parties molles péri-vertébrales.

L1-L2 :
• Absence de saillie discale.
• [Absence d'arthrose / Arthrose] interapophysaire postérieure.
• Absence d'hypertrophie des ligaments jaunes.
• Absence de rétrécissement foraminal.

L2-L3 :
• Absence de saillie discale.
• [Absence d'arthrose / Arthrose] interapophysaire postérieure.
• Absence d'hypertrophie des ligaments jaunes.
• Absence de rétrécissement foraminal.

L3-L4 :
• Absence de saillie discale.
• [Absence d'arthrose / Arthrose] interapophysaire postérieure.
• Absence d'hypertrophie des ligaments jaunes.
• Absence de rétrécissement foraminal.

L4-L5 :
• Absence de saillie discale.
• [Absence d'arthrose / Arthrose] interapophysaire postérieure.
• Absence d'hypertrophie des ligaments jaunes.
• Absence de rétrécissement foraminal.

L5-S1 :
• Absence de saillie discale.
• [Absence d'arthrose / Arthrose] interapophysaire postérieure.
• Absence d'hypertrophie des ligaments jaunes.
• Absence de rétrécissement foraminal.

Au niveau du bassin :
• Les coupes coronales en pondération T2 avec saturation du signal de la graisse ne montrent pas d'anomalie de signal en regard des enthèses des fessiers et des ischio-jambiers.
• Absence d'anomalie de signal des berges articulaires des coxo-fémorales et des sacro-iliaques.
• Absence d'épanchement intra-articulaire.
• Absence d'épaississement synovial.

AU TOTAL :
[conclusion]`,
  },
  {
    id: 'rx-rachis-lombaire', spe: 'osteo', mod: 'Radio',
    title: 'Radiographie du rachis lombaire (F + P) — normale',
    text: `RADIOGRAPHIE DU RACHIS LOMBAIRE DE FACE ET DE PROFIL

COMPTE-RENDU :
• Minéralisation osseuse normale.
• Absence de lésion lytique ou condensante suspecte.
• Lordose vertébrale conservée.
• Canal lombaire de dimension normale.
• Hauteur vertébrale et des espaces intersomatiques conservée.
• Intégrité du mur postérieur.
• Absence d'arthrose interapophysaire postérieure.
• Absence d'anomalie des parties molles.`,
  },
  {
    id: 'rx-genou', spe: 'osteo', mod: 'Radio',
    title: 'Radiographie du genou (F + P) — normale',
    text: `RADIOGRAPHIE [DU GENOU / DES GENOUX] DE FACE ET DE PROFIL

COMPTE-RENDU :
• Minéralisation osseuse conservée.
• Absence de lésion lytique ou condensante suspecte.
• Intégrité des interlignes articulaires.
• Absence d'épanchement intra-articulaire.
• Intégrité des parties molles.`,
  },
  {
    id: 'rx-genou-gonarthrose', spe: 'osteo', mod: 'Radio',
    title: 'Radiographie du genou (F + P) — gonarthrose',
    text: `RADIOGRAPHIE [DU GENOU / DES GENOUX] DE FACE ET DE PROFIL

COMPTE-RENDU :
• Déminéralisation osseuse diffuse.
• Absence de lésion lytique ou condensante suspecte.
• Gonarthrose fémoro-tibiale [bilatérale / droite / gauche] plus marquée au compartiment [médial / latéral] avec pincement de l'interligne articulaire, condensation de l'os sous-chondral et ostéophytes.
• Gonarthrose fémoro-patellaire [bilatérale / droite / gauche] avec pincement de l'interligne articulaire, condensation de l'os sous-chondral et ostéophytes.
• Absence d'épanchement intra-articulaire.
• Intégrité des parties molles.`,
  },
  {
    id: 'angio-aorte', spe: 'vasculaire', mod: 'TDM',
    title: 'Angio-TDM aortique — suspicion de syndrome aortique aigu',
    text: `ANGIO-TDM DE L'AORTE THORACO-ABDOMINALE — SUSPICION DE SYNDROME AORTIQUE AIGU

TECHNIQUE :
Acquisition hélicoïdale thoracique sans injection, puis acquisition angiographique de la crosse aortique aux artères fémorales après injection intraveineuse de produit de contraste iodé [avec synchronisation cardiaque].

RÉSULTAT :
Sans injection :
• Absence d'hyperdensité spontanée en croissant de la paroi aortique (absence d'hématome de paroi).

Après injection :
• Absence de flap intimal. Absence d'ulcère pénétrant.
• Calibres aortiques : sinus de Valsalva [x] mm, aorte ascendante [x] mm, crosse [x] mm, aorte descendante [x] mm, aorte abdominale sous-rénale [x] mm.
• Troncs supra-aortiques, tronc cœliaque, artère mésentérique supérieure, artères rénales et axes iliaques perméables.
• Absence d'hémomédiastin. Absence d'épanchement péricardique ou pleural.

AU TOTAL :
Absence de syndrome aortique aigu : absence de dissection, d'hématome de paroi ou d'ulcère pénétrant.`,
  },
  {
    id: 'echo-appendicite', spe: 'pediatrie', mod: 'Écho',
    title: 'Échographie — suspicion d\'appendicite (enfant)',
    text: `ÉCHOGRAPHIE ABDOMINALE — SUSPICION D'APPENDICITE

INDICATION :
Douleur de la fosse iliaque droite [fébrile], enfant de [x] ans.

TECHNIQUE :
Exploration abdominale à la sonde convexe, puis de la fosse iliaque droite à la sonde linéaire haute fréquence avec compression dosée.

RÉSULTAT :
• Appendice [visualisé, en position … / non visualisé].
• Diamètre maximal : [x] mm, [compressible / non compressible].
• Paroi : [fine / épaissie, avec perte de la différenciation des couches].
• Hyperhémie pariétale au Doppler couleur : [non / oui].
• Stercolithe : [non / oui].
• Graisse périappendiculaire : [normale / hyperéchogène, infiltrée].
• Épanchement ou collection : [non / épanchement de faible abondance / collection de … mm].
• Adénopathies mésentériques : [non / oui].
• Dernière anse iléale : [normale / épaissie].
• Absence d'image d'invagination intestinale.
• Ovaires (fille) : [normaux / non concerné].

AU TOTAL :
[Appendice fin et compressible : absence d'argument échographique pour une appendicite / Aspect d'appendicite aiguë (… non compliquée / compliquée : …)].`,
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
  { k: 'cerveaunormal', alias: ['encephalenormal'], organ: 'Encéphale', mod: 'TDM', type: 'normal', label: 'Encéphale normal (fosse postérieure + sus-tentoriel)',
    text: `Au niveau de la fosse postérieure :
• Absence d'anomalie de la densité spontanée du parenchyme cérébelleux et du tronc cérébral.
• Le 4e ventricule est en place, non dilaté.
• Les citernes de la base sont libres.

À l'étage sus-tentoriel :
• Absence d'anomalie de la densité spontanée du parenchyme cérébral.
• Les structures médianes sont en place.
• Absence d'hydrocéphalie.` },
  { k: 'fossepost', alias: ['fossenormale'], organ: 'Encéphale', mod: 'TDM', type: 'normal', label: 'Fosse postérieure normale',
    text: `• Absence d'anomalie de la densité spontanée du parenchyme cérébelleux et du tronc cérébral.
• Le 4e ventricule est en place, non dilaté.
• Les citernes de la base sont libres.` },
  { k: 'sustentoriel', alias: ['sustentorielnormal'], organ: 'Encéphale', mod: 'TDM', type: 'normal', label: 'Étage sus-tentoriel normal',
    text: `• Absence d'anomalie de la densité spontanée du parenchyme cérébral.
• Les structures médianes sont en place.
• Absence d'hydrocéphalie.` },
  { k: 'poumonsnormaux', alias: ['parenchymenormal'], organ: 'Thorax', mod: 'TDM', type: 'normal', label: 'Parenchyme et plèvre normaux',
    text: `• La trachée et les bronches sont libres.
• Absence de lésion parenchymateuse d'allure évolutive.
• Absence d'épanchement pleural.` },
  { k: 'mediastinnormal', alias: [], organ: 'Thorax', mod: 'TDM', type: 'normal', label: 'Médiastin normal',
    text: `• Absence d'adénomégalie médiastinale.
• Absence d'épanchement péricardique.` },
  { k: 'osnormal', alias: ['lesionosseuse'], organ: 'Squelette', mod: 'Tous', type: 'normal', label: 'Pas de lésion osseuse suspecte',
    text: `Absence de lésion lytique ou condensante suspecte.` },
  { k: 'mineralisation', alias: [], organ: 'Squelette', mod: 'Radio', type: 'normal', label: 'Minéralisation osseuse conservée',
    text: `Minéralisation osseuse conservée.` },
  { k: 'rachislombnormal', alias: ['rxlombaire'], organ: 'Rachis', mod: 'Radio', type: 'normal', label: 'Rachis lombaire normal (radio F + P)',
    text: `• Minéralisation osseuse normale.
• Absence de lésion lytique ou condensante suspecte.
• Lordose vertébrale conservée.
• Canal lombaire de dimension normale.
• Hauteur vertébrale et des espaces intersomatiques conservée.
• Intégrité du mur postérieur.
• Absence d'arthrose interapophysaire postérieure.
• Absence d'anomalie des parties molles.` },
  { k: 'etagecervical', alias: ['etagec'], organ: 'Rachis', mod: 'IRM', type: 'normal', label: 'Étage cervical (C2-C3…C6-C7)',
    text: `[étage] :
• Absence de saillie discale.
• [Absence d'arthrose / Arthrose] interapophysaire postérieure.
• Absence de plicature des ligaments jaunes.
• Absence de rétrécissement foraminal.` },
  { k: 'etagelombaire', alias: ['etagel'], organ: 'Rachis', mod: 'IRM', type: 'normal', label: 'Étage lombaire (L1-L2…L5-S1)',
    text: `[étage] :
• Absence de saillie discale.
• [Absence d'arthrose / Arthrose] interapophysaire postérieure.
• Absence d'hypertrophie des ligaments jaunes.
• Absence de rétrécissement foraminal.` },
  { k: 'dorsalnormal', alias: [], organ: 'Rachis', mod: 'IRM', type: 'normal', label: 'Étage dorsal normal',
    text: `• Pas de conflit contenant-contenu à l'étage dorsal.
• La moelle dorsale est de morphologie et de signal normaux.
• Pas d'anomalie suspecte du signal osseux à l'étage dorsal.
• Pas de signe d'épidurite ni de masse épidurale.
• Absence d'anomalie des parties molles péri-vertébrales.` },
  { k: 'conenormal', alias: [], organ: 'Rachis', mod: 'IRM', type: 'normal', label: 'Cône terminal normal',
    text: `Cône terminal à la hauteur de L1, de signal et de morphologie normaux.` },
  { k: 'bassinnormal', alias: ['sacroiliaques', 'enthesesnormales'], organ: 'Rachis', mod: 'IRM', type: 'normal', label: 'Bassin : enthèses, coxo-fémorales et sacro-iliaques normales',
    text: `• Les coupes coronales en pondération T2 avec saturation du signal de la graisse ne montrent pas d'anomalie de signal en regard des enthèses des fessiers et des ischio-jambiers.
• Absence d'anomalie de signal des berges articulaires des coxo-fémorales et des sacro-iliaques.
• Absence d'épanchement intra-articulaire.
• Absence d'épaississement synovial.` },
  { k: 'genounormal', alias: [], organ: 'Genou', mod: 'Radio', type: 'normal', label: 'Genou normal (radio F + P)',
    text: `• Minéralisation osseuse conservée.
• Absence de lésion lytique ou condensante suspecte.
• Intégrité des interlignes articulaires.
• Absence d'épanchement intra-articulaire.
• Intégrité des parties molles.` },

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
  { k: 'gonarthrose', alias: ['arthrosegenou'], organ: 'Genou', mod: 'Radio', type: 'lesion', label: 'Gonarthrose fémoro-tibiale',
    text: `Gonarthrose fémoro-tibiale [bilatérale / droite / gauche] plus marquée au compartiment [médial / latéral] avec pincement de l'interligne articulaire, condensation de l'os sous-chondral et ostéophytes.` },
  { k: 'gonarthrose', alias: ['arthrosegenou'], organ: 'Genou', mod: 'Radio', type: 'lesion', label: 'Gonarthrose fémoro-patellaire',
    text: `Gonarthrose fémoro-patellaire [bilatérale / droite / gauche] avec pincement de l'interligne articulaire, condensation de l'os sous-chondral et ostéophytes.` },
  { k: 'demineralisation', alias: [], organ: 'Squelette', mod: 'Radio', type: 'lesion', label: 'Déminéralisation osseuse diffuse',
    text: `Déminéralisation osseuse diffuse.` },
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
  { k: 'cordialement', alias: ['signature'], organ: 'Formules', mod: 'Tous', type: 'conclusion', label: 'Formule de politesse et signature',
    text: `Cordialement.
Dr [nom]` },
];
