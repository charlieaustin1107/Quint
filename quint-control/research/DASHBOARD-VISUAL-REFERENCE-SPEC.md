# Quint Control — visual reference and website implementation specification

**Status:** Design specification only. Not an implementation or permission to begin a build phase.
**Reference:** Owner-provided QUINT dashboard image uploaded 21 November 2026.
**Product:** Quint Control website.
**Source of truth:** This document supplements (and does not replace) `PLAN.md`, `STATUS.md`, `protocol.md`, the Strategy Lab specification and the shared-platform research.

## 1. Owner's design direction

Use the uploaded reference as the primary visual target. The requested result is a close visual and structural recreation of its Quint aesthetic, expanded into a complete, coherent trading command platform. Do not merely create a landing page or a static screenshot. Build a working, navigable website whose screens share a consistent design system and whose data and controls are connected to the appropriate engine contracts when those phases are authorised.

The reference's defining characteristics:
- Near-black / deep midnight-navy background with subtle blue-violet gradients.
- Fine electric-violet borders, restrained purple glow, and occasional cyan/green highlights.
- Compact, high-information professional trading-terminal layout.
- Persistent narrow left navigation with Quint mark, clear active state and system/connection status.
- Dense but legible panels, thin dividers, restrained corner radii and precise spacing.
- Green for positive P&L/healthy/connected, red for loss/breach/error, amber for warning/testing, blue/cyan for neutral data and active information.
- Strong chart presence, clear numeric hierarchy, compact labels and visible timestamps.
- Futuristic visual language without sacrificing readability, usability or trust.

The image is a design reference, not a source of real prices, performance, account balances, win rates or proof of trading edge. All figures shown in the reference are illustrative. The implementation must never ship those numbers as if they were live or verified.

## 2. Non-negotiable product and engineering boundaries

1. Quint is the main operator and platform. Quint's assistant is an analysis/orchestration interface; bots remain individually named, selectable and independently evidenced strategies.
2. The website is the command and visualisation layer. The Quint Control engine inside NinjaTrader remains the execution authority.
3. Guardian checks and the single OrderRouter remain mandatory. No website component, AI response, cloud service or agent may bypass Guardian or send broker orders directly.
4. Keep one bot per account at a time, as settled in `STATUS.md`. Do not design simultaneous competing bot strategies on one account.
5. Maintain hard separation between LIVE, SIMULATION, PAPER, HISTORICAL BACKTEST and PLAYBACK. Different ledgers, account identifiers, order/fill records and visual status labels are required.
6. Per-account rules are individual: daily loss limit, max drawdown, profit target, consistency, risk budget, contract sizing, current progress and protection of accumulated profit. Never apply one account's settings to another.
7. Account-aware protection must support the owner's requirements: prioritise passing evaluation accounts; respect each account's target and loss boundary; protect accrued profit; allow only defined healthy pullbacks; reduce risk or stop new entries when the account is near a target or drawdown boundary. Never loosen hard risk limits to chase a target.
8. The site must show data state honestly: LIVE, DELAYED, DISCONNECTED, STALE or MARKET CLOSED, with source and last-update time. Never render cached data as live.
9. The website must work at desktop terminal widths and on a 390px mobile viewport. Mobile must be a real responsive layout, not a shrunken desktop screenshot.
10. No data-bento dashboard. Use purposeful full-width work areas, chart-led panels, compact tables and clearly separated sections. KPI strips are acceptable where they support the page hierarchy; do not turn every dataset into a grid of decorative tiles.
11. Respect the shared-platform research: owner and invited member have isolated users, engines, market-data entitlements, accounts, bots, AI keys, usage, journals and secrets. No cross-user account or market-feed leakage.
12. No real credentials, API keys, broker account numbers or secrets in frontend code, local storage, logs, mock fixtures or GitHub.
13. Do not add live execution, broker connections, paid API calls, market-data redistribution or deployment as part of a visual prototype.
14. Preserve the separate Chart Wizard product. Do not embed its game, interface or standalone coaching experience in Quint.

## 3. Global application shell

