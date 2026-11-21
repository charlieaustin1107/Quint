# Quint repository map

A task-oriented index. Prefer this over loading the whole repository.

## Product boundaries

| Product | Source / working area | Role | Not its role |
|---|---|---|---|
| Quint Control | `quint-control/` | Planned NinjaTrader execution engine, Guardian, OrderRouter, copier, account policies, Strategy Lab and dashboard | Not yet authorised to build while STATUS is HOLD |
| Quint Brain | `quint-brain/src/` | Market analysis and learning app | Not an order execution engine |
| Chart Wizard | `chart-wizard/src/` | Separate chart-reading game/learning simulator | Not a Quint website module |
| Quint Lab | `lab/` | Research memory, strategy registry, scorecards, paper forward testing and HQ | Not broker execution |
| Quint legacy | `quint/` | Historical reference | Not current source of truth |

## Read paths by task

| Task | Minimum reading path |
|---|---|
| Any new session | `CLAUDE.md` → `FABLE-START-HERE.md` → `quint-control/STATUS.md` |
| Quint Control readiness / audit | `quint-control/research/PRE-FABLE-READINESS.md` → `quint-control/prompts/PRE-FABLE-REPOSITORY-AUDIT.md` |
| Dashboard design (after gate only) | `quint-control/research/DASHBOARD-VISUAL-REFERENCE-SPEC.md` → `quint-control/web/README.md` → `quint-control/protocol.md` |
| Engine / risk / orders (after gate only) | `quint-control/README.md` → `quint-control/STATUS.md` → `.claude/skills/quint-control/SKILL.md` → relevant `core/`, `engine/`, `tests/` docs |
| Strategy Lab | `quint-control/research/STRATEGY-LAB.md` → `quint-control/reference/strategy-lab/README.md` → relevant tests |
| Backtest quality | `quint-control/research/BACKTEST-INTEGRITY-STANDARD.md` |
| Multiple bots on one account | `quint-control/research/ACCOUNT-LEVEL-MULTI-BOT-POSITION-COORDINATION.md` |
| Shared Quint / Brain / Lab / Control roles | `docs/QUINT-ARCHITECTURE-SUGGESTIONS.md` → `docs/QUINT-SHARED-INTELLIGENCE-CONTRACT.md` → `docs/schemas/shared-message-v1.schema.json` |
| Chart Wizard knowledge used by Quint | `docs/CHART-WIZARD-CORE-KNOWLEDGE.md` only; keep Chart Wizard product separate |
| Quint Brain changes | `quint-brain/README.md` → `quint-brain/src/` and its own tests |
| Chart Wizard changes | `chart-wizard/README.md` → `chart-wizard/src/` and its own tests |
| Quint Lab / HQ | `lab/README.md` → `lab/NIGHTLY.md` or `lab/HQSYNC.md` only as needed |

## Source, generated and test assets

- Chart Wizard and Quint Brain are built from `src/`; do not hand-edit their generated `index.html`.
- Quint Brain's backtest harness is `quint-brain/backtest/`; it is not the future Quint Control bot-validation engine.
- Quint Control's engine/website source and tests live under `quint-control/`; check the current folder README and build scripts before assuming an implementation exists.
- Protocol schemas and examples under `quint-control/protocol/` are contracts; validate changes against the tests.
- `quint-control/web/strategy-lab/index.html` is a standalone local prototype, not a production dashboard module.
- `quint-control/design-reference/` on the isolated beta branch is design-only. It is not production source.
- `lab/` stores research and paper-test artefacts. A scorecard or paper result is not a live trading record.

## Keep the tree understandable

1. Production source, tests, schemas and build inputs stay in their product folders.
2. Research that explains a product stays in that product's `research/` folder.
3. Cross-product architecture and compact shared references stay in root `docs/`.
4. Drafts, mockups, prototypes, screenshots and beta-only work belong under root `drafts/`; do not import them into production build inputs.
5. Do not duplicate full documents to create shorter copies. Create a concise index or decision summary and link to the canonical source.
6. Before moving or deleting anything, inspect imports, scripts, tests, workflows and Git history. Prefer leaving legacy source in place with a clear label until a separate migration is approved.
