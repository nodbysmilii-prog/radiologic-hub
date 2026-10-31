#!/usr/bin/env node
/* =========================================================
   RadiologicHub — contrôle de santé des fonctions Supabase, SANS secret
   (étape finale du workflow « Déployer les fonctions Supabase », ou à la main :
   node scripts/sante-fonctions.js). Pour rp-agent, rp-lien, rp-taches :
   requête OPTIONS depuis https://radiologichub.com → statut 200, CORS
   accepté, et empreinte x-rp-version identique à celle du dépôt
   (scripts/preparer-backend.js). Quelques essais espacés : un déploiement
   peut mettre quelques secondes à être servi. N'affiche que oui / non et
   des versions ; code 1 si une fonction n'est pas saine.
   ========================================================= */
'use strict';
const { versionAttendue, FONCTIONS } = require('./preparer-backend.js');

const PROJET = 'wdbczcwnaxfnoioyukgr';
const SITE = 'https://radiologichub.com';

async function controler({ fetch: f = globalThis.fetch, essais = 5, attente = 6000, journal = console.log } = {}) {
  const attendue = versionAttendue();
  const resultats = [];
  for (const slug of FONCTIONS) {
    let etat = { slug, ok: false, statut: 'aucune réponse', version: null };
    for (let i = 0; i < essais; i++) {
      try {
        const r = await f(`https://${PROJET}.supabase.co/functions/v1/${slug}`, { method: 'OPTIONS', headers: { origin: SITE, 'access-control-request-method': 'POST' }, signal: AbortSignal.timeout(15000) });
        const v = r.headers.get('x-rp-version');
        const origine = r.headers.get('access-control-allow-origin');
        etat = { slug, statut: r.status, version: /^[0-9a-f]{12}$/.test(v || '') ? v : null, cors: origine === '*' || origine === SITE };
        etat.ok = r.status === 200 && etat.cors && etat.version === attendue;
      } catch (e) { etat = { slug, ok: false, statut: 'connexion impossible', version: null }; }
      if (etat.ok || i === essais - 1) break;
      await new Promise(r => setTimeout(r, attente));
    }
    journal(`${etat.ok ? '✓' : '✗'} ${slug} : statut ${etat.statut}, CORS ${etat.cors ? 'oui' : 'non'}, version ${etat.version || 'inconnue'} (dépôt ${attendue})`);
    resultats.push(etat);
  }
  return { ok: resultats.every(r => r.ok), resultats, attendue };
}

if (require.main === module) {
  controler().then(r => {
    console.log(r.ok ? 'Fonctions saines : code déployé identique au dépôt.' : 'Contrôle ÉCHOUÉ : voir les lignes ✗ (redéployer, ou attendre quelques minutes et relancer).');
    process.exit(r.ok ? 0 : 1);
  });
}
module.exports = { controler };
