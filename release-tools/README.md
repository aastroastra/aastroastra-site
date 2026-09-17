# Release history

`https://www.aastroastra.com/release/` is the public release archive for Android,
iOS, backend, admin, web and the website. It has no password gate.

Each source repository has a `release.yml` caller triggered by `v*` and
`release-*` tags. It calls `project-release.yml` at a pinned toolkit commit.
Manual runs take an existing tag and check out that exact source commit.
Version/build numbers come from that source. Notes include the Git commits
since the previous reachable release tag.

The workflow retains:

- `release.json`, including the source SHA, build, checks and artifact hashes.
- `release-report.zip`, a permanent HTML report on the source GitHub Release.
- Validated signed APK/IPA downloads, only when required checks pass.
- Private Actions logs, Android mapping/AAB and Xcode results for 90 days.

Failed or interrupted validation is reported as failed or incomplete. The
report is published before the final job gate returns failure. A missing
signing secret never becomes a passing release. Store submission is separate
from tag validation. The Play workflow is manual; a tag does not submit to Play.

## Checks

Android runs localization, unit tests, release lint, a signed APK/AAB build,
signature/production flag checks, the screen regression on that exact signed
APK, and endpoint probes. The CI APK includes arm64 and x86_64 for both physical
devices and the emulator. Authentication screenshots are removed from public
reports. Original screens/logs remain in the private source Actions artifact.
The existing visual Android report lives in
`aastroastra-android/scripts/regression/report-template.html`.

iOS runs the unit and UI test targets on an available iPhone simulator and
exports an ad-hoc IPA when distribution signing is configured. The profile
must contain registered devices and match the archived bundle. Build numbers
are never replaced with the Actions run number. Direct iPhone installation is
limited to devices in the provisioning profile. App Store IPAs are not offered
as directly installable downloads.

Backend uses the commands checked into its security regression workflow.
Admin runs role checks, TypeScript and a production build. Web runs its
production build. Website runs publisher and release-hub contract tests.

## Central collection and Pages

`release-hub.yml` runs on website main pushes, manually, and every 15 minutes
(GitHub scheduled runs can be delayed). It collects source GitHub Releases,
validates the tag SHA and manifest, verifies report/download hashes, and
mirrors installers to public website GitHub Release assets. Installer names
contain the tag and content hash and are never overwritten. Private repository
URLs are provided for authorized source reviewers; public downloads and HTML
reports do not require a GitHub login.

HTML reports and the release index persist on the separate `release-data`
branch. `build_site.py` merges those records with historical data, then deploys
the website using GitHub Pages Actions. One unavailable repository preserves
all existing valid history and produces a visible sync warning. Mirror tags
start with `mirror-`, so they cannot trigger another source release.

Configure GitHub Pages to **GitHub Actions**. The website repository needs:

- `RELEASE_SOURCE_TOKEN`: credential able to read releases and tags in the six
  source repositories. Prefer a dedicated token with only repository contents
  read access. It is used only by the central website workflow.
- Its normal `GITHUB_TOKEN` with contents write, Pages write and OIDC permissions.

Source repositories use their own `GITHUB_TOKEN` with contents write. Android
also needs `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`,
`ANDROID_KEY_ALIAS`, and `ANDROID_KEY_PASSWORD`. QA login can be configured with
`QA_PHONE`, `QA_OTP`, `QA_API_PHONE`, and `QA_API_OTP`; these must be dedicated test
accounts on the configured backend. Release builds always disable OTP bypass.

iOS needs `SUPABASE_HOST`, `SUPABASE_ANON_KEY`,
`APPLE_CERTIFICATE_P12_BASE64`, `APPLE_CERTIFICATE_PASSWORD`,
`APPLE_ADHOC_PROFILE_BASE64`, and `APPLE_TEAM_ID`. The P12 must contain only the
intended distribution identity. Secrets stay in encrypted GitHub settings.

GitHub account billing/spending restrictions can stop private-repository jobs
before they begin. Those jobs cannot produce regression evidence until the
account restriction is resolved. Workflow configuration does not imply that a
blocked workflow has run.

## Historical backfill and local verification

`backfill_history.py <workspace>` imports mobile version changes and daily
source history for services/web. Those entries are explicitly labeled source
history, never deployed releases. `import_published.py` retains the existing
public app downloads with hashes and reads iOS versions from the IPA itself.
Historical downloads without exact-source test evidence stay unverified.

```sh
python3 -m unittest discover -s release-tools -p 'test_*.py'
python3 -m unittest discover -s . -p 'test_publish_storage.py'
node --test test_auth_link.mjs
python3 release-tools/build_site.py --data _release-data --out _site
python3 -m http.server 8765 --directory _site
```

To add another product, extend the platform/repository registry and its check
runner, add a pinned tag workflow in that repository, grant the central read
credential access, and add its filter to the release page.
