/* =========================================================
   RadiologicHub — Dictée vocale : LEXIQUE DES ERREURS DE TRANSCRIPTION
   ---------------------------------------------------------
   À ENRICHIR LIBREMENT, sans toucher au code : tout ce qui est entre
   la première « { » et la dernière « } » est du JSON (guillemets doubles,
   virgules entre les éléments, pas de virgule après le dernier).
   Le test « lexique : JSON valide » (npm test) signale toute erreur de syntaxe.

   Une entrée = le terme correct + ce que la reconnaissance vocale écrit à la place :
     { "terme": "hyposignal", "erreurs": ["ipo signal", "hypo signal"] }
   Contexte facultatif (la correction n'est faite que si le contexte correspond) :
     "avant": ["le", "du"]         mot(s) juste avant l'erreur (gardés tels quels)
     "avantInterdit": ["un"]       pas de correction si l'erreur suit un de ces mots
                                   (une entrée suivante peut alors s'en charger)
     "apres": ["supérieur", "…"]   mot(s) juste après l'erreur (gardés tels quels)
     "debutPhrase": true           erreur en début de phrase seulement
   Les erreurs sont insensibles à la casse et aux accents ; un espace accepte
   aussi un tiret ou rien. Les plus longues erreurs sont essayées d'abord.
   Ordre : ce lexique → dictionnaire (corrections.js) → règle « et » / « est ».
   « categories » ne sert qu'à ranger : le nom d'une catégorie est libre.

   Après modification : changer le ?v= de comptes-rendus.html (cache).
   ========================================================= */
