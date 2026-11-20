# Quint bot lab

Twelve MNQ bots with fixed rules, for you to test yourself: in NinjaTrader's Strategy Analyzer on years of history, and live on Sim101. They're test bots, so they never trade a real or prop account. Real accounts get bots through the Quint Engine (phase 2 onwards), where the guardian enforces Lucid's rules, the news blocks and the kill switches.

The rules are fixed here, before any long backtest, so they can't be tuned to make the results look good. `botlab.js` and `QuintBotLab.cs` hold the same rules; `tests/botlab.test.js` checks them.

## The bots

| # | Bot | Candles | The rule | Where it comes from |
|---|---|---|---|---|
| 1 | New York open breakout | 5-min | The 9:30–9:45 range; a close outside it until 11:30; stop on the other side; target 2R; once a day | Chart Wizard's strategy. A close version: the exact port, with the same trades as `quint-brain/backtest/`, comes in phase 3 |
| 2 | Opening candle direction | 5-min | Trade the direction of the 9:30–9:35 candle; stop at its other end; target 10R, or out at the close | The 5-minute opening range breakout paper (Zarattini, Barbon & Aziz) |
| 3 | 20-candle breakout | 15-min | A close beyond the last 20 candles; stop 2 ATR; target 3× the stop; up to 2 a day | Chart Wizard's strategy. A close version: regular hours only and flat at 15:59, so no 40-candle time stop |
| 4 | Last-30-minute momentum | 5-min | At 15:30, go with the move since yesterday's close; out at the close | The intraday momentum papers (Gao, Han, Li & Zhou; Baltussen, Da, Lammers & Martens) |
| 5 | VWAP trend | 1-min | Long above VWAP, short below, flip on every cross; up to 40 a day | The VWAP paper (Zarattini & Aziz) |
| 6 | Gap fade | 5-min | A 0.2–1% gap that the first candle turns back; target yesterday's close; out by 11:30 | The plan's bot 9 |
| 7 | Inverted fair value gap | 5-min | Trend from EMA 50 and 200; the first gap against the trend that price closes through, until 11:30; target 2R; once a day | Daxton Trades' "1 trade a day" video. He doesn't give the EMA lengths or the stop, so those are ours |
| 8 | Range squeeze breakout | 1-min | A 20-minute range tighter than 0.15% and than 90% of yesterday's ranges; a close outside it; target 2R; up to 3 a day | The NinjaTrader range-breakout bot video. The numbers are ours |
| 9 | Trend-join scalper | 1-min | EMA 9 above 21 above 50, with the 21 rising; a dip to the 21 that closes up; target 7 points, stop 24; up to 10 a day; stops after a $300 day | Shaped like the Strat v60 dashboard, and Phantom's "trend joins". The rules are ours |
| 10 | VWAP band fade | 5-min | A close outside VWAP ±2 standard deviations, then a close back inside; target VWAP; up to 2 a day | Phantom's "fades". The rules are ours |
| 11 | Failed breakout | 5-min | A candle pokes through yesterday's high or low and closes back inside; target 2R; each level once a day | Phantom's "failed breakouts". The rules are ours |
| 12 | Noise-area momentum | 30-min checks | The proof strategy (`proof/`), plus a 1% emergency stop | The noise-area paper (Zarattini, Aziz & Barbon) |

Left out, for now:

- Phantom's "order book sweeps", because they need market depth (a later phase).
- Your 5-pillar playbook, because it's being ported from Chart Wizard in phase 3.
- Kleopatra, NQLevels, the Grok bot and the 9,120-strategies video, because no rules could be found for them. Send screenshots of their rules and they can be added.

**What the evidence says before you start:** in a walk-forward test, an EMA pullback lost money on MNQ (`PLAN.md`), and a study of 947 days of MNQ found common retail signals didn't beat costs. Bot 9 needs about 80% winners just to break even. Expect most of these to fail. That's what the lab is for.

## Shared rules for every bot

- 1 MNQ, $0.50 commission a side, and 1 tick of slippage on market and stop orders.
- A stop and a target go in with every entry. If one candle touches both, the stop counts.
- No new entries once the day's closed trades have lost $500 (a setting). Bot 9 stops at $300.
- Trades only from 9:30 to 16:00 New York (14:30 to 21:00 UK), and is flat by 15:59.
- Sim, Playback and Strategy Analyzer only.

## Run all 12 in Strategy Analyzer

