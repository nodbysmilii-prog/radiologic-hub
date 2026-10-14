'use strict';
/* =========================================================
   Configuration de dicom-api, lue dans les variables d'environnement
   (fichier .env de docker compose). Aucun domaine ni hébergeur n'est
   écrit dans le code.
   ========================================================= */

function lireConfig(env = process.env) {
  const exiger = nom => {
    const v = String(env[nom] || '').trim();
    if (!v) throw new Error(`Variable ${nom} manquante (voir espace-dicom/.env.example)`);
    return v;
  };
  const sansBarre = s => String(s || '').trim().replace(/\/+$/, '');
  const supabaseUrl = sansBarre(env.SUPABASE_URL);
  const restUrl = sansBarre(env.SUPABASE_REST_URL) || (supabaseUrl && `${supabaseUrl}/rest/v1`);
  if (!restUrl) throw new Error('Variable SUPABASE_URL manquante (voir espace-dicom/.env.example)');
  const jwtSecret = String(env.SUPABASE_JWT_SECRET || '').trim();
  const jwksUrl = sansBarre(env.SUPABASE_JWKS_URL) || (supabaseUrl && `${supabaseUrl}/auth/v1/.well-known/jwks.json`);

  return {
    port: Number(env.PORT) || 3000,
    orthanc: {
      url: sansBarre(env.ORTHANC_URL) || 'http://orthanc:8042',
      utilisateur: exiger('ORTHANC_UTILISATEUR'),
      motDePasse: exiger('ORTHANC_MOT_DE_PASSE'),
    },
    supabase: {
      restUrl,
      clePublique: exiger('SUPABASE_CLE_PUBLIQUE'),
      cleService: exiger('SUPABASE_CLE_SERVICE'),
      jwtSecret,
      jwksUrl,
    },
    origines: String(env.DICOM_SITE_ORIGINES || '').split(/[\s,]+/).map(sansBarre).filter(Boolean),
    urlPublique: sansBarre(env.DICOM_URL_PUBLIQUE),
    droitsCacheMs: Math.max(1, Number(env.DROITS_CACHE_SECONDES) || 60) * 1000,
  };
}

module.exports = { lireConfig };
