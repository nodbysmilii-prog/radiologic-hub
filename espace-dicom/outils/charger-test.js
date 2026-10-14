#!/usr/bin/env node
'use strict';
/* =========================================================
   OUTIL DE TEST (Espace DICOM) — charge un dossier de fichiers DICOM
   SYNTHÉTIQUES dans Orthanc et enregistre l'examen dans Supabase, comme
   le fera l'import (étape 2). Lancé DANS le conteneur dicom-api par
   tests/integration.js :
     docker compose exec -T dicom-api node outils/charger-test.js /donnees-test/a \
       --structure <uuid> --depose-par <uuid>
   N'accepte que des fichiers marqués « identité retirée » et dont le
   patient s'appelle TEST^SYNTHETIQUE : jamais de données réelles.
   ========================================================= */
const fs = require('node:fs');
const path = require('node:path');
const { creerOrthanc } = require('../src/orthanc.js');
const { creerSupabase } = require('../src/supabase.js');
const { lireConfig } = require('../src/config.js');
const { lireArguments } = require('./generer-dicom-test.js');

async function principal() {
  const a = lireArguments(process.argv.slice(3));
  const dossier = process.argv[2];
  if (!dossier || !fs.existsSync(dossier)) throw new Error('dossier introuvable');
  const config = lireConfig();
  const orthanc = creerOrthanc(config.orthanc);
  const supabase = creerSupabase(config.supabase);

  const fichiers = fs.readdirSync(dossier).filter(f => f.endsWith('.dcm')).sort();
  let etude = null;
  for (const f of fichiers) {
    const r = await orthanc.appel('/instances', { method: 'POST', body: fs.readFileSync(path.join(dossier, f)), headers: { 'content-type': 'application/dicom' } });
    if (!r.ok) throw new Error(`Orthanc a refusé ${f} : ${r.status}`);
    const res = await r.json();
    if (etude && etude !== res.ParentStudy) throw new Error('plusieurs études dans le dossier');
    etude = res.ParentStudy;
  }
  const infos = await orthanc.json(`/studies/${etude}`);
  const patient = infos.PatientMainDicomTags || {};
  if (patient.PatientName !== 'TEST^SYNTHETIQUE') {
    await orthanc.appel(`/studies/${etude}`, { method: 'DELETE' });
    throw new Error('fichiers refusés : seules les données synthétiques de test sont acceptées par cet outil');
  }
  const stats = await orthanc.json(`/studies/${etude}/statistics`);
  const ligne = {
    orthanc_id: etude,
    etude_uid: infos.MainDicomTags.StudyInstanceUID,
    structure_id: a.structure || null,
    depose_par: a['depose-par'] || null,
    source: a.source || 'televersement',
    nb_instances: Number(stats.CountInstances),
    taille_octets: Number(stats.DiskSize),
  };
  const r = await supabase.appel('/dc_examens', { corps: ligne, enTetes: { prefer: 'return=representation' } });
  if (!r.ok) {
    await orthanc.appel(`/studies/${etude}`, { method: 'DELETE' });
    throw new Error(`enregistrement refusé par Supabase (${r.status}) : ${(await r.text()).slice(0, 300)}`);
  }
  const [examen] = await r.json();
  console.log(JSON.stringify({ examenId: examen.id, orthancId: etude, etudeUid: ligne.etude_uid, instances: ligne.nb_instances, octets: ligne.taille_octets }));
}

principal().catch(e => { console.error(`charger-test : ${e.message}`); process.exit(1); });
