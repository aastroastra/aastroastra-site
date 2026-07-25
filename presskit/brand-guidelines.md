# AastroAstra Brand Guidelines

**Version 1.0** · July 2026
**Prepared by** The AastroAstra Team

---

## 1. Brand Identity

AastroAstra is a personal Vedic astrology companion. It turns a person's birth details into a living picture of their sky — kundali, numerology, panchang timings, and notifications written for their exact chart by an AI trained on classical texts. The identity is **warm, precise, and quietly cosmic** — traditional wisdom presented with a clean, modern hand.

### Brand Essence
- **Warm** — gold light, never cold or clinical
- **Cosmic** — the math of the heavens, made personal
- **Precise** — real charts, real calculations, no vagueness
- **Believer-first** — *"for the one who believes"*

### Tagline
> **One who believes.**

Supporting line (logo lockup): *One Place · Every Ritual · Every Solution.*

---

## 2. Logo & App Icon

The **AA monogram** is the primary brand mark — two interlocking golden A's, crowned by a sparkle and grounded by a lotus. It reads as "AastroAstra," as a temple silhouette, and as a star, all at once.

- **Mark**: `logos/aastroastra-logo-mark.png` — the monogram alone (app icon, avatars, favicons)
- **Full logo**: `logos/aastroastra-logo-full.png` — monogram + "ASTRO ASTRA" wordmark + tagline (headers, print, decks)
- **Clear space**: keep a minimum margin equal to the height of one "A" around the mark
- **Do not** stretch, rotate, recolour arbitrarily, add shadows, or place the gold mark on a busy background

### Recolouring by theme
The mark is gold by default. On monochrome (B&W) surfaces it is rendered pure:
- On **light B&W** backgrounds → solid near-black `#0A0A0A`
- On **dark B&W** backgrounds → solid white `#FFFFFF`
- On **yellow / colour** backgrounds → keep the gold gradient

---

## 3. Colour System

AastroAstra's colour system has three layers: **brand accent**, **theme surfaces**, and **planetary accents**.

### 3.1 Brand Accent — Gold

The signature accent is **Gold**, most expressive as a **yellow → orange gradient** used on headings, primary actions, and the active state of controls.

| Token | Hex | Usage |
|-------|-----|-------|
| **Gold** (light) | `#E0A015` | primary accent on white surfaces |
| **Gold** (dark) | `#F5B93A` | primary accent on dark surfaces |
| **Gradient — from** | `#FACC15` | yellow |
| **Gradient — via** | `#FB923C` | orange |
| **Gradient — to** | `#EAB308` | deep gold |

**Signature gradient:** `linear-gradient(100deg, #FACC15 0%, #FB923C 55%, #EAB308 100%)`
Use it for the display title, primary CTA fills, and the selected state of pills/toggles.

### 3.2 Theme Surfaces

AastroAstra ships **four themes** — a **Yellow** and a **Black & White** identity, each in **Light** and **Dark**. Yellow · Light is the default and canonical brand presentation.

| Theme | Background | Surface | Border | Primary Text | Muted Text | Accent |
|-------|-----------|---------|--------|--------------|-----------|--------|
| **Yellow · Light** (default) | `#FFFFFF` | `#FFFFFF` | `#ECE6D8` | `#1A1A1A` | `#8C8676` | Gold `#E0A015` + gradient |
| **B&W · Light** | `#FFFFFF` | `#FFFFFF` | `#E6E6E6` | `#0A0A0A` | `#8A8A8A` | Ink `#0A0A0A` |
| **Yellow · Dark** | `#0B0B0C` | `#151515` | `#242424` | `#F4F4F4` | `#7C7C7C` | Gold `#F5B93A` + gradient |
| **B&W · Dark** | `#0A0A0A` | `#141414` | `#262626` | `#FAFAFA` | `#7A7A7A` | White `#FAFAFA` |

The mono themes stay strictly greyscale; the yellow themes carry the gold gradient.

