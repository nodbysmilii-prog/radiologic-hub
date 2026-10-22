/* =========================================================
   Espace DICOM — configuration du site.
   • serveur vide → MODE DÉMONSTRATION : les examens sont lus et gardés
     dans le navigateur, rien n'est envoyé.
   • En service : adresse du serveur de l'Espace DICOM (DICOM_URL_PUBLIQUE
     du fichier espace-dicom/.env), ex. 'https://dicom.mon-domaine.tn'.
     Les comptes sont ceux de remplacements/config.js (Supabase).
   ========================================================= */
window.RH_DICOM_CONFIG = {
  serveur: '',
};
