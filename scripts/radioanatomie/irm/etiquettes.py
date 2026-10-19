"""Radioanatomie IRM cérébrale : table de correspondance des étiquettes (outil → nom français), à relire par l'auteur.

Chaque structure est décrite une fois ; les structures paires sont déclinées à gauche et à droite, avec l'accord de
l'adjectif (« gyrus précentral droit », « insula droite »). Colonnes écrites :
  source          outil ou atlas d'origine (FastSurfer aseg / DKT, CerebNet, HypVINN, règle dérivée, atlas des
                  territoires, masque TOF, points manuels de l'auteur) ;
  id              numéro de l'étiquette dans l'outil (vide pour les structures dérivées ou manuelles) ;
  nom_outil       nom anglais de l'outil ;
  categorie       catégorie du menu de la visionneuse ;
  nom_fr          nom affiché (latéralité comprise) ;
  cote            gauche / droit / médian ;
  statut          automatique, dérivé (règle écrite dans « remarque »), transporté (atlas recalé), manuel ;
  remarque        précision anatomique ou point à vérifier.
Usage : python3 -I -B scripts/radioanatomie/irm/etiquettes.py   → correspondance-etiquettes.csv et .md (même dossier)
"""
import csv, os

ICI = os.path.dirname(os.path.abspath(__file__))

CATEGORIES = ['Régions', 'Sillons', 'Gyri', 'Système limbique', 'Substance blanche', 'Ventricules et citernes',
              'Noyaux gris centraux et structures apparentées', 'Voies optiques', 'Cervelet', 'Tronc cérébral',
              'Artères', 'Sinus veineux', 'Glandes', 'Territoires vasculaires', 'Méninges']
# « Méninges » : catégorie ajoutée d'après la vidéo de référence de l'auteur du 17/10/2026 (validée par l'auteur)

ADJ = {('gauche', 'm'): 'gauche', ('gauche', 'f'): 'gauche', ('droit', 'm'): 'droit', ('droit', 'f'): 'droite',
       ('gauche', 'mp'): 'gauches', ('droit', 'mp'): 'droits', ('gauche', 'fp'): 'gauches', ('droit', 'fp'): 'droites'}

# ---------------------------------------------------------------------------
# FastSurfer (aseg) : (id gauche, id droit, nom outil gauche, catégorie, modèle français, genre, remarque)
# ---------------------------------------------------------------------------
ASEG_PAIRES = [
    (2, 41, 'Left-Cerebral-White-Matter', 'Substance blanche', 'Substance blanche cérébrale {c}', 'f',
     "Ensemble de la substance blanche de l'hémisphère (les faisceaux ne sont pas distingués par l'outil)."),
    (4, 43, 'Left-Lateral-Ventricle', 'Ventricules et citernes', 'Ventricule latéral {c}', 'm', ''),
    (5, 44, 'Left-Inf-Lat-Vent', 'Ventricules et citernes', 'Corne temporale du ventricule latéral {c}', 'm', ''),
    (31, 63, 'Left-choroid-plexus', 'Ventricules et citernes', 'Plexus choroïde du ventricule latéral {c}', 'm', ''),
    (7, 46, 'Left-Cerebellum-White-Matter', 'Cervelet', "Corps médullaire de l'hémisphère cérébelleux {c}", 'm',
     'Substance blanche du cervelet (noyaux du cervelet non distingués).'),
    (8, 47, 'Left-Cerebellum-Cortex', 'Cervelet', "Cortex de l'hémisphère cérébelleux {c}", 'm',
     'Subdivisé en lobules par CerebNet.'),
    (10, 49, 'Left-Thalamus', 'Noyaux gris centraux et structures apparentées', 'Thalamus {c}', 'm', ''),
    (11, 50, 'Left-Caudate', 'Noyaux gris centraux et structures apparentées', 'Noyau caudé {c}', 'm', ''),
    (12, 51, 'Left-Putamen', 'Noyaux gris centraux et structures apparentées', 'Putamen {c}', 'm', ''),
    (13, 52, 'Left-Pallidum', 'Noyaux gris centraux et structures apparentées', 'Globus pallidus {c}', 'm', ''),
    (26, 58, 'Left-Accumbens-area', 'Noyaux gris centraux et structures apparentées', 'Noyau accumbens {c}', 'm', ''),
    (28, 60, 'Left-VentralDC', 'Noyaux gris centraux et structures apparentées', 'Diencéphale ventral {c}', 'm',
     "Étiquette globale de l'outil : hypothalamus, noyau sous-thalamique, substance noire, noyau rouge, partie "
     "haute du pédoncule cérébral ; affinée par HypVINN pour l'hypothalamus. À relire : nom à garder ou à masquer. "
     "Sa partie mésencéphalique (pédoncules cérébraux, sous z = −10,4 mm) est rendue au tronc cérébral "
     "(contour de l'auteur)."),
    (17, 53, 'Left-Hippocampus', 'Système limbique', 'Hippocampe {c}', 'm', ''),
    (18, 54, 'Left-Amygdala', 'Système limbique', 'Corps amygdaloïde (amygdale) {c}', 'm', ''),
]
ASEG_MEDIANS = [
    (14, '3rd-Ventricle', 'Ventricules et citernes', 'Troisième ventricule (V3)', ''),
    (15, '4th-Ventricle', 'Ventricules et citernes', 'Quatrième ventricule (V4)', ''),
    (16, 'Brain-Stem', 'Régions', 'Tronc cérébral', 'Mésencéphale, pont et bulbe ensemble (non subdivisés par '
                                                    "l'outil). Corrigé d'après les contours de l'auteur "
                                                    '(corrections-auteur.json) : prolongements postérieurs autour '
                                                    'du V4 (pédoncules cérébelleux) retirés ; pédoncules cérébraux, '
                                                    'rangés par FastSurfer dans le diencéphale ventral, inclus '
                                                    'jusqu\'à z = −10,4 mm.'),
    (24, 'CSF', 'Ventricules et citernes', 'Liquide cérébrospinal des citernes de la base',
     "Étiquette globale de l'outil (LCS autour du tronc cérébral et à la base) : à relire, les citernes nommées "
     'viendront des points manuels.'),
]
ASEG_EXCLUS = [(77, 'WM-hypointensities', "Hypo-intensités de la substance blanche : pas une structure anatomique, "
                                          'non publiée.')]

