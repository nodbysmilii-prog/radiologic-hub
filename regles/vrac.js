/* =========================================================
   RadiologicHub — Comptes rendus : « Écrire en vrac »
   ---------------------------------------------------------
   Le radiologue écrit ses constatations en vrac (une par ligne, ou
   séparées par des points / points-virgules) ; le compte rendu est
   généré à partir d'un compte rendu type « normal » :
   • chaque constatation est rattachée à un organe (ORGANES : mots-clés,
     abréviations développées) ;
   • elle remplace, à sa place, la phrase normale de cet organe dans le
     modèle (les constatations d'un même organe se suivent) ;
   • sans phrase de cet organe dans le modèle : « Par ailleurs : » à la
     fin des résultats (rien n'est perdu) ;
   • « indication : … » / « RC : … » remplit les renseignements cliniques,
     « conclusion : … » / « au total : … » la conclusion ; sans conclusion
     écrite, elle reprend les constatations.
   Aucune donnée n'est envoyée : tout se fait dans le navigateur.
   Module sans dépendance au navigateur (testé sous Node :
   tests/vrac.test.js).
   ========================================================= */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.RHRegles = root.RHRegles || {}).vrac = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const norm = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[œ]/g, 'oe').replace(/[æ]/g, 'ae').toLowerCase();

  /* Organes, par ordre de priorité [id, nom, motif, exclusions] : une constatation va au premier organe reconnu qui a une phrase
     dans le modèle (« anévrisme » : polygone de Willis en neuro, aorte en abdominal…).
     Motifs écrits sans accents (texte normalisé). */
  const ORGANES = [
    // ----- neuro -----
    ['sinus-veineux', 'sinus veineux', /\bsinus (veineux|longitudinal|sagittal|lateral|transverse|sigmoide|droit|caverneux)|thrombose veineuse cerebrale|thrombophlebite cerebrale|\btvc\b|veines? cerebrales?/],
    ['hemorragie', 'hémorragie', /hemorrag|hematome|saignement|hemosiderine|cavernome|sous-durale?|extra-durale?|\bhs[ad]\b|\bhed\b/, /sous-cutane|cuir chevelu|psoas|paroi|retroperiton|muscle|hepat|renal|splen|surrenal|alveolaire|intra-abdominal/],
    ['citernes', 'citernes', /citerne|sous-arachno|hemorragie meningee/],
    ['ligne-mediane', 'structures médianes', /structures? mediane|ligne mediane|deviation|engagement|effet de masse/, /cloison|nasal|trache|rachi|scoli/],
    ['v4', '4e ventricule', /\b(4e|quatrieme|iv e?) ventricule|\bv4\b/],
    ['hydrocephalie', 'ventricules', /hydrocephal|ventricul|\bv3\b/, /ventricule (droit|gauche)|cardiaque|\bvd\b|\bvg\b|periventricul|sous-ependym|juxta-?ventricul/],
    ['canal', 'canal rachidien', /stenose (canalaire|foraminale|du canal|recessale)|canal (rachidien|cervical|lombaire|etroit)|retrecissement canalaire/],
    ['spondylolisthesis', 'spondylolisthésis', /spondylolisthesis|listhesis|lyse isthmique/],
    ['disque', 'disques', /discopathie|\bdisques?\b|discal|hernie discale|protrusion|bombement|debord/],
    ['moelle', 'moelle', /moelle|medullaire|myelopathie|syringo/],
    ['charniere', 'charnière', /charniere|cervico-occipital|chiari/],
    ['arteres-encephale', 'artères', /polygone|willis|anevrisme (cerebral|de l.?artere (cerebrale|communicante|basilaire|carotide))|\bacm\b|\baca\b|\bacp\b|artere (cerebrale|basilaire|vertebrale|carotide|communicante)|siphon|carotide interne|stenose carotid|dissection/],
    ['fosse-posterieure', 'fosse postérieure', /cerebel|tronc cerebral|\bpont\b|protuberance|bulbe|mesencephal|vermis|fosse posterieure|sous-tentoriel/],
    ['processus-expansif', 'processus expansif', /processus expansif|lesion expansive|meningiome|gliome|glioblastome|metastases? (cerebrale|intracranienne)|tumeur (cerebrale|intracranienne)|neurinome|schwannome|adenome hypophysaire/],
    ['sinus-face', 'sinus de la face', /\bsinus (maxillaire|frontal|sphenoid|ethmoid)|sinusite|cavites? naso|naso-sinusien|comblement|polype|mucocele|kyste (de retention|muqueux)|cornet|cloison nasale|meat/],
    ['orbites', 'orbites', /orbit/],
    ['mastoides', 'mastoïdes', /mastoid|oreille|rocher|tympan|osselet|cholesteatome/],
    ['cerveau', 'parenchyme cérébral', /cerebral|encephal|sus-tentoriel|frontal|pariet|temporal|occipital|insula|thalam|lenticul|caude|capsul|semi-ovale|corona radiata|substance blanche|leucopathie|leuco-araiose|hypersignaux|lacune|ischemi|\bavc\b|infarctus cerebral|atrophie cortico|demyelinis|corps calleux|hippocamp/, /fracture|osseu|\bos\b|sinus|scalp|cuir chevelu|sous-cutane/],
    ['thyroide', 'thyroïde', /thyro|goitre/],
    ['salivaires', 'glandes salivaires', /parotid|submandibul|sous-mandibul|salivaire/],
    // ----- ganglions (avant les organes : « adénopathie du hile hépatique ») -----
    ['ganglions-paroi', 'ganglions axillaires, mammaires internes, sus-claviculaires', /(adenomegal|adenopath|ganglion|\badp\b)[^.]*(axill|mammaire interne|sus-clavicul)|(axill|sus-clavicul)[^.]*(adenomegal|adenopath|ganglion)/],
    ['ganglions-cervicaux', 'ganglions cervicaux', /(adenomegal|adenopath|ganglion|\badp\b)[^.]*(cervical|jugulo|sous-mandibul|spinal|groupe? (i|ii|iii|iv|v|vi)\b|secteur)/],
    ['ganglions-mediastin', 'ganglions médiastinaux et hilaires', /(adenomegal|adenopath|ganglion|\badp\b)[^.]*(mediastin|hilaire|hile pulmonaire|sous-carin|latero-trache|para-trache|retro-trache|pre-vasculaire|prevasculaire|para-aortique|sous-aortique|para-oesophag|ligament triangulaire|fenetre aorto|barety|\b(2|4|10)[rl]\b|\((3a|3p|[5-9])\))/],
    ['ganglions-abdo', 'ganglions abdominaux et pelviens', /adenomegal|adenopath|ganglion|\badp\b/],
    // ----- thorax -----
    ['embolie', 'artères pulmonaires', /embol|defect endoluminal|artere pulmonaire|tronc pulmonaire|htap/],
    ['pericarde', 'péricarde', /pericard/],
    ['coeur-vaisseaux-thorax', 'cœur et gros vaisseaux', /cardi|coeur|coronair|aorte (thoracique|ascendante|descendante)|crosse|\bvcs\b|veine cave superieure|tronc arteriel brachio|sous-claviere|aort|ventricule (droit|gauche)|oreillette|\bvd\b|\bvg\b/, /abdominal|sous-renal|iliaque|coeliaque|mesenteri/],
    ['trachee-bronches', 'trachée et bronches', /trache|bronch|\bddb\b|impactions? mucoide/],
    ['plevre', 'plèvre', /pleur|pneumothorax|\bpno\b|hydrothorax/],
    ['poumon', 'parenchyme pulmonaire', /pulmon|parenchym|nodul|micronodul|verre depoli|condensation|consolidation|emphysem|fibrose|reticul|rayon de miel|atelecta|pneumopathie|infiltrat|\blobe (superieur|inferieur|moyen)|lingul|segment (apical|dorsal|ventral|anterieur|posterieur|basal|lateral|median|nelson)|excavation|masse (pulmonaire|du lobe)|\b(lsd|lid|lsg|lig|lm)\b|apex|bases? pulmonaire|scissur|crazy/, /hepat|foie|renal|\breins?\b|surrenal|thyro|pancrea|splen|\brate\b|\bsein|mammaire|cutane|prostat|uter|ovair|vesical|vessie|cerebr|osseu|pleur/],
    ['paroi-thorax', 'paroi thoracique, seins', /\bsein|mammaire|paroi thoracique|axill/],
    // ----- abdomen -----
    ['vaisseaux-foie', 'tronc porte, veines hépatiques, VCI', /porte|portal|veines? (sus-)?hepatiques?|\bvci\b|veine cave inferieure|cavernome porte|\btips\b/],
    ['voies-biliaires', 'voies biliaires', /voies? biliaires?|\bvbp\b|\bvbih\b|choledoque|canal hepatique|cholangi|aerobilie|ampoule de vater|ampullome/],
    ['vesicule', 'vésicule biliaire', /vesicul(?!es? seminale)|cholecyst|lithiase biliaire|\bvb\b|sludge|boue biliaire/],
    ['foie', 'foie', /foie|hepat|steatose|cirrhos|\bsegments? (i|ii|iii|iv|iva|ivb|v|vi|vii|viii)\b|angiome|hemangiome|kyste biliaire|\bhnf\b|\bchc\b|dysmorphi(e|que) hepatique/, /cerebr|vertebr|osseu/],
    ['pancreas', 'pancréas', /pancrea|wirsung|tipmp|\bipmn\b/],
    ['rate', 'rate', /\brate\b|splen|rate accessoire/],
    ['surrenales', 'surrénales', /surrenal/],
    ['calculs-urinaires', 'calculs urinaires', /macrocalcul|nephrolith|nephrocalcinose|(calcul|lithiase)s? (renale?|urinaire|ureter|calicie|pyel|du rein|caliciel)|(calcul|lithiase)s?[^.]*(rein|renal|uretere|calice|pyel)/],
    ['cavites-urinaires', 'cavités pyélo-calicielles', /pyelo|calici|bassinet|cavites? (excretrices|pyelo)|hydronephrose|ureterohydro|ureter|jonction pyelo|syndrome de jonction|dilatation des cavites/],
    ['reins', 'reins', /\breins?\b|renal|renaux|nephr|cortico-medullaire|bosniak|pyelonephrite|angiomyolipome|hypotrophie renale/, /artere renale|veine renale|sous-renal|sous renal|aort/],
    ['vessie', 'vessie', /vessie|vesical/],
    ['prostate', 'prostate', /prostat|vesicules? seminale/],
    ['pelvis', 'pelvis (utérus, ovaires, annexes)', /uter|ovair|ovari|annex|endometr|myome|douglas|pelvi|kyste fonctionnel|hydrosalpinx/],
    ['vaisseaux-abdo', 'vaisseaux abdominaux', /aort|anevrism|atherom|mesenteri|iliaque|femoral|tronc coeliaque|artere renale|\baaa\b/],
    ['tube-digestif', 'tube digestif', /colon|colique|colite|sigmoid|rectum|rectal|caecum|cecum|caecal|grele|ileal|ileon|jejun|duoden|estomac|gastr|appendic|diverticul|\banses?\b|occlusion|ileus|oesophag|bezoard|invagination|stercoral|fecal|hiatal/],
    ['peritoine', 'épanchement et péritoine', /ascite|epanchement (intra-)?abdominal|epanchement peritoneal|peritoine|peritonite|liquide libre|lame liquidienne|carcinose|pneumoperitoine|mesentere|panniculite|graisse/],
    ['paroi-abdo', 'paroi abdominale', /hernie|eventration|paroi abdominale|ombilic|inguinal/, /hiatal|discale/],
    ['masse-pelvienne', 'masse pelvienne', /masse pelvienne/],
    // ----- os -----
    ['os', 'os', /\bos\b|osseu|osteo|lyse|lytique|condensant|fracture|tassement|vertebr|\bcotes?\b|costal|sternum|sacr|femur|humer|\bbassin\b|cotyle|arthros|spondyl|\b[ld][1-9]\b|\bd1[0-2]\b|metastases? osseuse|enchondrome|ilot/],
    ['epanchement', 'épanchement', /epanchement/],
  ];
  const NOM = Object.fromEntries(ORGANES.map(([id, nom]) => [id, nom]));

  /* Abréviations courantes développées (en majuscules, mot entier) */
  const ABREV = [
    [/\bLSD\b/g, 'lobe supérieur droit'], [/\bLID\b/g, 'lobe inférieur droit'], [/\bLSG\b/g, 'lobe supérieur gauche'],
    [/\bLIG\b/g, 'lobe inférieur gauche'], [/\bLM\b/g, 'lobe moyen'], [/\bVBP\b/g, 'voie biliaire principale'],
    [/\bVBIH\b/g, 'voies biliaires intra-hépatiques'], [/\bVB\b/g, 'vésicule biliaire'], [/\bADPs\b/g, 'adénopathies'], [/\bADP(?= (?!sous\b|sus\b|dans\b|plus\b|très\b)[a-zà-ÿ-]+(?:es|aux)\b)/g, 'adénopathies'], [/\bADP\b/g, 'adénopathie'],
    [/\bHSA\b/g, 'hémorragie sous-arachnoïdienne'], [/\bHSD\b/g, 'hématome sous-dural'], [/\bHED\b/g, 'hématome extra-dural'],
    [/\bAAA\b/g, 'anévrisme de l\'aorte abdominale'], [/\bPNO\b/g, 'pneumothorax'], [/\bTVC\b/g, 'thrombose veineuse cérébrale'],
    [/\bDDB\b/g, 'dilatation des bronches'], [/\bNGC\b/g, 'noyaux gris centraux'], [/\bSB\b/g, 'substance blanche'],
    [/\bACM\b/g, 'artère cérébrale moyenne'], [/\bACA\b/g, 'artère cérébrale antérieure'], [/\bACP\b/g, 'artère cérébrale postérieure'],
    [/\bFID\b/g, 'fosse iliaque droite'], [/\bFIG\b/g, 'fosse iliaque gauche'], [/\bHCD\b/g, 'hypochondre droit'], [/\bHCG\b/g, 'hypochondre gauche'],
    [/\bEP\b/g, 'embolie pulmonaire'], [/\bTIPMP\b/g, 'TIPMP'],
  ];

  const PREFIXABLES = ['carinaire', 'rénale?s?', 'renale?s?', 'capsulaires?', 'pleurale?s?', 'cutanée?s?', 'cutanee?s?', 'diaphragmatiques?', 'aortiques?',
    'claviculaires?', 'mésocoliques?', 'mesocoliques?', 'hépatiques?', 'hepatiques?', 'segmentaires?', 'muqueux', 'muqueuses?', 'péritonéale?s?', 'peritoneale?s?',
    'tentoriel(?:le)?s?', 'durale?s?', 'arachnoïdien(?:ne)?s?', 'arachnoidien(?:ne)?s?', 'chondrale?s?', 'corticale?s?', 'vésicale?s?', 'vesicale?s?', 'caves?',
    'trachéale?s?', 'tracheale?s?', 'sternale?s?', 'axiale?s?', 'lobulaires?', 'scissurale?s?', 'ventriculaires?', 'oesophagiennes?', 'œsophagiennes?', 'vasculaires?'].join('|');

  /* Mise en forme d'une constatation : abréviations, unités, nombres, majuscule, point final */
  function phrase(brut) {
    let t = String(brut ?? '').replace(/\s+/g, ' ').trim();
    for (const [re, mot] of ABREV) t = t.replace(re, mot);
    t = t.replace(/(\d)\.(\d)/g, '$1,$2')                              // 2.5 → 2,5
      .replace(/(\d)\s*(mm|cm|ml|mL|UH|HU)\b/g, '$1 $2')                // 8mm → 8 mm
      .replace(/(\d)\s*[x×*]\s*(\d)/g, '$1 x $2')                      // 2x3 → 2 x 3
      .replace(/\s+([,.;:])/g, '$1').replace(/[\s,;:.]+$/, '')
      // « sous carinaire » → « sous-carinaire »
      .replace(new RegExp(`\\b(sous|sus|rétro|retro|intra|extra|péri|peri|para|pré|pre|inter|latéro|latero|infra|supra) (${PREFIXABLES})`, 'gi'), '$1-$2')
      // « nodule lobe inférieur droit » → « nodule du lobe inférieur droit »
      .replace(/([a-zà-ÿ]{3,}) (lobe (?:supérieur|inférieur|moyen))/gi, (m, a, b) => /^(du|de|le|au|dans|en|des|la|un|ce|et|ou|petit)$/i.test(a) ? m : `${a} du ${b}`)
      // « nodule 8 mm » → « nodule de 8 mm »
      .replace(/([a-zà-ÿ)]) (\d+(?:,\d+)?(?: x \d+(?:,\d+)?)* (?:mm|cm))/gi, (m, a, b, pos, tout) =>
        /(?:^|[\s(])(de|à|a|mesurant|environ|fait|sur|par|puis|vs|et|ou|contre|jusqu'à)$/i.test(tout.slice(0, pos + 1)) ? m : `${a} de ${b}`);
    if (!t) return '';
    return t.charAt(0).toUpperCase() + t.slice(1) + '.';
  }

  /* Organes reconnus dans un texte, par ordre de priorité */
  function organes(texte) {
    const n = norm(texte);
    return ORGANES.filter(([, , re, sauf]) => re.test(n) && !(sauf && sauf.test(n))).map(([id]) => id);
  }

  /* Découpage du texte en vrac : lignes, puis « . » (pas entre deux chiffres) et « ; » */
  const PREFIXE = /^\s*(conclusion|au total|ccl|synthese|indication|rc|renseignements? cliniques?|contexte|motif|technique)\s*:\s*/;
  function decouper(vrac) {
    const out = [];
    let mode = 'constat';
    for (const brute of String(vrac ?? '').split(/\r?\n/)) {
      let l = brute.replace(/^\s*(?:[-–—•*]|\d+[).]\s)\s*/, '').trim();
      if (!l) continue;
      const m = PREFIXE.exec(norm(l));
      if (m) {
        const k = m[1];
        mode = /conclusion|au total|ccl|synthese/.test(k) ? 'conclusion' : /technique/.test(k) ? 'technique' : 'indication';
        l = l.slice(m[0].length).trim();
        if (!l) continue;
        if (mode !== 'conclusion' && mode !== 'constat') { out.push({ type: mode, texte: l }); mode = 'constat'; continue; }
      }
      const morceaux = l.split(/;\s*|(?<!\d)\.\s+|\.(?=\s*$)|(?<=\d)\.\s+(?=[A-Za-zÀ-ÿ])/).map(x => x.trim()).filter(Boolean);
      for (const x of morceaux) out.push({ type: mode, texte: x });
    }
    return out;
  }

  /* Étage vertébral (« C5-C6 », « L5 S1 », « l4/l5 ») → « C5-C6 » */
  function niveau(texte) {
    const m = /\b([cdtls])\s?(\d{1,2})\s*[-/ ]\s*([cdtls])\s?(\d{1,2})\b/i.exec(String(texte));
    return m ? `${m[1].toUpperCase()}${m[2]}-${m[3].toUpperCase()}${m[4]}` : null;
  }

  /* Lecture du modèle : rubriques et lignes de constatation */
  const TITRE = l => /^\s*[*]?[^•\-–][^:]{0,80}:\s*$/.test(l) || /^\s*[A-ZÉÈÀÂÎÔÛÇ0-9 '’/()-]{4,}$/.test(l.trim());
  const RESULTATS = l => /^\s*(resultats?|constatations?|description)\s*:?\s*$/.test(norm(l));
  const CONCLUSION = l => /^\s*(conclusion|au total|synthese|en conclusion)\s*:?\s*$/.test(norm(l));
  const INDICATION = l => /^\s*(renseignements? cliniques?|indications?|motif|contexte|histoire clinique)\s*:?\s*$/.test(norm(l));
  const TECHNIQUE = l => /^\s*(technique|protocole)\s*:?\s*$/.test(norm(l));

  function generer(modele, vrac) {
    const L = String(modele ?? '').split('\n');
    const items = decouper(vrac);
    const r = L.findIndex(RESULTATS), c = L.findIndex(CONCLUSION);
    const debut = r >= 0 ? r + 1 : 0, fin = c > debut ? c : L.length;

    // Lignes de constatation du modèle, leur(s) organe(s) et l'étage vertébral de leur sous-titre (« C5-C6 : »)
    const lignes = [];
    let etage = null;
    for (let i = debut; i < fin; i++) {
      const l = L[i];
      if (!l.trim()) continue;
      if (TITRE(l)) { etage = niveau(l); continue; }
      const o = organes(l);
      if (o.length) lignes.push({ i, organe: o[0], tous: o, etage });
    }

    const remplace = new Map();   // indice de ligne → constatations
    const ailleurs = [], bilan = [], conclusion = [];
    let indication = null;
    const technique = [];
    for (const it of items) {
      const p = phrase(it.texte);
      if (!p) continue;
      if (it.type === 'indication') { indication = p; continue; }
      if (it.type === 'technique') { technique.push(p); continue; }
      if (it.type === 'conclusion') { conclusion.push(p); continue; }
      const cand = organes(p), et = niveau(p);
      // étage cité (« hernie discale C5-C6 ») : lignes de cet étage d'abord
      const parmi = et && lignes.some(x => x.etage === et) ? [lignes.filter(x => x.etage === et), lignes] : [lignes];
      let cible = null, organe = null;
      for (const o of cand) {
        for (const ls of parmi) { cible = ls.find(x => x.organe === o) || ls.find(x => x.tous.includes(o)); if (cible) break; }
        if (cible) { organe = o; break; }
      }
      if (cible) {
        if (!remplace.has(cible.i)) remplace.set(cible.i, []);
        remplace.get(cible.i).push(p);
        let t = cible.i - 1; while (t >= 0 && !(L[t].trim() && TITRE(L[t]))) t--;
        const rubrique = t >= 0 && t >= debut ? L[t].trim().replace(/^[*]/, '').replace(/\s*:\s*$/, '') : null;
        bilan.push({ texte: p, organe, nom: NOM[organe], remplace: L[cible.i].replace(/^\s*•\s*/, ''), ligne: cible.i, rubrique });
      } else {
        ailleurs.push(p);
        bilan.push({ texte: p, organe: cand[0] || null, nom: cand[0] ? NOM[cand[0]] : null, remplace: null });
      }
    }

    // Reconstruction
    const out = [];
    for (let i = 0; i < L.length; i++) {
      const l = L[i];
      if (remplace.has(i)) {
        const puce = /^\s*•/.test(l) ? (l.match(/^\s*•\s*/) || ['• '])[0] : '';
        for (const p of remplace.get(i)) out.push(puce + p);
        continue;
      }
      if (i === fin && ailleurs.length) {
        while (out.length && !out[out.length - 1].trim()) out.pop();
        const sousTitres = lignes.length && L.slice(debut, fin).some(x => x.trim() && TITRE(x));
        if (sousTitres) out.push('', 'Par ailleurs :');
        for (const p of ailleurs) out.push('• ' + p);
        out.push('');
      }
      out.push(l);
    }
    if (fin === L.length && ailleurs.length) { if (out.length && out[out.length - 1].trim()) out.push(''); out.push('Par ailleurs :', ...ailleurs.map(p => '• ' + p)); }

    let texte = out.join('\n');
    const T = texte.split('\n');
    // Renseignements cliniques / indication
    if (indication) {
      const k = T.findIndex(INDICATION);
      if (k >= 0) {
        let j = k + 1; while (j < T.length && !T[j].trim()) j++;
        if (j < T.length && !TITRE(T[j])) T[j] = indication; else T.splice(k + 1, 0, indication);
      } else T.splice(Math.max(1, T.findIndex(x => !x.trim()) + 1), 0, 'RENSEIGNEMENTS CLINIQUES :', indication, '');
    }
    // Technique (ajoutée à la rubrique)
    if (technique.length) {
      const k = T.findIndex(TECHNIQUE);
      if (k >= 0) { let j = k + 1; while (j < T.length && T[j].trim()) j++; T.splice(j, 0, ...technique); }
    }
    // Conclusion : écrite par le radiologue, sinon les constatations pathologiques
    const constats = bilan.map((b, n) => ({ b, n })).sort((x, y) => (x.b.ligne ?? 1e9) - (y.b.ligne ?? 1e9) || x.n - y.n).map(x => x.b.texte);
    const ccl = conclusion.length ? conclusion : constats;
    let k = T.findIndex(CONCLUSION);
    if (ccl.length) {
      const corps = ccl.length === 1 ? ccl : ccl.map(p => '• ' + p);
      if (k < 0) { while (T.length && !T[T.length - 1].trim()) T.pop(); T.push('', 'CONCLUSION :', ...corps); }
      else { let j = k + 1; while (j < T.length && !(T[j].trim() && TITRE(T[j]) && !/^\s*•/.test(T[j]))) j++; T.splice(k + 1, j - k - 1, ...corps); }
    }
    texte = T.join('\n');
    return { texte, bilan, conclusionEcrite: conclusion.length > 0, indication: !!indication };
  }

  return { ORGANES, organes, phrase, decouper, generer, niveau, norm };
});
