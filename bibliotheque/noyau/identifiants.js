/* =========================================================
   RadiologicHub — Bibliothèque : identifiants des articles
   ---------------------------------------------------------
   • Reconnaît un DOI, un PMID ou un PMCID collé tel quel ou sous forme
     d'adresse (doi.org, PubMed, PMC, Europe PMC).
   • Normalise : DOI en minuscules sans préfixe, PMID en chiffres,
     PMCID « PMC » + chiffres.
   • Doublons : deux fiches sont le même article dès qu'elles partagent
     un DOI, un PMID ou un PMCID.
   Partagé par le site, les fonctions serveur et les tests.
   ========================================================= */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else (root.RHBib = root.RHBib || {}).identifiants = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const decoder = s => { try { return decodeURIComponent(s); } catch (e) { return s; } };

  function normaliserDoi(texte) {
    let s = decoder(String(texte || '').trim());
    s = s.replace(/^(?:https?:\/\/)?(?:dx\.)?doi\.org\//i, '').replace(/^doi:\s*/i, '');
    const m = s.match(/10\.\d{4,9}\/\S+/);
    if (!m) return null;
    return m[0].replace(/[.,;:)\]}>"']+$/, '').toLowerCase();
  }

  function normaliserPmid(texte) {
    const s = String(texte || '').trim().replace(/^pmid\s*:?\s*/i, '');
    return /^\d{1,9}$/.test(s) ? String(Number(s)) : null;
  }

  function normaliserPmcid(texte) {
    const m = String(texte || '').trim().match(/^(?:pmcid\s*:?\s*)?pmc\s*(\d{1,9})$/i);
    return m ? 'PMC' + Number(m[1]) : null;
  }

  /* Texte libre → { type: 'doi' | 'pmid' | 'pmcid', valeur } ou null */
  function reconnaitre(texte) {
    const s = decoder(String(texte || '').trim());
    if (!s) return null;
    let m;
    // Adresses connues
    if ((m = s.match(/(?:pmc\.ncbi\.nlm\.nih\.gov\/articles|ncbi\.nlm\.nih\.gov\/pmc\/articles|europepmc\.org\/(?:article|abstract)\/PMC)\/(PMC)?(\d+)/i))) return { type: 'pmcid', valeur: 'PMC' + Number(m[2]) };
    if ((m = s.match(/europepmc\.org\/(?:article|abstract)\/MED\/(\d+)/i))) return { type: 'pmid', valeur: String(Number(m[1])) };
    if ((m = s.match(/pubmed\.ncbi\.nlm\.nih\.gov\/(\d+)/i)) || (m = s.match(/ncbi\.nlm\.nih\.gov\/pubmed\/(\d+)/i))) return { type: 'pmid', valeur: String(Number(m[1])) };
    const doi = normaliserDoi(s);
    if (doi) return { type: 'doi', valeur: doi };
    const pmcid = normaliserPmcid(s);
    if (pmcid) return { type: 'pmcid', valeur: pmcid };
    const pmid = normaliserPmid(s);
    if (pmid) return { type: 'pmid', valeur: pmid };
    return null;
  }

  /* Liste collée (une par ligne, ou séparées par des virgules / points-virgules / espaces)
     → { valides: [{ type, valeur, texte }], invalides: [texte] }, sans répétition */
  function decouperLot(texte) {
    const vus = new Set(), valides = [], invalides = [];
    String(texte || '').split(/[\n\r,;\s]+/).map(t => t.trim()).filter(Boolean).forEach(t => {
      const id = reconnaitre(t);
      if (!id) { invalides.push(t); return; }
      const k = id.type + ':' + id.valeur;
      if (vus.has(k)) return;
      vus.add(k);
      valides.push({ ...id, texte: t });
    });
    return { valides, invalides };
  }

  /* Clés de doublon d'une fiche (DOI, PMID, PMCID normalisés) */
  function cles(article) {
    const a = article || {}, out = [];
    const doi = a.doi && normaliserDoi(a.doi), pmid = a.pmid && normaliserPmid(a.pmid), pmcid = a.pmcid && normaliserPmcid(a.pmcid);
    if (doi) out.push('doi:' + doi);
    if (pmid) out.push('pmid:' + pmid);
    if (pmcid) out.push('pmcid:' + pmcid);
    return out;
  }

  /* Premier article existant qui partage un identifiant avec la fiche (ou null) */
  function trouverDoublon(fiche, existants) {
    const k = new Set(cles(fiche));
    if (!k.size) return null;
    return (existants || []).find(a => cles(a).some(x => k.has(x))) || null;
  }

  const urlPubmed = pmid => (pmid ? `https://pubmed.ncbi.nlm.nih.gov/${pmid}/` : null);
  const urlPmc = pmcid => (pmcid ? `https://pmc.ncbi.nlm.nih.gov/articles/${pmcid}/` : null);
  const urlDoi = doi => (doi ? `https://doi.org/${doi}` : null);

  return { normaliserDoi, normaliserPmid, normaliserPmcid, reconnaitre, decouperLot, cles, trouverDoublon, urlPubmed, urlPmc, urlDoi };
});
