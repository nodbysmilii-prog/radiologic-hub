/* =========================================================
   RadiologicHub — quiz « remplir le tableau »
   ---------------------------------------------------------
   Le quiz est construit à partir du tableau de référence de la page
   (data-source="#id"), qui reste la seule source des réponses :
   • chaque case attend data-ok (« hyper », « iso », « hypo », ou une clé
     de biochimie ; plusieurs valeurs séparées par un espace = toutes
     acceptées) ; une case partagée (centre / périphérie…) contient des
     .sg-part avec chacun son data-ok et son data-part ;
   • data-kind="bio" sur la case : réponse prise dans la palette
     « Biochimie » ; sinon : palette du signal ;
   • data-col (tdm, adc…) donne le mot affiché pour le choix faux.
   On choisit une réponse dans la palette, puis un clic par case :
   la correction et le score s'affichent aussitôt.
   ========================================================= */

(() => {
  const MOTS = {
    tdm: { hyper: 'Hyperdense', iso: 'Isodense', hypo: 'Hypodense' },
    adc: { hyper: 'Augmenté', iso: 'Variable', hypo: 'Diminué' },
    irm: { hyper: 'Hyper', iso: 'Iso', hypo: 'Hypo' },
  };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  document.querySelectorAll('[data-quiz-tableau]').forEach(quiz => {
    const source = document.querySelector(quiz.dataset.source);
    const zone = quiz.querySelector('.qz-table');
    const palette = quiz.querySelector('.qz-palette');
    const msg = quiz.querySelector('.qz-msg');
    if (!source || !zone || !palette) return;

    /* ---------- Construction du tableau à remplir ---------- */
    const table = document.createElement('table');
    table.className = source.className;
    table.appendChild(source.tHead.cloneNode(true));
    const tbody = table.createTBody();
    const bouton = (td, part) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'qz-cell';
      b.dataset.ok = (part || td).dataset.ok;
      b.dataset.kind = td.dataset.kind || 'signal';
      b.dataset.col = td.dataset.col || 'irm';
      b.qzReponse = (part || td).innerHTML;          // contenu de la case de référence (pastilles)
      b.qzPart = part ? part.dataset.part : '';
      const ligne = td.parentElement.cells[0].textContent.trim().replace(/\s+/g, ' ');
      const colonne = source.tHead.rows[0].cells[td.cellIndex].textContent.trim();
      b.setAttribute('aria-label', `${ligne}, ${colonne}${b.qzPart ? ', ' + b.qzPart : ''} : à remplir`);
      b.textContent = '?';
      return b;
    };
    [...source.tBodies[0].rows].forEach(tr => {
      const row = tbody.insertRow();
      [...tr.cells].forEach((td, i) => {
        const cell = row.insertCell();
        if (i === 0 || !(td.dataset.ok || td.querySelector('.sg-part'))) { cell.innerHTML = td.innerHTML; cell.className = td.className; return; }
        const parts = [...td.querySelectorAll('.sg-part')];
        if (!parts.length) { cell.appendChild(bouton(td)); return; }
        const split = document.createElement('div');
        split.className = 'qz-split';
        parts.forEach(p => {
          const w = document.createElement('div');
          w.className = 'qz-part';
          w.innerHTML = `<span>${esc(p.dataset.part)}</span>`;
          w.appendChild(bouton(td, p));
          split.appendChild(w);
        });
        cell.appendChild(split);
      });
    });
    zone.appendChild(table);

    const cells = [...table.querySelectorAll('.qz-cell')];
    const brushes = [...palette.querySelectorAll('.qz-brush')];
    const out = {
      ok: quiz.querySelector('.qz-bar .ok'), ko: quiz.querySelector('.qz-bar .ko'),
      count: quiz.querySelector('.qz-count'), end: quiz.querySelector('.qz-end'),
    };
    let pinceau = null;

    const dire = t => { if (msg) msg.textContent = t; };
    const choisir = b => {
      pinceau = b;
      brushes.forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      dire('');
    };
    brushes.forEach(b => b.addEventListener('click', () => choisir(pinceau === b ? null : b)));

    const libelle = (cell, v) => {
      if (cell.dataset.kind === 'bio') {
        const b = brushes.find(x => x.dataset.v === v);
        return b ? b.textContent.trim() : v;
      }
      return (MOTS[cell.dataset.col] || MOTS.irm)[v] || v;
    };

    const montrer = (cell, etat, choix) => {
      cell.dataset.state = etat;
      const verdict = etat === 'ok' ? '✓ juste' : etat === 'ko' ? '✗ faux' : 'réponse';
      cell.innerHTML = `<span class="qz-verdict">${verdict}</span><span class="sg-row">${cell.qzReponse}</span>`
        + (etat === 'ko' ? `<span class="qz-mine">${esc(libelle(cell, choix))}</span>` : '');
      const lu = cell.textContent.replace(/\s+/g, ' ').trim();
      cell.setAttribute('aria-label', cell.getAttribute('aria-label').replace(/ : .*$/, ' : ' + lu));
    };

    const score = () => {
      const n = cells.length;
      const ok = cells.filter(c => c.dataset.state === 'ok').length;
      const ko = cells.filter(c => c.dataset.state === 'ko').length;
      const reste = cells.filter(c => !c.dataset.state).length;
      if (out.ok) out.ok.style.width = (100 * ok / n) + '%';
      if (out.ko) out.ko.style.width = (100 * ko / n) + '%';
      if (out.count) out.count.innerHTML = `<b>${ok}</b> juste${ok > 1 ? 's' : ''} · <b>${ko}</b> faux · <b>${reste}</b> case${reste > 1 ? 's' : ''} à remplir sur ${n}`;
      if (out.end) {
        const fini = reste === 0 && ok + ko > 0;
        out.end.hidden = !fini;
        if (fini) {
          const p = Math.round(100 * ok / (ok + ko));
          out.end.textContent = `Terminé : ${ok} / ${ok + ko} (${p} %). `
            + (p === 100 ? 'Sans faute !' : p >= 80 ? 'Très bien : revoyez les cases en rouge.' : 'Relisez le tableau de datation, puis recommencez.');
        }
      }
    };

    cells.forEach(cell => cell.addEventListener('click', () => {
      if (cell.dataset.state) return;
      if (!pinceau) {
        dire('Choisissez d\'abord une réponse dans la palette, puis cliquez sur les cases.');
        palette.classList.remove('is-flash'); void palette.offsetWidth; palette.classList.add('is-flash');
        return;
      }
      if (pinceau.dataset.kind !== cell.dataset.kind) {
        dire(cell.dataset.kind === 'bio'
          ? 'Cette colonne attend une biochimie : choisissez-la dans la ligne « Biochimie » de la palette.'
          : 'Cette case attend un signal : choisissez Hyper, Iso ou Hypo.');
        return;
      }
      const v = pinceau.dataset.v;
      montrer(cell, cell.dataset.ok.split(/\s+/).includes(v) ? 'ok' : 'ko', v);
      dire('');
      score();
    }));

    quiz.querySelector('[data-qz="reset"]')?.addEventListener('click', () => {
      cells.forEach(c => {
        delete c.dataset.state;
        c.textContent = '?';
        c.setAttribute('aria-label', c.getAttribute('aria-label').replace(/ : .*$/, ' : à remplir'));
      });
      choisir(null);
      score();
    });
    quiz.querySelector('[data-qz="voir"]')?.addEventListener('click', () => {
      cells.filter(c => !c.dataset.state).forEach(c => montrer(c, 'vu'));
      score();
      if (out.count) out.count.innerHTML += ' · cases restantes affichées (non comptées)';
    });

    score();
  });
})();
