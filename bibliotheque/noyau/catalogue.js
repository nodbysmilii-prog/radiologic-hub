/* =========================================================
   RadiologicHub — Bibliothèque : catalogue
   ---------------------------------------------------------
   • Recherche par mots-clés (sans accents ni majuscules ; tous les mots
     doivent être trouvés) et filtres combinables : ET entre les filtres,
     OU entre les valeurs d'un même filtre.
   • Page thème : les « Essentiels » d'abord, dans l'ordre de lecture
     conseillé, puis les autres (rang, puis plus récents).
   • Affichage : « Premier auteur et al. », liens, badge d'accès.
   • Validation d'une fiche et de la configuration (mêmes règles que la base).
   Article : { id, doi, pmid, pmcid, titre, premier_auteur, et_al, revue,
   annee, licence, acces, url_texte, source_texte, specialite, organes[],
   modalites[], classifications[], niveau, resume, statut,
   themes: [{ theme, essentiel, rang }] }
   ========================================================= */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./identifiants.js'));
  else (root.RHBib = root.RHBib || {}).catalogue = factory(root.RHBib.identifiants);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (ID) {
  'use strict';

  const RESUME_MAX = 400;
  const DIMENSIONS = ['organes', 'modalites', 'classifications'];
  const normaliser = s => String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const liste = v => (Array.isArray(v) ? v : v == null || v === '' ? [] : [v]);
  const labelDe = (items, id) => { const x = (items || []).find(i => i.id === id); return x ? x.label : id; };
  const tousOrganes = cfg => Object.values(cfg.organes || {}).flat();

  /* Texte cherché : métadonnées, résumé, libellés des tags et des thèmes */
  function texteRecherche(a, cfg) {
    const themes = liste(a.themes).map(t => labelDe((cfg.themes || []).map(x => ({ id: x.id, label: x.titre })), t.theme));
    return normaliser([
      a.titre, a.premier_auteur, a.revue, a.annee, a.resume, a.doi, a.pmid, a.pmcid, a.licence,
      ...liste(a.organes).map(o => labelDe(tousOrganes(cfg), o)),
      ...liste(a.modalites).map(m => labelDe(cfg.modalites, m)),
      ...liste(a.classifications).map(c => labelDe(cfg.classifications, c)),
      labelDe(cfg.specialites, a.specialite), labelDe(cfg.niveaux, a.niveau), ...themes,
    ].join(' '));
  }

  const essentielDans = (a, theme) => liste(a.themes).some(t => t.essentiel && (!theme || t.theme === theme));

  /* criteres : { q, specialite, theme, organes[], modalites[], classifications[], niveau[], essentiel, acces[], anneeMin } */
  function filtrer(articles, criteres, cfg) {
    const c = criteres || {};
    const mots = normaliser(c.q).split(/[^a-z0-9.-]+/).filter(m => m.length > 1);
    return (articles || []).filter(a => {
      if (c.specialite && a.specialite !== c.specialite) return false;
      if (c.theme && !liste(a.themes).some(t => t.theme === c.theme)) return false;
      for (const d of DIMENSIONS) {
        const voulu = liste(c[d]);
        if (voulu.length && !voulu.some(v => liste(a[d]).includes(v))) return false;
      }
      if (liste(c.niveau).length && !liste(c.niveau).includes(a.niveau)) return false;
      if (liste(c.acces).length && !liste(c.acces).includes(a.acces)) return false;
      if (c.essentiel && !essentielDans(a, c.theme)) return false;
      if (c.anneeMin && !(Number(a.annee) >= Number(c.anneeMin))) return false;
      if (mots.length) {
        const t = texteRecherche(a, cfg);
        if (!mots.every(m => t.includes(m))) return false;
      }
      return true;
    });
  }

  const parTitre = (x, y) => normaliser(x.titre).localeCompare(normaliser(y.titre));
  const plusRecent = (x, y) => (Number(y.annee) || 0) - (Number(x.annee) || 0) || parTitre(x, y);

  /* Page thème : Essentiels (par rang), puis les autres (rang s'il existe, puis plus récents) */
  function trierPourTheme(articles, theme) {
    const lien = a => liste(a.themes).find(t => t.theme === theme) || {};
    const rang = a => (Number.isFinite(Number(lien(a).rang)) && lien(a).rang !== null && lien(a).rang !== '' ? Number(lien(a).rang) : Infinity);
    return (articles || []).slice().sort((x, y) => {
      const ex = lien(x).essentiel ? 0 : 1, ey = lien(y).essentiel ? 0 : 1;
      return ex - ey || rang(x) - rang(y) || plusRecent(x, y);
    });
  }

  /* Résultats de recherche : Essentiels d'abord, puis plus récents */
  const trierResultats = articles => (articles || []).slice().sort((x, y) => (essentielDans(y) ? 1 : 0) - (essentielDans(x) ? 1 : 0) || plusRecent(x, y));

  /* ---------- Affichage ---------- */
  const auteurs = a => (a.premier_auteur ? `${a.premier_auteur}${a.et_al ? ' et al.' : ''}` : 'Auteurs non précisés');
  const reference = a => [auteurs(a), a.revue, a.annee].filter(Boolean).join(' · ');

  function liens(a) {
    const out = [];
    if (a.url_texte) out.push({ type: 'texte', url: a.url_texte, label: `Texte intégral gratuit${a.source_texte ? ` (${a.source_texte})` : ''}` });
    if (a.pmid) out.push({ type: 'pubmed', url: ID.urlPubmed(a.pmid), label: 'PubMed' });
    if (a.doi) out.push({ type: 'doi', url: ID.urlDoi(a.doi), label: 'DOI' });
    return out;
  }

  function badgeAcces(a) {
    if (a.acces === 'ouvert') return { classe: 'is-ouvert', label: a.licence || 'Licence ouverte', titre: 'Article sous licence ouverte' };
    if (a.acces === 'gratuit') return { classe: 'is-gratuit', label: 'Gratuit – licence non ouverte', titre: 'Lecture gratuite, droits réservés à l\'éditeur' };
    return { classe: 'is-verifier', label: 'Licence à vérifier', titre: 'Licence non encore vérifiée' };
  }

  /* ---------- Adresse partageable (#q=…&modalites=irm,scanner) ---------- */
  const CLES = ['q', 'specialite', 'theme', 'organes', 'modalites', 'classifications', 'niveau', 'acces', 'essentiel', 'anneeMin'];
  const MULTIPLES = ['organes', 'modalites', 'classifications', 'niveau', 'acces'];
  function criteresDepuisAdresse(hash) {
    const p = new URLSearchParams(String(hash || '').replace(/^#/, ''));
    const c = {};
    CLES.forEach(k => {
      const v = p.get(k);
      if (v == null || v === '') return;
      c[k] = MULTIPLES.includes(k) ? v.split(',').filter(Boolean) : k === 'essentiel' ? v === '1' : v;
    });
    return c;
  }
  function adresseDepuisCriteres(c) {
    const p = new URLSearchParams();
    CLES.forEach(k => {
      const v = c && c[k];
      if (v == null || v === '' || v === false || (Array.isArray(v) && !v.length)) return;
      p.set(k, Array.isArray(v) ? v.join(',') : v === true ? '1' : String(v));
    });
    return p.toString();
  }

  /* ---------- Validation d'une fiche (mêmes règles que la base) ---------- */
  function validerArticle(a, cfg) {
    const e = [];
    const ids = (items) => new Set((items || []).map(i => i.id));
    if (!a.titre || !String(a.titre).trim()) e.push('Titre manquant.');
    if (!a.doi && !a.pmid) e.push('Il faut au moins un DOI ou un PMID.');
    if (a.doi && !ID.normaliserDoi(a.doi)) e.push('DOI invalide.');
    if (a.pmid && !ID.normaliserPmid(a.pmid)) e.push('PMID invalide.');
    if (a.pmcid && !ID.normaliserPmcid(a.pmcid)) e.push('PMCID invalide.');
    if (!a.url_texte || !/^https:\/\//.test(a.url_texte)) e.push('Lien vers le texte intégral gratuit manquant (adresse https://…).');
    if (!ids(cfg.acces).has(a.acces)) e.push('Accès inconnu.');
    if (a.annee && !(Number(a.annee) >= 1900 && Number(a.annee) <= 2100)) e.push('Année invalide.');
    if (a.resume && String(a.resume).length > RESUME_MAX) e.push(`Résumé trop long (${String(a.resume).length} caractères, ${RESUME_MAX} au plus).`);
    if (a.specialite && !ids(cfg.specialites).has(a.specialite)) e.push(`Sous-spécialité inconnue : ${a.specialite}.`);
    if (a.niveau && !ids(cfg.niveaux).has(a.niveau)) e.push(`Niveau inconnu : ${a.niveau}.`);
    const organes = ids(tousOrganes(cfg));
    liste(a.organes).forEach(o => { if (!organes.has(o)) e.push(`Organe inconnu : ${o}.`); });
    liste(a.modalites).forEach(m => { if (!ids(cfg.modalites).has(m)) e.push(`Modalité inconnue : ${m}.`); });
    liste(a.classifications).forEach(c => { if (!ids(cfg.classifications).has(c)) e.push(`Classification inconnue : ${c}.`); });
    const themes = ids(cfg.themes);
    liste(a.themes).forEach(t => {
      if (!themes.has(t.theme)) e.push(`Thème inconnu : ${t.theme}.`);
      if (t.rang != null && t.rang !== '' && !(Number.isInteger(Number(t.rang)) && Number(t.rang) >= 1)) e.push('Le rang de lecture est un entier ≥ 1.');
    });
    if (a.statut === 'publie') {
      if (!a.specialite) e.push('Choisissez la sous-spécialité avant de publier.');
      if (!liste(a.themes).length) e.push('Rattachez l\'article à au moins un thème avant de publier.');
      if (!a.niveau) e.push('Choisissez le niveau avant de publier.');
    }
    return e;
  }

  /* ---------- Validation de la configuration (tests) ---------- */
  function validerConfig(cfg) {
    const e = [];
    const unique = (items, nom) => {
      const vus = new Set();
      (items || []).forEach(i => {
        if (!i || !/^[a-z0-9-]+$/.test(i.id || '')) e.push(`${nom} : identifiant invalide « ${i && i.id} ».`);
        else if (vus.has(i.id)) e.push(`${nom} : identifiant en double « ${i.id} ».`);
        vus.add(i && i.id);
      });
      return vus;
    };
    if (!cfg.contact || !/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(cfg.contact.email || '')) e.push('contact.email manquant ou invalide.');
    if (!cfg.contact || !cfg.contact.outil) e.push('contact.outil manquant.');
    const spe = unique(cfg.specialites, 'specialites');
    Object.keys(cfg.organes || {}).forEach(s => { if (!spe.has(s)) e.push(`organes : sous-spécialité inconnue « ${s} ».`); });
    unique(tousOrganes(cfg), 'organes');
    const mod = unique(cfg.modalites, 'modalites');
    const cla = unique(cfg.classifications, 'classifications');
    (cfg.classifications || []).forEach(c => { if (c.specialite && !spe.has(c.specialite)) e.push(`classification ${c.id} : sous-spécialité inconnue.`); });
    unique(cfg.niveaux, 'niveaux');
    unique(cfg.themes, 'themes');
    const org = new Set(tousOrganes(cfg).map(o => o.id));
    (cfg.themes || []).forEach(t => {
      if (!spe.has(t.specialite)) e.push(`thème ${t.id} : sous-spécialité inconnue « ${t.specialite} ».`);
      if (!t.titre) e.push(`thème ${t.id} : titre manquant.`);
      const tags = t.tags || {};
      liste(tags.organes).forEach(o => { if (!org.has(o)) e.push(`thème ${t.id} : organe inconnu « ${o} ».`); });
      liste(tags.modalites).forEach(m => { if (!mod.has(m)) e.push(`thème ${t.id} : modalité inconnue « ${m} ».`); });
      liste(tags.classifications).forEach(c => { if (!cla.has(c)) e.push(`thème ${t.id} : classification inconnue « ${c} ».`); });
      const rq = new Set();
      liste(t.requetes).forEach(r => {
        if (!['europepmc', 'pubmed'].includes(r.source)) e.push(`thème ${t.id} : source inconnue « ${r.source} ».`);
        if (!r.q || !String(r.q).trim()) e.push(`thème ${t.id} : requête vide.`);
        if (!r.id || rq.has(r.id)) e.push(`thème ${t.id} : identifiant de requête manquant ou en double.`);
        rq.add(r.id);
      });
      if (t.actif && !liste(t.requetes).length) e.push(`thème ${t.id} : actif mais sans requête.`);
    });
    return e;
  }

  /* Valeurs proposées dans les filtres pour une sous-spécialité (toutes si aucune) */
  function vocabulaire(cfg, specialite) {
    return {
      organes: specialite ? (cfg.organes[specialite] || []) : tousOrganes(cfg),
      modalites: cfg.modalites,
      classifications: specialite ? cfg.classifications.filter(c => !c.specialite || c.specialite === specialite) : cfg.classifications,
      niveaux: cfg.niveaux,
      acces: cfg.acces,
      themes: (cfg.themes || []).filter(t => t.actif && (!specialite || t.specialite === specialite)),
    };
  }

  return {
    RESUME_MAX, normaliser, filtrer, trierPourTheme, trierResultats, essentielDans,
    auteurs, reference, liens, badgeAcces, labelDe, tousOrganes, vocabulaire,
    criteresDepuisAdresse, adresseDepuisCriteres, validerArticle, validerConfig,
  };
});
