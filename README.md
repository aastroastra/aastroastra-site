# AastroAstra: landing site

Static single-page marketing site (black & white). Hosted on GitHub Pages.
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
