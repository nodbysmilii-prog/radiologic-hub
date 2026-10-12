/* =========================================================
   OsteoGamme — données de la gamme diagnostique
   ---------------------------------------------------------
   Seul fichier à modifier pour mettre à jour l'outil (critères,
   diagnostics, pondérations, cas exemples). La logique de calcul est
   dans osteogamme.js et ne doit pas changer.

   F        critères du formulaire : k (clé), g (groupe), l (libellé),
            o (choix : [valeur, libellé, précision facultative]),
            hint (précision du libellé), lw (affichage Lodwick),
            dep (condition d'activation, selon les autres réponses)
   GROUPS   ordre des groupes du formulaire
   DX       diagnostics : id, n (nom), nat / natl (nature et son libellé),
            p (message clé), w (pondérations : critère → valeur → points,
            de −3 « très atypique » à +3 « typique », au-delà si décisif ;
            pour « os » : par catégorie long, court, rachis, bassin, cote, crane)
   BONUS    points propres à un os précis, ajoutés à ceux de sa catégorie
   SITE     points d'un site précis : « os-extrémité » (ex. femur-distale)
   EXAMPLES cas exemples : l (libellé), s (réponses)
   LONG, TUBULAR, CAT : os longs, os tubulaires et catégorie de chaque os

   Après une modification : changer le ?v=… de ce fichier dans
   outils/osteogamme.html (cache des navigateurs), puis npm test.
   ========================================================= */

const LONG=['femur','tibia','fibula','humerus','radius'];
const TUBULAR=[...LONG,'mains','pieds'];
const CAT={femur:'long',tibia:'long',fibula:'long',humerus:'long',radius:'long',mains:'court',pieds:'court',tarse:'court',rachis:'rachis',sacrum:'rachis',bassin:'bassin',scap:'bassin',cote:'cote',crane:'crane'};
const F=[
 {k:'age',g:'Patient',l:'Âge',o:[['0-10','< 10 ans'],['10-20','10–20 ans'],['20-40','20–40 ans'],['40+','> 40 ans']]},
 {k:'sexe',g:'Patient',l:'Sexe',o:[['M','Homme'],['F','Femme']]},
 {k:'nombre',g:'Patient',l:'Nombre de lésions',o:[['unique','Unique'],['multiple','Multiples']]},
 {k:'cancer',g:'Patient',l:'Cancer connu',o:[['oui','Oui'],['non','Non']]},
 {k:'os',g:'Topographie',l:'Os atteint',o:[['femur','Fémur'],['tibia','Tibia'],['fibula','Fibula'],['humerus','Humérus'],['radius','Radius / ulna'],['mains','Mains'],['pieds','Métatarses / orteils'],['tarse','Tarse','calcanéum, talus'],['rachis','Rachis'],['sacrum','Sacrum'],['bassin','Bassin'],['scap','Scapula / clavicule'],['cote','Côte'],['crane','Crâne / face']]},
 {k:'extremite',g:'Topographie',l:'Extrémité',hint:'os longs',o:[['proximale','Proximale'],['distale','Distale']],dep:s=>!s.os||LONG.includes(s.os)},
 {k:'segment',g:'Topographie',l:'Segment',hint:'os tubulaires',o:[['epiphyse','Épiphyse'],['metaphyse','Métaphyse'],['diaphyse','Diaphyse']],dep:s=>!s.os||TUBULAR.includes(s.os)},
 {k:'axe',g:'Topographie',l:'Position dans l’os',o:[['centrale','Centrale'],['excentree','Excentrée'],['corticale','Corticale'],['surface','Juxtacorticale']]},
 {k:'lodwick',g:'Aspect',l:'Lodwick',lw:1,o:[['IA','IA','liseré scléreux'],['IB','IB','nette, sans liseré'],['IC','IC','floue par endroits'],['II','II','mitée'],['III','III','perméative']]},
 {k:'matrice',g:'Aspect',l:'Matrice',o:[['aucune','Aucune'],['chondroide','Chondroïde','anneaux et arcs'],['osteoide','Ostéoïde','nuageuse'],['verre','Verre dépoli']]},
 {k:'cloisons',g:'Aspect',l:'Cloisons / trabéculations',o:[['oui','Oui'],['non','Non']]},
 {k:'soufflure',g:'Aspect',l:'Soufflure',o:[['oui','Oui'],['non','Non']]},
 {k:'nll',g:'Aspect',l:'Niveaux liquide-liquide',hint:'TDM',o:[['oui','Oui'],['non','Non']]},
 {k:'perioste',g:'Réaction',l:'Réaction périostée',o:[['aucune','Aucune'],['continue','Continue, solide'],['agressive','Agressive','lamellaire, spicules, Codman']]},
 {k:'masse',g:'Réaction',l:'Masse des tissus mous',o:[['oui','Oui'],['non','Non']]},
 {k:'signe',g:'Réaction',l:'Signe particulier',o:[['fragment','Fragment tombé'],['sequestre','Séquestre'],['nidus','Nidus'],['biseau','Bords biseautés / vertèbre plane']]}
];
const GROUPS=['Patient','Topographie','Aspect','Réaction'];

