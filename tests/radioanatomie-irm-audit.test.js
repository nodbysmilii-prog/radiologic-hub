/* Tests de l'audit de l'IRM cérébrale (scripts/radioanatomie/irm/audit_labels.py) : un fichier « source de vérité »
   par structure publiée, champs obligatoires, latéralité contrôlée en coordonnées MNI, pas de « diencéphale »
   affiché, territoires vasculaires dans leur calque, aucune donnée des atlas sous licence non commerciale.
   Lancer : npm test   (ou : node --test tests/radioanatomie-irm-audit.test.js) */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const IRM = path.join(__dirname, '..', 'scripts', 'radioanatomie', 'irm');
const AUDIT = path.join(IRM, 'audit');
const LABELS = fs.readdirSync(path.join(AUDIT, 'labels')).filter(f => f.endsWith('.json'))
  .map(f => JSON.parse(fs.readFileSync(path.join(AUDIT, 'labels', f), 'utf8')));
const TABLE = fs.readFileSync(path.join(IRM, 'correspondance-etiquettes.csv'), 'utf8').trim().split('\n').slice(1);
const CONFIANCES = ['élevée', 'moyenne', 'faible', 'hors atlas', 'à placer'];

test('un fichier source de vérité par structure publiée de la table des noms', () => {
  const publiees = TABLE.filter(l => !l.includes(';non publié;')).length;
  assert.equal(LABELS.length, publiees);
  assert.equal(new Set(LABELS.map(e => e.cle)).size, LABELS.length, 'clés uniques');
});

test('champs obligatoires : noms français et anglais, côté, plans, coordonnées MNI, atlas, identifiant, confiance', () => {
  for (const e of LABELS) {
    assert.ok(e.nom_fr && e.nom_en, `${e.cle} : noms`);
    assert.ok('cote' in e && e.categorie, `${e.cle} : côté et catégorie`);
    assert.ok(e.source && 'identifiant' in e.source && e.source.origine, `${e.cle} : source`);
    assert.ok(CONFIANCES.includes(e.confiance), `${e.cle} : confiance ${e.confiance}`);
    assert.match(e.convention_affichage, /radiologique/);
    if (e.confiance !== 'à placer') {
      assert.equal(e.coordonnees.mni_icbm2009c_mm.length, 3, `${e.cle} : centre MNI`);
    }
    if (e.coordonnees.sujet_mm && !e.coordonnees.points_auteur) {
      for (const p of ['axial', 'coronal', 'sagittal']) assert.ok(e.plans[p] && e.plans[p].mni_icbm2009c_mm, `${e.cle} : ${p}`);
    }
    if (e.confiance === 'élevée') {
      assert.ok(e.atlas.length && e.atlas.every(a => a.verdict === 'concordant'), `${e.cle} : élevée sans concordance`);
    }
    if (e.confiance === 'hors atlas') assert.ok(e.remarques.some(r => /non confirmée/.test(r)), e.cle);
  }
});

test('latéralité : côté gauche à x MNI < 0, côté droit à x MNI > 0', () => {
  const lateraux = LABELS.filter(e => /^(gauche|droit)/.test(e.cote) && !/ et /.test(e.cote) && e.coordonnees.mni_icbm2009c_mm);
  assert.ok(lateraux.length > 200);
  for (const e of lateraux) {
    const x = e.coordonnees.mni_icbm2009c_mm[0];
    const conforme = e.cote.startsWith('gauche') ? x < 0 : x > 0;
    if (e.coordonnees.points_auteur) {
      // point posé par l'auteur : un écart n'arrête pas le module, mais il doit être signalé
      if (!conforme) assert.ok(e.controle_lateralite.startsWith('ÉCART') && e.confiance === 'faible', e.cle);
      continue;
    }
    assert.ok(conforme, `${e.cle} (${e.cote}) : x = ${x}`);
    assert.equal(e.controle_lateralite, 'conforme', e.cle);
  }
});

test('« diencéphale » jamais affiché comme structure ; territoires dans leur propre calque', () => {
  assert.ok(!LABELS.some(e => /^Dienc[ée]phale/i.test(e.nom_fr)), 'diencéphale affiché');
  for (const e of LABELS) {
    const vasculaire = e.categorie === 'Territoires vasculaires';
    const calque = /^(territoires|jonctions)-/.test(e.cle);
    assert.equal(vasculaire, calque, `${e.cle} : calque des territoires`);
  }
});

test('aucune donnée de CerebrA ni de Harvard-Oxford dans le dépôt (contrôle interne seulement)', () => {
  const fichiers = fs.readdirSync(AUDIT);
  assert.ok(fichiers.every(f => /\.(json|csv|md)$/.test(f) || f === 'labels'), fichiers.join(', '));
});
