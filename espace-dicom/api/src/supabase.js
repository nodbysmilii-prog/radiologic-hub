'use strict';
/* =========================================================
   Accès à Supabase (API REST PostgREST).
   • Avec le jeton de l'utilisateur : ses droits (fonctions dc_* de la
     migration …_espace_dicom.sql), filtrés par les règles RLS.
   • Avec la clé de service : écritures réservées au serveur (journal,
     examens, liens…). Clé « service_role » (JWT) ou « secret »
     (sb_secret_…), jamais envoyée au navigateur.
   ========================================================= */
const crypto = require('node:crypto');

const enTetesService = cle => (cle.startsWith('sb_secret_') ? { apikey: cle } : { apikey: cle, authorization: `Bearer ${cle}` });

function creerSupabase({ restUrl, clePublique, cleService, fetch = globalThis.fetch }) {
  const base = restUrl.replace(/\/$/, '');

  async function appel(chemin, { jeton = null, methode = 'POST', corps, enTetes = {} } = {}) {
    const auth = jeton ? { apikey: clePublique, authorization: `Bearer ${jeton}` } : enTetesService(cleService);
    const r = await fetch(base + chemin, {
      method: methode,
      headers: { accept: 'application/json', 'content-type': 'application/json', ...auth, ...enTetes },
      body: corps === undefined ? undefined : JSON.stringify(corps),
      signal: AbortSignal.timeout(8000),
    });
    return r;
  }

  // Fonction SQL appelée avec le jeton de l'utilisateur ; null si le jeton est refusé
  async function rpcUtilisateur(fonction, jeton, args = {}) {
    const r = await appel(`/rpc/${fonction}`, { jeton, corps: args });
    if (r.status === 401 || r.status === 403) return null;
    if (!r.ok) throw new Error(`Supabase ${fonction} : réponse ${r.status}`);
    return r.json();
  }

  async function inserer(table, lignes) {
    const r = await appel(`/${table}`, { corps: lignes, enTetes: { prefer: 'return=minimal' } });
    if (!r.ok) throw new Error(`Supabase ${table} : réponse ${r.status} ${(await r.text()).slice(0, 300)}`);
  }

  return { appel, rpcUtilisateur, inserer };
}

/* Droits d'un utilisateur sur une étude, avec cache court : une série de
   500 images déclenche 500 vérifications, une seule interroge Supabase.
   Un retrait de droit prend effet après ttlMs au plus. */
function creerDroits(supabase, { ttlMs = 60_000, ttlRefusMs = 10_000, max = 20_000, horloge = Date.now } = {}) {
  const cache = new Map();

  async function charger(jeton, uid) {
    const lignes = await supabase.rpcUtilisateur('dc_droits_etude', jeton, { uid });
    if (!Array.isArray(lignes) || !lignes.length) return null;
    const droits = [...new Set(lignes.flatMap(l => l.droits || []))].sort();
    if (!droits.length) return null;
    const l = lignes.find(x => (x.droits || []).length) || lignes[0];
    return { examenId: l.examen_id, orthancId: l.orthanc_id, droits };
  }

  async function droitsEtude(jeton, uid) {
    const cle = crypto.createHash('sha256').update(jeton).digest('base64') + '|' + uid;
    const c = cache.get(cle);
    if (c && (c.promesse || c.expire > horloge())) return c.promesse || c.valeur;
    const promesse = charger(jeton, uid);
    cache.set(cle, { promesse });
    try {
      const valeur = await promesse;
      if (cache.size > max) cache.delete(cache.keys().next().value);
      cache.set(cle, { valeur, expire: horloge() + (valeur ? ttlMs : ttlRefusMs) });
      return valeur;
    } catch (e) {
      cache.delete(cle);
      throw e;
    }
  }

  return { droitsEtude, vider: () => cache.clear(), taille: () => cache.size };
}

module.exports = { creerSupabase, creerDroits, enTetesService };
