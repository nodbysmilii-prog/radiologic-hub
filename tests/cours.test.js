/* Tests du module de cours d'échoanatomie : validation par l'auteur (versions, visibilité),
   plan de coupe, étiquettes des images, mode démonstration, fichiers de la page.
   Lancer : npm test   (ou : node --test tests/*.test.js) */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const N = require('../cours/noyau.js');
const S = require('../schemas/ischio-jambiers.js');

const RACINE = path.join(__dirname, '..');
const manifeste = JSON.parse(fs.readFileSync(path.join(RACINE, 'public/models/ischio-jambiers/manifest.json'), 'utf8'));
const elements = () => N.catalogue({
  texte: 'abcd1234',
  schemas: S.SCHEMAS.map(s => ({ ...s, version: S.version(s.id) })),
  modeles: manifeste.modeles,
  images: [{ schema: 's4', revision: 3 }],
});

test('catalogue : texte, 6 schémas, 18 modèles et les images, avec leur version', () => {
  const els = elements();
  assert.equal(els.length, 1 + 6 + 18 + 1);
  assert.deepEqual(els.filter(e => e.type === 'schema').map(e => e.element), ['schema-s1', 'schema-s2', 'schema-s3', 'schema-s4', 'schema-s5', 'schema-s6']);
  assert.equal(els.find(e => e.element === 'image-s4').version, 'r3');
  assert.equal(els.find(e => e.element === 'modele-femur').version, manifeste.modeles.find(m => m.id === 'femur').version);
  assert.equal(els.find(e => e.element === 'schema-s1').version, S.version('s1'));
  assert.equal(new Set(els.map(e => e.element)).size, els.length);
});

test('visibilité : seulement approuvé dans la version actuelle ; toute modification remet « à valider »', () => {
  const els = elements();
  const s1 = S.version('s1');
  const e = N.etats(els, [
    { element: 'texte', version: 'abcd1234', statut: 'approuve' },
    { element: 'schema-s1', version: s1, statut: 'approuve' },
    { element: 'schema-s2', version: 'ancienne', statut: 'approuve', maj_le: '2026-10-12T10:00:00Z' },
    { element: 'schema-s3', version: S.version('s3'), statut: 'a_corriger', commentaire: 'Membrane trop fine' },
    { element: 'image-s4', version: 'r2', statut: 'approuve' },
  ]);
  assert.equal(e.texte.visible, true);
  assert.equal(e['schema-s1'].statut, 'approuve');
  assert.deepEqual([e['schema-s2'].statut, e['schema-s2'].visible, e['schema-s2'].versionValidee], ['modifie', false, 'ancienne']);
  assert.deepEqual([e['schema-s3'].statut, e['schema-s3'].visible, e['schema-s3'].commentaire], ['a_corriger', false, 'Membrane trop fine']);
  assert.equal(e['schema-s4'].statut, 'a_valider', 'sans ligne : à valider');
  assert.equal(e['image-s4'].visible, false, 'image approuvée en révision 2, actuelle 3');
  assert.equal(e['modele-femur'].visible, false);
  assert.deepEqual(N.resume(els, e), { a_valider: 21, approuve: 2, a_corriger: 1, modifie: 2 });
  const visibles = els.filter(x => e[x.element].visible).map(x => x.element);
  assert.deepEqual(visibles, ['texte', 'schema-s1']);
});

test('version du texte : empreinte du contenu des blocs [data-texte], insensible aux espaces', () => {
  const doc = textes => ({ querySelectorAll: () => textes.map(t => ({ textContent: t })) });
  const v = N.versionTexte(doc(['Installer  le patient\n à plat ventre', 'Messages clés']));
  assert.equal(v, N.versionTexte(doc(['Installer le patient à plat ventre', '  Messages clés '])));
  assert.notEqual(v, N.versionTexte(doc(['Installer le patient à plat ventre.', 'Messages clés'])));
  assert.match(v, /^[0-9a-f]{8}$/);
  assert.equal(N.empreinte('abc'), N.empreinte('abc'));
});

