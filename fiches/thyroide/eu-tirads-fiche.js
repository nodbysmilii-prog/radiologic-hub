/* =========================================================
   RadiologicHub — fiche « Nodule thyroïdien : EU-TIRADS 2017 »
   ---------------------------------------------------------
   • atelier : le lexique choisi redessine le nodule (nodule-svg.js) et le classe
     (regles/eu-tirads.js) : catégorie, risque, raison, conduite ;
   • vignettes des catégories et des 4 signes forts dessinées par le même module ;
   • ponctuations hyperéchogènes : vignettes à retourner ;
   • calcul de croissance significative ;
   • curseur de taille → catégories à ponctionner ;
   • entraînement : 6 nodules à classer, score.
   ========================================================= */
(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const R = window.RHRegles && window.RHRegles.euTirads, N = window.RHNodule;
  if (!R || !N) return;
  const COUL = { 2: 'var(--green)', 3: 'var(--amber)', 4: 'var(--orange)', 5: 'var(--k-grave)' };

  /* ---------- Atelier ---------- */
  const form = $('#ti-lexique');
  if (form) {
    const lire = () => {
      const f = new FormData(form);
      return { composition: f.get('composition'), echo: f.get('echo'), forme: f.get('forme'), contours: f.get('contours'), micro: f.has('micro'), halo: f.has('halo'), taille: +f.get('taille') };
    };
    const maj = () => {
      const n = lire();
      $('#ti-taille-val').textContent = n.taille + ' mm';
      const echoFs = form.querySelector('fieldset:nth-of-type(2)');
      echoFs.disabled = n.composition === 'kyste';
      $('#ti-ecran').innerHTML = N.dessinerNodule(n, { label: 'Nodule construit avec le lexique' });
      const r = R.classer(n), c = r.categorie, info = c ? R.CATEGORIES[c] : null;
      const b = $('#ti-badge');
      b.style.setProperty('--c', c ? COUL[c] : 'var(--muted)');
      b.querySelector('.ti-badge-cat').textContent = c ? 'EU-TIRADS ' + c : '—';
      b.querySelector('.ti-badge-nom').textContent = info ? info.nom : '';
      b.querySelector('.ti-badge-risque').textContent = info ? 'risque de malignité ' + info.risque : '';
      b.classList.remove('is-pulse'); void b.offsetWidth; b.classList.add('is-pulse');
      $('#ti-curseur').style.left = c ? `${(c - 2) * 25 + 12.5}%` : '-20%';
      $('#ti-raison').textContent = r.raison;
      $('#ti-conduite').innerHTML = c ? `<b>Conduite</b> : ${R.cytoponction(c, n.taille).texte} ${c > 2 ? R.surveillance(c, n.taille) : ''}` : '';
    };
    form.addEventListener('input', maj); form.addEventListener('change', maj); maj();
  }

  /* ---------- Vignettes ---------- */
  $$('[data-nodule]').forEach(el => {
    const d = document.createElement('div'); d.className = 'ti-vignette';
    d.innerHTML = N.dessinerNodule(JSON.parse(el.dataset.nodule), { label: el.querySelector('b')?.textContent || 'Nodule' });
    el.prepend(d);
  });

  /* ---------- Ponctuations ---------- */
  $$('.ti-p').forEach(b => {
    $('.ti-p-img', b).innerHTML = N.ponctuation(b.dataset.p);
    b.setAttribute('aria-pressed', 'false');
    b.addEventListener('click', () => { const on = b.classList.toggle('is-vu'); b.setAttribute('aria-pressed', String(on)); });
  });

  /* ---------- Croissance ---------- */
  const cr = $('#ti-croissance');
  if (cr) {
    const maj = () => {
      const v = n => ['1', '2', '3'].map(i => parseFloat(String(cr.querySelector(`[name="${n}${i}"]`).value).replace(',', '.')) || 0);
      const r = R.croissance(v('a'), v('b'));
      const el = $('#ti-croissance-res');
      el.className = 'ti-verdict ' + (r.significative ? 'k-key' : 'k-sign');
      el.innerHTML = `<b>${r.significative ? 'Croissance significative' : 'Pas de croissance significative'}</b> — volume ${r.volume >= 0 ? '+' : ''}${r.volume} %. <small>Rappel : grossir n'est pas un signe de malignité.</small>`;
    };
    cr.addEventListener('input', maj); maj();
  }

  /* ---------- Seuil de cytoponction ---------- */
  const fna = $('#ti-fna');
  if (fna) {
    const maj = () => {
      const t = +fna.value; $('#ti-fna-val').textContent = t + ' mm';
      const oui = [];
      $$('.ti-fna-c').forEach(c => { const k = +c.dataset.cat; const on = k > 2 && t > R.SEUILS[k]; c.classList.toggle('is-on', on); if (on) oui.push(k); });
      $('#ti-fna-res').innerHTML = oui.length ? `À ${t} mm, on ponctionne les nodules <b>EU-TIRADS ${oui.join(', ')}</b>.` : `À ${t} mm, <b>pas d'indication nodulaire systématique</b> : surveillance.`;
    };
    fna.addEventListener('input', maj); maj();
  }

  /* ---------- Entraînement ---------- */
  const CAS = [
    { n: { composition: 'solide', echo: 'iso', forme: 'ovale', contours: 'reguliers' }, t: 'Nodule solide ovale, isoéchogène, contours réguliers, 18 mm.' },
    { n: { composition: 'solide', echo: 'hypo-moderee', forme: 'non-ovale', contours: 'reguliers' }, t: 'Nodule solide, modérément hypoéchogène, plus épais que large, 9 mm.' },
    { n: { composition: 'spongiforme', echo: 'iso' }, t: 'Nodule entièrement spongiforme, 22 mm.' },
    { n: { composition: 'mixte-kystique', echo: 'hypo-moderee' }, t: 'Nodule à prédominance kystique, portion solide modérément hypoéchogène, 25 mm.' },
    { n: { composition: 'solide', echo: 'iso', micro: true }, t: 'Nodule solide ovale isoéchogène avec ponctuations < 1 mm sans queue de comète, 12 mm.' },
    { n: { composition: 'solide', echo: 'hyper', halo: true }, t: 'Nodule solide hyperéchogène, ovale, halo fin complet, 14 mm.' },
  ];
  const zone = $('#ti-cas');
  if (zone) {
    let score = 0, faits = 0;
    const majScore = () => { $('#ti-score').textContent = `${score} / ${CAS.length}`; };
    const rendre = () => {
      score = 0; faits = 0; majScore();
      zone.innerHTML = '';
      CAS.forEach((c, i) => {
        const juste = R.classer(c.n).categorie;
        const el = document.createElement('div'); el.className = 'ti-cas-c';
        el.innerHTML = `<div class="ti-vignette">${N.dessinerNodule(c.n, { label: c.t })}</div><p><span class="ti-cas-n">${i + 1}</span>${c.t}</p>
          <div class="ti-cas-choix">${[2, 3, 4, 5].map(k => `<button type="button" data-k="${k}" style="--c: ${COUL[k]}">${k}</button>`).join('')}</div><p class="ti-cas-rep" aria-live="polite"></p>`;
        $$('button', el).forEach(b => b.addEventListener('click', () => {
          if (el.classList.contains('is-fait')) return;
          el.classList.add('is-fait'); faits++;
          const ok = +b.dataset.k === juste; if (ok) score++; majScore();
          b.classList.add(ok ? 'is-ok' : 'is-faux');
          $$('button', el).find(x => +x.dataset.k === juste).classList.add('is-ok');
          $('.ti-cas-rep', el).innerHTML = `${ok ? '✓' : '✗'} <b>EU-TIRADS ${juste}</b> — ${R.classer(c.n).raison}`;
        }));
        zone.appendChild(el);
      });
    };
    rendre();
    $('#ti-cas-reset').addEventListener('click', rendre);
  }
})();
