# MNQ Swing Research: 55-Day Donchian Breakout with 20-Day Exit

**Date:** 2026-11-20  
**Track:** Swing / multi-day  
**Status:** Research hypothesis only — not backtested, not approved for live trading  
**Priority:** Equal to scalping and intraday; this cycle advances the swing track

## Executive finding

The most defensible swing candidate to test next is a deliberately slow, close-confirmed Donchian breakout: enter after a 55-session high/low breakout, exit on a 20-session opposite-channel close or a 2 × ATR(20) protective stop. The key research question is whether this slower signal survives on Nasdaq futures after realistic execution costs, and whether it is materially more robust than a faster 20/10-day variant.

This is not a claim that the strategy works. The literature is mixed: broad futures research documents time-series momentum, but later work challenges how much of the apparent return comes from volatility scaling; a 2026 preprint argues that short trend horizons have weakened especially in equity-index futures. That is a reason to test a slower specification and benchmark it carefully, not to assume that slower automatically means profitable.

## Evidence review

### 1. Time-series momentum is a research starting point, not a turnkey MNQ edge

Moskowitz, Ooi and Pedersen (2012), *Time Series Momentum*, report positive time-series momentum across 58 liquid futures contracts, with 52 statistically different from zero at the 5% level in their sample. Their strategy uses past 12-month excess returns and volatility scaling across a diversified futures universe. This is not evidence that a single Nasdaq contract, or a 55-day breakout, is profitable today.

Source: https://doi.org/10.1016/j.jfineco.2011.11.003

### 2. Volatility scaling can be mistaken for signal alpha

Kim, Tse and Wald (2016), *Time Series Momentum and Volatility Scaling*, re-examine the futures evidence and find that much of the reported alpha is driven by volatility scaling. They report that unscaled time-series momentum does not outperform an unscaled buy-and-hold benchmark in their analysis, and that the results do not persist in more recent periods. Quint must therefore report both raw one-contract strategy returns and risk-scaled returns, and compare each against a risk-matched long-only benchmark.

Source: https://doi.org/10.1016/j.finmar.2016.05.003

### 3. Recent research is a warning against fast swing trend signals on equity-index futures

Kurth, Eisler, Rej and Bouchaud (2026), arXiv preprint *Is Trend Still Your Friend? A Microstructural Account of the Demise of Short-Term Trend-Following*, study approximately 100 futures contracts over 1995–2025. They report that trend performance for fast signals (days to weeks) weakened materially after approximately 2008/09, with equity-index futures among the more affected groups. Their cross-sectional explanation centres on volatility-normalised tick size and liquidity provision. The work is a preprint, not a settled consensus, and does not establish MNQ-specific strategy performance. It does justify testing a slower breakout against a faster benchmark and splitting results by era and volatility regime.

Source: https://arxiv.org/abs/2607.01550

### 4. MNQ execution and contract mechanics matter

CME specifies MNQ as $2 × the Nasdaq-100 index, with a 0.25-index-point minimum tick worth $0.50 per contract. CME Globex equity-index futures trade nearly 23 hours per weekday with a daily maintenance break. A multi-day backtest must model the maintenance gap, weekend closure, overnight gaps, quarterly contract rolls, and stop fills that can be worse than the trigger price. Do not assume a stop guarantees its trigger price.

Sources:
- https://www.cmegroup.com/articles/faqs/micro-e-mini-equity-index-futures-frequently-asked-questions.html
- https://www.cmegroup.com/markets/equities/sp-500-and-nasdaq-100-futures.html

## Preregistered hypothesis

**H1:** A close-confirmed 55-session Donchian breakout with a 20-session opposite-channel exit and a 2 × ATR(20) initial stop produces positive net expectancy on Nasdaq futures in genuinely unseen data, with acceptable drawdown and without returns being dominated by a small number of exceptional trades.

**H2:** The 55/20 system is more robust than the faster 20/10-day comparator after costs, especially in the post-2010 and 2021-present periods.

**Null / failure:** Neither system has stable positive net expectancy after costs, or any apparent edge disappears after risk-matched benchmark comparison, roll correction, gap-aware stops, or chronological out-of-sample testing.

## Exact primary rules

Use daily CME trading sessions and settlement-based signals. Define each session consistently from the CME Globex session calendar; do not mix RTH-only bars with full-session bars.

1. Calculate the 55-session highest high and lowest low using the **previous 55 completed sessions only**. Exclude the current session from the channel.
2. At the current session's official daily settlement:
   - Long signal if settlement is strictly above the previous 55-session highest high.
   - Short signal if settlement is strictly below the previous 55-session lowest low.
   - Otherwise, no entry signal.
