/* =========================================================
   RadiologicHub — interactions
   Contenus modifiables : COURSES (masterclass), CASES (quiz), FLASH (fiche flash).
   ========================================================= */

const ICONS = {
  neuro: '<svg viewBox="0 0 24 24"><path d="M9 4a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 2 5 3 3 0 0 0 6 1V5a3 3 0 0 0-3-1z"/><path d="M15 4a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-2 5 3 3 0 0 1-6 1"/><path d="M12 9h-2M12 14h-2.5M14 11.5h2"/></svg>',
  digestif: '<svg viewBox="0 0 24 24"><path d="M9 3v3c0 2 3 2 3 4s-6 1-6 5a5 5 0 0 0 5 5h3a4 4 0 0 0 0-8h-3"/><path d="M14 12c0-2 3-2 3-5V3"/></svg>',
  thorax: '<svg viewBox="0 0 24 24"><path d="M12 3v9M12 12l-3 2M12 12l3 2"/><path d="M9.5 6C6 6 4 10 4 15c0 3 1 5 3 5s3-2 3-4V9"/><path d="M14.5 6C18 6 20 10 20 15c0 3-1 5-3 5s-3-2-3-4V9"/></svg>',
  trauma: '<svg viewBox="0 0 24 24"><path d="M7 3a2.5 2.5 0 0 0-1 4.8L14.2 16A2.5 2.5 0 1 0 19 17a2.5 2.5 0 1 0-1-4.8L9.8 4A2.5 2.5 0 0 0 7 3z"/><path d="M11 10l2-2"/></svg>',
  vasculaire: '<svg viewBox="0 0 24 24"><path d="M12 21s-7-4.5-7-11a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 6.5-7 11-7 11z"/><path d="M5 12h4l1.5-3 2.5 6 1.5-3H19"/></svg>',
  pediatrie: '<svg viewBox="0 0 24 24"><circle cx="12" cy="7" r="3"/><path d="M8 21v-5l-3-3 2-2 3 2h4l3-2 2 2-3 3v5"/></svg>'
};

const COURSES = [
  {
    id: 'neuro', color: 'var(--purple)',
    title: 'Neuro-urgences', level: 'essentiel', duration: '1 journée', cases: 25,
    summary: "AVC, hémorragies, traumatisme crânien : les décisions qui se prennent en quelques minutes.",
    topics: ['AVC ischémique', 'Hémorragie méningée', 'TC grave', 'Thrombose veineuse', 'Rachis'],
    objectives: [
      "Calculer un score ASPECTS et identifier une occlusion proximale",
      "Reconnaître les signes de gravité d'une hémorragie intracrânienne",
      "Ne pas manquer une thrombose veineuse cérébrale",
      "Évaluer l'instabilité rachidienne en traumatologie"
    ]
  },
  {
    id: 'digestif', color: 'var(--amber)',
    title: 'Urgences digestives', level: 'essentiel', duration: '1 journée', cases: 25,
    summary: "Douleur abdominale aiguë : occlusions, perforations, ischémie mésentérique, hernies compliquées.",
    topics: ['Occlusion', 'Pneumopéritoine', 'Ischémie mésentérique', 'Appendicite', 'Pancréatite'],
    objectives: [
      "Localiser la zone de transition et le mécanisme d'une occlusion",
      "Repérer les signes de souffrance digestive",
      "Diagnostiquer précocement une ischémie mésentérique",
      "Classer une pancréatite aiguë et ses complications"
    ]
  },
  {
    id: 'thorax', color: 'var(--blue)',
    title: 'Thorax en urgence', level: 'essentiel', duration: '1 journée', cases: 20,
    summary: "Dyspnée et douleur thoracique : embolie pulmonaire, dissection, pneumothorax et leurs pièges.",
    topics: ['Embolie pulmonaire', 'Dissection aortique', 'Pneumothorax', 'Pneumopathies', 'OAP'],
    objectives: [
      "Lire un angioscanner thoracique et évaluer le retentissement cardiaque",
      "Classer une dissection aortique (Stanford)",
      "Différencier un thrombus d'une tumeur endovasculaire",
      "Interpréter les pièges de la radiographie au lit"
    ]
  },
  {
    id: 'trauma', color: 'var(--rose)',
    title: 'Polytraumatisé', level: 'avance', duration: '1 journée', cases: 20,
    summary: "Le body-scanner du polytraumatisé, de la lecture immédiate au compte rendu complet.",
    topics: ['Body-scanner', 'Rate & foie', 'Bassin', 'Aorte traumatique', 'Rachis'],
    objectives: [
      "Structurer une lecture en deux temps (immédiate puis exhaustive)",
      "Grader les lésions d'organes pleins (AAST)",
      "Reconnaître un saignement actif",
      "Analyser les fractures instables du bassin"
    ]
  },
  {
    id: 'vasculaire', color: 'var(--teal)',
    title: 'Urgences vasculaires', level: 'avance', duration: '1 journée', cases: 18,
    summary: "Aorte, hémorragies digestives, ischémies aiguës : l'angioscanner au service de la décision.",
    topics: ["Rupture d'AAA", 'Hémorragie digestive', 'Ischémie de membre', 'Malformations AV'],
    objectives: [
      "Optimiser les protocoles multiphasiques",
      "Identifier une rupture ou une fissuration d'anévrisme",
      "Localiser une hémorragie digestive avant embolisation",
      "Rédiger un CR utile au radiologue interventionnel"
    ]
  },
  {
    id: 'pediatrie', color: 'var(--green)',
    title: "Pédiatrie d'urgence", level: 'avance', duration: '1 journée', cases: 22,
    summary: "Les spécificités de l'enfant : invagination, volvulus, maltraitance, traumatologie.",
    topics: ['Invagination', 'Volvulus', 'Maltraitance', "Fractures de l'enfant", 'Échographie'],
    objectives: [
      "Utiliser l'échographie en première intention",
      "Reconnaître une invagination intestinale aiguë",
      "Identifier les lésions évocatrices de maltraitance",
      "Connaître les fractures spécifiques de l'enfant"
    ]
  }
];

