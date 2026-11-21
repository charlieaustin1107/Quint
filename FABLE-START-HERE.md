# Fable / Claude handoff — Quint repository

**Purpose:** one short, authoritative entry point for a new Fable/Claude build session. This file is an index and decision summary, not permission to build.

## 0. Gate first — do not skip

**Quint Control is on HOLD.** The owner is waiting for Fable 5.2 renewal and must separately give an explicit green light. Neither this handoff nor a completed audit clears the gate.

Until both conditions are met, only read-only inspection, research and documentation-only changes are allowed. Do not implement or scaffold the dashboard, engine, Guardian, OrderRouter, copier, bot runtime, authentication, API, protocol changes, multi-agent orchestration or strategy changes. Do not connect broker accounts, place orders, deploy, publish apps or consume paid Fable/API calls for implementation.

The current gate and exact restrictions are recorded in `quint-control/STATUS.md` and `quint-control/research/PRE-FABLE-READINESS.md`. If anything conflicts, obey the stricter restriction and ask the owner.

## 1. Read in this order

1. `CLAUDE.md` — global repository rules and product boundaries.
2. `quint-control/STATUS.md` — current phase, HOLD status, decisions and next action.
3. `.claude/skills/quint-control/SKILL.md` — engineering rules, testing expectations and Quint Control-specific decisions.
4. `quint-control/README.md` — product structure and important entry points.
5. Only the specification relevant to the authorised task, using `docs/REPO-MAP.md`.

Do not load every research document into context. Search the map, open only the relevant source/spec and follow its links.

## 2. What Quint is

Quint is the primary operator and user-facing decision coordinator. It brings together specialist evidence, explains the decision and requests account-specific approval from Quint Control.

| Component | Responsibility | Authority boundary |
|---|---|---|
| **Quint** | Primary operator, orchestration, decision synthesis and user communication | Cannot invent evidence or bypass Control |
| **Quint Brain** | Timestamped market context, structure, levels, liquidity and setup assessment | Analysis only; no order authority |
| **Quint Lab** | Strategy definitions, historical tests, paper forward tests, scorecards and evidence | Research only; cannot approve live trading or self-promote |
| **Quint Control** | NinjaTrader engine, account policies, Guardian, single OrderRouter, execution, audit and dashboard | Sole risk/execution authority |
| **Chart Wizard** | Separate learning product; selected knowledge may be distilled into a compact reference | Not part of Quint's website/runtime |
| **Quint legacy** | Historical app retained for reference | Not current source of truth |

The website is a control/visualisation surface. The local NinjaTrader engine is the execution authority. AI is not in the tick-by-tick execution loop and must never send broker orders.

## 3. Non-negotiable execution and account safety

- Every order must pass the deterministic Guardian and the one OrderRouter. No other component may submit, cancel, replace or flatten broker orders.
- Broker account state is authoritative for real positions, orders, executions and P&L.
- Fail closed on stale, missing, malformed, contradictory or unreconciled state. Stop new entries; preserve/verify protective stops; alert and journal.
- Separate LIVE, SIMULATION, PAPER, HISTORICAL BACKTEST and PLAYBACK identifiers, ledgers, fills, P&L and UI labels. Paper cannot call the live order route.
- Each account has its own firm rules, daily loss, drawdown, profit target, consistency, risk budget, contract cap and profit-protection state. Never copy policy values between accounts.
- Prioritise evaluation/pass mode when configured; protect accrued profit, allow only defined healthy pullbacks, and stop/reduce new entries at account-specific boundaries. Never loosen hard limits to chase targets.
- Copier and cross-account checks must prevent prohibited opposing/correlated exposure.
- Never store credentials, account numbers or private account data in Git, browser storage or demo fixtures.

## 4. Multiple bots on one account — resolve the apparent contradiction

**Current safe baseline:** one active bot per account. This is the runtime rule until a coordinated multi-bot feature has passed its own release gates.

