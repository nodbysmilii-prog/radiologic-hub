/* =========================================================
   RadiologicHub — fiche « Masses hépatiques solides »
   ---------------------------------------------------------
   • onglets scoped (temps de la TDM, aspects des métastases) ;
   • HNF typique : cinq critères à cocher, jauge, hépatopathie sous-jacente ;
   • calculateur LI-RADS : taille + HRPA + critères majeurs → case du tableau allumée ;
   • classification de Bismuth et Corlette : schéma SVG de l'arbre biliaire ;
   • tableaux comparatifs : mise en avant d'une colonne ;
   • tableau final : filtre par catégorie ;
   • CAT devant une lésion hyperéchogène : contexte → hypothèse et conduite ;
   • entraînement « Quelle lésion ? » ; clic sur la carte des lésions → la lésion clignote.
   Règles : regles/masses-hepatiques.js (RHRegles.massesHepatiques).
   ========================================================= */
(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const R = window.RHRegles && window.RHRegles.massesHepatiques;
  if (!R) return;
  const echapper = t => String(t).replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));
  const doux = () => (matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth');
  const verdict = (el, titre, niveau, texte) => {
    el.className = 'ch-verdict' + (niveau ? ' k-' + niveau : '');
    $('b', el).textContent = titre; $('span', el).textContent = texte;
  };

  /* ---------- Onglets (portée limitée à leur bloc) ---------- */
  $$('[data-mh-onglets]').forEach(bloc => {
    const boutons = $$('[data-p]', bloc).filter(b => b.tagName === 'BUTTON');
    const panneaux = $$('.mh-panneau', bloc);
    const montrer = cle => {
      boutons.forEach(b => b.setAttribute('aria-selected', String(b.dataset.p === cle)));
      panneaux.forEach(p => { p.hidden = p.dataset.p !== cle; });
    };
    boutons.forEach(b => b.addEventListener('click', () => montrer(b.dataset.p)));
  });

  /* ---------- HNF typique : cinq critères ---------- */
  const hnf = $('#mh-hnf');
  if (hnf) {
    const maj = () => {
      const coches = $$('input[data-crit]:checked', hnf).map(i => i.dataset.crit);
      const hep = !!$('input[data-hepatopathie]:checked', hnf);
      const r = R.hnf(coches, hep);
      $$('.mh-jauge i', hnf).forEach((i, k) => i.classList.toggle('is-on', k < r.nb));
      hnf.classList.toggle('is-hepatopathie', hep);
      const texte = r.cle === 'non' && !r.nb ? 'Ces critères sont valables en l\'absence d\'hépatopathie sous-jacente.' : r.texte;
      verdict($('.ch-verdict', hnf), r.titre ? `${r.titre} (${r.nb} / ${R.CRITERES_HNF.length})` : '', r.titre ? r.niveau : '', texte);
    };
    hnf.addEventListener('change', maj);
    maj();
  }

  /* ---------- Calculateur LI-RADS ---------- */
  const lr = $('#mh-lirads');
  if (lr) {
    const res = $('#mh-lirads-res');
    const rappel = ' S\'applique aux patients cirrhotiques ou à risque de CHC, en TDM/IRM injectée ; ne s\'applique pas au foie sain.';
    const maj = () => {
      const taille = $('input[name="taille"]', lr).value;
      const hrpa = $('input[name="hrpa"]:checked', lr).value === 'oui';
      const crit = $$('input[data-crit]:checked', lr).map(i => i.dataset.crit);
      const r = R.lirads(taille, hrpa, crit);
      $$('#mh-lr-grille td.is-actif').forEach(td => td.classList.remove('is-actif'));
      if (!r) { verdict(res, '', '', 'Saisissez la taille de la lésion (en mm) : la case correspondante du tableau s\'allume.'); return; }
      const cell = $(`#mh-lr-grille td[data-h="${hrpa ? 'hrpa' : 'sans'}"][data-col="${r.colonne}"][data-l="${Math.min(r.criteresMajeurs, 2)}"]`);
      if (cell) cell.classList.add('is-actif');
      const retenir = r.retenir ? `À retenir : ${r.retenir}.` : '';
      verdict(res, `${r.categorie} — ${r.sens}`, r.niveau, [retenir, r.note, rappel].filter(Boolean).join(' '));
    };
    lr.addEventListener('input', maj); lr.addEventListener('change', maj);
    $('#mh-lirads-reset').addEventListener('click', () => {
      $('input[name="taille"]', lr).value = '';
      $('input[name="hrpa"][value="non"]', lr).checked = true;
      $$('input[data-crit]', lr).forEach(i => { i.checked = false; });
      maj();
    });
    maj();
  }

  /* ---------- Bismuth et Corlette : arbre biliaire ---------- */
  const zoneSvg = $('#mh-bismuth-svg');
  if (zoneSvg) {
    zoneSvg.innerHTML = `<svg viewBox="0 0 260 250" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path class="mh-canal" data-seg="chc" d="M130 236 L130 176"/>
      <path class="mh-canal" data-seg="convergence" d="M130 176 L130 152 M130 152 L112 134 M130 152 L148 134"/>
      <path class="mh-canal" data-seg="droit" d="M112 134 L96 118 L58 84 M96 118 L92 68"/>
      <path class="mh-canal" data-seg="gauche" d="M148 134 L164 118 L202 84 M164 118 L168 68"/>
      <circle class="mh-noeud" data-seg="convergence" cx="130" cy="152" r="9"/>
      <text x="140" y="208">canal hépatique</text>
      <text x="140" y="221">commun</text>
      <text x="142" y="166">convergence</text>
      <text x="14" y="52">droit</text>
      <text x="206" y="52">gauche</text>
    </svg>`;
    const bloc = $('[data-mh-bismuth]');
    const res = $('#mh-bismuth-res');
    const montrer = cle => {
      const b = R.BISMUTH[cle];
      $$('[data-bismuth]', bloc).forEach(x => x.setAttribute('aria-selected', String(x.dataset.bismuth === cle)));
      $$('[data-seg]', zoneSvg).forEach(el => el.classList.toggle('is-tumeur', b.atteint.includes(el.dataset.seg)));
      verdict(res, b.titre, { I: 'sign', II: 'key', IIIa: 'key', IIIb: 'key', IV: 'grave' }[cle], b.texte);
    };
    $$('[data-bismuth]', bloc).forEach(x => x.addEventListener('click', () => montrer(x.dataset.bismuth)));
    montrer('I');
  }

  /* ---------- Tableaux comparatifs : mettre une colonne en avant ---------- */
  $$('.mh-cmpbar').forEach(barre => {
    const table = document.getElementById(barre.getAttribute('aria-controls'));
    if (!table) return;
    $$('button', barre).forEach(btn => btn.addEventListener('click', () => {
      $$('button', barre).forEach(b => { b.classList.toggle('is-active', b === btn); b.setAttribute('aria-pressed', String(b === btn)); });
      table.dataset.show = btn.dataset.col;
    }));
  });

  /* ---------- Tableau final : filtre par catégorie ---------- */
  const filtres = $('.mh-filtres');
  if (filtres) {
    const lignes = $$('.mh-final tbody tr');
    $$('button', filtres).forEach(btn => btn.addEventListener('click', () => {
      $$('button', filtres).forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
      lignes.forEach(l => { l.hidden = btn.dataset.cat !== 'toutes' && l.dataset.cat !== btn.dataset.cat; });
    }));
  }

  /* ---------- CAT : contexte → hypothèse prioritaire et conduite ---------- */
  const ctx = $('#mh-contexte');
  if (ctx) {
    const res = $('#mh-contexte-res');
    $$('[data-contexte]', ctx).forEach(btn => btn.addEventListener('click', () => {
      const c = R.CONTEXTES[btn.dataset.contexte];
      $$('[data-contexte]', ctx).forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
      verdict(res, c.nom, c.niveau, c.texte);
    }));
  }

  /* ---------- Carte des lésions et tableau final : la lésion clignote à l'arrivée ---------- */
  $$('.mh-carte a, .mh-final a').forEach(a => a.addEventListener('click', ev => {
    const cible = $(a.getAttribute('href')); if (!cible) return;
    ev.preventDefault();
    cible.scrollIntoView({ behavior: doux(), block: 'start' });
    cible.classList.remove('mh-flash'); void cible.offsetWidth; cible.classList.add('mh-flash');
    history.replaceState(null, '', a.getAttribute('href'));
  }));

  /* ---------- Testez-vous : Quelle lésion ? ---------- */
  const zone = $('#mh-cas');
  if (zone) {
    const COUL = { benigne: '#1f8a5b', primitive: '#a8172d', secondaire: '#c4780f' };
    let score = 0;
    const majScore = () => { $('#mh-score').textContent = `${score} / ${R.CAS.length}`; };
    const rendre = () => {
      score = 0; majScore(); zone.innerHTML = '';
      R.CAS.forEach((c, i) => {
        const el = document.createElement('div'); el.className = 'ti-cas-c';
        el.innerHTML = `<p><span class="ti-cas-n">${i + 1}</span>${echapper(c.texte)}</p><div class="ti-cas-choix">${Object.entries(R.CHOIX).map(([k, n]) => `<button type="button" data-k="${k}" style="--c: ${COUL[R.LESIONS[k].categorie]}">${echapper(n)}</button>`).join('')}</div><p class="ti-cas-rep" aria-live="polite"></p>`;
        $$('button', el).forEach(b => b.addEventListener('click', () => {
          if (el.classList.contains('is-fait')) return;
          el.classList.add('is-fait');
          const ok = b.dataset.k === c.rep;
          if (ok) score++; majScore();
          $$('button', el).forEach(x => x.classList.toggle('is-ok', x.dataset.k === c.rep));
          if (!ok) b.classList.add('is-faux');
          $('.ti-cas-rep', el).innerHTML = `${ok ? '✓' : '✗'} <b>${echapper(R.CHOIX[c.rep])}</b> — ${echapper(c.pourquoi)}`;
        }));
        zone.appendChild(el);
      });
    };
    rendre();
    $('#mh-cas-reset').addEventListener('click', rendre);
  }
})();
