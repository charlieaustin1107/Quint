# Fable prompts

Use these prompts to build Quint Control one phase at a time. A phase is complete only when its required tests pass three consecutive times and the owner's checklist is satisfied.

## Efficient session workflow
1. Start a fresh Claude Code/Fable session for each unrelated task. The repository's root `CLAUDE.md` is loaded automatically.
2. For Quint Control, read `quint-control/STATUS.md` and invoke/read the `quint-control` skill. Do not paste the full master prompt again if the skill is already active.
3. Paste only the prompt for the current phase below. Open `PLAN.md` or research specifications only when that phase needs them.
4. Ask for a short plan and the files to be changed before work spanning more than a few files.
5. Run the relevant tests; for a completed phase, run the required suites three times. Report exact results and anything not tested.
6. Update `STATUS.md` with progress and the next action. Do not merge a pull request until the tests and owner's checklist pass.

The master prompt below is a reference for onboarding or when the skill is unavailable. It is not a routine per-session paste.

Optional: enabling package installs in Claude's network settings may allow cloud compilation of .NET code. It is not required; NinjaTrader-specific checks still need the Windows/NinjaTrader environment.

## Master prompt (reference copy)

``` text
You are building Quint Control for me. Read this whole message before doing anything.

WHO I AM
- I trade MNQ (Micro Nasdaq-100 futures) on Lucid Trading, LucidDaily plan, connected to NinjaTrader 8 through Tradovate. I'm in the UK: show every time in UK time and New York time.
- I'm not a programmer. Explain everything in short, plain English, the way a trader would understand it. Whenever I need to do something on my computer, give numbered steps with the exact menus, clicks, file paths and what I should see on screen.
- I use a Windows computer with NinjaTrader 8 (version 8.1 or later).

WHAT WE ARE BUILDING
The full plan is the doc "Quint Control: plan and research" (https://claude.ai/artifact/REjFWPwsqnVqv5LLiGJXzr). From phase 0 the up-to-date copy lives at quint-control/PLAN.md in my repo charlieaustin1107/quint: if the two disagree, the repo copy wins, and ask me if something looks wrong.
Quint Control has four parts:
1. Quint Engine: a NinjaTrader 8 add-on (NinjaScript, C#). It runs my bots on live candles, applies the guardian rules, places orders on every account I switch on (the copier), keeps the journal, and serves the dashboard website on 127.0.0.1.
2. Quint strategies: every bot is one C# file in a plug-in format (a QuintStrategy base class) that the engine finds automatically, plus a NinjaScript Strategy wrapper so NinjaTrader's Strategy Analyzer can backtest exactly the same rules.
3. Quint Control website: one HTML page served by the engine, with the Command, Bots, Accounts, Journal, Backtests, Brain and Settings screens, the setup wizard and the Quint assistant. It uses the repo's black "Obsidian & chrome" design system (quint-design skill). It must feel futuristic, premium and fast, and stay clear.
4. Quint assistant: a pop-up chat helper on every screen that knows the website, my live situation, my bots and the firm rules. It uses my own Claude API key and falls back to a searchable help guide.
The goal is to beat Phantom Trader AI on every row of the plan's "Match Phantom, then beat it" table, while staying simple to set up.

DECISIONS ALREADY MADE (do not ask again)
- Windows computer. LucidDaily accounts connected through Tradovate, so several accounts can trade at once. Accounts in my own name only.
- Costs in every backtest and journal: $0.50 commission a side for MNQ plus 1 tick (0.25 points = $0.50) of slippage each way. MNQ is $2 a point.
- Monte Carlo limit: a bot with more than a 25% chance of hitting the max loss before the profit target is marked red.
- Simulation is optional. New bots default to simulation, but Go Live Now lets me put any bot on my prop account after a warning screen and typing the account name. Unapproved bots default to 1 MNQ per account, editable.
- The guardian's firm rules and the kill switches can never be skipped, by any button or setting.
- Quint uses my own Claude API key: Claude Haiku 5.5 for help questions and Claude Sonnet 5.5 for "why did the bot do that" questions. Check the current model IDs in the Claude API docs.
- The engine may place orders. Update the repo's CLAUDE.md in the first pull request to say so.
- Manual Copy mode: I can trade by hand on a leader account and have every order copied to my follower accounts, with all bots off. Bots and Manual Copy never run at the same time.
- Every bot sets its own stop loss and take profit for each trade. A signal without a stop is rejected.
- Every trade is visible: drawn on my NinjaTrader chart by a Quint Trades indicator, shown on a live trade card in the dashboard, and sent to my phone by a Telegram bot. Healthchecks.io alerts me if the engine goes offline.

LUCIDDAILY RULES THE GUARDIAN MUST ENFORCE (keep every number editable, because plans change)
- Red-folder news is a hard breach on LucidDaily: be flat before and after each red-folder release (setting, default 2 minutes each side) and block new entries in that window.
- Max loss: $2,000 on a 50K account. The funded drawdown reportedly trails during the day, so measure room from the day's highest balance including open profit.
- No hedging across accounts, including correlated pairs such as long MNQ on one account and short MES on another.
- No microscalping: Lucid flags accounts where most profit comes from trades of 5 seconds or less. Keep a minimum hold time (setting, default 30 seconds) and log every hold time.
- No high-frequency trading: cap orders per minute per account (setting, default 6).
- Size every trade so a full stop-out costs less than a quarter of the room left before the max loss.

ENGINEERING RULES (non-negotiable)
1. Safety first. Every order goes through one check (Guardian.Check) and one sender (OrderRouter). No other code may call Account.Submit, Account.Cancel or Account.Flatten.
2. Fail safe. On anything unexpected (position mismatch, lost connection, stale data, a bot throwing an error, an unacknowledged stop) stop new entries for that account, keep protective stops in place, alert me and log the reason. Never guess.
3. No naked positions. Every entry goes out with its stop and target as an OCO bracket. If the stop isn't confirmed within a few seconds (setting), flatten that position.
4. Keep all trading logic in plain C# (Quint.Core) with no NinjaTrader types, so it can be tested. Thin adapter classes talk to NinjaTrader.
5. NinjaScript compatibility: .NET Framework 4.8 and C# 7.3 language features only (no records, init setters, switch expressions, nullable reference types, top-level statements or using declarations). No NuGet packages. Only reference assemblies NinjaTrader already has; if one is truly needed (for example System.Security for DPAPI), tell me exactly how to add it.
6. Threading. NinjaTrader events arrive on many threads: never block them, put UI work on the Dispatcher, lock shared state, and never sleep in an event handler.
7. The website server binds to 127.0.0.1 only, using a small TcpListener-based HTTP and WebSocket server that needs no admin rights. Any command that changes trading needs a confirm in the UI and a per-session token.
8. Secrets. Store the Claude API key encrypted with Windows DPAPI for the current user. Never put it in the repo, logs, screenshots or website source.
9. Data. Settings, state and the journal are JSON files under Documents\NinjaTrader 8\quint\. The journal is append-only (JSON lines) with a daily CSV export.
10. Check every NinjaTrader API you use against the NinjaTrader 8 Help Guide (Account class, CreateOrder, Submit, Cancel, Flatten, OrderUpdate, ExecutionUpdate, PositionUpdate, BarsRequest, MarketData). If you're not sure an API exists or how it behaves, say so and design a fallback.

TESTING: NOTHING IS DONE UNTIL IT IS TESTED
This cloud workspace can't run NinjaTrader and may not be able to compile C#. So:
a) Write a JavaScript reference of every piece of trading logic (signals, guardian, sizing, copier decisions, Monte Carlo) in quint-control/reference/ and test it here with node, on the real MNQ candles in quint-brain/backtest/data/.
b) Port the same logic to C# line for line. Generate golden test files (input candles or events in, expected decisions and trades out, as JSON) from the reference.
c) Build a self-test runner into the engine (Settings, Run self-tests) that runs the C# logic against the golden files inside NinjaTrader, shows PASS or FAIL for each test and saves a report to Documents\NinjaTrader 8\quint\selftest.txt. I'll paste the report back.
d) Test the website here with Playwright against a mock engine (quint-control/web/mock-engine.js) that speaks the same WebSocket protocol, at 1440x900 and 390x844. Zero console errors. Save screenshots and actually look at them.
e) Test the guardian and copier with a scenario suite against a fake broker, in both the reference and the self-tests. Then write me a checklist to repeat the key scenarios in NinjaTrader's Playback connection and on Sim101.
Run the full test suite at least three times before calling a phase done, and again after every fix. Always report how many tests ran, passed and failed. If dotnet is available here, run the C# tests in the cloud as well.

HOW TO WORK
- One phase per pull request, with small commits. The pull request description, in plain English: what changed, how to install it, how to test it, the test results, and known limits.
- Follow the repo's CLAUDE.md and skills (quint-design for the UI, quint-trading for strategy and backtest rules).
- Never claim something works unless it has been tested. Say exactly what was tested and what wasn't.
- Only ask me about decisions that are genuinely mine. Otherwise choose the safest sensible option and note it in the pull request.
- Keep installation simple: one PowerShell script, install/Install-Quint.ps1, copies the files into the right NinjaTrader folders, then I open the NinjaScript Editor and press F5. Update the script and SETUP.md every phase.
- This is for my own accounts. Nothing here is financial advice.

Start by confirming you have read this, say which phase you are doing, then begin.
```

