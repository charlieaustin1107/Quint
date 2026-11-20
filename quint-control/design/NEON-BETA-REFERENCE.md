# Quint Neon Beta UI Reference

**Status:** Approved visual direction — supplied by the project owner on 20 November 2026.

The approved reference is the user-supplied composite screenshot showing six coordinated Quint product surfaces. Preserve this visual direction when implementing the dashboard. This document records the reference and implementation intent; it does not claim that the screenshot binary is stored in this repository.

## Visual direction

- Dark near-black/navy interface with restrained neon violet/purple framing and electric-blue accents.
- Green is reserved for positive performance, healthy system state and active/approved statuses; red for drawdown, warnings and negative performance.
- Dense, professional trading-terminal layout with clear hierarchy, compact typography, thin borders and restrained glow.
- Persistent left navigation and a top market/status strip on the primary workspace.
- Avoid the previously rejected “data bento” concept. Use purposeful workspace panels and full-width analytical areas rather than decorative tile grids.

## Six reference surfaces

1. **Trading Command Centre** — live market strip, primary MNQ chart, session context, daily performance, strategy activity, account overview and quick actions.
2. **Strategy Lab** — searchable strategy library, research/testing status, strategy performance history and prop-firm account simulation summaries.
3. **Copy Trading** — leader/follower account configuration, sizing multipliers, execution monitor, sync health, latency and risk controls.
4. **Backtesting & Analysis** — strategy and account selection, historical range, walk-forward/Monte Carlo/results views, equity curve, drawdown and key findings.
5. **Forward Testing** — live simulation, separate evaluation/funded account views, progress/performance/logs, account growth and recent activity.
6. **Quint Brain** — AI research/chat workspace with contextual strategy analysis, recommendations, quick actions and a visible online/system status.

## Implementation guidance

- Treat the screenshot as a visual target, not proof that any depicted metric, strategy result, account balance, win rate or trading capability is real.
- All displayed trading figures must come from validated data or clearly labelled demo fixtures. Never copy illustrative screenshot numbers into live product state.
- Preserve the distinct workflows above; do not flatten them into one generic dashboard.
- Keep account data, market feeds, user credentials and AI/API usage isolated by user as specified in the platform architecture.
- The dashboard must remain usable at desktop widths and adapt cleanly to smaller screens without sacrificing critical risk/status information.

## Source image

The project owner supplied the composite reference image in the ChatGPT conversation on 20 November 2026. The image contains all six panels in one 1536 × 1024 composition. The binary image itself still needs to be committed under `quint-control/design/beta-mockups/` when a binary-asset upload path is available.
