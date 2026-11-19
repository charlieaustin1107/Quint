# Quint Lab: the nightly loop

This is the job a scheduled Claude Code session does while the owner is away. It grows the data, re-runs every bot, extends the paper forward test, writes the roundup, and moves one research question forward a little. **It never places orders, never touches Quint Control's guardian or order router, and never merges to `main`.**

A scheduled session starts with: "Follow `lab/NIGHTLY.md` in the Quint repo." Everything it needs is below.

## Budget (hard limits)
- **TradingView: at most 3 calls a night.** The owner's plan has a small daily allowance shared with Chart Wizard, Quint Brain and every chat (CLAUDE.md). Run after the US close, when the apps are idle. If a call is refused, stop calling and say so in the journal.
- **TraderDev: at most 20 credits a night** (1,000 a week free). Its dollar figures need converting (see the lessons in the registry).
- One research item a night, small.

## Steps
1. **Read** `CLAUDE.md`, `lab/README.md`, `lab/brain/registry.json` (statuses, lessons, queue) and the last entries of `lab/brain/journal.md`.
2. **Branch:** work on `lab/nightly`, made from the lab's base branch: `lab/quint-lab` until the Quint Lab pull request is merged, `main` after. Rebase it if it already exists. Never push to `main`.
3. **Grow the data (2 TradingView calls):** fetch `CME_MINI:MNQ1!` with the TradingView OHLCV tool, `interval` 5m and 15m, `count` 3000, `format` columns. Save each response to a file and merge it:
   `node lab/lib/candles.js lab/data/mnq_5m.csv /tmp/mnq_5m.json` (and the same for 15m). The store only grows; duplicates are dropped.
4. **Run:** `cd lab && npm run lab`. That re-runs every bot, extends the paper forward test, writes `SCOREBOARD.md`, `roundup.json`, `ROUNDUP.md` and rebuilds `jarvis/index.html`.
5. **Test:** `cd lab && npm run test:3`. If anything fails, stop, write what failed in the journal, and don't publish.
6. **One research item (optional, at most 1 TradingView call):** take the first queue item with `"auto": true` that isn't data growth. Its rules are already fixed in the queue. Run it exactly as written, record the result as evidence on the strategy in the registry, change its status only as the rules below allow, and move the item off the queue. Never tune it against the result.
7. **Remember:** add a dated entry to `lab/brain/journal.md` (what ran, what changed, calls used) and any new lesson to the registry's `lessons`.
8. **Publish:** commit with a plain-English message, push `lab/nightly`, and open or update one pull request to the lab's base branch. Republish Quint HQ (https://claude.ai/artifact/NF7M9VSX3YrsyUPWWL1uim) from `lab/jarvis/index.html`: read the artifact first, then publish to that URL.
9. **Tell the owner:** send a push notification with the roundup headline and the first two sentences of `roundup.json`'s `spoken`.

## Rules for statuses (the brain only learns from evidence)
- Ladder: Idea → Specified → Implemented → In-sample → Walk-forward → Holdout → Paper-forward → Approved. Any failure goes back to research or to **Rejected**.
- **Approved** needs, all at once: 100+ trades on years of real MNQ data; profit after costs in the later half on its own; survives double costs; worst drawdown under $2,000 on 1 MNQ; no day losing $1,200; under 25% Lucid 50K fail chance; and a paper forward test that behaves like the backtest. Approved is advice, not a switch: only the owner can put a bot on a live account, through Quint Control.
- A new idea is written into the queue with its exact rules and pass mark **before** it's tested. Report every variant tried.
- A result on the QQQ stand-in (TraderDev) is never enough to promote anything.
- Never call anything "profitable" in the roundup. Say what it made, on what data, and how much data.

Nothing here is financial advice.
