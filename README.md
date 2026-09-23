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

`/deck/` serves the private investor presentation. Its body is committed only as an AES-256-GCM encrypted payload, and the passcode is never stored in the repository. The browser derives a key with PBKDF2-SHA-256 and keeps the exported session key only in `sessionStorage` until the viewer locks the deck or closes the tab. `deck/README.md` records the content, source and maintenance contract. Market facts are dated and sourced; revenue scenarios are explicitly labeled as management assumptions rather than traction or forecasts.

Keep the palette values and theme identifiers in these shared assets aligned with `index.html`. The homepage does not load these assets. Theme switching preserves release filters and the current simulated wallet operation. The Pages build copies both assets with the rest of the static site.

`/ownapi/` serves a private, encrypted API-replacement plan with shared themes,
endpoint pricing search and adjustable cost/token calculators. It does not
implement or enable a replacement calculation API. Plaintext source and the
password are kept outside this public repository. See `ownapi/README.md`.

## Living functionality comparison

`/differences/` compares 40 reviewed feature contracts across iOS and Android;
`/differences/data.json` is the same public-safe JSON feed. `/diffrecnes/` redirects
to the canonical page. It uses the shared five-theme design and distinguishes
source alignment, known gaps, intentional native differences and pending reviews.

Read [shared parity rules](differences/PARITY_RULES.md) and
[automation maintenance](parity-tools/README.md). Source manifests live in each
app at `.parity/features.json`. Push workflows pin this repository's toolkit,
publish to `differences-data` with a dedicated deploy key, and trigger Pages.
The existing scheduled site workflow also reconciles both main branches with
`RELEASE_SOURCE_TOKEN`; failed reconciliation is visible and retains old evidence.
Commit/feature summaries are public; source links require private-repository access.
