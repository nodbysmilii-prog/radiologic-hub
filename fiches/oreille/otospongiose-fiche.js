/* =========================================================
   RadiologicHub — fiche « Otospongiose »
   ---------------------------------------------------------
   Schémas interactifs (otospongiose-schemas.js) et outils (regles/otospongiose.js) :
   audiogramme (début / stade avancé), types de Veillon sur la coupe axiale, outil de
   classement du foyer, grades de Fraysse, canal facial procident, récessus de la fenêtre
   ovale, qui suis-je, onglets post-opératoires, compte rendu guidé, entraînement.
   ========================================================= */
(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const R = window.RHRegles && window.RHRegles.otospongiose, O = window.RHOto;
  if (!R || !O) return;

  /* Audiogramme */
  const AUDIO = ['Conduction aérienne (CA) abaissée, conduction osseuse (CO) normale sauf l\'<b>encoche de Carhart</b> vers 2 kHz : la surdité est de transmission.',
    'Stade avancé : la conduction osseuse baisse aussi, surtout dans les aigus : <b>surdité mixte</b>.'];
  const audio = i => { $('#oto-audio').innerHTML = O.audiogramme(!!i); $('#oto-audio-txt').innerHTML = AUDIO[i]; $$('[data-audio]').forEach(b => b.classList.toggle('is-on', +b.dataset.audio === i)); };
  $$('[data-audio]').forEach(b => b.addEventListener('click', () => audio(+b.dataset.audio)));
  if ($('#oto-audio')) audio(0);

  /* Veillon */
  let type = '1A';
  const capsule = () => {
    $('#oto-capsule').innerHTML = O.capsule(type, { endoste: $('#oto-endoste').checked });
    $('#oto-capsule-txt').innerHTML = `<b>Type ${type}</b> — ${R.VEILLON[type]}.`;
    $$('.oto-types button').forEach(b => b.setAttribute('aria-selected', String(b.dataset.type === type)));
    $$('.oto-table-veillon tr[data-type]').forEach(tr => tr.classList.toggle('is-on', tr.dataset.type === type));
    $('.oto-endoste').classList.toggle('is-actif', type === '4A' || type === '3');
  };
  $$('.oto-types button').forEach(b => b.addEventListener('click', () => { type = b.dataset.type; capsule(); }));
  $$('.oto-table-veillon tr[data-type]').forEach(tr => tr.addEventListener('click', () => { type = tr.dataset.type; capsule(); }));
  if ($('#oto-capsule')) { $('#oto-endoste').addEventListener('change', capsule); capsule(); }

  /* Outil de classement */
  const cl = $('#oto-classer');
  if (cl) cl.addEventListener('change', () => {
    const f = { platine: cl.querySelector('[name="platine"]').checked, prestapedien: cl.querySelector('[name="prestapedien"]').value,
      contactCochlee: cl.querySelector('[name="contactCochlee"]').checked, pericochleaire: cl.querySelector('[name="pericochleaire"]').checked, vestibulaire: cl.querySelector('[name="vestibulaire"]').checked };
    const t = R.veillon(f), res = $('#oto-classer-res');
    res.className = 'ch-verdict' + (t ? (/^[34]/.test(t) ? ' k-grave' : ' k-key') : '');
    res.querySelector('b').textContent = t ? `Type ${t} de Veillon` : '';
    res.querySelector('span').textContent = t ? R.VEILLON[t] + '.' : 'Aucun foyer décrit (une forme infraradiologique reste possible).';
    if (t) { type = t; capsule(); }
  });

  /* Fraysse */
  const fr = $('#oto-fr-range');
  if (fr) { const maj = () => { $('#oto-fr').innerHTML = O.fenetreRonde(+fr.value); $$('.oto-grades li').forEach(li => li.classList.toggle('is-on', li.dataset.g === fr.value)); }; fr.addEventListener('input', maj); maj(); }

  /* Canal facial, fenêtre ovale */
  const vii = $('#oto-vii-range');
  if (vii) { const maj = () => { $('#oto-vii').innerHTML = O.coronal(+vii.value); }; vii.addEventListener('input', maj); maj(); }
  const fo = $('#oto-fo-range');
  if (fo) { const maj = () => { const v = +fo.value; $('#oto-fo').innerHTML = O.fenetreOvale(v); $('#oto-fo-txt').textContent = R.fenetreOvale(v).texte; }; fo.addEventListener('input', maj); maj(); }

  /* Qui suis-je */
  $$('.oto-qui .ti-p').forEach(b => { b.setAttribute('aria-pressed', 'false'); b.addEventListener('click', e => { if (e.target.closest('a')) return; const on = b.classList.toggle('is-vu'); b.setAttribute('aria-pressed', String(on)); }); });

  /* Onglets */
  const onglets = $$('.ch-onglets [data-onglet]');
  onglets.forEach(b => b.addEventListener('click', () => {
    onglets.forEach(x => x.setAttribute('aria-selected', String(x === b)));
    $$('.ch-panneau').forEach(p => { p.hidden = p.dataset.panneau !== b.dataset.onglet; });
  }));

  /* Compte rendu */
  const cr = $('#oto-cr');
  if (cr) {
    const maj = () => {
      const v = n => cr.querySelector(`[name="${n}"]:checked`)?.value;
      const c = n => cr.querySelector(`[name="${n}"]`).checked;
      const o = { cote: v('cote'), type: v('type') || null, fraysse: +v('fraysse'), fenetre: cr.querySelector('[name="fenetre"]').value, procident: c('procident'), dehiscence: c('dehiscence'), stapedienne: c('stapedienne'), enclume: !c('lyseEnclume'), marteau: c('marteau'), controlateral: c('controlateral') };
      const r = R.compteRendu(o);
      $('#oto-cr-texte').innerHTML = '<p class="p-cr-titre">Résultats</p>' + r.resultats.map(t => `<p>${t}</p>`).join('') + `<p class="p-cr-titre">Conclusion</p><p><b>${r.conclusion}</b></p>`;
    };
    cr.addEventListener('input', maj); cr.addEventListener('change', maj); maj();
    $('#oto-cr-copier').addEventListener('click', async e => {
      try { await navigator.clipboard.writeText($('#oto-cr-texte').innerText); e.target.textContent = 'Copié ✓'; } catch { e.target.textContent = 'Copie impossible'; }
      setTimeout(() => { e.target.textContent = 'Copier le texte'; }, 1600);
    });
  }

  /* Entraînement */
  const CAS = [
    { t: '1A', d: 'Platine épaissie à 0,9 mm, hypodense ; pas d\'autre foyer.' },
    { t: '2', d: 'Hypodensité pré-stapédienne de 1,8 mm, séparée de la cochlée par de l\'os sain.' },
    { t: '1B', d: 'Petite hypodensité pré-stapédienne de 0,7 mm.' },
    { t: '4B', d: 'Foyers autour du vestibule et du canal semi-circulaire latéral.' },
    { t: '3', d: 'Hypodensité de 2,5 mm qui touche la lumière du tour basal de la cochlée.' },
  ];
  const zone = $('#oto-cas');
  if (zone) {
    const TYPES = ['1A', '1B', '2', '3', '4A', '4B'];
    const rendre = () => {
      let score = 0; $('#oto-score').textContent = `0 / ${CAS.length}`;
      zone.innerHTML = '';
      CAS.forEach((c, i) => {
        const el = document.createElement('div'); el.className = 'ti-cas-c';
        el.innerHTML = `<p><span class="ti-cas-n">${i + 1}</span>${c.d}</p><div class="ti-cas-choix oto-choix">${TYPES.map(k => `<button type="button" data-k="${k}" style="--c: var(--orange)">${k}</button>`).join('')}</div><p class="ti-cas-rep" aria-live="polite"></p>`;
        $$('button', el).forEach(b => b.addEventListener('click', () => {
          if (el.classList.contains('is-fait')) return;
          el.classList.add('is-fait');
          const ok = b.dataset.k === c.t; if (ok) score++;
          $('#oto-score').textContent = `${score} / ${CAS.length}`;
          b.classList.add(ok ? 'is-ok' : 'is-faux'); $$('button', el).find(x => x.dataset.k === c.t).classList.add('is-ok');
          $('.ti-cas-rep', el).innerHTML = `${ok ? '✓' : '✗'} <b>Type ${c.t}</b> — ${R.VEILLON[c.t]}.`;
        }));
        zone.appendChild(el);
      });
    };
    rendre(); $('#oto-cas-reset').addEventListener('click', rendre);
  }
})();