# ---------------------------------------------------------------------------
# FastSurfer (DKT, 31 régions corticales par hémisphère ; gauche = 1000 + n, droit = 2000 + n)
# ---------------------------------------------------------------------------
DKT = [
    (2, 'caudalanteriorcingulate', 'Système limbique', 'Gyrus cingulaire antérieur {c}, partie caudale', 'm', ''),
    (3, 'caudalmiddlefrontal', 'Gyri', 'Gyrus frontal moyen {c}, partie caudale', 'm', ''),
    (5, 'cuneus', 'Gyri', 'Cunéus {c}', 'm', ''),
    (6, 'entorhinal', 'Système limbique', 'Cortex entorhinal {c}', 'm', ''),
    (7, 'fusiform', 'Gyri', 'Gyrus fusiforme {c}', 'm', 'Gyrus temporo-occipital latéral.'),
    (8, 'inferiorparietal', 'Gyri', 'Lobule pariétal inférieur {c} (gyrus angulaire)', 'm',
     'Dans le protocole DKT, le gyrus supramarginal forme une région à part.'),
    (9, 'inferiortemporal', 'Gyri', 'Gyrus temporal inférieur {c}', 'm', ''),
    (10, 'isthmuscingulate', 'Système limbique', 'Isthme du gyrus cingulaire {c}', 'm', ''),
    (11, 'lateraloccipital', 'Gyri', 'Gyri occipitaux latéraux {c}', 'mp', ''),
    (12, 'lateralorbitofrontal', 'Gyri', 'Cortex orbitofrontal latéral {c}', 'm',
     "Gyri orbitaires latéraux. Corrigé par l'auteur : îlots sans parenchyme retirés entre les orbites (coupe "
     "z = −24,4 mm et au-dessous ; corrections-auteur.json)."),
    (13, 'lingual', 'Gyri', 'Gyrus lingual {c}', 'm', ''),
    (14, 'medialorbitofrontal', 'Gyri', 'Cortex orbitofrontal médial {c}', 'm',
     "Gyrus droit (gyrus rectus) compris. Corrigé par l'auteur : îlots sans parenchyme retirés entre les orbites "
     "(coupe z = −24,4 mm et au-dessous ; corrections-auteur.json). FastSurfer n'a pas d'étiquette pour le bulbe "
     "et le tractus olfactifs (structures manuelles)."),
    (15, 'middletemporal', 'Gyri', 'Gyrus temporal moyen {c}', 'm', ''),
    (16, 'parahippocampal', 'Système limbique', 'Gyrus parahippocampique {c}', 'm', ''),
    (17, 'paracentral', 'Gyri', 'Lobule paracentral {c}', 'm', ''),
    (18, 'parsopercularis', 'Gyri', 'Gyrus frontal inférieur {c}, partie operculaire', 'm', ''),
    (19, 'parsorbitalis', 'Gyri', 'Gyrus frontal inférieur {c}, partie orbitaire', 'm',
     "Corrigé par l'auteur : îlots sans cortex retirés au-dessus des toits des orbites (coupe z = −19,5 mm et "
     "au-dessous ; corrections-auteur.json)."),
    (20, 'parstriangularis', 'Gyri', 'Gyrus frontal inférieur {c}, partie triangulaire', 'm', ''),
    (21, 'pericalcarine', 'Gyri', 'Cortex péricalcarin {c}', 'm',
     'Berges du sillon calcarin : cortex visuel primaire (V1).'),
    (22, 'postcentral', 'Gyri', 'Gyrus postcentral {c}', 'm', ''),
    (23, 'posteriorcingulate', 'Système limbique', 'Gyrus cingulaire postérieur {c}', 'm', ''),
    (24, 'precentral', 'Gyri', 'Gyrus précentral {c}', 'm', ''),
    (25, 'precuneus', 'Gyri', 'Précunéus {c}', 'm', ''),
    (26, 'rostralanteriorcingulate', 'Système limbique', 'Gyrus cingulaire antérieur {c}, partie rostrale', 'm', ''),
    (27, 'rostralmiddlefrontal', 'Gyri', 'Gyrus frontal moyen {c}, partie rostrale', 'm', ''),
    (28, 'superiorfrontal', 'Gyri', 'Gyrus frontal supérieur {c}', 'm', ''),
    (29, 'superiorparietal', 'Gyri', 'Lobule pariétal supérieur {c}', 'm', ''),
    (30, 'superiortemporal', 'Gyri', 'Gyrus temporal supérieur {c}', 'm', ''),
    (31, 'supramarginal', 'Gyri', 'Gyrus supramarginal {c}', 'm', ''),
    (34, 'transversetemporal', 'Gyri', 'Gyrus temporal transverse {c} (gyrus de Heschl)', 'm', ''),
    (35, 'insula', 'Gyri', 'Cortex insulaire {c}', 'm', ''),
]
DKT_NUM = {nom: n for n, nom, *_ in DKT}

