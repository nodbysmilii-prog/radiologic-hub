#!/usr/bin/env node
/* =========================================================
   Test RÉEL de l'import (npm run test:bib-reel) : 5 articles d'imagerie
   digestive en accès libre, interrogés en direct sur Europe PMC, PubMed
   et Unpaywall, puis un doublon (même article collé par son PMID).
   Identifiants attendus relevés sur PubMed. Réseau nécessaire : si les
   services sont injoignables, le test est IGNORÉ (rien n'est simulé).
   ========================================================= */
const CFG = require('../bibliotheque/config.js');
const R = require('../bibliotheque/noyau/reseau.js');
const I = require('../bibliotheque/noyau/import.js');
const ID = require('../bibliotheque/noyau/identifiants.js');

const ATTENDUS = [
  { doi: '10.1186/s13244-021-01086-3', pmid: '34674054', pmcid: 'PMC8531161', theme: 'urgences digestives (appendicite)' },
  { doi: '10.1148/radiol.2018181494', pmid: '30251931', pmcid: 'PMC6677371', theme: 'foie (LI-RADS)', acces: 'gratuit' },
  { doi: '10.1186/s13244-019-0805-8', pmid: '31792750', pmcid: 'PMC6889260', theme: 'foie (kyste hydatique)', acces: 'ouvert', licence: 'CC BY' },
  { doi: '10.1007/s00261-020-02468-9', pmid: '32189022', pmcid: 'PMC7223113', theme: 'pancréas (pancréatite aiguë)' },
  { doi: '10.1136/gutjnl-2018-316027', pmid: '29574408', pmcid: 'PMC5890653', theme: 'pancréas (lésions kystiques)' },
];

(async () => {
  const client = R.creerClient({ limiteur: R.creerLimiteur(CFG.api.debits) });
  const cache = R.creerCache();
  try {
    await client.json(`${CFG.api.europepmc}/search?query=DOI:%22${ATTENDUS[0].doi}%22&format=json&resultType=lite&pageSize=1`);
  } catch (e) {
    console.log(`Services injoignables depuis cet environnement (${e.message}) : test réel IGNORÉ.`);
    console.log('Ouvrir l\'accès à www.ebi.ac.uk, eutils.ncbi.nlm.nih.gov, api.unpaywall.org et doi.org, puis relancer.');
    process.exit(0);
  }
  let echecs = 0;
  const verifier = (nom, ok, detail) => { console.log(`  ${ok ? '✓' : '✗'} ${nom}${ok ? '' : ' — ' + detail}`); if (!ok) echecs++; };
  console.log('Import réel de 5 DOI :');
  const importes = [];
  for (const a of ATTENDUS) {
    const r = await I.importer(a.doi, { client, cache, config: CFG });
    const f = r.fiche || {};
    const ok = r.ok && f.doi === a.doi && f.pmid === a.pmid && f.pmcid === a.pmcid && f.url_texte && f.titre
      && (!a.acces || f.acces === a.acces) && (!a.licence || f.licence === a.licence);
    verifier(`${a.theme} : ${f.premier_auteur || '?'}${f.et_al ? ' et al.' : ''}, ${f.revue || '?'} ${f.annee || '?'} — ${f.acces || r.code}${f.licence ? ' (' + f.licence + ')' : ''}`,
      ok, JSON.stringify({ code: r.code, doi: f.doi, pmid: f.pmid, pmcid: f.pmcid, acces: f.acces, licence: f.licence, avert: r.avertissements }));
    if (r.ok) importes.push(f);
  }
  const lot = await I.importerLot(`${ATTENDUS[4].pmid}\nPMC6889260`, { client, cache, config: CFG, existants: importes });
  verifier('doublons : le même article collé par son PMID ou son PMCID est reconnu', lot.doublons.length === 2 && !lot.crees.length, JSON.stringify(lot));
  verifier('aucun abstract dans les fiches', importes.every(f => Object.keys(f).every(k => !/abstract/i.test(k))), 'champ abstract présent');
  verifier('identifiants normalisés', importes.every(f => ID.normaliserDoi(f.doi) === f.doi), 'DOI non normalisé');
  console.log(`\n# ${echecs ? 'fail ' + echecs : 'pass'}`);
  process.exit(echecs ? 1 : 0);
})();
