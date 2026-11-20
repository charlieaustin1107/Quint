# Quint Control — Backtest Integrity & Trust Standard

**Research date:** 20 November 2026  
**Status:** Engineering/research specification; not implemented as a complete backtesting engine  
**Applies to:** Quint Control Strategy Lab, historical backtests, NinjaTrader Playback, live-paper simulation and future promotion decisions  
**Purpose:** Make every reported result reproducible, auditable, execution-aware and difficult to overfit.

## 1. Executive decision

Quint must not treat a backtest as a profit calculator. It must treat it as a controlled experiment with a reproducible data set, immutable strategy version, explicit execution model, statistical validation, and a visible record of uncertainty.

The target architecture is one deterministic strategy/risk core, fed by timestamped market events, with separate adapters for:
1. Historical research.
2. NinjaTrader Market Replay / Playback.
3. Live-market paper trading.
4. Live broker execution, only after the existing Guardian and explicit account authorisation.

A result is only as trustworthy as its weakest layer. Better charts, a larger trade count or a high profit factor cannot repair lookahead, incorrect fills, bad data, hidden parameter search or an invalid account assumption.

**Current implementation status:** the Strategy Lab document describes the intended architecture, but the Quint Control historical runner, canonical event-based fill simulator, persistent experiment registry and evidence-report pipeline are not yet implemented. The older `quint-brain/backtest/` scripts test Chart Wizard / Quint Brain candle strategies; they are not the future Quint Control bot-validation engine.

## 2. Audit of the current repository

The current `quint-brain/backtest/README.md`, `run.js`, `engine.js`, `crosscheck.py` and `fetch_to_csv.py` provide a useful exploratory starting point, but they must not be described as institutional-grade or as proof that an automated bot is ready.

| Existing behaviour | Why it limits trust | Required correction |
|---|---|---|
| README describes first-half/second-half results as an out-of-sample check | `run.js` splits the trade list at half its trade count, not at a predeclared chronological date boundary. Trade count halves can span unequal market regimes and are not a reserved holdout. | Use fixed calendar/session boundaries; lock an untouched final holdout. |
| One fixed $2.50 round-trip cost | It is hard-coded and may not match the exact account, broker, exchange/clearing fees, order type or current fee schedule. Quint Control's STATUS records a different commission assumption for the owner's LucidDaily setup. | Version a per-account cost profile and show every fee/slippage component. Reconcile and verify before use. |
| OHLC candle fill simulation | A candle can touch both stop and target; OHLC cannot reveal event order, spread, queue position or executable bid/ask. | Label fill fidelity; use tick/quote data where required; ambiguous bars get conservative adverse treatment or are marked unresolved. |
| `loadCSV` and `crosscheck.py` silently remove duplicate timestamps | Silent deduplication can conceal conflicting or revised candles and data-feed errors. | Preserve raw inputs, report duplicates/conflicts, and fail validation unless an explicit resolution policy is selected. |
| Data loader does not establish a complete quality report | Missing intervals, invalid OHLC relationships, volume anomalies, timezone/session gaps and feed changes can contaminate metrics. | Run a deterministic data audit before strategy execution and attach the audit to every report. |
| Python cross-check reimplements two strategies | It checks selected logic outputs, not the quality of the source data or realism of the fill model. The five-pillar logic is not independently cross-checked by this script. | Keep independent implementations, but add golden fixtures, event-level execution tests and a separate data-quality audit. |
| Closed-trade statistics drive max drawdown | Closed-trade equity omits intratrade adverse excursion and can understate drawdown and margin stress. | Calculate mark-to-market equity at the finest available event/bar resolution and separately report closed-trade drawdown. |
| No durable experiment/trial registry in this legacy harness | Repeated parameter/strategy attempts can create selection bias; the winning run alone hides how many alternatives were tried. | Record every run, including failed/abandoned variants, and apply multiple-testing diagnostics. |

