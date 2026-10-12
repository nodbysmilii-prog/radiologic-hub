/* Tests du noyau de la Bibliothèque (bibliotheque/noyau) et de sa configuration.
   Les réponses d'API ci-dessous sont FICTIVES (identifiants 10.9999/…, PMID 9000000x),
   au format des API Europe PMC, PubMed E-utilities et Unpaywall. Le test sur de
   vrais DOI est tests/bibliotheque-reel.js (réseau nécessaire). */
const test = require('node:test');
const assert = require('node:assert/strict');
const CFG = require('../bibliotheque/config.js');
const ID = require('../bibliotheque/noyau/identifiants.js');
const S = require('../bibliotheque/noyau/sources.js');
const R = require('../bibliotheque/noyau/reseau.js');
const I = require('../bibliotheque/noyau/import.js');
const K = require('../bibliotheque/noyau/catalogue.js');

const ABSTRACT = 'TEXTE DE L ABSTRACT QUI NE DOIT JAMAIS ETRE REPRIS';

/* ---------- Réponses fictives ---------- */
const epmc = (o = {}) => ({
  hitCount: 1,
  resultList: { result: [{
    id: o.pmid || '90000001', source: 'MED', pmid: o.pmid || '90000001', pmcid: o.pmcid === undefined ? 'PMC9000001' : o.pmcid,
    doi: o.doi || '10.9999/RH.TEST.001', title: o.title || 'Imaging of <i>acute</i> appendicitis: a test review.',
    authorString: 'Dupont A, Martin B, Durand C.',
    authorList: { author: o.auteurs || [{ fullName: 'Dupont A', firstName: 'Anne', lastName: 'Dupont', initials: 'A' }, { lastName: 'Martin', initials: 'B' }] },
    journalInfo: { yearOfPublication: 2021, journal: { title: 'Test journal of imaging', isoabbreviation: 'Test J Imaging' } },
    pubYear: o.pubYear || '2021', abstractText: ABSTRACT, isOpenAccess: o.oa || 'Y', inEPMC: o.inPMC || 'Y', inPMC: o.inPMC || 'Y',
    license: o.license === undefined ? 'cc by' : o.license,
    fullTextUrlList: { fullTextUrl: o.urls || [{ availabilityCode: 'OA', documentStyle: 'html', site: 'Europe_PMC', url: 'https://europepmc.org/articles/PMC9000001' }] },
  }] },
});
const vide = { hitCount: 0, resultList: { result: [] } };
const upw = (o = {}) => ({
  doi: o.doi || '10.9999/rh.test.001', title: 'Imaging of acute appendicitis', year: 2021, journal_name: 'Test Journal of Imaging',
  is_oa: o.is_oa === undefined ? true : o.is_oa, oa_status: o.oa_status || 'gold',
  best_oa_location: o.best === undefined ? { url: 'https://editeur.example/article.pdf', url_for_landing_page: 'https://editeur.example/article', license: o.license === undefined ? 'cc-by' : o.license, host_type: 'publisher' } : o.best,
  z_authors: [{ given: 'Anne', family: 'Dupont', sequence: 'first' }, { given: 'Bruno', family: 'Martin', sequence: 'additional' }],
  abstract: ABSTRACT,
});
const esummary = pmid => ({ result: { uids: [pmid], [pmid]: {
  uid: pmid, pubdate: '2020 May', source: 'Test Radiol', title: 'Pancreatitis structured reporting test.',
  authors: [{ name: 'Durand C', authtype: 'Author' }, { name: 'Petit D', authtype: 'Author' }],
  articleids: [{ idtype: 'pubmed', value: pmid }, { idtype: 'doi', value: '10.9999/rh.test.002' }, { idtype: 'pmc', value: 'PMC9000002' }],
} } });

/* Faux fetch : adresse → réponse ; compte les appels */
function fauxFetch(routes) {
  const appels = [];
  const f = async url => {
    appels.push(url);
    const cle = Object.keys(routes).find(k => url.includes(k));
    const r = cle ? routes[cle] : 404;
    if (r === 'panne') throw new TypeError('Failed to fetch');
    if (typeof r === 'number') return { ok: false, status: r, json: async () => ({}) };
    return { ok: true, status: 200, json: async () => JSON.parse(JSON.stringify(r)) };
  };
  f.appels = appels;
  return f;
}
const client = routes => { const f = fauxFetch(routes); const c = R.creerClient({ fetch: f, attendre: async () => {} }); c.appels = f.appels; return c; };

