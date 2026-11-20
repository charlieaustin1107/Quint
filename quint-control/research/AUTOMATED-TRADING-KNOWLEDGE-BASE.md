# Automated Trading Research & Engineering Knowledge Base

**Status:** Living research reference for Claude Code/Fable and Quint contributors  
**Last reviewed:** 20 November 2026  
**Scope:** MNQ/NQ strategy research, systematic futures methods, automated-bot architecture and validation

This document is the durable synthesis layer for important findings. Dated experiments and unproven hypotheses belong in `research/mnq/notes/` and research PRs. Promote only reviewed, decision-useful findings here. This file is not evidence that any strategy is profitable or approved for live trading.

## 1. Executive conclusions

1. **No MNQ strategy in Quint is currently established as live-ready.** Existing green backtests are exploratory and have meaningful sample, regime, concentration, data and execution limitations.
2. **The strongest broad-horizon academic candidate is time-series momentum/trend following.** Published research documents return persistence over roughly 1–12 months across 58 liquid futures, but this does not prove a standalone MNQ bot will work after roll, costs, gaps, margin and prop-firm constraints.
3. **The best near-term intraday candidate to replicate is noise-area momentum**, but evidence must be separated carefully: the original well-known study concerns SPY; newer Nasdaq-futures extensions are preprints/independent research, not settled MNQ proof. The repository's current plan overstates the certainty if it describes this as independently proven on MNQ without a reproducible primary dataset and code.
4. **Ordinary OHLCV pattern strategies face a serious cost hurdle on MNQ.** A 2026 arXiv preprint testing 14 signal families on 947 five-minute MNQ sessions (2021–2025) reports that none met all of its out-of-sample criteria. It is a preprint, not peer-reviewed proof that every possible OHLCV strategy fails, but it is an important negative result.
5. **Intraday momentum effects can decay or be regime-dependent.** A 2022 Journal of Futures Markets study found that an overnight-return-to-last-half-hour relationship disappeared out of sample and varied by regime. Do not treat a published anomaly as permanent.
6. **Bot reliability is part of strategy performance.** A profitable signal with stale data, duplicate orders, unhandled partial fills, rejected protection or bad reconnect recovery is not a viable bot.
7. **AI belongs outside the deterministic execution loop.** Claude/Quint can translate ideas, explain results and propose research. The versioned deterministic strategy core, Guardian and order gateway must control actual decisions and orders.

## 2. What the evidence says about strategy families

### A. Multi-week/monthly trend following — highest-priority broad-horizon research

Moskowitz, Ooi and Pedersen (2012), *Time Series Momentum*, Journal of Financial Economics, report significant time-series momentum across 58 liquid equity-index, currency, commodity and bond futures/forwards. Past 12-month excess returns positively predicted future returns; persistence lasted approximately 1–12 months and partially reversed over longer horizons.

**Interpretation for Quint:** this is a stronger academic starting point for a swing/monthly research track than an isolated retail indicator combination. It is cross-market evidence, not a validated MNQ-only implementation, and it does not account for Lucid's account rules.

**Research candidate (not an approved strategy):**
- Build daily and weekly MNQ trend signals from lagged returns or a simple time-series trend estimator.
- Compare 1/3/6/12-month lookbacks and volatility-scaled sizing using a preregistered, small grid.
- Test long and short separately; include flat/no-trade thresholds to reduce weak-signal turnover.
- Compare daily close-only decisions against weekly decisions; no intrabar lookahead.
- Use actual quarterly contracts for execution validation, explicit roll logic, dividends/financing where relevant, and gap-through-stop stress.
- Report exposure, turnover, time-under-water, worst overnight gap, margin use and drawdown in dollars per one MNQ.
- Hard-block the strategy on accounts/plans that do not explicitly permit its overnight/weekend holding horizon. Do not disguise an intraday-only account constraint as a strategy exit optimisation.

**Go/no-go:** proceed to a research backtest because the broad literature supports testing it. Do not promote to live until MNQ-specific, net-of-cost walk-forward, holdout and paper-forward gates pass.

Primary source: https://www.sciencedirect.com/science/article/pii/S0304405X11002613  
Author-hosted summary: https://www.aqr.com/insights/research/journal-article/time-series-momentum

### B. Intraday noise-area momentum — priority replication candidate

The noise-area idea measures the market's normal opening noise/range and trades a confirmed break in the direction of expansion, rather than treating every candle breakout as meaningful. Quint's current plan refers to a 2024 SPY study and to later Nasdaq futures tests.

