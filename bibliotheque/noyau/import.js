/* =========================================================
   RadiologicHub — Bibliothèque : import par DOI / PMID / PMCID
   ---------------------------------------------------------
   importer(texte)    → fiche pré-remplie (métadonnées, liens, licence)
   importerLot(texte) → rapport : créés, doublons, introuvables,
                        sans texte gratuit, identifiants invalides
   Ordre : Europe PMC (métadonnées, licence, PMC) ; PubMed si Europe PMC
   ne connaît pas l'article ; Unpaywall dès qu'on a un DOI (accès libre,
   licence, meilleur lien). Rien n'est publié : la fiche part « à valider ».
   ========================================================= */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./identifiants.js'), require('./sources.js'));
  else (root.RHBib = root.RHBib || {}).import = factory(root.RHBib.identifiants, root.RHBib.sources);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (ID, S) {
  'use strict';

  const MESSAGES = {
    identifiant_invalide: 'Identifiant non reconnu : collez un DOI (10.…), un PMID (chiffres), un PMCID (PMC…) ou leur adresse.',
    introuvable: 'Article introuvable dans Europe PMC, PubMed et Unpaywall.',
    non_libre: 'Pas de texte intégral gratuit trouvé : l\'article n\'est pas en accès libre.',
    service_indisponible: 'Services de recherche injoignables : réessayez plus tard.',
  };

  async function obtenir(url, lire, { client, cache, jours }) {
    if (cache) {
      const c = await cache.lire(url);
      if (c !== undefined) return c;
    }
    const json = await client.json(url);
    const valeur = json ? lire(json) : null;          // réponse réduite aux métadonnées avant tout stockage
    if (cache) await cache.ecrire(url, valeur, jours);
    return valeur;
  }

  async function importer(texte, { client, cache = null, config }) {
    const id = ID.reconnaitre(texte);
    if (!id) return { ok: false, code: 'identifiant_invalide', message: MESSAGES.identifiant_invalide };
    const jours = config.api.cacheJours.article;
    const o = { client, cache, jours };
    const avertissements = [], sources = [];
    let pannes = 0, appels = 0;
    const essayer = async (nom, fn) => {
      appels++;
      try { return await fn(); } catch (e) { pannes++; avertissements.push(`${nom} indisponible (${e.message}).`); return null; }
    };

    const europepmc = await essayer('Europe PMC', () => obtenir(S.urlEuropePmc(id, config), S.lireEuropePmc, o));
    if (europepmc) sources.push('Europe PMC');

    let pubmed = null;
    if (!europepmc) {
      pubmed = await essayer('PubMed', async () => {
        let pmid = id.type === 'pmid' ? id.valeur : null;
        if (!pmid) {
          const terme = id.type === 'doi' ? `"${id.valeur}"[doi]` : `${id.valeur}[pmcid]`;
          const ids = await obtenir(S.urlPubmedRecherche(terme, config, { max: 1 }), S.lirePubmedRecherche, o);
          pmid = ids && ids[0];
        }
        return pmid ? obtenir(S.urlPubmedResume([pmid], config), json => S.lirePubmedResume(json, pmid), o) : null;
      });
      if (pubmed) sources.push('PubMed');
    }

    const doi = (europepmc && europepmc.doi) || (pubmed && pubmed.doi) || (id.type === 'doi' ? id.valeur : null);
    let unpaywall = null;
    if (doi) {
      unpaywall = await essayer('Unpaywall', () => obtenir(S.urlUnpaywall(doi, config), S.lireUnpaywall, o));
      if (unpaywall) sources.push('Unpaywall');
    }

    const fiche = S.fusionner({ europepmc, pubmed, unpaywall });
    if (!fiche || !fiche.titre) {
      const code = pannes && pannes === appels ? 'service_indisponible' : 'introuvable';
      return { ok: false, code, message: MESSAGES[code], avertissements, identifiant: id };
    }
    if (!fiche.acces) return { ok: false, code: 'non_libre', message: MESSAGES.non_libre, fiche, sources, avertissements, identifiant: id };
    if (fiche.acces === 'gratuit') avertissements.push('Gratuit – licence non ouverte : seuls les métadonnées et votre résumé seront affichés.');
    if (fiche.acces === 'a_verifier') avertissements.push('Licence à vérifier : Unpaywall n\'a pas pu être consulté.');
    if (!fiche.doi) avertissements.push('Pas de DOI connu pour cet article.');
    return { ok: true, fiche, sources, avertissements, identifiant: id };
  }

  /* existants : articles déjà en base (tous statuts, y compris rejetés) ;
     enregistrer(fiche) → article enregistré (facultatif) ; progression(i, n) facultatif */
  async function importerLot(texte, { client, cache = null, config, existants = [], enregistrer = null, progression = null }) {
    const { valides, invalides } = ID.decouperLot(texte);
    const rapport = { crees: [], doublons: [], introuvables: [], non_libres: [], indisponibles: [], invalides: invalides.map(t => ({ texte: t })) };
    const connus = existants.slice();
    for (let i = 0; i < valides.length; i++) {
      const id = valides[i];
      if (progression) progression(i, valides.length);
      const deja = ID.trouverDoublon({ [id.type]: id.valeur }, connus);
      if (deja) { rapport.doublons.push({ texte: id.texte, article: deja }); continue; }
      const r = await importer(id.texte, { client, cache, config });
      if (!r.ok) {
        const liste = { introuvable: 'introuvables', non_libre: 'non_libres', service_indisponible: 'indisponibles', identifiant_invalide: 'invalides' }[r.code];
        rapport[liste].push({ texte: id.texte, message: r.message, fiche: r.fiche || null });
        continue;
      }
      const double = ID.trouverDoublon(r.fiche, connus);   // ex. PMID collé alors que l'article est déjà là par son DOI
      if (double) { rapport.doublons.push({ texte: id.texte, article: double }); continue; }
      const article = enregistrer ? await enregistrer(r.fiche) : r.fiche;
      connus.push(article);
      rapport.crees.push({ texte: id.texte, article, avertissements: r.avertissements });
    }
    if (progression) progression(valides.length, valides.length);
    return rapport;
  }

  return { MESSAGES, importer, importerLot };
});