test('identifiants : DOI, PMID, PMCID collés tels quels ou en adresse', () => {
  assert.equal(ID.normaliserDoi('https://doi.org/10.1186/S13244-019-0805-8.'), '10.1186/s13244-019-0805-8');
  assert.equal(ID.normaliserDoi('doi: 10.1148/radiol.2018181494'), '10.1148/radiol.2018181494');
  assert.equal(ID.normaliserDoi('https://dx.doi.org/10.1007%2Fs00261-020-02468-9'), '10.1007/s00261-020-02468-9');
  assert.equal(ID.normaliserDoi('pas un doi'), null);
  assert.deepEqual(ID.reconnaitre('PMID: 31792750'), { type: 'pmid', valeur: '31792750' });
  assert.deepEqual(ID.reconnaitre('https://pubmed.ncbi.nlm.nih.gov/31792750/'), { type: 'pmid', valeur: '31792750' });
  assert.deepEqual(ID.reconnaitre('pmc6889260'), { type: 'pmcid', valeur: 'PMC6889260' });
  assert.deepEqual(ID.reconnaitre('https://pmc.ncbi.nlm.nih.gov/articles/PMC6889260/'), { type: 'pmcid', valeur: 'PMC6889260' });
  assert.deepEqual(ID.reconnaitre('https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6889260/'), { type: 'pmcid', valeur: 'PMC6889260' });
  assert.deepEqual(ID.reconnaitre('https://europepmc.org/article/MED/31792750'), { type: 'pmid', valeur: '31792750' });
  assert.equal(ID.reconnaitre('bonjour'), null);
  const lot = ID.decouperLot('10.1186/s13244-019-0805-8\n10.1186/S13244-019-0805-8 ; 31792750, n-importe-quoi\n\nPMC6889260');
  assert.equal(lot.valides.length, 3, 'le même DOI collé deux fois ne compte qu\'une fois');
  assert.deepEqual(lot.invalides, ['n-importe-quoi']);
});

test('doublons : même DOI (casse, préfixe), ou même PMID / PMCID', () => {
  const existants = [{ id: 'a1', doi: '10.9999/rh.test.001', pmid: '90000001' }, { id: 'a2', pmid: '90000002' }];
  assert.equal(ID.trouverDoublon({ doi: 'https://doi.org/10.9999/RH.TEST.001' }, existants).id, 'a1');
  assert.equal(ID.trouverDoublon({ pmid: '90000001' }, existants).id, 'a1', 'PMID d\'un article connu par son DOI');
  assert.equal(ID.trouverDoublon({ doi: '10.9999/autre', pmid: '90000002' }, existants).id, 'a2');
  assert.equal(ID.trouverDoublon({ doi: '10.9999/nouveau' }, existants), null);
  assert.equal(ID.trouverDoublon({}, existants), null);
});

test('licences : CC normalisées, licences d\'éditeur = non ouvertes', () => {
  assert.equal(S.normaliserLicence('cc by'), 'CC BY');
  assert.equal(S.normaliserLicence('cc-by-nc-nd'), 'CC BY-NC-ND');
  assert.equal(S.normaliserLicence('CC BY-NC 4.0'), 'CC BY-NC');
  assert.equal(S.normaliserLicence('cc0'), 'CC0');
  assert.equal(S.normaliserLicence('public-domain'), 'Domaine public');
  assert.equal(S.normaliserLicence('implied-oa'), null);
  assert.equal(S.normaliserLicence('elsevier-specific: oa user license'), null);
  assert.equal(S.normaliserLicence(null), null);
});

