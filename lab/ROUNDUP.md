# Quint roundup: Friday 20 November

**-$137 on paper from 10 forward trades** · candles up to 2026-11-19

- Morning. Here's your Quint roundup for Friday 20 November.
- Real money: no bot is trading a real or prop account yet, so nothing has been made or lost.
- Paper forward test: nine bots, 10 trades since Wednesday 18 November, minus $137 on paper on one MNQ each.
- Best backtest so far: the 20-candle breakout, $4,374 over 41 trades on one MNQ. That is too few trades to trust yet.
- No strategy has earned approval yet. That needs years of data and a clean paper test.
- Warning: four bots would likely fail a Lucid 50K before passing: New York open breakout, Opening candle direction (5-minute opening range), Last-30-minute momentum, Failed breakout.
- Latest lesson: Replaying WYLD's rules exactly as the indicator reads them showed where setups die: the pools marked before the open were all run before 9:30, most sweeps found no higher-timeframe level holding nearby, and on 5-minute candles Point B came before any confirmation.
- Next up: Grow the MNQ candle store every night with one TradingView call: the newest 1-minute candles (from 19 Nov 2026), merged into lab/data; the 5- and 15-minute candles are built from them after an exact match check against the stored ones (5-minute candles are fetched instead if they ever differ or leave a gap).

Full numbers: `lab/SCOREBOARD.md`. Every strategy and its verdict: `lab/brain/registry.json`. Nothing here is financial advice.
