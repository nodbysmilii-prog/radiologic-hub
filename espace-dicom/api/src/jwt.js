'use strict';
/* =========================================================
   Vérification des jetons de session Supabase (JWT), sans dépendance.
   • HS256 : projets Supabase à secret partagé (ancienne formule) ;
   • ES256 / RS256 : clés publiques du projet (JWKS), rechargées
     régulièrement et quand une clé inconnue apparaît.
   « alg: none » et tout autre algorithme sont refusés.
   ========================================================= */
const crypto = require('node:crypto');

class ErreurJeton extends Error {}

const ALGOS = {
  HS256: { type: 'hmac' },
  ES256: { type: 'ec' },
  RS256: { type: 'rsa' },
};

const base64url = s => Buffer.from(String(s).replace(/-/g, '+').replace(/_/g, '/'), 'base64');

/* verifierJwt(jeton, { secret, cleDe, audience, maintenant, marge }) → charge utile
   cleDe(kid, alg) → KeyObject publique (ou null) ; maintenant en secondes. */
async function verifierJwt(jeton, { secret = '', cleDe = null, audience = 'authenticated', maintenant = Date.now() / 1000, marge = 30 } = {}) {
  if (typeof jeton !== 'string' || !jeton || jeton.length > 8192) throw new ErreurJeton('jeton absent ou trop long');
  const parties = jeton.split('.');
  if (parties.length !== 3 || parties.some(p => !/^[A-Za-z0-9_-]*$/.test(p))) throw new ErreurJeton('jeton mal formé');
  let entete, charge;
  try {
    entete = JSON.parse(base64url(parties[0]).toString('utf8'));
    charge = JSON.parse(base64url(parties[1]).toString('utf8'));
  } catch {
    throw new ErreurJeton('jeton illisible');
  }
  if (!entete || typeof entete !== 'object' || !charge || typeof charge !== 'object') throw new ErreurJeton('jeton illisible');
  const algo = ALGOS[entete.alg];
  if (!algo) throw new ErreurJeton(`algorithme refusé : ${entete.alg}`);

  const donnees = Buffer.from(`${parties[0]}.${parties[1]}`);
  const signature = base64url(parties[2]);
  let valide = false;
  if (algo.type === 'hmac') {
    if (!secret) throw new ErreurJeton('HS256 non configuré');
    const attendu = crypto.createHmac('sha256', secret).update(donnees).digest();
    valide = attendu.length === signature.length && crypto.timingSafeEqual(attendu, signature);
  } else {
    if (!cleDe) throw new ErreurJeton('clés publiques non configurées');
    const cle = await cleDe(entete.kid, entete.alg);
    if (!cle || cle.asymmetricKeyType !== algo.type) throw new ErreurJeton('clé inconnue');
    try {
      valide = crypto.verify('sha256', donnees, algo.type === 'ec' ? { key: cle, dsaEncoding: 'ieee-p1363' } : cle, signature);
    } catch {
      valide = false;
    }
  }
  if (!valide) throw new ErreurJeton('signature invalide');

  if (typeof charge.exp !== 'number' || charge.exp + marge < maintenant) throw new ErreurJeton('jeton expiré');
  if (typeof charge.nbf === 'number' && charge.nbf - marge > maintenant) throw new ErreurJeton('jeton pas encore valable');
  if (audience) {
    const aud = Array.isArray(charge.aud) ? charge.aud : [charge.aud];
    if (!aud.includes(audience)) throw new ErreurJeton('audience refusée');
  }
  return charge;
}

/* Clés publiques du projet (JWKS) : cache de 10 min ; une clé inconnue
   provoque un rechargement, au plus une fois par minute. */
function creerJwks(url, { fetch = globalThis.fetch, dureeMs = 600_000, horloge = Date.now } = {}) {
  let cles = new Map();
  let chargeLe = 0;
  let enCours = null;

  async function charger() {
    const r = await fetch(url, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(5000) });
    if (!r.ok) throw new Error(`JWKS : réponse ${r.status}`);
    const { keys = [] } = await r.json();
    const m = new Map();
    for (const jwk of keys) {
      if (!jwk || !jwk.kid || !['EC', 'RSA'].includes(jwk.kty)) continue;
      try {
        m.set(jwk.kid, { cle: crypto.createPublicKey({ key: jwk, format: 'jwk' }), alg: jwk.alg || null });
      } catch { /* clé illisible : ignorée */ }
    }
    cles = m;
    chargeLe = horloge();
  }

  return async function cleDe(kid, alg) {
    const age = horloge() - chargeLe;
    if (age > dureeMs || (!cles.has(kid) && age > 60_000)) {
      enCours = enCours || charger().finally(() => { enCours = null; });
      try { await enCours; } catch (e) { if (!cles.size) throw e; }
    }
    const k = cles.get(kid);
    if (!k || (k.alg && k.alg !== alg)) return null;
    return k.cle;
  };
}

module.exports = { verifierJwt, creerJwks, ErreurJeton };
