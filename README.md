# Quint — repository guide

This repository contains separate products. Keep their code, tests, research and release workflows inside their own folders.

**For AI-assisted work, start with [FABLE-START-HERE.md](FABLE-START-HERE.md).** It summarises Quint's roles, non-negotiable safety rules, the current build gate and the minimum reading path. Use [docs/REPO-MAP.md](docs/REPO-MAP.md) to find the canonical file for a task, and [docs/QUINT-DECISION-REGISTER.md](docs/QUINT-DECISION-REGISTER.md) to resolve cross-project decisions.

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
- Condensed chart-reading knowledge distilled from the separate Chart Wizard project: `docs/CHART-WIZARD-CORE-KNOWLEDGE.md`
- Proposed Quint operator architecture and component suggestions: `docs/QUINT-ARCHITECTURE-SUGGESTIONS.md`
- Proposed shared component message contract: `docs/QUINT-SHARED-INTELLIGENCE-CONTRACT.md` and `docs/schemas/shared-message-v1.schema.json`
- Quint Brain source/tests: `quint-brain/src/`
- Chart Wizard/Quint Brain strategy backtest harness: `quint-brain/backtest/`. This is not the automated Quint Control execution engine.
- Global Claude instructions: `CLAUDE.md`; then read the relevant product README and `quint-control/STATUS.md`.
- Drafts, beta UI and experimental assets: `drafts/` (never imported into production builds).

## Start here

1. Read `CLAUDE.md` for repository rules and product boundaries.
2. Read `FABLE-START-HERE.md` for the concise handoff and current guardrails.
3. For automated bots/site work, read `quint-control/README.md`, `quint-control/STATUS.md`, `quint-control/PLAN.md` and only the relevant research file identified in `docs/REPO-MAP.md`.
4. For Quint's proposed component integration, read `docs/QUINT-ARCHITECTURE-SUGGESTIONS.md` and `docs/QUINT-SHARED-INTELLIGENCE-CONTRACT.md`. Chart Wizard remains separate; read its condensed knowledge reference only when relevant.
5. For Quint Brain, read `quint-brain/README.md`.
6. For Quint Lab and Quint HQ, read `lab/README.md`.

Do not move code between products just to share a concept. Prefer explicit, tested interfaces. Keep credentials and account secrets out of Git.
