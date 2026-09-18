# AastroAstra: landing site

Static marketing site with five light and dark themes. Hosted on GitHub Pages.
The Android beta APK + version.json live in Supabase Storage (public `site`
bucket); this page reads `version.json` for the displayed version and download.
Running `./publish.sh /path/to/signed.apk` uploads an immutable APK, verifies its
public SHA-256, refreshes the stable APK URL, then updates and verifies metadata.
Existing objects are never deleted before replacement. No site redeploy is needed.

Requires Android SDK `aapt2`, Python 3 and `SUPABASE_SERVICE_ROLE_KEY` for the
existing project, or a Supabase CLI login permitted to read its service key.
Credentials are used only for Storage requests and are never logged. Bucket
access, size and artifact-version failures stop publication before upload.

Publisher checks: `python3 -m unittest discover -s . -p 'test_publish_storage.py' -v`.

## Credit system design preview

`/credits/` serves `credits/index.html`, an interactive HTML proposal. `credits/plan.md` contains the complete product, architecture, billing-policy and migration plan, with primary sources checked on 18 September 2026. The wallet, packages, holds and pricing calculator are simulations; the page never connects to payment or account APIs. It is public and marked noindex while it remains a proposal. Reload/reset starts a new demo; this does not model granting welcome credits repeatedly to real accounts.

The static Pages build includes the entire `credits` directory. The footer links to the preview in English and Hindi. Its first-purchase, free reopen/cache restoration, changed birth data, failure release, duplicate completion, low-balance, top-up and margin-calculator flows were checked in Chrome at 320, 390, 768 and 1440 pixel widths. No billing backend or current app paywall is changed by this preview.

## Shared subpage theme

`/release/` and `/credits/` load `site-theme.css` and `site-theme.js` for the homepage's logo, typography, five palettes and `aa-theme` preference. A theme chosen on any of these pages carries across navigation. Subpage theme controls also work when browser storage is unavailable; the initial fallback follows the system light/dark preference.

Keep the palette values and theme identifiers in these shared assets aligned with `index.html`. The homepage does not load these assets. Theme switching preserves release filters and the current simulated wallet operation. The Pages build copies both assets with the rest of the static site.
