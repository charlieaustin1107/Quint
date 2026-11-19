# Quint Lab: the nightly run

The scheduled **Quint Lab nightly** Claude session does this every weeknight at **22:15 UK**, after the US close and before Trading Mastery's own Jarvis dream run at 22:40. It grows the data, runs every bot and the strategy factory (`lab/FACTORY.md`), works through the owner's ideas, refreshes Quint HQ, saves everything to the repo as a pull request, and tells the owner. **It never places orders, never touches Quint Control's guardian or order router, never writes to Trading Mastery, and never merges anything.**

The scheduled message just says: "Nightly run: follow `lab/NIGHTLY.md`." Everything it needs is below.

## Budget (hard limits)
- **TradingView: at most 2 calls a night**, whatever the scheduled message says (it may still say 3). The owner's Essential plan allows 10 a day for everything: Trading Mastery, the dream run (which uses most of the rest), and every chat. Call 1 is always the candles. Call 2 is the news calendar when it's running low, otherwise one queued research item. If a call is refused, stop calling and say so.
- **TraderDev:** at most 20 credits a night. **Claude:** keep the run lean; don't paste big files into the conversation.

## Steps
1. **Get the code.** `cd` into the Quint checkout. `git fetch origin main lab/quint-lab lab/nightly` (a missing branch is fine). The **base branch** is `main` if `origin/main` has `lab/NIGHTLY.md`, otherwise `lab/quint-lab`. Work on `lab/nightly`: check it out and rebase it onto the base if it exists, otherwise create it from the base. Never push to `main` or `lab/quint-lab`.
2. **Read** `CLAUDE.md`, `lab/FACTORY.md`, `lab/brain/registry.json` and the newest entries of `lab/brain/journal.md`.
3. **Candles (TradingView call 1).** Find the newest stored 5-minute candle: `date -u -d @$(tail -1 lab/data/mnq_5m.csv | cut -d, -f1) +%F`. Call the TradingView OHLCV tool with `symbol` `CME_MINI:MNQ1!`, `interval` `5m`, `date_from` that date, `count` 2000, `format` `columns`. Save the answer to a scratch file, then:
   `node lab/lib/candles.js lab/data/mnq_5m.csv <file>` and `node lab/lib/candles.js --rebuild-15m`.
4. **News calendar (call 2, only when needed).** If `lab/data/calendar.json` has no `fetchedAt`, or fewer than 3 days of events ahead, call the TradingView economic calendar with `countries` `US`, `min_importance` 1, `date_from` today, `date_to` 10 days ahead. Write `lab/data/calendar.json` as `{ "fetchedAt": <ISO time>, "source": "TradingView economic calendar (US, high importance)", "events": [ { "t": <release time, ISO UTC>, "title": <short name, e.g. "CPI">, "importance": "high", "country": "US" } ] }`, sorted by time. Quint HQ shows the next release and Lucid's blackout around it.
5. **The owner's ideas.** With the ArtifactData tool on Quint HQ (https://claude.ai/artifact/NF7M9VSX3YrsyUPWWL1uim), list the `ideas` collection and take those with `status` "new":
   - **strategy:** write it into the registry `queue` with exact rules, data, cost and pass mark **before** testing, then set the idea to `status` "queued" with a short `note` saying what will be tested.
   - **rule** (an answer about the owner's own rules): add it to the `wyld-four-pillars` entry's notes and the `wyld-exact-rules` queue item; set it to "done" with a note.
   - **feature** or **venture:** add a line to the journal for the next build session; set it to "queued".
   When a queued strategy idea is tested, set it to "done" or "rejected" with a one-line `result`. Never delete an idea.
6. **Run everything:** `cd lab && npm run lab`. That runs every bot, the strategy factory (about a minute), the sequence analyst (`lab/brain/anatomy.js`: what each WYLD pillar is worth, written to `lab/ANATOMY.md`), the paper forward test, the roundup and Quint HQ.
7. **Fridays only, the weekly review (no TradingView calls).** Add a weekly section to the journal: the paper forward test, the factory's survivors and streaks, what changed in the scoreboard, ideas handled, and what was learned. Keep the queue stocked: if fewer than 3 `"auto": true` items are left, add up to 2 new ones from the "First experiment queue" in `research/mnq/STRATEGY-RESEARCH-PROGRAMME.md` or `lab/FACTORY.md`, each with its exact rules, data, cost and pass mark written **before** anything is run.
8. **Factory promotions.** For each entry in `lab/results/factory.json` → `readyForPaper` (survived 5 nights in a row) that isn't in the registry yet, add a strategy: `id` `factory-<family>-<n>`, status "Walk-forward", `runner` `factory:<family>:<settings key>`, `frozenAt` today, and the evidence from the factory report. Then run `npm run lab` again, so it enters the paper forward test. **Then the analyst's proposals:** read `lab/results/anatomy.json` → `proposals`, take at most one that isn't `alreadyQueued`, and add it to the registry queue exactly as written: its id, rules and pass mark, dated today, tested only on sessions after that date. A proposal never changes a rule by itself.
9. **One research item (optional; only if call 2 wasn't used, or the item needs no TradingView call).** Take the first queue item with `"auto": true` that isn't `grow-data` or `factory-nightly`. Run it exactly as written, record the result on the strategy, change its status only as `lab/FACTORY.md` allows, and take it off the queue.
10. **Test:** `cd lab && npm run test:3` (unit, factory and the Quint HQ phone test). If anything fails, stop, write what failed in the journal, push that, and don't republish Quint HQ.
11. **Remember:** a dated journal entry (what ran, survivors, the analyst's top lessons from `lab/ANATOMY.md`, ideas handled, calls used) and any new lesson in the registry. Run `npm run lab` again if the registry changed.
12. **Save to the repo:** commit with a plain-English message, push `lab/nightly` (retry network errors), and open a pull request to the base branch if none is open. Don't merge it: that's the owner's call. **Never commit anything about the owner's money** (the repo is public).
13. **Refresh Quint HQ:** read the artifact first, then publish `lab/jarvis/index.html` to https://claude.ai/artifact/NF7M9VSX3YrsyUPWWL1uim without passing `capabilities`, so its stored capabilities carry forward.
14. **Tell the owner:** a push notification with the roundup headline, the factory line (variations tested, survivors) and any idea that got a result.

## Rules for statuses
Follow `lab/FACTORY.md`. In short: nothing is Approved without years of real MNQ data, every gate passed, and a clean paper test; nothing from TraderDev's stand-in is promoted on its own; never call anything profitable; report every variant.

## If something goes wrong
- No TradingView, or a refusal: skip steps 3 and 4, run everything on the stored candles, and say so.
- A push or pull request fails: retry a few times with a pause, then write it in the journal and the notification.
- Anything unexpected: do less, not more. Never delete data, branches, ideas or files the lab didn't create tonight.

Nothing here is financial advice.