Do not silently rewrite old result files to make them look more rigorous. Re-run them under a new versioned engine and clearly label the old reports as exploratory.

## 3. Evidence and research basis

### 3.1 Backtest selection bias is a first-class risk

Bailey, Borwein, López de Prado and Zhu (2017), *The Probability of Backtest Overfitting*, propose combinatorially symmetric cross-validation (CSCV) to estimate the probability that the in-sample winner ranks poorly out of sample. Their central warning applies directly to a bot factory that tests many strategies and keeps the best.

Source: https://escholarship.org/uc/item/4w1110bb

Bailey and López de Prado (2014), *The Deflated Sharpe Ratio*, adjust Sharpe-ratio interpretation for selection bias from multiple trials and non-normal returns. Quint must record the number and nature of trials; it cannot calculate a meaningful selection-adjusted statistic if the search history is lost.

Source: https://doi.org/10.2139/ssrn.2460551

Sullivan, Timmermann and White's / later technical-rule literature demonstrates why data snooping and transaction costs can eliminate apparent technical-rule performance. Bajgrowicz and Scaillet (2012), *Technical trading revisited: False discoveries, persistence tests, and transaction costs*, report that even statistically selected historical rules did not reliably identify future winners and that low transaction costs offset apparent in-sample performance.

Source: https://doi.org/10.1016/j.jfineco.2012.06.001

**How Quint should use these methods:**
- Chronological walk-forward and an untouched final holdout are the primary deployability tests.
- PBO/CSCV is a secondary selection-bias diagnostic over a recorded candidate universe; it is not a replacement for chronological forward testing.
- Deflated Sharpe Ratio is a secondary statistic when its assumptions and effective number of trials can be defended.
- Do not use ordinary random K-fold cross-validation as the main validation method for sequential market data.
- Every experiment must declare its hypothesis and parameter search budget before results are inspected.

### 3.2 Historical fills are not live fills

NinjaTrader's official documentation explains that standard historical fill processing uses OHLC-derived virtual bars, while higher fill resolution can use a more granular secondary series. It also explicitly warns that historical, Playback/simulation and real brokerage fills differ. Playback101 processes orders immediately and synchronously; it does not simulate internet latency.

Sources:
- Historical fill processing: https://static.ninjatrader.com/support/helpGuides/nt8/understanding_historical_fill_.htm
- Historical vs real-time discrepancies: https://static.ninjatrader.com/support/helpGuides/nt8/discrepancies_real-time_vs_bac.htm
- Playback behaviour: https://static.ninjatrader.com/support/helpGuides/nt8/playback.htm
- Strategy Analyzer properties: https://static.ninjatrader.com/support/helpGuides/nt8/backtest_a_strategy.htm

**Implication:** Quint must never label a Playback101 result as latency-realistic live execution. It is useful for event-sequence and strategy behaviour, but network delay, market impact, queue position and real broker execution need separate treatment.

## 4. Required data contract and quality gates

Every data set must be immutable or content-addressed and have a manifest containing:

- Instrument identity: MNQ vs NQ, exact quarterly contract, exchange, currency, multiplier and tick size/value.
- Vendor/feed, subscription/product, data type (Last, Bid, Ask, Level I, Level II), timestamp precision and timezone.
- Bar construction method, interval, session template, regular/extended hours, and whether bars are exchange-stamped or locally aggregated.
- Start/end timestamps, received-at timestamps if available, download time, revision policy, file hash and schema version.
- Contract roll schedule and whether a series is actual-contract, back-adjusted, ratio-adjusted or unadjusted continuous.
- Missing/duplicate/out-of-order observations, malformed bars, zero-volume periods, session gaps, DST changes, holidays and early closes.
- Known feed outages, corrections, stale data and periods with unavailable bid/ask or depth.

### Hard data validation