## Phase prompts

Paste one of these after the master prompt. Each ends with what "done" means, and Fable shouldn't start the next phase until you've confirmed it.

### Phase 0: set up the project

``` text
PHASE 0: SET UP THE PROJECT (no trading code yet)

Goal: a clean project structure, the plan in the repo, a skill holding the master prompt, the protocol between the engine and the website, and setup instructions for me.

1. Create a branch quint-control/phase-0 from main.
2. Create quint-control/ with: PLAN.md (the full plan: take it from the doc if you can read it, otherwise from my master prompt, and ask me to paste the doc), README.md, core/ (C# trading logic, no NinjaTrader types), engine/ (NinjaTrader adapters, the local server and the self-test runner), strategies/ (one file per bot), reference/ (JavaScript reference logic and its tests), web/ (dashboard source, build script, mock engine, Playwright tests), tests/golden/ (golden JSON files), help/ (one help entry per screen and setting, for the Quint assistant), install/ (Install-Quint.ps1, Uninstall-Quint.ps1) and firms/ (firm rule presets as JSON).
3. Write quint-control/protocol.md and JSON schemas for every WebSocket message: hello and session token, full state snapshot, account update, position update, order update, fill, bot status, brain event, journal entry, alert, command (with confirm token), command result and error. Version the protocol.
4. Add .claude/skills/quint-control/SKILL.md with the master prompt's decisions, rules and testing protocol, so every future session follows them automatically.
5. Update CLAUDE.md: add the quint-control folder; change the rule that the apps never place real orders to "only the Quint Engine places orders, and every bot needs my confirm before trading a live account; simulation first is recommended, not required"; add the testing rules.
6. Write quint-control/SETUP.md for me: install NinjaTrader 8 (8.1 or later), log in, turn on Tools > Options > General > Multi-provider and restart, add my LucidDaily account through the Tradovate route (check Lucid's current NinjaTrader connection guide and quote it), check Sim101 is there, and explain how Install-Quint.ps1 and the F5 compile will work. Describe what each screen should look like.
7. Write Install-Quint.ps1: it finds Documents\NinjaTrader 8\bin\Custom, backs up any existing Quint files to a dated folder, copies the files into the right subfolders and prints the next step. It must be safe to run twice. Write Uninstall-Quint.ps1 too.
8. Set up node test tooling for reference/ and web/ (npm test runs everything), plus a protocol test that checks example messages against the schemas.

Tests: npm test passes three times. The PowerShell scripts can't run here, so explain every line in the pull request.
Done when: the pull request has all of the above and you've told me exactly how to get my computer ready for phase 1.
```

