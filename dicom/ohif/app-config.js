/* =========================================================
   Configuration d'OHIF pour l'Espace DICOM de RadiologicHub.
   • Mode démonstration : source « dicomjson » — la page de l'Espace
     DICOM fournit la liste des images d'un examen gardé dans le
     navigateur (adresses blob: du même site, voir le correctif
     « blob-meme-origine » de installer-ohif.js).
   • En service (étape 3) : source DICOMweb du serveur de l'Espace DICOM,
     avec le jeton de session — ajoutée à la mise en service.
   Interface en français, sans liste d'études d'OHIF.
   • La configuration est donnée sous forme de fonction (prévu par OHIF :
     appInit reçoit alors les services) : elle garde servicesManager dans
     window.RH_OHIF, pour les outils de l'Espace DICOM (courbe de
     perfusion) affichés à côté des images. Les réglages restent aussi
     lisibles comme propriétés (window.config.dataSources…).
   ========================================================= */
var RH_CONFIG = {
  name: 'espace-dicom',
  routerBasename: window.RH_OHIF_BASE.replace(/\/$/, ''),
  extensions: [],
  modes: [],
  customizationService: {},
  showStudyList: false,
  maxNumberOfWebWorkers: 3,
  showWarningMessageForCrossOrigin: false,
  showCPUFallbackMessage: true,
  showLoadingIndicator: true,
  strictZSpacingForVolumeViewport: true,
  investigationalUseDialog: { option: 'never' },
  // Mesures suivies d'office, sans la question « Suivre les mesures ? » (elle masquait le lecteur des phases des séries dynamiques)
  measurementTrackingMode: 'simplified',
  maxNumRequests: { interaction: 100, thumbnail: 5, prefetch: 10 },
  showErrorDetails: 'production',
  whiteLabeling: {
    createLogoComponentFn: function (React) {
      return React.createElement('span', {
        style: { color: '#fff', font: '800 15px/1 Montserrat, system-ui, sans-serif', letterSpacing: '.04em', whiteSpace: 'nowrap' },
      }, 'Espace DICOM');
    },
  },
  defaultDataSourceName: 'dicomjson',
  dataSources: [
    {
      namespace: '@ohif/extension-default.dataSourcesModule.dicomjson',
      sourceName: 'dicomjson',
      configuration: { friendlyName: 'Espace DICOM (démonstration)', name: 'json' },
    },
  ],
};

window.RH_OHIF = { pret: false };
window.config = function (contexte) {
  window.RH_OHIF.servicesManager = contexte.servicesManager;
  window.RH_OHIF.pret = true;
  return RH_CONFIG;
};
// Réglages aussi lisibles comme propriétés (« name » et « length » d'une fonction ne s'écrivent pas)
Object.keys(RH_CONFIG).forEach(function (cle) { if (cle !== 'name' && cle !== 'length') window.config[cle] = RH_CONFIG[cle]; });
