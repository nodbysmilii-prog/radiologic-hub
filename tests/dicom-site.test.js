/* Tests de l'Espace DICOM côté site (mode démonstration) : scanner et
   perfusion IRM de test synthétiques, lecture des en-têtes, regroupement par
   examen, archives .zip, liste des images pour OHIF, courbe de perfusion,
   installation d'OHIF, pages. Données synthétiques uniquement. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');
const dcmjs = require('../vendor/dcmjs-0.52.0/dcmjs.min.js');
const G = require('../dicom/generateur.js');
const L = require('../dicom/lecture.js');
const Z = require('../dicom/zip.js');
const M = require('../dicom/manifeste.js');
const P = require('../dicom/perfusion.js');
const I = require('../espace-dicom/visionneuse/installer-ohif.js');
const outil = require('../espace-dicom/outils/generer-dicom-test.js');

dcmjs.log.setLevel('error');
const RACINE = path.join(__dirname, '..');
const tampon = o => o.buffer.slice(o.byteOffset, o.byteOffset + o.byteLength);
const UID = /^2\.25\.[1-9][0-9]{0,38}$/;

test('scanner de test : fichiers DICOM valides, synthétiques et marqués « identité retirée »', () => {
  const r = G.genererEtude({ coupes: 6, taille: 64, graine: 3, date: '20261014' });
  assert.equal(r.instances.length, 6);
  assert.match(r.etudeUid, UID); assert.match(r.serieUid, UID);
  assert.equal(new Set(r.instances.map(i => i.sopUid)).size, 6, 'UID uniques');
  for (const [k, i] of r.instances.entries()) {
    assert.ok(L.estDicom(i.octets.subarray(0, 132)));
    const d = dcmjs.data.DicomMessage.readFile(tampon(i.octets));
    const m = dcmjs.data.DicomMetaDictionary.naturalizeDataset(d.dict);
    assert.equal(m.PatientName[0].Alphabetic, 'TEST^SYNTHETIQUE');
    assert.equal(m.PatientIdentityRemoved, 'YES');
    assert.equal(m.StudyDate, '20261014');
    assert.equal(m.InstanceNumber, k + 1);
    assert.deepEqual([m.Rows, m.Columns, m.BitsStored, m.RescaleIntercept], [64, 64, 12, -1024]);
    assert.deepEqual(new Uint16Array(m.PixelData[0]), G.pixelsCoupe(k, 6, 64, 3), 'pixels du fantôme');
  }
  assert.equal(outil.pixelsCoupe, G.pixelsCoupe, 'l\'outil Node du serveur utilise le même générateur');
});

test('lecture des en-têtes : résumé, données binaires retirées, DICOMDIR reconnu', () => {
  const r = G.genererEtude({ coupes: 2, taille: 32, date: '20260101' });
  const lu = L.lireEntete(dcmjs, tampon(r.instances[0].octets));
  assert.equal(lu.syntaxe, '1.2.840.10008.1.2.1');
  assert.equal(lu.metadata.PixelData, undefined);
  assert.equal(lu.metadata._vrMap, undefined);
  assert.ok(Object.keys(lu.metadata).every(k => /^[A-Za-z]/.test(k)), 'pas de balise privée en hexadécimal');
  const s = L.resume(lu.metadata, lu.classe);
  assert.deepEqual({ ...s, etudeUid: !!s.etudeUid, serieUid: !!s.serieUid, sopUid: !!s.sopUid }, {
    etudeUid: true, serieUid: true, sopUid: true, classe: '1.2.840.10008.5.1.4.1.1.2', dicomdir: false, patientNom: 'TEST SYNTHETIQUE',
    patientId: 'RH-TEST-0001', date: '20260101', heure: '120000', description: 'TDM TEST SYNTHETIQUE', modalite: 'CT', images: 1, anonymise: true,
  });
  assert.deepEqual(L.nettoyer({ A: new ArrayBuffer(4), B: [1, new Uint8Array(2)], CSequence: [{ D: 'x', E: { InlineBinary: 'AA==' } }], '00091001': 'privé' }),
    { B: [1], CSequence: [{ D: 'x' }] });
  // Index de CD (DICOMDIR) : reconnu, jamais pris pour une image
  const { element, fichierDicom } = G.outils;
  const dicomdir = fichierDicom([element(0x0002, 0x0002, 'UI', L.DICOMDIR), element(0x0002, 0x0003, 'UI', '2.25.1'), element(0x0002, 0x0010, 'UI', '1.2.840.10008.1.2.1')],
    [element(0x0004, 0x1130, 'CS', 'CD TEST')]);
  const d = L.lireEntete(dcmjs, tampon(dicomdir));
  assert.equal(L.resume(d.metadata, d.classe).dicomdir, true);
  assert.equal(L.estDicom(new TextEncoder().encode('pas un fichier DICOM'.padEnd(140))), false);
  assert.equal(L.formaterDate('20261014'), '14/10/2026');
  assert.equal(L.nomPatient([{ Alphabetic: 'DUPONT^JEAN^^DR' }]), 'DUPONT JEAN DR');
});

test('regroupement par examen : doublons écartés, identité non retirée signalée', () => {
  const a = G.genererEtude({ coupes: 3, taille: 16, date: '20260101' });
  const b = G.genererEtude({ coupes: 2, taille: 16, date: '20261001' });
  const lire = i => ({ resume: L.resume(L.lireEntete(dcmjs, tampon(i.octets)).metadata), taille: i.octets.length });
  const fichiers = [...a.instances, ...b.instances, a.instances[0]].map(lire);
  fichiers[3].resume.anonymise = false;                       // un fichier de B non marqué
  const ex = L.regrouper(fichiers);
  assert.equal(ex.length, 2);
  assert.equal(ex[0].etudeUid, b.etudeUid, 'le plus récent en premier');
  assert.deepEqual([ex[0].nbInstances, ex[0].anonymise, ex[1].nbInstances, ex[1].anonymise], [2, false, 3, true]);
  assert.equal(ex[1].taille, a.instances.reduce((s, i) => s + i.octets.length, 0), 'le doublon ne compte pas');
});

test('archives .zip : écriture puis lecture, compressée ou non ; fichiers identiques', async () => {
  const r = G.genererEtude({ coupes: 3, taille: 64 });
  for (const compresser of [true, false]) {
    const zip = await Z.ecrireZip([...r.instances.map(i => ({ nom: `CD/IMAGES/${i.nom}`, octets: i.octets })), { nom: 'LISEZMOI.TXT', octets: new TextEncoder().encode('test') }], { compresser });
    const premiers = new Uint8Array(await zip.slice(0, 4).arrayBuffer());
    assert.ok(Z.estZip(premiers));
    const entrees = await Z.lireZip(zip);
    assert.deepEqual(entrees.map(e => e.nom), [...r.instances.map(i => `CD/IMAGES/${i.nom}`), 'LISEZMOI.TXT']);
    for (const [k, i] of r.instances.entries()) {
      assert.deepEqual(new Uint8Array(await (await entrees[k].ouvrir()).arrayBuffer()), i.octets);
    }
    if (compresser) assert.ok(zip.size < r.instances.reduce((s, i) => s + i.octets.length, 0) / 2, 'le fantôme se compresse bien');
  }
  await assert.rejects(Z.lireZip(new Blob([new Uint8Array(100)])), /illisible/);
});

test('archives .zip créées par d\'autres logiciels (zip, ZIP64)', async t => {
  if (spawnSync('zip', ['-v'], { stdio: 'ignore' }).status !== 0) return t.skip('commande zip absente');
  const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'rh-zip-'));
  try {
    const r = G.genererEtude({ coupes: 4, taille: 64 });
    fs.mkdirSync(path.join(dossier, 'CD', 'DICOM'), { recursive: true });
    r.instances.forEach(i => fs.writeFileSync(path.join(dossier, 'CD', 'DICOM', i.nom.replace('.dcm', '').toUpperCase()), i.octets));
    for (const options of [['-q', '-r'], ['-q', '-r', '-fz']]) {
      const archive = path.join(dossier, `cd${options.length}.zip`);
      execFileSync('zip', [...options, archive, 'CD'], { cwd: dossier });
      const entrees = await Z.lireZip(new Blob([fs.readFileSync(archive)]));
      assert.equal(entrees.length, 4, options.join(' '));
      assert.deepEqual(new Uint8Array(await (await entrees.find(e => e.nom.endsWith('COUPE-0002')).ouvrir()).arrayBuffer()), r.instances[1].octets);
    }
  } finally {
    fs.rmSync(dossier, { recursive: true, force: true });
  }
});

test('liste des images pour OHIF (dicomjson) : séries et coupes dans l\'ordre, adresses dicomweb:', () => {
  const r = G.genererEtude({ coupes: 4, taille: 16 });
  const instances = r.instances.map(i => ({ sopUid: i.sopUid, metadata: L.lireEntete(dcmjs, tampon(i.octets)).metadata })).reverse();
  const autre = { ...instances[0], sopUid: '2.25.9', metadata: { ...instances[0].metadata, SeriesInstanceUID: '2.25.8', SeriesNumber: 0, SOPInstanceUID: '2.25.9', Modality: 'SR' } };
  const m = M.construireManifeste([...instances, autre], sop => `blob:https://site.test/${sop}`);
  const e = m.studies[0];
  assert.equal(e.StudyInstanceUID, r.etudeUid);
  assert.equal(e.PatientName, 'TEST^SYNTHETIQUE');
  assert.equal(e.NumInstances, 5);
  assert.equal(e.Modalities, 'SR\\CT');
  assert.deepEqual(e.series.map(s => s.SeriesNumber), [0, 1]);
  assert.deepEqual(e.series[1].instances.map(i => i.metadata.InstanceNumber), [1, 2, 3, 4]);
  assert.equal(e.series[1].instances[0].url, `dicomweb:blob:https://site.test/${r.instances[0].sopUid}`);
  assert.throws(() => M.construireManifeste([], () => ''), /sans image/);
});

/* ---------- Courbe de perfusion ---------- */
const lirePerfusion = r => r.instances.map(i => {
  const d = dcmjs.data.DicomMessage.readFile(tampon(i.octets));
  return { id: i.sopUid, meta: L.lireEntete(dcmjs, tampon(i.octets)).metadata,
    pixels: new Uint16Array(dcmjs.data.DicomMetaDictionary.naturalizeDataset(d.dict).PixelData[0]) };
});

