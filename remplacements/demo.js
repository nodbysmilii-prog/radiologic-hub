/* =========================================================
   RadiologicHub — Remplacements : barre de démonstration
   ---------------------------------------------------------
   Visible seulement en mode démonstration (Supabase non configuré) :
   se connecter comme un utilisateur fictif, avancer l'horloge (l'agent
   tourne : relances, rappels, récapitulatifs), lire la boîte d'envoi.
   Les boutons des e-mails fonctionnent (page remplacements-reponse.html).
   ========================================================= */
(async function () {
  'use strict';
  const api = window.RHRp && window.RHRp.api;
  const barre = document.getElementById('rp-demo');
  if (!api || !api.demo || !barre) return;
  const REF = window.RHRemplacements.referentiel;
  const D = api.demo;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const qui = document.getElementById('rp-demo-qui');
  const horloge = document.getElementById('rp-demo-horloge');
  const compte = document.getElementById('rp-demo-compte');
  const boite = document.getElementById('rp-boite');
  const liste = document.getElementById('rp-boite-liste');
  const apercu = document.getElementById('rp-boite-vue');
  let lus = 0, ouvert = null;
  const rafraichir = () => (window.RHRp.rafraichir ? window.RHRp.rafraichir() : null);

  try { await api.pret; } catch (e) { return; }
  barre.hidden = false;

  async function maj() {
    const s = await api.session();
    const moi = s ? s.profil.id : '';
    qui.innerHTML = `<option value="">— Visiteur (non connecté) —</option>${D.utilisateurs().map(u => `<option value="${esc(u.id)}"${u.id === moi ? ' selected' : ''}>${esc(u.libelle)}</option>`).join('')}`;
    const t = D.maintenant(), ecart = Math.round((t - Date.now()) / 3600000);
    horloge.textContent = `${REF.horodatageFr(t)}${ecart > 0 ? ` (+${ecart} h)` : ''}`;
    const n = D.boite().length;
    compte.hidden = n <= lus;
    compte.textContent = String(n - lus);
    if (boite.open) remplirBoite();
  }

  /* ---------- Boîte d'envoi ---------- */
  function remplirBoite() {
    const mails = D.boite();
    liste.innerHTML = mails.length ? mails.map(m => `<li><button type="button" data-mail="${esc(m.id)}"${m.id === ouvert ? ' class="is-actif"' : ''}>
      <strong>${esc(m.objet)}</strong><span>À : ${esc(m.a.nom ? `${m.a.nom} <${m.a.email}>` : m.a.email)}</span><span>${esc(REF.horodatageFr(m.quand))}</span></button></li>`).join('')
      : '<li class="rp-vide">Aucun e-mail envoyé pour l\'instant.</li>';
    if (!mails.find(m => m.id === ouvert)) ouvert = mails[0] ? mails[0].id : null;
    afficherMail();
  }
  function afficherMail() {
    const m = D.boite().find(x => x.id === ouvert);
    liste.querySelectorAll('[data-mail]').forEach(b => b.classList.toggle('is-actif', b.dataset.mail === ouvert));
    if (!m) { apercu.innerHTML = ''; return; }
    const pj = (m.pieces || []).map((p, i) => `<a href="#" data-pj="${i}">📎 ${esc(p.nom)}</a>`).join('');
    apercu.innerHTML = `<div class="rp-boite-meta"><p><strong>${esc(m.objet)}</strong></p><p>De : RadiologicHub Remplacements · À : ${esc(m.a.email)} · ${esc(REF.horodatageFr(m.quand))}</p>${pj ? `<div class="rp-boite-pj">${pj}</div>` : ''}<p class="rp-muted rp-boite-astuce">Les boutons de l'e-mail fonctionnent : ils ouvrent la page de réponse, comme dans une vraie messagerie.</p></div>`;
    const cadre = document.createElement('iframe');
    cadre.title = `Aperçu : ${m.objet}`;
    cadre.setAttribute('sandbox', 'allow-top-navigation-by-user-activation allow-popups allow-popups-to-escape-sandbox');
    cadre.srcdoc = m.html.replace(/<head([^>]*)>/i, '<head$1><base target="_top">');
    apercu.appendChild(cadre);
  }
  function telechargerPiece(i) {
    const p = (D.boite().find(x => x.id === ouvert) || {}).pieces[i];
    if (!p) return;
    const bin = atob(p.contenu), octets = new Uint8Array(bin.length);
    for (let k = 0; k < bin.length; k++) octets[k] = bin.charCodeAt(k);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([octets], { type: p.type }));
    a.download = p.nom;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  /* ---------- Actions ---------- */
  const ACTIONS = {
    async avancer(b) {
      const r = await D.avancer(Number(b.dataset.h));
      const parts = [['selection', 'proposition(s)'], ['relances', 'relance(s)'], ['expirees', 'demande(s) expirée(s)'], ['rappels', 'rappel(s)'], ['realisations', 'demande(s) de réalisation'], ['recaps', 'récapitulatif(s)']]
        .filter(([k]) => r && r[k]).map(([k, l]) => `${r[k]} ${l}`);
      annoncer(`Horloge avancée de ${b.dataset.h} h. Agent : ${parts.length ? parts.join(', ') : 'rien à faire'}.`);
      await rafraichir();
    },
    boite() { lus = D.boite().length; compte.hidden = true; remplirBoite(); boite.showModal(); },
    fermer() { boite.close(); },
    async reinitialiser() {
      if (!confirm('Revenir aux données fictives de départ ? Les actions de la démonstration seront effacées.')) return;
      await D.reinitialiser();
      lus = 0;
      await rafraichir();
      location.hash = '#/';
    },
  };
  function annoncer(texte) {
    let zone = document.getElementById('rp-toasts');
    if (!zone) { zone = document.createElement('div'); zone.id = 'rp-toasts'; zone.setAttribute('aria-live', 'polite'); document.body.appendChild(zone); }
    const t = document.createElement('div');
    t.className = 'rp-toast is-ok';
    t.textContent = texte;
    zone.appendChild(t);
    setTimeout(() => t.classList.add('is-sortie'), 4800);
    setTimeout(() => t.remove(), 5300);
  }

  document.addEventListener('click', e => {
    const b = e.target.closest('[data-demo]');
    if (b && ACTIONS[b.dataset.demo]) { e.preventDefault(); ACTIONS[b.dataset.demo](b); return; }
    const m = e.target.closest('[data-mail]');
    if (m) { ouvert = m.dataset.mail; afficherMail(); return; }
    const pj = e.target.closest('[data-pj]');
    if (pj) { e.preventDefault(); telechargerPiece(Number(pj.dataset.pj)); }
  });
  boite.addEventListener('click', e => { if (e.target === boite) boite.close(); });
  qui.addEventListener('change', async () => {
    await D.connecterComme(qui.value);
    const s = await api.session();
    await rafraichir();
    location.hash = !s ? '#/' : s.admin ? '#/admin' : '#/espace';
  });
  window.addEventListener('rp:demo', maj);
  setInterval(() => { horloge.textContent = horloge.textContent.replace(/^[^(]*/, `${REF.horodatageFr(D.maintenant())} `).trim(); }, 30000);
  maj();
})();
