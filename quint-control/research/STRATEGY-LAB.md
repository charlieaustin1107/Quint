# Quint Strategy Lab — product and engineering specification

Research date: 19 November 2026. This is a proposed feature specification, not an implementation claim.

## Product goal

Build a native Strategy Lab in Quint Control inspired by the useful public TradersPost workflow: define a strategy, configure its account/mode, send or generate typed signals, and inspect every outcome. Quint should go further by owning the strategy definition, deterministic execution logic, historical testing, live-market paper simulation, and broker-state feedback.

The user must be able to describe a bot in plain English (or submit a manual paper-trade idea), review the exact rules Quint extracted, and launch a controlled test without writing code.

## The user journey

1. **Describe** — a guided chat/form: market and contract, timeframe, session/timezone, setup, entry trigger, stop, target/exit, position sizing, maximum holding time, filters, and conditions that invalidate the idea. Allow incomplete ideas to be saved as drafts.
2. **Clarify** — Quint asks only for missing decision-critical details. It must distinguish a precise rule from subjective language ("strong momentum", "clean sweep", "good volume"). No hidden assumptions.
3. **Compile a Strategy Card** — generate a versioned, human-readable specification and a machine-readable Strategy Definition (JSON/DSL). Display every entry/exit rule, inputs, defaults, data requirements, risk boundary, and unsupported condition. User approves the spec before testing.
4. **Validate** — static checks: no look-ahead, no future data, explicit timezone/session, deterministic calculations, defined position state, stop and exit policy, supported order types, contract/tick maths, and firm/account constraints. Reject or flag rules that cannot be tested honestly.
5. **Historical backtest** — run on timestamped historical data, realistic commissions, spread/slippage, conservative intrabar fill assumptions, contract rolls, session boundaries and missing-data checks. Use chronological train/validation/untouched test segments and walk-forward evaluation. Never tune on the final holdout.
6. **Replay** — optional NinjaTrader Playback/Market Replay against historical tick/order-flow data. Record the feed type and fidelity. Playback is not the same as live execution; Playback101 fills can be synchronous and lack real network latency.
7. **Live-market paper forward test** — strategy receives the same live market feed as production, evaluates deterministically, and routes orders only to an isolated Quint virtual account or NinjaTrader Sim101. It records timestamped signals, bid/ask, decision price, simulated fills, slippage model, fees, stops, targets and every management decision. Label all results PAPER; never merge them with broker fills.
8. **Review and promote** — show pass/fail gates, drawdown, net expectancy, trade count, stability, MAE/MFE, hold time, missed/late fills, rule violations and confidence intervals. User may approve a new immutable strategy version for a further simulation stage. Live account activation remains a separate, typed-confirmation action through the existing Guardian.

## Strategy Lab screens

- **Create**: "Describe a bot" chat, structured fields, examples, save draft.
- **Strategy card**: name, version, market, timeframe, horizon, session, exact entry/exit logic, risk limits, data needs, status (Idea / Draft / Specified / Validating / Backtesting / Replay / Forward paper / Approved / Rejected / Paused).
- **Test bench**: choose dataset/date range, costs, fill model, session, contract and account simulation profile; run historical backtest or replay.
- **Live paper monitor**: feed freshness, market state, signals, virtual positions/orders, P&L, risk, stops/targets and event timeline.
- **Evidence report**: immutable run configuration, dataset hash/range, strategy version/hash, code/build version, costs, fill assumptions, metrics, equity curve, trade list, rejected signals, warnings and export.
- **Compare**: side-by-side versions and baselines, with no cherry-picked date ranges.
- **Promote**: explicit review of evidence, account compatibility and risk. No "auto-promote" from a good single session.

## Core architecture

```
User description / manual setup
        |
        v
Quint AI Strategy Interpreter (offline from execution loop)
        |
        v
Strategy Definition (versioned JSON + schema + human-readable rules)
        |
        v
Validator + deterministic compiler
        |
        +------> Historical Backtest Runner
        +------> NinjaTrader Playback Adapter
        +------> Live Market Data -> Paper Execution Simulator
        |
        v
Canonical Signal / Order / Fill / Position event model
        |
        v
Event journal + metrics + evidence report
        |
        v
Strategy Library / Compare / Promotion workflow
        |
        v
Existing Quint Guardian -> OrderRouter -> NinjaTrader (only after explicit live authorisation)
```

Keep the current NinjaTrader add-on as the execution and market-data authority. The website is the control surface. Do not add a cloud execution dependency or put an LLM in the tick-by-tick decision path. The same deterministic strategy core must be called by historical, replay, paper-forward and eventual live adapters. AI may translate the user's description, explain results and suggest experiments; it must not change a running strategy or override Guardian decisions.