test('perfusion IRM de test : séries multiphases type GE (MR, TriggerTime, positions temporelles)', () => {
  const r = G.genererPerfusion({ coupes: 4, phases: 12, taille: 32, tr: 2, graine: 5, date: '20261014', heure: '235950' });
  assert.equal(r.instances.length, 48);
  assert.equal(new Set(r.instances.map(i => i.sopUid)).size, 48, 'UID uniques');
  const images = lirePerfusion(r);
  const m = images[4 * 3 + 2].meta;                       // phase 4, coupe 3
  assert.equal(m.SOPClassUID, '1.2.840.10008.5.1.4.1.1.4');
  assert.equal(m.Modality, 'MR');
  assert.equal(m.PatientIdentityRemoved, 'YES');
  assert.deepEqual([m.InstanceNumber, m.TemporalPositionIdentifier, m.NumberOfTemporalPositions], [15, 4, 12]);
  assert.equal(m.TriggerTime, 6000 + 1000, 'phase × TR + décalage de la coupe dans le TR (ms)');
  assert.equal(m.RepetitionTime, 2000);
  assert.equal(m.ScanningSequence, 'EP');
  assert.deepEqual(m.ImagePositionPatient, [-115, -115, 10]);
  assert.equal(new Set(images.map(i => i.meta.SeriesInstanceUID)).size, 1, 'une seule série');
  assert.deepEqual(images[14].pixels, G.pixelsPerfusion(2, 4, 3, 32, 2, 5), 'pixels du fantôme');
  // Signal des tissus : chute marquée dans la lésion, aucune dans les ventricules
  assert.equal(G.signalPerfusion(0, 'lesion'), 1);
  assert.ok(G.signalPerfusion(22, 'lesion') < 0.45 && G.signalPerfusion(22, 'parenchyme') > 0.69);
  assert.equal(G.signalPerfusion(22, 'ventricule'), 1);
});

