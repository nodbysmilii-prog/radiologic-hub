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
      let rec = null, voulu = false, fatale = false, relances = [];
      const nouveau = () => {
        const r = new R();
        r.lang = o.langue || 'fr-FR';
        r.continuous = true;
        r.interimResults = true;
        r.maxAlternatives = 1;
        r.onstart = () => o.surEtat && o.surEtat('ecoute');
        r.onresult = e => {
          let inter = '';
          for (let i = e.resultIndex; i < e.results.length; i++) {
            const res = e.results[i], t = res[0] ? res[0].transcript : '';
            if (res.isFinal) { if (t.trim()) o.surFinal(t.trim()); } else inter += t;
          }
          if (o.surIntermediaire) o.surIntermediaire(inter.trim());
        };
        r.onerror = e => {
          if (e.error === 'no-speech' || e.error === 'aborted') return;      // silence : on relance
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
            try { r.start(); return; } catch (err) { /* déjà démarrée */ }
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
        },
        arreter() {
          voulu = false;
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

  const MOTEURS = { webspeech, 'whisper-local': whisperLocal };
  RH.moteurs = {
    liste: () => Object.values(MOTEURS),
    get: id => MOTEURS[id] || webspeech,
    defaut: 'webspeech',
  };
})(typeof self !== 'undefined' ? self : this);
