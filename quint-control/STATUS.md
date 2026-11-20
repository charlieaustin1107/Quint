# CURRENT BUILD GATE — HOLD

**Quint Control implementation remains on HOLD.** Fable 5.2 renewal is not approval; wait for the owner's explicit green light before starting Phase 1 or changing any trading/runtime code.

Until that approval, permitted work is limited to read-only audits, research, tests that do not touch live services, and documentation/CI maintenance. Do not change NinjaTrader integration, Guardian, OrderRouter, copier, strategies, market-data adapters, protocol, authentication, live execution, Chart Wizard, Quint Brain or published artifacts.

- Architecture and pre-build readiness: [PRE-FABLE-READINESS.md](research/PRE-FABLE-READINESS.md)
- Read-only audit checklist: [PRE-FABLE-REPOSITORY-AUDIT.md](prompts/PRE-FABLE-REPOSITORY-AUDIT.md)
- Repository map: [../../docs/REPOSITORY-GUIDE.md](../../docs/REPOSITORY-GUIDE.md)
- Test matrix: [../../docs/TESTING-AND-VALIDATION.md](../../docs/TESTING-AND-VALIDATION.md)
- Historical session notes: [SESSION-LOG.md](SESSION-LOG.md)

## Current build status

| Area | Status | Meaning |
|---|---|---|
| Phase 0 — project foundation | Complete | Structure, protocol, schemas, rules, setup docs and initial tests merged in PR #13. |
| Phase 1 — engine and website shell | Not started | No NinjaTrader engine or integrated dashboard yet. |
| Phase 2 — Guardian, OrderRouter, copier | Not started | No live execution path implemented. |
| Phase 3 — strategy plug-ins and bots | Not started | The separate Strategy Lab 3A browser prototype exists; it is not engine-integrated. |
| Phase 4 / 4b — validation, account setup, alerts | Not started | Planned only. |
| Phase 5 — Quint assistant, journal and brain | Not started | Planned only. |
| Phase 6 — release candidate / live readiness | Not started | Planned only. |
| Phase 7 — extras | Not started | Planned only. |

## Next actions

1. While waiting, prepare the Windows PC using [SETUP.md](SETUP.md): NinjaTrader 8, multi-provider mode, Lucid/Tradovate connection and Sim101.
2. Optional pre-Fable checks: the one-week proof in [proof/README.md](proof/README.md) and the 12-bot Strategy Analyzer/Sim101 exercise in [botlab/README.md](botlab/README.md).
3. Only after Fable 5.2 is available **and** the owner explicitly approves: begin Phase 1 using the current [FABLE-PROMPTS.md](FABLE-PROMPTS.md). Do not start it automatically.

## Resume protocol

1. Read this file and the Quint Control skill: `.claude/skills/quint-control/SKILL.md`.
2. Check the latest main commit, open PRs and branch dependencies before editing.
3. Run `cd quint-control && npm test`; run `npm run test:3` before declaring a phase complete.
4. Respect the HOLD above. The phase checklist does not override the owner's approval gate.

## Settled decisions

- Windows + NinjaTrader 8; LucidDaily accounts connect through Tradovate.
- Multiple accounts may be used, but **one bot per account at a time**.
- No prohibited hedging across accounts, including correlated instruments; firm rules are enforced per account.
- Every bot defines a stop and target. All orders must pass the deterministic Guardian and the single OrderRouter.
- Kill switches and firm rules cannot be bypassed. AI is not in the live execution path and cannot submit orders.
- Manual Copy is a separate mode; all bots must be off.
- MNQ model for Quint Control/Lab: $0.50 commission per side plus one tick of slippage per side, subject to account-specific verification. Do not apply this to legacy Brain reports.
- Unapproved bot size defaults to 1 MNQ. Monte Carlo failure threshold is 25%.
- Claude uses the owner's own key; no secrets or private account/financial data belong in this public repository.

## Owner decisions / verification still required

- Number and size of LucidDaily accounts.
- Per-account checkout settings: daily loss limit, drawdown method and consistency percentage.
- Confirm current firm rules and commission schedule for each account from the owner's own account documentation. Keep uncertain values marked `verify`; do not infer them from review sites.
- Confirm any NinjaTrader/API/data-licensing permissions before implementing shared market-data distribution.

## Prototype and validation limits

- Strategy Lab Phase 3A is present on `main` as a standalone browser prototype. It creates/validates local drafts and manual paper-scenario plans, with JSON export.
- It does **not** interpret free text, connect to live market data, backtest, replay, simulate fills, persist to a server, connect to NinjaTrader or place orders.
- Quint Control's current JavaScript/schema/prototype suite: 73 tests passing; latest main CI also passed three consecutive full runs (see [TESTING-AND-VALIDATION.md](../../docs/TESTING-AND-VALIDATION.md)).
- Cloud CI cannot prove NinjaScript/C# compilation, PowerShell installer behaviour or broker/Playback/Sim101 behaviour. Those require the owner's Windows/NinjaTrader environment.
- Do not publish app artifacts from a documentation/CI change.

## Phase 0 acceptance

Phase 0 was completed and merged in PR #13. The historical 39-test count records the original Phase 0 baseline; the current Quint Control suite has since grown to 73 tests.

## Strategy Lab 3A remaining work

- [x] Pure JavaScript domain module for MNQ strategy drafts and manual paper scenarios.
- [x] Bounded allow-listed expression evaluator; no `eval`, generated source execution, network or broker access.
- [x] Versioned schemas for Strategy Definition v1 and Manual Paper Scenario v1.
- [x] Standalone mobile-friendly prototype, local draft library and JSON export.
- [x] Unit/UI contract tests; current Quint Control CI is green.
- [ ] Server-side Claude interpreter with missing-field questions and mandatory human review.
- [ ] Integration with the Phase 1 website shell and Phase 2 engine protocol.
- [ ] Persistent storage, historical test runner, Playback and live-feed paper ledger.

