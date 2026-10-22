# Dictée Whisper local (essai, sur votre Mac)

Transcription de la dictée **sur votre ordinateur**, sans service en ligne, sans clé ni abonnement :
[whisper.cpp](https://github.com/ggml-org/whisper.cpp) (version figée **v1.9.5**, accélération Metal sur Apple Silicon)
avec un modèle **multilingue** (français), `small` par défaut, `medium` au choix.

> Fonction d'essai, pour ce poste seulement : un visiteur du site qui n'a pas installé ce service ne peut pas
> l'utiliser. L'ancien moteur (service du navigateur) reste le moteur par défaut.

## Parcours

```
micro du navigateur → capture (Web Audio) → conversion 16 kHz mono dans la page → WAV PCM 16 bits
→ service local http://127.0.0.1:8737 (jeton d'appairage) → whisper-cli (français forcé, transcription)
→ texte → corrections du site (dictee/traitement.js) → insertion au curseur
```

Le navigateur produit lui-même le WAV à partir des échantillons du micro (pas de WebM/Opus renommé) ;
le service vérifie l'en-tête (PCM 16 bits, mono, 16 kHz) et refuse tout autre format.

## Installer (une fois)

```bash
bash outils/whisper-local/installer.sh           # modèle small
bash outils/whisper-local/installer.sh medium    # pour essayer medium
```

- Dossier : `~/Library/Application Support/RadiologicHub/whisper` (hors du dépôt Git), sans `sudo`.
- Prérequis réutilisés : `git` et les outils de développement Apple (`xcode-select --install` s'ils manquent),
  `python3` ; `cmake` s'il est déjà là, sinon installé dans le dossier utilisateur (`pip --user`).
- Téléchargements : sources whisper.cpp (≈ 15 Mo), modèle **small ≈ 466 Mo** (medium ≈ 1,5 Go),
  détection de la voix Silero ≈ 0,9 Mo. Espace disque total ≈ 0,6 Go avec small (≈ 1,7 Go avec medium) ;
  l'installateur affiche la place réellement occupée.
- Modèles `.en` (anglais seulement) refusés.

## Démarrer / arrêter

- **Double-clic** sur `Dictée Whisper.command` (dans ce dossier) : une fenêtre Terminal s'ouvre ;
  la fermer (ou Ctrl+C) arrête le service.
- Ou : `bash outils/whisper-local/demarrer.sh` (options : `--modele medium`, `--nouveau-jeton`,
  `--origine http://localhost:5500`). `arreter.sh` arrête un service lancé en arrière-plan.
- Rien n'est lancé automatiquement au démarrage du Mac.

Au démarrage, le service affiche un **code d'appairage** : collez-le une fois dans
*Comptes rendus › Dictée › ⚙ Réglages › Whisper local*, après avoir choisi le moteur « Whisper local ».
Le site affiche ensuite l'état : *prêt (small)*, *service arrêté*, *appairage requis*, *modèle non installé*.

## Utiliser

1. Moteur « Whisper local », code d'appairage collé, état **prêt**.
2. **Dicter** (ou F9) : le micro écoute ; **Arrêter** : la transcription se fait, puis le texte s'insère
   au curseur (jamais à la place d'un texte sélectionné). « ↶ Retour » annule la dernière insertion.
3. Mode **« Par segments »** (réglages) : le texte arrive à chaque pause de 0,7 s. Les coupes se font
   seulement dans les silences (jamais au milieu d'un mot), les segments ne se chevauchent pas (pas de
   doublon) ; une phrase de plus de 25 s est coupée à son instant le plus calme.
4. *Texte brut de la dernière transcription* (sous la barre de dictée) : ce que Whisper a réellement
   produit, avant les corrections du site (lexique, unités, « et » / « est »…).

## Ce que le système fait et ne fait pas

- Français forcé (`-l fr`), transcription, jamais traduction ; recherche en faisceau (5).
- Contexte initial court selon l'examen (titre du compte rendu type en majuscules + une dizaine de termes
  de la spécialité) : jamais tout le lexique, jamais le texte déjà dicté.
- Silences : rien n'est envoyé (contrôle d'énergie dans la page) ; détection de la voix Silero et seuil
  « pas de parole » de Whisper ; les formules de sous-titrage que Whisper invente parfois sur du bruit
  (« Sous-titres réalisés par… ») sont écartées si elles sont tout le résultat.
- Aucune phrase complétée, aucun constat ajouté ; les négations, côtés, mesures et classifications ne sont
  pas « corrigés » par Whisper. Les corrections du site restent celles de la dictée habituelle (mise en
  forme : 12 mm, PI-RADS…) et le texte brut reste consultable.

## Sécurité

- Écoute sur **127.0.0.1** seulement ; l'en-tête `Host` doit être `127.0.0.1` ou `localhost`.
- Origines autorisées une par une (site en ligne, `http://127.0.0.1:8737`, `http://localhost:8000`) :
  pas de CORS universel ; Chrome (accès d'une page HTTPS à la boucle locale) reçoit l'autorisation
  explicite `Access-Control-Allow-Private-Network`.
- Jeton d'appairage aléatoire (fichier `jeton`, droits 600) exigé pour transcrire.
- 2 minutes au plus par enregistrement, corps lu puis refusé au-delà.
- Journal : durée, taille, temps de calcul, « texte / vide » ; jamais l'audio ni le texte.
- Fichier WAV temporaire (droits 600) supprimé juste après la transcription, même en cas d'erreur.
- Aucun appel sortant ; le `whisper-server` de whisper.cpp n'est pas utilisé (il répond
  `Access-Control-Allow-Origin: *`).

## Navigateurs

- **Chrome / Edge** : la page en ligne (HTTPS) peut joindre `http://127.0.0.1` ; Chrome peut demander
  l'autorisation « accès au réseau local » : l'accepter pour ce site.
- **Safari** bloque l'accès d'une page HTTPS à `http://127.0.0.1` : ouvrir le site servi par le service
  lui-même, `http://127.0.0.1:8737/site/comptes-rendus.html` (mêmes fichiers, servis en local).
- Ne désactivez pas la sécurité du navigateur et n'exposez pas ce service sur Internet.

## Tests

- `node --test tests/dictee-whisper.test.js` : audio (16 kHz, WAV, découpage), service (origines,
  appairage, format, limites, journal, fichiers supprimés) avec un faux `whisper-cli`.
- `node tests/navigateur/whisper-local.js parole.wav silence.wav cert.pem cle.pem` : de bout en bout dans
  Chromium (faux micro, page en HTTPS) ; avec `RH_WHISPER_DIR` pointant votre installation, le vrai
  Whisper est utilisé.

## Désinstaller

```bash
bash outils/whisper-local/arreter.sh
rm -rf "$HOME/Library/Application Support/RadiologicHub/whisper"
```
(et `python3 -m pip uninstall cmake` si l'installateur l'a ajouté). Dans le site, revenir au moteur
« Service du navigateur ».
