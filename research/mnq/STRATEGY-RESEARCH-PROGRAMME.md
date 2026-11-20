# MNQ Strategy Research Programme

Status: Research only — no strategy approved for live trading
Owner: Quint project
Branch: research/mnq-strategy-programme
Created: 2026-11-19
Priority decision: Research all horizons equally; support both automated and signal-assisted/manual-approval modes.

## Objective

Build a repeatable, evidence-led research pipeline for Micro E-mini Nasdaq-100 (MNQ) strategies across three holding horizons:
- Scalping: seconds to minutes; requires tick or high-resolution data and realistic execution simulation.
- Intraday: minutes to hours; flatten before the session cutoff where required by the account.
- Swing/position: overnight to multi-day or multi-week holds; must model overnight gaps, margin, funding/broker requirements, contract rolls, and prop-firm restrictions. Monthly is a research horizon, not a promise of suitability for a funded intraday account.

All strategy families and holding horizons have equal research priority at the discovery stage. No horizon is assumed superior in advance. Rank candidates later using comparable evidence: net expectancy after costs, robustness, drawdown, sample size, operational complexity and account compatibility.

Quint must support two distinct operating modes:
1. **Automated mode:** the strategy can generate and manage orders automatically, subject to the same Guardian, risk limits, account eligibility checks and explicit live-mode authorisation.
2. **Signal-assisted mode:** the strategy generates entries, exits, risk levels and rationale for the user to review; orders are not sent until the user explicitly approves them. Manual approval must not bypass Guardian checks.

A strategy may be eligible for one mode and not the other. A multi-day strategy, for example, may be useful for research and alerts but incompatible with a particular intraday funded account's overnight restrictions.

No strategy is called profitable until it passes preregistered out-of-sample tests after all costs and survives forward simulation.

## Research priority framework

Research the following tracks in parallel, using a rotating experiment schedule so no single style dominates simply because its data is easier to obtain:

| Track | Horizons | Initial candidates | Special requirements |
|---|---|---|---|
| Scalping | Seconds to minutes | VWAP deviation, liquidity sweep/retest, opening microstructure, short-term momentum | Tick/trade and bid/ask data; fill/queue modelling |
| Intraday | Minutes to hours | ORB, overnight range/gap, VWAP reclaim/rejection, trend pullback | Session/DST correctness; intraday account rules |
| Swing | Days to weeks | Daily trend, weekly breakout, multi-day pullback | Overnight gaps, margin and roll modelling |
| Monthly/position | Weeks to months | Long-horizon trend and regime filters | Contract rolls, drawdown duration, capital/margin and overnight eligibility |

Do not select a "winner" by comparing raw profit across different holding periods or datasets. Use horizon-appropriate metrics and report risk, exposure and capital requirements.

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

## Balanced trade management: protect capital without premature exits

Quint bots must be disciplined, not timid. They must respect hard risk limits while allowing a valid, tested setup enough room and time to play out. Do not make bots exit early simply because price briefly moves against the position, an indicator flickers, or an AI model expresses uncertainty.

### Separate hard safety from normal strategy decisions
- **Hard safety exits** always take priority: protective stop reached, account loss/drawdown limit, invalid position/order state, loss of reliable market data or connection, broker/firm restriction, or another explicitly defined emergency condition.
- **Normal trade management** follows that bot's pre-tested rules. A normal pullback, temporary adverse candle or short-lived volatility spike is not by itself an exit signal unless the strategy specification says it is.
- A safety cap is not a profit-taking signal. Do not use the account's daily loss limit, a conservative risk budget or a generic fear threshold to close a trade that remains valid and is still within its planned risk.
- Never widen the initial stop, exceed the approved risk budget, average down or add exposure unless a separately tested and authorised rule explicitly permits it.

### Give each strategy room to work
- Before entry, define the setup's invalidation level, initial stop, target(s), expected holding horizon, maximum holding time and permitted management actions.
- Use stop placement suited to the strategy and market structure (for example, swing structure or volatility/ATR), not an arbitrary tiny stop that causes routine market noise to close trades.
- Use a declared confirmation rule for reversals or invalidation. Avoid exiting on one unconfirmed lower-timeframe candle when the strategy is based on a higher timeframe.
- Use hysteresis / persistence rules where appropriate: a regime or trend change may need a defined close, threshold or number of bars to confirm. These rules must be fixed and tested, not improvised after entry.
- Do not move a stop to breakeven or trail it too early by default. Each bot must test when trailing or breakeven improves net expectancy versus letting the original trade plan work.
- Partial profit-taking, target ladders, time stops and early exits must each have explicit conditions and separate test evidence. If no exit condition has fired, the default is to hold the position and continue monitoring.
- A strategy's confidence score may control whether a new trade is eligible or how much risk is allocated within strict caps; it must not silently override stops, targets or turn into a vague reason to exit an open trade.

