# 2026-11-19 — Scalping hypothesis: MNQ top-of-book OFI + microprice

**Status:** Research hypothesis only. Not backtested; not approved for paper or live trading.  
**Track:** Scalping (first rotation). Next rotation: intraday.  
**Question:** Does short-horizon order-flow imbalance (OFI), confirmed by microprice skew, predict MNQ continuation over 5–30 seconds strongly enough to survive executable costs and the intended prop-account rules?

## Why this is worth testing

- Cont, Kukanov and Stoikov's peer-reviewed *Journal of Financial Econometrics* paper finds a short-horizon relationship between best-bid/ask order-flow imbalance and price changes, with impact related to market depth. Their empirical sample is 50 NYSE stocks, not MNQ, so this is a mechanism to test rather than proof of an MNQ edge.
- Fung and Yu's peer-reviewed 2007 *Journal of Futures Markets* paper finds that cash-equity order imbalance affects index-futures price dynamics. It supports studying order imbalance around index futures, but it does not validate this exact MNQ own-book signal.
- CME's MDP 3.0 documentation distinguishes aggregate Market-by-Price (MBP) books from individual-order Market-by-Order (MBO) feeds. CME also describes historical market-depth data with order-book, quote and time-and-sales information. This is the data class required; ordinary candles cannot reproduce the feature or credible fills.
- **Critical repo finding:** `backtest/README.md` currently documents TradingView OHLCV candles (15m, 5m and daily) and no quote/order-book event history. The existing dataset cannot test this hypothesis. Do not substitute candles or synthetic order books.

## Exact hypothesis and rules to preregister

### Instrument, hours and eligibility

1. Trade/replay the actual active quarterly MNQ contract, not a back-adjusted continuous symbol. Preserve the contract identifier and roll dates.
2. Initial test window: 09:35–15:55 America/New_York, Monday–Friday. Split results into open, midday and close rather than selecting the best period after seeing results.
3. Apply the intended account's scheduled-news restrictions as a hard eligibility filter. The current Quint repo notes a LucidDaily red-folder flat window of two minutes either side; re-verify the exact live account terms before using that preset.
4. One MNQ contract, one position at a time, no pyramiding or averaging down. This is a research sizing assumption, not live permission.
5. The current Quint Control status records a planned 30-second minimum-hold rule, while Guardian implementation is still a later build phase. Reconcile this before account-specific testing: a minimum-hold gate must never delay a protective stop, emergency flatten, firm-required exit or loss-of-protection response. If the intended account's rules or eventual Guardian semantics conflict with this strategy's immediately active bracket, mark the strategy ineligible for that account. The 30-second cooldown after an exit is separate from any minimum position-hold rule.

### Signal definition

Use sequenced, timestamped best-bid/best-ask price and displayed quantity updates. For each book event n, calculate the standard best-level OFI contribution:

`e_n = 1(P^B_n >= P^B_{n-1})q^B_n - 1(P^B_n <= P^B_{n-1})q^B_{n-1} - 1(P^A_n <= P^A_{n-1})q^A_n + 1(P^A_n >= P^A_{n-1})q^A_{n-1}`

Where P^B/P^A are best bid/ask prices and q^B/q^A are displayed quantities after the event. For each completed, non-overlapping five-second bucket:

- Sum event contributions to obtain OFI_5s.
- Divide by the median of (best-bid quantity + best-ask quantity) observed in that same bucket, producing depth-normalised OFI.
- Calculate its z-score against the preceding 60 minutes of completed five-second buckets only; exclude the current bucket from the baseline.
- Calculate microprice = (ask price × bid quantity + bid price × ask quantity) / (bid quantity + ask quantity), and midprice = (best bid + best ask) / 2.
- Require a valid, non-crossed book and spread no wider than one MNQ tick (0.25 index points).

**Long signal:** normalised OFI z-score >= +2.0 and microprice - midprice >= +0.10 tick.  
**Short signal:** normalised OFI z-score <= -2.0 and microprice - midprice <= -0.10 tick.  
**Pre-registered threshold sensitivity only:** repeat at absolute z-score thresholds 1.5 and 2.5; do not search a wider grid or tune on the holdout.