**Evidence boundary:**
- The original Zarattini et al. work cited in Quint's plan is SPY ETF evidence, not direct MNQ validation.
- A 2026 SSRN preprint, *Noise-band Intraday Momentum in Nasdaq-100 Futures*, reports a one-micro-contract Nasdaq futures implementation on one-minute data from 2020 to July 2026, with positive net results and sensitivity to stop slippage. It is a recent preprint; independently reproduce it before relying on its abstract-level results.
- Another 2026 research report claims an NQ noise-area extension, but it is not a substitute for primary data, exact rules and reproducible code.

**Next implementation research:**
1. Obtain the complete primary paper, appendices and exact code/rules if available.
2. Confirm instrument identity: NQ versus MNQ, actual contract versus continuous series, and whether the micro sizing is truly MNQ.
3. Freeze the opening noise calculation, entry trigger, trailing stop, session cutoff, position sizing and all filters exactly as published.
4. Reproduce on Quint's own data with the current account-specific fee schedule and conservative slippage.
5. Run chronological walk-forward, untouched holdout, year/regime and long/short splits; remove the best day and top 1% of trades; stress stop slippage by 1, 2 and 4 ticks and by 0.5/1.0 index points.
6. Compare the published version against a simple non-optimised baseline. Do not retune repeatedly against the holdout.

**Go/no-go:** this is the first intraday replication candidate, not a proven MNQ edge. Keep the status as Testing until independent reproduction is complete.

Preprint: https://papers.ssrn.com/sol3/papers.cfm?abstract_id=7609644

### C. Last-30-minute / overnight-return momentum — research cautiously

A 2022 *Journal of Futures Markets* paper studies whether overnight returns predict the last half-hour return in equity-index futures including Nasdaq 100. Its abstract reports that the predictability disappears in the out-of-sample period and is regime-dependent; thresholding may help compared with always trading.

**Interpretation:** do not describe this as a robust, independently proven intraday bot. It is a candidate for a strict replication with a regime/threshold hypothesis, but the published out-of-sample failure is a major warning.

Source: https://onlinelibrary.wiley.com/doi/10.1002/fut.22375

### D. Common 5-minute OHLCV signals — negative evidence must be retained

Mathias Mesfin's 2026 arXiv preprint, *Structural Limits of OHLCV-Based Intraday Momentum Signals in MNQ Futures*, evaluates 14 signal families on 947 five-minute MNQ sessions from 2021–2025 using expanding-window walk-forward validation and explicit cost/statistical criteria. It reports that none met all criteria simultaneously; many gross edges were smaller than assumed round-trip friction, while a few stronger-looking variants failed sample or stability tests.

**Implications:**
- Do not keep adding ORB, gap, volume-spike, liquidity-grab, VWAP or candle-pattern variants just because they are easy to code.
- Reproduce relevant negative results where possible and preserve failed variants in the registry.
- A signal family can still be retested if the hypothesis is materially different (different data, market microstructure, execution or regime), but the difference must be explicit and preregistered.
- A paper's fixed friction assumptions must not be copied blindly; use Quint's verified account fees and measured execution.

**Evidence label:** arXiv preprint; not peer-reviewed confirmation.

Source: https://arxiv.org/abs/2605.04004

### E. Order-flow scalping — data gate before strategy coding

Top-of-book order-flow imbalance (OFI), microprice and queue imbalance are plausible short-horizon hypotheses, but they require event-level trades and bid/ask updates. Five-minute OHLCV cannot test them honestly.

**Data gate:** before building an OFI bot, confirm availability and licensing of timestamped best bid/ask, depth/queue changes, trades, sequence integrity and sufficiently precise timestamps. Without this, keep the idea as Specified/Blocked; do not proxy order-book data with candle volume.

Scalping results must model spread, queue priority, partial fills, latency, marketable-order slippage, stop execution and message-rate constraints. If the actual feed lacks the needed fields, the result is not a valid scalping backtest.

### F. Gap midpoint / VWAP / ORB / five-pillar — candidates, not conclusions

