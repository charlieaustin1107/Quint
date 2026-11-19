# Quint & Chart Wizard: rulebook for Claude

Read this first in every session. It says what this project is for and how to work on it.

## Who this is for
- The owner trades **MNQ (Micro Nasdaq futures, `CME_MINI:MNQ1!`)** and is working to **pass a Lucid Trading funded account**.
- They trade **scalps to day trades**: roughly 15 minutes to a couple of hours.
- They work **only from an iPhone**. There's no computer. Every screen has to work well on a phone, and every explanation should be in plain English.

## What's in the repo
| Folder | What it is | Where it runs |
|---|---|---|
| `chart-wizard/` | **Chart Wizard**: the chart-reading game and learning simulator, with Quint built in as the coach. Source in `chart-wizard/src/`, tests in `chart-wizard/src/t/` | Artifact `76065a1d-9c56-4fd6-9cfd-7f1297225a0e` |
| `quint-brain/` | **Quint Brain**: Quint's own app: the 3D brain, live market read, matrix, 5-pillar check, record and alerts. Source and tests in `quint-brain/src/` | Artifact `cd485103-4fb2-4d50-8aeb-2237b4ef142f` |
| `quint/` | **Quint**: the first standalone Quint app (no source here; superseded by Quint Brain) | Artifact `41275d03-b425-4aa9-95ef-f85de223da67` (public) |
| `backtest/` | Code that backtests the strategies on real MNQ candles, outside the browser | Runs with `node` and `python3` |
| `quint-control/` | **Quint Control**: the NinjaTrader 8 trading engine (bots, guardian, copier, Manual Copy), its local black dashboard website and the Quint assistant. Plan in `quint-control/PLAN.md`, progress in `quint-control/STATUS.md` | NinjaTrader 8 on the owner's Windows computer; tests run with `node` |
| `lab/` | **Quint Lab**: Quint's research memory (`lab/brain/registry.json`), one scorecard for every bot, the Lucid 50K simulator, the paper forward test, the spoken roundup and the **Quint HQ** voice page (`lab/jarvis/`). The nightly job is `lab/NIGHTLY.md` | Runs with `node` in the cloud; Quint HQ is artifact `NF7M9VSX3YrsyUPWWL1uim` |

Each app runs as a single self-contained `index.html`. The artifacts are where the apps actually run, because Quint's AI chat and the TradingView/market connectors work there without an API key. **This repo is the master copy.** Change it here, then publish the built `index.html` to the matching artifact.

**Chart Wizard and Quint Brain are built from source: never hand-edit their `index.html`.** Edit the files in `src/`, rebuild, test, then publish. A build from unchanged source reproduces the published `index.html` byte for byte.

