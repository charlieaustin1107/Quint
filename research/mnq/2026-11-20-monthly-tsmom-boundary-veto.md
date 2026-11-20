# 2026-11-20 — Monthly MNQ hypothesis: 12-month momentum with a valuation-boundary veto

**Experiment ID:** MNQ-MONTHLY-TSMOM-BOUNDARY-001  
**Horizon:** Multi-week / monthly  
**Status:** Specified only. No data acquired, backtest run, or profitability claim. Not approved for paper or live trading.  
**Next horizon rotation:** Scalping.

## Hypothesis

A 12-month time-series-momentum (TSMOM) direction held for one month may have positive net expectancy in Nasdaq futures. A causal macro “boundary” filter may improve it by keeping the strategy flat when broad US equity valuation and the yield curve are simultaneously near their own historical extremes, where a recent peer-reviewed study finds equity momentum more prone to reversal.

This is distinct from the existing 55-session Donchian breakout: it uses a 12-month return-sign signal, a one-month holding period and a macro regime veto, not a channel breakout or ATR trend exit.

## Why it is worth testing

- **Peer-reviewed, 2012:** Moskowitz, Ooi and Pedersen report time-series return persistence over roughly 1–12 months across 58 liquid futures markets. The evidence is broad and diversified; it does not establish that a standalone Nasdaq futures strategy is profitable.
- **Peer-reviewed, published 6 July 2026:** Suominen and Hjalmarsson, *Boundaries of Time-Series Momentum*, report that equity-market TSMOM performs poorly near extreme valuation/yield-curve states and that 12-month equity returns can reverse there. Their US sample runs 1927–2024; the strategy index combines 25 lookback/holding-period combinations. Their equity-market evidence is not a test of MNQ futures.
- **Key transfer risk:** The valuation inputs are broad US equity measures (Shiller S&P CAPE/dividend yield) and a term-spread measure. Nasdaq-100 concentration and technology-sector composition may behave differently.
- **Key data risk:** Macro series can be revised. A historical backtest using today's revised values is not proof that the filter was knowable in real time.

## Exact rules to test

### Instrument and time

1. Primary execution instrument: actual listed quarterly MNQ contracts, retaining the expiry and instrument ID on every event and fill.
2. Use actual listed NQ contracts from June 1999 onward as a long-history signal proxy only. CME says E-mini Nasdaq-100 futures began in 1999; MNQ began on 6 May 2019. Never pool NQ and MNQ results or describe NQ proxy performance as MNQ execution evidence.
3. Use the CME trade-date calendar and America/New_York timezone. The final trading date of each calendar month is the signal date.
4. For MNQ-native signal prices, calculate a 30-second VWAP from MNQ trades between 16:14:30 and 16:15:00 ET on the selected expiry. This is a Quint-defined MNQ reference price, **not** the official CME MNQ settlement: CME's FAQ says MNQ daily settlement is based on the corresponding E-mini contract's VWAP.
5. Build a point-in-time, causally roll-adjusted return chain from actual expiries. Use the contract-mapping experiment in [MNQ-DATA-ROLL-001](2026-11-20-contract-roll-integrity.md); compare its pre-registered mapping policies. Synthetic/back-adjusted prices must never be used as executable fills.

### Momentum signal and holding period

At each month-end, after the final MNQ reference price is available:

- Calculate the cumulative return across the previous 12 completed calendar months from the causal contract return chain: (R_{12,t}=\prod_{k=0}^{11}(1+r_{t-k})-1).
- Primary signal: long if (R_{12,t}>0); short if (R_{12,t}<0); flat if exactly zero. If any required month is missing, mark the signal unavailable, block new/reversal orders, and retain the last broker-confirmed position only under existing hard risk controls; never convert missing data into a flat signal.
- Hold the target for one calendar month, until the next scheduled month-end rebalance. If the signal reverses, close and reverse. If it is unchanged, maintain the direction.
- Submit the entry/rebalance at the first valid two-sided MNQ quote at or after 18:05 ET on the next Globex session after the month-end signal. Buy at ask / sell at bid, then apply the configured adverse slippage. Require a non-crossed quote no older than one second and a spread no wider than two MNQ ticks. If no valid quote appears within 30 minutes, record a missed rebalance and remain in the prior safe position state; do not invent a fill.
- No discretionary entry, news filter, intraday confirmation or AI override.

### Valuation-boundary filter

