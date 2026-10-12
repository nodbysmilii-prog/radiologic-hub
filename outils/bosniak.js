/* =========================================================
   Classification de Bosniak — page outils/bosniak
   ---------------------------------------------------------
   Cartes des 5 catégories (schémas de bosniak-schemas.js), calculateur
   à boutons (règles de bosniak-rules.js), résultat en direct ; sur
   téléphone, barre de résultat en bas de l'écran.
   ========================================================= */
(() => {
  const R = window.BosniakRegles, S = window.BosniakSchemas;
  if (!R || !S) return;
  const $ = id => document.getElementById(id);
  const esc = t => String(t ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const CATS = ['I', 'II', 'IIF', 'III', 'IV'];

  /* ---------- Les 5 cartes (critères reformulés des notes de cours et de la version 2019) ---------- */
  const CARTES = {
    I: { nature: 'Bénin', criteres: ['Paroi fine (≤ 2 mm) et lisse', 'Contenu liquidien homogène : −9 à 20 UH, signal du LCR en IRM', 'Ni cloison ni calcification'] },
    II: { nature: 'Bénin', criteres: ['1 à 3 cloisons fines (≤ 2 mm)', 'Calcifications de tout type', 'Kyste homogène : ≥ 70 UH ou −9 à 20 UH sans injection, > 20 UH sans rehaussement, 21 à 30 UH au temps portal, trop petit pour être caractérisé', 'IRM : hypersignal T2 ≈ LCR sans injection, hypersignal T1 ≥ 2,5 × rein'] },
    IIF: { nature: 'À surveiller', criteres: ['Paroi lisse discrètement épaissie (3 mm), rehaussée', 'Cloison(s) lisse(s) de 3 mm, rehaussée(s)', '4 cloisons fines rehaussées ou plus', 'IRM : hypersignal T1 hétérogène avec saturation de la graisse'] },
    III: { nature: 'Malignité intermédiaire', criteres: ['Paroi ou cloison rehaussée épaisse (≥ 4 mm)', 'Ou irrégulière : protrusion rehaussée ≤ 3 mm à angle obtus', 'Une cloison lisse de 3 mm reste un IIF'] },
    IV: { nature: 'Malignité jusqu\'à 90 %', criteres: ['Protrusion rehaussée ≥ 4 mm à angle obtus', 'Ou protrusion rehaussée à angle aigu, quelle que soit sa taille'] },
  };
  $('bk-cartes').innerHTML = CATS.map(c => `
    <article class="bk-carte" style="--cat:${S.COULEURS[c]}">
      <header class="bk-carte-tete"><span class="bk-badge">${c}</span><span class="bk-nature">${esc(CARTES[c].nature)}</span></header>
      <div class="bk-schema">${S.SVG[c].replace('role="img"', `role="img" aria-label="Schéma Bosniak ${c}"`)}</div>
      <ul class="bk-criteres">${CARTES[c].criteres.map(t => `<li>${esc(t)}</li>`).join('')}</ul>
      <p class="bk-conduite"><b>Conduite</b> ${esc(R.CONDUITE[c])}</p>
    </article>`).join('');

  /* ---------- Formulaire ---------- */
  let etat = { ...R.DEFAUT };
  /* Groupes : [titre, [champ, libellé, condition d'affichage, condition d'activation, aide]] */
  const GROUPES = [
    ['Examen', [
      ['modalite', 'Modalité'],
      ['injection', 'Injection'],
    ]],
    ['Avant tout', [
      ['tissu', 'Tissu rehaussé > 25 % du volume'],
      ['exclusion', 'Lésion infectieuse, inflammatoire, vasculaire ou syndrome héréditaire'],
      ['tropPetite', 'Lésion trop petite pour être caractérisée'],
    ]],
    ['Paroi', [
      ['paroi', 'Épaisseur'],
      ['paroiRehaussee', 'Rehaussée', null, e => e.injection === 'oui', 'avec injection'],
    ]],
    ['Cloisons', [
      ['cloisons', 'Nombre'],
      ['cloisonsEpaisseur', 'Épaisseur maximale', null, e => e.cloisons !== '0'],
      ['cloisonsRehaussees', 'Rehaussées', null, e => e.cloisons !== '0' && e.injection === 'oui', 'avec injection'],
    ]],
    ['Protrusion (nodule)', [
      ['protrusion', 'Type'],
      ['protrusionRehaussee', 'Rehaussée', null, e => e.protrusion !== 'aucune' && e.injection === 'oui', 'avec injection'],
    ]],
    ['Calcifications', [
      ['calcifications', 'Calcifications'],
    ]],
    ['Contenu au scanner', [
      ['uhSans', 'Densité sans injection (UH)', e => e.modalite === 'tdm'],
      ['uhPortal', 'Densité au temps portal (UH)', e => e.modalite === 'tdm', e => e.injection === 'oui'],
      ['delta', 'Delta de rehaussement (UH)', e => e.modalite === 'tdm', e => e.injection === 'oui', 'calculé si vide'],
    ], e => e.modalite === 'tdm'],
    ['Signal en IRM', [
      ['t2Lcr', 'Hypersignal T2 homogène ≈ LCR', e => e.modalite === 'irm'],
      ['t1Hyper', 'Hypersignal T1 homogène ≥ 2,5 × rein', e => e.modalite === 'irm'],
      ['t1FsHetero', 'Hypersignal T1 FS hétérogène', e => e.modalite === 'irm'],
    ], e => e.modalite === 'irm'],
  ];
  const NUMERIQUES = new Set(['uhSans', 'uhPortal', 'delta']);
  const form = $('bk-form');

  function dessinerFormulaire() {
    const focus = document.activeElement && document.activeElement.dataset && document.activeElement.dataset.champ;
    form.innerHTML = GROUPES.filter(([, , visible]) => !visible || visible(etat)).map(([titre, champs], i) => `
      <fieldset class="bk-groupe" style="--g:${['var(--blue)', 'var(--k-grave)', 'var(--teal)', 'var(--purple)', 'var(--orange)', 'var(--gold)', 'var(--steel)', 'var(--plum)'][i % 8]}">
        <legend>${esc(titre)}</legend>
        ${champs.filter(([, , visible]) => !visible || visible(etat)).map(([k, libelle, , actif, aide]) => {
          const on = !actif || actif(etat);
          if (NUMERIQUES.has(k)) {
            const calc = k === 'delta' && etat.delta === '' ? R.rehaussementMesure(etat).delta : null;
            return `<label class="bk-champ bk-num${on ? '' : ' is-off'}"><span class="bk-flab">${esc(libelle)}${aide ? ` <small>(${esc(aide)})</small>` : ''}</span>
              <input type="text" inputmode="decimal" data-champ="${k}" value="${esc(etat[k])}" placeholder="${calc != null ? esc(String(calc).replace('.', ',')) : 'UH'}" autocomplete="off"${on ? '' : ' disabled'}></label>`;
          }
          return `<div class="bk-champ${on ? '' : ' is-off'}"><span class="bk-flab" id="lab-${k}">${esc(libelle)}${aide && !on ? ` <small>(${esc(aide)})</small>` : ''}</span>
            <div class="bk-boutons" role="group" aria-labelledby="lab-${k}">${R.CHOIX[k].map(([v, l]) =>
              `<button type="button" class="bk-bouton" data-champ="${k}" data-valeur="${esc(v)}" aria-pressed="${etat[k] === v}"${on ? '' : ' disabled'}>${esc(l)}</button>`).join('')}</div></div>`;
        }).join('')}
      </fieldset>`).join('');
    if (focus) { const f = form.querySelector(`input[data-champ="${focus}"]`); if (f) { f.focus(); f.setSelectionRange(f.value.length, f.value.length); } }
  }

  form.addEventListener('click', ev => {
    const b = ev.target.closest('.bk-bouton');
    if (!b || b.disabled) return;
    etat = R.choisir(etat, b.dataset.champ, b.dataset.valeur);
    dessinerFormulaire(); afficherResultat();
  });
  form.addEventListener('input', ev => {
    const f = ev.target.closest('input[data-champ]');
    if (!f) return;
    etat[f.dataset.champ] = f.value.trim();
    const d = form.querySelector('input[data-champ="delta"]');                  // delta calculé en direct
    if (d && etat.delta === '') { const c = R.rehaussementMesure(etat).delta; d.placeholder = c != null ? String(c).replace('.', ',') : 'UH'; }
    afficherResultat();
  });

  /* ---------- Cas exemples ---------- */
  const EXEMPLES = [
    ['Kyste simple', { uhSans: '6', uhPortal: '8' }],
    ['Hyperdense 75 UH', { injection: 'non', uhSans: '75' }],
    ['Cloison lisse 3 mm', { cloisons: '1-3', cloisonsEpaisseur: '3', cloisonsRehaussees: 'oui', uhSans: '8', uhPortal: '10' }],
    ['Paroi 4 mm rehaussée', { paroi: '>=4', paroiRehaussee: 'oui', uhSans: '12', uhPortal: '14' }],
    ['Protrusion à angle aigu', { protrusion: 'aigu', protrusionRehaussee: 'oui', uhSans: '10', uhPortal: '12' }],
  ];
  const ex = $('bk-exemples');
  EXEMPLES.forEach(([l, e]) => ex.insertAdjacentHTML('beforeend', `<button type="button" class="bk-ex">${esc(l)}</button>`));
  ex.insertAdjacentHTML('beforeend', '<button type="button" class="bk-ex bk-ex-raz">Tout effacer</button>');
  ex.addEventListener('click', ev => {
    const b = ev.target.closest('.bk-ex');
    if (!b) return;
    const i = [...ex.querySelectorAll('.bk-ex')].indexOf(b);
    etat = { ...R.DEFAUT, ...(EXEMPLES[i] ? EXEMPLES[i][1] : {}) };
    dessinerFormulaire(); afficherResultat();
  });

  /* ---------- Résultat ---------- */
  function afficherResultat() {
    const r = R.classer(etat);
    const c = r.categorie, couleur = c ? S.COULEURS[c] : r.hors ? '#c9cbd1' : '#e4e5e8';
    const liste = (t, items, cls = '') => items.length ? `<h3>${t}</h3><ul class="bk-liste ${cls}">${items.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : '';
    $('bk-resultat').innerHTML = `
      <div class="bk-panneau" style="--cat:${couleur}">
        <div class="bk-res-tete">
          <div class="bk-res-cat${c ? '' : ' is-texte'}">${c ? `<small>Bosniak</small>${c}` : esc(r.titre)}</div>
          ${c ? `<div class="bk-res-schema">${S.SVG[c].replace('role="img"', `role="img" aria-label="Schéma Bosniak ${c}"`)}</div>` : ''}
        </div>
        ${c ? `<p class="bk-res-nature">${esc(CARTES[c].nature)}</p>` : ''}
        ${liste(c || r.hors ? 'Critères retenus' : 'Pour classer', r.criteres)}
        ${r.conduite ? `<h3>Conduite à tenir</h3><p class="bk-res-conduite">${esc(r.conduite)}</p>` : ''}
        ${liste('Conseils', r.conseils, 'bk-conseils')}
        <p class="bk-res-avert">Outil d'enseignement : ne remplace pas l'analyse radiologique (Silverman SG et al., Radiology 2019).</p>
      </div>`;
    $('bk-barre-t').innerHTML = c ? `<b style="--cat:${couleur}">${c}</b> Bosniak ${c} · ${esc(r.conduite)}` : `<b class="is-vide">?</b> ${esc(r.titre)}`;
  }

  /* Barre du bas (téléphone) : visible pendant que le calculateur est à l'écran, résultat hors de vue */
  const barre = $('bk-barre'), calc = $('calculateur'), res = $('bk-resultat');
  let calcVisible = false, resVisible = false;
  const majBarre = () => { const on = calcVisible && !resVisible; barre.classList.toggle('on', on); document.body.classList.toggle('bk-barre-on', on); };
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => { calcVisible = e.isIntersecting; majBarre(); }).observe(calc);
    new IntersectionObserver(([e]) => { resVisible = e.isIntersecting && e.intersectionRatio > 0.25; majBarre(); }, { threshold: [0, 0.25, 0.5] }).observe(res);
  }
  $('bk-voir').addEventListener('click', () => res.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }));

  dessinerFormulaire();
  afficherResultat();
})();
