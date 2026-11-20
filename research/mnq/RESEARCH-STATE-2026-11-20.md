# Quint MNQ research state — 20 November 2026

**Status:** Research and documentation only. No strategy is approved for live trading. This file consolidates programme-level decisions, prior findings, new literature, current data limitations and the next research actions so future Claude Code/Fable sessions do not repeat discovery or confuse hypotheses with evidence.

## Programme decisions — binding research requirements

1. Give scalping, intraday, swing and multi-week/monthly strategies equal discovery priority. Rotate research across horizons; do not assume the easiest-to-test horizon is best.
2. Support both signal-assisted/manual-approval and fully automated modes.
3. Both modes must consume the same deterministic signal, sizing, stop, target, invalidation and risk logic. Manual approval is an additional order-submission gate, not a risk-control bypass.
4. Automated order submission requires separate explicit live authorisation, account/plan eligibility, and all existing Guardian checks. Unknown firm rules default to blocked.
5. AI may translate ideas, explain evidence and propose research. It must not be in the tick-by-tick execution path, invent exits, loosen risk or override Guardian.
6. Keep research separate from live execution. No edits to main, no merges, and no changes to Guardian, OrderRouter, account permissions or live execution from research tasks. Use separate research branches and draft PRs for human review.
7. Never call a strategy profitable without robust net out-of-sample evidence after realistic execution costs, chronological walk-forward testing and an untouched holdout.

## Horizon rotation and dated research

| Date | Horizon | Research item | Current status |
|---|---|---|---|
| 2026-11-19 | Scalping | Best-level order-flow imbalance plus microprice skew for 5–30 second MNQ continuation | Hypothesis specified; not backtested; requires event-level bid/ask/depth data |
| 2026-11-20 | Intraday | Opening-gap midpoint reversion with 09:35 counter-gap confirmation, pre-RTH range conditioning and mirrored-price control | Hypothesis specified; not backtested; overlap and data audit required |
| Next | Swing | Select a distinct daily/weekly holding-period hypothesis | Discovery queued |
| Following | Multi-week/monthly | Select a distinct multi-week/monthly hypothesis | Discovery queued |

Detailed specifications:
- [19 Nov scalping — OFI and microprice](notes/2026-11-19-scalping-ofi-microprice.md)
- [20 Nov intraday — gap midpoint confirmation](notes/2026-11-20-intraday-gap-midpoint.md)
- [Daily research log](DAILY-LOG.md)

## Existing Quint strategy evidence — preserve, do not overstate

Earlier exploratory backtests recorded in PR #9:
- 20-candle 15-minute breakout: 185 trades, PF 1.27, +$6,401 net; first half -$420, second half +$6,821; best day contributed about 45% of total profit.
- New York open breakout: 52 trades, PF 1.21, +$1,529 net; first half -$462, second half +$1,991; one day's contribution exceeded the total.
- Five-pillar liquidity/CISD/displacement/pullback playbook: zero trades in four weeks of 5-minute data.

These are exploratory historical results, not robust evidence. Small samples, changing regimes, profit concentration and data coverage are material weaknesses. Reproduce under one consistent engine and current costs before drawing conclusions.

PR #20 already proposes a distinct **VWAP First-Pullback Continuation** experiment. Its documented evidence limits include that cited published VWAP claims are based on QQQ/TQQQ, not direct validation of the MNQ variant. Treat it as an existing candidate and audit for overlap before creating another VWAP pullback hypothesis. PR #20 remains a separate open research PR at the time of this snapshot.

## Important new literature — classify evidence correctly

### Published open-access journal article: NQ session ranges and gap midpoint

Sodikov, Loose, van Heeswijk and Machado, “Intraday spillovers across global sessions and machine-learning forecasts of U.S. equity index futures ranges,” *Finance Research Open*, DOI 10.1016/j.finr.2026.100192.

- The study models E-mini Nasdaq-100 (NQ), not MNQ.
- It reports that the London-session range was the top predictor in 15 of 17 models.
- It reports the overnight-gap midpoint was reached by 11:00 ET on 70.26% of trading days (2,825/4,021 including 22 zero-gap days; 70.09% excluding those days).
- Midpoint-touch rates declined as gap size increased.
- This is a descriptive/forecasting finding, not evidence that a particular entry/stop/target strategy is profitable after fees, spread and slippage.
- It motivates the 20 Nov replication hypothesis but must not be represented as validation of that hypothesis.

Source: https://www.sciencedirect.com/science/article/pii/S3050700626001027

### Preprint: MNQ OHLCV falsification

Mathias Mesfin, “Structural Limits of OHLCV-Based Intraday Momentum Signals in MNQ Futures: A Systematic Falsification Study,” arXiv:2605.04004, revised 15 September 2026.

- This is a preprint, not peer-reviewed evidence.
- It evaluates 14 OHLCV signal families on 947 five-minute MNQ sessions from 2021–2025 using expanding-window walk-forward tests.
- Its abstract reports that none passed all stated out-of-sample, trade-count, net-friction and multi-year stability criteria.
- The reported gap-continuation short cleared gross friction in its analysis but failed year-stability and per-fold sample requirements.
- This is an important negative result and a methodology reference, not proof that all possible intraday MNQ strategies fail.
- Any new gap, opening-range, VWAP or liquidity hypothesis must first be compared with its exact definitions to avoid claiming novelty or repeating a failed test.

Source: https://arxiv.org/abs/2605.04004

### Federal Reserve Bank of New York research note: overnight drift decay

Boyarchenko, Larsen and Whelan, “The Disappearing Overnight Drift,” Federal Reserve Bank of New York, Liberty Street Economics, 1 July 2026.