Fail the run (do not just show a yellow warning) if:
- Timestamps are not strictly ordered after an explicit, auditable normalization.
- Conflicting duplicate timestamps exist without an approved resolution policy.
- OHLC is invalid: high is below open/close/low, low is above open/close/high, or prices are non-finite.
- Required session intervals are missing beyond the strategy's declared tolerance.
- The data does not cover the full indicator warm-up plus requested test period.
- The instrument/contract, multiplier, tick size, timezone or bar type is unknown.
- The strategy requires bid/ask, tick sequence or depth but the data only contains OHLCV.
- A continuous-series roll adjustment is incorrectly used as an executable price.

A strategy may specify legitimate no-trade gaps (maintenance break, holiday, session close); the validator must distinguish these from missing feed data using an exchange calendar.

### MNQ-specific requirements

- MNQ is $2 per Nasdaq-100 index point; minimum tick is 0.25 index points ($0.50 per tick). Store contract metadata rather than scattering constants through code.
- Use actual quarterly contracts for execution simulation. Continuous adjusted data may be used for signal research, but signals must be audited around rolls and fills must be priced on the actual contract.
- Record the roll rule (fixed date or causal volume/open-interest crossover), roll spread, slippage and any position transition.
- Include Globex maintenance breaks, daily session boundaries, weekends, DST transitions, holidays and early closes.
- Never use NQ history as if it were MNQ fills. NQ may be a labelled proxy for longer history; report it separately from MNQ-native results.

CME contract reference: https://www.cmegroup.com/markets/equities/nasdaq/micro-e-mini-nasdaq-100.contractSpecs.html

## 5. One deterministic strategy core and an event-driven simulator

The same versioned strategy definition and deterministic signal/risk code must run against historical, replay, paper and (eventually) live adapters. Only the market-event source and execution adapter should change.

### Canonical event model

At minimum, persist immutable, ordered events:
- `MarketEvent`: exchange timestamp, receive timestamp, instrument/contract, event type, bid, ask, last, sizes/volume, sequence number and source.
- `BarEvent`: interval, OHLCV, source and the exact event range used to construct it.
- `SignalEvent`: strategy ID/version/hash, decision timestamp, input watermark, direction, expiry, entry intent, stop/target plan and rationale fields.
- `OrderEvent`: client ID/idempotency key, submit time, order type, side, quantity, limit/stop price, time-in-force, acknowledgement/rejection/cancel state.
- `FillEvent`: exchange/broker time, receive time, price, quantity, liquidity side if known, fee and slippage attribution.
- `PositionEvent`: quantity, average price, realised/unrealised P&L, protective order state and margin estimate.
- `RiskDecisionEvent`: Guardian result, account/firm profile version, allowed/rejected quantity and reason.

Events must be replayable deterministically. The report must retain the exact event/data watermark available when each signal was decided. No signal may consume a later event.

### Execution models (selectable, visible, versioned)

1. **OHLC conservative:** coarse research only. If stop and target are both touched in one bar and sequence is unknowable, apply adverse ordering or mark the trade ambiguous. Never infer the favourable path.
2. **Lower-timeframe bar:** use finer bars to resolve some sequencing; still not proof of bid/ask or queue fills.
3. **Tick/Last:** use ordered trade ticks; can improve sequencing but does not establish bid/ask execution unless quote data exists.
4. **Bid/Ask quote:** market buys execute against ask and sells against bid; exits use the opposing executable side. Apply measured or explicitly stressed latency/slippage.
5. **Market depth / replay:** use Level I/II and sequence data where licensed and available; model partial fills and queue assumptions. State what the provider actually supplies.

A report must show the fill model and fidelity level next to the headline metrics. Never compare a low-fidelity OHLC strategy with a quote-level result without clearly disclosing the difference.

### Order semantics to simulate