test('lecture Europe PMC, PubMed, Unpaywall : métadonnées seulement, jamais l\'abstract', () => {
  const e = S.lireEuropePmc(epmc());
  assert.equal(e.doi, '10.9999/rh.test.001', 'DOI en minuscules');
  assert.equal(e.titre, 'Imaging of acute appendicitis: a test review', 'balises et point final retirés');
  assert.equal(e.premier_auteur, 'Dupont A');
  assert.equal(e.et_al, true);
  assert.equal(e.revue, 'Test J Imaging');
  assert.equal(e.annee, 2021);
  assert.equal(e.licence, 'CC BY');
  assert.equal(e.url_libre, 'https://pmc.ncbi.nlm.nih.gov/articles/PMC9000001/', 'lien PMC en priorité');
  assert.equal(S.lireEuropePmc(vide), null);
  const groupe = S.lireEuropePmc(epmc({ auteurs: [{ collectiveName: 'Groupe d\'étude test' }] }));
  assert.equal(groupe.premier_auteur, 'Groupe d\'étude test');
  assert.equal(groupe.et_al, false);
  const p = S.lirePubmedResume(esummary('90000002'), '90000002');
  assert.deepEqual([p.pmid, p.pmcid, p.doi, p.premier_auteur, p.revue, p.annee], ['90000002', 'PMC9000002', '10.9999/rh.test.002', 'Durand C', 'Test Radiol', 2020]);
  assert.deepEqual(S.lirePubmedRecherche({ esearchresult: { idlist: ['1', '2'] } }), ['1', '2']);
  const u = S.lireUnpaywall(upw({ license: 'cc-by-nc' }));
  assert.equal(u.licence, 'CC BY-NC');
  assert.equal(u.premier_auteur, 'Dupont A');
  for (const x of [e, p, u]) assert.ok(!JSON.stringify(x).includes(ABSTRACT), 'abstract jamais repris');
  assert.ok(!S.CHAMPS.some(c => /abstract|resume|figure/i.test(c)), 'aucun champ pour l\'abstract ou les figures');
});

test('fusion : licence ouverte, gratuit sans licence ouverte, à vérifier, pas gratuit', () => {
  const ouvert = S.fusionner({ europepmc: S.lireEuropePmc(epmc()), unpaywall: S.lireUnpaywall(upw()) });
  assert.equal(ouvert.acces, 'ouvert');
  assert.equal(ouvert.source_texte, 'PMC');
  const gratuit = S.fusionner({ europepmc: S.lireEuropePmc(epmc({ license: null })), unpaywall: S.lireUnpaywall(upw({ license: null, oa_status: 'bronze' })) });
  assert.equal(gratuit.acces, 'gratuit', 'dans PMC mais sans licence ouverte');
  assert.equal(gratuit.licence, undefined);
  const editeur = S.fusionner({ europepmc: S.lireEuropePmc(epmc({ license: null, pmcid: null, inPMC: 'N', oa: 'N', urls: [] })), unpaywall: S.lireUnpaywall(upw({ license: null, oa_status: 'bronze' })) });
  assert.equal(editeur.acces, 'gratuit');
  assert.equal(editeur.url_texte, 'https://editeur.example/article', 'page de l\'éditeur');
  const pubmedSeul = S.fusionner({ pubmed: S.lirePubmedResume(esummary('90000002'), '90000002') });
  assert.equal(pubmedSeul.acces, 'a_verifier', 'PMC selon PubMed, licence inconnue');
  const ferme = S.fusionner({ europepmc: S.lireEuropePmc(epmc({ license: null, pmcid: null, inPMC: 'N', oa: 'N', urls: [] })), unpaywall: S.lireUnpaywall(upw({ is_oa: false, best: null, oa_status: 'closed' })) });
  assert.equal(ferme.acces, undefined, 'pas de texte gratuit');
});

test('import par DOI : Europe PMC + Unpaywall, puis cache (aucun nouvel appel)', async () => {
  const c = client({ 'europepmc/webservices/rest/search': epmc(), 'api.unpaywall.org': upw() });
  const cache = R.creerCache();
  const r = await I.importer('https://doi.org/10.9999/RH.TEST.001', { client: c, cache, config: CFG });
  assert.equal(r.ok, true);
  assert.deepEqual(r.sources, ['Europe PMC', 'Unpaywall']);
  assert.equal(r.fiche.titre, 'Imaging of acute appendicitis: a test review');
  assert.equal(r.fiche.acces, 'ouvert');
  assert.ok(c.appels.some(u => u.includes('email=radiologichub%40gmail.com')), 'e-mail de contact de la configuration envoyé à Unpaywall');
  const n = c.appels.length;
  const r2 = await I.importer('10.9999/rh.test.001', { client: c, cache, config: CFG });
  assert.equal(r2.ok, true);
  assert.equal(c.appels.length, n, 'réponses réutilisées depuis le cache');
});

