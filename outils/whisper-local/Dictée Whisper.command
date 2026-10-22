#!/bin/bash
# Double-clic dans le Finder : ouvre le Terminal et démarre la dictée Whisper locale.
# Fermer la fenêtre (ou Ctrl+C) arrête le service.
cd "$(dirname "$0")" && exec bash ./demarrer.sh
