# Quint MNQ: Post-FOMC reversal backtest

**Decision: Do not advance the reversal rule to paper or live trading on this evidence.** In a retrospective daily-bar screen of 59 scheduled FOMC decisions, the original reversal rule lost a modeled **$5,641** per one-MNQ position stream. Simply holding long in the same windows did better, as did trading in the direction of the initial move. Neither comparison is itself a validated strategy. The screen uses the [pinned Quint MNQ data](https://raw.githubusercontent.com/charlieaustin1107/Quint/c5a6de7f706ed785c234274367b8cb71d869176b/lab/data/mnq_1d.csv) and the Federal Reserve’s [2021–2026 meeting calendar](https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm), [2019 materials](https://www.federalreserve.gov/monetarypolicy/fomchistorical2019.htm), [2020 materials](https://www.federalreserve.gov/monetarypolicy/fomchistorical2020.htm) and [December 2020 statement](https://www.federalreserve.gov/newsevents/pressreleases/monetary20201216a.htm).

## Rule and baselines

- **Original reversal:** D0 is the statement session. Measure the move from the D−1 bar close to the D+3 bar close. Go short if that move was positive, long if it was negative, and stay flat if it was zero. Use the next stored bar’s open (D+4) as the modeled entry and the D+10 close as the exit. There is no same-bar signal and entry, no fitted threshold, and no stop or target. This is an MNQ adaptation of a horizon studied on the S&P 500, not a replication of the [Boguth et al. study](https://files.osf.io/v1/resources/zurfk_v1/providers/osfstorage/62a74fca2631491f71a3175f?action=download&direct&version=3).
- **Same-window baselines:** One MNQ long on every event versus one MNQ in the direction of the initial move. Both use identical entry and exit bars and the same costs as the reversal. The long-only baseline matches the holding windows and position size, not the directional exposure.
- **Costs and size:** One MNQ at $2 per point and $0.50 per 0.25-point tick ([CME MNQ specifications](https://www.cmegroup.com/markets/equities/nasdaq/micro-e-mini-nasdaq-100.contractSpecs.html)). The base model charges $0.50 commission plus one tick of slippage each way ($2 total), as in the [Quint Lab cost model](https://github.com/charlieaustin1107/Quint/blob/c5a6de7f706ed785c234274367b8cb71d869176b/lab/README.md). The stress case doubles the total to $4. These are assumptions, not verified broker or exchange fees.

## Main results

All values are simulated U.S. dollars after modeled costs at one-MNQ size. The event sample runs from June 19, 2019, through October 28, 2026, with the last position exiting November 11, 2026, on the date inferred from the [stored bars](https://raw.githubusercontent.com/charlieaustin1107/Quint/c5a6de7f706ed785c234274367b8cb71d869176b/lab/data/mnq_1d.csv) and the [Fed’s official meeting dates](https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm).

| Rule | Trades | Win rate | Net P&L | Net per trade |
|---|---:|---:|---:|---:|
| **Reversal, original D+4 entry** | 59 | 44.1% | **−$5,641.00** | −$95.61 |
| Always long, same windows | 59 | 64.4% | +$17,016.00 | +$288.41 |
| Momentum, same windows | 59 | 55.9% | +$5,405.00 | +$91.61 |
| Reversal, D+5 entry diagnostic | 59 | 49.2% | −$1,272.50 | −$21.57 |
| Reversal, original with doubled costs | 59 | 42.4% | −$5,759.00 | −$97.61 |

The original rule’s 25 long trades made $5,755.50 and its 34 short trades lost $11,396.50. Its largest single loss was $3,452.50, and without its largest win the net fell to −$7,540.00. The peak-to-trough drawdown using only closed trades was $7,800.00; marking positions at the stored daily closes raised it to $11,173.00. Neither measure captures full intraday drawdown, account equity or liquidation risk. A descriptive event bootstrap estimates a 95% interval of roughly −$332 to +$136 for mean dollars per trade. This interval assumes independently resampled events and does not account for regime dependence or contract-roll uncertainty.

### Chronological check

| Period | Trades | Original D+4 net | D+5 diagnostic net |
|---|---:|---:|---:|
| 2019–2024, exited before January 1, 2025 | 43 | +$277.50 | −$150.00 |
| December 2024 event, exit in January 2025 | 1 | −$446.50 | −$1,069.00 |
| 2025–2026 events | 15 | −$5,472.00 | −$53.50 |

The later slice is a chronological check, not an untouched or prospective holdout. The D+5 diagnostic keeps the original signal and D+10 exit but waits one extra stored bar. It reduces the modeled loss overall but changes the exposure and does not validate the original rule.

### Robustness checks

- **Matched non-Fed windows:** 49 event windows found a unique comparison with the same year, weekday and signal direction, within 60 calendar days, with the closest initial percentage move. The full comparison window never overlaps a scheduled Fed window or the three March 2020 policy-action windows used for screening. The original mean was −$88.15 on the matched Fed subset versus +$108.71 on the non-Fed windows, a difference of −$196.87 per pair. A descriptive paired bootstrap interval spans zero (about −$682 to +$231). Comparison windows can overlap one another, so this is not a randomized or independent significance test.
- **Quarterly rolls:** Excluding windows that intersect the seven calendar days before, through and including the third Friday of March, June, September or December leaves 35 trades. The original remains negative (−$4,500.00). The D+5 diagnostic flips to +$1,024.50, but falls to −$1,123.00 without its best trade. This is a calendar filter, not the vendor’s actual roll log, consistent with the distinction made in [Quint’s roll-integrity PR](https://github.com/charlieaustin1107/Quint/pull/29).
- **Holidays and gaps:** Dropping any window with a missing weekday label from D−1 through the first weekday after exit leaves 46 trades. The original rule loses $6,185.00. D+5 makes $293.00, but loses $1,854.50 without its best trade. This filter does not certify holiday session accuracy: some holiday trading is assigned a later exchange trade date ([CME holiday notice](https://www.cmegroup.com/notices/electronic-trading/2026/06/20260608.html)).

## Data, scope and next step

- **Data checks:** The [pinned CSV](https://raw.githubusercontent.com/charlieaustin1107/Quint/c5a6de7f706ed785c234274367b8cb71d869176b/lab/data/mnq_1d.csv) contains 1,899 rows. All timestamps are strictly increasing; OHLCV fields are finite with valid ranges and quarter-point prices. All starts map to 18:00 New York time; labels are assigned to the next civil date per the usual session convention, not supplied exchange trade dates ([Quint candle code](https://github.com/charlieaustin1107/Quint/blob/c5a6de7f706ed785c234274367b8cb71d869176b/lab/lib/candles.js), [CME contract hours](https://www.cmegroup.com/markets/equities/nasdaq/micro-e-mini-nasdaq-100.contractSpecs.html)). The final raw row was withheld as potentially incomplete, leaving 1,898 bars. All 59 eligible scheduled announcements map to a bar with enough earlier and later bars; three early 2019 dates are before coverage. There are no overlapping event trades.
- **What the test cannot show:** The CSV has no contract expiry, roll or adjustment metadata, bid/ask quotes, or close-publication times ([pinned CSV](https://raw.githubusercontent.com/charlieaustin1107/Quint/c5a6de7f706ed785c234274367b8cb71d869176b/lab/data/mnq_1d.csv)). Stored daily opens/closes are not verified fills or regular-session closes. Exchange holidays can move the effective trade dates; session counts here are stored-bar counts, not independently reconstructed CME sessions. No broker orders, prop-account rule check, or GitHub changes were made.
- **Next candidate:** Move on to the VIX curve recovery test rather than searching for a profitable entry delay in the same 59 Fed events. [Cboe’s daily settlement page](https://www.cboe.com/markets/us/futures/market-statistics/settlement/futures/daily) shows settlements by contract, but a complete, timestamped multi-year history of standard monthly VX expiries was not verified. That test was not run; no spot-VIX or continuous front-month substitute was used.

## Reproduce locally

Use Node.js 18+ and the pinned Quint CSV. The script needs no packages, network calls or GitHub credentials. It writes the trade log to the supplied output path and prints the full aggregate metrics as JSON.

```sh
node quint-fomc-reversal-backtest.cjs path/to/mnq_1d.csv quint-fomc-event-trades.csv
```

Input SHA-256: `4d352c684103ccef89696ace6f0b2190b4aa5eb38ba69bf67ddd698a72507f67`. The CSV contains 59 rows per timing variant. The run and the CSV were reproduced byte-for-byte, and trade P&L was independently recalculated from the CSV’s prices, direction and costs.

This is research and analysis only, not personalized financial advice. Consult a qualified financial advisor before making investment decisions.
