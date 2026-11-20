# Quint HQ: the elite build prompt

This is the master prompt for building Quint HQ. Give it to any Claude session that works on the hub, together with `CLAUDE.md`. It turns the owner's idea into one standard to build to. Change it only when the owner changes the idea.

---

## You are building

**Quint HQ, a Jarvis for a one-person trading business.** The owner opens one screen on an iPhone. Quint tells them, out loud, what their money and bots did, what the lab learned overnight, whether it's safe to trade right now and why, and what to do next. The owner talks back. Quint keeps testing strategies while the owner sleeps and reports back with evidence, never hype.

**The test of every feature:** does it help the owner make a better trading decision, protect a prop account, or learn faster, in under 10 seconds on a phone? If not, it doesn't ship.

## Who it's for
- One trader, UK-based, trading MNQ (Micro Nasdaq futures, $2 a point) on Lucid Trading prop accounts. Scalps and day trades in the New York morning (14:30 UK).
- Works from an iPhone. Not a programmer. Plain English always, with UK and New York times side by side.
- Their own strategy comes first: **WYLD Will's Four Pillars** (sweep → HTF level holds → PDR bias → 1m confirmation). It's one strategy and WYLD's rules are the master. Trading Mastery's six steps and Chart Wizard's 5 pillars are older codings of it, never separate strategies.
- The long game: automated bots, copy trading across prop accounts, more prop firms, and later other businesses ("ventures") on the same platform.

## The five principles (never break these)
1. **Truth over hype.** Every number says where it came from and how much data is behind it. Under 100 trades is an anecdote, and the screen says so. Nothing is "profitable" until it climbs the evidence ladder: Idea → Specified → Implemented → In-sample → Walk-forward → Holdout → Paper-forward → Approved. Claims from videos or sellers are labelled as claims.
2. **Protect the account.** The hub never places, changes or cancels an order. Only Quint Control (NinjaTrader) trades, through its guardian. The hub's job is to stop the owner breaking a prop rule: room left before the max loss, daily loss limit, news blackouts, consistency, microscalping and hedging.
3. **Budgets are sacred.** TradingView is 10 calls a day on the owner's Essential plan, shared with Trading Mastery, the nightly runs and every chat. The hub spends **none** unless the owner taps a button that says what it costs. Claude usage matters too: answers are short, and nothing polls.
4. **Voice-first, phone-first, calm.** One thumb, 390×844 first, tap targets of 44 px or more, no sideways scroll. Quint speaks: Claude's voice where offered, the iPhone's own voice otherwise. The look is the repo's Obsidian & chrome (`quint-design` skill): true black, chrome, and colour only for meaning (mint up, rose down, amber warning).
5. **One memory, private by default.** Research lives in `lab/brain/registry.json` in the repo. The repo is public, so **anything about the owner's money** (prop accounts, journal, bot P&L, Trading Mastery data) lives only in the hub's private storage, never in git.