# ---------------------------------------------------------------------------
# Lobes : regroupement des régions DKT ; toute la substance blanche suit la région corticale la plus proche (comme
# « wmparc » de FreeSurfer, sans la limite de 5 mm : centre semi-ovale compris), sauf la région des capsules
# (à moins de 3 mm des noyaux gris centraux, du thalamus et du diencéphale ventral)
# ---------------------------------------------------------------------------
LOBES = [
    ('Lobe frontal {c}', 'm', ['superiorfrontal', 'caudalmiddlefrontal', 'rostralmiddlefrontal', 'parsopercularis',
                               'parstriangularis', 'parsorbitalis', 'lateralorbitofrontal', 'medialorbitofrontal',
                               'precentral', 'paracentral'],
     'Le lobule paracentral, à cheval sur les lobes frontal et pariétal, est rattaché au lobe frontal : à valider.'),
    ('Lobe pariétal {c}', 'm', ['postcentral', 'superiorparietal', 'inferiorparietal', 'supramarginal', 'precuneus'], ''),
    ('Lobe temporal {c}', 'm', ['superiortemporal', 'middletemporal', 'inferiortemporal', 'transversetemporal',
                                'fusiform'], ''),
    ('Lobe occipital {c}', 'm', ['lateraloccipital', 'lingual', 'cuneus', 'pericalcarine'], ''),
    ("Lobe de l'insula {c}", 'm', ['insula'], ''),
    ('Lobe limbique {c}', 'm', ['rostralanteriorcingulate', 'caudalanteriorcingulate', 'posteriorcingulate',
                                'isthmuscingulate', 'parahippocampal', 'entorhinal'],
     'Définition classique française (gyrus cingulaire, isthme, gyrus parahippocampique) ; FreeSurfer range le '
     'gyrus parahippocampique et le cortex entorhinal dans le lobe temporal : à valider.'),
]

# ---------------------------------------------------------------------------
# Sillons dérivés : interface entre deux groupes de régions DKT (le protocole DKT trace ses limites au fond des
# sillons ; Klein et Tourville 2012). Le sillon = LCS entre les deux berges + fond du sillon.
# ---------------------------------------------------------------------------
SILLONS = [
    ('Sillon central {c}', ['precentral'], ['postcentral'], ''),
    ('Sillon précentral {c}', ['precentral'], ['caudalmiddlefrontal', 'superiorfrontal', 'parsopercularis'], ''),
    ('Sillon postcentral {c}', ['postcentral'], ['supramarginal', 'superiorparietal'], ''),
    ('Sillon frontal supérieur {c}', ['superiorfrontal'], ['caudalmiddlefrontal', 'rostralmiddlefrontal'], ''),
    ('Sillon frontal inférieur {c}', ['caudalmiddlefrontal', 'rostralmiddlefrontal'],
     ['parsopercularis', 'parstriangularis', 'parsorbitalis'], ''),
    ('Sillon intrapariétal {c}', ['superiorparietal'], ['inferiorparietal', 'supramarginal'], ''),
    ('Sillon latéral {c} (fissure sylvienne)', ['superiortemporal', 'transversetemporal'],
     ['parsopercularis', 'parstriangularis', 'precentral', 'postcentral', 'supramarginal'],
     "Partie operculaire de la fissure (rameau postérieur jusqu'à sa terminaison) ; la partie insulaire forme le "
     "sillon circulaire ; les rameaux antérieurs sont nommés à part. Le rameau postérieur monte vers l'arrière en "
     "restant presque parallèle au plan axial : en coupe axiale, il est coupé en biais (zone large et îlots)."),
    ("Sillon circulaire de l'insula {c}", ['insula'],
     ['parsopercularis', 'parstriangularis', 'parsorbitalis', 'lateralorbitofrontal', 'precentral', 'postcentral',
      'supramarginal', 'superiortemporal', 'transversetemporal'], ''),
    ('Sillon temporal supérieur {c}', ['superiortemporal'], ['middletemporal'], ''),
    ('Sillon temporal inférieur {c}', ['middletemporal'], ['inferiortemporal'], ''),
    ('Sillon occipito-temporal {c}', ['inferiortemporal'], ['fusiform'], ''),
    ('Sillon collatéral {c}', ['fusiform'], ['parahippocampal', 'lingual', 'entorhinal'], ''),
    ('Sillon pariéto-occipital {c}', ['precuneus'], ['cuneus'], 'Partie médiale.'),
    ('Sillon du cingulum {c}', ['superiorfrontal', 'paracentral'],
     ['caudalanteriorcingulate', 'rostralanteriorcingulate', 'posteriorcingulate'], 'Sillon cingulaire.'),
    ('Sillon calcarin {c}', ['pericalcarine'], ['pericalcarine'],
     "Règle propre : LCS bordé des deux côtés par le cortex péricalcarin. Horizontal dans sa partie moyenne : la "
     "coupe axiale qui passe à son niveau le montre à plat (large nappe de LCS, T1 sombre et T2 clair), puis il "
     "redevient une fente fine 1 à 2 mm au-dessus et au-dessous."),
    # ajoutés le 17/10/2026 (précision demandée par l'auteur) ; à la fin de la liste pour garder les numéros
    ('Sillon latéral {c}, rameau antérieur ascendant', ['parstriangularis'], ['parsopercularis'],
     'Limite entre les parties triangulaire et operculaire du gyrus frontal inférieur (protocole DKT).'),
    ('Sillon latéral {c}, rameau antérieur horizontal', ['parstriangularis'], ['parsorbitalis'],
     'Limite entre les parties triangulaire et orbitaire du gyrus frontal inférieur (protocole DKT).'),
]

# Regroupements dérivés de FastSurfer (aseg) : (modèle, genre, étiquettes aseg gauches, remarque)
REGROUPEMENTS = [
    ('Corps strié {c}', 'm', ['Left-Caudate', 'Left-Putamen', 'Left-Accumbens-area'],
     'Noyau caudé, putamen et noyau accumbens (striatum).'),
    ('Noyau lenticulaire {c}', 'm', ['Left-Putamen', 'Left-Pallidum'], 'Putamen et globus pallidus.'),
]
# Structures médianes dérivées des limites entre hémisphères (FastSurfer : côtés gauche et droit des étiquettes)
LIMITES_MEDIANES = [
    ('Sillons', 'Fissure longitudinale du cerveau', 'LCS entre les hémisphères cérébraux gauche et droit.'),
    ('Méninges', 'Faux du cerveau', "Surface à égale distance des deux hémisphères dans la fissure longitudinale, "
                                    "au-dessus du corps calleux : position déduite, la dure-mère n'est pas vue "
                                    'en tant que telle.'),
    ('Méninges', 'Tente du cervelet', 'Surface à égale distance des hémisphères cérébraux et du cervelet, en '
                                      "dehors du tronc cérébral : position déduite, à valider."),
]

