/* =========================================================
   RadiologicHub — schémas et calculateurs du compte rendu
   • PI-RADS v2.1 (prostate) : carte des secteurs (axial, sagittal,
     coronal : schemas/prostate.js) + score
   • BI-RADS (sein) : schéma en cadran horaire + catégories ACR
   • EU-TIRADS (thyroïde) : schéma des lobes + score + cytoponction
   • Fleischner 2017 : nodules pulmonaires fortuits (schéma des lobes,
     règles dans regles/fleischner.js)
   • FIGO : cartographie des myomes utérins (schéma coronal + sagittal :
     schemas/uterus.js ; arbre décisionnel IRM : regles/myome.js)
   • CAD-RADS 2.0 : coroscanner (arbre coronaire selon la dominance :
     schemas/coronaires.js ; règles et score calcique : regles/cadrads.js)
   • RECIST 1.1 : réponse des tumeurs solides
   • Lugano 2014 (Cheson) : réponse des lymphomes (TEP ou TDM)
   Chaque outil rédige le texte à insérer dans le compte rendu ;
   les schémas (SVG) peuvent être joints, copiés ou téléchargés.
   Liaison avec l'éditeur : window.RHEditor (cr.js).
   ========================================================= */

(() => {
  const dlg = document.getElementById('tool-dialog');
  const chipsBox = document.getElementById('cr-tools');
  const editor = document.getElementById('cr-editor');
  if (!dlg || !chipsBox || !editor) return;

  const $ = (s, root = document) => root.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const norm = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const num = v => { const n = parseFloat(String(v ?? '').replace(',', '.')); return Number.isFinite(n) ? n : null; };
  const fr = (n, d = 1) => Number(n).toLocaleString('fr-FR', { maximumFractionDigits: d });
  const signed = (n, unit = ' %') => (n > 0 ? '+' : n < 0 ? '−' : '') + fr(Math.abs(n), 1) + unit;
  const listFr = a => a.length < 2 ? (a[0] || '') : a.slice(0, -1).join(', ') + ' et ' + a[a.length - 1];
  const FONT = 'Montserrat, Arial, sans-serif';
  const INK = '#111114';
  const C = { green: '#548c6c', amber: '#f2ab2f', orange: '#f18d25', red: '#a8172d', blue: '#3c67b8', grey: '#8b8a96', slate: '#5273bf' };

  /* ---------- Petits composants de formulaire ---------- */
  const opt = (pairs, val) => pairs.map(([v, t]) => `<option value="${esc(v)}"${String(v) === String(val ?? '') ? ' selected' : ''}>${esc(t)}</option>`).join('');
  const sel = (f, label, pairs, val, o = {}) =>
    `<label class="tf${o.wide ? ' tf-wide' : ''}"><span>${label}</span><select data-f="${f}"${o.re ? ' data-re' : ''}>${opt(pairs, val)}</select></label>`;
  const inp = (f, label, val, o = {}) =>
    `<label class="tf${o.wide ? ' tf-wide' : ''}${o.small ? ' tf-small' : ''}"><span>${label}</span><input data-f="${f}" value="${esc(val)}" placeholder="${esc(o.ph || '')}"${o.text ? ' data-dictee' : ' inputmode="decimal"'} autocomplete="off"></label>`;
  const chk = (f, label, val, o = {}) =>
    `<label class="tf-check"><input type="checkbox" data-f="${f}"${val ? ' checked' : ''}${o.re ? ' data-re' : ''}> ${label}</label>`;
  const badge = (txt, color) => `<span class="tl-badge" style="--c:${color}">${esc(txt)}</span>`;
  const tabs = (items, active, word, max, list) =>
    `<div class="tl-tabs" role="tablist">${items.map((it, i) =>
      `<button type="button" class="tl-tab${i === active ? ' is-active' : ''}" data-act="pick" data-i="${i}" style="--c:${it.color}">${word} ${i + 1}${it.badge ? ` <b>${esc(it.badge)}</b>` : ''}</button>`).join('')}${
      items.length < max ? `<button type="button" class="tl-tab tl-add" data-act="add" data-list="${list}">+ Ajouter</button>` : ''}${
      items.length ? `<button type="button" class="tl-tab tl-del" data-act="del" data-list="${list}" data-i="${active}" title="Supprimer ${word.toLowerCase()} ${active + 1}">Supprimer</button>` : ''}</div>`;
  const svgWrap = (w, h, body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" font-family="${FONT}">${body}</svg>`;
  const txt = (x, y, s, o = {}) => `<text x="${x}" y="${y}" font-size="${o.size || 11}" font-weight="${o.weight || 700}" text-anchor="${o.anchor || 'middle'}" fill="${o.fill || INK}"${o.ls ? ` letter-spacing="${o.ls}"` : ''} pointer-events="none">${esc(s)}</text>`;
  const pin = (x, y, n, color, active) =>
    `<g pointer-events="none"><circle cx="${x}" cy="${y}" r="${active ? 12 : 10}" fill="${color}" stroke="${active ? INK : '#fff'}" stroke-width="${active ? 3 : 2}"/>${txt(x, y + 4, n, { size: 11, weight: 900, fill: '#fff' })}</g>`;

  /* =======================================================
     PI-RADS v2.1 — prostate
     ======================================================= */
  const PI_ZONE = {
    PZa: 'zone périphérique antérieure', PZpl: 'zone périphérique postérolatérale', PZpm: 'zone périphérique postéromédiale',
    CZ: 'zone centrale', TZa: 'zone de transition antérieure', TZp: 'zone de transition postérieure',
    AS: 'stroma fibromusculaire antérieur', SV: 'vésicule séminale', US: 'sphincter urétral (urètre membraneux)',
  };
  const PI_LEVEL = { B: 'base', M: 'tiers moyen', A: 'apex' };
  const PI_DEF = {
    1: 'très faible : cancer cliniquement significatif hautement improbable',
    2: 'faible : cancer cliniquement significatif improbable',
    3: 'intermédiaire : présence d\'un cancer cliniquement significatif équivoque',
    4: 'élevé : cancer cliniquement significatif probable',
    5: 'très élevé : cancer cliniquement significatif hautement probable',
  };
  const piColor = c => (c == null ? C.blue : c <= 2 ? C.green : c === 3 ? C.amber : c === 4 ? C.orange : C.red);
  // Géométrie des coupes axiales, sagittale et coronale : schemas/prostate.js (window.RHProstate)
  const PR = window.RHProstate;
  const PI_ORDER = PR ? PR.ORDRE : [];
  const piParse = id => PR.parse(id);
  const sideAdj = (zone, side) => !side ? '' : zone === 'AS' ? (side === 'R' ? ' droit' : ' gauche') : (side === 'R' ? ' droite' : ' gauche');
  const piDescribe = ids => {
    const groups = new Map();
    [...ids].sort((a, b) => PI_ORDER.indexOf(a) - PI_ORDER.indexOf(b)).forEach(id => {
      const p = piParse(id);
      const key = p.zone + '|' + p.side;
      if (!groups.has(key)) groups.set(key, { ...p, lvs: [] });
      if (p.lv) groups.get(key).lvs.push(PI_LEVEL[p.lv]);
    });
    return listFr([...groups.values()].map(g => PI_ZONE[g.zone] + sideAdj(g.zone, g.side) + (g.lvs.length ? ` (${g.lvs.join(', ')})` : '')));
  };
  const piAlgo = l => {
    if (l.algo === 'pz' || l.algo === 'tz') return l.algo;
    const zones = l.sectors.map(id => piParse(id).zone).filter(z => z !== 'SV' && z !== 'US');
    const tz = zones.filter(z => z === 'TZa' || z === 'TZp' || z === 'AS').length;
    return tz > zones.length - tz ? 'tz' : 'pz';
  };
  // Algorithme PI-RADS v2.1 : diffusion dominante en zone périphérique, T2 dominant en zone de transition
  const piCat = l => {
    const t2 = +l.t2 || 0, dwi = +l.dwi || 0;
    if (piAlgo(l) === 'pz') {
      if (!dwi) return null;
      return dwi === 3 ? (l.dce === 'pos' ? 4 : 3) : dwi;
    }
    if (!t2) return null;
    if (t2 === 2) return dwi ? (dwi >= 4 ? 3 : 2) : null;
    if (t2 === 3) return dwi ? (dwi === 5 ? 4 : 3) : null;
    return t2;
  };
  const piIndex = st => {
    let best = -1;
    st.lesions.forEach((l, i) => {
      const c = piCat(l) || 0, b = best < 0 ? -1 : (piCat(st.lesions[best]) || 0);
      if (c > b || (c === b && (num(l.size) || 0) > (num(st.lesions[best].size) || 0))) best = i;
    });
    return best;
  };
  const newPiLesion = () => ({ sectors: [], size: '', algo: 'auto', t2: '', dwi: '', dce: '', epe: 'non' });

  const PIRADS = {
    title: 'PI-RADS v2.1 — IRM prostatique', chip: 'PI-RADS', sub: 'prostate',
    keys: ['pirads', 'pirad'], suggest: /prostat|pi-?rads/,
    hint: 'Cliquez sur les secteurs des coupes axiales pour localiser la lésion active (un second clic retire le secteur) ; les vues sagittale et coronale se placent automatiquement.',
    init: () => ({ l: '', w: '', h: '', psa: '', lesions: [newPiLesion()], active: 0 }),
    newItem: () => newPiLesion(), max: 4,
    svg(st, live) {
      return PR.svg({
        interactif: live,
        lesions: st.lesions.map((l, i) => ({ n: i + 1, color: piColor(piCat(l)), active: i === st.active, sectors: l.sectors })),
        titreLegende: 'PI-RADS :',
        legende: [['1–2', C.green], ['3', C.amber], ['4', C.orange], ['5', C.red], ['à scorer', C.blue]],
      });
    },
    click(st, e) {
      const t = e.target.closest('[data-s]');
      if (!t) return false;
      if (!st.lesions.length) { st.lesions.push(newPiLesion()); st.active = 0; }
      const l = st.lesions[st.active];
      const id = t.dataset.s;
      const i = l.sectors.indexOf(id);
      if (i >= 0) l.sectors.splice(i, 1); else l.sectors.push(id);
      return true;
    },
    form(st) {
      const l = st.lesions[st.active];
      const scores = [['', '—'], ['1', '1'], ['2', '2'], ['3', '3'], ['4', '4'], ['5', '5']];
      let h = `<fieldset class="tl-box"><legend>Prostate</legend><div class="tf-row">
        ${inp('l', 'Transverse (mm)', st.l, { small: 1 })}${inp('w', 'Antéro-post. (mm)', st.w, { small: 1 })}${inp('h', 'Crânio-caudal (mm)', st.h, { small: 1 })}${inp('psa', 'PSA (ng/mL)', st.psa, { small: 1 })}
      </div></fieldset>`;
      h += tabs(st.lesions.map(x => ({ color: piColor(piCat(x)), badge: piCat(x) ? 'PI-RADS ' + piCat(x) : '' })), st.active, 'Lésion', this.max, 'lesions');
      if (!l) return h + `<p class="tl-note">Aucune lésion : cliquez sur « + Ajouter » pour décrire une lésion.</p>`;
      const p = `lesions.${st.active}.`;
      const algo = piAlgo(l);
      h += `<p class="tl-note">${l.sectors.length ? `<strong>Secteurs :</strong> ${esc(piDescribe(l.sectors))}` : 'Cliquez sur le schéma pour localiser cette lésion.'}</p>
        <div class="tf-row">
          ${inp(p + 'size', 'Taille (mm)', l.size, { small: 1 })}
          ${sel(p + 'algo', 'Algorithme', [['auto', `Auto (${algo === 'tz' ? 'zone de transition' : 'zone périphérique'})`], ['pz', 'Zone périphérique : diffusion dominante'], ['tz', 'Zone de transition : T2 dominant']], l.algo, { wide: 1 })}
        </div>
        <div class="tf-row">
          ${sel(p + 't2', 'Score T2', scores, l.t2)}
          ${sel(p + 'dwi', 'Score diffusion', scores, l.dwi)}
          ${sel(p + 'dce', 'Perfusion (DCE)', [['', '—'], ['neg', 'Négative'], ['pos', 'Positive'], ['na', 'Non réalisée']], l.dce)}
          ${sel(p + 'epe', 'Extension extraprostatique', [['non', 'Non'], ['susp', 'Suspectée'], ['oui', 'Certaine']], l.epe)}
        </div>`;
      return h;
    },
    warn(st) {
      const l = st.lesions[st.active], w = [];
      if (!l) return w;
      const algo = piAlgo(l), dom = algo === 'pz' ? +l.dwi : +l.t2;
      if ((num(l.size) || 0) >= 15 && dom === 4) w.push(`Lésion ≥ 15 mm : le score ${algo === 'pz' ? 'diffusion' : 'T2'} 5 s'applique (≥ 1,5 cm ou extension extraprostatique).`);
      if (l.epe === 'oui' && dom && dom < 5) w.push('Extension extraprostatique certaine : score 5 à envisager.');
      if (algo === 'pz' && +l.dwi === 3 && !l.dce) w.push('Diffusion 3 en zone périphérique : renseignez la perfusion (positive → PI-RADS 4).');
      if (algo === 'tz' && (+l.t2 === 2 || +l.t2 === 3) && !l.dwi) w.push('T2 2 ou 3 en zone de transition : le score de diffusion est nécessaire.');
      return w;
    },
    result(st) {
      if (!st.lesions.length) return badge('Pas de lésion décrite', C.green);
      return st.lesions.map((l, i) => { const c = piCat(l); return badge(`Lésion ${i + 1} : ${c ? 'PI-RADS ' + c : 'à compléter'}`, piColor(c)); }).join('');
    },
    text(st) {
      const out = [];
      const L = num(st.l), W = num(st.w), H = num(st.h), psa = num(st.psa);
      if (L && W && H) {
        const vol = L * W * H * 0.52 / 1000;
        let s = `Prostate mesurant ${fr(L, 0)} × ${fr(W, 0)} × ${fr(H, 0)} mm, soit un volume estimé à ${fr(vol, 0)} mL (formule de l'ellipsoïde).`;
        if (psa != null) s += ` PSA : ${fr(psa, 2)} ng/mL ; densité de PSA : ${fr(psa / vol, 2)} ng/mL/cm³.`;
        out.push(s);
      } else if (psa != null) out.push(`PSA : ${fr(psa, 2)} ng/mL.`);
      const idx = piIndex(st);
      st.lesions.forEach((l, i) => {
        const c = piCat(l);
        let s = `Lésion n°${i + 1}${st.lesions.length > 1 && i === idx ? ' (lésion index)' : ''} : ${l.sectors.length ? piDescribe(l.sectors) : '[localisation]'}`;
        s += num(l.size) ? `, mesurant ${fr(num(l.size), 0)} mm.` : '.';
        const sc = [];
        if (l.t2) sc.push(`T2 : ${l.t2}/5`);
        if (l.dwi) sc.push(`diffusion : ${l.dwi}/5`);
        if (l.dce) sc.push(`perfusion (DCE) : ${{ pos: 'positive', neg: 'négative', na: 'non réalisée' }[l.dce]}`);
        if (sc.length) s += ' ' + sc.join(' ; ').replace(/^./, m => m.toUpperCase()) + '.';
        s += { non: ' Pas d\'extension extraprostatique.', susp: ' Extension extraprostatique suspectée.', oui: ' Extension extraprostatique.' }[l.epe];
        s += ` Score PI-RADS v2.1 : ${c || '[à compléter]'}.`;
        out.push(s);
      });
      if (!st.lesions.length) out.push('Absence de lésion significative (PI-RADS ≤ 2).');
      else if (idx >= 0 && piCat(st.lesions[idx])) {
        const l = st.lesions[idx], c = piCat(l);
        out.push(`Conclusion : ${st.lesions.length > 1 ? 'lésion index' : 'lésion'}${l.sectors.length ? ' de la ' + piDescribe(l.sectors) : ''} — PI-RADS ${c} (${PI_DEF[c]}).`);
      }
      return out.join('\n');
    },
  };

  /* =======================================================
     BI-RADS — sein
     ======================================================= */
  const BI_CAT = {
    0: 'évaluation incomplète', 1: 'négatif', 2: 'bénin', 3: 'probablement bénin',
    4: 'suspect', '4A': 'suspicion faible', '4B': 'suspicion intermédiaire', '4C': 'suspicion modérée',
    5: 'hautement évocateur de malignité', 6: 'malignité prouvée histologiquement',
  };
  const BI_CONDUCT = {
    0: 'Évaluation incomplète : examen(s) complémentaire(s) et/ou comparaison avec les examens antérieurs nécessaires.',
    1: 'Pas d\'anomalie : surveillance habituelle.',
    2: 'Anomalie bénigne : surveillance habituelle.',
    3: 'Anomalie probablement bénigne : surveillance à court terme recommandée.',
    4: 'Anomalie suspecte : prélèvement histologique recommandé.',
    5: 'Anomalie hautement évocatrice de malignité : prélèvement histologique recommandé.',
    6: 'Malignité prouvée : prise en charge thérapeutique adaptée.',
  };
  const BI_RANK = { 1: 1, 2: 2, 3: 3, 4: 4, '4A': 4.1, '4B': 4.2, '4C': 4.3, 5: 5, 6: 6, 0: 0.5 };
  const biColor = c => (c === '' || c == null ? C.blue : c === '0' ? C.slate : +c <= 2 ? C.green : c === '3' ? C.amber : String(c).startsWith('4') ? C.orange : C.red);
  const BI = { r: 118, cy: 172, cx: { D: 165, G: 475 } };
  const BI_HOURS = [['', '—'], ['c', 'Rétro-aréolaire'], ...Array.from({ length: 24 }, (_, i) => { const h = i / 2; return [String(h), hourLabel(h)]; })];
  function hourLabel(h) { const H = Math.floor(h) || 12; return h % 1 ? `${H} h 30` : `${H} h`; }
  const biQuadrant = (breast, h) => {
    if (h === 'c') return 'région rétro-aréolaire';
    const x = +h % 12;
    const right = breast === 'D';
    if (x === 0) return 'union des quadrants supérieurs';
    if (x === 6) return 'union des quadrants inférieurs';
    if (x === 3) return right ? 'union des quadrants internes' : 'union des quadrants externes';
    if (x === 9) return right ? 'union des quadrants externes' : 'union des quadrants internes';
    const up = x < 3 || x > 9, low = x > 3 && x < 9;
    const outer = right ? x > 6 : x < 6;
    return `quadrant ${up ? 'supéro' : low ? 'inféro' : ''}-${outer ? 'externe' : 'interne'}`;
  };
  const BI_DESC = {
    shape: [['', '—'], ['ovale', 'Ovale'], ['ronde', 'Ronde'], ['irrégulière', 'Irrégulière']],
    orient: [['', '—'], ['parallèle à la peau', 'Parallèle à la peau'], ['non parallèle à la peau', 'Non parallèle']],
    margins: [['', '—'], ['circonscrits', 'Circonscrits'], ['indistincts', 'Indistincts'], ['anguleux', 'Anguleux'], ['microlobulés', 'Microlobulés'], ['spiculés', 'Spiculés']],
    echo: [['', '—'], ['anéchogène', 'Anéchogène'], ['hyperéchogène', 'Hyperéchogène'], ['hypoéchogène', 'Hypoéchogène'], ['isoéchogène', 'Isoéchogène'], ['hétérogène', 'Hétérogène'], ['complexe, kystique et solide', 'Complexe kystique et solide']],
    post: [['', '—'], ['sans effet postérieur', 'Aucun'], ['avec renforcement postérieur', 'Renforcement'], ['avec atténuation postérieure', 'Atténuation'], ['avec effet postérieur mixte', 'Mixte']],
    calcMorph: [['', '—'], ['typiquement bénignes', 'Typiquement bénignes'], ['amorphes', 'Amorphes'], ['grossières hétérogènes', 'Grossières hétérogènes'], ['fines pléomorphes', 'Fines pléomorphes'], ['fines linéaires ou linéaires branchées', 'Fines linéaires (branchées)']],
    calcDist: [['', '—'], ['de distribution diffuse', 'Diffuse'], ['de distribution régionale', 'Régionale'], ['groupées (en amas)', 'Groupées (amas)'], ['de distribution linéaire', 'Linéaire'], ['de distribution segmentaire', 'Segmentaire']],
    cyst: [['simple', 'Simple'], ['compliqué (contenu échogène)', 'Compliqué'], ['complexe (composante solide)', 'Complexe']],
    asym: [['focale', 'Focale'], ['globale', 'Globale'], ['évolutive', 'Évolutive']],
    rnmDist: [['', '—'], ['focal', 'Focale'], ['linéaire', 'Linéaire'], ['segmentaire', 'Segmentaire'], ['régional', 'Régionale'], ['multirégional', 'Multirégionale'], ['diffus', 'Diffuse']],
    rnmPat: [['', '—'], ['homogène', 'Homogène'], ['hétérogène', 'Hétérogène'], ['en mottes', 'En mottes'], ['en anneaux groupés', 'En anneaux groupés']],
  };
  const BI_SUSPECT = /irrégulière|non parallèle|indistincts|anguleux|microlobulés|spiculés|fines pléomorphes|fines linéaires|linéaire|segmentaire|en mottes|anneaux|complexe \(composante|évolutive/;
  const BI_TYPES = [['masse', 'Masse'], ['kyste', 'Kyste'], ['calc', 'Microcalcifications'], ['distorsion', 'Distorsion architecturale'], ['asym', 'Asymétrie'], ['rnm', 'Rehaussement non masse (IRM)'], ['ganglion', 'Ganglion intramammaire']];
  const newBiLesion = () => ({ breast: 'D', hour: '', dist: '', a: '', b: '', type: 'masse', shape: '', orient: '', margins: '', echo: '', post: '', calcMorph: '', calcDist: '', cyst: 'simple', asym: 'focale', rnmDist: '', rnmPat: '', cat: '', more: '' });
  const biDescr = l => {
    const j = a => a.filter(Boolean).join(', ');
    switch (l.type) {
      case 'masse': return j([`masse${l.shape ? ' ' + l.shape : ''}`, l.orient, l.margins && `à contours ${l.margins}`, l.echo, l.post]);
      case 'kyste': return `kyste ${l.cyst}`;
      case 'calc': return j([`microcalcifications${l.calcMorph ? ' ' + l.calcMorph : ''}`, l.calcDist]);
      case 'distorsion': return 'distorsion architecturale';
      case 'asym': return `asymétrie ${l.asym}`;
      case 'rnm': return j([`rehaussement non masse${l.rnmDist ? ' ' + l.rnmDist : ''}`, l.rnmPat && `d'aspect ${l.rnmPat}`]);
      default: return 'ganglion intramammaire';
    }
  };
  const biBreastCat = (st, b) => {
    const cats = st.lesions.filter(l => l.breast === b && l.cat !== '').map(l => l.cat);
    if (!cats.length) return st.lesions.some(l => l.breast === b) ? '' : '1';
    if (cats.includes('0') && cats.every(c => BI_RANK[c] < 4)) return '0';
    return cats.filter(c => c !== '0').sort((x, y) => BI_RANK[y] - BI_RANK[x])[0] || '0';
  };

  const BIRADS = {
    title: 'BI-RADS — sein (classification ACR)', chip: 'BI-RADS', sub: 'sein',
    keys: ['birads', 'acrsein'], suggest: /\bseins?\b|mammo|mammaire|bi-?rads/,
    hint: 'Cliquez sur le schéma pour placer la lésion active : l\'heure et la distance au mamelon sont calculées (vue de face, comme en échographie).',
    init: () => ({ exam: 'mammo-echo', density: '', lesions: [], active: 0 }),
    newItem: () => newBiLesion(), max: 6,
    svg(st, live) {
      let g = `<rect width="640" height="350" fill="#fff"/>`;
      for (const b of ['D', 'G']) {
        const cx = BI.cx[b], cy = BI.cy, r = BI.r;
        g += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#fbfbfb" stroke="${INK}" stroke-width="2.2"${live ? ` data-b="${b}"` : ''}/>`;
        g += `<line x1="${cx}" y1="${cy - r}" x2="${cx}" y2="${cy + r}" stroke="#b4b4b4" stroke-dasharray="5 5" pointer-events="none"/><line x1="${cx - r}" y1="${cy}" x2="${cx + r}" y2="${cy}" stroke="#b4b4b4" stroke-dasharray="5 5" pointer-events="none"/>`;
        g += `<circle cx="${cx}" cy="${cy}" r="24" fill="none" stroke="#b4b4b4" stroke-dasharray="3 4" pointer-events="none"/><circle cx="${cx}" cy="${cy}" r="5" fill="${INK}" pointer-events="none"/>`;
        for (let h = 1; h <= 12; h++) {
          const a = h * 30 * Math.PI / 180;
          g += txt(+(cx + (r + 14) * Math.sin(a)).toFixed(1), +(cy - (r + 14) * Math.cos(a) + 4).toFixed(1), h, { size: 10, fill: '#55545f' });
        }
        const q = b === 'D' ? ['QSE', 'QSI', 'QIE', 'QII'] : ['QSI', 'QSE', 'QII', 'QIE'];
        g += txt(cx - 52, cy - 46, q[0], { size: 9, fill: '#9a99a6' }) + txt(cx + 52, cy - 46, q[1], { size: 9, fill: '#9a99a6' })
          + txt(cx - 52, cy + 56, q[2], { size: 9, fill: '#9a99a6' }) + txt(cx + 52, cy + 56, q[3], { size: 9, fill: '#9a99a6' });
        g += txt(cx - r - 14, cy + 20, b === 'D' ? 'EXT' : 'INT', { size: 8, weight: 900, fill: '#55545f' }) + txt(cx + r + 14, cy + 20, b === 'D' ? 'INT' : 'EXT', { size: 8, weight: 900, fill: '#55545f' });
        const cat = biBreastCat(st, b);
        g += txt(cx, 330, `SEIN ${b === 'D' ? 'DROIT' : 'GAUCHE'}${cat ? ' — BI-RADS ' + cat : ''}`, { size: 12, weight: 900, ls: 1 });
      }
      st.lesions.forEach((l, i) => {
        if (!l.hour) return;
        const cx = BI.cx[l.breast], cy = BI.cy;
        let x = cx, y = cy;
        if (l.hour !== 'c') {
          const a = (+l.hour % 12) * 30 * Math.PI / 180;
          const d = num(l.dist);
          const rad = Math.max(30, Math.min(1, d != null ? d / 10 : 0.6) * BI.r);
          x = +(cx + rad * Math.sin(a)).toFixed(1); y = +(cy - rad * Math.cos(a)).toFixed(1);
        }
        g += pin(x, y, i + 1, biColor(l.cat), i === st.active);
      });
      g += txt(320, 18, 'Vue de face — sein droit à gauche de l\'image', { size: 9, weight: 600, fill: '#55545f' });
      return svgWrap(640, 350, g);
    },
    click(st, e, pt) {
      let best = null;
      for (const b of ['D', 'G']) {
        const dx = pt.x - BI.cx[b], dy = pt.y - BI.cy, r = Math.hypot(dx, dy);
        if (r <= BI.r + 8) best = { b, dx, dy, r };
      }
      if (!best) return false;
      if (!st.lesions.length) { st.lesions.push(newBiLesion()); st.active = 0; }
      const l = st.lesions[st.active];
      l.breast = best.b;
      if (best.r <= 24) { l.hour = 'c'; l.dist = ''; return true; }
      const a = (Math.atan2(best.dx, -best.dy) * 180 / Math.PI + 360) % 360;
      l.hour = String((Math.round(a / 15) / 2) % 12);
      l.dist = String(Math.round(Math.min(1, best.r / BI.r) * 10 * 2) / 2).replace('.', ',');
      return true;
    },
    form(st) {
      const mammo = st.exam.includes('mammo');
      let h = `<fieldset class="tl-box"><legend>Examen</legend><div class="tf-row">
        ${sel('exam', 'Examen', [['mammo-echo', 'Mammographie + échographie'], ['mammo', 'Mammographie'], ['echo', 'Échographie'], ['irm', 'IRM mammaire']], st.exam, { re: 1 })}
        ${mammo ? sel('density', 'Densité (ACR)', [['', '—'], ['a', 'a — graisseux'], ['b', 'b — fibroglandulaire épars'], ['c', 'c — dense hétérogène'], ['d', 'd — extrêmement dense']], st.density) : ''}
      </div></fieldset>`;
      h += tabs(st.lesions.map(x => ({ color: biColor(x.cat), badge: x.cat !== '' ? 'BI-RADS ' + x.cat : '' })), st.active, 'Lésion', this.max, 'lesions');
      const l = st.lesions[st.active];
      if (!l) return h + `<p class="tl-note">Aucune lésion : les deux seins seront classés BI-RADS 1. Cliquez sur le schéma ou sur « + Ajouter » pour décrire une lésion.</p>`;
      const p = `lesions.${st.active}.`;
      h += `<div class="tf-row">
          ${sel(p + 'breast', 'Sein', [['D', 'Droit'], ['G', 'Gauche']], l.breast)}
          ${sel(p + 'hour', 'Rayon horaire', BI_HOURS, l.hour)}
          ${inp(p + 'dist', 'Distance au mamelon (cm)', l.dist, { small: 1 })}
          ${inp(p + 'a', 'Taille (mm)', l.a, { small: 1, ph: 'grand axe' })}
          ${inp(p + 'b', '× (mm)', l.b, { small: 1 })}
        </div>
        <div class="tf-row">${sel(p + 'type', 'Type', BI_TYPES, l.type, { re: 1 })}`;
      const d = k => sel(p + k, { shape: 'Forme', orient: 'Orientation', margins: 'Contours', echo: 'Échostructure', post: 'Effet postérieur', calcMorph: 'Morphologie', calcDist: 'Distribution', cyst: 'Kyste', asym: 'Asymétrie', rnmDist: 'Distribution', rnmPat: 'Aspect' }[k], BI_DESC[k], l[k]);
      const fields = { masse: ['shape', 'orient', 'margins', 'echo', 'post'], kyste: ['cyst'], calc: ['calcMorph', 'calcDist'], asym: ['asym'], rnm: ['rnmDist', 'rnmPat'] }[l.type] || [];
      h += fields.map(d).join('') + `</div><div class="tf-row">
          ${sel(p + 'cat', 'Catégorie BI-RADS', [['', '—'], ['0', '0 — incomplet'], ['2', '2 — bénin'], ['3', '3 — probablement bénin'], ['4', '4 — suspect'], ['4A', '4A — suspicion faible'], ['4B', '4B — intermédiaire'], ['4C', '4C — modérée'], ['5', '5 — hautement évocateur'], ['6', '6 — malignité prouvée']], l.cat)}
          ${inp(p + 'more', 'Précisions (facultatif)', l.more, { wide: 1, text: 1, ph: 'ex. profondeur, comparaison…' })}
        </div>`;
      return h;
    },
    warn(st) {
      const l = st.lesions[st.active];
      return l && l.cat !== '' && BI_RANK[l.cat] <= 3 && BI_SUSPECT.test(biDescr(l))
        ? ['Un descripteur suspect est sélectionné : une catégorie 4 ou 5 est à envisager.'] : [];
    },
    result(st) {
      return ['D', 'G'].map(b => { const c = biBreastCat(st, b); return badge(`Sein ${b === 'D' ? 'droit' : 'gauche'} : ${c ? 'BI-RADS ' + c : 'à compléter'}`, biColor(c)); }).join('');
    },
    text(st) {
      const out = [];
      if (st.exam.includes('mammo') && st.density) {
        out.push(`Seins de densité de type ${st.density} (ACR) : ${{ a: 'seins presque entièrement graisseux', b: 'zones de densité fibroglandulaire éparses', c: 'seins de densité hétérogène, pouvant masquer de petites masses', d: 'seins extrêmement denses, ce qui diminue la sensibilité de la mammographie' }[st.density]}.`);
      }
      for (const b of ['D', 'G']) {
        const ls = st.lesions.map((l, i) => ({ l, i })).filter(x => x.l.breast === b);
        const name = b === 'D' ? 'Sein droit' : 'Sein gauche';
        if (!ls.length) { out.push(`${name} : pas d'anomalie décelable.`); continue; }
        ls.forEach(({ l, i }) => {
          let s = `${name} — lésion n°${i + 1} : ${biDescr(l)}`;
          if (num(l.a)) s += `, mesurant ${fr(num(l.a), 0)}${num(l.b) ? ' × ' + fr(num(l.b), 0) : ''} mm`;
          if (l.hour) s += l.hour === 'c' ? ', en région rétro-aréolaire' : `, située à ${hourLabel(+l.hour)}${num(l.dist) != null ? `, à ${fr(num(l.dist), 1)} cm du mamelon` : ''} (${biQuadrant(b, l.hour)})`;
          if (l.more.trim()) s += `, ${l.more.trim()}`;
          s += l.cat !== '' ? `. BI-RADS ${l.cat} (${BI_CAT[l.cat]}).` : '. [catégorie BI-RADS]';
          out.push(s);
        });
      }
      const cD = biBreastCat(st, 'D'), cG = biBreastCat(st, 'G');
      out.push(`Conclusion : classification BI-RADS de l'ACR — sein droit : ${cD || '[à compléter]'} ; sein gauche : ${cG || '[à compléter]'}.`);
      const top = [cD, cG].filter(Boolean).sort((x, y) => BI_RANK[y] - BI_RANK[x])[0];
      if (top) out.push(BI_CONDUCT[String(top).charAt(0)]);
      return out.join('\n');
    },
  };

  /* =======================================================
     EU-TIRADS 2017 — thyroïde
     ======================================================= */
  const TI_DEF = { 1: 'normal', 2: 'bénin', 3: 'faible risque', 4: 'risque intermédiaire', 5: 'haut risque' };
  const TI_FNA = { 3: 20, 4: 15, 5: 10 };
  const tiColor = c => (c == null ? C.blue : c <= 2 ? C.green : c === 3 ? C.amber : c === 4 ? C.orange : C.red);
  const TI_LOC = {
    'R-sup': 'du tiers supérieur du lobe droit', 'R-mid': 'du tiers moyen du lobe droit', 'R-inf': 'du tiers inférieur du lobe droit',
    I: 'de l\'isthme',
    'L-sup': 'du tiers supérieur du lobe gauche', 'L-mid': 'du tiers moyen du lobe gauche', 'L-inf': 'du tiers inférieur du lobe gauche',
  };
  const TG = { cy: 185, ry: 128, rx: 60, cx: { R: 172, L: 348 } };
  const tiCat = n => {
    if (!n.comp) return null;
    if (n.comp === 'kyste' || n.comp === 'spongiforme') return 2;
    if (n.shape === 'non-ovale' || n.margins === 'irreguliers' || n.micro === 'oui' || n.echo === 'tres-hypo') return 5;
    if (!n.echo) return null;
    return n.echo === 'hypo' ? 4 : 3;
  };
  const tiMax = n => Math.max(num(n.d1) || 0, num(n.d2) || 0, num(n.d3) || 0);
  const tiFna = n => {
    const c = tiCat(n), m = tiMax(n);
    if (c == null) return '';
    if (c <= 2) return 'pas d\'indication de cytoponction';
    if (!m) return `cytoponction si > ${TI_FNA[c]} mm`;
    if (m > TI_FNA[c]) return `indication de cytoponction (> ${TI_FNA[c]} mm)`;
    if (c === 5 && m >= 5) return 'surveillance active ou cytoponction à discuter (nodule de 5 à 10 mm)';
    return `pas d'indication de cytoponction (seuil : > ${TI_FNA[c]} mm)`;
  };
  const newNodule = () => ({ loc: '', x: null, y: null, d1: '', d2: '', d3: '', comp: '', echo: '', shape: 'ovale', margins: 'reguliers', micro: 'non' });

  const TIRADS = {
    title: 'EU-TIRADS — échographie thyroïdienne', chip: 'EU-TIRADS', sub: 'thyroïde',
    keys: ['tirads', 'eutirads'], suggest: /thyroid|tirads/,
    hint: 'Cliquez sur le schéma pour placer le nodule actif (lobe droit à gauche de l\'image).',
    init: () => ({ rh: '', rw: '', rd: '', lh: '', lw: '', ld: '', isth: '', node: false, nodules: [], active: 0 }),
    newItem: () => newNodule(), max: 6,
    svg(st, live) {
      let g = `<rect width="520" height="380" fill="#fff"/>`;
      g += `<defs>${['R', 'L'].map(s => `<clipPath id="tl-lobe-${s}"><ellipse cx="${TG.cx[s]}" cy="${TG.cy}" rx="${TG.rx}" ry="${TG.ry}"/></clipPath>`).join('')}</defs>`;
      g += `<rect x="232" y="30" width="56" height="320" rx="24" fill="#f2f2f4" stroke="#c9c9d1" pointer-events="none"/>`;
      for (let y = 46; y < 340; y += 18) g += `<line x1="236" y1="${y}" x2="284" y2="${y}" stroke="#dcdce2" stroke-width="5" stroke-linecap="round" pointer-events="none"/>`;
      // Isthme : bande entre les deux lobes (bords supérieur et inférieur seulement)
      g += `<rect x="215" y="214" width="90" height="50" fill="#fbfbfb"${live ? ' data-z="I"' : ''}><title>Isthme</title></rect>`;
      g += `<line x1="230" y1="214" x2="290" y2="214" stroke="${INK}" stroke-width="2" pointer-events="none"/><line x1="219" y1="264" x2="301" y2="264" stroke="${INK}" stroke-width="2" pointer-events="none"/>`;
      const y1 = TG.cy - TG.ry, t = TG.ry * 2 / 3;
      for (const s of ['R', 'L']) {
        const cx = TG.cx[s];
        [['sup', 0], ['mid', 1], ['inf', 2]].forEach(([k, i]) => {
          g += `<rect x="${cx - TG.rx}" y="${(y1 + i * t).toFixed(1)}" width="${TG.rx * 2}" height="${t.toFixed(1)}" fill="#fbfbfb" clip-path="url(#tl-lobe-${s})"${live ? ` data-z="${s}-${k}"` : ''}><title>${esc(TI_LOC[s + '-' + k].replace(/^du |^de l'/, ''))}</title></rect>`;
        });
        g += `<ellipse cx="${cx}" cy="${TG.cy}" rx="${TG.rx}" ry="${TG.ry}" fill="none" stroke="${INK}" stroke-width="2.2" pointer-events="none"/>`;
        for (const yy of [y1 + t, y1 + 2 * t]) g += `<line x1="${cx - TG.rx}" y1="${yy.toFixed(1)}" x2="${cx + TG.rx}" y2="${yy.toFixed(1)}" stroke="#b4b4b4" stroke-dasharray="5 5" clip-path="url(#tl-lobe-${s})" pointer-events="none"/>`;
        g += txt(cx, 345, s === 'R' ? 'LOBE DROIT' : 'LOBE GAUCHE', { size: 12, weight: 900, ls: 1 });
      }
      g += txt(260, 291, 'isthme', { size: 9, weight: 700, fill: '#55545f' });
      g += txt(22, 30, 'D', { size: 13, weight: 900 }) + txt(498, 30, 'G', { size: 13, weight: 900 });
      g += txt(260, 372, 'Vue de face — lobe droit à gauche de l\'image', { size: 9, weight: 600, fill: '#55545f' });
      st.nodules.forEach((n, i) => { if (n.x != null) g += pin(n.x, n.y, i + 1, tiColor(tiCat(n)), i === st.active); });
      return svgWrap(520, 380, g);
    },
    click(st, e, pt) {
      const z = e.target.closest('[data-z]');
      if (!z) return false;
      if (!st.nodules.length) { st.nodules.push(newNodule()); st.active = 0; }
      const n = st.nodules[st.active];
      n.loc = z.dataset.z;
      n.x = +pt.x.toFixed(1); n.y = +pt.y.toFixed(1);
      return true;
    },
    form(st) {
      let h = `<fieldset class="tl-box"><legend>Thyroïde (facultatif)</legend>
        <div class="tf-row">${inp('rh', 'Lobe D : hauteur', st.rh, { small: 1 })}${inp('rw', 'largeur', st.rw, { small: 1 })}${inp('rd', 'épaisseur (mm)', st.rd, { small: 1 })}</div>
        <div class="tf-row">${inp('lh', 'Lobe G : hauteur', st.lh, { small: 1 })}${inp('lw', 'largeur', st.lw, { small: 1 })}${inp('ld', 'épaisseur (mm)', st.ld, { small: 1 })}${inp('isth', 'Isthme (mm)', st.isth, { small: 1 })}</div>
        ${chk('node', 'Adénopathie cervicale suspecte', st.node)}
      </fieldset>`;
      h += tabs(st.nodules.map(x => ({ color: tiColor(tiCat(x)), badge: tiCat(x) ? 'EU-TIRADS ' + tiCat(x) : '' })), st.active, 'Nodule', this.max, 'nodules');
      const n = st.nodules[st.active];
      if (!n) return h + `<p class="tl-note">Aucun nodule : thyroïde classée EU-TIRADS 1. Cliquez sur le schéma ou sur « + Ajouter ».</p>`;
      const p = `nodules.${st.active}.`;
      const solid = n.comp && n.comp !== 'kyste' && n.comp !== 'spongiforme';
      h += `<div class="tf-row">
          ${sel(p + 'loc', 'Localisation', [['', '—'], ...Object.entries(TI_LOC).map(([k, v]) => [k, v.replace(/^du |^de l'/, '').replace(/^./, m => m.toUpperCase())])], n.loc, { wide: 1 })}
          ${inp(p + 'd1', 'Taille (mm)', n.d1, { small: 1 })}${inp(p + 'd2', '×', n.d2, { small: 1 })}${inp(p + 'd3', '×', n.d3, { small: 1 })}
        </div>
        <div class="tf-row">
          ${sel(p + 'comp', 'Composition', [['', '—'], ['kyste', 'Kystique pur (anéchogène)'], ['spongiforme', 'Entièrement spongiforme'], ['mixte', 'Mixte (kystique et solide)'], ['solide', 'Solide']], n.comp, { re: 1 })}
          ${solid ? sel(p + 'echo', 'Échogénicité (portion solide)', [['', '—'], ['hyper', 'Hyperéchogène'], ['iso', 'Isoéchogène'], ['hypo', 'Légèrement hypoéchogène'], ['tres-hypo', 'Très hypoéchogène (marquée)']], n.echo) : ''}
        </div>`;
      if (solid) {
        h += `<div class="tf-row">
          ${sel(p + 'shape', 'Forme', [['ovale', 'Ovale'], ['non-ovale', 'Non ovale (plus haut que large)']], n.shape)}
          ${sel(p + 'margins', 'Contours', [['reguliers', 'Réguliers'], ['irreguliers', 'Irréguliers']], n.margins)}
          ${sel(p + 'micro', 'Microcalcifications', [['non', 'Non'], ['oui', 'Oui']], n.micro)}
        </div>`;
      }
      return h;
    },
    result(st) {
      if (!st.nodules.length) return badge('EU-TIRADS 1 (pas de nodule)', C.green);
      return st.nodules.map((n, i) => { const c = tiCat(n); return badge(`Nodule ${i + 1} : ${c ? 'EU-TIRADS ' + c : 'à compléter'}${c ? ' — ' + tiFna(n) : ''}`, tiColor(c)); }).join('');
    },
    text(st) {
      const out = [];
      const lobe = (s, a, b, c) => { const v = [a, b, c].map(num); return v.every(x => x) ? { s, v, vol: v[0] * v[1] * v[2] * 0.52 / 1000 } : null; };
      const R = lobe('droit', st.rh, st.rw, st.rd), L = lobe('gauche', st.lh, st.lw, st.ld);
      const parts = [R, L].filter(Boolean).map(o => `lobe ${o.s} ${o.v.map(x => fr(x, 0)).join(' × ')} mm`);
      if (num(st.isth) != null) parts.push(`isthme ${fr(num(st.isth), 1)} mm d'épaisseur`);
      if (parts.length) {
        let s = `Thyroïde : ${listFr(parts)}.`;
        if (R && L) s += ` Volume thyroïdien estimé à ${fr(R.vol + L.vol, 1)} mL.`;
        out.push(s);
      }
      st.nodules.forEach((n, i) => {
        const c = tiCat(n), m = [n.d1, n.d2, n.d3].map(num).filter(x => x);
        let s = `Nodule n°${i + 1} ${n.loc ? TI_LOC[n.loc] : '[localisation]'}${m.length ? `, mesurant ${m.map(x => fr(x, 0)).join(' × ')} mm` : ''}`;
        const solid = n.comp && n.comp !== 'kyste' && n.comp !== 'spongiforme';
        const d = [];
        if (n.comp === 'kyste') d.push('kystique pur (anéchogène)');
        if (n.comp === 'spongiforme') d.push('entièrement spongiforme');
        if (n.comp === 'mixte') d.push('mixte (kystique et solide)');
        if (n.comp === 'solide') d.push('solide');
        if (solid) {
          if (n.echo) d.push({ hyper: 'hyperéchogène', iso: 'isoéchogène', hypo: 'légèrement hypoéchogène', 'tres-hypo': 'très hypoéchogène' }[n.echo]);
          d.push(n.shape === 'ovale' ? 'de forme ovale' : 'de forme non ovale (plus haut que large)');
          d.push(n.margins === 'reguliers' ? 'à contours réguliers' : 'à contours irréguliers');
          d.push(n.micro === 'oui' ? 'avec microcalcifications' : 'sans microcalcification');
        }
        if (d.length) s += ', ' + d.join(', ');
        s += c ? ` : EU-TIRADS ${c} (${TI_DEF[c]}) ; ${tiFna(n)}.` : ' : [score EU-TIRADS].';
        out.push(s);
      });
      if (st.node) out.push('Adénopathie cervicale suspecte : cytoponction recommandée.');
      if (!st.nodules.length) out.push('Absence de nodule thyroïdien : EU-TIRADS 1.');
      else {
        const cs = st.nodules.map(tiCat).filter(Boolean);
        const fna = st.nodules.map((n, i) => /^indication/.test(tiFna(n)) ? `n°${i + 1}` : '').filter(Boolean);
        if (cs.length) out.push(`Conclusion : ${st.nodules.length > 1 ? `${st.nodules.length} nodules, score le plus élevé` : 'nodule'} EU-TIRADS ${Math.max(...cs)} ; ${fna.length ? `cytoponction recommandée pour le${fna.length > 1 ? 's' : ''} nodule${fna.length > 1 ? 's' : ''} ${listFr(fna)}` : 'pas d\'indication de cytoponction selon les seuils EU-TIRADS'}.`);
      }
      return out.join('\n');
    },
  };

  /* =======================================================
     RECIST 1.1
     ======================================================= */
  const RE_LABEL = { CR: 'réponse complète (RC)', PR: 'réponse partielle (RP)', SD: 'maladie stable (MS)', PD: 'progression (MP)', NE: 'non évaluable (NE)', NN: 'ni réponse complète ni progression (non-RC/non-MP)' };
  const reColor = r => ({ CR: C.green, PR: C.green, SD: C.amber, PD: C.red, NN: C.amber }[r] || C.grey);
  const newTarget = () => ({ name: '', organ: '', node: false, base: '', cur: '' });
  const recist = st => {
    const T = st.targets.filter(t => num(t.base) != null);
    const r = { sb: 0, sn: 0, sc: 0, target: null, overall: null, missing: false };
    if (T.length) {
      r.sb = T.reduce((a, t) => a + num(t.base), 0);
      r.missing = T.some(t => num(t.cur) == null);
      r.sc = T.reduce((a, t) => a + (num(t.cur) || 0), 0);
      r.sn = num(st.nadir) != null ? num(st.nadir) : r.sb;
      if (r.missing) r.target = 'NE';
      else if (r.sc - r.sn >= 0.2 * r.sn && r.sc - r.sn >= 5) r.target = 'PD';
      else if (T.every(t => t.node ? num(t.cur) < 10 : num(t.cur) === 0)) r.target = 'CR';
      else if (r.sb > 0 && (r.sb - r.sc) / r.sb >= 0.3) r.target = 'PR';
      else r.target = 'SD';
    }
    const nt = st.nontarget, nl = st.newLes === 'oui';
    if (r.target) {
      if (nl || r.target === 'PD' || nt === 'pd') r.overall = 'PD';
      else if (r.target === 'CR') r.overall = (nt === 'cr' || nt === 'none') ? 'CR' : 'PR';
      else if (r.target === 'PR') r.overall = 'PR';
      else if (r.target === 'SD') r.overall = 'SD';
      else r.overall = 'NE';
    } else if (nt !== 'none') {
      r.overall = nl || nt === 'pd' ? 'PD' : nt === 'cr' ? 'CR' : nt === 'noncr' ? 'NN' : 'NE';
    }
    return r;
  };
  const RECIST = {
    title: 'RECIST 1.1 — réponse tumorale', chip: 'RECIST 1.1', sub: 'tumeurs solides',
    keys: ['recist'], suggest: /recist|lesions? cibles?|lesion cible/,
    hint: 'Lésions cibles : 5 au maximum (2 par organe), plus grand diamètre (petit axe pour les ganglions, ≥ 15 mm à l\'inclusion).',
    init: () => ({ targets: [newTarget(), newTarget()], nadir: '', nontarget: 'none', newLes: 'non' }),
    newItem: () => newTarget(), max: 5,
    form(st) {
      const rows = st.targets.map((t, i) => `<tr>
          <td><input data-f="targets.${i}.name" value="${esc(t.name)}" placeholder="ex. nodule LID" autocomplete="off"></td>
          <td><input data-f="targets.${i}.organ" value="${esc(t.organ)}" placeholder="ex. poumon" autocomplete="off"></td>
          <td class="tl-c"><input type="checkbox" data-f="targets.${i}.node"${t.node ? ' checked' : ''} title="Ganglion : mesurer le petit axe"></td>
          <td><input data-f="targets.${i}.base" value="${esc(t.base)}" inputmode="decimal" autocomplete="off"></td>
          <td><input data-f="targets.${i}.cur" value="${esc(t.cur)}" inputmode="decimal" autocomplete="off"></td>
          <td><button type="button" class="tl-x" data-act="del" data-list="targets" data-i="${i}" aria-label="Supprimer la lésion ${i + 1}">×</button></td>
        </tr>`).join('');
      return `<table class="tl-table"><thead><tr><th>Lésion cible</th><th>Organe</th><th>Gg</th><th>Initial (mm)</th><th>Actuel (mm)</th><th></th></tr></thead><tbody>${rows}</tbody></table>
        ${st.targets.length < this.max ? `<button type="button" class="tl-tab tl-add" data-act="add" data-list="targets">+ Ajouter une lésion cible</button>` : ''}
        <div class="tf-row">
          ${inp('nadir', 'Somme au nadir (mm)', st.nadir, { ph: 'vide = examen initial' })}
          ${sel('nontarget', 'Lésions non cibles', [['none', 'Aucune'], ['cr', 'Disparition (ganglions < 10 mm)'], ['noncr', 'Persistantes (non-RC / non-MP)'], ['pd', 'Progression non équivoque'], ['ne', 'Non évaluées']], st.nontarget)}
          ${sel('newLes', 'Nouvelles lésions', [['non', 'Non'], ['oui', 'Oui'], ['equivoque', 'Équivoque']], st.newLes)}
        </div>`;
    },
    warn(st) {
      const organs = {};
      st.targets.forEach(t => { const k = norm(t.organ.trim()); if (k) organs[k] = (organs[k] || 0) + 1; });
      return Object.values(organs).some(n => n > 2) ? ['RECIST 1.1 : 2 lésions cibles au maximum par organe.'] : [];
    },
    result(st) {
      const r = recist(st);
      if (!r.overall) return badge('Renseignez au moins une lésion cible ou les lésions non cibles', C.grey);
      return (r.target ? badge(`Cibles : ${RE_LABEL[r.target]}`, reColor(r.target)) : '') + badge(`Réponse globale : ${RE_LABEL[r.overall]}`, reColor(r.overall));
    },
    text(st) {
      const r = recist(st), out = ['Évaluation selon les critères RECIST 1.1 :'];
      const T = st.targets.filter(t => num(t.base) != null);
      if (T.length) {
        out.push('Lésions cibles :');
        T.forEach((t, i) => out.push(`• ${t.name.trim() || 'Lésion ' + (i + 1)}${t.organ.trim() ? ' (' + t.organ.trim() + ')' : ''}${t.node ? ', ganglion (petit axe)' : ''} : ${fr(num(t.base), 0)} mm → ${num(t.cur) != null ? fr(num(t.cur), 0) + ' mm' : '[non mesurée]'}.`));
        let s = `Somme des diamètres : initiale ${fr(r.sb, 0)} mm${num(st.nadir) != null ? `, nadir ${fr(r.sn, 0)} mm` : ''}, actuelle ${r.missing ? '[incomplète]' : fr(r.sc, 0) + ' mm'}`;
        if (!r.missing && r.sb) s += `, soit ${signed((r.sc - r.sb) / r.sb * 100)} par rapport à l'examen initial`;
        if (!r.missing && num(st.nadir) != null && r.sn) s += ` et ${signed((r.sc - r.sn) / r.sn * 100)} (${signed(r.sc - r.sn, ' mm')}) par rapport au nadir`;
        out.push(s + '.');
        out.push(`Réponse des lésions cibles : ${RE_LABEL[r.target]}.`);
      }
      out.push(`Lésions non cibles : ${{ none: 'aucune', cr: 'disparition', noncr: 'persistantes, sans progression non équivoque', pd: 'progression non équivoque', ne: 'non évaluées' }[st.nontarget]}.`);
      out.push(`Nouvelles lésions : ${{ non: 'non', oui: 'oui', equivoque: 'lésion équivoque, à confirmer au prochain contrôle' }[st.newLes]}.`);
      out.push(`Réponse globale RECIST 1.1 : ${r.overall ? RE_LABEL[r.overall] : '[à compléter]'}.`);
      return out.join('\n');
    },
  };

  /* =======================================================
     Lugano 2014 (Cheson) — lymphomes
     ======================================================= */
  const DEAUVILLE = {
    1: 'pas de fixation au-dessus du bruit de fond', 2: 'fixation inférieure ou égale au médiastin',
    3: 'fixation supérieure au médiastin mais inférieure ou égale au foie', 4: 'fixation modérément supérieure au foie',
    5: 'fixation nettement supérieure au foie et/ou nouvelles lésions',
  };
  const LU_LABEL = {
    CMR: 'réponse métabolique complète (RMC)', PMR: 'réponse métabolique partielle (RMP)', NMR: 'absence de réponse métabolique (ARM)', PMD: 'maladie métabolique progressive (MMP)',
    CR: 'réponse complète (RC)', PR: 'réponse partielle (RP)', SD: 'maladie stable (MS)', PD: 'maladie progressive (MP)', NE: 'non évaluable',
  };
  const luColor = r => ({ CMR: C.green, CR: C.green, PMR: C.green, PR: C.green, NMR: C.amber, SD: C.amber, PMD: C.red, PD: C.red }[r] || C.grey);
  const newLuLesion = () => ({ site: '', extra: false, bL: '', bS: '', nL: '', nS: '', cL: '', cS: '' });
  const luPet = st => {
    const d = +st.deauville;
    if (st.newLes === 'oui' || st.marrow === 'nouveau') return 'PMD';
    if (!d) return null;
    if (d <= 3) return st.marrow === 'residuel' ? 'PMR' : 'CMR';
    return { reduit: 'PMR', stable: 'NMR', augmente: 'PMD' }[st.compare] || null;
  };
  const luCt = st => {
    const L = st.lesions.filter(l => num(l.bL) != null && num(l.bS) != null);
    const r = { spdB: 0, spdC: 0, missing: false, pdLes: [], spleenPd: false, resp: null };
    L.forEach((l, i) => {
      const bL = num(l.bL), bS = num(l.bS), cL = num(l.cL), cS = num(l.cS);
      const nL = num(l.nL) ?? bL, nS = num(l.nS) ?? bS;
      r.spdB += bL * bS;
      if (cL == null || cS == null) { r.missing = true; return; }
      r.spdC += cL * cS;
      const thr = nL <= 20 ? 5 : 10;
      if (cL > 15 && cL * cS >= 1.5 * nL * nS && (cL - nL >= thr || cS - nS >= thr)) r.pdLes.push(i + 1);
    });
    const sb = num(st.spleenB), sc = num(st.spleenC);
    if (sb != null && sc != null) r.spleenPd = sb > 13 ? sc - sb > 0.5 * (sb - 13) : sc > 13 && sc - sb >= 2;
    if (!L.length) return r;
    if (r.pdLes.length || r.spleenPd || st.newLes === 'oui' || st.nonMeasured === 'progression') r.resp = 'PD';
    else if (r.missing) r.resp = 'NE';
    else if (L.every(l => l.extra ? num(l.cL) === 0 : num(l.cL) <= 15) && st.nonMeasured === 'absent' && (sc == null || sc <= 13)) r.resp = 'CR';
    else if (r.spdB && (r.spdB - r.spdC) / r.spdB >= 0.5) r.resp = 'PR';
    else r.resp = 'SD';
    return r;
  };
  const LUGANO = {
    title: 'Lugano 2014 (Cheson) — réponse des lymphomes', chip: 'Lugano', sub: 'lymphome',
    keys: ['lugano', 'cheson', 'deauville'], suggest: /lymphom|hodgkin|lugano|deauville|cheson/,
    hint: 'TEP-TDM : échelle de Deauville (lymphomes avides du FDG). TDM : jusqu\'à 6 lésions cibles, plus grand diamètre transverse (LDi) × plus petit diamètre perpendiculaire (SDi).',
    init: () => ({ mode: 'pet', timing: 'fin', deauville: '', compare: '', newLes: 'non', marrow: 'normal', lesions: [newLuLesion(), newLuLesion()], spleenB: '', spleenC: '', nonMeasured: 'absent' }),
    newItem: () => newLuLesion(), max: 6,
    form(st) {
      let h = `<div class="tf-row">${sel('mode', 'Évaluation', [['pet', 'TEP-TDM (Deauville)'], ['ct', 'TDM (diamètres)']], st.mode, { re: 1 })}</div>`;
      if (st.mode === 'pet') {
        h += `<div class="tf-row">
          ${sel('timing', 'Moment', [['interim', 'Évaluation intermédiaire'], ['fin', 'Fin de traitement']], st.timing)}
          ${sel('deauville', 'Score de Deauville (site le plus fixant)', [['', '—'], ...Object.entries(DEAUVILLE).map(([k, v]) => [k, `${k} — ${v}`])], st.deauville, { wide: 1 })}
        </div><div class="tf-row">
          ${sel('compare', 'Fixation / examen initial', [['', '—'], ['reduit', 'Diminuée'], ['stable', 'Inchangée'], ['augmente', 'Augmentée']], st.compare)}
          ${sel('newLes', 'Nouvelles lésions FDG+ (lymphome)', [['non', 'Non'], ['oui', 'Oui']], st.newLes)}
          ${sel('marrow', 'Moelle osseuse', [['normal', 'Pas de fixation pathologique'], ['residuel', 'Fixation focale résiduelle (diminuée)'], ['nouveau', 'Atteinte nouvelle ou récidivante']], st.marrow)}
        </div>`;
        if (+st.deauville === 3) h += `<p class="tl-note">Le score 3 correspond en règle à une réponse métabolique complète ; certains protocoles de désescalade le considèrent comme une réponse insuffisante.</p>`;
        return h;
      }
      const rows = st.lesions.map((l, i) => `<tr>
          <td><input data-f="lesions.${i}.site" value="${esc(l.site)}" placeholder="ex. adp lombo-aortique" autocomplete="off"></td>
          <td class="tl-c"><input type="checkbox" data-f="lesions.${i}.extra"${l.extra ? ' checked' : ''} title="Lésion extraganglionnaire"></td>
          <td class="tl-pair"><input data-f="lesions.${i}.bL" value="${esc(l.bL)}" inputmode="decimal" placeholder="LDi"><input data-f="lesions.${i}.bS" value="${esc(l.bS)}" inputmode="decimal" placeholder="SDi"></td>
          <td class="tl-pair"><input data-f="lesions.${i}.nL" value="${esc(l.nL)}" inputmode="decimal" placeholder="LDi"><input data-f="lesions.${i}.nS" value="${esc(l.nS)}" inputmode="decimal" placeholder="SDi"></td>
          <td class="tl-pair"><input data-f="lesions.${i}.cL" value="${esc(l.cL)}" inputmode="decimal" placeholder="LDi"><input data-f="lesions.${i}.cS" value="${esc(l.cS)}" inputmode="decimal" placeholder="SDi"></td>
          <td><button type="button" class="tl-x" data-act="del" data-list="lesions" data-i="${i}" aria-label="Supprimer la lésion ${i + 1}">×</button></td>
        </tr>`).join('');
      return h + `<table class="tl-table"><thead><tr><th>Site</th><th>Extra-gg</th><th>Initial (mm)</th><th>Nadir (mm, facult.)</th><th>Actuel (mm)</th><th></th></tr></thead><tbody>${rows}</tbody></table>
        ${st.lesions.length < this.max ? `<button type="button" class="tl-tab tl-add" data-act="add" data-list="lesions">+ Ajouter une lésion</button>` : ''}
        <div class="tf-row">
          ${inp('spleenB', 'Rate initiale (cm)', st.spleenB, { small: 1 })}${inp('spleenC', 'Rate actuelle (cm)', st.spleenC, { small: 1 })}
          ${sel('nonMeasured', 'Lésions non mesurées', [['absent', 'Absentes / normalisées'], ['present', 'Présentes, stables ou en régression'], ['progression', 'Progression nette']], st.nonMeasured)}
          ${sel('newLes', 'Nouvelles lésions', [['non', 'Non'], ['oui', 'Oui']], st.newLes)}
        </div>`;
    },
    result(st) {
      if (st.mode === 'pet') { const r = luPet(st); return badge(r ? `Réponse : ${LU_LABEL[r]}` : 'Renseignez le score de Deauville', luColor(r)); }
      const r = luCt(st);
      if (!r.resp) return badge('Renseignez au moins une lésion (initial LDi × SDi)', C.grey);
      return badge(`SPD : ${r.missing ? '—' : signed(r.spdB ? (r.spdC - r.spdB) / r.spdB * 100 : 0)}`, C.slate) + badge(`Réponse : ${LU_LABEL[r.resp]}`, luColor(r.resp));
    },
    text(st) {
      if (st.mode === 'pet') {
        const r = luPet(st), out = [`Évaluation selon la classification de Lugano 2014 (TEP-TDM, ${st.timing === 'interim' ? 'évaluation intermédiaire' : 'fin de traitement'}) :`];
        if (st.deauville) out.push(`Score de Deauville : ${st.deauville} (${DEAUVILLE[st.deauville]}).`);
        if (st.compare) out.push(`Fixation ${{ reduit: 'diminuée', stable: 'inchangée', augmente: 'augmentée' }[st.compare]} par rapport à l'examen initial.`);
        out.push(`Nouvelles lésions hypermétaboliques évocatrices de lymphome : ${st.newLes === 'oui' ? 'oui' : 'non'}.`);
        out.push(`Moelle osseuse : ${{ normal: 'pas de fixation pathologique', residuel: 'fixation focale résiduelle, diminuée par rapport à l\'examen initial', nouveau: 'atteinte nouvelle ou récidivante' }[st.marrow]}.`);
        let s = `Réponse : ${r ? LU_LABEL[r] : '[à compléter]'}`;
        if (r === 'PMR') s += st.timing === 'interim' ? ' (en évaluation intermédiaire : maladie répondeuse)' : ' (en fin de traitement : maladie résiduelle)';
        out.push(s + '.');
        return out.join('\n');
      }
      const r = luCt(st), out = ['Évaluation selon la classification de Lugano 2014 (TDM) :'];
      st.lesions.forEach((l, i) => {
        const b = [num(l.bL), num(l.bS)], c = [num(l.cL), num(l.cS)];
        if (b.some(x => x == null)) return;
        out.push(`• ${l.site.trim() || 'Lésion ' + (i + 1)}${l.extra ? ' (extraganglionnaire)' : ''} : ${fr(b[0], 0)} × ${fr(b[1], 0)} mm → ${c.every(x => x != null) ? `${fr(c[0], 0)} × ${fr(c[1], 0)} mm` : '[non mesurée]'}${r.pdLes.includes(i + 1) ? ' (critères de progression)' : ''}.`);
      });
      if (r.spdB) out.push(`Somme des produits des diamètres (SPD) : initiale ${fr(r.spdB / 100, 1)} cm², actuelle ${r.missing ? '[incomplète]' : `${fr(r.spdC / 100, 1)} cm², soit ${signed((r.spdC - r.spdB) / r.spdB * 100)}`}.`);
      if (num(st.spleenB) != null || num(st.spleenC) != null) out.push(`Rate : ${num(st.spleenB) != null ? fr(num(st.spleenB), 1) + ' cm' : '—'} → ${num(st.spleenC) != null ? fr(num(st.spleenC), 1) + ' cm' : '—'}${r.spleenPd ? ' (progression splénique)' : ''}.`);
      out.push(`Lésions non mesurées : ${{ absent: 'absentes ou normalisées', present: 'présentes, stables ou en régression', progression: 'progression nette' }[st.nonMeasured]}. Nouvelles lésions : ${st.newLes === 'oui' ? 'oui' : 'non'}.`);
      out.push(`Réponse : ${r.resp ? LU_LABEL[r.resp] : '[à compléter]'}.`);
      return out.join('\n');
    },
  };

  /* =======================================================
     Fleischner 2017 — nodules pulmonaires de découverte fortuite
     Règles : regles/fleischner.js (testées sous Node)
     ======================================================= */
  const FL = window.RHRegles && window.RHRegles.fleischner;
  const flColor = r => (r == null ? C.blue : r <= 1 ? C.green : r === 2 ? C.amber : r === 3 ? C.orange : C.red);
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  const FL_LOBE_NOM = { LSD: 'lobe supérieur droit', LM: 'lobe moyen', LID: 'lobe inférieur droit', LSG: 'lobe supérieur gauche', lingula: 'lingula', LIG: 'lobe inférieur gauche' };
  // Régions cliquables (vue de face, poumon droit à gauche de l'image), découpées par la silhouette des poumons
  const FL_ZONES = {
    LSD: '0,0 260,0 260,170 109,170 92,140 0,140', LM: '109,170 260,170 260,340 206,340', LID: '0,140 92,140 206,340 0,340',
    LSG: '260,0 520,0 520,120 430,120 383,215 260,215', lingula: '260,215 383,215 322,340 260,340', LIG: '430,120 520,120 520,340 322,340',
  };
  const FL_POS = { LSD: [150, 118], LM: [186, 262], LID: [118, 262], LSG: [368, 128], lingula: [328, 262], LIG: [402, 262] };
  const FL_LUNG = {
    R: 'M205 42 C160 44 112 78 92 140 C76 192 70 262 74 330 C120 316 176 316 228 334 C222 296 214 262 218 232 C222 200 210 170 214 140 C220 100 222 62 205 42 Z',
    L: 'M315 42 C360 44 408 78 428 140 C444 192 450 262 446 330 C400 316 352 316 318 330 C300 312 290 286 296 262 C304 232 302 200 306 140 C300 100 298 62 315 42 Z',
  };
  const FL_DECALAGE = [[0, 0], [0, -24], [0, 24], [-20, -12], [-20, 12], [20, 0]];   // nodules sans clic dans un même lobe
  const F_TYPE_COURT = { solide: 'solide', 'verre-depoli': 'VD', 'part-solide': 'PS' };
  const newFlNodule = () => ({ type: 'solide', lobe: '', grandAxe: '', petitAxe: '', volume: '', composanteSolide: '', suspect: false, benin: false, pfnContact: false, pfnForme: false, pfnContours: false, pfnSeptale: false, pfnCarene: false, pos: null });
  const flPos = (st, i) => {
    const n = st.nodules[i];
    if (n.pos && n.pos.lobe === n.lobe) return [n.pos.x, n.pos.y];
    if (!n.lobe) return null;
    const k = st.nodules.slice(0, i).filter(m => m.lobe === n.lobe && !(m.pos && m.pos.lobe === m.lobe)).length;
    const [x, y] = FL_POS[n.lobe], [dx, dy] = FL_DECALAGE[k % FL_DECALAGE.length];
    return [x + dx, y + dy];
  };

  const FLEISCHNER = {
    title: 'Fleischner 2017 — nodule pulmonaire de découverte fortuite', chip: 'Fleischner', sub: 'nodule pulmonaire',
    keys: ['fleischner', 'nodulepulm'],
    suggest: /fleischner|micronodul|nodules? pulmonaires?|verre depoli|nodules?\b[^.\n]{0,40}\b(lobe (superieur|moyen|inferieur)|lingula|lsd|lid|lsg|lig)\b/,
    hint: 'Cliquez sur le schéma pour placer le nodule actif (poumon droit à gauche de l\'image). Taille = moyenne du grand et du petit axe mesurés sur la même coupe, arrondie au millimètre.',
    init: () => ({ contexte: 'fortuit', risque: '', autresNodules: false, nodules: [], active: 0 }),
    newItem: () => newFlNodule(), max: 6,
    svg(st, live) {
      const r = FL.evaluer(st);
      let g = '<rect width="520" height="380" fill="#fff"/>';
      g += `<defs>${['R', 'L'].map(s => `<clipPath id="fl-poumon-${s}"><path d="${FL_LUNG[s]}"/></clipPath>`).join('')}</defs>`;
      // trachée et bronches souches
      g += '<path d="M252 14 L268 14 L268 104 L292 150 L284 156 L260 116 L236 156 L228 150 L252 104 Z" fill="#f2f2f4" stroke="#c9c9d1" pointer-events="none"/>';
      Object.entries(FL_ZONES).forEach(([k, pts]) => {
        const s = /^(LSD|LM|LID)$/.test(k) ? 'R' : 'L';
        g += `<polygon points="${pts}" fill="${k === 'LM' || k === 'lingula' ? '#f3f6fb' : '#fbfbfb'}" clip-path="url(#fl-poumon-${s})"${live ? ` data-z="${k}"` : ''}><title>${esc(cap(FL_LOBE_NOM[k]))}</title></polygon>`;
      });
      // scissures
      g += `<g fill="none" stroke="#9a99a6" stroke-width="1.6" stroke-dasharray="6 5" pointer-events="none">
        <line x1="109" y1="170" x2="240" y2="170" clip-path="url(#fl-poumon-R)"/><line x1="92" y1="140" x2="206" y2="340" clip-path="url(#fl-poumon-R)"/>
        <line x1="430" y1="120" x2="322" y2="340" clip-path="url(#fl-poumon-L)"/></g>`;
      g += `<line x1="280" y1="215" x2="383" y2="215" stroke="#c9c9d1" stroke-width="1.2" stroke-dasharray="2 4" clip-path="url(#fl-poumon-L)" pointer-events="none"/>`;
      g += ['R', 'L'].map(s => `<path d="${FL_LUNG[s]}" fill="none" stroke="${INK}" stroke-width="2.2" pointer-events="none"/>`).join('');
      [['LSD', 150, 78], ['LM', 190, 214], ['LID', 112, 314], ['LSG', 372, 84], ['lingula', 340, 236], ['LIG', 412, 314]].forEach(([k, x, y]) => {
        g += txt(x, y, k === 'lingula' ? 'Lingula' : k, { size: 10, weight: 800, fill: '#8b8a96' });
      });
      g += txt(22, 30, 'D', { size: 13, weight: 900 }) + txt(498, 30, 'G', { size: 13, weight: 900 });
      g += txt(260, 372, 'Vue de face — poumon droit à gauche de l\'image', { size: 9, weight: 600, fill: '#55545f' });
      st.nodules.forEach((n, i) => {
        const p = flPos(st, i);
        if (p) g += pin(p[0], p[1], i + 1, flColor(r.nodules[i] && r.nodules[i].rang), i === st.active);
      });
      return svgWrap(520, 380, g);
    },
    click(st, e, pt) {
      const z = e.target.closest('[data-z]');
      if (!z) return false;
      if (!st.nodules.length) { st.nodules.push(newFlNodule()); st.active = 0; }
      const n = st.nodules[st.active];
      n.lobe = z.dataset.z;
      n.pos = { lobe: n.lobe, x: +pt.x.toFixed(1), y: +pt.y.toFixed(1) };
      return true;
    },
    form(st) {
      const r = FL.evaluer(st);
      let h = `<fieldset class="tl-box"><legend>Contexte</legend>
        <div class="tf-row">
          ${sel('contexte', 'Situation', Object.entries(FL.CONTEXTES), st.contexte, { wide: 1 })}
          ${sel('risque', 'Risque de cancer bronchique', [['', 'Non précisé (les deux conduites)'], ['faible', 'Faible'], ['eleve', 'Élevé']], st.risque)}
        </div>
        <p class="tl-note">Haut risque : tabagisme (actuel ou ancien), exposition professionnelle (amiante, radon, uranium), antécédent familial de cancer bronchique, âge avancé, emphysème, fibrose pulmonaire. Faible risque : tabagisme absent ou minime et aucun autre facteur. Le risque ne module que les nodules solides.</p>
        ${chk('autresNodules', 'Autres nodules non détaillés ici (nodules multiples)', st.autresNodules)}
      </fieldset>`;
      if (!r.applicable) h += `<p class="tl-warn">Recommandations Fleischner non applicables : ${esc(r.motif)}.</p>`;
      h += tabs(st.nodules.map((x, i) => ({ color: flColor(r.nodules[i].rang), badge: F_TYPE_COURT[x.type] + (r.nodules[i].taille.mm ? ` ${r.nodules[i].taille.mm} mm` : '') })), st.active, 'Nodule', this.max, 'nodules');
      const n = st.nodules[st.active];
      if (!n) return h + '<p class="tl-note">Aucun nodule : cliquez sur le schéma ou sur « + Ajouter ».</p>';
      const p = `nodules.${st.active}.`;
      h += `<div class="tf-row">
          ${sel(p + 'type', 'Type', [['solide', 'Solide'], ['verre-depoli', 'Verre dépoli pur'], ['part-solide', 'Partiellement solide']], n.type)}
          ${sel(p + 'lobe', 'Localisation', [['', '—'], ...Object.entries(FL_LOBE_NOM).map(([k, v]) => [k, cap(v)])], n.lobe)}
        </div>
        <div class="tf-row">
          ${inp(p + 'grandAxe', 'Grand axe (mm)', n.grandAxe, { small: 1 })}${inp(p + 'petitAxe', 'Petit axe (mm)', n.petitAxe, { small: 1 })}
          ${n.type === 'solide' ? inp(p + 'volume', 'Volume (mm³, facultatif)', n.volume, { small: 1 }) : ''}
          ${n.type === 'part-solide' ? inp(p + 'composanteSolide', 'Composante solide (mm)', n.composanteSolide, { small: 1 }) : ''}
        </div>
        <div class="tf-row">
          ${chk(p + 'suspect', 'Morphologie suspecte (spicules…)', n.suspect)}
          ${chk(p + 'benin', 'Calcification de type bénin ou graisse', n.benin)}
        </div>`;
      if (n.type === 'solide') {
        h += `<fieldset class="tl-box"><legend>Ganglion intrapulmonaire ? (Fleischner 2017)</legend>
          <p class="tl-note">Nodule périscissural ou juxtapleural d'aspect typique : pas de surveillance, même au-delà de 6 mm. <strong>Les trois critères sont exigés</strong>, sans signe suspect (diamètre moyen &lt; 10 mm) :</p>
          <div class="tf-row">
            ${chk(p + 'pfnContact', 'Au contact d\'une scissure ou de la plèvre', n.pfnContact)}
            ${chk(p + 'pfnForme', 'Forme ovale, lenticulaire ou triangulaire', n.pfnForme)}
            ${chk(p + 'pfnContours', 'Homogène, contours lisses', n.pfnContours)}
          </div>
          <p class="tl-note">Arguments en plus, fréquents mais <strong>non exigés</strong> par la recommandation :</p>
          <div class="tf-row">
            ${chk(p + 'pfnSeptale', 'Ligne septale vers la plèvre', n.pfnSeptale)}
            ${chk(p + 'pfnCarene', 'Sous le niveau de la carène', n.pfnCarene)}
          </div>
        </fieldset>`;
      }
      return h;
    },
    warn(st) {
      const w = [];
      st.nodules.forEach((n, i) => {
        const t = FL.taille(n);
        if (t.note) w.push(`Nodule ${i + 1} : un seul diamètre renseigné — la moyenne du grand et du petit axe est recommandée.`);
        if ((t.grand || 0) > 30 || (t.petit || 0) > 30) w.push(`Nodule ${i + 1} : plus de 30 mm, il s'agit d'une masse (hors du champ des recommandations Fleischner).`);
        if (n.type === 'part-solide' && t.mm >= FL.SEUILS.petitMm && num(n.composanteSolide) == null) w.push(`Nodule ${i + 1} : mesurez la composante solide.`);
        if (n.type === 'part-solide' && num(n.composanteSolide) != null && t.grand != null && num(n.composanteSolide) > t.grand) w.push(`Nodule ${i + 1} : la composante solide dépasse le grand axe du nodule.`);
        const g = FL.ganglionTypique(n);
        if (g.solide && g.evoque && !g.ok) {
          const pourquoi = [];
          if (g.manque.length) pourquoi.push(`critère manquant : ${g.manque.join(', ')}`);
          if (g.suspect) pourquoi.push('morphologie suspecte');
          if (g.tropGros) pourquoi.push('diamètre moyen de 10 mm ou plus');
          w.push(`Nodule ${i + 1} : ganglion intrapulmonaire non retenu (${pourquoi.join(' ; ')}) — règles habituelles.`);
        }
      });
      return w;
    },
    result(st) {
      const r = FL.evaluer(st);
      if (!st.nodules.length) return badge('Ajoutez un nodule (clic sur le schéma)', C.grey);
      if (!r.applicable) return badge('Fleischner non applicable', C.grey);
      let h = st.nodules.map((n, i) => {
        const x = r.nodules[i];
        return badge(`Nodule ${i + 1} : ${x.rang == null ? `à compléter (${x.manque || 'données'})` : x.court}`, flColor(x.rang));
      }).join('');
      if (r.rang != null) h += badge(`Conduite${st.nodules.length > 1 ? ` (nodule ${r.guide + 1}, le plus suspect)` : ''} : ${r.texte}`, flColor(r.rang));
      return h;
    },
    text(st) {
      const r = FL.evaluer(st), out = [];
      const plusieurs = st.nodules.length > 1;
      st.nodules.forEach((n, i) => {
        const t = FL.taille(n);
        let s = `${plusieurs ? `Nodule pulmonaire n°${i + 1}` : 'Nodule pulmonaire'} ${FL.TYPES[n.type] || ''} ${n.lobe ? FL.LOBES[n.lobe] : '[localisation]'}`;
        const dims = [t.grand, t.petit].filter(x => x != null);
        if (dims.length) s += `, mesurant ${dims.map(x => fr(x, 1)).join(' × ')} mm${dims.length === 2 ? ` (diamètre moyen ${fr(t.mm, 0)} mm)` : ''}`;
        else s += ', [taille]';
        if (n.type === 'solide' && t.volume != null) s += `, volume ${fr(t.volume, 0)} mm³`;
        if (n.type === 'part-solide') s += num(n.composanteSolide) != null ? `, dont une composante solide de ${fr(num(n.composanteSolide), 1)} mm` : ', composante solide [taille]';
        const d = [];
        if (n.type === 'solide') {
          const g = FL.ganglionTypique(n);
          const signes = [...Object.keys(FL.CRITERES_GANGLION), ...Object.keys(FL.ARGUMENTS_GANGLION)].filter(k => n[k])
            .map(k => FL.CRITERES_GANGLION[k] || FL.ARGUMENTS_GANGLION[k]);
          if (g.ok) d.push(`d'aspect typique de ganglion intrapulmonaire (${signes.join(', ')})`);
          else d.push(...signes);
        }
        if (n.suspect) d.push('de morphologie suspecte');
        if (n.benin) d.push('présentant des critères de bénignité (calcification de type bénin ou graisse)');
        if (d.length) s += ', ' + d.join(', ');
        out.push(s + '.');
      });
      if (!st.nodules.length) out.push('Nodule pulmonaire [à décrire].');
      if (!r.applicable) {
        out.push(`Recommandations de la Société Fleischner non applicables : ${r.motif}.`);
        return out.join('\n');
      }
      if (r.rang == null) { out.push('Recommandations de la Société Fleischner (2017) : [à compléter].'); return out.join('\n'); }
      const g = r.nodules[r.guide];
      // le niveau de risque ne module que les nodules solides
      const risque = g.n.type === 'solide' && g.ligne && !g.deuxRisques ? ({ faible: ', patient à faible risque', eleve: ', patient à haut risque' }[st.risque] || '') : '';
      const ligne = plusieurs ? g.ligne.replace('le plus suspect', `le plus suspect (n°${r.guide + 1})`) : g.ligne;
      out.push(`Selon les recommandations de la Société Fleischner (2017) pour les nodules de découverte fortuite${ligne ? ` — ${ligne}` : ''}${risque} : ${r.texte}.`);
      if (r.rang > 0 && FL.proposeTdm(r.texte)) out.push('Contrôle par TDM thoracique à faible dose, sans injection, en coupes fines jointives (1 mm, au plus 1,5 mm).');
      return out.join('\n');
    },
  };
  /* =======================================================
     Myomes utérins — cartographie FIGO et caractérisation IRM
     Règles : regles/myome.js (testées sous Node) ; schéma : schemas/uterus.js
     ======================================================= */
  const MY = window.RHRegles && window.RHRegles.myome;
  const UT = window.RHUterus;
  const MY_SANS_TYPE = '#ffffff';                 // myome placé, type FIGO à préciser (bulle blanche sur le schéma)
  const myColor = m => (m.type && MY.FIGO[m.type] ? MY.couleur(m.type) : MY_SANS_TYPE);
  const myTabColor = m => (m.type && MY.FIGO[m.type] ? MY.couleur(m.type) : '#55545f');
  const MY_PAROIS = [['anterieure', 'Antérieure'], ['posterieure', 'Postérieure'], ['fundique', 'Fundique'], ['laterale-droite', 'Latérale droite'], ['laterale-gauche', 'Latérale gauche']];
  const MY_NIVEAUX = [['fundus', 'Fundus'], ['corps', 'Corps'], ['isthme', 'Isthme']];
  const MY_SIEGES = [['col', 'Col utérin'], ['ligament-droit', 'Ligament large droit'], ['ligament-gauche', 'Ligament large gauche'], ['parasite', 'Parasite (à distance)']];
  const MY_T2 = { hypo: 'en hyposignal T2', intermediaire: 'en signal T2 intermédiaire', hyper: 'en hypersignal T2' };
  const MY_T1 = { non: 'sans hypersignal T1', peripherique: 'avec un hypersignal T1 périphérique', diffus: 'avec un hypersignal T1 diffus' };
  const MY_REH = { homogene: 'se rehaussant de façon homogène', heterogene: 'à rehaussement hétérogène', absent: 'sans rehaussement après injection' };
  const MY_PLURIEL = { 'sous-muqueux': 'sous-muqueux', interstitiel: 'interstitiel|interstitiels', 'sous-séreux': 'sous-séreux', transmural: 'transmural|transmuraux', autre: 'FIGO 8', '': 'de type à préciser' };
  const myAccord = (cat, n) => { const [s, p] = (MY_PLURIEL[cat] || cat).split('|'); return n > 1 && p ? p : s; };
  const newMyome = () => ({ type: '', paroi: '', niveau: 'corps', special: 'col', d1: '', d2: '', d3: '', pedicule: '', encorbellement: false, t2: '', t1: '', rehaussement: '', adc: '', remaniement: '', contours: 'reguliers', necrose: false });
  // « interstitiel FIGO 4 (intramural) de la paroi latérale droite du corps utérin »
  const myNom = (m, court) => {
    const loc = MY.localisation(m);
    if (m.type === '8') return `${loc || '[siège]'} (FIGO 8)`;
    const t = MY.FIGO[m.type];
    const type = t ? `${t.cat} FIGO ${m.type}${court ? '' : ` (${t.desc})`}` : '[type FIGO]';
    return `${type} ${m.paroi === 'fundique' ? 'fundique' : loc ? 'de la ' + loc : '[localisation]'}`;
  };
  const myCarac = m => MY.caracteriser(m);      // l'ADC n'intervient qu'en signal T2 intermédiaire
  const myIndexMax = st => {
    let best = -1;
    st.myomes.forEach((m, i) => { if (MY.tailleMax(m) > (best < 0 ? 0 : MY.tailleMax(st.myomes[best]))) best = i; });
    return best;
  };

  const MYOMES = {
    title: 'Myomes utérins — cartographie FIGO', chip: 'FIGO', sub: 'myomes',
    keys: ['figo', 'myomes', 'myome'], suggest: /myom|fibrom|figo/,
    hint: 'Cliquez sur l\'une des deux vues pour placer le myome actif (paroi et niveau) ; sa profondeur suit le type FIGO. Vue sagittale d\'un utérus antéversé : paroi antérieure en bas (vessie), postérieure en haut. Une paroi absente de la vue y est projetée en pointillés.',
    init: () => ({ position: '', l: '', w: '', h: '', autres: false, adenomyose: false, endometriose: false, myomes: [newMyome()], active: 0 }),
    newItem: () => newMyome(), max: 8,
    svg(st, live) {
      return UT.svg({
        interactif: live,
        portrait: live && window.matchMedia('(max-width: 640px)').matches,   // petit écran : vue coronale sous la vue sagittale
        myomes: st.myomes.map((m, i) => ({ ...m, n: i + 1, color: myColor(m), active: i === st.active })),
        legende: [...Object.values(MY.CATEGORIES).map(c => [c.label, c.c]), ['Type à préciser', MY_SANS_TYPE]],
      });
    },
    click(st, e, pt) {
      if (!e.target.closest('[data-u]')) return false;
      const svg = e.target.closest('svg');
      const z = UT.zone(pt.x, pt.y, !!svg && svg.viewBox.baseVal.width < 700);
      if (!z) return false;
      if (!st.myomes.length) { st.myomes.push(newMyome()); st.active = 0; }
      const m = st.myomes[st.active];
      if (z.special) { m.type = '8'; m.special = z.special; }
      else { m.paroi = z.paroi; m.niveau = z.niveau; if (m.type === '8') m.type = ''; }
      return true;
    },
    form(st) {
      let h = `<fieldset class="tl-box"><legend>Utérus</legend><div class="tf-row">
          ${sel('position', 'Position', [['', '—'], ['antéversé', 'Antéversé'], ['rétroversé', 'Rétroversé'], ['intermédiaire', 'Intermédiaire']], st.position)}
          ${inp('l', 'Longueur (mm)', st.l, { small: 1 })}${inp('w', 'Transverse (mm)', st.w, { small: 1 })}${inp('h', 'Antéro-post. (mm)', st.h, { small: 1 })}
        </div><div class="tf-row">
          ${chk('autres', 'Autres myomes non détaillés ici', st.autres)}
          ${chk('adenomyose', 'Adénomyose associée', st.adenomyose)}
          ${chk('endometriose', 'Endométriose associée', st.endometriose)}
        </div></fieldset>`;
      h += tabs(st.myomes.map(x => ({ color: myTabColor(x), badge: x.type ? 'FIGO ' + x.type : '' })), st.active, 'Myome', this.max, 'myomes');
      const m = st.myomes[st.active];
      if (!m) return h + '<p class="tl-note">Aucun myome : cliquez sur le schéma ou sur « + Ajouter ».</p>';
      const p = `myomes.${st.active}.`;
      const loc = MY.localisation(m);
      h += `<p class="tl-note">${loc ? `<strong>Localisation :</strong> ${esc(loc)}` : 'Cliquez sur le schéma pour localiser ce myome.'}</p>
        <div class="tf-row">
          ${sel(p + 'type', 'Type FIGO', [['', '—'], ...MY.TYPES.map(t => [t, `${t} — ${MY.FIGO[t].cat} : ${MY.FIGO[t].desc}`])], m.type, { wide: 1 })}
        </div>
        <div class="tf-row">
          ${m.type === '8' ? sel(p + 'special', 'Siège', MY_SIEGES, m.special, { wide: 1 })
            : sel(p + 'paroi', 'Paroi', [['', '—'], ...MY_PAROIS], m.paroi) + (m.paroi === 'fundique' ? '' : sel(p + 'niveau', 'Niveau', MY_NIVEAUX, m.niveau))}
        </div>
        <div class="tf-row">
          ${inp(p + 'd1', 'Grand axe (mm)', m.d1, { small: 1 })}${inp(p + 'd2', '2ᵉ axe (mm)', m.d2, { small: 1 })}${inp(p + 'd3', '3ᵉ axe (mm)', m.d3, { small: 1 })}
          ${m.type === '7' ? inp(p + 'pedicule', 'Largeur du pédicule (mm)', m.pedicule, { small: 1 }) : ''}
        </div>
        ${m.type === '2-5' ? `<div class="tf-row">${chk(p + 'encorbellement', 'Encorbellement vasculaire autour du myome', m.encorbellement)}</div>` : ''}
        <fieldset class="tl-box"><legend>Caractérisation IRM (arbre décisionnel)</legend><div class="tf-row">
          ${sel(p + 't2', 'Signal T2', [['', '—'], ['hypo', 'Hyposignal'], ['intermediaire', 'Intermédiaire'], ['hyper', 'Hypersignal']], m.t2)}
          ${m.t2 === 'intermediaire' ? sel(p + 't1', 'Hypersignal T1', [['', '—'], ['non', 'Non'], ['peripherique', 'Périphérique'], ['diffus', 'Diffus']], m.t1) : ''}
          ${sel(p + 'rehaussement', 'Rehaussement', [['', '—'], ['homogene', 'Homogène'], ['heterogene', 'Hétérogène'], ['absent', 'Absent']], m.rehaussement)}
          ${m.t2 === 'intermediaire' ? inp(p + 'adc', 'ADC (× 10⁻³ mm²/s)', m.adc, { small: 1 }) : ''}
        </div><div class="tf-row">
          ${sel(p + 'remaniement', 'Remaniement', [['', 'Aucun'], ['hemorragique', 'Hémorragique'], ['graisseux', 'Graisseux (lipoléiomyome)'], ['calcique', 'Calcifié']], m.remaniement)}
          ${sel(p + 'contours', 'Contours', [['reguliers', 'Réguliers'], ['irreguliers', 'Irréguliers']], m.contours)}
        </div><div class="tf-row">
          ${chk(p + 'necrose', 'Remaniements nécrotico-hémorragiques', m.necrose)}
        </div></fieldset>`;
      return h;
    },
    warn(st) {
      const w = [], plus = st.myomes.length > 1;
      st.myomes.forEach((m, i) => {
        const q = plus ? `Myome ${i + 1} : ` : '';
        if (m.type === '7' && num(m.pedicule) == null) w.push(`${q}myome sous-séreux pédiculé (FIGO 7) — mesurez la largeur du pédicule (risque de torsion).`);
        if (m.type === '2-5' && !m.encorbellement) w.push(`${q}myome transmural (FIGO 2-5) — noter l'encorbellement vasculaire autour du myome.`);
        const c = myCarac(m);
        if (m.t2 && !c.diagnostic && c.note) w.push(`${q}${c.note}.`);
        if (c.niveau === 'attention') w.push(`${q}${c.diagnostic} — ${c.note}.`);
        const a = MY.argumentsSarcome(m);
        if (a.length) w.push(`${q}argument(s) en faveur d'un léiomyosarcome : ${a.join(', ')}.`);
      });
      return w;
    },
    result(st) {
      if (!st.myomes.length) return badge('Aucun myome décrit', C.green);
      let h = st.myomes.map((m, i) => {
        const c = myCarac(m);
        const t = m.type ? `FIGO ${m.type}` : 'type à préciser';
        return badge(`Myome ${i + 1} : ${t}${c.diagnostic ? ' · ' + c.diagnostic : ''}`, c.niveau === 'suspect' ? C.red : myTabColor(m));
      }).join('');
      const n = st.myomes.length;
      if (n > 1 || st.autres) h += badge('Utérus polymyomateux', C.grey);
      return h;
    },
    text(st) {
      const out = [], n = st.myomes.length, plus = n > 1;
      const L = num(st.l), W = num(st.w), H = num(st.h);
      let u = `Utérus${st.position ? ' ' + st.position : ''}`;
      if (L && W && H) u += `, mesurant ${fr(L, 0)} × ${fr(W, 0)} × ${fr(H, 0)} mm (volume estimé à ${fr(MY.volume(L, W, H), 0)} mL)`;
      u += n > 1 || st.autres ? ', polymyomateux.' : n ? ', siège d\'un myome.' : ', sans myome individualisé.';
      out.push(u);
      st.myomes.forEach((m, i) => {
        let s = `${plus ? `Myome n°${i + 1}` : 'Myome'} ${myNom(m)}`;
        const d = MY.dims(m);
        s += d.length ? `, mesurant ${d.map(x => fr(x, 0)).join(' × ')} mm` : ', [taille]';
        if (d.length === 3) s += ` (volume estimé à ${fr(MY.volume(m.d1, m.d2, m.d3), 1)} mL)`;
        s += '.';
        if (m.type === '7') s += num(m.pedicule) != null ? ` Pédicule de ${fr(num(m.pedicule), 0)} mm de largeur.` : ' Largeur du pédicule : [à mesurer].';
        if (m.type === '2-5' && m.encorbellement) s += ' Encorbellement vasculaire autour du myome.';
        const sig = [];
        if (m.t2) sig.push(MY_T2[m.t2]);
        if (m.t2 === 'intermediaire' && m.t1) sig.push(MY_T1[m.t1]);
        if (m.rehaussement) sig.push(MY_REH[m.rehaussement]);
        if (m.t2 === 'intermediaire' && num(m.adc) != null) sig.push(`ADC mesuré à ${fr(num(m.adc), 2)} × 10⁻³ mm²/s`);
        if (m.contours === 'irreguliers') sig.push('à contours irréguliers');
        if (m.necrose) sig.push('siège de remaniements nécrotico-hémorragiques');
        const c = myCarac(m);
        if (sig.length) s += ' ' + cap(sig.join(', ')) + (c.diagnostic ? ` : ${c.niveau === 'suspect' ? c.diagnostic : 'aspect de ' + c.diagnostic}` : '') + '.';
        if (m.remaniement) s += ' ' + cap(MY.REMANIEMENTS[m.remaniement]) + '.';
        out.push(s);
      });
      if (st.autres) out.push('Autres myomes, non détaillés.');
      if (st.adenomyose) out.push('Adénomyose associée.');
      if (st.endometriose) out.push('Lésions d\'endométriose associées.');

      // Conclusion
      if (!n) return out.join('\n');
      const parCat = {};
      st.myomes.forEach(m => { const k = MY.categorie(m.type) || ''; parCat[k] = (parCat[k] || 0) + 1; });
      const ordre = ['sous-muqueux', 'interstitiel', 'sous-séreux', 'transmural', 'autre', ''];
      const detail = ordre.filter(k => parCat[k]).map(k => `${parCat[k]} ${myAccord(k, parCat[k])}`);
      const poly = plus || st.autres;
      let conc = poly
        ? `Conclusion : utérus polymyomateux (${n} myome${plus ? 's' : ''} décrit${plus ? 's' : ''}${detail.length ? ' : ' + listFr(detail) : ''})`
        : `Conclusion : myome ${myNom(st.myomes[0])}`;
      const iMax = myIndexMax(st);
      if (iMax >= 0) {
        const mm = fr(MY.tailleMax(st.myomes[iMax]), 0);
        conc += poly ? `, le plus volumineux étant ${plus ? `le n°${iMax + 1}, ` : ''}${myNom(st.myomes[iMax], true)}, mesurant ${mm} mm` : ` mesurant ${mm} mm`;
      }
      out.push(conc + '.');
      st.myomes.forEach((m, i) => {
        const a = MY.argumentsSarcome(m);
        if (a.length) out.push(`${plus ? `Myome n°${i + 1} : a` : 'A'}rguments en faveur d'un léiomyosarcome (${a.join(', ')}).`);
      });
      return out.join('\n');
    },
  };

  /* =======================================================
     CAD-RADS 2.0 — coroscanner (dominance, lésions, score calcique)
     Règles : regles/cadrads.js (testées sous Node) ; schéma : schemas/coronaires.js
     ======================================================= */
  const CA = window.RHRegles && window.RHRegles.cadrads;
  const CO = window.RHCoronaires;
  const caGradeColor = g => ({ 0: C.green, '1-24': C.green, '25-49': C.amber, '50-69': C.orange, '70-99': C.red, 100: '#5c0a18', nd: C.grey }[g] || C.blue);
  const caCatColor = c => (c === '0' || c === '1' ? C.green : c === '2' ? C.amber : c === '3' ? C.orange : c === 'N' ? C.grey : c == null ? C.blue : C.red);
  const CA_PLAQUES = { calcifiee: 'calcifiée', mixte: 'partiellement calcifiée', 'non-calcifiee': 'non calcifiée' };
  const CA_EXCEPTIONS = [['', 'Aucune'], ['anomalie de naissance', 'Anomalie de naissance'], ['dissection', 'Dissection'], ['anévrisme', 'Anévrisme / pseudo-anévrisme'], ['fistule', 'Fistule coronaire'], ['vascularite', 'Vascularite'], ['compression extrinsèque', 'Compression extrinsèque'], ['autre cause non athéromateuse', 'Autre (non athéromateuse)']];
  const newCoroLesion = () => ({ seg: '', grade: '', plaque: '', hrp: { remodelage: false, hypodense: false, ponctuees: false, anneau: false }, stent: false });
  const caSegLabel = n => `${n} — ${CA.SEGMENTS[n].nom.replace(/^./, m => m.toUpperCase())}`;

  const CADRADS = {
    title: 'CAD-RADS 2.0 — coroscanner', chip: 'CAD-RADS', sub: 'coroscanner',
    keys: ['cadrads', 'scorecalcique', 'dominance'], suggest: /coro-?scanner|cad-?rads|score calcique|agatston|coronaire|dominance/,
    hint: 'Choisissez la dominance (le schéma se redessine), puis cliquez sur un segment pour y placer la lésion active. Schéma à plat, 18 segments.',
    init: () => ({ dominance: 'droite', bissectrice: false, cac: '', ischemie: '', pontage: false, exception: '', lesions: [], active: 0 }),
    newItem: () => newCoroLesion(), max: 8,
    svg(st, live) {
      return CO.svg({ dominance: st.dominance, bissectrice: st.bissectrice, live, actif: st.active,
        lesions: st.lesions.map(l => ({ seg: +l.seg, couleur: caGradeColor(l.grade) })) });
    },
    click(st, e) {
      const z = e.target.closest('[data-seg]');
      if (!z) return false;
      if (!st.lesions.length) { st.lesions.push(newCoroLesion()); st.active = 0; }
      st.lesions[st.active].seg = z.dataset.seg;
      return true;
    },
    form(st) {
      const r = CA.evaluer(st), ag = CA.agatston(st.cac);
      let h = `<fieldset class="tl-box"><legend>Examen</legend>
        <div class="tf-row">
          ${sel('dominance', 'Dominance', [['droite', 'Droite'], ['gauche', 'Gauche'], ['codominance', 'Codominance']], st.dominance)}
          ${inp('cac', 'Score calcique (Agatston)', st.cac, { small: 1, ph: '0' })}
          ${sel('ischemie', 'Ischémie (FFR-CT / perfusion)', Object.entries(CA.ISCHEMIE).map(([k, v]) => [k, k ? `${k} — ${v}` : 'Non évaluée']), st.ischemie)}
        </div>
        <div class="tf-row">
          ${sel('exception', 'Exception (E)', CA_EXCEPTIONS, st.exception)}
          <span class="tf-checks">${chk('bissectrice', 'Bissectrice', st.bissectrice)}${chk('pontage', 'Pontage(s) (G)', st.pontage)}</span>
        </div>
      </fieldset>`;
      // Tableau du score calcique (ligne correspondante surlignée)
      h += `<table class="tl-ref"><caption>Score calcique d'Agatston</caption>
        <thead><tr><th>Score</th><th>Calcifications</th><th>Risque</th></tr></thead><tbody>${
        CA.AGATSTON.map(a => `<tr${ag && ag.classe === a.classe ? ' class="is-on"' : ''}><td><b>${esc(a.classe)}</b></td><td>${esc(a.label)}</td><td>${esc(a.risque)}</td></tr>`).join('')}</tbody></table>
        <p class="tl-note">Charge en plaque (CAD-RADS 2.0) par le score calcique : <strong>P1</strong> 1-100 · <strong>P2</strong> 101-300 · <strong>P3</strong> 301-999 · <strong>P4</strong> ≥ 1000 ; ou par le nombre de segments atteints : P1 ≤ 2 · P2 3-4 · P3 5-7 · P4 ≥ 8.</p>`;
      h += tabs(st.lesions.map(l => ({ color: caGradeColor(l.grade), badge: l.grade ? CA.STENOSES[l.grade].court : '' })), st.active, 'Lésion', this.max, 'lesions');
      const l = st.lesions[st.active];
      if (!l) h += `<p class="tl-note">Aucune lésion : <strong>CAD-RADS ${r.cat}</strong>${r.cat === '0' ? ' (ni plaque ni sténose)' : ''}. Cliquez sur un segment du schéma ou sur « + Ajouter ».</p>`;
      else {
        const p = `lesions.${st.active}.`;
        const presents = CA.segmentsPresents(st.dominance, st.bissectrice);
        const segs = [...new Set([...presents, ...(l.seg ? [+l.seg] : [])])];
        h += `<div class="tf-row">
            ${sel(p + 'seg', 'Segment', [['', '—'], ...segs.map(n => [String(n), caSegLabel(n)])], l.seg, { wide: 1 })}
            ${sel(p + 'grade', 'Sténose', [['', '—'], ...Object.entries(CA.STENOSES).map(([k, v]) => [k, v.label])], l.grade, { re: 1 })}
          </div>`;
        if (l.grade && l.grade !== 'nd') {
          h += `<div class="tf-row">${sel(p + 'plaque', 'Plaque', [['', '—'], ...Object.entries(CA_PLAQUES).map(([k, v]) => [k, v.replace(/^./, m => m.toUpperCase())])], l.plaque)}${chk(p + 'stent', 'Sur stent (S)', l.stent)}</div>
            <fieldset class="tl-box"><legend>Plaque à haut risque (HRP si au moins 2 critères)</legend><div class="tf-row">${
              Object.entries(CA.HRP).map(([k, v]) => chk(`${p}hrp.${k}`, v.replace(/^./, m => m.toUpperCase()), l.hrp[k])).join('')}</div></fieldset>`;
        }
      }
      // Rappel des catégories CAD-RADS 2.0 (catégorie obtenue surlignée)
      h += `<table class="tl-ref"><caption>CAD-RADS 2.0 — douleur thoracique stable</caption>
        <thead><tr><th>Cat.</th><th>Sténose maximale</th><th>Conduite proposée</th></tr></thead><tbody>${
        Object.entries(CA.CATEGORIES).map(([k, c]) => `<tr${r.cat === k ? ' class="is-on"' : ''}><td><b style="color:${caCatColor(k)}">${k}</b></td><td>${esc(c.stenose)}</td><td>${esc(c.conduite)}</td></tr>`).join('')}</tbody></table>
        <p class="tl-note">Modificateurs, dans l'ordre : <strong>N</strong> non diagnostique · <strong>HRP</strong> plaque à haut risque · <strong>I</strong> ischémie (I+, I−, I±) · <strong>S</strong> stent · <strong>G</strong> pontage · <strong>E</strong> exception (cause non athéromateuse).</p>`;
      return h;
    },
    result(st) {
      const r = CA.evaluer(st);
      return badge(r.code, caCatColor(r.cat)) + badge(r.titre, caCatColor(r.cat)) + (r.P ? badge(`${r.P.code} : charge en plaque ${r.P.label}`, C.slate) : '');
    },
    warn(st) {
      const w = [], presents = CA.segmentsPresents(st.dominance, st.bissectrice);
      st.lesions.forEach((l, i) => {
        if (!l.seg) w.push(`Lésion ${i + 1} : choisir le segment (clic sur le schéma).`);
        else if (!presents.includes(+l.seg)) w.push(`Lésion ${i + 1} : le segment ${l.seg} n'existe pas avec la dominance choisie.`);
        if (!l.grade) w.push(`Lésion ${i + 1} : préciser le degré de sténose.`);
        const n = CA.hrpLesion(l).length;
        if (n === 1) w.push(`Lésion ${i + 1} : un seul critère de plaque à haut risque (HRP à partir de 2).`);
      });
      const c = num(st.cac);
      if (c > 0 && !st.lesions.length) w.push('Score calcique positif : décrire les plaques (au moins CAD-RADS 1).');
      const r = CA.evaluer(st);
      if (r.cat === 'N') w.push('Segment non analysable sans autre sténose ≥ 50 % : CAD-RADS N.');
      if (r.tc) w.push('Tronc commun ≥ 50 % : CAD-RADS 4B.');
      else if (r.tri) w.push('Atteinte sévère des trois territoires : CAD-RADS 4B.');
      return w;
    },
    text(st) {
      const out = [], r = CA.evaluer(st), ag = CA.agatston(st.cac), c = num(st.cac);
      if (c != null) out.push(`Score calcique (Agatston) = ${fr(c, 0)} : ${ag ? ag.label.toLowerCase() : ''}${r.P && r.P.methode === 'score calcique' ? ` ; charge en plaque ${r.P.code} (${r.P.label})` : ''}.`);
      const d = CA.DOMINANCES[st.dominance];
      out.push(`${d.label} : ${d.texte}.`);
      const nd = [];
      st.lesions.forEach((l, i) => {
        if (!l.seg && !l.grade) return;
        const seg = l.seg && CA.SEGMENTS[l.seg] ? `${CA.SEGMENTS[l.seg].nom} (segment ${l.seg})` : '[segment]';
        if (l.grade === 'nd') { nd.push(seg); return; }
        let s = `Lésion n°${i + 1} : ${seg} : plaque${l.plaque ? ' ' + CA_PLAQUES[l.plaque] : ''}`;
        if (!l.grade) s += ' [degré de sténose]';
        else if (l.grade === '0') s += ' sans sténose';
        else if (l.grade === '100') s += ' responsable d\'une occlusion complète';
        else s += ` responsable d'une sténose ${CA.STENOSES[l.grade].label.replace(/^Sténose /, '')}`;
        if (l.stent) s += ', sur stent';
        const hrp = CA.hrpLesion(l).map(k => CA.HRP[k]);
        if (hrp.length >= 2) s += `, avec des critères de plaque à haut risque : ${listFr(hrp)}`;
        else if (hrp.length) s += `, ${hrp[0]}`;
        out.push(s + '.');
      });
      if (nd.length) out.push(`Segment${nd.length > 1 ? 's' : ''} non analysable${nd.length > 1 ? 's' : ''} : ${listFr(nd)}.`);
      if (!st.lesions.some(l => l.grade && l.grade !== 'nd') && r.cat === '0') out.push('Absence de plaque et de sténose coronaire.');
      if (st.ischemie) out.push(`Évaluation fonctionnelle (FFR-CT / perfusion) : ${CA.ISCHEMIE[st.ischemie]}.`);
      if (st.pontage) out.push('Pontage(s) aorto-coronaire(s).');
      if (st.exception) out.push(`Exception : ${st.exception}.`);
      out.push(`Conclusion : ${r.code} — ${r.titre.toLowerCase()} (${r.stenose}). Conduite proposée : ${r.conduite.replace(/^./, m => m.toLowerCase())}`);
      return out.join('\n');
    },
  };

  /* =======================================================
     Fenêtre des outils
     ======================================================= */
  const TOOLS = { ...(PR ? { pirads: PIRADS } : {}), birads: BIRADS, tirads: TIRADS, ...(FL ? { fleischner: FLEISCHNER } : {}), ...(MY && UT ? { figo: MYOMES } : {}), ...(CA && CO ? { cadrads: CADRADS } : {}), recist: RECIST, lugano: LUGANO };
  const states = {};
  let cur = null;
  const titleEl = $('#tool-title', dlg), hintEl = $('#tool-hint', dlg), schemaEl = $('#tool-schema', dlg), formEl = $('#tool-form', dlg);
  const resultEl = $('#tool-result', dlg), previewEl = $('#tool-preview', dlg), msgEl = $('#tool-msg', dlg);

  const setPath = (o, path, v) => {
    const ks = path.split('.'), last = ks.pop();
    const t = ks.reduce((a, k) => a[k], o);
    t[last] = v;
  };
  const say = (m, warn) => { msgEl.textContent = m; msgEl.classList.toggle('is-warn', !!warn); };

  // Le schéma n'est redessiné que s'il change, et jamais pendant un clic dessus
  // (sinon le clic qui suit la saisie d'un champ serait perdu).
  let lastSvg = null, holding = false;
  schemaEl.addEventListener('pointerdown', () => { holding = true; });
  window.addEventListener('pointerup', () => setTimeout(() => { if (holding) { holding = false; if (cur) live(); } }, 0));
  const live = () => {
    const T = TOOLS[cur], st = states[cur];
    const warnEl = formEl.querySelector('.tool-warn');
    if (warnEl) warnEl.innerHTML = T.warn ? T.warn(st).map(w => `<p class="tl-warn">${esc(w)}</p>`).join('') : '';
    const svg = T.svg ? T.svg(st, true) : '';
    if (!holding && svg !== lastSvg) { schemaEl.innerHTML = svg; lastSvg = svg; }
    resultEl.innerHTML = T.result(st);
    previewEl.textContent = T.text(st);
  };
  const render = () => {
    const T = TOOLS[cur];
    // Garder le champ actif (et le curseur) après avoir redessiné le formulaire
    const a = document.activeElement;
    const path = a && formEl.contains(a) && a.dataset.f;
    const caret = path && a.tagName === 'INPUT' && a.type !== 'checkbox' ? a.selectionStart : null;
    lastSvg = null;
    dlg.dataset.tool = cur;
    titleEl.textContent = T.title;
    hintEl.textContent = T.hint;
    dlg.classList.toggle('has-schema', !!T.svg);
    $$('[data-schema]', dlg).forEach(b => { b.hidden = !T.svg; });
    formEl.innerHTML = T.form(states[cur]) + '<div class="tool-warn" aria-live="polite"></div>';
    if (path) {
      const f = formEl.querySelector(`[data-f="${path}"]`);
      if (f) { f.focus(); if (caret != null) f.setSelectionRange(caret, caret); }
    }
    live();
  };
  function $$(s, root = document) { return [...root.querySelectorAll(s)]; }

  const open = name => {
    if (!TOOLS[name]) return;
    cur = name;
    states[name] = states[name] || TOOLS[name].init();
    say('');
    render();
    if (!dlg.open) dlg.showModal();
  };

  formEl.addEventListener('input', e => {
    const f = e.target.closest('[data-f]');
    if (!f || f.tagName === 'SELECT' || f.type === 'checkbox') return;
    setPath(states[cur], f.dataset.f, f.value);
    live();
  });
  formEl.addEventListener('change', e => {
    const f = e.target.closest('[data-f]');
    if (!f) return;
    setPath(states[cur], f.dataset.f, f.type === 'checkbox' ? f.checked : f.value);
    // Listes et cases : on redessine (onglets, champs dépendants). Champs texte : jamais
    // (le « change » arrive quand on clique ailleurs, redessiner ferait perdre ce clic).
    if (f.tagName === 'SELECT' || f.type === 'checkbox') render(); else live();
  });
  formEl.addEventListener('click', e => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const st = states[cur], T = TOOLS[cur], list = b.dataset.list;
    if (b.dataset.act === 'pick') st.active = +b.dataset.i;
    if (b.dataset.act === 'add') { st[list].push(T.newItem()); if ('active' in st) st.active = st[list].length - 1; }
    if (b.dataset.act === 'del') {
      st[list].splice(+b.dataset.i, 1);
      if ('active' in st) st.active = Math.max(0, Math.min(st.active, st[list].length - 1));
    }
    render();
  });
  schemaEl.addEventListener('click', e => {
    const T = TOOLS[cur], svg = schemaEl.querySelector('svg');
    if (!T.click || !svg) return;
    const p = svg.createSVGPoint();
    p.x = e.clientX; p.y = e.clientY;
    const pt = p.matrixTransform(svg.getScreenCTM().inverse());
    if (T.click(states[cur], e, pt)) render();
  });

  /* Image du schéma (PNG) */
  const loadSvg = svg => new Promise((resolve, reject) => {
    const [, w, h] = svg.match(/viewBox="0 0 (\d+) (\d+)"/);
    const img = new Image();
    img.onload = () => resolve({ img, w: +w, h: +h });
    img.onerror = () => reject(new Error('svg'));
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg.replace('<svg ', `<svg width="${w}" height="${h}" `));
  });
  const canvasPng = c => new Promise((resolve, reject) => c.toBlob(b => (b ? resolve(b) : reject(new Error('png'))), 'image/png'));
  const svgToPng = async svg => {
    const { img, w, h } = await loadSvg(svg);
    const c = document.createElement('canvas');
    c.width = w * 2; c.height = h * 2;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(img, 0, 0, c.width, c.height);
    return canvasPng(c);
  };
  // Plusieurs schémas joints → une seule image (titre au-dessus de chaque schéma), à coller dans un e-mail
  const combinePng = async items => {
    const imgs = await Promise.all(items.map(it => loadSvg(it.svg)));
    const W = 900, pad = 20, cap = 30;
    const hs = imgs.map(o => Math.round(o.h * (W - 2 * pad) / o.w));
    const c = document.createElement('canvas');
    c.width = W;
    c.height = pad + hs.reduce((a, h) => a + cap + h + pad, 0);
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, c.width, c.height);
    let y = pad;
    imgs.forEach((o, i) => {
      ctx.fillStyle = INK;
      ctx.font = 'bold 18px Montserrat, Arial, sans-serif';
      ctx.fillText(items[i].title, pad, y + 18);
      y += cap;
      ctx.drawImage(o.img, pad, y, W - 2 * pad, hs[i]);
      y += hs[i] + pad;
    });
    return canvasPng(c);
  };

  dlg.addEventListener('click', async e => {
    if (e.target === dlg) { dlg.close(); return; }
    const b = e.target.closest('.tool-actions [data-act], .tool-head [data-act]');
    if (!b) return;
    const T = TOOLS[cur], st = states[cur], act = b.dataset.act;
    if (act === 'close') dlg.close();
    if (act === 'insert') {
      if (window.RHEditor) window.RHEditor.insert(T.text(st));
      dlg.close();
    }
    if (act === 'attach' && T.svg && window.RHEditor) {
      window.RHEditor.attach({ title: T.title, svg: T.svg(st, false) });
      say('Schéma joint au compte rendu (il sera imprimé avec le texte).');
    }
    if (act === 'copy-img' && T.svg) {
      try {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': svgToPng(T.svg(st, false)) })]);
        say('Image copiée : collez-la dans votre logiciel ou votre e-mail (Ctrl + V).');
      } catch (err) {
        say('Copie d\'image impossible dans ce navigateur : utilisez « Télécharger le schéma ».', true);
      }
    }
    if (act === 'png' && T.svg) {
      try {
        const blob = await svgToPng(T.svg(st, false));
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `schema-${cur}.png`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      } catch (err) {
        say('Export de l\'image impossible dans ce navigateur.', true);
      }
    }
    if (act === 'reset' && confirm('Réinitialiser cet outil ?')) { states[cur] = T.init(); say(''); render(); }
  });

  /* ---------- Raccourcis au-dessus de l'éditeur (outils suggérés selon le texte) ---------- */
  chipsBox.insertAdjacentHTML('beforeend', Object.entries(TOOLS).map(([k, T]) =>
    `<button type="button" class="cr-tool-chip" data-tool="${k}">${esc(T.chip)}<small>${esc(T.sub)}</small></button>`).join(''));
  chipsBox.addEventListener('click', e => { const b = e.target.closest('[data-tool]'); if (b) open(b.dataset.tool); });
  let sugTimer;
  const suggest = () => {
    clearTimeout(sugTimer);
    sugTimer = setTimeout(() => {
      const t = norm(editor.value);
      chipsBox.querySelectorAll('[data-tool]').forEach(b => {
        const on = TOOLS[b.dataset.tool].suggest.test(t);
        b.classList.toggle('is-suggested', on);
        b.title = on ? 'Outil suggéré d\'après le compte rendu' : '';
      });
    }, 250);
  };
  editor.addEventListener('input', suggest);
  editor.addEventListener('cr:change', suggest);
  suggest();

  /* API pour l'éditeur : mots-clés qui ouvrent les outils */
  window.RHTools = {
    open,
    combinePng,
    entries: Object.entries(TOOLS).map(([k, T]) => ({ tool: k, k: T.keys[0], alias: T.keys.slice(1), label: `Ouvrir : ${T.title}` })),
  };
})();
