# Quint Brain strategy backtests

This harness tests strategies taught by Chart Wizard / Quint Brain on historical MNQ candles. It is **not** the Quint Control automated trading engine or its paper/live execution simulator.

## Run from the repository root

```sh
python3 quint-brain/backtest/extract_engine.py
node quint-brain/backtest/run.js
python3 quint-brain/backtest/crosscheck.py
```

The extractor copies strategy functions from `quint-brain/index.html` into `engine.js`. Do not hand-edit `engine.js`; change app source and regenerate it.

## Data and outputs

- Input candles: `quint-brain/backtest/data/mnq_15m.csv`, `mnq_5m.csv`, `mnq_1d.csv` (UTC Unix seconds, OHLCV).
- Results: `quint-brain/backtest/results/` (summary JSON and trade lists).
- `fetch_to_csv.py` merges a TradingView candle download into a CSV.

```sh
python3 quint-brain/backtest/fetch_to_csv.py download.json quint-brain/backtest/data/mnq_15m.csv
```

## Assumptions to verify

- 1 MNQ contract, $2 per index point.
- Current harness uses $2.50 round-trip cost: $0.75 commission per side plus one tick ($0.50) slippage per side. Verify against the exact account's current fee schedule.
- Stop-before-target sequencing within a candle is the conservative default in the simple cross-check.
- First-half/second-half is only a rough chronological diagnostic, not a substitute for walk-forward validation and an untouched holdout.

## Research standards

Report sample size, date range, costs, data source, long/short, chronological splits, drawdown, worst day and profit concentration. Keep weak and failed results. Do not call a strategy profitable from one green backtest or a small sample. Automated bot research belongs in `quint-control/research/`.
