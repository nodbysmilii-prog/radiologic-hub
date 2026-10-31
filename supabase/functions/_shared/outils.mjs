// =====================================================================
// RadiologicHub — outils communs des fonctions serveur (sans dépendance,
// testés sous Node par tests/fonctions-outils.test.js)
// • masquerEmail : adresse lisible dans les journaux sans être divulguée
//   (« ja***@exemple.tn ») ;
// • lireCorps : corps JSON d'une requête, toujours un objet (sinon null) ;
// • texteBorne : chaîne non vide d'au plus n caractères (sinon null).
// =====================================================================

/** @param {unknown} email */
export function masquerEmail(email) {
  const e = String(email || '');
  const at = e.lastIndexOf('@');
  if (at < 1) return '[adresse masquée]';
  return `${e.slice(0, Math.min(2, at))}***${e.slice(at)}`;
}

/** @param {Request} req @returns {Promise<Record<string, unknown> | null>} */
export async function lireCorps(req) {
  try {
    const c = await req.json();
    return c && typeof c === 'object' && !Array.isArray(c) ? c : null;
  } catch {
    return null;
  }
}

/** @param {unknown} v @param {number} n */
export function texteBorne(v, n) {
  if (typeof v !== 'string' && typeof v !== 'number') return null;
  const s = String(v);
  return s.length >= 1 && s.length <= n ? s : null;
}
