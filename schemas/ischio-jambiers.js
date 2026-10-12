/* =========================================================
   RadiologicHub — schémas de coupe échographique : ISCHIO-JAMBIERS
   ---------------------------------------------------------
   Cours « Échoanatomie musculaire du membre inférieur ».
   6 coupes TRANSVERSALES, patient en décubitus ventral, sonde
   posée sur la face postérieure de la cuisse :
     S1 insertion ischiatique · S2 croisement du semi-membraneux ·
     S3 membrane du semi-membraneux · S4 tiers moyen ·
     S5 « cerise sur le gâteau » · S6 tendon distal du biceps fémoral.

   Convention par défaut : MÉDIAL à GAUCHE de l'écran, superficiel
   (côté sonde) en haut. svg(id, { inverse: true }) échange gauche et
   droite (les formes sont recalculées, le texte n'est jamais retourné).

   Style commun (même légende partout) : muscle gris moyen ; structures
   conjonctives (cloisons, aponévroses, tendons) en blanc / trait épais,
   comme elles apparaissent hyperéchogènes ; nerf jaune, artère rouge,
   veine bleue ; os = corticale blanche + ombre acoustique ; contour
   orange pointillé = repère clé du schéma.

   Étiquettes : vrai texte, modifiable ici (champ « texte »).
     etiquettes: 'texte'   → texte dans les marges (ordinateur)
     etiquettes: 'numeros' → pastilles numérotées, liste fournie à part
                              par etiquettesNumerotees(id) (téléphone)

   Coordonnées des formes : repère de l'IMAGE, x de 0 (médial) à 500
   (latéral), y de 0 (peau) à 410 (profondeur), ≈ 68 px par cm.
   Chaque schéma liste aussi ce qui est représenté et ses
   incertitudes anatomiques (repris dans cours/ischio-jambiers/A-VERIFIER.md).
   Utilisé par la page du cours et par tests/ischio-jambiers.test.js.
   ========================================================= */