# ---------------------------------------------------------------------------
# CerebNet (lobules du cervelet ; nomenclature de Larsell et noms classiques)
# ---------------------------------------------------------------------------
CEREBNET_PAIRES = [   # identifiants de sortie de CerebNet (table de couleurs de FreeSurfer, 601 à 632)
    (601, 602, 'I_IV', 'Lobules I à IV (lobe antérieur), hémisphère cérébelleux {c}', 'Comprend la partie vermienne.'),
    (603, 604, 'V', 'Lobule V (lobe antérieur), hémisphère cérébelleux {c}', 'Comprend la partie vermienne.'),
    (605, 607, 'VI', 'Lobule VI (lobule simple), hémisphère cérébelleux {c}', ''),
    (608, 610, 'CrusI', 'Crus I (lobule semi-lunaire supérieur), hémisphère cérébelleux {c}', ''),
    (611, 613, 'CrusII', 'Crus II (lobule semi-lunaire inférieur), hémisphère cérébelleux {c}', ''),
    (614, 616, 'VIIb', 'Lobule VIIB (lobule gracile), hémisphère cérébelleux {c}', ''),
    (617, 619, 'VIIIa', 'Lobule VIIIA (lobule biventral, partie antérieure), hémisphère cérébelleux {c}', ''),
    (620, 622, 'VIIIb', 'Lobule VIIIB (lobule biventral, partie postérieure), hémisphère cérébelleux {c}', ''),
    (623, 625, 'IX', 'Lobule IX (tonsille), hémisphère cérébelleux {c}', ''),
    (626, 628, 'X', 'Lobule X (flocculus) {c}', ''),
]
CEREBNET_VERMIS = [
    (606, 'Cbm_Vermis_VI', 'Vermis, lobule VI (déclive)'),
    (630, 'Cbm_Vermis_VII', 'Vermis, lobule VII (folium et tuber)'),
    (631, 'Cbm_Vermis_VIII', 'Vermis, lobule VIII (pyramide)'),
    (624, 'Cbm_Vermis_IX', 'Vermis, lobule IX (uvule)'),
    (627, 'Cbm_Vermis_X', 'Vermis, lobule X (nodule)'),
]
# Corps calleux et fornix (FastSurfer-CC) : identifiants FreeSurfer 250 à 255 ; le corps calleux est découpé en
# cinq parties égales le long de son grand axe (convention de FreeSurfer), pas selon les repères anatomiques
CORPS_CALLEUX = [
    (255, 'CC_Anterior', 'Substance blanche', 'Corps calleux, cinquième antérieur (genou)',
     'Découpage en cinquièmes égaux (convention FreeSurfer) : le genou en occupe la plus grande part.'),
    (254, 'CC_Mid_Anterior', 'Substance blanche', 'Corps calleux, deuxième cinquième (tronc, partie antérieure)', ''),
    (253, 'CC_Central', 'Substance blanche', 'Corps calleux, cinquième central (tronc)', ''),
    (252, 'CC_Mid_Posterior', 'Substance blanche', 'Corps calleux, quatrième cinquième (tronc postérieur et isthme)', ''),
    (251, 'CC_Posterior', 'Substance blanche', 'Corps calleux, cinquième postérieur (splénium)', ''),
    (250, 'Fornix', 'Système limbique', 'Fornix (corps et piliers)', 'Segmenté par FastSurfer-CC avec le corps calleux.'),
]

# ---------------------------------------------------------------------------
# HypVINN (hypothalamus et structures voisines) : (id gauche, id droit, nom outil, catégorie, modèle, genre, remarque)
# ---------------------------------------------------------------------------
HYPVINN_PAIRES = [   # identifiants de sortie de HypVINN (table de couleurs de FreeSurfer, 961 à 984)
    (962, 961, 'N.opticus', 'Voies optiques', 'Nerf optique {c} (segment intracrânien)', 'm', ''),
    (965, 964, 'Optic-tract', 'Voies optiques', 'Tractus optique {c}', 'm', ''),
    (968, 967, 'Chiasma-Opticum', 'Voies optiques', 'Chiasma optique, moitié {c}', 'f', ''),
    (966, 963, 'C.mammilare', 'Système limbique', 'Corps mamillaire {c}', 'm', ''),
    (972, 971, 'Fornix', 'Système limbique', 'Fornix {c}, colonne', 'm',
     "Partie proche de l'hypothalamus (colonne) ; le corps et les piliers viennent de FastSurfer-CC."),
    (979, 983, 'Ant-Hypothalamus', 'Noyaux gris centraux et structures apparentées', 'Hypothalamus antérieur {c}', 'm', ''),
    (977, 981, 'Med-Hypothalamus', 'Noyaux gris centraux et structures apparentées', 'Hypothalamus médial {c}', 'm', ''),
    (978, 982, 'Lat-Hypothalamus', 'Noyaux gris centraux et structures apparentées', 'Hypothalamus latéral {c}', 'm', ''),
    (980, 984, 'Post-Hypothalamus', 'Noyaux gris centraux et structures apparentées', 'Hypothalamus postérieur {c}', 'm', ''),
]
HYPVINN_MEDIANS = [
    (969, 'Ant-Commisure', 'Substance blanche', 'Commissure antérieure', ''),
    (976, 'Tuberal-Region', 'Noyaux gris centraux et structures apparentées', "Région tubérale de l'hypothalamus", ''),
    (973, 'Epiphysis', 'Glandes', 'Glande pinéale (épiphyse)', ''),
    (974, 'Hypophysis', 'Glandes', 'Hypophyse', ''),
    (975, 'Infundibulum', 'Glandes', 'Tige pituitaire (infundibulum)', ''),
]
HYPVINN_DOUBLONS = [(970, 'Third-Ventricle', "Doublon du troisième ventricule de FastSurfer (aseg), qui est retenu.")]