test('courbe : phases d\'une coupe retrouvées et ordonnées (TriggerTime, heure, phase × TR, ordre)', () => {
  const images = lirePerfusion(G.genererPerfusion({ coupes: 3, phases: 6, taille: 16, tr: 1.5, heure: '235958' }));
  const ref = images[4 * 3 + 1];                           // phase 5, coupe 2
  const groupe = P.phasesDeLaCoupe(images.slice().reverse(), ref);
  assert.equal(groupe.length, 6);
  assert.ok(groupe.every(i => i.meta.ImagePositionPatient[2] === 5));
  let axe = P.axeTemps(groupe);
  assert.deepEqual([axe.source, axe.unite, axe.temps], ['TriggerTime', 's', [0, 1.5, 3, 4.5, 6, 7.5]]);
  assert.deepEqual(axe.images.map(i => i.meta.TemporalPositionIdentifier), [1, 2, 3, 4, 5, 6], 'ordre du temps, pas celui des fichiers');
  // Sans TriggerTime (souvent le cas en DSC) : heure d'acquisition, passage de minuit compris
  const sans = (l, ...cles) => l.map(i => { const meta = { ...i.meta }; cles.forEach(c => delete meta[c]); return { ...i, meta }; });
  axe = P.axeTemps(sans(groupe, 'TriggerTime'));
  assert.equal(axe.source, 'AcquisitionTime');
  assert.deepEqual(axe.temps, [0, 1.5, 3, 4.5, 6, 7.5]);
  assert.equal(P.secondes('235959.5'), 86399.5);
  // Heure identique pour toutes les images (fréquent sur les EPI GE) : numéro de phase × TR
  const memeHeure = sans(groupe, 'TriggerTime').map(i => ({ ...i, meta: { ...i.meta, AcquisitionTime: '120000' } }));
  axe = P.axeTemps(memeHeure);
  assert.deepEqual([axe.source, axe.unite, axe.temps], ['TemporalPositionIdentifier × TR', 's', [0, 1.5, 3, 4.5, 6, 7.5]]);
  // Hors EPI, sans heure : phases numérotées
  axe = P.axeTemps(memeHeure.map(i => ({ ...i, meta: { ...i.meta, ScanningSequence: 'GR' } })));
  assert.deepEqual([axe.source, axe.unite, axe.temps], ['TemporalPositionIdentifier', 'phase', [1, 2, 3, 4, 5, 6]]);
  axe = P.axeTemps(sans(memeHeure, 'TemporalPositionIdentifier', 'ScanningSequence'));
  assert.deepEqual([axe.source, axe.temps], ['InstanceNumber', [1, 2, 3, 4, 5, 6]]);
  // Série non dynamique (scanner) : une image par position
  const scanner = G.genererEtude({ coupes: 3, taille: 16 }).instances.map(i => ({ meta: L.lireEntete(dcmjs, tampon(i.octets)).metadata }));
  assert.equal(P.phasesDeLaCoupe(scanner, scanner[1]).length, 1);
});