(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.RHIschio = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const IW = 500, IH = 410;                          // image (repère des formes)
  const FONT = 'Montserrat, Arial, sans-serif', INK = '#111114', MUTED = '#55545f';
  const C = {
    fond: '#24272c', sc: '#2f3238', fin: '#596069', muscle: '#80868f', bord: '#e6e9ec',
    conj: '#f5f6f8', os: '#ffffff', ombre: '#060708',
    nerf: '#f5c518', artere: '#e5484d', veine: '#3e6ff2', repere: '#f5a524',
  };
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const f = n => +(+n).toFixed(1);

  /* ---------- Légende commune à tous les schémas ---------- */
  const LEGENDE = [
    { cle: 'muscle', texte: 'Muscle', court: 'Muscle' },
    { cle: 'conjonctif', texte: 'Conjonctif : cloison, aponévrose, tendon (hyperéchogène)', court: 'Cloison, aponévrose, tendon' },
    { cle: 'nerf', texte: 'Nerf', court: 'Nerf' },
    { cle: 'artere', texte: 'Artère', court: 'Artère' },
    { cle: 'veine', texte: 'Veine', court: 'Veine' },
    { cle: 'os', texte: 'Os : corticale et ombre acoustique', court: 'Os et ombre acoustique' },
    { cle: 'graisse', texte: 'Graisse', court: 'Graisse' },
    { cle: 'repere', texte: 'Repère clé du schéma', court: 'Repère clé' },
  ];
  /* Type de forme → entrée de légende */
  const LEGENDE_DE = {
    muscle: 'muscle', tendon: 'conjonctif', cloison: 'conjonctif', fascia: 'conjonctif', etoile: 'conjonctif',
    nerf: 'nerf', artere: 'artere', veine: 'veine', os: 'os', sc: 'graisse', fin: 'graisse',
    repere: 'repere', fantome: 'repere', fleche: 'repere',
  };
  const ORIENTATION = { M: 'médial', L: 'latéral', S: 'superficiel', P: 'profond' };

  /* ---------- Les 6 coupes ----------
     Formes (dans l'ordre de dessin) :
       sc      ligne du fascia superficiel ; la graisse sous-cutanée est au-dessus
       muscle  contour fermé (pts) ; tendon : contour fermé blanc
       cloison ligne épaisse blanche ; fascia : ligne blanche fine ; fin : cloison fine dans la graisse ou un muscle
       etoile  zone conjonctive étoilée (centre + pointes)
       os      corticale (ligne) ; l'ombre acoustique est dessinée dessous
       nerf / artere / veine : ellipse [cx, cy, rx, ry, rotation°]
       repere  contour pointillé orange (ellipse) ; fantome : ancienne position (ellipse) ; fleche : trajet (pts)
     Étiquettes : { texte, a: [x, y] (point visé), cote: 'g' | 'd' (sinon : selon x) } */
  const SCHEMAS = [
    {
      id: 's1', court: 'S1', titre: 'Insertion ischiatique', niveau: 'tubérosité ischiatique', hauteur: 0.06, tiers: 'proximal',
      relecture: { date: '2026-10-12', avis: 'corrigé à sa demande d\'après Balius et al. 2019 : tendon du semi-membraneux plus latéral et plus profond que le tendon conjoint, au contact du nerf sciatique ; fibres charnues du semi-tendineux insérées directement sur la tubérosité ; repère L contrôlé' },
      formes: [
        { t: 'sc', pts: [[-30, 62], [120, 56], [260, 54], [380, 57], [530, 62]] },
        { t: 'muscle', id: 'grand-gluteal', pts: [[-30, 65], [120, 60], [260, 58], [380, 61], [530, 66], [530, 182], [400, 190], [280, 198], [140, 192], [-30, 178]] },
        { t: 'fin', pts: [[70, 76], [110, 130], [150, 186]] },
        { t: 'fin', pts: [[260, 70], [300, 130], [330, 193]] },
        { t: 'fin', pts: [[420, 69], [440, 122], [458, 184]] },
        { t: 'muscle', id: 'carre-femoral', pts: [[350, 300], [400, 282], [470, 280], [530, 284], [530, 372], [450, 380], [372, 374], [352, 340]] },
        { t: 'muscle', id: 'semi-tendineux', pts: [[30, 302], [56, 268], [110, 252], [170, 252], [210, 266], [216, 288], [190, 293], [150, 285], [90, 291], [50, 308]] },
        { t: 'tendon', id: 'tendon-conjoint', pts: [[212, 256], [232, 240], [276, 236], [312, 246], [320, 262], [298, 274], [250, 276], [222, 270]] },
        { t: 'tendon', id: 'tendon-semi-membraneux', pts: [[296, 286], [312, 274], [340, 272], [362, 282], [358, 300], [332, 308], [306, 302]] },
        { t: 'os', id: 'tuberosite', pts: [[-30, 342], [30, 314], [90, 293], [150, 286], [200, 296], [238, 320], [262, 360], [272, 440]] },
        { t: 'etoile', id: 'triangle-cohen', c: [284, 276], pointes: [[262, 262], [318, 286], [364, 282], [214, 278]] },
        { t: 'nerf', id: 'nerf-sciatique', e: [400, 278, 38, 15, -6] },
        { t: 'repere', e: [290, 274, 88, 34, 0] },
      ],
      etiquettes: [
        { texte: 'Grand glutéal', a: [300, 125] },
        { texte: 'Semi-tendineux : fibres charnues insérées directement sur la tubérosité', a: [150, 262] },
        { texte: 'Tubérosité ischiatique (corticale)', a: [100, 292] },
        { texte: 'Tendon conjoint (longue portion du biceps + semi-tendineux) : en dehors de la tubérosité, superficiel', a: [262, 250], cote: 'g' },
        { texte: '« Triangle » de Michel Cohen : carrefour hyperéchogène étoilé', a: [284, 276], cote: 'd' },
        { texte: 'Tendon du semi-membraneux : plus latéral et plus profond, au contact du nerf', a: [334, 292], cote: 'd' },
        { texte: 'Nerf sciatique', a: [400, 278] },
        { texte: 'Carré fémoral (plan profond)', a: [450, 336] },
      ],
      represente: [
        'Coupe transversale au niveau de la tubérosité ischiatique, juste sous le pli fessier, sous le grand glutéal.',
        'Tubérosité ischiatique : ligne très hyperéchogène avec ombre acoustique postérieure.',
        'Semi-tendineux : seul ischio-jambier dont des fibres charnues atteignent directement la tubérosité ; elles sont dessinées au contact de la corticale.',
        'Tendon conjoint (longue portion du biceps + semi-tendineux) en dehors de la tubérosité, plus superficiel et plus hyperéchogène.',
        'Tendon du semi-membraneux plus latéral et plus profond que le tendon conjoint, au contact du nerf sciatique.',
        'Nerf sciatique, le plus latéral, couché sur le carré fémoral.',
        '« Triangle » de Michel Cohen : zone conjonctive étoilée au carrefour du tendon conjoint, du tendon du semi-membraneux, du semi-tendineux et du nerf sciatique.',
      ],
      incertitudes: [
        'Forme et position exactes du « triangle » de Michel Cohen : la synthèse de la démonstration le décrit comme une structure hyperéchogène étoilée réunissant tendon conjoint, tendon du semi-membraneux, semi-tendineux et nerf sciatique, sans en donner la géométrie ; ici, étoile à 4 branches vers ces quatre structures.',
        'Hauteur de coupe : à ce niveau, la longue portion du biceps n\'est pas encore charnue (elle apparaît un peu plus bas, en triangle) ; seul le semi-tendineux l\'est.',
        'Épaisseurs du grand glutéal et de la graisse : variables selon la morphologie.',
        'Carré fémoral : plan profond ajouté pour situer le nerf ; non cité dans les sources.',
        'En pratique, incliner la sonde (anisotropie) aide à distinguer le tendon du semi-membraneux du tendon conjoint ; non représenté.',
      ],
    },
    {
      id: 's2', court: 'S2', titre: 'Croisement du semi-membraneux', niveau: 'quelques centimètres sous l\'ischion', hauteur: 0.14, tiers: 'proximal',
      relecture: { date: '2026-10-12', avis: 'validé' },
      formes: [
        { t: 'sc', pts: [[-30, 56], [120, 52], [260, 50], [400, 52], [530, 56]] },
        { t: 'muscle', id: 'grand-adducteur', pts: [[-30, 270], [100, 264], [230, 268], [320, 284], [345, 322], [340, 440], [-30, 440]] },
        { t: 'muscle', id: 'grand-gluteal', pts: [[150, 60], [300, 58], [530, 58], [530, 150], [420, 140], [320, 122], [230, 98]] },
        { t: 'muscle', id: 'semi-tendineux', pts: [[10, 140], [38, 98], [110, 86], [170, 100], [190, 138], [160, 180], [80, 192], [20, 178]] },
        { t: 'muscle', id: 'biceps-long', pts: [[262, 170], [290, 142], [350, 136], [392, 152], [398, 188], [360, 210], [300, 212], [268, 198]] },
        { t: 'tendon', id: 'tendon-conjoint', pts: [[168, 166], [190, 150], [248, 146], [276, 158], [262, 176], [200, 182]] },
        { t: 'tendon', id: 'tendon-semi-membraneux', pts: [[150, 216], [175, 204], [236, 202], [262, 212], [240, 226], [175, 228]] },
        { t: 'os', id: 'femur', pts: [[350, 380], [372, 350], [404, 332], [440, 326], [480, 330], [530, 342]] },
        { t: 'nerf', id: 'nerf-sciatique', e: [400, 238, 38, 15, -4] },
        { t: 'fantome', e: [318, 246, 32, 11, 0] },
        { t: 'fleche', pts: [[290, 244], [250, 228], [205, 218], [150, 224], [96, 244]] },
      ],
      etiquettes: [
        { texte: 'Grand glutéal (bord inférieur)', a: [400, 100] },
        { texte: 'Semi-tendineux', a: [90, 140] },
        { texte: 'Tendon conjoint', a: [222, 162] },
        { texte: 'Longue portion du biceps (début)', a: [332, 178] },
        { texte: 'Tendon du semi-membraneux : passe SOUS le tendon conjoint', a: [205, 214] },
        { texte: 'En descendant, il gagne le versant médial', a: [104, 241] },
        { texte: 'Sa position à l\'insertion (en dehors)', a: [318, 246], cote: 'd' },
        { texte: 'Nerf sciatique', a: [400, 238] },
        { texte: 'Grand adducteur', a: [120, 330] },
        { texte: 'Fémur', a: [440, 327] },
      ],
      represente: [
        'Coupe transversale quelques centimètres sous l\'ischion, au bord inférieur du grand glutéal.',
        'Tendon conjoint aplati entre le semi-tendineux (médial, déjà charnu) et le début de la longue portion du biceps (latéral).',
        'Tendon du semi-membraneux situé SOUS (en profondeur de) le tendon conjoint ; sa position latérale à l\'insertion est rappelée en pointillé, et la flèche indique son trajet vers le versant médial quand on descend.',
        'Nerf sciatique en dehors, grand adducteur en profondeur, fémur en profondeur et en dehors.',
      ],
      incertitudes: [
        'Niveau exact du croisement (en centimètres sous l\'ischion) : non précisé dans la synthèse ; schéma placé à mi-chemin du croisement.',
        'Le croisement est un mouvement observé en balayant vers le bas : une seule coupe le résume avec une position fantôme et une flèche (convention du schéma, pas une structure).',
        'Hauteur d\'apparition du corps charnu de la longue portion du biceps : approximative.',
        'Fémur (région du petit trochanter / haut de la diaphyse) placé pour l\'orientation ; profondeur variable.',
      ],
    },
    {
      id: 's3', court: 'S3', titre: 'Étoile « Mercedes » et membrane du semi-membraneux', niveau: 'jonction des tiers proximal et moyen', hauteur: 0.32, tiers: 'proximal',
      relecture: { date: '2026-10-12', avis: 'corrigé à sa demande d\'après Balius et al. 2019 : étoile « Mercedes » autour du nerf sciatique ; membrane du semi-membraneux du bord médial du nerf jusqu\'à son tendon, ovale et plus petit que le nerf' },
      formes: [
        { t: 'sc', pts: [[-30, 50], [130, 46], [260, 44], [400, 46], [530, 50]] },
        { t: 'muscle', id: 'grand-adducteur', pts: [[-30, 240], [100, 234], [230, 234], [310, 246], [336, 300], [330, 440], [-30, 440]] },
        { t: 'muscle', id: 'vaste-lateral', pts: [[350, 238], [420, 212], [530, 202], [530, 440], [370, 440], [352, 330]] },
        { t: 'muscle', id: 'semi-tendineux', pts: [[8, 96], [36, 64], [118, 56], [196, 66], [224, 104], [214, 148], [160, 168], [100, 170], [34, 158]] },
        { t: 'muscle', id: 'biceps-long', pts: [[268, 104], [288, 70], [350, 62], [420, 72], [452, 106], [436, 150], [390, 166], [316, 168], [276, 150]] },
        { t: 'cloison', id: 'mercedes-tendon-conjoint', pts: [[244, 181], [242, 140], [244, 100], [246, 62]] },
        { t: 'cloison', id: 'mercedes-branche-mediale', pts: [[214, 190], [184, 177], [130, 179], [70, 169]] },
        { t: 'cloison', id: 'mercedes-branche-laterale', pts: [[274, 190], [306, 178], [370, 177], [430, 166]] },
        { t: 'tendon', id: 'tendon-semi-membraneux', e: [108, 210, 20, 11, 0] },
        { t: 'cloison', id: 'membrane-semi-membraneux', pts: [[209, 202], [170, 208], [128, 210]] },
        { t: 'cloison', id: 'cloison-intermusculaire-laterale', pts: [[352, 238], [360, 282], [371, 318]] },
        { t: 'os', id: 'femur', pts: [[292, 384], [318, 352], [346, 332], [372, 323], [398, 329], [432, 344], [478, 370], [530, 408]] },
        { t: 'nerf', id: 'nerf-sciatique', e: [244, 198, 36, 15, 0] },
        { t: 'repere', e: [244, 166, 74, 66, 0] },
      ],
      etiquettes: [
        { texte: 'Semi-tendineux', a: [110, 110] },
        { texte: 'Branche superficielle : tendon conjoint', a: [243, 120], cote: 'g' },
        { texte: 'Branche médiale (semi-tendineux)', a: [130, 179] },
        { texte: 'Membrane du semi-membraneux : du bord médial du nerf jusqu\'au tendon', a: [170, 208] },
        { texte: 'Tendon du semi-membraneux : ovale, plus petit que le nerf', a: [108, 210] },
        { texte: 'Grand adducteur', a: [140, 320] },
        { texte: 'Longue portion du biceps', a: [370, 110] },
        { texte: 'Étoile « Mercedes » : nerf sciatique au centre de 3 branches hyperéchogènes', a: [244, 198], cote: 'd' },
        { texte: 'Branche latérale (biceps)', a: [370, 177] },
        { texte: 'Cloison intermusculaire latérale', a: [360, 282] },
        { texte: 'Vaste latéral', a: [470, 300] },
        { texte: 'Fémur (ligne âpre)', a: [372, 324] },
      ],
      represente: [
        'Coupe transversale à la jonction des tiers proximal et moyen de la cuisse.',
        'Étoile « Mercedes » : le nerf sciatique, ovale et fasciculé, au centre d\'une étoile hyperéchogène à 3 branches ; branche superficielle = tendon conjoint, entre le semi-tendineux (en dedans) et la longue portion du biceps (en dehors) ; branches médiale et latérale le long de la face profonde du semi-tendineux et du biceps.',
        'Semi-tendineux un peu plus volumineux que le biceps à ce niveau.',
        'Membrane du semi-membraneux : ligne hyperéchogène qui part du bord médial du nerf et se termine sur le tendon du semi-membraneux, ovale et plus petit que le nerf, situé sous le semi-tendineux ; le corps charnu du semi-membraneux n\'est pas encore visible.',
        'Grand adducteur en profondeur ; vaste latéral, cloison intermusculaire latérale et fémur en dehors.',
      ],
      incertitudes: [
        'Trajet des branches médiale et latérale de l\'étoile : Balius ne le précise pas ; elles sont dessinées le long de la face profonde du semi-tendineux et du biceps.',
        'La synthèse de la démonstration décrit une membrane « en ménisque » tendue du tendon proximal vers le corps musculaire ; elle est dessinée ici d\'après Balius, comme une ligne allant du bord médial du nerf au tendon, parallèle à la branche médiale. Longueur et épaisseur approximatives.',
        'Taille du tendon du semi-membraneux (plus petit que le nerf) : approximative.',
        'Courte portion du biceps non représentée : elle naît plus bas, au tiers moyen de la ligne âpre.',
      ],
    },
    {
      id: 's4', court: 'S4', titre: 'Tiers moyen : les 4 repères conjonctifs', niveau: 'tiers moyen de la cuisse', hauteur: 0.5, tiers: 'moyen',
      relecture: { date: '2026-10-12', avis: 'corrigé à sa demande d\'après Balius et al. 2019 : raphé du semi-tendineux à concavité médiale, début du semi-membraneux en demi-cercle à concavité latérale, note « piège »' },
      piege: 'Piège : la cloison du semi-tendineux a une concavité médiale ; le début du semi-membraneux forme un demi-cercle à concavité latérale. Ne pas les confondre.',
      formes: [
        { t: 'sc', pts: [[-30, 46], [130, 42], [260, 40], [400, 42], [530, 46]] },
        { t: 'muscle', id: 'grand-adducteur', pts: [[-30, 292], [120, 298], [250, 284], [300, 300], [332, 338], [330, 440], [-30, 440]] },
        { t: 'muscle', id: 'vaste-lateral', pts: [[446, 236], [530, 222], [530, 440], [452, 440], [424, 336], [430, 280]] },
        { t: 'muscle', id: 'semi-membraneux', pts: [[150, 172], [90, 168], [36, 184], [10, 226], [30, 270], [86, 292], [150, 290], [120, 262], [104, 228], [118, 192]] },
        { t: 'cloison', id: 'cloison-frontale-semi-membraneux', pts: [[12, 228], [60, 228], [104, 228]] },
        { t: 'tendon', id: 'tendon-semi-membraneux', e: [158, 230, 18, 10, 0] },
        { t: 'muscle', id: 'semi-tendineux', pts: [[8, 84], [38, 56], [118, 48], [198, 60], [224, 98], [204, 146], [120, 162], [30, 150]] },
        { t: 'cloison', id: 'cloison-sigmoide-semi-tendineux', pts: [[118, 48], [150, 74], [168, 104], [150, 134], [120, 162]] },
        { t: 'muscle', id: 'biceps-court', pts: [[322, 180], [380, 176], [430, 182], [436, 226], [420, 274], [394, 314], [372, 318], [350, 300], [334, 254], [322, 214]] },
        { t: 'muscle', id: 'biceps-long', pts: [[232, 90], [266, 56], [360, 48], [452, 60], [488, 98], [466, 148], [380, 164], [272, 158]] },
        { t: 'cloison', id: 'cloison-frontale-biceps-long', pts: [[252, 108], [360, 104], [474, 102]] },
        { t: 'cloison', id: 'aponevrose-t', pts: [[300, 168], [380, 167], [462, 170]] },
        { t: 'os', id: 'femur', pts: [[290, 390], [316, 356], [344, 334], [372, 324], [400, 332], [434, 348], [480, 376], [530, 414]] },
        { t: 'nerf', id: 'nerf-sciatique', e: [290, 196, 32, 13, 0] },
        { t: 'repere', e: [290, 196, 46, 26, 0] },
      ],
      etiquettes: [
        { texte: 'Semi-tendineux', a: [60, 66] },
        { texte: 'Cloison sigmoïde (raphé) du semi-tendineux : concavité médiale', a: [166, 104] },
        { texte: 'Cloison frontale du semi-membraneux', a: [56, 228] },
        { texte: 'Début du semi-membraneux : demi-cercle à concavité latérale', a: [30, 262] },
        { texte: 'Tendon du semi-membraneux', a: [158, 230] },
        { texte: 'Grand adducteur', a: [120, 345] },
        { texte: 'Longue portion du biceps', a: [420, 78] },
        { texte: 'Cloison frontale de la longue portion', a: [420, 103] },
        { texte: 'Structure en T : la longue portion (barre) posée sur la courte portion (jambage) par une aponévrose commune', a: [430, 169] },
        { texte: 'Nerf sciatique, à la pointe du T', a: [290, 196], cote: 'd' },
        { texte: 'Courte portion du biceps (jambage du T)', a: [384, 250] },
        { texte: 'Fémur (ligne âpre)', a: [372, 326] },
        { texte: 'Vaste latéral', a: [482, 320] },
      ],
      represente: [
        'Coupe transversale au tiers moyen de la cuisse.',
        'Cloison sigmoïde (raphé) du semi-tendineux : voile blanc traversant tout le muscle, de son bord superficiel à son bord profond, à concavité médiale.',
        'Début du semi-membraneux : demi-cercle charnu à concavité latérale, son tendon logé dans la concavité ; il grossit vers le bas pendant que le semi-tendineux diminue.',
        'Piège : ne pas confondre la courbe du raphé du semi-tendineux (concavité médiale) avec le demi-cercle du semi-membraneux (concavité latérale).',
        'Cloison frontale du semi-membraneux : ligne blanche traversant le muscle dans le plan frontal (horizontale sur l\'écran).',
        'Cloison frontale de la longue portion du biceps, dans le prolongement du tendon conjoint.',
        'Structure en T : la longue portion, large et superficielle, forme la barre ; la courte portion, étroite, descend vers la ligne âpre et forme le jambage ; une aponévrose commune les réunit. Nerf sciatique dans l\'angle médial du T, entre longue portion, courte portion, semi-membraneux et grand adducteur.',
        'Grand adducteur en profondeur, fémur (ligne âpre) et vaste latéral en profondeur et en dehors.',
      ],
      incertitudes: [
        'Structure en T : la synthèse dit que la longue portion s\'insère sur le fascia de la courte portion et que le nerf est « à la pointe du T », sans décrire le T. Lecture retenue : barre = longue portion, jambage = courte portion (vers la ligne âpre), aponévrose commune entre les deux, nerf dans l\'angle médial du T. À confirmer sur vos images.',
        'Raphé du semi-tendineux : dessiné du bord superficiel au bord profond, concavité médiale (Balius) ; sa forme exacte varie avec la hauteur de coupe (« mouvement d\'ascension » au balayage).',
        'Volume du semi-membraneux : la synthèse de la démonstration décrit trois muscles de volume voisin au tiers moyen ; Balius décrit à ce niveau le début du semi-membraneux en demi-cercle, qui grossit vers le bas. Dessiné en croissant de taille moyenne : à confirmer sur vos images.',
        'Position en hauteur des cloisons frontales dans chaque muscle : approximative.',
        'Largeur du champ : la coupe montre toute la loge postérieure ; avec une sonde linéaire, il faut en pratique deux positions ou un mode panoramique.',
      ],
    },
    {
      id: 's5', court: 'S5', titre: '« Cerise sur le gâteau » et patte d\'oie', niveau: 'tiers distal de la cuisse', hauteur: 0.7, tiers: 'distal',
      relecture: { date: '2026-10-12', avis: 'corrigé à sa demande d\'après Balius et al. 2019 : le tendon du semi-tendineux repose SUR la face superficielle du semi-membraneux, dans une gouttière (et non en son centre) ; gracile et sartorius ajoutés en dedans' },
      formes: [
        { t: 'sc', pts: [[-30, 42], [130, 38], [260, 36], [400, 38], [530, 42]] },
        { t: 'muscle', id: 'sartorius', pts: [[0, 186], [10, 164], [36, 158], [62, 166], [72, 186], [62, 208], [36, 214], [10, 208]] },
        { t: 'muscle', id: 'gracile', pts: [[58, 82], [71, 87], [76, 100], [71, 113], [58, 118], [45, 113], [40, 100], [45, 87]] },
        { t: 'muscle', id: 'semi-membraneux', pts: [[92, 120], [110, 84], [150, 70], [190, 74], [204, 84], [216, 97], [230, 84], [252, 78], [292, 92], [306, 140], [292, 200], [244, 238], [170, 240], [112, 214], [88, 166]] },
        { t: 'muscle', id: 'semi-tendineux', pts: [[190, 78], [198, 64], [216, 59], [234, 64], [242, 78], [234, 92], [216, 97], [198, 92]] },
        { t: 'tendon', id: 'tendon-semi-tendineux', e: [216, 78, 11, 10, 0] },
        { t: 'muscle', id: 'biceps-court', pts: [[352, 156], [430, 150], [530, 156], [530, 240], [470, 246], [380, 248], [348, 218]] },
        { t: 'muscle', id: 'biceps-long', pts: [[326, 74], [356, 52], [430, 48], [500, 62], [530, 70], [530, 130], [470, 136], [380, 138], [334, 112]] },
        { t: 'os', id: 'femur', pts: [[110, 356], [190, 338], [270, 332], [350, 336], [430, 348], [530, 370]] },
        { t: 'veine', id: 'veine-poplitee', e: [328, 234, 22, 14, 0] },
        { t: 'artere', id: 'artere-poplitee', e: [342, 270, 11, 11, 0] },
        { t: 'nerf', id: 'nerf-sciatique', e: [326, 160, 30, 13, 0] },
        { t: 'repere', e: [216, 80, 36, 28, 0] },
      ],
      etiquettes: [
        { texte: 'Tendon du semi-tendineux : la « cerise », posée SUR le gâteau, dans une gouttière', a: [216, 78] },
        { texte: 'Semi-membraneux : le « gâteau »', a: [150, 132] },
        { texte: 'Gracile', a: [58, 100] },
        { texte: 'Sartorius', a: [36, 186] },
        { texte: 'Fémur (face poplitée)', a: [190, 340] },
        { texte: 'Longue portion du biceps', a: [440, 92] },
        { texte: 'Nerf sciatique (se divise vers le haut de la fosse poplitée)', a: [326, 160], cote: 'd' },
        { texte: 'Courte portion du biceps', a: [450, 200] },
        { texte: 'Veine poplitée', a: [328, 234], cote: 'd' },
        { texte: 'Artère poplitée', a: [342, 270] },
      ],
      represente: [
        'Coupe transversale au tiers distal de la cuisse.',
        '« Cerise sur le gâteau » : le semi-tendineux, réduit à un petit ovale centré sur son tendon (la cerise), repose SUR la face superficielle du semi-membraneux (le gâteau), dans une gouttière, un peu en dehors de son centre.',
        'En dedans, muscles de la patte d\'oie : gracile (petite section ronde) puis sartorius (plus épais, plus antérieur) ; tout l\'espace entre le gracile et le semi-tendineux appartient au semi-membraneux.',
        'Longue portion du biceps (en surface) et courte portion (en profondeur) en dehors.',
        'Entre les deux groupes : graisse du sommet de la fosse poplitée, nerf sciatique, puis veine poplitée et artère poplitée, l\'artère au plus profond, contre le fémur.',
      ],
      incertitudes: [
        'Profondeur de la gouttière et position de la cerise (un peu en dehors du centre du semi-membraneux, comme le décrit Balius) : approximatives.',
        'Hauteur de la division du nerf sciatique (variable ; environ 6 cm au-dessus du pli poplité selon Balius) : nerf dessiné encore unique.',
        'Vaisseaux : la veine est dessinée en surface et un peu en dedans de l\'artère, l\'artère au contact du fémur ; à ce niveau, ils viennent de franchir l\'anneau du grand adducteur (hauteur variable).',
        'Vaste médial (en profondeur, en dedans) non représenté.',
      ],
    },
    {
      id: 's6', court: 'S6', titre: 'Tendon distal du biceps fémoral', niveau: 'au-dessus du genou, côté latéral', hauteur: 0.86, tiers: 'distal',
      relecture: { date: '2026-10-12', avis: 'validé' },
      note: 'Insertion distale double : tête de la fibula et plateau tibial (hors de cette coupe).',
      formes: [
        { t: 'sc', pts: [[-30, 40], [130, 36], [260, 34], [400, 36], [530, 40]] },
        { t: 'muscle', id: 'semi-membraneux', pts: [[-30, 70], [40, 58], [92, 80], [104, 128], [76, 170], [-30, 178]] },
        { t: 'muscle', id: 'biceps-court', pts: [[312, 104], [420, 94], [498, 102], [530, 120], [530, 180], [452, 206], [360, 198], [316, 156]] },
        { t: 'tendon', id: 'tendon-biceps-femoral', pts: [[306, 94], [350, 70], [440, 62], [540, 68], [540, 94], [440, 90], [352, 102]] },
        { t: 'os', id: 'femur', pts: [[60, 340], [160, 312], [280, 298], [380, 302], [460, 314], [530, 332]] },
        { t: 'veine', id: 'veine-poplitee', e: [168, 204, 22, 15, 0] },
        { t: 'artere', id: 'artere-poplitee', e: [182, 242, 11, 11, 0] },
        { t: 'nerf', id: 'nerf-tibial', e: [160, 140, 20, 11, 0] },
        { t: 'nerf', id: 'nerf-fibulaire-commun', e: [292, 118, 13, 8, 0] },
        { t: 'repere', e: [380, 98, 118, 40, -3] },
      ],
      etiquettes: [
        { texte: 'Semi-membraneux', a: [40, 112] },
        { texte: 'Nerf tibial', a: [160, 140] },
        { texte: 'Veine poplitée', a: [168, 204] },
        { texte: 'Artère poplitée', a: [182, 242] },
        { texte: 'Fémur (région supracondylienne)', a: [160, 313] },
        { texte: 'Tendon distal du biceps fémoral : épaississement de la face superficielle de la courte portion', a: [430, 76] },
        { texte: 'Nerf fibulaire commun, au bord médial du tendon', a: [292, 118], cote: 'd' },
        { texte: 'Courte portion du biceps', a: [440, 160] },
      ],
      represente: [
        'Coupe transversale au-dessus du genou, centrée sur le côté latéral de la fosse poplitée.',
        'Tendon distal du biceps fémoral : bande blanche épaisse formée sur la face superficielle de la courte portion, encore charnue en profondeur.',
        'Nerf fibulaire commun au bord médial et profond du tendon ; nerf tibial, veine et artère poplitées plus en dedans, dans la graisse de la fosse.',
        'Bord latéral du semi-membraneux à l\'extrémité médiale du champ ; fémur (région supracondylienne) en profondeur.',
      ],
      incertitudes: [
        'Hauteur de coupe : choisie au-dessus de l\'interligne, là où le tendon se forme ; l\'insertion double (tête de la fibula et plateau tibial) n\'est pas visible en coupe transversale à ce niveau.',
        'Distance entre le nerf fibulaire commun et le tendon : variable ; ici, au contact de son bord médial.',
        'Part respective de la longue et de la courte portion dans le tendon : non détaillée (la synthèse le décrit comme un épaississement du versant superficiel de la courte portion).',
        'Chef latéral du gastrocnémien et bandelette ilio-tibiale non représentés.',
      ],
    },
  ];
  const PAR_ID = Object.fromEntries(SCHEMAS.map(s => [s.id, s]));

  /* ---------- Géométrie ---------- */
  /* Courbe lissée (Catmull-Rom → Bézier) passant par les points */
  function lisse(pts, ferme) {
    const n = pts.length;
    if (n < 2) return '';
    const P = i => (ferme ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
    let d = `M${f(pts[0][0])},${f(pts[0][1])}`;
    for (let i = 0; i < (ferme ? n : n - 1); i++) {
      const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
      d += `C${f(p1[0] + (p2[0] - p0[0]) / 6)},${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)},${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])},${f(p2[1])}`;
    }
    return d + (ferme ? 'Z' : '');
  }
  /* Miroir gauche / droite dans le repère de l'image */
  const mx = (x, inv) => (inv ? IW - x : x);
  const miroir = (pts, inv) => pts.map(([x, y]) => [mx(x, inv), y]);
  const ellipse = ([cx, cy, rx, ry, rot = 0], inv, attrs) =>
    `<ellipse cx="${f(mx(cx, inv))}" cy="${f(cy)}" rx="${rx}" ry="${ry}"${rot ? ` transform="rotate(${inv ? -rot : rot} ${f(mx(cx, inv))} ${f(cy)})"` : ''} ${attrs}/>`;
  function etoile(c, pointes, interieur = 15) {
    const ang = p => Math.atan2(p[1] - c[1], p[0] - c[0]);
    const tri = pointes.slice().sort((a, b) => ang(a) - ang(b));
    const pts = [];
    tri.forEach((p, i) => {
      const q = tri[(i + 1) % tri.length];
      let a1 = ang(p), a2 = ang(q);
      if (a2 <= a1) a2 += 2 * Math.PI;
      const am = (a1 + a2) / 2;
      pts.push(p, [c[0] + interieur * Math.cos(am), c[1] + interieur * Math.sin(am)]);
    });
    return pts;
  }

  /* Une forme → SVG (dans le repère de l'image) */
  function forme(s, inv) {
    const L = LEGENDE_DE[s.t];
    const data = `data-l="${L}"${s.id ? ` data-id="${esc(s.id)}"` : ''}`;
    switch (s.t) {
      case 'sc': {
        const p = miroir(s.pts, inv).sort((a, b) => a[0] - b[0]);
        const bande = `M${p[0][0]},-20L` + lisse(p, false).slice(1) + `L${p[p.length - 1][0]},-20Z`;
        return `<path ${data} d="${bande}" fill="${C.sc}"/>` +
          `<path data-l="conjonctif" d="${lisse(p, false)}" fill="none" stroke="${C.bord}" stroke-width="2.5"/>`;
      }
      case 'muscle': return `<path ${data} d="${lisse(miroir(s.pts, inv), true)}" fill="${C.muscle}" stroke="${C.bord}" stroke-width="2.2" stroke-linejoin="round"/>`;
      case 'tendon':
        return s.e ? ellipse(s.e, inv, `${data} fill="${C.conj}" stroke="#fff" stroke-width="2"`)
          : `<path ${data} d="${lisse(miroir(s.pts, inv), true)}" fill="${C.conj}" stroke="#fff" stroke-width="2" stroke-linejoin="round"/>`;
      case 'cloison': return `<path ${data} d="${lisse(miroir(s.pts, inv), false)}" fill="none" stroke="${C.conj}" stroke-width="5" stroke-linecap="round"/>`;
      case 'fascia': return `<path ${data} d="${lisse(miroir(s.pts, inv), false)}" fill="none" stroke="${C.bord}" stroke-width="2.5"/>`;
      case 'fin': return `<path ${data} d="${lisse(miroir(s.pts, inv), false)}" fill="none" stroke="${C.fin}" stroke-width="1.6" stroke-linecap="round"/>`;
      case 'etoile': {
        const c = [mx(s.c[0], inv), s.c[1]];
        const pts = etoile(c, miroir(s.pointes, inv));
        return `<path ${data} d="M${pts.map(p => `${f(p[0])},${f(p[1])}`).join('L')}Z" fill="${C.conj}" stroke="#fff" stroke-width="2" stroke-linejoin="round"/>`;
      }
      case 'os': {
        const p = miroir(s.pts, inv).sort((a, b) => a[0] - b[0]);
        const cortex = lisse(p, false);
        const ombre = `${cortex}L${p[p.length - 1][0]},${IH + 40}L${p[0][0]},${IH + 40}Z`;
        return `<path ${data} d="${ombre}" fill="${C.ombre}"/>` +
          `<path ${data} d="${cortex}" fill="none" stroke="${C.os}" stroke-width="6" stroke-linecap="round"/>`;
      }
      case 'nerf': {
        const [cx, cy, rx, ry, rot = 0] = s.e;
        const x = mx(cx, inv), r = inv ? -rot : rot;
        const fasc = [[-0.45, -0.2], [0, -0.3], [0.45, -0.15], [-0.25, 0.35], [0.25, 0.35]]
          .map(([a, b]) => `<circle cx="${f(x + a * rx)}" cy="${f(cy + b * ry)}" r="${Math.max(1.6, Math.min(3, ry / 4))}" fill="${C.nerf}"/>`).join('');
        return `<g ${data}${r ? ` transform="rotate(${r} ${f(x)} ${f(cy)})"` : ''}>` +
          `<ellipse cx="${f(x)}" cy="${f(cy)}" rx="${rx}" ry="${ry}" fill="${C.fond}"/>` +
          `<ellipse cx="${f(x)}" cy="${f(cy)}" rx="${rx}" ry="${ry}" fill="${C.nerf}" fill-opacity="0.28" stroke="${C.nerf}" stroke-width="3"/>${rx > 15 ? fasc : ''}</g>`;
      }
      case 'artere': return ellipse(s.e, inv, `${data} fill="${C.artere}" stroke="#ff8a8d" stroke-width="2"`);
      case 'veine': return ellipse(s.e, inv, `${data} fill="${C.veine}" stroke="#8fb0ff" stroke-width="2"`);
      case 'repere': return ellipse(s.e, inv, `${data} fill="none" stroke="${C.repere}" stroke-width="2.5" stroke-dasharray="8 6"`);
      case 'fantome': return ellipse(s.e, inv, `${data} fill="none" stroke="${C.repere}" stroke-width="2" stroke-dasharray="4 4"`);
      case 'fleche': return `<path ${data} d="${lisse(miroir(s.pts, inv), false)}" fill="none" stroke="${C.repere}" stroke-width="2.5" stroke-dasharray="7 5" marker-end="url(#rh-ij-fleche)"/>`;
      default: throw new Error(`forme inconnue : ${s.t}`);
    }
  }

  /* ---------- Étiquettes : côté, coupure en lignes, répartition sans chevauchement ---------- */
  function couper(texte, max = 22) {
    const mots = String(texte).replace(/« /g, '«\u00a0').replace(/ »/g, '\u00a0»').split(/ +/), lignes = [];
    let l = '';
    for (const m of mots) {
      if (l && (l + ' ' + m).length > max) { lignes.push(l); l = m; } else l = l ? l + ' ' + m : m;
    }
    if (l) lignes.push(l);
    return lignes;
  }
  const cote = (e, inv) => {
    const c = e.cote || (e.a[0] < IW / 2 ? 'g' : 'd');
    return inv ? (c === 'g' ? 'd' : 'g') : c;
  };
  const LIGNE = 15, ECART = 9;
  /* Positions verticales des étiquettes d'un côté (repère de l'image), triées par point visé */
  function repartir(liste) {
    liste.sort((a, b) => a.a[1] - b.a[1]);
    const h = e => e.lignes.length * LIGNE;
    liste.forEach((e, i) => {
      const voulu = e.a[1] - h(e) / 2;
      e.y = i ? Math.max(voulu, liste[i - 1].y + h(liste[i - 1]) + ECART) : voulu;
    });
    const bas = IH - 4, haut = 4;
    for (let i = liste.length - 1; i >= 0; i--) {
      const lim = i === liste.length - 1 ? bas : liste[i + 1].y - ECART;
      if (liste[i].y + h(liste[i]) > lim) liste[i].y = lim - h(liste[i]);
    }
    if (liste.length && liste[0].y < haut) {
      liste[0].y = haut;
      for (let i = 1; i < liste.length; i++) liste[i].y = Math.max(liste[i].y, liste[i - 1].y + h(liste[i - 1]) + ECART);
    }
    return liste;
  }
  /* Étiquettes numérotées (ordre de lecture : de haut en bas, puis de gauche à droite à l'écran) */
  function etiquettesNumerotees(id, { inverse = false } = {}) {
    const s = PAR_ID[id];
    return s.etiquettes.map(e => ({ ...e, ax: mx(e.a[0], inverse) }))
      .sort((a, b) => a.a[1] - b.a[1] || a.ax - b.ax)
      .map((e, i) => ({ n: i + 1, texte: e.texte, a: [e.ax, e.a[1]] }));
  }

  /* ---------- Éléments fixes : sonde, orientation, plan de situation, légende ---------- */
  const DEFS = `<defs><marker id="rh-ij-fleche" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M0,0L10,5L0,10Z" fill="${C.repere}"/></marker></defs>`;
  function sonde(cx, yPeau) {
    return `<g data-role="sonde"><rect x="${cx - 46}" y="${yPeau - 34}" width="92" height="24" rx="7" fill="#3a3d44" stroke="${INK}" stroke-width="2"/>` +
      `<rect x="${cx - 60}" y="${yPeau - 11}" width="120" height="9" rx="2" fill="#d9dde2" stroke="${INK}" stroke-width="1.5"/>` +
      `<circle cx="${cx - 52}" cy="${yPeau - 22}" r="4" fill="${C.repere}" stroke="${INK}" stroke-width="1.2"><title>Repère de la sonde : côté gauche de l'écran</title></circle></g>`;
  }
  function pastille(x, y, lettre, titre) {
    return `<g data-orientation="${lettre}"><title>${esc(titre)}</title><circle cx="${f(x)}" cy="${f(y)}" r="11" fill="#fff" stroke="${INK}" stroke-width="1.5"/>` +
      `<text x="${f(x)}" y="${f(y + 4.5)}" font-size="13" font-weight="800" text-anchor="middle" fill="${INK}" font-family="${FONT}">${lettre}</text></g>`;
  }
  function situation(x, y, s) {
    const yl = y + 6 + s.hauteur * 68;
    return `<g data-role="situation"><title>Niveau de la coupe : ${esc(s.niveau)}</title>` +
      `<path d="M${x + 4},${y + 8}C${x + 10},${y} ${x + 30},${y} ${x + 34},${y + 9}L${x + 31},${y + 74}C${x + 29},${y + 80} ${x + 13},${y + 80} ${x + 11},${y + 74}Z" fill="#f1efe9" stroke="${INK}" stroke-width="1.5"/>` +
      `<path d="M${x + 6},${y + 20}C${x + 14},${y + 24} ${x + 26},${y + 24} ${x + 33},${y + 19}" fill="none" stroke="${MUTED}" stroke-width="1"/>` +
      `<line x1="${x - 3}" y1="${f(yl)}" x2="${x + 41}" y2="${f(yl)}" stroke="${C.repere}" stroke-width="4" stroke-linecap="round"/></g>`;
  }
  function pictoLegende(cle, x, y) {
    switch (cle) {
      case 'muscle': return `<rect x="${x}" y="${y - 9}" width="18" height="12" rx="2" fill="${C.muscle}" stroke="${C.bord}" stroke-width="1.5"/>`;
      case 'conjonctif': return `<rect x="${x - 1}" y="${y - 9}" width="20" height="12" rx="2" fill="#2b2e34"/><line x1="${x + 1}" y1="${y - 3}" x2="${x + 17}" y2="${y - 3}" stroke="${C.conj}" stroke-width="5" stroke-linecap="round"/>`;
      case 'nerf': return `<ellipse cx="${x + 9}" cy="${y - 3}" rx="9" ry="6" fill="${C.nerf}" fill-opacity="0.28" stroke="${C.nerf}" stroke-width="2.5"/>`;
      case 'artere': return `<circle cx="${x + 9}" cy="${y - 3}" r="6" fill="${C.artere}"/>`;
      case 'veine': return `<ellipse cx="${x + 9}" cy="${y - 3}" rx="8" ry="6" fill="${C.veine}"/>`;
      case 'os': return `<rect x="${x - 1}" y="${y - 9}" width="20" height="12" rx="2" fill="${C.ombre}"/><path d="M${x},${y - 5}Q${x + 9},${y - 11} ${x + 18},${y - 5}" fill="none" stroke="#fff" stroke-width="3.5"/>`;
      case 'graisse': return `<rect x="${x}" y="${y - 9}" width="18" height="12" rx="2" fill="${C.sc}" stroke="${C.fin}" stroke-width="1"/>`;
      case 'repere': return `<rect x="${x}" y="${y - 9}" width="18" height="12" rx="5" fill="none" stroke="${C.repere}" stroke-width="2" stroke-dasharray="4 3"/>`;
      default: return '';
    }
  }
  function legendeSvg(x, y, largeur) {
    const colonnes = [0, 0.2, 0.55, 0.77];                // la 2e colonne porte les libellés longs
    const items = LEGENDE.map((l, i) => {
      const cx = x + colonnes[i % 4] * largeur, cy = y + Math.floor(i / 4) * 22;
      const t = l.court;
      return `<g data-legende="${l.cle}">${pictoLegende(l.cle, cx, cy)}<text x="${cx + 26}" y="${cy + 1}" font-size="11.5" font-weight="600" fill="${INK}" font-family="${FONT}">${esc(t)}</text></g>`;
    }).join('');
    const orient = `<text x="${x}" y="${y + 50}" font-size="11.5" fill="${MUTED}" font-family="${FONT}">M médial · L latéral · S superficiel (côté sonde) · P profond · <tspan fill="${C.repere}">●</tspan> repère de la sonde (côté gauche de l'écran)</text>`;
    return `<g data-role="legende">${items}${orient}</g>`;
  }

  /* Disposition des étiquettes en mode texte : { g: [...], d: [...] } avec y (haut du bloc) et lignes */
  function disposition(id, { inverse = false } = {}) {
    const s = PAR_ID[id], parCote = { g: [], d: [] };
    s.etiquettes.forEach(e => parCote[cote(e, inverse)].push({ ...e, a: [mx(e.a[0], inverse), e.a[1]], lignes: couper(e.texte) }));
    return { g: repartir(parCote.g), d: repartir(parCote.d), hauteurLigne: LIGNE };
  }

  /* Version d'un schéma : empreinte de ses données (formes, étiquettes, textes).
     Toute modification change la version ; la validation est liée à une version. */
  function version(id) {
    const s = PAR_ID[id];
    const txt = JSON.stringify({ formes: s.formes, etiquettes: s.etiquettes, titre: s.titre, niveau: s.niveau, note: s.note || '', piege: s.piege || '' });
    let h = 0x811c9dc5;
    for (let i = 0; i < txt.length; i++) { h ^= txt.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    return h.toString(16).padStart(8, '0');
  }

  /* ---------- Schéma complet ----------
     options : inverse (gauche/droite), etiquettes ('texte' | 'numeros'), entete (titre, niveau), legende */
  function svg(id, { inverse = false, etiquettes = 'texte', entete = true, legende = true } = {}) {
    const s = PAR_ID[id];
    if (!s) throw new Error(`schéma inconnu : ${id}`);
    const texte = etiquettes === 'texte';
    const marge = texte ? 190 : 16;
    const lignesPiege = entete && s.piege ? couper(s.piege, texte ? 96 : 66) : [];
    const W = IW + 2 * marge, X0 = marge, Y0 = (entete ? 112 : 56) + lignesPiege.length * 16;
    const H = Y0 + IH + (legende && texte ? 92 : 14);
    const out = [];
    out.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="${FONT}" role="img" aria-labelledby="rh-ij-${id}-t" data-schema="${id}" data-inverse="${inverse ? 1 : 0}">`);
    out.push(`<title id="rh-ij-${id}-t">${esc(`${s.court} · ${s.titre} — coupe transversale, ${s.niveau}`)}</title>${DEFS}`);
    out.push(`<rect width="${W}" height="${H}" fill="#fff"/>`);
    if (entete) {
      out.push(situation(14, 12, s));
      out.push(`<text x="68" y="30" font-size="17" font-weight="800" fill="${INK}">${esc(`${s.court} · ${s.titre}`)}</text>`);
      out.push(`<text x="68" y="50" font-size="12.5" font-weight="600" fill="${MUTED}">${esc(texte ? `Coupe transversale · décubitus ventral · niveau : ${s.niveau}` : `Niveau : ${s.niveau}`)}</text>`);
      if (s.note) out.push(`<text x="68" y="68" font-size="12" font-style="italic" fill="${MUTED}">${esc(s.note)}</text>`);
      if (lignesPiege.length) {
        out.push(`<text x="68" y="${s.note ? 86 : 70}" font-size="12.5" font-weight="800" fill="#a8172d" data-role="piege">` +
          lignesPiege.map((l, i) => `<tspan x="68" dy="${i ? 16 : 0}">${esc(l)}</tspan>`).join('') + '</text>');
      }
    }
    out.push(sonde(X0 + IW / 2, Y0));
    // Image
    out.push(`<clipPath id="rh-ij-${id}-clip"><rect x="0" y="0" width="${IW}" height="${IH}"/></clipPath>`);
    out.push(`<g transform="translate(${X0} ${Y0})"><g clip-path="url(#rh-ij-${id}-clip)" data-role="image">`);
    out.push(`<rect width="${IW}" height="${IH}" fill="${C.fond}"/>`);
    s.formes.forEach(fm => out.push(forme(fm, inverse)));
    out.push(`<line x1="0" y1="1.5" x2="${IW}" y2="1.5" stroke="#f0f2f4" stroke-width="3"/>`);
    out.push('</g>');
    out.push(`<rect width="${IW}" height="${IH}" fill="none" stroke="${INK}" stroke-width="2"/>`);
    // Orientation : M / L sur les bords, S en haut, P en bas
    const gauche = inverse ? 'L' : 'M', droite = inverse ? 'M' : 'L';
    out.push(pastille(18, 22, gauche, ORIENTATION[gauche]), pastille(IW - 18, 22, droite, ORIENTATION[droite]));
    out.push(pastille(IW / 2 + 92, 16, 'S', ORIENTATION.S), pastille(IW / 2, IH - 16, 'P', ORIENTATION.P));
    // Étiquettes
    if (texte) {
      const disp = disposition(id, { inverse });
      for (const c of ['g', 'd']) {
        disp[c].forEach(e => {
          const yMid = e.y + (e.lignes.length * LIGNE) / 2 - 4;
          const xBord = c === 'g' ? 0 : IW, xTexte = c === 'g' ? -12 : IW + 12, xDep = c === 'g' ? -8 : IW + 8;
          out.push(`<g data-etiquette="${esc(e.texte)}">`);
          out.push(`<path d="M${xDep},${f(yMid)}L${xBord},${f(yMid)}" stroke="${INK}" stroke-width="1.3" fill="none"/>`);
          out.push(`<path d="M${xBord},${f(yMid)}L${f(e.a[0])},${f(e.a[1])}" stroke="${INK}" stroke-width="3.6" fill="none" stroke-opacity="0.75"/>`);
          out.push(`<path d="M${xBord},${f(yMid)}L${f(e.a[0])},${f(e.a[1])}" stroke="#fff" stroke-width="1.5" fill="none"/>`);
          out.push(`<circle cx="${f(e.a[0])}" cy="${f(e.a[1])}" r="3.6" fill="#fff" stroke="${INK}" stroke-width="1.5"/>`);
          out.push(`<text x="${xTexte}" y="${f(e.y + 11)}" font-size="12.5" font-weight="600" fill="${INK}" text-anchor="${c === 'g' ? 'end' : 'start'}">` +
            e.lignes.map((l, i) => `<tspan x="${xTexte}" dy="${i ? LIGNE : 0}">${esc(l)}</tspan>`).join('') + '</text></g>');
        });
      }
    } else {
      etiquettesNumerotees(id, { inverse }).forEach(e => {
        out.push(`<g data-etiquette="${esc(e.texte)}" data-n="${e.n}"><title>${esc(e.texte)}</title><circle cx="${f(e.a[0])}" cy="${f(e.a[1])}" r="12" fill="#fff" stroke="${INK}" stroke-width="2"/>` +
          `<text x="${f(e.a[0])}" y="${f(e.a[1] + 4.5)}" font-size="13" font-weight="800" text-anchor="middle" fill="${INK}">${e.n}</text></g>`);
      });
    }
    out.push('</g>');
    if (legende && texte) out.push(legendeSvg(X0 - 150, Y0 + IH + 28, IW + 300));
    out.push('</svg>');
    return out.join('');
  }

  return { IW, IH, LEGENDE, LEGENDE_DE, ORIENTATION, SCHEMAS, PAR_ID, svg, etiquettesNumerotees, disposition, version, couper, lisse };
});
