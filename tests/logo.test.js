/* Tests du logo (en-tête et pied de page) : deux calques, les traits fixes (assets/emblem[-light]-traits.svg) et le
   symbole (assets/emblem[-light]-symbole.svg) qui fait un tiers de tour au survol ; réunis = assets/emblem[-light].svg.
   Lancer : npm test   (ou : node --test tests/logo.test.js) */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const R = path.join(__dirname, '..');
const lire = f => fs.readFileSync(path.join(R, f), 'utf8');
const formes = s => (s.match(/<(?:path|circle|rect|use|stop)\b[^>]*>/g) || []).map(x => x.replace(/\s+/g, ' '));
const PAGES = execFileSync('git', ['ls-files', '*.html'], { cwd: R, encoding: 'utf8' }).split('\n').filter(f => f && lire(f).includes('class="brand"'));

test('les deux calques réunis redonnent exactement les formes du logo d\'origine (foncé et clair)', () => {
  for (const nom of ['emblem', 'emblem-light']) {
    const origine = formes(lire(`assets/${nom}.svg`)).sort();
    const calques = [...formes(lire(`assets/${nom}-symbole.svg`)), ...formes(lire(`assets/${nom}-traits.svg`))].sort();
    assert.deepEqual(calques, origine, nom);
    for (const c of ['symbole', 'traits'])
      assert.match(lire(`assets/${nom}-${c}.svg`), /viewBox="88 52 292 260"/, `${nom}-${c} : même cadre que ${nom}.svg`);
  }
});

test('le symbole tourne autour de son centre (274, 215), les traits restent fixes', () => {
  const css = lire('styles.css');
  const [, ox, oy] = css.match(/\.brand-symbole \{[^}]*transform-origin: ([\d.]+)% ([\d.]+)%/);
  assert.ok(Math.abs(+ox - (274 - 88) / 292 * 100) < 0.01 && Math.abs(+oy - (215 - 52) / 260 * 100) < 0.01, `${ox}% ${oy}%`);
  assert.match(css, /\.brand:hover \.brand-symbole[^{]*\{ transform: rotate\(120deg\); \}/);
  assert.doesNotMatch(css + lire('finition.css'), /\.brand-mark \{[^}]*transform|:hover \.brand-mark/);
});

test('chaque page : logo de l\'en-tête et du pied de page en deux calques, chemins valides', () => {
  assert.ok(PAGES.length >= 30, PAGES.length);
  for (const f of PAGES) {
    const html = lire(f);
    const logos = [...html.matchAll(/<span class="brand-mark"><img src="((?:\.\.\/)*)assets\/(emblem(?:-light)?)-traits\.svg" alt="" width="(\d+)" height="(\d+)"><img src="\1assets\/\2-symbole\.svg" alt="" class="brand-symbole" width="\3" height="\4"><\/span>/g)];
    assert.deepEqual(logos.map(m => m[2]), ['emblem', 'emblem-light'], f);
    for (const m of logos) assert.ok(fs.existsSync(path.join(R, path.dirname(f), m[1], 'assets', m[2] + '-symbole.svg')), f);
    assert.doesNotMatch(html, /<img[^>]*class="brand-mark"/, f);
  }
});
