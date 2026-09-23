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

- Every branch push is delivered through a signed GitHub webhook to the existing `parity-push` backend. Only repository, branch, commit IDs/titles, date and changed paths are retained; author data, commit bodies and source code are discarded. HMAC-SHA256 verification is required before any write.
- The page reads the live push feed every minute. New main changes invalidate affected reviewed areas; incomplete history, a new unmapped source file or a changed manifest is conservatively marked for review. Other branches remain separate previews.
- The public site workflow rebuilds full main source snapshots every 15 minutes and on site/data-branch pushes. It uses the existing read credential. This independent path works when private-repository Actions are blocked by billing.
- The app's manual Functionality differences workflow can additionally generate/publish a complete snapshot when private runners are available. It pins an immutable public toolkit commit and uses a dedicated site-only SSH deploy key. It does not run automatically while private Actions cannot start.
- `differences-data` preserves optional full snapshots and their Git history. Concurrent publication retries; an older job cannot replace a newer source head. Failed reconciliations retain prior evidence and show a warning.
- GitHub webhook delivery failures are visible in repository Settings > Webhooks; redeliver failed events there. Scheduled main reconciliation still recovers source truth. Rotate `PARITY_PUSH_WEBHOOK_SECRET` in Supabase and both hook configurations together. Never put secrets in a manifest, page or log.
- This is eventual publication: live push metadata appears after delivery/page refresh; full reviewed notes follow the next site rebuild. The page shows both compared source and latest received push.
- Run targeted app regression tests separately. Neither a push hook nor the snapshot generator certifies app behavior. Before release, review gaps/stale areas and verify the exact published binaries on real devices.

## Invariants

Deterministic astrology facts, numeric scores, rule versions, confidence bands, classical sources, wallet charging/recovery, account isolation, consent and request language must retain their shared contracts. AI may phrase facts, not invent calculations. Platform parity work must not weaken these rules.
