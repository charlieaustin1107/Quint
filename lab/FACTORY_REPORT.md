# Strategy factory report

Candles up to 2026-11-19. 1,490 variations tested in 34.7s. Every variation: 1 MNQ, $0.50 commission a side, 1 tick of slippage, the bot lab's fills.

**How a variation survives** (fixed before testing): on unseen sessions at least 30 trades, a profit, profit factor 1.2+, still a profit with $2.50 more costs a trade; worst drawdown under $2,000 and no day worse than -$1,200; its neighbouring variations also profitable unseen; and its family's chance of overfitting (PBO) 30% or less.

| Family | Variations | Sessions (tune / unseen) | Profitable unseen | PBO | Survivors |
|---|---|---|---|---|---|
| Your strategy: WYLD Will Four Pillars (as the indicator reads it) | 48 | 13 / 9 | 0 of 0 that traded | n/a | 0 |
| Your strategy on 1-minute candles (as the indicator reads it) | skipped: needs 10 sessions of 1m candles (has 2) | | | | |
| N-candle breakout | 600 | 34 / 24 | 522 of 600 that traded | 47% | 0 |
| Opening range breakout | 324 | 13 / 9 | 281 of 324 that traded | 26% | 0 |
| VWAP band fade | 432 | 13 / 9 | 164 of 432 that traded | 47% | 0 |
| Noise-area momentum | 32 | 34 / 24 | 22 of 32 that traded | 40% | 0 |
| Gap fade | 54 | 13 / 9 | 18 of 54 that traded | 29% | 0 |

## Your strategy: WYLD Will Four Pillars (as the indicator reads it)

None of the 48 variations traded enough to rank. More candles needed.

## N-candle breakout

Best on the tuning sessions: +$1,591 over 28 trades; on the 24 unseen sessions it made +$1,403 over 23 trades. PBO 47%. Under 30 unseen trades, so no variation can pass yet. It re-runs every night as candles arrive.

Top 5 by the tuning sessions, then how they did unseen:

| Settings | Tune | Unseen | Neighbours unseen (median) |
|---|---|---|---|
| n=10, stopAtr=3, targetR=3, side=both, maxTrades=2 | +$1,591 (28) | +$1,403 (23) | +$1,403 |
| n=10, stopAtr=3, targetR=4, side=both, maxTrades=2 | +$1,591 (28) | +$1,403 (23) | +$1,403 |
| n=10, stopAtr=3, targetR=2, side=both, maxTrades=2 | +$1,570 (28) | +$1,403 (23) | +$1,545 |
| n=10, stopAtr=3, targetR=3, side=short, maxTrades=2 | +$1,551 (13) | +$3,833 (15) | +$3,833 |
| n=10, stopAtr=3, targetR=1.5, side=both, maxTrades=2 | +$1,466 (31) | +$1,687 (24) | +$1,430 |

## Opening range breakout

Best on the tuning sessions: +$1,759 over 12 trades; on the 9 unseen sessions it made +$752 over 9 trades. PBO 26%. Under 30 unseen trades, so no variation can pass yet. It re-runs every night as candles arrive.

Top 5 by the tuning sessions, then how they did unseen:

| Settings | Tune | Unseen | Neighbours unseen (median) |
|---|---|---|---|
| rangeMin=5, cutoffMin=60, stop=range, targetR=1, side=both | +$1,759 (12) | +$752 (9) | +$752 |
| rangeMin=5, cutoffMin=120, stop=range, targetR=1, side=both | +$1,759 (12) | +$752 (9) | +$694 |
| rangeMin=5, cutoffMin=60, stop=mid, targetR=1.5, side=both | +$1,391 (12) | +$679 (9) | +$929 |
| rangeMin=5, cutoffMin=120, stop=mid, targetR=1.5, side=both | +$1,391 (12) | +$679 (9) | +$703 |
| rangeMin=5, cutoffMin=180, stop=range, targetR=1, side=both | +$1,309 (13) | +$752 (9) | +$637 |

## VWAP band fade

Best on the tuning sessions: +$1,397 over 20 trades; on the 9 unseen sessions it made -$53 over 8 trades. PBO 47%. Under 30 unseen trades, so no variation can pass yet. It re-runs every night as candles arrive.

Top 5 by the tuning sessions, then how they did unseen:

| Settings | Tune | Unseen | Neighbours unseen (median) |
|---|---|---|---|
| sd=2, stopBars=2, minRR=1.5, start=60, end=330, maxTrades=3 | +$1,397 (20) | -$53 (8) | +$40 |
| sd=2, stopBars=2, minRR=0.5, start=30, end=330, maxTrades=2 | +$1,256 (21) | +$446 (14) | +$426 |
| sd=2, stopBars=2, minRR=0.5, start=30, end=330, maxTrades=3 | +$1,204 (27) | +$466 (17) | +$381 |
| sd=2, stopBars=3, minRR=0.5, start=30, end=330, maxTrades=2 | +$1,197 (21) | +$446 (14) | +$446 |
| sd=2, stopBars=5, minRR=0.5, start=30, end=330, maxTrades=2 | +$1,197 (21) | +$446 (14) | +$426 |

## Noise-area momentum

Best on the tuning sessions: +$2,111 over 18 trades; on the 24 unseen sessions it made +$350 over 34 trades. PBO 40%. No variation passed every check.

Top 5 by the tuning sessions, then how they did unseen:

| Settings | Tune | Unseen | Neighbours unseen (median) |
|---|---|---|---|
| lookbackDays=7, volatilityMultiplier=0.8, checkEvery=30 | +$2,111 (18) | +$350 (34) | +$166 |
| lookbackDays=7, volatilityMultiplier=1, checkEvery=30 | +$1,907 (18) | +$166 (25) | +$690 |
| lookbackDays=7, volatilityMultiplier=1.5, checkEvery=30 | +$1,875 (12) | +$1,115 (15) | +$668 |
| lookbackDays=10, volatilityMultiplier=1, checkEvery=30 | +$1,836 (19) | +$1,030 (30) | +$306 |
| lookbackDays=10, volatilityMultiplier=1.5, checkEvery=30 | +$1,775 (12) | +$668 (12) | +$1,141 |

## Gap fade

None of the 54 variations traded enough to rank. More candles needed.

**Ready for the paper forward test** (survived 5 nights in a row): none yet.

PBO is the probability of backtest overfitting: how often the best variation on some sessions lands in the bottom half on the others. Over 50% means the winners are mostly luck.

Nothing here is financial advice.