## Building and testing
- **Chart Wizard:** `cd chart-wizard/src && python3 build.py && python3 build.py --prod`. The plain build makes `test.html` (with the `window.__T` test hooks); `--prod` writes `chart-wizard/index.html` without them. The script order is in `build.py`; the game's built-in market data is `data3.json`.
- **Quint Brain** reuses Chart Wizard's own functions (Quint's brief, rules, tools, the feed, the 5-pillar engine) instead of copies, so **rebuild it after changing Chart Wizard's `dock.js`, `live.js`, `quint.js`, `qlab.js` or `pillars.js`**: `cd quint-brain/src && python3 extract.py "$(cat roots.txt)" "$(cat mine.txt)" && python3 patch.py && python3 build.py && python3 build.py --prod`. `extract.py` copies every function `roots.txt` needs out of `chart-wizard/src` into `brain.js`; `patch.py` adapts them; `qa_core.js`, `qa_ui.js` and `qa_brainviz.js` are Quint Brain's own code.
- **Tests** (need `pip install playwright` and `playwright install chromium` if Chrome isn't installed) are Playwright scripts with a mocked `window.claude` (fake TradingView, FMP and Claude replies), so they never spend real calls. Run them from anywhere, e.g. `python3 chart-wizard/src/t/dock.py m`, `python3 chart-wizard/src/t/feed.py`, `python3 quint-brain/src/t_qa.py`. The shared mocks live in `chart-wizard/src/t/dock.py`, `quint.py` and `news.py`. Before publishing run at least: `dock.py m`, `feed.py`, `prac_offline.py`, `t6.py`, `coach_prod2.py`, `prod_quint.py`, `hud.py`, `voice.py`, `draw.py`, `talk.py`, `fx.py` (Chart Wizard) and `t_qa.py`, `t_brain.py`, `t_daily.py`, `t_prod.py`, `t_voice.py`, `t_talk.py`, `t_fx.py` (Quint Brain). Check `errs` is empty and look at the phone-size screenshots they save in `/tmp`.

## Publishing
- Publish the built `index.html` with the artifact tools: read the artifact's current version first and pass it as `base_version`, so a newer version is never overwritten. Both artifacts are private to the owner.
- The `quint/` artifact is public and can't be republished from a chat.

## TradingView's daily call limit (most important technical rule)
- TradingView's connector allows a fixed number of calls **per day** for the whole account (both apps and every Claude chat): 10 Essential, 20 Plus, 50 Premium, 150 Ultimate, or 500 a day and 50 a minute with TradingView's AI add-on. Polling burned through it in an afternoon, so:
- **Never poll TradingView on a timer** except through `tvBgEvery()` (it only allows background refreshes on Ultimate or the AI add-on). The owner picks their plan in Settings; never guess it.
- **The feed** (`dkFeed` in `dock.js`): ~17 days of 5-minute candles and the daily candles are fetched once a day and saved on the phone; after that a refresh asks only for the newest 1-minute candles and rebuilds every timeframe from them. A Quint answer should cost about one call.
- **Practice never calls TradingView** (`pracBars` in `quint.js`): it uses the saved real candles, or built-in practice candles made from a year of real Nasdaq, S&P 500, gold and oil days.
- When TradingView refuses, Quint still answers, from saved candles (saying how old they are) or from a chart screenshot the owner sends.
- Quint's answers use the owner's Claude usage through the artifact (Fable for calls, Opus for simple questions).

## Product rules (from the owner)
1. **Keep Chart Wizard simple.** Teach only the best 2–3 backtested strategies plus the owner's own **5-pillar playbook**. Quint is the powerhouse.
2. Here are the strategies taught right now (in `BEST` in `chart-wizard/index.html`):
   - **20-candle breakout**: 15-minute chart, stop 2 ATR, target 3× the stop, close after 40 candles.
   - **New York open breakout**: the first 15 minutes from 9:30 New York, one trade a day, entries until 11:30, stop on the other side of the range, target 2R.
   - **5-pillar playbook (the owner's own; never remove it)**: Location → Liquidity sweep → CISD → Displacement → Execution, on the 5-minute chart, in the New York session.
3. A strategy only earns a place in the app if it **beats its costs in a backtest on real MNQ data**. Put the evidence in `backtest/results/`.
4. Use as much **real** MNQ history as possible, including news and how it moved price. Back what's taught with credited sources.
5. Quint is modelled on **LuxAlgo Quant 2.0**: automatic strategy backtesting against goals. Quint's chat should look futuristic and be very clever.

## Backtesting
- Read `backtest/README.md` for how to run it.
- The strategy logic is **not rewritten**. `backtest/extract_engine.py` copies Quint Brain's own functions into `backtest/engine.js`, so the backtest tests exactly what the app teaches. After changing the rules in Quint Brain, re-run the extractor.
- Costs are always included: **$0.75 commission a side plus 1 tick of slippage a side**. MNQ is $2 a point and a tick is 0.25.
- Always report the result **out of sample** (the later half of the data) as well as over the whole period. One good stretch isn't proof.
- Lucid's limits matter more than profit: report the worst drawdown in dollars on 1 contract.

## How to work
- **One focused change per pull request.** Explain what changed in plain English, as if to a trader rather than a programmer.
- Don't add API keys, passwords or account numbers to the repo.
- Don't delete the 5-pillar strategy or Quint, and don't swap them for something else.
- Before publishing, check the page still loads and works on a phone-sized screen.
- Nothing here is financial advice. Chart Wizard, Quint Brain and Quint never place orders. **Only the Quint Engine (`quint-control/`) places orders, and every bot needs the owner's confirm before it trades a live account. Simulation first is recommended, not required.** The guardian's firm rules and kill switches can never be skipped.

## Quint Lab
- **The owner's strategy is WYLD Will's Four Pillars** (sweep → HTF level holds → PDR bias → 1m confirmation), the master version, in `lab/brain/playbooks.json` and the registry entry `wyld-four-pillars`. Trading Mastery's six steps and Chart Wizard's 5-pillar playbook are older codings of this one strategy, not separate strategies: bring them in line with WYLD's rules, and never remove them.
- **Read `lab/brain/registry.json` before any strategy work, and update it after.** It's Quint's memory: every strategy tried, its status and evidence, the lessons, and the queue of pre-registered experiments. Add a dated entry to `lab/brain/journal.md` each session.
- Run with `cd lab && npm run lab`; test with `npm run test:3`. Quint HQ is built from `lab/jarvis/template.html` by `lab/jarvis/build.js`; never hand-edit its `index.html`.
- Write an idea's exact rules and pass mark into the queue **before** testing it. Never promote anything on TraderDev's QQQ stand-in alone, and never call a strategy profitable in the roundup.
- TradingView budget for research: a few calls a session at most (the owner's plan has no Deep Backtesting). Set margin to 0 in Pine test scripts.

## Quint Control
- Read `quint-control/STATUS.md` first: it says which phase is in progress and what to do next. Update it at the end of every session, and commit and push often so work survives a session ending early.
- The rules, decisions and testing protocol are in the `quint-control` skill (`.claude/skills/quint-control/SKILL.md`). The phase prompts are in `quint-control/FABLE-PROMPTS.md`.
- Nothing is done until it's tested: JavaScript reference and `node --test` in the cloud, golden files, the engine's self-tests inside NinjaTrader, Playwright for the website, and the owner's checklist. Run the suites three times before calling a phase done.
- Run the Quint Control tests with `cd quint-control && npm test`.