const CASES = [
  {
    tab: 'Cas 1 · Neuro',
    vignette: 'Homme de 56 ans aux antécédents de <span class="hl-navy">diabète de type 2 mal équilibré</span>, consulte pour des <span class="hl-red">mouvements involontaires et brusques</span> d\'apparition soudaine du bras et de la jambe droits. L\'IRM montre un <span class="hl-navy">hypersignal T1 du putamen gauche</span>.',
    question: 'Quel est votre diagnostic ?',
    options: ['Hématome des noyaux gris', 'Striatopathie diabétique', 'Calcifications (Fahr)', 'Dépôts de manganèse'],
    answer: 1,
    title: 'Striatopathie diabétique',
    points: [
      'Hyperglycémie non cétosique → hémichorée / hémiballisme',
      'Putamen (± noyau caudé) controlatéral aux symptômes',
      'Scanner : hyperdensité sans effet de masse',
      'IRM : hypersignal T1 caractéristique',
      'Régression après équilibration glycémique'
    ]
  },
  {
    tab: 'Cas 2 · Digestif',
    vignette: 'Patient consultant pour une <span class="hl-red">tuméfaction inguinale droite douloureuse</span> et irréductible. Au scanner, une <span class="hl-navy">structure tubulaire borgne et épaissie</span> se trouve dans le sac herniaire, au contact du cæcum.',
    question: 'Comment s\'appelle cette hernie ?',
    options: ['Hernie de Littré', "Hernie d'Amyand", 'Hernie de Richter', 'Hernie de De Garengeot'],
    answer: 1,
    title: "Hernie d'Amyand",
    points: [
      "Le scanner confirme l'appendice dans le sac herniaire inguinal",
      'Signes d\'inflammation : paroi appendiculaire épaissie (> 6 mm)',
      'Infiltration de la graisse péri-appendiculaire',
      'Liquide libre ou abcès dans les formes évoluées',
      'Astuce : appendice dans une hernie crurale = De Garengeot'
    ]
  },
  {
    tab: 'Cas 3 · Thorax',
    vignette: 'Femme de 52 ans aux urgences pour une <span class="hl-red">dyspnée progressive</span> depuis 3 mois, aggravée depuis 2 semaines, avec <span class="hl-red">douleurs thoraciques</span>, toux sèche et <span class="hl-navy">palpitations</span>. L\'angioscanner montre un défaut endoluminal du tronc de l\'artère pulmonaire qui le distend.',
    question: 'Quel diagnostic évoquez-vous en premier ?',
    options: ['Embolie pulmonaire chronique', "Sarcome de l'artère pulmonaire", 'Lymphome médiastinal', "Anévrisme de l'artère pulmonaire"],
    answer: 1,
    title: "Sarcome de l'artère pulmonaire",
    points: [
      'Envahissement de la paroi',
      'Expansion des artères atteintes',
      'Extension tumorale extraluminale',
      'Rehaussement après injection',
      'Nodules pulmonaires métastatiques'
    ]
  }
];