### Phase 1: engine and website shell

``` text
PHASE 1: ENGINE AND WEBSITE SHELL (read-only: no orders yet)

Goal: NinjaTrader shows a "Quint Control" menu item. Clicking it starts the engine and opens the black dashboard in my browser, showing my real accounts and the live MNQ price.

Engine:
- An AddOn that adds "Quint Control" to the Control Center's New menu, starts the local server on 127.0.0.1 (port setting, default 8765, falling back to the next free port) and opens my default browser at it.
- Reads Account.All and subscribes to account, position, order and execution updates. Streams balance, realised and unrealised P&L, positions and connection status, plus the live MNQ last, bid and ask for the front month (handle the contract roll).
- A heartbeat every second, so the website honestly shows Live, Delayed or Disconnected.
- Settings basics and the self-test runner (Settings > Run self-tests), starting with tests for the protocol round trip, settings load and save, and journal append and read-back.
- Errors logged to Documents\NinjaTrader 8\quint\logs with rotation. Nothing can crash NinjaTrader, and the engine shuts down cleanly when NinjaTrader closes.

Website:
- Screens: Command (account cards), Bots, Accounts, Journal, Backtests, Brain and Settings, each with proper loading, empty and error states. The Quint orb sits in the corner and opens a placeholder panel.
- Obsidian & chrome design: black, chrome accents, tabular numbers, subtle motion that respects reduced-motion, and readable at 390px wide.
- Auto-reconnect with backoff. Stale numbers are never shown as live.
- mock-engine.js with realistic fake accounts and price ticks, for tests and demos.

Tests, three times: Playwright at 1440x900 and 390x844 (loads with zero console errors, account cards update from the mock, reconnects after the mock restarts, offline banner, keyboard navigation, screenshots reviewed), and the self-tests in the reference.
My checklist: run Install-Quint.ps1, press F5 in the NinjaScript Editor, open New > Quint Control, what I should see, how to run the self-tests and where the report is saved.
Done when: my LucidDaily and Sim101 accounts show live in the dashboard and every self-test passes.
```

### Phase 2: guardian, order router and copier

