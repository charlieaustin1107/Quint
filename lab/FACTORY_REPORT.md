# Strategy factory report

Candles up to 2026-11-18. 2,594 variations tested in 55.3s. Every variation: 1 MNQ, $0.50 commission a side, 1 tick of slippage, the bot lab's fills.

**How a variation survives** (fixed before testing): on unseen sessions at least 30 trades, a profit, profit factor 1.2+, still a profit with $2.50 more costs a trade; worst drawdown under $2,000 and no day worse than -$1,200; its neighbouring variations also profitable unseen; and its family's chance of overfitting (PBO) 30% or less.

| Family | Variations | Sessions (tune / unseen) | Profitable unseen | PBO | Survivors |
|---|---|---|---|---|---|
| Your strategy: WYLD Will Four Pillars (mechanical v0) | 1,152 | 12 / 8 | 156 of 1152 that traded | 37% | 0 |
| N-candle breakout | 600 | 33 / 23 | 522 of 600 that traded | 67% | 0 |
| Opening range breakout | 324 | 12 / 8 | 191 of 324 that traded | 60% | 0 |
| VWAP band fade | 432 | 12 / 8 | 314 of 432 that traded | 40% | 0 |
| Noise-area momentum | 32 | 33 / 23 | 30 of 32 that traded | 29% | 6 |
| Gap fade | 54 | 12 / 8 | 18 of 54 that traded | 57% | 0 |

## Your strategy: WYLD Will Four Pillars (mechanical v0)

Best on the tuning sessions: +$372 over 11 trades; on the 8 unseen sessions it made -$1,013 over 7 trades. PBO 37%. Under 30 unseen trades, so no variation can pass yet. It re-runs every night as candles arrive.

Top 5 by the tuning sessions, then how they did unseen:

| Settings | Tune | Unseen | Neighbours unseen (median) |
|---|---|---|---|
| pools=on, confirm=reclaim, stopTicks=1, target=B, be=none, window=120, maxEntries=2 | +$372 (11) | -$1,013 (7) | -$1,013 |
| pools=on, confirm=reclaim, stopTicks=1, target=B, be=none, window=180, maxEntries=2 | +$372 (11) | -$1,013 (7) | -$1,013 |
| pools=on, confirm=reclaim, stopTicks=2, target=B, be=none, window=120, maxEntries=2 | +$369 (11) | -$1,016 (7) | -$1,016 |
| pools=on, confirm=reclaim, stopTicks=2, target=B, be=none, window=180, maxEntries=2 | +$369 (11) | -$1,016 (7) | -$1,016 |
| pools=on, confirm=reclaim, stopTicks=4, target=B, be=none, window=120, maxEntries=2 | +$363 (11) | -$1,022 (7) | -$1,019 |

## N-candle breakout

Best on the tuning sessions: +$802 over 15 trades; on the 23 unseen sessions it made +$2,526 over 18 trades. Overfitting is likely (PBO 67%): the best tuned variations usually end up below average on data they didn't see. Under 30 unseen trades, so no variation can pass yet. It re-runs every night as candles arrive.

Top 5 by the tuning sessions, then how they did unseen:

| Settings | Tune | Unseen | Neighbours unseen (median) |
|---|---|---|---|
| n=15, stopAtr=1, targetR=1.5, side=short, maxTrades=2 | +$802 (15) | +$2,526 (18) | +$2,154 |
| n=15, stopAtr=1, targetR=1.5, side=short, maxTrades=1 | +$716 (10) | +$1,197 (11) | +$1,324 |
| n=15, stopAtr=1, targetR=2, side=short, maxTrades=2 | +$630 (15) | +$1,918 (18) | +$2,316 |
| n=30, stopAtr=3, targetR=3, side=both, maxTrades=1 | +$625 (17) | +$2,598 (15) | +$2,598 |
| n=30, stopAtr=3, targetR=3, side=both, maxTrades=2 | +$625 (17) | +$2,598 (15) | +$2,598 |

## Opening range breakout

Best on the tuning sessions: +$1,568 over 11 trades; on the 8 unseen sessions it made +$1,090 over 8 trades. Overfitting is likely (PBO 60%): the best tuned variations usually end up below average on data they didn't see. Under 30 unseen trades, so no variation can pass yet. It re-runs every night as candles arrive.

Top 5 by the tuning sessions, then how they did unseen:

