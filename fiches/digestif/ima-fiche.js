/* =========================================================
   RadiologicHub — fiche « Ischémie mésentérique : sémiologie et diagnostic »
   ---------------------------------------------------------
   • illustrations : <figure data-ima="anse|air|mesentere|veine|colon|vasospasme">
     dessinées par ima-svg.js (RHIschemie) ;
   • dose de contraste (2 mL/kg jusqu'à 150 mL) ;
   • barre des 3 formes → la forme s'ouvre et s'allume ;
   • « Où est l'occlusion ? » : curseur le long de l'AMS → orientation étiologique ;
   • atelier de la paroi : un signe → dessin, texte de la fiche, valeur pronostique ;
   • grille des signes de mauvais pronostic, entraînement « Quelle forme ? ».
   Règles : regles/ischemie-mesenterique.js (RHRegles.ischemieMesenterique).
   ========================================================= */
(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const I = window.RHIschemie, R = window.RHRegles && window.RHRegles.ischemieMesenterique;
  if (!I || !R) return;
  const echapper = t => String(t).replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));
  const verdict = (el, titre, niveau, texte) => {
    el.className = 'ch-verdict' + (niveau ? ' k-' + niveau : '');
    $('b', el).textContent = titre; $('span', el).textContent = texte;
  };

  /* ---------- Illustrations ---------- */
  $$('figure[data-ima]').forEach(f => {
    const k = f.dataset.ima, t = f.dataset.type;
    const svg = k === 'veine' ? I.veine({ injecte: !!f.dataset.injecte }) : t ? I[k](t) : I[k]();
    f.insertAdjacentHTML('afterbegin', svg);
  });

  /* ---------- Dose de contraste ---------- */
  const dose = $('#im-dose');
  if (dose) {
    const maj = () => {
      const p = $('input[name="poids"]', dose).value;
      $('#im-poids-val').textContent = p;
      const r = R.contraste(p);
      verdict($('#im-dose-res'), `${r.volume} mL à ${r.debit}`, 'key', r.plafonne ? `2 mL/kg = ${p * 2} mL : plafonné à 150 mL.` : `2 mL/kg × ${p} kg.`);
    };
    dose.addEventListener('input', maj); maj();
  }

  /* ---------- Barre des 3 formes ---------- */
  $$('.im-barre [data-forme]').forEach(b => b.addEventListener('click', () => {
    $$('.im-barre [data-forme]').forEach(x => x.classList.toggle('is-on', x === b));
    $$('.im-forme').forEach(f => f.classList.toggle('is-on', f.id === 'forme-' + b.dataset.forme));
    $('#forme-' + b.dataset.forme).scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
  }));

  /* ---------- Où est l'occlusion ? ---------- */
  const ams = $('#im-ams');
  if (ams) {
    const maj = () => {
      const cm = +$('input[name="cm"]', ams).value, calcif = $('input[name="calcif"]', ams).checked;
      $('#im-cm').textContent = String(cm).replace('.', ',');
      const r = R.orientationOcclusion(cm);
      $('#im-ams-svg').innerHTML = I.axe({ occlusion: cm, type: r.cle === 'embolie' ? 'embole' : 'thrombus', calcif });
      const niveau = { thrombose: 'ddx', embolie: 'tech', distale: 'ddx', intermediaire: 'key' }[r.cle];
      verdict($('#im-ams-res'), r.titre, niveau, r.texte + (calcif ? ' Calcifications pariétales de l\'AMS → évoquent un terrain vasculaire.' : ''));
    };
    ams.addEventListener('input', maj); ams.addEventListener('change', maj); maj();
  }

  /* ---------- Atelier de la paroi ---------- */
  const onglets = $$('[data-paroi]');
  const montrer = cle => {
    const p = R.PAROI[cle];
    onglets.forEach(b => b.setAttribute('aria-selected', String(b.dataset.paroi === cle)));
    $('#im-paroi-svg').innerHTML = I.anse(cle);
    $('#im-paroi-titre').textContent = p.titre;
    $('#im-paroi-texte').textContent = p.texte;
    const pr = $('#im-paroi-prono');
    pr.className = 'im-prono' + (p.prono ? ' is-' + p.prono : '');
    pr.textContent = p.pronoTexte || '';
  };
  onglets.forEach(b => b.addEventListener('click', () => montrer(b.dataset.paroi)));
  if (onglets.length) montrer('epaissie');

  /* ---------- Gravité ---------- */
  const grav = $('#im-gravite');
  if (grav) {
    for (const [groupe, liste] of Object.entries(R.GRAVITE)) {
      $(`[data-groupe="${groupe}"]`, grav).innerHTML = liste.map(t => `<li><label><input type="checkbox"> <mark class="k-grave">${echapper(t)}</mark></label></li>`).join('');
    }
    const total = R.GRAVITE.origine.length + R.GRAVITE.paroi.length;
    grav.addEventListener('change', () => {
      const n = $$('input:checked', grav).length;
      $('#im-jauge-i').style.width = (n / total * 100) + '%';
      $('#im-jauge-txt').textContent = `${n} signe${n > 1 ? 's' : ''} de mauvais pronostic coché${n > 1 ? 's' : ''} sur ${total}`;
    });
  }

  /* ---------- Testez-vous ---------- */
  const zone = $('#im-cas');
  if (zone) {
    const COUL = { embolie: 'var(--blue)', thrombose: 'var(--purple)', nonOcclusive: 'var(--amber)', veineuse: 'var(--teal)' };
    let score = 0;
    const majScore = () => { $('#im-score').textContent = `${score} / ${R.CAS.length}`; };
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
    $('#im-cas-reset').addEventListener('click', rendre);
  }
})();
