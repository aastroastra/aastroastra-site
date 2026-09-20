# AastroAstra credits: product and implementation plan

Updated 20 September 2026 for Android 1.0.14 build 208. No live billing changes. The companion `/credits/` page separates current implementation from its simulated walkthrough. Action prices below are proposals, not current offers or verified supplier costs.

## Implemented in Android build 208

- Server balance and history open from Settings, AstroAI and section assistants.
- Shared refill preview grid: 100 credits / INR 100, 500 / INR 500 and 1,000 / INR 1,000. No active checkout.
- Amplitude Experiment flag `digital-credits-enabled`: on shows credits and hides the daily quota badge; off hides credits, skips new balance/quote/reservation requests and restores the existing subscription experience.
- Pending Kundali operations remain recoverable after switching off.
- Missing flag/key preserves credit beta mode. Build 208 has no deployment key, so remote control needs a configured build. Supply `amplitudeDeploymentKey` as a Gradle property, `AMPLITUDE_DEPLOYMENT_KEY` in the build environment, or `amplitude.deployment.key` in gitignored `keystore.properties`.
- Create on/off variants in the Amplitude Android client deployment. Values refresh on foreground/auth changes; failed refreshes retain the previous mode.
- Balance remains 50 because prices/enforcement are off. AI debits and real refills are pending. Server subscription and abuse limits still apply.
- Current release policy disables subscription checkout too; the mode flag does not override payment readiness.
- Before server charging launches, evaluate the same mode server-side for the authenticated account. Never trust a client flag to waive a charge.

[Build notes and checks](/release/reports/android-build-208-credits/) · [Release history](/release/).

## Product decision

Use credit packages instead of a subscription-led paywall for new customers. Target 1 credit = INR 1 of in-app spending value. Start eligible new accounts with 50 promotional credits, granted once after verified registration. Purchased credits do not expire. Welcome credits also do not expire in the initial proposal, avoiding another timer to explain. Neither balance is transferable or withdrawable; refunds follow the original payment method and applicable consumer/store rules.

Charge for a completed, requested service. Viewing owned charts, reading previous answers, opening a saved report, selecting people and deterministic calculations on owned data remain free. Every new billable AI operation needs a server quote and an eligible balance. Included AI work, such as bounded read-aloud, still requires a server allowance tied to the original paid or promotional operation. A balance check alone is insufficient: reserve credits atomically before starting paid work and capture only when its usable result is durably available.

The paywall shows 100 credits / INR 100, 500 / INR 500, and 1,000 / INR 1,000 as target Indian package prices. No invented discounts or auto-renewal. Final storefront prices, tax presentation and local-currency equivalents come from store product metadata. If a store price point differs, adjust the offered credit quantity or explicitly show the actual conversion; never claim a false 1:1 checkout rate. Any future bonus is a separately labeled promotional lot.

## One unit, explicit eligibility

The long-term product can price AI, reports, remedies and calls in the same unit. A single unrestricted pot usable for digital goods, third-party calls and physical goods is not the launch recommendation.

Start with **Digital credits** for charts, AI and digital reports. Retain existing **Services balance** for eligible live calls and physical remedies until the merchant, settlement and store arrangements are reviewed. Display both separately in the wallet and show the spendable amount for the selected action. Do not advertise the sum as universally available. Keep payment provenance and allowed service categories on every funding lot, even if the UI later becomes simpler.

| Use | Proposed funding and behavior |
| --- | --- |
| AI chat, assistant explanations, paid chart retrieval, generated reports, new palm/face analyses, digital remedy guidance | Digital credits purchased through Apple IAP / Google Play Billing in store builds; independently priced website checkout only where allowed. |
| A live call between two people, no replay | Separate eligible service checkout/balance. Price in credits for familiarity only after the provider and policy model is approved. No conversion from IAP credits into provider cash payouts. |
| Physical remedy or service outside the app | Separate eligible service checkout, with shipping, cancellation and fulfillment details. Do not use digital IAP credit lots. |
| Recorded session, downloadable report or replay bundled with a call | Classify the digital product separately. Do not assume the live-call exception covers it. |