### Desktop shell
- Fixed left navigation rail, approximately 150–190px depending on viewport, with QUINT emblem/wordmark at top.
- Main content area fills remaining width. Use a responsive grid with a consistent spacing scale and aligned panel edges.
- Top status/header row includes current market/session state, selected workspace/account context where relevant, current time in the selected market timezone, notifications and settings/profile actions.
- Navigation items: Dashboard, Live Trading, Copy Trader, Strategy Lab, Backtesting, Forward Testing, Prop Firm Simulator, Quint Brain / AI Assistant, Reports, Settings and Alerts. Items can be regrouped only if the information architecture remains obvious.
- Persistent bottom-of-rail health area: engine status, connection status and last update. Status must be sourced from the engine/service, not hard-coded.
- Active route has a clearly visible violet highlight and accessible focus state.
- Main page header has page name, one-line purpose and relevant primary action.

### Mobile shell
- Replace the fixed desktop rail with a compact top bar and accessible bottom navigation or slide-out navigation.
- Prioritise the active task and essential risk/status indicators.
- Tables become horizontally scrollable with pinned key columns or stacked readable rows.
- Charts retain usable controls and touch targets.
- Never hide critical Guardian, connection, account mode or risk status merely to save space.

### Shared visual components
- Panel/card with subtle border and optional restrained glow; avoid excessive shadow.
- KPI value + label + comparison/time window + source/freshness.
- Status pill with text and icon/shape so colour is never the only signal.
- Compact tab bar, segmented filters, search, dropdown and date-range control.
- Sortable/filterable data table with loading, empty, error and stale states.
- Chart panel with timeframe, instrument, session and indicator controls.
- Event/activity timeline with timestamp, source, account and severity.
- Confirmation modal for consequential actions; typed confirmation for any live-account enable/disable or kill-switch reset as defined by product rules.
- Tooltips/help text for specialist trading terminology.
- Every action has disabled, loading, success and failure states.

## 4. Screen specifications

### A. Trading Command Centre (default Dashboard)

This should be the closest recreation of the reference's upper-left screen and the user's primary landing page.

**Header**
- Title: Quint Trading Command Centre.
- Subtitle: live performance and operational state, not a promise of profit.
- Market status and next session countdown only when backed by a valid session calendar.
- Selected account/workspace context and a visible mode label.

**Performance strip**
- Today's realised P&L, clearly separated from unrealised P&L.
- Win rate and sample count / period.
- Profit factor and trade count / period.
- Current drawdown against the selected account's configured limit.
- Account equity/balance with source and timestamp.
- Each metric opens a drill-down or explains its calculation. Do not show a percentage without its denominator/window.

**Main work area**
- Large live or delayed market chart (initial focus MNQ; instrument selector supports only available feed contracts).
- Chart toolbar for timeframe, session, indicators and chart display.
- Market session panel showing Asia, London, New York and other configured sessions with timezone-aware open/close and current phase.
- Market status/freshness clearly visible beside the chart.

**Lower work area**
- Top strategies/bots today: named bot, status, P&L, risk/size and link to its own page. Sortable; do not imply best performance predicts future returns.
- Account overview table: account nickname, evaluation/funded phase, balance/equity, today's P&L, target progress, drawdown buffer, per-account risk state and engine status.
- Quick actions: Start/stop eligible bot, open Strategy Lab, view account, run backtest. Disable actions when prerequisites or permissions are absent.
- Recent activity / alerts stream.

**Important:** do not use the reference's example account balances, $2,842.50 daily P&L, 72.8% win rate or any other illustrative number as a default. Use a conspicuous DEMO label and deterministic fixtures only in demo mode.

### B. Live Trading

Purpose: observe and control the currently authorised engine and account without ambiguity.

- Main chart and market status.
- Active bot name/version and strategy status.
- Account selector with account phase and mode.
- Current position: side, contracts, average entry, current price, unrealised P&L, stop, target, duration and last update.
- Working orders and execution/fill timeline.
- Bot decision log: signal, rule that triggered, rule that blocked, timestamp and data snapshot reference.
- Guardian panel: daily loss remaining, max drawdown buffer, size cap, news/session restrictions, stale-feed state, consistency/profit-protection constraints.
- Controls: pause new entries, resume (after checks), flatten/cancel only where explicitly supported by engine contract, emergency stop and account-level enablement.
- All consequential actions require clear confirmation and an audit event.
- If the engine is disconnected, show last known state as stale and disable actions that cannot be safely confirmed.

