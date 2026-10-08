/* =========================================================
   RadiologicHub — Remplacements : calendrier mensuel
   ---------------------------------------------------------
   grille({ mois: 'AAAA-MM', min: 'AAAA-MM-JJ', jours: { date: { classes, contenu, titre } } })
   → HTML d'une grille lundi → dimanche ; chaque jour est un bouton
   data-date (désactivé avant « min »). Utilisé pour les disponibilités
   et le choix des dates d'une demande.
   ========================================================= */
(function () {
  'use strict';
  const REF = window.RHRemplacements.referentiel;
  const pad = n => String(n).padStart(2, '0');
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const decaler = (mois, n) => { const [a, m] = mois.split('-').map(Number); const d = new Date(Date.UTC(a, m - 1 + n, 1)); return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`; };
  const titre = mois => { const t = REF.moisFr(mois); return t.charAt(0).toUpperCase() + t.slice(1); };

  function grille({ mois, min = '', jours = {}, nav = true }) {
    const [a, m] = mois.split('-').map(Number);
    const nb = new Date(Date.UTC(a, m, 0)).getUTCDate();
    const premier = (REF.jourSemaine(`${mois}-01`) + 6) % 7;          // lundi = 0
    let h = `<div class="rp-cal" data-mois="${mois}">`;
    h += `<div class="rp-cal-tete">${nav ? `<button type="button" class="rp-cal-nav" data-cal="${decaler(mois, -1)}" aria-label="Mois précédent">‹</button>` : ''}<strong>${esc(titre(mois))}</strong>${nav ? `<button type="button" class="rp-cal-nav" data-cal="${decaler(mois, 1)}" aria-label="Mois suivant">›</button>` : ''}</div>`;
    h += '<div class="rp-cal-grille" role="grid">';
    ['L', 'M', 'M', 'J', 'V', 'S', 'D'].forEach((j, i) => { h += `<span class="rp-cal-js${i > 4 ? ' is-we' : ''}" aria-hidden="true">${j}</span>`; });
    for (let i = 0; i < premier; i++) h += '<span class="rp-cal-vide"></span>';
    for (let j = 1; j <= nb; j++) {
      const date = `${mois}-${pad(j)}`, info = jours[date] || {};
      const passe = min && date < min;
      const we = [0, 6].includes(REF.jourSemaine(date));
      h += `<button type="button" class="rp-cal-jour${we ? ' is-we' : ''}${passe ? ' is-passe' : ''} ${(info.classes || []).join(' ')}" data-date="${date}"${passe ? ' disabled' : ''} aria-label="${esc(REF.jourFr(date))}${info.titre ? ' — ' + esc(info.titre) : ''}"><span class="rp-cal-num">${j}</span>${info.contenu || ''}</button>`;
    }
    return h + '</div></div>';
  }

  window.RHRp = window.RHRp || {};
  window.RHRp.calendrier = { grille, decaler, titre };
})();
