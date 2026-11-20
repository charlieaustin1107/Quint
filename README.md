# Quint — repository guide

This repository contains separate products. Keep their code, tests, research and release workflows inside their own folders.

| Product | Folder | Purpose | Places broker orders? |
|---|---|---|---|
| **Quint Control** | `quint-control/` | Automated trading platform: NinjaTrader engine, bots, Guardian, order router, Strategy Lab and dashboard website | **Yes**, only through its protected engine and explicit live authorisation |
| **Chart Wizard** | `chart-wizard/` | Chart-reading game and learning simulator | No |
| **Quint Brain** | `quint-brain/` | Market-analysis app, live market read, 5-pillar checks and learning/backtest views | No |
| **Quint legacy** | `quint/` | Older standalone app retained for reference | No |
| **Quint Lab** | `lab/` | Quint's research memory, strategy factory, bot scorecards, paper forward test and the Quint HQ voice page | No |

## Where things belong

- Automated-bot research and Claude knowledge: `quint-control/research/`
- Bot engine, Guardian, website, Strategy Lab and bot-specific tests: `quint-control/`
- Chart Wizard source/tests: `chart-wizard/src/`
- Quint Brain source/tests: `quint-brain/src/`
- Chart Wizard/Quint Brain strategy backtest harness: `quint-brain/backtest/`. This is not the automated Quint Control execution engine.
- Global Claude instructions: `CLAUDE.md`; then read the relevant product README and `quint-control/STATUS.md`.

## Start here

1. Read `CLAUDE.md` for repository rules and product boundaries.
2. Read [the repository guide](docs/REPOSITORY-GUIDE.md) for the product map and source-of-truth rules.
3. Read [the testing and validation matrix](docs/TESTING-AND-VALIDATION.md) before running checks.
2. For automated bots/site work, read `quint-control/README.md`, `quint-control/STATUS.md`, `quint-control/PLAN.md` and `quint-control/research/AUTOMATED-TRADING-KNOWLEDGE-BASE.md`.
3. For Chart Wizard, read `chart-wizard/README.md`.
4. For Quint Brain, read `quint-brain/README.md`.
6. For Quint Lab and Quint HQ, read `lab/README.md`.

Do not move code between products just to share a concept. Prefer explicit, tested interfaces. Keep credentials and account secrets out of Git.
