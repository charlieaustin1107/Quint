# Quint Lab scoreboard

Updated 2026-11-19 by `node lab/run.js`. 1 MNQ, $0.50 commission a side, 1 tick of slippage on market and stop fills. Rules fixed before testing.

**Read this first:** these are short samples (weeks, not years). Under 100 trades the rulebook calls a result an anecdote, so no bot here is proven. The real test is years of data in NinjaTrader and the paper forward test below.

## Backtest on the saved candles

| Bot | Trades | Net | Later half | Worst drawdown | Worst day | Lucid 50K: pass / fail | Grade |
|---|---|---|---|---|---|---|---|
| 3. 20-candle breakout (15m) | 41 | +$4,374 | +$5,462 | $1,720 | -$483 | 74% / 6%* | Too few trades |
| 12. Noise-area momentum (30m) | 44 | +$2,571 | +$588 | $1,019 | -$517 | 46% / 13%* | Too few trades |
| 2. Opening candle direction (5-minute opening range) (5m) | 22 | +$1,156 | +$2,350 | $1,242 | -$390 | 32% / 55%* 🔴 | Too few trades |
| 10. VWAP band fade (5m) | 32 | +$1,113 | +$633 | $1,077 | -$627 | 59% / 13%* | Too few trades |
| 7. Inverted fair value gap (5m) | 14 | +$783 | -$648 | $1,029 | -$264 | 38% / 7%* | Too few trades |
| 1. New York open breakout (5m) | 21 | +$704 | +$2,005 | $2,059 | -$630 | 35% / 63%* 🔴 | Too few trades |
| 6. Gap fade (5m) | 4 | +$529 | +$683 | $154 | -$93 | 4% / 0%* | Too few trades |
| 4. Last-30-minute momentum (5m) | 21 | -$1,125 | -$882 | $1,325 | -$286 | 0% / 91%* 🔴 | Loses money |
| 11. Failed breakout (5m) | 11 | -$1,358 | -$1,501 | $1,758 | -$802 | 0% / 92%* 🔴 | Loses money |

Lucid 50K column: 10,000 replays of the bot's own days through the LucidDaily 50K rules ($3,000 target, $2,000 trailing max loss, 40% consistency, 60 trading days). 🔴 means over a 25% chance of failing first, the plan's red line. * Fewer than 100 trades: the replays only reshuffle a few weeks of results, so the percentage is a guess, not evidence.

## Paper forward test (candles that arrived after the rules were fixed)

| Bot | Since | Trades | Net |
|---|---|---|---|
| 3. 20-candle breakout | 2026-11-18 | 1 | +$663 |
| 12. Noise-area momentum | 2026-11-18 | 1 | +$253 |
| 2. Opening candle direction (5-minute opening range) | 2026-11-18 | 1 | -$331 |
| 10. VWAP band fade | 2026-11-18 | 2 | -$627 |
| 7. Inverted fair value gap | 2026-11-18 | 1 | -$264 |
| 1. New York open breakout | 2026-11-18 | 1 | +$1,079 |
| 6. Gap fade | 2026-11-18 | 0 | +$0 |
| 4. Last-30-minute momentum | 2026-11-18 | 1 | -$105 |
| 11. Failed breakout | 2026-11-18 | 2 | -$802 |

Forward total: -$137 on paper, from 10 trades.

## Not run here

- VWAP trend: needs 1-minute candles or smaller, and the lab only has 5 and 15-minute candles.
- Range squeeze breakout: needs 1-minute candles or smaller, and the lab only has 5 and 15-minute candles.
- Trend-join scalper: needs 1-minute candles or smaller, and the lab only has 5 and 15-minute candles.

Nothing here is financial advice.
