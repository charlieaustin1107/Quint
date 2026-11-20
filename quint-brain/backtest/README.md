# Quint Brain strategy backtests

This harness tests strategies taught by Chart Wizard / Quint Brain on historical MNQ candles. It is **not** the Quint Control automated trading engine or its paper/live execution simulator. It is an exploratory legacy harness, not Quint Control's future automated-bot validation engine.

## Run from the repository root

```sh
python3 quint-brain/backtest/extract_engine.py
node quint-brain/backtest/run.js               # runs all three strategies, writes results/
python3 quint-brain/backtest/crosscheck.py     # re-does the two simple strategies from scratch in Python and checks they match
node quint-brain/backtest/pillar_funnel.js     # where the 5-pillar playbook filters setups out
```

The extractor copies strategy functions from `quint-brain/index.html` into `engine.js`. Do not hand-edit `engine.js`; change app source and regenerate it.

## Files

Paths are relative to this folder.

| File | Purpose |
|---|---|
| `data/mnq_15m.csv`, `data/mnq_5m.csv`, `data/mnq_1d.csv` | Real `CME_MINI:MNQ1!` candles from TradingView (t = unix seconds UTC, o, h, l, c, v) |
| `extract_engine.py` | Copies Quint Brain's own strategy functions into `engine.js`, so the test uses exactly the app's rules |
| `engine.js` | Auto-generated. Don't edit it; edit Quint Brain and re-run the extractor |
| `run.js` | Runs the strategies and writes `results/summary.json` plus a trade list for each strategy |
| `crosscheck.py` | An independent Python version of the breakout and New York open rules, used as a second opinion |
| `fetch_to_csv.py` | Turns a TradingView candle download into the CSVs above |
| `pillar_funnel.js` | Shows how many candles reach each of the five pillars, to explain a quiet playbook backtest |
| `results/REPORT.md` | The latest results, in plain English |

## Data and outputs

- Input candles: `quint-brain/backtest/data/mnq_15m.csv`, `mnq_5m.csv`, `mnq_1d.csv` (UTC Unix seconds, OHLCV).
- Results: `quint-brain/backtest/results/` (summary JSON and trade lists).
- `fetch_to_csv.py` merges a TradingView candle download into a CSV.

```sh
python3 quint-brain/backtest/fetch_to_csv.py download.json quint-brain/backtest/data/mnq_15m.csv
```

## Legacy assumptions and limitations

- One MNQ contract; $2 per index point; 0.25-point tick.
- The legacy runner assumes $2.50 round-trip cost ($0.75 commission per side plus one tick of slippage per side). This is a script assumption, not a verified universal account fee schedule.
- OHLC fills are approximate. If stop and target are both touched in one bar, the runner must use adverse ordering; candle data cannot prove executable bid/ask fills or queue position.
- The old first-half/second-half comparison divides the trade list by trade count, not by a predeclared calendar boundary. It is not a valid chronological out-of-sample test.
- The Python cross-check checks selected strategy calculations; it does not independently validate feed quality or execution realism.
- Existing results are exploratory only. Do not present them as proof of profitability or automated-bot readiness.

## Research standards

Report sample size, date range, costs, data source, long/short, chronological splits, drawdown, worst day and profit concentration. Keep weak and failed results. Do not call a strategy profitable from one green backtest or a small sample. Automated bot research belongs in `quint-control/research/`.

## Refreshing the data

TradingView's data connector gives about 5,000 intraday candles per interval. On 18 Nov 2026 that meant 15-minute candles back to 1 Sep 2026 (about 11 weeks), 5-minute candles back to 21 Oct 2026 (about 4 weeks), and daily candles back to May 2019. Older candles already in the CSVs are kept when new ones are added. Ask Claude to "refresh the MNQ backtest data and re-run the backtests". It'll pull new candles, add them to the CSVs (keeping the older ones, so the history grows over time) and open a pull request with the new results.

For Quint Control's required data audit, event/fill model, experiment registry, walk-forward/holdout validation and evidence reporting, follow `quint-control/research/BACKTEST-INTEGRITY-STANDARD.md`.
