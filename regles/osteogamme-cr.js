/* =========================================================
   RadiologicHub — OsteoGamme dans les comptes rendus (radiographie
   ostéo-articulaire) : aide à l'écriture
   ---------------------------------------------------------
   • description de la lésion à partir des critères cochés (accordée
     au pluriel pour des lésions multiples, côté droit / gauche) ;
   • integrer(compte rendu, état) : dans la rubrique « COMPTE-RENDU : »
     (ou RÉSULTATS…) du compte rendu type, la description remplace la
     phrase normale qu'elle contredit (« Absence de lésion lytique ou
     condensante suspecte ») ; une masse des tissus mous remplace
     « Intégrité des parties molles », le signe du fragment tombé
     « Absence de fracture » ; conclusion rédigée (rubrique CONCLUSION
     ajoutée si le modèle n'en a pas) : lésion, hypothèses diagnostiques
     et, au choix, les alertes de l'outil.
   Le calcul reste celui d'OsteoGamme (outils/osteogamme-moteur.js),
   avec les données de outils/osteogamme-data.js.
   Module sans dépendance au navigateur (testé sous Node :
   tests/osteogamme.test.js). À FAIRE VÉRIFIER MÉDICALEMENT.
   ========================================================= */

(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.RHRegles = root.RHRegles || {}).osteogammeCR = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const norm = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const minInit = t => t.charAt(0).toLowerCase() + t.slice(1);

  /* Os : groupe nominal et accord du côté (m : droit, f : droite, pied : « du pied droit »,
     a : « , à droite » ; null : pas de côté) */
  const OS = {
    femur: ['du fémur', 'm'], tibia: ['du tibia', 'm'], fibula: ['de la fibula', 'f'], humerus: ['de l\'humérus', 'm'],
    radius: ['du radius ou de l\'ulna', 'a'], mains: ['d\'un os de la main', 'f'], pieds: ['d\'un métatarsien ou d\'une phalange d\'orteil', 'pied'],
    tarse: ['du tarse', 'm'], rachis: ['du rachis', null], sacrum: ['du sacrum', null], bassin: ['du bassin', 'a'],
    scap: ['de la scapula ou de la clavicule', 'f'], cote: ['d\'une côte', 'f'], crane: ['du crâne ou du massif facial', null],
  };
  const COTES = [['', '—'], ['droit', 'Droit'], ['gauche', 'Gauche']];
  const avecCote = os => !os || OS[os][1] !== null;
  function lieuOs(os, cote) {
    const [nom, accord] = OS[os];
    if (!cote || !accord) return nom;
    const d = cote === 'droit';
    return nom + { m: d ? ' droit' : ' gauche', f: d ? ' droite' : ' gauche', pied: d ? ' du pied droit' : ' du pied gauche', a: d ? ', à droite' : ', à gauche' }[accord];
  }

  /* Texte de chaque critère : [singulier, pluriel] (lésions multiples) */
  const TXT = {
    segment: { epiphyse: ['épiphysaire', 'épiphysaires'], metaphyse: ['métaphysaire', 'métaphysaires'], diaphyse: ['diaphysaire', 'diaphysaires'] },
    axe: { centrale: ['centrale', 'centrales'], excentree: ['excentrée', 'excentrées'], corticale: ['corticale', 'corticales'], surface: ['juxtacorticale', 'juxtacorticales'] },
    matrice: { aucune: 'sans matrice minéralisée', chondroide: 'à matrice chondroïde (anneaux et arcs)', osteoide: 'à matrice ostéoïde', verre: 'à matrice en verre dépoli' },
    cloisons: { oui: ['cloisonnée', 'cloisonnées'], non: ['non cloisonnée', 'non cloisonnées'] },
    soufflure: { oui: ['soufflante', 'soufflantes'], non: ['non soufflante', 'non soufflantes'] },
    nll: { oui: 'avec niveaux liquide-liquide', non: 'sans niveau liquide-liquide' },
    perioste: { aucune: 'sans réaction périostée', continue: 'avec réaction périostée continue et solide', agressive: 'avec réaction périostée agressive (lamellaire, spicules ou triangle de Codman)' },
    masse: { oui: 'avec masse des tissus mous', non: 'sans masse des tissus mous' },
    signe: { fragment: 'avec signe du fragment tombé', sequestre: 'avec séquestre', nidus: 'avec nidus', biseau: 'avec bords biseautés (vertèbre plane)' },
  };
  const ALERTE_AGRESSIVE = 'Lésion d’allure agressive';

  /* Phrases normales des comptes rendus types de radiographie (texte sans accents) */
  const NORMALE = {
    lesion: /absence de lesions? (lytiques?|osseuses? evolutives?|osseuses? suspectes?)|absence de lesions? .*(lytique|condensante)/,
    masse: /(integrite|absence d.?anomalie) des parties molles/,
    fracture: /absence de fracture/,
  };
  const MASSE = '• Masse des tissus mous en regard de la lésion.';
  const FRACTURE = '• Fracture pathologique (signe du fragment tombé).';
  /* Lignes écrites par l'outil (réinsertion : remplacées, pas ajoutées) et phrase normale remise
     quand le critère n'est plus coché */
  const OUTIL = { lesion: /^\s*•\s*Lésions? osseuses?\b/, masse: /^\s*•\s*Masse des tissus mous en regard de la lésion\./, fracture: /^\s*•\s*Fracture pathologique \(signe du fragment tombé\)\./ };
  const RETOUR = { masse: '• Intégrité des parties molles.', fracture: '• Absence de fracture.' };
  const VERTEBRES = /^\s*•?\s*(pas|absence) d.?anomalie vertebrale/;
  /* Lignes d'alerte d'une insertion précédente (titres des alertes de l'outil) */
  const ESTALERTE = /^\s*•?\s*(Lésion d’allure agressive|Après 40 ans|Lésions multiples|Lésion cartilagineuse de l’adulte|Lésion « ne pas toucher » possible)\s*:/;

  /* Titres du compte rendu (mêmes règles que pour BI-RADS) */
  const nomTitre = t => norm(t).replace(/\s*:\s*$/, '').replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ').trim();
  const estTitre = l => { const t = l.trim(); return /:$/.test(t) && t.length <= 90 && !/^[•*–-]/.test(t) && !/[[\]]/.test(t); };
  const enMajuscules = t => { const l = t.replace(/[^\p{L}]/gu, ''); return l.length >= 2 && l === l.toUpperCase(); };
  const estBorne = l => estTitre(l) && (enMajuscules(l.trim()) || /^[IVX]+\s*[/.)–-]/.test(l.trim()));
  const estConclusion = l => estTitre(l) && ['conclusion', 'au total', 'en conclusion', 'synthese'].includes(nomTitre(l));
  const finRubrique = (L, i) => { for (let j = i + 1; j < L.length; j++) if (estBorne(L[j])) return j; return L.length; };

  /* D : données (osteogamme-data.js) ; M : moteur (OsteoGammeMoteur(D)) */
  function creer(D, M) {
    const critere = k => D.F.find(f => f.k === k);
    const actifs = c => { M.state = c; const on = {}; D.F.forEach(f => { if (c[f.k] && M.active(f)) on[f.k] = c[f.k]; }); return on; };

    /* « Lésion osseuse lytique unique de l'extrémité distale du fémur droit » */
    function lesion(c, cote) {
      const on = actifs(c), pl = on.nombre === 'multiple';
      const lytique = !on.matrice || on.matrice === 'aucune';
      let t = pl ? `Lésions osseuses${lytique ? ' lytiques' : ''} multiples` : `Lésion osseuse${lytique ? ' lytique' : ''}${on.nombre === 'unique' ? ' unique' : ''}`;
      if (on.os) t += on.extremite ? ` de l'extrémité ${on.extremite} ${lieuOs(on.os, cote)}` : ` ${lieuOs(on.os, cote)}`;
      return t;
    }

    /* Description complète (sans l'âge, le sexe ni le cancer connu, qui servent au calcul) */
    function description(c, cote) {
      const on = actifs(c), pl = on.nombre === 'multiple' ? 1 : 0;
      const accord = (k, v) => { const t = TXT[k][v]; return Array.isArray(t) ? t[pl] : t; };
      const parts = ['segment', 'axe'].filter(k => on[k]).map(k => accord(k, on[k]));
      if (on.lodwick) { const o = critere('lodwick').o.find(x => x[0] === on.lodwick); parts.push(`de type ${o[1]} de Lodwick (${o[2]})`); }
      ['matrice', 'cloisons', 'soufflure', 'nll', 'perioste', 'masse', 'signe'].filter(k => on[k]).forEach(k => parts.push(accord(k, on[k])));
      return [lesion(c, cote), ...parts].join(', ') + '.';
    }

    function hypotheses(st) {
      M.state = st.c;
      const { filled, res } = M.evaluate();
      if (filled.length < 2) return 'Hypothèses diagnostiques : [à compléter].';
      const noms = res.slice(0, +st.n || 3).map(r => minInit(r.dx.n));
      return noms.length > 1 ? `Hypothèses diagnostiques : ${noms[0]} en premier lieu ; à discuter : ${noms.slice(1).join(', ')}.` : `Hypothèse diagnostique : ${noms[0]}.`;
    }

    const alertes = st => { M.state = st.c; return M.flags(); };
    const textesAlertes = st => (st.reco ? alertes(st).map(([, t, x]) => `${t} : ${minInit(x)}`) : []);

    /* Conclusion : la lésion (d'allure agressive si l'outil le signale), les hypothèses, les alertes au choix */
    function conclusion(st) {
      const agressive = alertes(st).some(f => f[1] === ALERTE_AGRESSIVE);
      return [`${lesion(st.c, st.cote)}${agressive ? ', d\'allure agressive' : ''}.`, hypotheses(st), ...textesAlertes(st)];
    }

    /* Texte au curseur (compte rendu sans rubrique « COMPTE-RENDU » / RÉSULTATS) */
    function texte(st) {
      return [`• ${description(st.c, st.cote)}`, `• ${hypotheses(st)}`, ...textesAlertes(st).map(t => `• ${t}`)].join('\n');
    }

    function integrer(texteCR, st) {
      const L = String(texteCR ?? '').split('\n');
      const i = L.findIndex(l => estBorne(l) && /^(compte rendu|resultats?|description|constatations?)$/.test(nomTitre(l)));
      if (i < 0) return null;
      const on = actifs(st.c);
      const fin = finRubrique(L, i);
      const corps = L.slice(i + 1, fin);
      // Ligne de l'outil d'une insertion précédente, sinon phrase normale contredite
      const cible = cle => { const k = corps.findIndex(l => OUTIL[cle].test(l)); return k >= 0 ? k : corps.findIndex(l => NORMALE[cle].test(norm(l))); };
      const desc = `• ${description(st.c, st.cote)}`;
      const k = cible('lesion');
      if (k >= 0) corps[k] = desc;
      else { const m = corps.findIndex(l => /mineralisation/.test(norm(l))); corps.splice(m >= 0 ? m + 1 : 0, 0, desc); }
      for (const [cle, coche, ligne] of [['masse', on.masse === 'oui', MASSE], ['fracture', on.signe === 'fragment', FRACTURE]]) {
        if (coche) { const j = cible(cle); if (j >= 0) corps[j] = ligne; }
        else { const j = corps.findIndex(l => OUTIL[cle].test(l)); if (j >= 0) corps[j] = RETOUR[cle]; }
      }
      if (on.os === 'rachis') { const j = corps.findIndex(l => VERTEBRES.test(norm(l))); if (j >= 0) corps.splice(j, 1); }
      L.splice(i + 1, fin - i - 1, ...corps);

      // Conclusion : remplace le champ [conclusion] et une conclusion précédente de l'outil
      const lignes = conclusion(st);
      let c = -1;
      L.forEach((l, j) => { if (estConclusion(l)) c = j; });
      let creee = false;
      if (c < 0) {
        while (L.length && !L[L.length - 1].trim()) L.pop();
        L.push('', 'CONCLUSION :', ...lignes);
        creee = true;
      } else {
        const f = finRubrique(L, c);
        const garde = L.slice(c + 1, f).filter(l => l.trim() && !/^\s*\[[^\]]*\]\s*\.?\s*$/.test(l)
          && !/^\s*•?\s*(Lésions? osseuses?\b|Hypothèses? diagnostiques?\s*:)/.test(l) && !ESTALERTE.test(l));
        L.splice(c + 1, f - c - 1, ...lignes, ...garde, ...(f < L.length ? [''] : []));
      }
      return { texte: L.join('\n'), rubrique: L[i].trim().replace(/\s*:$/, ''), conclusion: creee ? 'CONCLUSION' : L[c].trim().replace(/\s*:$/, ''), creee };
    }

    return { lesion, description, hypotheses, conclusion, texte, integrer, avecCote };
  }

  return { creer, COTES, OS };
});
