# 2026-11-20 — Intraday hypothesis: confirmed overnight-gap midpoint reversion

**Status:** Research specification only. Not backtested, not paper-forward tested, not approved for live trading.  
**Track:** Intraday (second rotation after scalping).  
**Research question:** On MNQ sessions with a measurable 09:30 ET opening gap, does a first-five-minute counter-gap close improve the probability and net expectancy of a trade toward the gap midpoint, after executable costs, relative to unconditional midpoint-touch rates and a mirrored-distance control?

## Why this hypothesis — and what changed

The initial idea considered today was an overnight-high/low sweep followed by a reclaim. Review of Quint's existing research programme and the 2026 MNQ falsification preprint showed that generic liquidity-grab and gap families have already been studied and did not meet the preprint's complete out-of-sample criteria. To avoid repeating a generic liquidity-sweep test, today's hypothesis is narrowed to a different, falsifiable question: **session-conditioned gap-midpoint reversion with a predeclared opening-bar confirmation and a mirrored-price control**.

A 30 October 2026 open-access *Finance Research Open* article by Sodikov, Loose, van Heeswijk and Machado studies session-based predictors for E-mini Nasdaq-100 futures. Its abstract reports that the London-session range was the top predictor in 15 of 17 models and that overnight-gap midpoints were reached by 11:00 ET on 70.26% of days. The authors study NQ, not MNQ, and report forecasting/retracement findings, not a fully costed MNQ trading system. Treat this as directly relevant published evidence to replicate, not proof of tradability. DOI: https://doi.org/10.1016/j.finr.2026.100192

A 2026 arXiv preprint by Mesfin (arXiv:2605.04004, revised 15 September 2026) tested 14 MNQ OHLCV signal families, including gap and liquidity-grab families, on 947 five-minute sessions from 2021–2025. Its abstract reports that none met all stated out-of-sample, friction and stability criteria; several gap/liquidity variants failed for different reasons. This is a preprint, not peer-reviewed, and the new hypothesis must be checked for overlap with its exact definitions before claiming novelty. https://arxiv.org/abs/2605.04004

The New York Fed's 1 July 2026 update, "The Disappearing Overnight Drift", reports that a previously documented S&P 500 futures overnight return pattern had averaged close to zero since 2021. This is a different phenomenon, but it is a strong warning that session effects can decay and must be tested across time regimes. https://libertystreeteconomics.newyorkfed.org/2026/07/the-disappearing-overnight-drift/

## Preregistered definitions and rules

### Instrument and session

1. Use actual active quarterly MNQ contracts with explicit contract IDs and roll dates; do not calculate fills on a back-adjusted continuous contract.
2. All session timestamps use America/New_York with DST-aware conversion.
3. Prior RTH close anchor: 16:00:00 ET prior trading day. Current RTH open: first eligible trade at/after 09:30:00 ET.
4. Gap = current 09:30 open minus prior RTH 16:00 close. Gap midpoint = arithmetic mean of those two prices.
5. Pre-RTH session range feature: high minus low from 03:00:00 to 09:29:59 ET. This is a fixed ET window, not a claim that it always exactly matches the London cash session during DST transition weeks.
6. Primary outcome window: 09:30–11:00 ET. Secondary outcome: through 16:00 ET. Do not move the window after seeing results.

### Signal

One potential trade per session; no pyramiding.

- Exclude a session if the absolute opening gap is less than 0.10 times the prior RTH session's high-low range. This is a fixed minimum materiality threshold, not a tuned parameter.
- At 09:35 ET, evaluate the completed 09:30–09:35 five-minute candle.
- Up-gap short setup: the five-minute candle closes below the 09:30 open, but remains above the gap midpoint.
- Down-gap long setup: the five-minute candle closes above the 09:30 open, but remains below the gap midpoint.
- Entry is at the next one-minute bar's open after 09:35, using executable bid/ask and the declared latency model. No fill at the signal candle close.
- Target is the gap midpoint.
- Stop is one MNQ tick beyond the 09:30–09:35 candle's high for a short, or low for a long.
- Require target distance from entry to be at least the stop distance from entry (minimum 1.0 reward/risk). Otherwise skip.
- If the target has not filled, exit at 11:00 ET using executable liquidity.
- Stop and target are active immediately. If both appear to be touched within an ambiguous bar/event interval, use tick sequencing; if unavailable, assume the adverse ordering.
- No new entries after the 09:35 confirmation. No AI discretion, averaging down, stop widening or additional positions.