``` text
PHASE 2: GUARDIAN, ORDER ROUTER AND COPIER (simulation accounts only in this phase)

Goal: the safest order path in retail trading. In this phase orders can only reach simulation accounts. Live accounts stay locked until Go Live Now in phase 4.

Build in Quint.Core, with the JavaScript reference first:
- FirmRules profiles: the LucidDaily preset from the master prompt, every number editable, with a last-checked date and a link.
- Guardian.Check(order, account state, firm rules, calendar, clock), returning Allow, Block or Reduce with a plain-English reason.
- Sizing: contracts so a full stop-out stays under a quarter of the room left, never above the plan's contract limit or my setting.
- OrderRouter, the only place orders are sent: entry plus an OCO stop and target together; confirms the stop is working or flattens; rate limit per account; unique signal IDs so nothing is ever sent twice.
- Copier: one decision, a separate bracket per account, each checked by the guardian first; per-account size; skip an account that lags more than a setting; never opposite directions across accounts, correlated MNQ and MES included.
- One bot per account: an account can only have one bot switched on at a time. bot.start or bot.setAccounts that would put a second bot on an account is refused with a plain-English message naming the bot already there. Different accounts can run different bots.
- PositionReconciler: on start-up and every few seconds, compares expected and actual positions and orders for every account. Any mismatch stops entries on that account and alerts me.
- Kill switches: daily loss, max-loss room, news window, lost connection, stale data, losing streak (setting), bot error and manual. Flatten All per account and for everything, with a confirm.
- Economic calendar: find a reliable free feed of high-impact US releases (for example a public weekly calendar JSON), verify it, cache it and allow manual entries. If the feed fails, warn me and block entries around 08:30, 10:00 and 14:00 New York until I confirm the day.
- A Test Trade button: 1 MNQ bracket on chosen simulation accounts.
- Manual Copy mode: a switch on the Command screen that only turns on when every bot is off and flat with no working orders. I pick a leader account and followers (same size, a multiplier or fixed contracts). Watch the leader's OrderUpdate and ExecutionUpdate events and copy entries, stops, targets, moves and cancels, including ATM strategy brackets. Two styles: Mirror Orders (copy working orders) and Mirror Fills (market entry when the leader fills). Every follower order goes through Guardian.Check; a follower near its limit is shrunk or skipped, with an alert. Quint can't block my leader orders, but it warns and flattens the leader if a kill switch fires. A missed copy is flagged and never chased later unless I tap to catch up. Closing the leader closes every follower, and followers always face the leader's direction.

Scenario suite, at least these 25, in the reference and the self-tests, each with its expected outcome: daily loss reached; room-left rule reduces size; room-left rule blocks; intraday trailing floor moves up after a winner; red-folder news window blocks entry; open position flattened before news; opposite direction on a second account blocked; MNQ long plus MES short across accounts blocked; duplicate signal ignored; partial fill; entry rejected; stop rejected (flatten); stop not confirmed in time (flatten); connection lost with an open position (stops kept, entries blocked); NinjaTrader restart with an open position (reconcile, no duplicate orders); position mismatch; bot throws an error; orders-per-minute cap; minimum hold time; session-end flat-by time; weekend and holiday; account disconnects mid-copy; two accounts with different sizes; copier lag skip; Flatten All with pending orders; switching on a second bot for an account refused. Plus Manual Copy: switching refused while a bot has a position or working order; leader entry copied; leader stop moved and copied; leader target cancelled and copied; ATM bracket copied; leader closed so followers close; follower near its limit shrunk or skipped; follower disconnected so the missed copy is flagged; leader breaks the daily loss so the leader is flattened; Mirror Orders against Mirror Fills.

Tests: every scenario passes three times in the reference and the self-tests, plus Playwright for the new screens (test trade, flatten, alerts).
My checklist: in NinjaTrader's Playback connection with a past MNQ day, run the key scenarios, watch the dashboard and paste the self-test report.
Done when: every scenario passes in all three places and I've signed off the Playback checklist.
```

### Phase 3: strategy plug-ins and the first bots