## What it connects (the owner's whole world, one front door)
| Source | What it gives the hub | How |
|---|---|---|
| Quint Lab (this repo) | Bot scoreboard, Lucid pass/fail odds, paper forward test, research memory, lessons, queue | Built into the page each night |
| Trading Mastery (the owner's app) | NinjaTrader bot P&L by account type, last night's Jarvis dream report, the owner's pinned rules | The HQ sync job reads its database read-only each night and writes a private summary into the hub's storage |
| WYLD Will rulebook and Four Pillars Trainer | The owner's strategy: the one checklist the Desk walks through before every trade | `lab/brain/playbooks.json` |
| TradingView | Candles for the lab; the week's red-folder news; an on-demand MNQ price check | Nightly job (1 to 2 calls); the price check only on the owner's tap |
| TraderDev | Live signal counts, saved strategies, credits | On demand from the Lab tab |
| Claude Code (cloud) | The nightly lab run and HQ sync | Run now, pause and resume buttons |
| The owner | Prop accounts, trades, ideas, settings | Typed or spoken into the hub, saved privately |
| Quint Control (coming) | Live bots, real P&L, copy trading | Phase 1 to 3 of `quint-control/PLAN.md` |

## The screens
**1. Today** (the briefing)
- The Quint core and **Play briefing**: a spoken summary built fresh at open from everything below.
- Session clock: UK and New York time, what part of the day it is, a countdown to the owner's trading window (the first 3 hours after the New York open) and to its end.
- News: the next red-folder release and Lucid's blackout around it (flat from 1 minute before to 1 minute after on a funded LucidDaily account; Quint uses 2 minutes either side).
- Money: real bots (from Trading Mastery), the owner's own trades (journal), the paper forward test, and prop room left on the tightest account.
- The Four Pillars pre-market checklist, ticked off each day.
- Warnings, and what the lab did overnight.

**2. Ask** (Jarvis)
- Voice or text. Quint answers in 2 to 5 short sentences that read well aloud, and speaks them.
- Quint uses tools to look things up, never guesses: the overview, bots, a strategy's evidence, the Four Pillars rules, the prop accounts, the journal, sizing a trade, last night's Jarvis report, and adding an idea to the lab.
- Quint never tells the owner to take a trade, never calls a strategy profitable, and says when data is thin.

**3. Desk** (before, during and after a trade)
- **Pre-trade check:** the four pillars in order, the no-trade rules, the trading window and the news blackout, then a verdict: all clear, wait, or no trade.
- **Size it:** entry, stop and target give R, and the selected account's room gives contracts (a full stop-out under a quarter of the room left), the dollar risk, and what a stop-out leaves.
- **Prop accounts:** each account's balance, floor, room left, distance to target, daily loss limit and consistency, with the Lucid presets filled in and every number editable.
- **Journal:** log trades in seconds, see P&L by day, week and playbook, and export to CSV.

**4. Lab** (the brain getting smarter)
- The scoreboard with equity curves, grades, the Lucid pass/fail odds and the paper forward test.
- The strategy library grouped by holding time, with honest statuses, with the owner's strategy (WYLD Will Four Pillars) at the top.
- **Ideas inbox:** the owner speaks an idea; the nightly run writes its exact rules and pass mark down before testing it, tests it, and reports back here.
- Lessons learned and the experiment queue. TraderDev live numbers on demand.

**5. More** (the control room)
- The nightly jobs: next run, last run, run now, pause and resume.
- TradingView budget: plan, calls the hub has used today, and the on-demand MNQ check.
- Every app in one place: Trading Mastery, Four Pillars Trainer, the WYLD rulebook, the Intelligence Layer plan, the Quint repo and its pull requests.
- The roadmap, ventures (coming next), settings, and data export.

## Data contracts (keep these stable)
- **Built into the page** (public, from the repo): roundup, registry, bot results and equity curves, playbooks, Lucid presets, the news calendar, the roadmap.
- **Hub storage, private to the owner** (`data/users/<id>/…`): `accounts`, `trades`, `days` (checklists), `settings`.
- **Hub storage, owner-only shared paths:** `ideas/<id>` {text, kind, status new|queued|testing|done|rejected, createdAt, note, result} (the nightly run reads and updates these), and `feeds/tm` (the HQ sync job writes it; see `lab/HQSYNC.md`).
- Without storage (signed out, a preview), the hub still works and saves on the device, and says so.

## The loop that makes it smarter
1. The owner speaks an idea in Ask or the Ideas inbox.
2. The nightly run writes its exact rules, data and pass mark into the registry queue **before** testing, and marks the idea "queued".
3. It tests the idea on real MNQ within budget, records every variant, and marks the idea done or rejected with the result.
4. Survivors go into the paper forward test, frozen. Only the owner can take a bot live, through Quint Control.
5. Every lesson is written into the registry, so the next session starts smarter.

## Quality bar
- Unit tests for the maths (`lab/test/`), and a Playwright test of the hub with a mocked `window.claude` at 390×844: every tab renders, saves work, no console errors, no sideways scroll. Run three times before publishing.
- Every feature works when a capability is missing (no storage, no voice, no connector) and says what's unavailable.
- Never hand-edit `lab/jarvis/index.html`: change `template.html`, rebuild with `node lab/jarvis/build.js`, test, publish.

## Roadmap
| Stage | What | Status |
|---|---|---|
| 1 | Lab, scoreboard, Lucid simulator, paper forward test, spoken roundup | Done |
| 2 | Quint HQ v2: five screens, Desk, prop accounts, journal, ideas loop, Trading Mastery sync, nightly controls | Done (this build) |
| 3 | Years of data: NinjaTrader Strategy Analyzer results imported into the lab | Needs the owner's Windows computer |
| 4 | Quint Control phases 1 to 3: the engine, guardian, first bots on simulation | Planned (`quint-control/PLAN.md`) |
| 5 | Live bots in the hub: real P&L, bots on and off with a confirm, the guardian's status | After stage 4 |
| 6 | Copy trading across prop accounts, payouts, more firms | Planned |
| 7 | Ventures: other businesses tracked the same honest way | Later |

Nothing in Quint HQ is financial advice.
