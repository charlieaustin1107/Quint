# Claude / Fable handoff — Quint Beta Dashboard reference

This folder contains an isolated visual prototype requested by the owner. It exists to give Claude/Fable a concrete design and interaction reference when the actual Quint Control website build is authorised.

## First instruction
Open and inspect `index.html` in a browser. Explore all five themes, all four layout presets, each navigation area, chart controls, account selector, strategy modal, panel toggles and mobile breakpoints. Treat this as a visual reference and interaction sketch, not production source.

## Owner's direction
- Closely follow the uploaded purple/neon Quint Command Centre reference.
- Add a fifth option, **Quint Gold Command**, with a premium black/charcoal base and restrained metallic/champagne-gold accents. Keep the composition and density similar to Quint Command.
- Provide five selectable looks: Quint Command, Quint Gold Command, Institutional, Neural and Minimal.
- Provide four separate layout presets: Command Centre, Trading Desk, Research Desk and Account Monitor.
- Themes and layouts are independent. Switching themes must not reset the chosen layout.
- Make the beta responsive and interactive, with a strong desktop terminal experience and a usable phone layout.
- Keep the first version simple: a coherent starting point for Fable, not a complete trading product.

## Do not infer production functionality
Everything in the mockup is fabricated demo data. It is not connected to a market feed, account, strategy runtime, NinjaTrader, broker, Guardian, OrderRouter, copier or AI. Do not claim any demo value is live or verified. Do not turn mock click handlers into broker actions.

## When implementing the real Quint Control website
1. Respect `quint-control/STATUS.md` and its HOLD/build gate. This mockup does not waive Fable 5.2 renewal or the owner's separate explicit clearance.
2. Read `CLAUDE.md`, `.claude/skills/quint-control/SKILL.md`, `quint-control/README.md`, `quint-control/PLAN.md`, `quint-control/protocol.md`, and the current web/domain specs.
3. Inspect current branches, PRs, source, tests and engine contracts before coding.
4. Recreate/adapt the design inside the approved `quint-control/web/` architecture; do not move this standalone mockup into the production runtime by default.
5. NinjaTrader/Quint Engine remains execution authority. Guardian and the single OrderRouter remain mandatory. Quint Brain is decision support, not an order route.
6. Keep LIVE, SIM, PAPER, BACKTEST and PLAYBACK ledgers separate; enforce account/tenant isolation server-side.
7. Clearly show data source, mode and freshness. Never render stale/demo data as live.
8. Test desktop and mobile, accessibility, theme contrast, loading/error/stale/disconnected states and all interactions.
9. Keep this design-reference folder isolated unless the owner explicitly asks to merge or promote it.

## Reference file
`index.html` — self-contained interactive mockup. No dependencies or build step.
