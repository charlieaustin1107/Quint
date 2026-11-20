# Quint · WYLD Four Pillars (TradingView indicator)

Your strategy, WYLD Will's Four Pillars, as a live checklist on the chart. It tells you each step of the sequence as it happens, so you only act when all four pillars line up, in order, inside your window. It's saved in your TradingView account as **Quint · WYLD Four Pillars** (script `USER;30b790d0742346528a65e8c1d5e28d6e`, version 3.0: TradingView numbers each save). The code is `wyld_four_pillars.pine`. Signals only: it never places orders. Not financial advice.

## What it shows (version 3.0)
Each step is marked on the chart as it happens, with its price:

- **① Sweep:** a label under the candle that ran a liquidity pool (over it for a short). The pools are the 15-minute equal highs and lows, plus (your rule, on by default since 20 Nov 2026) the prior day's high and low and the overnight high and low. Only pools that formed before the open count, and only a sweep inside your window starts a setup. A pool that was already run overnight is marked as taken, not as a 9:30 sweep.
- **The wick box** (amber): the wick of the candle that made the last push into the low (or high), drawn the moment it's swept. If price pushes deeper, the box moves to the new candle.
  - The dotted amber line is the wick's **50%**: WYLD's wick entry.
  - The dashed line is the **④ trigger**: the far end of that candle. A close beyond it is the internal confirmation, and its label gives both prices.
- **② The level that held:** a thick line at the higher-timeframe level, labelled with its name and price, for example "② Prior day low 24,812.50 held".
- **③ The PDR:** a shaded box from Point A (the level that held) to Point B (the next higher-timeframe level, Target 1), with the 25% and 75% steps dotted and the 0.5 dashed. Its label gives Point B and the 0.5. Target 2, the opposing liquidity, is a dashed line beyond it.
- **④ Entry:** a BUY or SELL label with the reward to Point B in R and the confirmation that triggered it, plus an entry line and a dashed red stop line. The stop goes beyond the confirmation wick.
- **+1R · BE:** the trade has run 1R, the point where WYLD moves to break-even.
- **How it ended:** "✓ B reached", "✗ PDR broken", "window closed", "no level held" or "no Point B". The marks stop at that candle and stay on the chart, so you can scroll back and study every setup.
- The **trading window** is lightly shaded: the first 3 hours after the 9:30 New York open (14:30 to 17:30 UK). Nothing triggers outside it.
- **Higher-timeframe levels** (dotted, brighter for monthly and weekly) and **liquidity pools** (dashed: EQH above, EQL below) nearest to price.

Both boxes stay on the chart:

- **The confluence box** (top right) is small by default: the status, each pillar ticked off with its price (①, ②, ③ Point B and the 0.5, ④ entry and stop) and the score of six extras. For the full version, open the indicator's settings and change **Confluence box** to **Detailed**. That adds the window clock, the plan with both targets, each extra by name, the last alert and the news reminder. The extras are context, not rules: the four pillars decide.
- **The regime table** (bottom right) shows every timeframe, from monthly down to 1-minute:
  - **Trend:** bull, bear or range, from the 20 and 50 EMAs and the slope of the 50.
  - **Volatility:** expanding, normal or quiet, from ATR against its average.
  - **Zone:** premium, middle or discount, from where price sits in the last 50 candles.

  It's context only, because WYLD's bias comes from the PDR, not daily or weekly bias.

You can hide the chart marks, either box, or the levels and pools in the settings under **Display**.

## Put it on your chart (iPhone)
1. In the TradingView app, open **MNQ1!** (CME_MINI) and set the chart to **1 minute**.
2. Tap **Indicators**, then **My scripts** (or Personal), then **Quint · WYLD Four Pillars**.

## Get a notification at every step
1. On that chart, tap the **alert** button, then **Create alert**.
2. Condition: **Quint · WYLD Four Pillars**, then **Any alert() function call**. One alert covers every step, with the prices in the message.
3. Turn on **push notifications**, then create it. TradingView's servers watch the chart, so it works with the app closed.

To be told only about entries, choose **④ Entry (1m confirmation)** instead of "Any alert() function call". If the app doesn't offer the indicator as a condition, do this once at tradingview.com in your phone's browser.

If your CME data on TradingView is delayed, alerts arrive about 10 minutes late. A real-time CME data subscription fixes that.

## How it reads WYLD's rules
It follows `lab/brain/playbooks.json`. Where his videos leave a rule open, the choice is a setting, with defaults sized for MNQ:
- **Pools:** two or more 15-minute swing highs (or lows) within 8 ticks (2 points), from the last 3 days, formed before the open. Also, by your rule (on by default): the prior day's high and low, added when the session opens at 18:00 New York so a run overnight counts as taken, and the overnight high and low, added at 9:30. WYLD himself counts only the equal highs and lows; switch the two settings off to follow him exactly.
- **Higher-timeframe levels:** monthly first, then weekly, then daily, dropping any lower one within 8 ticks of a higher one:
  - prior month, week and day highs and lows;
  - the weekly and daily opening gaps (NWOG and NDOG);
  - the latest daily and weekly fair value gaps (both edges and the middle);
  - the prior day's wick midpoints.

  The level must be within 60 ticks of the sweep. A level "holds" when a candle trades into it and closes back on the right side, within 30 candles.
- **Confirmations (five of WYLD's six):**
  - a wick holds and price closes beyond it;
  - the higher-timeframe level is retested and holds;
  - a held level breaks (a close beyond the last 5 candles' swing);
  - a fair value gap inverts;
  - price trades into a new fair value gap and holds.

  The order-block entry isn't coded yet.
- **The trade:** the stop goes 2 ticks beyond the last 3 candles' wick, Point B must be at least 1R away, up to 3 entries per stage at least 5 candles apart. The stage ends when Point B is reached, when a close lands 8 ticks through Point A, or when the window closes.

## Limits
- It has no news calendar, so check red-folder times yourself. The box reminds you.
- It isn't a backtest. The strategy factory (`lab/FACTORY.md`) tests the mechanical version of your strategy every night; this indicator is for reading the market live and learning the sequence.
- Higher-timeframe values use completed candles only, and signals fire on candle close, so nothing repaints after the fact.
- Lucid flags accounts where more than half the profit comes from trades held 5 seconds or less. Hold winners well past that.