3. Permit only one open position. If flat and a signal is confirmed, enter at the first executable quote after the next Globex session opens (normally 18:00 ET), using actual bid/ask or a conservative marketable-fill model. Never fill at the signal settlement.
4. At entry, calculate Wilder ATR(20) using completed sessions only. Set a hard initial stop 2.0 × ATR(20) from actual entry price. Do not widen it.
5. While long, exit on either:
   - The protective stop being triggered intraday; or
   - A completed daily settlement strictly below the previous 20-session lowest low, with exit at the first executable quote of the next Globex session.
6. While short, mirror the exit rules using the protective stop or settlement strictly above the previous 20-session highest high.
7. If a stop is crossed by a gap, fill at the first realistically executable price after the gap, not at the stop trigger. If stop and another exit condition occur in the same session, the protective stop takes precedence.
8. After an exit, do not immediately reverse on the same signal. A fresh 55-session breakout must occur while flat.
9. No profit target, pyramiding, discretionary override, AI-generated exit, or parameter optimisation in the primary experiment.
10. Run long and short results separately as well as combined.

### Fixed comparator

Run a classic faster **20-session entry / 10-session exit** version with the same settlement confirmation, ATR(20), 2 × ATR initial stop, execution model and risk budget. It is a preregistered comparator, not a parameter search. Also report passive long-only and risk-matched long-only buy-and-hold baselines.

## Data and contract-roll requirements

- Use actual quarterly NQ/MNQ contracts for execution and verify the active contract using a documented roll rule (for example, liquidity crossover with a fixed, causal decision rule). Do not silently splice contracts.
- Use a point-back-adjusted continuous series for historical signal research only, and audit signals around every roll. Re-run with an alternative defensible roll convention.
- MNQ itself has a much shorter history than NQ. Use NQ history to test longer-run signal behaviour, but label it **NQ proxy evidence**, not MNQ execution evidence. Separately report MNQ-only results from its available history. Never combine the two into one unqualified P&L series.
- Minimum inputs: daily OHLC and settlement, official session calendar, contract metadata/roll dates, and intraday trade or 1-minute bid/ask data to model entries and stop gaps. Daily OHLC alone cannot determine whether a stop was executable at its trigger.
- Audit missing sessions, duplicate bars, daylight-saving transitions, holiday/early closes, contract expiry and price adjustment.
- If reliable intraday stop data or enough independent MNQ trades are unavailable, stop and report the limitation; do not fabricate execution precision or pad sample size with synthetic data.

## Validation plan

1. **Data audit first:** quantify date coverage, contract coverage, missing sessions, roll treatment and executable quote coverage. Confirm whether the current Quint data store is adequate before coding.
2. **Chronological split:** reserve the latest 20% as untouched final holdout; use earlier history for development and rolling walk-forward. No random shuffling.
3. **Era splits:** pre-2010, 2010–2020, 2021–present where data permits. Keep NQ proxy and MNQ-native samples separate.
4. **Regime splits:** volatility quartile, trend/range state, long/short, overnight gap size, weekday, and scheduled high-impact macro event days. Labels must be known at entry.
5. **Costs:** actual broker commissions, exchange/clearing fees, bid/ask spread, marketable slippage, stop-gap slippage, and roll costs. Report break-even round-trip cost and stress costs at 1.5× and 2× base.
6. **Risk:** one-contract P&L, risk-normalised returns, max drawdown, drawdown duration, worst trade, worst gap, exposure time, turnover, average win/loss, profit factor, expectancy, Sharpe/Sortino, and margin usage. Do not use volatility targeting to conceal poor raw expectancy.
7. **Concentration:** remove the best trade, best 5 trades, best 1% of trades and best calendar year in separate diagnostics. Report how much total return depends on each.
8. **Robustness:** compare 55/20 with the fixed 20/10 comparator; assess modest neighbouring settings only as secondary diagnostics, not a grid-search winner. Use block bootstrap or another dependence-aware uncertainty estimate.
9. **Benchmark:** compare with long-only NQ/MNQ exposure and a risk-matched long-only baseline. A short-only system must stand on its own; do not hide short-side losses inside combined results.
10. **Prop-firm compatibility:** strategy validity and account eligibility are separate. A position held across the daily close or weekend is incompatible with any plan requiring flat-by-close, even if the broker permits the market to remain open. Record the exact account plan, forced-liquidation time, overnight/weekend/news rules, drawdown method, margin and payout conditions. Re-check the firm's own current rules before any account is authorised.
11. **Known LucidFlex constraint:** Lucid Trading's current official Allowed Trading Times page says LucidFlex positions must be closed by 4:45 PM Eastern, are automatically closed by Lucid, and trading resumes at 6:00 PM Eastern; its FAQ explicitly says overnight holding is not permitted on simulated Pro/Flex/Direct accounts. Therefore this exact multi-day hold strategy is **not compatible with LucidFlex evaluation or simulated funded accounts**. A separate flat-by-close adaptation would be a different strategy and must be preregistered and tested separately. Source: https://support.lucidtrading.com/en/articles/11404729-allowed-trading-times and https://lucidtrading.com/general-faq/

