---
name: quint-design
description: The Neon HUD design system and phone-first rules for Chart Wizard and Quint Brain pages, plus how to change, build, test and publish them. Use for any visual, layout, page or UI change in this repo, together with the frontend-design skill.
---

# Designing pages for Chart Wizard and Quint Brain

The owner uses **only an iPhone**. Every screen is designed at 390×844 first, then checked wider. Plain English everywhere.

## The look: Neon HUD (shared by both apps)
- Void-black glass: backgrounds `#02040a` → panels `#070c18`, cards are translucent gradients with hairline borders `rgba(41,216,255,.14–.2)` and **corner brackets** (cyan top-left, violet bottom-right).
- Wiring: electric cyan `#29d8ff` and violet `#9b6bff`. Mint `#2fd9a8` = buy/up, rose `#ff4f6e` = sell/down, amber `#ffb547` = warning.
- Type: **Chakra Petch** (display, letter-spaced uppercase labels), **Martian Mono** (every price and number), **IBM Plex Sans** (body). Loaded from Google Fonts with system fallbacks.
- Glow is for meaning (live, selected, the latest price), not decoration everywhere.
- Tokens live in `:root` of `chart-wizard/src/head.html` (`--acc`, `--acc2`, `--up`, `--down`, …) and `quint-brain/src/head.html` (`--amber` is Quint Brain's cyan, `--violet`). Chart canvases read their colours from these tokens, so keep them 6-digit hex.

## Phone rules
- Tap targets ≥ 44 px; inputs at 16 px so iOS doesn't zoom; respect `env(safe-area-inset-*)`.
- No horizontal page scroll; grids use `minmax(0, 1fr)`; long text ellipsises.
- Charts inside scrolling sheets use `touch-action: pan-y` in cursor mode so the page still scrolls; drawing modes take `none`.
- Respect `prefers-reduced-motion` for every animation.
- Use the frontend-design skill for direction, but stay inside this system: the two apps must feel like one product.

## Building (never hand-edit a built `index.html`)
- Chart Wizard: `cd chart-wizard/src && python3 build.py && python3 build.py --prod`. Script order is in `build.py`.
- Quint Brain reuses Chart Wizard functions: after changing `dock.js`, `live.js`, `quint.js`, `qlab.js` or `pillars.js`, run `cd quint-brain/src && python3 extract.py "$(cat roots.txt)" "$(cat mine.txt)" && python3 patch.py && python3 build.py && python3 build.py --prod`. New shared functions must be added to `roots.txt`.
- Add test hooks to `window.__T` (Chart Wizard, `start.js`) or `window.__Q` (Quint Brain, `build.py`).

## Testing and checking
Playwright tests with mocked `window.claude` (never spend real calls). Run the list in CLAUDE.md, confirm `errs` is empty, and **look at the phone screenshots** they save in `/tmp`. For new UI, write a test that takes a 390×844 screenshot and asserts the behaviour (see the webapp-testing skill for patterns).

## Publishing
Publish the built `index.html` to the matching artifact after reading the live version first, so a newer version is never overwritten. Both artifacts are private to the owner.
