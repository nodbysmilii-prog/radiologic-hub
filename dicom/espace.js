/* =========================================================
   Espace DICOM — page « Mes examens » et import.
   Mode démonstration (dicom/config.js sans serveur) : les fichiers sont
   lus et gardés dans CE navigateur (dicom/stockage-demo.js), rien n'est
   envoyé. En service, l'enregistrement passera par le serveur de
   l'Espace DICOM (envois parallèles avec reprise) : même parcours.
   Sources acceptées : fichiers DICOM, dossier (CD avec DICOMDIR : tous
   les fichiers du CD sont lus), archives .zip ; examens de test
   synthétiques (scanner, perfusion IRM T2*).
   ========================================================= */
(function () {
  'use strict';

  const q = s => document.querySelector(s);
  const L = window.RHDicomLecture, Z = window.RHDicomZip, G = window.RHDicomGenerateur, S = window.RHDicomStockage;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const taille = o => (o < 1048576 ? `${Math.max(1, Math.round(o / 1024))} Ko` : o < 1073741824 ? `${(o / 1048576).toFixed(1).replace('.', ',')} Mo` : `${(o / 1073741824).toFixed(2).replace('.', ',')} Go`);
  const pluriel = (n, un, plusieurs) => `${n.toLocaleString('fr-FR')} ${n > 1 ? plusieurs : un}`;
  const PARALLELE = 4;
  const LOT = 20;

  /* ---------- Lecteur DICOM (chargé à la première utilisation) ---------- */
  let dcmjsPret = null;
  function chargerDcmjs() {
    if (window.dcmjs) return Promise.resolve(window.dcmjs);
    if (!dcmjsPret) {
      dcmjsPret = new Promise((ok, ko) => {
        const s = document.createElement('script');
        s.src = 'vendor/dcmjs-0.52.0/dcmjs.min.js';
        s.onload = () => { try { window.dcmjs.log.setLevel('error'); } catch (e) { /* journal de dcmjs */ } ok(window.dcmjs); };
        s.onerror = () => { dcmjsPret = null; ko(new Error('Le lecteur DICOM n\'a pas pu être chargé.')); };
        document.head.append(s);
      });
    }
    return dcmjsPret;
  }

  /* ---------- Sources : { nom, obtenir() → Blob } ---------- */
  const deFichier = f => ({ nom: f.webkitRelativePath || f.name, obtenir: async () => f });

  // Glisser-déposer : fichiers et dossiers (parcours récursif)
  async function depuisDepot(dt) {
    const entrees = [...(dt.items || [])].map(i => (i.webkitGetAsEntry ? i.webkitGetAsEntry() : null)).filter(Boolean);
    if (!entrees.length) return [...(dt.files || [])].map(deFichier);
    const sources = [];
    async function parcourir(e) {
      if (e.isFile) {
        const f = await new Promise((ok, ko) => e.file(ok, ko));
        sources.push({ nom: e.fullPath.replace(/^\//, ''), obtenir: async () => f });
      } else if (e.isDirectory) {
        const lecteur = e.createReader();
        for (;;) {
          const lot = await new Promise((ok, ko) => lecteur.readEntries(ok, ko));
          if (!lot.length) break;
          for (const x of lot) await parcourir(x);
        }
      }
    }
    for (const e of entrees) await parcourir(e);
    return sources;
  }

  /* ---------- Analyse : lecture des en-têtes, regroupement par examen ---------- */
  let analyse = null;        // { fichiers: [...], ignores, dicomdir, erreurs, examens }
  let enCours = false;

  function progression(zone, fait, total, texte) {
    const p = total ? Math.round((fait / total) * 100) : 0;
    zone.hidden = false;
    zone.querySelector('.dc-barre-remplie').style.width = `${p}%`;
    zone.querySelector('.dc-barre').setAttribute('aria-valuenow', String(p));
    zone.querySelector('.dc-progression-texte').textContent = texte;
  }

  async function analyser(sources) {
    if (enCours) return;
    enCours = true;
    q('#dc-resume').hidden = true;
    q('#dc-erreur').hidden = true;
    const zone = q('#dc-progression');
    const etat = { fichiers: [], ignores: 0, dicomdir: 0, erreurs: [], vus: 0 };
    const file = sources.slice();
    let total = file.length;
    try {
      const dcmjs = await chargerDcmjs();
      progression(zone, 0, total, `Lecture des fichiers : 0 / ${total}`);
      const travail = async () => {
        while (file.length) {
          const s = file.shift();
          try {
            const blob = await s.obtenir();
            const premiers = new Uint8Array(await blob.slice(0, 132).arrayBuffer());
            if (Z.estZip(premiers)) {
              const entrees = await Z.lireZip(blob);
              for (const e of entrees) file.push({ nom: `${s.nom} › ${e.nom}`, obtenir: () => e.ouvrir() });
              total += entrees.length;
            } else if (!L.estDicom(premiers)) {
              etat.ignores++;
            } else {
              const lu = L.lireEntete(dcmjs, await blob.arrayBuffer());
              const r = L.resume(lu.metadata, lu.classe);
              if (r.dicomdir) etat.dicomdir++;
              else if (!r.etudeUid || !r.sopUid) etat.ignores++;
              else etat.fichiers.push({ resume: r, metadata: lu.metadata, blob, taille: blob.size });
            }
          } catch (e) {
            etat.erreurs.push(`${s.nom} : ${e.message}`);
          }
          etat.vus++;
          if (etat.vus % 5 === 0 || !file.length) progression(zone, etat.vus, total, `Lecture des fichiers : ${etat.vus.toLocaleString('fr-FR')} / ${total.toLocaleString('fr-FR')}`);
        }
      };
      await Promise.all(Array.from({ length: PARALLELE }, travail));
      etat.examens = L.regrouper(etat.fichiers);
      const deja = await S.presents(etat.fichiers.map(f => f.resume.sopUid));
      for (const e of etat.examens) e.deja = etat.fichiers.filter(f => f.resume.etudeUid === e.etudeUid && deja.has(f.resume.sopUid)).length;
      analyse = etat;
      zone.hidden = true;
      afficherResume();
    } catch (e) {
      zone.hidden = true;
      montrerErreur(e.message);
    } finally {
      enCours = false;
    }
  }

  function montrerErreur(texte) {
    const z = q('#dc-erreur');
    z.textContent = texte;
    z.hidden = false;
  }

  function afficherResume() {
    const a = analyse;
    const zone = q('#dc-resume');
    const nonAnonymes = a.examens.filter(e => !e.anonymise);
    const lignes = a.examens.map(e => `
      <tr>
        <td><b>${esc(e.patientNom || 'Sans nom')}</b><br><small>${esc(e.patientId)}</small></td>
        <td>${esc(L.formaterDate(e.date))}</td>
        <td>${esc(e.description || '—')}<br><small>${esc(e.modalites.join(', '))} · ${pluriel(e.nbSeries, 'série', 'séries')}</small></td>
        <td>${pluriel(e.nbInstances, 'image', 'images')}<br><small>${taille(e.taille)}</small></td>
        <td>${e.anonymise ? '<span class="dc-badge dc-ok">identité retirée</span>' : '<span class="dc-badge dc-alerte">non anonymisé</span>'}
          ${e.deja ? `<br><small>${e.deja === e.nbInstances ? 'déjà importé' : `${e.deja} déjà importées`}</small>` : ''}</td>
      </tr>`).join('');
    const notes = [];
    if (a.dicomdir) notes.push(`Index du CD (DICOMDIR) lu : ${pluriel(a.dicomdir, 'fichier', 'fichiers')}, les images sont importées directement.`);
    if (a.ignores) notes.push(`${pluriel(a.ignores, 'fichier ignoré', 'fichiers ignorés')} (pas des fichiers DICOM).`);
    if (a.erreurs.length) notes.push(`${pluriel(a.erreurs.length, 'fichier illisible', 'fichiers illisibles')} : ${esc(a.erreurs.slice(0, 3).join(' ; '))}${a.erreurs.length > 3 ? '…' : ''}`);
    const aImporter = a.examens.reduce((s, e) => s + e.nbInstances - e.deja, 0);
    zone.innerHTML = a.examens.length ? `
      <h3>${pluriel(a.examens.length, 'examen trouvé', 'examens trouvés')}</h3>
      <div class="ftable-wrap"><table class="ftable dc-table">
        <thead><tr><th>Patient</th><th>Date</th><th>Examen</th><th>Images</th><th>Identité</th></tr></thead>
        <tbody>${lignes}</tbody></table></div>
      ${notes.map(n => `<p class="dc-note">${n}</p>`).join('')}
      ${nonAnonymes.length ? `<div class="callout callout-warn dc-avertissement"><p><b>${pluriel(nonAnonymes.length, 'examen n\'est pas marqué', 'examens ne sont pas marqués')} « identité retirée ».</b>
        Cette démonstration est faite pour des examens de test ou anonymisés. Les fichiers restent dans ce navigateur, rien n'est envoyé.</p>
        <label class="dc-case"><input type="checkbox" id="dc-confirme"> J'utilise des fichiers de test ou anonymisés</label></div>` : ''}
      <div class="dc-actions">
        <button type="button" class="btn btn-ink" id="dc-importer" ${aImporter ? '' : 'disabled'}>${aImporter ? `Importer ${pluriel(aImporter, 'image', 'images')}` : 'Déjà importé'}</button>
        <button type="button" class="btn btn-outline" id="dc-annuler">Annuler</button>
      </div>` : `
      <h3>Aucun examen DICOM trouvé</h3>
      ${notes.map(n => `<p class="dc-note">${n}</p>`).join('')}
      <div class="dc-actions"><button type="button" class="btn btn-outline" id="dc-annuler">Fermer</button></div>`;
    zone.hidden = false;
    const bouton = q('#dc-importer'), confirme = q('#dc-confirme');
    if (bouton && confirme) {
      bouton.disabled = true;
      confirme.addEventListener('change', () => { bouton.disabled = !confirme.checked || !aImporter; });
    }
    if (bouton) bouton.addEventListener('click', importer);
    q('#dc-annuler').addEventListener('click', () => { analyse = null; zone.hidden = true; });
    zone.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  /* ---------- Enregistrement (par lots ; un import interrompu reprend là où il s'est arrêté) ---------- */
  async function importer() {
    if (!analyse || enCours) return;
    enCours = true;
    const a = analyse;
    q('#dc-resume').hidden = true;
    const zone = q('#dc-progression');
    const deja = await S.presents(a.fichiers.map(f => f.resume.sopUid));
    const vus = new Set();
    const restants = a.fichiers.filter(f => !deja.has(f.resume.sopUid) && !vus.has(f.resume.sopUid) && vus.add(f.resume.sopUid));
    const octetsTotal = restants.reduce((s, f) => s + f.taille, 0);
    let faits = 0, octets = 0;
    const debut = performance.now();
    try {
      for (const ex of a.examens) {
        const fichiers = restants.filter(f => f.resume.etudeUid === ex.etudeUid);
        for (let i = 0; i < fichiers.length; i += LOT) {
          const lot = fichiers.slice(i, i + LOT);
          await S.enregistrerLot(ex, lot.map(f => ({ sopUid: f.resume.sopUid, serieUid: f.resume.serieUid, metadata: f.metadata, fichier: f.blob, taille: f.taille })));
          faits += lot.length;
          octets += lot.reduce((s, f) => s + f.taille, 0);
          progression(zone, octets, octetsTotal, `Import : ${faits.toLocaleString('fr-FR')} / ${restants.length.toLocaleString('fr-FR')} images (${taille(octets)} / ${taille(octetsTotal)})`);
        }
      }
      analyse = null;
      zone.hidden = true;
      const s = Math.max(0.1, (performance.now() - debut) / 1000);
      annoncer(`${pluriel(faits, 'image importée', 'images importées')} en ${s.toFixed(1).replace('.', ',')} s.`);
      await afficherExamens();
    } catch (e) {
      zone.hidden = true;
      montrerErreur(e && e.name === 'QuotaExceededError'
        ? 'L\'espace de ce navigateur est plein : supprimez des examens puis relancez l\'import (les images déjà enregistrées ne seront pas réimportées).'
        : `Import interrompu : ${e.message}. Relancez-le : les images déjà enregistrées ne seront pas réimportées.`);
    } finally {
      enCours = false;
    }
  }

  function annoncer(texte) {
    const z = q('#dc-annonce');
    z.textContent = texte;
    z.hidden = false;
    clearTimeout(annoncer.minuterie);
    annoncer.minuterie = setTimeout(() => { z.hidden = true; }, 8000);
  }

  /* ---------- Mes examens ---------- */
  async function afficherExamens() {
    const liste = q('#dc-examens');
    let examens = [];
    try {
      examens = await S.examens();
    } catch (e) {
      liste.innerHTML = `<p class="dc-vide">${esc(e.message)}</p>`;
      return;
    }
    const filtre = (q('#dc-recherche').value || '').trim().toLowerCase();
    const vus = examens.filter(e => !filtre || `${e.patientNom} ${e.patientId} ${e.description} ${(e.modalites || []).join(' ')}`.toLowerCase().includes(filtre));
    q('#dc-compte').textContent = examens.length ? `(${examens.length})` : '';
    q('#dc-tout-supprimer').hidden = !examens.length;
    liste.innerHTML = vus.length ? vus.map(e => `
      <article class="dc-examen">
        <div class="dc-examen-tete">
          <span class="dc-modalites">${esc((e.modalites || []).join(' · ') || 'DICOM')}</span>
          ${e.anonymise ? '<span class="dc-badge dc-ok">identité retirée</span>' : '<span class="dc-badge dc-alerte">non anonymisé</span>'}
        </div>
        <h3>${esc(e.patientNom || 'Sans nom')}</h3>
        <p class="dc-examen-desc">${esc(e.description || 'Examen sans description')}</p>
        <p class="dc-examen-infos">${esc(L.formaterDate(e.date) || 'Date inconnue')} · ${esc(e.patientId || '—')} · ${pluriel(e.nbInstances, 'image', 'images')} · ${taille(e.taille)}</p>
        <div class="dc-examen-actions">
          <a class="btn btn-ink btn-sm" href="espace-dicom-visionneuse.html?etude=${encodeURIComponent(e.etudeUid)}">Visualiser</a>
          <button type="button" class="btn btn-outline btn-sm" data-supprimer="${esc(e.etudeUid)}">Supprimer</button>
        </div>
      </article>`).join('') : `<p class="dc-vide">${examens.length ? 'Aucun examen ne correspond à la recherche.' : 'Aucun examen pour l\'instant : importez des fichiers ou chargez un examen de test.'}</p>`;
    const e = await S.espace();
    q('#dc-espace').textContent = e && e.usage !== undefined ? `Espace utilisé par ce site dans ce navigateur : ${taille(e.usage)}${e.quota ? ` sur ${taille(e.quota)} disponibles` : ''}.` : '';
  }

  /* ---------- Examens de test (synthétiques) : scanner, perfusion IRM T2* ---------- */
  const aujourdhui = () => new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const graine = () => 1 + Math.floor(Math.random() * 999);
  const scannerTest = () => G.genererEtude({ coupes: 120, taille: 256, graine: graine(), date: aujourdhui(), description: 'TDM TEST SYNTHETIQUE' });
  const perfusionTest = () => G.genererPerfusion({ graine: graine(), date: aujourdhui() });

  async function chargerTest(bouton, fabriquer) {
    bouton.disabled = true;
    try {
      await new Promise(r => setTimeout(r, 30));
      const r = fabriquer();
      await analyser(r.instances.map(i => ({ nom: i.nom, obtenir: async () => new Blob([i.octets], { type: 'application/dicom' }) })));
    } finally {
      bouton.disabled = false;
    }
  }

  async function telechargerScannerTest() {
    const bouton = q('#dc-test-zip');
    bouton.disabled = true;
    const texte = bouton.textContent;
    bouton.textContent = 'Préparation…';
    try {
      const r = scannerTest();
      const zip = await Z.ecrireZip(r.instances.map(i => ({ nom: `SCANNER-TEST/${i.nom}`, octets: i.octets })));
      const a = document.createElement('a');
      a.href = URL.createObjectURL(zip);
      a.download = 'scanner-test-synthetique.zip';
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 60000);
    } catch (e) {
      montrerErreur(`Préparation impossible : ${e.message}`);
    } finally {
      bouton.disabled = false;
      bouton.textContent = texte;
    }
  }

  /* ---------- Branchements ---------- */
  function init() {
    const depot = q('#dc-depot');
    const fichiers = q('#dc-fichiers'), dossier = q('#dc-dossier');
    if (!('webkitdirectory' in dossier)) q('#dc-choisir-dossier').hidden = true;
    fichiers.addEventListener('change', () => { if (fichiers.files.length) analyser([...fichiers.files].map(deFichier)); fichiers.value = ''; });
    dossier.addEventListener('change', () => { if (dossier.files.length) analyser([...dossier.files].map(deFichier)); dossier.value = ''; });
    ['dragenter', 'dragover'].forEach(t => depot.addEventListener(t, e => { e.preventDefault(); depot.classList.add('is-survol'); }));
    ['dragleave', 'drop'].forEach(t => depot.addEventListener(t, () => depot.classList.remove('is-survol')));
    depot.addEventListener('drop', async e => {
      e.preventDefault();
      try { analyser(await depuisDepot(e.dataTransfer)); } catch (err) { montrerErreur(err.message); }
    });
    q('#dc-test').addEventListener('click', () => chargerTest(q('#dc-test'), scannerTest));
    q('#dc-test-perf').addEventListener('click', () => chargerTest(q('#dc-test-perf'), perfusionTest));
    q('#dc-test-zip').addEventListener('click', telechargerScannerTest);
    q('#dc-recherche').addEventListener('input', afficherExamens);
    q('#dc-examens').addEventListener('click', async e => {
      const b = e.target.closest('[data-supprimer]');
      if (!b) return;
      if (!confirm('Supprimer cet examen de ce navigateur ? Ses images et son compte rendu seront effacés.')) return;
      await S.supprimer(b.dataset.supprimer);
      annoncer('Examen supprimé.');
      afficherExamens();
    });
    q('#dc-tout-supprimer').addEventListener('click', async () => {
      if (!confirm('Supprimer tous les examens gardés dans ce navigateur ?')) return;
      await S.toutSupprimer();
      annoncer('Tous les examens ont été supprimés.');
      afficherExamens();
    });
    afficherExamens();
  }

  window.RHDicomEspace = { analyser, importer, afficherExamens };
  init();
})();
