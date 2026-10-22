/* =========================================================
   Espace DICOM — MODE DÉMONSTRATION : examens gardés dans CE navigateur
   (IndexedDB). Rien n'est envoyé à un serveur. Chaque examen peut être
   supprimé (bouton « Supprimer » ou « Tout supprimer »).
   En service, ce module est remplacé par l'envoi au serveur de
   l'Espace DICOM (étape 2) : même interface pour la page.
   Bases : examens (résumé), instances (en-tête + fichier), comptesRendus.
   ========================================================= */
(function (racine) {
  'use strict';

  const NOM = 'rh-espace-dicom-demo';
  const VERSION = 1;
  let base = null;

  function ouvrir() {
    if (!base) {
      base = new Promise((ok, ko) => {
        if (!racine.indexedDB) return ko(new Error('Ce navigateur ne permet pas de garder des fichiers (IndexedDB indisponible, navigation privée ?).'));
        const r = racine.indexedDB.open(NOM, VERSION);
        r.onupgradeneeded = () => {
          const db = r.result;
          if (!db.objectStoreNames.contains('examens')) db.createObjectStore('examens', { keyPath: 'etudeUid' });
          if (!db.objectStoreNames.contains('instances')) db.createObjectStore('instances', { keyPath: 'sopUid' }).createIndex('etude', 'etudeUid');
          if (!db.objectStoreNames.contains('comptesRendus')) db.createObjectStore('comptesRendus', { keyPath: 'etudeUid' });
        };
        r.onsuccess = () => ok(r.result);
        r.onerror = () => ko(r.error);
        r.onblocked = () => ko(new Error('Base de démonstration bloquée par un autre onglet : fermez-le et réessayez.'));
      });
      base.catch(() => { base = null; });
    }
    return base;
  }

  const requete = r => new Promise((ok, ko) => { r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error); });
  const terminee = tx => new Promise((ok, ko) => {
    tx.oncomplete = () => ok();
    tx.onerror = () => ko(tx.error);
    tx.onabort = () => ko(tx.error || new Error('enregistrement annulé'));
  });

  async function examens() {
    const db = await ouvrir();
    const liste = await requete(db.transaction('examens').objectStore('examens').getAll());
    return liste.sort((a, b) => (b.importeLe || '').localeCompare(a.importeLe || ''));
  }

  async function examen(etudeUid) {
    const db = await ouvrir();
    return requete(db.transaction('examens').objectStore('examens').get(etudeUid));
  }

  async function instancesEtude(etudeUid) {
    const db = await ouvrir();
    return requete(db.transaction('instances').objectStore('instances').index('etude').getAll(etudeUid));
  }

  // Images déjà gardées (reprise d'un import interrompu, CD importé deux fois)
  async function presents(sopUids) {
    const db = await ouvrir();
    const st = db.transaction('instances').objectStore('instances');
    const deja = new Set();
    await Promise.all(sopUids.map(async s => { if (await requete(st.getKey(s)) !== undefined) deja.add(s); }));
    return deja;
  }

  /* enregistrerLot(resumeExamen, [{ sopUid, serieUid, metadata, fichier: Blob, taille }])
     — une transaction par lot : un lot interrompu n'est pas à moitié écrit */
  async function enregistrerLot(resumeExamen, lot) {
    const db = await ouvrir();
    const tx = db.transaction(['examens', 'instances'], 'readwrite');
    const stE = tx.objectStore('examens'), stI = tx.objectStore('instances');
    const actuel = (await requete(stE.get(resumeExamen.etudeUid))) || {
      etudeUid: resumeExamen.etudeUid, patientNom: resumeExamen.patientNom, patientId: resumeExamen.patientId, date: resumeExamen.date,
      heure: resumeExamen.heure, description: resumeExamen.description, modalites: [], series: [], nbInstances: 0, taille: 0,
      anonymise: true, importeLe: new Date().toISOString(),
    };
    for (const i of lot) {
      stI.put({ sopUid: i.sopUid, etudeUid: resumeExamen.etudeUid, serieUid: i.serieUid, metadata: i.metadata, fichier: i.fichier, taille: i.taille });
      actuel.nbInstances++;
      actuel.taille += i.taille;
      if (!actuel.series.includes(i.serieUid)) actuel.series.push(i.serieUid);
      const mod = i.metadata.Modality;
      if (mod && !actuel.modalites.includes(mod)) actuel.modalites.push(mod);
      actuel.anonymise = actuel.anonymise && String(i.metadata.PatientIdentityRemoved || '').toUpperCase() === 'YES';
    }
    actuel.majLe = new Date().toISOString();
    stE.put(actuel);
    await terminee(tx);
    return actuel;
  }

  async function supprimer(etudeUid) {
    const db = await ouvrir();
    const tx = db.transaction(['examens', 'instances', 'comptesRendus'], 'readwrite');
    tx.objectStore('examens').delete(etudeUid);
    tx.objectStore('comptesRendus').delete(etudeUid);
    const index = tx.objectStore('instances').index('etude');
    const cles = await requete(index.getAllKeys(etudeUid));
    for (const c of cles) tx.objectStore('instances').delete(c);
    await terminee(tx);
  }

  async function toutSupprimer() {
    const db = await ouvrir();
    const tx = db.transaction(['examens', 'instances', 'comptesRendus'], 'readwrite');
    for (const s of ['examens', 'instances', 'comptesRendus']) tx.objectStore(s).clear();
    await terminee(tx);
  }

  async function compteRendu(etudeUid) {
    const db = await ouvrir();
    return requete(db.transaction('comptesRendus').objectStore('comptesRendus').get(etudeUid));
  }

  async function enregistrerCompteRendu(etudeUid, texte) {
    const db = await ouvrir();
    const tx = db.transaction('comptesRendus', 'readwrite');
    const cr = { etudeUid, texte: String(texte || '').slice(0, 20000), majLe: new Date().toISOString() };
    tx.objectStore('comptesRendus').put(cr);
    await terminee(tx);
    return cr;
  }

  async function espace() {
    try { return racine.navigator && navigator.storage && navigator.storage.estimate ? await navigator.storage.estimate() : null; } catch { return null; }
  }

  racine.RHDicomStockage = { mode: 'demo', examens, examen, instancesEtude, presents, enregistrerLot, supprimer, toutSupprimer, compteRendu, enregistrerCompteRendu, espace };
})(typeof self !== 'undefined' ? self : globalThis);