``` text
PHASE 3: STRATEGY PLUG-INS AND THE FIRST BOTS

Goal: adding a bot means writing one small file. Two evidence-backed bots come first, then my three existing strategies, ported exactly.

Plug-in format:
- QuintStrategy base class: Info (name, markets, timeframe, session, evidence link, version); Settings (properties with [Setting(Min, Max, Step, Help)] attributes, which draw the settings screen and limit optimisation); OnBarClose(BarContext) returning Signal.Buy or Signal.Sell (with stop and targets) or Signal.None; and an optional Manage(PositionContext) for trailing, breakeven and time exits, with built-in helpers for each.
- Every bot sets its own stop loss and take profit. The OrderRouter rejects any signal without a stop and at least one target. Built-in exit helpers: fixed R target, ATR stop, structure stop beyond the last swing, a scale-out ladder of up to four targets, breakeven after a set R, trailing by ATR, VWAP or structure, a time stop, and an exit before the session close or news. Manage may move a stop only to reduce risk, never further away. Size comes from the stop distance. Stops and targets must be broker-held orders on Tradovate, not NinjaTrader simulated stops: confirm in the Help Guide how NinjaTrader sends OCO brackets over the Tradovate connection, and test that a stop survives NinjaTrader being closed mid-trade on Sim.
- BarContext gives closed bars on several timeframes, New York session times, ATR, VWAP, the previous day's high and low, and the bot's own saved state. A bot can never see a bar that hasn't closed: test for look-ahead.
- The engine finds every QuintStrategy by reflection after a compile. New bots appear as Testing.
- strategies/_Template.cs, with comments explaining each part in plain English.
- A NinjaScript Strategy wrapper per bot for Strategy Analyzer, using the same Quint.Core code.

Bots (read the original papers, implement the rules exactly, and list every place you had to adapt them to MNQ futures):
1. Noise-area momentum: Zarattini, Aziz & Barbon, "Beat the Market: An Effective Intraday Momentum Strategy for S&P500 ETF (SPY)" (SSRN 4824172). The noise area from the average move from the open at each time of day over the last 14 days, the paper's check times, its trailing stop and exit at the close, on the MNQ regular session.
2. Last-30-minute momentum: Gao, Han, Li & Zhou (Journal of Financial Economics, 2018) and Baltussen, Da, Lammers & Martens (Journal of Financial Economics, 2021). Trade the direction of the move from the previous close to 30 minutes before each market's close, and exit at the close. MNQ first, then MES, MGC and MCL, each with its correct close time (verify them).
3. Port my 5-pillar playbook (pbEval in chart-wizard/src/pillars.js), the 20-candle breakout and the New York open breakout from the repo exactly. They must give the same trades as quint-brain/backtest/ on the same candles.
4. Gap fade (Testing, lowest priority; the rules are fixed here before any results are seen). MNQ, 5-minute chart, New York regular session, one trade a day. The gap is the 9:30 New York open minus the previous day's 16:00 close; trade only gaps between 0.2% and 1.0% of price. Wait for the 9:30-9:35 candle to close back towards the gap (red after a gap up, green after a gap down), then enter at that close: short after a gap up, long after a gap down. Stop 1 tick beyond the day's high (short) or low (long) so far. Target: the previous day's 16:00 close; skip the trade if the target is less than 1x the stop away. Exit at 11:30 New York if neither is hit. No entries after 10:00 New York. Test it with and without skipping days that have a red-folder release before 10:00 New York, and report both versions. Evidence it must beat: a walk-forward test on 2 years of MNQ hourly data made profit factor 1.14 but had a $3,116 worst drawdown (https://dev.to/vikihermes/i-backtested-4-mnq-day-trading-strategies-walk-forward-heres-what-actually-survived-and-the-2h12), and a larger MNQ study found gap fills didn't beat costs (arXiv 2605.04004).

5. **VWAP research experiment (Testing only; not one of the two evidence-backed bots).** Read `quint-control/research/mnq/2026-11-19-vwap-first-pullback.md` as the source of truth. Keep the original paper-style VWAP crossover as a separate baseline, then implement VWAP First-Pullback Continuation v1 exactly as specified there. Do not tune the frozen primary rules or change its session, stop, target, news window or one-trade-per-session cap after seeing results. First audit available MNQ data, exact trade-volume VWAP availability, bid/ask/tick fill data, contract rolls and costs. Build and test the JavaScript reference first; do not create a production C# bot or touch the live engine. Use Lucid's $0.50 commission per side plus the plan's one tick adverse slippage each way, then stress two ticks each way. Compare with the exact VWAP crossover baseline and a matched random-entry placebo; run the specified walk-forward, untouched 2025–2026 holdout, sensitivity, regime and best-day checks. If the available history or trade count is insufficient, report that honestly and leave the experiment Testing. The note's rules and this prompt must stay in sync; any rule change requires a new experiment version and new evidence.

6. The bot lab's bots (quint-control/botlab/: botlab.js is the JavaScript reference, QuintBotLab.cs the owner's Strategy Analyzer version): the opening candle, VWAP trend, inverted fair value gap, range squeeze breakout, trend-join scalper, VWAP band fade and failed breakout, all Testing. Port each one as a plug-in with exactly the lab's rules, and generate their golden files from botlab.js. The lab's New York open breakout and 20-candle breakout are close versions only: the exact ports in item 3 replace them.

Tests, three times: golden files from the JavaScript reference for every bot on the MNQ data in quint-brain/backtest/data, parity, look-ahead and settings-range tests, and self-tests for every bot.
My checklist: compile, run the self-tests, run each wrapper in Strategy Analyzer on MNQ for the longest period NinjaTrader gives me, and paste the summaries.
Done when: parity passes, the Strategy Analyzer results are in the pull request, and the template lets me (or you) add a bot by copying one file.
```

### Phase 4: backtests, Monte Carlo, firm library, setup wizard and Go Live Now

