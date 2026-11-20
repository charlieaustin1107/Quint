---
name: quint-trading
description: How to research, backtest, judge and teach MNQ trading strategies for Chart Wizard and Quint Brain. It does not govern Quint Control's automated execution engine. Use for anything about strategies, backtests, trade calls, position sizing, the 5-pillar playbook, Lucid Trading limits, TradingView call budgets or market data in this repo.
---

# Trading for Chart Wizard and Quint

This skill applies only to Chart Wizard and Quint Brain learning/analysis. Automated bots, broker orders and Guardian rules belong to Quint Control; read `.claude/skills/quint-control/SKILL.md` for that product.

The owner scalps and day-trades **MNQ** (Micro E-mini Nasdaq-100, `CME_MINI:MNQ1!`) from an iPhone and is working to pass a **Lucid Trading** funded account. Holding time: about 15 minutes to a couple of hours. Everything here is for learning and practice; the apps never place real orders and nothing is financial advice.

## Contract facts (never guess these)
- MNQ: **$2 a point**, tick 0.25 = **$0.50**. NQ: $20 a point.
- Legacy Quint Brain backtest assumption: **$0.75 commission per side + 1 tick slippage per side** = $2.50 round trip per MNQ. This skill covers Chart Wizard/Quint Brain only; it is not the Quint Control/Lab fee model and is not a universal broker tariff. Use the owning product's declared cost profile and verify actual account fees.
- RTH: 09:30–16:00 New York. CME Globex: Sunday 18:00 to Friday 17:00 NY, daily break 17:00–18:00. The owner lives in the UK: give times in UK time and New York time.

## What earns a place in the app
A strategy is taught only if it **beats its costs in a backtest on real MNQ data**. Evidence goes in `quint-brain/backtest/results/`. Report:
1. Whole period **and out of sample** (the later half). One good stretch isn't proof.
2. Trades, win rate, profit factor, net $ on 1 MNQ after costs, average R.
3. **Worst drawdown in dollars on 1 contract** — Lucid's limits matter more than profit.
4. Longest losing streak and worst day, because a funded account dies on those.
Never rewrite the strategy logic for a backtest: `quint-brain/backtest/extract_engine.py` copies Quint Brain's own functions, so the test runs exactly what the app teaches. Re-run the extractor after changing rules. See `quint-brain/backtest/README.md`.

Good research habits: decide the rules before looking at results; keep parameter sweeps small and report every variant tried (not just the best); prefer simple rules that survive across years and across ES/NQ; treat anything with fewer than ~100 trades as anecdote; check the result isn't one news day.

## Strategies taught now (keep it to the best 2–3 plus the playbook)
- **20-candle breakout**: 15-minute chart, stop 2 ATR, target 3× the stop, close after 40 candles.
- **New York open breakout**: first 15 minutes from 09:30 NY, one trade a day, entries until 11:30, stop on the other side of the range, target 2R.
- **5-pillar playbook (the owner's own; never remove it)**: Location → Liquidity sweep → CISD (change in state of delivery) → Displacement → Execution, on the 5-minute chart, New York session. The engine is `pbEval` in `chart-wizard/src/pillars.js`.

## Lucid Trading
Plans differ and published figures disagree (daily loss limit, consistency %, minimum days), so the apps keep every limit **editable** in the Lucid guard (`chart-wizard/src/hud.js`). The usual 50K figures: $3,000 target, $2,000 max loss trailing the highest end-of-day balance (often locking at the starting balance). Never present these as certain; tell the owner to check their plan's rules page.

Sizing rule Quint follows for the real account: keep a full stop-out under about **a quarter of the room left** before the limit.

## Quint's trade calls
- One decision, with exact entry, stop, target and confidence, ending with the machine line `CALL: BUY|SELL|NO TRADE · ENTRY … · STOP … · TARGET … · CONF …% · HOLD …m` (parsed by `dkParse` in `dock.js`). Stop and target must sit on the correct sides of the entry.
- Confidence must be honest: the record compares stated confidence with the real win rate.
- "No trade" is a valid, often best, answer. Never chase; respect news (CPI, FOMC, NFP) and the session.
- Small talk takes the chat path (`dkIsChat`) and must not make calls.

## TradingView's daily call limit (the most important technical rule)
The connector allows a fixed number of calls **per day for the whole account** (10 Essential, 20 Plus, 50 Premium, 150 Ultimate, 500 with the AI add-on). So:
- Never poll on a timer except through `tvBgEvery()`; never guess the owner's plan.
- The feed (`dkFeed`) fetches history once a day and then only the newest 1-minute candles. A Quint answer should cost about one call.
- Practice never calls TradingView (`pracBars`). When TradingView refuses, answer from saved candles (saying how old) or a screenshot.

## Credible sources to cite when teaching
CME Group contract specs for MNQ; the exchange's trading hours page; Lucid Trading's own rules pages for the owner's plan; academic work on intraday momentum and opening-range effects (e.g. Gao, Han, Li & Zhou, "Market intraday momentum", Journal of Financial Economics 2018). Credit sources in the app wherever a claim is taught.
