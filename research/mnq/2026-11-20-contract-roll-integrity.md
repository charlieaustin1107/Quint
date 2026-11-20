# MNQ research note — contract-roll and continuous-series integrity

**Date:** 20 November 2026  
**Experiment ID:** MNQ-DATA-ROLL-001  
**Type:** Critical data-integrity test  
**Status:** Specification only — no MNQ result, no strategy approval

## Question

Can Quint's MNQ backtests select the contract that was actually tradable at each point in history, using only information that was available at that time, without letting a synthetic continuous-price series create false signals or fills?

This is a prerequisite for evaluating every MNQ strategy, not a new claim of trading alpha.

## What the sources establish

1. **MNQ is a quarterly contract.** CME states Micro E-mini Nasdaq-100 futures follow the March, June, September and December cycle, expiring against the index opening value on the third Friday. MNQ's outright tick is 0.25 index points, worth $0.50 per contract. [CME Micro E-mini FAQ](https://www.cmegroup.com/articles/faqs/frequently-asked-questions-micro-e-mini-equity-index-futures.html) · [CME expiration guide](https://www.cmegroup.com/education/courses/micro-e-mini-futures/managing-micro-e-mini-futures-expiration).

2. **There is no single universal continuous-contract roll rule.** CME's Continuous Price Series documentation distinguishes a front contract (nearest expiry, rolling two business days before expiry) from an active contract (chosen to follow each asset's liquidity profile). Important limitation: the published product coverage list on that page does not include NQ/MNQ. Treat its methodology as a reference, not as an official MNQ continuous feed or MNQ-specific roll calendar. [CME Continuous Price Series](https://www.cmegroup.com/market-data/cme-group-continuous-price-series.html) · [Calculation Guide, version 1.0, 3 Nov 2025](https://www.cmegroup.com/market-data/files/understanding-the-price-series.pdf).

3. **A volume/OI mapping can be made causal.** Databento documents continuous symbols as mappings to actual listed instruments, returning original unadjusted prices. Its volume ranking uses the previous day's trading volume; its open-interest ranking uses the previous day's close. That is materially safer than choosing the contract using the current day's final volume while pretending the decision was known earlier. [Databento symbology](https://databento.com/docs/conventions/symbology) · [continuous-contract example](https://databento.com/docs/examples/symbology/continuous).

4. **Back-adjusted series are synthetic.** QuantConnect documents that its continuous-futures normalization uses the entire futures history to adjust historical prices. That can make historical absolute levels dependent on later roll information. It may be useful for some long-horizon indicators, but it is not an executable price history. Quint must never simulate entries, stops, targets or fills at a synthetic adjusted price. [QuantConnect futures documentation](https://www.quantconnect.com/docs/v2/writing-algorithms/universes/futures).

5. **The exchange offers the required raw data types.** CME DataMine lists futures Market by Order and PCAP datasets; CME's historical-data pages also list trades, top-of-book and market depth. These are possible source routes, subject to licensing and cost. MBO is not necessary for this market-entry/stop/target sentinel unless Quint later models passive queue position. [CME DataMine](https://www.cmegroup.com/datamine.html) · [CME historical data overview](https://www.cmegroup.com/market-data/real-time-and-historical-data.html).

## Frozen test design — MNQ 5-minute opening-range sentinel

This is a deliberately simple diagnostic strategy to expose contract-selection and fill-data problems. It is **not** being proposed as a profitable bot.

### Instrument and clock

- Trade one actual MNQ quarterly expiry at a time; retain the raw contract symbol and instrument ID for every bar and fill.
- Use `America/New_York` for all rule evaluation. Display UK time only after timezone conversion; never hard-code a UK/US offset.
- RTH session: 09:30:00–16:00:00 New York time. No overnight positions.
- One trade maximum per session; no new entry after 11:30:00; mandatory flat at 15:55:00.
- Exclude exchange holidays and early-close sessions unless their official session schedule is explicitly modelled.

### Signal, entry, stop and target

- Build one-minute bars separately for each expiry contract from trade prints.
- Opening range is the high and low of trades from 09:30:00 through 09:34:59 New York time on the selected contract.
- From 09:35:00 through 11:30:00, take the first completed one-minute close at least one MNQ tick (0.25 points) above the opening-range high for a long, or at least one tick below the opening-range low for a short.
- If both sides are crossed within the same one-minute bar and tick ordering is unavailable, skip the session rather than choose the favourable direction.
- Enter at the first executable quote after the completed signal bar: buy at the ask, sell at the bid, plus adverse slippage. Never fill at the signal bar's close.
- Long stop: one tick below the opening-range low. Short stop: one tick above the opening-range high. Skip if the entry is already through the stop or the stop distance is less than two ticks.
- Target: fixed 2R from the actual entry fill to the initial stop distance. No scale-outs, breakeven changes or trailing.
- Target execution: model it as a resting limit. Without MBO/queue data, count a fill only after a trade prints at least one tick through the target, then fill at the target price; do not assume a queue fill on a touch. MBO is needed only if Quint wants queue-position accuracy.
- Exit on stop, target, or 15:55 New York time, whichever occurs first. If tick ordering is unavailable and OHLC suggests both stop and target were touched, assume the stop first.

### Regime and event labels

Do not tune the strategy by regime. Label each session before evaluating results:
- Roll window: ten CME business sessions before expiry through two CME business sessions after expiry.
- Non-roll: all other eligible sessions.
- Volatility: low / middle / high tercile of prior 20 completed RTH-session ATR(14), calculated only from data available before the current session.
- Opening gap: absolute 09:30 open versus prior RTH 16:00 close, reported in fixed bins of <0.25%, 0.25–0.50%, and >0.50%.

### Mapping policies to compare

For each CME trade date, record the selected contract, the information timestamp and the reason for the selection.

A. **Calendar reference:** switch from the nearest-expiry contract to the next quarterly contract at the start of the Globex trade date (18:00 New York time) two CME business days before the expiring contract's third-Friday expiry. This mirrors CME's documented *front-series timing concept*; it is a test convention, not a claim that CME publishes this exact MNQ rule.

B. **Prior-trade-date volume:** switch only after the previous completed CME trade date's total volume in the deferred contract exceeds the front contract's volume. Apply the change at the next Globex trade-date start (18:00 New York time). Run a two-consecutive-session confirmation as a pre-registered sensitivity check. Never use the current session's final volume to select the contract for that same session.

C. **Published open interest:** switch only after an officially published open-interest observation shows deferred-contract OI above front-contract OI. Apply it at the first Globex session start after the publication timestamp. Run a two-report confirmation as a pre-registered sensitivity check. Do not assume the date labelled on an OI observation is the time it became available.

All three methods must use only standard quarterly MNQ expiries and must retain every historical contract that was actually listed. If a required volume/OI observation is missing, do not silently forward-fill it; mark the mapping unknown and exclude or separately report that session.

## Data granularity and execution costs

- **Signal:** one-minute OHLCV can screen the opening-range rules, but only if each bar is from the selected raw expiry and volume is not mixed across contracts.
- **Mapping:** contract definitions/expiry dates plus daily per-contract volume and timestamped published OI.
- **Fills:** trade ticks plus historical bid/ask (top-of-book) are required for credible market-entry and stop execution. MBO is optional for a later queue-position model; do not claim queue-accurate limit fills without it.
- **Base cost:** existing Quint assumption of $0.50 commission per side plus one adverse tick each way. For one MNQ round trip this is $1 commission + $1 slippage = **$2.00**, before any additional exchange/clearing fees not already included.
- **Stress:** two adverse ticks each way = $1 commission + $2 slippage = **$3.00** per round trip, again adding any separately billed fees. Verify all-in charges against the user's actual broker statement before calling this account-realistic.
- Use bid/ask spread as observed, not as a hidden zero-cost assumption. Apply adverse gap fills for stop-market orders.

## Sample, splits and controls

- Target data coverage: May 2019–19 November 2026, including expired contracts and at least 20 quarterly expiry events.
- Minimum evidence gate: 500 completed sentinel trades overall; at least 150 roll-window trades across at least 20 distinct expiries; and at least 200 trades in the untouched holdout, including 40 roll-window trades. If the data cannot meet these counts, report **inconclusive**, not a pass.
- Chronological split: 2019–2022 development; 2023–2024 validation; 2025–19 Nov 2026 untouched holdout. Also run expanding 24-month train / 6-month test walk-forward windows. Do not tune on the final holdout.
- Primary comparison: calendar reference versus prior-volume versus published-OI mapping, with identical signal rules and cost model. Include a no-trade ($0) baseline and a matched random-direction/time placebo.
- Pre-register sensitivity only: opening-range length 5 versus 15 minutes; breakout buffer 0/1/2 ticks; target 1.5R/2R/2.5R; volume/OI confirmation one versus two completed observations. Report the full grid; do not promote the best cell.
- Report net expectancy in points and dollars, PF, win rate, trade count, max drawdown, spread/slippage, mapping switch date, selected contract, signal divergence, roll-window versus non-roll results, year, volatility, gap and direction splits. Use paired session-level and expiry-event bootstrap intervals for differences between mapping methods.
- Check missing expiries, duplicate timestamps, stale quotes, volume aggregation, trade-date boundaries, daylight-saving transitions, early closes, and any symbol/instrument-ID reuse. Do not use today's front-month history as if it were known in the past.

## Look-ahead, survivorship and adjustment risks

- **Look-ahead:** same-day final volume, revised OI, or a future roll calendar can leak information. Store `available_at` separately from `observation_date`; contract selection must be replayable from the data that existed at the decision timestamp.
- **Survivorship:** include expired quarterly contracts and historical definitions. Do not reconstruct history only from currently listed contracts or drop an expiry because its data is inconvenient.
- **Back-adjustment:** keep raw expiry prices as the source of truth. If a provider's adjusted series is used for chart continuity or indicators, store the provider, method and adjustment factors; prove that future roll information cannot change past decisions. Never use adjusted levels for order prices, tick distances or realised P&L.
- **Roll execution:** this sentinel is flat daily, so it does not model the cost of carrying a position through a roll. Any swing strategy must separately simulate closing the old expiry and opening the new one, including spread, fees and basis.

## Current finding and decision

The source review establishes that roll rules differ and can be causal when they use prior, timestamped volume/OI. It also establishes that a continuous series may be synthetic or mapped to different actual contracts. **No MNQ performance result has been generated in this run** because the actual historical per-expiry MNQ dataset and OI publication timestamps have not been audited or supplied. This is a data-integrity specification, not evidence of a trading edge.

**Decision:** add contract mapping and raw-price provenance as a mandatory Quint backtest gate. Do not promote or reject any strategy from this note alone.

## Next experiment

Audit the actual Quint MNQ files and build a contract manifest (expiry, symbol, instrument ID, timestamp range, timezone, bar/trade schema, volume, quote and OI availability). Then replay this frozen sentinel across the three mapping policies and publish a roll-by-roll divergence report before rerunning VWAP or breakout strategies.

## Sources

- CME Group, [Micro E-mini Equity Index Futures FAQ](https://www.cmegroup.com/articles/faqs/frequently-asked-questions-micro-e-mini-equity-index-futures.html).
- CME Group, [Managing Micro E-mini futures expiration](https://www.cmegroup.com/education/courses/micro-e-mini-futures/managing-micro-e-mini-futures-expiration).
- CME Group, [Continuous Price Series](https://www.cmegroup.com/market-data/cme-group-continuous-price-series.html) and [Calculation Guide (3 Nov 2025)](https://www.cmegroup.com/market-data/files/understanding-the-price-series.pdf).
- Databento, [Symbology](https://databento.com/docs/conventions/symbology) and [Continuous contracts example](https://databento.com/docs/examples/symbology/continuous).
- QuantConnect, [Futures universe and normalization documentation](https://www.quantconnect.com/docs/v2/writing-algorithms/universes/futures).
- CME Group, [DataMine](https://www.cmegroup.com/datamine.html) and [historical/real-time data overview](https://www.cmegroup.com/market-data/real-time-and-historical-data.html).

## Ready-to-paste Claude Fable prompt

Read `research/mnq/2026-11-20-contract-roll-integrity.md`, `research/mnq/STRATEGY-RESEARCH-PROGRAMME.md`, `quint-control/PLAN.md` and the existing backtest code/data before changing anything.

Work only on a separate research branch. This is a data-integrity task, not a live strategy build.

1. Audit every available MNQ historical file. Produce a contract manifest with raw symbol, instrument ID, expiry, source, timestamp range, timezone, schema, bar interval, trade volume, bid/ask, daily volume, OI observation date and actual availability timestamp. Identify missing expiries and files that are continuous or back-adjusted rather than raw.
2. Do not infer missing contract data or invent OI publication times. If the available dataset cannot support the test, stop after the audit and give the exact missing data and likely source/licensing requirement.
3. Implement the three frozen mappings from the note: calendar two-business-day reference, previous-trade-date volume, and timestamped published OI. Contract choice must be determined only from information available at the mapping decision time. Add tests proving same-day final volume and future OI cannot affect earlier mappings.
4. Keep raw expiry bars and actual contract fills authoritative. Never fill or calculate realised P&L on back-adjusted continuous prices. If an adjusted series is present, add a diagnostic that records its provider/method and compares signal decisions with raw-contract decisions without treating the adjusted prices as tradable.
5. Implement the frozen one-minute 5-minute-opening-range sentinel exactly as documented, with bid/ask-aware entries, adverse stop fills, conservative stop/target ordering, Lucid cost assumptions and stress costs. Keep it as a research harness, not a production bot.
6. Compare the three mapping policies, no-trade baseline and matched random placebo. Report roll-window/non-roll, expiry-event, year, volatility, gap, long/short, mapping-switch date, signal divergence and net-cost results.
7. Use the chronological development/validation/untouched holdout split and walk-forward windows in the note. Run the pre-registered sensitivity grid without selecting a winning cell. If sample gates are not met, label the result inconclusive.
8. Add deterministic tests for expiry calendars, trade-date boundaries, DST, missing volume/OI, publication-time causality, contract changes, duplicate/missing bars, stop/target collisions and no synthetic fills. Run the relevant suite three times and report exact commands and totals. Do not claim tests passed unless run.
9. Update the strategy research programme, Quint PLAN, FABLE-PROMPTS and STATUS so the data-integrity rule is consistent. Keep all changes reviewable in this PR.
10. Do not modify live NinjaTrader execution, Guardian, OrderRouter, kill switches, account settings or Go Live controls. Do not merge to main or enable live trading.

Return the data audit first, then the implementation/test report and plain-English conclusion. Never claim profitability from this sentinel or from an unverified continuous series.
