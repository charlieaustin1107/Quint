---
name: quint-design
description: The Obsidian & chrome (black) design system and phone-first rules for Chart Wizard and Quint Brain pages, plus how to change, build, test and publish them. Use for any visual, layout, page or UI change in this repo, together with the frontend-design skill.
---

# Designing pages for Chart Wizard and Quint Brain

The owner uses **only an iPhone**. Every screen is designed at 390×844 first, then checked wider. Plain English everywhere.

## The look: Obsidian & chrome (shared by both apps; the owner asked for black, not blue)
- **True black** `#000` is the base, like an OLED screen switched off. Raised surfaces are only a shade lighter (`#050505`–`#141414`) for hierarchy; never a navy or tinted near-black.
- **No blue or violet anywhere.** Where accents are needed, use white and **liquid chrome** silver (`--chrome`: a white → light grey → mid grey → light grey gradient), with black text on chrome buttons.
- **Colour only means something**: mint `#2fd9a8` = buy/up, rose `#ff4f6e` = sell/down, amber `#ffb547` = warning or the VWAP line. Nothing else is coloured.
- **Crisp, not glowing**: hairlines in `rgba(255,255,255,.09)` (half a pixel on Retina), an inner top highlight on cards, white corner brackets fading to grey. No text glow, no colour haze, no background grid.
- Type: **Chakra Petch** (display labels), **Martian Mono** (prices and numbers), **IBM Plex Sans** (body). Loaded from Google Fonts with system fallbacks.
- **Bold in two places only**: the lit chrome **Quint core** (`qcDraw` in `chart-wizard/src/quint.js`) and the **price landscape** of real MNQ closes behind the main market card (`chart-wizard/src/land.js`). Everything else stays quiet.
- Tokens live in `:root` of `chart-wizard/src/head.html` and `quint-brain/src/head.html`; the last "OBSIDIAN & CHROME" block in each file is the finish layer. Chart canvases read their colours from these tokens, so keep them 6-digit hex.

## Phone rules
- Tap targets ≥ 44 px; inputs at 16 px so iOS doesn't zoom; respect `env(safe-area-inset-*)`.
- No horizontal page scroll; grids use `minmax(0, 1fr)`; long text ellipsises.
- Charts inside scrolling sheets use `touch-action: pan-y` in cursor mode so the page still scrolls; drawing modes take `none`.
- Respect `prefers-reduced-motion` for every animation.
- Use the frontend-design skill for direction, but stay inside this system: the two apps must feel like one product. Never bring blue back.

## Building (never hand-edit a built `index.html`)
- Chart Wizard: `cd chart-wizard/src && python3 build.py && python3 build.py --prod`. Script order is in `build.py`.
- Quint Brain reuses Chart Wizard functions: after changing `dock.js`, `live.js`, `quint.js`, `qlab.js` or `pillars.js`, run `cd quint-brain/src && python3 extract.py "$(cat roots.txt)" "$(cat mine.txt)" && python3 patch.py && python3 build.py && python3 build.py --prod`. New shared functions must be added to `roots.txt`.
- Add test hooks to `window.__T` (Chart Wizard, `start.js`) or `window.__Q` (Quint Brain, `build.py`).

## Testing and checking
Playwright tests with mocked `window.claude` (never spend real calls). Run the list in CLAUDE.md, confirm `errs` is empty, and **look at the phone screenshots** they save in `/tmp`. For new UI, write a test that takes a 390×844 screenshot and asserts the behaviour (see the webapp-testing skill for patterns).

## Publishing
Publish the built `index.html` to the matching artifact after reading the live version first, so a newer version is never overwritten. Both artifacts are private to the owner.
