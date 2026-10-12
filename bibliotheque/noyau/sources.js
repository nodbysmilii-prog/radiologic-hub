/* =========================================================
   RadiologicHub — Bibliothèque : lecture des sources
   ---------------------------------------------------------
   Europe PMC (métadonnées, licence, présence dans PMC), PubMed
   E-utilities (secours) et Unpaywall (accès libre, licence, meilleur
   lien gratuit à partir du DOI).

   RÈGLE : on ne garde QUE les métadonnées de la liste CHAMPS.
   L'abstract, les figures et le texte de l'article ne sont jamais
   repris : ils sont ignorés dès la lecture (donc jamais mis en cache
   ni enregistrés).
   Partagé par le site, les fonctions serveur et les tests.
   ========================================================= */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./identifiants.js'));
  else (root.RHBib = root.RHBib || {}).sources = factory(root.RHBib.identifiants);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (ID) {
  'use strict';

  /* Champs d'une fiche article (métadonnées uniquement) */
  const CHAMPS = ['doi', 'pmid', 'pmcid', 'titre', 'premier_auteur', 'et_al', 'revue', 'annee', 'licence', 'acces', 'oa_statut', 'url_texte', 'source_texte'];
  /* Informations d'accès, transitoires (servent à calculer acces / url_texte) */
  const ACCES = ['libre', 'url_libre', 'source_libre', 'oa_statut'];

  const texte = s => String(s == null ? '' : s).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  const annee = s => { const m = String(s || '').match(/\b(1[89]\d\d|20\d\d)\b/); return m ? Number(m[1]) : null; };
  const garder = (objet, liste) => {
    const out = {};
    liste.forEach(k => { const v = objet && objet[k]; if (v !== undefined && v !== null && v !== '') out[k] = v; });
    return out;
  };
  const nettoyer = fiche => garder(fiche, CHAMPS);
  const lu = objet => garder(objet, CHAMPS.concat(ACCES));

  /* Licence → « CC BY », « CC BY-NC-ND », « CC0 »… ; null si ce n'est pas une licence ouverte */
  function normaliserLicence(l) {
    const s = String(l || '').toLowerCase().replace(/creative\s*commons/g, 'cc').replace(/attribution/g, 'by')
      .replace(/[_\s]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    if (!s) return null;
    if (/^cc-?(0|zero)\b/.test(s)) return 'CC0';
    if (/^public-?domain/.test(s)) return 'Domaine public';
    const m = s.match(/^cc-?(by(?:-(?:nc|sa|nd))*)/);
    return m ? 'CC ' + m[1].toUpperCase() : null;
  }

  /* « Chernyak V » ; nom de groupe s'il n'y a pas d'auteur individuel */
  const nomCourt = (nom, initiales) => texte(`${nom || ''} ${initiales || ''}`) || null;

  /* ---------- Europe PMC ---------- */
  function urlEuropePmc(id, cfg) {
    const q = id.type === 'doi' ? `DOI:"${id.valeur}"` : id.type === 'pmcid' ? `PMCID:${id.valeur}` : `EXT_ID:${id.valeur} AND SRC:MED`;
    return `${cfg.api.europepmc}/search?query=${encodeURIComponent(q)}&format=json&resultType=core&pageSize=1`;
  }

  function lireEuropePmc(json) {
    const r = json && json.resultList && json.resultList.result && json.resultList.result[0];
    if (!r) return null;
    const auteurs = (r.authorList && r.authorList.author) || [];
    const a0 = auteurs[0];
    let premier = a0 ? (a0.lastName ? nomCourt(a0.lastName, a0.initials) : texte(a0.collectiveName || a0.fullName)) : null;
    let etAl = auteurs.length > 1;
    if (!premier && r.authorString) { premier = texte(r.authorString.split(',')[0]).replace(/\.$/, ''); etAl = r.authorString.includes(','); }
    const urls = (r.fullTextUrlList && r.fullTextUrlList.fullTextUrl) || [];
    const gratuites = urls.filter(u => /^(OA|F)$/.test(u.availabilityCode || ''));
    const urlLibre = gratuites.find(u => u.documentStyle === 'html') || gratuites[0];
    const pmcid = r.pmcid ? ID.normaliserPmcid(r.pmcid) : null;
    const enPmc = !!pmcid && (r.inPMC === 'Y' || r.inEPMC === 'Y');
    const j = (r.journalInfo && r.journalInfo.journal) || {};
    return lu({
      doi: r.doi ? ID.normaliserDoi(r.doi) : null,
      pmid: r.pmid ? ID.normaliserPmid(r.pmid) : null,
      pmcid,
      titre: texte(r.title).replace(/\.$/, ''),
      premier_auteur: premier,
      et_al: premier ? etAl : null,
      revue: texte(j.isoabbreviation || j.medlineAbbreviation || j.title || r.journalTitle),
      annee: annee(r.pubYear || (r.journalInfo && r.journalInfo.yearOfPublication)),
      licence: normaliserLicence(r.license),
      libre: r.isOpenAccess === 'Y' || enPmc || !!urlLibre,
      url_libre: enPmc ? ID.urlPmc(pmcid) : urlLibre ? urlLibre.url : null,
      source_libre: enPmc ? 'PMC' : urlLibre ? (urlLibre.site === 'Europe_PMC' ? 'Europe PMC' : 'Éditeur') : null,
    });
  }

  /* ---------- PubMed E-utilities ---------- */
  const paramsNcbi = cfg => `tool=${encodeURIComponent(cfg.contact.outil)}&email=${encodeURIComponent(cfg.contact.email)}`;
  const urlPubmedRecherche = (terme, cfg, { max = 20, depuis } = {}) =>
    `${cfg.api.eutils}/esearch.fcgi?db=pubmed&retmode=json&retmax=${max}&term=${encodeURIComponent(terme)}${depuis ? `&datetype=edat&mindate=${depuis}&maxdate=3000` : ''}&${paramsNcbi(cfg)}`;
  const urlPubmedResume = (pmids, cfg) => `${cfg.api.eutils}/esummary.fcgi?db=pubmed&retmode=json&id=${pmids.join(',')}&${paramsNcbi(cfg)}`;
  const lirePubmedRecherche = json => ((json && json.esearchresult && json.esearchresult.idlist) || []).map(String);

  function lirePubmedResume(json, pmid) {
    const r = json && json.result && json.result[String(pmid)];
    if (!r || r.error) return null;
    const ids = {};
    (r.articleids || []).forEach(x => { ids[x.idtype] = x.value; });
    const auteurs = (r.authors || []).filter(a => a && a.name);
    const a0 = auteurs.find(a => a.authtype === 'Author') || auteurs[0];
    return lu({
      doi: ids.doi ? ID.normaliserDoi(ids.doi) : null,
      pmid: ID.normaliserPmid(r.uid || pmid),
      pmcid: ids.pmc ? ID.normaliserPmcid(ids.pmc) : null,
      titre: texte(r.title).replace(/\.$/, ''),
      premier_auteur: a0 ? texte(a0.name) : null,
      et_al: a0 ? auteurs.length > 1 : null,
      revue: texte(r.source || r.fulljournalname),
      annee: annee(r.pubdate || r.epubdate),
      // PubMed n'indique ni la licence ni l'accès : la présence dans PMC suffit pour la lecture gratuite
      libre: ids.pmc ? true : null,
      url_libre: ids.pmc ? ID.urlPmc(ID.normaliserPmcid(ids.pmc)) : null,
      source_libre: ids.pmc ? 'PMC' : null,
    });
  }

  /* ---------- Unpaywall ---------- */
  const urlUnpaywall = (doi, cfg) => `${cfg.api.unpaywall}/${encodeURIComponent(doi)}?email=${encodeURIComponent(cfg.contact.email)}`;

  function lireUnpaywall(json) {
    if (!json || !json.doi) return null;
    const best = json.best_oa_location || null;
    const z = (json.z_authors || []).filter(a => a && (a.family || a.name));
    const a0 = z.find(a => a.sequence === 'first') || z[0];
    const initiales = a0 && a0.given ? a0.given.split(/[\s-]+/).filter(Boolean).map(p => p[0].toUpperCase()).join('') : '';
    return lu({
      doi: ID.normaliserDoi(json.doi),
      titre: texte(json.title).replace(/\.$/, ''),
      premier_auteur: a0 ? (a0.family ? nomCourt(a0.family, initiales) : texte(a0.name)) : null,
      et_al: a0 ? z.length > 1 : null,
      revue: texte(json.journal_name),
      annee: annee(json.year || json.published_date),
      licence: best ? normaliserLicence(best.license) : null,
      oa_statut: json.oa_status || null,                       // gold, hybrid, green, bronze, closed
      libre: !!json.is_oa,
      url_libre: best ? best.url_for_landing_page || best.url : null,
      source_libre: best ? (best.host_type === 'repository' ? 'Dépôt en accès libre' : 'Éditeur') : null,
    });
  }

  /* ---------- Fusion des sources → fiche ----------
     Métadonnées : Europe PMC, puis PubMed, puis Unpaywall.
     Licence : Europe PMC, sinon Unpaywall.
     Lien gratuit : PMC en priorité (stable), sinon le meilleur lien Unpaywall, sinon Europe PMC.
     acces : « ouvert » (licence ouverte), « gratuit » (lecture gratuite, licence non ouverte),
             « a_verifier » (gratuit selon une seule source, licence inconnue) ; null = pas gratuit. */
  function fusionner({ europepmc = null, pubmed = null, unpaywall = null } = {}) {
    const S = [europepmc, pubmed, unpaywall].filter(Boolean);
    if (!S.length) return null;
    const premier = k => { for (const s of S) if (s[k] !== undefined) return s[k]; return null; };
    const fiche = {};
    ['doi', 'pmid', 'pmcid', 'titre', 'premier_auteur', 'et_al', 'revue', 'annee'].forEach(k => { fiche[k] = premier(k); });
    fiche.licence = (europepmc && europepmc.licence) || (unpaywall && unpaywall.licence) || null;
    fiche.oa_statut = (unpaywall && unpaywall.oa_statut) || null;
    const pmc = S.find(s => s.source_libre === 'PMC' && s.url_libre);
    const autre = (unpaywall && unpaywall.libre && unpaywall.url_libre ? unpaywall : null) || S.find(s => s.libre && s.url_libre);
    const lien = pmc || autre;
    const libre = S.some(s => s.libre === true);
    fiche.url_texte = lien ? lien.url_libre : null;
    fiche.source_texte = lien ? lien.source_libre : null;
    if (!libre || !fiche.url_texte) fiche.acces = null;
    else if (fiche.licence) fiche.acces = 'ouvert';
    else if (unpaywall || (europepmc && europepmc.libre)) fiche.acces = 'gratuit';
    else fiche.acces = 'a_verifier';
    return nettoyer(fiche);
  }

  return {
    CHAMPS, nettoyer, normaliserLicence,
    urlEuropePmc, lireEuropePmc,
    urlPubmedRecherche, urlPubmedResume, lirePubmedRecherche, lirePubmedResume,
    urlUnpaywall, lireUnpaywall,
    fusionner,
  };
});
