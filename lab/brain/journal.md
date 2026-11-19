# Quint Lab journal

Newest first. Every lab session adds an entry: what ran, what was learned, what changed, and the TradingView calls used.

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
- Regular-hours versions of Prop A and B, and the Lucid sweep + volume: Rejected.
- New pre-registered test in the queue: long-only RSI(2) with a stop, on April to November 2026 only.

**Calls used:** TradingView 2, TraderDev 13 credits.