const FLASH = [
  { front: 'Sang', back: 'Hématome au stade subaigu : la méthémoglobine raccourcit le T1.' },
  { front: 'Calcifications', back: 'Certaines calcifications (Fahr, troubles phosphocalciques) apparaissent en hypersignal T1.' },
  { front: 'Métaux', back: 'Manganèse surtout : hépatopathie chronique, shunt porto-systémique, nutrition parentérale.' },
  { front: 'Striatopathie diabétique', back: 'Hyperglycémie non cétosique : putamen controlatéral à une hémichorée.' }
];

const LEVEL_LABEL = { essentiel: 'Essentiel', avance: 'Avancé' };

/* ---------- Cartes masterclass ---------- */
const cardsEl = document.getElementById('cards');
cardsEl.innerHTML = COURSES.map(c => `
  <article class="card reveal" data-level="${c.level}" style="--c: ${c.color}">
    <div class="card-badge">${ICONS[c.id] || ''}</div>
    <span class="tag">${LEVEL_LABEL[c.level]}</span>
    <h3>${c.title}</h3>
    <p>${c.summary}</p>
    <ul>${c.topics.map(t => `<li>${t}</li>`).join('')}</ul>
    <div class="card-meta">
      <span>${c.duration} · ${c.cases} cas</span>
      <button class="card-link" data-course="${c.id}">Détails →</button>
    </div>
  </article>
`).join('');

const courseSelect = document.getElementById('course');
COURSES.forEach(c => courseSelect.add(new Option(c.title, c.title)));
courseSelect.add(new Option('Plusieurs / je ne sais pas encore', 'Plusieurs'));

document.querySelectorAll('.filter').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter').forEach(b => {
      b.classList.toggle('is-active', b === btn);
      b.setAttribute('aria-selected', b === btn);
    });
    const f = btn.dataset.filter;
    cardsEl.querySelectorAll('.card').forEach(card => {
      card.classList.toggle('is-hidden', f !== 'all' && card.dataset.level !== f);
    });
  });
});

/* ---------- Modale détail ---------- */
const modal = document.getElementById('course-modal');
const modalBody = document.getElementById('modal-body');

cardsEl.addEventListener('click', e => {
  const btn = e.target.closest('[data-course]');
  if (!btn) return;
  const c = COURSES.find(x => x.id === btn.dataset.course);
  modal.style.setProperty('--c', c.color);
  modalBody.innerHTML = `
    <p class="marker-tag">Masterclass · ${LEVEL_LABEL[c.level]}</p>
    <h3 id="modal-title">${c.title}</h3>
    <p>${c.summary}</p>
    <h4>Objectifs</h4>
    <ul>${c.objectives.map(o => `<li>${o}</li>`).join('')}</ul>
    <h4>Thèmes</h4>
    <p>${c.topics.join(' · ')}</p>
    <h4>Format</h4>
    <p>${c.duration} en live · ${c.cases} cas cliniques · replay inclus</p>
    <a href="#inscription" class="btn btn-ink" data-pick="${c.title}">Je m'inscris</a>
  `;
  modal.showModal();
});

modal.addEventListener('click', e => {
  if (e.target === modal || e.target.closest('.modal-close')) modal.close();
  const pick = e.target.closest('[data-pick]');
  if (pick) {
    courseSelect.value = pick.dataset.pick;
    modal.close();
  }
});

document.querySelectorAll('[data-plan]').forEach(a => {
  a.addEventListener('click', () => { document.getElementById('plan').value = a.dataset.plan; });
});

/* ---------- Quiz « Cas du jour » ---------- */
const quizTabs = document.querySelector('.quiz-tabs');
const quizCard = document.getElementById('quiz-card');
const quizScore = document.getElementById('quiz-score');
const results = CASES.map(() => null); // null = pas répondu, true / false
let current = 0;

quizTabs.innerHTML = CASES.map((c, i) =>
  `<button class="quiz-tab" role="tab" data-case="${i}">${c.tab}</button>`).join('');

function renderCase(i) {
  current = i;
  const c = CASES[i];
  quizTabs.querySelectorAll('.quiz-tab').forEach((t, j) => {
    t.classList.toggle('is-active', j === i);
    t.setAttribute('aria-selected', j === i);
  });
  quizCard.innerHTML = `
    <p class="quiz-meta">Cas ${i + 1} / ${CASES.length}</p>
    <p class="quiz-vignette">${c.vignette}</p>
    <p class="quiz-question">${c.question}</p>
    <div class="options">${c.options.map((o, j) => `<button class="option" data-opt="${j}">${o}</button>`).join('')}</div>
    <div class="answer" aria-live="polite">
      <div class="answer-verdict"></div>
      <div>
        <h4>${c.title}</h4>
        <ul>${c.points.map(p => `<li>${p}</li>`).join('')}</ul>
        ${i < CASES.length - 1 ? '<button class="btn btn-outline btn-sm quiz-next">Cas suivant →</button>' : ''}
      </div>
    </div>`;
}

