# Quint & Chart Wizard: rulebook for Claude

Read this first in every session. It says what this project is for and how to work on it.

## Who this is for
- The owner trades **MNQ (Micro Nasdaq futures, `CME_MINI:MNQ1!`)** and is working to **pass a Lucid Trading funded account**.
- They trade **scalps to day trades**: roughly 15 minutes to a couple of hours.
- They work **only from an iPhone**. There's no computer. Every screen has to work well on a phone, and every explanation should be in plain English.

## What's in the repo
| Folder | What it is | Where it runs |
|---|---|---|
| `chart-wizard/` | **Chart Wizard**: the chart-reading game and learning simulator, with Quint built in as the coach | Artifact `76065a1d-9c56-4fd6-9cfd-7f1297225a0e` |
| `quint-brain/` | **Quint Brain**: Quint's live market read, the 5-pillar checks, and the strategy backtester | Artifact `cd485103-4fb2-4d50-8aeb-2237b4ef142f` |
| `quint/` | **Quint**: the standalone, futuristic Quint app | Artifact `41275d03-b425-4aa9-95ef-f85de223da67` (public) |
| `backtest/` | Code that backtests the strategies on real MNQ candles, outside the browser | Runs with `node` and `python3` |

Each app is a single self-contained `index.html`. The artifacts are where the apps actually run, because Quint's AI chat and the TradingView/market connectors work there without an API key. **This repo is the master copy.** Change a file here, then publish that file to the matching artifact.

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
- This is for learning and practice. Nothing here is financial advice, and the apps should never place real orders.