- Market, limit, stop-market, stop-limit and OCO bracket behaviour supported by the eventual broker adapter.
- Order submission/acknowledgement latency, cancel/replace latency, rejected orders, partial fills, fill quantity and order expiry.
- Market orders crossing spread; passive limit orders do not fill merely because the candle touches the limit unless the model has evidence to support that fill.
- Stop-market orders can gap through the trigger and fill at the next executable price, not the stop price.
- OCO cancellation races, partial fill protection, duplicate events, reconnect/recovery and out-of-order broker messages.
- Tick rounding, quantity constraints, session time-in-force and forced liquidation.
- Commissions, exchange, clearing, regulatory fees, spread, slippage, roll costs and any account-specific charges.

Costs must be a named, versioned profile, not a hidden constant. Show base, conservative and stress scenarios (for example 1.5× and 2× measured slippage) without presenting the stress multiplier as a measured fact. If the actual account fee schedule is unknown, mark the run as provisional and do not certify net expectancy.

## 6. Validation protocol: stop overfitting before it happens

### Stage 0 — preregistration

Before running the strategy, save:
- Hypothesis and economic rationale.
- Exact entry/exit/invalidation and position sizing rules.
- Market, contract, bar type, timezone, session and data requirements.
- All parameters, allowed values and warm-up.
- Cost profile and fill model.
- Primary metric, minimum sample/coverage requirement and failure criteria.
- Planned train, validation, walk-forward and final holdout date ranges.
- Search budget: number of configurations, strategy families, filters and manual revisions already tried.

The strategy specification and research plan receive immutable hashes. If the rules change after viewing results, create a new version and log the change; do not overwrite the old experiment.

### Stage 1 — static/casual correctness

Reject or block a strategy with:
- Future data, centred indicators, same-close fills after close-based signals, future news labels or future-adjusted inputs.
- Unspecified timezone/session, ambiguous entry timing, undefined position state or incomplete exits.
- Unbounded or unsupported expressions, non-deterministic dependencies or AI calls in the execution loop.
- Unspecified order type/fill assumptions, stop semantics or sizing.
- Unavailable data fields (e.g. order-flow signals tested on candles).

Run causality tests: changing or appending future observations must not change any prior signal, order or fill. Re-running the same input and version must produce byte-identical events/results.

### Stage 2 — development and chronological walk-forward

- Use contiguous chronological windows. Train/tune only on the past; validate on the next unseen period; roll forward and repeat.
- Keep the final test period untouched until all design choices are frozen.
- If labels or trades overlap across boundaries, purge overlapping observations and apply an embargo appropriate to the maximum holding/label horizon.
- Do not random-shuffle market observations.
- Include a final holdout that is not repeatedly queried during development. Once it is inspected and influences a change, it is no longer an untouched holdout; reserve a new later period or report that the holdout has been consumed.
- Report every walk-forward window separately and combined. A positive aggregate with repeated losing windows is not stable evidence.

### Stage 3 — selection-bias diagnostics

When enough candidate trials exist and their full return series are retained:
- Estimate Probability of Backtest Overfitting using CSCV across the declared candidate set.
- Report Deflated Sharpe Ratio with the effective trial count and return-distribution inputs.
- Use dependence-aware block bootstrap for confidence intervals; do not bootstrap individual trades as if all trades were independent when they cluster by session/regime.
- Preserve all attempted variants, including failures. Do not erase dead strategies from the trial count.
- Explain limitations: PBO/DSR are diagnostics, not guarantees and not substitutes for chronological holdout or forward testing.

### Stage 4 — robustness and adversarial checks

Every candidate report must include:
- Long-only, short-only and combined performance.
- Calendar-year and rolling walk-forward performance.
- Volatility, trend/range and session regime splits, using only information known at the time.
- Day-of-week and scheduled-news splits where relevant.
- Parameter-neighbourhood stability; no sharp isolated optimum.
- Base, conservative and stressed execution costs.
- Best trade/day/week removal; top 1% trade and best-year concentration.
- Slippage/latency sensitivity, stop-gap stress and ambiguous-bar count.
- MAE/MFE, holding-time distribution, time-in-market, turnover and missed/late entry diagnostics.
- Risk-matched benchmarks and simple null/control strategies.
- Maximum mark-to-market drawdown, drawdown duration, worst day/session, tail loss, margin use and liquidation distance.
- Dependence-aware uncertainty intervals and sample counts.

