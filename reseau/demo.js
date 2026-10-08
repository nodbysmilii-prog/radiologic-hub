/* =========================================================
   RadiologicHub — Communauté : barre de démonstration
   Visible seulement en mode démonstration (Supabase non configuré) :
   se connecter comme un membre fictif (vérifié, non vérifié,
   administrateur…) ou revenir aux données de départ.
   ========================================================= */
(async function () {
  'use strict';
  const api = window.RHRs && window.RHRs.api;
  const barre = document.getElementById('rs-demo');
  if (!api || !api.demo || !barre) return;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const qui = document.getElementById('rs-demo-qui');
  const rafraichir = () => (window.RHRs.rafraichir ? window.RHRs.rafraichir() : null);
  try { await api.pret; } catch (e) { return; }
  barre.hidden = false;
  function maj() {
    const moi = api.demo.moi();
    qui.innerHTML = `<option value="">— Visiteur (non connecté) —</option>${api.demo.utilisateurs().map(u => `<option value="${esc(u.id)}"${u.id === moi ? ' selected' : ''}>${esc(u.libelle)}</option>`).join('')}`;
  }
  qui.addEventListener('change', async () => {
    await api.demo.connecterComme(qui.value);
    location.hash = '#/';
    await rafraichir();
  });
  barre.addEventListener('click', async e => {
    if (!e.target.closest('[data-demo="reinitialiser"]')) return;
    if (!confirm('Revenir aux membres et cas fictifs de départ ? Vos actions de démonstration seront effacées.')) return;
    await api.demo.reinitialiser();
    location.hash = '#/';
    await rafraichir();
  });
  window.addEventListener('rs:demo', maj);
  maj();
})();