### Session-conditioning variables

These are explanatory variables, not permission to tune thresholds after observing results:
- Absolute gap / prior RTH range (continuous; report deciles and fixed quartiles).
- Pre-RTH 03:00–09:30 range / trailing 20-session median of the same range.
- Pre-RTH range percentile computed only from the preceding 60 completed sessions.
- Gap direction (up/down), weekday, scheduled high-impact USD news day, and volatility regime based only on trailing data.
- Report results by these groups; do not choose the best bucket and present it as the primary result.

### Controls

1. **Unconditional midpoint-touch baseline:** probability the midpoint is reached by 11:00 ET after any eligible gap.
2. **Mirror control:** from the 09:30 open, track the same absolute distance in the direction away from the midpoint. Compare the gap-midpoint touch rate with this mirrored level's touch rate over the same window.
3. **No-confirmation control:** same eligible gaps, but measure outcome without requiring the first-five-minute counter-gap close.
4. **Confirmation comparison:** compare confirmed and unconfirmed sessions using only information available at 09:35.
5. Report up-gap and down-gap separately. Never pool them without showing the separate results.

## Data required

- Minimum for signal research: timestamped 1-minute MNQ OHLCV bars, actual quarterly contract identifiers, prior RTH levels and enough history for trailing session features.
- Preferred for credible execution: trade/quote data with bid/ask, exchange timestamps and sequence numbers. One-minute bars cannot reliably resolve intrabar stop/target order or queue/fill quality.
- At least 5 years where available, spanning different volatility and macro regimes; include 2020–2025 for comparison with cited studies if the licensed dataset supports it, plus the latest available period.
- Scheduled-news calendar with release timestamps and the exact account-specific restricted windows.
- Validate DST changes, holidays, early closes, missing bars, bad ticks, contract rolls and 09:30 opening auction handling.
- Current Quint docs describe OHLCV datasets; verify exact files and granularity before implementation. If only 5m candles are available, use them for descriptive research only, not for the proposed 1m entry or realistic execution.

## Validation plan

1. **Overlap audit:** read the full 2026 preprint methods and Quint's existing gap/liquidity reports. Determine whether this exact opening-bar confirmation, pre-RTH range conditioning and mirror control were already tested. If substantially identical, record as replication, not a new edge claim.
2. **Data audit:** document source, actual contracts, time coverage, timestamp semantics, bar construction, DST/session mapping and missing-data rate.
3. **Descriptive test:** calculate midpoint and mirror touch rates by 11:00 and 16:00, with Wilson 95% confidence intervals; report all gaps and the fixed eligible subset.
4. **Signal test:** evaluate the exact 09:35 confirmation rule; report signal frequency, long/short rates, target touch, stop touch, time exit and no-fill counts.
5. **Chronological split:** earliest 60% development, next 20% validation, final 20% untouched holdout; also rolling quarterly/monthly walk-forward. Do not randomly shuffle sessions. Freeze all definitions before holdout access.
6. **Execution:** use actual bid/ask, next-bar execution, 50ms baseline decision-to-arrival latency where event data permits, partial/no fills, commissions, exchange/clearing fees and conservative slippage. Stress latency and slippage; do not double-count spread.
7. **Robustness:** separate long/short, year, volatility quartile, pre-RTH range quartile, gap-size decile, weekday, news/non-news and contract. Remove the best day and top 1% of trades; use day-clustered confidence intervals and block bootstrap.
8. **Parameter stability:** the primary rule is fixed. Sensitivity tests are diagnostic only: gap materiality 0.05/0.10/0.15 of prior RTH range and confirmation bar 1/5/10 minutes. Do not choose the best combination on the holdout.
9. **Economics:** report gross/net expectancy in ticks and dollars, win rate, profit factor, average win/loss, maximum drawdown, time under water, MAE/MFE, hold time, turnover, concentration, cost breakdown and account-rule eligibility.
10. **Mode parity:** one deterministic signal/risk payload feeds both modes. Signal-assisted mode requires explicit per-trade user approval; automated mode requires separate explicit live authorisation, account eligibility and Guardian checks before routing. Neither mode can bypass hard stops or account restrictions.