## 7. Metrics: show the full distribution, not a vanity score

### Trade and return metrics
- Gross and net P&L, with cost components separated.
- Net expectancy per trade and per session, average win/loss, median trade, win rate and profit factor.
- Return on risk and return on margin, with sizing policy stated.
- Sharpe and Sortino with explicit sampling frequency and annualisation.
- Calmar / return-to-drawdown, max drawdown and time underwater.
- Long/short, year, session and regime splits.
- MAE/MFE, holding time, turnover, exposure and fill ratio.

### Account and prop-firm metrics
- Account-specific realised and unrealised equity path.
- Intraday and end-of-day trailing drawdown as actually defined by that account plan.
- Daily loss limit, consistency rules, news windows, microscalping/holding-time rules, overnight/weekend restrictions, max size and forced-flat time.
- Number and reason of simulated rule breaches; worst excursion relative to liquidation boundary.
- Whether the strategy is ineligible for that account even if it is profitable in unrestricted futures simulation.

A strategy must never be labelled "pass" if it would have breached a firm rule in the simulation. Strategy quality and account compatibility are separate gates.

## 8. Automated test suite and independent verification

Build tests before building a polished backtest dashboard.

### Deterministic fixtures
- Signal at bar close cannot fill before the next eligible event.
- Stop/target both touched in one OHLC bar resolves adversely or is explicitly ambiguous.
- Stop gaps fill at the first executable price, not at the trigger.
- Limit touch vs penetration follows the selected fill policy.
- Partial fills update remaining quantity and protection correctly.
- OCO cancel race cannot leave an unprotected position.
- Duplicate signal/order/fill events are idempotent.
- Out-of-order events are rejected or quarantined.
- Tick rounding and MNQ point/tick/dollar conversion are exact.
- DST, session boundaries, maintenance breaks, holiday and early close are correct.
- Roll transition cannot create artificial P&L or a false breakout.
- Reconnect rebuilds state without duplicate orders or losing protection.
- Guardian rejection always blocks an order in historical/paper/live parity tests.

### Property / metamorphic tests
- Future-data mutation does not alter past decisions.
- Scaling prices and tick metadata consistently preserves dimensionless signal decisions where mathematically expected.
- Replaying the same event stream produces identical signal and position ledgers.
- Increasing transaction costs cannot improve net P&L.
- Worsening slippage cannot improve a marketable fill.
- Removing a market event cannot silently create a more favourable fill.
- Strategy adapter parity: identical events into historical/replay/paper adapters produce identical strategy signals and risk decisions; fill outcomes may differ only because the declared execution adapter differs.

### Independent cross-checks
- Implement core calculations independently in a second language or reference implementation for a small set of canonical fixtures.
- Compare signals, entries, exits, position state, fees and P&L—not only trade count.
- Use manually calculated hand-checkable cases for tick values, stops, targets, gap fills and session times.
- Independent code can still share the same mistaken assumption; it is a cross-check, not proof of correctness.

## 9. Website / report UX requirements

The Backtest screen must make evidence quality understandable before showing the profit headline.

### Run header
Show strategy ID/version/hash, data-set hash, instrument/contracts, date range, timezone/session, bar type, fill fidelity, cost profile, software/build version, created time and run ID.

### Data quality panel
Show coverage, missing intervals, duplicate/conflicting rows, invalid bars, feed provenance, roll method, quote/depth availability, timestamp quality and every warning/failure.

### Execution realism panel
Show fill model, entry/exit pricing side, latency assumption, spread/slippage, queue/partial-fill support, ambiguous bars, gap-through-stop treatment and order-rejection assumptions.

