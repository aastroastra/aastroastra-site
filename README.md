# AastroAstra — landing site

Static single-page marketing site (black & white). Hosted on GitHub Pages.
The Android beta APK + version.json live in Supabase Storage (public `site`
bucket); this page links to the stable APK URL and reads `version.json` for the
displayed version. Running "release apk" re-uploads the APK + version.json, so
the download is always the latest with no site redeploy.
