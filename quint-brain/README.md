# Quint Brain

Quint Brain is a standalone market-analysis and learning app: 3D brain, live market read, matrix, 5-pillar checks, records and alerts. It is not the automated broker execution engine.

## Source and build

- Source: `src/`
- Published build: `index.html`
- Quint Brain reuses selected Chart Wizard functions. After changing shared Chart Wizard functions such as `dock.js`, `live.js`, `quint.js`, `qlab.js` or `pillars.js`, rebuild from the repository root:

```sh
cd quint-brain/src
python3 extract.py "$(cat roots.txt)" "$(cat mine.txt)"
python3 patch.py
python3 build.py
python3 build.py --prod
```

Never hand-edit the built `index.html`; update source and rebuild.

## Backtest harness

The `backtest/` folder under this project tests strategies exposed by Quint Brain against historical MNQ candles. It extracts the app's own strategy functions so research does not silently use a rewritten strategy.

Read `backtest/README.md`. From the repository root:

```sh
python3 quint-brain/backtest/extract_engine.py
node quint-brain/backtest/run.js
python3 quint-brain/backtest/crosscheck.py
```

Historical results are not proof of future profitability. Preserve costs, chronological out-of-sample checks, concentration analysis and limitations.

## Product boundaries

- Quint Brain is analysis/learning only; it does not place broker orders.
- Automated bots, Guardian, OrderRouter, Strategy Lab and automated trading website belong in `quint-control/`.
- Automated-bot research belongs in `quint-control/research/`, not in this app's backtest folder.
