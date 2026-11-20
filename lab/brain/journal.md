# Quint Lab journal

Newest first. Every lab session adds an entry: what ran, what was learned, what changed, and the TradingView calls used.

## 2026-11-20: count both

**What happened**
- **Your rule: count both.** As well as the 15m equal highs and lows, the indicator now counts the prior day's high and low and the overnight high and low as liquidity pools, on by default. WYLD himself counts only the equal highs and lows.
  - Each pool is labelled on the chart, in the box and in the alerts: EQH/EQL, PDH/PDL or ONH/ONL.
  - Saved in TradingView as version 3.0 (TradingView counts every save).
  - Recorded as your rule in the registry and the playbook. The analyst still reports WYLD's own pools separately.
- **Fixed in the indicator and its backtest copy:** the prior day's high and low joined the pools at 9:30, so one that price had already run overnight counted as a fresh sweep. They now join at the 18:00 session open. On 21 Oct–18 Nov that means 20 sweeps, not 25. Yesterday's evidence is corrected in the registry.
- **What gets swept, with your settings:** overnight highs 10, overnight lows 9, prior-day high 1, 15m equal highs/lows 0 (those had all been run before the open). The analyst reports this split every night now.
- **Fixes from last night's nightly report:**
  - The first-read test is pinned to the candles it was written on (to 17 Nov), so the growing store can't break it. That failure is why Quint HQ wasn't refreshed.
  - The 1-minute → 5-minute check looks only at the 2 hours where the two stores meet. Without that, last night's single 1.75-point difference between TradingView's two feeds (19 Nov 13:25 UTC) would block it every night.
  - A 1-minute download that starts part-way through a 5-minute period no longer makes a part-candle.
- **The lab pull request** was merged into `bot-lab` at 18:58 on 19 Nov. Everything after it (indicator versions 1 to 3, the analyst, 1-minute candles, this) is on `lab/quint-lab`, not yet in a pull request.

**Calls used:** TradingView 1 (saving the indicator).

## 2026-11-19 (nightly run, 22:15 UK)

