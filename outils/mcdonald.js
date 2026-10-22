/* =========================================================
   RadiologicHub — vérificateur des critères IRM de McDonald 2017
   (interface de la fiche SEP ; règles dans regles/mcdonald.js)
   ========================================================= */

(() => {
  const R = window.RHRegles && window.RHRegles.mcdonald;
  if (!R) return;
  document.querySelectorAll('[data-mcdonald]').forEach(box => {
    const res = box.querySelector('.mcd-res');
    const coche = n => !!box.querySelector(`input[name="${n}"]:checked`);
    const maj = () => {
      const lieux = [...box.querySelectorAll('input[name="lieu"]:checked')].map(i => i.value);
      const r = R.evaluer({
        lieux, gdSimultane: coche('gd'), nouvelleLesion: coche('suivi'),
        bandes: coche('bandes'), premierEvenement: coche('cis'),
      });
      box.querySelector('.mcd-compte').textContent = `${r.nbLieux} localisation${r.nbLieux > 1 ? 's' : ''} sur 4 (il en faut 2)`;
      const b = res.querySelectorAll('.mcd-badge');
      b[0].dataset.ok = r.dis; b[0].textContent = (r.dis ? '✓ ' : '✗ ') + 'DIS';
      b[1].dataset.ok = r.dit; b[1].textContent = (r.dit ? '✓ ' : '✗ ') + 'DIT';
      res.dataset.criteres = r.criteres;
      box.querySelectorAll('.sep-zone, .sep-badge').forEach(g => g.classList.toggle('is-on', lieux.includes(g.dataset.zone)));
      res.querySelector('.mcd-concl').textContent = r.conclusion;
      const detail = [];
      if (r.lieux.length) detail.push('Localisations : ' + r.lieux.join(', ') + '.');
      if (r.raisonsDit.length) detail.push('DIT par : ' + r.raisonsDit.join(' ; ') + '.');
      if (r.bandesSansCis) detail.push('Les bandes oligoclonales ne remplacent la DIT qu\'après un premier événement clinique (CIS).');
      res.querySelector('.mcd-detail').textContent = detail.join(' ');
    };
    box.addEventListener('change', maj);
    box.querySelector('[data-mcd="reset"]')?.addEventListener('click', () => {
      box.querySelectorAll('input[type="checkbox"]').forEach(i => { i.checked = false; });
      maj();
    });
    maj();
  });
})();