``` text
PHASE 4: BACKTESTS, MONTE CARLO, FIRM LIBRARY, SETUP WIZARD AND GO LIVE NOW

Goal: anyone can set up a bot in under five minutes and see honest evidence before it trades.

- Backtester in the engine: loads MNQ history with BarsRequest (1-minute bars, as far back as NinjaTrader provides), runs any bot with Lucid's costs, and reports trades, win rate, profit factor, net $, average R, worst drawdown in $, longest losing streak, worst day, the best day's share of profit, the whole period against the later half, and results by New York hour. Cached, re-run on demand, CSV export. It must match the reference on the same data.
- Monte Carlo: 2,000 reshuffles (with a fixed-seed option) giving the typical result, likely range, worst expected drawdown, share of runs that lose, and the chance of reaching the account's profit target before its max loss under LucidDaily rules (intraday trailing floor). Red above 25%.
- A status ladder for every bot: Testing, Simulation, Approved, Live, Retired, using the Approved rule in the plan.
- Firm library: firms/*.json for Lucid's plans and every firm in the plan's prop firm table, each with its bot permission, rules, platform, last-checked date and link. Where a firm bans bots, the bot switch stays locked.
- The five-screen setup wizard from the plan: accounts, bots, size and limits, sessions and news, then an optional dry run and arming.
- Go Live Now: a warning screen (backtest, Monte Carlo and anything untested), the account name typed to confirm, 1 MNQ by default, and live trades tagged in the journal. Guardian rules can't be turned off here or anywhere else.
- Charts in the website: equity curve, drawdown, results by hour and the Monte Carlo fan, all in the design system and readable on a phone.

Tests, three times: backtest parity with the reference; Monte Carlo reproducible with a fixed seed; Playwright: finish the wizard on a fresh mock install in under 5 minutes and under 20 clicks, the Go Live Now flow including cancelling it, and every chart rendering with no console errors.
My checklist: run the wizard on my real setup, backtest each bot, put one bot on Sim101 and, if I choose, one through Go Live Now.
Done when: I've set up a bot from scratch in under five minutes.
```

### Phase 4b: seeing every trade and phone alerts

``` text
PHASE 4B: SEEING EVERY TRADE AND PHONE ALERTS (must be finished before any bot goes live)

Goal: I can always see what a bot is doing, where its stop and target are, and I'm told on my phone the moment anything happens.

- Quint Trades indicator for NinjaTrader charts: reads the engine's live trades for that instrument and draws an entry arrow and label (bot, buy or sell, contracts, number of accounts), a red stop line with $ at risk, green lines for each target, and a shaded risk and reward box. Lines move when the bot moves its stop, with a label (for example "stop to breakeven"). An exit marker shows $ and R. Optional grey markers where the guardian blocked a trade, with the reason. Must not slow the chart down.
- Dashboard live trade card on the Command screen: a small live chart with entry, stop and target lines, distance to each in points and $, R so far, time in trade, the fill on every account, a flash and sound on open and close, a Windows notification through the browser, and a "why this trade?" button that asks Quint.
- Telegram alerts: step-by-step setup in the wizard (create the bot with BotFather, paste the token, send /start, confirm a test message). Alerts for trade opened (bot, direction, contracts, accounts, entry, stop, target, $ at risk, room left today), stop or target moved and why, partial or full close ($ and R per account and total), guardian blocks and kill switches (high priority), problems (lost connection, position mismatch, errors, missed copies) and a daily summary at 16:05 New York (21:05 UK). Settings for which alerts I get and quiet hours. Never include passwords or account numbers, only account nicknames. Queue and retry if Telegram is unreachable, and respect Telegram's rate limits.
- Offline alarm: the engine pings a Healthchecks.io check every minute during the session. Setup in the wizard, with the alert routed to Telegram or email, so I'm told if the computer or NinjaTrader stops.
- Optional: Pushover as an alternative alert channel, and Quint (Haiku) rewriting alert text in plain English.
- Store the Telegram token and Healthchecks URL encrypted with DPAPI.

Tests, three times: the reference and self-tests produce the right alert for every event type, with no secrets in any message text; the chart indicator draws correctly in a Playback session (my checklist); Playwright for the live trade card at both sizes; a simulated Telegram outage queues and then delivers the alerts in order.
My checklist: set up Telegram and Healthchecks.io from the wizard, take a test trade on Sim101, check the chart lines, the dashboard card and the phone messages, then close NinjaTrader and confirm the offline alarm reaches my phone.
Done when: every alert reaches my phone, and the lines on my chart match the real orders.
```

### Phase 5: live brain, journal, shadow journal and the Quint assistant

