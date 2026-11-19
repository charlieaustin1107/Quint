# MNQ Strategy Research Programme

Status: Research only — no strategy approved for live trading
Owner: Quint project
Branch: research/mnq-strategy-programme
Created: 2026-11-19

## Objective

Build a repeatable, evidence-led research pipeline for Micro E-mini Nasdaq-100 (MNQ) strategies across three holding horizons:
- Scalping: seconds to minutes; requires tick or high-resolution data and realistic execution simulation.
- Intraday: minutes to hours; flatten before the session cutoff where required by the account.
- Swing/position: overnight to multi-day or multi-week holds; must model overnight gaps, margin, funding/broker requirements, contract rolls, and prop-firm restrictions. Monthly is a research horizon, not a promise of suitability for a funded intraday account.

No strategy is called profitable until it passes preregistered out-of-sample tests after all costs and survives forward simulation.

## Initial evidence and implications

1. A 2026 MNQ preprint evaluated 14 OHLCV signal families on 947 five-minute trading days (2021–2025), including opening-range breakouts, gaps, volume, cross-session momentum, liquidity grabs and volatility-conditioned signals. Its abstract reports that none met all stringent out-of-sample criteria after a two-point round-trip friction assumption. This is a preprint, not peer-reviewed; reproduce independently rather than treating it as definitive.
   - https://arxiv.org/abs/2605.04004
   - https://doi.org/10.48550/arXiv.2605.04004
2. A peer-reviewed 2022 study of intraday momentum found that an overnight-return signal predicting the final half-hour did not persist out of sample, with results varying by regime. This supports regime-aware validation, not blind replication.
   - https://doi.org/10.1002/fut.22375
3. CME's MNQ contract multiplier is $2 per index point and minimum tick is 0.25 points ($0.50 per tick). Validate all P&L, sizing and cost conversions against current official contract specifications.
   - https://www.cmegroup.com/markets/equities/nasdaq/micro-e-mini-nasdaq-100.contractSpecs.html
   - https://www.cmegroup.com/markets/equities/sp-500-and-nasdaq-100-futures.html

## Existing Quint findings to preserve

Previously inspected report findings (recheck source branch/file before relying on these numbers):
- 20-candle 15-minute breakout: 185 trades, PF 1.27, +$6,401 net; first half -$420, second half +$6,821; best day contributed about 45% of total profit.
- NY open 15-minute breakout: 52 trades, PF 1.21, +$1,529 net; first half -$462, second half +$1,991; best day contributed more than total profit.
- Five-pillar liquidity/CISD/displacement/pullback playbook: zero trades in four weeks; final target-room filter rejected all six pullback-confirmed setups.
Interpretation: these are exploratory results, not evidence of robust profitability. Small samples, regime dependence and concentration are major concerns. Reproduce from source data before making decisions.

## Research tracks and falsifiable hypotheses

### A. Scalping (tick / 1-second / 5-second / 30-second)
1. VWAP deviation fade: fade statistically unusual deviations only when volatility and trend filters indicate rotation; test 0.5/1/1.5 standard-deviation bands, time stops and turnover limits.
2. Liquidity sweep + displacement + retest: define swing levels mechanically; require a sweep, close back through level, displacement threshold and retest; compare close-confirmed versus intrabar entries.
3. Opening auction microstructure: opening range expansion, pullback and continuation; compare 1/5/15-minute opening ranges and volume/volatility filters.
4. Short-horizon momentum: test breakout continuation only after spread/volatility and volume confirmation; compare marketable limit versus next-bar execution.
5. Scalping must include bid/ask spread, queue/partial fills where data permits, commissions, exchange fees, slippage, latency, stop-market gap risk and rejected orders. OHLC bars alone cannot resolve all intrabar stop/target ordering.

### B. Intraday (5-minute to 60-minute)
1. Opening-range breakout: 5/15/30-minute range, close-confirmation, retest, volatility-normalised stop and session cutoff.
2. Overnight range / gap: classify gap size and overnight trend; test continuation and fade as separate hypotheses, with no lookahead.
3. VWAP reclaim / rejection: session VWAP and bands; distinguish trend-day continuation from range-day mean reversion using only information available at decision time.
4. Trend pullback: higher-timeframe direction plus pullback to a pre-defined moving average or structure level; compare fixed and volatility-scaled exits.
5. News/volatility regime: exclude or separately model scheduled high-impact releases; never infer future news labels from timestamps unavailable at entry.

### C. Swing / multi-day / monthly research
1. Daily trend-following: 20/50/100-day trend filters, ATR-based risk and trailing exits; evaluate long and short independently.
2. Weekly breakout: prior-week high/low breakout with close confirmation and volatility filter.
3. Multi-day pullback: daily trend + retracement + re-acceleration; compare fixed holding periods and ATR exits.
4. Overnight gap risk: simulate gaps through stops, session closures, margin changes and forced liquidation. Do not assume a stop fills at its trigger.
5. Contract roll: use correctly adjusted continuous data for research, then verify signals and execution on actual quarterly contracts; avoid artificial roll jumps.
6. Account compatibility: a multi-day hold may be incompatible with a prop firm's intraday drawdown, news, overnight or flat-by-close rules. Treat this as a hard eligibility gate, not a strategy parameter.

## Data and validation standard

