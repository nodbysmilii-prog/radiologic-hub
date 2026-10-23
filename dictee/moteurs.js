/* =========================================================
   RadiologicHub — Dictée vocale : MOTEURS DE TRANSCRIPTION
   ---------------------------------------------------------
   Interface commune (un moteur = un objet) :

     {
       id, nom, local,            // local : true si l'audio ne quitte pas le poste
       disponible() → booléen,    // le navigateur permet-il ce moteur ?
       raison()     → texte,      // pourquoi il n'est pas disponible
       creer({ langue, surIntermediaire(texte), surFinal(texte),
               surEtat('ecoute' | 'arret'), surErreur({ code, message, fatale }) })
         → { demarrer(), arreter() }
     }

   Le post-traitement (dictee/traitement.js) ne dépend pas du moteur :
   le texte « final » de n'importe quel moteur suit le même chemin.

   • V1 : « webspeech » — Web Speech API du navigateur (Chrome, Edge,
     Safari). L'audio est transcrit par le service du navigateur (Google,
     Apple…) : avertissement affiché, pas d'identité patient.
   • V2 (à venir) : « whisper-local » — Whisper exécuté dans le navigateur
     (WebGPU, ex. transformers.js), modèle téléchargé une fois puis gardé en
     cache ; micro capté par getUserMedia, découpage sur les silences ;
     l'audio ne quitte pas le poste. Pas de résultats intermédiaires natifs :
     le texte de chaque tronçon sera envoyé à surFinal().
   ========================================================= */

