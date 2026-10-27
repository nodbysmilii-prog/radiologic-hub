/* =========================================================
   RadiologicHub — fiche « Conduite à tenir devant un nodule pulmonaire »
   ---------------------------------------------------------
   • illustrations : chaque <figure data-dessin='{…}'> ou data-planche="…"
     est dessinée par nodule-svg.js (RHNodulePoumon) ;
   • atelier du nodule : dessin en direct + arguments de la fiche ;
   • temps de doublement : calcul et place sur l'échelle (log) ;
   • Fleischner 2017 : ligne de la fiche, frise des contrôles, ligne du tableau surlignée ;
   • compte rendu à cocher, entraînement « Bénin ou suspect ? ».
   Règles : regles/nodule-pulmonaire.js (RHRegles.nodulePulmonaire).
   ========================================================= */
(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const N = window.RHNodulePoumon, R = window.RHRegles && window.RHRegles.nodulePulmonaire;
  if (!N || !R) return;
  const echapper = t => String(t).replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));
  const valeurs = form => {
    const o = {};
    $$('input', form).forEach(i => {
      if (i.type === 'radio') { if (i.checked) o[i.name] = i.value; }
      else if (i.type === 'checkbox') o[i.name] = i.checked;
      else o[i.name] = i.value;
    });
    return o;
  };

  /* ---------- Illustrations ---------- */
  function dessiner(fig) {
    const p = fig.dataset.planche;
    let svg;
    if (p === 'croissance') svg = N.croissance(fig.dataset.mode);
    else if (p && N[p]) svg = N[p]();
    else { try { svg = N.nodule(JSON.parse(fig.dataset.dessin || '{}')); } catch (e) { return; } }
    fig.insertAdjacentHTML('afterbegin', svg);
  }
  $$('figure.np-fig').forEach(dessiner);

  // Petit schéma des poumons : lobes supérieurs en couleur
  const lobe = $('.np-lobe-svg');
  if (lobe) lobe.innerHTML = `<svg viewBox="0 0 70 60"><path d="M30 6C14 8 6 30 6 54H30Z" fill="#e8e8ee" stroke="#111" stroke-width="2"/><path d="M40 6C56 8 64 30 64 54H40Z" fill="#e8e8ee" stroke="#111" stroke-width="2"/><path d="M30 6C14 8 9 20 8 30L30 24Z" fill="#f2ab2f" stroke="#111" stroke-width="1.5"/><path d="M40 6C56 8 61 20 62 30L40 26Z" fill="#f2ab2f" stroke="#111" stroke-width="1.5"/></svg>`;

  /* ---------- Atelier du nodule ---------- */
  const at = $('#np-atelier');
  if (at) {
    const CLASSES = {
      benin: ['is-benin', 'Bénin : critères caractéristiques → arrêt des investigations.'],
      suspect: ['is-suspect', 'Signe(s) de malignité : à intégrer au contexte, à la taille et surtout à l\'évolution.'],
      indetermine: ['is-indetermine', 'Indéterminé : intégrer risque, taille, densité et croissance pour choisir surveillance, TEP ou histologie.'],
    };
    const maj = () => {
      const o = valeurs(at);
      o.calcif = +o.calcif;
      $('#np-at-taille').textContent = o.taille;
      $('#np-at-svg').innerHTML = N.nodule({ ...o, taille: +o.taille, fenetre: o.graisse || o.calcif ? 'mediastin' : 'poumon', legende: true, graine: 11 });
      const a = R.arguments(o);
      $('#np-at-args').innerHTML = a.liste.map(x => `<li class="is-${x.sens}">${echapper(x.texte)}</li>`).join('');
      const [cls, txt] = CLASSES[a.classement];
      const c = $('#np-at-classe'); c.className = 'np-at-classe ' + cls; c.textContent = txt;
    };
    at.addEventListener('input', maj); at.addEventListener('change', maj); maj();
  }

  /* ---------- Temps de doublement : échelle log de 10 à 2500 jours ---------- */
  const td = $('#np-td');
  if (td) {
    const MIN = 10, MAX = 2500, pos = j => Math.max(0, Math.min(100, Math.log(j / MIN) / Math.log(MAX / MIN) * 100));
    const zone = (sel, a, b) => { const el = $(sel, td); el.style.left = pos(a) + '%'; el.style.width = (b ? pos(b) - pos(a) : 100 - pos(a)) + '%'; };
    zone('.np-z-malin', 30, 500); zone('.np-z-typ', 100, 400); zone('.np-z-stable', 730); zone('.np-z-ns', 1095, 1825);
    const reperes = [30, 100, 400, 500, 730, 1095, 1825];
    $$('.np-echelle-l span', td).forEach((s, i) => { s.style.left = pos(reperes[i]) + '%'; });
    const curseur = $('#np-td-curseur'), res = $('#np-td-res');
    const verdict = (titre, niveau, texte) => { res.className = 'ch-verdict' + (niveau ? ' k-' + niveau : ''); $('b', res).textContent = titre; $('span', res).textContent = texte; };
    td.addEventListener('input', () => {
      const r = R.tempsDoublement(valeurs(td));
      if (!r) { curseur.hidden = true; verdict('', '', ''); return; }
      const cr = `${r.croissance > 0 ? '+' : ''}${String(r.croissance).replace('.', ',')} mm`;
      if (r.td == null) { curseur.hidden = true; verdict(`Pas de croissance (${cr})`, 'sign', 'Toujours comparer à l\'examen le plus ancien disponible.'); return; }
      curseur.hidden = false; curseur.style.left = pos(r.td) + '%'; curseur.dataset.v = `${r.td} j`;
      const evol = r.evolutif ? 'Augmentation du diamètre d\'au moins 2 mm : nodule évolutif.' : 'Augmentation < 2 mm : pas de critère de nodule évolutif sur le diamètre.';
      const place = {
        'tres-rapide': ['TD < 30 jours', 'key', 'Plus rapide que la plage des nodules solides malins (30-500 jours).'],
        malin: [`TD dans la plage des nodules solides malins${r.typique ? ' (typiquement 100-400 jours)' : ''}`, 'grave', 'Nodule solide malin : TD 30-500 jours, typiquement 100-400 jours.'],
        intermediaire: ['TD entre 500 et 730 jours', 'key', 'Stabilité > 2 ans : TD > 730 jours.'],
        stable: ['TD > 730 jours', 'sign', 'Nodule solide stable 2 ans : TD > 730 jours. Nodule non solide : TD souvent 3-5 ans.'],
      }[r.zone];
      verdict(`TD ≈ ${r.td} jours (${cr}) — ${place[0]}`, place[1], `${evol} ${place[2]}`);
    });
  }

  /* ---------- Fleischner 2017 ---------- */
  const fl = $('#np-fl');
  if (fl) {
    const frise = r => {
      const W = 640, H = 78, x0 = 24, x1 = W - 16, mx = m => x0 + (x1 - x0) * m / 60;
      let s = `<line x1="${x0}" y1="44" x2="${x1}" y2="44" stroke="#111" stroke-width="2"/>`;
      for (const m of [0, 6, 12, 18, 24, 36, 48, 60]) s += `<line x1="${mx(m)}" y1="40" x2="${mx(m)}" y2="48" stroke="#111" stroke-width="1.5"/><text x="${mx(m)}" y="64" font-size="10" font-weight="700" text-anchor="middle">${m < 24 ? m + ' m' : m / 12 + ' ans'}</text>`;
      if (!r.jalons.length && !r.geste) s += `<text x="${(x0 + x1) / 2}" y="30" font-size="12" font-weight="800" text-anchor="middle" fill="#1f6d4c">${echapper(r.conduite)}</text>`;
      r.jalons.forEach(j => {
        const a = mx(j.de), b = mx(j.a), w = Math.max(b - a, 10);
        s += `<rect x="${a - (b === a ? 5 : 0)}" y="30" width="${w}" height="12" rx="6" fill="${j.opt ? '#fff' : '#f2ab2f'}" stroke="#b07400" stroke-width="2"${j.opt ? ' stroke-dasharray="4 3"' : ''}/>`;
        s += `<text x="${a + (b - a) / 2}" y="24" font-size="9" font-weight="800" text-anchor="middle">${j.opt ? '+/- ' : ''}TDM</text>`;
      });
      if (r.geste) s += `<g><rect x="${mx(r.jalons.length ? 4 : 0)}" y="4" width="${r.geste.length * 6.4 + 16}" height="18" rx="9" fill="#c8102e"/><text x="${mx(r.jalons.length ? 4 : 0) + 8}" y="17" font-size="10" font-weight="800" fill="#fff">${echapper(r.geste)}</text></g>`;
      return `<svg viewBox="0 0 ${W} ${H}" font-family="Montserrat, Arial, sans-serif">${s}</svg>`;
    };
    const maj = () => {
      const o = valeurs(fl);
      o.multiples = !!o.multiples;
      $('#np-fl-taille').textContent = o.taille;
      $('#np-fl-solide').textContent = o.solide;
      const mixte = o.type === 'mixte';
      $('#np-fl-solide-l').hidden = !mixte;
      if (!mixte) delete o.solide;
      else if (+o.solide > +o.taille) { o.solide = o.taille; $('input[name="solide"]', fl).value = o.taille; $('#np-fl-solide').textContent = o.taille; }
      const r = R.fleischner(o);
      const res = $('#np-fl-res');
      $('b', res).textContent = r ? r.conduite.charAt(0).toUpperCase() + r.conduite.slice(1) : '';
      $('span', res).textContent = r ? r.ligne : '';
      $('#np-fl-frise').innerHTML = r ? frise(r) : '';
      $$('.np-tables tr[data-cle]').forEach(tr => tr.classList.toggle('is-on', !!r && tr.dataset.cle.split(' ').includes(r.cle)));
    };
    fl.addEventListener('input', maj); fl.addEventListener('change', maj); maj();
  }

  /* ---------- Compte rendu à cocher ---------- */
  const cr = $('#np-cr');
  if (cr) cr.addEventListener('change', () => {
    const c = $$('input', cr);
    $('#np-cr-n').textContent = `${c.filter(i => i.checked).length} / ${c.length} rubriques`;
  });

  /* ---------- Testez-vous : bénin ou suspect ? ---------- */
  const zone = $('#np-cas');
  if (zone) {
    let score = 0;
    const majScore = () => { $('#np-score').textContent = `${score} / ${R.CAS.length}`; };
    const rendre = () => {
      score = 0; majScore(); zone.innerHTML = '';
      R.CAS.forEach((c, i) => {
        const el = document.createElement('div'); el.className = 'ti-cas-c';
        el.innerHTML = `<figure class="np-fig">${N.nodule({ taille: 14, ...c.dessin })}</figure><p><span class="ti-cas-n">${i + 1}</span>Ce nodule est-il…</p>
          <div class="ti-cas-choix"><button type="button" data-k="benin" style="--c: var(--green)">Bénin</button><button type="button" data-k="suspect" style="--c: var(--k-grave, #c8102e)">Suspect</button></div><p class="ti-cas-rep" aria-live="polite"></p>`;
        $$('button', el).forEach(b => b.addEventListener('click', () => {
          if (el.classList.contains('is-fait')) return;
          el.classList.add('is-fait');
          const ok = b.dataset.k === c.rep;
          if (ok) score++; majScore();
          $$('button', el).forEach(x => x.classList.toggle('is-ok', x.dataset.k === c.rep));
          if (!ok) b.classList.add('is-faux');
          $('.ti-cas-rep', el).innerHTML = `${ok ? '✓' : '✗'} <b>${c.rep === 'benin' ? 'Bénin' : 'Suspect'}</b> — ${echapper(c.texte)}`;
        }));
        zone.appendChild(el);
      });
    };
    rendre();
    $('#np-cas-reset').addEventListener('click', rendre);
  }
})();
