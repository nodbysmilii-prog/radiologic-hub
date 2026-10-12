/* Tests des schémas de coupe des ischio-jambiers (cours d'échoanatomie) et du fichier A-VERIFIER.
   Lancer : npm test   (ou : node --test tests/*.test.js) */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const S = require('../schemas/ischio-jambiers.js');
const { generer, SORTIE } = require('../scripts/a_verifier.js');

const IDS = ['s1', 's2', 's3', 's4', 's5', 's6'];
const points = s => (s.pts || (s.pointes ? s.pointes.concat([s.c]) : [])).concat(s.e ? [[s.e[0], s.e[1]]] : []);

test('6 coupes, identifiants uniques, réparties par tiers', () => {
  assert.deepEqual(S.SCHEMAS.map(s => s.id), IDS);
  const tiers = Object.fromEntries(S.SCHEMAS.map(s => [s.id, s.tiers]));
  assert.deepEqual(tiers, { s1: 'proximal', s2: 'proximal', s3: 'proximal', s4: 'moyen', s5: 'distal', s6: 'distal' });
  for (const s of S.SCHEMAS) {
    assert.ok(s.titre && s.niveau && s.represente.length && s.incertitudes.length, `${s.id} : textes manquants`);
    assert.ok(s.hauteur > 0 && s.hauteur < 1);
  }
});

test('repères demandés présents dans chaque coupe', () => {
  const ids = id => S.PAR_ID[id].formes.map(f => f.id).filter(Boolean);
  assert.ok(['tendon-conjoint', 'tendon-semi-membraneux', 'nerf-sciatique', 'triangle-cohen'].every(x => ids('s1').includes(x)));
  assert.ok(S.PAR_ID.s2.formes.some(f => f.t === 'fleche') && S.PAR_ID.s2.formes.some(f => f.t === 'fantome'), 'croisement : position d\'origine et trajet');
  assert.ok(ids('s3').includes('membrane-semi-membraneux'));
  assert.ok(['cloison-sigmoide-semi-tendineux', 'cloison-frontale-semi-membraneux', 'cloison-frontale-biceps-long', 'aponevrose-t', 'biceps-court', 'nerf-sciatique'].every(x => ids('s4').includes(x)));
  assert.ok(['tendon-semi-tendineux', 'semi-membraneux'].every(x => ids('s5').includes(x)));
  assert.ok(['tendon-biceps-femoral', 'nerf-fibulaire-commun'].every(x => ids('s6').includes(x)));
});

// Outils géométriques des tests anatomiques (coordonnées de l'image : x médial → latéral, y superficiel → profond).
const forme = (sid, id) => S.PAR_ID[sid].formes.find(f => f.id === id);
const centre = pts => [pts.reduce((a, p) => a + p[0], 0) / pts.length, pts.reduce((a, p) => a + p[1], 0) / pts.length];
const contourEllipse = ([cx, cy, rx, ry, rot = 0]) => Array.from({ length: 360 }, (_, i) => {
  const t = i * Math.PI / 180, a = rot * Math.PI / 180, x = rx * Math.cos(t), y = ry * Math.sin(t);
  return [cx + x * Math.cos(a) - y * Math.sin(a), cy + x * Math.sin(a) + y * Math.cos(a)];
});
const distSegment = (p, a, b) => {
  const dx = b[0] - a[0], dy = b[1] - a[1], l = dx * dx + dy * dy;
  const t = l ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l)) : 0;
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
};
const distLigne = (p, ligne) => Math.min(...ligne.slice(1).map((b, i) => distSegment(p, ligne[i], b)));
const distContour = (p, contour) => Math.min(...contour.map(q => Math.hypot(p[0] - q[0], p[1] - q[1])));
const dedans = (p, pts) => {
  let c = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if ((yi > p[1]) !== (yj > p[1]) && p[0] < (xj - xi) * (p[1] - yi) / (yj - yi) + xi) c = !c;
  }
  return c;
};

test('S1 (Balius 2019) : semi-membraneux latéral et profond au contact du nerf, fibres du semi-tendineux sur la tubérosité', () => {
  const tub = forme('s1', 'tuberosite').pts, st = forme('s1', 'semi-tendineux').pts;
  const ct = centre(forme('s1', 'tendon-conjoint').pts), smPts = forme('s1', 'tendon-semi-membraneux').pts, sm = centre(smPts);
  assert.ok(st.filter(p => distLigne(p, tub) <= 3).length >= 3, 'fibres charnues du semi-tendineux posées sur la corticale');
  const sommet = tub.reduce((a, p) => (p[1] < a[1] ? p : a));
  assert.ok(ct[0] > sommet[0], 'tendon conjoint en dehors du sommet de la tubérosité');
  assert.ok(sm[0] > ct[0] && sm[1] > ct[1], 'tendon du semi-membraneux plus latéral et plus profond que le tendon conjoint');
  const nerf = forme('s1', 'nerf-sciatique').e;
  assert.ok(nerf[0] > sm[0], 'nerf en dehors du tendon du semi-membraneux');
  const ecart = Math.min(...smPts.map(p => distContour(p, contourEllipse(nerf))));
  assert.ok(ecart <= 3, `tendon du semi-membraneux au contact du nerf (écart ${ecart.toFixed(1)} px)`);
});