**What ran**
- **Candles, call 1 (1-minute):** asked for 1-minute MNQ from 17 Nov 23:15 UTC. TradingView only returns the newest 2,000, so they start 18 Nov 11:40 UTC and run to 19 Nov 21:59 UTC. Started the 1-minute store, `data/mnq_1m.csv` (2,000 candles). The 1-minute rebuild reported a **GAP**: the 5-minute store ended 18 Nov 00:15 UTC.
- **Candles, call 2 (5-minute), per step 3:** 536 new 5-minute candles (store now 5,973, 21 Oct to 19 Nov) and 179 new 15-minute candles built from them. Re-running the 1-minute rebuild then reported a **MISMATCH** on 1 of 399 overlapping 5-minute candles (19 Nov 13:25 UTC: the close is 27,216.50 from TradingView's 5-minute feed, 27,214.75 when built from its 1-minute candles). So the 5-minute store stays on the 5-minute feed for now. Tomorrow's 1-minute call will start from the end of the 1-minute store, so it won't leave a gap; if the mismatch check trips again, step 3's fallback applies.
- **News calendar:** skipped. Both of tonight's calls went to candles, and `data/calendar.json` is still empty, so tomorrow's call 2 should go to the calendar if the candles match.
- **Ideas inbox:** no new ideas.
- **Factory:** 1,490 variations in 5 families, plus 48 of the owner's strategy (WYLD, as the indicator reads it). **0 survivors**, none ready for paper. Every family is still under 30 unseen trades or failed a check (PBO: N-candle 47%, opening range 26%, VWAP band fade 47%, noise-area 40%, gap fade 29%).
- **Analyst (ANATOMY.md):** on 22 sessions, as written no setup started: all 52 pools marked before the open had already been run before 9:30. With prior-day and overnight pools, 28 sweeps → 6 held a level → 0 confirmations on 5-minute candles. Pillar ② is the main filter (22 of 28 sweeps died there). WYLD confirms on the 1-minute chart, so this needs the 1-minute store to grow before anything is judged.
- **Queued:** the analyst's proposal `wyld-hold-60` (let a level hold within 60 minutes instead of 30), with its pass mark, to be tested only on sessions after 19 Nov. It is not auto: it waits for those sessions.
- **Research item:** skipped. The first auto item, `rsi2-long-stop-1h`, needs a TradingView call, and both had been used.
- **Paper forward test:** nine bots, 10 trades since 18 Nov, -$137 on paper.

- **Tests failed (step 10), so Quint HQ was not republished tonight.** `npm run test:3`: 29 of 30 pass. The failure is `lab run: matches the bot lab first read` (`test/lab.test.js:94`). It expects the 20-candle breakout to make exactly 40 trades and $3,711, the bot lab's first read on the old candle set, and tonight's new candles gave it 41 trades (+$4,374). The bot isn't broken; the check is pinned to old data. Suggested fix for the next build session: run that check only on candles up to the first read's last date, so the store can grow. I didn't change the test inside the nightly run.

**Calls used:** TradingView 2 (1-minute candles, 5-minute candles), TraderDev 0.

## 2026-11-19 (later): indicator v2, and a faithful backtest port of it

**What happened**
- **Indicator version 2.0** (saved over the same TradingView script):
  - Each step is now marked on the chart with its price.
  - ① The sweep label, with an amber box on the wick of the candle that made the last push, its 50% (WYLD's wick entry) and the dashed ④ trigger line, where a close beyond is the internal confirmation.
  - ② The level that held, named and priced.
  - ③ The PDR box from Point A to Point B, with 25/50/75 and Target 2.
  - ④ The entry label, with entry and stop lines; then +1R · BE and how the setup ended.
  - The owner wanted both boxes kept: the confluence box (small by default, Detailed in settings) and the regime table.
- **Fixed:** a pool that price had already run overnight was treated as a sweep at 9:30. Now every pool is marked as taken at any hour, and only a sweep inside the window starts a setup.
- **`lab/factory/wyld.js`:** a candle-by-candle JavaScript copy of the indicator for backtesting.
  - It uses the same levels (monthly → weekly → daily with the overlap rule, NWOG/NDOG, FVGs, wick 50%s), pools, steps and confirmations, and never looks ahead.
  - It counts how many setups reach each step (the "funnel").
  - Each trade records what made it: the confirmation, the pool, the level, the room to Point B, the time, and how far it ran for and against.
- **The bot lab engine** (`quint-control/botlab/botlab.js`) can now carry those details and track how far each trade ran for and against (off by default, so nothing else changes).
- **The strategy factory now tests the indicator's exact rules.** Its WYLD family runs `wyld.js`: 48 variations (which pools count, each confirmation alone or any, stop buffer, break-even at 1R). That's small on purpose: a grid grows as the data grows. Mechanical v0 is retired, and its result stays in the registry.
  - A family where nothing traded now shows PBO "n/a" instead of 0%.
- **The sequence analyst** (`lab/brain/anatomy.js` → `lab/ANATOMY.md`, part of `npm run lab`, under a second). Every night it:
  - replays the rules as written;
  - takes away one pillar at a time (and the window);
  - tries each confirmation alone;
  - splits trades by what made them;
  - does a post-mortem: were losers +1R first, and how much heat did winners take?

  Every average has a 95% range from 10,000 bootstrap resamples, and nothing under 30 trades is a finding. It proposes experiments with a pass mark, which the nightly job pre-registers (at most one a night), and it keeps a nightly history so the ranges can be seen narrowing.
- **1-minute candles start tonight.** The nightly run's one candle call now fetches 1-minute candles. TradingView keeps only a few thousand, so the lab collects them night by night.
  - The 5- and 15-minute files are then built from them (`--rebuild-from-1m`), but only after an exact match against the stored 5-minute candles where they overlap. If the candles differ or leave a gap, it falls back to fetching 5-minute candles as call 2.
  - At 10 sessions, the sequence analyst and the factory's new `wyld-1m` family switch to them.
  - Next: let the three 1-minute bots (VWAP trend, range squeeze, trend-join scalper) run on them too, once there's real 1-minute data to test with.
- **Quint HQ:** the Lab tab has a new **Pillars** screen (the lessons, where setups die, each pillar with and without, each confirmation alone, why trades won or lost, what Quint wants to test next). Ask Quint can read it too. Also fixed: on a phone, the screen column grew wider than the screen when a row of buttons was long.

**First read** (20 sessions of 5-minute candles, so the 1-minute confirmations can't be judged yet):
- As written, the sweep never triggered. All 50 pools that formed before the open had already been run before 9:30, and equal highs/lows within 2 points are rare on the 15-minute chart (81 in 958 swings).
- With the prior-day and overnight highs/lows added as pools: 25 sweeps → 6 levels held → 6 PDRs → **0 confirmations**. Point B was reached (4) or the PDR broke (2) before a 5-minute confirmation appeared.
- Without the sweep pillar: 115 setups → 104 holds → 103 PDRs → 106 confirmations → 16 trades, **−$688**. That's too few trades to judge, and 75 confirmations came while already in a trade.

**Lessons**
- On 5-minute candles the move from Point A to Point B often finishes before a confirmation forms. WYLD's 1-minute confirmations need 1-minute data to be tested fairly.
- The sweep pillar depends heavily on what counts as a pool and when it's marked. These must be pinned down (`wyld-exact-rules`) before any verdict.

**Calls used:** TradingView 1 (save and compile the indicator), 4 today in total.

## 2026-11-19 (late): the WYLD Four Pillars indicator

- Built **Quint · WYLD Four Pillars** for TradingView (`lab/pine/`). It alerts at every step (① sweep, ② HTF level holds, ③ PDR bias, ④ 1m confirmation entry, +1R break-even, stage over), shows a confluence box with the pillars ticked off in order, and a regime table for every timeframe from monthly to 1-minute.
- It compiled first time and is saved in the owner's TradingView (`USER;30b790d0742346528a65e8c1d5e28d6e`). It's a mechanical reading of WYLD's rules, with the open choices as settings, and has no order-block entry yet.
- **Calls used:** TradingView 1 (save and compile), 3 today in total.

## 2026-11-19 (night): Quint HQ v2

- Quint HQ is now the owner's front door, built to `lab/jarvis/VISION.md`: Today (spoken briefing, UK and New York clock, the trading window, news blackout, money, the pre-market checklist), Ask (Quint answers with tools: accounts, journal, sizing, the lab, Trading Mastery, and adds ideas), Desk (Four Pillars pre-trade check with a verdict, sizing by the quarter-of-room rule, Lucid prop accounts, journal with CSV export), Lab (factory, bots with equity curves, library, ideas inbox, memory, TraderDev) and More (nightly jobs with run and pause, an on-demand MNQ check that costs 1 TradingView call, apps, roadmap, ventures, settings).
- Private by design: accounts, trades and settings live in the hub's own storage under the owner's private path; ideas and the Trading Mastery feed are owner-only. None of it goes to GitHub.
- Tested with a Playwright phone test (390×844) using a fake `window.claude`: every screen, an account, sizing, a trade, an idea, a question to Quint, the jobs and the MNQ check, with no console errors and no sideways scrolling.
- Nightly run moved to 22:15 UK with at most 2 TradingView calls, ahead of Trading Mastery's 22:40 dream run. New HQ sync at 23:25 UK (`lab/HQSYNC.md`).

## 2026-11-19 (evening): one strategy, and the strategy factory

**What happened**
- The owner set the record straight: the Four Pillars, Trading Mastery's six steps and Chart Wizard's 5 pillars are **one strategy**, and **WYLD Will's Four Pillars is the master version**. The registry now has one entry (`wyld-four-pillars`) and one checklist (`playbooks.json`), with the two app codings listed as older versions to bring in line with WYLD's rules.
- Built the **strategy factory** (`lab/factory/`, rules in `lab/FACTORY.md`): six families, 2,594 variations, about a minute of computing. Each variation is judged on unseen sessions, the probability of backtest overfitting (PBO), its neighbours, double costs and the Lucid gate. Every family reproduces the bot lab exactly at the bot lab's settings, and the WYLD family is tested for never seeing future candles.
- First night: **noise-area momentum** had 6 survivors (PBO 29%), including the paper's own settings (+$839 on 32 unseen trades). WYLD mechanical v0 (1,152 variations on 4 weeks of 5-minute candles) had none: its best tuned variation lost $1,013 over 7 unseen trades. Breakout and opening range had PBO 60 to 67%: their best variations were mostly luck.
- 15-minute candles are now built from 5-minute ones (all 1,812 overlapping candles match TradingView exactly), so the nightly run needs one TradingView call for candles.

**Lessons**
- Thousands of variations find lucky winners easily. Judge only on unseen sessions, PBO, neighbours and the Lucid gate.
- WYLD's strategy needs 1-minute candles and exact rules before its real test.

**Changed**
- A factory variation enters the paper forward test only after surviving 5 nights in a row.
- New queue items: `factory-nightly`, `one-minute-data`, `wyld-exact-rules`.

**Calls used:** none.

## 2026-11-19: the lab is born, and the saved strategies get re-tested

**What happened**
- Gathered every strategy from the repo (Chart Wizard, the backtest report, the bot lab, the proof strategy, the plan's research) and from the owner's TraderDev account (14 strategies saved in earlier Claude chats) into one memory: `lab/brain/registry.json`.
- Re-ran all 14 TraderDev strategies on TraderDev (13 credits; one can't run there). TraderDev forces 0.05% commission a side and 100%-of-equity sizing on its QQQ crypto stand-in (Bybit QQQUSDT, 7 May to 19 Nov 2026), so its dollars aren't MNQ dollars. Converted to 1 MNQ with $2.50 a trade, about $59,000 a contract at the period's average NQ of 29,557. Roughly: RSI(2) all-weather 1h +$9,982 (121 trades), Bollinger squeeze 15m +$9,677, Bollinger mean-reversion 15m +$7,078, Prop B RSI(2) Globex 1h +$6,754, EMA ATR trail 1h +$5,728; the regular-hours-only versions were flat or losing.
- Tested the best of them, RSI(2) all-weather 1h, on **real** MNQ with TradingView's Strategy Tester (2 TradingView calls: the first was refused because Deep Backtesting isn't on the owner's plan). Result, Jan 2025 to 31 Mar 2026: 121 trades, **-$2,344.50**, PF 0.87, worst drawdown $5,051.50; longs +$1,791.50, shorts -$4,136. The test stopped trading after 31 Mar because the script's 100% margin setting caused a margin call, so April to November 2026 is untouched data for a follow-up.
- Built the lab: one scorecard for every bot, a Lucid 50K Monte Carlo, a paper forward test from each bot's rule-freeze date, the spoken roundup and the Quint HQ page. Its numbers match the bot lab's first read exactly.

**Lessons** (also in the registry)
- The stand-in flatters. Judge on real MNQ.
- Edges that only show up in thin overnight hours are a warning sign.
- No Deep Backtesting on this TradingView plan: years-long tests happen in NinjaTrader, or after a data upgrade.

**Changed**
- RSI(2) all-weather 1h: Rejected as it stands (lost on real MNQ, no stop, drawdown 2.5x Lucid's max loss).
- Three of the four regular-hours versions of Prop A and B, and the Lucid sweep + volume: Rejected. Prop B RSI(2) 15m regular hours stays In-sample (+$2,766 rough on the stand-in, 76 trades).
- New pre-registered test in the queue: long-only RSI(2) with a stop, on April to November 2026 only.

**Calls used:** TradingView 2, TraderDev 13 credits.
