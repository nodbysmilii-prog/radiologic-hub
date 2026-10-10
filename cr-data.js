/* =========================================================
   RadiologicHub — données des comptes rendus types
   ---------------------------------------------------------
   • CR_TEMPLATES : comptes rendus types (bibliothèque de gauche) —
                    uniquement les formules fournies par le service
   • CR_PHRASES   : phrases automatiques (mot-clé → description)

   Les éléments à compléter s'écrivent entre crochets : [x] mm,
   [droit / gauche]… La touche Tab passe d'un champ au suivant.
   Pas de crochets imbriqués : utiliser « … » à l'intérieur d'un choix.
   Formules du service : une constatation par ligne, précédée de « • ».
   ========================================================= */

/* Spécialités (mêmes couleurs que les fiches rapides) */
const CR_SPECIALTIES = {
  neuro:      { label: 'Neuro',             c: 'var(--purple)' },
  orl:        { label: 'ORL / tête et cou', c: 'var(--gold)' },
  thorax:     { label: 'Thorax',            c: 'var(--blue)' },
  tap:        { label: 'TAP / corps entier', c: 'var(--slate)' },
  digestif:   { label: 'Digestif',          c: 'var(--amber)' },
  uro:        { label: 'Uro-gynéco',        c: 'var(--steel)' },
  femme:      { label: 'Sein',              c: 'var(--crimson)' },
  trauma:     { label: 'Traumato',          c: 'var(--rose)' },
  osteo:      { label: 'Ostéo-articulaire', c: 'var(--plum)' },
  vasculaire: { label: 'Cardio-vasculaire', c: 'var(--teal)' },
  pediatrie:  { label: 'Pédiatrie',         c: 'var(--green)' },
  perso:      { label: 'Mes modèles',       c: 'var(--orange)' },
};

/* Examens (1er niveau de choix des modèles), dans l'ordre d'affichage.
   La clé correspond au champ « mod » des modèles. */
const CR_MODALITIES = {
  'Écho':  { label: 'Échographie' },
  'Radio': { label: 'Radiographie standard' },
  'Mammo': { label: 'Mammo\u00ADgraphie' },   // césure possible si le bouton est étroit
  'IRM':   { label: 'IRM' },
  'TDM':   { label: 'TDM' },
};

