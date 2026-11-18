# Quint Control: build status

**Read this first in every session, and update it before you finish.** If a session ends early (usage runs out, the chat closes), the next session picks up from here.

## Where we are

| Phase | What it is | Status |
|---|---|---|
| 0 | Project set-up: plan, structure, protocol, skill, install scripts, tests | In review (branch `quint-control/phase-0`) |
| 1 | Engine and website shell (read-only) | Not started |
| 2 | Guardian, order router, copier and Manual Copy (simulation only) | Not started |
| 3 | Strategy plug-ins and the first bots | Not started |
| 4 | Backtests, Monte Carlo, firm library, setup wizard, Go Live Now | Not started |
| 4b | Chart overlay, live trade card, Telegram alerts, offline alarm | Not started |
| 5 | Live brain, journal, shadow journal, Quint assistant | Not started |
| 6 | Release candidate and going live | Not started |
| 7 | Extras | Not started |

## Next step

1. The owner reviews and merges the phase 0 pull request.
2. The owner gets their Windows computer ready using `SETUP.md` (install NinjaTrader 8, turn on multi-provider mode, connect LucidDaily and check Sim101).
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
- [ ] Owner reviews and merges the pull request

## Decisions (settled, don't re-ask)

Windows computer · LucidDaily accounts through Tradovate · $0.50 a side MNQ commission plus 1 tick slippage each way · 25% Monte Carlo limit · simulation optional, Go Live Now with a typed confirm · unapproved bots default to 1 MNQ · guardian rules and kill switches can never be skipped · Quint uses the owner's own Claude API key (Haiku 5.5 for help, Sonnet 5.5 for "why") · Manual Copy mode with all bots off · every bot sets its own stop and target · Telegram alerts plus a Healthchecks.io offline alarm · accounts in the owner's name only.

## Still open

- How many LucidDaily accounts, and what size (the bot works with one).
- LucidDaily numbers marked `verify` in `firms/lucid-daily.json` (profit target, daily loss limit, max micros, max funded accounts, news penalty): check them on Lucid's rules page before going live.

## Notes for the next session

- No `dotnet` or PowerShell in the cloud workspace and package installs are off, so: C# is checked by the self-tests inside NinjaTrader, the schema checker is hand-written (`reference/lib/schema.js`), and the install scripts are checked by static tests only.
- `backtest/pillar_2r.js` and its results are untracked on a separate branch idea (5-pillar fixed-2R test); they are not part of Quint Control.

## Session log

| Date | Model | What happened |
|---|---|---|
| 2026-11-18 | Opus 5.5 | Phase 0 built: plan, prompts, structure, protocol and schemas, skill, firm preset, setup guide, install scripts, tests (39, three clean runs). Pull request opened. Not tested: the PowerShell scripts (no PowerShell in the cloud); they get their first real run on the owner's computer in phase 1. |