``` text
PHASE 5: LIVE BRAIN, JOURNAL, SHADOW JOURNAL AND THE QUINT ASSISTANT

Goal: I can see exactly what each bot is thinking, and Quint can explain anything.

- Event bus: every batch of candles, every check a bot makes (passed or failed, and why), every guardian verdict, order, fill and exit becomes an event with a time and an ID. Events feed the journal, the brain and Quint.
- Brain screen: a futuristic live view (canvas or WebGL, following the web-3d skill's performance rules) where every node is a real event that opens its record, with a replay mode for any past day. No decorative fake activity. Smooth at 60fps where possible, degrading gracefully on slower machines and phones.
- Journal: every trade with its reasons, R and $, account, hold time, and whether it was an Approved or a Go Live Now trade. Survives restarts, with a daily CSV export.
- Shadow journal: setups a filter rejected are followed forward to see what would have happened, with a running verdict per filter (saved money or cost money). Start with the 5-pillar playbook's pullback rule.
- Quint assistant: a chat panel from the orb on every screen. Its context is the help guide (cached with prompt caching), a live state snapshot and recent brain events. Haiku 5.5 for help, Sonnet 5.5 for "why" questions, with streaming answers. "Show me" highlights elements by data-help-id and can open screens. Suggestions appear as buttons I confirm. Quint can never place, cancel or resize orders or change guardian settings. A daily message cap, a monthly cost display, and a fallback that searches the help guide when there's no key or no internet. API key entry in Settings, stored with DPAPI.
- Help guide: one entry per screen, button and setting in help/. A test fails if any data-help-id has no entry.

Tests, three times: every decision emits an event; the journal survives a simulated crash; a 30-question help set is answered correctly against a mocked API (plus one live run by me with my key); a brain performance test; Playwright at both sizes.
Done when: I can ask Quint "why didn't the bot trade at 15:00?" and get the true reason from the brain record.
```

### Phase 6: release candidate and going live

``` text
PHASE 6: RELEASE CANDIDATE AND GOING LIVE

Goal: version 1.0, tested over and over before anything reaches my LucidDaily account.

1. Freeze features. Run every test suite (reference, Playwright and self-tests) three times in a row, and fix anything flaky until it's solid.
2. Soak test: the engine runs on Sim101 with the bots on for 5 full New York sessions. Write me a daily checklist: errors in the log, CPU and memory use, any guardian blocks and why, reconnects, and the journal checked against NinjaTrader's own trade list. Every issue gets a fix and a test that would have caught it.
3. Review the order path line by line and list every way an order could be sent. Each must pass Guardian.Check. Check every setting has a safe default.
4. Write CHANGELOG.md, set the version to 1.0.0, finalise Install-Quint.ps1, Uninstall-Quint.ps1 and SETUP.md (with screenshots), and write a rollback guide that gets me back to the previous version in two minutes.
5. Only then merge and tag v1.0.0.
6. Going live: guide me through Go Live Now for one bot on one LucidDaily account at 1 MNQ, with a first-day checklist.

Done when: 5 clean simulation sessions, every suite green three times, and I've approved the release.
```

### Phase 7: extras

``` text
PHASE 7: EXTRAS (one per pull request, in the order I choose)

Same rules as every phase: reference first, golden tests, self-tests, Playwright, three green runs and my checklist.
- More bots from the plan's strategy table: the 5-minute opening range breakout, VWAP trend, and the RSI(2) pullback if my plan allows holding overnight. Each starts as Testing.
- Order-flow gate: if my connection provides market depth, a Safe, Caution or Don't Trade label per signal with its reason, tested on recorded data.
- Voice for Quint, using the repo's quint-sound-haptics skill.
- Phone view: a read-only status page I can open through Remote Desktop or a secure tunnel, with Flatten All behind a confirm.
- Later: the "stocks in play" opening range module, which needs a stock broker.
```

## Before paying for Fable: a cheap one-week proof

This tests the two things most likely to go wrong, for almost nothing, before you spend money on Fable.

1.  **Copying.** Install NinjaTrader, connect your LucidDaily account and Sim101, and try an existing copier on its free trial (CrossTrade offers 7 days). If copying across your accounts is smooth with an off-the-shelf tool, Quint's copier will be too.

2.  **The money.** Use the prompt below with Opus (cheaper than Fable) to get one NinjaScript strategy file, then backtest it in NinjaTrader's Strategy Analyzer on years of MNQ history.

``` text
PROOF: ONE NINJASCRIPT STRATEGY TO BACKTEST (use Opus)
Write a single NinjaTrader 8 NinjaScript Strategy file (C# 7.3, .NET Framework 4.8, no extra references) for the noise-area intraday momentum strategy from Zarattini, Aziz & Barbon, "Beat the Market" (SSRN 4824172), adapted to MNQ futures on 1-minute bars in the New York regular session. Follow the paper's rules exactly and list every adaptation. Use $0.50 commission a side and 1 tick of slippage. Add plain-English comments. Then give me numbered steps to import it, compile it with F5, and run it in Strategy Analyzer over the longest MNQ history available, and tell me which numbers to send back (net profit, profit factor, max drawdown, trades, and results by year).
```

## Utility prompts

### Release check (before merging anything)

