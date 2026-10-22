'use strict';
/* =========================================================
   Journal d'audit (table dc_journal) : qui, quoi, quand, IP, navigateur.
   Les entrées sont regroupées et envoyées toutes les 2 s. Une
   consultation n'est notée qu'une fois par personne et par examen toutes
   les 10 min (sinon une série de 500 images ferait 500 lignes).
   Jamais d'identité de patient ici : identifiants techniques seulement.
   ========================================================= */
const net = require('node:net');

const COLONNES = ['acteur', 'partage_id', 'passerelle_id', 'examen_id', 'action', 'ip', 'navigateur', 'details'];

function normaliser(e) {
  const ligne = {};
  for (const c of COLONNES) ligne[c] = e[c] === undefined ? null : e[c];
  ligne.ip = ligne.ip && net.isIP(String(ligne.ip)) ? String(ligne.ip) : null;
  ligne.navigateur = ligne.navigateur ? String(ligne.navigateur).slice(0, 300) : null;
  ligne.details = ligne.details && typeof ligne.details === 'object' ? ligne.details : {};
  return ligne;
}

function creerJournal(supabase, { intervalleMs = 2000, lot = 50, dedoublonnageMs = 600_000, horloge = Date.now, signaler = console.error } = {}) {
  const file = [];
  const vus = new Map();
  let envoi = null;

  async function vider() {
    if (envoi) await envoi;
    if (!file.length) return;
    const lignes = file.splice(0, 500);
    envoi = supabase.inserer('dc_journal', lignes).catch(e => {
      signaler(`journal : ${e.message}`);
      if (file.length < 10_000) file.unshift(...lignes);   // nouvel essai au prochain envoi
    }).finally(() => { envoi = null; });
    await envoi;
  }

  function ajouter(entree) {
    file.push(normaliser(entree));
    if (file.length >= lot) vider();
  }

  // Une fois par (clé) et par période : consultations, accès refusés
  function unePar(cle, entree) {
    const t = vus.get(cle);
    if (t !== undefined && horloge() - t < dedoublonnageMs) return false;
    if (vus.size > 50_000) for (const [k, v] of vus) if (horloge() - v >= dedoublonnageMs) vus.delete(k);
    vus.set(cle, horloge());
    ajouter(entree);
    return true;
  }

  const minuterie = setInterval(() => { vider(); }, intervalleMs);
  minuterie.unref();

  return {
    ajouter,
    unePar,
    vider,
    enAttente: () => file.length,
    async arreter() { clearInterval(minuterie); await vider(); },
  };
}

module.exports = { creerJournal, normaliser };