### Measure whether management is too tight or too loose
Backtests must record exit reason and compare baseline exits against alternatives: stop/target, structure invalidation, volatility stop, time stop, trailing activation and partial exits. Report premature-exit rate (where price later reaches the original target before the original stop within the declared evaluation window), missed target movement, average favourable/adverse excursion, average hold time, net expectancy, drawdown and tail loss. Avoid hindsight-based labels and use only data available at the decision time. Evaluate each bot and timeframe separately, walk-forward and on untouched data.

### Decision hierarchy
1. Exchange/broker/firm emergency and account-level hard limits.
2. Confirmed protective stop / predefined maximum-risk boundary.
3. Strategy-specific confirmed invalidation or exit condition.
4. Strategy-specific profit target, trailing or time exit.
5. Otherwise hold, monitor and log the reason for no change.

AI may explain the decision or flag a possible issue, but it cannot invent discretionary exits or loosen hard controls. The strategy must be able to continue managing a valid position deterministically if the AI service is unavailable.

## Data and validation standard

- Prefer CME-quality tick/trade and bid/ask data for scalping; 1-minute or 5-minute bars are insufficient for fill-accurate scalping claims.
- Record source, timezone, session template, DST handling, missing bars, contract month, roll dates and adjustment method.
- **Contract-roll gate (20 Nov 2026):** preserve every raw MNQ expiry contract and its instrument ID; record the mapping decision and the exact information-availability timestamp; use only prior completed volume or actually published OI for dynamic rolls; never simulate fills or realised P&L on back-adjusted continuous prices. See `research/mnq/2026-11-20-contract-roll-integrity.md`.
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
- Each strategy should expose a common interface for: market-data requirements, signal generation, proposed entry/stop/target, time stop, sizing constraints, invalidation, session eligibility and explanation.
- The same strategy engine must support two modes:
  - **Signal-assisted:** publish a proposed trade with entry/stop/target, risk in dollars, setup rationale, invalidation and expiry. Require explicit user approval before order submission.
  - **Automated:** permit the engine to submit/manage orders only after account eligibility, strategy status, risk checks and explicit live authorisation pass.
- Keep mode selection visible per bot and per account. Never let a strategy silently switch from signal-assisted to automated mode.
- Both modes use the same Guardian and single OrderRouter. Manual approval is an additional gate, never a risk-control bypass.
- Use event-driven order state: Submitted → Accepted → Working → PartFilled → Filled / CancelPending → Cancelled / Rejected. Reconcile broker state after reconnect; never assume a request succeeded.
- Enforce single order gateway and Guardian checks for every order, modify, cancel and flatten. No direct bypasses.
- Hard controls: max contracts, max daily loss, max trailing drawdown buffer, max trades/orders per minute, max consecutive losses, max position time, session/news blocks, duplicate-signal protection, stale-data detection, disconnect kill switch and manual flatten.
- Start simulation-only. Require explicit user action to enable live trading; default to one MNQ contract or less where allowed. Never auto-promote a strategy to live.
- Log every input, signal, decision, risk check, order event, fill, fee and exit with UTC and exchange-local timestamps.
- Include fault-injection tests for disconnects, stale quotes, partial fills, rejected orders, duplicate events, delayed acknowledgements and restart/reconciliation.
- Do not modify Quint Control's Guardian, order router or live execution path as part of strategy research without a separate reviewed change.

## Longer-horizon position supervision and protection

For swing, multi-day and monthly/position strategies, a trade must never be left unmanaged merely because its entry signal has passed. Every position requires a complete, pre-trade risk plan and ongoing deterministic supervision.

### Mandatory protection before entry
- Define the initial hard stop-loss, profit target or explicit exit rule, maximum dollar risk, position size, maximum holding period and thesis-invalidation conditions before submitting an entry.
- Calculate size from the stop distance, MNQ point/tick value, verified fees and a conservative slippage/gap allowance. Reject the trade if minimum size would exceed the risk budget.
- Attach broker/platform-held protective stop and target orders where supported, verify acceptance and quantity against the actual filled position, and reconcile after partial fills, reconnects and restarts. If protection cannot be confirmed, block new entries and execute the configured safe response.
- Stops are hard risk boundaries, not suggestions. Never widen a stop or increase the original maximum risk automatically. Any permitted stop adjustment must be rule-based and may only reduce risk (for example, trail closer or move to breakeven after a pre-defined condition).
- A target may be reduced or an exit brought forward under pre-defined rules; extending a target or increasing exposure requires a separately specified, tested rule and must never silently increase risk.

