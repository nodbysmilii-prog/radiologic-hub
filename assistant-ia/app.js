/* =========================================================
   RadiologicHub — Assistant IA de rédaction (assistant-ia.html)
   ---------------------------------------------------------
   • Modèles : ceux du service (cr-data.js) et « Mes modèles » de
     l'éditeur (même stockage : rh-cr-templates) ; le modèle choisi
     peut être ajusté pour un compte rendu puis enregistré.
   • Images : redimensionnées dans le navigateur (1568 px au plus),
     masquage des zones incrustées par glisser, ré-encodées en JPEG
     (sans métadonnées) avant l'envoi.
   • Résultat : compte rendu modifiable, « À vérifier » (dont les
     chiffres absents des notes), second regard à part ; « Ouvrir dans
     l'éditeur » le place dans le brouillon de comptes-rendus.html.
   ========================================================= */
(function () {
  'use strict';
  const IA = window.RHAssistantIA;
  const API = window.RHIAApi;
  const $ = id => document.getElementById(id);
  const store = {
    get(k, f) { try { const v = localStorage.getItem(k); return v === null ? f : JSON.parse(v); } catch (e) { return f; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } },
  };
  const CLE = { modeles: 'rh-cr-templates', brouillon: 'rh-cr-draft', choix: 'rh-ia-modele' };
  const MAX_COTE = 1568;

  let connecte = false, occupe = false;

  /* ---------- Modèles ---------- */
  const MODS = typeof CR_MODALITIES !== 'undefined' ? CR_MODALITIES : {};
  const SERVICE = (typeof CR_TEMPLATES !== 'undefined' ? CR_TEMPLATES : []).map(t => ({ id: t.id, title: t.title, text: t.text, mod: t.mod || '' }));
  const lirePerso = () => {
    const l = store.get(CLE.modeles, []);
    return Array.isArray(l) ? l.filter(t => t && typeof t.title === 'string' && typeof t.text === 'string') : [];
  };
  let modeles = [];
  const modeleCourant = () => modeles.find(m => m.id === $('ia-modele').value);

  function remplirModeles(choix) {
    modeles = [...lirePerso().map(t => ({ id: t.id || 'perso-' + t.title, title: t.title, text: t.text, mod: t.mod || '', mine: true })), ...SERVICE];
    const sel = $('ia-modele');
    sel.textContent = '';
    const groupes = [['Mes modèles', modeles.filter(m => m.mine)]]
      .concat(Object.keys(MODS).map(k => [MODS[k].label.replace(/­/g, ''), modeles.filter(m => !m.mine && m.mod === k)]))
      .concat([['Autres', modeles.filter(m => !m.mine && !MODS[m.mod])]]);
    groupes.forEach(([label, liste]) => {
      if (!liste.length) return;
      const og = document.createElement('optgroup');
      og.label = label;
      liste.forEach(m => { const o = document.createElement('option'); o.value = m.id; o.textContent = m.title; og.append(o); });
      sel.append(og);
    });
    const voulu = choix || store.get(CLE.choix, 'tdm-abdo-pelvienne-injectee');
    sel.value = modeles.some(m => m.id === voulu) ? voulu : (modeles[0] ? modeles[0].id : '');
    appliquerModele();
  }
  function appliquerModele() {
    const m = modeleCourant();
    $('ia-modele-texte').value = m ? m.text : '';
    store.set(CLE.choix, $('ia-modele').value);
    $('ia-modele-statut').textContent = '';
    actualiser();
  }
  $('ia-modele').addEventListener('change', appliquerModele);
  $('ia-modele-texte').addEventListener('input', () => { $('ia-modele-statut').textContent = 'Ajusté pour ce compte rendu.'; actualiser(); });

  $('ia-modele-garder').addEventListener('click', () => {
    const m = modeleCourant();
    const texte = $('ia-modele-texte').value.trim();
    if (!texte) return;
    const liste = lirePerso();
    let id;
    const existant = m && m.mine ? liste.find(t => (t.id || 'perso-' + t.title) === m.id) : null;
    if (existant) { existant.text = texte; id = m.id; }
    else {
      id = 'perso-' + Math.random().toString(36).slice(2, 10);
      liste.push({ id, title: (m ? m.title : 'Modèle') + ' — ma version', text: texte, mod: m ? m.mod : '' });
    }
    if (!store.set(CLE.modeles, liste)) { $('ia-modele-statut').textContent = 'Enregistrement impossible dans ce navigateur.'; return; }
    remplirModeles(id);
    $('ia-modele-statut').textContent = 'Enregistré dans « Mes modèles », aussi visible dans l\'éditeur de comptes rendus.';
  });

  /* ---------- Images : réduction, masquage, export JPEG ---------- */
  const images = [];

  function chargerImage(fichier) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(fichier);
      const img = new Image();
      img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image illisible : ' + fichier.name)); };
      img.src = url;
    });
  }

  function ajouterImage(img) {
    const k = Math.min(1, MAX_COTE / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.naturalWidth * k);
    canvas.height = Math.round(img.naturalHeight * k);
    const ctx = canvas.getContext('2d');
    const item = { img, canvas, rects: [] };
    const dessiner = provisoire => {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#000';
      item.rects.forEach(r => ctx.fillRect(r.x, r.y, r.w, r.h));
      if (provisoire) {
        ctx.strokeStyle = '#f2ab2f'; ctx.lineWidth = Math.max(2, canvas.width / 300);
        ctx.strokeRect(provisoire.x, provisoire.y, provisoire.w, provisoire.h);
      }
    };
    item.dessiner = dessiner;
    dessiner();

    const point = e => {
      const b = canvas.getBoundingClientRect();
      return { x: (e.clientX - b.left) * canvas.width / b.width, y: (e.clientY - b.top) * canvas.height / b.height };
    };
    const rect = (a, b) => ({ x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(a.x - b.x), h: Math.abs(a.y - b.y) });
    let depart = null;
    canvas.addEventListener('pointerdown', e => { depart = point(e); canvas.setPointerCapture(e.pointerId); });
    canvas.addEventListener('pointermove', e => { if (depart) dessiner(rect(depart, point(e))); });
    const finir = e => {
      if (!depart) return;
      const r = rect(depart, point(e));
      depart = null;
      if (r.w > 4 && r.h > 4) item.rects.push(r);
      dessiner();
    };
    canvas.addEventListener('pointerup', finir);
    canvas.addEventListener('pointercancel', () => { depart = null; dessiner(); });

    const carte = document.createElement('figure');
    carte.className = 'ia-image';
    carte.style.margin = '0';
    const actions = document.createElement('div');
    actions.className = 'ia-image-actions';
    const bouton = (texte, fn) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = texte; b.addEventListener('click', fn); actions.append(b); };
    bouton('Annuler le dernier masque', () => { item.rects.pop(); dessiner(); });
    bouton('Retirer', () => { images.splice(images.indexOf(item), 1); carte.remove(); majImages(); });
    carte.append(canvas, actions);
    $('ia-images').append(carte);
    images.push(item);
  }

  function majImages() {
    $('ia-images-aide').hidden = !images.length;
    $('ia-fichiers').disabled = images.length >= IA.LIMITES.images;
  }

  $('ia-fichiers').addEventListener('change', async e => {
    const fichiers = [...e.target.files];
    e.target.value = '';
    const refus = [];
    for (const f of fichiers) {
      if (images.length >= IA.LIMITES.images) { refus.push(f.name + ' (5 images au plus)'); continue; }
      if (!/^image\/(png|jpeg|webp)$/.test(f.type)) { refus.push(f.name + ' (format PNG, JPEG ou WebP)'); continue; }
      try { ajouterImage(await chargerImage(f)); } catch (err) { refus.push(err.message); }
    }
    majImages();
    if (refus.length) montrerAlerte('Non ajouté : ' + refus.join(' ; ') + '.');
    else actualiser();
  });

  const exporterImages = () => images.map(it => {
    it.dessiner();
    return { type: 'image/jpeg', donnees: it.canvas.toDataURL('image/jpeg', 0.9).split(',')[1] };
  });

  /* ---------- Contrôles avant envoi ---------- */
  function montrerAlerte(texte) { $('ia-alerte').hidden = !texte; $('ia-alerte').textContent = texte || ''; }
  function reperes() { return IA.donneesIdentifiantes([$('ia-notes').value, $('ia-indication').value, $('ia-anterieur').value].join('\n')); }
  function actualiser() {
    const ids = reperes();
    montrerAlerte(ids.length ? 'Possible donnée identifiante : ' + ids.join(', ') + '. Retirez-la avant l\'envoi.' : '');
    $('ia-go').disabled = occupe || !connecte || !$('ia-anonyme').checked || !$('ia-notes').value.trim()
      || !$('ia-modele-texte').value.trim() || ids.length > 0;
  }
  ['ia-notes', 'ia-indication', 'ia-anterieur'].forEach(id => $(id).addEventListener('input', actualiser));
  $('ia-anonyme').addEventListener('change', actualiser);

  function statut(id, texte, erreur) { $(id).textContent = texte || ''; $(id).classList.toggle('is-erreur', !!erreur); }

  /* ---------- Rédaction ---------- */
  function demande() {
    const m = modeleCourant();
    const sexe = document.querySelector('input[name="ia-sexe"]:checked');
    return {
      modele: $('ia-modele-texte').value,
      titreModele: m ? m.title : '',
      notes: $('ia-notes').value,
      indication: $('ia-indication').value,
      anterieur: $('ia-anterieur').value,
      technique: $('ia-technique').value,
      pdl: $('ia-pdl').value.trim(),
      sexe: sexe ? sexe.value : '',
      toutNormal: $('ia-normal').checked,
    };
  }

  function afficher(r, d) {
    $('ia-cr').value = r.cr || '';
    const chiffres = IA.chiffresInventes(r.cr, [d.notes, d.indication, d.anterieur, d.pdl, d.technique, d.modele]);
    const ul = $('ia-verifier-liste');
    ul.textContent = '';
    chiffres.forEach(n => { const li = document.createElement('li'); li.className = 'is-chiffre'; li.textContent = 'Chiffre absent de vos notes : ' + n + '. Vérifiez-le.'; ul.append(li); });
    (r.verifier || []).forEach(t => { const li = document.createElement('li'); li.textContent = t; ul.append(li); });
    $('ia-verifier').hidden = !ul.children.length;
    $('ia-regard-texte').textContent = r.secondRegard || '';
    $('ia-regard').hidden = !r.secondRegard;
    majBoutonsCR();
  }

  $('ia-form').addEventListener('submit', async e => {
    e.preventDefault();
    if ($('ia-go').disabled) return;
    const d = demande();
    const probleme = IA.verifierDemande(d);
    if (probleme) { statut('ia-statut', probleme, true); return; }
    d.images = exporterImages();
    occupe = true; actualiser();
    statut('ia-statut', 'Rédaction en cours… (30 secondes à une minute)');
    try {
      const r = await API.rediger(d);
      afficher(r, d);
      statut('ia-statut', r.demo ? 'Démonstration : réponse d\'exemple, rien n\'a été envoyé.'
        : r.tronque ? 'Réponse coupée : raccourcissez les notes.' : 'Brouillon prêt. Relisez, corrigez, copiez.', !!r.tronque);
    } catch (err) {
      statut('ia-statut', err.message || 'Erreur de connexion. Réessayez.', true);
    } finally {
      occupe = false; actualiser();
    }
  });

  /* ---------- Copier, ouvrir dans l'éditeur ---------- */
  let confirmerEditeur = false;
  function majBoutonsCR() {
    const vide = !$('ia-cr').value.trim();
    $('ia-copier').disabled = vide;
    $('ia-editeur').disabled = vide;
    confirmerEditeur = false;
    $('ia-editeur').textContent = 'Ouvrir dans l\'éditeur';
  }
  $('ia-cr').addEventListener('input', majBoutonsCR);

  $('ia-copier').addEventListener('click', () => {
    const ta = $('ia-cr');
    const repli = () => { ta.focus(); ta.select(); statut('ia-cr-statut', 'Texte sélectionné : Ctrl + C (ou Cmd + C) pour copier.'); };
    try {
      navigator.clipboard.writeText(ta.value).then(() => statut('ia-cr-statut', 'Copié.'), repli);
    } catch (err) { repli(); }
  });

  $('ia-editeur').addEventListener('click', () => {
    const actuel = store.get(CLE.brouillon, '');
    const texte = $('ia-cr').value;
    if (!confirmerEditeur && typeof actuel === 'string' && actuel.trim() && actuel !== texte) {
      confirmerEditeur = true;
      $('ia-editeur').textContent = 'Remplacer le brouillon de l\'éditeur ?';
      statut('ia-cr-statut', 'L\'éditeur contient déjà un brouillon : cliquez à nouveau pour le remplacer.');
      return;
    }
    if (!store.set(CLE.brouillon, texte)) { statut('ia-cr-statut', 'Impossible d\'écrire dans ce navigateur : utilisez Copier.', true); return; }
    location.href = 'comptes-rendus.html';
  });

  /* ---------- Accès ---------- */
  function majAcces(session) {
    connecte = API.demo || !!session;
    $('ia-acces').classList.toggle('ia-demo', API.demo);
    $('ia-connexion').hidden = API.demo || !!session;
    $('ia-deconnexion').hidden = API.demo || !session;
    $('ia-acces-texte').textContent = API.demo
      ? 'Mode démonstration : le serveur n\'est pas encore configuré (voir assistant-ia/INSTALLATION.md). Le bouton renvoie un exemple, sans rien envoyer.'
      : session ? 'Connecté : ' + session.email : 'Outil réservé aux comptes autorisés. Connectez-vous avec votre adresse e-mail.';
    actualiser();
  }

  $('ia-connexion').addEventListener('submit', async e => {
    e.preventDefault();
    const email = $('ia-email').value.trim();
    if (!email) return;
    try {
      await API.connexion(email);
      $('ia-acces-texte').textContent = 'Lien envoyé à ' + email + ' : ouvrez-le sur cet appareil.';
      $('ia-connexion').hidden = true;
    } catch (err) {
      $('ia-acces-texte').textContent = 'Envoi impossible : ' + err.message;
    }
  });
  $('ia-deconnexion').addEventListener('click', async () => { await API.deconnexion(); majAcces(null); });

  remplirModeles();
  majImages();
  majBoutonsCR();
  if (API.demo) majAcces(null);
  else {
    API.init().then(s => { majAcces(s); API.surChangement(majAcces); })
      .catch(err => { $('ia-acces-texte').textContent = 'Connexion au serveur impossible : ' + err.message; });
  }
})();
