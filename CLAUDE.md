# Quint — Claude working instructions

## Start here
1. Read `quint-control/STATUS.md` for the current phase and next task.
2. Read `.claude/skills/quint-control/SKILL.md` when working in Quint Control.
3. Read only the relevant specification or phase prompt linked below. Do not load every research file by default.
4. Before finishing, update STATUS with completed work, tests, blockers and the exact next step.

## Product map
- `chart-wizard/`: learning game and practice simulator. Source is in `chart-wizard/src/`; build it, never hand-edit its generated HTML.
- `quint-brain/`: standalone Quint analysis app. Reuses selected Chart Wizard source; follow its build instructions below.
- `quint-control/`: NinjaTrader 8 engine, bots, Guardian, copier, local dashboard and assistant. This is the automated trading product.
- `backtest/`: legacy exploratory candle backtests for Chart Wizard/Quint Brain. Not the future Quint Control bot-validation engine.
- `quint/`: superseded standalone app; do not treat it as the active source.
This repository is the source of truth. Do not publish an artifact unless the user explicitly asks.

## Non-negotiable product and safety rules
- Explain work in plain English. Give exact numbered Windows steps when the owner must use the computer. Show times in UK and New York time.
- Quint must support research across scalping, intraday, swing and longer-term strategies. Do not assume one horizon is the only priority.
- Never claim a strategy is profitable without robust, net-of-cost, chronological out-of-sample evidence. Log failed experiments; do not hide trial count or cherry-pick results.
- AI may research, interpret strategy ideas and explain results. It must not make tick-by-tick execution or risk decisions.
- All orders must pass through the existing Guardian and single OrderRouter. Preserve kill switches, firm rules, account separation and explicit per-account live authorisation. Never bypass safety controls.
- Simulation/paper and live must be technically separated. Never put credentials, API keys or account secrets in Git.
- Do not modify live execution, Guardian, OrderRouter, account permissions or merge to `main` unless the user explicitly authorises that specific change.
- One focused, reviewable pull request per task. Prefer documentation/research branches for research. Do not merge PRs on the user's behalf.

## Research and backtesting
- Strategy Lab specification: `quint-control/research/STRATEGY-LAB.md`.
- Mandatory integrity requirements: `quint-control/research/BACKTEST-INTEGRITY-STANDARD.md`.
- Detailed architecture: `quint-control/PLAN.md`; build prompts: `quint-control/FABLE-PROMPTS.md`.
- For every strategy hypothesis record exact rules, data needs, costs/fill assumptions, validation plan, failure criteria and sources.
- Use immutable run manifests, audited data, deterministic event/ledger logic, realistic execution costs, chronological walk-forward and an untouched locked holdout. OHLC-only results must be labelled approximate; handle ambiguous stop/target bars adversely.
- MNQ reference: $2 per index point; 0.25-point tick = $0.50. Load instrument and account costs from versioned metadata; never assume one fee schedule applies to every account.
- The legacy `backtest/` trade-count half split is not out-of-sample. Its fixed $2.50 round-trip assumption is not a universal account cost. Treat its outputs as exploratory.
- Do not silently rewrite historical results. Re-run under a versioned engine and label old outputs accurately.

## Build and test commands
- Chart Wizard: `cd chart-wizard/src && python3 build.py && python3 build.py --prod`.
- Quint Brain (after changing shared Chart Wizard functions): `cd quint-brain/src && python3 extract.py "$(cat roots.txt)" "$(cat mine.txt)" && python3 patch.py && python3 build.py && python3 build.py --prod`.
- Quint Control: `cd quint-control && npm test`.
- Run the relevant tests before proposing a change. Do not claim tests passed unless they were actually run; state any unavailable environment or manual NinjaTrader checks.

## TradingView data limits
TradingView calls are account-wide and plan-limited. Never add timer polling. Reuse cached candles and request only missing/new data. Practice mode must not call TradingView. If the feed is unavailable, report the age/source of cached data rather than inventing prices.

## Chart Wizard product constraints
- Keep the learning experience simple: teach only the strongest 2–3 evidenced strategies plus the owner's 5-pillar playbook.
- Never remove the 5-pillar sequence: Location → Liquidity sweep → CISD → Displacement → Execution.
- A strategy belongs in the teaching app only after it beats realistic costs on real MNQ data. Store evidence under `backtest/results/`.
- Chart Wizard and Quint Brain are analysis/practice tools. Only Quint Control's engine can place orders, through Guardian and explicit live authorisation.