### Continuous chart and position analysis
- Monitor fresh market data continuously while a position is open, but do not call an LLM on every tick. Use deterministic, event-driven calculations for price, volatility, trend, structure, spread, session state, open risk, stop/target distance and data freshness.
- Reassess on each completed bar at the strategy's declared analysis timeframe and on material events: volatility/regime change, structural break, target/stop approach, scheduled news window, session transition, contract roll, data disconnect or account-rule change.
- A slower-horizon bot must use its intended higher-timeframe context (for example, daily/weekly structure) while still monitoring lower-timeframe risk and execution conditions. Never let noisy lower-timeframe movement override the strategy's declared rules.
- Each reassessment must produce a logged decision: hold, reduce, exit, trail stop, take profit, or no change, with timestamp, data snapshot, rule/reason and resulting order state.
- AI may explain, compare scenarios or propose a change, but must not be the sole real-time risk controller. Execution decisions and protective boundaries must remain deterministic, testable and available without an AI/API connection.

### Failure and overnight controls
- Detect stale/missing data, lost broker connection, rejected or cancelled protection, position/order mismatch and restart/reconnect discrepancies. Alert and invoke the pre-defined safe response; never assume a stop is working just because it was submitted.
- Model gaps through stops, partial fills, slippage, exchange closures, margin changes and forced liquidation. A stop price is not a guaranteed fill price.
- Before entry, check that the specific account and firm permit the intended overnight/weekend hold, product, news exposure and drawdown treatment. If not eligible, reject the trade or require a valid flat-by deadline.
- Test all of the above with historical replay, simulated execution, fault injection and forward paper trading before any live approval.

## First experiment queue (balanced across horizons)

Run these as a portfolio of research tracks, not a claim that all can be implemented simultaneously. Rotate between tracks and prioritise shared infrastructure when it unlocks multiple experiments.

1. **Common research foundation:** audit existing MNQ datasets, contract rolls, session/DST handling and the true fee/slippage schedule. Define common result schemas so horizons can be compared honestly.
2. **Scalping baseline:** assess availability of tick and bid/ask data; if unavailable, document the limitation and do not make fill-accurate claims from OHLC bars.
3. **Intraday baseline:** reproduce existing breakout results on the same data and fees; add per-year, per-regime, long/short, best-day and top-1%-trade concentration analysis.
4. **Swing/monthly baseline:** test daily 20/50/100-day trend and prior-week breakout with overnight gap, roll and margin assumptions.
5. **ORB variants:** re-run 5/15/30-minute opening ranges with a preregistered small parameter grid and walk-forward holdouts.
6. **Liquidity playbook:** inspect the six near-miss five-pillar setups; diagnose whether target-room filtering is structurally too restrictive. Do not loosen it without a written hypothesis and separate test.
7. **VWAP family:** build a rotation-vs-trend classifier and compare fade/reclaim variants after cost stress.
8. **Mode parity:** design one signal contract that can power both signal-assisted recommendations and automated execution; test that both modes produce identical strategy signals and risk calculations before order-routing differences.
9. **Cost source of truth:** reconcile actual Lucid/Tradovate/NinjaTrader commissions, exchange fees and slippage assumptions before comparing results.

## Claude handoff protocol

Claude is the implementation partner when the user runs Claude Code/Fable with repository access. ChatGPT cannot silently message Claude or run a shared Claude session. Use the daily handoff prompt below in Claude Code; Claude must return a review and proposed patch/PR, not push directly to main.

### Daily Claude prompt

Read `CLAUDE.md`, `quint-control/CLAUDE.md` if present, this research programme and all relevant backtest reports before editing. Act as a skeptical quantitative researcher and senior trading-systems engineer.

1. Identify the next highest-value experiment from the balanced queue; rotate across scalping, intraday and swing/monthly tracks and avoid repeating completed work.
2. State the hypothesis, exact signal/entry/exit rules, timeframe, session, data granularity, cost assumptions and preregistered parameter grid before coding.
3. Audit data integrity, DST, contract rolls, lookahead, repainting, intrabar fill ambiguity and account-rule compatibility.
4. Where relevant, define how the strategy supports both signal-assisted and automated modes. The signal, proposed risk and invalidation logic must be shared; automated order submission must have additional explicit authorisation and Guardian checks.
5. Implement only in a separate research branch. Keep strategy research isolated from Quint Control's Guardian, order router and live execution.
6. Add deterministic unit tests, golden examples and machine-readable trade/event logs. Run the full relevant test suite three times; report exact commands and results. Never claim a test was run if it was not.
7. Evaluate chronologically with walk-forward and untouched holdout data; include cost stress, long/short, year/regime, best-day removal, parameter stability, ablations and confidence intervals.
8. If results fail, document the negative result and why. Do not tune repeatedly against the holdout.
9. Return: plain-English findings, metrics table, data limitations, changed files, test results, risks, and a small reviewable PR. Never merge to main or enable live trading.
10. Save the next handoff note in `research/mnq/DAILY-LOG.md` and update the experiment registry only when evidence supports the change.

## Decision rule

A strategy is not "profitable" because its backtest is green. It remains a candidate until independently reproducible, net of realistic costs, stable across untouched periods and regimes, and paper-forward tested under the exact intended account rules.
