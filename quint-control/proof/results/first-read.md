# First read: noise-area momentum on the candles we have

**Run on:** 18 Nov 2026, with `proof/noise_momentum.js`.
**Candles:** the MNQ candles saved for the backtests in pull request #9 (branch `backtest-results`): 15-minute candles from 31 Aug to 17 Nov 2026, and 5-minute candles from 21 Oct to 17 Nov 2026.
**Costs:** 1 MNQ, $0.50 commission a side and 1 tick of slippage each way.

**Verdict: far too little data to judge.** The strategy spends 14 days learning the noise area before it trades. That leaves 42 days it could trade in the 15-minute file and only 6 in the 5-minute file. The paper's edge shows up over years, with long flat or losing stretches in between. This read only checks that the rules run, and how big the risk is next to Lucid's limits.

| Candles | Days it could trade | Trades | Wins | Profit factor | Net | Worst drawdown | Worst day |
|---|---|---|---|---|---|---|---|
| 15-minute, whole period | 42 | 44 | 50% | 1.34 | +$1,456 | $1,089 | −$703 |
| 15-minute, first 22 trades | | 22 | 59% | 2.18 | +$1,425 | $800 | −$355 |
| 15-minute, last 22 trades | | 22 | 41% | 1.01 | +$31 | $1,089 | −$703 |
| 5-minute | 6 | 11 | 36% | 0.41 | −$898 | $1,089 | −$703 |

What it shows:

- **The two files agree trade for trade.** The 5-minute run's 11 trades (11 to 17 Nov) are the same trades, with the same results, as the 15-minute run over those days. The 5-minute loss is just the last week of the 15-minute run.
- **It followed the fall.** MNQ dropped about 13% over the test (the first trade was at 30,930 on 22 Sep, the last at 26,967 on 17 Nov). Shorts made $2,592 and longs lost $1,136.
- **It fits Lucid day by day, but the drawdown is the number to watch.** No day lost $1,200 or more. But a $1,089 drawdown in 11 weeks on 1 MNQ is 54% of the 50K's $2,000 max loss.
- **How trades ended:** 28 at the trailing stop and 16 at the close. None flipped direction.

**Why it's still worth the full test:** an independent futures test from 2020 to October 2026 found about 6.8 points a trade after costs on Nasdaq, with every year positive ([Algovibes summary](https://sozai.app/transcript/only-day-trading-strategy-couldnt-break/)). It also found the drawdowns can last over a year.

**Next:** the real test is NinjaTrader's Strategy Analyzer on 1-minute MNQ candles from 2019. The steps and the pass rules, decided in advance, are in `proof/README.md`.

**Corrected 18 Nov 2026:** the saved candle files end each line with a Windows line break, which hid the volume column, so the first version of this read had VWAP wrong. These are the fixed numbers.

Nothing here is financial advice.
