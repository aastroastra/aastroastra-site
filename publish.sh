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
SUPABASE_REST="https://gttszlununmqivrqevwv.supabase.co"

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
# Fall back to the build file only when aapt2 is unavailable.
#
# `if` rather than `[[ ... ]] && ...`: under `set -e` the && form exits the whole
# script when the test is FALSE, because the compound returns 1. That is exactly
# what happened the first time this ran, and it looked like the script producing
# no output at all.
GRADLE="$ANDROID/app/build.gradle.kts"
if [[ -z "${VER:-}" ]]; then
  VER=$(grep -E 'versionName *= *"' "$GRADLE" | head -1 | sed -E 's/.*"([^"]+)".*/\1/')
fi
if [[ -z "${CODE:-}" ]]; then
  CODE=$(grep -E 'versionCode *= *' "$GRADLE" | head -1 | sed -E 's/[^0-9]//g')
fi
SIZE=$(ls -la "$APK" | awk '{printf "%.1f", $5/1048576}')
DATE=$(date +%Y-%m-%d)
UPDATED=$(date "+%d %b %Y, %I:%M %p %Z")   # human-readable 12-hour AM/PM, shown on the site as "Last updated"
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

# Refuse to touch the live objects if the APK cannot be stored.
#
# This script deletes before it uploads, because `cp` will not overwrite. That
# is fine until the upload fails: an APK over the bucket's limit left the site
# with NO download and NO version.json, a live outage caused by a publish. The
# limit is checked first now, so a too-large build fails before anything is
# removed.
BUCKET_LIMIT=$(curl -s "$SUPABASE_REST/storage/v1/bucket/site" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY:-}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY:-}" 2>/dev/null \
  | sed -nE 's/.*"file_size_limit":([0-9]+).*/\1/p')
APK_BYTES=$(wc -c < "$APK" | tr -d ' ')
if [[ -n "$BUCKET_LIMIT" && "$APK_BYTES" -gt "$BUCKET_LIMIT" ]]; then
  echo "REFUSING: the APK is $APK_BYTES bytes and the bucket allows $BUCKET_LIMIT."
  echo "Nothing was deleted; the current download is untouched."
  echo "Raise the limit in Project Settings > Storage, or shrink the build."
  exit 1
fi

supabase storage rm --experimental --yes "$BUCKET/aastroastra-latest.apk" >/dev/null 2>&1 || true
supabase storage rm --experimental --yes "$BUCKET/version.json" >/dev/null 2>&1 || true
supabase storage cp --experimental "$APK" "$BUCKET/aastroastra-latest.apk" \
  --content-type "application/vnd.android.package-archive"
supabase storage cp --experimental "$TMP/version.json" "$BUCKET/version.json" \
  --content-type "application/json" --cache-control "no-cache"

rm -rf "$TMP"
echo "Done. Live at https://aastroastra.github.io/aastroastra-site/  (v$VER · ${SIZE} MB)"
