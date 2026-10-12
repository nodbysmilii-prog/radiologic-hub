#!/usr/bin/env node
/* =========================================================
   Test du schéma Supabase de la Bibliothèque
   (supabase/migrations/…_bibliotheque.sql) sur un PostgreSQL local, avec
   l'exposition automatique désactivée (npm run test:sql) : visiteurs,
   utilisateurs connectés, administrateur, veille (clé de service),
   doublons, contraintes. Articles fictifs (DOI 10.9999/…).
   ========================================================= */
const assert = require('node:assert/strict');
const { demarrer } = require('./pg.js');

const pg = demarrer();
if (!pg) { console.log('PostgreSQL absent : test SQL ignoré.'); process.exit(0); }
const { psql, admin } = pg;

let ok = 0;
const verifier = (nom, f) => { f(); ok++; console.log(`  ✓ ${nom}`); };
const comme = (u, sql) => psql(sql, { utilisateur: u, role: 'authenticated' });
const valeur = (u, sql) => { const r = comme(u, sql); if (r.erreur) throw new Error(r.erreur); return r.sortie; };
const refuse = (u, sql, motif = /row-level security|permission denied/) => assert.match(comme(u, sql).erreur || 'ACCEPTÉ', motif);
const visiteur = sql => psql(sql, { role: 'anon' });
const service = sql => psql(sql, { role: 'service_role' });
const ARTICLE = (doi, extra = {}) => {
  const c = { doi: `'${doi}'`, titre: "'Article fictif de test'", acces: "'ouvert'", url_texte: "'https://pmc.ncbi.nlm.nih.gov/articles/PMC1/'", ...extra };
  return `insert into bib_articles (${Object.keys(c).join(', ')}) values (${Object.values(c).join(', ')}) returning id`;
};