## Failure criteria

- If the midpoint does not beat the mirrored control on the untouched holdout, reject the directional reversion premise.
- If first-five-minute confirmation does not improve conditional probability or net expectancy versus the no-confirmation baseline, remove the confirmation rule; do not retrofit a new candle pattern on the holdout.
- If net expectancy is non-positive after actual fees and conservative slippage, reject the strategy as a trading candidate even if midpoint touches are frequent.
- If the result is driven by one direction, one year, one volatility bucket, a handful of sessions or one narrow parameter setting, reject or mark inconclusive.
- If sample size is insufficient for stable estimates or the 95% interval includes no improvement over the mirror baseline, classify as inconclusive, not successful.
- If account rules prohibit the holding period, news exposure or execution style, mark it ineligible for that account. Do not distort the signal to evade account rules.

## Findings today

- Published 2026 NQ research gives a concrete session-based midpoint-retracement result worth independently replicating.
- The MNQ preprint warns that generic gap and liquidity-grab signals can fail strict out-of-sample tests after costs.
- The New York Fed's 2026 update shows a different overnight session effect has faded, reinforcing the need for regime splits.
- No Quint backtest was run; no strategy profitability is established.
- Existing repo notes contain historical exploratory breakout results and known data limitations. Those are not evidence for this new rule and must not be conflated with it.

**Decision:** Hypothesis specified; overlap audit and data audit required before coding. No backtest, paper-forward run, live deployment or approval.

## Ready-to-paste Claude Code / Fable handoff

Read `CLAUDE.md`, `quint-brain/backtest/README.md`, `quint-control/research/mnq/STRATEGY-RESEARCH-PROGRAMME.md`, `quint-control/research/mnq/DAILY-LOG.md`, `quint-control/research/STRATEGY-LAB.md`, and all existing gap, opening-range and liquidity-sweep reports before changing anything.

Work only on a separate research branch and create a small reviewable PR. Never change `main`, merge a PR, modify live execution, Guardian, OrderRouter, account permissions or existing production strategy code.

1. First perform an overlap audit against the full Mesfin arXiv:2605.04004 paper and Quint's existing gap/liquidity research. Report whether this exact gap-midpoint + 09:35 counter-gap confirmation + pre-RTH range conditioning + mirrored control is new, partially overlapping or already tested. Do not claim novelty if it is not.
2. Inventory existing data files. Report exact paths, source, date coverage, granularity, contract IDs, timezone and missing fields. If 1-minute or finer MNQ data with reliable session timestamps is absent, stop before strategy implementation and write a data-acquisition blocker. Do not synthesize missing bars.
3. If suitable data exists, implement a research-only deterministic harness for the exact rules in this note. Add unit tests for gap/midpoint calculations, DST, holidays, early closes, session boundaries, one-trade-per-day state, signal timestamp and no-lookahead.
4. Implement descriptive midpoint-touch and mirrored-control statistics separately from the executable strategy simulation. Keep all gaps, eligible gaps, confirmed and unconfirmed samples distinct.
5. Simulate entry at the next one-minute open after 09:35, executable bid/ask where available, the fixed stop/target and 11:00 time exit. If intrabar sequencing is unavailable, resolve ambiguous stop/target bars adversely and disclose this limitation.
6. Freeze the chronological 60/20/20 split and walk-forward schedule before inspecting the holdout. Report all fixed group splits, both directions, costs, drawdown, confidence intervals, parameter stability and concentration. Do not tune on the holdout.
7. Add deterministic mode-parity tests around a shared signal/risk payload. Signal-assisted mode requires explicit approval; automated mode additionally requires explicit live authorisation and Guardian checks. Do not implement routing or modify Guardian.
8. Run only relevant research tests and report exact commands, outputs and failures. Never claim a test or backtest ran if it did not.
9. If data is missing, the overlap audit finds this is a duplicate, or the hypothesis fails, document that honestly. Return a concise report, changed-file list and draft PR for human review. Do not merge.

Research-only. No live execution changes.
