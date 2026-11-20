# Quint pre-Fable readiness and architecture improvement plan

**Status:** documentation/research scope only; awaiting owner green light and Fable 5.2 renewal before Quint Control build work begins.  
**Last updated:** 20 November 2026

## Purpose

Use the waiting period productively without starting the dashboard build, engine implementation or live-trading work. This document consolidates architecture improvements and defines a safe, evidence-led pre-build programme.

The owner has explicitly **not** given the green light to start Quint Control Phase 1. The project is waiting for Fable 5.2 to renew so it can be used to build the dashboard. Until the owner explicitly says otherwise, treat the build as **HOLD**.

## Hard scope boundary

### Allowed before green light
- Read-only repository and architecture audits.
- Documentation corrections and architecture decision records.
- Research into APIs, NinjaTrader support, exchange/data licensing and hosting.
- Identify and document bugs with file paths, line references and reproducible evidence.
- Review existing tests and CI configuration; propose missing tests.
- Read-only security review, including checking for accidentally committed secrets without printing secret values.
- Quant research methodology review and data-quality inventory.
- Small, isolated, documentation-only pull requests.

### Not allowed before green light
- Do not start Quint Control Phase 1 or build the dashboard/website shell.
- Do not implement or redesign the NinjaTrader engine, Guardian, OrderRouter, copier, bot runtime, API server, remote control plane or authentication.
- Do not implement the central multi-agent orchestrator or specialist agents.
- Do not connect broker accounts, submit orders, enable live trading or change any live execution path.
- Do not implement strategy changes, loosen filters, add bots or promote a strategy.
- Do not integrate a new market-data provider or relay/rebroadcast market data.
- Do not begin Fable phase prompts or consume paid Fable/API usage for implementation.
- Do not merge speculative architecture into the production plan as a settled decision.
- Do not change Chart Wizard, Quint Brain, their built artifacts, or publish new artifacts as part of this readiness work.

If a discovered issue appears to create immediate security or live-trading danger, report it clearly and ask the owner before making a code change.

## Current project facts to preserve
- Chart Wizard and Quint Brain are existing learning/analysis apps. They do not place orders.
- Quint Control is the planned NinjaTrader 8 execution engine and dashboard; its Phase 1 and Phase 2 remain not started in STATUS.md.
- The Strategy Lab Phase 3A branch is a local prototype only. It is not connected to the engine, market data, historical backtesting, live paper fills or live orders.
- The five-pillar playbook is the owner's strategy and must be preserved.
- All live order paths must remain behind the deterministic Guardian and single OrderRouter. AI must never bypass them.
- Claude/Fable is an optional research, explanation and authoring layer. It must never be a runtime dependency for managing an open trade.
- The owner is waiting for Fable 5.2 renewal before dashboard implementation. Do not assume a renewal date or model availability.

## Architecture improvements to design, not implement yet

### 1. Shared deterministic trading core
Long-term direction: one canonical, versioned strategy/risk/event core should be consumed by historical backtesting, replay, paper simulation and eventual live adapters. Avoid separate implementations silently drifting apart.

Before proposing a refactor, map the current source and identify exact duplicated or extracted functions. Do not assume a shared package is automatically better; quantify coupling and build complexity first.

### 2. Quint intelligence and specialist agents
Explore a future Quint orchestration layer with bounded specialist roles:
- Market/regime analyst: describes market state from timestamped, permitted data.
- Setup/signal analyst: checks whether a named strategy's deterministic conditions are met.
- Research agent: proposes falsifiable hypotheses and reviews evidence.
- Performance analyst: compares expected and actual fills, costs, slippage, drawdown and strategy drift.
- Risk Guardian: **not an LLM agent**; remains deterministic code and final authority.
- Execution engine: **not an LLM agent**; remains deterministic, broker-aware code behind Guardian and OrderRouter.

Agents may produce typed proposals and explanations. They must not directly submit, cancel or modify orders, change running strategy rules, change risk limits, or promote strategies. The Guardian cannot be overruled by an agent, model, dashboard or administrator shortcut.

Do not build this now. First audit existing interfaces and define trust boundaries, typed contracts, audit logs, timeouts and failure behaviour.

### 3. Evidence-led strategy research laboratory
Build on the existing Strategy Lab specification rather than creating a competing system.

Research requirements:
- Preregister each hypothesis, parameter search space, data period and acceptance criteria before running it.
- Keep a permanent registry of failed, inconclusive and successful experiments to prevent repeated rediscovery.
- Separate training, validation, walk-forward and untouched final holdout data chronologically.
- Account for multiple testing, parameter search and selection bias.
- Report net expectancy, profit factor, drawdown, trade count, confidence intervals, MAE/MFE, exposure, concentration, regime/year splits and costs.
- Stress slippage, spread, commissions, latency, rejected orders, partial fills and stop gaps where data supports it.
- Do not compare raw profit across different holding horizons as if tests were equivalent.
- Never call a strategy profitable or live-ready from one attractive backtest or a small sample.
- Preserve negative evidence and reproduce existing reports from source data before relying on them.

