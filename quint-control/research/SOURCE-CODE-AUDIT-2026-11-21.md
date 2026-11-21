# Quint source-code audit — 21 November 2026

**Audit type:** read-only static source review and GitHub Actions history review  
**Baseline reviewed:** `main` at `3b9a5446870e61787507103d03f39c4fc4b7cbc6`  
**Scope:** Quint Control, Strategy Lab, bot/proof code, Quint Lab, Quint Brain backtest harness, installer, protocol and available CI evidence.  
**Changes made by this audit:** none to runtime or trading code. This report is documentation only.

## Executive verdict

**Quint is a substantial research and product-design repository, but Quint Control is not yet an executable automated-trading platform.** The strongest completed work is the product separation, research/evidence pipeline, protocol specification, safe Strategy Definition foundation, local Strategy Lab prototype, and simulation/research bots.

The production-critical parts — NinjaTrader add-on, deterministic Guardian, single OrderRouter, account reconciliation, copier, production dashboard, and integrated historical/replay/paper execution — are still planned rather than implemented. The repository's own phase table marks the engine/website and Guardian/OrderRouter/copy phases as not started.

Do not connect a broker or use this repository to trade live. There is no complete Quint Control runtime to do so.

## Findings by priority

### B0 — Production execution stack does not exist yet

**Evidence**
- `quint-control/core/README.md` says the C# trading core starts in Phase 2.
- `quint-control/engine/README.md` describes the planned NinjaTrader add-on and says it starts in Phase 1.
- `quint-control/strategies/README.md` describes the planned bot plug-in format and says it starts in Phase 3.
- `quint-control/STATUS.md` marks Phases 1–7 as not started.
- Repository code search found no production `Guardian` implementation, `OrderRouter` class, `QuintStrategy` base class, NinjaTrader AddOn implementation or WebSocket server. The order path is described in specifications, not implemented code.

**What exists instead**
- `quint-control/proof/QuintNoiseMomentum.cs`: a standalone proof strategy.
- `quint-control/botlab/QuintBotLab.cs` and `botlab.js`: twelve research/test bots for Strategy Analyzer, Playback and Sim accounts.
- `quint-control/reference/strategy-lab/definition.js`: a pure-JavaScript strategy-definition and validation foundation.
- `quint-control/web/strategy-lab/`: a standalone browser prototype.

These are useful foundations, but none is the integrated production engine. Keep the HOLD gate.

### B1 — Installer can remove an installed destination when its source is empty

**File:** `quint-control/install/Install-Quint.ps1`

In the replacement loop, the script removes an existing destination folder before checking whether the source contains any installable files. If the source is empty or missing, it then reports “nothing to install yet” and continues. The script does back up existing destinations first, which reduces data-loss risk, but a reinstall from an incomplete checkout can still replace a working installed folder with nothing.

**Required correction before the installer is used for a real engine release**
1. Validate every required source directory and expected file before changing any destination.
2. Refuse the install if a required production component is empty.
3. Stage and verify new files before swapping the destination.
4. Only replace a destination when the corresponding staged source is valid and non-empty.
5. Add tests for missing/empty source, partial copy failure, backup failure and rollback.

This is a concrete installer-safety defect. Do not run the installer as a production upgrade until it is corrected and tested on Windows.

### B1 — Current main test status is not freshly verified