test('import par PMID absent d\'Europe PMC : PubMed (outil RadiologicHub), puis Unpaywall', async () => {
  const c = client({ 'europepmc': vide, 'esummary.fcgi': esummary('90000002'), 'api.unpaywall.org': upw({ doi: '10.9999/rh.test.002', license: null, oa_status: 'bronze' }) });
  const r = await I.importer('90000002', { client: c, config: CFG });
  assert.equal(r.ok, true);
  assert.deepEqual(r.sources, ['PubMed', 'Unpaywall']);
  assert.equal(r.fiche.acces, 'gratuit');
  assert.ok(r.avertissements.some(a => /licence non ouverte/.test(a)));
  assert.ok(c.appels.some(u => u.includes('esummary.fcgi') && u.includes('tool=RadiologicHub') && u.includes('email=radiologichub%40gmail.com')));
});

test('import : identifiant invalide, introuvable, pas en accès libre, services en panne', async () => {
  assert.equal((await I.importer('bonjour', { client: client({}), config: CFG })).code, 'identifiant_invalide');
  const introuvable = await I.importer('10.9999/inconnu', { client: client({ europepmc: vide, 'esearch.fcgi': { esearchresult: { idlist: [] } }, 'api.unpaywall.org': 404 }), config: CFG });
  assert.equal(introuvable.code, 'introuvable');
  const ferme = await I.importer('10.9999/rh.test.001', { client: client({ europepmc: epmc({ license: null, pmcid: null, inPMC: 'N', oa: 'N', urls: [] }), 'api.unpaywall.org': upw({ is_oa: false, best: null, oa_status: 'closed' }) }), config: CFG });
  assert.equal(ferme.code, 'non_libre');
  assert.ok(ferme.fiche.titre, 'la fiche reste visible pour comprendre le refus');
  const panne = await I.importer('10.9999/rh.test.001', { client: client({ europepmc: 'panne', 'esearch.fcgi': 'panne', 'api.unpaywall.org': 'panne' }), config: CFG });
  assert.equal(panne.code, 'service_indisponible');
});

test('import en lot : créés, doublons (même dans le lot), introuvables, non libres, invalides', async () => {
  const c = client({
    'DOI%3A%2210.9999%2Frh.test.001': epmc(),
    'DOI%3A%2210.9999%2Frh.test.003': epmc({ doi: '10.9999/rh.test.003', pmid: '90000003', pmcid: null, inPMC: 'N', oa: 'N', license: null, urls: [] }),
    'EXT_ID%3A90000001': epmc(),
    'europepmc': vide,
    'esearch.fcgi': { esearchresult: { idlist: [] } },
    'unpaywall.org/v2/10.9999%2Frh.test.001': upw(),
    'unpaywall.org/v2/10.9999%2Frh.test.003': upw({ doi: '10.9999/rh.test.003', is_oa: false, best: null, oa_status: 'closed' }),
  });
  const enregistres = [];
  const existants = [{ id: 'rejete', doi: '10.9999/deja.rejete', statut: 'rejete' }];
  const rapport = await I.importerLot(
    '10.9999/rh.test.001\n90000001\n10.9999/DEJA.REJETE\n10.9999/rh.test.003\n10.9999/introuvable\nbonjour',
    { client: c, config: CFG, existants, enregistrer: async f => { const a = { ...f, id: 'n' + enregistres.length, statut: 'a_valider' }; enregistres.push(a); return a; } });
  assert.equal(rapport.crees.length, 1);
  assert.equal(rapport.doublons.length, 2, 'le PMID du DOI déjà importé + l\'article déjà rejeté');
  assert.equal(rapport.doublons.find(d => d.texte === '10.9999/DEJA.REJETE').article.statut, 'rejete');
  assert.equal(rapport.non_libres.length, 1);
  assert.equal(rapport.introuvables.length, 1);
  assert.equal(rapport.invalides.length, 1);
  assert.equal(enregistres.length, 1);
});

test('limiteur : 3 requêtes par seconde au plus pour PubMed', async () => {
  let t = 0;
  const attentes = [];
  const L = R.creerLimiteur(CFG.api.debits, { maintenant: () => t, attendre: async ms => { attentes.push(Math.round(ms)); t += ms; } });
  for (let i = 0; i < 4; i++) await L.avant('https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi');
  assert.deepEqual(attentes, [333, 333, 333]);
  await L.avant('https://api.unpaywall.org/v2/x');
  assert.equal(attentes.length, 3, 'un autre service n\'attend pas');
});

