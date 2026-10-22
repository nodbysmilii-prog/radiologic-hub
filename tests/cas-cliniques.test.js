/* Tests des cas cliniques bilingues : cas/donnees/*.json, cas/<id>.html, cas/index.html,
   scripts/cas/construire_cas.py, modèle 3D de la patte d'oie (public/models/patte-oie/).
   Lancer : npm test   (ou : node --test tests/cas-cliniques.test.js) */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const R = path.join(__dirname, '..');
const lire = f => fs.readFileSync(path.join(R, f), 'utf8');
const LISTE = JSON.parse(lire('cas/donnees/index.json')).cas;
const IDS = LISTE.filter(e => e.id).map(e => e.id);
const CAS = Object.fromEntries(IDS.map(id => [id, JSON.parse(lire(`cas/donnees/${id}.json`))]));

// Tous les objets { fr, en } d'un cas (textes bilingues)
function textes(o, out = []) {
  if (Array.isArray(o)) o.forEach(x => textes(x, out));
  else if (o && typeof o === 'object') {
    if (typeof o.fr === 'string' && typeof o.en === 'string') out.push(o);
    Object.values(o).forEach(x => textes(x, out));
  }
  return out;
}

test('pages générées à jour (scripts/cas/construire_cas.py --verifier)', () => {
  execFileSync('python3', ['-I', 'scripts/cas/construire_cas.py', '--verifier'], { cwd: R, stdio: 'pipe' });
});

test('six cas bilingues : chaque texte existe en français et en anglais', () => {
  assert.deepEqual(IDS.sort(), ['hernie-amyand', 'maladie-rendu-osler', 'sarcome-artere-pulmonaire', 'striatopathie-diabetique', 'syndrome-kartagener', 'tendino-bursite-patte-oie']);
  for (const [id, d] of Object.entries(CAS)) {
    const t = textes(d);
    assert.ok(t.length > 20, id);
    for (const x of t) {
      assert.ok(x.fr.trim() && x.en.trim(), `${id} : texte vide ${JSON.stringify(x).slice(0, 80)}`);
      // les balises du français et de l'anglais se correspondent (mêmes surlignages k-*)
      const k = s => (s.match(/k-[a-z]+/g) || []).sort().join();
      assert.equal(k(x.fr), k(x.en), `${id} : code couleur différent entre FR et EN dans ${x.fr.slice(0, 60)}`);
    }
  }
});

test('pages : autant de textes français qu\'anglais, réponse cachée, bascule FR / EN', () => {
  for (const id of IDS) {
    const html = lire(`cas/${id}.html`);
    const fr = (html.match(/class="[^"]*\bt-fr\b/g) || []).length, en = (html.match(/class="[^"]*\bt-en\b/g) || []).length;
    assert.equal(fr, en, id);
    assert.match(html, /<html lang="fr" data-langue="fr" data-titre-en="/, id);
    assert.match(html, /<div class="annex-body" id="reponse-[a-z-]+" hidden>/, `${id} : réponse cachée`);
    assert.equal((html.match(/data-langue="en"/g) || []).length, 2, `${id} : bascule de l'en-tête + bascule flottante`);
    assert.match(html, /<script src="cas\.js\?v=[0-9a-f]{10}"><\/script>/, id);
    assert.doesNotMatch(html, /\b(undefined|None)\b/, id);
  }
});

test('images : fichiers présents, annotations à l\'intérieur des images', () => {
  for (const [id, d] of Object.entries(CAS)) {
    const s = JSON.stringify(d);
    for (const [, src] of s.matchAll(/"src": ?"([^"]+)"/g)) assert.ok(fs.existsSync(path.join(R, 'assets/cas', id, src)), `${id}/${src}`);
    for (const b of JSON.parse(s, (k, v) => v).sections.flatMap(x => x.blocs)) {
      const blocs = b.blocs || [b];
      for (const bb of blocs) {
        for (const im of bb.images || []) {
          if (!im.annot) continue;
          const [w, h] = im.annot.taille;
          for (const m of im.annot.marques) for (const l of m.lignes) for (const [x, y] of l) assert.ok(x >= 0 && x <= w && y >= 0 && y <= h, `${id} : ${x},${y}`);
        }
        if (bb.type === 'planche') {
          const [w, h] = bb.taille;
          for (const r of bb.reperes) assert.ok(r.de[0] < w && r.de[1] < h && r.a > r.de[0], `${id} : repère ${r.mk}`);
          for (const [x, y] of bb.chevron.points) assert.ok(x < w && y < h, `${id} : chevron`);
        }
      }
    }
  }
});

test('liste des cas : un lien par cas, liens de l\'accueil et du cas existant', () => {
  const idx = lire('cas/index.html');
  for (const id of IDS) assert.match(idx, new RegExp(`href="${id}\\.html"`), id);
  assert.match(idx, /href="schwannome-v3\.html"/);
  assert.match(lire('index.html'), /href="cas\/index\.html"/);
  assert.match(lire('cas/schwannome-v3.html'), /<a href="index\.html">Cas cliniques<\/a>/);
});

test('patte d\'oie en 3D : modèles, licence, couleurs et noms de la visionneuse', () => {
  const m = JSON.parse(lire('public/models/patte-oie/manifest.json'));
  const ids = m.modeles.map(x => x.id);
  assert.deepEqual(ids.slice(0, 5), ['sartorius', 'gracile', 'semi-tendineux', 'bourse-anserine', 'ligament-collateral-tibial']);
  for (const x of m.modeles) assert.ok(fs.existsSync(path.join(R, 'public/models/patte-oie', x.fichier)), x.fichier);
  assert.ok(m.total_octets < 1024 * 1024);
  assert.match(lire('public/models/patte-oie/LICENSE'), /CC BY-SA 4\.0/);
  const js = lire('cas/patte-oie-3d.js');
  for (const id of ids) assert.ok(js.includes(`'${id}'`) || js.includes(` ${id}:`), `nom de ${id} dans patte-oie-3d.js`);
  assert.match(lire('cas/tendino-bursite-patte-oie.html'), /data-modeles="\.\.\/public\/models\/patte-oie\/"/);
  // mêmes couleurs que l'IRM annotée : tokens --teal, --green, --blue, --amber
  const css = lire('styles.css');
  for (const [tok, hex] of [['teal', '2a9d8f'], ['green', '548c6c'], ['blue', '3c67b8'], ['amber', 'f2ab2f']]) {
    assert.match(css, new RegExp(`--${tok}: #${hex}`));
    assert.ok(js.includes(`0x${hex}`), tok);
  }
});