### 3.3 In-App Warm (Celestial) Surfaces

Inside the Android app, the default **Celestial** palette warms the neutrals for long-form reading:

| Token | Hex |
|-------|-----|
| background | `#FFFBF3` |
| card | `#FFFFFF` |
| card 2 (soft) | `#FBF4E6` |
| border | `#EDE2CE` |
| text primary | `#2A2118` |
| text muted | `#8A7A5E` |
| gold tint | `#F5B642` |
| teal (AI accent) | `#00BFA5` |
| rose (match) | `#C97B6B` |

### 3.4 Planetary Accents

Each graha has a fixed accent, used in charts, planet rows, and dasha timelines:

| Planet | Hex | Planet | Hex |
|--------|-----|--------|-----|
| Sun | `#FF6B00` | Jupiter | `#D4A050` |
| Moon | `#6B7A8E` | Venus | `#C97B6B` |
| Mars | `#DC2626` | Saturn | `#7B6FA0` |
| Mercury | `#16A34A` | Rahu | `#7A8090` |
| | | Ketu | `#8B9DAF` |

### 3.5 Status

| Token | Hex |
|-------|-----|
| success | `#16A34A` |
| error | `#DC2626` |
| warning | `#D4A050` |
| nebula (silver accent) | `#8B9DAF` |

---

## 4. Typography

| Role | Font | Notes |
|------|------|-------|
| **Display / Headings** | **Noto Serif** (700) | the title voice — "One who believes" |
| **Body / UI** | **Inter** (400–700) | everything functional |
| **Devanagari** | Noto Serif / Noto Sans Devanagari | full Hindi support |

| Style | Size | Weight |
|-------|------|--------|
| Display title | clamp 46–104px | 700 |
| Section label | 10–11px, letter-spacing .16em, UPPERCASE | 700 |
| Body | 15px | 400 |
| Caption | 12–13px | 400 |

- Headlines are Noto Serif; never set body copy in the serif.
- Tighten display tracking to `-0.03em`; keep body at `-0.01em`.

---

## 5. Visual Language

### 5.1 The Cosmos
The signature backdrop is a **locked orbital system** — faint concentric orbit rings with a soft sun and slowly drifting planets. It sits at very low alpha (very light grey on light themes, light grey on dark) and is theme-matched. Planets **highlight on hover**. It never competes with content.

### 5.2 Gradient discipline
The yellow→orange gradient is reserved for **the display title, primary CTAs, and selected control states**. Body surfaces stay flat. Never gradient large background areas.

### 5.3 Cards & pills
- **Cards**: surface fill, 1px border in the theme border colour, 14–16px radius.
- **Primary button**: solid ink (black on light, white on dark) or the gold gradient for in-app CTAs.
- **Pills / toggles**: neutral surface; **selected** state fills with the gold gradient (yellow themes) or solid tint (mono).

### 5.4 No em dashes in UI copy
Product copy avoids the "—" character; use commas, colons, or full stops.

---

## 6. Iconography

- Line icons, 1.5–2px stroke, rounded joins.
- The sparkle **✦** is the brand's utility glyph (brand mark, AI avatar, list accents).
- Planet glyphs follow the planetary accent colours in §3.4.

---

## 7. Brand Voice

| Do | Don't |
|----|-------|
| Warm, sure, respectful of tradition | Superstitious, fear-selling, vague |
| "Mars trines your Ascendant. Energy peaks Wed & Thu." | "Something big might happen soon." |
| "for the one who believes" | "guaranteed predictions" |
| Guidance and reflection | Medical / legal / financial advice |

Readings are interpretive guidance, never a substitute for professional advice.

---

## 8. Platforms

- **Android** — live beta (Kotlin, Jetpack Compose)
- **iOS** — in development
- Brand colours, gradient, and typography are identical across platforms; four themes everywhere.

---

*This document is the source of truth for AastroAstra's visual design. When in doubt, reference **Yellow · Light** with the gold gradient as the canonical brand presentation.*