test('plan de coupe : hauteur ↔ altitude, schéma le plus proche, tiers', () => {
  const r = manifeste.reperes;
  assert.ok(r.ischion_y > r.plateau_tibial_y, 'ischion au-dessus du plateau tibial');
  assert.equal(N.hauteurVersY(0, r), r.ischion_y);
  assert.ok(Math.abs(N.hauteurVersY(1, r) - r.plateau_tibial_y) < 1e-9);
  assert.ok(Math.abs(N.yVersHauteur(N.hauteurVersY(0.37, r), r) - 0.37) < 1e-9);
  const tous = S.SCHEMAS;
  assert.equal(N.schemaLePlusProche(0.02, tous), 's1');
  assert.equal(N.schemaLePlusProche(0.5, tous), 's4');
  assert.equal(N.schemaLePlusProche(0.95, tous), 's6');
  assert.equal(N.schemaLePlusProche(0.95, tous.filter(s => ['s1', 's4'].includes(s.id))), 's4', 'parmi les schémas approuvés seulement');
  assert.equal(N.schemaLePlusProche(0.5, []), null);
  assert.deepEqual(['s1', 's3', 's4', 's6'].map(N.tiersDe), ['proximal', 'proximal', 'moyen', 'distal']);
  for (const s of tous) assert.equal(N.tiersDe(s.id), s.tiers, `${s.id} : tiers cohérent avec le schéma`);
});

test('étiquettes des images : texte nettoyé, positions bornées à l\'image, 30 au plus', () => {
  const e = N.normaliserEtiquettes([
    { texte: '  Nerf   sciatique ', x: 61.234, y: 42.06 },
    { texte: '', x: 10, y: 10 },
    { texte: 'Hors cadre', x: 140, y: -5 },
    { texte: 'x'.repeat(120), x: 'a', y: null },
    null,
  ]);
  assert.deepEqual(e.slice(0, 3), [{ texte: 'Nerf sciatique', x: 61.2, y: 42.1 }, { texte: 'Hors cadre', x: 100, y: 0 }, { texte: 'x'.repeat(80), x: 0, y: 0 }]);
  assert.equal(e.length, 3);
  assert.equal(N.normaliserEtiquettes(Array.from({ length: 40 }, (_, i) => ({ texte: `E${i}`, x: 1, y: 1 }))).length, N.MAX_ETIQUETTES);
  assert.deepEqual(N.normaliserEtiquettes('pas une liste'), []);
});

