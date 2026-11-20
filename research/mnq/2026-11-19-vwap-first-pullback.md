# MNQ research note — VWAP first-pullback continuation

**Date:** 19 November 2026  
**Experiment ID:** MNQ-VWAP-FPC-001  
**Status:** Hypothesis / Testing only — not implemented as a trading bot, not backtested on MNQ, and not approved.

## Question

Can a low-frequency, first-pullback-to-session-VWAP continuation rule retain useful directional information while avoiding the repeated reversals and turnover of the simple “long above VWAP / short below VWAP” crossover?

This is a new, falsifiable hypothesis. There is no verified evidence that it makes money on MNQ.

## What the existing evidence actually says

1. **Published claim, different instrument:** Zarattini and Aziz's 2023 SSRN working paper, *VWAP: The Holy Grail for Day Trading Systems*, tests QQQ and TQQQ ETFs from 2018 to 2023. It reports a 671% QQQ return and Sharpe 2.1 for a simple 1-minute close/VWAP crossover. It is a posted working paper, not proof of an MNQ futures edge. [Paper / DOI](https://doi.org/10.2139/ssrn.4631351).
2. **Independent replication is mixed:** a QuantConnect community thread documents a reproduction attempt, sensitivity to the minimum distance filter, and disagreement about how closely the paper can be reproduced. A later config-matched LEAN report says in-sample behaviour can be reproduced, but out-of-sample performance weakens and realistic costs materially reduce the result. These are QQQ replications, not MNQ tests. [QuantConnect discussion](https://www.quantconnect.com/forum/discussion/16706/bear-bull-traders-039-paper-on-quot-the-holy-grail-quot-not-so-fast/) · [reproduction report](https://www.quantconnect.cloud/backtest/b115d0894231d55994b1068202f6c0ae).
3. **Do not confuse VWAP execution with VWAP alpha:** academic work on optimal execution to target VWAP studies how to execute an order against a benchmark; it does not establish that trading above or below VWAP predicts futures returns. [Cartea & Jaimungal, SIAM Journal on Financial Mathematics](https://doi.org/10.1137/16M1058406).

**Conclusion:** the original crossover is worth reproducing as a baseline, but the headline ETF result must not be transferred to MNQ. The first-pullback variant below remains an untested hypothesis.

## Frozen strategy specification — VWAP First-Pullback Continuation v1

### Instrument, session and clock

- Instrument: one MNQ contract, using the actual listed expiry being traded.
- Signal bars: 1-minute bars, built from completed data only.
- Session VWAP: reset at 09:30:00 America/New_York each regular trading day; use only trades from that session, not overnight volume.
- Entry window: 09:45:00 to 13:00:00 New York time, inclusive by signal timestamp.
- Mandatory flat time: 15:55:00 New York time; no overnight positions.
- Use the IANA America/New_York timezone and convert to UK time for display. Never hard-code a UK/US offset; their daylight-saving change dates differ.
- Apply the existing LucidDaily high-impact USD news blackout from the Quint firm preset: no new entry inside the configured 2-minute either-side window, and flatten before the blackout begins.

### VWAP calculation

Use true trade-level VWAP:

VWAP(t) = sum(price_i × volume_i) / sum(volume_i), for all eligible session trades through time t.

The production-quality test must calculate it from timestamped trade prints. A 1-minute HLC3 × volume approximation may be used only for an initial screening run and must be labelled approximate; it cannot support approval.

### Long setup

1. Wait for three consecutive completed 1-minute bars whose closes are each at least 2 MNQ ticks above that bar's completed session VWAP.
2. The latest completed VWAP must be at least 1 tick above the VWAP from five completed 1-minute bars earlier.
3. After that trend condition is established, look for the first pullback within the next 15 completed bars.
4. A pullback-touch bar has a low at or below its own VWAP + 2 ticks, and closes no more than 2 ticks below its own VWAP.
5. Within the next five completed bars, confirmation is the first bullish bar that closes above the previous bar's high and above its own VWAP.
6. Enter long at the next bar's open, with the normal adverse slippage assumption. If that next open is at or below the planned stop, skip the trade.
7. If the first pullback setup fails or expires, do not take a later setup that day. Maximum one trade per session.

### Short setup

Mirror every long condition:

1. Three consecutive completed 1-minute closes at least 2 ticks below their own VWAP.
2. Latest VWAP at least 1 tick below its value five completed bars earlier.
3. First pullback within the next 15 completed bars.
4. Pullback-touch bar high at or above VWAP − 2 ticks and close no more than 2 ticks above VWAP.
5. Within five completed bars, first bearish bar closing below the previous bar's low and below its own VWAP.
6. Enter short at the next bar's open; skip if that open is at or above the planned stop.
7. One trade maximum per session.

### Invalidation, stop, target and exits

- Before confirmation, invalidate a long if a completed bar closes more than 2 ticks below its VWAP; invalidate a short if it closes more than 2 ticks above VWAP.
- Initial long stop: one tick below the lowest low from the pullback-touch bar through the confirmation bar. Short stop: one tick above the highest high over the same bars.
- Target: fixed 2R, calculated from the actual entry fill to the initial stop.
- No scale-outs, breakeven moves or trailing stop in v1.
- Exit on the first of: stop, 2R target, 30 minutes after entry, the news blackout's required flatten time, or 15:55 New York.
- If a bar's high/low appears to touch both stop and target and tick ordering is unavailable, assume the adverse outcome. Never award the target by choosing a favourable intrabar path.
- A stop is mandatory. The engine/Guardian remains responsible for account risk sizing and all firm controls; the strategy must not override them.

## Data and execution requirements

- **Signal data:** timestamped trade prints plus 1-minute OHLCV. True VWAP needs trade price and volume; HLC3 × volume is only a proxy.
- **Fill data:** historical bid/ask quotes and trade ticks are preferred. Use tick/second sequencing to resolve stop/target order and entry timing. Market-by-order depth is not required for this market-entry/stop/target hypothesis; it becomes necessary only if a later variant depends on queue position or passive limit fills.
- CME DataMine lists futures datasets including Market by Order and PCAP. This is a primary-source route for high-granularity research data, but licensing and cost must be checked before purchase. [CME DataMine](https://www.cmegroup.com/datamine.html).
- Do not calculate a signal from a bar's final VWAP and then pretend the entry occurred earlier inside that same bar. A completed-bar signal may only enter on the next bar/tick.
- Use actual expiry contracts. Record the roll rule and dates; never execute fills on a back-adjusted continuous series. A candidate roll rule for the test is to switch to the next quarterly contract only after its daily volume exceeds the current contract's volume for two consecutive sessions. Verify every roll and retain the raw contract data.
- Deduplicate timestamps, validate missing bars and volume, use exchange-local session dates, and explicitly test US/UK DST transition weeks and early-close holidays.

## Costs — match the account, not a generic broker quote

Lucid's official approved-products table lists MNQ commission at **$0.50 per side per contract**. One round trip therefore costs $1.00 in commission. CME defines MNQ as $2 per index point with a 0.25-point minimum tick, worth **$0.50 per tick**. Quint's current base assumption of one adverse tick on entry and one on exit adds another $1.00 round trip. The initial model is therefore **$2.00 round-trip friction per MNQ**, before any additional execution deterioration. [Lucid commissions](https://support.lucidtrading.com/en/articles/11508978-approved-products-and-commissions) · [CME MNQ specifications](https://www.cmegroup.com/markets/equities/sp-500-and-nasdaq-100-futures.html).

Run a stress case with **2 ticks adverse slippage per side** (total friction $3.00 round trip including commission). If bid/ask quote fills already include crossing the spread, do not add the spread a second time; report the fill convention explicitly. Keep Lucid's $0.50 commission separate from Tradovate's retail brokerage price schedule.

NinjaTrader's default Standard historical fill processing approximates intrabar movement with virtual bars; High resolution can use a more granular secondary series, and a 1-tick series is possible. Do not treat Standard 1-minute OHLC fills as definitive for this strategy. [NinjaTrader historical fill processing](https://static.ninjatrader.com/support/helpGuides/nt8/understanding_historical_fill_.htm).

## Test plan — preregister before looking at results

1. **Reproduce the baseline first:** implement the paper's simple 1-minute VWAP crossover on MNQ as a separate reference strategy: choose long/short after the first completed RTH minute, reverse on each completed 1-minute close crossing VWAP, and flatten before the RTH close. Use the same data and costs as the candidate. Do not silently modify the published rule.
2. **Test FPC v1 exactly as frozen above.** No parameter optimisation on the final holdout.
3. **Data period:** use all clean MNQ history available from the contract's listing onward, target May 2019–19 Nov 2026. Proposed chronological split: development 2019–2022, validation 2023–2024, untouched holdout 2025–19 Nov 2026. If the available dataset does not cover these dates, report the actual dates and do not substitute another instrument without approval.
4. **Walk-forward:** run rolling 24-month development / 3-month forward test windows through the development and validation period. Freeze the final rule before opening the 2025–2026 holdout.
5. **Minimum evidence:** target at least 500 total completed trades and 150 untouched-holdout trades. If the one-trade-per-day rule produces fewer, mark the evidence underpowered; do not loosen the rules to manufacture sample size.
6. **Baselines and controls:** compare against the exact VWAP crossover baseline and a time-of-day/direction-matched random-entry placebo with identical stop, target, exits and costs. Ablate the slope filter and the three-close trend confirmation one at a time.
7. **Sensitivity, not optimisation:** report (without selecting the best) pullback tolerances of 1, 2 and 4 ticks and VWAP slope lookbacks of 3, 5 and 10 completed bars. The frozen primary remains 2 ticks and 5 bars.
8. **Regimes:** report long/short, year, entry-time bucket, opening-range size relative to the prior 20-session median, overnight gap size, and realised-volatility quartile. These are reporting labels only; do not add regime filters after seeing results.
9. **Metrics:** net expectancy in points and dollars, profit factor, win rate, max drawdown, average win/loss, MAE/MFE, trades per session, exposure time, cost as a share of gross P&L, worst day, best-day share of total profit, year-by-year results and bootstrap confidence intervals. Remove the best day and top 5% of trades as fragility checks.
10. **Execution realism:** test market entry at the next tradable price, bid/ask crossing, one- and two-tick adverse slippage, stop gaps, partial fills where data supports them, and stop/target collisions. Report what the data cannot model.
11. **Paper-forward gate:** after historical evidence, run isolated live-market paper for at least 30 trading sessions and 50 completed paper trades (whichever takes longer), then compare signal timestamps and realistic simulated fills against the historical model. Stale data must stop new paper entries.

The experiment stays **Testing** unless it has positive untouched-holdout net expectancy after costs, credible uncertainty bounds, stable results across years and regimes, no single-day dependency, an acceptable LucidDaily Monte Carlo drawdown result (25% maximum bust probability under the existing plan), and consistent forward-paper behaviour. Passing this research gate is not permission to trade live.

## What would falsify the idea?

Reject or pause it if the holdout expectancy is non-positive after costs; if the placebo performs similarly; if the result disappears under 2-tick-per-side slippage; if one day or a small group of trades accounts for most profit; if long and short results are unstable; or if realistic tick sequencing removes the apparent edge.

## Next experiment

First reproduce the simple VWAP crossover on MNQ with Lucid costs and realistic fills. Then test FPC v1 on the exact same contracts, dates and assumptions. Do not implement a production C# bot until the reference results and evidence report exist.

## Sources

- [Zarattini & Aziz (2023), SSRN 4631351 — VWAP: The Holy Grail for Day Trading Systems](https://doi.org/10.2139/ssrn.4631351) — posted working paper, QQQ/TQQQ, not MNQ.
- [QuantConnect community replication discussion](https://www.quantconnect.com/forum/discussion/16706/bear-bull-traders-039-paper-on-quot-the-holy-grail-quot-not-so-fast/) — independent implementation debate and sensitivity warnings.
- [QuantConnect config-matched reproduction report](https://www.quantconnect.cloud/backtest/b115d0894231d55994b1068202f6c0ae) — reports weaker out-of-sample results and cost sensitivity on QQQ; not an MNQ validation.
- [Cartea & Jaimungal, A Closed-Form Execution Strategy to Target VWAP](https://doi.org/10.1137/16M1058406) — VWAP execution benchmark research, not directional-alpha evidence.
- [Lucid Trading — Approved Products and Commissions](https://support.lucidtrading.com/en/articles/11508978-approved-products-and-commissions) — MNQ $0.50 commission per side.
- [CME Group — Equity futures contract information](https://www.cmegroup.com/markets/equities/sp-500-and-nasdaq-100-futures.html) — MNQ multiplier and tick value.
- [CME Group DataMine](https://www.cmegroup.com/datamine.html) — historical futures datasets, including MBO and PCAP.
- [NinjaTrader — Understanding Historical Fill Processing](https://static.ninjatrader.com/support/helpGuides/nt8/understanding_historical_fill_.htm) — Standard/High fill resolution and granular secondary data series.
