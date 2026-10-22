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
   • V2 : « whisper-local » — whisper.cpp installé sur le poste et un petit
     service local (outils/whisper-local), joint sur 127.0.0.1 avec un jeton
     d'appairage ; l'audio ne quitte pas le poste. Pas de résultats
     intermédiaires : le texte de chaque enregistrement ou segment est envoyé
     à surFinal(texte, { brut, … }). Le moteur ne bascule jamais seul vers un
     autre service.
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
        r.maxAlternatives = o.choisir ? 5 : 1;
        // vocabulaire médical proposé au moteur quand le navigateur le permet (Chrome récent)
        if (o.vocabulaire && 'phrases' in r && root.SpeechRecognitionPhrase) {
          try { r.phrases = o.vocabulaire.slice(0, 500).map(m => new root.SpeechRecognitionPhrase(m, 5)); } catch (err) { /* non pris en charge */ }
        }
        r.onstart = () => o.surEtat && o.surEtat('ecoute');
        r.onresult = e => {
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

  /* ---------- V2 : Whisper local (whisper.cpp sur ce poste, service outils/whisper-local) ----------
     micro (getUserMedia) → 16 kHz mono dans le navigateur (dictee/audio.js) → WAV → service local
     http://127.0.0.1:8737 (jeton d'appairage) → texte français → surFinal. Aucun service externe :
     si le service local ne répond pas, erreur claire, jamais de bascule vers un autre moteur.
     Modes : « arret » (transcription après l'arrêt) ou « segments » (envoi à chaque pause). */
  const A = () => RH.audio;
  const MESSAGES_HTTP = {
    401: 'Whisper local : appairage requis — collez le code affiché par le service dans Dictée › Réglages.',
    403: 'Whisper local : cette adresse du site n\'est pas autorisée par le service (option --origine).',
    413: 'Whisper local : enregistrement trop long (2 minutes au plus) — utilisez le mode « par segments ».',
    415: 'Whisper local : format audio refusé.',
    503: 'Whisper local : moteur non installé — lancez outils/whisper-local/installer.sh.',
    504: 'Whisper local : transcription trop longue.',
  };
  const INJOIGNABLE = 'Whisper local injoignable : démarrez le service (double-clic sur « Dictée Whisper » dans outils/whisper-local, ou bash outils/whisper-local/demarrer.sh), puis réessayez. Aucun autre moteur n\'est utilisé à sa place.';

  async function appeler(cfg, chemin, options = {}) {
    let r;
    try {
      r = await fetch(cfg.adresse.replace(/\/+$/, '') + chemin, {
        ...options, cache: 'no-store', credentials: 'omit',
        targetAddressSpace: 'loopback',                   // Chrome : accès local demandé explicitement
        headers: { ...(options.headers || {}), Authorization: `Bearer ${cfg.jeton || ''}` },
      });
    } catch (err) {
      const e = new Error(INJOIGNABLE); e.code = 'injoignable'; throw e;
    }
    const corps = await r.json().catch(() => ({}));
    if (!r.ok) { const e = new Error(MESSAGES_HTTP[r.status] || `Whisper local : erreur ${r.status}.`); e.code = r.status; throw e; }
    return corps;
  }

  const whisperLocal = {
    id: 'whisper-local',
    nom: 'Whisper local (sur ce poste, service à démarrer)',
    local: true,
    disponible: () => !!(root.navigator && root.navigator.mediaDevices && root.navigator.mediaDevices.getUserMedia && (root.AudioContext || root.webkitAudioContext) && RH.audio),
    raison: () => 'Ce navigateur ne permet pas la capture du micro nécessaire à Whisper local.',
    etat: cfg => appeler(cfg, '/etat'),
    creer(o) {
      const cfg = o.whisper || {};
      const Au = A();
      let flux = null, ctx = null, noeud = null, source = null, reech = null, decoupeur = null;
      let enregistrement = [], file = Promise.resolve(), enAttente = 0, precedent = '', ouvert = false;

      const info = () => o.surInfo && o.surInfo(enAttente ? `Transcription en cours (${enAttente})…` : (ouvert ? 'Écoute…' : ''), enAttente > 0);
      const envoyer = ech => {
        if (!Au.aDeLaParole(ech)) return;                    // silence : rien n'est envoyé
        const contexte = (cfg.contexte && cfg.contexte()) || '';
        enAttente++; info();
        file = file.then(async () => {
          try {
            const r = await appeler(cfg, '/transcrire', {
              method: 'POST', body: Au.wav(ech),
              headers: { 'Content-Type': 'audio/wav', 'X-RH-Contexte': encodeURIComponent(contexte) },
            });
            let t = (r.texte || '').trim();
            if (t && Au.echoDuContexte(t, contexte)) t = '';
            if (t) t = Au.raccorder(precedent, t);
            if (t) { precedent = t; o.surFinal(t, { brut: r.texte, moteur: 'whisper-local', modele: r.modele, duree: r.duree, calcul: r.calcul, sansRemplacer: true }); }
            if (o.surMesure) o.surMesure(r);
          } catch (err) {
            if (o.surErreur) o.surErreur({ code: err.code, fatale: err.code === 'injoignable' || err.code === 401, message: err.message });
          } finally { enAttente--; info(); }
        });
      };

      const fermerMicro = () => {
        ouvert = false;
        try { if (noeud) noeud.disconnect(); if (source) source.disconnect(); } catch (err) { /* déjà fermé */ }
        if (flux) flux.getTracks().forEach(t => t.stop());
        if (ctx) ctx.close().catch(() => {});
        flux = ctx = noeud = source = null;
      };

      return {
        async demarrer() {
          // Le service répond-il ? (avant d'ouvrir le micro)
          try {
            const e = await appeler(cfg, '/etat');
            if (!e.appaire) throw Object.assign(new Error(MESSAGES_HTTP[401]), { code: 401 });
            if (!e.pret) throw Object.assign(new Error(MESSAGES_HTTP[503]), { code: 503 });
          } catch (err) {
            o.surErreur && o.surErreur({ code: err.code, fatale: true, message: err.message });
            return;
          }
          try {
            flux = await root.navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
          } catch (err) {
            o.surErreur && o.surErreur({ code: 'micro', fatale: true, message: 'Accès au micro refusé ou impossible : autorisez le micro pour ce site, puis réessayez.' });
            return;
          }
          const AC = root.AudioContext || root.webkitAudioContext;
          ctx = new AC();
          source = ctx.createMediaStreamSource(flux);
          reech = new Au.Reechantillonneur(ctx.sampleRate);
          enregistrement = []; precedent = '';
          decoupeur = cfg.mode === 'segments' ? new Au.Decoupeur({ surSegment: envoyer }) : null;
          const recevoir = bloc => {
            const x = reech.pousser(bloc);
            if (decoupeur) decoupeur.pousser(x); else enregistrement.push(x);
          };
          // ScriptProcessor : pris en charge partout (Safari compris) ; l'audio n'est pas rejoué
          noeud = ctx.createScriptProcessor(4096, 1, 1);
          noeud.onaudioprocess = e => recevoir(new Float32Array(e.inputBuffer.getChannelData(0)));
          source.connect(noeud);
          noeud.connect(ctx.destination);
          ouvert = true; info();
          o.surEtat && o.surEtat('ecoute');
        },
        arreter() {
          if (!ouvert) return;
          fermerMicro();
          if (decoupeur) decoupeur.vider();
          else if (enregistrement.length) {
            const n = enregistrement.reduce((s, x) => s + x.length, 0), tout = new Float32Array(n);
            let k = 0; enregistrement.forEach(x => { tout.set(x, k); k += x.length; });
            enregistrement = [];
            if (n > 120 * Au.FREQ) o.surErreur && o.surErreur({ fatale: false, message: MESSAGES_HTTP[413] });
            else envoyer(tout);
          }
          info();
          o.surEtat && o.surEtat('arret');
        },
      };
    },
  };

  const MOTEURS = { webspeech, 'whisper-local': whisperLocal };
  RH.moteurs = {
    liste: () => Object.values(MOTEURS),
    get: id => MOTEURS[id] || webspeech,
    defaut: 'webspeech',
  };
})(typeof self !== 'undefined' ? self : this);
