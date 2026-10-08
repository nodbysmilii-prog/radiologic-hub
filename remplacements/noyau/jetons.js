/* =========================================================
   RadiologicHub — Remplacements : liens sécurisés
   ---------------------------------------------------------
   • Jetons à usage unique (boutons des e-mails) : 32 octets aléatoires ;
     seule leur empreinte SHA-256 est enregistrée en base.
   • Liens de désinscription : signature HMAC-SHA256 (aucune donnée en base).
   Utilise l'API Web Crypto (navigateur, Deno, Node ≥ 19).
   ========================================================= */

(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.RHRemplacements = root.RHRemplacements || {}).jetons = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const C = () => globalThis.crypto;
  const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
  const b64url = bytes => {
    let s = '';
    bytes.forEach(b => { s += String.fromCharCode(b); });
    return (typeof btoa === 'function' ? btoa(s) : Buffer.from(s, 'binary').toString('base64')).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  };
  const octets = s => new TextEncoder().encode(s);

  /* Nouveau jeton aléatoire (43 caractères, utilisable dans une URL) */
  const nouveauJeton = () => b64url(C().getRandomValues(new Uint8Array(32)));
  /* Empreinte SHA-256 (hexadécimal) : c'est elle qui est stockée */
  const empreinte = async jeton => hex(await C().subtle.digest('SHA-256', octets(String(jeton))));

  const cle = secret => C().subtle.importKey('raw', octets(String(secret)), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  /* Signature HMAC tronquée (32 caractères hexadécimaux) */
  const signer = async (texte, secret) => hex(await C().subtle.sign('HMAC', await cle(secret), octets(String(texte)))).slice(0, 32);
  const verifier = async (texte, signature, secret) => {
    const attendu = await signer(texte, secret);
    if (typeof signature !== 'string' || signature.length !== attendu.length) return false;
    let diff = 0;
    for (let i = 0; i < attendu.length; i++) diff |= attendu.charCodeAt(i) ^ signature.charCodeAt(i);
    return diff === 0;
  };

  return { nouveauJeton, empreinte, signer, verifier };
});
