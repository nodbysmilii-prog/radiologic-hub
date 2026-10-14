/* =========================================================
   Espace DICOM — liste des images d'un examen pour la visionneuse OHIF
   (format « DICOM JSON » de sa source dicomjson). En démonstration,
   chaque image a une adresse blob: du même site, créée par la page de
   la visionneuse à partir des fichiers gardés dans le navigateur.
   ========================================================= */
(function (racine) {
  'use strict';

  const nombre = v => { const n = Number(Array.isArray(v) ? v[0] : v); return Number.isFinite(n) ? n : 0; };
  const nomPatient = v => {
    let x = Array.isArray(v) ? v[0] : v;
    if (x && typeof x === 'object') x = x.Alphabetic || '';
    return String(x || '');
  };

  /* construireManifeste(instances, urlDe) → { studies: [...] }
     instances : [{ sopUid, metadata }] d'un même examen ; urlDe(sopUid) → adresse du fichier */
  function construireManifeste(instances, urlDe) {
    if (!instances.length) throw new Error('examen sans image');
    const m0 = instances[0].metadata;
    const series = new Map();
    for (const i of instances) {
      const m = i.metadata;
      let s = series.get(m.SeriesInstanceUID);
      if (!s) {
        s = { SeriesInstanceUID: m.SeriesInstanceUID, SeriesDescription: m.SeriesDescription || '', SeriesNumber: nombre(m.SeriesNumber),
          Modality: m.Modality || '', SeriesDate: m.SeriesDate || '', SeriesTime: m.SeriesTime || '', instances: [] };
        series.set(m.SeriesInstanceUID, s);
      }
      s.instances.push({ metadata: m, url: 'dicomweb:' + urlDe(i.sopUid) });
    }
    const liste = [...series.values()].sort((a, b) => a.SeriesNumber - b.SeriesNumber);
    for (const s of liste) s.instances.sort((a, b) => nombre(a.metadata.InstanceNumber) - nombre(b.metadata.InstanceNumber));
    const modalites = [...new Set(liste.map(s => s.Modality).filter(Boolean))];
    return {
      studies: [{
        StudyInstanceUID: m0.StudyInstanceUID,
        StudyDate: m0.StudyDate || '',
        StudyTime: m0.StudyTime || '',
        PatientName: nomPatient(m0.PatientName),
        PatientID: String(m0.PatientID || ''),
        AccessionNumber: String(m0.AccessionNumber || ''),
        StudyDescription: m0.StudyDescription || '',
        Modalities: modalites.join('\\'),
        NumInstances: instances.length,
        series: liste,
      }],
    };
  }

  const api = { construireManifeste };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else racine.RHDicomManifeste = api;
})(typeof self !== 'undefined' ? self : globalThis);