Use the 2026 paper's method as the research template, with a causal Quint adaptation:

1. Inputs: 12-month averages of Shiller CAPE, Shiller dividend yield and the US term spread. At decision time, use only the most recent observation whose publication timestamp is no later than the signal timestamp; never use an unpublished current-month value, interpolate or backfill. Prefer the paper's exact term-spread definition (long-term government bond yield less annualised risk-free rate) if the underlying data are licensed. Otherwise use FRED T10Y3M (10-year minus 3-month Treasury) and label it a proxy, not an exact replication.
2. For each input, scale its 12-month average to [-1,+1] using the trailing 120 monthly observations' min/max, including the current observation only after it is published. Formula: (z=2(x-\min)/(\max-\min)-1). If the range is zero or data are missing, the filter is unavailable and the strategy must not silently assume “mid-regime”.
3. Calculate two 10-year boundary scores: (B_{CAPE}=z_{term}^2+z_{CAPE}^2) and (B_{Div}=z_{term}^2+z_{dividend}^2). Define (B_{10}) as their average. Its theoretical range is 0–2.
4. Primary boundary flag: (B_{10,t}) is at or above the 90th percentile of the **previous 60 completed monthly B10 observations**, excluding the current month. This rolling threshold is a causal Quint adaptation of the paper's top-decile boundary classification, not the paper's exact full-sample cutoff.
5. Filtered target: if the boundary flag is true, target flat; otherwise use the 12-month momentum direction. The unfiltered 12-month TSMOM is the control.
6. Pre-registered robustness only: 20-year min/max normalisation, a 120-month percentile window, and 80th/95th-percentile boundary thresholds. Report all variants; do not select a winner after viewing the holdout.

Macro data must be point-in-time. Store source snapshots, retrieval timestamps and hashes. If historical publication vintages cannot be reconstructed, label the boundary result as revised-data research only and do not promote it to a live signal.

### Risk overlay

The academic signal and a deployable bot version must be separated:

- **Signal-only benchmark:** scheduled monthly exit/reversal, used only to measure the signal.
- **Bracketed candidate:** at entry, set a hard stop at 3 × prior-20-session ATR percentage and a take-profit at 6 × that ATR percentage. Compute ATR from completed CME trade dates only; freeze both levels at entry. These 3×/6× values are pre-registered engineering test parameters, not literature-backed optimal settings.
- If stop or target exits the trade, remain flat until the next scheduled monthly rebalance. Do not immediately re-enter.
- Stops are stop-market orders and must model gaps through the stop at the next executable bid/ask. A target limit is not filled on touch alone; require a trade at least one tick through the target unless queue data justifies a better model. If both stop and target are touched in an unresolved bar, assume the stop first.
- On contract roll, translate protective levels across the actual calendar spread; do not reset or improve the economic stop using a synthetic back-adjusted price.
- Reassess marks, ATR, MAE/MFE, roll status, data freshness, margin and account risk every session. The monthly alpha signal changes only at the scheduled month-end. Risk controls remain continuously active.
- Initial research uses one contract and no compounding. Position sizing is a separate account-specific Guardian decision; do not infer it from the 25K/50K account label.

## Required data