const DX=[
 {id:'kos',n:'Kyste osseux simple',nat:'pseudo',natl:'Pseudo-tumeur',p:'Métaphysaire centrale, au contact du cartilage de croissance chez l’enfant ; le fragment tombé après fracture est quasi pathognomonique. Sièges classiques : humérus et fémur proximaux, calcanéum chez l’adulte.',
  w:{age:{'0-10':2,'10-20':3,'20-40':-1,'40+':-3},sexe:{M:1},nombre:{multiple:-2},os:{long:3,court:0,rachis:-2,bassin:0,cote:-1,crane:-3},segment:{epiphyse:-3,metaphyse:3,diaphyse:1},axe:{centrale:3,excentree:-1,corticale:-3,surface:-3},lodwick:{IA:3,IB:1,IC:-1,II:-3,III:-3},matrice:{aucune:1,chondroide:-2,osteoide:-3,verre:-2},soufflure:{oui:1},nll:{oui:-1},perioste:{aucune:1,agressive:-3},masse:{oui:-3},signe:{fragment:3,sequestre:-2,nidus:-3,biseau:-2}}},
 {id:'koa',n:'Kyste osseux anévrismal',nat:'agressif',natl:'Bénin, localement agressif',p:'Lésion soufflante excentrée à niveaux liquide-liquide. Chercher une lésion sous-jacente (KOA secondaire : TCG, chondroblastome, ostéosarcome télangiectasique). Rachis : arc postérieur.',
  w:{age:{'0-10':1,'10-20':3,'20-40':0,'40+':-2},nombre:{multiple:-2},os:{long:2,court:1,rachis:2,bassin:1,cote:0,crane:-1},segment:{epiphyse:-1,metaphyse:3,diaphyse:0},axe:{centrale:0,excentree:3},lodwick:{IA:2,IB:2,IC:0,II:-2,III:-3},matrice:{aucune:1,chondroide:-2,osteoide:-2,verre:-2},cloisons:{oui:2},soufflure:{oui:3,non:-2},nll:{oui:3,non:-1},perioste:{continue:1,agressive:-1},masse:{oui:-1},signe:{fragment:-1,sequestre:-2,nidus:-3}}},
 {id:'fno',n:'Fibrome non ossifiant',nat:'benin',natl:'Bénin, « ne pas toucher »',p:'Lésion métaphysaire corticale ou excentrée, multiloculée, à liseré scléreux, chez l’adolescent. Régresse avec la maturation : pas de biopsie si l’aspect est typique.',
  w:{age:{'0-10':1,'10-20':3,'20-40':0,'40+':-3},os:{long:3,court:-1,rachis:-3,bassin:-2,cote:-2,crane:-3},segment:{epiphyse:-3,metaphyse:3,diaphyse:1},axe:{centrale:-2,excentree:2,corticale:3,surface:-1},lodwick:{IA:3,IB:-1,IC:-3,II:-3,III:-3},matrice:{aucune:1,chondroide:-2,osteoide:-2,verre:-1},cloisons:{oui:2},perioste:{aucune:1,continue:-1,agressive:-3},masse:{oui:-3},nll:{oui:-1},signe:{fragment:-1,sequestre:-3,nidus:-3}}},
 {id:'df',n:'Dysplasie fibreuse',nat:'pseudo',natl:'Pseudo-tumeur',p:'Matrice en verre dépoli, os parfois soufflé, sans réaction périostée. Côtes, crâne et face, fémur proximal (crosse de berger). Formes polyostotiques possibles.',
  w:{age:{'0-10':1,'10-20':2,'20-40':2,'40+':0},nombre:{multiple:1},os:{long:2,court:-1,rachis:-1,bassin:1,cote:3,crane:3},segment:{epiphyse:-2,metaphyse:1,diaphyse:2},axe:{centrale:3,excentree:-1,corticale:-2,surface:-3},lodwick:{IA:3,IB:1,IC:-2,II:-3,III:-3},matrice:{chondroide:-1,osteoide:-2,verre:3},soufflure:{oui:1},nll:{oui:-1},perioste:{aucune:1,continue:-1,agressive:-3},masse:{oui:-3},signe:{sequestre:-2,nidus:-3}}},
 {id:'ench',n:'Enchondrome',nat:'benin',natl:'Bénin',p:'Lésion centrale à matrice chondroïde en anneaux et arcs. Tumeur la plus fréquente des phalanges. Multiples : maladie d’Ollier, syndrome de Maffucci.',
  w:{age:{'0-10':-1,'10-20':1,'20-40':2,'40+':1},nombre:{multiple:1},os:{long:2,court:3,rachis:-3,bassin:-1,cote:0,crane:-3},segment:{epiphyse:-2,metaphyse:2,diaphyse:2},axe:{centrale:3,excentree:0,corticale:-2,surface:-3},lodwick:{IA:3,IB:2,IC:-2,II:-3,III:-3},matrice:{chondroide:3,osteoide:-3,verre:-2},soufflure:{oui:1},nll:{oui:-2},perioste:{aucune:1,continue:-1,agressive:-3},masse:{oui:-3},signe:{nidus:-3,sequestre:-3}}},
 {id:'cbl',n:'Chondroblastome',nat:'agressif',natl:'Bénin, localement agressif',p:'Lésion épiphysaire (ou apophysaire) excentrée de l’adolescent, squelette immature. Matrice chondroïde dans environ la moitié des cas ; œdème médullaire marqué en IRM.',
  w:{age:{'0-10':0,'10-20':3,'20-40':0,'40+':-3},sexe:{M:1},nombre:{multiple:-3},os:{long:3,court:0,rachis:-2,bassin:-1,cote:-2,crane:-2},segment:{epiphyse:3,metaphyse:-1,diaphyse:-3},axe:{excentree:2,corticale:-2,surface:-3},lodwick:{IA:2,IB:2,IC:-1,II:-2,III:-3},matrice:{aucune:1,chondroide:2,osteoide:-2,verre:-2},nll:{oui:1},perioste:{continue:1,agressive:-2},masse:{oui:-2},signe:{nidus:-2}}},
 {id:'tcg',n:'Tumeur à cellules géantes',nat:'agressif',natl:'Bénin, localement agressif',p:'Épiphyso-métaphysaire, sous-chondrale, excentrée, après fermeture des cartilages de croissance. Marge nette non scléreuse (IB). Genou, radius distal, sacrum.',
  w:{age:{'0-10':-3,'10-20':-1,'20-40':3,'40+':0},sexe:{F:1},nombre:{multiple:-3},os:{long:3,court:0,rachis:0,bassin:1,cote:-2,crane:-2},segment:{epiphyse:3,metaphyse:1,diaphyse:-3},axe:{excentree:3,corticale:-2,surface:-3},lodwick:{IA:-2,IB:3,IC:1,II:-1,III:-3},matrice:{aucune:2,chondroide:-3,osteoide:-3,verre:-2},cloisons:{oui:1},soufflure:{oui:2},nll:{oui:1},perioste:{aucune:1,agressive:-2},signe:{fragment:-2,sequestre:-3,nidus:-3}}},
 {id:'chs',n:'Chondrosarcome',nat:'malin',natl:'Malin',p:'Adulte, bassin et racines des membres. Matrice chondroïde avec érosion endostée profonde (plus des 2/3 de la corticale), rupture corticale, masse ou douleur : ces signes l’opposent à l’enchondrome.',
  w:{age:{'0-10':-3,'10-20':-2,'20-40':0,'40+':3},sexe:{M:1},nombre:{multiple:-1},os:{long:2,court:-2,rachis:0,bassin:3,cote:2,crane:-1},segment:{epiphyse:-1,metaphyse:2,diaphyse:2},axe:{centrale:2,corticale:-1},lodwick:{IA:-2,IB:2,IC:2,II:2,III:0},matrice:{chondroide:3,osteoide:-2,verre:-2},soufflure:{oui:1},nll:{oui:-1},perioste:{continue:1,agressive:1},masse:{oui:2},signe:{nidus:-3,sequestre:-2,fragment:-2}}},
 {id:'os',n:'Ostéosarcome',nat:'malin',natl:'Malin',p:'Métaphyse autour du genou chez l’adolescent ; second pic après 60 ans (Paget, irradiation). Matrice ostéoïde, réaction périostée agressive, masse des parties molles.',
  w:{age:{'0-10':0,'10-20':3,'20-40':-1,'40+':0},sexe:{M:1},nombre:{multiple:-2},os:{long:3,court:-2,rachis:-1,bassin:0,cote:-1,crane:-1},segment:{epiphyse:-1,metaphyse:3,diaphyse:0},axe:{centrale:2,excentree:1,surface:1},lodwick:{IA:-3,IB:-2,IC:0,II:2,III:2},matrice:{chondroide:-1,osteoide:3,verre:-2},soufflure:{oui:-1},perioste:{aucune:-2,continue:-1,agressive:3},masse:{oui:3,non:-1},signe:{fragment:-3,nidus:-2}}},
 {id:'ew',n:'Sarcome d’Ewing',nat:'malin',natl:'Malin',p:'Diaphyse ou os plats (bassin, côtes) de l’enfant et de l’adolescent. Lyse perméative, réaction lamellaire en bulbe d’oignon, volumineuse masse des parties molles.',
  w:{age:{'0-10':2,'10-20':3,'20-40':-1,'40+':-3},sexe:{M:1},nombre:{multiple:-2},os:{long:2,court:-1,rachis:0,bassin:2,cote:2,crane:-1},segment:{epiphyse:-2,metaphyse:1,diaphyse:3},axe:{centrale:2,surface:-1},lodwick:{IA:-3,IB:-3,IC:-1,II:1,III:3},matrice:{aucune:2,chondroide:-2,osteoide:-2,verre:-2},soufflure:{oui:-2},perioste:{aucune:-2,continue:-1,agressive:3},masse:{oui:3,non:-1},signe:{fragment:-3,nidus:-3}}},
 {id:'mm',n:'Myélome / plasmocytome',nat:'malin',natl:'Malin',p:'Lésions à l’emporte-pièce sans liseré après 40 ans : rachis, crâne, côtes, bassin. Le plasmocytome est une lésion unique, souvent soufflante.',
  w:{age:{'0-10':-3,'10-20':-3,'20-40':-2,'40+':3},nombre:{multiple:2},os:{long:1,court:-2,rachis:3,bassin:2,cote:2,crane:3},segment:{metaphyse:1,diaphyse:1},axe:{centrale:2,surface:-2},lodwick:{IA:-3,IB:2,IC:1,II:2,III:1},matrice:{aucune:3,chondroide:-3,osteoide:-3,verre:-3},soufflure:{oui:1},nll:{oui:-2},perioste:{aucune:2,continue:-1,agressive:-2},masse:{oui:1},signe:{nidus:-3,fragment:-3}}},
 {id:'met',n:'Métastase lytique',nat:'malin',natl:'Malin',p:'Première hypothèse après 40 ans, surtout si les lésions sont multiples ou s’il existe un cancer connu. Formes soufflantes : rein et thyroïde. Chez le jeune enfant : neuroblastome.',
  w:{age:{'0-10':-1,'10-20':-2,'20-40':-1,'40+':3},cancer:{oui:4},nombre:{multiple:3},os:{long:1,court:-2,rachis:3,bassin:2,cote:2,crane:1},segment:{epiphyse:-1,metaphyse:1,diaphyse:1},axe:{centrale:1,corticale:1,surface:-2},lodwick:{IA:-3,IB:1,IC:1,II:2,III:2},matrice:{aucune:2,chondroide:-3,osteoide:-1,verre:-3},perioste:{aucune:1,continue:-1},masse:{oui:1},signe:{nidus:-3,fragment:-3}}},
 {id:'lym',n:'Lymphome osseux primitif',nat:'malin',natl:'Malin',p:'Adulte, lyse perméative diaphysaire ou métadiaphysaire avec une masse des parties molles disproportionnée par rapport à la destruction osseuse visible.',
  w:{age:{'0-10':-2,'10-20':-1,'20-40':1,'40+':2},os:{long:2,court:-2,rachis:1,bassin:2},segment:{metaphyse:1,diaphyse:2},axe:{centrale:2},lodwick:{IA:-3,IB:-2,IC:0,II:1,III:3},matrice:{aucune:2,chondroide:-3,osteoide:-2,verre:-3},soufflure:{oui:-2},perioste:{agressive:1},masse:{oui:3},signe:{sequestre:1,nidus:-3}}},
 {id:'osm',n:'Ostéomyélite',nat:'infect',natl:'Infection',p:'Peut imiter toute lésion, bénigne ou maligne. Séquestre, réaction périostée, contexte clinique et biologique. Abcès de Brodie : lésion métaphysaire de l’enfant.',
  w:{age:{'0-10':1,'10-20':1,'20-40':1,'40+':1},os:{long:2,court:1,rachis:1,cote:-1,crane:-1},segment:{metaphyse:2,diaphyse:1},axe:{centrale:1},lodwick:{IA:-2,IB:0,IC:1,II:2,III:2},matrice:{aucune:1,chondroide:-3,osteoide:-2,verre:-3},perioste:{aucune:-1,continue:2,agressive:2},masse:{oui:1},signe:{sequestre:4,fragment:-3}}},
 {id:'hl',n:'Histiocytose langerhansienne',nat:'pseudo',natl:'Granulome éosinophile',p:'Enfant. Lacune à bords biseautés du crâne, vertèbre plane, lésion diaphysaire avec réaction périostée. Peut paraître agressive.',
  w:{age:{'0-10':3,'10-20':2,'20-40':-1,'40+':-3},sexe:{M:1},nombre:{multiple:1},os:{long:1,court:-2,rachis:2,bassin:1,cote:1,crane:3},segment:{epiphyse:-2,metaphyse:1,diaphyse:2},axe:{centrale:2},lodwick:{IA:0,IB:2,IC:1,II:1,III:0},matrice:{aucune:2,chondroide:-3,osteoide:-3,verre:-3},perioste:{continue:2,agressive:1},signe:{biseau:4,sequestre:1,nidus:-3}}},
 {id:'oo',n:'Ostéome ostéoïde',nat:'benin',natl:'Bénin',p:'Nidus de moins de 1,5 à 2 cm entouré d’une sclérose corticale réactive. Douleur nocturne calmée par les AINS. Le scanner est l’examen clé pour voir le nidus.',
  w:{age:{'0-10':1,'10-20':3,'20-40':2,'40+':-2},sexe:{M:1},nombre:{multiple:-3},os:{long:3,court:1,rachis:2,bassin:-1,cote:-2,crane:-3},segment:{epiphyse:-1,metaphyse:1,diaphyse:3},axe:{centrale:-1,corticale:3},lodwick:{IA:2,IB:0,IC:-2,II:-3,III:-3},matrice:{chondroide:-3,osteoide:1,verre:-3},soufflure:{oui:-3},nll:{oui:-3},perioste:{aucune:-1,continue:3,agressive:-3},masse:{oui:-3},signe:{nidus:5,sequestre:-1,fragment:-3}}},
 {id:'geo',n:'Géode / kyste sous-chondral',nat:'pseudo',natl:'Pseudo-tumeur',p:'Lésion sous-chondrale de l’adulte, associée à une arthropathie (pincement, ostéophytes, sclérose des berges).',
  w:{age:{'0-10':-3,'10-20':-3,'20-40':0,'40+':3},nombre:{multiple:1},os:{long:2,court:1,rachis:-3,bassin:1,cote:-3,crane:-3},segment:{epiphyse:3,metaphyse:-2,diaphyse:-3},axe:{centrale:-1,excentree:2,corticale:-2,surface:-3},lodwick:{IA:3,IB:1,IC:-2,II:-3,III:-3},matrice:{aucune:2,chondroide:-3,osteoide:-3,verre:-3},soufflure:{oui:-2},perioste:{continue:-2,agressive:-3},masse:{oui:-3},signe:{nidus:-3,sequestre:-3,fragment:-2}}}
];