test('courbe : régions tracées → pixels (ellipse, cercle, rectangle, contour, plan oblique)', () => {
  const plan = P.plan({ ImagePositionPatient: [-50, -50, 0], ImageOrientationPatient: [1, 0, 0, 0, 1, 0], PixelSpacing: [1, 1], Rows: 100, Columns: 100 });
  const monde = (c, l) => [-50 + c, -50 + l, 0];
  const ellipse = P.masque(plan, { forme: 'ellipse', points: [monde(50, 60), monde(50, 40), monde(30, 50), monde(70, 50)] });
  assert.ok(Math.abs(ellipse.length - Math.PI * 10 * 20) < 12, `ellipse 20 × 10 : ${ellipse.length} pixels`);
  assert.ok(ellipse.includes(50 * 100 + 50) && !ellipse.includes(50 * 100 + 75) && !ellipse.includes(62 * 100 + 50));
  const k = Math.SQRT1_2, tournee = P.masque(plan, { forme: 'ellipse', points: [monde(50 - 10 * k, 50 - 10 * k), monde(50 + 10 * k, 50 + 10 * k), monde(50 + 5 * k, 50 - 5 * k), monde(50 - 5 * k, 50 + 5 * k)] });
  assert.ok(Math.abs(tournee.length - Math.PI * 50) < 10 && tournee.includes(57 * 100 + 57) && !tournee.includes(57 * 100 + 43), `ellipse tournée de 45° : ${tournee.length}`);
  const cercle = P.masque(plan, { forme: 'cercle', points: [monde(20, 20), monde(28, 20)] });
  assert.ok(Math.abs(cercle.length - Math.PI * 64) < 8, `cercle r = 8 : ${cercle.length}`);
  assert.equal(P.masque(plan, { forme: 'rectangle', points: [monde(10, 10), monde(19, 10), monde(10, 14), monde(19, 14)] }).length, 50, 'rectangle dans l\'axe : bords compris (10 × 5)');
  assert.equal(P.masque(plan, { forme: 'polygone', points: [monde(0, 0), monde(9, 0), monde(0, 9)] }).length, 45, 'triangle : centres strictement sous l\'hypoténuse');
  assert.equal(P.masque(plan, { forme: 'cercle', points: [monde(-30, -30), monde(-25, -30)] }).length, 0, 'hors de l\'image');
  // Pixels rectangulaires et plan sagittal : la région reste un cercle en millimètres
  const sagittal = P.plan({ ImagePositionPatient: [10, -100, 100], ImageOrientationPatient: [0, 1, 0, 0, 0, -1], PixelSpacing: [2, 1], Rows: 100, Columns: 200 });
  const m = P.masque(sagittal, { forme: 'cercle', points: [[10, 0, 50], [10, 10, 50]] });
  assert.ok(Math.abs(m.length - (Math.PI * 100) / 2) < 8, `cercle de 10 mm sur pixels de 1 × 2 mm : ${m.length}`);
  assert.ok(m.includes(25 * 200 + 100), 'centre : colonne 100, ligne 25');
  // Annotations de la visionneuse (cornerstone) → régions
  const ann = (toolName, data) => ({ metadata: { toolName }, data });
  assert.deepEqual(P.regionDepuisAnnotation(ann('EllipticalROI', { handles: { points: [[1, 2, 3], [4, 5, 6], [0, 0, 0], [1, 1, 1]] } })).forme, 'ellipse');
  assert.deepEqual(P.regionDepuisAnnotation(ann('PlanarFreehandROI', { contour: { polyline: [[0, 0, 0], [1, 0, 0], [0, 1, 0]] }, handles: { points: [] } })),
    { forme: 'polygone', points: [[0, 0, 0], [1, 0, 0], [0, 1, 0]] });
  assert.equal(P.regionDepuisAnnotation(ann('Length', { handles: { points: [[0, 0, 0], [1, 1, 1]] } })), null, 'une longueur n\'est pas une région');
  assert.equal(P.moyenne(new Uint16Array([10, 20, 30, 40]), Int32Array.from([1, 3]), 2, -5), 55, 'pente et ordonnée appliquées');
});

