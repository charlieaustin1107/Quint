# Quint decision register

This file records cross-cutting decisions and clarifies conflicts between older notes. Detailed product specifications remain the canonical technical references.

## Settled product direction

- Quint is the primary operator and user-facing coordinator.
- Quint Brain supplies market context and setup analysis; no order authority.
- Quint Lab supplies strategy definitions and evidence; no order authority.
- Quint Control owns account-specific risk, Guardian, the single OrderRouter, execution and audit.
- Chart Wizard remains a separate product. Only selected distilled knowledge may inform Quint.
- Quint Brain's backtest harness is not the Quint Control execution engine.

## Execution safety — invariant

Every broker order must pass Guardian and the one OrderRouter. No AI, website, copier, bot, cloud service or specialist component can bypass them. Missing, stale, malformed, contradictory or unreconciled state fails closed. The broker account is authoritative for actual positions and orders.

## Multiple bots per account — current rule versus target

| Dimension | Decision |
|---|---|
| Current safe runtime baseline | One active bot per account |
| Desired future capability | Multiple independent bots per account |
| Required prerequisite | Account-level Portfolio Manager / Position Coordinator, virtual bot allocations, deterministic arbitration, aggregate risk and broker reconciliation |
| Conflict default | Reject/defer opposing exposure; do not silently net or reverse |
| Order path | Bots → coordinator → Guardian → single OrderRouter |
| Release status | Proposed only; not implemented or approved for live trading |

This reconciles the current one-bot-per-account rule in STATUS/skill with the owner's later multi-bot requirement: design for the future capability, but never imply it is safe or available before the coordinator and release gates exist. No strategy may place orders directly.

## Account-specific objectives

Each account and environment has its own risk profile and ledger. Evaluation mode prioritises rule-compliant passing; funded mode can apply a separately configured profit-protection/growth objective. Protect accrued profit while allowing only configured pullbacks within hard limits. Never increase hard risk limits to chase targets. Stop or reduce new entries at configured target/drawdown thresholds.

## Evidence and promotion

- Strategy ideas, prototypes, backtests, replay and live paper tests are distinct states.
- A profitable backtest alone does not validate a strategy.
- Keep immutable strategy versions and test configurations; use chronological holdouts and realistic costs/fills.
- No automatic promotion to live. Require evidence review, account compatibility, Guardian checks and separate owner authorisation.

## Interface and design

- Quint Control is a command platform, not a generic KPI dashboard.
- No data-bento layout.
- Five requested themes: Quint Command (purple), Quint Gold Command, Institutional, Neural, Minimal.
- Four independent layouts: Command Centre, Trading Desk, Research Desk, Account Monitor.
- Desktop quality must not compromise deliberate iPhone/mobile usability.
- Visual prototypes and betas are not production implementations and must remain isolated.

## Build and release gate

Quint Control remains HOLD until Fable 5.2 renewal and the owner's explicit green light. Renewal alone is insufficient. Documentation-only preparation does not clear the gate. See `quint-control/STATUS.md`.
