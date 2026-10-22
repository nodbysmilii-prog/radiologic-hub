#!/bin/bash
# RadiologicHub — installation locale de Whisper (whisper.cpp) pour la dictée.
#   • dossier utilisateur, sans sudo : ~/Library/Application Support/RadiologicHub/whisper (Mac)
#     ou ~/.local/share/radiologichub/whisper (Linux) ; RH_WHISPER_DIR pour un autre dossier ;
#   • whisper.cpp depuis le dépôt officiel, version figée ; compilation Metal sur Apple Silicon ;
#   • modèle MULTILINGUE (français) : small par défaut (≈ 466 Mo), medium au choix (≈ 1,5 Go) ;
#     jamais de modèle .en (anglais seulement) ;
#   • modèle de détection de la voix Silero (≈ 0,9 Mo) : évite le texte inventé pendant les silences ;
#   • rien dans Git (le dossier est hors du dépôt).
# Usage :  bash outils/whisper-local/installer.sh [small|medium]
set -euo pipefail

VERSION_WHISPER="v1.9.5"
DEPOT="https://github.com/ggml-org/whisper.cpp"
MODELE="${1:-small}"
case "$MODELE" in *.en|*.en-*) echo "Modèle « $MODELE » : anglais seulement, refusé. Choisissez small ou medium."; exit 1;; esac

if [ -n "${RH_WHISPER_DIR:-}" ]; then DOSSIER="$RH_WHISPER_DIR"
elif [ "$(uname)" = "Darwin" ]; then DOSSIER="$HOME/Library/Application Support/RadiologicHub/whisper"
else DOSSIER="$HOME/.local/share/radiologichub/whisper"; fi
mkdir -p "$DOSSIER/modeles"
echo "Dossier d'installation : $DOSSIER"

# --- Outils nécessaires (réutilisés s'ils sont là) ---
command -v git >/dev/null || { echo "git manquant : sur Mac, lancez « xcode-select --install » puis relancez."; exit 1; }
if [ "$(uname)" = "Darwin" ] && ! xcode-select -p >/dev/null 2>&1; then
  echo "Outils de développement Apple manquants : lancez « xcode-select --install » puis relancez."; exit 1
fi
CMAKE="$(command -v cmake || true)"
if [ -z "$CMAKE" ]; then
  echo "cmake absent : installation dans le dossier utilisateur (python3 -m pip install --user cmake)…"
  python3 -m pip install --user --quiet cmake
  CMAKE="$(python3 -c 'import cmake,os;print(os.path.join(cmake.CMAKE_BIN_DIR,"cmake"))')"
fi
command -v python3 >/dev/null || { echo "python3 manquant (fourni avec les outils de développement Apple)."; exit 1; }

# --- whisper.cpp, version figée ---
if [ ! -d "$DOSSIER/whisper.cpp/.git" ]; then
  git clone --depth 1 --branch "$VERSION_WHISPER" "$DEPOT" "$DOSSIER/whisper.cpp"
else
  git -C "$DOSSIER/whisper.cpp" fetch --depth 1 origin tag "$VERSION_WHISPER" && git -C "$DOSSIER/whisper.cpp" checkout -q "$VERSION_WHISPER"
fi
cd "$DOSSIER/whisper.cpp"
# Apple Silicon : Metal activé par défaut par whisper.cpp ; pas de Core ML (installation Python lourde) dans cette version.
"$CMAKE" -B build -DCMAKE_BUILD_TYPE=Release -DWHISPER_BUILD_TESTS=OFF >/dev/null
"$CMAKE" --build build -j --config Release --target whisper-cli
test -x build/bin/whisper-cli

# --- Modèles (scripts officiels de whisper.cpp) ---
telecharge() {   # $1 : script, $2 : nom, $3 : fichier attendu
  if [ ! -s "$DOSSIER/modeles/$3" ]; then
    bash "models/$1" "$2" "$DOSSIER/modeles"
  fi
}
telecharge download-ggml-model.sh "$MODELE" "ggml-$MODELE.bin"
telecharge download-vad-model.sh silero-v5.1.2 "ggml-silero-v5.1.2.bin"

python3 - "$DOSSIER/config.json" "$MODELE" <<'PY'
import json, os, sys
p, m = sys.argv[1], sys.argv[2]
c = json.load(open(p)) if os.path.exists(p) else {}
c['modele'] = m
json.dump(c, open(p, 'w'), indent=1)
PY

echo
echo "Espace disque utilisé :"
du -sh "$DOSSIER/whisper.cpp" "$DOSSIER/modeles"/* 2>/dev/null
echo
echo "Installation terminée. Démarrer le service : bash outils/whisper-local/demarrer.sh"
