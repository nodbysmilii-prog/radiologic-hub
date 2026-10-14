/* =========================================================
   Espace DICOM — page de la visionneuse : OHIF (dicom/ohif/, préparé
   par espace-dicom/visionneuse/installer-ohif.js) dans un cadre, le
   compte rendu à côté (onglet sur téléphone).
   Mode démonstration : les images de l'examen, gardées dans ce
   navigateur, reçoivent des adresses blob: du même site ; OHIF les lit
   par sa source « dicomjson ». En service (étape 3), OHIF lira le
   serveur de l'Espace DICOM (DICOMweb) avec le jeton de session.
   ========================================================= */
(function () {
  'use strict';

  const q = s => document.querySelector(s);
  const S = window.RHDicomStockage, M = window.RHDicomManifeste, L = window.RHDicomLecture;
  const etude = new URLSearchParams(location.search).get('etude') || '';
  const cadre = q('#dv-ohif'), message = q('#dv-message'), texte = q('#dv-cr-texte'), etat = q('#dv-cr-etat');

  function montrer(t) {
    message.textContent = t;
    message.hidden = false;
    cadre.hidden = true;
  }

  /* ---------- Compte rendu (à côté des images) ---------- */
  const heure = iso => new Date(iso).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
  let minuterie = null, dernier = '';
  async function enregistrer() {
    clearTimeout(minuterie);
    if (texte.value === dernier) return;
    try {
      const cr = await S.enregistrerCompteRendu(etude, texte.value);
      dernier = cr.texte;
      etat.textContent = `Enregistré à ${heure(cr.majLe).split(' ').pop()}`;
    } catch (e) {
      etat.textContent = `Non enregistré : ${e.message}`;
    }
  }
  texte.addEventListener('input', () => { etat.textContent = 'Modifié…'; clearTimeout(minuterie); minuterie = setTimeout(enregistrer, 1500); });
  q('#dv-cr-enregistrer').addEventListener('click', enregistrer);
  window.addEventListener('pagehide', () => { if (texte.value !== dernier) S.enregistrerCompteRendu(etude, texte.value); });

  // Ordinateur : afficher ou masquer le compte rendu ; téléphone : onglets
  const panneau = q('#dv-cr'), basculer = q('#dv-basculer');
  basculer.addEventListener('click', () => {
    panneau.hidden = !panneau.hidden;
    basculer.setAttribute('aria-pressed', String(!panneau.hidden));
  });
  const ongletImages = q('#dv-onglet-images'), ongletCr = q('#dv-onglet-cr');
  function onglet(cr) {
    document.body.classList.toggle('voir-cr', cr);
    ongletImages.classList.toggle('is-actif', !cr);
    ongletCr.classList.toggle('is-actif', cr);
    ongletImages.setAttribute('aria-selected', String(!cr));
    ongletCr.setAttribute('aria-selected', String(cr));
  }
  ongletImages.addEventListener('click', () => onglet(false));
  ongletCr.addEventListener('click', () => onglet(true));

  /* ---------- Ouverture de l'examen ---------- */
  async function ouvrir() {
    if (!etude) return montrer('Aucun examen choisi : retournez à « Mes examens ».');
    let ex, instances;
    try {
      ex = await S.examen(etude);
      if (!ex) return montrer('Cet examen n\'est pas (ou plus) gardé dans ce navigateur : retournez à « Mes examens ».');
      instances = await S.instancesEtude(etude);
    } catch (e) {
      return montrer(e.message);
    }
    q('#dv-patient').textContent = ex.patientNom || 'Sans nom';
    q('#dv-examen').textContent = [ex.description, L.formaterDate(ex.date), `${instances.length} images`].filter(Boolean).join(' · ');
    document.title = `${ex.description || 'Examen'} — Visionneuse — Espace DICOM`;

    const cr = await S.compteRendu(etude);
    texte.value = dernier = (cr && cr.texte) || '';
    if (cr) etat.textContent = `Enregistré le ${heure(cr.majLe)}`;

    if (!instances.length) return montrer('Cet examen ne contient aucune image.');
    const urls = new Map(instances.map(i => [i.sopUid, URL.createObjectURL(i.fichier)]));
    const manifeste = M.construireManifeste(instances, sop => urls.get(sop));
    const adresse = URL.createObjectURL(new Blob([JSON.stringify(manifeste)], { type: 'application/json' }));
    const route = `/viewer/dicomjson?url=${encodeURIComponent(adresse)}&StudyInstanceUIDs=${encodeURIComponent(etude)}`;
    cadre.src = `dicom/ohif/index.html?route=${encodeURIComponent(route)}`;
  }

  ouvrir();
})();