# ---------------------------------------------------------------------------
# TractSeg (72 faisceaux segmentés sur la diffusion du sujet) : (nom TractSeg sans côté, catégorie, modèle, genre,
# remarque) ; les faisceaux pairs sont suffixés _left / _right
# ---------------------------------------------------------------------------
TRACTSEG_PAIRES = [
    ('AF', 'Substance blanche', 'Faisceau arqué {c}', 'm', ''),
    ('ATR', 'Substance blanche', 'Radiation thalamique antérieure {c}', 'f', ''),
    ('CG', 'Substance blanche', 'Cingulum {c}', 'm', ''),
    ('CST', 'Substance blanche', 'Faisceau corticospinal {c}', 'm', ''),
    ('FPT', 'Substance blanche', 'Faisceau fronto-pontique {c}', 'm', ''),
    ('POPT', 'Substance blanche', 'Faisceau pariéto-occipito-pontique {c}', 'm', ''),
    ('IFO', 'Substance blanche', 'Faisceau fronto-occipital inférieur {c}', 'm', ''),
    ('ILF', 'Substance blanche', 'Faisceau longitudinal inférieur {c}', 'm', ''),
    ('MLF', 'Substance blanche', 'Faisceau longitudinal moyen {c}', 'm', ''),
    ('SLF_I', 'Substance blanche', 'Faisceau longitudinal supérieur {c}, partie I', 'm', ''),
    ('SLF_II', 'Substance blanche', 'Faisceau longitudinal supérieur {c}, partie II', 'm', ''),
    ('SLF_III', 'Substance blanche', 'Faisceau longitudinal supérieur {c}, partie III', 'm', ''),
    ('STR', 'Substance blanche', 'Radiation thalamique supérieure {c}', 'f', ''),
    ('UF', 'Substance blanche', 'Faisceau unciné {c}', 'm', ''),
    ('OR', 'Voies optiques', 'Radiations optiques {c}', 'fp', ''),
    ('ICP', 'Tronc cérébral', 'Pédoncule cérébelleux inférieur {c}', 'm', ''),
    ('SCP', 'Tronc cérébral', 'Pédoncule cérébelleux supérieur {c}', 'm', ''),
    ('T_PREF', 'Substance blanche', 'Fibres thalamo-préfrontales {c}', 'fp', ''),
    ('T_PREM', 'Substance blanche', 'Fibres thalamo-prémotrices {c}', 'fp', ''),
    ('T_PREC', 'Substance blanche', 'Fibres thalamo-précentrales {c}', 'fp', ''),
    ('T_POSTC', 'Substance blanche', 'Fibres thalamo-postcentrales {c}', 'fp', ''),
    ('T_PAR', 'Substance blanche', 'Fibres thalamo-pariétales {c}', 'fp', ''),
    ('T_OCC', 'Substance blanche', 'Fibres thalamo-occipitales {c}', 'fp', ''),
    ('ST_FO', 'Substance blanche', 'Fibres striato-fronto-orbitaires {c}', 'fp', ''),
    ('ST_PREF', 'Substance blanche', 'Fibres striato-préfrontales {c}', 'fp', ''),
    ('ST_PREM', 'Substance blanche', 'Fibres striato-prémotrices {c}', 'fp', ''),
    ('ST_PREC', 'Substance blanche', 'Fibres striato-précentrales {c}', 'fp', ''),
    ('ST_POSTC', 'Substance blanche', 'Fibres striato-postcentrales {c}', 'fp', ''),
    ('ST_PAR', 'Substance blanche', 'Fibres striato-pariétales {c}', 'fp', ''),
    ('ST_OCC', 'Substance blanche', 'Fibres striato-occipitales {c}', 'fp', ''),
    ('FX', '—', '—', 'm', "Fornix trop fin pour cette diffusion (b = 800, 2 mm) : celui de FastSurfer est retenu."),
]
TRACTSEG_MEDIANS = [
    ('MCP', 'Tronc cérébral', 'Pédoncules cérébelleux moyens', ''),
    ('CC', 'Substance blanche', 'Fibres calleuses (ensemble)', 'Radiations du corps calleux dans les hémisphères.'),
    ('CC_1', 'Substance blanche', 'Fibres calleuses du rostrum (CC 1)', ''),
    ('CC_2', 'Substance blanche', 'Fibres calleuses du genou (CC 2)', ''),
    ('CC_3', 'Substance blanche', 'Fibres calleuses du tronc, partie rostrale (CC 3, prémotrices)', ''),
    ('CC_4', 'Substance blanche', 'Fibres calleuses du tronc, partie moyenne (CC 4, motrices)', ''),
    ('CC_5', 'Substance blanche', 'Fibres calleuses du tronc, partie postérieure (CC 5, somesthésiques)', ''),
    ('CC_6', 'Substance blanche', "Fibres calleuses de l'isthme (CC 6)", ''),
    ('CC_7', 'Substance blanche', 'Fibres calleuses du splénium (CC 7)', ''),
    ('CA', '—', '—', 'Doublon de la commissure antérieure de HypVINN, qui est retenue.'),
]

