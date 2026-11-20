# Quint Control: build status

**Read this first in every session, and update it before you finish.** If a session ends early (usage runs out, the chat closes), the next session picks up from here.

## Where we are

| Phase | What it is | Status |
|---|---|---|
| 0 | Project set-up: plan, structure, protocol, skill, install scripts, tests | Done: merged in pull request #13 |
| 1 | Engine and website shell (read-only) | Not started |
| 2 | Guardian, order router, copier and Manual Copy (simulation only) | Not started |
| 3 | Strategy plug-ins and the first bots | Not started |
| 4 | Backtests, Monte Carlo, firm library, setup wizard, Go Live Now | Not started |
| 4b | Chart overlay, live trade card, Telegram alerts, offline alarm | Not started |
| 5 | Live brain, journal, shadow journal, Quint assistant | Not started |
| 6 | Release candidate and going live | Not started |
| 7 | Extras | Not started |

## Next step

1. The owner gets their Windows computer ready using `SETUP.md` (install NinjaTrader 8, turn on multi-provider mode, connect LucidDaily and check Sim101).
2. Optional but recommended, before paying for Fable: the cheap one-week proof in `proof/README.md`.
3. Start phase 1: paste the master prompt and the phase 1 prompt from `FABLE-PROMPTS.md`.

## How to resume after an interruption

1. Read this file, then `PLAN.md` and the `quint-control` skill.
2. Check which branch has the latest work: `git branch -r` and the open pull requests.
3. Run `cd quint-control && npm test` and confirm everything still passes before changing anything.
4. Carry on from the first unticked item in the phase checklist below.

## Phase 0 checklist

