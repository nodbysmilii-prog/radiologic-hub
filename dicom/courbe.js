/* =========================================================
   Espace DICOM — panneau « Courbe » de la visionneuse : courbe de
   perfusion tracée directement sur les images.
   La visionneuse OHIF (cadre du même site) donne ses services par
   window.RH_OHIF (voir espace-dicom/visionneuse/app-config.js). À chaque
   région tracée (ellipse, cercle, rectangle, contour libre) sur une
   série dynamique, le signal moyen de la région est calculé sur toutes
   les phases de la coupe (dicom/perfusion.js), avec les images déjà
   décodées par la visionneuse (tous formats, démonstration ou serveur).
   Chaque région prend la couleur de sa courbe ; un clic sur un point de
   la courbe affiche la phase correspondante.
   ========================================================= */
(function () {
  'use strict';

  const q = s => document.querySelector(s);
  const P = window.RHDicomPerfusion;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fr = (v, d = 1) => (Number.isFinite(v) ? v.toLocaleString('fr-FR', { maximumFractionDigits: d }) : '—');
  const pc = v => `${fr(v * 100, 0)} %`;
  const COULEURS = ['#f2ab2f', '#5b7fd6', '#4f9f74', '#e0526a', '#9b7be0', '#3fb5c9'];
  const SVG = 'http://www.w3.org/2000/svg';

  const cadre = q('#dv-ohif');
  const vide = q('#dv-courbe-vide'), options = q('#dv-courbe-options'), graphe = q('#dv-courbe-graphe'), liste = q('#dv-courbe-regions'), pastille = q('#dv-pastille');

  let ohif = null;                 // { services, libs, source }
  const regions = new Map();       // uid de la mesure → région
  const minuteries = new Map(), generations = new Map();
  let echelle = 'relatif', premiere = false;

  /* ---------- Raccordement à la visionneuse ---------- */
  let essais = 0, minuterie = null;
  function raccorder() {
    essais = 0;
    if (ohif || minuterie) return;
    minuterie = setInterval(() => {
      essais++;
      try {
        const w = cadre.contentWindow, r = w && w.RH_OHIF;
        const sm = r && r.pret && r.servicesManager;
        const em = sm && (sm._extensionManager || sm.extensionManager);
        const commun = em && em.getModuleEntry('@ohif/extension-cornerstone.utilityModule.common');
        const libs = commun && commun.exports && commun.exports.getCornerstoneLibraries && commun.exports.getCornerstoneLibraries();
        if (libs && libs.cornerstone && libs.cornerstoneTools && sm.services.measurementService) {
          clearInterval(minuterie);
          minuterie = null;
          ohif = { services: sm.services, libs, source: () => em.getActiveDataSource()[0] };
          ecouter();
          return;
        }
      } catch (e) { /* visionneuse en cours de chargement */ }
      if (essais > 240) {
        clearInterval(minuterie);
        minuterie = null;
        vide.textContent = 'Courbe indisponible : la visionneuse ne s\'est pas chargée.';
      }
    }, 250);
  }

  function ecouter() {
    const ms = ohif.services.measurementService, E = ms.EVENTS;
    [E.MEASUREMENT_ADDED, E.RAW_MEASUREMENT_ADDED].forEach(ev => ms.subscribe(ev, d => planifier(uidDe(d), 30)));
    ms.subscribe(E.MEASUREMENT_UPDATED, d => planifier(uidDe(d), 250));
    ms.subscribe(E.MEASUREMENT_REMOVED, d => retirer(uidDe(d)));
    ms.subscribe(E.MEASUREMENTS_CLEARED, () => { [...regions.keys()].forEach(retirer); });
    const cs = ohif.libs.cornerstone;
    const ev = cs.Enums && cs.Enums.Events && cs.Enums.Events.DYNAMIC_VOLUME_DIMENSION_GROUP_CHANGED;
    if (ev) cs.eventTarget.addEventListener(ev, () => dessiner());
    ms.getMeasurements().forEach(m => planifier(m.uid, 0));
    afficher();
  }

  const uidDe = d => (d && d.measurement && typeof d.measurement === 'object' ? d.measurement.uid : d && d.measurement);

  function planifier(uid, delai) {
    if (!uid) return;
    clearTimeout(minuteries.get(uid));
    minuteries.set(uid, setTimeout(() => calculer(uid), delai));
  }

  function retirer(uid) {
    if (!regions.has(uid)) return;
    clearTimeout(minuteries.get(uid));
    generations.set(uid, (generations.get(uid) || 0) + 1);
    regions.delete(uid);
    afficher();
  }

  /* Couleur de la région dans les images = couleur de sa courbe */
  function colorer(uid, couleur) {
    const { cornerstone: cs, cornerstoneTools: ct } = ohif.libs;
    try {
      ct.annotation.config.style.setAnnotationStyles(uid, {
        color: couleur, colorHighlighted: couleur, colorSelected: couleur,
        textBoxColor: couleur, textBoxColorHighlighted: couleur, textBoxColorSelected: couleur,
      });
      cs.getRenderingEngines().forEach(e => e.getViewports().forEach(v => {
        if (ct.utilities && ct.utilities.triggerAnnotationRenderForViewportIds) ct.utilities.triggerAnnotationRenderForViewportIds([v.id]);
        else v.render();
      }));
    } catch (e) { /* couleur par défaut de la visionneuse */ }
  }

  function couleurLibre() {
    const prises = new Set([...regions.values()].map(r => r.couleur));
    return COULEURS.find(c => !prises.has(c)) || COULEURS[regions.size % COULEURS.length];
  }

  /* ---------- Calcul d'une région ---------- */
  function valeurImage(image, indices) {
    const px = image.getPixelData ? image.getPixelData() : image.voxelManager.getScalarData();
    const prescale = image.preScale && image.preScale.scaled;
    return P.moyenne(px, indices, prescale ? 1 : (Number(image.slope) || 1), prescale ? 0 : (Number(image.intercept) || 0));
  }

  async function calculer(uid) {
    const gen = (generations.get(uid) || 0) + 1;
    generations.set(uid, gen);
    const { services, libs } = ohif, cs = libs.cornerstone;
    const m = services.measurementService.getMeasurement(uid);
    const a = libs.cornerstoneTools.annotation.state.getAnnotation(uid);
    const region = P.regionDepuisAnnotation(a);
    if (!m || !region) { if (regions.has(uid) && !m) retirer(uid); return; }
    let r = regions.get(uid);
    if (!r) {
      const numeros = new Set([...regions.values()].map(x => x.numero));
      let n = 1;
      while (numeros.has(n)) n++;
      r = { uid, numero: n, couleur: couleurLibre() };
      regions.set(uid, r);
      colorer(uid, r.couleur);
    }
    r.label = m.label || '';
    if (!r.valeurs) r.etat = 'calcul';
    afficher();
    try {
      const refId = m.referencedImageId || (a.metadata && a.metadata.referencedImageId);
      const meta = id => cs.metaData.get('instance', id) || {};
      const ds = m.displaySetInstanceUID && services.displaySetService.getDisplaySetByUID(m.displaySetInstanceUID);
      const ids = ds ? (ohif.source().getImageIdsForDisplaySet(ds) || []) : [];
      const images = ids.map(id => ({ id, meta: meta(id) }));
      const ref = images.find(i => i.id === refId) || { id: refId, meta: meta(refId) };
      const pl = P.plan(ref.meta);
      if (!pl) throw new Error('position de l\'image inconnue');
      const groupe = P.phasesDeLaCoupe(images.length ? images : [ref], ref);
      if (groupe.length < 4) {
        Object.assign(r, { etat: 'statique', valeurs: null, nbPhases: groupe.length });
        return afficher();
      }
      const axe = P.axeTemps(groupe);
      const indices = P.masque(pl, region);
      if (!indices.length) {
        Object.assign(r, { etat: 'petite', valeurs: null });
        return afficher();
      }
      const valeurs = [];
      for (let k = 0; k < axe.images.length; k += 8) {
        const lot = await Promise.all(axe.images.slice(k, k + 8).map(im => cs.imageLoader.loadAndCacheImage(im.id)));
        if (generations.get(uid) !== gen) return;
        lot.forEach(image => valeurs.push(valeurImage(image, indices)));
      }
      Object.assign(r, {
        etat: 'ok', temps: axe.temps, unite: axe.unite, sourceTemps: axe.source, valeurs,
        analyse: P.analyserCourbe(axe.temps, valeurs, axe.unite), imageIds: axe.images.map(i => i.id),
        dsUid: ds && ds.displaySetInstanceUID, nbPixels: indices.length, aire: indices.length * pl.espLigne * pl.espColonne,
      });
      if (!premiere) {
        premiere = true;
        document.dispatchEvent(new CustomEvent('rh-courbe-premiere'));
      }
    } catch (e) {
      if (generations.get(uid) !== gen) return;
      Object.assign(r, { etat: 'erreur', message: e.message, valeurs: null });
    }
    afficher();
  }

  /* ---------- Phase affichée par la visionneuse ---------- */
  function volumeDe(r) {
    const cs = ohif.libs.cornerstone;
    return r.dsUid && cs.cache.getVolumes().find(v => v.volumeId.includes(r.dsUid) && v.numDimensionGroups > 1);
  }

  function phaseAffichee(r) {
    try {
      const v = volumeDe(r);
      if (v) {
        const ids = new Set(v.getCurrentDimensionGroupImageIds());
        return r.imageIds.findIndex(id => ids.has(id));
      }
      for (const e of ohif.libs.cornerstone.getRenderingEngines()) {
        for (const vp of e.getViewports()) {
          const id = vp.getCurrentImageId && vp.getCurrentImageId();
          const i = id ? r.imageIds.indexOf(id) : -1;
          if (i >= 0) return i;
        }
      }
    } catch (e) { /* pas de phase affichée */ }
    return -1;
  }

  function allerALaPhase(r, i) {
    const id = r.imageIds[i];
    try {
      const v = volumeDe(r);
      if (v) {
        const k = v.imageIds.indexOf(id);
        if (k >= 0) v.dimensionGroupNumber = v.flatImageIdIndexToDimensionGroupNumber(k);
        return;
      }
      for (const e of ohif.libs.cornerstone.getRenderingEngines()) {
        for (const vp of e.getViewports()) {
          const l = vp.getImageIds ? vp.getImageIds() : [];
          if (l.includes(id) && vp.setImageIdIndex) vp.setImageIdIndex(l.indexOf(id));
        }
      }
      dessiner();
    } catch (e) { /* phase non affichable */ }
  }

  /* ---------- Affichage ---------- */
  const triees = () => [...regions.values()].sort((a, b) => a.numero - b.numero);
  const nomDe = r => `Région ${r.numero}${r.label ? ` — ${r.label}` : ''}`;

  function afficher() {
    const l = triees(), ok = l.filter(r => r.etat === 'ok');
    vide.hidden = l.length > 0;
    if (!l.length) vide.textContent = ohif ? 'Aucune région tracée pour l\'instant.' : 'Visionneuse en cours de chargement…';
    options.hidden = !ok.length;
    pastille.hidden = !l.length;
    pastille.textContent = String(l.length);
    liste.innerHTML = l.map(r => `
      <section class="dv-region" style="--c: ${r.couleur}">
        <h3><span class="dv-region-couleur" aria-hidden="true"></span>${esc(nomDe(r))}</h3>
        ${detail(r)}
      </section>`).join('');
    dessiner();
  }

  function detail(r) {
    if (r.etat === 'calcul') return '<p class="dv-region-note">Calcul…</p>';
    if (r.etat === 'statique') return `<p class="dv-region-note">Série non dynamique (${r.nbPhases === 1 ? 'une seule image' : `${r.nbPhases} images`} à cette position) : tracez la région sur la série de perfusion.</p>`;
    if (r.etat === 'petite') return '<p class="dv-region-note">Région trop petite : aucun pixel à l\'intérieur.</p>';
    if (r.etat === 'erreur') return `<p class="dv-region-note">Calcul impossible : ${esc(r.message)}</p>`;
    const a = r.analyse, s = r.unite === 's';
    const t = v => (s ? `${fr(v)} s` : `phase ${fr(v, 0)}`);
    const lignes = [];
    if (a.type === 'chute') {
      lignes.push(['Chute maximale du signal', pc(a.chute)]);
      lignes.push(['Minimum du signal', `${t(a.tempsMinimum)}${a.delaiMinimum !== null && s ? ` (arrivée + ${fr(a.delaiMinimum)} s)` : ''}`]);
      lignes.push(['Récupération du signal (PSR)', a.psr === null ? 'acquisition trop courte' : pc(a.psr)]);
    } else if (a.type === 'rehaussement') {
      lignes.push(['Rehaussement maximal', `+${pc(a.rehaussement)}`]);
      lignes.push(['Pic', t(a.tempsPic)]);
      const types = { I: 'I — progressive', II: 'II — plateau', III: 'III — lavage' };
      lignes.push(['Type de courbe', a.typeCourbe ? `${types[a.typeCourbe]} (${a.variationTardive > 0 ? '+' : ''}${pc(a.variationTardive)} en fin d'acquisition)` : 'non classée (moins d\'une minute après le pic, ou temps inconnu)']);
    } else if (a.type === 'stable') {
      lignes.push(['Variation du signal', 'aucune variation de plus de 10 %']);
    } else {
      lignes.push(['Courbe', 'trop peu de phases pour l\'analyser']);
    }
    if (a.arrivee !== null && a.arrivee !== undefined && a.type !== 'stable') lignes.push(['Arrivée du produit de contraste', t(a.arrivee)]);
    if (Number.isFinite(a.base)) lignes.push(['Ligne de base', `${fr(a.base, 0)} (phases ${a.phasesBase[0] + 1} à ${a.phasesBase[1] + 1})`]);
    lignes.push(['Région', `${r.nbPixels} pixels, ${fr(r.aire, 0)} mm² · ${r.valeurs.length} phases`]);
    return `<dl>${lignes.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
      <p class="dv-region-note">Temps : ${esc(sourceLisible(r.sourceTemps))}.</p>`;
  }

  function sourceLisible(s) {
    if (/× TR$/.test(s)) return 'estimé (phase × TR, pas d\'heure d\'acquisition dans les images)';
    return { TriggerTime: 'Trigger Time des images', AcquisitionTime: 'heure d\'acquisition des images', ContentTime: 'heure de création des images',
      TemporalPositionIdentifier: 'numéro de phase (pas d\'heure dans les images)', InstanceNumber: 'ordre des images (pas d\'heure dans les images)' }[s] || 'ordre des images';
  }

  function graduations(min, max, n) {
    if (!(max > min)) { min -= 1; max += 1; }
    const brut = (max - min) / n, p = 10 ** Math.floor(Math.log10(brut)), f = brut / p;
    const pas = (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * p;
    const debut = Math.floor(min / pas) * pas, fin = Math.ceil(max / pas) * pas;
    const l = [];
    for (let v = debut; v <= fin + pas / 2; v += pas) l.push(Math.round(v / pas) * pas);
    return { debut, fin, l };
  }

  function el(nom, attributs, parent) {
    const e = document.createElementNS(SVG, nom);
    for (const [k, v] of Object.entries(attributs)) e.setAttribute(k, v);
    if (parent) parent.append(e);
    return e;
  }

  function dessiner() {
    graphe.textContent = '';
    if (!ohif) return;
    const l = triees().filter(r => r.etat === 'ok');
    if (!l.length) return;
    const rel = echelle === 'relatif';
    const y = (r, i) => (rel ? r.analyse.relatif ? r.analyse.relatif[i] * 100 : NaN : r.valeurs[i]);
    const xs = l.flatMap(r => r.temps), ys = l.flatMap(r => r.valeurs.map((_, i) => y(r, i))).filter(Number.isFinite);
    const W = 340, H = 220, G = 46, D = 10, HT = 12, B = 36;
    const gx = graduations(Math.min(...xs), Math.max(...xs), 6), gy = graduations(Math.min(...ys, rel ? 100 : Infinity), Math.max(...ys, rel ? 100 : -Infinity), 5);
    const X = v => G + ((v - gx.debut) / (gx.fin - gx.debut)) * (W - G - D);
    const Y = v => HT + (1 - (v - gy.debut) / (gy.fin - gy.debut)) * (H - HT - B);
    const s = l[0].unite === 's';
    const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, class: 'dv-graphe', role: 'img',
      'aria-label': `Courbe ${rel ? 'en pourcentage de la ligne de base' : 'du signal moyen'} en fonction ${s ? 'du temps' : 'de la phase'}, ${l.length} région${l.length > 1 ? 's' : ''}` });
    const axes = el('g', { class: 'dv-axes' }, svg);
    for (const v of gy.l) {
      el('line', { x1: G, x2: W - D, y1: Y(v), y2: Y(v), class: 'dv-grille' }, axes);
      el('text', { x: G - 6, y: Y(v) + 3.5, 'text-anchor': 'end' }, axes).textContent = fr(v, 1);
    }
    for (const v of gx.l) {
      el('line', { x1: X(v), x2: X(v), y1: H - B, y2: H - B + 4, class: 'dv-trait' }, axes);
      el('text', { x: X(v), y: H - B + 15, 'text-anchor': 'middle' }, axes).textContent = fr(v, 1);
    }
    el('line', { x1: G, x2: W - D, y1: H - B, y2: H - B, class: 'dv-trait' }, axes);
    el('line', { x1: G, x2: G, y1: HT, y2: H - B, class: 'dv-trait' }, axes);
    el('text', { x: (G + W - D) / 2, y: H - 4, 'text-anchor': 'middle', class: 'dv-legende-axe' }, axes).textContent = s ? 'Temps (s)' : 'Phase';
    el('text', { x: 11, y: (HT + H - B) / 2, 'text-anchor': 'middle', class: 'dv-legende-axe', transform: `rotate(-90 11 ${(HT + H - B) / 2})` }, axes)
      .textContent = rel ? '% de la ligne de base' : 'Signal moyen';
    if (rel) el('line', { x1: G, x2: W - D, y1: Y(100), y2: Y(100), class: 'dv-base' }, axes);
    // Phase affichée dans la visionneuse
    const i0 = phaseAffichee(l[0]);
    if (i0 >= 0) el('line', { x1: X(l[0].temps[i0]), x2: X(l[0].temps[i0]), y1: HT, y2: H - B, class: 'dv-phase' }, svg);
    for (const r of l) {
      const g = el('g', { class: 'dv-serie', style: `--c: ${r.couleur}` }, svg);
      const pts = r.temps.map((t, i) => [X(t), Y(y(r, i))]).filter(p => Number.isFinite(p[1]));
      el('polyline', { points: pts.map(p => p.map(v => v.toFixed(1)).join(',')).join(' '), class: 'dv-ligne' }, g);
      r.temps.forEach((t, i) => {
        const v = y(r, i);
        if (!Number.isFinite(v)) return;
        const extreme = r.analyse.type === 'chute' ? r.analyse.minimum.i === i : r.analyse.type === 'rehaussement' && r.analyse.maximum.i === i;
        const c = el('circle', { cx: X(t).toFixed(1), cy: Y(v).toFixed(1), r: extreme ? 4.2 : 2.4, class: extreme ? 'dv-point dv-extreme' : 'dv-point', 'data-region': r.uid, 'data-i': i }, g);
        el('title', {}, c).textContent = `${nomDe(r)} · ${s ? `${fr(t)} s` : `phase ${fr(t, 0)}`} · ${rel ? `${fr(v, 0)} %` : fr(v, 0)} (cliquer : afficher cette phase)`;
      });
    }
    graphe.append(svg);
  }

  /* ---------- Commandes ---------- */
  options.addEventListener('click', e => {
    const b = e.target.closest('[data-echelle]');
    if (!b) return;
    echelle = b.dataset.echelle;
    options.querySelectorAll('[data-echelle]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    dessiner();
  });

  graphe.addEventListener('click', e => {
    const c = e.target.closest('.dv-point');
    const r = c && regions.get(c.dataset.region);
    if (r) allerALaPhase(r, Number(c.dataset.i));
  });

  q('#dv-courbe-csv').addEventListener('click', () => {
    const l = triees().filter(r => r.etat === 'ok');
    if (!l.length) return;
    const texte = P.versCsv(l.map(r => ({ nom: nomDe(r), temps: r.temps, valeurs: r.valeurs, analyse: r.analyse })), l[0].unite);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + texte], { type: 'text/csv;charset=utf-8' }));
    a.download = 'courbe-perfusion.csv';
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 60000);
  });

  window.RHDicomCourbe = { regions, etat: () => triees().map(r => ({ numero: r.numero, couleur: r.couleur, etat: r.etat, analyse: r.analyse, valeurs: r.valeurs, temps: r.temps, nbPixels: r.nbPixels })) };
  cadre.addEventListener('load', raccorder);
  raccorder();
  afficher();
})();
