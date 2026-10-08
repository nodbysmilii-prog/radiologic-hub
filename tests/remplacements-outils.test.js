/* Remplacements — gabarits, e-mails, agenda (.ics), PDF, contrat, liens sécurisés (cas fictifs) */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const GAB = require('../remplacements/noyau/gabarits.js');
const ICS = require('../remplacements/noyau/ics.js');
const PDF = require('../remplacements/noyau/pdf.js');
const CONTRAT = require('../remplacements/noyau/contrat.js');
const JET = require('../remplacements/noyau/jetons.js');
const MSG = require('../remplacements/noyau/messagerie.js');

const MODELES = path.join(__dirname, '../remplacements/modeles');
const charger = async nom => fs.readFileSync(path.join(MODELES, 'emails', `${nom}.html`), 'utf8');

test('gabarits : variables échappées, blocs, listes, blocs communs', () => {
  assert.equal(GAB.rendre('{{a}} {{{a}}}', { a: '<b>' }), '&lt;b&gt; <b>');
  assert.equal(GAB.rendre('{{#l}}[{{.}}]{{/l}}{{^l}}vide{{/l}}', { l: [1, 2] }), '[1][2]');
  assert.equal(GAB.rendre('{{#l}}x{{/l}}{{^l}}vide{{/l}}', { l: [] }), 'vide');
  assert.equal(GAB.rendre('{{#n}}{{n}} contactés{{/n}}{{^n}}aucun{{/n}}', { n: 0 }), 'aucun', 'zéro = vide');
  assert.equal(GAB.rendre('{{#p}}{{nom}}{{/p}}', { p: { nom: 'Dr Test' } }), 'Dr Test');
  assert.equal(GAB.rendre('A{{> x}}C', { b: 'B' }, { partiels: { x: '{{b}}' } }), 'ABC');
  assert.equal(GAB.rendre('{{a}}', { a: "l'été" }, { texte: true }), "l'été", 'mode texte sans échappement');
  assert.throws(() => GAB.rendre('{{#a}}x', {}), /non fermé/);
});

test('agenda : un événement par date, heure de Tunis, garde jusqu\'au lendemain', () => {
  const t = ICS.calendrier({ uid: 'd1', titre: 'Remplacement, test', lieu: 'Clinique fictive', dates: ['2026-10-17', '2026-10-16'], heure_debut: '20:00', heure_fin: '08:00', description: 'Ligne 1\nLigne 2', maintenant: new Date('2026-10-08T10:00:00Z') });
  assert.match(t, /^BEGIN:VCALENDAR\r\n/);
  assert.equal((t.match(/BEGIN:VEVENT/g) || []).length, 2);
  assert.match(t, /DTSTART;TZID=Africa\/Tunis:20261016T200000/);
  assert.match(t, /DTEND;TZID=Africa\/Tunis:20261017T080000/, 'fin le lendemain');
  assert.match(t, /SUMMARY:Remplacement\\, test/);
  assert.match(t, /DESCRIPTION:Ligne 1\\nLigne 2/);
  assert.ok(t.split('\r\n').every(l => new TextEncoder().encode(l).length <= 75), 'lignes repliées à 75 octets');
  assert.match(ICS.calendrier({ uid: 'x', titre: 'a', dates: ['2026-10-16'], heure_debut: '08:00', heure_fin: '12:00', annule: true }), /METHOD:CANCEL[\s\S]*STATUS:CANCELLED/);
});

test('PDF : fichier valide (en-tête, table des positions), accents, plusieurs pages', () => {
  const doc = PDF.creerPdf({ titre: 'Essai', pied: 'Pied de page' });
  doc.titre('Contrat — été « français »');
  for (let i = 0; i < 60; i++) doc.paragraphe(`Paragraphe ${i} avec **du gras**, des accents (é, è, à, ç, ô, œ) et un texte assez long pour passer à la ligne automatiquement dans la largeur de la page.`);
  doc.signatures(['A', 'B'], ['C', 'D']);
  const octets = doc.octets(), texte = new TextDecoder().decode(octets);
  assert.match(texte, /^%PDF-1\.4/);
  assert.match(texte, /%%EOF\n$/);
  assert.ok(doc.pages >= 3, 'sauts de page');
  // chaque position de la table xref pointe bien sur « n 0 obj »
  const xref = +/startxref\n(\d+)/.exec(texte)[1];
  const lignes = texte.slice(xref).split('\n').slice(3).filter(l => / n $/.test(l));
  lignes.forEach((l, i) => assert.equal(texte.slice(+l.slice(0, 10), +l.slice(0, 10) + String(i + 1).length + 6), `${i + 1} 0 obj`));
  assert.ok(texte.includes('e9'), 'é encodé en WinAnsi (0xE9)');
  assert.ok(PDF.largeur('Mmmm', true, 10) > PDF.largeur('iiii', false, 10));
});

