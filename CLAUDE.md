# Quint repository — instructions for Claude Code

Read this file first, then read the README for the specific product being changed. This repository contains separate products with distinct responsibilities.

## Product boundaries

- **Quint Control (`quint-control/`)** is the automated trading platform. It owns the NinjaTrader 8 engine, bots, Guardian, single OrderRouter, account rules, Strategy Lab, dashboard website and automated-trading research.
- **Chart Wizard (`chart-wizard/`)** is a chart-reading and learning simulator. It does not place broker orders.
- **Quint Brain (`quint-brain/`)** is a market-analysis/learning app. It does not place broker orders. Its strategy backtest harness lives in `quint-brain/backtest/`.
- **Quint legacy (`quint/`)** is retained for reference; do not assume it is the current implementation.

Never put Quint Control bot-engine code inside Chart Wizard or Quint Brain. Never treat the Quint Brain backtest harness as the automated Quint Control execution engine.

## Working rules

1. Before changing a project, read its README, applicable plan/status, relevant skill and tests.
2. Keep changes scoped to one product and one coherent task. Update references when paths or interfaces change.
3. Preserve existing functionality, user-authored strategies and history. Do not remove the owner's 5-pillar playbook.
4. Never commit credentials, API keys, passwords, account numbers or private user data.
5. Run relevant tests and report exact commands and actual results. Never claim tests passed if they were not run.
6. Use a separate branch and reviewable PR for substantive work. Do not merge or alter live execution controls without explicit owner approval.
7. Explain technical changes in clear, practical language.

## Automated trading safety — Quint Control only

For bot, broker, account, Guardian or order-routing work, read `quint-control/README.md`, `quint-control/STATUS.md`, `quint-control/PLAN.md` and `.claude/skills/quint-control/SKILL.md`.

- Strategy signals and risk calculations must be deterministic and shared between signal-assisted and automated modes.
- AI may specify strategies, explain research and propose experiments. It must not be the tick-by-tick execution or risk controller.
- All order submissions, modifications, cancellations and flatten actions pass through the single OrderRouter and Guardian.
- Paper and live accounts, journals, order IDs and P&L must be isolated.
- Automated live orders require explicit per-account authorisation and Guardian checks. No silent mode changes.
- Never bypass, disable or weaken Guardian rules, protective-order checks or kill switches.
- Strategy research must not modify Guardian, OrderRouter or live execution paths.
- No strategy is live-ready without reproducible, net-of-cost out-of-sample evidence and required forward testing.

## Research locations

- Permanent automated-trading knowledge: `quint-control/research/AUTOMATED-TRADING-KNOWLEDGE-BASE.md`
- MNQ strategy research: `quint-control/research/mnq/`
- Prop-firm/overnight research: `quint-control/research/prop-firms/`
- Strategy Lab specification: `quint-control/research/STRATEGY-LAB.md`
- Quint Brain / Chart Wizard backtests: `quint-brain/backtest/`

Label source quality, instrument, data period, assumptions, replication status and failure criteria. Keep unverified hypotheses separate from validated findings.

## Project entry points

| Task | Read first |
|---|---|
| Automated bots, Quint website, engine or Guardian | `quint-control/README.md`, `quint-control/STATUS.md`, `quint-control/PLAN.md` |
| Bot strategy research | `quint-control/research/AUTOMATED-TRADING-KNOWLEDGE-BASE.md` |
| Chart Wizard | `chart-wizard/README.md` |
| Quint Brain | `quint-brain/README.md` |
| Quint Brain backtests | `quint-brain/backtest/README.md` |
