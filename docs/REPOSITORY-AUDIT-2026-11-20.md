# Quint repository audit — 20 November 2026

## Executive result

The repository is structurally separated into five products and has a clear Quint Control safety/build gate. The latest `main` Quint Control test run is green. The main weakness is uneven validation coverage and documentation drift, not a confirmed current failure in the Quint Control suite.

## Findings

| Type | Finding | Action |
|---|---|---|
| Documentation inconsistency | `STATUS.md` mixed current build instructions with a long chronological session log. | Moved the history to `quint-control/SESSION-LOG.md`; shortened STATUS to live state and next actions. |
| Documentation inconsistency | Status described Strategy Lab 3A as a feature-branch prototype, although its prototype files and tests are now on `main`. | Corrected status: prototype is on main but remains local-only and unintegrated. |
| Documentation inconsistency | Cost notes were described as one unresolved $0.75 vs $0.50 conflict. The values apply to different products: legacy Brain backtests use $0.75; Quint Control/Lab currently model $0.50. | Clarified scope and retained the requirement to verify actual account-specific fees. |
| Missing test automation | Quint Lab has a Node test suite but did not have a dedicated workflow. | Added a workflow to run `npm test` and `npm run test:3`. |
| Missing test automation | Chart Wizard and Quint Brain browser suites remain documented local checks rather than CI jobs. | Recorded exact commands and environment requirements in the test matrix; no claims that they ran in this audit. |
| Confirmed limitation | NinjaScript/C# compilation, PowerShell execution and broker/Playback/Sim101 behaviour cannot be proven by the current cloud CI. | Kept these as explicit Windows acceptance checks. |

## Quint Control test evidence

- Main commit: `ad913b502284c73e3002a010c33d3564e65961eb`.
- GitHub Actions run [#42](https://github.com/charlieaustin1107/Quint/actions/runs/44831299392) completed successfully.
- `npm test`: 73 passed, 0 failed.
- `npm run test:3`: 73 passed on each of 3 runs.
- Historical red runs exist on older commits/branches. They are not evidence that the current main commit is failing; the current main run is green.

## Build and implementation truth

- Quint Control Phase 0 is complete; Phases 1 and 2 are not started.
- No integrated NinjaTrader engine, Guardian runtime, OrderRouter, copier or production dashboard has been delivered yet.
- Strategy Lab 3A is a local draft/schema prototype. It does not parse free text, fetch live data, backtest, replay, simulate fills, connect to the engine or place orders.
- Chart Wizard and Quint Brain are separate learning/analysis apps. Their backtest harness is not the future Quint Control bot-validation engine.
- Quint Lab is research/paper tooling and never places broker orders.

## Code-level review findings — static inspection, not yet patched

1. **Monte Carlo wording/method mismatch (`lab/lib/prop.js`, `oneRun`).** The comments say daily results are replayed in a random order, but each simulated day independently samples `daily[Math.floor(rand() * daily.length)]`. This is bootstrap resampling *with replacement*, not a shuffle/permutation: some sessions repeat and others are omitted. That can change pass/fail probabilities and does not preserve serial dependence. Decide explicitly whether the intended method is permutation, bootstrap, or block bootstrap; label the output and add deterministic tests before comparing strategies. I did not silently change the statistical method.
2. **Candle validation is incomplete (`lab/lib/candles.js`).** `merge()` rejects non-finite timestamps/OHLC fields but does not validate timestamp positivity/integer-ness, OHLC ordering (`high >= open/close/low`, `low <= open/close/high`), positive prices, or finite/non-negative volume. `read()` accepts CSV rows without validation. A malformed candle can therefore enter a research run and distort range, VWAP or strategy results. Add a shared validator and reject/count bad rows before relying on results.
3. **Lucid simulator is not a full intraday account emulator (`lab/lib/prop.js`).** It models end-of-day equity/trailing-floor updates, not intraday trailing drawdown, intra-session breaches, fill sequencing or every account-specific rule. The source comment already discloses part of this limitation; the UI/report must not present its probability as a real prop-firm pass probability.
4. **Validation coverage has been overstated in places.** `lab/test/hub.e2e.test.js` conditionally skips both browser tests when Node Playwright is missing. The new CI workflow now installs Node Playwright and Chromium so those tests are intended to execute rather than silently skip. The run must still be inspected for actual pass/skip counts.

These are review findings, not claims that the current suite fails. No strategy, backtest engine, candle data, broker, or runtime code was modified.

## Apparent conflicts checked and resolved

- **One bot per account vs multi-bot coordinator:** not a current contradiction. The settled safe baseline is one bot per account. The separate multi-bot coordinator document is explicitly a future capability proposal; one-bot enforcement remains until its coordination, backtest and release gates pass.
- **$0.75 vs $0.50 MNQ commission:** not a single shared assumption. $0.75 belongs to the legacy Quint Brain exploratory runner; $0.50 is the current Quint Control/Lab modelling assumption. Both must remain labelled and actual account fees verified.
- **Phone-first vs Windows:** the owner primarily uses an iPhone, but NinjaTrader setup and runtime acceptance require a Windows PC. Documentation should support phone-friendly UX without pretending Windows is unnecessary.
- **Strategy Lab status:** the browser prototype is already on main; the integrated Claude interpreter, historical backtester, persistent storage and engine connection remain future work.

## Remaining validation work

1. Let the new Quint Lab workflow run and fix any reproducible failures it exposes.
2. Run the Chart Wizard and Quint Brain build/browser suites on a CI runner or the owner's computer; keep their mocked connectors isolated from live usage.
3. Add CI coverage for those browser suites only after their environment and outputs are stable.
4. Complete Windows/NinjaTrader compile, Playback, Sim101 and installer checks when the owner's machine is ready.
5. Do not lift the Quint Control HOLD or change trading/runtime code without explicit owner approval.
