# MNQ Daily Research Log

Research-only record. No strategy in this log is approved for live trading. Research rotates across scalping, intraday, swing and multi-week/monthly horizons with equal discovery priority. Signal-assisted and automated modes must share deterministic signal and risk logic; automated routing has additional explicit authorisation and Guardian gates.

| Date | Horizon | Hypothesis | Status | Key finding / blocker | Next rotation |
|---|---|---|---|---|---|
| 2026-11-19 | Scalping | MNQ best-level order-flow imbalance (OFI) plus microprice skew predicts 5–30 second continuation | Specified; not backtested | Existing Quint OHLCV candles cannot test order-book features. Need licensed event-level MNQ quotes/depth and realistic execution replay. | Intraday |
| 2026-11-20 | Intraday | Confirmed opening-gap midpoint reversion, conditioned on pre-RTH session range, versus mirrored-price control | Specified; not backtested | Published 2026 NQ session study motivates replication; MNQ preprint warns generic gap/liquidity signals may fail after costs. Must audit overlap and verify 1m/event data. | Swing |

## 2026-11-19 — Scalping

See [the full research note](notes/2026-11-19-scalping-ofi-microprice.md). The literature supports testing OFI as a short-horizon price-impact feature, but the key peer-reviewed OFI paper uses NYSE stocks rather than MNQ. No profitability claim is made. Data acquisition is the gating task.

## 2026-11-20 — Intraday

See [the full research note](notes/2026-11-20-intraday-gap-midpoint.md). This is a narrowed, session-conditioned gap-midpoint hypothesis rather than a generic liquidity-sweep setup. A published 2026 NQ study motivates the question, but the MNQ OHLCV preprint supplies a material counterweight. No Quint backtest was run and no profitability claim is made.