test('S3 (Balius 2019) : étoile « Mercedes » autour du nerf, membrane du nerf au tendon du semi-membraneux', () => {
  const nerf = forme('s3', 'nerf-sciatique').e, bord = contourEllipse(nerf);
  const branche = id => forme('s3', id).pts;
  for (const id of ['mercedes-tendon-conjoint', 'mercedes-branche-mediale', 'mercedes-branche-laterale']) {
    assert.ok(distContour(branche(id)[0], bord) <= 6, `${id} : part du nerf`);
  }
  const fin = id => branche(id)[branche(id).length - 1];
  assert.ok(fin('mercedes-tendon-conjoint')[1] < nerf[1] - 80, 'branche superficielle (tendon conjoint)');
  assert.ok(fin('mercedes-branche-mediale')[0] < nerf[0] - 100, 'branche médiale (semi-tendineux)');
  assert.ok(fin('mercedes-branche-laterale')[0] > nerf[0] + 100, 'branche latérale (biceps)');
  const tendon = forme('s3', 'tendon-semi-membraneux').e, membrane = branche('membrane-semi-membraneux');
  assert.ok(membrane[0][0] < nerf[0] && distContour(membrane[0], bord) <= 6, 'membrane : part du bord médial du nerf');
  assert.ok(distContour(membrane[membrane.length - 1], contourEllipse(tendon)) <= 3, 'membrane : se termine sur le tendon');
  assert.ok(tendon[2] !== tendon[3] && tendon[2] * tendon[3] < nerf[2] * nerf[3], 'tendon ovale, plus petit que le nerf');
});

test('S4 : cloison du semi-tendineux à concavité médiale, semi-membraneux en demi-cercle à concavité latérale, note « piège »', () => {
  const st = forme('s4', 'semi-tendineux').pts, cl = forme('s4', 'cloison-sigmoide-semi-tendineux').pts;
  const surBord = p => st.some(q => q[0] === p[0] && q[1] === p[1]);
  assert.ok(surBord(cl[0]) && surBord(cl[cl.length - 1]), 'extrémités sur le contour du muscle');
  assert.equal(cl[0][1], Math.min(...st.map(p => p[1])), 'part du bord superficiel');
  assert.equal(cl[cl.length - 1][1], Math.max(...st.map(p => p[1])), 'aboutit au bord profond');
  assert.ok(Math.max(...cl.map(p => p[0])) > Math.max(cl[0][0], cl[cl.length - 1][0]) + 30, 'bombe en dehors : concavité médiale');
  const sm = forme('s4', 'semi-membraneux').pts, [tx, ty, , ry] = forme('s4', 'tendon-semi-membraneux').e;
  assert.ok(!dedans([tx, ty], sm), 'tendon hors du muscle, dans sa concavité');
  assert.ok(Math.min(...sm.map(p => p[1])) < ty - ry - 30 && Math.max(...sm.map(p => p[1])) > ty + ry + 30, 'le croissant entoure le tendon en haut et en bas');
  assert.ok(Math.min(...sm.map(p => p[0])) < tx - 100, 'muscle en dedans du tendon : concavité latérale');
  assert.ok(sm.some(p => p[1] < ty && p[0] > tx - 15) && sm.some(p => p[1] > ty && p[0] > tx - 15), 'cornes du croissant de part et d\'autre du tendon');
  assert.match(S.PAR_ID.s4.piege, /concavité médiale[\s\S]*concavité latérale/);
  assert.match(S.svg('s4'), /data-role="piege"/);
  assert.doesNotMatch(S.svg('s1'), /data-role="piege"/);
});

test('S5 (Balius 2019) : la « cerise » posée SUR le gâteau, dans une gouttière ; gracile et sartorius en dedans', () => {
  const sm = forme('s5', 'semi-membraneux').pts, [tx, ty] = forme('s5', 'tendon-semi-tendineux').e;
  const st = forme('s5', 'semi-tendineux').pts;
  assert.ok(!dedans([tx, ty], sm), 'tendon hors du semi-membraneux (pas au centre)');
  assert.ok(ty < centre(sm)[1] - 40, 'sur la face superficielle');
  const i = sm.findIndex(p => Math.abs(p[0] - tx) <= 2 && p[1] > ty);
  assert.ok(i >= 0, 'fond de la gouttière à l\'aplomb du tendon');
  const [avant, fond, apres] = [sm[i - 1], sm[i], sm[i + 1]];
  assert.ok(fond[1] > avant[1] && fond[1] > apres[1], 'gouttière : creux de la face superficielle');
  assert.ok(st.some(p => p[0] === fond[0] && p[1] === fond[1]), 'semi-tendineux posé au fond de la gouttière');
  const xMinSm = Math.min(...sm.map(p => p[0]));
  for (const id of ['gracile', 'sartorius']) {
    assert.ok(Math.max(...forme('s5', id).pts.map(p => p[0])) < xMinSm, `${id} en dedans du semi-membraneux`);
  }
});