## Strategy Definition contract (initial proposal)

Required top-level fields:
- `schemaVersion`, `strategyId`, `version`, `name`, `description`
- `instrument` (initially MNQ front-month mapping with explicit roll policy), `barType`, `timeframe`, `timezone`, `sessions`
- `indicators` and parameter definitions (including warm-up requirements)
- `entry.long`, `entry.short`, `exit`, `invalidation` as deterministic expression trees
- `risk.initialStop`, `risk.targets`, `risk.maxContracts`, `risk.maxDollarRisk`, `risk.maxHoldingTime`
- `management` (breakeven/trailing/partial exit only when explicitly specified)
- `filters` (volatility, trend, news, day-of-week, session)
- `execution` (order type, time-in-force, signal expiry, duplicate key, fill assumptions)
- `compatibility` (firm profile requirements, overnight/weekend eligibility)
- `provenance` (user prompt, clarification answers, approved spec hash)

Only a bounded, allow-listed expression language is executable. Never eval user-generated code or execute arbitrary AI-generated C#/JavaScript. If a rule cannot be represented safely, mark it unsupported and require a human-defined implementation before testing.

## Manual paper-trade idea mode

A second entry path lets the user describe a setup they see now: "If MNQ sweeps the London low, closes back above it on the 5m, then displaces through the last lower high, paper long with stop below the sweep and target 2R."

Quint converts this into a one-off **paper scenario** with explicit levels and confirmation rules. User reviews the levels before arming. The monitor waits for the required future events; it must not backfill a trade using information that was only known later. Record the exact chart/data snapshot and expiry. A paper scenario is not automatically a reusable bot; offer "save as strategy draft" after review.

## Test modes and separation

| Mode | Data | Orders | Purpose |
|---|---|---|---|
| Historical backtest | Stored historical bars/ticks | Simulated by deterministic fill model | Broad sample and statistical validation |
| Playback | NinjaTrader Playback/Market Replay | Playback101 / replay simulation | Tick sequence and event behaviour |
| Live paper | Current live feed | Quint virtual account or Sim101 only | Forward test under current market conditions |
| Live account | Current live feed | Real broker/prop account | Only after explicit user authorisation and Guardian checks |

Hard separation requirements:
- Separate account IDs, order IDs, journals, P&L and visual labels for PAPER and LIVE.
- Paper mode cannot call the live OrderRouter; enforce this at the type/API boundary, not only with a UI toggle.
- No live account credentials or API secrets in strategy definitions or evidence exports.
- Every paper run stores the feed source, feed delay, bid/ask availability and simulated fill model. A last-price-only feed must not be presented as bid/ask-realistic.
- Paper fills should use bid/ask side, latency delay, spread, queue/partial-fill assumptions where data supports them, and adverse slippage; publish the assumptions.
- On stale/disconnected feed, stop generating entries and flag the run as interrupted. Never fabricate candles or fills.

## Backtest integrity standard

The mandatory engineering and research controls are specified in [BACKTEST-INTEGRITY-STANDARD.md](BACKTEST-INTEGRITY-STANDARD.md). That standard is part of this Strategy Lab specification, not an optional future enhancement. It defines the data audit, event/fill model, experiment registry, chronological validation, selection-bias diagnostics, account-rule checks, tests and evidence-report UX. The older root-level `backtest/` scripts are exploratory Chart Wizard / Quint Brain tools and must not be treated as the Quint Control bot-validation engine.

## Validation and promotion gates

A strategy is not "profitable" because one backtest or one paper day is positive. Use gates configured in a versioned research policy:
- Out-of-sample net expectancy positive after actual MNQ commissions and conservative slippage.
- Sufficient independent trades and coverage across market regimes; report uncertainty and avoid claiming significance from tiny samples.
- Chronological walk-forward and untouched holdout; parameter stability and sensitivity checks.
- Monte Carlo / reshuffled trade sequence drawdown and probability of hitting account loss limits.
- Performance by year, session, long/short, volatility regime and day; concentration and tail-loss checks.
- No unhandled look-ahead, survivorship, contract-roll or intrabar ambiguity.
- Paper-forward minimum duration/trade count set before the run; compare signal price with executable simulated fill, and track missed signals and feed outages.
- Firm compatibility checked separately for each account, plan and stage; overnight/weekend permissions default to blocked when unknown.
- A strategy's approval status is version-specific. Any rule or parameter change creates a new version and invalidates prior approval.

Do not use one universal numeric threshold to approve every strategy. Define thresholds by strategy horizon and sample size, publish them before the test, and show all failures.

## MNQ research implications

