#!/usr/bin/env node
'use strict';
/* =========================================================
   Générateur de scanners DICOM SYNTHÉTIQUES pour les tests de l'Espace
   DICOM. Aucune donnée de patient réel : les images sont un fantôme
   calculé (corps elliptique, poumons, rachis, aorte, foie avec un kyste),
   le patient s'appelle « TEST^SYNTHETIQUE » et l'en-tête indique
   « identité retirée » (0012,0062 = YES).

   Fichiers DICOM Part 10, syntaxe Explicit VR Little Endian, non
   compressés (Orthanc les compresse sans perte en JPEG-LS à l'arrivée).

   Usage :
     node outils/generer-dicom-test.js --dossier donnees-test/ct --coupes 40 --taille 256
     options : --patient RH-TEST-0001  --description "TDM TEST"  --graine 1
   ========================================================= */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const EXPLICIT_LE = '1.2.840.10008.1.2.1';
const CT_IMAGE = '1.2.840.10008.5.1.4.1.1.2';
const IMPLEMENTATION_UID = '2.25.311744713393871246361585216066375384125';
const VR_LONGUES = new Set(['OB', 'OD', 'OF', 'OL', 'OV', 'OW', 'SQ', 'UC', 'UN', 'UR', 'UT', 'SV', 'UV']);

// UID sans racine d'organisation (forme « 2.25.<entier de 128 bits> », norme DICOM PS3.5 B.2)
const nouvelUid = () => '2.25.' + BigInt('0x' + crypto.randomBytes(16).toString('hex')).toString(10);

function element(groupe, numero, vr, valeur) {
  let donnees;
  if (Buffer.isBuffer(valeur)) donnees = valeur;
  else if (vr === 'US') { donnees = Buffer.alloc(2); donnees.writeUInt16LE(valeur); }
  else if (vr === 'UL') { donnees = Buffer.alloc(4); donnees.writeUInt32LE(valeur); }
  else donnees = Buffer.from(String(valeur), 'utf8');
  if (donnees.length % 2) donnees = Buffer.concat([donnees, Buffer.from([vr === 'UI' || vr === 'OB' ? 0 : 0x20])]);
  const longue = VR_LONGUES.has(vr);
  const entete = Buffer.alloc(longue ? 12 : 8);
  entete.writeUInt16LE(groupe, 0);
  entete.writeUInt16LE(numero, 2);
  entete.write(vr, 4, 'latin1');
  if (longue) entete.writeUInt32LE(donnees.length, 8);
  else entete.writeUInt16LE(donnees.length, 6);
  return { cle: groupe * 0x10000 + numero, octets: Buffer.concat([entete, donnees]) };
}

function fichierDicom(meta, jeu) {
  const trier = l => l.sort((a, b) => a.cle - b.cle).map(e => e.octets);
  const corpsMeta = Buffer.concat(trier(meta));
  const longueur = element(0x0002, 0x0000, 'UL', corpsMeta.length);
  return Buffer.concat([Buffer.alloc(128), Buffer.from('DICM', 'latin1'), longueur.octets, corpsMeta, ...trier(jeu)]);
}

