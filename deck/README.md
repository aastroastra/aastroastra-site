# AastroAstra investor deck

## Delivery plan

Build a password-protected, presentation-first page at `/deck/` for the current
fundraising proposal. Financing terms live only inside the encrypted body.

The deck must use the existing site themes, favor numbers and diagrams over
paragraphs, and remain usable on phones, laptops, projectors and keyboards. It
will cover the problem, shipped product surface, market layers, competitive
difference, credit/call/remedy/report revenue engines, bottom-up earning
scenarios, go-to-market, 18-month milestones, use of funds, team and ask.

Market facts are dated and linked to sources. Competitor revenue is explicitly
identified as category validation, not AastroAstra traction. Financial outputs
are labeled management scenarios with visible assumptions, not forecasts. The
deck does not invent users, revenue or retention.

Because the site is static, the deck body is encrypted at rest with AES-256-GCM.
The browser derives the key from the supplied passcode using PBKDF2-SHA-256.
The passcode and plaintext deck are never committed. This protects the deck
content from ordinary page/source access, while access-link sharing and an
already-unlocked browser remain operational risks.

## Files

- `index.html`: password gate and empty presentation shell.
- `deck.css`: responsive slide, chart, product and print styles.
- `deck.js`: unlock, decrypt, navigation, progress and keyboard behavior.
- `deck.enc`: encrypted presentation body.
- `deck.pdf.enc`: encrypted, presentation-sized PDF download.
- `encrypt-deck.mjs`: local maintenance utility. It accepts an input file,
  output path and `DECK_PASSWORD` environment variable. An optional third path
  reuses another envelope's KDF parameters for files unlocked by the same key.

## Validation

Check that the wrong password never reveals content, the correct password
unlocks once per browser session, refresh keeps the unlocked session, direct
source contains no deck copy or passcode, and relocking clears the derived key.
Exercise arrow keys, page controls, links, theme changes, PDF download and print. Review at
320, 390, 768, 1440 and 1920 pixel widths. Run the existing site contract tests,
secret scan and HTML/link checks before pushing.

Sources were checked on 18 September 2026. See the final slide for the linked
source list and the deck itself for exact claim placement.

## Updating the encrypted body

Prepare the replacement body outside Git, then run:

```bash
DECK_PASSWORD='...' node deck/encrypt-deck.mjs /path/to/body.html deck/deck.enc
DECK_PASSWORD='...' node deck/encrypt-deck.mjs /path/to/deck.pdf deck/deck.pdf.enc deck/deck.enc
```

Never add the plaintext body or password to the repository.