# ---------------------------------------------------------------------------
# Structures attendues des points manuels de l'auteur (étape 4) : liste de départ, à compléter ou corriger
# ---------------------------------------------------------------------------
MANUELLES_PAIRES = [
    # Artères (ARM TOF 7 T : polygone de Willis et au-dessus)
    ('Artères', 'Artère carotide interne {c} (segment supraclinoïdien)', 'f'),
    ('Artères', 'Artère cérébrale antérieure {c}, segment A1', 'f'),
    ('Artères', 'Artère cérébrale antérieure {c}, segment A2', 'f'),
    ('Artères', 'Artère péricalleuse {c}', 'f'),
    ('Artères', 'Artère calloso-marginale {c}', 'f'),
    ('Artères', 'Artère cérébrale moyenne {c}, segment M1', 'f'),
    ('Artères', 'Artère cérébrale moyenne {c}, segment M2 (branches insulaires)', 'f'),
    ('Artères', 'Artères lenticulo-striées latérales {c}', 'fp'),
    ('Artères', 'Artère communicante postérieure {c}', 'f'),
    ('Artères', 'Artère choroïdienne antérieure {c}', 'f'),
    ('Artères', 'Artère cérébrale postérieure {c}, segment P1', 'f'),
    ('Artères', 'Artère cérébrale postérieure {c}, segment P2', 'f'),
    ('Artères', 'Artère cérébelleuse supérieure {c}', 'f'),
    # Sinus et veines (SWI, T1, T2)
    ('Sinus veineux', 'Sinus transverse {c}', 'm'),
    ('Sinus veineux', 'Sinus sigmoïde {c}', 'm'),
    ('Sinus veineux', 'Sinus caverneux {c}', 'm'),
    ('Sinus veineux', 'Veine cérébrale interne {c}', 'f'),
    ('Sinus veineux', 'Veine basale {c} (de Rosenthal)', 'f'),
    ('Sinus veineux', 'Veine thalamo-striée {c}', 'f'),
    # Citernes
    ('Ventricules et citernes', 'Citerne ambiante {c}', 'f'),
    ("Ventricules et citernes", "Citerne de l'angle ponto-cérébelleux {c}", 'f'),
    ('Ventricules et citernes', 'Citerne sylvienne {c}', 'f'),
    # Nerfs crâniens (3D T2 0,7 mm)
    ('Tronc cérébral', 'Nerf oculomoteur {c} (III)', 'm'),
    ('Tronc cérébral', 'Nerf trijumeau {c} (V)', 'm'),
    ('Tronc cérébral', 'Nerf abducens {c} (VI)', 'm'),
    ('Tronc cérébral', 'Nerfs facial et vestibulocochléaire {c} (VII, VIII)', 'mp'),
    # Tronc cérébral et cervelet
    ('Tronc cérébral', 'Pédoncule cérébral {c}', 'm'),
    ('Tronc cérébral', 'Colliculus supérieur {c}', 'm'),
    ('Tronc cérébral', 'Colliculus inférieur {c}', 'm'),
    ('Tronc cérébral', 'Olive bulbaire {c}', 'f'),
    ('Noyaux gris centraux et structures apparentées', 'Noyau rouge {c}', 'm'),
    ('Noyaux gris centraux et structures apparentées', 'Substance noire {c}', 'f'),
    ('Noyaux gris centraux et structures apparentées', 'Noyau sous-thalamique {c}', 'm'),
    ('Noyaux gris centraux et structures apparentées', 'Claustrum {c}', 'm'),
    ('Cervelet', 'Noyau dentelé {c}', 'm'),
    # Voies optiques
    ('Voies optiques', 'Corps géniculé latéral {c}', 'm'),
    # Substance blanche
    ('Substance blanche', 'Capsule interne {c}, bras antérieur', 'f'),
    ('Substance blanche', 'Capsule interne {c}, genou', 'f'),
    ('Substance blanche', 'Capsule interne {c}, bras postérieur', 'f'),
    ('Substance blanche', 'Capsule externe {c}', 'f'),
    ('Substance blanche', 'Capsule extrême {c}', 'f'),
    ('Substance blanche', 'Couronne rayonnante {c}', 'f'),
    ('Substance blanche', 'Centre semi-ovale {c}', 'm'),
    # Système limbique
    ('Système limbique', 'Pilier postérieur du fornix {c}', 'm'),
    ('Système limbique', 'Bulbe olfactif {c}', 'm'),                 # rhinencéphale ; signalé par l'auteur (17/10)
    ('Système limbique', 'Tractus olfactif {c}', 'm'),
    # Anatomie de surface du tronc cérébral (bulbe)
    ('Tronc cérébral', 'Pyramide bulbaire {c}', 'f'),
    ('Tronc cérébral', 'Sillon pré-olivaire {c}', 'm'),
    ('Tronc cérébral', 'Sillon rétro-olivaire {c}', 'm'),
    ('Tronc cérébral', 'Faisceau gracile {c}', 'm'),
    ('Tronc cérébral', 'Faisceau cunéiforme {c}', 'm'),
    ('Tronc cérébral', 'Tubercule gracile {c}', 'm'),
    ('Tronc cérébral', 'Tubercule cunéiforme {c}', 'm'),
    ('Ventricules et citernes', 'Ouverture latérale {c} du quatrième ventricule (foramen de Luschka)', 'f'),
    # Méninges
    ('Méninges', 'Cavum trigéminal {c} (cavum de Meckel)', 'm'),
    # Gyri et régions : repères de surface
    ('Gyri', 'Opercule frontal {c}', 'm'),
    ('Gyri', 'Opercule pariétal {c}', 'm'),
    ('Gyri', 'Opercule temporal {c}', 'm'),
    ('Régions', 'Pôle frontal {c}', 'm'),
    ('Régions', 'Pôle temporal {c}', 'm'),
    ('Régions', 'Pôle occipital {c}', 'm'),
    ('Sillons', 'Sillon subpariétal {c}', 'm'),
    ('Sillons', 'Sillon paracentral {c}', 'm'),
]
MANUELLES_MEDIANES = [
    ('Artères', 'Artère communicante antérieure'),
    ('Artères', 'Artère basilaire (sommet)'),
    ('Sinus veineux', 'Sinus sagittal supérieur'),
    ('Sinus veineux', 'Sinus sagittal inférieur'),
    ('Sinus veineux', 'Sinus droit'),
    ('Sinus veineux', 'Confluent des sinus (torcular)'),
    ('Sinus veineux', 'Grande veine cérébrale (veine de Galien)'),
    ('Ventricules et citernes', 'Citerne prépontique'),
    ('Ventricules et citernes', 'Citerne interpédonculaire'),
    ('Ventricules et citernes', 'Citerne quadrigéminale'),
    ('Ventricules et citernes', 'Citerne suprasellaire (chiasmatique)'),
    ('Ventricules et citernes', 'Grande citerne (cisterna magna)'),
    ('Ventricules et citernes', 'Aqueduc du mésencéphale'),
    ('Ventricules et citernes', 'Septum pellucidum'),
    ('Tronc cérébral', 'Mésencéphale'),
    ('Tronc cérébral', 'Pont'),
    ('Tronc cérébral', 'Bulbe (moelle allongée)'),
    ('Tronc cérébral', 'Plancher du quatrième ventricule'),
    ('Substance blanche', 'Corps calleux, rostrum'),
    ('Substance blanche', 'Commissure postérieure'),
    # Anatomie de surface et intérieur du tronc cérébral
    ('Tronc cérébral', 'Partie basilaire du pont'),
    ('Tronc cérébral', 'Tegmentum du pont'),
    ('Tronc cérébral', 'Tegmentum du mésencéphale'),
    ('Tronc cérébral', 'Lame tectale (tectum)'),
    ('Tronc cérébral', 'Fosse interpédonculaire'),
    ('Tronc cérébral', 'Sillon basilaire'),
    ('Tronc cérébral', 'Foramen cæcum'),
    ('Tronc cérébral', 'Fissure médiane antérieure du bulbe'),
    ('Tronc cérébral', 'Canal central du bulbe'),
    ('Ventricules et citernes', 'Fosse rhomboïde'),
    ('Ventricules et citernes', 'Sillon médian de la fosse rhomboïde'),
    ('Ventricules et citernes', 'Voile médullaire supérieur'),
    ('Ventricules et citernes', 'Voile médullaire inférieur'),
    ('Ventricules et citernes', 'Fastigium'),
    ('Ventricules et citernes', 'Ouverture médiane du quatrième ventricule (foramen de Magendie)'),
    ('Ventricules et citernes', 'Toile choroïdienne du troisième ventricule'),
    ('Ventricules et citernes', 'Plexus choroïde du quatrième ventricule'),
    ('Sillons', 'Fissure transverse du cerveau'),
    # Méninges : membranes et espaces au contact de la table interne
    ('Méninges', 'Dure-mère crânienne'),
    ('Méninges', 'Arachnoïde'),
    ('Méninges', 'Pie-mère crânienne'),
    ('Méninges', 'Espace épidural (virtuel)'),
    ('Méninges', 'Espace subdural (virtuel)'),
    ('Méninges', 'Espace subarachnoïdien'),
    ('Méninges', 'Granulations arachnoïdiennes'),
    ('Méninges', 'Incisure de la tente du cervelet'),
    ('Glandes', 'Hypophyse'),
    ('Glandes', 'Glande pinéale (épiphyse)'),
]


