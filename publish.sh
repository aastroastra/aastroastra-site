#!/usr/bin/env bash
# Publish the latest Android release APK to the AastroAstra site.
#
# Uploads the signed release APK as `aastroastra-latest.apk` (stable URL) and a
# fresh `version.json` to the public Supabase Storage `site` bucket. The landing
# page (https://aastroastra.github.io/aastroastra-site/) links to the stable APK
# URL and reads version.json, so the download is always the newest build — no
# site redeploy needed.
#
# Usage: ./publish.sh [path-to-release.apk]
#   Defaults to the Gradle release output, else the Desktop copy.
set -euo pipefail

WS="/Users/tirupatibalan/Documents/AstroAstra/workspace"
ANDROID="$WS/aastroastra-android"
BACKEND="$WS/aastroastra-backend"   # supabase CLI is linked here
BUCKET="ss:///site"

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

# 2. Read version from the Android build file.
GRADLE="$ANDROID/app/build.gradle.kts"
VER=$(grep -E 'versionName *= *"' "$GRADLE" | head -1 | sed -E 's/.*"([^"]+)".*/\1/')
CODE=$(grep -E 'versionCode *= *' "$GRADLE" | head -1 | sed -E 's/[^0-9]//g')
SIZE=$(ls -la "$APK" | awk '{printf "%.1f", $5/1048576}')
DATE=$(date +%Y-%m-%d)
UPDATED=$(date "+%d %b %Y, %H:%M %Z")   # human-readable, shown on the site as "Last updated"
APK_URL="https://gttszlununmqivrqevwv.supabase.co/storage/v1/object/public/site/aastroastra-latest.apk"

echo "Publishing AastroAstra beta → version $VER (code $CODE) · ${SIZE} MB"

# 3. Write version.json.
TMP=$(mktemp -d)
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

# 4. Upload APK + version.json to the public bucket (supabase CLI, linked
#    project). `cp` won't overwrite, so remove the old objects first.
cd "$BACKEND"
supabase storage rm --experimental --yes "$BUCKET/aastroastra-latest.apk" >/dev/null 2>&1 || true
supabase storage rm --experimental --yes "$BUCKET/version.json" >/dev/null 2>&1 || true
supabase storage cp --experimental "$APK" "$BUCKET/aastroastra-latest.apk" \
  --content-type "application/vnd.android.package-archive"
supabase storage cp --experimental "$TMP/version.json" "$BUCKET/version.json" \
  --content-type "application/json" --cache-control "no-cache"

rm -rf "$TMP"
echo "Done. Live at https://aastroastra.github.io/aastroastra-site/  (v$VER · ${SIZE} MB)"
