# Backtests

These scripts test the strategies Chart Wizard teaches using imported MNQ candles. They are an exploratory legacy harness, not Quint Control's future automated-bot validation engine.

## Run
```
node backtest/run.js
python3 backtest/crosscheck.py
``

## Files
| File | Purpose |
|---|---|
| `data/*.csv` | Imported MNQ candles |
| `extract_engine.py` | Copies Quint Brain strategy functions into the generated engine |
| `engine.js` | Generated file; edit the source app, then re-run the extractor |
| `run.js` | Runs strategies and writes summaries/trade lists |
| `crosscheck.py` | Independent Python cross-check of selected simple strategies |
| `fetch_to_csv.py` | Converts downloaded candles to CSV |

## Legacy assumptions and limitations
- One MNQ contract; $2 per index point; 0.25-point tick.
- The legacy runner assumes $2.50 round-trip cost ($0.75 commission per side plus one tick of slippage per side). This is a script assumption, not a verified universal account fee schedule.
- OHLC fills are approximate. If stop and target are both touched in one bar, the runner must use adverse ordering; candle data cannot prove executable bid/ask fills or queue position.
- The old first-half/second-half comparison divides the trade list by trade count, not by a predeclared calendar boundary. It is not a valid chronological out-of-sample test.
- The Python cross-check checks selected strategy calculations; it does not independently validate feed quality or execution realism.
- Existing results are exploratory only. Do not present them as proof of profitability or automated-bot readiness.

For Quint Control's required data audit, event/fill model, experiment registry, walk-forward/holdout validation and evidence reporting, follow `quint-control/research/BACKTEST-INTEGRITY-STANDARD.md`.
