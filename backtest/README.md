# Backtests

These scripts test the strategies Chart Wizard teaches on real MNQ candles from TradingView, with costs included.

## Run it
```
node backtest/run.js            # runs all three strategies, writes results/
python3 backtest/crosscheck.py  # re-does the two simple strategies from scratch in Python and checks they match
node backtest/pillar_funnel.js  # where the 5-pillar playbook filters setups out
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
| `pillar_funnel.js` | Shows how many candles reach each of the five pillars, to explain a quiet playbook backtest |
| `results/REPORT.md` | The latest results, in plain English |

## Assumptions
- 1 MNQ contract, $2 a point.
- $2.50 cost per round trip: $0.75 commission a side plus 1 tick ($0.50) of slippage a side.
- Inside a candle, the stop is assumed to be hit before the target. That's the cautious choice.
- "First half / second half" splits the trades in time order. The second half is the out-of-sample check.

## Refreshing the data
TradingView's data connector gives about 5,000 intraday candles per interval. On 18 Nov 2026 that meant 15-minute candles back to 1 Sep 2026 (about 11 weeks), 5-minute candles back to 21 Oct 2026 (about 4 weeks), and daily candles back to May 2019. Older candles already in the CSVs are kept when new ones are added. Ask Claude to "refresh the MNQ backtest data and re-run the backtests". It'll pull new candles, add them to the CSVs (keeping the older ones, so the history grows over time) and open a pull request with the new results.
