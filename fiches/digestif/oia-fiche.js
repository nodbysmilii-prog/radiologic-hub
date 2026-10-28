/* =========================================================
   RadiologicHub — fiche « Imagerie de l'occlusion intestinale aiguë »
   ---------------------------------------------------------
   • les 5 questions → ouvrent la partie qui y répond ;
   • onglets (conséquences, obstructions intraluminales, formes du volvulus) ;
   • valvule de Bauhin continente / non continente (schéma) ;
   • dose de contraste, règle de dilatation (grêle > 2,5 cm, côlon > 5 cm),
     mécanique ou fonctionnelle, signes d'anse fermée, grille de gravité ;
   • entraînement « Quelle cause ? ».
   Règles : regles/occlusion-intestinale.js (RHRegles.occlusion).
   ========================================================= */
(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const R = window.RHRegles && window.RHRegles.occlusion;
  if (!R) return;
  const echapper = t => String(t).replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));
  const doux = () => (matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth');
  const verdict = (el, titre, niveau, texte) => {
    el.className = 'ch-verdict' + (niveau ? ' k-' + niveau : '');
    $('b', el).textContent = titre; $('span', el).textContent = texte;
  };

  /* ---------- Les 5 questions ---------- */
  const COUL_Q = ['var(--teal)', 'var(--blue)', 'var(--purple)', 'var(--k-grave)', 'var(--orange)'];
  const SOUS = ['Diagnostic positif', 'Mécanisme', 'Topographie', 'Gravité', 'Étiologie'];
  const q = $('#oi-questions');
  if (q) {
    q.innerHTML = R.QUESTIONS.map((x, i) => `<li><a href="#${x.ancre}" style="--c: ${COUL_Q[i]}">${echapper(x.q)}<small>→ ${SOUS[i]}</small></a></li>`).join('');
    $$('a', q).forEach(a => a.addEventListener('click', ev => {
      const cible = $(a.getAttribute('href')); if (!cible) return;
      ev.preventDefault(); cible.scrollIntoView({ behavior: doux(), block: 'start' });
      cible.classList.remove('oi-flash'); void cible.offsetWidth; cible.classList.add('oi-flash');
      history.replaceState(null, '', a.getAttribute('href'));
    }));
  }

  /* ---------- Onglets ---------- */
  $$('.oi-onglets').forEach(barre => {
    const g = barre.dataset.groupe;
    $$('[data-onglet]', barre).forEach(b => b.addEventListener('click', () => {
      $$('[data-onglet]', barre).forEach(x => x.setAttribute('aria-selected', String(x === b)));
      $$(`.oi-panneau[data-groupe="${g}"]`).forEach(p => { p.hidden = p.dataset.panneau !== b.dataset.onglet; });
    }));
  });
  $$('.oi-cascade li').forEach((li, i) => li.style.setProperty('--i', i));

  /* ---------- Valvule de Bauhin ---------- */
  const COLON = 'M70 214C58 214 50 204 50 190L50 70C50 56 58 48 72 48L250 48C264 48 272 56 272 70L272 170C272 196 258 214 236 220C214 226 200 210 186 214C172 218 172 236 160 240';
  const GRELE = 'M70 196C92 196 100 180 96 166C92 152 108 140 126 146C144 152 160 138 156 122C152 106 168 96 186 104C204 112 222 104 218 88C214 76 196 74 182 80C164 88 146 80 140 70';
  function bauhin(continente) {
    const dil = '#f2ab2f', norm = '#e8cfb2', t = '#111114';
    let s = `<rect width="320" height="260" fill="#fbfaf7"/>`;
    // côlon : toujours dilaté en amont de l'obstacle (sigmoïde)
    s += `<path d="${COLON}" fill="none" stroke="${t}" stroke-width="30" stroke-linecap="round" stroke-linejoin="round"/><path d="${COLON}" fill="none" stroke="${dil}" stroke-width="24" stroke-linecap="round" stroke-linejoin="round"/>`;
    // grêle : dilaté seulement si la valvule n'est pas continente
    const w = continente ? 10 : 20;
    s += `<path d="${GRELE}" fill="none" stroke="${t}" stroke-width="${w + 5}" stroke-linecap="round" stroke-linejoin="round"/><path d="${GRELE}" fill="none" stroke="${continente ? norm : dil}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
    // obstacle sur le sigmoïde
    s += `<rect x="198" y="200" width="12" height="34" rx="3" transform="rotate(-20 204 217)" fill="${t}"/><text x="214" y="252" font-size="11" font-weight="800" text-anchor="middle" fill="${t}">obstacle</text>`;
    // valvule de Bauhin
    s += continente
      ? `<rect x="64" y="186" width="10" height="20" rx="2" fill="#2a9d8f" stroke="${t}" stroke-width="2"/>`
      : `<path d="M64 190L74 196L64 202" fill="none" stroke="#a8172d" stroke-width="3"/>`;
    s += `<text x="84" y="190" font-size="10.5" font-weight="800" fill="${t}" paint-order="stroke" stroke="#fbfaf7" stroke-width="3">valvule de Bauhin</text>`;
    // caecum
    if (continente) s += `<circle cx="50" cy="208" r="26" fill="none" stroke="#a8172d" stroke-width="3" stroke-dasharray="6 4"><animate attributeName="r" values="24;30;24" dur="1.4s" repeatCount="indefinite"/></circle><text x="14" y="252" font-size="10.5" font-weight="800" fill="#a8172d">caecum</text>`;
    s += `<text x="160" y="22" font-size="11" font-weight="800" text-anchor="middle" fill="${t}">côlon</text><text x="150" y="168" font-size="11" font-weight="800" text-anchor="middle" fill="${t}">grêle</text>`;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 260" role="img" aria-label="Occlusion colique, valvule ${continente ? 'continente' : 'non continente'}" font-family="Montserrat, Arial, sans-serif">${s}</svg>`;
  }
  const bb = $$('[data-bauhin]');
  const majBauhin = v => {
    bb.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.bauhin === v)));
    $('#oi-bauhin-svg').innerHTML = bauhin(v === 'continente');
    if (v === 'continente') verdict($('#oi-bauhin-res'), 'Valvule continente', 'grave', 'dilatation reste limitée au côlon → l\'augmentation de la pression peut entrainer une perforation diastatique du caecum entrainant une péritonite stercorale avec état de choc septique et risque vital.');
    else verdict($('#oi-bauhin-res'), 'Valvule non continente', 'key', 'dilatation du côlon se continue par celle de l\'intestin grêle.');
  };
  bb.forEach(b => b.addEventListener('click', () => majBauhin(b.dataset.bauhin)));
  if (bb.length) majBauhin('incontinente');

  /* ---------- Dose de contraste ---------- */
  const dose = $('#oi-dose');
  if (dose) {
    const maj = () => {
      const p = $('input[name="poids"]', dose).value, r = R.contraste(p);
      $('#oi-poids-val').textContent = p;
      verdict($('#oi-dose-res'), `${r.min} à ${r.max} cc`, 'key', `1,5 à 2 cc/kg × ${p} kg ; débit ${r.debit}.`);
    };
    dose.addEventListener('input', maj); maj();
  }

  /* ---------- Règle de dilatation ---------- */
  const mes = $('#oi-mesure');
  if (mes) {
    let seg = 'grele';
    const MAX = 100;
    const maj = () => {
      const mm = +$('input[name="mm"]', mes).value, r = R.dilatation(seg, mm);
      $('#oi-mm').textContent = mm;
      const regle = $('.oi-regle', mes);
      regle.style.setProperty('--s', (r.seuil / MAX * 100) + '%'); regle.style.setProperty('--v', (mm / MAX * 100) + '%');
      const nom = seg === 'grele' ? 'anse grêle' : 'côlon';
      verdict($('#oi-mesure-res'), r.dilate ? `Distension (${nom})` : `Pas de distension (${nom})`, r.dilate ? 'grave' : 'sign',
        `${mm} mm ${r.dilate ? '>' : '≤'} ${r.seuil} mm : seuil ${seg === 'grele' ? '> 2,5cm pour les anses' : '> 5cm pour le côlon'}.`);
    };
    $$('[data-seg]', mes).forEach(b => b.addEventListener('click', () => {
      seg = b.dataset.seg; $$('[data-seg]', mes).forEach(x => x.setAttribute('aria-pressed', String(x === b))); maj();
    }));
    mes.addEventListener('input', maj); maj();
  }

  /* ---------- Mécanique ou fonctionnelle ---------- */
  const meca = $('#oi-meca');
  if (meca) {
    const maj = () => {
      const v = n => $(`input[name="${n}"]`, meca).checked;
      const r = R.mecanisme({ disparite: v('disparite'), zt: v('zt'), diffuse: v('diffuse'), nha: v('peuNha') ? 'peu' : 'nombreux' });
      if (!r) return verdict($('#oi-meca-res'), '', '', 'Cochez ce que vous voyez sur le scanner.');
      verdict($('#oi-meca-res'), r.cle === 'mecanique' ? 'Mécanique (organique)' : 'Fonctionnelle (paralytique)', r.cle === 'mecanique' ? 'key' : 'ddx', r.texte);
    };
    meca.addEventListener('change', maj); maj();
  }

  /* ---------- Listes à cocher : anse fermée, gravité ---------- */
  const anse = $('#oi-anse');
  if (anse) {
    $('#oi-anse-liste').innerHTML = R.ANSE_FERMEE.map(t => `<li><label><input type="checkbox"> <mark class="k-sign">${echapper(t)}</mark></label></li>`).join('');
    anse.addEventListener('change', () => {
      const n = $$('input:checked', anse).length;
      $('#oi-anse-jauge').style.width = (n / R.ANSE_FERMEE.length * 100) + '%';
      $('#oi-anse-txt').textContent = n ? `${n} signe${n > 1 ? 's' : ''} en faveur d'une anse fermée : risque ischémique plus élevé → regarder les signes de gravité.` : '0 signe coché';
    });
  }
  const grav = $('#oi-gravite');
  if (grav) {
    $('#oi-grav-liste').innerHTML = R.GRAVITE.map((t, i) => `<li><label><input type="checkbox"> <b>${i + 1}.</b> <mark class="k-grave">${echapper(t)}</mark></label></li>`).join('');
    const maj = () => {
      const r = R.gravite($$('input:checked', grav).length);
      verdict($('#oi-grav-res'), `${r.n} / 3`, r.chirurgie ? 'grave' : (r.n ? 'key' : ''), r.texte);
    };
    grav.addEventListener('change', maj); maj();
  }

  /* ---------- Testez-vous ---------- */
  const zone = $('#oi-cas');
  if (zone) {
    const COUL = { bride: 'var(--orange)', anseFermee: 'var(--k-grave)', ileusBiliaire: 'var(--teal)', iia: 'var(--purple)', volvulus: 'var(--green)', ogilvie: 'var(--blue)', adk: 'var(--ink)' };
    let score = 0;
    const majScore = () => { $('#oi-score').textContent = `${score} / ${R.CAS.length}`; };
    const rendre = () => {
      score = 0; majScore(); zone.innerHTML = '';
      R.CAS.forEach((c, i) => {
        const el = document.createElement('div'); el.className = 'ti-cas-c';
        el.innerHTML = `<p><span class="ti-cas-n">${i + 1}</span>${echapper(c.texte)}</p><div class="ti-cas-choix">${Object.entries(R.CHOIX).map(([k, n]) => `<button type="button" data-k="${k}" style="--c: ${COUL[k]}">${n}</button>`).join('')}</div><p class="ti-cas-rep" aria-live="polite"></p>`;
        $$('button', el).forEach(b => b.addEventListener('click', () => {
          if (el.classList.contains('is-fait')) return;
          el.classList.add('is-fait');
          const ok = b.dataset.k === c.rep;
          if (ok) score++; majScore();
          $$('button', el).forEach(x => x.classList.toggle('is-ok', x.dataset.k === c.rep));
          if (!ok) b.classList.add('is-faux');
          $('.ti-cas-rep', el).innerHTML = `${ok ? '✓' : '✗'} <b>${R.CHOIX[c.rep]}</b> — ${echapper(c.pourquoi)}`;
        }));
        zone.appendChild(el);
      });
    };
    rendre();
    $('#oi-cas-reset').addEventListener('click', rendre);
  }
})();
