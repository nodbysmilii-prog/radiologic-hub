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