MNQ is $2 per index point and its minimum tick is 0.25 points ($0.50 per contract). Use the exact account commission profile (the current Quint Control plan specifies $0.50 per side) plus explicit slippage, spread and gap assumptions. Keep costs configurable by account, but never omit them.

A 2026 preprint, "Structural Limits of OHLCV-Based Intraday Signals in MNQ Futures" (Mathias Mesfin, arXiv:2605.04004, revised 15 Sep 2026), reports that none of 14 common OHLCV signal families met its full out-of-sample criteria on 947 five-minute MNQ sessions from 2021–2025. Its reported opening-range and gap results were not stable enough to qualify. This is a warning against assuming common ORB, gap, VWAP, liquidity-sweep or candle patterns have an edge; it is not proof that every implementation fails. Reproduce independently on Quint's data before accepting or rejecting a bot.

Research priorities:
1. Reproduce the existing 20-candle breakout, New York opening-range breakout and owner 5-pillar playbook under the Strategy Lab's identical engine and cost model.
2. Falsify variants: time-of-day, volatility regime, opening range width, trend alignment, retest confirmation, VWAP location and exit management. Use pre-registered hypotheses and holdout discipline.
3. Keep strategies with weak or unstable out-of-sample results in Rejected/Research, not in the approved bot list.
4. Treat discretionary concepts such as liquidity sweeps, CISD and displacement as exact measurable definitions, not labels inferred after the event.
5. Prioritise execution realism over adding more indicators: tick data, spread, latency, partial fills, stop slippage, roll and session transitions.

## TradersPost patterns to adopt — and where Quint should improve

Public TradersPost documentation supports strategy definitions, per-account subscriptions, JSON signals/webhooks, paper and live connections, and a Command Pad for manually sending preconfigured signals. Its docs also warn about overlapping-signal race conditions and state that it does not currently expose broker order IDs, position state or account data back into external strategy logic. Quint should adopt the clear workflow and per-account settings, but improve it with an integrated strategy engine and verified NinjaTrader order/position reconciliation.

Useful public references:
- TradersPost getting started: https://docs.traderspost.io/docs
- Strategies: https://docs.traderspost.io/docs/core-concepts/strategies
- Signals: https://docs.traderspost.io/docs/core-concepts/signals
- Command Pad: https://docs.traderspost.io/docs/core-concepts/command-pad
- FAQ / paper support: https://docs.traderspost.io/docs/additional-information/faq
- NinjaTrader Strategy Analyzer: https://ninjatrader.com/support/helpGuides/nt8/strategy_analyzer.htm
- NinjaTrader Playback: https://static.ninjatrader.com/support/helpGuides/nt8/playback.htm
- NinjaTrader historical fill processing: https://ninjatrader.com/support/helpGuides/nt8/backtest_a_strategy.htm
- TradingView paper trading: https://www.tradingview.com/support/solutions/43000516466-paper-trading-main-functionality/
- CME MNQ contract specifications: https://www.cmegroup.com/markets/equities/nasdaq/micro-e-mini-nasdaq-100.contractSpecs.html
- Mesfin (2026), MNQ OHLCV falsification preprint: https://arxiv.org/abs/2605.04004

## Phased implementation recommendation

This is a major capability, not a quick chat widget. Preserve the existing phase order and add it incrementally:
- **Phase 3A — Strategy Definition and manual paper scenarios:** schema, interpreter output, validation, draft library and review UI. No orders.
- **Phase 3B — Historical test harness:** run definitions through the same deterministic core, generate immutable evidence reports and golden fixtures.
- **Phase 3C — Live paper adapter:** subscribe to NinjaTrader live market data, simulate orders in an isolated paper ledger, display feed health and decisions. No live OrderRouter access.
- **Phase 3D — Playback parity and fault tests:** compare replay, backtest and paper decisions on shared fixtures; inject disconnects, stale data, partial fills and restarts.
- **Phase 3E — Promotion controls:** strategy-version approval, account compatibility and existing typed Go Live workflow. Live mode remains behind Guardian.

## Acceptance criteria

- User can describe a simple supported bot in plain English and inspect/edit the exact generated rules.
- Unsupported or ambiguous rules are surfaced; none are silently guessed.
- One strategy version produces matching decisions across reference tests, historical engine and NinjaTrader self-tests on identical inputs.
- Historical report includes costs, out-of-sample and walk-forward results, data provenance and trade-level exports.
- Live paper test receives fresh market data and generates only isolated virtual orders; it cannot reach live OrderRouter by construction.
- Website shows each signal, decision, virtual order, fill, stop/target update and exit with timestamps and reasons.
- Feed loss, restart, duplicate events and strategy exceptions are visible and fail safe.
- Tests cover the mobile website and desktop website; paper/live labels are unmistakable.
- No strategy is marked Approved from a single session or an in-sample-only result.
