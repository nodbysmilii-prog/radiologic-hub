/* =========================================================
   RadiologicHub — Communauté : préparation des images avant envoi
   ---------------------------------------------------------
   Chaque image est redessinée par le navigateur (canvas) puis réencodée
   en JPEG : les métadonnées (EXIF : date, appareil, position ; XMP ;
   IPTC ; commentaires) disparaissent, et une seconde passe
   (noyau/confidentialite.js) le vérifie. Les zones masquées par
   l'utilisateur (rectangles noirs : nom, date, texte incrusté) sont
   peintes AVANT l'encodage : elles ne sont pas récupérables.
   Taille maximale 1600 px (cas) ou 512 px en carré (photo de profil).
   ========================================================= */
(function () {
  'use strict';
  const C = window.RHReseau.confidentialite, RG = window.RHReseau.regles;
  const LIBELLES = { EXIF: 'EXIF (date, appareil, position)', XMP: 'XMP', IPTC: 'IPTC', commentaire: 'commentaire', 'texte PNG': 'textes PNG', date: 'date PNG' };

  async function decoder(fichier) {
    if (window.createImageBitmap) {
      try { return await createImageBitmap(fichier, { imageOrientation: 'from-image' }); } catch (e) { /* format non pris en charge : essai avec <img> */ }
    }
    const url = URL.createObjectURL(fichier);
    const img = new Image();
    img.src = url;
    try { await img.decode(); } catch (e) { URL.revokeObjectURL(url); throw new Error('Format d\'image non pris en charge : utilisez JPEG ou PNG (exportez les images DICOM ou HEIC en JPEG).'); }
    img._url = url;
    return img;
  }

  /* fichier → { blob (JPEG propre), largeur, hauteur, retirees: ['EXIF (…)', …] }
     masques : [{ x, y, l, h }] en fractions de l'image (0 à 1) */
  async function preparer(fichier, { max = 1600, qualite = 0.88, masques = [], carre = false } = {}) {
    if (!/^image\//.test(fichier.type || 'image/')) throw new Error('Ce fichier n\'est pas une image.');
    if (fichier.size > RG.LIMITES.octetsImage) throw new Error('Image trop lourde (8 Mo au plus).');
    const retirees = C.metadonnees(new Uint8Array(await fichier.arrayBuffer())).map(m => LIBELLES[m] || m);
    const src = await decoder(fichier);
    let sx = 0, sy = 0, sw = src.width, sh = src.height;
    if (carre) { const c = Math.min(sw, sh); sx = (sw - c) / 2; sy = (sh - c) / 2; sw = sh = c; }
    const k = Math.min(1, max / Math.max(sw, sh));
    const w = Math.max(1, Math.round(sw * k)), h = Math.max(1, Math.round(sh * k));
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    const g = cv.getContext('2d');
    g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
    g.drawImage(src, sx, sy, sw, sh, 0, 0, w, h);
    g.fillStyle = '#000';
    masques.forEach(m => g.fillRect(m.x * w, m.y * h, m.l * w, m.h * h));
    if (src.close) src.close();
    if (src._url) URL.revokeObjectURL(src._url);
    const brut = await new Promise((ok, ko) => cv.toBlob(b => (b ? ok(b) : ko(new Error('Encodage de l\'image impossible.'))), 'image/jpeg', qualite));
    const propre = C.nettoyer(new Uint8Array(await brut.arrayBuffer())) || new Uint8Array(await brut.arrayBuffer());
    if (C.metadonnees(propre).length) throw new Error('Métadonnées impossibles à retirer : image refusée.');
    return { blob: new Blob([propre], { type: 'image/jpeg' }), largeur: w, hauteur: h, retirees };
  }

  window.RHRs = window.RHRs || {};
  window.RHRs.images = { preparer, decoder };
})();
