/* =========================================================
   RadiologicHub — Bibliothèque : CONFIGURATION
   ---------------------------------------------------------
   C'est le SEUL fichier à modifier pour ajouter une sous-spécialité,
   un organe, une classification, un thème ou une requête de veille :
   les pages, les filtres, les formulaires de l'administration et la
   veille sont construits à partir de lui (aucun code à toucher).

   • contact      : adresse e-mail et nom d'outil transmis à Unpaywall
                    (obligatoire) et aux E-utilities de PubMed (demandé).
   • specialites  : les 10 sous-spécialités (toutes prévues dès la V1).
   • organes      : organes / régions, par sous-spécialité.
   • modalites, classifications, niveaux : listes de tags.
   • themes       : un thème = une page (bibliotheque.html#theme=<id>).
                    actif: false → le thème n'apparaît pas encore.
                    requetes : utilisées par la veille hebdomadaire
                    (étape 4) ; le filtre « accès libre » est ajouté
                    automatiquement, inutile de l'écrire ici.
   • comptesRendus : articles associés aux modèles et outils de la page
                    Comptes rendus (étape 5).

   Identifiants (id) : minuscules, sans accent ni espace ; ne jamais
   changer l'id d'un élément déjà utilisé (les articles s'y réfèrent).
   Partagé par le site, les fonctions serveur et les tests.
   ========================================================= */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.RH_BIB_CONFIG = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  return {
    contact: {
      email: 'radiologichub@gmail.com',
      outil: 'RadiologicHub',
    },

    api: {
      europepmc: 'https://www.ebi.ac.uk/europepmc/webservices/rest',
      eutils: 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils',
      unpaywall: 'https://api.unpaywall.org/v2',
      doi: 'https://doi.org',
      // Débit maximal, en requêtes par seconde et par service (limites publiées ou prudentes)
      debits: {
        'www.ebi.ac.uk': 5,
        'eutils.ncbi.nlm.nih.gov': 3,   // 3/s sans clé API PubMed (10/s avec une clé)
        'api.unpaywall.org': 5,         // et 100 000 par jour au plus
        'doi.org': 2,
      },
      // Durée de conservation des réponses en cache, en jours
      cacheJours: { recherche: 7, article: 30 },
    },

    specialites: [
      { id: 'digestif', label: 'Digestif', couleur: 'var(--amber)' },
      { id: 'sein', label: 'Sein', couleur: 'var(--crimson)' },
      { id: 'msk', label: 'Ostéo-articulaire (MSK)', couleur: 'var(--plum)' },
      { id: 'neuro', label: 'Neuro', couleur: 'var(--purple)' },
      { id: 'orl', label: 'ORL / tête et cou', couleur: 'var(--gold)' },
      { id: 'thorax', label: 'Thorax', couleur: 'var(--blue)' },
      { id: 'uro', label: 'Uro-génital', couleur: 'var(--steel)' },
      { id: 'pediatrie', label: 'Pédiatrie', couleur: 'var(--green)' },
      { id: 'cardio', label: 'Cardio-vasculaire', couleur: 'var(--teal)' },
      { id: 'interventionnel', label: 'Interventionnel', couleur: 'var(--slate)' },
    ],

    organes: {
      digestif: [
        { id: 'foie', label: 'Foie' },
        { id: 'voies-biliaires', label: 'Vésicule et voies biliaires' },
        { id: 'pancreas', label: 'Pancréas' },
        { id: 'rate', label: 'Rate' },
        { id: 'oesophage-estomac', label: 'Œsophage et estomac' },
        { id: 'grele', label: 'Intestin grêle' },
        { id: 'colon-rectum', label: 'Côlon et rectum' },
        { id: 'appendice', label: 'Appendice' },
        { id: 'peritoine', label: 'Péritoine et mésentère' },
        { id: 'paroi-abdominale', label: 'Paroi abdominale et hernies' },
        { id: 'vaisseaux-digestifs', label: 'Vaisseaux digestifs' },
      ],
      sein: [
        { id: 'sein', label: 'Sein' },
        { id: 'aisselle', label: 'Creux axillaire' },
      ],
      msk: [
        { id: 'epaule', label: 'Épaule' }, { id: 'coude', label: 'Coude' }, { id: 'poignet-main', label: 'Poignet et main' },
        { id: 'hanche-bassin', label: 'Hanche et bassin' }, { id: 'genou', label: 'Genou' }, { id: 'cheville-pied', label: 'Cheville et pied' },
        { id: 'rachis', label: 'Rachis' }, { id: 'muscles', label: 'Muscles et tendons' }, { id: 'os', label: 'Os (tumeurs, infections)' },
      ],
      neuro: [
        { id: 'encephale', label: 'Encéphale' }, { id: 'vaisseaux-cerebraux', label: 'Vaisseaux cérébraux' },
        { id: 'moelle', label: 'Moelle épinière' }, { id: 'nerfs-craniens', label: 'Nerfs crâniens' },
      ],
      orl: [
        { id: 'thyroide', label: 'Thyroïde' }, { id: 'glandes-salivaires', label: 'Glandes salivaires' },
        { id: 'sinus', label: 'Sinus et fosses nasales' }, { id: 'larynx-pharynx', label: 'Larynx et pharynx' },
        { id: 'oreille', label: 'Oreille et rocher' }, { id: 'orbite', label: 'Orbite' }, { id: 'cou', label: 'Espaces du cou et ganglions' },
      ],
      thorax: [
        { id: 'poumon', label: 'Poumon' }, { id: 'plevre', label: 'Plèvre' }, { id: 'mediastin', label: 'Médiastin' },
        { id: 'arteres-pulmonaires', label: 'Artères pulmonaires' }, { id: 'paroi-thoracique', label: 'Paroi thoracique' },
      ],
      uro: [
        { id: 'rein', label: 'Rein' }, { id: 'surrenale', label: 'Surrénale' }, { id: 'vessie', label: 'Vessie et voies urinaires' },
        { id: 'prostate', label: 'Prostate' }, { id: 'testicule', label: 'Testicule et scrotum' },
        { id: 'uterus', label: 'Utérus' }, { id: 'ovaire', label: 'Ovaire et annexes' }, { id: 'pelvis', label: 'Pelvis (dont endométriose)' },
      ],
      pediatrie: [
        { id: 'pediatrie-neuro', label: 'Neuro-pédiatrie' }, { id: 'pediatrie-digestif', label: 'Digestif de l\'enfant' },
        { id: 'pediatrie-osseux', label: 'Os et articulations de l\'enfant' }, { id: 'pediatrie-thorax', label: 'Thorax de l\'enfant' },
        { id: 'pediatrie-uro', label: 'Appareil urinaire de l\'enfant' },
      ],
      cardio: [
        { id: 'coeur', label: 'Cœur' }, { id: 'coronaires', label: 'Coronaires' }, { id: 'aorte', label: 'Aorte' },
        { id: 'arteres-peripheriques', label: 'Artères périphériques' }, { id: 'veines', label: 'Veines' },
      ],
      interventionnel: [
        { id: 'biopsie-drainage', label: 'Biopsies et drainages' }, { id: 'embolisation', label: 'Embolisation' },
        { id: 'ablation', label: 'Ablation tumorale' }, { id: 'vasculaire-interventionnel', label: 'Vasculaire interventionnel' },
      ],
    },

    modalites: [
      { id: 'echo', label: 'Échographie' },
      { id: 'scanner', label: 'Scanner' },
      { id: 'irm', label: 'IRM' },
      { id: 'radio', label: 'Radiographie' },
      { id: 'mammographie', label: 'Mammographie' },
    ],

    // specialite : où la classification est proposée en premier (null = toutes)
    classifications: [
      { id: 'li-rads', label: 'LI-RADS', specialite: 'digestif' },
      { id: 'atlanta', label: 'Atlanta révisée (pancréatite)', specialite: 'digestif' },
      { id: 'ctsi', label: 'CTSI / Balthazar', specialite: 'digestif' },
      { id: 'oms-iwge', label: 'OMS-IWGE (kyste hydatique)', specialite: 'digestif' },
      { id: 'gharbi', label: 'Gharbi (kyste hydatique)', specialite: 'digestif' },
      { id: 'bi-rads', label: 'BI-RADS', specialite: 'sein' },
      { id: 'pi-rads', label: 'PI-RADS', specialite: 'uro' },
      { id: 'o-rads', label: 'O-RADS', specialite: 'uro' },
      { id: 'bosniak', label: 'Bosniak', specialite: 'uro' },
      { id: 'figo', label: 'FIGO', specialite: 'uro' },
      { id: 'eu-tirads', label: 'EU-TIRADS', specialite: 'orl' },
      { id: 'fleischner', label: 'Fleischner', specialite: 'thorax' },
      { id: 'cad-rads', label: 'CAD-RADS', specialite: 'cardio' },
      { id: 'lake-louise', label: 'Lake Louise', specialite: 'cardio' },
      { id: 'munich', label: 'Munich (lésions musculaires)', specialite: 'msk' },
      { id: 'bamic', label: 'BAMIC', specialite: 'msk' },
      { id: 'recist', label: 'RECIST', specialite: null },
      { id: 'lugano', label: 'Lugano', specialite: null },
    ],

    niveaux: [
      { id: 'etudiant', label: 'Étudiant' },
      { id: 'resident', label: 'Résident' },
      { id: 'senior', label: 'Senior' },
    ],

    // Accès au texte intégral (calculé à l'import, modifiable par l'administrateur)
    acces: [
      { id: 'ouvert', label: 'Licence ouverte' },                          // CC BY, CC BY-NC…
      { id: 'gratuit', label: 'Gratuit – licence non ouverte' },           // lecture gratuite, droits réservés
      { id: 'a_verifier', label: 'Licence à vérifier' },
    ],

    themes: [
      {
        id: 'urgences-digestives',
        specialite: 'digestif',
        titre: 'Urgences digestives',
        description: 'Appendicite, occlusion, perforation, diverticulite, ischémie mésentérique, cholécystite.',
        actif: true,
        tags: { organes: ['appendice', 'grele', 'colon-rectum', 'voies-biliaires', 'peritoine'], modalites: ['scanner', 'echo'] },
        requetes: [
          { id: 'appendicite', source: 'europepmc', q: '(TITLE:"appendicitis") AND (TITLE_ABS:"computed tomography" OR TITLE_ABS:"ultrasound" OR TITLE_ABS:"imaging")' },
          { id: 'occlusion', source: 'europepmc', q: '(TITLE:"bowel obstruction") AND (TITLE_ABS:"computed tomography" OR TITLE_ABS:"imaging")' },
          { id: 'perforation', source: 'europepmc', q: '(TITLE:"perforation" OR TITLE:"pneumoperitoneum") AND (TITLE_ABS:"computed tomography") AND (TITLE_ABS:"gastrointestinal" OR TITLE_ABS:"bowel")' },
          { id: 'ischemie', source: 'pubmed', q: '"mesenteric ischemia"[tiab] AND (tomography, x-ray computed[mh] OR "CT angiography"[tiab])' },
          { id: 'diverticulite', source: 'pubmed', q: 'diverticulitis[ti] AND (tomography, x-ray computed[mh] OR imaging[tiab])' },
        ],
      },
      {
        id: 'foie',
        specialite: 'digestif',
        titre: 'Foie',
        description: 'LI-RADS et carcinome hépatocellulaire, lésions focales, kyste hydatique.',
        actif: true,
        tags: { organes: ['foie'], modalites: ['scanner', 'irm', 'echo'], classifications: ['li-rads'] },
        requetes: [
          { id: 'li-rads', source: 'europepmc', q: '(TITLE:"LI-RADS" OR TITLE:"Liver Imaging Reporting and Data System")' },
          { id: 'kyste-hydatique', source: 'europepmc', q: '(TITLE:"hydatid" OR TITLE:"echinococcosis") AND (TITLE_ABS:"liver" OR TITLE_ABS:"hepatic") AND (TITLE_ABS:"imaging" OR TITLE_ABS:"ultrasound" OR TITLE_ABS:"computed tomography" OR TITLE_ABS:"MRI")' },
          { id: 'lesions-focales', source: 'pubmed', q: '"focal liver lesions"[tiab] AND (magnetic resonance imaging[mh] OR "contrast-enhanced ultrasound"[tiab])' },
        ],
      },
      {
        id: 'pancreas',
        specialite: 'digestif',
        titre: 'Pancréas',
        description: 'Pancréatite aiguë (classification d\'Atlanta révisée), lésions kystiques du pancréas.',
        actif: true,
        tags: { organes: ['pancreas'], modalites: ['scanner', 'irm'] },
        requetes: [
          { id: 'pancreatite-aigue', source: 'europepmc', q: '(TITLE:"acute pancreatitis") AND (TITLE_ABS:"computed tomography" OR TITLE_ABS:"imaging" OR TITLE_ABS:"Atlanta")' },
          { id: 'kystes-pancreas', source: 'europepmc', q: '(TITLE:"pancreatic cyst" OR TITLE:"pancreatic cystic" OR TITLE:"IPMN" OR TITLE:"intraductal papillary mucinous")' },
          { id: 'kystes-pancreas-pubmed', source: 'pubmed', q: '"pancreatic cystic neoplasms"[tiab] AND (magnetic resonance imaging[mh] OR tomography, x-ray computed[mh])' },
        ],
      },
    ],

    // Étape 5 : modèle ou outil de la page Comptes rendus → articles associés
    comptesRendus: {},
  };
});
