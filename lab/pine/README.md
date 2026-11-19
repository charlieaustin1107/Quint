# Quint · WYLD Four Pillars (TradingView indicator)

Your strategy, WYLD Will's Four Pillars, as a live checklist on the chart. It tells you each step of the sequence as it happens, so you only act when all four pillars line up, in order, inside your window. It's saved in your TradingView account as **Quint · WYLD Four Pillars** (script `USER;30b790d0742346528a65e8c1d5e28d6e`). The code is `wyld_four_pillars.pine`. Signals only: it never places orders. Not financial advice.

## What it shows
- **① Sweep** (a numbered circle): price ran a pool of 15-minute equal highs or lows that formed before the open.
- **② HTF level holds** (a diamond): after the sweep, price traded into a higher-timeframe level and closed back on the right side.
- **③ PDR bias** (a triangle, plus lines): Point A (the level that held), the 25%, 50% and 75% steps, and Point B (the next higher-timeframe level, Target 1). Target 2, the opposing liquidity, is drawn too.
- **④ Entry** (a BUY or SELL label): a 1-minute confirmation, with the reward to Point B in R. The stop goes beyond the confirmation wick.
- **BE** (a cross): the trade has run +1R, the point where WYLD moves to break-even.
- The **trading window** is lightly shaded: the first 3 hours after the 9:30 New York open (14:30 to 17:30 UK). Nothing triggers outside it.
- **Higher-timeframe levels** (dotted, brighter for monthly and weekly) and **liquidity pools** (dashed: EQH above, EQL below) nearest to price.

**The confluence box** (top right) ticks off the pillars in order and shows the status ("Waiting for a sweep", "Stage set: wait for 1m confirmation", "In play"), your entry, stop and targets, and six extras with a score. The extras are context, not rules: the four pillars decide.

**The regime table** (bottom right) shows every timeframe, from monthly down to 1-minute:
- **Trend:** bull, bear or range, from the 20 and 50 EMAs and the slope of the 50.
- **Volatility:** expanding, normal or quiet, from ATR against its average.
- **Zone:** premium, middle or discount, from where price sits in the last 50 candles.

It's context only, because WYLD's bias comes from the PDR, not daily or weekly bias.

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
- **Pools:** two or more 15-minute swing highs (or lows) within 8 ticks (2 points), from the last 3 days, formed before the open. Prior-day and overnight highs and lows can be added as pools, but WYLD doesn't count them, so they're off.
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
