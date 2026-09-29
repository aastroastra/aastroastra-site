#!/usr/bin/env python3
"""Disabled on 29 Sep 2026.

This used to import the public APK/IPA downloads from the Supabase `site`
bucket into the release history and write iOS OTA manifests. Public app
downloads were removed for Google Ads approval: builds ship only through
Google Play testing tracks and TestFlight, so there is nothing to import.
The previous implementation is in git history.
"""

if __name__ == '__main__':
    raise SystemExit('Public APK/IPA publishing is disabled (29 Sep 2026). Nothing to import.')
