/* =========================================================
   Espace DICOM — courbe de perfusion (calcul pur, navigateur et Node).
   Une région (ellipse, cercle, rectangle, contour libre) tracée dans la
   visionneuse sur une coupe d'une série dynamique → signal moyen de la
   région à chaque phase de CETTE coupe → courbe signal-temps et
   paramètres semi-quantitatifs :
   • T2* dynamique (DSC, chute de signal) : chute maximale, temps au
     minimum, pourcentage de récupération du signal (PSR) ;
   • T1 dynamique (DCE, rehaussement) : rehaussement maximal, temps au
     pic, type de courbe (I progressive, II plateau, III lavage).
   Aide visuelle : pas de déconvolution (rCBV, CBF), ni correction de
   fuite, ni modèle pharmacocinétique (Ktrans).
   Séries multiphases classiques (une image par coupe et par phase),
   dont celles des IRM General Electric : les phases d'une même coupe
   sont retrouvées par leur position (ImagePositionPatient), puis
   ordonnées par TriggerTime, AcquisitionTime, ContentTime,
   TemporalPositionIdentifier ou, à défaut, InstanceNumber.
   ========================================================= */
(function (racine) {
  'use strict';

  const nombre = v => { const n = Number(Array.isArray(v) ? v[0] : v); return Number.isFinite(n) ? n : NaN; };
  const vecteur = (v, n) => {
    const l = (Array.isArray(v) ? v : String(v == null ? '' : v).split('\\')).map(Number);
    return l.length >= n && l.slice(0, n).every(Number.isFinite) ? l.slice(0, n) : null;
  };
  const sous = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const scal = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const normale = o => [o[1] * o[5] - o[2] * o[4], o[2] * o[3] - o[0] * o[5], o[0] * o[4] - o[1] * o[3]];
  const moyenneDe = l => l.reduce((s, v) => s + v, 0) / l.length;

  /* ---------- Géométrie d'une image ---------- */
  /* plan(meta) → { origine, ligne, colonne, espLigne, espColonne, lignes, colonnes } ou null
     origine : centre du premier pixel ; ligne : direction des colonnes croissantes ;
     espColonne : distance entre deux colonnes (mm) */
  function plan(m) {
    const origine = vecteur(m.ImagePositionPatient, 3), o = vecteur(m.ImageOrientationPatient, 6);
    const pas = vecteur(m.PixelSpacing, 2) || [1, 1];
    const lignes = nombre(m.Rows), colonnes = nombre(m.Columns);
    if (!origine || !o || !(lignes > 0) || !(colonnes > 0)) return null;
    return { origine, ligne: o.slice(0, 3), colonne: o.slice(3, 6), espLigne: pas[0], espColonne: pas[1], lignes, colonnes };
  }

  /* Point du patient (mm) → coordonnées dans le plan de l'image (mm, depuis le centre du premier pixel) */
  function versPlan(p, point) {
    const d = sous(point, p.origine);
    return [scal(d, p.ligne), scal(d, p.colonne)];
  }

  /* Clé de coupe : orientation + position le long de la normale (au centième de mm) */
  function cleCoupe(m) {
    const ipp = vecteur(m.ImagePositionPatient, 3), o = vecteur(m.ImageOrientationPatient, 6);
    if (!ipp || !o) return null;
    const n = normale(o);
    return `${o.map(v => Math.round(v * 1000)).join(',')}@${Math.round(scal(ipp, n) * 100)}`;
  }

  /* ---------- Phases d'une même coupe ---------- */
  function secondes(tm) {
    const s = String(Array.isArray(tm) ? tm[0] : tm == null ? '' : tm).trim().replace(/:/g, '');
    const r = /^(\d{2})(\d{2})?(\d{2})?(\.\d+)?$/.exec(s);
    if (!r) return NaN;
    return Number(r[1]) * 3600 + Number(r[2] || 0) * 60 + Number(r[3] || 0) + Number(r[4] || 0);
  }

  const distinctes = l => l.every(Number.isFinite) && new Set(l).size === l.length;

  /* axeTemps(images [{ meta, … }]) → { images (triées), temps, unite 's' | 'phase', source }
     Toutes les images doivent être à la même position. */
  function axeTemps(images) {
    const l = images.slice();
    const metas = l.map(i => i.meta);
    const instance = m => nombre(m.InstanceNumber);
    const essais = [
      ['TriggerTime', m => nombre(m.TriggerTime) / 1000, 's'],
      ['AcquisitionTime', m => secondes(m.AcquisitionTime), 's'],
      ['ContentTime', m => secondes(m.ContentTime), 's'],
      ['TemporalPositionIdentifier', m => nombre(m.TemporalPositionIdentifier), 'phase'],
      ['InstanceNumber', instance, 'phase'],
    ];
    let choix = null, valeurs = null;
    for (const [source, lire, unite] of essais) {
      let v = metas.map(lire);
      if (unite === 's' && source !== 'TriggerTime' && distinctes(v)) {
        const min = Math.min(...v);
        v = v.map(x => (x - min > 43200 ? x - 86400 : x));      // passage de minuit
      }
      if (l.length > 1 && distinctes(v)) { choix = { source, unite }; valeurs = v; break; }
    }
    if (!choix) {
      choix = { source: 'ordre', unite: 'phase' };
      valeurs = l.map((_, i) => i);
    }
    const ordre = l.map((im, i) => ({ im, v: valeurs[i], n: instance(im.meta) }))
      .sort((a, b) => a.v - b.v || (a.n || 0) - (b.n || 0));
    let temps;
    if (choix.unite === 's') {
      temps = ordre.map(o => o.v - ordre[0].v);
    } else {
      // Sans heure d'acquisition : phases numérotées ; en EPI (T2* dynamique), une phase dure un TR
      const m0 = metas[0];
      const tr = nombre(m0.RepetitionTime);
      const epi = /EP/.test(String(m0.ScanningSequence || '')) || /EPI|EPI2/i.test(String(m0.SequenceName || m0.PulseSequenceName || ''));
      if (epi && tr >= 300 && tr <= 5000) {
        temps = ordre.map((_, i) => (i * tr) / 1000);
        choix = { source: `${choix.source} × TR`, unite: 's' };
      } else {
        temps = ordre.map((_, i) => i + 1);
      }
    }
    return { images: ordre.map(o => o.im), temps: temps.map(t => Math.round(t * 1000) / 1000), unite: choix.unite, source: choix.source };
  }

  /* phasesDeLaCoupe(images, reference) → images de la série à la même position que l'image de référence */
  function phasesDeLaCoupe(images, reference) {
    const cle = cleCoupe(reference.meta);
    if (cle === null) return [reference];
    return images.filter(i => cleCoupe(i.meta) === cle);
  }

  /* ---------- Région tracée ---------- */
  const OUTILS = {
    EllipticalROI: 'ellipse',
    CircleROI: 'cercle',
    RectangleROI: 'rectangle',
    PlanarFreehandROI: 'polygone',
    SplineROI: 'polygone',
    LivewireContour: 'polygone',
  };

  /* regionDepuisAnnotation(annotation cornerstone) → { forme, points (mm, repère patient) } ou null */
  function regionDepuisAnnotation(a) {
    const outil = a && a.metadata && a.metadata.toolName;
    const forme = OUTILS[outil];
    if (!forme || !a.data) return null;
    const points = forme === 'polygone'
      ? (a.data.contour && a.data.contour.polyline) || (a.data.handles && a.data.handles.points)
      : a.data.handles && a.data.handles.points;
    if (!points || points.length < 2) return null;
    return { forme, points: points.map(p => [p[0], p[1], p[2]]) };
  }

  function dansPolygone(x, y, poly) {
    let dedans = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i], [xj, yj] = poly[j];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) dedans = !dedans;
    }
    return dedans;
  }

  /* masque(plan, region) → indices (Int32Array) des pixels dont le centre est dans la région */
  function masque(p, region) {
    const pts = region.points.map(pt => versPlan(p, pt));
    let dedans, xs, ys;
    if (region.forme === 'ellipse' && pts.length >= 4) {
      const [b, h, g, d] = pts;                                  // bas, haut, gauche, droite
      const c = [(b[0] + h[0] + g[0] + d[0]) / 4, (b[1] + h[1] + g[1] + d[1]) / 4];
      const u = [(h[0] - b[0]) / 2, (h[1] - b[1]) / 2], v = [(d[0] - g[0]) / 2, (d[1] - g[1]) / 2];
      const det = u[0] * v[1] - u[1] * v[0];
      if (Math.abs(det) < 1e-9) return new Int32Array(0);
      dedans = (x, y) => {
        const dx = x - c[0], dy = y - c[1];
        const a = (dx * v[1] - dy * v[0]) / det, bb = (u[0] * dy - u[1] * dx) / det;
        return a * a + bb * bb <= 1;
      };
      const r = Math.hypot(...u) + Math.hypot(...v);
      xs = [c[0] - r, c[0] + r]; ys = [c[1] - r, c[1] + r];
    } else if (region.forme === 'cercle') {
      const [c, bord] = pts;
      const r = Math.hypot(bord[0] - c[0], bord[1] - c[1]);
      dedans = (x, y) => (x - c[0]) ** 2 + (y - c[1]) ** 2 <= r * r;
      xs = [c[0] - r, c[0] + r]; ys = [c[1] - r, c[1] + r];
    } else {
      let poly = pts;
      if (region.forme === 'rectangle') {
        if (pts.length >= 4) poly = [pts[0], pts[1], pts[3], pts[2]];   // haut-gauche, haut-droite, bas-droite, bas-gauche
        else {
          const [a, b] = pts;
          poly = [[a[0], a[1]], [b[0], a[1]], [b[0], b[1]], [a[0], b[1]]];
        }
      }
      if (poly.length < 3) return new Int32Array(0);
      xs = [Math.min(...poly.map(q => q[0])), Math.max(...poly.map(q => q[0]))];
      ys = [Math.min(...poly.map(q => q[1])), Math.max(...poly.map(q => q[1]))];
      const droit = region.forme === 'rectangle'
        && poly.every(q => [xs[0], xs[1]].some(v => Math.abs(q[0] - v) < 1e-3) && [ys[0], ys[1]].some(v => Math.abs(q[1] - v) < 1e-3));
      // Rectangle dans l'axe de l'image : bords compris ; sinon contour (règle pair-impair)
      dedans = droit ? (x, y) => x >= xs[0] - 1e-6 && x <= xs[1] + 1e-6 && y >= ys[0] - 1e-6 && y <= ys[1] + 1e-6 : (x, y) => dansPolygone(x, y, poly);
    }
    const c0 = Math.max(0, Math.floor(xs[0] / p.espColonne)), c1 = Math.min(p.colonnes - 1, Math.ceil(xs[1] / p.espColonne));
    const l0 = Math.max(0, Math.floor(ys[0] / p.espLigne)), l1 = Math.min(p.lignes - 1, Math.ceil(ys[1] / p.espLigne));
    const indices = [];
    for (let l = l0; l <= l1; l++) {
      for (let c = c0; c <= c1; c++) if (dedans(c * p.espColonne, l * p.espLigne)) indices.push(l * p.colonnes + c);
    }
    return Int32Array.from(indices);
  }

  /* moyenne(pixels, indices, pente, ordonnee) → signal moyen (valeurs réelles) */
  function moyenne(pixels, indices, pente = 1, ordonnee = 0) {
    if (!indices.length) return NaN;
    let s = 0;
    for (let k = 0; k < indices.length; k++) s += pixels[indices[k]];
    return (s / indices.length) * pente + ordonnee;
  }

  /* ---------- Paramètres de la courbe ---------- */
  /* analyserCourbe(temps, valeurs, unite) → ligne de base, arrivée du bolus, type et paramètres */
  function analyserCourbe(temps, valeurs, unite = 's') {
    const n = valeurs.length;
    const r = { n, unite, type: 'insuffisant' };
    if (n < 4 || !valeurs.every(Number.isFinite)) return r;
    // Ligne de base : la première phase est souvent plus intense (équilibre de l'aimantation non atteint), on l'écarte
    const debut = n >= 8 ? 1 : 0;
    let fin = Math.min(n, debut + 3);
    const limite = Math.max(fin, Math.floor(n * 0.6));
    while (fin < limite) {
      const l = valeurs.slice(debut, fin), m = moyenneDe(l);
      const et = Math.sqrt(moyenneDe(l.map(v => (v - m) ** 2)));
      if (Math.abs(valeurs[fin] - m) > Math.max(3 * et, 0.04 * Math.abs(m))) break;
      fin++;
    }
    const base = moyenneDe(valeurs.slice(debut, fin));
    r.base = base;
    r.phasesBase = [debut, fin - 1];
    r.arrivee = fin < n ? temps[fin] : null;
    if (!(Math.abs(base) > 1e-9)) return r;
    r.relatif = valeurs.map(v => v / base);
    let iMin = debut, iMax = debut;
    for (let i = debut; i < n; i++) {
      if (r.relatif[i] < r.relatif[iMin]) iMin = i;
      if (r.relatif[i] > r.relatif[iMax]) iMax = i;
    }
    const chute = 1 - r.relatif[iMin], hausse = r.relatif[iMax] - 1;
    r.minimum = { i: iMin, t: temps[iMin], valeur: valeurs[iMin] };
    r.maximum = { i: iMax, t: temps[iMax], valeur: valeurs[iMax] };
    if (chute >= 0.1 && chute >= hausse) {
      // T2* dynamique (DSC)
      r.type = 'chute';
      r.chute = chute;
      r.tempsMinimum = temps[iMin];
      r.delaiMinimum = r.arrivee === null ? null : temps[iMin] - r.arrivee;
      const k = Math.max(3, Math.round(n * 0.15));
      if (n - k > iMin + 2) {
        const post = moyenneDe(valeurs.slice(n - k));
        r.psr = (post - valeurs[iMin]) / (base - valeurs[iMin]);
        r.phasesPsr = [n - k, n - 1];
      } else {
        r.psr = null;
      }
    } else if (hausse >= 0.1) {
      // T1 dynamique (DCE)
      r.type = 'rehaussement';
      r.rehaussement = hausse;
      r.tempsPic = temps[iMax];
      r.typeCourbe = null;
      if (unite === 's' && r.arrivee !== null) {
        // Pic précoce : maximum dans les 2 minutes après l'arrivée ; comparaison avec la fin de l'acquisition
        let iPic = -1;
        for (let i = fin; i < n && temps[i] <= r.arrivee + 120; i++) if (iPic < 0 || valeurs[i] > valeurs[iPic]) iPic = i;
        if (iPic >= 0 && temps[n - 1] - temps[iPic] >= 60) {
          const variation = (valeurs[n - 1] - valeurs[iPic]) / valeurs[iPic];
          r.picPrecoce = { i: iPic, t: temps[iPic] };
          r.variationTardive = variation;
          r.typeCourbe = variation > 0.1 ? 'I' : variation < -0.1 ? 'III' : 'II';
        }
      }
    } else {
      r.type = 'stable';
    }
    return r;
  }

  /* ---------- Export ---------- */
  /* versCsv(courbes [{ nom, temps, valeurs, analyse }], unite) → texte CSV (séparateur « ; », virgule décimale) */
  function versCsv(courbes, unite = 's') {
    const nb = v => (Number.isFinite(v) ? String(Math.round(v * 1000) / 1000).replace('.', ',') : '');
    const tete = [unite === 's' ? 'Temps (s)' : 'Phase'];
    for (const c of courbes) tete.push(`${c.nom} : signal moyen`, `${c.nom} : % de la ligne de base`);
    const n = Math.max(0, ...courbes.map(c => c.temps.length));
    const lignes = [tete.join(';')];
    for (let i = 0; i < n; i++) {
      const t = courbes.find(c => i < c.temps.length);
      const l = [nb(t ? t.temps[i] : NaN)];
      for (const c of courbes) {
        const rel = c.analyse && c.analyse.relatif ? c.analyse.relatif[i] * 100 : NaN;
        l.push(nb(c.valeurs[i]), nb(rel));
      }
      lignes.push(l.join(';'));
    }
    return lignes.join('\r\n') + '\r\n';
  }

  const api = { plan, versPlan, cleCoupe, secondes, axeTemps, phasesDeLaCoupe, regionDepuisAnnotation, masque, moyenne, analyserCourbe, versCsv, OUTILS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else racine.RHDicomPerfusion = api;
})(typeof self !== 'undefined' ? self : globalThis);