test('cache : expiration et client (404 → null, 429 → nouvelle tentative)', async () => {
  let t = 0;
  const cache = R.creerCache({ maintenant: () => t });
  await cache.ecrire('k', { titre: 'x' }, 7);
  assert.deepEqual(await cache.lire('k'), { titre: 'x' });
  t += 8 * 864e5;
  assert.equal(await cache.lire('k'), undefined, 'périmé après 7 jours');
  let n = 0;
  const f = async () => (++n === 1 ? { ok: false, status: 429 } : { ok: true, status: 200, json: async () => ({ ok: 1 }) });
  const c = R.creerClient({ fetch: f, attendre: async () => {} });
  assert.deepEqual(await c.json('https://www.ebi.ac.uk/x'), { ok: 1 });
  assert.equal(n, 2);
  assert.equal(await R.creerClient({ fetch: async () => ({ ok: false, status: 404 }) }).json('https://x.org'), null);
  await assert.rejects(R.creerClient({ fetch: async () => ({ ok: false, status: 500 }) }).json('https://x.org'), e => e.code === 'http' && e.status === 500);
});

/* ---------- Catalogue ---------- */
const A = [
  { id: '1', titre: 'Imagerie de l\'appendicite', premier_auteur: 'Dupont A', et_al: true, revue: 'Test J', annee: 2021, specialite: 'digestif', organes: ['appendice'], modalites: ['scanner', 'echo'], classifications: [], niveau: 'etudiant', acces: 'ouvert', licence: 'CC BY', themes: [{ theme: 'urgences-digestives', essentiel: true, rang: 2 }] },
  { id: '2', titre: 'LI-RADS : mise à jour', premier_auteur: 'Martin B', annee: 2018, specialite: 'digestif', organes: ['foie'], modalites: ['irm', 'scanner'], classifications: ['li-rads'], niveau: 'resident', acces: 'gratuit', resume: 'Algorithme de diagnostic du carcinome hépatocellulaire.', themes: [{ theme: 'foie', essentiel: true, rang: 1 }] },
  { id: '3', titre: 'Kyste hydatique hépatique compliqué', premier_auteur: 'Durand C', et_al: true, annee: 2019, specialite: 'digestif', organes: ['foie'], modalites: ['scanner', 'echo', 'irm'], classifications: ['oms-iwge'], niveau: 'resident', acces: 'ouvert', licence: 'CC BY', themes: [{ theme: 'foie', essentiel: false, rang: null }] },
  { id: '4', titre: 'Occlusion du grêle', annee: 2023, specialite: 'digestif', organes: ['grele'], modalites: ['scanner'], niveau: 'senior', acces: 'ouvert', themes: [{ theme: 'urgences-digestives', essentiel: false, rang: 1 }] },
  { id: '5', titre: 'Appendicite de l\'enfant', annee: 2020, specialite: 'digestif', organes: ['appendice'], modalites: ['echo'], niveau: 'etudiant', acces: 'gratuit', themes: [{ theme: 'urgences-digestives', essentiel: true, rang: 1 }] },
];
const ids = l => l.map(a => a.id);

test('recherche et filtres combinables', () => {
  assert.deepEqual(ids(K.filtrer(A, { q: 'HEPATOCELLULAIRE' }, CFG)), ['2'], 'sans accents ni majuscules, résumé compris');
  assert.deepEqual(ids(K.filtrer(A, { q: 'foie kyste' }, CFG)), ['3'], 'tous les mots, libellés des organes compris');
  assert.deepEqual(ids(K.filtrer(A, { modalites: ['irm'] }, CFG)), ['2', '3']);
  assert.deepEqual(ids(K.filtrer(A, { modalites: ['irm', 'echo'] }, CFG)), ['1', '2', '3', '5'], 'OU dans un même filtre');
  assert.deepEqual(ids(K.filtrer(A, { modalites: ['echo'], niveau: ['etudiant'], acces: ['gratuit'] }, CFG)), ['5'], 'ET entre les filtres');
  assert.deepEqual(ids(K.filtrer(A, { theme: 'foie', essentiel: true }, CFG)), ['2']);
  assert.deepEqual(ids(K.filtrer(A, { classifications: ['li-rads'] }, CFG)), ['2']);
  assert.deepEqual(ids(K.filtrer(A, { anneeMin: 2021 }, CFG)), ['1', '4']);
  assert.deepEqual(ids(K.filtrer(A, { specialite: 'sein' }, CFG)), []);
  assert.deepEqual(ids(K.filtrer(A, {}, CFG)), ['1', '2', '3', '4', '5']);
});