- [x] Branch `quint-control/phase-0` created from `main`
- [x] `PLAN.md` (copy of the plan doc) and `FABLE-PROMPTS.md` (every phase prompt) saved in the repo
- [x] Folder structure with a README in each folder
- [x] `CLAUDE.md` updated: the engine may place orders, plus the Quint Control section
- [x] `quint-control` skill with the decisions, rules and testing protocol
- [x] WebSocket protocol (`protocol.md`), JSON schemas and one example per message
- [x] LucidDaily firm preset (numbers marked "verify" where Lucid's figures aren't confirmed)
- [x] `SETUP.md` for the owner
- [x] `Install-Quint.ps1` and `Uninstall-Quint.ps1`
- [x] `npm test`: 39 tests (schema checker, protocol, firm preset, structure and install-script safety), passed three runs in a row with `npm run test:3`
- [x] Owner reviews and merges the pull request (#13, 18 Nov 2026)

## Decisions (settled, don't re-ask)

Windows computer · LucidDaily accounts through Tradovate · $0.50 a side MNQ commission plus 1 tick slippage each way · 25% Monte Carlo limit · simulation optional, Go Live Now with a typed confirm · unapproved bots default to 1 MNQ · guardian rules and kill switches can never be skipped · Quint uses the owner's own Claude API key (Haiku 5.5 for help, Sonnet 5.5 for "why") · Manual Copy mode with all bots off · one bot per account at a time · every bot sets its own stop and target · Telegram alerts plus a Healthchecks.io offline alarm · accounts in the owner's name only.

## Still open

- How many LucidDaily accounts, and what size (the bot works with one).
- **What you picked at checkout for each account:** daily loss limit on or off, the evaluation drawdown (end of day or intraday) and the consistency percentage (40%, or the 50% or 30% add-on). The guardian needs these per account. They're shown on your Lucid dashboard.
- The 50K numbers are now checked against Lucid's help center (18 Nov 2026). Still marked `verify`: the daily loss limit for the 25K, 100K and 150K sizes (from review sites), and the evaluation consistency, because Lucid's own pages disagree (40% on the customization page, 50% on the evaluation page).

## Notes for the next session

- No `dotnet` or PowerShell in the cloud workspace and package installs are off, so: C# is checked by the self-tests inside NinjaTrader, the schema checker is hand-written (`reference/lib/schema.js`), and the install scripts are checked by static tests only.
- `backtest/pillar_2r.js` and its results are untracked on a separate branch idea (5-pillar fixed-2R test); they are not part of Quint Control.
- NinjaTrader's "CME US Index Futures RTH" template ends at 16:00 Chicago (17:00 New York), not 16:00 New York. Bots must work out New York time from each bar's time, as `proof/QuintNoiseMomentum.cs` does (NinjaTrader's time zone is `NinjaTrader.Core.Globals.GeneralOptions.TimeZoneInfo`).
- The proof strategy's class is `QuintNoiseMomentum`, and the owner copies it into `bin\Custom\Strategies` by hand. Give phase 3's Strategy Analyzer wrapper a different class name, or ask the owner to delete the proof file first, or NinjaTrader won't compile.
- YouTube pages can't be read from the cloud workspace (rate limited). Ask the owner for titles, screenshots or transcripts.
- Lucid's microscalping rule (help center, updated 26 Aug 2026): flagged when more than 50% of profits come from trades held 5 seconds or less. The guardian's 30-second minimum hold is stricter than this, on purpose.


## Strategy Lab Phase 3A implementation (feature branch)

Branch: `quint-control/strategy-lab-phase-3a`. This is a first vertical slice and prototype, not a completed engine integration.

- [x] Pure JavaScript domain module: create MNQ paper drafts, validate definitions and manual paper scenarios.
- [x] Bounded allow-listed expression evaluator; no eval, generated source execution, network or broker access.
- [x] JSON schemas for Strategy Definition v1 and Manual Paper Scenario v1.
- [x] Standalone mobile-friendly browser prototype: create bot drafts, create one-off paper scenarios, local library and JSON export.
- [x] Unit and UI contract tests authored; CI workflow added to run the suite and three consecutive runs.
- [ ] Verify CI passes; fix any failures before considering this slice mergeable.
- [ ] Add server-side Claude interpreter that converts natural-language descriptions into a proposed definition, asks for missing fields and requires user review.
- [ ] Integrate with the phase 1 website shell and phase 2 engine protocol.
- [ ] Add persistent strategy storage, historical test runner, NinjaTrader Playback and live-feed paper ledger in subsequent stages.

**Safety / current limitations:** the browser prototype saves only in localStorage and exports JSON. It does not interpret free text, connect to market data, backtest, replay, simulate fills, or connect to the engine. Paper scenario records are plans only, not running orders. Live trading is not implemented here. Phases 1 and 2 remain prerequisites for the actual integrated product.

## Session log

| 2026-11-19 | ChatGPT | Owner requested Discord and/or Telegram alerts linked to the Quint website for detected setups, entries/fills, stop/target updates and completed trade results. Added provider-neutral notification design, event lifecycle, website deep links, delivery reliability and security requirements to PLAN.md on main. |

| 2026-11-19 | ChatGPT | Owner specified that Quint is the platform/brain and AI chat assistant only; all trading strategies must appear as separately named, selectable bots in a dedicated library grouped by horizon, with honest implementation/evidence statuses. Added menu and naming requirements to PLAN.md on main. |

| 2026-11-19 | ChatGPT | Owner requirement: longer-horizon bots must have strict stop-loss/take-profit boundaries and continuous chart reassessment. Added mandatory protection, event-driven monitoring, decision logging, overnight/gap checks and AI-independent fail-safes to the MNQ research programme and Quint Control plan on main. No trading code or live execution path changed. |



| 2026-11-19 | ChatGPT | Added multi-day futures/prop-firm capability requirements and overnight/weekend risk controls to PLAN.md. Researched exact account products and official holding rules; added `research/prop-firms/OVERNIGHT-FUTURES.md`. Candidate firms are research leads only; no account purchase recommendation and no trading code/live path changed. |

| Date | Model | What happened |
|---|---|---|
| 2026-11-18 | Opus 5.5 | Phase 0 built: plan, prompts, structure, protocol and schemas, skill, firm preset, setup guide, install scripts, tests (39, three clean runs). Pull request opened. Not tested: the PowerShell scripts (no PowerShell in the cloud); they get their first real run on the owner's computer in phase 1. |
| 2026-11-18 | Opus 5.5 | Added gap fade as bot 9 (Testing, lowest priority) with fixed rules in the phase 3 prompt; EMA pullback and ATR trailing trend left out (both lost money walk-forward). PLAN.md is now the up-to-date copy of the plan. |
| 2026-11-18 | Opus 5.5 | Owner decided one bot per account (no bots sharing an account); added to the plan, phase 2 prompt and scenarios, skill and protocol notes. |
| 2026-11-18 | Opus 5.5 | Added rules for several bots on one account (replaced by one bot per account, the row above). |
| 2026-11-18 | Opus 5.5 | Checked the LucidDaily numbers on Lucid's help center and updated the preset, its schema, the plan and 2 new tests (41 pass). Wrote the one-week proof (`proof/`): the NinjaScript strategy, its JavaScript version with 5 tests (46 tests now, three clean runs), the owner's steps and pass rules, and a first read on the saved candles (11 weeks: +$1,456 on 1 MNQ, but only +$31 in the second half; too short to judge; corrected after finding the CSV volume bug). Not tested: the C# (no compiler in the cloud), so the owner's F5 is its first compile. Looked at the Strat v60 dashboard the owner sent and added it to the plan's "left out" table. |

| 2026-11-19 | ChatGPT | Researched public TradersPost workflows, NinjaTrader Strategy Analyzer/Playback, TradingView paper trading, CME MNQ specifications and a 2026 MNQ OHLCV falsification preprint. Added `research/STRATEGY-LAB.md`, linked it from `quint-control/README.md`, and added a summary to `PLAN.md`. Connected it to the existing balanced MNQ research programme and exploratory bot findings. The specification covers: plain-English bot creation, versioned deterministic strategy definitions, historical/replay/live-paper testing, immutable evidence and isolated paper execution. Design/research only; no trading code, website or live execution path changed. Next: after phase 1/2 foundation, implement Strategy Lab phases 3A–3E in order. |


| 2026-11-20 | ChatGPT | Inspected the existing Quint repo and researched the requested shared private website, two-user access, individual Claude billing and NinjaTrader live market data. Added `research/SHARED-PLATFORM-AND-MARKET-DATA.md` and linked it from the Quint Control plan, README and root Claude instructions on a research branch. Key finding: the existing design is a local NinjaTrader 8 engine/dashboard and Phases 1–2 are not started. Proposed one shared web/control plane with isolated user workspaces, individual feeds/Claude keys and secure outbound engine tunnels. NinjaTrader's newer WebSocket Market Data API supports quotes/DOM/charts, but its September 2026 API agreement and CME terms create a written-approval gate before any feed relay or shared display. No trading code, Guardian, OrderRouter or live execution path changed. |

| 2026-11-20 | ChatGPT | Researched autonomous bot uptime and website operation against the existing Quint plan, protocol and Fable prompts. Added `research/AUTONOMOUS-BOT-RUNTIME-AND-UPTIME.md` and linked it from root Claude instructions, README, PLAN and STATUS on the shared-platform research branch. Key requirements: deterministic event-driven bots inside each user's NinjaTrader Windows runtime; no Claude/browser dependency; per-user engine isolation; persistent lifecycle; recovery reconciliation before live resume; bounded reconnects, external dead-man monitoring, soak/fault tests. Confirmed NinjaScript runs in NinjaTrader Desktop on Windows and strategies terminate on NinjaTrader shutdown; the existing plan's $30–$40 Windows host estimate is per host, not both users. No trading code or live execution path changed.
