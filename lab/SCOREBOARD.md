# Quint Lab scoreboard

Updated 2026-11-18 by `node lab/run.js`. 1 MNQ, $0.50 commission a side, 1 tick of slippage on market and stop fills. Rules fixed before testing.

**Read this first:** these are short samples (weeks, not years). Under 100 trades the rulebook calls a result an anecdote, so no bot here is proven. The real test is years of data in NinjaTrader and the paper forward test below.

## Backtest on the saved candles

| Bot | Trades | Net | Later half | Worst drawdown | Worst day | Lucid 50K: pass / fail | Grade |
|---|---|---|---|---|---|---|---|
| 3. 20-candle breakout (15m) | 40 | +$3,711 | +$4,799 | $1,720 | -$483 | 66% / 9%* | Too few trades |
| 12. Noise-area momentum (30m) | 43 | +$2,319 | +$492 | $1,019 | -$517 | 42% / 15%* | Too few trades |
| 10. VWAP band fade (5m) | 30 | +$1,741 | +$1,110 | $449 | -$278 | 89% / 0%* | Too few trades |
| 2. Opening candle direction (5-minute opening range) (5m) | 20 | +$1,715 | +$2,629 | $1,242 | -$390 | 48% / 39%* 🔴 | Too few trades |
| 7. Inverted fair value gap (5m) | 12 | +$1,300 | -$141 | $512 | -$262 | 76% / 1%* | Too few trades |
| 6. Gap fade (5m) | 3 | +$289 | +$383 | $154 | -$93 | 1% / 0%* | Too few trades |
| 1. New York open breakout (5m) | 19 | +$256 | +$992 | $2,059 | -$626 | 26% / 69%* 🔴 | Too few trades |
| 11. Failed breakout (5m) | 9 | -$556 | -$718 | $955 | -$351 | 0% / 52%* 🔴 | Loses money |
| 4. Last-30-minute momentum (5m) | 19 | -$1,215 | -$1,119 | $1,325 | -$286 | 0% / 98%* 🔴 | Loses money |

Lucid 50K column: 10,000 replays of the bot's own days through the LucidDaily 50K rules ($3,000 target, $2,000 trailing max loss, 40% consistency, 60 trading days). 🔴 means over a 25% chance of failing first, the plan's red line. * Fewer than 100 trades: the replays only reshuffle a few weeks of results, so the percentage is a guess, not evidence.

## Paper forward test (candles that arrived after the rules were fixed)

| Bot | Since | Trades | Net |
|---|---|---|---|
| 3. 20-candle breakout | 2026-11-18 | 0 | +$0 |
| 12. Noise-area momentum | 2026-11-18 | 0 | +$0 |
| 10. VWAP band fade | 2026-11-18 | 0 | +$0 |
| 2. Opening candle direction (5-minute opening range) | 2026-11-18 | 0 | +$0 |
| 7. Inverted fair value gap | 2026-11-18 | 0 | +$0 |
| 6. Gap fade | 2026-11-18 | 0 | +$0 |
| 1. New York open breakout | 2026-11-18 | 0 | +$0 |
| 11. Failed breakout | 2026-11-18 | 0 | +$0 |
| 4. Last-30-minute momentum | 2026-11-18 | 0 | +$0 |

Forward total: +$0 on paper, from 0 trades.

## Not run here

- VWAP trend: needs 1-minute candles or smaller, and the lab only has 5 and 15-minute candles.
- Range squeeze breakout: needs 1-minute candles or smaller, and the lab only has 5 and 15-minute candles.
- Trend-join scalper: needs 1-minute candles or smaller, and the lab only has 5 and 15-minute candles.

Nothing here is financial advice.
