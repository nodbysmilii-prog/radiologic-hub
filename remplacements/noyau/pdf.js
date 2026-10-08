/* =========================================================
   RadiologicHub — Remplacements : générateur PDF minimal
   ---------------------------------------------------------
   Sans dépendance (navigateur, Deno, Node) : polices standard Helvetica
   (normale, grasse, italique) en encodage WinAnsi (accents français),
   format A4, retour à la ligne automatique, sauts de page, pied de page
   numéroté. Sert à produire le contrat de remplacement.
   ========================================================= */

(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.RHRemplacements = root.RHRemplacements || {}).pdf = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  /* Largeurs des glyphes (unités de 1/1000 em), caractères 32 à 126 */
  const L_NORMAL = [278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556,
    1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556,
    333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584];
  const L_GRAS = [278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 333, 333, 584, 584, 584, 611,
    975, 722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 333, 278, 333, 584, 556,
    333, 556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556, 278, 889, 611, 611, 611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500, 389, 280, 389, 584];
  /* Caractères hors ASCII : octet WinAnsi et largeur [normale, grasse] */
  const SPECIAUX = {
    '€': [0x80, 556, 556], '…': [0x85, 1000, 1000], '‘': [0x91, 222, 278], '’': [0x92, 222, 278], '“': [0x93, 333, 500], '”': [0x94, 333, 500],
    '•': [0x95, 350, 350], '–': [0x96, 556, 556], '—': [0x97, 1000, 1000], 'œ': [0x9C, 944, 944], 'Œ': [0x8C, 1000, 1000],
    '«': [0xAB, 556, 556], '»': [0xBB, 556, 556], '°': [0xB0, 400, 400], ' ': [0xA0, 278, 278], '×': [0xD7, 584, 584], '·': [0xB7, 278, 278],
    'Æ': [0xC6, 1000, 1000], 'æ': [0xE6, 889, 889], 'ß': [0xDF, 611, 611], 'ø': [0xF8, 611, 611], 'Ø': [0xD8, 778, 778], '§': [0xA7, 556, 556], '²': [0xB2, 333, 333], '³': [0xB3, 333, 333],
  };
  const REMPLACEMENTS = { ' ': ' ', ' ': ' ', ' ': ' ', ' ': ' ', '≥': '>=', '≤': '<=', '→': '->', '⁻': '-', '\t': ' ' };

  /* Caractère → [octet, largeur normale, largeur grasse] */
  function glyphe(ch) {
    if (REMPLACEMENTS[ch]) ch = REMPLACEMENTS[ch];
    if (ch.length > 1) return [...ch].map(glyphe);
    const c = ch.charCodeAt(0);
    if (c >= 32 && c <= 126) return [[c, L_NORMAL[c - 32], L_GRAS[c - 32]]];
    if (SPECIAUX[ch]) return [SPECIAUX[ch]];
    if (c >= 0xC0 && c <= 0xFF) {                     // lettres accentuées latines : largeur de la lettre de base
      const base = ch.normalize('NFD')[0], b = base.charCodeAt(0);
      if (b >= 32 && b <= 126) return [[c, L_NORMAL[b - 32], L_GRAS[b - 32]]];
      return [[c, 556, 556]];
    }
    if (c >= 0xA0 && c <= 0xBF) return [[c, 333, 333]];
    return [[63, 556, 611]];                           // « ? » pour un caractère non représentable
  }
  const coder = s => [...String(s)].flatMap(glyphe);
  const largeur = (s, gras, taille) => coder(s).reduce((t, g) => t + g[gras ? 2 : 1], 0) * taille / 1000;
  const hexa = s => '<' + coder(s).map(g => g[0].toString(16).padStart(2, '0')).join('') + '>';

  /* Texte avec **gras** et _italique_ → segments { t, gras, ital } */
  function segments(texte, base = {}) {
    const out = [];
    String(texte).split(/(\*\*[^*]+\*\*|_[^_]+_)/).forEach(p => {
      if (!p) return;
      if (/^\*\*[^*]+\*\*$/.test(p)) out.push({ t: p.slice(2, -2), gras: true, ital: !!base.ital });
      else if (/^_[^_]+_$/.test(p)) out.push({ t: p.slice(1, -1), gras: !!base.gras, ital: true });
      else out.push({ t: p, gras: !!base.gras, ital: !!base.ital });
    });
    return out;
  }

  const A4 = { l: 595.28, h: 841.89 };
  const couleur = hex => { const n = parseInt(hex.replace('#', ''), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => (v / 255).toFixed(3)).join(' '); };

  function creerPdf(opts = {}) {
    const marge = opts.marge || 56, largeurUtile = A4.l - 2 * marge;
    const pages = [];
    let ops = null, y = 0;
    const nouvellePage = () => { ops = []; pages.push(ops); y = A4.h - marge; };
    nouvellePage();
    const place = h => { if (y - h < marge + 24) nouvellePage(); };
    const police = s => (s.gras ? '/F2' : s.ital ? '/F3' : '/F1');

    /* Écrit une ligne de segments à partir de x */
    function ligne(segs, x, taille, rgb) {
      let o = `BT ${rgb ? couleur(rgb) + ' rg ' : '0 0 0 rg '}${x.toFixed(2)} ${y.toFixed(2)} Td`;
      segs.forEach(s => { o += ` ${police(s)} ${taille} Tf ${hexa(s.t)} Tj`; });
      ops.push(o + ' ET');
    }
    /* Découpe des segments en lignes de largeur max */
    function couper(segs, max, taille) {
      const mots = [];
      segs.forEach(s => s.t.split(/(\s+)/).forEach(m => { if (m) mots.push({ ...s, t: m }); }));
      const lignes = [];
      let cour = [], l = 0;
      mots.forEach(m => {
        const w = largeur(m.t, m.gras, taille), blanc = /^\s+$/.test(m.t);
        if (!blanc && l + w > max && cour.length) {
          while (cour.length && /^\s+$/.test(cour[cour.length - 1].t)) cour.pop();
          lignes.push(cour); cour = []; l = 0;
        }
        if (blanc && !cour.length) return;
        cour.push(m); l += w;
      });
      if (cour.length) lignes.push(cour);
      return lignes;
    }

    const api = {
      /* Paragraphe (o : taille, gras, ital, couleur, retrait, centre, interligne, apres) */
      paragraphe(texte, o = {}) {
        const taille = o.taille || 10.5, inter = taille * (o.interligne || 1.42), retrait = o.retrait || 0;
        const lignes = couper(segments(texte, o), largeurUtile - retrait, taille);
        lignes.forEach(segs => {
          place(inter);
          y -= inter;
          let x = marge + retrait;
          if (o.centre) x = marge + (largeurUtile - segs.reduce((t, s) => t + largeur(s.t, s.gras, taille), 0)) / 2;
          ligne(segs, x, taille, o.couleur);
        });
        y -= o.apres ?? taille * 0.55;
        return api;
      },
      titre(texte, o = {}) { return api.paragraphe(texte, { taille: 17, gras: true, centre: true, couleur: '#2b2a74', apres: 10, ...o }); },
      sousTitre(texte, o = {}) { api.espace(6); return api.paragraphe(texte, { taille: 12, gras: true, couleur: '#84075e', apres: 4, ...o }); },
      puce(texte, o = {}) {
        const taille = o.taille || 10.5;
        place(taille * 1.42);
        const yAvant = y;
        api.paragraphe(texte, { ...o, retrait: 16 });
        ops.push(`BT 0 0 0 rg ${(marge + 4).toFixed(2)} ${(yAvant - taille * 1.42).toFixed(2)} Td /F1 ${taille} Tf ${hexa('•')} Tj ET`);
        return api;
      },
      espace(h = 8) { y -= h; if (y < marge + 24) nouvellePage(); return api; },
      trait(o = {}) {
        place(10);
        y -= 6;
        ops.push(`${couleur(o.couleur || '#c9c8d6')} RG 0.8 w ${marge} ${y.toFixed(2)} m ${(A4.l - marge).toFixed(2)} ${y.toFixed(2)} l S`);
        y -= 8;
        return api;
      },
      /* Deux cadres de signature côte à côte */
      signatures(gauche, droite) {
        place(110);
        y -= 14;
        const w = (largeurUtile - 24) / 2;
        [[gauche, marge], [droite, marge + w + 24]].forEach(([lignes, x]) => {
          let yy = y;
          lignes.forEach((t, i) => { ops.push(`BT 0 0 0 rg ${x.toFixed(2)} ${yy.toFixed(2)} Td ${i ? '/F1' : '/F2'} 10 Tf ${hexa(t)} Tj ET`); yy -= 14; });
          ops.push(`0.6 0.6 0.65 RG 0.8 w ${x.toFixed(2)} ${(y - 92).toFixed(2)} ${w.toFixed(2)} 56 re S`);
        });
        y -= 100;
        return api;
      },
      /* Rendu final : Uint8Array */
      octets() {
        const n = pages.length, objets = [];
        const ajout = s => { objets.push(s); return objets.length; };
        const catalogue = ajout(null), arbre = ajout(null);
        const f1 = ajout('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
        const f2 = ajout('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
        const f3 = ajout('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique /Encoding /WinAnsiEncoding >>');
        const kids = pages.map((p, i) => {
          const pied = opts.pied ? [`BT 0.4 0.4 0.45 rg ${marge} 30 Td /F1 8 Tf ${hexa(opts.pied)} Tj ET`] : [];
          const num = `Page ${i + 1} / ${n}`;
          pied.push(`BT 0.4 0.4 0.45 rg ${(A4.l - marge - largeur(num, false, 8)).toFixed(2)} 30 Td /F1 8 Tf ${hexa(num)} Tj ET`);
          const flux = [...p, ...pied].join('\n');
          const contenu = ajout(`<< /Length ${flux.length} >>\nstream\n${flux}\nendstream`);
          return ajout(`<< /Type /Page /Parent ${arbre} 0 R /MediaBox [0 0 ${A4.l} ${A4.h}] /Resources << /Font << /F1 ${f1} 0 R /F2 ${f2} 0 R /F3 ${f3} 0 R >> >> /Contents ${contenu} 0 R >>`);
        });
        objets[catalogue - 1] = `<< /Type /Catalog /Pages ${arbre} 0 R >>`;
        objets[arbre - 1] = `<< /Type /Pages /Kids [${kids.map(k => `${k} 0 R`).join(' ')}] /Count ${n} >>`;
        const info = ajout(`<< /Title ${hexa(opts.titre || 'Document')} /Producer (RadiologicHub) >>`);
        let sortie = '%PDF-1.4\n';
        const positions = objets.map((o, i) => { const pos = sortie.length; sortie += `${i + 1} 0 obj\n${o}\nendobj\n`; return pos; });
        const xref = sortie.length;
        sortie += `xref\n0 ${objets.length + 1}\n0000000000 65535 f \n${positions.map(p => `${String(p).padStart(10, '0')} 00000 n \n`).join('')}`;
        sortie += `trailer\n<< /Size ${objets.length + 1} /Root ${catalogue} 0 R /Info ${info} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
        return new TextEncoder().encode(sortie);           // le fichier est en ASCII (textes en hexadécimal)
      },
      get pages() { return pages.length; },
    };
    return api;
  }

  return { creerPdf, largeur, coder };
});