function updateScore() {
  const done = results.filter(r => r !== null).length;
  const good = results.filter(Boolean).length;
  quizScore.textContent = done ? `Score : ${good} / ${done}${done === CASES.length ? (good === CASES.length ? ' — sans faute, bravo !' : ' — les masterclass sont faites pour vous !') : ''}` : '';
}

quizTabs.addEventListener('click', e => {
  const t = e.target.closest('[data-case]');
  if (t) renderCase(+t.dataset.case);
});

quizCard.addEventListener('click', e => {
  if (e.target.closest('.quiz-next')) { renderCase(current + 1); return; }
  const opt = e.target.closest('[data-opt]');
  if (!opt || opt.disabled) return;
  const c = CASES[current];
  const picked = +opt.dataset.opt;
  const ok = picked === c.answer;
  quizCard.querySelectorAll('.option').forEach((b, j) => {
    b.disabled = true;
    b.classList.add(j === c.answer ? 'is-right' : 'is-wrong');
  });
  opt.classList.add('is-picked');
  const verdict = quizCard.querySelector('.answer-verdict');
  verdict.textContent = ok ? 'Bien vu !' : 'Presque…';
  verdict.classList.toggle('is-wrong', !ok);
  quizCard.querySelector('.answer').classList.add('is-visible');
  if (results[current] === null) results[current] = ok;
  quizTabs.children[current].classList.add('is-done');
  updateScore();
});

renderCase(0);

/* ---------- Fiche flash ---------- */
const flashEl = document.getElementById('flash');
flashEl.innerHTML = FLASH.map((f, i) => `
  <button class="flip reveal" aria-pressed="false" aria-label="${f.front} — retourner la carte">
    <span class="flip-tab">${i + 1}</span>
    <span class="flip-inner">
      <span class="flip-face flip-front"><strong>${f.front}</strong><small>cliquez pour retourner</small></span>
      <span class="flip-face flip-back"><p><b>${f.front}</b>${f.back}</p></span>
    </span>
  </button>
`).join('');
flashEl.addEventListener('click', e => {
  const card = e.target.closest('.flip');
  if (!card) return;
  const on = card.classList.toggle('is-flipped');
  card.setAttribute('aria-pressed', on);
});

/* ---------- Header & navigation ---------- */
const header = document.querySelector('.site-header');
const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 30);
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

const toggle = document.querySelector('.nav-toggle');
const nav = document.getElementById('main-nav');
const setNav = open => {
  nav.classList.toggle('is-open', open);
  document.body.classList.toggle('nav-open', open);
  toggle.setAttribute('aria-expanded', open);
  toggle.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
};
toggle.addEventListener('click', () => setNav(!nav.classList.contains('is-open')));
nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setNav(false)));

const navLinks = [...nav.querySelectorAll('a[href^="#"]:not(.btn)')];
const sectionObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    navLinks.forEach(l => l.classList.toggle('is-current', l.getAttribute('href') === '#' + entry.target.id));
  });
}, { rootMargin: '-45% 0px -50% 0px' });
navLinks.forEach(l => {
  const s = document.querySelector(l.getAttribute('href'));
  if (s) sectionObserver.observe(s);
});

/* ---------- Apparition au scroll ---------- */
const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });
document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

/* ---------- Compteurs ---------- */
document.querySelectorAll('[data-count]').forEach(el => {
  const target = +el.dataset.count;
  const suffix = el.dataset.suffix || '';
  const start = performance.now();
  const tick = now => {
    const p = Math.min((now - start) / 1400, 1);
    el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3))) + suffix;
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
});

/* ---------- Formulaire ---------- */
const form = document.getElementById('signup-form');
const formStatus = document.getElementById('form-status');

form.addEventListener('submit', e => {
  e.preventDefault();
  let valid = true;
  form.querySelectorAll('[required]').forEach(input => {
    const ok = input.type === 'email'
      ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value.trim())
      : input.value.trim() !== '';
    input.closest('.field').classList.toggle('has-error', !ok);
    if (!ok) valid = false;
  });

  if (!valid) {
    formStatus.textContent = 'Merci de compléter les champs obligatoires.';
    formStatus.className = 'form-status is-error';
    return;
  }

  /* TODO : brancher l'envoi (Formspree, Netlify Forms, back-end…).
     En attendant, la demande est simplement confirmée à l'écran. */
  const name = form.elements.name.value.trim().split(' ')[0];
  formStatus.textContent = `Merci ${name} ! Votre demande est bien prise en compte, nous revenons vers vous très vite.`;
  formStatus.className = 'form-status is-success';
  form.reset();
});

document.getElementById('year').textContent = new Date().getFullYear();
