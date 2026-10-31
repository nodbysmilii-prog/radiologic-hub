/* =========================================================
   RadiologicHub — assistant documentaire : dictionnaire des termes qui
   font reconnaître une fiche rapide dans le texte d'un compte rendu.
   ---------------------------------------------------------
   Clé = identifiant de la fiche (nom du fichier fiches/<id>.html).
   • forts   : un seul suffit pour proposer la fiche ;
   • faibles : mots plus généraux, il en faut au moins deux différents
               (ou un terme fort) pour proposer la fiche.
   Règles d'écriture :
   • accents, majuscules, tirets et ponctuation sont ignorés à la comparaison
     (« pancréatite aiguë » = « PANCREATITE AIGUE » = « pancréatite-aiguë ») ;
     le pluriel en -s aussi (« colites » = « colite ») ;
   • un sigle écrit EN MAJUSCULES de 4 lettres au plus (« RCH », « SEP »)
     n'est reconnu qu'en majuscules dans le compte rendu (pas de faux positif
     sur un mot courant) ; pour l'accepter aussi en minuscules, l'ajouter
     une seconde fois en minuscules ;
   • la comparaison se fait mot entier (« colite » ne reconnaît pas « colitis »).
   N'ajouter un terme que si la fiche existe (une clé sans fiche dans
   l'index est ignorée) et qu'il désigne bien son sujet.
   Exemple prêt pour une future fiche du carcinome hépatocellulaire :
     'carcinome-hepatocellulaire': { forts: ['CHC', 'carcinome hépatocellulaire',
       'hépatocarcinome', 'LI-RADS', 'LIRADS'] },
   ========================================================= */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.RHAssistant = root.RHAssistant || {}).synonymes = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  return {
    'colites': { forts: ['colite', 'pancolite', 'rectocolite hémorragique', 'RCH', 'mégacôlon toxique', 'typhlite', 'colite pseudomembraneuse', 'colite ischémique', 'colite infectieuse'] },
    'occlusion-intestinale': { forts: ['occlusion intestinale', 'occlusion du grêle', 'occlusion colique', 'syndrome occlusif', 'volvulus', 'iléus biliaire', 'feces sign', 'strangulation'], faibles: ['occlusion', 'bride', 'niveaux hydro-aériques', 'distension', 'invagination'] },
    'masses-hepatiques': { forts: ['masse hépatique', 'masses hépatiques', 'lésion hépatique', 'nodule hépatique', 'hémangiome hépatique', 'hyperplasie nodulaire focale', 'HNF', 'adénome hépatocellulaire', 'carcinome hépatocellulaire', 'hépatocarcinome', 'CHC', 'LI-RADS', 'LIRADS', 'cholangiocarcinome', 'Klatskin', 'Bismuth', 'métastases hépatiques'], faibles: ['foie', 'wash-out', 'hépatique', 'cirrhose'] },
    'pancreatite-aigue': { forts: ['pancréatite', 'pancréatite aiguë', 'CTSI', 'Balthazar', 'Atlanta', 'coulée de nécrose', 'nécrose pancréatique', 'collection nécrotique'], faibles: ['nécrose', 'collection', 'pancréas'] },
    'ischemie-mesenterique': { forts: ['ischémie mésentérique', 'infarctus mésentérique', 'aéroportie', 'pneumatose pariétale', 'pneumatose intestinale'], faibles: ['pneumatose', 'embolie', 'thrombose', 'ischémie'] },
    'adenocarcinome-pancreas': { forts: ['adénocarcinome pancréatique', 'adénocarcinome du pancréas', 'adénocarcinome canalaire', 'cancer du pancréas', 'tumeur du pancréas', 'résécabilité', 'signe du double canal'], faibles: ['borderline', 'adénocarcinome', 'pancréas', 'engainement', 'résécable'] },
    'maladie-de-crohn': { forts: ['Crohn', 'crohn', 'entéro-IRM', 'entéro-scanner', 'sclérolipomatose'], faibles: ['iléite', 'fistule', 'sténose', 'iléon terminal'] },
    'irm-cancer-rectum': { forts: ['cancer du rectum', 'adénocarcinome rectal', 'adénocarcinome du rectum', 'tumeur du rectum', 'tumeur rectale', 'mésorectum', 'fascia recti', 'EMVI', 'mrTRG'], faibles: ['rectum', 'CRM', 'TRG', 'marge circonférentielle'] },
    'irm-prostate-diagnostic': { forts: ['PI-RADS', 'PIRADS', 'pirads', 'pi-rads', 'PI-QUAL', 'cancer de la prostate', 'adénocarcinome prostatique'], faibles: ['prostate', 'zone périphérique', 'zone de transition', 'PSA'] },
    'irm-prostate-extension': { forts: ['extension extracapsulaire', 'franchissement capsulaire', 'envahissement des vésicules séminales', 'bilan d\'extension prostatique'], faibles: ['prostate', 'vésicules séminales', 'T3a', 'T3b', 'capsule'] },
    'masses-renales-kystiques': { forts: ['Bosniak', 'kyste rénal', 'kystes rénaux', 'masse rénale kystique', 'masse kystique rénale'], faibles: ['kyste', 'rein', 'cloisons', 'hyperdense'] },
    'myome-uterin': { forts: ['myome', 'fibrome utérin', 'léiomyome', 'léiomyosarcome'], faibles: ['FIGO', 'utérus', 'dégénérescence', 'sarcome'] },
    'irm-myocardite': { forts: ['myocardite', 'Lake Louise', 'rehaussement tardif myocardique'], faibles: ['myocarde', 'rehaussement tardif', 'ECV', 'péricarde'] },
    'spondylodiscite': { forts: ['spondylodiscite', 'spondylite', 'mal de Pott', 'Pott', 'épidurite'], faibles: ['disque', 'abcès', 'brucellose', 'hydatidose', 'plateaux vertébraux'] },
    'avc-ischemique': { forts: ['AVC ischémique', 'accident vasculaire cérébral ischémique', 'infarctus cérébral', 'ischémie cérébrale', 'pénombre', 'mismatch', 'ASPECTS', 'lacune'], faibles: ['thrombus', 'AVC', 'avc', 'ischémie', 'occlusion artérielle', 'diffusion'] },
    'avc-hemorragique': { forts: ['AVC hémorragique', 'hématome intraparenchymateux', 'hématome cérébral', 'hémorragie intracérébrale', 'hémorragie cérébrale', 'angiopathie amyloïde', 'cavernome', 'malformation artério-veineuse'], faibles: ['hématome', 'hémorragie', 'AVC', 'avc', 'MAV'] },
    'sclerose-en-plaques': { forts: ['sclérose en plaques', 'SEP', 'McDonald', 'démyélinisation', 'lésions démyélinisantes', 'plaques de démyélinisation'], faibles: ['dissémination', 'plaques', 'substance blanche'] },
    'nodule-pulmonaire': { forts: ['nodule pulmonaire', 'Fleischner', 'nodule en verre dépoli', 'nodule solide', 'nodule part-solide', 'nodule subsolide', 'micronodule'], faibles: ['nodule', 'verre dépoli', 'poumon', 'TEP'] },
    'masses-mediastinales': { forts: ['masse médiastinale', 'masses médiastinales', 'médiastin antérieur', 'médiastin moyen', 'médiastin postérieur', 'thymome', 'tératome', 'goitre plongeant', 'Felson'], faibles: ['médiastin', 'lymphome', 'goitre', 'thymus'] },
    'amylose-thoracique': { forts: ['amylose', 'amyloïde', 'amylose trachéobronchique'] },
    'fractures-radius-distal': { forts: ['radius distal', 'fracture du radius', 'extrémité distale du radius', 'Pouteau-Colles', 'Goyrand-Smith', 'Barton', 'Hutchinson', 'inclinaison radiale'], faibles: ['radius', 'poignet', 'bascule', 'fracture'] },
    'cancer-du-cavum': { forts: ['cavum', 'cancer du cavum', 'nasopharynx', 'UCNT', 'fossette de Rosenmüller', 'Rosenmüller'], faibles: ['EBV', 'rhinopharynx'] },
    'cholesteatome': { forts: ['cholestéatome', 'diffusion non-EPI', 'non-EPI', 'labyrinthite'], faibles: ['otite', 'oreille moyenne', 'osselets', 'attique'] },
    'eu-tirads': { forts: ['EU-TIRADS', 'TIRADS', 'tirads', 'nodule thyroïdien', 'nodules thyroïdiens', 'cytoponction thyroïdienne'], faibles: ['thyroïde', 'cytoponction', 'lobe thyroïdien'] },
    'otospongiose': { forts: ['otospongiose', 'otosclérose', 'fissula ante fenestram', 'Veillon'], faibles: ['rocher', 'cochlée', 'fenêtre ovale', 'étrier'] },
    'tumeurs-glandes-salivaires': { forts: ['parotide', 'tumeur parotidienne', 'glande salivaire', 'glandes salivaires', 'adénome pléomorphe', 'Warthin', 'glande sous-mandibulaire'], faibles: ['salivaire', 'parotidien', 'sous-mandibulaire'] },
  };
});