- Prefer CME-quality tick/trade and bid/ask data for scalping; 1-minute or 5-minute bars are insufficient for fill-accurate scalping claims.
- Record source, timezone, session template, DST handling, missing bars, contract month, roll dates and adjustment method.
- Use chronological train / validation / untouched test splits and expanding or rolling walk-forward tests. Never randomly shuffle time series.
- Freeze hypotheses, parameter grids, filters and metrics before each experiment. Log every tested variant to expose multiple-testing risk.
- Model commissions, exchange/clearing fees, spread, slippage, market impact, partial fills, rejected orders and stop gaps. Stress costs above the base estimate.
- Report net expectancy in points and dollars, profit factor, win rate, average win/loss, max drawdown, time under water, Sharpe/Sortino where appropriate, trades per day/week, exposure, turnover, long/short splits, year/regime splits and confidence intervals.
- Run ablations, parameter-neighbourhood stability, best-day/top-1%-trade removal, placebo/permutation tests and bootstrap confidence intervals.
- Compare against buy/hold where relevant, simple trend and mean-reversion baselines, and a no-trade baseline.
- Require adequate sample size per fold. A high PF on a tiny sample is not approval.
- Promote through statuses: Idea → Specified → Implemented → In-sample → Walk-forward → Untouched holdout → Paper-forward → Approved. Any failure returns to Research or Rejected.

## Bot development principles

- Strategy logic must be pure/deterministic and separated from NinjaTrader, Tradovate, UI and broker adapters.
- One canonical signal definition must be shared by research, backtest and live engine. Create golden test cases to prove Python/JS/C# parity where applicable.
- Use event-driven order state: Submitted → Accepted → Working → PartFilled → Filled / CancelPending → Cancelled / Rejected. Reconcile broker state after reconnect; never assume a request succeeded.
- Enforce single order gateway and Guardian checks for every order, modify, cancel and flatten. No direct bypasses.
- Hard controls: max contracts, max daily loss, max trailing drawdown buffer, max trades/orders per minute, max consecutive losses, max position time, session/news blocks, duplicate-signal protection, stale-data detection, disconnect kill switch and manual flatten.
- Start simulation-only. Require explicit user action to enable live trading; default to one MNQ contract or less where allowed. Never auto-promote a strategy to live.
- Log every input, signal, decision, risk check, order event, fill, fee and exit with UTC and exchange-local timestamps.
- Include fault-injection tests for disconnects, stale quotes, partial fills, rejected orders, duplicate events, delayed acknowledgements and restart/reconciliation.
- Do not modify Quint Control's Guardian, order router or live execution path as part of strategy research without a separate reviewed change.

## First experiment queue (priority order)

1. Reproduce the existing breakout results on the same data and fees; add per-year, per-regime, long/short, best-day and top-1%-trade concentration analysis.
2. Re-run ORB 5/15/30-minute variants with a preregistered small parameter grid and walk-forward holdouts.
3. Inspect the six near-miss five-pillar setups; diagnose whether the target-room filter is structurally too restrictive. Do not loosen it without a written hypothesis and separate test.
4. Build a VWAP rotation-vs-trend classifier and compare fade/reclaim variants after cost stress.
5. Start daily swing baseline tests (20/50/100-day trend and weekly breakout) to establish whether longer horizons survive costs and overnight risk.
6. Establish a common cost configuration and source of truth. Existing project notes have referenced different commission/slippage assumptions; reconcile actual Lucid/Tradovate/NinjaTrader costs before comparing strategies.

## Claude handoff protocol

Claude is the implementation partner when the user runs Claude Code/Fable with repository access. ChatGPT cannot silently message Claude or run a shared Claude session. Use the daily handoff prompt below in Claude Code; Claude must return a review and proposed patch/PR, not push directly to main.

### Daily Claude prompt

Read `CLAUDE.md`, `quint-control/CLAUDE.md` if present, this research programme and all relevant backtest reports before editing. Act as a skeptical quantitative researcher and senior trading-systems engineer.

1. Identify the next highest-value experiment from the queue; do not repeat a completed experiment.
2. State the hypothesis, exact signal/entry/exit rules, timeframe, session, data granularity, cost assumptions and preregistered parameter grid before coding.
3. Audit data integrity, DST, contract rolls, lookahead, repainting, intrabar fill ambiguity and account-rule compatibility.
4. Implement only in a separate research branch. Keep strategy research isolated from Quint Control's Guardian, order router and live execution.
5. Add deterministic unit tests, golden examples and machine-readable trade/event logs. Run the full relevant test suite three times; report exact commands and results. Never claim a test was run if it was not.
6. Evaluate chronologically with walk-forward and untouched holdout data; include cost stress, long/short, year/regime, best-day removal, parameter stability, ablations and confidence intervals.
7. If results fail, document the negative result and why. Do not tune repeatedly against the holdout.
8. Return: plain-English findings, metrics table, data limitations, changed files, test results, risks, and a small reviewable PR. Never merge to main or enable live trading.
9. Save the next handoff note in `research/mnq/DAILY-LOG.md` and update the experiment registry only when evidence supports the change.

## Decision rule

A strategy is not "profitable" because its backtest is green. It remains a candidate until independently reproducible, net of realistic costs, stable across untouched periods and regimes, and paper-forward tested under the exact intended account rules.