**Evidence**
- The Quint Control GitHub Actions workflow runs `npm test` and `npm run test:3` on Quint Control changes.
- The last available CI run associated with the Phase 3A Strategy Lab head commit (`c9877d2f3a69fd0e78206795edf3a98703eeb6d8`, run #14) failed: **58 passed, 5 failed out of 63**.
- Failures were concentrated in the then-current Strategy Lab DSL validator (the `const`/`var` expression operators were missing from its allowed set) and protocol tests that treated the Strategy Definition and Paper Scenario schema files as protocol message types.
- The current `main` source has since changed: the current expression operator set includes `const` and `var`, and the current protocol test excludes `.schema.json` files from protocol message discovery. This is evidence of corrections, not proof that the current main suite passes.

**Status:** no workflow run was returned for the current main head. Current-main CI is therefore **unknown**, not passed.

**Required next action after the build gate is cleared:** run the current full test suite and three consecutive runs, then preserve the exact logs and commit SHA. Do not rely on an old Phase 0 pass or a later source edit as a substitute.

### B1 — NinjaTrader C# has not been compiled in the available workflow

**Evidence**
- The current status notes that the cloud environment has no `dotnet` or PowerShell, and C# is checked only by self-tests inside NinjaTrader.
- The status explicitly says `QuintBotLab.cs` has not been compiled.
- The proof instructions require the owner to copy `QuintNoiseMomentum.cs` into NinjaTrader and press F5 manually.
- GitHub Actions currently runs Node tests only; it does not compile or execute NinjaTrader C#.

**Risk:** syntax, API-version, lifecycle, order-event and NinjaTrader integration failures can remain undetected until a Windows/NinjaTrader compile and simulation run.

**Required gate:** a documented clean NinjaTrader compile, repeatable self-test report, Strategy Analyzer run and Sim101 execution/recovery test before any engine release. Keep proof/botlab code clearly labelled as non-production.

### B1 — Quint Lab's headline “later half” check is not a true chronological holdout

**File:** `lab/lib/score.js`

The scorecard splits the trade array at half its trade count and labels the second half as its out-of-sample check. That is not a fixed calendar/session boundary. If trades are sparse or unevenly distributed, the two halves can cover very different lengths and regimes.

The newer strategy factory in `lab/factory/engine.js` does use a chronological 60/40 session split, which is a stronger approach. Do not conflate that factory validation with the scorecard's trade-count split.

**Required correction:** use a predeclared date/session boundary for the scorecard, record the boundary in each result, and retain a separate untouched final holdout. The existing Backtest Integrity Standard already specifies the correct direction.

### B1 — Strategy Lab browser tests check source text, not real browser behaviour

**Files:** `quint-control/web/test/strategy-lab.test.js`, `quint-control/web/strategy-lab/app.js`

The current browser test checks that certain strings and UI elements exist, that the prototype says it is local/paper-only, and that user labels use `textContent`. It does not launch a browser or exercise actual form submission, storage failures, export, deletion, keyboard use, responsive behaviour or mobile Safari.

The prototype is intentionally local-only and disconnected from the engine. Its README states that it has no live market data, historical backtest, Playback, fill simulator, persistent engine storage or broker connection.

**Required correction:** when authorised to build, add real browser tests for the key flows and error states. Keep this prototype separate until it is deliberately promoted into the production website.

### B2 — Strategy expression validation is duplicated between domain and UI

**Files:** `quint-control/reference/strategy-lab/definition.js`, `quint-control/web/strategy-lab/app.js`

The canonical domain module and the browser prototype each implement their own expression validator. They currently share broadly similar allow-lists and depth/node limits, but they are separate implementations and can drift. The UI does not import and execute the canonical domain validator.

**Required correction:** expose one browser-safe shared validation module or generate both validators from one tested contract. Add parity tests using the same valid and invalid expression corpus. The server/engine must always validate independently; browser validation is usability only.

### B2 — Candle ingestion does not provide a complete data-quality gate

**Files:** `lab/lib/candles.js`, `quint-brain/backtest/run.js`

The candle store parses OHLCV rows and merges by timestamp. Invalid numeric rows are skipped during merge and duplicate timestamps are overwritten. The legacy Quint Brain runner also sorts and silently deduplicates duplicate timestamps. These behaviours can conceal conflicting source bars rather than producing an explicit data-quality report.

The Backtest Integrity Standard already identifies the required corrections: raw input preservation, duplicate/conflict reporting, missing-interval checks, OHLC consistency, session/timezone validation and a reproducible audit attached to each run.

**Required correction:** make data validation a hard precondition for strategy runs. Do not silently discard or overwrite a conflicting bar without recording the decision.

### B2 — Lab scorecard and legacy backtest drawdown are closed-trade measures

**Files:** `lab/lib/score.js`, `quint-brain/backtest/run.js`

The scorecard builds equity and drawdown from completed trade P&L. The legacy runner likewise reports drawdown from closed trades. Neither is a mark-to-market account risk engine and neither captures the full intratrade adverse excursion, margin stress or all account-level trailing drawdown behaviour.

**Required correction:** keep these measures labelled as closed-trade drawdown. For account eligibility and Guardian decisions, use broker-authoritative positions/equity and event-level or sufficiently granular mark-to-market risk. Never use the Lab scorecard as a live risk control.

### B2 — Quint Lab has no equivalent GitHub Actions test workflow

**Evidence:** `.github/workflows/quint-control-tests.yml` covers `quint-control/**`; the Lab has its own `lab/package.json` and test suite, but no matching Lab CI workflow was found in the reviewed workflow configuration.

The Lab's nightly instructions require `npm run test:3`, but that is not the same as a required CI check on every code change.

**Required correction:** add a separate Lab workflow after owner approval, triggered by `lab/**` and the shared bot/proof code it depends on. Keep the test job read-only and do not run the data-refresh/publishing pipeline as part of CI.

### B2 — Legacy backtest assumptions remain easy to confuse with Quint Control evidence

**Files:** `quint-brain/backtest/README.md`, `run.js`, `crosscheck.py`

The legacy harness is explicitly exploratory and not Quint Control's future backtest engine. It uses a fixed $2.50 round-trip cost assumption, OHLC-based fills and a trade-count first-half/second-half split. Its Python cross-check reimplements two selected strategies; it does not independently validate source-data quality or fill realism.

The README and Backtest Integrity Standard disclose these limitations. Keep those labels visible wherever the results are displayed. Do not treat a matching Python cross-check as proof that the data or execution model is realistic.

### B2 — Public repository hygiene tests are narrower than the repository

**File:** `quint-control/tests/structure.test.js`

The secret/account-number scan walks `quint-control/` and the Quint Control skill/Claude instructions, not every tracked file in the public repository. It is a useful local safeguard but not a repository-wide secret scan.

**Required correction:** use a repository-wide secret scanner in CI, with explicit allow-lists for synthetic fixtures. Never commit broker credentials, API keys, private account identifiers or personal P&L.

## What is good and should be preserved

- The repository separates Quint Control, Quint Brain, Chart Wizard and Quint Lab instead of mixing learning tools with execution code.
- The Strategy Definition DSL is bounded and allow-listed; it rejects unsupported operators, unsafe variable names, missing fields, excessive expression depth/node count and division by zero.
- Strategy Lab defaults to paper-only draft objects and clearly labels browser-local storage and no order routing.
- The protocol schemas are strict about message envelopes, fields and command shapes; tests reject a raw website order-submit command and commands that attempt to skip Guardian.
- The protocol specification explicitly describes local binding, session token, origin checking, heartbeat freshness, snapshots and two-step confirmation for risk-raising commands. These remain specifications until an engine implements and tests them.
- The bot lab has deterministic synthetic-candle tests for entry/exit rules, stop-first same-bar ambiguity and daily loss gating.
- The strategy factory uses chronological session splits, a candidate grid, neighbour robustness and PBO diagnostics. These are research filters, not proof of live edge.
- The Backtest Integrity Standard is unusually clear about overfitting, fill realism, data quality, event ledgers and evidence promotion. Use it as the design authority rather than weakening it to fit current prototype capabilities.
- The install/uninstall scripts use scoped Quint folders, back up before removal and require typed confirmation before deleting data. Preserve these protections while fixing the empty-source replacement defect.

## Recommended order of work after authorisation

1. **Close readiness gaps first:** fix installer staging/empty-source safety; run current Node tests and establish clean CI; add Lab CI; add repository-wide secret scanning.
2. **Build a minimal deterministic core:** account state model, position/order reconciliation, Guardian, single OrderRouter and kill switches. No AI in this path.
3. **Prove the engine in simulation:** NinjaTrader compile, event lifecycle, OCO protective orders, partial fills, rejects, reconnect, restart reconciliation, duplicate commands and kill-switch behaviour.
4. **Build the website against a mock engine and versioned protocol:** browser interaction tests, stale/disconnected states, permissions and mobile Safari.
5. **Integrate Strategy Lab only after the engine and protocol exist:** shared validation, persistent versioned definitions, historical/replay/paper adapters and immutable evidence reports.
6. **Add account-level multi-bot coordination only as a separate feature gate:** current safe runtime baseline remains one bot per account until deterministic portfolio arbitration and broker reconciliation are implemented and tested.
7. **Only then consider live authorisation:** account-specific firm rules, independent review, owner confirmation and explicit release gates.

## Audit limitations

This was a GitHub-based static review of source files, specifications, repository search results and available workflow logs. I did not execute the repository's Node test suite locally, compile C# with NinjaTrader, run PowerShell on Windows, launch the browser prototype, connect a broker or perform a live/simulation order test. No current-main CI result was available during this review. Findings are evidence-based but do not replace those runtime checks.

**Bottom line:** the architecture and research base are promising; the execution product is still at the preparation/foundation stage. The highest-value next move is not adding more bots or AI agents. It is proving the deterministic engine, installer safety, account reconciliation and test pipeline before any live trading capability is attempted.
