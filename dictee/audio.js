/* =========================================================
   RadiologicHub — Dictée vocale : AUDIO POUR WHISPER LOCAL
   ---------------------------------------------------------
   Sans dépendance au navigateur (testé sous Node : tests/dictee-audio.test.js).

   • Reechantillonneur(freq) : flux du micro (44,1 / 48 kHz…) → 16 kHz mono,
     par morceaux, sans couture entre deux morceaux ;
   • wav(echantillons) : WAV PCM 16 bits mono 16 kHz, le seul format accepté
     par le service local (le navigateur produit lui-même ce format : pas de
     WebM/Opus renommé) ;
   • Decoupeur : dictée « par segments ». Coupe UNIQUEMENT dans une pause
     (silence ≥ 0,7 s après de la parole), jamais au milieu d'un mot ; un
     segment trop long (25 s) est coupé à l'instant le plus calme de ses 3
     dernières secondes. Les segments ne se chevauchent pas : pas de doublon
     à recoller ; une marge de 0,3 s est gardée avant le début de la parole ;
   • aDeLaParole(echantillons) : écarte les enregistrements silencieux
     (Whisper invente parfois du texte sur un silence) ;
   • raccorder(precedent, texte) : retire un début de segment qui répète la
     fin du précédent (sécurité ; ne devrait pas arriver sans chevauchement) ;
   • echoDuContexte(texte, contexte) : texte qui ne fait que recopier le
     contexte initial (défaut connu de Whisper sur un silence) → écarté.
   ========================================================= */

