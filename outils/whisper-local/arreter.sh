#!/bin/bash
# RadiologicHub — arrête le service local de dictée Whisper s'il tourne en arrière-plan.
if [ -n "${RH_WHISPER_DIR:-}" ]; then D="$RH_WHISPER_DIR"
elif [ "$(uname)" = "Darwin" ]; then D="$HOME/Library/Application Support/RadiologicHub/whisper"
else D="$HOME/.local/share/radiologichub/whisper"; fi
if [ -f "$D/service.pid" ] && kill "$(cat "$D/service.pid")" 2>/dev/null; then
  rm -f "$D/service.pid"; echo "Service Whisper local arrêté."
else
  echo "Aucun service Whisper local en cours."
fi
