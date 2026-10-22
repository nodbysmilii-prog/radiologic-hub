#!/bin/bash
# RadiologicHub — démarre le service local de dictée Whisper (au premier plan ; Ctrl+C pour arrêter).
# Rien n'est lancé automatiquement au démarrage du Mac.
# Options : --modele medium, --port 8737, --nouveau-jeton, --origine http://localhost:5500
cd "$(dirname "$0")/../.." || exit 1
exec python3 outils/whisper-local/service.py "$@"