### Validation panel
Show exact train/validation/walk-forward/holdout boundaries, number of candidate trials, whether the holdout is untouched or consumed, PBO/DSR status, confidence intervals, sample-size warnings and robustness checks.

### Results panel
Show net P&L only alongside costs, drawdown, expectancy, trade count, stability, long/short splits, concentration, equity curve, underwater curve, distribution of trade returns and full downloadable trade/event ledger.

### Honest status labels
- **Idea:** incomplete, not testable.
- **Specified:** exact rules saved, not validated.
- **Blocked:** required data or rules are missing.
- **Exploratory:** test ran, but one or more integrity gates are incomplete.
- **Historical validated:** all declared historical data, execution, walk-forward and holdout gates passed.
- **Replay tested:** event-sequence replay completed; execution fidelity stated.
- **Forward paper:** observed live-market paper results; sample and duration stated.
- **Live observed:** real fills, fees and account outcomes recorded. This is not a guarantee of future performance.

Never use a green "profitable" badge based only on net P&L or profit factor. Display failed gates prominently; no composite score may hide a failed critical gate.

## 10. Promotion gates and no-go conditions

A strategy may progress to forward paper only when:
1. Strategy definition is frozen and passes static/causality tests.
2. Data audit passes for the declared market and time range.
3. Execution model is suitable for the strategy's order types and holding horizon.
4. Net expectancy is positive on the untouched chronological holdout after verified fees and conservative fills.
5. Results are not dominated by a handful of trades, one session or one year.
6. Walk-forward windows and parameter neighbourhoods show defensible stability.
7. Sample size and uncertainty are reported and adequate for the claim being made.
8. The strategy passes account/prop-firm eligibility checks for the selected plan.

A strategy is rejected, inconclusive or blocked if data is insufficient, the holdout has been consumed, fills cannot be modelled honestly, costs are unknown, results depend on favourable ambiguous-bar assumptions, or the account rules prohibit its holding period.

Forward paper is a separate gate. Historical pass does not mean paper pass; paper pass does not mean live pass. Live activation remains an explicit user action through Guardian and the existing OrderRouter.

## 11. Recommended implementation order for Quint Control

Do not attempt to build every chart and metric at once. Implement the trust foundation in this order:

1. **Run manifest + immutable experiment registry:** strategy version, data hash, run config, costs, fill model, software version, timestamps, trial count and status.
2. **Data auditor:** validate CSV/market events, coverage, timestamps, duplicates, OHLC, session calendar and roll metadata; emit a machine-readable audit.
3. **Canonical event and ledger model:** signals, orders, fills, positions, fees, risk decisions and event replay.
4. **Deterministic historical runner:** same strategy core, no AI in the loop, next-event execution and explicit position lifecycle.
5. **Fill-model ladder:** OHLC conservative first, then lower-timeframe/tick, then bid/ask and market-depth where data supports it.
6. **Walk-forward/holdout orchestrator:** fixed chronological windows, immutable untouched holdout, consumed-holdout tracking and repeatable run IDs.
7. **Metrics and diagnostics:** mark-to-market equity, drawdown, costs, MAE/MFE, regime/concentration, block bootstrap and selection-bias diagnostics.
8. **Golden/property tests and adapter parity:** prove causality, determinism, idempotency, risk enforcement and exact tick maths.
9. **Website evidence report:** data/execution/validation warnings before profit headline; downloadable trade/event ledger.
10. **Playback and live paper adapters:** separate evidence classes and never merge paper fills with historical or real fills.

## 12. Claude Code / Fable master prompt