// Générateur pseudo-aléatoire reproductible (mulberry32)
function hasard(graine) {
  let a = graine >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* Valeurs stockées d'une coupe (UH + 1024, entiers non signés sur 12 bits) */
function pixelsCoupe(indice, coupes, taille, graine = 1) {
  const alea = hasard(graine * 100_003 + indice);
  const p = new Uint16Array(taille * taille);
  const z = coupes > 1 ? indice / (coupes - 1) : 0.5;          // 0 : en haut (thorax), 1 : en bas (abdomen)
  const dans = (x, y, cx, cy, rx, ry) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
  const rKyste = 0.07 * Math.sqrt(Math.max(0, 1 - ((z - 0.78) / 0.12) ** 2));
  for (let j = 0; j < taille; j++) {
    for (let i = 0; i < taille; i++) {
      const x = i / taille, y = j / taille;
      let uh = -1000;                                                      // air
      if (dans(x, y, 0.5, 0.52, 0.42, 0.32)) {
        uh = 30 + (alea() - 0.5) * 24;                                     // tissus mous
        if (z < 0.6 && (dans(x, y, 0.33, 0.47, 0.13, 0.19) || dans(x, y, 0.67, 0.47, 0.13, 0.19))) uh = -850 + (alea() - 0.5) * 60;   // poumons
        if (z > 0.55 && dans(x, y, 0.36, 0.5, 0.16, 0.14)) uh = 60 + (alea() - 0.5) * 20;                                            // foie
        if (rKyste > 0 && dans(x, y, 0.33, 0.48, rKyste, rKyste)) uh = 5 + (alea() - 0.5) * 10;                                       // kyste
        if (dans(x, y, 0.5, 0.68, 0.055, 0.055)) uh = dans(x, y, 0.5, 0.68, 0.022, 0.022) ? 15 : 700 + (alea() - 0.5) * 80;         // rachis
        if (dans(x, y, 0.53, 0.58, 0.03, 0.03)) uh = 45 + (alea() - 0.5) * 10;                                                      // aorte
      }
      p[j * taille + i] = Math.max(0, Math.min(4095, Math.round(uh + 1024)));
    }
  }
  return p;
}

function genererEtude({ dossier, coupes = 20, taille = 256, patientId = 'RH-TEST-0001', description = 'TDM TEST SYNTHETIQUE', graine = 1, epaisseur = 2.5 } = {}) {
  if (!dossier) throw new Error('--dossier manquant');
  fs.mkdirSync(dossier, { recursive: true });
  const etudeUid = nouvelUid(), serieUid = nouvelUid(), repereUid = nouvelUid();
  const date = '20260101', heure = '120000';
  const espacement = 350 / taille;
  const instances = [];
  for (let k = 0; k < coupes; k++) {
    const sopUid = nouvelUid();
    const zmm = -k * epaisseur;
    const pixels = pixelsCoupe(k, coupes, taille, graine);
    const meta = [
      element(0x0002, 0x0001, 'OB', Buffer.from([0, 1])),
      element(0x0002, 0x0002, 'UI', CT_IMAGE),
      element(0x0002, 0x0003, 'UI', sopUid),
      element(0x0002, 0x0010, 'UI', EXPLICIT_LE),
      element(0x0002, 0x0012, 'UI', IMPLEMENTATION_UID),
      element(0x0002, 0x0013, 'SH', 'RHUB_TEST'),
    ];
    const ds = (v, n = 4) => Number(v.toFixed(n)).toString();
    const jeu = [
      element(0x0008, 0x0005, 'CS', 'ISO_IR 192'),
      element(0x0008, 0x0008, 'CS', 'ORIGINAL\\PRIMARY\\AXIAL'),
      element(0x0008, 0x0016, 'UI', CT_IMAGE),
      element(0x0008, 0x0018, 'UI', sopUid),
      element(0x0008, 0x0020, 'DA', date),
      element(0x0008, 0x0021, 'DA', date),
      element(0x0008, 0x0030, 'TM', heure),
      element(0x0008, 0x0050, 'SH', 'TEST' + String(graine).padStart(4, '0')),
      element(0x0008, 0x0060, 'CS', 'CT'),
      element(0x0008, 0x0070, 'LO', 'RadiologicHub donnees synthetiques'),
      element(0x0008, 0x0090, 'PN', ''),
      element(0x0008, 0x1030, 'LO', description),
      element(0x0008, 0x103E, 'LO', 'Fantome synthetique'),
      element(0x0010, 0x0010, 'PN', 'TEST^SYNTHETIQUE'),
      element(0x0010, 0x0020, 'LO', patientId),
      element(0x0010, 0x0030, 'DA', ''),
      element(0x0010, 0x0040, 'CS', 'O'),
      element(0x0012, 0x0062, 'CS', 'YES'),
      element(0x0018, 0x0050, 'DS', ds(epaisseur)),
      element(0x0018, 0x5100, 'CS', 'HFS'),
      element(0x0020, 0x000D, 'UI', etudeUid),
      element(0x0020, 0x000E, 'UI', serieUid),
      element(0x0020, 0x0010, 'SH', '1'),
      element(0x0020, 0x0011, 'IS', '1'),
      element(0x0020, 0x0013, 'IS', String(k + 1)),
      element(0x0020, 0x0032, 'DS', `${ds(-175)}\\${ds(-175)}\\${ds(zmm)}`),
      element(0x0020, 0x0037, 'DS', '1\\0\\0\\0\\1\\0'),
      element(0x0020, 0x0052, 'UI', repereUid),
      element(0x0020, 0x1041, 'DS', ds(zmm)),
      element(0x0028, 0x0002, 'US', 1),
      element(0x0028, 0x0004, 'CS', 'MONOCHROME2'),
      element(0x0028, 0x0010, 'US', taille),
      element(0x0028, 0x0011, 'US', taille),
      element(0x0028, 0x0030, 'DS', `${ds(espacement)}\\${ds(espacement)}`),
      element(0x0028, 0x0100, 'US', 16),
      element(0x0028, 0x0101, 'US', 12),
      element(0x0028, 0x0102, 'US', 11),
      element(0x0028, 0x0103, 'US', 0),
      element(0x0028, 0x1050, 'DS', '40'),
      element(0x0028, 0x1051, 'DS', '400'),
      element(0x0028, 0x1052, 'DS', '-1024'),
      element(0x0028, 0x1053, 'DS', '1'),
      element(0x0028, 0x1054, 'LO', 'HU'),
      element(0x7FE0, 0x0010, 'OW', Buffer.from(pixels.buffer, pixels.byteOffset, pixels.byteLength)),
    ];
    const chemin = path.join(dossier, `coupe-${String(k + 1).padStart(4, '0')}.dcm`);
    fs.writeFileSync(chemin, fichierDicom(meta, jeu));
    instances.push({ sopUid, chemin, numero: k + 1 });
  }
  return { etudeUid, serieUid, instances, coupes, taille, graine };
}

function lireArguments(argv) {
  const a = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) a[argv[i].slice(2)] = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
  }
  return a;
}

if (require.main === module) {
  const a = lireArguments(process.argv.slice(2));
  const r = genererEtude({
    dossier: a.dossier, coupes: Number(a.coupes) || 20, taille: Number(a.taille) || 256,
    patientId: a.patient || 'RH-TEST-0001', description: a.description || 'TDM TEST SYNTHETIQUE', graine: Number(a.graine) || 1,
  });
  console.log(JSON.stringify({ etudeUid: r.etudeUid, serieUid: r.serieUid, coupes: r.coupes, taille: r.taille, dossier: a.dossier }));
}

module.exports = { genererEtude, pixelsCoupe, nouvelUid, lireArguments };
