#!/usr/bin/env node
'use strict';
/* =========================================================
   Générateur de scanners DICOM SYNTHÉTIQUES pour les tests de l'Espace
   DICOM : écrit sur disque les fichiers produits par dicom/generateur.js
   (le même générateur que le bouton « scanner de test » du site).
   Aucune donnée de patient réel : fantôme calculé, patient
   « TEST^SYNTHETIQUE », « identité retirée » (0012,0062 = YES).

   Usage :
     node outils/generer-dicom-test.js --dossier donnees-test/ct --coupes 40 --taille 256
     options : --patient RH-TEST-0001  --description "TDM TEST"  --graine 1
   ========================================================= */
const fs = require('node:fs');
const path = require('node:path');
const generateur = require('../../dicom/generateur.js');

function genererEtude({ dossier, ...options } = {}) {
  if (!dossier) throw new Error('--dossier manquant');
  fs.mkdirSync(dossier, { recursive: true });
  const r = generateur.genererEtude(options);
  const instances = r.instances.map(i => {
    const chemin = path.join(dossier, i.nom);
    fs.writeFileSync(chemin, i.octets);
    return { sopUid: i.sopUid, chemin, numero: i.numero };
  });
  return { etudeUid: r.etudeUid, serieUid: r.serieUid, instances, coupes: r.coupes, taille: r.taille, graine: r.graine };
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

module.exports = { genererEtude, pixelsCoupe: generateur.pixelsCoupe, nouvelUid: generateur.nouvelUid, lireArguments };
