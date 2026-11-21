# Quint Control

**Current status: HOLD — awaiting Fable 5.2 renewal and the owner's explicit green light.** Do not begin dashboard or engine implementation yet.

## Start here

- [Fable handoff](../FABLE-START-HERE.md) — concise project roles, safety invariants, decision reconciliation and working protocol.
- [Current status](STATUS.md) — authoritative build gate, phase progress and next step.
- [Plan](PLAN.md) — original phased product plan; use alongside the newer safety/architecture specifications.
- [Repository map](../docs/REPO-MAP.md) — task-based reading paths.
- [Decision register](../docs/QUINT-DECISION-REGISTER.md) — cross-project decisions and conflict resolution.
- [Pre-Fable readiness](research/PRE-FABLE-READINESS.md) — allowed and prohibited work while HOLD is active.
- [Read-only repository audit prompt](prompts/PRE-FABLE-REPOSITORY-AUDIT.md).

## Canonical technical references

- [Automated-trading knowledge base](research/AUTOMATED-TRADING-KNOWLEDGE-BASE.md) — durable trading-system and risk principles.
- [Strategy Lab](research/STRATEGY-LAB.md) — strategy definition, validation, backtest, replay, paper forward-test and promotion workflow.
- [Backtest integrity standard](research/BACKTEST-INTEGRITY-STANDARD.md) — data quality, fill realism, validation and anti-overfitting.
- [Account-level multi-bot coordination](research/ACCOUNT-LEVEL-MULTI-BOT-POSITION-COORDINATION.md) — future design; current safe baseline remains one bot per account until coordination passes release gates.
- [Dashboard visual specification](research/DASHBOARD-VISUAL-REFERENCE-SPEC.md) — approved design direction, not permission to build.
- [Shared platform and market data](research/SHARED-PLATFORM-AND-MARKET-DATA.md) — hosting, per-user data isolation and licensing gates.
- [Autonomous runtime and uptime](research/AUTONOMOUS-BOT-RUNTIME-AND-UPTIME.md) — runtime boundaries, recovery and monitoring.
- [Fable phase prompts](FABLE-PROMPTS.md) — use only after the build gate is cleared.
- [Engine ↔ website protocol](protocol.md) — versioned message contract.

## Folder responsibilities

| Folder | Purpose |
|---|---|
| `core/` | Deterministic trading logic, independent of NinjaTrader |
| `engine/` | NinjaTrader add-on, adapters, local server and self-tests |
| `strategies/` | Individual strategy plug-ins |
| `reference/` | Testable reference implementation and domain specifications |
| `web/` | Dashboard source, mock engine and browser tests |
| `tests/` | Golden fixtures and automated tests |
| `firms/` | Prop-firm rule presets |
| `protocol/` | Schemas and example messages |
| `research/` | Evidence, design proposals and engineering knowledge |
| `prompts/` | Task-specific AI handoffs |

Drafts, screenshots, visual mockups and experimental beta assets belong in the repository-level `drafts/` area or a clearly isolated beta branch. They must not be imported by production builds.

## Tests

```sh
cd quint-control
npm test
```

Run tests only when safe and within the active authorisation gate. Never claim tests passed unless they were actually run. NinjaTrader-specific behaviour still requires the Windows/NinjaTrader environment.

Only the Quint Engine places broker orders, and only after Guardian checks and the required authorisation.
- [Source-code audit (21 Nov 2026)](research/SOURCE-CODE-AUDIT-2026-11-21.md) — implementation reality, defects, test evidence and recommended order.