test('courbe : T2* dynamique synthétique → chute, minimum et PSR attendus', () => {
  const r = G.genererPerfusion({ graine: 7 });
  const images = lirePerfusion(r);
  const ref = images[20 * 8 + 3];                          // phase 21, coupe 4 (la lésion est sur les coupes du milieu)
  const axe = P.axeTemps(P.phasesDeLaCoupe(images, ref));
  const plan = P.plan(ref.meta), esp = 230 / 96;
  const monde = (c, l) => [plan.origine[0] + c * esp, plan.origine[1] + l * esp, plan.origine[2]];
  const courbe = (cx, cy, rayon) => {
    const ind = P.masque(plan, { forme: 'cercle', points: [monde(cx, cy), monde(cx + rayon, cy)] });
    const valeurs = axe.images.map(im => P.moyenne(im.pixels, ind));
    return P.analyserCourbe(axe.temps, valeurs, axe.unite);
  };
  const lesion = courbe(0.3 * 96 - 0.5, 0.42 * 96 - 0.5, 5);
  assert.equal(lesion.type, 'chute');
  assert.ok(Math.abs(lesion.chute - 0.60) < 0.03, `chute ${lesion.chute}`);
  assert.ok(Math.abs(lesion.psr - 0.70) < 0.05, `PSR ${lesion.psr}`);
  assert.ok(lesion.tempsMinimum >= 21 && lesion.tempsMinimum <= 24, `minimum à ${lesion.tempsMinimum} s`);
  assert.ok(lesion.arrivee >= 15 && lesion.arrivee <= 19, `arrivée à ${lesion.arrivee} s`);
  assert.equal(lesion.phasesBase[0], 1, 'première phase écartée de la ligne de base');
  const sain = courbe(0.7 * 96, 0.42 * 96, 5);
  assert.ok(Math.abs(sain.chute - 0.30) < 0.03 && Math.abs(sain.psr - 0.95) < 0.04, `parenchyme : ${sain.chute} / ${sain.psr}`);
  const ventricule = courbe(0.45 * 96 - 0.5, 0.48 * 96 - 0.5, 2);
  assert.equal(ventricule.type, 'stable');
  // Export tableur : virgule décimale, une colonne par région
  const csv = P.versCsv([{ nom: 'Région 1', temps: axe.temps, valeurs: axe.temps.map(() => 900), analyse: { relatif: axe.temps.map(() => 1) } }], 's');
  const lignes = csv.trim().split('\r\n');
  assert.equal(lignes.length, 51);
  assert.equal(lignes[0], 'Temps (s);Région 1 : signal moyen;Région 1 : % de la ligne de base');
  assert.equal(lignes[2], '1,5;900;100');
});