- Raw per-expiry MNQ and NQ trade data, bid/ask top-of-book, contract definitions, expiry calendar, per-contract daily volume and timestamped open interest.
- MNQ tick trades and quotes for month-end entries/exits, roll execution and stop/target sequencing. Daily OHLC is sufficient only for a coarse signal screen, not credible stop fills.
- CME session/holiday calendar and exact trade-date/DST handling.
- Shiller monthly CAPE and dividend-yield history; FRED/ALFRED term-spread observations and vintages. Archive every file/version used.
- Broker-specific MNQ/NQ commissions, exchange/clearing fees, observed spread, slippage and current overnight/maintenance margin. CME's 2019 margin examples are historical and must not be reused as current requirements.
- Follow the roll/data audit in MNQ-DATA-ROLL-001 and the backtest-integrity requirements proposed in [PR #25](https://github.com/charlieaustin1107/Quint/pull/25).

### Costs

For MNQ, CME specifies $2 per index point and a 0.25-point outright tick worth $0.50. The current Quint Control plan records $0.50 commission per side plus one adverse tick each way: $2.00 per round trip before any additional exchange/clearing fees not already included. Stress at two adverse ticks each way: $3.00 per round trip before additional fees. Use actual bid/ask and separate NQ costs for the NQ proxy. Add every roll leg and any rejected/replaced order costs. Verify the all-in schedule against the user's actual broker statement before calling it account-realistic.

## Validation plan

1. **NQ proxy, long history:** use 1999–2013 as warm-up for the 10-year macro normalisation and the prior-60-month boundary threshold; development 2014–2017; validation 2018–2020; untouched holdout January 2021–October 2026 (about 70 monthly decisions). Confirm complete actual-expiry coverage before fixing these dates. NQ results are proxy evidence only.
2. **MNQ native:** development 2019–2021; validation 2022–2023; untouched holdout 2024–October 2026. This holdout contains only about 34 monthly decisions and is likely underpowered; if it fails the pre-registered sample gate, report **inconclusive**, not a pass. Do not borrow NQ trades to inflate MNQ sample size.
3. Freeze the signal, boundary formula, thresholds, roll mapping, cost profile and stop/target overlay before opening either holdout. Use expanding chronological walk-forward windows; no random shuffling. Purge overlapping holding-period observations where applicable.
4. Compare: unfiltered 12-month TSMOM; boundary-filtered TSMOM; the same two with the bracket overlay; long-only buy-and-hold; flat/cash; and a pre-registered reverse-signal placebo.
5. Report net returns, annualised return, Sharpe/Sortino, maximum and mark-to-market drawdown, Calmar, worst month, recovery time, exposure, turnover, MAE/MFE, stop-gap loss, roll costs and margin usage. Break out long vs short, high vs low volatility, boundary vs mid-regime, calendar year and roll/non-roll periods.
6. Test nearby lookbacks (6, 9 and 12 months; 12 is primary), a 3-month holding-period sensitivity, and the pre-registered boundary sensitivities above. Show every attempted variant. Use dependence-aware block-bootstrap confidence intervals; PBO/Deflated Sharpe are secondary diagnostics, not substitutes for the holdout.
7. Reconcile historical, Playback and live-paper decisions through the same deterministic signal/risk core. Record feed, quote age, latency, missed fills, partial fills, order rejections and broker position reconciliation.
8. **Minimum evidence gate:** require at least 60 untouched monthly decisions and at least 20 long and 20 short decisions in the holdout, with complete quote/roll-cost coverage. If NQ or MNQ cannot meet this, report that series as underpowered/inconclusive. The proposed MNQ-native holdout has only about 34 decisions and cannot independently pass this gate.

## Failure criteria

- The unfiltered baseline has non-positive net expectancy on the untouched holdout after all commissions, spread, slippage and roll costs.
- The boundary veto does not improve pre-registered out-of-sample risk-adjusted performance versus the same unfiltered strategy, or its apparent benefit exists only in development/validation.
- The result disappears under the two-tick stress model, is concentrated in one side/year/regime, or is unstable across nearby lookbacks.
- The stop/target overlay produces unacceptable drawdown, repeated gap-through losses, or account-limit breaches.
- Any future-data leak, revised macro-data leakage, non-causal contract mapping, synthetic fill, missing-month substitution or unresolved execution ambiguity invalidates the run.
- Insufficient trades, incomplete contract history or unavailable macro vintages means **inconclusive**, not “profitable” or “failed”.

## Findings and constraints so far

- The literature justifies a falsifiable test, not a profitability claim. The 2012 TSMOM paper studies diversified futures; the 2026 boundary paper studies broad equity-market returns, not MNQ.
- CME states MNQ launched on 6 May 2019, so its native history is short for a 12-month signal plus a robust untouched holdout. NQ has a longer history but remains a proxy.
- CME's MNQ daily settlement is derived from the E-mini counterpart's VWAP. Quint must not mistake that published settlement for an MNQ-native traded-price series.
- **Prop-account compatibility:** LucidPro/Flex/Direct positions must be closed by 4:45 PM Eastern; LucidLive explicitly disallows swing trading in its current allowed-times guidance. Topstep requires flat positions by 3:10 PM Central and does not permit overnight holds. This monthly strategy is therefore incompatible with those products as currently documented. Do not silently flatten/reopen each day: that changes the strategy. It requires a separately authorised brokerage account that permits overnight/weekend holds, sufficient margin and explicit gap-risk acceptance.
- **Quint modes:** manual-approval and automated modes must call the same deterministic signal and risk functions and produce identical proposed orders. Manual mode waits for human approval. Automated submission additionally requires explicit per-account authorisation, a strategy-version allowlist and Guardian approval on firm permissions, session/calendar, margin, max contracts, daily/max loss, data freshness, connectivity, contract expiry/roll, protective-order acknowledgement and idempotent broker-state reconciliation. If any check fails, block submission. AI must not override the signal, risk limits or Guardian.
- Current repository build gate remains **HOLD** in PR #30. This note is research-only and does not authorise Phase 1, strategy implementation, Fable usage or any runtime/Guardian/OrderRouter change.

## Sources

1. Moskowitz, Ooi & Pedersen (2012), *Time Series Momentum*, Journal of Financial Economics 104(2), 228–250: https://doi.org/10.1016/j.jfineco.2011.11.003
2. Suominen & Hjalmarsson (published 6 July 2026), *Boundaries of Time-Series Momentum*, Financial Management: https://doi.org/10.1111/fima.70055
3. CME Group, Micro E-mini Equity Index Futures FAQ (MNQ launch, multiplier, tick, settlement method and trading hours): https://www.cmegroup.com/articles/faqs/frequently-asked-questions-micro-e-mini-equity-index-futures.html
4. CME Group / Nasdaq, E-mini Nasdaq-100 futures launch history: https://www.cmegroup.com/media-room/press-releases/2009/6/22/cme_group_nasdaqomxcelebrate10thanniversaryofe-mininasdaq-100con.html
5. Robert Shiller, US stock-market data and CAPE: https://www.econ.yale.edu/~shiller/data.htm
6. FRED, 10-Year Treasury Constant Maturity Minus 3-Month Treasury Constant Maturity (T10Y3M): https://fred.stlouisfed.org/series/T10Y3M
7. Lucid Trading, Allowed Trading Times (26 August 2026): https://support.lucidtrading.com/en/articles/11404729-allowed-trading-times
8. Topstep, When and What Products Can I Trade? (overnight holding FAQ): https://help.topstep.com/en/articles/8284206-when-and-what-products-can-i-trade

## Claude Code / Fable handoff prompt

~~~text
Research-only task: assess MNQ-MONTHLY-TSMOM-BOUNDARY-001 in
research/mnq/2026-11-20-monthly-tsmom-boundary-veto.md.

First read the current build gate in quint-control/STATUS.md and root CLAUDE.md.
The current owner HOLD remains binding: do not start implementation, scaffold
the dashboard/engine, spend paid Fable/API usage, or change runtime code.

Review the existing research branches/PRs before doing anything:
- PR #19 scalping OFI/microprice
- PR #20 VWAP first-pullback
- PR #22 intraday gap-midpoint
- PR #24 55-day Donchian swing
- PR #25 backtest-integrity standard
- PR #29 contract-roll/continuous-series integrity
- PR #30 pre-Fable build HOLD

Do not repeat the 55-day Donchian or contract-roll work. Confirm this monthly
12-month TSMOM + valuation-boundary-veto hypothesis is distinct.

Produce a read-only research audit:
1. Verify the cited 2012 and 2026 papers' exact signal, holding-period,
   boundary-variable and sample definitions. Label the Quint adaptations.
2. Identify licensed raw NQ/MNQ expiry, trade, quote, volume and OI data needed.
3. Define a point-in-time macro-data/vintage plan for Shiller CAPE/dividend yield
   and the term spread. If historical vintages cannot be reconstructed, state
   that the filter is not yet live-safe.
4. Check the monthly timestamps, CME trade-date/DST calendar, roll treatment,
   entry/exit quotes, protective stop/target semantics and cost assumptions.
5. Create an immutable experiment manifest and test matrix only if this can be
   done as documentation without violating the HOLD. Do not run a backtest on
   incomplete data or inspect the locked holdout.
6. Specify NQ proxy and MNQ-native reports separately. Never pool them or call
   NQ results MNQ evidence.
7. Show the same deterministic signal/risk core for manual approval and
   automated modes. Automated order submission must additionally require
   explicit per-account authorisation and Guardian approval. No AI order
   decisions or bypasses.
8. Return gaps, failure risks, data costs still unknown, and a staged plan.
   Do not claim profitability.

Do not edit main, merge PRs, change Guardian/OrderRouter/live execution,
purchase data, contact brokers, or place orders. If implementation is still
on HOLD, stop at the research audit and report exactly what remains blocked.
Any later code work requires separate owner approval and a new reviewable branch.
~~~
