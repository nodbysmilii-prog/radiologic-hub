/* =========================================================
   RadiologicHub — Comptes rendus : classifications et scores
   ---------------------------------------------------------
   Outils déclaratifs (champs + calcul) ajoutés au volet « Schémas et
   calculateurs » par cr-tools.js. Chaque outil :
     { id, titre, chip, sub, groupe, cles, suggere, aide,
       init(), champs(st) → [{ f, label, type: 'sel'|'num'|'chk', options, large }],
       calcul(st) → { badge, niveau: 'ok'|'bas'|'moyen'|'haut'|'neutre', texte, conclusion } }
   Le texte est inséré au curseur (résultat + conclusion proposée).
   Références (à faire vérifier médicalement, comme les autres règles) :
   • O-RADS US v2022 (ACR, Strachowski 2023) ; O-RADS MRI (ACR 2020/2023, Thomassin-Naggara)
   • LI-RADS CT/MRI v2018 (ACR)
   • Fisher modifié (Frontera 2006) ; Fazekas 1987 ; Scheltens (MTA) 1992
   • AO Spine thoraco-lombaire (Vaccaro 2013, score TL AOSIS 2016) et cervical subaxial (2016)
   • Kellgren-Lawrence 1957 ; ARCO 2019 ; angle alpha (Nötzli 2002), LCE (Wiberg), index acétabulaire (Tönnis)
   • Garden, Pauwels, Neer (1970), Schatzker, Salter-Harris
   • CTSI (Balthazar 1990) et CTSI modifié (Mortele 2004) ; Hinchey modifié (Wasvary 1999)
   • Parks 1976 ; St James's University Hospital (Morris 2000)
   • AAST révision 2018 (foie, rate, rein) ; AAST pancréas (Moore 1990)
   • iRECIST (Seymour 2017) ; wash-out surrénalien (absolu ≥ 60 %, relatif ≥ 40 % ; ≤ 10 UH sans injection)
   Module sans dépendance au navigateur (testé sous Node : tests/classifications.test.js).
   ========================================================= */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.RHRegles = root.RHRegles || {}).classifications = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const num = v => { const n = parseFloat(String(v ?? '').replace(',', '.')); return Number.isFinite(n) ? n : null; };
  const fr = (n, d = 1) => String(Math.round(n * 10 ** d) / 10 ** d).replace('.', ',');
  const NON = [['', '—']];
  const vide = (badge = 'À compléter') => ({ badge, niveau: 'neutre', texte: '', conclusion: '' });
  const liste = a => a.length < 2 ? a.join('') : `${a.slice(0, -1).join(', ')} et ${a[a.length - 1]}`;

  /* Classification « choisir un grade » : options [valeur, libellé, description, niveau] */
  function grades(def) {
    return {
      ...def,
      init: () => ({ g: '' }),
      champs: () => [{ f: 'g', label: def.question || 'Type', type: 'sel', large: true, options: [...NON, ...def.grades.map(([v, l, d]) => [v, `${l} — ${d}`])] }],
      calcul(st) {
        const g = def.grades.find(x => x[0] === st.g);
        if (!g) return vide();
        const [, l, d, niveau] = g;
        return { badge: `${def.court || def.chip} ${l}`, niveau: niveau || 'moyen', texte: `${def.phrase || def.chip} ${l} : ${d}.`, conclusion: def.conclure ? def.conclure(g) : `${def.phrase || def.chip} ${l}.` };
      },
    };
  }

  const DEFS = [];

  /* ===================== Gynécologie ===================== */
  DEFS.push({
    id: 'orads-us', groupe: 'Gynécologie', titre: 'O-RADS échographie (v2022)', chip: 'O-RADS écho', sub: 'masse annexielle',
    cles: ['orads', 'oradsecho'], suggere: /ovair|annex|o-?rads/,
    aide: 'Lexique O-RADS US 2022 : type de lésion, taille maximale, paroi, composante solide, score couleur (CS 1 à 4), statut ménopausique. Les lésions bénignes classiques (kyste hémorragique, dermoïde, endométriome, kyste para-ovarien, kyste d\'inclusion péritonéal, hydrosalpinx) se classent à part.',
    init: () => ({ type: '', taille: '', meno: 'pre', paroi: 'lisse', papilles: '', cs: '1', ascite: false }),
    champs: st => [
      { f: 'type', label: 'Lésion', type: 'sel', large: true, options: [...NON, ['normal', 'Ovaire normal / follicule ≤ 3 cm / corps jaune ≤ 3 cm'], ['classique', 'Lésion bénigne classique (hémorragique, dermoïde, endométriome, para-ovarien, kyste d\'inclusion, hydrosalpinx)'], ['simple', 'Kyste uniloculaire simple'], ['uni-ns', 'Kyste uniloculaire non simple (échos internes, cloisons incomplètes)'], ['uni-solide', 'Kyste uniloculaire avec composante solide'], ['bilo', 'Kyste biloculaire sans composante solide'], ['multi', 'Kyste multiloculaire sans composante solide'], ['multi-solide', 'Kyste bi- ou multiloculaire avec composante solide'], ['solide', 'Lésion solide (≥ 80 % solide)']] },
      { f: 'taille', label: 'Taille maximale (cm)', type: 'num' },
      { f: 'meno', label: 'Statut', type: 'sel', options: [['pre', 'Non ménopausée'], ['post', 'Ménopausée']] },
      ...(/^(uni-ns|bilo|multi|solide|simple)$/.test(st.type) ? [{ f: 'paroi', label: st.type === 'solide' ? 'Contours' : 'Paroi interne / cloisons', type: 'sel', options: [['lisse', st.type === 'solide' ? 'Réguliers' : 'Lisse'], ['irreguliere', st.type === 'solide' ? 'Irréguliers' : 'Irrégulière (< 3 mm pour l\'uniloculaire)']] }] : []),
      ...(st.type === 'uni-solide' ? [{ f: 'papilles', label: 'Composante solide', type: 'sel', options: [['', '—'], ['1-3', '1 à 3 projections papillaires ou solide non papillaire'], ['4', '≥ 4 projections papillaires']] }] : []),
      ...(/^(multi|multi-solide|solide)$/.test(st.type) ? [{ f: 'cs', label: 'Score couleur', type: 'sel', options: [['1', 'CS 1 (pas de flux)'], ['2', 'CS 2 (flux minime)'], ['3', 'CS 3 (flux modéré)'], ['4', 'CS 4 (flux intense)']] }] : []),
      { f: 'ascite', label: 'Ascite et/ou nodules péritonéaux', type: 'chk' },
    ],
    calcul(st) {
      const T = num(st.taille), cs = +st.cs || 1, lisse = st.paroi !== 'irreguliere', post = st.meno === 'post';
      let c = null, motif = '';
      if (st.ascite) { c = 5; motif = 'ascite et/ou nodules péritonéaux'; }
      else if (!st.type) return vide();
      else if (st.type === 'normal') { c = 1; motif = 'ovaire normal'; }
      else if (st.type === 'classique') { if (T == null) return vide('Taille ?'); c = T < 10 ? 2 : 3; motif = `lésion bénigne classique ${T < 10 ? '< 10 cm' : '≥ 10 cm'}`; }
      else if (T == null) return vide('Taille ?');
      else if (st.type === 'simple') { c = T < 10 ? (!post && T <= 3 ? 1 : 2) : 3; motif = `kyste uniloculaire simple de ${fr(T)} cm`; }
      else if (st.type === 'uni-ns') {
        if (!lisse) { c = 3; motif = 'kyste uniloculaire à paroi interne irrégulière (< 3 mm)'; }
        else if (T >= 10) { c = 3; motif = 'kyste uniloculaire non simple ≥ 10 cm'; }
        else if (!post && T <= 3) { c = 2; motif = 'kyste uniloculaire non simple lisse ≤ 3 cm (non ménopausée)'; }
        else { c = 3; motif = 'kyste uniloculaire non simple lisse < 10 cm'; }
      }
      else if (st.type === 'uni-solide') { if (!st.papilles) return vide('Composante solide ?'); c = st.papilles === '4' ? 5 : 4; motif = st.papilles === '4' ? 'kyste uniloculaire avec ≥ 4 projections papillaires' : 'kyste uniloculaire avec composante solide'; }
      else if (st.type === 'bilo') { c = lisse ? (T < 10 ? 3 : 4) : 4; motif = `kyste biloculaire sans composante solide${lisse ? (T < 10 ? ' < 10 cm' : ' ≥ 10 cm') : ' à paroi irrégulière'}`; }
      else if (st.type === 'multi') { c = !lisse ? 4 : cs === 4 ? 4 : T >= 10 ? 4 : 3; motif = `kyste multiloculaire sans composante solide (${lisse ? 'paroi lisse' : 'paroi ou cloisons irrégulières'}, CS ${cs}, ${fr(T)} cm)`; }
      else if (st.type === 'multi-solide') { c = cs >= 3 ? 5 : 4; motif = `kyste bi- ou multiloculaire avec composante solide, CS ${cs}`; }
      else if (st.type === 'solide') { c = !lisse ? 5 : cs === 4 ? 5 : cs === 1 ? 3 : 4; motif = `lésion solide ${lisse ? 'à contours réguliers' : 'à contours irréguliers'}, CS ${cs}`; }
      const R = { 1: ['physiologique', 'ok'], 2: ['presque certainement bénin (< 1 %)', 'ok'], 3: ['risque faible de malignité (1 à < 10 %)', 'bas'], 4: ['risque intermédiaire (10 à < 50 %)', 'moyen'], 5: ['risque élevé (≥ 50 %)', 'haut'] }[c];
      return { badge: `O-RADS US ${c}`, niveau: R[1], texte: `Classification O-RADS échographique ${c} (${R[0]}) : ${motif}.`, conclusion: `Masse annexielle classée O-RADS US ${c} (${R[0]}).` };
    },
  });

  DEFS.push({
    id: 'orads-irm', groupe: 'Gynécologie', titre: 'O-RADS IRM', chip: 'O-RADS IRM', sub: 'masse annexielle',
    cles: ['oradsirm', 'oradsmri'], suggere: /ovair|annex|o-?rads/,
    aide: 'Score O-RADS IRM : présence de tissu solide rehaussé (courbe de perfusion DCE : type 1, 2 ou 3 ; à défaut, rehaussement à 30–40 s comparé au myomètre), contenu liquidien, graisse, implants péritonéaux.',
    init: () => ({ type: '', courbe: '', implants: false }),
    champs: st => [
      { f: 'type', label: 'Lésion', type: 'sel', large: true, options: [...NON, ['aucune', 'Pas de masse annexielle'], ['kyste-simple', 'Kyste uniloculaire, liquide simple ou endométriosique, sans tissu solide'], ['graisse', 'Lésion graisseuse sans tissu solide rehaussé'], ['t2noir', 'Tissu solide homogène en hyposignal T2 et en hyposignal diffusion b1000'], ['paroi', 'Kyste uniloculaire à paroi rehaussée fine et régulière'], ['kyste-autre', 'Kyste uniloculaire à contenu non simple (protéique, hémorragique non endométriosique, mucineux) sans tissu solide'], ['multi', 'Kyste multiloculaire sans tissu solide'], ['graisse-solide', 'Lésion graisseuse avec une large composante de tissu solide rehaussé'], ['solide', 'Tissu solide rehaussé (hors hyposignal T2 et diffusion homogène)']] },
      ...(st.type === 'solide' ? [{ f: 'courbe', label: 'Perfusion du tissu solide', type: 'sel', large: true, options: [...NON, ['1', 'Courbe type 1 (risque faible)'], ['2', 'Courbe type 2 (risque intermédiaire)'], ['3', 'Courbe type 3 (risque élevé)'], ['nd-faible', 'Sans DCE : rehaussement ≤ myomètre à 30–40 s'], ['nd-fort', 'Sans DCE : rehaussement > myomètre à 30–40 s']] }] : []),
      { f: 'implants', label: 'Nodules ou épaississements péritonéaux, mésentériques ou épiploïques (± ascite)', type: 'chk' },
    ],
    calcul(st) {
      let c = null;
      if (st.implants) c = 5;
      else if (!st.type) return vide();
      else c = { aucune: 1, 'kyste-simple': 2, graisse: 2, t2noir: 2, paroi: 2, 'kyste-autre': 3, multi: 3, 'graisse-solide': 4 }[st.type] || null;
      if (c == null && st.type === 'solide') {
        if (!st.courbe) return vide('Perfusion ?');
        c = { 1: 3, 2: 4, 3: 5, 'nd-faible': 3, 'nd-fort': 4 }[st.courbe];
      }
      const R = { 1: ['pas de lésion', 'ok'], 2: ['presque certainement bénin (< 0,5 %)', 'ok'], 3: ['risque faible (≈ 5 %)', 'bas'], 4: ['risque intermédiaire (≈ 50 %)', 'moyen'], 5: ['risque élevé (≈ 90 %)', 'haut'] }[c];
      return { badge: `O-RADS IRM ${c}`, niveau: R[1], texte: `Score O-RADS IRM ${c} (${R[0]}).`, conclusion: `Masse annexielle classée O-RADS IRM ${c} (${R[0]}).` };
    },
  });

  /* ===================== Foie ===================== */
  DEFS.push({
    id: 'lirads', groupe: 'Abdomen et digestif', titre: 'LI-RADS TDM / IRM (v2018)', chip: 'LI-RADS', sub: 'nodule hépatique (patient à risque)',
    cles: ['lirads'], suggere: /lirads|li-rads|cirrho|chc|carcinome hepato/,
    aide: 'Patient à risque de CHC uniquement. Hyperartérialisation non périphérique (APHE), taille, critères majeurs (wash-out non périphérique, capsule rehaussée, croissance seuil). Les critères accessoires font monter ou descendre d\'une catégorie (sans passer en LR-5 et sans déclasser un LR-5).',
    init: () => ({ directe: '', aphe: '', taille: '', washout: false, capsule: false, croissance: false, accessoire: '' }),
    champs: st => [
      { f: 'directe', label: 'Catégorie directe', type: 'sel', large: true, options: [['', 'Non : appliquer l\'algorithme'], ['NC', 'LR-NC : non classable (examen dégradé ou incomplet)'], ['1', 'LR-1 : certainement bénin'], ['2', 'LR-2 : probablement bénin'], ['M', 'LR-M : probablement ou certainement malin, non spécifique de CHC (cible…)'], ['TIV', 'LR-TIV : tumeur dans une veine']] },
      ...(st.directe ? [] : [
        { f: 'aphe', label: 'Hyperartérialisation non périphérique (APHE)', type: 'sel', options: [...NON, ['oui', 'Oui'], ['non', 'Non']] },
        { f: 'taille', label: 'Taille (mm)', type: 'num' },
        { f: 'washout', label: 'Wash-out non périphérique', type: 'chk' },
        { f: 'capsule', label: 'Capsule rehaussée', type: 'chk' },
        { f: 'croissance', label: 'Croissance seuil (≥ 50 % en ≤ 6 mois)', type: 'chk' },
        { f: 'accessoire', label: 'Critères accessoires', type: 'sel', large: true, options: [['', 'Aucun / non retenus'], ['plus', 'En faveur de la malignité (+1, sans dépasser LR-4)'], ['moins', 'En faveur de la bénignité (−1, sans déclasser un LR-5)']] },
      ]),
    ],
    calcul(st) {
      const N = { NC: 'non classable', 1: 'certainement bénin', 2: 'probablement bénin', 3: 'probabilité intermédiaire de malignité', 4: 'probablement CHC', 5: 'certainement CHC', M: 'probablement ou certainement malin, non spécifique de CHC', TIV: 'tumeur dans une veine' };
      const NIV = { NC: 'neutre', 1: 'ok', 2: 'ok', 3: 'bas', 4: 'moyen', 5: 'haut', M: 'haut', TIV: 'haut' };
      const sortie = (c, motif) => ({ badge: `LR-${c}`, niveau: NIV[c], texte: `Observation classée LR-${c} (${N[c]})${motif ? ` : ${motif}` : ''}.`, conclusion: `Observation hépatique LR-${c} (${N[c]}).` });
      if (st.directe) return sortie(st.directe, '');
      const T = num(st.taille);
      if (!st.aphe || T == null) return vide();
      const n = [st.washout, st.capsule, st.croissance].filter(Boolean).length;
      let c;
      if (st.aphe === 'non') c = T < 20 ? (n >= 2 ? 4 : 3) : (n >= 1 ? 4 : 3);
      else if (T < 10) c = n >= 1 ? 4 : 3;
      else if (T < 20) c = n === 0 ? 3 : (n === 1 && st.capsule && !st.washout && !st.croissance) ? 4 : 5;
      else c = n >= 1 ? 5 : 4;
      const base = c;
      if (st.accessoire === 'plus' && c < 4) c += 1;
      if (st.accessoire === 'moins' && c > 1 && base < 5) c -= 1;   // un LR-5 n'est jamais déclassé par les critères accessoires
      const crit = [st.washout && 'wash-out non périphérique', st.capsule && 'capsule rehaussée', st.croissance && 'croissance seuil'].filter(Boolean);
      const motif = `${st.aphe === 'oui' ? 'hyperartérialisation non périphérique' : 'pas d\'hyperartérialisation'}, ${fr(T, 0)} mm${crit.length ? ', ' + liste(crit) : ', sans autre critère majeur'}${c !== base ? ` ; critères accessoires (LR-${base} → LR-${c})` : ''}`;
      return sortie(c, motif);
    },
  });

  /* ===================== Neuro ===================== */
  DEFS.push(grades({
    id: 'fisher', groupe: 'Neuro', titre: 'Échelle de Fisher modifiée (HSA)', chip: 'Fisher modifié', sub: 'hémorragie méningée', court: 'Fisher modifié',
    cles: ['fisher'], suggere: /hemorragie (meningee|sous-arachno)|\bhsa\b|anevrisme rompu/, phrase: 'Échelle de Fisher modifiée', question: 'Grade',
    aide: 'HSA « épaisse » : caillot remplissant complètement au moins une citerne ou une scissure. Risque de vasospasme symptomatique d\'après Frontera 2006.',
    grades: [['0', '0', 'pas d\'HSA ni d\'hémorragie intraventriculaire', 'ok'], ['1', '1', 'HSA fine, sans hémorragie intraventriculaire (vasospasme ≈ 24 %)', 'bas'], ['2', '2', 'HSA fine avec hémorragie intraventriculaire (≈ 33 %)', 'moyen'], ['3', '3', 'HSA épaisse, sans hémorragie intraventriculaire (≈ 33 %)', 'moyen'], ['4', '4', 'HSA épaisse avec hémorragie intraventriculaire (≈ 40 %)', 'haut']],
    conclure: g => `Hémorragie sous-arachnoïdienne, Fisher modifié ${g[1]}.`,
  }));

  DEFS.push({
    id: 'fazekas', groupe: 'Neuro', titre: 'Échelle de Fazekas', chip: 'Fazekas', sub: 'hypersignaux de la substance blanche',
    cles: ['fazekas'], suggere: /hypersignaux|leucopathie|leuco-araiose|substance blanche/,
    aide: 'Hypersignaux FLAIR de la substance blanche, cotés séparément en périventriculaire et en profondeur.',
    init: () => ({ pv: '', sbp: '' }),
    champs: () => [
      { f: 'pv', label: 'Périventriculaire', type: 'sel', large: true, options: [...NON, ['0', '0 — absents'], ['1', '1 — « bonnets » ou liseré fin'], ['2', '2 — halo régulier'], ['3', '3 — irréguliers, s\'étendant dans la substance blanche profonde']] },
      { f: 'sbp', label: 'Substance blanche profonde', type: 'sel', large: true, options: [...NON, ['0', '0 — absents'], ['1', '1 — foyers ponctuels'], ['2', '2 — début de confluence'], ['3', '3 — larges plages confluentes']] },
    ],
    calcul(st) {
      if (st.pv === '' && st.sbp === '') return vide();
      const m = Math.max(+st.pv || 0, +st.sbp || 0);
      const parts = [st.pv !== '' && `périventriculaire ${st.pv}`, st.sbp !== '' && `substance blanche profonde ${st.sbp}`].filter(Boolean);
      return { badge: `Fazekas ${st.sbp !== '' ? st.sbp : st.pv}`, niveau: ['ok', 'bas', 'moyen', 'haut'][m], texte: `Hypersignaux FLAIR de la substance blanche cotés selon l'échelle de Fazekas : ${liste(parts)}.`, conclusion: `Leucopathie vasculaire Fazekas ${st.sbp !== '' ? st.sbp : st.pv}${st.sbp !== '' && st.pv !== '' ? ` (périventriculaire ${st.pv})` : ''}.` };
    },
  });

  DEFS.push({
    id: 'scheltens', groupe: 'Neuro', titre: 'Score de Scheltens (atrophie hippocampique, MTA)', chip: 'Scheltens', sub: 'atrophie temporale interne',
    cles: ['scheltens', 'mta'], suggere: /hippocamp|atrophie|demence|alzheimer|scheltens/,
    aide: 'Coupe coronale T1 passant par le corps de l\'hippocampe. Seuil pathologique : ≥ 2 avant 75 ans, ≥ 3 à partir de 75 ans.',
    init: () => ({ d: '', g: '', age: '' }),
    champs: () => {
      const O = [...NON, ['0', '0 — pas d\'élargissement des espaces liquidiens'], ['1', '1 — élargissement de la fissure choroïdienne'], ['2', '2 — + élargissement de la corne temporale'], ['3', '3 — perte modérée du volume hippocampique'], ['4', '4 — perte sévère du volume hippocampique']];
      return [{ f: 'd', label: 'Droite', type: 'sel', large: true, options: O }, { f: 'g', label: 'Gauche', type: 'sel', large: true, options: O }, { f: 'age', label: 'Âge (ans)', type: 'num' }];
    },
    calcul(st) {
      if (st.d === '' && st.g === '') return vide();
      const age = num(st.age), seuil = age != null && age >= 75 ? 3 : 2;
      const pat = [st.d, st.g].filter(x => x !== '').some(x => +x >= seuil);
      const txt = `Atrophie temporale interne (score de Scheltens) : ${st.d !== '' ? `${st.d}/4 à droite` : ''}${st.d !== '' && st.g !== '' ? ', ' : ''}${st.g !== '' ? `${st.g}/4 à gauche` : ''}`;
      return { badge: `MTA D ${st.d || '–'} / G ${st.g || '–'}`, niveau: pat ? 'haut' : 'ok', texte: `${txt}${age != null ? ` (seuil pathologique ≥ ${seuil} à ${fr(age, 0)} ans)` : ''}.`, conclusion: pat ? `Atrophie hippocampique pathologique pour l'âge (Scheltens D ${st.d || '–'} / G ${st.g || '–'}).` : `Pas d'atrophie hippocampique significative pour l'âge (Scheltens D ${st.d || '–'} / G ${st.g || '–'}).` };
    },
  });

  /* ===================== Rachis ===================== */
  DEFS.push({
    id: 'ao-rachis', groupe: 'Os et traumatologie', titre: 'AO Spine — traumatismes rachidiens', chip: 'AO Spine', sub: 'fracture du rachis',
    cles: ['aospine', 'ao'], suggere: /fracture[^.]*(vertebr|rachi|corps|l\d|d\d|c\d)|tassement|burst|chance/,
    aide: 'Type morphologique (A compression, B atteinte des haubans, C translation), statut neurologique et modificateurs. Score TL AOSIS (thoraco-lombaire) : ≤ 3 traitement non chirurgical, 4–5 au cas par cas, > 5 chirurgical.',
    init: () => ({ region: 'tl', type: '', neuro: '', m1: false, m2: false, facette: '' }),
    champs: st => [
      { f: 'region', label: 'Région', type: 'sel', options: [['tl', 'Thoraco-lombaire'], ['cerv', 'Cervicale subaxiale (C3–C7)']] },
      { f: 'type', label: 'Type', type: 'sel', large: true, options: [...NON, ['A0', 'A0 — fracture mineure (processus transverse, épineux), sans retentissement structural'], ['A1', 'A1 — tassement cunéiforme d\'un plateau, sans atteinte du mur postérieur'], ['A2', 'A2 — fracture « split / pincer » des deux plateaux, sans atteinte du mur postérieur'], ['A3', 'A3 — burst incomplet : un plateau + mur postérieur'], ['A4', 'A4 — burst complet : deux plateaux + mur postérieur'], ['B1', 'B1 — rupture osseuse du hauban postérieur (Chance)'], ['B2', 'B2 — rupture du hauban postérieur (osseuse et/ou ligamentaire) avec fracture de type A'], ['B3', 'B3 — rupture du hauban antérieur (hyperextension)'], ['C', 'C — déplacement ou translation dans un plan']] },
      ...(st.region === 'cerv' ? [{ f: 'facette', label: 'Atteinte articulaire (F)', type: 'sel', large: true, options: [['', 'Aucune'], ['F1', 'F1 — fracture non déplacée (< 1 cm, < 40 % du massif articulaire)'], ['F2', 'F2 — fracture articulaire potentiellement instable'], ['F3', 'F3 — massif articulaire flottant'], ['F4', 'F4 — subluxation, articulaire perchée ou luxée']] }] : []),
      { f: 'neuro', label: 'Statut neurologique', type: 'sel', large: true, options: [['', '—'], ['N0', 'N0 — intact'], ['N1', 'N1 — déficit transitoire résolu'], ['N2', 'N2 — radiculopathie'], ['N3', 'N3 — atteinte médullaire ou de la queue-de-cheval incomplète'], ['N4', 'N4 — atteinte médullaire complète'], ['NX', 'NX — non évaluable']] },
      { f: 'm1', label: 'M1 : lésion du complexe ligamentaire postérieur incertaine', type: 'chk' },
      { f: 'm2', label: 'M2 : comorbidité influençant la décision', type: 'chk' },
    ],
    calcul(st) {
      if (!st.type) return vide();
      const code = [st.type, st.facette, st.neuro, st.m1 && 'M1', st.m2 && 'M2'].filter(Boolean).join(' ');
      const P = { A0: 0, A1: 1, A2: 2, A3: 3, A4: 5, B1: 5, B2: 6, B3: 7, C: 8 };
      const PN = { N0: 0, N1: 1, N2: 2, N3: 4, N4: 4, NX: 3 };
      let score = null;
      if (st.region === 'tl' && st.neuro) score = P[st.type] + PN[st.neuro] + (st.m1 ? 1 : 0);
      const niv = /^A[01]/.test(st.type) ? 'bas' : /^A[23]/.test(st.type) ? 'moyen' : 'haut';
      return {
        badge: `AO ${code}${score != null ? ` · TL AOSIS ${score}` : ''}`, niveau: niv,
        texte: `Fracture classée ${code} selon la classification AO Spine (${st.region === 'tl' ? 'thoraco-lombaire' : 'cervicale subaxiale'})${score != null ? ` ; score TL AOSIS ${score} (${score <= 3 ? 'traitement non chirurgical habituel' : score <= 5 ? 'traitement chirurgical ou non selon le contexte' : 'traitement chirurgical habituel'})` : ''}.`,
        conclusion: `Fracture rachidienne AO Spine ${code}.`,
      };
    },
  });

  /* ===================== Articulations ===================== */
  DEFS.push(grades({
    id: 'kellgren', groupe: 'Os et traumatologie', titre: 'Kellgren-Lawrence (gonarthrose)', chip: 'Kellgren-Lawrence', sub: 'arthrose du genou', court: 'KL',
    cles: ['kellgren', 'kl'], suggere: /gonarthrose|arthrose[^.]*genou|kellgren/, phrase: 'Gonarthrose stade de Kellgren-Lawrence', question: 'Stade',
    aide: 'Radiographie du genou de face en charge (schuss de préférence).',
    grades: [['0', '0', 'pas de signe radiographique d\'arthrose', 'ok'], ['1', '1', 'pincement douteux, ostéophyte possible', 'ok'], ['2', '2', 'ostéophytes certains, pincement possible', 'bas'], ['3', '3', 'ostéophytes multiples, pincement certain, sclérose sous-chondrale, déformation possible des extrémités osseuses', 'moyen'], ['4', '4', 'volumineux ostéophytes, pincement marqué, sclérose sévère, déformation certaine des extrémités osseuses', 'haut']],
  }));

  DEFS.push(grades({
    id: 'arco', groupe: 'Os et traumatologie', titre: 'ARCO 2019 (ostéonécrose de la tête fémorale)', chip: 'ARCO', sub: 'ostéonécrose de hanche', court: 'ARCO',
    cles: ['arco', 'osteonecrose'], suggere: /osteonecrose|necrose (avasculaire|aseptique)|arco/, phrase: 'Ostéonécrose de la tête fémorale stade ARCO', question: 'Stade',
    aide: 'ARCO 2019 : radiographies et IRM.',
    grades: [['I', 'I', 'radiographies normales, anomalie à l\'IRM', 'bas'], ['II', 'II', 'anomalies radiographiques (sclérose, ostéolyse, ostéoporose focale) sans fracture sous-chondrale ni affaissement', 'moyen'], ['IIIA', 'IIIA', 'fracture sous-chondrale ou affaissement débutant ≤ 2 mm', 'haut'], ['IIIB', 'IIIB', 'affaissement > 2 mm', 'haut'], ['IV', 'IV', 'arthrose (pincement articulaire, atteinte acétabulaire)', 'haut']],
  }));

  DEFS.push({
    id: 'hanche-mesures', groupe: 'Os et traumatologie', titre: 'Hanche : angle alpha et couverture acétabulaire', chip: 'Hanche (alpha, LCE)', sub: 'conflit fémoro-acétabulaire, dysplasie',
    cles: ['alpha', 'lce', 'wiberg', 'tonnis'], suggere: /conflit femoro|came|cam|pincer|dysplasie[^.]*hanche|couverture/,
    aide: 'Saisir les mesures disponibles. Angle alpha > 55° : morphologie de type came. LCE (Wiberg) : < 20° dysplasie, 20–25° limite, 25–39° normal, ≥ 40° surcouverture. Index acétabulaire (Tönnis) : > 10° dysplasie, < 0° surcouverture.',
    init: () => ({ alpha: '', lce: '', tonnis: '', cote: '' }),
    champs: () => [
      { f: 'cote', label: 'Côté', type: 'sel', options: [['', '—'], ['droite', 'Droite'], ['gauche', 'Gauche']] },
      { f: 'alpha', label: 'Angle alpha (°)', type: 'num' }, { f: 'lce', label: 'Angle LCE de Wiberg (°)', type: 'num' }, { f: 'tonnis', label: 'Index acétabulaire de Tönnis (°)', type: 'num' },
    ],
    calcul(st) {
      const a = num(st.alpha), l = num(st.lce), t = num(st.tonnis);
      if (a == null && l == null && t == null) return vide();
      const cote = st.cote ? ` ${st.cote}` : '';
      const res = [], ccl = [];
      let niv = 'ok';
      if (a != null) { const came = a > 55; res.push(`angle alpha ${fr(a, 0)}° (${came ? '> 55° : morphologie de type came' : 'normal'})`); if (came) { ccl.push('morphologie de type came'); niv = 'moyen'; } }
      if (l != null) {
        const s = l < 20 ? 'dysplasie' : l < 25 ? 'couverture limite' : l < 40 ? 'normal' : 'surcouverture (type pincer)';
        res.push(`angle LCE ${fr(l, 0)}° (${s})`);
        if (l < 25 || l >= 40) { ccl.push(l < 20 ? 'dysplasie acétabulaire' : l < 25 ? 'couverture acétabulaire limite' : 'surcouverture acétabulaire'); niv = l < 20 || l >= 40 ? 'haut' : 'moyen'; }
      }
      if (t != null) { const s = t > 10 ? 'dysplasie' : t < 0 ? 'surcouverture' : 'normal'; res.push(`index acétabulaire de Tönnis ${fr(t, 0)}° (${s})`); if (s !== 'normal' && !ccl.some(c => c.includes(s === 'dysplasie' ? 'dysplasie' : 'surcouverture'))) ccl.push(s === 'dysplasie' ? 'dysplasie acétabulaire' : 'surcouverture acétabulaire'); }
      return { badge: ccl.length ? ccl.join(' + ') : 'Mesures normales', niveau: ccl.length ? niv : 'ok', texte: `Hanche${cote} : ${liste(res)}.`, conclusion: ccl.length ? `Hanche${cote} : ${liste(ccl)}.` : `Hanche${cote} : pas d'argument pour un conflit fémoro-acétabulaire ni une dysplasie sur les mesures.` };
    },
  });

  /* ===================== Traumatologie osseuse ===================== */
  DEFS.push(grades({
    id: 'garden', groupe: 'Os et traumatologie', titre: 'Garden (fracture du col fémoral)', chip: 'Garden', sub: 'col du fémur', court: 'Garden',
    cles: ['garden'], suggere: /col (du )?femur|col femoral|cervicale vraie/, phrase: 'Fracture du col fémoral Garden', question: 'Type',
    grades: [['I', 'I', 'fracture incomplète ou engrenée en valgus (non déplacée)', 'bas'], ['II', 'II', 'fracture complète non déplacée', 'bas'], ['III', 'III', 'fracture complète partiellement déplacée (travées en varus)', 'haut'], ['IV', 'IV', 'fracture complète totalement déplacée (travées parallèles)', 'haut']],
    conclure: g => `Fracture du col fémoral Garden ${g[1]} (${/^I{1,2}$/.test(g[1]) ? 'non déplacée' : 'déplacée'}).`,
  }));

  DEFS.push({
    id: 'pauwels', groupe: 'Os et traumatologie', titre: 'Pauwels (fracture du col fémoral)', chip: 'Pauwels', sub: 'col du fémur, obliquité du trait',
    cles: ['pauwels'], suggere: /col (du )?femur|col femoral/,
    aide: 'Angle entre le trait de fracture et l\'horizontale : I < 30°, II 30–50°, III > 50° (plus instable).',
    init: () => ({ angle: '' }),
    champs: () => [{ f: 'angle', label: 'Angle du trait / horizontale (°)', type: 'num' }],
    calcul(st) {
      const a = num(st.angle);
      if (a == null) return vide();
      const t = a < 30 ? 'I' : a <= 50 ? 'II' : 'III';
      return { badge: `Pauwels ${t}`, niveau: t === 'III' ? 'haut' : t === 'II' ? 'moyen' : 'bas', texte: `Trait de fracture du col fémoral oblique à ${fr(a, 0)}° sur l'horizontale : Pauwels ${t}.`, conclusion: `Fracture du col fémoral Pauwels ${t}.` };
    },
  });

  DEFS.push({
    id: 'neer', groupe: 'Os et traumatologie', titre: 'Neer (fracture de l\'extrémité supérieure de l\'humérus)', chip: 'Neer', sub: 'humérus proximal',
    cles: ['neer'], suggere: /humerus|humeral|tubercule|trochiter|col chirurgical/,
    aide: 'Un fragment est « déplacé » au-delà de 1 cm ou de 45° d\'angulation. Le nombre de fragments déplacés donne le nombre de parts.',
    init: () => ({ diaphyse: false, gt: false, pt: false, luxation: false, tete: false }),
    champs: () => [
      { f: 'diaphyse', label: 'Diaphyse déplacée (col chirurgical)', type: 'chk' }, { f: 'gt', label: 'Tubercule majeur (trochiter) déplacé', type: 'chk' },
      { f: 'pt', label: 'Tubercule mineur (trochin) déplacé', type: 'chk' }, { f: 'luxation', label: 'Luxation gléno-humérale associée', type: 'chk' }, { f: 'tete', label: 'Fracture de la surface articulaire (head-split)', type: 'chk' },
    ],
    calcul(st) {
      const d = [st.diaphyse && 'diaphyse', st.gt && 'tubercule majeur', st.pt && 'tubercule mineur'].filter(Boolean);
      const parts = 1 + d.length;
      const sup = [st.luxation && 'fracture-luxation', st.tete && 'fracture de la surface articulaire'].filter(Boolean);
      const lib = `${parts} part${parts > 1 ? 's' : ''}`;
      return { badge: `Neer ${lib}${sup.length ? ' + ' + sup.join(' + ') : ''}`, niveau: parts >= 3 || sup.length ? 'haut' : parts === 2 ? 'moyen' : 'bas', texte: `Fracture de l'extrémité supérieure de l'humérus à ${lib} selon Neer${d.length ? ` (déplacement : ${liste(d)})` : ' (pas de fragment déplacé au-delà de 1 cm ou 45°)'}${sup.length ? `, ${liste(sup)}` : ''}.`, conclusion: `Fracture de l'extrémité supérieure de l'humérus, Neer ${lib}${sup.length ? `, ${liste(sup)}` : ''}.` };
    },
  });

  DEFS.push(grades({
    id: 'schatzker', groupe: 'Os et traumatologie', titre: 'Schatzker (fracture du plateau tibial)', chip: 'Schatzker', sub: 'plateau tibial', court: 'Schatzker',
    cles: ['schatzker'], suggere: /plateau tibial|plateaux tibiaux/, phrase: 'Fracture du plateau tibial Schatzker', question: 'Type',
    grades: [['I', 'I', 'séparation pure du plateau latéral', 'bas'], ['II', 'II', 'séparation-enfoncement du plateau latéral', 'moyen'], ['III', 'III', 'enfoncement pur du plateau latéral', 'moyen'], ['IV', 'IV', 'fracture du plateau médial', 'haut'], ['V', 'V', 'fracture bitubérositaire (bicondylienne)', 'haut'], ['VI', 'VI', 'fracture avec disjonction métaphyso-diaphysaire', 'haut']],
  }));

  DEFS.push(grades({
    id: 'salter', groupe: 'Os et traumatologie', titre: 'Salter-Harris (décollement épiphysaire)', chip: 'Salter-Harris', sub: 'enfant, cartilage de croissance', court: 'Salter-Harris',
    cles: ['salter'], suggere: /physe|epiphys|cartilage de croissance|salter/, phrase: 'Fracture-décollement épiphysaire Salter-Harris', question: 'Type',
    grades: [['I', 'I', 'trait passant uniquement par la physe', 'bas'], ['II', 'II', 'physe + fragment métaphysaire', 'bas'], ['III', 'III', 'physe + épiphyse (trait articulaire)', 'moyen'], ['IV', 'IV', 'trait traversant métaphyse, physe et épiphyse', 'haut'], ['V', 'V', 'écrasement de la physe', 'haut']],
  }));

  /* ===================== Pancréas ===================== */
  DEFS.push({
    id: 'pancreatite', groupe: 'Abdomen et digestif', titre: 'Pancréatite aiguë : Balthazar, CTSI et CTSI modifié', chip: 'Balthazar / CTSI', sub: 'pancréatite aiguë',
    cles: ['balthazar', 'ctsi'], suggere: /pancreatite/,
    aide: 'CTSI (Balthazar 1990) : grade A–E (0–4) + nécrose (0, 2, 4, 6). CTSI modifié (Mortele 2004) : inflammation (0, 2, 4) + nécrose (0, 2, 4) + complication extra-pancréatique (2).',
    init: () => ({ grade: '', necrose: '', extra: false }),
    champs: () => [
      { f: 'grade', label: 'Grade de Balthazar', type: 'sel', large: true, options: [...NON, ['A', 'A — pancréas normal'], ['B', 'B — augmentation de volume du pancréas'], ['C', 'C — infiltration de la graisse péri-pancréatique'], ['D', 'D — une coulée (collection) péri-pancréatique'], ['E', 'E — au moins deux coulées et/ou gaz']] },
      { f: 'necrose', label: 'Nécrose pancréatique', type: 'sel', options: [...NON, ['0', 'Aucune'], ['30', '≤ 30 %'], ['50', '30 à 50 %'], ['51', '> 50 %']] },
      { f: 'extra', label: 'Complication extra-pancréatique (épanchement pleural, ascite, complication vasculaire, parenchymateuse ou digestive)', type: 'chk' },
    ],
    calcul(st) {
      if (!st.grade || st.necrose === '') return vide();
      const g = { A: 0, B: 1, C: 2, D: 3, E: 4 }[st.grade];
      const n = { 0: 0, 30: 2, 50: 4, 51: 6 }[st.necrose];
      const ctsi = g + n;
      const infl = st.grade === 'A' ? 0 : /[BC]/.test(st.grade) ? 2 : 4;
      const nm = st.necrose === '0' ? 0 : st.necrose === '30' ? 2 : 4;
      const m = infl + nm + (st.extra ? 2 : 0);
      const sev = s => s <= 2 ? 'légère' : s <= 6 ? 'modérée' : 'sévère';
      const sevC = ctsi <= 3 ? 'légère' : ctsi <= 6 ? 'modérée' : 'sévère';
      return {
        badge: `Balthazar ${st.grade} · CTSI ${ctsi}/10 · CTSI mod. ${m}/10`, niveau: m >= 8 ? 'haut' : m >= 4 ? 'moyen' : 'bas',
        texte: `Pancréatite aiguë Balthazar ${st.grade}, ${st.necrose === '0' ? 'sans nécrose' : `nécrose ${{ 30: '≤ 30 %', 50: 'de 30 à 50 %', 51: '> 50 %' }[st.necrose]}`}${st.extra ? ', avec complication extra-pancréatique' : ''} : CTSI ${ctsi}/10 (forme ${sevC}), CTSI modifié ${m}/10 (forme ${sev(m)}).`,
        conclusion: `Pancréatite aiguë Balthazar ${st.grade}, CTSI modifié ${m}/10 (forme ${sev(m)}).`,
      };
    },
  });

  DEFS.push(grades({
    id: 'hinchey', groupe: 'Abdomen et digestif', titre: 'Hinchey modifié (diverticulite)', chip: 'Hinchey', sub: 'diverticulite sigmoïdienne', court: 'Hinchey',
    cles: ['hinchey'], suggere: /diverticulite|sigmoidite/, phrase: 'Diverticulite Hinchey', question: 'Stade',
    grades: [['0', '0', 'diverticulite clinique légère', 'bas'], ['Ia', 'Ia', 'inflammation ou phlegmon péricolique localisé', 'bas'], ['Ib', 'Ib', 'abcès péricolique ou mésocolique', 'moyen'], ['II', 'II', 'abcès pelvien, intra-abdominal à distance ou rétropéritonéal', 'moyen'], ['III', 'III', 'péritonite purulente généralisée', 'haut'], ['IV', 'IV', 'péritonite stercorale', 'haut']],
    conclure: g => `Diverticulite sigmoïdienne Hinchey ${g[1]} (${g[2]}).`,
  }));

  /* ===================== Fistules anales ===================== */
  DEFS.push(grades({
    id: 'parks', groupe: 'Abdomen et digestif', titre: 'Parks (fistule anale)', chip: 'Parks', sub: 'fistule anale', court: 'Parks',
    cles: ['parks'], suggere: /fistule (anale|peri-anale|perianale)|fistule ano/, phrase: 'Fistule anale de type', question: 'Type',
    grades: [['superficielle', 'superficielle', 'sous-cutanée, sans traverser l\'appareil sphinctérien', 'bas'], ['inter', 'intersphinctérienne', 'trajet dans l\'espace intersphinctérien', 'bas'], ['trans', 'transsphinctérienne', 'traverse le sphincter externe vers la fosse ischio-anale', 'moyen'], ['supra', 'suprasphinctérienne', 'monte dans l\'espace intersphinctérien, passe au-dessus du puborectal puis traverse le releveur', 'haut'], ['extra', 'extrasphinctérienne', 'du rectum à la peau, en dehors de l\'appareil sphinctérien', 'haut']],
    conclure: g => `Fistule anale ${g[1]} (Parks).`,
  }));

  DEFS.push(grades({
    id: 'stjames', groupe: 'Abdomen et digestif', titre: 'St James\'s University Hospital (fistule anale, IRM)', chip: 'St James\'s', sub: 'fistule anale en IRM', court: 'St James\'s grade',
    cles: ['stjames', 'saintjames'], suggere: /fistule (anale|peri-anale|perianale)|fistule ano/, phrase: 'Fistule anale St James\'s grade', question: 'Grade',
    grades: [['1', '1', 'fistule intersphinctérienne linéaire simple', 'bas'], ['2', '2', 'fistule intersphinctérienne avec abcès ou trajet secondaire', 'moyen'], ['3', '3', 'fistule transsphinctérienne', 'moyen'], ['4', '4', 'fistule transsphinctérienne avec abcès ou trajet secondaire dans la fosse ischio-anale', 'haut'], ['5', '5', 'extension supralévatorienne ou translévatorienne', 'haut']],
    conclure: g => `Fistule anale St James's grade ${g[1]} (${g[2]}).`,
  }));

  /* ===================== Traumatismes abdominaux : AAST ===================== */
  const AAST = {
    foie: { nom: 'hépatique', masc: 'hépatique', titre: 'Foie (AAST 2018)', criteres: [
      [1, 'Hématome sous-capsulaire < 10 % de la surface'], [1, 'Lacération < 1 cm de profondeur'],
      [2, 'Hématome sous-capsulaire 10–50 % de la surface'], [2, 'Hématome intraparenchymateux < 10 cm'], [2, 'Lacération 1–3 cm de profondeur et ≤ 10 cm de long'],
      [3, 'Hématome sous-capsulaire > 50 % ou rompu'], [3, 'Hématome intraparenchymateux > 10 cm'], [3, 'Lacération > 3 cm de profondeur'], [3, 'Lésion vasculaire ou saignement actif contenu dans le parenchyme'],
      [4, 'Destruction parenchymateuse de 25 à 75 % d\'un lobe'], [4, 'Saignement actif s\'étendant dans le péritoine'],
      [5, 'Destruction parenchymateuse > 75 % d\'un lobe'], [5, 'Lésion veineuse juxta-hépatique (VCI rétro-hépatique, veines hépatiques principales)']] },
    rate: { nom: 'splénique', masc: 'splénique', titre: 'Rate (AAST 2018)', criteres: [
      [1, 'Hématome sous-capsulaire < 10 % de la surface'], [1, 'Lacération < 1 cm de profondeur'], [1, 'Déchirure capsulaire'],
      [2, 'Hématome sous-capsulaire 10–50 % de la surface'], [2, 'Hématome intraparenchymateux < 5 cm'], [2, 'Lacération 1–3 cm de profondeur'],
      [3, 'Hématome sous-capsulaire > 50 %'], [3, 'Hématome sous-capsulaire ou intraparenchymateux rompu ≥ 5 cm'], [3, 'Lacération > 3 cm de profondeur'],
      [4, 'Lésion vasculaire (pseudo-anévrisme, fistule artério-veineuse) ou saignement actif contenu dans la capsule'], [4, 'Lacération des vaisseaux segmentaires ou hilaires avec dévascularisation > 25 %'],
      [5, 'Rate éclatée'], [5, 'Saignement actif s\'étendant au-delà de la rate dans le péritoine']] },
    rein: { nom: 'rénale', masc: 'rénal', titre: 'Rein (AAST 2018)', criteres: [
      [1, 'Hématome sous-capsulaire et/ou contusion sans lacération'],
      [2, 'Hématome périrénal limité au fascia de Gerota'], [2, 'Lacération ≤ 1 cm sans extravasation urinaire'],
      [3, 'Lacération > 1 cm sans rupture des cavités ni extravasation urinaire'], [3, 'Lésion vasculaire ou saignement actif contenu dans le fascia de Gerota'],
      [4, 'Lacération atteignant les cavités avec extravasation urinaire'], [4, 'Lacération du bassinet et/ou rupture de la jonction pyélo-urétérale'], [4, 'Lésion d\'une artère ou veine segmentaire'],
      [4, 'Saignement actif au-delà du fascia de Gerota'], [4, 'Infarctus segmentaire ou complet par thrombose vasculaire, sans saignement actif'],
      [5, 'Lacération ou avulsion de l\'artère ou de la veine rénale principale (hile)'], [5, 'Rein dévascularisé avec saignement actif'], [5, 'Rein éclaté, sans anatomie parenchymateuse identifiable']] },
    pancreas: { nom: 'pancréatique', masc: 'pancréatique', titre: 'Pancréas (AAST)', criteres: [
      [1, 'Contusion mineure sans atteinte canalaire'], [1, 'Lacération superficielle sans atteinte canalaire'],
      [2, 'Contusion majeure sans atteinte canalaire ni perte de substance'], [2, 'Lacération majeure sans atteinte canalaire'],
      [3, 'Section distale ou lésion parenchymateuse avec atteinte canalaire (à gauche de la VMS)'],
      [4, 'Section proximale ou lésion parenchymateuse atteignant l\'ampoule (à droite de la VMS)'],
      [5, 'Destruction massive de la tête du pancréas']] },
  };
  DEFS.push({
    id: 'aast', groupe: 'Abdomen et digestif', titre: 'AAST : traumatismes du foie, de la rate, du rein, du pancréas', chip: 'AAST', sub: 'traumatisme abdominal',
    cles: ['aast'], suggere: /traumatisme|lacerat|contusion (hepat|splen|renal|pancrea)|fracture (de la rate|du foie|du rein)/,
    aide: 'Cocher toutes les lésions vues : le grade est celui de la lésion la plus grave. Foie, rate, rein : lésions multiples → +1 grade jusqu\'au grade III.',
    init: () => ({ organe: 'rate', c: {}, multiples: false }),
    champs: st => [
      { f: 'organe', label: 'Organe', type: 'sel', options: Object.entries(AAST).map(([k, o]) => [k, o.titre]) },
      ...AAST[st.organe].criteres.map(([g, l], i) => ({ f: `c.${i}`, label: `${l} (grade ${['', 'I', 'II', 'III', 'IV', 'V'][g]})`, type: 'chk' })),
      ...(st.organe !== 'pancreas' ? [{ f: 'multiples', label: 'Lésions multiples (+1 grade jusqu\'au grade III)', type: 'chk' }] : []),
    ],
    calcul(st) {
      const O = AAST[st.organe];
      const vus = O.criteres.filter((x, i) => st.c && st.c[i]);
      if (!vus.length) return vide();
      let g = Math.max(...vus.map(x => x[0]));
      if (st.multiples && st.organe !== 'pancreas' && g < 3) g += 1;
      const R = ['', 'I', 'II', 'III', 'IV', 'V'][g];
      return { badge: `AAST ${st.organe === 'pancreas' ? 'pancréas' : st.organe} grade ${R}`, niveau: g >= 4 ? 'haut' : g === 3 ? 'moyen' : 'bas', texte: `Lésion traumatique ${O.nom} : ${liste(vus.map(x => x[1].charAt(0).toLowerCase() + x[1].slice(1)))}${st.multiples && st.organe !== 'pancreas' ? ' ; lésions multiples' : ''}. Grade ${R} de l'AAST.`, conclusion: `Traumatisme ${O.masc} grade ${R} de l'AAST.` };
    },
  });

  /* ===================== Oncologie : iRECIST ===================== */
  DEFS.push({
    id: 'irecist', groupe: 'Oncologie', titre: 'iRECIST (immunothérapie)', chip: 'iRECIST', sub: 'réponse sous immunothérapie',
    cles: ['irecist'], suggere: /immunotherap|irecist|pseudo-?progression/,
    aide: 'La réponse RECIST 1.1 de l\'examen du jour (outil RECIST) est convertie : une première progression est « non confirmée » (iUPD) ; elle est confirmée (iCPD) à l\'examen suivant (4 à 8 semaines) si la progression s\'aggrave, sinon la réponse est réévaluée (iSD, iPR, iCR).',
    init: () => ({ recist: '', precedent: 'non', cible5: false, nonCible: false, nouv5: false, nouvelles: false, persiste: 'oui' }),
    champs: st => [
      { f: 'precedent', label: 'Examen précédent classé iUPD ?', type: 'sel', options: [['non', 'Non'], ['oui', 'Oui (progression non confirmée)']] },
      ...(st.precedent === 'oui' ? [
        { f: 'cible5', label: 'Somme des cibles augmentée ≥ 5 mm par rapport à l\'iUPD', type: 'chk' },
        { f: 'nonCible', label: 'Progression supplémentaire des lésions non cibles', type: 'chk' },
        { f: 'nouv5', label: 'Somme des nouvelles lésions cibles augmentée ≥ 5 mm', type: 'chk' },
        { f: 'nouvelles', label: 'Nouvelles lésions supplémentaires', type: 'chk' },
        { f: 'persiste', label: 'Sinon, les critères de progression de l\'iUPD sont-ils toujours présents ?', type: 'sel', large: true, options: [['oui', 'Oui'], ['non', 'Non : la maladie est revenue sous le seuil de progression']] },
      ] : []),
      ...(st.precedent === 'non' || st.persiste === 'non' ? [{ f: 'recist', label: st.precedent === 'oui' ? 'Réponse actuelle (sans progression)' : 'Réponse RECIST 1.1 de l\'examen du jour', type: 'sel', options: [...NON, ['CR', 'Réponse complète'], ['PR', 'Réponse partielle'], ['SD', 'Stabilité'], ...(st.precedent === 'non' ? [['PD', 'Progression']] : [])] }] : []),
    ],
    calcul(st) {
      const L = { iCR: 'réponse complète', iPR: 'réponse partielle', iSD: 'maladie stable', iUPD: 'progression non confirmée', iCPD: 'progression confirmée' };
      let c;
      if (st.precedent === 'oui') {
        if (st.cible5 || st.nonCible || st.nouv5 || st.nouvelles) c = 'iCPD';
        else if (st.persiste === 'oui') c = 'iUPD';
        else if (!st.recist) return vide();
        else c = 'i' + st.recist;
      } else {
        if (!st.recist) return vide();
        c = st.recist === 'PD' ? 'iUPD' : 'i' + st.recist;
      }
      const suite = c === 'iUPD' ? ' ; à confirmer sur un nouvel examen dans 4 à 8 semaines' : '';
      return { badge: c, niveau: c === 'iCPD' ? 'haut' : c === 'iUPD' ? 'moyen' : c === 'iSD' ? 'bas' : 'ok', texte: `Réponse selon iRECIST : ${c} (${L[c]})${suite}.`, conclusion: `${L[c].charAt(0).toUpperCase() + L[c].slice(1)} selon iRECIST (${c})${suite}.` };
    },
  });

  /* ===================== Surrénale : wash-out ===================== */
  DEFS.push({
    id: 'washout', groupe: 'Abdomen et digestif', titre: 'Wash-out surrénalien', chip: 'Wash-out surrénalien', sub: 'nodule surrénalien',
    cles: ['washout', 'surrenale'], suggere: /surrenal/,
    aide: 'Densités en UH : sans injection, temps portal (60–75 s), temps tardif (15 min). ≤ 10 UH sans injection : adénome riche en lipides. Wash-out absolu ≥ 60 % ou relatif ≥ 40 % : en faveur d\'un adénome.',
    init: () => ({ sp: '', portal: '', tardif: '', taille: '' }),
    champs: () => [
      { f: 'taille', label: 'Taille (mm)', type: 'num' }, { f: 'sp', label: 'Sans injection (UH)', type: 'num' },
      { f: 'portal', label: 'Temps portal (UH)', type: 'num' }, { f: 'tardif', label: 'Temps tardif à 15 min (UH)', type: 'num' },
    ],
    calcul(st) {
      const s = num(st.sp), p = num(st.portal), t = num(st.tardif), T = num(st.taille);
      const taille = T != null ? ` de ${fr(T, 0)} mm` : '';
      if (s != null && s <= 10) return { badge: `${fr(s, 0)} UH : adénome`, niveau: 'ok', texte: `Nodule surrénalien${taille} de densité spontanée ${fr(s, 0)} UH (≤ 10 UH) : adénome riche en lipides.`, conclusion: `Nodule surrénalien${taille} en faveur d'un adénome riche en lipides.` };
      if (p == null || t == null) return vide(s != null ? 'Temps portal et tardif ?' : 'À compléter');
      const rel = (p - t) / p * 100;
      const abs = s != null && p !== s ? (p - t) / (p - s) * 100 : null;
      const adenome = (abs != null && abs >= 60) || rel >= 40;
      const val = `${abs != null ? `wash-out absolu ${fr(abs, 0)} %, ` : ''}wash-out relatif ${fr(rel, 0)} %`;
      return { badge: adenome ? 'Wash-out : adénome' : 'Wash-out insuffisant', niveau: adenome ? 'ok' : 'moyen', texte: `Nodule surrénalien${taille} : ${s != null ? `${fr(s, 0)} UH sans injection, ` : ''}${fr(p, 0)} UH au temps portal, ${fr(t, 0)} UH au temps tardif ; ${val} (seuils : absolu ≥ 60 %, relatif ≥ 40 %).`, conclusion: adenome ? `Nodule surrénalien${taille} dont le wash-out est en faveur d'un adénome.` : `Nodule surrénalien${taille} au wash-out non caractéristique d'un adénome : à confronter au contexte (IRM en déphasage, suivi ou avis spécialisé).` };
    },
  });

  return { DEFS, num, AAST };
});
