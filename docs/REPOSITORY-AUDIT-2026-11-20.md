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

## Remaining validation work

1. Let the new Quint Lab workflow run and fix any reproducible failures it exposes.
2. Run the Chart Wizard and Quint Brain build/browser suites on a CI runner or the owner's computer; keep their mocked connectors isolated from live usage.
3. Add CI coverage for those browser suites only after their environment and outputs are stable.
4. Complete Windows/NinjaTrader compile, Playback, Sim101 and installer checks when the owner's machine is ready.
5. Do not lift the Quint Control HOLD or change trading/runtime code without explicit owner approval.
