# Quint Lab: the nightly loop

This is the job the scheduled **Quint Lab nightly** Claude session does while the owner is away, every weeknight at 22:40 UK time (after the US close). It grows the data, re-runs every bot, extends the paper forward test, writes the roundup, refreshes Quint HQ, saves everything to the repo as a pull request, and moves one research question forward a little. On Fridays it also does a weekly review. **It never places orders, never touches Quint Control's guardian or order router, and never merges anything.**

The scheduled message just says: "Nightly run: follow `lab/NIGHTLY.md`." Everything it needs is below.

## Budget (hard limits)
- **TradingView: at most 3 calls a night.** The owner's plan has a small daily allowance shared with Chart Wizard, Quint Brain and every chat (CLAUDE.md). If a call is refused, stop calling, carry on without new candles, and say so in the journal and the roundup.
- **TraderDev: at most 20 credits a night** (1,000 a week free). Its dollar figures need converting (see the lessons in the registry).
- One research item a night, small. Keep tool output small: never ask TradingView for more candles than the night needs.

## Steps
1. **Get the code.** `cd` into the Quint repo checkout. `git fetch origin main lab/quint-lab lab/nightly` (a missing branch is fine). The **base branch** is `main` if `origin/main` has `lab/NIGHTLY.md`, otherwise `lab/quint-lab`. Work on `lab/nightly`: if it exists on GitHub, check it out and rebase it onto the base branch; otherwise create it from the base branch. Never push to `main` or `lab/quint-lab`.
2. **Read** `CLAUDE.md`, `lab/README.md`, `lab/brain/registry.json` (statuses, lessons, queue) and the last entries of `lab/brain/journal.md`.
3. **Grow the data (2 TradingView calls).** For each of `mnq_5m.csv` (interval `5m`) and `mnq_15m.csv` (interval `15m`):
   - find the newest stored candle's UTC date: `date -u -d @$(tail -1 lab/data/mnq_5m.csv | cut -d, -f1) +%F`
   - call the TradingView OHLCV tool with `symbol` `CME_MINI:MNQ1!`, that `interval`, `date_from` set to that date, `count` 2000, `format` `columns`
   - save the response to a scratch file and merge it: `node lab/lib/candles.js lab/data/mnq_5m.csv <file>`. The store only grows; duplicates are dropped.
4. **Run:** `cd lab && npm run lab`. That re-runs every bot, extends the paper forward test, writes `SCOREBOARD.md`, `roundup.json`, `ROUNDUP.md` and rebuilds `jarvis/index.html`.
5. **Test:** `cd lab && npm run test:3`. If anything fails, stop, write what failed in the journal, push that, and don't republish Quint HQ.
6. **One research item (optional, at most 1 TradingView call):** take the first queue item with `"auto": true` that isn't `grow-data`. Its rules and pass mark are already fixed in the queue. Run it exactly as written, record the result as evidence on the strategy in the registry, change its status only as the rules below allow, and take the item off the queue. Never tune it against the result. If it needs code, keep it small and tested, and keep it inside `lab/`.
7. **Fridays only, the weekly review (no TradingView calls):** add a section to the journal on the week: the paper forward test, what changed in the scoreboard, and what was learned. Keep the queue stocked: if fewer than 3 `"auto": true` items are left, add up to 2 new ones from the "First experiment queue" in `research/mnq/STRATEGY-RESEARCH-PROGRAMME.md` or the plan's bot list, each written with its exact rules, data, cost and pass mark **before** anything is run.
8. **Remember:** add a dated entry to `lab/brain/journal.md` (what ran, what changed, calls used) and any new lesson to the registry's `lessons`. If anything changed, run `cd lab && npm run lab` again so the roundup and Quint HQ include it.
9. **Save to the repo:** commit with a plain-English message, push `lab/nightly` (`git push -u origin lab/nightly`, retrying network errors), and open a pull request from `lab/nightly` to the base branch if none is open; otherwise the push updates the open one. Don't merge it: that's the owner's call.
10. **Refresh Quint HQ:** read the artifact https://claude.ai/artifact/NF7M9VSX3YrsyUPWWL1uim first, then publish `lab/jarvis/index.html` to that URL, keeping its capabilities.
11. **Tell the owner:** send a push notification with the roundup headline and the first two sentences of `roundup.json`'s `spoken`, plus "Changes waiting on GitHub" if a pull request was opened or updated.

## Rules for statuses (the brain only learns from evidence)
- Ladder: Idea → Specified → Implemented → In-sample → Walk-forward → Holdout → Paper-forward → Approved. Any failure goes back to research or to **Rejected**.
- **Approved** needs, all at once: 100+ trades on years of real MNQ data; profit after costs in the later half on its own; survives double costs; worst drawdown under $2,000 on 1 MNQ; no day losing $1,200; under 25% Lucid 50K fail chance; and a paper forward test that behaves like the backtest. Approved is advice, not a switch: only the owner can put a bot on a live account, through Quint Control.
- A new idea is written into the queue with its exact rules and pass mark **before** it's tested. Report every variant tried.
- A result on the QQQ stand-in (TraderDev) is never enough to promote anything.
- Never call anything "profitable" in the roundup. Say what it made, on what data, and how much data.

## If something goes wrong
- No TradingView tools, or a refusal: skip step 3, run everything else on the stored candles, and say so.
- A push or pull request fails: retry a few times with a pause, then write it in the journal and the notification.
- Anything unexpected: do less, not more. Never delete data, branches or files that the lab didn't create tonight.

Nothing here is financial advice.
