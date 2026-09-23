# Functionality evidence pipeline

`parity.py` reads only committed Git trees and the platform's `.parity/features.json`.
It validates the shared feature catalog, hashes path/blob pairs, and records source
commit links. There is no model call, source upload or code interpretation in CI.

Human assessment is deliberately separate from automatic freshness. Changed blobs
or matched file additions/removals invalidate an assessment. A feature can remain a
known gap while also requiring review. Broad shared dependencies need deliberate
mapping; the tool cannot infer semantic dependencies or discover all missing features.

## Local commands

From this repository:

```
python3 -m unittest discover -s parity-tools -p 'test_*.py'
node --test differences/test_diff.mjs
python3 parity-tools/parity.py snapshot --repo ../aastroastra-ios --out /tmp/ios.json
python3 parity-tools/parity.py build --data /path/to/differences-data --out /tmp/site/differences
```

To renew an assessment, inspect source and counterpart, update behavior/difference/
validation, commit implementation, then `stamp --repo ../aastroastra-ios --features
chat-group`. Commit the manifest too. Never mass-stamp unreviewed features.

## Credentials and publication

A dedicated site-repository write deploy key is registered with GitHub; its private
key lives only in `PARITY_SITE_DEPLOY_KEY` in the two app repositories. It can write
the site, not the app repositories or unrelated repositories. Rotate by replacing
the site deploy key and both source secrets. No personal access token is replicated.
`RELEASE_SOURCE_TOKEN` already in the site is used read-only for scheduled source
reconciliation. Pull requests do not receive publishing credentials.

Manual source workflows call `.github/workflows/parity-snapshot.yml` pinned to a
commit. The optional manual workflow generates complete snapshots. Automatic push updates
use the signed webhook described below while private Actions are unavailable.
Main snapshots live at `snapshots/ios.json` and `snapshots/android.json` on the
`differences-data` branch; preview snapshots use hashed branch filenames. That
branch's Git history retains old snapshots beyond the 90-day Actions artifacts.

Site `release-hub.yml` handles main and data-branch pushes and the existing
15-minute schedule. Its source checkout explicitly uses main, so an older copy of
the website on the data branch cannot replace the current site. Update the workflow
copy on differences-data if changing its trigger/deployment contract later.
Scheduled reconciliation regenerates missing/outdated main evidence for deployment;
push snapshots remain the durable history. A source failure surfaces in the page
and workflow, and the prior snapshot remains available.

Concurrency is retry-based. Publisher re-fetches the data branch and refuses to
publish an old source head if the source branch has advanced. Branch previews never
replace main. Deleted branches remain historical previews until pruned from the data
branch. The page labels them latest recorded pushes, not currently open branches.

A schema/catalog change requires both platform manifests and pinned workflow refs
updated together. Validate both locally before pushing; temporarily stale/missing
records must show review status, never false alignment. Deploying this site does not
publish mobile apps. See `/release/` for released build evidence.

## Active push path after private Actions billing failure

Private app Actions currently refuse to start because of GitHub account billing.
The active every-push path is therefore the signed `parity-push` webhook in the
backend. Hooks on both app repositories POST each branch push there. Sanitized
immutable records live under the existing public site bucket's
`differences-pushes/` prefix, keyed by push time and payload hash. Replays reuse
the key. GET on the function exposes the last 100 records; older records remain
in Storage. No GitHub personal token is held by this function.

The page overlays changed-file freshness immediately and shows the last main
snapshot alongside the latest received push. Unknown/truncated commit chains
mark all areas for review. Main reconciliation on the public site continues every
15 minutes. Manual source snapshot workflows remain available once runners can
start, and the original deploy-key infrastructure is retained for that path.

The webhook code/tests live in `aastroastra-backend/supabase/functions/parity-push/`
and `tests/parity_push_test.ts`. Its only additional secret is
`PARITY_PUSH_WEBHOOK_SECRET`, also configured in the two GitHub hook settings.
Update that secret and both hooks together when rotating. Delivery errors need
GitHub redelivery; scheduled source reconciliation is an independent fallback.
The live JSON endpoint is
`https://gttszlununmqivrqevwv.supabase.co/functions/v1/parity-push`.
