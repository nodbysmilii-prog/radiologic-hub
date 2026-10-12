/* =========================================================
   RadiologicHub — Cours : choix de la source de données
   Supabase si remplacements/config.js est renseigné (même projet que
   les autres modules), sinon démonstration. Préparation des images :
   réduction à 1600 px au plus et réenregistrement en JPEG, ce qui
   supprime les métadonnées du fichier d'origine (EXIF, DICOM exporté…).
   ========================================================= */
(function () {
  'use strict';
  const cfg = window.RH_REMPLACEMENTS_CONFIG || {};
  const B = window.RHCours = window.RHCours || {};
  const MAX = 1600;

  B.preparerImage = fichier => new Promise((resolve, reject) => {
    if (!fichier || !/^image\/(jpeg|png|webp)$/.test(fichier.type)) return reject(new Error('Format accepté : JPEG, PNG ou WebP.'));
    if (fichier.size > 15 * 1024 * 1024) return reject(new Error('Image trop lourde (15 Mo au plus).'));
    const lien = URL.createObjectURL(fichier);
    const img = new Image();
    img.onload = () => {
      const r = Math.min(1, MAX / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement('canvas');
      c.width = Math.round(img.naturalWidth * r); c.height = Math.round(img.naturalHeight * r);
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(lien);
      c.toBlob(blob => {
        if (!blob) return reject(new Error('Image illisible.'));
        resolve({ blob, dataUrl: c.toDataURL('image/jpeg', 0.85), largeur: c.width, hauteur: c.height });
      }, 'image/jpeg', 0.85);
    };
    img.onerror = () => { URL.revokeObjectURL(lien); reject(new Error('Image illisible.')); };
    img.src = lien;
  });

  B.api = cfg.supabaseUrl && cfg.supabaseAnonKey && B.apiSupabase ? B.apiSupabase : B.apiDemo;
})();
