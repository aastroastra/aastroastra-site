#!/usr/bin/env bash
# Android build sharing. Public APK publishing is DISABLED (29 Sep 2026).
#
# Founder decision for Google Ads approval: builds reach people only through
# Google Play (production, open testing, internal testing) and TestFlight.
# Nothing is uploaded to the public `site` bucket any more.
#
# Usage:
#   ./publish.sh                        -> refuses, explains the channels
#   ./publish.sh --private [apk]        -> uploads to the PRIVATE `builds-internal`
#                                          bucket and prints a 7-day signed link
#                                          for the team (never post it publicly)
# The APK defaults to the Gradle release output.
set -euo pipefail

if [[ "${1:-}" != "--private" ]]; then
  echo "Public APK publishing is disabled (29 Sep 2026). Use Play internal/open testing."
  echo "  Internal testing: upload the AAB to the Play internal track (store/ scripts)."
  echo "  Open testing:     https://play.google.com/apps/testing/com.avdstudiox.android"
  echo "  Team-only link:   ./publish.sh --private [path-to-release.apk]  (private bucket, 7-day signed URL)"
  exit 2
fi
shift

WS="/Users/tirupatibalan/Documents/AstroAstra/workspace"
ANDROID="$WS/aastroastra-android"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

APK="${1:-$ANDROID/app/build/outputs/apk/release/app-release.apk}"
[[ -f "$APK" ]] || { echo "APK not found. Build the release APK first, or pass its path."; exit 1; }

# Read the version from the APK itself, not from the working tree.
AAPT=$(find "${ANDROID_HOME:-$HOME/Library/Android/sdk}/build-tools" -name aapt2 2>/dev/null | sort -r | head -1)
if [[ -n "$AAPT" && -x "$AAPT" ]]; then
  # No `| head -1`: an early pipe close gives aapt2 SIGPIPE and fails the pipeline.
  BADGING_ALL=$("$AAPT" dump badging "$APK" 2>/dev/null || true)
  BADGING=${BADGING_ALL%%$'\n'*}
  VER=$(echo "$BADGING"  | sed -nE "s/.*versionName='([^']+)'.*/\1/p")
  CODE=$(echo "$BADGING" | sed -nE "s/.*versionCode='([0-9]+)'.*/\1/p")
fi
[[ -n "${VER:-}" && -n "${CODE:-}" ]] || { echo "Cannot read APK version with aapt2; nothing was uploaded."; exit 1; }

echo "Private team share: Android $VER ($CODE)"
python3 "$SCRIPT_DIR/publish-storage.py" --private "$APK" "android/aastroastra-$CODE"
