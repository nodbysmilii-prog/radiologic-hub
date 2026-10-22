/* =========================================================
   Espace DICOM — scanner et perfusion IRM SYNTHÉTIQUES de test
   (navigateur et Node).
   Aucune donnée de patient réel : les images sont des fantômes calculés
   (scanner : corps elliptique, poumons, rachis, aorte, foie avec un
   kyste ; perfusion : cerveau, ventricules, artère, lésion) ; le
   patient s'appelle « TEST^SYNTHETIQUE » et l'en-tête indique
   « identité retirée » (0012,0062 = YES).
   Fichiers DICOM Part 10, Explicit VR Little Endian, non compressés.
   Utilisé par la page Espace DICOM (boutons des examens de test), par
   ses tests et par espace-dicom/outils/generer-dicom-test.js (tests du
   serveur).
   ========================================================= */
(function (racine) {
  'use strict';

  const EXPLICIT_LE = '1.2.840.10008.1.2.1';
  const CT_IMAGE = '1.2.840.10008.5.1.4.1.1.2';
  const IMPLEMENTATION_UID = '2.25.311744713393871246361585216066375384125';
  const VR_LONGUES = new Set(['OB', 'OD', 'OF', 'OL', 'OV', 'OW', 'SQ', 'UC', 'UN', 'UR', 'UT', 'SV', 'UV']);
  const encodeur = new TextEncoder();

  // UID sans racine d'organisation (« 2.25.<entier de 128 bits> », norme DICOM PS3.5 B.2)
  function nouvelUid() {
    const o = new Uint8Array(16);
    racine.crypto.getRandomValues(o);
    let n = 0n;
    for (const x of o) n = (n << 8n) | BigInt(x);
    return '2.25.' + n.toString(10);
  }

  function concatener(morceaux) {
    const total = morceaux.reduce((s, m) => s + m.length, 0);
    const sortie = new Uint8Array(total);
    let pos = 0;
    for (const m of morceaux) { sortie.set(m, pos); pos += m.length; }
    return sortie;
  }

  function element(groupe, numero, vr, valeur) {
    let donnees;
    if (valeur instanceof Uint8Array) donnees = valeur;
    else if (vr === 'US') { donnees = new Uint8Array(2); new DataView(donnees.buffer).setUint16(0, valeur, true); }
    else if (vr === 'UL') { donnees = new Uint8Array(4); new DataView(donnees.buffer).setUint32(0, valeur, true); }
    else donnees = encodeur.encode(String(valeur));
    if (donnees.length % 2) donnees = concatener([donnees, new Uint8Array([vr === 'UI' || vr === 'OB' ? 0 : 0x20])]);
    const longue = VR_LONGUES.has(vr);
    const entete = new Uint8Array(longue ? 12 : 8);
    const v = new DataView(entete.buffer);
    v.setUint16(0, groupe, true);
    v.setUint16(2, numero, true);
    entete[4] = vr.charCodeAt(0); entete[5] = vr.charCodeAt(1);
    if (longue) v.setUint32(8, donnees.length, true);
    else v.setUint16(6, donnees.length, true);
    return { cle: groupe * 0x10000 + numero, octets: concatener([entete, donnees]) };
  }

  function fichierDicom(meta, jeu) {
    const trier = l => l.sort((a, b) => a.cle - b.cle).map(e => e.octets);
    const corpsMeta = concatener(trier(meta));
    const longueur = element(0x0002, 0x0000, 'UL', corpsMeta.length);
    const preambule = new Uint8Array(132);
    preambule.set(encodeur.encode('DICM'), 128);
    return concatener([preambule, longueur.octets, corpsMeta, ...trier(jeu)]);
  }

  // Générateur pseudo-aléatoire reproductible (mulberry32)
  function hasard(graine) {
    let a = graine >>> 0;
    return () => {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* Valeurs stockées d'une coupe (UH + 1024, entiers non signés sur 12 bits) */
  function pixelsCoupe(indice, coupes, taille, graine = 1) {
    const alea = hasard(graine * 100003 + indice);
    const p = new Uint16Array(taille * taille);
    const z = coupes > 1 ? indice / (coupes - 1) : 0.5;          // 0 : en haut (thorax), 1 : en bas (abdomen)
    const dans = (x, y, cx, cy, rx, ry) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
    const rKyste = 0.07 * Math.sqrt(Math.max(0, 1 - ((z - 0.78) / 0.12) ** 2));
    for (let j = 0; j < taille; j++) {
      for (let i = 0; i < taille; i++) {
        const x = i / taille, y = j / taille;
        let uh = -1000;                                                      // air
        if (dans(x, y, 0.5, 0.52, 0.42, 0.32)) {
          uh = 30 + (alea() - 0.5) * 24;                                     // tissus mous
          if (z < 0.6 && (dans(x, y, 0.33, 0.47, 0.13, 0.19) || dans(x, y, 0.67, 0.47, 0.13, 0.19))) uh = -850 + (alea() - 0.5) * 60;   // poumons
          if (z > 0.55 && dans(x, y, 0.36, 0.5, 0.16, 0.14)) uh = 60 + (alea() - 0.5) * 20;                                            // foie
          if (rKyste > 0 && dans(x, y, 0.33, 0.48, rKyste, rKyste)) uh = 5 + (alea() - 0.5) * 10;                                       // kyste
          if (dans(x, y, 0.5, 0.68, 0.055, 0.055)) uh = dans(x, y, 0.5, 0.68, 0.022, 0.022) ? 15 : 700 + (alea() - 0.5) * 80;         // rachis
          if (dans(x, y, 0.53, 0.58, 0.03, 0.03)) uh = 45 + (alea() - 0.5) * 10;                                                      // aorte
        }
        p[j * taille + i] = Math.max(0, Math.min(4095, Math.round(uh + 1024)));
      }
    }
    return p;
  }

  /* genererEtude(options) → { etudeUid, serieUid, instances: [{ sopUid, numero, nom, octets }] }
     octets : fichier DICOM complet (Uint8Array) */
  function genererEtude({ coupes = 20, taille = 256, patientId = 'RH-TEST-0001', description = 'TDM TEST SYNTHETIQUE',
    graine = 1, epaisseur = 2.5, date = '20260101', heure = '120000' } = {}) {
    const etudeUid = nouvelUid(), serieUid = nouvelUid(), repereUid = nouvelUid();
    const espacement = 350 / taille;
    const ds = (v, n = 4) => Number(v.toFixed(n)).toString();
    const instances = [];
    for (let k = 0; k < coupes; k++) {
      const sopUid = nouvelUid();
      const zmm = -k * epaisseur;
      const pixels = pixelsCoupe(k, coupes, taille, graine);
      const meta = [
        element(0x0002, 0x0001, 'OB', new Uint8Array([0, 1])),
        element(0x0002, 0x0002, 'UI', CT_IMAGE),
        element(0x0002, 0x0003, 'UI', sopUid),
        element(0x0002, 0x0010, 'UI', EXPLICIT_LE),
        element(0x0002, 0x0012, 'UI', IMPLEMENTATION_UID),
        element(0x0002, 0x0013, 'SH', 'RHUB_TEST'),
      ];
      const jeu = [
        element(0x0008, 0x0005, 'CS', 'ISO_IR 192'),
        element(0x0008, 0x0008, 'CS', 'ORIGINAL\\PRIMARY\\AXIAL'),
        element(0x0008, 0x0016, 'UI', CT_IMAGE),
        element(0x0008, 0x0018, 'UI', sopUid),
        element(0x0008, 0x0020, 'DA', date),
        element(0x0008, 0x0021, 'DA', date),
        element(0x0008, 0x0030, 'TM', heure),
        element(0x0008, 0x0050, 'SH', 'TEST' + String(graine).padStart(4, '0')),
        element(0x0008, 0x0060, 'CS', 'CT'),
        element(0x0008, 0x0070, 'LO', 'RadiologicHub donnees synthetiques'),
        element(0x0008, 0x0090, 'PN', ''),
        element(0x0008, 0x1030, 'LO', description),
        element(0x0008, 0x103E, 'LO', 'Fantome synthetique'),
        element(0x0010, 0x0010, 'PN', 'TEST^SYNTHETIQUE'),
        element(0x0010, 0x0020, 'LO', patientId),
        element(0x0010, 0x0030, 'DA', ''),
        element(0x0010, 0x0040, 'CS', 'O'),
        element(0x0012, 0x0062, 'CS', 'YES'),
        element(0x0018, 0x0050, 'DS', ds(epaisseur)),
        element(0x0018, 0x5100, 'CS', 'HFS'),
        element(0x0020, 0x000D, 'UI', etudeUid),
        element(0x0020, 0x000E, 'UI', serieUid),
        element(0x0020, 0x0010, 'SH', '1'),
        element(0x0020, 0x0011, 'IS', '1'),
        element(0x0020, 0x0013, 'IS', String(k + 1)),
        element(0x0020, 0x0032, 'DS', `${ds(-175)}\\${ds(-175)}\\${ds(zmm)}`),
        element(0x0020, 0x0037, 'DS', '1\\0\\0\\0\\1\\0'),
        element(0x0020, 0x0052, 'UI', repereUid),
        element(0x0020, 0x1041, 'DS', ds(zmm)),
        element(0x0028, 0x0002, 'US', 1),
        element(0x0028, 0x0004, 'CS', 'MONOCHROME2'),
        element(0x0028, 0x0010, 'US', taille),
        element(0x0028, 0x0011, 'US', taille),
        element(0x0028, 0x0030, 'DS', `${ds(espacement)}\\${ds(espacement)}`),
        element(0x0028, 0x0100, 'US', 16),
        element(0x0028, 0x0101, 'US', 12),
        element(0x0028, 0x0102, 'US', 11),
        element(0x0028, 0x0103, 'US', 0),
        element(0x0028, 0x1050, 'DS', '40'),
        element(0x0028, 0x1051, 'DS', '400'),
        element(0x0028, 0x1052, 'DS', '-1024'),
        element(0x0028, 0x1053, 'DS', '1'),
        element(0x0028, 0x1054, 'LO', 'HU'),
        element(0x7FE0, 0x0010, 'OW', new Uint8Array(pixels.buffer, pixels.byteOffset, pixels.byteLength)),
      ];
      instances.push({ sopUid, numero: k + 1, nom: `coupe-${String(k + 1).padStart(4, '0')}.dcm`, octets: fichierDicom(meta, jeu) });
    }
    return { etudeUid, serieUid, instances, coupes, taille, graine };
  }

  /* ---------- Perfusion IRM SYNTHÉTIQUE (premier passage, type DSC) ----------
     Organisée comme une perfusion multiphase de console GE : une série, une
     image par coupe et par phase, TemporalPositionIdentifier (0020,0100),
     NumberOfTemporalPositions (0020,0105), TriggerTime (0018,1060) en ms.
     Tissus : parenchyme (chute 30 %, récupération 95 %), lésion à fort
     volume sanguin et fuite (chute 60 %, récupération 70 %), artère
     (chute 85 %, précoce), ventricules (pas de chute). Valeurs choisies
     pour tester la courbe ; ce n'est pas un modèle physiologique validé. */
  const MR_IMAGE = '1.2.840.10008.5.1.4.1.1.4';
  const TISSUS = {
    parenchyme: { s0: 850, chute: 0.30, recuperation: 0.95, delai: 0, montee: 6 },
    lesion: { s0: 900, chute: 0.60, recuperation: 0.70, delai: 1, montee: 6 },
    artere: { s0: 1000, chute: 0.85, recuperation: 0.97, delai: -2, montee: 4 },
    ventricule: { s0: 1500, chute: 0, recuperation: 1, delai: 0, montee: 6 },
  };
  const ARRIVEE = 15;   // secondes : arrivée du bolus

  /* Signal relatif (1 = ligne de base) d'un tissu au temps t (s) */
  function signalPerfusion(t, tissu) {
    const T = TISSUS[tissu];
    const u = t - ARRIVEE - T.delai;
    if (u <= 0 || !T.chute) return 1;
    const g = (u / T.montee) ** 3 * Math.exp(3 * (1 - u / T.montee));           // gamma, maximum 1 à u = montee
    const fuite = u > T.montee ? 1 - Math.exp(-(u - T.montee) / 6) : 0;          // fuite progressive après le pic
    return 1 - T.chute * g - (1 - T.recuperation) * T.chute * fuite;
  }

  function tissuEn(x, y, coupe, coupes) {
    const dans = (cx, cy, rx, ry) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
    if (!dans(0.5, 0.5, 0.36, 0.44)) return null;                                  // hors du cerveau
    const milieu = Math.abs(coupe - (coupes - 1) / 2) <= Math.max(1, coupes / 4);
    if (dans(0.45, 0.48, 0.035, 0.09) || dans(0.55, 0.48, 0.035, 0.09)) return 'ventricule';
    if (dans(0.5, 0.78, 0.025, 0.025)) return 'artere';
    if (milieu && dans(0.3, 0.42, 0.08, 0.08)) return 'lesion';
    return 'parenchyme';
  }

  function pixelsPerfusion(coupe, coupes, phase, taille, tr, graine = 1) {
    const alea = hasard(graine * 7919 + coupe * 1009 + phase);
    const t = phase * tr;
    const p = new Uint16Array(taille * taille);
    for (let j = 0; j < taille; j++) {
      for (let i = 0; i < taille; i++) {
        const tissu = tissuEn((i + 0.5) / taille, (j + 0.5) / taille, coupe, coupes);
        const v = tissu ? TISSUS[tissu].s0 * signalPerfusion(t, tissu) + (alea() - 0.5) * 16 : 20 + alea() * 10;
        p[j * taille + i] = Math.max(0, Math.min(4095, Math.round(v)));
      }
    }
    return p;
  }

  /* genererPerfusion(options) → { etudeUid, serieUid, instances } : coupes × phases images MR */
  function genererPerfusion({ coupes = 8, phases = 50, taille = 96, tr = 1.5, epaisseur = 5, patientId = 'RH-TEST-PERF',
    description = 'IRM CEREBRALE PERFUSION TEST', date = '20260101', heure = '120000', graine = 1 } = {}) {
    const etudeUid = nouvelUid(), serieUid = nouvelUid(), repereUid = nouvelUid();
    const espacement = 230 / taille;
    const ds = (v, n = 4) => Number(v.toFixed(n)).toString();
    const [hh, mm, ss] = [Number(heure.slice(0, 2)), Number(heure.slice(2, 4)), Number(heure.slice(4, 6))];
    const heureDe = sec => {
      const tot = hh * 3600 + mm * 60 + ss + sec;
      const h = Math.floor(tot / 3600) % 24, m = Math.floor(tot / 60) % 60, s = tot % 60;
      return `${String(h).padStart(2, '0')}${String(m).padStart(2, '0')}${s.toFixed(3).padStart(6, '0')}`;
    };
    const instances = [];
    for (let ph = 0; ph < phases; ph++) {
      for (let k = 0; k < coupes; k++) {
        const sopUid = nouvelUid();
        const numero = ph * coupes + k + 1;
        const zmm = k * epaisseur;
        const t = ph * tr + (k * tr) / coupes;                     // chaque coupe acquise dans le TR
        const pixels = pixelsPerfusion(k, coupes, ph, taille, tr, graine);
        const meta = [
          element(0x0002, 0x0001, 'OB', new Uint8Array([0, 1])),
          element(0x0002, 0x0002, 'UI', MR_IMAGE),
          element(0x0002, 0x0003, 'UI', sopUid),
          element(0x0002, 0x0010, 'UI', EXPLICIT_LE),
          element(0x0002, 0x0012, 'UI', IMPLEMENTATION_UID),
          element(0x0002, 0x0013, 'SH', 'RHUB_TEST'),
        ];
        const jeu = [
          element(0x0008, 0x0005, 'CS', 'ISO_IR 192'),
          element(0x0008, 0x0008, 'CS', 'ORIGINAL\\PRIMARY\\OTHER'),
          element(0x0008, 0x0016, 'UI', MR_IMAGE),
          element(0x0008, 0x0018, 'UI', sopUid),
          element(0x0008, 0x0020, 'DA', date),
          element(0x0008, 0x0021, 'DA', date),
          element(0x0008, 0x0030, 'TM', heure),
          element(0x0008, 0x0032, 'TM', heureDe(t)),
          element(0x0008, 0x0050, 'SH', 'TESTPERF'),
          element(0x0008, 0x0060, 'CS', 'MR'),
          element(0x0008, 0x0070, 'LO', 'RadiologicHub donnees synthetiques'),
          element(0x0008, 0x0090, 'PN', ''),
          element(0x0008, 0x1030, 'LO', description),
          element(0x0008, 0x103E, 'LO', 'PERFUSION DSC (synthetique)'),
          element(0x0010, 0x0010, 'PN', 'TEST^SYNTHETIQUE'),
          element(0x0010, 0x0020, 'LO', patientId),
          element(0x0010, 0x0030, 'DA', ''),
          element(0x0010, 0x0040, 'CS', 'O'),
          element(0x0012, 0x0062, 'CS', 'YES'),
          element(0x0018, 0x0020, 'CS', 'EP'),
          element(0x0018, 0x0023, 'CS', '2D'),
          element(0x0018, 0x0050, 'DS', ds(epaisseur)),
          element(0x0018, 0x0080, 'DS', ds(tr * 1000)),
          element(0x0018, 0x0081, 'DS', '30'),
          element(0x0018, 0x1060, 'DS', ds(t * 1000, 1)),
          element(0x0018, 0x5100, 'CS', 'HFS'),
          element(0x0020, 0x000D, 'UI', etudeUid),
          element(0x0020, 0x000E, 'UI', serieUid),
          element(0x0020, 0x0010, 'SH', '1'),
          element(0x0020, 0x0011, 'IS', '5'),
          element(0x0020, 0x0013, 'IS', String(numero)),
          element(0x0020, 0x0032, 'DS', `${ds(-115)}\\${ds(-115)}\\${ds(zmm)}`),
          element(0x0020, 0x0037, 'DS', '1\\0\\0\\0\\1\\0'),
          element(0x0020, 0x0052, 'UI', repereUid),
          element(0x0020, 0x0100, 'IS', String(ph + 1)),
          element(0x0020, 0x0105, 'IS', String(phases)),
          element(0x0020, 0x1041, 'DS', ds(zmm)),
          element(0x0028, 0x0002, 'US', 1),
          element(0x0028, 0x0004, 'CS', 'MONOCHROME2'),
          element(0x0028, 0x0010, 'US', taille),
          element(0x0028, 0x0011, 'US', taille),
          element(0x0028, 0x0030, 'DS', `${ds(espacement)}\\${ds(espacement)}`),
          element(0x0028, 0x0100, 'US', 16),
          element(0x0028, 0x0101, 'US', 12),
          element(0x0028, 0x0102, 'US', 11),
          element(0x0028, 0x0103, 'US', 0),
          element(0x0028, 0x1050, 'DS', '800'),
          element(0x0028, 0x1051, 'DS', '1600'),
          element(0x7FE0, 0x0010, 'OW', new Uint8Array(pixels.buffer, pixels.byteOffset, pixels.byteLength)),
        ];
        instances.push({ sopUid, numero, nom: `perf-${String(numero).padStart(4, '0')}.dcm`, octets: fichierDicom(meta, jeu) });
      }
    }
    return { etudeUid, serieUid, instances, coupes, phases, taille, tr };
  }

  const api = { genererEtude, pixelsCoupe, nouvelUid, genererPerfusion, pixelsPerfusion, signalPerfusion, TISSUS, outils: { element, fichierDicom } };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else racine.RHDicomGenerateur = api;
})(typeof self !== 'undefined' ? self : globalThis);
