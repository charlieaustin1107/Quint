# MNQ backtest report: 18 November 2026

## The short version
- **Both breakout strategies beat their costs over the whole period**, and the results agree closely with TradingView's own Strategy Tester. But **both lost money in the first half** and made it all in the second half, mostly on shorts while MNQ fell about 7%. They're promising, not proven.
- **The New York open breakout depends on one day.** Its best day made more than its total profit, so without that day it lost money.
- **Your 5-pillar playbook took no trades in 4 weeks.** The rules work as written. They're just strict enough that nothing qualified (see below for exactly where setups drop out).

## What was tested
- Real `CME_MINI:MNQ1!` candles from your TradingView:
  - 15-minute, 1 Sep to 17 Nov 2026 (5,141 candles, about 11 weeks)
  - 5-minute, 21 Oct to 17 Nov 2026 (5,437 candles, about 4 weeks)
  - daily, back to May 2019, used for the playbook's daily levels
- 1 contract. Each trade pays $2.50 in costs ($0.75 commission a side plus 1 tick of slippage a side).
- The rules are the app's own code, copied out of Quint Brain. A separate Python version of the two breakout strategies got exactly the same trades.
- If a candle touches both the stop and the target, the stop is counted. That's the cautious choice.

## 1. 20-candle breakout (15-minute)
| | All | 1st half | 2nd half |
|---|---|---|---|
| Trades | 185 | 92 | 93 |
| Win rate | 37% | 33% | 42% |
| Profit factor | 1.27 | 0.96 | 1.50 |
| Net | **+$6,401** | −$420 | +$6,821 |
| Max drawdown | $2,341 | $1,994 | $2,341 |
| Worst day | −$945 | −$793 | −$945 |

- The first half runs 1 Sep to 7 Oct, and the second half 7 Oct to 17 Nov.
- Longs made +$1,782 and shorts made +$4,619. In the second half the shorts made +$7,748 while the longs lost $927.
- How trades ended: 113 hit the stop, 35 hit the target and 37 ran out of time. The longest losing streak was **10 trades in a row**.
- The best single day was +$2,891, which is 45% of all the profit.

**Verdict:** It beats its costs, but the edge came from the October–November sell-off. It needs re-testing once the market trends up.

## 2. New York open breakout (15-minute)
| | All | 1st half | 2nd half |
|---|---|---|---|
| Trades | 52 | 26 | 26 |
| Win rate | 46% | 42% | 50% |
| Profit factor | 1.21 | 0.86 | 1.52 |
| Net | **+$1,529** | −$462 | +$1,991 |
| Max drawdown | $1,868 | $1,340 | $1,868 |
| Worst day | −$752 | −$401 | −$752 |

- Longs lost $1,531 and shorts made +$3,060.
- How trades ended: 18 hit the stop, 6 hit the 2R target and 28 closed at the time limit. So most trades are closed before 15:55 New York without reaching the target.
- The best single day was +$1,581, which is **more than the total profit**. Take away that one day and the strategy lost money.
- With only 52 trades, the sample is small.

**Verdict:** Just over break-even, and only because of one big day. It's the weakest case for staying in the app.

## 3. Your 5-pillar playbook (5-minute)
**0 trades** from 21 Oct to 17 Nov. Here's how far the 1,460 New York-session candles got through the pillars:

| Pillar reached | Candles |
|---|---|
| 1 · Location | 478 |
| 2 · + Liquidity sweep | 382 |
| 3 · + CISD | 250 |
| 4 · + Displacement | 106 |
| 5 · + Pullback confirmed | 6 |
| Stop size within 0.3–5 ATR | 4 |
| Room for at least 1.5R to target | **0** |

- The two filters that block trades are at the end. Price rarely pulls back with a confirming candle after displacement (6 times in 4 weeks).
- When it did, the target wasn't far enough away. The target is the high or low of the range before the sweep, and none of the 6 had 1.5R of room.
- The 6 near misses, with their times, are in `pillar_funnel.json`.
- Four weeks of 5-minute candles is all TradingView provides. Each refresh adds new candles to the saved history, so this test gets fairer over time.

## Compared with TradingView's Strategy Tester (numbers in the app)
| | TradingView | This test |
|---|---|---|
| Breakout trades | 176 | 185 |
| Breakout PF | 1.33 | 1.27 |
| Breakout net | +$7,395 | +$6,401 |
| NY open trades | 50 | 52 |
| NY open PF | 1.25 | 1.21 |
| NY open net | +$1,667 | +$1,529 |

These are close, which is a good sign the rules are coded the same way in both. The small gap probably comes from details such as how a candle that touches both the stop and the target is counted (this test always counts the stop).

## What it means for passing Lucid
- On 1 MNQ, expect drawdowns of about **$1,870–$2,340** with these strategies, and losing streaks of up to 10 trades. Compare that with your account's drawdown limit before trading either one.
- If your account has a consistency rule (a cap on how much profit can come from one day), the New York open breakout would struggle. Its profit came from one day.

## Next tests worth running
1. Refresh the data every week, so the 5-minute history grows and the playbook gets a fair test.
2. Test the playbook with a fixed 2R target instead of "the other side of the range", to see whether that's the only thing holding it back.
3. Test the breakout long-only and short-only separately, to see how much of the result is just the October–November sell-off.

*For learning and practice only. Past results don't predict future results, and this isn't financial advice.*
