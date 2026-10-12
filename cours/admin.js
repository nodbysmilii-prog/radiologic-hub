/* =========================================================
   RadiologicHub — Cours d'échoanatomie : administration de l'auteur
   ---------------------------------------------------------
   • Chaque élément (texte, 6 schémas, 18 modèles 3D, images) a un statut :
     À valider (par défaut), Approuvé, À corriger (avec commentaire).
     Approuver = approuver la VERSION actuelle : toute modification
     ultérieure remet l'élément « À valider » (rien n'est montré aux
     élèves entre-temps).
   • Images échographiques : une par schéma, anonymisée, orientation
     (médial à gauche ou à droite), étiquettes à faire glisser sur l'image.
   • Bloc « Source / crédits » de la page du cours.
   Même compte administrateur que les autres modules (Supabase) ;
   en démonstration, tout reste dans ce navigateur.
   ========================================================= */
(function () {
  'use strict';
  const N = window.RHCoursNoyau, S = window.RHIschio, api = window.RHCours.api;
  const COURS = 'echo-mi-ischio-jambiers', PAGE = 'cours/ischio-jambiers.html', BASE = 'public/models/ischio-jambiers/';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const zone = $('#cours-admin');
  const msg = (classe, html) => `<p class="adm-msg ${classe}" role="status">${html}</p>`;

  let manifeste = null, versionTexte = null, validations = [], images = {}, reglages = {}, elements = [], etats = {};
  const editeurs = {};                                     // schéma → { fichier, url, orientation, etiquettes, actif }

  /* ---------- Connexion ---------- */
  async function demarrer() {
    if (api.mode === 'demo') $('#adm-demo').hidden = false;
    try { await api.pret; } catch (e) { zone.innerHTML = msg('is-erreur', esc(e.message)); return; }
    const session = await api.session();
    if (!session) {
      zone.innerHTML = `<div class="fcard" style="--c: var(--ink)"><h2>Connexion de l'auteur</h2>
        <p class="adm-aide">Même compte que l'administration de la Bibliothèque, de la Communauté et des Remplacements.</p>
        <p><button class="btn btn-ink" type="button" id="adm-google">Continuer avec Google</button></p>
        <form id="adm-lien" class="adm-champs"><label>Adresse e-mail <input type="text" inputmode="email" id="adm-email" required autocomplete="email" placeholder="votre.adresse@exemple.com"></label>
          <button class="btn btn-outline" type="submit">Recevoir un lien de connexion</button></form><div id="adm-co-msg"></div></div>`;
      $('#adm-google').addEventListener('click', () => api.connexionGoogle().catch(e => { $('#adm-co-msg').innerHTML = msg('is-erreur', esc(e.message)); }));
      $('#adm-lien').addEventListener('submit', async e => {
        e.preventDefault();
        try { await api.connexionEmail($('#adm-email').value); $('#adm-co-msg').innerHTML = msg('is-ok', 'Lien envoyé : ouvrez-le depuis votre messagerie.'); }
        catch (er) { $('#adm-co-msg').innerHTML = msg('is-erreur', esc(er.message)); }
      });
      return;
    }
    if (!(await api.estAdmin())) {
      zone.innerHTML = `<div class="fcard" style="--c: var(--k-grave)">${msg('is-erreur', `Le compte ${esc(session.email)} n'est pas administrateur.`)}
        <p><button class="btn btn-outline" type="button" id="adm-sortie">Se déconnecter</button></p></div>`;
      $('#adm-sortie').addEventListener('click', async () => { await api.deconnexion(); location.reload(); });
      return;
    }
    if (api.mode !== 'demo') {
      $('#adm-session').innerHTML = `${esc(session.email)} · <button class="btn btn-outline btn-sm" type="button" id="adm-sortie">Se déconnecter</button>`;
      $('#adm-sortie').addEventListener('click', async () => { await api.deconnexion(); location.reload(); });
    }
    try {
      const [man, html] = await Promise.all([
        fetch(`${BASE}manifest.json`, { cache: 'no-cache' }).then(r => r.json()),
        fetch(PAGE, { cache: 'no-cache' }).then(r => r.text()),
      ]);
      manifeste = man;
      versionTexte = N.versionTexte(new DOMParser().parseFromString(html, 'text/html'));
      await recharger();
      rendre();
    } catch (e) { zone.innerHTML = msg('is-erreur', `Chargement impossible : ${esc(e.message)}`); }
  }

  async function recharger() {
    const [v, imgs, r] = await Promise.all([api.validations(COURS, { admin: true }), api.images(COURS, { admin: true }), api.reglages(COURS)]);
    validations = v;
    images = Object.fromEntries(imgs.map(i => [i.schema, i]));
    reglages = r || {};
    elements = N.catalogue({
      texte: versionTexte,
      schemas: S.SCHEMAS.map(s => ({ ...s, version: S.version(s.id) })),
      modeles: manifeste.modeles,
      images: imgs,
    });
    etats = N.etats(elements, validations);
  }

  /* ---------- Rendu ---------- */
  const badge = st => `<span class="cours-statut is-${st}">${esc(N.STATUTS[st])}</span>`;
  const el = id => elements.find(e => e.element === id);

  function ligne(e, { vignette = '', details = '', extra = '' } = {}) {
    const st = etats[e.element];
    const valide = st.versionValidee && st.versionValidee !== e.version ? ` · version validée : <code>${esc(st.versionValidee)}</code>` : '';
    const quand = st.maj_le ? ` · ${esc(N.dateCourte(st.maj_le))}` : '';
    return `<article class="adm-el" data-element="${esc(e.element)}">
      <div>${vignette}<h3>${esc(e.libelle)} ${badge(st.statut)}</h3>
        <p class="adm-meta">${esc(N.TYPES[e.type])} · version actuelle <code>${esc(e.version)}</code>${valide}${quand}${extra}</p>
        ${st.commentaire ? `<p class="adm-commentaire">À corriger : ${esc(st.commentaire)}</p>` : ''}</div>
      <div class="adm-actions">
        ${st.statut !== 'approuve' ? '<button type="button" class="btn btn-ink btn-sm" data-action="approuver">Approuver</button>' : ''}
        <button type="button" class="btn btn-outline btn-sm" data-action="corriger">À corriger</button>
        ${st.statut !== 'a_valider' ? '<button type="button" class="btn btn-outline btn-sm" data-action="reinitialiser">Remettre à valider</button>' : ''}
      </div>
      <form class="adm-correction" hidden><label class="sr-only" for="c-${esc(e.element)}">Ce qu'il faut corriger</label>
        <textarea id="c-${esc(e.element)}" maxlength="1000" placeholder="Ce qu'il faut corriger (visible de vous seul)">${esc(st.commentaire || '')}</textarea>
        <p><button type="submit" class="btn btn-ink btn-sm">Enregistrer « À corriger »</button> <button type="button" class="btn btn-outline btn-sm" data-action="annuler">Annuler</button></p></form>
      ${details}
    </article>`;
  }

  function rendre() {
    const r = N.resume(elements, etats);
    zone.innerHTML = `
      <div class="adm-resume">${Object.keys(r).map(k => `<span class="cours-statut is-${k}">${esc(N.STATUTS[k])} : ${r[k]}</span>`).join('')}</div>
      <div class="adm-liens">
        <a class="btn btn-outline btn-sm" href="${PAGE}">Voir la page comme un élève</a>
        <a class="btn btn-ink btn-sm" href="${PAGE}?apercu=admin">Aperçu complet, avec les statuts</a>
        <a class="btn btn-outline btn-sm" href="cours/ischio-jambiers/A-VERIFIER.md">Incertitudes à vérifier (A-VERIFIER.md)</a>
      </div>
      <section class="adm-section" id="adm-texte"><h2>Texte du cours</h2><div class="adm-liste">${ligne(el('texte'), { extra: ` · <a href="${PAGE}?apercu=admin">relire</a>` })}</div></section>
      <section class="adm-section" id="adm-schemas"><h2>Schémas de coupe</h2><div class="adm-liste">${S.SCHEMAS.map(s => ligne(el(`schema-${s.id}`), {
        vignette: `<div class="adm-vignette">${S.svg(s.id, { etiquettes: 'numeros', legende: false, entete: false })}</div>`,
        extra: ` · <a href="${PAGE}?apercu=admin#coupe-${s.id}">voir dans la page</a>`,
        details: `<details><summary>Ce qui est représenté, incertitudes${s.relecture ? ', relecture' : ''}</summary>
          <ul>${s.represente.map(x => `<li>${esc(x)}</li>`).join('')}</ul><p><b>Incertitudes</b></p><ul>${s.incertitudes.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
          ${s.relecture ? `<p>Relecture du ${esc(N.dateCourte(s.relecture.date))} : ${esc(s.relecture.avis)}.</p>` : ''}</details>`,
      })).join('')}</div></section>
      <section class="adm-section" id="adm-modeles"><h2>Modèles 3D <button type="button" class="btn btn-outline btn-sm" data-tout-approuver="modele">Approuver tous les modèles en attente</button></h2>
        <p class="adm-aide">${manifeste.modeles.length} fichiers, ${(manifeste.total_octets / 1048576).toFixed(2).replace('.', ',')} Mo, ${esc(manifeste.licence)}. « Voir en 3D » ouvre l'aperçu avec la structure en surbrillance.</p>
        <div class="adm-liste">${manifeste.modeles.map(m => ligne(el(`modele-${m.id}`), {
          extra: ` · ${esc(m.fichier)}, ${(m.octets / 1024).toFixed(0)} Ko, ${m.triangles} triangles · <a href="${PAGE}?apercu=admin&amp;modele=${esc(m.id)}#modele-3d">voir en 3D</a>`,
          details: m.modifications.length ? `<details><summary>Modifications</summary><ul>${m.modifications.map(x => `<li>${esc(x)}</li>`).join('')}</ul></details>` : '',
        })).join('')}</div></section>
      <section class="adm-section" id="adm-images"><h2>Images échographiques</h2>
        <p class="adm-aide">Une image par schéma, affichée à côté de lui. Elle n'est visible des élèves qu'une fois approuvée, et chaque modification (fichier, orientation, étiquettes) la remet « À valider ».</p>
        <div class="adm-liste">${S.SCHEMAS.map(carteImage).join('')}</div></section>
      <section class="adm-section adm-credits" id="adm-credits"><h2>Source / crédits</h2>
        <p class="adm-aide">Affiché en bas de la page du cours, sous « Sources ». Les retours à la ligne sont conservés.</p>
        <label class="sr-only" for="adm-credits-texte">Source / crédits</label>
        <textarea id="adm-credits-texte" maxlength="3000" rows="4" placeholder="Auteur, démonstration, remerciements…">${esc(reglages.credits || '')}</textarea>
        <p><button type="button" class="btn btn-ink btn-sm" id="adm-credits-ok">Enregistrer</button></p><div id="adm-credits-msg"></div></section>`;
    S.SCHEMAS.forEach(s => brancherEditeur(s.id));
  }

  /* ---------- Images : carte et éditeur ---------- */
  function carteImage(s) {
    const i = images[s.id];
    const ed = editeurs[s.id] = editeurs[s.id] && editeurs[s.id].modifie ? editeurs[s.id] : {   // garde les changements non enregistrés
      fichier: null, url: i ? i.url : null, orientation: i ? i.orientation : 'medial_gauche',
      etiquettes: i ? (i.etiquettes || []).map(e => ({ ...e })) : [], ratio: i && i.largeur ? `${i.largeur}/${i.hauteur}` : null,
    };
    const validation = i ? ligne(el(`image-${s.id}`)) : '';
    return `<article class="adm-image" data-schema="${s.id}">
      <div class="adm-image-tete"><h3>${esc(`${s.court} · ${s.titre}`)}</h3>${i ? '' : '<span class="adm-aide">Aucune image pour l\'instant</span>'}</div>
      <div class="adm-image-corps">
        <div class="adm-editeur">${ed.url ? `<div class="echo"${ed.ratio ? ` style="aspect-ratio:${ed.ratio}"` : ''}><img src="${esc(ed.url)}" alt="Votre image pour ${esc(s.court)}"><div class="echo-etiquettes"></div></div>`
          : '<div class="echo-vide"><p>Choisissez une image à droite.</p></div>'}</div>
        <div class="adm-champs">
          <label>Image (JPEG, PNG ou WebP) <input type="file" accept="image/jpeg,image/png,image/webp" data-fichier></label>
          <p class="adm-aide">Image <b>anonymisée</b> : retirez nom, date et numéro du patient avant l'envoi. Le fichier est réduit et réenregistré sans métadonnées, mais le texte incrusté dans l'image reste visible.</p>
          <label>Orientation de votre image <select data-orientation>
            <option value="medial_gauche"${ed.orientation === 'medial_gauche' ? ' selected' : ''}>Médial à gauche de l'écran</option>
            <option value="medial_droite"${ed.orientation === 'medial_droite' ? ' selected' : ''}>Médial à droite de l'écran</option></select></label>
          <p class="adm-aide">Le schéma ${esc(s.court)} s'affichera dans la même orientation.</p>
          <div class="adm-etiqs" data-etiqs></div>
          <p><button type="button" class="btn btn-outline btn-sm" data-ajouter>Ajouter une étiquette</button>
             <button type="button" class="btn btn-outline btn-sm" data-reprendre>Reprendre les étiquettes du schéma</button></p>
          <p class="adm-aide">Faites glisser chaque étiquette sur l'image : son point orange marque la structure.</p>
          <p><button type="button" class="btn btn-ink btn-sm" data-enregistrer>Enregistrer l'image</button>
             ${i ? '<button type="button" class="btn btn-outline btn-sm" data-supprimer>Supprimer l\'image</button>' : ''}</p>
          <div data-msg></div>
        </div>
      </div>
      ${validation ? `<div class="adm-liste">${validation}</div>` : ''}
    </article>`;
  }

  function brancherEditeur(id) {
    const carte = $(`.adm-image[data-schema="${id}"]`), ed = editeurs[id];
    const liste = $('[data-etiqs]', carte);
    const dessiner = () => {
      const calque = $('.echo-etiquettes', carte);         // recherché à chaque fois : l'image peut avoir changé
      if (calque) calque.innerHTML = ed.etiquettes.map((e, n) => `<span class="echo-etiquette${ed.actif === n ? ' is-active' : ''}" data-n="${n}" style="left:${e.x}%;top:${e.y}%"><i></i>${esc(e.texte)}</span>`).join('');
      liste.innerHTML = ed.etiquettes.map((e, n) => `<div class="adm-etiq"><label class="sr-only" for="e-${id}-${n}">Étiquette ${n + 1}</label>
        <input type="text" id="e-${id}-${n}" value="${esc(e.texte)}" maxlength="80" data-texte="${n}"><button type="button" class="btn btn-outline btn-sm" data-retirer="${n}" aria-label="Retirer l'étiquette ${n + 1}">Retirer</button></div>`).join('');
    };
    dessiner();
    carte.addEventListener('input', e => {
      if (e.target.dataset.texte != null) {
        ed.modifie = true;
        ed.etiquettes[+e.target.dataset.texte].texte = e.target.value;
        const span = carte.querySelector(`.echo-etiquette[data-n="${e.target.dataset.texte}"]`);
        if (span) span.lastChild.textContent = e.target.value;
      }
    });
    carte.addEventListener('change', e => {
      if (e.target.dataset.orientation != null) { ed.orientation = e.target.value; ed.modifie = true; }
      if (e.target.dataset.fichier != null && e.target.files[0]) {
        ed.fichier = e.target.files[0];
        ed.modifie = true;
        if (ed.urlLocale) URL.revokeObjectURL(ed.urlLocale);
        ed.url = ed.urlLocale = URL.createObjectURL(ed.fichier);
        ed.ratio = null;
        const corps = $('.adm-editeur', carte);
        corps.innerHTML = `<div class="echo"><img src="${ed.url}" alt="Nouvelle image (non enregistrée)"><div class="echo-etiquettes"></div></div>`;
        dessiner();
        glisser(id);
      }
    });
    carte.addEventListener('click', async e => {
      const b = e.target.closest('button');
      if (!b) return;
      if (b.dataset.ajouter != null || b.dataset.reprendre != null || b.dataset.retirer != null) ed.modifie = true;
      if (b.dataset.ajouter != null) { ed.etiquettes.push({ texte: 'Nouvelle étiquette', x: 50, y: 50 }); ed.actif = ed.etiquettes.length - 1; dessiner(); const champs = $$('[data-texte]', liste); champs[champs.length - 1].select(); }
      if (b.dataset.reprendre != null) {
        const deja = new Set(ed.etiquettes.map(x => x.texte));
        const nouvelles = S.etiquettesNumerotees(id).filter(x => !deja.has(x.texte));
        // Rangées en colonne à gauche, réparties sur toute la hauteur de l'image : il reste à les faire glisser
        nouvelles.forEach((x, k) => ed.etiquettes.push({ texte: x.texte, x: 3, y: Math.round(5 + k * (90 / Math.max(1, nouvelles.length - 1))) }));
        ed.etiquettes = ed.etiquettes.slice(0, N.MAX_ETIQUETTES);
        dessiner();
      }
      if (b.dataset.retirer != null) { ed.etiquettes.splice(+b.dataset.retirer, 1); ed.actif = null; dessiner(); }
      if (b.dataset.enregistrer != null) {
        b.disabled = true;
        try {
          await api.enregistrerImage(COURS, id, { fichier: ed.fichier, orientation: ed.orientation, etiquettes: ed.etiquettes });
          delete editeurs[id];
          await recharger();
          rendre();
          const nouvelle = $(`.adm-image[data-schema="${id}"] [data-msg]`);
          if (nouvelle) nouvelle.innerHTML = msg('is-ok', 'Image enregistrée : elle est « À valider ».');
        } catch (er) { $('[data-msg]', carte).innerHTML = msg('is-erreur', esc(er.message)); b.disabled = false; }
      }
      if (b.dataset.supprimer != null && confirm('Supprimer cette image et ses étiquettes ?')) {
        await api.supprimerImage(COURS, id);
        delete editeurs[id];
        await recharger();
        rendre();
      }
    });
    glisser(id);
  }

  /* Glisser-déposer des étiquettes (souris et doigt), positions en % de l'image */
  function glisser(id) {
    const carte = $(`.adm-image[data-schema="${id}"]`), ed = editeurs[id];
    const cadre = $('.echo', carte);
    if (!cadre || cadre.dataset.branche) return;
    cadre.dataset.branche = '1';
    let n = null;
    cadre.addEventListener('pointerdown', e => {
      const span = e.target.closest('.echo-etiquette');
      if (!span) return;
      n = +span.dataset.n;
      ed.actif = n;
      $$('.echo-etiquette', cadre).forEach(x => x.classList.toggle('is-active', +x.dataset.n === n));
      span.setPointerCapture(e.pointerId);
      e.preventDefault();
    });
    cadre.addEventListener('pointermove', e => {
      if (n == null) return;
      const r = cadre.getBoundingClientRect();
      const [et] = N.normaliserEtiquettes([{ texte: 'x', x: (e.clientX - r.left) / r.width * 100, y: (e.clientY - r.top) / r.height * 100 }]);
      ed.etiquettes[n].x = et.x; ed.etiquettes[n].y = et.y;
      ed.modifie = true;
      const span = cadre.querySelector(`.echo-etiquette[data-n="${n}"]`);
      span.style.left = `${et.x}%`; span.style.top = `${et.y}%`;
    });
    const fin = () => { n = null; };
    cadre.addEventListener('pointerup', fin);
    cadre.addEventListener('pointercancel', fin);
  }

  /* ---------- Actions de validation ---------- */
  zone.addEventListener('click', async e => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.toutApprouver) {
      const enAttente = elements.filter(x => x.type === b.dataset.toutApprouver && etats[x.element].statut !== 'approuve');
      if (!enAttente.length || !confirm(`Approuver ${enAttente.length} modèle(s) dans leur version actuelle ?`)) return;
      b.disabled = true;
      for (const x of enAttente) await api.definirStatut(COURS, { element: x.element, type: x.type, version: x.version, statut: 'approuve' });
      await recharger(); rendre();
      return;
    }
    const art = b.closest('.adm-el');
    if (!art || !b.dataset.action) return;
    const x = el(art.dataset.element);
    const form = $('.adm-correction', art);
    if (b.dataset.action === 'corriger') { form.hidden = false; $('textarea', form).focus(); return; }
    if (b.dataset.action === 'annuler') { form.hidden = true; return; }
    b.disabled = true;
    if (b.dataset.action === 'approuver') await api.definirStatut(COURS, { element: x.element, type: x.type, version: x.version, statut: 'approuve' });
    if (b.dataset.action === 'reinitialiser') await api.reinitialiserStatut(COURS, x.element);
    await recharger(); rendre();
    const retour = $(`.adm-el[data-element="${x.element}"]`);
    if (retour) retour.scrollIntoView({ block: 'nearest' });
  });
  zone.addEventListener('submit', async e => {
    const form = e.target.closest('.adm-correction');
    if (!form) return;
    e.preventDefault();
    const x = el(form.closest('.adm-el').dataset.element);
    await api.definirStatut(COURS, { element: x.element, type: x.type, version: x.version, statut: 'a_corriger', commentaire: $('textarea', form).value.trim() });
    await recharger(); rendre();
  });
  zone.addEventListener('click', async e => {
    if (e.target.id !== 'adm-credits-ok') return;
    try {
      await api.enregistrerReglages(COURS, { credits: $('#adm-credits-texte').value });
      $('#adm-credits-msg').innerHTML = msg('is-ok', 'Crédits enregistrés.');
    } catch (er) { $('#adm-credits-msg').innerHTML = msg('is-erreur', esc(er.message)); }
  });

  demarrer();
})();
