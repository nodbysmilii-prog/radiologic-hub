/* =========================================================
   RadiologicHub — Assistant IA : accès au serveur
   ---------------------------------------------------------
   Production : connexion par lien magique (Supabase Auth), puis appel
   de la fonction serveur « cr-ia », qui vérifie que l'e-mail fait partie
   des comptes autorisés (secret IA_EMAILS) avant d'appeler Claude avec
   la clé gardée côté serveur.
   Démonstration (config vide) : réponse d'exemple, aucun envoi.
   ========================================================= */
(function () {
  'use strict';
  const propre = c => c && c.supabaseUrl && c.supabaseAnonKey ? c : null;
  const cfg = propre(window.RH_IA_CONFIG) || propre(window.RH_REMPLACEMENTS_CONFIG);
  let sb = null;

  const charger = () => new Promise((resolve, reject) => {
    if (window.supabase) return resolve();
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js';
    s.onload = resolve; s.onerror = () => reject(new Error('Bibliothèque Supabase injoignable.'));
    document.head.appendChild(s);
  });

  const EXEMPLE = [
    'SCANNER ABDOMINO-PELVIEN',
    '',
    'RENSEIGNEMENTS CLINIQUES :',
    'Douleur de la fosse iliaque droite fébrile, CRP à 85.',
    '',
    'TECHNIQUE :',
    'Acquisition hélicoïdale multicoupes fines prenant l\'abdomen sans et avec injection intra-veineuse de produit de contraste iodé.',
    '',
    'RÉSULTATS :',
    '• Foie non dysmorphique, de taille normale, de contours réguliers, siège d\'une hypodensité diffuse et homogène en rapport avec une stéatose, de rehaussement homogène.',
    '• Tronc porte, veines hépatiques et VCI perméables.',
    '• Absence de dilatation des voies biliaires intra- ou extra-hépatiques.',
    '• La vésicule biliaire est non distendue.',
    '• Le pancréas est de volume normal et de rehaussement homogène.',
    '• La rate est de taille normale et de rehaussement homogène.',
    '• Les surrénales sont d\'aspect normal.',
    '• Les reins sont en place, de taille et de trophicité normales et de contours réguliers.',
    '• Kyste cortical du pôle supérieur du rein gauche, mesurant 22 mm, de densité liquidienne (8 UH), à paroi fine, sans rehaussement après injection.',
    '• Absence de dilatation des cavités pyélo-calicielles ni de calcul décelable.',
    '• Appendice augmenté de calibre, mesurant 9 mm, à paroi épaissie et rehaussée, avec stercolithe à sa base et infiltration de la graisse péri-appendiculaire.',
    '• Fine lame d\'épanchement de la fosse iliaque droite.',
    '• Vessie en semi-réplétion, de plage homogène.',
    '• Absence d\'adénomégalie intra- ou rétro-péritonéale.',
    '• Absence de lésion osseuse condensante ou lytique suspecte de malignité.',
    '',
    'AU TOTAL :',
    'Aspect en faveur d\'une appendicite aiguë avec stercolithe, sans signe de complication décrit.',
    'Stéatose hépatique homogène.',
    'Kyste cortical simple du rein gauche (Bosniak I, version 2019), sans suivi nécessaire.',
  ].join('\n');

  const api = {
    demo: !cfg,
    async init() {
      if (!cfg) return null;
      await charger();
      sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
      return api.session();
    },
    async session() {
      if (!sb) return null;
      const { data } = await sb.auth.getSession();
      return data.session ? { email: data.session.user.email } : null;
    },
    surChangement(fn) { if (sb) sb.auth.onAuthStateChange((_e, s) => fn(s ? { email: s.user.email } : null)); },
    async connexion(email) {
      const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: location.origin + location.pathname } });
      if (error) throw new Error(error.message);
    },
    async deconnexion() { if (sb) await sb.auth.signOut(); },
    async rediger(demande) {
      if (!cfg) {
        await new Promise(r => setTimeout(r, 900));
        return {
          ok: true, demo: true, cr: EXEMPLE,
          verifier: ['Préciser la présence ou l\'absence de collection, d\'abcès ou de pneumopéritoine (non citées dans les notes).', 'Position de l\'appendice non précisée.'],
          secondRegard: demande.images && demande.images.length ? '- Démonstration : aucune image n\'a été envoyée.' : '',
        };
      }
      const { data, error } = await sb.functions.invoke('cr-ia', { body: demande });
      if (error) {
        let message = error.message;
        try { const j = await error.context.json(); message = j.erreur || message; } catch (e) { /* réponse non JSON */ }
        throw new Error(message);
      }
      return data;
    },
  };
  window.RHIAApi = api;
})();