test('courbe : T1 dynamique → rehaussement et type de courbe (I, II, III)', () => {
  const temps = Array.from({ length: 40 }, (_, i) => i * 10);           // 10 s par phase, 6 min 30
  const courbe = fin => temps.map(t => (t < 50 ? 400 : t < 110 ? 400 + (t - 40) * 8 : 880 + ((t - 110) / 280) * fin));
  const types = [[200, 'I'], [20, 'II'], [-200, 'III']].map(([fin, attendu]) => {
    const a = P.analyserCourbe(temps, courbe(fin), 's');
    assert.equal(a.type, 'rehaussement');
    assert.ok(Math.abs(a.rehaussement - (Math.max(880, 880 + fin) / 400 - 1)) < 0.02);
    assert.equal(a.arrivee, 50);
    return a.typeCourbe === attendu;
  });
  assert.deepEqual(types, [true, true, true]);
  const courte = P.analyserCourbe(temps.slice(0, 15), courbe(0).slice(0, 15), 's');
  assert.equal(courte.typeCourbe, null, 'moins d\'une minute après le pic : non classée');
  assert.equal(P.analyserCourbe([1, 2, 3, 4, 5, 6], [100, 101, 99, 100, 102, 100], 'phase').type, 'stable');
  assert.equal(P.analyserCourbe([1, 2], [1, 2]).type, 'insuffisant');
});

test('configuration de la visionneuse : services exposés pour la courbe, mesures suivies sans question', () => {
  const window = { RH_OHIF_BASE: '/depot/abc/dicom/ohif/' };
  new Function('window', fs.readFileSync(path.join(RACINE, 'espace-dicom/visionneuse/app-config.js'), 'utf8'))(window);
  assert.equal(typeof window.config, 'function', 'configuration sous forme de fonction (prévu par OHIF)');
  assert.equal(window.RH_OHIF.pret, false);
  assert.equal(window.config.defaultDataSourceName, 'dicomjson', 'réglages lisibles comme propriétés');
  const c = window.config({ servicesManager: 'services' });
  assert.deepEqual([window.RH_OHIF.pret, window.RH_OHIF.servicesManager], [true, 'services']);
  assert.equal(c.routerBasename, '/depot/abc/dicom/ohif');
  assert.equal(c.measurementTrackingMode, 'simplified');
  assert.equal(c.showStudyList, false);
});