1. **Download the file.** On the computer, open [QuintBotLab.cs on GitHub](https://github.com/charlieaustin1107/Quint/blob/main/quint-control/botlab/QuintBotLab.cs) and click **Download raw file**. If that link doesn't work yet, use the [bot-lab copy](https://github.com/charlieaustin1107/Quint/blob/bot-lab/quint-control/botlab/QuintBotLab.cs).
2. **Move it** to **Documents > NinjaTrader 8 > bin > Custom > Strategies**. If it's called `QuintBotLab.cs.txt`, rename it so it ends in `.cs`.
3. **Compile it.** In the Control Center, click **New > NinjaScript Editor** and press **F5**. The error list should stay empty. If it shows errors, screenshot them and send them to me.
4. **Open the output window:** **New > NinjaScript Output**, and leave it open.
5. **Open Strategy Analyzer:** **New > Strategy Analyzer**. Then set:
   - **Strategy:** QuintBotLab
   - **Instrument:** MNQ 12-26
   - **Type:** Minute. **Value:** 1
   - **Start date:** 1 June 2019. **End date:** yesterday
   - **Trading hours:** CME US Index Futures RTH
6. **One bot:** set **Bot** to its number and click **Run**.
7. **All 12 at once:** set **Backtest type** to **Optimization**. Under **Bot**, set the minimum to 1, the maximum to 12 and the increment to 1. Set **Keep best # of results** to 12, then click **Run**.
8. **Send me the results.** Each bot prints a block in the output window that starts `-------- QUINT BOT LAB RESULTS --------`. Screenshot them and send them to me.

If the results only start in September 2026, go to **Tools > Options > Market data**, set **Merge policy** to **Merge back adjusted**, and run it again.

## Run one live on Sim101 (live prices, pretend money)

1. **New > Chart**: MNQ 12-26, **Minute**, **1**.
2. Right-click the chart and choose **Strategies**.
3. Pick **QuintBotLab** and click **Add**. Set **Bot**, set **Account** to **Sim101**, tick **Enabled**, and click **OK**.
4. It trades live prices from 14:30 to 21:00 UK, with simulated fills. On any other account it prints a message and does nothing.

## First read on our saved candles (too few to judge)

This was run with `node botlab/botlab.js` on 20 sessions of 5-minute candles (21 Oct to 17 Nov 2026). Bots 3 and 12 used 56 sessions of 15-minute candles (31 Aug to 17 Nov 2026). Bots 5, 8 and 9 need 1-minute candles, so they first run in NinjaTrader. All of these have under 100 trades, so none of this is evidence. It only shows the rules run.

| # | Bot | Trades | Wins | Profit factor | Net | Worst drawdown | Worst day | Second half |
|---|---|---|---|---|---|---|---|---|
| 1 | New York open breakout | 19 | 42% | 1.07 | +$256 | $2,059 | −$626 | +$992 |
| 2 | Opening candle direction | 20 | 25% | 1.63 | +$1,715 | $1,242 | −$390 | +$2,629 |
| 3 | 20-candle breakout (15-min file) | 40 | 53% | 1.84 | +$3,711 | $1,720 | −$483 | +$4,799 |
| 4 | Last-30-minute momentum | 19 | 21% | 0.24 | −$1,215 | $1,325 | −$286 | −$1,119 |
| 6 | Gap fade | 3 | 33% | 2.88 | +$289 | $154 | −$93 | +$383 |
| 7 | Inverted fair value gap | 12 | 58% | 2.48 | +$1,300 | $512 | −$262 | −$141 |
| 10 | VWAP band fade | 30 | 47% | 2.32 | +$1,741 | $449 | −$278 | +$1,110 |
| 11 | Failed breakout | 9 | 22% | 0.47 | −$556 | $955 | −$351 | −$718 |
| 12 | Noise-area momentum (15-min file) | 43 | 51% | 1.58 | +$2,319 | $1,019 | −$517 | +$492 |

One warning already: bot 1's drawdown passed a 50K's $2,000 max loss in just 4 weeks on 1 MNQ.

## How a bot graduates

1. On years of 1-minute data: a profit after costs over the whole period and in the second half on its own, more than 100 trades, a worst drawdown under $2,000 on 1 MNQ, and no day losing $1,200.
2. The Monte Carlo check: under a 25% chance of hitting the max loss before the profit target (phase 4).
3. Then it's ported into the Quint Engine as a plug-in, so it can trade your Lucid accounts with the guardian.

Nothing here is financial advice.