/* Os précis : poids de la catégorie + bonus propre à l'os ; sites = os + extrémité */
const BONUS={
 kos:{humerus:2,femur:1,tarse:3,pieds:-1,mains:-1,radius:-1,sacrum:-1},
 koa:{tibia:1,femur:1},
 fno:{femur:1,tibia:2,fibula:1,humerus:-1,radius:-1},
 df:{femur:1,tibia:1,scap:-1},
 ench:{tarse:-4,pieds:-1,humerus:1,femur:1,tibia:-1,fibula:-1,radius:-1},
 cbl:{humerus:1,femur:1,tibia:1,tarse:2},
 tcg:{radius:1,sacrum:2,femur:1,tibia:1,mains:-1,pieds:-1},
 chs:{femur:1,humerus:1,scap:1,tibia:-1,fibula:-1,radius:-2,sacrum:1},
 os:{femur:1,tibia:1,radius:-1},
 ew:{femur:1,fibula:1,radius:-1,scap:1,sacrum:1},
 mm:{femur:1,humerus:1,tibia:-2,fibula:-2,radius:-2},
 met:{femur:2,humerus:1,tibia:-2,fibula:-2,radius:-2,tarse:-2},
 lym:{femur:1,humerus:1},
 osm:{tibia:1,femur:1,pieds:1,tarse:1},
 hl:{femur:1,radius:-1},
 oo:{femur:1,tibia:1,humerus:-1,tarse:1},
 geo:{femur:1,tibia:1,humerus:1,fibula:-2}
};
const SITE={
 kos:{'humerus-proximale':2,'femur-proximale':2,'humerus-distale':-2,'femur-distale':-1},
 fno:{'femur-distale':2,'tibia-proximale':1,'tibia-distale':1,'humerus-proximale':-1},
 df:{'femur-proximale':3},
 ench:{'humerus-proximale':1,'femur-distale':1},
 cbl:{'humerus-proximale':2,'femur-distale':1,'tibia-proximale':1,'femur-proximale':1},
 tcg:{'femur-distale':2,'tibia-proximale':2,'radius-distale':3,'femur-proximale':-1},
 chs:{'femur-proximale':2,'humerus-proximale':2},
 os:{'femur-distale':3,'tibia-proximale':3,'humerus-proximale':2,'tibia-distale':-1},
 mm:{'femur-proximale':2,'humerus-proximale':2,'femur-distale':-1},
 met:{'femur-proximale':3,'humerus-proximale':2,'femur-distale':-1,'tibia-proximale':-1,'tibia-distale':-2,'radius-distale':-2,'radius-proximale':-1},
 osm:{'femur-distale':1,'tibia-proximale':1,'tibia-distale':1},
 oo:{'femur-proximale':3},
 geo:{'femur-proximale':1,'tibia-proximale':1,'humerus-proximale':1,'femur-distale':1}
};

const EXAMPLES=[
 {l:'Adulte jeune, épiphyse',s:{age:'20-40',sexe:'F',nombre:'unique',os:'femur',extremite:'distale',segment:'epiphyse',axe:'excentree',lodwick:'IB',matrice:'aucune',soufflure:'oui',perioste:'aucune'}},
 {l:'Ado, genou, agressive',s:{age:'10-20',sexe:'M',nombre:'unique',os:'femur',extremite:'distale',segment:'metaphyse',axe:'centrale',lodwick:'III',matrice:'osteoide',perioste:'agressive',masse:'oui'}},
 {l:'> 40 ans, multiples',s:{age:'40+',nombre:'multiple',os:'rachis',lodwick:'II',matrice:'aucune',perioste:'aucune'}},
 {l:'Côte, verre dépoli',s:{age:'10-20',nombre:'unique',os:'cote',axe:'centrale',lodwick:'IA',matrice:'verre',soufflure:'oui',perioste:'aucune'}}
];

if (typeof module === 'object' && module.exports) module.exports = { LONG, TUBULAR, CAT, F, GROUPS, DX, BONUS, SITE, EXAMPLES };
