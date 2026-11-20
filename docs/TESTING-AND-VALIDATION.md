# Testing and validation

This repository has several independent products. Run the checks for the product being changed; do not assume one green suite validates the whole repository.

## Test matrix

| Product | Main checks | Automation status | Important limits |
|---|---|---|---|
| Quint Control | `cd quint-control && npm test`; `npm run test:3` | GitHub Actions | JavaScript/reference, schemas, protocol, install-script static checks and Strategy Lab prototype only; not NinjaTrader/C# runtime |
| Quint Lab | `cd lab && npm test`; `npm run test:3` | GitHub Actions added in this audit | Node unit/integration tests; does not prove scheduled cloud jobs or external connectors |
| Chart Wizard | Build + Playwright scripts listed below | Local/manual | Uses mocked Claude/TradingView/FMP; screenshots should be inspected |
| Quint Brain | Build + Playwright scripts + backtest cross-check below | Local/manual | Uses mocked connectors; no live feed or broker execution |
| Quint legacy | No maintained source test workflow identified | Not covered | Retained for reference; do not assume it is production-current |

## Quint Control

```sh
cd quint-control
npm test
npm run test:3
```

Latest main validation inspected during this audit:
- Commit: `ad913b502284c73e3002a010c33d3564e65961eb`
- GitHub Actions run: [#42](https://github.com/charlieaustin1107/Quint/actions/runs/44831299392)
- `npm test`: 73 passed, 0 failed.
- `npm run test:3`: 73/73 passed in each of three consecutive runs.
- This validates the existing JavaScript/reference, schema, protocol, static installer and Strategy Lab prototype tests. It does not compile NinjaScript or run NinjaTrader.

## Quint Lab

```sh
cd lab
npm test
npm run test:3
```

The Lab suite covers scorecards, Lucid simulation, candle ingestion/aggregation, factory results, paper-forward chronology, registry/roundup behaviour and Quint HQ HTML safety. The workflow added in this branch runs both commands on relevant pushes and pull requests.

## Chart Wizard

Install the Python Playwright package and Chromium once:

```sh
python3 -m pip install playwright
python3 -m playwright install chromium
```

Build from source:

```sh
cd chart-wizard/src
python3 build.py
python3 build.py --prod
```

Run the mocked browser suite from the repository root:

```sh
python3 chart-wizard/src/t/dock.py m
python3 chart-wizard/src/t/feed.py
python3 chart-wizard/src/t/prac_offline.py
python3 chart-wizard/src/t/t6.py
python3 chart-wizard/src/t/coach_prod2.py
python3 chart-wizard/src/t/prod_quint.py
python3 chart-wizard/src/t/hud.py
python3 chart-wizard/src/t/voice.py
python3 chart-wizard/src/t/draw.py
python3 chart-wizard/src/t/talk.py
python3 chart-wizard/src/t/fx.py
python3 chart-wizard/src/t/tvlog.py
```

The tests mock external replies; they must not spend live TradingView or Claude calls. Inspect generated phone screenshots and confirm browser console errors are empty.

## Quint Brain

Build from the repository root:

```sh
cd quint-brain/src
python3 extract.py "$(cat roots.txt)" "$(cat mine.txt)"
python3 patch.py
python3 build.py
python3 build.py --prod
cd ../..
```

Run browser tests:

```sh
python3 quint-brain/src/t_qa.py
python3 quint-brain/src/t_brain.py
python3 quint-brain/src/t_daily.py
python3 quint-brain/src/t_prod.py
python3 quint-brain/src/t_voice.py
python3 quint-brain/src/t_talk.py
python3 quint-brain/src/t_fx.py
python3 quint-brain/src/t_pacing.py
```

Run the legacy app backtest consistency checks separately:

```sh
python3 quint-brain/backtest/extract_engine.py
node quint-brain/backtest/run.js
python3 quint-brain/backtest/crosscheck.py
```

A backtest passing its code checks does not establish a profitable strategy. Keep chronological holdouts, realistic costs, adverse fill ordering and data-integrity limitations in every report.

## Windows / NinjaTrader checks — not covered by cloud CI

These require the owner's Windows PC and NinjaTrader installation:
- Compile all NinjaScript files in NinjaTrader's editor.
- Run the engine self-tests inside NinjaTrader.
- Test connection loss, restart reconciliation, rejected/partial fills and protective-stop handling in Playback.
- Repeat the approved safety scenarios on Sim101.
- Verify the install/uninstall PowerShell scripts on a clean Windows profile.
- Confirm broker/prop-firm rules, market-data permissions and actual account commissions.

No live broker account or real-money order should be used for development tests.

## CI interpretation

A green workflow means only that the commands in that workflow passed on that commit. It does not validate tests that are not in that workflow, external service availability, live broker behaviour, NinjaTrader compilation or strategy profitability.
