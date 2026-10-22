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
      { "terme": "interapophysaire", "erreurs": ["interapophisaire", "inter apophisaire", "inter apophysaire", "inter-apophisaire", "inter-apophysaire"] },
      { "terme": "interapophysaires", "erreurs": ["interapophisaires", "inter apophisaires", "inter apophysaires", "inter-apophysaires"] },
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
      { "terme": "otospongiose", "erreurs": ["autospongiose", "auto spongiose", "otto spongiose", "oto spongiose", "eau to spongiose"] }
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