def lignes():
    """Une ligne par structure : les 8 colonnes du fichier, puis la couche d'étiquettes de l'étape 3 qui la porte
    (nom du volume, valeurs ; None pour les structures manuelles), lue par etape5_validation_donnees.py."""
    sortie = []
    cote = lambda modele, genre, c: modele.replace('{c}', ADJ[(c, genre)])
    aseg = {}
    for g, d, nom, cat, mod, genre, rq in ASEG_PAIRES:
        aseg[nom], aseg[nom.replace('Left', 'Right')] = g, d
        for ident, c, n in ((g, 'gauche', nom), (d, 'droit', nom.replace('Left', 'Right'))):
            sortie.append(['FastSurfer (aseg)', ident, n, cat, cote(mod, genre, c), c, 'automatique', rq,
                           ('fines', [ident])])
    for ident, nom, cat, fr, rq in ASEG_MEDIANS:
        sortie.append(['FastSurfer (aseg)', ident, nom, cat, fr, 'médian', 'automatique', rq, ('fines', [ident])])
    for ident, nom, rq in ASEG_EXCLUS:
        sortie.append(['FastSurfer (aseg)', ident, nom, '—', '—', '—', 'non publié', rq, ('fines', [ident])])
    for n, nom, cat, mod, genre, rq in DKT:
        for base, c, h in ((1000, 'gauche', 'lh'), (2000, 'droit', 'rh')):
            sortie.append(['FastSurfer (DKT)', base + n, f'ctx-{h}-{nom}', cat, cote(mod, genre, c), c,
                           'automatique', rq, ('fines', [base + n])])
    for n, (mod, genre, regions, rq) in enumerate(LOBES, start=1):        # valeurs : n à gauche, 10 + n à droite
        for c, v in (('gauche', n), ('droit', 10 + n)):
            sortie.append(['Règle (régions DKT)', '', '', 'Régions', cote(mod, genre, c), c, 'dérivé',
                           ('Regroupement : ' + ', '.join(regions) + '. Substance blanche rattachée au cortex le plus '
                            'proche, centre semi-ovale compris, capsules exclues. ' + rq).strip(), ('lobes', [v])])
    for n, (mod, a, b, rq) in enumerate(SILLONS, start=1):                # valeurs : n à gauche, 50 + n à droite
        for c, v in (('gauche', n), ('droit', 50 + n)):
            sortie.append(['Règle (limites DKT)', '', '', 'Sillons', cote(mod, 'm', c), c, 'dérivé',
                           (f"Interface {'/'.join(a)} | {'/'.join(b)}. " + rq).strip(), ('sillons', [v])])
    for g, d, nom, mod, rq in CEREBNET_PAIRES:
        for ident, c, pre in ((g, 'gauche', 'Left'), (d, 'droit', 'Right')):
            sortie.append(['CerebNet', ident, f'Cbm_{pre}_{nom}', 'Cervelet', cote(mod, 'm', c), c, 'automatique', rq,
                           ('fines', [ident])])
    for ident, nom, fr in CEREBNET_VERMIS:
        sortie.append(['CerebNet', ident, nom, 'Cervelet', fr, 'médian', 'automatique', '', ('fines', [ident])])
    for ident, nom, cat, fr, rq in CORPS_CALLEUX:
        sortie.append(['FastSurfer-CC', ident, nom, cat, fr, 'médian', 'automatique', rq, ('fines', [ident])])
    for g, d, nom, cat, mod, genre, rq in HYPVINN_PAIRES:
        for ident, c, pre in ((g, 'gauche', 'L-'), (d, 'droit', 'R-')):
            sortie.append(['HypVINN', ident, pre + nom, cat, cote(mod, genre, c), c, 'automatique', rq,
                           ('fines', [ident])])
    for ident, nom, cat, fr, rq in HYPVINN_MEDIANS:
        sortie.append(['HypVINN', ident, nom, cat, fr, 'médian', 'automatique', rq, ('fines', [ident])])
    for ident, nom, rq in HYPVINN_DOUBLONS:
        sortie.append(['HypVINN', ident, nom, '—', '—', '—', 'non publié', rq, None])
    for mod, genre, membres, rq in REGROUPEMENTS:
        for c in ('gauche', 'droit'):
            noms = [m.replace('Left', 'Right') if c == 'droit' else m for m in membres]
            sortie.append(['Règle (étiquettes aseg)', '', '', 'Noyaux gris centraux et structures apparentées',
                           cote(mod, genre, c), c, 'dérivé', ('Regroupement : ' + ', '.join(noms) + '. ' + rq).strip(),
                           ('fines', [aseg[m] for m in noms])])
    couches_limites = {'Fissure longitudinale du cerveau': ('sillons', [100]), 'Faux du cerveau': ('meninges', [1]),
                       'Tente du cervelet': ('meninges', [2])}
    for cat, fr, rq in LIMITES_MEDIANES:
        sortie.append(['Règle (limites FastSurfer)', '', '', cat, fr, 'médian', 'dérivé', rq, couches_limites[fr]])
    for nom, cat, mod, genre, rq in TRACTSEG_PAIRES:
        for c, suffixe in (('gauche', 'left'), ('droit', 'right')):
            publie = cat != '—'
            sortie.append(['TractSeg', f'{nom}_{suffixe}', f'{nom}_{suffixe}', cat, cote(mod, genre, c) if publie else '—',
                           c if publie else '—', 'automatique' if publie else 'non publié', rq,
                           ('faisceaux', [f'{nom}_{suffixe}'])])
    for nom, cat, fr, rq in TRACTSEG_MEDIANS:
        publie = cat != '—'
        sortie.append(['TractSeg', nom, nom, cat, fr, 'médian' if publie else '—', 'automatique' if publie else 'non publié',
                       rq, ('faisceaux', [nom])])
    import preparer_territoires as t
    for ident, code, groupe, nom, court, couleur, precision in t.TERRITOIRES:
        for i, c in ((ident, 'gauche'), (ident + 1, 'droit')):
            sortie.append(['Atlas des territoires (Liu 2023, redécoupé)', i, code, 'Territoires vasculaires',
                           f'{nom} ({c})', c, 'transporté', precision, ('territoires', [i])])
    for i, nom in ((1, 'Zone jonctionnelle corticale'), (2, 'Zone jonctionnelle profonde')):
        sortie.append(['Atlas des territoires (calque jonctionnel)', i, '', 'Territoires vasculaires', nom,
                       'gauche et droit', 'transporté', '', ('jonctions', [i])])
    sortie.append(['Masque TOF (seuil local)', 1, '', 'Artères', 'Artères (masque non nommé)', 'gauche et droit',
                   'automatique', 'Vaisseaux du TOF, sans nom : les noms viennent des points manuels.', ('arteres', [1])])
    for cat, mod, genre in MANUELLES_PAIRES:
        for c in ('gauche', 'droit'):
            sortie.append(['Points manuels (navigateur)', '', '', cat, cote(mod, genre, c), c, 'manuel', '', None])
    for cat, fr in MANUELLES_MEDIANES:
        rq = ('Déjà segmenté par HypVINN : point manuel facultatif (contrôle).'
              if fr in ('Hypophyse', 'Glande pinéale (épiphyse)') else '')
        sortie.append(['Points manuels (navigateur)', '', '', cat, fr, 'médian', 'manuel', rq, None])
    return sortie


