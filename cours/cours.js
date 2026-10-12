/* =========================================================
   RadiologicHub — Cours d'échoanatomie : page élève
   ---------------------------------------------------------
   • Rien n'est montré aux élèves sans l'approbation de l'auteur, dans
     la version actuelle de chaque élément (texte, schémas, modèles 3D,
     images) : sinon « Cours en préparation » ou élément absent.
   • ?apercu=admin (auteur connecté ; ouvert à tous en démonstration) :
     tout est affiché, avec le statut de chaque élément.
   • Schémas : étiquettes en texte (ordinateur) ou numérotées (téléphone),
     bouton « Inverser gauche/droite » ; orientation par défaut alignée
     sur l'image de l'auteur quand il y en a une.
   • Modèle 3D : chargé au clic sur « Voir en 3D » (téléphone) ou quand
     la section arrive à l'écran (ordinateur) ; sonde mobile, 3 positions
     prédéfinies (tiers proximal, moyen, distal) et schéma de la coupe.
   ========================================================= */
(function () {
  'use strict';
  const N = window.RHCoursNoyau, S = window.RHIschio, api = window.RHCours.api;
  const main = document.getElementById('cours');
  const COURS = main.dataset.cours, BASE = main.dataset.modeles;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const telephone = window.matchMedia('(max-width: 760px)');
  const VERSION_TEXTE = N.versionTexte(document);          // avant toute modification de la page
  const params = new URLSearchParams(location.search);
  const TIERS_NOMS = { proximal: 'Tiers proximal', moyen: 'Tiers moyen', distal: 'Tiers distal' };

  let apercu = false, manifeste = null, etats = {}, images = {};
  const inverse = {};                                        // schéma → médial à droite ?
  const voit = el => apercu || !!(etats[el] && etats[el].visible);
  const badge = el => (apercu && etats[el] ? `<span class="cours-statut is-${etats[el].statut}">${esc(N.STATUTS[etats[el].statut])}</span>` : '');

  /* ---------- Démarrage ---------- */
  async function demarrer() {
    try {
      apercu = params.get('apercu') === 'admin' && await api.estAdmin();
      const [man, validations, imgs, reglages] = await Promise.all([
        fetch(`${BASE}manifest.json`, { cache: 'no-cache' }).then(r => { if (!r.ok) throw new Error('manifeste des modèles introuvable'); return r.json(); }),
        api.validations(COURS, { admin: apercu }),
        api.images(COURS, { admin: apercu }),
        api.reglages(COURS),
      ]);
      manifeste = man;
      images = Object.fromEntries(imgs.map(i => [i.schema, i]));
      const elements = N.catalogue({
        texte: VERSION_TEXTE,
        schemas: S.SCHEMAS.map(s => ({ ...s, version: S.version(s.id) })),
        modeles: man.modeles,
        images: imgs,
      });
      etats = N.etats(elements, validations);
      if (apercu) barreAuteur(elements);
      if (!voit('texte')) { $('#cours-attente').hidden = false; return; }
      $('#cours-contenu').hidden = false;
      if (apercu) $('#squelette').insertAdjacentHTML('beforebegin', `<p class="cours-statut-texte">Texte du cours : ${badge('texte')}</p>`);
      S.SCHEMAS.forEach(s => { const i = images[s.id]; inverse[s.id] = !!(i && voit(`image-${s.id}`) && i.orientation === 'medial_droite'); });
      rendreSchemas();
      preparer3D();
      rendreCredits(reglages.credits);
      if (location.hash) { const cible = document.getElementById(location.hash.slice(1)); if (cible) cible.scrollIntoView(); }
    } catch (e) {
      $('#cours-attente').hidden = false;
      $('#cours-attente .fcard').insertAdjacentHTML('beforeend', `<p class="cours-erreur">Chargement impossible : ${esc(e.message)}</p>`);
    }
  }

  /* ---------- Bandeau de l'auteur (aperçu) ---------- */
  function barreAuteur(elements) {
    const compte = type => {
      const els = elements.filter(e => e.type === type);
      return `${els.filter(e => etats[e.element].statut === 'approuve').length}/${els.length}`;
    };
    const barre = $('#cours-barre');
    barre.hidden = false;
    barre.innerHTML = `<div class="container"><p><b>Aperçu de l'auteur</b>${api.mode === 'demo' ? ' (démonstration : statuts gardés dans ce navigateur)' : ''} — tout est affiché, avec son statut.
      Approuvés : texte ${compte('texte')} · schémas ${compte('schema')} · modèles ${compte('modele')} · images ${compte('image')}.</p>
      <p><a class="btn btn-outline btn-sm" href="${location.pathname}">Vue élève</a> <a class="btn btn-ink btn-sm" href="../cours-admin.html">Administration</a></p></div>`;
  }

  /* ---------- Schémas de coupe et images ---------- */
  function legendeHtml() {
    return `<ul class="coupe-legende" aria-label="Légende commune des schémas">${S.LEGENDE.map(l => `<li><span class="pastille-legende is-${l.cle}" aria-hidden="true"></span>${esc(l.texte)}</li>`).join('')}</ul>
      <p class="coupe-orientation"><b>M</b> médial · <b>L</b> latéral · <b>S</b> superficiel (côté sonde) · <b>P</b> profond. Coupes transversales, patient à plat ventre ; par défaut, médial à gauche de l'écran.</p>`;
  }
  const schemasVisibles = () => S.SCHEMAS.filter(s => voit(`schema-${s.id}`));

  function svgSchema(id, { compact = false } = {}) {
    const mode = compact || telephone.matches ? 'numeros' : 'texte';
    const liste = mode === 'numeros'
      ? `<ol class="coupe-liste">${S.etiquettesNumerotees(id, { inverse: inverse[id] }).map(e => `<li value="${e.n}">${esc(e.texte)}</li>`).join('')}</ol>` : '';
    return `<div class="coupe-svg">${S.svg(id, { inverse: inverse[id], etiquettes: mode, legende: false })}</div>${liste}`;
  }

  function imageHtml(s) {
    const i = images[s.id];
    if (i && voit(`image-${s.id}`)) {
      const etiq = (i.etiquettes || []).map(e => `<span class="echo-etiquette" style="left:${e.x}%;top:${e.y}%"><i></i>${esc(e.texte)}</span>`).join('');
      return `<figure class="coupe-image">
          <div class="echo"${i.largeur && i.hauteur ? ` style="aspect-ratio:${i.largeur}/${i.hauteur}"` : ''}>
            <img src="${esc(i.url)}" alt="Image échographique de l'auteur : ${esc(s.titre)}" loading="lazy">
            <div class="echo-etiquettes">${etiq}</div>
          </div>
          <figcaption>${badge(`image-${s.id}`)} Image de l'auteur · médial ${i.orientation === 'medial_droite' ? 'à droite' : 'à gauche'}
            ${etiq ? '<button type="button" class="lien-bouton" data-etiquettes>Masquer les étiquettes</button>' : ''}</figcaption>
        </figure>`;
    }
    if (apercu) {
      return `<figure class="coupe-image is-vide"><div class="echo-vide"><p><b>Emplacement pour votre image échographique</b></p>
        <p>À ajouter dans l'administration (Images échographiques) : l'orientation et les étiquettes s'y règlent.</p></div></figure>`;
    }
    return '';
  }

  function rendreSchemas() {
    const zone = $('#cours-schemas'), liste = schemasVisibles();
    if (!liste.length) {
      if (!apercu) { $('#schemas').hidden = true; const t = $('[data-toc="schemas"]'); if (t) t.hidden = true; }
      return;
    }
    zone.innerHTML = legendeHtml() + Object.keys(N.TIERS).map(t => {
      const coupes = liste.filter(s => s.tiers === t);
      if (!coupes.length) return '';
      return `<h3 class="marker-sub">${TIERS_NOMS[t]}</h3>` + coupes.map(s => `
        <article class="coupe" id="coupe-${s.id}" data-schema="${s.id}">
          <div class="coupe-outils">${badge(`schema-${s.id}`)}
            <button type="button" class="btn btn-outline btn-sm" data-inverser aria-pressed="${inverse[s.id]}">Inverser gauche/droite</button></div>
          <div class="coupe-grille${imageHtml(s) ? '' : ' is-seul'}">
            <figure class="coupe-schema" aria-label="${esc(`${s.court} · ${s.titre}`)}">${svgSchema(s.id)}</figure>
            ${imageHtml(s)}
          </div>
        </article>`).join('');
    }).join('');
  }
  function redessinerSchema(id) {
    $$(`.coupe[data-schema="${id}"] .coupe-schema, .v3d-coupe[data-schema="${id}"]`).forEach(f => {
      f.innerHTML = svgSchema(id, { compact: f.classList.contains('v3d-coupe') });
    });
    $$(`.coupe[data-schema="${id}"] [data-inverser], .v3d-coupe-outils [data-inverser][data-schema="${id}"]`).forEach(b => b.setAttribute('aria-pressed', String(inverse[id])));
  }
  document.addEventListener('click', e => {
    const inv = e.target.closest('[data-inverser]');
    if (inv) {
      const id = inv.dataset.schema || inv.closest('[data-schema]').dataset.schema;
      inverse[id] = !inverse[id];
      redessinerSchema(id);
    }
    const et = e.target.closest('[data-etiquettes]');
    if (et) {
      const fig = et.closest('.coupe-image');
      const cache = fig.classList.toggle('sans-etiquettes');
      et.textContent = cache ? 'Afficher les étiquettes' : 'Masquer les étiquettes';
    }
  });
  telephone.addEventListener('change', () => S.SCHEMAS.forEach(s => redessinerSchema(s.id)));

  /* ---------- Modèle 3D ---------- */
  let visionneuse = null, enCours = false;
  function preparer3D() {
    const modeles = manifeste.modeles.filter(m => voit(`modele-${m.id}`));
    const scene = $('#v3d-scene');
    if (!modeles.length) {
      if (!apercu) { $('#modele-3d').hidden = true; const t = $('[data-toc="modele-3d"]'); if (t) t.hidden = true; }
      else scene.innerHTML = '<p class="v3d-attente">Aucun modèle.</p>';
      return;
    }
    const poids = modeles.reduce((a, m) => a + m.octets, 0) / 1048576;
    scene.innerHTML = `<div class="v3d-attente">
        <p><b>Modèle 3D interactif</b> : ${modeles.length} structures (${poids.toFixed(1).replace('.', ',')} Mo, plus 0,2 Mo pour le moteur 3D).</p>
        <button type="button" class="btn btn-ink" id="v3d-voir">Voir en 3D</button>
      </div>`;
    $('#v3d-voir').addEventListener('click', () => charger3D(modeles));
    if (!telephone.matches && 'IntersectionObserver' in window) {
      const io = new IntersectionObserver(ent => { if (ent.some(e => e.isIntersecting)) { io.disconnect(); charger3D(modeles); } }, { rootMargin: '150px' });
      io.observe(scene);
    }
  }

  async function charger3D(modeles) {
    if (enCours) return;
    enCours = true;
    const scene = $('#v3d-scene');
    scene.innerHTML = '<p class="v3d-progression" role="status">Chargement du moteur 3D…</p>';
    try {
      const { creerVisionneuse } = await import('./visionneuse.js');
      scene.innerHTML = '';
      const progression = document.createElement('p');
      progression.className = 'v3d-progression';
      progression.setAttribute('role', 'status');
      scene.appendChild(progression);
      visionneuse = await creerVisionneuse(scene, {
        base: BASE, manifeste, ids: modeles.map(m => m.id),
        onProgression: (n, t) => { progression.textContent = `Chargement des modèles : ${n} / ${t}`; },
        onSelection: s => afficherSelection(s),
      });
      progression.remove();
      panneau3D();
      main.dispatchEvent(new CustomEvent('v3d-pret'));
    } catch (e) {
      enCours = false;
      scene.innerHTML = `<div class="v3d-attente"><p class="cours-erreur">Modèle 3D indisponible sur cet appareil : ${esc(e.message)}</p>
        <button type="button" class="btn btn-outline" id="v3d-voir">Réessayer</button></div>`;
      $('#v3d-voir').addEventListener('click', () => charger3D(modeles));
    }
  }

  function panneau3D() {
    const v = visionneuse, p = $('#v3d-panneau');
    const cats = new Set(v.structures.map(s => (s.categorie === 'artere' || s.categorie === 'veine' ? 'vaisseau' : s.categorie)));
    const bascules = [['contexte', 'Muscles de contexte'], ['os', 'Os'], ['nerf', 'Nerfs'], ['vaisseau', 'Vaisseaux']]
      .filter(([c]) => cats.has(c))
      .map(([c, t]) => `<label class="v3d-bascule"><input type="checkbox" data-categorie="${c}" checked> ${t}</label>`).join('');
    const coupes = schemasVisibles();
    const boutonsTiers = Object.keys(N.TIERS).filter(t => coupes.some(s => s.tiers === t))
      .map(t => `<button type="button" class="v3d-tiers" data-tiers="${t}">${TIERS_NOMS[t]}</button>`).join('');
    const puces = coupes.map(s => `<button type="button" class="v3d-puce" data-aller="${s.id}" title="${esc(s.titre)}">${s.court}</button>`).join('');
    p.hidden = false;
    p.innerHTML = `
      <div class="v3d-bloc"><p class="v3d-titre">Afficher</p><div class="v3d-bascules">${bascules}</div></div>
      <div class="v3d-bloc"><p class="v3d-titre">Vue</p><div class="v3d-vues">
        <button type="button" data-vue="posterieure">Postérieure</button><button type="button" data-vue="laterale">Latérale</button><button type="button" data-vue="coupe">De la coupe</button></div></div>
      <div class="v3d-bloc"><p class="v3d-titre">Sonde (plan de coupe)</p>
        ${boutonsTiers ? `<div class="v3d-tiers-liste">${boutonsTiers}</div>` : ''}
        <label class="v3d-curseur"><span>Ischion</span><input type="range" min="0" max="1" step="0.005" value="0.5" id="v3d-hauteur" aria-label="Hauteur de la sonde, de l'ischion au genou"><span>Genou</span></label>
        ${puces ? `<div class="v3d-puces" aria-label="Aller au niveau d'un schéma">${puces}</div>` : ''}
        <label class="v3d-bascule"><input type="checkbox" id="v3d-couper"> Couper le modèle sous la sonde</label>
      </div>
      <div class="v3d-bloc v3d-selection" id="v3d-selection" aria-live="polite"><p>Touchez une structure (ou son étiquette) pour la mettre en surbrillance.</p></div>
      <div class="v3d-bloc v3d-structures">${v.structures.map(s => `<button type="button" class="v3d-puce v3d-${s.categorie}" data-structure="${s.id}">${esc(s.nom)}</button>`).join('')}</div>
      <div class="v3d-bloc v3d-schema" id="v3d-schema"></div>`;
    const curseur = $('#v3d-hauteur'), couper = $('#v3d-couper');
    let schemaCourant = null;
    const placer = (f, { schema = null } = {}) => {
      curseur.value = String(f);
      v.sonde(N.hauteurVersY(f, v.reperes), { couper: couper.checked });
      const id = schema || N.schemaLePlusProche(f, coupes);
      $$('.v3d-tiers', p).forEach(b => b.classList.toggle('is-active', b.dataset.tiers === N.tiersDe(id)));
      $$('[data-aller]', p).forEach(b => b.classList.toggle('is-active', b.dataset.aller === id));
      if (id !== schemaCourant) { schemaCourant = id; afficherCoupe(id); }
    };
    p.addEventListener('change', e => {
      if (e.target.dataset.categorie) v.afficher(e.target.dataset.categorie, e.target.checked);
      if (e.target === couper) placer(Number(curseur.value));
    });
    curseur.addEventListener('input', () => placer(Number(curseur.value)));
    p.addEventListener('click', e => {
      const b = e.target.closest('button');
      if (!b) return;
      if (b.dataset.vue) v.vue(b.dataset.vue);
      // Choisir un niveau : coupe du modèle et vue de la section, orientée comme les schémas
      const voirCoupe = id => { couper.checked = true; placer(S.PAR_ID[id].hauteur, { schema: id }); v.vue('coupe'); };
      if (b.dataset.tiers) voirCoupe(coupes.find(c => c.tiers === b.dataset.tiers).id);
      if (b.dataset.aller) voirCoupe(b.dataset.aller);
      if (b.dataset.structure) v.selectionner(v.selection === b.dataset.structure ? null : b.dataset.structure);
    });
    const depart = coupes.find(s => s.tiers === 'moyen') || coupes[0];
    placer(depart ? depart.hauteur : 0.5, { schema: depart ? depart.id : null });
    const modele = params.get('modele');
    if (modele) v.selectionner(modele);
  }

  function afficherCoupe(id) {
    const zone = $('#v3d-schema');
    if (!id) { zone.innerHTML = '<p>Aucun schéma de coupe validé pour l\'instant.</p>'; return; }
    const s = S.PAR_ID[id];
    zone.innerHTML = `<p class="v3d-titre">Coupe au niveau de la sonde</p>
      <div class="v3d-coupe-outils"><a href="#coupe-${id}">${esc(`${s.court} · ${s.titre}`)} ↓</a>
        <button type="button" class="lien-bouton" data-inverser data-schema="${id}" aria-pressed="${inverse[id]}">Inverser gauche/droite</button></div>
      <figure class="v3d-coupe" data-schema="${id}">${svgSchema(id, { compact: true })}</figure>`;
  }

  function afficherSelection(s) {
    const zone = $('#v3d-selection');
    $$('[data-structure]', $('#v3d-panneau')).forEach(b => b.classList.toggle('is-active', !!s && b.dataset.structure === s.id));
    if (!zone) return;
    zone.innerHTML = s
      ? `<p><b>${esc(s.nom)}</b> ${badge(`modele-${s.id}`)}</p><p class="v3d-aide">Touchez-la de nouveau, ou ailleurs, pour tout réafficher.</p>`
      : '<p>Touchez une structure (ou son étiquette) pour la mettre en surbrillance.</p>';
  }

  /* ---------- Source / crédits (rempli par l'auteur) ---------- */
  function rendreCredits(texte) {
    const bloc = $('#cours-credits'), p = $('.cours-credits-texte', bloc);
    if (texte && texte.trim()) { bloc.hidden = false; p.textContent = texte.trim(); }
    else if (apercu) { bloc.hidden = false; bloc.classList.add('is-vide'); p.textContent = 'À compléter par l\'auteur dans l\'administration (Source / crédits).'; }
  }

  demarrer();
})();
