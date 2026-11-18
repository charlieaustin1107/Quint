# The one-week proof

**What it is:** before paying for the full Quint Engine build, we test one published strategy on years of MNQ history in NinjaTrader's Strategy Analyzer. The rules come from a research paper and were fixed before we saw any results, so they can't have been tuned to make the backtest look good.

**The strategy:** noise-area intraday momentum, from Zarattini, Aziz & Barbon, "Beat the Market: An Effective Intraday Momentum Strategy for S&P500 ETF (SPY)" ([SSRN 4824172](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=4824172)). It's bot 1 in `PLAN.md`.

In plain English:

- Every day it learns how far MNQ usually drifts from the 9:30 New York open at each time of day, using the last 14 days. That's the "noise area".
- At each half hour from 10:00 New York, if price is above the noise area it buys, and if it's below, it sells short.
- At each half hour after that, it gets out if price falls back under VWAP or into the noise area, and flips the trade if price crosses right through to the other side.
- It's always flat by 15:59 New York. It trades 1 MNQ, with $0.50 commission a side and 1 tick of slippage each way.

**UK times:** 9:30 to 16:00 New York is 14:30 to 21:00 UK. For a few weeks in March, and in late October to early November, the clocks change on different dates, and then it's 13:30 to 20:00 UK.

## What's here

| File | What it is |
|---|---|
| `QuintNoiseMomentum.cs` | The NinjaTrader 8 strategy, for Strategy Analyzer and Sim101 only |
| `noise_momentum.js` | The same rules in JavaScript, for a first read on saved candles. Tested by `tests/proof.test.js` |
| `results/first-read.md` | The first read on the 11 weeks of candles we have. Far too short to judge |

## How to run it (on the Windows computer with NinjaTrader 8)

1. **Download the file.** On the computer, open [QuintNoiseMomentum.cs on GitHub](https://github.com/charlieaustin1107/Quint/blob/main/quint-control/proof/QuintNoiseMomentum.cs) and click **Download raw file** (the down-arrow button above the code, on the right). If that link doesn't work yet, use the [qc-prep copy](https://github.com/charlieaustin1107/Quint/blob/qc-prep/quint-control/proof/QuintNoiseMomentum.cs); it's on `main` once the pull request is merged.
2. **Put it in NinjaTrader's strategies folder.** In File Explorer, open **Documents > NinjaTrader 8 > bin > Custom > Strategies** and move `QuintNoiseMomentum.cs` there. If Windows named it `QuintNoiseMomentum.cs.txt`, rename it so it ends in `.cs`.
3. **Compile it.** In NinjaTrader's Control Center, click **New > NinjaScript Editor**, then press **F5**. The error list at the bottom should stay empty. If it shows errors, screenshot them and send them to me.
4. **Open the output window.** In the Control Center, click **New > NinjaScript Output** and leave it open. The results print here.
5. **Open Strategy Analyzer.** In the Control Center, click **New > Strategy Analyzer**.
6. **Fill in the left-hand panel:**
   - **Strategy:** QuintNoiseMomentum
   - **Instrument:** MNQ 12-26 (type MNQ and pick the December 2026 contract)
   - **Type:** Minute. **Value:** 1
   - **Start date:** 1 June 2019 (MNQ started trading in May 2019). **End date:** yesterday
   - **Trading hours:** CME US Index Futures RTH. It loads less data, so it runs faster. Any template works, because the strategy works out New York time itself.
   - Leave the strategy's own settings as they are: 1 contract, 14 days, a check every 30 minutes.
7. **Click Run** at the bottom. The first run downloads years of 1-minute candles, so keep NinjaTrader connected and give it time.
8. **Send me the results.** The output window shows a block that starts `-------- QUINT PROOF RESULTS --------`. Screenshot it or copy it, and send it to me.

If the results only start in September 2026, NinjaTrader isn't joining the old contracts together. Go to **Tools > Options > Market data**, set **Merge policy** to **Merge back adjusted**, click **OK**, and run it again.

Strategy Analyzer only trades its own Backtest account, so nothing real is traded.

## What counts as a pass (decided before seeing any results)

- A profit after costs over the whole period **and** in the second half on its own. The second half is the out-of-sample check.
- A worst drawdown on 1 MNQ under $2,000 (the Lucid 50K max loss), and ideally under $1,000.
- No day losing $1,200 or more (Lucid's daily loss limit, if you picked it).
- A worst open loss inside one trade well under $2,000, because your funded drawdown counts open losses.
- Most years profitable, not one lucky year.

If it fails, we don't tweak it until it passes, because that would only fit it to the past. We drop it and test the next published strategy.

## Every change from the paper

- MNQ futures instead of SPY, on 1-minute bars, from 9:30 to 16:00 New York.
- A fixed 1 MNQ by default. The paper's volatility sizing is a setting ("Use the paper's sizing"), capped at 4 contracts.
- Lucid's costs: $0.50 commission a side plus 1 tick of slippage each way. The paper used per-share costs.
- Orders fill at the open of the next 1-minute bar after each check. The paper used the price at the check.
- Flat at 15:59 New York instead of 16:00.
- Half days don't count towards the noise area, and nothing trades until there are 14 full days of history.
- New York time comes from each bar's own time. NinjaTrader's "CME US Index Futures RTH" template ends at 16:00 Chicago time, which is 17:00 New York, not 16:00 ([NinjaTrader forum](https://forum.ninjatrader.com/forum/ninjatrader-8/platform-technical-support-aa/1191794-cme-us-index-futures-rth-trading-hours-incorrect)), so the strategy can't rely on it.

## What it prints

- For the whole period, the first half and the second half: trades, win rate, profit factor, net profit, worst drawdown and worst day.
- Longs against shorts, days traded, and days losing $1,200 or more.
- Net profit for each year.
- How trades ended (stop, flip, the 15:59 close, or the "Carried" safety net). Carried should always be 0.
- The worst open loss inside one trade.

Nothing here is financial advice.