- This is a research note about a particular 02:00–03:00 ET overnight return pattern, not the same thing as opening-gap midpoint touch probability.
- It reports that the earlier overnight drift faded in 2021–2025 and was close to zero; similar fading was observed in NQ and YM.
- It is a caution against assuming historical session effects persist. Quint must test regime decay and update results through time.

Source: https://libertystreeteconomics.newyorkfed.org/2026/07/the-disappearing-overnight-drift/

## Repository and data status snapshot

The following operational details were reported in open PR #21 (“Quint Lab nightly: 19 Nov candles and factory run”). They are **PR-reported claims**, not independently re-run or treated as merged production state:

- The lab reportedly began saving one-minute MNQ candles on 18 Nov 2026, with approximately 2,000 one-minute candles from 18 Nov 11:40 UTC at the time of that report; five-minute coverage was reported from 21 Oct to 19 Nov.
- 1,490 factory variations were reportedly tested and none survived all gates; bot families remained below 30 unseen trades or failed another check.
- Nine paper bots reportedly generated 10 trades since 18 Nov, with combined paper P&L of -$137.
- A five-minute candle mismatch was reported between the TradingView five-minute feed and aggregation from one-minute candles. The report retained the TradingView five-minute feed pending investigation.
- One existing test was pinned to a stale first-read count and failed after the candle set changed; the PR proposed date-bounding that test rather than weakening it.

Implications:
1. Two thousand one-minute bars are nowhere near enough for a reliable multi-year strategy conclusion.
2. Preserve the source five-minute feed and investigate the reported aggregation discrepancy; never silently overwrite or blend data sources.
3. Every dataset needs provenance, contract identity, timestamp/timezone, session/DST treatment, missing-bar audit, granularity and immutable snapshot/hash.
4. For scalping, OHLCV candles are insufficient for credible queue/fill and spread modelling; obtain licensed tick/trade/quote/depth data.
5. For intraday tests, acquire multi-year one-minute data with actual contract mapping and quotes if possible. Five-minute data may support descriptive work but cannot validate a one-minute entry/fill model.
6. Do not present nightly bot factory counts or short paper runs as statistical evidence of edge.

PR #21: https://github.com/charlieaustin1107/Quint/pull/21

## Validation rules — mandatory for every new hypothesis

- Define the hypothesis, exact entry/exit rules, data needs, control/baseline, primary metric and failure criteria before inspecting results.
- Use appropriate data granularity; no tick-level claims from OHLC bars.
- Use actual quarterly contract IDs for execution simulation; document continuous-contract adjustment and roll handling for research.
- Use timezone-aware session definitions and explicit DST, holiday and early-close handling.
- Model commissions, exchange/clearing fees, spread, latency, slippage, partial/no fills, rejected orders and stop gaps. Avoid double-counting spread.
- Use chronological development/validation/untouched holdout splits and rolling/expanding walk-forward tests. Never randomly shuffle time-series observations.
- Report long and short separately; split by year, session, volatility regime, day-of-week and relevant pre-session conditions.
- Report net expectancy, trade count, win rate, PF, average win/loss, maximum drawdown, time under water, MAE/MFE, hold time, cost breakdown, exposure, tail loss and concentration.
- Test parameter neighbourhood stability, best-day/top-1%-trade removal, block bootstrap/confidence intervals, placebo/permutation tests and ablations.
- Set minimum sample requirements before testing. If the sample is too small or uncertainty too wide, label inconclusive rather than successful.
- Compare against simple baselines and controls; a frequent price touch is not itself a tradable edge.
- Test account compatibility independently for each prop-firm plan and stage. Overnight/weekend restrictions, news rules, microscalping limits and drawdown mechanics are hard eligibility gates, not tunable strategy parameters.

## Bot mode parity and safety requirements

- One deterministic strategy definition and canonical signal/risk payload is shared across research, backtest, playback, paper and eventual live adapters.
- Signal-assisted/manual-approval mode displays proposed side, entry, stop, target, sizing, dollar risk, rationale, expiry and invalidation; it cannot submit until the user explicitly approves.
- Fully automated mode requires a separate explicit live authorisation, eligible account/profile and Guardian approval before any order is submitted.
- Both modes pass through the same risk calculations and Guardian controls. Manual approval never bypasses risk checks.
- Strategy status, account compatibility and mode are explicit and versioned. No automatic promotion from backtest or a positive paper session.
- AI is not a source of discretionary position exits and cannot modify open-position risk. Deterministic strategy management continues if the AI service is unavailable.
- Keep research changes in a separate branch/PR. Never modify live execution or Guardian during hypothesis discovery.

## Immediate next actions

1. Audit the full Mesfin preprint and existing Quint gap/liquidity reports for overlap with the 20 Nov gap-midpoint experiment.
2. Verify whether multi-year one-minute MNQ data exists beyond the small sample reported by PR #21. If not, record a data blocker and plan acquisition; do not backtest with insufficient history.
3. Reproduce the existing breakout and VWAP First-Pullback experiments under the same engine/cost model as a separate research task.
4. Continue the rotation with a distinct swing hypothesis next, then multi-week/monthly; do not select only intraday ideas.
5. Keep every result in the dated daily log and link the full research note and draft PR.

## Current work PRs

- PR #19 — Scalping OFI/microprice research note: https://github.com/charlieaustin1107/Quint/pull/19
- PR #20 — VWAP First-Pullback experiment: https://github.com/charlieaustin1107/Quint/pull/20
- PR #21 — Lab nightly data/factory report (reported findings above): https://github.com/charlieaustin1107/Quint/pull/21
- PR #22 — 20 Nov intraday gap-midpoint research: https://github.com/charlieaustin1107/Quint/pull/22

**No strategy is claimed profitable. No code tests, backtests or paper-forward runs were performed as part of this documentation update.**
