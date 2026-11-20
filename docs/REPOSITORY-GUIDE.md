# Quint repository guide

## Product map

| Product | Location | Responsibility | Broker orders |
|---|---|---|---|
| Quint Control | `quint-control/` | Planned NinjaTrader 8 engine, Guardian, OrderRouter, copier, bots, Strategy Lab and dashboard | Yes, only through the protected deterministic engine after explicit authorisation |
| Chart Wizard | `chart-wizard/` | Chart-reading game and learning simulator | No |
| Quint Brain | `quint-brain/` | Market analysis, 5-pillar learning, records and alerts; includes a legacy exploratory backtest harness | No |
| Quint Lab / Quint HQ | `lab/` | Research registry, strategy factory, scorecards, Lucid simulator, paper-forward ledger and voice hub | No |
| Quint legacy | `quint/` | Older standalone app retained for reference | No |

## Source-of-truth order

1. `CLAUDE.md` — repository-wide rules and product boundaries.
2. Product `README.md` — how that product is built, tested and maintained.
3. Quint Control `STATUS.md` — current phase, approval gate, blockers and next action.
4. Quint Control `PLAN.md` — full product specification and architecture.
5. `FABLE-PROMPTS.md` — phase-specific implementation handoffs; use only after approval.
6. Product skills under `.claude/skills/` — operational rules for the relevant product.
7. Research notes — evidence and proposals, not automatic approval to implement.

If a dated session log conflicts with current status, current STATUS and the owner's latest explicit decision win. Do not treat a research proposal as an approved product decision.

## Important boundaries

- Quint Control owns all automated execution, Guardian, OrderRouter, account rules and bot runtime. Do not move these into Chart Wizard, Quint Brain or Quint Lab.
- Chart Wizard and Quint Brain are learning/analysis products. Their backtest harness is not Quint Control's future bot-validation engine.
- Quint Lab is a research and paper-evidence system; it never places orders.
- Strategy Lab 3A is a local browser prototype. It validates drafts and paper-scenario plans; it is not connected to market data, historical backtesting, broker execution or the NinjaTrader engine.
- The live execution authority must remain deterministic. AI can research, propose and explain; it cannot bypass Guardian or submit orders.
- One bot per account at a time; no prohibited hedging across accounts; every order must pass the Guardian and single OrderRouter.
- Keep account-specific financial information, private journal data, credentials and API keys out of this public repository.

## Quint Control current gate

**HOLD.** Phase 0 is complete. Phases 1 and 2 are not started. Fable renewal does not itself authorise implementation; wait for the owner's explicit green light. Read `quint-control/STATUS.md` before any work.

## UI / UX guardrails

- Design phone-first, but provide a capable desktop layout for the NinjaTrader workstation.
- Do not use a data-bento dashboard layout. Keep market information in purposeful charts, tables and clear panels rather than decorative metric-tile grids.
- Never fabricate account balances, P&L, fills, win rates, drawdown or market prices. Label demo/mock data.
- Make account identity, simulation/live mode, connection state, data freshness, Guardian state and kill-switch state unmistakable.
- Status must not rely on colour alone; critical controls must work without hover.

## Where work belongs

- Automated trading research: `quint-control/research/`
- Strategy Lab specs and prototype: `quint-control/research/` and `quint-control/web/`
- Chart Wizard source and browser tests: `chart-wizard/src/`
- Quint Brain source and tests: `quint-brain/src/`
- Legacy app backtest harness: `quint-brain/backtest/`
- Lab strategy memory: `lab/brain/registry.json` (canonical status/evidence) and `lab/brain/journal.md` (chronological history)
- Lab factory rules: `lab/FACTORY.md`
- Current Quint Control progress: `quint-control/STATUS.md`

