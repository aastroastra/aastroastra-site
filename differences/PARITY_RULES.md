# Shared iOS and Android functionality rules

Canonical rules: https://github.com/aastroastra/aastroastra-site/blob/main/differences/PARITY_RULES.md
Live comparison: https://www.aastroastra.com/differences/
Machine-readable endpoint: https://www.aastroastra.com/differences/data.json

## One feature contract

1. Before changing user-visible behavior, inspect the corresponding feature on BOTH platforms. Follow the expected behavior in the shared catalog. Neither platform is automatically correct.
2. Use the same feature ID in both `.parity/features.json` manifests. A new feature requires a catalog entry and records on both platforms, including an explicit gap on the unfinished side.
3. Record what the user can actually do, the difference, the next action, validation evidence and source paths. Mention gates, stubs and unreachable screens. Never equate file existence, a commit title or a build passing with a working end-to-end feature.
4. If only one side changes, record the outstanding counterpart work. Do not call the pair aligned until its behavior has been compared. Native permissions, billing sheets, accessibility wrapping and OS integrations can be intentional differences, with a reason.
5. Source support, test results and a published binary are separate facts. A push does not publish an app. Link release evidence separately.

## Update the review with the code

- Map every implementation and relevant shared dependency in `paths`; globs include newly added matching files. The generator hashes committed Git blobs and paths, so changed, added, renamed and removed files invalidate old reviews.
- Stage/commit implementation first. After inspecting the diff and its counterpart, run the central toolkit's `stamp` command for ONLY the feature IDs actually reviewed. Commit the manifest update in the same push. Never bulk-refresh fingerprints to make warnings disappear.
- Example from an app checkout with a sibling site checkout:
  `python3 ../aastroastra-site/parity-tools/parity.py stamp --features chat-group chat-questions`
- Validate: `python3 ../aastroastra-site/parity-tools/parity.py snapshot --out /tmp/parity-review.json` after the manifest is committed.
- `assessment` is `aligned`, `gap`, `intentional` or `review`. Unverified equivalence is `review`. Validation text must state exactly which tests/device checks ran; do not present planned tests as passed.
- Changes to shared networking, calculation rules, theme, localization or navigation require checking downstream affected features, even when their direct files did not change. Include those dependencies in feature mappings as the audit expands.
- A stale fingerprint automatically produces “needs review”. The previous written assessment remains visible for context and is explicitly labelled stale. Automation never silently marks it aligned or edits app code.
- Unmapped source paths appear in the dashboard review queue. Map them to a real feature instead of suppressing them. Broad infrastructure mappings are coverage hints, not a functionality sign-off.

## Push and release workflow

- Every branch push in either app generates evidence and publishes a sanitized snapshot. `main` updates the main comparison; other branches only update the branch-preview feed. Pull requests validate and retain an artifact without publishing or accessing the deployment key.
- Source workflows pin an immutable site-toolkit commit. Update both callers together when the schema/toolkit changes.
- Site publication uses a dedicated write deploy key limited to the site repository. Never embed a token/key in JSON, HTML, source, logs or commit messages. No source code bodies or personal data are published.
- `differences-data` is automation-owned. Concurrent pushes retry; an older source job cannot replace a newer source head. Failed publication fails the check and retains the artifact.
- Pages deploys after snapshot pushes. A 15-minute scheduled main reconciliation is the fallback if an event is missed. This is eventual publication, not a synchronous guarantee at `git push` return.
- Do not treat a green snapshot workflow as a green app regression suite. Run the targeted feature tests and applicable cross-platform fixtures separately before pushing.
- Before release, review all known gaps and stale features, record accepted intentional differences, and verify the exact published binaries on real devices.

## Invariants

Deterministic astrology facts, numeric scores, rule versions, confidence bands, classical sources, wallet charging/recovery, account isolation, consent and request language must retain their shared contracts. AI may phrase facts, not invent calculations. Platform parity work must not weaken these rules.
