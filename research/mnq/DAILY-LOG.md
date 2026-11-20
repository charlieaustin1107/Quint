# MNQ daily research log

| Date | Experiment | Finding | Status |
|---|---|---|---|
| 2026-11-20 | [Contract-roll and continuous-series integrity](2026-11-20-contract-roll-integrity.md) | CME quarterlies expire on the third Friday; CME/Databento/QuantConnect document materially different continuous-series and mapping behaviours. Require timestamped prior-day volume/OI, raw expiry prices for fills, and an explicit mapping audit. | Specification only; no MNQ backtest result |
| 2026-11-20 | [Monthly 12-month TSMOM with valuation-boundary veto](2026-11-20-monthly-tsmom-boundary-veto.md) | Peer-reviewed futures TSMOM evidence and a 2026 peer-reviewed equity-boundary study motivate a distinct monthly test. No MNQ-specific evidence; macro proxy, vintage data and NQ/MNQ sample-size limits remain material. | Specified only; not backtested |