test('page thème : Essentiels d\'abord dans l\'ordre de lecture, puis les autres', () => {
  const urg = K.filtrer(A, { theme: 'urgences-digestives' }, CFG);
  assert.deepEqual(ids(K.trierPourTheme(urg, 'urgences-digestives')), ['5', '1', '4']);
  assert.deepEqual(ids(K.trierPourTheme(K.filtrer(A, { theme: 'foie' }, CFG), 'foie')), ['2', '3']);
  assert.deepEqual(ids(K.trierResultats(A)).slice(0, 3), ['1', '5', '2'], 'recherche : Essentiels d\'abord, plus récents ensuite');
});

test('affichage : auteurs, liens, badge d\'accès, adresse partageable', () => {
  assert.equal(K.auteurs(A[0]), 'Dupont A et al.');
  assert.equal(K.auteurs(A[1]), 'Martin B');
  assert.equal(K.reference(A[0]), 'Dupont A et al. · Test J · 2021');
  const l = K.liens({ url_texte: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC1/', source_texte: 'PMC', pmid: '123', doi: '10.9999/x' });
  assert.deepEqual(l.map(x => x.label), ['Texte intégral gratuit (PMC)', 'PubMed', 'DOI']);
  assert.equal(l[2].url, 'https://doi.org/10.9999/x');
  assert.equal(K.badgeAcces(A[1]).label, 'Gratuit – licence non ouverte');
  assert.equal(K.badgeAcces(A[0]).label, 'CC BY');
  const c = { q: 'kyste', modalites: ['irm', 'scanner'], essentiel: true, theme: 'foie' };
  assert.deepEqual(K.criteresDepuisAdresse('#' + K.adresseDepuisCriteres(c)), c);
});

test('validation d\'une fiche : résumé ≤ 400 caractères, tags connus, exigences pour publier', () => {
  const base = { titre: 'T', doi: '10.9999/x', url_texte: 'https://x.org', acces: 'ouvert' };
  assert.deepEqual(K.validerArticle(base, CFG), []);
  assert.ok(K.validerArticle({ ...base, resume: 'x'.repeat(401) }, CFG).some(e => /trop long/.test(e)));
  assert.ok(K.validerArticle({ ...base, organes: ['coeur-inconnu'] }, CFG).some(e => /Organe inconnu/.test(e)));
  assert.ok(K.validerArticle({ ...base, doi: null }, CFG).some(e => /DOI ou un PMID/.test(e)));
  const pub = K.validerArticle({ ...base, statut: 'publie' }, CFG);
  assert.equal(pub.length, 3, 'sous-spécialité, thème et niveau exigés pour publier');
});

test('configuration : valide, 10 sous-spécialités prévues, 3 thèmes digestifs actifs', () => {
  assert.deepEqual(K.validerConfig(CFG), []);
  assert.deepEqual(CFG.specialites.map(s => s.id), ['digestif', 'sein', 'msk', 'neuro', 'orl', 'thorax', 'uro', 'pediatrie', 'cardio', 'interventionnel']);
  CFG.specialites.forEach(s => assert.ok((CFG.organes[s.id] || []).length, `organes prévus pour ${s.id}`));
  assert.deepEqual(CFG.themes.filter(t => t.actif).map(t => t.id), ['urgences-digestives', 'foie', 'pancreas']);
  assert.equal(CFG.contact.outil, 'RadiologicHub');
  ['bi-rads', 'pi-rads', 'eu-tirads', 'o-rads', 'li-rads', 'bosniak', 'recist', 'lugano', 'munich', 'bamic'].forEach(c => assert.ok(CFG.classifications.some(x => x.id === c), c));
  // Ajouter un thème d'une autre sous-spécialité ne demande que la configuration
  const plus = { ...CFG, themes: [...CFG.themes, { id: 'sein-depistage', specialite: 'sein', titre: 'Dépistage', actif: true, tags: { organes: ['sein'], modalites: ['mammographie'], classifications: ['bi-rads'] }, requetes: [{ id: 'birads', source: 'europepmc', q: 'TITLE:"BI-RADS"' }] }] };
  assert.deepEqual(K.validerConfig(plus), []);
  assert.deepEqual(K.vocabulaire(plus, 'sein').themes.map(t => t.id), ['sein-depistage']);
  assert.ok(K.validerConfig({ ...CFG, themes: [{ id: 'x', specialite: 'inconnue', titre: 'X', actif: true, requetes: [] }] }).length >= 2);
});