Apple requires IAP for relevant digital unlocks, prohibits expiry of purchased IAP credits, and permits alternate payment for qualifying real-time one-to-one services. Physical goods consumed outside the app use other payment methods. Multiplatform access has conditions. [Apple App Review Guidelines, sections 3.1.1 and 3.1.3](https://developer.apple.com/app-store/review/guidelines/).

Google requires its billing system for relevant in-app digital goods/virtual currency unless a policy exception applies. Its one-to-one service exception requires two individuals and no replay in a Play app. Physical goods use other payment methods. Alternative billing programs have eligibility and integration requirements; a website APK does not exempt the Play-distributed build. [Google Payments policy](https://support.google.com/googleplay/android-developer/answer/9858738?hl=en), [Google Payments FAQ](https://support.google.com/googleplay/android-developer/answer/10281818?hl=en).

RBI defines closed-system instruments around the issuer's own goods/services and excludes third-party settlement. Therefore treating third-party astrologer payments as automatically exempt because they are called credits would be an unsupported conclusion. Determine the merchant-of-record model with the payment provider and qualified Indian counsel; use an authorized partner or direct transaction checkout if needed. This is a design dependency, not a legal classification. [RBI PPI Master Directions, section 2.1, updated 27 December 2024](https://www.rbi.org.in/Scripts/BS_ViewMasDirections.aspx?id=12156). Sources checked 18 September 2026.

## Suggested service prices

| Action | Illustrative credits | Charge boundary |
| --- | ---: | --- |
| First successful Kundali for a unique birth profile | 10 | Chart persisted, entitlement granted and debit committed together. |
| Same owned Kundali | 0 | Reopen, restore, retry, device change and cache miss all retain ownership. |
| Single-person AI answer | 2 | One complete persisted answer. Bounded context and one included voice rendering. |
| Multi-person AI answer | 3 | One answer with up to the supported person limit; show names and price before send. No per-person chart fee if already owned. |
| Assistant or Ashtakoot explanation | 1 | One newly generated explanation; reopening the saved explanation is free. |
| Palm or face reading | 10 | Complete persisted analysis; unusable/rejected photo is not charged. |
| New detailed report | 25 | Completed report and durable download. Re-download costs zero. |
| New digital remedy guidance | 5 | Saved guidance. This price excludes a physical item or live service. |
| Standalone voice / transcription beyond an included allowance | Quote first | Cap duration/characters; cached playback is free. No silent charge when auto-read runs. |
| Live call | Provider rate, e.g. 20/min | Separate eligible balance, accepted rate and duration cap. Meter actual connected time; round once on the final bill. |
| Physical remedy | Catalog quote | Eligible service checkout, separate from digital credits. |

First-session example: 50 welcome credits minus 10 for a Kundali leaves 40, enough for 20 example single-person answers. A cached chart still costs zero at zero balance. Fifty credits are face value, not necessarily INR 50 of infrastructure expense. Measure the actual promotional cost and abuse before increasing the grant.

Do not take these numbers live until supplier cost, retries, tax treatment, store fees, support/refunds and expected usage are measured. In particular, if a vendor actually charges INR 10 for one successful chart, selling that chart for 10 credits is below cost once payment deductions exist.

For an illustrative tax-inclusive price P, tax assumption t, fee assumption f applied to tax-exclusive revenue, and all-in variable cost C: net revenue = P / (1 + t) * (1 - f); contribution = net revenue - C. Break-even whole-credit price = ceil(C * (1 + t) / (1 - f)). At C=10, t=18%, f=15%, break-even is 14 credits. These are calculator inputs, not assertions about AastroAstra's actual tax or store contract. Accounting determines the actual bases, tax credits and recognition. Use p95 cost and a target contribution margin for production pricing; absorb vendor retries rather than surprising the user with a larger bill.

## The permanent Kundali promise

Ownership is a durable server entitlement, independent of a TTL cache, vendor cache, local Room/Swift cache or screenshot. Scope it to the authenticated account. A shared family account can reuse its own owned profiles; another account does not receive access to private birth data merely because inputs match.

Create a canonical `birth_identity_v1` from the normalized birth date/time/precision, resolved coordinates and historical timezone/UTC interpretation. Use an account-scoped keyed fingerprint, not a guessable global public hash. Record canonical inputs and normalization version for audit. Names, profile IDs, relationship labels, display language, North/South chart layout and theme are excluded. Renaming, duplicate profile rows, geocoder corrections without meaningful input change, and a cache eviction never create another purchase. Twins with identical canonical inputs within an account may share the chart result.

Calculation/artifact versions remain separate from the purchase identity. A maintenance update, vendor change, timezone data fix or library upgrade cannot silently rebill an owned chart. An explicit user correction to birth time/date/place can require a new chart purchase; show old versus new inputs and a new quote first. Return to an already owned revision at zero credits. Keep a conservative alias/migration map when canonicalization changes, and provide support correction when place resolution accidentally creates a different identity.

Enforce uniqueness on `(account_id, birth_identity, product_scope)` in both durable entitlements and in-flight acquisition. Concurrent requests from different devices for the same chart must coalesce even if they use different request IDs. Check ownership before balance. If owned data is missing, restore or recompute it at platform expense; do not reserve credits. If temporarily unavailable, show a recoverable error with no charge.

The successful transaction commits the result pointer, entitlement, debit and operation state atomically. A vendor result without that transaction is not a customer purchase. Pending/failed work is not owned yet. Expired holds cannot be captured by a stale worker. Financial refunds have explicit effects on ownership: a refunded purchase may revoke that entitlement under disclosed policy; a goodwill credit does not. Never revoke unrelated charts because one top-up was disputed.

Existing saved charts become grandfathered owned entitlements without debiting anyone. Keep minimal purchase evidence under an approved retention policy when users delete local copies. An explicit account/data erasure request requires a separate, clearly explained deletion policy; do not promise data recovery after permanent account erasure.

## Existing implementation to reuse

This is a repository audit, not a claim about production configuration.

| Existing source | Useful foundation / gap |
| --- | --- |
| Backend `supabase/migrations/055_wallet_ledger.sql` | Append-only wallet entries, integer paise, unique posting keys, atomic cached balance. Extend via a reviewed migration, never rename old money history into credits without provenance. |
| Backend `supabase/migrations/107_atomic_usage_reservations.sql` and `_shared/usage-reservation.ts` | Request hashes, reservation tokens, replay, in-progress and uncertain states for chat/explain/palm/face. These are daily-usage reservations, not yet monetary credit holds. |
| Backend `generate-kundali/index.ts` | Calls the vendor and inserts a result. It does not provide the required permanent purchase identity or charge-once entitlement. |
| Backend `revenuecat-webhook/`, `verify-payment/`, `razorpay-webhook/` | Existing store subscription/payment verification paths. Add verified consumable products and duplicate/refund handling; do not accept a client-supplied balance. |
| Backend `consultation/index.ts`, migrations 068/077/083 | Call/booking/remedy settlement concepts exist. Audit client-operation idempotency before reuse: a server-generated booking UUID per retry is not sufficient to deduplicate the customer's purchase. |
| Android `features/wallet/`, iOS `Features/Wallet/` | Existing balance/statement/top-up screens. Replace subscription-led sales copy with packages only after migration and server enforcement are ready. |
| iOS `Core/Subscriptions/SubscriptionService.swift` and `Shared/Components/Organisms/ProPaywallSheet.swift` | Preserve active subscriber benefits, receipt handling and restore support while introducing credits. |
| Admin usage and payment tooling | Extend with versioned prices, eligible funding lots, holds, reversals and reconciliation. Never expose a raw editable balance field. |

## Server design

Use a transactional relational ledger. Represent values as integers, for example 100 subunits = 1 credit (one subunit has INR 0.01 of target spending value); real currency amounts remain integer minor units with ISO currency and a separately recorded conversion rate. Never use floating point to authorize money movement. The UI may display whole-credit tariffs while connected-call settlement keeps precise subunits.

Proposed entities: `credit_accounts`, `credit_lots` (source transaction, paid/promo, allowed categories, remaining amount), balanced `credit_transactions` / `credit_postings`, `credit_holds` and lot allocations, `operation_quotes`, `billable_operations`, `credit_entitlements`, `store_events`, `price_versions`, `provider_usage`, `reconciliation_cases`. Keep provider cash payables and promotional marketing expense separate from customer digital-credit liabilities. A chart entitlement can exist with a zero historical purchase amount for grandfathered users.

Balance returned to clients: total eligible remaining, reserved, available, purchased and promotional breakdown. Available = eligible posted balance minus active allocations. Per-lot spend and refunds must reconcile with the immutable journal. Consume eligible promo credits before paid lots, then oldest eligible paid lots; a refund reverses the exact original allocations. No hidden expiry or loss when changing device.

### Request protocol

1. `POST /credits/quote`: server authenticates, classifies action, validates input and ownership, picks price version and returns exact maximum credits, eligible balance, expiry and any owned/free outcome. Bind quote to account, action and canonical request hash. No provider work here.
2. `POST /operations` with quote ID and a stable client operation UUID: validate quote, reject key reuse with different input, atomically reserve eligible lots, then record an outbox work item. A duplicate returns the same operation. Reject insufficient funds before provider work. Never mint balance on a client callback.
3. A fenced worker starts provider work. Persist vendor request identifiers and costs; resume/reconcile uncertain outcomes rather than launching duplicates. Validate result completeness.
4. Commit result, grant entitlement when relevant, capture at most the quoted amount and release unused hold in one transaction. Emit completion through the outbox. Client disconnect is not a refund if the complete answer is saved and accessible; say this on cancel.
5. On known failure/cancellation before completion, release the hold. On uncertainty, keep the operation pending for bounded reconciliation and show it in history. If the customer-visible timeout expires, release/refund at platform cost and fence all late completion attempts. A provider's delayed bill never justifies a second customer charge.
6. `GET /operations/{id}` and `GET /credits/statement` restore state across device/process failure. Persisted response replay, reopening results and receipt synchronization are free.

Clients never update balances, prices, hold states or entitlements. Enforce account isolation with RLS and server-only posting functions. Lock the account/lot allocation path in a consistent order. Rate limits remain an abuse/cost control alongside credits; never fall back to unlimited paid operations when pricing or ledger services are unavailable. Zero-price owned retrieval remains available where its data can be served safely.

### State and failure rules

`quoted -> reserved -> running -> succeeded/captured` or `failed/released`. `uncertain` requires reconciliation. A captured operation can only be financially changed with a linked reversal/refund entry. Terminal states and fencing tokens prevent late work from changing a refunded result.

| Event | Customer outcome |
| --- | --- |
| Double tap, same request retried, webhook redelivery | Same operation/transaction, one charge. |
| Two different requests for the same unowned chart | One acquisition, one charge, shared result for that account. |
| Same message intentionally asked again | New AI work only after the visible price is accepted; network retry stays the original operation. |
| Partial stream, malformed output, invalid photo or provider failure | No charge unless a separately quoted partial deliverable was explicitly agreed. Default: release all. |
| Price changes during work | Accepted quote stays fixed. |
| Top-up pending/cancelled | No spendable credits until server verifies completed payment. |
| Refund of unused top-up | Reverse the associated unspent paid lots via the original store/processor. |
| Chargeback after credits were spent | Reconcile and flag a separate debt/risk case, freeze new paid use if needed, preserve unrelated ownership and never silently debit another payment source. |
| Two users book the same slot | Slot uniqueness and balance reservation in one transaction; one winner. |
| Call never connects / provider no-show | Release the hold; any cancellation fee must have been disclosed separately. |
| Call runs long | Hold a disclosed maximum; show remaining funded duration and end or request explicit extension. No surprise top-up. |
| End call delivered twice | One final settlement using server-confirmed connected time, not device duration. |

## Payment and grant integrity

Verify Apple/Google transactions server-side, bind purchase to the authenticated account, product, storefront and environment, and enforce one transaction-to-credit posting globally. Acknowledge/consume using each store's required lifecycle after durable fulfillment. Process refunds and revocations through verified signed events and periodic reconciliation. Consumable store restoration alone cannot restore a spent wallet history; account login and the server ledger restore the balance and owned results.

Grant welcome credits with a database uniqueness constraint on the account/campaign, not on installation. Link sign-in identities to avoid duplicate grants when the same account changes provider. Apply proportionate signup velocity checks and limited device attestation signals, with a support path for shared family devices. Do not require invasive identity collection just for a small digital welcome grant. Promotional funds are not eligible for cash payouts or physical fulfillment unless a separately budgeted campaign explicitly allows it.

## Product flows

Wallet: Digital credits, available / reserved, add credits, history, owned Kundalis, payment issues. Show Services separately where enabled. Empty is different from balance unavailable.

Paywall: concise package cards, currency and quantity from the store, no subscription timer, clear one-time purchase and no auto-renewal. Resume the original intent after confirmed top-up, but do not silently execute a changed quote.

Chat: show `Send · 2 credits` or accepted group price next to the action. Context selection is free. Preserve the already good responses and multi-chat flow. A one-time explanation of charging on complete saved answers is enough; every message does not need a modal. A changed price or context beyond the accepted cap requires renewed consent.

Kundali: `Fetch once · 10 credits`, then `Owned · Open free`. Renaming and switching chart styles never change it. Birth-data edits show a comparison before a charge. A pending request offers Resume, not Buy again.

Reports: quote before Generate; generating status explains the temporary hold; Download and re-download remain free. A materially new report/data scope is a new explicit purchase.

History: title, people, timestamp, actual credits, pending/complete/released/refunded state and a usable receipt/reference. Expand to see the source lot and quote. Do not show raw provider stack traces.

Accessibility/localization: five app languages, Indian number/currency formatting, dynamic type, keyboard/screen-reader support, no information conveyed by color alone, and no long strings compressed into vertical badges.

## Admin and rollout

Admin: versioned price catalog with effective date, package mapping by store, grant budget, operation search, pending holds, refund reason and linked original transaction, vendor cost/margin by feature, reconciliation differences, abuse controls and audited role permissions. Adjustments require reason codes and approval thresholds; no SQL balance edits. Alert on negative reconciliation differences, stuck holds, repeated provider failures, unusual grants and cost exceeding the quote budget. Customer birth data is not needed in financial logs.

Phase 0: confirm store products, payment classifications and actual unit economics. Inventory existing paid/free promises and subscriptions. Record every paid AI endpoint, including voice, transcription, Explain, multi-chat, palm/face and reports.

Phase 1: run credit quotes and ledger calculations in shadow mode with no charges. Backfill chart ownership and reconcile existing wallet balances exactly. Add migration markers so reruns cannot grant again. Existing cash-like service funds keep their eligibility and original value.

Phase 2: internal/sandbox payments and failure injection; opt-in digital-credit pilot. Honor existing paid subscription benefits through their contracted period. Do not cancel subscriptions or reduce active entitlements automatically. Provide a disclosed migration offer without double-billing included usage. Block outdated clients from new billable writes after cutover while leaving owned reads available.

Phase 3: roll out digital credits gradually with vendor budget caps and a server kill switch. A pause stops new reservations and purchases but permits completion, releases, refunds, owned reads and restoration.

Phase 4: add service-compatible credit presentation only after call/physical-goods policy, merchant settlement and refund design are approved. Provider payouts are real financial liabilities, independent of promotional credit face value.

Release gates: concurrent spending never overdraws; duplicate request and receipt mint once; same chart across profiles/devices charges once; cache purge and vendor/version changes charge zero; changed birth data prompts; lost response recovers; stale worker cannot capture released hold; no usable result means zero debit; refund restores exact lots; pending purchase grants nothing; welcome campaign grants once; account isolation; legacy entitlements preserved; online/offline history consistent; all five languages and screen-reader flows checked; daily ledger/processor/provider reconciliation balances.

## Open decisions before implementation

Confirm measured vendor cost versus the proposed 10-credit chart price; product margin target and maximum welcome campaign cost; free features promised to existing users; exact call/remedy merchant relationship; Indian storefront product prices and tax treatment; included voice budget; cancellation/data-erasure terms; and approved subscription migration offer. These are implementation decisions, not blockers for publishing this clearly labeled design preview.
