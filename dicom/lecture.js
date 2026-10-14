/* =========================================================
   Espace DICOM — lecture des en-têtes DICOM (navigateur et Node), avec
   dcmjs (vendor/dcmjs-0.52.0, licence MIT). Les images ne sont pas
   décodées ici : seulement l'en-tête, pour regrouper les fichiers par
   examen et préparer la visionneuse.
   ========================================================= */
(function (racine) {
  'use strict';

  const DICOMDIR = '1.2.840.10008.1.3.10';
  const MOT_CLE = /^[A-Za-z][A-Za-z0-9]*$/;

  // « DICM » à l'octet 128 (fichier DICOM Part 10)
  const estDicom = premiers => premiers.length >= 132 && premiers[128] === 0x44 && premiers[129] === 0x49 && premiers[130] === 0x43 && premiers[131] === 0x4d;

  // Retire les données binaires (pixels, overlays, données privées) : seules les valeurs utiles à l'affichage restent
  function nettoyer(v) {
    if (v === null || v === undefined) return v;
    if (v instanceof ArrayBuffer || ArrayBuffer.isView(v)) return undefined;
    if (Array.isArray(v)) {
      const l = v.map(nettoyer).filter(x => x !== undefined);
      return l;
    }
    if (typeof v === 'object') {
      if ('InlineBinary' in v || 'BulkDataURI' in v) return undefined;
      const o = {};
      for (const [k, x] of Object.entries(v)) {
        if (k === '_vrMap' || k === 'PixelData' || !MOT_CLE.test(k)) continue;
        const n = nettoyer(x);
        if (n !== undefined) o[k] = n;
      }
      return o;
    }
    return v;
  }

  /* lireEntete(dcmjs, arrayBuffer) → { metadata, syntaxe, classe } (lève une erreur si le fichier est illisible) */
  function lireEntete(dcmjs, tampon) {
    const d = dcmjs.data.DicomMessage.readFile(tampon, { untilTag: '7FE00010', includeUntilTagValue: false });
    const metadata = nettoyer(dcmjs.data.DicomMetaDictionary.naturalizeDataset(d.dict));
    const valeur = t => (d.meta[t] && d.meta[t].Value && d.meta[t].Value[0]) || '';
    return { metadata, syntaxe: valeur('00020010'), classe: valeur('00020002') || metadata.SOPClassUID || '' };
  }

  function nomPatient(pn) {
    let v = pn;
    if (Array.isArray(v)) v = v[0];
    if (v && typeof v === 'object') v = v.Alphabetic || v.Ideographic || v.Phonetic || '';
    return String(v || '').replace(/\^+/g, ' ').trim();
  }

  const premier = v => (Array.isArray(v) ? v[0] : v);

  /* resume(metadata, classe) → ce qu'il faut pour regrouper et lister (rien n'est envoyé) */
  function resume(m, classe = '') {
    return {
      etudeUid: String(m.StudyInstanceUID || ''),
      serieUid: String(m.SeriesInstanceUID || ''),
      sopUid: String(m.SOPInstanceUID || ''),
      classe: String(classe || m.SOPClassUID || ''),
      dicomdir: (classe || m.SOPClassUID) === DICOMDIR,
      patientNom: nomPatient(m.PatientName),
      patientId: String(premier(m.PatientID) || ''),
      date: String(m.StudyDate || ''),
      heure: String(m.StudyTime || ''),
      description: String(m.StudyDescription || ''),
      modalite: String(m.Modality || ''),
      images: Number(m.NumberOfFrames) || 1,
      anonymise: String(premier(m.PatientIdentityRemoved) || '').toUpperCase() === 'YES',
    };
  }

  const formaterDate = da => (/^\d{8}$/.test(da || '') ? `${da.slice(6, 8)}/${da.slice(4, 6)}/${da.slice(0, 4)}` : '');

  /* regrouper([{ resume, taille }]) → examens (le plus récent en premier) */
  function regrouper(fichiers) {
    const parEtude = new Map();
    for (const { resume: r, taille = 0 } of fichiers) {
      if (!r.etudeUid || !r.sopUid || r.dicomdir) continue;
      let e = parEtude.get(r.etudeUid);
      if (!e) {
        e = { etudeUid: r.etudeUid, patientNom: r.patientNom, patientId: r.patientId, date: r.date, heure: r.heure, description: r.description,
          modalites: [], series: new Set(), sop: new Set(), nbInstances: 0, nbImages: 0, taille: 0, anonymise: true };
        parEtude.set(r.etudeUid, e);
      }
      if (e.sop.has(r.sopUid)) continue;          // même image en double (CD copié deux fois…)
      e.sop.add(r.sopUid);
      e.series.add(r.serieUid);
      if (r.modalite && !e.modalites.includes(r.modalite)) e.modalites.push(r.modalite);
      e.nbInstances++;
      e.nbImages += r.images;
      e.taille += taille;
      e.anonymise = e.anonymise && r.anonymise;
    }
    return [...parEtude.values()].map(e => ({ ...e, nbSeries: e.series.size, series: undefined, sop: undefined }))
      .sort((a, b) => (b.date + b.heure).localeCompare(a.date + a.heure));
  }

  const api = { estDicom, lireEntete, nettoyer, nomPatient, resume, regrouper, formaterDate, DICOMDIR };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else racine.RHDicomLecture = api;
})(typeof self !== 'undefined' ? self : globalThis);
