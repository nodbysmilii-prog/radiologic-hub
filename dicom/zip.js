/* =========================================================
   Espace DICOM — archives .zip (navigateur et Node ≥ 18), sans
   bibliothèque : lecture par le répertoire central (fichiers stockés ou
   compressés « deflate », ZIP64), écriture d'une archive (scanner de
   test à télécharger). Décompression par DecompressionStream.
   ========================================================= */
(function (racine) {
  'use strict';

  const SIG_FIN = 0x06054b50, SIG_FIN64 = 0x06064b50, SIG_LOC64 = 0x07064b50, SIG_CENTRAL = 0x02014b50, SIG_LOCAL = 0x04034b50;
  const decodeur = new TextDecoder('utf-8');

  async function octets(blob, debut, fin) {
    return new DataView(await blob.slice(debut, fin).arrayBuffer());
  }

  const estZip = premiers => premiers.length >= 4 && premiers[0] === 0x50 && premiers[1] === 0x4b && premiers[2] === 0x03 && premiers[3] === 0x04;

  /* lireZip(blob) → [{ nom, taille, ouvrir: () => Promise<Blob> }] (dossiers exclus) */
  async function lireZip(blob) {
    const taille = blob.size;
    const debutFin = Math.max(0, taille - 65557);
    const fin = await octets(blob, debutFin, taille);
    let p = -1;
    for (let i = fin.byteLength - 22; i >= 0; i--) if (fin.getUint32(i, true) === SIG_FIN) { p = i; break; }
    if (p < 0) throw new Error('archive .zip illisible (fin introuvable)');
    let nb = fin.getUint16(p + 10, true);
    let tailleCentral = fin.getUint32(p + 12, true);
    let debutCentral = fin.getUint32(p + 16, true);
    // ZIP64 : localisateur juste avant la fin classique
    if ((nb === 0xffff || debutCentral === 0xffffffff || tailleCentral === 0xffffffff) && p >= 20 && fin.getUint32(p - 20, true) === SIG_LOC64) {
      const pos64 = Number(fin.getBigUint64(p - 20 + 8, true));
      const f64 = await octets(blob, pos64, pos64 + 56);
      if (f64.getUint32(0, true) !== SIG_FIN64) throw new Error('archive .zip illisible (ZIP64)');
      nb = Number(f64.getBigUint64(32, true));
      tailleCentral = Number(f64.getBigUint64(40, true));
      debutCentral = Number(f64.getBigUint64(48, true));
    }
    const c = await octets(blob, debutCentral, debutCentral + tailleCentral);
    const entrees = [];
    let i = 0;
    for (let k = 0; k < nb; k++) {
      if (c.getUint32(i, true) !== SIG_CENTRAL) throw new Error('archive .zip illisible (répertoire central)');
      const drapeaux = c.getUint16(i + 8, true);
      const methode = c.getUint16(i + 10, true);
      let comprime = c.getUint32(i + 20, true);
      let normal = c.getUint32(i + 24, true);
      const lNom = c.getUint16(i + 28, true), lExtra = c.getUint16(i + 30, true), lCom = c.getUint16(i + 32, true);
      let local = c.getUint32(i + 42, true);
      const nom = decodeur.decode(new Uint8Array(c.buffer, c.byteOffset + i + 46, lNom));
      // Champ ZIP64 (0x0001) : tailles et position sur 8 octets
      let e = i + 46 + lNom;
      const finExtra = e + lExtra;
      while (e + 4 <= finExtra) {
        const id = c.getUint16(e, true), l = c.getUint16(e + 2, true);
        if (id === 0x0001) {
          let q = e + 4;
          if (normal === 0xffffffff) { normal = Number(c.getBigUint64(q, true)); q += 8; }
          if (comprime === 0xffffffff) { comprime = Number(c.getBigUint64(q, true)); q += 8; }
          if (local === 0xffffffff) { local = Number(c.getBigUint64(q, true)); }
        }
        e += 4 + l;
      }
      i = finExtra + lCom;
      if (nom.endsWith('/')) continue;
      entrees.push({
        nom, taille: normal, chiffre: Boolean(drapeaux & 1), methode,
        async ouvrir() {
          if (this.chiffre) throw new Error(`${nom} : archive protégée par mot de passe`);
          const t = await octets(blob, local, local + 30);
          if (t.getUint32(0, true) !== SIG_LOCAL) throw new Error(`${nom} : entrée illisible`);
          const debut = local + 30 + t.getUint16(26, true) + t.getUint16(28, true);
          const brut = blob.slice(debut, debut + comprime);
          if (methode === 0) return brut;
          if (methode !== 8) throw new Error(`${nom} : compression non prise en charge (${methode})`);
          return new Response(brut.stream().pipeThrough(new DecompressionStream('deflate-raw'))).blob();
        },
      });
    }
    return entrees;
  }

  // CRC-32 (archives écrites)
  const TABLE = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
    return t;
  })();
  function crc32(o) {
    let c = 0xffffffff;
    for (let i = 0; i < o.length; i++) c = TABLE[(c ^ o[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }

  const DATE_DOS = ((2026 - 1980) << 9) | (1 << 5) | 1;   // 1er janvier 2026 (date fixe : archive reproductible)

  async function compresser(o) {
    const flux = new Blob([o]).stream().pipeThrough(new CompressionStream('deflate-raw'));
    return new Uint8Array(await new Response(flux).arrayBuffer());
  }

  /* ecrireZip([{ nom, octets: Uint8Array }], { compresser }) → Blob (sans ZIP64 : moins de 4 Go) */
  async function ecrireZip(fichiers, { compresser: avecCompression = true } = {}) {
    const encodeur = new TextEncoder();
    const parties = [], central = [];
    let position = 0;
    for (const f of fichiers) {
      const nom = encodeur.encode(f.nom);
      const crc = crc32(f.octets);
      let donnees = f.octets, methode = 0;
      if (avecCompression && typeof CompressionStream !== 'undefined') {
        const c = await compresser(f.octets);
        if (c.length < f.octets.length) { donnees = c; methode = 8; }
      }
      const local = new DataView(new ArrayBuffer(30));
      local.setUint32(0, SIG_LOCAL, true); local.setUint16(4, 20, true); local.setUint16(6, 0x0800, true); local.setUint16(8, methode, true);
      local.setUint16(12, DATE_DOS, true);
      local.setUint32(14, crc, true); local.setUint32(18, donnees.length, true); local.setUint32(22, f.octets.length, true); local.setUint16(26, nom.length, true);
      const c = new DataView(new ArrayBuffer(46));
      c.setUint32(0, SIG_CENTRAL, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(10, methode, true);
      c.setUint16(14, DATE_DOS, true);
      c.setUint32(16, crc, true); c.setUint32(20, donnees.length, true); c.setUint32(24, f.octets.length, true); c.setUint16(28, nom.length, true);
      c.setUint32(42, position, true);
      parties.push(new Uint8Array(local.buffer), nom, donnees);
      central.push(new Uint8Array(c.buffer), nom);
      position += 30 + nom.length + donnees.length;
    }
    const tailleCentral = central.reduce((s, x) => s + x.length, 0);
    const fin = new DataView(new ArrayBuffer(22));
    fin.setUint32(0, SIG_FIN, true); fin.setUint16(8, fichiers.length, true); fin.setUint16(10, fichiers.length, true);
    fin.setUint32(12, tailleCentral, true); fin.setUint32(16, position, true);
    return new Blob([...parties, ...central, new Uint8Array(fin.buffer)], { type: 'application/zip' });
  }

  const api = { lireZip, ecrireZip, estZip, crc32 };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else racine.RHDicomZip = api;
})(typeof self !== 'undefined' ? self : globalThis);