| Settings | Tune | Unseen | Neighbours unseen (median) |
|---|---|---|---|
| rangeMin=5, cutoffMin=60, stop=range, targetR=3, side=both | +$1,568 (11) | +$1,090 (8) | +$569 |
| rangeMin=5, cutoffMin=120, stop=range, targetR=3, side=both | +$1,568 (11) | +$1,090 (8) | +$641 |
| rangeMin=5, cutoffMin=60, stop=range, targetR=1, side=both | +$1,395 (11) | +$1,024 (8) | +$808 |
| rangeMin=5, cutoffMin=120, stop=range, targetR=1, side=both | +$1,395 (11) | +$1,024 (8) | +$975 |
| rangeMin=5, cutoffMin=60, stop=range, targetR=5, side=both | +$1,339 (11) | +$498 (8) | +$498 |

## VWAP band fade

Best on the tuning sessions: +$1,182 over 19 trades; on the 8 unseen sessions it made +$790 over 7 trades. PBO 40%. Under 30 unseen trades, so no variation can pass yet. It re-runs every night as candles arrive.

Top 5 by the tuning sessions, then how they did unseen:

| Settings | Tune | Unseen | Neighbours unseen (median) |
|---|---|---|---|
| sd=2, stopBars=2, minRR=1.5, start=60, end=330, maxTrades=3 | +$1,182 (19) | +$790 (7) | +$883 |
| sd=2, stopBars=2, minRR=0.5, start=60, end=330, maxTrades=1 | +$977 (10) | +$1,176 (6) | +$825 |
| sd=2, stopBars=2, minRR=1, start=60, end=330, maxTrades=1 | +$977 (10) | +$825 (5) | +$717 |
| sd=2, stopBars=3, minRR=0.5, start=60, end=330, maxTrades=1 | +$977 (10) | +$1,176 (6) | +$828 |
| sd=2, stopBars=3, minRR=1, start=60, end=330, maxTrades=1 | +$977 (10) | +$825 (5) | +$825 |

## Noise-area momentum

6 of 32 variations passed every check and go to the paper forward test.

Top 5 by the tuning sessions, then how they did unseen:

| Settings | Tune | Unseen | Neighbours unseen (median) |
|---|---|---|---|
| lookbackDays=7, volatilityMultiplier=0.8, checkEvery=30 | +$1,196 (17) | +$707 (34) | +$522 |
| lookbackDays=7, volatilityMultiplier=1, checkEvery=30 | +$992 (17) | +$522 (25) | +$1,135 |
| lookbackDays=7, volatilityMultiplier=1.5, checkEvery=30 | +$960 (11) | +$1,648 (15) | +$1,564 |
| lookbackDays=10, volatilityMultiplier=1, checkEvery=30 | +$922 (18) | +$1,563 (30) | +$839 |
| lookbackDays=10, volatilityMultiplier=1.5, checkEvery=30 | +$861 (11) | +$1,583 (13) | +$1,679 |

- Survivor: lookbackDays=21, volatilityMultiplier=0.8, checkEvery=30: unseen +$1,814 over 32 trades; Lucid 50K pass 37%, fail 11%.
- Survivor: lookbackDays=10, volatilityMultiplier=1, checkEvery=30: unseen +$1,563 over 30 trades; Lucid 50K pass 37%, fail 9%.
- Survivor: lookbackDays=14, volatilityMultiplier=0.8, checkEvery=30: unseen +$1,466 over 30 trades; Lucid 50K pass 25%, fail 25%.
- Survivor: lookbackDays=10, volatilityMultiplier=0.8, checkEvery=30: unseen +$1,052 over 33 trades; Lucid 50K pass 25%, fail 35%.
- Survivor: lookbackDays=21, volatilityMultiplier=1, checkEvery=30: unseen +$879 over 31 trades; Lucid 50K pass 24%, fail 25%.
- Survivor: lookbackDays=14, volatilityMultiplier=1, checkEvery=30: unseen +$839 over 32 trades; Lucid 50K pass 23%, fail 26%.
## Gap fade

None of the 54 variations traded enough to rank. More candles needed.

**Ready for the paper forward test** (survived 5 nights in a row): none yet.

PBO is the probability of backtest overfitting: how often the best variation on some sessions lands in the bottom half on the others. Over 50% means the winners are mostly luck.

Nothing here is financial advice.
