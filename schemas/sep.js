/* =========================================================
   RadiologicHub — SEP : schéma des localisations (coupes axiale et sagittale)
   ---------------------------------------------------------
   Schéma simplifié, à visée pédagogique (pas une coupe réelle) : zones
   colorées et numérotées là où siègent les plaques (fiche SEP, parties III
   et V) : 1 périventriculaire (et doigts de Dawson), 2 juxtacorticale /
   corticale, 3 infratentorielle (tronc cérébral, cervelet), 4 médullaire,
   5 corps calleux (« crête de coq »), 6 voies visuelles.
   <div data-sep-schema> : schéma complet avec légende cliquable ;
   <div data-sep-schema="mcdonald"> : les 4 localisations de McDonald
   2017, allumées par le vérificateur (outils/mcdonald.js).
   ========================================================= */

(() => {
  const ZONES = [
    { id: 'periventriculaire', n: 1, nom: 'Périventriculaire', note: 'angles et toit des ventricules ; plaques ovoïdes perpendiculaires (doigts de Dawson)', c: '#3c67b8', dis: true },
    { id: 'juxtacorticale', n: 2, nom: 'Juxtacorticale / corticale', note: 'jonction substance blanche / grise', c: '#f18d25', dis: true },
    { id: 'infratentorielle', n: 3, nom: 'Infratentorielle', note: 'pont, pédoncules cérébelleux moyens, cervelet', c: '#1f8a5b', dis: true },
    { id: 'medullaire', n: 4, nom: 'Médullaire', note: 'moelle cervicale +++', c: '#6b0d8c', dis: true },
    { id: 'calleux', n: 5, nom: 'Corps calleux', note: 'face inférieure, « crête de coq » en sagittal', c: '#e0a100', dis: false },
    { id: 'visuelles', n: 6, nom: 'Voies visuelles', note: 'nerfs optiques, chiasma, tractus', c: '#d63f4c', dis: false },
  ];
  const Z = Object.fromEntries(ZONES.map(z => [z.id, z]));
  const INK = '#111114', CERVEAU = '#e7e4df', CORTEX = '#aaa59d', LCS = '#bcd2e6';
  let uid = 0;

  const badge = (id, x, y) => {
    const z = Z[id];
    return `<g class="sep-badge" data-zone="${id}"><circle cx="${x}" cy="${y}" r="11" fill="${z.c}" stroke="${INK}" stroke-width="1.6"/>`
      + `<text x="${x}" y="${y + 4.6}" text-anchor="middle" font-family="Montserrat, system-ui, sans-serif" font-weight="900" font-size="13" fill="#fff">${z.n}</text></g>`;
  };
  const ovoide = (x, y, r, c) => `<ellipse cx="${x}" cy="${y}" rx="9" ry="4" transform="rotate(${r} ${x} ${y})" fill="${c}" stroke="${INK}" stroke-width=".8"/>`;

  function axiale(k) {
    const E = 'cx="150" cy="168" rx="112" ry="146"';
    const ventG = 'M144 96 C 128 100, 119 124, 121 152 C 122 176, 125 200, 117 220 C 113 232, 121 240, 133 234 C 141 218, 142 190, 143 160 C 144 132, 147 110, 144 96 Z';
    const ventD = 'M156 96 C 172 100, 181 124, 179 152 C 178 176, 175 200, 183 220 C 187 232, 179 240, 167 234 C 159 218, 158 190, 157 160 C 156 132, 153 110, 156 96 Z';
    const sillons = Array.from({ length: 18 }, (_, i) => {
      const a = (i / 18) * 2 * Math.PI + .17, cx = 150 + 112 * Math.cos(a), cy = 168 + 146 * Math.sin(a);
      const ix = 150 + 96 * Math.cos(a), iy = 168 + 128 * Math.sin(a);
      return `M${cx.toFixed(1)} ${cy.toFixed(1)} L${ix.toFixed(1)} ${iy.toFixed(1)}`;
    }).join(' ');
    return `<svg viewBox="0 0 300 336" role="img" aria-label="Coupe axiale schématique : zones périventriculaire et juxtacorticale">
  <defs><clipPath id="sep-ax-${k}"><ellipse ${E}/></clipPath></defs>
  <ellipse cx="150" cy="168" rx="126" ry="160" fill="#f6f2ea" stroke="${INK}" stroke-width="2"/>
  <ellipse ${E} fill="${CERVEAU}"/>
  <g clip-path="url(#sep-ax-${k})">
    <g class="sep-zone" data-zone="juxtacorticale"><ellipse ${E} fill="none" stroke="${Z.juxtacorticale.c}" stroke-width="38" opacity=".6"/>${ovoide(58, 112, -55, Z.juxtacorticale.c)}${ovoide(244, 214, -55, Z.juxtacorticale.c)}</g>
    <ellipse ${E} fill="none" stroke="${CORTEX}" stroke-width="16"/>
    <path d="${sillons}" stroke="${CORTEX}" stroke-width="2.4" fill="none"/>
  </g>
  <ellipse ${E} fill="none" stroke="${INK}" stroke-width="2"/>
  <path d="M150 22 L150 76 M150 262 L150 314" stroke="${CORTEX}" stroke-width="3"/>
  <g class="sep-zone" data-zone="periventriculaire">
    <path d="${ventG} ${ventD}" fill="none" stroke="${Z.periventriculaire.c}" stroke-width="22" stroke-linejoin="round" opacity=".45"/>
    ${ovoide(101, 128, -12, Z.periventriculaire.c)}${ovoide(99, 162, 0, Z.periventriculaire.c)}${ovoide(101, 196, 14, Z.periventriculaire.c)}
    ${ovoide(199, 128, 12, Z.periventriculaire.c)}${ovoide(201, 162, 0, Z.periventriculaire.c)}${ovoide(199, 196, -14, Z.periventriculaire.c)}
  </g>
  <path d="${ventG} ${ventD}" fill="${LCS}" stroke="${INK}" stroke-width="1.5"/>
  ${badge('periventriculaire', 88, 236)}${badge('juxtacorticale', 46, 168)}
</svg>`;
  }

  function sagittale(k) {
    const B = 'M58 175 C 50 95, 120 32, 205 32 C 290 32, 340 92, 332 165 C 328 200, 312 222, 290 228 C 270 233, 248 222, 234 214 L 208 212 C 190 222, 160 226, 130 222 C 92 218, 62 205, 58 175 Z';
    const CC = 'M112 158 C 112 122, 150 96, 195 96 C 240 96, 262 120, 262 150 C 262 162, 252 166, 247 156 C 243 132, 225 112, 195 112 C 160 112, 132 128, 130 156 C 129 168, 113 170, 112 158 Z';
    const VL = 'M134 160 C 140 134, 168 122, 195 122 C 222 122, 242 134, 244 160 C 230 172, 150 174, 134 160 Z';
    const crete = [[150, 120], [168, 115], [186, 113], [204, 113], [222, 116], [238, 124]]
      .map(([x, y]) => `M${x - 4} ${y} L${x} ${y + 8} L${x + 4} ${y} Z`).join(' ');
    return `<svg viewBox="0 0 360 340" role="img" aria-label="Coupe sagittale schématique : corps calleux, ventricule, tronc cérébral, cervelet, moelle cervicale, voies visuelles">
  <defs><clipPath id="sep-sag-${k}"><path d="${B}"/></clipPath></defs>
  <path d="${B}" fill="${CERVEAU}"/>
  <g clip-path="url(#sep-sag-${k})">
    <g class="sep-zone" data-zone="juxtacorticale"><path d="${B}" fill="none" stroke="${Z.juxtacorticale.c}" stroke-width="38" opacity=".6"/>${ovoide(96, 70, 40, Z.juxtacorticale.c)}${ovoide(312, 132, -80, Z.juxtacorticale.c)}</g>
    <path d="${B}" fill="none" stroke="${CORTEX}" stroke-width="16"/>
  </g>
  <path d="${B}" fill="none" stroke="${INK}" stroke-width="2"/>
  <g class="sep-zone" data-zone="infratentorielle">
    <ellipse cx="268" cy="258" rx="42" ry="28" fill="${Z.infratentorielle.c}" opacity=".85" stroke="${INK}" stroke-width="1.5"/>
    <path d="M238 252 C 252 242, 284 240, 300 252 M236 262 C 254 254, 286 254, 306 264 M244 272 C 260 268, 284 268, 298 276" stroke="#0e5a39" stroke-width="1.6" fill="none"/>
    <path d="M206 210 C 198 228, 190 248, 194 268 C 197 282, 204 292, 208 300 L 228 300 L 230 280 C 234 262, 236 236, 232 210 Z" fill="${Z.infratentorielle.c}" opacity=".85" stroke="${INK}" stroke-width="1.5"/>
  </g>
  <path d="M232 246 L 244 256 L 232 266 Z" fill="${LCS}" stroke="${INK}" stroke-width="1"/>
  <g class="sep-zone" data-zone="medullaire"><path d="M208 300 L 228 300 L 226 336 L 210 336 Z" fill="${Z.medullaire.c}" stroke="${INK}" stroke-width="1.5"/></g>
  <g class="sep-zone" data-zone="visuelles">
    <circle cx="28" cy="226" r="13" fill="#fff" stroke="${INK}" stroke-width="1.5"/>
    <path d="M41 227 L 180 230" stroke="${Z.visuelles.c}" stroke-width="7" stroke-linecap="round"/>
    <circle cx="182" cy="230" r="6" fill="${Z.visuelles.c}" stroke="${INK}" stroke-width="1.2"/>
  </g>
  <g class="sep-zone" data-zone="periventriculaire">
    <path d="${VL}" fill="none" stroke="${Z.periventriculaire.c}" stroke-width="20" stroke-linejoin="round" opacity=".45"/>
    ${ovoide(146, 92, -50, Z.periventriculaire.c)}${ovoide(174, 80, -22, Z.periventriculaire.c)}${ovoide(210, 78, 12, Z.periventriculaire.c)}${ovoide(242, 92, 45, Z.periventriculaire.c)}
  </g>
  <path d="${VL}" fill="${LCS}" stroke="${INK}" stroke-width="1.5"/>
  <g class="sep-zone" data-zone="calleux">
    <path d="${CC}" fill="${Z.calleux.c}" stroke="${INK}" stroke-width="1.5"/>
    <path d="${crete}" fill="#b45f00"/>
  </g>
  ${badge('periventriculaire', 189, 146)}${badge('juxtacorticale', 290, 82)}${badge('infratentorielle', 272, 260)}
  ${badge('medullaire', 244, 322)}${badge('calleux', 196, 104)}${badge('visuelles', 104, 229)}
</svg>`;
  }

  function legende(mode) {
    return ZONES.filter(z => mode !== 'mcdonald' || z.dis).map(z =>
      `<li><button type="button" class="sep-leg" data-zone="${z.id}" style="--zc: ${z.c}" aria-pressed="false"><span class="sep-num">${z.n}</span><span><b>${z.nom}</b><small>${z.note}</small></span></button></li>`).join('');
  }

  document.querySelectorAll('[data-sep-schema]').forEach(el => {
    const k = ++uid, mode = el.dataset.sepSchema || 'complet';
    el.classList.add('sep-schema');
    el.dataset.mode = mode;
    el.innerHTML = `<div class="sep-coupes">
      <figure><div class="sep-svg">${axiale(k)}</div><figcaption>Coupe axiale</figcaption></figure>
      <figure><div class="sep-svg">${sagittale(k)}</div><figcaption>Coupe sagittale</figcaption></figure>
    </div>${mode === 'mcdonald' ? '' : `<ul class="sep-legende">${legende(mode)}</ul>`}`;
    if (mode === 'mcdonald') {
      el.querySelectorAll('.sep-zone, .sep-badge').forEach(g => { if (!Z[g.dataset.zone].dis) g.classList.add('is-hors'); });
      return;
    }
    const boutons = [...el.querySelectorAll('.sep-leg')];
    let fixe = null;
    const montrer = id => {
      el.classList.toggle('is-focus', !!id);
      el.querySelectorAll('.sep-zone, .sep-badge').forEach(g => g.classList.toggle('is-on', g.dataset.zone === id));
      boutons.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.zone === id)));
    };
    boutons.forEach(b => {
      b.addEventListener('mouseenter', () => { if (!fixe) montrer(b.dataset.zone); });
      b.addEventListener('mouseleave', () => { if (!fixe) montrer(null); });
      b.addEventListener('click', () => { fixe = fixe === b.dataset.zone ? null : b.dataset.zone; montrer(fixe); });
    });
  });

  window.RHSchemaSEP = { ZONES };
})();
