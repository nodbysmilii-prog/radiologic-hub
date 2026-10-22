'use strict';
/* =========================================================
   Analyse d'une requête DICOMweb avant de la relayer à Orthanc.
   Nginx transmet le chemin NORMALISÉ ($uri, celui qu'il relaie) et la
   chaîne de requête ($args). On n'accepte que la lecture (GET, HEAD) et
   des chemins qui désignent UNE étude :
   • /dicomweb/studies/{étude}[/…]  (métadonnées, séries, instances,
     images, vignettes, données binaires) ;
   • /dicomweb/studies|series|instances?StudyInstanceUID={étude}
     (recherche limitée à une étude : sans ce filtre, elle listerait
     tous les examens du serveur).
   Sous une étude, un filtre StudyInstanceUID ne peut viser qu'elle.
   Tout le reste est refusé.
   ========================================================= */

const UID = /^[0-9]+(\.[0-9]+)*$/;
const uidValide = u => typeof u === 'string' && u.length > 0 && u.length <= 64 && UID.test(u);
const PREFIXE = '/dicomweb/';
const CARACTERES = /^[A-Za-z0-9._,/-]*$/;
const VUES = new Set(['metadata', 'rendered', 'thumbnail']);
const IMAGES = /^[0-9]{1,5}(,[0-9]{1,5}){0,999}$/;
const BALISE = /^([0-9A-Fa-f]{8}|[0-9]{1,4})$/;

const refus = motif => ({ ok: false, motif });

// Valeurs du filtre StudyInstanceUID (0020000D) dans la chaîne de requête
function filtresEtude(requete) {
  const valeurs = [];
  for (const [cle, valeur] of new URLSearchParams(requete || '')) {
    if (cle.toLowerCase() === 'studyinstanceuid' || cle.toUpperCase() === '0020000D') valeurs.push(valeur);
  }
  return valeurs;
}
function filtreEtude(requete) {
  const valeurs = filtresEtude(requete);
  if (valeurs.length !== 1 || !uidValide(valeurs[0])) return null;
  return valeurs[0];
}

// Fin de chemin sous /studies/{étude}/series/{série}/instances/{instance}
function suiteInstance(reste) {
  if (reste.length === 0) return true;
  if (reste.length === 1 && VUES.has(reste[0])) return true;
  if (reste[0] === 'frames') {
    if (reste.length < 2 || !IMAGES.test(reste[1])) return false;
    return reste.length === 2 || (reste.length === 3 && (reste[2] === 'rendered' || reste[2] === 'thumbnail'));
  }
  if (reste[0] === 'bulk') return reste.length >= 2 && reste.length <= 12 && reste.slice(1).every(b => BALISE.test(b));
  return false;
}

function suiteSerie(reste) {
  if (reste.length === 0) return true;
  if (reste.length === 1 && (VUES.has(reste[0]) || reste[0] === 'instances')) return true;
  if (reste[0] === 'instances' && reste.length >= 2) return uidValide(reste[1]) && suiteInstance(reste.slice(2));
  return false;
}

function suiteEtude(reste) {
  if (reste.length === 0) return true;
  if (reste.length === 1 && (VUES.has(reste[0]) || reste[0] === 'series' || reste[0] === 'instances')) return true;
  if (reste[0] === 'series' && reste.length >= 2) return uidValide(reste[1]) && suiteSerie(reste.slice(2));
  return false;
}

/* analyserDicomweb({ methode, chemin, requete }) → { ok: true, etude } | { ok: false, motif } */
function analyserDicomweb({ methode, chemin, requete = '' } = {}) {
  if (methode !== 'GET' && methode !== 'HEAD') return refus('méthode refusée');
  if (typeof chemin !== 'string' || !chemin.startsWith(PREFIXE) || chemin.length > 1024) return refus('chemin refusé');
  if (!CARACTERES.test(chemin) || chemin.includes('..') || chemin.includes('//')) return refus('chemin refusé');
  const segments = chemin.slice(PREFIXE.length).replace(/\/$/, '').split('/');
  const [racine, etude, ...reste] = segments;

  if (segments.length === 1 && ['studies', 'series', 'instances'].includes(racine)) {
    const uid = filtreEtude(requete);
    return uid ? { ok: true, etude: uid } : refus('recherche sans filtre d\'étude');
  }
  if (racine !== 'studies' || !uidValide(etude)) return refus('chemin refusé');
  if (!suiteEtude(reste)) return refus('chemin refusé');
  // Sous une étude, un filtre ne peut pas viser une autre étude
  if (filtresEtude(requete).some(v => v !== etude)) return refus('filtre d\'une autre étude');
  return { ok: true, etude };
}

module.exports = { analyserDicomweb, uidValide };