def ecrire():
    entete = ['source', 'id', 'nom_outil', 'categorie', 'nom_fr', 'cote', 'statut', 'remarque']
    l = lignes()
    with open(os.path.join(ICI, 'correspondance-etiquettes.csv'), 'w', encoding='utf-8-sig', newline='') as f:
        w = csv.writer(f, delimiter=';')
        w.writerow(entete)
        w.writerows(r[:8] for r in l)
    md = ['# Correspondance des étiquettes : à relire', '',
          f'{len(l)} lignes. Générée par `etiquettes.py` (modifier ce script, pas ce fichier).', '']
    for cat in CATEGORIES + ['—']:
        rang = [r for r in l if r[3] == cat]
        if not rang:
            continue
        md += [f'## {cat if cat != "—" else "Non publiées"} ({len(rang)})', '',
               '| Nom français | Côté | Source | Id | Nom de l\'outil | Statut | Remarque |', '|---|---|---|---|---|---|---|']
        md += [f'| {r[4]} | {r[5]} | {r[0]} | {r[1]} | {r[2]} | {r[6]} | {r[7]} |' for r in rang]
        md.append('')
    with open(os.path.join(ICI, 'correspondance-etiquettes.md'), 'w', encoding='utf-8') as f:
        f.write('\n'.join(md))
    return l


if __name__ == '__main__':
    import sys
    sys.path.insert(0, os.path.dirname(ICI))
    l = ecrire()
    from collections import Counter
    print(len(l), 'lignes ;', dict(Counter(r[3] for r in l)))
    print(dict(Counter(r[6] for r in l)))
