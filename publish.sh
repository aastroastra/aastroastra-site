#!/usr/bin/env bash
# Publish the latest Android release APK to the AastroAstra site.
#
# Uploads the signed release APK as `aastroastra-latest.apk` (stable URL) and a
# fresh `version.json` to the public Supabase Storage `site` bucket. The landing
# page reads version.json and links to a verified immutable APK. The stable URL
# is also updated for older links. No site redeploy is needed.
#
# Usage: ./publish.sh [path-to-release.apk]
#   Defaults to the Gradle release output, else the Desktop copy.
set -euo pipefail

WS="/Users/tirupatibalan/Documents/AstroAstra/workspace"
ANDROID="$WS/aastroastra-android"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# 1. Locate the APK.
APK="${1:-}"
if [[ -z "$APK" ]]; then
  if [[ -f "$ANDROID/app/build/outputs/apk/release/app-release.apk" ]]; then
    APK="$ANDROID/app/build/outputs/apk/release/app-release.apk"
  elif [[ -f "$HOME/Desktop/AstroAstra-v0.2.1-release.apk" ]]; then
    APK="$HOME/Desktop/AstroAstra-v0.2.1-release.apk"
  fi
fi
[[ -f "$APK" ]] || { echo "APK not found. Build the release APK first, or pass its path."; exit 1; }

# 2. Read the version FROM THE APK, not from the working tree.
#
# It used to read app/build.gradle.kts. That is whatever the tree happens to say
# right now, which is not necessarily what the APK being uploaded was built
# from: publishing an older or stashed build then advertised a version the
# binary does not carry, so the site claimed 0.4.6 while the download installed
# as 0.4.5. aapt2 asks the artefact itself.
AAPT=$(find "${ANDROID_HOME:-$HOME/Library/Android/sdk}/build-tools" -name aapt2 2>/dev/null | sort -r | head -1)
if [[ -n "$AAPT" && -x "$AAPT" ]]; then
  # No `| head -1` here: closing the pipe early gives aapt2 a SIGPIPE, and with
  # `set -o pipefail` that fails the whole pipeline and `set -e` exits the
  # script mid-publish, silently. Take the first line in the shell instead.
  BADGING_ALL=$("$AAPT" dump badging "$APK" 2>/dev/null || true)
  BADGING=${BADGING_ALL%%$'\n'*}
  VER=$(echo "$BADGING"  | sed -nE "s/.*versionName='([^']+)'.*/\1/p")
  CODE=$(echo "$BADGING" | sed -nE "s/.*versionCode='([0-9]+)'.*/\1/p")
fi
# Never label an old binary with the working tree's version.
[[ -n "${VER:-}" && -n "${CODE:-}" ]] || {
  echo "Cannot read APK version with aapt2; nothing was uploaded."
  exit 1
}
SIZE=$(ls -la "$APK" | awk '{printf "%.1f", $5/1048576}')
DATE=$(date +%Y-%m-%d)
UPDATED=$(date "+%d %b %Y, %I:%M %p %Z")   # human-readable 12-hour AM/PM, shown on the site as "Last updated"
APK_URL="https://gttszlununmqivrqevwv.supabase.co/storage/v1/object/public/site/aastroastra-latest.apk"

echo "Publishing AastroAstra beta → version $VER (code $CODE) · ${SIZE} MB"

# 3. Write version.json.
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
cat > "$TMP/version.json" <<JSON
{
  "version": "$VER",
  "versionCode": $CODE,
  "sizeMb": "$SIZE",
  "date": "$DATE",
  "updated": "$UPDATED",
  "apk": "$APK_URL"
}
JSON

# 4. Upload verified bytes before publishing metadata. Never delete live objects.
# Use SUPABASE_SERVICE_ROLE_KEY, or the CLI login when it can read project keys.
python3 "$SCRIPT_DIR/publish-storage.py" "$APK" "$TMP/version.json"
echo "Done. Live at https://aastroastra.github.io/aastroastra-site/  (v$VER · ${SIZE} MB)"
