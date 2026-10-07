/* =========================================================
   RadiologicHub — Suivi oncologique : SCHÉMA ANATOMIQUE
   ---------------------------------------------------------
   Vue d'ensemble : silhouette de face (droite du patient à
   gauche de l'image), lésions placées automatiquement d'après
   l'organe et le segment / territoire saisis dans le registre,
   colorées selon leur évolution.

   • localiser(lesion)  → position sur le schéma (ou null)
   • etatLesion(ligne)  → 'baisse' | 'stable' | 'hausse' | 'ne' | 'na' | 'baseline'
   • svgSchema(comparatif, options) → SVG autonome (exportable en image)

   Les couleurs sont INDICATIVES, lésion par lésion ; la réponse
   RECIST 1.1 se juge sur la somme des diamètres (moteur RECIST).
   ========================================================= */

(function (root, factory) {
  const node = typeof module === 'object' && module.exports;
  const api = factory(node ? require('./seuils.js') : root.RHSuivi.seuils);
  if (node) module.exports = api;
  else root.RHSuivi.schema = api;
})(typeof self !== 'undefined' ? self : this, function (SEUILS) {
  'use strict';

  const norm = s => String(s || '').toLowerCase().replace(/œ/g, 'oe').replace(/æ/g, 'ae').normalize('NFD').replace(/[̀-ͯ]/g, '');
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const W = 360, H = 782, CX = 180;

  /* ---------- Côté (droite du patient = gauche de l'image) ---------- */
  const cote = t => {
    if (/\b(droit|droite|dt|d)\b|\blsd\b|\blid\b|\blm\b|lobe moyen/.test(t)) return 'R';
    if (/\b(gauche|g)\b|\blsg\b|\blig\b|lingula/.test(t)) return 'L';
    return '';
  };
  const pt = (x, y, zone) => ({ x, y, zone });
  const lr = (t, r, l, c, zone) => { const s = cote(t); return pt(...(s === 'R' ? r : s === 'L' ? l : c), zone); };

  /* Niveau vertébral (C1…C7, D1/T1…D12, L1…L5, S1…) → hauteur sur le schéma */
  const niveauVertebral = t => {
    const m = t.match(/\b([cdtls])\s?(\d{1,2})\b/);
    if (!m) return null;
    const n = +m[2], nom = `${m[1] === 't' ? 'D' : m[1].toUpperCase()}${n}`;
    const y = {
      c: n >= 1 && n <= 7 ? 112 + (n - 1) * 5 : null,
      d: n >= 1 && n <= 12 ? 152 + (n - 1) * 16 : null,
      t: n >= 1 && n <= 12 ? 152 + (n - 1) * 16 : null,
      l: n >= 1 && n <= 5 ? 345 + (n - 1) * 20 : null,
      s: n >= 1 && n <= 5 ? 452 : null,
    }[m[1]];
    return y == null ? null : { y, nom };
  };

  /* Segments hépatiques (vue de face, schématique) */
  const SEGMENTS_FOIE = { 1: [174, 324], 2: [200, 309], 3: [198, 327], 4: [178, 309], 5: [150, 338], 6: [118, 340], 7: [114, 312], 8: [146, 306] };
  const ROMAINS = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8 };
  const segmentFoie = t => {
    const m = t.match(/\b(?:segment|seg|s)\.?\s*(viii|vii|vi|iv|v|iii|ii|i|[1-8])[ab]?\b/);
    if (!m) return null;
    return ROMAINS[m[1]] || +m[1];
  };

  /* ---------- Placement d'une lésion ---------- */
  function localiser(lesion) {
    const t = norm(`${lesion.organe} ${lesion.territoire}`);
    const gg = lesion.ganglion || /ganglion|adenopathie|\badp\b|\bgg\b/.test(t);

    if (gg) {
      if (/sus.?clavic/.test(t)) return lr(t, [138, 147], [222, 147], [180, 147], 'ganglion sus-claviculaire');
      if (/cervic|jugul|sous.?mandib|spinal/.test(t)) return lr(t, [160, 120], [200, 120], [180, 122], 'ganglion cervical');
      if (/axill/.test(t)) return lr(t, [88, 192], [272, 192], [180, 192], 'ganglion axillaire');
      if (/hil/.test(t)) return lr(t, [158, 233], [202, 233], [180, 233], 'ganglion hilaire');
      if (/sous.?car[ei]n|infra.?carin|subcarin/.test(t)) return pt(180, 245, 'ganglion sous-carénaire');
      if (/mediastin|para.?trache|pre.?vascul|fenetre|aorto.?pulm|prevasc/.test(t)) return pt(180, 212, 'ganglion médiastinal');
      if (/coeli|tronc coel|hepatique|pedicul/.test(t)) return pt(192, 345, 'ganglion cœliaque');
      if (/mesent/.test(t)) return pt(176, 398, 'ganglion mésentérique');
      if (/lombo|latero.?aort|para.?aort|inter.?aorto|retro.?peri|aort|cave/.test(t)) return pt(200, 400, 'ganglion lombo-aortique');
      if (/inguin|femor/.test(t)) return lr(t, [134, 522], [226, 522], [180, 522], 'ganglion inguinal');
      if (/iliaq|obtur|pelv/.test(t)) return lr(t, [150, 462], [210, 462], [180, 470], 'ganglion iliaque');
      return null;
    }
    if (/surren/.test(t)) return lr(t, [140, 349], [222, 349], [181, 349], 'surrénale');
    if (/rein|renal|pyelo/.test(t)) return lr(t, [140, 377], [222, 377], [181, 377], 'rein');
    if (/foie|hepat/.test(t)) {
      const s = segmentFoie(t);
      return s ? pt(...SEGMENTS_FOIE[s], `foie, segment ${['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'][s]}`) : lr(t, [130, 322], [196, 316], [150, 322], 'foie');
    }
    if (/\brate\b|splen/.test(t)) return pt(256, 322, 'rate');
    if (/pancr/.test(t)) {
      if (/tete|uncus|crochet/.test(t)) return pt(172, 357, 'pancréas (tête)');
      if (/queue/.test(t)) return pt(238, 345, 'pancréas (queue)');
      return pt(205, 351, 'pancréas');
    }
    if (/encephal|cerveau|cerebr|cervelet|crane|cranien|meninge|frontal|parietal|tempor|occipit/.test(t)) {
      if (/cervelet/.test(t)) return pt(180, 86, 'cervelet');
      return lr(t, [164, 58], [196, 58], [180, 58], 'encéphale');
    }
    if (/plevr/.test(t)) return lr(t, [102, 252], [258, 252], [102, 252], 'plèvre');
    if (/poumon|pulmon|lobe|lsd|lid|lsg|lig|lingula|bronch/.test(t)) {
      const s = cote(t);
      if (s === 'L') return /inf|lig|basal/.test(t) ? pt(224, 287, 'poumon gauche, lobe inférieur') : /lingula/.test(t) ? pt(233, 254, 'lingula') : /sup|lsg|apex|apical/.test(t) ? pt(226, 200, 'poumon gauche, lobe supérieur') : pt(226, 238, 'poumon gauche');
      if (s === 'R') return /inf|lid|basal/.test(t) ? pt(138, 287, 'poumon droit, lobe inférieur') : /moyen|\blm\b/.test(t) ? pt(127, 252, 'poumon droit, lobe moyen') : /sup|lsd|apex|apical/.test(t) ? pt(136, 198, 'poumon droit, lobe supérieur') : pt(134, 238, 'poumon droit');
      return pt(134, 238, 'poumon');
    }
    if (/mediastin|thymus/.test(t)) return pt(180, 214, 'médiastin');
    if (/coeur|pericard|cardi/.test(t)) return pt(196, 268, 'cœur / péricarde');
    if (/sein|mamm/.test(t)) return lr(t, [134, 214], [226, 214], [134, 214], 'sein');
    if (/thyro/.test(t)) return pt(180, 128, 'thyroïde');
    if (/estomac|gastr/.test(t)) return pt(226, 306, 'estomac');
    if (/vessie|vesic/.test(t)) return pt(180, 497, 'vessie');
    if (/prostat/.test(t)) return pt(180, 514, 'prostate');
    if (/uter|endomet|col ut/.test(t)) return pt(180, 480, 'utérus');
    if (/ovair|annex/.test(t)) return lr(t, [154, 482], [206, 482], [154, 482], 'ovaire');
    if (/rectum|rectal/.test(t)) return pt(180, 508, 'rectum');
    if (/\bcolon\b|caec|sigmo|grele|intestin|ileon|jejun/.test(t)) return pt(180, 420, 'tube digestif');
    if (/peritoin|carcinose|epiploo|mesent|omentum/.test(t)) return pt(160, 440, 'péritoine');
    if (/rachis|vertebr|colonne|\bos\b|osseu|bassin|iliaque|sacr|cote|femur|humerus|sternum|clavic|omoplat|scapul/.test(t)) {
      const v = niveauVertebral(t);
      if (v) return pt(CX, v.y, `rachis, ${v.nom}`);
      if (/sacr/.test(t)) return pt(CX, 458, 'sacrum');
      if (/femur/.test(t)) return lr(t, [126, 570], [234, 570], [126, 570], 'fémur');
      if (/humerus/.test(t)) return lr(t, [54, 250], [306, 250], [54, 250], 'humérus');
      if (/cote|costal/.test(t)) return lr(t, [104, 228], [256, 228], [104, 228], 'côte');
      if (/sternum/.test(t)) return pt(180, 200, 'sternum');
      if (/clavic/.test(t)) return lr(t, [130, 150], [230, 150], [130, 150], 'clavicule');
      if (/bassin|iliaq|ischi|pubi|cotyl|acetab/.test(t)) return lr(t, [128, 468], [232, 468], [128, 468], 'bassin');
      if (/rachis|vertebr|colonne/.test(t)) return pt(CX, 300, 'rachis');
      return null;
    }
    return null;
  }

  /* ---------- État d'une lésion (couleur indicative) ---------- */
  function etatLesion(ligne) {
    const l = ligne.lesion, m = ligne.mesure || {};
    const examenBaseline = !ligne.baseline && !ligne.nadir;
    if (l.type === 'non-cible' && examenBaseline && m.statut === 'presente') return 'baseline';
    if (l.type === 'non-cible') return { presente: 'stable', disparue: 'baisse', progression: 'hausse', 'non-evaluable': 'ne' }[m.statut] || 'na';
    if (l.type === 'nouvelle') return { disparue: 'baisse', 'non-evaluable': 'ne' }[m.statut] || 'hausse';
    // cible
    if (m.statut === 'non-evaluable') return 'ne';
    const v = ligne.actuel ? ligne.actuel.mm : null;
    if (v == null) return 'na';
    if (examenBaseline) return 'baseline';   // examen de baseline : référence
    const S = SEUILS.recist;
    const dN = ligne.dNadir, dB = ligne.dBaseline;
    // hausse ≥ 20 % ET ≥ 5 mm par rapport au nadir (nadir à 0 mm : seuil en mm seul)
    if (dN && dN.mm >= S.pdHausseMinMm && (dN.pct == null || dN.pct >= S.pdHausseMinPct)) return 'hausse';
    if (!l.ganglion && ligne.nadir && ligne.nadir.mm === 0 && v > 0) return 'hausse';   // réapparition
    if (l.ganglion ? v < S.rcGanglionMaxMm : v === 0) return 'baisse';
    if (dB && dB.pct != null && dB.pct <= -S.rpBaisseMinPct) return 'baisse';
    return 'stable';
  }

  const ETATS = {
    baseline: { label: 'Baseline (référence)', c: '#3c67b8' },
    baisse: { label: 'Baisse / disparue', c: '#1f8a5b' },
    stable: { label: 'Stable', c: '#e0a020' },
    hausse: { label: 'Hausse / progression', c: '#a8172d' },
    ne: { label: 'Non évaluable', c: '#8b8a96' },
    na: { label: 'À saisir', c: '#ffffff' },
  };

  /* ---------- Dessin ---------- */
  const F = 'Montserrat, Arial, sans-serif';
  const txt = (x, y, s, o = {}) => `<text x="${x}" y="${y}" font-family="${F}" font-size="${o.size || 10}" font-weight="${o.w || 700}" text-anchor="${o.a || 'middle'}" fill="${o.fill || '#111114'}" pointer-events="none">${esc(s)}</text>`;

  const SILHOUETTE = [
    // bras, jambes, tronc, cou, tête
    '<path d="M76 160 Q52 178 46 262 L38 405 Q37 424 49 425 Q59 423 61 404 L73 275 Z M284 160 Q308 178 314 262 L322 405 Q323 424 311 425 Q301 423 299 404 L287 275 Z"/>',
    '<path d="M84 522 L92 640 L170 640 L178 548 Z M276 522 L268 640 L190 640 L182 548 Z"/>',
    '<path d="M122 136 Q180 126 238 136 L284 160 Q296 176 290 202 L268 302 Q262 362 272 422 Q286 472 278 524 L82 524 Q74 472 88 422 Q98 362 92 302 L70 202 Q64 176 76 160 Z"/>',
    '<rect x="160" y="100" width="40" height="40" rx="10"/>',
    '<ellipse cx="180" cy="60" rx="42" ry="50"/>',
  ].map(s => s.replace(/^<(\w+)/, '<$1 fill="#f4f1ec" stroke="#111114" stroke-width="2.4" stroke-linejoin="round"')).join('');

  const ORGANES = [
    '<ellipse cx="180" cy="57" rx="31" ry="35" fill="#ece4f1" stroke="#b9a8c6"/>',
    '<rect x="176" y="112" width="8" height="350" rx="4" fill="#e7e2d8" stroke="#cfc6b5"/>',
    '<ellipse cx="134" cy="238" rx="38" ry="70" fill="#e3ecf6" stroke="#a9bfd9"/>',
    '<ellipse cx="226" cy="238" rx="36" ry="68" fill="#e3ecf6" stroke="#a9bfd9"/>',
    '<ellipse cx="196" cy="268" rx="27" ry="21" fill="#f4dede" stroke="#d6aaaa"/>',
    '<path d="M95 302 Q140 286 208 300 Q218 318 192 336 Q140 361 104 351 Q90 330 95 302 Z" fill="#f1dccd" stroke="#cfa98e"/>',
    '<ellipse cx="256" cy="322" rx="16" ry="27" fill="#ecd9e3" stroke="#c9a3b8"/>',
    '<path d="M164 353 Q200 342 246 339 L247 352 Q206 357 168 364 Z" fill="#f6e7c5" stroke="#d9bf86"/>',
    '<ellipse cx="140" cy="377" rx="14" ry="24" fill="#f0dfd8" stroke="#cfa999"/>',
    '<ellipse cx="222" cy="377" rx="14" ry="24" fill="#f0dfd8" stroke="#cfa999"/>',
    '<path d="M104 440 Q130 430 156 452 L160 474 Q130 476 108 468 Z M256 440 Q230 430 204 452 L200 474 Q230 476 252 468 Z" fill="#ebe6dc" stroke="#cfc6b5"/>',
    '<ellipse cx="180" cy="497" rx="24" ry="16" fill="#e2eef0" stroke="#a8c8cd"/>',
  ].join('');

  /* Lésions superposées : décalage en spirale */
  const disperser = pts => {
    const placed = [];
    return pts.map(p => {
      let { x, y } = p, k = 0;
      while (placed.some(q => Math.hypot(q.x - x, q.y - y) < 17) && k < 24) {
        k += 1;
        const a = k * 2.4, r = 9 + k * 2.2;
        x = p.x + r * Math.cos(a); y = p.y + r * Math.sin(a);
      }
      const q = { ...p, x: +x.toFixed(1), y: +y.toFixed(1) };
      placed.push(q);
      return q;
    });
  };

  const marqueur = (type, x, y, c, act) => {
    const stroke = '#111114', sw = act ? 3 : 1.6;
    if (type === 'cible') return `<circle cx="${x}" cy="${y}" r="8" fill="${c}" stroke="${stroke}" stroke-width="${sw}"/>`;
    if (type === 'non-cible') return `<rect x="${x - 7}" y="${y - 7}" width="14" height="14" rx="2" fill="${c}" stroke="${stroke}" stroke-width="${sw}"/>`;
    return `<path d="M${x} ${y - 9} L${x + 8.5} ${y + 6} L${x - 8.5} ${y + 6} Z" fill="${c}" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round"/>`;
  };

  /* comparatif : sortie de RHSuivi.registre.comparatif() */
  function svgSchema(t, o = {}) {
    const lignes = t ? t.lignes : [];
    const places = [], horsSchema = [];
    lignes.forEach(r => {
      const p = localiser(r.lesion);
      if (p) places.push({ ...p, r }); else horsSchema.push(r);
    });
    const pts = disperser(places);
    let g = `<rect width="${W}" height="${H}" fill="#ffffff"/>`;
    g += txt(CX, 16, o.titre || 'Vue d\'ensemble des lésions', { size: 11, w: 900 });
    g += txt(14, 40, 'D', { size: 13, w: 900, a: 'start' }) + txt(W - 14, 40, 'G', { size: 13, w: 900, a: 'end' });
    g += `<g transform="translate(0 16)">${SILHOUETTE}${ORGANES}`;
    pts.forEach(p => {
      const etat = etatLesion(p.r);
      const l = p.r.lesion;
      const mm = l.type === 'cible' && p.r.actuel && p.r.actuel.mm != null ? ` : ${String(p.r.actuel.mm).replace('.', ',')} mm` : '';
      const qualif = l.type === 'nouvelle' && etat === 'hausse' ? 'nouvelle lésion' : ETATS[etat].label.toLowerCase();
      // zone cliquable : repère + identifiant
      const hit = o.interactif ? `<rect class="hit" x="${p.x - 11}" y="${p.y - 11}" width="${24 + l.id.length * 7.5}" height="22" fill="#ffffff" fill-opacity="0"/>` : '';
      g += `<g${o.interactif ? ` data-l="${esc(l.id)}" style="cursor:pointer"` : ''}><title>${esc(`${l.id} — ${p.zone}${mm} (${qualif})`)}</title>${hit}`
        + marqueur(l.type, p.x, p.y, ETATS[etat].c, o.actif === l.id)
        + `<text x="${p.x + 11}" y="${p.y + 3.5}" font-family="${F}" font-size="9.5" font-weight="900" fill="#111114" stroke="#ffffff" stroke-width="3" paint-order="stroke">${esc(l.id)}</text></g>`;
    });
    g += '</g>';
    // Légende
    let y = 684;
    g += `<line x1="16" y1="${y - 14}" x2="${W - 16}" y2="${y - 14}" stroke="#d8d6de"/>`;
    g += txt(16, y, 'Forme : ', { size: 9.5, w: 900, a: 'start' });
    [['cible', 'cible', 78], ['non-cible', 'non-cible', 142], ['nouvelle', 'nouvelle', 226]].forEach(([type, lab, x]) => {
      g += marqueur(type, x, y - 3.5, '#ffffff') + txt(x + 12, y, lab, { size: 9.5, w: 700, a: 'start' });
    });
    y += 22;
    const etats = ['baseline', 'stable', 'baisse', 'hausse', 'ne', 'na'];
    etats.forEach((k, i) => {
      const yy = y + Math.floor(i / 2) * 18, x = i % 2 ? 190 : 16;
      g += `<circle cx="${x + 6}" cy="${yy - 3.5}" r="6" fill="${ETATS[k].c}" stroke="#111114" stroke-width="1.2"/>` + txt(x + 17, yy, ETATS[k].label, { size: 9, w: 700, a: 'start' });
    });
    if (horsSchema.length) {
      const ids = horsSchema.map(r => r.lesion.id);
      g += txt(16, H - 22, `Non placées (organe à préciser) : ${ids.slice(0, 9).join(', ')}${ids.length > 9 ? '…' : ''}`, { size: 9, w: 800, a: 'start', fill: '#a8172d' });
    }
    g += txt(16, H - 8, 'Couleurs indicatives par lésion — la réponse se juge sur la somme.', { size: 8.5, w: 600, a: 'start', fill: '#55545f' });
    return { svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="${F}">${g}</svg>`, largeur: W, hauteur: H, horsSchema: horsSchema.map(r => r.lesion.id) };
  }

  return { localiser, etatLesion, svgSchema, ETATS };
});
