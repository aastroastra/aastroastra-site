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
reconciliation. Fork PRs never access publishing credentials.

Source push workflows call `.github/workflows/parity-snapshot.yml` pinned to a
commit. Snapshot generation occurs on every branch push and PR. Only pushes publish.
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