- **Gap midpoint:** a recent NQ session-range study reports a high descriptive midpoint-touch rate, but a touch probability is not an executable strategy edge. Quint's gap-midpoint setup needs entry confirmation, stop/target sequencing, mirrored controls and costs.
- **VWAP first pullback:** existing Quint research is a specified MNQ experiment; the source evidence cited in its PR is not direct proof for this exact MNQ implementation. Keep Testing.
- **Opening-range breakouts:** existing MNQ exploratory backtests have low sample sizes and concentration/regime issues. Keep Testing.
- **Five-pillar playbook:** preserve the owner's playbook, but make every component measurable and diagnose the restrictive pullback/target-room filter using saved near-miss cases. Do not loosen filters after seeing the outcome.
- **20-candle breakout:** prior exploratory result was strongly regime-sensitive and concentrated. Reproduce with identical engine, data and cost settings before drawing conclusions.

## 3. What Quint's current results do and do not establish

Prior exploratory repository results include:
- 20-candle 15-minute breakout: 185 trades, PF 1.27, +$6,401 net; first half -$420, second half +$6,821; best day approximately 45% of total profit.
- New York 15-minute opening-range breakout: 52 trades, PF 1.21, +$1,529 net; one day contributed more than total net profit.
- Five-pillar setup: zero completed trades in one four-week five-minute sample under the then-current target-room filter.

These numbers are historical reports, not independently reproduced in this document. They are not enough to approve a bot: sample size, time/regime split, profit concentration, data coverage and execution assumptions remain material. Preserve the negative/weak findings. Re-run from source data and the canonical engine before using them for prioritisation.

**Important correction for future documentation:** do not say that a strategy has "strong independent evidence on Nasdaq futures" merely because its underlying idea has evidence on SPY, a broad futures universe, or a third-party backtest summary. Label the exact market, contract, period, data, costs, publication status and replication status.

## 4. Automated bot architecture: non-negotiable design

### A. One deterministic strategy core, multiple adapters

Use the Strategy Lab's versioned Strategy Definition and bounded expression language:
- AI interpreter turns user text into a proposed, reviewable definition; it cannot execute arbitrary generated code.
- Validator checks required fields, timezones, warm-up, lookahead, supported data, contract maths, risk and account compatibility.
- One deterministic signal/risk core is reused by historical backtest, Playback, live paper and eventual live execution.
- Adapters handle historical data, NinjaTrader Playback, live market data, simulated fills and broker orders.
- Golden tests prove identical signal and risk decisions across adapters for identical input events.

Do not implement separate hand-written versions of the same strategy in Python, JavaScript and C# without parity tests. The strategy definition and canonical test fixtures are the source of truth.

### B. Strategy output is an intent, not an order

A strategy may propose: direction, setup ID, signal timestamp, expiry, entry type/price constraints, initial stop, target/exit plan, maximum risk, invalidation, required data and rationale.

The pipeline must be:

`Market Events → Strategy Signal → Guardian Pre-Trade Check → Order Router → Broker → Order/Fill Reconciliation`

No strategy, AI component, dashboard control or copier may bypass the Guardian or the single OrderRouter.

Signal-assisted and fully automated modes use the same signal and risk calculation. Signal-assisted mode adds a human approval gate. Automated mode still requires per-account eligibility, strategy approval status and explicit live authorisation. A bot must never silently switch modes.

### C. Event-driven order state and idempotency

Maintain an auditable state machine for each order:
- PendingSubmit → Submitted → Accepted → Working → PartFilled → Filled
- CancelPending → Cancelled
- Rejected / Error / Unknown

Use stable client order IDs and idempotency keys so duplicate signal or reconnect events cannot create duplicate positions. Treat acknowledgements as asynchronous; never assume an order was accepted because the submit call returned. Reconcile broker orders, executions and positions against the engine journal after every reconnect and restart.

Handle partial fills explicitly: protective stop/target quantity must match actual filled quantity, and any residual working entry must be cancelled or managed according to the strategy's defined rule. Detect overfills, orphan orders, position mismatch and OCO/bracket inconsistencies.

### D. Pre-trade controls and kill switches

The FIA's July 2024 automated-trading risk-control guidance identifies controls such as maximum order size, maximum intraday position, price tolerance, cancel-on-disconnect, kill switches, message throttles and post-trade/drop-copy reconciliation.

For Quint, enforce at minimum:
- Maximum contracts per order and account; maximum aggregate position.
- Maximum dollar risk per trade and aggregate open risk.
- Daily loss and trailing drawdown buffers, including open/unrealised P&L treatment.
- Maximum orders/messages per time interval and duplicate-order protection.
- Price collars / stale-price rejection / maximum spread.
- Session, news, instrument and firm-rule restrictions.
- Stop/target presence and confirmed broker acceptance.
- Manual global and per-bot kill switches, plus cancel/flatten procedures.
- Account-level isolation: a copier failure or rejection on one account must not silently create divergence on another.

