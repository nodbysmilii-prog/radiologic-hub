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
   • expressions : corrections en contexte, appliquées après les
       remplacements (« centripète en mode » → « centripète en mottes »).
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
    ['hnf', 'HNF'], ['chc', 'CHC'], ['tipmp', 'TIPMP'], ['tip mp', 'TIPMP'], ['vms', 'VMS'], ['ams', 'AMS'],
    ['t2 étoile', 'T2*'], ['swi', 'SWI'], ['tof', 'TOF'], ['angio irm', 'angio-IRM'], ['angio tdm', 'angio-TDM'],
    ['fat sat', 'fat-sat'], ['écho structure', 'échostructure'],

    /* ----- Sémiologie souvent mal reconnue (formes entendues → terme exact) ----- */
    // densité, signal, échogénicité : voir aussi la règle « hypo / hyper / iso » plus bas
    ['an échogène', 'anéchogène'], ['anne échogène', 'anéchogène'], ['a néchogène', 'anéchogène'], ['an échogènes', 'anéchogènes'],
    ['cérébri forme', 'cérébriforme'], ['cérébrie forme', 'cérébriforme'], ['cérébre forme', 'cérébriforme'],
    ['cérébral forme', 'cérébriforme'], ['cérébriforme', 'cérébriforme'],
    ['centri pète', 'centripète'], ['centripette', 'centripète'], ['centripet', 'centripète'], ['sans tri pète', 'centripète'],
    ['ma gamme ganglionnaire', 'magma ganglionnaire'], ['ma gamme ganglionnaires', 'magma ganglionnaire'], ['magma ganglionnaires', 'magma ganglionnaire'],
    ['ganglion naire', 'ganglionnaire'], ['ganglion naires', 'ganglionnaires'],
    ['céliaque', 'cœliaque'], ['séliaque', 'cœliaque'], ['coeliaque', 'cœliaque'], ['cœliac', 'cœliaque'],
    ['mésentérique', 'mésentérique'], ['mésentériques', 'mésentériques'], ['mésentère', 'mésentère'],
    ['mésocolique', 'mésocolique'], ['épiploïque', 'épiploïque'],
    ['hémo angiome', 'hémangiome'], ['hé mangiome', 'hémangiome'], ['hémangiome', 'hémangiome'],
    ['incident alome', 'incidentalome'], ['incidenta lome', 'incidentalome'],
    ['phéo chromocytome', 'phéochromocytome'], ['myélo lipome', 'myélolipome'],
    ['virsung', 'Wirsung'], ['vir sung', 'Wirsung'], ['wir sung', 'Wirsung'], ['wirsung', 'Wirsung'],
    ['cholé doc', 'cholédoque'], ['cholédoc', 'cholédoque'], ['colédoque', 'cholédoque'], ['cholé doque', 'cholédoque'],
    ['sterco lithe', 'stercolithe'], ['appendico lithe', 'appendicolithe'], ['fécal ome', 'fécalome'],
    ['aéro portie', 'aéroportie'], ['aéro bilie', 'aérobilie'], ['hydro aérique', 'hydro-aérique'], ['hydro aériques', 'hydro-aériques'],
    ['pyélo calicielle', 'pyélocalicielle'], ['pyélo calicielles', 'pyélocalicielles'], ['pièlo calicielle', 'pyélocalicielle'],
    ['urétéro hydronéphrose', 'urétéro-hydronéphrose'], ['cortico médullaire', 'cortico-médullaire'],
    ['angio myolipome', 'angiomyolipome'], ['angio myo lipome', 'angiomyolipome'],
    ['leuco araïose', 'leucoaraïose'], ['leucoaraïose', 'leucoaraïose'],
    ['cortico sous cortical', 'cortico-sous-cortical'], ['cortico sous corticale', 'cortico-sous-corticale'],
    ['sous dural', 'sous-dural'], ['sous durale', 'sous-durale'], ['sous duraux', 'sous-duraux'],
    ['sous arachnoïdien', 'sous-arachnoïdien'], ['sous arachnoïdienne', 'sous-arachnoïdienne'],
    ['sus tentoriel', 'sus-tentoriel'], ['sus tentorielle', 'sus-tentorielle'], ['sous tentoriel', 'sous-tentoriel'], ['sous tentorielle', 'sous-tentorielle'],
    ['sous capsulaire', 'sous-capsulaire'], ['sous diaphragmatique', 'sous-diaphragmatique'], ['sous mésocolique', 'sous-mésocolique'],
    ['sus mésocolique', 'sus-mésocolique'], ['sous cutané', 'sous-cutané'], ['sous cutanée', 'sous-cutanée'], ['sous pleural', 'sous-pleural'],
    ['sous pleurale', 'sous-pleurale'], ['sous segmentaire', 'sous-segmentaire'], ['sous carénaire', 'sous-carénaire'],
    ['sus claviculaire', 'sus-claviculaire'], ['sous claviculaire', 'sous-claviculaire'], ['sous muqueuse', 'sous-muqueuse'],
    ['centro lobulaire', 'centrolobulaire'], ['centro lobulaires', 'centrolobulaires'], ['para septal', 'paraseptal'],
    ['bronche ectasie', 'bronchectasie'], ['bronche ectasies', 'bronchectasies'], ['athélectasie', 'atélectasie'],
    ['unco disc arthrose', 'uncodiscarthrose'], ['unco discarthrose', 'uncodiscarthrose'], ['unco disque arthrose', 'uncodiscarthrose'],
    ['antéro listhésis', 'antérolisthésis'], ['gon arthrose', 'gonarthrose'], ['cox arthrose', 'coxarthrose'], ['coxa arthrose', 'coxarthrose'],
    ['enthéso pathie', 'enthésopathie'], ['syndesmo phyte', 'syndesmophyte'], ['syndesmo phytes', 'syndesmophytes'],
    ['arachnoïdo cèle', 'arachnoïdocèle'], ['méningo cèle', 'méningocèle'],
  ],

  /* Expressions corrigées en contexte, APRÈS les remplacements ci-dessus
     (ex. « centri pète en mode » → « centripète » puis « centripète en mottes ») */
  expressions: [
    ['centripète en mode', 'centripète en mottes'], ['centripète en modes', 'centripète en mottes'], ['centripète en motte', 'centripète en mottes'],
    ['rehaussement en mode', 'rehaussement en mottes'], ['prise de contraste en mode', 'prise de contraste en mottes'],
    ['périphérique en mode', 'périphérique en mottes'], ['nodulaire en mode', 'nodulaire en mottes'], ['en motte', 'en mottes'],
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

  /* Remplacements avancés : [motif, drapeaux, remplacement] — appliqués après les remplacements simples */
  regles: [
    // « hypo dense », « hippo dense », « iso signal », « hyper échogène »… → hypodense, isosignal, hyperéchogène
    [`(?<![\\p{L}])(hypo|hyper|iso|hippo|ipo|hyppo)[\\s-]+(denses?|danses?|dances?|densités?|signal|signaux|intenses?|intensités?|[ée]chog[èe]nes?|[ée]chog[ée]nicité|vasculaires?|vascularisée?s?|vascularisation|atténuante?s?|métaboliques?|fixante?s?|fixation|perfusée?s?|perfusion)(?![\\p{L}])`, 'giu',
      (m, p, x) => {
        const pre = /^(hippo|ipo|hyppo)$/i.test(p) ? 'hypo' : p.toLowerCase();
        const suf = x.toLowerCase().replace(/^d[ae]n[cs]e/, 'dense').replace(/^[ée]chog[èe]ne/, 'échogène').replace(/^[ée]chog[ée]nicit/, 'échogénicit');
        return (p[0] === p[0].toUpperCase() ? pre[0].toUpperCase() + pre.slice(1) : pre) + suf;
      }],
    // préfixes savants soudés : « ostéo phytes », « micro nodules », « hépato mégalie », « pneumo péritoine »…
    [`(?<![\\p{L}])(ost[ée]o|ad[ée]no|h[ée]pato|spl[ée]no|chol[ée]|leuco|pneumo|h[ée]mo|hydro|endo|broncho|angio|micro|my[ée]lo|n[ée]phro|uro|chondro|spondylo|disco|ent[ée]ro)\\s+(phytes?|pathies?|m[ée]galies?|lyses?|n[ée]croses?|n[ée]phroses?|c[ée]phalie|p[ée]ritoine|thorax|m[ée]diastin|condensations?|condensante?s?|porose|scl[ée]rose|carcinomes?|myose|c[èe]les?|myolipomes?|grammes?|graphie|ectasies?|lithiases?|lithes?|cystites?|kystes?|nodules?|nodulaires?|calcifications?|calcinose|scanner|my[ée]lite|discite|listh[ée]sis|arthrose|m[ée]trioses?|m[ée]triomes?|proth[èe]ses?|fuites?|salpinx|stase|chondrites?|chondromes?|vasculaires?|biliaires?|spl[ée]nom[ée]galie|anévrismes?|bulles?)(?![\\p{L}])`, 'giu',
      (m, p, x) => {
        const acc = { osteo: 'ostéo', adeno: 'adéno', hepato: 'hépato', spleno: 'spléno', chole: 'cholé', hemo: 'hémo', myelo: 'myélo', nephro: 'néphro', entero: 'entéro' };
        const k = p.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const pre = acc[k] || p.toLowerCase();
        return (p[0] === p[0].toUpperCase() ? pre[0].toUpperCase() + pre.slice(1) : pre) + x.toLowerCase();
      }],
    // intra / extra / inter / rétro / péri / infra / supra / trans + adjectif : soudé, ou trait d'union devant une voyelle
    [`(?<![\\p{L}])(intra|extra|inter|r[ée]tro|p[ée]ri|infra|supra|trans)\\s+(?!(?:de|du|des|la|le|les|et|ou|en|au|aux|un|une|par|sur|sous)(?![\\p{L}]))(\\p{L}{3,})`, 'giu',
      (m, p, x) => {
        const pre = p.toLowerCase().replace(/^retro$/, 'rétro').replace(/^peri$/, 'péri');
        const P = p[0] === p[0].toUpperCase() ? pre[0].toUpperCase() + pre.slice(1) : pre;
        return /^[aeiouyàâéèêëîïôöùûü]/i.test(x) ? `${P}-${x}` : P + x;
      }],
    // adjectifs anatomiques composés : « lombo sacré » → lombo-sacré, « sacro iliaques » → sacro-iliaques…
    [`(?<![\\p{L}])(lombo|sacro|gl[ée]no|f[ée]moro|acromio|coraco|v[ée]sico|abdomino|thoraco|cervico|dorso|tibio|ilio|costo|sterno|calcan[ée]o|talo|scapho|m[ée]tacarpo|m[ée]tatarso)\\s+(\\p{L}{3,})`, 'giu', (m, p, x) => `${p}-${x}`],

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
