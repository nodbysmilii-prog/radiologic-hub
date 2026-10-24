/* =========================================================
   RadiologicHub — Comptes rendus : volet « Écrire en vrac »
   ---------------------------------------------------------
   Constatations en vrac → compte rendu rédigé à partir d'un compte
   rendu type (regles/vrac.js) ; le texte généré arrive dans l'éditeur
   en une étape d'historique (« ↶ Retour » l'annule).
   Dépend de : regles/vrac.js, window.RHEditor (cr.js).
   ========================================================= */
(function () {
  'use strict';
  const V = window.RHRegles && window.RHRegles.vrac, ED = window.RHEditor;
  const $ = s => document.getElementById(s);
  const choix = $('vrac-modele'), zone = $('vrac-texte'), bilan = $('vrac-bilan');
  if (!V || !ED || !choix || !zone) return;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // Comptes rendus types, groupés par modalité ; par défaut le modèle chargé dans l'éditeur, sinon le TAP
  const remplir = () => {
    const modeles = ED.modeles(), garde = choix.value;
    const mods = [...new Set(modeles.map(m => m.mod || 'Autres'))];
    choix.innerHTML = mods.map(mod => `<optgroup label="${esc(mod)}">${
      modeles.filter(m => (m.mod || 'Autres') === mod).map(m => `<option value="${esc(m.id)}">${esc(m.titre)}</option>`).join('')}</optgroup>`).join('');
    const cour = ED.modeleCourant && ED.modeleCourant();
    choix.value = (cour && modeles.some(m => m.id === cour) && cour) || garde || 'tdm-tap';
    if (!choix.value && modeles[0]) choix.value = modeles[0].id;
  };
  remplir();
  // le modèle chargé à gauche devient le modèle proposé
  document.addEventListener('click', e => { if (e.target.closest('.cr-tpl-btn')) setTimeout(remplir, 0); });
  $('cr-vrac-panneau') && new MutationObserver(() => { if (!$('cr-vrac-panneau').hidden) remplir(); }).observe($('cr-vrac-panneau'), { attributes: true, attributeFilter: ['hidden'] });

  const afficher = b => {
    bilan.hidden = !b.length;
    bilan.innerHTML = b.map(x => `<li class="${x.remplace ? '' : 'is-ailleurs'}"><span class="cr-vrac-organe">${esc(x.nom || 'non reconnu')}</span> <b>${esc(x.texte)}</b>
      <small>${x.remplace ? `${x.rubrique ? `${esc(x.rubrique)} › ` : ''}à la place de « ${esc(x.remplace)} »` : 'pas de phrase de cet organe dans le modèle → « Par ailleurs : »'}</small></li>`).join('');
  };

  $('vrac-generer').addEventListener('click', () => {
    const m = ED.modeles().find(x => x.id === choix.value);
    if (!m) return;
    if (!zone.value.trim()) { zone.focus(); return; }
    const r = V.generer(m.texte, zone.value);
    const actuel = ED.el.value.trim();
    if (actuel && actuel !== m.texte.trim() && !confirm('Remplacer le texte de l\'éditeur par le compte rendu généré ? (« ↶ Retour » permet de revenir en arrière)')) return;
    ED.integrer(r.texte, `Compte rendu généré : ${r.bilan.length} constatation${r.bilan.length > 1 ? 's' : ''} mise${r.bilan.length > 1 ? 's' : ''} en place${r.bilan.some(x => !x.remplace) ? ', certaines sous « Par ailleurs »' : ''}.`);
    afficher(r.bilan);
  });
  $('vrac-effacer').addEventListener('click', () => { zone.value = ''; afficher([]); zone.focus(); });
  // Ctrl + Entrée : générer
  zone.addEventListener('keydown', e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); $('vrac-generer').click(); } });
})();