The kill switch is a final backstop, not a substitute for pre-trade controls. The bot must not be able to disable, bypass or reset the Guardian's limits.

FIA source: https://www.fia.org/sites/default/files/2024-07/FIA_WP_AUTOMATED%20TRADING_RISK%20CONTROLS_FINAL_0.pdf

### E. Connection loss, rejection and restart

NinjaTrader's documentation exposes explicit connection-loss behaviour and order-rejection handling. Its default realtime error handling stops the strategy, cancels working orders and closes positions managed by the strategy after an order rejection. NinjaTrader warns that ignoring errors can have serious adverse effects unless custom rejection handling is implemented.

Quint's design rule:
1. On stale data or a broker/order connection fault, block new entries immediately.
2. Do not assume working protective orders are still active; query/reconcile broker state.
3. Preserve or restore protection for actual open quantity; if protection cannot be confirmed, invoke the pre-defined safe response and alert.
4. Do not auto-resume trading simply because the connection returns. Reconcile positions, orders, account balance, strategy state and market-data freshness first.
5. Require a controlled re-arm after unresolved state, repeated restarts, rejected protective orders or Guardian fault.
6. Test disconnect during entry, partial fill, stop modification, cancel/replace and flatten.

NinjaTrader references:
- Strategy lifecycle and event callbacks: https://docs.ninjatrader.com/ninjascript/strategy
- Realtime order rejection handling: https://docs.ninjatrader.com/ninjascript/realtimeerrorhandling
- Connection-loss handling: https://docs.ninjatrader.com/ninjascript/connectionlosshandling

### F. Execution realism is not optional

For MNQ, CME specifies a $2 index-point multiplier and a 0.25-point outright tick worth $0.50 per contract. Every strategy must use a versioned account-specific cost profile; do not hard-code one generic commission assumption across firms.

Backtests must distinguish:
- Last trade, bid and ask; marketable versus passive order.
- Signal time, order-submit time, broker acknowledgement, exchange arrival where measurable, and fill time.
- Spread, commissions, exchange/clearing fees, slippage, latency, partial fills, queue position and rejected orders.
- Stop-market gap risk and adverse intrabar sequencing.
- Actual quarterly contract versus continuous adjusted series; roll schedule and roll execution.
- Session timezone, daylight saving changes, maintenance break and holidays.

OHLC bar backtests can be useful for slower strategies, but they cannot establish queue-aware scalping performance or resolve every intrabar stop/target ordering. Report fill-model limitations prominently.

CME source: https://www.cmegroup.com/articles/faqs/micro-e-mini-equity-index-futures-frequently-asked-questions.html

### G. Testing ladder and immutable evidence

A strategy must progress through explicit stages:
1. Idea / Draft.
2. Exact specification frozen.
3. Static validation and unit/golden tests.
4. Historical in-sample and walk-forward.
5. Untouched holdout.
6. Playback / tick-sequence tests.
7. Live-market paper forward test.
8. Human review and version-specific approval.
9. Explicit live authorisation per account.

Every run stores the strategy version/hash, code/build version, dataset hash/range, feed type/delay, session/timezone, cost profile, fill model, parameter set, trades, signals, skipped trades, risk checks, order events and metrics. A change to rules, data assumptions or cost model creates a new version/run and invalidates the prior approval.

Report net expectancy, PF, win rate, average win/loss, drawdown, time-under-water, worst day, exposure, turnover, MAE/MFE, hold time, long/short, year/regime/session splits, best-day/top-1%-trade removal, cost stress, parameter-neighbourhood stability and uncertainty. Use chronological folds and block bootstrap for serially dependent returns. Never randomly shuffle time series.

## 5. Bot portfolio research queue

Keep all four horizons in active rotation. These are research priorities, not claims of profitability.