test('mode démonstration : les élèves ne lisent que l\'approuvé, sans commentaire ; image et révisions', async () => {
  const stock = {};
  const fenetre = { RHCoursNoyau: N, localStorage: { getItem: k => stock[k] ?? null, setItem: (k, v) => { stock[k] = String(v); } } };
  fenetre.window = fenetre;
  vm.runInNewContext(fs.readFileSync(path.join(RACINE, 'cours/api-demo.js'), 'utf8'), fenetre);
  const brut = fenetre.RHCours.apiDemo;
  const j = x => JSON.parse(JSON.stringify(x === undefined ? null : x));   // objets du bac à sable vm → objets ordinaires
  const api = new Proxy(brut, { get: (o, k) => (typeof o[k] === 'function' ? async (...a) => j(await o[k](...a)) : o[k]) });
  fenetre.RHCours.preparerImage = async () => ({ dataUrl: 'data:image/jpeg;base64,AAAA', largeur: 800, hauteur: 600 });
  const C = 'echo-mi-ischio-jambiers';
  assert.equal(await api.estAdmin(), true, 'administration ouverte en démonstration');
  await api.definirStatut(C, { element: 'texte', type: 'texte', version: 'v1', statut: 'approuve', commentaire: 'ignoré' });
  await api.definirStatut(C, { element: 'schema-s1', type: 'schema', version: 'v2', statut: 'a_corriger', commentaire: 'Nerf plus latéral' });
  assert.deepEqual((await api.validations(C)).map(v => [v.element, 'commentaire' in v]), [['texte', false]]);
  assert.equal((await api.validations(C, { admin: true })).find(v => v.element === 'schema-s1').commentaire, 'Nerf plus latéral');
  assert.equal((await api.validations(C, { admin: true })).find(v => v.element === 'texte').commentaire, null, 'commentaire effacé à l\'approbation');
  await assert.rejects(brut.enregistrerImage(C, 's4', { etiquettes: [] }), /Choisissez/);
  const img = await api.enregistrerImage(C, 's4', { fichier: {}, orientation: 'medial_droite', etiquettes: [{ texte: 'Nerf', x: 120, y: 40 }] });
  assert.deepEqual([img.revision, img.orientation, img.etiquettes[0].x], [1, 'medial_droite', 100]);
  assert.equal((await api.images(C)).length, 0, 'image non approuvée : invisible des élèves');
  await api.definirStatut(C, { element: 'image-s4', type: 'image', version: 'r1', statut: 'approuve' });
  assert.equal((await api.images(C)).length, 1);
  const r2 = await api.enregistrerImage(C, 's4', { etiquettes: [{ texte: 'Nerf sciatique', x: 50, y: 50 }] });
  assert.deepEqual([r2.revision, r2.url, r2.orientation], [2, 'data:image/jpeg;base64,AAAA', 'medial_droite'], 'révision 2, image et orientation gardées');
  assert.equal((await api.images(C)).length, 0, 'modifiée : de nouveau invisible');
  await api.enregistrerReglages(C, { credits: 'Dr Brasseur' });
  assert.equal((await api.reglages(C)).credits, 'Dr Brasseur');
  await api.supprimerImage(C, 's4');
  assert.equal((await api.images(C, { admin: true })).length, 0);
  assert.ok(!(await api.validations(C, { admin: true })).some(v => v.element === 'image-s4'), 'validation de l\'image supprimée avec elle');
});

test('pages du cours : fichiers référencés présents, moteur 3D et licences', () => {
  for (const page of ['cours/ischio-jambiers.html', 'cours-admin.html']) {
    const html = fs.readFileSync(path.join(RACINE, page), 'utf8');
    const dossier = path.dirname(path.join(RACINE, page));
    for (const [, lien] of html.matchAll(/(?:src|href)="([^"#?:]+\.(?:js|css|svg))(?:\?v=\d+)?"/g)) {
      assert.ok(fs.existsSync(path.join(dossier, lien)), `${page} : ${lien} introuvable`);
    }
    assert.match(html, /name="robots" content="noindex"/, `${page} : pas d'indexation pendant la préparation`);
  }
  const html = fs.readFileSync(path.join(RACINE, 'cours/ischio-jambiers.html'), 'utf8');
  const carte = JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports;
  assert.ok(fs.existsSync(path.join(RACINE, 'cours', carte.three)));
  for (const f of ['controls/OrbitControls.js', 'loaders/GLTFLoader.js', 'libs/meshopt_decoder.module.js', 'utils/BufferGeometryUtils.js']) {
    assert.ok(fs.existsSync(path.join(RACINE, 'cours', carte['three/addons/'], f)), f);
  }
  assert.match(fs.readFileSync(path.join(RACINE, 'vendor/three-0.170.0/LICENSE'), 'utf8'), /MIT License/);
  assert.match(html, /Z-Anatomy[\s\S]*CC BY-SA 4\.0[\s\S]*BodyParts3D/, 'attribution visible des modèles 3D');
  assert.match(html, /id="cours-credits"/, 'emplacement « Source / crédits »');
  assert.equal((html.match(/data-texte/g) || []).length, 6, 'blocs de texte soumis à validation');
  assert.match(fs.readFileSync(path.join(RACINE, 'public/models/ischio-jambiers/LICENSE'), 'utf8'), /CC BY-SA 4\.0/);
});
