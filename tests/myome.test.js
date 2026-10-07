/* Tests des règles des myomes utérins (FIGO, arbre décisionnel) et du schéma de l'utérus — cas fictifs. */
const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../regles/myome.js');
const U = require('../schemas/uterus.js');

test('classification FIGO : catégories et libellés', () => {
  assert.equal(M.categorie('0'), 'sous-muqueux');
  assert.equal(M.categorie('2'), 'sous-muqueux');
  assert.equal(M.categorie('3'), 'interstitiel');
  assert.equal(M.categorie('4'), 'interstitiel');
  assert.equal(M.categorie('6'), 'sous-séreux');
  assert.equal(M.categorie('7'), 'sous-séreux');
  assert.equal(M.categorie('8'), 'autre');
  assert.equal(M.categorie('2-5'), 'transmural');
  assert.equal(M.categorie('9'), null);
  assert.equal(M.libelleType('7'), 'FIGO 7 (sous-séreux, pédiculé)');
  assert.equal(M.TYPES.length, 10);
});

test('localisation en toutes lettres', () => {
  assert.equal(M.localisation({ type: '2', paroi: 'anterieure', niveau: 'corps' }), 'paroi antérieure du corps utérin');
  assert.equal(M.localisation({ type: '7', paroi: 'fundique', niveau: 'corps' }), 'fundique');
  assert.equal(M.localisation({ type: '8', special: 'col' }), 'du col utérin');
  assert.equal(M.localisation({ type: '4', paroi: 'laterale-gauche', niveau: 'isthme' }), 'paroi latérale gauche de l\'isthme');
});

test('volume (ellipsoïde) et taille maximale', () => {
  assert.equal(Math.round(M.volume(80, 50, 40)), 83);
  assert.equal(M.volume(80, '', 40), null);
  assert.equal(M.tailleMax({ d1: '32', d2: '28,5', d3: '' }), 32);
});

test('arbre décisionnel : signal T2, rehaussement, T1, ADC', () => {
  assert.equal(M.caracteriser({ t2: 'hypo', rehaussement: 'homogene' }).diagnostic, 'myome simple');
  assert.equal(M.caracteriser({ t2: 'hypo', rehaussement: 'absent' }).diagnostic, 'dégénérescence hyaline');
  const myx = M.caracteriser({ t2: 'hyper', rehaussement: 'heterogene' });
  assert.equal(myx.diagnostic, 'dégénérescence myxoïde');
  assert.equal(myx.niveau, 'attention');
  assert.equal(M.caracteriser({ t2: 'hyper', rehaussement: 'absent' }).diagnostic, 'dégénérescence kystique');
  assert.equal(M.caracteriser({ t2: 'intermediaire', t1: 'peripherique' }).diagnostic, 'nécrobiose aseptique');
  assert.equal(M.caracteriser({ t2: 'intermediaire', t1: 'diffus', adc: '0,5' }).diagnostic, 'nécrobiose aseptique', 'l\'hypersignal T1 prime');
  assert.equal(M.caracteriser({ t2: 'intermediaire', t1: 'non', adc: '1,5' }).diagnostic, 'myome cellulaire');
  assert.equal(M.caracteriser({ t2: 'intermediaire', t1: 'non', adc: '1,2' }).diagnostic, 'myome indéterminé', '1,2 : borne incluse dans « indéterminé »');
  assert.equal(M.caracteriser({ t2: 'intermediaire', t1: 'non', adc: '0,8' }).diagnostic, 'myome indéterminé');
  const s = M.caracteriser({ t2: 'intermediaire', t1: 'non', adc: '0,7' });
  assert.equal(s.diagnostic, 'suspicion de sarcome utérin');
  assert.equal(s.niveau, 'suspect');
  assert.equal(M.caracteriser({ t2: 'intermediaire', t1: 'non' }).diagnostic, null, 'ADC manquant');
  assert.equal(M.caracteriser({}).diagnostic, null);
});

test('arguments en faveur d\'un léiomyosarcome', () => {
  assert.deepEqual(M.argumentsSarcome({ contours: 'irreguliers', necrose: true, t2: 'intermediaire', t1: 'non', adc: '0,6' }),
    ['contours irréguliers', 'remaniements nécrotico-hémorragiques', 'ADC < 0,8 × 10⁻³ mm²/s']);
  assert.deepEqual(M.argumentsSarcome({ t2: 'hypo', rehaussement: 'homogene' }), []);
});