### 4. Account-aware risk and execution integrity
Design requirements to verify against code when implementation is authorised:
- Per-account risk profile and firm-rule version; no shared mutable account state.
- Per-account daily loss, drawdown, size, consistency, news and session restrictions.
- Aggregate exposure and correlated-account/hedging checks where applicable.
- Unique idempotency keys and duplicate-order prevention.
- Explicit handling of partial fills, rejected/cancelled orders, reconnects and order-state uncertainty.
- Reconcile broker positions and working orders before any restart/resume.
- Independent account health and copy-trade reconciliation; one account's failure must not be silently represented as success on another.
- Kill switches and hard risk constraints remain deterministic and cannot be bypassed.

### 5. Expected-versus-actual performance and controlled drift monitoring
For each trade, preserve the strategy version/hash, decision inputs, intended entry/stop/target, account, order lifecycle, fills, fees, slippage and exit reason.

Compare live/paper execution with the matching backtest and expected execution model. Detect drift by strategy, instrument, session, volatility regime and account.

The system may recommend pausing a strategy for review. It must not silently retune, rewrite, or self-promote a running strategy. Any change creates a new immutable version and must pass the same validation and approval process.

### 6. AI-independent runtime and recovery
Keep the existing research decision: deterministic event-driven bot processes run inside the NinjaTrader-hosted Quint Engine. No Claude, browser tab, cloud chat, or periodic LLM polling in the execution loop.

Before any live resume after restart or uncertainty: reconnect, fetch broker state, reconcile positions/orders/fills, verify protective orders and Guardian eligibility, and require safe explicit recovery when state is ambiguous. Cloud/browser loss must not remove broker-held protection. Engine/host loss must trigger external monitoring and a clear offline alert.

### 7. Market-data correctness and licensing
Keep each user's market-data entitlement and stream isolated. Do not relay or rebroadcast a personal feed to another user without written vendor/exchange approval. Show LIVE, DELAYED, STALE, DISCONNECTED or MARKET CLOSED with timestamps. A stale feed blocks new automated entries.

Do not use TradingView polling as an automated market-data backbone. Preserve existing call-limit rules. Any future data adapter requires an explicit licensing and technical approval gate.

### 8. Security and public-repository hygiene
The repository is currently public according to existing research. Audit for exposed credentials and sensitive account data without echoing secret values into chat, logs, issue comments or reports. If a possible secret is found, report file/path and secret type only, ask the owner to rotate/revoke it, and do not copy its value.

Review authentication, tenant isolation, authorization, secret storage, transport security, command replay, audit logging, dependency risks and remote access design before implementation. Do not make the repository private or change GitHub settings without the owner's explicit decision.

### 9. Test and release discipline
Before implementation, define test coverage for:
- deterministic core parity across backtest/replay/paper/live adapters;
- schema and protocol compatibility;
- Guardian invariants and every order submission route;
- partial fills, rejects, duplicates, disconnects and recovery;
- stale/out-of-order market events, DST, session boundaries and contract rolls;
- multi-account isolation and copier reconciliation;
- browser/API failures without engine failure;
- AI unavailable, malformed AI output and prompt-injection attempts;
- mobile and desktop usability when the dashboard phase is approved.

Use CI for fast deterministic tests, but do not treat green CI as proof of NinjaTrader integration. NinjaTrader-specific compile, Playback and Sim101 checks still need the documented Windows test process.

## Documentation inconsistency to resolve

There is currently a cost discrepancy:
- Root CLAUDE.md says $0.75 MNQ commission per side plus one tick of slippage per side.
- Quint Control STATUS.md and the Quint Control skill say $0.50 commission per side plus one tick of slippage per side.

Do not silently choose one. Confirm the actual broker/account commission schedule with the owner or an authoritative broker statement, then define versioned per-account cost profiles and make backtest assumptions explicit. Until confirmed, label the discrepancy OPEN and do not use either figure as universal truth.

## Suggested sequence while waiting
1. Run the read-only Claude repository audit using prompts/PRE-FABLE-REPOSITORY-AUDIT.md.
2. Record only verified findings with exact paths, line numbers, reproduction steps and severity.
3. Separate true bugs from design preferences, missing future features and unverified assumptions.
4. Review the audit together; approve only documentation/research-only items that do not cross the hard scope boundary.
5. Keep a short list of decisions requiring the owner, NinjaTrader, broker, prop firm or exchange.
6. Wait for the owner to confirm Fable 5.2 is renewed and explicitly give the green light.
7. Only then resume the approved Fable phase sequence, beginning with the next authorised phase. Re-read STATUS.md and current branches first.

## Green-light checklist

Quint Control build work remains on HOLD until the owner explicitly confirms:
- Fable 5.2 access has renewed and is usable for the intended build workflow.
- The owner has reviewed the audit and accepted the proposed scope.
- The owner explicitly authorises starting Phase 1.
- Any required vendor/data licensing questions that block the selected architecture have a documented safe answer.

A Fable renewal alone is not automatic permission to start building. The owner must give the green light.
