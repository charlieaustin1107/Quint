# Quint Lab

Quint Lab is the brain behind Quint, your Jarvis-style assistant. It remembers every strategy you've tried and what the evidence said, scores every bot the same way, runs the **strategy factory** (thousands of variations, judged on data they never saw), simulates a Lucid 50K evaluation, keeps a paper forward test, and writes the briefing Quint reads out to you. It never places orders.

**Quint HQ** (your hub): https://claude.ai/artifact/NF7M9VSX3YrsyUPWWL1uim. Five screens: **Today** (spoken briefing, session clock, news blackout, money), **Ask** (talk to Quint), **Desk** (Four Pillars pre-trade check, sizing, prop accounts, journal), **Lab** (factory, bots, library, ideas, memory) and **More** (nightly jobs, MNQ check, apps, roadmap, settings). Your accounts and journal stay private to you; nothing about your money goes to GitHub.

Master prompts: `jarvis/VISION.md` (the hub) and `FACTORY.md` (the strategy factory).

## Where things stand (19 Nov 2026)
- **Real money:** no bot is live yet, so nothing has been made or lost. Bots go live through Quint Control (NinjaTrader), phases 1 to 3.
- **Paper forward test:** 9 bots on paper since 18 Nov. It fills up as new candles arrive.
- **Best evidence so far:** a few weeks of MNQ only. Nothing has 100+ trades on years of data, so nothing is proven. See `SCOREBOARD.md`.
- **Your saved TraderDev strategies:** re-tested. They look better on TraderDev's QQQ crypto stand-in than on real MNQ. The best one, RSI(2) all-weather, lost $2,345 on real MNQ (Jan 2025 to Mar 2026). See `brain/journal.md`.

## Four ways to backtest, quick to exact

| Way | Data | Cost | Good for |
|---|---|---|---|
| **1. The lab** (`node lab/run.js`) | Real MNQ 5m and 15m candles saved in `lab/data`, growing every night | Free, seconds | The bot lab's rules, the paper forward test, the Lucid simulator |
| **2. TradingView Strategy Tester** (Claude runs a Pine script for you) | Real `CME_MINI:MNQ1!`: about 23 months of 1-hour, 4 months of 15-minute and 6 weeks of 5-minute candles on your plan. No Deep Backtesting | 1 TradingView call each, from your small daily allowance | A quick real-MNQ check of one idea. Set margin to 0 in the script |
| **3. TraderDev** | Bybit's QQQ crypto stand-in, May 2026 onwards, 24/7 | 1 credit each, 1,000 free a week | Screening ideas only. It charges crypto fees (0.05% a side) and flatters strategies, so convert its dollars and never promote on it alone |
| **4. NinjaTrader Strategy Analyzer** (your Windows computer) | Years of 1-minute MNQ, from 2019 | Your time | The real verdict. Steps in `quint-control/botlab/README.md` |

To test a new idea, just ask Claude: "Quint Lab: test this idea…". Claude writes the exact rules and the pass mark into the queue in `brain/registry.json` first, then tests it, so the result can't be tuned to look good.

## How a strategy earns its place
Idea → Specified → Implemented → In-sample → Walk-forward → Holdout → Paper-forward → **Approved** (or Rejected at any step).

**Approved** needs all of these at once: 100+ trades on years of real MNQ, a profit after costs in the later half on its own, still a profit with double costs, a worst drawdown under $2,000 on 1 MNQ, no day losing $1,200, under a 25% chance of failing a Lucid 50K first, and a paper forward test that behaves like the backtest. Approved is advice, not a switch: only you put a bot on a live account.

## Run it
```
cd lab
npm run lab        # re-run every bot, write SCOREBOARD.md, the roundup and Quint HQ
npm test           # the tests (npm run test:3 runs them three times)
```

## Files
| File | What it is |
|---|---|
| `brain/registry.json` | The memory: every strategy, its status, evidence and verdict; the lessons; the queue of next experiments |
| `brain/journal.md` | The diary: what each session did and learned |
| `run.js` | Runs every strategy with a `runner` on the saved candles; writes `results/latest.json` and `SCOREBOARD.md` |
| `lib/score.js` | The scorecard: whole period and later half, double costs, worst drawdown, worst day, losing streak, best-day dependence |
| `lib/prop.js` | The Lucid 50K Monte Carlo (pass and fail chances under the LucidDaily rules) |
| `lib/candles.js` | The candle store; merges new TradingView candles in |
| `roundup.js` | Writes Quint's spoken roundup (`roundup.json`, `ROUNDUP.md`) |
| `jarvis/` | Quint HQ: `template.html` plus `build.js` make `index.html`. Never hand-edit `index.html` |
| `factory/` | The strategy factory: `families.js` (the grids), `engine.js` (unseen sessions, PBO, neighbours, the survivor rule), `run.js` |
| `NIGHTLY.md` | The job the nightly session does at 22:15 UK |
| `HQSYNC.md` | The 23:25 UK job: Trading Mastery's bot results, dream report and pinned rules into the hub, privately |

## The nightly loop
`NIGHTLY.md` is the whole job: grow the candle store (1 TradingView call, plus 1 for the news calendar when it runs low), run the strategy factory, re-run the bots, extend the paper test, write the roundup, move one queued experiment forward, record it in the memory, save it to GitHub as a pull request on `lab/nightly`, refresh Quint HQ and send you a notification. On Fridays it also reviews the week and queues new experiments.

It runs every weeknight at 22:15 UK time in a Claude Code session called **Quint Lab nightly**, woken by a scheduled task, before Trading Mastery's own dream run at 22:40. A second task at 23:25 runs the HQ sync (`HQSYNC.md`). Open that session to watch a run or ask it something. To pause it, ask Claude to "pause the Quint Lab nightly run"; to change the time, ask for a new time.

Costs used in the lab: 1 MNQ at $2 a point, $0.50 commission a side and 1 tick of slippage on market and stop fills (the bot lab's rules), with a double-cost check. Nothing here is financial advice.
