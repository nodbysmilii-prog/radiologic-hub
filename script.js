/* =========================================================
   RadiologicHub — interactions
   Pour ajouter / modifier une masterclass, éditez le tableau COURSES.
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
    id: 'neuro',
    title: 'Neuro-urgences',
    level: 'essentiel',
    duration: '1 journée',
    cases: 25,
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
    id: 'digestif',
    title: 'Urgences digestives',
    level: 'essentiel',
    duration: '1 journée',
    cases: 25,
    summary: "Douleur abdominale aiguë : occlusions, perforations, ischémie mésentérique et pathologies inflammatoires.",
    topics: ['Occlusion', 'Pneumopéritoine', 'Ischémie mésentérique', 'Appendicite', 'Pancréatite'],
    objectives: [
      "Localiser la zone de transition et le mécanisme d'une occlusion",
      "Repérer les signes de souffrance digestive",
      "Diagnostiquer précocement une ischémie mésentérique",
      "Classer une pancréatite aiguë et ses complications"
    ]
  },
  {
    id: 'thorax',
    title: 'Thorax en urgence',
    level: 'essentiel',
    duration: '1 journée',
    cases: 20,
    summary: "Dyspnée et douleur thoracique : embolie pulmonaire, dissection, pneumothorax et infections.",
    topics: ['Embolie pulmonaire', 'Dissection aortique', 'Pneumothorax', 'Pneumopathies', 'OAP'],
    objectives: [
      "Lire un angioscanner thoracique et évaluer le retentissement cardiaque",
      "Classer une dissection aortique (Stanford)",
      "Interpréter les pièges de la radiographie thoracique au lit",
      "Différencier les causes d'opacités alvéolaires aiguës"
    ]
  },
  {
    id: 'trauma',
    title: 'Polytraumatisé',
    level: 'avance',
    duration: '1 journée',
    cases: 20,
    summary: "Le body-scanner du polytraumatisé, de la lecture « primary survey » au compte rendu complet.",
    topics: ['Body-scanner', 'Lésions spléniques', 'Bassin', 'Aorte traumatique', 'Rachis'],
    objectives: [
      "Structurer une lecture en deux temps (immédiate puis exhaustive)",
      "Grader les lésions d'organes pleins (AAST)",
      "Reconnaître un saignement actif et ses implications thérapeutiques",
      "Analyser les fractures du bassin instables"
    ]
  },
  {
    id: 'vasculaire',
    title: 'Urgences vasculaires',
    level: 'avance',
    duration: '1 journée',
    cases: 18,
    summary: "Aorte, hémorragies digestives, ischémies aiguës : l'angioscanner au service de la décision.",
    topics: ['Rupture d\'AAA', 'Hémorragie digestive', 'Ischémie de membre', 'Saignement actif'],
    objectives: [
      "Optimiser les protocoles d'acquisition multiphasiques",
      "Identifier une rupture ou une fissuration d'anévrisme",
      "Localiser une hémorragie digestive avant embolisation",
      "Rédiger un CR utile au radiologue interventionnel"
    ]
  },
  {
    id: 'pediatrie',
    title: 'Pédiatrie d\'urgence',
    level: 'avance',
    duration: '1 journée',
    cases: 22,
    summary: "Les spécificités de l'enfant : invagination, maltraitance, traumatologie et urgences néonatales.",
    topics: ['Invagination', 'Volvulus', 'Maltraitance', 'Fractures de l\'enfant', 'Échographie'],
    objectives: [
      "Utiliser l'échographie en première intention",
      "Reconnaître une invagination intestinale aiguë",
      "Identifier les lésions évocatrices de maltraitance",
      "Connaître les fractures spécifiques de l'enfant"
    ]
  }
];

const LEVEL_LABEL = { essentiel: 'Essentiel', avance: 'Avancé' };

/* ---------- Rendu des cartes ---------- */
const cardsEl = document.getElementById('cards');
cardsEl.innerHTML = COURSES.map(c => `
  <article class="card reveal" data-level="${c.level}">
    <div class="card-top">
      <div class="card-icon">${ICONS[c.id] || ''}</div>
      <span class="tag tag--${c.level}">${LEVEL_LABEL[c.level]}</span>
    </div>
    <h3>${c.title}</h3>
    <p>${c.summary}</p>
    <ul>${c.topics.map(t => `<li>${t}</li>`).join('')}</ul>
    <div class="card-meta">
      <span>${c.duration} · ${c.cases} cas</span>
      <button class="card-link" data-course="${c.id}">Détails →</button>
    </div>
  </article>
`).join('');

/* Liste des masterclass dans le formulaire */
const courseSelect = document.getElementById('course');
COURSES.forEach(c => courseSelect.add(new Option(c.title, c.title)));
courseSelect.add(new Option('Plusieurs / je ne sais pas encore', 'Plusieurs'));

/* ---------- Filtres ---------- */
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
  modalBody.innerHTML = `
    <p class="eyebrow">Masterclass · ${LEVEL_LABEL[c.level]}</p>
    <h3 id="modal-title">${c.title}</h3>
    <p>${c.summary}</p>
    <h4>Objectifs pédagogiques</h4>
    <ul>${c.objectives.map(o => `<li>${o}</li>`).join('')}</ul>
    <h4>Thèmes abordés</h4>
    <p>${c.topics.join(' · ')}</p>
    <h4>Format</h4>
    <p>${c.duration} en live · ${c.cases} cas cliniques · replay inclus</p>
    <a href="#inscription" class="btn btn-primary" data-pick="${c.title}">S'inscrire à cette masterclass</a>
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

/* Pré-sélection de la formule depuis les tarifs */
document.querySelectorAll('[data-plan]').forEach(a => {
  a.addEventListener('click', () => { document.getElementById('plan').value = a.dataset.plan; });
});

/* ---------- Header & navigation ---------- */
const header = document.querySelector('.site-header');
const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 40);
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

/* Lien actif selon la section visible */
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

/* ---------- Compteurs du hero ---------- */
document.querySelectorAll('[data-count]').forEach(el => {
  const target = +el.dataset.count;
  const suffix = el.dataset.suffix || '';
  const start = performance.now();
  const dur = 1400;
  const tick = now => {
    const p = Math.min((now - start) / dur, 1);
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
  formStatus.textContent = `Merci ${name} ! Votre demande a bien été prise en compte, nous revenons vers vous très vite.`;
  formStatus.className = 'form-status is-success';
  form.reset();
});

document.getElementById('year').textContent = new Date().getFullYear();