test('même légende partout : chaque forme correspond à une entrée de légende', () => {
  const cles = S.LEGENDE.map(l => l.cle);
  assert.equal(cles.length, 8);
  for (const s of S.SCHEMAS) {
    for (const f of s.formes) assert.ok(cles.includes(S.LEGENDE_DE[f.t]), `${s.id} : type ${f.t} hors légende`);
    const svg = S.svg(s.id);
    for (const c of cles) assert.match(svg, new RegExp(`data-legende="${c}"`), `${s.id} : légende ${c}`);
  }
});

test('orientation : M / L / S / P sur chaque schéma, médial à gauche par défaut, inversion', () => {
  const xDe = (svg, l) => +svg.match(new RegExp(`data-orientation="${l}"><title>[^<]*</title><circle cx="([\\d.]+)"`))[1];
  for (const id of IDS) {
    const svg = S.svg(id), inv = S.svg(id, { inverse: true });
    for (const l of ['M', 'L', 'S', 'P']) assert.match(svg, new RegExp(`data-orientation="${l}"`));
    assert.ok(xDe(svg, 'M') < xDe(svg, 'L'), `${id} : médial à gauche`);
    assert.ok(xDe(inv, 'M') > xDe(inv, 'L'), `${id} : inversé, médial à droite`);
    assert.match(svg, /data-role="sonde"/);
    assert.match(svg, /data-role="situation"/);
  }
});

test('inversion : formes en miroir, texte jamais retourné', () => {
  const svg = S.svg('s1'), inv = S.svg('s1', { inverse: true });
  const nerf = S.PAR_ID.s1.formes.find(f => f.id === 'nerf-sciatique').e;
  assert.match(svg, new RegExp(`data-id="nerf-sciatique"[^>]*>\\s*<ellipse cx="${nerf[0]}"`));
  assert.match(inv, new RegExp(`data-id="nerf-sciatique"[^>]*>\\s*<ellipse cx="${S.IW - nerf[0]}"`));
  assert.ok(!/scale\(-1/.test(inv), 'aucun retournement global (le texte resterait en miroir)');
});

test('étiquettes : texte réel, points visés dans l\'image, pas de chevauchement', () => {
  for (const s of S.SCHEMAS) {
    const svg = S.svg(s.id);
    for (const e of s.etiquettes) {
      assert.ok(e.a[0] >= 0 && e.a[0] <= S.IW && e.a[1] >= 0 && e.a[1] <= S.IH, `${s.id} : « ${e.texte} » hors image`);
      for (const mot of e.texte.split(/\s+/).filter(m => m.length > 3 && !/[«»&<>'"]/.test(m))) assert.ok(svg.includes(mot), `${s.id} : « ${mot} » absent`);
    }
    for (const inverse of [false, true]) {
      const d = S.disposition(s.id, { inverse });
      for (const cote of ['g', 'd']) {
        const l = d[cote];
        l.forEach((e, i) => {
          assert.ok(e.y >= 0 && e.y + e.lignes.length * d.hauteurLigne <= S.IH, `${s.id} : étiquette hors cadre`);
          if (i) assert.ok(e.y >= l[i - 1].y + l[i - 1].lignes.length * d.hauteurLigne, `${s.id} : chevauchement « ${e.texte} »`);
        });
      }
    }
    for (const f of s.formes) {
      const horsChamp = points(f).filter(([x, y]) => x < -40 || x > S.IW + 40 || y < -40 || y > S.IH + 40);
      assert.equal(horsChamp.length, 0, `${s.id} : forme ${f.id || f.t} hors champ`);
    }
  }
});

test('version téléphone : pastilles numérotées = étiquettes, liste fournie à part', () => {
  for (const s of S.SCHEMAS) {
    const svg = S.svg(s.id, { etiquettes: 'numeros' });
    const n = (svg.match(/data-n="/g) || []).length;
    assert.equal(n, s.etiquettes.length);
    const liste = S.etiquettesNumerotees(s.id);
    assert.deepEqual(liste.map(e => e.n), liste.map((_, i) => i + 1));
    assert.ok(!svg.includes('data-role="legende"'), 'légende en HTML sur téléphone');
  }
});

test('version : stable, et change si le schéma change', () => {
  const v = S.version('s4');
  assert.match(v, /^[0-9a-f]{8}$/);
  assert.equal(S.version('s4'), v);
  const e = S.PAR_ID.s4.etiquettes[0], avant = e.texte;
  e.texte = avant + ' (modifié)';
  try { assert.notEqual(S.version('s4'), v); } finally { e.texte = avant; }
  assert.equal(S.version('s4'), v);
  assert.equal(new Set(IDS.map(S.version)).size, 6);
});

test('A-VERIFIER.md à jour (régénérer : node scripts/a_verifier.js)', () => {
  const md = generer();
  assert.equal(fs.readFileSync(SORTIE, 'utf8'), md);
  for (const s of S.SCHEMAS) assert.ok(md.includes(`version \`${S.version(s.id)}\``), `${s.id} : version absente`);
  assert.match(md, /Diamètres d'affichage des nerfs/);
});