Generate a signal only at the close of a completed five-second bucket. Submit no more than one entry per signal bucket; ignore new signals while a position is open and apply a 30-second cooldown after exit.

### Entry, exit and execution simulation

- Entry: marketable IOC order in the signal direction, evaluated against the reconstructed book at a declared 50 ms decision-to-arrival latency. Walk available displayed depth; record partial fills, no-fills and rejected orders. Run 10 ms and 100 ms as latency sensitivity cases, not as tuning opportunities.
- Bracket from volume-weighted average entry fill: 6-tick protective stop and 12-tick profit target. Both are active immediately; the hard stop is never delayed to satisfy a minimum-hold or prop-firm rule.
- Time exit: close any remaining position after 30 seconds using executable opposite-side liquidity.
- If stop and target appear to trigger in the same timestamp group, resolve using the actual sequenced events. If event ordering cannot be established, use the adverse outcome.
- No discretionary AI exits, no stop widening, no averaging down, and no adding size.

### Cost hurdle (repo assumption, not a verified broker tariff)

The current `backtest/README.md` assumes $0.75 commission per side and one tick of slippage per side. MNQ is $2 per index point and one 0.25-point tick is $0.50.

Under that provisional assumption, round-trip commission + extra slippage is $2.50 before any additional exchange/clearing fees:
- 12-tick target = $6.00 gross; approximately +$3.50 net.
- 6-tick stop = $3.00 gross; approximately -$5.50 net.
- The simplified break-even win rate is therefore about 61.1%, before any fees not included in the repo assumption.

The execution replay must account for the actual bid/ask and book-walking in fill prices. Apply the repo's one-tick-per-side slippage as an additional conservative overlay, then stress at two extra ticks per side. Do not double-count the quoted spread. Replace provisional fees with the user's actual broker/firm/exchange schedule before any decision.

## Data required

- Minimum: event-level MNQ best bid/ask price and quantity updates plus trade summaries, with exchange timestamps and sequence numbers.
- Preferred: CME MDP 3.0 Market-by-Price depth (up to the available futures depth) for book reconstruction and marketable-order walking; Market-by-Order data where licensed/available for richer queue and event diagnostics.
- Target sample: at least 12 months, preferably 24 months, covering multiple volatility regimes and actual quarterly contracts. Confirm MNQ product coverage, historical depth, licensing, storage and cost before purchase.
- Validate sequence continuity, packet gaps/recovery, duplicate/out-of-order events, stale/crossed books, timestamp alignment, session/DST handling, contract mapping and roll dates. Reject intervals with unrecoverable book state.
- Add a reliable scheduled-news calendar and the exact intended account-rule configuration.

## Validation plan

1. **Data gate:** if suitable event-level quote/book data cannot be obtained, stop. Report the blocker; do not produce a candle-based proxy and call it an OFI backtest.
2. **Feature audit:** unit-test the OFI formula against hand-calculated event sequences, microprice, depth normalisation, z-score lookback and signal timestamp. Prove no future event enters a feature.
3. **Predictive test:** measure signed midprice returns at 5, 15 and 30 seconds after each signal, with long and short reported separately. Compare against matched no-signal periods and a simple trade-sign baseline.
4. **Chronological evaluation:** freeze the rules; use the earliest 60% for development, next 20% for validation and final 20% as untouched holdout. Add rolling monthly/quarterly walk-forward tests. Never randomly shuffle events.
5. **Execution test:** replay marketable IOC fills with 50 ms latency, book walking, partial fills, commissions, exchange/clearing fees and slippage. Report baseline plus 2-tick-per-side stress. Include stop gaps, rejected orders and data/connection interruptions where relevant.
6. **Robustness:** report long/short, open/midday/close, volatility quartile, spread/depth bucket, news/non-news and year/contract splits. Test parameter neighbours, remove the best day and top 1% of trades, and bootstrap confidence intervals clustered by trading day.
7. **Economics:** report signal count, fill rate, net expectancy in ticks and dollars, profit factor, win rate, average win/loss, maximum drawdown, time under water, trade duration, adverse/favourable excursion, turnover and concentration. Show gross and every cost component separately.
8. **Mode parity:** produce one deterministic signal/risk payload. Signal-assisted mode displays it for explicit owner approval; automated mode may route only after account eligibility, explicit live authorisation and Guardian checks. Unit tests must prove both modes receive identical signal, stop, target and risk calculations. This research does not alter Guardian or OrderRouter.

