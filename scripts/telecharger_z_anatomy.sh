#!/usr/bin/env bash
# =========================================================
# Télécharge le pack Z-Anatomy (modèle Blender, CC BY-SA 4.0, dérivé de
# BodyParts3D) dans assets-sources/z-anatomy/ — dossier ignoré par git,
# jamais publié. Version figée : le commit ci-dessous du dépôt
# https://github.com/Z-Anatomy/Models-of-human-anatomy
# Usage : bash scripts/telecharger_z_anatomy.sh
# =========================================================
set -euo pipefail
COMMIT=2b6cf98a8ca012571ecb252e5c077b42a21b3b61
DEPOT=https://github.com/Z-Anatomy/Models-of-human-anatomy
RACINE="$(cd "$(dirname "$0")/.." && pwd)"
CIBLE="$RACINE/assets-sources/z-anatomy"
BLEND="$CIBLE/Z-Anatomy/Startup.blend"

if [ -f "$BLEND" ]; then echo "Déjà présent : $BLEND"; exit 0; fi
mkdir -p "$CIBLE"
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
git -C "$TMP" init -q
git -C "$TMP" remote add origin "$DEPOT"
git -C "$TMP" fetch -q --depth 1 --filter=blob:none origin "$COMMIT"
git -C "$TMP" checkout -q FETCH_HEAD -- License.txt Readme.md Z-Anatomy.zip
cp "$TMP/License.txt" "$TMP/Readme.md" "$CIBLE/"
python3 -I -c "import sys, zipfile; zipfile.ZipFile(sys.argv[1]).extract('Z-Anatomy/Startup.blend', sys.argv[2])" "$TMP/Z-Anatomy.zip" "$CIBLE"
echo "$COMMIT" > "$CIBLE/COMMIT"
echo "Z-Anatomy ($COMMIT) → $BLEND ($(du -h "$BLEND" | cut -f1))"
