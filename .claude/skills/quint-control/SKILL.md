---
name: quint-control
description: Decisions, engineering rules and testing protocol for building Quint Control, the owner's NinjaTrader 8 trading engine (bots, guardian, copier, Manual Copy), its local dashboard website and the Quint assistant. Use for any work in quint-control/.
---

# Building Quint Control

Read `quint-control/STATUS.md` first and update it before you finish. Commit and push often: a session can end at any time, and the next one resumes from the repo.

## The owner
- Trades MNQ (Micro Nasdaq-100 futures) on Lucid Trading, **LucidDaily** plan, connected to NinjaTrader 8 through **Tradovate**. Lives in the UK: give times in UK and New York time.
- Not a programmer. Explain in short, plain English. For anything on their computer, give numbered steps with exact menus, clicks, paths and what they should see.
- Uses a Windows computer with NinjaTrader 8 (8.1 or later).

## What we're building
1. **Quint Engine**: NinjaTrader 8 add-on (NinjaScript, C#). Runs bots on live candles, applies guardian rules, places orders on every switched-on account (copier), keeps the journal, serves the dashboard on 127.0.0.1.
2. **Quint strategies**: one C# file per bot in the QuintStrategy plug-in format, found automatically, plus a NinjaScript Strategy wrapper for Strategy Analyzer.
3. **Quint Control website**: one HTML page served by the engine (Command, Bots, Accounts, Journal, Backtests, Brain, Settings, setup wizard, Quint assistant) in the repo's black Obsidian & chrome design system (`quint-design` skill). Futuristic, premium, fast, clear.
4. **Quint assistant**: pop-up helper on every screen, using the owner's Claude API key, with a help-guide fallback.
Goal: beat Phantom Trader AI on every row of the plan's "Match Phantom, then beat it" table, while staying simple to set up. Full plan: `quint-control/PLAN.md`. Phase prompts: `quint-control/FABLE-PROMPTS.md`.

## Decisions already made (don't ask again)
- Windows. LucidDaily through Tradovate, so several accounts trade at once. Accounts in the owner's name only.
- Costs: $0.50 commission a side for MNQ plus 1 tick (0.25 pt = $0.50) slippage each way. MNQ is $2 a point.
- Monte Carlo limit: more than 25% chance of hitting the max loss before the profit target = red.
- Simulation is optional. New bots default to simulation; **Go Live Now** puts any bot on a prop account after a warning screen and typing the account name. Unapproved bots default to 1 MNQ per account.
- The guardian's firm rules and the kill switches can never be skipped.
- Quint uses the owner's Claude API key: Haiku 5.5 for help, Sonnet 5.5 for "why" questions (check current model IDs).
- **Manual Copy mode**: the owner trades by hand on a leader account and every order is copied to followers, with all bots off. Bots and Manual Copy never run together.
- Every bot sets its own stop and target; a signal without a stop is rejected.
- Every trade is visible: Quint Trades chart indicator, live trade card, Telegram alerts; Healthchecks.io offline alarm.

## LucidDaily rules the guardian enforces (all editable)
- Red-folder news is a hard breach: flat before and after each release (default 2 minutes each side), no new entries in the window.
- Max loss $2,000 on 50K; funded drawdown reportedly trails intraday, so measure room from the day's highest balance including open profit.
- No hedging across accounts, including correlated pairs (MNQ vs MES).
- No microscalping: minimum hold time (default 30 s), log every hold time.
- No HFT: cap orders per minute per account (default 6).
- Size so a full stop-out costs under a quarter of the room left.
- Several bots per account are allowed: one trade per market per account at a time (others skipped and logged, priority order for ties), no opposite correlated positions even between bots, combined open risk under a quarter of the room left, max open trades per account (default 2).

## Engineering rules
1. Every order goes through `Guardian.Check` and one sender, `OrderRouter`. Nothing else calls Account.Submit, Cancel or Flatten.
2. Fail safe: on anything unexpected, stop new entries for that account, keep stops in place, alert, log. Never guess.
3. No naked positions: entry plus OCO stop and target together; flatten if the stop isn't confirmed in time.
4. Trading logic in plain C# (`core/`) with no NinjaTrader types; thin adapters in `engine/`.
5. NinjaScript: .NET Framework 4.8, C# 7.3 features only, no NuGet. Tell the owner exactly how to add any extra reference.
6. Threading: never block NinjaTrader event threads; Dispatcher for UI; lock shared state; no sleeps in handlers.
7. Website server: 127.0.0.1 only, TcpListener-based HTTP + WebSocket, no admin rights. Trading commands need a UI confirm and the session token (see `protocol.md`).
8. Secrets (Claude key, Telegram token, Healthchecks URL) encrypted with Windows DPAPI; never in the repo, logs, screenshots or website source.
9. Data under `Documents\NinjaTrader 8\quint\`: JSON settings and state, append-only JSON-lines journal, daily CSV export.
10. Check every NinjaTrader API against the NinjaTrader 8 Help Guide; if unsure, say so and design a fallback.

## Testing: nothing is done until tested
- JavaScript reference of all trading logic in `reference/`, tested with `node --test` on the real MNQ candles in `backtest/data/`.
- C# ported line for line; golden files in `tests/golden/` generated from the reference.
- Engine self-test runner (Settings > Run self-tests) runs the C# against the golden files inside NinjaTrader and writes `Documents\NinjaTrader 8\quint\selftest.txt`.
- Website: Playwright against `web/mock-engine.js` at 1440x900 and 390x844, zero console errors, screenshots looked at.
- Guardian and copier: scenario suite against a fake broker in the reference and self-tests, then the owner's Playback and Sim101 checklist.
- Run every suite three times before calling a phase done, and after every fix. Report ran, passed, failed.

## How to work
- One phase per pull request, small commits, plain-English description (what changed, how to install, how to test, results, limits).
- Never claim something works unless it was tested; say what wasn't.
- Ask the owner only about decisions that are theirs.
- Keep install simple: `install/Install-Quint.ps1`, then F5 in the NinjaScript Editor. Update it and `SETUP.md` every phase.
- Nothing here is financial advice.
