# Quint research

This folder holds strategy research and reproducible tests. Nothing here changes Quint’s trading logic or approves a strategy for paper or live trading.

| Research | Status |
|---|---|
| [Five new MNQ strategy candidates](quint-mnq-new-strategy-research.md) | Research shortlist, with sources, test designs, and criteria for dropping an idea. |
| [Post-FOMC reversal backtest](quint-mnq-post-fomc-backtest.md) | The reversal lost a modeled $5,641 on one MNQ across 59 scheduled decisions. The result does not support advancing the rule. |

The backtest includes a [trade-by-trade CSV](quint-fomc-event-trades.csv) and a [standalone Node.js script](quint-fomc-reversal-backtest.cjs). See the report for the pinned input file, costs, and reproduction command.

Research and backtest contributed by Perplexity.