### C. Copy Trader

Purpose: configure and monitor leader/follower copying with per-account isolation.

- Leader account selector and account phase/mode.
- Follower account list with enable toggle, sizing multiplier or explicit size rule, status and individual risk state.
- Execution monitor: leader signal/order, follower acknowledgements, fill price, quantity, slippage, reject reason and sync status per account.
- Latency/health graph and event log.
- Copy mode controls (orders/fills/positions) only to the extent supported by the engine.
- Clear global pause and per-follower pause controls.
- Detect mismatched positions, rejected orders, partial fills, stale connections and duplicate commands.
- Show the no-hedging/correlated-exposure protection status.
- Enforce the settled rule: one bot per account; Manual Copy is a separate mode and cannot run alongside bots.
- Never report “synced” until actual broker/engine state confirms it.

### D. Strategy Lab

Purpose: central place to discover, define, test, compare and manage separately named bots.

**Library**
- Search, filters by market, timeframe/horizon, status, evidence level and strategy family.
- Each bot row/card: name, short description, market/timeframe, current immutable version, implementation status, validation status and evidence summary.
- Honest statuses: Idea, Draft, Specified, Validating, Backtesting, Playback, Forward Paper, Approved, Rejected, Paused. Distinguish research status from live deployment status.
- Avoid invented approval badges. Approval must reference actual evidence and human approval.

**Create strategy**
- “Describe a bot” natural-language input plus structured fields.
- Capture instrument, contract policy, timeframe, timezone/session, setup, exact entry, stop, target/exit, sizing, filters, max hold, invalidation, data requirements and account constraints.
- Save incomplete ideas as drafts.
- Quint asks only for missing decision-critical details and flags subjective/untestable phrases.
- Display the exact compiled Strategy Card and machine-readable version for owner review before any test.
- AI suggestions are proposals; they do not edit a running strategy or silently change a saved version.

**Strategy detail**
- Version history and immutable rule diff.
- Full entry/exit/risk logic in plain English.
- Parameters, supported data and limitations.
- Test history, linked evidence reports and deployment/account assignments.
- Pause/archive actions with audit history.

**Research queue and recommendations**
- Queue hypotheses, datasets and pending validation.
- Explain why a strategy is recommended, with evidence, sample size, out-of-sample results, uncertainty and caveats.
- Preserve failed and inconclusive experiments. Do not rank only by headline net profit.

### E. Backtesting & Analysis

Purpose: reproducible historical testing, not a decorative equity curve.

- Strategy/version selector.
- Instrument and contract-roll policy.
- Dataset and date range selector, with data provenance, granularity and missing-data report.
- Account profile selector (e.g. 25K/50K/100K) for rule-aware simulation; profile figures must be verified and configurable, not assumed.
- Costs: commission, exchange fees where applicable, spread and slippage assumptions, clearly displayed and saved with the run.
- Fill model and intrabar ambiguity policy.
- Chronological train/validation/untouched holdout and walk-forward configuration.
- Monte Carlo and sensitivity analysis controls.
- Results: net profit, max drawdown in dollars and percentage, profit factor, win rate, expectancy, trades, average win/loss, MAE/MFE, hold time, time-in-market and risk-limit breaches.
- Equity curve with drawdown overlay; monthly/yearly/session breakdown; long/short breakdown; distribution and trade list.
- Compare versions/baselines without cherry-picking periods.
- Immutable report: strategy hash, dataset hash, build version, configuration, costs, fill assumptions, warnings and export.
- Explicitly label exploratory tests versus validated results. No strategy becomes approved from one attractive chart.

### F. Forward Testing

Purpose: live-market observation under paper/simulation conditions with a complete event ledger.

- Select a strategy version and one or more eligible isolated simulation profiles.
- Show separate account profiles such as 25K, 50K, 100K and funded only when those profiles are configured; do not copy the example figures from the reference.
- Live feed state, source, delay and last update.
- Current paper position/orders, virtual balance/equity, realised/unrealised P&L, drawdown and risk buffer.
- Signal timeline, simulated fills, spread/slippage, commissions, stop/target changes and rejected entries.
- Performance over time and account-by-account comparison.
- Start, pause and end test actions with clear mode labels.
- A live paper run is not a broker order and must never reach the live OrderRouter.
- Stale/disconnected data pauses new simulated entries and marks the test interrupted; do not invent candles or fills.

