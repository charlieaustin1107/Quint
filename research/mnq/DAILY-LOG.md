# MNQ Daily Research Log

Research-only record. No strategy in this log is approved for live trading. Research rotates across scalping, intraday, swing and multi-week/monthly horizons with equal discovery priority. Signal-assisted and automated modes must share deterministic signal and risk logic; automated routing has additional explicit authorisation and Guardian gates.

| Date | Horizon | Hypothesis | Status | Key finding / blocker | Next rotation |
|---|---|---|---|---|---|
| 2026-11-19 | Scalping | MNQ best-level order-flow imbalance (OFI) plus microprice skew predicts 5–30 second continuation | Specified; not backtested | Existing Quint OHLCV candles cannot test order-book features. Need licensed event-level MNQ quotes/depth and realistic execution replay. | Intraday |
| 2026-11-20 | Intraday | Confirmed opening-gap midpoint reversion, conditioned on pre-RTH session range, versus mirrored-price control | Specified; not backtested | Published 2026 NQ session study motivates replication; MNQ preprint warns generic gap/liquidity signals may fail after costs. Must audit overlap and verify 1m/event data. | Swing |
| 2026-11-20 | Swing | Close-confirmed 55-session Donchian breakout, 20-session opposite-channel exit, 2 × ATR(20) initial stop | Specified; not backtested | Evidence is mixed: broad futures TSMOM evidence, volatility-scaling critique, and 2026 preprint warning about fast equity-index trends. LucidFlex simulated accounts force flat at 4:45 PM ET, so this multi-day version is ineligible there. | Monthly/position |

## 2026-11-19 — Scalping

See [the full research note](notes/2026-11-19-scalping-ofi-microprice.md). The literature supports testing OFI as a short-horizon price-impact feature, but the key peer-reviewed OFI paper uses NYSE stocks rather than MNQ. No profitability claim is made. Data acquisition is the gating task.

## 2026-11-20 — Intraday

See [the full research note](notes/2026-11-20-intraday-gap-midpoint.md). This is a narrowed, session-conditioned gap-midpoint hypothesis rather than a generic liquidity-sweep setup. A published 2026 NQ study motivates the question, but the MNQ OHLCV preprint supplies a material counterweight. No Quint backtest was run and no profitability claim is made.


## 2026-11-20 — Repository-wide research review

See [the consolidated research state](RESEARCH-STATE-2026-11-20.md) for programme decisions, prior findings, literature classifications, data status and next actions.

Important context discovered in existing open PRs:
- PR #20 already contains a VWAP First-Pullback experiment. Future VWAP pullback research must audit overlap with it rather than duplicate it.
- PR #21 reports an initial one-minute MNQ candle sample of roughly 2,000 bars, 1,490 factory variations with none surviving all gates, and nine paper bots with 10 trades / -$137. These are PR-reported figures, not independently re-run or evidence of strategy failure/success.
- PR #21 also reports a discrepancy between a TradingView five-minute feed and five-minute bars aggregated from one-minute data. Preserve provenance and investigate before mixing data sources.
- The current one-minute sample is far too small for robust historical validation. Data acquisition and audit are immediate blockers.

The published 2026 NQ gap-midpoint study is forecasting/descriptive evidence, not proof of an executable MNQ edge. The MNQ gap preprint is a preprint and reports that its tested OHLCV gap family did not pass all validation criteria. The New York Fed's 2026 overnight-drift result concerns a distinct 02:00–03:00 ET return pattern and is included as a warning about regime decay, not as direct evidence about gap-midpoint touch rates.

No new backtest or paper-forward test was run during this repository review.


## 2026-11-20 — Swing

See [the full swing research note](notes/2026-11-20-swing-55d-donchian.md). The candidate is a 55/20-day Donchian breakout with a 2 × ATR(20) initial stop, benchmarked against a fixed 20/10-day variant and risk-matched long-only baselines. Academic evidence is mixed and the exact MNQ setup remains untested. LucidFlex's official rules require positions flat by 4:45 PM ET and prohibit overnight holding on simulated accounts, so this exact multi-day strategy is not eligible for LucidFlex evaluation/funded-sim use. A flat-by-close adaptation would be a separate hypothesis. No backtest was run.