(function (root, data) {
  if (typeof module === 'object' && module.exports) module.exports = data;
  else (root.RHDictee = root.RHDictee || {}).lexique = data;
})(typeof self !== 'undefined' ? self : this,
{
  "categories": {
    "Anatomie et organes": [
      { "terme": "le foie est", "erreurs": ["de taille"], "debutPhrase": true, "apres": ["de taille", "homogène", "hétérogène", "stéatosique", "dysmorphique", "normal", "augmenté"] },
      { "terme": "foie", "erreurs": ["fois", "foi", "foix"], "avant": ["le", "du", "au", "ce", "son"] },
      { "terme": "rate", "erreurs": ["rat", "rates"], "avant": ["la", "de la", "une"], "apres": ["est", "et", "de", "homogène", "hétérogène", "normale", "accessoire", "mesure"] },
      { "terme": "pancréas", "erreurs": ["pan créas", "pancréa", "pend créas", "pain créas"] },
      { "terme": "reins", "erreurs": ["reims", "rhin"], "avant": ["les", "deux", "des"] },
      { "terme": "rein", "erreurs": ["reims", "rhin"], "avant": ["le", "du", "au"] },
      { "terme": "vésicule", "erreurs": ["vé sicule", "vessie cule", "véhicule"], "apres": ["biliaire", "est", "et", "lithiasique", "alithiasique"] },
      { "terme": "tendon", "erreurs": ["temps don", "tant don"] },
      { "terme": "tendons", "erreurs": ["temps dons", "tant dons"] },
      { "terme": "ligament", "erreurs": ["lit gament", "liga ment"] },
      { "terme": "ligaments", "erreurs": ["lit gaments", "liga ments"] },
      { "terme": "lobaire", "erreurs": ["l'auber", "l'aubère", "lobère", "l'aubert"], "apres": ["supérieur", "supérieure", "inférieur", "inférieure", "moyen", "moyenne"] },
      { "terme": "lobe", "erreurs": ["l'aube", "l'obe", "lob"], "apres": ["supérieur", "inférieur", "moyen", "droit", "gauche", "caudé", "frontal", "temporal", "pariétal", "occipital"] },
      { "terme": "dure-mère", "erreurs": ["grammaire", "durmer", "durmers", "durmerre", "durmaire", "dur maire", "dure-maire", "dur-mer", "dur-mère", "durmère", "dure mères", "dures mères", "dur mère", "dure mère", "dure mer", "dur mer", "dure-mer", "dure maire"] },
      { "terme": "dure-mérien", "erreurs": ["dur mais rien", "duremérien", "dure mérien", "dur mérien", "dure-mairien"] },
      { "terme": "dure-mériens", "erreurs": ["dur mais riens", "duremériens", "dure mériens", "dur mériens"] },
      { "terme": "dure-mérienne", "erreurs": ["dur mais rienne", "duremérienne", "dure mérienne", "dur mérienne"] },
      { "terme": "dure-mériennes", "erreurs": ["duremériennes", "dure mériennes", "dur mériennes"] }
    ],
    "Signal IRM et séquences": [
      { "terme": "hypersignal", "erreurs": ["hyper cent nal", "hyper signal", "hyper signale", "hypersignale", "hyper cygne al", "hyper si nal", "hyper sinal"] },
      { "terme": "hypersignaux", "erreurs": ["hyper signaux", "hyper cent naux", "hyper si gnaux"] },
      { "terme": "hyposignal", "erreurs": ["ipo signal", "hypo signal", "hippo signal", "ipo cent nal", "hypo cent nal", "hypo signale", "hyposignale"] },
      { "terme": "hyposignaux", "erreurs": ["ipo signaux", "hypo signaux", "hippo signaux"] },
      { "terme": "isosignal", "erreurs": ["iso signal", "iso cent nal", "isau signal"] },
      { "terme": "FLAIR", "erreurs": ["flèr", "flaire", "fler"] },
      { "terme": "diffusion", "erreurs": ["dif fusion", "di fusion"] },
      { "terme": "T1", "erreurs": ["thé un", "té un"] },
      { "terme": "T2", "erreurs": ["thé deux", "té deux"] }
    ],
    "Accords fréquents": [
      { "terme": "contours réguliers", "erreurs": ["contour régulier", "contours régulier", "contour réguliers"] },
      { "terme": "contours irréguliers", "erreurs": ["contour irrégulier", "contours irrégulier", "contour irréguliers"] },
      { "terme": "contours nets", "erreurs": ["contour net", "contours net", "contour nets"] },
      { "terme": "contours flous", "erreurs": ["contour flou", "contours flou", "contour flous"] },
      { "terme": "contours lobulés", "erreurs": ["contour lobulé", "contours lobulé", "contour lobulés"] },
      { "terme": "contours microlobulés", "erreurs": ["contour microlobulé", "contour microbuler", "contour microbulé", "contours microlobulé", "contours microbuler", "contours microbulé", "contour microlobulés"] },
      { "terme": "contours polylobés", "erreurs": ["contour polylobé", "contours polylobé", "contour polylobés"] },
      { "terme": "contours spiculés", "erreurs": ["contour spiculé", "contours spiculé", "contour spiculés"] },
      { "terme": "contours lisses", "erreurs": ["contour lisse", "contours lisse", "contour lisses"] },
      { "terme": "contours bosselés", "erreurs": ["contour bosselé", "contours bosselé", "contour bosselés"] },
      { "terme": "contours mal définis", "erreurs": ["contour mal défini", "contours mal défini", "contour mal définis"] },
      { "terme": "contours bien définis", "erreurs": ["contour bien défini", "contours bien défini", "contour bien définis"] }
    ],
    "Oreille, rachis, neuro (dictées de l'auteur)": [
      { "terme": "lytique", "erreurs": ["lithique", "lythique", "li tique", "litique", "lytic", "l'hytique", "lie tique"] },
      { "terme": "lyse", "erreurs": ["lise", "lize"] },
      { "terme": "ostéolyse", "erreurs": ["ostéo lise", "ostéolise", "ostéo lyse", "ostéo lize"] },
      { "terme": "lysée", "erreurs": ["lisée", "lisé", "lysé"], "avant": ["corticale", "est", "partiellement", "totalement"] },
      { "terme": "lytiques", "erreurs": ["lithiques", "lythiques"] },
      { "terme": "ostéolytique", "erreurs": ["ostéolithique", "ostéo lithique", "ostéolythique", "ostéo lytique"] },
      { "terme": "ostéolytiques", "erreurs": ["ostéolithiques", "ostéo lithiques", "ostéolythiques", "ostéo lytiques"] },
      { "terme": "conservée", "erreurs": ["conserver"] },
      { "terme": "interapophysaire", "erreurs": ["un thérapophisaire", "un thérapophysaire", "en thérapophisaire", "un thérapophisaires", "un téra apophisaire", "inter apophysaires", "interapophisaire", "inter apophisaire", "inter apophysaire", "inter-apophisaire", "inter-apophysaire"] },
      { "terme": "interapophysaires", "erreurs": ["un thérapophisaires", "un thérapophysaires", "en thérapophisaires", "interapophisaires", "inter apophisaires", "inter apophysaires", "inter-apophysaires"] },
      { "terme": "tri-ventriculaire", "erreurs": ["prix ventriculaire", "tri ventriculaire", "triventriculaire", "pris ventriculaire"] },
      { "terme": "s'étendant", "erreurs": ["c'est tendant", "c'est étendant", "sait tendant", "ces tendant", "ses tendant", "s'est tendant", "c'est tendent", "c'étendant", "c étendant", "s étendant", "cet tendant", "c'est tendons", "c'est tant dans", "set tendant", "s'étend dans"] },
      { "terme": "ptérygoïdien", "erreurs": ["pérégoïdien", "péry goïdien", "ptérigoïdien", "pterygoïdien", "pétérigoïdien"] },
      { "terme": "ptérygoïdienne", "erreurs": ["pérégoïdienne", "ptérigoïdienne", "pétérigoïdienne"] },
      { "terme": "ptérygoïdiens", "erreurs": ["pérégoïdiens", "ptérigoïdiens", "pétérigoïdiens"] },
      { "terme": "ptérygoïdiennes", "erreurs": ["pérégoïdiennes", "ptérigoïdiennes"] },
      { "terme": "épitympan", "erreurs": ["épithimpan", "épi thimpan", "épi tympan", "épithympan", "épitimpan"] },
      { "terme": "attico-antral", "erreurs": ["atiko entrailles", "atico entre elles", "attico entre elles", "atico entrailles", "attico antral", "atico antral", "attico-antral"] },
      { "terme": "attico-antrale", "erreurs": ["attico antrale", "atico antrale"] },
      { "terme": "malleus", "erreurs": ["mali us", "malleux", "malius", "malléus", "mal eus"], "avant": ["du", "le", "au", "tête du", "manche du", "col du"] },
      { "terme": "incudo-malléaire", "erreurs": ["un cul d'eau malléaire", "un cul do malléaire", "un cudo malléaire", "uncudo malléaire", "incudo malléaire", "in cudo malléaire", "un cul d'eau maléaire"] },
      { "terme": "incus", "erreurs": ["un cus", "in cus", "un cusse"] },
      { "terme": "ossifiante", "erreurs": ["aussi fiente", "aussi fiante", "os si fiante"] },
      { "terme": "ossifiant", "erreurs": ["aussi fiant", "aussi fient", "os si fiant"] },
      { "terme": "hypodensité", "erreurs": ["hypotensité", "hypo tensité", "hippo densité", "hypo densité"] },
      { "terme": "pré-stapédienne", "erreurs": ["prestapédienne", "presta pédienne", "pré stapédienne", "prés stapédienne"] },
      { "terme": "pré-stapédien", "erreurs": ["prestapédien", "presta pédien", "pré stapédien"] },
      { "terme": "otospongiose", "erreurs": ["autospongiose", "auto spongiose", "otto spongiose", "oto spongiose", "eau to spongiose"] },
      { "terme": "mitée", "erreurs": ["mite", "mitte", "mitter", "miter"], "avantInterdit": ["aspect", "os", "type", "caractère", "un aspect"] },
      { "terme": "mité", "erreurs": ["mite", "mitte", "mitter", "miter", "mitée"], "avant": ["aspect", "os", "type", "caractère"] },
      { "terme": "mitées", "erreurs": ["mites", "mittes", "miters"] },
      { "terme": "homolatéral", "erreurs": ["omolatéral", "omo latéral", "homo latéral", "au mot latéral"] },
      { "terme": "homolatérale", "erreurs": ["omolatérale", "omo latérale", "homo latérale", "au mot latérale"] },
      { "terme": "homolatéraux", "erreurs": ["omolatéraux", "omo latéraux", "homo latéraux"] },
      { "terme": "homolatérales", "erreurs": ["omolatérales", "omo latérales", "homo latérales"] }
    ],
    "Abdomen et thorax (dictées de l'auteur)": [
      { "terme": "d'échostructure", "erreurs": ["déco structure", "décostructure", "déchostructure", "d'écho structure", "déco structures", "des cos structure", "déc structure"] },
      { "terme": "échostructure", "erreurs": ["écho structure", "éco structure", "échos structure", "eko structure"] },
      { "terme": "exophytique", "erreurs": ["exofytique", "exo fytique", "exofitique", "exo phytique", "exophitique", "exo fitique", "exo-phytique"] },
      { "terme": "exophytiques", "erreurs": ["exofytiques", "exo fytiques", "exofitiques", "exo phytiques", "exophitiques"] },
      { "terme": "endophytique", "erreurs": ["endofytique", "endo fytique", "endofitique", "endo phytique", "endophitique"] },
      { "terme": "endophytiques", "erreurs": ["endofytiques", "endo fytiques", "endofitiques", "endo phytiques"] },
      { "terme": "anse iléale", "erreurs": ["ans iléale", "hanse iléale", "anse iliaque", "anse iliale", "anse iléal", "anse il est al", "anse il éal", "en ciléale", "en si léale", "anse si léale", "ans il éale", "hanse il éale", "anse ilé ale", "ans iliaque", "anse il y ale", "anse hilé ale", "anse idéal", "ans idéale", "hanse idéale"] },
      { "terme": "anses iléales", "erreurs": ["ans iléales", "hanses iléales", "anses iliaques", "anses iliales", "anses il éales", "anse iléales", "anses idéals", "ans idéales"] },
      { "terme": "iléale", "erreurs": ["idéale", "il éale", "iléal", "idéal"], "avant": ["anse", "dernière anse", "anse grêle", "région", "muqueuse", "sténose", "invagination"] },
      { "terme": "iléales", "erreurs": ["idéales", "il éales", "idéals"], "avant": ["anses", "dernières anses", "anses grêles"] },
      { "terme": "iléo-cæcale", "erreurs": ["idéo cæcale", "idéo cécale", "iléo cécale", "iléo cæcale", "il éo cécale", "idéo caecale", "iléo caecale", "iléocæcale", "iléocécale"] },
      { "terme": "produit de contraste", "erreurs": ["produits de contraste"], "avantInterdit": ["les", "des", "deux", "aux", "ces", "différents", "plusieurs"] },
      { "terme": "fosse iliaque", "erreurs": ["fossiliaque", "fossilliaque", "fossiliac", "fossile iliaque", "fausse iliaque", "fausse illiaque", "fosse illiaque", "fosse iliac", "fausse iliac"], "avantInterdit": ["les", "des", "deux", "aux"] },
      { "terme": "fosses iliaques", "erreurs": ["fossiliaques", "fossilliaques", "fausses iliaques", "fausses illiaques", "fosses illiaques", "fosses iliaque", "fosse iliaques", "fossiliaque", "fausse iliaque", "fosse iliaque"], "avant": ["les", "des", "deux", "aux"] },
      { "terme": "pré-cave", "erreurs": ["très cave", "très case", "précase", "pré case", "près cave", "prêt cave", "précave", "pré cave", "prêt case", "près case"] },
      { "terme": "rétro-cave", "erreurs": ["rétrocave", "rétro cave", "rétro case", "rétrocase"] },
      { "terme": "pré-aortico-cave", "erreurs": ["prêt aortico cave", "pré aortico cave", "près aortico cave", "très aortico cave", "prêt aortique au cave", "pré aortique au cave", "prêt aortico case", "pré aortico case"] },
      { "terme": "inter-aortico-cave", "erreurs": ["inter aortico cave", "inter aortique au cave", "inter aortico case", "entre aortico cave"] },
      { "terme": "aortico-cave", "erreurs": ["aortico cave", "aortique au cave", "aortico case"] },
      { "terme": "pré-trachéal", "erreurs": ["prêt trachéal", "très trachéal", "pré trachéal", "prétrachéal", "près trachéal"] },
      { "terme": "pré-trachéale", "erreurs": ["prêt trachéale", "très trachéale", "pré trachéale", "prétrachéale", "près trachéale"] },
      { "terme": "sus- et sous-mésocolique", "erreurs": ["suisse et sous mésocolique", "sus et sous mésocolique", "suce et sous mésocolique", "su et sous mésocolique", "suisse et sous méso colique", "sus et sous méso colique", "suisse est sous mésocolique"] },
      { "terme": "sus- et sous-mésocoliques", "erreurs": ["suisse et sous mésocoliques", "sus et sous mésocoliques", "suce et sous mésocoliques", "suisse et sous méso coliques", "sus et sous méso coliques"] },
      { "terme": "côlon", "erreurs": ["collant", "colon", "colin", "collons", "colons"], "apres": ["transverse", "droit", "gauche", "ascendant", "descendant", "sigmoïde", "pelvien", "iliaque"] },
      { "terme": "infra-médiastinal", "erreurs": ["inframediacinal", "infra médiacinal", "infra média cinal", "inframédiastinal", "infra médiastinal", "infra média stinal", "infra médiasinal", "inframédiasinal"] },
      { "terme": "infra-médiastinale", "erreurs": ["inframediacinale", "infra médiacinale", "inframédiastinale", "infra médiastinale"] },
      { "terme": "médiastinal", "erreurs": ["médiacinal", "média cinal", "médiasinal", "média stinal"] },
      { "terme": "médiastinale", "erreurs": ["médiacinale", "média cinale", "médiasinale"] },
      { "terme": "médiastinaux", "erreurs": ["médiacinaux", "média cinaux", "médiasinaux"] },
      { "terme": "rétro-cæcal", "erreurs": ["rétrosecal", "rétro secal", "rétrocécal", "rétro cécal", "rétrocaecal", "rétro caecal", "rétro cæcal", "rétrocæcal", "rétro sec al", "rétro c'est cal", "rétro sécale"] },
      { "terme": "rétro-cæcale", "erreurs": ["rétrosecale", "rétro secale", "rétrocécale", "rétro cécale", "rétrocaecale", "rétro caecale", "rétro cæcale", "rétrocæcale"] },
      { "terme": "cæcum", "erreurs": ["caecum", "cécum", "sécum", "sé cum", "cé cum"] },
      { "terme": "inter-anses", "erreurs": ["interrence", "inter rence", "interrance", "inter rance", "interance", "inter anses", "inter anse", "interrences", "inter rances", "inter hanses", "inter hanse", "inter ans"] },
      { "terme": "en verre dépoli", "erreurs": ["envers dépoli", "en vers dépoli", "en vert dépoli", "en ver dépoli", "en verre des polis", "en verre dé poli", "en verre des poli", "envers des polis", "en vers des polis"] },
      { "terme": "verre dépoli", "erreurs": ["vert dépoli", "vers dépoli", "verre des polis", "verre dé poli"] },
      { "terme": "lingulaire", "erreurs": ["l'angulaire", "langulaire", "l'engulaire", "lin gulaire", "l'ingulaire"], "apres": ["inférieur", "supérieur", "inférieure", "supérieure"] },
      { "terme": "la lingula", "erreurs": ["l'angula", "langula", "la langula", "l'engula"] },
      { "terme": "rétro-sternal", "erreurs": ["rétro sternal", "rétrosternal"] },
      { "terme": "rétro-sternale", "erreurs": ["rétro sternale", "rétrosternale"] },
      { "terme": "rétro-sternaux", "erreurs": ["rétro sternaux", "rétrosternaux"] }
    ],
    "Sémiologie et pathologie": [
      { "terme": "nodule", "erreurs": ["no dule", "nos dules"] },
      { "terme": "kyste", "erreurs": ["quiste", "kiste"] },
      { "terme": "kystes", "erreurs": ["quistes", "kistes"] },
      { "terme": "épanchement", "erreurs": ["et panchement", "épanche ment", "et penchement"] },
      { "terme": "infiltration", "erreurs": ["un filtration", "infiltre ation"] },
      { "terme": "centrolobulaire", "erreurs": ["sans trop lobulaire", "centre lobulaire", "sans tro lobulaire"] },
      { "terme": "centrolobulaires", "erreurs": ["sans trop lobulaires", "centre lobulaires", "sans tro lobulaires"] },
      { "terme": "branché", "erreurs": ["brancher", "branche est", "branchait"] },
      { "terme": "micronodules", "erreurs": ["micro nodule", "micro nodules", "micro-nodule", "micro-nodules", "micronodule"], "avantInterdit": ["un", "le", "du", "au", "ce", "cet", "seul", "un seul", "unique", "petit"] },
      { "terme": "micronodule", "erreurs": ["micro nodule", "micro nodules", "micro-nodule", "micro-nodules"] },
      { "terme": "centrolobulaires", "erreurs": ["centrolobulaire"], "avant": ["micronodules", "nodules", "opacités", "nodules flous", "micronodules flous", "nodules en verre dépoli", "micronodules en verre dépoli"] },
      { "terme": "branchés", "erreurs": ["brancher", "branché", "branchée", "branchées"], "avant": ["centrolobulaires"] },
      { "terme": "microlobulé", "erreurs": ["microbuler", "microbulé", "micro lobulé", "micro lobuler", "microlobuler"] },
      { "terme": "microlobulée", "erreurs": ["microbulée", "micro lobulée"] },
      { "terme": "microlobulés", "erreurs": ["microbulés", "micro lobulés"] },
      { "terme": "microlobulées", "erreurs": ["microbulées", "micro lobulées"] }
    ]
  }
}
);
