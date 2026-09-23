# Private own API plan

This directory contains the public password gate and encrypted report only.
Plaintext research and the report generator live outside this repository in
`AstroAstra/ownapi-planning/`, outside `workspace/`.
Never copy the private planning directory or its password into the site.

Encryption follows the existing deck format: PBKDF2-SHA-256, 310,000 iterations,
random 16-byte salt, AES-256-GCM, random 12-byte nonce, 128-bit authentication tag.
The high-entropy shared password is held outside git. No key/password/plaintext is
persisted in browser storage. Refresh, navigation away, or Lock clears the view.
The static ciphertext is publicly retrievable and permits offline password guesses;
use a generated strong password and share only with intended readers. This is not
individual account authentication. Authorized readers can save/print the report.

Tests: `node --test ownapi/test_ownapi.mjs`. Browser checks include wrong/correct
passwords, refresh/lock, search filters, calculator arithmetic, five shared themes,
keyboard labels and mobile overflow. All sensitive report details are encrypted.
Use the private rebuild script to edit/re-encrypt. Do not edit ciphertext by hand.