(function (root, api) {
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.RHDictee = root.RHDictee || {}).audio = api;
})(typeof self !== 'undefined' ? self : this, (function () {
  'use strict';
  const FREQ = 16000;
  const TRAME = 480;                   // 30 ms à 16 kHz

  class Reechantillonneur {
    constructor(freqSource) { this.r = freqSource / FREQ; this.pos = 0; this.reste = new Float32Array(0); }
    pousser(entree) {
      // filtre passe-bas simple (moyenne sur le pas) puis interpolation linéaire
      const x = new Float32Array(this.reste.length + entree.length);
      x.set(this.reste); x.set(entree, this.reste.length);
      const sortie = [];
      const k = Math.max(1, Math.floor(this.r));
      while (this.pos + k + 1 < x.length) {
        const i = Math.floor(this.pos), f = this.pos - i;
        let a = 0, b = 0;
        for (let j = 0; j < k; j++) { a += x[i + j]; b += x[i + j + 1]; }
        sortie.push(((1 - f) * a + f * b) / k);
        this.pos += this.r;
      }
      const garde = Math.floor(this.pos);
      this.reste = x.slice(garde);
      this.pos -= garde;
      return Float32Array.from(sortie);
    }
  }

  function wav(ech) {
    const n = ech.length, buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf);
    const ecrire = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
    ecrire(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); ecrire(8, 'WAVE');
    ecrire(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, FREQ, true); v.setUint32(28, FREQ * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
    ecrire(36, 'data'); v.setUint32(40, n * 2, true);
    for (let i = 0; i < n; i++) { const s = Math.max(-1, Math.min(1, ech[i])); v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true); }
    return buf;
  }

  const rms = (a, d = 0, f = a.length) => { let s = 0; for (let i = d; i < f; i++) s += a[i] * a[i]; return Math.sqrt(s / Math.max(1, f - d)); };

  /* Parole présente ? au moins 0,25 s de trames nettement au-dessus du bruit de fond */
  function aDeLaParole(ech, seuil = 0.012) {
    const t = [];
    for (let i = 0; i + TRAME <= ech.length; i += TRAME) t.push(rms(ech, i, i + TRAME));
    if (!t.length) return false;
    const fond = [...t].sort((a, b) => a - b)[Math.floor(t.length * 0.1)];
    const s = Math.max(seuil, Math.min(fond * 3, 0.03));   // parole continue sans pause : le « fond » est la voix elle-même
    return t.filter(x => x > s).length * TRAME >= 0.25 * FREQ;
  }

  class Decoupeur {
    constructor(o = {}) {
      this.silenceMs = o.silenceMs ?? 700; this.maxS = o.maxS ?? 25; this.margeMs = o.margeMs ?? 300; this.seuilMin = o.seuil ?? 0.012;
      this.surSegment = o.surSegment || (() => {});
      this.tampon = []; this.trames = []; this.parole = false; this.silence = 0; this.fond = 0.005; this.attente = new Float32Array(0);
    }
    seuil() { return Math.max(this.seuilMin, this.fond * 3); }
    pousser(ech) {
      const x = new Float32Array(this.attente.length + ech.length);
      x.set(this.attente); x.set(ech, this.attente.length);
      let i = 0;
      for (; i + TRAME <= x.length; i += TRAME) this.trame(x.slice(i, i + TRAME));
      this.attente = x.slice(i);
    }
    trame(t) {
      const e = rms(t);
      const voix = e > this.seuil();
      if (!voix) this.fond = this.fond * 0.95 + e * 0.05;         // bruit de fond suivi pendant les silences
      this.trames.push({ t, e });
      if (voix) { this.parole = true; this.silence = 0; }
      else if (this.parole) this.silence += 30;
      if (!this.parole) {                                            // avant la parole : garder seulement la marge
        const garde = Math.ceil(this.margeMs / 30);
        if (this.trames.length > garde) this.trames.splice(0, this.trames.length - garde);
        return;
      }
      if (this.silence >= this.silenceMs) return this.couper(this.trames.length);
      if (this.trames.length * 30 >= this.maxS * 1000) {
        // trop long : couper à la trame la plus calme des 3 dernières secondes
        const d = this.trames.length - 100;
        let m = d;
        for (let k = d; k < this.trames.length; k++) if (this.trames[k].e < this.trames[m].e) m = k;
        this.couper(m + 1);
      }
    }
    couper(n) {
      const pris = this.trames.splice(0, n);
      const ech = new Float32Array(pris.length * TRAME);
      pris.forEach((p, k) => ech.set(p.t, k * TRAME));
      this.parole = this.trames.some(p => p.e > this.seuil());
      this.silence = 0;
      if (aDeLaParole(ech, this.seuilMin)) this.surSegment(ech);
    }
    vider() {                                                        // à l'arrêt : le reste, s'il contient de la parole
      if (this.attente.length) { const t = new Float32Array(TRAME); t.set(this.attente); this.trame(t); this.attente = new Float32Array(0); }
      if (this.trames.length) this.couper(this.trames.length);
    }
  }

  const mots = s => String(s).trim().split(/\s+/).filter(Boolean);
  const nrm = m => m.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\p{L}\p{N}]/gu, '');
  function raccorder(precedent, texte) {
    const a = mots(precedent).map(nrm), b = mots(texte);
    for (let n = Math.min(6, a.length, b.length - 1); n >= 2; n--) {
      if (a.slice(-n).join(' ') === b.slice(0, n).map(nrm).join(' ')) return b.slice(n).join(' ');
    }
    return String(texte).trim();
  }
  function echoDuContexte(texte, contexte) {
    // seulement une recopie de la LISTE de termes (« Termes : a, b, c ») : jamais une phrase dictée
    const t = mots(texte).map(nrm).filter(Boolean).join(' '), c = mots(contexte).map(nrm).filter(Boolean).join(' ');
    const liste = /termes\s*:|compte rendu radiologique/i.test(texte) || (String(texte).match(/,/g) || []).length >= 2;
    return liste && t.length > 12 && c.includes(t);
  }

  return { FREQ, Reechantillonneur, wav, rms, aDeLaParole, Decoupeur, raccorder, echoDuContexte };
})());
