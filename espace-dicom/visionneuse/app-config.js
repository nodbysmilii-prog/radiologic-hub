/* =========================================================
   Configuration d'OHIF pour l'Espace DICOM de RadiologicHub.
   • Mode démonstration : source « dicomjson » — la page de l'Espace
     DICOM fournit la liste des images d'un examen gardé dans le
     navigateur (adresses blob: du même site, voir le correctif
     « blob-meme-origine » de installer-ohif.js).
   • En service (étape 3) : source DICOMweb du serveur de l'Espace DICOM,
     avec le jeton de session — ajoutée à la mise en service.
   Interface en français, sans liste d'études d'OHIF.
   ========================================================= */
window.config = {
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