## Acceptance criteria

A candidate may progress to forward simulation only if all are true:
- Positive net expectancy on the untouched holdout after realistic costs.
- The edge is not explained by one or a few exceptional trades, one year, or one side only.
- Drawdown and drawdown duration fit a predeclared risk budget.
- Results are directionally stable across walk-forward windows and reasonable cost stress.
- The result beats or adds value to the risk-matched benchmark, not merely a cash benchmark.
- MNQ-native evidence is reported separately and sample size is sufficient for the intended claim.
- The exact intended account plan permits the holding period.

Reject or keep research-only if any criterion fails. A good NQ proxy result alone is not permission to run an MNQ bot live.

## Operational implications for Quint

- This is a **swing research strategy**, not a default fit for an intraday prop evaluation.
- It can first be implemented as a research-only strategy and signal-assisted alert. Manual approval must still pass Guardian checks; approval must not bypass account eligibility.
- Fully automated order routing requires explicit per-account live authorisation and Guardian approval. No research branch should alter Guardian, OrderRouter, kill switches or live execution.
- Store the strategy's exact session calendar, roll mapping, indicator warm-up, signal timestamp, executable entry timestamp, stop model and data provenance with every run.
- AI may help explain and review results, but signal generation, position sizing, stops and safety controls must remain deterministic and testable.

## Claude Code / Fable implementation prompt

> Work only in Quint's research/backtest area. First inspect the existing strategy research harness, data adapters, contract metadata, session calendar, roll handling and previous MNQ experiments. Read the existing research notes before changing anything; do not duplicate the gap-midpoint, OFI/microprice, VWAP or existing breakout experiments.
>
> Implement a research-only, deterministic test for the exact 55-session Donchian entry / 20-session opposite-channel exit / 2 × Wilder ATR(20) initial stop specification in this note, plus the fixed 20/10 comparator and stated benchmarks. Use only completed prior sessions for channel values and completed data for ATR. Signal at settlement; execute at the first realistic quote after the next Globex open. Model stops with intraday data and adverse gap fills. Use actual quarterly contracts for execution; keep NQ proxy and MNQ-native results separate.
>
> Before implementing, report whether the available data can support the experiment. If required daily settlement, contract-roll or intraday stop/quote data are missing, stop and document the exact missing inputs. Never synthesize missing history or pretend OHLC fills are executable.
>
> Add tests for channel lookback exclusion, no lookahead, signal/entry timestamp separation, Wilder ATR warm-up, long/short symmetry, stop gap fills, stop precedence, roll boundaries, DST, holiday/early-close sessions and one-position-only behaviour. Add deterministic fixtures for edge cases.
>
> Produce a reproducible report with chronological walk-forward and untouched holdout, NQ-proxy versus MNQ-native separation, long/short splits, regime splits, costs and cost stress, risk-matched benchmarks, concentration tests, drawdown and dependence-aware uncertainty. Report sample counts and confidence intervals. Do not optimise a grid or select the best parameter after viewing the holdout.
>
> Do not claim profitability unless every acceptance criterion in the note passes. If sample size is insufficient, report inconclusive. Do not touch Guardian, OrderRouter, account rules, kill switches, broker execution or live-mode code. Do not enable live trading. Create a reviewable branch/PR and include exact files changed, tests run, data limitations and a concise Claude handoff summary.

## Current conclusion

**Research priority: medium-high. Evidence strength for this exact MNQ setup: unknown.** The academic evidence supports testing time-series trend, but it also gives strong reasons to distrust short-horizon extrapolation and volatility-scaled headline returns. The 55/20 system is a disciplined candidate because it is slow, mechanically defined and falsifiable. It is not yet a Quint strategy recommendation, and it is not compatible with LucidFlex simulated accounts because Lucid requires positions to be flat by 4:45 PM ET and prohibits overnight holding. Any daily-flat adaptation is a separate hypothesis.