try {
  console.log('Bibliothèque : vérification des droits :');
  const nouveau = email => ({ id: admin(`insert into auth.users (email) values ('${email}') returning id`), email });
  const ADM = nouveau('admin@exemple.tn'), U = nouveau('lecteur@exemple.tn');
  admin("insert into rp_admins (email) values ('admin@exemple.tn')");
  let a1, a2;

  verifier('l\'administrateur importe un article : il arrive « à valider », DOI mis en minuscules', () => {
    a1 = valeur(ADM, ARTICLE('10.9999/RH.SQL.001', { pmid: "'90000001'", pmcid: "'PMC9000001'", organes: "'{foie}'", modalites: "'{irm,scanner}'", classifications: "'{li-rads}'" }));
    assert.equal(admin(`select statut || '|' || doi || '|' || origine from bib_articles where id = '${a1}'`), 'a_valider|10.9999/rh.sql.001|import');
    valeur(ADM, `insert into bib_article_themes (article_id, theme, essentiel, rang) values ('${a1}', 'foie', true, 1)`);
  });

  verifier('un article « à valider » est invisible des visiteurs et des utilisateurs connectés', () => {
    assert.equal(visiteur('select count(*) from bib_articles').sortie, '0');
    assert.equal(visiteur('select count(*) from bib_article_themes').sortie, '0');
    assert.equal(valeur(U, 'select count(*) from bib_articles'), '0');
    assert.equal(valeur(ADM, 'select count(*) from bib_articles'), '1');
  });

  verifier('publier exige sous-spécialité et niveau ; date de publication renseignée', () => {
    refuse(ADM, `update bib_articles set statut = 'publie' where id = '${a1}'`, /bib_articles_publiable/);
    valeur(ADM, `update bib_articles set statut = 'publie', specialite = 'digestif', niveau = 'resident', resume = 'Résumé personnel de test.' where id = '${a1}'`);
    assert.equal(admin(`select publie_le is not null from bib_articles where id = '${a1}'`), 't');
  });

  verifier('visiteurs : articles publiés seulement, colonnes publiques seulement, aucune écriture', () => {
    assert.equal(visiteur('select titre || \'|\' || resume from bib_articles').sortie, 'Article fictif de test|Résumé personnel de test.');
    assert.equal(visiteur('select theme || \'|\' || essentiel || \'|\' || rang from bib_article_themes').sortie, 'foie|true|1');
    assert.match(visiteur('select origine from bib_articles').erreur, /permission denied/);
    assert.match(visiteur('select motif_rejet from bib_articles').erreur, /permission denied/);
    assert.match(visiteur('select * from bib_articles').erreur, /permission denied/, 'le site demande les colonnes une par une');
    assert.match(visiteur(ARTICLE('10.9999/rh.sql.099')).erreur, /permission denied/);
    assert.match(visiteur(`update bib_articles set titre = 'x'`).erreur, /permission denied/);
  });

  verifier('utilisateur connecté non administrateur : lecture des publiés, aucune écriture', () => {
    assert.equal(valeur(U, 'select count(*) from bib_articles'), '1');
    refuse(U, ARTICLE('10.9999/rh.sql.098'));
    assert.equal(valeur(U, `update bib_articles set titre = 'piraté' where id = '${a1}' returning id`), '', 'aucune ligne modifiée');
    refuse(U, `insert into bib_article_themes (article_id, theme) values ('${a1}', 'pancreas')`);
    assert.equal(valeur(U, `delete from bib_articles returning id`), '');
    assert.equal(admin(`select titre from bib_articles where id = '${a1}'`), 'Article fictif de test');
  });

  verifier('doublons refusés par la base : DOI (quelle que soit la casse), PMID, PMCID', () => {
    refuse(ADM, ARTICLE('10.9999/rh.SQL.001'), /duplicate key|unique/);
    refuse(ADM, ARTICLE('10.9999/rh.sql.002', { pmid: "'90000001'" }), /duplicate key|unique/);
    refuse(ADM, ARTICLE('10.9999/rh.sql.003', { pmcid: "'PMC9000001'" }), /duplicate key|unique/);
    a2 = valeur(ADM, ARTICLE('10.9999/rh.sql.002', { pmid: "'90000002'", acces: "'gratuit'" }));
    assert.ok(a2);
  });

  verifier('contraintes : résumé ≤ 400 caractères, lien https, tags au bon format, un identifiant au moins', () => {
    refuse(ADM, `update bib_articles set resume = repeat('x', 401) where id = '${a2}'`, /check constraint/);
    refuse(ADM, ARTICLE('10.9999/rh.sql.004', { url_texte: "'http://exemple.org'" }), /check constraint/);
    refuse(ADM, ARTICLE('10.9999/rh.sql.005', { organes: "'{Foie}'" }), /check constraint/);
    refuse(ADM, ARTICLE('10.9999/rh.sql.006', { acces: "'payant'" }), /check constraint/);
    refuse(ADM, `insert into bib_articles (titre, acces, url_texte) values ('Sans identifiant', 'ouvert', 'https://x.org')`, /bib_articles_identifiant/);
    const colonnes = admin("select string_agg(column_name, ',') from information_schema.columns where table_name like 'bib_%'");
    assert.doesNotMatch(colonnes, /abstract|figure/, 'aucune colonne pour l\'abstract ou les figures');
  });

  verifier('veille (clé de service) : ajoute dans la file « à valider », ne publie jamais', () => {
    const r = service(ARTICLE('10.9999/rh.sql.007', { origine: "'veille'", requete: "'foie/li-rads'" }));
    assert.ok(!r.erreur, r.erreur);
    assert.match(service(ARTICLE('10.9999/rh.sql.008', { statut: "'publie'", specialite: "'digestif'", niveau: "'senior'" })).erreur, /Seul l'administrateur/);
    assert.match(service(`update bib_articles set statut = 'publie', specialite = 'digestif', niveau = 'senior' where doi = '10.9999/rh.sql.007'`).erreur, /Seul l'administrateur/);
    assert.ok(!service(`update bib_articles set lien_etat = 'ok' where id = '${a1}'`).erreur, 'met à jour un article publié (vérification des liens)');
  });

  verifier('rejet : motif conservé, article retiré du site, supprimé avec ses thèmes', () => {
    valeur(ADM, `update bib_articles set statut = 'rejete', motif_rejet = 'Hors sujet' where id = '${a1}'`);
    assert.equal(admin(`select statut || '|' || motif_rejet || '|' || (publie_le is null) from bib_articles where id = '${a1}'`), 'rejete|Hors sujet|true');
    assert.equal(visiteur('select count(*) from bib_articles').sortie, '0');
    valeur(ADM, `delete from bib_articles where id = '${a1}'`);
    assert.equal(admin('select count(*) from bib_article_themes'), '0');
  });

  console.log(`\n# pass ${ok}\n# fail 0`);
} catch (e) {
  console.error(e);
  console.log(`\n# pass ${ok}\n# fail 1`);
  process.exitCode = 1;
} finally {
  pg.arreter();
}