test('schéma : profondeur croissante de la muqueuse vers la séreuse selon le type FIGO', () => {
  const x = type => U.position({ type, paroi: 'laterale-gauche', niveau: 'corps', d1: 20 }, 'cor').x;
  const ordre = ['0', '1', '2', '3', '4', '5', '6', '7'].map(x);
  ordre.slice(1).forEach((v, i) => assert.ok(v > ordre[i], `type ${i + 1} plus en dehors que le type ${i}`));
  assert.ok(U.position({ type: '0', paroi: 'laterale-gauche', niveau: 'corps' }, 'cor').pedicule, 'type 0 : pédicule');
  assert.ok(U.position({ type: '7', paroi: 'fundique' }, 'cor').pedicule, 'type 7 : pédicule');
  const ant = U.position({ type: '4', paroi: 'anterieure', niveau: 'corps' }, 'sag');
  const post = U.position({ type: '4', paroi: 'posterieure', niveau: 'corps' }, 'sag');
  assert.ok(ant.y > post.y, 'utérus antéversé : paroi antérieure en bas, postérieure en haut');
  const prof = type => U.position({ type, paroi: 'posterieure', niveau: 'corps', d1: 20 }, 'sag').y;
  const enHaut = ['1', '2', '3', '4', '5', '6', '7'].map(prof);
  enHaut.slice(1).forEach((v, i) => assert.ok(v < enHaut[i], `sagittal : type ${i + 2} plus près de la séreuse que le type ${i + 1}`));
  assert.equal(U.position({ type: '4', paroi: 'anterieure', niveau: 'corps' }, 'cor').projete, true, 'paroi antérieure projetée sur la vue coronale');
  assert.equal(U.position({ type: '8', special: 'ligament-droit' }, 'sag'), null, 'ligament large : vue coronale seulement');
  const tr = U.position({ type: '2-5', paroi: 'posterieure', niveau: 'corps', d1: 10 }, 'sag');
  const t4 = U.position({ type: '4', paroi: 'posterieure', niveau: 'corps', d1: 10 }, 'sag');
  assert.ok(tr.r > 25 && tr.r > t4.r * 2, 'transmural : de la muqueuse à la séreuse');
});

test('schéma : clic → paroi et niveau', () => {
  // vue coronale (médaillon) : idem pour les parois latérales
  for (const paroi of ['laterale-droite', 'laterale-gauche']) for (const niveau of ['fundus', 'corps', 'isthme']) {
    const p = U.position({ type: '4', paroi, niveau }, 'cor');
    assert.deepEqual(U.zone(p.x, p.y), { paroi, niveau }, `${paroi} ${niveau}`);
  }
  const fc = U.position({ type: '4', paroi: 'fundique' }, 'cor');
  assert.deepEqual(U.zone(fc.x, fc.y), { paroi: 'fundique', niveau: 'fundus' });
  const cc = U.position({ type: '8', special: 'col' }, 'cor');
  assert.deepEqual(U.zone(cc.x, cc.y), { special: 'col' });
  assert.equal(U.zone(300, 5), null, 'hors du schéma');
  // vue sagittale : un clic à l'emplacement d'un myome redonne sa paroi et son niveau
  for (const paroi of ['anterieure', 'posterieure']) for (const niveau of ['fundus', 'corps', 'isthme']) {
    const p = U.position({ type: '4', paroi, niveau }, 'sag');
    assert.deepEqual(U.zone(p.x, p.y), { paroi, niveau }, `${paroi} ${niveau}`);
  }
  const f = U.position({ type: '4', paroi: 'fundique' }, 'sag');
  assert.deepEqual(U.zone(f.x, f.y), { paroi: 'fundique', niveau: 'fundus' });
  const col = U.position({ type: '8', special: 'col' }, 'sag');
  assert.deepEqual(U.zone(col.x, col.y), { special: 'col' });
  const svg = U.svg({ interactif: true, myomes: [{ n: 1, type: '2', paroi: 'anterieure', niveau: 'corps', color: '#d63f4c' }] });
  assert.match(svg, /data-u="cor"/);
  assert.match(svg, /VUE SAGITTALE/);
  assert.match(svg, /data-u="sag"/);
});

test('planche de la classification FIGO : un myome légendé par type', () => {
  const svg = U.planche({ couleur: M.couleur, categories: { interstitiel: 'Interstitiel', 'sous-muqueux': 'Sous-muqueux', 'sous-séreux': 'Sous-séreux' } });
  for (const t of M.TYPES) assert.match(svg, new RegExp(`>${t}</text>`), `type ${t}`);
  assert.match(svg, /Intracavitaire/);
  assert.match(svg, /Sous-séreux pédiculé/);
  assert.match(svg, />Sous-muqueux</);
});