/* Types de phrases → code couleur k-* */
const CR_TYPES = {
  normal:     { label: 'Normal',                 k: 'k-tech' },
  lesion:     { label: 'Lésion / incidentalome', k: 'k-sign' },
  aigu:       { label: 'Pathologie aiguë',       k: 'k-grave' },
  conclusion: { label: 'Conclusion',             k: 'k-key' },
  perso:      { label: 'Mes phrases',            k: 'k-ddx' },
  outil:      { label: 'Schéma / calculateur',   k: 'k-signo' },
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
    id: 'irm-cerebro-medullaire', spe: 'neuro', mod: 'IRM',
    title: 'IRM cérébrale et médullaire — normale',
    text: `IRM CÉRÉBRALE ET MÉDULLAIRE

TECHNIQUE :
• L'encéphale a été exploré dans les 3 plans de l'espace selon différentes pondérations sans et avec injection de produit de contraste, complétées par une séquence angiographique.
• Le rachis a été exploré par des séquences sagittales T1, T2, STIR, des séquences axiales sur le rachis cervical et les derniers étages lombaires.

RÉSULTAT :
À l'étage cérébral :
Au niveau de la fosse cérébrale postérieure :
• Absence d'anomalie du signal spontané ni du rehaussement du parenchyme cérébelleux et du tronc cérébral.
• Les citernes de la base sont libres.
• Le quatrième ventricule est en place, non dilaté.
• Absence de stigmates de saignement intra- ou extra-axial.

À l'étage sus-tentoriel :
• Absence d'anomalie du signal spontané ni du rehaussement du reste du parenchyme cérébral.
• Les structures médianes sont en place.
• Absence d'hydrocéphalie.
• Absence de stigmates de saignement intra- ou extra-axial.
• Perméabilité conservée des axes artériels du polygone de Willis et à destinée encéphalique sans image d'addition.
• Sinus veineux perméables.
• Cavités naso-sinusiennes libres.
• Absence d'anomalie suspecte du signal osseux.

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
    id: 'rx-bassin', spe: 'osteo', mod: 'Radio',
    title: 'Radiographie du bassin (F) — normale',
    text: `RADIOGRAPHIE DU BASSIN DE FACE

COMPTE-RENDU :
• Minéralisation osseuse normale.
• Absence de lésion lytique ou condensante suspecte.
• Absence de fracture.
• Absence d'épanchement articulaire.
• Intégrité des articulations coxo-fémorales, sacro-iliaques et de la symphyse pubienne.
• Intégrité des parties molles.`,
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
  /* ----- Formules normales du service reçues le 08/10/2026 (Word) ----- */
  {
    id: 'tdm-cerebrale-courte', spe: 'neuro', mod: 'TDM',
    title: 'TDM cérébrale sans injection — normale (formule courte)',
    text: `SCANNER CÉRÉBRAL

RENSEIGNEMENTS CLINIQUES :
[renseignements cliniques]

TECHNIQUE :
Acquisition hélicoïdale multicoupes centrée sur le crâne sans injection de PDC iodé.

RÉSULTATS :
• Absence d'anomalie en contraste spontané du parenchyme cérébral, cérébelleux et du tronc cérébral.
• Absence de processus expansif intra-crânien intra- ou extra-axial décelable.
• Absence d'hémorragie intra- ou extra-axiale.
• Le système ventriculaire est de morphologie et de taille normales.
• Les structures médianes sont en place.
• Les citernes de la base sont libres.
• Absence de lésion osseuse d'allure rapidement évolutive.

AU TOTAL :
[conclusion]`,
  },
  {
    id: 'tdm-cerebrale-injectee', spe: 'neuro', mod: 'TDM',
    title: 'TDM cérébrale sans et avec injection — normale',
    text: `SCANNER CÉRÉBRAL

INDICATION :
[indication]

TECHNIQUE :
Acquisition hélicoïdale multicoupes centrée sur le crâne sans et avec injection de PDC iodé.

RÉSULTATS :
• Absence d'anomalie de densité ou de rehaussement du parenchyme cérébral, cérébelleux et du tronc cérébral.
• Absence de processus expansif intra-crânien intra- ou extra-axial décelable.
• Absence d'hémorragie intra- ou extra-axiale.
• Le système ventriculaire est de morphologie et de taille normales.
• Les structures médianes sont en place.
• Les citernes de la base sont libres.
• Les sinus veineux dure-mériens et les veines cérébrales internes sont perméables.
• Absence de lésion osseuse d'allure rapidement évolutive.

AU TOTAL :
Scanner cérébral sans anomalie.`,
  },
  {
    id: 'tdm-thorax-variante', spe: 'thorax', mod: 'TDM',
    title: 'TDM thoracique sans injection — normale (variante)',
    text: `SCANNER THORACIQUE

INDICATION :
[indication]

TECHNIQUE :
Acquisition hélicoïdale multicoupes fines centrée sur les poumons sans injection intra-veineuse de produit de contraste iodé.

RÉSULTATS :
Étude médiastinale :
• Absence d'adénomégalie médiastinale.
• Absence d'épanchement péricardique.
• Absence d'anomalie de la silhouette des gros vaisseaux médiastinaux et des cavités cardiaques.

Étude parenchymateuse et pleuro-pariétale :
• Arbre trachéo-bronchique libre.
• Absence de lésion parenchymateuse évolutive.
• Absence de nodule pulmonaire suspect.
• Absence d'épanchement pleural.
• Absence de lésion osseuse évolutive.

AU TOTAL :
[conclusion]`,
  },
  {
    id: 'tdm-thorax-injectee', spe: 'thorax', mod: 'TDM',
    title: 'TDM thoracique avec injection — normale',
    text: `SCANNER THORACIQUE

INDICATION :
[indication]

TECHNIQUE :
Acquisition hélicoïdale multicoupes fines centrée sur les poumons avec injection intra-veineuse de produit de contraste iodé.

RÉSULTATS :
Étude médiastinale :
• Absence d'adénomégalie médiastinale ou hilaire.
• Rehaussement conservé des cavités cardiaques et des gros vaisseaux du médiastin.
• Absence d'épanchement péricardique.

Étude pleuro-parenchymateuse et pariétale :
• Les bronches souches, lobaires et segmentaires sont libres, à parois fines.
• Absence de nodule parenchymateux suspect.
• Absence d'épanchement pleural.
• Absence d'adénomégalie axillaire, mammaire interne ou sus-claviculaire.

AU TOTAL :
[conclusion]`,
  },
  {
    id: 'angio-tdm-thorax', spe: 'thorax', mod: 'TDM',
    title: 'Angioscanner thoracique — normal',
    text: `ANGIOSCANNER THORACIQUE

RENSEIGNEMENTS CLINIQUES :
[renseignements cliniques]

TECHNIQUE :
Acquisition hélicoïdale multicoupes fines centrée sur les poumons sans puis après injection intra-veineuse de produit de contraste iodé.

RÉSULTATS :
Étude médiastinale et vasculaire :
• Tronc de l'artère pulmonaire, artères pulmonaires droite et gauche et leurs branches lobaires et segmentaires de 1er ordre perméables et de calibre normal.
• Absence d'hypervascularisation systémique bronchique ou non bronchique.
• Absence d'image anévrismale artérielle pulmonaire ou systémique décelable.
• Absence d'adénomégalie médiastinale ou hilaire.
• Rehaussement conservé des cavités cardiaques et des gros vaisseaux du médiastin.
• Absence d'épanchement péricardique.

Étude pleuro-parenchymateuse et pariétale :
• Les bronches souches, lobaires et segmentaires sont libres, à parois fines et de calibre normal.
• Absence de nodule parenchymateux suspect.
• Absence de condensation parenchymateuse ou d'hyperdensité en « verre dépoli ».
• Absence d'épanchement pleural.
• Absence d'adénomégalie axillaire, mammaire interne ou sus-claviculaire.
• Absence de lésion osseuse condensante ou lytique suspecte de malignité.

AU TOTAL :
[conclusion]`,
  },
  {
    id: 'tdm-tap', spe: 'tap', mod: 'TDM',
    title: 'TDM thoraco-abdomino-pelvienne sans et avec injection — normale',
    text: `SCANNER THORACO-ABDOMINO-PELVIEN

RENSEIGNEMENTS CLINIQUES :
[renseignements cliniques]

TECHNIQUE :
Acquisition hélicoïdale multicoupes fines sans et après injection intra-veineuse de produit de contraste iodé allant des apex pulmonaires au plancher pelvien.

RÉSULTATS :
I/ Étage thoracique :
Étude médiastinale :
• Absence d'adénomégalie médiastinale ou hilaire.
• Rehaussement conservé des cavités cardiaques et des gros vaisseaux du médiastin.
• Absence d'épanchement péricardique.

Étude pleuro-parenchymateuse et pariétale :
• Les bronches souches, lobaires et segmentaires sont libres, à parois fines.
• Absence de nodule parenchymateux suspect.
• Absence d'épanchement pleural.
• Absence d'adénomégalie axillaire, mammaire interne ou sus-claviculaire.

II/ Étage abdomino-pelvien :
• Le foie est de taille normale, de contours réguliers, de densité spontanée normale et de rehaussement homogène.
• Tronc porte, veines hépatiques et VCI perméables.
• Absence de dilatation des voies biliaires intra- ou extra-hépatiques.
• La vésicule biliaire est non distendue.
• Le pancréas est de volume normal et de rehaussement homogène.
• La rate est de taille normale et de rehaussement homogène.
• Les surrénales sont d'aspect normal.
• Les reins sont en place, de taille et de trophicité normales et de contours réguliers.
• Absence de dilatation des cavités pyélo-calicielles ni de calcul décelable.
• La vessie est en semi-réplétion, à contenu homogène.
• Absence d'adénomégalie intra- ou rétro-péritonéale.
• Absence d'épanchement intra-abdominal.

III/ Étude osseuse :
• Absence de lésion osseuse condensante ou lytique suspecte de malignité.

AU TOTAL :
TDM thoracique et abdomino-pelvienne sans anomalie décelable.`,
  },
  {
    id: 'tdm-cerebrale-tap', spe: 'tap', mod: 'TDM',
    title: 'TDM cérébrale et thoraco-abdomino-pelvienne — normale',
    text: `SCANNER CÉRÉBRAL ET THORACO-ABDOMINO-PELVIEN

RENSEIGNEMENTS CLINIQUES :
[renseignements cliniques]

TECHNIQUE :
• Acquisitions hélicoïdales multicoupes fines sans et après injection intra-veineuse de produit de contraste iodé allant des apex pulmonaires au plancher pelvien.
• Acquisition hélicoïdale multicoupes fines prenant le crâne d'emblée après injection intra-veineuse de produit de contraste iodé.

RÉSULTATS :
I/ Étage cérébral :
• Absence d'anomalie de rehaussement du parenchyme cérébral, cérébelleux et du tronc cérébral.
• Absence de processus expansif intra-crânien intra- ou extra-axial décelable.
• Absence d'hémorragie intra- ou extra-axiale.
• Le système ventriculaire est de morphologie et de taille normales.
• Les structures médianes sont en place.
• Les citernes de la base sont libres.
• Les sinus veineux dure-mériens et les veines cérébrales internes sont perméables.

II/ Étage thoracique :
Étude médiastinale :
• Absence d'adénomégalie médiastinale ou hilaire.
• Rehaussement conservé des cavités cardiaques et des gros vaisseaux du médiastin.
• Absence d'épanchement péricardique.

Étude pleuro-parenchymateuse et pariétale :
• Les bronches souches, lobaires et segmentaires sont libres, à parois fines.
• Absence de nodule parenchymateux suspect.
• Absence de condensation parenchymateuse.
• Absence d'épanchement pleural.
• Absence d'adénomégalie axillaire, mammaire interne ou sus-claviculaire.

III/ Étage abdomino-pelvien :
• Foie non dysmorphique, de taille normale, de contours réguliers, de densité spontanée normale et de rehaussement homogène.
• Tronc porte et ses branches, veines hépatiques et VCI perméables.
• Absence de dilatation des voies biliaires intra- ou extra-hépatiques.
• La vésicule biliaire est non distendue, de contenu hypodense homogène.
• Le pancréas est de volume normal et de rehaussement homogène.
• La rate et les surrénales sont d'aspect normal.
• Rehaussement conservé du réseau vasculaire mésentérique et des axes vasculaires ilio-fémoraux.
• Les reins sont en place, de taille et de trophicité normales, de contours réguliers, sans masse solide ou kystique décelable.
• Absence de dilatation des cavités pyélo-calicielles ni de calcul décelable.
• La vessie est en moyenne réplétion, à paroi fine et à contenu homogène.
• Absence d'adénomégalie intra- ou rétro-péritonéale.
• Absence d'épanchement intra-abdominal.

IV/ Étude osseuse :
• Absence de lésion osseuse condensante ou lytique suspecte de malignité.

AU TOTAL :
[conclusion]`,
  },
  {
    id: 'tdm-cervico-tap', spe: 'tap', mod: 'TDM',
    title: 'TDM cervico-thoraco-abdomino-pelvienne — normale',
    text: `SCANNER CERVICO-THORACO-ABDOMINO-PELVIEN

RENSEIGNEMENTS CLINIQUES :
[renseignements cliniques]

TECHNIQUE :
Acquisitions hélicoïdales explorant les étages cervical, thoracique et abdomino-pelvien sans et avec injection intra-veineuse de produit de contraste.

RÉSULTATS :
1- Étage cervical :
• Filière aéro-digestive libre.
• Absence de masse cervicale visible.
• Aspect TDM normal des glandes thyroïde, sub-mandibulaires et parotidiennes.
• Absence d'adénomégalie cervicale décelable.
• Les axes jugulo-carotidiens sont perméables, en place.

2- Étage thoracique :
En fenêtre parenchymateuse :
• Arbre trachéo-bronchique libre.
• Absence de nodule ou de lésion pulmonaire élémentaire.
• Absence d'épanchement pleural.

En fenêtre médiastinale :
• Absence d'adénomégalie médiastinale ou hilaire.
• Rehaussement conservé des cavités cardiaques et des gros vaisseaux du médiastin.
• Absence de dilatation des cavités cardiaques.
• Absence d'épanchement péricardique.
• Absence d'adénomégalie axillaire, mammaire interne ou sus-claviculaire.

3- Étage abdominal :
• Le foie est de volume normal, de contours réguliers et de rehaussement homogène, sans lésion focale décelable.
• Tronc porte et ses branches, veines hépatiques et VCI perméables.
• Absence de dilatation des voies biliaires intra- ou extra-hépatiques.
• La vésicule biliaire est non distendue.
• Le pancréas est de volume normal et de rehaussement homogène.
• La rate est de volume normal et de rehaussement homogène.
• Les glandes surrénales sont fines.
• Les reins sont de taille normale, de contours réguliers, de rehaussement habituel, sans dilatation des cavités pyélo-calicielles.
• La vessie, en semi-réplétion, est de contenu homogène.
• Absence d'anomalie patente des anses digestives.
• Absence d'épanchement liquidien intra-péritonéal.
• Absence d'adénomégalies abdomino-pelviennes.

4- Fenêtre osseuse :
• Absence de lésion suspecte sur le volume exploré.

AU TOTAL :
[conclusion]`,
  },
  {
    id: 'tdm-abdo-pelvienne', spe: 'digestif', mod: 'TDM',
    title: 'TDM abdomino-pelvienne sans injection — normale',
    text: `SCANNER ABDOMINO-PELVIEN

RENSEIGNEMENTS CLINIQUES :
[renseignements cliniques]

TECHNIQUE :
Acquisition hélicoïdale multicoupes fines prenant l'abdomen sans injection de produit de contraste iodé.

RÉSULTATS :
• Le foie est non dysmorphique, de taille normale, de contours réguliers, sans lésion focale décelable en contraste spontané.
• Absence de dilatation des voies biliaires intra- ou extra-hépatiques.
• La vésicule biliaire est non distendue, de contenu homogène.
• Le pancréas, la rate et les surrénales sont d'aspect normal en contraste spontané.
• Les reins sont en place, de taille et de trophicité normales et de contours réguliers.
• Absence de dilatation des cavités pyélo-calicielles ni de calcul décelable.
• Vessie en semi-réplétion, de plage homogène.
• Absence d'adénomégalie intra- ou rétro-péritonéale.
• Absence d'épanchement intra-abdominal.
• Absence de lésion osseuse condensante ou lytique suspecte de malignité.

AU TOTAL :
[conclusion]`,
  },
  {
    id: 'tdm-abdo-pelvienne-injectee', spe: 'digestif', mod: 'TDM',
    title: 'TDM abdomino-pelvienne sans et avec injection — normale',
    text: `SCANNER ABDOMINO-PELVIEN

RENSEIGNEMENTS CLINIQUES :
[renseignements cliniques]

TECHNIQUE :
Acquisition hélicoïdale multicoupes fines prenant l'abdomen sans et avec injection intra-veineuse de produit de contraste iodé.

RÉSULTATS :
• Foie non dysmorphique, de taille normale, de contours réguliers, de densité spontanée et de rehaussement homogènes.
• Tronc porte, veines hépatiques et VCI perméables.
• Absence de dilatation des voies biliaires intra- ou extra-hépatiques.
• La vésicule biliaire est non distendue.
• Le pancréas est de volume normal et de rehaussement homogène.
• La rate est de taille normale et de rehaussement homogène.
• Les surrénales sont d'aspect normal.
• Les reins sont en place, de taille et de trophicité normales et de contours réguliers.
• Absence de dilatation des cavités pyélo-calicielles ni de calcul décelable.
• Vessie en semi-réplétion, de plage homogène.
• Absence d'adénomégalie intra- ou rétro-péritonéale.
• Absence d'épanchement intra-abdominal.
• Absence de lésion osseuse condensante ou lytique suspecte de malignité.

AU TOTAL :
[conclusion]`,
  },
  {
    id: 'entero-tdm', spe: 'digestif', mod: 'TDM',
    title: 'Entéroscanner — normal',
    text: `ENTÉROSCANNER

RENSEIGNEMENTS CLINIQUES :
[renseignements cliniques]

TECHNIQUE :
Acquisitions volumiques centrées sur l'abdomen sans puis après injection de PDC iodé aux temps portal et tardif, après balisage digestif à l'eau.

RÉSULTATS :
• Distension satisfaisante de l'estomac et des anses grêles.
• Absence d'épaississement pariétal digestif suspect.
• Absence de rehaussement pathologique des anses grêles.
• Absence d'adénomégalie intra- ou rétro-péritonéale.
• Absence d'épanchement intra-abdominal.

Par ailleurs :
• Le foie est non dysmorphique, de taille normale, de contours réguliers et de rehaussement homogène, sans lésion focale décelable.
• Tronc porte et ses branches, veines hépatiques et VCI perméables.
• Absence de dilatation des voies biliaires intra- ou extra-hépatiques.
• La vésicule biliaire est non distendue, de contenu hypodense homogène.
• Le pancréas est de volume normal et de rehaussement homogène.
• La rate et les surrénales sont d'aspect normal.
• Rehaussement conservé du réseau vasculaire mésentérique et des axes vasculaires ilio-fémoraux.
• Les reins sont en place, de taille et de trophicité normales, de contours réguliers, sans masse solide ou kystique décelable.
• Absence de dilatation des cavités pyélo-calicielles ni de calcul décelable.
• Absence de lésion osseuse condensante ou lytique suspecte de malignité.

AU TOTAL :
[conclusion]`,
  },
  {
    id: 'uroscanner', spe: 'uro', mod: 'TDM',
    title: 'Uroscanner sans et avec injection — normal',
    text: `UROSCANNER

RENSEIGNEMENTS CLINIQUES :
[renseignements cliniques]

TECHNIQUE :
Acquisition hélicoïdale multicoupes fines prenant l'abdomen sans puis après injection intra-veineuse multiphasique de produit de contraste iodé, avec cliché d'UIV.

RÉSULTATS :
• Les reins sont en place, de taille et de trophicité normales, de contours réguliers, sans masse solide ou kystique décelable.
• Absence de dilatation des cavités excrétrices ou de calcul décelable.
• Absence d'épaississement tissulaire ou de lacune au temps tardif le long des voies excrétrices.
• Vessie en semi-réplétion, de plage homogène.

Par ailleurs :
• Le foie est de taille normale, de contours réguliers, de rehaussement homogène, sans lésion focale décelable.
• Tronc porte et ses branches, veines hépatiques et VCI perméables.
• Vésicule biliaire non distendue.
• Absence de dilatation des voies biliaires intra- ou extra-hépatiques.
• Le pancréas, la rate et les surrénales sont d'aspect normal.
• Absence d'adénomégalie intra- ou rétro-péritonéale.
• Absence d'épanchement intra-abdominal.
• Absence de lésion osseuse condensante ou lytique suspecte de malignité.

AU TOTAL :
[conclusion]`,
  },
  {
    id: 'uroscanner-sans-injection', spe: 'uro', mod: 'TDM',
    title: 'Uroscanner sans injection — normal',
    text: `UROSCANNER

RENSEIGNEMENTS CLINIQUES :
[renseignements cliniques]

TECHNIQUE :
Acquisition hélicoïdale multicoupes fines prenant l'abdomen sans injection intra-veineuse de produit de contraste iodé.

RÉSULTATS :
• Les reins sont en place, de taille et de trophicité normales, mesurant [x] mm de grand axe à droite et [x] mm à gauche, de contours réguliers, sans masse solide ou kystique décelable.
• Absence de dilatation des cavités excrétrices ou de calcul décelable.
• Vessie en semi-réplétion, de plage homogène.
• Absence de masse pelvienne décelable.

Par ailleurs :
• Le foie est de taille normale, de contours réguliers, sans lésion focale décelable en contraste spontané.
• Absence de dilatation des voies biliaires intra- ou extra-hépatiques.
• La vésicule biliaire est non distendue, de contenu liquidien.
• Le pancréas, la rate et les surrénales sont d'aspect normal en contraste spontané.
• Absence d'adénomégalie intra- ou rétro-péritonéale.
• Absence d'épanchement intra-abdominal.
• Absence de lésion osseuse condensante ou lytique suspecte de malignité.

AU TOTAL :
Uroscanner sans anomalie significative en contraste spontané.`,
  },
  {
    id: 'tdm-massif-facial', spe: 'orl', mod: 'TDM',
    title: 'TDM du massif facial (sinus) — normale',
    text: `SCANNER DU MASSIF FACIAL

RENSEIGNEMENTS CLINIQUES :
[renseignements cliniques]

TECHNIQUE :
Acquisition hélicoïdale multicoupes fines centrée sur le massif facial sans injection intra-veineuse de produit de contraste iodé.

RÉSULTATS :
• Pneumatisation conservée des sinus frontaux, maxillaires, sphénoïdaux et des cellules ethmoïdales.
• Les carrefours ostio-méatiques sont libres.
• Absence de protrusion dentaire intra-sinusienne.
• Absence de granulome apical dentaire.

Variantes à risque de confinement :
• Absence de déviation de la cloison nasale.
• Absence de concha bullosa.
• Absence d'anomalie d'insertion ou de courbure des processus unciformes.
• Absence d'hypertrophie bullaire.
• Absence de cellule de Haller.

Variantes à risque chirurgical :
• Absence de procidence des canaux infra-orbitaires.
• Absence d'asymétrie des toits de l'ethmoïde, Keros [I / II / III] bilatéral.
• Absence de procidence des artères ethmoïdales.
• Absence de procidence carotidienne.
• Absence de procidence des canaux des nerfs optiques.

AU TOTAL :
[conclusion]`,
  },
  {
    id: 'cone-beam-sinus', spe: 'orl', mod: 'TDM',
    title: 'Cone beam des sinus — normal',
    text: `CONE BEAM DES SINUS

RENSEIGNEMENTS CLINIQUES :
[renseignements cliniques]

TECHNIQUE :
Acquisition en mode cone beam centrée sur le massif facial.

RÉSULTATS :
• Pneumatisation conservée des sinus frontaux, sphénoïdaux, maxillaires et des cellules ethmoïdales.
• Absence de protrusion dentaire intra-sinusienne.
• Absence de granulome apical dentaire.

Variantes à risque de confinement :
• Absence de déviation de la cloison nasale.
• Absence de concha bullosa.
• Absence d'anomalie d'insertion ou de courbure des processus unciformes.
• Absence d'hypertrophie bullaire.
• Absence de cellule de Haller.

Variantes à risque chirurgical :
• Absence de procidence des canaux infra-orbitaires.
• Absence d'asymétrie des toits de l'ethmoïde, Keros [I / II / III] bilatéral.
• Absence de procidence des artères ethmoïdales.
• Absence de procidence carotidienne.

AU TOTAL :
[conclusion]`,
  },
  {
    id: 'tdm-rochers', spe: 'orl', mod: 'TDM',
    title: 'TDM des rochers — normale',
    text: `SCANNER DES ROCHERS

RENSEIGNEMENTS CLINIQUES :
[renseignements cliniques]

TECHNIQUE :
• Acquisition hélicoïdale multicoupes fines centrée sur les rochers sans injection de PDC iodé.
• Reconstructions coronales, sagittales et MIP.

RÉSULTATS :
Du côté droit :
• Conduit auditif externe libre.
• Aération normale des cellules mastoïdiennes et de la caisse du tympan.
• Intégrité de la chaîne ossiculaire.
• Respect des parois osseuses de la caisse du tympan, en particulier du tegmen tympani et du mur de la logette.
• Intégrité de la niche de la fenêtre ovale et de la fenêtre ronde.
• Aspect normal du canal du nerf facial dans ses trois portions.
• Absence d'anomalie cochléaire ou vestibulaire.
• Intégrité du conduit auditif interne.
• Absence d'anomalie aqueducale.

Du côté gauche :
• Conduit auditif externe libre.
• Aération normale des cellules mastoïdiennes et de la caisse du tympan.
• Intégrité de la chaîne ossiculaire.
• Respect des parois osseuses de la caisse du tympan, en particulier du tegmen tympani et du mur de la logette.
• Intégrité de la niche de la fenêtre ovale et de la fenêtre ronde.
• Aspect normal du canal du nerf facial dans ses trois portions.
• Absence d'anomalie cochléaire ou vestibulaire.
• Intégrité du conduit auditif interne.
• Absence d'anomalie aqueducale.

AU TOTAL :
TDM des rochers sans anomalie.`,
  },
  {
    id: 'tdm-rachis-cervical', spe: 'osteo', mod: 'TDM',
    title: 'TDM du rachis cervical — normale (choix pour la cervicarthrose)',
    text: `SCANNER DU RACHIS CERVICAL

INDICATION :
[indication]

TECHNIQUE :
Examen réalisé en mode hélicoïdal par des coupes axiales millimétriques explorant l'ensemble du rachis cervical sans injection de produit de contraste.

RÉSULTATS :
• Absence d'anomalie de la charnière cervico-occipitale.
• Canal cervical de mensurations constitutionnelles normales.
• Conservation de la lordose cervicale.
• Absence de lésion osseuse d'allure évolutive.
• Absence de discarthrose ou d'uncarthrose.
• [Absence d'arthrose inter-apophysaire postérieure / Arthrose inter-apophysaire postérieure étagée].
• Intégrité des parties molles péri-vertébrales.

C2-C3 :
• [Absence de saillie discale / Saillie discale médiane / Barre unco-disco-ostéophytique].
• [Absence de plicature / Plicature] des ligaments jaunes.
• [Les foramens de conjugaison sont libres / Rétrécissement foraminal « droit / gauche / bilatéral »].

C3-C4 :
• [Absence de saillie discale / Saillie discale médiane / Barre unco-disco-ostéophytique].
• [Absence de plicature / Plicature] des ligaments jaunes.
• [Les foramens de conjugaison sont libres / Rétrécissement foraminal « droit / gauche / bilatéral »].

C4-C5 :
• [Absence de saillie discale / Saillie discale médiane / Barre unco-disco-ostéophytique].
• [Absence de plicature / Plicature] des ligaments jaunes.
• [Les foramens de conjugaison sont libres / Rétrécissement foraminal « droit / gauche / bilatéral »].

C5-C6 :
• [Absence de saillie discale / Saillie discale médiane / Barre unco-disco-ostéophytique].
• [Absence de plicature / Plicature] des ligaments jaunes.
• [Les foramens de conjugaison sont libres / Rétrécissement foraminal « droit / gauche / bilatéral »].

C6-C7 :
• [Absence de saillie discale / Saillie discale médiane / Barre unco-disco-ostéophytique].
• [Absence de plicature / Plicature] des ligaments jaunes.
• [Les foramens de conjugaison sont libres / Rétrécissement foraminal « droit / gauche / bilatéral »].

AU TOTAL :
Canal cervical de mensurations constitutionnelles normales.
[Absence de cervicarthrose / Cervicarthrose étagée avec un maximum de sténose centrale et foraminale en « C5-C6 »].`,
  },
  {
    id: 'tdm-rachis-lombaire', spe: 'osteo', mod: 'TDM',
    title: 'TDM du rachis lombaire — normale',
    text: `SCANNER DU RACHIS LOMBAIRE

INDICATION :
[indication]

TECHNIQUE :
Examen réalisé en mode hélicoïdal par des coupes axiales de 2 mm d'épaisseur explorant le rachis lombaire sans injection de produit de contraste, avec reconstructions dans les trois plans de l'espace.

RÉSULTATS :
• Absence d'anomalie transitionnelle de la charnière lombo-sacrée.
• Absence de lésion osseuse évolutive lytique ou condensante du rachis lombaire.
• Absence d'anomalie de hauteur des corps vertébraux.
• Canal lombaire de dimensions constitutionnelles normales.
• Intégrité des articulations sacro-iliaques, coxo-fémorales et de la symphyse pubienne.
• Intégrité des parties molles péri-vertébrales.

Étage L3-L4 :
• Absence de hernie discale.
• Absence d'hypertrophie des ligaments jaunes.
• Absence d'arthrose inter-apophysaire postérieure.
• Les foramens de conjugaison sont libres.

Étage L4-L5 :
• Absence de hernie discale.
• Absence d'hypertrophie des ligaments jaunes.
• Absence d'arthrose inter-apophysaire postérieure.
• Les foramens de conjugaison sont libres.

Étage L5-S1 :
• Absence de hernie discale.
• Absence d'hypertrophie des ligaments jaunes.
• Absence d'arthrose inter-apophysaire postérieure.
• Les foramens de conjugaison sont libres.

AU TOTAL :
Canal lombaire de dimensions normales.
[Absence de hernie discale / Discopathie dégénérative et protrusive en « L4-L5 »].`,
  },
  {
    id: 'rx-rachis-lombaire-degeneratif', spe: 'osteo', mod: 'Radio',
    title: 'Radiographie du rachis lombaire (F + P) — normale ou dégénérative',
    text: `RADIOGRAPHIE DU RACHIS LOMBAIRE (FACE ET PROFIL)

COMPTE-RENDU :
• Bonne minéralisation osseuse.
• Absence de lésion osseuse évolutive.
• Pas d'anomalie vertébrale aux différents étages.
• [Absence de pincement discal / Discret pincement discal en « L5-S1 »].
• [Absence d'arthrose inter-apophysaire postérieure / Arthrose inter-apophysaire postérieure en « L4-L5 et L5-S1 »].
• [Absence d'ostéophyte / Ostéophytes étagés].
• Articulations sacro-iliaques et coxo-fémorales respectées.`,
  },
  {
    id: 'rx-cheville', spe: 'trauma', mod: 'Radio',
    title: 'Radiographie de la cheville — normale',
    text: `RADIOGRAPHIE DE LA CHEVILLE [DROITE / GAUCHE]

COMPTE-RENDU :
• Minéralisation normale de la trame osseuse.
• Absence de lésion osseuse traumatique visible.
• Intégrité des interlignes articulaires.
• Absence d'anomalie des parties molles.`,
  },
  {
    id: 'mammo-echo', spe: 'femme', mod: 'Mammo',
    title: 'Mammographie + échographie mammaire (bilan sénologique) — normal',
    text: `MAMMOGRAPHIE ET ÉCHOGRAPHIE MAMMAIRE

RENSEIGNEMENTS CLINIQUES :
[renseignements cliniques]

RÉSULTATS :
I/ Mammographie bilatérale (face + oblique + profil) :
• Seins [graisseux, type A / avec densités fibroglandulaires éparses, type B / denses hétérogènes, type C / extrêmement denses, type D] au BI-RADS.
• Absence de masse décelable.
• Absence d'asymétrie glandulaire.
• Absence de distorsion architecturale.
• Absence de microcalcifications de forme ou de groupement suspect.
• Absence d'adénomégalie axillaire.

II/ Échographie mammaire, à droite comme à gauche :
• Absence de masse solide ou kystique décelable.
• Absence d'atténuation suspecte des ultrasons.
• Absence d'ectasie canalaire.
• Absence d'anomalie du revêtement cutané.
• Absence d'adénomégalie axillaire.

AU TOTAL :
[conclusion]`,
  },
  {
    id: 'echo-mammaire', spe: 'femme', mod: 'Écho',
    title: 'Échographie mammaire — normale',
    text: `ÉCHOGRAPHIE MAMMAIRE

RENSEIGNEMENTS CLINIQUES :
[renseignements cliniques]

RÉSULTATS :
À droite comme à gauche :
• Absence de masse solide ou kystique décelable.
• Absence d'atténuation suspecte des ultrasons.
• Absence d'ectasie canalaire.
• Absence d'anomalie du revêtement cutané.
• Absence d'adénomégalie axillaire.

AU TOTAL :
[conclusion]`,
  },
  {
    id: 'echo-abdo-pelvienne', spe: 'digestif', mod: 'Écho',
    title: 'Échographie abdomino-pelvienne — normale',
    text: `ÉCHOGRAPHIE ABDOMINO-PELVIENNE

INDICATION :
[indication]

RÉSULTATS :
• Le foie est non dysmorphique, de taille normale, de contours réguliers, d'échostructure homogène, sans lésion focale décelable.
• La vésicule biliaire est non distendue, à paroi fine et alithiasique.
• Absence de dilatation des voies biliaires intra- et extra-hépatiques.
• Le réseau porte et les veines hépatiques sont perméables.
• Le pancréas céphalo-caudal est homogène, de volume normal.
• La rate est de taille normale, de contours réguliers et d'échostructure homogène.
• Les reins sont en place, de taille normale, de contours réguliers, présentant une bonne différenciation cortico-médullaire.
• Absence de macrocalculs.
• Absence de dilatation des cavités excrétrices.
• La vessie est en bonne réplétion, à paroi fine et régulière, à contenu liquidien homogène.
• Absence de masse pelvienne.
• Absence d'épanchement intra-abdominal.

AU TOTAL :
Échographie abdomino-pelvienne sans anomalie.`,
  },
  {
    id: 'echo-reno-vesico-prostatique', spe: 'uro', mod: 'Écho',
    title: 'Échographie rénale et vésico-prostatique — normale',
    text: `ÉCHOGRAPHIE RÉNALE ET VÉSICO-PROSTATIQUE

RENSEIGNEMENTS CLINIQUES :
[renseignements cliniques]

RÉSULTATS :
• Les reins sont en place, de taille normale, mesurant [x] mm de grand axe à droite et [x] mm à gauche, de contours réguliers, présentant une bonne différenciation cortico-sinusale.
• Absence de dilatation des cavités pyélo-calicielles ou de calcul décelable.
• Vessie en bonne réplétion, à paroi fine et de contenu transonore.
• Volume pré-mictionnel estimé à [x] mL.
• Volume post-mictionnel estimé à [x] mL.
• La prostate, étudiée par voie sus-pubienne, est d'échostructure habituelle, de volume normal, mesurant [x] x [x] x [x] mm, soit un poids estimé à [x] g.
• Absence d'épanchement intra-abdominal.

AU TOTAL :
Échographie rénale et vésico-prostatique sans anomalie décelable, notamment absence d'hypertrophie prostatique.`,
  },
  {
    id: 'echo-cervicale', spe: 'orl', mod: 'Écho',
    title: 'Échographie cervicale (thyroïde, glandes salivaires) — normale',
    text: `ÉCHOGRAPHIE CERVICALE

RENSEIGNEMENTS CLINIQUES :
[renseignements cliniques]

RÉSULTATS :
• La glande thyroïde est de volume normal, de contours réguliers, normovascularisée au Doppler couleur. Elle présente les mensurations suivantes :
• Le lobe droit mesure [x] x [x] x [x] mm, soit un volume de [x] mL.
• Le lobe gauche mesure [x] x [x] x [x] mm, soit un volume de [x] mL.
• L'isthme mesure [x] mm d'épaisseur.
• Les glandes parotides et sous-maxillaires sont d'aspect échographique normal.
• Absence d'adénomégalie cervicale.

AU TOTAL :
[conclusion]`,
  },
  {
    id: 'echo-epaule', spe: 'osteo', mod: 'Écho',
    title: 'Échographie de l\'épaule — normale',
    text: `ÉCHOGRAPHIE DE L'ÉPAULE [DROITE / GAUCHE]

RENSEIGNEMENTS CLINIQUES :
[renseignements cliniques]

RÉSULTATS :
• Le tendon du long biceps est visualisé au sein de sa gouttière, continu, d'échostructure hyperéchogène fibrillaire.
• Le tendon sub-scapulaire n'est pas désinséré, d'échostructure hyperéchogène fibrillaire normale. Absence de signe de conflit antérieur.
• Le tendon supra-épineux est continu, d'échostructure hyperéchogène fibrillaire normale.
• Le tendon infra-épineux est continu, d'échostructure hyperéchogène fibrillaire normale.
• Absence de dégénérescence graisseuse des muscles de la coiffe des rotateurs.
• Intégrité de l'articulation acromio-claviculaire.
• Absence d'épanchement articulaire ou de la bourse sous-acromio-deltoïdienne.

AU TOTAL :
[conclusion]`,
  },
  {
    id: 'echo-epaule-courte', spe: 'osteo', mod: 'Écho',
    title: 'Échographie de l\'épaule — normale (formule courte)',
    text: `ÉCHOGRAPHIE DE L'ÉPAULE [DROITE / GAUCHE]

RENSEIGNEMENTS CLINIQUES :
[renseignements cliniques]

RÉSULTATS :
• Le tendon du long biceps est dans sa gouttière, continu, d'échostructure fibrillaire normale.
• Le tendon subscapulaire n'est pas désinséré.
• Le tendon supra-épineux est continu, d'aspect fibrillaire normal.
• Le tendon infra-épineux est continu, d'aspect fibrillaire normal.
• Absence de dégénérescence graisseuse des muscles supra- et infra-épineux.
• [Intégrité de l'articulation acromio-claviculaire / Arthropathie acromio-claviculaire].
• Absence d'épanchement dans la bourse sous-acromio-deltoïdienne.
• Absence d'épanchement intra-articulaire.

AU TOTAL :
[conclusion]`,
  },
  {
    id: 'doppler-tsa', spe: 'vasculaire', mod: 'Écho',
    title: 'Écho-doppler des troncs supra-aortiques — normal',
    text: `ÉCHO-DOPPLER DES TRONCS SUPRA-AORTIQUES

RÉSULTATS :
• [Absence d'infiltration athéromateuse / Minime infiltration athéromateuse] des axes vasculaires du cou.
• Les artères carotides communes, internes et externes sont perméables avec des spectres vélocimétriques normaux.
• Les artères vertébrales sont perméables et symétriques, avec des pics de vitesse systolique de [x] cm/s.
• Les artères sub-clavières sont perméables, présentant des spectres vélocimétriques normaux.

CONCLUSION :
[Écho-doppler des troncs supra-aortiques sans anomalie décelable / Minime infiltration athéromateuse des axes vasculaires du cou ; écho-doppler des troncs supra-aortiques sans anomalie décelable par ailleurs].`,
  },
  {
    id: 'coroscanner', spe: 'vasculaire', mod: 'TDM',
    title: 'Coroscanner — normal',
    text: `TECHNIQUE :
• Acquisition hélicoïdale en 128 × 0,6 mm centrée sur le cœur avec synchronisation cardiaque et injection intraveineuse de produit de contraste iodé.

RÉSULTAT :
I/ Étude cardiaque et pleuro-parenchymateuse pulmonaire :
• Absence d'épanchement péricardique.
• Absence de dilatation des cavités cardiaques.
• Tricuspidie aortique.
• Absence de fuite aortique.
• Fraction d'éjection calculée à [x] %.
• Absence de dilatation de l'aorte thoracique ascendante.
• Absence d'épanchement pleural.
• Absence d'adénomégalie médiastinale.

II/ Étude du réseau coronaire :
• Score calcique = 0.
• Dominance [droite / gauche / codominance].
À droite :
• L'artère coronaire droite prend naissance au niveau du sinus coronaire droit. Son ostium est libre. Absence de plaque et de sténose décelable.
• Elle se termine par une interventriculaire postérieure et une rétroventriculaire gauche qui sont perméables.
À gauche :
• Le tronc commun gauche prend naissance au niveau du sinus coronaire gauche. Son ostium est libre. Il est perméable et, après un court trajet, il se bifurque en interventriculaire antérieure (IVA) et en circonflexe (Cx).
• L'IVA est perméable, suivie jusqu'à la pointe du cœur, et donne naissance à [deux] diagonales perméables.
• La Cx est perméable. Elle donne naissance à [une] marginale gauche perméable.
• Absence de plaque et de sténose décelable sur le réseau coronaire gauche.
Pontages aorto-coronaires :
• [Absence de pontage aorto-coronaire / Pontage mammaire interne gauche (AMIG) in situ, anastomosé sur l'IVA, perméable, sans sténose / Pontage mammaire interne droite (AMID) in situ, anastomosé sur la coronaire droite, perméable, sans sténose / Pontage par artère radiale, anastomosé sur l'aorte ascendante et sur la première marginale, perméable, sans sténose / Pontage par artère radiale en Y sur l'AMIG, anastomosé sur la première marginale, perméable, sans sténose / Pontage gastro-épiploïque droit in situ, anastomosé sur l'interventriculaire postérieure, perméable, sans sténose / Pontage veineux (veine grande saphène), anastomosé sur l'aorte ascendante et sur la coronaire droite, perméable, sans sténose / Pontage veineux séquentiel (veine grande saphène), anastomosé sur l'aorte ascendante, sur la première diagonale puis sur la première marginale, perméable, sans sténose].

CONCLUSION :
Coroscanner normal : score calcique nul, absence de plaque et de sténose coronaire [(CAD-RADS 0) / et pontage(s) perméable(s) (CAD-RADS 0/G)].`,
  },
];

/* État d'un greffon (mêmes libellés que l'outil CAD-RADS, regles/cadrads.js) */
const CR_ETAT_GREFFON = '[perméable, sans sténose / sténose minime (1-24 %) / sténose légère (25-49 %) / sténose modérée (50-69 %) / sténose sévère (70-99 %) / occlus]';

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
  { k: 'encephaleirm', alias: ['cerveauirm'], organ: 'Encéphale', mod: 'IRM', type: 'normal', label: 'Encéphale normal en IRM (fosse postérieure + sus-tentoriel)',
    text: `Au niveau de la fosse cérébrale postérieure :
• Absence d'anomalie du signal spontané ni du rehaussement du parenchyme cérébelleux et du tronc cérébral.
• Les citernes de la base sont libres.
• Le quatrième ventricule est en place, non dilaté.
• Absence de stigmates de saignement intra- ou extra-axial.

À l'étage sus-tentoriel :
• Absence d'anomalie du signal spontané ni du rehaussement du reste du parenchyme cérébral.
• Les structures médianes sont en place.
• Absence d'hydrocéphalie.
• Absence de stigmates de saignement intra- ou extra-axial.
• Perméabilité conservée des axes artériels du polygone de Willis et à destinée encéphalique sans image d'addition.
• Sinus veineux perméables.
• Cavités naso-sinusiennes libres.
• Absence d'anomalie suspecte du signal osseux.` },
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
  { k: 'rxbassinnormal', alias: ['bassinrx'], organ: 'Bassin', mod: 'Radio', type: 'normal', label: 'Bassin normal (radio de face)',
    text: `• Minéralisation osseuse normale.
• Absence de lésion lytique ou condensante suspecte.
• Absence de fracture.
• Absence d'épanchement articulaire.
• Intégrité des articulations coxo-fémorales, sacro-iliaques et de la symphyse pubienne.
• Intégrité des parties molles.` },
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
  { k: 'nodule', organ: 'Thorax', mod: 'TDM', type: 'lesion', label: 'Nodule pulmonaire',
    text: 'Nodule pulmonaire [solide / en verre dépoli / partiellement solide] du [lobe], mesurant [x] mm (diamètre moyen), [à contours réguliers / spiculés], [non calcifié]. Conduite à tenir selon les recommandations de la Fleischner Society (2017), en fonction du terrain.' },

  /* ----- Cœur et coronaires : pontages aorto-coronaires (tapez « pontage ») ----- */
  { k: 'pontageamig', alias: ['amig', 'mammairegauche'], organ: 'Cœur / coronaires', mod: 'TDM', type: 'lesion', label: 'Pontage AMIG (mammaire interne gauche)',
    text: `• Pontage mammaire interne gauche (AMIG) in situ, anastomosé sur [l'IVA / la première diagonale / la deuxième diagonale] : ${CR_ETAT_GREFFON}.` },
  { k: 'pontageamid', alias: ['amid', 'mammairedroite'], organ: 'Cœur / coronaires', mod: 'TDM', type: 'lesion', label: 'Pontage AMID (mammaire interne droite)',
    text: `• Pontage mammaire interne droite (AMID) [in situ / en greffon libre], anastomosé sur [la coronaire droite / l'IVA / la première marginale, par un trajet rétro-aortique] : ${CR_ETAT_GREFFON}.` },
  { k: 'pontageradiale', alias: ['radiale', 'pontagey', 'composite'], organ: 'Cœur / coronaires', mod: 'TDM', type: 'lesion', label: 'Pontage par artère radiale (aorte ou Y sur l\'AMIG)',
    text: `• Pontage par artère radiale, anastomosé [sur l'aorte ascendante / en Y sur l'AMIG] et sur [la première marginale / la deuxième marginale / la coronaire droite / l'interventriculaire postérieure / la première diagonale] : ${CR_ETAT_GREFFON}.` },
  { k: 'pontagegep', alias: ['gep', 'gastroepiploique'], organ: 'Cœur / coronaires', mod: 'TDM', type: 'lesion', label: 'Pontage gastro-épiploïque droit',
    text: `• Pontage gastro-épiploïque droit in situ, passant à travers le diaphragme, anastomosé sur [l'interventriculaire postérieure / la coronaire droite distale] : ${CR_ETAT_GREFFON}.` },
  { k: 'pontagesaphene', alias: ['saphene', 'pontageveineux'], organ: 'Cœur / coronaires', mod: 'TDM', type: 'lesion', label: 'Pontage veineux (veine grande saphène)',
    text: `• Pontage veineux (veine grande saphène), anastomosé sur l'aorte ascendante et sur [la coronaire droite / l'interventriculaire postérieure / la première marginale / la deuxième marginale / la première diagonale / l'IVA] : ${CR_ETAT_GREFFON}.` },
  { k: 'pontagesequentiel', alias: ['sequentiel'], organ: 'Cœur / coronaires', mod: 'TDM', type: 'lesion', label: 'Pontage veineux séquentiel (deux anastomoses)',
    text: `• Pontage veineux séquentiel (veine grande saphène), anastomosé sur l'aorte ascendante, sur [la première diagonale / la première marginale / l'interventriculaire postérieure] puis sur [la première marginale / la deuxième marginale / l'interventriculaire postérieure / la rétroventriculaire gauche] : ${CR_ETAT_GREFFON}.` },
  { k: 'pontageabsent', alias: ['pasdepontage'], organ: 'Cœur / coronaires', mod: 'TDM', type: 'normal', label: 'Absence de pontage aorto-coronaire',
    text: '• Absence de pontage aorto-coronaire.' },

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