(function (root) {
  'use strict';
  const RH = (root.RHDictee = root.RHDictee || {});

  /* ---------- V1 : Web Speech API ---------- */
  const Reco = () => root.SpeechRecognition || root.webkitSpeechRecognition;
  const ERREURS = {
    'not-allowed': 'Accès au micro refusé : autorisez le micro pour ce site (icône à gauche de l\'adresse), puis réessayez.',
    'service-not-allowed': 'La reconnaissance vocale est désactivée dans ce navigateur (sur Safari : activez Siri / la dictée dans les réglages du système).',
    'audio-capture': 'Aucun micro détecté : branchez ou sélectionnez un micro.',
    network: 'Le service de reconnaissance du navigateur est injoignable : une connexion internet est nécessaire.',
    'language-not-supported': 'Le français n\'est pas disponible pour la reconnaissance vocale de ce navigateur.',
  };

  const webspeech = {
    id: 'webspeech',
    nom: 'Service du navigateur (Web Speech API)',
    local: false,
    disponible: () => !!Reco(),
    raison: () => 'Votre navigateur ne permet pas la dictée vocale (Firefox ne prend pas en charge la Web Speech API) : utilisez Chrome, Edge ou Safari.',
    creer(o) {
      const R = Reco();
      let rec = null, voulu = false, fatale = false, relances = [], sansPhrases = false, local = !!o.surOrdinateur, recu = false, garde = null;
      const nouveau = () => {
        const r = new R();
        r.lang = o.langue || 'fr-FR';
        r.continuous = true;
        r.interimResults = true;
        r.maxAlternatives = o.choisir ? 5 : 1;
        // Reconnaissance sur l'ordinateur (Chrome récent) : gratuite, et seule à accepter une liste de
        // vocabulaire à favoriser (« contextual biasing ») — les termes médicaux du site et ceux appris.
        if (local && 'processLocally' in r) {
          r.processLocally = true;
          if (!sansPhrases && o.vocabulaire && o.vocabulaire.length && root.SpeechRecognitionPhrase && 'phrases' in r) {
            try { o.vocabulaire.slice(0, 400).forEach(m => r.phrases.push(new root.SpeechRecognitionPhrase(m, 5))); } catch (err) { sansPhrases = true; }
          }
        }
        const diag = k => { if (o.surDiag) o.surDiag(k, local && 'processLocally' in r ? 'sur l\'ordinateur' : 'serveur Google'); };
        diag('depart');
        r.onstart = () => { diag('demarre'); if (o.surEtat) o.surEtat('ecoute'); };
        r.onaudiostart = () => diag('micro');
        r.onsoundstart = () => diag('son');
        r.onspeechstart = () => diag('voix');
        r.onresult = e => {
          recu = true; clearTimeout(garde); diag('texte');
          let inter = '';
          for (let i = e.resultIndex; i < e.results.length; i++) {
            const res = e.results[i];
            // plusieurs hypothèses : on garde celle qui contient le plus de termes médicaux connus
            const t = res.isFinal && o.choisir && res.length > 1
              ? o.choisir([...Array(res.length)].map((x, k) => res[k].transcript))
              : (res[0] ? res[0].transcript : '');
            if (res.isFinal) { if (t.trim()) o.surFinal(t.trim()); } else inter += t;
          }
          if (o.surIntermediaire) o.surIntermediaire(inter.trim());
        };
        r.onerror = e => {
          // silence : on relance sans s'arrêter
          diag('erreur:' + e.error);
          if (e.error === 'no-speech' || e.error === 'aborted') return;
          // liste de vocabulaire refusée : on relance sans la liste (jamais d'arrêt de la dictée pour ça)
          if (e.error === 'phrases-not-supported') { sansPhrases = true; return; }
          if (local && !recu && e.error !== 'not-allowed' && e.error !== 'audio-capture') {   // l'ordinateur échoue : on repasse à la dictée normale, avec un message
            local = false;
            if (o.surErreur) o.surErreur({ code: e.error, fatale: false, message: `Reconnaissance sur l'ordinateur indisponible (${e.error}) : dictée normale utilisée.` });
            return;
          }
          if (local && (e.error === 'language-not-supported' || e.error === 'service-not-allowed')) {
            fatale = true;
            if (o.surErreur) o.surErreur({ code: e.error, fatale, message: 'Le français n\'est pas encore installé sur cet ordinateur : ⚙ Réglages › « Installer le français ». En attendant, décochez « Reconnaissance sur cet ordinateur ».' });
            return;
          }
          if (local && !ERREURS[e.error]) {
            fatale = true;
            if (o.surErreur) o.surErreur({ code: e.error, fatale, message: `Reconnaissance sur l'ordinateur impossible (${e.error}) : décochez « Reconnaissance sur cet ordinateur » dans ⚙ Réglages pour dicter normalement.` });
            return;
          }
          fatale = !!ERREURS[e.error];
          if (o.surErreur) o.surErreur({ code: e.error, fatale, message: ERREURS[e.error] || `Erreur de reconnaissance vocale (${e.error}).` });
        };
        r.onend = () => {
          if (o.surIntermediaire) o.surIntermediaire('');
          // Chrome arrête la reconnaissance après un silence : on relance tant que l'utilisateur n'a pas arrêté
          const t = Date.now();
          relances = relances.filter(x => t - x < 10000);
          if (voulu && !fatale && relances.length < 5) {
            relances.push(t);
            try { rec = nouveau(); rec.start(); return; } catch (err) { /* déjà démarrée */ }
          }
          voulu = false;
          if (o.surEtat) o.surEtat('arret');
        };
        return r;
      };
      return {
        demarrer() {
          voulu = true; fatale = false; relances = [];
          rec = nouveau();
          try { rec.start(); } catch (err) { /* déjà démarrée */ }
          // Reconnaissance sur l'ordinateur muette après 8 s d'écoute : retour à la dictée normale
          if (local) garde = setTimeout(() => {
            if (recu || !voulu) return;
            local = false;
            if (o.surErreur) o.surErreur({ code: 'local-muet', fatale: false, message: 'La reconnaissance sur l\'ordinateur ne répond pas : dictée normale utilisée (vous pouvez décocher la case dans ⚙).' });
            try { rec.abort ? rec.abort() : rec.stop(); } catch (err) { /* déjà arrêtée */ }   // onend relance sans le mode local
          }, 8000);
        },
        arreter() {
          voulu = false; clearTimeout(garde);
          if (rec) { try { rec.stop(); } catch (err) { /* déjà arrêtée */ } }
        },
      };
    },
  };

  /* ---------- V2 : Whisper local (WebGPU) — emplacement réservé ---------- */
  const whisperLocal = {
    id: 'whisper-local',
    nom: 'Whisper local (WebGPU) — bientôt',
    local: true,
    disponible: () => false,
    raison: () => 'Transcription locale en préparation (Whisper dans le navigateur, WebGPU) : l\'audio ne quittera pas le poste.',
    creer() { throw new Error('Moteur Whisper local non disponible dans cette version.'); },
  };

  /* Reconnaissance sur l'ordinateur : état et installation du français (Chrome récent) */
  webspeech.surOrdinateur = {
    pris: () => !!(Reco() && Reco().available),
    etat: async (langue = 'fr-FR') => {
      const R = Reco();
      if (!R || !R.available) return 'non-pris-en-charge';
      try { return await R.available({ langs: [langue], processLocally: true }); } catch (err) { return 'non-pris-en-charge'; }
    },
    installer: async (langue = 'fr-FR') => {
      const R = Reco();
      if (!R || !R.install) return false;
      try { return await R.install({ langs: [langue], processLocally: true }); } catch (err) { return false; }
    },
  };

  const MOTEURS = { webspeech };   // Whisper : essayé puis retiré (pas de temps réel) ; emplacement gardé ci-dessus
  RH.moteurs = {
    liste: () => Object.values(MOTEURS),
    get: id => MOTEURS[id] || webspeech,
    defaut: 'webspeech',
  };
})(typeof self !== 'undefined' ? self : this);
