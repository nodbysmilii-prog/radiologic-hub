'use strict';
/* =========================================================
   Client de l'API REST d'Orthanc, joignable seulement sur le réseau
   Docker interne, avec les identifiants internes du fichier .env.
   ========================================================= */

function creerOrthanc({ url, utilisateur, motDePasse, fetch = globalThis.fetch }) {
  const base = url.replace(/\/$/, '');
  const autorisation = 'Basic ' + Buffer.from(`${utilisateur}:${motDePasse}`).toString('base64');

  function appel(chemin, options = {}) {
    return fetch(base + chemin, { ...options, headers: { authorization: autorisation, ...(options.headers || {}) } });
  }

  async function json(chemin, options = {}) {
    const r = await appel(chemin, options);
    if (!r.ok) throw new Error(`Orthanc ${chemin} : réponse ${r.status}`);
    return r.json();
  }

  let derniere = { quand: 0, ok: false };
  async function sante() {
    if (Date.now() - derniere.quand < 5000) return derniere.ok;
    let ok = false;
    try { ok = (await appel('/system', { signal: AbortSignal.timeout(3000) })).ok; } catch { ok = false; }
    derniere = { quand: Date.now(), ok };
    return ok;
  }

  return { appel, json, sante };
}

module.exports = { creerOrthanc };