## Failure / rejection criteria

- No licensed, sufficiently granular MNQ book data: **inconclusive; no strategy claim**.
- Untouched holdout net expectancy <= 0, or its day-clustered 95% confidence interval does not support positive expectancy: reject the trading hypothesis.
- Edge disappears under the realistic fee schedule or modest latency/slippage stress: reject for automated use.
- Edge depends on one side, one narrow time window, one contract/volatility regime, a tiny parameter peak, or a small number of best days: reject or return to research without touching the holdout.
- Insufficient independent signals or trading days for stable estimates: mark inconclusive, not passed.
- The repo's current LucidDaily note says trades held five seconds or less may trigger a microscalping review when they account for more than 50% of profits. Measure this explicitly and re-check current official terms. If the strategy breaches the intended account's rules, mark it ineligible for that account; never delay or disable the protective stop to manipulate the statistic.

## Findings today

No empirical result has been produced. The literature makes OFI a defensible microstructure hypothesis, but the best-known direct OFI study uses equities rather than MNQ, and the futures evidence is not this exact signal. Quint's present candle files are insufficient. The highest-value next action is to establish the cost and availability of event-level MNQ depth data before writing a backtest.

**Decision:** Idea → Specified. Not implemented, not backtested, not paper-forward, not approved.

## Ready-to-paste Claude Code / Fable handoff

Read `CLAUDE.md`, `backtest/README.md`, `quint-control/STATUS.md`, `research/mnq/STRATEGY-RESEARCH-PROGRAMME.md` and this note first. Work only on a new research branch; do not touch main, live execution, Guardian, OrderRouter, existing strategy rules or the website.

1. Inventory the repository for any tick, quote, depth or order-book datasets. Report exact files, date coverage, event granularity, timestamps, contract identifiers and missing fields. Do not infer that OHLCV candles contain order-book information.
2. If no suitable MNQ event data exists, stop before backtesting. Produce a data acquisition checklist and a proposed canonical event schema for timestamp, sequence, contract, event type, bid/ask prices, bid/ask quantities, trade price/size, depth updates and recovery markers. Estimate storage/runtime from a small sample only if an actual sample exists.
3. If suitable licensed data is present, implement a separate deterministic research harness for the exact OFI, depth-normalisation, 60-minute z-score and microprice rules in this note. Add hand-calculated unit tests and tests for sequence gaps, stale/crossed books, roll boundaries and lookahead.
4. Implement event replay for the fixed 6-tick stop, 12-tick target and 30-second time exit. Simulate 50 ms latency, executable book depth, partial fills, fees and the specified slippage stresses. Do not assume every order fills at the displayed top price.
5. Preregister the 1.5/2.0/2.5 z-score sensitivity set; keep the final 20% chronological holdout untouched. Produce predictive and executable results separately, with long/short, time-of-day, volatility, news and contract splits, confidence intervals and concentration checks.
6. Add a mode-parity test using a shared signal/risk payload. Signal-assisted requires explicit approval; automated requires separate explicit live authorisation and Guardian checks. Do not implement order routing or change Guardian.
7. Run relevant tests three times and report exact commands, output and failures. Do not claim tests/data were run if they were not.
8. Return a plain-English report, data limitations, cost table, changed files and a small reviewable PR. If data is missing or the hypothesis fails, document that result rather than fabricating a backtest or tuning until it passes.

No merge, no live trading, and no changes to main.
