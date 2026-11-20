# Backtests

These scripts test the strategies Chart Wizard teaches on real MNQ candles from TradingView, with costs included.

## Run it
```
node backtest/run.js            # runs all three strategies, writes results/
python3 backtest/crosscheck.py  # re-does the two simple strategies from scratch in Python and checks they match
```

## Files
| File | What it does |
|---|---|
| `data/mnq_15m.csv`, `data/mnq_5m.csv`, `data/mnq_1d.csv` | Real `CME_MINI:MNQ1!` candles from TradingView (t = unix seconds UTC, o, h, l, c, v) |
| `extract_engine.py` | Copies Quint Brain's own strategy functions into `engine.js`, so the test uses exactly the app's rules |
| `engine.js` | Auto-generated. Don't edit it; edit Quint Brain and re-run the extractor |
| `run.js` | Runs the strategies and writes `results/summary.json` plus a trade list for each strategy |
| `crosscheck.py` | An independent Python version of the breakout and New York open rules, used as a second opinion |
| `fetch_to_csv.py` | Turns a TradingView candle download into the CSVs above |

## Assumptions
- 1 MNQ contract, $2 a point.
- $2.50 cost per round trip: $0.75 commission a side plus 1 tick ($0.50) of slippage a side.
- Inside a candle, the stop is assumed to be hit before the target. That's the cautious choice.
- "First half / second half" splits the trades in time order. The second half is the out-of-sample check.

## Refreshing the data
TradingView's data connector gives a few thousand intraday candles per symbol: about 4 months of 15-minute candles and about 6 weeks of 5-minute candles. Ask Claude to "refresh the MNQ backtest data and re-run the backtests". It'll pull new candles, add them to the CSVs (keeping the older ones, so the history grows over time) and open a pull request with the new results.