``` text
RELEASE CHECK BEFORE I MERGE ANYTHING
Before I merge this pull request, prove it's ready:
1. Run every test suite three times and paste the totals (ran, passed, failed) for each run.
2. List what was tested here, what only I can test in NinjaTrader, and my checklist for it.
3. Show the screenshots at 1440x900 and 390x844 and say what you checked in each.
4. List every change to the order path or the guardian, and the test that covers each one.
5. Confirm Install-Quint.ps1 and SETUP.md are up to date, and give me the rollback steps.
If anything failed or is untested, say so plainly and don't recommend merging.
```

### Fix a NinjaTrader problem

``` text
FIX THIS NINJATRADER PROBLEM
Here's exactly what I saw (error text, self-test report or screenshot): [PASTE HERE]
What I was doing: [ONE LINE]
1. Explain the cause in plain English.
2. Fix it in the smallest safe way.
3. Add a test that would have caught it (reference, golden file or self-test).
4. Run every suite three times and report the totals.
5. Give me the exact steps to install the fix and check it on my computer.
```

### Add a new bot

``` text
ADD A NEW BOT
Idea: [DESCRIBE THE BOT IN PLAIN ENGLISH, OR PASTE THE PINE SCRIPT OR PAPER LINK]
1. Write down the exact rules before looking at any results, and show me them.
2. Build it from strategies/_Template.cs, with its JavaScript reference and golden tests.
3. Backtest it on all the MNQ history available with Lucid's costs. Report the whole period and the later half, every version you tried, and its Monte Carlo chance of hitting the max loss.
4. Add its help entry and evidence link.
5. It starts as Testing. Tell me honestly whether it deserves to go further.
```

### Weekly review

``` text
WEEKLY REVIEW
Here's this week's journal export: [ATTACH CSV]
1. For each bot: trades, net $, worst day, and how its live results compare with its backtest. Is it drifting?
2. Which guardian blocks and kill switches fired, and were they right?
3. Anything in the logs that needs fixing.
4. Suggested rule changes, as proposals only. I decide, and any change goes through the add-a-bot or fix process.
```



### Strategy Lab Phase 3A: definition foundation and local prototype

``` text
Implement the Strategy Lab Phase 3A vertical slice in branch quint-control/strategy-lab-phase-3a. Read quint-control/research/STRATEGY-LAB.md and the existing quint-control/research/mnq/STRATEGY-RESEARCH-PROGRAMME.md first.

Scope:
1. Keep strategy definitions independent from NinjaTrader and all broker APIs.
2. Implement a versioned MNQ Strategy Definition schema, a manual paper-scenario schema, semantic validation and a bounded allow-listed expression evaluator. Never use eval, Function, arbitrary generated C#/JavaScript, dynamic property traversal or LLM output as executable source.
3. Saved ideas may be incomplete drafts. They must be visibly non-runnable until an explicit entry rule, numeric stop and target are present. Reject live execution mode in this phase.
4. Add a standalone responsive Strategy Lab prototype with create strategy, manual paper scenario, local draft library and JSON export. State clearly that local drafts are not connected to the engine or live market data.
5. Add unit tests for valid/invalid definitions, expression depth and node limits, missing market fields, unsafe operators, price orientation and expiry. Add UI contract tests and run npm test and npm run test:3.
6. Do not implement or imply live paper trading, historical backtesting, Playback, fill simulation or live orders until the engine and protocol are ready. No code in this phase may call the OrderRouter.
7. Update STATUS.md and report exact tests. Keep the branch reviewable; do not merge main.

Completion requires all cloud tests to pass three times. If CI is unavailable, say so; do not claim tests passed.
```


### Research task: MNQ contract-roll and continuous-series integrity (20 Nov 2026)

```text
Implement the data-integrity audit in quint-control/research/mnq/2026-11-20-contract-roll-integrity.md.

First audit the existing MNQ data and produce the complete contract manifest. Do not start by writing a strategy or assuming the data is complete.

Build causal calendar, prior-trade-date-volume and timestamped-published-OI mappings exactly as specified. The selected contract for a session must be reproducible using only information available before that session. Add tests that fail if same-day final volume, future OI or future roll information leaks into an earlier mapping.

Use raw listed MNQ expiry prices for all entries, stops, targets and realised P&L. Never use back-adjusted continuous prices as fills. Compare the three mapping policies with the frozen 5-minute opening-range sentinel, no-trade baseline and matched random placebo, using the cost, sample, split, walk-forward and sensitivity rules in the note.

If the required per-expiry history, quotes, volume or OI availability timestamps are missing, stop and report the exact data gap. Do not manufacture a backtest or silently forward-fill missing observations.

This is research infrastructure only. Keep changes on a separate branch and update PLAN.md, FABLE-PROMPTS.md, the research programme and STATUS.md consistently. Do not change NinjaTrader live execution, Guardian, OrderRouter, kill switches, account settings or Go Live controls. Run relevant tests three times and report actual results. Do not merge main or claim strategy profitability.
```
