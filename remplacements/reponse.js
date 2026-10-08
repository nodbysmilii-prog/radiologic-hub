/* =========================================================
   RadiologicHub — Remplacements : boutons des e-mails (remplacements-reponse.html)
   ---------------------------------------------------------
   ?j=<jeton>  → affiche ce que propose le lien, puis un bouton de
                 confirmation (les antivirus qui ouvrent les liens des
                 e-mails ne déclenchent donc rien) ; usage unique.
   ?d=<code>   → désinscription des e-mails d'information.
   Aucune connexion nécessaire.
   ========================================================= */
(async function () {
  'use strict';
  const api = window.RHRp && window.RHRp.api;
  const zone = document.getElementById('rp-reponse');
  if (!api || !zone) return;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const params = new URLSearchParams(location.search);
  const jeton = params.get('j'), code = params.get('d');
  const retour = '<p class="rp-actions" style="justify-content:center"><a class="btn btn-outline btn-sm" href="remplacements.html#/espace">Mon espace Remplacements</a></p>';
  const carte = (icone, classe, titre, corps) => `<div class="rp-carte rp-reponse rp-centre"><div class="rp-reponse-icone${classe ? ' ' + classe : ''}" aria-hidden="true">${icone}</div><h1>${titre}</h1>${corps}</div>`;
  const recap = d => (d ? `<dl class="rp-recap" style="text-align:left">
      <div><dt>Structure</dt><dd><strong>${esc(d.structure)}</strong><br><span class="rp-muted">${esc(d.ville || '')}${d.gouvernorat ? ` (${esc(d.gouvernorat)})` : ''}</span></dd></div>
      <div><dt>Date(s)</dt><dd><strong>${(d.dates || []).map(esc).join('<br>')}</strong></dd></div>
      <div><dt>Horaires</dt><dd>${esc(d.horaires)} — ${esc(d.type)}</dd></div>
      <div><dt>Modalités</dt><dd>${esc(d.modalites)}</dd></div>
      <div><dt>Honoraires</dt><dd><strong>${esc(d.honoraires)} ${esc(d.unite)}</strong> <span class="rp-muted">— soit ${esc(d.total)}</span></dd></div>
      <div><dt>Référence</dt><dd class="rp-muted">${esc(d.reference)}</dd></div>
    </dl>` : '');

  const RAISONS = {
    inconnu: 'Ce lien n\'est pas reconnu. Il a peut-être été copié incomplètement.',
    utilise: 'Ce lien a déjà été utilisé : votre réponse est bien enregistrée.',
    expire: 'Ce lien a expiré : la date du remplacement est passée.',
    deja_repondu: 'Vous avez déjà répondu à cette proposition.',
    pourvu: 'Ce remplacement vient d\'être pourvu. Merci de votre réactivité : vous recevrez les prochaines propositions.',
    close: 'Cette demande n\'est plus ouverte (retirée ou expirée).',
    non_disponible: 'Ce remplaçant n\'est plus disponible pour cette demande.',
    deja_annule: 'Ce remplacement a déjà été annulé.',
    commencee: 'Le remplacement a déjà commencé : il ne peut plus être annulé en ligne. Contactez directement l\'autre partie.',
    introuvable: 'Cette demande est introuvable.',
  };
  const ACTIONS = {
    disponible: { titre: 'Confirmer votre disponibilité', bouton: 'Oui, je suis disponible', classe: 'rp-oui', texte: 'La structure sera prévenue immédiatement et choisira son remplaçant parmi les radiologues disponibles.' },
    indisponible: { titre: 'Décliner cette proposition', bouton: 'Je ne suis pas disponible', classe: 'btn-outline', texte: 'Vous continuerez à recevoir les autres propositions.' },
    choisir: { titre: 'Retenir ce remplaçant', bouton: 'Choisir ce remplaçant', classe: 'btn-ink', texte: 'Le remplaçant reçoit aussitôt la confirmation avec vos coordonnées ; les autres intéressés sont prévenus que le poste est pourvu.' },
    annuler: { titre: 'Annuler le remplacement', bouton: 'Confirmer l\'annulation', classe: 'btn-outline rp-danger', texte: 'L\'autre partie est prévenue immédiatement par e-mail.' },
    realise_oui: { titre: 'Le remplacement a eu lieu', bouton: 'Oui, il a eu lieu', classe: 'rp-oui', texte: 'Cette confirmation sert au suivi et au récapitulatif mensuel.' },
    realise_non: { titre: 'Le remplacement n\'a pas eu lieu', bouton: 'Confirmer : il n\'a pas eu lieu', classe: 'btn-outline', texte: 'L\'administrateur sera informé afin de comprendre ce qui s\'est passé.' },
  };
  function succes(r) {
    switch (r.action) {
      case 'disponible': return r.etat === 'retenu'
        ? ['Vous êtes retenu !', 'La structure a choisi l\'attribution automatique : la confirmation (coordonnées, agenda, contrat) vous est envoyée par e-mail.']
        : ['Merci, c\'est noté', 'La structure est prévenue. Si elle vous retient, vous recevrez un e-mail de confirmation avec ses coordonnées.'];
      case 'indisponible': return ['Réponse enregistrée', 'Merci d\'avoir répondu. Vous recevrez les prochaines propositions.'];
      case 'choisir': return ['Remplaçant retenu', 'La confirmation est envoyée aux deux parties, avec le récapitulatif, le fichier agenda (.ics) et le contrat pré-rempli.'];
      case 'annuler': return ['Remplacement annulé', r.remise ? 'L\'autre partie est prévenue. La demande est remise en ligne : l\'agent recontacte les remplaçants compatibles.' : 'L\'autre partie est prévenue par e-mail.'];
      default: return ['Merci, réponse enregistrée', ''];
    }
  }

  zone.innerHTML = '<p class="rp-chargement">Chargement…</p>';
  try { await api.pret; } catch (e) { zone.innerHTML = carte('!', 'is-ko', 'Service indisponible', `<p>${esc(e.message)}</p>`); return; }
  const demo = api.demo ? '<p class="rp-note">Démonstration : données fictives, aucun e-mail réel.</p>' : '';

  /* ---------- Désinscription ---------- */
  if (code) {
    zone.innerHTML = carte('✉', 'is-info', 'Ne plus recevoir nos propositions ?', `${demo}<p>Vous ne recevrez plus les propositions de remplacement, les relances ni le récapitulatif mensuel. Les e-mails liés à une mission déjà confirmée (confirmation, annulation, rappel) restent envoyés.</p>
      <p class="rp-actions" style="justify-content:center"><button type="button" class="btn btn-ink" id="rp-ok">Confirmer la désinscription</button></p>
      <p class="rp-muted">Vous pourrez réactiver les e-mails à tout moment depuis votre profil.</p>`);
    document.getElementById('rp-ok').addEventListener('click', async ev => {
      ev.target.disabled = true;
      try {
        const r = await api.lien.desinscrire(code);
        zone.innerHTML = r.ok ? carte('✓', '', 'Désinscription enregistrée', '<p>Vous ne recevrez plus d\'e-mails d\'information de RadiologicHub Remplacements.</p>' + retour)
          : carte('!', 'is-ko', 'Lien invalide', `<p>${RAISONS.inconnu}</p>${retour}`);
      } catch (e) { ev.target.disabled = false; zone.insertAdjacentHTML('beforeend', `<p class="rp-erreurs">${esc(e.message)}</p>`); }
    });
    return;
  }

  /* ---------- Bouton d'un e-mail ---------- */
  if (!jeton) { zone.innerHTML = carte('?', 'is-info', 'Lien incomplet', `<p>Ouvrez le lien directement depuis l'e-mail reçu.</p>${retour}`); return; }
  let info;
  try { info = await api.lien.infos(jeton); } catch (e) { zone.innerHTML = carte('!', 'is-ko', 'Erreur', `<p>${esc(e.message)}</p>`); return; }
  if (!info.valide) {
    zone.innerHTML = carte(info.raison === 'utilise' ? '✓' : 'i', info.raison === 'utilise' ? '' : 'is-info', info.raison === 'utilise' ? 'Déjà enregistré' : 'Lien inactif', `${demo}<p>${RAISONS[info.raison] || RAISONS.inconnu}</p>${recap(info.demande)}${retour}`);
    return;
  }
  const A = ACTIONS[info.action] || { titre: 'Confirmer', bouton: 'Confirmer', classe: 'btn-ink', texte: '' };
  const remplacant = info.remplacant ? `<div class="rp-item" style="text-align:left"><div class="rp-item-lien"><span class="rp-ligne-titre">${esc(info.remplacant.nom_complet)} <span class="rp-statut">${esc(info.remplacant.statut_court)}</span></span><span class="rp-ligne-sous">${esc(info.remplacant.affectation || '')}</span><span class="rp-ligne-sous">${esc(info.remplacant.competences || '')}</span></div></div>` : '';
  const annulStructure = info.action === 'annuler' && info.partie === 'structure';
  const options = info.action === 'annuler' ? `<div class="field" style="text-align:left"><label for="rp-motif">Motif (facultatif, transmis à l'autre partie)</label><input id="rp-motif" maxlength="300"></div>
    ${annulStructure ? '<label class="rp-consentement" style="text-align:left"><input type="checkbox" id="rp-definitif"> Annuler définitivement (sinon la demande est remise en ligne pour trouver un autre remplaçant)</label>' : ''}` : '';
  zone.innerHTML = carte(info.action === 'annuler' ? '!' : info.action === 'indisponible' || info.action === 'realise_non' ? '–' : '✓', info.action === 'annuler' ? 'is-ko' : 'is-info', esc(A.titre),
    `${demo}${remplacant}${recap(info.demande)}<p>${A.texte}</p>${options}<p class="rp-actions" style="justify-content:center"><button type="button" class="btn ${A.classe}" id="rp-ok">${esc(A.bouton)}</button></p><p class="rp-muted">Ce lien ne peut servir qu'une fois.</p>`);
  document.getElementById('rp-ok').addEventListener('click', async ev => {
    ev.target.disabled = true;
    try {
      const o = info.action === 'annuler' ? { motif: (document.getElementById('rp-motif') || {}).value || '', definitif: !!(document.getElementById('rp-definitif') || {}).checked } : {};
      const r = await api.lien.utiliser(jeton, o);
      if (!r.ok) { zone.innerHTML = carte('i', 'is-info', 'Action impossible', `<p>${RAISONS[r.raison] || RAISONS.inconnu}</p>${retour}`); return; }
      const [titre, texte] = succes(r);
      zone.innerHTML = carte('✓', '', esc(titre), `<p>${texte}</p>${retour}`);
    } catch (e) {
      ev.target.disabled = false;
      zone.insertAdjacentHTML('beforeend', `<p class="rp-erreurs">${esc(e.message)}</p>`);
    }
  });
})();