> You are implementing the Quint Control Strategy Lab backtesting foundation. Read `quint-control/research/STRATEGY-LAB.md`, this document, `quint-control/PLAN.md`, `quint-control/STATUS.md`, the current Strategy Definition schema/domain module and all relevant tests before editing.
>
> Start with an audit, not a rewrite. Report what is implemented, missing, unsafe or duplicated. Distinguish Quint Control from the older Chart Wizard/Quint Brain `quint-brain/backtest/` scripts. Do not claim the Strategy Lab already has a working historical runner if it does not.
>
> Propose a small, testable implementation plan in the order in section 11. First deliver the run manifest, immutable experiment registry, data audit and deterministic event/ledger contracts. Reuse the bounded Strategy Definition DSL; do not execute AI-generated source code or put an LLM in the signal/risk/execution loop.
>
> Historical, Playback and paper adapters must call the same deterministic strategy/risk core. Use explicit timestamps and event watermarks to prevent lookahead. Keep strategy decisions separate from fill simulation. Every order/fill/position/risk transition must be journalled and replayable.
>
> Build hard-failing data checks for missing/conflicting/invalid inputs. Do not silently deduplicate, interpolate missing prices, splice contracts without a documented roll rule, or treat NQ proxy data as MNQ execution history. Require a declared timezone, exchange calendar and contract metadata.
>
> Build conservative, explicit fill policies. Candle OHLC cannot resolve every intrabar path. If stop and target are both touched and finer sequence data is absent, use adverse ordering or mark the outcome ambiguous. Marketable orders use the correct bid/ask side when quotes exist. Stop-market gaps fill at the next executable price. Passive limit fills must not be assumed from touch alone. Record latency, partial-fill and queue assumptions honestly.
>
> Implement chronological walk-forward and a locked final holdout. Record every strategy trial, including failed variants. Add PBO/CSCV and Deflated Sharpe Ratio only as clearly labelled secondary selection-bias diagnostics when the candidate universe and trial count are known; never substitute them for forward chronological tests.
>
> Build mark-to-market drawdown, fees, slippage, MAE/MFE, long/short, year/regime and concentration reports. Include account-specific prop-firm rules as hard eligibility gates, not as post-hoc annotations.
>
> Add deterministic fixtures, causality tests (future-data mutation must not alter past outputs), idempotency tests, tick maths, DST/session/roll tests, ambiguous-bar tests, partial-fill/OCO tests, Guardian parity tests and independent reference calculations.
>
> Update the mobile-friendly website so data quality, fill fidelity, test boundaries, warnings, sample size and validation status appear before the headline P&L. Never show "profitable" from one green backtest.
>
> Do not touch live Guardian/OrderRouter behaviour, enable live trading, change account rules, or merge to main. Create a reviewable branch/PR. Run all available tests, list tests that could not be run, and provide a truthful implementation status. If any data or environment requirement is unavailable, stop at the honest boundary and document it rather than faking results.

## 13. Primary references

1. Bailey, Borwein, López de Prado & Zhu (2017), *The Probability of Backtest Overfitting*. https://escholarship.org/uc/item/4w1110bb
2. Bailey & López de Prado (2014), *The Deflated Sharpe Ratio*. https://doi.org/10.2139/ssrn.2460551
3. Bajgrowicz & Scaillet (2012), *Technical trading revisited: False discoveries, persistence tests, and transaction costs*. https://doi.org/10.1016/j.jfineco.2012.06.001
4. NinjaTrader, *Understanding Historical Fill Processing*. https://static.ninjatrader.com/support/helpGuides/nt8/understanding_historical_fill_.htm
5. NinjaTrader, *Discrepancies: Real-Time vs Backtest*. https://static.ninjatrader.com/support/helpGuides/nt8/discrepancies_real-time_vs_bac.htm
6. NinjaTrader, *Using Playback*. https://static.ninjatrader.com/support/helpGuides/nt8/playback.htm
7. CME Group, *Micro E-mini Nasdaq-100 contract specifications*. https://www.cmegroup.com/markets/equities/nasdaq/micro-e-mini-nasdaq-100.contractSpecs.html

---
**Bottom line:** Quint's backtesting system should be trusted only when another person can reproduce the same result from the same strategy version, data, costs and fill model—and when the result survives unseen chronological data, adverse execution assumptions and the account's actual rules. Until then, label it exploratory.
