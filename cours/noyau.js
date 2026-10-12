/* =========================================================
   RadiologicHub — Cours d'échoanatomie : noyau
   ---------------------------------------------------------
   Règles partagées par la page du cours, l'administration et les
   tests (sans navigateur) :
   • catalogue des éléments à valider (texte, schémas, modèles 3D,
     images) et leur VERSION (empreinte du contenu) ;
   • état de chaque élément selon les validations de l'auteur : visible
     des élèves seulement s'il est approuvé dans sa version actuelle ;
   • plan de coupe : hauteur relative (0 = ischion, 1 = plateau tibial)
     ↔ altitude dans le repère des modèles, schéma le plus proche ;
   • étiquettes superposées aux images : nettoyage et bornes.
   ========================================================= */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.RHCoursNoyau = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const STATUTS = {
    a_valider: 'À valider',
    approuve: 'Approuvé',
    a_corriger: 'À corriger',
    modifie: 'Modifié depuis l\'approbation',
  };
  const TYPES = { texte: 'Texte du cours', schema: 'Schéma de coupe', modele: 'Modèle 3D', image: 'Image échographique' };
  const TIERS = { proximal: ['s1', 's2', 's3'], moyen: ['s4'], distal: ['s5', 's6'] };
  const CATEGORIES_3D = {
    muscle: 'Ischio-jambiers', contexte: 'Muscles de contexte', os: 'Os', nerf: 'Nerfs', artere: 'Vaisseaux', veine: 'Vaisseaux',
  };
  const MAX_ETIQUETTES = 30;

  /* Empreinte courte (FNV-1a 32 bits), identique à celle de schemas/ischio-jambiers.js */
  function empreinte(texte) {
    const s = String(texte);
    let h = 0x811c9dc5;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    return h.toString(16).padStart(8, '0');
  }
  const normaliserTexte = t => String(t || '').replace(/\s+/g, ' ').trim();

  /* Version du texte d'un cours : tout le contenu des blocs [data-texte] d'un document (page ou DOMParser) */
  function versionTexte(doc) {
    const blocs = Array.from(doc.querySelectorAll('[data-texte]'));
    return empreinte(blocs.map(b => normaliserTexte(b.textContent)).join('\n'));
  }

  /* Catalogue des éléments d'un cours, avec leur version actuelle */
  function catalogue({ texte, schemas = [], modeles = [], images = [] }) {
    const out = [];
    if (texte) out.push({ element: 'texte', type: 'texte', version: texte, libelle: 'Texte du cours' });
    schemas.forEach(s => out.push({ element: `schema-${s.id}`, type: 'schema', ref: s.id, version: s.version, libelle: `${s.court} · ${s.titre}` }));
    modeles.forEach(m => out.push({ element: `modele-${m.id}`, type: 'modele', ref: m.id, version: m.version, libelle: m.nom, categorie: m.categorie }));
    images.forEach(i => out.push({ element: `image-${i.schema}`, type: 'image', ref: i.schema, version: `r${i.revision}`, libelle: `Image de ${i.schema.toUpperCase()}` }));
    return out;
  }

  /* État d'un élément d'après la ligne de validation de l'auteur (ou son absence) */
  function etat(el, validation) {
    if (!validation) return { statut: 'a_valider', visible: false };
    const memeVersion = validation.version === el.version;
    const base = { versionValidee: validation.version, commentaire: validation.commentaire || '', maj_le: validation.maj_le || null };
    if (validation.statut === 'approuve') return memeVersion ? { ...base, statut: 'approuve', visible: true } : { ...base, statut: 'modifie', visible: false };
    if (validation.statut === 'a_corriger') return { ...base, statut: 'a_corriger', visible: false, modifieDepuis: !memeVersion };
    return { ...base, statut: 'a_valider', visible: false };
  }
  /* États de tous les éléments : { element → état } */
  function etats(elements, validations) {
    const parElement = new Map((validations || []).map(v => [v.element, v]));
    return Object.fromEntries(elements.map(el => [el.element, etat(el, parElement.get(el.element))]));
  }
  /* Résumé pour l'administration : nombre d'éléments par statut */
  function resume(elements, lesEtats) {
    const r = { a_valider: 0, approuve: 0, a_corriger: 0, modifie: 0 };
    elements.forEach(el => { r[lesEtats[el.element].statut]++; });
    return r;
  }

  /* ---------- Plan de coupe ---------- */
  const borner = (v, a, b) => Math.min(b, Math.max(a, v));
  /* Hauteur relative (0 = ischion, 1 = plateau tibial) → altitude y du repère des modèles */
  const hauteurVersY = (f, reperes) => reperes.ischion_y - borner(f, -0.15, 1.15) * (reperes.ischion_y - reperes.plateau_tibial_y);
  const yVersHauteur = (y, reperes) => (reperes.ischion_y - y) / (reperes.ischion_y - reperes.plateau_tibial_y);
  /* Schéma le plus proche d'une hauteur, parmi ceux proposés ({ id, hauteur }) */
  function schemaLePlusProche(f, schemas) {
    let meilleur = null;
    for (const s of schemas) if (!meilleur || Math.abs(s.hauteur - f) < Math.abs(meilleur.hauteur - f)) meilleur = s;
    return meilleur ? meilleur.id : null;
  }
  const tiersDe = id => Object.keys(TIERS).find(t => TIERS[t].includes(id)) || null;

  /* ---------- Étiquettes superposées aux images (positions en % de l'image) ---------- */
  function normaliserEtiquettes(liste) {
    return (Array.isArray(liste) ? liste : [])
      .map(e => ({
        texte: normaliserTexte(e && e.texte).slice(0, 80),
        x: Math.round(borner(Number(e && e.x) || 0, 0, 100) * 10) / 10,
        y: Math.round(borner(Number(e && e.y) || 0, 0, 100) * 10) / 10,
      }))
      .filter(e => e.texte)
      .slice(0, MAX_ETIQUETTES);
  }

  /* Date courte en français */
  const dateCourte = d => (d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '');

  return {
    STATUTS, TYPES, TIERS, CATEGORIES_3D, MAX_ETIQUETTES,
    empreinte, normaliserTexte, versionTexte, catalogue, etat, etats, resume,
    hauteurVersY, yVersHauteur, schemaLePlusProche, tiersDe, normaliserEtiquettes, dateCourte,
  };
});
