# Quint Neural Terminal — visual and UX direction

Status: approved design direction from the owner, 20 November 2026.
Scope: Quint Brain first. Keep Chart Wizard visually related, but do not redesign it in this phase.
Implementation owner: Claude Code / Fable. ChatGPT research/review. This document is the source of truth for this visual upgrade.

## Product vision

Quint should feel like a premium AI trading command centre: a quiet, precise trading instrument wrapped around a distinctive 3D computer that represents Quint's brain. It must look futuristic and memorable without sacrificing speed, legibility, trust, or phone usability.

The owner explicitly requested a dark theme with turquoise accents and a 3D computer as Quint's brain. This supersedes the older "no blue" restriction only to the extent needed for restrained turquoise/teal accents. Keep the true-black foundation.

## Visual language

- Base: OLED black `#000000`; raised surfaces `#080b0b`, `#0d1212`; hairline borders `rgba(160,220,215,.13)`.
- Primary accent: luminous turquoise/teal `#35e0cf` or a similarly restrained green-blue hue. Use it for active navigation, AI-core energy, focus states and selected data — not every border or every label.
- Trading semantics remain unambiguous: mint/teal = positive/buy, rose = negative/sell, amber = warning/risk. Do not use turquoise to disguise a sell, warning, or stale-data state.
- Text: high-contrast warm white for primary content, muted grey for metadata. Maintain the existing Chakra Petch / IBM Plex Sans / Martian Mono typography unless testing proves a better choice.
- Surfaces: layered black glass, subtle inner highlights, restrained blur, fine separators, selective edge lighting. Avoid generic blue-purple cyberpunk gradients, excessive glow, noisy grids, and overuse of glassmorphism.
- Motion: purposeful and calm. Short transitions, spring-like panel movement only where it helps orientation, no constant movement behind dense data. Respect `prefers-reduced-motion`.

## Quint Brain — signature 3D computer

Replace/upgrade the current visual treatment of the brain area into a recognisable futuristic computer/core — a compact, premium, dark-metal machine containing a luminous turquoise neural processor.

The object should read as a computer, not just a floating orb:
- A dimensional chassis / monolithic workstation silhouette with a visible front face, bevels, vents or fine ports, and a central transparent window.
- Inside: a living neural core made from a small number of connected nodes, filaments and a slow energy pulse. Turquoise light is concentrated inside the machine.
- Small, legible status readouts around or within the object: MARKET FEED, ANALYSIS, STRATEGY, RISK / GUARDIAN. These must reflect real application state; never fake "live" status.
- Interaction: gentle pointer/touch parallax, tap to focus/expand, and optional rotation only when the user engages. The core can change state from the existing Quint state (idle, analysing, bullish, bearish, warning, disconnected). Do not invent a trading signal from an animation.
- The 3D computer is a visual representation of Quint's analysis, not a source of market truth and not an autonomous execution control.

## Dashboard information architecture

Keep the primary workflow obvious:
1. Top command bar: Quint identity, selected market (MNQ), connection/data freshness, session, settings.
2. Hero area: 3D computer/core with concise current state and last update.
3. Market strip: current price, change, session context, key levels / volatility.
4. Main work area: five-pillar checklist, strategy matrix, live analysis and conversation.
5. Secondary views: performance record, alerts, strategy lab/backtesting and settings.

Use progressive disclosure: show the most important decision information first; keep advanced diagnostics available without crowding the main screen. The user must always be able to distinguish live, cached, simulated and unavailable data.

## UX and responsiveness

- Design phone-first at 390×844, then verify tablet and desktop. The owner currently works from an iPhone.
- Minimum touch targets 44×44 px; form text at least 16 px; safe-area insets; no horizontal scrolling.
- Desktop can expand into a multi-column command centre, but mobile must not become a shrunk desktop grid.
- Charts and numeric values remain more visually prominent than decoration. Keep labels concise and plain-English.
- Every tab, button and interactive surface must have a clear action, pressed/focus state and accessible label.
- Preserve existing app behaviours, market data calls, five-pillar logic, strategy matrix, records, alerts, chat, voice and TradingView call-budget rules.

## Motion and performance

Preferred implementation order:
1. First explore a CSS 3D / Canvas / WebGL enhancement that fits the existing single-file HTML app and its build pipeline.
2. Use Three.js only if a small isolated prototype demonstrates a meaningful visual gain and passes mobile performance tests. Do not introduce React, React Three Fiber, a bundler, or a large dependency tree into Quint Brain just for the hero scene.
3. The 3D scene must lazy-start when visible, pause when hidden/backgrounded, cap device pixel ratio, avoid unnecessary per-frame React/DOM work, and provide a static/CSS fallback if WebGL is unavailable.
4. Test on iPhone-sized viewport and throttled/low-power conditions. Target smooth interaction (ideally 60fps on capable devices) without sacrificing the responsiveness of charts, chat or controls.
5. Respect reduced motion, provide a low-motion/static mode, and never make the whole dashboard wait for the 3D scene to load.

## Product modules / "plugins" to make Quint feel complete

Build these as integrated, state-backed modules rather than decorative mock widgets:
- **Neural Core** — the 3D computer and truthful system-state visualisation.
- **Market Pulse** — price, session, feed freshness and volatility at a glance.
- **Strategy Dock** — strategy status, timeframe, backtest evidence and paper/live mode clearly separated.
- **Risk Guardian** — drawdown / daily loss / kill-switch state, prominent warnings and explicit execution permission.
- **Performance Vault** — trades, win rate, profit factor, expectancy, drawdown and out-of-sample results.
- **Command Palette** — fast search/navigation and key actions, keyboard accessible on desktop and touch-friendly on mobile.
- **Activity Stream** — concise event log for feed updates, analyses, strategy tests and alerts.

Do not create fake broker connections, fake market data, fake performance numbers, or live-order controls in Quint Brain. Live execution remains in Quint Control and must preserve its confirmation and Guardian safeguards.

## Implementation sequence

Phase 1 — Design foundation:
- Add shared visual tokens to Quint Brain source only.
- Build the computer/core visual prototype and fallback.
- Refresh the command bar, active navigation, cards and key states using the new tokens.
- Do not hand-edit generated `index.html`; edit `quint-brain/src/` and run the documented build.

Phase 2 — Interaction polish:
- Add deliberate transitions, focus/pressed states, command palette and responsive layout refinements.
- Connect visual state to existing real state only.

Phase 3 — Validation:
- Run the existing Quint Brain Playwright suites listed in `CLAUDE.md`.
- Add tests for the 3D core states, no-WebGL fallback, reduced motion, touch interaction, 390×844 layout and no horizontal overflow.
- Inspect phone screenshots; report test results and any remaining limitations.

## Acceptance criteria

- The result is unmistakably Quint: black, restrained turquoise, premium and technically confident.
- The brain is recognisably a 3D computer with a neural core, not a generic glowing sphere.
- Existing trading functionality and data integrity are unchanged.
- Mobile is genuinely usable at 390×844; no clipped controls or horizontal scrolling.
- Reduced-motion and no-WebGL fallbacks work.
- No invented live state, performance, broker connection or signal.
- Existing automated tests pass; new visual/interaction tests are added.
- No new dependency is added without documenting why it is needed, its licence, bundle cost and fallback.
