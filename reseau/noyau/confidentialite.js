/* =========================================================
   RadiologicHub — Communauté : protection des patients
   ---------------------------------------------------------
   • identite(texte)     → passages qui pourraient identifier un patient
                           (« Madame X », « né le… », date de naissance,
                           IPP / n° de dossier, CIN, téléphone) ;
                           alerte avant publication d'un cas ou d'un message.
   • nettoyer(octets)    → image JPEG ou PNG débarrassée de ses métadonnées
                           (EXIF : date, appareil, GPS ; XMP ; IPTC ;
                           commentaires ; textes PNG). Le profil de couleur
                           est conservé. Les images sont de plus réencodées
                           par le navigateur avant l'envoi (reseau/images.js).
   • metadonnees(octets) → liste des métadonnées présentes (tests, contrôle).
   Testé sous Node : tests/reseau-confidentialite.test.js.
   ========================================================= */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else (root.RHReseau = root.RHReseau || {}).confidentialite = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  /* ---------- Texte ---------- */
  const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const PAS_UN_NOM = new Set(['le', 'la', 'les', 'l', 'un', 'une', 'du', 'de', 'des', 'est', 'a', 'presente', 'se', 'qui', 'et', 'x', 'y', 'z', 'age', 'agee', 'de']);
  const MOTIFS = [
    { type: 'nom', re: /(?<![\p{L}])(monsieur|madame|mademoiselle|mme|mlle|mr|m\.)\s+([\p{L}][\p{L}'’-]+)/giu, garde: m => !PAS_UN_NOM.has(norm(m[2])) },
    { type: 'naissance', re: /(?<![\p{L}])née?\s+(?:le|en)(?![\p{L}])[^.\n]{0,20}/giu },
    { type: 'naissance', re: /date\s+de\s+naissance|ddn\s*:?\s*\d/giu },
    { type: 'dossier', re: /(?<![\p{L}])(ipp|n°\s*(?:de\s+)?dossier|num[ée]ro\s+de\s+dossier|matricule|nda)\s*:?\s*[\w-]*\d[\w-]*/giu },
    { type: 'cin', re: /(?<![\p{L}\d])(cin|c\.i\.n\.?|carte\s+d'identit[ée])\s*:?\s*\d{6,8}/giu },
    { type: 'telephone', re: /(?<!\d)(?:\+216\s?)?[2-9]\d(?:[\s.]?\d{3}){2}(?!\d)/gu },
  ];
  function identite(texte) {
    const t = String(texte ?? ''), out = [];
    for (const { type, re, garde } of MOTIFS) {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(t))) if (!garde || garde(m)) out.push({ type, texte: m[0].trim(), index: m.index });
    }
    return out.sort((a, b) => a.index - b.index);
  }

  /* ---------- Images ---------- */
  const u8 = b => (b instanceof Uint8Array ? b : new Uint8Array(b));
  const estJpeg = b => b.length > 3 && b[0] === 0xff && b[1] === 0xd8;
  const SIG_PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  const estPng = b => b.length > 8 && SIG_PNG.every((x, i) => b[i] === x);
  const ascii = (b, i, n) => String.fromCharCode(...b.subarray(i, i + n));

  /* JPEG : segments APP0 (JFIF), APP2 (profil ICC) et APP14 (Adobe) gardés ;
     APP1 (EXIF, XMP), APP3–APP13, APP15 et COM (commentaires) retirés. */
  const GARDES_JPEG = new Set([0xe0, 0xe2, 0xee]);
  function segmentsJpeg(b, rappel) {
    let i = 2;
    while (i + 4 <= b.length && b[i] === 0xff) {
      const m = b[i + 1];
      if (m === 0xd9) break;                                   // fin d'image
      if (m === 0xda) { rappel({ marqueur: m, debut: i, fin: b.length, image: true }); return; }   // début des données : on copie la suite telle quelle
      if (m === 0x01 || (m >= 0xd0 && m <= 0xd7)) { rappel({ marqueur: m, debut: i, fin: i + 2 }); i += 2; continue; }
      const n = (b[i + 2] << 8) | b[i + 3];
      rappel({ marqueur: m, debut: i, fin: i + 2 + n });
      i += 2 + n;
    }
  }
  function nettoyerJpeg(b) {
    const morceaux = [b.subarray(0, 2)];
    segmentsJpeg(b, s => {
      const meta = (s.marqueur >= 0xe0 && s.marqueur <= 0xef && !GARDES_JPEG.has(s.marqueur)) || s.marqueur === 0xfe;
      if (!meta) morceaux.push(b.subarray(s.debut, s.fin));
    });
    return concat(morceaux);
  }
  /* PNG : morceaux texte (tEXt, zTXt, iTXt), EXIF (eXIf) et date (tIME) retirés */
  const RETIRES_PNG = new Set(['tEXt', 'zTXt', 'iTXt', 'eXIf', 'tIME']);
  function morceauxPng(b, rappel) {
    let i = 8;
    while (i + 12 <= b.length) {
      const n = ((b[i] << 24) >>> 0) + (b[i + 1] << 16) + (b[i + 2] << 8) + b[i + 3];
      const type = ascii(b, i + 4, 4);
      rappel({ type, debut: i, fin: i + 12 + n });
      i += 12 + n;
      if (type === 'IEND') break;
    }
  }
  function nettoyerPng(b) {
    const morceaux = [b.subarray(0, 8)];
    morceauxPng(b, m => { if (!RETIRES_PNG.has(m.type)) morceaux.push(b.subarray(m.debut, m.fin)); });
    return concat(morceaux);
  }
  function concat(l) {
    const out = new Uint8Array(l.reduce((t, x) => t + x.length, 0));
    let o = 0;
    for (const x of l) { out.set(x, o); o += x.length; }
    return out;
  }

  /* Image nettoyée ; format non reconnu → null (le navigateur la réencode alors) */
  function nettoyer(octets) {
    const b = u8(octets);
    if (estJpeg(b)) return nettoyerJpeg(b);
    if (estPng(b)) return nettoyerPng(b);
    return null;
  }
  /* Métadonnées présentes : ['EXIF', 'XMP', 'IPTC', 'commentaire', 'texte PNG', …] */
  function metadonnees(octets) {
    const b = u8(octets), out = new Set();
    if (estJpeg(b)) {
      segmentsJpeg(b, s => {
        if (s.marqueur === 0xe1) out.add(ascii(b, s.debut + 4, 4) === 'Exif' ? 'EXIF' : 'XMP');
        else if (s.marqueur === 0xed) out.add('IPTC');
        else if (s.marqueur === 0xfe) out.add('commentaire');
        else if (s.marqueur >= 0xe0 && s.marqueur <= 0xef && !GARDES_JPEG.has(s.marqueur)) out.add(`APP${s.marqueur - 0xe0}`);
      });
    } else if (estPng(b)) {
      morceauxPng(b, m => { if (RETIRES_PNG.has(m.type)) out.add(m.type === 'eXIf' ? 'EXIF' : m.type === 'tIME' ? 'date' : 'texte PNG'); });
    }
    return [...out];
  }

  return { identite, nettoyer, metadonnees, estJpeg, estPng };
});