| Horizon | Candidate | Why it merits research | Main blocker / falsification |
|---|---|---|---|
| Scalping | OFI + microprice / queue imbalance | Plausible microstructure signal at very short horizons | Requires event-level quotes/depth/trades; reject candle-only proxy tests; net edge must survive queue, spread and latency |
| Intraday | Noise-area momentum | Strongest near-term replication lead among current intraday ideas | SPY evidence is not MNQ proof; reproduce Nasdaq preprint exactly and stress stop slippage/regime stability |
| Intraday | Confirmed overnight-gap midpoint | NQ session study motivates a touch/reversion test | Touch rate is not net expectancy; require executable entry, stop, mirrored control and independent validation |
| Swing | Daily/weekly time-series momentum | Broad peer-reviewed futures evidence across 58 markets | MNQ-specific replication, roll/gap costs, long/short stability and prop overnight eligibility |
| Swing | Prior-week breakout + volatility filter | Mechanically defined and low-turnover candidate | Must beat simple daily trend baseline after costs; avoid parameter mining |
| Monthly | 3/6/12-month trend with volatility scaling | Aligns with published time-series momentum horizon | Drawdowns, leverage/margin, contract rolls and prop account incompatibility may make it unsuitable |
| Multi-horizon | Regime-conditioned strategy selection | Could avoid forcing one strategy into all market conditions | Classifier must be causal, stable and add value net of extra complexity; test against one always-on baseline |

## 6. Claude Code/Fable handoff prompt

Use this prompt when continuing the research or implementing the platform:

> Read this knowledge base, `CLAUDE.md`, `quint-control/PLAN.md`, `quint-control/STATUS.md`, the Strategy Lab specification, the MNQ research programme and every relevant prior note/PR before starting.
>
> Work as a skeptical quantitative researcher and trading-systems engineer. First identify the next distinct high-value experiment, rotating across scalping, intraday, swing and multi-week/monthly horizons. Do not assume a strategy is profitable because a paper, video, vendor or previous backtest says so.
>
> Freeze exact rules, data granularity, session/timezone, contract/roll method, cost profile, fill assumptions, sample-size requirements and failure criteria before implementation. Audit existing experiments for overlap. If required data is unavailable, stop and record the blocker instead of inventing a proxy.
>
> Reuse the canonical deterministic strategy definition across backtest, Playback, paper and live adapters. Keep AI outside the execution/risk loop. Preserve signal parity between signal-assisted and automated modes. Automated orders require explicit per-account live authorisation and Guardian approval.
>
> Add tests for lookahead, DST/session boundaries, rolls, duplicate signals, partial fills, rejected orders, disconnects, restart reconciliation, protective-order quantity and account isolation. Never modify Guardian, OrderRouter, kill-switch or live execution code as part of a strategy-only research change.
>
> Put durable, reviewed principles and validated findings into this main-branch knowledge base. Put new hypotheses and unverified results in a research branch/PR. Report exact files, commands, tests actually run, source quality, evidence limitations, and why the hypothesis passed or failed. Do not merge research PRs or enable live trading without explicit user approval.

## 7. Source register and evidence labels

- Moskowitz, Ooi & Pedersen (2012), *Time Series Momentum*, Journal of Financial Economics. Peer-reviewed journal article. https://www.sciencedirect.com/science/article/pii/S0304405X11002613
- Rosa (2022), *Understanding intraday momentum strategies*, Journal of Futures Markets. Peer-reviewed journal article; abstract reports out-of-sample disappearance and regime dependence. https://onlinelibrary.wiley.com/doi/10.1002/fut.22375
- Mesfin (2026), *Structural Limits of OHLCV-Based Intraday Momentum Signals in MNQ Futures*. arXiv preprint; not peer-reviewed. https://arxiv.org/abs/2605.04004
- Chuk (2026), *Noise-band Intraday Momentum in Nasdaq-100 Futures*. SSRN preprint; not peer-reviewed; requires independent reproduction. https://papers.ssrn.com/sol3/papers.cfm?abstract_id=7609644
- FIA (July 2024), *Best Practices for Automated Trading Risk Controls and System Safeguards*. Industry guidance. https://www.fia.org/sites/default/files/2024-07/FIA_WP_AUTOMATED%20TRADING_RISK%20CONTROLS_FINAL_0.pdf
- NinjaTrader, NinjaScript Strategy documentation. Official platform documentation. https://docs.ninjatrader.com/ninjascript/strategy
- NinjaTrader, RealtimeErrorHandling. Official platform documentation. https://docs.ninjatrader.com/ninjascript/realtimeerrorhandling
- NinjaTrader, ConnectionLossHandling. Official platform documentation. https://docs.ninjatrader.com/ninjascript/connectionlosshandling
- CME Group, Micro E-mini Equity Index Futures FAQ. Official exchange contract information. https://www.cmegroup.com/articles/faqs/micro-e-mini-equity-index-futures-frequently-asked-questions.html

**Evidence vocabulary:** Peer-reviewed journal article; official exchange/platform documentation; industry guidance; working paper/preprint; vendor/independent backtest; repository experiment; unverified claim. Never blur these categories.
