/* =========================================================
   RadiologicHub — Communauté : composants d'interface
   ---------------------------------------------------------
   Icônes, avatars, nom « Dr … » avec badge vérifié, messages flottants,
   fenêtres (confirmation, choix), visionneuse d'images plein écran,
   éditeur de masquage (rectangles noirs sur les zones identifiantes).
   ========================================================= */
(function () {
  'use strict';
  const RG = window.RHReseau.regles;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* Icônes (trait 2 px, 24 × 24) */
  const P = {
    fil: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v9.5h13V10"/><path d="M10 19.5v-5h4v5"/>',
    chercher: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>',
    publier: '<rect x="3.5" y="3.5" width="17" height="17" rx="4"/><path d="M12 8v8M8 12h8"/>',
    messages: '<path d="M4 5.5h16v10H9l-5 4z"/><path d="M8 9.5h8M8 12.5h5"/>',
    cloche: '<path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
    remplacements: '<rect x="3.5" y="7" width="17" height="12.5" rx="2.5"/><path d="M9 7V5.5h6V7M3.5 12.5h17"/>',
    profil: '<circle cx="12" cy="8.5" r="4"/><path d="M4.5 20c1-4 4-6 7.5-6s6.5 2 7.5 6"/>',
    admin: '<path d="M12 3.5 19.5 6v5.5c0 4.5-3.2 7.8-7.5 9-4.3-1.2-7.5-4.5-7.5-9V6z"/><path d="m9 12 2 2 4-4"/>',
    sortie: '<path d="M14 4.5h5.5v15H14"/><path d="M10 8l-4 4 4 4M6 12h10"/>',
    coeur: '<path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z"/>',
    commentaire: '<path d="M4.5 5.5h15v10.5h-9l-4.5 3.5v-3.5h-1.5z"/>',
    signet: '<path d="M7 4.5h10v15.5l-5-3.5-5 3.5z"/>',
    plus: '<circle cx="12" cy="5.5" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="12" cy="18.5" r="1.3"/>',
    envoyer: '<path d="M4 12 20 4.5 15.5 20l-3.5-6.5z"/><path d="m12 13.5 8-9"/>',
    image: '<rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><circle cx="9" cy="9.5" r="1.7"/><path d="m5 18 5-5 3 3 2.5-2.5L20 18"/>',
    retour: '<path d="m14.5 5-7 7 7 7"/>',
    partager: '<circle cx="18" cy="5.5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="18.5" r="2.5"/><path d="m8.2 10.8 7.6-4.1M8.2 13.2l7.6 4.1"/>',
    drapeau: '<path d="M5.5 21V4.5M5.5 5h11l-2 4 2 4h-11"/>',
    bloquer: '<circle cx="12" cy="12" r="8"/><path d="m6.5 6.5 11 11"/>',
    modifier: '<path d="M4.5 19.5h4l10-10-4-4-10 10z"/><path d="m13 7 4 4"/>',
    supprimer: '<path d="M5 7h14M9.5 7V4.5h5V7M7 7l1 12.5h8L17 7"/>',
    fermer: '<path d="m6 6 12 12M18 6 6 18"/>',
    masque: '<rect x="4" y="6" width="16" height="12" rx="1.5"/><path d="M8 10.5h8v3H8z" fill="currentColor"/>',
    google: '',
  };
  const icone = (n, cls = '') => `<svg class="rs-ico ${cls}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${P[n] || ''}</svg>`;
  const GOOGLE = '<svg class="rs-google" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.9 6.1C12.5 13.6 17.8 9.5 24 9.5z"/><path fill="#4285F4" d="M46.1 24.6c0-1.6-.1-3.1-.4-4.6H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.4 5.7c4.3-4 6.9-9.9 6.9-17z"/><path fill="#FBBC05" d="M10.6 28.6A14.6 14.6 0 0 1 9.5 24c0-1.6.3-3.2.8-4.6l-7.9-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.7 10.7z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.7c-2.1 1.4-4.8 2.3-8.5 2.3-6.2 0-11.5-4.1-13.4-9.9l-7.9 6.1C6.6 42.6 14.6 48 24 48z"/></svg>';

  /* Avatar : photo, sinon initiales sur une couleur tirée de l'identifiant */
  const COULEURS = ['var(--cornflower)', 'var(--plum)', 'var(--teal)', 'var(--steel)', 'var(--amber)', 'var(--crimson)', 'var(--green)', 'var(--purple)'];
  const couleur = id => COULEURS[[...String(id || '')].reduce((t, c) => (t * 31 + c.charCodeAt(0)) >>> 0, 7) % COULEURS.length];
  function avatar(m, taille = 44, urlPhoto = null) {
    const url = urlPhoto || (m && window.RHRs.api && window.RHRs.api.urlPhoto ? window.RHRs.api.urlPhoto(m) : null);
    const style = `--t:${taille}px;--c:${couleur(m && m.id)}`;
    return url ? `<span class="rs-avatar" style="${style}"><img src="${esc(url)}" alt="" loading="lazy" referrerpolicy="no-referrer"></span>`
      : `<span class="rs-avatar is-initiales" style="${style}" aria-hidden="true">${esc(RG.initiales(m))}</span>`;
  }
  const verifie = m => (m && m.verifie ? `<span class="rs-verifie" title="Compte vérifié par RadiologicHub" aria-label="vérifié">${'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 12.5 3.2 3.2L17 9"/></svg>'}</span>` : '');
  const nom = m => `<span class="rs-nom">${esc(RG.nomAffiche(m))}</span>${verifie(m)}`;

  /* Messages flottants */
  function toast(message, type = 'ok') {
    let zone = document.getElementById('rs-toasts');
    if (!zone) { zone = document.createElement('div'); zone.id = 'rs-toasts'; zone.setAttribute('aria-live', 'polite'); document.body.appendChild(zone); }
    const t = document.createElement('div');
    t.className = `rs-toast is-${type}`;
    t.textContent = message;
    zone.appendChild(t);
    setTimeout(() => t.classList.add('is-sortie'), 3800);
    setTimeout(() => t.remove(), 4300);
  }

  /* Fenêtre générique : renvoie une promesse résolue par la valeur du bouton cliqué */
  function fenetre({ titre = '', contenu = '', boutons = [{ valeur: true, libelle: 'OK', classe: 'btn-ink' }], large = false, onOuvert } = {}) {
    return new Promise(resolve => {
      const d = document.createElement('dialog');
      d.className = `rs-fenetre${large ? ' is-large' : ''}`;
      d.innerHTML = `<form method="dialog" class="rs-fenetre-in">
        <div class="rs-fenetre-tete"><h2>${esc(titre)}</h2><button type="button" class="rs-icone-btn" data-fermer aria-label="Fermer">${icone('fermer')}</button></div>
        <div class="rs-fenetre-corps">${contenu}</div>
        ${boutons.length ? `<div class="rs-fenetre-pied">${boutons.map((b, i) => `<button type="${b.submit ? 'submit' : 'button'}" class="btn btn-sm ${b.classe || 'btn-outline'}" data-i="${i}">${esc(b.libelle)}</button>`).join('')}</div>` : ''}
      </form>`;
      document.body.appendChild(d);
      let valeur = null;
      const fermer = v => { valeur = v; d.close(); };
      d.addEventListener('click', e => {
        if (e.target === d || e.target.closest('[data-fermer]')) return fermer(null);
        const b = e.target.closest('[data-i]');
        if (b) { e.preventDefault(); const def = boutons[Number(b.dataset.i)]; fermer(typeof def.valeur === 'function' ? def.valeur(d) : def.valeur); }
      });
      d.addEventListener('close', () => { d.remove(); resolve(valeur); });
      d.showModal();
      if (onOuvert) onOuvert(d, fermer);
    });
  }
  const confirmer = (texte, { titre = 'Confirmer', oui = 'Confirmer', danger = false } = {}) =>
    fenetre({ titre, contenu: `<p>${texte}</p>`, boutons: [{ valeur: false, libelle: 'Annuler' }, { valeur: true, libelle: oui, classe: danger ? 'btn-ink rs-danger' : 'btn-ink' }] });

  /* Visionneuse plein écran (images d'un cas ou d'un message) */
  function visionneuse(urls, legendes = [], depart = 0) {
    let i = depart;
    const d = document.createElement('dialog');
    d.className = 'rs-visionneuse';
    const rendre = () => {
      d.innerHTML = `<div class="rs-vis-tete"><span>${urls.length > 1 ? `${i + 1} / ${urls.length}` : ''}</span><button type="button" class="rs-icone-btn" data-fermer aria-label="Fermer">${icone('fermer')}</button></div>
        <div class="rs-vis-image"><img src="${esc(urls[i])}" alt="${esc(legendes[i] || '')}"></div>
        ${legendes[i] ? `<p class="rs-vis-legende">${esc(legendes[i])}</p>` : ''}
        ${urls.length > 1 ? `<button type="button" class="rs-vis-nav is-prec" data-pas="-1" aria-label="Image précédente">‹</button><button type="button" class="rs-vis-nav is-suiv" data-pas="1" aria-label="Image suivante">›</button>` : ''}`;
    };
    rendre();
    document.body.appendChild(d);
    d.addEventListener('click', e => {
      if (e.target.closest('[data-fermer]') || e.target === d) return d.close();
      const p = e.target.closest('[data-pas]');
      if (p) { i = (i + Number(p.dataset.pas) + urls.length) % urls.length; rendre(); }
    });
    d.addEventListener('keydown', e => { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { i = (i + (e.key === 'ArrowRight' ? 1 : -1) + urls.length) % urls.length; rendre(); } });
    let x0 = null;
    d.addEventListener('pointerdown', e => { x0 = e.clientX; });
    d.addEventListener('pointerup', e => { if (x0 != null && Math.abs(e.clientX - x0) > 60 && urls.length > 1) { i = (i + (e.clientX < x0 ? 1 : -1) + urls.length) % urls.length; rendre(); } x0 = null; });
    d.addEventListener('close', () => d.remove());
    d.showModal();
  }

  /* Éditeur de masquage : l'utilisateur trace des rectangles noirs sur l'image.
     Renvoie la liste des masques (fractions de l'image) ou null si annulé. */
  async function editeurMasques(fichier, masquesDepart = []) {
    const src = await window.RHRs.images.decoder(fichier);
    const masques = masquesDepart.map(m => ({ ...m }));
    return fenetre({
      titre: 'Masquer les zones identifiantes',
      large: true,
      contenu: `<p class="rs-aide">Faites glisser le doigt ou la souris pour couvrir d'un rectangle noir les noms, dates, numéros, textes incrustés ou visages. Le masquage est définitif sur l'image envoyée.</p>
        <div class="rs-masque-zone"><canvas class="rs-masque-canvas"></canvas></div>
        <p class="rs-masque-outils"><button type="button" class="btn btn-outline btn-sm" data-masque="annuler">Annuler le dernier</button> <button type="button" class="btn btn-outline btn-sm" data-masque="vider">Tout effacer</button></p>`,
      boutons: [{ valeur: null, libelle: 'Annuler' }, { valeur: () => masques, libelle: 'Valider le masquage', classe: 'btn-ink' }],
      onOuvert(d) {
        const cv = d.querySelector('canvas'), g = cv.getContext('2d');
        const zone = d.querySelector('.rs-masque-zone');
        const L = Math.min(zone.clientWidth || 600, 900), k = L / src.width;
        cv.width = Math.round(src.width * Math.min(k, 1600 / src.width)); cv.height = Math.round(src.height * cv.width / src.width);
        let tracé = null;
        const dessiner = () => {
          g.drawImage(src, 0, 0, cv.width, cv.height);
          g.fillStyle = '#000';
          [...masques, ...(tracé ? [tracé] : [])].forEach(m => g.fillRect(m.x * cv.width, m.y * cv.height, m.l * cv.width, m.h * cv.height));
          if (tracé) { g.strokeStyle = '#f2ab2f'; g.lineWidth = 3; g.strokeRect(tracé.x * cv.width, tracé.y * cv.height, tracé.l * cv.width, tracé.h * cv.height); }
        };
        const pos = e => { const r = cv.getBoundingClientRect(); return { x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)) }; };
        let p0 = null;
        // le geste est écouté sur tout le cadre : un tracé peut commencer au ras d'un coin de l'image
        zone.addEventListener('pointerdown', e => { e.preventDefault(); zone.setPointerCapture(e.pointerId); p0 = pos(e); tracé = { x: p0.x, y: p0.y, l: 0, h: 0 }; });
        zone.addEventListener('pointermove', e => { if (!p0) return; const p = pos(e); tracé = { x: Math.min(p0.x, p.x), y: Math.min(p0.y, p.y), l: Math.abs(p.x - p0.x), h: Math.abs(p.y - p0.y) }; dessiner(); });
        const finir = () => { if (tracé && tracé.l > 0.01 && tracé.h > 0.01) masques.push(tracé); tracé = null; p0 = null; dessiner(); };
        zone.addEventListener('pointerup', finir);
        zone.addEventListener('pointercancel', finir);
        d.addEventListener('click', e => {
          const b = e.target.closest('[data-masque]');
          if (!b) return;
          if (b.dataset.masque === 'annuler') masques.pop(); else masques.length = 0;
          dessiner();
        });
        dessiner();
      },
    }).finally(() => { if (src.close) src.close(); if (src._url) URL.revokeObjectURL(src._url); });
  }

  window.RHRs = window.RHRs || {};
  window.RHRs.ui = { esc, icone, GOOGLE, avatar, verifie, nom, couleur, toast, fenetre, confirmer, visionneuse, editeurMasques };
})();
