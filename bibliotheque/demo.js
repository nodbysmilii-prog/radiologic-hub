/* =========================================================
   RadiologicHub — Bibliothèque : articles du MODE DÉMONSTRATION
   ---------------------------------------------------------
   Utilisés seulement tant que Supabase n'est pas configuré
   (remplacements/config.js vide). Ce sont les 5 articles du test réel :
   métadonnées, accès et licences conformes à leur import réel du
   12/10/2026 (Europe PMC + Unpaywall), liens vers PMC. Licence ouverte :
   appendicite et kyste hydatique (CC BY), recommandations européennes
   (CC BY-NC) ; gratuits avec droits réservés : LI-RADS 2018 et
   pancréatite aiguë. Tags, niveaux, thèmes et Essentiels : EXEMPLES à revoir par
   l'administrateur. Aucun résumé : c'est à l'administrateur de l'écrire.
   ========================================================= */
(function (root) {
  'use strict';
  const pmc = id => `https://pmc.ncbi.nlm.nih.gov/articles/${id}/`;
  (root.RHBib = root.RHBib || {}).demo = [
    {
      id: 'demo-1', doi: '10.1186/s13244-021-01086-3', pmid: '34674054', pmcid: 'PMC8531161',
      titre: 'Predictive ability of CT findings in the differentiation of complicated and uncomplicated appendicitis: a retrospective investigation of 201 patients undergone appendectomy at initial admission',
      premier_auteur: 'Iamwat J', et_al: true, revue: 'Insights Imaging', annee: 2021,
      acces: 'ouvert', licence: 'CC BY', url_texte: pmc('PMC8531161'), source_texte: 'PMC',
      specialite: 'digestif', organes: ['appendice'], modalites: ['scanner'], classifications: [], niveau: 'resident',
      resume: null, statut: 'publie', origine: 'import', publie_le: '2026-10-12T08:00:00Z',
      themes: [{ theme: 'urgences-digestives', essentiel: true, rang: 1 }],
    },
    {
      id: 'demo-2', doi: '10.1148/radiol.2018181494', pmid: '30251931', pmcid: 'PMC6677371',
      titre: 'Liver Imaging Reporting and Data System (LI-RADS) Version 2018: Imaging of Hepatocellular Carcinoma in At-Risk Patients',
      premier_auteur: 'Chernyak V', et_al: true, revue: 'Radiology', annee: 2018,
      acces: 'gratuit', licence: null, url_texte: pmc('PMC6677371'), source_texte: 'PMC',
      specialite: 'digestif', organes: ['foie'], modalites: ['scanner', 'irm', 'echo'], classifications: ['li-rads'], niveau: 'resident',
      resume: null, statut: 'publie', origine: 'import', publie_le: '2026-10-12T08:01:00Z',
      themes: [{ theme: 'foie', essentiel: true, rang: 1 }],
    },
    {
      id: 'demo-3', doi: '10.1186/s13244-019-0805-8', pmid: '31792750', pmcid: 'PMC6889260',
      titre: 'Complications of hepatic echinococcosis: multimodality imaging approach',
      premier_auteur: 'Greco S', et_al: true, revue: 'Insights Imaging', annee: 2019,
      acces: 'ouvert', licence: 'CC BY', url_texte: pmc('PMC6889260'), source_texte: 'PMC',
      specialite: 'digestif', organes: ['foie', 'voies-biliaires'], modalites: ['echo', 'scanner', 'irm'], classifications: [], niveau: 'resident',
      resume: null, statut: 'publie', origine: 'import', publie_le: '2026-10-12T08:02:00Z',
      themes: [{ theme: 'foie', essentiel: true, rang: 2 }],
    },
    {
      id: 'demo-4', doi: '10.1007/s00261-020-02468-9', pmid: '32189022', pmcid: 'PMC7223113',
      titre: 'Reporting of acute pancreatitis by radiologists-time for a systematic change with structured reporting template',
      premier_auteur: 'Khurana A', et_al: true, revue: 'Abdom Radiol (NY)', annee: 2020,
      acces: 'gratuit', licence: null, url_texte: pmc('PMC7223113'), source_texte: 'PMC',
      specialite: 'digestif', organes: ['pancreas'], modalites: ['scanner'], classifications: ['atlanta'], niveau: 'resident',
      resume: null, statut: 'publie', origine: 'import', publie_le: '2026-10-12T08:03:00Z',
      themes: [{ theme: 'pancreas', essentiel: true, rang: 1 }],
    },
    {
      id: 'demo-5', doi: '10.1136/gutjnl-2018-316027', pmid: '29574408', pmcid: 'PMC5890653',
      titre: 'European evidence-based guidelines on pancreatic cystic neoplasms',
      premier_auteur: 'European Study Group on Cystic Tumours of the Pancreas', et_al: false, revue: 'Gut', annee: 2018,
      acces: 'ouvert', licence: 'CC BY-NC', url_texte: pmc('PMC5890653'), source_texte: 'PMC',
      specialite: 'digestif', organes: ['pancreas'], modalites: ['irm', 'scanner'], classifications: [], niveau: 'senior',
      resume: null, statut: 'publie', origine: 'import', publie_le: '2026-10-12T08:04:00Z',
      themes: [{ theme: 'pancreas', essentiel: false, rang: 2 }],
    },
  ];
})(typeof globalThis !== 'undefined' ? globalThis : this);