**Target capability:** the owner wants the platform designed to support multiple distinct bots on one account in future, without the bots fighting, hedging or corrupting position state. This is not implemented functionality.

Before enabling it, require one account-level Portfolio Manager / Position Coordinator:
`Bots → account-level arbitration and virtual allocation ledger → Guardian → single OrderRouter → broker`.

The broker account's net position remains authoritative. Bot positions are virtual allocations. Opposing proposals are rejected/deferred by default; same-direction aggregation requires combined risk approval. A bot exit may reduce only its own allocation. Any reconciliation mismatch blocks new entries. Until that coordinator exists and is tested, enforce one bot per account. See `quint-control/research/ACCOUNT-LEVEL-MULTI-BOT-POSITION-COORDINATION.md`.

This rule supersedes neither the current safe baseline nor the owner's desired future capability: it distinguishes what may run now from what must be designed and tested later.

## 5. Product boundaries and source-of-truth map

- Quint Control engine/dashboard: `quint-control/`
- Strategy Lab definition and testing specification: `quint-control/research/STRATEGY-LAB.md`
- Engine ↔ website message contract: `quint-control/protocol.md`, schemas in `quint-control/protocol/`
- Permanent automated-trading knowledge: `quint-control/research/AUTOMATED-TRADING-KNOWLEDGE-BASE.md`
- Account-level multi-bot future design: `quint-control/research/ACCOUNT-LEVEL-MULTI-BOT-POSITION-COORDINATION.md`
- Backtest quality rules: `quint-control/research/BACKTEST-INTEGRITY-STANDARD.md`
- Shared intelligence roles/contracts: `docs/QUINT-ARCHITECTURE-SUGGESTIONS.md`, `docs/QUINT-SHARED-INTELLIGENCE-CONTRACT.md`
- Condensed Chart Wizard knowledge only: `docs/CHART-WIZARD-CORE-KNOWLEDGE.md`
- Quint Brain source: `quint-brain/src/`; its backtest harness is not the Quint Control execution engine.
- Chart Wizard source: `chart-wizard/src/`; do not hand-edit generated HTML.
- Quint Lab: `lab/`; research and paper evidence, not broker execution.

See `docs/REPO-MAP.md` for task-based reading paths and generated/source distinctions.

## 6. Research and code are not interchangeable

Every feature must be labelled accurately: implemented, tested, prototype, proposed, blocked or unknown. A research document, UI mockup, test fixture or strategy backtest is not proof of a production feature or a profitable edge.

Before claiming functionality:
1. Locate the actual implementation.
2. Trace the call path and permissions.
3. Identify the tests that exercise it.
4. Run the relevant tests where the environment permits.
5. State exactly what was not tested (especially NinjaTrader/Windows/broker behaviour).

Do not merge speculative proposals into settled runtime requirements without owner approval.

## 7. Fable working protocol

- Work on a dedicated branch; never work directly on `main`.
- Before a multi-file task, provide a short plan and list intended paths.
- Keep changes scoped to the authorised phase.
- Do not move, rename or delete source files merely to make the tree look tidy. Preserve history and build scripts; propose risky moves separately.
- Keep drafts, screenshots, UI mockups, prototypes and beta assets under `drafts/` (or a clearly named isolated beta branch). They must not be imported by production builds.
- Keep production source, tests, schemas and reproducible build inputs in their product folders.
- Run the relevant test suite; for an authorised completed phase, follow the phase requirement of three consecutive passing runs and the owner's checklist.
- Update `quint-control/STATUS.md` with actual changes, test commands/results, limitations, blockers and one precise next step.
- Open a PR for review. Never merge, deploy, publish artifacts or enable live trading without the required separate approval.

## 8. Current next step

While HOLD remains active: perform the read-only repository audit in `quint-control/prompts/PRE-FABLE-REPOSITORY-AUDIT.md`. Report evidence, exact paths, test results, unresolved decisions and a prioritised plan. Then stop and wait for the owner's explicit build clearance.
