// Fichier généré par scripts/preparer-backend.js — ne pas modifier ici (source : assistant-ia/noyau/).
/* =========================================================
   RadiologicHub — Assistant IA : consigne et lecture de la réponse
   ---------------------------------------------------------
   • construireConsigne(demande) : texte envoyé au modèle. Le compte
     rendu part du MODÈLE NORMAL du service (cr-data.js ou « Mes
     modèles ») : ses phrases sont gardées mot pour mot, seules celles
     que les notes contredisent sont modifiées. Le compte rendu repose
     uniquement sur les notes du radiologue ; les images éventuelles ne
     servent qu'au « second regard », rendu à part.
   • lireReponse(texte) : { cr, verifier[], secondRegard }.
   • chiffresInventes(cr, sources) : nombres du compte rendu absents des
     notes et du modèle (mesure ou densité à vérifier).
   • donneesIdentifiantes(texte) : repères grossiers (nom après une
     civilité, date complète, n° à 8 chiffres, téléphone).
   • verifierDemande(demande) : message d'erreur, ou null.
   Partagé entre le site et la fonction serveur « cr-ia » (copie générée
   par scripts/preparer-backend.js). Testé sous Node :
   tests/assistant-ia.test.js.
   ========================================================= */

(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.RHAssistantIA = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const MARQUE_VERIFIER = '===À VÉRIFIER===';
  const MARQUE_REGARD = '===SECOND REGARD===';
  const LIMITES = { images: 5, notes: 6000, modele: 12000, champ: 300 };

  const txt = v => String(v ?? '').trim();

  const EXEMPLES = [
    'EXEMPLES DE TRANSFORMATION (style attendu ; ne pas recopier ces données) :',
    '',
    'Ligne du modèle : « • Les reins sont en place, de taille et de trophicité normales et de contours réguliers. »',
    'Note : « kyste cortical rein G pôle sup 22 mm, 8 UH, paroi fine, pas de rehaussement »',
    'Résultat :',
    '• Les reins sont en place, de taille et de trophicité normales et de contours réguliers.',
    '• Kyste cortical du pôle supérieur du rein gauche, mesurant 22 mm, de densité liquidienne (8 UH), à paroi fine, sans rehaussement après injection.',
    '',
    'Ligne du modèle : « • Foie non dysmorphique, de taille normale, de contours réguliers, de densité spontanée et de rehaussement homogènes. »',
    'Note : « foie stéatosique homogène »',
    'Résultat :',
    '• Foie non dysmorphique, de taille normale, de contours réguliers, siège d\'une hypodensité diffuse et homogène en rapport avec une stéatose.',
    '(« de densité spontanée homogène » a été retiré car contredit par la note ; le reste de la ligne est gardé mot pour mot.)',
  ].join('\n');

  function construireConsigne(d) {
    const notes = txt(d.notes);
    const images = Math.max(0, Math.min(Number(d.nbImages) || 0, LIMITES.images));
    const toutNormal = d.toutNormal !== false;
    const sexe = d.sexe === 'H' ? 'homme' : d.sexe === 'F' ? 'femme' : '';
    const lignes = [
      'Tu rédiges un compte rendu d\'imagerie pour un radiologue tunisien d\'école française. Le texte doit pouvoir être signé tel quel, dans le style exact du MODÈLE NORMAL fourni plus bas : mêmes rubriques, même titre, une constatation par ligne précédée de « • ».',
      '',
      'MÉTHODE',
      toutNormal
        ? '1. Pars du MODÈLE NORMAL : c\'est le texte du service. Garde son ordre et ses lignes mot pour mot pour tout ce que les notes ne modifient pas.'
        : '1. Le MODÈLE NORMAL ne sert que de modèle de style et d\'ordre. Ne garde que les lignes des organes cités dans les notes ; liste les organes non décrits dans À VÉRIFIER.',
      '2. Pour chaque note, modifie uniquement la ligne concernée : retire ce que la note contredit, garde le reste mot pour mot. Une anomalie nouvelle s\'écrit sur sa propre ligne « • », juste sous la ligne de l\'organe concerné.',
      '3. Ne répète jamais le nom d\'un organe dans une même ligne, ni d\'une ligne à la suivante quand c\'est évitable. Pas d\'étiquettes du type « Foie : ».',
      '4. Sémiologie de chaque anomalie, dans cet ordre quand l\'information existe : nature, siège précis (segment, pôle, côté), taille en mm, densité en UH ou signal, contours, rehaussement, retentissement.',
      '5. Aucune invention : aucune mesure, densité, latéralité, négation ou classification qui ne vienne ni des notes ni du modèle. Si une information manque, écris la ligne sans elle et signale-la dans À VÉRIFIER.',
      '6. Négations importantes pour l\'indication (par exemple collection, perforation, pneumopéritoine devant une appendicite) : si elles ne figurent ni dans les notes ni dans le modèle, ne les écris pas et signale-les dans À VÉRIFIER.',
      '7. Champs entre crochets du modèle : remplace [renseignements cliniques] par l\'indication et [conclusion] par ta conclusion. Pour un autre champ comme « [x] mm » ou « [droit / gauche] », remplis-le si les notes donnent la valeur ; sinon, laisse-le tel quel, crochets compris, et signale-le dans À VÉRIFIER.',
      '8. Classification (Bosniak 2019, LI-RADS, PI-RADS, BI-RADS, RECIST 1.1…) seulement si les données des notes suffisent ; sinon, signale ce qui manque.',
      '9. Vocabulaire français de radiologie, pas d\'anglicismes, pas d\'abréviations dans le texte final (sauf UH, mm, VCI et les noms de classifications).',
      '10. Conclusion (rubrique AU TOTAL ou celle du modèle) : l\'anomalie principale d\'abord (« Aspect en faveur de… », « Aspect évocateur de… » si les signes le justifient), puis les découvertes secondaires ; courte, sans redire la sémiologie ; une recommandation de suivi seulement si une recommandation reconnue s\'applique. Examen normal : une seule ligne.',
      '',
      'FORMAT DE LA RÉPONSE',
      'Texte brut, sans Markdown, sans astérisques ni dièses. D\'abord le compte rendu complet, du titre à la conclusion.',
      'Puis une ligne contenant exactement ' + MARQUE_VERIFIER + ' suivie d\'une liste à tirets : informations manquantes, ambiguïtés, négations importantes absentes, contradictions entre les notes et le modèle, champs laissés entre crochets. S\'il n\'y a rien, écris « Rien à signaler. ».',
    ];
    if (images) {
      lignes.push(
        'Puis une ligne contenant exactement ' + MARQUE_REGARD + ' suivie de ton second regard sur les ' + images + ' image(s) jointe(s) (coupes clés anonymisées, choisies par le radiologue) :',
        '- ce qui confirme ou ne confirme pas les notes ;',
        '- toute anomalie qui te semble visible et que les notes ne citent pas ;',
        '- les limites de ta lecture (coupes isolées, fenêtrage, absence de comparaison).',
        'Formulation prudente, en quelques lignes à tirets. Les images ne doivent JAMAIS modifier le compte rendu, qui repose uniquement sur les notes.'
      );
    }
    lignes.push('', EXEMPLES, '', 'MODÈLE NORMAL' + (d.titreModele ? ' (« ' + txt(d.titreModele) + ' »)' : '') + ' :', txt(d.modele), '',
      'DONNÉES DE L\'EXAMEN :');
    if (sexe) lignes.push('Patient(e) : ' + sexe);
    lignes.push(
      'Indication : ' + (txt(d.indication) || 'non précisée'),
      'Technique réalisée : ' + (txt(d.technique) || 'celle du modèle'),
      'Examen antérieur : ' + (txt(d.anterieur) || 'aucun'));
    if (txt(d.pdl)) lignes.push('Produit dose-longueur (à écrire à la fin de la technique) : PDL = ' + txt(d.pdl) + ' mGy·cm.');
    lignes.push('Notes du radiologue :', notes);
    return lignes.join('\n');
  }

  function lireReponse(texte) {
    const t = String(texte ?? '').replace(/\*\*/g, '').replace(/^#+\s*/gm, '');
    const iV = t.indexOf('===À VÉRIFIER');
    const iR = t.indexOf('===SECOND REGARD');
    const fins = [iV, iR].filter(i => i >= 0);
    const cr = (fins.length ? t.slice(0, Math.min(...fins)) : t).trim();
    const morceau = (debut, autre) => {
      if (debut < 0) return '';
      const fin = autre > debut ? autre : t.length;
      return t.slice(debut, fin).replace(/^=+[^=\n]*=+/, '').trim();
    };
    const verifier = morceau(iV, iR).split('\n')
      .map(s => s.replace(/^\s*[-•–*]\s*/, '').trim())
      .filter(s => s && !/^rien à signaler/i.test(s));
    return { cr, verifier, secondRegard: morceau(iR, iV) };
  }

  const NOMBRE = /\d+(?:[.,]\d+)?/g;
  const norme = n => n.replace(',', '.').replace(/^0+(?=\d)/, '');
  function chiffresInventes(cr, sources) {
    const permis = new Set(['2019', '1.1', '2.1']);
    (Array.isArray(sources) ? sources : [sources]).forEach(s => (String(s ?? '').match(NOMBRE) || []).forEach(n => permis.add(norme(n))));
    const vus = new Set();
    return (String(cr ?? '').match(NOMBRE) || []).map(norme).filter(n => {
      if (permis.has(n) || vus.has(n)) return false;
      vus.add(n); return true;
    });
  }

  const REPERES = [
    [/\b(né|née)\s+le\b/i, '« né(e) le »'],
    [/\b\d{1,2}[\/.-]\d{1,2}[\/.-](19|20)\d{2}\b/, 'une date complète'],
    [/\b\d{8}\b/, 'un numéro à 8 chiffres (CIN ?)'],
    [/\b(Mme|Mlle|Mr|M\.|Monsieur|Madame)\s+[A-ZÀ-Ý][a-zà-ÿ]+/, 'un nom après une civilité'],
    [/(\+216\s?|\b)[2-9]\d\s\d{3}\s\d{3}\b/, 'un numéro de téléphone'],
  ];
  function donneesIdentifiantes(texte) {
    const t = String(texte ?? '');
    return REPERES.filter(([re]) => re.test(t)).map(([, l]) => l);
  }

  function verifierDemande(d) {
    if (!d || typeof d !== 'object') return 'Demande vide.';
    if (!txt(d.notes)) return 'Saisissez vos constatations.';
    if (txt(d.notes).length > LIMITES.notes) return 'Notes trop longues (' + LIMITES.notes + ' caractères au plus).';
    if (!txt(d.modele)) return 'Choisissez un modèle de compte rendu.';
    if (txt(d.modele).length > LIMITES.modele) return 'Modèle trop long.';
    for (const k of ['indication', 'technique', 'anterieur', 'pdl', 'titreModele']) {
      if (txt(d[k]).length > LIMITES.champ) return 'Champ « ' + k + ' » trop long.';
    }
    if (d.pdl != null && txt(d.pdl) && !/^\d{1,5}([.,]\d{1,2})?$/.test(txt(d.pdl))) return 'PDL invalide.';
    const ids = donneesIdentifiantes([d.notes, d.indication, d.anterieur].join('\n'));
    if (ids.length) return 'Possible donnée identifiante (' + ids.join(', ') + ') : retirez-la.';
    return null;
  }

  return { construireConsigne, lireReponse, chiffresInventes, donneesIdentifiantes, verifierDemande, LIMITES, MARQUE_VERIFIER, MARQUE_REGARD };
});
