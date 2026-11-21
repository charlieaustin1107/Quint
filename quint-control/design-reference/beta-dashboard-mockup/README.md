# Quint Beta Dashboard — isolated visual reference

**Purpose:** A lightweight, interactive, responsive visual mockup for Claude/Fable to inspect while implementing Quint Control later.

**This is not the production Quint Control website.** It is intentionally isolated from the main application and has no connection to NinjaTrader, brokers, market-data feeds, the Quint Engine, Guardian, OrderRouter, user accounts or AI services. All displayed trading data is fabricated demonstration data and is labelled DEMO.

## Open it
Open `index.html` directly in a modern browser. It is a self-contained HTML/CSS/JavaScript prototype with no package installation, build step, external assets or network calls.

## What to explore
- Five interchangeable themes: Quint Command, Quint Gold Command, Institutional, Neural and Minimal.
- Four layout presets: Command Centre, Trading Desk, Research Desk and Account Monitor.
- Navigation between the main product areas.
- Interactive chart range controls, theme/layout selectors, demo account selector, tab controls, search/filter, panel visibility, and a small strategy detail modal.
- Responsive desktop, tablet and phone layouts.
- A DEMO / NOT CONNECTED indicator is permanently visible.

## Design intent
Use the owner's uploaded purple QUINT Command Centre image as the primary visual reference. Quint Gold Command is a premium black/charcoal and restrained champagne-gold variation with the same composition and density. Theme and layout are independent: changing one must not silently change the other.

## Important limitations
- No real market prices, account balances, P&L, win rates or strategy evidence.
- Charts are illustrative SVG paths, not historical or live price series.
- Buttons demonstrate UI behaviour only; they do not start/stop bots, submit orders, copy trades or connect accounts.
- Browser-local theme/layout preference is for this mockup only.
- No authentication, backend, persistence service, permissions, security model or mobile app integration.

## Handoff
Read `CLAUDE-HANDOFF.md` before using this reference. The mockup is a visual and interaction reference only. The real build must follow the current Quint Control architecture, protocol, STATUS build gate and Fable instructions. Do not copy mock data or mistake mock controls for implemented capabilities.

## Branch
`design/quint-beta-dashboard-reference`

This branch is intentionally separate from `main`. Do not merge it as application code without owner review.