### G. Prop Firm Simulator

Purpose: account-rule-aware evaluation and funded-stage simulation.

- Separate profile per simulated account: starting balance, target, max drawdown, daily loss limit, consistency requirement, payout/buffer rules and reset/session timezone.
- Evaluation and funded stages are distinct.
- Progress to target, remaining drawdown, daily loss used/remaining, best-day concentration, buffer and payout eligibility.
- Show how each bot's risk and sizing would interact with this account's exact settings.
- Simulate sequences and pullbacks; protect accrued gains without falsely assuming a smooth equity curve.
- Clearly label configured values, verified values and unknown values.
- Never promise passing or imply a simulated pass predicts a real pass.

### H. Quint Brain / AI Assistant

Purpose: Quint as the operator's research and decision-support interface, not a trade execution authority.

- Futuristic but restrained brain visualisation/animation in a dedicated panel, matching the purple/cyan glow of the reference.
- Conversation workspace with source-linked answers and compact evidence cards.
- Context-aware questions about selected bot, account, run, market or journal.
- Specialist research/analysis capabilities may be orchestrated by Quint, but present one coherent answer and preserve provenance.
- Quick actions: Analyse results, compare strategies, suggest a test, explain performance, run new research (only if authorised and within configured API/data limits).
- Show the evidence and uncertainty behind every recommendation.
- Quint may propose strategy changes; the owner must review and approve a new immutable version.
- Quint cannot send orders, bypass Guardian, change live risk limits, or promote a strategy automatically.
- If AI is offline, trading/risk controls continue independently and the UI clearly reports assistant unavailable.

### I. Reports

- Daily/weekly/monthly account and bot reports.
- Per-account performance, risk events, fills, slippage and copier reliability.
- Strategy validation and forward-test reports.
- Exportable, timestamped reports with mode and source labels.
- Separate LIVE, SIM, PAPER, BACKTEST and PLAYBACK data in every chart and total.

### J. Settings, onboarding and alerts

- Workspace/user profile, invited member roles and tenant isolation.
- Engine pairing/connection status and safe connection wizard.
- Market-data provider/entitlement state per user.
- AI provider/key status and per-user usage/cost caps; secrets never returned to browser.
- Account setup and firm profiles, with a visible verify/unknown state for unconfirmed rule values.
- Notification preferences and Telegram/Discord integration status where implemented.
- Alert history with severity, source, account, acknowledgement and resolution.
- Security, sessions, MFA/passkeys where supported, audit log and revoke controls.
- Setup wizard must not imply an engine/account is connected before handshake and verification complete.

## 5. Data integrity and state handling

Every displayed trading value must carry enough metadata to establish:
- User/tenant and account scope.
- Instrument/contract and currency.
- LIVE / SIM / PAPER / BACKTEST / PLAYBACK mode.
- Source/provider and feed state.
- Event timestamp and receive timestamp.
- Freshness/age and sequence where available.
- Realised versus unrealised P&L.
- Whether the value is broker-confirmed, engine-derived, simulated or estimated.

Required page states: loading, connected, stale, disconnected, market closed, empty, permission denied, partial data, error and demo. A stale value may remain visible for diagnosis only when clearly labelled stale with its timestamp.

No hard-coded green dots, “perfect sync”, “markets open”, positive P&L or running-engine claims. The UI must derive status from real protocol messages or explicitly labelled demo fixtures.

## 6. Responsive and accessibility requirements

- Design and test at 1440x900, 1024x768, 768x1024 and 390x844.
- At 390px, preserve key status, selected account/mode, risk warnings and the primary task.
- Touch targets should be comfortably usable; avoid tiny icon-only controls without labels/tooltips.
- Keyboard navigation, visible focus, semantic headings, labelled inputs and accessible chart summaries.
- Do not rely on red/green alone; include text/icon/status shape.
- Respect reduced-motion settings; brain animation and glow must not distract from data.
- Text contrast must remain readable over gradients and chart backgrounds.
- Avoid horizontal page overflow; individual data tables may scroll within their panel.

