/* Tests de l'Espace DICOM côté site (mode démonstration) : scanner de test
   synthétique, lecture des en-têtes, regroupement par examen, archives .zip,
   liste des images pour OHIF, installation d'OHIF, pages. Données
   synthétiques uniquement. */
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
    assert.match(html, /<meta name="robots" content="noindex">/, `${page} : pas encore indexée`);
    for (const [, src] of html.matchAll(/<script src="([^"?]+)/g)) assert.ok(fs.existsSync(path.join(RACINE, src)), `${page} : ${src}`);
    for (const [, href] of html.matchAll(/(?:src|href)="(https?:[^"]+)"/g)) assert.match(href, /^https:\/\/fonts\.(googleapis|gstatic)\.com/, `${page} : ${href}`);
  }
  global.window = {};
  require('../dicom/config.js');
  assert.equal(global.window.RH_DICOM_CONFIG.serveur, '', 'démonstration tant que le serveur n\'est pas en service');
  delete global.window;
  assert.ok(fs.existsSync(path.join(RACINE, 'vendor/dcmjs-0.52.0/LICENSE')));
  assert.match(fs.readFileSync(path.join(RACINE, '.gitignore'), 'utf8'), /^dicom\/ohif\/$/m, 'OHIF (48 Mo) hors de la branche principale');
});