const demande = { id: '7a1b2c3d-0000-4000-8000-000000000001', dates: ['2026-10-16', '2026-10-15'], heure_debut: '08:00', heure_fin: '16:00', type: 'journee', modalites: ['scanner', 'irm'], profil: 'residents', annee_min: 4, honoraires: 450, unite: 'jour', logement: true, repas: true, commentaire: 'Accès parking.' };
const structure = { id: 's1', nom: 'Clinique Les Orangers (fictive)', type: 'clinique', adresse: '12 avenue Test', ville: 'Tunis', gouvernorat: 'Tunis', contact_nom: 'Mme Test', telephone: '71000000', email: 'contact@orangers-fictive.tn', equipements: ['scanner', 'irm'] };
const remplacant = { id: 'r1', statut: 'resident', annee_residanat: 4, affectation: 'Service de radiologie fictif', competences: ['scanner', 'irm'] };
const profil = { nom: 'Exemple', prenom: 'Sami', telephone: '98000000', email: 'sami.exemple@exemple.tn' };

test('contrat : modèle séparé rempli, PDF et aperçu HTML', () => {
  const modele = fs.readFileSync(path.join(MODELES, 'contrat.md'), 'utf8');
  const donnees = CONTRAT.donneesContrat({ demande, structure, remplacant, profil, maintenant: new Date('2026-10-08T10:00:00Z') });
  assert.equal(donnees.mission.reference, 'RH-7A1B2C3D');
  assert.equal(donnees.mission.total, '900 TND');
  assert.equal(donnees.mission.dates_texte, 'jeudi 15/10/2026 et vendredi 16/10/2026');
  const blocs = CONTRAT.blocs(modele, donnees);
  assert.equal(blocs[0].type, 'titre');
  assert.ok(blocs.some(b => b.type === 'signatures'));
  assert.ok(!blocs.some(b => /%%|\{\{/.test(b.texte || '')), 'commentaires et balises retirés');
  assert.ok(blocs.some(b => /résident en radiologie \(R4\)/.test(b.texte || '')));
  assert.ok(blocs.some(b => /autorisations requises/.test(b.texte || '')), 'clause propre aux résidents');
  const pdf = new TextDecoder().decode(CONTRAT.pdfContrat(modele, donnees));
  assert.match(pdf, /^%PDF-1\.4/);
  const html = CONTRAT.htmlContrat(modele, donnees);
  assert.match(html, /<h1>CONTRAT DE REMPLACEMENT/);
  assert.match(html, /<strong>900 TND<\/strong>/);
});

test('liens sécurisés : jeton aléatoire, empreinte, signature', async () => {
  const a = JET.nouveauJeton(), b = JET.nouveauJeton();
  assert.equal(a.length, 43);
  assert.notEqual(a, b);
  assert.match(a, /^[A-Za-z0-9_-]+$/, 'utilisable dans une URL');
  assert.equal((await JET.empreinte('abc')).length, 64);
  assert.equal(await JET.empreinte('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  const sig = await JET.signer('p:123', 'secret');
  assert.ok(await JET.verifier('p:123', sig, 'secret'));
  assert.ok(!(await JET.verifier('p:124', sig, 'secret')));
  assert.ok(!(await JET.verifier('p:123', sig, 'autre-secret')));
});

test('e-mails : chaque modèle se compose sans erreur (objet, HTML, texte)', async () => {
  const RECAP = require('../remplacements/noyau/recap.js');
  const envois = [];
  const m = MSG.creerMessagerie({ charger, transport: async x => { envois.push(x); return { ok: true, id: 'x' }; } });
  const rc = RECAP.demande(demande, structure), rr = RECAP.remplacant(remplacant, profil);
  const commun = { url_espace: 'https://exemple.tn/remplacements.html#/espace', url_mentions: 'https://exemple.tn/mentions-legales.html', lien_desinscription: 'https://exemple.tn/d', destinataire: { nom: 'Dr Test' }, demande: rc, remplacant: rr, structure: RECAP.structure(structure) };
  const modeles = fs.readdirSync(path.join(MODELES, 'emails')).filter(f => !f.startsWith('_')).map(f => f.replace('.html', ''));
  assert.ok(modeles.length >= 17);
  for (const nom of modeles) {
    const c = await m.composer(nom, { ...commun, lien_oui: 'https://o', lien_non: 'https://n', lien_annuler: 'https://a', interesses: [{ ...rr, lien_choisir: 'https://c', favori: true }], nouveau: rr, nombre: 1, lignes: [{ dates: '15/10/2026', avec: 'X', honoraires: '450 TND', type: 'Journée' }], mois: 'octobre 2026', total: '900 TND', autre: { nom: 'Y', telephone: '1', email: 'e' } });
    assert.ok(c.objet && !/\{\{/.test(c.objet), `${nom} : objet`);
    assert.ok(!/\{\{|\}\}/.test(c.html), `${nom} : balise non remplacée`);
    assert.match(c.html, /RadiologicHub/);
    assert.ok(c.texte.length > 20, `${nom} : version texte`);
  }
  const r = await m.envoyer({ a: { email: 'x@exemple.tn' }, modele: 'proposition', donnees: { ...commun, lien_oui: 'https://oui', lien_non: 'https://non' } });
  assert.equal(r.objet, 'Remplacement le 15/10/2026, 16/10/2026 — Clinique Les Orangers (fictive) (Tunis)');
  assert.match(envois[0].html, /href="https:\/\/oui"[^>]*>Je suis disponible/);
  assert.match(envois[0].texte, /Je suis disponible : https:\/\/oui/);
  assert.match(envois[0].html, /Ne plus recevoir/);
});