test('installation d\'OHIF : correctifs précis, version et empreinte figées', () => {
  assert.equal(I.VERSION, '3.13.12');
  const f = new Function('window', 'self', `var __webpack_require__ = {}; ${I.CHEMIN_PUBLIC_CORRIGE} return __webpack_require__.p;`);
  assert.equal(f({ PUBLIC_URL: '/depot/abc/dicom/ohif/' }, undefined), '/depot/abc/dicom/ohif/', 'page : dossier de la visionneuse');
  assert.equal(f(undefined, { location: { href: 'https://site.test/d/dicom/ohif/compute.bundle.js?x=1' } }), 'https://site.test/d/dicom/ohif/', 'script de travail : son propre dossier');
  // Le correctif blob n'ouvre que les adresses blob: du même site
  const politique = new Function('protocol', 'isSameOrigin', `${I.PROTOCOLE_CORRIGE} return 'refusé'; } return 'accepté';`);
  assert.equal(politique('https:', false), 'accepté');
  assert.equal(politique('blob:', true), 'accepté');
  assert.equal(politique('blob:', false), 'refusé');
  assert.equal(politique('data:', true), 'refusé');
  assert.equal(politique('javascript:', true), 'refusé');
  assert.deepEqual(I.appliquer('a X b X', 'X', 'Y'), { texte: 'a Y b Y', n: 2 });
  const modele = fs.readFileSync(path.join(RACINE, 'espace-dicom/visionneuse/index.html.modele'), 'utf8');
  assert.match(modele, /\{\{BUNDLE\}\}/);
  assert.ok(modele.indexOf('theme-radiologichub.css') > modele.indexOf('app.bundle.css'), 'couleurs du site chargées après celles d\'OHIF');
  const theme = fs.readFileSync(path.join(RACINE, 'espace-dicom/visionneuse/theme-radiologichub.css'), 'utf8');
  assert.match(theme, /--background: 0 0% 0%;/, 'images toujours sur fond noir');
  assert.match(theme, /--highlight: 38 88% 57%;/, 'outil actif : ambre du site (#f2ab2f)');
  assert.match(theme, /--accent: 241 47% 31%;/, 'survol : marine du site (#2b2a74)');
  assert.match(theme, /font-family: "Montserrat"/, 'police du site');
  assert.match(modele, /fonts\.googleapis\.com\/css2\?family=Montserrat/, 'Montserrat chargée comme sur le site');
  assert.match(modele, /\^\\\/viewer\\\/\(dicomjson\|dicomweb\)\\\?/, 'seules les adresses de la visionneuse sont acceptées');
  // Visionneuse installée (npm run visionneuse) : vérifier ce qui a été produit
  const ohif = path.join(RACINE, 'dicom', 'ohif');
  if (fs.existsSync(path.join(ohif, 'VERSION.txt'))) {
    assert.match(fs.readFileSync(path.join(ohif, 'VERSION.txt'), 'utf8'), /3\.13\.12[\s\S]*blob-meme-origine : 1/);
    assert.ok(!fs.existsSync(path.join(ohif, 'ort')) && !fs.existsSync(path.join(ohif, 'sw.js')), 'modules inutiles retirés');
    assert.ok(fs.existsSync(path.join(ohif, 'LICENSE')));
    assert.equal(fs.readFileSync(path.join(ohif, 'theme-radiologichub.css'), 'utf8'), theme, 'thème copié par l\'installation');
    const index = fs.readFileSync(path.join(ohif, 'index.html'), 'utf8');
    const bundle = /src="(app\.bundle\.[0-9a-f]+\.js)"/.exec(index)[1];
    assert.ok(fs.readFileSync(path.join(ohif, bundle), 'utf8').includes(I.CHEMIN_PUBLIC_CORRIGE));
  }
});

test('pages : scripts présents, mode démonstration, aucune ressource externe hors polices', () => {
  for (const page of ['espace-dicom.html', 'espace-dicom-visionneuse.html']) {
    const html = fs.readFileSync(path.join(RACINE, page), 'utf8');
    if (page === "espace-dicom-visionneuse.html") assert.match(html, /<meta name="robots" content="noindex">/, `${page} : visionneuse non indexée`);
    else assert.doesNotMatch(html, /noindex/, `${page} : publiée et indexable`);
    for (const [, src] of html.matchAll(/<script src="([^"?]+)/g)) assert.ok(fs.existsSync(path.join(RACINE, src)), `${page} : ${src}`);
    for (const [, href] of html.matchAll(/(?:src|href)="(https?:[^"]+)"/g)) assert.match(href, /^https:\/\/fonts\.(googleapis|gstatic)\.com/, `${page} : ${href}`);
  }
  global.window = {};
  require('../dicom/config.js');
  assert.equal(global.window.RH_DICOM_CONFIG.serveur, '', 'démonstration tant que le serveur n\'est pas en service');
  delete global.window;
  assert.ok(fs.existsSync(path.join(RACINE, 'vendor/dcmjs-0.52.0/LICENSE')));
  assert.ok(fs.existsSync(path.join(RACINE, 'dicom/ohif/LICENSE')) && fs.existsSync(path.join(RACINE, 'dicom/ohif/index.html')), 'visionneuse OHIF publiée avec sa licence');
});