## 7. Design tokens (initial proposal)

Claude should centralise tokens rather than scatter raw colours and spacing values:
- Background: near-black navy / obsidian.
- Surface: slightly lighter blue-black.
- Elevated surface: muted midnight blue.
- Border: low-contrast blue-violet; active border brighter violet.
- Primary accent: electric violet.
- Secondary accent: cyan.
- Positive: accessible green; negative: accessible red; warning: amber; neutral: slate/blue.
- Typography: clean modern sans-serif for UI; tabular numerals for prices, P&L, quantities and timestamps.
- Use glow sparingly for selected navigation, primary actions and the brain visualisation only.
- Use a consistent spacing, radius, border and type scale; do not style each screen independently.

Exact hex values should be selected during implementation and checked for contrast. Match the uploaded reference's overall palette rather than treating any one screenshot pixel as a mandatory colour value.

## 8. Build and acceptance approach after the build gate is cleared

The website must be implemented in the existing `quint-control/web/` structure, following its README and the Quint Control skill. Do not create a second unrelated website or replace the NinjaTrader engine architecture.

Recommended implementation order after explicit authorisation:
1. Shared design system, navigation shell, responsive layout and honest connection/mode states.
2. Command Centre using the existing protocol and mock engine.
3. Accounts, Live Trading and risk/Guardian visibility.
4. Copy Trader and execution monitor.
5. Strategy Lab integrated with the existing Strategy Lab domain/protocol.
6. Backtesting and immutable evidence reports.
7. Forward Testing and paper ledger.
8. Prop Firm Simulator, Reports, Quint assistant, Settings and alerts.
9. Integration, security, accessibility, fault-state and mobile acceptance testing.

Each screen must be delivered as a working vertical slice, not a static mock. Use the mock engine only for clearly labelled demos and automated tests. Keep UI components separated from domain logic and engine transport.

### Minimum acceptance checks
- No reference-image demo numbers appear in a non-demo environment.
- All mode labels and data freshness states are correct and visible.
- Account and tenant isolation is enforced by the service/engine boundary, not merely by hidden UI controls.
- Every high-impact action is guarded, confirmed, logged and rejected safely when disconnected or unauthorised.
- No browser code can submit broker orders directly.
- Paper/backtest/playback cannot reach the live order route.
- Guardian remains mandatory for every live order path.
- Mobile and desktop layouts pass Playwright visual/interaction tests.
- Loading, empty, error, stale and disconnected states are covered.
- Existing tests pass; new tests cover every newly introduced invariant.
- No feature is described as implemented until it exists and has been tested.

## 9. Claude implementation prompt (use only after explicit build gate clearance)

You are implementing the Quint Control website in https://github.com/charlieaustin1107/Quint.

Before changing anything:
1. Read root `CLAUDE.md`, `quint-control/STATUS.md`, `quint-control/PLAN.md`, the Quint Control skill, `quint-control/web/README.md`, `quint-control/protocol.md`, this document, and the relevant domain specifications.
2. Inspect the actual current source, branches, tests and open pull requests. Do not assume this design document describes implemented functionality.
3. Confirm the owner has explicitly cleared the current HOLD/build gate and the required Fable 5.2 renewal is available. If either condition is not met, STOP after a read-only audit and report the blocker. This prompt does not itself waive the gate.
4. Preserve the architecture: NinjaTrader/Quint Engine executes; website displays and controls through the versioned protocol; Guardian is mandatory; Quint AI is not in the execution loop.
5. Build a close, high-quality visual match to the uploaded reference, expanded into the full screen set in this specification. Do not create a generic SaaS template, a static screenshot or a data-bento dashboard.
6. Implement incrementally, with tests and truthful status updates. Do not claim a screen is integrated when it is still mock-only.
7. Never publish or deploy an artifact without the owner's separate explicit instruction.

First deliverable after approval: a tested responsive application shell and Command Centre vertical slice using the mock engine and existing protocol boundary. Then proceed screen-by-screen in the order above, stopping at each safety or architecture dependency rather than inventing a workaround.

At the end of each session update `quint-control/STATUS.md` with completed work, exact tests/commands and results, blockers, branch/PR and the next precise task. Do not merge, deploy, connect brokers or enable live trading without explicit authorisation.
