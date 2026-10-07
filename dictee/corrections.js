/* =========================================================
   RadiologicHub — Dictée vocale : DICTIONNAIRE DE CORRECTIONS
   ---------------------------------------------------------
   Fichier de configuration : on peut l'enrichir librement.

   • remplacements : [ce que le reconnaisseur écrit, ce qu'on veut lire]
       - insensible à la casse et aux accents ;
       - un espace dans la forme dite accepte aussi un tiret ou rien
         (« pi rads » reconnaît « pi rads », « pi-rads », « pirads ») ;
       - seulement sur des mots entiers ; les plus longues formes sont
         appliquées en premier.
   • unites : converties uniquement APRÈS UN NOMBRE
       (« 12 millimètres » → « 12 mm », mais « quelques millimètres » reste écrit).
   • regles : remplacements avancés par expression régulière.
   • exceptionsPoint : expressions où « point » est un mot, pas un « . ».
   • synonymesRecherche : pour la commande « insérer modèle … »
       (« scanner » trouve les modèles « TDM »).
   • titresConclusion : noms acceptés pour la section de conclusion.

   Après modification : changer le ?v= des pages HTML (cache).
   ========================================================= */

(function (root, data) {
  if (typeof module === 'object' && module.exports) module.exports = data;
  else (root.RHDictee = root.RHDictee || {}).corrections = data;
})(typeof self !== 'undefined' ? self : this, {

  remplacements: [
    /* ----- Scores et classifications ----- */
    ['pi rads', 'PI-RADS'],
    ['pi quai', 'PI-QUAL'], ['pi qual', 'PI-QUAL'],
    ['bi rads', 'BI-RADS'],
    ['eu ti rads', 'EU-TIRADS'], ['eu tirads', 'EU-TIRADS'], ['e u tirads', 'EU-TIRADS'],
    ['ti rads', 'TI-RADS'],
    ['li rads', 'LI-RADS'],
    ['o rads', 'O-RADS'],
    ['lung rads', 'Lung-RADS'],
    ['bosniak', 'Bosniak'],
    ['recist', 'RECIST'], ['ressist', 'RECIST'],
    ['lugano', 'Lugano'], ['cheson', 'Cheson'], ['deauville', 'Deauville'],
    ['fleischner', 'Fleischner'], ['flechner', 'Fleischner'],
    ['gleason', 'Gleason'], ['isup', 'ISUP'],
    ['score epe', 'score EPE'],
    ['tnm', 'TNM'],
    ['aast', 'AAST'],
    ['mr trg', 'mrTRG'],

    /* ----- Examens, séquences, sigles ----- */
    ['irm', 'IRM'], ['tdm', 'TDM'], ['tep scanner', 'TEP-TDM'], ['pet scan', 'TEP-TDM'], ['tep tdm', 'TEP-TDM'],
    ['t1', 'T1'], ['t2', 'T2'], ['t un', 'T1'], ['t deux', 'T2'],
    ['flair', 'FLAIR'], ['stir', 'STIR'], ['dixon', 'Dixon'],
    ['adc', 'ADC'], ['psa', 'PSA'], ['psa d', 'PSAd'],
    ['doppler', 'Doppler'], ['écho doppler', 'écho-Doppler'],
    ['avc', 'AVC'], ['hsd', 'HSD'], ['hed', 'HED'], ['hsa', 'HSA'],
    ['ep', 'EP'], ['tvp', 'TVP'],
    ['vci', 'VCI'], ['vbp', 'VBP'],
    ['lsd', 'LSD'], ['lid', 'LID'], ['lsg', 'LSG'], ['lig', 'LIG'],
    ['adp', 'ADP'],
  ],

  /* Après un nombre seulement (ordre : formes longues d'abord) */
  unites: [
    ['millimètres cubes', 'mm³'], ['millimètre cube', 'mm³'],
    ['centimètres cubes', 'cm³'], ['centimètre cube', 'cm³'],
    ['centimètres carrés', 'cm²'], ['centimètre carré', 'cm²'],
    ['millimètres', 'mm'], ['millimètre', 'mm'],
    ['centimètres', 'cm'], ['centimètre', 'cm'],
    ['millilitres', 'mL'], ['millilitre', 'mL'],
    ['unités hounsfield', 'UH'], ['unité hounsfield', 'UH'],
    ['pour cent', '%'], ['pourcent', '%'],
    ['nanogrammes par millilitre', 'ng/mL'],
  ],

  /* Remplacements avancés : [motif, drapeaux, remplacement] */
  regles: [
    // « segment 7 » → « segment VII » (segments hépatiques)
    ['\\bsegment (\\d)\\b', 'gi', (m, n) => `segment ${['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'][+n] || n}`],
  ],

  exceptionsPoint: [
    'point de départ', "point d'appel", 'point de ponction', 'point de vue', 'point culminant',
    'point de suture', "point d'entrée", 'point de fuite', 'point de compression', 'point de rupture',
    'au point', 'à ce point', 'mise au point',
  ],

  synonymesRecherche: {
    scanner: 'tdm', tomodensitometrie: 'tdm', tomodensitometrique: 'tdm', ct: 'tdm',
    radio: 'radiographie', rx: 'radiographie', radiographique: 'radiographie',
    echo: 'echographie', echographique: 'echographie',
    resonance: 'irm',
    cerveau: 'cerebrale', crane: 'cerebrale', encephale: 'cerebrale',
    thorax: 'thoracique', poumon: 'thoracique',
    rachis: 'rachis', colonne: 'rachis', lombaire: 'lombaire',
  },

  titresConclusion: ['conclusion', 'au total', 'en conclusion', 'synthese', 'conclusions'],
});
